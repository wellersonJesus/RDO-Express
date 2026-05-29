window.adminState = { 
    origemAtual: 'clientes', 
    cache: [], 
    paginaAtual: 1, 
    itensPorPagina: 15 
};

window.mudarPaginaAdmin = (dir) => {
    window.adminState.paginaAtual = Math.max(1, window.adminState.paginaAtual + dir);
    window.renderizarAdmin();
};

window.carregarAdmin = async (origem) => {
    window.adminState.origemAtual = origem;
    window.adminState.paginaAtual = 1;
    
    const syncIcon = document.getElementById('sync-icon-admin');
    if(syncIcon) syncIcon.classList.add('spinner-rotate');

    document.querySelectorAll('#adminTabs .btn-tab-custom').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-origem') === origem);
    });

    document.getElementById('titulo-aba').innerText = `Gerenciando: ${origem}`;
    
    try {
        const dados = await window.API.call('get' + origem);
        window.adminState.cache = dados || [];
        window.renderizarAdmin();
    } catch (e) {
        document.getElementById('admin-list').innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar registros.</td></tr>';
    } finally {
        if(syncIcon) syncIcon.classList.remove('spinner-rotate');
    }
};

window.renderizarAdmin = () => {
    const tbody = document.getElementById('admin-list');
    if (!tbody) return;

    const dados = window.adminState.cache;
    
    // Lógica de paginação
    const totalPag = Math.max(1, Math.ceil(dados.length / window.adminState.itensPorPagina));
    if(window.adminState.paginaAtual > totalPag) window.adminState.paginaAtual = totalPag;
    
    const start = (window.adminState.paginaAtual - 1) * window.adminState.itensPorPagina;
    const pageData = dados.slice(start, start + window.adminState.itensPorPagina);
    
    const infoPag = document.getElementById('info-paginacao-admin');
    if (infoPag) infoPag.innerText = `Pág ${window.adminState.paginaAtual} de ${totalPag}`;
    
    tbody.innerHTML = pageData.map(i => {
        // Normaliza o status para exibição (Aceita 'TRUE'/'FALSE' ou 'Ativo'/'Inativo')
        const rawStatus = String(i.status || 'FALSE').toUpperCase();
        const isActive = rawStatus === 'TRUE' || rawStatus === 'ATIVO';
        const displayStatus = isActive ? 'Ativo' : 'Inativo';
        
        return `<tr>
            <td class="ps-3">
                <img src="${i.imagem ? 'https://wsrv.nl/?url=' + encodeURIComponent(i.imagem) : 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" 
                width="30" class="rounded-circle" style="object-fit:cover;" 
                onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
            </td>
            <td class="fw-bold">${i.nome || i.username || 'N/A'}</td>
            <td>
                <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'} rounded-pill" style="font-size: 0.65rem;">
                    ${displayStatus}
                </span>
            </td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarAdmin('${i.id}')">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-light btn-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${window.adminState.origemAtual}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
};

window.editarAdmin = async (id) => {
    const item = window.adminState.cache.find(i => i.id == id);
    if(item) {
        window.botState.idEmEdicao = id;
        await window.abrirModalEspecifico(window.adminState.origemAtual, item);
    }
};