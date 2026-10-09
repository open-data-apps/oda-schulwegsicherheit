// Opt-in browser regression: PLAYWRIGHT_MODULE points to an existing Playwright
// installation. No dependency is added to the app or its delivery ZIP.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

function serve(root) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + relative, relative.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${server.address().port}/app/`,
    close: () => new Promise(done => server.close(done)),
  })));
}

async function measure(page, opening) {
  await page.evaluate(opening => {
    const menu = document.querySelector('#offcanvasNavbar');
    window.__menuFrames = [];
    window.__menuMotion = new Promise(resolve => {
      menu.addEventListener(opening ? 'show.bs.offcanvas' : 'hide.bs.offcanvas', () => {
        const start = performance.now();
        function frame() {
          const style = getComputedStyle(menu);
          const rect = menu.getBoundingClientRect();
          window.__menuFrames.push({ ms: performance.now() - start, className: menu.className,
            display: style.display, visibility: style.visibility, x: rect.x, width: rect.width });
          if (performance.now() - start < 420) requestAnimationFrame(frame);
          else resolve(window.__menuFrames);
        }
        requestAnimationFrame(frame);
      }, { once: true });
    });
  }, opening);
  if (opening) await page.locator('[data-bs-toggle="offcanvas"][data-bs-target="#offcanvasNavbar"]').first().click();
  else await page.locator('#offcanvasNavbar [data-bs-dismiss="offcanvas"]').click();
  return page.evaluate(() => window.__menuMotion);
}

function assertMotion(frames, phase) {
  const active = frames.filter(f => f.className.includes(phase));
  assert.ok(active.length >= 2, `No intermediate ${phase} frames`);
  assert.ok(active.every(f => f.display !== 'none' && f.visibility === 'visible'), `${phase} animation is hidden`);
  assert.ok(new Set(active.map(f => Math.round(f.x))).size >= 3, `${phase} position jumps instead of moving`);
}

async function checkMenu(page, url, width, reducedMotion = 'no-preference') {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof bootstrap !== 'undefined' && document.readyState === 'complete');
  await page.locator('[data-bs-toggle="offcanvas"][data-bs-target="#offcanvasNavbar"]').first().waitFor();
  const menu = page.locator('#offcanvasNavbar');
  const opening = await measure(page, true);
  assert.equal(await menu.evaluate(el => el.classList.contains('show')), true);
  if (reducedMotion === 'no-preference') assertMotion(opening, 'showing');
  const focusInside = await menu.evaluate(el => el.contains(document.activeElement));
  assert.equal(focusInside, true, 'Opened menu must receive focus');
  const closing = await measure(page, false);
  await page.waitForFunction(() => !document.querySelector('#offcanvasNavbar').classList.contains('show'));
  assert.equal(await page.locator('.offcanvas-backdrop').count(), 0);
  assert.equal(await menu.evaluate(el => getComputedStyle(el).visibility), 'hidden');
  if (reducedMotion === 'no-preference') {
    assertMotion(closing, 'hiding');
  } else {
    assert.equal(await menu.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  }
  const trigger = page.locator('[data-bs-toggle="offcanvas"][data-bs-target="#offcanvasNavbar"]').first();
  async function open() {
    await trigger.click();
    await page.waitForFunction(() => {
      const e = document.querySelector('#offcanvasNavbar');
      return e.classList.contains('show') && !e.classList.contains('showing');
    });
  }
  async function closed() {
    await page.waitForFunction(() => {
      const e = document.querySelector('#offcanvasNavbar');
      return !e.classList.contains('show') && !e.classList.contains('hiding') && !document.querySelector('.offcanvas-backdrop');
    });
    assert.equal(await page.evaluate(() => document.body.style.overflow === 'hidden'), false);
  }
  await open();
  await page.keyboard.press('Escape');
  await closed();
  assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Focus returns to trigger');
  await open();
  // At 390px the Bootstrap panel fills the viewport: there is no exposed
  // backdrop to click. Exercise it only when the panel leaves one visible.
  const panel = await menu.boundingBox();
  if (panel.x > 5) await page.mouse.click(5, 450);
  else await menu.locator('[data-bs-dismiss="offcanvas"]').click();
  await closed();
  await open();
  await menu.locator('a[href="#kontakt"]').click();
  await closed();
  assert.equal(new URL(page.url()).hash, '#kontakt');
  await page.waitForFunction(() => document.querySelector('#main-content')?.textContent.includes('Kontakt'));
  await open();
  await page.keyboard.press('Escape');
  await closed();
  // Exercise consecutive toggle events before the first transition finishes.
  await trigger.evaluate(el => { el.click(); el.click(); });
  await closed();
  return { width, reducedMotion, opening, closing, focusInside,
    checks: ['open/close', 'focus', 'Escape', 'backdrop', 'navigation', 'repeat', 'rapid toggle', 'scroll unlock'] };
}

if (require.main === module) {
  test('burger menu opens and closes visibly on desktop/mobile and respects reduced motion', { timeout: 90000 }, async () => {
    const server = await serve(path.resolve(__dirname, '..'));
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await browser.newPage();
      for (const width of [1440, 390]) await checkMenu(page, process.env.MENU_URL || server.url, width);
      await checkMenu(page, process.env.MENU_URL || server.url, 390, 'reduce');
    } finally { await browser.close(); await server.close(); }
  });
}
module.exports = { serve, measure, assertMotion, checkMenu };
