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

var MAPA_MODULO_PAGE = {
    'Dashboard': 'dashboard',
    'Chat': 'chat',
    'Pedidos': 'pedidos',
    'Administração': 'admin',
    'Financeiro': 'fin',
    'Relatórios': 'relatorio',
    'Bot': 'bot'
};

var CARGOS_DISPONIVEIS = ['Atendente', 'Financeiro', 'Gestor', 'Administrativo', 'SRE Tecnologia'];

window.PERMISSOES_PADRAO = {
    'Atendente': ['Dashboard', 'Chat', 'Pedidos'],
    'Financeiro': ['Dashboard', 'Pedidos', 'Financeiro', 'Relatórios'],
    'Gestor': ['Dashboard', 'Chat', 'Pedidos', 'Administração', 'Financeiro', 'Relatórios'],
    'Administrativo': ['Dashboard', 'Pedidos', 'Administração', 'Relatórios'],
    'SRE Tecnologia': ['Dashboard', 'Chat', 'Pedidos', 'Administração', 'Financeiro', 'Relatórios', 'Bot']
};

function normalizeStatus(val, fallback) {
    fallback = fallback || 'FALSE';
    if (val === true || val === 1) return 'TRUE';
    if (val === false || val === 0) return 'FALSE';
    var s = String(val || '').trim().toUpperCase();
    if (s === '') return fallback;
    if (s === 'TRUE' || s === '1' || s === 'ATIVO' || s === 'ON' || s === 'SIM' || s === 'YES') return 'TRUE';
    if (s === 'FALSE' || s === '0' || s === 'INATIVO' || s === 'OFF' || s === 'NÃO' || s === 'NAO' || s === 'NO') return 'FALSE';
    return fallback;
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

function _botTemPermissao(permissao) {
    var usuario = _usuarioLogadoBot();
    return Array.isArray(usuario.permissoes) && usuario.permissoes.indexOf(permissao) !== -1;
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
    if (!_botTemPermissao('Bot') && !_botTemPermissao('Administração')) {
        Swal.fire({ icon: 'warning', title: 'Acesso negado', text: 'Você não tem permissão para alterar o Master.', confirmButtonColor: '#dc3545' });
        return;
    }
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
    seletor.disabled = !isMasterOn || comStatus.length === 0 || window.botState.isTogglingAll || !_botTemPermissao('Administração');
    if (comStatus.length === 0) { seletor.checked = false; return; }
    var totalAtivos = 0;
    for (var k = 0; k < comStatus.length; k++) {
        if (comStatus[k].status === 'TRUE') totalAtivos++;
    }
    seletor.checked = totalAtivos === comStatus.length;
}

window.alternarTodosStatus = async function (ativar) {
    if (!_botTemPermissao('Administração')) {
        var seletorP = document.getElementById('seletor-global-status');
        if (seletorP) seletorP.checked = !ativar;
        Swal.fire({ icon: 'warning', title: 'Acesso negado', text: 'Você não tem permissão para essa ação.', confirmButtonColor: '#dc3545' });
        return;
    }
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

window.initBot = function () {
    if (window.botState.isFetching) return Promise.resolve();

    if (!_botTemPermissao('Bot') && !_botTemPermissao('Administração')) {
        var tbodyBloq = document.getElementById('bot-list');
        if (tbodyBloq) {
            tbodyBloq.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-lock-fill me-2"></i>Você não tem permissão para acessar este módulo.</td></tr>';
        }
        var btnMasterBloq = document.getElementById('btn-status-bot');
        if (btnMasterBloq) btnMasterBloq.disabled = true;
        return Promise.resolve();
    }

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

function exibirLoadingBot() {
    var tbody = document.getElementById('bot-list');
    if (!tbody) return;
    tbody.innerHTML =
        '<tr><td colspan="5" class="p-0">' +
        '<div class="bot-lista-loading">' +
        '<i class="bi bi-search bot-loading-spin"></i>' +
        '<span>Buscando informações' +
        '<span class="bot-dots-anim"><span>.</span><span>.</span><span>.</span></span>' +
        '</span>' +
        '</div>' +
        '</td></tr>';
}

window.reloadBot = function () {
    var tbody = document.getElementById('bot-list');
    if (window.botState.isFetching) return Promise.resolve();
    if (!_botTemPermissao('Bot') && !_botTemPermissao('Administração')) return Promise.resolve();

    window.botState.isFetching = true;
    window.botState._cacheCarregado = false;
    syncStart();
    exibirLoadingBot();

    return Promise.all([
        window.API.call('getusuarios').catch(function () { return []; }),
        window.API.call('getclientes').catch(function () { return []; }),
        window.API.call('getcolaboradores').catch(function () { return []; })
    ])
        .then(function (results) {
            var users = Array.isArray(results[0]) ? results[0] : (results[0]?.data || []);
            var clients = Array.isArray(results[1]) ? results[1] : (results[1]?.data || []);
            var cols = Array.isArray(results[2]) ? results[2] : (results[2]?.data || []);

            var todosDados = [];

            for (var u = 0; u < users.length; u++) {
                var usr = Object.assign({}, users[u]);
                usr.origem = 'usuarios';
                usr.status = normalizeStatus(usr.status, 'FALSE');

                try {
                    var storageKey = 'permissoes_usuario_' + usr.id;
                    var storedPerms = localStorage.getItem(storageKey);
                    if (storedPerms) {
                        var parsed = JSON.parse(storedPerms);
                        usr.permissoes = Array.isArray(parsed) && parsed.length > 0 ? parsed : (window.PERMISSOES_PADRAO[usr.cargo] || []);
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
                cli.status = normalizeStatus(cli.status, 'TRUE');
                if (!String(cli.id || '').trim()) continue;
                todosDados.push(cli);
            }

            for (var b = 0; b < cols.length; b++) {
                var col = Object.assign({}, cols[b]);
                col.origem = 'colaboradores';
                col.status = normalizeStatus(col.status, 'FALSE');
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
                        it.status = normalizeStatus(it.status, 'TRUE');
                        return it;
                    });
            }

            window.filtrarBot();

            window.dispatchEvent(new CustomEvent('botCacheAtualizado', { detail: { registros: todosDados.length } }));
        })
        .catch(function () {
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-wifi-off me-2"></i>Falha na conexão</td></tr>';
            }
        })
        .finally(function () {
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
    var idStr = String(id).trim();
    var origemStr = String(origem).trim();
    var lista = window.botState.cacheCompleto || [];

    return lista.find(function (i) {
        return String(i.id).trim() === idStr && String(i.origem).trim() === origemStr;
    }) || null;
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

function _preencherCargoDisplay(cargo) {
    var display = document.getElementById('cargo-selecionado-display');
    if (!display) return;
    var nomeEl = display.querySelector('.cargo-display-nome');
    var hintEl = display.querySelector('.cargo-display-hint');
    if (nomeEl) nomeEl.textContent = cargo || 'Nenhum cargo selecionado';
    if (hintEl) hintEl.textContent = cargo ? 'Clique para alterar' : 'Clique para selecionar';
    display.classList.toggle('cargo-selected', !!cargo);
}

function _marcarPermissoesCheckbox(permissoes) {
    var lista = Array.isArray(permissoes) ? permissoes : [];
    document.querySelectorAll('.permissao-checkbox').forEach(function (cb) {
        cb.checked = lista.indexOf(cb.value) !== -1;
    });
}

function _abrirModalUsuario(item) {
    var idEl = document.getElementById('usuario-bot-id');
    var userEl = document.getElementById('usuario-bot-username');
    var contatoEl = document.getElementById('usuario-bot-contato');
    var passEl = document.getElementById('usuario-bot-password');
    var imgEl = document.getElementById('usuario-bot-imagem');
    var cargoEl = document.getElementById('usuario-bot-cargo');
    var btnToggle = document.getElementById('btn-toggle-senha-bot');
    var iconToggle = document.getElementById('icon-toggle-senha-bot');

    if (idEl) idEl.value = item.id || '';
    if (userEl) userEl.value = item.username || item.nome || '';
    if (contatoEl) contatoEl.value = item.contato || item.telefone || '';
    if (passEl) {
        passEl.value = item.password || '';
        passEl.type = 'password';
    }
    if (iconToggle) iconToggle.className = 'bi bi-eye-slash';
    if (btnToggle) btnToggle.classList.toggle('oculto', !(item.password));
    if (imgEl) imgEl.value = item.imagem || '';
    if (cargoEl) cargoEl.value = item.cargo || '';

    _preencherCargoDisplay(item.cargo);

    var permissoesAtuais = item.permissoes || (window.PERMISSOES_PADRAO && window.PERMISSOES_PADRAO[item.cargo]) || [];
    _marcarPermissoesCheckbox(permissoesAtuais);

    var modalUsuario = document.getElementById('modalUsuarioBot') || document.getElementById('modalSelecionarCargo');
    if (modalUsuario) {
        var existingInstance = bootstrap.Modal.getInstance(modalUsuario);
        if (existingInstance) existingInstance.dispose();
        new bootstrap.Modal(modalUsuario, { backdrop: 'static' }).show();
    }
}

async function _abrirFormAdminBot(item, origem) {
    var nome = item.username || item.nome || item.responsavel || item.colaborador || 'N/A';
    var camposHtml = '' +
        '<div class="text-start">' +
        '<p><strong>Nome:</strong> ' + nome + '</p>' +
        '<p><strong>ID:</strong> ' + (item.id || '—') + '</p>' +
        '<p><strong>Contato:</strong> ' + (item.contato || item.telefone || '—') + '</p>' +
        '<p><strong>Status:</strong> ' + (item.status === 'TRUE' ? 'Ativo' : 'Inativo') + '</p>' +
        '<p><strong>Origem:</strong> ' + _labelOrigem(origem) + '</p>' +
        '</div>';

    await Swal.fire({
        title: 'Detalhes do registro',
        html: camposHtml,
        icon: 'info',
        confirmButtonText: 'Fechar',
        confirmButtonColor: '#0d6efd'
    });
}

function renderizarTabela() {
    var tbody = document.getElementById('bot-list');
    var tdTipo = document.createElement('td');
    var infoPag = document.getElementById('info-paginacao');
    var infoTotal = document.getElementById('info-total');
    var isMasterOn = window.checkMaster();
    var podeAdministrar = _botTemPermissao('Administração');
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
        chk.disabled = !isMasterOn || !podeAdministrar;
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
        tdTipo.className = 'col-tipo';
        var badge = document.createElement('span');
        badge.className = 'badge-tipo badge-' + i.origem + (!isMasterOn ? ' opacity-50' : '');
        badge.textContent = _labelOrigem(i.origem);
        tdTipo.appendChild(badge);

        var tdAcoes = document.createElement('td');
        tdAcoes.className = 'text-end pe-3';

        if (itemOrigem === 'usuarios') {
            if (podeAdministrar) {
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
            }
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

        if (isMasterOn && podeAdministrar) {
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

function _obterPermissoesEfetivas(usuario) {
    if (!usuario) return [];

    var padraoCargo = window.PERMISSOES_PADRAO[usuario.cargo] || [];

    if (usuario.id) {
        try {
            var storageKey = 'permissoes_usuario_' + usuario.id;
            var storedPerms = localStorage.getItem(storageKey);
            if (storedPerms) {
                var parsed = JSON.parse(storedPerms);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { /* ignora e cai no fallback */ }
    }

    return padraoCargo;
}

function _usuarioLogadoBot() {
    var usuario = null;

    if (window.dashboardState && window.dashboardState.usuario) {
        usuario = window.dashboardState.usuario;
    } else if (typeof obterUsuarioLogado === 'function') {
        usuario = obterUsuarioLogado();
    }

    if (!usuario || !usuario.cargo) {
        usuario = {
            id: localStorage.getItem('user_id') || localStorage.getItem('id_usuario') || '',
            username: localStorage.getItem('username') || 'Usuário',
            cargo: localStorage.getItem('user_cargo') || localStorage.getItem('tipo') || ''
        };
    }

    usuario = Object.assign({}, usuario);
    usuario.permissoes = _obterPermissoesEfetivas(usuario);
    return usuario;
}

function _botTemPermissao(permissao) {
    var usuario = _usuarioLogadoBot();
    return Array.isArray(usuario.permissoes) && usuario.permissoes.indexOf(permissao) !== -1;
}

function _usuarioAtualPermissoes() {
    var usuario = _usuarioLogadoBot();
    return Array.isArray(usuario.permissoes) ? usuario.permissoes : [];
}

if (!window._toggleSenhaBotRegistrado) {
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('#btn-toggle-senha-bot');
        if (!btn) return;

        var input = document.getElementById('usuario-bot-password');
        var icon = document.getElementById('icon-toggle-senha-bot');
        if (!input) return;

        var visivel = input.type === 'text';
        input.type = visivel ? 'password' : 'text';
        if (icon) icon.className = visivel ? 'bi bi-eye-slash' : 'bi bi-eye';
    });
    window._toggleSenhaBotRegistrado = true;
}

window.abrirModalCadastro = function () {
    if (!_botTemPermissao('Administração')) {
        Swal.fire({ icon: 'warning', title: 'Acesso negado', text: 'Você não tem permissão para cadastrar registros.', confirmButtonColor: '#dc3545' });
        return;
    }
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

    document.querySelectorAll('.permissao-checkbox').forEach(function (cb) {
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
    if (!_botTemPermissao('Administração')) {
        Swal.fire({ icon: 'warning', title: 'Acesso negado', text: 'Você não tem permissão para editar registros.', confirmButtonColor: '#dc3545' });
        return;
    }
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

function _btnLoadingStart(btn) {
    if (!btn) return;
    btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
}

function _btnLoadingStop(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
}

window.salvarUsuarioBot = async function () {
    var btn = document.getElementById('btn-salvar-usuario-bot');

    var id = document.getElementById('usuario-bot-id').value.trim();
    var username = document.getElementById('usuario-bot-username').value.trim();
    var contato = document.getElementById('usuario-bot-contato').value.trim();
    var password = document.getElementById('usuario-bot-password').value.trim();
    var imagem = document.getElementById('usuario-bot-imagem').value.trim();
    var cargo = document.getElementById('usuario-bot-cargo').value.trim();

    if (!username) {
        Swal.fire({ icon: 'warning', title: 'Campo obrigatório', text: 'Informe o nome do usuário.', confirmButtonColor: '#dc3545' });
        return;
    }
    if (!cargo) {
        Swal.fire({ icon: 'warning', title: 'Campo obrigatório', text: 'Selecione um cargo.', confirmButtonColor: '#dc3545' });
        return;
    }
    if (!id && !password) {
        Swal.fire({ icon: 'warning', title: 'Campo obrigatório', text: 'Informe uma senha para o novo usuário.', confirmButtonColor: '#dc3545' });
        return;
    }

    var permissoes = [];
    document.querySelectorAll('.permissao-checkbox:checked').forEach(function (cb) {
        permissoes.push(cb.value);
    });

    var payload = {
        username: username,
        contato: contato,
        imagem: imagem,
        cargo: cargo
    };
    if (password) payload.password = password;

    _btnLoadingStart(btn);
    syncStart();

    try {
        var resultado;
        if (id) {
            payload.id = id;
            resultado = await window.API.call('updateusuarios', payload);
        } else {
            resultado = await window.API.call('createusuarios', payload);
        }

        var idFinal = id || (resultado && (resultado.id || (resultado.data && resultado.data.id))) || '';
        if (idFinal) {
            try {
                localStorage.setItem('permissoes_usuario_' + idFinal, JSON.stringify(permissoes));
            } catch (e) { }
        }

        var modalUsuario = document.getElementById('modalUsuarioBot');
        var instancia = bootstrap.Modal.getInstance(modalUsuario);
        if (instancia) instancia.hide();

        await window.reloadBot();

        Swal.fire({ icon: 'success', title: 'Sucesso', text: id ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado com sucesso.', confirmButtonColor: '#198754' });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível salvar o usuário.', confirmButtonColor: '#dc3545' });
    } finally {
        _btnLoadingStop(btn);
        syncStop();
    }
};

window.salvarClienteBot = async function () {
    var btn = document.querySelector('#modalCliente [data-salvar="true"]');

    var id = document.getElementById('cliente-bot-id').value.trim();
    var responsavel = document.getElementById('cliente-bot-responsavel').value.trim();
    var contato = document.getElementById('cliente-bot-contato').value.trim();
    var endereco = document.getElementById('cliente-bot-endereco').value.trim();
    var cidade = document.getElementById('cliente-bot-cidade').value.trim();
    var imagem = document.getElementById('cliente-bot-imagem').value.trim();

    if (!responsavel) {
        Swal.fire({ icon: 'warning', title: 'Campo obrigatório', text: 'Informe o nome do responsável.', confirmButtonColor: '#dc3545' });
        return;
    }

    var payload = { responsavel: responsavel, contato: contato, endereco: endereco, cidade: cidade, imagem: imagem };

    _btnLoadingStart(btn);
    syncStart();

    try {
        if (id) {
            payload.id = id;
            await window.API.call('updateclientes', payload);
        } else {
            await window.API.call('createclientes', payload);
        }

        var modalCliente = document.getElementById('modalCliente');
        var instancia = bootstrap.Modal.getInstance(modalCliente);
        if (instancia) instancia.hide();

        await window.reloadBot();

        Swal.fire({ icon: 'success', title: 'Sucesso', text: id ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.', confirmButtonColor: '#198754' });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível salvar o cliente.', confirmButtonColor: '#dc3545' });
    } finally {
        _btnLoadingStop(btn);
        syncStop();
    }
};

window.salvarColaboradorBot = async function () {
    var btn = document.querySelector('#modalColaborador [data-salvar="true"]');

    var id = document.getElementById('colaborador-bot-id').value.trim();
    var colaborador = document.getElementById('colaborador-bot-colaborador').value.trim();
    var cargo = document.getElementById('colaborador-bot-cargo').value.trim();
    var contato = document.getElementById('colaborador-bot-contato').value.trim();
    var imagem = document.getElementById('colaborador-bot-imagem').value.trim();

    if (!colaborador) {
        Swal.fire({ icon: 'warning', title: 'Campo obrigatório', text: 'Informe o nome do colaborador.', confirmButtonColor: '#dc3545' });
        return;
    }

    var payload = { colaborador: colaborador, cargo: cargo, contato: contato, imagem: imagem };

    _btnLoadingStart(btn);
    syncStart();

    try {
        if (id) {
            payload.id = id;
            await window.API.call('updatecolaboradores', payload);
        } else {
            await window.API.call('createcolaboradores', payload);
        }

        var modalColaborador = document.getElementById('modalColaborador');
        var instancia = bootstrap.Modal.getInstance(modalColaborador);
        if (instancia) instancia.hide();

        await window.reloadBot();

        Swal.fire({ icon: 'success', title: 'Sucesso', text: id ? 'Colaborador atualizado com sucesso.' : 'Colaborador cadastrado com sucesso.', confirmButtonColor: '#198754' });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível salvar o colaborador.', confirmButtonColor: '#dc3545' });
    } finally {
        _btnLoadingStop(btn);
        syncStop();
    }
};

if (!window._salvarBotHandlersRegistrados) {
    document.addEventListener('click', function (e) {
        var btnCliente = e.target.closest('#modalCliente [data-salvar="true"]');
        if (btnCliente) {
            window.salvarClienteBot();
            return;
        }
        var btnColaborador = e.target.closest('#modalColaborador [data-salvar="true"]');
        if (btnColaborador) {
            window.salvarColaboradorBot();
            return;
        }
    });
    window._salvarBotHandlersRegistrados = true;
}

window.visualizarBot = async function (id, origem) {
    var idStr = String(id || '').trim();
    var origemStr = String(origem || '').trim();
    var item = _buscarItemCompleto(idStr, origemStr);
    if (!item) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Registro não encontrado.', confirmButtonColor: '#dc3545' });
        return;
    }

    if (origemStr === 'usuarios') {
        document.getElementById('usuario-bot-id').value = item.id || '';
        document.getElementById('usuario-bot-username').value = item.username || '';
        document.getElementById('usuario-bot-cargo').value = item.cargo || '';
        document.getElementById('usuario-bot-contato').value = item.contato || '';
        document.getElementById('usuario-bot-imagem').value = item.imagem || '';
        document.getElementById('usuario-bot-password').value = item.password || '';

        var campoUltimoAcesso = document.getElementById('usuario-bot-ultimo-acesso');
        if (campoUltimoAcesso) campoUltimoAcesso.value = item.ultimo_acesso || '';

        var campoStatus = document.getElementById('usuario-bot-status');
        if (campoStatus) campoStatus.value = item.status || '';

        var permissoesSalvas = [];
        try {
            permissoesSalvas = JSON.parse(localStorage.getItem('permissoes_usuario_' + item.id) || '[]');
        } catch (e) { }
        document.querySelectorAll('.permissao-checkbox').forEach(function (cb) {
            cb.checked = permissoesSalvas.indexOf(cb.value) !== -1;
        });

        var modalUsuario = document.getElementById('modalUsuarioBot');
        var instU = bootstrap.Modal.getInstance(modalUsuario);
        if (instU) instU.dispose();
        new bootstrap.Modal(modalUsuario).show();
        return;
    }

    if (origemStr === 'clientes') {
        document.getElementById('cliente-bot-id').value = item.id || '';
        document.getElementById('cliente-bot-responsavel').value = item.responsavel || item.nome || '';
        document.getElementById('cliente-bot-contato').value = item.contato || item.telefone || '';
        document.getElementById('cliente-bot-endereco').value = item.endereco || '';
        document.getElementById('cliente-bot-cidade').value = item.cidade || '';
        document.getElementById('cliente-bot-imagem').value = item.imagem || '';
        var modalCliente = document.getElementById('modalCliente');
        var instC = bootstrap.Modal.getInstance(modalCliente);
        if (instC) instC.dispose();
        new bootstrap.Modal(modalCliente).show();
        return;
    }

    if (origemStr === 'colaboradores') {
        document.getElementById('colaborador-bot-id').value = item.id || '';
        document.getElementById('colaborador-bot-colaborador').value = item.colaborador || item.nome || '';
        document.getElementById('colaborador-bot-cargo').value = item.cargo || '';
        document.getElementById('colaborador-bot-contato').value = item.contato || item.telefone || '';
        document.getElementById('colaborador-bot-imagem').value = item.imagem || '';
        var modalColaborador = document.getElementById('modalColaborador');
        var instK = bootstrap.Modal.getInstance(modalColaborador);
        if (instK) instK.dispose();
        new bootstrap.Modal(modalColaborador).show();
        return;
    }

    await _abrirFormAdminBot(item, origemStr);
};

window.alterarStatusDireto = async function (id, novoValor, origem) {
    if (!window.checkMaster()) {
        Swal.fire({ icon: 'warning', title: 'Master desligado', text: 'Sistema Master RDO está desligado.', confirmButtonColor: '#dc3545' });
        window.reloadBot();
        return;
    }
    if (!_botTemPermissao('Administração')) {
        Swal.fire({ icon: 'warning', title: 'Acesso negado', text: 'Você não tem permissão para alterar status.', confirmButtonColor: '#dc3545' });
        window.reloadBot();
        return;
    }

    var idStr = String(id || '').trim();
    var origemStr = String(origem || '').trim();
    var novoStatus = novoValor ? 'TRUE' : 'FALSE';
    var item = _buscarItemCompleto(idStr, origemStr);
    if (!item) return;

    item.status = novoStatus;

    try {
        await window.API.call('update' + origemStr, { id: idStr, status: novoStatus });
        if (origemStr === 'clientes' && window.AppRDO && Array.isArray(window.AppRDO.clientesCache)) {
            var cliente = window.AppRDO.clientesCache.find(function (c) { return String(c.id).trim() === idStr; });
            if (cliente) cliente.status = novoStatus;
        }
        atualizarSeletorGlobal();
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível atualizar o status.', confirmButtonColor: '#dc3545' });
        window.reloadBot();
    }
};

window.confirmarExclusao = async function (id, origem, nome) {
    if (!_botTemPermissao('Administração')) {
        Swal.fire({ icon: 'warning', title: 'Acesso negado', text: 'Você não tem permissão para excluir registros.', confirmButtonColor: '#dc3545' });
        return;
    }
    if (!window.checkMaster()) {
        Swal.fire({ icon: 'warning', title: 'Master desligado', text: 'Sistema Master RDO está desligado.', confirmButtonColor: '#dc3545' });
        return;
    }

    var idStr = String(id || '').trim();
    var origemStr = String(origem || '').trim();

    var confirmacao = await Swal.fire({
        icon: 'warning',
        title: 'Confirmar exclusão',
        text: 'Deseja excluir "' + (nome || idStr) + '"? Essa ação não pode ser desfeita.',
        showCancelButton: true,
        confirmButtonText: 'Excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
    });

    if (!confirmacao.isConfirmed) return;

    syncStart();
    try {
        await window.API.call('delete' + origemStr, { id: idStr });
        await window.reloadBot();
        Swal.fire({ icon: 'success', title: 'Excluído', text: 'Registro removido com sucesso.', confirmButtonColor: '#198754' });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível excluir o registro.', confirmButtonColor: '#dc3545' });
    } finally {
        syncStop();
    }
};

window.aplicarControleAcessoModulos = function () {
    var permissoes = _usuarioAtualPermissoes();
    var itensModulo = document.querySelectorAll('[data-modulo]');
    var paginasBloqueadas = [];

    itensModulo.forEach(function (item) {
        var modulo = item.getAttribute('data-modulo');
        var permitido = permissoes.indexOf(modulo) !== -1;

        item.classList.remove('modulo-bloqueado');
        var cadeadoExistente = item.querySelector('.icone-cadeado-modulo');
        if (cadeadoExistente) cadeadoExistente.remove();

        if (!permitido) {
            item.classList.add('modulo-bloqueado');
            var cadeado = document.createElement('i');
            cadeado.className = 'bi bi-lock-fill icone-cadeado-modulo';
            item.appendChild(cadeado);

            var page = MAPA_MODULO_PAGE[modulo];
            if (page) paginasBloqueadas.push(page);
        }
    });

    // 👇 sincroniza com o guard de rota do app.js
    localStorage.setItem('paginas_bloqueadas', JSON.stringify(paginasBloqueadas));
};

window.aplicarControleWidgetsDashboard = function () {
    var permissoes = _usuarioAtualPermissoes();
    var widgets = document.querySelectorAll('[data-modulo-restrito]');

    widgets.forEach(function (widget) {
        var modulo = widget.getAttribute('data-modulo-restrito');
        var permitido = permissoes.indexOf(modulo) !== -1;
        widget.style.display = permitido ? '' : 'none';
    });
};

window.aplicarPermissoesUsuario = function () {
    window.aplicarControleAcessoModulos();
    window.aplicarControleWidgetsDashboard();
};

if (!window._bloqueioModuloDelegado) {
    document.addEventListener('click', function (e) {
        var itemBloqueado = e.target.closest('[data-modulo].modulo-bloqueado');
        if (!itemBloqueado) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        Swal.fire({
            icon: 'warning',
            title: 'Acesso restrito',
            text: 'Você não tem acesso a esse módulo. Entre em contato com seu gestor.',
            confirmButtonColor: '#dc3545'
        });
    }, true);
    window._bloqueioModuloDelegado = true;
}

document.addEventListener('DOMContentLoaded', function () {
    window.aplicarPermissoesUsuario();
});

window.addEventListener('usuarioLogado', function () {
    window.aplicarPermissoesUsuario();
});

window.addEventListener('botCacheAtualizado', function () {
    window.aplicarPermissoesUsuario();
});

window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf('permissoes_usuario_') === 0) {
        window.aplicarPermissoesUsuario();
    }
});
