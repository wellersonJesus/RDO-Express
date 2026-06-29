if (typeof API === 'undefined') {
    var script = document.createElement('script');
    script.src = '../api/api.js';
    document.head.appendChild(script);
}

window.AppRDO = window.AppRDO || {};
window.dadosPedidoAtual = window.dadosPedidoAtual || {};

window._preencherFormulario = function (dados) {
    if (!dados) return;

    var texto  = dados.texto || dados.rawInput || '';
    var linhas = texto.split('\n');

    var solicitante = dados.cliente_nome || dados.solicitante || '';
    var contato     = dados.cliente_telefone || dados.contato || '';
    var horario     = dados.horario || '';
    var mercadoria  = 'ENTREGA';
    var retorno     = '0';
    var prioridade  = '0';
    var observacao  = '';

    linhas.forEach(function (linha) {
        linha = linha.trim();

        var matchMerc = linha.match(/(?:MERCADORIA)\s*:\s*(.+)/i);
        if (matchMerc) {
            var val = matchMerc[1].trim().toUpperCase();
            if      (val.includes('ENTREGA'))   mercadoria = 'ENTREGA';
            else if (val.includes('BUSCA'))      mercadoria = 'BUSCA';
            else if (val.includes('COMPRA'))     mercadoria = 'COMPRA';
            else if (val.includes('PAGAMENTO'))  mercadoria = 'PAGAMENTO';
        }

        var matchRet = linha.match(/(?:RETORNO)\s*:\s*(.+)/i);
        if (matchRet) {
            var valRet = matchRet[1].trim().toUpperCase();
            retorno = (valRet.includes('SIM') || valRet.includes('60')) ? '0.6' : '0';
        }

        var matchPrio = linha.match(/(?:PRIORIDADE)\s*:\s*(.+)/i);
        if (matchPrio) {
            var valPrio = matchPrio[1].trim().toUpperCase();
            if      (valPrio.includes('AGENDADO')) prioridade = '5';
            else if (valPrio.includes('URGENTE'))  prioridade = '7';
        }

        var matchObs = linha.match(/(?:OBSERVAÇÃO|OBSERVACAO|OBS)\s*:\s*(.+)/i);
        if (matchObs) observacao = matchObs[1].trim();
    });

    var rotasTexto = '';
    if (dados.rotasProcessadas && dados.rotasProcessadas.length > 0) {
        rotasTexto = dados.rotasProcessadas.map(function (r, idx) {
            return (idx + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
        }).join('\n');
    }

    var headerNome = document.getElementById('header-nome-cliente');
    if (headerNome) headerNome.textContent = solicitante;

    var campos = [
        { id: 'p-solicitante', valor: solicitante },
        { id: 'p-contato',     valor: contato },
        { id: 'p-horario',     valor: horario },
        { id: 'p-mercadoria',  valor: mercadoria },
        { id: 'p-distancia',   valor: (dados.distanciaTotal || 0).toFixed(2) },
        { id: 'p-tempo',       valor: dados.tempo || '0 min' },
        { id: 'p-rotas',       valor: rotasTexto },
        { id: 'p-retorno',     valor: retorno },
        { id: 'p-prioridade',  valor: prioridade },
        { id: 'p-obs',         valor: observacao }
    ];

    campos.forEach(function (c) {
        var el = document.getElementById(c.id);
        if (el) { el.value = c.valor; el.classList.remove('is-invalid'); }
    });

    if (typeof window.calcularTudo === 'function') window.calcularTudo();
};

window.calcularTudo = function () {
    var distancia  = parseFloat((document.getElementById('p-distancia')  || {}).value || 0);
    var valorKm    = parseFloat((document.getElementById('p-valor-km')   || {}).value || 3.00);
    var retorno    = parseFloat((document.getElementById('p-retorno')    || {}).value || 0);
    var dinamica   = parseFloat((document.getElementById('p-dinamica')   || {}).value || 0);
    var prioridade = parseFloat((document.getElementById('p-prioridade') || {}).value || 0);

    var valorBase  = distancia * valorKm;
    var valorFinal = valorBase + (valorBase * retorno) + dinamica + prioridade;

    var el = document.getElementById('view-valor-final');
    if (el) el.textContent = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

window.salvarPedidoAPI = async function () {
    if (typeof API === 'undefined' || typeof API.call !== 'function') {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'API não carregada', confirmButtonColor: '#dc3545' });
        return;
    }
    if (window.AppRDO && window.AppRDO.isProcessingCheckout) return;

    var dados = window.dadosPedidoAtual || {};

    var elSolicitante = document.getElementById('p-solicitante');
    var elContato     = document.getElementById('p-contato');
    var elMercadoria  = document.getElementById('p-mercadoria');
    var elHorario     = document.getElementById('p-horario');
    var elObs         = document.getElementById('p-obs');
    var elValorKm     = document.getElementById('p-valor-km');
    var elRetorno     = document.getElementById('p-retorno');
    var elPrioridade  = document.getElementById('p-prioridade');
    var elDinamica    = document.getElementById('p-dinamica');
    var elValorFinal  = document.getElementById('view-valor-final');

    var solicitante = elSolicitante ? elSolicitante.value.trim() : (dados.solicitante || '');
    var contato     = elContato     ? elContato.value.trim()     : (dados.contato || '');
    var mercadoria  = elMercadoria  ? elMercadoria.value.trim()  : (dados.mercadoria || 'ENTREGA');
    var horario     = elHorario     ? elHorario.value.trim()     : (dados.horario || '');
    var obs         = elObs         ? elObs.value.trim()         : (dados.obs || '');
    var valorKm     = elValorKm     ? (parseFloat(elValorKm.value) || 3.00) : 3.00;
    var retorno     = elRetorno     ? elRetorno.value.trim()     : '0';
    var prioridade  = elPrioridade  ? elPrioridade.value.trim()  : '0';
    var dinamica    = elDinamica    ? elDinamica.value.trim()    : '0';
    var valorFinal  = elValorFinal  ? elValorFinal.textContent.trim() : 'R$ 0,00';

    // — Validações —
    var temErro = false;
    if (!contato)    { window.marcarCampoFormInvalido(elContato);   temErro = true; }
    if (!mercadoria) { window.marcarCampoFormInvalido(elMercadoria); temErro = true; }
    if (temErro) {
        Swal.fire({ icon: 'warning', title: 'Campos obrigatórios', text: 'Preencha todos os campos marcados em vermelho.', confirmButtonColor: '#dc3545' });
        return;
    }

    var clienteId = window.AppRDO && window.AppRDO.clienteId ? String(window.AppRDO.clienteId).trim() : null;
    if (!clienteId) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Cliente não selecionado', confirmButtonColor: '#dc3545' });
        return;
    }

    // — Número do serviço —
    var totalExistentes = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache.length : 0;
    var numeroServico   = 'RDO' + String(totalExistentes + 1).padStart(3, '0');

    // — Montar mensagem formatada (exatamente como gerarMensagemFormatada) —
    var msgFormatada = window.gerarMensagemFormatada({
        numeroServico:   numeroServico,
        solicitante:     solicitante,
        contato:         contato,
        mercadoria:      mercadoria,
        rotasProcessadas: dados.rotasProcessadas || [],
        distanciaTotal:  dados.distanciaTotal || 0,
        tempoTotal:      dados.tempoTotal || 0,
        valorEstimado:   parseFloat(
            valorFinal.replace(/[^\d,]/g, '').replace(',', '.')
        ) || dados.valorEstimado || 0
    });

    var payload = {
        id_cliente:    clienteId,
        solicitante:   solicitante,
        contato:       contato,
        horario:       horario,
        mercadoria:    mercadoria,
        observacao:    obs,
        distancia:     String(dados.distanciaTotal || 0),
        tempo:         String(dados.tempoTotal || 0),
        valor_km:      String(valorKm),
        retorno:       retorno,
        prioridade:    prioridade,
        dinamica:      dinamica,
        valor_corrida: valorFinal,
        numero_servico: numeroServico,
        rotas:         JSON.stringify(dados.rotasProcessadas || []),
        rotas_texto:   (dados.rotasProcessadas || []).map(function (r, i) {
                           return (i + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
                       }).join('\n'),
        texto:         msgFormatada, // ← campo que o GAS grava no chat
        mensagem:      msgFormatada, // ← fallback caso o GAS use este nome
        status:        'PENDENTE'
    };

    var btnEmitir = document.getElementById('btn-emitir-pedido');
    if (btnEmitir) { btnEmitir.disabled = true; btnEmitir.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...'; }
    window.AppRDO.isProcessingCheckout = true;

    try {
        var resposta = await API.call('criarpedido', payload);

        if (!resposta || resposta.status !== 'success') {
            throw new Error((resposta && resposta.message) || 'Falha ao criar pedido.');
        }

        var pedidoId = resposta.id || resposta.pedido_id || Date.now();
        var agora    = new Date();
        var dataISO  = agora.toISOString().split('T')[0];
        var hora     = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        var novoPedido = {
            id:             pedidoId,
            id_cliente:     clienteId,
            solicitante:    solicitante,
            contato:        contato,
            mercadoria:     mercadoria,
            horario:        horario,
            numero_servico: numeroServico,
            texto:          msgFormatada,
            status:         'PENDENTE',
            motoboy:        '',
            data:           dataISO,
            hora:           hora,
            observacoes:    obs,
            valor:          parseFloat(valorFinal.replace(/[^\d,]/g, '').replace(',', '.')) || 0
        };

        if (!Array.isArray(window.AppRDO.pedidosCache))   window.AppRDO.pedidosCache   = [];
        if (!Array.isArray(window.AppRDO.mensagensCache)) window.AppRDO.mensagensCache = [];

        window.AppRDO.pedidosCache.push(novoPedido);
        window.AppRDO.mensagensCache.push({
            id: Date.now(), pedido_id: pedidoId, id_cliente: clienteId,
            texto: msgFormatada, data: dataISO, hora: hora
        });

        // Renderiza no chat imediatamente
        var container = document.getElementById('chat-messages-container');
        if (container && typeof window._criarWrapperMensagem === 'function') {
            var emptyState = container.querySelector('.chat-empty-state');
            if (emptyState) emptyState.remove();
            container.appendChild(
                window._criarWrapperMensagem(pedidoId, msgFormatada, hora, false, '', 'Alterar Status')
            );
            container.scrollTop = container.scrollHeight;
        }

        if (typeof window.EventBus !== 'undefined') window.EventBus.emit('pedido:adicionado', novoPedido);

        // Restaurar input
        var msgInput = document.getElementById('msg-input');
        if (msgInput) {
            msgInput.value = window.MODELO_PADRAO || '';
            msgInput.style.border = '';
            msgInput.style.boxShadow = '';
        }

        var modalForm = document.getElementById('modalFormulario');
        if (modalForm) {
            var instForm = bootstrap.Modal.getInstance(modalForm);
            if (instForm) { try { instForm.hide(); } catch (_) {} }
        }

        window.dadosPedidoAtual        = {};
        window.AppRDO._mapaModalAberto = false;

        setTimeout(function () { _limparBackdrop(); }, 400);

        Swal.fire({
            icon: 'success', title: 'Pedido criado!', text: 'Registrado com sucesso.',
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 2500, timerProgressBar: true, customClass: { popup: 'rounded-4 shadow' }
        });

    } catch (err) {
        Swal.fire({
            icon: 'error', title: 'Erro ao salvar',
            text: err.message || 'Erro desconhecido',
            confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' }
        });
    } finally {
        if (btnEmitir) { btnEmitir.disabled = false; btnEmitir.innerHTML = '<i class="bi bi-send-fill me-1"></i>EMITIR PEDIDO'; }
        window.AppRDO.isProcessingCheckout = false;
    }
};

console.log('[form_clientes.js] ✅ Pronto');
