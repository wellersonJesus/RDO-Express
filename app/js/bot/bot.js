window.botState = { cache: [], currentPage: 1, idEmEdicao: null };

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const filtro = document.getElementById('filtro-tipo').value;
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    if (!tbody) return;
    
    window.SyncBotUtils?.toggleSpin('sync-icon-bot', true);
    try {
        const [bots, users, clients, cols] = await Promise.all([
            window.API.call('getbotconfig'), window.API.call('getusuarios'),
            window.API.call('getclientes'), window.API.call('getcolaboradores')
        ]);
        const all = [...(bots||[]), ...(users||[]), ...(clients||[]), ...(cols||[])];
        window.botState.cache = (filtro === 'TODOS') ? all : all.filter(b => b.tipo === filtro || b.cargo === filtro);
        
        const start = (window.botState.currentPage - 1) * 20;
        tbody.innerHTML = window.botState.cache.slice(start, start + 20).map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" onchange="window.alterarStatusDireto('${i.id}', this.checked)" ${(isMasterOn && String(i.status||'').toUpperCase() === 'TRUE') ? 'checked':''} ${!isMasterOn ? 'disabled':''}></div></td>
            <td><img src="${i.imagem||''}" width="30" class="rounded-circle"></td>
            <td><small>${i.username || i.responsavel || 'N/A'}</small></td>
            <td><span class="badge-tipo">${i.tipo || i.cargo || 'N/A'}</span></td>
            <td class="text-end pe-3"><button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button> <button class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button></td>
        </tr>`).join('');
        window.renderPagination();
    } finally { window.SyncBotUtils?.toggleSpin('sync-icon-bot', false); }
};

window.salvarNovoUsuario = async () => {
    const dados = { username: document.getElementById('u-username').value, tipo: document.getElementById('u-tipo').value, imagem: document.getElementById('u-imagem').value, password: document.getElementById('u-password').value, id: Date.now().toString() };
    await window.API.call('addusuarios', dados);
    bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
    window.reloadBot();
};

window.abrirModalCadastro = () => new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();
window.abrirModalEspecifico = (t) => { bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo')).hide(); new bootstrap.Modal(document.getElementById('modalUsuario')).show(); };
window.editarBot = (id) => { window.botState.idEmEdicao = id; new bootstrap.Modal(document.getElementById('modalEdicao')).show(); };
window.excluirBot = (id) => { window.botState.idEmEdicao = id; new bootstrap.Modal(document.getElementById('modalExclusao')).show(); };
window.confirmarExclusao = async () => { await window.API.call('deletebotconfig', {id: window.botState.idEmEdicao}); bootstrap.Modal.getInstance(document.getElementById('modalExclusao')).hide(); window.reloadBot(); };
window.confirmarEdicao = async () => { await window.API.call('updatebotconfig', {id: window.botState.idEmEdicao, username: document.getElementById('edit-user').value}); bootstrap.Modal.getInstance(document.getElementById('modalEdicao')).hide(); window.reloadBot(); };
window.renderPagination = () => { const total = Math.ceil(window.botState.cache.length/20); document.getElementById('bot-pagination').innerHTML = Array.from({length:total}, (_,i)=>i+1).map(p=>`<li class="page-item"><button class="page-link bg-danger text-white border-0 mx-1 rounded" onclick="window.mudarPagina(${p})">${p}</button></li>`).join(''); };
window.mudarPagina = (p) => { window.botState.currentPage=p; window.reloadBot(); };
window.initBot = () => window.reloadBot();
window.toggleMaster = () => { localStorage.setItem('bot_master_active', !(localStorage.getItem('bot_master_active') === 'true')); window.reloadBot(); };
window.alterarStatusDireto = async (id, status) => { await window.API.call('updatebotconfig', {id, status: String(status).toUpperCase()}); };
