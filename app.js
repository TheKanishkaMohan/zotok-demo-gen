/**
 * app.js — ZoTok Demo Hub
 * Loads brands.json and renders the two-column brand/journey browser.
 */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────
   *  State
   * ───────────────────────────────────────────────────────── */
  var _brands = [];
  var _activeBrandIdx = 0;

  /* ─────────────────────────────────────────────────────────
   *  Init
   * ───────────────────────────────────────────────────────── */
  function init() {
    loadBrands()
      .then(function (brands) {
        _brands = brands;
        if (!brands || !brands.length) {
          showError('No demo brands found.');
          return;
        }
        renderStats();
        renderBrandTabs();
        renderJourneyList(_activeBrandIdx);
      })
      .catch(function (err) {
        console.error('[DemoHub] Failed to load brands:', err);
        showError('Could not load demo data. Please refresh the page.');
      });
  }

  /* ─────────────────────────────────────────────────────────
   *  Data loading
   * ───────────────────────────────────────────────────────── */
  function loadBrands() {
    return fetch('brands.json')
      .then(function (res) {
        if (!res.ok) throw new Error('brands.json returned HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        return (data && data.brands) ? data.brands : [];
      });
  }

  /* ─────────────────────────────────────────────────────────
   *  Stats pills (left panel)
   * ───────────────────────────────────────────────────────── */
  function renderStats() {
    var statsRow = document.getElementById('statsRow');
    if (!statsRow) return;

    var totalBrands   = _brands.length;
    var totalJourneys = _brands.reduce(function (acc, b) {
      return acc + (b.journeys ? b.journeys.length : 0);
    }, 0);
    var enabledJourneys = _brands.reduce(function (acc, b) {
      return acc + (b.journeys ? b.journeys.filter(function (j) { return j.enabled !== false; }).length : 0);
    }, 0);

    statsRow.innerHTML =
      pill(totalBrands + (totalBrands === 1 ? ' Brand' : ' Brands')) +
      pill(enabledJourneys + ' Live Modules') +
      pill('Journey Demos');
  }

  function pill(text) {
    return '<div class="stat-pill">&#9679; ' + escHtml(text) + '</div>';
  }

  /* ─────────────────────────────────────────────────────────
   *  Brand tabs
   * ───────────────────────────────────────────────────────── */
  function renderBrandTabs() {
    var container = document.getElementById('brandTabs');
    if (!container) return;

    // Single brand → no tabs needed
    if (_brands.length <= 1) {
      container.style.display = 'none';
      return;
    }

    container.innerHTML = '';
    _brands.forEach(function (brand, idx) {
      var tab = document.createElement('button');
      tab.className = 'brand-tab' + (idx === _activeBrandIdx ? ' active' : '');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', idx === _activeBrandIdx ? 'true' : 'false');
      tab.setAttribute('id', 'tab-' + brand.id);
      tab.setAttribute('aria-controls', 'journeyList');

      // Logo thumbnail
      if (brand.logo) {
        var logoImg = document.createElement('img');
        logoImg.src = brand.logo;
        logoImg.alt = brand.name + ' logo';
        logoImg.className = 'brand-tab-logo';
        logoImg.onerror = function () { this.style.display = 'none'; };
        tab.appendChild(logoImg);
      }

      var nameSpan = document.createElement('span');
      nameSpan.textContent = brand.name;
      tab.appendChild(nameSpan);

      tab.addEventListener('click', function () {
        if (_activeBrandIdx === idx) return;
        _activeBrandIdx = idx;
        // Update tab states
        container.querySelectorAll('.brand-tab').forEach(function (t, i) {
          t.classList.toggle('active', i === idx);
          t.setAttribute('aria-selected', i === idx ? 'true' : 'false');
        });
        renderJourneyList(idx);
        updateSectionLabel(idx);
      });

      container.appendChild(tab);
    });
  }

  function updateSectionLabel(brandIdx) {
    var label = document.getElementById('sectionLabel');
    if (!label) return;
    var brand = _brands[brandIdx];
    if (brand) {
      label.textContent = 'Select a Module to Explore';
    }
  }

  /* ─────────────────────────────────────────────────────────
   *  Journey list
   * ───────────────────────────────────────────────────────── */
  function renderJourneyList(brandIdx) {
    var container = document.getElementById('journeyList');
    if (!container) return;

    var brand = _brands[brandIdx];
    if (!brand || !brand.journeys || !brand.journeys.length) {
      container.innerHTML = emptyState('No journeys found for this brand.');
      return;
    }

    // Fade out existing content
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.15s ease';

    setTimeout(function () {
      container.innerHTML = '';

      brand.journeys.forEach(function (journey, idx) {
        var item = buildJourneyItem(journey, idx, brand);
        container.appendChild(item);
      });

      // Fade in
      container.style.opacity = '1';
    }, 150);
  }

  function buildJourneyItem(journey, idx, brand) {
    var enabled   = journey.enabled !== false;
    var color     = journey.color || '#666';
    var num       = String(idx + 1).padStart(2, '0');
    var stepsText = (journey.steps || '?') + ' Step' + (journey.steps !== 1 ? 's' : '');

    // Build anchor element
    var a = document.createElement('a');
    a.className   = 'j-item' + (enabled ? '' : ' j-grey');
    a.href        = enabled ? (journey.url || '#') : '#';
    a.style.cssText = '--c:' + color + '; --delay:' + (idx * 40) + ';';
    a.setAttribute('role', 'listitem');
    a.setAttribute('aria-label', journey.title + ' — ' + stepsText);
    if (!enabled) {
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '-1');
    }

    // Prevent default for disabled items
    if (!enabled) {
      a.addEventListener('click', function (e) { e.preventDefault(); });
    }

    // ── Badge (left color strip) ──
    var badge = document.createElement('div');
    badge.className = 'j-badge';
    badge.innerHTML =
      '<div class="j-num">' + escHtml(num) + '</div>' +
      '<div class="j-emoji" aria-hidden="true">' + (journey.emoji || '📋') + '</div>';

    // ── Body (right content) ──
    var body = document.createElement('div');
    body.className = 'j-body';

    // Top row: title + step count
    var top = document.createElement('div');
    top.className = 'j-top';

    var title = document.createElement('div');
    title.className = 'j-title';
    title.textContent = journey.title || 'Journey';

    var steps = document.createElement('div');
    steps.className = 'j-steps';
    steps.textContent = stepsText;

    top.appendChild(title);
    top.appendChild(steps);

    // Description
    var desc = document.createElement('div');
    desc.className = 'j-desc';
    desc.textContent = journey.desc || '';

    // Tags
    var tags = document.createElement('div');
    tags.className = 'j-tags';
    (journey.tags || []).forEach(function (tag) {
      var t = document.createElement('span');
      t.className = 'j-tag';
      t.textContent = tag;
      tags.appendChild(t);
    });

    body.appendChild(top);
    body.appendChild(desc);
    body.appendChild(tags);

    a.appendChild(badge);
    a.appendChild(body);

    return a;
  }

  /* ─────────────────────────────────────────────────────────
   *  Error / empty states
   * ───────────────────────────────────────────────────────── */
  function showError(message) {
    var container = document.getElementById('journeyList');
    if (container) {
      container.innerHTML = emptyState(message, '⚠️');
    }
    var statsRow = document.getElementById('statsRow');
    if (statsRow) statsRow.innerHTML = '';
  }

  function emptyState(message, icon) {
    icon = icon || '📭';
    return '<div class="empty-state">' +
      '<span class="empty-icon" aria-hidden="true">' + icon + '</span>' +
      '<p>' + escHtml(message) + '</p>' +
      '</div>';
  }

  /* ─────────────────────────────────────────────────────────
   *  Utilities
   * ───────────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─────────────────────────────────────────────────────────
   *  Bootstrap
   * ───────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
