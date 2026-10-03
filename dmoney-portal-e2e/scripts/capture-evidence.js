/**
 * Turns a finished run into README screenshots.
 *   node scripts/capture-evidence.js <suite> <console-output.txt>
 * Writes docs/screenshots/<suite>-terminal.png (the console output) and <suite>-html-report.png (the HTML report).
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const [suite, consoleFile] = process.argv.slice(2);
if (!suite || !consoleFile) {
  console.error('usage: node scripts/capture-evidence.js <smoke|regression> <console-output.txt>');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const shots = path.join(root, 'docs', 'screenshots');
fs.mkdirSync(shots, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const colour = (line) =>
  esc(line)
    .replace(/^(\s+)(✓)/, '$1<span class="ok">$2</span>')
    .replace(/^(\s+)(✘)/, '$1<span class="bad">$2</span>')
    .replace(/(\d+ passed.*)$/, '<span class="ok">$1</span>')
    .replace(/(\d+ failed.*)$/, '<span class="bad">$1</span>');

(async () => {
  const text = fs.readFileSync(consoleFile, 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
  const lines = text.split('\n').map((l) =>
    // drop the long "[chromium] › tests/file.spec.ts:84:7 ›" prefix so each test fits on one line
    l.replace(/\[chromium\] › tests\/[^›]+› Agent lifecycle on the DMoney portal › /, ''),
  );
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#1e1e2e">
  <div style="font:13px/1.55 'DejaVu Sans Mono',Menlo,monospace;color:#cdd6f4;padding:18px 24px;width:max-content">
  <div style="color:#89b4fa;margin-bottom:8px">$ npm run test:${suite}</div>
  <pre style="margin:0;font:inherit">${lines.map(colour).join('\n')}</pre></div>
  <style>.ok{color:#a6e3a1}.bad{color:#f38ba8}</style>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 600 }, deviceScaleFactor: 1.5 });
  await page.setContent(html);
  await page.locator('body > div').screenshot({ path: path.join(shots, `${suite}-terminal.png`) });

  const report = path.join(root, 'playwright-report', suite, 'index.html');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('file://' + report);
  await page.getByRole('link', { name: /All/ }).first().waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(shots, `${suite}-html-report.png`), fullPage: true });
  await browser.close();
  console.log(`saved docs/screenshots/${suite}-terminal.png and ${suite}-html-report.png`);
})();
