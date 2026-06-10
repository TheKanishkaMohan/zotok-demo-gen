const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3000/index.html');
  await page.selectOption('#templateSelect', 'haldirams');
  await page.waitForTimeout(500);
  await page.click('#nextStepBtn');
  await page.waitForTimeout(100);
  await page.fill('.product-name-input', 'Test Product');
  await page.click('#nextStepBtn');
  await page.waitForTimeout(100);
  await page.click('#generateBtn');
  
  await page.waitForSelector('#previewIframe[srcdoc]', { timeout: 10000 });
  const srcdoc = await page.evaluate(() => document.querySelector('#previewIframe').srcdoc);
  fs.writeFileSync('test_srcdoc.html', srcdoc);
  console.log('Saved to test_srcdoc.html');
  await browser.close();
})();
