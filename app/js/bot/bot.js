(function () {
    window.botState = { cache: [] };

    // Estilização das Badges
    const getTipoStyle = (tipo) => {
        const t = (tipo || '').toLowerCase();
        if (t.includes('atendente')) return 'background-color: #fce4ec; color: #c2185b;';
        if (t.includes('grupo')) return 'background-color: #e5e5e5; color: #616161;';
        if (t.includes('sre')) return 'background-color: #d1e7dd; color: #055160;';
        if (t.includes('financeiro')) return 'background-color: #d1e7dd; color: #0f5132;';
        return 'background-color: #eee; color: #333;';
    };

    // Botão de Loop: Apenas recarrega dados
    window.initBot = async () => {
        const icon = document.querySelector('button[onclick="window.initBot()"] i');
        if (icon) icon.classList.add('spinner-rotate');
        await window.reloadBot();
        if (icon) icon.classList.remove('spinner-rotate');
    };

    window.reloadBot = async () => {
        const tbody = document.getElementById('bot-list');
        if (!tbody) return;

        try {
            const data = await window.API.call('getbotconfig');
            window.botState.cache = Array.isArray(data) ? data : [];
            const masterStatus = localStorage.getItem('bot_master_active') === 'true';
            
            window.updateMasterUI(masterStatus);

            tbody.innerHTML = window.botState.cache.map(i => {
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
                    <td><span class="badge rounded-pill px-2" style="${getTipoStyle(i.tipo)}">${i.tipo || 'Operador'}</span></td>
                    <td class="text-end pe-3">
                        <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) { console.error("Erro no reload:", e); }
    };

    // Botão Master: Controla o estado global
    window.toggleMaster = async () => {
        const currentStatus = localStorage.getItem('bot_master_active') === 'true';
        const newState = !currentStatus;
        
        try {
            // Chamada direta para o backend com ID MASTER
            await window.API.call('updatebotconfig', { id: 'MASTER', status: String(newState).toUpperCase() });
            localStorage.setItem('bot_master_active', newState);
            window.updateMasterUI(newState);
            await window.reloadBot();
        } catch (e) { console.error("Erro no Master:", e); }
    };

    window.updateMasterUI = (isActive) => {
        const btn = document.getElementById('btn-status-bot');
        if (btn) {
            btn.innerText = isActive ? 'MASTER ON' : 'MASTER OFF';
            btn.className = isActive ? "btn btn-danger btn-sm rounded-pill px-3" : "btn btn-outline-danger btn-sm rounded-pill px-3";
        }
    };

    window.alterarStatusDireto = async (id, status) => {
        await window.API.call('updatebotconfig', { id, status: String(status).toUpperCase() });
    };

    window.addEventListener('DOMContentLoaded', () => window.reloadBot());
})();