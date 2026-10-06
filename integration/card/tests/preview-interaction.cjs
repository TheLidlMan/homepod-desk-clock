const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const assert = require("node:assert/strict");

(async () => {
  const bundle = fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../custom_components/mini_display/frontend/mini-display-panel.js",
    ),
  );
  const server = http.createServer((req, res) => {
    res.setHeader(
      "Content-Type",
      req.url === "/panel.js" ? "text/javascript" : "text/html",
    );
    res.end(
      req.url === "/panel.js"
        ? bundle
        : '<style>body{margin:0}</style><script type="module" src="/panel.js"></script>',
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 600, height: 600 },
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async () => {
      await customElements.whenDefined("mini-display-preview");
      const preview = document.createElement("mini-display-preview");
      preview.interactive = true;
      preview.dashboard = {
        version: 1,
        pages: [
          {
            id: "test",
            layout: "free",
            rows: [
              {
                cards: [
                  {
                    type: "text",
                    title: "Title",
                    titleStyle: { fontSize: "small" },
                    text: "42 W",
                    backgroundMode: "transparent",
                    frame: { x: 5, y: 5, width: 90, height: 90 },
                    titleFrame: { x: 10, y: 10, width: 50, height: 15 },
                    valueFrame: { x: 10, y: 50, width: 60, height: 25 },
                  },
                ],
              },
            ],
          },
        ],
      };
      window.events = [];
      for (const type of [
        "preview-frame",
        "preview-select",
        "preview-position",
      ])
        preview.addEventListener(type, (event) => {
          window.events.push({ type, ...event.detail });
          if (type === "preview-frame") {
            const card = preview.dashboard.pages[0].rows[0].cards[0];
            card[
              event.detail.part === "title"
                ? "titleFrame"
                : event.detail.part === "value"
                  ? "valueFrame"
                  : "frame"
            ] = event.detail.frame;
            preview.requestUpdate();
          }
        });
      document.body.append(preview);
      await preview.updateComplete;
    });
    const title = page.locator('mini-display-preview [data-part="title"]');
    const value = page.locator('mini-display-preview [data-part="value"]');
    await page
      .locator("mini-display-preview")
      .screenshot({ path: ".cache/tests/free-layout-preview.png" });
    const originalValue = await value.boundingBox();
    assert.equal(await page.locator('mini-display-preview .card > .resize-handle').count(), 0);
    const box = await title.boundingBox();
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 34, box.y + 34, { steps: 6 });
    await page.mouse.up();
    let events = await page.evaluate(() => window.events);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "preview-frame");
    assert.equal(events[0].part, "title");
    assert.equal(events[0].frame.x, 20);
    assert.deepEqual(await value.boundingBox(), originalValue);
    const oldSize = await title.evaluate(
      (node) => getComputedStyle(node).fontSize,
    );
    const handle = title.locator(".resize-handle");
    await title.hover();
    const corner = await handle.boundingBox();
    await page.mouse.move(corner.x + 12, corner.y + 12);
    await page.mouse.down();
    await page.mouse.move(corner.x + 72, corner.y + 60, { steps: 8 });
    await page.mouse.up();
    events = await page.evaluate(() => window.events);
    assert.equal(events.length, 2);
    assert.equal(events[1].part, "title");
    assert.ok(
      parseFloat(
        await title.evaluate((node) => getComputedStyle(node).fontSize),
      ) > parseFloat(oldSize),
    );
    assert.deepEqual(await value.boundingBox(), originalValue);
    await page.evaluate(async () => {
      const preview = document.querySelector("mini-display-preview");
      preview.dashboard.pages[0].rows[0].cards[0].showTitle = false;
      preview.requestUpdate();
      await preview.updateComplete;
    });
    assert.equal(await title.count(), 0);
    assert.deepEqual(await value.boundingBox(), originalValue);
    // A small click selects; a drag must never trigger the editor scroll action.
    await value.click();
    events = await page.evaluate(() => window.events);
    assert.equal(events.at(-1).type, "preview-select");
    assert.equal(events.at(-1).kind, "value");
    await page.evaluate(() =>
      document.querySelector("mini-display-preview").remove(),
    );
    await page.mouse.move(300, 300);
    console.log(
      "title drag/resize, automatic fit, independent value, hide and click passed",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
