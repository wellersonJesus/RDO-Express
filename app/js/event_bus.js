window.EventBus = (function () {
    'use strict';

    var _eventos = {};

    function on(evento, callback) {
        if (typeof callback !== 'function') return;
        if (!_eventos[evento]) _eventos[evento] = [];
        _eventos[evento].push(callback);
    }

    function emit(evento, dados) {
        if (!_eventos[evento] || !_eventos[evento].length) return;
        _eventos[evento].forEach(function (cb) {
            try { cb(dados); } catch (e) {}
        });
    }

    function off(evento, callback) {
        if (!_eventos[evento]) return;
        _eventos[evento] = _eventos[evento].filter(function (cb) { return cb !== callback; });
    }

    function clear(evento) {
        if (evento) delete _eventos[evento];
        else _eventos = {};
    }

    return { on: on, emit: emit, off: off, clear: clear };
})();
