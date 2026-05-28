window.botState = { cache: [], idEmEdicao: null, origemEmEdicao: null };

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    if (!tbody) return;
    
    document.getElementById('sync-icon-bot').classList.add('spinner-rotate');
    try {
        const [bots, users, clients, cols] = await Promise.all([window.API.call('getbotconfig'), window.API.call('getusuarios'), window.API.call('getclientes'), window.API.call('getcolaboradores')]);
        const all = [...(bots||[]).map(i=>({...i, origem:'botconfig'})), ...(users||[]).map(i=>({...i, origem:'usuarios'})), ...(clients||[]).map(i=>({...i, origem:'clientes'})), ...(cols||[]).map(i=>({...i, origem:'colaboradores'}))];
        window.botState.cache = all;
        tbody.innerHTML = window.botState.cache.map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''} ${!isMasterOn?'disabled':''}></div></td>
            <td><img src="${i.imagem||'https://via.placeholder.com/30'}" width="30" class="rounded-circle"></td>
            <td><small>${i.username || i.responsavel || 'N/A'}</small></td>
            <td>${i.tipo || i.cargo || 'N/A'}</td>
            <td class="text-end pe-3"><button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button> <button class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button></td>
        </tr>`).join('');
        document.getElementById('btn-status-bot').innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
    } finally { document.getElementById('sync-icon-bot').classList.remove('spinner-rotate'); }
};

window.abrirModalCadastro = () => new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();
window.abrirModalEspecifico = (origem) => { 
    bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo')).hide(); 
    window.botState.origemEmEdicao = origem; 
    new bootstrap.Modal(document.getElementById(origem === 'clientes' ? 'modalCliente' : 'modalUsuario')).show(); 
};

window.salvarNovo = async (modalId) => {
    const modal = document.getElementById(modalId);
    const inputs = modal.querySelectorAll('input, select');
    let valid = true;
    inputs.forEach(i => { if(!i.value) { i.style.borderColor = 'red'; valid = false; } else { i.style.borderColor = ''; } });
    if(!valid) return;

    const btn = modal.querySelector('button.btn-danger');
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    let dados = (modalId === 'modalCliente') ? { username: document.getElementById('c-username').value, tipo: document.getElementById('c-tipo').value, responsavel: document.getElementById('c-responsavel').value, cnpj: document.getElementById('c-cnpj').value, contato: document.getElementById('c-contato').value, email: document.getElementById('c-email').value, endereco: document.getElementById('c-endereco').value, bairro: document.getElementById('c-bairro').value } : { username: document.getElementById('u-username').value, password: document.getElementById('u-password').value, imagem: document.getElementById('u-imagem').value, tipo: document.getElementById('u-tipo').value };
    
    await window.API.call('add' + window.botState.origemEmEdicao, dados);
    bootstrap.Modal.getInstance(modal).hide();
    btn.innerHTML = "Salvar";
    window.reloadBot();
};

window.toggleMaster = () => { localStorage.setItem('bot_master_active', !(localStorage.getItem('bot_master_active') === 'true')); window.reloadBot(); };
window.initBot = () => window.reloadBot();
window.editarBot = (id) => { const item = window.botState.cache.find(b => b.id == id); window.botState.idEmEdicao = id; window.botState.origemEmEdicao = item.origem; new bootstrap.Modal(document.getElementById('modalEdicao')).show(); };
window.excluirBot = (id) => { const item = window.botState.cache.find(b => b.id == id); window.botState.idEmEdicao = id; window.botState.origemEmEdicao = item.origem; new bootstrap.Modal(document.getElementById('modalExclusao')).show(); };
window.confirmarExclusao = async () => { await window.API.call('delete' + window.botState.origemEmEdicao, {id: window.botState.idEmEdicao}); bootstrap.Modal.getInstance(document.getElementById('modalExclusao')).hide(); window.reloadBot(); };
window.alterarStatusDireto = async (id, status, origem) => { await window.API.call('update' + origem, {id, status: String(status).toUpperCase()}); };
