/* ══════════════════════════════════════════════
   BOT.JS — RDO Express
   Painel de Gestão e Automatização
   ══════════════════════════════════════════════ */

// ── Estado Global do Bot ──
window.botState = {
    cache: [],
    cacheCompleto: [],      // Dados brutos sem filtro (para busca)
    idEmEdicao: null,
    origemEmEdicao: null,
    paginaAtual: 1,
    itensPorPagina: 15,
    isFetching: false
};

// ── Logo padrão do projeto (fallback) ──
const LOGO_PADRAO = 'app/assets/img/logo.png';

// ══════════════════════════════════════════════
//  PAGINAÇÃO
// ══════════════════════════════════════════════

window.mudarPagina = (dir) => {
    const totalPag = Math.max(1, Math.ceil(window.botState.cache.length / window.botState.itensPorPagina));
    window.botState.paginaAtual = Math.min(Math.max(1, window.botState.paginaAtual + dir), totalPag);
    renderizarTabela();
};

// ══════════════════════════════════════════════
//  INIT BOT
// ══════════════════════════════════════════════

window.initBot = async () => {
    // Atualiza estado do botão Master
    const btn = document.getElementById('btn-status-bot');
    const isMasterOn = window.checkMaster();

    if (btn) {
        btn.innerText = isMasterOn ? 'MASTER ON' : 'MASTER OFF';
        btn.className = isMasterOn
            ? 'btn btn-danger btn-sm rounded-pill px-3'
            : 'btn btn-outline-danger btn-sm rounded-pill px-3';
    }

    // Carrega dados do banco
    await window.reloadBot();
};

// ══════════════════════════════════════════════
//  RELOAD BOT — Busca dados do banco
// ══════════════════════════════════════════════

window.reloadBot = async () => {
    const tbody = document.getElementById('bot-list');
    if (!tbody) return;

    // Trava de segurança contra chamadas duplicadas
    if (window.botState.isFetching) return;
    window.botState.isFetching = true;

    const syncIcon = document.getElementById('sync-icon-bot');
    if (syncIcon) syncIcon.classList.add('spinner-rotate');

    try {
        // ── Busca TODOS os dados de todas as origens ──
        const [users, clients, cols] = await Promise.all([
            window.API.call('getusuarios').catch(() => []),
            window.API.call('getclientes').catch(() => []),
            window.API.call('getcolaboradores').catch(() => [])
        ]);

        console.log('[Bot] Dados recebidos:', {
            usuarios: (users || []).length,
            clientes: (clients || []).length,
            colaboradores: (cols || []).length
        });

        // ── Monta array unificado com origem ──
        const todosDados = [
            ...(users || []).map(i => ({ ...i, origem: 'usuarios' })),
            ...(clients || []).map(i => ({ ...i, origem: 'clientes' })),
            ...(cols || []).map(i => ({ ...i, origem: 'colaboradores' }))
        ];

        // Salva cache completo (sem filtro) para busca funcionar
        window.botState.cacheCompleto = todosDados;

        // Aplica filtros e renderiza
        window.filtrarBot();

    } catch (e) {
        console.error('[Bot] Falha ao carregar dados:', e);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger py-4">
                    <i class="bi bi-wifi-off me-2"></i>Falha na conexão. Tente novamente.
                </td>
            </tr>`;
    } finally {
        window.botState.isFetching = false;
        if (syncIcon) syncIcon.classList.remove('spinner-rotate');
    }
};

// ══════════════════════════════════════════════
//  FILTRO INTELIGENTE (Tipo + Busca por Nome)
// ══════════════════════════════════════════════

window.filtrarBot = () => {
    const filtroSelect = document.getElementById('filtro-tipo');
    const buscaInput = document.getElementById('busca-nome');

    const tipoSelecionado = filtroSelect ? filtroSelect.value : 'TODOS';
    const termoBusca = buscaInput ? buscaInput.value.trim().toLowerCase() : '';

    let dados = [...window.botState.cacheCompleto];

    // Filtro por tipo (origem)
    if (tipoSelecionado !== 'TODOS') {
        dados = dados.filter(item => item.origem === tipoSelecionado);
    }

    // Filtro por nome (busca inteligente)
    if (termoBusca.length > 0) {
        dados = dados.filter(item => {
            const nome = (item.username || item.nome || '').toLowerCase();
            const id = (item.id || '').toLowerCase();
            const contato = (item.contato || item.telefone || '').toLowerCase();
            return nome.includes(termoBusca) || id.includes(termoBusca) || contato.includes(termoBusca);
        });
    }

    // Atualiza cache filtrado
    window.botState.cache = dados;

    // Reseta para página 1 ao filtrar
    window.botState.paginaAtual = 1;

    // Renderiza
    renderizarTabela();
};

// ══════════════════════════════════════════════
//  RENDERIZAÇÃO DA TABELA
// ══════════════════════════════════════════════

function renderizarTabela() {
    const tbody = document.getElementById('bot-list');
    const infoPag = document.getElementById('info-paginacao');
    const infoTotal = document.getElementById('info-total');
    const isMasterOn = window.checkMaster();
    const dados = window.botState.cache;

    if (!tbody) return;

    // ── Paginação ──
    const totalPag = Math.max(1, Math.ceil(dados.length / window.botState.itensPorPagina));
    if (window.botState.paginaAtual > totalPag) window.botState.paginaAtual = totalPag;

    const start = (window.botState.paginaAtual - 1) * window.botState.itensPorPagina;
    const pageData = dados.slice(start, start + window.botState.itensPorPagina);

    // ── Info de paginação ──
    if (infoPag) infoPag.innerText = `Pág ${window.botState.paginaAtual} / ${totalPag}`;
    if (infoTotal) infoTotal.innerText = `${dados.length} registro${dados.length !== 1 ? 's' : ''}`;

    // ── Sem resultados ──
    if (dados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-inbox me-2"></i>Nenhum registro encontrado.
                </td>
            </tr>`;
        return;
    }

    // ── Renderiza linhas ──
    tbody.innerHTML = pageData.map(i => {
        const isReadOnly = (i.origem === 'clientes' || i.origem === 'colaboradores');
        const rowClass = !isMasterOn ? 'text-muted' : '';
        const nome = i.username || i.nome || 'N/A';
        const imagem = i.imagem || '';
        const iniciais = _getIniciais(nome);
        const badgeClass = `badge-${i.origem}`;

        // Avatar: tenta imagem > logo padrão > iniciais
        const avatarHtml = imagem
            ? `<img src="${imagem}" class="bot-avatar" 
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="bot-avatar-fallback" style="display:none;">${iniciais}</div>`
            : `<img src="${LOGO_PADRAO}" class="bot-avatar" 
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="bot-avatar-fallback" style="display:none;">${iniciais}</div>`;

        return `<tr class="${rowClass}">
            <td class="ps-3">
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox"
                        ${!isMasterOn ? 'disabled' : ''}
                        onchange="window.alterarStatusDireto('${i.id}', this.checked, '${i.origem}')"
                        ${String(i.status || '').toUpperCase() === 'TRUE' ? 'checked' : ''}>
                </div>
            </td>
            <td>${avatarHtml}</td>
            <td class="fw-semibold">${nome}</td>
            <td>
                <span class="badge-tipo ${badgeClass} ${!isMasterOn ? 'opacity-50' : ''}">
                    ${_labelOrigem(i.origem)}
                </span>
            </td>
            <td class="text-end pe-3">
                <button class="btn btn-light btn-action-bot shadow-sm"
                    ${!isMasterOn ? 'disabled' : ''}
                    onclick="window.editarBot('${i.id}')"
                    title="${isReadOnly ? 'Visualizar' : 'Editar'}">
                    <i class="bi ${isReadOnly ? 'bi-eye' : 'bi-pencil-square'}"></i>
                </button>
                ${(!isReadOnly && isMasterOn)
                    ? `<button class="btn btn-light btn-action-bot shadow-sm text-danger ms-1"
                            onclick="window.confirmarExclusao('${i.id}', '${i.origem}', '${nome.replace(/'/g, "\\'")}')"
                            title="Excluir">
                        <i class="bi bi-trash"></i>
                       </button>`
                    : ''}
            </td>
        </tr>`;
    }).join('');
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════

function _getIniciais(nome) {
    if (!nome || nome === 'N/A') return 'RD';
    const partes = nome.trim().split(/\s+/);
    if (partes.length >= 2) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
}

function _labelOrigem(origem) {
    const labels = {
        'usuarios': 'Usuário',
        'clientes': 'Cliente',
        'colaboradores': 'Colaborador'
    };
    return labels[origem] || origem.toUpperCase();
}

// ══════════════════════════════════════════════
//  TOGGLE MASTER
// ══════════════════════════════════════════════

window.toggleMaster = () => {
    try {
        const currentState = window.checkMaster();
        const newState = !currentState;

        localStorage.setItem('bot_master_active', newState.toString());
        console.log(`[Bot] Master RDO: ${newState ? 'ATIVADO' : 'DESATIVADO'}`);

        if (typeof window.initBot === 'function') {
            window.initBot();
        } else {
            window.location.reload();
        }
    } catch (err) {
        console.error('[Bot] Erro ao alternar Master:', err);
    }
};

// ══════════════════════════════════════════════
//  CADASTRO / EDIÇÃO / EXCLUSÃO
// ══════════════════════════════════════════════

window.abrirModalCadastro = () => {
    if (!window.checkMaster()) {
        alert('Atenção: Sistema Master RDO desligado.');
        return;
    }

    window.botState.idEmEdicao = null;
    window.botState.origemEmEdicao = 'usuarios';
    window.abrirModalEspecifico('usuarios');
};

window.editarBot = async (id) => {
    if (!window.checkMaster()) {
        alert('Atenção: O sistema Master RDO está desligado. Edição bloqueada.');
        return;
    }

    const item = window.botState.cache.find(i => i.id == id);
    if (!item) {
        console.error(`[Bot] Registro ${id} não encontrado.`);
        return;
    }

    window.botState.idEmEdicao = id;
    window.botState.origemEmEdicao = item.origem;

    await window.abrirModalEspecifico(item.origem, item);

    // Regras de negócio: read-only para clientes e colaboradores
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

        inputs.forEach(i => i.disabled = isReadOnly);
        if (btnSalvar) btnSalvar.style.display = isReadOnly ? 'none' : 'block';
    }
};

window.abrirModalEspecifico = async (origem, data = null) => {
    const map = {
        'usuarios': 'modalUsuario',
        'clientes': 'modalCliente',
        'colaboradores': 'modalColaborador'
    };
    const modalId = map[origem];
    let modalEl = document.getElementById(modalId);

    // Carrega modal via fetch se não existir
    if (!modalEl) {
        const paths = {
            'usuarios': 'pages/usuarios/modal-usuario.html',
            'clientes': 'pages/clientes/modal-cliente.html',
            'colaboradores': 'pages/colaborador/modal-colaborador.html'
        };
        try {
            const resp = await fetch(paths[origem]);
            const html = await resp.text();
            document.body.insertAdjacentHTML('beforeend', html);
            modalEl = document.getElementById(modalId);
        } catch (err) {
            console.error('[Bot] Erro ao carregar modal:', err);
            return;
        }
    }

    if (!modalEl) return;

    // Preenche campos
    const inputs = modalEl.querySelectorAll('input, select');
    inputs.forEach(i => {
        const key = i.id.split('-').pop();
        if (data && data.hasOwnProperty(key)) {
            i.value = data[key];
        } else if (!data) {
            i.value = '';
        }
        i.disabled = false;
        i.style.borderColor = '';
    });

    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();
};

// ══════════════════════════════════════════════
//  SALVAR
// ══════════════════════════════════════════════

window.salvarNovo = async (modalId) => {
    const el = document.getElementById(modalId);
    if (!el) return;

    const inputs = el.querySelectorAll('input, select');
    let valid = true;

    inputs.forEach(i => {
        if (!i.value && !i.id.includes('imagem') && !i.id.includes('obs')) {
            i.style.borderColor = '#FF0000';
            valid = false;
        } else {
            i.style.borderColor = '';
        }
    });

    if (!valid) return;

    const btn = el.querySelector('.btn-danger');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';

    try {
        let dados = { id: window.botState.idEmEdicao || Date.now().toString() };
        inputs.forEach(i => {
            if (i.id) dados[i.id.split('-')[1]] = i.value;
        });

        const action = window.botState.idEmEdicao ? 'update' : 'add';
        const origem = window.botState.origemEmEdicao || 'usuarios';

        await window.API.call(action + origem, dados);

        bootstrap.Modal.getInstance(el).hide();
        window.botState.idEmEdicao = null;
        await window.reloadBot();
    } catch (err) {
        console.error('[Bot] Erro ao salvar:', err);
        alert('Erro ao salvar. Tente novamente.');
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
};

// ══════════════════════════════════════════════
//  ALTERAR STATUS DIRETO
// ══════════════════════════════════════════════

window.alterarStatusDireto = async (id, status, origem) => {
    try {
        await window.API.call('update' + origem, { id, status: status ? 'TRUE' : 'FALSE' });
        await window.reloadBot();
    } catch (err) {
        console.error('[Bot] Erro ao alterar status:', err);
    }
};

// ══════════════════════════════════════════════
//  CONFIRMAR EXCLUSÃO (Modal Bootstrap Premium)
// ══════════════════════════════════════════════

window.confirmarExclusao = (id, origem, nome) => {
    const textoEl = document.getElementById('texto-exclusao');
    const btnConfirmar = document.getElementById('btn-confirmar-exclusao');
    const modalEl = document.getElementById('modalConfirmarExclusao');

    if (!modalEl || !btnConfirmar) {
        // Fallback: confirm nativo
        if (confirm(`Deseja excluir "${nome || id}"?`)) {
            window.executarExclusao(id, origem);
        }
        return;
    }

    if (textoEl) {
        textoEl.innerHTML = `Deseja remover <strong>${nome || id}</strong>?<br>
            <small class="text-muted">Esta ação não pode ser desfeita.</small>`;
    }

    // Remove listener anterior para evitar duplicação
    const novoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);

    novoBtn.addEventListener('click', async () => {
        novoBtn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Excluindo...';
        novoBtn.disabled = true;

        await window.executarExclusao(id, origem);

        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        // Restaura botão
        novoBtn.innerHTML = '<i class="bi bi-trash me-1"></i> Excluir';
        novoBtn.disabled = false;
    });

    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();
};

window.executarExclusao = async (id, origem) => {
    try {
        await window.API.call('delete' + origem, { id });
        console.log(`[Bot] Registro ${id} excluído com sucesso.`);
        await window.reloadBot();
    } catch (err) {
        console.error('[Bot] Erro ao excluir:', err);
        alert('Erro ao excluir. Tente novamente.');
    }
};

window.initBotPage = function () {
    console.log('[Bot] Inicializando...');
    window.initBot();
};
