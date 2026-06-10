const { test, expect } = require('@playwright/test');

test('Demo Generator Smoke Test', async ({ page }) => {
  // Go to the local server
  await page.goto('http://127.0.0.1:3000/');
  
  // Wait for the form to be ready
  await page.waitForSelector('#brandNameInput');
  
  // Step 1: Fill out the brand details
  await page.fill('#brandNameInput', 'TestCorp Auto');
  await page.selectOption('#industryInput', 'FMCG');
  
  // Click next to Step 2
  await page.click('#nextStepBtn');
  
  // Step 2: Ensure a product row exists, add a product name
  await page.waitForSelector('.product-name-input');
  await page.fill('.product-name-input', 'Test Product');
  
  // Click next to Step 3
  await page.click('#nextStepBtn');
  
  // Step 3 is reached. The default journey 'order_to_cash' is already selected.
  // Just wait for the steps container to render its checkboxes
  await page.waitForSelector('.step-checkbox-row');
  
  // Generate Demo
  await page.click('#generateBtn');
  // Wait for preview iframe to appear or an error to show
  await Promise.race([
    page.waitForSelector('#previewArea', { state: 'visible', timeout: 15000 }),
    page.waitForSelector('#wizardError:visible', { timeout: 15000 }).then(async () => {
      const errText = await page.locator('#wizardError').innerText();
      throw new Error('Wizard Error: ' + errText);
    })
  ]);
  
  // Check the iframe contents for the brand name to ensure it rendered
  const iframe = await page.locator('#previewIframe').elementHandle();
  const frame = await iframe.contentFrame();
  const content = await frame.content();
  
  expect(content).toContain('TestCorp Auto');
});
