window.API = (function () {

    var ENDPOINT = '/api/proxy';
    var TIMEOUT_MS = 20000; // mantido igual
    var MAX_RETRIES = 3;
    var RETRY_DELAY_MS = 1500;

    var _cache = {};          // cache simples por action+params
    var CACHE_TTL_MS = 30000; // 30s — ajuste conforme necessidade

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function isBusyError(err) {
        return err && err.message && err.message.indexOf('Sistema ocupado') !== -1;
    }

    function cacheKey(action, data) {
        return action + '::' + JSON.stringify(data || {});
    }

    function doCall(action, data) {
        var payload = { action: action };
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(function (k) {
                payload[k] = data[k];
            });
        }

        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeoutId = null;
        if (controller) {
            timeoutId = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
        }

        console.log('[API] →', action, payload);

        return fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller ? controller.signal : undefined
        })
        .then(function (res) {
            if (timeoutId) clearTimeout(timeoutId);

            return res.text().then(function (rawText) {
                var parsed = null;

                if (rawText && rawText.trim() !== '') {
                    try {
                        parsed = JSON.parse(rawText);
                    } catch (parseErr) {
                        throw new Error(
                            'Resposta inválida do servidor (HTTP ' + res.status + '): ' +
                            rawText.substring(0, 150)
                        );
                    }
                }

                if (!res.ok) {
                    var msgErro = (parsed && (parsed.message || parsed.error)) ||
                        ('HTTP ' + res.status + (rawText ? ': ' + rawText.substring(0, 150) : ''));
                    throw new Error(msgErro);
                }

                if (parsed === null) {
                    throw new Error('Resposta vazia do servidor para a ação "' + action + '".');
                }

                return parsed;
            });
        })
        .then(function (result) {
            console.log('[API] ←', action, result);

            if (result && result.status === 'error') {
                throw new Error(result.message || 'Erro desconhecido retornado pela API ("' + action + '").');
            }

            return result;
        })
        .catch(function (err) {
            if (timeoutId) clearTimeout(timeoutId);

            if (err && err.name === 'AbortError') {
                throw new Error('Tempo limite excedido ao chamar "' + action + '" (' + (TIMEOUT_MS / 1000) + 's).');
            }

            console.error('[API] Erro em "' + action + '":', err);
            throw err;
        });
    }

    function call(action, data, attempt, useCache) {
        attempt = attempt || 1;

        if (!action || typeof action !== 'string') {
            return Promise.reject(new Error('API.call: "action" é obrigatório e deve ser string.'));
        }

        var key = cacheKey(action, data);

        // Se pedir cache e existir cache válido, retorna sem nova requisição
        if (useCache && _cache[key] && (Date.now() - _cache[key].time < CACHE_TTL_MS)) {
            console.log('[API] (cache) ←', action);
            return Promise.resolve(_cache[key].value);
        }

        return doCall(action, data).then(function (result) {
            _cache[key] = { value: result, time: Date.now() };
            return result;
        }).catch(function (err) {
            if (isBusyError(err) && attempt < MAX_RETRIES) {
                console.warn('[API] "' + action + '" ocupado. Tentativa ' + attempt + '/' + MAX_RETRIES + '...');
                return sleep(RETRY_DELAY_MS * attempt).then(function () {
                    return call(action, data, attempt + 1, useCache);
                });
            }
            throw err;
        });
    }

    return {
        call: call,
        clearCache: function () { _cache = {}; }
    };
})();
