#!/usr/bin/env node
/**
 * JCR Excel to JSON parser
 *
 * Parses a JCR (Journal Citation Reports) Excel file and outputs a JSON
 * mapping of journal names to impact factors. Used to auto-fill impact
 * factors in publication MDX frontmatter.
 *
 * Usage:
 *   node scripts/parse-jcr.mjs data/JCR_2025.xlsx
 *   node scripts/parse-jcr.mjs data/JCR_2025.xlsx --output data/impact-factors.json
 *
 * Requirements:
 *   npm install xlsx   (already in dependencies)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { read, utils } from "xlsx";

// Common column name variations in JCR Excel exports
const JOURNAL_NAME_COLS = [
  "Journal name",
  "Full Journal Title",
  "Journal title",
  "JOURNAL NAME",
  "Source Title",
  "Journal",
];

const IF_COLS = [
  "Journal Impact Factor",
  "JIF",
  "Impact Factor",
  "2023 JIF",
  "2024 JIF",
  "Journal IF",
  "IF",
];

function findColumn(headers, candidates) {
  for (const candidate of candidates) {
    const found = headers.find(
      (h) => h && h.toLowerCase().trim() === candidate.toLowerCase().trim()
    );
    if (found) return found;
  }
  // Fuzzy match: check if any header contains key terms
  for (const header of headers) {
    if (!header) continue;
    const lower = header.toLowerCase();
    if (lower.includes("journal") && lower.includes("name")) return header;
    if (lower.includes("impact") && lower.includes("factor")) return header;
  }
  return null;
}

function normalizeJournalName(name) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[.\-&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJCR(filePath) {
  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const buf = readFileSync(filePath);
  const workbook = read(buf, { type: "buffer" });

  // Try each sheet until we find one with journal data
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = utils.sheet_to_json(sheet);

    if (rows.length === 0) continue;

    const headers = Object.keys(rows[0]);
    const journalCol = findColumn(headers, JOURNAL_NAME_COLS);
    const ifCol = findColumn(headers, IF_COLS);

    if (!journalCol || !ifCol) {
      console.warn(
        `Sheet "${sheetName}": Could not find journal/IF columns. Headers: ${headers.join(", ")}`
      );
      continue;
    }

    console.log(`Sheet "${sheetName}": Using "${journalCol}" and "${ifCol}"`);

    const result = {};
    let count = 0;

    for (const row of rows) {
      const name = row[journalCol];
      const ifValue = row[ifCol];

      if (!name || ifValue === undefined || ifValue === null || ifValue === "")
        continue;

      const parsedIF = parseFloat(ifValue);
      if (isNaN(parsedIF)) continue;

      const normalized = normalizeJournalName(String(name));
      result[normalized] = {
        name: String(name).trim(),
        impactFactor: Math.round(parsedIF * 100) / 100,
      };
      count++;
    }

    console.log(`Parsed ${count} journals from sheet "${sheetName}"`);
    return result;
  }

  console.error("Error: No valid journal data found in any sheet.");
  process.exit(1);
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: node scripts/parse-jcr.mjs <excel-file> [--output <json-file>]

Options:
  --output, -o   Output JSON file path (default: data/impact-factors.json)
  --help, -h     Show this help message

Example:
  node scripts/parse-jcr.mjs data/JCR_2025.xlsx
  node scripts/parse-jcr.mjs data/JCR_2025.xlsx -o data/impact-factors.json
`);
  process.exit(0);
}

const inputFile = resolve(args[0]);
const outputIdx = args.indexOf("--output") !== -1 ? args.indexOf("--output") : args.indexOf("-o");
const outputFile = resolve(
  outputIdx !== -1 && args[outputIdx + 1]
    ? args[outputIdx + 1]
    : "data/impact-factors.json"
);

console.log(`Parsing: ${inputFile}`);
const data = parseJCR(inputFile);

writeFileSync(outputFile, JSON.stringify(data, null, 2), "utf-8");
console.log(`Written to: ${outputFile}`);
console.log(`Total journals: ${Object.keys(data).length}`);
