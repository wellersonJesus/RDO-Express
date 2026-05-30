async function initChatContacts() {
    const chatContactList = document.getElementById('chat-contact-list');
    if (!chatContactList) return;

    // 1. Validação do status Master (mesma chave usada no bot.js)
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';

    if (!isMasterOn) {
        chatContactList.innerHTML = `
            <div class="p-4 text-center text-muted">
                <i class="bi bi-lock-fill fs-2 d-block mb-2"></i>
                <p>Sistema Master desligado.<br>Contatos indisponíveis.</p>
            </div>`;
        return;
    }

    // 2. Busca os dados de clientes (mesma API do bot)
    try {
        const clientes = await API.call('getclientes');
        renderizarLista(clientes);
    } catch (error) {
        console.error("Erro ao sincronizar clientes para o chat:", error);
    }
}

function renderizarLista(lista) {
    const container = document.getElementById('chat-contact-list');
    
    container.innerHTML = lista.map(item => {
        // Lógica de Status: Verifica se o status é 'true' (string ou booleano)
        const isOnline = String(item.status).toUpperCase() === 'TRUE';
        const statusCor = isOnline ? 'bg-success' : 'bg-secondary';
        const statusTexto = isOnline ? 'Online' : 'Offline';

        return `
            <div class="list-group-item d-flex align-items-center border-0 p-3 shadow-sm mb-2 rounded-3" 
                 onclick="selecionarChat('${item.id}')" style="cursor: pointer;">
                
                <div class="position-relative me-3">
                    <img src="${item.imagem || 'assets/default-user.png'}" 
                         class="rounded-circle" width="45" height="45" style="object-fit:cover;">
                    <span class="position-absolute bottom-0 end-0 border border-white rounded-circle ${statusCor}" 
                          style="width: 12px; height: 12px;"></span>
                </div>
                
                <div class="flex-grow-1">
                    <h6 class="mb-0 fw-bold">${item.nome || 'Cliente'}</h6>
                    <small class="text-muted">${statusTexto}</small>
                </div>
            </div>
        `;
    }).join('');
}

window.selecionarChat = (id) => {
    console.log("Abrindo chat com ID:", id);
    // Aqui você chama sua lógica de carregar as mensagens do cliente selecionado
};

document.addEventListener('DOMContentLoaded', () => {
    initChatContacts();
});

async function carregarDados() {
    const listEl = document.getElementById('lista-contatos-chat');
    const syncIcon = document.getElementById('sync-icon-chat');
    
    if (!listEl) return;
    if (syncIcon) syncIcon.classList.add('spinner-rotate');

    try {
        const clientes = await API.call('getclientes') || [];
        
        // Regra de Negócio: Check do Master Bot
        const isMasterOn = localStorage.getItem('bot_master_active') === 'true';

        listEl.innerHTML = clientes.map(c => {
            // Se Master ON, usa o status real do banco. Se Master OFF, força FALSE (Offline)
            const statusReal = String(c.status).toUpperCase() === 'TRUE';
            const isOnline = isMasterOn ? statusReal : false;
            
            const statusText = isOnline ? 'Online' : 'Offline';
            const statusColor = isOnline ? '#28a745' : '#adb5bd';

            return `
                <div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean" 
                     onclick="abrirConversa('${c.id}')">
                    <div class="position-relative">
                        <img src="${c.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" 
                             class="rounded-circle img-avatar-small">
                        <span class="position-absolute bottom-0 end-0 rounded-circle border border-white status-dot" 
                              style="background-color: ${statusColor};"></span>
                    </div>
                    <div class="ms-3 overflow-hidden">
                        <div class="contact-name text-truncate">${c.nome || c.username || 'Sem nome'}</div>
                        <div class="contact-status">${statusText}</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Erro ao carregar lista:", e);
    } finally {
        if (syncIcon) syncIcon.classList.remove('spinner-rotate');
    }
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', carregarDados);