(function () {
    var ACTIONS = {
        clientes: {
            listar: 'getclientes',
            criar: 'addclientes',
            atualizar: 'updateclientes',
            excluir: 'deleteclientes'
        },
        colaboradores: {
            listar: 'getcolaboradores',
            criar: 'addcolaboradores',
            atualizar: 'updatecolaboradores',
            excluir: 'deletecolaboradores'
        }
    };

    var state = {
        origem: 'clientes',
        cache: [],
        pagina: 1,
        porPagina: 15,
        filtro: '',
        tipoFiltro: 'todos',
        blocoAtivo: 'todos',
        filtroStatus: 'todos',
        fetching: false,
        idEdicao: null,
        modoVisualizar: false,
        formCarregado: false,
        sortDesc: false
    };
    window.adminState = state;

    var els = {};

    function bind() {
        els.tbody = document.getElementById('admin-list');
        els.filtro = document.getElementById('filtro-admin');
        els.syncIcon = document.getElementById('sync-icon-admin');
        els.btnSync = document.getElementById('btn-sync-admin');
        els.btnNovo = document.getElementById('btn-novo-admin');
        els.infoPag = document.getElementById('info-paginacao-admin');
        els.btnPrev = document.getElementById('btn-pag-prev-admin');
        els.btnNext = document.getElementById('btn-pag-next-admin');
        els.modalContainer = document.getElementById('admin-modal-container');
        els.thead = document.querySelector('#tabela-admin thead');
        els.iconSortNome = document.getElementById('icon-sort-nome-admin');
        els.thPagamento = document.getElementById('th-pagamento-admin');
        els.blocosPagamento = document.querySelectorAll('.admin-bloco-pagamento');
        els.wrapperFiltro = document.getElementById('dropdown-filtro-wrapper-admin');
        els.btnFiltro = document.getElementById('btn-filtro-admin');
        els.menuFiltro = document.getElementById('dropdown-filtro-menu-admin');
        els.labelFiltro = document.getElementById('label-filtro-admin');
        els.btnLoopHeader = document.getElementById('btn-loop-admin');
        els.iconLoopHeader = document.getElementById('icon-loop-admin');

        els.modalExcluir = document.getElementById('modal-excluir-admin');
        els.excluirNome = document.getElementById('excluir-admin-nome');
        els.btnConfirmarExcluir = document.getElementById('btn-confirmar-excluir-admin');

        els.blocosStatus = [
            { el: document.getElementById('adm-filter-todos'), tipo: 'todos' },
            { el: document.getElementById('adm-filter-diario'), tipo: 'diario' },
            { el: document.getElementById('adm-filter-semanal'), tipo: 'semanal' },
            { el: document.getElementById('adm-filter-quinzenal'), tipo: 'quinzenal' },
            { el: document.getElementById('adm-filter-mensal'), tipo: 'mensal' }
        ];
    }

    function getAction(tipo) {
        var grupo = ACTIONS[state.origem];
        if (!grupo || !grupo[tipo]) {
            throw new Error('Ação "' + tipo + '" não mapeada para origem "' + state.origem + '".');
        }
        return grupo[tipo];
    }

    function extrairMsgErro(err) {
        if (!err) return 'Erro desconhecido.';
        if (typeof err === 'string') return err;
        if (err.message) return err.message;
        if (err.msg) return err.msg;
        if (err.error) return typeof err.error === 'string' ? err.error : extrairMsgErro(err.error);
        try { return JSON.stringify(err); } catch (e) { return 'Erro desconhecido.'; }
    }

    function mostrarErro(msg, contexto) {
        var texto = (contexto ? contexto + ': ' : '') + msg;
        console.error('[Admin]', texto);
        try {
            if (window.finToast) {
                window.finToast(texto, 'danger');
                return;
            }
        } catch (e) { console.error('Falha ao exibir toast:', e); }
        alert(texto);
    }

    function mostrarErroTabela(msg) {
        if (!els.tbody) return;
        els.tbody.innerHTML =
            '<tr><td colspan="5" class="text-center text-danger py-4">' +
            '<i class="bi bi-exclamation-triangle" style="font-size:1.3rem;display:block;margin-bottom:6px;"></i>' +
            '<strong>' + (msg || 'Erro ao carregar dados') + '</strong>' +
            '</td></tr>';
    }

    function tratarErro(err, contexto) {
        var msg = extrairMsgErro(err);
        mostrarErro(msg, contexto);
        return msg;
    }

    function onClickTab(e) {
        e.preventDefault();
        var origem = e.currentTarget.getAttribute('data-origem');
        if (!origem || origem === state.origem || !ACTIONS[origem]) return;
        state.origem = origem;
        state.pagina = 1;
        state.filtro = '';
        state.blocoAtivo = 'todos';
        state.filtroStatus = 'todos';
        if (els.filtro) els.filtro.value = '';
        if (els.labelFiltro) els.labelFiltro.textContent = 'Status';
        if (els.menuFiltro) {
            els.menuFiltro.querySelectorAll('.dropdown-filtro-item[data-filtro-status]').forEach(function (el) {
                el.classList.toggle('active', el.getAttribute('data-filtro-status') === 'todos');
            });
        }
        els.blocosStatus.forEach(function (b) {
            if (b.el) b.el.classList.toggle('active', b.tipo === 'todos');
        });
        atualizarTabsAtivas();
        atualizarColunaPagamento();
        fetchDados();
    }

    function onInputFiltro() {
        state.filtro = (els.filtro.value || '').trim().toLowerCase();
        state.pagina = 1;
        renderTabela();
    }

    function onClickBloco(bloco) {
        state.blocoAtivo = bloco.tipo;
        state.pagina = 1;
        els.blocosStatus.forEach(function (b) {
            if (b.el) b.el.classList.toggle('active', b.tipo === bloco.tipo);
        });
        renderTabela();
    }

    function registrarEventos() {
        document.querySelectorAll('.admin-tab').forEach(function (btn) {
            btn.removeEventListener('click', onClickTab);
            btn.addEventListener('click', onClickTab);
        });

        if (els.filtro) {
            els.filtro.removeEventListener('input', onInputFiltro);
            els.filtro.addEventListener('input', onInputFiltro);
        }

        if (els.btnSync) els.btnSync.onclick = function () { fetchDados(); };
        if (els.btnLoopHeader) els.btnLoopHeader.onclick = function () { fetchDados(); };
        if (els.btnNovo) els.btnNovo.onclick = function () { abrirForm(null, false); };
        if (els.btnPrev) els.btnPrev.onclick = function () { mudarPagina(-1); };
        if (els.btnNext) els.btnNext.onclick = function () { mudarPagina(1); };

        els.blocosStatus.forEach(function (b) {
            if (b.el) {
                b.el.onclick = function () { onClickBloco(b); };
            }
        });

        if (els.thead) {
            els.thead.addEventListener('click', function (e) {
                if (e.target.closest('#btn-sort-nome-admin')) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSortNome();
                }
            });
        }

        if (els.btnFiltro && els.menuFiltro && els.wrapperFiltro) {
            els.btnFiltro.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                els.wrapperFiltro.classList.toggle('open');
            });
            document.addEventListener('click', function (e) {
                if (els.wrapperFiltro && !els.wrapperFiltro.contains(e.target)) {
                    els.wrapperFiltro.classList.remove('open');
                }
            });
            els.menuFiltro.querySelectorAll('.dropdown-filtro-item[data-filtro-status]').forEach(function (item) {
                item.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    state.filtroStatus = this.getAttribute('data-filtro-status') || 'todos';
                    state.pagina = 1;
                    var labelMap = { todos: 'Status', ativo: 'Ativo', inativo: 'Inativo' };
                    if (els.labelFiltro) els.labelFiltro.textContent = labelMap[state.filtroStatus] || 'Status';
                    els.menuFiltro.querySelectorAll('.dropdown-filtro-item[data-filtro-status]').forEach(function (el) {
                        el.classList.remove('active');
                    });
                    this.classList.add('active');
                    els.wrapperFiltro.classList.remove('open');
                    renderTabela();
                });
            });
        }
    }

    function toggleSortNome() {
        state.sortDesc = !state.sortDesc;
        if (els.iconSortNome) {
            els.iconSortNome.className = state.sortDesc ? 'bi bi-arrow-down' : 'bi bi-arrow-up';
        }
        state.pagina = 1;
        renderTabela();
    }

    function spinOn() {
        if (els.btnSync) els.btnSync.classList.add('syncing');
        if (els.syncIcon) els.syncIcon.classList.add('spinner-rotate');
        if (els.btnLoopHeader) els.btnLoopHeader.classList.add('syncing');
    }

    function spinOff() {
        if (els.btnSync) els.btnSync.classList.remove('syncing');
        if (els.syncIcon) els.syncIcon.classList.remove('spinner-rotate');
        if (els.btnLoopHeader) els.btnLoopHeader.classList.remove('syncing');
    }

    function mostrarLoading() {
        if (!els.tbody) return;
        els.tbody.innerHTML =
            '<tr><td colspan="5" class="text-center text-muted py-4">' +
            '<div class="spinner-border spinner-border-sm text-danger opacity-50"></div>' +
            '<div class="mt-2 admin-loading-text">Buscando dados<span class="admin-dots"></span></div>' +
            '</td></tr>';
    }

    function atualizarTabsAtivas() {
        document.querySelectorAll('.admin-tab').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-origem') === state.origem);
        });
    }

    function atualizarColunaPagamento() {
        var isCliente = state.origem === 'clientes';
        if (els.thPagamento) els.thPagamento.classList.toggle('d-none', !isCliente);
        if (els.blocosPagamento) {
            els.blocosPagamento.forEach(function (el) {
                el.classList.toggle('d-none', !isCliente);
            });
        }
        var tiposPagamento = ['diario', 'semanal', 'quinzenal', 'mensal'];
        if (!isCliente && tiposPagamento.indexOf(state.blocoAtivo) !== -1) {
            state.blocoAtivo = 'todos';
            els.blocosStatus.forEach(function (b) {
                if (b.el) b.el.classList.toggle('active', b.tipo === 'todos');
            });
        }
    }

    function verificarAPI() {
        if (!window.API || typeof window.API.call !== 'function') {
            throw new Error('Módulo API não está disponível. Verifique se api.js foi carregado antes de admin.js.');
        }
    }

    function fetchDados() {
        if (state.fetching) return Promise.resolve();
        state.fetching = true;
        mostrarLoading();
        spinOn();
        var action;
        try {
            verificarAPI();
            action = getAction('listar');
        } catch (err) {
            tratarErro(err, 'Erro de inicialização');
            mostrarErroTabela(extrairMsgErro(err));
            spinOff();
            state.fetching = false;
            return Promise.reject(err);
        }
        return window.API.call(action)
            .then(function (res) {
                if (res && res.status === 'error') {
                    throw new Error(extrairMsgErro(res.message || res.error || res));
                }
                var dados = Array.isArray(res) ? res : (res && res.data !== undefined ? res.data : null);
                if (!Array.isArray(dados)) {
                    throw new Error('Resposta inválida do servidor para a ação "' + action + '".');
                }
                state.cache = dados;
                state.pagina = 1;
                renderTabela();
            })
            .catch(function (err) {
                var msg = tratarErro(err, 'Erro ao carregar dados (' + action + ')');
                state.cache = [];
                mostrarErroTabela(msg);
            })
            .finally(function () {
                state.fetching = false;
                spinOff();
            });
    }

    function _nomeItem(item) {
        return String(item.nome || item.username || '').toLowerCase();
    }

    function contarPagamento(dados, tipo) {
        return dados.filter(function (i) {
            return String(i.pagamento || '').trim().toUpperCase() === tipo;
        }).length; // .length = contagem de registros, não soma de valores
    }

    function contarTotalCadastrados(dados) {
        return Array.isArray(dados) ? dados.length : 0;
    }

    function atualizarContadores(dados) {
        // Quantidade total de clientes cadastrados = número de linhas (ids) do array
        var total = dados.length;
        var diario = contarPagamento(dados, 'DIÁRIO');
        var semanal = contarPagamento(dados, 'SEMANAL');
        var quinzenal = contarPagamento(dados, 'QUINZENAL');
        var mensal = contarPagamento(dados, 'MENSAL');

        function pct(n) {
            return total > 0 ? Math.round((n / total) * 100) + '%' : '0%';
        }

        function set(id, count, pctTexto) {
            var elC = document.getElementById('adm-count-' + id);
            var elP = document.getElementById('adm-pct-' + id);
            if (elC) elC.textContent = count;
            if (elP) elP.textContent = pctTexto;
        }

        // "Todos" = quantidade total de clientes cadastrados no sistema (contagem de ids)
        set('todos', total, total);
        set('diario', diario, pct(diario));
        set('semanal', semanal, pct(semanal));
        set('quinzenal', quinzenal, pct(quinzenal));
        set('mensal', mensal, pct(mensal));
    }

    function aplicarFiltroBloco(dados) {
        var mapaPagamento = {
            diario: 'DIÁRIO',
            semanal: 'SEMANAL',
            quinzenal: 'QUINZENAL',
            mensal: 'MENSAL'
        };
        if (mapaPagamento[state.blocoAtivo]) {
            var alvo = mapaPagamento[state.blocoAtivo];
            return dados.filter(function (item) {
                return String(item.pagamento || '').trim().toUpperCase() === alvo;
            });
        }
        return dados;
    }

    function aplicarFiltroStatus(dados) {
        if (state.filtroStatus === 'todos') return dados;
        var querAtivo = state.filtroStatus === 'ativo';
        return dados.filter(function (item) {
            var ativo = String(item.status || '').toUpperCase() === 'TRUE';
            return ativo === querAtivo;
        });
    }

    function aplicarFiltro() {
        var base = Array.isArray(state.cache) ? state.cache : [];
        atualizarContadores(base);

        var dados = aplicarFiltroBloco(base);
        dados = aplicarFiltroStatus(dados);

        if (state.filtro) {
            dados = dados.filter(function (item) {
                var txt;
                if (state.tipoFiltro === 'nome') {
                    txt = String(item.nome || item.username || '').toLowerCase();
                } else {
                    txt = [
                        item.nome, item.username, item.responsavel,
                        item.contato, item.email, item.pagamento, item.cpf_cnpj
                    ].join(' ').toLowerCase();
                }
                return txt.indexOf(state.filtro) !== -1;
            });
        }

        dados = dados.slice().sort(function (a, b) {
            var na = _nomeItem(a);
            var nb = _nomeItem(b);
            if (na < nb) return state.sortDesc ? 1 : -1;
            if (na > nb) return state.sortDesc ? -1 : 1;
            return 0;
        });

        return dados;
    }

    function calcTotalPag(total) {
        return Math.max(1, Math.ceil(total / state.porPagina));
    }

    function renderTabela() {
        if (!els.tbody) return;
        var dados;
        try {
            dados = aplicarFiltro();
        } catch (err) {
            var msg = tratarErro(err, 'Erro ao processar dados');
            mostrarErroTabela(msg);
            return;
        }
        var totalPag = calcTotalPag(dados.length);
        if (state.pagina > totalPag) state.pagina = totalPag;
        if (state.pagina < 1) state.pagina = 1;
        var inicio = (state.pagina - 1) * state.porPagina;
        var pagina = dados.slice(inicio, inicio + state.porPagina);
        if (pagina.length === 0) {
            els.tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-4">Nenhum registro encontrado.</td></tr>';
        } else {
            try {
                els.tbody.innerHTML = pagina.map(renderLinha).join('');
                registrarEventosLinhas();
            } catch (err) {
                var msg2 = tratarErro(err, 'Erro ao renderizar tabela');
                mostrarErroTabela(msg2);
            }
        }
        atualizarPaginacao(totalPag);
    }

    function badgePagamento(pagamento) {
        var val = String(pagamento || '').toUpperCase();
        if (!val) return '<span class="text-muted">-</span>';
        var classes = {
            'DIÁRIO': 'badge-soft-red',
            'SEMANAL': 'badge-soft-blue',
            'QUINZENAL': 'badge-soft-yellow',
            'MENSAL': 'badge-soft-green'
        };
        var classe = classes[val] || 'badge-soft-gray';
        return '<span class="badge-soft ' + classe + '">' + pagamento + '</span>';
    }

    function renderLinha(it) {
        var ativo = String(it.status || '').toUpperCase() === 'TRUE';
        var avatar = it.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        var nome = it.nome || it.username || 'N/A';
        var nomeSafe = nome.replace(/"/g, '&quot;');
        var isCliente = (state.origem === 'clientes');
        var pag = isCliente
            ? '<td>' + badgePagamento(it.pagamento) + '</td>'
            : '<td class="d-none"></td>';
        var statusClasse = ativo ? 'badge-soft-green' : 'badge-soft-gray';
        var statusTexto = ativo ? 'Ativo' : 'Inativo';
        return '<tr>' +
            '<td class="ps-3">' +
            '<img src="' + avatar + '" width="26" height="26" class="rounded-circle" style="object-fit:cover;" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">' +
            '</td>' +
            '<td>' + nome + '</td>' +
            pag +
            '<td><span class="badge-soft ' + statusClasse + '">' + statusTexto + '</span></td>' +
            '<td class="text-end pe-3">' +
            '<button class="btn btn-light btn-sm me-1 btn-admin-edit" data-id="' + it.id + '"><i class="bi bi-pencil-square"></i></button>' +
            '<button class="btn btn-light btn-sm me-1 btn-admin-view" data-id="' + it.id + '"><i class="bi bi-eye"></i></button>' +
            '<button class="btn btn-light btn-sm btn-admin-delete" data-id="' + it.id + '" data-nome="' + nomeSafe + '"><i class="bi bi-trash text-danger"></i></button>' +
            '</td></tr>';
    }

    function registrarEventosLinhas() {
        if (!els.tbody) return;
        els.tbody.querySelectorAll('.btn-admin-edit').forEach(function (b) {
            b.onclick = function () {
                var it = buscarPorId(this.getAttribute('data-id'));
                if (it) abrirForm(it, false);
                else mostrarErro('Registro não encontrado no cache local.', 'Erro ao editar');
            };
        });
        els.tbody.querySelectorAll('.btn-admin-view').forEach(function (b) {
            b.onclick = function () {
                var it = buscarPorId(this.getAttribute('data-id'));
                if (it) abrirForm(it, true);
                else mostrarErro('Registro não encontrado no cache local.', 'Erro ao visualizar');
            };
        });
        els.tbody.querySelectorAll('.btn-admin-delete').forEach(function (b) {
            b.onclick = function () { confirmarExclusao(this.getAttribute('data-id'), this.getAttribute('data-nome')); };
        });
    }

    function buscarPorId(id) {
        return (Array.isArray(state.cache) ? state.cache : []).find(function (x) { return String(x.id) === String(id); });
    }

    function atualizarPaginacao(tp) {
        if (els.infoPag) els.infoPag.textContent = 'Pág ' + state.pagina + ' de ' + tp;
        if (els.btnPrev) els.btnPrev.disabled = (state.pagina <= 1);
        if (els.btnNext) els.btnNext.disabled = (state.pagina >= tp);
    }

    function mudarPagina(dir) {
        var t = calcTotalPag(aplicarFiltro().length);
        var np = state.pagina + dir;
        if (np < 1 || np > t) return;
        state.pagina = np;
        renderTabela();
    }

    function carregarFormHTML() {
        if (state.formCarregado) return Promise.resolve(true);
        if (!els.modalContainer) {
            mostrarErro('Container do modal não encontrado no DOM.', 'Erro ao abrir formulário');
            return Promise.resolve(false);
        }
        return fetch('pages/admin/form_admin.html')
            .then(function (res) {
                if (!res.ok) throw new Error('Falha ao carregar formulário (HTTP ' + res.status + ').');
                return res.text();
            })
            .then(function (html) {
                els.modalContainer.innerHTML = html;
                state.formCarregado = true;
                registrarEventosForm();
                return true;
            })
            .catch(function (err) {
                tratarErro(err, 'Erro ao carregar formulário');
                return false;
            });
    }

    function registrarEventosForm() {
        var btnSalvar = document.getElementById('btn-salvar-form-admin');
        if (btnSalvar) btnSalvar.onclick = function () { salvar(); };
        var fnMotoboy = document.getElementById('fn-motoboy');
        if (fnMotoboy) {
            fnMotoboy.onchange = function () {
                var div = document.getElementById('div-comissao');
                if (div) div.classList.toggle('d-none', !fnMotoboy.checked);
            };
        }
        var modalEl = document.getElementById('modalFormAdmin');
        if (modalEl) modalEl.addEventListener('hidden.bs.modal', function () { limparForm(); });
    }

    function limparForm() {
        state.idEdicao = null; state.modoVisualizar = false;
        var form = document.getElementById('form-admin');
        if (form) form.reset();
        var div = document.getElementById('div-comissao');
        if (div) div.classList.add('d-none');
    }

    function preencherCampo(id, valor) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') { el.checked = !!valor; } else { el.value = valor != null ? valor : ''; }
    }

    function setCamposReadOnly(v) {
        var form = document.getElementById('form-admin');
        if (!form) return;
        form.querySelectorAll('input, select, textarea').forEach(function (el) { el.disabled = v; });
        var btn = document.getElementById('btn-salvar-form-admin');
        if (btn) btn.classList.toggle('d-none', v);
    }

    function abrirForm(it, readOnly) {
        carregarFormHTML().then(function (ok) {
            if (!ok) return;
            try {
                state.idEdicao = it ? it.id : null; state.modoVisualizar = !!readOnly;
                limparForm();
                var tituloEl = document.getElementById('titulo-form-admin');
                if (tituloEl) tituloEl.textContent = readOnly ? 'Visualizar' : (it ? 'Editar' : 'Novo');
                if (it) {
                    preencherCampo('fn-nome', it.nome || it.username);
                    preencherCampo('fn-contato', it.contato);
                    preencherCampo('fn-email', it.email);
                    preencherCampo('fn-responsavel', it.responsavel);
                    preencherCampo('fn-cpf-cnpj', it.cpf_cnpj);
                    preencherCampo('fn-pagamento', it.pagamento);
                    preencherCampo('fn-status', String(it.status || '').toUpperCase() === 'TRUE');
                    preencherCampo('fn-imagem', it.imagem);
                    var fnMotoboy = document.getElementById('fn-motoboy');
                    var divComissao = document.getElementById('div-comissao');
                    if (fnMotoboy && divComissao) {
                        var isMotoboy = String(it.motoboy || '').toUpperCase() === 'TRUE';
                        fnMotoboy.checked = isMotoboy;
                        divComissao.classList.toggle('d-none', !isMotoboy);
                        preencherCampo('fn-comissao', it.comissao);
                    }
                }
                setCamposReadOnly(readOnly);
                var modalEl = document.getElementById('modalFormAdmin');
                if (modalEl && window.bootstrap) {
                    var modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                    modal.show();
                } else {
                    throw new Error('Modal ou Bootstrap não disponíveis.');
                }
            } catch (err) {
                tratarErro(err, 'Erro ao abrir formulário');
            }
        });
    }

    function coletarDadosForm() {
        var dados = {
            nome: (document.getElementById('fn-nome') || {}).value || '',
            contato: (document.getElementById('fn-contato') || {}).value || '',
            email: (document.getElementById('fn-email') || {}).value || '',
            responsavel: (document.getElementById('fn-responsavel') || {}).value || '',
            cpf_cnpj: (document.getElementById('fn-cpf-cnpj') || {}).value || '',
            pagamento: (document.getElementById('fn-pagamento') || {}).value || '',
            status: (document.getElementById('fn-status') || {}).checked ? 'TRUE' : 'FALSE',
            imagem: (document.getElementById('fn-imagem') || {}).value || ''
        };
        var fnMotoboy = document.getElementById('fn-motoboy');
        if (fnMotoboy) {
            dados.motoboy = fnMotoboy.checked ? 'TRUE' : 'FALSE';
            dados.comissao = fnMotoboy.checked ? ((document.getElementById('fn-comissao') || {}).value || '') : '';
        }
        if (state.idEdicao) dados.id = state.idEdicao;
        return dados;
    }

    function validarForm(dados) {
        if (!dados.nome || !dados.nome.trim()) {
            mostrarErro('O campo Nome é obrigatório.', 'Validação');
            return false;
        }
        return true;
    }

    function salvar() {
        var dados;
        try {
            dados = coletarDadosForm();
        } catch (err) {
            tratarErro(err, 'Erro ao coletar dados do formulário');
            return;
        }
        if (!validarForm(dados)) return;

        var acao;
        try {
            verificarAPI();
            acao = state.idEdicao ? getAction('atualizar') : getAction('criar');
        } catch (err) {
            tratarErro(err, 'Erro de inicialização');
            return;
        }

        var btn = document.getElementById('btn-salvar-form-admin');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...'; }

        window.API.call(acao, dados)
            .then(function (res) {
                if (res && res.status === 'error') {
                    throw new Error(extrairMsgErro(res.message || res.error || res));
                }
                var el = document.getElementById('modalFormAdmin');
                if (el && window.bootstrap) { var m = window.bootstrap.Modal.getInstance(el); if (m) m.hide(); }
                fetchDados();
            })
            .catch(function (err) { tratarErro(err, 'Erro ao salvar (' + acao + ')'); })
            .finally(function () { if (btn) { btn.disabled = false; btn.innerHTML = 'Salvar'; } });
    }

    function confirmarExclusao(id, nome) {
        if (!id) { mostrarErro('ID inválido.', 'Erro ao excluir'); return; }
        if (!els.modalExcluir || !window.bootstrap) {
            mostrarErro('Modal de exclusão não disponível.', 'Erro ao excluir');
            return;
        }
        if (els.excluirNome) els.excluirNome.textContent = nome || 'este registro';
        if (els.btnConfirmarExcluir) {
            els.btnConfirmarExcluir.onclick = function () { executarExclusao(id); };
        }
        var modal = window.bootstrap.Modal.getOrCreateInstance(els.modalExcluir);
        modal.show();
    }

    function executarExclusao(id) {
        var acao;
        try {
            verificarAPI();
            acao = getAction('excluir');
        } catch (err) {
            tratarErro(err, 'Erro de inicialização');
            return;
        }

        var btn = els.btnConfirmarExcluir;
        var textoOriginal = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Excluindo...'; }

        window.API.call(acao, { id: id })
            .then(function (res) {
                if (res && res.status === 'error') {
                    throw new Error(extrairMsgErro(res.message || res.error || res));
                }
                state.cache = (Array.isArray(state.cache) ? state.cache : []).filter(function (x) {
                    return String(x.id) !== String(id);
                });
                renderTabela();
                if (els.modalExcluir && window.bootstrap) {
                    var m = window.bootstrap.Modal.getInstance(els.modalExcluir);
                    if (m) m.hide();
                }
            })
            .catch(function (err) { tratarErro(err, 'Erro ao excluir (' + acao + ')'); })
            .finally(function () { if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; } });
    }

    function init() {
        try {
            bind();
            registrarEventos();
            atualizarTabsAtivas();
            atualizarColunaPagamento();
            fetchDados();
        } catch (err) {
            tratarErro(err, 'Erro na inicialização do módulo Admin');
        }
    }

    window.addEventListener('error', function (e) {
        if (e && e.message) console.error('[Admin][window.onerror]', e.message);
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();

    window.adminModule = { fetchDados: fetchDados, renderTabela: renderTabela, abrirForm: abrirForm };
})();
