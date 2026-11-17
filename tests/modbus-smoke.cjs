const { chromium } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
const file = process.argv[2];
if (!file) throw Error('Usage: node tests/modbus-smoke.cjs <registerlista.xlsx>');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1500,height:1000}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.locator('#navDialTrigger').click();await page.locator('#navModbusShortcut').click();
    await page.locator('#modbusFile').setInputFiles(file);
    await page.locator('#modbusPreview').waitFor({state:'visible'});
    const count=Number((await page.locator('#modbusStatus').innerText()).match(/^\d+/)[0]);
    await page.locator('#modbusExport').click();await page.locator('#modbusDownload').waitFor({state:'visible'});
    const workbook=await page.evaluate(async()=>{
      const zip=await JSZip.loadAsync(await (await fetch(document.getElementById('modbusDownload').href)).arrayBuffer());
      const original=await JSZip.loadAsync(window.ECO_MODBUS_TEMPLATE_BASE64,{base64:true});
      const parse=string=>new DOMParser().parseFromString(string,'application/xml');
      const doc=parse(await zip.file('xl/worksheets/sheet1.xml').async('text'));
      const strings=[...parse(await zip.file('xl/sharedStrings.xml').async('text')).getElementsByTagNameNS('*','si')].map(si=>si.textContent);
      const rows=[...doc.getElementsByTagNameNS('*','row')].map(row=>Object.fromEntries([...row.getElementsByTagNameNS('*','c')].map(c=>[c.getAttribute('r').replace(/\d/g,''),c.getAttribute('t')==='s'?strings[Number(c.textContent)]:c.textContent])));
      let preserved=true;
      for(const file of Object.keys(original.files).filter(name=>!original.files[name].dir && name!=='xl/worksheets/sheet1.xml')) {
        const a=await zip.file(file).async('base64'),b=await original.file(file).async('base64');if(a!==b)preserved=false;
      }
      return{rows,preserved,dimension:doc.getElementsByTagNameNS('*','dimension')[0].getAttribute('ref'),parseErrors:doc.querySelectorAll('parsererror').length};
    });
    assert.equal(workbook.rows.length,count);assert.equal(workbook.dimension,'A1:N'+count);assert.equal(workbook.parseErrors,0);assert.equal(workbook.preserved,true);
    const names=new Set();
    for(const row of workbook.rows) {
      assert.equal(row.N,'None');assert.equal(row.O,undefined);assert.equal(names.has(row.B),false);names.add(row.B);
      assert.ok(!/_[0134]x\d+$/i.test(row.B));
      assert.ok(Number.isInteger(Number(row.E)));assert.ok(Number.isFinite(Number(row.J)) || row.A.includes('Digital'));
      if(row.A.includes('Input'))assert.ok(!row.H);
      if(row.A.includes('Output') && row.F.startsWith('32'))assert.equal(row.H,'16');
      assert.ok([1,2,3,4].includes(Number(row.G)));
    }
    await page.locator('#modbusScale').selectOption('none');assert.equal(await page.locator('#modbusDownload').isVisible(),false);
    await page.locator('#navDialTrigger').click();await page.locator('#navPdfShortcut').click();
    assert.equal(await page.locator('#pdfTestPanel').isVisible(),true);assert.equal(await page.locator('#modbusPanel').isVisible(),false);assert.equal(await page.locator('#systemSelectionHero').isVisible(),false);
    await page.locator('#navDialTrigger').click();await page.locator('#navModbusShortcut').click();
    assert.equal(await page.locator('#modbusPreview').isVisible(),true);
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log('PASS:',count,'points; unchanged template parts; names, registers, function codes, 32-bit writes, stale-download invalidation, navigation and mobile layout.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
