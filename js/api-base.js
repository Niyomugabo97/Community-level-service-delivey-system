/* ============================================================
   api-base.js  — MUST load before any other script.

   When the frontend is hosted separately from the backend
   (e.g. frontend on Vercel, API on Railway), relative
   "/api/..." requests would hit the static host and 404.
   This shim reroutes any "/api/..." fetch to the real backend.

   On localhost the backend serves the frontend, so relative
   paths already work and no rewriting is done.
   ============================================================ */
(function () {
    var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    var API_BASE = isLocal
        ? ''
        : 'https://backen-community-level-servece-delivery-system-production.up.railway.app';

    window.API_BASE = API_BASE;
    if (!API_BASE || typeof window.fetch !== 'function') return;

    var _fetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
        try {
            if (typeof input === 'string') {
                if (input.indexOf('/api/') === 0) input = API_BASE + input;
            } else if (input && typeof input.url === 'string') {
                var u = input.url;
                if (u.indexOf(location.origin + '/api/') === 0) {
                    input = new Request(API_BASE + u.slice(location.origin.length), input);
                }
            }
        } catch (e) { /* fall through with the original input */ }
        return _fetch(input, init);
    };
})();
