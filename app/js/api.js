window.API = (function () {

    var ENDPOINT = '/api/proxy';
    var TIMEOUT_MS = 20000; // 20s — Apps Script pode ter cold start

    /**
     * Executa uma chamada à API (proxy -> Google Apps Script).
     * @param {string} action - Nome da ação (ex: 'addcolaboradores').
     * @param {object} [data] - Dados adicionais a enviar no payload.
     * @returns {Promise<object>} Resolve com o JSON de resposta ou rejeita com Error.
     */
    function call(action, data) {
        if (!action || typeof action !== 'string') {
            return Promise.reject(new Error('API.call: "action" é obrigatório e deve ser string.'));
        }

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

                // Tenta parsear o corpo como JSON de forma segura
                if (rawText && rawText.trim() !== '') {
                    try {
                        parsed = JSON.parse(rawText);
                    } catch (parseErr) {
                        // Resposta não é JSON válido (ex: HTML de erro, 502, etc.)
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

    return { call: call };
})();
