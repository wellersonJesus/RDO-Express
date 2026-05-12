/**
 * Lógica de Finalização de Pedido - RDO Express
 * Integração entre Chat e Tabela de Pedidos
 */

async function salvarPedidoAPI() {
    const srvEl = document.getElementById('p-tipo-servico');
    const locEl = document.getElementById('p-localidade');
    const kmEl = document.getElementById('p-tabela-km');
    const obs = document.getElementById('p-obs').value || 'Sem observações';
    
    // Captura o valor total exibido na UI
    const valorTexto = document.getElementById('view-valor-final').innerText;
    const valorTotal = parseFloat(valorTexto.replace('R$ ', '').replace('.', '').replace(',', '.'));

    // Monta o objeto exatamente conforme o esquema do seu banco
    const dadosPedido = {
        data_solicitacao: new Date().toISOString().slice(0, 19).replace('T', ' '),
        id_cliente: window.chatState.jidSelecionado,
        id_colaborador: null, // Pendente de atribuição
        origem: window.chatState.lastLocations?.origem || 'Não informada',
        destino: window.chatState.lastLocations?.destino || 'Não informado',
        solicitacao: window.chatState.rawLastMessage, // Texto original do chat
        tipo_servico: srvEl.options[srvEl.selectedIndex].text,
        endereco: locEl.options[locEl.selectedIndex].text,
        tipo_tarifa: kmEl.options[kmEl.selectedIndex].text,
        valor_total_pedido: valorTotal,
        valor_repasse_colaborador: (valorTotal * 0.7) // Regra de 70% de repasse
    };

    try {
        // Mostra loading no botão
        const btnFinalizar = document.querySelector('button[onclick="salvarPedidoAPI()"]');
        const originalText = btnFinalizar.innerHTML;
        btnFinalizar.disabled = true;
        btnFinalizar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> SALVANDO...';

        // Chama a API de criação de pedido
        const response = await API.call('createpedido', dadosPedido);

        if (response) {
            // 1. Atualiza o status da mensagem local para mostrar o emoji 📦
            if (window.chatState.mensagens.length > 0) {
                const ultimaMsg = window.chatState.mensagens[window.chatState.mensagens.length - 1];
                ultimaMsg.status = 'gerado';
                
                // Grava a atualização no chatlive do banco (se houver endpoint)
                await API.call('updatechatstatus', {
                    jid: window.chatState.jidSelecionado,
                    status: 'gerado',
                    ultima_msg: window.chatState.rawLastMessage
                }).catch(e => console.log('Silently ignoring chat update error'));
                
                renderizarMensagensLocal();
            }

            // 2. Feedback visual de sucesso
            Swal.fire({
                title: '<span style="color: #FF0000">RDO Express</span>',
                text: 'Pedido registrado e salvo no chat! 📦',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                border: 'none'
            });

            // 3. Fecha o modal e navega para a lista de pedidos
            const modalEl = document.getElementById('modalPedido');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            setTimeout(() => {
                if (typeof navegarPara === 'function') {
                    navegarPara('pedidos');
                } else if (typeof loadPage === 'function') {
                    loadPage('pedidos', 'Pedidos', 'Gestão de solicitações');
                }
            }, 2000);

        }
    } catch (error) {
        console.error('Erro ao salvar pedido:', error);
        Swal.fire('Erro Operacional', 'Não foi possível gravar o pedido no banco.', 'error');
    } finally {
        const btnFinalizar = document.querySelector('button[onclick="salvarPedidoAPI()"]');
        if (btnFinalizar) {
            btnFinalizar.disabled = false;
            btnFinalizar.innerHTML = 'FINALIZAR CHECKOUT';
        }
    }
}

console.log('✅ Lógica de Checkout RDO Express carregada.');
