(function () {

    var state = {
        cache: [],
        valoresVisiveis: false,
        tabAtual: 'todos',
        filtroTipo: 'todos',
        filtroSituacao: 'todos',
        filtroBusca: '',
        fetching: false,
        sortDataDesc: true,
        todos: { pagina: 1, porPagina: 15, totalPag: 1 },
        caixa: { pagina: 1, porPagina: 20, totalPag: 1, dataInicio: '', dataFim: '', dadosFiltrados: [] },
        extrato: { pagina: 1, porPagina: 20, totalPag: 1, periodo: 'diario', dataRef: '', dados: [] }
    };

    window.financeiroState = state;

    var els = {};

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
        els.btnRefresh = document.getElementById('btn-refresh-fin');
        els.syncIcon = document.getElementById('sync-icon-fin');
        els.btnNovo = document.getElementById('btn-novo-fin');
        els.btnToggle = document.getElementById('btn-toggle-valores');
        els.btnSalvar = document.getElementById('btn-salvar-fin');
        els.modalEl = document.getElementById('modalFormFin');
        els.modalViewEl = document.getElementById('modalViewFin');
        els.spinnerSalvar = document.getElementById('spinner-salvar-fin');
        els.txtSalvar = document.getElementById('txt-salvar-fin');
        els.formTitulo = document.getElementById('form-fin-titulo');
        els.formSubtitulo = document.getElementById('fin-form-subtitle');
        els.formHeaderIcon = document.getElementById('fin-form-header-icon');
        els.formDestaqueBox = document.getElementById('fin-form-valor-destaque');
        els.formDestaquePreview = document.getElementById('fin-form-valor-preview');
        els.formErro = document.getElementById('form-fin-erro');
        els.finId = document.getElementById('fin-id');
        els.finData = document.getElementById('fin-data');
        els.finTipo = document.getElementById('fin-tipo');
        els.finValor = document.getElementById('fin-valor');
        els.finDescricao = document.getElementById('fin-descricao');
        els.finMotoboy = document.getElementById('fin-motoboy');
        els.finSituacao = document.getElementById('fin-situacao');
        els.finPedido = document.getElementById('fin-pedido');
        els.finCategoria = document.getElementById('fin-categoria');
        els.finPagamento = document.getElementById('fin-pagamento');
        els.finObs = document.getElementById('fin-obs');
        els.filtroBusca = document.getElementById('filtro-busca-fin');
        els.filtroLabel = document.getElementById('label-filtro-fin');
        els.dropdownWrapper = document.getElementById('dropdown-filtro-wrapper-fin');
        els.btnFiltro = document.getElementById('btn-filtro-fin');
        els.dropdownMenu = document.getElementById('dropdown-filtro-menu-fin');
        els.btnSubSituacao = document.getElementById('btn-sub-situacao-fin');
        els.tbodyTodos = document.getElementById('tabela-fin-body-todos');
        els.pagInfoTodos = document.getElementById('fin-pag-info-todos');
        els.pagPrevTodos = document.getElementById('fin-pag-prev-todos');
        els.pagNextTodos = document.getElementById('fin-pag-next-todos');
        els.pagLabelTodos = document.getElementById('fin-pag-label-todos');
        els.btnSortData = document.getElementById('btn-sort-data-todos');
        els.iconSortData = document.getElementById('icon-sort-data-todos');
        els.caixaDataInicio = document.getElementById('caixa-data-inicio');
        els.caixaDataFim = document.getElementById('caixa-data-fim');
        els.btnFiltrarCaixa = document.getElementById('btn-filtrar-caixa');
        els.tbodyCaixa = document.getElementById('tabela-fin-body-caixa');
        els.caixaTotalEntradas = document.getElementById('caixa-total-entradas');
        els.caixaTotalSaidas = document.getElementById('caixa-total-saidas');
        els.caixaTotalSaldo = document.getElementById('caixa-total-saldo');
        els.pagInfoCaixa = document.getElementById('fin-pag-info-caixa');
        els.pagPrevCaixa = document.getElementById('fin-pag-prev-caixa');
        els.pagNextCaixa = document.getElementById('fin-pag-next-caixa');
        els.pagLabelCaixa = document.getElementById('fin-pag-label-caixa');
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
        els.toolbarTodos = document.getElementById('toolbar-todos-fin');
    }

    function registrarEventos() {
        document.querySelectorAll('.fin-tab').forEach(function (tab) {
            tab.addEventListener('click', function (e) {
                e.preventDefault();
                var t = this.getAttribute('data-tab');
                if (!t) return;
                state.tabAtual = t;
                document.querySelectorAll('.fin-tab').forEach(function (el) { el.classList.remove('active'); });
                this.classList.add('active');
                document.querySelectorAll('.fin-tab-content').forEach(function (el) { el.classList.remove('active'); });
                var content = document.getElementById('fin-tab-content-' + t);
                if (content) content.classList.add('active');
                if (t === 'caixa') renderCaixa();
            });
        });

        if (els.btnRefresh) els.btnRefresh.addEventListener('click', function () { carregarDados(); });
        if (els.btnNovo) els.btnNovo.addEventListener('click', function () { abrirModal(null); });
        if (els.btnToggle) els.btnToggle.addEventListener('click', function () { toggleValores(); });
        if (els.btnSalvar) els.btnSalvar.addEventListener('click', function () { salvar(); });

        if (els.btnSortData) {
            els.btnSortData.addEventListener('click', function () {
                state.sortDataDesc = !state.sortDataDesc;
                atualizarIconeSort();
                state.todos.pagina = 1;
                renderTodos();
            });
        }

        if (els.filtroBusca) {
            els.filtroBusca.addEventListener('input', function () {
                state.filtroBusca = this.value.trim().toLowerCase();
                state.todos.pagina = 1;
                renderTodos();
            });
        }

        if (els.btnFiltro) {
            els.btnFiltro.addEventListener('click', function (e) {
                e.stopPropagation();
                if (els.dropdownWrapper) els.dropdownWrapper.classList.toggle('open');
            });
        }

        document.addEventListener('click', function (e) {
            if (els.dropdownWrapper && !els.dropdownWrapper.contains(e.target)) {
                els.dropdownWrapper.classList.remove('open');
            }
        });

        document.querySelectorAll('#dropdown-filtro-menu-fin > .dropdown-filtro-item:not(.dropdown-filtro-item-has-sub)').forEach(function (item) {
            item.addEventListener('click', function () {
                var filtro = this.getAttribute('data-filtro');
                state.filtroTipo = filtro;
                state.filtroSituacao = 'todos';
                state.todos.pagina = 1;
                document.querySelectorAll('#dropdown-filtro-menu-fin > .dropdown-filtro-item').forEach(function (el) { el.classList.remove('active'); });
                document.querySelectorAll('#submenu-situacao-fin .dropdown-filtro-subitem').forEach(function (el) { el.classList.remove('active'); });
                this.classList.add('active');
                var labels = { todos: 'Todos', entrada: 'Receitas', saida: 'Despesas' };
                if (els.filtroLabel) els.filtroLabel.textContent = labels[filtro] || 'Todos';
                if (els.dropdownWrapper) els.dropdownWrapper.classList.remove('open');
                renderTodos();
            });
        });

        if (els.btnSubSituacao) {
            els.btnSubSituacao.addEventListener('click', function (e) {
                e.stopPropagation();
                var parent = this.closest('.dropdown-filtro-item-has-sub');
                if (parent) parent.classList.toggle('sub-open');
            });
        }

        document.querySelectorAll('#submenu-situacao-fin .dropdown-filtro-subitem').forEach(function (item) {
            item.addEventListener('click', function () {
                var sit = this.getAttribute('data-situacao');
                state.filtroSituacao = sit;
                state.filtroTipo = 'todos';
                state.todos.pagina = 1;
                document.querySelectorAll('#dropdown-filtro-menu-fin > .dropdown-filtro-item').forEach(function (el) { el.classList.remove('active'); });
                document.querySelectorAll('#submenu-situacao-fin .dropdown-filtro-subitem').forEach(function (el) { el.classList.remove('active'); });
                this.classList.add('active');
                var parent = this.closest('.dropdown-filtro-item-has-sub');
                if (parent) parent.classList.add('active');
                var labelMap = { todos: 'Situa\u00e7\u00e3o', pago: 'Pago', recebido: 'Recebido', pendente: 'Pendente', cancelado: 'Cancelado' };
                if (els.filtroLabel) els.filtroLabel.textContent = labelMap[sit] || 'Situa\u00e7\u00e3o';
                if (els.dropdownWrapper) els.dropdownWrapper.classList.remove('open');
                renderTodos();
            });
        });

        if (els.pagPrevTodos) els.pagPrevTodos.addEventListener('click', function () { if (state.todos.pagina > 1) { state.todos.pagina--; renderTodos(); } });
        if (els.pagNextTodos) els.pagNextTodos.addEventListener('click', function () { if (state.todos.pagina < state.todos.totalPag) { state.todos.pagina++; renderTodos(); } });

        if (els.btnFiltrarCaixa) els.btnFiltrarCaixa.addEventListener('click', function () { renderCaixa(); });
        if (els.pagPrevCaixa) els.pagPrevCaixa.addEventListener('click', function () { if (state.caixa.pagina > 1) { state.caixa.pagina--; renderCaixaTabela(); } });
        if (els.pagNextCaixa) els.pagNextCaixa.addEventListener('click', function () { if (state.caixa.pagina < state.caixa.totalPag) { state.caixa.pagina++; renderCaixaTabela(); } });

        document.querySelectorAll('.extrato-periodo-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.extrato-periodo-btn').forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.extrato.periodo = this.getAttribute('data-periodo');
            });
        });

        if (els.btnGerarExtrato) els.btnGerarExtrato.addEventListener('click', function () { gerarExtrato(); });
        if (els.pagPrevExtrato) els.pagPrevExtrato.addEventListener('click', function () { if (state.extrato.pagina > 1) { state.extrato.pagina--; renderExtratoTabela(); } });
        if (els.pagNextExtrato) els.pagNextExtrato.addEventListener('click', function () { if (state.extrato.pagina < state.extrato.totalPag) { state.extrato.pagina++; renderExtratoTabela(); } });

        if (els.finValor) {
            els.finValor.addEventListener('input', function () {
                previewValor();
            });
        }

        var btnToggleCaixa = document.getElementById('btn-toggle-caixa-valores');
        if (btnToggleCaixa) {
            btnToggleCaixa.addEventListener('click', function () {
                state.valoresVisiveis = !state.valoresVisiveis;
                var icon = document.getElementById('icon-toggle-caixa-val');
                if (icon) icon.className = state.valoresVisiveis ? 'bi bi-eye' : 'bi bi-eye-slash';
                if (els.btnToggle) {
                    var gi = els.btnToggle.querySelector('i');
                    if (gi) gi.className = state.valoresVisiveis ? 'bi bi-eye' : 'bi bi-eye-slash';
                }
                atualizarResumo();
                atualizarResumoCaixa();
                atualizarRdoPaySaldo();
                renderTodos();
                if (state.caixa.dadosFiltrados.length) renderCaixaTabela();
                if (state.extrato.dados.length) gerarExtrato();
            });
        }
    }

    function atualizarIconeSort() {
        if (!els.iconSortData || !els.btnSortData) return;
        els.iconSortData.className = state.sortDataDesc ? 'bi bi-arrow-down' : 'bi bi-arrow-up';
    }

    function spinOn() {
        if (els.btnRefresh) { els.btnRefresh.classList.add('syncing'); els.btnRefresh.disabled = true; }
    }

    function spinOff() {
        if (els.btnRefresh) { els.btnRefresh.classList.remove('syncing'); els.btnRefresh.disabled = false; }
    }

    function formatarMoeda(v) {
        return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;background:' + cor.bg + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:.78rem;box-shadow:0 4px 16px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;max-width:380px;';
        toast.innerHTML = '<i class="bi ' + cor.icon + '"></i><span>' + msg + '</span>';
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

    function atualizarResumo() {
        var lista = state.cache;
        var entradas = 0, saidas = 0;
        lista.forEach(function (d) {
            if (d.tipo === 'entrada') entradas += d.valor;
            else if (d.tipo === 'saida') saidas += d.valor;
        });
        var saldo = entradas - saidas;
        var oculto = '\u2022\u2022\u2022\u2022\u2022\u2022';
        var elE = document.getElementById('total-entradas');
        var elS = document.getElementById('total-saidas');
        var elSa = document.getElementById('total-saldo');
        var elR = document.getElementById('total-registros');
        if (elE) elE.textContent = state.valoresVisiveis ? formatarMoeda(entradas) : oculto;
        if (elS) elS.textContent = state.valoresVisiveis ? formatarMoeda(saidas) : oculto;
        if (elSa) {
            elSa.textContent = state.valoresVisiveis ? formatarMoeda(saldo) : oculto;
            elSa.style.color = state.valoresVisiveis ? (saldo >= 0 ? '#198754' : '#dc3545') : '';
        }
        if (elR) elR.textContent = state.valoresVisiveis ? lista.length.toString() : oculto;
    }

    function atualizarRdoPaySaldo() {
        var el = document.getElementById('rdo-pay-saldo');
        if (!el) return;
        var oculto = '\u2022\u2022\u2022\u2022\u2022\u2022';
        if (!state.valoresVisiveis) { el.textContent = oculto; return; }
        var totalE = 0, totalS = 0;
        state.cache.forEach(function (d) {
            if (d.tipo === 'entrada') totalE += d.valor;
            else if (d.tipo === 'saida') totalS += d.valor;
        });
        el.textContent = formatarMoeda(totalE - totalS);
    }

    function dadosFiltradosTodos() {
        return state.cache.filter(function (d) {
            if (state.filtroTipo === 'entrada' && d.tipo !== 'entrada') return false;
            if (state.filtroTipo === 'saida' && d.tipo !== 'saida') return false;
            if (state.filtroSituacao !== 'todos' && d.situacao !== state.filtroSituacao) return false;
            if (state.filtroBusca) {
                var busca = state.filtroBusca;
                var match = (d.descricao || '').toLowerCase().indexOf(busca) !== -1 ||
                    (d.motoboy || '').toLowerCase().indexOf(busca) !== -1 ||
                    (d.idPedido || '').toString().toLowerCase().indexOf(busca) !== -1 ||
                    (d.dataBR || '').indexOf(busca) !== -1 ||
                    (d.id || '').toString().indexOf(busca) !== -1;
                if (!match) return false;
            }
            return true;
        });
    }

    function renderTodos() {
        if (!els.tbodyTodos) return;
        atualizarResumo();
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
            els.tbodyTodos.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox" style="font-size:1.2rem;display:block;margin-bottom:4px;opacity:.4;"></i>Nenhum registro encontrado</td></tr>';
        } else {
            els.tbodyTodos.innerHTML = pagina.map(function (d, i) {
                return '<tr>' +
                    '<td class="ps-3">' + d.dataDisplay + '</td>' +
                    '<td>' + (d.idPedido || '-') + '</td>' +
                    '<td>' + getTipoBadge(d.tipo) + '</td>' +
                    '<td class="text-truncate" style="max-width:180px;">' + (d.descricao || '-') + '</td>' +
                    '<td>' + (d.motoboy || '-') + '</td>' +
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
                if (d) abrirView(d);
            });
        });
        els.tbodyTodos.querySelectorAll('.btn-edit-todos').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var d = lista[parseInt(this.getAttribute('data-idx'))];
                if (d) abrirModal(d);
            });
        });
        els.tbodyTodos.querySelectorAll('.btn-del-todos').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var d = lista[parseInt(this.getAttribute('data-idx'))];
                if (d) confirmarExclusao(d);
            });
        });
    }

    function obterMesAtualRange() {
        var hoje = new Date();
        var y = hoje.getFullYear();
        var m = String(hoje.getMonth() + 1).padStart(2, '0');
        var lastDay = new Date(y, hoje.getMonth() + 1, 0).getDate();
        return { inicio: y + '-' + m + '-01', fim: y + '-' + m + '-' + String(lastDay).padStart(2, '0') };
    }

    function renderCaixa() {
        var di = els.caixaDataInicio ? els.caixaDataInicio.value : '';
        var df = els.caixaDataFim ? els.caixaDataFim.value : '';
        if (!di || !df) {
            var mesAtual = obterMesAtualRange();
            di = mesAtual.inicio;
            df = mesAtual.fim;
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
        renderCaixaTabela();
    }

    function atualizarResumoCaixa() {
        var lista = state.caixa.dadosFiltrados || [];
        var totalEntradas = 0;
        var totalSaidas = 0;
        var oculto = '\u2022\u2022\u2022\u2022\u2022\u2022';
        lista.forEach(function (d) {
            if (d.tipo === 'entrada') totalEntradas += d.valor;
            else if (d.tipo === 'saida') totalSaidas += d.valor;
        });
        var totalSaldo = totalEntradas - totalSaidas;
        if (els.caixaTotalEntradas) {
            els.caixaTotalEntradas.textContent = state.valoresVisiveis ? formatarMoeda(totalEntradas) : oculto;
            els.caixaTotalEntradas.style.color = '#198754';
        }
        if (els.caixaTotalSaidas) {
            els.caixaTotalSaidas.textContent = state.valoresVisiveis ? formatarMoeda(totalSaidas) : oculto;
            els.caixaTotalSaidas.style.color = '#dc3545';
        }
        if (els.caixaTotalSaldo) {
            els.caixaTotalSaldo.textContent = state.valoresVisiveis ? formatarMoeda(totalSaldo) : oculto;
            els.caixaTotalSaldo.style.color = state.valoresVisiveis ? (totalSaldo >= 0 ? '#0d6efd' : '#dc3545') : '';
        }
    }

    function renderCaixaTabela() {
        if (!els.tbodyCaixa) return;
        var lista = state.caixa.dadosFiltrados;
        var oculto = '\u2022\u2022\u2022\u2022\u2022\u2022';
        var total = lista.length;
        state.caixa.totalPag = Math.max(1, Math.ceil(total / state.caixa.porPagina));
        if (state.caixa.pagina > state.caixa.totalPag) state.caixa.pagina = state.caixa.totalPag;
        if (state.caixa.pagina < 1) state.caixa.pagina = 1;
        var inicio = (state.caixa.pagina - 1) * state.caixa.porPagina;
        var pagina = lista.slice(inicio, inicio + state.caixa.porPagina);
        if (!pagina.length) {
            els.tbodyCaixa.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox" style="font-size:1.2rem;display:block;margin-bottom:4px;opacity:.4;"></i>Nenhum registro no per\u00edodo</td></tr>';
        } else {
            var saldoAcum = 0;
            state.cache.forEach(function (d) {
                if (d.dataISO && d.dataISO < state.caixa.dataInicio) {
                    if (d.tipo === 'entrada') saldoAcum += d.valor;
                    else if (d.tipo === 'saida') saldoAcum -= d.valor;
                }
            });
            lista.slice(0, inicio).forEach(function (d) {
                if (d.tipo === 'entrada') saldoAcum += d.valor;
                else if (d.tipo === 'saida') saldoAcum -= d.valor;
            });
            els.tbodyCaixa.innerHTML = pagina.map(function (d) {
                var isE = d.tipo === 'entrada';
                var valE = isE ? d.valor : 0;
                var valS = !isE ? d.valor : 0;
                if (isE) saldoAcum += d.valor;
                else saldoAcum -= d.valor;
                var valETxt, valSTxt, saldoTxt;
                if (state.valoresVisiveis) {
                    valETxt = valE > 0 ? formatarMoeda(valE) : '-';
                    valSTxt = valS > 0 ? formatarMoeda(valS) : '-';
                    saldoTxt = formatarMoeda(saldoAcum);
                } else {
                    valETxt = valE > 0 ? oculto : '-';
                    valSTxt = valS > 0 ? oculto : '-';
                    saldoTxt = oculto;
                }
                var corEntrada = valE > 0 ? '#198754' : '#6c757d';
                var corSaida = valS > 0 ? '#dc3545' : '#6c757d';
                var corSaldo = state.valoresVisiveis ? (saldoAcum >= 0 ? '#198754' : '#dc3545') : '#333';
                return '<tr>' +
                    '<td class="ps-3">' + d.dataDisplay + '</td>' +
                    '<td class="text-truncate" style="max-width:200px;">' + (d.descricao || '-') + '</td>' +
                    '<td class="text-end" style="color:' + corEntrada + ';font-weight:600;">' + valETxt + '</td>' +
                    '<td class="text-end" style="color:' + corSaida + ';font-weight:600;">' + valSTxt + '</td>' +
                    '<td class="text-end pe-3" style="color:' + corSaldo + ';font-weight:700;">' + saldoTxt + '</td>' +
                    '</tr>';
            }).join('');
        }
        if (els.pagInfoCaixa) els.pagInfoCaixa.textContent = total + ' registro' + (total !== 1 ? 's' : '');
        if (els.pagPrevCaixa) els.pagPrevCaixa.disabled = state.caixa.pagina <= 1;
        if (els.pagNextCaixa) els.pagNextCaixa.disabled = state.caixa.pagina >= state.caixa.totalPag;
        if (els.pagLabelCaixa) els.pagLabelCaixa.textContent = 'P\u00e1g ' + state.caixa.pagina + ' de ' + state.caixa.totalPag;
    }

    function gerarExtrato() {
        var dataRef = els.extratoDataRef ? els.extratoDataRef.value : '';
        if (!dataRef) {
            finToast('Selecione uma data de refer\u00eancia.', 'info');
            return;
        }
        var periodo = state.extrato.periodo;
        var ref = new Date(dataRef + 'T12:00:00');
        var di, df, titulo, subtitulo;
        if (periodo === 'diario') {
            di = dataRef;
            df = dataRef;
            titulo = 'Extrato Di\u00e1rio';
            subtitulo = formatDateBR(dataRef);
        } else if (periodo === 'semanal') {
            var dow = ref.getDay();
            var startW = new Date(ref);
            startW.setDate(ref.getDate() - dow);
            var endW = new Date(startW);
            endW.setDate(startW.getDate() + 6);
            di = toISO(startW);
            df = toISO(endW);
            titulo = 'Extrato Semanal';
            subtitulo = formatDateBR(di) + ' a ' + formatDateBR(df);
        } else if (periodo === 'quinzenal') {
            var day = ref.getDate();
            if (day <= 15) {
                di = dataRef.substring(0, 8) + '01';
                df = dataRef.substring(0, 8) + '15';
            } else {
                di = dataRef.substring(0, 8) + '16';
                var lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
                df = dataRef.substring(0, 8) + String(lastDay).padStart(2, '0');
            }
            titulo = 'Extrato Quinzenal';
            subtitulo = formatDateBR(di) + ' a ' + formatDateBR(df);
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
        var oculto = '\u2022\u2022\u2022\u2022\u2022\u2022';
        dados.forEach(function (d) {
            if (d.tipo === 'entrada') totalE += d.valor;
            else totalS += d.valor;
        });
        var saldo = totalE - totalS;
        if (els.extratoHeaderInfo) els.extratoHeaderInfo.classList.remove('d-none');
        if (els.extratoTitulo) els.extratoTitulo.textContent = titulo;
        if (els.extratoSubtitulo) els.extratoSubtitulo.textContent = subtitulo;
        if (els.extratoTotalEntradas) els.extratoTotalEntradas.textContent = state.valoresVisiveis ? formatarMoeda(totalE) : oculto;
        if (els.extratoTotalSaidas) els.extratoTotalSaidas.textContent = state.valoresVisiveis ? formatarMoeda(totalS) : oculto;
        if (els.extratoTotalSaldo) {
            els.extratoTotalSaldo.textContent = state.valoresVisiveis ? formatarMoeda(saldo) : oculto;
            els.extratoTotalSaldo.style.color = state.valoresVisiveis ? (saldo >= 0 ? '#0d6efd' : '#dc3545') : '#0d6efd';
        }
        renderExtratoTabela();
    }

    function renderExtratoTabela() {
        if (!els.tbodyExtrato) return;
        var lista = state.extrato.dados;
        var total = lista.length;
        var oculto = '\u2022\u2022\u2022\u2022\u2022\u2022';
        state.extrato.totalPag = Math.max(1, Math.ceil(total / state.extrato.porPagina));
        if (state.extrato.pagina > state.extrato.totalPag) state.extrato.pagina = state.extrato.totalPag;
        if (state.extrato.pagina < 1) state.extrato.pagina = 1;
        var inicio = (state.extrato.pagina - 1) * state.extrato.porPagina;
        var pagina = lista.slice(inicio, inicio + state.extrato.porPagina);
        if (!pagina.length) {
            els.tbodyExtrato.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox" style="font-size:1.2rem;display:block;margin-bottom:4px;opacity:.4;"></i>Nenhum registro no per\u00edodo</td></tr>';
        } else {
            els.tbodyExtrato.innerHTML = pagina.map(function (d) {
                var isE = d.tipo === 'entrada';
                var cor = isE ? '#198754' : '#dc3545';
                var sinal = isE ? '+ ' : '- ';
                var valorTxt = state.valoresVisiveis ? (sinal + formatarMoeda(d.valor)) : oculto;
                return '<tr>' +
                    '<td class="ps-3">' + d.dataDisplay + '</td>' +
                    '<td>' + (d.idPedido || '-') + '</td>' +
                    '<td>' + getTipoBadge(d.tipo) + '</td>' +
                    '<td class="text-truncate" style="max-width:160px;">' + (d.descricao || '-') + '</td>' +
                    '<td>' + (d.motoboy || '-') + '</td>' +
                    '<td class="text-end" style="color:' + cor + ';font-weight:600;">' + valorTxt + '</td>' +
                    '<td class="text-center pe-3">' + getStatusBadge(d.situacao) + '</td>' +
                    '</tr>';
            }).join('');
        }
        if (els.pagInfoExtrato) els.pagInfoExtrato.textContent = total + ' registro' + (total !== 1 ? 's' : '');
        if (els.pagPrevExtrato) els.pagPrevExtrato.disabled = state.extrato.pagina <= 1;
        if (els.pagNextExtrato) els.pagNextExtrato.disabled = state.extrato.pagina >= state.extrato.totalPag;
        if (els.pagLabelExtrato) els.pagLabelExtrato.textContent = 'P\u00e1g ' + state.extrato.pagina + ' de ' + state.extrato.totalPag;
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

    function toggleValores() {
        state.valoresVisiveis = !state.valoresVisiveis;
        if (els.btnToggle) {
            els.btnToggle.innerHTML = state.valoresVisiveis ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        }
        var iconCaixa = document.getElementById('icon-toggle-caixa-val');
        if (iconCaixa) iconCaixa.className = state.valoresVisiveis ? 'bi bi-eye' : 'bi bi-eye-slash';
        atualizarResumo();
        atualizarRdoPaySaldo();
        renderTodos();
        if (state.caixa.dadosFiltrados.length || (state.caixa.dataInicio && state.caixa.dataFim)) {
            atualizarResumoCaixa();
            renderCaixaTabela();
        }
        if (state.extrato.dados.length) gerarExtrato();
    }

    function abrirView(d) {
        if (!els.modalViewEl) els.modalViewEl = document.getElementById('modalViewFin');
        if (!els.modalViewEl) return;
        var isE = d.tipo === 'entrada';
        var header = document.getElementById('fin-view-header');
        if (header) {
            header.classList.remove('fin-extrato-header-entrada', 'fin-extrato-header-saida');
            header.classList.add(isE ? 'fin-extrato-header-entrada' : 'fin-extrato-header-saida');
        }
        var iconWrap = document.getElementById('fin-view-tipo-icon');
        if (iconWrap) iconWrap.innerHTML = isE ? '<i class="bi bi-arrow-down-left"></i>' : '<i class="bi bi-arrow-up-right"></i>';
        var tipoLabel = document.getElementById('fin-view-tipo-label');
        if (tipoLabel) tipoLabel.textContent = isE ? 'RECEITA' : 'DESPESA';
        var dataEl = document.getElementById('fin-view-data');
        if (dataEl) dataEl.textContent = d.dataBR || '-';
        var valorEl = document.getElementById('fin-view-valor');
        if (valorEl) valorEl.textContent = formatarMoeda(d.valor);
        var statusDot = document.getElementById('fin-view-status-dot');
        if (statusDot) statusDot.className = 'fin-extrato-status-dot status-' + (d.situacao || 'pendente');
        var statusText = document.getElementById('fin-view-status-text');
        if (statusText) {
            var situacaoMap = { pago: 'Pago', recebido: 'Recebido', pendente: 'Pendente', cancelado: 'Cancelado' };
            statusText.textContent = situacaoMap[d.situacao] || 'Pendente';
        }
        var idEl = document.getElementById('fin-view-id');
        if (idEl) idEl.textContent = '#' + (d.id || '0000');
        var descEl = document.getElementById('fin-view-descricao');
        if (descEl) descEl.textContent = d.descricao || '-';
        var catEl = document.getElementById('fin-view-categoria');
        if (catEl) catEl.textContent = d.categoria || '-';
        var pagEl = document.getElementById('fin-view-pagamento');
        if (pagEl) {
            var pagMap = { pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Cart\u00e3o Cr\u00e9dito', cartao_debito: 'Cart\u00e3o D\u00e9bito', boleto: 'Boleto', transferencia: 'Transfer\u00eancia' };
            pagEl.textContent = pagMap[(d.pagamento || '').toLowerCase()] || d.pagamento || '-';
        }
        var motEl = document.getElementById('fin-view-motoboy');
        if (motEl) motEl.textContent = (d.motoboy && d.motoboy !== '-') ? d.motoboy : '-';
        var pedEl = document.getElementById('fin-view-pedido');
        if (pedEl) pedEl.textContent = d.idPedido || '-';
        var obsEl = document.getElementById('fin-view-obs');
        if (obsEl) obsEl.textContent = d.observacao || '-';
        var tsEl = document.getElementById('fin-view-timestamp');
        if (tsEl) {
            var now = new Date();
            tsEl.textContent = 'Consultado em ' + String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear() + ' \u00e0s ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        }
        var btnEditar = document.getElementById('fin-view-btn-editar');
        if (btnEditar) {
            var newBtn = btnEditar.cloneNode(true);
            btnEditar.parentNode.replaceChild(newBtn, btnEditar);
            newBtn.addEventListener('click', function () {
                var inst = bootstrap.Modal.getInstance(els.modalViewEl);
                if (inst) inst.hide();
                setTimeout(function () { abrirModal(d); }, 300);
            });
        }
        new bootstrap.Modal(els.modalViewEl).show();
    }

    function limparFormulario() {
        if (els.finId) els.finId.value = '';
        if (els.finData) els.finData.value = '';
        if (els.finTipo) els.finTipo.value = '';
        if (els.finValor) els.finValor.value = '';
        if (els.finDescricao) els.finDescricao.value = '';
        if (els.finMotoboy) els.finMotoboy.value = '';
        if (els.finSituacao) els.finSituacao.value = 'pendente';
        if (els.finPedido) els.finPedido.value = '';
        if (els.finCategoria) els.finCategoria.value = '';
        if (els.finPagamento) els.finPagamento.value = '';
        if (els.finObs) els.finObs.value = '';
        if (els.formErro) els.formErro.classList.add('d-none');
        if (els.formDestaqueBox) els.formDestaqueBox.classList.add('d-none');
    }

    function mostrarErroForm(msg) {
        if (!els.formErro) return;
        els.formErro.textContent = msg;
        els.formErro.classList.remove('d-none');
    }

    function rebindModalEls() {
        if (!els.modalEl) els.modalEl = document.getElementById('modalFormFin');
        if (!els.btnSalvar) {
            els.btnSalvar = document.getElementById('btn-salvar-fin');
            if (els.btnSalvar) els.btnSalvar.addEventListener('click', function () { salvar(); });
        }
        if (!els.spinnerSalvar) els.spinnerSalvar = document.getElementById('spinner-salvar-fin');
        if (!els.txtSalvar) els.txtSalvar = document.getElementById('txt-salvar-fin');
        if (!els.formTitulo) els.formTitulo = document.getElementById('form-fin-titulo');
        if (!els.formSubtitulo) els.formSubtitulo = document.getElementById('fin-form-subtitle');
        if (!els.formHeaderIcon) els.formHeaderIcon = document.getElementById('fin-form-header-icon');
        if (!els.formDestaqueBox) els.formDestaqueBox = document.getElementById('fin-form-valor-destaque');
        if (!els.formDestaquePreview) els.formDestaquePreview = document.getElementById('fin-form-valor-preview');
        if (!els.formErro) els.formErro = document.getElementById('form-fin-erro');
        if (!els.finId) els.finId = document.getElementById('fin-id');
        if (!els.finData) els.finData = document.getElementById('fin-data');
        if (!els.finTipo) els.finTipo = document.getElementById('fin-tipo');
        if (!els.finValor) els.finValor = document.getElementById('fin-valor');
        if (!els.finDescricao) els.finDescricao = document.getElementById('fin-descricao');
        if (!els.finMotoboy) els.finMotoboy = document.getElementById('fin-motoboy');
        if (!els.finSituacao) els.finSituacao = document.getElementById('fin-situacao');
        if (!els.finPedido) els.finPedido = document.getElementById('fin-pedido');
        if (!els.finCategoria) els.finCategoria = document.getElementById('fin-categoria');
        if (!els.finPagamento) els.finPagamento = document.getElementById('fin-pagamento');
        if (!els.finObs) els.finObs = document.getElementById('fin-obs');
    }

    function abrirModal(item) {
        rebindModalEls();
        if (!els.modalEl) return;
        limparFormulario();
        if (item) {
            if (els.formTitulo) els.formTitulo.textContent = 'Editar Lan\u00e7amento';
            if (els.formSubtitulo) els.formSubtitulo.textContent = '#' + (item.id || '') + ' \u00b7 ' + (item.dataBR || '');
            if (els.formHeaderIcon) {
                els.formHeaderIcon.className = 'fin-form-header-icon';
                els.formHeaderIcon.innerHTML = '<i class="bi bi-pencil-square"></i>';
            }
            if (els.finId) els.finId.value = item.id || '';
            if (els.finData) els.finData.value = item.dataISO || '';
            if (els.finTipo) els.finTipo.value = item.tipo || '';
            if (els.finDescricao) els.finDescricao.value = item.descricao || '';
            if (els.finMotoboy) els.finMotoboy.value = item.motoboy === '-' ? '' : (item.motoboy || '');
            if (els.finSituacao) els.finSituacao.value = item.situacao || 'pendente';
            if (els.finPedido) els.finPedido.value = item.idPedido || '';
            if (els.finValor) els.finValor.value = parseFloat(item.valor || 0).toFixed(2).replace('.', ',');
            if (els.finCategoria) els.finCategoria.value = item.categoria || '';
            if (els.finPagamento) els.finPagamento.value = item.pagamento || '';
            if (els.finObs) els.finObs.value = item.observacao || '';
            if (els.formDestaqueBox) {
                els.formDestaqueBox.classList.remove('d-none');
                if (els.formDestaquePreview) els.formDestaquePreview.textContent = formatarMoeda(item.valor);
            }
        } else {
            if (els.formTitulo) els.formTitulo.textContent = 'Novo Lan\u00e7amento';
            if (els.formSubtitulo) els.formSubtitulo.textContent = 'Preencha os dados abaixo';
            if (els.formHeaderIcon) {
                els.formHeaderIcon.className = 'fin-form-header-icon';
                els.formHeaderIcon.innerHTML = '<i class="bi bi-plus-circle"></i>';
            }
            if (els.finData) els.finData.value = new Date().toISOString().split('T')[0];
        }
        new bootstrap.Modal(els.modalEl).show();
    }

    function previewValor() {
        if (!els.finValor || !els.formDestaquePreview || !els.formDestaqueBox) return;
        var raw = els.finValor.value.replace(/\./g, '').replace(',', '.');
        var valor = parseFloat(raw) || 0;
        if (valor > 0) {
            els.formDestaqueBox.classList.remove('d-none');
            els.formDestaquePreview.textContent = formatarMoeda(valor);
        } else {
            els.formDestaqueBox.classList.add('d-none');
        }
    }

    function toggleSalvarLoading(ativo) {
        if (els.btnSalvar) els.btnSalvar.disabled = ativo;
        if (els.spinnerSalvar) els.spinnerSalvar.classList.toggle('d-none', !ativo);
        if (els.txtSalvar) els.txtSalvar.textContent = ativo ? 'Salvando...' : 'Salvar';
    }

    function salvar() {
        if (els.formErro) els.formErro.classList.add('d-none');
        var id = els.finId ? els.finId.value : '';
        var dataISO = els.finData ? els.finData.value : '';
        var tipo = els.finTipo ? els.finTipo.value : '';
        var descricao = els.finDescricao ? els.finDescricao.value.trim() : '';
        var valorRaw = els.finValor ? els.finValor.value.replace(/\./g, '').replace(',', '.') : '0';
        var valor = parseFloat(valorRaw) || 0;
        var motoboy = els.finMotoboy ? els.finMotoboy.value.trim() : '';
        var situacao = els.finSituacao ? els.finSituacao.value : 'pendente';
        var idPedido = els.finPedido ? els.finPedido.value.trim() : '';
        var categoria = els.finCategoria ? els.finCategoria.value.trim() : '';
        var pagamento = els.finPagamento ? els.finPagamento.value : '';
        var observacao = els.finObs ? els.finObs.value.trim() : '';
        if (!dataISO) { mostrarErroForm('Informe a data.'); return; }
        if (!tipo) { mostrarErroForm('Selecione o tipo.'); return; }
        if (!descricao) { mostrarErroForm('Informe a descri\u00e7\u00e3o.'); return; }
        if (valor <= 0) { mostrarErroForm('Informe um valor v\u00e1lido.'); return; }
        var dataParts = dataISO.split('-');
        var dataBR = dataParts[2] + '/' + dataParts[1] + '/' + dataParts[0];
        var payload = {
            data: dataBR,
            tipo: tipo,
            descricao: descricao,
            valor: valor,
            motoboy: motoboy,
            situacao: situacao,
            id_pedido: idPedido
        };
        if (categoria) payload.categoria = categoria;
        if (pagamento) payload.pagamento = pagamento;
        if (observacao) payload.observacao = observacao;
        if (id) payload.id = id;
        var action = id ? 'editfinanceiro' : 'addfinanceiro';
        toggleSalvarLoading(true);
        window.API.call(action, payload)
            .then(function (res) {
                var sucesso = false;
                var msg = '';
                if (res) {
                    msg = (res.message || res.msg || res.mensagem || '').toString().toLowerCase();
                    if (res.success === true || res.success === 'true' || res.success === 1) sucesso = true;
                    else if (msg.indexOf('adicionado') !== -1 || msg.indexOf('salvo') !== -1 || msg.indexOf('criado') !== -1 || msg.indexOf('atualizado') !== -1 || msg.indexOf('editado') !== -1 || msg.indexOf('sucesso') !== -1) sucesso = true;
                }
                if (sucesso) {
                    var inst = bootstrap.Modal.getInstance(els.modalEl);
                    if (inst) inst.hide();
                    finToast(id ? 'Lan\u00e7amento atualizado!' : 'Lan\u00e7amento criado!', 'success');
                    carregarDados();
                } else {
                    mostrarErroForm('Erro ao salvar: ' + ((res && (res.message || res.msg)) || 'Erro desconhecido'));
                }
            })
            .catch(function () {
                mostrarErroForm('Falha na comunica\u00e7\u00e3o com o servidor.');
            })
            .finally(function () {
                toggleSalvarLoading(false);
            });
    }

    function confirmarExclusao(item) {
        var descLabel = item.descricao || 'este lan\u00e7amento';
        var valLabel = formatarMoeda(item.valor);
        var isE = item.tipo === 'entrada';
        var tipoLabel = isE ? 'Receita' : 'Despesa';
        var corTipo = isE ? '#198754' : '#dc3545';
        var old = document.getElementById('modal-fin-confirmar-excluir');
        if (old) old.remove();
        var html = '<div class="modal fade" id="modal-fin-confirmar-excluir" tabindex="-1" aria-hidden="true">' +
            '<div class="modal-dialog modal-dialog-centered modal-sm">' +
            '<div class="modal-content border-0 shadow-lg" style="border-radius:14px;">' +
            '<div class="modal-body text-center p-4">' +
            '<div class="mb-3"><div style="width:52px;height:52px;border-radius:50%;background:rgba(220,53,69,0.08);display:inline-flex;align-items:center;justify-content:center;">' +
            '<i class="bi bi-trash" style="font-size:1.4rem;color:#dc3545;"></i></div></div>' +
            '<h6 class="fw-bold mb-1" style="font-size:.88rem;">Excluir Lan\u00e7amento?</h6>' +
            '<p class="text-muted mb-2" style="font-size:.74rem;">Esta a\u00e7\u00e3o n\u00e3o poder\u00e1 ser desfeita.</p>' +
            '<div style="background:#f8f9fa;border-radius:8px;padding:10px;margin-bottom:16px;">' +
            '<div style="font-size:.76rem;font-weight:600;color:#333;">' + descLabel + '</div>' +
            '<div style="font-size:.72rem;color:' + corTipo + ';font-weight:500;">' + tipoLabel + ' \u2022 ' + valLabel + '</div></div>' +
            '<div class="d-flex gap-2">' +
            '<button type="button" class="btn btn-light btn-sm rounded-pill flex-fill" data-bs-dismiss="modal" style="font-size:.74rem;">Cancelar</button>' +
            '<button type="button" class="btn btn-danger btn-sm rounded-pill flex-fill" id="btn-confirmar-excluir-fin" style="font-size:.74rem;">' +
            '<i class="bi bi-trash me-1"></i>Excluir</button>' +
            '</div></div></div></div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
        var modalEl = document.getElementById('modal-fin-confirmar-excluir');
        var modalInst = new bootstrap.Modal(modalEl);
        document.getElementById('btn-confirmar-excluir-fin').addEventListener('click', function () {
            modalInst.hide();
            excluir(item.id);
        });
        modalEl.addEventListener('hidden.bs.modal', function () {
            if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
        });
        modalInst.show();
    }

    function excluir(id) {
        window.API.call('delfinanceiro', { id: id })
            .then(function (res) {
                var sucesso = false;
                var msg = '';
                if (res) {
                    msg = (res.message || res.msg || res.mensagem || '').toString().toLowerCase();
                    if (res.success === true || res.success === 'true' || res.success === 1) sucesso = true;
                    else if (msg.indexOf('exclu') !== -1 || msg.indexOf('removido') !== -1 || msg.indexOf('deletado') !== -1 || msg.indexOf('sucesso') !== -1) sucesso = true;
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

    function carregarDados() {
        if (state.fetching) return;
        state.fetching = true;
        spinOn();
        if (els.tbodyTodos) {
            els.tbodyTodos.innerHTML = '<tr><td colspan="7" class="text-center py-5"><div class="spinner-border spinner-border-sm text-danger opacity-50"></div><div class="mt-2 fin-loading-text">Buscando dados<span class="fin-dots"></span></div></td></tr>';
        }
        if (els.tbodyCaixa) {
            els.tbodyCaixa.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm text-danger opacity-50"></div><div class="mt-2 fin-loading-text">Atualizando<span class="fin-dots"></span></div></td></tr>';
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
                atualizarRdoPaySaldo();
                renderCaixa();
                renderExtrato();
            });
    }

    function renderExtrato() {
        if (state.extrato.dados.length) {
            renderExtratoTabela();
        }
    }

    function gerarChaveAleatoria() {
        var chars = 'abcdef0123456789';
        var parts = [8, 4, 4, 4, 12];
        return parts.map(function (len) {
            var s = '';
            for (var i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
            return s;
        }).join('-');
    }

    function bindPixModal() {
        var btnNovaChave = document.getElementById('btn-nova-chave-pix');
        var formNova = document.getElementById('form-nova-chave-pix');
        var btnCancelar = document.getElementById('btn-cancelar-chave-pix');
        var btnSalvarChave = document.getElementById('btn-salvar-chave-pix');
        var listaCont = document.getElementById('lista-chaves-pix');
        var tipoBtns = document.querySelectorAll('.rdo-tipo-chave-btn');
        var labelInput = document.getElementById('label-input-chave-pix');
        var inputValor = document.getElementById('input-valor-chave-pix');
        var tipoSel = 'cpf';
        if (!window.rdoPixChaves) window.rdoPixChaves = [];
        var placeholders = { cpf: '000.000.000-00', email: 'seuemail@exemplo.com', telefone: '(31) 99999-0000', aleatoria: 'Gerada automaticamente' };
        var labels = { cpf: 'CPF', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleat\u00f3ria' };
        var iconMap = { cpf: 'bi-person-vcard', email: 'bi-envelope', telefone: 'bi-phone', aleatoria: 'bi-shuffle' };
        var corMap = { cpf: '#6c5ce7', email: '#e17055', telefone: '#00b894', aleatoria: '#0984e3' };

        function renderChaves() {
            if (!listaCont) return;
            if (!window.rdoPixChaves.length) {
                listaCont.innerHTML = '<div class="text-center text-muted py-3" style="font-size:.78rem;"><i class="bi bi-key" style="font-size:1.1rem;display:block;margin-bottom:4px;opacity:.4;"></i>Nenhuma chave cadastrada</div>';
                return;
            }
            listaCont.innerHTML = window.rdoPixChaves.map(function (ch, idx) {
                return '<div class="rdo-chave-item">' +
                    '<div class="d-flex align-items-center gap-2">' +
                    '<div class="rdo-chave-icon" style="background:' + (corMap[ch.tipo] || '#6c757d') + ';"><i class="bi ' + (iconMap[ch.tipo] || 'bi-key') + '"></i></div>' +
                    '<div><div class="fw-semibold">' + (labels[ch.tipo] || ch.tipo) + '</div><div class="text-muted" style="font-size:.7rem;">' + ch.valor + '</div></div>' +
                    '</div>' +
                    '<button class="btn btn-outline-danger btn-sm rounded-pill px-2 rdo-del-chave" data-idx="' + idx + '" style="font-size:.65rem;"><i class="bi bi-trash"></i></button>' +
                    '</div>';
            }).join('');
            listaCont.querySelectorAll('.rdo-del-chave').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var i = parseInt(this.getAttribute('data-idx'));
                    window.rdoPixChaves.splice(i, 1);
                    renderChaves();
                });
            });
        }

        if (btnNovaChave) {
            btnNovaChave.addEventListener('click', function () {
                if (formNova) formNova.classList.remove('d-none');
                btnNovaChave.classList.add('d-none');
                if (inputValor) inputValor.value = '';
                tipoSel = 'cpf';
                if (labelInput) labelInput.textContent = labels[tipoSel];
                if (inputValor) { inputValor.placeholder = placeholders[tipoSel]; inputValor.disabled = false; }
                tipoBtns.forEach(function (b) { b.classList.remove('active'); });
                if (tipoBtns.length) tipoBtns[0].classList.add('active');
            });
        }
        if (btnCancelar) {
            btnCancelar.addEventListener('click', function () {
                if (formNova) formNova.classList.add('d-none');
                if (btnNovaChave) btnNovaChave.classList.remove('d-none');
            });
        }
        tipoBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                tipoBtns.forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                tipoSel = this.getAttribute('data-tipo');
                if (labelInput) labelInput.textContent = labels[tipoSel];
                if (inputValor) {
                    inputValor.placeholder = placeholders[tipoSel];
                    if (tipoSel === 'aleatoria') { inputValor.value = gerarChaveAleatoria(); inputValor.disabled = true; }
                    else { inputValor.value = ''; inputValor.disabled = false; }
                }
            });
        });
        if (btnSalvarChave) {
            btnSalvarChave.addEventListener('click', function () {
                var val = inputValor ? inputValor.value.trim() : '';
                if (!val) { finToast('Informe o valor da chave.', 'info'); return; }
                window.rdoPixChaves.push({ tipo: tipoSel, valor: val });
                renderChaves();
                if (formNova) formNova.classList.add('d-none');
                if (btnNovaChave) btnNovaChave.classList.remove('d-none');
                finToast('Chave Pix cadastrada!', 'success');
            });
        }
        var btnEnviar = document.getElementById('btn-confirmar-pix-envio');
        if (btnEnviar) {
            btnEnviar.addEventListener('click', function () {
                var chave = document.getElementById('pix-chave-dest');
                var valorPix = document.getElementById('pix-valor-envio');
                var descPix = document.getElementById('pix-descricao-envio');
                if (!chave || !chave.value.trim()) { finToast('Informe a chave Pix do destinat\u00e1rio.', 'info'); return; }
                if (!valorPix || !valorPix.value.trim()) { finToast('Informe o valor.', 'info'); return; }
                finToast('Pix de R$ ' + valorPix.value.trim() + ' enviado com sucesso!', 'success');
                var modalPix = document.getElementById('modalPix');
                if (modalPix) { var inst = bootstrap.Modal.getInstance(modalPix); if (inst) inst.hide(); }
                chave.value = '';
                valorPix.value = '';
                if (descPix) descPix.value = '';
            });
        }
        renderChaves();
    }

    function bindAdicionarDinheiroModal() {
        var btn = document.getElementById('btn-confirmar-add-dinheiro');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var valorEl = document.getElementById('add-dinheiro-valor');
            var origemEl = document.getElementById('add-dinheiro-origem');
            var descEl = document.getElementById('add-dinheiro-descricao');
            var valor = valorEl ? valorEl.value.trim() : '';
            var origem = origemEl ? origemEl.value : '';
            if (!valor) { finToast('Informe o valor.', 'info'); return; }
            finToast('Dep\u00f3sito de R$ ' + valor + ' adicionado via ' + origem + '!', 'success');
            var modalEl = document.getElementById('modalAdicionarDinheiro');
            if (modalEl) { var inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.hide(); }
            if (valorEl) valorEl.value = '';
            if (descEl) descEl.value = '';
        });
    }

    function bindTransferirModal() {
        var btn = document.getElementById('btn-confirmar-transferencia');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var bancoEl = document.getElementById('transf-banco');
            var agenciaEl = document.getElementById('transf-agencia');
            var contaEl = document.getElementById('transf-conta');
            var valorEl = document.getElementById('transf-valor');
            var descEl = document.getElementById('transf-descricao');
            var banco = bancoEl ? bancoEl.value.trim() : '';
            var conta = contaEl ? contaEl.value.trim() : '';
            var valor = valorEl ? valorEl.value.trim() : '';
            if (!banco || !conta || !valor) { finToast('Preencha banco, conta e valor.', 'info'); return; }
            finToast('Transfer\u00eancia de R$ ' + valor + ' para ' + banco + ' realizada!', 'success');
            var modalEl = document.getElementById('modalTransferir');
            if (modalEl) { var inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.hide(); }
            if (bancoEl) bancoEl.value = '';
            if (agenciaEl) agenciaEl.value = '';
            if (contaEl) contaEl.value = '';
            if (valorEl) valorEl.value = '';
            if (descEl) descEl.value = '';
        });
    }

    function bindExtratoModal() {
        var btn = document.getElementById('btn-filtrar-extrato-modal');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var diEl = document.getElementById('extrato-modal-di');
            var dfEl = document.getElementById('extrato-modal-df');
            var di = diEl ? diEl.value : '';
            var df = dfEl ? dfEl.value : '';
            if (!di || !df) {
                var hoje = new Date();
                var y = hoje.getFullYear();
                var m = String(hoje.getMonth() + 1).padStart(2, '0');
                di = di || y + '-' + m + '-01';
                var lastDay = new Date(y, hoje.getMonth() + 1, 0).getDate();
                df = df || y + '-' + m + '-' + String(lastDay).padStart(2, '0');
                if (diEl) diEl.value = di;
                if (dfEl) dfEl.value = df;
            }
            var dados = state.cache.filter(function (d) {
                return d.dataISO && d.dataISO >= di && d.dataISO <= df;
            }).sort(function (a, b) {
                return (a.dataISO || '').localeCompare(b.dataISO || '');
            });
            var totalE = 0, totalS = 0;
            dados.forEach(function (d) {
                if (d.tipo === 'entrada') totalE += d.valor;
                else if (d.tipo === 'saida') totalS += d.valor;
            });
            var saldo = totalE - totalS;
            var show = state.valoresVisiveis;
            var oculto = '\u2022\u2022\u2022\u2022\u2022\u2022';
            var elModalE = document.getElementById('extrato-modal-entradas');
            var elModalS = document.getElementById('extrato-modal-saidas');
            var elModalSaldo = document.getElementById('extrato-modal-saldo');
            if (elModalE) elModalE.textContent = show ? formatarMoeda(totalE) : oculto;
            if (elModalS) elModalS.textContent = show ? formatarMoeda(totalS) : oculto;
            if (elModalSaldo) {
                elModalSaldo.textContent = show ? formatarMoeda(saldo) : oculto;
                elModalSaldo.style.color = show ? (saldo >= 0 ? '#0d6efd' : '#dc3545') : '#0d6efd';
            }
            var tbody = document.getElementById('extrato-modal-tbody');
            if (!tbody) return;
            if (!dados.length) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3" style="font-size:.78rem;">Nenhum registro no per\u00edodo</td></tr>';
                return;
            }
            tbody.innerHTML = dados.map(function (d) {
                var isE = d.tipo === 'entrada';
                var cor = isE ? '#198754' : '#dc3545';
                var sinal = isE ? '+ ' : '- ';
                var valorTxt = show ? (sinal + formatarMoeda(d.valor)) : oculto;
                return '<tr>' +
                    '<td class="ps-2" style="font-size:.75rem;">' + d.dataDisplay + '</td>' +
                    '<td class="text-truncate" style="max-width:150px;font-size:.75rem;">' + (d.descricao || '-') + '</td>' +
                    '<td>' + getTipoBadge(d.tipo) + '</td>' +
                    '<td class="text-end" style="color:' + cor + ';font-weight:600;font-size:.78rem;">' + valorTxt + '</td>' +
                    '<td class="text-center pe-2">' + getStatusBadge(d.situacao) + '</td>' +
                    '</tr>';
            }).join('');
        });
    }

    window.initFinanceiro = function () {
        state.fetching = false;
        state.cache = [];
        state.valoresVisiveis = false;
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
        mascaraValor(els.finValor);
        if (els.extratoDataRef) els.extratoDataRef.value = new Date().toISOString().split('T')[0];
        registrarEventos();
        atualizarIconeSort();
        bindPixModal();
        bindAdicionarDinheiroModal();
        bindTransferirModal();
        bindExtratoModal();
        carregarDados();
    };

})();
