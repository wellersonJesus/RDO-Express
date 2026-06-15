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

    function bind() {
        els.tbody = document.getElementById('tabela-fin-body');
        els.btnRefresh = document.getElementById('btn-refresh-fin');
        els.syncIcon = document.getElementById('sync-icon-fin');
        els.btnNovo = document.getElementById('btn-novo-fin');
        els.btnToggle = document.getElementById('btn-toggle-valores');
        els.btnSalvar = document.getElementById('btn-salvar-fin');
        els.filtroMes = document.getElementById('filtro-mes-fin');
        els.modalEl = document.getElementById('modal-fin');
        els.spinnerSalvar = document.getElementById('spinner-salvar-fin');
        els.txtSalvar = document.getElementById('txt-salvar-fin');
        els.pagInfo = document.getElementById('fin-pag-info');
        els.pagControls = document.getElementById('fin-pag-controls');
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
            els.btnRefresh.onclick = function () { carregarDados(); };
        }

        if (els.btnNovo) {
            els.btnNovo.onclick = function () { abrirModal(null); };
        }

        if (els.btnToggle) {
            els.btnToggle.onclick = function () { toggleValores(); };
        }

        if (els.btnSalvar) {
            els.btnSalvar.onclick = function () { salvar(); };
        }

        if (els.filtroMes) {
            els.filtroMes.onclick = function () {};
            els.filtroMes.addEventListener('change', function () {
                state.mesFiltro = els.filtroMes.value || '';
                state.pagina = 1;
                renderTabela();
            });
        }
    }

    function atualizarTabsAtivas() {
        document.querySelectorAll('.btn-tab-fin').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === state.tabAtual);
        });
    }

    function spinOn() {
        if (els.syncIcon) els.syncIcon.classList.add('fin-sync-spinning');
    }

    function spinOff() {
        if (els.syncIcon) els.syncIcon.classList.remove('fin-sync-spinning');
    }

    function mostrarLoading() {
        if (!els.tbody) return;
        els.tbody.innerHTML =
            '<tr><td colspan="7" class="text-center p-5">' +
            '<span class="fin-loading-text">Buscando dados<span class="fin-dots"></span></span>' +
            '</td></tr>';
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

    function dadosFiltrados() {
        return state.cache.filter(function (d) {
            var okTab = true;
            if (state.tabAtual === 'entrada') okTab = d.tipo === 'entrada';
            else if (state.tabAtual === 'saida') okTab = d.tipo === 'saida';
            else if (state.tabAtual === 'extrato') okTab = true;

            var okMes = true;
            if (state.mesFiltro) {
                var dt = (d.data || '').substring(0, 7);
                okMes = dt === state.mesFiltro;
            }

            return okTab && okMes;
        });
    }

    function atualizarResumo(lista) {
        var entradas = 0;
        var saidas = 0;
        lista.forEach(function (d) {
            var val = parseFloat(String(d.valor || 0).replace(',', '.'));
            if (d.tipo === 'entrada') entradas += val;
            else saidas += val;
        });
        var saldo = entradas - saidas;

        var elEntradas = document.getElementById('total-entradas');
        var elSaidas = document.getElementById('total-saidas');
        var elSaldo = document.getElementById('total-saldo');
        var elRegistros = document.getElementById('total-registros');

        if (elEntradas) elEntradas.textContent = state.valoresVisiveis ? formatarMoeda(entradas) : '****';
        if (elSaidas) elSaidas.textContent = state.valoresVisiveis ? formatarMoeda(saidas) : '****';
        if (elSaldo) elSaldo.textContent = state.valoresVisiveis ? formatarMoeda(saldo) : '****';
        if (elRegistros) elRegistros.textContent = state.valoresVisiveis ? lista.length.toString() : '****';
    }

    function getStatusBadge(status) {
        switch ((status || '').toLowerCase()) {
            case 'pago': return '<span class="badge badge-fin-pago">Pago</span>';
            case 'recebido': return '<span class="badge badge-fin-recebido">Recebido</span>';
            case 'pendente': return '<span class="badge badge-fin-pendente">Pendente</span>';
            case 'cancelado': return '<span class="badge badge-fin-cancelado">Cancelado</span>';
            default: return '<span class="badge badge-fin-pendente">' + (status || 'Pendente') + '</span>';
        }
    }

    function renderTabela() {
        if (!els.tbody) return;

        var lista = dadosFiltrados();

        if (state.tabAtual === 'extrato') {
            lista.sort(function (a, b) {
                return (b.data || '').localeCompare(a.data || '');
            });
        }

        atualizarResumo(state.tabAtual === 'todos' || state.tabAtual === 'extrato' ? state.cache.filter(function (d) {
            if (!state.mesFiltro) return true;
            return (d.data || '').substring(0, 7) === state.mesFiltro;
        }) : lista);

        var total = lista.length;
        var totalPag = Math.max(1, Math.ceil(total / state.porPagina));
        if (state.pagina > totalPag) state.pagina = totalPag;
        if (state.pagina < 1) state.pagina = 1;

        var inicio = (state.pagina - 1) * state.porPagina;
        var pagina = lista.slice(inicio, inicio + state.porPagina);

        if (!pagina.length) {
            els.tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3" style="font-size:.78rem;">Nenhum registro encontrado</td></tr>';
        } else if (state.tabAtual === 'extrato') {
            els.tbody.innerHTML = pagina.map(function (d, i) { return renderLinhaExtrato(d, inicio + i); }).join('');
        } else {
            els.tbody.innerHTML = pagina.map(function (d, i) { return renderLinha(d, inicio + i); }).join('');
        }

        if (els.pagInfo) els.pagInfo.textContent = total + ' registro' + (total !== 1 ? 's' : '');

        renderPaginacao(totalPag);
        bindAcoes(lista);
    }

    function renderLinha(d, idx) {
        var val = parseFloat(String(d.valor || 0).replace(',', '.'));
        var corValor = d.tipo === 'entrada' ? '#198754' : '#dc3545';
        var iconeTipo = d.tipo === 'entrada'
            ? '<i class="bi bi-arrow-down-circle-fill" style="color:#198754;font-size:.75rem;"></i>'
            : '<i class="bi bi-arrow-up-circle-fill" style="color:#dc3545;font-size:.75rem;"></i>';
        var dataF = d.data ? d.data.split('-').reverse().join('/') : '';

        return '<tr>' +
            '<td>' + dataF + '</td>' +
            '<td>' + iconeTipo + '</td>' +
            '<td>' + (d.categoria || '') + '</td>' +
            '<td>' + (d.descricao || '') + '</td>' +
            '<td class="text-end" style="color:' + corValor + ';">' + (state.valoresVisiveis ? formatarMoeda(val) : '****') + '</td>' +
            '<td>' + getStatusBadge(d.status) + '</td>' +
            '<td class="text-center">' +
            '<button class="btn btn-sm btn-link p-0 me-2 btn-edit-fin" data-idx="' + idx + '" title="Editar"><i class="bi bi-pencil" style="font-size:.78rem;"></i></button>' +
            '<button class="btn btn-sm btn-link p-0 text-danger btn-del-fin" data-idx="' + idx + '" title="Excluir"><i class="bi bi-trash" style="font-size:.78rem;"></i></button>' +
            '</td>' +
            '</tr>';
    }

    function renderLinhaExtrato(d, idx) {
        var val = parseFloat(String(d.valor || 0).replace(',', '.'));
        var isEntrada = d.tipo === 'entrada';
        var corValor = isEntrada ? '#198754' : '#dc3545';
        var prefixo = isEntrada ? '+' : '-';
        var iconeTipo = isEntrada
            ? '<i class="bi bi-arrow-down-circle-fill" style="color:#198754;font-size:.75rem;"></i>'
            : '<i class="bi bi-arrow-up-circle-fill" style="color:#dc3545;font-size:.75rem;"></i>';
        var dataF = d.data ? d.data.split('-').reverse().join('/') : '';
        var classBorda = isEntrada ? 'fin-extrato-entrada' : 'fin-extrato-saida';

        return '<tr class="' + classBorda + '">' +
            '<td>' + dataF + '</td>' +
            '<td>' + iconeTipo + '</td>' +
            '<td>' + (d.categoria || '') + '</td>' +
            '<td>' + (d.descricao || '') + '</td>' +
            '<td class="text-end fw-semibold" style="color:' + corValor + ';">' + (state.valoresVisiveis ? prefixo + ' ' + formatarMoeda(val) : '****') + '</td>' +
            '<td>' + getStatusBadge(d.status) + '</td>' +
            '<td class="text-center">' +
            '<button class="btn btn-sm btn-link p-0 me-2 btn-edit-fin" data-idx="' + idx + '" title="Editar"><i class="bi bi-pencil" style="font-size:.78rem;"></i></button>' +
            '<button class="btn btn-sm btn-link p-0 text-danger btn-del-fin" data-idx="' + idx + '" title="Excluir"><i class="bi bi-trash" style="font-size:.78rem;"></i></button>' +
            '</td>' +
            '</tr>';
    }

    function renderPaginacao(totalPag) {
        if (!els.pagControls) return;
        if (totalPag <= 1) { els.pagControls.innerHTML = ''; return; }

        var html = '';
        html += '<button class="btn btn-sm btn-outline-secondary px-2 py-0" ' + (state.pagina <= 1 ? 'disabled' : '') + ' data-pg="' + (state.pagina - 1) + '" style="font-size:.7rem;"><i class="bi bi-chevron-left"></i></button>';

        var start = Math.max(1, state.pagina - 2);
        var end = Math.min(totalPag, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);

        for (var p = start; p <= end; p++) {
            html += '<button class="btn btn-sm px-2 py-0 ' + (p === state.pagina ? 'btn-danger' : 'btn-outline-secondary') + '" data-pg="' + p + '" style="font-size:.7rem;">' + p + '</button>';
        }

        html += '<button class="btn btn-sm btn-outline-secondary px-2 py-0" ' + (state.pagina >= totalPag ? 'disabled' : '') + ' data-pg="' + (state.pagina + 1) + '" style="font-size:.7rem;"><i class="bi bi-chevron-right"></i></button>';

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

    function bindAcoes(lista) {
        if (!els.tbody) return;

        els.tbody.querySelectorAll('.btn-edit-fin').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-idx'));
                var d = lista[idx];
                if (d) abrirModal(d);
            });
        });

        els.tbody.querySelectorAll('.btn-del-fin').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-idx'));
                var d = lista[idx];
                if (!d) return;
                if (!confirm('Excluir este lançamento?')) return;
                excluir(d.id);
            });
        });
    }

    function toggleValores() {
        state.valoresVisiveis = !state.valoresVisiveis;

        if (els.btnToggle) {
            if (state.valoresVisiveis) {
                els.btnToggle.innerHTML = '<i class="bi bi-eye" style="font-size:.95rem;color:#6c757d;"></i>';
                els.btnToggle.classList.add('valores-ativos');
            } else {
                els.btnToggle.innerHTML = '<i class="bi bi-eye-slash" style="font-size:.95rem;color:#6c757d;"></i>';
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
                if (res && res.success && Array.isArray(res.data)) {
                    state.cache = res.data;
                } else if (Array.isArray(res)) {
                    state.cache = res;
                } else {
                    state.cache = [];
                }
            })
            .catch(function (e) {
                console.error('[Fin] Erro fetch:', e.message);
                state.cache = [];
            })
            .finally(function () {
                state.fetching = false;
                state.pagina = 1;
                spinOff();
                renderTabela();
            });
    }

    function abrirModal(item) {
        if (!els.modalEl) return;

        var titulo = document.getElementById('modal-fin-title');
        var form = document.getElementById('form-fin');
        var obs = document.getElementById('fin-observacao');

        if (form) form.reset();
        document.getElementById('fin-id').value = '';
        if (obs) obs.value = '';

        if (item) {
            if (titulo) titulo.textContent = 'Editar Lançamento';
            document.getElementById('fin-id').value = item.id || '';
            document.getElementById('fin-data').value = item.data || '';
            document.getElementById('fin-tipo').value = item.tipo || '';
            document.getElementById('fin-categoria').value = item.categoria || '';
            document.getElementById('fin-descricao').value = item.descricao || '';
            document.getElementById('fin-status').value = item.status || 'pendente';
            document.getElementById('fin-pagamento').value = item.formaPagamento || '';
            if (obs) obs.value = item.observacao || '';
            var v = parseFloat(String(item.valor || 0).replace(',', '.')).toFixed(2).replace('.', ',');
            document.getElementById('fin-valor').value = v;
        } else {
            if (titulo) titulo.textContent = 'Novo Lançamento';
            document.getElementById('fin-data').value = new Date().toISOString().split('T')[0];
        }

        new bootstrap.Modal(els.modalEl).show();
    }

    function toggleSalvarLoading(ativo) {
        if (els.btnSalvar) els.btnSalvar.disabled = ativo;
        if (els.spinnerSalvar) {
            els.spinnerSalvar.classList.toggle('d-none', !ativo);
            els.spinnerSalvar.classList.toggle('fin-spinner-active', ativo);
        }
        if (els.txtSalvar) els.txtSalvar.textContent = ativo ? 'Salvando...' : 'Salvar';
    }

    function salvar() {
        var id = document.getElementById('fin-id').value;
        var valorRaw = document.getElementById('fin-valor').value.replace(',', '.');
        var obs = document.getElementById('fin-observacao');

        var payload = {
            data: document.getElementById('fin-data').value,
            tipo: document.getElementById('fin-tipo').value,
            categoria: document.getElementById('fin-categoria').value,
            valor: parseFloat(valorRaw) || 0,
            descricao: document.getElementById('fin-descricao').value,
            status: document.getElementById('fin-status').value,
            formaPagamento: document.getElementById('fin-pagamento').value,
            observacao: obs ? obs.value : ''
        };

        if (id) payload.id = id;

        if (!payload.data || !payload.tipo || !payload.categoria || !payload.valor) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        var action = id ? 'editfinanceiro' : 'addfinanceiro';

        toggleSalvarLoading(true);

        window.API.call(action, payload)
            .then(function (res) {
                if (res && res.success) {
                    var inst = bootstrap.Modal.getInstance(els.modalEl);
                    if (inst) inst.hide();
                    carregarDados();
                } else {
                    alert('Erro ao salvar: ' + ((res && res.message) || 'Erro desconhecido'));
                }
            })
            .catch(function () {
                alert('Falha na comunicação com o servidor.');
            })
            .finally(function () {
                toggleSalvarLoading(false);
            });
    }

    function excluir(id) {
        window.API.call('delfinanceiro', { id: id })
            .then(function (res) {
                if (res && res.success) carregarDados();
                else alert('Erro ao excluir.');
            })
            .catch(function () {
                alert('Falha na comunicação.');
            });
    }

    window.initFinanceiro = function () {
        state.fetching = false;
        state.cache = [];
        state.pagina = 1;
        state.valoresVisiveis = false;
        state.tabAtual = 'todos';

        bind();

        var now = new Date();
        state.mesFiltro = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        if (els.filtroMes) els.filtroMes.value = state.mesFiltro;

        mascaraValor(document.getElementById('fin-valor'));
        registrarEventos();
        carregarDados();
    };

})();
