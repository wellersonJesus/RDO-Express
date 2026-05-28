window.botState = { cache: [], idEmEdicao: null, origemEmEdicao: null };

window.initBot = async () => {
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    document.getElementById('btn-status-bot').innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
    window.reloadBot();
};

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    if (!tbody) return;
    
    document.getElementById('sync-icon-bot').classList.add('spinner-rotate');
    try {
        const [bots, users, clients, cols] = await Promise.all([
            window.API.call('getbotconfig'), window.API.call('getusuarios'), 
            window.API.call('getclientes'), window.API.call('getcolaboradores')
        ]);
        
        window.botState.cache = [...(bots||[]).map(i=>({...i, origem:'botconfig'})), ...(users||[]).map(i=>({...i, origem:'usuarios'})), ...(clients||[]).map(i=>({...i, origem:'clientes'})), ...(cols||[]).map(i=>({...i, origem:'colaboradores'}))];
        
        tbody.innerHTML = window.botState.cache.map(i => `<tr>
            <td><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''} ${!isMasterOn?'disabled':''}></div></td>
            <td><img src="${i.imagem||'https://via.placeholder.com/30'}" width="30" class="rounded-circle"></td>
            <td>${i.username || i.responsavel || 'N/A'}</td>
            <td>${i.tipo || 'N/A'}</td>
            <td class="text-end">
                <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
    } finally { document.getElementById('sync-icon-bot').classList.remove('spinner-rotate'); }
};

window.toggleMaster = () => {
    const status = !(localStorage.getItem('bot_master_active') === 'true');
    localStorage.setItem('bot_master_active', status);
    window.initBot();
};

window.salvarNovo = async (modalId, origem) => {
    const modal = document.getElementById(modalId);
    const inputs = modal.querySelectorAll('input, select');
    let valid = true;
    inputs.forEach(i => { if(!i.value) { i.style.borderColor = 'red'; valid = false; } else { i.style.borderColor = ''; } });
    if(!valid) return;

    const btn = modal.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    let dados = {};
    inputs.forEach(i => { if(i.id) dados[i.id.split('-')[1]] = i.value; });
    
    await window.API.call('add' + origem, dados);
    bootstrap.Modal.getInstance(modal).hide();
    btn.innerHTML = originalText;
    window.reloadBot();
};

window.abrirModalEspecifico = async (origem) => {
    const paths = { 'usuarios': 'pages/usuarios/modal-usuario.html', 'clientes': 'pages/clientes/modal-cliente.html', 'colaboradores': 'pages/colaborador/modal-colaborador.html' };
    const modalId = 'modal' + origem.charAt(0).toUpperCase() + origem.slice(1, -1);
    
    if(!document.getElementById(modalId)) {
        const resp = await fetch(paths[origem]);
        document.body.insertAdjacentHTML('beforeend', await resp.text());
    }
    bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo')).hide();
    new bootstrap.Modal(document.getElementById(modalId)).show();
};

window.abrirModalCadastro = () => new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();
