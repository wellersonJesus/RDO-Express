// RDO Express - Motor de Sincronização Dinâmico Form -> Planilha

function prepararDadosParaBanco() {
    // 1. Definição dos IDs únicos relacionais intercalados
    const idMensagemComum = "MSG-" + Date.now();
    const idPedidoComum = "PED-" + Date.now();
    
    // 2. Captura e higienização do valor final da corrida vindo do formulário
    let valorTotal = 0.00;
    const viewValorEl = document.getElementById('view-valor-final') || document.getElementById('p-valor-final');
    if (viewValorEl) {
        let limpo = viewValorEl.innerText.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
        if(!limpo && viewValorEl.value) { 
            limpo = viewValorEl.value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim(); 
        }
        valorTotal = parseFloat(limpo) || 0.00;
    }
    
    // 3. Captura dinâmica dos elementos do formulário de checkout
    const kmEl = document.getElementById('p-tabela-km') || document.getElementById('p-distancia');
    const locEl = document.getElementById('p-localidade') || document.getElementById('p-taxa');
    const prioEl = document.getElementById('p-prioridade');
    const obsEl = document.getElementById('p-observacao') || document.getElementById('p-obs');
    const srvEl = document.getElementById('p-tipo-servico');

    // Resgata o texto selecionado nos inputs do tipo <select> ou o valor bruto se for <input>
    const txtKm = kmEl ? (kmEl.options ? kmEl.options[kmEl.selectedIndex].text : kmEl.value) : "0 KM";
    const txtTaxa = locEl ? (locEl.options ? locEl.options[locEl.selectedIndex].text : locEl.value) : "Padrão";
    const txtPrioridade = prioEl ? (prioEl.options ? prioEl.options[prioEl.selectedIndex].text : prioEl.value) : "Normal";
    const txtObs = obsEl ? obsEl.value : "";
    const txtServico = srvEl ? (srvEl.options ? srvEl.options[srvEl.selectedIndex].text : srvEl.value) : "Geral";

    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
    const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Montagem do payload da mensagem de chat
    const payloadMensagemChat = {
        id: idMensagemComum,
        jid: window.chatState?.jidSelecionado || "0",
        id_numero: window.chatState?.jidSelecionado || "0",
        texto: window.chatState?.rawLastMessage || `Solicitação de Serviço: ${txtServico}`,
        hora: horaFormatada,
        data: dataFormatada,
        finalizado: "Não",
        status_emoji: "📦",
        motoboy: "",
        pedido_id: idPedidoComum
    };

    // Montagem do payload de pedidos mapeado rigorosamente com os tipos aceitos no sheets
    const payloadPedido = {
        id: idPedidoComum,
        id_mensagens_chat: idMensagemComum,
        km: txtKm,
        taxa_localidade: txtTaxa,
        prioridade: txtPrioridade,
        valor_corrida: valorTotal,
        observacao: txtObs ? txtObs : `Serviço: ${txtServico}`
    };

    return { payloadMensagemChat, payloadPedido };
}

async function salvarPedidoAPI() {
    const btnFinalizar = document.querySelector('button[onclick="salvarPedidoAPI()"]');
    if (btnFinalizar) {
        btnFinalizar.disabled = true;
        btnFinalizar.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> SALVANDO...';
    }

    const { payloadMensagemChat, payloadPedido } = prepararDadosParaBanco();
    
    try {
        // Usa o seu concentrador global seguro API.call para mensagens_chat
        console.log("Enviando para mensagens_chat...");
        await API.call('addmensagens_chat', payloadMensagemChat);
        
        // Intervalo de segurança para evitar concorrência de travas (LockService) nas planilhas
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Usa o seu concentrador global seguro API.call para pedidos
        console.log("Enviando para pedidos...");
        const statusPedido = await API.call('addpedidos', payloadPedido);
        console.log("Resposta da gravação de pedidos:", statusPedido);
        
        // Exibe sucesso de forma ampla capturando qualquer retorno positivo do barramento da planilha
        Swal.fire({
            title: '<span style="color: #FF0000">RDO Express</span>',
            text: 'Pedido registrado e salvo com sucesso! 📦',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false
        });

        const modalEl = document.getElementById('modalPedido');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }

        setTimeout(() => {
            if (typeof loadPage === 'function') {
                loadPage('pedidos', 'Pedidos', 'Gestão de solicitações');
            } else if (typeof navegarPara === 'function') {
                navegarPara('pedidos');
            } else {
                window.location.reload();
            }
        }, 1800);

    } catch (error) {
        console.error('Erro de comunicação na gravação:', error);
        Swal.fire('Erro Operacional', 'Falha de comunicação com o servidor de banco de dados.', 'error');
    } finally {
        if (btnFinalizar) {
            btnFinalizar.disabled = false;
            btnFinalizar.innerHTML = 'FINALIZAR CHECKOUT';
        }
    }
}
