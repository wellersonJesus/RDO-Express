window.checkMaster = function () {
    var val = localStorage.getItem('bot_master_active');
    if (val === null || val === undefined) return true;
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
window.AppRDO.isMasterOn = false;

window.AppRDO.resetState = function () {
    window.AppRDO.isFetching = false;
    window.AppRDO.listaCarregada = false;

    if (window.botState) {
        window.botState.isFetching = false;
    }

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

    if (window.financeiroState) {
        window.financeiroState.fetching = false;
        window.financeiroState.formCarregado = false;
    }

    limparModais();
};

function limparModais() {
    document.querySelectorAll('.modal.show').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) {
            try { inst.hide(); } catch (e) { }
        }
    });

    document.querySelectorAll('.modal-backdrop').forEach(function (b) {
        b.remove();
    });

    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');

    var containers = [
        'modal-pedidos-container',
        'admin-modal-container',
        'financeiro-modal-container'
    ];

    containers.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.innerHTML = '';
            if (el.dataset && el.dataset.loaded) {
                delete el.dataset.loaded;
            }
        }
    });
}

var MODULE_MAP = {
    chat: function () {
        if (typeof window.carregarDados === 'function') window.carregarDados();
    },
    pedidos: function () {
        if (typeof window.initPedidos === 'function') window.initPedidos();
    },
    bot: function () {
        if (typeof window.initBot === 'function') window.initBot();
    },
    admin: function () {
        if (typeof window.initAdmin === 'function') window.initAdmin();
    },
    fin: function () {
        if (typeof window.initFinanceiro === 'function') window.initFinanceiro();
    }
};

var PAGES_SEM_HEADER = ['pedidos', 'fin'];

window.loadPage = function (page, title, subtitle) {
    var container = document.getElementById('router-view');
    var headerEl = document.getElementById('page-header');
    var titleEl = document.getElementById('page-title');
    var subtitleEl = document.getElementById('page-subtitle');

    if (!container) return;

    if (window.AppRDO && typeof window.AppRDO.resetState === 'function') {
        window.AppRDO.resetState();
    }

    var esconderHeader = PAGES_SEM_HEADER.indexOf(page) !== -1;

    if (headerEl) {
        if (esconderHeader) {
            headerEl.setAttribute('style', 'display: none !important');
        } else {
            headerEl.removeAttribute('style');
        }
    }

    if (!esconderHeader) {
        if (titleEl) titleEl.innerText = title || '';
        if (subtitleEl) subtitleEl.innerText = subtitle || '';
    }

    container.style.paddingTop = esconderHeader ? '0' : '';

    console.log('[loadPage] Carregando:', page);

    return fetch('pages/' + page + '/' + page + '.html')
        .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function (html) {
            container.innerHTML = html;

            if (typeof window.atualizarAvatar === 'function') {
                window.atualizarAvatar();
            }

            setTimeout(function () {
                console.log('[loadPage] Inicializando módulo:', page);
                if (MODULE_MAP[page]) {
                    MODULE_MAP[page]();
                } else {
                    console.log('[loadPage] Nenhum init para:', page);
                }
            }, 80);
        })
        .catch(function (err) {
            console.error('[loadPage] Erro ao carregar:', page, err.message);
            container.innerHTML =
                '<div class="alert alert-danger m-3 rounded-3">' +
                '<i class="bi bi-exclamation-triangle me-2"></i>' +
                'Erro ao carregar módulo <strong>' + page + '</strong>. Verifique o console.' +
                '</div>';
        });
};

window.loadModal = function (arquivo) {
    var container = document.getElementById('modal-container');
    if (!container) return Promise.resolve(false);

    limparModais();
    container.innerHTML = '';

    return fetch('pages/chat/' + arquivo)
        .then(function (res) {
            if (!res.ok) return false;
            return res.text();
        })
        .then(function (html) {
            if (!html || html.trim().length === 0) return false;
            if (html.indexOf('class="modal') === -1) return false;

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

            container.innerHTML = html;

            var chain = Promise.resolve();

            scriptsSrc.forEach(function (src) {
                chain = chain.then(function () {
                    return carregarScriptExterno(src);
                });
            });

            return chain.then(function () {
                scriptsInline.forEach(function (code) {
                    try {
                        var s = document.createElement('script');
                        s.textContent = code;
                        document.body.appendChild(s);
                        setTimeout(function () {
                            if (s.parentNode) s.parentNode.removeChild(s);
                        }, 100);
                    } catch (e) { }
                });
                return true;
            });
        })
        .catch(function () {
            container.innerHTML = '';
            return false;
        });
};

function carregarScriptExterno(src) {
    return new Promise(function (resolve) {
        var existe = document.querySelector('script[src="' + src + '"]');
        if (existe) { resolve(); return; }
        var s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = resolve;
        s.onerror = resolve;
        document.body.appendChild(s);
    });
}

window.atualizarAvatar = function () {
    var imagem = localStorage.getItem('imagem');
    var username = localStorage.getItem('username') || 'U';
    var inicial = username.charAt(0).toUpperCase();
    var isValid = imagem && imagem !== 'null' && imagem !== 'undefined' && imagem.trim().length > 0;

    atualizarAvatarEl(
        document.getElementById('user-avatar-img'),
        document.getElementById('user-avatar-icon'),
        imagem, inicial, isValid, false
    );

    atualizarAvatarEl(
        document.getElementById('header-user-avatar'),
        document.getElementById('header-avatar-fallback'),
        imagem, inicial, isValid, true
    );
};

function atualizarAvatarEl(imgEl, fallbackEl, imagem, inicial, isValid, usarTexto) {
    if (!imgEl) return;

    if (isValid) {
        imgEl.src = imagem;
        imgEl.style.display = 'block';
        imgEl.onerror = function () {
            imgEl.style.display = 'none';
            if (fallbackEl) {
                if (usarTexto) {
                    fallbackEl.textContent = inicial;
                    fallbackEl.style.display = 'flex';
                } else {
                    fallbackEl.style.display = '';
                }
            }
        };
        if (fallbackEl) fallbackEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        if (fallbackEl) {
            if (usarTexto) {
                fallbackEl.textContent = inicial;
                fallbackEl.style.display = 'flex';
            } else {
                fallbackEl.style.display = '';
            }
        }
    }
}
