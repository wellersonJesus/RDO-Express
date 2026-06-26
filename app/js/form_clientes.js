console.log('[form_clientes.js] ========== SCRIPT CARREGADO ==========');

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
    console.log('[form_clientes.js] 💾 salvarPedidoAPI()');

    if (!window._validarCamposObrigatorios()) return;

    var btn = document.getElementById('btn-emitir-pedido');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
    }

    var dados = window.dadosPedidoAtual;
    var solicitante = document.getElementById('p-solicitante')?.value.trim();
    var contato = document.getElementById('p-contato')?.value.trim();
    var horario = document.getElementById('p-horario')?.value.trim() || '';
    var mercadoria = document.getElementById('p-mercadoria')?.value || 'ENTREGA';
    var observacao = document.getElementById('p-obs')?.value.trim() || '';
    var retornoVal = document.getElementById('p-retorno')?.value || '0';
    var retornoTexto = retornoVal === '0.6' ? 'SIM' : 'NÃO';
    var valorFinal = document.getElementById('view-valor-final')?.textContent || 'R$ 0,00';

    var rotasFormatadas = '';
    if (dados.rotasProcessadas && dados.rotasProcessadas.length > 0) {
        rotasFormatadas = dados.rotasProcessadas.map(function (r, idx) {
            return '📍 ' + (idx + 1) + '. De: ' + r.de + ' |\n         Para: ' + r.para;
        }).join('\n');
    }

    var contatoCompleto = contato;
    if (horario) contatoCompleto += ' | HR: ' + horario;

    var mensagemFinal =
        'N.SERVIÇO: RDO' + String(Date.now()).slice(-3) + '\n' +
        'SOLICITANTE: ' + solicitante + '\n' +
        'CONTATO: ' + contatoCompleto + '\n' +
        '-\n' +
        'MERCADORIA: ' + mercadoria + '\n' +
        'RETORNO: ' + retornoTexto + '\n' +
        '-\n' +
        'ROTA(s):\n' + rotasFormatadas + '\n' +
        '-\n' +
        'OBSERVAÇÃO: ' + observacao + '\n' +
        valorFinal;

    console.log('[form_clientes.js] 📤 Mensagem:\n', mensagemFinal);

    try {
        if (typeof API === 'undefined' || typeof API.sendMessage !== 'function') {
            throw new Error('API indisponível');
        }

        var clienteId = dados.clienteId;
        if (!clienteId) throw new Error('ID do cliente não encontrado');

        var resposta = await API.sendMessage(clienteId, mensagemFinal);

        if (resposta && resposta.success) {
            console.log('[form_clientes.js] ✅ Enviado!');

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Enviado!',
                    text: 'Pedido enviado com sucesso',
                    timer: 2000,
                    showConfirmButton: false
                }).then(function () {
                    window.fecharParaChat('modalFormulario');
                    if (typeof window.carregarDados === 'function') window.carregarDados();
                });
            }
        } else {
            throw new Error('Erro ao enviar');
        }
    } catch (erro) {
        console.error('[form_clientes.js] ❌ Erro:', erro);

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Não foi possível enviar o pedido',
                confirmButtonColor: '#dc3545'
            });
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>EMITIR PEDIDO';
        }
    }
};

console.log('[form_clientes.js] ✅ Pronto');
