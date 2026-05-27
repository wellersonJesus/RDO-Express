(function () {
    window.botState = { cache: [] };

    window.initBot = async () => {
        await window.reloadBot();
    };

    window.reloadBot = async () => {
        const tbody = document.getElementById('bot-list');
        if (!tbody) return;

        try {
            const data = await window.API.call('getbotconfig');
            window.botState.cache = Array.isArray(data) ? data : [];

            const masterStatus = localStorage.getItem('bot_master_active') === 'true';
            window.updateMasterUI(masterStatus);

            // Sincroniza o localStorage com o estado real de cada bot, 
            // SOMENTE se não estivermos no modo Master OFF (para não salvar 'false' falso)
            if (masterStatus) {
                const snapshot = {};
                window.botState.cache.forEach(i => {
                    snapshot[i.id] = String(i.status) === 'true';
                });
                localStorage.setItem('last_real_status', JSON.stringify(snapshot));
            }

            tbody.innerHTML = window.botState.cache.map(i => {
                const isChecked = String(i.status) === 'true';
                return `
    <tr class="border-bottom" id="row-${i.id}" style="${!masterStatus ? 'opacity: 0.5;' : ''}">
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
            <button class="btn btn-light btn-sm me-2" onclick="window.editarBot('${i.id}')">
                <i class="bi bi-pencil-square"></i>
            </button>            
        </td>
    </tr>`;
            }).join('');
        } catch (e) { console.error("Erro ao carregar:", e); }
    };

    window.toggleMaster = async () => {
        const currentMaster = localStorage.getItem('bot_master_active') === 'true';
        const newMasterState = !currentMaster;

        try {
            if (newMasterState === false) {
                // DESLIGANDO: Apenas manda desligar na planilha
                await window.API.call('updatebotconfig', { id: 'MASTER', status: 'FALSE' });
            } else {
                // LIGANDO: Recupera o estado real de cada um que salvamos anteriormente
                const savedStatus = JSON.parse(localStorage.getItem('last_real_status') || '{}');

                // Aplica a restauração individual baseada no que estava salvo antes do Master desligar
                for (const i of window.botState.cache) {
                    const statusAnterior = savedStatus[i.id] !== undefined ? savedStatus[i.id] : true;
                    await window.API.call('updatebotconfig', {
                        id: i.id,
                        status: String(statusAnterior).toUpperCase()
                    });
                }
            }

            localStorage.setItem('bot_master_active', newMasterState);
            window.updateMasterUI(newMasterState);

            // Pequeno delay para o GAS processar
            await new Promise(r => setTimeout(r, 800));
            await window.reloadBot();
        } catch (e) {
            console.error("Erro ao alternar Master:", e);
        }
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
        // Atualiza o snapshot caso o usuário mude um bot individualmente enquanto o master está ON
        const savedStatus = JSON.parse(localStorage.getItem('last_real_status') || '{}');
        savedStatus[id] = status;
        localStorage.setItem('last_real_status', JSON.stringify(savedStatus));
    };
})();