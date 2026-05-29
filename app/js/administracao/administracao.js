window.adminState = { 
    origemAtual: 'clientes', 
    cache: [], 
    paginaAtual: 1, 
    itensPorPagina: 15 
};

// Ajuste na função de abrir o modal de cadastro
window.abrirModalCadastro = () => {
    const origem = window.adminState.origemAtual;
    // Mapeamento correto para identificar o ID do modal
    const modalMap = {
        'clientes': 'modalCliente',
        'colaboradores': 'modalColaborador'
    };
    
    // Passa null pois é um novo cadastro
    window.abrirModalEspecifico(origem, null);
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

    let dados = window.adminState.cache;
    
    // Aplicar Filtro
    if (window.adminState.filtroAtual) {
        const termo = window.adminState.filtroAtual.toLowerCase();
        dados = dados.filter(i => 
            (i.username || i.nome || '').toLowerCase().includes(termo)
        );
    }
    
    // Paginação com dados filtrados
    const totalPag = Math.max(1, Math.ceil(dados.length / window.adminState.itensPorPagina));
    // ... (o restante da sua lógica de paginação permanece igual)

    tbody.innerHTML = dados.map(i => {
        const rawStatus = String(i.status || 'FALSE').toUpperCase();
        const isActive = rawStatus === 'TRUE' || rawStatus === 'ATIVO';
        
        // Estilo: removi o 'fw-bold' do nome para atender ao seu pedido de fonte fina
        return `<tr>
            <td class="ps-3">
                <img src="${i.imagem ? 'https://wsrv.nl/?url=' + encodeURIComponent(i.imagem) : 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" 
                width="30" class="rounded-circle" style="object-fit:cover;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
            </td>
            <td style="font-weight: 400 !important;">${i.nome || i.username || 'N/A'}</td>
            <td>
                <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'} rounded-pill" style="font-size: 0.65rem;">
                    ${isActive ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarAdmin('${i.id}')"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-light btn-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${window.adminState.origemAtual}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
};

// Ajuste na função editar para garantir que o idEmEdicao seja setado
window.editarAdmin = async (id) => {
    const item = window.adminState.cache.find(i => i.id == id);
    if(item) {
        window.botState.idEmEdicao = id; // Garante que o bot reconheça a edição
        window.botState.origemEmEdicao = window.adminState.origemAtual;
        await window.abrirModalEspecifico(window.adminState.origemAtual, item);
    }
};

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    const inputs = el.querySelectorAll('input, select');
    const btn = el.querySelector('.btn-danger');
    
    // Validação com borda vermelha
    let valid = true;
    inputs.forEach(i => {
        if (!i.value && i.hasAttribute('required')) {
            i.classList.add('input-error');
            valid = false;
        } else {
            i.classList.remove('input-error');
        }
    });
    if (!valid) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    // Extração inteligente de campos
    let dados = { id: window.botState?.idEmEdicao || Date.now().toString() };
    inputs.forEach(i => {
        if(i.id) {
            // Pega o nome do campo removendo prefixo (c- ou col-)
            const key = i.id.includes('-') ? i.id.split('-')[1] : i.id;
            dados[key] = i.value;
        }
    });
    
    try {
        const action = (window.botState?.idEmEdicao ? 'update' : 'add') + window.adminState.origemAtual;
        await window.API.call('post', { action, ...dados });
        
        bootstrap.Modal.getInstance(el).hide();
        window.botState.idEmEdicao = null;
        window.carregarAdmin(window.adminState.origemAtual);
    } catch(e) { console.error(e); } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

window.toggleComissao = () => {
    const isMotoboy = document.getElementById('checkMotoboy').checked;
    document.getElementById('div-comissao').classList.toggle('d-none', !isMotoboy);
};

window.salvarColaborador = async () => {
    const modal = document.getElementById('modalColaborador');
    const btn = document.getElementById('btn-salvar-colaborador');
    const txt = document.getElementById('txt-salvar');
    const spinner = document.getElementById('spinner-salvar');
    const errorDiv = document.getElementById('colaborador-error');
    
    // Validação
    const funcoes = Array.from(modal.querySelectorAll('.col-funcao:checked')).map(c => c.value);
    if(funcoes.length === 0) {
        errorDiv.textContent = "Selecione pelo menos uma função!";
        errorDiv.classList.remove('d-none');
        return;
    }
    document.getElementById('col-colaborador').value = funcoes.join('/');

    // Efeito Loading
    btn.disabled = true;
    spinner.classList.remove('d-none');
    txt.textContent = "Salvando...";

    try {
        // Usa a lógica universal salvarNovo
        await window.salvarNovo('modalColaborador');
        bootstrap.Modal.getInstance(modal).hide();
    } catch (e) {
        errorDiv.textContent = "Erro ao salvar: " + e.message;
        errorDiv.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        spinner.classList.add('d-none');
        txt.textContent = "Salvar Colaborador";
    }
};

// Função para Salvar Clientes (Com validações de Nome, Responsável, Contato)
window.salvarCliente = async () => {
    const modal = document.getElementById('modalCliente');
    const requiredFields = ['c-username', 'c-responsavel', 'c-contato'];
    let valid = true;

    requiredFields.forEach(id => {
        const el = document.getElementById(id);
        if(!el.value) { el.classList.add('input-error'); valid = false; }
        else el.classList.remove('input-error');
    });

    if(!valid) return;
    
    // Segue a mesma lógica do Colaborador para o loop...
    // (Pode usar a mesma estrutura acima trocando os prefixos)
};

// Toggle para mostrar/esconder campo comissão
window.toggleComissao = () => {
    const isMotoboy = document.getElementById('checkMotoboy').checked;
    const divComissao = document.getElementById('div-comissao');
    if(isMotoboy) divComissao.classList.remove('d-none');
    else divComissao.classList.add('d-none');
};

