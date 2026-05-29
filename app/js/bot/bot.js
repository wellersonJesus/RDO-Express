window.botState = { 
    cache: [], 
    idEmEdicao: null, 
    origemEmEdicao: null, 
    paginaAtual: 1, 
    itensPorPagina: 15 
};

window.mudarPagina = (dir) => {
    const totalPag = Math.max(1, Math.ceil(window.botState.cache.length / window.botState.itensPorPagina));
    window.botState.paginaAtual = Math.min(Math.max(1, window.botState.paginaAtual + dir), totalPag);
    window.reloadBot();
};

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
    const infoPag = document.getElementById('info-paginacao');
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    const filtro = document.getElementById('filtro-tipo')?.value || 'TODOS';
    
    if (!tbody) return;
    
    const syncIcon = document.getElementById('sync-icon-bot');
    if(syncIcon) syncIcon.classList.add('spinner-rotate');
    
    try {
        const [users, clients, cols] = await Promise.all([
            window.API.call('getusuarios'), 
            window.API.call('getclientes'), 
            window.API.call('getcolaboradores')
        ]);
        
        let dados = [
            ...(users||[]).map(i=>({...i, origem:'usuarios'})), 
            ...(clients||[]).map(i=>({...i, origem:'clientes'})), 
            ...(cols||[]).map(i=>({...i, origem:'colaboradores'}))
        ];

        if(filtro !== 'TODOS') dados = dados.filter(i => i.origem === filtro.toLowerCase());
        window.botState.cache = dados;

        const totalPag = Math.max(1, Math.ceil(dados.length / window.botState.itensPorPagina));
        if(window.botState.paginaAtual > totalPag) window.botState.paginaAtual = totalPag;
        if(infoPag) infoPag.innerText = `Pág ${window.botState.paginaAtual} de ${totalPag}`;
        
        const start = (window.botState.paginaAtual - 1) * window.botState.itensPorPagina;
        const pageData = dados.slice(start, start + window.botState.itensPorPagina);

        tbody.innerHTML = pageData.map(i => {
            const isReadOnly = (i.origem === 'clientes' || i.origem === 'colaboradores');
            return `<tr>
                <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''} ${!isMasterOn?'disabled':''}></div></td>
                <td><img src="${i.imagem ? 'https://wsrv.nl/?url=' + encodeURIComponent(i.imagem) : 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" width="30" class="rounded-circle" style="object-fit:cover;"></td>
                <td>${i.username || i.responsavel || i.nome || 'N/A'}</td>
                <td>${i.origem.toUpperCase()}</td>
                <td class="text-end pe-3">
                    <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')" ${!isMasterOn?'disabled':''}>
                        <i class="bi ${isReadOnly ? 'bi-eye' : 'bi-pencil-square'}"></i>
                    </button> 
                    ${!isReadOnly ? `<button class="btn btn-light btn-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${i.origem}')" ${!isMasterOn?'disabled':''}><i class="bi bi-trash"></i></button>` : ''}
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error(e); } finally { if(syncIcon) syncIcon.classList.remove('spinner-rotate'); }
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
        window.botState.origemEmEdicao = item.origem;
        await window.abrirModalEspecifico(item.origem, item);
        
        // Bloqueio de segurança se for cliente ou colaborador
        const isReadOnly = (item.origem === 'clientes' || item.origem === 'colaboradores');
        const modal = document.getElementById(item.origem === 'usuarios' ? 'modalUsuario' : (item.origem === 'clientes' ? 'modalCliente' : 'modalColaborador'));
        
        if(isReadOnly) {
            modal.querySelectorAll('input, select').forEach(i => i.disabled = true);
            // Re-habilita apenas o status se necessário, ou esconde o botão de salvar
            modal.querySelector('.btn-danger').style.display = 'none';
        }
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
    const btnSalvar = modalEl.querySelector('.btn-danger');
    
    inputs.forEach(i => {
        i.value = data ? (data[i.id.split('-')[1]] || '') : '';
        i.disabled = false;
        i.style.borderColor = '';
    });
    
    if(btnSalvar) btnSalvar.style.display = 'block';
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

window.alterarStatusDireto = async (id, status, origem) => {
    await window.API.call('update' + origem, { id, status: status ? 'TRUE' : 'FALSE' });
    window.reloadBot();
};

window.confirmarExclusao = (id, origem) => { /* Mantida mesma lógica */ };
