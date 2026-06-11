window.checkMaster = function () {
    try {
        var status = localStorage.getItem('bot_master_active');
        return status === 'true';
    } catch (err) {
        return false;
    }
};

window.AppRDO = window.AppRDO || {};
window.AppRDO.isFetching = window.AppRDO.isFetching || false;
window.AppRDO.listaCarregada = window.AppRDO.listaCarregada || false;
window.AppRDO.clienteId = window.AppRDO.clienteId || null;
window.AppRDO.clienteSelecionado = window.AppRDO.clienteSelecionado || null;
window.AppRDO.clientesCache = window.AppRDO.clientesCache || [];
window.AppRDO.mensagensCache = window.AppRDO.mensagensCache || [];
window.AppRDO.pedidosCache = window.AppRDO.pedidosCache || [];
window.AppRDO.motoboyCache = window.AppRDO.motoboyCache || [];
window.AppRDO.isMasterOn = window.AppRDO.isMasterOn || false;

window.AppRDO.resetState = function () {
    window.AppRDO.isFetching = false;
    window.AppRDO.listaCarregada = false;
    if (window.botState) window.botState.isFetching = false;
    if (window.pedidosState) {
        window.pedidosState.isFetching = false;
        if (window.pedidosState.intervaloId) {
            clearInterval(window.pedidosState.intervaloId);
            window.pedidosState.intervaloId = null;
        }
    }
    if (window.adminState) window.adminState.isFetching = false;

    /* ── Limpeza de modais órfãos ── */
    _cleanupModais();
};

function _cleanupModais() {
    // Fecha modais abertos
    document.querySelectorAll('.modal.show').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) {
            try { inst.hide(); } catch (_) {}
        }
    });
    // Remove backdrops
    document.querySelectorAll('.modal-backdrop').forEach(function (b) {
        b.remove();
    });
    // Limpa classes e estilos residuais do body
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');

    // Limpa container de modais de pedidos
    var modalContainer = document.getElementById('modal-pedidos-container');
    if (modalContainer) {
        modalContainer.innerHTML = '';
        delete modalContainer.dataset.loaded;
    }
}

window.loadPage = async function (page, title, subtitle) {
    var container  = document.getElementById('router-view');
    var headerEl   = document.getElementById('page-header');
    var titleEl    = document.getElementById('page-title');
    var subtitleEl = document.getElementById('page-subtitle');

    if (!container) return;

    // ── Reset de estado global ──
    if (typeof window.AppRDO !== 'undefined' &&
        typeof window.AppRDO.resetState === 'function') {
        window.AppRDO.resetState();
    }

    // ── Lista de páginas que possuem header próprio ──
    var paginasComHeaderProprio = ['pedidos'];
    var esconderHeader = paginasComHeaderProprio.indexOf(page) !== -1;

    // ── Controle do header do layout principal ──
    // Usa !important para vencer o "display: flex" da classe .top-navbar
    if (headerEl) {
        if (esconderHeader) {
            headerEl.setAttribute('style', 'display: none !important');
        } else {
            headerEl.removeAttribute('style');
        }
    }

    // Seta título/subtítulo para páginas que usam o header do layout
    if (!esconderHeader) {
        if (titleEl) titleEl.innerText = title || '';
        if (subtitleEl) subtitleEl.innerText = subtitle || '';
    }

    // ── Ajuste do padding do router-view ──
    if (esconderHeader) {
        container.style.paddingTop = '0';
    } else {
        container.style.paddingTop = '';
    }

    // ── Carregamento da página ──
    try {
        var response = await fetch('pages/' + page + '/' + page + '.html');
        if (!response.ok) throw new Error('HTTP ' + response.status);

        container.innerHTML = await response.text();

        if (typeof window.atualizarAvatar === 'function') {
            window.atualizarAvatar();
        }

        // ── Inicialização específica por página ──
        switch (page) {
            case 'chat':
                setTimeout(async function () {
                    if (typeof window.carregarDados === 'function') {
                        await window.carregarDados();
                    }
                }, 50);
                break;

            case 'pedidos':
                setTimeout(async function () {
                    if (typeof window.initPedidos === 'function') {
                        await window.initPedidos();
                    }
                }, 50);
                break;

            case 'bot':
                if (typeof window.initBot === 'function') {
                    window.initBot();
                }
                break;

            case 'admin':
            case 'administracao':
                if (typeof window.initAdmin === 'function') {
                    window.initAdmin();
                }
                break;
        }

    } catch (err) {
        container.innerHTML =
            '<div class="alert alert-danger m-3 rounded-3">' +
            '<i class="bi bi-exclamation-triangle me-2"></i>' +
            'Erro ao carregar módulo. Tente novamente.' +
            '</div>';
    }
};

window.loadModal = async function (arquivo) {
    var container = document.getElementById('modal-container');
    if (!container) return false;

    _cleanupModais();
    container.innerHTML = '';

    try {
        var res = await fetch('pages/chat/' + arquivo);
        if (!res.ok) return false;
        var html = await res.text();
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

        for (var i = 0; i < scriptsSrc.length; i++) {
            await _carregarScriptExterno(scriptsSrc[i]);
        }

        scriptsInline.forEach(function (code) {
            try {
                var scriptEl = document.createElement('script');
                scriptEl.textContent = code;
                document.body.appendChild(scriptEl);
                setTimeout(function () {
                    if (scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
                }, 100);
            } catch (_) {}
        });

        return true;
    } catch (e) {
        container.innerHTML = '';
        return false;
    }
};

function _carregarScriptExterno(src) {
    return new Promise(function (resolve) {
        var jaExiste = document.querySelector('script[src="' + src + '"]');
        if (jaExiste) { resolve(); return; }
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = function () { resolve(); };
        script.onerror = function () { resolve(); };
        document.body.appendChild(script);
    });
}

window.atualizarAvatar = function () {
    var imgElement = document.getElementById('user-avatar-img');
    var iconElement = document.getElementById('user-avatar-icon');
    var imagem = localStorage.getItem('imagem');
    if (!imgElement || !iconElement) return;
    var isValid = imagem && imagem !== 'null' && imagem !== 'undefined' && imagem.trim().length > 0;
    imgElement.style.display = isValid ? 'block' : 'none';
    iconElement.style.display = isValid ? 'none' : 'block';
    if (isValid) {
        imgElement.src = imagem;
        imgElement.onerror = function () {
            imgElement.style.display = 'none';
            iconElement.style.display = 'block';
        };
    }
};
