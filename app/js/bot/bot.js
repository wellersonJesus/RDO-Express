window.botState = { cache: [], idEmEdicao: null, origemEmEdicao: null };

window.initBot = async () => {
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    const btn = document.getElementById('btn-status-bot');
    if(btn) {
        btn.innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
        btn.className = isMasterOn ? 'btn btn-danger btn-sm rounded-pill px-3' : 'btn btn-outline-danger btn-sm rounded-pill px-3';
    }
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
        
        window.botState.cache = [
            ...(bots||[]).map(i=>({...i, origem:'botconfig'})), 
            ...(users||[]).map(i=>({...i, origem:'usuarios'})), 
            ...(clients||[]).map(i=>({...i, origem:'clientes'})), 
            ...(cols||[]).map(i=>({...i, origem:'colaboradores'}))
        ];

        tbody.innerHTML = window.botState.cache.map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''} ${!isMasterOn?'disabled':''}></div></td>
            <td><img src="${i.imagem||'https://via.placeholder.com/30'}" width="30" class="rounded-circle" onerror="this.src='https://via.placeholder.com/30'"></td>
            <td>${i.username || i.responsavel || i.nome || 'N/A'}</td>
            <td>${i.tipo || i.cargo || 'N/A'}</td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')" ${!isMasterOn?'disabled':''}>
                    <i class="bi bi-pencil-square"></i>
                </button> 
                <button class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}', '${i.origem}')" ${!isMasterOn?'disabled':''}>
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`).join('');
    } finally { document.getElementById('sync-icon-bot').classList.remove('spinner-rotate'); }
};

window.toggleMaster = () => {
    const currentState = localStorage.getItem('bot_master_active') === 'true';
    localStorage.setItem('bot_master_active', !currentState);
    window.initBot();
};

window.abrirModalCadastro = () => {
    const modalEl = document.getElementById('modalEscolhaTipo');
    if (modalEl) new bootstrap.Modal(modalEl).show();
};

window.abrirModalEspecifico = async (origem, data = null) => {
    const paths = { 'usuarios': 'pages/usuarios/modal-usuario.html', 'clientes': 'pages/clientes/modal-cliente.html', 'colaboradores': 'pages/colaborador/modal-colaborador.html' };
    const map = { 'usuarios': 'modalUsuario', 'clientes': 'modalCliente', 'colaboradores': 'modalColaborador' };
    const modalId = map[origem];

    let modalEl = document.getElementById(modalId);
    if(!modalEl) {
        const resp = await fetch(paths[origem]);
        const html = await resp.text();
        document.body.insertAdjacentHTML('beforeend', html);
        modalEl = document.getElementById(modalId);
    }
    
    // Preencher campos se for edição
    const inputs = modalEl.querySelectorAll('input, select');
    inputs.forEach(i => {
        i.value = data && i.id ? (data[i.id.split('-')[1]] || '') : '';
    });

    window.botState.origemEmEdicao = origem;
    new bootstrap.Modal(modalEl).show();
};

window.editarBot = (id) => {
    const item = window.botState.cache.find(i => i.id == id);
    if(item) {
        window.botState.idEmEdicao = id;
        window.abrirModalEspecifico(item.origem, item);
    }
};

window.excluirBot = (id, origem) => {
    let modal = document.getElementById('modalConfirmar');
    if(!modal) {
        document.body.insertAdjacentHTML('beforeend', `<div class="modal fade" id="modalConfirmar"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-body text-center p-4"><h5>Confirmar Exclusão</h5><p>Tem certeza que deseja remover este item?</p><button class="btn btn-danger w-100" id="btn-confirm-del">Sim, remover</button></div></div></div></div>`);
        modal = document.getElementById('modalConfirmar');
    }
    document.getElementById('btn-confirm-del').onclick = async () => {
        await window.API.call('delete' + origem, { id });
        bootstrap.Modal.getInstance(modal).hide();
        window.reloadBot();
    };
    new bootstrap.Modal(modal).show();
};

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    const inputs = el.querySelectorAll('input, select');
    const dados = { id: window.botState.idEmEdicao || Date.now().toString() };
    
    inputs.forEach(i => { if(i.id) dados[i.id.split('-')[1]] = i.value; });
    
    const btn = el.querySelector('.btn-danger');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    const action = window.botState.idEmEdicao ? 'update' : 'add';
    await window.API.call(action + window.botState.origemEmEdicao, dados);
    
    bootstrap.Modal.getInstance(el).hide();
    window.botState.idEmEdicao = null;
    window.reloadBot();
    btn.innerHTML = originalText;
};

window.alterarStatusDireto = async (id, status, origem) => {
    await window.API.call('update' + origem, { id, status: status ? 'TRUE' : 'FALSE' });
    window.reloadBot();
};