import fs from "node:fs";

function summarize(report) {
  const executions = report?.run?.executions ?? [];

  const byApi = new Map();
  let totalAssertions = 0;
  let failedAssertions = 0;

  for (const execution of executions) {
    const apiName = execution?.item?.name ?? "unknown";
    const assertions = execution?.assertions ?? [];
    const assertionCount = assertions.length;
    const failedCount = assertions.filter((a) => Boolean(a?.error)).length;

    totalAssertions += assertionCount;
    failedAssertions += failedCount;

    const current = byApi.get(apiName) ?? { total: 0, ok: 0, nok: 0 };
    current.total += assertionCount;
    current.nok += failedCount;
    current.ok += assertionCount - failedCount;
    byApi.set(apiName, current);
  }

  return {
    totalAssertions,
    okAssertions: totalAssertions - failedAssertions,
    nokAssertions: failedAssertions,
    byApi: Array.from(byApi.entries()).map(([api, s]) => ({ api, ...s })),
  };
}

function toMarkdown(summary) {
  const lines = [];
  lines.push("## Postman API tests");
  lines.push("");
  lines.push(
    `- Total: **${summary.totalAssertions}** (OK: **${summary.okAssertions}**, NOK: **${summary.nokAssertions}**)`
  );
  lines.push("");
  lines.push("| API | Tests | OK | NOK |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const row of summary.byApi) {
    lines.push(`| ${row.api} | ${row.total} | ${row.ok} | ${row.nok} |`);
  }
  lines.push("");
  return lines.join("\n");
}

const reportPath = process.argv[2];
if (!reportPath) {
  console.error("Usage: node scripts/postman/summarize-newman.mjs <newman-report.json>");
  process.exit(2);
}

const raw = fs.readFileSync(reportPath, "utf8");
const report = JSON.parse(raw);

const summary = summarize(report);
process.stdout.write(toMarkdown(summary));

