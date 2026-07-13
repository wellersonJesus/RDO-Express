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

const indicadoresDestaque = [
    { id: 'usuarios-sistema', cor: 'primary', icone: 'bi-people-fill', valor: 12, label: 'Usuários do Sistema' },
    { id: 'bot-ativo', cor: 'success', icone: 'bi-robot', valor: 'Online', label: 'Bot Ativo' }
];

const indicadoresChatPedidos = [
    { id: 'pedidos-hoje', cor: 'danger', icone: 'bi-bag-check-fill', valor: 34, max: 60, label: 'Pedidos Hoje' },
    { id: 'pedidos-pendentes', cor: 'warning', icone: 'bi-hourglass-split', valor: 8, max: 60, label: 'Pedidos Pendentes' },
    { id: 'chats-abertos', cor: 'info', icone: 'bi-chat-left-text-fill', valor: 21, max: 50, label: 'Chats Abertos' },
    { id: 'chats-encerrados', cor: 'secondary', icone: 'bi-chat-square-dots-fill', valor: 47, max: 50, label: 'Chats Encerrados' },
    { id: 'tempo-medio-resposta', cor: 'dark', icone: 'bi-stopwatch-fill', valor: '2m 10s', max: 100, valorReal: 65, label: 'Tempo Médio de Resposta' }
];

const indicadoresVisaoGeral = [
    { id: 'clientes-ativos', cor: 'success', icone: 'bi-person-check-fill', valor: 128, max: 200, label: 'Clientes Ativos' },
    { id: 'clientes-inativos', cor: 'secondary', icone: 'bi-person-dash-fill', valor: 72, max: 200, label: 'Clientes Inativos' },
    { id: 'faturamento-mensal', cor: 'purple', icone: 'bi-cash-coin', valor: 'R$ 18.450', max: 100, valorReal: 82, label: 'Faturamento Mensal' },
    { id: 'ticket-medio', cor: 'primary', icone: 'bi-receipt', valor: 'R$ 56,30', max: 100, valorReal: 58, label: 'Ticket Médio' },
    { id: 'taxa-conversao', cor: 'danger', icone: 'bi-graph-up-arrow', valor: '38%', max: 100, valorReal: 38, label: 'Taxa de Conversão' }
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
    var abreviado = _abreviarLabel(titulo);
    return '' +
        '<div class="indicador-card indicador-' + cor + '">' +
        '<div class="indicador-icon"><i class="bi ' + icone + '"></i></div>' +
        '<div class="indicador-info">' +
        '<div class="indicador-valor">' + valor + '</div>' +
        '<div class="indicador-label">' + abreviado + '</div>' +
        '</div>' +
        '<span class="indicador-tooltip">' + titulo + '</span>' +
        '</div>';
}

function renderHighlight(lista) {
    var container = document.getElementById('highlight-indicadores');
    if (!container) return;
    container.innerHTML = lista.map(function (item) {
        return '' +
            '<div class="highlight-card indicador-' + item.cor + '">' +
            '<div class="indicador-icon"><i class="bi ' + item.icone + '"></i></div>' +
            '<div class="indicador-info">' +
            '<span class="indicador-valor">' + item.valor + '</span>' +
            '<span class="highlight-label">' + item.label + '</span>' +
            '</div>' +
            '</div>';
    }).join('');
}

function calcularPercentual(item) {
    var base = item.valorReal !== undefined ? item.valorReal : item.valor;
    var max = item.max || 100;
    var percentual = Math.min(100, Math.round((Number(base) / max) * 100));
    return isNaN(percentual) ? 0 : percentual;
}

function renderBars(containerId, lista) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = lista.map(function (item) {
        var percentual = calcularPercentual(item);
        return '' +
            '<div class="bar-item indicador-' + item.cor + '" data-percentual="' + percentual + '">' +
            '<div class="bar-item-icon"><i class="bi ' + item.icone + '"></i></div>' +
            '<div class="bar-item-body">' +
            '<div class="bar-item-top">' +
            '<span class="bar-item-label">' + item.label + '</span>' +
            '<span class="bar-item-valor">' + item.valor + '</span>' +
            '</div>' +
            '<div class="bar-track"><div class="bar-fill"></div></div>' +
            '</div>' +
            '<span class="bar-tooltip">' + item.valor + ' • ' + percentual + '% comparativo</span>' +
            '</div>';
    }).join('');

    requestAnimationFrame(function () {
        container.querySelectorAll('.bar-item').forEach(function (el, index) {
            var fill = el.querySelector('.bar-fill');
            setTimeout(function () {
                fill.style.width = '100%';
            }, index * 90);
        });
    });
}

function renderHBars(containerId, lista) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    var maxValor = Math.max.apply(null, lista.map(function (item) {
        return item.valorReal !== undefined ? item.valorReal : Number(item.valor) || 0;
    }));

    lista.forEach(function (item) {
        var base = item.valorReal !== undefined ? item.valorReal : (Number(item.valor) || 0);
        var percentual = maxValor > 0 ? (base / maxValor) * 100 : 0;

        var linha = document.createElement('div');
        linha.className = 'hbar-item';

        var label = document.createElement('span');
        label.className = 'hbar-label';
        label.textContent = item.label;

        var trilho = document.createElement('div');
        trilho.className = 'hbar-track';

        var preenchimento = document.createElement('div');
        preenchimento.className = 'hbar-fill';

        var valor = document.createElement('span');
        valor.className = 'hbar-value';
        valor.textContent = item.valor;

        preenchimento.appendChild(valor);
        trilho.appendChild(preenchimento);
        linha.appendChild(label);
        linha.appendChild(trilho);
        container.appendChild(linha);

        requestAnimationFrame(function () {
            preenchimento.style.width = percentual + '%';
        });
    });
}

function renderizarBlocoChatPedidos(usuario, dados) {
    var bloco = document.getElementById('bloco-chat-pedidos');
    if (!bloco) return;
    bloco.classList.remove('d-none');
    renderBars('dashboard-chat-pedidos-ranking', indicadoresChatPedidos);
}

function renderizarBlocoVisaoGeral(usuario, dados) {
    var bloco = document.getElementById('bloco-visao-geral');
    if (!bloco) return;
    bloco.classList.remove('d-none');
    renderHBars('dashboard-visao-geral-hbars', indicadoresVisaoGeral);
}

function renderizarBlocoAdministracao(usuario, dados) {
    var bloco = document.getElementById('bloco-administracao');
    var legendEl = document.getElementById('dashboard-admin-legend');
    var canvas = document.getElementById('chart-admin-bars');
    if (!bloco || !canvas) return;

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

    var dadosGrafico = [
        { label: 'Colab. Ativos', valor: colabAtivos, cor: '#198754' },
        { label: 'Colab. Inativos', valor: colabInativos, cor: '#6c757d' },
        { label: 'Clientes Ativos', valor: clientesAtivos, cor: '#0aa8c7' },
        { label: 'Clientes Inativos', valor: clientesInativos, cor: '#dc3545' }
    ];

    legendEl.innerHTML = dadosGrafico.map(function (d) {
        return (
            '<div class="admin-legend-item">' +
                '<span class="admin-legend-dot" style="background:' + d.cor + '"></span>' +
                d.label +
            '</div>'
        );
    }).join('');

    if (window.chartAdminBarsInstance) {
        window.chartAdminBarsInstance.destroy();
    }

    window.chartAdminBarsInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: dadosGrafico.map(function (d) { return d.label; }),
            datasets: [{
                data: dadosGrafico.map(function (d) { return d.valor; }),
                backgroundColor: dadosGrafico.map(function (d) { return d.cor; }),
                borderRadius: 6,
                maxBarThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { display: false } },
                y: { display: false, beginAtZero: true }
            }
        }
    });
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
    renderHighlight(indicadoresDestaque);
    renderizarBlocoChatPedidos(usuario, dados);
    renderizarBlocoVisaoGeral(usuario, dados);
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

function _abreviarLabel(titulo) {
    var palavras = String(titulo || '').trim().split(/\s+/);
    if (palavras.length === 1) return palavras[0].slice(0, 8);
    return palavras[0].slice(0, 6) + '. ' + palavras.slice(1).map(function (p) { return p.slice(0, 3) + '.'; }).join(' ');
}
