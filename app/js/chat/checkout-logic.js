/**
 * RDO Express - Módulo Avançado: Autopreenchimento via Chat, Validação e Cálculos
 */

let contadorRotas = 1;

/**
 * Captura e processa o texto bruto do chat para preencher o formulário automaticamente
 * @param {string} textoChat - Mensagem copiada ou vinda do estado do chat
 */
function processarTextoChatEPreencher(textoChat) {
    if (!textoChat) return;

    // 1. Extração flexível via Regex (remove parênteses, lida com quebras de linha e múltiplos espaços)
    const extrairCampo = (regex) => {
        const match = textoChat.match(regex);
        return match ? match[1].replace(/[()]/g, '').trim() : '';
    };

    const solicitante = extrairCampo(/SOLICITANTE:\s*([^\n\r]*)/i);
    const horario = extrairCampo(/HORÁRIO ESTIMADO P\/\s*COLETA:\s*([^\n\r]*)/i);
    const mercadoria = extrairCampo(/MERCADORIA:\s*([^\n\r]*)/i);
    const retorno = extrairCampo(/TROCA\s*\/\s*RETORNO:\s*([^\n\r]*)/i);
    const prioridade = extrairCampo(/PRIORIDADE:\s*([^\n\r]*)/i);
    const observacao = extrairCampo(/OBSERVAÇÃO:\s*([^\n\r]*)/i);

    // 2. Injeta os valores textuais nos campos correspondentes do formulário
    if (solicitante) document.getElementById('p-solicitante').value = solicitante;
    if (horario) document.getElementById('p-horario-manual').value = horario;
    if (observacao) document.getElementById('p-obs').value = observacao;

    // 3. Seta os Dropdowns baseado no texto aproximado do chat
    if (mercadoria) {
        const selectMerc = document.getElementById('p-mercadoria-input');
        for (let opt of selectMerc.options) {
            if (opt.value.toLowerCase() === mercadoria.toLowerCase() || mercadoria.toLowerCase().includes(opt.value.toLowerCase())) {
                selectMerc.value = opt.value;
                break;
            }
        }
    }

    if (retorno) {
        const selectRetorno = document.getElementById('p-troca');
        selectRetorno.value = retorno.toUpperCase().includes('SIM') ? 'SIM' : 'NÃO';
    }

    if (prioridade) {
        const selectPrioridade = document.getElementById('p-prioridade');
        const pTexto = prioridade.toLowerCase();
        if (pTexto.includes('urgente') || pTexto.includes('7')) selectPrioridade.value = "7";
        else if (pTexto.includes('agendado') || pTexto.includes('10')) selectPrioridade.value = "10";
        else selectPrioridade.value = "0";
    }

    // 4. Processamento Dinâmico Avançado de Linhas de Rotas (Captura múltiplos formatos de quebra de linha)
    const container = document.getElementById('container-linhas-rotas');
    if (container) {
        container.innerHTML = ''; // Limpa o estado anterior para reconstruir
        contadorRotas = 0;

        // Regex resiliente a variações de espaços e quebras de linha internas da mensagem
        const regexRotas = /\d+\.\s*\(\s*De:\s*([^,\n\r]+)(?:,\s*|\s*\n?\s*)Para:\s*([^)\n\r]+)\)/gi;
        let match;
        let rotasEncontradas = [];

        while ((match = regexRotas.exec(textoChat)) !== null) {
            rotasEncontradas.push({
                origem: match[1].trim(),
                destino: match[2].trim()
            });
        }

        // Se encontrou as rotas estruturadas popula o container, se não, cria um campo limpo padrão
        if (rotasEncontradas.length > 0) {
            rotasEncontradas.forEach(r => adicionarNovaRotaManual(r.origem, r.destino));
        } else {
            adicionarNovaRotaManual('', '');
        }
    }

    // Puxa do estado global do chat a quilometragem se ela já tiver sido calculada via mapa
    if (window.chatState && window.chatState.distanciaCalculadaMapa) {
        document.getElementById('p-distancia').value = window.chatState.distanciaCalculadaMapa;
    }

    // Executa imediatamente o cálculo matemático atualizado
    calcularTudo();
}

/**
 * Executa o cálculo matemático baseado nas condições comerciais com validação preventiva
 */
function calcularTudo() {
    const viewValorFinal = document.getElementById('view-valor-final');
    const lblTipoValor = document.getElementById('lbl-tipo-valor');
    const distInput = document.getElementById('p-distancia');

    // Validação preliminar leve para o cálculo em tempo real
    if (distInput && parseFloat(distInput.value) < 0) {
        distInput.classList.add('is-invalid');
        return;
    } else if (distInput) {
        distInput.classList.remove('is-invalid');
    }

    const taxaCancelamento = parseFloat(document.getElementById('p-taxa-cancelamento')?.value) || 0;

    // REGRA DE CANCELAMENTO PRIORITÁRIA: Anula rotas/KMs e fixa o valor selecionado
    if (taxaCancelamento > 0) {
        if (lblTipoValor) lblTipoValor.innerText = "VALOR CANCELAMENTO";
        if (viewValorFinal) {
            viewValorFinal.innerText = taxaCancelamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        return;
    }

    if (lblTipoValor) lblTipoValor.innerText = "VALOR FINAL";

    const distancia = parseFloat(distInput?.value) || 0;
    const valorKm = parseFloat(document.getElementById('p-valor-km')?.value) || 2.20;
    const retornoSelecionado = document.getElementById('p-troca')?.value || 'NÃO';
    const taxaLocalidade = parseFloat(document.getElementById('p-localidade')?.value) || 0;
    const taxaPrioridade = parseFloat(document.getElementById('p-prioridade')?.value) || 0;

    // Fórmula Base: KM * Preço por KM
    let calculoBaseKm = distancia * valorKm;

    // Acréscimo de 60% calculado estritamente sobre a Taxa de Localidade
    let acrescimoRetorno = 0;
    if (retornoSelecionado === 'SIM') {
        acrescimoRetorno = taxaLocalidade * 0.60;
    }

    const valorFinal = calculoBaseKm + taxaLocalidade + acrescimoRetorno + taxaPrioridade;

    if (viewValorFinal) {
        viewValorFinal.innerText = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
}

/**
 * Adiciona uma nova linha de rota na UI com visual limpo (Fundo Cinza / Clean)
 */
function adicionarNovaRotaManual(origem = '', destino = '') {
    contadorRotas++;
    const container = document.getElementById('container-linhas-rotas');
    if (!container) return;
    
    const novaLinhaHTML = `
        <div class="col-12 rota-item mt-1" id="rota-grupo-${contadorRotas}">
            <div class="row g-2 align-items-center">
                <div class="col">
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-light text-muted fw-bold index-rota">${contadorRotas}</span>
                        <input type="text" class="form-control p-origem-dinamico validate" placeholder="De: Origem" value="${origem}">
                        <input type="text" class="form-control p-destino-dinamico validate" placeholder="Para: Destino" value="${destino}">
                    </div>
                </div>
                <div class="col-auto d-flex gap-1">
                    <button type="button" class="btn btn-sm btn-light border btn-add-rota text-secondary" onclick="adicionarNovaRotaManual()" title="Adicionar Rota"><i class="bi bi-plus-lg"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-remover-rota" onclick="removerEstaRota(${contadorRotas})" title="Remover Rota"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', novaLinhaHTML);
    atualizarComponentesInterfaceRotas();
}

function removerEstaRota(id) {
    const linha = document.getElementById(`rota-grupo-${id}`);
    if (linha) {
        linha.remove();
        reordenarEIndices();
    }
}

function reordenarEIndices() {
    const itens = document.querySelectorAll('#container-linhas-rotas .rota-item');
    contadorRotas = 0;
    
    itens.forEach((item) => {
        contadorRotas++;
        item.id = `rota-grupo-${contadorRotas}`;
        const badge = item.querySelector('.index-rota');
        const btnRemover = item.querySelector('.btn-remover-rota');
        
        if (badge) badge.innerText = contadorRotas;
        if (btnRemover) btnRemover.setAttribute('onclick', `removerEstaRota(${contadorRotas})`);
    });
    atualizarComponentesInterfaceRotas();
    calcularTudo();
}

function atualizarComponentesInterfaceRotas() {
    const botoesRemover = document.querySelectorAll('.btn-remover-rota');
    if (botoesRemover.length <= 1) {
        botoesRemover.forEach(btn => btn.classList.add('d-none'));
    } else {
        botoesRemover.forEach(btn => btn.classList.remove('d-none'));
    }
}

function obterCadeiaFormatadaRotas() {
    const itens = document.querySelectorAll('#container-linhas-rotas .rota-item');
    let listaFormatada = [];

    itens.forEach((item, index) => {
        const inputOrigem = item.querySelector('.p-origem-dinamico');
        const inputDestino = item.querySelector('.p-destino-dinamico');
        const origemVal = inputOrigem ? inputOrigem.value.trim() : '';
        const destinoVal = inputDestino ? inputDestino.value.trim() : '';
        
        if (origemVal || destinoVal) {
            listaFormatada.push(`(${index + 1}. De: ${origemVal || 'Não Informado'}, Para: ${destinoVal || 'Não Informado'})`);
        }
    });

    return listaFormatada.join(' | ');
}

/**
 * Realiza a validação rigorosa de todos os campos obrigatórios e de cálculo antes de salvar
 */
function validarFormularioCompleto() {
    let camposValidos = true;
    
    const solicitante = document.getElementById('p-solicitante');
    const mercadoria = document.getElementById('p-mercadoria-input');
    const distancia = document.getElementById('p-distancia');

    if (!solicitante || !solicitante.value.trim()) {
        solicitante.classList.add('is-invalid');
        camposValidos = false;
    } else {
        solicitante.classList.remove('is-invalid');
    }

    if (!mercadoria || !mercadoria.value) {
        mercadoria.classList.add('is-invalid');
        camposValidos = false;
    } else {
        mercadoria.classList.remove('is-invalid');
    }

    const taxaCancelamento = parseFloat(document.getElementById('p-taxa-cancelamento')?.value) || 0;
    if (taxaCancelamento === 0) {
        if (!distancia || !distancia.value || parseFloat(distancia.value) <= 0) {
            distancia.classList.add('is-invalid');
            camposValidos = false;
        } else {
            distancia.classList.remove('is-invalid');
        }
    }

    const inputsOrigem = document.querySelectorAll('.p-origem-dinamico');
    const inputsDestino = document.querySelectorAll('.p-destino-dinamico');

    inputsOrigem.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            camposValidos = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });

    inputsDestino.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            camposValidos = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });

    return camposValidos;
}

/**
 * Envia os dados higienizados para o banco após aprovação nas validações estruturais
 */
async function salvarPedidoAPI() {
    if (!validarFormularioCompleto()) {
        Swal.fire('Formulário Incompleto', 'Por favor, preencha todos os campos obrigatórios destacados em vermelho antes de prosseguir.', 'warning');
        return;
    }

    const btnFinalizar = document.getElementById('btn-finalizar-checkout');
    
    if (!window.chatState) {
        window.chatState = { jidSelecionado: "0", rawLastMessage: "Solicitação via formulário", mensagens: [] };
    }

    let valorTotal = 0.00;
    const viewValorEl = document.getElementById('view-valor-final');
    if (viewValorEl) {
        const limpo = viewValorEl.innerText.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
        valorTotal = parseFloat(limpo) || 0.00;
    }

    const stringMultiRotas = obterCadeiaFormatadaRotas();

    const dadosPedido = {
        data_solicitacao: new Date().toISOString().slice(0, 19).replace('T', ' '),
        id_cliente: window.chatState.jidSelecionado || "0",
        id_colaborador: null, 
        origem: stringMultiRotas,
        destino: stringMultiRotas,
        solicitacao: window.chatState.rawLastMessage || 'Envio de checkout manual',
        solicitante: document.getElementById('p-solicitante').value,
        horario_estimado_coleta: document.getElementById('p-horario-manual').value || '00:00',
        mercadoria: document.getElementById('p-mercadoria-input').value,
        km_distancia: document.getElementById('p-distancia').value || '0',
        tempo_estimado: document.getElementById('p-tempo').value || 'Não informado',
        taxa_retorno: document.getElementById('p-troca').value || 'NÃO',
        taxa_localidade_dinamico: document.getElementById('p-localidade').options[document.getElementById('p-localidade').selectedIndex].text,
        taxa_cancelamento: document.getElementById('p-taxa-cancelamento').options[document.getElementById('p-taxa-cancelamento').selectedIndex].text,
        prioridade: document.getElementById('p-prioridade').options[document.getElementById('p-prioridade').selectedIndex].text,
        observacao: document.getElementById('p-obs').value || 'Sem observações',
        valor_total_pedido: valorTotal,
        valor_repasse_colaborador: (valorTotal * 0.7)
    };

    try {
        if (btnFinalizar) {
            btnFinalizar.disabled = true;
            const btnText = btnFinalizar.querySelector('.btn-text');
            if (btnText) btnText.innerText = 'SALVANDO...';
        }

        const response = await API.call('createpedido', dadosPedido);

        if (response) {
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
                if (typeof navegarPara === 'function') navegarPara('pedidos');
                else window.location.reload();
            }, 1800);
        }
    } catch (error) {
        console.error('❌ Erro no envio:', error);
        Swal.fire('Erro Operacional', 'Problema ao salvar pedido.', 'error');
    } finally {
        if (btnFinalizar) {
            btnFinalizar.disabled = false;
            const btnText = btnFinalizar.querySelector('.btn-text');
            if (btnText) btnText.innerText = 'FINALIZAR';
        }
    }
}

console.log('✅ Módulo Avançado RDO Express Atualizado e Pronto.');