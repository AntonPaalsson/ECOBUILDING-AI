const { chromium } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');

// Pass a text-based driftkort PDF; the test never copies it into the project.
const input = process.argv[2];
if (!input) throw Error('Usage: node tests/pdf-smoke.cjs <driftkort.pdf>');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const target = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const file = target === root ? path.join(root, 'index.html') : target;
  const type = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.wasm':'application/wasm', '.svg':'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
  fs.readFile(file, (error, data) => { if(error) res.writeHead(404).end(); else {res.setHeader('Content-Type',type);res.end(data);} });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    for (const url of [pathToFileURL(path.join(root, 'index.html')).href, `http://127.0.0.1:${server.address().port}/index.html`]) {
      const page = await browser.newPage({viewport:{width:1500,height:1000}});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(url);
      await page.locator('#navDialTrigger').click();await page.locator('#navPdfShortcut').click();
      await page.locator('#pdfFile').setInputFiles(input);
      await page.waitForFunction(()=>document.getElementById('pdfWorkspace').classList.contains('hidden')===false,null,{timeout:60000});
      await page.waitForFunction(()=>document.getElementById('pdfPageStatus').textContent.includes('Sida '));
      assert.ok(await page.locator('.pdf-component').count());
      assert.ok(await page.locator('#pdfCanvas').evaluate(canvas=>canvas.width>0 && canvas.height>0));
      const total = await page.locator('#pdfPage option').count();
      if(total>1) { await page.locator('#pdfNext').click(); await page.waitForFunction(()=>document.getElementById('pdfPageStatus').textContent.startsWith('Sida 2 ')); }
      await page.locator('#pdfComponents .pdf-page-links button').first().click();
      await page.locator('#pdfAlarmsTab').click(); assert.equal(await page.locator('#pdfAlarms').isVisible(),true);
      await page.locator('#pdfChecksTab').click(); assert.equal(await page.locator('#pdfChecks').isVisible(),true);
      assert.ok((await page.locator('#pdfCheckCount').innerText()).includes('förslag'));
      await page.locator('#pdfTextTab').click(); assert.ok((await page.locator('#pdfPageText').inputValue()).length);
      await page.locator('#navDialTrigger').click(); await page.locator('#navReviewShortcut').click();
      assert.equal(await page.locator('#pick').isVisible(),true);
      assert.equal(await page.locator('#pdfTestPanel').isVisible(),false);
      await page.locator('#navDialTrigger').click(); await page.locator('#navPdfShortcut').click();
      assert.equal(await page.locator('#pdfWorkspace').isVisible(),true);
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      console.log('PASS',url.startsWith('file:')?'file:':'http:',await page.locator('#pdfComponentCount').innerText());
      await page.close();
    }
  } finally { await browser.close();server.close(); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
