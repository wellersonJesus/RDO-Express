(function () {

    var state = {
        cache: [],
        caixaValoresVisiveis: false,
        tabAtual: 'todos',
        filtroTipo: 'todos',
        filtroSituacao: 'todos',
        filtroBusca: '',
        fetching: false,
        sortDataDesc: true,
        todos: { pagina: 1, porPagina: 15, totalPag: 1 },
        caixa: { pagina: 1, porPagina: 10, totalPag: 1, dataInicio: '', dataFim: '', dadosFiltrados: [] },
        extrato: { pagina: 1, porPagina: 20, totalPag: 1, periodo: 'diario', dataRef: '', dados: [] }
    };

    window.financeiroState = state;

    var els = {};

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str.toString()));
        return div.innerHTML;
    }

    function parseData(raw) {
        if (!raw) return { iso: '', br: '', display: '' };
        raw = raw.toString().trim();
        var d, m, y;
        if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
            var dt = new Date(raw);
            if (!isNaN(dt.getTime())) {
                d = String(dt.getUTCDate()).padStart(2, '0');
                m = String(dt.getUTCMonth() + 1).padStart(2, '0');
                y = String(dt.getUTCFullYear());
                return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
            }
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            var parts = raw.split('-');
            y = parts[0]; m = parts[1]; d = parts[2];
            return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
            var p = raw.split('/');
            d = p[0]; m = p[1]; y = p[2];
            return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
        }
        if (/^\d{2}\/\d{2}\/\d{2}$/.test(raw)) {
            var p2 = raw.split('/');
            d = p2[0]; m = p2[1]; y = '20' + p2[2];
            return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + p2[2] };
        }
        if (/^\d{13,}$/.test(raw)) {
            var dt2 = new Date(parseInt(raw));
            if (!isNaN(dt2.getTime())) {
                d = String(dt2.getDate()).padStart(2, '0');
                m = String(dt2.getMonth() + 1).padStart(2, '0');
                y = String(dt2.getFullYear());
                return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
            }
        }
        if (/^\d{4}-\d{2}-\d{2}\s/.test(raw)) {
            var parts2 = raw.substring(0, 10).split('-');
            y = parts2[0]; m = parts2[1]; d = parts2[2];
            return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
        }
        return { iso: '', br: raw, display: raw };
    }

    function normalizarRegistro(d) {
        var tipoRaw = (d.tipo || '').toString().trim().toUpperCase();
        var tipoNorm = 'entrada';
        if (tipoRaw === 'DESPESA' || tipoRaw === 'SAIDA' || tipoRaw === 'SA\u00cdDA' || tipoRaw === 'saida') {
            tipoNorm = 'saida';
        } else if (tipoRaw === 'RECEITA' || tipoRaw === 'ENTRADA' || tipoRaw === 'entrada') {
            tipoNorm = 'entrada';
        }
        var dataObj = parseData(d.data);
        var valorRaw = d.valor;
        var valorNorm = 0;
        if (typeof valorRaw === 'number') {
            valorNorm = valorRaw;
        } else if (typeof valorRaw === 'string') {
            var cleaned = valorRaw.replace('R$', '').replace(/\s/g, '');
            if (cleaned.indexOf(',') !== -1 && cleaned.indexOf('.') !== -1) {
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else if (cleaned.indexOf(',') !== -1) {
                cleaned = cleaned.replace(',', '.');
            }
            valorNorm = parseFloat(cleaned) || 0;
        }
        var situacao = (d.situacao || d.status || 'pendente').toString().trim().toLowerCase();
        return {
            id: d.id || '',
            idPedido: d.id_pedido || d.idPedido || '',
            dataISO: dataObj.iso,
            dataBR: dataObj.br,
            dataDisplay: dataObj.display,
            tipo: tipoNorm,
            descricao: d.descricao || '',
            valor: valorNorm,
            motoboy: d.motoboy || '-',
            situacao: situacao,
            categoria: d.categoria || '',
            pagamento: d.pagamento || d.forma_pagamento || '',
            observacao: d.observacao || d.obs || ''
        };
    }

    function bind() {
        els = {};
        els.btnRefresh = document.getElementById('btn-refresh-fin');
        els.syncIcon = document.getElementById('sync-icon-fin');
        els.filtroBusca = document.getElementById('filtro-busca-fin');
        els.btnNovo = document.getElementById('btn-novo-fin');
        els.btnSortData = document.getElementById('btn-sort-data-todos');
        els.iconSortData = document.getElementById('icon-sort-data-todos');
        els.tbodyTodos = document.getElementById('tabela-fin-body-todos');
        els.pagInfoTodos = document.getElementById('fin-pag-info-todos');
        els.pagPrevTodos = document.getElementById('fin-pag-prev-todos');
        els.pagNextTodos = document.getElementById('fin-pag-next-todos');
        els.pagLabelTodos = document.getElementById('fin-pag-label-todos');
        els.caixaDataInicio = document.getElementById('caixa-data-inicio');
        els.caixaDataFim = document.getElementById('caixa-data-fim');
        els.btnFiltrarCaixa = document.getElementById('btn-filtrar-caixa');
        els.caixaCardEntradas = document.getElementById('caixa-card-entradas');
        els.caixaCardSaidas = document.getElementById('caixa-card-saidas');
        els.caixaCardRegistros = document.getElementById('caixa-card-registros');
        els.caixaListaDiaria = document.getElementById('caixa-lista-diaria');
        els.rdoPaySaldo = document.getElementById('rdo-pay-saldo');
        els.pagInfoCaixa = document.getElementById('fin-pag-info-caixa');
        els.pagPrevCaixa = document.getElementById('fin-pag-prev-caixa');
        els.pagNextCaixa = document.getElementById('fin-pag-next-caixa');
        els.pagLabelCaixa = document.getElementById('fin-pag-label-caixa');
        els.btnToggleCaixaVal = document.getElementById('btn-toggle-caixa-valores');
        els.iconToggleCaixaVal = document.getElementById('icon-toggle-caixa-val');
        els.extratoDataRef = document.getElementById('extrato-data-ref');
        els.btnGerarExtrato = document.getElementById('btn-gerar-extrato');
        els.extratoHeaderInfo = document.getElementById('extrato-header-info');
        els.extratoTitulo = document.getElementById('extrato-titulo-periodo');
        els.extratoSubtitulo = document.getElementById('extrato-subtitulo-periodo');
        els.extratoTotalEntradas = document.getElementById('extrato-total-entradas');
        els.extratoTotalSaidas = document.getElementById('extrato-total-saidas');
        els.extratoTotalSaldo = document.getElementById('extrato-total-saldo');
        els.tbodyExtrato = document.getElementById('tabela-fin-body-extrato');
        els.pagInfoExtrato = document.getElementById('fin-pag-info-extrato');
        els.pagPrevExtrato = document.getElementById('fin-pag-prev-extrato');
        els.pagNextExtrato = document.getElementById('fin-pag-next-extrato');
        els.pagLabelExtrato = document.getElementById('fin-pag-label-extrato');
    }

    function registrarEventos() {
        document.querySelectorAll('.fin-tab').forEach(function (tab) {
            tab.addEventListener('click', function (e) {
                e.preventDefault();
                var t = this.getAttribute('data-tab');
                if (!t) return;
                state.tabAtual = t;
                document.querySelectorAll('.fin-tab').forEach(function (el) {
                    el.classList.remove('active');
                });
                this.classList.add('active');
                document.querySelectorAll('.fin-tab-content').forEach(function (el) {
                    el.classList.remove('active');
                });
                var content = document.getElementById('fin-tab-content-' + t);
                if (content) content.classList.add('active');
                if (t === 'todos') renderTodos();
                if (t === 'caixa') renderCaixa();
                if (t === 'extrato') renderExtrato();
            });
        });

        if (els.filtroBusca) {
            var _buscaTimer = null;
            els.filtroBusca.addEventListener('input', function () {
                var self = this;
                if (_buscaTimer) clearTimeout(_buscaTimer);
                _buscaTimer = setTimeout(function () {
                    state.filtroBusca = self.value;
                    state.todos.pagina = 1;
                    renderTodos();
                }, 180);
            });
            els.filtroBusca.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (_buscaTimer) clearTimeout(_buscaTimer);
                    state.filtroBusca = this.value;
                    state.todos.pagina = 1;
                    renderTodos();
                }
            });
            els.filtroBusca.addEventListener('search', function () {
                if (!this.value) {
                    if (_buscaTimer) clearTimeout(_buscaTimer);
                    state.filtroBusca = '';
                    state.todos.pagina = 1;
                    renderTodos();
                }
            });
        }

        var wrapperFiltro = document.getElementById('dropdown-filtro-wrapper-fin');
        var btnFiltro = document.getElementById('btn-filtro-fin');
        var menuFiltro = document.getElementById('dropdown-filtro-menu-fin');
        var labelFiltro = document.getElementById('label-filtro-fin');
        var btnSubSituacao = document.getElementById('btn-sub-situacao-fin');
        var submenuSituacao = document.getElementById('submenu-situacao-fin');

        if (btnFiltro && menuFiltro && wrapperFiltro) {
            btnFiltro.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                wrapperFiltro.classList.toggle('open');
            });
            document.addEventListener('click', function (e) {
                if (!wrapperFiltro.contains(e.target)) {
                    wrapperFiltro.classList.remove('open');
                }
            });
            menuFiltro.querySelectorAll('.dropdown-filtro-item[data-filtro-tipo]').forEach(function (item) {
                item.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var tipo = this.getAttribute('data-filtro-tipo');
                    state.filtroTipo = tipo || 'todos';
                    state.todos.pagina = 1;
                    var labelMap = { todos: 'Todos', entrada: 'Receitas', saida: 'Despesas' };
                    if (labelFiltro) labelFiltro.textContent = labelMap[state.filtroTipo] || 'Todos';
                    menuFiltro.querySelectorAll('.dropdown-filtro-item[data-filtro-tipo]').forEach(function (el) {
                        el.classList.remove('active');
                    });
                    this.classList.add('active');
                    wrapperFiltro.classList.remove('open');
                    renderTodos();
                });
            });
            if (btnSubSituacao) {
                var parentHasSub = btnSubSituacao.closest('.dropdown-filtro-item-has-sub');
                btnSubSituacao.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (parentHasSub) {
                        parentHasSub.classList.toggle('sub-open');
                    }
                });
            }
            if (submenuSituacao) {
                submenuSituacao.querySelectorAll('.dropdown-filtro-subitem[data-filtro-situacao]').forEach(function (item) {
                    item.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        state.filtroSituacao = this.getAttribute('data-filtro-situacao') || 'todos';
                        state.todos.pagina = 1;
                        submenuSituacao.querySelectorAll('.dropdown-filtro-subitem').forEach(function (el) {
                            el.classList.remove('active');
                        });
                        this.classList.add('active');
                        var parentSub = btnSubSituacao ? btnSubSituacao.closest('.dropdown-filtro-item-has-sub') : null;
                        if (parentSub) {
                            if (state.filtroSituacao !== 'todos') {
                                parentSub.classList.add('active');
                            } else {
                                parentSub.classList.remove('active');
                            }
                        }
                        wrapperFiltro.classList.remove('open');
                        renderTodos();
                    });
                });
            }
        }

        if (els.btnSortData) {
            els.btnSortData.addEventListener('click', function () {
                state.sortDataDesc = !state.sortDataDesc;
                if (els.iconSortData) {
                    els.iconSortData.className = state.sortDataDesc ? 'bi bi-arrow-down' : 'bi bi-arrow-up';
                }
                state.todos.pagina = 1;
                renderTodos();
            });
        }

        if (els.pagPrevTodos) {
            els.pagPrevTodos.addEventListener('click', function () {
                if (state.todos.pagina > 1) { state.todos.pagina--; renderTodos(); }
            });
        }
        if (els.pagNextTodos) {
            els.pagNextTodos.addEventListener('click', function () {
                if (state.todos.pagina < state.todos.totalPag) { state.todos.pagina++; renderTodos(); }
            });
        }
        if (els.pagPrevCaixa) {
            els.pagPrevCaixa.addEventListener('click', function () {
                if (state.caixa.pagina > 1) { state.caixa.pagina--; renderCaixaListaDiaria(); }
            });
        }
        if (els.pagNextCaixa) {
            els.pagNextCaixa.addEventListener('click', function () {
                if (state.caixa.pagina < state.caixa.totalPag) { state.caixa.pagina++; renderCaixaListaDiaria(); }
            });
        }
        if (els.pagPrevExtrato) {
            els.pagPrevExtrato.addEventListener('click', function () {
                if (state.extrato.pagina > 1) { state.extrato.pagina--; renderExtratoTabela(); }
            });
        }
        if (els.pagNextExtrato) {
            els.pagNextExtrato.addEventListener('click', function () {
                if (state.extrato.pagina < state.extrato.totalPag) { state.extrato.pagina++; renderExtratoTabela(); }
            });
        }

        if (els.btnFiltrarCaixa) {
            els.btnFiltrarCaixa.addEventListener('click', function () {
                state.caixa.dataInicio = els.caixaDataInicio ? els.caixaDataInicio.value : '';
                state.caixa.dataFim = els.caixaDataFim ? els.caixaDataFim.value : '';
                state.caixa.pagina = 1;
                renderCaixa();
            });
        }

        if (els.btnGerarExtrato) {
            els.btnGerarExtrato.addEventListener('click', function () {
                state.extrato.dataRef = els.extratoDataRef ? els.extratoDataRef.value : '';
                var periodoAtivo = document.querySelector('.extrato-periodo-btn.active');
                state.extrato.periodo = periodoAtivo ? periodoAtivo.getAttribute('data-periodo') : 'diario';
                state.extrato.pagina = 1;
                gerarExtrato();
            });
        }

        if (els.btnRefresh) {
            els.btnRefresh.addEventListener('click', function () { carregarDados(); });
        }

        if (els.btnNovo) {
            els.btnNovo.addEventListener('click', function () { abrirModalForm(null); });
        }

        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                abrirModalForm(null);
            }
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (els.filtroBusca) els.filtroBusca.focus();
            }
        });

        document.querySelectorAll('.extrato-periodo-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.extrato-periodo-btn').forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.extrato.periodo = this.getAttribute('data-periodo') || 'diario';
            });
        });

        if (els.btnToggleCaixaVal) {
            els.btnToggleCaixaVal.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                state.caixaValoresVisiveis = !state.caixaValoresVisiveis;
                if (els.iconToggleCaixaVal) {
                    els.iconToggleCaixaVal.className = state.caixaValoresVisiveis ? 'bi bi-eye' : 'bi bi-eye-slash';
                }
                if (state.caixaValoresVisiveis) {
                    this.classList.remove('oculto');
                    this.title = 'Ocultar valores';
                } else {
                    this.classList.add('oculto');
                    this.title = 'Mostrar valores';
                }
                aplicarMascaraValores();
            });
        }
    }

    function aplicarMascaraValores() {
        var visivel = state.caixaValoresVisiveis;
        var elementos = document.querySelectorAll('.fin-valor-caixa');
        elementos.forEach(function (el) {
            if (visivel) {
                var real = el.getAttribute('data-valor-real');
                if (real) el.textContent = real;
            } else {
                if (!el.getAttribute('data-valor-real') || el.getAttribute('data-valor-real') === 'R$ ****') {
                    el.setAttribute('data-valor-real', el.textContent.trim());
                }
                el.textContent = 'R$ ****';
            }
        });
    }

    function spinOn() {
        if (els.btnRefresh) { els.btnRefresh.classList.add('syncing'); els.btnRefresh.disabled = true; }
    }

    function spinOff() {
        if (els.btnRefresh) { els.btnRefresh.classList.remove('syncing'); els.btnRefresh.disabled = false; }
    }

    function formatarMoeda(valor) {
        if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
        return parseFloat(valor).toLocaleString('pt-BR', {
            style: 'currency', currency: 'BRL',
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    function mascaraValor(el) {
        if (!el) return;
        el.addEventListener('input', function () {
            var v = this.value.replace(/\D/g, '');
            if (!v) { this.value = ''; return; }
            v = (parseInt(v) / 100).toFixed(2);
            this.value = v.replace('.', ',');
        });
    }

    function finToast(msg, tipo) {
        tipo = tipo || 'info';
        var cores = {
            success: { bg: '#198754', icon: 'bi-check-circle-fill' },
            danger: { bg: '#dc3545', icon: 'bi-exclamation-triangle-fill' },
            info: { bg: '#0d6efd', icon: 'bi-info-circle-fill' }
        };
        var cor = cores[tipo] || cores.info;
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;background:' + cor.bg + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:.78rem;box-shadow:0 4px 16px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;max-width:380px;animation:fadeInDropFiltroFin .15s ease;';
        toast.innerHTML = '<i class="bi ' + cor.icon + '"></i><span>' + escapeHtml(msg) + '</span>';
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity .3s ease';
            setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, 3000);
    }

    function getStatusBadge(situacao) {
        var s = (situacao || '').toLowerCase();
        if (s === 'pago') return '<span class="fin-badge-situacao fin-badge-pago"><i class="bi bi-check-circle-fill"></i> Pago</span>';
        if (s === 'recebido') return '<span class="fin-badge-situacao fin-badge-recebido"><i class="bi bi-check-circle-fill"></i> Recebido</span>';
        if (s === 'cancelado') return '<span class="fin-badge-situacao fin-badge-cancelado"><i class="bi bi-x-circle-fill"></i> Cancelado</span>';
        return '<span class="fin-badge-situacao fin-badge-pendente"><i class="bi bi-clock-fill"></i> Pendente</span>';
    }

    function getTipoBadge(tipo) {
        if (tipo === 'entrada') return '<span class="fin-badge-tipo fin-badge-entrada"><i class="bi bi-arrow-down-circle-fill"></i> Receita</span>';
        return '<span class="fin-badge-tipo fin-badge-saida"><i class="bi bi-arrow-up-circle-fill"></i> Despesa</span>';
    }

    function removerAcentos(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function getDiaSemanaCompleto(dataISO) {
        if (!dataISO) return '';
        var nomes = ['Domingo', 'Segunda-feira', 'Ter\u00e7a-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'S\u00e1bado'];
        var partes = dataISO.split('-');
        var dt = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
        return nomes[dt.getDay()] || '';
    }

    function getDiaSemana(dataISO) {
        if (!dataISO) return '';
        var nomes = ['Domingo', 'Segunda', 'Ter\u00e7a', 'Quarta', 'Quinta', 'Sexta', 'S\u00e1bado'];
        var partes = dataISO.split('-');
        var dt = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
        return nomes[dt.getDay()] || '';
    }

    function toISO(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function formatDateBR(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        return p[2] + '/' + p[1] + '/' + p[0];
    }

    function obterMesAtualRange() {
        var hoje = new Date();
        var y = hoje.getFullYear();
        var m = String(hoje.getMonth() + 1).padStart(2, '0');
        var lastDay = new Date(y, hoje.getMonth() + 1, 0).getDate();
        return { inicio: y + '-' + m + '-01', fim: y + '-' + m + '-' + String(lastDay).padStart(2, '0') };
    }

    function dadosFiltradosTodos() {
        var busca = state.filtroBusca;
        return state.cache.filter(function (d) {
            if (state.filtroTipo === 'entrada' && d.tipo !== 'entrada') return false;
            if (state.filtroTipo === 'saida' && d.tipo !== 'saida') return false;
            if (state.filtroSituacao !== 'todos' && d.situacao !== state.filtroSituacao) return false;
            if (busca) {
                var termo = removerAcentos(busca.toLowerCase().trim());
                if (!termo) return true;
                var valorFormatado = formatarMoeda(d.valor);
                var valorSimples = (d.valor || 0).toFixed(2).replace('.', ',');
                var valorPonto = (d.valor || 0).toFixed(2);
                var valorInt = String(Math.round(d.valor || 0));
                var situacaoMap = { pago: 'pago', recebido: 'recebido', pendente: 'pendente', cancelado: 'cancelado' };
                var tipoMap = { entrada: 'receita entrada', saida: 'despesa saida sa\u00edda' };
                var campos = [
                    d.id, d.idPedido, d.descricao, d.motoboy, d.categoria,
                    d.pagamento, d.observacao, d.dataBR, d.dataDisplay, d.dataISO,
                    valorFormatado, valorSimples, valorPonto, valorInt,
                    situacaoMap[d.situacao] || d.situacao,
                    tipoMap[d.tipo] || d.tipo
                ];
                var pool = removerAcentos(
                    campos.map(function (c) { return (c || '').toString(); }).join(' ').toLowerCase()
                );
                var termos = termo.split(/\s+/);
                for (var i = 0; i < termos.length; i++) {
                    if (termos[i] && pool.indexOf(termos[i]) === -1) return false;
                }
            }
            return true;
        });
    }

    function renderTodos() {
        if (!els.tbodyTodos) return;
        var lista = dadosFiltradosTodos();
        if (state.sortDataDesc) {
            lista.sort(function (a, b) { return (b.dataISO || '').localeCompare(a.dataISO || ''); });
        } else {
            lista.sort(function (a, b) { return (a.dataISO || '').localeCompare(b.dataISO || ''); });
        }
        var total = lista.length;
        state.todos.totalPag = Math.max(1, Math.ceil(total / state.todos.porPagina));
        if (state.todos.pagina > state.todos.totalPag) state.todos.pagina = state.todos.totalPag;
        if (state.todos.pagina < 1) state.todos.pagina = 1;
        var inicio = (state.todos.pagina - 1) * state.todos.porPagina;
        var pagina = lista.slice(inicio, inicio + state.todos.porPagina);
        if (!pagina.length) {
            els.tbodyTodos.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">' +
                '<i class="bi bi-inbox" style="font-size:1.2rem;display:block;margin-bottom:4px;opacity:.4;"></i>' +
                'Nenhum registro encontrado</td></tr>';
        } else {
            els.tbodyTodos.innerHTML = pagina.map(function (d, i) {
                return '<tr>' +
                    '<td class="ps-3">' + escapeHtml(d.dataDisplay) + '</td>' +
                    '<td>' + escapeHtml(d.idPedido || '-') + '</td>' +
                    '<td>' + getTipoBadge(d.tipo) + '</td>' +
                    '<td class="text-truncate" style="max-width:180px;">' + escapeHtml(d.descricao || '-') + '</td>' +
                    '<td>' + escapeHtml(d.motoboy || '-') + '</td>' +
                    '<td class="text-center">' + getStatusBadge(d.situacao) + '</td>' +
                    '<td class="text-end pe-3">' +
                    '<div class="fin-actions-group">' +
                    '<button class="fin-btn-action fin-btn-view btn-view-todos" data-idx="' + i + '" title="Ver"><i class="bi bi-eye"></i></button>' +
                    '<button class="fin-btn-action fin-btn-edit btn-edit-todos" data-idx="' + i + '" title="Editar"><i class="bi bi-pencil-square"></i></button>' +
                    '<button class="fin-btn-action fin-btn-delete btn-del-todos" data-idx="' + i + '" title="Excluir"><i class="bi bi-trash"></i></button>' +
                    '</div></td></tr>';
            }).join('');
        }
        if (els.pagInfoTodos) els.pagInfoTodos.textContent = total + ' registro' + (total !== 1 ? 's' : '');
        if (els.pagPrevTodos) els.pagPrevTodos.disabled = state.todos.pagina <= 1;
        if (els.pagNextTodos) els.pagNextTodos.disabled = state.todos.pagina >= state.todos.totalPag;
        if (els.pagLabelTodos) els.pagLabelTodos.textContent = 'P\u00e1g ' + state.todos.pagina + ' de ' + state.todos.totalPag;
        bindAcoesTodas(pagina);
    }

    function bindAcoesTodas(lista) {
        if (!els.tbodyTodos) return;
        els.tbodyTodos.querySelectorAll('.btn-view-todos').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var d = lista[parseInt(this.getAttribute('data-idx'))];
                if (d) abrirViewModal(d);
            });
        });
        els.tbodyTodos.querySelectorAll('.btn-edit-todos').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var d = lista[parseInt(this.getAttribute('data-idx'))];
                if (d) abrirModalForm(d);
            });
        });
        els.tbodyTodos.querySelectorAll('.btn-del-todos').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var d = lista[parseInt(this.getAttribute('data-idx'))];
                if (d) confirmarExclusao(d);
            });
        });
    }

    function atualizarRdoPaySaldo() {
        var el = document.getElementById('rdo-pay-saldo');
        if (!el) return;

        var totalEnt = 0;
        var totalSai = 0;

        for (var i = 0; i < state.cache.length; i++) {
            var reg = state.cache[i];
            var val = parseFloat(reg.valor) || 0;
            if (reg.tipo === 'entrada') {
                totalEnt += val;
            } else if (reg.tipo === 'saida') {
                totalSai += val;
            }
        }

        var saldo = totalEnt - totalSai;
        var saldoFormatado = formatarMoeda(saldo);

        el.setAttribute('data-valor-real', saldoFormatado);
        el.textContent = state.caixaValoresVisiveis ? saldoFormatado : 'R$ ****';
    }

    function atualizarResumoCaixa() {
        var lista = state.caixa.dadosFiltrados || [];
        var visivel = state.caixaValoresVisiveis;
        var totalEnt = 0, totalSai = 0;
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].tipo === 'entrada') { totalEnt += parseFloat(lista[i].valor) || 0; }
            else { totalSai += parseFloat(lista[i].valor) || 0; }
        }
        if (els.caixaCardEntradas) {
            var valEnt = formatarMoeda(totalEnt);
            els.caixaCardEntradas.setAttribute('data-valor-real', valEnt);
            els.caixaCardEntradas.textContent = visivel ? valEnt : 'R$ ****';
        }
        if (els.caixaCardSaidas) {
            var valSai = formatarMoeda(totalSai);
            els.caixaCardSaidas.setAttribute('data-valor-real', valSai);
            els.caixaCardSaidas.textContent = visivel ? valSai : 'R$ ****';
        }
        if (els.caixaCardRegistros) {
            els.caixaCardRegistros.setAttribute('data-valor-real', lista.length.toString());
            els.caixaCardRegistros.textContent = lista.length;
        }
    }

    function renderCaixa() {
        var di = els.caixaDataInicio ? els.caixaDataInicio.value : '';
        var df = els.caixaDataFim ? els.caixaDataFim.value : '';
        if (!di || !df) {
            var mesAtual = obterMesAtualRange();
            di = mesAtual.inicio; df = mesAtual.fim;
            if (els.caixaDataInicio) els.caixaDataInicio.value = di;
            if (els.caixaDataFim) els.caixaDataFim.value = df;
        }
        state.caixa.dataInicio = di;
        state.caixa.dataFim = df;
        state.caixa.pagina = 1;
        state.caixa.dadosFiltrados = state.cache.filter(function (d) {
            if (!d.dataISO) return false;
            return d.dataISO >= di && d.dataISO <= df;
        }).sort(function (a, b) { return (a.dataISO || '').localeCompare(b.dataISO || ''); });
        atualizarResumoCaixa();
        atualizarRdoPaySaldo();
        renderCaixaListaDiaria();
    }

    function renderCaixaListaDiaria() {
        var container = els.caixaListaDiaria;
        if (!container) return;

        var lista = state.caixa.dadosFiltrados || [];
        var visivel = state.caixaValoresVisiveis;

        if (!lista.length) {
            container.innerHTML =
                '<div class="text-center text-muted py-4">' +
                '<i class="bi bi-inbox" style="font-size:1.2rem;display:block;margin-bottom:4px;opacity:.4;"></i>' +
                'Nenhum registro no per\u00edodo</div>';
            atualizarPaginacaoCaixa(0);
            return;
        }

        var grupos = {};
        var diasOrdem = [];
        for (var i = 0; i < lista.length; i++) {
            var key = lista[i].dataISO || '';
            if (!grupos[key]) { grupos[key] = []; diasOrdem.push(key); }
            grupos[key].push(lista[i]);
        }
        diasOrdem.sort();

        var diasPorPagina = state.caixa.porPagina;
        var totalDias = diasOrdem.length;
        var totalPag = Math.max(1, Math.ceil(totalDias / diasPorPagina));
        if (!state.caixa.pagina || state.caixa.pagina < 1) state.caixa.pagina = 1;
        if (state.caixa.pagina > totalPag) state.caixa.pagina = totalPag;
        state.caixa.totalPag = totalPag;

        var paginaAtual = state.caixa.pagina;
        var inicioDia = (paginaAtual - 1) * diasPorPagina;
        var fimDia = Math.min(inicioDia + diasPorPagina, totalDias);
        var diasPagina = diasOrdem.slice(inicioDia, fimDia);

        var saldoAcumulado = 0;
        for (var di2 = 0; di2 < inicioDia; di2++) {
            var reg = grupos[diasOrdem[di2]];
            for (var r = 0; r < reg.length; r++) {
                if (reg[r].tipo === 'entrada') { saldoAcumulado += parseFloat(reg[r].valor) || 0; }
                else { saldoAcumulado -= parseFloat(reg[r].valor) || 0; }
            }
        }

        var html = '';

        for (var idx = 0; idx < diasPagina.length; idx++) {
            var diaISO = diasPagina[idx];
            var registros = grupos[diaISO];
            var partes = diaISO.split('-');
            var dataBR = partes[2] + '/' + partes[1] + '/' + partes[0];
            var diaSemana = getDiaSemanaCompleto(diaISO);

            var totalEntDia = 0, totalSaiDia = 0;
            for (var j = 0; j < registros.length; j++) {
                if (registros[j].tipo === 'entrada') { totalEntDia += parseFloat(registros[j].valor) || 0; }
                else { totalSaiDia += parseFloat(registros[j].valor) || 0; }
            }
            var saldoDia = totalEntDia - totalSaiDia;
            saldoAcumulado += saldoDia;

            var saldoClass = saldoAcumulado > 0 ? 'positivo' : saldoAcumulado < 0 ? 'negativo' : 'neutro';
            var saldoTexto = formatarMoeda(saldoAcumulado);

            html +=
                '<div class="caixa-dia-item" data-dia="' + diaISO + '" title="Ver lan\u00e7amentos de ' + dataBR + '">' +
                '<div class="caixa-dia-item-left">' +
                '<div class="caixa-dia-icon"><i class="bi bi-calendar3"></i></div>' +
                '<div>' +
                '<div class="caixa-dia-info-data">' + dataBR + '</div>' +
                '<div class="caixa-dia-info-semana">' + diaSemana + '</div>' +
                '</div>' +
                '</div>' +
                '<div class="d-flex align-items-center">' +
                '<span class="caixa-dia-saldo fin-valor-caixa ' + saldoClass + '" data-valor-real="' + saldoTexto + '">' +
                (visivel ? saldoTexto : 'R$ ****') +
                '</span>' +
                '<i class="bi bi-chevron-right caixa-dia-chevron"></i>' +
                '</div>' +
                '</div>';
        }

        container.innerHTML = html;

        container.querySelectorAll('.caixa-dia-item').forEach(function (el) {
            el.addEventListener('click', function () {
                var dia = this.getAttribute('data-dia');
                if (dia && grupos[dia]) {
                    abrirModalDetalheDia(dia, grupos[dia]);
                }
            });
        });

        atualizarPaginacaoCaixa(totalDias);
    }

    function abrirModalDetalheDia(diaISO, registros) {
        var modalEl = document.getElementById('modalDetalheDia');
        if (!modalEl) return;

        var partes = diaISO.split('-');
        var dataBR = partes[2] + '/' + partes[1] + '/' + partes[0];
        var diaSemana = getDiaSemanaCompleto(diaISO);

        var tituloEl = document.getElementById('modal-detalhe-dia-titulo');
        if (tituloEl) tituloEl.textContent = dataBR + ' (' + diaSemana + ')';

        var bodyEl = document.getElementById('modal-detalhe-dia-body');
        if (!bodyEl) return;

        var totalEnt = 0;
        var totalSai = 0;

        if (!registros || !registros.length) {
            bodyEl.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Nenhum lan\u00e7amento.</td></tr>';
        } else {
            var html = '';
            for (var i = 0; i < registros.length; i++) {
                var rr = registros[i];
                var isE = rr.tipo === 'entrada';
                if (isE) { totalEnt += parseFloat(rr.valor) || 0; }
                else { totalSai += parseFloat(rr.valor) || 0; }
                var valorClass = isE ? 'detalhe-dia-valor-entrada' : 'detalhe-dia-valor-saida';
                var valorSinal = isE ? '+ ' : '- ';
                html += '<tr>';
                html += '<td>' + escapeHtml(rr.descricao || '-') + '</td>';
                html += '<td>' + escapeHtml(rr.idPedido || '-') + '</td>';
                html += '<td>' + escapeHtml(rr.motoboy && rr.motoboy !== '-' ? rr.motoboy : '-') + '</td>';
                html += '<td class="text-end"><span class="' + valorClass + '">' + valorSinal + formatarMoeda(rr.valor) + '</span></td>';
                html += '</tr>';
            }
            bodyEl.innerHTML = html;
        }

        var saldo = totalEnt - totalSai;
        var elEnt = document.getElementById('modal-detalhe-dia-entradas');
        var elSai = document.getElementById('modal-detalhe-dia-saidas');
        var elSaldo = document.getElementById('modal-detalhe-dia-saldo');

        if (elEnt) elEnt.textContent = formatarMoeda(totalEnt);
        if (elSai) elSai.textContent = formatarMoeda(totalSai);
        if (elSaldo) {
            elSaldo.textContent = formatarMoeda(saldo);
            elSaldo.style.color = saldo >= 0 ? '#198754' : '#dc3545';
        }

        new bootstrap.Modal(modalEl).show();
    }

    function atualizarPaginacaoCaixa(totalDias) {
        var diasPorPagina = state.caixa.porPagina;
        var totalPag = Math.max(1, Math.ceil(totalDias / diasPorPagina));
        if (!state.caixa.pagina || state.caixa.pagina < 1) state.caixa.pagina = 1;
        if (state.caixa.pagina > totalPag) state.caixa.pagina = totalPag;
        state.caixa.totalPag = totalPag;
        if (els.pagInfoCaixa) els.pagInfoCaixa.textContent = totalDias > 0 ? totalDias + ' dia' + (totalDias !== 1 ? 's' : '') : '0 registros';
        if (els.pagPrevCaixa) els.pagPrevCaixa.disabled = state.caixa.pagina <= 1;
        if (els.pagNextCaixa) els.pagNextCaixa.disabled = state.caixa.pagina >= totalPag;
        if (els.pagLabelCaixa) els.pagLabelCaixa.textContent = 'P\u00e1g ' + state.caixa.pagina + ' de ' + totalPag;
    }

    function gerarExtrato() {
        var dataRef = els.extratoDataRef ? els.extratoDataRef.value : '';
        if (!dataRef) { finToast('Selecione uma data de refer\u00eancia.', 'info'); return; }
        var periodo = state.extrato.periodo;
        var ref = new Date(dataRef + 'T12:00:00');
        var di, df, titulo, subtitulo;
        if (periodo === 'diario') {
            di = dataRef; df = dataRef;
            titulo = 'Extrato Di\u00e1rio'; subtitulo = formatDateBR(dataRef);
        } else if (periodo === 'semanal') {
            var dow = ref.getDay();
            var startW = new Date(ref); startW.setDate(ref.getDate() - dow);
            var endW = new Date(startW); endW.setDate(startW.getDate() + 6);
            di = toISO(startW); df = toISO(endW);
            titulo = 'Extrato Semanal'; subtitulo = formatDateBR(di) + ' a ' + formatDateBR(df);
        } else if (periodo === 'quinzenal') {
            var day = ref.getDate();
            if (day <= 15) {
                di = dataRef.substring(0, 8) + '01'; df = dataRef.substring(0, 8) + '15';
            } else {
                di = dataRef.substring(0, 8) + '16';
                var lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
                df = dataRef.substring(0, 8) + String(lastDay).padStart(2, '0');
            }
            titulo = 'Extrato Quinzenal'; subtitulo = formatDateBR(di) + ' a ' + formatDateBR(df);
        } else {
            di = dataRef.substring(0, 8) + '01';
            var lastD = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
            df = dataRef.substring(0, 8) + String(lastD).padStart(2, '0');
            titulo = 'Extrato Mensal';
            var meses = ['Janeiro', 'Fevereiro', 'Mar\u00e7o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            subtitulo = meses[ref.getMonth()] + ' / ' + ref.getFullYear();
        }
        var dados = state.cache.filter(function (d) {
            return d.dataISO && d.dataISO >= di && d.dataISO <= df;
        }).sort(function (a, b) { return (a.dataISO || '').localeCompare(b.dataISO || ''); });
        state.extrato.dados = dados;
        state.extrato.pagina = 1;
        var totalE = 0, totalS = 0;
        dados.forEach(function (d) { if (d.tipo === 'entrada') totalE += d.valor; else totalS += d.valor; });
        var saldo = totalE - totalS;
        if (els.extratoHeaderInfo) els.extratoHeaderInfo.classList.remove('d-none');
        if (els.extratoTitulo) els.extratoTitulo.textContent = titulo;
        if (els.extratoSubtitulo) els.extratoSubtitulo.textContent = subtitulo;
        if (els.extratoTotalEntradas) els.extratoTotalEntradas.textContent = formatarMoeda(totalE);
        if (els.extratoTotalSaidas) els.extratoTotalSaidas.textContent = formatarMoeda(totalS);
        if (els.extratoTotalSaldo) {
            els.extratoTotalSaldo.textContent = formatarMoeda(saldo);
            els.extratoTotalSaldo.style.color = saldo >= 0 ? '#0d6efd' : '#dc3545';
        }
        renderExtratoTabela();
    }

    function renderExtratoTabela() {
        if (!els.tbodyExtrato) return;
        var lista = state.extrato.dados;
        var total = lista.length;
        state.extrato.totalPag = Math.max(1, Math.ceil(total / state.extrato.porPagina));
        if (state.extrato.pagina > state.extrato.totalPag) state.extrato.pagina = state.extrato.totalPag;
        if (state.extrato.pagina < 1) state.extrato.pagina = 1;
        var inicio = (state.extrato.pagina - 1) * state.extrato.porPagina;
        var pagina = lista.slice(inicio, inicio + state.extrato.porPagina);
        if (!pagina.length) {
            els.tbodyExtrato.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">' +
                '<i class="bi bi-inbox" style="font-size:1.2rem;display:block;margin-bottom:4px;opacity:.4;"></i>' +
                'Nenhum registro no per\u00edodo</td></tr>';
        } else {
            els.tbodyExtrato.innerHTML = pagina.map(function (d) {
                var isE = d.tipo === 'entrada';
                var cor = isE ? '#198754' : '#dc3545';
                var sinal = isE ? '+ ' : '- ';
                var valorTxt = sinal + formatarMoeda(d.valor);
                return '<tr>' +
                    '<td class="ps-3">' + escapeHtml(d.dataDisplay) + '</td>' +
                    '<td>' + escapeHtml(d.idPedido || '-') + '</td>' +
                    '<td>' + getTipoBadge(d.tipo) + '</td>' +
                    '<td class="text-truncate" style="max-width:160px;">' + escapeHtml(d.descricao || '-') + '</td>' +
                    '<td>' + escapeHtml(d.motoboy || '-') + '</td>' +
                    '<td class="text-end" style="color:' + cor + ';font-weight:600;">' + valorTxt + '</td>' +
                    '<td class="text-center pe-3">' + getStatusBadge(d.situacao) + '</td></tr>';
            }).join('');
        }
        if (els.pagInfoExtrato) els.pagInfoExtrato.textContent = total + ' registro' + (total !== 1 ? 's' : '');
        if (els.pagPrevExtrato) els.pagPrevExtrato.disabled = state.extrato.pagina <= 1;
        if (els.pagNextExtrato) els.pagNextExtrato.disabled = state.extrato.pagina >= state.extrato.totalPag;
        if (els.pagLabelExtrato) els.pagLabelExtrato.textContent = 'P\u00e1g ' + state.extrato.pagina + ' de ' + state.extrato.totalPag;
    }

    function renderExtrato() {
        if (state.extrato.dados.length) renderExtratoTabela();
    }

    function abrirViewModal(d) {
        var old = document.getElementById('modal-fin-view-dynamic');
        if (old) {
            var oldInst = bootstrap.Modal.getInstance(old);
            if (oldInst) oldInst.dispose();
            old.remove();
        }

        var isE = d.tipo === 'entrada';
        var tipoLabel = isE ? 'RECEITA' : 'DESPESA';
        var tipoIcon = isE ? 'bi-arrow-down-left' : 'bi-arrow-up-right';
        var corValor = isE ? '#198754' : '#dc3545';

        var pagMap = { pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Cart\u00e3o Cr\u00e9dito', cartao_debito: 'Cart\u00e3o D\u00e9bito', boleto: 'Boleto', transferencia: 'Transfer\u00eancia' };

        var now = new Date();
        var timestamp = String(now.getDate()).padStart(2, '0') + '/' +
            String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear() +
            ' \u00e0s ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        var html = '<div class="modal fade" id="modal-fin-view-dynamic" tabindex="-1" aria-hidden="true">' +
            '<div class="modal-dialog modal-dialog-centered">' +
            '<div class="modal-content border-0 rounded-4 shadow overflow-hidden">' +
            '<div class="fin-form-header">' +
            '<div class="d-flex align-items-center gap-3">' +
            '<div class="fin-form-header-icon"><i class="bi ' + tipoIcon + '"></i></div>' +
            '<div>' +
            '<h6 class="fw-bold mb-0 text-white" style="font-size:.88rem;">' + tipoLabel + '</h6>' +
            '<small class="fin-form-subtitle">' + escapeHtml(d.dataBR || '-') + '</small>' +
            '</div></div>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body px-4 py-3">' +
            '<div class="text-center mb-3">' +
            '<div style="font-size:1.6rem;font-weight:700;color:' + corValor + ';">' + formatarMoeda(d.valor) + '</div>' +
            '<div>' + getStatusBadge(d.situacao) + '</div>' +
            '</div>' +
            '<div style="background:#f8f9fa;border-radius:10px;padding:12px;font-size:.76rem;">' +
            '<div class="d-flex justify-content-between mb-2"><span class="text-muted">ID</span><span class="fw-semibold">#' + escapeHtml(d.id || '0000') + '</span></div>' +
            '<div class="d-flex justify-content-between mb-2"><span class="text-muted">Descri\u00e7\u00e3o</span><span class="fw-semibold">' + escapeHtml(d.descricao || '-') + '</span></div>' +
            '<div class="d-flex justify-content-between mb-2"><span class="text-muted">Categoria</span><span class="fw-semibold">' + escapeHtml(d.categoria || '-') + '</span></div>' +
            '<div class="d-flex justify-content-between mb-2"><span class="text-muted">Pagamento</span><span class="fw-semibold">' + escapeHtml(pagMap[(d.pagamento || '').toLowerCase()] || d.pagamento || '-') + '</span></div>' +
            '<div class="d-flex justify-content-between mb-2"><span class="text-muted">Motoboy</span><span class="fw-semibold">' + escapeHtml(d.motoboy && d.motoboy !== '-' ? d.motoboy : '-') + '</span></div>' +
            '<div class="d-flex justify-content-between mb-2"><span class="text-muted">Pedido</span><span class="fw-semibold">' + escapeHtml(d.idPedido || '-') + '</span></div>' +
            '<div class="d-flex justify-content-between"><span class="text-muted">Observa\u00e7\u00e3o</span><span class="fw-semibold">' + escapeHtml(d.observacao || '-') + '</span></div>' +
            '</div>' +
            '<div class="text-center mt-2" style="font-size:.6rem;color:#bbb;">Consultado em ' + timestamp + '</div>' +
            '</div>' +
            '<div class="fin-form-footer justify-content-between">' +
            '<button type="button" class="btn btn-outline-danger btn-sm rounded-pill px-3" id="btn-view-editar-dynamic" style="font-size:.72rem;"><i class="bi bi-pencil-square me-1"></i>Editar</button>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal" style="font-size:.72rem;">Fechar</button>' +
            '</div>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);
        var modalEl = document.getElementById('modal-fin-view-dynamic');
        var modalInst = new bootstrap.Modal(modalEl);

        document.getElementById('btn-view-editar-dynamic').addEventListener('click', function () {
            modalInst.hide();
            setTimeout(function () { abrirModalForm(d); }, 300);
        });

        modalEl.addEventListener('hidden.bs.modal', function () {
            modalInst.dispose();
            if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
        });

        modalInst.show();
    }

    function abrirModalForm(item) {
        var old = document.getElementById('modal-fin-form-dynamic');
        if (old) {
            var oldInst = bootstrap.Modal.getInstance(old);
            if (oldInst) oldInst.dispose();
            old.remove();
        }

        var isEdit = !!item;
        var titulo = isEdit ? 'Editar Lan\u00e7amento' : 'Novo Lan\u00e7amento';
        var subtitulo = isEdit ? '#' + escapeHtml(item.id || '') + ' \u00b7 ' + escapeHtml(item.dataBR || '') : 'Preencha os dados abaixo';
        var headerIcon = isEdit ? 'bi-pencil-square' : 'bi-plus-circle';

        var dataVal = isEdit ? (item.dataISO || '') : new Date().toISOString().split('T')[0];
        var tipoVal = isEdit ? (item.tipo || '') : '';
        var descVal = isEdit ? escapeHtml(item.descricao || '') : '';
        var valorVal = isEdit ? parseFloat(item.valor || 0).toFixed(2).replace('.', ',') : '';
        var motoboyVal = isEdit ? escapeHtml(item.motoboy === '-' ? '' : (item.motoboy || '')) : '';
        var situacaoVal = isEdit ? (item.situacao || 'pendente') : 'pendente';
        var pedidoVal = isEdit ? escapeHtml(item.idPedido || '') : '';
        var categoriaVal = isEdit ? escapeHtml(item.categoria || '') : '';
        var pagamentoVal = isEdit ? (item.pagamento || '') : '';
        var obsVal = isEdit ? escapeHtml(item.observacao || '') : '';
        var idVal = isEdit ? escapeHtml(item.id || '') : '';

        var html = '<div class="modal fade" id="modal-fin-form-dynamic" tabindex="-1" aria-hidden="true">' +
            '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">' +
            '<div class="modal-content border-0 rounded-4 shadow overflow-hidden">' +
            '<div class="fin-form-header">' +
            '<div class="d-flex align-items-center gap-3">' +
            '<div class="fin-form-header-icon"><i class="bi ' + headerIcon + '"></i></div>' +
            '<div>' +
            '<h6 class="fw-bold mb-0 text-white" style="font-size:.88rem;">' + titulo + '</h6>' +
            '<small class="fin-form-subtitle">' + subtitulo + '</small>' +
            '</div></div>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
            '</div>' +
            '<div class="modal-body px-4 py-3">' +
            '<div id="form-fin-erro-dyn" class="alert alert-danger d-none py-2 px-3" style="font-size:.74rem;border-radius:10px;"></div>' +
            '<input type="hidden" id="fin-id-dyn" value="' + idVal + '">' +
            '<div class="fin-form-section">' +
            '<div class="fin-form-section-label">Dados principais</div>' +
            '<div class="row g-2 mb-2">' +
            '<div class="col-6"><label class="fin-field-label">Data</label>' +
            '<input type="date" id="fin-data-dyn" class="form-control form-control-sm rounded-pill fin-field-input" value="' + dataVal + '"></div>' +
            '<div class="col-6"><label class="fin-field-label">Tipo</label>' +
            '<select id="fin-tipo-dyn" class="form-select form-select-sm rounded-pill fin-field-input">' +
            '<option value="">Selecione...</option>' +
            '<option value="entrada"' + (tipoVal === 'entrada' ? ' selected' : '') + '>Receita</option>' +
            '<option value="saida"' + (tipoVal === 'saida' ? ' selected' : '') + '>Despesa</option>' +
            '</select></div></div>' +
            '<div class="mb-2"><label class="fin-field-label">Descri\u00e7\u00e3o</label>' +
            '<input type="text" id="fin-descricao-dyn" class="form-control form-control-sm rounded-pill fin-field-input" value="' + descVal + '" placeholder="Ex: Entrega #123"></div>' +
            '<div class="row g-2 mb-2">' +
            '<div class="col-6"><label class="fin-field-label">Valor (R$)</label>' +
            '<input type="text" id="fin-valor-dyn" class="form-control form-control-sm rounded-pill fin-field-input" value="' + valorVal + '" placeholder="0,00"></div>' +
            '<div class="col-6"><label class="fin-field-label">Situa\u00e7\u00e3o</label>' +
            '<select id="fin-situacao-dyn" class="form-select form-select-sm rounded-pill fin-field-input">' +
            '<option value="pendente"' + (situacaoVal === 'pendente' ? ' selected' : '') + '>Pendente</option>' +
            '<option value="pago"' + (situacaoVal === 'pago' ? ' selected' : '') + '>Pago</option>' +
            '<option value="recebido"' + (situacaoVal === 'recebido' ? ' selected' : '') + '>Recebido</option>' +
            '<option value="cancelado"' + (situacaoVal === 'cancelado' ? ' selected' : '') + '>Cancelado</option>' +
            '</select></div></div>' +
            '</div>' +
            '<div class="fin-form-section">' +
            '<div class="fin-form-section-label">Detalhes adicionais</div>' +
            '<div class="row g-2 mb-2">' +
            '<div class="col-6"><label class="fin-field-label">Motoboy</label>' +
            '<input type="text" id="fin-motoboy-dyn" class="form-control form-control-sm rounded-pill fin-field-input" value="' + motoboyVal + '" placeholder="Nome do motoboy"></div>' +
            '<div class="col-6"><label class="fin-field-label">N. Pedido</label>' +
            '<input type="text" id="fin-pedido-dyn" class="form-control form-control-sm rounded-pill fin-field-input" value="' + pedidoVal + '" placeholder="#0000"></div></div>' +
            '<div class="row g-2 mb-2">' +
            '<div class="col-6"><label class="fin-field-label">Categoria</label>' +
            '<input type="text" id="fin-categoria-dyn" class="form-control form-control-sm rounded-pill fin-field-input" value="' + categoriaVal + '" placeholder="Ex: Combust\u00edvel"></div>' +
            '<div class="col-6"><label class="fin-field-label">Pagamento</label>' +
            '<select id="fin-pagamento-dyn" class="form-select form-select-sm rounded-pill fin-field-input">' +
            '<option value="">Selecione...</option>' +
            '<option value="pix"' + (pagamentoVal === 'pix' ? ' selected' : '') + '>PIX</option>' +
            '<option value="dinheiro"' + (pagamentoVal === 'dinheiro' ? ' selected' : '') + '>Dinheiro</option>' +
            '<option value="cartao_credito"' + (pagamentoVal === 'cartao_credito' ? ' selected' : '') + '>Cart\u00e3o Cr\u00e9dito</option>' +
            '<option value="cartao_debito"' + (pagamentoVal === 'cartao_debito' ? ' selected' : '') + '>Cart\u00e3o D\u00e9bito</option>' +
            '<option value="boleto"' + (pagamentoVal === 'boleto' ? ' selected' : '') + '>Boleto</option>' +
            '<option value="transferencia"' + (pagamentoVal === 'transferencia' ? ' selected' : '') + '>Transfer\u00eancia</option>' +
            '</select></div></div>' +
            '<div class="mb-2"><label class="fin-field-label">Observa\u00e7\u00e3o</label>' +
            '<textarea id="fin-obs-dyn" class="form-control form-control-sm fin-field-input" rows="2" style="border-radius:12px;" placeholder="Opcional...">' + obsVal + '</textarea></div>' +
            '</div>' +
            '</div>' +
            '<div class="fin-form-footer">' +
            '<button type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal" style="font-size:.72rem;">Cancelar</button>' +
            '<button type="button" class="btn btn-danger btn-sm rounded-pill px-4" id="btn-salvar-fin-dyn" style="font-size:.72rem;">' +
            '<span id="spinner-salvar-fin-dyn" class="spinner-border spinner-border-sm d-none me-1"></span>' +
            '<span id="txt-salvar-fin-dyn"><i class="bi bi-check-lg me-1"></i>Salvar</span></button>' +
            '</div>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);
        var modalEl = document.getElementById('modal-fin-form-dynamic');
        var valorInput = document.getElementById('fin-valor-dyn');
        mascaraValor(valorInput);

        document.getElementById('btn-salvar-fin-dyn').addEventListener('click', function () {
            salvarFormDynamic(modalEl);
        });

        modalEl.addEventListener('hidden.bs.modal', function () {
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) inst.dispose();
            if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
        });

        new bootstrap.Modal(modalEl).show();
    }

    function salvarFormDynamic(modalEl) {
        var erroEl = document.getElementById('form-fin-erro-dyn');
        if (erroEl) erroEl.classList.add('d-none');
        var id = document.getElementById('fin-id-dyn').value;
        var dataISO = document.getElementById('fin-data-dyn').value;
        var tipo = document.getElementById('fin-tipo-dyn').value;
        var descricao = document.getElementById('fin-descricao-dyn').value.trim();
        var valorRaw = document.getElementById('fin-valor-dyn').value.replace(/\./g, '').replace(',', '.');
        var valor = parseFloat(valorRaw) || 0;
        var motoboy = document.getElementById('fin-motoboy-dyn').value.trim();
        var situacao = document.getElementById('fin-situacao-dyn').value;
        var idPedido = document.getElementById('fin-pedido-dyn').value.trim();
        var categoria = document.getElementById('fin-categoria-dyn').value.trim();
        var pagamento = document.getElementById('fin-pagamento-dyn').value;
        var observacao = document.getElementById('fin-obs-dyn').value.trim();
        var btnSalvar = document.getElementById('btn-salvar-fin-dyn');
        var spinner = document.getElementById('spinner-salvar-fin-dyn');
        var txtSalvar = document.getElementById('txt-salvar-fin-dyn');

        function mostrarErro(msg) {
            if (erroEl) { erroEl.textContent = msg; erroEl.classList.remove('d-none'); }
        }

        if (!dataISO) { mostrarErro('Informe a data.'); return; }
        if (!tipo) { mostrarErro('Selecione o tipo.'); return; }
        if (!descricao) { mostrarErro('Informe a descri\u00e7\u00e3o.'); return; }
        if (valor <= 0) { mostrarErro('Informe um valor v\u00e1lido.'); return; }

        var dataParts = dataISO.split('-');
        var dataBR = dataParts[2] + '/' + dataParts[1] + '/' + dataParts[0];

        var payload = {
            data: dataBR, tipo: tipo, descricao: descricao, valor: valor,
            motoboy: motoboy, situacao: situacao, id_pedido: idPedido
        };
        if (categoria) payload.categoria = categoria;
        if (pagamento) payload.pagamento = pagamento;
        if (observacao) payload.observacao = observacao;
        if (id) payload.id = id;

        var action = id ? 'editfinanceiro' : 'addfinanceiro';
        if (btnSalvar) btnSalvar.disabled = true;
        if (spinner) spinner.classList.remove('d-none');
        if (txtSalvar) txtSalvar.textContent = 'Salvando...';

        window.API.call(action, payload)
            .then(function (res) {
                var sucesso = false;
                var msg = '';
                if (res) {
                    msg = (res.message || res.msg || res.mensagem || '').toString().toLowerCase();
                    if (res.success === true || res.success === 'true' || res.success === 1) {
                        sucesso = true;
                    } else if (
                        msg.indexOf('adicionado') !== -1 ||
                        msg.indexOf('salvo') !== -1 ||
                        msg.indexOf('criado') !== -1 ||
                        msg.indexOf('atualizado') !== -1 ||
                        msg.indexOf('editado') !== -1 ||
                        msg.indexOf('sucesso') !== -1
                    ) {
                        sucesso = true;
                    }
                }
                if (sucesso) {
                    var inst = bootstrap.Modal.getInstance(modalEl);
                    if (inst) inst.hide();
                    finToast(id ? 'Lan\u00e7amento atualizado!' : 'Lan\u00e7amento criado!', 'success');
                    carregarDados();
                } else {
                    mostrarErro('Erro ao salvar: ' + ((res && (res.message || res.msg)) || 'Erro desconhecido'));
                }
            })
            .catch(function () {
                mostrarErro('Falha na comunica\u00e7\u00e3o com o servidor.');
            })
            .finally(function () {
                if (btnSalvar) btnSalvar.disabled = false;
                if (spinner) spinner.classList.add('d-none');
                if (txtSalvar) txtSalvar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar';
            });
    }

    function confirmarExclusao(item) {
        var modalEl = document.getElementById('modalConfirmDeleteFin');
        if (!modalEl) return;
        var btnConfirmar = document.getElementById('btn-confirmar-delete-fin');
        if (!btnConfirmar) return;
        var newBtn = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(newBtn, btnConfirmar);
        newBtn.addEventListener('click', function () {
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) inst.hide();
            excluir(item.id);
        });
        new bootstrap.Modal(modalEl).show();
    }

    function excluir(id) {
        window.API.call('delfinanceiro', { id: id })
            .then(function (res) {
                var sucesso = false;
                var msg = '';
                if (res) {
                    msg = (res.message || res.msg || res.mensagem || '').toString().toLowerCase();
                    if (res.success === true || res.success === 'true' || res.success === 1) {
                        sucesso = true;
                    } else if (
                        msg.indexOf('exclu') !== -1 ||
                        msg.indexOf('removido') !== -1 ||
                        msg.indexOf('deletado') !== -1 ||
                        msg.indexOf('sucesso') !== -1
                    ) {
                        sucesso = true;
                    }
                }
                if (sucesso) {
                    finToast('Lan\u00e7amento exclu\u00eddo.', 'success');
                    carregarDados();
                } else {
                    finToast('Erro ao excluir.', 'danger');
                }
            })
            .catch(function () {
                finToast('Falha na comunica\u00e7\u00e3o.', 'danger');
            });
    }

    function bindAdicionarDinheiroModal() {
        var btn = document.getElementById('btn-confirmar-add-dinheiro');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var valorEl = document.getElementById('add-dinheiro-valor');
            var descEl = document.getElementById('add-dinheiro-descricao');
            var valor = valorEl ? valorEl.value.trim() : '';
            if (!valor) { finToast('Informe o valor.', 'info'); return; }
            finToast('Dep\u00f3sito de R$ ' + valor + ' adicionado!', 'success');
            var modalEl = document.getElementById('modalAdicionarDinheiro');
            if (modalEl) {
                var inst = bootstrap.Modal.getInstance(modalEl);
                if (inst) inst.hide();
            }
            if (valorEl) valorEl.value = '';
            if (descEl) descEl.value = '';
        });
        var inputValor = document.getElementById('add-dinheiro-valor');
        mascaraValor(inputValor);
    }

    function bindTransferirModal() {
        var btn = document.getElementById('btn-confirmar-transferir');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var valorEl = document.getElementById('transferir-valor');
            var destinoEl = document.getElementById('transferir-destino');
            var descEl = document.getElementById('transferir-descricao');
            var valor = valorEl ? valorEl.value.trim() : '';
            var destino = destinoEl ? destinoEl.value.trim() : '';
            if (!valor) { finToast('Informe o valor.', 'info'); return; }
            if (!destino) { finToast('Informe o destino.', 'info'); return; }
            finToast('Transfer\u00eancia de R$ ' + valor + ' para ' + destino + ' realizada!', 'success');
            var modalEl = document.getElementById('modalTransferir');
            if (modalEl) {
                var inst = bootstrap.Modal.getInstance(modalEl);
                if (inst) inst.hide();
            }
            if (valorEl) valorEl.value = '';
            if (destinoEl) destinoEl.value = '';
            if (descEl) descEl.value = '';
        });
        var inputValor = document.getElementById('transferir-valor');
        mascaraValor(inputValor);
    }

    function carregarDados() {
        if (state.fetching) return;
        state.fetching = true;
        spinOn();
        if (els.tbodyTodos) {
            els.tbodyTodos.innerHTML = '<tr><td colspan="7" class="text-center py-5"><div class="spinner-border spinner-border-sm text-danger opacity-50"></div><div class="mt-2 fin-loading-text">Buscando dados<span class="fin-dots"></span></div></td></tr>';
        }
        if (els.caixaListaDiaria) {
            els.caixaListaDiaria.innerHTML = '<div class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm text-danger opacity-50"></div><div class="mt-2 fin-loading-text">Atualizando<span class="fin-dots"></span></div></div>';
        }
        if (els.tbodyExtrato) {
            els.tbodyExtrato.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm text-danger opacity-50"></div><div class="mt-2 fin-loading-text">Atualizando<span class="fin-dots"></span></div></td></tr>';
        }
        state.cache = [];
        window.API.call('getfinanceiro')
            .then(function (res) {
                if (!res) { finToast('Resposta vazia do servidor.', 'info'); return; }
                if (res.success === false) { finToast(res.message || res.error || 'Erro retornado pela API.', 'danger'); return; }
                var raw = [];
                if (Array.isArray(res)) {
                    raw = res;
                } else if (typeof res === 'object') {
                    if (Array.isArray(res.data)) raw = res.data;
                    else if (Array.isArray(res.financeiro)) raw = res.financeiro;
                    else if (Array.isArray(res.registros)) raw = res.registros;
                    else if (Array.isArray(res.lista)) raw = res.lista;
                    else if (Array.isArray(res.result)) raw = res.result;
                    else if (Array.isArray(res.results)) raw = res.results;
                }
                if (!raw.length) { finToast('Nenhum registro financeiro encontrado.', 'info'); return; }
                var registrosValidos = [];
                for (var i = 0; i < raw.length; i++) {
                    try { registrosValidos.push(normalizarRegistro(raw[i])); } catch (e) { }
                }
                state.cache = registrosValidos;
            })
            .catch(function () {
                state.cache = [];
                finToast('Erro ao carregar dados financeiros.', 'danger');
            })
            .finally(function () {
                state.fetching = false;
                spinOff();
                renderTodos();
                renderCaixa();
                renderExtrato();
            });
    }

    window.initFinanceiro = function () {
        state.fetching = false;
        state.cache = [];
        state.caixaValoresVisiveis = false;
        state.tabAtual = 'todos';
        state.filtroTipo = 'todos';
        state.filtroSituacao = 'todos';
        state.filtroBusca = '';
        state.sortDataDesc = true;
        state.todos.pagina = 1;
        state.caixa.pagina = 1;
        state.caixa.dataInicio = '';
        state.caixa.dataFim = '';
        state.caixa.dadosFiltrados = [];
        state.extrato.pagina = 1;
        state.extrato.dados = [];
        bind();
        if (els.extratoDataRef) els.extratoDataRef.value = new Date().toISOString().split('T')[0];
        registrarEventos();
        bindAdicionarDinheiroModal();
        bindTransferirModal();
        carregarDados();
    };

})();
