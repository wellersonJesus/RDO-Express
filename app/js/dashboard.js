window.dashboardState = {
    usuario: null,
    dados: null,
    isFetching: false
};

window.INDICADORES_CONFIG = [
    {
        chave: 'clientesAtivos',
        permissao: 'Pedidos',
        titulo: 'Clientes Ativos',
        icone: 'bi-building',
        cor: 'danger',
        calcular: function (d) {
            return d.clientes.filter(function (c) { return String(c.status || '').toUpperCase() === 'TRUE'; }).length;
        }
    },
    {
        chave: 'colaboradoresAtivos',
        permissao: 'Administração',
        titulo: 'Colaboradores Ativos',
        icone: 'bi-people-fill',
        cor: 'primary',
        calcular: function (d) {
            return d.colaboradores.filter(function (c) { return String(c.status || '').toUpperCase() === 'TRUE'; }).length;
        }
    },
    {
        chave: 'usuariosCadastrados',
        permissao: 'Administração',
        titulo: 'Usuários do Sistema',
        icone: 'bi-person-badge',
        cor: 'info',
        calcular: function (d) {
            return d.usuarios.length;
        }
    },
    {
        chave: 'comissaoMedia',
        permissao: 'Financeiro',
        titulo: 'Comissão Média',
        icone: 'bi-cash-coin',
        cor: 'success',
        calcular: function (d) {
            var comColab = d.colaboradores.filter(function (c) { return c.comissao && !isNaN(parseFloat(c.comissao)); });
            if (comColab.length === 0) return '0%';
            var soma = comColab.reduce(function (acc, c) { return acc + parseFloat(c.comissao); }, 0);
            return (soma / comColab.length).toFixed(1) + '%';
        }
    },
    {
        chave: 'statusBot',
        permissao: 'Bot',
        titulo: 'Status do Bot',
        icone: 'bi-robot',
        cor: 'warning',
        calcular: function (d) {
            return d.masterOn ? 'Ativo' : 'Inativo';
        }
    },
    {
        chave: 'totalRegistros',
        permissao: 'Relatórios',
        titulo: 'Total de Registros',
        icone: 'bi-bar-chart-fill',
        cor: 'secondary',
        calcular: function (d) {
            return d.clientes.length + d.colaboradores.length + d.usuarios.length;
        }
    },
    {
        chave: 'meuAcesso',
        permissao: 'Dashboard',
        titulo: 'Módulos Liberados',
        icone: 'bi-unlock-fill',
        cor: 'dark',
        calcular: function (d, usuario) {
            return usuario.permissoes.length;
        }
    }
];

function obterUsuarioLogado() {
    var username = localStorage.getItem('username') || 'Usuário';
    var cargo = localStorage.getItem('tipo') || '';
    var permissoes = [];

    var cargoNormalizado = _normalizarCargo(cargo);

    try {
        if (window.PERMISSOES_PADRAO && window.PERMISSOES_PADRAO[cargoNormalizado]) {
            permissoes = window.PERMISSOES_PADRAO[cargoNormalizado];
        } else if (window.PERMISSOES_PADRAO && window.PERMISSOES_PADRAO[cargo]) {
            permissoes = window.PERMISSOES_PADRAO[cargo];
        }
    } catch (e) {
        permissoes = [];
    }

    if (!Array.isArray(permissoes) || permissoes.length === 0) {
        var isMaster = localStorage.getItem('rdo_auth') && (cargo.toLowerCase().indexOf('admin') !== -1);
        if (isMaster && window.PERMISSOES_PADRAO) {
            permissoes = window.PERMISSOES_PADRAO['SRE Tecnologia'] || [];
        }
    }

    return { username: username, cargo: cargo, permissoes: Array.isArray(permissoes) ? permissoes : [] };
}

function _normalizarCargo(cargo) {
    if (!window.PERMISSOES_PADRAO) return cargo;
    var chaves = Object.keys(window.PERMISSOES_PADRAO);
    for (var i = 0; i < chaves.length; i++) {
        if (chaves[i].toLowerCase() === String(cargo || '').toLowerCase()) return chaves[i];
    }
    return cargo;
}

function usuarioTemPermissao(usuario, permissao) {
    return usuario.permissoes.indexOf(permissao) !== -1;
}

function atualizarHeaderUsuario(usuario) {
    var elNome = document.getElementById('user-display-name');
    var elCargo = document.getElementById('user-display-cargo');
    if (elNome) elNome.textContent = usuario.username;
    if (elCargo) elCargo.textContent = usuario.cargo || '';
}

function syncStartDashboard() {
    var icon = document.getElementById('icon-refresh-dashboard');
    if (icon) icon.classList.add('spinner-rotate');
}

function syncStopDashboard() {
    var icon = document.getElementById('icon-refresh-dashboard');
    if (icon) icon.classList.remove('spinner-rotate');
}

function carregarDadosDashboard() {
    if (!window.API || typeof window.API.call !== 'function') {
        return Promise.resolve({ clientes: [], colaboradores: [], usuarios: [], masterOn: false });
    }

    return Promise.all([
        window.API.call('getclientes').catch(function () { return []; }),
        window.API.call('getcolaboradores').catch(function () { return []; }),
        window.API.call('getusuarios').catch(function () { return []; })
    ]).then(function (results) {
        var clientes = Array.isArray(results[0]) ? results[0] : (results[0] && results[0].data) || [];
        var colaboradores = Array.isArray(results[1]) ? results[1] : (results[1] && results[1].data) || [];
        var usuarios = Array.isArray(results[2]) ? results[2] : (results[2] && results[2].data) || [];
        var masterOn = typeof window.checkMaster === 'function' ? window.checkMaster() : (localStorage.getItem('bot_master_active') === 'true');

        return { clientes: clientes, colaboradores: colaboradores, usuarios: usuarios, masterOn: masterOn };
    });
}

function renderIndicadorCard(config, valor) {
    return '' +
        '<div class="indicador-card indicador-' + config.cor + '">' +
        '<div class="indicador-icon"><i class="bi ' + config.icone + '"></i></div>' +
        '<div class="indicador-info">' +
        '<div class="indicador-valor">' + valor + '</div>' +
        '<div class="indicador-label">' + config.titulo + '</div>' +
        '</div>' +
        '</div>';
}

function renderizarIndicadores(usuario, dados) {
    var grid = document.getElementById('dashboard-indicadores-grid');
    var semPermissao = document.getElementById('dashboard-sem-permissao');
    if (!grid) return;

    var permitidos = window.INDICADORES_CONFIG.filter(function (cfg) {
        return usuarioTemPermissao(usuario, cfg.permissao);
    });

    if (permitidos.length === 0) {
        grid.innerHTML = '';
        if (semPermissao) semPermissao.classList.remove('d-none');
        return;
    }

    if (semPermissao) semPermissao.classList.add('d-none');

    var html = '';
    for (var i = 0; i < permitidos.length; i++) {
        var cfg = permitidos[i];
        var valor;
        try {
            valor = cfg.calcular(dados, usuario);
        } catch (e) {
            valor = '-';
        }
        html += renderIndicadorCard(cfg, valor);
    }
    grid.innerHTML = html;
}

window.initDashboard = function () {
    if (window.dashboardState.isFetching) return Promise.resolve();
    window.dashboardState.isFetching = true;

    var usuario = obterUsuarioLogado();
    window.dashboardState.usuario = usuario;
    atualizarHeaderUsuario(usuario);
    syncStartDashboard();

    var btnRefresh = document.getElementById('btn-refresh-dashboard');
    if (btnRefresh) btnRefresh.onclick = function () { window.initDashboard(); };

    return carregarDadosDashboard()
        .then(function (dados) {
            window.dashboardState.dados = dados;
            renderizarIndicadores(usuario, dados);
        })
        .finally(function () {
            window.dashboardState.isFetching = false;
            syncStopDashboard();
        });
};

window.addEventListener('masterStatusChanged', function () {
    if (window.dashboardState.dados) {
        window.dashboardState.dados.masterOn = typeof window.checkMaster === 'function' ? window.checkMaster() : window.dashboardState.dados.masterOn;
        renderizarIndicadores(window.dashboardState.usuario, window.dashboardState.dados);
    }
});
