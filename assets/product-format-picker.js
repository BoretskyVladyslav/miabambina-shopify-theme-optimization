(function () {
  var HIDE = 'hide';

  function classifyFormat(value) {
    var v = String(value || '').toLowerCase();
    if (v.indexOf('rent') !== -1) return 'rent';
    if (v.indexOf('preorder') !== -1 || v.indexOf('pre-order') !== -1 || v.indexOf('custom') !== -1) {
      return 'custom';
    }
    return 'in-stock';
  }

  function getDisplayCents(variant, format) {
    if (!variant) return null;
    if (window.theme && theme.RentalPrice && typeof theme.RentalPrice.getDisplayCents === 'function') {
      return theme.RentalPrice.getDisplayCents(variant);
    }
    if (format === 'rent') {
      var blob = [variant.sku, variant.option1, variant.title].join(' ');
      var match = String(blob).replace(/,/g, '').match(/\$(\d+(?:\.\d{1,2})?)/);
      if (match) return Math.round(parseFloat(match[1]) * 100);
    }
    return variant.price;
  }

  function formatMoney(cents) {
    if (window.theme && theme.Currency && typeof theme.Currency.formatMoney === 'function') {
      return theme.Currency.formatMoney(cents, theme.settings && theme.settings.moneyFormat);
    }
    return String(cents);
  }

  function filterSizes(sizeWrap, format) {
    if (!sizeWrap) return;
    sizeWrap.querySelectorAll('.variant-input[data-format]').forEach(function (row) {
      if (row.getAttribute('data-format') === format) {
        row.classList.remove(HIDE);
      } else {
        row.classList.add(HIDE);
      }
    });
  }

  function pickSizeInput(sizeWrap, format) {
    if (!sizeWrap) return null;
    var rows = sizeWrap.querySelectorAll('.variant-input[data-format="' + format + '"]');
    var checked = sizeWrap.querySelector('[data-variant-input]:checked');
    if (checked && classifyFormat(checked.value) === format) {
      return checked;
    }
    var fallback = null;
    for (var i = 0; i < rows.length; i++) {
      var input = rows[i].querySelector('[data-variant-input]');
      if (!input) continue;
      if (!fallback) fallback = input;
      if (!input.classList.contains('disabled')) return input;
    }
    return fallback;
  }

  function selectSize(sizeWrap, format, dispatch) {
    var input = pickSizeInput(sizeWrap, format);
    if (!input) return;
    if (!input.checked) {
      input.checked = true;
    }
    if (dispatch) {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function toggleRentalInfo(section, format) {
    var info = section.querySelector('[data-rental-info]');
    if (!info) return;
    var isRent = format === 'rent';
    info.classList.toggle(HIDE, !isRent);
    if (isRent) {
      info.removeAttribute('hidden');
    } else {
      info.setAttribute('hidden', '');
    }
  }

  function getVariants(section) {
    var el = section.querySelector('[data-variant-json]');
    if (!el) return [];
    try {
      return JSON.parse(el.textContent);
    } catch (err) {
      return [];
    }
  }

  function updatePrice(section, variant, format) {
    var priceEl = section.querySelector('[data-product-price]');
    if (!priceEl || !variant) return;
    var cents = (window.theme && theme.RentalPrice && typeof theme.RentalPrice.getDisplayCents === 'function')
      ? theme.RentalPrice.getDisplayCents(variant, getVariants(section))
      : getDisplayCents(variant, format);
    if (cents == null) return;
    priceEl.innerHTML = formatMoney(cents);
  }

  function currentFormat(picker) {
    var selected = picker.querySelector('[data-format-select]:checked');
    if (selected) return selected.getAttribute('data-format-select');
    return picker.getAttribute('data-current-format') || 'in-stock';
  }

  function bindSection(section) {
    if (!section || section.dataset.formatPickerBound) return;
    section.dataset.formatPickerBound = 'true';

    section.addEventListener('variantChange', function (evt) {
      var detail = evt.detail || {};
      var variant = detail.variant;
      var sizeInput = section.querySelector('[data-format-option] [data-variant-input]:checked');
      var format = 'in-stock';
      if (sizeInput) {
        format = classifyFormat(sizeInput.value);
      } else if (variant && variant.option1) {
        format = classifyFormat(variant.option1);
      }
      requestAnimationFrame(function () {
        updatePrice(section, variant, format);
        toggleRentalInfo(section, format);
      });
    });
  }

  function bindPicker(picker) {
    if (!picker || picker.dataset.formatPickerReady) return;
    picker.dataset.formatPickerReady = 'true';

    var section = picker.closest('[data-section-type="product"]');
    if (!section) return;
    bindSection(section);

    var sizeWrap = section.querySelector('[data-format-option]');
    if (!sizeWrap) return;

    var format = currentFormat(picker);

    filterSizes(sizeWrap, format);
    toggleRentalInfo(section, format);
    selectSize(sizeWrap, format, false);

    var variantJson = section.querySelector('[data-variant-json]');
    var masterSelect = section.querySelector('[data-product-select]');
    if (variantJson && masterSelect) {
      try {
        var variants = JSON.parse(variantJson.textContent);
        var currentId = masterSelect.value;
        var variant = null;
        for (var i = 0; i < variants.length; i++) {
          if (String(variants[i].id) === String(currentId)) {
            variant = variants[i];
            break;
          }
        }
        if (variant) updatePrice(section, variant, format);
      } catch (err) {}
    }

    picker.querySelectorAll('[data-format-select]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        var nextFormat = input.getAttribute('data-format-select');
        picker.setAttribute('data-current-format', nextFormat);
        filterSizes(sizeWrap, nextFormat);
        toggleRentalInfo(section, nextFormat);
        selectSize(sizeWrap, nextFormat, true);
      });
    });
  }

  function init() {
    document.querySelectorAll('[data-format-picker]').forEach(bindPicker);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('page:loaded', init);
  document.addEventListener('shopify:section:load', init);
})();
