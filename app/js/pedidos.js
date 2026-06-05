(function () {
    let state = {
        dadosChat: [],
        dadosPedidos: [],
        bsModal: null
    };

    // Inicialização robusta
    const init = () => {
        const modalEl = document.getElementById('modalPedidoDetalhes');
        if (modalEl) state.bsModal = new bootstrap.Modal(modalEl);
        carregarPedidos();
    };

    async function carregarPedidos() {
        const syncBtn = document.getElementById('sync-pedidos');
        if (syncBtn) syncBtn.classList.add('loading-spin');

        try {
            // Se as abas no Sheets forem diferentes de 'chat' ou 'pedidos', mude aqui:
            const [resChat, resPedidos] = await Promise.all([
                API.call('getchat'),
                API.call('getpedidos')
            ]);

            // Tratamento: garante que os dados sejam arrays
            state.dadosChat = Array.isArray(resChat) ? resChat : [];
            state.dadosPedidos = Array.isArray(resPedidos) ? resPedidos : [];

            console.log("Chat carregado:", state.dadosChat.length);
            console.log("Pedidos carregados:", state.dadosPedidos.length);

            renderizarTabela();
        } catch (e) {
            console.error("Erro na comunicação com o servidor:", e);
        } finally {
            if (syncBtn) syncBtn.classList.remove('loading-spin');
        }
    }

    function renderizarTabela() {
        const container = document.getElementById('tabela-pedidos-body');
        if (!container) return;

        container.innerHTML = state.dadosChat.map(chat => {
            // CRÍTICO: Verifique se 'id_mensagens_chat' é o nome exato da coluna na planilha 'pedidos'
            // Se na planilha se chamar 'id_chat', mude para p.id_chat
            const pedido = state.dadosPedidos.find(p =>
                String(p.id_mensagens_chat || p.id_chat || "").trim() === String(chat.id).trim()
            );

            return `
                <tr>
                    <td>${chat.id || '-'}</td>
                    <td>${pedido ? pedido.solicitante : 'Sem pedido'}</td>
                    <td>${pedido ? pedido.mercadoria : '-'}</td>
                    <td>${pedido ? pedido.valor_corrida : '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="window.abrirDetalhes('${chat.id}')">
                            Detalhes
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.abrirDetalhes = function (chatId) {
        const pedido = state.dadosPedidos.find(p => String(p.id_mensagens_chat || p.id_chat).trim() === String(chatId).trim());
        if (pedido) {
            console.log("Pedido encontrado:", pedido);
            // Aqui você deve popular seu modal com os dados do pedido
            state.bsModal.show();
        } else {
            alert("Nenhum pedido vinculado a este chat.");
        }
    };

    init();
})();