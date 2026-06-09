window.checkMaster = () => {
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
    resetState: () => {
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

window.loadModal = async function (arquivo) {
    try {
        var res = await fetch('pages/chat/' + arquivo);
        var html = await res.text();
        var container = document.getElementById('modal-container');
        if (container) container.innerHTML = html;
    } catch (e) {
        console.error('Erro ao carregar modal:', e);
    }
};

window.atualizarAvatar = () => {
    var imgElement = document.getElementById('user-avatar-img');
    var iconElement = document.getElementById('user-avatar-icon');
    var imagem = localStorage.getItem('imagem');

    if (!imgElement || !iconElement) return;

    var isValid = imagem && imagem !== 'null' && imagem !== 'undefined' && imagem.trim().length > 0;

    imgElement.style.display = isValid ? 'block' : 'none';
    iconElement.style.display = isValid ? 'none' : 'block';

    if (isValid) {
        imgElement.src = imagem;
        imgElement.onerror = () => {
            imgElement.style.display = 'none';
            iconElement.style.display = 'block';
        };
    }
};
