const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const assert = require("node:assert/strict");

const gif = Buffer.from(
  "R0lGODlhAgACAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAAAgACAAAIBgABCAQQEAAh+QQBFAABACwAAAAAAgACAIEAAP8AAAAAAAAAAAAIBgABCAQQEAA7",
  "base64",
);

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
        : '<script type="module" src="/panel.js"></script>',
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async () => {
      await customElements.whenDefined("mini-display-image-field");
      const field = document.createElement("mini-display-image-field");
      field.displayId = "display";
      field.hass = {
        callWS: async (request) => {
          window.upload = request;
        },
      };
      field.addEventListener("asset-uploaded", (event) => {
        window.asset = event.detail;
      });
      document.body.append(field);
      await field.updateComplete;
    });
    await page
      .locator('mini-display-image-field input[type="file"]')
      .setInputFiles({ name: "two-frames.gif", mimeType: "image/gif", buffer: gif });
    await page.waitForFunction(() => window.asset !== undefined);
    const result = await page.evaluate(() => ({
      asset: window.asset,
      upload: window.upload,
    }));
    assert.equal(result.asset.animated, true);
    assert.equal(result.asset.frameCount, 2);
    assert.equal(result.asset.durationMs, 300);
    assert.equal(result.asset.width, 2);
    assert.equal(result.asset.height, 2);
    assert.equal(result.upload.type, "mini_display/asset/upload");
    assert.equal(
      Buffer.from(result.upload.data, "base64").subarray(0, 4).toString(),
      "MDA2",
    );
    console.log("animated GIF browser conversion passed");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
