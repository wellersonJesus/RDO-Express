window.botState = { 
    cache: [], 
    idEmEdicao: null, 
    origemEmEdicao: null, 
    paginaAtual: 1, 
    itensPorPagina: 15,
    isFetching: false // <-- TRAVA DE SEGURANÇA
};

window.mudarPagina = (dir) => {
    const totalPag = Math.max(1, Math.ceil(window.botState.cache.length / window.botState.itensPorPagina));
    window.botState.paginaAtual = Math.min(Math.max(1, window.botState.paginaAtual + dir), totalPag);
    window.reloadBot();
};

window.initBot = async () => {
    // Agora o initBot NÃO bloqueia a execução. 
    // Ele apenas atualiza o estado do botão Master.
    const btn = document.getElementById('btn-status-bot');
    const isMasterOn = window.checkMaster(); // Verifica via app.js
    
    if (btn) {
        btn.innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
        btn.className = isMasterOn ? 'btn btn-danger btn-sm rounded-pill px-3' : 'btn btn-outline-danger btn-sm rounded-pill px-3';
    }

    // Chama o carregamento, que tratará o visual cinza
    await window.reloadBot();
};

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    const infoPag = document.getElementById('info-paginacao');
    const isMasterOn = window.checkMaster(); // Captura estado atual
    
    if (!tbody) return;
    
    const syncIcon = document.getElementById('sync-icon-bot');
    if(syncIcon) syncIcon.classList.add('spinner-rotate');
    
    try {
        const [users, clients, cols] = await Promise.all([
            window.API.call('getusuarios').catch(() => []), 
            window.API.call('getclientes').catch(() => []), 
            window.API.call('getcolaboradores').catch(() => [])
        ]);
        
        let dados = [
            ...(users||[]).map(i => ({...i, origem:'usuarios'})), 
            ...(clients||[]).map(i => ({...i, origem:'clientes'})), 
            ...(cols||[]).map(i => ({...i, origem:'colaboradores'}))
        ];

        window.botState.cache = dados;
        // ... (lógica de paginação segue o seu padrão original) ...
        const start = (window.botState.paginaAtual - 1) * window.botState.itensPorPagina;
        const pageData = dados.slice(start, start + window.botState.itensPorPagina);

        // Renderização com Bloqueio Visual (UX Cinza)
        tbody.innerHTML = pageData.map(i => {
            const isReadOnly = (i.origem === 'clientes' || i.origem === 'colaboradores');
            const rowClass = !isMasterOn ? 'text-muted' : ''; // Classe cinza se desligado
            
            return `<tr class="${rowClass}">
                <td class="ps-3">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" 
                        ${!isMasterOn ? 'disabled' : ''} 
                        onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')" 
                        ${String(i.status||'').toUpperCase()=='TRUE'?'checked':''}>
                    </div>
                </td>
                <td><img src="${i.imagem || '...'}" width="30" class="rounded-circle"></td>
                <td>${i.username || i.nome || 'N/A'}</td>
                <td><span class="badge ${isMasterOn ? 'bg-light text-dark' : 'bg-secondary'}">${i.origem.toUpperCase()}</span></td>
                <td class="text-end pe-3">
                    <button class="btn btn-light btn-sm shadow-sm" ${!isMasterOn ? 'disabled' : ''} onclick="window.editarBot('${i.id}')">
                        <i class="bi ${isReadOnly ? 'bi-eye' : 'bi-pencil-square'}"></i>
                    </button> 
                    ${(!isReadOnly && isMasterOn) ? `<button class="btn btn-light btn-sm shadow-sm text-danger" onclick="window.confirmarExclusao('${i.id}', '${i.origem}')"><i class="bi bi-trash"></i></button>` : ''}
                </td>
            </tr>`;
        }).join('');

    } catch (e) { 
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Falha na conexão.</td></tr>';
    } finally { 
        if(syncIcon) syncIcon.classList.remove('spinner-rotate'); 
    }
};

window.toggleMaster = () => {
    try {
        // 1. Obtém o estado atual via função global do app.js
        const currentState = window.checkMaster();
        const newState = !currentState;
        
        // 2. Persiste o novo estado
        localStorage.setItem('bot_master_active', newState.toString());
        
        console.log(`[Bot] Sistema Master RDO alterado para: ${newState ? 'ATIVADO' : 'DESATIVADO'}`);
        
        // 3. Atualiza a interface (initBot redesenha a lista com base no novo checkMaster)
        if (typeof window.initBot === 'function') {
            window.initBot();
        } else {
            // Fallback caso a página não esteja renderizada
            window.location.reload(); 
        }
    } catch (err) {
        console.error("[Bot] Erro ao alternar Master:", err);
    }
};

window.abrirModalCadastro = () => {
    const isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    
    if (!isMasterOn) {
        alert("Atenção: Sistema Master RDO desligado.");
        return;
    }
    
    // PONTO CHAVE: Abre apenas usuários aqui
    window.abrirModalEspecifico('usuarios');
};

window.editarBot = async (id) => {
    // 1. Trava de segurança absoluta
    if (!window.checkMaster()) {
        console.warn("[Segurança] Ação bloqueada: Sistema Master RDO desligado.");
        // Opcional: Feedback visual ao usuário
        alert("Atenção: O sistema Master RDO está desligado. Edição bloqueada.");
        return;
    }

    // 2. Localização do item no cache
    const item = window.botState.cache.find(i => i.id == id);
    if (!item) {
        console.error(`[Admin] Erro: Registro ${id} não encontrado.`);
        return;
    }

    // 3. Sincronização de Estado
    window.botState.idEmEdicao = id;
    window.botState.origemEmEdicao = item.origem;
    
    // 4. Abertura do Modal
    await window.abrirModalEspecifico(item.origem, item);
    
    // 5. Aplicação das Regras de Negócio (Read Only)
    const isReadOnly = (item.origem !== 'usuarios');
    const map = { 
        'usuarios': 'modalUsuario', 
        'clientes': 'modalCliente', 
        'colaboradores': 'modalColaborador' 
    };
    
    const modalEl = document.getElementById(map[item.origem]);
    
    if (modalEl) {
        const inputs = modalEl.querySelectorAll('input, select');
        const btnSalvar = modalEl.querySelector('.btn-danger');
        
        // Bloqueia inputs se não for 'usuarios'
        inputs.forEach(i => i.disabled = isReadOnly);
        
        // Esconde botão de salvar se for apenas leitura
        if (btnSalvar) {
            btnSalvar.style.display = isReadOnly ? 'none' : 'block';
        }
    }
};

window.abrirModalEspecifico = async (origem, data = null) => {
    const map = { 'usuarios': 'modalUsuario', 'clientes': 'modalCliente', 'colaboradores': 'modalColaborador' };
    const modalId = map[origem];
    let modalEl = document.getElementById(modalId);

    // Se o modal não existir no DOM, busca via Fetch
    if (!modalEl) {
        const paths = { 'usuarios': 'pages/usuarios/modal-usuario.html', 'clientes': 'pages/clientes/modal-cliente.html', 'colaboradores': 'pages/colaborador/modal-colaborador.html' };
        const resp = await fetch(paths[origem]);
        const html = await resp.text();
        document.body.insertAdjacentHTML('beforeend', html);
        modalEl = document.getElementById(modalId);
    }

    // Preenchimento dos dados
    const inputs = modalEl.querySelectorAll('input, select');
    inputs.forEach(i => {
        const key = i.id.split('-').pop(); // Pega o nome do campo após o hífen
        if (data && data.hasOwnProperty(key)) {
            i.value = data[key];
        } else if (!data) {
            i.value = '';
        }
        i.disabled = false;
        i.style.borderColor = '';
    });

    // Abertura segura
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();
};

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    const inputs = el.querySelectorAll('input, select');
    let valid = true;

    inputs.forEach(i => {
        if (!i.value && !i.id.includes('imagem')) {
            i.style.borderColor = 'red';
            valid = false;
        } else {
            i.style.borderColor = '';
        }
    });

    if (!valid) return;

    const btn = el.querySelector('.btn-danger');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    let dados = { id: window.botState.idEmEdicao || Date.now().toString() };
    inputs.forEach(i => { if(i.id) dados[i.id.split('-')[1]] = i.value; });
    
    const action = window.botState.idEmEdicao ? 'update' : 'add';
    await window.API.call(action + window.botState.origemEmEdicao, dados);
    
    bootstrap.Modal.getInstance(el).hide();
    window.botState.idEmEdicao = null;
    window.reloadBot();
    btn.innerHTML = originalText;
};

window.alterarStatusDireto = async (id, status, origem) => {
    await window.API.call('update' + origem, { id, status: status ? 'TRUE' : 'FALSE' });
    window.reloadBot();
};

window.confirmarExclusao = (id, origem) => { /* Mantida mesma lógica */ };

async function carregarPaginaBot() {
    const container = document.getElementById('main-content');
    container.innerHTML = await fetch('app/pages/bot/bot.html').then(r => r.text());
    
    // Chame a função aqui após injetar o HTML
    if (typeof window.initBot === 'function') {
        window.initBot();
    }
}

window.initBotPage = function() {
    console.log("Inicializando Bot...");
    window.initBot(); // Chama a sua função principal de carregamento
};
