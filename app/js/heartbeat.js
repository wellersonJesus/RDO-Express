(function () {
    'use strict';

    var INTERVALO_MS = 2 * 60 * 1000;

    function enviarHeartbeat() {
        var username = localStorage.getItem('username');
        if (!username || localStorage.getItem('rdo_auth') !== 'true') return;
        if (!window.API || typeof window.API.call !== 'function') return;

        window.API.call('heartbeat', { username: username }).catch(function () {});
    }

    if (localStorage.getItem('rdo_auth') === 'true') {
        enviarHeartbeat();
        setInterval(enviarHeartbeat, INTERVALO_MS);
    }
})();
