import type { Citation, Run } from "@/lib/contracts";

const preserveNull = new Set([
  "trustScore",
  "shareId",
  "completedAt",
  "error",
  "matched",
  "fix",
  "suggestedFix",
]);
function camel(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camel);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        const name = key.replace(/_([a-z])/g, (_, c: string) =>
          c.toUpperCase(),
        );
        return item === null && !preserveNull.has(name)
          ? []
          : [[name, camel(item)]];
      }),
    );
  return value;
}
function select<T>(value: unknown, fields: readonly string[]): T {
  const row = camel(value) as Record<string, unknown>;
  return Object.fromEntries(
    fields
      .filter((key) => row[key] !== undefined)
      .map((key) => [key, row[key]]),
  ) as T;
}
export function toRun(row: unknown): Run {
  const run = select<Run>(row, [
    "id",
    "title",
    "inputType",
    "status",
    "stageDetail",
    "totalCitations",
    "checkedCitations",
    "counts",
    "trustScore",
    "tinyfishUsage",
    "shareId",
    "createdAt",
    "completedAt",
    "error",
  ]);
  // Enum keys are values in the contract; only column/property names are camelCase.
  run.counts = (row as { counts: Run["counts"] }).counts;
  return run;
}
export function toCitation(row: unknown): Citation {
  const result = select<Citation>(row, [
    "id",
    "idx",
    "bibKey",
    "raw",
    "parsed",
    "status",
    "existence",
    "support",
    "integrity",
    "reason",
    "matched",
    "fieldDiffs",
    "fix",
    "claims",
    "evidence",
  ]);
  result.parsed = select(result.parsed, [
    "title",
    "authors",
    "year",
    "venue",
    "doi",
    "arxivId",
    "url",
  ]);
  if (result.matched)
    result.matched = select(result.matched, [
      "title",
      "authors",
      "year",
      "venue",
      "doi",
      "url",
      "pdfUrl",
      "citedByCount",
    ]);
  result.claims = result.claims?.map((item) =>
    select(item, [
      "id",
      "text",
      "context",
      "support",
      "currency",
      "suggestedFix",
    ]),
  );
  result.evidence = result.evidence?.map((item) =>
    select(item, [
      "id",
      "checkType",
      "verdict",
      "api",
      "sourceUrl",
      "sourceTitle",
      "publisher",
      "publishedAt",
      "quote",
      "explanation",
      "confidence",
    ]),
  );
  return result;
}
