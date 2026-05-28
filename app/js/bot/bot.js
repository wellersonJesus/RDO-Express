window.botState = { cache: [], currentPage: 1, itemsPerPage: 5 };

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const filtro = document.getElementById('filtro-tipo').value;
    window.SyncBotUtils.toggleSpin('sync-icon-bot', true);

    try {
        let bots = await window.API.call('getbotconfig'); // Direto na fonte para filtrar tudo
        if (filtro !== 'TODOS') bots = bots.filter(b => b.tipo === filtro);
        
        window.botState.cache = bots;
        const start = (window.botState.currentPage - 1) * window.botState.itemsPerPage;
        const paged = bots.slice(start, start + window.botState.itemsPerPage);

        tbody.innerHTML = paged.map(i => {
            const corTipo = i.tipo === 'atendente' ? 'bg-atendente' : i.tipo === 'grupo' ? 'bg-grupo' : i.tipo === 'SRE Architect' ? 'bg-SRE' : 'bg-financeiro';
            return `<tr>
                <td class="ps-3"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" ${i.status == 'true' ? 'checked' : ''} onchange="window.alterarStatusDireto('${i.id}', this.checked)"></div></td>
                <td><img src="${i.imagem || 'assets/default.png'}" width="30" class="rounded-circle border"></td>
                <td><small class="text-muted">${i.username}</small></td>
                <td><span class="badge-tipo ${corTipo}">${i.tipo}</span></td>
                <td class="text-end pe-3">
                    <button class="btn btn-light btn-sm text-secondary" onclick="window.editarBot('${i.id}')"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-light btn-sm text-secondary" onclick="window.excluirBot('${i.id}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
        window.renderPagination();
    } catch(e) { console.error(e); } finally { window.SyncBotUtils.toggleSpin('sync-icon-bot', false); }
};

window.renderPagination = () => {
    const total = Math.ceil(window.botState.cache.length / window.botState.itemsPerPage);
    const pag = document.getElementById('bot-pagination');
    pag.innerHTML = Array.from({length: total}, (_, i) => i + 1).map(p => 
        `<li class="page-item ${p === window.botState.currentPage ? 'active' : ''}">
            <button class="page-link" onclick="window.mudarPagina(${p})">${p}</button>
        </li>`).join('');
};

window.mudarPagina = (p) => { window.botState.currentPage = p; window.reloadBot(); };
window.excluirBot = async (id) => { if(confirm('Excluir?')) { await window.API.call('deletebotconfig', {id}); window.reloadBot(); } };
window.initBot = () => window.reloadBot();
window.abrirModalCadastro = () => { new bootstrap.Modal(document.getElementById('modalCadastroBot')).show(); };
