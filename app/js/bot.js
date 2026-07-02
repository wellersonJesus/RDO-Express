window.botState = {
    cache: [],
    cacheCompleto: [],
    idEmEdicao: null,
    origemEmEdicao: null,
    paginaAtual: 1,
    itensPorPagina: 15,
    isFetching: false,
    isTogglingAll: false,
    _listenersRegistrados: false,
    _cacheCarregado: false,
    _formAdminCarregado: false
};

var CARGOS_DISPONIVEIS = ['Atendente', 'Financeiro', 'Gestor', 'Administrativo', 'SRE Tecnologia'];

window.PERMISSOES_PADRAO = {
    'Atendente': ['Dashboard', 'Chat', 'Pedidos'],
    'Financeiro': ['Dashboard', 'Pedidos', 'Financeiro', 'Relatórios'],
    'Gestor': ['Dashboard', 'Chat', 'Pedidos', 'Administração', 'Financeiro', 'Relatórios'],
    'Administrativo': ['Dashboard', 'Pedidos', 'Administração', 'Relatórios', 'Bot'],
    'SRE Tecnologia': ['Dashboard', 'Chat', 'Pedidos', 'Administração', 'Financeiro', 'Relatórios', 'Bot']
};

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
        if (!itemId) continue;
        item.status = novoStatus;
        promessas.push(
            window.API.call('update' + item.origem, { id: itemId, status: novoStatus }).catch(function () { })
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

window.initBot = function() {
    if (window.botState.isFetching) return Promise.resolve();

    var raw = localStorage.getItem('bot_master_active');
    if (raw === null) {
        localStorage.setItem('bot_master_active', 'false');
        raw = 'false';
    }
    var isMasterOn = raw === 'true';
    applyMasterVisual(isMasterOn);
    if (window.AppRDO) window.AppRDO.isMasterOn = isMasterOn;

    if (!window.botState._listenersRegistrados) {
        var filtroSelect = document.getElementById('filtro-tipo');
        var buscaInput = document.getElementById('busca-nome');

        if (filtroSelect) {
            filtroSelect.addEventListener('change', function () {
                window.filtrarBot();
            });
        }

        if (buscaInput) {
            buscaInput.addEventListener('input', function () {
                window.filtrarBot();
            });
            buscaInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') window.filtrarBot();
            });
        }

        window.botState._listenersRegistrados = true;
    }

    return window.reloadBot();
};

window.reloadBot = function() {
    var tbody = document.getElementById('bot-list');
    if (window.botState.isFetching) return Promise.resolve();

    window.botState.isFetching = true;
    window.botState._cacheCarregado = false;
    syncStart();

    return Promise.all([
        window.API.call('getusuarios').catch(function () { return []; }),
        window.API.call('getclientes').catch(function () { return []; }),
        window.API.call('getcolaboradores').catch(function () { return []; })
    ])
    .then(function(results) {
        var users = Array.isArray(results[0]) ? results[0] : (results[0]?.data || []);
        var clients = Array.isArray(results[1]) ? results[1] : (results[1]?.data || []);
        var cols = Array.isArray(results[2]) ? results[2] : (results[2]?.data || []);

        var todosDados = [];

        for (var u = 0; u < users.length; u++) {
            var usr = Object.assign({}, users[u]);
            usr.origem = 'usuarios';
            usr.status = normalizeStatus(usr.status);

            try {
                var storageKey = 'permissoes_usuario_' + usr.id;
                var storedPerms = localStorage.getItem(storageKey);
                if (storedPerms) {
                    usr.permissoes = JSON.parse(storedPerms);
                } else {
                    usr.permissoes = window.PERMISSOES_PADRAO[usr.cargo] || [];
                }
            } catch (e) {
                usr.permissoes = window.PERMISSOES_PADRAO[usr.cargo] || [];
            }

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
        window.botState._cacheCarregado = true;

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

        window.dispatchEvent(new CustomEvent('botCacheAtualizado', { detail: { registros: todosDados.length } }));
    })
    .catch(function() {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-wifi-off me-2"></i>Falha na conexão</td></tr>';
        }
    })
    .finally(function() {
        window.botState.isFetching = false;
        syncStop();
    });
};

window.filtrarBot = function () {
    var filtroSelect = document.getElementById('filtro-tipo');
    var buscaInput = document.getElementById('busca-nome');
    var tipoSelecionado = filtroSelect ? filtroSelect.value : 'TODOS';
    var termoBusca = buscaInput ? buscaInput.value.trim().toLowerCase() : '';
    var dados = window.botState.cacheCompleto.slice();

    if (tipoSelecionado !== 'TODOS') {
        dados = dados.filter(function (item) { return item.origem === tipoSelecionado; });
    }

    if (termoBusca.length > 0) {
        dados = dados.filter(function (item) {
            var nome = (item.username || item.nome || item.responsavel || item.colaborador || '').toLowerCase();
            var id = String(item.id || '').toLowerCase();
            var contato = (item.contato || item.telefone || '').toLowerCase();
            var tipo = (item.tipo || item.cargo || item.perfil || '').toLowerCase();
            return (
                nome.indexOf(termoBusca) !== -1 ||
                id.indexOf(termoBusca) !== -1 ||
                contato.indexOf(termoBusca) !== -1 ||
                tipo.indexOf(termoBusca) !== -1
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>Nenhum registro encontrado.</td></tr>';
        atualizarSeletorGlobal();
        return;
    }

    tbody.innerHTML = '';

    for (var idx = 0; idx < pageData.length; idx++) {
        var i = pageData[idx];
        var nome = i.username || i.nome || i.responsavel || i.colaborador || 'N/A';
        var iniciais = _getIniciais(nome);
        var srcImg = _resolverAvatar(i);
        var itemId = String(i.id).trim();
        var itemOrigem = String(i.origem).trim();

        var tr = document.createElement('tr');
        if (!isMasterOn) tr.classList.add('text-muted');

        var tdSwitch = document.createElement('td');
        tdSwitch.className = 'ps-3';
        var divSwitch = document.createElement('div');
        divSwitch.className = 'form-check form-switch';
        var chk = document.createElement('input');
        chk.className = 'form-check-input';
        chk.type = 'checkbox';
        chk.checked = i.status === 'TRUE';
        chk.disabled = !isMasterOn;
        (function (cId, cOrigem) {
            chk.addEventListener('change', function () {
                window.alterarStatusDireto(cId, this.checked, cOrigem);
            });
        })(itemId, itemOrigem);
        divSwitch.appendChild(chk);
        tdSwitch.appendChild(divSwitch);

        var tdAvatar = document.createElement('td');
        if (srcImg) {
            var imgEl = document.createElement('img');
            imgEl.src = srcImg;
            imgEl.className = 'bot-avatar';
            (function (ini, parent) {
                imgEl.addEventListener('error', function () {
                    this.style.display = 'none';
                    var fb = document.createElement('div');
                    fb.className = 'bot-avatar-fallback';
                    fb.style.display = 'flex';
                    fb.textContent = ini;
                    parent.appendChild(fb);
                });
            })(iniciais, tdAvatar);
            tdAvatar.appendChild(imgEl);
        } else {
            var fallback = document.createElement('div');
            fallback.className = 'bot-avatar-fallback';
            fallback.style.display = 'flex';
            fallback.textContent = iniciais;
            tdAvatar.appendChild(fallback);
        }

        var tdNome = document.createElement('td');
        tdNome.className = 'fw-semibold';
        tdNome.textContent = nome;

        var tdTipo = document.createElement('td');
        var badge = document.createElement('span');
        badge.className = 'badge-tipo badge-' + i.origem + (!isMasterOn ? ' opacity-50' : '');
        badge.textContent = _labelOrigem(i.origem);
        tdTipo.appendChild(badge);

        var tdAcoes = document.createElement('td');
        tdAcoes.className = 'text-end pe-3';

        if (itemOrigem === 'usuarios') {
            var btnEditar = document.createElement('button');
            btnEditar.className = 'btn btn-light btn-action-bot shadow-sm';
            btnEditar.title = 'Editar';
            btnEditar.disabled = !isMasterOn;
            btnEditar.innerHTML = '<i class="bi bi-pencil-square"></i>';
            (function (eId, eOrigem) {
                btnEditar.addEventListener('click', function () {
                    window.editarBot(eId, eOrigem);
                });
            })(itemId, itemOrigem);
            tdAcoes.appendChild(btnEditar);
        } else {
            var btnVisualizar = document.createElement('button');
            btnVisualizar.className = 'btn btn-light btn-action-bot shadow-sm';
            btnVisualizar.title = 'Visualizar';
            btnVisualizar.innerHTML = '<i class="bi bi-eye"></i>';
            (function (vId, vOrigem) {
                btnVisualizar.addEventListener('click', function () {
                    window.visualizarBot(vId, vOrigem);
                });
            })(itemId, itemOrigem);
            tdAcoes.appendChild(btnVisualizar);
        }

        if (isMasterOn) {
            var btnRemover = document.createElement('button');
            btnRemover.className = 'btn btn-light btn-action-bot shadow-sm text-danger ms-1';
            btnRemover.title = 'Excluir';
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
    window.botState.idEmEdicao = null;
    window.botState.origemEmEdicao = 'usuarios';

    document.getElementById('usuario-bot-id').value = '';
    document.getElementById('usuario-bot-username').value = '';
    document.getElementById('usuario-bot-contato').value = '';
    document.getElementById('usuario-bot-password').value = '';
    document.getElementById('usuario-bot-imagem').value = '';
    document.getElementById('usuario-bot-cargo').value = '';

    var display = document.getElementById('cargo-selecionado-display');
    if (display) {
        display.querySelector('.cargo-display-icon i').className = 'bi bi-briefcase';
        display.querySelector('.cargo-display-nome').textContent = 'Nenhum cargo selecionado';
        display.querySelector('.cargo-display-hint').textContent = 'Clique para selecionar';
        display.classList.remove('cargo-selected');
    }

    document.querySelectorAll('.permissao-checkbox').forEach(function(cb) {
        cb.checked = false;
    });

    var modalCargo = document.getElementById('modalSelecionarCargo');
    if (modalCargo) {
        var existingInstance = bootstrap.Modal.getInstance(modalCargo);
        if (existingInstance) existingInstance.dispose();
        new bootstrap.Modal(modalCargo, { backdrop: 'static' }).show();
    }
};

window.editarBot = async function (id, origem) {
    if (!window.checkMaster()) {
        Swal.fire({ icon: 'warning', title: 'Master desligado', text: 'Sistema Master RDO está desligado. Edição bloqueada.', confirmButtonColor: '#dc3545' });
        return;
    }
    var idStr = String(id || '').trim();
    var origemStr = String(origem || '').trim();
    var item = _buscarItemCompleto(idStr, origemStr);
    if (!item) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Registro não encontrado.', confirmButtonColor: '#dc3545' });
        return;
    }
    window.botState.idEmEdicao = idStr;
    window.botState.origemEmEdicao = origemStr;
    _abrirModalUsuario(item);
};

window.visualizarBot = async function (id, origem) {
    var idStr = String(id || '').trim();
    var origemStr = String(origem || '').trim();
    var item = _buscarItemCompleto(idStr, origemStr);
    if (!item) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Registro não encontrado.', confirmButtonColor: '#dc3545' });
        return;
    }
    await _abrirFormAdminBot(item, origemStr);
};

function _carregarFormAdminHTML() {
    if (window.botState._formAdminCarregado) return Promise.resolve(true);
    var container = document.getElementById('bot-admin-form-container');
    if (!container) return Promise.resolve(false);

    return fetch('pages/admin/form_admin.html')
        .then(function (res) { return res.ok ? res.text() : false; })
        .then(function (html) {
            if (!html) return false;
            container.innerHTML = html;
            window.botState._formAdminCarregado = true;
            return true;
        })
        .catch(function () { return false; });
}

function _setValBot(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v;
}

function _setSelectBot(id, valor) {
    var el = document.getElementById(id);
    if (!el) return;
    var v = String(valor || '').toUpperCase();
    for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].value === v) { el.selectedIndex = i; break; }
    }
}

function _preencherClienteFormAdmin(item) {
    _setValBot('c-username', item.username || item.nome || '');
    _setValBot('c-responsavel', item.responsavel || '');
    _setValBot('c-contato', item.contato || '');
    _setValBot('c-email', item.email || '');
    _setValBot('c-cpf_cnpj', item.cpf_cnpj || '');
    _setValBot('c-endereco', item.endereco || '');
    _setValBot('c-imagem', item.imagem || '');
}

function _preencherColaboradorFormAdmin(item) {
    _setValBot('col-username', item.username || item.nome || '');
    _setValBot('col-cpf_cnpj', item.cpf_cnpj || '');
    _setValBot('col-contato', item.contato || '');
    _setValBot('col-email', item.email || '');
    _setValBot('col-imagem', item.imagem || '');
    _setValBot('col-comissao', item.comissao || '');
    _setSelectBot('col-status', item.status);

    var funcoes = (item.colaborador || '').split('/');
    document.querySelectorAll('.col-funcao').forEach(function (c) {
        c.checked = funcoes.indexOf(c.value) !== -1;
    });

    var temMotoboy = funcoes.indexOf('Motoboy') !== -1;
    var divComissao = document.getElementById('div-comissao');
    if (divComissao) divComissao.classList.toggle('d-none', !temMotoboy);
}

function _limparFormAdminBot() {
    var modalEl = document.getElementById('modalFormAdmin');
    if (!modalEl) return;

    modalEl.querySelectorAll('input[type=text], input[type=email], input[type=number]').forEach(function (el) {
        el.value = '';
        el.classList.remove('input-error');
        el.disabled = false;
    });

    modalEl.querySelectorAll('select').forEach(function (s) {
        s.selectedIndex = 0;
        s.disabled = false;
    });

    modalEl.querySelectorAll('.col-funcao').forEach(function (c) {
        c.checked = false;
        c.disabled = false;
    });

    var erroEl = document.getElementById('form-admin-erro');
    if (erroEl) erroEl.classList.add('d-none');

    var divComissao = document.getElementById('div-comissao');
    if (divComissao) divComissao.classList.add('d-none');
}

function _desabilitarFormAdminBot() {
    var modalEl = document.getElementById('modalFormAdmin');
    if (!modalEl) return;
    modalEl.querySelectorAll('input, select').forEach(function (el) { el.disabled = true; });
    modalEl.querySelectorAll('.col-funcao').forEach(function (c) { c.disabled = true; });
}

async function _abrirFormAdminBot(item, origem) {
    var ok = await _carregarFormAdminHTML();
    if (!ok) return;

    _limparFormAdminBot();

    var titulo = document.getElementById('form-admin-titulo');
    var subtitulo = document.getElementById('form-admin-subtitulo');
    var camposCliente = document.getElementById('campos-cliente');
    var camposColab = document.getElementById('campos-colaborador');
    var btnSalvar = document.getElementById('btn-salvar-form-admin');
    var isCliente = origem === 'clientes';

    if (camposCliente) camposCliente.classList.toggle('d-none', !isCliente);
    if (camposColab) camposColab.classList.toggle('d-none', isCliente);

    if (titulo) titulo.textContent = 'Visualizar Registro';
    if (subtitulo) subtitulo.textContent = 'Modo somente leitura';

    if (isCliente) _preencherClienteFormAdmin(item); else _preencherColaboradorFormAdmin(item);
    _desabilitarFormAdminBot();

    if (btnSalvar) btnSalvar.style.display = 'none';

    var modalEl = document.getElementById('modalFormAdmin');
    if (!modalEl) return;

    var existingInstance = bootstrap.Modal.getInstance(modalEl);
    if (existingInstance) existingInstance.dispose();

    var listenerLimpeza = function () {
        _limparFormAdminBot();
        if (btnSalvar) btnSalvar.style.display = '';
        modalEl.removeEventListener('hidden.bs.modal', listenerLimpeza);
    };
    modalEl.addEventListener('hidden.bs.modal', listenerLimpeza);

    new bootstrap.Modal(modalEl).show();
}

function _abrirModalUsuario(data) {
    var modalEl = document.getElementById('modalUsuarioBot');
    if (!modalEl) return;

    document.getElementById('usuario-bot-id').value = data ? String(data.id || '') : '';
    document.getElementById('usuario-bot-username').value = data ? (data.username || '') : '';
    document.getElementById('usuario-bot-contato').value = data ? (data.contato || '') : '';
    document.getElementById('usuario-bot-password').value = data ? (data.password || '') : '';
    document.getElementById('usuario-bot-imagem').value = data ? (data.imagem || '') : '';

    var cargoSelecionado = data ? (data.cargo || '') : '';
    document.getElementById('usuario-bot-cargo').value = cargoSelecionado;

    var display = document.getElementById('cargo-selecionado-display');
    if (display && cargoSelecionado) {
        var iconMap = {
            'Atendente': 'bi-headset',
            'Financeiro': 'bi-currency-dollar',
            'Gestor': 'bi-award',
            'Administrativo': 'bi-building',
            'SRE Tecnologia': 'bi-shield-lock'
        };
        display.querySelector('.cargo-display-icon i').className = 'bi ' + (iconMap[cargoSelecionado] || 'bi-briefcase');
        display.querySelector('.cargo-display-nome').textContent = cargoSelecionado;
        display.querySelector('.cargo-display-hint').textContent = 'Clique para alterar';
        display.classList.add('cargo-selected');
    }

    var permissoes = [];
    var userId = data ? String(data.id) : null;

    var permissoesCustomizadas = null;
    if (userId) {
        try {
            var storageKey = 'permissoes_usuario_' + userId;
            var stored = localStorage.getItem(storageKey);
            if (stored) permissoesCustomizadas = JSON.parse(stored);
        } catch (e) {
            permissoesCustomizadas = null;
        }
    }

    if (permissoesCustomizadas && Array.isArray(permissoesCustomizadas)) {
        permissoes = permissoesCustomizadas;
    } else if (cargoSelecionado && window.PERMISSOES_PADRAO[cargoSelecionado]) {
        permissoes = window.PERMISSOES_PADRAO[cargoSelecionado];
    }

    document.querySelectorAll('.permissao-checkbox').forEach(function(checkbox) {
        checkbox.checked = permissoes.includes(checkbox.value);
    });

    var inputSenha = document.getElementById('usuario-bot-password');
    var btnOlhinho = document.getElementById('btn-toggle-senha-bot');
    var iconOlhinho = document.getElementById('icon-toggle-senha-bot');

    if (inputSenha && btnOlhinho && iconOlhinho) {
        inputSenha.type = 'password';
        iconOlhinho.className = 'bi bi-eye-slash';
        btnOlhinho.classList.add('oculto');

        var novoBtn = btnOlhinho.cloneNode(true);
        btnOlhinho.parentNode.replaceChild(novoBtn, btnOlhinho);

        var novoIcon = novoBtn.querySelector('i');

        novoBtn.addEventListener('click', function () {
            var visivel = inputSenha.type === 'text';
            inputSenha.type = visivel ? 'password' : 'text';
            novoIcon.className = visivel ? 'bi bi-eye-slash' : 'bi bi-eye';
            novoBtn.classList.toggle('oculto', visivel);
        });
    }

    var tituloEl = document.getElementById('modal-usuario-bot-titulo');
    if (tituloEl) tituloEl.textContent = data ? 'Editar Usuário' : 'Novo Usuário';

    var existingInstance = bootstrap.Modal.getInstance(modalEl);
    if (existingInstance) existingInstance.dispose();
    new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true }).show();
}

window.selecionarCargo = function(cargo) {
    document.getElementById('usuario-bot-cargo').value = cargo;

    var iconMap = {
        'Atendente': 'bi-headset',
        'Financeiro': 'bi-currency-dollar',
        'Gestor': 'bi-award',
        'Administrativo': 'bi-building',
        'SRE Tecnologia': 'bi-shield-lock'
    };

    var display = document.getElementById('cargo-selecionado-display');
    display.querySelector('.cargo-display-icon i').className = 'bi ' + iconMap[cargo];
    display.querySelector('.cargo-display-nome').textContent = cargo;
    display.querySelector('.cargo-display-hint').textContent = 'Clique para alterar';
    display.classList.add('cargo-selected');

    var permissoes = window.PERMISSOES_PADRAO[cargo] || [];
    document.querySelectorAll('.permissao-checkbox').forEach(function(checkbox) {
        checkbox.checked = permissoes.includes(checkbox.value);
    });

    var modalCargo = document.getElementById('modalSelecionarCargo');
    var modalCargoInstance = bootstrap.Modal.getInstance(modalCargo);
    if (modalCargoInstance) modalCargoInstance.hide();

    setTimeout(function() {
        var modalUsuario = document.getElementById('modalUsuarioBot');
        var existingInstance = bootstrap.Modal.getInstance(modalUsuario);
        if (existingInstance) existingInstance.dispose();
        new bootstrap.Modal(modalUsuario, { backdrop: 'static' }).show();
    }, 300);
};

window.reabrirModalCargo = function() {
    var modalUsuario = document.getElementById('modalUsuarioBot');
    var modalUsuarioInstance = bootstrap.Modal.getInstance(modalUsuario);
    if (modalUsuarioInstance) modalUsuarioInstance.hide();

    setTimeout(function() {
        var modalCargo = document.getElementById('modalSelecionarCargo');
        var existingInstance = bootstrap.Modal.getInstance(modalCargo);
        if (existingInstance) existingInstance.dispose();
        new bootstrap.Modal(modalCargo, { backdrop: 'static' }).show();
    }, 300);
};

window.aplicarPermissoesPorCargo = function() {
    var cargoInput = document.getElementById('usuario-bot-cargo');
    if (!cargoInput) return;
    var cargo = cargoInput.value;
    var permissoes = window.PERMISSOES_PADRAO[cargo] || [];
    document.querySelectorAll('.permissao-checkbox').forEach(function(checkbox) {
        checkbox.checked = permissoes.includes(checkbox.value);
    });
};

window.salvarUsuarioBot = async function () {
    var idField = document.getElementById('usuario-bot-id');
    var id = idField ? idField.value.trim() : '';
    var username = document.getElementById('usuario-bot-username').value.trim();
    var contato = document.getElementById('usuario-bot-contato').value.trim();
    var cargo = document.getElementById('usuario-bot-cargo').value.trim();
    var password = document.getElementById('usuario-bot-password').value.trim();
    var imagem = document.getElementById('usuario-bot-imagem').value.trim();

    if (!username || !contato || !cargo || !password) {
        Swal.fire({
            icon: 'warning',
            title: 'Campos obrigatórios',
            text: 'Preencha nome, contato, cargo e senha.',
            confirmButtonColor: '#dc3545'
        });
        return;
    }

    var permissoesSelecionadas = [];
    document.querySelectorAll('.permissao-checkbox').forEach(function(checkbox) {
        if (checkbox.checked) permissoesSelecionadas.push(checkbox.value);
    });

    var btn = document.getElementById('btn-salvar-usuario-bot');
    var originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';

    try {
        var resolvedId = window.botState.idEmEdicao || id;
        var isEdicao = !!resolvedId;
        var finalId = isEdicao ? String(resolvedId) : String(Date.now());

        var dados = {
            id: finalId,
            username: username,
            contato: contato,
            cargo: cargo,
            password: password,
            imagem: imagem,
            status: 'TRUE'
        };

        await window.API.call(isEdicao ? 'updateusuarios' : 'addusuarios', dados);

        var storageKey = 'permissoes_usuario_' + finalId;
        var permissoesPadraoCargo = window.PERMISSOES_PADRAO[cargo] || [];
        var permissoesForamCustomizadas = JSON.stringify(permissoesSelecionadas.sort()) !== JSON.stringify(permissoesPadraoCargo.sort());

        if (permissoesForamCustomizadas) {
            localStorage.setItem(storageKey, JSON.stringify(permissoesSelecionadas));
        } else {
            localStorage.removeItem(storageKey);
        }

        for (var i = 0; i < window.botState.cacheCompleto.length; i++) {
            if (String(window.botState.cacheCompleto[i].id) === String(finalId) && window.botState.cacheCompleto[i].origem === 'usuarios') {
                window.botState.cacheCompleto[i].username = dados.username;
                window.botState.cacheCompleto[i].contato = dados.contato;
                window.botState.cacheCompleto[i].cargo = dados.cargo;
                window.botState.cacheCompleto[i].password = dados.password;
                window.botState.cacheCompleto[i].imagem = dados.imagem;
                window.botState.cacheCompleto[i].status = dados.status;
                window.botState.cacheCompleto[i].permissoes = permissoesSelecionadas;
                break;
            }
        }

        var modalEl = document.getElementById('modalUsuarioBot');
        var inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();

        window.botState.idEmEdicao = null;

        Swal.fire({
            icon: 'success',
            title: 'Salvo!',
            text: isEdicao ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.',
            confirmButtonColor: '#dc3545',
            timer: 2000,
            showConfirmButton: false
        });

        await window.reloadBot();

        setTimeout(function() {
            window.bloquearAcessoPorPermissao();
        }, 500);

    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Não foi possível salvar. Tente novamente.',
            confirmButtonColor: '#dc3545'
        });
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
};

var TITULOS_MODAL_ESPECIFICO = {
    clientes: { editar: 'Editar Cliente', visualizar: 'Visualizar Cliente', subtitulo: { editar: 'Atualize os dados do cliente', visualizar: 'Dados cadastrados do cliente' } },
    colaboradores: { editar: 'Editar Colaborador', visualizar: 'Visualizar Colaborador', subtitulo: { editar: 'Atualize os dados do colaborador', visualizar: 'Dados cadastrados do colaborador' } }
};

window.abrirModalEspecifico = async function (origem, data, readOnly) {
    var mapModal = { clientes: 'modalCliente', colaboradores: 'modalColaborador' };
    var paths = { clientes: 'pages/clientes/modal-cliente.html', colaboradores: 'pages/colaborador/modal-colaborador.html' };
    var modalId = mapModal[origem];
    if (!modalId) return;
    var modalEl = document.getElementById(modalId);
    if (!modalEl) {
        try {
            var resp = await fetch(paths[origem]);
            if (!resp.ok) throw new Error('Modal não encontrado: ' + paths[origem]);
            document.body.insertAdjacentHTML('beforeend', await resp.text());
            modalEl = document.getElementById(modalId);
        } catch (err) {
            return;
        }
    }
    if (!modalEl) return;

    var inputs = modalEl.querySelectorAll('input, select');
    for (var j = 0; j < inputs.length; j++) {
        var input = inputs[j];
        var key = input.id ? input.id.split('-').pop() : '';
        if (data && Object.prototype.hasOwnProperty.call(data, key)) input.value = data[key];
        else if (!data) input.value = '';
        input.disabled = !!readOnly;
        input.style.borderColor = '';
    }

    var textos = TITULOS_MODAL_ESPECIFICO[origem];
    var tituloEl = modalEl.querySelector('.bot-form-header h6');
    var subtituloEl = modalEl.querySelector('.bot-form-header .bot-form-subtitle');
    if (textos) {
        if (tituloEl) tituloEl.textContent = readOnly ? textos.visualizar : textos.editar;
        if (subtituloEl) subtituloEl.textContent = readOnly ? textos.subtitulo.visualizar : textos.subtitulo.editar;
    }

    var btnSalvar = modalEl.querySelector('[data-salvar="true"]');
    if (btnSalvar) {
        btnSalvar.style.display = readOnly ? 'none' : '';
        var novoBtn = btnSalvar.cloneNode(true);
        btnSalvar.parentNode.replaceChild(novoBtn, btnSalvar);
        novoBtn.style.display = readOnly ? 'none' : '';
        novoBtn.addEventListener('click', function () {
            window.salvarItemEspecifico(origem, modalId);
        });
    }

    var btnCancelar = modalEl.querySelector('.bot-form-footer button[data-bs-dismiss="modal"]');
    if (btnCancelar) btnCancelar.textContent = readOnly ? 'Fechar' : 'Cancelar';

    var existingInstance = bootstrap.Modal.getInstance(modalEl);
    if (existingInstance) existingInstance.dispose();
    new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true }).show();
};

window.salvarItemEspecifico = async function (origem, modalId) {
    var modalEl = document.getElementById(modalId);
    if (!modalEl) return;

    var btnSalvar = modalEl.querySelector('[data-salvar="true"]');
    var originalHtml = btnSalvar ? btnSalvar.innerHTML : '';
    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    }

    try {
        var inputs = modalEl.querySelectorAll('input, select');
        var dados = {};
        for (var j = 0; j < inputs.length; j++) {
            var input = inputs[j];
            var key = input.id ? input.id.split('-').pop() : '';
            if (!key) continue;
            dados[key] = input.value ? input.value.trim() : '';
        }

        var resolvedId = window.botState.idEmEdicao;
        var isEdicao = !!resolvedId;
        var finalId = isEdicao ? String(resolvedId) : String(Date.now());
        dados.id = finalId;
        if (!isEdicao) dados.status = 'TRUE';

        await window.API.call(isEdicao ? ('update' + origem) : ('add' + origem), dados);

        var achou = false;
        for (var i = 0; i < window.botState.cacheCompleto.length; i++) {
            var item = window.botState.cacheCompleto[i];
            if (String(item.id).trim() === finalId && item.origem === origem) {
                Object.assign(item, dados);
                item.origem = origem;
                achou = true;
                break;
            }
        }
        if (!achou) {
            var novoItem = Object.assign({}, dados, { origem: origem, status: dados.status || 'TRUE' });
            window.botState.cacheCompleto.push(novoItem);
        }

        var inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();

        window.botState.idEmEdicao = null;
        window.botState.origemEmEdicao = null;

        Swal.fire({
            icon: 'success',
            title: 'Salvo!',
            text: isEdicao ? 'Registro atualizado com sucesso.' : 'Registro criado com sucesso.',
            confirmButtonColor: '#dc3545',
            timer: 2000,
            showConfirmButton: false
        });

        await window.reloadBot();
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Não foi possível salvar. Tente novamente.',
            confirmButtonColor: '#dc3545'
        });
    } finally {
        if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = originalHtml;
        }
    }
};

window.alterarStatusDireto = async function (id, status, origem) {
    var idStr = String(id || '').trim();
    var origemStr = String(origem || '').trim();
    var novoStatus = status ? 'TRUE' : 'FALSE';

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

        if (origemStr === 'usuarios') {
            setTimeout(function() {
                window.bloquearAcessoPorPermissao();
            }, 300);
        }
    } catch (err) {
        await window.reloadBot();
    }
};

window.confirmarExclusao = function (id, origem, nome) {
    var idStr = String(id || '').trim();
    var origemStr = String(origem || '').trim();
    if (!idStr || !origemStr) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'ID ou origem inválidos para exclusão.', confirmButtonColor: '#dc3545' });
        return;
    }
    var textoEl = document.getElementById('texto-exclusao');
    var btnConfirmar = document.getElementById('btn-confirmar-exclusao');
    var modalEl = document.getElementById('modalConfirmarExclusao');
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
        novoBtn.disabled = true;
        await window.executarExclusao(idStr, origemStr);
        var modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        novoBtn.innerHTML = '<i class="bi bi-trash me-1"></i> Excluir';
        novoBtn.disabled = false;
    });
    var existingInstance = bootstrap.Modal.getInstance(modalEl);
    if (existingInstance) existingInstance.dispose();
    new bootstrap.Modal(modalEl, { backdrop: 'static' }).show();
};

window.executarExclusao = async function (id, origem) {
    var idStr = String(id || '').trim();
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

window.bloquearAcessoPorPermissao = function() {
    var usuarioLogado = localStorage.getItem('username');
    var contatoLogado = localStorage.getItem('contato');

    if (!usuarioLogado && !contatoLogado) return;

    if (!window.botState || !window.botState._cacheCarregado || !window.botState.cacheCompleto || window.botState.cacheCompleto.length === 0) {
        setTimeout(window.bloquearAcessoPorPermissao, 300);
        return;
    }

    var usuariosNoBanco = window.botState.cacheCompleto.filter(function(item) {
        return item.origem === 'usuarios';
    });

    var usuarioEncontrado = null;

    for (var i = 0; i < usuariosNoBanco.length; i++) {
        var item = usuariosNoBanco[i];

        var usernameDb = String(item.username || '').trim().toLowerCase();
        var contatoDb = String(item.contato || '').trim().toLowerCase();

        var usernameLogin = String(usuarioLogado || '').trim().toLowerCase();
        var contatoLogin = String(contatoLogado || usuarioLogado || '').trim().toLowerCase();

        if (usernameDb === usernameLogin || contatoDb === contatoLogin || usernameDb === contatoLogin || contatoDb === usernameLogin) {
            usuarioEncontrado = item;
            break;
        }
    }

    if (!usuarioEncontrado) {
        var cargoLocal = localStorage.getItem('tipo') || localStorage.getItem('cargo');
        if (cargoLocal && window.PERMISSOES_PADRAO[cargoLocal]) {
            _aplicarBloqueiosPorPermissoes(window.PERMISSOES_PADRAO[cargoLocal]);
        } else {
            _bloquearTudo();
        }
        return;
    }

    if (usuarioEncontrado.status !== 'TRUE') {
        _bloquearTudo();
        return;
    }

    var permissoes = [];
    try {
        if (Array.isArray(usuarioEncontrado.permissoes)) {
            permissoes = usuarioEncontrado.permissoes;
        } else if (typeof usuarioEncontrado.permissoes === 'string') {
            permissoes = JSON.parse(usuarioEncontrado.permissoes || '[]');
        } else if (usuarioEncontrado.cargo && window.PERMISSOES_PADRAO[usuarioEncontrado.cargo]) {
            permissoes = window.PERMISSOES_PADRAO[usuarioEncontrado.cargo];
        }
    } catch (e) {
        if (usuarioEncontrado.cargo && window.PERMISSOES_PADRAO[usuarioEncontrado.cargo]) {
            permissoes = window.PERMISSOES_PADRAO[usuarioEncontrado.cargo];
        }
    }

    _aplicarBloqueiosPorPermissoes(permissoes);
};

function _aplicarBloqueiosPorPermissoes(permissoes) {
    var mapeamentoPermissoes = {
        'Dashboard': ['dashboard'],
        'Chat': ['chat'],
        'Pedidos': ['pedidos'],
        'Administração': ['admin'],
        'Financeiro': ['fin'],
        'Relatórios': ['relatorio'],
        'Bot': ['bot']
    };

    var paginasBloqueadas = [];
    for (var perm in mapeamentoPermissoes) {
        if (!permissoes.includes(perm)) {
            paginasBloqueadas = paginasBloqueadas.concat(mapeamentoPermissoes[perm]);
        }
    }

    document.querySelectorAll('.sidebar .nav-link[data-page]').forEach(function(link) {
        var pagina = link.getAttribute('data-page');
        var bloqueado = paginasBloqueadas.includes(pagina);

        var lockIcon = link.querySelector('.bi-lock-fill');
        if (lockIcon) lockIcon.remove();

        if (bloqueado) {
            link.style.opacity = '0.4';
            link.style.pointerEvents = 'none';
            link.style.cursor = 'not-allowed';
            link.title = 'Sem acesso';
            link.setAttribute('data-bloqueado', 'true');

            var icon = document.createElement('i');
            icon.className = 'bi bi-lock-fill ms-1 text-muted';
            icon.style.fontSize = '0.75rem';
            link.appendChild(icon);
        } else {
            link.style.opacity = '1';
            link.style.pointerEvents = 'auto';
            link.style.cursor = 'pointer';
            link.title = '';
            link.removeAttribute('data-bloqueado');
        }
    });

    localStorage.setItem('paginas_bloqueadas', JSON.stringify(paginasBloqueadas));

    var paginaAtual = window.AppRDO?.paginaAtual || 'dashboard';
    if (paginasBloqueadas.includes(paginaAtual)) {
        Swal.fire({
            icon: 'warning',
            title: 'Acesso Negado',
            text: 'Você não tem permissão para acessar este módulo.',
            confirmButtonColor: '#dc3545'
        }).then(function() {
            window.loadPage('dashboard', 'Dashboard', 'Visão geral operacional');
        });
    }
}

function _bloquearTudo() {
    document.querySelectorAll('.sidebar .nav-link[data-page]').forEach(function(link) {
        var pagina = link.getAttribute('data-page');

        if (pagina === 'dashboard') return;

        link.style.opacity = '0.4';
        link.style.pointerEvents = 'none';
        link.style.cursor = 'not-allowed';
        link.title = 'Acesso restrito';
        link.setAttribute('data-bloqueado', 'true');

        var lockIcon = link.querySelector('.bi-lock-fill');
        if (lockIcon) lockIcon.remove();

        var icon = document.createElement('i');
        icon.className = 'bi bi-lock-fill ms-1 text-danger';
        icon.style.fontSize = '0.75rem';
        link.appendChild(icon);
    });

    localStorage.setItem('paginas_bloqueadas', JSON.stringify(['chat', 'pedidos', 'admin', 'fin', 'relatorio', 'bot']));
}
