(function () {

    var state = {
        cache: [],
        pagina: 1,
        porPagina: 15,
        valoresVisiveis: false,
        tabAtual: 'todos',
        mesFiltro: '',
        fetching: false
    };

    window.financeiroState = state;

    var els = {};

    function normalizarRegistro(d) {
        var tipoRaw = (d.tipo || '').toString().trim().toUpperCase();
        var tipoNorm = 'entrada';
        if (tipoRaw === 'DESPESA' || tipoRaw === 'SAIDA') {
            tipoNorm = 'saida';
        } else if (tipoRaw === 'RECEITA' || tipoRaw === 'ENTRADA') {
            tipoNorm = 'entrada';
        }

        var dataRaw = (d.data || '').toString().trim();
        var dataNorm = dataRaw;
        if (dataRaw.indexOf('/') !== -1) {
            var p = dataRaw.split('/');
            if (p.length === 3 && p[0].length <= 2) {
                dataNorm = p[2] + '-' + p[1].padStart(2, '0') + '-' + p[0].padStart(2, '0');
            }
        }

        var valorRaw = d.valor;
        var valorNorm = 0;
        if (typeof valorRaw === 'number') {
            valorNorm = valorRaw;
        } else if (typeof valorRaw === 'string') {
            valorNorm = parseFloat(valorRaw.replace(/\./g, '').replace(',', '.')) || 0;
        }

        var situacao = (d.situacao || d.status || 'pendente').toString().trim().toLowerCase();

        return {
            id: d.id || '',
            idPedido: d.id_pedido || d.idPedido || '',
            data: dataNorm,
            tipo: tipoNorm,
            descricao: d.descricao || '',
            valor: valorNorm,
            motoboy: d.motoboy || '-',
            status: situacao,
            categoria: d.categoria || '',
            formaPagamento: d.formaPagamento || '',
            observacao: d.observacao || ''
        };
    }

    function bind() {
        els.tbody = document.getElementById('tabela-fin-body');
        els.btnRefresh = document.getElementById('btn-refresh-fin');
        els.syncIcon = document.getElementById('sync-icon-fin');
        els.btnNovo = document.getElementById('btn-novo-fin');
        els.btnToggle = document.getElementById('btn-toggle-valores');
        els.btnSalvar = document.getElementById('btn-salvar-form-fin');
        els.filtroMes = document.getElementById('filtro-mes-fin');
        els.modalEl = document.getElementById('modalFormFin');
        els.modalViewEl = document.getElementById('modal-fin-view');
        els.modalViewBody = document.getElementById('modal-fin-view-body');
        els.spinnerSalvar = document.getElementById('spinner-salvar-fin');
        els.txtSalvar = document.getElementById('txt-salvar-fin');
        els.pagInfo = document.getElementById('fin-pag-info');
        els.pagControls = document.getElementById('fin-pag-controls');
        els.formTitulo = document.getElementById('form-fin-titulo');
        els.formErro = document.getElementById('form-fin-erro');
        els.finId = document.getElementById('fin-id');
        els.finData = document.getElementById('fin-data');
        els.finTipo = document.getElementById('fin-tipo');
        els.finCategoria = document.getElementById('fin-categoria');
        els.finValor = document.getElementById('fin-valor');
        els.finDescricao = document.getElementById('fin-descricao');
        els.finStatus = document.getElementById('fin-status');
        els.finPagamento = document.getElementById('fin-pagamento');
        els.finObservacao = document.getElementById('fin-observacao');
        els.headerNome = document.getElementById('fin-user-nome');
        els.headerCargo = document.getElementById('fin-user-cargo');
    }

    function atualizarHeaderUsuario() {
        var username = localStorage.getItem('username') || 'Usu\u00e1rio';
        var cargo = localStorage.getItem('tipo') || '';

        if (els.headerNome) els.headerNome.textContent = username;
        if (els.headerCargo) els.headerCargo.textContent = cargo;

        if (typeof window.atualizarAvatar === 'function') {
            window.atualizarAvatar();
        }
    }

    function registrarEventos() {
        document.querySelectorAll('.btn-tab-fin').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tab = btn.getAttribute('data-tab');
                if (tab) {
                    state.tabAtual = tab;
                    state.pagina = 1;
                    atualizarTabsAtivas();
                    renderTabela();
                }
            });
        });

        if (els.btnRefresh) {
            els.btnRefresh.addEventListener('click', function () {
                carregarDados();
            });
        }

        if (els.btnNovo) {
            els.btnNovo.addEventListener('click', function () {
                abrirModal(null);
            });
        }

        if (els.btnToggle) {
            els.btnToggle.addEventListener('click', function () {
                toggleValores();
            });
        }

        if (els.btnSalvar) {
            els.btnSalvar.addEventListener('click', function () {
                salvar();
            });
        }

        if (els.filtroMes) {
            els.filtroMes.addEventListener('change', function () {
                state.mesFiltro = els.filtroMes.value || '';
                state.pagina = 1;
                renderTabela();
            });
        }
    }

    function atualizarTabsAtivas() {
        document.querySelectorAll('.btn-tab-fin').forEach(function (btn) {
            var tab = btn.getAttribute('data-tab');
            btn.classList.toggle('active', tab === state.tabAtual);
        });
    }

    function spinOn() {
        if (els.syncIcon) els.syncIcon.classList.add('fin-sync-spinning');
    }

    function spinOff() {
        if (els.syncIcon) els.syncIcon.classList.remove('fin-sync-spinning');
    }

    function getColCount() {
        var showTipo = state.tabAtual === 'todos' || state.tabAtual === 'extrato';
        return showTipo ? 7 : 6;
    }

    function mostrarLoading() {
        if (!els.tbody) return;
        els.tbody.innerHTML =
            '<tr><td colspan="' + getColCount() + '" class="text-center py-5">' +
            '<div class="spinner-border spinner-border-sm text-danger opacity-50"></div>' +
            '<div class="mt-2 fin-loading-text-init">Buscando dados...</div>' +
            '</td></tr>';
    }

    function formatarMoeda(v) {
        return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatarDataBR(dataStr) {
        if (!dataStr) return '';
        if (dataStr.indexOf('/') !== -1) return dataStr;
        var p = dataStr.split('-');
        if (p.length < 3) return dataStr;
        return p[2] + '/' + p[1] + '/' + p[0];
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
        toast.style.cssText =
            'position:fixed;top:20px;right:20px;z-index:9999;background:' + cor.bg +
            ';color:#fff;padding:12px 20px;border-radius:10px;font-size:.78rem;' +
            'box-shadow:0 4px 16px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;' +
            'animation:finToastIn .3s ease;max-width:380px;';
        toast.innerHTML = '<i class="bi ' + cor.icon + '"></i><span>' + msg + '</span>';
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity .3s ease';
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }

    function confirmarExclusao(item) {
        var descLabel = item.descricao || 'este lan\u00e7amento';
        var valLabel = formatarMoeda(item.valor);
        var isEntrada = item.tipo === 'entrada';
        var tipoLabel = isEntrada ? 'Receita' : 'Despesa';
        var corTipo = isEntrada ? '#198754' : '#dc3545';

        var old = document.getElementById('modal-fin-confirmar-excluir');
        if (old) old.remove();

        var html =
            '<div class="modal fade" id="modal-fin-confirmar-excluir" tabindex="-1" aria-hidden="true">' +
            '<div class="modal-dialog modal-dialog-centered modal-sm">' +
            '<div class="modal-content border-0 shadow-lg" style="border-radius:14px;">' +
            '<div class="modal-body text-center p-4">' +
            '<div class="mb-3">' +
            '<div style="width:52px;height:52px;border-radius:50%;background:rgba(220,53,69,0.08);display:inline-flex;align-items:center;justify-content:center;">' +
            '<i class="bi bi-trash" style="font-size:1.4rem;color:#dc3545;"></i>' +
            '</div></div>' +
            '<h6 class="fw-bold mb-1" style="font-size:.88rem;">Excluir Lan\u00e7amento?</h6>' +
            '<p class="text-muted mb-2" style="font-size:.74rem;">Esta a\u00e7\u00e3o n\u00e3o poder\u00e1 ser desfeita.</p>' +
            '<div style="background:#f8f9fa;border-radius:8px;padding:10px;margin-bottom:16px;">' +
            '<div style="font-size:.76rem;font-weight:600;color:#333;">' + descLabel + '</div>' +
            '<div style="font-size:.72rem;color:' + corTipo + ';font-weight:500;">' + tipoLabel + ' \u2022 ' + valLabel + '</div>' +
            '</div>' +
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

    function dadosFiltrados() {
        return state.cache.filter(function (d) {
            var okTab = true;
            if (state.tabAtual === 'entrada') {
                okTab = d.tipo === 'entrada';
            } else if (state.tabAtual === 'saida') {
                okTab = d.tipo === 'saida';
            }

            var okMes = true;
            if (state.mesFiltro) {
                var dt = (d.data || '').substring(0, 7);
                okMes = dt === state.mesFiltro;
            }

            return okTab && okMes;
        });
    }

    function dadosParaResumo() {
        return state.cache.filter(function (d) {
            if (!state.mesFiltro) return true;
            return (d.data || '').substring(0, 7) === state.mesFiltro;
        });
    }

    function atualizarResumo() {
        var lista = dadosParaResumo();
        var entradas = 0;
        var saidas = 0;

        lista.forEach(function (d) {
            var val = parseFloat(d.valor) || 0;
            if (d.tipo === 'entrada') {
                entradas += val;
            } else if (d.tipo === 'saida') {
                saidas += val;
            }
        });

        var saldo = entradas - saidas;

        var elEntradas = document.getElementById('total-entradas');
        var elSaidas = document.getElementById('total-saidas');
        var elSaldo = document.getElementById('total-saldo');
        var elRegistros = document.getElementById('total-registros');

        if (elEntradas) elEntradas.textContent = state.valoresVisiveis ? formatarMoeda(entradas) : '\u2022\u2022\u2022\u2022\u2022\u2022';
        if (elSaidas) elSaidas.textContent = state.valoresVisiveis ? formatarMoeda(saidas) : '\u2022\u2022\u2022\u2022\u2022\u2022';
        if (elSaldo) {
            elSaldo.textContent = state.valoresVisiveis ? formatarMoeda(saldo) : '\u2022\u2022\u2022\u2022\u2022\u2022';
            if (state.valoresVisiveis) {
                elSaldo.style.color = saldo >= 0 ? '#198754' : '#dc3545';
            } else {
                elSaldo.style.color = '';
            }
        }
        if (elRegistros) elRegistros.textContent = state.valoresVisiveis ? lista.length.toString() : '\u2022\u2022\u2022\u2022\u2022\u2022';
    }

    function getStatusBadge(status) {
        var s = (status || '').toLowerCase();
        if (s === 'pago') return '<span class="badge badge-fin-pago">Pago</span>';
        if (s === 'recebido') return '<span class="badge badge-fin-recebido">Recebido</span>';
        if (s === 'cancelado') return '<span class="badge badge-fin-cancelado">Cancelado</span>';
        return '<span class="badge badge-fin-pendente">' + (status || 'Pendente') + '</span>';
    }

    function getTipoBadge(tipo) {
        if (tipo === 'entrada') {
            return '<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:.68rem;font-weight:600;background:rgba(25,135,84,0.1);color:#198754;">RECEITA</span>';
        }
        return '<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:.68rem;font-weight:600;background:rgba(220,53,69,0.1);color:#dc3545;">DESPESA</span>';
    }

    function atualizarHeaderTabela() {
        var thead = document.getElementById('tabela-fin-head');
        if (!thead) return;

        var showTipo = state.tabAtual === 'todos' || state.tabAtual === 'extrato';

        var html = '<tr>';
        html += '<th class="ps-3 border-0 fw-normal" style="width:100px;">Data</th>';
        html += '<th class="border-0 fw-normal">Descri\u00e7\u00e3o</th>';
        html += '<th class="border-0 fw-normal" style="width:110px;">Motoboy</th>';
        if (showTipo) {
            html += '<th class="border-0 fw-normal" style="width:90px;">Tipo</th>';
        }
        html += '<th class="border-0 fw-normal text-end" style="width:130px;">Valor</th>';
        html += '<th class="border-0 fw-normal text-center" style="width:90px;">Situa\u00e7\u00e3o</th>';
        html += '<th class="text-end pe-3 border-0 fw-normal" style="width:110px;">A\u00e7\u00f5es</th>';
        html += '</tr>';

        thead.innerHTML = html;
    }

    function renderTabela() {
        atualizarHeaderTabela();

        if (!els.tbody) return;

        var showTipo = state.tabAtual === 'todos' || state.tabAtual === 'extrato';
        var isExtrato = state.tabAtual === 'extrato';
        var lista = dadosFiltrados();

        if (isExtrato) {
            lista.sort(function (a, b) {
                return (b.data || '').localeCompare(a.data || '');
            });
        }

        atualizarResumo();

        var total = lista.length;
        var totalPag = Math.max(1, Math.ceil(total / state.porPagina));
        if (state.pagina > totalPag) state.pagina = totalPag;
        if (state.pagina < 1) state.pagina = 1;

        var inicio = (state.pagina - 1) * state.porPagina;
        var pagina = lista.slice(inicio, inicio + state.porPagina);

        if (!pagina.length) {
            els.tbody.innerHTML =
                '<tr><td colspan="' + getColCount() + '" class="text-center text-muted py-4" style="font-size:.78rem;">' +
                '<i class="bi bi-inbox" style="font-size:1.2rem;display:block;margin-bottom:4px;opacity:.4;"></i>' +
                'Nenhum registro encontrado</td></tr>';
        } else {
            els.tbody.innerHTML = pagina.map(function (d, i) {
                return renderLinha(d, i, isExtrato, showTipo);
            }).join('');
        }

        if (els.pagInfo) els.pagInfo.textContent = total + ' registro' + (total !== 1 ? 's' : '');

        renderPaginacao(totalPag);
        bindAcoes(pagina);
    }

    function renderLinha(d, idx, isExtrato, showTipo) {
        var val = parseFloat(d.valor) || 0;
        var isEntrada = d.tipo === 'entrada';
        var corValor = isEntrada ? '#198754' : '#dc3545';
        var prefixo = isExtrato ? (isEntrada ? '+ ' : '- ') : '';
        var classBorda = isExtrato ? (isEntrada ? 'fin-extrato-entrada' : 'fin-extrato-saida') : '';
        var dataF = formatarDataBR(d.data);
        var valorTxt = state.valoresVisiveis ? prefixo + formatarMoeda(val) : '\u2022\u2022\u2022\u2022\u2022\u2022';
        var descricao = d.descricao || '-';
        var motoboy = (d.motoboy && d.motoboy !== '-') ? d.motoboy : '-';

        var colTipo = '';
        if (showTipo) {
            colTipo = '<td>' + getTipoBadge(d.tipo) + '</td>';
        }

        return '<tr class="' + classBorda + '">' +
            '<td class="ps-3">' + dataF + '</td>' +
            '<td>' + descricao + '</td>' +
            '<td>' + motoboy + '</td>' +
            colTipo +
            '<td class="text-end" style="color:' + corValor + ';font-weight:600;">' + valorTxt + '</td>' +
            '<td class="text-center">' + getStatusBadge(d.status) + '</td>' +
            '<td class="text-end pe-3">' +
            '<div class="d-inline-flex gap-1">' +
            '<button class="btn-acao-fin btn-view-fin" data-idx="' + idx + '" title="Visualizar"><i class="bi bi-eye"></i></button>' +
            '<button class="btn-acao-fin btn-edit-fin" data-idx="' + idx + '" title="Editar"><i class="bi bi-pencil-square"></i></button>' +
            '<button class="btn-acao-fin btn-del-fin" data-idx="' + idx + '" title="Excluir"><i class="bi bi-trash"></i></button>' +
            '</div></td></tr>';
    }

    function renderPaginacao(totalPag) {
        if (!els.pagControls) return;
        if (totalPag <= 1) {
            els.pagControls.innerHTML = '';
            return;
        }

        var html = '';

        html += '<button class="btn btn-sm btn-outline-secondary px-2 py-0"' +
            (state.pagina <= 1 ? ' disabled' : '') +
            ' data-pg="' + (state.pagina - 1) + '" style="font-size:.7rem;">' +
            '<i class="bi bi-chevron-left"></i></button>';

        var start = Math.max(1, state.pagina - 2);
        var end = Math.min(totalPag, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);

        for (var p = start; p <= end; p++) {
            html += '<button class="btn btn-sm px-2 py-0 ' +
                (p === state.pagina ? 'btn-danger' : 'btn-outline-secondary') +
                '" data-pg="' + p + '" style="font-size:.7rem;">' + p + '</button>';
        }

        html += '<button class="btn btn-sm btn-outline-secondary px-2 py-0"' +
            (state.pagina >= totalPag ? ' disabled' : '') +
            ' data-pg="' + (state.pagina + 1) + '" style="font-size:.7rem;">' +
            '<i class="bi bi-chevron-right"></i></button>';

        els.pagControls.innerHTML = html;

        els.pagControls.querySelectorAll('[data-pg]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var pg = parseInt(this.getAttribute('data-pg'));
                if (pg >= 1 && pg <= totalPag) {
                    state.pagina = pg;
                    renderTabela();
                }
            });
        });
    }

    function bindAcoes(listaPagina) {
        if (!els.tbody || !listaPagina) return;

        els.tbody.querySelectorAll('.btn-view-fin').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-idx'));
                var d = listaPagina[idx];
                if (d) abrirView(d);
            });
        });

        els.tbody.querySelectorAll('.btn-edit-fin').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-idx'));
                var d = listaPagina[idx];
                if (d) abrirModal(d);
            });
        });

        els.tbody.querySelectorAll('.btn-del-fin').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-idx'));
                var d = listaPagina[idx];
                if (d) confirmarExclusao(d);
            });
        });
    }

    function abrirView(d) {
        if (!els.modalViewEl || !els.modalViewBody) return;

        var val = parseFloat(d.valor) || 0;
        var isEntrada = d.tipo === 'entrada';
        var corValor = isEntrada ? '#198754' : '#dc3545';
        var tipoLabel = isEntrada ? 'Receita' : 'Despesa';
        var dataF = formatarDataBR(d.data);

        var formaPgMap = {
            pix: 'PIX',
            dinheiro: 'Dinheiro',
            cartao_credito: 'Cart\u00e3o Cr\u00e9dito',
            cartao_debito: 'Cart\u00e3o D\u00e9bito',
            boleto: 'Boleto',
            transferencia: 'Transfer\u00eancia'
        };
        var formaLabel = formaPgMap[d.formaPagamento] || d.formaPagamento || '-';

        var html = '';
        html += viewRow('C\u00f3d. Pedido', d.idPedido || '-');
        html += viewRow('Data', dataF || '-');
        html += viewRow('Tipo', '<span style="color:' + corValor + ';font-weight:600;">' + tipoLabel + '</span>');
        html += viewRow('Descri\u00e7\u00e3o', d.descricao || '-');
        html += viewRow('Motoboy', d.motoboy || '-');
        html += viewRow('Valor', '<span style="color:' + corValor + ';font-weight:700;font-size:.95rem;">' + formatarMoeda(val) + '</span>');
        html += viewRow('Situa\u00e7\u00e3o', getStatusBadge(d.status));
        html += viewRow('Forma Pagto', formaLabel);
        if (d.categoria) html += viewRow('Categoria', d.categoria);
        if (d.observacao) html += viewRow('Observa\u00e7\u00e3o', d.observacao);

        els.modalViewBody.innerHTML = html;
        new bootstrap.Modal(els.modalViewEl).show();
    }

    function viewRow(label, value) {
        return '<div class="fin-view-row">' +
            '<span class="fin-view-label">' + label + '</span>' +
            '<span class="fin-view-value">' + value + '</span>' +
            '</div>';
    }

    function toggleValores() {
        state.valoresVisiveis = !state.valoresVisiveis;

        if (els.btnToggle) {
            if (state.valoresVisiveis) {
                els.btnToggle.innerHTML = '<i class="bi bi-eye"></i>';
                els.btnToggle.classList.add('valores-ativos');
            } else {
                els.btnToggle.innerHTML = '<i class="bi bi-eye-slash"></i>';
                els.btnToggle.classList.remove('valores-ativos');
            }
        }

        renderTabela();
    }

    function carregarDados() {
        if (state.fetching) return;
        state.fetching = true;

        spinOn();
        mostrarLoading();

        window.API.call('getfinanceiro')
            .then(function (res) {
                var raw = [];
                if (res && res.success && Array.isArray(res.data)) {
                    raw = res.data;
                } else if (Array.isArray(res)) {
                    raw = res;
                }
                state.cache = raw.map(function (d) {
                    return normalizarRegistro(d);
                });
            })
            .catch(function () {
                state.cache = [];
                finToast('Erro ao carregar dados financeiros.', 'danger');
            })
            .finally(function () {
                state.fetching = false;
                state.pagina = 1;
                spinOff();
                renderTabela();
            });
    }

    function limparFormulario() {
        if (els.finId) els.finId.value = '';
        if (els.finData) els.finData.value = '';
        if (els.finTipo) els.finTipo.value = '';
        if (els.finCategoria) els.finCategoria.value = '';
        if (els.finValor) els.finValor.value = '';
        if (els.finDescricao) els.finDescricao.value = '';
        if (els.finStatus) els.finStatus.value = 'pendente';
        if (els.finPagamento) els.finPagamento.value = '';
        if (els.finObservacao) els.finObservacao.value = '';
        if (els.formErro) els.formErro.classList.add('d-none');
    }

    function mostrarErroForm(msg) {
        if (!els.formErro) return;
        els.formErro.textContent = msg;
        els.formErro.classList.remove('d-none');
    }

    function abrirModal(item) {
        if (!els.modalEl) return;

        limparFormulario();

        if (item) {
            if (els.formTitulo) els.formTitulo.innerHTML = '<i class="bi bi-pencil-square text-danger me-2"></i>Editar Lan\u00e7amento';
            if (els.finId) els.finId.value = item.id || '';
            if (els.finData) els.finData.value = item.data || '';
            if (els.finTipo) els.finTipo.value = item.tipo || '';
            if (els.finCategoria) els.finCategoria.value = item.categoria || '';
            if (els.finDescricao) els.finDescricao.value = item.descricao || '';
            if (els.finStatus) els.finStatus.value = item.status || 'pendente';
            if (els.finPagamento) els.finPagamento.value = item.formaPagamento || '';
            if (els.finObservacao) els.finObservacao.value = item.observacao || '';
            if (els.finValor) {
                els.finValor.value = parseFloat(item.valor || 0).toFixed(2).replace('.', ',');
            }
        } else {
            if (els.formTitulo) els.formTitulo.innerHTML = '<i class="bi bi-plus-circle text-danger me-2"></i>Novo Lan\u00e7amento';
            if (els.finData) els.finData.value = new Date().toISOString().split('T')[0];
        }

        new bootstrap.Modal(els.modalEl).show();
    }

    function toggleSalvarLoading(ativo) {
        if (els.btnSalvar) els.btnSalvar.disabled = ativo;
        if (els.spinnerSalvar) els.spinnerSalvar.classList.toggle('d-none', !ativo);
        if (els.txtSalvar) els.txtSalvar.textContent = ativo ? 'Salvando...' : 'Salvar';
    }

    function salvar() {
        if (els.formErro) els.formErro.classList.add('d-none');

        var id = els.finId ? els.finId.value : '';
        var data = els.finData ? els.finData.value : '';
        var tipo = els.finTipo ? els.finTipo.value : '';
        var descricao = els.finDescricao ? els.finDescricao.value.trim() : '';
        var valorRaw = els.finValor ? els.finValor.value.replace(',', '.') : '0';
        var valor = parseFloat(valorRaw) || 0;

        if (!data) { mostrarErroForm('Informe a data do lan\u00e7amento.'); return; }
        if (!tipo) { mostrarErroForm('Selecione o tipo: Receita ou Despesa.'); return; }
        if (!descricao) { mostrarErroForm('Informe a descri\u00e7\u00e3o do lan\u00e7amento.'); return; }
        if (valor <= 0) { mostrarErroForm('Informe um valor v\u00e1lido maior que zero.'); return; }

        var payload = {
            data: data,
            tipo: tipo,
            categoria: els.finCategoria ? els.finCategoria.value.trim() : '',
            valor: valor,
            descricao: descricao,
            status: els.finStatus ? els.finStatus.value : 'pendente',
            formaPagamento: els.finPagamento ? els.finPagamento.value : '',
            observacao: els.finObservacao ? els.finObservacao.value.trim() : ''
        };

        if (id) payload.id = id;

        var action = id ? 'editfinanceiro' : 'addfinanceiro';

        toggleSalvarLoading(true);

        window.API.call(action, payload)
            .then(function (res) {
                if (res && res.success) {
                    var inst = bootstrap.Modal.getInstance(els.modalEl);
                    if (inst) inst.hide();
                    finToast(id ? 'Lan\u00e7amento atualizado!' : 'Lan\u00e7amento criado!', 'success');
                    carregarDados();
                } else {
                    mostrarErroForm('Erro ao salvar: ' + ((res && res.message) || 'Erro desconhecido'));
                }
            })
            .catch(function () {
                mostrarErroForm('Falha na comunica\u00e7\u00e3o com o servidor.');
            })
            .finally(function () {
                toggleSalvarLoading(false);
            });
    }

    function excluir(id) {
        window.API.call('delfinanceiro', { id: id })
            .then(function (res) {
                if (res && res.success) {
                    finToast('Lan\u00e7amento exclu\u00eddo com sucesso.', 'success');
                    carregarDados();
                } else {
                    finToast('Erro ao excluir lan\u00e7amento.', 'danger');
                }
            })
            .catch(function () {
                finToast('Falha na comunica\u00e7\u00e3o com o servidor.', 'danger');
            });
    }

    window.initFinanceiro = function () {
        state.fetching = false;
        state.cache = [];
        state.pagina = 1;
        state.valoresVisiveis = false;
        state.tabAtual = 'todos';
        state.mesFiltro = '';

        bind();
        atualizarHeaderUsuario();

        if (els.filtroMes) els.filtroMes.value = '';

        mascaraValor(els.finValor);
        registrarEventos();
        carregarDados();
    };

})();
