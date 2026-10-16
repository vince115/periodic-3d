#!/usr/bin/env node
/**
 * Downloads element photos used by Wikipedia's infoboxes and records their
 * attribution, so the site serves them locally (no runtime external requests).
 *
 *   node scripts/fetch-element-images.mjs
 *
 * 1. Wikidata: image (P18) of every chemical element (Q11344) by atomic number (P1086).
 * 2. Wikimedia Commons API: author, licence, description and a 480 px thumbnail.
 * 3. Keeps only redistributable licences and curated, element-showing photos
 *    (data-sources/element-image-curation.json), then writes
 *    public/images/elements/<Z>.<ext> and data-sources/element-images.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = "periodic-3d-build/0.1 (educational periodic table; offline build script)";
const THUMB_WIDTH = 480;
const OUT_DIR = "public/images/elements";

/** Licences that allow redistribution of a thumbnail with attribution. */
const ALLOWED_LICENSE = /^(CC0|Public domain|CC BY(-SA)? \d\.\d( [a-z]{2})?|FAL|Attribution)$/i;

const curation = JSON.parse(readFileSync(join(root, "data-sources/element-image-curation.json"), "utf8"));

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** upload.wikimedia.org rate-limits bursts (HTTP 429): honour Retry-After and back off. */
async function download(url, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`);
    const wait = Number(res.headers.get("retry-after")) * 1000 || 2000 * 2 ** i;
    console.log(`  ${res.status}, retrying in ${Math.round(wait / 1000)}s…`);
    await sleep(wait);
  }
  throw new Error(`gave up after ${attempts} attempts: ${url}`);
}

/**
 * Pixel size read from the file itself: Commons serves its nearest standard
 * thumbnail bucket, which can differ from the width requested/reported.
 */
function imageSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  // JPEG: walk markers to the first SOF (C0–CF except C4, C8, CC).
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error("bad JPEG marker");
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error("JPEG size not found");
}

const strip = (html) =>
  (html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/\s+/g, " ")
    .trim();

// 1. Wikidata
const sparql = `SELECT ?num ?image WHERE {
  ?item wdt:P31 wd:Q11344; wdt:P1086 ?num.
  OPTIONAL { ?item wdt:P18 ?image. }
} ORDER BY ?num`;
const wd = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`);
const picks = new Map();
for (const row of wd.results.bindings) {
  const z = Number(row.num.value);
  if (z < 1 || z > 118 || !row.image || picks.has(z)) continue;
  picks.set(z, decodeURIComponent(row.image.value.split("/").pop()));
}

// 2. Commons metadata (batched)
const candidates = [...picks]
  .filter(([z, file]) => !/\.svg$/i.test(file) && !(String(z) in curation.exclude))
  .sort((a, b) => a[0] - b[0]);
const meta = new Map();
for (let i = 0; i < candidates.length; i += 40) {
  const chunk = candidates.slice(i, i + 40);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: String(THUMB_WIDTH),
    iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
    titles: chunk.map(([, f]) => `File:${f}`).join("|"),
  });
  const data = await getJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const normalized = new Map((data.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of Object.values(data.query.pages)) {
    const requested = (normalized.get(page.title) ?? page.title).replace(/^File:/, "");
    const entry = chunk.find(([, f]) => f === requested || `File:${f}` === page.title);
    const info = page.imageinfo?.[0];
    if (entry && info) meta.set(entry[0], { file: page.title.replace(/^File:/, ""), ...info });
  }
}

// 3. Filter, download, record
mkdirSync(join(root, OUT_DIR), { recursive: true });
const images = {};
const skipped = {};
for (const [z] of candidates) {
  const info = meta.get(z);
  if (!info) {
    skipped[z] = "Commons metadata unavailable";
    continue;
  }
  const m = info.extmetadata ?? {};
  const license = strip(m.LicenseShortName?.value);
  if (!ALLOWED_LICENSE.test(license)) {
    skipped[z] = `licence not allowed: ${license}`;
    continue;
  }
  const captionZh = curation.captions[String(z)];
  if (!captionZh) throw new Error(`Z=${z}: missing captionZh in element-image-curation.json`);

  // Commons appends tracking parameters; the file type is in the path.
  const thumb = new URL(info.thumburl);
  thumb.search = "";
  const ext = thumb.pathname.match(/\.(jpe?g|png)$/i)?.[1].toLowerCase().replace("jpeg", "jpg");
  if (!ext) throw new Error(`Z=${z}: unexpected thumbnail type ${thumb}`);
  const path = `${OUT_DIR}/${z}.${ext}`;
  // Resume-friendly: keep files from an earlier (rate-limited) run.
  if (!existsSync(join(root, path))) {
    writeFileSync(join(root, path), await download(thumb));
    await sleep(600); // be gentle with upload.wikimedia.org
  }
  const { width, height } = imageSize(readFileSync(join(root, path)));

  images[z] = {
    src: `/images/elements/${z}.${ext}`,
    width,
    height,
    captionZh,
    // Drop wiki signature noise such as "(talk)".
    author: strip(m.Artist?.value).replace(/\s*\((talk|Diskussion|discussion)\)/gi, "").trim() || "未具名",
    license,
    licenseUrl: strip(m.LicenseUrl?.value) || null,
    sourceUrl: info.descriptionurl,
    file: info.file,
  };
}

const doc = {
  _source:
    "Wikidata P18 (image) of each element → Wikimedia Commons thumbnails (480 px) with author and licence from the Commons API. Generated by scripts/fetch-element-images.mjs; curated by element-image-curation.json.",
  retrieved: new Date().toISOString().slice(0, 10),
  images,
  excluded: { ...curation.exclude, ...skipped },
};
writeFileSync(join(root, "data-sources/element-images.json"), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Saved ${Object.keys(images).length} images; excluded/skipped:`, Object.keys(doc.excluded).length);
