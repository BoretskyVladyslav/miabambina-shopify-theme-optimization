(function () {
  if (window.__mbStripStaticPrices) return;
  window.__mbStripStaticPrices = true;

  var PRICE = /(?:\s*[–—\-]\s*)?(?:price|rental\s*(?:fee|price)?|purchase\s*price)\s*:?\s*\$[\d,]+(?:\.\d{1,2})?(?:\s*[-–—]\s*\$?[\d,]+(?:\.\d{1,2})?)?/gi;

  function cleanText(text) {
    return String(text)
      .replace(PRICE, '')
      .replace(/[ \t]+$/g, '')
      .replace(/[ \t]{2,}/g, ' ');
  }

  function stripRoot(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (!node.nodeValue || node.nodeValue.indexOf('$') === -1) return;
      var next = cleanText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
    root.querySelectorAll('li, p').forEach(function (el) {
      if (!el.textContent.replace(/\s+/g, '')) el.parentNode.removeChild(el);
    });
  }

  function run() {
    document.querySelectorAll('[data-product-description]').forEach(stripRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
