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
            <td><img src="${i.imagem ? 'https://wsrv.nl/?url=' + encodeURIComponent(i.imagem) : 'https://via.placeholder.com/30'}" width="30" class="rounded-circle"></td>
            <td>${i.username || i.responsavel || i.nome || 'N/A'}</td>
            <td>${i.tipo || i.cargo || 'N/A'}</td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')" ${!isMasterOn?'disabled':''}><i class="bi bi-pencil-square"></i></button> 
                <button class="btn btn-light btn-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${i.origem}')" ${!isMasterOn?'disabled':''}><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
    } finally { document.getElementById('sync-icon-bot').classList.remove('spinner-rotate'); }
};

window.toggleMaster = () => {
    localStorage.setItem('bot_master_active', !(localStorage.getItem('bot_master_active') === 'true'));
    window.initBot();
};

window.abrirModalCadastro = () => new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();

window.editarBot = async (id) => {
    const item = window.botState.cache.find(i => i.id == id);
    if(item) {
        window.botState.idEmEdicao = id;
        await window.abrirModalEspecifico(item.origem, item);
    }
};

window.abrirModalEspecifico = async (origem, data = null) => {
    const paths = { 'usuarios': 'pages/usuarios/modal-usuario.html', 'clientes': 'pages/clientes/modal-cliente.html', 'colaboradores': 'pages/colaborador/modal-colaborador.html' };
    const map = { 'usuarios': 'modalUsuario', 'clientes': 'modalCliente', 'colaboradores': 'modalColaborador' };
    const modalId = map[origem];

    if(!document.getElementById(modalId)) {
        const resp = await fetch(paths[origem]);
        document.body.insertAdjacentHTML('beforeend', await resp.text());
    }
    
    const modalEl = document.getElementById(modalId);
    const inputs = modalEl.querySelectorAll('input, select');
    
    // Resetar campos
    inputs.forEach(i => {
        i.value = data ? (data[i.id.split('-')[1]] || '') : '';
        i.style.borderColor = '';
    });

    window.botState.origemEmEdicao = origem;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    const inputs = el.querySelectorAll('input, select');
    let valid = true;

    inputs.forEach(i => {
        // Valida todos exceto imagem
        if (!i.value && !i.id.includes('imagem')) {
            i.style.borderColor = 'red';
            valid = false;
        } else {
            i.style.borderColor = '';
        }
    });

    if (!valid) return;

    const btn = el.querySelector('.btn-danger');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    let dados = { id: window.botState.idEmEdicao || Date.now().toString() };
    inputs.forEach(i => { if(i.id) dados[i.id.split('-')[1]] = i.value; });
    
    const action = window.botState.idEmEdicao ? 'update' : 'add';
    await window.API.call(action + window.botState.origemEmEdicao, dados);
    
    bootstrap.Modal.getInstance(el).hide();
    window.botState.idEmEdicao = null;
    window.reloadBot();
    btn.innerHTML = originalText;
};

window.confirmarExclusao = (id, origem) => {
    let modal = document.getElementById('modalConfirmar');
    if(!modal) {
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="modalConfirmar" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-body p-4 text-center">
                        <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                        <h5 class="mt-3">Remover registro?</h5>
                        <button class="btn btn-danger w-100 mt-3" id="conf-del-btn">Confirmar exclusão</button>
                    </div>
                </div>
            </div>
        </div>`);
        modal = document.getElementById('modalConfirmar');
    }
    document.getElementById('conf-del-btn').onclick = async () => {
        const btn = document.getElementById('conf-del-btn');
        btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Removendo...';
        await window.API.call('delete' + origem, { id });
        bootstrap.Modal.getInstance(modal).hide();
        window.reloadBot();
        btn.innerHTML = 'Confirmar exclusão';
    };
    new bootstrap.Modal(modal).show();
};

window.alterarStatusDireto = async (id, status, origem) => {
    await window.API.call('update' + origem, { id, status: status ? 'TRUE' : 'FALSE' });
    window.reloadBot();
};