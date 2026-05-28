window.botState = { cache: [], currentPage: 1, idEmEdicao: null };
const LINHAS_POR_PAGINA = 20;

// --- FUNÇÃO DE CARREGAMENTO UNIFICADO (BUSCA EM TODAS AS FONTES) ---
window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    if (!tbody) return;
    const filtro = document.getElementById('filtro-tipo').value;
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    window.SyncBotUtils.toggleSpin('sync-icon-bot', true);
    
    try {
        // Busca simultânea de todas as abas conforme solicitado
        const [bots, users, clients, cols] = await Promise.all([
            window.API.call('getbotconfig'),
            window.API.call('getusuarios'),
            window.API.call('getclientes'),
            window.API.call('getcolaboradores')
        ]);

        // Une todos os dados no cache
        let allData = [...(bots||[]), ...(users||[]), ...(clients||[]), ...(cols||[])];
        
        // Filtra pelo tipo selecionado
        window.botState.cache = (filtro === 'TODOS') ? allData : allData.filter(b => b.tipo === filtro || b.cargo === filtro);
        
        // Paginação
        const start = (window.botState.currentPage - 1) * LINHAS_POR_PAGINA;
        const paged = window.botState.cache.slice(start, start + LINHAS_POR_PAGINA);
        
        tbody.innerHTML = paged.map(i => `<tr>
            <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" data-id="${i.id}" ${(isMasterOn && String(i.status).toUpperCase() === 'TRUE') ? 'checked':''} ${!isMasterOn ? 'disabled':''} onchange="window.alterarStatusDireto('${i.id}', this.checked)"></div></td>
            <td><img src="${i.imagem || 'https://via.placeholder.com/30'}" width="30" class="rounded-circle"></td>
            <td><small class="text-muted">${i.username || i.responsavel || 'Sem Nome'}</small></td>
            <td><span class="badge-tipo">${i.tipo || i.cargo || 'N/A'}</span></td>
            <td class="text-end pe-3">
                <button type="button" class="btn btn-light btn-sm" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button> 
                <button type="button" class="btn btn-light btn-sm text-danger" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
        
        window.renderPagination();
        window.updateMasterUI(isMasterOn);
    } finally { window.SyncBotUtils.toggleSpin('sync-icon-bot', false); }
};

// --- CONTROLE MASTER ---
window.updateMasterUI = (active) => {
    const btn = document.getElementById('btn-status-bot');
    if(!btn) return;
    btn.innerText = active ? 'MASTER ON' : 'MASTER OFF';
    btn.className = active ? "btn btn-danger btn-sm rounded-pill px-3" : "btn btn-outline-danger btn-sm rounded-pill px-3";
};

window.toggleMaster = () => {
    const newState = !(localStorage.getItem('bot_master_active') === 'true');
    localStorage.setItem('bot_master_active', newState);
    window.reloadBot();
};

window.alterarStatusDireto = async (id, status) => { await window.API.call('updatebotconfig', {id, status: String(status).toUpperCase()}); };

// --- MODAIS E AÇÕES ---
window.abrirModalCadastro = () => new bootstrap.Modal(document.getElementById('modalEscolhaTipo')).show();

window.abrirModalEspecifico = (tipo) => {
    bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo')).hide();
    const mapa = {'usuario': 'modalUsuario', 'cliente': 'modalCliente', 'colaborador': 'modalColaborador'};
    new bootstrap.Modal(document.getElementById(mapa[tipo])).show();
};

window.editarBot = (id) => { window.botState.idEmEdicao = id; new bootstrap.Modal(document.getElementById('modalEdicao')).show(); };
window.excluirBot = (id) => { window.botState.idEmEdicao = id; new bootstrap.Modal(document.getElementById('modalExclusao')).show(); };

window.confirmarExclusao = async () => {
    await window.API.call('deletebotconfig', {id: window.botState.idEmEdicao});
    bootstrap.Modal.getInstance(document.getElementById('modalExclusao')).hide();
    window.reloadBot();
};

// --- SALVAR COM VALIDAÇÃO E LOADING SPINNER ---
window.salvarRegistro = async (entidade, prefixo, campos) => {
    let isValid = true;
    campos.forEach(campo => {
        const el = document.getElementById(prefixo + campo);
        if (!el || !el.value) { 
            if(el) el.classList.add('is-invalid'); 
            isValid = false; 
        } else { 
            el.classList.remove('is-invalid'); 
        }
    });

    if (!isValid) return;

    const btn = document.querySelector('.modal.show button.btn-danger');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    try {
        let dados = { action: 'add' + entidade, apiKey: 'aquieumakdjdddggjrtr', id: Date.now().toString() };
        campos.forEach(campo => { dados[campo] = document.getElementById(prefixo + campo).value; });
        
        await window.API.call('add' + entidade, dados);
        
        // Limpa formulário
        campos.forEach(campo => { const el = document.getElementById(prefixo + campo); if(el) el.value = ''; });
        
        const modalEl = document.querySelector('.modal.show');
        if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
        
        window.botState.currentPage = 1;
        await window.reloadBot();
    } catch (e) { alert("Erro ao processar: " + e); }
    finally { btn.disabled = false; btn.innerHTML = originalText; }
};

// --- PAGINAÇÃO E INICIALIZAÇÃO ---
window.renderPagination = () => {
    const total = Math.ceil(window.botState.cache.length / LINHAS_POR_PAGINA);
    document.getElementById('bot-pagination').innerHTML = Array.from({length:total}, (_,i)=>i+1).map(p=>`<li class="page-item"><button class="page-link bg-danger text-white border-0 mx-1 rounded" onclick="window.mudarPagina(${p})">${p}</button></li>`).join('');
};

window.mudarPagina = (p) => { window.botState.currentPage=p; window.reloadBot(); };
window.initBot = () => window.reloadBot();
