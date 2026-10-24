const { chromium } = require('playwright');
const { readFile } = require('node:fs/promises');
const { resolve, sep, extname } = require('node:path');
const assert = require('node:assert/strict');

const root = __dirname;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('http://demo.local/**', async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!target.startsWith(root + sep)) return route.fulfill({ status: 404 });
    try {
      const body = await readFile(target);
      return route.fulfill({ status: 200, body, contentType: mime[extname(target)] || 'application/octet-stream' });
    } catch {
      return route.fulfill({ status: 404 });
    }
  });
  await page.goto('http://demo.local/');
  await page.getByRole('button', { name: 'Promos' }).click();
  await page.locator('[data-display-preview="0"]').click();
  const dialog = page.locator('#displayPreviewDialog');
  await dialog.waitFor({ state: 'visible' });
  assert.match(await dialog.innerText(), /Illustrative demo layout/);
  assert.match(await dialog.innerText(), /Walmart Supercenter/);
  await dialog.getByRole('button', { name: 'Close preview' }).click();
  assert.equal(await dialog.isVisible(), false);
  await page.locator('[data-promo-preview="0"]').click();
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await dialog.locator('img').count(), 1);
  assert.equal(await dialog.locator('img').evaluate((image) => image.complete && image.naturalWidth > 0), true);
  assert.match(await dialog.innerText(), /Historical retail example only/);
  assert.deepEqual(errors, []);
  console.log('Handheld display preview browser checks passed');
  await browser.close();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
