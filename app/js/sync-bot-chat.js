/**
 * RDO-Express: Core de Sincronização Bot <-> Chat
 * Mantém o status Master e a reatividade dos atendentes
 */

const BotCore = {
    // 1. Gerenciamento do Status Master (Bot)
    getMasterStatus: () => localStorage.getItem('bot_status') === 'true',
    
    setMasterStatus: (status) => {
        localStorage.setItem('bot_status', status);
        window.dispatchEvent(new Event('storage')); // Notifica outras abas/componentes
    },

    // 2. Lógica de Negócio de Status Individual
    // Define se um item está funcionalmente "Online" no Chat
    isOnline: (item) => {
        const masterActive = BotCore.getMasterStatus();
        const individualActive = String(item.status) === 'true';
        return masterActive && individualActive;
    },

    // 3. Integração com Usuário Logado
    // Verifica se o usuário atual (da sessão) deve ser sincronizado como atendente
    syncLoggedUser: async () => {
        const user = JSON.parse(sessionStorage.getItem('user_logged')); 
        if (!user) return;

        // Se o usuário está logado, garantimos que ele existe na botconfig
        const configs = await API.call('getbotconfig');
        const exists = configs.find(c => c.username === user.username);

        if (!exists) {
            await API.call('addbotconfig', {
                username: user.username,
                jid_numero: user.jid || '0',
                imagem: user.imagem,
                tipo: user.tipo || 'atendente',
                status: 'true'
            });
        }
    }
};

// --- Funções da Página Bot ---

async function salvarBot() {
    const id = document.getElementById('bot-id').value;
    const payload = {
        id,
        username: document.getElementById('bot-username').value,
        jid_numero: document.getElementById('bot-jid').value,
        imagem: document.getElementById('bot-imagem').value,
        tipo: document.getElementById('bot-tipo').value,
        status: document.getElementById('bot-status-val').value
    };
    
    await API.call(id ? 'updatebotconfig' : 'addbotconfig', payload);
    await reloadBot(); // Atualiza lista local
    window.botState.modForm.hide();
}

// --- Funções da Página Chat ---

function renderizarChat(configs) {
    const masterOn = BotCore.getMasterStatus();
    const containerAtendentes = document.getElementById('lista-atendentes-chat');
    const containerGrupos = document.getElementById('lista-grupos-chat');

    if(!containerAtendentes) return;

    // Filtro e Render de Atendentes
    containerAtendentes.innerHTML = configs
        .filter(c => c.tipo.toLowerCase() !== 'grupo')
        .map(u => {
            const online = BotCore.isOnline(u);
            const isSelected = window.chatState.jidSelecionado === u.jid_numero;
            
            return `
            <button onclick="selecionarJid('${u.jid_numero}', '${u.username}', '${u.imagem}', ${online})" 
                    class="list-group-item list-group-item-action border-0 ${isSelected ? 'bg-danger text-white' : ''}"
                    style="${!online ? 'filter: grayscale(1); opacity: 0.7;' : ''}">
                <div class="d-flex align-items-center px-2">
                    <div class="position-relative">
                        <img src="${u.imagem}" class="rounded-circle border me-3" width="38" height="38" style="object-fit:cover">
                        <span class="status-dot ${online ? 'bg-success' : 'bg-secondary'}"></span>
                    </div>
                    <div class="flex-grow-1 text-truncate">
                        <span class="fw-bold d-block small">${u.username}</span>
                        <small class="text-muted" style="font-size:0.65rem">
                            ${online ? 'Disponível' : 'Offline (Bot Desativado)'}
                        </small>
                    </div>
                </div>
            </button>`;
        }).join('');
    
    // Grupos permanecem ativos para pedidos, mas respeitam o Master
    containerGrupos.innerHTML = configs
        .filter(c => c.tipo.toLowerCase() === 'grupo')
        .map(g => {
            const online = masterOn; // Grupo depende apenas do Master Global
            return `
            <button onclick="selecionarJid('${g.jid_numero}', '${g.username}', '${g.imagem}', ${online})" 
                    class="list-group-item list-group-item-action border-0 ${!online ? 'opacity-50' : ''}">
                <div class="d-flex align-items-center px-2">
                    <img src="${g.imagem}" class="rounded-circle border me-3" width="38" height="38" style="object-fit:cover">
                    <span class="fw-bold small">${g.username}</span>
                </div>
            </button>`;
        }).join('');
}