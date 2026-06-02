let debounceTimer;
let clienteSelecionado = null;
let rotasAtuais = [];

document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'chat-search') {
        window.filtrarContatos();
    }
});

window.filtrarContatos = function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const searchInput = document.getElementById('chat-search');
        const termo = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const listaContatos = document.getElementById('lista-contatos-chat');
        if (!listaContatos) return;

        const contatos = listaContatos.querySelectorAll('.contact-item-clean');

        contatos.forEach(contato => {
            const nomeEl = contato.querySelector('.contact-name');
            const textoNome = nomeEl ? nomeEl.innerText.toLowerCase() : '';

            console.log("Comparando:", textoNome, "com", termo);

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
    container.innerHTML = ''; 

    listaDeClientes.forEach(cliente => {
        const div = document.createElement('div');
        div.className = 'contato-item list-group-item'; 
        div.innerText = cliente.nome;

        div.onclick = () => carregarConversa(cliente.id);

        container.appendChild(div);
    });
}

/**
 * Função Unificada para Renderizar o Mapa
 * @param {Array} latlngs - Array de coordenadas [[lat, lng], [lat, lng], ...]
 */
window.renderizarMapaUnificado = async function(latlngs = null) {
    const container = document.getElementById('container-mapa-visual');
    if (!container) return;

    if (container._leaflet_id) container._leaflet_id = null;
    container.innerHTML = '<div id="map-instance" style="width:100%; height:100%;"></div>';
    
    // Centraliza em Belo Horizonte por padrão
    const map = L.map('map-instance').setView([-19.9167, -43.9345], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    if (latlngs && latlngs.length > 0) {
        // Renderiza marcadores para cada parada da rota
        latlngs.forEach((pos, index) => {
            const label = index === 0 ? "Origem (Coleta)" : `Parada ${index}`;
            L.marker(pos).addTo(map).bindPopup(label);
        });

        L.polyline(latlngs, {
            color: 'blue', 
            weight: 5,
            opacity: 0.8
        }).addTo(map);
        map.fitBounds(latlngs);
    } 
    else if (window.dadosPedidoAtual && window.dadosPedidoAtual.coordenadas) {
        // Se houver coordenadas guardadas no estado global do fluxo, renderiza elas
        const coords = window.dadosPedidoAtual.coordenadas.map(c => [c.lat, c.lng]);
        latlngs.forEach((pos, index) => {
            L.marker(pos).addTo(map);
        });
        L.polyline(coords, { color: 'blue', weight: 5 }).addTo(map);
        map.fitBounds(coords);
    }
    
    setTimeout(() => map.invalidateSize(), 500);
};

window.abrirCheckoutDoMapa = async function () {
    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    if (modalMapa) modalMapa.hide();

    await window.loadModal('modal_form.html');
    const header = document.querySelector('#modalFormulario .modal-header');
    if (header) {
        header.insertAdjacentHTML('afterbegin', `
            <button type="button" class="btn btn-link text-danger p-0 mb-2" onclick="window.voltarParaMapa()">
                <i class="bi bi-arrow-left"></i> Voltar ao Mapa
            </button>
        `);
    }
};

function mostrarPasso(passo) {
    ['chat', 'mapa', 'formulario'].forEach(s => {
        const el = document.getElementById(`step-${s}`);
        if (el) el.classList.add('d-none');
    });
    const target = document.getElementById(`step-${passo}`);
    if (target) target.classList.remove('d-none');
}

function aoReceberMensagem(texto) {
    if (texto.includes("SOLICITANTE:") && texto.includes("ROTA:")) {
        console.log("Fluxo de Pedido detectado.");
        mostrarPasso('mapa'); 

        const modalMapa = new bootstrap.Modal(document.getElementById('modalMapa'));
        modalMapa.show();
    }
}

window.abrirConversa = function (id, nome, urlImagem) {
    clienteSelecionado = id;

    const nameEl = document.getElementById('chat-header-name');
    nameEl.innerText = nome;

    const logoEl = document.getElementById('chat-header-logo');
    if (urlImagem) {
        logoEl.src = urlImagem;
        logoEl.classList.remove('d-none'); 
    } else {
        logoEl.classList.add('d-none'); 
    }

    const items = document.querySelectorAll('.list-group-item');
    items.forEach(el => el.classList.remove('selected-contact'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected-contact');
    }
};

window.abrirModalMapaComDados = function (nomeDoChat) {
    if (!window.dadosPedidoAtual) window.dadosPedidoAtual = {};
    window.dadosPedidoAtual.solicitante = nomeDoChat;

    const headerNome = document.getElementById('header-nome-solicitante');
    if (headerNome) headerNome.innerText = nomeDoChat;

    const modalMapa = new bootstrap.Modal(document.getElementById('modalMapa'));
    modalMapa.show();
};

function avancarParaFormulario() {
    mostrarPasso('formulario');
    calcularTudo();
}

function calcularTudo() {
    const dist = parseFloat(document.getElementById('p-distancia')?.value) || 0;
    const valKm = parseFloat(document.getElementById('p-valor-km')?.value) || 1.10; // Alinhado com R$ 1,10 do server
    const prioridade = parseFloat(document.getElementById('p-prioridade')?.value) || 0;
    const dinamica = parseFloat(document.getElementById('p-dinamica')?.value) || 0;
    const multRetorno = parseFloat(document.getElementById('p-retorno')?.value) || 0;

    const baseCorrida = dist * valKm;
    const valorRetorno = baseCorrida * multRetorno;

    let total = baseCorrida + valorRetorno + prioridade + dinamica;

    let taxaCancel = 0;
    if (total > 71) taxaCancel = 20;
    else if (total > 36) taxaCancel = 15;
    else if (total > 0) taxaCancel = 10;

    total += taxaCancel;

    const viewFinal = document.getElementById('view-valor-final');
    if (viewFinal) {
        viewFinal.innerText = total.toLocaleString('pt-BR', {
            style: 'currency', currency: 'BRL'
        });
    }
}

async function buscarCoordenadasEndereco(enderecoTexto) {
    try {
        // Adiciona sufixo regional para refinar buscas em BH e região caso falte o estado
        const buscaLimpa = encodeURIComponent(enderecoTexto + ", MG, Brasil");
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${buscaLimpa}`;
        
        const response = await fetch(url, { headers: { 'User-Agent': 'RDO-Express-App' } });
        const dados = await response.json();
        
        if (dados && dados.length > 0) {
            return {
                lat: parseFloat(dados[0].lat),
                lng: parseFloat(dados[0].lon)
            };
        }
        return null;
    } catch (err) {
        console.error("Erro ao geocodificar endereço:", enderecoTexto, err);
        return null;
    }
}

window.iniciarFluxoCheckout = async function () {
    const msgInput = document.getElementById('msg-input');
    if (!msgInput) return;
    
    const texto = msgInput.value;
    if (!texto.trim()) return;

    // 1. Envia visualmente a mensagem para a janela do chat
    window.enviarMensagemParaChat(texto);

    // Exibe um feedback visual ou loading rápido no console
    console.log("Iniciando processamento lógico do arquivo/texto...");

    // 2. Extração via Regex baseada na mensagem padrão do cliente
    const solicitante = texto.match(/SOLICITANTE:\s*(.*)/i)?.[1]?.trim() || '';
    const contato = texto.match(/CONATO:\s*(.*)/i)?.[1]?.trim() || texto.match(/CONTATO:\s*(.*)/i)?.[1]?.trim() || '';
    const horario = texto.match(/HORÁRIO ESTIMADO P\/ COLETA:\s*(.*)/i)?.[1]?.trim() || '';
    const mercadoria = texto.match(/MERCADORIA:\s*\((.*)\)/i)?.[1]?.trim() || '';
    const retornoTexto = texto.match(/TROCA\/RETORNO:\s*\((.*)\)/i)?.[1]?.trim() || '';
    const prioridadeTexto = texto.match(/PRIORIDADE:\s*\((.*)\)/i)?.[1]?.trim() || '';
    const obs = texto.match(/OBSERVAÇÃO:\s*(.*)/i)?.[1]?.trim() || '';

    // Extrai as linhas de rota da estrutura
    const blocoRotas = texto.match(/ROTA:\s*([\s\S]*?)(?=TROCA|$)/i)?.[1]?.trim() || '';
    
    // Captura e separa todos os endereços (De: X | Para: Y) de forma limpa
    const linhasEnderecos = blocoRotas.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let listaEnderecosUnicos = [];

    linhasEnderecos.forEach((linha) => {
        // Limpa numerações como "1.", "2."
        const limpaLinha = linha.replace(/^\d+\.\s*/, '');
        const partes = limpaLinha.split(/\||Para:/i);
        
        partes.forEach(p => {
            let enderecoTratado = p.replace(/De:/i, '').trim();
            // Remove vírgula final se houver residual de formatação
            if (enderecoTratado.endsWith(',')) enderecoTratado = enderecoTratado.slice(0, -1);
            if (enderecoTratado && !listaEnderecosUnicos.includes(enderecoTratado)) {
                listaEnderecosUnicos.push(enderecoTratado);
            }
        });
    });

    // 3. Geocodifica todos os endereços da rota de forma sequencial e paralela
    console.log("Convertendo endereços em coordenadas geográficas...");
    const promisesCoordenadas = listaEnderecosUnicos.map(end => buscarCoordenadasEndereco(end));
    const resultadosCoordenadas = await Promise.all(promisesCoordenadas);
    
    // Filtra apenas as coordenadas encontradas com sucesso
    const coordenadasValidas = resultadosCoordenadas.filter(c => c !== null);

    if (coordenadasValidas.length < 2) {
        alert("Não foi possível identificar coordenadas geográficas suficientes para os endereços da rota.");
        return;
    }

    // 4. Faz o disparo HTTP para a rota do servidor que calcula via OSRM Web Cloud
    console.log("Enviando dados de rota para processamento no servidor backend...");
    let calculoServidor = { distancia_km: 0, valor_taxa: 0 };

    try {
        const response = await fetch('/api/calcular-rota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                coordenadas: coordenadasValidas,
                prioridade: prioridadeTexto,
                retorno: retornoTexto
            })
        });
        const resData = await response.json();
        if (resData.status === 'success') {
            calculoServidor = resData;
        }
    } catch (err) {
        console.error("Erro ao requisitar cálculo de rota do backend:", err);
    }

    // 5. Monta o objeto Global persistido com os retornos exatos do OSRM Cloud
    window.dadosPedidoAtual = {
        solicitante,
        contato,
        horario,
        mercadoria,
        obs,
        rotas: blocoRotas,
        distancia: calculoServidor.distancia_km,
        tempo: calculoServidor.tempo_estimado_minutos + " min",
        valorCalculadoOSRM: calculoServidor.valor_taxa,
        coordenadas: coordenadasValidas
    };

    // 6. Carrega e exibe o modal do Mapa já renderizando o caminho geométrico na tela
    await window.loadModal('modal_mapa.html');
    const modalMapa = new bootstrap.Modal(document.getElementById('modalMapa'));
    modalMapa.show();

    // Renderiza a linha polilinha do trajeto geográfico no Leaflet
    const latlngsMapeadas = coordenadasValidas.map(c => [c.lat, c.lng]);
    setTimeout(() => window.renderizarMapaUnificado(latlngsMapeadas), 500);
};

window.prosseguirParaFormulario = async function () {
    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    if (modalMapa) modalMapa.hide();

    await window.loadModal('modal_form.html');

    // Popula campos automáticos
    if (window.dadosPedidoAtual) {
        Object.keys(window.dadosPedidoAtual).forEach(key => {
            const el = document.getElementById(`p-${key}`);
            if (el) el.value = window.dadosPedidoAtual[key];
        });

        // Injeta o valor exato vindo do OSRM direto nos inputs de cálculo para o formulário espelhar
        const pDistancia = document.getElementById('p-distancia');
        if (pDistancia) pDistancia.value = window.dadosPedidoAtual.distancia;
        
        // Ajusta as taxas extras nos selects do formulário conforme o que foi calculado
        const pPrioridade = document.getElementById('p-prioridade');
        if (pPrioridade && (window.dadosPedidoAtual.prioridade === 'Urgente' || window.dadosPedidoAtual.valorCalculadoOSRM > 0)) {
             // Sincroniza visualmente se necessário
        }
    }

    const modalForm = new bootstrap.Modal(document.getElementById('modalFormulario'));
    modalForm.show();
    
    // Se o backend retornou o valor exato, injeta direto na view final, senão roda a calculadora local
    if (window.dadosPedidoAtual && window.dadosPedidoAtual.valorCalculadoOSRM) {
        document.getElementById('view-valor-final').innerText = window.dadosPedidoAtual.valorCalculadoOSRM.toLocaleString('pt-BR', {
            style: 'currency', currency: 'BRL'
        });
    } else {
        calcularTudo();
    }
};

window.salvarPedidoAPI = async function () {
    const mensagem = `
🚀 *NOVO PEDIDO RDO EXPRESS*
👤 *Solicitante:* ${document.getElementById('p-solicitante').value}
📞 *Contato:* ${document.getElementById('p-contato').value}
⏰ *Horário:* ${document.getElementById('p-horario').value}
📦 *Mercadoria:* ${document.getElementById('p-mercadoria').value}
🛣️ *Rota:* ${document.getElementById('p-rotas').value}
💰 *VALOR:* ${document.getElementById('view-valor-final').innerText}
    `.trim();

    window.enviarMensagemParaChat(mensagem);

    const modalForm = bootstrap.Modal.getInstance(document.getElementById('modalFormulario'));
    if (modalForm) modalForm.hide();
};

window.abrirCheckoutDoMapa = async function () {
    console.log("Fluxo de checkout: Carregando formulário...");

    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    if (modalMapa) modalMapa.hide();
    await new Promise(resolve => setTimeout(resolve, 300));

    await window.loadModal('modal_form.html');

    const modalFormEl = document.getElementById('modalFormulario');

    const pSolicitante = document.getElementById('p-solicitante');
    const pContato = document.getElementById('p-contato');
    const headerNome = document.getElementById('header-nome-solicitante');
    const containerRotas = document.getElementById('container-linhas-rotas');
    const pDistancia = document.getElementById('p-distancia');

    if (pSolicitante) pSolicitante.value = window.dadosPedidoAtual.solicitante || '';
    if (pContato) pContato.value = window.dadosPedidoAtual.contato || '';
    if (headerNome) headerNome.innerText = window.dadosPedidoAtual.solicitante || 'Não informado';
    if (pDistancia) pDistancia.value = window.dadosPedidoAtual.distancia || 0;

    if (containerRotas) {
        containerRotas.innerHTML = `<p class="small text-muted mb-0">${window.dadosPedidoAtual.rotas || 'Sem rotas definidas'}</p>`;
    }

    const modalForm = new bootstrap.Modal(modalFormEl);
    modalForm.show();

    if (window.dadosPedidoAtual && window.dadosPedidoAtual.valorCalculadoOSRM) {
        document.getElementById('view-valor-final').innerText = window.dadosPedidoAtual.valorCalculadoOSRM.toLocaleString('pt-BR', {
            style: 'currency', currency: 'BRL'
        });
    } else {
        calcularTudo();
    }
    console.log("Dados preenchidos com sucesso.");
};

window.voltarParaMapa = async function () {
    const modalFormEl = document.getElementById('modalFormulario');
    const modalForm = bootstrap.Modal.getInstance(modalFormEl);
    if (modalForm) modalForm.hide();

    await new Promise(resolve => setTimeout(resolve, 400));

    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    const modalMapaEl = document.getElementById('modalMapa');
    if (modalMapaEl) {
        const modalMapa = new bootstrap.Modal(modalMapaEl);
        modalMapa.show();

        setTimeout(() => {
            if (window.dadosPedidoAtual && window.dadosPedidoAtual.coordenadas) {
                const latlngs = window.dadosPedidoAtual.coordenadas.map(c => [c.lat, c.lng]);
                window.renderizarMapaUnificado(latlngs);
            }
        }, 300);
    } else {
        await window.loadModal('modal_mapa.html');
        new bootstrap.Modal(document.getElementById('document.getElementById')).show();
        setTimeout(() => {
            if (window.dadosPedidoAtual && window.dadosPedidoAtual.coordenadas) {
                const latlngs = window.dadosPedidoAtual.coordenadas.map(c => [c.lat, c.lng]);
                window.renderizarMapaUnificado(latlngs);
            }
        }, 300);
    }
};

function fecharModaisEAbrir(novoModalId) {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    const modal = new bootstrap.Modal(document.getElementById(novoModalId));
    modal.show();
}

window.enviarMensagemParaChat = function (texto) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const placeholder = container.querySelector('.text-muted.my-auto');
    if (placeholder) placeholder.remove();

    const div = document.createElement('div');
    div.className = 'd-flex justify-content-end mb-2'; 
    div.innerHTML = `
        <div class="bg-danger text-white p-3 rounded-4 shadow-sm" style="max-width: 80%; white-space: pre-line;">
            ${texto.replace(/\n/g, '<br>')}
        </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    const msgInput = document.getElementById('msg-input');
    if (msgInput) msgInput.value = '';
};

function limparBackdrops() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
}

window.iniciarChat = function () {
    console.log("Chat pronto para operar");
    carregarDados();
};