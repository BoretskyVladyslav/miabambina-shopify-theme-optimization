(function () {
  if (window.__mbStripStaticPrices) return;
  window.__mbStripStaticPrices = true;

  var PRICE_RE = /\bprice\s*:?\s*\$\s*[\d,]+(?:\.\d{2})?(?:\s*[-–—]\s*\$?\s*[\d,]+(?:\.\d{2})?)?/gi;

  function stripText(str) {
    if (!str) return str;
    return String(str)
      .replace(PRICE_RE, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([.,;:])/g, '$1')
      .replace(/^[.,;:\s]+|[.,;:\s]+$/g, '')
      .trim();
  }

  function walk(node) {
    var child = node.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (child.nodeType === 3) {
        var nextText = stripText(child.nodeValue);
        if (nextText !== child.nodeValue) {
          if (nextText) {
            child.nodeValue = nextText;
          } else if (child.parentNode) {
            child.parentNode.removeChild(child);
          }
        }
      } else if (child.nodeType === 1) {
        walk(child);
      }
      child = next;
    }
  }

  function cleanEmpty(el) {
    el.querySelectorAll('p, span, strong, em, li, h1, h2, h3, h4, h5, h6').forEach(function (n) {
      if (!String(n.textContent || '').replace(/\s+/g, '') && n.parentNode) {
        n.parentNode.removeChild(n);
      }
    });
  }

  function sanitizeJsonLd() {
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (script) {
      var raw = script.textContent;
      if (!raw) return;
      try {
        var data = JSON.parse(raw);
        var nodes = Array.isArray(data) ? data : [data];
        var changed = false;
        nodes.forEach(function (node) {
          if (!node || node['@type'] !== 'Product' || typeof node.description !== 'string') return;
          var next = stripText(node.description);
          if (next !== node.description) {
            node.description = next;
            changed = true;
          }
        });
        if (changed) script.textContent = JSON.stringify(data);
      } catch (err) {}
    });
  }

  function run() {
    document.querySelectorAll('[data-sanitize-static-prices]').forEach(function (el) {
      walk(el);
      cleanEmpty(el);
    });
    sanitizeJsonLd();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  document.addEventListener('page:loaded', run);
})();
