(function () {
  var script = document.currentScript;
  var src = script && script.getAttribute('data-sprite-url');
  if (!src) return;

  function remap() {
    document.querySelectorAll('use').forEach(function (el) {
      var href = el.getAttribute('href') || el.getAttribute('xlink:href') || '';
      if (href.indexOf('sprites-core') === -1) return;
      var hash = href.split('#')[1];
      if (!hash) return;
      var next = src + '#' + hash;
      el.setAttribute('href', next);
      el.setAttribute('xlink:href', next);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', remap);
  } else {
    remap();
  }
})();
