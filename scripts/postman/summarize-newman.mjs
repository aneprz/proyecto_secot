import fs from "node:fs";

function safeText(value, maxLen = 200) {
  if (value == null) return "";
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

function summarize(report) {
  const executions = report?.run?.executions ?? [];

  const byApi = new Map();
  let totalAssertions = 0;
  let failedAssertions = 0;
  const failures = [];

  for (const execution of executions) {
    const apiName = execution?.item?.name ?? "unknown";
    const assertions = execution?.assertions ?? [];
    const assertionCount = assertions.length;
    const failed = assertions.filter((a) => Boolean(a?.error));
    const failedCount = failed.length;

    totalAssertions += assertionCount;
    failedAssertions += failedCount;

    const current = byApi.get(apiName) ?? { total: 0, ok: 0, nok: 0 };
    current.total += assertionCount;
    current.nok += failedCount;
    current.ok += assertionCount - failedCount;
    byApi.set(apiName, current);

    if (failedCount > 0) {
      const responseCode = execution?.response?.code ?? execution?.response?.status ?? "";
      for (const a of failed) {
        const failure = {
          api: apiName,
          assertion: a?.assertion ?? "",
          message: safeText(a?.error?.message ?? a?.error ?? ""),
          code: responseCode,
        };
        failures.push(failure);
      }
    }
  }

  return {
    totalAssertions,
    okAssertions: totalAssertions - failedAssertions,
    nokAssertions: failedAssertions,
    failures,
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

  const failed = summary.failures ?? [];
  if (failed.length > 0) {
    lines.push("### Failures (first 10)");
    lines.push("");
    lines.push("| API | Assertion | Code | Message |");
    lines.push("| --- | --- | ---: | --- |");
    for (const f of failed.slice(0, 10)) {
      const api = safeText(f.api, 80) || "unknown";
      const assertion = safeText(f.assertion, 80) || "unknown";
      const code = safeText(f.code, 20);
      const msg = safeText(f.message, 160) || "unknown error";
      lines.push(`| ${api} | ${assertion} | ${code} | ${msg} |`);
    }
    lines.push("");
    if (failed.length > 10) {
      lines.push(`- Showing 10 of ${failed.length} failures. Download artifact \`newman-report.json\` for full details.`);
      lines.push("");
    }
  }

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
