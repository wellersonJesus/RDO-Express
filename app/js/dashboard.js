window.dashboardState = window.dashboardState || {
    dados: null,
    usuario: null,
    isFetching: false,
    heartbeatIntervalId: null,
    charts: {}
};

function ocultarLoadingDashboard() {
    var overlay = document.getElementById('dashboard-loading-overlay');
    var conteudo = document.getElementById('dashboard-conteudo-real');
    if (overlay) overlay.classList.add('d-none');
    if (conteudo) conteudo.style.display = '';
}

function mostrarLoadingDashboard() {
    var overlay = document.getElementById('dashboard-loading-overlay');
    var conteudo = document.getElementById('dashboard-conteudo-real');
    if (overlay) overlay.classList.remove('d-none');
    if (conteudo) conteudo.style.display = 'none';
}

function _calcularUsuariosOnline(usuarios) {
    var agora = Date.now();
    var temCampoPresenca = usuarios.some(function (u) {
        return u.ultimo_acesso || u.ultimoAcesso || u.lastActivity || u.online !== undefined;
    });

    if (!temCampoPresenca) return null;

    return usuarios.filter(function (u) {
        if (u.online !== undefined) {
            return u.online === true || u.online === 'TRUE' || u.online === 1;
        }
        var raw = u.ultimo_acesso || u.ultimoAcesso || u.lastActivity;
        var ts = new Date(raw).getTime();
        if (isNaN(ts)) return false;
        return (agora - ts) / 60000 <= LIMITE_MINUTOS_ONLINE;
    }).length;
}

function _calcularUsuariosAtivos(usuarios) {
    return usuarios.filter(function (u) {
        return String(u.status || '').toUpperCase() === 'TRUE';
    }).length;
}

function renderizarBlocoAutomacao() {
    var clientes = _obterListaAPI('clientes', 'clientes');
    var usuarios = _obterListaAPI('usuarios', 'usuarios');

    var totalClientesAutomacao = clientes.filter(function (c) {
        return String(c.status || '').toUpperCase() === 'TRUE';
    }).length;

    var totalUsuariosCadastrados = usuarios.length;
    var botAtivo = typeof window.checkMaster === 'function' ? window.checkMaster() : false;

    function montarDOM(totalOnline) {
        _atualizarDOMAutomacao({
            totalClientesAutomacao: totalClientesAutomacao,
            totalUsuariosCadastrados: totalUsuariosCadastrados,
            totalUsuariosOnline: totalOnline,
            botAtivo: botAtivo
        });
    }

    if (!window.API || typeof window.API.call !== 'function') {
        montarDOM(null);
        return;
    }

    window.API.call('getusuariosonline')
        .then(function (resp) {
            var totalOnline = (resp && resp.status === 'success' && typeof resp.total === 'number') ? resp.total : null;
            montarDOM(totalOnline);
        })
        .catch(function () { montarDOM(null); });
}

function _atualizarDOMAutomacao(dados) {
    var elClientes = document.getElementById('automacao-total-clientes');
    var elCadastrados = document.getElementById('automacao-usuarios-cadastrados');
    var elOnline = document.getElementById('automacao-usuarios-logados');
    var icone = document.getElementById('automacao-icone-bot');
    var statusEl = document.getElementById('automacao-status-bot');
    var descEl = document.getElementById('automacao-status-desc');

    if (elClientes) elClientes.textContent = dados.totalClientesAutomacao;
    if (elCadastrados) elCadastrados.textContent = dados.totalUsuariosCadastrados;

    if (elOnline) {
        if (dados.totalUsuariosOnline === null) {
            elOnline.textContent = '—';
            elOnline.title = 'Sem dado de presença disponível na API';
        } else {
            elOnline.textContent = dados.totalUsuariosOnline;
            elOnline.removeAttribute('title');
        }
    }

    _aplicarStatusBot(icone, statusEl, descEl, dados.botAtivo);
}

function renderizarBlocoVisaoGeral() {
    var clientes = _obterListaAPI('clientes', 'clientes');
    var usuarios = _obterListaAPI('usuarios', 'usuarios');

    var totalClientesAutomacao = clientes.filter(function (c) {
        return String(c.status || '').toUpperCase() === 'TRUE';
    }).length;

    var totalUsuariosCadastrados = usuarios.length;
    var totalUsuariosAtivos = _calcularUsuariosAtivos(usuarios);
    var botAtivo = typeof window.checkMaster === 'function' ? window.checkMaster() : false;

    _atualizarDOMVisaoGeral({
        totalClientesAutomacao: totalClientesAutomacao,
        totalUsuariosCadastrados: totalUsuariosCadastrados,
        totalUsuariosAtivos: totalUsuariosAtivos,
        botAtivo: botAtivo
    });

    renderHBars('dashboard-visao-geral-hbars', indicadoresVisaoGeral);
}

function _atualizarDOMVisaoGeral(dados) {
    var elClientes = document.getElementById('visao-geral-total-clientes');
    var elCadastrados = document.getElementById('visao-geral-usuarios-cadastrados');
    var elAtivos = document.getElementById('visao-geral-usuarios-ativos');
    var icone = document.getElementById('visao-geral-icone-bot');
    var statusEl = document.getElementById('visao-geral-status-bot');
    var descEl = document.getElementById('visao-geral-status-desc');

    if (elClientes) elClientes.textContent = dados.totalClientesAutomacao;
    if (elCadastrados) elCadastrados.textContent = dados.totalUsuariosCadastrados;
    if (elAtivos) elAtivos.textContent = dados.totalUsuariosAtivos;

    _aplicarStatusBot(icone, statusEl, descEl, dados.botAtivo);
}

function renderizarBlocoGestao() {
    var usuarios = _obterListaAPI('usuarios', 'usuarios');
    var totalUsuariosCadastrados = usuarios.length;
    var totalUsuariosAtivos = _calcularUsuariosAtivos(usuarios);
    var botAtivo = typeof window.checkMaster === 'function' ? window.checkMaster() : false;

    if (!window.API || typeof window.API.call !== 'function') {
        _atualizarDOMGestao({
            totalUsuariosCadastrados: totalUsuariosCadastrados,
            totalUsuariosAtivos: totalUsuariosAtivos,
            totalUsuariosOnline: null,
            botAtivo: botAtivo
        });
        return;
    }

    window.API.call('getusuariosonline')
        .then(function (resp) {
            var totalOnline = (resp && resp.status === 'success' && typeof resp.total === 'number')
                ? resp.total
                : null;

            _atualizarDOMGestao({
                totalUsuariosCadastrados: totalUsuariosCadastrados,
                totalUsuariosAtivos: totalUsuariosAtivos,
                totalUsuariosOnline: totalOnline,
                botAtivo: botAtivo
            });
        })
        .catch(function () {
            _atualizarDOMGestao({
                totalUsuariosCadastrados: totalUsuariosCadastrados,
                totalUsuariosAtivos: totalUsuariosAtivos,
                totalUsuariosOnline: null,
                botAtivo: botAtivo
            });
        });
}

function _atualizarDOMGestao(dados) {
    var elAtivos = document.getElementById('visao-geral-usuarios-ativos');
    var elLogados = document.getElementById('visao-geral-usuarios-logados');

    if (elAtivos) elAtivos.textContent = dados.totalUsuariosAtivos;

    if (elLogados) {
        if (dados.totalUsuariosOnline === null) {
            elLogados.textContent = '—/' + dados.totalUsuariosCadastrados;
            elLogados.title = 'Sem dado de presença disponível na API (heartbeat não configurado)';
        } else {
            elLogados.textContent = dados.totalUsuariosOnline + '/' + dados.totalUsuariosCadastrados;
            elLogados.removeAttribute('title');
        }
    }
}

function _aplicarStatusBot(icone, statusEl, descEl, botAtivo) {
    if (!icone || !statusEl || !descEl) return;
    if (botAtivo) {
        icone.classList.remove('is-inactive');
        statusEl.classList.remove('is-inactive');
        statusEl.textContent = 'Ativo';
        descEl.textContent = 'Bot em execução normal';
    } else {
        icone.classList.add('is-inactive');
        statusEl.classList.add('is-inactive');
        statusEl.textContent = 'Inativo';
        descEl.textContent = 'Bot desativado no momento';
    }
}

var indicadoresChatPedidos = [
    { id: 'pedidos-hoje', cor: 'danger', icone: 'bi-bag-check-fill', valor: 34, max: 60, label: 'Pedidos Hoje' },
    { id: 'pedidos-pendentes', cor: 'warning', icone: 'bi-hourglass-split', valor: 8, max: 60, label: 'Pedidos Pendentes' },
    { id: 'chats-abertos', cor: 'info', icone: 'bi-chat-left-text-fill', valor: 21, max: 50, label: 'Chats Abertos' },
    { id: 'chats-encerrados', cor: 'secondary', icone: 'bi-chat-square-dots-fill', valor: 47, max: 50, label: 'Chats Encerrados' },
    { id: 'tempo-medio-resposta', cor: 'dark', icone: 'bi-stopwatch-fill', valor: '2m 10s', max: 100, valorReal: 65, label: 'Tempo Médio de Resposta' }
];

var indicadoresVisaoGeral = [
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
            setTimeout(function () { fill.style.width = '100%'; }, index * 90);
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

        requestAnimationFrame(function () { preenchimento.style.width = percentual + '%'; });
    });
}

function renderizarBlocoChatPedidos(usuario, dados) {
    var bloco = document.getElementById('bloco-chat-pedidos');
    if (!bloco) return;
    bloco.classList.remove('d-none');

    dados = dados || window.dashboardState.dados || {};

    var ranking = calcularTopClientesPedidos(dados, 5, 30);
    renderizarRankingClientes('dashboard-chat-pedidos-ranking', ranking);
}

function renderizarBlocoAdministracao(usuario, dados) {
    var bloco = document.getElementById('bloco-administracao');
    if (!bloco) return;

    var totalPedidos = (dados.pedidos || []).length;
    var metaPedidos = dados.metaPedidosMes || 0;
    var percentual = metaPedidos > 0 ? Math.round((totalPedidos / metaPedidos) * 100) : 0;

    var elTotalPedidos = document.getElementById('admin-total-pedidos');
    var elMetaInfo = document.getElementById('admin-meta-info');
    if (elTotalPedidos) elTotalPedidos.textContent = totalPedidos;
    if (elMetaInfo) elMetaInfo.textContent =
        'Meta (Todas as vendas) - ' + (usuario.username || 'Usuário') + ': ' +
        metaPedidos + ' pedidos (' + percentual + '%)';

    var totalAtividades = (dados.atividades || []).length;
    var proximaData = dados.proximaAtividadeData ? new Date(dados.proximaAtividadeData) : null;
    var jaPassou = proximaData ? proximaData < new Date() : false;

    var elAtivStatus = document.getElementById('admin-atividade-status');
    var elTotalAtiv = document.getElementById('admin-total-atividades');
    var elMetaAtiv = document.getElementById('admin-meta-atividades');

    if (elAtivStatus) elAtivStatus.textContent = jaPassou ? 'A próxima data de atividade já passou' : 'Nenhuma atividade pendente';
    if (elTotalAtiv) elTotalAtiv.textContent = totalAtividades;
    if (elMetaAtiv) elMetaAtiv.textContent = dados.metaAtividades || 0;
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
        data: { labels: ['Receitas', 'Despesas'], datasets: [{ data: [qtdReceitas, qtdDespesas], backgroundColor: ['#198754', '#dc3545'] }] },
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
    return (pedidos.length / 7).toFixed(1);
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

function _obterNomeCliente(pedido, dados) {
    var cliente = (dados.clientes || []).find(function (c) {
        return String(c.id) === String(pedido.id_cliente);
    });
    if (cliente && cliente.nome) return cliente.nome;
    return pedido.solicitante || 'Cliente não identificado';
}

function calcularTopClientesPedidos(dados, limite, diasJanela) {
    var pedidos = dados.pedidos || [];
    var janela = diasJanela || 30;

    var limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - janela);

    // Filtra apenas pedidos dos últimos N dias
    var pedidosFiltrados = pedidos.filter(function (p) {
        var dataPedido = new Date(p.data);
        if (isNaN(dataPedido.getTime())) return false;
        return dataPedido >= limiteData;
    });

    // Agrupa por id_cliente (chave estável), mantendo o nome de exibição
    var contagem = {};
    pedidosFiltrados.forEach(function (p) {
        var chave = p.id_cliente || p.solicitante || 'desconhecido';
        var nome = _obterNomeCliente(p, dados);

        if (!contagem[chave]) {
            contagem[chave] = { nome: nome, total: 0 };
        }
        contagem[chave].total++;
    });

    var ranking = Object.keys(contagem).map(function (chave) {
        return contagem[chave];
    }).sort(function (a, b) { return b.total - a.total; });

    return ranking.slice(0, limite || 5);
}

function iniciarHeartbeat() {
    var username = localStorage.getItem('username');
    if (!username || !window.API) return;

    if (window.dashboardState.heartbeatIntervalId) {
        clearInterval(window.dashboardState.heartbeatIntervalId);
    }

    function enviar() {
        window.API.call('heartbeat', { username: username }).catch(function () { });
        renderizarBlocoGestao(); // só isso é necessário para o "1/2"
    }

    enviar();
    window.dashboardState.heartbeatIntervalId = setInterval(enviar, 60000);
}

function _corPorIndice(i) {
    var cores = ['primary', 'info', 'warning', 'success', 'secondary'];
    return cores[i % cores.length];
}

function _iniciais(nome) {
    var partes = String(nome || '').trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
}

function renderizarRankingClientes(containerId, ranking) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    ranking.forEach(function (item, index) {
        var cor = _corPorIndice(index);

        var linha = document.createElement('div');
        linha.className = 'ranking-item';

        var esquerda = document.createElement('div');
        esquerda.className = 'ranking-item-left';

        var avatar = document.createElement('div');
        avatar.className = 'ranking-avatar indicador-' + cor;
        avatar.textContent = _iniciais(item.nome);

        var nomeSpan = document.createElement('span');
        nomeSpan.className = 'ranking-name';
        nomeSpan.textContent = item.nome;

        esquerda.appendChild(avatar);
        esquerda.appendChild(nomeSpan);

        var valorSpan = document.createElement('span');
        valorSpan.className = 'ranking-value';
        valorSpan.textContent = item.total + (item.total === 1 ? ' pedido' : ' pedidos');

        linha.appendChild(esquerda);
        linha.appendChild(valorSpan);
        container.appendChild(linha);
    });
}

function _obterListaAPI(chave, origem) {
    var dados = window.dashboardState.dados;
    if (dados && Array.isArray(dados[chave]) && dados[chave].length > 0) {
        return dados[chave];
    }
    var cacheCompleto = (window.botState && window.botState.cacheCompleto) || [];
    return cacheCompleto.filter(function (item) { return item.origem === origem; });
}

function renderizarDashboardCompleto(usuario, dados) {
    renderizarBlocoChatPedidos(usuario, dados);
    renderizarBlocoVisaoGeral();
    renderizarBlocoGestao();
    renderizarBlocoAutomacao();
    renderizarBlocoAdministracao(usuario, dados);
    renderizarBlocoFinanceiro(usuario, dados);
    renderizarBlocoRelatorio(usuario, dados);
    renderBars('dashboard-chat-pedidos-ranking-bars', indicadoresChatPedidos);
}

window.addEventListener('botCacheAtualizado', function () {
    renderizarBlocoGestao();
    renderizarBlocoVisaoGeral();
    renderizarBlocoAutomacao();
});

window.addEventListener('masterStatusChanged', function () {
    renderizarBlocoGestao();
    renderizarBlocoVisaoGeral();
    renderizarBlocoAutomacao();

    if (window.dashboardState.dados) {
        window.dashboardState.dados.masterOn = typeof window.checkMaster === 'function'
            ? window.checkMaster()
            : window.dashboardState.dados.masterOn;
    }
});

window.initDashboard = function () {
    if (window.dashboardState.isFetching) return Promise.resolve();
    window.dashboardState.isFetching = true;

    mostrarLoadingDashboard(); // 👈 exibe loading antes de tudo

    var usuario = obterUsuarioLogado();
    window.dashboardState.usuario = usuario;
    atualizarHeaderUsuario(usuario);
    syncStartDashboard();

    iniciarHeartbeat();

    var btnRefresh = document.getElementById('btn-refresh-dashboard');
    if (btnRefresh) btnRefresh.onclick = function () { window.initDashboard(); };

    return carregarDadosDashboard()
        .then(function (dados) {
            window.dashboardState.dados = dados;
            renderizarDashboardCompleto(usuario, dados);
        })
        .catch(function (erro) {
            console.error('Erro ao carregar dashboard:', erro);
        })
        .finally(function () {
            window.dashboardState.isFetching = false;
            syncStopDashboard();
            ocultarLoadingDashboard(); // 👈 só esconde quando tudo (dados + render) terminar
        });
};

function _abreviarLabel(titulo) {
    var palavras = String(titulo || '').trim().split(/\s+/);
    if (palavras.length === 1) return palavras[0].slice(0, 8);
    return palavras[0].slice(0, 6) + '. ' + palavras.slice(1).map(function (p) { return p.slice(0, 3) + '.'; }).join(' ');
}
