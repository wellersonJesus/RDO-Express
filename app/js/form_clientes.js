if (typeof API === 'undefined') {
    console.error('[form_clientes.js] ❌ API não está definida. Carregando api.js...');

    // Tentar carregar api.js dinamicamente
    var script = document.createElement('script');
    script.src = '../api/api.js'; // Ajuste o caminho se necessário
    script.onload = function () {
        console.log('[form_clientes.js] ✅ api.js carregado com sucesso');
    };
    script.onerror = function () {
        console.error('[form_clientes.js] ❌ Falha ao carregar api.js');
    };
    document.head.appendChild(script);
}

window.AppRDO = window.AppRDO || {};
window.dadosPedidoAtual = window.dadosPedidoAtual || {};

window._preencherFormulario = function (dados) {
    console.log('[form_clientes.js] 📝 Preenchendo formulário automaticamente');

    if (!dados) {
        console.error('[form_clientes.js] ❌ Dados não fornecidos');
        return;
    }

    var texto = dados.texto || dados.rawInput || '';
    var linhas = texto.split('\n');

    var solicitante = dados.cliente_nome || dados.solicitante || '';
    var contato = dados.cliente_telefone || dados.contato || '';
    var horario = dados.horario || '';
    var mercadoria = 'ENTREGA';
    var retorno = '0';
    var prioridade = '0';
    var observacao = '';

    linhas.forEach(function (linha) {
        linha = linha.trim();

        var matchMerc = linha.match(/(?:MERCADORIA)\s*:\s*(.+)/i);
        if (matchMerc) {
            var val = matchMerc[1].trim().toUpperCase();
            if (val.includes('ENTREGA')) mercadoria = 'ENTREGA';
            else if (val.includes('BUSCA')) mercadoria = 'BUSCA';
            else if (val.includes('COMPRA')) mercadoria = 'COMPRA';
            else if (val.includes('PAGAMENTO')) mercadoria = 'PAGAMENTO';
        }

        var matchRet = linha.match(/(?:RETORNO)\s*:\s*(.+)/i);
        if (matchRet) {
            var valRet = matchRet[1].trim().toUpperCase();
            retorno = (valRet.includes('SIM') || valRet.includes('60')) ? '0.6' : '0';
        }

        var matchPrio = linha.match(/(?:PRIORIDADE)\s*:\s*(.+)/i);
        if (matchPrio) {
            var valPrio = matchPrio[1].trim().toUpperCase();
            if (valPrio.includes('AGENDADO')) prioridade = '5';
            else if (valPrio.includes('URGENTE')) prioridade = '7';
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
        { id: 'p-contato', valor: contato },
        { id: 'p-horario', valor: horario },
        { id: 'p-mercadoria', valor: mercadoria },
        { id: 'p-distancia', valor: (dados.distanciaTotal || 0).toFixed(2) },
        { id: 'p-tempo', valor: dados.tempo || '0 min' },
        { id: 'p-rotas', valor: rotasTexto },
        { id: 'p-retorno', valor: retorno },
        { id: 'p-prioridade', valor: prioridade },
        { id: 'p-obs', valor: observacao }
    ];

    campos.forEach(function (c) {
        var el = document.getElementById(c.id);
        if (el) {
            el.value = c.valor;
            el.classList.remove('is-invalid');
        }
    });

    if (typeof window.calcularTudo === 'function') {
        window.calcularTudo();
    }

    console.log('[form_clientes.js] ✅ Formulário preenchido');
};

window.calcularTudo = function () {
    var distancia = parseFloat(document.getElementById('p-distancia')?.value || 0);
    var valorKm = parseFloat(document.getElementById('p-valor-km')?.value || 3.00);
    var retorno = parseFloat(document.getElementById('p-retorno')?.value || 0);
    var dinamica = parseFloat(document.getElementById('p-dinamica')?.value || 0);
    var prioridade = parseFloat(document.getElementById('p-prioridade')?.value || 0);

    var valorBase = distancia * valorKm;
    var valorRetorno = valorBase * retorno;
    var valorFinal = valorBase + valorRetorno + dinamica + prioridade;

    var viewValorFinal = document.getElementById('view-valor-final');
    if (viewValorFinal) viewValorFinal.textContent = 'R$ ' + valorFinal.toFixed(2);

    console.log('[form_clientes.js] 💰 Valor: R$', valorFinal.toFixed(2));
};

window._validarCamposObrigatorios = function () {
    console.log('[form_clientes.js] 🔍 Validando...');

    var camposObrigatorios = [
        { id: 'p-solicitante', nome: 'Solicitante' },
        { id: 'p-contato', nome: 'Contato' },
        { id: 'p-mercadoria', nome: 'Mercadoria' },
        { id: 'p-rotas', nome: 'Rotas' }
    ];

    var invalidos = [];

    camposObrigatorios.forEach(function (campo) {
        var el = document.getElementById(campo.id);
        if (el) {
            var val = (el.value || '').trim();
            if (!val || val === 'SELECIONE') {
                el.classList.add('is-invalid');
                invalidos.push(campo.nome);
            } else {
                el.classList.remove('is-invalid');
            }
        }
    });

    if (invalidos.length > 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Campos Obrigatórios',
                html: 'Preencha: <b>' + invalidos.join(', ') + '</b>',
                confirmButtonColor: '#dc3545'
            });
        }
        return false;
    }

    return true;
};

window.salvarPedidoAPI = async function () {
    console.log('[form_clientes.js] 🚀 Salvando pedido...');

    if (typeof API === 'undefined' || typeof API.call !== 'function') {
        console.error('[form_clientes.js] ❌ API não disponível');
        Swal.fire({ icon: 'error', title: 'Erro', text: 'API não carregada', confirmButtonColor: '#dc3545' });
        return;
    }

    if (window.AppRDO && window.AppRDO.isProcessingCheckout) return;

    var elSolicitante = document.getElementById('p-solicitante');
    var elContato = document.getElementById('p-contato');
    var elMercadoria = document.getElementById('p-mercadoria');
    var elHorario = document.getElementById('p-horario');
    var elDistancia = document.getElementById('p-distancia');
    var elTempo = document.getElementById('p-tempo');
    var elRotas = document.getElementById('p-rotas');
    var elObs = document.getElementById('p-obs');
    var elValorFinal = document.getElementById('view-valor-final');

    var camposObrigatorios = [
        { el: elContato, nome: 'Contato' },
        { el: elMercadoria, nome: 'Mercadoria' }
    ];

    for (var i = 0; i < camposObrigatorios.length; i++) {
        var campo = camposObrigatorios[i];
        if (!campo.el || !campo.el.value.trim()) {
            if (campo.el) {
                campo.el.style.border = '2px solid #dc3545';
                campo.el.focus();
                setTimeout(function (el) { el.style.border = ''; }.bind(null, campo.el), 2500);
            }
            Swal.fire({ icon: 'warning', title: 'Campo Obrigatório', text: 'Preencha: ' + campo.nome, confirmButtonColor: '#dc3545' });
            return;
        }
    }

    var solicitante = elSolicitante && elSolicitante.value.trim() ? elSolicitante.value.trim() : 'Não informado';
    var contato = elContato.value.trim();
    var mercadoria = elMercadoria.value.trim();
    var horario = elHorario ? elHorario.value.trim() : '';
    var distancia = elDistancia ? elDistancia.value.trim() : '0';
    var tempo = elTempo ? elTempo.value.trim() : '';
    var rotas = elRotas ? elRotas.value.trim() : '';
    var obs = elObs ? elObs.value.trim() : '';
    var valorFinal = elValorFinal ? elValorFinal.textContent.trim() : 'R$ 0,00';

    var clienteId = window.AppRDO && window.AppRDO.clienteId ? String(window.AppRDO.clienteId).trim() : null;
    if (!clienteId) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Cliente não selecionado', confirmButtonColor: '#dc3545' });
        return;
    }

    var btnEmitir = document.getElementById('btn-emitir-pedido');
    if (btnEmitir) {
        btnEmitir.disabled = true;
        btnEmitir.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
    }

    window.AppRDO.isProcessingCheckout = true;

    try {
        console.log('[form_clientes.js] 📡 Chamando API...');
        
        var mensagemTemporaria = [
            '👤 : ' + solicitante + ' |📞 : ' + contato,
            '📦 : ' + mercadoria,
            '.',
            '📍 ROTAS:',
            rotas,
            '.',
            '🛣️ ' + distancia + ' km ⏱️ ' + tempo + ' 💰 ' + valorFinal
        ].join('\n');

        if (obs) mensagemTemporaria += '\n.\n💬 OBS: ' + obs;

        var resposta = await API.call('addpedido', {
            id_cliente: clienteId,
            solicitante: solicitante,
            telefone: contato,
            texto: mensagemTemporaria,
            status: 'PENDENTE',
            motoboy: ''
        });

        if (!resposta || resposta.status !== 'success') {
            throw new Error(resposta && resposta.message ? resposta.message : 'Falha ao salvar');
        }

        var pedidoId = resposta.id || resposta.pedido_id || Date.now();
        var pedidoIdFormatado = 'RDO' + String(pedidoId).padStart(4, '0');
        
        console.log('[form_clientes.js] ✅ Pedido salvo. ID:', pedidoIdFormatado);

        var agora = new Date();
        var dataISO = agora.toISOString().split('T')[0];
        var hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        var rotasComPonto = rotas.split('\n').filter(function(l) { return l.trim(); }).map(function(r) { return r + '\n.'; }).join('\n');

        var mensagemFinal = [
            '📦 N.SERVIÇO: ' + pedidoIdFormatado,
            '👤 : ' + solicitante + ' |📞 : ' + contato,
            '📦 : ' + mercadoria,
            '.',
            '📍 ROTAS:',
            rotasComPonto,
            '🛣️ ' + distancia + ' km ⏱️ ' + tempo + ' 💰 ' + valorFinal
        ].join('\n');

        if (obs) mensagemFinal += '\n.\n💬 OBS: ' + obs;

        var novoPedido = {
            id: pedidoId,
            id_cliente: clienteId,
            solicitante: solicitante,
            telefone: contato,
            texto: mensagemFinal,
            status: 'PENDENTE',
            motoboy: '',
            data: dataISO,
            hora: hora,
            contato: contato,
            mercadoria: mercadoria,
            horario: horario,
            observacoes: obs,
            valor: parseFloat(valorFinal.replace(/[^\d,]/g, '').replace(',', '.')) || 0
        };

        if (!Array.isArray(window.AppRDO.pedidosCache)) window.AppRDO.pedidosCache = [];
        window.AppRDO.pedidosCache.push(novoPedido);

        if (!Array.isArray(window.AppRDO.mensagensCache)) window.AppRDO.mensagensCache = [];
        window.AppRDO.mensagensCache.push({
            id: Date.now(),
            pedido_id: pedidoId,
            id_cliente: clienteId,
            texto: mensagemFinal,
            data: dataISO,
            hora: hora
        });

        if (typeof window._criarWrapperMensagem === 'function') {
            var container = document.getElementById('chat-messages-container');
            if (container) {
                container.appendChild(window._criarWrapperMensagem(pedidoId, mensagemFinal, hora, false, '', 'Alterar Status'));
                container.scrollTop = container.scrollHeight;
            }
        }

        if (typeof window.EventBus !== 'undefined') {
            window.EventBus.emit('pedido:adicionado', novoPedido);
        }

        var msgInput = document.getElementById('msg-input');
        if (msgInput) msgInput.value = '';

        var modalForm = document.getElementById('modalFormulario');
        if (modalForm) {
            var instForm = bootstrap.Modal.getInstance(modalForm);
            if (instForm) { try { instForm.hide(); } catch (_) {} }
        }

        window.dadosPedidoAtual = {};
        window.AppRDO._mapaModalAberto = false;

        Swal.fire({
            icon: 'success', title: 'Pedido Enviado!', text: 'O pedido foi registrado.',
            timer: 2500, timerProgressBar: true, toast: true, position: 'top-end', showConfirmButton: false
        });

    } catch (erro) {
        console.error('[form_clientes.js] ❌ Erro:', erro);
        Swal.fire({ icon: 'error', title: 'Erro ao Salvar', text: erro.message || 'Erro desconhecido', confirmButtonColor: '#dc3545' });
    } finally {
        if (btnEmitir) {
            btnEmitir.disabled = false;
            btnEmitir.innerHTML = '<i class="bi bi-send-fill"></i> EMITIR PEDIDO';
        }
        window.AppRDO.isProcessingCheckout = false;
    }
};

console.log('[form_clientes.js] ✅ Pronto');
