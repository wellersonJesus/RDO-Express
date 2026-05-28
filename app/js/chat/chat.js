window.chatState = window.chatState || { currentName: null };

window.carregarDados = async () => {
    window.SyncBotUtils.toggleSpin('sync-icon-chat', true);
    try {
        const bots = await window.SyncBotUtils.fetchBots();
        // Lógica de renderização aqui usando 'bots'
        console.log("Dados carregados no chat:", bots);
    } finally {
        window.SyncBotUtils.toggleSpin('sync-icon-chat', false);
    }
};

window.selecionarChat = async (nome, imagem) => {
    window.chatState.currentName = nome;
    document.getElementById('chat-header-name').innerText = nome;
    document.getElementById('chat-header-avatar').innerHTML = `<img src="${imagem}" class="rounded-circle border" width="40" height="40">`;
    document.getElementById('menu-opcoes-chat').style.display = 'block';
};