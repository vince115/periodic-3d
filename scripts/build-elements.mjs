#!/usr/bin/env node
/**
 * Builds public/data/elements.json from the traceable raw sources in data-sources/.
 *
 *   node scripts/build-elements.mjs          # write the file
 *   node scripts/build-elements.mjs --check  # fail if the committed file is stale
 *
 * Every derived value is cross-checked; the script throws instead of silently
 * emitting data it cannot reconcile.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const pubchem = readJson("data-sources/pubchem-periodic-table.json");
const ciaaw = readJson("data-sources/ciaaw-abridged-standard-atomic-weights-2024.json");
const radioactive = readJson("data-sources/ciaaw-radioactive-most-stable-isotopes.json").isotopes;
const nist = readJson("data-sources/nist-asd-ground-configurations.json");
const zh = readJson("data-sources/elements-zh-tw.json").elements;
const moeReadings = readJson("data-sources/moedict-element-readings.json").readings;
const elementImages = readJson("data-sources/element-images.json").images;

/** Photo with attribution (Wikimedia Commons), or null with the reason in Chinese. */
function photo(z) {
  const img = elementImages[String(z)];
  if (img) {
    const { src, width, height, captionZh, author, license, licenseUrl, sourceUrl } = img;
    return { image: { src, width, height, captionZh, author, license, licenseUrl, sourceUrl }, imageNoteZh: null };
  }
  return {
    image: null,
    imageNoteZh:
      z > 100
        ? "此元素僅以加速器合成過極少數原子，壽命極短，無法拍攝實物照片。"
        : "目前沒有可呈現元素本身、且授權允許使用的照片。",
  };
}

/** 國家教育研究院「化學名詞-化學元素」open data: z → { symbol, bopomofo, homophone }. */
function readNaerCsv(path) {
  const rows = readFileSync(join(root, path), "utf8")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(",").map((cell) => cell.trim()));
  return Object.fromEntries(
    rows.map(([, , , z, symbol, bopomofo, homophone]) => [z, { symbol, bopomofo, homophone }]),
  );
}
const naer = readNaerCsv("data-sources/naer-chemical-elements.csv");
const BOPOMOFO_SYLLABLE = /^[\u3105-\u3129]{1,3}[ˊˇˋ˙]?$/u;

function pronunciation(z, symbol) {
  const entry = naer[String(z)];
  if (!entry) throw new Error(`Z=${z}: missing NAER pronunciation`);
  if (entry.symbol !== symbol) throw new Error(`Z=${z}: NAER symbol ${entry.symbol} ≠ ${symbol}`);
  if (!BOPOMOFO_SYLLABLE.test(entry.bopomofo)) {
    throw new Error(`Z=${z}: invalid bopomofo "${entry.bopomofo}"`);
  }
  if (!/^\p{Script=Han}$/u.test(entry.homophone)) {
    throw new Error(`Z=${z}: homophone must be one Han character, got "${entry.homophone}"`);
  }
  const moe = moeReadings[String(z)];
  if (moe && moe.bopomofo !== entry.bopomofo) {
    throw new Error(`Z=${z}: NAER ${entry.bopomofo} disagrees with MOE dictionary ${moe.bopomofo}`);
  }
  return { nameZhBopomofo: entry.bopomofo, nameZhHomophone: entry.homophone };
}

const OUTPUT = "public/data/elements.json";

// ---------------------------------------------------------------------------
// Category mapping (PubChem "GroupBlock" → project category id)
// ---------------------------------------------------------------------------
const CATEGORY_MAP = {
  "Alkali metal": "alkali-metal",
  "Alkaline earth metal": "alkaline-earth-metal",
  "Transition metal": "transition-metal",
  "Post-transition metal": "post-transition-metal",
  Metalloid: "metalloid",
  Nonmetal: "nonmetal",
  Halogen: "halogen",
  "Noble gas": "noble-gas",
  Lanthanide: "lanthanide",
  Actinide: "actinide",
};

// ---------------------------------------------------------------------------
// Position: period / group / block derived from atomic number.
// Group assignment follows the IUPAC 2021 provisional recommendation
// (group 3 = Sc, Y, Lu, Lr); La–Yb and Ac–No get group = null.
// ---------------------------------------------------------------------------
const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118];

function position(z) {
  const period = PERIOD_ENDS.findIndex((end) => z <= end) + 1;
  const start = period === 1 ? 1 : PERIOD_ENDS[period - 2] + 1;
  const i = z - start + 1; // 1-based index within the period
  let group;
  if (period === 1) group = z === 1 ? 1 : 18;
  else if (period <= 3) group = i <= 2 ? i : i + 10;
  else if (period <= 5) group = i;
  else if (i <= 2) group = i;
  else if (i <= 16) group = null; // La–Yb, Ac–No
  else group = i - 14; // Lu/Lr → 3 … Rn/Og → 18

  let block;
  if (z === 2) block = "s";
  else if (group === null) block = "f";
  else if (group <= 2) block = "s";
  else if (group <= 12) block = "d";
  else block = "p";
  return { period, group, block };
}

// ---------------------------------------------------------------------------
// Electron configuration
// ---------------------------------------------------------------------------
const L_ORDER = "spdf";
const CORES = {
  He: "1s2",
  Ne: "[He] 2s2 2p6",
  Ar: "[Ne] 3s2 3p6",
  Kr: "[Ar] 3d10 4s2 4p6",
  Xe: "[Kr] 4d10 5s2 5p6",
  Rn: "[Xe] 4f14 5d10 6s2 6p6",
};

/** Ground-state overrides where PubChem disagrees with NIST ASD. */
const CONFIG_OVERRIDES = {
  103: {
    config: "[Rn] 5f14 7s2 7p1",
    noteZh: "電子排布採用 NIST ASD 的 [Rn] 5f¹⁴ 7s² 7p¹；PubChem 列為 6d¹，兩者差異來自相對論效應的影響。",
  },
};

function parseConfig(raw) {
  const predicted = /\((predicted|calculated)\)/i.test(raw);
  const clean = raw.replace(/\(.*?\)/g, "").trim();
  const coreMatch = clean.match(/^\[([A-Za-z]+)\]/);
  const core = coreMatch ? coreMatch[1] : null;
  const rest = coreMatch ? clean.slice(coreMatch[0].length) : clean;
  const subshells = rest
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const m = token.match(/^(\d)([spdf])(\d+)$/);
      if (!m) throw new Error(`Cannot parse subshell "${token}" in "${raw}"`);
      return { n: Number(m[1]), l: m[2], count: Number(m[3]) };
    });
  return { core, subshells, predicted };
}

const sortSubshells = (list) =>
  [...list].sort((a, b) => a.n - b.n || L_ORDER.indexOf(a.l) - L_ORDER.indexOf(b.l));

function formatConfig({ core, subshells }) {
  const body = sortSubshells(subshells)
    .map((s) => `${s.n}${s.l}${s.count}`)
    .join(" ");
  return core ? `[${core}] ${body}` : body;
}

function expandConfig(config) {
  const { core, subshells } = parseConfig(config);
  const base = core ? expandConfig(CORES[core]) : [];
  return [...base, ...subshells];
}

function shellsFrom(config) {
  const shells = [];
  for (const { n, count } of expandConfig(config)) {
    while (shells.length < n) shells.push(0);
    shells[n - 1] += count;
  }
  return shells;
}

/** NIST lists only the outermost subshells, e.g. "3d5.(6S).4s". */
function checkAgainstNist(z, config) {
  const tail = nist[String(z)];
  if (!tail) return;
  const ours = new Map(expandConfig(config).map((s) => [`${s.n}${s.l}`, s.count]));
  for (const token of tail.split(".").filter((t) => !t.startsWith("("))) {
    const m = token.match(/^(\d)([spdf])(\d*)$/);
    if (!m) throw new Error(`Cannot parse NIST token "${token}" for Z=${z}`);
    const key = `${m[1]}${m[2]}`;
    const count = m[3] ? Number(m[3]) : 1;
    if (ours.get(key) !== count) {
      throw new Error(`Z=${z}: config "${config}" disagrees with NIST "${tail}" at ${key}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Atomic mass
// ---------------------------------------------------------------------------
function atomicMass(z) {
  const w = ciaaw[String(z)];
  if (w.value !== null) {
    return {
      atomicMass: Number(w.value),
      atomicMassUncertainty: Number(w.uncertainty),
      atomicMassKind: "standard",
      massNumberAlternatives: [],
    };
  }
  const isotopes = radioactive[String(z)];
  if (!isotopes) throw new Error(`Z=${z}: no standard weight and no radioactive isotope data`);
  const best = [...isotopes].sort((a, b) => b.seconds - a.seconds)[0];
  return {
    atomicMass: best.massNumber,
    atomicMassUncertainty: null,
    atomicMassKind: "mass-number",
    massNumberAlternatives: isotopes.map((i) => i.massNumber).filter((m) => m !== best.massNumber),
  };
}

// ---------------------------------------------------------------------------
// Notes (Traditional Chinese)
// ---------------------------------------------------------------------------
function notesFor(z, el) {
  const notes = [];
  if (z === 1) notes.push("氫位於第 1 族，但屬於非金屬，並非鹼金屬。");
  if (z === 2) notes.push("氦在版面上置於第 18 族（稀有氣體），但其電子排布屬於 s 區。");
  if ((z >= 57 && z <= 70) || (z >= 89 && z <= 102)) {
    notes.push("本表未指定族：依 IUPAC 2021 臨時建議，第 3 族為 Sc、Y、Lu、Lr；部分教科書則將 La、Ac 列為第 3 族。");
  }
  if (z === 71 || z === 103) {
    notes.push("依 IUPAC 2021 臨時建議列為第 3 族、d 區；版面上仍依常見慣例顯示於下方的鑭系／錒系列。");
  }
  if ([30, 48, 80, 112].includes(z)) {
    notes.push("第 12 族是否屬於過渡金屬依定義而異；本表沿用 PubChem 分類。");
  }
  if (z === 84) notes.push("釙的分類有爭議：PubChem 列為類金屬，其他資料常列為其他金屬。");
  if (z === 85) notes.push("砈的分類有爭議：PubChem 列為鹵素，部分資料列為類金屬。");
  if (el.categoryPredicted) notes.push("此元素的化學分類與電子排布主要依理論預測，尚未經充分實驗確認。");
  if (el.atomicMassKind === "mass-number") {
    notes.push(
      el.massNumberAlternatives.length > 0
        ? `無標準原子量；顯示最長壽同位素的質量數。CIAAW 指出候選同位素難以區分，其他候選質量數：${el.massNumberAlternatives.join("、")}。`
        : "無標準原子量；顯示已知最穩定同位素的質量數（CIAAW／NUBASE2020）。",
    );
  }
  if (CONFIG_OVERRIDES[z]) notes.push(CONFIG_OVERRIDES[z].noteZh);
  return notes;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const columns = pubchem.Table.Columns.Column;
const col = (name) => {
  const i = columns.indexOf(name);
  if (i < 0) throw new Error(`PubChem column ${name} missing`);
  return i;
};
const C = {
  z: col("AtomicNumber"),
  symbol: col("Symbol"),
  name: col("Name"),
  config: col("ElectronConfiguration"),
  groupBlock: col("GroupBlock"),
};

const elements = pubchem.Table.Row.map(({ Cell: cell }) => {
  const z = Number(cell[C.z]);
  const symbol = cell[C.symbol];
  if (ciaaw[String(z)].symbol !== symbol) throw new Error(`Z=${z}: symbol mismatch PubChem/CIAAW`);

  const category = CATEGORY_MAP[cell[C.groupBlock]];
  if (!category) throw new Error(`Z=${z}: unknown GroupBlock "${cell[C.groupBlock]}"`);

  const parsed = parseConfig(cell[C.config]);
  const electronConfiguration = CONFIG_OVERRIDES[z]?.config ?? formatConfig(parsed);
  checkAgainstNist(z, electronConfiguration);
  const shellElectrons = shellsFrom(electronConfiguration);
  const total = shellElectrons.reduce((a, b) => a + b, 0);
  if (total !== z) throw new Error(`Z=${z}: configuration sums to ${total} electrons`);

  const { period, group, block } = position(z);
  if (shellElectrons.length !== period) {
    // Pd ([Kr] 4d10) is the only element whose outermost occupied shell is not its period.
    if (!(z === 46 && shellElectrons.length === 4)) {
      throw new Error(`Z=${z}: ${shellElectrons.length} shells but period ${period}`);
    }
  }

  const names = zh[String(z)];
  if (!names?.nameZh || !names?.summaryZh) throw new Error(`Z=${z}: missing zh-TW name or summary`);

  const el = {
    number: z,
    symbol,
    name: cell[C.name],
    nameZh: names.nameZh,
    ...pronunciation(z, symbol),
    ...atomicMass(z),
    category,
    categoryPredicted: z >= 109,
    period,
    group,
    block,
    electronConfiguration,
    electronConfigurationPredicted: parsed.predicted,
    shellElectrons,
    summaryZh: names.summaryZh,
    ...photo(z),
  };
  return { ...el, notesZh: notesFor(z, el) };
});

if (elements.length !== 118) throw new Error(`Expected 118 elements, got ${elements.length}`);

const output = {
  meta: {
    schemaVersion: 1,
    description: "118 種已命名化學元素的靜態資料，由 scripts/build-elements.mjs 從 data-sources/ 產生，請勿手動編輯。",
    sources: [
      {
        id: "pubchem",
        label: "PubChem Periodic Table (NIH/NCBI)",
        url: "https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON",
        usedFor: ["symbol", "name", "category", "electronConfiguration"],
      },
      {
        id: "ciaaw-abridged-2024",
        label: "CIAAW Abridged Standard Atomic Weights 2024",
        url: "https://www.ciaaw.org/abridged-atomic-weights.htm",
        usedFor: ["atomicMass", "atomicMassUncertainty"],
      },
      {
        id: "ciaaw-radioactive",
        label: "CIAAW Radioactive Elements (NUBASE2020)",
        url: "https://www.ciaaw.org/radioactive-elements.htm",
        usedFor: ["atomicMass (mass number of most stable isotope)"],
      },
      {
        id: "nist-asd",
        label: "NIST Atomic Spectra Database — ground configurations (Z = 1–110)",
        url: "https://physics.nist.gov/PhysRefData/ASD/ionEnergy.html",
        usedFor: ["electronConfiguration cross-check", "Lr override"],
      },
      {
        id: "moe-tw",
        label: "中華民國教育部／國家教育研究院 元素中文名稱",
        url: "https://terms.naer.edu.tw/",
        usedFor: ["nameZh"],
      },
      {
        id: "wikimedia-commons",
        label: "Wikimedia Commons（經 Wikidata P18，即維基百科資訊框照片）",
        url: "https://commons.wikimedia.org/",
        usedFor: ["image (每張照片另附作者與授權)"],
      },
      {
        id: "naer-elements",
        label: "國家教育研究院 化學名詞-化學元素（政府資料開放平臺）",
        url: "https://data.gov.tw/dataset/14843",
        usedFor: ["nameZhBopomofo", "nameZhHomophone"],
      },
      {
        id: "moedict",
        label: "教育部《重編國語辭典修訂本》（經萌典 API）",
        url: "https://www.moedict.tw/",
        usedFor: ["nameZhBopomofo cross-check (Z = 1–103)"],
      },
    ],
    retrieved: "2026-10-16",
  },
  elements,
};

const json = `${JSON.stringify(output, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = readFileSync(join(root, OUTPUT), "utf8");
  if (current !== json) {
    console.error(`${OUTPUT} is out of date. Run: node scripts/build-elements.mjs`);
    process.exit(1);
  }
  console.log(`${OUTPUT} is up to date (${elements.length} elements).`);
} else {
  writeFileSync(join(root, OUTPUT), json);
  console.log(`Wrote ${OUTPUT} (${elements.length} elements).`);
}
