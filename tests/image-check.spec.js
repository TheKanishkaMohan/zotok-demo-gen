const { test, expect } = require('@playwright/test');

test('Check images in Field Ops journey', async ({ page }) => {
  const failedRequests = [];
  page.on('requestfailed', request => {
    failedRequests.push(request.url());
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      failedRequests.push(response.status() + ': ' + response.url());
    }
  });

  await page.goto('http://127.0.0.1:3000/');
  await page.fill('#brandNameInput', 'TestCorp');
  await page.selectOption('#industryInput', 'FMCG');

  await page.click('#nextStepBtn');
  await page.waitForSelector('.product-name-input');
  await page.fill('.product-name-input', 'Test Product');

  await page.click('#nextStepBtn');
  await page.waitForSelector('#journeyCardsContainer');

  // Select Field Ops & Expenses card
  console.log('Selecting Field Ops & Expenses...');
  await page.click('.journey-card[data-journey="field_ops_expense"]');
  await page.waitForSelector('.step-checklist');


  await page.click('#generateBtn');
  await page.waitForSelector('#previewIframe');

  // Wait for load
  await page.waitForTimeout(3000);

  const iframeHandle = await page.locator('#previewIframe').elementHandle();
  const frame = await iframeHandle.contentFrame();

  console.log('Loading journey in preview hub...');
  await frame.evaluate(() => {
    if (typeof loadJourney === 'function') {
      loadJourney('field_ops_expense');
    } else {
      const card = document.querySelector('.hp-card');
      if (card) card.click();
    }
  });

  console.log('Waiting for jv-frame inside preview...');
  await frame.waitForSelector('#jv-frame', { state: 'visible' });
  const innerIframeHandle = await frame.locator('#jv-frame').elementHandle();
  const innerFrame = await innerIframeHandle.contentFrame();

  console.log('Extracting elements from inner frame...');
  const elementDetails = await innerFrame.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('.step-section')).map(sec => sec.id);
    const imgs = Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.getAttribute('src'),
      outerHTML: img.outerHTML
    }));
    return { sections, imgs };
  });

  console.log('--- SECTIONS FOUND ---');
  console.log(elementDetails.sections);
  console.log('--- IMAGES DETAIL ---');
  console.log(elementDetails.imgs);
  console.log('--- FAILED REQUESTS ---');
  console.log(failedRequests);

  expect(failedRequests.length).toBe(0);
});
