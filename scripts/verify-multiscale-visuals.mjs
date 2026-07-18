import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const scripts = [
  "verify-dft-visuals.mjs",
  "verify-mlff-visuals.mjs",
  "verify-allatom-visuals.mjs",
  "verify-meso-visuals.mjs",
];

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join("scripts", script)], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

if (process.env.RESEARCH_REUSE_REPORTS !== "1") {
  for (const script of scripts) {
    process.stdout.write(`\nRunning ${script}\n`);
    await run(script);
  }
}

const reports = [
  ".superloopy/evidence/dft-visuals/report.json",
  ".superloopy/evidence/mlff-visuals/report.json",
  ".superloopy/evidence/allatom-visuals/report.json",
  ".superloopy/evidence/meso-visuals/report.json",
];
const aggregate = {
  generatedAt: new Date().toISOString(),
  reports: [],
  totalCases: 0,
  passedCases: 0,
  failedCases: 0,
};

for (const reportPath of reports) {
  const report = JSON.parse(await fs.readFile(path.join(ROOT, reportPath), "utf8"));
  const passed = report.cases.filter((entry) => entry.pass).length;
  const failed = report.cases.length - passed;
  aggregate.reports.push({
    path: reportPath,
    cases: report.cases.length,
    passed,
    failed,
  });
  aggregate.totalCases += report.cases.length;
  aggregate.passedCases += passed;
  aggregate.failedCases += failed;
}

const output = path.join(ROOT, ".superloopy", "evidence", "multiscale-visual-gate.json");
await fs.writeFile(output, JSON.stringify(aggregate, null, 2));
process.stdout.write(
  `\nAggregate: ${aggregate.passedCases}/${aggregate.totalCases} cases passed\n`,
);
process.stdout.write(`Report: ${path.relative(ROOT, output)}\n`);

if (aggregate.totalCases !== 81 || aggregate.failedCases !== 0) {
  process.exitCode = 1;
}
