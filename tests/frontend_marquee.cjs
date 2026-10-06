// Run after make card-build with Playwright available through NODE_PATH.
const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');

(async () => {
  const bundle = fs.readFileSync('custom_components/mini_display/frontend/mini-display-panel.js');
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/panel.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/panel.js' ? bundle : '<style>body{background:#202020;color:white;font:14px sans-serif;--primary-color:#03a9c4;--card-background-color:#242424;--primary-text-color:white;--divider-color:#555}</style><script type="module" src="/panel.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 480, height: 700 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async () => {
      await customElements.whenDefined('mini-display-preview');
      const preview = document.createElement('mini-display-preview');
      preview.style.width = '300px';
      preview.dashboard = { version: 1, pages: [{ id: 'test', layout: 'free', showTitle: false, durationSeconds: 5, rows: [{ cards: [{
        type: 'text', text: 'A very long text that must remain large and scroll inside its own box', title: 'A long title that also scrolls',
        frame: { x: 0, y: 0, width: 100, height: 100 },
        titleFrame: { x: 0, y: 0, width: 100, height: 20 },
        valueFrame: { x: 0, y: 30, width: 100, height: 50 },
        valueStyle: { marquee: true, marqueeEffect: 'loop', marqueeIntervalMs: 100, fontSize: 'small' },
      }] }] }] };
      document.body.append(preview);
      const controls = document.createElement('mini-display-marquee-field');
      controls.value = { marquee: true, marqueeIntervalMs: 800, marqueeStepPixels: 4 };
      document.body.append(controls);
      await preview.updateComplete;
    });
    const value = page.locator('.value').first();
    assert.equal(await value.evaluate(el => getComputedStyle(el).fontSize), '48px');
    assert.equal(await value.locator('.marquee-copy').count(), 2);
    await page.waitForTimeout(1600);
    assert.ok(await value.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41 < 0));
    await page.locator('mini-display-duration-field input[type=radio][aria-label=Seconds]').check();
    assert.equal(await page.locator('mini-display-duration-field input[type=number]').inputValue(), '0.8');
    await page.evaluate(() => {
      const controls = document.querySelector('mini-display-marquee-field');
      controls.addEventListener('marquee-changed', event => window.changed = event.detail);
    });
    const input = page.locator('mini-display-duration-field input[type=number]');
    await input.fill('0.5');
    await input.dispatchEvent('change');
    assert.equal(await page.evaluate(() => window.changed.marqueeIntervalMs), 500);
    const step = page.locator('mini-display-marquee-field input[aria-label="Marquee step size"]');
    await step.fill('6');
    await step.dispatchEvent('change');
    assert.equal(await page.evaluate(() => window.changed.marqueeStepPixels), 6);
    await page.screenshot({ path: '.cache/tests/marquee-controls.png' });
    await page.evaluate(async () => {
      const preview = document.querySelector('mini-display-preview');
      const dashboard = structuredClone(preview.dashboard);
      dashboard.pages[0].layout = 'rows';
      dashboard.pages[0].rows[0].cards[0].valueStyle.fontSize = 'xlarge';
      preview.dashboard = dashboard;
      await preview.updateComplete;
    });
    assert.ok(await value.evaluate(el => el.classList.contains('marquee')));
    assert.equal(await value.evaluate(el => getComputedStyle(el).fontSize), '48px');
    assert.deepEqual(errors, []);
    console.log('marquee sizing, free/rows preview, loop and ms/s controls passed');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
