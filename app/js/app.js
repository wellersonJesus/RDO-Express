window.checkMaster = () => {
    try {
        const status = localStorage.getItem('bot_master_active');
        return status === 'true';
    } catch (err) {
        console.error("[Maestro] Erro ao acessar localStorage:", err);
        return false; // Default seguro: sistema desligado em caso de erro
    }
};

window.AppRDO = {
    isFetching: false,
    listaCarregada: false,
    clienteId: null,
    resetState: () => {
        window.AppRDO.isFetching = false;
        window.AppRDO.listaCarregada = false;
        // Opcional: Limpar estados globais de outros módulos ao trocar de página
        if (window.botState) window.botState.isFetching = false;
        if (window.pedidosState) window.pedidosState.isFetching = false;
        if (window.adminState) window.adminState.isFetching = false;
    }
};

window.loadPage = async function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    
    if (!container) return;

    // 1. Limpeza e Reset de estado
    if (window.AppRDO && typeof window.AppRDO.resetState === 'function') {
        window.AppRDO.resetState();
    }
    
    if (titleEl) titleEl.innerText = title;
    if (subtitleEl) subtitleEl.innerText = subtitle;

    try {
        // 2. Carregamento do conteúdo
        const response = await fetch(`pages/${page}/${page}.html`);
        if (!response.ok) throw new Error(`Erro ao carregar página: ${page}`);
        
        container.innerHTML = await response.text();

        // 3. Pós-renderização e Inicialização
        if (window.atualizarAvatar) window.atualizarAvatar();

        // 4. Mapeamento de inicialização por página
        if (page === 'chat') {
            // Pequeno delay para garantir que o DOM esteja montado
            setTimeout(async () => {
                await window.carregarDados();
            }, 50);
        }
        
        // Outros módulos (exemplo)
        if (page === 'bot' && typeof window.initBot === 'function') window.initBot();
        
    } catch (err) {
        console.error("[Navegação]:", err);
        container.innerHTML = `<div class="alert alert-danger">Erro ao carregar módulo. Tente novamente.</div>`;
    }
};

window.loadModal = async function(arquivo) {
    try {
        const res = await fetch(`pages/chat/${arquivo}`);
        const html = await res.text();
        const container = document.getElementById('modal-container');
        if (container) container.innerHTML = html;
    } catch (e) {
        console.error("Erro ao carregar modal:", e);
    }
};

window.atualizarAvatar = () => {
    const imgElement = document.getElementById('user-avatar-img');
    const iconElement = document.getElementById('user-avatar-icon');
    const imagem = localStorage.getItem('imagem');

    if (!imgElement || !iconElement) return;

    const isValid = imagem && imagem !== 'null' && imagem !== 'undefined' && imagem.trim().length > 0;

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