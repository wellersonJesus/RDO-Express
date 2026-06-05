(function() {
    let state = {
        dadosChat: [],
        dadosPedidos: [],
        bsModal: null,
        bsModalAtencao: null
    };

    // Inicialização
    const init = () => {
        const modalEl = document.getElementById('modalPedidoDetalhes');
        const modalAtencaoEl = document.getElementById('modalAtencaoPedido');
        
        if (modalEl) state.bsModal = new bootstrap.Modal(modalEl);
        if (modalAtencaoEl) state.bsModalAtencao = new bootstrap.Modal(modalAtencaoEl);
        
        carregarPedidos();
    };

    // Função que estava faltando e causava o erro
    function renderizarTabela() {
        const container = document.getElementById('tabela-pedidos-body');
        if (!container) {
            console.warn("Elemento 'tabela-pedidos-body' não encontrado.");
            return;
        }

        container.innerHTML = state.dadosChat.map(chat => {
            // Tenta encontrar um pedido vinculado a este chat
            const pedido = state.dadosPedidos.find(p => String(p.id_mensagens_chat) === String(chat.id));
            
            return `
                <tr>
                    <td>${chat.id}</td>
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

    // Busca consolidada
    async function carregarPedidos() {
        const syncBtn = document.getElementById('sync-pedidos');
        if (syncBtn) syncBtn.classList.add('loading-spin');
        
        try {
            const [resChat, resPedidos] = await Promise.all([
                API.call('getchat'), 
                API.call('getpedidos')
            ]);
            
            state.dadosChat = Array.isArray(resChat) ? resChat.filter(m => String(m.finalizado) === "true").reverse() : [];
            state.dadosPedidos = Array.isArray(resPedidos) ? resPedidos : [];
            
            renderizarTabela(); // Agora a função existe no mesmo escopo
        } catch (e) { 
            console.error("Erro no carregamento:", e); 
        } finally { 
            if (syncBtn) syncBtn.classList.remove('loading-spin'); 
        }
    }

    // Expor funções necessárias para o HTML (onclick)
    window.abrirDetalhes = function(chatId) {
        console.log("Abrindo detalhes do chat:", chatId);
        // Lógica de abrir modal aqui
    };

    // Lógica Unificada de Salvamento
    async function salvarPedido(payloadChat, payloadPedido, isNovo = false) {
        try {
            await API.call('updatechat', payloadChat);
            if (isNovo) {
                await API.call('addpedidos', payloadPedido);
            } else {
                await API.call('updatepedidos', payloadPedido);
            }
            await carregarPedidos();
            return true;
        } catch (err) {
            console.error("Erro ao salvar pedido:", err);
            return false;
        }
    }

    init();
})();