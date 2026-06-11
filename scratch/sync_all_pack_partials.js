const fs = require('fs');
const path = require('path');

const packPath = 'template-pack.json';
const templateDir = '00_Template';

const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

// We need to map journey types to their prefix in partials
const prefixMap = {
  'dt_fulfillment_payment': 'dt_fulfillment_payment',
  'field_ops_expense': 'field-ops',
  'automated_collections': 'collections',
  'campaigns_queries': 'campaigns_queries',
  'retailer_activation': 'retailer_activation',
  'order_to_cash': 'self-service',
  'retailer_loyalty': 'retailer_loyalty'
};

const htmlFiles = fs.readdirSync(templateDir).filter(f => f.endsWith('.html'));

console.log('Syncing all partials in template-pack.json from 00_Template...');
let changed = false;

for (const [jt, prefix] of Object.entries(prefixMap)) {
  // Find the HTML file for this journey
  let filename = `journey_${jt}.html`;
  if (jt === 'order_to_cash') {
    filename = 'order_to_cash_integrated.html';
  } else if (jt === 'retailer_loyalty') {
    filename = 'journey_retailer_loyalty_invoice_collection.html';
  }
  
  const filepath = path.join(templateDir, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`Skipping ${jt} (file not found: ${filepath})`);
    continue;
  }
  
  const html = fs.readFileSync(filepath, 'utf8');
  
  // Find all steps for this prefix in pack
  const stepKeys = Object.keys(pack.partials).filter(k => k.startsWith('step') && k.endsWith(prefix));
  
  stepKeys.forEach(key => {
    // Extract step number
    const match = key.match(/^step(\d+)-/);
    if (!match) return;
    const stepNum = match[1];
    
    // Find step div in HTML by finding the id attribute first
    const idTagDouble = `id="step-${stepNum}"`;
    const idTagSingle = `id='step-${stepNum}'`;
    let idIdx = html.indexOf(idTagDouble);
    if (idIdx === -1) {
      idIdx = html.indexOf(idTagSingle);
    }
    
    if (idIdx === -1) {
      console.warn(`[WARN] Could not find step-${stepNum} (id tag) in ${filename}`);
      return;
    }
    
    // Find the opening <div of this step section
    const startIdx = html.lastIndexOf('<div', idIdx);
    if (startIdx === -1) {
      console.warn(`[WARN] Could not find opening <div for step-${stepNum} in ${filename}`);
      return;
    }
    
    // Find end tag
    let endIdx = -1;
    
    // Method 1: Look for closing step comment like <!-- /step-X -->
    const endComment = `<!-- /step-${stepNum}`;
    const commentIdx = html.indexOf(endComment, idIdx);
    if (commentIdx !== -1) {
      const closingBracket = html.indexOf('-->', commentIdx);
      if (closingBracket !== -1) {
        endIdx = closingBracket + 3;
      }
    }
    
    // Method 2: Next step tag
    if (endIdx === -1) {
      const nextIdIdx = html.indexOf('id="step-', idIdx + 8);
      if (nextIdIdx !== -1) {
        const nextStartIdx = html.lastIndexOf('<div', nextIdIdx);
        if (nextStartIdx !== -1 && nextStartIdx > startIdx) {
          endIdx = nextStartIdx;
        }
      }
    }
    
    // Method 3: End of screens area
    if (endIdx === -1) {
      const closingIdx = html.indexOf('<!-- /screens-area -->', idIdx);
      if (closingIdx !== -1) {
        const lastDivIdx = html.lastIndexOf('</div>', closingIdx);
        if (lastDivIdx !== -1 && lastDivIdx > startIdx) {
          endIdx = lastDivIdx + 6; // Include the closing div
        }
      }
    }
    
    if (endIdx === -1) {
      console.warn(`[WARN] Could not find end of step-${stepNum} in ${filename}`);
      return;
    }
    
    // Extract the content
    const htmlStep = html.substring(startIdx, endIdx).trim();
    
    const oldPartial = pack.partials[key];
    if (oldPartial !== htmlStep) {
      pack.partials[key] = htmlStep;
      console.log(`- Updated ${key} (length: ${oldPartial ? oldPartial.length : 0} -> ${htmlStep.length})`);
      changed = true;
    }
  });
}

if (changed) {
  fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), 'utf8');
  console.log('Saved updated template-pack.json successfully!');
} else {
  console.log('All partials are already in sync.');
}
