window.botState = { cache: [], idEmEdicao: null, origemEmEdicao: null };

window.initBot = async () => {
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    const btn = document.getElementById('btn-status-bot');
    if(btn) btn.innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
    window.reloadBot();
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
            <td>${i.username || i.responsavel || i.nome || 'N/A'}</td>
            <td>${i.tipo || i.cargo || 'N/A'}</td>
            <td class="text-end pe-3"><button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button> <button class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button></td>
        </tr>`).join('');
    } finally { document.getElementById('sync-icon-bot').classList.remove('spinner-rotate'); }
};

window.toggleMaster = () => {
    localStorage.setItem('bot_master_active', !(localStorage.getItem('bot_master_active') === 'true'));
    window.initBot();
};

window.abrirModalCadastro = () => new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();

window.abrirModalEspecifico = async (origem) => {
    const paths = { 'usuarios': 'pages/usuarios/modal-usuario.html', 'clientes': 'pages/clientes/modal-cliente.html', 'colaboradores': 'pages/colaborador/modal-colaborador.html' };
    const map = { 'usuarios': 'modalUsuario', 'clientes': 'modalCliente', 'colaboradores': 'modalColaborador' };
    const modalId = map[origem];

    if(!document.getElementById(modalId)) {
        const resp = await fetch(paths[origem]);
        document.body.insertAdjacentHTML('beforeend', await resp.text());
    }
    
    bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo')).hide();
    window.botState.origemEmEdicao = origem;
    new bootstrap.Modal(document.getElementById(modalId)).show();
};

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    // Seleciona todos os inputs e selects dentro do modal
    const inputs = el.querySelectorAll('input, select');
    let valid = true;

    // Itera sobre cada campo para validar
    inputs.forEach(i => {
        // Se o valor estiver vazio, aplica a borda vermelha
        if (!i.value || i.value === "") {
            i.style.borderColor = 'red';
            i.style.borderWidth = '2px';
            valid = false;
        } else {
            // Se estiver preenchido, limpa a borda
            i.style.borderColor = '';
            i.style.borderWidth = '';
        }
    });

    // Se houver algum campo inválido, interrompe o salvamento
    if (!valid) {
        // Opcional: Você pode adicionar um alerta visual aqui se desejar
        return;
    }

    // Se tudo estiver OK, prossegue com o salvamento
    const btn = el.querySelector('.btn-danger');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    let dados = {};
    inputs.forEach(i => { 
        if(i.id) {
            const key = i.id.split('-')[1]; // Pega o nome do campo após o hífen
            dados[key] = i.value;
        }
    });
    
    try {
        await window.API.call('add' + window.botState.origemEmEdicao, dados);
        bootstrap.Modal.getInstance(el).hide();
        window.reloadBot();
    } catch (err) {
        console.error("Erro ao salvar:", err);
    } finally {
        btn.innerHTML = originalText;
    }
};