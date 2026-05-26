(function() {
    window.botState = { cache: [] };

    window.initBot = async () => {
        const masterStatus = localStorage.getItem('bot_master_active') === 'true';
        window.updateMasterUI(masterStatus);
        await window.reloadBot();
    };

    window.reloadBot = async () => {
        const tbody = document.getElementById('bot-list');
        if (!tbody) return;

        try {
            const data = await window.API.call('getbotconfig');
            window.botState.cache = Array.isArray(data) ? data : [];
            const masterStatus = localStorage.getItem('bot_master_active') === 'true';

            tbody.innerHTML = window.botState.cache.map(i => {
                const isChecked = String(i.status) === 'true';
                return `
                <tr class="border-bottom">
                    <td class="ps-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" role="switch" ${isChecked ? 'checked' : ''} 
                            onchange="window.alterarStatusDireto('${i.id}', this.checked)" style="background-color: ${isChecked ? '#FF0000' : ''}; border-color: #FF0000;">
                        </div>
                    </td>
                    <td><img src="${i.imagem || 'assets/default.png'}" width="35" class="rounded-circle border" style="border-color:#dee2e6!important"></td>
                    <td><span class="fw-semibold text-dark">${i.username || 'N/A'}</span></td>
                    <td><span class="badge rounded-pill" style="background-color: #f8d7da; color: #FF0000;">${i.tipo || 'Operador'}</span></td>
                    <td class="text-end pe-3">
                        <button class="btn btn-sm btn-link text-decoration-none text-danger" onclick="window.abrirModalForm('${i.id}')">
                            EDITAR
                        </button>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) {
            console.error("Erro ao carregar bots:", e);
        }
    };

    window.toggleMaster = async () => {
        const newState = !(localStorage.getItem('bot_master_active') === 'true');
        await window.API.call('updateallbotstatus', { status: String(newState) });
        localStorage.setItem('bot_master_active', newState);
        window.updateMasterUI(newState);
        await window.reloadBot();
    };

    window.updateMasterUI = (isActive) => {
        const btn = document.getElementById('btn-status-bot');
        if (!btn) return;
        btn.innerText = isActive ? 'MASTER ON' : 'MASTER OFF';
        btn.className = isActive ? "btn btn-danger rounded-pill px-4" : "btn btn-outline-danger rounded-pill px-4";
    };

    window.alterarStatusDireto = async (id, status) => {
        await window.API.call('updatebotconfig', { id, status: String(status) });
    };

    window.abrirModalForm = (id = '') => {
        console.log("Abrindo modal para:", id);
    };

    window.initBot();
})();