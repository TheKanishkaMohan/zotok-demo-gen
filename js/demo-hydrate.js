/**
 * demo-hydrate.js
 * ═══════════════════════════════════════════════════════════
 * Runtime hydration script for static journey HTML files.
 *
 * Reads the demo configuration saved by the Create Your Demo
 * wizard (stored in localStorage as 'zotok.demoConfig') and
 * replaces all hardcoded placeholder product/store/category
 * slots in the page with the user's actual data.
 *
 * Add to every static journey file:
 *   <script src="../js/demo-hydrate.js"></script>
 * ═══════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  var CONFIG_KEY = 'zotok.demoConfig';

  /* ── Default fallback products (generic) ─────────────── */
  var DEFAULTS = {
    products: [
      { name: 'Product Alpha', category: 'Category A', price: 499, unit: 'piece' },
      { name: 'Product Beta',  category: 'Category A', price: 349, unit: 'piece' },
      { name: 'Product Gamma', category: 'Category B', price: 799, unit: 'piece' },
      { name: 'Product Delta', category: 'Category B', price: 249, unit: 'piece' },
      { name: 'Product Epsilon', category: 'Category C', price: 599, unit: 'piece' },
      { name: 'Product Zeta',  category: 'Category C', price: 199, unit: 'piece' }
    ],
    storeName:   'Sharma General Stores',
    brandName:   'Company Name',
    primaryColor:'#E8201E'
  };

  /* ── Load config from localStorage ───────────────────── */
  function loadConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        var cfg = JSON.parse(raw);
        if (cfg && cfg.products && cfg.products.length) return cfg;
      }
    } catch (e) {}
    return null;
  }

  /* ── Merge user config with defaults ─────────────────── */
  function resolveConfig(cfg) {
    var base = cfg || DEFAULTS;
    var products = (base.products && base.products.length) ? base.products : DEFAULTS.products;
    // Pad to at least 6 products using defaults
    var productsCopy = products.slice();
    while (productsCopy.length < 6) {
      productsCopy.push(DEFAULTS.products[productsCopy.length] || { name: 'Product ' + (productsCopy.length + 1), category: 'Products', price: 299, unit: 'piece' });
    }
    return {
      products:     productsCopy,
      storeName:    base.storeName || base.brandName || DEFAULTS.storeName,
      brandName:    base.brandName || DEFAULTS.brandName,
      primaryColor: base.primaryColor || DEFAULTS.primaryColor,
      categories:   getUniqueCategories(productsCopy)
    };
  }

  function getUniqueCategories(products) {
    var seen = {};
    var cats = [];
    products.forEach(function (p) {
      var c = p.category || 'Products';
      if (!seen[c]) { seen[c] = true; cats.push(c); }
    });
    return cats;
  }

  /* ── Core replacement: swap data-demo-* elements ──────── */
  function hydrate(cfg) {
    var p = cfg.products;
    var cats = cfg.categories;

    // ── [data-demo="product-N-name"] → p[N].name ─────────
    for (var i = 0; i < 9; i++) {
      var prod = p[i] || { name: 'Product ' + (i + 1), category: 'Products', price: 299, unit: 'piece' };
      replaceAll('[data-demo="product-' + i + '-name"]',    prod.name);
      replaceAll('[data-demo="product-' + i + '-cat"]',     prod.category || 'Products');
      replaceAll('[data-demo="product-' + i + '-price"]',   '₹' + prod.price);
      replaceAll('[data-demo="product-' + i + '-unit"]',    prod.unit || 'piece');
      replaceAll('[data-demo="product-' + (i+1) + '-name"]',prod.name);
      replaceAll('[data-demo="product-' + (i+1) + '-cat"]', prod.category || 'Products');
    }

    // ── [data-demo="cat-N"] → cats[N] ─────────────────────
    for (var j = 0; j < cats.length; j++) {
      replaceAll('[data-demo="cat-' + j + '"]', cats[j]);
    }

    // ── [data-demo="store-name"] → storeName ─────────────
    replaceAll('[data-demo="store-name"]', cfg.storeName);

    // ── [data-demo="brand-name"] → brandName ─────────────
    replaceAll('[data-demo="brand-name"]', cfg.brandName);

    // ── Inline text replacements (legacy hardcoded text) ──
    replaceInlineText(cfg);
  }

  function replaceAll(selector, text) {
    try {
      var els = document.querySelectorAll(selector);
      els.forEach(function (el) { el.textContent = text; });
    } catch (e) {}
  }

  /* ── replaceInlineText: walk hardcoded legacy slots ───── */
  function replaceInlineText(cfg) {
    var p = cfg.products;
    var cats = cfg.categories;

    // Map of exact old text → new text, for targeted text nodes
    var swaps = {};

    // Product names (the old cement/OPC names we hardcoded)
    var oldNames = [
      'OPC 53 Grade', 'PPC', 'OPC', 'JKSuper Protect PPC (50kg)',
      'Product Alpha 1kg', 'Product Beta 500g', 'Product Gamma 1kg'
    ];
    // Map old names to the first 3 user products
    for (var i = 0; i < Math.min(oldNames.length, p.length); i++) {
      swaps[oldNames[i]] = p[i] ? p[i].name : oldNames[i];
    }

    // Category tabs
    swaps['Product Category A'] = cats[0] || 'Category A';
    swaps['Product Category B'] = cats[1] || 'Category B';

    // Division names used in payment section
    swaps['Product Division A'] = cats[0] || 'Division A';
    swaps['Product Division B'] = cats[1] || 'Division B';

    // Product subcategory tags in catalog tabs
    swaps['Product Alpha 1kg']   = p[0] ? p[0].name : 'Product 1';
    swaps['Product Beta 500g']   = p[1] ? p[1].name : 'Product 2';
    swaps['Product Gamma 1kg']   = p[2] ? p[2].name : 'Product 3';
    swaps['Product Delta']       = p[3] ? p[3].name : 'Product 4';

    // Field Ops specific
    swaps['OPC 53 Grade']        = p[0] ? p[0].name : 'Product 1';

    // Sub-descriptions
    swaps['Premium Quality · Standard Grade'] = (p[0] && p[0].category) ? p[0].category + ' · Standard' : 'Standard Grade';
    swaps['Standard Quality · Value Pack']    = (p[1] && p[1].category) ? p[1].category + ' · Value'    : 'Value Pack';
    swaps['All Purpose · Multi-use']          = (p[2] && p[2].category) ? p[2].category + ' · Multi-use' : 'Multi-use';
    swaps['IS 269 Certified · OPC']           = (p[2] && p[2].category) ? p[2].category + ' · Certified' : 'Certified';

    // Store name replacements
    swaps['Sharma Trading Stores'] = cfg.storeName;
    swaps['Sharma General Stores'] = cfg.storeName;
    swaps['Ganesh General Stores'] = cfg.storeName;

    walkTextNodes(document.body, swaps);
  }

  /* ── Walk all text nodes and apply swaps ──────────────── */
  function walkTextNodes(node, swaps) {
    if (!node) return;
    if (node.nodeType === 3) { // Text node
      var txt = node.textContent;
      var changed = false;
      Object.keys(swaps).forEach(function (old) {
        if (txt.indexOf(old) !== -1) {
          txt = txt.split(old).join(swaps[old]);
          changed = true;
        }
      });
      if (changed) node.textContent = txt;
    } else if (node.childNodes) {
      // Skip script and style tags
      if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') return;
      node.childNodes.forEach(function (child) {
        walkTextNodes(child, swaps);
      });
    }
  }

  /* ── Also hydrate innerText of specific known containers ─ */
  function hydrateAttributes(cfg) {
    // Update any placeholder hrefs / aria-labels if needed
    // (reserved for future use)
  }

  /* ── Entry point ─────────────────────────────────────── */
  function init() {
    var rawCfg = loadConfig();
    var cfg = resolveConfig(rawCfg);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        hydrate(cfg);
        hydrateAttributes(cfg);
      });
    } else {
      hydrate(cfg);
      hydrateAttributes(cfg);
    }
  }

  init();

  // Expose for manual re-hydration (e.g. after dynamic content load)
  window.DemoHydrate = { reload: function () {
    var rawCfg = loadConfig();
    var cfg = resolveConfig(rawCfg);
    hydrate(cfg);
  }};

})();
