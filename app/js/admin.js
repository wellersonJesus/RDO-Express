(function () {
    var state = {
        origem: "clientes",
        cache: [],
        pagina: 1,
        porPagina: 15,
        filtro: "",
        fetching: false,
        idEdicao: null,
        modoVisualizar: false,
        formCarregado: false
    };

    window.adminState = state;

    var els = {};

    function bind() {
        els.tbody = document.getElementById("admin-list");
        els.titulo = document.getElementById("titulo-aba-admin");
        els.filtro = document.getElementById("filtro-admin");
        els.syncIcon = document.getElementById("sync-icon-admin");
        els.btnSync = document.getElementById("btn-sync-admin");
        els.btnNovo = document.getElementById("btn-novo-admin");
        els.infoPag = document.getElementById("info-paginacao-admin");
        els.btnPrev = document.getElementById("btn-pag-prev-admin");
        els.btnNext = document.getElementById("btn-pag-next-admin");
        els.modalContainer = document.getElementById("admin-modal-container");
    }

    function events() {
        document.querySelectorAll(".btn-tab-admin").forEach(function (btn) {
            btn.addEventListener("click", function () {
                carregar(btn.getAttribute("data-origem"));
            });
        });

        if (els.filtro) {
            els.filtro.addEventListener("input", function () {
                state.filtro = els.filtro.value.trim().toLowerCase();
                state.pagina = 1;
                renderizar();
            });
        }

        if (els.btnSync) {
            els.btnSync.addEventListener("click", function () {
                carregar(state.origem);
            });
        }

        if (els.btnNovo) {
            els.btnNovo.addEventListener("click", function () {
                abrirForm(null, false);
            });
        }

        if (els.btnPrev) {
            els.btnPrev.addEventListener("click", function () {
                mudarPagina(-1);
            });
        }

        if (els.btnNext) {
            els.btnNext.addEventListener("click", function () {
                mudarPagina(1);
            });
        }
    }

    function spinOn() {
        if (els.syncIcon) els.syncIcon.classList.add("admin-sync-spinning");
    }

    function spinOff() {
        if (els.syncIcon) els.syncIcon.classList.remove("admin-sync-spinning");
    }

    function mostrarLoading() {
        if (!els.tbody) return;
        els.tbody.innerHTML =
            '<tr><td colspan="4" class="text-center p-5">' +
            '<span class="admin-loading-text">Buscando dados<span class="admin-dots"></span></span>' +
            '</td></tr>';
    }

    function mostrarBloqueio() {
        if (!els.tbody) return;
        els.tbody.innerHTML =
            '<tr><td colspan="4" class="text-center p-5">' +
            '<i class="bi bi-shield-lock text-danger d-block mb-3" style="font-size:2.5rem;"></i>' +
            '<h6 class="fw-bold">Sistema Master RDO Desligado</h6>' +
            '<p class="text-muted mb-0">Faça contato com a gestão para liberar.</p>' +
            '</td></tr>';
    }

    async function carregar(origem) {
        if (state.fetching) return;

        if (!window.checkMaster()) {
            mostrarBloqueio();
            return;
        }

        state.origem = origem || state.origem;
        state.pagina = 1;
        state.filtro = "";
        state.fetching = true;

        if (els.filtro) els.filtro.value = "";
        if (els.titulo) els.titulo.textContent = "Gerenciando: " + (state.origem === "clientes" ? "Clientes" : "Colaboradores");

        document.querySelectorAll(".btn-tab-admin").forEach(function (btn) {
            btn.classList.toggle("active", btn.getAttribute("data-origem") === state.origem);
        });

        spinOn();
        mostrarLoading();

        try {
            var res = await window.API.call("get" + state.origem);
            state.cache = Array.isArray(res) ? res : [];
        } catch (e) {
            state.cache = [];
        }

        state.fetching = false;
        spinOff();
        renderizar();
    }

    function filtrar() {
        if (!state.filtro) return state.cache;
        return state.cache.filter(function (item) {
            var nome = (item.nome || item.username || "").toLowerCase();
            return nome.indexOf(state.filtro) !== -1;
        });
    }

    function renderizar() {
        if (!els.tbody) return;

        var dados = filtrar();
        var totalPag = Math.max(1, Math.ceil(dados.length / state.porPagina));
        if (state.pagina > totalPag) state.pagina = totalPag;

        var inicio = (state.pagina - 1) * state.porPagina;
        var pagina = dados.slice(inicio, inicio + state.porPagina);

        if (pagina.length === 0) {
            els.tbody.innerHTML =
                '<tr><td colspan="4" class="text-center text-muted p-4">Nenhum registro encontrado.</td></tr>';
        } else {
            els.tbody.innerHTML = pagina.map(function (i) {
                var ativo = String(i.status || "").toUpperCase() === "TRUE";
                var avatar = i.imagem || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                var nome = i.nome || i.username || "N/A";
                return (
                    "<tr>" +
                    '<td class="ps-3"><img src="' + avatar + '" width="30" height="30" class="rounded-circle" style="object-fit:cover;"></td>' +
                    "<td>" + nome + "</td>" +
                    "<td><span class='badge " + (ativo ? "bg-success" : "bg-secondary") + "'>" + (ativo ? "Ativo" : "Inativo") + "</span></td>" +
                    '<td class="text-end pe-3">' +
                    '<button class="btn btn-light btn-sm me-1 btn-admin-edit" data-id="' + i.id + '"><i class="bi bi-pencil-square"></i></button>' +
                    '<button class="btn btn-light btn-sm btn-admin-view" data-id="' + i.id + '"><i class="bi bi-eye"></i></button>' +
                    "</td>" +
                    "</tr>"
                );
            }).join("");

            els.tbody.querySelectorAll(".btn-admin-edit").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var id = btn.getAttribute("data-id");
                    var item = state.cache.find(function (x) { return String(x.id) === String(id); });
                    if (item) abrirForm(item, false);
                });
            });

            els.tbody.querySelectorAll(".btn-admin-view").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var id = btn.getAttribute("data-id");
                    var item = state.cache.find(function (x) { return String(x.id) === String(id); });
                    if (item) abrirForm(item, true);
                });
            });
        }

        if (els.infoPag) els.infoPag.textContent = "Pág " + state.pagina + " de " + totalPag;
    }

    function mudarPagina(dir) {
        var dados = filtrar();
        var totalPag = Math.max(1, Math.ceil(dados.length / state.porPagina));
        var nova = state.pagina + dir;
        if (nova >= 1 && nova <= totalPag) {
            state.pagina = nova;
            renderizar();
        }
    }

    async function carregarFormHTML() {
        if (state.formCarregado) return true;
        if (!els.modalContainer) return false;

        try {
            var res = await fetch("pages/admin/form_admin.html");
            if (!res.ok) return false;
            els.modalContainer.innerHTML = await res.text();
            state.formCarregado = true;
            bindFormEvents();
            return true;
        } catch (e) {
            return false;
        }
    }

    function bindFormEvents() {
        var btnSalvar = document.getElementById("btn-salvar-form-admin");
        if (btnSalvar) {
            btnSalvar.addEventListener("click", function () {
                salvar();
            });
        }

        var fnMotoboy = document.getElementById("fn-motoboy");
        if (fnMotoboy) {
            fnMotoboy.addEventListener("change", function () {
                var div = document.getElementById("div-comissao");
                if (div) div.classList.toggle("d-none", !fnMotoboy.checked);
            });
        }

        var modalEl = document.getElementById("modalFormAdmin");
        if (modalEl) {
            modalEl.addEventListener("hidden.bs.modal", function () {
                limparForm();
            });
        }
    }

    function limparForm() {
        state.idEdicao = null;
        state.modoVisualizar = false;

        var modalEl = document.getElementById("modalFormAdmin");
        if (!modalEl) return;

        modalEl.querySelectorAll("input[type=text], input[type=email], input[type=number]").forEach(function (i) {
            i.value = "";
            i.classList.remove("input-error");
            i.disabled = false;
        });

        modalEl.querySelectorAll("select").forEach(function (s) {
            s.selectedIndex = 0;
            s.disabled = false;
        });

        modalEl.querySelectorAll(".col-funcao").forEach(function (c) {
            c.checked = false;
            c.disabled = false;
        });

        var erro = document.getElementById("form-admin-erro");
        if (erro) erro.classList.add("d-none");

        var divComissao = document.getElementById("div-comissao");
        if (divComissao) divComissao.classList.add("d-none");
    }

    async function abrirForm(item, readOnly) {
        if (!window.checkMaster()) {
            var bloqueio = new bootstrap.Modal(document.getElementById("modalBloqueioMaster"));
            bloqueio.show();
            return;
        }

        var ok = await carregarFormHTML();
        if (!ok) return;

        limparForm();

        var titulo = document.getElementById("form-admin-titulo");
        var camposCliente = document.getElementById("campos-cliente");
        var camposColab = document.getElementById("campos-colaborador");
        var btnSalvar = document.getElementById("btn-salvar-form-admin");

        var isCliente = state.origem === "clientes";

        if (camposCliente) camposCliente.classList.toggle("d-none", !isCliente);
        if (camposColab) camposColab.classList.toggle("d-none", isCliente);

        if (item) {
            state.idEdicao = item.id;
            state.modoVisualizar = readOnly;

            if (titulo) titulo.textContent = readOnly ? "Visualizar Registro" : "Editar Registro";

            if (isCliente) {
                preencherInput("c-username", item.username || item.nome || "");
                preencherInput("c-responsavel", item.responsavel || "");
                preencherInput("c-contato", item.contato || "");
                preencherInput("c-email", item.email || "");
                preencherInput("c-cpf_cnpj", item.cpf_cnpj || "");
                preencherInput("c-endereco", item.endereco || "");
                preencherInput("c-imagem", item.imagem || "");
            } else {
                preencherInput("col-username", item.username || item.nome || "");
                preencherInput("col-cpf_cnpj", item.cpf_cnpj || "");
                preencherInput("col-contato", item.contato || "");
                preencherInput("col-email", item.email || "");
                preencherInput("col-imagem", item.imagem || "");
                preencherInput("col-comissao", item.comissao || "");
                preencherSelect("col-status", item.status);

                var funcoes = (item.colaborador || "").split("/");
                document.querySelectorAll(".col-funcao").forEach(function (c) {
                    c.checked = funcoes.indexOf(c.value) !== -1;
                });

                var temMotoboy = funcoes.indexOf("Motoboy") !== -1;
                var divComissao = document.getElementById("div-comissao");
                if (divComissao) divComissao.classList.toggle("d-none", !temMotoboy);
            }

            if (readOnly) {
                var modalEl = document.getElementById("modalFormAdmin");
                modalEl.querySelectorAll("input, select").forEach(function (i) { i.disabled = true; });
                modalEl.querySelectorAll(".col-funcao").forEach(function (c) { c.disabled = true; });
            }
        } else {
            state.idEdicao = null;
            state.modoVisualizar = false;
            if (titulo) titulo.textContent = "Novo " + (isCliente ? "Cliente" : "Colaborador");
        }

        if (btnSalvar) btnSalvar.style.display = readOnly ? "none" : "";

        var modal = new bootstrap.Modal(document.getElementById("modalFormAdmin"));
        modal.show();
    }

    function preencherInput(id, valor) {
        var el = document.getElementById(id);
        if (el) el.value = valor;
    }

    function preencherSelect(id, valor) {
        var el = document.getElementById(id);
        if (!el) return;
        var v = String(valor || "").toUpperCase();
        for (var i = 0; i < el.options.length; i++) {
            if (el.options[i].value === v) {
                el.selectedIndex = i;
                break;
            }
        }
    }

    function coletarDadosCliente() {
        return {
            username: (document.getElementById("c-username") || {}).value || "",
            responsavel: (document.getElementById("c-responsavel") || {}).value || "",
            contato: (document.getElementById("c-contato") || {}).value || "",
            email: (document.getElementById("c-email") || {}).value || "",
            cpf_cnpj: (document.getElementById("c-cpf_cnpj") || {}).value || "",
            endereco: (document.getElementById("c-endereco") || {}).value || "",
            imagem: (document.getElementById("c-imagem") || {}).value || "",
            status: "TRUE"
        };
    }

    function coletarDadosColaborador() {
        var funcoes = [];
        document.querySelectorAll(".col-funcao:checked").forEach(function (c) {
            funcoes.push(c.value);
        });

        return {
            username: (document.getElementById("col-username") || {}).value || "",
            cpf_cnpj: (document.getElementById("col-cpf_cnpj") || {}).value || "",
            contato: (document.getElementById("col-contato") || {}).value || "",
            email: (document.getElementById("col-email") || {}).value || "",
            imagem: (document.getElementById("col-imagem") || {}).value || "",
            comissao: (document.getElementById("col-comissao") || {}).value || "",
            status: (document.getElementById("col-status") || {}).value || "TRUE",
            colaborador: funcoes.join("/"),
            funcoes: funcoes
        };
    }

    function validarCliente(dados) {
        var erros = [];
        var campos = [
            { id: "c-username", valor: dados.username },
            { id: "c-responsavel", valor: dados.responsavel },
            { id: "c-contato", valor: dados.contato }
        ];

        campos.forEach(function (c) {
            var el = document.getElementById(c.id);
            if (!c.valor.trim()) {
                if (el) el.classList.add("input-error");
                erros.push(c.id);
            } else {
                if (el) el.classList.remove("input-error");
            }
        });

        return erros.length === 0;
    }

    function validarColaborador(dados) {
        var erros = [];

        var campos = [
            { id: "col-username", valor: dados.username },
            { id: "col-cpf_cnpj", valor: dados.cpf_cnpj }
        ];

        campos.forEach(function (c) {
            var el = document.getElementById(c.id);
            if (!c.valor.trim()) {
                if (el) el.classList.add("input-error");
                erros.push(c.id);
            } else {
                if (el) el.classList.remove("input-error");
            }
        });

        if (dados.funcoes.length === 0) {
            erros.push("funcoes");
        }

        if (dados.cpf_cnpj.trim()) {
            var duplicado = state.cache.find(function (c) {
                return c.cpf_cnpj === dados.cpf_cnpj.trim() && String(c.id) !== String(state.idEdicao);
            });
            if (duplicado) {
                var cpfEl = document.getElementById("col-cpf_cnpj");
                if (cpfEl) cpfEl.classList.add("input-error");
                erros.push("cpf_duplicado");
            }
        }

        return { valido: erros.length === 0, erros: erros };
    }

    async function salvar() {
        var erroDiv = document.getElementById("form-admin-erro");
        if (erroDiv) erroDiv.classList.add("d-none");

        var isCliente = state.origem === "clientes";
        var dados;
        var valido;

        if (isCliente) {
            dados = coletarDadosCliente();
            valido = validarCliente(dados);
            if (!valido) {
                if (erroDiv) {
                    erroDiv.textContent = "Preencha os campos obrigatórios (Nome, Responsável e Contato).";
                    erroDiv.classList.remove("d-none");
                }
                return;
            }
        } else {
            dados = coletarDadosColaborador();
            var resultado = validarColaborador(dados);
            if (!resultado.valido) {
                var msg = "Preencha os campos obrigatórios.";
                if (resultado.erros.indexOf("funcoes") !== -1) msg = "Selecione pelo menos uma função.";
                if (resultado.erros.indexOf("cpf_duplicado") !== -1) msg = "Este CPF/CNPJ já está cadastrado para outro colaborador.";
                if (erroDiv) {
                    erroDiv.textContent = msg;
                    erroDiv.classList.remove("d-none");
                }
                return;
            }
            delete dados.funcoes;
        }

        dados.id = state.idEdicao || Date.now().toString();

        var btnSalvar = document.getElementById("btn-salvar-form-admin");
        var spinner = document.getElementById("spinner-salvar-admin");
        var txtSalvar = document.getElementById("txt-salvar-admin");

        if (btnSalvar) btnSalvar.disabled = true;
        if (spinner) spinner.classList.remove("d-none");
        if (spinner) spinner.classList.add("admin-sync-spinning");
        if (txtSalvar) txtSalvar.textContent = "Salvando...";

        try {
            var action = (state.idEdicao ? "update" : "add") + state.origem;
            await window.API.call("post", { action: action, ...dados });

            var modalEl = document.getElementById("modalFormAdmin");
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) inst.hide();

            await carregar(state.origem);
        } catch (e) {
            if (erroDiv) {
                erroDiv.textContent = "Erro ao salvar. Tente novamente.";
                erroDiv.classList.remove("d-none");
            }
        }

        if (btnSalvar) btnSalvar.disabled = false;
        if (spinner) spinner.classList.add("d-none");
        if (spinner) spinner.classList.remove("admin-sync-spinning");
        if (txtSalvar) txtSalvar.textContent = "Salvar";
    }

    window.carregarAdmin = carregar;
    window.renderizarAdmin = renderizar;
    window.mudarPaginaAdmin = mudarPagina;

    window.initAdmin = async function () {
        state.formCarregado = false;
        bind();
        events();
        await carregar("clientes");
    };
})();
