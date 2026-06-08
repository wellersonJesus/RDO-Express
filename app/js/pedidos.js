window.pedidosState = {
    dadosChat: [],
    dadosPedidos: [],
    bsModal: null,
    isFetching: false // Trava de segurança para o Maestro
};

window.iniciarPedidos = async () => {
    // 1. Verificação de Segurança
    if (!window.checkMaster()) {
        const container = document.getElementById('tabela-pedidos-body');
        if (container) container.innerHTML = '<tr><td colspan="5" class="text-center">Sistema Master RDO desligado.</td></tr>';
        return;
    }

    // 2. Setup do Modal (Apenas se o elemento existir)
    const modalEl = document.getElementById('modalPedidoDetalhes');
    if (modalEl) {
        window.pedidosState.bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    }

    // 3. Execução controlada
    await window.carregarPedidos();
};

window.carregarPedidos = async function() {
    // TRAVA: Evita cliques múltiplos ou carregamento duplicado
    if (window.pedidosState.isFetching) return;
    window.pedidosState.isFetching = true;

    const syncBtn = document.getElementById('sync-pedidos');
    if (syncBtn) syncBtn.classList.add('loading-spin');

    try {
        const [resChat, resPedidos] = await Promise.all([
            API.call('getchat'),
            API.call('getpedidos')
        ]);

        window.pedidosState.dadosChat = Array.isArray(resChat) ? resChat : [];
        window.pedidosState.dadosPedidos = Array.isArray(resPedidos) ? resPedidos : [];

        window.renderizarTabelaPedidos();
    } catch (e) {
        console.error("Erro na comunicação:", e);
    } finally {
        window.pedidosState.isFetching = false;
        if (syncBtn) syncBtn.classList.remove('loading-spin');
    }
};

window.renderizarTabelaPedidos = function() {
    const container = document.getElementById('tabela-pedidos-body');
    if (!container) return;

    container.innerHTML = window.pedidosState.dadosChat.map(chat => {
        const pedido = window.pedidosState.dadosPedidos.find(p =>
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
};

window.abrirDetalhes = function (chatId) {
    const pedido = window.pedidosState.dadosPedidos.find(p => 
        String(p.id_mensagens_chat || p.id_chat).trim() === String(chatId).trim()
    );
    if (pedido && window.pedidosState.bsModal) {
        window.pedidosState.bsModal.show();
    } else {
        alert("Nenhum pedido vinculado a este chat.");
    }
};