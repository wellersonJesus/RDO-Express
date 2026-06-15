(function () {
    var state = {
        aba: "receitas",
        cache: [],
        pagina: 1,
        porPagina: 15,
        filtro: "",
        fetching: false
    };

    window.finState = state;

    var els = {};

    function bind() {
        els.tbody = document.getElementById("fin-list");
        els.titulo = document.getElementById("titulo-aba-fin");
        els.filtro = document.getElementById("filtro-fin");
        els.syncIcon = document.getElementById("sync-icon-fin");
        els.btnSync = document.getElementById("btn-sync-fin");
        els.btnNovo = document.getElementById("btn-novo-fin");
        els.infoPag = document.getElementById("info-paginacao-fin");
        els.btnPrev = document.getElementById("btn-pag-prev-fin");
        els.btnNext = document.getElementById("btn-pag-next-fin");
        els.theadRow = document.getElementById("fin-thead-row");
        els.modalContainer = document.getElementById("fin-modal-container");
    }

    function events() {
        document.querySelectorAll(".btn-tab-fin").forEach(function (btn) {
            btn.addEventListener("click", function () {
                trocarAba(btn.getAttribute("data-aba"));
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
                trocarAba(state.aba);
            });
        }

        if (els.btnNovo) {
            els.btnNovo.addEventListener("click", function () {
                // TODO: abrir formulário de novo registro
                console.log("[FIN] Novo registro - aba:", state.aba);
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

    /* ── Helpers de UI ── */

    function spinOn() {
        if (els.syncIcon) els.syncIcon.classList.add("fin-sync-spinning");
    }

    function spinOff() {
        if (els.syncIcon) els.syncIcon.classList.remove("fin-sync-spinning");
    }

    function mostrarLoading() {
        if (!els.tbody) return;
        els.tbody.innerHTML =
            '<tr><td colspan="4" class="text-center p-5">' +
            '<span class="fin-loading-text">Buscando dados<span class="fin-dots"></span></span>' +
            '</td></tr>';
    }

    function labelAba(aba) {
        var labels = { receitas: "Receitas", despesas: "Despesas", resumo: "Resumo" };
        return labels[aba] || aba;
    }

    /* ── Troca de aba / carregamento ── */

    async function trocarAba(aba) {
        if (state.fetching) return;

        state.aba = aba || state.aba;
        state.pagina = 1;
        state.filtro = "";
        state.cache = [];
        state.fetching = true;

        if (els.filtro) els.filtro.value = "";
        if (els.titulo) els.titulo.textContent = "Gerenciando: " + labelAba(state.aba);

        document.querySelectorAll(".btn-tab-fin").forEach(function (btn) {
            btn.classList.toggle("active", btn.getAttribute("data-aba") === state.aba);
        });

        spinOn();
        mostrarLoading();

        // TODO: substituir pelo fetch real da API conforme a aba
        // Exemplo futuro:
        // try {
        //     var res = await window.API.call("get_fin_" + state.aba);
        //     state.cache = Array.isArray(res) ? res : [];
        // } catch (e) {
        //     state.cache = [];
        // }

        // Simulação de delay para estrutura em branco
        await new Promise(function (r) { setTimeout(r, 600); });

        state.cache = [];
        state.fetching = false;
        spinOff();
        renderizar();
    }

    /* ── Filtro ── */

    function filtrar() {
        if (!state.filtro) return state.cache;
        return state.cache.filter(function (item) {
            var texto = JSON.stringify(item).toLowerCase();
            return texto.indexOf(state.filtro) !== -1;
        });
    }

    /* ── Renderização ── */

    function renderizar() {
        if (!els.tbody) return;

        var dados = filtrar();
        var totalPag = Math.max(1, Math.ceil(dados.length / state.porPagina));
        if (state.pagina > totalPag) state.pagina = totalPag;

        var inicio = (state.pagina - 1) * state.porPagina;
        var pagina = dados.slice(inicio, inicio + state.porPagina);

        if (pagina.length === 0) {
            els.tbody.innerHTML =
                '<tr><td colspan="4" class="text-center text-muted p-4">' +
                '<i class="bi bi-inbox text-muted d-block mb-2" style="font-size:2rem;"></i>' +
                'Nenhum registro encontrado em <strong>' + labelAba(state.aba) + '</strong>.' +
                '</td></tr>';
        } else {
            // TODO: renderizar linhas reais conforme a aba
            els.tbody.innerHTML = pagina.map(function (item) {
                return (
                    "<tr>" +
                    '<td class="ps-3">—</td>' +
                    "<td>—</td>" +
                    "<td>—</td>" +
                    '<td class="text-end pe-3">—</td>' +
                    "</tr>"
                );
            }).join("");
        }

        if (els.infoPag) els.infoPag.textContent = "Pág " + state.pagina + " de " + totalPag;
    }

    /* ── Paginação ── */

    function mudarPagina(dir) {
        var dados = filtrar();
        var totalPag = Math.max(1, Math.ceil(dados.length / state.porPagina));
        var nova = state.pagina + dir;
        if (nova >= 1 && nova <= totalPag) {
            state.pagina = nova;
            renderizar();
        }
    }

    /* ── API pública ── */

    window.initFin = async function () {
        bind();
        events();
        await trocarAba("receitas");
    };
})();
