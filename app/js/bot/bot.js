window.initBot = async () => {
    window.botState = { cache: [] };
    const masterStatus = localStorage.getItem('bot_master_active') === 'true';
    window.updateMasterUI(masterStatus);
    await window.reloadBot();
};

window.reloadBot = async () => {
    try {
        const data = await window.API.call('getbotconfig');
        window.botState.cache = Array.isArray(data) ? data : [];
        const tbody = document.getElementById('bot-list');
        if (!tbody) return;
        
        tbody.innerHTML = window.botState.cache.map(i => `
            <tr>
                <td><input type="checkbox" class="form-check-input" value="${i.id}"></td>
                <td><input type="checkbox" class="form-check-input" ${String(i.status) === 'true' ? 'checked' : ''} onchange="window.alterarStatusDireto('${i.id}', this.checked)"></td>
                <td><img src="${i.imagem || ''}" width="30" class="rounded-circle border"></td>
                <td><span class="fw-bold">${i.username}</span></td>
                <td><span class="badge bg-light text-dark border">${i.tipo}</span></td>
                <td>
                    <button type="button" class="btn btn-sm btn-outline-info" onclick="window.abrirModalForm('${i.id}')">
                        Editar
                    </button>
                </td>
            </tr>`).join('');
    } catch (e) { console.error("Erro ao carregar:", e); }
};

window.toggleMaster = async () => {
    const currentState = localStorage.getItem('bot_master_active') === 'true';
    const newState = !currentState;
    await window.API.call('updateallbotstatus', { status: String(newState) });
    localStorage.setItem('bot_master_active', newState);
    window.updateMasterUI(newState);
    await window.reloadBot();
};

window.updateMasterUI = (isActive) => {
    const btn = document.getElementById('btn-status-bot');
    if (!btn) return;
    btn.className = isActive ? "btn btn-sm btn-info text-white" : "btn btn-sm btn-outline-info";
    btn.innerHTML = isActive ? 'MASTER ON' : 'MASTER OFF';
};

window.abrirModalForm = (id = '') => {
    const form = document.getElementById('form-bot-config');
    if (form) form.reset();
    document.getElementById('bot-id').value = id;
    const modalEl = document.getElementById('modalBotForm');
    if (modalEl) new bootstrap.Modal(modalEl).show();
};

window.alterarStatusDireto = async (id, status) => {
    await window.API.call('updatebotconfig', { id, status: String(status) });
};
