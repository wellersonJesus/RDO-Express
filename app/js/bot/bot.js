window.botState = { 
    cache: [], 
    idEmEdicao: null, 
    origemEmEdicao: null, 
    paginaAtual: 1, 
    itensPorPagina: 15 
};

window.initBot = async () => {
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    const btn = document.getElementById('btn-status-bot');
    if(btn) {
        btn.innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
        btn.className = isMasterOn ? 'btn btn-danger btn-sm rounded-pill px-3' : 'btn btn-outline-danger btn-sm rounded-pill px-3';
    }
    window.botState.paginaAtual = 1;
    await window.reloadBot();
};

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const filtro = document.getElementById('filtro-tipo')?.value || 'TODOS';
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    if (!tbody) return;
    
    const syncIcon = document.getElementById('sync-icon-bot');
    if(syncIcon) syncIcon.classList.add('spinner-rotate');

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

        // Filtro e Paginação
        let lista = window.botState.cache;
        if (filtro !== 'TODOS') {
            lista = lista.filter(i => (i.tipo || i.origem) === filtro || (filtro === 'Cliente' && i.origem === 'clientes'));
        }

        const inicio = (window.botState.paginaAtual - 1) * window.botState.itensPorPagina;
        const final = inicio + window.botState.itensPorPagina;
        const dadosPagina = lista.slice(inicio, final);

        tbody.innerHTML = dadosPagina.map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''} ${!isMasterOn?'disabled':''}></div></td>
            <td><img src="${i.imagem ? 'https://wsrv.nl/?url=' + encodeURIComponent(i.imagem) : 'https://via.placeholder.com/30'}" width="30" class="rounded-circle" onerror="this.src='https://via.placeholder.com/30'"></td>
            <td>${i.username || i.responsavel || i.nome || 'N/A'}</td>
            <td>${i.tipo || i.cargo || 'N/A'}</td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')" ${!isMasterOn?'disabled':''}><i class="bi bi-pencil-square"></i></button> 
                <button class="btn btn-light btn-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${i.origem}')" ${!isMasterOn?'disabled':''}><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
    } finally { 
        if(syncIcon) syncIcon.classList.remove('spinner-rotate'); 
    }
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
    
    inputs.forEach(i => {
        i.value = data ? (data[i.id.split('-')[1]] || '') : '';
        i.style.borderColor = '';
    });

    window.botState.origemEmEdicao = origem;
    new bootstrap.Modal(modalEl).show();
};

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    const inputs = el.querySelectorAll('input, select');
    let valid = true;

    inputs.forEach(i => {
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
    let modalEl = document.getElementById('modalConfirmar');
    if (!modalEl) {
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="modalConfirmar" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-body text-center p-4">
                        <div class="mb-3">
                            <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3.5rem;"></i>
                        </div>
                        <h5 class="fw-bold">Remover Registro</h5>
                        <p class="text-muted small mb-4">
                            Você está prestes a excluir este item permanentemente. 
                            Esta ação não poderá ser desfeita.
                        </p>
                        <div class="d-flex gap-2 justify-content-center">
                            <button class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-danger rounded-pill px-4 fw-bold" id="btn-del-action">
                                Confirmar Remoção
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`);
        modalEl = document.getElementById('modalConfirmar');
    }
    
    const btn = document.getElementById('btn-del-action');
    btn.onclick = async () => {
        // Estado de "processando" com o ícone de loop
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate me-2"></i> Removendo...';
        
        try {
            await window.API.call('delete' + origem, { id });
            bootstrap.Modal.getInstance(modalEl).hide();
            window.reloadBot();
        } catch (e) {
            console.error("Erro na exclusão:", e);
            btn.innerHTML = 'Erro! Tente novamente';
        } finally {
            btn.disabled = false;
        }
    };
    new bootstrap.Modal(modalEl).show();
};

window.alterarStatusDireto = async (id, status, origem) => {
    await window.API.call('update' + origem, { id, status: status ? 'TRUE' : 'FALSE' });
    window.reloadBot();
};
