let debounceTimer;

let clienteSelecionado = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
});

document.querySelectorAll('#modalFormulario input, #modalFormulario select').forEach(el => {
    el.addEventListener('change', calcularTudo);
});

async function carregarDados() {
    const listEl = document.getElementById('lista-contatos-chat');
    const syncIcon = document.getElementById('sync-icon-chat');
    
    if (!listEl) return;
    if (syncIcon) syncIcon.classList.add('spinner-rotate');

    try {
        const clientes = await API.call('getclientes') || [];
        const isMasterOn = localStorage.getItem('bot_master_active') === 'true';

        // Aqui está o trecho que você perguntou: ele cria a linha do contato dinamicamente
        listEl.innerHTML = clientes.map(c => {
            const id = c.id || '';
            const nomeExibicao = (c.nome || c.username || 'Sem nome').replace(/'/g, "\\'");
            const imagem = c.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            
            const statusReal = String(c.status || '').toUpperCase() === 'TRUE';
            const isOnline = isMasterOn ? statusReal : false;
            const statusText = isOnline ? 'Online' : 'Offline';
            const statusColor = isOnline ? '#28a745' : '#adb5bd';

            // O trecho do onclick passa o ID, NOME e IMAGEM para a função abrirConversa
            return `
                <div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean" 
                     onclick="abrirConversa('${id}', '${nomeExibicao}', '${imagem}')">
                    <div class="position-relative">
                        <img src="${imagem}" class="rounded-circle img-avatar-small" style="width:35px; height:35px; object-fit:cover;">
                        <span class="position-absolute bottom-0 end-0 rounded-circle border border-white status-dot" 
                              style="background-color: ${statusColor};"></span>
                    </div>
                    <div class="ms-3 overflow-hidden">
                        <div class="contact-name text-truncate">${nomeExibicao}</div>
                        <div class="contact-status">${statusText}</div>
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

function filtrarContatos() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const input = document.getElementById('chat-search');
        const filter = input.value.toLowerCase();
        const list = document.getElementById('lista-contatos-chat');
        const items = list.getElementsByClassName('list-group-item');
        let encontradoAlgum = false;

        Array.from(items).forEach(item => {
            const nome = item.querySelector('.contact-name').textContent.toLowerCase();
            const visivel = nome.includes(filter);
            item.style.display = visivel ? "flex" : "none";
            if (visivel) encontradoAlgum = true;
        });

        let msg = document.getElementById('no-results-msg');
        if (!encontradoAlgum) {
            if (!msg) list.insertAdjacentHTML('beforeend', '<div id="no-results-msg" class="p-3 text-center text-muted small">Nenhum contato encontrado.</div>');
        } else if (msg) {
            msg.remove();
        }
    }, 200);
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
    // 1. Acesso direto ao elemento
    const modalEl = document.getElementById('modalMapa');
    
    if (!modalEl) {
        alert("Erro: O modal não foi encontrado na página.");
        return;
    }

    // 2. Preenchimento seguro
    document.getElementById('header-nome-solicitante').innerText = "Marcio Augusto";
    document.getElementById('map-tempo-total').innerText = "19 min";
    document.getElementById('map-distancia-total').innerText = "9.5 km";
    document.getElementById('lista-rotas-detalhada').innerHTML = 
        "Rota 1: De: Rua A, 32 - Floramar Para: Local 1 <br>" +
        "Rota 2: De: Local 1 Para: Rua Cinco, 192 - Belo Horizonte";

    // 3. Inicialização do Bootstrap
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
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