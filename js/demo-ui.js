/**
 * demo-ui.js — Wizard UI Controller for dynamic demo generation.
 * Exposes window.demoUI as a global singleton.
 */
(function(global) {
  'use strict';

  var _currentStep = 1;
  var _logoDataUrl = null;
  var _productRowCount = 0;
  var _selectedJourneys = ['order_to_cash'];
  var _templates = [];
  var _contentAdaptation = null;
  var MAX_GUIDELINE_IMAGE_SIZE = 1024 * 1024;
  var LAST_PREVIEW_KEY = 'zotok.demoGenerator.lastPreview';

  function isJourneySelected(journeyKey) {
    return _selectedJourneys.indexOf(journeyKey) !== -1;
  }

  function primarySelectedJourney() {
    return _selectedJourneys[0] || 'order_to_cash';
  }

  function getIndustryValue() {
    var runtimeIndustry = document.getElementById('runtimeIndustryInput');
    var wizardIndustry = document.getElementById('industryInput');
    var value = (wizardIndustry && wizardIndustry.value) || (runtimeIndustry && runtimeIndustry.value) || 'FMCG';
    if (wizardIndustry && !wizardIndustry.value) wizardIndustry.value = value;
    if (runtimeIndustry && !runtimeIndustry.value) runtimeIndustry.value = value;
    return value;
  }

  function getDefaultContentLabels() {
    if (window.DemoRenderer && typeof DemoRenderer.buildContent === 'function') {
      return DemoRenderer.buildContent({});
    }
    return {};
  }

  function getSelectedContentLabels() {
    if (_contentAdaptation && _contentAdaptation.acceptedLabels) {
      return _contentAdaptation.acceptedLabels;
    }
    return getDefaultContentLabels();
  }

  function setContentPanelVisible(visible) {
    var panel = document.getElementById('contentReviewPanel');
    if (panel) panel.style.display = visible ? 'block' : 'none';
  }

  function collapseContentDiff(message) {
    var list = document.getElementById('contentDiffList');
    if (list) {
      var count = _contentAdaptation ? Object.keys(_contentAdaptation.adaptationDiff || {}).length : 0;
      var changed = 0;
      if (_contentAdaptation && _contentAdaptation.adaptationDiff) {
        Object.keys(_contentAdaptation.adaptationDiff).forEach(function(key) {
          if (_contentAdaptation.adaptationDiff[key].changed) changed++;
        });
      }
      list.innerHTML = '<div style="padding:12px 0;color:#16a34a;font-weight:600">' +
        (message || ('\u2713 ' + changed + ' labels adapted and applied')) +
        '</div>';
    }
    // Hide the action buttons
    var btnRow = document.getElementById('contentDiffActions');
    if (btnRow) btnRow.style.display = 'none';
  }

  function renderContentDiff() {
    var list = document.getElementById('contentDiffList');
    if (!list) return;

    var adaptation = _contentAdaptation;
    if (!adaptation) {
      list.innerHTML = '<p class="muted">Click Adapt Content to generate label suggestions.</p>';
      setContentPanelVisible(false);
      return;
    }

    var diff = adaptation.adaptationDiff || {};
    var html = '';
    Object.keys(diff).forEach(function(key) {
      var row = diff[key];
      html += '<div class="content-diff-row" style="border-top:1px solid rgba(0,0,0,.08);padding:10px 0">';
      html += '<div><strong>' + key + '</strong></div>';
      html += '<div class="muted" style="font-size:12px">Original: ' + (row.original || '') + '</div>';
      html += '<div style="font-weight:600">Suggested: ' + (row.proposed || '') + '</div>';
      html += '<div class="muted" style="font-size:12px">' + (row.changed ? 'Changed' : 'No change') + '</div>';
      html += '</div>';
    });

    list.innerHTML = html || '<p class="muted">No labels were returned.</p>';
    setContentPanelVisible(true);
  }

  function updateAdaptButtonState(isBusy) {
    var btn = document.getElementById('adaptContentBtn');
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.textContent = isBusy ? 'Adapting...' : 'Adapt Content';
  }

  /* ── Step Navigation ──────────────────────────────────── */

  function showStep(n) {
    _currentStep = n;
    // Hide all steps
    var steps = document.querySelectorAll('.wizard-step');
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.remove('active');
    }
    // Show target step
    var target = document.getElementById('step' + n);
    if (target) target.classList.add('active');

    // Update step dots
    var dots = document.querySelectorAll('.step-dot');
    for (var j = 0; j < dots.length; j++) {
      dots[j].classList.remove('active', 'completed');
      if (j < n - 1) dots[j].classList.add('completed');
      if (j === n - 1) dots[j].classList.add('active');
    }

    // Show/hide nav buttons
    var prevBtn = document.getElementById('prevStepBtn');
    var nextBtn = document.getElementById('nextStepBtn');
    if (prevBtn) prevBtn.style.display = n > 1 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = n < 3 ? 'inline-block' : 'none';
  }

  function nextStep() {
    if (_currentStep === 1) {
      var brandName = document.getElementById('brandNameInput');
      if (!brandName || !brandName.value.trim()) {
        brandName && brandName.focus();
        showError('Please enter a brand name.');
        return;
      }
    }
    if (_currentStep === 2) {
      var rows = document.querySelectorAll('.product-row');
      var valid = true;
      for (var i = 0; i < rows.length; i++) {
        var nameInput = rows[i].querySelector('.product-name-input');
        if (!nameInput || !nameInput.value.trim()) {
          valid = false;
          break;
        }
      }
      if (!valid) {
        showError('Please fill in all product names.');
        return;
      }
    }
    clearError();
    if (_currentStep < 3) showStep(_currentStep + 1);
  }

  function prevStep() {
    clearError();
    if (_currentStep > 1) showStep(_currentStep - 1);
  }

  /* ── Error display ────────────────────────────────────── */

  function showError(msg) {
    var el = document.getElementById('wizardError');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
      // Scroll to top so user sees the error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function clearError() {
    var el = document.getElementById('wizardError');
    if (el) {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  /* ── Logo Upload ──────────────────────────────────────── */

  function handleLogoFileInput(input) {
    if (input.files && input.files[0]) {
      handleLogoFile(input.files[0]);
    }
  }

  function handleLogoFile(file) {
    if (!file) return;
    if (file.size > MAX_GUIDELINE_IMAGE_SIZE) {
      showError('Logo is larger than the 1 MB guideline. It may still work, but smaller images create faster previews and share links.');
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      _logoDataUrl = e.target.result;
      var preview = document.getElementById('logoPreview');
      if (preview) {
        preview.src = _logoDataUrl;
        preview.style.display = 'block';
      }
      var placeholder = document.getElementById('logoPlaceholder');
      if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  function setupLogoDropZone() {
    var dropZone = document.getElementById('logoDropZone');
    var fileInput = document.getElementById('logoFileInput');
    if (!dropZone || !fileInput) return;

    // Use inline onchange in HTML to ensure it works even before JS init
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-hover');
    });

    dropZone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-hover');
    });

    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-hover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleLogoFile(e.dataTransfer.files[0]);
      }
    });
  }

  /* ── Product Rows ──────────────────────────────────────── */

  function addProductRow(data) {
    var container = document.getElementById('productRowsContainer');
    if (!container) return;
    var count = container.querySelectorAll('.product-row').length;
    if (count >= 8) return;

    var dataUrl = (data && data.imageDataUrl) || '';
    var name = (data && data.name) || '';
    var price = (data && data.price) || '';
    var unit = (data && data.unit) || 'bag';

    _productRowCount++;
    var idx = _productRowCount;
    var row = document.createElement('div');
    row.className = 'product-row';
    row.setAttribute('data-row-id', idx);

    var thumbDiv = document.createElement('div');
    thumbDiv.className = 'product-thumb';
    if (dataUrl) {
      thumbDiv.innerHTML = '<img src="' + dataUrl + '" alt="Product">';
      thumbDiv.setAttribute('data-image-url', dataUrl);
    } else {
      thumbDiv.innerHTML = '<span class="product-thumb-placeholder">&#128247;</span>';
    }
    thumbDiv.addEventListener('click', function() {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.style.display = 'none';
      inp.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          handleProductImage(this.files[0], thumbDiv);
        }
      });
      document.body.appendChild(inp);
      inp.click();
      document.body.removeChild(inp);
    });

    var catInput = document.createElement('input');
    catInput.type = 'text';
    catInput.className = 'product-category-input';
    catInput.placeholder = 'Category';
    catInput.value = (data && data.category) || '';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'product-name-input';
    nameInput.placeholder = 'Product name';
    nameInput.value = name;

    var priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'product-price-input';
    priceInput.placeholder = 'Price';
    priceInput.min = '0';
    priceInput.value = price;

    var unitSelect = document.createElement('select');
    unitSelect.className = 'product-unit-select';
    var units = ['piece', 'bag', 'box', 'pack', 'kg', 'ltr'];
    for (var u = 0; u < units.length; u++) {
      var opt = document.createElement('option');
      opt.value = units[u];
      opt.textContent = units[u];
      if (units[u] === unit) opt.selected = true;
      unitSelect.appendChild(opt);
    }

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-sm btn-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Remove product';
    removeBtn.addEventListener('click', function() {
      removeProductRow(row);
    });

    row.appendChild(thumbDiv);
    row.appendChild(catInput);
    row.appendChild(nameInput);
    row.appendChild(priceInput);
    row.appendChild(unitSelect);
    row.appendChild(removeBtn);
    container.appendChild(row);

    updateAddProductButton();
    clearError();
  }

  function removeProductRow(rowEl) {
    var container = document.getElementById('productRowsContainer');
    if (!container) return;
    var count = container.querySelectorAll('.product-row').length;
    if (count <= 1) return; // min 1
    rowEl.remove();
    updateAddProductButton();
  }

  function updateAddProductButton() {
    var container = document.getElementById('productRowsContainer');
    var btn = document.getElementById('addProductBtn');
    if (!container || !btn) return;
    var count = container.querySelectorAll('.product-row').length;
    btn.style.display = count >= 8 ? 'none' : 'inline-block';
  }

  /* ── Product Image Upload ─────────────────────────────── */

  function handleProductImage(file, thumbEl) {
    if (!file) return;
    if (file.size > MAX_GUIDELINE_IMAGE_SIZE) {
      showError('Product image is larger than the 1 MB guideline. Smaller images keep generated demos and share links lighter.');
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      thumbEl.innerHTML = '<img src="' + e.target.result + '" alt="Product">';
      thumbEl.setAttribute('data-image-url', e.target.result);
    };
    reader.readAsDataURL(file);
  }

  /* ── Journey Cards ────────────────────────────────────── */

  function renderJourneyCards() {
    var container = document.getElementById('journeyCardsContainer');
    if (!container) return;
    container.innerHTML = '';

    var descriptions = (window.DemoRenderer && window.DemoRenderer.journeyDescriptions) || null;
    if (!descriptions) {
      container.innerHTML = '<p class="muted">Loading journeys...</p>';
      return;
    }

    for (var key in descriptions) {
      if (!descriptions.hasOwnProperty(key)) continue;
      // Skip "home" — it's always included as the default wrapper, not a selectable journey
      if (key === 'home') continue;
      var desc = descriptions[key];
      var card = document.createElement('div');
      card.className = 'journey-card';
      card.setAttribute('data-journey', key);
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', isJourneySelected(key) ? 'true' : 'false');
      if (desc.scaffold) card.classList.add('journey-card-wip');
      if (isJourneySelected(key)) card.classList.add('selected');

      var title = document.createElement('h4');
      title.textContent = desc.title || key;

      var meta = document.createElement('p');
      meta.className = 'journey-meta';
      meta.textContent = (desc.steps || '?') + ' steps';

      var descP = document.createElement('p');
      descP.className = 'journey-desc';
      descP.textContent = desc.desc || '';

      var selectedMark = document.createElement('span');
      selectedMark.className = 'journey-selected-mark';
      selectedMark.textContent = 'Selected';

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(descP);
      card.appendChild(selectedMark);

      if (desc.scaffold) {
        var badge = document.createElement('span');
        badge.className = 'scaffold-badge';
        badge.textContent = 'Work in progress';
        card.appendChild(badge);
      }

      (function(journeyKey, cardEl) {
        cardEl.addEventListener('click', function() {
          var idx = _selectedJourneys.indexOf(journeyKey);
          if (idx === -1) {
            _selectedJourneys.push(journeyKey);
            cardEl.classList.add('selected');
            cardEl.setAttribute('aria-checked', 'true');
          } else {
            _selectedJourneys.splice(idx, 1);
            cardEl.classList.remove('selected');
            cardEl.setAttribute('aria-checked', 'false');
          }
          updateStepSelection();
        });
      })(key, card);

      container.appendChild(card);
    }
  }

  /* ── Step Selection ──────────────────────────────────── */

  function updateStepSelection() {
    var panel = document.getElementById('stepSelectionPanel');
    var items = document.getElementById('stepChecklistItems');
    if (!panel || !items) return;

    var journeyKey = primarySelectedJourney();
    if (!journeyKey) {
      panel.style.display = 'none';
      return;
    }

    var descs = (window.DemoRenderer && window.DemoRenderer.journeyDescriptions) || {};
    var desc = descs[journeyKey];
    if (!desc || !desc.steps || desc.steps <= 1) {
      panel.style.display = 'none';
      window.selectedSteps = null;
      return;
    }

    items.innerHTML = '';
    var steps = window.DemoRenderer && window.DemoRenderer.getJourneySteps
      ? window.DemoRenderer.getJourneySteps(journeyKey)
      : null;
    for (var i = 1; i <= desc.steps; i++) {
      var label = document.createElement('label');
      label.className = 'step-checkbox-row';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = i;
      cb.checked = true;
      cb.onchange = onStepToggle;
      var badge = document.createElement('span');
      badge.className = 'step-num-badge';
      badge.textContent = i;
      var lbl = document.createElement('span');
      lbl.className = 'step-label';
      // Use step title from journey data if available, fall back to "Step N"
      var stepTitle = (steps && steps[i - 1] && steps[i - 1].title) || null;
      lbl.textContent = stepTitle || 'Step ' + i;
      // Add a subtitle line for meta
      var stepMeta = (steps && steps[i - 1] && steps[i - 1].meta) || null;
      label.appendChild(cb);
      label.appendChild(badge);
      var textWrap = document.createElement('span');
      textWrap.className = 'step-text-wrap';
      var titleSpan = document.createElement('span');
      titleSpan.className = 'step-title';
      titleSpan.textContent = lbl.textContent;
      textWrap.appendChild(titleSpan);
      if (stepMeta) {
        var metaSpan = document.createElement('span');
        metaSpan.className = 'step-meta';
        metaSpan.textContent = stepMeta;
        textWrap.appendChild(metaSpan);
      }
      label.appendChild(textWrap);
      items.appendChild(label);
    }

    panel.style.display = 'block';
    window.selectedSteps = null; // null = all steps
  }

  function toggleAllSteps(checked) {
    var checkboxes = document.querySelectorAll('#stepChecklistItems input[type="checkbox"]');
    checkboxes.forEach(function(cb) { cb.checked = checked; });
    onStepToggle();
  }

  function onStepToggle() {
    var checkboxes = document.querySelectorAll('#stepChecklistItems input[type="checkbox"]');
    var checked = [];
    checkboxes.forEach(function(cb) {
      if (cb.checked) checked.push(parseInt(cb.value));
    });
    window.selectedSteps = (checked.length === checkboxes.length) ? null : checked;
    var generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.disabled = (checked.length === 0);
  }

  /* ── Collect Form Data ─────────────────────────────────── */

  function collectFormData() {
    var brandName = (document.getElementById('brandNameInput') || {}).value || '';
    var industry = getIndustryValue();
    var primaryColor = (document.getElementById('primaryColorInput') || {}).value || '#075e54';
    var secondaryColor = (document.getElementById('secondaryColorInput') || {}).value || '#064e46';
    var logoDataUrl = _logoDataUrl;

    var productRows = document.querySelectorAll('.product-row');
    var products = [];
    for (var i = 0; i < productRows.length; i++) {
      var row = productRows[i];
      var catInput = row.querySelector('.product-category-input');
      var nameInput = row.querySelector('.product-name-input');
      var priceInput = row.querySelector('.product-price-input');
      var unitSelect = row.querySelector('.product-unit-select');
      var thumbEl = row.querySelector('.product-thumb');

      var pCat = (catInput && catInput.value.trim()) || 'All';
      var pName = (nameInput && nameInput.value.trim()) || '';
      var pPrice = parseFloat((priceInput && priceInput.value) || '0');
      var pUnit = (unitSelect && unitSelect.value) || 'piece';
      var pImage = (thumbEl && thumbEl.getAttribute('data-image-url')) || '';

      if (pName) {
        products.push({
          name: pName,
          price: pPrice,
          unit: pUnit,
          imageDataUrl: pImage || (window.DemoRenderer ? DemoRenderer.generatePlaceholderImage(pName, primaryColor) : ''),
          category: pCat
        });
      }
    }

    return {
      brandName: brandName,
      industry: industry,
      primaryColor: primaryColor,
      secondaryColor: secondaryColor,
      logoDataUrl: logoDataUrl,
      products: products,
      journeyType: primarySelectedJourney(),
      journeyTypes: _selectedJourneys.slice()
    };
  }

  function saveLastPreview(result, fallbackBrandName) {
    if (!global.localStorage || !result || !result.html) return;
    var payload = {
      html: result.html,
      brandName: result.brand ? result.brand.name || fallbackBrandName : fallbackBrandName,
      journeyType: result.journeyType || primarySelectedJourney(),
      journeyTypes: _selectedJourneys.slice(),
      journeyTitle: result.journeyTitle || '',
      savedAt: new Date().toISOString()
    };
    try {
      global.localStorage.setItem(LAST_PREVIEW_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[demo-ui] Could not persist generated preview:', err);
    }
  }

  function restoreLastPreview() {
    if (!global.localStorage) return;
    var raw = null;
    try {
      raw = global.localStorage.getItem(LAST_PREVIEW_KEY);
    } catch (err) {
      return;
    }
    if (!raw) return;

    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (err2) {
      return;
    }
    if (!payload || !payload.html) return;

    var iframe = document.getElementById('previewIframe');
    var previewArea = document.getElementById('previewArea');
    var previewTitle = document.getElementById('previewTitle');

    window._generatedHtml = payload.html;
    window._generatedBrand = payload.brandName || 'Demo';
    _selectedJourneys = Array.isArray(payload.journeyTypes) && payload.journeyTypes.length
      ? payload.journeyTypes
      : [payload.journeyType || primarySelectedJourney()];

    if (iframe) iframe.srcdoc = payload.html;
    if (previewArea) previewArea.style.display = 'block';
    if (previewTitle) {
      previewTitle.textContent = payload.journeyTitle ? 'Preview - ' + payload.journeyTitle : 'Preview';
    }
  }

  /* ── Template Loading ─────────────────────────────────────── */

  function loadTemplates() {
    var select = document.getElementById('templateSelect');
    if (!select) return;

    fetch('brands.json?v=' + Date.now())
      .then(function(res) {
        if (!res.ok) throw new Error('brands.json returned HTTP ' + res.status);
        return res.json();
      })
      .then(function(data) {
        if (data && data.brands) {
          _templates = data.brands;
          _templates.forEach(function(brand) {
            var option = document.createElement('option');
            option.value = brand.id;
            option.textContent = brand.name;
            select.appendChild(option);
          });
        }
      })
      .catch(function(err) {
        console.error('Failed to load templates:', err);
      });
  }

  function applyTemplate(templateId) {
    if (!templateId) return;
    var template = _templates.find(function(t) { return t.id === templateId; });
    if (!template) return;

    // Fill Brand Details
    var nameInput = document.getElementById('brandNameInput');
    if (nameInput) nameInput.value = template.name || '';
    
    var indInput = document.getElementById('industryInput');
    // Try to guess industry if not provided, Haldiram's is FMCG
    if (indInput) indInput.value = template.industry || 'FMCG';

    var primColor = document.getElementById('primaryColorInput');
    if (primColor && template.color) primColor.value = template.color;

    var secColor = document.getElementById('secondaryColorInput');
    if (secColor && template.colorDark) secColor.value = template.colorDark;

    // Load logo if present
    if (template.logo) {
      fetch(template.logo)
        .then(function(res) { return res.blob(); })
        .then(function(blob) {
          // Convert to data url for generating
          var reader = new FileReader();
          reader.onload = function(e) {
            var img = document.getElementById('logoPreview');
            var placeholder = document.getElementById('logoPlaceholder');
            if (img && placeholder) {
              img.src = e.target.result;
              img.style.display = 'block';
              placeholder.style.display = 'none';
            }
          };
          reader.readAsDataURL(blob);
        })
        .catch(function(err) {
          console.error('Could not load template logo', err);
        });
    }

    // Pre-select journeys
    if (template.journeys && template.journeys.length > 0) {
      _selectedJourneys = template.journeys
        .filter(function(j) { return j.enabled !== false; })
        .map(function(j) { return j.id; });
      renderJourneyCards();
      updateStepSelection();
    }
  }

  /* ── Generate ─────────────────────────────────────────── */

  function generate() {
    clearError();
    var progressEl = document.getElementById('progressBar');
    var progressFill = document.getElementById('progressFill');
    var previewArea = document.getElementById('previewArea');

    if (!window.DemoRenderer) {
      showError('DemoRenderer not loaded. Please refresh the page.');
      return;
    }

    var formData = collectFormData();
    if (!formData.brandName) {
      showError('Brand name is required.');
      return;
    }
    if (formData.products.length === 0) {
      showError('At least one product is required.');
      return;
    }
    if (formData.journeyTypes.length === 0) {
      showError('Select at least one journey.');
      return;
    }

    // Save demo configuration for static hydration
    try {
      if (global.localStorage) {
        var configPayload = {
          products: formData.products,
          brandName: formData.brandName,
          primaryColor: formData.primaryColor,
          storeName: formData.brandName + ' Store'
        };
        global.localStorage.setItem('zotok.demoConfig', JSON.stringify(configPayload));
      }
    } catch (e) {
      console.warn('[demo-ui] Could not persist zotok.demoConfig:', e);
    }

    // Show progress
    if (progressEl) progressEl.style.display = 'block';
    if (progressFill) progressFill.style.width = '30%';

    var userInput;
    try {
      // Map form data to DemoRenderer.render() input format
      userInput = {
        name: formData.brandName,
        industry: formData.industry,
        brandColor: formData.primaryColor,
        brandColorDark: formData.secondaryColor,
        logo: formData.logoDataUrl || null,
        products: formData.products,
        journeyType: formData.journeyType,
        journeyTypes: formData.journeyTypes.length > 1 ? formData.journeyTypes : undefined,
        acceptedLabels: getSelectedContentLabels()
      };
    } catch (e) {
      if (progressEl) progressEl.style.display = 'none';
      showError('Failed to prepare demo data: ' + e.message);
      return;
    }

    // Add step selection if user has selected specific steps
    if (window.selectedSteps) {
      userInput.selectedSteps = window.selectedSteps;
    }

    if (progressFill) progressFill.style.width = '60%';

    // Always use renderMultiJourney — it wraps output in a hub page regardless of count
    DemoRenderer.renderMultiJourney(userInput)
      .then(function(result) {
        if (progressFill) progressFill.style.width = '100%';
        setTimeout(function() {
          if (progressEl) progressEl.style.display = 'none';
        }, 500);

        // Write to iframe
        var iframe = document.getElementById('previewIframe');
        if (iframe) {
          // Use srcdoc for better script isolation and execution
          iframe.srcdoc = result.html;
        }

        // Show preview area
        if (previewArea) previewArea.style.display = 'block';

        // Store generated HTML for later use
        window._generatedHtml = result.html;
        window._generatedBrand = result.brand ? result.brand.name || formData.brandName : formData.brandName;
        saveLastPreview(result, formData.brandName);
      })
      .catch(function(err) {
        if (progressEl) progressEl.style.display = 'none';
        showError('Generation failed: ' + (err.message || err));
        console.error('[demo-ui] Generation error:', err);
      });
  }

  /* ── Share Link Helpers ───────────────────────────────── */

  function getGeneratedHtml() {
    var html = window._generatedHtml || '';
    var iframe = document.getElementById('previewIframe');
    if (!html && iframe && iframe.srcdoc) {
      html = iframe.srcdoc;
    } else if (!html && iframe) {
      var doc = iframe.contentDocument || iframe.contentWindow.document;
      html = doc.documentElement.outerHTML;
    }
    return html;
  }

  function setShareStatus(message, isError) {
    var el = document.getElementById('shareStatus');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('error', !!isError);
    el.style.display = message ? 'block' : 'none';
  }

  function copyShareUrl(url) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return Promise.resolve(false);
    }
    return navigator.clipboard.writeText(url)
      .then(function() { return true; })
      .catch(function() { return false; });
  }

  function shrinkImage(dataUrl, maxW, maxH) {
    if (typeof Promise === 'undefined') {
      return {
        then: function(cb) { cb(dataUrl); }
      };
    }
    return new Promise(function(resolve) {
      if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.indexOf('data:image/') !== 0) {
        resolve(dataUrl);
        return;
      }
      // Don't shrink SVGs or very small strings
      if (dataUrl.indexOf('image/svg+xml') !== -1 || dataUrl.length < 5000) {
        resolve(dataUrl);
        return;
      }
      var img = new Image();
      img.onload = function() {
        var w = img.width;
        var h = img.height;
        if (w <= maxW && h <= maxH) {
          resolve(dataUrl);
          return;
        }
        var ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // compress as JPEG with 0.7 quality
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = function() {
        resolve(dataUrl);
      };
      img.src = dataUrl;
    });
  }

  function shortenUrl(longUrl) {
    if (typeof fetch === 'undefined') {
      return Promise.resolve(longUrl);
    }
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 6000) : null;
    
    return fetch('https://www.lejumo.com/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: longUrl }),
      signal: controller ? controller.signal : undefined
    })
    .then(function(res) {
      if (timeoutId) clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Shortener returned status ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (data && data.short) {
        return data.short;
      }
      return longUrl;
    })
    .catch(function(err) {
      if (timeoutId) clearTimeout(timeoutId);
      console.warn('Lejumo shortening failed, trying CleanURI...', err);
      
      var controller2 = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timeoutId2 = controller2 ? setTimeout(function() { controller2.abort(); }, 6000) : null;
      
      return fetch('https://cleanuri.com/api/v1/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'url=' + encodeURIComponent(longUrl),
        signal: controller2 ? controller2.signal : undefined
      })
      .then(function(res2) {
        if (timeoutId2) clearTimeout(timeoutId2);
        if (!res2.ok) throw new Error('CleanURI returned status ' + res2.status);
        return res2.json();
      })
      .then(function(data2) {
        if (data2 && data2.result_url) {
          return data2.result_url;
        }
        return longUrl;
      })
      .catch(function(err2) {
        if (timeoutId2) clearTimeout(timeoutId2);
        console.warn('CleanURI shortening failed, returning original URL', err2);
        return longUrl;
      });
    });
  }

  /* ── GitHub Settings & Integration ─────────────────────── */
  var GH_SETTINGS_KEY = 'zotok.githubSettings';

  function getGitHubSettings() {
    try {
      var raw = global.localStorage.getItem(GH_SETTINGS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn('[demo-ui] Failed to load GitHub settings:', e);
    }
    return {
      pat: '',
      owner: 'TheKanishkaMohan',
      repo: 'zotok-demo-gen',
      branch: 'main'
    };
  }

  function openSettingsModal() {
    var modal = document.getElementById('settingsModal');
    if (!modal) return;
    
    var settings = getGitHubSettings();
    var patInput = document.getElementById('ghPatInput');
    var ownerInput = document.getElementById('ghOwnerInput');
    var repoInput = document.getElementById('ghRepoInput');
    var branchInput = document.getElementById('ghBranchInput');

    if (patInput) patInput.value = settings.pat || '';
    if (ownerInput) ownerInput.value = settings.owner || 'TheKanishkaMohan';
    if (repoInput) repoInput.value = settings.repo || 'zotok-demo-gen';
    if (branchInput) branchInput.value = settings.branch || 'main';

    modal.style.display = 'flex';
  }

  function closeSettingsModal() {
    var modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';
  }

  function saveSettings() {
    var pat = (document.getElementById('ghPatInput') || {}).value || '';
    var owner = (document.getElementById('ghOwnerInput') || {}).value || '';
    var repo = (document.getElementById('ghRepoInput') || {}).value || '';
    var branch = (document.getElementById('ghBranchInput') || {}).value || 'main';

    if (!pat.trim() || !owner.trim() || !repo.trim()) {
      alert('PAT, Owner, and Repository Name are required.');
      return;
    }

    var settings = {
      pat: pat.trim(),
      owner: owner.trim(),
      repo: repo.trim(),
      branch: branch.trim()
    };

    try {
      global.localStorage.setItem(GH_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('[demo-ui] Failed to save GitHub settings:', e);
    }

    closeSettingsModal();
  }

  function saveDemoToGitHub(config) {
    var settings = getGitHubSettings();
    if (!settings.pat) {
      openSettingsModal();
      return Promise.reject(new Error('GitHub Personal Access Token is required to create a share link. Please configure settings and try again.'));
    }

    // Generate unique ID
    var cleanBrand = (config.name || 'brand').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    var rand = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    var id = 'demo-' + (cleanBrand || 'brand') + '-' + rand;
    var filename = id + '.json';
    var path = 'demos/' + filename;

    var jsonStr = JSON.stringify(config);
    var b64Content = btoa(unescape(encodeURIComponent(jsonStr)));

    var url = 'https://api.github.com/repos/' + settings.owner + '/' + settings.repo + '/contents/' + path;

    return fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + settings.pat,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Add demo: ' + (config.name || 'Brand'),
        content: b64Content,
        branch: settings.branch
      })
    })
    .then(function(res) {
      if (!res.ok) {
        return res.json().then(function(errData) {
          throw new Error(errData.message || 'GitHub API returned status ' + res.status);
        });
      }
      var baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
      return baseUrl + 'preview.html#/id/' + id;
    });
  }

  function createShareLink() {
    clearError();
    var html = getGeneratedHtml();
    if (!html || html.indexOf('<html') === -1) {
      showError('No demo generated yet.');
      return;
    }

    var btn = document.getElementById('createShareLinkBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Creating...';
    }
    setShareStatus('Creating secure share link...', false);

    var formData = collectFormData();
    
    var logoPromise = shrinkImage(formData.logoDataUrl, 120, 120);
    var productPromises = formData.products.map(function(p) {
      return shrinkImage(p.imageDataUrl, 120, 120).then(function(shrunkUrl) {
        return {
          name: p.name,
          price: p.price,
          unit: p.unit,
          imageDataUrl: shrunkUrl,
          category: p.category
        };
      });
    });

    Promise.all([logoPromise, Promise.all(productPromises)])
      .then(function(results) {
        var shrunkLogo = results[0];
        var shrunkProducts = results[1];

        var config = {
          name: formData.brandName,
          industry: formData.industry,
          brandColor: formData.primaryColor,
          brandColorDark: formData.secondaryColor,
          logo: shrunkLogo || null,
          products: shrunkProducts,
          journeyType: formData.journeyType,
          journeyTypes: formData.journeyTypes
        };

        if (window.selectedSteps) {
          config.selectedSteps = window.selectedSteps;
        }

        var acceptedLabels = getSelectedContentLabels();
        if (acceptedLabels && Object.keys(acceptedLabels).length > 0) {
          config.acceptedLabels = acceptedLabels;
        }

        setShareStatus('Saving demo config to GitHub...', false);
        return saveDemoToGitHub(config).then(function(shareUrl) {
          setShareStatus('Shortening share link...', false);
          return shortenUrl(shareUrl).catch(function() {
            return shareUrl;
          });
        });
      })
      .then(function(finalUrl) {
        window._generatedShareUrl = finalUrl;
        window.open(finalUrl, '_blank');
        
        return copyShareUrl(finalUrl).then(function(copied) {
          setShareStatus('Share link ' + (copied ? 'copied and ' : '') + 'opened in a new tab.', false);
        });
      })
      .catch(function(err) {
        showError('Could not create share link: ' + err.message);
        setShareStatus('Failed to create link.', true);
      })
      .then(function() {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Create Share Link';
        }
      });
  }

  function adaptContent() {
    clearError();
    if (!window.DemoRenderer) {
      showError('DemoRenderer not loaded. Please refresh the page.');
      return Promise.resolve(null);
    }

    var formData = collectFormData();
    var labels = getDefaultContentLabels();
    var payload = {
      industry: formData.industry,
      brandName: formData.brandName,
      journeyType: formData.journeyType,
      products: formData.products.map(function(p) { return p.name; }),
      labels: labels
    };

    updateAdaptButtonState(true);

    return fetch('/api/experiments/adapt-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(res) {
        var ct = res.headers.get('content-type') || '';
        if (ct.indexOf('application/json') !== -1) {
          return res.json().then(function(data) {
            if (!res.ok) {
              var err = new Error(data.error || 'Could not adapt content.');
              err.status = res.status;
              throw err;
            }
            return data;
          });
        }
        return res.text().then(function(text) {
          throw new Error('Server error (' + res.status + '): ' + (text.substring(0, 200) || res.statusText));
        });
      })
      .then(function(data) {
        _contentAdaptation = {
          industry: formData.industry,
          brandName: formData.brandName,
          originalLabels: labels,
          acceptedLabels: data.acceptedLabels || labels,
          adaptationDiff: data.adaptationDiff || {},
          provider: data.provider || 'OpenCode',
          model: data.model || 'deepseek-v4-flash'
        };
        renderContentDiff();
        return _contentAdaptation;
      })
      .catch(function(err) {
        _contentAdaptation = {
          industry: formData.industry,
          brandName: formData.brandName,
          originalLabels: labels,
          acceptedLabels: labels,
          adaptationDiff: {},
          provider: 'fallback',
          model: 'original'
        };
        renderContentDiff();
        showError(err.message || 'Could not adapt content.');
        return _contentAdaptation;
      })
      .finally(function() {
        updateAdaptButtonState(false);
      });
  }

  // Accept / Reset / Save content review actions
  function acceptContent() {
    if (!_contentAdaptation) {
      adaptContent();
      return;
    }
    _contentAdaptation.acceptedLabels = {};
    for (var key in _contentAdaptation.adaptationDiff) {
      if (_contentAdaptation.adaptationDiff.hasOwnProperty(key)) {
        _contentAdaptation.acceptedLabels[key] = _contentAdaptation.adaptationDiff[key].proposed || _contentAdaptation.originalLabels[key];
      }
    }
    collapseContentDiff('\u2713 ' + Object.keys(_contentAdaptation.acceptedLabels).length + ' labels accepted and applied');
    generate();
  }

  function resetContent() {
    if (!_contentAdaptation) return;
    _contentAdaptation.acceptedLabels = Object.assign({}, _contentAdaptation.originalLabels);
    // Re-show action buttons
    var btnRow = document.getElementById('contentDiffActions');
    if (btnRow) btnRow.style.display = 'flex';
    renderContentDiff();
    generate();
  }

  function saveContent() {
    clearError();
    if (!_contentAdaptation) {
      showError('Adapt content first.');
      return Promise.resolve(null);
    }
    var sessionId = global._activeSessionId || window._activeSessionId || '';
    if (!sessionId) {
      showError('No active session is available yet. Save requires a runtime session.');
      return Promise.resolve(null);
    }

    return fetch('/api/experiments/save-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        industry: _contentAdaptation.industry,
        acceptedLabels: _contentAdaptation.acceptedLabels,
        adaptationDiff: _contentAdaptation.adaptationDiff
      })
    })
      .then(function(res) {
        var ct = res.headers.get('content-type') || '';
        if (ct.indexOf('application/json') !== -1) {
          return res.json().then(function(data) {
            if (!res.ok) {
              var err = new Error(data.error || 'Could not save content.');
              err.status = res.status;
              throw err;
            }
            return data;
          });
        }
        return res.text().then(function(text) {
          throw new Error('Server error (' + res.status + '): ' + (text.substring(0, 200) || res.statusText));
        });
      })
      .then(function(data) {
        setShareStatus('Content saved to ' + (data.savedAs || 'session override'), false);
        collapseContentDiff('\u2713 Content saved and applied to demo');
        return data;
      })
      .catch(function(err) {
        showError(err.message || 'Could not save content.');
        return null;
      });
  }

  /* ── Download ─────────────────────────────────────────── */

  function download() {
    var html = getGeneratedHtml();
    if (!html) {
      showError('No demo generated yet.');
      return;
    }
    var brandName = window._generatedBrand || 'demo';
    var filename = brandName.replace(/[^a-zA-Z0-9]/g, '_') + '_demo.html';
    if (window.DemoRenderer) {
      DemoRenderer.downloadHtml(html, filename);
    } else {
      // Fallback
      var blob = new Blob([html], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /* ── Initialize ───────────────────────────────────────── */

  function init() {
    setupLogoDropZone();
    loadTemplates();
    getIndustryValue();
    addProductRow();
    renderJourneyCards();
    restoreLastPreview();
    renderContentDiff();
    renderJourneyCards();
    updateStepSelection();
    showStep(1);
  }

  /* ── Public API ────────────────────────────────────────── */

  var demoUI = {
    init: init,
    nextStep: nextStep,
    prevStep: prevStep,
    addProductRow: addProductRow,
    removeProductRow: removeProductRow,
    handleLogoFile: handleLogoFile,
    renderJourneyCards: renderJourneyCards,
    generate: generate,
    applyTemplate: applyTemplate,
    handleLogoFileInput: handleLogoFileInput,
    createShareLink: createShareLink,
    adaptContent: adaptContent,
    acceptContent: acceptContent,
    resetContent: resetContent,
    saveContent: saveContent,
    restoreLastPreview: restoreLastPreview,
    openInNewTab: createShareLink,
    download: download,
    updateStepSelection: updateStepSelection,
    toggleAllSteps: toggleAllSteps,
    onStepToggle: onStepToggle,
    openSettingsModal: openSettingsModal,
    closeSettingsModal: closeSettingsModal,
    saveSettings: saveSettings
  };

  global.demoUI = demoUI;

})(typeof window !== 'undefined' ? window : this);

