window.EventBus = (function() {
    'use strict';
    
    var _eventos = {};
    
    function on(evento, callback) {
        if (typeof callback !== 'function') {
            console.error('[EventBus] ❌ Callback inválido para:', evento);
            return;
        }
        if (!_eventos[evento]) _eventos[evento] = [];
        _eventos[evento].push(callback);
        console.log('[EventBus] ✅ Listener registrado:', evento, '| Total:', _eventos[evento].length);
    }
    
    function emit(evento, dados) {
        console.log('[EventBus] 📡 Emitindo:', evento, '| Dados:', dados);
        if (!_eventos[evento] || _eventos[evento].length === 0) {
            console.warn('[EventBus] ⚠️ Nenhum listener para:', evento);
            return;
        }
        _eventos[evento].forEach(function(cb, index) {
            try { 
                cb(dados); 
                console.log('[EventBus] ✅ Callback', index + 1, 'executado');
            } catch(e) { 
                console.error('[EventBus] ❌ Erro no callback', index + 1, ':', e); 
            }
        });
    }
    
    function off(evento, callback) {
        if (!_eventos[evento]) return;
        _eventos[evento] = _eventos[evento].filter(function(cb) { return cb !== callback; });
        console.log('[EventBus] 🗑️ Listener removido:', evento);
    }
    
    function clear(evento) {
        if (evento) {
            delete _eventos[evento];
            console.log('[EventBus] 🗑️ Todos os listeners de', evento, 'removidos');
        } else {
            _eventos = {};
            console.log('[EventBus] 🗑️ Todos os eventos limpos');
        }
    }
    
    console.log('[EventBus] ✅ Módulo carregado e pronto');
    
    return { on: on, emit: emit, off: off, clear: clear };
})();
