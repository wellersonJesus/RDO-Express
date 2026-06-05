(function() {
    let state = {
        dadosChat: [],
        dadosPedidos: [],
        bsModal: null,
        bsModalAtencao: null
    };

    // Inicialização
    const init = () => {
        state.bsModal = new bootstrap.Modal(document.getElementById('modalPedidoDetalhes') || document.createElement('div'));
        state.bsModalAtencao = new bootstrap.Modal(document.getElementById('modalAtencaoPedido') || document.createElement('div'));
        carregarPedidos();
    };

    // Busca consolidada
    async function carregarPedidos() {
        const syncBtn = document.getElementById('sync-pedidos');
        if (syncBtn) syncBtn.classList.add('loading-spin');
        
        try {
            // Alterado de 'getmensagens_chat' para 'getchat' (ou apenas 'chat', ajuste conforme o endpoint esperado no seu backend)
            const [resChat, resPedidos] = await Promise.all([
                API.call('getchat'), 
                API.call('getpedidos')
            ]);
            state.dadosChat = (resChat || []).filter(m => String(m.finalizado) === "true").reverse();
            state.dadosPedidos = resPedidos || [];
            renderizarTabela();
        } catch (e) { console.error("Erro carregamento:", e); } 
        finally { if (syncBtn) syncBtn.classList.remove('loading-spin'); }
    }

    // Lógica Unificada de Salvamento
    async function salvarPedido(payloadChat, payloadPedido, isNovo = false) {
        try {
            // Alterado de 'updatemensagens_chat' para 'updatechat'
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
        } finally {
            console.log("Processo de salvamento finalizado.");
        }
    }

    init();
})();