import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const ts = require("typescript");
const source = await readFile(
  new URL("../apps/web/lib/input-validation.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { validateDocument } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const mb = 1024 * 1024;
assert.equal(validateDocument({ name: "paper.pdf", size: 20 * mb }), null);
assert.equal(validateDocument({ name: "paper.PDF", size: 1 }), null);
assert.equal(validateDocument({ name: "refs.bib", size: 2 * mb }), null);
assert.equal(
  validateDocument({ name: "paper.pdf", size: 20 * mb + 1 }).code,
  "file-size",
);
assert.equal(
  validateDocument({ name: "refs.bib", size: 2 * mb + 1 }).code,
  "file-size",
);
assert.equal(
  validateDocument({ name: "refs.bib", size: 0 }).code,
  "empty-file",
);
assert.equal(
  validateDocument({ name: "paper.txt", size: 1 }).code,
  "file-type",
);
assert.equal(
  validateDocument({ name: "paper.pdf.exe", size: 1 }).code,
  "file-type",
);
console.log(
  "PASS input types, empty files, case-insensitive extensions, and exact size boundaries",
);
