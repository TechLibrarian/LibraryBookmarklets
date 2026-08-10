// Local development helper for the Library Bookmarklets.
//
// These scripts are normally installed as `javascript:` bookmarklets and run
// against live library web apps (Ex Libris Alma, SILO ILL). This helper mounts
// a small toolbar that fetches a bookmarklet's source and executes it against
// the current mock page, exactly as clicking the bookmarklet would.
(function () {
  function runBookmarklet(file) {
    fetch('../' + file, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (source) {
        // Executing the IIFE body mirrors a browser evaluating the
        // `javascript:` bookmarklet URL on the active page.
        new Function(source)();
      })
      .catch(function (err) {
        alert('Failed to load ' + file + ': ' + err.message);
      });
  }

  window.mountBookmarkletBar = function (bookmarklets) {
    var bar = document.createElement('div');
    bar.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9000;background:#111827;color:#fff;' +
      'padding:8px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;' +
      'font-family:-apple-system,Segoe UI,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3)';

    var label = document.createElement('strong');
    label.textContent = 'Bookmarklet runner:';
    label.style.marginRight = '4px';
    bar.appendChild(label);

    bookmarklets.forEach(function (b) {
      var btn = document.createElement('button');
      btn.textContent = b.label;
      btn.style.cssText =
        'padding:6px 12px;background:#2563eb;color:#fff;border:none;border-radius:6px;' +
        'cursor:pointer;font-size:13px';
      btn.onclick = function () {
        runBookmarklet(b.file);
      };
      bar.appendChild(btn);
    });

    document.body.appendChild(bar);
    // Keep page content clear of the fixed toolbar.
    document.body.style.paddingTop =
      Math.ceil(bar.getBoundingClientRect().height) + 16 + 'px';
  };

  // Populate <select> elements with every option value referenced by a
  // bookmarklet's data tables, so assigning `select.value = code` succeeds.
  window.populateSelectsFromSource = function (file, mapping) {
    return fetch('../' + file, { cache: 'no-store' })
      .then(function (res) {
        return res.text();
      })
      .then(function (source) {
        Object.keys(mapping).forEach(function (selectId) {
          var select = document.getElementById(selectId);
          if (!select) return;
          var codes = {};
          mapping[selectId].forEach(function (key) {
            var re = new RegExp(key + "\\s*:\\s*'(\\d+)'", 'g');
            var m;
            while ((m = re.exec(source)) !== null) {
              codes[m[1]] = true;
            }
          });
          Object.keys(codes)
            .sort(function (a, b) {
              return Number(a) - Number(b);
            })
            .forEach(function (code) {
              var opt = document.createElement('option');
              opt.value = code;
              opt.textContent = 'code ' + code;
              select.appendChild(opt);
            });
        });
      });
  };
})();
