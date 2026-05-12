// Função que prepara os dados para o banco conforme seus campos reais
function prepararDadosParaBanco() {
    const srvEl = document.getElementById('p-tipo-servico');
    const locEl = document.getElementById('p-localidade');
    const kmEl = document.getElementById('p-tabela-km');
    
    // Recupera os valores calculados na interface
    const valorTotal = parseFloat(document.getElementById('view-valor-final').innerText.replace('R$ ', '').replace(',', '.'));
    
    return {
        data_solicitacao: new Date().toLocaleString('pt-BR'),
        id_cliente: window.chatState.jidSelecionado,
        id_colaborador: "", // Vazio inicialmente
        origem: window.chatState.lastLocations?.origem || "Não informada",
        destino: window.chatState.lastLocations?.destino || "Não informado",
        solicitacao: window.chatState.rawLastMessage,
        tipo_servico: srvEl.options[srvEl.selectedIndex].text,
        endereco: locEl.options[locEl.selectedIndex].text,
        tipo_tarifa: kmEl.options[kmEl.selectedIndex].text,
        valor_total_pedido: valorTotal,
        valor_repasse_colaborador: (valorTotal * 0.7) // Exemplo: 70% para o motoboy
    };
}

// Quando clicar em Finalizar Checkout
async function salvarPedidoAPI() {
    const dadosPedido = prepararDadosParaBanco();
    
    try {
        // Envia para o banco de dados via API
        const response = await API.call('createpedido', dadosPedido);
        
        if(response.status === 'success') {
            // 1. Marca a mensagem com o emoji de gerado 📦
            if(window.chatState.mensagens.length > 0) {
                window.chatState.mensagens[window.chatState.mensagens.length - 1].status = 'gerado';
                renderizarMensagensLocal();
            }

            // 2. Fecha o modal
            bootstrap.Modal.getInstance(document.getElementById('modalPedido')).hide();

            // 3. Notifica e abre a página de pedidos
            Swal.fire({
                icon: 'success',
                title: 'Pedido Confirmado!',
                text: 'Redirecionando para a lista de pedidos...',
                timer: 1500,
                showConfirmButton: false
            });

            setTimeout(() => navegarPara('pedidos'), 1500);
        }
    } catch (error) {
        Swal.fire('Erro', 'Falha ao salvar no banco de dados.', 'error');
    }
}
