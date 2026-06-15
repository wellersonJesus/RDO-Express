(function () {

    var state = {
        origem: 'clientes',
        cache: [],
        pagina: 1,
        porPagina: 15,
        filtro: '',
        fetching: false,
        idEdicao: null,
        modoVisualizar: false,
        formCarregado: false
    };

    window.adminState = state;

    var els = {};

    function bind() {
        els.tbody = document.getElementById('admin-list');
        els.titulo = document.getElementById('titulo-aba-admin');
        els.filtro = document.getElementById('filtro-admin');
        els.syncIcon = document.getElementById('sync-icon-admin');
        els.btnSync = document.getElementById('btn-sync-admin');
        els.btnNovo = document.getElementById('btn-novo-admin');
        els.infoPag = document.getElementById('info-paginacao-admin');
        els.btnPrev = document.getElementById('btn-pag-prev-admin');
        els.btnNext = document.getElementById('btn-pag-next-admin');
        els.modalContainer = document.getElementById('admin-modal-container');
    }

    function onClickTab(e) {
        var origem = e.currentTarget.getAttribute('data-origem');
        if (origem) fetchDados(origem);
    }

    function onInputFiltro() {
        state.filtro = (els.filtro.value || '').trim().toLowerCase();
        state.pagina = 1;
        renderTabela();
    }

    function registrarEventos() {
        document.querySelectorAll('.btn-tab-admin').forEach(function (btn) {
            btn.removeEventListener('click', onClickTab);
            btn.addEventListener('click', onClickTab);
        });

        if (els.filtro) {
            els.filtro.removeEventListener('input', onInputFiltro);
            els.filtro.addEventListener('input', onInputFiltro);
        }

        if (els.btnSync) {
            els.btnSync.onclick = function () { fetchDados(state.origem); };
        }

        if (els.btnNovo) {
            els.btnNovo.onclick = function () { abrirForm(null, false); };
        }

        if (els.btnPrev) {
            els.btnPrev.onclick = function () { mudarPagina(-1); };
        }

        if (els.btnNext) {
            els.btnNext.onclick = function () { mudarPagina(1); };
        }
    }

    function spinOn() {
        if (els.syncIcon) els.syncIcon.classList.add('admin-sync-spinning');
    }

    function spinOff() {
        if (els.syncIcon) els.syncIcon.classList.remove('admin-sync-spinning');
    }

    function mostrarLoading() {
        if (!els.tbody) return;
        els.tbody.innerHTML =
            '<tr><td colspan="4" class="text-center p-5">' +
            '<span class="admin-loading-text">Buscando dados<span class="admin-dots"></span></span>' +
            '</td></tr>';
    }

    function atualizarTitulo() {
        if (!els.titulo) return;
        var mapa = { clientes: 'Clientes', colaboradores: 'Colaboradores' };
        els.titulo.textContent = 'Gerenciando: ' + (mapa[state.origem] || state.origem);
    }

    function atualizarTabsAtivas() {
        document.querySelectorAll('.btn-tab-admin').forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-origem') === state.origem);
        });
    }

    function fetchDados(origem) {
        if (state.fetching) return;

        state.origem = origem || state.origem;
        state.pagina = 1;
        state.filtro = '';
        state.fetching = true;

        if (els.filtro) els.filtro.value = '';

        atualizarTitulo();
        atualizarTabsAtivas();
        spinOn();
        mostrarLoading();

        window.API.call('get' + state.origem)
            .then(function (res) {
                console.log('[Admin] Dados recebidos:', Array.isArray(res) ? res.length + ' itens' : typeof res);
                state.cache = Array.isArray(res) ? res : [];
            })
            .catch(function (e) {
                console.error('[Admin] Erro fetch:', e.message);
                state.cache = [];
            })
            .finally(function () {
                state.fetching = false;
                spinOff();
                renderTabela();
            });
    }

    function aplicarFiltro() {
        if (!state.filtro) return state.cache;
        return state.cache.filter(function (item) {
            var texto = (item.nome || item.username || '').toLowerCase();
            return texto.indexOf(state.filtro) !== -1;
        });
    }

    function calcTotalPag(total) {
        return Math.max(1, Math.ceil(total / state.porPagina));
    }

    function renderTabela() {
        if (!els.tbody) return;

        var dados = aplicarFiltro();
        var totalPag = calcTotalPag(dados.length);

        if (state.pagina > totalPag) state.pagina = totalPag;
        if (state.pagina < 1) state.pagina = 1;

        var inicio = (state.pagina - 1) * state.porPagina;
        var pagina = dados.slice(inicio, inicio + state.porPagina);

        if (pagina.length === 0) {
            els.tbody.innerHTML =
                '<tr><td colspan="4" class="text-center text-muted p-4">Nenhum registro encontrado.</td></tr>';
        } else {
            els.tbody.innerHTML = pagina.map(renderLinha).join('');
            registrarEventosLinhas();
        }

        atualizarPaginacao(totalPag);
    }

    function renderLinha(item) {
        var ativo = String(item.status || '').toUpperCase() === 'TRUE';
        var avatar = item.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        var nome = item.nome || item.username || 'N/A';

        return (
            '<tr>' +
            '<td class="ps-3">' +
            '<img src="' + avatar + '" width="30" height="30" class="rounded-circle" ' +
            'style="object-fit:cover;" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">' +
            '</td>' +
            '<td>' + nome + '</td>' +
            '<td>' +
            '<span class="badge ' + (ativo ? 'bg-success' : 'bg-secondary') + '">' +
            (ativo ? 'Ativo' : 'Inativo') +
            '</span>' +
            '</td>' +
            '<td class="text-end pe-3">' +
            '<button class="btn btn-light btn-sm me-1 btn-admin-edit" data-id="' + item.id + '">' +
            '<i class="bi bi-pencil-square"></i>' +
            '</button>' +
            '<button class="btn btn-light btn-sm btn-admin-view" data-id="' + item.id + '">' +
            '<i class="bi bi-eye"></i>' +
            '</button>' +
            '</td>' +
            '</tr>'
        );
    }

    function registrarEventosLinhas() {
        if (!els.tbody) return;

        els.tbody.querySelectorAll('.btn-admin-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = buscarPorId(btn.getAttribute('data-id'));
                if (item) abrirForm(item, false);
            });
        });

        els.tbody.querySelectorAll('.btn-admin-view').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = buscarPorId(btn.getAttribute('data-id'));
                if (item) abrirForm(item, true);
            });
        });
    }

    function buscarPorId(id) {
        return state.cache.find(function (x) {
            return String(x.id) === String(id);
        }) || null;
    }

    function atualizarPaginacao(totalPag) {
        if (els.infoPag) els.infoPag.textContent = 'Pág ' + state.pagina + ' de ' + totalPag;
        if (els.btnPrev) els.btnPrev.disabled = state.pagina <= 1;
        if (els.btnNext) els.btnNext.disabled = state.pagina >= totalPag;
    }

    function mudarPagina(dir) {
        var dados = aplicarFiltro();
        var totalPag = calcTotalPag(dados.length);
        var nova = state.pagina + dir;
        if (nova >= 1 && nova <= totalPag) {
            state.pagina = nova;
            renderTabela();
        }
    }

    function carregarFormHTML() {
        if (state.formCarregado) return Promise.resolve(true);
        if (!els.modalContainer) return Promise.resolve(false);

        return fetch('pages/admin/form_admin.html')
            .then(function (res) {
                if (!res.ok) return false;
                return res.text();
            })
            .then(function (html) {
                if (!html) return false;
                els.modalContainer.innerHTML = html;
                state.formCarregado = true;
                registrarEventosForm();
                return true;
            })
            .catch(function () {
                return false;
            });
    }

    function registrarEventosForm() {
        var btnSalvar = document.getElementById('btn-salvar-form-admin');
        if (btnSalvar) {
            btnSalvar.onclick = function () { salvar(); };
        }

        var fnMotoboy = document.getElementById('fn-motoboy');
        if (fnMotoboy) {
            fnMotoboy.onchange = function () {
                var div = document.getElementById('div-comissao');
                if (div) div.classList.toggle('d-none', !fnMotoboy.checked);
            };
        }

        var modalEl = document.getElementById('modalFormAdmin');
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', limparForm);
        }
    }

    function limparForm() {
        state.idEdicao = null;
        state.modoVisualizar = false;

        var modalEl = document.getElementById('modalFormAdmin');
        if (!modalEl) return;

        modalEl.querySelectorAll('input[type=text], input[type=email], input[type=number]').forEach(function (el) {
            el.value = '';
            el.classList.remove('input-error');
            el.disabled = false;
        });

        modalEl.querySelectorAll('select').forEach(function (s) {
            s.selectedIndex = 0;
            s.disabled = false;
        });

        modalEl.querySelectorAll('.col-funcao').forEach(function (c) {
            c.checked = false;
            c.disabled = false;
        });

        esconderErroForm();

        var divComissao = document.getElementById('div-comissao');
        if (divComissao) divComissao.classList.add('d-none');
    }

    function abrirForm(item, readOnly) {
        carregarFormHTML().then(function (ok) {
            if (!ok) return;

            limparForm();

            var titulo = document.getElementById('form-admin-titulo');
            var camposCliente = document.getElementById('campos-cliente');
            var camposColab = document.getElementById('campos-colaborador');
            var btnSalvar = document.getElementById('btn-salvar-form-admin');
            var isCliente = state.origem === 'clientes';

            if (camposCliente) camposCliente.classList.toggle('d-none', !isCliente);
            if (camposColab) camposColab.classList.toggle('d-none', isCliente);

            if (item) {
                state.idEdicao = item.id;
                state.modoVisualizar = readOnly;
                if (titulo) titulo.textContent = readOnly ? 'Visualizar Registro' : 'Editar Registro';

                if (isCliente) {
                    preencherCliente(item);
                } else {
                    preencherColaborador(item);
                }

                if (readOnly) desabilitarCampos();
            } else {
                state.idEdicao = null;
                state.modoVisualizar = false;
                if (titulo) titulo.textContent = 'Novo ' + (isCliente ? 'Cliente' : 'Colaborador');
            }

            if (btnSalvar) btnSalvar.style.display = readOnly ? 'none' : '';

            var modalEl = document.getElementById('modalFormAdmin');
            if (modalEl) {
                new bootstrap.Modal(modalEl).show();
            }
        });
    }

    function preencherCliente(item) {
        setVal('c-username', item.username || item.nome || '');
        setVal('c-responsavel', item.responsavel || '');
        setVal('c-contato', item.contato || '');
        setVal('c-email', item.email || '');
        setVal('c-cpf_cnpj', item.cpf_cnpj || '');
        setVal('c-endereco', item.endereco || '');
        setVal('c-imagem', item.imagem || '');
    }

    function preencherColaborador(item) {
        setVal('col-username', item.username || item.nome || '');
        setVal('col-cpf_cnpj', item.cpf_cnpj || '');
        setVal('col-contato', item.contato || '');
        setVal('col-email', item.email || '');
        setVal('col-imagem', item.imagem || '');
        setVal('col-comissao', item.comissao || '');
        setSelect('col-status', item.status);

        var funcoes = (item.colaborador || '').split('/');
        document.querySelectorAll('.col-funcao').forEach(function (c) {
            c.checked = funcoes.indexOf(c.value) !== -1;
        });

        var temMotoboy = funcoes.indexOf('Motoboy') !== -1;
        var divComissao = document.getElementById('div-comissao');
        if (divComissao) divComissao.classList.toggle('d-none', !temMotoboy);
    }

    function desabilitarCampos() {
        var modalEl = document.getElementById('modalFormAdmin');
        if (!modalEl) return;
        modalEl.querySelectorAll('input, select').forEach(function (el) { el.disabled = true; });
        modalEl.querySelectorAll('.col-funcao').forEach(function (c) { c.disabled = true; });
    }

    function setVal(id, v) {
        var el = document.getElementById(id);
        if (el) el.value = v;
    }

    function getVal(id) {
        var el = document.getElementById(id);
        return el ? (el.value || '') : '';
    }

    function setSelect(id, valor) {
        var el = document.getElementById(id);
        if (!el) return;
        var v = String(valor || '').toUpperCase();
        for (var i = 0; i < el.options.length; i++) {
            if (el.options[i].value === v) { el.selectedIndex = i; break; }
        }
    }

    function coletarCliente() {
        return {
            username: getVal('c-username'),
            responsavel: getVal('c-responsavel'),
            contato: getVal('c-contato'),
            email: getVal('c-email'),
            cpf_cnpj: getVal('c-cpf_cnpj'),
            endereco: getVal('c-endereco'),
            imagem: getVal('c-imagem'),
            status: 'TRUE'
        };
    }

    function coletarColaborador() {
        var funcoes = [];
        document.querySelectorAll('.col-funcao:checked').forEach(function (c) { funcoes.push(c.value); });
        return {
            username: getVal('col-username'),
            cpf_cnpj: getVal('col-cpf_cnpj'),
            contato: getVal('col-contato'),
            email: getVal('col-email'),
            imagem: getVal('col-imagem'),
            comissao: getVal('col-comissao'),
            status: getVal('col-status') || 'TRUE',
            colaborador: funcoes.join('/'),
            funcoes: funcoes
        };
    }

    function mostrarErroForm(msg) {
        var el = document.getElementById('form-admin-erro');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('d-none');
    }

    function esconderErroForm() {
        var el = document.getElementById('form-admin-erro');
        if (el) el.classList.add('d-none');
    }

    function marcarErro(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('input-error');
    }

    function limparErro(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('input-error');
    }

    function validarCliente(dados) {
        var ok = true;
        [{ id: 'c-username', v: dados.username }, { id: 'c-responsavel', v: dados.responsavel }, { id: 'c-contato', v: dados.contato }].forEach(function (c) {
            if (!c.v.trim()) { marcarErro(c.id); ok = false; } else { limparErro(c.id); }
        });
        return ok;
    }

    function validarColaborador(dados) {
        var erros = [];
        [{ id: 'col-username', v: dados.username }, { id: 'col-cpf_cnpj', v: dados.cpf_cnpj }].forEach(function (c) {
            if (!c.v.trim()) { marcarErro(c.id); erros.push(c.id); } else { limparErro(c.id); }
        });

        if (dados.funcoes.length === 0) erros.push('funcoes');

        if (dados.cpf_cnpj.trim()) {
            var dup = state.cache.find(function (c) {
                return c.cpf_cnpj === dados.cpf_cnpj.trim() && String(c.id) !== String(state.idEdicao);
            });
            if (dup) { marcarErro('col-cpf_cnpj'); erros.push('cpf_duplicado'); }
        }

        return { valido: erros.length === 0, erros: erros };
    }

    function toggleSalvarLoading(ativo) {
        var btn = document.getElementById('btn-salvar-form-admin');
        var spinner = document.getElementById('spinner-salvar-admin');
        var txt = document.getElementById('txt-salvar-admin');

        if (btn) btn.disabled = ativo;
        if (spinner) {
            spinner.classList.toggle('d-none', !ativo);
            spinner.classList.toggle('admin-sync-spinning', ativo);
        }
        if (txt) txt.textContent = ativo ? 'Salvando...' : 'Salvar';
    }

    function salvar() {
        esconderErroForm();

        var isCliente = state.origem === 'clientes';
        var dados;

        if (isCliente) {
            dados = coletarCliente();
            if (!validarCliente(dados)) {
                mostrarErroForm('Preencha os campos obrigatórios (Nome, Responsável e Contato).');
                return;
            }
        } else {
            dados = coletarColaborador();
            var resultado = validarColaborador(dados);
            if (!resultado.valido) {
                var msg = 'Preencha os campos obrigatórios.';
                if (resultado.erros.indexOf('funcoes') !== -1) msg = 'Selecione pelo menos uma função.';
                if (resultado.erros.indexOf('cpf_duplicado') !== -1) msg = 'CPF/CNPJ já cadastrado.';
                mostrarErroForm(msg);
                return;
            }
            delete dados.funcoes;
        }

        if (state.idEdicao) dados.id = state.idEdicao;

        toggleSalvarLoading(true);

        var action = (state.idEdicao ? 'update' : 'add') + state.origem;

        window.API.call(action, dados)
            .then(function () {
                var modalEl = document.getElementById('modalFormAdmin');
                if (modalEl) {
                    var inst = bootstrap.Modal.getInstance(modalEl);
                    if (inst) inst.hide();
                }
                fetchDados(state.origem);
            })
            .catch(function () {
                mostrarErroForm('Erro ao salvar. Tente novamente.');
            })
            .finally(function () {
                toggleSalvarLoading(false);
            });
    }

    window.initAdmin = function () {
        console.log('[Admin] initAdmin chamado');
        state.formCarregado = false;
        state.fetching = false;
        state.cache = [];
        state.pagina = 1;
        state.filtro = '';
        state.idEdicao = null;
        state.modoVisualizar = false;

        bind();

        console.log('[Admin] Elementos encontrados:', {
            tbody: !!els.tbody,
            titulo: !!els.titulo,
            filtro: !!els.filtro,
            btnSync: !!els.btnSync,
            btnNovo: !!els.btnNovo,
            modalContainer: !!els.modalContainer
        });

        registrarEventos();
        fetchDados('clientes');
    };

    window.carregarAdmin = fetchDados;

})();
