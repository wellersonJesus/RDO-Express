window.checkMaster = function () {
    try {
        var status = localStorage.getItem('bot_master_active');
        return status === 'true';
    } catch (err) {
        return false;
    }
};

window.AppRDO = {
    isFetching: false,
    listaCarregada: false,
    clienteId: null,
    pedidosCache: [],
    resetState: function () {
        window.AppRDO.isFetching = false;
        window.AppRDO.listaCarregada = false;
        if (window.botState) window.botState.isFetching = false;
        if (window.pedidosState) {
            window.pedidosState.isFetching = false;
            window.pedidosState.loopAtivo = false;
            if (window.pedidosState.intervaloId) {
                clearInterval(window.pedidosState.intervaloId);
                window.pedidosState.intervaloId = null;
            }
        }
        if (window.adminState) window.adminState.isFetching = false;
    }
};

window.loadPage = async function (page, title, subtitle) {
    var container = document.getElementById('router-view');
    var titleEl = document.getElementById('page-title');
    var subtitleEl = document.getElementById('page-subtitle');
    if (!container) return;
    if (window.AppRDO && typeof window.AppRDO.resetState === 'function') {
        window.AppRDO.resetState();
    }
    if (titleEl) titleEl.innerText = title;
    if (subtitleEl) subtitleEl.innerText = subtitle;
    try {
        var response = await fetch('pages/' + page + '/' + page + '.html');
        if (!response.ok) throw new Error('Erro ao carregar página: ' + page);
        container.innerHTML = await response.text();
        if (window.atualizarAvatar) window.atualizarAvatar();
        if (page === 'chat') {
            setTimeout(async function () {
                await window.carregarDados();
            }, 50);
        }
        if (page === 'pedidos') {
            setTimeout(async function () {
                if (typeof window.initPedidos === 'function') {
                    await window.initPedidos();
                }
            }, 50);
        }
        if (page === 'bot' && typeof window.initBot === 'function') {
            window.initBot();
        }
    } catch (err) {
        console.error('[Navegação]:', err);
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar módulo. Tente novamente.</div>';
    }
};

/**
 * Carrega um modal HTML dinâmico de pages/chat/ e injeta no #modal-container.
 * ⚠ Executa <script> tags injetados (necessário para Leaflet e outros).
 * 
 * @param {string} arquivo - Nome do arquivo (ex: 'mapa_clientes.html')
 * @returns {Promise<boolean>} true se carregou com sucesso
 */
window.loadModal = async function (arquivo) {
    var container = document.getElementById('modal-container');
    if (!container) {
        console.error('loadModal: #modal-container não encontrado no DOM.');
        return false;
    }

    // ── 1. Fecha qualquer modal aberto e limpa backdrops ──
    document.querySelectorAll('.modal.show').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) {
            try { inst.hide(); } catch (_) {}
        }
    });
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');

    // ── 2. Limpa container ──
    container.innerHTML = '';

    try {
        var res = await fetch('pages/chat/' + arquivo);

        // ── 3. Se o arquivo não existe (404) ──
        if (!res.ok) {
            console.error('loadModal: fetch falhou → HTTP ' + res.status + ' para "' + arquivo + '"');
            return false;
        }

        var html = await res.text();

        // ── 4. HTML vazio ──
        if (!html || html.trim().length === 0) {
            console.error('loadModal: HTML vazio para "' + arquivo + '"');
            return false;
        }

        // ── 5. Validação: deve conter um modal Bootstrap ──
        if (html.indexOf('class="modal') === -1) {
            console.error('loadModal: HTML não contém modal válido para "' + arquivo + '"');
            return false;
        }

        // ── 6. Remove tags <link> que possam causar re-render ──
        html = html.replace(/<link[^>]*>/gi, '');

        // ── 7. Separa os <script> do HTML antes de injetar ──
        //    innerHTML NÃO executa <script> — precisamos injetá-los manualmente
        var scriptsSrc = [];   // Scripts externos (com src)
        var scriptsInline = []; // Scripts inline (com conteúdo)

        html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, function (match, attrs, content) {
            var srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
            if (srcMatch) {
                scriptsSrc.push(srcMatch[1]);
            } else if (content.trim()) {
                scriptsInline.push(content.trim());
            }
            return ''; // Remove do HTML — será injetado depois
        });

        // ── 8. Injeta o HTML (sem scripts) ──
        container.innerHTML = html;

        // ── 9. Carrega scripts EXTERNOS em sequência (aguarda cada um) ──
        for (var i = 0; i < scriptsSrc.length; i++) {
            await _carregarScriptExterno(scriptsSrc[i]);
        }

        // ── 10. Executa scripts INLINE ──
        scriptsInline.forEach(function (code) {
            try {
                var scriptEl = document.createElement('script');
                scriptEl.textContent = code;
                document.body.appendChild(scriptEl);
                // Remove após execução para não poluir
                setTimeout(function () {
                    if (scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
                }, 100);
            } catch (err) {
                console.warn('loadModal: erro em script inline →', err);
            }
        });

        return true;

    } catch (e) {
        console.error('loadModal: exceção →', e);
        container.innerHTML = '';
        return false;
    }
};

/**
 * Carrega um script externo via <script src="...">.
 * Retorna Promise que resolve quando o script carrega, 
 * ou resolve silenciosamente se já está no DOM.
 * 
 * @param {string} src - URL do script
 * @returns {Promise<void>}
 */
function _carregarScriptExterno(src) {
    return new Promise(function (resolve) {
        // Evita carregar duplicado (ex: Leaflet já carregado)
        var jaExiste = document.querySelector('script[src="' + src + '"]');
        if (jaExiste) {
            resolve();
            return;
        }

        var script = document.createElement('script');
        script.src = src;
        script.async = false; // Garante ordem de execução

        script.onload = function () {
            resolve();
        };
        script.onerror = function () {
            console.warn('loadModal: falhou ao carregar script →', src);
            resolve(); // Não bloqueia o fluxo
        };

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
