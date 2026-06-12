window.botState = {
    cache: [],
    cacheCompleto: [],
    idEmEdicao: null,
    origemEmEdicao: null,
    paginaAtual: 1,
    itensPorPagina: 15,
    isFetching: false,
    isTogglingAll: false
};

var LOGO_PADRAO = 'app/assets/img/logo.png';

function normalizeStatus(val) {
    if (val === true || val === 1) return 'TRUE';
    if (val === false || val === 0) return 'FALSE';
    var s = String(val || '').trim().toUpperCase();
    if (s === 'TRUE' || s === '1' || s === 'ATIVO' || s === 'ON' || s === 'SIM' || s === 'YES') return 'TRUE';
    return 'FALSE';
}

function syncStart() {
    var icon = document.getElementById('sync-icon-bot');
    if (icon && !icon.classList.contains('spinner-rotate')) {
        icon.classList.add('spinner-rotate');
    }
}

function syncStop() {
    var icon = document.getElementById('sync-icon-bot');
    if (icon) icon.classList.remove('spinner-rotate');
}

function applyMasterVisual(isOn) {
    var btn = document.getElementById('btn-status-bot');
    if (!btn) return;
    btn.classList.remove('btn-master-on', 'btn-master-off', 'btn-danger', 'btn-outline-danger');
    if (isOn) {
        btn.classList.add('btn-master-on');
        btn.textContent = 'MASTER ON';
    } else {
        btn.classList.add('btn-master-off');
        btn.textContent = 'MASTER OFF';
    }
}

window.checkMaster = function() {
    return localStorage.getItem('bot_master_active') === 'true';
};

window.toggleMaster = function() {
    var currentState = window.checkMaster();
    var newState = !currentState;
    localStorage.setItem('bot_master_active', newState.toString());
    window.initBot();
};

function atualizarSeletorGlobal() {
    var seletor = document.getElementById('seletor-global-status');
    if (!seletor) return;

    var isMasterOn = window.checkMaster();
    var comStatus = window.botState.cacheCompleto.filter(function(i) {
        return i.origem !== 'usuarios';
    });

    seletor.disabled = !isMasterOn || comStatus.length === 0 || window.botState.isTogglingAll;

    if (comStatus.length === 0) {
        seletor.checked = false;
        return;
    }

    var totalAtivos = 0;
    for (var k = 0; k < comStatus.length; k++) {
        if (comStatus[k].status === 'TRUE') totalAtivos++;
    }

    seletor.checked = (totalAtivos === comStatus.length);
}

window.alternarTodosStatus = async function(ativar) {
    if (!window.checkMaster()) {
        var seletor = document.getElementById('seletor-global-status');
        if (seletor) seletor.checked = false;
        alert('Atenção: Sistema Master RDO desligado.');
        return;
    }

    if (window.botState.isTogglingAll) return;
    window.botState.isTogglingAll = true;

    var seletor = document.getElementById('seletor-global-status');
    if (seletor) seletor.disabled = true;

    syncStart();

    var novoStatus = ativar ? 'TRUE' : 'FALSE';
    var dados = window.botState.cacheCompleto;

    var switches = document.querySelectorAll('#bot-list .form-check-input');
    for (var s = 0; s < switches.length; s++) {
        switches[s].disabled = true;
        switches[s].checked = ativar;
    }

    var promessas = [];
    for (var i = 0; i < dados.length; i++) {
        var item = dados[i];
        if (item.origem === 'usuarios') continue;
        promessas.push(
            window.API.call('update' + item.origem, { id: item.id, status: novoStatus })
                .catch(function() {})
        );
    }

    await Promise.all(promessas);

    window.botState.isTogglingAll = false;
    if (seletor) seletor.disabled = false;

    syncStop();
    await window.reloadBot();
};

window.mudarPagina = function(dir) {
    var totalPag = Math.max(1, Math.ceil(window.botState.cache.length / window.botState.itensPorPagina));
    window.botState.paginaAtual = Math.min(Math.max(1, window.botState.paginaAtual + dir), totalPag);
    renderizarTabela();
};

window.initBot = async function() {
    var isMasterOn = window.checkMaster();
    applyMasterVisual(isMasterOn);
    await window.reloadBot();
};

window.reloadBot = async function() {
    var tbody = document.getElementById('bot-list');
    if (!tbody) return;

    if (window.botState.isFetching) return;
    window.botState.isFetching = true;

    syncStart();

    try {
        var results = await Promise.all([
            window.API.call('getusuarios').catch(function() { return []; }),
            window.API.call('getclientes').catch(function() { return []; }),
            window.API.call('getcolaboradores').catch(function() { return []; })
        ]);

        var users = results[0] || [];
        var clients = results[1] || [];
        var cols = results[2] || [];

        if (!Array.isArray(users)) users = users && Array.isArray(users.data) ? users.data : [];
        if (!Array.isArray(clients)) clients = clients && Array.isArray(clients.data) ? clients.data : [];
        if (!Array.isArray(cols)) cols = cols && Array.isArray(cols.data) ? cols.data : [];

        var todosDados = [];

        for (var u = 0; u < users.length; u++) {
            var usr = Object.assign({}, users[u]);
            usr.origem = 'usuarios';
            usr.status = normalizeStatus(usr.status);
            todosDados.push(usr);
        }

        for (var c = 0; c < clients.length; c++) {
            var cli = Object.assign({}, clients[c]);
            cli.origem = 'clientes';
            cli.status = normalizeStatus(cli.status);
            todosDados.push(cli);
        }

        for (var b = 0; b < cols.length; b++) {
            var col = Object.assign({}, cols[b]);
            col.origem = 'colaboradores';
            col.status = normalizeStatus(col.status);
            todosDados.push(col);
        }

        window.botState.cacheCompleto = todosDados;
        window.filtrarBot();

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">' +
            '<i class="bi bi-wifi-off me-2"></i>Falha na conexão. Tente novamente.</td></tr>';
    } finally {
        window.botState.isFetching = false;
        syncStop();
    }
};

window.filtrarBot = function() {
    var filtroSelect = document.getElementById('filtro-tipo');
    var buscaInput = document.getElementById('busca-nome');

    var tipoSelecionado = filtroSelect ? filtroSelect.value : 'TODOS';
    var termoBusca = buscaInput ? buscaInput.value.trim().toLowerCase() : '';

    var dados = window.botState.cacheCompleto.slice();

    if (tipoSelecionado !== 'TODOS') {
        dados = dados.filter(function(item) { return item.origem === tipoSelecionado; });
    }

    if (termoBusca.length > 0) {
        dados = dados.filter(function(item) {
            var nome = (item.username || item.nome || item.responsavel || item.colaborador || '').toLowerCase();
            var id = String(item.id || '').toLowerCase();
            var contato = (item.contato || item.telefone || '').toLowerCase();
            return nome.indexOf(termoBusca) !== -1 || id.indexOf(termoBusca) !== -1 || contato.indexOf(termoBusca) !== -1;
        });
    }

    window.botState.cache = dados;
    window.botState.paginaAtual = 1;
    renderizarTabela();
};

function _getIniciais(nome) {
    if (!nome || nome === 'N/A') return 'RD';
    var partes = nome.trim().split(/\s+/);
    if (partes.length >= 2) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
}

function _labelOrigem(origem) {
    var labels = {
        'usuarios': 'Usuário',
        'clientes': 'Cliente',
        'colaboradores': 'Colaborador'
    };
    return labels[origem] || origem;
}

function renderizarTabela() {
    var tbody = document.getElementById('bot-list');
    var infoPag = document.getElementById('info-paginacao');
    var infoTotal = document.getElementById('info-total');
    var isMasterOn = window.checkMaster();
    var dados = window.botState.cache;

    if (!tbody) return;

    var totalPag = Math.max(1, Math.ceil(dados.length / window.botState.itensPorPagina));
    if (window.botState.paginaAtual > totalPag) window.botState.paginaAtual = totalPag;

    var start = (window.botState.paginaAtual - 1) * window.botState.itensPorPagina;
    var pageData = dados.slice(start, start + window.botState.itensPorPagina);

    if (infoPag) infoPag.innerText = 'Pág ' + window.botState.paginaAtual + ' / ' + totalPag;
    if (infoTotal) infoTotal.innerText = dados.length + ' registro' + (dados.length !== 1 ? 's' : '');

    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">' +
            '<i class="bi bi-inbox me-2"></i>Nenhum registro encontrado.</td></tr>';
        atualizarSeletorGlobal();
        return;
    }

    var html = '';

    for (var idx = 0; idx < pageData.length; idx++) {
        var i = pageData[idx];
        var isReadOnly = (i.origem === 'clientes' || i.origem === 'colaboradores');
        var rowClass = !isMasterOn ? 'text-muted' : '';
        var nome = i.username || i.nome || i.responsavel || i.colaborador || 'N/A';
        var imagem = i.imagem || '';
        var iniciais = _getIniciais(nome);
        var badgeClass = 'badge-' + i.origem;
        var statusChecked = i.status === 'TRUE' ? 'checked' : '';
        var statusDisabled = !isMasterOn ? 'disabled' : '';
        var masterDisabled = !isMasterOn ? 'disabled' : '';
        var opacityClass = !isMasterOn ? 'opacity-50' : '';
        var nomeEscapado = nome.replace(/'/g, "\\'");
        var iconEditar = isReadOnly ? 'bi-eye' : 'bi-pencil-square';
        var tituloEditar = isReadOnly ? 'Visualizar' : 'Editar';

        var avatarHtml = '';
        if (imagem) {
            avatarHtml = '<img src="' + imagem + '" class="bot-avatar" ' +
                'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
                '<div class="bot-avatar-fallback" style="display:none;">' + iniciais + '</div>';
        } else {
            avatarHtml = '<img src="' + LOGO_PADRAO + '" class="bot-avatar" ' +
                'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">' +
                '<div class="bot-avatar-fallback" style="display:none;">' + iniciais + '</div>';
        }

        var botoesAcao = '<button class="btn btn-light btn-action-bot shadow-sm" ' +
            masterDisabled + ' ' +
            'onclick="window.editarBot(\'' + i.id + '\')" ' +
            'title="' + tituloEditar + '">' +
            '<i class="bi ' + iconEditar + '"></i></button>';

        if (!isReadOnly && isMasterOn) {
            botoesAcao += '<button class="btn btn-light btn-action-bot shadow-sm text-danger ms-1" ' +
                'onclick="window.confirmarExclusao(\'' + i.id + '\', \'' + i.origem + '\', \'' + nomeEscapado + '\')" ' +
                'title="Excluir"><i class="bi bi-trash"></i></button>';
        }

        html += '<tr class="' + rowClass + '">' +
            '<td class="ps-3">' +
                '<div class="form-check form-switch">' +
                    '<input class="form-check-input" type="checkbox" ' +
                    statusDisabled + ' ' +
                    'onchange="window.alterarStatusDireto(\'' + i.id + '\', this.checked, \'' + i.origem + '\')" ' +
                    statusChecked + '>' +
                '</div>' +
            '</td>' +
            '<td>' + avatarHtml + '</td>' +
            '<td class="fw-semibold">' + nome + '</td>' +
            '<td><span class="badge-tipo ' + badgeClass + ' ' + opacityClass + '">' + _labelOrigem(i.origem) + '</span></td>' +
            '<td class="text-end pe-3">' + botoesAcao + '</td>' +
        '</tr>';
    }

    tbody.innerHTML = html;
    atualizarSeletorGlobal();
}

window.abrirModalCadastro = function() {
    if (!window.checkMaster()) {
        alert('Atenção: Sistema Master RDO desligado.');
        return;
    }
    window.botState.idEmEdicao = null;
    window.botState.origemEmEdicao = 'usuarios';
    window.abrirModalEspecifico('usuarios');
};

window.editarBot = async function(id) {
    if (!window.checkMaster()) {
        alert('Atenção: O sistema Master RDO está desligado. Edição bloqueada.');
        return;
    }

    var item = null;
    for (var x = 0; x < window.botState.cache.length; x++) {
        if (String(window.botState.cache[x].id) === String(id)) {
            item = window.botState.cache[x];
            break;
        }
    }

    if (!item) return;

    window.botState.idEmEdicao = id;
    window.botState.origemEmEdicao = item.origem;

    await window.abrirModalEspecifico(item.origem, item);

    var isReadOnly = (item.origem !== 'usuarios');
    var mapModal = {
        'usuarios': 'modalUsuario',
        'clientes': 'modalCliente',
        'colaboradores': 'modalColaborador'
    };

    var modalEl = document.getElementById(mapModal[item.origem]);
    if (modalEl) {
        var inputs = modalEl.querySelectorAll('input, select');
        var btnSalvar = modalEl.querySelector('.btn-danger');

        for (var inp = 0; inp < inputs.length; inp++) {
            inputs[inp].disabled = isReadOnly;
        }
        if (btnSalvar) btnSalvar.style.display = isReadOnly ? 'none' : 'block';
    }
};

window.abrirModalEspecifico = async function(origem, data) {
    var mapModal = {
        'usuarios': 'modalUsuario',
        'clientes': 'modalCliente',
        'colaboradores': 'modalColaborador'
    };
    var paths = {
        'usuarios': 'pages/usuarios/modal-usuario.html',
        'clientes': 'pages/clientes/modal-cliente.html',
        'colaboradores': 'pages/colaborador/modal-colaborador.html'
    };

    var modalId = mapModal[origem];
    var modalEl = document.getElementById(modalId);

    if (!modalEl) {
        try {
            var resp = await fetch(paths[origem]);
            var html = await resp.text();
            document.body.insertAdjacentHTML('beforeend', html);
            modalEl = document.getElementById(modalId);
        } catch (err) {
            return;
        }
    }

    if (!modalEl) return;

    var modalHeader = modalEl.querySelector('.modal-header');
    if (modalHeader && !modalHeader.querySelector('.btn-close')) {
        var btnClose = document.createElement('button');
        btnClose.type = 'button';
        btnClose.className = 'btn-close';
        btnClose.setAttribute('data-bs-dismiss', 'modal');
        btnClose.setAttribute('aria-label', 'Fechar');
        modalHeader.appendChild(btnClose);
    }

    if (!modalHeader) {
        var modalContent = modalEl.querySelector('.modal-content');
        if (modalContent) {
            var header = document.createElement('div');
            header.className = 'modal-header border-0 pb-0';
            header.innerHTML = '<h6 class="fw-bold mb-0">' + (data ? 'Editar' : 'Novo') + '</h6>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>';
            modalContent.insertBefore(header, modalContent.firstChild);
        }
    }

    var inputs = modalEl.querySelectorAll('input, select');
    for (var j = 0; j < inputs.length; j++) {
        var input = inputs[j];
        var key = input.id ? input.id.split('-').pop() : '';
        if (data && data.hasOwnProperty(key)) {
            input.value = data[key];
        } else if (!data) {
            input.value = '';
        }
        input.disabled = false;
        input.style.borderColor = '';
    }

    var existingInstance = bootstrap.Modal.getInstance(modalEl);
    if (existingInstance) {
        existingInstance.dispose();
    }

    var modalInstance = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
    modalInstance.show();
};

window.salvarNovo = async function(modalId) {
    var el = document.getElementById(modalId);
    if (!el) return;

    var inputs = el.querySelectorAll('input, select');
    var valid = true;

    for (var v = 0; v < inputs.length; v++) {
        var inp = inputs[v];
        if (!inp.value && inp.id && inp.id.indexOf('imagem') === -1 && inp.id.indexOf('obs') === -1) {
            inp.style.borderColor = '#FF0000';
            valid = false;
        } else {
            inp.style.borderColor = '';
        }
    }

    if (!valid) return;

    var btn = el.querySelector('.btn-danger');
    var originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';

    try {
        var dados = { id: window.botState.idEmEdicao || Date.now().toString() };

        for (var d = 0; d < inputs.length; d++) {
            if (inputs[d].id) {
                var parts = inputs[d].id.split('-');
                var fieldName = parts.length > 1 ? parts[1] : parts[0];
                dados[fieldName] = inputs[d].value;
            }
        }

        var action = window.botState.idEmEdicao ? 'update' : 'add';
        var origem = window.botState.origemEmEdicao || 'usuarios';

        await window.API.call(action + origem, dados);

        var modalInstance = bootstrap.Modal.getInstance(el);
        if (modalInstance) modalInstance.hide();

        window.botState.idEmEdicao = null;
        await window.reloadBot();
    } catch (err) {
        alert('Erro ao salvar. Tente novamente.');
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
};

window.alterarStatusDireto = async function(id, status, origem) {
    try {
        await window.API.call('update' + origem, { id: id, status: status ? 'TRUE' : 'FALSE' });

        for (var k = 0; k < window.botState.cacheCompleto.length; k++) {
            if (String(window.botState.cacheCompleto[k].id) === String(id) && window.botState.cacheCompleto[k].origem === origem) {
                window.botState.cacheCompleto[k].status = status ? 'TRUE' : 'FALSE';
                break;
            }
        }

        for (var m = 0; m < window.botState.cache.length; m++) {
            if (String(window.botState.cache[m].id) === String(id) && window.botState.cache[m].origem === origem) {
                window.botState.cache[m].status = status ? 'TRUE' : 'FALSE';
                break;
            }
        }

        renderizarTabela();
    } catch (err) {
        await window.reloadBot();
    }
};

window.confirmarExclusao = function(id, origem, nome) {
    var textoEl = document.getElementById('texto-exclusao');
    var btnConfirmar = document.getElementById('btn-confirmar-exclusao');
    var modalEl = document.getElementById('modalConfirmarExclusao');

    if (!modalEl || !btnConfirmar) {
        if (confirm('Deseja excluir "' + (nome || id) + '"?')) {
            window.executarExclusao(id, origem);
        }
        return;
    }

    if (textoEl) {
        textoEl.innerHTML = 'Deseja remover <strong>' + (nome || id) + '</strong>?<br>' +
            '<small class="text-muted">Esta ação não pode ser desfeita.</small>';
    }

    var novoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);

    novoBtn.addEventListener('click', async function() {
        novoBtn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Excluindo...';
        novoBtn.disabled = true;

        await window.executarExclusao(id, origem);

        var modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        novoBtn.innerHTML = '<i class="bi bi-trash me-1"></i> Excluir';
        novoBtn.disabled = false;
    });

    var existingInstance = bootstrap.Modal.getInstance(modalEl);
    if (existingInstance) existingInstance.dispose();

    var modalInstance = new bootstrap.Modal(modalEl, { backdrop: 'static' });
    modalInstance.show();
};

window.executarExclusao = async function(id, origem) {
    try {
        await window.API.call('delete' + origem, { id: id });
        await window.reloadBot();
    } catch (err) {
        alert('Erro ao excluir. Tente novamente.');
    }
};

window.initBotPage = function() {
    window.initBot();
};
