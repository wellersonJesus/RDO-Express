window.botState = {
    cache: [],
    cacheCompleto: [],
    idEmEdicao: null,
    origemEmEdicao: null,
    paginaAtual: 1,
    itensPorPagina: 15,
    isFetching: false,
    isTogglingAll: false,
    _listenersRegistrados: false  // flag anti-acúmulo
};

var CARGOS_DISPONIVEIS = [
    'Atendente', 'Financeiro', 'Gestor', 'Administrativo', 'SRE Architect'
];

function normalizeStatus(val) {
    if (val === true || val === 1) return 'TRUE';
    if (val === false || val === 0) return 'FALSE';
    var s = String(val || '').trim().toUpperCase();
    if (s === 'TRUE' || s === '1' || s === 'ATIVO' || s === 'ON' || s === 'SIM' || s === 'YES') return 'TRUE';
    return 'FALSE';
}

function syncStart() {
    var icon = document.getElementById('sync-icon-bot');
    if (icon && !icon.classList.contains('spinner-rotate')) icon.classList.add('spinner-rotate');
}

function syncStop() {
    var icon = document.getElementById('sync-icon-bot');
    if (icon) icon.classList.remove('spinner-rotate');
}

function applyMasterVisual(isOn) {
    var btn = document.getElementById('btn-status-bot');
    if (!btn) return;
    btn.classList.remove('btn-master-on', 'btn-master-off');
    if (isOn) {
        btn.classList.add('btn-master-on');
        btn.textContent = 'MASTER ON';
    } else {
        btn.classList.add('btn-master-off');
        btn.textContent = 'MASTER OFF';
    }
}

window.checkMaster = function () {
    return localStorage.getItem('bot_master_active') === 'true';
};

window.setMaster = function (value) {
    var bool = Boolean(value);
    localStorage.setItem('bot_master_active', bool.toString());
    if (window.AppRDO) window.AppRDO.isMasterOn = bool;
    window.dispatchEvent(new CustomEvent('masterStatusChanged', { detail: { isOn: bool } }));
};

window.toggleMaster = function () {
    window.setMaster(!window.checkMaster());
};

window.addEventListener('masterStatusChanged', function (e) {
    var isOn = !!(e.detail && e.detail.isOn);
    applyMasterVisual(isOn);
    if (window.AppRDO) window.AppRDO.isMasterOn = isOn;
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof atualizarSeletorGlobal === 'function') atualizarSeletorGlobal();
});

function atualizarSeletorGlobal() {
    var seletor = document.getElementById('seletor-global-status');
    if (!seletor) return;
    var isMasterOn = window.checkMaster();
    // agora considera TODOS os itens, inclusive usuários
    var comStatus = window.botState.cacheCompleto.filter(function (i) {
        return String(i.id).trim() !== '';
    });
    seletor.disabled = !isMasterOn || comStatus.length === 0 || window.botState.isTogglingAll;
    if (comStatus.length === 0) { seletor.checked = false; return; }
    var totalAtivos = 0;
    for (var k = 0; k < comStatus.length; k++) {
        if (comStatus[k].status === 'TRUE') totalAtivos++;
    }
    seletor.checked = totalAtivos === comStatus.length;
}

window.alternarTodosStatus = async function (ativar) {
    if (!window.checkMaster()) {
        var seletor = document.getElementById('seletor-global-status');
        if (seletor) seletor.checked = !ativar;
        Swal.fire({ icon: 'warning', title: 'Master desligado', text: 'Sistema Master RDO está desligado.', confirmButtonColor: '#dc3545' });
        return;
    }
    if (window.botState.isTogglingAll) return;
    window.botState.isTogglingAll = true;
    var seletor = document.getElementById('seletor-global-status');
    if (seletor) seletor.disabled = true;
    syncStart();
    var novoStatus = ativar ? 'TRUE' : 'FALSE';
    var switches = document.querySelectorAll('#bot-list .form-check-input');
    for (var s = 0; s < switches.length; s++) {
        switches[s].disabled = true;
        switches[s].checked = ativar;
    }
    var promessas = [];
    for (var i = 0; i < window.botState.cacheCompleto.length; i++) {
        var item = window.botState.cacheCompleto[i];
        var itemId = String(item.id || '').trim();
        // pula registros com ID inválido
        if (!itemId) continue;
        item.status = novoStatus;
        promessas.push(
            window.API.call('update' + item.origem, { id: itemId, status: novoStatus }).catch(function () {})
        );
    }
    await Promise.all(promessas);
    if (window.AppRDO && Array.isArray(window.AppRDO.clientesCache)) {
        for (var n = 0; n < window.AppRDO.clientesCache.length; n++) {
            window.AppRDO.clientesCache[n].status = novoStatus;
        }
        window.dispatchEvent(new CustomEvent('clienteStatusChanged', {
            detail: { isMasterOn: window.checkMaster(), clientes: window.AppRDO.clientesCache }
        }));
    }
    window.botState.isTogglingAll = false;
    if (seletor) seletor.disabled = false;
    syncStop();
    await window.reloadBot();
};

window.mudarPagina = function (dir) {
    var totalPag = Math.max(1, Math.ceil(window.botState.cache.length / window.botState.itensPorPagina));
    window.botState.paginaAtual = Math.min(Math.max(1, window.botState.paginaAtual + dir), totalPag);
    renderizarTabela();
};

window.initBot = async function () {
    var raw = localStorage.getItem('bot_master_active');
    if (raw === null) {
        localStorage.setItem('bot_master_active', 'false');
        raw = 'false';
    }
    var isMasterOn = raw === 'true';
    applyMasterVisual(isMasterOn);
    if (window.AppRDO) window.AppRDO.isMasterOn = isMasterOn;

    // ✅ Registra listeners de busca/filtro apenas UMA vez por ciclo de vida
    if (!window.botState._listenersRegistrados) {
        var filtroSelect = document.getElementById('filtro-tipo');
        var buscaInput   = document.getElementById('busca-nome');

        if (filtroSelect) {
            filtroSelect.addEventListener('change', function () {
                window.filtrarBot();
            });
        }

        if (buscaInput) {
            // 'input' já cobre digitação em tempo real — 'keydown' Enter fica como fallback
            buscaInput.addEventListener('input', function () {
                window.filtrarBot();
            });
            buscaInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') window.filtrarBot();
            });
        }

        window.botState._listenersRegistrados = true;
    }

    await window.reloadBot();
};

window.reloadBot = async function () {
    var tbody = document.getElementById('bot-list');
    if (!tbody || window.botState.isFetching) return;
    window.botState.isFetching = true;
    syncStart();
    try {
        var results = await Promise.all([
            window.API.call('getusuarios').catch(function () { return []; }),
            window.API.call('getclientes').catch(function () { return []; }),
            window.API.call('getcolaboradores').catch(function () { return []; })
        ]);
        var users   = Array.isArray(results[0]) ? results[0] : (results[0]?.data || []);
        var clients = Array.isArray(results[1]) ? results[1] : (results[1]?.data || []);
        var cols    = Array.isArray(results[2]) ? results[2] : (results[2]?.data || []);

        var todosDados = [];

        for (var u = 0; u < users.length; u++) {
            var usr = Object.assign({}, users[u]);
            usr.origem = 'usuarios';
            usr.status = normalizeStatus(usr.status);
            // ✅ descarta registros com ID vazio que poluem a lista
            if (!String(usr.id || '').trim()) continue;
            todosDados.push(usr);
        }
        for (var c = 0; c < clients.length; c++) {
            var cli = Object.assign({}, clients[c]);
            cli.origem = 'clientes';
            cli.status = normalizeStatus(cli.status);
            if (!String(cli.id || '').trim()) continue;
            todosDados.push(cli);
        }
        for (var b = 0; b < cols.length; b++) {
            var col = Object.assign({}, cols[b]);
            col.origem = 'colaboradores';
            col.status = normalizeStatus(col.status);
            if (!String(col.id || '').trim()) continue;
            todosDados.push(col);
        }

        window.botState.cacheCompleto = todosDados;

        if (window.AppRDO) {
            window.AppRDO.clientesCache = clients
                .filter(function (ci) { return !!String(ci.id || '').trim(); })
                .map(function (ci) {
                    var it = Object.assign({}, ci);
                    it.status = normalizeStatus(it.status);
                    return it;
                });
        }

        window.filtrarBot();
    } catch (e) {
        tbody.innerHTML =
            '<tr><td colspan="5" class="text-center text-danger py-4">' +
            '<i class="bi bi-wifi-off me-2"></i>Falha na conexão. Tente novamente.</td></tr>';
    } finally {
        window.botState.isFetching = false;
        syncStop();
    }
};

window.filtrarBot = function () {
    var filtroSelect    = document.getElementById('filtro-tipo');
    var buscaInput      = document.getElementById('busca-nome');
    var tipoSelecionado = filtroSelect ? filtroSelect.value : 'TODOS';
    var termoBusca      = buscaInput  ? buscaInput.value.trim().toLowerCase() : '';
    var dados = window.botState.cacheCompleto.slice();

    if (tipoSelecionado !== 'TODOS') {
        dados = dados.filter(function (item) { return item.origem === tipoSelecionado; });
    }

    if (termoBusca.length > 0) {
        dados = dados.filter(function (item) {
            // ✅ busca ampla: nome, id, contato/telefone, tipo/cargo
            var nome    = (item.username || item.nome || item.responsavel || item.colaborador || '').toLowerCase();
            var id      = String(item.id || '').toLowerCase();
            var contato = (item.contato || item.telefone || '').toLowerCase();
            var tipo    = (item.tipo || item.cargo || item.perfil || '').toLowerCase();
            return (
                nome.indexOf(termoBusca)    !== -1 ||
                id.indexOf(termoBusca)      !== -1 ||
                contato.indexOf(termoBusca) !== -1 ||
                tipo.indexOf(termoBusca)    !== -1
            );
        });
    }

    window.botState.cache = dados;
    window.botState.paginaAtual = 1;
    renderizarTabela();
};

function _buscarItemCompleto(id, origem) {
    for (var x = 0; x < window.botState.cacheCompleto.length; x++) {
        var it = window.botState.cacheCompleto[x];
        if (String(it.id).trim() === String(id).trim() && it.origem === origem) return it;
    }
    return null;
}

function _getIniciais(nome) {
    if (!nome || nome === 'N/A') return 'RD';
    var partes = nome.trim().split(/\s+/);
    if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    return partes[0].substring(0, 2).toUpperCase();
}

function _labelOrigem(origem) {
    var labels = { usuarios: 'Usuário', clientes: 'Cliente', colaboradores: 'Colaborador' };
    return labels[origem] || origem;
}

function _resolverAvatar(item) {
    var imagem = (item.imagem || '').trim();
    if (imagem && imagem !== 'null' && imagem !== 'undefined' && imagem.length > 10) return imagem;
    return null;
}

function renderizarTabela() {
    var tbody      = document.getElementById('bot-list');
    var infoPag    = document.getElementById('info-paginacao');
    var infoTotal  = document.getElementById('info-total');
    var isMasterOn = window.checkMaster();
    var dados      = window.botState.cache;
    if (!tbody) return;

    var totalPag = Math.max(1, Math.ceil(dados.length / window.botState.itensPorPagina));
    if (window.botState.paginaAtual > totalPag) window.botState.paginaAtual = totalPag;
    var start    = (window.botState.paginaAtual - 1) * window.botState.itensPorPagina;
    var pageData = dados.slice(start, start + window.botState.itensPorPagina);

    if (infoPag)   infoPag.innerText   = 'Pág ' + window.botState.paginaAtual + ' / ' + totalPag;
    if (infoTotal) infoTotal.innerText = dados.length + ' registro' + (dados.length !== 1 ? 's' : '');

    if (dados.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="5" class="text-center text-muted py-4">' +
            '<i class="bi bi-inbox me-2"></i>Nenhum registro encontrado.</td></tr>';
        atualizarSeletorGlobal();
        return;
    }

    tbody.innerHTML = '';

    for (var idx = 0; idx < pageData.length; idx++) {
        var i          = pageData[idx];
        var nome       = i.username || i.nome || i.responsavel || i.colaborador || 'N/A';
        var iniciais   = _getIniciais(nome);
        var srcImg     = _resolverAvatar(i);
        var itemId     = String(i.id).trim();
        var itemOrigem = String(i.origem).trim();

        var tr = document.createElement('tr');
        if (!isMasterOn) tr.classList.add('text-muted');

        // ── Switch de status ──────────────────────────────────────────
        var tdSwitch  = document.createElement('td');
        tdSwitch.className = 'ps-3';
        var divSwitch = document.createElement('div');
        divSwitch.className = 'form-check form-switch';
        var chk = document.createElement('input');
        chk.className = 'form-check-input';
        chk.type      = 'checkbox';
        chk.checked   = i.status === 'TRUE';
        // ✅ habilitado para TODOS quando master está on (removida restrição de usuário)
        chk.disabled  = !isMasterOn;
        (function (cId, cOrigem) {
            chk.addEventListener('change', function () {
                window.alterarStatusDireto(cId, this.checked, cOrigem);
            });
        })(itemId, itemOrigem);
        divSwitch.appendChild(chk);
        tdSwitch.appendChild(divSwitch);

        // ── Avatar ────────────────────────────────────────────────────
        var tdAvatar = document.createElement('td');
        if (srcImg) {
            var imgEl = document.createElement('img');
            imgEl.src       = srcImg;
            imgEl.className = 'bot-avatar';
            (function (ini, parent) {
                imgEl.addEventListener('error', function () {
                    this.style.display = 'none';
                    var fb = document.createElement('div');
                    fb.className     = 'bot-avatar-fallback';
                    fb.style.display = 'flex';
                    fb.textContent   = ini;
                    parent.appendChild(fb);
                });
            })(iniciais, tdAvatar);
            tdAvatar.appendChild(imgEl);
        } else {
            var fallback = document.createElement('div');
            fallback.className     = 'bot-avatar-fallback';
            fallback.style.display = 'flex';
            fallback.textContent   = iniciais;
            tdAvatar.appendChild(fallback);
        }

        // ── Nome ──────────────────────────────────────────────────────
        var tdNome = document.createElement('td');
        tdNome.className   = 'fw-semibold';
        tdNome.textContent = nome;

        // ── Badge tipo ────────────────────────────────────────────────
        var tdTipo = document.createElement('td');
        var badge  = document.createElement('span');
        badge.className   = 'badge-tipo badge-' + i.origem + (!isMasterOn ? ' opacity-50' : '');
        badge.textContent = _labelOrigem(i.origem);
        tdTipo.appendChild(badge);

        // ── Ações ─────────────────────────────────────────────────────
        var tdAcoes = document.createElement('td');
        tdAcoes.className = 'text-end pe-3';

        var btnEditar = document.createElement('button');
        btnEditar.className = 'btn btn-light btn-action-bot shadow-sm';
        btnEditar.title     = 'Editar';
        btnEditar.disabled  = !isMasterOn;
        btnEditar.innerHTML = '<i class="bi bi-pencil-square"></i>';
        (function (eId, eOrigem) {
            btnEditar.addEventListener('click', function () {
                window.editarBot(eId, eOrigem);
            });
        })(itemId, itemOrigem);
        tdAcoes.appendChild(btnEditar);

        if (isMasterOn) {
            var btnRemover = document.createElement('button');
            btnRemover.className = 'btn btn-light btn-action-bot shadow-sm text-danger ms-1';
            btnRemover.title     = 'Excluir';
            btnRemover.innerHTML = '<i class="bi bi-trash"></i>';
            (function (rId, rOrigem, rNome) {
                btnRemover.addEventListener('click', function () {
                    window.confirmarExclusao(rId, rOrigem, rNome);
                });
            })(itemId, itemOrigem, nome);
            tdAcoes.appendChild(btnRemover);
        }

        tr.appendChild(tdSwitch);
        tr.appendChild(tdAvatar);
        tr.appendChild(tdNome);
        tr.appendChild(tdTipo);
        tr.appendChild(tdAcoes);
        tbody.appendChild(tr);
    }

    atualizarSeletorGlobal();
}

window.abrirModalCadastro = function () {
    if (!window.checkMaster()) {
        Swal.fire({ icon: 'warning', title: 'Master desligado', text: 'Sistema Master RDO está desligado.', confirmButtonColor: '#dc3545' });
        return;
    }
    window.botState.idEmEdicao     = null;
    window.botState.origemEmEdicao = 'usuarios';
    _abrirModalUsuario(null);
};

window.editarBot = async function (id, origem) {
    if (!window.checkMaster()) {
        Swal.fire({ icon: 'warning', title: 'Master desligado', text: 'Sistema Master RDO está desligado. Edição bloqueada.', confirmButtonColor: '#dc3545' });
        return;
    }
    var idStr     = String(id || '').trim();
    var origemStr = String(origem || '').trim();
    var item      = _buscarItemCompleto(idStr, origemStr);
    if (!item) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Registro não encontrado.', confirmButtonColor: '#dc3545' });
        return;
    }
    window.botState.idEmEdicao     = idStr;
    window.botState.origemEmEdicao = origemStr;
    if (origemStr === 'usuarios') {
        _abrirModalUsuario(item);
    } else {
        await window.abrirModalEspecifico(origemStr, item);
    }
};

function _abrirModalUsuario(data) {
    var modalEl = document.getElementById('modalUsuarioBot');
    if (!modalEl) return;
    document.getElementById('usuario-bot-id').value       = data ? String(data.id || '') : '';
    document.getElementById('usuario-bot-username').value = data ? (data.username || '') : '';
    document.getElementById('usuario-bot-contato').value  = data ? (data.contato  || '') : '';
    document.getElementById('usuario-bot-password').value = data ? (data.password || '') : '';
    document.getElementById('usuario-bot-imagem').value   = data ? (data.imagem   || '') : '';
    var selectCargo = document.getElementById('usuario-bot-tipo');
    selectCargo.innerHTML = '';
    CARGOS_DISPONIVEIS.forEach(function (cargo) {
        var opt = document.createElement('option');
        opt.value       = cargo;
        opt.textContent = cargo;
        if (data && data.tipo === cargo) opt.selected = true;
        selectCargo.appendChild(opt);
    });
    var tituloEl = document.getElementById('modal-usuario-bot-titulo');
    if (tituloEl) tituloEl.textContent = data ? 'Editar Usuário' : 'Novo Usuário';
    var existingInstance = bootstrap.Modal.getInstance(modalEl);
    if (existingInstance) existingInstance.dispose();
    new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true }).show();
}

window.salvarUsuarioBot = async function () {
    var idField  = document.getElementById('usuario-bot-id');
    var id       = idField ? idField.value.trim() : '';
    var username = document.getElementById('usuario-bot-username').value.trim();
    var contato  = document.getElementById('usuario-bot-contato').value.trim();
    var tipo     = document.getElementById('usuario-bot-tipo').value.trim();
    var password = document.getElementById('usuario-bot-password').value.trim();
    var imagem   = document.getElementById('usuario-bot-imagem').value.trim();
    if (!username || !contato || !tipo || !password) {
        Swal.fire({ icon: 'warning', title: 'Campos obrigatórios', text: 'Preencha nome, contato, cargo e senha.', confirmButtonColor: '#dc3545' });
        return;
    }
    var btn          = document.getElementById('btn-salvar-usuario-bot');
    var originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    try {
        var resolvedId = window.botState.idEmEdicao || id;
        var isEdicao   = !!resolvedId;
        var dados = {
            id      : isEdicao ? String(resolvedId) : String(Date.now()),
            username: username,
            contato : contato,
            tipo    : tipo,
            password: password,
            imagem  : imagem,
            status  : 'TRUE'
        };
        await window.API.call(isEdicao ? 'updateusuarios' : 'addusuarios', dados);
        var modalEl = document.getElementById('modalUsuarioBot');
        var inst    = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
        window.botState.idEmEdicao = null;
        await window.reloadBot();
        Swal.fire({ icon: 'success', title: 'Salvo!', text: isEdicao ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.', confirmButtonColor: '#dc3545', timer: 2000, showConfirmButton: false });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível salvar. Tente novamente.', confirmButtonColor: '#dc3545' });
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
};

window.abrirModalEspecifico = async function (origem, data) {
    var mapModal = { clientes: 'modalCliente', colaboradores: 'modalColaborador' };
    var paths    = { clientes: 'pages/clientes/modal-cliente.html', colaboradores: 'pages/colaborador/modal-colaborador.html' };
    var modalId  = mapModal[origem];
    if (!modalId) return;
    var modalEl = document.getElementById(modalId);
    if (!modalEl) {
        try {
            var resp = await fetch(paths[origem]);
            if (!resp.ok) throw new Error('Modal não encontrado: ' + paths[origem]);
            document.body.insertAdjacentHTML('beforeend', await resp.text());
            modalEl = document.getElementById(modalId);
        } catch (err) { return; }
    }
    if (!modalEl) return;
    var inputs = modalEl.querySelectorAll('input, select');
    for (var j = 0; j < inputs.length; j++) {
        var input = inputs[j];
        var key   = input.id ? input.id.split('-').pop() : '';
        if (data && Object.prototype.hasOwnProperty.call(data, key)) input.value = data[key];
        else if (!data) input.value = '';
        input.disabled = false;
        input.style.borderColor = '';
    }
    var existingInstance = bootstrap.Modal.getInstance(modalEl);
    if (existingInstance) existingInstance.dispose();
    new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true }).show();
};

window.alterarStatusDireto = async function (id, status, origem) {
    var idStr      = String(id || '').trim();
    var origemStr  = String(origem || '').trim();
    var novoStatus = status ? 'TRUE' : 'FALSE';

    // ✅ aborta silenciosamente se id ou origem inválidos
    if (!idStr || !origemStr) return;

    try {
        await window.API.call('update' + origemStr, { id: idStr, status: novoStatus });

        for (var k = 0; k < window.botState.cacheCompleto.length; k++) {
            var it = window.botState.cacheCompleto[k];
            if (String(it.id).trim() === idStr && it.origem === origemStr) {
                it.status = novoStatus;
                break;
            }
        }
        for (var m = 0; m < window.botState.cache.length; m++) {
            var it2 = window.botState.cache[m];
            if (String(it2.id).trim() === idStr && it2.origem === origemStr) {
                it2.status = novoStatus;
                break;
            }
        }
        if (window.AppRDO && Array.isArray(window.AppRDO.clientesCache)) {
            for (var n = 0; n < window.AppRDO.clientesCache.length; n++) {
                if (String(window.AppRDO.clientesCache[n].id).trim() === idStr) {
                    window.AppRDO.clientesCache[n].status = novoStatus;
                    break;
                }
            }
            window.dispatchEvent(new CustomEvent('clienteStatusChanged', {
                detail: { id: idStr, status: novoStatus, isMasterOn: window.checkMaster(), clientes: window.AppRDO.clientesCache }
            }));
        }
        renderizarTabela();
    } catch (err) {
        await window.reloadBot();
    }
};

window.confirmarExclusao = function (id, origem, nome) {
    var idStr     = String(id || '').trim();
    var origemStr = String(origem || '').trim();
    if (!idStr || !origemStr) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'ID ou origem inválidos para exclusão.', confirmButtonColor: '#dc3545' });
        return;
    }
    var textoEl      = document.getElementById('texto-exclusao');
    var btnConfirmar = document.getElementById('btn-confirmar-exclusao');
    var modalEl      = document.getElementById('modalConfirmarExclusao');
    if (!modalEl || !btnConfirmar) {
        Swal.fire({
            icon: 'warning',
            title: 'Confirmar exclusão',
            text: 'Deseja excluir "' + (nome || idStr) + '"?',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Excluir',
            cancelButtonText: 'Cancelar'
        }).then(function (result) {
            if (result.isConfirmed) window.executarExclusao(idStr, origemStr);
        });
        return;
    }
    if (textoEl) {
        textoEl.innerHTML =
            'Deseja remover <strong>' + (nome || idStr) + '</strong>?<br>' +
            '<small class="text-muted">Esta ação não pode ser desfeita.</small>';
    }
    var novoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);
    novoBtn.addEventListener('click', async function () {
        novoBtn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Excluindo...';
        novoBtn.disabled  = true;
        await window.executarExclusao(idStr, origemStr);
        var modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        novoBtn.innerHTML = '<i class="bi bi-trash me-1"></i> Excluir';
        novoBtn.disabled  = false;
    });
    var existingInstance = bootstrap.Modal.getInstance(modalEl);
    if (existingInstance) existingInstance.dispose();
    new bootstrap.Modal(modalEl, { backdrop: 'static' }).show();
};

window.executarExclusao = async function (id, origem) {
    var idStr     = String(id || '').trim();
    var origemStr = String(origem || '').trim();
    if (!idStr || !origemStr) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'ID não informado para exclusão.', confirmButtonColor: '#dc3545' });
        return;
    }
    try {
        await window.API.call('delete' + origemStr, { id: idStr });
        window.botState.cacheCompleto = window.botState.cacheCompleto.filter(function (it) {
            return !(String(it.id).trim() === idStr && it.origem === origemStr);
        });
        window.filtrarBot();
        Swal.fire({ icon: 'success', title: 'Excluído!', text: 'Registro removido com sucesso.', confirmButtonColor: '#dc3545', timer: 2000, showConfirmButton: false });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível excluir. Tente novamente.', confirmButtonColor: '#dc3545' });
    }
};

window.initBotPage = function () {
    window.initBot();
};
