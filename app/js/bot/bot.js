window.botState = { cache: [] };

window.updateMasterUI = (isActive) => {
    const btn = document.getElementById('btn-status-bot');
    if (btn) {
        btn.innerText = isActive ? 'MASTER ON' : 'MASTER OFF';
        btn.className = isActive ? "btn btn-danger btn-sm rounded-pill px-3" : "btn btn-outline-danger btn-sm rounded-pill px-3";
    }
};

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    if (!tbody) return;

    window.SyncBotUtils.toggleSpin('sync-icon-bot', true);

    try {
        const bots = await window.SyncBotUtils.fetchBots();
        window.botState.cache = bots;
        const masterStatus = localStorage.getItem('bot_master_active') === 'true';
        window.updateMasterUI(masterStatus);

        tbody.innerHTML = bots.map(i => {
            const isChecked = String(i.status) === 'true';
            return `
            <tr class="border-bottom" style="${!masterStatus ? 'opacity: 0.5;' : ''}">
                <td class="ps-3">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''} 
                        onchange="window.alterarStatusDireto('${i.id}', this.checked)" ${!masterStatus ? 'disabled' : ''}>
                    </div>
                </td>
                <td><img src="${i.imagem || 'assets/default.png'}" width="30" class="rounded-circle border"></td>
                <td><small class="text-muted">${i.username || 'N/A'}</small></td>
                <td><span class="badge rounded-pill px-2">${i.tipo || 'Operador'}</span></td>
                <td class="text-end pe-3">
                    <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error(e); } finally {
        window.SyncBotUtils.toggleSpin('sync-icon-bot', false);
    }
};

window.initBot = () => window.reloadBot();

window.initBot = async () => {
    // 1. Log para debug: se você clicar e isso não aparecer no console, o problema é o HTML
    console.log("Iniciando reload...");

    const icon = document.getElementById('sync-icon-bot');

    // 2. Se o ícone não existir no HTML carregado, a função para aqui
    if (!icon) {
        console.warn("Elemento 'sync-icon-bot' não encontrado na página atual.");
        // Tenta rodar a função mesmo sem o ícone para testar
        await window.reloadBot();
        return;
    }

    // 3. Efeito visual
    icon.classList.add('spinner-rotate');

    try {
        await window.reloadBot();
    } catch (e) {
        console.error("Erro no initBot:", e);
    } finally {
        icon.classList.remove('spinner-rotate');
    }
};

window.toggleMaster = async () => {
    const newState = !(localStorage.getItem('bot_master_active') === 'true');
    try {
        await window.API.call('updatebotconfig', { id: 'MASTER', status: String(newState).toUpperCase() });
        localStorage.setItem('bot_master_active', newState);
        window.updateMasterUI(newState);
        await window.reloadBot();
    } catch (e) { console.error(e); }
};

window.alterarStatusDireto = async (id, status) => {
    await window.API.call('updatebotconfig', { id, status: String(status).toUpperCase() });
};
