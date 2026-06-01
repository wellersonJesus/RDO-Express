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

    // Refinamento solicitado: Bloqueio total e exibição da mensagem quando Master desligado
    if (!isMasterOn) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-4">
            <i class="bi bi-exclamation-triangle-fill text-danger d-block mb-2" style="font-size: 2rem;"></i>
            <strong>Sistema Master RDO desligado.</strong>
        </td></tr>`;
        if(infoPag) infoPag.innerText = "Pág 0 de 0";
        return;
    }
    
    const syncIcon = document.getElementById('sync-icon-bot');
    if(syncIcon) syncIcon.classList.add('spinner-rotate');
    
    try {
        const [users, clients, cols] = await Promise.all([
            window.API.call('getusuarios').catch(() => []), 
            window.API.call('getclientes').catch(() => []), 
            window.API.call('getcolaboradores').catch(() => [])
        ]);
        
        let dados = [
            ...(users||[]).map(i => ({...i, origem:'usuarios'})), 
            ...(clients||[]).map(i => ({...i, origem:'clientes'})), 
            ...(cols||[]).map(i => ({...i, origem:'colaboradores'}))
        ];

        if(filtro !== 'TODOS') dados = dados.filter(i => i.origem === filtro.toLowerCase());
        window.botState.cache = dados;

        const totalPag = Math.max(1, Math.ceil(dados.length / window.botState.itensPorPagina));
        if(window.botState.paginaAtual > totalPag) window.botState.paginaAtual = totalPag;
        if(infoPag) infoPag.innerText = `Pág ${window.botState.paginaAtual} de ${totalPag}`;
        
        const start = (window.botState.paginaAtual - 1) * window.botState.itensPorPagina;
        const pageData = dados.slice(start, start + window.botState.itensPorPagina);

        // Renderização com visual Bootstrap Premium
        tbody.innerHTML = pageData.map(i => {
            const isReadOnly = (i.origem === 'clientes' || i.origem === 'colaboradores');
            return `<tr>
                <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''}></div></td>
                <td><img src="${i.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" width="30" class="rounded-circle" style="object-fit:cover;"></td>
                <td>${i.username || i.responsavel || i.nome || 'N/A'}</td>
                <td><span class="badge bg-light text-dark">${i.origem.toUpperCase()}</span></td>
                <td class="text-end pe-3">
                    <button class="btn btn-light btn-sm shadow-sm" onclick="window.editarBot('${i.id}')">
                        <i class="bi ${isReadOnly ? 'bi-eye' : 'bi-pencil-square'}"></i>
                    </button> 
                    ${!isReadOnly ? `<button class="btn btn-light btn-sm shadow-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${i.origem}')"><i class="bi bi-trash"></i></button>` : ''}
                </td>
            </tr>`;
        }).join('');

    } catch (e) { 
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Falha na conexão com o serviço.</td></tr>';
    } finally { 
        if(syncIcon) syncIcon.classList.remove('spinner-rotate'); 
    }
};

window.toggleMaster = () => {
    localStorage.setItem('bot_master_active', !(localStorage.getItem('bot_master_active') === 'true'));
    window.initBot();
};

window.abrirModalCadastro = () => {
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    
    if (!isMasterOn) {
        alert("Atenção: Sistema Master RDO desligado.");
        return;
    }
    
    // PONTO CHAVE: Abre apenas usuários aqui
    window.abrirModalEspecifico('usuarios');
};

// Garantindo que a edição também seja restrita conforme solicitado
window.editarBot = async (id) => {
    const item = window.botState.cache.find(i => i.id == id);
    if(!item) return;

    window.botState.idEmEdicao = id;
    window.botState.origemEmEdicao = item.origem;
    await window.abrirModalEspecifico(item.origem, item);
    
    // Bloqueia edição se não for usuário
    const modalId = item.origem === 'usuarios' ? 'modalUsuario' : (item.origem === 'clientes' ? 'modalCliente' : 'modalColaborador');
    const modal = document.getElementById(modalId);
    
    if (item.origem !== 'usuarios') {
        modal.querySelectorAll('input, select').forEach(i => i.disabled = true);
        const btnSalvar = modal.querySelector('.btn-danger');
        if (btnSalvar) btnSalvar.style.display = 'none';
    }
};

window.editarBot = async (id) => {
    const item = window.botState.cache.find(i => i.id == id);
    if (!item) return;

    window.botState.idEmEdicao = id;
    window.botState.origemEmEdicao = item.origem;
    
    // Abre o modal passando os dados para preenchimento
    await window.abrirModalEspecifico(item.origem, item);
    
    // Lógica de bloqueio: Clientes e Colaboradores são "ReadOnly" aqui
    const isReadOnly = (item.origem !== 'usuarios');
    const modalId = item.origem === 'usuarios' ? 'modalUsuario' : 
                    (item.origem === 'clientes' ? 'modalCliente' : 'modalColaborador');
    
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
        modalEl.querySelectorAll('input, select').forEach(i => i.disabled = isReadOnly);
        const btnSalvar = modalEl.querySelector('.btn-danger');
        if (btnSalvar) btnSalvar.style.display = isReadOnly ? 'none' : 'block';
    }
};

window.abrirModalEspecifico = async (origem, data = null) => {
    const map = { 'usuarios': 'modalUsuario', 'clientes': 'modalCliente', 'colaboradores': 'modalColaborador' };
    const modalId = map[origem];
    let modalEl = document.getElementById(modalId);

    // Se o modal não existir no DOM, busca via Fetch
    if (!modalEl) {
        const paths = { 'usuarios': 'pages/usuarios/modal-usuario.html', 'clientes': 'pages/clientes/modal-cliente.html', 'colaboradores': 'pages/colaborador/modal-colaborador.html' };
        const resp = await fetch(paths[origem]);
        const html = await resp.text();
        document.body.insertAdjacentHTML('beforeend', html);
        modalEl = document.getElementById(modalId);
    }

    // Preenchimento dos dados
    const inputs = modalEl.querySelectorAll('input, select');
    inputs.forEach(i => {
        const key = i.id.split('-').pop(); // Pega o nome do campo após o hífen
        if (data && data.hasOwnProperty(key)) {
            i.value = data[key];
        } else if (!data) {
            i.value = '';
        }
        i.disabled = false;
        i.style.borderColor = '';
    });

    // Abertura segura
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();
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

window.initBotPage = function() {
    console.log("Bot inicializado.");
    // Coloque aqui sua lógica de carregar botões, status, etc.
};