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
window.AppRDO.paginaAtual = null;

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
    }

    fecharModaisAbertos();
};

function fecharModaisAbertos() {
    document.querySelectorAll('.modal.show').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) {
            try { inst.hide(); } catch (e) {}
        }
    });

    document.querySelectorAll('.modal-backdrop').forEach(function (b) {
        b.remove();
    });

    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
}

function limparModalContainer() {
    var container = document.getElementById('modal-container');
    if (!container) return;
    container.querySelectorAll('.modal').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) {
            try { inst.dispose(); } catch (e) {}
        }
    });
    container.innerHTML = '';
}

var PAGE_MODALS = {
    fin: [
        'pages/fin/form_fin.html',
        'pages/fin/view_fin.html'
    ]
};

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
                        } catch (e) {}
                    });
                });
            })
            .catch(function (err) {
                console.warn('[app] Falha ao carregar modal:', err.message);
            });
    });

    return Promise.all(promises);
}

window.loadPage = function (page, title, subtitle) {
    var container = document.getElementById('router-view');
    var headerEl = document.getElementById('page-header');
    var titleEl = document.getElementById('page-title');
    var subtitleEl = document.getElementById('page-subtitle');

    if (!container) return Promise.resolve();

    if (window.AppRDO && typeof window.AppRDO.resetState === 'function') {
        window.AppRDO.resetState();
    }

    window.AppRDO.paginaAtual = page;

    if (headerEl) headerEl.removeAttribute('style');
    if (titleEl) titleEl.textContent = title || '';
    if (subtitleEl) subtitleEl.textContent = subtitle || '';

    container.style.paddingTop = '';

    container.innerHTML =
        '<div class="text-center py-5">' +
        '<div class="spinner-border text-danger spinner-border-sm"></div>' +
        '<div class="mt-2 text-muted" style="font-size:.78rem;">Carregando...</div>' +
        '</div>';

    fecharModaisAbertos();
    limparModalContainer();

    document.querySelectorAll('.sidebar .nav-link').forEach(function (link) {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });

    return fetch('pages/' + page + '/' + page + '.html')
        .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function (html) {
            container.innerHTML = html;
            return carregarModaisDaPagina(page);
        })
        .then(function () {
            if (typeof window.atualizarAvatar === 'function') {
                window.atualizarAvatar();
            }

            if (MODULE_MAP[page]) {
                MODULE_MAP[page]();
            }
        })
        .catch(function (err) {
            container.innerHTML =
                '<div class="text-center py-5">' +
                '<i class="bi bi-exclamation-triangle text-warning" style="font-size:2rem;"></i>' +
                '<div class="mt-2 text-muted" style="font-size:.82rem;">Falha ao carregar o módulo <strong>' + page + '</strong>.</div>' +
                '<button class="btn btn-outline-danger btn-sm rounded-pill mt-3" onclick="loadPage(\'' + page + '\',\'' + (title || '').replace(/'/g, "\\'") + '\',\'' + (subtitle || '').replace(/'/g, "\\'") + '\')">Tentar novamente</button>' +
                '</div>';
            console.error('[app] Erro ao carregar página:', err.message);
        });
};

window.loadModal = function (arquivo) {
    var container = document.getElementById('modal-container');
    if (!container) return Promise.resolve(false);

    fecharModaisAbertos();
    limparModalContainer();

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
                    } catch (e) {}
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
    var username = localStorage.getItem('username') || 'Usuário';
    var isValid = imagem && imagem !== 'null' && imagem !== 'undefined' && imagem.trim().length > 0;

    var iniciais = obterIniciaisGlobal(username);
    var inicial = iniciais || username.charAt(0).toUpperCase();

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

function obterIniciaisGlobal(nome) {
    if (!nome || nome === 'Usuário' || nome === '...') return '';
    var partes = nome.trim().split(/\s+/);
    if (partes.length >= 2) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
}

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
