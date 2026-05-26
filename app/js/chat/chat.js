// --- 1. ESTADO GLOBAL ---
if (!window.chatState) window.chatState = { currentName: null };
window.map = null;

// --- 2. MAPA (Integrado ao Bootstrap Modal) ---
function inicializarMapaGlobal() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv || window.map) return;
    
    window.map = L.map('map').setView([-19.9167, -43.9345], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(window.map);
}

// Inicia o mapa quando o modal abrir
document.getElementById('modalMaps')?.addEventListener('shown.bs.modal', () => {
    inicializarMapaGlobal();
    window.map.invalidateSize();
});

// --- 3. CORE DO CHAT ---
async function carregarDados() {
    const listAtend = document.getElementById('lista-atendentes-chat');
    const listGrupos = document.getElementById('lista-grupos-chat');
    
    if (!listAtend) return; // Garante que a página do chat esteja ativa antes de rodar

    try {
        const configs = await API.call('getbotconfig') || [];
        listAtend.innerHTML = configs.filter(c => c.tipo !== 'grupo').map(renderItem).join('');
        listGrupos.innerHTML = configs.filter(c => c.tipo === 'grupo').map(renderItem).join('');
        
        if (window.chatState.currentName) {
            carregarMensagensBanco(window.chatState.currentName);
        }
    } catch (e) { console.error("Erro ao carregar lista de chats:", e); }
}

function renderItem(u) {
    const isActive = window.chatState.currentName === u.username;
    return `
    <button onclick="selecionarChat('${u.username}', '${u.imagem}')" 
            class="list-group-item list-group-item-action ${isActive ? 'bg-danger text-white' : ''} d-flex align-items-center px-2 py-2 border-0">
        <img src="${u.imagem || 'https://via.placeholder.com/40'}" class="rounded-circle me-3" width="38" height="38">
        <div><span class="fw-bold small d-block">${u.username}</span></div>
    </button>`;
}

async function selecionarChat(nome, imagem) {
    window.chatState.currentName = nome;
    document.getElementById('chat-header-name').innerText = nome;
    document.getElementById('chat-header-avatar').innerHTML = `<img src="${imagem}" class="rounded-circle border" width="40" height="40">`;
    document.getElementById('menu-opcoes-chat').style.display = 'block';
    
    carregarMensagensBanco(nome);
    // Removemos o 'carregarDados()' aqui para evitar loop desnecessário
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

// --- 4. INICIALIZAÇÃO IMEDIATA ---
// Como este script é injetado, ele roda assim que o navegador lê o arquivo
carregarDados();
console.log("Chat RDO carregado com sucesso.");