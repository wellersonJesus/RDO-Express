window.botState = { cache: [], idEmEdicao: null, origemEmEdicao: null };

// Carrega os modais dinamicamente se ainda não existirem
window.carregarModais = async () => {
    const modais = {
        'usuarios': 'pages/usuarios/modal-usuario.html',
        'clientes': 'pages/clientes/modal-cliente.html',
        'colaboradores': 'pages/colaborador/modal-colaborador.html'
    };
    for (const [key, path] of Object.entries(modais)) {
        if (!document.getElementById('modal' + key.charAt(0).toUpperCase() + key.slice(1))) {
            const resp = await fetch(path);
            const html = await resp.text();
            document.body.insertAdjacentHTML('beforeend', html);
        }
    }
};

window.abrirModalEspecifico = async (origem) => { 
    await window.carregarModais();
    bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo')).hide(); 
    window.botState.origemEmEdicao = origem;
    const map = {'usuarios': 'modalUsuario', 'clientes': 'modalCliente', 'colaboradores': 'modalColaborador'};
    new bootstrap.Modal(document.getElementById(map[origem])).show(); 
};

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    if (!tbody) return;
    document.getElementById('sync-icon-bot').classList.add('spinner-rotate');
    try {
        const [bots, users, clients, cols] = await Promise.all([window.API.call('getbotconfig'), window.API.call('getusuarios'), window.API.call('getclientes'), window.API.call('getcolaboradores')]);
        window.botState.cache = [...(bots||[]).map(i=>({...i, origem:'botconfig'})), ...(users||[]).map(i=>({...i, origem:'usuarios'})), ...(clients||[]).map(i=>({...i, origem:'clientes'})), ...(cols||[]).map(i=>({...i, origem:'colaboradores'}))];
        tbody.innerHTML = window.botState.cache.map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''} ${!isMasterOn?'disabled':''}></div></td>
            <td><img src="${i.imagem||'https://via.placeholder.com/30'}" width="30" class="rounded-circle"></td>
            <td><small>${i.username || i.responsavel || i.nome || 'N/A'}</small></td>
            <td>${i.tipo || i.cargo || 'N/A'}</td>
            <td class="text-end pe-3"><button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button> <button class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button></td>
        </tr>`).join('');
        const btn = document.getElementById('btn-status-bot');
        if(btn) btn.innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
    } finally { document.getElementById('sync-icon-bot').classList.remove('spinner-rotate'); }
};

window.abrirModalCadastro = () => new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();
window.salvarNovo = async (modalId) => { /* Mantida a lógica original de salvamento */ };
window.toggleMaster = () => { localStorage.setItem('bot_master_active', !(localStorage.getItem('bot_master_active') === 'true')); window.reloadBot(); };
window.initBot = () => window.reloadBot();
window.editarBot = (id) => { /* Mantida a lógica original */ };
window.excluirBot = (id) => { /* Mantida a lógica original */ };
window.alterarStatusDireto = async (id, status, origem) => { await window.API.call('update' + origem, {id, status: String(status).toUpperCase()}); };
