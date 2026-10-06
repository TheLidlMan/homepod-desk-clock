const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const file = path.resolve(__dirname, "../src/free-text.ts");
const loaded = new Module(file, module);
loaded._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  file,
);
const { freeTextFrame, freezeTextFrames } = loaded.exports;
const card = { title: "Test", frame: { x: 10, y: 20, width: 50, height: 40 } };
assert.deepEqual(freeTextFrame(card, "title"), {
  x: 10,
  y: 20,
  width: 50,
  height: 12,
});
assert.deepEqual(freeTextFrame(card, "value"), {
  x: 10,
  y: 32,
  width: 50,
  height: 28,
});
freezeTextFrames(card);
const value = { ...card.valueFrame };
card.titleFrame.x = 60;
card.titleFrame.width = 35;
card.frame.x = 30;
card.showTitle = false;
assert.deepEqual(freeTextFrame(card, "value"), value);
assert.equal(freeTextFrame(card, "title").x, 60);
freezeTextFrames(card);
assert.deepEqual(freeTextFrame(card, "value"), value);
const tiny = { title: "Test", frame: { x: 0, y: 98, width: 50, height: 2 } };
for (const part of ["title", "value"]) {
  const frame = freeTextFrame(tiny, part);
  assert.ok(frame.y + frame.height <= 100);
}
console.log("independent text frames, title visibility and bounds passed");
