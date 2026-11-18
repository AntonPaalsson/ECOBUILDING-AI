const { chromium } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    // Decoder is covered separately with a real PDF. These two deterministic
    // documents exercise metadata, evidence, scope and per-DUC export together.
    await page.evaluate(()=>{
      window.ECO_PDF_READER.read=async file=>{
        const system=file.name.includes('LB11')?'LB11':'LB12';
        const line=text=>({text,y:20,items:[{x:10,y:20,width:200,height:10}]});
        const roots=system==='LB11'?['GT11','GP11']:['GT11','GT31'];
        const lines=[line('SYSTEM 1234-'+system),line('DUC/PLC:\t'+(system==='LB11'?'DUC_A':'DUC_B')),line('Apparatskåp:\tAS_A001'),line('Betjänar:\tAllmänna utrymmen'),line('Skola:\tTestskolan'),...roots.map(line)];
        return {pages:[{number:1,lines}],components:roots.map(name=>({name,occurrences:[{page:1,line:line(name),tag:name}]})),alarms:[{tag:'GT11_GF_L',priority:'B',category:'21',page:1,line:line('GT11_GF_L B 21'),source:'GT11_GF_L\tB\t21'}]};
      };
    });
    await page.locator('#fiDkFiles').setInputFiles([{name:'1234-DK-LB11.pdf',mimeType:'application/pdf',buffer:Buffer.from('fixture-11')},{name:'1234-DK-LB12.pdf',mimeType:'application/pdf',buffer:Buffer.from('fixture-12')}]);
    await page.waitForFunction(()=>!document.getElementById('fiDkPick').disabled);
    const next=page.locator('.workflow-page-navigation button').last();await next.click();
    assert.equal(await page.locator('.fi-system-node').count(),2);
    const confirms=page.locator('.fi-confirm input');await confirms.nth(0).check();await confirms.nth(1).check();await next.click();
    assert.equal(await page.locator('#pick').isVisible(),true);
    assert.deepEqual(await page.locator('[data-profile-duc]').evaluateAll(es=>es.map(e=>e.value)),['DUC_A','DUC_B']);
    await page.locator('#tagListFormat').selectOption('standard');await page.locator('.paste-taglist summary').click();
    await page.locator('#pastedTagList').fill('Name\tDescription\nLB11-GT11_MV\tMätvärde\nLB11-GP11_MV\tMätvärde\nLB12-GT11_MV\tMätvärde\nLB12-GT31_MV\tMätvärde');await page.locator('#importPastedTagList').click();
    await page.locator('#fiMappingPanel').waitFor({state:'visible'});assert.equal(await page.locator('.fi-map-system').count(),2);
    await next.click();await next.click();await page.locator('#reviewContent').waitFor({state:'visible'});
    const missing=await page.locator('#missingTagsList').innerText();assert.ok(missing.includes('LB11-GP11_B'));assert.ok(!missing.includes('LB12-GP11_B'));
    assert.equal(await page.locator('#dkAlarmCards tbody tr').count(),2);
    await next.click();await page.locator('#buildEboXml').click();await page.locator('#downloadEboXml').waitFor({state:'visible',timeout:120000});
    const exports=await page.evaluate(async()=>{
      const response=await fetch(document.getElementById('downloadEboXml').href);const zip=await JSZip.loadAsync(await response.arrayBuffer());const result={};
      for(const name of Object.keys(zip.files).filter(name=>/\.xml$/i.test(name))){const xml=new DOMParser().parseFromString(await zip.file(name).async('text'),'application/xml');result[name]=[...xml.getElementsByTagNameNS('*','Reference')].map(r=>r.getAttribute('Object')).filter(Boolean);}
      return result;
    });
    assert.deepEqual(Object.keys(exports).sort(),['LB11.xml','LB12.xml']);
    assert.ok(exports['LB11.xml'].some(p=>p.includes('/DUC_A/Application/LB11-')));
    assert.ok(exports['LB12.xml'].some(p=>p.includes('/DUC_B/Application/LB12-')));
    assert.ok(!exports['LB11.xml'].some(p=>p.includes('/DUC_B/')));assert.ok(!exports['LB12.xml'].some(p=>p.includes('/DUC_A/')));
    assert.deepEqual(errors,[]);
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    console.log('PASS: two DKs, tree confirmations, tag mapping, DK-scoped suggestions, alarm checks, and two XML files with separate DUC paths.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
