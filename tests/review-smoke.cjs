const {chromium,expect}=require('@playwright/test');
const {pathToFileURL}=require('url');const path=require('path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('index.html')).href);
 await page.locator('#reviewModeButton').click();
 await page.locator('#tagListFormat').selectOption('standard');
 await page.locator('.paste-taglist summary').click();
 await page.locator('#pastedTagList').fill('Name\tDescription\nLB12-TF1_D\tDriftindikering via flödesgivare\nBACnet\tBACnet MS/TP\nLB12-UNKNOWN\tOkänd');
 await page.locator('#importPastedTagList').click();
 await expect(page.locator('#runReview')).toBeEnabled();await page.locator('#runReview').click();
 await expect(page.locator('#rows tr')).toHaveCount(3);
 await page.locator('#resultSearch').fill('UNKNOWN');await expect(page.locator('#rows tr')).toHaveCount(1);
 await page.locator('#resultSearch').fill('');await expect(page.locator('#rows tr')).toHaveCount(3);
 await page.screenshot({path:'tests/ui-review.png',fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: paste, review, search, three rows, no script errors');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
