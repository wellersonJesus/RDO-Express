(function() {
    window.botState = { cache: [] };

    const getTipoStyle = (tipo) => {
        const t = (tipo || '').toLowerCase();
        if (t.includes('atendente')) return 'background-color: #fce4ec; color: #c2185b;';
        if (t.includes('grupo')) return 'background-color: #f5f5f5; color: #616161;';
        if (t.includes('sre')) return 'background-color: #e3f2fd; color: #1976d2;';
        if (t.includes('financeiro')) return 'background-color: #e8f5e9; color: #388e3c;';
        return 'background-color: #eee; color: #333;';
    };

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
            
            tbody.innerHTML = window.botState.cache.map(i => {
                const isChecked = String(i.status) === 'true';
                return `
                <tr class="border-bottom">
                    <td class="ps-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''} 
                            onchange="window.alterarStatusDireto('${i.id}', this.checked)">
                        </div>
                    </td>
                    <td><img src="${i.imagem || 'assets/default.png'}" width="30" class="rounded-circle border"></td>
                    <td><small class="text-muted" style="font-size: 0.85rem;">${i.username || 'N/A'}</small></td>
                    <td><span class="badge rounded-pill px-2" style="${getTipoStyle(i.tipo)} font-size: 0.65rem;">${i.tipo || 'Operador'}</span></td>
                    <td class="text-end pe-3">
                        <button class="btn btn-light btn-sm text-secondary" onclick="window.abrirModalForm('${i.id}')">
                            <i class="bi bi-pencil-square"></i>
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
        if (btn) {
            btn.innerText = isActive ? 'MASTER ON' : 'MASTER OFF';
            btn.className = isActive ? "btn btn-danger btn-sm rounded-pill px-3" : "btn btn-outline-danger btn-sm rounded-pill px-3";
        }
    };

    window.alterarStatusDireto = async (id, status) => {
        await window.API.call('updatebotconfig', { id, status: String(status) });
    };
})();
