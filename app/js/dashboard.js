window.dashboardState = window.dashboardState || {
    dados: null,
    usuario: null,
    isFetching: false,
    heartbeatIntervalId: null,
    charts: {}
};

var LIMITE_MINUTOS_ONLINE = 2;

function ocultarLoadingDashboard() {
    var overlay = document.getElementById('dashboard-loading-overlay');
    var conteudo = document.getElementById('dashboard-conteudo-real');
    if (overlay) overlay.classList.add('d-none');
    if (conteudo) conteudo.style.display = 'block';
}

function mostrarLoadingDashboard() {
    var overlay = document.getElementById('dashboard-loading-overlay');
    var conteudo = document.getElementById('dashboard-conteudo-real');
    if (overlay) overlay.classList.remove('d-none');
    if (conteudo) conteudo.style.display = 'none';
}

function _exibirErroDashboard() {
    var overlay = document.getElementById('dashboard-loading-overlay');
    var conteudo = document.getElementById('dashboard-conteudo-real');
    if (overlay) {
        overlay.classList.remove('d-none');
        overlay.innerHTML = '<div class="text-center py-5" style="color:#c00;"><i class="bi bi-exclamation-triangle-fill" style="font-size:2rem;"></i><p class="mt-2">Não foi possível carregar os dados do dashboard. Tente novamente em instantes.</p></div>';
    }
    if (conteudo) conteudo.style.display = 'none';
}

function _parseDataBR(str) {
    if (!str) return new Date(NaN);
    if (str instanceof Date) return str;
    var texto = String(str).trim();
    var m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
        var ano = m[3].length === 2 ? '20' + m[3] : m[3];
        return new Date(Number(ano), Number(m[2]) - 1, Number(m[1]));
    }
    var iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    var d = new Date(texto);
    return d;
}

function _parseValor(v) {
    if (typeof v === 'number') return v;
    var n = parseFloat(String(v || '0').replace(/[^\d,.-]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
}

function _tipoLancamento(f) {
    return String(f.tipo || f.categoria || '').toUpperCase();
}

function _normalizarCargo(cargo) {
    if (!window.PERMISSOES_PADRAO) return cargo;
    var chaves = Object.keys(window.PERMISSOES_PADRAO);
    for (var i = 0; i < chaves.length; i++) {
        if (chaves[i].toLowerCase() === String(cargo || '').toLowerCase()) return chaves[i];
    }
    return cargo;
}

function obterUsuarioLogado() {
    var username = localStorage.getItem('username') || 'Usuário';
    var cargo = localStorage.getItem('tipo') || '';
    var idUsuario = localStorage.getItem('id_usuario') || localStorage.getItem('userId') || '';
    var cargoNormalizado = _normalizarCargo(cargo);
    var permissoes = [];

    try {
        if (idUsuario) {
            var storedPerms = localStorage.getItem('permissoes_usuario_' + idUsuario);
            if (storedPerms) {
                var parsed = JSON.parse(storedPerms);
                if (Array.isArray(parsed) && parsed.length > 0) permissoes = parsed;
            }
        }
    } catch (e) {
        permissoes = [];
    }

    if (!Array.isArray(permissoes) || permissoes.length === 0) {
        if (window.PERMISSOES_PADRAO && window.PERMISSOES_PADRAO[cargoNormalizado]) {
            permissoes = window.PERMISSOES_PADRAO[cargoNormalizado];
        }
    }

    if (!Array.isArray(permissoes)) {
        permissoes = [];
    }

    return { username: username, cargo: cargo, permissoes: permissoes };
}

function usuarioTemPermissao(usuario, permissao) {
    return usuario.permissoes.indexOf(permissao) !== -1;
}

var MAPA_BLOCO_PERMISSOES = {
    'bloco-visao-geral': ['Dashboard'],
    'bloco-automacao': ['Administração', 'Bot'],
    'bloco-chat-pedidos': ['Chat', 'Pedidos'],
    'bloco-administracao': ['Administração'],
    'bloco-financeiro': ['Financeiro'],
    'bloco-relatorio': ['Relatórios']
};

function usuarioTemAcessoBloco(usuario, permissoesRequeridas, modoOu) {
    if (!Array.isArray(permissoesRequeridas) || permissoesRequeridas.length === 0) return true;
    if (modoOu) {
        return permissoesRequeridas.some(function (p) { return usuarioTemPermissao(usuario, p); });
    }
    return permissoesRequeridas.every(function (p) { return usuarioTemPermissao(usuario, p); });
}

function _aplicarVisibilidadeBloco(blocoId, usuario, modoOu) {
    var bloco = document.getElementById(blocoId);
    if (!bloco) return false;

    var permissoesRequeridas = MAPA_BLOCO_PERMISSOES[blocoId] || [];
    var temAcesso = usuarioTemAcessoBloco(usuario, permissoesRequeridas, modoOu);

    bloco.classList.toggle('d-none', !temAcesso);
    return temAcesso;
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

function carregarDadosDashboard(forcar) {
    var agora = Date.now();
    var cacheValido = window.dashboardState.dados &&
        window.dashboardState._ultimaBusca &&
        (agora - window.dashboardState._ultimaBusca < 60000);

    if (cacheValido && !forcar) {
        return Promise.resolve(window.dashboardState.dados);
    }

    if (!window.API || typeof window.API.call !== 'function') {
        return Promise.reject(new Error('API indisponível'));
    }

    return window.API.call('getdashboarddata').then(function (resp) {
        window.dashboardState._ultimaBusca = Date.now();
        var d = (resp && resp.data) || {};
        var masterOn = typeof window.checkMaster === 'function'
            ? window.checkMaster()
            : (localStorage.getItem('bot_master_active') === 'true');
        var mensagensCache = (window.AppRDO && Array.isArray(window.AppRDO.mensagensCache))
            ? window.AppRDO.mensagensCache : [];

        return {
            clientes: d.clientes || [],
            colaboradores: d.colaboradores || [],
            usuarios: d.usuarios || [],
            pedidos: d.pedidos || [],
            financeiro: d.financeiro || [],
            relatorios: d.relatorios || [],
            mensagens: mensagensCache,
            masterOn: masterOn
        };
    }).catch(function (erro) {
        if (window.dashboardState.dados) return window.dashboardState.dados;
        throw erro;
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

function _calcularUsuariosAtivos(usuarios) {
    return usuarios.filter(function (u) {
        return String(u.status || '').toUpperCase() === 'TRUE';
    }).length;
}

function _abreviarLabel(titulo) {
    var palavras = String(titulo || '').trim().split(/\s+/);
    if (palavras.length === 1) return palavras[0].slice(0, 8);
    return palavras[0].slice(0, 6) + '. ' + palavras.slice(1).map(function (p) { return p.slice(0, 3) + '.'; }).join(' ');
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
            if (!fill) return;
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
    }).concat(1));

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

function renderizarBlocoAutomacao() {
    var usuarios = _obterListaAPI('usuarios', 'usuarios');
    var totalUsuariosAtivos = _calcularUsuariosAtivos(usuarios);
    var totalUsuariosCadastrados = usuarios.length;
    var botAtivo = typeof window.checkMaster === 'function' ? window.checkMaster() : false;

    var icone = document.getElementById('automacao-icone-bot');
    var statusEl = document.getElementById('automacao-status-bot');
    var descEl = document.getElementById('automacao-status-desc');
    _aplicarStatusBot(icone, statusEl, descEl, botAtivo);

    var elAtivos = document.getElementById('visao-geral-usuarios-ativos');
    var elLogados = document.getElementById('visao-geral-usuarios-logados');
    if (elAtivos) elAtivos.textContent = totalUsuariosAtivos;

    if (!window.API || typeof window.API.call !== 'function') {
        if (elLogados) elLogados.textContent = '—/' + totalUsuariosCadastrados;
        return;
    }

    window.API.call('getusuariosonline')
        .then(function (resp) {
            var totalOnline = (resp && resp.status === 'success' && typeof resp.total === 'number') ? resp.total : null;
            if (elLogados) {
                if (totalOnline === null) {
                    elLogados.textContent = '—/' + totalUsuariosCadastrados;
                    elLogados.title = 'Sem dado de presença disponível na API';
                } else {
                    elLogados.textContent = totalOnline + '/' + totalUsuariosCadastrados;
                    elLogados.removeAttribute('title');
                }
            }
        })
        .catch(function () {
            if (elLogados) elLogados.textContent = '—/' + totalUsuariosCadastrados;
        });
}

function _construirIndicadoresVisaoGeral(dados) {
    var clientes = dados.clientes || [];
    var financeiro = dados.financeiro || [];

    var clientesAtivos = clientes.filter(function (c) {
        return String(c.status || '').toUpperCase() === 'TRUE';
    }).length;
    var clientesInativos = clientes.length - clientesAtivos;

    var receitas = financeiro.filter(function (f) {
        return _tipoLancamento(f).indexOf('RECEITA') !== -1 || _tipoLancamento(f).indexOf('ENTRADA') !== -1;
    });
    var faturamentoTotal = receitas.reduce(function (acc, f) { return acc + _parseValor(f.valor); }, 0);
    var ticketMedio = receitas.length > 0 ? faturamentoTotal / receitas.length : 0;

    var pedidos = dados.pedidos || [];
    var totalPedidos = pedidos.length;
    var pedidosFinalizados = pedidos.filter(function (p) {
        return String(p.status || '').toUpperCase() === 'FINALIZADO' || String(p.status || '').toUpperCase() === 'CONCLUIDO';
    }).length;
    var taxaConversao = totalPedidos > 0 ? Math.round((pedidosFinalizados / totalPedidos) * 100) : 0;

    var fmt = function (n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };

    return [
        { id: 'clientes-ativos', cor: 'success', icone: 'bi-person-check-fill', valor: clientesAtivos, max: Math.max(clientes.length, 1), label: 'Clientes Ativos' },
        { id: 'clientes-inativos', cor: 'secondary', icone: 'bi-person-dash-fill', valor: clientesInativos, max: Math.max(clientes.length, 1), label: 'Clientes Inativos' },
        { id: 'faturamento-mensal', cor: 'purple', icone: 'bi-cash-coin', valor: fmt(faturamentoTotal), max: 100, valorReal: Math.min(100, Math.round(faturamentoTotal / 1000)), label: 'Faturamento Mensal' },
        { id: 'ticket-medio', cor: 'primary', icone: 'bi-receipt', valor: fmt(ticketMedio), max: 100, valorReal: Math.min(100, Math.round(ticketMedio)), label: 'Ticket Médio' },
        { id: 'taxa-conversao', cor: 'danger', icone: 'bi-graph-up-arrow', valor: taxaConversao + '%', max: 100, valorReal: taxaConversao, label: 'Taxa de Conversão' }
    ];
}

function renderizarBlocoVisaoGeral() {
    var usuario = window.dashboardState.usuario || obterUsuarioLogado();
    if (!_aplicarVisibilidadeBloco('bloco-visao-geral', usuario)) return;

    var dados = window.dashboardState.dados || { clientes: [], financeiro: [], pedidos: [] };
    var indicadores = _construirIndicadoresVisaoGeral(dados);
    renderHBars('dashboard-visao-geral-hbars', indicadores);
}

function renderizarBlocoGestao() {
    var usuario = window.dashboardState.usuario || obterUsuarioLogado();
    if (!_aplicarVisibilidadeBloco('bloco-automacao', usuario, true)) return;
    renderizarBlocoAutomacao();
}

function renderizarBlocoChatPedidos(usuario, dados) {
    if (!_aplicarVisibilidadeBloco('bloco-chat-pedidos', usuario)) return;

    dados = dados || window.dashboardState.dados || {};
    var ranking = calcularTopClientesPedidos(dados, 5, 30);
    renderizarRankingClientes('dashboard-chat-pedidos-ranking', ranking);

    var indicadores = _construirIndicadoresChatPedidos(dados);
    renderBars('dashboard-chat-pedidos-ranking-bars', indicadores);
}

function renderizarBlocoAdministracao(usuario, dados) {
    if (!_aplicarVisibilidadeBloco('bloco-administracao', usuario)) return;

    var pedidos = dados.pedidos || [];
    var hoje = new Date();
    var pedidosMes = pedidos.filter(function (p) {
        var data = _parseDataBR(p.data);
        return !isNaN(data.getTime()) && data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
    });

    var totalPedidosMes = pedidosMes.length;
    var elTotalPedidos = document.getElementById('admin-total-pedidos');
    var elPedidosInfo = document.getElementById('admin-pedidos-info');
    if (elTotalPedidos) elTotalPedidos.textContent = totalPedidosMes;
    if (elPedidosInfo) elPedidosInfo.textContent =
        totalPedidosMes + (totalPedidosMes === 1 ? ' pedido registrado no período' : ' pedidos registrados no período');

    var pedidosCancelados = pedidosMes.filter(function (p) {
        return String(p.status || '').toUpperCase() === 'CANCELADO';
    });
    var totalCancelados = pedidosCancelados.length;
    var percentualCancelados = totalPedidosMes > 0 ? Math.round((totalCancelados / totalPedidosMes) * 100) : 0;

    var elCanceladosStatus = document.getElementById('admin-cancelados-status');
    var elTotalCancelados = document.getElementById('admin-total-cancelados');
    var elCanceladosInfo = document.getElementById('admin-cancelados-info');

    if (elCanceladosStatus) elCanceladosStatus.textContent = totalCancelados > 0
        ? totalCancelados + ' cancelamento(s) no período'
        : 'Nenhum cancelamento no período';
    if (elTotalCancelados) elTotalCancelados.textContent = totalCancelados;
    if (elCanceladosInfo) elCanceladosInfo.textContent = percentualCancelados + '% do total de pedidos no mês';
}

function renderizarBlocoFinanceiro(usuario, dados) {
    var cards = document.getElementById('dashboard-fin-cards');
    if (!_aplicarVisibilidadeBloco('bloco-financeiro', usuario) || !cards) return;

    var financeiro = dados.financeiro || [];
    var receitas = financeiro.filter(function (f) {
        return _tipoLancamento(f).indexOf('RECEITA') !== -1 || _tipoLancamento(f).indexOf('ENTRADA') !== -1;
    });
    var despesas = financeiro.filter(function (f) {
        return _tipoLancamento(f).indexOf('DESPESA') !== -1 || _tipoLancamento(f).indexOf('SAIDA') !== -1 || _tipoLancamento(f).indexOf('SAÍDA') !== -1;
    });

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

function renderizarBlocoRelatorio(usuario, dados) {
    var grid = document.getElementById('dashboard-relatorio-grid');
    if (!_aplicarVisibilidadeBloco('bloco-relatorio', usuario) || !grid) return;

    var relatorios = dados.relatorios || [];
    var pedidos = dados.pedidos || [];

    var html = '';
    html += renderIndicadorCard('secondary', 'bi-file-earmark-text-fill', relatorios.length, 'Relatórios Gerados');
    html += renderIndicadorCard('primary', 'bi-graph-up', pedidos.length, 'Pedidos no Período');
    html += renderIndicadorCard('purple', 'bi-clock-history', _mediaDiariaPedidos(pedidos), 'Média Diária de Pedidos');

    grid.innerHTML = html;
    _renderChartVolumePedidos(pedidos);
}

function _mensagensPorDia(mensagens, dias) {
    return mensagens.filter(function (m) {
        var data = _parseDataBR(m.data || m.dataEnvio || m.timestamp);
        if (isNaN(data.getTime())) return false;
        var limite = new Date();
        limite.setDate(limite.getDate() - dias);
        return data >= limite;
    }).length;
}

function _construirIndicadoresChatPedidos(dados) {
    var pedidos = dados.pedidos || [];
    var mensagens = dados.mensagens || [];
    var hoje = new Date();

    var pedidosHoje = pedidos.filter(function (p) {
        var data = _parseDataBR(p.data);
        return !isNaN(data.getTime()) && data.toDateString() === hoje.toDateString();
    }).length;

    var pedidosPendentes = pedidos.filter(function (p) {
        return String(p.status || '').toUpperCase() === 'PENDENTE';
    }).length;

    var chatsAbertos = mensagens.filter(function (m) {
        return String(m.status || m.finalizado || '').toUpperCase() !== 'TRUE';
    }).length;

    var chatsEncerrados = mensagens.filter(function (m) {
        return String(m.status || m.finalizado || '').toUpperCase() === 'TRUE';
    }).length;

    var totalPedidos = pedidos.length || 1;

    return [
        { id: 'pedidos-hoje', cor: 'danger', icone: 'bi-bag-check-fill', valor: pedidosHoje, max: Math.max(totalPedidos, 1), label: 'Pedidos Hoje' },
        { id: 'pedidos-pendentes', cor: 'warning', icone: 'bi-hourglass-split', valor: pedidosPendentes, max: Math.max(totalPedidos, 1), label: 'Pedidos Pendentes' },
        { id: 'chats-abertos', cor: 'info', icone: 'bi-chat-left-text-fill', valor: chatsAbertos, max: Math.max(mensagens.length, 1), label: 'Chats Abertos' },
        { id: 'chats-encerrados', cor: 'secondary', icone: 'bi-chat-square-dots-fill', valor: chatsEncerrados, max: Math.max(mensagens.length, 1), label: 'Chats Encerrados' }
    ];
}

function _agruparPorMes(lista) {
    var meses = {};
    var ordem = [];
    var hoje = new Date();
    for (var i = 5; i >= 0; i--) {
        var d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        var chave = d.getFullYear() + '-' + d.getMonth();
        var label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        meses[chave] = { label: label, total: 0, ano: d.getFullYear(), mes: d.getMonth() };
        ordem.push(chave);
    }
    lista.forEach(function (item) {
        var data = _parseDataBR(item.data || item.dataLancamento);
        if (isNaN(data.getTime())) return;
        var chave = data.getFullYear() + '-' + data.getMonth();
        if (meses[chave]) meses[chave].total += _parseValor(item.valor);
    });
    return ordem.map(function (k) { return meses[k]; });
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
        d.setHours(0, 0, 0, 0);
        dias.push({ label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), ref: d, total: 0 });
    }
    pedidos.forEach(function (p) {
        var data = _parseDataBR(p.data);
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
    limiteData.setHours(0, 0, 0, 0);

    var pedidosFiltrados = pedidos.filter(function (p) {
        var dataPedido = _parseDataBR(p.data);
        if (isNaN(dataPedido.getTime())) return false;
        return dataPedido >= limiteData;
    });

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

    if (!ranking.length) {
        container.innerHTML = '<div class="text-center py-3" style="color:#999;font-size:.82rem;">Nenhum pedido no período.</div>';
        return;
    }

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

function iniciarHeartbeat() {
    var username = localStorage.getItem('username');
    if (!username || !window.API) return;

    if (window.dashboardState.heartbeatIntervalId) {
        clearInterval(window.dashboardState.heartbeatIntervalId);
    }

    function enviar() {
        window.API.call('heartbeat', { username: username }).catch(function () { });
        renderizarBlocoGestao();
    }

    enviar();
    window.dashboardState.heartbeatIntervalId = setInterval(enviar, 60000);
}

function _statusPedidoAbertoPagamento(status) {
    var raw = String(status || 'PENDENTE').trim();
    if (raw.includes('/')) raw = raw.split('/').pop().trim();
    var s = raw.toUpperCase();
    if (['EM_ANDAMENTO', 'ANDAMENTO', 'EM ROTA', 'EM_ROTA'].includes(s)) return false;
    if (['FINALIZADO', 'CONCLUIDO', 'CONCLUÍDO'].includes(s)) return false;
    if (s === 'CANCELADO') return false;
    return true;
}

function _formatarDataPedido(str) {
    var data = _parseDataBR(str);
    if (isNaN(data.getTime())) return '';
    return data.toLocaleDateString('pt-BR');
}

function preencherModalNotifPagamento(pedidosAbertos) {
    var resumoEl = document.getElementById('modal-notif-pagamento-resumo');
    var listaEl = document.getElementById('modal-notif-pagamento-lista');
    if (!listaEl) return;

    var total = pedidosAbertos.length;
    if (resumoEl) {
        resumoEl.textContent = total === 1 ? '1 pedido aguardando pagamento' : total + ' pedido(s) aguardando pagamento';
    }

    listaEl.innerHTML = '';

    if (total === 0) {
        listaEl.innerHTML = '<div class="text-center py-3" style="color:#999;font-size:.82rem;">Nenhum pedido em aberto.</div>';
        return;
    }

    var dados = window.dashboardState.dados || {};

    pedidosAbertos.forEach(function (pedido) {
        var item = document.createElement('div');
        item.className = 'modal-notif-pagamento-item';

        var info = document.createElement('div');
        info.className = 'modal-notif-pagamento-item-info';

        var nome = document.createElement('span');
        nome.className = 'modal-notif-pagamento-item-nome';
        nome.textContent = _obterNomeCliente(pedido, dados);

        var detalhe = document.createElement('span');
        detalhe.className = 'modal-notif-pagamento-item-detalhe';
        var dataFormatada = _formatarDataPedido(pedido.data);
        var idPedido = pedido.id || pedido.id_pedido || '—';
        detalhe.textContent = 'Pedido #' + idPedido + (dataFormatada ? ' • ' + dataFormatada : '');

        info.appendChild(nome);
        info.appendChild(detalhe);

        var acoes = document.createElement('div');
        acoes.className = 'modal-notif-pagamento-item-acoes';
        acoes.style.display = 'flex';
        acoes.style.alignItems = 'center';
        acoes.style.gap = '8px';

        var badge = document.createElement('span');
        badge.className = 'modal-notif-pagamento-item-badge';
        badge.textContent = 'Pendente';

        var btnVer = document.createElement('button');
        btnVer.type = 'button';
        btnVer.className = 'modal-notif-pagamento-item-btn-ver';
        btnVer.innerHTML = '<i class="bi bi-eye"></i> Ver Pedido';
        btnVer.style.cssText = 'border:none;background:#0d6efd;color:#fff;font-size:.72rem;padding:5px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;';
        btnVer.addEventListener('click', function () {
            abrirPedidoDaNotificacao(idPedido);
        });

        acoes.appendChild(badge);
        acoes.appendChild(btnVer);

        item.appendChild(info);
        item.appendChild(acoes);
        listaEl.appendChild(item);
    });
}

function abrirModalNotifPagamento() {
    var modalEl = document.getElementById('modalNotifPagamentoDashboard');
    if (!modalEl || typeof bootstrap === 'undefined') {
        window.dashboardState.modalNotifJaExibido = false;
        return;
    }

    var pedidosAbertos = window.dashboardState.pedidosAbertosPagamento || [];
    preencherModalNotifPagamento(pedidosAbertos);

    var modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
}

function abrirPedidoDaNotificacao(pedidoId) {
    window.AppRDO = window.AppRDO || {};
    window.AppRDO._pedidoAlvoNotificacao = String(pedidoId || '').trim();

    var modalEl = document.getElementById('modalNotifPagamentoDashboard');
    if (modalEl && typeof bootstrap !== 'undefined') {
        var inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
    }

    navegarParaPedidos();
}

function navegarParaPedidos() {
    if (window.router && typeof window.router.navigate === 'function') {
        window.router.navigate('pedidos');
    } else {
        window.location.hash = '#pedidos';
    }
}

function renderizarBlocoNotificacaoPagamento(dados) {
    var bloco = document.getElementById('bloco-notificacao-pagamento');
    if (!bloco) return;

    window.dashboardState = window.dashboardState || {};

    var pedidos = (dados && dados.pedidos) || [];
    var financeiro = (dados && dados.financeiro) || [];

    var pedidosAbertos = pedidos.filter(function (p) {
        return _pedidoAguardandoPagamento(p, financeiro);
    });

    var total = pedidosAbertos.length;
    window.dashboardState.pedidosAbertosPagamento = pedidosAbertos;

    if (total === 0) {
        bloco.classList.add('d-none');
        return;
    }

    var titleEl = document.getElementById('notif-pagamento-title');
    var subtitleEl = document.getElementById('notif-pagamento-subtitle');

    if (titleEl) {
        titleEl.textContent = total === 1 ? 'Você possui 1 pedido em aberto' : 'Você possui ' + total + ' pedidos em aberto';
    }
    if (subtitleEl) {
        subtitleEl.textContent = total === 1 ? '1 pedido aguardando pagamento' : total + ' pedidos aguardando pagamento';
    }

    bloco.classList.remove('d-none');

    if (!window.dashboardState.modalNotifJaExibido) {
        window.dashboardState.modalNotifJaExibido = true;
        setTimeout(function () {
            abrirModalNotifPagamento();
        }, 400);
    }
}

function renderizarDashboardCompleto(usuario, dados) {
    var blocos = [
        function () { renderizarBlocoNotificacaoPagamento(dados); },
        function () { renderizarBlocoChatPedidos(usuario, dados); },
        function () { renderizarBlocoVisaoGeral(); },
        function () { renderizarBlocoGestao(); },
        function () { renderizarBlocoAdministracao(usuario, dados); },
        function () { renderizarBlocoFinanceiro(usuario, dados); },
        function () { renderizarBlocoRelatorio(usuario, dados); }
    ];

    blocos.forEach(function (fn) {
        try { fn(); } catch (e) { console.error('Erro ao renderizar bloco:', e); }
    });
}

function _situacaoFinanceiroDoPedido(pedido, financeiro) {
    var idPedido = String(pedido.id || pedido.id_pedido || '').trim();
    if (!idPedido) return null;
    var lancamento = financeiro.find(function (f) {
        return String(f.id_pedido || '').trim() === idPedido;
    });
    if (!lancamento) return null;
    return String(lancamento.situacao || '').trim().toLowerCase();
}

function _statusPedidoCancelado(status) {
    var raw = String(status || '').trim();
    if (raw.includes('/')) raw = raw.split('/').pop().trim();
    return raw.toUpperCase() === 'CANCELADO';
}

function _pedidoAguardandoPagamento(pedido, financeiro) {
    // Pedido cancelado nunca entra na lista de pagamento pendente
    if (_statusPedidoCancelado(pedido.status)) return false;

    var situacao = _situacaoFinanceiroDoPedido(pedido, financeiro);

    // Sem lançamento financeiro ainda = nasceu pendente, precisa aparecer
    if (situacao === null) return true;

    // Se já existe lançamento, só conta se estiver marcado como pendente
    return situacao === 'pendente';
}

window.initDashboard = function () {
    if (window.dashboardState.isFetching) return Promise.resolve();
    window.dashboardState.isFetching = true;

    window.dashboardState.modalNotifJaExibido = false;

    var usuario = window.dashboardState.usuario || obterUsuarioLogado();
    window.dashboardState.usuario = usuario;
    atualizarHeaderUsuario(usuario);

    if (window.dashboardState.dados) {
        renderizarDashboardCompleto(usuario, window.dashboardState.dados);
        ocultarLoadingDashboard();
    } else {
        mostrarLoadingDashboard();
    }

    syncStartDashboard();
    var meuToken = window.AppRDO ? window.AppRDO._navToken : null;

    return carregarDadosDashboard()
        .then(function (dados) {
            if (window.AppRDO && window.AppRDO._navToken !== meuToken) return;
            window.dashboardState.dados = dados;
            renderizarDashboardCompleto(usuario, dados);
            ocultarLoadingDashboard();
        })
        .catch(function (erro) {
            console.error('Erro ao carregar dashboard:', erro);
            if (!window.dashboardState.dados) _exibirErroDashboard();
        })
        .finally(function () {
            window.dashboardState.isFetching = false;
            syncStopDashboard();
        });
};

window.addEventListener('botCacheAtualizado', function () {
    renderizarBlocoGestao();
    renderizarBlocoVisaoGeral();
});

window.addEventListener('masterStatusChanged', function () {
    renderizarBlocoGestao();
    renderizarBlocoVisaoGeral();
    if (window.dashboardState.dados) {
        window.dashboardState.dados.masterOn = typeof window.checkMaster === 'function'
            ? window.checkMaster()
            : window.dashboardState.dados.masterOn;
    }
});
