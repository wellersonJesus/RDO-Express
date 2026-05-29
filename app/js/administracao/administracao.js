window.adminState = { 
    origemAtual: 'clientes', 
    cache: [], 
    paginaAtual: 1, 
    itensPorPagina: 15 // Limite fixo em 15
};

window.abrirModalCadastro = () => {
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    
    // Se desligado, mostra o modal premium de bloqueio
    if (!isMasterOn) {
        const modalElement = document.getElementById('modalBloqueioMaster');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        return; // Interrompe, mantendo a tela exatamente como está
    }
    
    // Se ligado, abre o modal de cadastro original
    const modalCadastro = new bootstrap.Modal(document.getElementById('modalEscolhaTipo'));
    modalCadastro.show();
};

window.mudarPaginaAdmin = (dir) => {
    // Calcula total para limitar a navegação
    const totalPag = Math.max(1, Math.ceil(window.adminState.cache.length / window.adminState.itensPorPagina));
    
    // Atualiza página dentro dos limites 1 e totalPag
    window.adminState.paginaAtual = Math.min(Math.max(1, window.adminState.paginaAtual + dir), totalPag);
    
    // Re-renderiza a tabela
    window.renderizarAdmin();
};

window.carregarAdmin = async (origem) => {
    // 1. Atualiza o estado visual
    window.adminState.origemAtual = origem;
    window.adminState.paginaAtual = 1;

    // 2. Atualiza UI dos botões
    document.querySelectorAll('.btn-tab-custom').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-origem') === origem) btn.classList.add('active');
    });

    // 3. Atualiza o título
    const tituloAba = document.getElementById('titulo-aba');
    if (tituloAba) tituloAba.innerText = `Gerenciando: ${origem.charAt(0).toUpperCase() + origem.slice(1)}`;

    // 4. CHAMADA DA API (O PONTO QUE FALTAVA)
    const syncIcon = document.getElementById('sync-icon-admin');
    if (syncIcon) syncIcon.classList.add('spinner-rotate');

    try {
        // Assume que a sua API chama 'getclientes' ou 'getcolaboradores'
        const res = await window.API.call(`get${origem}`);
        
        // Atualiza o cache com os dados retornados
        window.adminState.cache = Array.isArray(res) ? res : [];
        
        // 5. Renderiza a tabela agora que o cache está populado
        window.renderizarAdmin();
        
    } catch (e) {
        console.error(`Erro ao carregar ${origem}:`, e);
        window.adminState.cache = [];
        window.renderizarAdmin();
    } finally {
        if (syncIcon) syncIcon.classList.remove('spinner-rotate');
    }
};

window.reloadAdministracao = async () => {
    const tbody = document.getElementById('bot-list'); // Assumindo que usa o mesmo ID da tabela
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    
    if (!tbody) return;

    // Trava de segurança com a mensagem e ícone solicitados
    if (!isMasterOn) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-5">
            <i class="bi bi-exclamation-triangle-fill text-danger d-block mb-3" style="font-size: 2.5rem;"></i>
            <h5 class="fw-bold">Sistema Master RDO desligado.</h5>
            <p>Faça um contato com a gestão.</p>
        </td></tr>`;
        return;
    }

    // Se o sistema estiver ligado, segue a execução normal do seu reload
    console.log("Sistema ativo, carregando dados...");
    // ... restante da sua lógica de carregamento ...
};

window.renderizarAdmin = () => {
    const tbody = document.getElementById('admin-list');
    const infoPag = document.getElementById('info-paginacao-admin');
    if (!tbody) return;

    let dados = window.adminState.cache;
    
    // Filtro
    if (window.adminState.filtroAtual) {
        const termo = window.adminState.filtroAtual.toLowerCase();
        dados = dados.filter(i => (i.nome || i.username || '').toLowerCase().includes(termo));
    }
    
    // Paginação
    const totalPag = Math.max(1, Math.ceil(dados.length / window.adminState.itensPorPagina));
    if (window.adminState.paginaAtual > totalPag) window.adminState.paginaAtual = totalPag;
    if (infoPag) infoPag.innerText = `Pág ${window.adminState.paginaAtual} de ${totalPag}`;
    
    const inicio = (window.adminState.paginaAtual - 1) * window.adminState.itensPorPagina;
    const dadosPaginados = dados.slice(inicio, inicio + window.adminState.itensPorPagina);

    tbody.innerHTML = dadosPaginados.map(i => {
        const isActive = String(i.status || '').toUpperCase() === 'TRUE';
        return `<tr>
            <td class="ps-3"><img src="${i.imagem ? 'https://wsrv.nl/?url=' + encodeURIComponent(i.imagem) : 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" width="30" class="rounded-circle" style="object-fit:cover;"></td>
            <td>${i.nome || i.username || 'N/A'}</td>
            <td><span class="badge ${isActive ? 'bg-success' : 'bg-secondary'} rounded-pill">${isActive ? 'Ativo' : 'Inativo'}</span></td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-sm" onclick="window.editarAdmin('${i.id}', false)"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-light btn-sm" onclick="window.editarAdmin('${i.id}', true)"><i class="bi bi-eye"></i></button>
            </td>
        </tr>`;
    }).join('');
};

window.mudarPaginaAdmin = (dir) => {
    const totalPag = Math.max(1, Math.ceil(window.adminState.cache.length / window.adminState.itensPorPagina));
    
    // Calcula nova página mantendo dentro dos limites 1 a totalPag
    const novaPagina = window.adminState.paginaAtual + dir;
    if (novaPagina >= 1 && novaPagina <= totalPag) {
        window.adminState.paginaAtual = novaPagina;
        window.renderizarAdmin();
    }
};

window.editarAdmin = async (id, isReadOnly = false) => {
    const item = window.adminState.cache.find(i => i.id == id);
    if (!item) return;

    window.botState.idEmEdicao = id;
    window.botState.origemEmEdicao = window.adminState.origemAtual;
    
    // Abre o modal
    await window.abrirModalEspecifico(window.adminState.origemAtual, item);
    
    const modalId = window.adminState.origemAtual === 'clientes' ? 'modalCliente' : 'modalColaborador';
    const modalEl = document.getElementById(modalId);
    
    if (modalEl) {
        const inputs = modalEl.querySelectorAll('input, select');
        const btnSalvar = modalEl.querySelector('.btn-danger'); // Botão de Salvar
        
        // 1. Bloqueia ou libera os inputs
        inputs.forEach(i => {
            i.disabled = isReadOnly;
        });

        // 2. Controla a visibilidade do botão de salvar
        if (btnSalvar) {
            btnSalvar.style.display = isReadOnly ? 'none' : 'block';
        }
    }
};

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    const inputs = el.querySelectorAll('input, select');
    
    // 1. Definição dos campos obrigatórios por modal
    // Coloque aqui o ID dos campos que devem ficar vermelhos se vazios
    const obrigatorios = modalId === 'modalCliente' 
        ? ['c-username', 'c-responsavel', 'c-contato'] 
        : ['col-username', 'col-cpf_cnpj']; // Exemplo para colaborador

    let valid = true;
    let dados = { id: window.botState?.idEmEdicao || Date.now().toString() };

    // 2. Validação Visual e Captura de Dados
    inputs.forEach(i => {
        if (!i.id) return;

        // Limpa a borda vermelha antes de validar
        i.classList.remove('input-error');

        // Verifica se é obrigatório e está vazio
        if (obrigatorios.includes(i.id) && !i.value.trim()) {
            i.classList.add('input-error');
            valid = false;
        }

        // Captura o dado (limpa o prefixo c- ou col-)
        const chave = i.id.includes('-') ? i.id.split('-')[1] : i.id;
        dados[chave] = i.value;
    });

    if (!valid) return; // Para aqui se algo falhar visualmente

    // 3. Efeito de carregamento e envio
    const btn = el.querySelector('.btn-danger');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    try {
        const action = (window.botState?.idEmEdicao ? 'update' : 'add') + window.adminState.origemAtual;
        await window.API.call('post', { action, ...dados });
        
        bootstrap.Modal.getInstance(el).hide();
        window.botState.idEmEdicao = null;
        window.carregarAdmin(window.adminState.origemAtual);
    } catch(e) {
        console.error("Erro no salvamento:", e);
    } finally {
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
    const errorDiv = document.getElementById('colaborador-error');
    errorDiv.classList.add('d-none'); // Esconde erro anterior

    // 1. Campos Obrigatórios
    const camposObrigatorios = [
        { id: 'col-username', nome: 'Nome' },
        { id: 'col-cpf_cnpj', nome: 'CPF/CNPJ' }
    ];

    let valid = true;
    camposObrigatorios.forEach(field => {
        const input = document.getElementById(field.id);
        if (!input.value.trim()) {
            input.classList.add('input-error');
            valid = false;
        } else {
            input.classList.remove('input-error');
        }
    });

    // 2. Validação de Funções
    const funcoes = Array.from(modal.querySelectorAll('.col-funcao:checked')).map(c => c.value);
    if (funcoes.length === 0) {
        errorDiv.textContent = "Selecione pelo menos uma função!";
        errorDiv.classList.remove('d-none');
        return;
    }

    if (!valid) {
        errorDiv.textContent = "Preencha os campos obrigatórios em destaque.";
        errorDiv.classList.remove('d-none');
        return;
    }

    // 3. Lógica de Verificação de Duplicidade (CNPJ/CPF)
    const cpfCnpjAtual = document.getElementById('col-cpf_cnpj').value.trim();
    const idEmEdicao = window.botState?.idEmEdicao;

    const duplicado = window.adminState.cache.find(c => 
        c.cpf_cnpj === cpfCnpjAtual && 
        c.id !== idEmEdicao // Ignora o próprio registro se estiver editando
    );

    if (duplicado) {
        errorDiv.textContent = "Erro: Este CPF/CNPJ já está cadastrado para outro colaborador!";
        errorDiv.classList.remove('d-none');
        document.getElementById('col-cpf_cnpj').classList.add('input-error');
        return;
    }

    // 4. Salvar
    document.getElementById('col-colaborador').value = funcoes.join('/');
    
    // Prossiga com sua lógica de salvamento (ex: chamar a API)
    try {
        await window.salvarNovo('modalColaborador');
    } catch (e) {
        errorDiv.textContent = "Erro ao salvar: " + e.message;
        errorDiv.classList.remove('d-none');
    }
};

window.salvarCliente = async () => {
    const modal = document.getElementById('modalCliente');
    const btn = document.getElementById('btn-salvar-cliente');
    const txt = document.getElementById('txt-salvar');
    const spinner = document.getElementById('spinner-salvar');
    
    // Lista de campos obrigatórios (IDs do HTML)
    const obrigatorios = ['c-username', 'c-responsavel', 'c-contato'];
    let valid = true;

    // Limpa bordas anteriores e valida
    obrigatorios.forEach(id => {
        const input = document.getElementById(id);
        if (!input.value.trim()) {
            input.classList.add('input-error'); // Aplica a borda vermelha
            valid = false;
        } else {
            input.classList.remove('input-error');
        }
    });

    if (!valid) {
        alert("Por favor, preencha os campos obrigatórios (Nome, Responsável e Contato).");
        return;
    }

    // Efeito de Loop
    btn.disabled = true;
    spinner.classList.remove('d-none');
    txt.innerText = "Salvando...";

    try {
        await window.salvarNovo('modalCliente');
        bootstrap.Modal.getInstance(modal).hide();
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar cliente.");
    } finally {
        btn.disabled = false;
        spinner.classList.add('d-none');
        txt.innerText = "Salvar Cliente";
    }
};

window.toggleComissao = () => {
    const isMotoboy = document.getElementById('checkMotoboy').checked;
    const divComissao = document.getElementById('div-comissao');
    if(isMotoboy) divComissao.classList.remove('d-none');
    else divComissao.classList.add('d-none');
};

