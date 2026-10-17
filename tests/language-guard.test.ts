import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Language guard for everything the project ships or documents. The site is
 * Traditional Chinese first (with English names and code); text in another
 * language slipping into code, content or data must fail the build.
 */

/** Letters used only by Vietnamese: ă đ ơ ư and the dot-below / hook-above block. */
const VIETNAMESE = /[ăĂđĐơƠưƯẠ-ỹ]/u;
/** Simplified-only forms of common characters (shared characters such as 氧 are excluded). */
const SIMPLIFIED = /[们这个为说时实电发会级应体图门关开长东车书来对现后无义样]/u;

const ROOTS = ["src", "scripts", "docs", "tests", "public/data", "data-sources", "README.md"];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".js", ".json", ".css", ".md", ".csv"]);
const ALLOW_MARKER = "language-guard: allow";
/** This file necessarily contains the patterns it searches for. */
const SELF = join("tests", "language-guard.test.ts");
/** Raw third-party downloads kept verbatim for traceability. */
const RAW_SOURCES = new Set([
  join("data-sources", "pubchem-periodic-table.json"),
  join("data-sources", "nist-asd-ground-configurations.json"),
]);

function listFiles(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((entry) => listFiles(join(path, entry)));
}

const files = ROOTS.flatMap(listFiles).filter(
  (f) => TEXT_EXTENSIONS.has(extname(f)) && f !== SELF && !RAW_SOURCES.has(f),
);

function offending(pattern: RegExp) {
  return files.flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, i) =>
        // Detection patterns in other tests must contain the characters they look for.
        pattern.test(line) && !line.includes(ALLOW_MARKER) ? [`${file}:${i + 1}: ${line.trim().slice(0, 80)}`] : [],
      ),
  );
}

describe("language guard", () => {
  it("scans the project's source, content and data files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("contains no Vietnamese text", () => {
    expect(offending(VIETNAMESE)).toEqual([]);
  });

  it("contains no Simplified Chinese", () => {
    expect(offending(SIMPLIFIED)).toEqual([]);
  });
});
