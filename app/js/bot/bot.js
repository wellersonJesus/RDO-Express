window.botState = { cache: [], currentPage: 1, idEmEdicao: null };

// --- MANTENDO SUA LÓGICA APROVADA ---

window.updateMasterUI = (active) => {
    const btn = document.getElementById('btn-status-bot');
    if(!btn) return;
    btn.innerText = active ? 'MASTER ON' : 'MASTER OFF';
    btn.className = active ? "btn btn-danger btn-sm rounded-pill px-3" : "btn btn-outline-danger btn-sm rounded-pill px-3";
};

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    if (!tbody) return;
    
    const filtro = document.getElementById('filtro-tipo').value;
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    
    window.SyncBotUtils.toggleSpin('sync-icon-bot', true);
    
    try {
        const dados = await window.API.call('getbotconfig');
        window.botState.cache = (filtro === 'TODOS') ? dados : dados.filter(b => b.tipo === filtro);
        
        const paged = window.botState.cache.slice((window.botState.currentPage-1)*5, window.botState.currentPage*5);
        
        tbody.innerHTML = paged.map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" data-id="${i.id}" 
                ${(isMasterOn && String(i.status).toUpperCase() === 'TRUE') ? 'checked':''} 
                ${!isMasterOn ? 'disabled':''} 
                onchange="window.alterarStatusDireto('${i.id}', this.checked)">
            </div></td>
            <td><img src="${i.imagem}" width="30" class="rounded-circle"></td>
            <td><small class="text-muted">${i.username}</small></td>
            <td><span class="badge-tipo">${i.tipo}</span></td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button> 
                <button class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
        
        window.renderPagination();
        window.updateMasterUI(isMasterOn);
    } finally { 
        window.SyncBotUtils.toggleSpin('sync-icon-bot', false); 
    }
};

window.toggleMaster = () => {
    const newState = !(localStorage.getItem('bot_master_active') === 'true');
    localStorage.setItem('bot_master_active', newState);
    window.reloadBot();
};

window.alterarStatusDireto = async (id, status) => {
    await window.API.call('updatebotconfig', {id, status: String(status).toUpperCase()});
    const bot = window.botState.cache.find(b => b.id == id);
    if(bot) bot.status = String(status).toUpperCase();
};

window.renderPagination = () => {
    const total = Math.ceil(window.botState.cache.length/5);
    document.getElementById('bot-pagination').innerHTML = Array.from({length:total}, (_,i)=>i+1).map(p=>`<li class="page-item"><button class="page-link bg-danger text-white border-0 mx-1 rounded" onclick="window.mudarPagina(${p})">${p}</button></li>`).join('');
};

window.mudarPagina = (p) => { window.botState.currentPage=p; window.reloadBot(); };
window.initBot = () => window.reloadBot();

// --- NOVAS FUNÇÕES PARA OS MODAIS (INTEGRAÇÃO) ---

window.abrirModalCadastro = () => {
    new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();
};

window.editarBot = (id) => {
    window.botState.idEmEdicao = id;
    new bootstrap.Modal(document.getElementById('modalEdicao')).show();
};

window.excluirBot = (id) => {
    window.botState.idEmEdicao = id;
    new bootstrap.Modal(document.getElementById('modalExclusao')).show();
};

window.confirmarExclusao = async () => {
    await window.API.call('deletebotconfig', {id: window.botState.idEmEdicao});
    bootstrap.Modal.getInstance(document.getElementById('modalExclusao')).hide();
    window.reloadBot();
};