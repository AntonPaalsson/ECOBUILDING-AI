const {chromium}=require('@playwright/test');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
const file=process.argv[2];if(!file)throw Error('Usage: node tests/fi-pdf-smoke.cjs <driftkort.pdf>');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.locator('#fiDkFiles').setInputFiles(file);await page.waitForFunction(()=>!document.getElementById('fiDkPick').disabled,null,{timeout:60000});
    const next=page.locator('.workflow-page-navigation button').last();await next.click();
    assert.ok(await page.locator('.fi-system-node').count());
    const input=page.locator('[data-fi-field="duc"]').first();assert.ok((await input.inputValue()).length);
    const serves=await page.locator('[data-fi-field="serves"]').first().inputValue();assert.ok(serves.length);assert.ok(!serves.includes('\t'));
    assert.ok(await page.locator('.fi-source-link').count());
    await page.locator('#fiSchool').fill('Testskolan');await page.locator('#fiSchool').blur();
    await page.screenshot({path:'tests/fi-tree-real.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewportSize({width:1500,height:1000});
    await page.locator('.fi-confirm input').first().check();await next.click();
    await page.locator('#tagListFormat').selectOption('standard');await page.locator('.paste-taglist summary').click();
    await page.locator('#pastedTagList').fill('Name\tDescription\nLB31-GT11_MV\tMätvärde\nLB31-GP11_MV\tMätvärde');await page.locator('#importPastedTagList').click();
    await page.locator('#fiMappingPanel').waitFor({state:'visible'});await page.locator('.fi-map-system select').first().selectOption('LB31');
    await next.click();await next.click();await page.locator('#fiReviewSummary').waitFor({state:'visible'});
    assert.ok((await page.locator('#fiReviewSummary').innerText()).includes('LB31'));
    assert.equal(await page.locator('#dkAlarmResults').isVisible(),true);assert.deepEqual(errors,[]);
    console.log('PASS: real PDF → metadata/evidence tree → explicit prefix mapping → DK and framework review, including mobile layout.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
