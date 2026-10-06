// Uses the production firmware web bundle with a local fake device only.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');

(async () => {
  const calls = [];
  const status = {
    displayOn: true, brightness: 70, pixelShift: 0, refreshRateHz: 60,
    timezone: 'UTC0', rotation: 'auto', notificationPosition: 'top',
    notificationPositions: ['top', 'bottom'], notificationCount: 0,
    notificationMaxVisible: 3, notificationAuthEnabled: true, apiPasswordSet: true,
    ip: '192.0.2.10', wifiRssiDbm: -50, defaultFont: 'builtin', fonts: [],
  };
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET') {
      let body = '';
      req.on('data', part => body += part);
      req.on('end', () => {
        calls.push({ path: req.url, method: req.method, body: JSON.parse(body) });
        if (req.url === '/api/v1/display') Object.assign(status, JSON.parse(body));
        res.writeHead(204).end();
      });
    } else if (req.url === '/api/v1/info') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ name: 'Mini-Display', model: 'Local test', width: 240, height: 240 }));
    } else if (req.url === '/api/v1/status') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(status));
    } else if (req.url === '/api/v1/fonts') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ active: -1, slots: [], maxSlots: 2, sizes: [18, 24, 36, 48] }));
    } else if (req.url === '/assets/app.js') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(fs.readFileSync('firmware/web/dist/assets/app.js'));
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end(fs.readFileSync('firmware/web/dist/index.html'));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/display`);
    const panel = page.locator('mini-display-notifications');
    const select = panel.getByLabel('Default position');
    const limit = panel.getByLabel('Visible at once');
    const protection = panel.getByLabel('Protect notification API');
    await select.waitFor();
    assert.equal(await select.locator('option').count(), 2);
    assert.equal(await select.inputValue(), 'top');
    assert.equal(await limit.inputValue(), '3');
    assert.equal(await protection.isChecked(), true);
    await select.selectOption('bottom');
    await limit.selectOption('2');
    await protection.uncheck();
    assert.equal(calls.length, 0);
    await panel.getByRole('button', { name: 'Save settings' }).click();
    await page.getByText('Notification settings saved.', { exact: true }).waitFor();
    assert.deepEqual(calls[0], { path: '/api/v1/display', method: 'PUT', body: {
      notificationPosition: 'bottom', notificationMaxVisible: 2, notificationAuthEnabled: false,
    } });
    await panel.getByRole('button', { name: 'Test notification' }).click();
    await page.getByText('Test notification sent.', { exact: true }).waitFor();
    assert.equal(calls[1].body.position, 'bottom');
    assert.equal(calls[1].path, '/api/v1/notifications');
    await panel.getByRole('button', { name: 'Dismiss all' }).click();
    await page.getByText('All notifications dismissed.', { exact: true }).waitFor();
    assert.deepEqual(calls[2], { path: '/api/v1/notifications', method: 'DELETE', body: {} });
    status.notificationPositions = ['top', 'bottom', 'left', 'right', 'top_left', 'top_right', 'bottom_left', 'bottom_right'];
    await page.reload();
    await select.waitFor();
    assert.equal(await limit.inputValue(), '2');
    assert.equal(await protection.isChecked(), false);
    assert.equal(await select.locator('option').count(), 8);
    await protection.check();
    await panel.getByText('Uses the panel/API password, even when panel protection is off.').waitFor();
    await select.selectOption('top_right');
    await panel.screenshot({ path: '.cache/tests/notifications-settings.png' });
    await page.setViewportSize({ width: 375, height: 850 });
    await panel.screenshot({ path: '.cache/tests/notifications-settings-mobile.png' });
    assert.ok(await panel.evaluate(el => el.getBoundingClientRect().right <= innerWidth));
    assert.deepEqual(errors, []);
    status.apiPasswordSet = false;
    status.notificationAuthEnabled = true;
    await page.reload();
    await panel.getByText('Set a panel/API password in Security before sending notifications.').waitFor();
    console.log('notification placement, count, authentication, persistence, send and mobile layout passed');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
