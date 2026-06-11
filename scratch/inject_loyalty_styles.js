const fs = require('fs');

// Read the loyalty HTML
const htmlPath = '00_Template/journey_retailer_loyalty_invoice_collection.html';
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract the CSS starting from .phones-row to the end of the <style> block
const startIndex = html.indexOf('.phones-row{');
const endIndex = html.indexOf('</style>', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const customCss = '\n\n/* === RETAILER LOYALTY SPECIFIC CLASSES === */\n' + html.substring(startIndex, endIndex);

  // Read template-pack.json
  const packPath = 'template-pack.json';
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

  // Ensure we don't append it twice
  if (!pack.style.includes('/* === RETAILER LOYALTY SPECIFIC CLASSES === */')) {
    pack.style += customCss;
    fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), 'utf8');
    console.log('Successfully injected custom CSS into template-pack.json!');
  } else {
    console.log('CSS already injected.');
  }
} else {
  console.log('Could not find CSS markers.');
}
