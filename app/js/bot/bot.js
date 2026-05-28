window.botState = { cache: [], currentPage: 1, idEmEdicao: null, origemEmEdicao: null };

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const filtro = document.getElementById('filtro-tipo').value;
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    if (!tbody) return;
    
    document.getElementById('sync-icon-bot').classList.add('bi-arrow-repeat', 'spinner-rotate');
    try {
        const [bots, users, clients, cols] = await Promise.all([window.API.call('getbotconfig'), window.API.call('getusuarios'), window.API.call('getclientes'), window.API.call('getcolaboradores')]);
        const all = [...(bots||[]).map(i=>({...i, origem:'botconfig'})), ...(users||[]).map(i=>({...i, origem:'usuarios'})), ...(clients||[]).map(i=>({...i, origem:'clientes'})), ...(cols||[]).map(i=>({...i, origem:'colaboradores'}))];
        window.botState.cache = (filtro === 'TODOS') ? all : all.filter(b => (b.tipo || b.cargo || '').includes(filtro));
        
        tbody.innerHTML = window.botState.cache.map(i => {
            const isChecked = String(i.status||'').toUpperCase() === 'TRUE' ? 'checked' : '';
            return `<tr>
                <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${isChecked} ${!isMasterOn ? 'disabled' : ''}></div></td>
                <td><img src="${i.imagem||''}" width="30" class="rounded-circle"></td>
                <td><small>${i.username || i.responsavel || 'N/A'}</small></td>
                <td>${i.tipo || i.cargo || ''}</td>
                <td class="text-end pe-3"><button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button> <button class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button></td>
            </tr>`;
        }).join('');
        document.getElementById('btn-status-bot').innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
    } finally { document.getElementById('sync-icon-bot').classList.remove('spinner-rotate'); }
};

window.abrirModalCadastro = () => new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();
window.abrirModalEspecifico = (origem) => { bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo')).hide(); window.botState.origemEmEdicao = origem; new bootstrap.Modal(document.getElementById('modalUsuario')).show(); };
window.salvarNovo = async () => {
    const btn = document.getElementById('btn-save-modal');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
    await window.API.call('add' + window.botState.origemEmEdicao, { 
        username: document.getElementById('u-username').value, 
        password: document.getElementById('u-password').value, 
        imagem: document.getElementById('u-imagem').value, 
        tipo: document.getElementById('u-tipo').value 
    });
    bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
    window.reloadBot();
    btn.innerHTML = "Salvar";
};
window.editarBot = (id) => { const item = window.botState.cache.find(b => b.id == id); window.botState.idEmEdicao = id; window.botState.origemEmEdicao = item.origem; document.getElementById('edit-user').value = item.username || item.responsavel || ''; new bootstrap.Modal(document.getElementById('modalEdicao')).show(); };
window.confirmarEdicao = async () => { await window.API.call('update' + window.botState.origemEmEdicao, {id: window.botState.idEmEdicao, username: document.getElementById('edit-user').value}); bootstrap.Modal.getInstance(document.getElementById('modalEdicao')).hide(); window.reloadBot(); };
window.excluirBot = (id) => { const item = window.botState.cache.find(b => b.id == id); window.botState.idEmEdicao = id; window.botState.origemEmEdicao = item.origem; new bootstrap.Modal(document.getElementById('modalExclusao')).show(); };
window.confirmarExclusao = async () => { await window.API.call('delete' + window.botState.origemEmEdicao, {id: window.botState.idEmEdicao}); bootstrap.Modal.getInstance(document.getElementById('modalExclusao')).hide(); window.reloadBot(); };
window.toggleMaster = () => { localStorage.setItem('bot_master_active', !(localStorage.getItem('bot_master_active') === 'true')); window.reloadBot(); };
window.alterarStatusDireto = async (id, status, origem) => { await window.API.call('update' + origem, {id, status: String(status).toUpperCase()}); };
window.initBot = () => window.reloadBot();
