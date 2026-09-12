
/*
 * RDO_PAGAMENTO_LOTE_CLIQUE_SPINNER_V1
 *
 * Apenas observa o clique.
 * A rotina original continua responsável
 * pelo processamento real.
 */
(function () {

    document.addEventListener('click', function (event) {

        var botao = event.target.closest(
            'button, .btn'
        );

        if (!botao) return;

        var texto = String(
            botao.textContent || ''
        ).replace(/\s+/g, ' ').trim();

        if (
            texto !== 'Executar pagamento' &&
            texto !== 'Executar Pagamento'
        ) {
            return;
        }

        if (
            botao.classList.contains(
                'rdo-pagamento-processando'
            )
        ) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }

        /*
         * Pequeno atraso proposital:
         * permite que a rotina original do módulo
         * receba o clique normalmente.
         */
        setTimeout(function () {

            if (
                window.RDO_PAGAMENTO_LOTE_INICIAR_SPINNER
            ) {
                window.RDO_PAGAMENTO_LOTE_INICIAR_SPINNER();
            }

        }, 0);

    }, true);

})();


/*
 * RDO_PAGAMENTO_LOTE_EXECUTAR_SPINNER_V1
 *
 * Quando o pagamento é realmente executado:
 * - remove o texto;
 * - mostra ícone de loop;
 * - anima o ícone;
 * - bloqueia o botão;
 * - restaura automaticamente quando o processamento terminar.
 */
(function () {

    function localizarBotaoExecutar() {

        var botoes = Array.from(
            document.querySelectorAll('button, .btn')
        );

        return botoes.find(function (botao) {

            var texto = String(
                botao.textContent || ''
            ).replace(/\s+/g, ' ').trim();

            return (
                texto === 'Executar pagamento' ||
                texto === 'Executar Pagamento'
            );
        }) || null;
    }

    function iniciarProcessamentoPagamentoLote() {

        var botao = localizarBotaoExecutar();

        if (!botao) return null;

        if (
            botao.classList.contains(
                'rdo-pagamento-processando'
            )
        ) {
            return null;
        }

        if (!window.RDO_PAGAMENTO_LOTE_ICONES) {
            return null;
        }

        botao.dataset.rdoPagamentoTextoOriginal =
            botao.textContent;

        botao.dataset.rdoPagamentoHtmlOriginal =
            botao.innerHTML;

        botao.classList.add(
            'rdo-pagamento-processando'
        );

        botao.disabled = true;

        botao.innerHTML =
            window.RDO_PAGAMENTO_LOTE_ICONES.loop();

        return botao;
    }

    function finalizarProcessamentoPagamentoLote(
        botao,
        sucesso
    ) {

        if (!botao) return;

        botao.classList.remove(
            'rdo-pagamento-processando'
        );

        botao.disabled = false;

        if (
            botao.dataset.rdoPagamentoHtmlOriginal
        ) {
            botao.innerHTML =
                botao.dataset.rdoPagamentoHtmlOriginal;
        }

        delete botao.dataset.rdoPagamentoTextoOriginal;
        delete botao.dataset.rdoPagamentoHtmlOriginal;
    }

    window.RDO_PAGAMENTO_LOTE_INICIAR_SPINNER =
        iniciarProcessamentoPagamentoLote;

    window.RDO_PAGAMENTO_LOTE_FINALIZAR_SPINNER =
        finalizarProcessamentoPagamentoLote;

})();


/*
 * RDO_PAGAMENTO_LOTE_TITULOS_V1
 *
 * Aplica o mesmo ícone de pagamento:
 * - título Pagamento em lote
 * - cabeçalho Confirmar pagamento em lote
 */
(function () {

    function aplicarIconesPagamentoLote() {

        if (!window.RDO_PAGAMENTO_LOTE_ICONES) return;

        var seletores = [
            '[data-rdo-pagamento-lote-titulo]',
            '.modal-title'
        ];

        document.querySelectorAll(
            seletores.join(',')
        ).forEach(function (el) {

            var texto = String(el.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();

            if (
                texto === 'Pagamento em lote' ||
                texto === 'Confirmar pagamento em lote'
            ) {

                if (
                    el.querySelector('.rdo-pagamento-icone')
                ) {
                    return;
                }

                el.innerHTML =
                    window.RDO_PAGAMENTO_LOTE_ICONES.pagamento() +
                    '<span>' + texto + '</span>';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            aplicarIconesPagamentoLote
        );
    } else {
        aplicarIconesPagamentoLote();
    }

    window.RDO_PAGAMENTO_LOTE_APLICAR_ICONES =
        aplicarIconesPagamentoLote;

})();


/*
 * RDO_PAGAMENTO_LOTE_ICON_HELPER_V1
 */
(function () {

    window.RDO_PAGAMENTO_LOTE_ICONES =
        window.RDO_PAGAMENTO_LOTE_ICONES || {};

    var API_ICONES = window.RDO_PAGAMENTO_LOTE_ICONES;

    API_ICONES.pagamento = function () {
        return '<i class="bi bi-credit-card-2-front rdo-pagamento-icone" aria-hidden="true"></i>';
    };

    API_ICONES.confirmacao = function () {
        return '<i class="bi bi-credit-card-2-front rdo-pagamento-icone" aria-hidden="true"></i>';
    };

    API_ICONES.loop = function () {
        return '<i class="bi bi-arrow-repeat rdo-pagamento-spinner rdo-pagamento-icone" aria-hidden="true"></i>';
    };

    API_ICONES.aplicarTitulos = function () {

        var elementos = document.querySelectorAll(
            '[data-rdo-pagamento-lote-titulo]'
        );

        elementos.forEach(function (el) {

            var texto = String(
                el.getAttribute('data-rdo-pagamento-lote-titulo') || ''
            ).trim();

            if (!texto) return;

            el.innerHTML =
                API_ICONES.pagamento() +
                '<span>' + texto + '</span>';
        });
    };

})();


/*
 * RDO_PAGAMENTO_LOTE_ICONES_V1
 * Estilo visual exclusivo do módulo de pagamento em lote.
 */
(function () {
    if (document.getElementById('rdo-pagamento-lote-icones-css')) return;

    var style = document.createElement('style');
    style.id = 'rdo-pagamento-lote-icones-css';

    style.textContent = `
        .rdo-pagamento-icone {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: .45rem;
            line-height: 1;
            vertical-align: -0.1em;
        }

        .rdo-pagamento-spinner {
            display: inline-block;
            animation: rdoPagamentoSpin .8s linear infinite;
        }

        @keyframes rdoPagamentoSpin {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(360deg);
            }
        }

        .rdo-pagamento-processando {
            pointer-events: none;
            cursor: wait !important;
        }
    `;

    document.head.appendChild(style);
})();

(function () {
'use strict';

if (window.RDO_PAGAMENTO_LOTE) {
    return;
}

var MODAL_ID = 'rdo-modal-pagamento-lote';
var CONFIRM_MODAL_ID = 'rdo-modal-pagamento-lote-confirmacao';

var state = {
    cliente: null,
    clienteId: null,
    pedidos: [],
    selecionados: new Set(),
    total: 0,
    etapa: 1,
    processando: false,
    origemDashboard: false
};

function normalizarTexto(valor) {
    return String(valor == null ? '' : valor)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function normalizarStatus(valor) {
    return normalizarTexto(valor)
        .replace(/[_-]/g, ' ');
}

function statusAberto(pedido) {
    /*
     * RDO_PAGAMENTO_LOTE_ELEGIBILIDADE_V1
     *
     * Um pedido somente pode aparecer no pagamento em lote quando:
     *
     * 1. O pedido estiver CONCLUIDO ou FINALIZADO;
     * 2. Existir motoboy/colaborador atribuído;
     * 3. O financeiro/pagamento estiver PENDENTE.
     *
     * IMPORTANTE:
     * "situacao" pode representar situação financeira.
     * Portanto ela NÃO é usada como status operacional.
     */

    if (!pedido || typeof pedido !== 'object') {
        return false;
    }

    /*
     * STATUS OPERACIONAL DO PEDIDO
     *
     * A fonte principal é "status".
     * Os demais campos são compatibilidade com versões anteriores.
     */
    var statusPedido = normalizarStatus(
        pedido.status ||
        pedido.status_pedido ||
        pedido.situacao_pedido ||
        pedido.statusPedido ||
        ''
    );

    var pedidoConcluido =
        statusPedido === 'concluido' ||
        statusPedido === 'finalizado';

    if (!pedidoConcluido) {
        return false;
    }

    /*
     * MOTOBOY / COLABORADOR
     */
    var motoboy = String(
        pedido.motoboy ||
        pedido.colaborador ||
        pedido.nome_colaborador ||
        pedido.colaborador_nome ||
        pedido.colaborador_id ||
        ''
    ).trim();

    if (
        !motoboy ||
        motoboy === '-' ||
        motoboy.toLowerCase() === 'null' ||
        motoboy.toLowerCase() === 'undefined'
    ) {
        return false;
    }

    /*
     * SITUAÇÃO FINANCEIRA / PAGAMENTO
     */
    var statusFinanceiro = normalizarStatus(
        pedido.situacao_financeira ||
        ''
    );

    var statusPagamento = normalizarStatus(
        pedido.situacao_pagamento ||
        pedido.status_pagamento ||
        ''
    );

    var financeiroPendente =
        statusFinanceiro === 'pendente' ||
        statusFinanceiro === 'pendente financeiro';

    var pagamentoPendente =
        statusPagamento === 'pendente' ||
        statusPagamento === 'pendente financeiro';

    /*
     * Compatibilidade:
     * alguns pedidos antigos podem trazer a situação financeira
     * somente no campo "situacao".
     *
     * "situacao" só é consultada depois que o status operacional
     * e o colaborador já foram validados.
     */
    if (!financeiroPendente && !pagamentoPendente) {
        var situacaoLegada = normalizarStatus(
            pedido.situacao || ''
        );

        financeiroPendente =
            situacaoLegada === 'pendente' ||
            situacaoLegada === 'pendente financeiro';
    }

    return financeiroPendente || pagamentoPendente;
}

function obterIdPedido(pedido) {
    if (!pedido || typeof pedido !== 'object') {
        return '';
    }

    return String(
        pedido.id_pedido ||
        pedido.pedido_id ||
        pedido.pedidoId ||
        pedido.idPedido ||
        pedido.id ||
        pedido.numero_pedido ||
        pedido.numeroPedido ||
        ''
    ).trim();
}

function obterCliente(pedido) {
    if (!pedido || typeof pedido !== 'object') {
        return '';
    }

    return String(
        pedido.cliente ||
        pedido.nome_cliente ||
        pedido.cliente_nome ||
        pedido.nomeCliente ||
        pedido.customer ||
        ''
    ).trim();
}

function obterClienteId(pedido) {
    if (!pedido || typeof pedido !== 'object') {
        return '';
    }

    return String(
        pedido.id_cliente ||
        pedido.idCliente ||
        pedido.cliente_id ||
        pedido.clienteId ||
        ''
    ).trim();
}

function obterValor(pedido) {
    if (!pedido || typeof pedido !== 'object') {
        return 0;
    }

    var valor =
        pedido.valor_final ??
        pedido.valor_total ??
        pedido.valor_corrida ??
        pedido.vlr_servico ??
        pedido.valor ??
        pedido.valor_pagamento ??
        0;

    if (typeof valor === 'number') {
        return isFinite(valor) ? valor : 0;
    }

    var texto = String(valor)
        .replace(/[R$\s]/g, '')
        .trim();

    if (texto.indexOf(',') !== -1) {
        texto = texto
            .replace(/\./g, '')
            .replace(',', '.');
    }

    var numero = Number(texto);

    return isFinite(numero) ? numero : 0;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarData() {
    var agora = new Date();

    return String(agora.getDate()).padStart(2, '0') +
        '/' +
        String(agora.getMonth() + 1).padStart(2, '0') +
        '/' +
        agora.getFullYear();
}

function obterDataLancamentoPagamentoLote(pedido) {
    if (!pedido || typeof pedido !== 'object') {
        return '';
    }

    var campos = [
        'data_pedido',
        'dataPedido',
        'data_do_pedido',
        'data_lancamento',
        'dataLancamento',
        'data_rdo',
        'dataRdo',
        'data',
        'created_at',
        'createdAt',
        'timestamp'
    ];

    for (var i = 0; i < campos.length; i++) {
        var valor = pedido[campos[i]];

        if (
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ''
        ) {
            return valor;
        }
    }

    return '';
}

function formatarDataPagamentoLote(pedido) {
    var valorData =
        obterDataLancamentoPagamentoLote(pedido);

    if (
        valorData === null ||
        valorData === undefined ||
        String(valorData).trim() === ''
    ) {
        return '—';
    }

    if (
        Object.prototype.toString.call(valorData) ===
        '[object Date]'
    ) {
        if (isNaN(valorData.getTime())) {
            return '—';
        }

        return valorData.toLocaleDateString('pt-BR');
    }

    var texto = String(valorData).trim();

    var isoPuro = texto.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (isoPuro) {
        return (
            isoPuro[3] +
            '/' +
            isoPuro[2] +
            '/' +
            isoPuro[1]
        );
    }

    var isoComHorario = texto.match(
        /^(\d{4})-(\d{2})-(\d{2})[T\s]/
    );

    if (isoComHorario) {
        var dataIso = new Date(texto);

        if (!isNaN(dataIso.getTime())) {
            return dataIso.toLocaleDateString('pt-BR');
        }

        return (
            isoComHorario[3] +
            '/' +
            isoComHorario[2] +
            '/' +
            isoComHorario[1]
        );
    }

    var brasileiro = texto.match(
        /^(\d{2})\/(\d{2})\/(\d{4})(?:\s|$)/
    );

    if (brasileiro) {
        return (
            brasileiro[1] +
            '/' +
            brasileiro[2] +
            '/' +
            brasileiro[3]
        );
    }

    try {
        var data = new Date(texto);

        if (!isNaN(data.getTime())) {
            return data.toLocaleDateString('pt-BR');
        }
    } catch (e) {}

    return texto;
}

function obterDescricaoPagamentoLote(pedido) {
    if (!pedido || typeof pedido !== 'object') {
        return '—';
    }

    var de = pedido.de || pedido.origem || '';
    var para = pedido.para || pedido.destino || '';

    if (de && para) {
        return String(de) + ' para ' + String(para);
    }

    if (de || para) {
        return String(de || para);
    }

    var campos = [
        'descricao',
        'descrição',
        'descricao_lancamento',
        'descricaoLancamento',
        'tipo_lancamento',
        'tipoLancamento',
        'tipo',
        'servico',
        'serviço',
        'observacao',
        'observação'
    ];

    for (var i = 0; i < campos.length; i++) {
        var valor = pedido[campos[i]];

        if (
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ''
        ) {
            return String(valor).trim();
        }
    }

    return 'Lançamento financeiro';
}

function escapeHtml(valor) {
    return String(valor == null ? '' : valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function usuarioPodeFinanceiro() {
    try {
        if (
            typeof window._usuarioAtualPermissoes ===
            'function'
        ) {
            var permissoes =
                window._usuarioAtualPermissoes();

            return (
                Array.isArray(permissoes) &&
                permissoes.indexOf('Financeiro') !== -1
            );
        }

        return true;
    } catch (e) {
        return true;
    }
}

function bloquearSemPermissao() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'warning',
            title: 'Acesso restrito',
            text: 'Você não possui permissão para acessar o Financeiro.'
        });
    } else {
        alert(
            'Acesso restrito. Você não possui permissão para acessar o Financeiro.'
        );
    }
}

function obterPedidosBase() {
    try {
        if (
            window.RDO_FINANCEIRO &&
            typeof window.RDO_FINANCEIRO.obterPedidosPagamentoLote ===
            'function'
        ) {
            var pedidosFinanceiro =
                window.RDO_FINANCEIRO.obterPedidosPagamentoLote();

            if (
                Array.isArray(pedidosFinanceiro) &&
                pedidosFinanceiro.length
            ) {
                return pedidosFinanceiro.slice();
            }
        }
    } catch (e) {}

    var fontes = [
        window.AppRDO &&
        Array.isArray(window.AppRDO.pedidosCache)
            ? window.AppRDO.pedidosCache
            : null,

        Array.isArray(window.pedidosCache)
            ? window.pedidosCache
            : null,

        window.RDO_PEDIDOS &&
        Array.isArray(window.RDO_PEDIDOS.cache)
            ? window.RDO_PEDIDOS.cache
            : null,

        window.AppRDO &&
        Array.isArray(window.AppRDO.pedidos)
            ? window.AppRDO.pedidos
            : null,

        window.pedidos &&
        Array.isArray(window.pedidos)
            ? window.pedidos
            : null
    ];

    for (var i = 0; i < fontes.length; i++) {
        if (fontes[i] && fontes[i].length) {
            return fontes[i].slice();
        }
    }

    return [];
}

function filtrarPedidosPorCliente(lista, clienteId, clienteNome) {
    var porId = [];
    var porNome = [];
    var todos = [];

    var idNormalizado =
        String(clienteId == null ? '' : clienteId).trim();

    var nomeNormalizado =
        normalizarTexto(clienteNome);

    (lista || []).forEach(function (pedido) {
        if (!pedido) {
            return;
        }

        todos.push(pedido);

        if (idNormalizado) {
            var idPedidoCliente =
                obterClienteId(pedido);

            if (idPedidoCliente === idNormalizado) {
                porId.push(pedido);
                return;
            }
        }

        if (nomeNormalizado) {
            var candidatos = [
                pedido.cliente,
                pedido.solicitante,
                pedido.nome_cliente,
                pedido.cliente_nome,
                pedido.nomeCliente
            ];

            if (
                candidatos.some(function (valor) {
                    return (
                        normalizarTexto(valor) ===
                        nomeNormalizado
                    );
                })
            ) {
                porNome.push(pedido);
            }
        }
    });

    var encontrados =
        idNormalizado && porId.length
            ? porId
            : (porNome.length ? porNome : todos);

    var pendentes =
        encontrados.filter(function (pedido) {
            return statusAberto(pedido);
        });

    return pendentes;
}

function localizarPedidosClientePorId(clienteId) {
    return filtrarPedidosPorCliente(
        obterPedidosBase(),
        clienteId,
        ''
    );
}

function localizarPedidosCliente(clienteNome) {
    return filtrarPedidosPorCliente(
        obterPedidosBase(),
        '',
        clienteNome
    );
}

function extrairPedidosContexto(contexto) {
    if (!contexto || typeof contexto !== 'object') {
        return null;
    }

    var colecoes = [
        contexto.pedidos,
        contexto.orders,
        contexto.lancamentos,
        contexto.pagamentos
    ];

    for (var i = 0; i < colecoes.length; i++) {
        if (Array.isArray(colecoes[i])) {
            return colecoes[i].slice();
        }
    }

    if (
        contexto.pedido &&
        typeof contexto.pedido === 'object'
    ) {
        return [contexto.pedido];
    }

    if (
        contexto.lancamento &&
        typeof contexto.lancamento === 'object'
    ) {
        return [contexto.lancamento];
    }

    if (obterIdPedido(contexto)) {
        return [contexto];
    }

    return null;
}

function localizarPedidoSelecionado(pedido) {
    var id = obterIdPedido(pedido);

    if (!id) {
        return pedido || null;
    }

    var encontrado =
        obterPedidosBase().find(function (item) {
            return obterIdPedido(item) === id;
        });

    return encontrado || pedido;
}

function prepararPedidos(cliente, pedidoSelecionado) {
    var contexto =
        cliente &&
        typeof cliente === 'object'
            ? cliente
            : null;

    var clienteId =
        contexto
            ? obterClienteId(contexto)
            : '';

    var clienteNome =
        contexto
            ? (
                contexto.cliente ||
                contexto.nome ||
                contexto.nome_cliente ||
                ''
            )
            : String(cliente || '').trim();

    state.cliente =
        String(clienteNome || '').trim();

    state.clienteId =
        String(clienteId || '').trim();

    state.pedidos = [];
    state.origemDashboard = false;

    var pedidosContexto =
        extrairPedidosContexto(contexto);

    if (
        Array.isArray(pedidosContexto) &&
        pedidosContexto.length
    ) {
        state.pedidos =
            pedidosContexto.filter(function (pedido) {
                return !!pedido &&
                    !!obterIdPedido(pedido) &&
                    statusAberto(pedido);
            });

        state.origemDashboard = true;
    }

    if (
        !state.pedidos.length &&
        pedidoSelecionado
    ) {
        var pedidoAtual =
            localizarPedidoSelecionado(
                pedidoSelecionado
            );

        if (
            pedidoAtual &&
            statusAberto(pedidoAtual)
        ) {
            state.pedidos.push(
                pedidoAtual
            );

            state.origemDashboard = true;
        }
    }

    if (!state.pedidos.length) {
        if (state.clienteId) {
            state.pedidos =
                localizarPedidosClientePorId(
                    state.clienteId
                );
        }

        if (
            !state.pedidos.length &&
            state.cliente
        ) {
            state.pedidos =
                localizarPedidosCliente(
                    state.cliente
                );
        }
    }

    if (!state.pedidos.length) {
        state.pedidos =
            obterPedidosBase().filter(function (pedido) {
                return statusAberto(pedido);
            });

        state.origemDashboard = true;
    }

    state.selecionados = new Set();
    state.total = 0;
    state.etapa = 1;
    state.processando = false;
}

function protegerCheckboxPagamentoLote(modal) {
    if (
        !modal ||
        modal.__rdoCheckboxProtegido
    ) {
        return;
    }

    modal.__rdoCheckboxProtegido = true;

    modal.addEventListener(
        'click',
        function (event) {
            var checkbox =
                event.target.closest(
                    'input[type="checkbox"]'
                );

            if (!checkbox) {
                return;
            }

            event.stopPropagation();
        },
        true
    );
}

function renderizarLista() {
    var lista =
        document.getElementById(
            'rdo-lote-lista'
        );

    if (!lista) {
        return;
    }

    if (!state.pedidos.length) {
        lista.innerHTML =
            '<div class="rdo-lote-vazio">' +
            '<strong>Nenhum lançamento em aberto.</strong>' +
            '<span>Não foram encontrados registros financeiros disponíveis para pagamento deste cliente.</span>' +
            '</div>';

        atualizarTotal();
        return;
    }

    lista.innerHTML =
        state.pedidos.map(
            function (pedido, index) {
                var id =
                    obterIdPedido(pedido);

                var data =
                    formatarDataPagamentoLote(
                        pedido
                    );

                var descricao =
                    obterDescricaoPagamentoLote(
                        pedido
                    );

                var valor =
                    obterValor(pedido);

                var checkboxId =
                    'rdo-lote-check-' +
                    index +
                    '-' +
                    id.replace(/\W/g, '');

                var selecionado =
                    state.selecionados.has(id);

                return (
                    '<label class="rdo-lote-item" for="' +
                    checkboxId +
                    '">' +

                    '<input type="checkbox" ' +
                    'id="' + checkboxId + '" ' +
                    'class="rdo-lote-checkbox" ' +
                    'data-index="' + index + '" ' +
                    'value="' +
                    escapeHtml(id) +
                    '" ' +
                    (
                        selecionado
                            ? 'checked'
                            : ''
                    ) +
                    '>' +

                    '<span class="rdo-lote-checkmark"></span>' +

                    '<span class="rdo-lote-dados">' +

                    '<span class="rdo-lote-celula rdo-lote-celula-data">' +
                    '<small>Data</small>' +
                    '<strong>' +
                    escapeHtml(data) +
                    '</strong>' +
                    '</span>' +

                    '<span class="rdo-lote-celula rdo-lote-celula-pedido">' +
                    '<small>Pedido</small>' +
                    '<strong>' +
                    escapeHtml(id || '—') +
                    '</strong>' +
                    '</span>' +

                    '<span class="rdo-lote-celula rdo-lote-celula-descricao">' +
                    '<small>Descrição</small>' +
                    '<strong title="' +
                    escapeHtml(descricao) +
                    '">' +
                    escapeHtml(descricao) +
                    '</strong>' +
                    '</span>' +

                    '<span class="rdo-lote-celula rdo-lote-celula-valor">' +
                    '<small>Valor</small>' +
                    '<strong>' +
                    formatarMoeda(valor) +
                    '</strong>' +
                    '</span>' +

                    '</span>' +

                    '</label>'
                );
            }
        ).join('');

    lista
        .querySelectorAll(
            '.rdo-lote-checkbox'
        )
        .forEach(function (checkbox) {
            checkbox.addEventListener(
                'change',
                function () {
                    if (state.processando) {
                        return;
                    }

                    var index =
                        Number(
                            checkbox.getAttribute(
                                'data-index'
                            )
                        );

                    var pedido =
                        state.pedidos[index];

                    if (!pedido) {
                        return;
                    }

                    var id =
                        obterIdPedido(pedido);

                    if (checkbox.checked) {
                        state.selecionados.add(id);
                    } else {
                        state.selecionados.delete(id);
                    }

                    atualizarTotal();
                }
            );
        });

    atualizarTotal();
}

function atualizarTotal() {
    var total = 0;
    var quantidade = 0;

    state.pedidos.forEach(
        function (pedido) {
            var id =
                obterIdPedido(pedido);

            if (
                state.selecionados.has(id)
            ) {
                total +=
                    Number(
                        obterValor(pedido)
                    ) || 0;

                quantidade++;
            }
        }
    );

    state.total = total;

    var totalEl =
        document.getElementById(
            'rdo-lote-total'
        );

    if (totalEl) {
        totalEl.textContent =
            formatarMoeda(total);
    }

    var quantidadeEl =
        document.getElementById(
            'rdo-lote-quantidade'
        );

    if (quantidadeEl) {
        quantidadeEl.textContent =
            quantidade +
            ' lançamento(s)';
    }

    var btn =
        document.getElementById(
            'rdo-lote-realizar'
        );

    if (btn) {
        btn.disabled =
            state.processando ||
            quantidade === 0 ||
            total <= 0;

        btn.innerHTML =
            '<span>Checkout de pagamento</span>';
    }
}

function obterSelecionados() {
    return state.pedidos.filter(
        function (pedido) {
            return state.selecionados.has(
                obterIdPedido(pedido)
            );
        }
    );
}

function criarModal() {
    var existente =
        document.getElementById(
            MODAL_ID
        );

    if (existente) {
        return existente;
    }

    var modal =
        document.createElement('div');

    modal.id = MODAL_ID;
    modal.className =
        'rdo-modal-pagamento-lote';

    modal.innerHTML =
        '<div class="rdo-lote-overlay"></div>' +

        '<div class="rdo-lote-modal" role="dialog" aria-modal="true" aria-labelledby="rdo-lote-titulo">' +

        '<div class="rdo-lote-header">' +

        '<div class="rdo-lote-header-info">' +

        '<h2 id="rdo-lote-titulo">' +              
        '<i class="bi bi-cash-stack rdo-lote-titulo-icone" aria-hidden="true"></i>' +
        
        '<span>Pagamento em lote</span>' +
        '</h2>' +

        '<span id="rdo-lote-cliente">' +
        'Cliente' +
        '</span>' +

        '</div>' +

        '<button type="button" ' +
        'class="rdo-lote-fechar" ' +
        'aria-label="Fechar">' +
        '&times;' +
        '</button>' +

        '</div>' +

        '<div class="rdo-lote-body" id="rdo-lote-body">' +

        '<div class="rdo-lote-info">' +
        '<span>Selecione os lançamentos que deseja pagar.</span>' +
        '</div>' +

        '<div class="rdo-lote-relatorio">' +

        '<div class="rdo-lote-colunas">' +
        '<span></span>' +
        '<span>Data</span>' +
        '<span>Pedido</span>' +
        '<span>Descrição</span>' +
        '<span>Valor</span>' +
        '</div>' +

        '<div class="rdo-lote-lista" id="rdo-lote-lista"></div>' +

        '</div>' +

        '<div class="rdo-lote-resumo">' +

        '<div>' +
        '<span>Total selecionado</span>' +
        '<small id="rdo-lote-quantidade">0 lançamento(s)</small>' +
        '</div>' +

        '<strong id="rdo-lote-total">R$ 0,00</strong>' +

        '</div>' +

        '</div>' +

        '<div class="rdo-lote-footer">' +

        '<button type="button" ' +
        'class="rdo-lote-btn secundario" ' +
        'id="rdo-lote-cancelar">' +
        'Cancelar' +
        '</button>' +

        '<button type="button" ' +
        'class="rdo-lote-btn principal" ' +
        'id="rdo-lote-realizar" ' +
        'disabled>' +
        'Checkout de pagamento' +
        '</button>' +

        '</div>' +

        '</div>';

    document.body.appendChild(modal);

    var overlay =
        modal.querySelector(
            '.rdo-lote-overlay'
        );

    var painel =
        modal.querySelector(
            '.rdo-lote-modal'
        );

    if (
        overlay &&
        painel &&
        painel.parentElement !== overlay
    ) {
        overlay.appendChild(painel);
    }

    var fechar =
        modal.querySelector(
            '.rdo-lote-fechar'
        );

    var cancelar =
        modal.querySelector(
            '#rdo-lote-cancelar'
        );

    var realizar =
        modal.querySelector(
            '#rdo-lote-realizar'
        );

    if (fechar) {
        fechar.addEventListener(
            'click',
            fecharModal
        );
    }

    if (cancelar) {
        cancelar.addEventListener(
            'click',
            fecharModal
        );
    }

    if (realizar) {
        realizar.addEventListener(
            'click',
            avancarParaConfirmacao
        );
    }

    if (overlay) {
        overlay.addEventListener(
            'click',
            function (event) {
                if (
                    event.target ===
                    overlay &&
                    !state.processando
                ) {
                    fecharModal();
                }
            }
        );
    }

    protegerCheckboxPagamentoLote(modal);

    return modal;
}

function criarModalConfirmacao() {
    var existente =
        document.getElementById(
            CONFIRM_MODAL_ID
        );

    if (existente) {
        existente.remove();
    }

    var modal =
        document.createElement('div');

    modal.id =
        CONFIRM_MODAL_ID;

    modal.className =
        'rdo-modal-pagamento-lote';

    modal.innerHTML =
        '<div class="rdo-lote-overlay"></div>' +

        '<div class="rdo-lote-modal" role="dialog" aria-modal="true" aria-labelledby="rdo-lote-confirmacao-titulo">' +

        '<div class="rdo-lote-header">' +

        '<div class="rdo-lote-header-info">' +

        '<h2 id="rdo-lote-confirmacao-titulo">' +
        '<i class="bi bi-credit-card-2-front rdo-lote-titulo-icone" aria-hidden="true"></i>' +
        '<span>Confirmar pagamento em lote</span>' +
        '</h2>' +

        '</div>' +

        '<button type="button" ' +
        'class="rdo-lote-fechar" ' +
        'id="rdo-lote-confirmacao-fechar" ' +
        'aria-label="Fechar">' +
        '&times;' +
        '</button>' +

        '</div>' +

        '<div class="rdo-lote-body" id="rdo-lote-confirmacao-body">' +
        '</div>' +

        '<div class="rdo-lote-footer">' +

        '<button type="button" ' +
        'class="rdo-lote-btn secundario" ' +
        'id="rdo-lote-cancelar-confirmacao">' +
        'Cancelar' +
        '</button>' +

        '<button type="button" ' +
        'class="rdo-lote-btn secundario" ' +
        'id="rdo-lote-voltar">' +
        'Voltar' +
        '</button>' +

        '<button type="button" ' +
        'class="rdo-lote-btn principal" ' +
        'id="rdo-lote-concluir">' +
        '<span class="rdo-lote-btn-concluir-conteudo">Executar pagamento</span>' +
        '</button>' +

        '</div>' +

        '</div>';

    document.body.appendChild(modal);

    var overlay =
        modal.querySelector(
            '.rdo-lote-overlay'
        );

    var painel =
        modal.querySelector(
            '.rdo-lote-modal'
        );

    if (
        overlay &&
        painel &&
        painel.parentElement !== overlay
    ) {
        overlay.appendChild(painel);
    }

    var fechar =
        modal.querySelector(
            '#rdo-lote-confirmacao-fechar'
        );

    var cancelar =
        modal.querySelector(
            '#rdo-lote-cancelar-confirmacao'
        );

    var voltar =
        modal.querySelector(
            '#rdo-lote-voltar'
        );

    var concluir =
        modal.querySelector(
            '#rdo-lote-concluir'
        );

    if (fechar) {
        fechar.addEventListener(
            'click',
            fecharModal
        );
    }

    if (cancelar) {
        cancelar.addEventListener(
            'click',
            fecharModal
        );
    }

    if (voltar) {
        voltar.addEventListener(
            'click',
            voltarParaSelecao
        );
    }

    if (concluir) {
        concluir.addEventListener(
            'click',
            executarPagamentoConfirmado
        );
    }

    if (overlay) {
        overlay.addEventListener(
            'click',
            function (event) {
                if (
                    event.target ===
                    overlay &&
                    !state.processando
                ) {
                    fecharModal();
                }
            }
        );
    }

    return modal;
}

function renderizarConfirmacao() {
    var selecionados =
        obterSelecionados();

    if (!selecionados.length) {
        voltarParaSelecao();
        return;
    }

    var modal =
        criarModalConfirmacao();

    var body =
        modal.querySelector(
            '#rdo-lote-confirmacao-body'
        );

    if (!body) {
        return;
    }

    var total =
        selecionados.reduce(
            function (soma, pedido) {
                return soma +
                    obterValor(pedido);
            },
            0
        );

    var html =
        '<div class="rdo-lote-info">' +
        '<span>Confira os pagamentos selecionados antes de executar.</span>' +
        '</div>' +

        '<div class="rdo-lote-confirmacao-lista">';

    selecionados.forEach(
        function (pedido) {
            html +=
                '<div class="rdo-lote-confirmacao-item">' +

                '<div class="rdo-lote-confirmacao-dados">' +

                '<div>' +
                '<small>Data</small>' +
                '<strong>' +
                escapeHtml(
                    formatarDataPagamentoLote(
                        pedido
                    )
                ) +
                '</strong>' +
                '</div>' +

                '<div>' +
                '<small>Pedido</small>' +
                '<strong>' +
                escapeHtml(
                    obterIdPedido(
                        pedido
                    )
                ) +
                '</strong>' +
                '</div>' +

                '<div>' +
                '<small>Valor</small>' +
                '<strong>' +
                formatarMoeda(
                    obterValor(pedido)
                ) +
                '</strong>' +
                '</div>' +

                '</div>' +

                '</div>';
        }
    );

    html +=
        '</div>' +

        '<div class="rdo-lote-resumo">' +

        '<div>' +
        '<span>Total selecionado</span>' +
        '<small>' +
        selecionados.length +
        ' lançamento(s)' +
        '</small>' +
        '</div>' +

        '<strong>' +
        formatarMoeda(total) +
        '</strong>' +

        '</div>';

    body.innerHTML = html;

    var overlay =
        modal.querySelector(
            '.rdo-lote-overlay'
        );

    if (overlay) {
        overlay.classList.add('ativo');
    }

    var principal =
        document.querySelector(
            '#' +
            MODAL_ID +
            ' .rdo-lote-overlay'
        );

    if (principal) {
        principal.classList.remove('ativo');
    }
}

function avancarParaConfirmacao() {
    if (state.processando) {
        return;
    }

    var selecionados =
        obterSelecionados();

    if (!selecionados.length) {
        return;
    }

    var total =
        selecionados.reduce(
            function (soma, pedido) {
                return soma +
                    obterValor(pedido);
            },
            0
        );

    if (total <= 0) {
        return;
    }

    state.etapa = 2;

    renderizarConfirmacao();
}

function voltarParaSelecao() {
    if (state.processando) {
        return;
    }

    var confirmacao =
        document.getElementById(
            CONFIRM_MODAL_ID
        );

    if (confirmacao) {
        confirmacao.remove();
    }

    state.etapa = 1;

    var modal =
        document.getElementById(
            MODAL_ID
        );

    if (!modal) {
        return;
    }

    var titulo =
        modal.querySelector(
            '#rdo-lote-titulo'
        );

    var cliente =
        modal.querySelector(
            '#rdo-lote-cliente'
        );

    if (titulo) {
        titulo.textContent =
            'Pagamento em lote';
    }

    if (cliente) {
        cliente.textContent =
            state.cliente || 'Cliente';
    }

    var overlay =
        modal.querySelector(
            '.rdo-lote-overlay'
        );

    if (overlay) {
        overlay.classList.add('ativo');
    }

    renderizarLista();
}

function respostaApiSucesso(resposta) {
    if (
        resposta === null ||
        resposta === undefined
    ) {
        return false;
    }

    if (typeof resposta === 'boolean') {
        return resposta;
    }

    if (typeof resposta !== 'object') {
        return false;
    }

    if (
        resposta.status === 'error' ||
        resposta.ok === false ||
        resposta.success === false
    ) {
        return false;
    }

    if (
        resposta.status === 'success' ||
        resposta.ok === true ||
        resposta.success === true
    ) {
        return true;
    }

    if (
        resposta.data &&
        typeof resposta.data === 'object'
    ) {
        if (
            resposta.data.status === 'error' ||
            resposta.data.ok === false ||
            resposta.data.success === false
        ) {
            return false;
        }

        if (
            resposta.data.status === 'success' ||
            resposta.data.ok === true ||
            resposta.data.success === true
        ) {
            return true;
        }
    }

    return true;
}

async function atualizarPedidoNoBanco(pedido) {
    var id = obterIdPedido(pedido);

    if (!id) {
        throw new Error('Pedido sem ID.');
    }

    if (!window.API || typeof window.API.call !== 'function') {
        throw new Error('API.call não está disponível.');
    }

    var payload = {
        id: id,
        id_pedido: id,
        pedido_id: id,
        situacao_financeira: 'pago',
        situacao_pagamento: 'pago',
        status_pagamento: 'pago',
        situacao: 'pago',
        data_pagamento: formatarData(),
        pagamento_lote: true,
        pagamento_lote_cliente:
            state.cliente ||
            obterCliente(pedido) ||
            'Cliente'
    };

    var resposta = await window.API.call(
        'updatepedido',
        payload
    );

    if (!respostaApiSucesso(resposta)) {
        throw new Error(
            'A API não confirmou a baixa do pedido ' + id + '.'
        );
    }

    return resposta;
}

function atualizarCachePedido(pedido) {
    var id =
        obterIdPedido(pedido);

    function atualizarLista(lista) {
        if (!Array.isArray(lista)) {
            return;
        }

        lista.forEach(
            function (item) {
                if (
                    obterIdPedido(item) !==
                    id
                ) {
                    return;
                }

                item.situacao_financeira =
                    'pago';

                item.situacao_pagamento =
                    'pago';

                item.status_pagamento =
                    'pago';

                item.situacao =
                    'pago';

                item.data_pagamento =
                    formatarData();
            }
        );
    }

    atualizarLista(
        window.AppRDO &&
        window.AppRDO.pedidosCache
    );

    atualizarLista(
        window.AppRDO &&
        window.AppRDO.pedidos
    );

    atualizarLista(
        window.pedidosCache
    );

    atualizarLista(
        window.pedidos
    );

    atualizarLista(
        window.RDO_PEDIDOS &&
        window.RDO_PEDIDOS.cache
    );
}

async function atualizarDashboardAposPagamento(ids) {
    var dadosAtualizados = null;

    try {
        if (
            window.API &&
            typeof window.API.call === 'function'
        ) {
            dadosAtualizados =
                await window.API.call(
                    'getdashboarddata'
                );
        }
    } catch (e) {
        dadosAtualizados = null;
    }

    if (
        dadosAtualizados &&
        dadosAtualizados.data &&
        typeof dadosAtualizados.data === 'object'
    ) {
        dadosAtualizados =
            dadosAtualizados.data;
    }

    if (
        dadosAtualizados &&
        window.dashboardState
    ) {
        window.dashboardState.dados =
            dadosAtualizados;

        window.dashboardState._ultimaBusca =
            Date.now();
    }

    try {
        if (
            typeof window._salvarCacheLocalDashboard ===
            'function' &&
            dadosAtualizados
        ) {
            window._salvarCacheLocalDashboard(
                dadosAtualizados
            );
        }
    } catch (e) {}

    try {
        if (
            typeof window.renderizarDashboardCompleto ===
            'function' &&
            dadosAtualizados &&
            window.dashboardState
        ) {
            await Promise.resolve(
                window.renderizarDashboardCompleto(
                    window.dashboardState.usuario ||
                    {},
                    dadosAtualizados
                )
            );
        }
    } catch (e) {}

    try {
        window.dispatchEvent(
            new CustomEvent(
                'financeiro:situacaoAtualizada',
                {
                    detail: {
                        ids: ids,
                        situacao: 'pago',
                        lote: true,
                        atualizarDashboard: true
                    }
                }
            )
        );
    } catch (e) {}

    try {
        window.dispatchEvent(
            new CustomEvent(
                'pedido:financeiroAtualizado',
                {
                    detail: {
                        ids: ids,
                        situacao: 'pago',
                        lote: true
                    }
                }
            )
        );
    } catch (e) {}

    try {
        window.dispatchEvent(
            new CustomEvent(
                'dashboard:atualizarPedidos',
                {
                    detail: {
                        ids: ids,
                        situacao: 'pago',
                        lote: true
                    }
                }
            )
        );
    } catch (e) {}

    try {
        window.dispatchEvent(
            new CustomEvent(
                'rdo:dashboard:refresh',
                {
                    detail: {
                        ids: ids,
                        situacao: 'pago',
                        lote: true
                    }
                }
            )
        );
    } catch (e) {}

    try {
        if (
            window.RDO_DASHBOARD &&
            typeof window.RDO_DASHBOARD.atualizar ===
            'function'
        ) {
            await Promise.resolve(
                window.RDO_DASHBOARD.atualizar({
                    ids: ids,
                    situacao: 'pago',
                    lote: true
                })
            );
        }
    } catch (e) {}

    try {
        if (
            window.RDO_DASHBOARD &&
            typeof window.RDO_DASHBOARD.recarregar ===
            'function'
        ) {
            await Promise.resolve(
                window.RDO_DASHBOARD.recarregar()
            );
        }
    } catch (e) {}

    try {
        if (
            window.RDO_PEDIDOS &&
            typeof window.RDO_PEDIDOS.atualizar ===
            'function'
        ) {
            await Promise.resolve(
                window.RDO_PEDIDOS.atualizar()
            );
        }
    } catch (e) {}

    try {
        if (
            window.RDO_PEDIDOS &&
            typeof window.RDO_PEDIDOS.renderizar ===
            'function'
        ) {
            window.RDO_PEDIDOS.renderizar();
        }
    } catch (e) {}

    await new Promise(function (resolve) {
        setTimeout(resolve, 150);
    });

    try {
        window.dispatchEvent(
            new CustomEvent(
                'dashboard:atualizado',
                {
                    detail: {
                        ids: ids,
                        situacao: 'pago',
                        lote: true
                    }
                }
            )
        );
    } catch (e) {}

    return dadosAtualizados;
}

function atualizarBotaoProcessando(botao) {
    if (!botao) {
        return;
    }

    botao.disabled = true;

    botao.innerHTML =
        '<i class="bi bi-arrow-repeat rdo-lote-spinner-execucao" aria-hidden="true"></i>';

    botao.setAttribute(
        'aria-busy',
        'true'
    );

    botao.setAttribute(
        'aria-disabled',
        'true'
    );
}

function restaurarBotaoProcessando(botao) {
    if (!botao) {
        return;
    }

    botao.disabled = false;

    botao.innerHTML =
        '<span>Executar pagamento</span>';

    botao.removeAttribute(
        'aria-busy'
    );

    botao.removeAttribute(
        'aria-disabled'
    );
}

function bloquearControlesConfirmacao() {
    var ids = [
        'rdo-lote-concluir',
        'rdo-lote-voltar',
        'rdo-lote-cancelar-confirmacao',
        'rdo-lote-confirmacao-fechar'
    ];

    ids.forEach(function (id) {
        var elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.disabled = true;
        }
    });
}

function mostrarSucessoPagamento(
    quantidade,
    total
) {
    if (typeof Swal !== 'undefined') {
        return Swal.fire({
            icon: 'success',
            title: 'Pagamento realizado',
            text:
                quantidade === 1
                    ? 'O pagamento foi realizado com sucesso.'
                    : 'Os pagamentos foram realizados com sucesso.',
            timer: 1600,
            timerProgressBar: true,
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false
        });
    }

    return new Promise(function (resolve) {
        alert(
            quantidade === 1
                ? 'O pagamento foi realizado com sucesso.'
                : 'Os pagamentos foram realizados com sucesso.'
        );

        resolve();
    });
}

async function mostrarFalhaPagamento(
    erros
) {
    var mensagem =
        erros.length === 1
            ? erros[0].mensagem
            : 'Nenhum pagamento foi lançado como pago.';

    if (typeof Swal !== 'undefined') {
        await Swal.fire({
            icon: 'error',
            title: 'Pagamento não realizado',
            text: mensagem
        });
    } else {
        alert(
            'Pagamento não realizado. ' +
            mensagem
        );
    }
}

async function mostrarPagamentoParcial(
    sucesso,
    erros
) {
    if (typeof Swal !== 'undefined') {
        await Swal.fire({
            icon: 'warning',
            title: 'Pagamento parcialmente realizado',
            text:
                sucesso +
                ' pagamento(s) realizado(s) com sucesso. ' +
                erros.length +
                ' não foram lançados.'
        });

        return;
    }

    alert(
        sucesso +
        ' pagamento(s) realizado(s) com sucesso. ' +
        erros.length +
        ' não foram lançados.'
    );
}

async function executarPagamentoConfirmado() {
    if (state.processando) {
        return;
    }

    var selecionados =
        obterSelecionados();

    if (!selecionados.length) {
        return;
    }

    state.processando = true;

    var botao =
        document.getElementById(
            'rdo-lote-concluir'
        );

    atualizarBotaoProcessando(
        botao
    );

    bloquearControlesConfirmacao();

    var checkboxes =
        document.querySelectorAll(
            '.rdo-lote-checkbox'
        );

    checkboxes.forEach(function (checkbox) {
        checkbox.disabled = true;
    });

    var resultados = [];
    var erros = [];
    var dataPagamento =
        formatarData();

    for (
        var i = 0;
        i < selecionados.length;
        i++
    ) {
        var pedido =
            selecionados[i];

        var id =
            obterIdPedido(pedido);

        try {
            if (!id) {
                throw new Error(
                    'Pedido sem ID.'
                );
            }

            var valor =
                obterValor(pedido);

            if (valor <= 0) {
                throw new Error(
                    'Valor inválido para o pedido ' +
                    id +
                    '.'
                );
            }

            await atualizarPedidoNoBanco(
                pedido
            );

            atualizarCachePedido(
                pedido
            );

            resultados.push({
                id: id,
                valor: valor,
                data: dataPagamento
            });
        } catch (erro) {
            erros.push({
                id: id,
                valor: obterValor(pedido),
                mensagem:
                    erro &&
                    erro.message
                        ? erro.message
                        : 'Falha ao lançar pagamento.'
            });
        }
    }

    if (!resultados.length) {
        state.processando = false;

        await mostrarFalhaPagamento(
            erros
        );

        restaurarBotaoProcessando(
            botao
        );

        return {
            sucesso: [],
            erros: erros
        };
    }

    var idsProcessados =
        resultados.map(
            function (item) {
                return item.id;
            }
        );

    await atualizarDashboardAposPagamento(
        idsProcessados
    );

    state.pedidos =
        state.pedidos.filter(
            function (pedido) {
                return (
                    idsProcessados.indexOf(
                        obterIdPedido(pedido)
                    ) === -1
                );
            }
        );

    state.selecionados =
        new Set();

    state.total = 0;

    var quantidadeSucesso =
        resultados.length;

    var quantidadeFalha =
        erros.length;

    var totalRealizado =
        resultados.reduce(
            function (soma, item) {
                return soma +
                    Number(item.valor || 0);
            },
            0
        );

    state.processando = false;

    fecharModal();

    if (quantidadeFalha > 0) {
        await mostrarPagamentoParcial(
            quantidadeSucesso,
            erros
        );
    } else {
        await mostrarSucessoPagamento(
            quantidadeSucesso,
            totalRealizado
        );
    }

    return {
        sucesso: resultados,
        erros: erros
    };
}

function abrirModal(
    cliente,
    pedidoSelecionado
) {
    if (!usuarioPodeFinanceiro()) {
        bloquearSemPermissao();
        return false;
    }

    var confirmacao =
        document.getElementById(
            CONFIRM_MODAL_ID
        );

    if (confirmacao) {
        confirmacao.remove();
    }

    prepararPedidos(
        cliente,
        pedidoSelecionado
    );

    window.RDO_PAGAMENTO_LOTE_CLIENTE =
        state.cliente;

    window.RDO_PAGAMENTO_LOTE_CLIENTE_ID =
        state.clienteId;

    var modal =
        criarModal();

    var clienteEl =
        modal.querySelector(
            '#rdo-lote-cliente'
        );

    if (clienteEl) {
        clienteEl.textContent =
            state.cliente ||
            'Todos os Clientes / Lançamentos';
    }

    renderizarLista();

    var overlay =
        modal.querySelector(
            '.rdo-lote-overlay'
        );

    if (overlay) {
        overlay.classList.add('ativo');
    }

    return true;
}

function abrirComPedido(
    pedido,
    cliente
) {
    if (!pedido) {
        return false;
    }

    var contexto =
        cliente &&
        typeof cliente === 'object'
            ? cliente
            : {
                id_cliente:
                    obterClienteId(pedido),
                cliente:
                    obterCliente(pedido),
                pedidos: [pedido]
            };

    if (
        !Array.isArray(contexto.pedidos)
    ) {
        contexto.pedidos = [pedido];
    }

    var abriu =
        abrirModal(
            contexto,
            pedido
        );

    if (!abriu) {
        return false;
    }

    var id =
        obterIdPedido(pedido);

    if (id) {
        state.selecionados.add(id);
        atualizarTotal();
    }

    return true;
}

function fecharModal() {
    if (state.processando) {
        return;
    }

    var modal =
        document.getElementById(
            MODAL_ID
        );

    if (modal) {
        modal.remove();
    }

    var confirmacao =
        document.getElementById(
            CONFIRM_MODAL_ID
        );

    if (confirmacao) {
        confirmacao.remove();
    }

    state.cliente = null;
    state.clienteId = null;
    state.pedidos = [];
    state.selecionados =
        new Set();
    state.total = 0;
    state.etapa = 1;
    state.processando = false;
    state.origemDashboard = false;
}

function atualizar(cliente) {
    var modal =
        document.getElementById(
            MODAL_ID
        );

    if (!modal || state.processando) {
        return;
    }

    var clienteId =
        cliente &&
        typeof cliente === 'object'
            ? (
                cliente.id_cliente ||
                cliente.idCliente ||
                cliente.cliente_id ||
                ''
            )
            : state.clienteId;

    var clienteNome =
        cliente &&
        typeof cliente === 'object'
            ? (
                cliente.cliente ||
                cliente.nome ||
                cliente.nome_cliente ||
                ''
            )
            : state.cliente;

    var selecionados =
        new Set(
            Array.from(
                state.selecionados
            )
        );

    state.clienteId =
        String(
            clienteId || ''
        ).trim();

    state.cliente =
        String(
            clienteNome || ''
        ).trim();

    var pedidosContexto =
        extrairPedidosContexto(
            cliente &&
            typeof cliente === 'object'
                ? cliente
                : null
        );

    if (
        Array.isArray(pedidosContexto) &&
        pedidosContexto.length
    ) {
        state.pedidos =
            pedidosContexto.filter(function (pedido) {
                return statusAberto(pedido);
            });

        state.origemDashboard = true;
    } else {
        state.pedidos =
            state.clienteId
                ? localizarPedidosClientePorId(
                    state.clienteId
                )
                : localizarPedidosCliente(
                    state.cliente
                );

        state.origemDashboard = false;
    }

    state.selecionados =
        new Set(
            Array.from(selecionados).filter(
                function (id) {
                    return state.pedidos.some(
                        function (pedido) {
                            return obterIdPedido(pedido) === id;
                        }
                    );
                }
            )
        );

    renderizarLista();
}

window.RDO_PAGAMENTO_LOTE = {
    abrir: abrirModal,
    abrirComPedido: abrirComPedido,
    fechar: fecharModal,
    atualizar: atualizar,
    obterSelecionados:
        obterSelecionados,
    confirmarPagamento:
        avancarParaConfirmacao,
    avancarParaConfirmacao:
        avancarParaConfirmacao,
    voltarParaSelecao:
        voltarParaSelecao,
    executarBaixa:
        executarPagamentoConfirmado
};

window.RDO_PAGAMENTO_LOTE_PRONTO =
    true;

})();