import { mkdir, writeFile as writeTextFile } from "node:fs/promises";
import { resolve } from "node:path";
import { utils, writeFile } from "xlsx";
import { getEnv } from "../config/env";
import { anonymizeRecords } from "../services/anonymization";
import { loadAgentContext } from "../services/workbook";

const config = getEnv();
const context = loadAgentContext(config.datasetPath);
const { rows, report } = anonymizeRecords(context.records);
const outputDir = resolve(import.meta.dir, "../../../data/anonymized");
const workbookPath = resolve(outputDir, "mafy_sensitisation_anonymized.xlsx");
const reportPath = resolve(outputDir, "mafy_sensitisation_anonymization_report.json");

await mkdir(outputDir, { recursive: true });

const worksheet = utils.json_to_sheet(rows);
const workbook = utils.book_new();
utils.book_append_sheet(workbook, worksheet, "anonymized");

writeFile(workbook, workbookPath);
await writeTextFile(reportPath, JSON.stringify(report, null, 2));

console.info(`Wrote ${rows.length} anonymized rows to ${workbookPath}`);
console.info(`Wrote anonymization report to ${reportPath}`);
