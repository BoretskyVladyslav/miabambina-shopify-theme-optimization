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

  function getDisplayCents(variant, format, variants) {
    if (!variant) return null;
    if (window.theme && theme.RentalPrice && typeof theme.RentalPrice.getDisplayCents === 'function') {
      return theme.RentalPrice.getDisplayCents(variant, variants);
    }
    if (format === 'rent') {
      var blob = [variant.sku, variant.option1, variant.title].join(' ');
      var match = String(blob).replace(/,/g, '').match(/\$(\d+(?:\.\d{1,2})?)/);
      if (match) return Math.round(parseFloat(match[1]) * 100);
    }
    return variant.price;
  }

  function formatMoney(cents) {
    if (window.theme && theme.RentalPrice && typeof theme.RentalPrice.formatMoneyWithCode === 'function') {
      return theme.RentalPrice.formatMoneyWithCode(cents);
    }
    if (window.theme && theme.Currency && typeof theme.Currency.formatMoney === 'function') {
      return theme.Currency.formatMoney(cents, theme.settings && theme.settings.moneyFormat);
    }
    var amount = Number(cents);
    if (!isFinite(amount)) amount = 0;
    return '$' + (amount / 100).toFixed(2);
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

  function getCurrentVariant(section) {
    var masterSelect = section.querySelector('[data-product-select]');
    var variants = getVariants(section);
    if (!masterSelect || !variants.length) return null;
    var currentId = masterSelect.value;
    for (var i = 0; i < variants.length; i++) {
      if (String(variants[i].id) === String(currentId)) {
        return variants[i];
      }
    }
    return null;
  }

  function resolveFormat(section, variant) {
    var picker = section.querySelector('[data-format-picker]');
    if (picker) {
      var selected = picker.querySelector('[data-format-select]:checked');
      if (selected) return selected.getAttribute('data-format-select');
    }
    var sizeInput = section.querySelector('[data-format-option] [data-variant-input]:checked');
    if (sizeInput) return classifyFormat(sizeInput.value);
    if (variant && window.theme && theme.RentalPrice && typeof theme.RentalPrice.isRentVariant === 'function' && theme.RentalPrice.isRentVariant(variant)) {
      return 'rent';
    }
    if (variant && variant.option1) return classifyFormat(variant.option1);
    return 'in-stock';
  }

  function syncRentalProperties(section, variant) {
    var wrap = section.querySelector('[data-rental-properties]');
    if (!wrap) return;
    var format = resolveFormat(section, variant);
    var isRentVariant = !!(
      format === 'rent' &&
      variant &&
      window.theme &&
      theme.RentalPrice &&
      typeof theme.RentalPrice.isRentVariant === 'function' &&
      theme.RentalPrice.isRentVariant(variant)
    );
    var inputs = wrap.querySelectorAll('[data-rental-prop]');
    for (var i = 0; i < inputs.length; i++) {
      if (isRentVariant) {
        inputs[i].removeAttribute('disabled');
      } else {
        inputs[i].setAttribute('disabled', 'disabled');
      }
    }
    if (!isRentVariant || !theme.RentalPrice) return;

    var variants = getVariants(section);
    var currencyCode = wrap.getAttribute('data-currency-code') || '';
    var feeInput = wrap.querySelector('[data-rental-prop="fee"]');
    var depositInput = wrap.querySelector('[data-rental-prop="deposit"]');
    var feeCents = theme.RentalPrice.getDisplayCents(variant, variants);
    var depositCents = theme.RentalPrice.getDepositCents(variant, variants);
    var formatFn = theme.RentalPrice.formatMoneyWithCode;
    if (feeInput && typeof formatFn === 'function') {
      feeInput.value = formatFn(feeCents, currencyCode);
    }
    if (depositInput && typeof formatFn === 'function') {
      depositInput.value = formatFn(depositCents, currencyCode);
    }
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
    var changed = !input.checked;
    if (changed) {
      input.checked = true;
    }
    if (dispatch || changed) {
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

  function toggleCustomSizeInfo(section) {
    var note = section.querySelector('[data-custom-size-info]');
    if (!note) return;
    var format = resolveFormat(section, getCurrentVariant(section));
    var sizeInput = section.querySelector('[data-format-option] [data-variant-input]:checked')
      || section.querySelector('[data-variant-input]:checked');
    var sizeVal = sizeInput ? String(sizeInput.value).toLowerCase() : '';
    var show = format === 'custom' && sizeVal.indexOf('custom size') !== -1;
    note.classList.toggle(HIDE, !show);
  }

  function updatePrice(section, variant, format) {
    var priceEl = section.querySelector('[data-product-price]');
    if (!priceEl || !variant) return;
    var variants = getVariants(section);
    var cents = (window.theme && theme.RentalPrice && typeof theme.RentalPrice.getDisplayCents === 'function')
      ? theme.RentalPrice.getDisplayCents(variant, variants)
      : getDisplayCents(variant, format, variants);
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
      var variant = detail.variant || getCurrentVariant(section);
      var format = resolveFormat(section, variant);
      syncRentalProperties(section, variant);
      requestAnimationFrame(function () {
        updatePrice(section, variant, format);
        toggleRentalInfo(section, format);
        toggleCustomSizeInfo(section);
        syncRentalProperties(section, variant);
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
    toggleCustomSizeInfo(section);
    selectSize(sizeWrap, format, false);

    var variant = getCurrentVariant(section);
    if (variant) {
      updatePrice(section, variant, format);
      syncRentalProperties(section, variant);
      toggleCustomSizeInfo(section);
    }

    picker.querySelectorAll('[data-format-select]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        var nextFormat = input.getAttribute('data-format-select');
        picker.setAttribute('data-current-format', nextFormat);
        filterSizes(sizeWrap, nextFormat);
        toggleRentalInfo(section, nextFormat);
        if (nextFormat !== 'rent') {
          syncRentalProperties(section, getCurrentVariant(section));
        }
        selectSize(sizeWrap, nextFormat, true);
        syncRentalProperties(section, getCurrentVariant(section));
        toggleCustomSizeInfo(section);
      });
    });
  }

  function bindRentalForms() {
    document.querySelectorAll('[data-rental-properties]').forEach(function (wrap) {
      var section = wrap.closest('[data-section-type="product"]');
      if (!section) return;
      bindSection(section);
      var variant = getCurrentVariant(section);
      syncRentalProperties(section, variant);
      toggleCustomSizeInfo(section);
    });
  }

  function init() {
    document.querySelectorAll('[data-format-picker]').forEach(bindPicker);
    bindRentalForms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('page:loaded', init);
  document.addEventListener('shopify:section:load', init);
})();
