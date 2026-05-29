window.adminState = { origemAtual: 'clientes', cache: [] };

window.carregarAdmin = async (origem) => {
    window.adminState.origemAtual = origem;
    
    // Reset visual dos botões
    document.querySelectorAll('#adminTabs .nav-link').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-origem') === origem);
    });

    document.getElementById('titulo-aba').innerText = `Gerenciando: ${origem}`;
    const tbody = document.getElementById('admin-list');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-3 text-muted">Carregando...</td></tr>';

    try {
        const dados = await window.API.call('get' + origem);
        window.adminState.cache = dados || [];
        
        tbody.innerHTML = window.adminState.cache.map(i => `<tr>
            <td class="ps-3"><img src="${i.imagem || 'https://via.placeholder.com/30'}" width="30" class="rounded-circle"></td>
            <td>${i.nome || i.username || 'N/A'}</td>
            <td>${i.tipo || i.cargo || 'N/A'}</td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarAdmin('${i.id}')"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-light btn-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${origem}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar registros.</td></tr>';
    }
};

window.editarAdmin = async (id) => {
    const item = window.adminState.cache.find(i => i.id == id);
    if(item) {
        window.botState.idEmEdicao = id;
        await window.abrirModalEspecifico(window.adminState.origemAtual, item);
    }
};

window.abrirModalCadastro = () => {
    const btn = document.getElementById('btn-novo-admin');
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Carregando...';
    window.abrirModalEspecifico(window.adminState.origemAtual);
    setTimeout(() => { btn.innerHTML = '<i class="bi bi-plus-lg"></i> Novo Registro'; }, 500);
};