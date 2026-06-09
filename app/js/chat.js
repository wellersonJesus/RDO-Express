window.AppRDO = window.AppRDO || {
    debounceTimer: null,
    listaCarregada: false,
    isFetching: false,
    isProcessingCheckout: false
};

window.iniciarChat = async () => await window.carregarDados();

window.dadosPedidoAtual = window.dadosPedidoAtual || {};

window.filtrarContatos = function () {
    clearTimeout(window.AppRDO.debounceTimer);
    window.AppRDO.debounceTimer = setTimeout(() => {
        const termo = document.getElementById('chat-search')?.value.toLowerCase().trim() || '';

        // Ajuste: Busca pelo seletor correto dos seus itens de lista
        document.querySelectorAll('.contact-item-clean').forEach(item => {
            // Garante que pegamos o texto do nome dentro do elemento
            const nomeElemento = item.querySelector('.contact-name');
            const nome = nomeElemento ? nomeElemento.innerText.toLowerCase() : '';

            // Aplica display flex ou none
            item.style.setProperty('display', nome.includes(termo) ? 'flex' : 'none', 'important');
        });
    }, 300);
};

document.addEventListener('input', (e) => {
    if (e.target?.id === 'p-contato') {
        let val = e.target.value.replace(/\D/g, '');
        e.target.value = typeof window.formatarTelefone === 'function' ? window.formatarTelefone(val) : val;
    }
    if (e.target?.id === 'chat-search') window.filtrarContatos();
});

document.addEventListener('change', (e) => {
    // 3. Cálculo de formulário (agora com segurança de escopo)
    if (e.target && e.target.closest('#modalFormulario')) {
        if (typeof window.calcularTudo === 'function') {
            window.calcularTudo();
        }
    }
});

document.addEventListener('click', function (e) {
    // Verifica se o clique foi no ícone de sync ou no pai dele
    if (e.target.closest('#sync-icon-chat')) {
        const syncIcon = document.getElementById('sync-icon-chat');
        if (syncIcon && !window.AppRDO.isFetching) {
            console.log("Sincronização manual iniciada...");
            syncIcon.classList.add('spinner-rotate');

            // Chama a função global
            window.carregarDados().finally(() => {
                syncIcon.classList.remove('spinner-rotate');
            });
        }
    }
});

window.carregarDados = async function () {
    // 1. Definição de elementos e proteção de acesso
    const listEl = document.getElementById('lista-contatos-chat');
    const iconHeader = document.getElementById('sync-icon-header');
    const iconSearch = document.getElementById('sync-icon-search');
    const btnSearch = document.getElementById('btn-sync-search');
    const searchInput = document.getElementById('chat-search');

    if (!listEl) return;
    if (window.AppRDO.isFetching) return;

    window.AppRDO.isFetching = true;

    // 2. Feedback visual de carregamento
    if (iconHeader) iconHeader.classList.add('spinner-rotate');
    if (iconSearch) iconSearch.classList.add('spinner-rotate');
    if (btnSearch) btnSearch.style.opacity = '0.5'; // Visual de "em processamento"
    if (searchInput) searchInput.placeholder = "Sincronizando...";

    try {
        // 3. Chamadas paralelas para otimizar o tempo de carga
        const [clientes, mensagens, pedidos] = await Promise.all([
            API.call('getclientes'),
            API.call('getchat'),
            API.call('getpedidos')
        ]);

        const listaClientes = Array.isArray(clientes) ? clientes : [];
        const listaMensagens = Array.isArray(mensagens) ? mensagens : [];
        const listaPedidos = Array.isArray(pedidos) ? pedidos : [];

        const isMasterOn = localStorage.getItem('bot_master_active') === 'true';

        // 4. Renderização
        window.renderizarLista(listaClientes, isMasterOn);
        window.renderizarMensagens(listaMensagens, listaPedidos);

        window.AppRDO.listaCarregada = true;
        if (searchInput) searchInput.placeholder = "Buscar cliente...";

    } catch (e) {
        console.error("Erro crítico na sincronização:", e);
        listEl.innerHTML = `<div class="p-3 text-center text-danger small">
                                <i class="bi bi-exclamation-triangle"></i> Erro ao carregar dados.
                            </div>`;
    } finally {
        // 5. Finalização (Retorno dos estados visuais)
        window.AppRDO.isFetching = false;

        if (iconHeader) iconHeader.classList.remove('spinner-rotate');
        if (iconSearch) iconSearch.classList.remove('spinner-rotate');
        if (btnSearch) btnSearch.style.opacity = '1';
    }
};

window.carregarHistoricoMensagens = async function (clienteId) {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = ''; // Limpa o chat atual

    try {
        // Busca as mensagens/pedidos gravados no banco para este cliente
        const historico = await API.call('gethistorico', { id_chat: clienteId });

        if (Array.isArray(historico)) {
            historico.forEach(pedido => {
                // Aqui você renderiza cada pedido que veio do banco
                // A função já trata a formatação do ID em vermelho
                window.enviarMensagemParaChat(pedido.mensagem, false, pedido.id);
            });
        }
    } catch (e) {
        console.error("Erro ao carregar histórico:", e);
    }
};

window.selecionarEAbrir = function (id, nome, isOnline) {
    window.AppRDO.clienteId = id;
    window.AppRDO.clienteSelecionado = nome;
    window.abrirConversa(id, nome, null, isOnline);
};

/**
 * Função centralizada para processar a mudança de status.
 * @param {string} status - O status do pedido (EM_ROTA, CONCLUIDO, CANCELADO).
 * @param {Object} extra - Dados adicionais (motoboyId, motoboyNome).
 */
window.confirmarStatusFinal = async function (status, extra = {}) {
    const pedidoId = window.AppRDO.pedidoEmEdicao;
    if (!pedidoId) return;

    // Lógica de formatação do status para o banco
    const statusFormatado = extra.motoboyNome 
        ? `${extra.motoboyNome}/${status}` 
        : status;

    try {
        // Chamada única para a API
        const resposta = await API.call('updatepedido', {
            id: pedidoId,
            status: statusFormatado,
            motoboy: extra.motoboyNome || ""
        });

        if (resposta?.status === 'success') {
            // Atualização visual no DOM
            const msgEl = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
            const iconEl = msgEl?.querySelector('.status-icon');

            if (iconEl) {
                const configs = {
                    'EM_ROTA': { icon: 'bi-bicycle', color: '#0d6efd', text: 'Em Rota' },
                    'CONCLUIDO': { icon: 'bi-check-circle-fill', color: '#28a745', text: 'Concluído' },
                    'CANCELADO': { icon: 'bi-x-circle-fill', color: '#dc3545', text: 'Cancelado' }
                };

                const conf = configs[status];
                iconEl.innerHTML = `<i class="bi ${conf.icon}"></i>`;
                iconEl.style.setProperty('color', conf.color, 'important');
                iconEl.title = extra.motoboyNome ? `${conf.text}: ${extra.motoboyNome}` : conf.text;
            }
        }
    } catch (e) {
        console.error("Erro ao atualizar status:", e);
        window.exibirModalAviso("Erro ao salvar status: " + e.message);
    } finally {
        // Fecha o modal e reseta o estado
        const modalEl = document.getElementById('modalStatus');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        document.getElementById('box-botoes-status')?.classList.remove('d-none');
        document.getElementById('box-selecao-motoboy')?.classList.add('d-none');
        window.AppRDO.pedidoEmEdicao = null;
    }
};

window.selecionarStatus = async function (status) {
    if (status === 'EM_ROTA') {
        const boxBotoes = document.getElementById('box-botoes-status');
        const boxMotoboy = document.getElementById('box-selecao-motoboy');

        // Alterna interface para seleção de motoboy
        boxBotoes?.classList.add('d-none');
        boxMotoboy?.classList.remove('d-none');

        try {
            const todos = await API.call('getcolaboradores').catch(() => []);
            const motoboys = (Array.isArray(todos) ? todos : []).filter(c => 
                String(c.colaborador || '').toUpperCase().includes('MOTOBOY') && 
                String(c.status || '').toUpperCase() === 'TRUE'
            );

            const select = document.getElementById('select-motoboy');
            if (select) {
                select.innerHTML = motoboys.length > 0 
                    ? motoboys.map(m => `<option value="${m.id}">${m.username}</option>`).join('')
                    : '<option value="">Nenhum motoboy disponível</option>';
            }
        } catch (e) {
            console.error("Erro ao carregar motoboys:", e);
        }
    } else {
        // Status direto (CONCLUIDO/CANCELADO)
        window.confirmarStatusFinal(status);
    }
};

window.confirmarStatusComMotoboy = async function () {
    const btn = document.getElementById('btn-confirmar-motoboy');
    const select = document.getElementById('select-motoboy');

    if (!select.value) {
        window.exibirModalAviso("Por favor, selecione um motoboy.");
        return;
    }

    // 1. Estados de Loading
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="bi bi-arrow-repeat spinner-rotate me-2"></i>Salvando...`;

    // 2. Executa a gravação
    const motoboyId = select.value;
    const motoboyNome = select.options[select.selectedIndex].text;

    try {
        await window.confirmarStatusFinal('EM_ROTA', { motoboyId, motoboyNome });
    } catch (e) {
        // Se der erro, volta o botão ao estado normal
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
};

window.processarStatus = async function(status) {
    // 1. Efeito de Loading em todos os botões do modal
    const modalBody = document.getElementById('box-botoes-status');
    const botoes = modalBody.querySelectorAll('button');
    
    botoes.forEach(btn => {
        btn.disabled = true;
        if(btn.innerText.includes(status.replace('_', ' '))) {
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Processando...`;
        }
    });

    // 2. Se for 'EM_ROTA', abre a seleção de motoboy (mantendo a lógica anterior)
    if (status === 'EM_ROTA') {
        window.selecionarStatus('EM_ROTA');
        // Reseta os botões para não travar se o usuário voltar
        botoes.forEach(b => { b.disabled = false; b.innerHTML = b.innerHTML.replace(/<span.*span>/, ''); });
        return;
    }

    // 3. Se for CONCLUIDO ou CANCELADO, salva direto
    await window.confirmarStatusFinal(status);
};

window.abrirConversa = async function (id, nome, urlImagem, isOnline) {
    const container = document.getElementById('chat-messages-container');
    const idLimpo = String(id).replace(/\D/g, '');

    const nameEl = document.getElementById('chat-header-name');
    if (nameEl) {
        nameEl.innerText = nome;
        nameEl.className = 'text-dark fw-bold';
    }

    // ESTADO: BUSCANDO - Usando o padrão de lupa giratória
    container.innerHTML = `
        <div class="chat-status-container">
            <i class="bi bi-search icon-status-large spinner-rotate"></i>
            <div class="status-label-gray" style="margin-top: 10px;">Buscando mensagens...</div>
        </div>
    `;

    try {
        const todasMensagens = await API.call('getchat');
        if (!todasMensagens) throw new Error("Falha ao obter dados");

        const historico = (Array.isArray(todasMensagens) ? todasMensagens : []).filter(m =>
            String(m.jid_numero || "").trim() === idLimpo
        );

        container.innerHTML = ''; // Limpa o estado de loading

        if (historico.length === 0) {
            // ESTADO: VAZIO - Usando o ícone Bootstrap Premium
            container.innerHTML = `
                <div class="chat-status-container">
                    <i class="bi bi-bootstrap-reboot icon-status-large"></i>
                    <div class="status-label-gray" style="margin-top: 10px;">Nenhum histórico encontrado.</div>
                </div>
            `;
        } else {
            historico.forEach(msg => {
                window.enviarMensagemParaChat(msg.texto || "Sem conteúdo", false, msg.pedido_id);
            });
        }
    } catch (e) {
        container.innerHTML = `
            <div class="chat-status-container text-danger">
                <i class="bi bi-exclamation-triangle icon-status-large"></i>
                <div class="status-label-gray" style="margin-top: 10px;">Erro ao carregar histórico.</div>
            </div>
        `;
    }
};

window.abrirModalEdicao = function (msgId) {
    Swal.fire({
        title: 'Gerenciar Pedido #' + (msgId || ''),
        showDenyButton: true,
        showCancelButton: false, // Fechar removido
        confirmButtonText: 'Mensagem Padrão',
        denyButtonText: 'Excluir',
        
        // Estilização Premium: Cinza para Mensagem, Vermelho para Excluir
        customClass: {
            confirmButton: 'btn btn-outline-secondary btn-lg w-100 mb-3', // Cinza
            denyButton: 'btn btn-outline-danger btn-lg w-100',          // Vermelho
            popup: 'p-4'
        },
        buttonsStyling: false,
        // Permite fechar clicando fora da caixa
        allowOutsideClick: true 
    }).then((result) => {
        if (result.isConfirmed) {
            new bootstrap.Modal(document.getElementById('modalMensagemPadrao')).show();
        } else if (result.isDenied) {
            window.excluirPedido(msgId);
        }
    });
};

window.abrirModalStatus = function(pedidoId) {
    if (!pedidoId || pedidoId === 'null' || pedidoId === 'undefined') {
        alert("Pedido inválido.");
        return;
    }
    window.AppRDO.pedidoEmEdicao = pedidoId;
    const modalEl = document.getElementById('modalStatus');
    if (modalEl) {
        new bootstrap.Modal(modalEl).show();
    }
};

window.abrirModalMensagemPadrao = function() {
    const modalEl = document.getElementById('modalMensagemPadrao');
    if (modalEl) {
        new bootstrap.Modal(modalEl).show();
    }
};

window.copiarModelo = function() {
    const texto = document.getElementById('texto-modelo');
    
    // Seleciona e copia o texto
    texto.select();
    document.execCommand('copy');
    
    // Feedback Premium com SweetAlert2 (estilo do seu projeto)
    Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Modelo copiado com sucesso!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: {
            popup: 'rounded-4 shadow' // Borda arredondada premium
        }
    });
};

function formatarTempoHumano(minutosTotais) {
    const mins = Math.ceil(minutosTotais);
    if (mins < 60) {
        return `${mins} min`;
    }
    const horas = Math.floor(mins / 60);
    const minsRestantes = mins % 60;

    if (minsRestantes === 0) {
        return `${horas} h`;
    }
    return `${horas} h ${minsRestantes} min`;
}

async function buscarCoordenadasEndereco(enderecoTexto) {
    try {
        // Limpeza agressiva: remove números de lista (1.), pipes, hífen e espaços extras
        let termo = enderecoTexto
            .replace(/^\d+\.\s*/, '') // Remove "1. "
            .replace(/[||\-]/g, ' ')   // Remove pipes ou hifens
            .trim();

        // Adiciona a cidade/estado para melhorar a precisão no Nominatim
        const busca = encodeURIComponent(termo + ", Belo Horizonte, MG");

        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${busca}`;

        const response = await fetch(url);
        const dados = await response.json();

        return (dados && dados.length > 0) ? {
            lat: parseFloat(dados[0].lat),
            lng: parseFloat(dados[0].lon)
        } : null;
    } catch (err) {
        console.error("Erro na geocodificação:", err);
        return null;
    }
}

window.renderizarMapaUnificado = function () {
    const container = document.getElementById('container-mapa-visual');
    if (!container || !window.dadosPedidoAtual?.coordenadas) return;

    if (window.mapaInstancia) { window.mapaInstancia.remove(); window.mapaInstancia = null; }

    const trajetos = window.dadosPedidoAtual.coordenadas;
    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    window.mapaInstancia = L.map('container-mapa-visual').setView(trajetos[0][0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.mapaInstancia);

    const criarIcone = (html) => L.divIcon({
        html: `<div style="font-size: 18px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">${html}</div>`,
        className: 'custom-div-icon',
        iconSize: [25, 25]
    });

    trajetos.forEach((caminho, index) => {
        const cor = cores[index % cores.length];

        // 1. Desenha o trajeto real
        L.polyline(caminho, {
            color: cor,
            weight: 5,
            dashArray: '8, 8',
            opacity: 0.9
        }).addTo(window.mapaInstancia);

        // 2. Lógica de Ícones Inteligente para evitar sobreposição
        // Se for o primeiro trajeto, coloca Bandeira no início
        if (index === 0) {
            L.marker(caminho[0], { icon: criarIcone('🏁') }).addTo(window.mapaInstancia);
        }

        // Se for o último trajeto, coloca o marcador FINAL
        if (index === trajetos.length - 1) {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('📍') }).addTo(window.mapaInstancia);
        } else {
            // Pontos de parada intermediários (onde acaba um e começa o outro)
            // Deslocamos levemente o ícone ou usamos um marcador de conexão para não esconder a bandeira
            L.marker(caminho[caminho.length - 1], {
                icon: criarIcone('🔄') // Ícone de transição/parada intermediária
            }).addTo(window.mapaInstancia);
        }
    });

    const todosPontos = trajetos.flat();
    window.mapaInstancia.fitBounds(todosPontos, { padding: [50, 50] });
};

window.renderizarLista = function (lista, isMasterOn) {
    const listEl = document.getElementById('lista-contatos-chat');
    if (lista.length === 0) {
        listEl.innerHTML = '<div class="p-3 text-center text-muted small">Nenhum contato disponível.</div>';
        return;
    }

    listEl.innerHTML = lista.map(cliente => {
        const id = String(cliente.id || '');
        const nome = (cliente.nome || cliente.username || 'Sem nome');
        const imagem = cliente.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        const isOnline = isMasterOn && String(cliente.status || '').toUpperCase() === 'TRUE';
        const statusColor = isOnline ? '#28a745' : '#adb5bd';

        return `
            <div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean" 
                 id="item-contato-${id}"
                 onclick="window.selecionarEAbrir('${id}', '${nome.replace(/'/g, "\\'")}', ${isOnline})">
                <div class="position-relative">
                    <img src="${imagem}" class="rounded-circle" style="width:32px; height:32px; object-fit:cover;">
                    <span class="position-absolute bottom-0 end-0 rounded-circle border border-white" 
                          style="width:8px; height:8px; background-color: ${statusColor};"></span>
                </div>
                <div class="ms-2 overflow-hidden text-truncate">
                    <div class="contact-name">${nome}</div>
                    <div class="small text-muted" style="font-size: 0.7rem;">${isOnline ? 'Online' : 'Offline'}</div>
                </div>
            </div>
        `;
    }).join('');
};

window.renderizarMensagens = function (mensagens, pedidos) {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = '';

    mensagens.forEach(msg => {
        // Encontra o pedido correspondente ao ID desta mensagem
        const pedido = pedidos.find(p => String(p.id).trim() === String(msg.pedido_id).trim());
        const statusDoBanco = pedido ? pedido.status : null;

        const div = document.createElement('div');
        div.className = 'message-wrapper';

        // Define se já tem um status para saber se mostra o ícone de pendente ou o de ação
        const temStatus = statusDoBanco && statusDoBanco !== "Aguardando";

        div.innerHTML = `
            <div class="message-sent" data-pedido-id="${msg.pedido_id}" onclick="window.abrirModalEdicao('${msg.pedido_id}')">
                 <div class="message-body">${msg.texto.replace(/\n/g, '<br>')}</div>
                 
                 <div class="status-icon ${temStatus ? 'status-updated' : 'status-pending'}" 
                      onclick="event.stopPropagation(); window.abrirModalStatus('${msg.pedido_id}')" 
                      title="${statusDoBanco || 'Aguardando Motoboy'}">
                      ${temStatus ? window.getIconePorStatus(statusDoBanco) : '<i class="bi bi-arrow-repeat spinner-rotate"></i>'}
                 </div>
            </div>
        `;
        container.appendChild(div);
    });
};

window.getIconePorStatus = function (status) {
    const s = String(status).toUpperCase();
    if (s.includes('EM_ROTA') || s.includes('/')) return '<i class="bi bi-motorcycle" style="color: #dc3545;"></i>';
    if (s.includes('CONCLUIDO')) return '<i class="bi bi-check-circle-fill" style="color: #28a745;"></i>';
    if (s.includes('CANCELADO')) return '<i class="bi bi-x-circle-fill" style="color: #dc3545;"></i>';
    return '<i class="bi bi-arrow-repeat"></i>';
};

window.renderizarFooterResumo = function (el) {
    if (!el) return;

    // Usa dados do estado global
    const d = window.dadosPedidoAtual || {};

    // HTML limpo garantindo ícones
    el.innerHTML = `
        <span class="me-3"><i class="bi bi-clock-fill"></i> ${d.tempo || '--'}</span>
        <span class="me-3"><i class="bi bi-geo-alt-fill"></i> ${d.distancia || '0'} km</span>
        <span class="fw-bold"><i class="bi bi-wallet2"></i> ${d.valor || 'R$ 0,00'}</span>
    `;
};

window.exibirErro = function (erro, contexto = "Erro desconhecido") {
    console.error(`[${contexto}]:`, erro);

    // Identifica o container de mensagens
    const container = document.getElementById('chat-messages-container');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger m-3 rounded-4 shadow-sm">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Ops!</strong> Algo deu errado ao ${contexto}.
                <br><small class="text-secondary">${erro.message || erro}</small>
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-danger" onclick="window.carregarDados()">Tentar Novamente</button>
                </div>
            </div>
        `;
    } else {
        // Fallback caso o chat não esteja visível
        window.exibirModalAviso(`Falha ao ${contexto}: ${erro.message || erro}`);
    }
};

window.exibirErroNoModal = function (mensagem) {
    const container = document.getElementById('form-error-container');
    const texto = document.getElementById('form-error-text');

    texto.innerText = mensagem; // Define a mensagem
    container.classList.remove('d-none'); // Exibe o container

    // Oculta após 4 segundos automaticamente
    setTimeout(() => container.classList.add('d-none'), 4000);
};

window.analisarMensagemEntrada = function (texto) {
    // Expressões regulares flexíveis para encontrar os dados
    const regexSolicitante = /SOLICITANTE:\s*(.*)/i;
    const regexKM = /(?:KM|DISTÂNCIA):\s*(\d+)/i;
    const regexRota = /ROTA:\s*([\s\S]*?)(?=(?:$|TROCA|RETORNO|OBSERVAÇÃO|PRIORIDADE))/i;

    const solicitante = texto.match(regexSolicitante)?.[1]?.trim();
    const km = texto.match(regexKM)?.[1];
    const rota = texto.match(regexRota)?.[1]?.trim();

    // Validação: Só prossegue se os 3 campos existirem
    if (solicitante && km && rota) {
        return { solicitante, km, rota, valido: true };
    }

    return { valido: false };
};

window.iniciarFluxoCheckout = async function () {
    const msgInput = document.getElementById('msg-input');
    const texto = msgInput?.value?.trim();

    if (!texto) {
        window.exibirModalAviso("Por favor, digite os dados do pedido.");
        return;
    }

    // Processamento dos dados
    const solicitante = (texto.match(/(?:SOLICITANTE|NOME|CLIENTE):\s*(.*)/i)?.[1] || "Não informado").trim();
    const contato = (texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE):\s*([\d\s\-\(\)]+)/i)?.[1] || "").trim();
    const linhasRota = texto.split('\n').filter(l => /de:/i.test(l) && /para:/i.test(l));

    if (linhasRota.length === 0) {
        window.exibirModalAviso("Formato de rota inválido. Use 'De: X Para: Y'.");
        return;
    }

    // Carrega o modal do mapa
    await window.loadModal('modal_mapa.html');
    const modalEl = document.getElementById('modalMapa');
    const modal = new bootstrap.Modal(modalEl);

    // Adiciona evento ONCE para rodar apenas quando o modal abrir
    modalEl.addEventListener('shown.bs.modal', async () => {
        const elSolicitante = document.getElementById('header-nome-solicitante');
        const resumoEl = document.getElementById('resumo-total');
        if (elSolicitante) elSolicitante.innerText = solicitante;
        if (resumoEl) resumoEl.innerHTML = 'Calculando rotas...';

        try {
            let kmTotal = 0, minTotal = 0, listaCaminhos = [];

            for (const linha of linhasRota) {
                const p = linha.split(/Para:|\|/gi).map(x => x.replace(/De:/gi, '').trim());
                if (p.length >= 2) {
                    const p1 = await buscarCoordenadasEndereco(p[0]);
                    const p2 = await buscarCoordenadasEndereco(p[1]);
                    if (p1 && p2) {
                        const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=full&geometries=geojson`;
                        const resp = await fetch(url);
                        const data = await resp.json();
                        if (data.routes?.[0]) {
                            kmTotal += (data.routes[0].distance / 1000);
                            minTotal += (data.routes[0].duration / 60);
                            listaCaminhos.push(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
                        }
                    }
                }
            }

            // ATUALIZAÇÃO DO ESTADO GLOBAL (Para ser lido pelo formulário depois)
            window.dadosPedidoAtual = {
                solicitante, contato,
                cliente: window.AppRDO.clienteSelecionado,
                distancia: Math.round(kmTotal).toString(),
                tempo: formatarTempoHumano(minTotal),
                coordenadas: listaCaminhos,
                valor: (Math.round(kmTotal) * 3.00).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                rawInput: texto // Salva o input original aqui
            };

            window.renderizarFooterResumo(resumoEl);
            window.renderizarMapaUnificado();
        } catch (err) {
            if (resumoEl) resumoEl.innerHTML = `<span class="text-danger">Erro: ${err.message}</span>`;
        }
    }, { once: true });

    modal.show();
};

window.iniciarSalvamento = async function (status) {
    // Caso seja "EM_ROTA", tratamos a lista de motoboys
    if (status === 'EM_ROTA') {
        const boxBotoes = document.getElementById('box-botoes-status');
        const boxMotoboy = document.getElementById('box-selecao-motoboy');
        const select = document.getElementById('select-motoboy');

        if (boxBotoes) boxBotoes.classList.add('d-none');
        if (boxMotoboy) boxMotoboy.classList.remove('d-none');

        // Busca e filtra usando a lógica flexível de "Motoboy" no cargo
        const todos = await API.call('getcolaboradores').catch(() => []);
        const motoboys = (Array.isArray(todos) ? todos : []).filter(c =>
            String(c.colaborador || '').toUpperCase().includes('MOTOBOY') &&
            String(c.status || '').toUpperCase() === 'TRUE'
        );

        if (select) {
            if (motoboys.length > 0) {
                select.innerHTML = motoboys.map(m =>
                    `<option value="${m.id}">${m.username}</option>`
                ).join('');
            } else {
                select.innerHTML = '<option value="">Nenhum motoboy ativo</option>';
            }
        }
        return; // Para a execução aqui para o usuário escolher o motoboy
    }

    // Se for CONCLUIDO ou CANCELADO, segue o fluxo normal
    const btn = event.currentTarget;
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="bi bi-arrow-repeat spinner-rotate me-2"></i>Salvando...`;

    try {
        await window.confirmarStatusFinal(status);
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
};

window.confirmarStatusComMotoboy = async function () {
    const btn = document.getElementById('btn-confirmar-motoboy');
    const select = document.getElementById('select-motoboy');

    if (!select.value) return window.exibirModalAviso("Selecione um motoboy.");

    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="bi bi-arrow-repeat spinner-rotate me-2"></i>Salvando...`;

    const motoboyId = select.value;
    const motoboyNome = select.options[select.selectedIndex].text;

    try {
        await window.confirmarStatusFinal('EM_ROTA', { motoboyId, motoboyNome });
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
};

async function calcularTrechoIndividual(p1, p2) {
    // URL específica para evitar otimizações estranhas do OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=false&alternatives=false`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.routes && data.routes[0]) {
        return {
            km: data.routes[0].distance / 1000,
            min: data.routes[0].duration / 60
        };
    }
    return null;
}

async function calcularRotaOSRM(p1, p2) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=false`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.routes && data.routes.length > 0) {
            return { km: data.routes[0].distance / 1000, min: data.routes[0].duration / 60 };
        }
        return null;
    } catch (e) { return null; }
}

window.calcularTudo = function () {
    try {
        // Função utilitária: limpa a string, troca vírgula por ponto e garante float
        const parse = (id) => {
            const val = document.getElementById(id)?.value;
            if (!val) return 0;
            // Remove qualquer caractere que não seja dígito, ponto ou vírgula
            const limpo = String(val).replace(',', '.');
            return parseFloat(limpo) || 0;
        };

        const km = parse('p-distancia');
        const valorKm = parse('p-valor-km');
        const taxaDin = parse('p-dinamica');
        const prioridade = parse('p-prioridade');
        const retorno = parse('p-retorno');

        // Cálculo Preciso
        let subtotal = (km * valorKm) + taxaDin + prioridade;
        let total = subtotal + (subtotal * retorno);

        // Formatação Final
        const view = document.getElementById('view-valor-final');
        if (view) {
            view.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    } catch (error) {
        console.error("ERRO NO CÁLCULO:", error.message);
        const view = document.getElementById('view-valor-final');
        if (view) view.innerText = "Erro no cálculo";
    }
};

window.preencherDadosFormulario = function () {
    try {
        const dados = window.dadosPedidoAtual || {};
        const msgInput = document.getElementById('msg-input');
        const texto = msgInput ? msgInput.value : '';

        // 1. Definição do Nome do Cliente (Fonte de Verdade: AppRDO)
        const nomeCliente = window.AppRDO?.clienteSelecionado ||
            document.getElementById('chat-header-name')?.innerText ||
            'Não identificado';

        // Atualiza o header dentro do formulário
        const elHeader = document.getElementById('header-nome-cliente');
        if (elHeader) {
            elHeader.innerText = nomeCliente;
            elHeader.classList.remove('text-muted');
            elHeader.classList.add('text-dark');
        }

        // 2. Mapeamento de campos fixos (Solicitante, Rota, Observação)
        const campos = [
            { id: 'p-solicitante', regex: /(?:SOLICITANTE|NOME):\s*(.*)/i, fallback: nomeCliente },
            { id: 'p-rotas', regex: /ROTA:([\s\S]*?)(?=TROCA|RETORNO|OBSERVAÇÃO|PRIORIDADE|$)/i },
            { id: 'p-obs', regex: /OBSERVAÇÃO:\s*(.*)/i, fallback: 'N/A' }
        ];

        campos.forEach(c => {
            const el = document.getElementById(c.id);
            if (el) {
                const match = texto.match(c.regex);
                el.value = match ? (match[1] ? match[1].trim() : match[0].trim()) : (c.fallback || '');
            }
        });

        // 3. CAPTURA INTELIGENTE E FORÇADA DO TELEFONE
        // Esta Regex busca qualquer formato de número (com ou sem DDD, com ou sem parênteses/hífen)
        const elContato = document.getElementById('p-contato');
        if (elContato) {
            // Busca o padrão: (DDD) 9XXXX-XXXX ou apenas números
            const regexTel = /(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/;
            const matchTel = texto.match(regexTel);

            if (matchTel) {
                // Limpa o que foi capturado, deixando apenas números
                let numLimpo = matchTel[0].replace(/\D/g, '');
                // Aplica a formatação via sua função global
                elContato.value = window.formatarTelefone(numLimpo);
            }
        }

        // 4. Preenchimento de Cálculos (OSRM)
        if (document.getElementById('p-distancia')) document.getElementById('p-distancia').value = dados.distancia || '0';
        if (document.getElementById('p-tempo')) document.getElementById('p-tempo').value = dados.tempo || '0 min';

        // 5. Horário (Hora atual caso esteja vazio)
        const elHorario = document.getElementById('p-horario');
        if (elHorario && !elHorario.value) {
            elHorario.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // 6. Lógica de Valores Dinâmicos (Taxas/Prioridade)
        const elDin = document.getElementById('p-dinamica');
        if (elDin) {
            const taxaMatch = texto.match(/Taxa 0([1-5])/i);
            const valoresTaxa = { '1': '0', '2': '5', '3': '7', '4': '10', '5': '15' };
            elDin.value = taxaMatch ? (valoresTaxa[taxaMatch[1]] || '0') : '0';
        }

        const elPrior = document.getElementById('p-prioridade');
        if (elPrior) {
            if (/Urgente/i.test(texto)) elPrior.value = '7';
            else if (/Agendado/i.test(texto)) elPrior.value = '5';
            else elPrior.value = '0';
        }

        // 7. Recálculo final do valor da corrida
        if (typeof window.calcularTudo === 'function') {
            window.calcularTudo();
        }

    } catch (error) {
        console.error("ERRO CRÍTICO no preenchimento do formulário:", error);
        window.exibirErroRodape?.("Erro ao carregar dados: " + error.message);
    }
};

window.prosseguirParaFormulario = async function () {
    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    modalMapa?.hide();

    await window.loadModal('modal_form.html');
    const modalForm = new bootstrap.Modal(document.getElementById('modalFormulario'));

    document.getElementById('modalFormulario').addEventListener('shown.bs.modal', () => {
        window.preencherDadosFormulario();
        // Dispara o cálculo inicial com os dados carregados
        if (typeof window.calcularTudo === 'function') {
            window.calcularTudo();
        }
    }, { once: true });

    modalForm.show();
};

window.avancarParaFormulario = function () {
    document.getElementById('step-mapa').classList.add('d-none');
    document.getElementById('step-formulario').classList.remove('d-none');

    // Dispara preenchimento do formulário
    if (typeof window.preencherDadosFormulario === 'function') {
        window.preencherDadosFormulario();
    }
};

window.iniciarSelecaoMotoboy = function() {
    const btnRota = document.querySelector('button[onclick="window.iniciarSelecaoMotoboy()"]');
    
    // 1. Efeito de Loading no botão (Visual Premium)
    btnRota.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Carregando...';
    btnRota.disabled = true;

    // Simula um pequeno tempo de resposta para o usuário perceber a ação
    setTimeout(() => {
        // 2. Transição dos boxes
        document.getElementById('box-botoes-status').classList.add('d-none');
        document.getElementById('box-selecao-motoboy').classList.remove('d-none');
        
        // 3. Reset do botão para o estado original (caso o usuário volte)
        btnRota.innerHTML = 'Em Rota';
        btnRota.disabled = false;
    }, 500);
};

window.voltarStatus = function() {
    document.getElementById('box-botoes-status').classList.remove('d-none');
    document.getElementById('box-selecao-motoboy').classList.add('d-none');
};

window.voltarParaChat = function () {
    document.getElementById('step-formulario').classList.add('d-none');
    document.getElementById('step-mapa').classList.add('d-none');
    document.getElementById('step-chat').classList.remove('d-none');
};

window.voltarParaMapa = async function () {
    const modalForm = bootstrap.Modal.getInstance(document.getElementById('modalFormulario'));
    if (modalForm) modalForm.hide();

    await window.loadModal('modal_mapa.html');
    const modalEl = document.getElementById('modalMapa');
    const modalMapa = new bootstrap.Modal(modalEl);

    modalEl.addEventListener('shown.bs.modal', () => {
        // Recupera nome
        const elHeader = document.getElementById('header-nome-solicitante');
        if (elHeader) elHeader.innerText = window.dadosPedidoAtual?.solicitante || 'Cliente';

        // Recupera Rodapé (Isso renderiza os ícones via innerHTML)
        const resumoEl = document.getElementById('resumo-total');
        if (resumoEl) window.renderizarFooterResumo(resumoEl);

        // Recupera Mapa
        window.renderizarMapaUnificado();
    }, { once: true });

    modalMapa.show();
};

window.formatarTelefone = function (tel) {
    if (!tel) return '';
    let val = String(tel).replace(/\D/g, ''); // Remove tudo que não é número

    // Fixo com 8 dígitos (XXXX-XXXX)
    if (val.length === 8) {
        return val.replace(/^(\d{4})(\d{4})$/, '$1-$2');
    }
    // Fixo com 10 dígitos (DDD + 8 dígitos)
    if (val.length === 10) {
        return val.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    // Celular com 11 dígitos (DDD + 9 + 4 + 4)
    if (val.length === 11) {
        return val.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    }
    return val;
};

window.salvarPedidoAPI = async function () {
    const btn = document.getElementById('btn-emitir-pedido');
    // Incluí p-distancia e p-valor-km conforme seu HTML pede obrigatório
    const camposObrigatorios = ['p-solicitante', 'p-mercadoria', 'p-distancia', 'p-rotas', 'p-valor-km'];

    // 1. Validação Visual
    let ehValido = true;
    camposObrigatorios.forEach(id => {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) {
            el.classList.add('is-invalid');
            ehValido = false;
        } else {
            el.classList.remove('is-invalid');
        }
    });

    // Se não for válido, interrompe a função silenciosamente
    if (!ehValido) return;

    // 2. Estado de Loading
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Emitindo...`;

    try {
        const getVal = (id) => document.getElementById(id)?.value.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;") || 'N/A';
        const valorFinal = document.getElementById('view-valor-final')?.innerText || 'R$ 0,00';

        const rotasRaw = getVal('p-rotas').split('\n');
        const rotasFormatadas = rotasRaw.map((l, i) => {
            const partes = l.split('|');
            return `📍${i + 1}. De: ${partes[0]?.trim() || ''} | \n      Para: ${partes[1]?.trim() || ''}`;
        }).join('\n');

        const msgModelo = `📦 SOLICITANTE: ${getVal('p-solicitante')}\n\nN.SERVIÇO: [ID_GERADO]\nSOLICITANTE: ${getVal('p-solicitante')} \nCONTATO: ${getVal('p-contato')} | HR: ${getVal('p-horario')}\n-\nMERCADORIA: ${getVal('p-mercadoria')}\nRETORNO: ${getVal('p-retorno') === '0.6' ? 'Sim' : 'Não'}\n-\nROTA(s): \n${rotasFormatadas}\n-\nOBSERVAÇÃO: ${getVal('p-obs')}\n${valorFinal}`;

        const resp = await API.call('finalizarpedido', {
            action: 'finalizarpedido',
            id_chat: String(window.AppRDO.clienteId),
            solicitante: getVal('p-solicitante'),
            mensagem: msgModelo
        });

        if (resp?.status === 'success') {
            const idReal = resp.id || "N/A";
            const idFormatado = `<span style="color: #dc3545; font-weight: bold;">${idReal}</span>`;
            const msgFinal = msgModelo.replace('[ID_GERADO]', idFormatado).replace(/\n/g, '<br>');

            window.enviarMensagemParaChat(msgFinal, false, idReal);
            document.getElementById('msg-input').value = '';
            bootstrap.Modal.getInstance(document.getElementById('modalFormulario'))?.hide();
        } else {
            throw new Error(resp?.message || "Erro ao salvar.");
        }
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = "EMITIR PEDIDO";
    }
};

document.addEventListener('input', (e) => {
    if (e.target.classList.contains('border-danger')) {
        e.target.classList.remove('border', 'border-danger', 'border-2');
    }
});

window.fecharModalStatus = async function () {
    const pedidoId = window.AppRDO.pedidoEmEdicao;
    const novoStatus = window.AppRDO.statusTemporario;

    if (!pedidoId) {
        bootstrap.Modal.getInstance(document.getElementById('modalStatus'))?.hide();
        return;
    }

    try {
        // Se o usuário abriu o modal mas não clicou em um status, não faz nada
        if (novoStatus) {
            const resp = await API.call('atualizarstatus', {
                id: pedidoId,
                status: novoStatus
            });
            console.log("Status atualizado na API:", resp);
        }

        // Atualização Visual (Agora o seletor encontra o atributo data-pedido-id)
        const msgEl = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
        if (msgEl) {
            let badge = msgEl.querySelector('.status-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'status-badge small mt-2 fw-bold text-uppercase';
                msgEl.appendChild(badge);
            }
            // Exibe o status formatado
            badge.innerHTML = `<i class="bi bi-info-circle me-1"></i> ${novoStatus.replace('_', ' ')}`;
        }
    } catch (e) {
        console.error("Erro ao salvar status:", e);
        window.exibirModalAviso("Erro ao salvar status no servidor.");
    } finally {
        window.AppRDO.pedidoEmEdicao = null;
        window.AppRDO.statusTemporario = null;
        bootstrap.Modal.getInstance(document.getElementById('modalStatus'))?.hide();
    }
};

window.enviarMensagemParaChat = function(texto, isRecebida = false, pedidoId = null) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const div = document.createElement('div');
    // Alinhamento padrão: Esquerda (recebida) ou Direita (enviada)
    div.className = `d-flex w-100 ${isRecebida ? 'justify-content-start' : 'justify-content-end'} mb-2`;

    // Visual original: Apenas o texto e o fundo conforme a origem da mensagem
    div.innerHTML = `
        <div class="card ${isRecebida ? 'bg-white' : 'bg-light'} border-0 rounded-4 p-3 shadow-sm" 
             style="max-width: 80%; cursor: pointer;"
             onclick="window.abrirModalEdicao('${pedidoId}')">
             <div class="message-body text-dark">${texto.replace(/\n/g, '<br>')}</div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
};

window.enviarMensagemGeral = async function () {
    const input = document.getElementById('msg-input');

    // Validações
    if (!window.AppRDO?.clienteId) {
        Swal.fire('Atenção', 'Selecione um cliente na lista primeiro.', 'warning');
        return;
    }

    if (!input || !input.value.trim()) {
        Swal.fire('Atenção', 'Digite o pedido antes de enviar.', 'warning');
        return;
    }

    // Dispara o fluxo
    console.log("Iniciando fluxo de checkout para:", window.AppRDO.clienteSelecionado);
    await window.iniciarFluxoCheckout();
};

window.exibirModalAviso = function (mensagem) {
    const elModal = document.getElementById('modalAtencao');
    const elTexto = document.getElementById('modal-atencao-mensagem');

    if (elTexto) {
        elTexto.innerText = mensagem;
    }

    if (elModal) {
        const bsModal = new bootstrap.Modal(elModal);
        bsModal.show();
    } else {
        // Fallback caso o elemento não exista no DOM
        alert(mensagem);
    }
};

function limparBackdrops() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}

window.atualizarStatusPedido = async function (status, extra = {}) {
    const pedidoId = window.AppRDO.pedidoEmEdicao;
    try {
        // Chamada API para persistir a mudança
        await API.call('atualizarstatus', {
            id: pedidoId,
            status: status,
            motoboy_id: extra.motoboyId
        });

        const msgEl = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
        const badgeContainer = msgEl?.querySelector('.status-badge-container');

        if (badgeContainer) {
            // Configuração dos ícones padrão para cada status
            const configs = {
                'EM_ROTA': { icon: 'bi-truck', text: 'Em Rota', class: 'text-primary' },
                'CONCLUIDO': { icon: 'bi-check-circle-fill', text: 'Concluído', class: 'text-success' },
                'CANCELADO': { icon: 'bi-x-circle-fill', text: 'Cancelado', class: 'text-danger' }
            };

            const conf = configs[status];
            const textoFinal = extra.motoboyNome ? `${conf.text}: ${extra.motoboyNome}` : conf.text;

            // Substitui a ampulheta pelo ícone do novo status
            badgeContainer.innerHTML = `
                <span class="${conf.class}" style="font-size: 0.8rem;">
                    <i class="bi ${conf.icon} me-1"></i> ${textoFinal}
                </span>
            `;
        }
    } catch (e) {
        window.exibirModalAviso("Erro ao atualizar status.");
    } finally {
        bootstrap.Modal.getInstance(document.getElementById('modalStatus')).hide();
        // Reset da interface do modal
        document.getElementById('box-botoes-status')?.classList.remove('d-none');
        document.getElementById('box-selecao-motoboy')?.classList.add('d-none');
    }
};

