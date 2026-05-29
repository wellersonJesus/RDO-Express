window.botState = { cache: [], idEmEdicao: null, origemEmEdicao: null, pagina: 1, itensPorPagina: 15 };

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
    const filtro = document.getElementById('filtro-tipo')?.value || 'TODOS';
    if (!tbody) return;
    
    document.getElementById('sync-icon-bot').classList.add('spinner-rotate');
    try {
        const [bots, users, clients, cols] = await Promise.all([
            window.API.call('getbotconfig'), window.API.call('getusuarios'), 
            window.API.call('getclientes'), window.API.call('getcolaboradores')
        ]);
        
        let dados = [
            ...(bots||[]).map(i=>({...i, origem:'botconfig'})), ...(users||[]).map(i=>({...i, origem:'usuarios'})), 
            ...(clients||[]).map(i=>({...i, origem:'clientes'})), ...(cols||[]).map(i=>({...i, origem:'colaboradores'}))
        ];

        if(filtro !== 'TODOS') dados = dados.filter(i => i.origem === filtro.toLowerCase());
        window.botState.cache = dados;

        const totalPaginas = Math.ceil(dados.length / window.botState.itensPorPagina) || 1;
        if(window.botState.pagina > totalPaginas) window.botState.pagina = totalPaginas;
        
        const start = (window.botState.pagina - 1) * window.botState.itensPorPagina;
        const pageData = dados.slice(start, start + window.botState.itensPorPagina);

        document.getElementById('info-paginacao').innerText = `Pág ${window.botState.pagina} de ${totalPaginas}`;
        
        tbody.innerHTML = pageData.map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''} ${!isMasterOn?'disabled':''}></div></td>
            <td><img src="${i.imagem ? 'https://wsrv.nl/?url=' + encodeURIComponent(i.imagem) : 'https://via.placeholder.com/30'}" width="30" class="rounded-circle" onerror="this.src='https://via.placeholder.com/30'"></td>
            <td>${i.username || i.responsavel || i.nome || 'N/A'}</td>
            <td>${i.tipo || i.cargo || 'N/A'}</td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')" ${!isMasterOn?'disabled':''}><i class="bi bi-pencil-square"></i></button> 
                <button class="btn btn-light btn-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${i.origem}')" ${!isMasterOn?'disabled':''}><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
    } finally { document.getElementById('sync-icon-bot').classList.remove('spinner-rotate'); }
};

window.mudarPagina = (dir) => {
    window.botState.pagina = Math.max(1, window.botState.pagina + dir);
    window.reloadBot();
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
    bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo'))?.hide();
};

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    const inputs = el.querySelectorAll('input, select');
    let valid = true;
    inputs.forEach(i => {
        if (!i.value && !i.id.includes('imagem')) { i.style.borderColor = 'red'; valid = false; }
        else { i.style.borderColor = ''; }
    });
    if (!valid) return;

    const btn = el.querySelector('.btn-danger');
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    let dados = { id: window.botState.idEmEdicao || Date.now().toString() };
    inputs.forEach(i => { if(i.id) dados[i.id.split('-')[1]] = i.value; });
    
    await window.API.call((window.botState.idEmEdicao ? 'update' : 'add') + window.botState.origemEmEdicao, dados);
    bootstrap.Modal.getInstance(el).hide();
    window.botState.idEmEdicao = null;
    window.reloadBot();
};

window.confirmarExclusao = (id, origem) => {
    if(!document.getElementById('modalConfirmar')) {
        document.body.insertAdjacentHTML('beforeend', '<div class="modal fade" id="modalConfirmar"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-body text-center p-4"><h5>Confirmar remoção?</h5><button class="btn btn-danger w-100 mt-3" id="btn-del-action">Remover</button></div></div></div></div>');
    }
    document.getElementById('btn-del-action').onclick = async () => {
        document.getElementById('btn-del-action').innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
        await window.API.call('delete' + origem, { id });
        bootstrap.Modal.getInstance(document.getElementById('modalConfirmar')).hide();
        window.reloadBot();
    };
    new bootstrap.Modal(document.getElementById('modalConfirmar')).show();
};

window.alterarStatusDireto = async (id, status, origem) => {
    await window.API.call('update' + origem, { id, status: status ? 'TRUE' : 'FALSE' });
};
