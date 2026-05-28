window.botState = { cache: [], currentPage: 1, itemsPerPage: 5, idExclusao: null };

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const filtro = document.getElementById('filtro-tipo').value;
    window.SyncBotUtils.toggleSpin('sync-icon-bot', true);
    
    try {
        const todosOsBots = await window.API.call('getbotconfig');
        // Se for "TODOS", não filtramos nada, passamos o array completo
        let bots = (filtro === 'TODOS') ? todosOsBots : todosOsBots.filter(b => b.tipo === filtro);
        
        window.botState.cache = bots;
        const paged = bots.slice((window.botState.currentPage - 1) * window.botState.itemsPerPage, window.botState.currentPage * window.botState.itemsPerPage);
        
        tbody.innerHTML = paged.map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" ${i.status == 'true' ? 'checked' : ''} onchange="window.alterarStatusDireto('${i.id}', this.checked)"></div></td>
            <td><img src="${i.imagem}" width="30" class="rounded-circle"></td>
            <td><small class="text-muted">${i.username}</small></td>
            <td><span class="badge-tipo">${i.tipo}</span></td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.abrirModalCadastro('${i.id}')"><i class="bi bi-pencil-square"></i></button> 
                <button class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
        
        window.renderPagination();
        window.updateMasterUI(localStorage.getItem('bot_master_active') === 'true');
    } finally { window.SyncBotUtils.toggleSpin('sync-icon-bot', false); }
};

window.renderPagination = () => {
    const total = Math.ceil(window.botState.cache.length / window.botState.itemsPerPage);
    const pag = document.getElementById('bot-pagination');
    pag.innerHTML = Array.from({length: total}, (_, i) => i + 1).map(p => 
        `<li class="page-item ${p === window.botState.currentPage ? 'active' : ''}">
            <button class="page-link bg-danger text-white border-0 mx-1 rounded" onclick="window.mudarPagina(${p})">${p}</button>
        </li>`).join('');
};

window.mudarPagina = (p) => { window.botState.currentPage = p; window.reloadBot(); };
window.abrirModalCadastro = (id = null) => { 
    document.getElementById('modal-title').innerText = id ? 'Editar Bot' : 'Novo Cadastro'; 
    new bootstrap.Modal(document.getElementById('modalCadastroBot')).show(); 
};
window.excluirBot = (id) => { window.botState.idExclusao = id; new bootstrap.Modal(document.getElementById('modalExclusao')).show(); };
window.confirmarExclusao = async () => { await window.API.call('deletebotconfig', {id: window.botState.idExclusao}); bootstrap.Modal.getInstance(document.getElementById('modalExclusao')).hide(); window.reloadBot(); };
window.salvarBot = async () => { await window.API.call('createbotconfig', {id: document.getElementById('edit-id').value || Date.now(), username: document.getElementById('input-username').value, jid_numero: document.getElementById('input-jid').value, imagem: document.getElementById('input-imagem').value, tipo: document.getElementById('input-tipo').value}); bootstrap.Modal.getInstance(document.getElementById('modalCadastroBot')).hide(); window.reloadBot(); };
window.toggleMaster = async () => { const s = !(localStorage.getItem('bot_master_active') === 'true'); await window.API.call('updatebotconfig', {id: 'MASTER', status: String(s).toUpperCase()}); localStorage.setItem('bot_master_active', s); window.updateMasterUI(s); window.reloadBot(); };
window.updateMasterUI = (active) => { const b = document.getElementById('btn-status-bot'); if(b) { b.innerText = active ? 'MASTER ON' : 'MASTER OFF'; b.className = active ? "btn btn-danger btn-sm rounded-pill px-3" : "btn btn-outline-danger btn-sm rounded-pill px-3"; } };
window.alterarStatusDireto = async (id, status) => { await window.API.call('updatebotconfig', {id, status: String(status).toUpperCase()}); };
window.initBot = () => window.reloadBot();
