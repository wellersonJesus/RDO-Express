window.dashboardState = {
    usuario: null,
    dados: null,
    isFetching: false,
    charts: {}
};

window.INDICADORES_CONFIG = [
    {
        chave: 'clientesAtivos', permissao: 'Pedidos', titulo: 'Clientes Ativos', icone: 'bi-building', cor: 'danger',
        calcular: function (d) { return d.clientes.filter(function (c) { return String(c.status || '').toUpperCase() === 'TRUE'; }).length; }
    },
    {
        chave: 'colaboradoresAtivos', permissao: 'Administração', titulo: 'Colaboradores Ativos', icone: 'bi-people-fill', cor: 'primary',
        calcular: function (d) { return d.colaboradores.filter(function (c) { return String(c.status || '').toUpperCase() === 'TRUE'; }).length; }
    },
    {
        chave: 'usuariosCadastrados', permissao: 'Administração', titulo: 'Usuários do Sistema', icone: 'bi-person-badge', cor: 'info',
        calcular: function (d) { return d.usuarios.length; }
    },
    {
        chave: 'comissaoMedia', permissao: 'Financeiro', titulo: 'Comissão Média', icone: 'bi-cash-coin', cor: 'success',
        calcular: function (d) {
            var comColab = d.colaboradores.filter(function (c) { return c.comissao && !isNaN(parseFloat(c.comissao)); });
            if (comColab.length === 0) return '0%';
            var soma = comColab.reduce(function (acc, c) { return acc + parseFloat(c.comissao); }, 0);
            return (soma / comColab.length).toFixed(1) + '%';
        }
    },
    {
        chave: 'statusBot', permissao: 'Bot', titulo: 'Status do Bot', icone: 'bi-robot', cor: 'warning',
        calcular: function (d) { return d.masterOn ? 'Ativo' : 'Inativo'; }
    },
    {
        chave: 'totalRegistros', permissao: 'Relatórios', titulo: 'Total de Registros', icone: 'bi-bar-chart-fill', cor: 'secondary',
        calcular: function (d) { return d.clientes.length + d.colaboradores.length + d.usuarios.length; }
    },
    {
        chave: 'meuAcesso', permissao: 'Dashboard', titulo: 'Módulos Liberados', icone: 'bi-unlock-fill', cor: 'dark',
        calcular: function (d, usuario) { return usuario.permissoes.length; }
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
    } catch (e) { permissoes = []; }

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

function _chamarApi(action) {
    if (!window.API || typeof window.API.call !== 'function') return Promise.resolve([]);
    return window.API.call(action).then(function (r) {
        if (Array.isArray(r)) return r;
        if (r && Array.isArray(r.data)) return r.data;
        return [];
    }).catch(function () { return []; });
}

function carregarDadosDashboard() {
    return Promise.all([
        _chamarApi('getclientes'),
        _chamarApi('getcolaboradores'),
        _chamarApi('getusuarios'),
        _chamarApi('getpedidos'),
        _chamarApi('getfinanceiro'),
        _chamarApi('getrelatorios')
    ]).then(function (results) {
        var masterOn = typeof window.checkMaster === 'function' ? window.checkMaster() : (localStorage.getItem('bot_master_active') === 'true');
        var mensagensCache = (window.AppRDO && Array.isArray(window.AppRDO.mensagensCache)) ? window.AppRDO.mensagensCache : [];

        return {
            clientes: results[0],
            colaboradores: results[1],
            usuarios: results[2],
            pedidos: results[3],
            financeiro: results[4],
            relatorios: results[5],
            mensagens: mensagensCache,
            masterOn: masterOn
        };
    });
}

function renderIndicadorCard(cor, icone, valor, titulo) {
    return '' +
        '<div class="indicador-card indicador-' + cor + '">' +
        '<div class="indicador-icon"><i class="bi ' + icone + '"></i></div>' +
        '<div class="indicador-info">' +
        '<div class="indicador-valor">' + valor + '</div>' +
        '<div class="indicador-label">' + titulo + '</div>' +
        '</div>' +
        '</div>';
}

function renderizarIndicadoresPrincipais(usuario, dados) {
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
        try { valor = cfg.calcular(dados, usuario); } catch (e) { valor = '-'; }
        html += renderIndicadorCard(cfg.cor, cfg.icone, valor, cfg.titulo);
    }
    grid.innerHTML = html;
}

function _statusPedido(p) {
    return String(p.status || p.situacao || '').toUpperCase().trim();
}

function renderizarBlocoChatPedidos(usuario, dados) {
    var bloco = document.getElementById('bloco-chat-pedidos');
    var grid = document.getElementById('dashboard-chat-grid');
    if (!bloco || !grid) return;

    var temChat = usuarioTemPermissao(usuario, 'Chat');
    var temPedidos = usuarioTemPermissao(usuario, 'Pedidos');

    if (!temChat && !temPedidos) {
        bloco.classList.add('d-none');
        return;
    }
    bloco.classList.remove('d-none');

    var html = '';

    if (temChat) {
        var mensagens = dados.mensagens || [];
        var naoLidas = mensagens.filter(function (m) { return m.lida === false || String(m.lida).toUpperCase() === 'FALSE'; }).length;
        var totalConversas = window.AppRDO && Array.isArray(window.AppRDO.clientesCache) ? window.AppRDO.clientesCache.length : 0;

        html += renderIndicadorCard('info', 'bi-envelope-fill', naoLidas, 'Mensagens Não Lidas');
        html += renderIndicadorCard('primary', 'bi-chat-square-text-fill', totalConversas, 'Conversas Ativas');
        html += renderIndicadorCard('warning', 'bi-bell-fill', naoLidas, 'Notificações Pendentes');
    }

    if (temPedidos) {
        var pedidos = dados.pedidos || [];
        var novos = pedidos.filter(function (p) { var s = _statusPedido(p); return s === 'NOVO' || s === 'PENDENTE'; }).length;
        var abertos = pedidos.filter(function (p) { var s = _statusPedido(p); return s === 'ABERTO' || s === 'EM ANDAMENTO' || s === 'ANDAMENTO'; }).length;
        var cancelados = pedidos.filter(function (p) { return _statusPedido(p) === 'CANCELADO'; }).length;
        var concluidos = pedidos.filter(function (p) { var s = _statusPedido(p); return s === 'CONCLUIDO' || s === 'CONCLUÍDO' || s === 'FINALIZADO'; }).length;
        var excluidos = pedidos.filter(function (p) { return _statusPedido(p) === 'EXCLUIDO' || _statusPedido(p) === 'EXCLUÍDO'; }).length;

        html += renderIndicadorCard('success', 'bi-bag-plus-fill', novos, 'Pedidos Novos');
        html += renderIndicadorCard('primary', 'bi-truck', abertos, 'Pedidos Abertos');
        html += renderIndicadorCard('danger', 'bi-x-circle-fill', cancelados, 'Pedidos Cancelados');
        html += renderIndicadorCard('success', 'bi-check-circle-fill', concluidos, 'Pedidos Concluídos');
        html += renderIndicadorCard('secondary', 'bi-trash-fill', excluidos, 'Pedidos Excluídos');
    }

    grid.innerHTML = html;
}

function renderizarBlocoAdministracao(usuario, dados) {
    var bloco = document.getElementById('bloco-administracao');
    var grid = document.getElementById('dashboard-admin-grid');
    if (!bloco || !grid) return;

    if (!usuarioTemPermissao(usuario, 'Administração')) {
        bloco.classList.add('d-none');
        return;
    }
    bloco.classList.remove('d-none');

    var colaboradores = dados.colaboradores || [];
    var clientes = dados.clientes || [];
    var colabAtivos = colaboradores.filter(function (c) { return String(c.status || '').toUpperCase() === 'TRUE'; }).length;
    var colabInativos = colaboradores.length - colabAtivos;
    var clientesAtivos = clientes.filter(function (c) { return String(c.status || '').toUpperCase() === 'TRUE'; }).length;
    var clientesInativos = clientes.length - clientesAtivos;

    var html = '';
    html += renderIndicadorCard('primary', 'bi-person-fill', colaboradores.length, 'Total de Colaboradores');
    html += renderIndicadorCard('success', 'bi-person-check-fill', colabAtivos, 'Colaboradores Ativos');
    html += renderIndicadorCard('secondary', 'bi-person-dash-fill', colabInativos, 'Colaboradores Inativos');
    html += renderIndicadorCard('danger', 'bi-building', clientes.length, 'Total de Clientes');
    html += renderIndicadorCard('success', 'bi-building-check', clientesAtivos, 'Clientes Ativos');
    html += renderIndicadorCard('secondary', 'bi-building-dash', clientesInativos, 'Clientes Inativos');

    grid.innerHTML = html;
}

function _parseValor(v) {
    if (typeof v === 'number') return v;
    var n = parseFloat(String(v || '0').replace(/[^\d,.-]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
}

function _tipoLancamento(f) {
    return String(f.tipo || f.categoria || '').toUpperCase();
}

function renderizarBlocoFinanceiro(usuario, dados) {
    var bloco = document.getElementById('bloco-financeiro');
    var cards = document.getElementById('dashboard-fin-cards');
    if (!bloco || !cards) return;

    if (!usuarioTemPermissao(usuario, 'Financeiro')) {
        bloco.classList.add('d-none');
        return;
    }
    bloco.classList.remove('d-none');

    var financeiro = dados.financeiro || [];
    var receitas = financeiro.filter(function (f) { return _tipoLancamento(f).indexOf('RECEITA') !== -1 || _tipoLancamento(f).indexOf('ENTRADA') !== -1; });
    var despesas = financeiro.filter(function (f) { return _tipoLancamento(f).indexOf('DESPESA') !== -1 || _tipoLancamento(f).indexOf('SAIDA') !== -1 || _tipoLancamento(f).indexOf('SAÍDA') !== -1; });

    var totalReceita = receitas.reduce(function (acc, f) { return acc + _parseValor(f.valor); }, 0);
    var totalDespesa = despesas.reduce(function (acc, f) { return acc + _parseValor(f.valor); }, 0);
    var saldo = totalReceita - totalDespesa;

    var fmt = function (n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };

    var html = '';
    html += renderIndicadorCard('success', 'bi-graph-up-arrow', fmt(totalReceita), 'Total de Receitas');
    html += renderIndicadorCard('danger', 'bi-graph-down-arrow', fmt(totalDespesa), 'Total de Despesas');
    html += renderIndicadorCard(saldo >= 0 ? 'primary' : 'warning', 'bi-piggy-bank-fill', fmt(saldo), 'Saldo Atual');
    html += renderIndicadorCard('secondary', 'bi-receipt', financeiro.length, 'Lançamentos no Período');

    cards.innerHTML = html;

    _renderChartFinanceiroLinha(receitas, despesas);
    _renderChartFinanceiroPizza(receitas.length, despesas.length);
}

function _agruparPorMes(lista) {
    var meses = {};
    var hoje = new Date();
    for (var i = 5; i >= 0; i--) {
        var d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        var chave = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        meses[chave] = { label: chave, total: 0, ref: new Date(d) };
    }
    lista.forEach(function (item) {
        var data = new Date(item.data || item.dataLancamento || Date.now());
        if (isNaN(data.getTime())) return;
        var chave = data.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        if (meses[chave]) meses[chave].total += _parseValor(item.valor);
    });
    return Object.keys(meses).map(function (k) { return meses[k]; });
}

function _renderChartFinanceiroLinha(receitas, despesas) {
    var canvas = document.getElementById('chart-fin-linha');
    if (!canvas || typeof Chart === 'undefined') return;

    var recMensal = _agruparPorMes(receitas);
    var despMensal = _agruparPorMes(despesas);
    var labels = recMensal.map(function (m) { return m.label; });

    if (window.dashboardState.charts.linha) window.dashboardState.charts.linha.destroy();

    window.dashboardState.charts.linha = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Receitas', data: recMensal.map(function (m) { return m.total; }), borderColor: '#198754', backgroundColor: 'rgba(25,135,84,.12)', fill: true, tension: .35 },
                { label: 'Despesas', data: despMensal.map(function (m) { return m.total; }), borderColor: '#dc3545', backgroundColor: 'rgba(220,53,69,.12)', fill: true, tension: .35 }
            ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
}

function _renderChartFinanceiroPizza(qtdReceitas, qtdDespesas) {
    var canvas = document.getElementById('chart-fin-pizza');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.dashboardState.charts.pizza) window.dashboardState.charts.pizza.destroy();

    window.dashboardState.charts.pizza = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{ data: [qtdReceitas, qtdDespesas], backgroundColor: ['#198754', '#dc3545'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderizarBlocoRelatorio(usuario, dados) {
    var bloco = document.getElementById('bloco-relatorio');
    var grid = document.getElementById('dashboard-relatorio-grid');
    if (!bloco || !grid) return;

    if (!usuarioTemPermissao(usuario, 'Relatórios')) {
        bloco.classList.add('d-none');
        return;
    }
    bloco.classList.remove('d-none');

    var relatorios = dados.relatorios || [];
    var pedidos = dados.pedidos || [];

    var html = '';
    html += renderIndicadorCard('secondary', 'bi-file-earmark-text-fill', relatorios.length, 'Relatórios Gerados');
    html += renderIndicadorCard('primary', 'bi-graph-up', pedidos.length, 'Pedidos no Período');
    html += renderIndicadorCard('purple', 'bi-clock-history', _mediaDiariaPedidos(pedidos), 'Média Diária de Pedidos');

    grid.innerHTML = html;

    _renderChartVolumePedidos(pedidos);
}

function _mediaDiariaPedidos(pedidos) {
    if (!pedidos.length) return 0;
    var dias = 7;
    return (pedidos.length / dias).toFixed(1);
}

function _agruparPorDia(pedidos) {
    var dias = [];
    var hoje = new Date();
    for (var i = 6; i >= 0; i--) {
        var d = new Date(hoje);
        d.setDate(hoje.getDate() - i);
        dias.push({ label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), ref: d, total: 0 });
    }
    pedidos.forEach(function (p) {
        var data = new Date(p.data || p.dataCriacao || p.createdAt || Date.now());
        if (isNaN(data.getTime())) return;
        dias.forEach(function (dia) {
            if (data.toDateString() === dia.ref.toDateString()) dia.total++;
        });
    });
    return dias;
}

function _renderChartVolumePedidos(pedidos) {
    var canvas = document.getElementById('chart-relatorio-pedidos');
    if (!canvas || typeof Chart === 'undefined') return;

    var dados = _agruparPorDia(pedidos);

    if (window.dashboardState.charts.pedidos) window.dashboardState.charts.pedidos.destroy();

    window.dashboardState.charts.pedidos = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: dados.map(function (d) { return d.label; }),
            datasets: [{ label: 'Pedidos', data: dados.map(function (d) { return d.total; }), backgroundColor: '#dc3545', borderRadius: 6 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
}

function renderizarDashboardCompleto(usuario, dados) {
    renderizarIndicadoresPrincipais(usuario, dados);
    renderizarBlocoChatPedidos(usuario, dados);
    renderizarBlocoAdministracao(usuario, dados);
    renderizarBlocoFinanceiro(usuario, dados);
    renderizarBlocoRelatorio(usuario, dados);
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
            renderizarDashboardCompleto(usuario, dados);
        })
        .finally(function () {
            window.dashboardState.isFetching = false;
            syncStopDashboard();
        });
};

window.addEventListener('masterStatusChanged', function () {
    if (window.dashboardState.dados) {
        window.dashboardState.dados.masterOn = typeof window.checkMaster === 'function' ? window.checkMaster() : window.dashboardState.dados.masterOn;
        renderizarDashboardCompleto(window.dashboardState.usuario, window.dashboardState.dados);
    }
});

function renderIndicadores(containerId, lista) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    if (!lista || lista.length === 0) {
        grid.innerHTML = '';
        return;
    }

    grid.innerHTML = lista.map(item => `
        <div class="indicador-card indicador-${item.cor}">
            <div class="indicador-icon">
                <i class="bi ${item.icone}"></i>
            </div>
            <div class="indicador-info">
                <span class="indicador-valor">${item.valor}</span>
                <span class="indicador-label">${item.label}</span>
            </div>
        </div>
    `).join('');
}
