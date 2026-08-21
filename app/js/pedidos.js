(function () {
    'use strict';

    window.pedidosState = {
        isFetching: false,
        intervaloId: null,
        filtroCategoria: 'todos',
        filtroStatus: 'todos',
        filtroData: '',
        busca: '',
        paginaAtual: 1,
        itensPorPagina: 5,
        dadosCarregados: false,
        emAcao: false,
        sortDesc: true
    };

    window.AppRDO = window.AppRDO || {};
    window.AppRDO.pedidosCache = window.AppRDO.pedidosCache || [];
    window.AppRDO.chatsCache = window.AppRDO.chatsCache || [];

    var FRANQUIA_MIN = 10;
    var TARIFA_MIN = 0.60;
    var spinFeedbackTimer = null;
    var MOTIVOS_CANCELAMENTO = [
        { value: 'cliente_desistiu', label: 'Cliente desistiu' },
        { value: 'endereco_incorreto', label: 'Endereço incorreto' },
        { value: 'sem_motoboy', label: 'Sem motoboy disponível' },
        { value: 'pedido_duplicado', label: 'Pedido duplicado' },
        { value: 'fora_area_atendimento', label: 'Fora da área de atendimento' },
        { value: 'problema_pagamento', label: 'Problema no pagamento' },
        { value: 'outro', label: 'Outro' }
    ];
    var els = {
        tbody: null, btnSync: null, iconSync: null, inputBusca: null,
        filtroData: null, btnFiltroTipo: null, dropdownFiltroMenu: null,
        labelFiltroTipo: null, btnPrev: null, btnNext: null,
        infoPaginacao: null, filtrosStatus: [], thead: null, iconSortData: null,
        loadingOverlay: null
    };
    var PEDIDOS_LS_KEY = 'rdo_pedidos_cache_v1';
    var _renderEmAndamento = false;
    var _spinOffPendente = false;

    window.RDO_PEDIDOS = window.RDO_PEDIDOS || {};

    function _renderizarTabelaComTravaSpin(pedidos) {
        _renderEmAndamento = true;
        _renderizarTabela(pedidos);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                _renderEmAndamento = false;
                _spinOffSeLivre();
            });
        });
    }

    function _spinOffSeLivre() {
        if (_renderEmAndamento || window.pedidosState.isFetching) {
            _spinOffPendente = true;
            return;
        }
        _spinOffPendente = false;
        _spinOff();
    }

    async function _fetchPedidos(opts) {
        opts = opts || {};
        var silencioso = !!opts.silencioso;

        if (window.pedidosState.isFetching) return;
        if (window.pedidosState.dadosCarregados && !window.pedidosState.emAcao && !silencioso) return;

        window.pedidosState.isFetching = true;
        window.pedidosState.emAcao = false;

        _spinOn();

        if (!silencioso) _mostrarLoading();

        var loadingContent = document.getElementById('pedidos-loading-state');
        var errorContent = document.getElementById('pedidos-error-state');
        var errorText = document.getElementById('pedidos-error-text');
        var btnRetry = document.getElementById('btn-retry-pedidos');

        if (!silencioso && loadingContent) loadingContent.classList.remove('d-none');
        if (errorContent) errorContent.classList.add('d-none');

        try {
            if (typeof API === 'undefined' || typeof API.call !== 'function')
                throw new Error('API.call indefinido');

            var resultados = await Promise.all([
                _fetchComRetry('getchat'),
                _fetchComRetry('getpedidos')
            ]);

            var respChat = resultados[0];
            var respPedidos = resultados[1];

            var chatsNovos = Array.isArray(respChat) ? respChat : [];

            var pedidosNovos = [];
            if (Array.isArray(respPedidos)) {
                pedidosNovos = respPedidos;
            } else if (respPedidos && typeof respPedidos === 'object') {
                pedidosNovos = Array.isArray(respPedidos.pedidos) ? respPedidos.pedidos :
                    Array.isArray(respPedidos.data) ? respPedidos.data : [];
            }

            window.AppRDO.chatsCache = chatsNovos;
            window.AppRDO.pedidosCache = pedidosNovos;
            window.pedidosState.dadosCarregados = true;

            _salvarCacheLocal(pedidosNovos, chatsNovos);

            _renderizarTabelaComTravaSpin(pedidosNovos);

            _esconderLoading();

        } catch (e) {
            console.error('[pedidos.js] ❌ Erro no fetch:', e);
            var msg = e && e.message ? e.message : 'Erro desconhecido ao buscar pedidos.';

            if (silencioso && window.pedidosState.dadosCarregados) {
                console.warn('[pedidos.js] ⚠️ Sync silencioso falhou, mantendo dados do cache local:', msg);
            } else {
                if (loadingContent) loadingContent.classList.add('d-none');
                if (errorContent) errorContent.classList.remove('d-none');
                if (errorText) errorText.textContent = msg;

                if (btnRetry) {
                    btnRetry.onclick = function () {
                        window.pedidosState.dadosCarregados = false;
                        window.pedidosState.emAcao = true;
                        _fetchPedidos();
                    };
                }

                if (window.PedidosErro && typeof window.PedidosErro.mostrar === 'function') {
                    window.PedidosErro.mostrar(msg);
                }

                if (els.tbody && window.pedidosState.dadosCarregados === false) {
                    els.tbody.innerHTML =
                        '<tr><td colspan="6" class="text-center text-danger py-4">' +
                        '<i class="bi bi-exclamation-triangle d-block mb-2" style="font-size:2rem;"></i>' +
                        'Erro: ' + _escHtml(msg) + '</td></tr>';
                }
            }
        } finally {
            window.pedidosState.isFetching = false;
            _spinOffSeLivre();
        }
    }

    function _bind() {
        els.tbody = document.getElementById('corpo-tabela-pedidos');
        els.btnSync = document.getElementById('btn-loop-pedidos');
        els.iconSync = document.getElementById('icon-loop-pedidos');
        els.inputBusca = document.getElementById('filtro-pedidos');
        els.btnClearBusca = document.getElementById('btn-limpar-busca-pedidos');
        els.filtroData = document.getElementById('filtro-data-pedidos');
        els.btnFiltroTipo = document.getElementById('btn-filtro-tipo');
        els.dropdownFiltroMenu = document.getElementById('dropdown-filtro-menu');
        els.labelFiltroTipo = document.getElementById('label-filtro-tipo');
        els.btnPrev = document.getElementById('btn-pag-prev-pedidos');
        els.btnNext = document.getElementById('btn-pag-next-pedidos');
        els.infoPaginacao = document.getElementById('info-paginacao-pedidos');
        els.thead = document.querySelector('#tabela-pedidos thead');
        els.iconSortData = document.getElementById('icon-sort-data-pedidos');
        els.loadingOverlay = document.getElementById('pedidos-loading-overlay');
        els.filtrosStatus = [
            { el: document.getElementById('ped-filter-todos'), status: 'todos' },
            { el: document.getElementById('ped-filter-pendente'), status: 'pendente' },
            { el: document.getElementById('ped-filter-em_rota'), status: 'em_rota' },
            { el: document.getElementById('ped-filter-concluido'), status: 'concluido' },
            { el: document.getElementById('ped-filter-cancelado'), status: 'cancelado' },
            { el: document.getElementById('ped-filter-pendente_financeiro'), status: 'pendente_financeiro' }
        ];
        if (!els.tbody) { console.error('[pedidos.js] ❌ tbody não encontrado'); return false; }
        return true;
    }

    function _toggleBtnClearBusca() {
        if (!els.btnClearBusca) return;
        var temTexto = els.inputBusca && els.inputBusca.value.trim().length > 0;
        els.btnClearBusca.classList.toggle('d-none', !temTexto);
    }

    function _normalizarStatus(s) {
        var raw = String(s || 'PENDENTE').trim();
        if (raw.includes('/')) raw = raw.split('/').pop().trim();
        var st = raw.toUpperCase();
        if (['EM_ANDAMENTO', 'ANDAMENTO', 'EM ROTA', 'EM_ROTA'].includes(st)) return 'EM_ROTA';
        if (['FINALIZADO', 'CONCLUIDO', 'CONCLUÍDO'].includes(st)) return 'CONCLUIDO';
        if (st === 'CANCELADO') return 'CANCELADO';
        return 'PENDENTE';
    }

    function _chatDoPedido(pedidoId) {
        var pid = String(pedidoId || '').trim();
        return (window.AppRDO.chatsCache || []).find(function (c) {
            return String(c.pedido_id || '').trim() === pid;
        }) || null;
    }

    function _resolverHoraPedido(pedido) {
        var chat = _chatDoPedido(pedido.id);
        if (chat && chat.hora) {
            var h = String(chat.hora).trim();
            var m = h.match(/^(\d{1,2}):(\d{2})/);
            if (m) return m[1].padStart(2, '0') + ':' + m[2];
        }
        var campos = [pedido.horario, pedido.hora, pedido.hora_pedido];
        for (var i = 0; i < campos.length; i++) {
            if (campos[i]) {
                var raw = String(campos[i]).trim();
                var match = raw.match(/(\d{1,2}):(\d{2})/);
                if (match) return match[1].padStart(2, '0') + ':' + match[2];
            }
        }
        return '—';
    }

    function _extrairDataPedido(pedido) {
        var chat = _chatDoPedido(pedido.id);
        if (chat && chat.data) {
            var raw = String(chat.data).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
            if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
                var p = raw.substring(0, 10).split('/');
                return p[2] + '-' + p[1] + '-' + p[0];
            }
        }
        var camposData = [pedido.data_pedido, pedido.created_at]; // 🔧 removido pedido.data
        for (var i = 0; i < camposData.length; i++) {
            if (!camposData[i]) continue;
            var d = String(camposData[i]).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
            if (/^\d{2}\/\d{2}\/\d{4}/.test(d)) {
                var pts = d.substring(0, 10).split('/');
                return pts[2] + '-' + pts[1] + '-' + pts[0];
            }
            if (d.includes('T')) {
                var parteData = d.split('T')[0].split('-');
                if (parteData.length === 3) return parteData[0] + '-' + parteData[1] + '-' + parteData[2];
            }
        }
        return '';
    }

    function _resolverDataFallback(pedido) {
        var rawData = String(pedido.data_pedido || pedido.created_at || '').trim(); // 🔧 removido pedido.data
        if (!rawData) return '';
        if (/^\d{2}\/\d{2}\/\d{4}/.test(rawData)) return rawData.substring(0, 10);
        if (/^\d{4}-\d{2}-\d{2}/.test(rawData)) {
            var dp = rawData.substring(0, 10).split('-');
            return dp[2] + '/' + dp[1] + '/' + dp[0];
        }
        if (rawData.includes('T')) {
            var pd = rawData.split('T')[0].split('-');
            if (pd.length === 3) return pd[2] + '/' + pd[1] + '/' + pd[0];
        }
        return '';
    }

    function _resolverDataLancamento(pedido) {
        var raw = String(pedido.data_lancamento || '').trim(); // 🔧 antes era pedido.data
        if (!raw) return '';
        if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) return raw.substring(0, 10);
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
            var p = raw.substring(0, 10).split('-');
            return p[2] + '/' + p[1] + '/' + p[0];
        }
        return raw;
    }

    function _formatarDataExibicao(isoDate) {
        if (!isoDate || isoDate.length < 10) return '—';
        var parts = isoDate.substring(0, 10).split('-');
        if (parts.length !== 3) return '—';
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function _parseMoedaStr(str) {
        str = str.trim().replace(/R\$\s*/gi, '').trim();
        var temVirgula = str.includes(',');
        var temPonto = str.includes('.');
        if (temVirgula && temPonto) {
            var iPonto = str.lastIndexOf('.');
            var iVirgula = str.lastIndexOf(',');
            str = iVirgula > iPonto
                ? str.replace(/\./g, '').replace(',', '.')
                : str.replace(/,/g, '');
        } else if (temVirgula) {
            str = str.replace(',', '.');
        }
        var num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }

    function _parseMoeda(valor) {
        if (valor === null || valor === undefined || valor === '') return 0;
        var n = Number(valor);
        if (!isNaN(n) && isFinite(n)) {
            if (Math.abs(n) > 999999) return _parseMoedaStr(String(valor));
            return n;
        }
        return _parseMoedaStr(String(valor));
    }

    function _formatarMoeda(valor) {
        var num = parseFloat(valor) || 0;
        return 'R$ ' + num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function _resolverValor(pedido) {
        if (pedido.valor_base != null && pedido.valor_base !== '') {
            return _parseMoeda(pedido.valor_base);
        }
        var raw = pedido.valor_corrida || pedido.valor_total || pedido.valor_final || 0;
        return _parseMoeda(raw);
    }

    function _resolverNomeCliente(pedido) {
        var chat = _chatDoPedido(pedido.id);
        return String(
            pedido.cliente ||
            pedido.solicitante ||
            (chat && chat.cliente) ||
            (chat && chat.solicitante) ||
            window.AppRDO.clienteSelecionado ||
            '—'
        ).trim();
    }

    function _resolverMercadoria(pedido) {
        var chat = _chatDoPedido(pedido.id);
        return pedido.mercadoria || (chat && chat.mercadoria) || '';
    }

    function _resolverRetorno(pedido) {
        var chat = _chatDoPedido(pedido.id);
        return pedido.retorno || (chat && chat.retorno) || 'Não';
    }

    function _resolverPrioridade(pedido) {
        var chat = _chatDoPedido(pedido.id);
        return pedido.prioridade != null ? pedido.prioridade : (chat && chat.prioridade != null ? chat.prioridade : '0');
    }

    function _labelPrioridade(valor) {
        var mapa = { '0': 'Normal', '1': 'Agendado', '2': 'Urgente' };
        return mapa[String(valor)] || 'Normal';
    }

    function _formatarIdServico(id) {
        try {
            var s = String(id || '').trim();
            if (/^RDO\d+$/i.test(s)) return s.toUpperCase();
            var num = parseInt(s.replace(/\D/g, ''), 10);
            return 'RDO' + String(isNaN(num) ? 0 : num).padStart(3, '0');
        } catch (_) { return 'RDO000'; }
    }

    function _idNumerico(id) {
        var n = parseInt(String(id || '').replace(/\D/g, ''), 10);
        return isNaN(n) ? 0 : n;
    }

    function _escHtml(str) {
        var div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    function _escAttr(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function _resolverMotoboy(pedido) {
        var motoboyBruto = String(pedido.motoboy || '').trim();
        var blacklist = ['EM_ROTA', 'EM ROTA', 'PENDENTE', 'CONCLUIDO', 'CONCLUÍDO', 'CANCELADO'];
        if (motoboyBruto && !blacklist.includes(motoboyBruto.toUpperCase())) return motoboyBruto;
        var statusBruto = String(pedido.status || '').trim();
        if (statusBruto.includes('/')) return statusBruto.split('/')[0].trim();
        return '';
    }

    async function _carregarMotoboysDropdown(selectEl, motoboyAtual) {
        if (!selectEl) return;

        selectEl.innerHTML = '<option value="" disabled selected>Carregando...</option>';
        selectEl.disabled = true;

        try {
            var todos = await API.call('getcolaboradores');
            var lista = Array.isArray(todos) ? todos : (todos.data || []);

            // 🔧 CORRIGIDO: campo "colaborador" não existe mais na API.
            // Antes: lista.filter(c => String(c.colaborador||'').toUpperCase().includes('MOTOBOY'))
            // Agora: todo colaborador ativo é considerado motoboy.
            var motoboys = lista.filter(function (c) {
                return String(c.status || '').toUpperCase() === 'TRUE';
            });

            selectEl.disabled = false;

            if (motoboys.length === 0) {
                selectEl.innerHTML = '<option value="" selected>Nenhum motoboy disponível</option>';
                return;
            }

            var nomeAtualNorm = String(motoboyAtual || '').trim().toLowerCase();
            var encontrouAtual = false;

            var opcoes = motoboys.map(function (m) {
                var nome = String(m.username || m.nome || 'Sem nome');
                var selecionado = nomeAtualNorm && nome.trim().toLowerCase() === nomeAtualNorm;
                if (selecionado) encontrouAtual = true;
                return '<option value="' + _escAttr(nome) + '"' + (selecionado ? ' selected' : '') + '>' + _escHtml(nome) + '</option>';
            }).join('');

            var placeholder = '<option value=""' + (!encontrouAtual ? ' selected' : '') + '>Aguardando motoboy</option>';

            selectEl.innerHTML = placeholder + opcoes;
        } catch (e) {
            window._exibirErroGlobal(e, 'carregar motoboys');
            selectEl.disabled = false;
            selectEl.innerHTML = '<option value="" selected>Erro ao carregar</option>';
        }
    }

    function _spinOn() {
        if (els.btnSync) { els.btnSync.classList.add('syncing'); els.btnSync.disabled = true; }
        if (els.iconSync) els.iconSync.classList.add('spinner-rotate');
    }

    function _spinOff() {
        setTimeout(function () {
            if (els.btnSync) { els.btnSync.classList.remove('syncing'); els.btnSync.disabled = false; }
            if (els.iconSync) els.iconSync.classList.remove('spinner-rotate');
        }, 500);
    }

    function _spinFeedback() {
        _spinOn();
        clearTimeout(spinFeedbackTimer);
        spinFeedbackTimer = setTimeout(_spinOff, 500);
    }

    function _setBotaoLoading(btn, loading, iconClassDefault, textoDefault) {
        if (!btn) return;
        if (loading) {
            btn.disabled = true;
            btn.setAttribute('data-html-original', btn.innerHTML);
            btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate me-1"></i>Salvando...';
        } else {
            btn.disabled = false;
            var original = btn.getAttribute('data-html-original');
            btn.innerHTML = original || ('<i class="' + iconClassDefault + ' me-1"></i>' + textoDefault);
            btn.removeAttribute('data-html-original');
        }
    }

    function _mostrarLoading() {
        if (els.loadingOverlay) els.loadingOverlay.classList.remove('d-none');
    }

    function _esconderLoading() {
        if (els.loadingOverlay) els.loadingOverlay.classList.add('d-none');
    }

    function _primeiroNome(nomeCompleto) {
        var nome = String(nomeCompleto || '—').trim();
        if (!nome || nome === '—') return '—';
        return nome.split(/\s+/)[0];
    }

    function _resolverSituacaoFinanceira(pedido) {
        var sf = String(pedido.situacao_financeira || 'pendente').trim().toLowerCase();
        if (sf === 'pago' || sf === 'recebido') {
            return { label: 'Pago', classe: 'bg-status-done' };
        }
        return { label: 'A Receber', classe: 'bg-status-pending' };
    }

    function _criarLinhaTabela(pedido) {
        var statusNorm = _normalizarStatus(pedido.status);

        var classeStatus = statusNorm === 'PENDENTE' ? 'bg-status-pending' :
            statusNorm === 'EM_ROTA' ? 'bg-status-route' :
                statusNorm === 'CANCELADO' ? 'bg-status-cancel' : 'bg-status-done';

        var statusLabel = statusNorm === 'EM_ROTA' ? 'Em Rota' :
            statusNorm === 'CONCLUIDO' ? 'Concluído' :
                statusNorm === 'CANCELADO' ? 'Cancelado' : 'Pendente';

        var financeiro = _resolverSituacaoFinanceira(pedido);

        var badgesHtml =
            '<div class="status-badges-row">' +
            '<span class="status-badge ' + classeStatus + '">' + _escHtml(statusLabel) + '</span>' +
            (statusNorm !== 'CANCELADO'
                ? '<span class="status-badge status-badge-financeiro ' + financeiro.classe + '">' + _escHtml(financeiro.label) + '</span>'
                : '') +
            '</div>';

        var idPedido = String(pedido.id || pedido._id || 'S/N');
        var idFmt = _formatarIdServico(idPedido);
        var solicitanteCompleto = _resolverNomeCliente(pedido);
        var solicitantePrimeiro = _primeiroNome(solicitanteCompleto);
        var dataPedido = _formatarDataExibicao(_extrairDataPedido(pedido));
        var motoboy = _resolverMotoboy(pedido) || '—';
        var finalizado = ['CONCLUIDO', 'CANCELADO'].includes(statusNorm);
        var idSafe = _escAttr(idPedido);

        var acoes = finalizado
            ? '<button class="btn-pedido-view" data-id="' + idSafe + '" title="Visualizar"><i class="bi bi-eye"></i></button>'
            : '<div class="d-flex gap-1 justify-content-end">' +
            '<button class="btn-pedido-edit"   data-id="' + idSafe + '" title="Editar"><i class="bi bi-pencil-square"></i></button>' +
            '<button class="btn-pedido-delete" data-id="' + idSafe + '" title="Excluir"><i class="bi bi-trash"></i></button>' +
            '</div>';

        return '<tr data-pedido-id="' + idSafe + '">' +
            '<td class="ps-3">' + _escHtml(dataPedido) + '</td>' +
            '<td title="' + _escAttr(solicitanteCompleto) + '">' + _escHtml(solicitanteCompleto) + '</td>' +
            '<td class="d-none d-md-table-cell">' + _escHtml(idFmt) + '</td>' +
            '' +
            '<td>' + badgesHtml + '</td>' +
            '<td class="text-end pe-3">' + acoes + '</td></tr>';
    }

    function _matchFiltros(p, termo, categoria, statusFiltro, dataFiltro) {
        var s = _normalizarStatus(p.status);
        var sitFin = String(p.situacao_financeira || 'pendente').trim().toLowerCase();

        if (statusFiltro !== 'todos') {
            if (statusFiltro === 'pendente' && s !== 'PENDENTE') return false;
            if (statusFiltro === 'em_rota' && s !== 'EM_ROTA') return false;
            if (statusFiltro === 'concluido' && s !== 'CONCLUIDO') return false;
            if (statusFiltro === 'cancelado' && s !== 'CANCELADO') return false;
            if (statusFiltro === 'pendente_financeiro') {
                if (s === 'CANCELADO') return false;
                if (sitFin === 'pago' || sitFin === 'recebido') return false;
            }
        }
        if (dataFiltro && _extrairDataPedido(p) !== dataFiltro) return false;
        if (termo) {
            var t = termo.toLowerCase();
            var idFmt = _formatarIdServico(p.id);
            var nome = _resolverNomeCliente(p);
            if (categoria === 'servico') {
                if (idFmt.toLowerCase().indexOf(t) === -1 &&
                    String(p.id || '').toLowerCase().indexOf(t) === -1) return false;
            } else if (categoria === 'cliente') {
                if (nome.toLowerCase().indexOf(t) === -1 &&
                    String(p.solicitante || '').toLowerCase().indexOf(t) === -1) return false;
            } else {
                var campos = [
                    idFmt, String(p.id || ''), nome, String(p.solicitante || ''),
                    String(p.contato || ''), String(p.mercadoria || ''),
                    String(p.motoboy || ''), String(p.de || ''), String(p.para || '')
                ];
                if (!campos.some(function (c) { return c.toLowerCase().indexOf(t) !== -1; })) return false;
            }
        }
        return true;
    }

    function _atualizarContadores(pedidos) {
        var total = pedidos.length;
        var pends = pedidos.filter(function (p) { return _normalizarStatus(p.status) === 'PENDENTE'; }).length;
        var rotas = pedidos.filter(function (p) { return _normalizarStatus(p.status) === 'EM_ROTA'; }).length;
        var concl = pedidos.filter(function (p) { return _normalizarStatus(p.status) === 'CONCLUIDO'; }).length;
        var canc = pedidos.filter(function (p) { return _normalizarStatus(p.status) === 'CANCELADO'; }).length;
        var pendFin = pedidos.filter(function (p) {
            var s = _normalizarStatus(p.status);
            if (s === 'CANCELADO') return false;
            var sf = String(p.situacao_financeira || 'pendente').trim().toLowerCase();
            return sf !== 'pago' && sf !== 'recebido';
        }).length;

        function _set(id, count, pct) {
            var elC = document.getElementById('ped-count-' + id);
            var elP = document.getElementById('ped-pct-' + id);
            if (elC) elC.textContent = count;
            if (elP) elP.textContent = pct;
        }
        _set('todos', total, 'de ' + total);
        _set('pendente', pends, total > 0 ? Math.round((pends / total) * 100) + '%' : '0%');
        _set('em_rota', rotas, total > 0 ? Math.round((rotas / total) * 100) + '%' : '0%');
        _set('concluido', concl, total > 0 ? Math.round((concl / total) * 100) + '%' : '0%');
        _set('cancelado', canc, total > 0 ? Math.round((canc / total) * 100) + '%' : '0%');
        _set('pendente_financeiro', pendFin, total > 0 ? Math.round((pendFin / total) * 100) + '%' : '0%');
    }

    function _renderizarTabela(pedidos) {
        if (!els.tbody) { console.error('[pedidos.js] ❌ tbody não encontrado'); return; }

        var filtrados = pedidos.filter(function (p) {
            return _matchFiltros(
                p,
                window.pedidosState.busca,
                window.pedidosState.filtroCategoria,
                window.pedidosState.filtroStatus,
                window.pedidosState.filtroData
            );
        });

        filtrados.sort(function (a, b) {
            var na = _idNumerico(a.id || a._id);
            var nb = _idNumerico(b.id || b._id);
            return window.pedidosState.sortDesc ? (nb - na) : (na - nb);
        });

        _atualizarContadores(pedidos);

        if (filtrados.length === 0) {
            els.tbody.innerHTML =
                '<tr><td colspan="6" class="text-center text-muted py-4">' +
                '<i class="bi bi-inbox d-block mb-2" style="font-size:2rem;"></i>' +
                'Nenhum pedido encontrado.</td></tr>';

            if (els.infoPaginacao) els.infoPaginacao.textContent = 'Pág 0 de 0';
            if (els.btnPrev) els.btnPrev.disabled = true;
            if (els.btnNext) els.btnNext.disabled = true;
            return;
        }

        var inicio = (window.pedidosState.paginaAtual - 1) * window.pedidosState.itensPorPagina;
        var paginado = filtrados.slice(inicio, inicio + window.pedidosState.itensPorPagina);
        var totalPag = Math.ceil(filtrados.length / window.pedidosState.itensPorPagina);

        els.tbody.innerHTML = paginado.map(_criarLinhaTabela).join('');

        if (els.infoPaginacao)
            els.infoPaginacao.textContent = 'Pág ' + window.pedidosState.paginaAtual + ' de ' + totalPag;
        if (els.btnPrev) els.btnPrev.disabled = window.pedidosState.paginaAtual === 1;
        if (els.btnNext) els.btnNext.disabled = window.pedidosState.paginaAtual >= totalPag;

        _registrarEventosLinhas();
    }

    function _toggleSort() {
        window.pedidosState.sortDesc = !window.pedidosState.sortDesc;
        if (els.iconSortData) {
            els.iconSortData.className = window.pedidosState.sortDesc ? 'bi bi-arrow-down' : 'bi bi-arrow-up';
        }
        window.pedidosState.paginaAtual = 1;
        window.pedidosState.emAcao = true;
        _spinFeedback();
        _renderizarTabela(window.AppRDO.pedidosCache || []);
    }

    window.RDO_PEDIDOS.reabrirPedido = function () {
        var btn = document.getElementById('btn-reabrir-pedido');
        var id = btn ? btn.getAttribute('data-id') : '';
        if (!id) return;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Reabrindo...';

        API.call('updatepedidos', { id: id, status: 'PENDENTE', situacao_financeira: 'pendente' })
            .then(function (res) {
                if (res && res.status === 'error') throw new Error(res.message || 'Erro ao reabrir');

                var pedido = (window.AppRDO.pedidosCache || []).find(function (p) {
                    return String(p.id || '').trim() === String(id).trim();
                });
                if (pedido) {
                    pedido.status = 'PENDENTE';
                    pedido.situacao_financeira = 'pendente';
                    pedido._financeiroJaCriado = false;
                }

                _renderizarTabela(window.AppRDO.pedidosCache);

                var modalEl = document.getElementById('modalPedidoDetalhes');
                if (modalEl) {
                    var inst = bootstrap.Modal.getInstance(modalEl);
                    if (inst) inst.hide();
                }

                if (typeof Swal !== 'undefined')
                    Swal.fire({ icon: 'success', title: 'Pedido reaberto!', toast: true, timer: 2000, position: 'top-end', showConfirmButton: false });
            })
            .catch(function (err) {
                console.error('[pedidos.js] ❌ reabrirPedido:', err);
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Erro', text: err.message || 'Falha ao reabrir pedido.' });
            })
            .finally(function () {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-arrow-counterclockwise me-1"></i>Reabrir Pedido';
            });
    };

    function _aguardarElemento(id, callback, tentativas) {
        tentativas = tentativas || 10;
        var el = document.getElementById(id);
        if (el) { callback(el); return; }
        if (tentativas <= 0) {
            console.warn('[pedidos.js] ⚠️ Elemento não encontrado após tentativas:', id);
            return;
        }
        setTimeout(function () { _aguardarElemento(id, callback, tentativas - 1); }, 100);
    }

    function _configurarBotaoReabrir(id) {
        _aguardarElemento('btn-reabrir-pedido', function (btnReabrir) {
            var pedido = (window.AppRDO.pedidosCache || []).find(function (p) {
                return String(p.id || p._id || '').trim() === String(id).trim();
            });
            if (!pedido) { btnReabrir.classList.add('d-none'); return; }

            var statusAtual = _normalizarStatus(pedido.status);
            if (statusAtual === 'CONCLUIDO' || statusAtual === 'CANCELADO') {
                btnReabrir.classList.remove('d-none');
                btnReabrir.setAttribute('data-id', id);
            } else {
                btnReabrir.classList.add('d-none');
            }
        });
    }

    function _registrarEventosLinhas() {
        document.querySelectorAll('.btn-pedido-view').forEach(function (btn) {
            btn.onclick = function () {
                var id = btn.getAttribute('data-id');
                window.visualizarPedido(id);
                _configurarBotaoReabrir(id);
            };
        });

        document.querySelectorAll('.btn-pedido-edit').forEach(function (btn) {
            btn.onclick = function () { window.editarPedido(btn.getAttribute('data-id')); };
        });

        document.querySelectorAll('.btn-pedido-delete').forEach(function (btn) {
            btn.onclick = function () {
                if (typeof window.MasterAuth !== 'undefined' && typeof window.MasterAuth.abrir === 'function')
                    window.MasterAuth.abrir(btn.getAttribute('data-id'));
                else
                    console.error('[pedidos.js] ❌ MasterAuth não disponível');
            };
        });
    }

    function _garantirModal(modalId, callback) {
        if (document.getElementById(modalId)) { callback(true); return; }
        if (typeof window.loadModal === 'function') {
            window.loadModal('form_pedidos.html').then(function (ok) {
                callback(ok && !!document.getElementById(modalId));
            });
        } else {
            console.error('[pedidos.js] ❌ window.loadModal não definido e modal ausente:', modalId);
            callback(false);
        }
    }

    function _resolverMotivoCancelamento(pedido) {
        var raw = String(pedido.motivo_cancelamento || '').trim();
        if (!raw) return '';
        var sep = raw.includes(' | ') ? ' | ' : ',';
        var partes = raw.split(sep).map(function (v) { return v.trim(); });
        return partes.map(function (val) {
            var found = MOTIVOS_CANCELAMENTO.find(function (m) { return m.value === val; });
            return found ? found.label : val;
        }).join(', ');
    }

    window.RDO_PEDIDOS.calcularEspera = function (skipDisplayUpdate) {
        var tipo = (document.getElementById('edit-espera-tipo') || {}).value || 'sem_espera';
        var minutos = parseInt((document.getElementById('edit-espera-minutos') || {}).value || '0', 10) || 0;
        var valorBase = _parseMoeda((document.getElementById('edit-valor-base') || {}).value);

        var boxMin = document.getElementById('box-espera-minutos');
        var boxResumo = document.getElementById('box-espera-resumo');
        var elFinal = document.getElementById('edit-espera-valor-final');
        var elDisplay = document.getElementById('edit-valor-pedido-display');

        if (!skipDisplayUpdate && elDisplay) elDisplay.value = _formatarMoeda(valorBase);
        if (boxMin) boxMin.style.display = tipo === 'sem_espera' ? 'none' : 'block';

        if (tipo === 'sem_espera' || minutos <= 0) {
            if (elFinal) elFinal.textContent = _formatarMoeda(valorBase);
            if (boxResumo) boxResumo.style.display = 'none';
            return;
        }

        var pontos = tipo === 'ambos' ? 2 : 1;
        var franquiaTotal = FRANQUIA_MIN * pontos;
        var excedente = Math.max(0, minutos - franquiaTotal);
        var taxa = excedente * TARIFA_MIN;
        var total = valorBase + taxa;

        if (elFinal) elFinal.textContent = _formatarMoeda(total);

        function _setTxt(id, val) {
            var el = document.getElementById(id);
            if (el) el.textContent = val;
        }
        _setTxt('resumo-valor-original', _formatarMoeda(valorBase));
        _setTxt('resumo-minutos', excedente + ' min');
        _setTxt('resumo-tarifa', 'R$ ' + TARIFA_MIN.toFixed(2).replace('.', ','));
        _setTxt('resumo-taxa', _formatarMoeda(taxa));
        _setTxt('resumo-total', _formatarMoeda(total));

        if (boxResumo) boxResumo.style.display = excedente > 0 ? 'block' : 'none';
    };

    window.RDO_PEDIDOS.removerDoCache = function (id) {
        if (!window.AppRDO || !Array.isArray(window.AppRDO.pedidosCache)) return;
        var idStr = String(id || '').trim();
        window.AppRDO.pedidosCache = window.AppRDO.pedidosCache.filter(function (p) {
            return String(p.id || '').trim() !== idStr;
        });
        _renderizarTabela(window.AppRDO.pedidosCache);
        _dispararSync();
    };

    function _dispararSync() {
        window.pedidosState.dadosCarregados = false;
        window.pedidosState.emAcao = true;
        window.pedidosState.isFetching = false;
        _fetchPedidos();
    }

    window.RDO_PEDIDOS._renderizarTabelaPublico = function () {
        window.pedidosState.emAcao = true;
        _renderizarTabela(window.AppRDO.pedidosCache || []);
    };

    window.RDO_PEDIDOS.atualizarStatusLocal = function (pedidoId, statusFormatado, motoboyNome, motivoCancelamento) {
        var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var idNorm = String(pedidoId || '').trim().replace(/^RDO0*/i, '') || String(pedidoId || '').trim();

        var pedido = cache.find(function (p) {
            var pId = String(p.id || '').trim().replace(/^RDO0*/i, '') || String(p.id || '').trim();
            return pId === idNorm;
        });
        if (!pedido) return;

        pedido.status = statusFormatado;
        if (motoboyNome) pedido.motoboy = motoboyNome;
        if (motivoCancelamento !== undefined) pedido.motivo_cancelamento = motivoCancelamento;

        _renderizarTabela(window.AppRDO.pedidosCache);
    };

    window.RDO_PEDIDOS.salvarNovoPedido = function () {
        var btnSalvar = document.getElementById('btn-salvar-novo-pedido');
        var errEl = document.getElementById('novo-error-msg');

        if (errEl) errEl.classList.add('d-none');

        var dataPedidoInput = (document.getElementById('novo-data-pedido') || {}).value || '';
        var dataPedidoFormatada = dataPedidoInput ? dataPedidoInput.split('-').reverse().join('/') : '';

        var payload = {
            solicitante: (document.getElementById('novo-solicitante') || {}).value || '',
            contato: (document.getElementById('novo-contato') || {}).value || '',
            cliente: (document.getElementById('novo-cliente') || {}).value || '',
            mercadoria: (document.getElementById('novo-mercadoria') || {}).value || '',
            retorno: (document.getElementById('novo-retorno') || {}).value || 'Não',
            prioridade: (document.getElementById('novo-prioridade') || {}).value || '0',
            de: (document.getElementById('novo-de') || {}).value || '',
            para: (document.getElementById('novo-para') || {}).value || '',
            motoboy: (document.getElementById('novo-motoboy') || {}).value || '',
            valor_corrida: _parseMoeda((document.getElementById('novo-valor-pedido') || {}).value),
            observacao: (document.getElementById('novo-obs') || {}).value || '',
            data_pedido: dataPedidoFormatada,
            status: 'PENDENTE',
            situacao_financeira: 'pendente'
        };

        if (!payload.solicitante) {
            if (errEl) { errEl.textContent = 'Informe o solicitante.'; errEl.classList.remove('d-none'); }
            return;
        }

        _setBotaoLoading(btnSalvar, true);

        API.call('createpedido', payload)
            .then(function (res) {
                if (res && res.status === 'error') throw new Error(res.message || 'Erro ao criar');

                var novoPedido = (res && (res.pedido || res.data)) || payload;

                var modalEl = document.getElementById('modalNovoPedido');
                if (modalEl) {
                    var inst = bootstrap.Modal.getInstance(modalEl);
                    if (inst) inst.hide();
                }

                if (typeof window.EventBus !== 'undefined') {
                    var chaveEmit = pedidoId + '_' + valorFinal;
                    window._ultimosEmitsPedido = window._ultimosEmitsPedido || {};
                    var agora = Date.now();

                    if (!window._ultimosEmitsPedido[chaveEmit] || (agora - window._ultimosEmitsPedido[chaveEmit]) > 1000) {
                        window._ultimosEmitsPedido[chaveEmit] = agora;
                        window.EventBus.emit('pedido:atualizado', {
                            id: pedidoId,
                            valor_corrida: valorBase,
                            valor_total: valorBase,
                            valor_final: valorFinal,
                            motoboy: payload.motoboy
                        });
                    }
                } else {
                    if (Array.isArray(window.AppRDO.pedidosCache))
                        window.AppRDO.pedidosCache.push(novoPedido);
                    _renderizarTabela(window.AppRDO.pedidosCache);
                }

                if (typeof Swal !== 'undefined')
                    Swal.fire({
                        icon: 'success', title: 'Pedido criado!',
                        toast: true, timer: 2000, position: 'top-end', showConfirmButton: false
                    });
            })
            .catch(function (err) {
                console.error('[pedidos.js] ❌ salvarNovoPedido:', err);
                if (errEl) { errEl.textContent = err.message || 'Falha ao criar.'; errEl.classList.remove('d-none'); }
            })
            .finally(function () {
                _setBotaoLoading(btnSalvar, false, 'bi bi-check-lg', 'Salvar');
            });
    };

    window.visualizarPedido = function (id) {
        var pedido = (window.AppRDO.pedidosCache || []).find(function (p) {
            return String(p.id || p._id || '').trim() === String(id).trim();
        });
        if (!pedido) { console.error('[pedidos.js] ❌ Pedido não encontrado:', id); return; }

        _garantirModal('modalPedidoDetalhes', function (ok) {
            if (!ok) { console.error('[pedidos.js] ❌ #modalPedidoDetalhes indisponível'); return; }

            var modalEl = document.getElementById('modalPedidoDetalhes');
            var valorBase = _resolverValor(pedido);
            var taxaNum = _parseMoeda(pedido.taxa_espera);
            var finalNum = _parseMoeda(pedido.valor_final) || valorBase;
            var statusAtual = _normalizarStatus(pedido.status);

            function _s(elId, val) {
                var el = document.getElementById(elId);
                if (el) el.value = val != null ? String(val) : '';
                else console.warn('[pedidos.js] ⚠️ Campo ausente:', elId);
            }

            var tituloEl = document.getElementById('detalhe-titulo');
            if (tituloEl) tituloEl.textContent = _formatarIdServico(id);

            _s('det-pedido-id-raw', id);
            _s('det-status-raw', statusAtual);
            _s('det-data-pedido', _formatarDataExibicao(_extrairDataPedido(pedido)));
            _s('det-data', _resolverDataLancamento(pedido) || _formatarDataExibicao(pedido.updated_at));
            _s('det-horario', _resolverHoraPedido(pedido));
            _s('det-contato', pedido.contato || '—');
            _s('det-cliente', _resolverNomeCliente(pedido));
            _s('det-mercadoria', pedido.mercadoria || '—');
            _s('det-retorno', pedido.retorno || 'Não');
            _s('det-prioridade', _labelPrioridade(pedido.prioridade));
            _s('det-de', pedido.de || '—');
            _s('det-para', pedido.para || '—');
            _s('det-motoboy', _resolverMotoboy(pedido) || '—');
            _s('det-status', statusAtual);
            _s('det-valor-original', _formatarMoeda(valorBase));
            _s('det-taxa-espera', _formatarMoeda(taxaNum));
            _s('det-valor-final', _formatarMoeda(finalNum));
            _s('det-espera-tipo', pedido.espera_tipo || 'sem_espera');
            _s('det-espera-minutos', pedido.espera_minutos || '0');
            _s('det-obs', pedido.observacao || '');

            var cancelamentoBox = document.getElementById('det-cancelamento-box');
            if (cancelamentoBox) {
                if (statusAtual === 'CANCELADO') {
                    _s('det-motivo-cancelamento', _resolverMotivoCancelamento(pedido) || 'Não informado');
                    cancelamentoBox.style.display = 'block';
                } else {
                    cancelamentoBox.style.display = 'none';
                }
            }

            _toggleBotaoEditarDetalhes(statusAtual);

            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        });
    };

    function _toggleBotaoEditarDetalhes(statusAtual) {
        var btnEditar = document.getElementById('btn-editar-pedido-detalhes');
        if (!btnEditar) return;

        var podeEditar = statusAtual === 'PENDENTE' || statusAtual === 'EM_ROTA';

        btnEditar.classList.toggle('d-none', !podeEditar);
        btnEditar.disabled = !podeEditar;
    }

    function _toggleBotaoSalvarEdicao(statusAtual) {
        var btnSalvar = document.getElementById('btn-salvar-edicao');
        if (!btnSalvar) return;

        var podeEditar = statusAtual === 'PENDENTE' || statusAtual === 'EM_ROTA';

        btnSalvar.classList.toggle('d-none', !podeEditar);
        btnSalvar.disabled = !podeEditar;
    }

    function _ativarDestaqueValor() {
        var elValor = document.getElementById('edit-valor-pedido-display');
        if (!elValor) return;

        elValor.classList.add('valor-destaque-piscando');

        function _removerDestaque() {
            elValor.classList.remove('valor-destaque-piscando');
            elValor.removeEventListener('focus', _removerDestaque);
            elValor.removeEventListener('mousedown', _removerDestaque);
        }

        elValor.addEventListener('focus', _removerDestaque);
        elValor.addEventListener('mousedown', _removerDestaque);

        var modalEl = document.getElementById('modalEditarPedido');
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function onHide() {
                _removerDestaque();
                modalEl.removeEventListener('hidden.bs.modal', onHide);
            });
        }
    }

    window.editarPedido = function (id) {
        var pedido = (window.AppRDO.pedidosCache || []).find(function (p) {
            return String(p.id || p._id || '').trim() === String(id).trim();
        });
        if (!pedido) { console.error('[pedidos.js] ❌ Pedido não encontrado:', id); return; }

        _garantirModal('modalEditarPedido', function (ok) {
            if (!ok) { console.error('[pedidos.js] ❌ #modalEditarPedido indisponível'); return; }

            var modalEl = document.getElementById('modalEditarPedido');

            document.querySelectorAll('.modal.show').forEach(function (m) {
                var inst = bootstrap.Modal.getInstance(m);
                if (inst) inst.hide();
            });

            function _s(elId, val) {
                var el = document.getElementById(elId);
                if (el) el.value = val != null ? String(val) : '';
                else console.warn('[pedidos.js] ⚠️ Campo ausente:', elId);
            }

            var valor = _resolverValor(pedido);

            // 🔒 Data do Pedido: fixa, imutável, resolvida a partir do chat/registro original
            var dataPedidoISO = _extrairDataPedido(pedido);
            var dataPedidoExibicao = _formatarDataExibicao(dataPedidoISO);
            if (!dataPedidoExibicao || dataPedidoExibicao === '—') {
                dataPedidoExibicao = _resolverDataFallback(pedido);
            }

            // ✏️ Data do Lançamento: campo editável (armazenado na coluna "data" da planilha)
            var dataLancamentoExibicao = _resolverDataLancamento(pedido) || dataPedidoExibicao;

            var hora = _resolverHoraPedido(pedido);
            var rotaDe = String(pedido.de || pedido.origem || pedido.endereco_coleta || '').trim();
            var rotaPara = String(pedido.para || pedido.destino || pedido.endereco_entrega || '').trim();
            var statusAtual = _normalizarStatus(pedido.status) || 'PENDENTE';
            _toggleBotaoSalvarEdicao(statusAtual);

            _s('edit-pedido-id', id);
            _s('edit-valor-base', valor.toFixed(2));
            _s('edit-solicitante', pedido.solicitante || '');
            _s('edit-contato', pedido.contato || '');
            _s('edit-data-pedido', dataPedidoExibicao || '');          // 🆕 somente leitura
            _s('edit-data-lancamento', dataLancamentoExibicao || '');   // 🆕 editável
            _s('edit-horario', hora !== '—' ? hora : '');
            _s('edit-de', rotaDe);
            _s('edit-para', rotaPara);
            _s('edit-obs', pedido.observacao || '');
            _s('edit-valor-pedido-display', _formatarMoeda(valor));
            _s('edit-status-atual', statusAtual);
            _s('edit-espera-tipo', pedido.espera_tipo || 'sem_espera');
            _s('edit-espera-minutos', pedido.espera_minutos || '');

            _s('edit-cliente', _resolverNomeCliente(pedido));
            _s('edit-mercadoria', pedido.mercadoria || '');
            _s('edit-retorno', String(pedido.retorno || 'Não').trim());
            _s('edit-prioridade', String(pedido.prioridade != null ? pedido.prioridade : '0').trim());

            var selectMotoboy = document.getElementById('edit-motoboy');
            if (selectMotoboy) {
                _carregarMotoboysDropdown(selectMotoboy, _resolverMotoboy(pedido));
            } else {
                console.warn('[pedidos.js] ⚠️ Campo ausente: edit-motoboy');
            }
            _s('edit-status', statusAtual);

            var tituloEl = document.getElementById('editar-titulo');
            if (tituloEl) tituloEl.textContent = _formatarIdServico(id);

            var errEl = document.getElementById('edit-error-msg');
            if (errEl) errEl.classList.add('d-none');

            setTimeout(function () {
                if (typeof window.RDO_PEDIDOS.calcularEspera === 'function')
                    window.RDO_PEDIDOS.calcularEspera();
                bootstrap.Modal.getOrCreateInstance(modalEl).show();
                _ativarDestaqueValor();
            }, 50);
        });
    };

    window.RDO_PEDIDOS.salvarEdicao = function () {
    var numServico = (document.getElementById('edit-numero-servico') || document.getElementById('det-numero-servico') || {}).value || '';
    var idPedido = (document.getElementById('edit-id-pedido') || {}).value || '';
    var dataLancamento = (document.getElementById('edit-data-lancamento') || {}).value || '';
    
    if (numServico && idPedido && dataLancamento) {
        var descricaoFormatada = 'N.Serviço RDO' + numServico + ' - ' + dataLancamento;
        var observacaoFormatada = 'Pedido ID: ' + idPedido + ' | Serviço: ' + numServico;
        
        var elDesc = document.getElementById('edit-descricao');
        if (elDesc) elDesc.value = descricaoFormatada;
        
        var elObs = document.getElementById('edit-observacao');
        if (elObs) elObs.value = observacaoFormatada;
    }
        var btnSalvar = document.getElementById('btn-salvar-edicao');
        var errEl = document.getElementById('edit-error-msg');

        if (btnSalvar && btnSalvar.disabled) return;

        if (errEl) errEl.classList.add('d-none');

        var pedidoId = (document.getElementById('edit-pedido-id') || {}).value || '';
        var valorBase = _parseMoeda((document.getElementById('edit-valor-base') || {}).value);
        var tipo = (document.getElementById('edit-espera-tipo') || {}).value || 'sem_espera';
        var minutos = parseInt((document.getElementById('edit-espera-minutos') || {}).value || '0', 10) || 0;

        if (!pedidoId) {
            if (errEl) { errEl.textContent = 'ID do pedido não encontrado.'; errEl.classList.remove('d-none'); }
            return;
        }

        var pontos = tipo === 'ambos' ? 2 : 1;
        var franquiaTotal = FRANQUIA_MIN * pontos;
        var excedente = (tipo !== 'sem_espera' && minutos > 0) ? Math.max(0, minutos - franquiaTotal) : 0;
        var taxa = excedente * TARIFA_MIN;
        var valorFinal = valorBase + taxa;

        var novoStatusEl = document.getElementById('edit-status');
        var novoStatus = novoStatusEl ? String(novoStatusEl.value || '').trim().toUpperCase() : '';

        var selectMotoboy = document.getElementById('edit-motoboy');
        var motoboyNome = selectMotoboy ? String(selectMotoboy.value || '').trim() : '';

        // 🔒 PROTEÇÃO: nunca sobrescreve o motoboy com vazio se já havia um valor salvo no cache
        if (!motoboyNome) {
            var pedidoCacheAtual = (Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [])
                .find(function (p) { return String(p.id || '').trim() === String(pedidoId).trim(); });
            if (pedidoCacheAtual && pedidoCacheAtual.motoboy) {
                motoboyNome = String(pedidoCacheAtual.motoboy).trim();
            }
        }
        var dataLancamento = (document.getElementById('edit-data-lancamento') || {}).value || '';

        var payload = {
            id: pedidoId,
            solicitante: (document.getElementById('edit-solicitante') || {}).value || '',
            contato: (document.getElementById('edit-contato') || {}).value || '',
            data_lancamento: dataLancamento,
            horario: (document.getElementById('edit-horario') || {}).value || '',
            de: (document.getElementById('edit-de') || {}).value || '',
            para: (document.getElementById('edit-para') || {}).value || '',
            observacao: (document.getElementById('edit-obs') || {}).value || '',
            espera_tipo: tipo,
            espera_minutos: minutos,
            taxa_espera: taxa,
            valor_base: valorBase,
            valor_corrida: valorBase,
            valor_total: valorBase,
            valor_final: valorFinal,
            mercadoria: (document.getElementById('edit-mercadoria') || {}).value || '',
            retorno: (document.getElementById('edit-retorno') || {}).value || 'Não',
            prioridade: (document.getElementById('edit-prioridade') || {}).value || '0',
            motoboy: motoboyNome
        };

        if (novoStatus) payload.status = novoStatus;

        _setBotaoLoading(btnSalvar, true);

        API.call('updatepedido', payload)
            .then(function (res) {
                if (res && res.status === 'error') throw new Error(res.message || 'Erro ao salvar');

                var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
                var pedido = cache.find(function (p) {
                    return String(p.id || '').trim() === String(pedidoId).trim();
                });
                if (pedido) {
                    Object.assign(pedido, {
                        solicitante: payload.solicitante,
                        contato: payload.contato,
                        data_lancamento: payload.data_lancamento,
                        horario: payload.horario,
                        de: payload.de,
                        para: payload.para,
                        observacao: payload.observacao,
                        espera_tipo: payload.espera_tipo,
                        espera_minutos: payload.espera_minutos,
                        taxa_espera: payload.taxa_espera,
                        valor_base: payload.valor_base,
                        valor_corrida: payload.valor_corrida,
                        valor_total: payload.valor_total,
                        valor_final: payload.valor_final,
                        mercadoria: payload.mercadoria,
                        retorno: payload.retorno,
                        prioridade: payload.prioridade,
                        motoboy: payload.motoboy
                    });
                    if (payload.status) pedido.status = payload.status;
                }

                _renderizarTabela(window.AppRDO.pedidosCache);

                var modalEl = document.getElementById('modalEditarPedido');
                if (modalEl) {
                    var inst = bootstrap.Modal.getInstance(modalEl);
                    if (inst) inst.hide();
                }

                if (typeof window.EventBus !== 'undefined') {
                    var chaveEmit = pedidoId + '_' + valorFinal;
                    window._ultimosEmitsPedido = window._ultimosEmitsPedido || {};
                    var agora = Date.now();

                    if (!window._ultimosEmitsPedido[chaveEmit] || (agora - window._ultimosEmitsPedido[chaveEmit]) > 1000) {
                        window._ultimosEmitsPedido[chaveEmit] = agora;
                        window.EventBus.emit('pedido:atualizado', {
                            id: pedidoId,
                            valor_corrida: valorBase,
                            valor_total: valorBase,
                            valor_final: valorFinal,
                            motoboy: payload.motoboy
                        });
                    }
                }

                if (typeof Swal !== 'undefined')
                    Swal.fire({
                        icon: 'success', title: 'Pedido atualizado!',
                        toast: true, timer: 2000, position: 'top-end', showConfirmButton: false
                    });
            })
            .catch(function (err) {
                console.error('[pedidos.js] ❌ salvarEdicao:', err);
                if (errEl) { errEl.textContent = err.message || 'Falha ao salvar.'; errEl.classList.remove('d-none'); }
            })
            .finally(function () {
                _setBotaoLoading(btnSalvar, false, 'bi bi-check-lg', 'SALVAR');
            });
    };

    window.RDO_PEDIDOS.onEditarValorInput = function (input) {
        var valor = _parseMoeda(input.value);
        var elBase = document.getElementById('edit-valor-base');
        if (elBase) elBase.value = valor;
        window.RDO_PEDIDOS.calcularEspera(true);
    };

    window.RDO_PEDIDOS.salvarValorPedido = function () {
        var btn = document.getElementById('btn-salvar-valor-pedido');
        _setBotaoLoading(btn, true);
        // salvarEdicao já cuida do loading do btn-salvar-edicao;
        // aqui só espelhamos visualmente no botão específico, se existir
        window.RDO_PEDIDOS.salvarEdicao();
        // libera o botão específico quando o modal fechar (edição concluída)
        var modalEl = document.getElementById('modalEditarPedido');
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function onHide() {
                _setBotaoLoading(btn, false, 'bi bi-check-lg', 'SALVAR');
                modalEl.removeEventListener('hidden.bs.modal', onHide);
            });
        }
    };

    async function _fetchComRetry(endpoint, tentativas) {
        tentativas = tentativas || 3;
        var ultimoErro;
        for (var i = 0; i < tentativas; i++) {
            try {
                var res = await API.call(endpoint);
                return res;
            } catch (err) {
                ultimoErro = err;
                var is502 = err && (
                    String(err.message || '').includes('502') ||
                    String(err.status || '').includes('502') ||
                    err.statusCode === 502
                );
                if (!is502 || i === tentativas - 1) throw err;
                await new Promise(function (r) { setTimeout(r, 800 * (i + 1)); });
            }
        }
        throw ultimoErro;
    }

    function _registrarEventos() {
        _bindSync();
        _bindOrdenacao();
        _bindBusca();
        _bindFiltroTipo();
        _bindFiltroStatus();
        _bindPaginacao();
        _bindModalMotoboy();
    }

    function _bindSync() {
        if (!els.btnSync) return;
        els.btnSync.onclick = function () {
            _dispararSync();
        };
    }

    function _bindOrdenacao() {
        if (!els.thead) return;
        els.thead.addEventListener('click', function (e) {
            var btn = e.target.closest('#btn-sort-data-pedidos');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            _toggleSort();
        });
    }

    function _bindBusca() {
        if (!els.inputBusca) return;

        var timeoutBusca = null;

        els.inputBusca.oninput = function () {
            clearTimeout(timeoutBusca);
            _spinFeedback();
            _toggleBtnClearBusca();

            timeoutBusca = setTimeout(function () {
                window.pedidosState.busca = els.inputBusca.value.trim();
                window.pedidosState.paginaAtual = 1;
                window.pedidosState.emAcao = true;
                _renderizarTabela(window.AppRDO.pedidosCache);
            }, 300);
        };

        if (els.btnClearBusca) {
            els.btnClearBusca.onclick = function () {
                els.inputBusca.value = '';
                window.pedidosState.busca = '';
                window.pedidosState.paginaAtual = 1;
                window.pedidosState.emAcao = true;
                _toggleBtnClearBusca();
                els.inputBusca.focus();
                _spinFeedback();
                _renderizarTabela(window.AppRDO.pedidosCache);
            };
        }

        _toggleBtnClearBusca();
    }

    function _bindFiltroTipo() {
        if (!els.btnFiltroTipo) return;

        var menu = document.getElementById('dropdown-filtro-menu');

        els.btnFiltroTipo.onclick = function (e) {
            e.stopPropagation();
            if (!menu) return;
            var aberto = menu.classList.contains('show');
            if (!aberto) _posicionarMenuFiltroMobile(els.btnFiltroTipo, menu);
            menu.classList.toggle('show', !aberto);
            els.btnFiltroTipo.setAttribute('aria-expanded', String(!aberto));
        };

        _bindEventosGlobaisFiltroTipo();
        _bindItensFiltroTipo(menu);
    }

    function _posicionarMenuFiltroMobile(btnFiltro, menu) {
        if (!menu) return;
        var isMobile = window.innerWidth <= 576;

        if (!isMobile) {
            menu.style.position = '';
            menu.style.top = '';
            menu.style.left = '';
            menu.style.right = '';
            menu.style.transform = '';
            return;
        }

        var rectBtn = btnFiltro.getBoundingClientRect();
        var menuWidth = Math.min(window.innerWidth * 0.92, 260);
        var margem = 8;

        var left = rectBtn.left;
        if (left + menuWidth > window.innerWidth - margem) {
            left = window.innerWidth - menuWidth - margem;
        }
        if (left < margem) left = margem;

        var top = rectBtn.bottom + 6;

        menu.style.position = 'fixed';
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';
        menu.style.right = 'auto';
        menu.style.width = menuWidth + 'px';
        menu.style.transform = 'none';
    }

    function _bindEventosGlobaisFiltroTipo() {
        if (window.RDO_PEDIDOS._globalFiltroBind) return;
        window.RDO_PEDIDOS._globalFiltroBind = true;

        window.addEventListener('resize', function () {
            var menuAtual = document.getElementById('dropdown-filtro-menu');
            var btnAtual = document.getElementById('btn-filtro-tipo');
            if (menuAtual && btnAtual && menuAtual.classList.contains('show')) {
                _posicionarMenuFiltroMobile(btnAtual, menuAtual);
            }
        });

        document.addEventListener('click', function (e) {
            var menuAtual = document.getElementById('dropdown-filtro-menu');
            var btnAtual = document.getElementById('btn-filtro-tipo');
            if (!menuAtual || !btnAtual) return;
            if (!btnAtual.contains(e.target) && !menuAtual.contains(e.target)) {
                menuAtual.classList.remove('show');
                btnAtual.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            var menuAtual = document.getElementById('dropdown-filtro-menu');
            var btnAtual = document.getElementById('btn-filtro-tipo');
            if (menuAtual) menuAtual.classList.remove('show');
            if (btnAtual) btnAtual.setAttribute('aria-expanded', 'false');
        });
    }

    function _bindItensFiltroTipo(menu) {
        if (!menu) return;

        menu.querySelectorAll('.dropdown-filtro-item').forEach(function (item) {
            item.onclick = function (e) {
                e.stopPropagation();

                var filtro = item.getAttribute('data-filtro');
                window.pedidosState.filtroCategoria = filtro;

                if (els.labelFiltroTipo) {
                    els.labelFiltroTipo.textContent = item.textContent.trim();
                }

                menu.querySelectorAll('.dropdown-filtro-item').forEach(function (el) {
                    el.classList.remove('active');
                });
                item.classList.add('active');
                menu.classList.remove('show');
                els.btnFiltroTipo.setAttribute('aria-expanded', 'false');

                window.pedidosState.paginaAtual = 1;
                window.pedidosState.emAcao = true;
                _spinFeedback();
                _renderizarTabela(window.AppRDO.pedidosCache);
            };
        });
    }

    function _bindFiltroStatus() {
        els.filtrosStatus.forEach(function (f) {
            if (!f.el) return;
            f.el.onclick = function () {
                els.filtrosStatus.forEach(function (fi) {
                    if (fi.el) fi.el.classList.remove('active');
                });
                f.el.classList.add('active');
                window.pedidosState.filtroStatus = f.status;
                window.pedidosState.paginaAtual = 1;
                window.pedidosState.emAcao = true;
                _spinFeedback();
                _renderizarTabela(window.AppRDO.pedidosCache);
            };
        });
    }

    function _bindPaginacao() {
        if (els.btnPrev) {
            els.btnPrev.onclick = function () {
                if (window.pedidosState.paginaAtual > 1) {
                    window.pedidosState.paginaAtual--;
                    window.pedidosState.emAcao = true;
                    _renderizarTabela(window.AppRDO.pedidosCache);
                }
            };
        }

        if (els.btnNext) {
            els.btnNext.onclick = function () {
                window.pedidosState.paginaAtual++;
                window.pedidosState.emAcao = true;
                _renderizarTabela(window.AppRDO.pedidosCache);
            };
        }
    }

    function _bindModalMotoboy() {
        if (window.RDO_PEDIDOS._motoboyModalBind) return;
        window.RDO_PEDIDOS._motoboyModalBind = true;

        document.addEventListener('show.bs.modal', function (e) {
            if (!e.target || e.target.id !== 'modalNovoPedido') return;
            var sel = document.getElementById('novo-motoboy');
            if (sel) _carregarMotoboysDropdown(sel, '');
        });

        document.addEventListener('shown.bs.modal', function (e) {
            if (!e.target || e.target.id !== 'modalNovoPedido') return;
            var sel = document.getElementById('novo-motoboy');
            var aindaCarregando = sel && (!sel.options.length || sel.options[0].textContent.includes('Carregando'));
            if (aindaCarregando) _carregarMotoboysDropdown(sel, '');
        });
    }

    window.RDO_PEDIDOS._eventBusHandlers = window.RDO_PEDIDOS._eventBusHandlers || null;

    function _registrarEventosEventBus() {
        if (typeof window.EventBus === 'undefined') { setTimeout(_registrarEventosEventBus, 300); return; }

        if (window.RDO_PEDIDOS._eventBusHandlers) return;

        var handlers = {
            'financeiro:situacaoAtualizada': function (dados) { },
            'pedido:excluido': function (dados) { },
            'chat:excluidoLogico': function (dados) { },
            'pedido:adicionado': function (novoPedido) {
                if (!window.AppRDO || !Array.isArray(window.AppRDO.pedidosCache) || !novoPedido) return;
                var idNovo = String(novoPedido.id || '').trim();
                var jaExiste = window.AppRDO.pedidosCache.some(function (p) {
                    return String(p.id || '').trim() === idNovo;
                });
                if (jaExiste) return;
                window.AppRDO.pedidosCache.push(novoPedido);
                _renderizarTabela(window.AppRDO.pedidosCache);
            },
            'pedido:cancelado': function (dados) { },
            'pedido:statusAtualizado': function (dados) { },
            'pedido:atualizado': function (dados) {
                var pedidoId = String(dados && dados.id || '').trim();
                if (!pedidoId) return;

                var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
                var pedido = cache.find(function (p) {
                    return String(p.id || '').trim() === pedidoId;
                });
                if (!pedido) return;

                var novoValor = dados.valor_final != null ? dados.valor_final
                    : dados.valor_total != null ? dados.valor_total
                        : dados.valor_corrida;

                if (novoValor != null) {
                    pedido.valor_total = novoValor;
                    pedido.valor_final = novoValor;
                    pedido.valor_corrida = novoValor;
                }
                if (dados.solicitante) pedido.solicitante = dados.solicitante;
                if (dados.cliente) pedido.cliente = dados.cliente;
                if (dados.motoboy) pedido.motoboy = dados.motoboy;
                if (dados.status) pedido.status = dados.status;
                if (dados.situacao_financeira) pedido.situacao_financeira = dados.situacao_financeira;

                var chat = _chatDoPedido(pedidoId);
                if (chat) {
                    if (dados.solicitante) chat.cliente = dados.solicitante;
                    if (dados.cliente) chat.cliente = dados.cliente;
                    if (dados.motoboy) chat.motoboy = dados.motoboy;
                    if (novoValor != null) chat.valor_corrida = novoValor;
                }

                _renderizarTabela(window.AppRDO.pedidosCache);
            }
        };

        Object.keys(handlers).forEach(function (evt) {
            window.EventBus.on(evt, handlers[evt]);
        });

        window.RDO_PEDIDOS._eventBusHandlers = handlers;
    }

    function _configurarBotaoCalendario() {
        var inputData = document.getElementById('filtro-data-pedidos');
        var btnCalendario = document.getElementById('btn-abrir-calendario-pedidos');
        if (!inputData || !btnCalendario) return;

        function _isMobile() {
            return window.innerWidth <= 576;
        }

        function _aplicarFiltroData(valor) {
            window.pedidosState.filtroData = valor || '';
            window.pedidosState.paginaAtual = 1;
            window.pedidosState.emAcao = true;
            btnCalendario.classList.toggle('tem-data', !!valor);
            _spinFeedback();
            _renderizarTabela(window.AppRDO.pedidosCache || []);
        }

        btnCalendario.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (_isMobile()) {
                inputData.style.position = 'fixed';
                inputData.style.top = '10px';
                inputData.style.right = '8px';
                inputData.style.left = 'auto';
                inputData.style.width = '1px';
                inputData.style.height = '1px';
            }

            try {
                if (typeof inputData.showPicker === 'function') {
                    inputData.showPicker();
                    return;
                }
            } catch (_) { }

            inputData.style.opacity = '0';
            inputData.style.pointerEvents = 'auto';
            inputData.focus();
            inputData.click();
        };

        inputData.onchange = function () {
            _aplicarFiltroData(inputData.value);
        };

        inputData.oninput = function () {
            if (!inputData.value) {
                _aplicarFiltroData('');
            }
        };
    }

    function _salvarCacheLocal(pedidos, chats) {
        try {
            localStorage.setItem(PEDIDOS_LS_KEY, JSON.stringify({
                pedidos: pedidos || [],
                chats: chats || [],
                salvoEm: Date.now()
            }));
        } catch (e) {
            console.warn('[pedidos.js] ⚠️ Falha ao salvar cache local:', e);
        }
    }

    function _lerCacheLocal() {
        try {
            var raw = localStorage.getItem(PEDIDOS_LS_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.pedidos)) return null;
            return parsed;
        } catch (e) {
            console.warn('[pedidos.js] ⚠️ Cache local corrompido, ignorando:', e);
            return null;
        }
    }

    function _configurarInfoHoverStatus() {
        var itens = Array.prototype.slice.call(document.querySelectorAll('.ped-status-action-item'));
        if (!itens.length) return;

        function _isMobile() {
            return window.innerWidth <= 767;
        }

        itens.forEach(function (item) {
            // 🔒 Evita registrar os mesmos listeners múltiplas vezes no mesmo elemento
            if (item.dataset.hoverBind === '1') return;
            item.dataset.hoverBind = '1';

            item.addEventListener('mouseenter', function () {
                if (_isMobile()) item.classList.add('mostrar-info');
            });
            item.addEventListener('mouseleave', function () {
                if (_isMobile()) item.classList.remove('mostrar-info');
            });
            item.addEventListener('touchstart', function () {
                if (!_isMobile()) return;
                itens.forEach(function (i) { if (i !== item) i.classList.remove('mostrar-info'); });
                item.classList.add('mostrar-info');
            }, { passive: true });
        });

        // 🔒 Listener global em document — registrado apenas uma vez por toda a sessão do módulo
        if (!window.RDO_PEDIDOS._touchOutsideBind) {
            window.RDO_PEDIDOS._touchOutsideBind = true;

            document.addEventListener('touchstart', function (e) {
                if (!_isMobile()) return;
                if (!e.target.closest('.ped-status-action-item')) {
                    document.querySelectorAll('.ped-status-action-item.mostrar-info').forEach(function (i) {
                        i.classList.remove('mostrar-info');
                    });
                }
            }, { passive: true });
        }
    }

    window.RDO_PEDIDOS.abrirEdicaoDoDetalhe = function () {
        var idEl = document.getElementById('det-pedido-id-raw');
        var statusEl = document.getElementById('det-status-raw');
        var id = idEl ? String(idEl.value || '').trim() : '';
        var status = statusEl ? String(statusEl.value || '').trim().toUpperCase() : '';

        if (!id) {
            console.error('[pedidos.js] ❌ ID não encontrado no modal de detalhes');
            return;
        }

        // 🔒 Trava de segurança: impede edição de pedidos finalizados
        if (status === 'CONCLUIDO' || status === 'CANCELADO') {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Pedido finalizado',
                    text: 'Não é possível editar um pedido Concluído ou Cancelado.'
                });
            }
            return;
        }

        var modalDetalhe = document.getElementById('modalPedidoDetalhes');
        if (modalDetalhe) {
            var inst = bootstrap.Modal.getInstance(modalDetalhe);
            if (inst) inst.hide();
        }

        window.editarPedido(id);
    };

    window.RDO_PEDIDOS._initEmAndamento = false;
    window.RDO_PEDIDOS._jaInicializado = false;

    window.initPedidos = function () {
        console.log('[pedidos.js] ========== initPedidos ==========');

        // 🔒 Guarda contra chamadas concorrentes/duplicadas (ex.: scroll, resize,
        // reflow, router disparando o init da página mais de uma vez)
        if (window.RDO_PEDIDOS._initEmAndamento) {
            console.warn('[pedidos.js] ⚠️ initPedidos já está em execução — chamada ignorada');
            return;
        }

        if (!document.getElementById('corpo-tabela-pedidos')) {
            console.warn('[pedidos.js] Tabela não encontrada — abortando init');
            return;
        }

        window.RDO_PEDIDOS._initEmAndamento = true;

        // 🔒 Se já foi inicializado antes, apenas garante que os binds e eventos
        // ainda apontam para os elementos corretos (idempotente), sem resetar
        // o estado de paginação/filtros do usuário e sem forçar novo loading visual.
        var reinicializacao = window.RDO_PEDIDOS._jaInicializado;

        if (!reinicializacao) {
            window.pedidosState.paginaAtual = 1;
            window.pedidosState.isFetching = false;
            window.pedidosState.dadosCarregados = false;
            window.pedidosState.emAcao = false;
            window.pedidosState.sortDesc = true;
        }

        if (window.pedidosState.intervaloId) clearInterval(window.pedidosState.intervaloId);

        if (!_bind()) {
            window.RDO_PEDIDOS._initEmAndamento = false;
            return;
        }

        _toggleBtnClearBusca();
        _registrarEventos();
        _registrarEventosEventBus();
        _configurarBotaoCalendario();
        _configurarInfoHoverStatus();

        if (reinicializacao) {
            // ✅ Já tínhamos dados carregados antes: apenas re-renderiza a tabela
            // existente no cache, SEM mostrar overlay de loading e SEM refetch.
            console.log('[pedidos.js] Reinicialização detectada — usando cache em memória, sem novo fetch.');
            _renderizarTabela(window.AppRDO.pedidosCache || []);
            window.RDO_PEDIDOS._initEmAndamento = false;
            return;
        }

        var cacheLocal = _lerCacheLocal();
        if (cacheLocal) {
            window.AppRDO.pedidosCache = cacheLocal.pedidos;
            window.AppRDO.chatsCache = cacheLocal.chats;
            window.pedidosState.dadosCarregados = true;
            _renderizarTabela(window.AppRDO.pedidosCache);
            _fetchPedidos({ silencioso: true }).finally(function () {
                window.RDO_PEDIDOS._jaInicializado = true;
                window.RDO_PEDIDOS._initEmAndamento = false;
            });
        } else {
            _fetchPedidos().finally(function () {
                window.RDO_PEDIDOS._jaInicializado = true;
                window.RDO_PEDIDOS._initEmAndamento = false;
            });
        }

        console.log('[pedidos.js] Pronto!');
    };

})();

// [CORREÇÃO DEFINITIVA: DROPDOWN E FILTRO DE MOTOBOYS]
window.popularDropdownMotoboys = function(pedidos) {
    var menuEl = document.getElementById("dropdown-filtro-menu") || document.querySelector(".dropdown-filtro-menu");
    var btnFiltro = document.getElementById("btn-filtro-tipo") || document.querySelector("#btn-filtro-tipo");
    
    if (!menuEl) return;

    // Extrai motoboys únicos do array de pedidos de forma limpa
    var motoboysSet = new Set();
    (pedidos || window.AppRDO && window.AppRDO.pedidosCache || []).forEach(function(p) {
        var m = String(p.motoboy || p.colaborador || p.nome_motoboy || "").trim();
        if (m && m.toLowerCase() !== "todos" && m !== "") {
            motoboysSet.add(m);
        }
    });

    var listaMotoboys = Array.from(motoboysSet).sort();
    console.log("🛵 Motoboys encontrados para o menu:", listaMotoboys);

    // Reconstrói o HTML do dropdown mantendo a opção 'Todos'
    var htmlDropdown = `<div class="dropdown-filtro-item active" data-filtro="todos"><i class="bi bi-people"></i> Todos os Motoboys</div>`;
    
    listaMotoboys.forEach(function(nomeMotoboy) {
        htmlDropdown += `<div class="dropdown-filtro-item" data-filtro="${nomeMotoboy}"><i class="bi bi-person"></i> ${nomeMotoboy}</div>`;
    });

    menuEl.innerHTML = htmlDropdown;

    // Adiciona o evento de clique em cada item do dropdown gerado
    menuEl.querySelectorAll(".dropdown-filtro-item").forEach(function(item) {
        item.onclick = function(e) {
            e.stopPropagation();
            var filtro = item.getAttribute("data-filtro");
            
            menuEl.querySelectorAll(".dropdown-filtro-item").forEach(function(el) {
                el.classList.remove("active");
            });
            item.classList.add("active");

            menuEl.classList.remove("show");
            menuEl.style.display = "none";
            if (btnFiltro) {
                btnFiltro.setAttribute("aria-expanded", "false");
                btnFiltro.innerHTML = '<i class="bi bi-person-badge"></i> ' + (filtro === "todos" ? "Motoboy" : filtro);
            }

            // Atualiza o estado global e filtra a tabela
            window.pedidosState = window.pedidosState || {};
            window.pedidosState.filtroMotoboy = (filtro === "todos") ? "" : filtro;
            window.pedidosState.paginaAtual = 1;

            if (typeof window._renderizarTabela === "function") {
                window._renderizarTabela(window.AppRDO.pedidosCache);
            } else if (typeof window.renderizarTabela === "function") {
                window.renderizarTabela(window.AppRDO.pedidosCache);
            }
        };
    });
};

// Vincula a chamada automática logo após o carregamento dos pedidos
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
        if (window.AppRDO && window.AppRDO.pedidosCache) {
            window.popularDropdownMotoboys(window.AppRDO.pedidosCache);
        }
    }, 1000);
});


// [INTEGRAÇÃO DEFINITIVA DE MOTOBOYS - RDO EXPRESS]
window.carregarDropdownMotoboysGarantido = function(pedidos) {
    var menuEl = document.getElementById("dropdown-filtro-menu") || document.querySelector(".dropdown-filtro-menu") || document.querySelector("[id*='motoboy']");
    var btnFiltro = document.getElementById("btn-filtro-tipo") || document.querySelector("#btn-filtro-tipo");
    
    if (!menuEl) {
        console.warn("⚠️ Elemento do menu dropdown de motoboys não encontrado no DOM.");
        return;
    }

    var cache = pedidos || (window.AppRDO && window.AppRDO.pedidosCache) || [];
    var motoboysSet = new Set();

    cache.forEach(function(p) {
        var m = String(p.motoboy || p.colaborador || p.nome_motoboy || "").trim();
        if (m && m.toLowerCase() !== "todos" && m !== "") {
            motoboysSet.add(m);
        }
    });

    var lista = Array.from(motoboysSet).sort();
    console.log("🛵 Motoboys mapeados para o filtro:", lista);

    var html = '<div class="dropdown-filtro-item active" data-filtro="todos"><i class="bi bi-people"></i> Todos os Motoboys</div>';
    
    lista.forEach(function(nome) {
        html += '<div class="dropdown-filtro-item" data-filtro="' + nome + '"><i class="bi bi-person"></i> ' + nome + '</div>';
    });

    menuEl.innerHTML = html;

    // Associa o evento de clique a cada item gerado
    menuEl.querySelectorAll(".dropdown-filtro-item").forEach(function(item) {
        item.onclick = function(e) {
            e.stopPropagation();
            var filtro = item.getAttribute("data-filtro");

            menuEl.querySelectorAll(".dropdown-filtro-item").forEach(function(el) {
                el.classList.remove("active");
            });
            item.classList.add("active");

            menuEl.classList.remove("show");
            menuEl.style.display = "none";
            if (btnFiltro) {
                btnFiltro.setAttribute("aria-expanded", "false");
                btnFiltro.innerHTML = '<i class="bi bi-person-badge"></i> ' + (filtro === "todos" ? "Motoboy" : filtro);
            }

            // Atualiza o estado e renderiza a tabela filtrada
            window.pedidosState = window.pedidosState || {};
            window.pedidosState.filtroMotoboy = (filtro === "todos") ? "" : filtro;
            window.pedidosState.paginaAtual = 1;

            if (typeof window._renderizarTabela === "function") {
                window._renderizarTabela(cache);
            } else if (typeof window.renderizarTabela === "function") {
                window.renderizarTabela(cache);
            }
        };
    });
};

// Dispara o preenchimento assim que o documento estiver pronto
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
        if (window.AppRDO && window.AppRDO.pedidosCache) {
            window.carregarDropdownMotoboysGarantido(window.AppRDO.pedidosCache);
        }
    }, 800);
});


// [FILTRO DE MOTOBOY DEFINITIVO - RDO EXPRESS]
document.addEventListener("click", function(e) {
    var item = e.target.closest(".dropdown-filtro-item, [data-filtro]");
    if (!item) return;

    var filtro = item.getAttribute("data-filtro");
    if (filtro === null || filtro === undefined) return;

    // Atualiza o estado do filtro
    window.pedidosState = window.pedidosState || {};
    window.pedidosState.filtroMotoboy = (filtro === "todos" || filtro === "") ? "" : filtro;
    window.pedidosState.paginaAtual = 1;

    console.log("🛵 [FILTRO] Aplicando filtro para o motoboy:", window.pedidosState.filtroMotoboy || "TODOS");

    // Fecha o menu dropdown visualmente
    var menu = item.closest(".dropdown-menu, .dropdown-filtro-menu");
    if (menu) {
        menu.style.display = "none";
        menu.classList.remove("show");
    }

    var btn = document.getElementById("btn-filtro-tipo") || document.querySelector("#btn-filtro-tipo");
    if (btn) {
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = '<i class="bi bi-person-badge"></i> ' + (window.pedidosState.filtroMotoboy ? window.pedidosState.filtroMotoboy : "Motoboy");
    }

    // Pega o cache de pedidos e aplica a função de renderização existente
    var cache = (window.AppRDO && window.AppRDO.pedidosCache) || window.pedidosCache || [];
    if (cache.length > 0) {
        // Filtra os dados no cache aplicando a regra do motoboy antes de renderizar, caso a função nativa precise
        var dadosFiltrados = cache.filter(function(p) {
            if (!window.pedidosState.filtroMotoboy) return true;
            var mBanco = String(p.motoboy || p.colaborador || p.nome_motoboy || "").trim().toLowerCase();
            var mDesejado = window.pedidosState.filtroMotoboy.trim().toLowerCase();
            return mBanco === mDesejado;
        });

        if (typeof window._renderizarTabela === "function") {
            window._renderizarTabela(dadosFiltrados);
        } else if (typeof window.renderizarTabela === "function") {
            window.renderizarTabela(dadosFiltrados);
        }
    }
}, true);


// [SOLUÇÃO DEFINITIVA RDO EXPRESS: DROPDOWN, FILTRO E CLIENTE COMPLETO]
(function() {
    // 1. Garante o comportamento limpo do Dropdown e Filtro de Motoboy
    document.addEventListener("click", function(e) {
        var btn = e.target.closest("#btn-filtro-tipo, .dropdown-toggle");
        var item = e.target.closest(".dropdown-filtro-item, [data-filtro]");

        // Se clicou no botão do dropdown, abre/fecha e popula os motoboys
        if (btn) {
            e.stopPropagation();
            var menu = btn.nextElementSibling || document.querySelector(".dropdown-filtro-menu, .dropdown-menu");
            if (!menu) return;

            var isOpen = menu.style.display === "block" || menu.classList.contains("show");
            
            // Fecha outros menus abertos
            document.querySelectorAll(".dropdown-filtro-menu, .dropdown-menu").forEach(function(m) {
                m.style.display = "none";
                m.classList.remove("show");
            });

            if (!isOpen) {
                menu.style.display = "block";
                menu.classList.add("show");
                
                // Popula a lista de motoboys dinamicamente a partir do cache
                var cache = (window.AppRDO && window.AppRDO.pedidosCache) || window.pedidosCache || [];
                var motoboysSet = new Set();
                cache.forEach(function(p) {
                    var m = String(p.motoboy || p.colaborador || p.nome_motoboy || "").trim();
                    if (m && m.toLowerCase() !== "todos" && m !== "") {
                        motoboysSet.add(m);
                    }
                });

                var lista = Array.from(motoboysSet).sort();
                var html = '<div class="dropdown-filtro-item active" data-filtro="todos" style="padding: 8px 12px; cursor: pointer;"><i class="bi bi-people"></i> Todos os Motoboys</div>';
                
                lista.forEach(function(nome) {
                    html += '<div class="dropdown-filtro-item" data-filtro="' + nome + '" style="padding: 8px 12px; cursor: pointer;"><i class="bi bi-person"></i> ' + nome + '</div>';
                });
                menu.innerHTML = html;
            } else {
                menu.style.display = "none";
                menu.classList.remove("show");
            }
            return;
        }

        // Se clicou em um item da lista de motoboys para filtrar
        if (item) {
            e.stopPropagation();
            var filtro = item.getAttribute("data-filtro");
            if (filtro === null) return;

            window.pedidosState = window.pedidosState || {};
            window.pedidosState.filtroMotoboy = (filtro === "todos" || filtro === "") ? "" : filtro;
            window.pedidosState.paginaAtual = 1;

            var menu = item.closest(".dropdown-menu, .dropdown-filtro-menu");
            if (menu) {
                menu.style.display = "none";
                menu.classList.remove("show");
            }

            var btnFiltro = document.getElementById("btn-filtro-tipo") || document.querySelector("#btn-filtro-tipo");
            if (btnFiltro) {
                btnFiltro.innerHTML = '<i class="bi bi-person-badge"></i> ' + (window.pedidosState.filtroMotoboy ? window.pedidosState.filtroMotoboy : "Motoboy");
            }

            // Dispara a renderização filtrando os dados
            var cache = (window.AppRDO && window.AppRDO.pedidosCache) || window.pedidosCache || [];
            if (cache.length > 0 && typeof window._renderizarTabela === "function") {
                window._renderizarTabela(cache);
            } else if (cache.length > 0 && typeof window.renderizarTabela === "function") {
                window.renderizarTabela(cache);
            }
        }
    });
})();
