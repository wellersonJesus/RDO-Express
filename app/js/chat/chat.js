// Estado Global
if (!window.chatState) window.chatState = { currentName: null };

// Função única e completa de Sincronização
async function carregarDados() {
    const icon = document.getElementById('sync-icon');
    const text = document.getElementById('sync-text');
    
    // Inicia animação
    icon.classList.add('loading-sync');
    text.innerText = "Atualizando...";

    try {
        const configs = await API.call('getbotconfig') || [];
        const listAtend = document.getElementById('lista-atendentes-chat');
        const listGrupos = document.getElementById('lista-grupos-chat');

        // Renderização dos itens
        listAtend.innerHTML = configs.filter(c => c.tipo !== 'grupo').map(renderItem).join('');
        listGrupos.innerHTML = configs.filter(c => c.tipo === 'grupo').map(renderItem).join('');

        // Se houver um chat aberto, mantém as mensagens carregadas
        if (window.chatState.currentName) {
            await carregarMensagensBanco(window.chatState.currentName);
        }
    } catch (e) {
        console.error("Erro ao carregar lista:", e);
    } finally {
        // Remove animação após 800ms para dar feedback de conclusão
        setTimeout(() => {
            text.innerText = "Serviço Ativo";
            icon.classList.remove('loading-sync');
        }, 800);
    }
}

function renderItem(u) {
    const isActive = window.chatState.currentName === u.username;
    return `
    <button onclick="selecionarChat('${u.username}', '${u.imagem}')" 
            class="list-group-item list-group-item-action ${isActive ? 'bg-danger text-white' : ''} d-flex align-items-center px-3 py-2 border-0">
        <img src="${u.imagem || 'https://via.placeholder.com/40'}" class="rounded-circle me-3" width="35" height="35">
        <span class="fw-bold small">${u.username}</span>
    </button>`;
}

async function selecionarChat(nome, imagem) {
    window.chatState.currentName = nome;
    
    // Atualiza cabeçalho
    document.getElementById('chat-header-name').innerText = nome;
    document.getElementById('chat-header-avatar').innerHTML = `<img src="${imagem}" class="rounded-circle border" width="40" height="40">`;
    document.getElementById('menu-opcoes-chat').style.display = 'block';

    // Atualiza a seleção visual na lista sem rodar o sync completo (para ficar rápido)
    const items = document.querySelectorAll('.list-group-item');
    items.forEach(i => i.classList.remove('bg-danger', 'text-white'));
    
    await carregarMensagensBanco(nome);
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
document.addEventListener('DOMContentLoaded', carregarDados);