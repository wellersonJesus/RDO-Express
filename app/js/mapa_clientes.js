(function () {
    'use strict';

    function carregarLeaflet() {
        return new Promise(function (resolve) {
            if (typeof L !== 'undefined') { resolve(); return; }

            if (!document.getElementById('leaflet-css-rdo')) {
                var link = document.createElement('link');
                link.id = 'leaflet-css-rdo';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            if (document.querySelector('script[src*="leaflet@1.9.4/dist/leaflet.js"]')) {
                var check = setInterval(function () {
                    if (typeof L !== 'undefined') { clearInterval(check); resolve(); }
                }, 100);
                return;
            }

            var s = document.createElement('script');
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload = function () { resolve(); };
            s.onerror = function () { resolve(); };
            document.body.appendChild(s);
        });
    }

    window.carregarLeaflet = carregarLeaflet;
})();
