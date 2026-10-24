import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const ts = require("typescript");
const source = await readFile(
  new URL("../apps/web/lib/to-api.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { toRun, toCitation } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const run = toRun({
  id: "run",
  owner_id: "private",
  source_text: "private",
  input_type: "bib",
  trust_score: null,
  counts: { not_found: 1, needs_review: 2 },
  tinyfish_usage: { search: 2, cache_hits: 1 },
});
assert.equal(run.inputType, "bib");
assert.equal(run.trustScore, null);
assert.deepEqual(run.counts, { not_found: 1, needs_review: 2 });
assert.equal(run.tinyfishUsage.cacheHits, 1);
assert.ok(!("ownerId" in run) && !("sourceText" in run));
const citation = toCitation({
  id: "citation",
  parsed: { idx: 1, raw: "private raw", authors: [], arxiv_id: "1706.03762" },
  matched: null,
  claims: [{ id: "claim", run_id: "private", suggested_fix: null }],
  evidence: [
    {
      id: "proof",
      check_type: "existence",
      source_url: "https://example.org",
      raw: { internal: true },
      run_id: "private",
    },
  ],
});
assert.equal(citation.parsed.arxivId, "1706.03762");
assert.ok(!("raw" in citation.parsed));
assert.ok(!("runId" in citation.claims[0]));
assert.equal(citation.evidence[0].sourceUrl, "https://example.org");
assert.ok(!("raw" in citation.evidence[0]));
console.log(
  "PASS API names, enum-valued count keys, nullable scores, nested mapping, and private-field stripping",
);
