window.checkMaster = function () {
    var val = localStorage.getItem('bot_master_active');
    return val === 'true';
};

window.AppRDO = window.AppRDO || {};
window.AppRDO.isFetching = false;
window.AppRDO.listaCarregada = false;
window.AppRDO.clienteId = null;
window.AppRDO.clienteSelecionado = null;
window.AppRDO.clientesCache = [];
window.AppRDO.mensagensCache = [];
window.AppRDO.pedidosCache = [];
window.AppRDO.motoboyCache = [];
window.AppRDO.financeiroCache = [];
window.AppRDO.relatoriosCache = [];
window.AppRDO.paginaAtual = null;
window.AppRDO._modalTransitioning = false;
window.AppRDO._navToken = 0;
window.AppRDO._chatIntervaloId = null;
window.AppRDO._syncIntervaloId = null;
window.AppRDO.botCarregado = false;
window.AppRDO.permissoesCarregadas = false;

(function () {
    var raw = localStorage.getItem('bot_master_active');
    if (raw === null) {
        localStorage.setItem('bot_master_active', 'false');
        window.AppRDO.isMasterOn = false;
    } else {
        window.AppRDO.isMasterOn = (raw === 'true');
    }
})();

window.AppRDO.resetState = function () {
    window.AppRDO.isFetching = false;
    window.AppRDO.listaCarregada = false;
    window.AppRDO._modalTransitioning = false;
    window.AppRDO.isMasterOn = localStorage.getItem('bot_master_active') === 'true';

    if (window.AppRDO._chatIntervaloId) {
        clearInterval(window.AppRDO._chatIntervaloId);
        window.AppRDO._chatIntervaloId = null;
    }
    if (window.AppRDO._syncIntervaloId) {
        clearInterval(window.AppRDO._syncIntervaloId);
        window.AppRDO._syncIntervaloId = null;
    }
    if (window.botState) window.botState.isFetching = false;
    if (window.pedidosState) {
        window.pedidosState.isFetching = false;
        if (window.pedidosState.intervaloId) {
            clearInterval(window.pedidosState.intervaloId);
            window.pedidosState.intervaloId = null;
        }
    }
    if (window.adminState) {
        window.adminState.fetching = false;
        window.adminState.formCarregado = false;
    }
    if (window.financeiroState) window.financeiroState.fetching = false;

    _fecharModaisAbertos();
};

var PAGES_SEM_HEADER = [];

var PAGE_MODALS = {
    pedidos: ['/pages/pedidos/form_pedidos.html'],
    fin: ['/pages/fin/form_fin.html', '/pages/fin/view_fin.html'],
    relatorio: ['/pages/relatorio/modal_relatorio.html']
};

var PAGE_CSS = {
    relatorio: ['/pages/relatorio/modal_relatorio.css']
};

var MODULE_SCRIPTS = {
    dashboard: '/js/dashboard.js',
    chat: '/js/chat.js',
    pedidos: '/js/pedidos.js',
    bot: '/js/bot.js',
    admin: '/js/admin.js',
    fin: '/js/fin.js',
    relatorio: '/js/relatorios.js'
};

var GLOBAL_SCRIPTS_PRELOAD = [
    '/js/master_auth.js',
    '/js/mapa_clientes.js',
    '/js/form_clientes.js'
];

var MODULE_INITS = {
    dashboard: function () {
        function _tentarCarregarDashboard(tentativas) {
            tentativas = tentativas || 0;
            if (typeof window.initDashboard === 'function') {
                window.initDashboard();
            } else if (tentativas < 20) {
                setTimeout(function () { _tentarCarregarDashboard(tentativas + 1); }, 50);
            }
        }
        _tentarCarregarDashboard();
    },
    chat: function () {
        if (window.AppRDO) {
            window.AppRDO.isMasterOn = localStorage.getItem('bot_master_active') === 'true';
            window.AppRDO.listaCarregada = false;
        }
        function _tentarCarregar(tentativas) {
            tentativas = tentativas || 0;
            if (typeof window.carregarDados === 'function') {
                window.carregarDados();
            } else if (tentativas < 20) {
                setTimeout(function () { _tentarCarregar(tentativas + 1); }, 50);
            }
        }
        _tentarCarregar();
    },
    pedidos: function () { if (typeof window.initPedidos === 'function') window.initPedidos(); },
    bot: function () { if (typeof window.initBot === 'function') window.initBot(); },
    admin: function () { if (typeof window.initAdmin === 'function') window.initAdmin(); },
    fin: function () { if (typeof window.initFinanceiro === 'function') window.initFinanceiro(); },
    relatorio: function () { if (typeof window.initRelatorios === 'function') window.initRelatorios(); }
};

function _fecharModaisAbertos() {
    document.querySelectorAll('.modal.show').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) { try { inst.hide(); } catch (e) { } }
    });
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
}

function _fecharModaisAbortando() {
    document.querySelectorAll('.modal').forEach(function (m) {
        m.classList.remove('show', 'fade');
        m.style.display = 'none';
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) { try { inst.dispose(); } catch (e) { } }
    });
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
}

function _limparModalContainer() {
    var container = document.getElementById('modal-container');
    if (!container) return;
    container.querySelectorAll('.modal').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) { try { inst.dispose(); } catch (e) { } }
    });
    container.innerHTML = '';
}

window.fecharModaisAbertos = _fecharModaisAbertos;

function _carregarScriptExterno(src, forceReload) {
    return new Promise(function (resolve) {
        if (forceReload) {
            var existente = document.querySelector('script[src="' + src + '"]');
            if (existente) existente.parentNode.removeChild(existente);
        } else {
            var existe = document.querySelector('script[src="' + src + '"]');
            if (existe) { resolve(); return; }
        }
        var s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = resolve;
        s.onerror = resolve;
        document.body.appendChild(s);
    });
}

function _carregarCssExterno(href) {
    return new Promise(function (resolve) {
        var existe = document.querySelector('link[href="' + href + '"]');
        if (existe) { resolve(); return; }
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        l.onload = resolve;
        l.onerror = resolve;
        document.head.appendChild(l);
    });
}

function _carregarCssDaPagina(page) {
    var arquivos = PAGE_CSS[page];
    if (!arquivos || !arquivos.length) return Promise.resolve();
    var chain = Promise.resolve();
    arquivos.forEach(function (href) {
        chain = chain.then(function () { return _carregarCssExterno(href); });
    });
    return chain;
}

function _precarregarScriptsGlobais() {
    var chain = Promise.resolve();
    GLOBAL_SCRIPTS_PRELOAD.forEach(function (src) {
        chain = chain.then(function () { return _carregarScriptExterno(src); });
    });
    return chain;
}

function _verificarPermissaoAcesso(page) {
    var paginasBloqueadasRaw = localStorage.getItem('paginas_bloqueadas');
    if (!paginasBloqueadasRaw) return true;

    try {
        var paginasBloqueadas = JSON.parse(paginasBloqueadasRaw);
        return !paginasBloqueadas.includes(page);
    } catch (e) {
        return true;
    }
}

function carregarModaisDaPagina(page) {
    var arquivos = PAGE_MODALS[page];
    if (!arquivos || !arquivos.length) return Promise.resolve();
    var container = document.getElementById('modal-container');
    if (!container) return Promise.resolve();

    var promises = arquivos.map(function (url) {
        return fetch(url)
            .then(function (r) {
                if (!r.ok) throw new Error('Modal não encontrado: ' + url);
                return r.text();
            })
            .then(function (html) {
                html = html.replace(/<link[^>]*>/gi, '');
                var scriptsSrc = [];
                var scriptsInline = [];
                html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, function (match, attrs, content) {
                    var srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
                    if (srcMatch) {
                        scriptsSrc.push(srcMatch[1]);
                    } else if (content.trim()) {
                        scriptsInline.push(content.trim());
                    }
                    return '';
                });
                var wrapper = document.createElement('div');
                wrapper.innerHTML = html;
                container.appendChild(wrapper);
                var chain = Promise.resolve();
                scriptsSrc.forEach(function (src) {
                    chain = chain.then(function () { return _carregarScriptExterno(src); });
                });
                return chain.then(function () {
                    return new Promise(function (resolve) {
                        var pendentes = scriptsInline.length;
                        if (pendentes === 0) { resolve(); return; }
                        scriptsInline.forEach(function (code) {
                            try {
                                var s = document.createElement('script');
                                s.textContent = code;
                                document.body.appendChild(s);
                                Promise.resolve().then(function () {
                                    pendentes--;
                                    if (pendentes === 0) resolve();
                                });
                                setTimeout(function () {
                                    if (s.parentNode) s.parentNode.removeChild(s);
                                }, 200);
                            } catch (e) {
                                pendentes--;
                                if (pendentes === 0) resolve();
                            }
                        });
                    });
                });
            })
            .catch(function () { });
    });

    return Promise.all(promises);
}

window.loadPage = function (page, title, subtitle) {
    if (!_verificarPermissaoAcesso(page)) {
        Swal.fire({
            icon: 'warning',
            title: 'Acesso Negado',
            text: 'Você não tem permissão para acessar este módulo.',
            confirmButtonColor: '#dc3545'
        });
        return Promise.resolve();
    }

    var container = document.getElementById('router-view');
    var headerEl = document.getElementById('page-header');
    var titleEl = document.getElementById('page-title');
    var subtitleEl = document.getElementById('page-subtitle');
    if (!container) return Promise.resolve();

    var token = (window.AppRDO._navToken = (window.AppRDO._navToken || 0) + 1);
    var meuToken = token;

    window.AppRDO.resetState();
    window.AppRDO.paginaAtual = page;

    var esconderHeader = PAGES_SEM_HEADER.indexOf(page) !== -1;
    if (headerEl) {
        if (esconderHeader) {
            headerEl.style.display = 'none';
        } else {
            headerEl.style.display = '';
            if (titleEl) titleEl.textContent = title || '';
            if (subtitleEl) subtitleEl.textContent = subtitle || '';
        }
    }

    document.title = 'RDO Express | ' + (title || 'Painel');

    _fecharModaisAbortando();
    _limparModalContainer();

    container.innerHTML =
        '<div class="text-center py-5" style="min-height:300px;">' +
        '<div class="spinner-border text-danger spinner-border-sm"></div>' +
        '<div class="mt-2 text-muted" style="font-size:.78rem;">Carregando...</div>' +
        '</div>';

    document.querySelectorAll('.sidebar .nav-link').forEach(function (link) {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) link.classList.add('active');
    });

    return _carregarCssDaPagina(page)
        .then(function () {
            return fetch('/pages/' + page + '/' + page + '.html');
        })
        .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function (html) {
            if (window.AppRDO._navToken !== meuToken) return;
            container.innerHTML = html;
            return carregarModaisDaPagina(page);
        })
        .then(function () {
            if (window.AppRDO._navToken !== meuToken) return;

            requestAnimationFrame(function () {
                if (typeof window.atualizarAvatar === 'function') window.atualizarAvatar();
            });

            var scriptDoModulo = MODULE_SCRIPTS[page];
            if (scriptDoModulo) {
                return _carregarScriptExterno(scriptDoModulo, true).then(function () {
                    if (window.AppRDO._navToken !== meuToken) return;
                    if (MODULE_INITS[page]) MODULE_INITS[page]();
                });
            }
            if (MODULE_INITS[page]) MODULE_INITS[page]();
        })
        .catch(function (err) {
            if (window.AppRDO._navToken !== meuToken) return;
            if (headerEl) headerEl.style.display = '';
            container.innerHTML =
                '<div class="text-center py-5" style="min-height:300px;">' +
                '<i class="bi bi-exclamation-triangle text-warning" style="font-size:2rem;"></i>' +
                '<div class="mt-2 text-muted" style="font-size:.82rem;">Falha ao carregar o módulo <strong>' + page + '</strong>.</div>' +
                '<button class="btn btn-outline-danger btn-sm rounded-pill mt-3" ' +
                'onclick="loadPage(\'' + page + '\',\'' + (title || '').replace(/'/g, "\\'") + '\',\'' + (subtitle || '').replace(/'/g, "\\'") + '\')">Tentar novamente</button>' +
                '</div>';
        });
};

window.loadModal = function (nomeArquivo) {
    var container = document.getElementById('modal-container');
    if (!container) return Promise.resolve(false);

    var existente = container.querySelector('[data-modal-src="' + nomeArquivo + '"]');
    if (existente) return Promise.resolve(true);

    return fetch('/pages/chat/' + nomeArquivo)
        .then(function (r) {
            if (!r.ok) throw new Error('404: ' + nomeArquivo);
            return r.text();
        })
        .then(function (html) {
            var wrapper = document.createElement('div');
            wrapper.setAttribute('data-modal-src', nomeArquivo);
            wrapper.innerHTML = html;
            container.appendChild(wrapper);
            return true;
        })
        .catch(function () { return false; });
};

window.carregarScriptExterno = function (src) {
    return _carregarScriptExterno(src);
};

window.carregarCssExterno = function (href) {
    return _carregarCssExterno(href);
};

window.salvarDadosUsuarioLocal = function (dados) {
    if (!dados) return;
    if (dados.username) localStorage.setItem('username', dados.username);
    if (dados.contato) localStorage.setItem('contato', dados.contato);
    if (dados.tipo) localStorage.setItem('tipo', dados.tipo);

    if (dados.imagem && dados.imagem !== 'null' && dados.imagem !== 'undefined' && dados.imagem.length >= 10) {
        localStorage.setItem('imagem', dados.imagem);
    } else if (dados.hasOwnProperty('imagem')) {
        localStorage.removeItem('imagem');
    }

    if (typeof window.atualizarAvatar === 'function') window.atualizarAvatar();
};

window.inicializarBotGlobal = function () {
    console.log('[APP] Iniciando bot global...');

    return _carregarScriptExterno('/js/bot.js', false)
        .then(function () {
            console.log('[APP] bot.js carregado');
            if (typeof window.initBot === 'function') {
                return window.initBot();
            }
            return Promise.resolve();
        })
        .then(function () {
            console.log('[APP] Bot inicializado');
            window.AppRDO.botCarregado = true;
            window.AppRDO.permissoesCarregadas = true;
            return new Promise(function (resolve) {
                setTimeout(resolve, 100);
            });
        })
        .catch(function (err) {
            console.error('[APP] Erro ao inicializar bot:', err);
        });
};

window.addEventListener('botCacheAtualizado', function (e) {
    console.log('[APP] Evento botCacheAtualizado recebido');

    if (window.botState && window.botState._cacheCarregado) {
        console.log('[APP] Cache confirmado, aplicando bloqueios');
        window.AppRDO.permissoesCarregadas = true;

        if (typeof window.bloquearAcessoPorPermissao === 'function') {
            window.bloquearAcessoPorPermissao();
        }
    }
});

document.addEventListener('DOMContentLoaded', function () {
    console.log('[APP] DOM carregado, inicializando sistema');

    _precarregarScriptsGlobais()
        .then(function () {
            console.log('[APP] Scripts globais carregados');
            return window.inicializarBotGlobal();
        })
        .then(function () {
            console.log('[APP] Bot inicializado, aguardando estabilização');
            return new Promise(function (resolve) {
                setTimeout(resolve, 200);
            });
        })
        .then(function () {
            console.log('[APP] Sistema pronto');
        });
});


