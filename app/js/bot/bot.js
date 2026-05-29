window.botState = { cache: [], idEmEdicao: null, origemEmEdicao: null };

window.initBot = async () => {
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    const btn = document.getElementById('btn-status-bot');
    if(btn) {
        btn.innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
        btn.className = isMasterOn ? 'btn btn-danger btn-sm rounded-pill px-3' : 'btn btn-outline-danger btn-sm rounded-pill px-3';
    }
    await window.reloadBot();
};

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const syncIcon = document.getElementById('sync-icon-bot');
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    if (!tbody) return;
    
    syncIcon.classList.add('spinner-rotate');
    try {
        const [bots, users, clients, cols] = await Promise.all([
            window.API.call('getbotconfig'), 
            window.API.call('getusuarios'), 
            window.API.call('getclientes'), 
            window.API.call('getcolaboradores')
        ]);
        
        window.botState.cache = [
            ...(bots||[]).map(i=>({...i, origem:'botconfig'})), 
            ...(users||[]).map(i=>({...i, origem:'usuarios'})), 
            ...(clients||[]).map(i=>({...i, origem:'clientes'})), 
            ...(cols||[]).map(i=>({...i, origem:'colaboradores'}))
        ];

        tbody.innerHTML = window.botState.cache.map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''} ${!isMasterOn?'disabled':''}></div></td>
            <td><img src="${i.imagem||'https://via.placeholder.com/30'}" width="30" class="rounded-circle"></td>
            <td>${i.username || i.responsavel || i.nome || 'N/A'}</td>
            <td>${i.tipo || i.cargo || 'N/A'}</td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button> 
                <button class="btn btn-light btn-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${i.origem}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
    } catch (e) { console.error(e); } finally { syncIcon.classList.remove('spinner-rotate'); }
};

window.toggleMaster = () => {
    localStorage.setItem('bot_master_active', !(localStorage.getItem('bot_master_active') === 'true'));
    window.initBot();
};

window.abrirModalCadastro = () => new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();

window.abrirModalEspecifico = async (origem, editData = null) => {
    const paths = { 'usuarios': 'pages/usuarios/modal-usuario.html', 'clientes': 'pages/clientes/modal-cliente.html', 'colaboradores': 'pages/colaborador/modal-colaborador.html' };
    const map = { 'usuarios': 'modalUsuario', 'clientes': 'modalCliente', 'colaboradores': 'modalColaborador' };
    const modalId = map[origem];

    if(!document.getElementById(modalId)) {
        const resp = await fetch(paths[origem]);
        document.body.insertAdjacentHTML('beforeend', await resp.text());
    }
    
    const modalEl = document.getElementById(modalId);
    window.botState.origemEmEdicao = origem;
    
    if(editData) {
        Object.keys(editData).forEach(key => {
            const input = modalEl.querySelector(`[id*="-${key}"]`);
            if(input) input.value = editData[key];
        });
    }

    const modal = new bootstrap.Modal(modalEl);
    const tipoModal = bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo'));
    if(tipoModal) tipoModal.hide();
    modal.show();
};

window.editarBot = (id) => {
    const item = window.botState.cache.find(i => i.id == id);
    if(!item) return;
    window.botState.idEmEdicao = id;
    window.abrirModalEspecifico(item.origem, item);
};

window.confirmarExclusao = (id, origem) => {
    const modalHtml = `
    <div class="modal fade" id="modalConfirmar" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <div class="modal-body p-4 text-center">
                    <i class="bi bi-exclamation-triangle text-danger" style="font-size:3rem"></i>
                    <h5>Atenção</h5>
                    <p>O dado será permanentemente cancelado. Deseja continuar?</p>
                    <div class="d-flex gap-2">
                        <button class="btn btn-secondary w-50" data-bs-dismiss="modal">Cancelar</button>
                        <button class="btn btn-danger w-50" id="btn-confirm-delete" onclick="window.executarExclusao('${id}', '${origem}')">Sim, excluir</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    new bootstrap.Modal(document.getElementById('modalConfirmar')).show();
};

window.executarExclusao = async (id, origem) => {
    const btn = document.getElementById('btn-confirm-delete');
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
    try {
        await window.API.call('delete' + origem, { id });
        bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
        window.reloadBot();
    } catch(e) { console.error(e); }
};

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    const btn = el.querySelector('.btn-danger');
    const inputs = el.querySelectorAll('input, select');
    let dados = { id: window.botState.idEmEdicao };
    
    inputs.forEach(i => { if(i.id) dados[i.id.split('-')[1]] = i.value; });
    
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    try {
        await window.API.call((window.botState.idEmEdicao ? 'update' : 'add') + window.botState.origemEmEdicao, dados);
        bootstrap.Modal.getInstance(el).hide();
        window.botState.idEmEdicao = null;
        window.reloadBot();
    } finally { btn.innerHTML = 'Salvar'; }
};
