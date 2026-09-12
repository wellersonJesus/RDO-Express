window.API = (function () {

    var ENDPOINT = '/api/proxy';
    var TIMEOUT_MS = 20000;

    var TIMEOUT_ESPECIAL = {
        getpedidos: 30000,
        updatefinanceiro: 30000,
        updatepedido: 30000,
        getdashboarddata: 30000
    };

    var MAX_RETRIES = 3;
    var RETRY_DELAY_MS = 1500;

    var _cache = {};
    var CACHE_TTL_MS = 30000;

    var MAPA_CHAVE_ARRAY = {
        getclientes: 'clientes',
        getchat: 'chat',
        getpedidos: 'pedidos',
        getcolaboradores: 'colaboradores',
        getfinanceiro: 'financeiro',
        getrelatorios: 'relatorios',
        getextratos: 'extratos'
    };

    var ACOES_SEMPRE_FRESCAS = {
        getdashboarddata: true,
        getpedidos: true,
        getfinanceiro: true,
        getextratos: true
    };

    var ACOES_MUTACAO = [
        'update',
        'create',
        'insert',
        'delete',
        'save',
        'lancar',
        'pagar',
        'baixar',
        'marcar'
    ];

    function _acaoLower(action) {
        return String(action || '').trim().toLowerCase();
    }

    function _ehAcaoMutacao(action) {
        var acao = _acaoLower(action);

        return ACOES_MUTACAO.some(function (prefixo) {
            return acao.indexOf(prefixo) === 0 ||
                acao.indexOf(prefixo) !== -1;
        });
    }

    function _ehLeituraSempreFresca(action) {
        return !!ACOES_SEMPRE_FRESCAS[_acaoLower(action)];
    }

    function extrairArrayDaResposta(action, result) {
        if (!result || typeof result !== 'object') return result;

        if (Array.isArray(result)) return result;

        var acaoLower = _acaoLower(action);

        var acoesQueRetornamObjeto = [
            'getdashboarddata',
            'getusuariosonline'
        ];

        if (acoesQueRetornamObjeto.indexOf(acaoLower) !== -1) {
            return result;
        }

        if (Array.isArray(result.data)) {
            return result.data;
        }

        var chaveMapeada = MAPA_CHAVE_ARRAY[acaoLower];

        if (chaveMapeada && Array.isArray(result[chaveMapeada])) {
            return result[chaveMapeada];
        }

        var chaves = Object.keys(result);

        for (var i = 0; i < chaves.length; i++) {
            if (Array.isArray(result[chaves[i]])) {
                return result[chaves[i]];
            }
        }

        return result;
    }

    function snakeToCamel(str) {
        return String(str).replace(/_([a-z0-9])/g, function (_, letra) {
            return letra.toUpperCase();
        });
    }

    function normalizarObjeto(obj) {
        if (Array.isArray(obj)) {
            return obj.map(normalizarObjeto);
        }

        if (obj && typeof obj === 'object') {
            var novo = {};

            Object.keys(obj).forEach(function (key) {
                var valor = obj[key];

                if (valor && typeof valor === 'object') {
                    valor = normalizarObjeto(valor);
                }

                novo[key] = valor;

                var camelKey = snakeToCamel(key);

                if (
                    camelKey !== key &&
                    novo[camelKey] === undefined
                ) {
                    novo[camelKey] = valor;
                }
            });

            return novo;
        }

        return obj;
    }

    function normalizarResposta(result) {
        if (!result || typeof result !== 'object') {
            return result;
        }

        if (Array.isArray(result)) {
            return normalizarObjeto(result);
        }

        var camposParaNormalizar = [
            'data',
            'user',
            'pedido',
            'pedidos',
            'usuarios',
            'colaboradores',
            'financeiro',
            'clientes',
            'relatorios',
            'extratos',
            'usuario'
        ];

        camposParaNormalizar.forEach(function (campo) {
            if (result[campo] !== undefined) {
                result[campo] = normalizarObjeto(result[campo]);
            }
        });

        return result;
    }

    function sleep(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function isBusyError(err) {
        return !!(
            err &&
            err.message &&
            err.message.indexOf('Sistema ocupado') !== -1
        );
    }

    function isTimeoutError(err) {
        return !!(
            err &&
            err.message &&
            err.message.indexOf('Tempo limite excedido') !== -1
        );
    }

    function isRetryable(err) {
        return isBusyError(err) || isTimeoutError(err);
    }

    function cacheKey(action, data) {
        return _acaoLower(action) + '::' + JSON.stringify(data || {});
    }

    function invalidarCacheRelacionado(action, data) {
        var acaoLower = _acaoLower(action);

        var entidadesRelacionadas = [
            'pedido',
            'pedidos',
            'financeiro',
            'pagamento',
            'lote'
        ];

        var deveInvalidar = entidadesRelacionadas.some(function (entidade) {
            return acaoLower.indexOf(entidade) !== -1;
        });

        if (!deveInvalidar) {
            return;
        }

        Object.keys(_cache).forEach(function (key) {
            var chaveLower = key.toLowerCase();

            var pertenceAEntidade = entidadesRelacionadas.some(function (entidade) {
                return chaveLower.indexOf(entidade) !== -1;
            });

            if (pertenceAEntidade) {
                delete _cache[key];
            }
        });

        var acoesCriticas = [
            'getdashboarddata',
            'getpedidos',
            'getfinanceiro',
            'getextratos'
        ];

        Object.keys(_cache).forEach(function (key) {
            var pertenceAConsultaCritica = acoesCriticas.some(function (consulta) {
                return key.indexOf(consulta + '::') === 0;
            });

            if (pertenceAConsultaCritica) {
                delete _cache[key];
            }
        });

        try {
            window.dispatchEvent(new CustomEvent('api:cacheInvalidado', {
                detail: {
                    action: action,
                    data: data || {},
                    timestamp: Date.now()
                }
            }));
        } catch (e) {
            console.warn('[API] Não foi possível emitir api:cacheInvalidado:', e);
        }
    }

    function obterTimeoutParaAction(action) {
        var acaoLower = _acaoLower(action);

        return TIMEOUT_ESPECIAL[acaoLower] || TIMEOUT_MS;
    }

    function construirPayload(action, data) {
        var payload = {
            action: action
        };

        if (data && typeof data === 'object') {
            Object.keys(data).forEach(function (key) {
                payload[key] = data[key];
            });
        }

        return payload;
    }

    function interpretarErroHTTP(res, parsed, rawText, action) {
        var msgErro =
            parsed &&
            (
                parsed.message ||
                parsed.error ||
                parsed.mensagem ||
                parsed.detail
            );

        if (!msgErro) {
            msgErro =
                'HTTP ' +
                res.status +
                (rawText
                    ? ': ' + rawText.substring(0, 200)
                    : '');
        }

        var erro = new Error(msgErro);

        erro.status = res.status;
        erro.httpStatus = res.status;
        erro.action = action;
        erro.response = parsed;

        return erro;
    }

    function doCall(action, data) {

        var payload = construirPayload(action, data);
        var timeoutAtual = obterTimeoutParaAction(action);

        var controller =
            typeof AbortController !== 'undefined'
                ? new AbortController()
                : null;

        var timeoutId = null;

        if (controller) {
            timeoutId = setTimeout(function () {
                controller.abort();
            }, timeoutAtual);
        }

        console.log('[API] →', action, payload);

        return fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller
                ? controller.signal
                : undefined
        })
            .then(function (res) {

                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }

                return res.text().then(function (rawText) {

                    var parsed = null;

                    if (rawText && rawText.trim() !== '') {
                        try {
                            parsed = JSON.parse(rawText);
                        } catch (parseErr) {
                            var erroParse = new Error(
                                'Resposta inválida do servidor (HTTP ' +
                                res.status +
                                '): ' +
                                rawText.substring(0, 200)
                            );

                            erroParse.status = res.status;
                            erroParse.httpStatus = res.status;
                            erroParse.action = action;

                            throw erroParse;
                        }
                    }

                    if (!res.ok) {
                        throw interpretarErroHTTP(
                            res,
                            parsed,
                            rawText,
                            action
                        );
                    }

                    if (parsed === null) {
                        throw new Error(
                            'Resposta vazia do servidor para a ação "' +
                            action +
                            '".'
                        );
                    }

                    return parsed;
                });
            })
            .then(function (result) {

                result = normalizarResposta(result);

                console.log('[API] ←', action, result);

                if (
                    result &&
                    typeof result === 'object' &&
                    (
                        result.status === 'error' ||
                        result.success === false
                    )
                ) {
                    var erroAPI = new Error(
                        result.message ||
                        result.mensagem ||
                        result.error ||
                        'Erro retornado pela API ("' +
                        action +
                        '").'
                    );

                    erroAPI.action = action;
                    erroAPI.response = result;

                    throw erroAPI;
                }

                if (_ehAcaoMutacao(action)) {
                    invalidarCacheRelacionado(action, data);
                }

                if (_acaoLower(action).indexOf('get') === 0) {
                    result = extrairArrayDaResposta(
                        action,
                        result
                    );
                }

                return result;
            })
            .catch(function (err) {

                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }

                if (err && err.name === 'AbortError') {
                    var erroTimeout = new Error(
                        'Tempo limite excedido ao chamar "' +
                        action +
                        '" (' +
                        timeoutAtual / 1000 +
                        's).'
                    );

                    erroTimeout.code = 'API_TIMEOUT';
                    erroTimeout.action = action;

                    console.error(
                        '[API] Erro em "' +
                        action +
                        '":',
                        erroTimeout
                    );

                    throw erroTimeout;
                }

                console.error(
                    '[API] Erro em "' +
                    action +
                    '":',
                    err
                );

                throw err;
            });
    }

    function call(action, data, attempt, useCache) {

        attempt = attempt || 1;

        if (
            !action ||
            typeof action !== 'string'
        ) {
            return Promise.reject(
                new Error(
                    'API.call: "action" é obrigatório e deve ser string.'
                )
            );
        }

        var acaoLower = _acaoLower(action);

        var key = cacheKey(action, data);

        var cachePermitido =
            useCache === true &&
            !_ehLeituraSempreFresca(action);

        if (
            cachePermitido &&
            _cache[key] &&
            (
                Date.now() -
                _cache[key].time <
                CACHE_TTL_MS
            )
        ) {
            console.log(
                '[API] (cache) ←',
                action
            );

            return Promise.resolve(
                _cache[key].value
            );
        }

        return doCall(action, data)
            .then(function (result) {

                _cache[key] = {
                    value: result,
                    time: Date.now()
                };

                return result;
            })
            .catch(function (err) {

                if (
                    isRetryable(err) &&
                    attempt < MAX_RETRIES
                ) {
                    console.warn(
                        '[API] "' +
                        action +
                        '" instável. Tentativa ' +
                        attempt +
                        '/' +
                        MAX_RETRIES +
                        '...'
                    );

                    return sleep(
                        RETRY_DELAY_MS * attempt
                    ).then(function () {
                        return call(
                            action,
                            data,
                            attempt + 1,
                            useCache
                        );
                    });
                }

                throw err;
            });
    }

    function clearCache() {
        _cache = {};

        try {
            window.dispatchEvent(
                new CustomEvent('api:cacheLimpo', {
                    detail: {
                        timestamp: Date.now()
                    }
                })
            );
        } catch (e) {
            console.warn(
                '[API] Não foi possível emitir api:cacheLimpo:',
                e
            );
        }
    }

    function invalidate(action, data) {
        invalidarCacheRelacionado(action, data);
    }

    function invalidateAll() {
        clearCache();
    }

    return {
        call: call,
        clearCache: clearCache,
        invalidate: invalidate,
        invalidateAll: invalidateAll
    };

})();