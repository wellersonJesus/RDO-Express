let debounceTimer;
let clienteSelecionado = null;
let rotasAtuais = []; 

document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'chat-search') {
        window.filtrarContatos();
    }
});

window.filtrarContatos = function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const searchInput = document.getElementById('chat-search');
        const termo = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const listaContatos = document.getElementById('lista-contatos-chat');
        if (!listaContatos) return;

        // Seleciona todos os itens da lista
        const contatos = listaContatos.querySelectorAll('.contact-item-clean');

        contatos.forEach(contato => {
            // Busca o nome dentro do elemento atual
            const nomeEl = contato.querySelector('.contact-name');
            const textoNome = nomeEl ? nomeEl.innerText.toLowerCase() : '';
            
            console.log("Comparando:", textoNome, "com", termo); // DEBUG: verifique se isso aparece no F12

            if (textoNome.includes(termo)) {
                contato.style.setProperty('display', 'flex', 'important');
            } else {
                contato.style.setProperty('display', 'none', 'important');
            }
        });
    }, 300);
};

document.querySelectorAll('#modalFormulario input, #modalFormulario select').forEach(el => {
    el.addEventListener('change', calcularTudo);
});

function criarElementoContato(cliente, isMasterOn) {
    const id = cliente.id || '';
    const nome = (cliente.nome || cliente.username || 'Sem nome').replace(/'/g, "\\'");
    const imagem = cliente.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    
    // Lógica de status
    const statusReal = String(cliente.status || '').toUpperCase() === 'TRUE';
    const isOnline = isMasterOn && statusReal;
    const statusText = isOnline ? 'Online' : 'Offline';
    const statusColor = isOnline ? '#28a745' : '#adb5bd';

    return `
        <div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean" 
             onclick="abrirConversa('${id}', '${nome}', '${imagem}')">
            <div class="position-relative">
                <img src="${imagem}" class="rounded-circle img-avatar-small" style="width:35px; height:35px; object-fit:cover;">
                <span class="position-absolute bottom-0 end-0 rounded-circle border border-white status-dot" 
                      style="background-color: ${statusColor};"></span>
            </div>
            <div class="ms-3 overflow-hidden">
                <div class="contact-name text-truncate">${nome}</div>
                <div class="contact-status small text-muted">${statusText}</div>
            </div>
        </div>
    `;
}

async function carregarDados() {
    const listEl = document.getElementById('lista-contatos-chat');
    const syncIcon = document.getElementById('sync-icon-chat');
    
    if (!listEl) return;
    if (syncIcon) syncIcon.classList.add('spinner-rotate');

    try {
        const clientes = await API.call('getclientes') || [];
        const isMasterOn = localStorage.getItem('bot_master_active') === 'true';

        // Renderiza usando a lógica padronizada
        listEl.innerHTML = clientes.map(cliente => {
            const id = cliente.id || '';
            const nome = (cliente.nome || cliente.username || 'Sem nome').replace(/'/g, "\\'");
            const imagem = cliente.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            
            const isOnline = isMasterOn && String(cliente.status || '').toUpperCase() === 'TRUE';
            const statusText = isOnline ? 'Online' : 'Offline';
            const statusColor = isOnline ? '#28a745' : '#adb5bd';

            return `
                <div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean" 
                     onclick="abrirConversa('${id}', '${nome}', '${imagem}')">
                    <div class="position-relative">
                        <img src="${imagem}" class="rounded-circle" style="width:35px; height:35px; object-fit:cover;">
                        <span class="position-absolute bottom-0 end-0 rounded-circle border border-white" 
                              style="width:10px; height:10px; background-color: ${statusColor};"></span>
                    </div>
                    <div class="ms-3 overflow-hidden">
                        <div class="contact-name fw-bold">${nome}</div>
                        <div class="small text-muted">${statusText}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (e) {
        console.error("Erro ao carregar lista:", e);
    } finally {
        if (syncIcon) syncIcon.classList.remove('spinner-rotate');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
});

function renderizarContatos(listaDeClientes) {
    const container = document.getElementById('lista-contatos-chat');
    container.innerHTML = ''; // Limpa antes de renderizar

    listaDeClientes.forEach(cliente => {
        // Criando o elemento dinamicamente
        const div = document.createElement('div');
        div.className = 'contato-item list-group-item'; // Classe essencial para a pesquisa funcionar
        div.innerText = cliente.nome;
        
        // Adiciona um evento de clique se necessário
        div.onclick = () => carregarConversa(cliente.id);
        
        container.appendChild(div);
    });
}

function renderizarMapaGratuito() {
    const container = document.getElementById('container-mapa-visual');
    if (!container) return;
    
    // Força a limpeza e reinicialização para evitar erros de tamanho
    container.innerHTML = '<div id="map" style="width:100%; height:100%;"></div>';
    
    const map = L.map('map').setView([-19.9167, -43.9345], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    // Solução para o bug do Leaflet em modais: forçar o redimensionamento após abrir
    setTimeout(() => {
        map.invalidateSize();
    }, 500);
}

function renderizarMapaTracejado(latlngs) {
    const container = document.getElementById('container-mapa-visual');
    if (!container) return;

    // Limpa instância anterior do Leaflet se existir
    const mapDiv = L.DomUtil.get('container-mapa-visual');
    if (mapDiv._leaflet_id) mapDiv._leaflet_id = null;

    const map = L.map(container).setView(latlngs[0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    L.polyline(latlngs, {
        color: '#dc3545',
        weight: 6,
        dashArray: '10, 10', // Efeito Tracejado
        lineJoin: 'round'
    }).addTo(map);
}

window.abrirCheckoutDoMapa = async function() {
    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    modalMapa.hide();
    
    await window.loadModal('modal_form.html');
    // Adiciona o botão voltar ao cabeçalho do formulário
    const header = document.querySelector('#modalFormulario .modal-header');
    header.insertAdjacentHTML('afterbegin', `
        <button type="button" class="btn btn-link text-danger p-0 mb-2" onclick="window.voltarParaMapa()">
            <i class="bi bi-arrow-left"></i> Voltar ao Mapa
        </button>
    `);
};

function mostrarPasso(passo) {
    // Esconde todos os steps
    ['chat', 'mapa', 'formulario'].forEach(s => {
        const el = document.getElementById(`step-${s}`);
        if (el) el.classList.add('d-none');
    });
    // Mostra o step selecionado
    const target = document.getElementById(`step-${passo}`);
    if (target) target.classList.remove('d-none');
}

function aoReceberMensagem(texto) {
    // Lógica original de renderização no chat (adicione sua função aqui)
    // renderizarMensagemNoChat(texto); 
    
    // Verifica se a mensagem de pedido foi recebida
    if (texto.includes("SOLICITANTE:") && texto.includes("ROTA:")) {
        console.log("Fluxo de Pedido detectado.");
        mostrarPasso('mapa'); // Transição para o passo de mapa
        
        // Abre o modal de mapa conforme solicitado
        const modalMapa = new bootstrap.Modal(document.getElementById('modalMapa'));
        modalMapa.show();
    }
}

window.prosseguirParaFormulario = async function() {
    // 1. Fecha o modal do Mapa
    const modalMapaEl = document.getElementById('modalMapa');
    const modalMapa = bootstrap.Modal.getInstance(modalMapaEl);
    if (modalMapa) modalMapa.hide();

    // 2. Garante que o Modal do Formulário esteja carregado e abre
    // Nota: Certifique-se de que o modalFormulario já está no DOM
    const modalFormEl = document.getElementById('modalFormulario');
    const modalForm = new bootstrap.Modal(modalFormEl);
    modalForm.show();

    // 3. Aplica os dados persistidos (ex: window.dadosPedidoAtual)
    if (window.dadosPedidoAtual) {
        // Preenche o campo de input
        const inputSolicitante = document.getElementById('p-solicitante');
        if (inputSolicitante) inputSolicitante.value = window.dadosPedidoAtual.solicitante || '';

        // Atualiza o Cabeçalho do Formulário (O novo solicitado)
        const headerNome = document.getElementById('form-nome-solicitante');
        if (headerNome) headerNome.innerText = window.dadosPedidoAtual.solicitante || 'Não informado';

        // Preenche o campo de Rotas com os dados do pedido/mapa
        const inputRotas = document.getElementById('p-rotas');
        if (inputRotas) inputRotas.value = window.dadosPedidoAtual.rotas || '';
    }

    // 4. Executa o cálculo inicial para o valor não ficar R$ 0,00 parado
    calcularTudo();
};

window.abrirConversa = function(id, nome, urlImagem) {
    clienteSelecionado = id;

    // 1. Atualiza o nome
    const nameEl = document.getElementById('chat-header-name');
    nameEl.innerText = nome;

    // 2. Atualiza e exibe a logo
    const logoEl = document.getElementById('chat-header-logo');
    if (urlImagem) {
        logoEl.src = urlImagem;
        logoEl.classList.remove('d-none'); // Remove o d-none para exibir
    } else {
        logoEl.classList.add('d-none'); // Oculta se não tiver imagem
    }

    // 3. Lógica de seleção visual
    const items = document.querySelectorAll('.list-group-item');
    items.forEach(el => el.classList.remove('selected-contact'));
    event.currentTarget.classList.add('selected-contact');
};

window.abrirModalMapaComDados = function(nomeDoChat) {
    // Define o solicitante como o nome vindo do chat
    window.dadosPedidoAtual.solicitante = nomeDoChat;
    
    // Atualiza o display no Modal Mapa
    const headerNome = document.getElementById('header-nome-solicitante');
    if(headerNome) headerNome.innerText = nomeDoChat;
    
    const modalMapa = new bootstrap.Modal(document.getElementById('modalMapa'));
    modalMapa.show();
};

function avancarParaFormulario() {
    mostrarPasso('formulario');
    calcularTudo();
}

function calcularTudo() {
    // 1. Captura dos valores
    const dist = parseFloat(document.getElementById('p-distancia')?.value) || 0;
    const valKm = parseFloat(document.getElementById('p-valor-km')?.value) || 2.20;
    const prioridade = parseFloat(document.getElementById('p-prioridade')?.value) || 0;
    const dinamica = parseFloat(document.getElementById('p-dinamica')?.value) || 0;
    const multRetorno = parseFloat(document.getElementById('p-retorno')?.value) || 0;

    // 2. Cálculo Base (Corrida)
    const baseCorrida = dist * valKm;
    
    // 3. Aplica Taxa de Retorno (60% da base, se selecionado '0.6')
    const valorRetorno = baseCorrida * multRetorno;

    // 4. Somatório Total
    let total = baseCorrida + valorRetorno + prioridade + dinamica;

    // 5. Lógica de Cancelamento (Faixas)
    let taxaCancel = 0;
    if (total > 71) taxaCancel = 20;
    else if (total > 36) taxaCancel = 15;
    else if (total > 0) taxaCancel = 10;
    
    // Adiciona taxa de cancelamento ao total
    total += taxaCancel;

    // 6. Atualiza o display
    document.getElementById('view-valor-final').innerText = total.toLocaleString('pt-BR', { 
        style: 'currency', currency: 'BRL' 
    });
}

window.iniciarFluxoCheckout = async function() {
    const texto = document.getElementById('msg-input').value;
    
    // Extração robusta
    window.dadosPedidoAtual = {
        solicitante: texto.match(/SOLICITANTE:\s*(.*)/i)?.[1]?.trim() || '',
        contato: texto.match(/CONTATO:\s*(.*)/i)?.[1]?.trim() || '',
        horario: texto.match(/HORÁRIO:\s*(.*)/i)?.[1]?.trim() || '',
        distancia: texto.match(/DISTANCIA:\s*(\d+)/i)?.[1]?.trim() || '',
        tempo: texto.match(/TEMPO:\s*(.*)/i)?.[1]?.trim() || '',
        rotas: texto.match(/ROTA:\s*([\s\S]*?)(?=OBSERVAÇÃO|$)/i)?.[1]?.trim() || '',
        obs: texto.match(/OBSERVAÇÃO:\s*(.*)/i)?.[1]?.trim() || ''
    };
    
    // Abre o modal do Mapa
    await window.loadModal('modal_mapa.html');
    const modalMapa = new bootstrap.Modal(document.getElementById('modalMapa'));
    modalMapa.show();
    
    // Renderiza mapa
    setTimeout(renderizarMapaGratuito, 500);
};

window.prosseguirParaFormulario = async function() {
    // 1. Fecha Mapa
    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    if(modalMapa) modalMapa.hide();
    
    // 2. Carrega Formulário
    await window.loadModal('modal_form.html');
    
    // 3. Popula os campos automaticamente
    Object.keys(window.dadosPedidoAtual).forEach(key => {
        const el = document.getElementById(`p-${key}`);
        if (el) el.value = window.dadosPedidoAtual[key];
    });

    // 4. Exibe Formulário e calcula o valor inicial
    const modalForm = new bootstrap.Modal(document.getElementById('modalFormulario'));
    modalForm.show();
    calcularTudo(); // Chama sua função de cálculo atualizada
};

window.salvarPedidoAPI = async function() {
    const btn = document.getElementById('btn-finalizar');
    const txt = document.getElementById('btn-text');
    const spn = document.getElementById('btn-spinner');

    btn.disabled = true;
    txt.innerText = "Processando...";
    spn.classList.remove('d-none');

    // Monta o objeto com os dados atuais
    const pedido = {
        solicitante: document.getElementById('p-solicitante').value,
        contato: document.getElementById('p-contato').value,
        rotas: document.getElementById('p-rotas').value,
        valorFinal: document.getElementById('view-valor-final').innerText
    };

    // Simulação do envio para o seu chat
    try {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Tempo de processamento
        
        // Formata a mensagem para o chat
        const mensagemFormatada = `
📦 **PEDIDO FINALIZADO**
👤 Solicitante: ${pedido.solicitante}
📞 Contato: ${pedido.contato}
📍 Rota: ${pedido.rotas}
💰 Valor: ${pedido.valorFinal}
        `.trim();

        // Insere no input do seu chat e limpa o modal
        document.getElementById('msg-input').value = mensagemFormatada;
        
        // Fecha o modal
        const modalEl = document.getElementById('modalFormulario');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        alert("Pedido enviado com sucesso!");
    } catch (error) {
        alert("Erro ao finalizar pedido.");
    } finally {
        // Reseta o botão
        btn.disabled = false;
        txt.innerText = "FINALIZAR PEDIDO";
        spn.classList.add('d-none');
    }
};

window.abrirCheckoutDoMapa = async function() {
    console.log("Fluxo de checkout: Carregando formulário...");

    // 1. Fecha o mapa e aguarda a transição
    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    if (modalMapa) modalMapa.hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    // 2. Carrega o HTML do formulário (o await aqui é vital)
    await window.loadModal('modal_form.html');

    // 3. Aguarda o DOM estar pronto para leitura
    const modalFormEl = document.getElementById('modalFormulario');
    
    // 4. Preenche os dados usando o seu objeto global `window.dadosPedidoAtual`
    // Usamos verificações para não travar caso algum dado falte
    const pSolicitante = document.getElementById('p-solicitante');
    const pContato = document.getElementById('p-contato');
    const headerNome = document.getElementById('header-nome-solicitante');
    const containerRotas = document.getElementById('container-linhas-rotas');

    if (pSolicitante) pSolicitante.value = window.dadosPedidoAtual.solicitante || '';
    if (pContato) pContato.value = window.dadosPedidoAtual.contato || '';
    if (headerNome) headerNome.innerText = window.dadosPedidoAtual.solicitante || 'Não informado';
    
    // Preenche as rotas (garantindo que o formato no chat seja lido)
    if (containerRotas) {
        containerRotas.innerHTML = `<p class="small text-muted mb-0">${window.dadosPedidoAtual.rotas || 'Sem rotas definidas'}</p>`;
    }

    // 5. Exibe o modal apenas após ter preenchido tudo
    const modalForm = new bootstrap.Modal(modalFormEl);
    modalForm.show();
    
    console.log("Dados preenchidos com sucesso.");
};

window.voltarParaMapa = async function() {
    // 1. Fecha o modal de formulário
    const modalFormEl = document.getElementById('modalFormulario');
    const modalForm = bootstrap.Modal.getInstance(modalFormEl);
    if (modalForm) modalForm.hide();

    // 2. Aguarda a transição para evitar sobreposição de modais
    await new Promise(resolve => setTimeout(resolve, 400));

    // 3. Limpeza total de resquícios
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    // 4. Re-abre o Modal do Mapa
    const modalMapaEl = document.getElementById('modalMapa');
    if (modalMapaEl) {
        const modalMapa = new bootstrap.Modal(modalMapaEl);
        modalMapa.show();
        
        // 5. Reinicia o mapa dentro do modal com um pequeno delay 
        // para o Bootstrap finalizar a animação de "show"
        setTimeout(() => {
            if (typeof window.renderizarMapaGratuito === 'function') {
                window.renderizarMapaGratuito();
            }
        }, 300);
    } else {
        // Se o modalMapa sumiu do DOM, recarrega-o
        await window.loadModal('modal_mapa.html');
        new bootstrap.Modal(document.getElementById('modalMapa')).show();
        setTimeout(window.renderizarMapaGratuito, 300);
    }
};

function renderizarMapaGoogle(destino) {
    const container = document.getElementById('container-mapa-visual');
    // Este link é o modo de busca pública e gratuita
    const url = `https://www.google.com/maps/embed/v1/search?key=&q=${encodeURIComponent(destino)}`;
    
    container.innerHTML = `
        <iframe width="100%" height="100%" frameborder="0" style="border:0" 
        src="${url}" allowfullscreen></iframe>
    `;
}

function fecharModaisEAbrir(novoModalId) {
    // Remove todos os backdrops manualmente
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Abre o novo
    const modal = new bootstrap.Modal(document.getElementById(novoModalId));
    modal.show();
}

function limparBackdrops() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
}

window.iniciarChat = function() {
    console.log("Chat pronto para operar");
    carregarDados();
};