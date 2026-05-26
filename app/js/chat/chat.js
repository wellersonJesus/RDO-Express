if (!window.chatState) window.chatState = { currentName: null };

async function carregarDados() {
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    const listAtend = document.getElementById('lista-atendentes-chat');
    const listGrupos = document.getElementById('lista-grupos-chat');
    
    // Inicia animação
    icon.classList.add('loading-sync');
    text.innerText = "Atualizando...";

    try {
        const configs = await API.call('getbotconfig') || [];
        
        listAtend.innerHTML = configs.filter(c => c.tipo !== 'grupo').map(renderItem).join('');
        listGrupos.innerHTML = configs.filter(c => c.tipo === 'grupo').map(renderItem).join('');
        
        if (window.chatState.currentName) {
            carregarMensagensBanco(window.chatState.currentName);
        }
    } catch (e) {
        console.error("Erro ao carregar lista:", e);
    } finally {
        // Finaliza animação
        text.innerText = "Serviço Ativo";
        icon.classList.remove('loading-sync');
    }
}

function renderItem(u) {
    const isActive = window.chatState.currentName === u.username;
    return `
    <button onclick="selecionarChat('${u.username}', '${u.imagem}')" 
            class="list-group-item list-group-item-action ${isActive ? 'bg-danger text-white' : ''} d-flex align-items-center px-3 py-2 border-0">
        <img src="${u.imagem || 'https://via.placeholder.com/40'}" class="rounded-circle me-3" width="35" height="35">
        <div><span class="fw-bold small d-block">${u.username}</span></div>
    </button>`;
}

async function selecionarChat(nome, imagem) {
    window.chatState.currentName = nome;
    document.getElementById('chat-header-name').innerText = nome;
    document.getElementById('chat-header-avatar').innerHTML = `<img src="${imagem}" class="rounded-circle border" width="40" height="40">`;
    document.getElementById('menu-opcoes-chat').style.display = 'block';
    
    // Atualiza visualmente a lista para marcar o ativo
    carregarDados(); 
    carregarMensagensBanco(nome);
}

async function carregarMensagensBanco(nome) {
    const res = await API.call('getmensagens_chat') || [];
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const filtradas = res.filter(m => String(m.jid_numero).includes(nome));
    container.innerHTML = filtradas.map(m => `
        <div class="msg-bubble ${String(m.finalizado) === 'true' ? 'msg-logistics' : ''}" 
             onclick="abrirEdicaoStatus('${m.id}', '${m.status_emoji}', '${m.motoboy}')">
            ${String(m.finalizado) === 'true' ? `<div class="reaction-badge-floating">${m.status_emoji || '⏳'}</div>` : ''}
            <div style="white-space: pre-wrap; font-size: 0.85rem;">${m.texto}</div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

// Inicialização
carregarDados();