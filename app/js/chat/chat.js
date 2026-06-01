let debounceTimer;
let clienteSelecionado = null;

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

function prosseguirParaFormulario() {
    // Fecha mapa e abre formulário
    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    if (modalMapa) modalMapa.hide();
    
    setTimeout(() => {
        const modalForm = new bootstrap.Modal(document.getElementById('modalFormulario'));
        modalForm.show();
        mostrarPasso('formulario');
    }, 300);
}

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

function abrirModalMapa(dados) {
    // 1. Nome do solicitante no header
    document.getElementById('header-nome-solicitante').innerText = dados.solicitante;
    
    // 2. Preencher a lista de rotas sem colchetes
    const containerRotas = document.getElementById('lista-rotas-detalhada');
    containerRotas.innerHTML = dados.rotas.map((r, index) => {
        return `<div>Rota ${index + 1}: De: ${r.de} Para: ${r.para}</div>`;
    }).join('');
    
    // 3. Abrir o modal
    new bootstrap.Modal(document.getElementById('modalMapa')).show();
}

function avancarParaFormulario() {
    mostrarPasso('formulario');
    calcularTudo();
}

function calcularTudo() {
    const dist = parseFloat(document.getElementById('p-distancia').value) || 0;
    const valKm = parseFloat(document.getElementById('p-valor-km').value) || 2.20;
    const taxaLocal = parseFloat(document.getElementById('p-localidade').value) || 0;
    const prioridade = parseFloat(document.getElementById('p-prioridade').value) || 0;
    const isRetorno = document.getElementById('p-troca').value === 'SIM';
    
    // Cálculo: (KM * Valor) + Localidade + Prioridade + (Retorno se houver)
    let total = (dist * valKm) + taxaLocal + prioridade;
    if (isRetorno) total += (taxaLocal * 0.60);

    const cancel = parseFloat(document.getElementById('p-taxa-cancelamento').value) || 0;
    if (cancel > 0) total = cancel; // Sobrescreve se houver taxa de cancelamento

    document.getElementById('view-valor-final').innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

window.iniciarFluxoCheckout = function() {
    const msgInput = document.getElementById('msg-input');
    const container = document.getElementById('lista-rotas-detalhada'); // Onde as rotas aparecem
    const modalMapaEl = document.getElementById('modalMapa');

    if (!msgInput || !container || !modalMapaEl) {
        console.error("Elementos não encontrados:", { msgInput, container, modalMapaEl });
        return;
    }

    const texto = msgInput.value;
    const rotasMatch = texto.match(/ROTA:\s*([\s\S]*?)(?=TROCA|PRIORIDADE|OBSERVAÇÃO|$)/i);

    if (!rotasMatch) {
        alert("Formato de ROTA não detectado na mensagem.");
        return;
    }

    const listaRotas = rotasMatch[1].split(/\d+\./).filter(r => r.trim().length > 0);
    const coresSoft = ['#A8DADC', '#A7C957', '#F4A261', '#E76F51', '#8D99AE'];

    // PREENCHIMENTO DO CONTAINER
    container.innerHTML = listaRotas.map((rota, index) => {
        const [de, para] = rota.split('|');
        const cor = coresSoft[index % coresSoft.length];
        
        return `
            <div class="card mb-2 border-0 shadow-sm" style="border-left: 5px solid ${cor}; background: #fcfcfc;">
                <div class="card-body p-2">
                    <strong style="color: ${cor}">Rota ${index + 1}</strong>
                    <div class="small"><strong>De:</strong> ${de?.trim()}</div>
                    <div class="small mb-2"><strong>Para:</strong> ${para?.trim()}</div>
                    <div class="row g-2">
                        <div class="col-6"><input type="number" class="form-control form-control-sm" placeholder="KM"></div>
                        <div class="col-6"><input type="number" class="form-control form-control-sm" placeholder="Min"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    console.log("Rotas processadas:", listaRotas.length);

    // Abre o Modal
    new bootstrap.Modal(modalMapaEl).show();
};

window.prosseguirParaFormulario = function() {
    // Fecha o modal atual
    const modalEl = document.getElementById('modalMapa');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if(modal) modal.hide();

    // Remove a "película cinza" (backdrop) que as vezes trava
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    
    // Mostra o passo seguinte
    mostrarPasso('formulario');
};

async function salvarPedidoAPI() {
    const dadosPedido = {
        id_mensagens_chat: Date.now(), // Ou capture do ID da última mensagem
        solicitante: document.getElementById('p-solicitante').value,
        contato: document.getElementById('p-contato').value,
        horario: document.getElementById('p-horario').value,
        mercadoria: document.getElementById('p-mercadoria').value,
        de: "{1 - R. A 32, 2 - Av brasilia 100, 3 - Rua Goitacazes 52}",
        para: "{1 - Rua das Esmeraldas 192, 2 - Av Santos Drumond, 3 - Rua Rio de Janeiro 12}",
        troca_retorno: document.getElementById('p-troca').value,
        prioridade: document.getElementById('p-prioridade').value,
        valor_corrida: parseFloat(document.getElementById('view-valor-final').innerText.replace('R$', '').replace(',', '.')),
        motoboy: "⁉",
        status: "⏳ Aguardando",
        observacao: document.getElementById('p-obs').value
    };

    const response = await API.call('createpedido', dadosPedido);
    
    if (response) {
        // Envia confirmação de volta ao chat
        const mensagemConfirmacao = `✅ *Pedido RDO${response.id} criado com sucesso!*\nCliente: ${document.getElementById('chat-header-name').innerText}`;
        // Lógica de enviar mensagem via API para o chat...
    }
}