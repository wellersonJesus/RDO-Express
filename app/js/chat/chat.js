let debounceTimer;
let clienteSelecionado = null;
let rotasAtuais = [];
let listaCarregada = false; // Controle para o loop de carregamento da página

// =====================================================================
// EVENTOS GLOBAIS E DELEGAÇÃO (Filtro, Formulário e Botão Loop)
// =====================================================================

document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'chat-search') {
        window.filtrarContatos();
    }
});

document.addEventListener('change', (e) => {
    if (e.target && e.target.closest('#modalFormulario')) {
        if (typeof window.calcularTudo === 'function') window.calcularTudo();
    }
});

// Aciona o carregamento manual ao clicar no botão de Loop (Sincronizar)
document.addEventListener('click', (e) => {
    if (e.target && e.target.closest('#sync-icon-chat')) {
        window.carregarDados();
    }
});

// =====================================================================
// OBSERVAR PÁGINA 7 (Carrega automaticamente ao entrar e sair)
// =====================================================================

const observerPagina = new MutationObserver((mutations) => {
    const listaExiste = document.getElementById('lista-contatos-chat');
    
    if (listaExiste && !listaCarregada) {
        // Entrou na página 7: Carrega os dados
        window.carregarDados();
        listaCarregada = true;
    } else if (!listaExiste) {
        // Saiu da página 7: Reseta o status para carregar na próxima vez
        listaCarregada = false;
    }
});
observerPagina.observe(document.body, { childList: true, subtree: true });

// =====================================================================
// FUNÇÕES DE CONTATOS E CHAT
// =====================================================================

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

            if (textoNome.includes(termo)) {
                contato.style.setProperty('display', 'flex', 'important');
            } else {
                contato.style.setProperty('display', 'none', 'important');
            }
        });
    }, 300);
};

window.carregarDados = async function () {
    const listEl = document.getElementById('lista-contatos-chat');
    const syncIcon = document.getElementById('sync-icon-chat');

    if (!listEl) return;
    if (syncIcon) syncIcon.classList.add('spinner-rotate'); // Inicia a animação de loop

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
                     onclick="window.abrirConversa('${id}', '${nome}', '${imagem}')">
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
        if (syncIcon) syncIcon.classList.remove('spinner-rotate'); // Para a animação de loop
    }
};

window.abrirConversa = function (id, nome, urlImagem) {
    clienteSelecionado = id;

    const nameEl = document.getElementById('chat-header-name');
    if (nameEl) nameEl.innerText = nome;

    const logoEl = document.getElementById('chat-header-logo');
    if (logoEl) {
        if (urlImagem) {
            logoEl.src = urlImagem;
            logoEl.classList.remove('d-none'); 
        } else {
            logoEl.classList.add('d-none'); 
        }
    }

    const items = document.querySelectorAll('.list-group-item');
    items.forEach(el => el.classList.remove('selected-contact'));
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('selected-contact');
    }
};

// =====================================================================
// MAPA E FLUXO DE CHECKOUT
// =====================================================================

window.renderizarMapaUnificado = async function(latlngs = null) {
    const container = document.getElementById('container-mapa-visual');
    if (!container) return;

    if (container._leaflet_id) container._leaflet_id = null;
    container.innerHTML = '<div id="map-instance" style="width:100%; height:100%;"></div>';
    
    const map = L.map('map-instance').setView([-19.9167, -43.9345], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    let coordsParaRenderizar = latlngs;

    if (!coordsParaRenderizar && window.dadosPedidoAtual && window.dadosPedidoAtual.coordenadas) {
        coordsParaRenderizar = window.dadosPedidoAtual.coordenadas.map(c => [c.lat, c.lng]);
    }

    if (coordsParaRenderizar && coordsParaRenderizar.length > 0) {
        coordsParaRenderizar.forEach((pos, index) => {
            const label = index === 0 ? "Origem (Coleta)" : `Parada ${index}`;
            L.marker(pos).addTo(map).bindPopup(label);
        });

        L.polyline(coordsParaRenderizar, {
            color: 'blue', 
            weight: 5,
            opacity: 0.8
        }).addTo(map);
        map.fitBounds(coordsParaRenderizar);
    }
    
    setTimeout(() => map.invalidateSize(), 500);
};

async function buscarCoordenadasEndereco(enderecoTexto) {
    try {
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

    const container = document.getElementById('chat-messages-container');
    if (container) {
        const placeholder = container.querySelector('.text-muted.my-auto');
        if (placeholder) placeholder.remove();

        const divMensagemCliente = document.createElement('div');
        divMensagemCliente.className = 'd-flex justify-content-start mb-2';
        divMensagemCliente.innerHTML = `
            <div class="bg-white text-dark p-3 rounded-4 shadow-sm border border-light-subtle" style="max-width: 80%; white-space: pre-line; font-size: 0.9rem;">
                ${texto.replace(/\n/g, '<br>')}
            </div>
        `;
        container.appendChild(divMensagemCliente);
        container.scrollTop = container.scrollHeight;
    }

    msgInput.value = '';

    const solicitante = texto.match(/SOLICITANTE:\s*(.*)/i)?.[1]?.trim() || 'Não Identificado';
    const contato = texto.match(/CONATO:\s*(.*)/i)?.[1]?.trim() || texto.match(/CONTATO:\s*(.*)/i)?.[1]?.trim() || '';
    const horario = texto.match(/HORÁRIO ESTIMADO P\/ COLETA:\s*(.*)/i)?.[1]?.trim() || '';
    const mercadoria = texto.match(/MERCADORIA:\s*\((.*)\)/i)?.[1]?.trim() || 'Sacola';
    const retornoTexto = texto.match(/TROCA\/RETORNO:\s*\((.*)\)/i)?.[1]?.trim() || '';
    const prioridadeTexto = texto.match(/PRIORIDADE:\s*\((.*)\)/i)?.[1]?.trim() || '';
    const obs = texto.match(/OBSERVAÇÃO:\s*(.*)/i)?.[1]?.trim() || '';

    const blocoRotas = texto.match(/ROTA:\s*([\s\S]*?)(?=TROCA|$)/i)?.[1]?.trim() || '';
    const linhasEnderecos = blocoRotas.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let listaEnderecosUnicos = [];

    linhasEnderecos.forEach((linha) => {
        const limpaLinha = line => line.replace(/^\d+\.\s*/, '');
        const partes = limpaLinha(linha).split(/\||Para:/i);
        partes.forEach(p => {
            let enderecoTratado = p.replace(/De:/i, '').trim();
            if (enderecoTratado.endsWith(',')) enderecoTratado = enderecoTratado.slice(0, -1);
            if (enderecoTratado && !listaEnderecosUnicos.includes(enderecoTratado)) {
                listaEnderecosUnicos.push(enderecoTratado);
            }
        });
    });

    await window.loadModal('modal_mapa.html');
    const modalMapa = new bootstrap.Modal(document.getElementById('modalMapa'));
    modalMapa.show();

    const elHeaderSolicitante = document.getElementById('header-nome-solicitante');
    if (elHeaderSolicitante) elHeaderSolicitante.innerText = solicitante;

    const elResumoTotal = document.getElementById('resumo-total');
    if (elResumoTotal) {
        elResumoTotal.className = "text-muted small"; 
        elResumoTotal.innerText = "Calculando rota...";
    }

    const promisesCoordenadas = listaEnderecosUnicos.map(end => buscarCoordenadasEndereco(end));
    const resultadosCoordenadas = await Promise.all(promisesCoordenadas);
    const coordenadasValidas = resultadosCoordenadas.filter(c => c !== null);

    if (coordenadasValidas.length < 2) {
        if (elResumoTotal) elResumoTotal.innerText = "Erro: Coordenadas insuficientes.";
        return;
    }

    let calculoServidor = { distancia_km: 0, tempo_estimado_minutos: 0 };
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
            calculoServidor.distancia_km = resData.distancia_km;
            calculoServidor.tempo_estimado_minutos = resData.tempo_estimado_minutos;
        }
    } catch (err) {
        console.error("Erro no cálculo OSRM:", err);
    }

    const numKm = Number(calculoServidor.distancia_km) || 0;
    const numTempo = Math.ceil(calculoServidor.tempo_estimado_minutos) || 0;

    const textoKmStr = numKm.toFixed(1);
    const textoTempoStr = numTempo > 0 ? `${numTempo} min` : "-- min";

    if (elResumoTotal) {
        elResumoTotal.innerHTML = `<span class="text-dark fw-medium">${textoTempoStr}</span> (${textoKmStr} km)`;
    }

    window.dadosPedidoAtual = {
        solicitante,
        contato,
        horario,
        mercadoria,
        obs,
        rotas: blocoRotas,
        distancia: textoKmStr, 
        tempo: textoTempoStr,   
        coordenadas: coordenadasValidas
    };

    const latlngsMapeadas = coordenadasValidas.map(c => [c.lat, c.lng]);
    setTimeout(() => window.renderizarMapaUnificado(latlngsMapeadas), 300);
};

// =====================================================================
// TRANSIÇÃO FORMULÁRIO E FINALIZAÇÃO
// =====================================================================

window.prosseguirParaFormulario = async function () {
    const modalMapaEl = document.getElementById('modalMapa');
    if (modalMapaEl) {
        const modalMapa = bootstrap.Modal.getInstance(modalMapaEl);
        if (modalMapa) modalMapa.hide();
    }

    await window.loadModal('modal_form.html');
    const modalForm = new bootstrap.Modal(document.getElementById('modalFormulario'));
    modalForm.show();

    setTimeout(() => {
        const elFormSolicitante = document.getElementById('form-nome-solicitante');
        if (elFormSolicitante) elFormSolicitante.innerText = window.dadosPedidoAtual.solicitante;

        if (document.getElementById('p-solicitante')) document.getElementById('p-solicitante').value = window.dadosPedidoAtual.solicitante;
        if (document.getElementById('p-contato')) document.getElementById('p-contato').value = window.dadosPedidoAtual.contato;
        if (document.getElementById('p-horario')) document.getElementById('p-horario').value = window.dadosPedidoAtual.horario;
        if (document.getElementById('p-mercadoria')) document.getElementById('p-mercadoria').value = window.dadosPedidoAtual.mercadoria;
        if (document.getElementById('p-rotas')) document.getElementById('p-rotas').value = window.dadosPedidoAtual.rotas;
        if (document.getElementById('p-obs')) document.getElementById('p-obs').value = window.dadosPedidoAtual.obs;
        
        if (document.getElementById('p-distancia')) document.getElementById('p-distancia').value = window.dadosPedidoAtual.distancia;
        if (document.getElementById('p-tempo')) document.getElementById('p-tempo').value = window.dadosPedidoAtual.tempo;

        window.calcularTudo();
    }, 250);
};

window.calcularTudo = function () {
    const inputDistancia = document.getElementById('p-distancia');
    const selectValorKm = document.getElementById('p-valor-km');
    const selectPrioridade = document.getElementById('p-prioridade');
    const selectRetorno = document.getElementById('p-retorno');
    const selectDinamica = document.getElementById('p-dinamica');
    const viewValorFinal = document.getElementById('view-valor-final');

    if (!inputDistancia || !viewValorFinal) return;

    const km = parseFloat(inputDistancia.value) || 0;
    const valorKm = parseFloat(selectValorKm?.value) || 2.20;

    let valorBase = km * valorKm;

    valorBase += parseFloat(selectPrioridade?.value) || 0;
    valorBase += parseFloat(selectDinamica?.value) || 0;

    const fatorRetorno = parseFloat(selectRetorno?.value) || 0;
    if (fatorRetorno > 0) {
        valorBase += (valorBase * fatorRetorno);
    }

    viewValorFinal.innerText = valorBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

window.voltarParaMapa = async function () {
    const modalFormEl = document.getElementById('modalFormulario');
    if (modalFormEl) {
        const modalForm = bootstrap.Modal.getInstance(modalFormEl);
        if (modalForm) modalForm.hide();
    }

    await new Promise(resolve => setTimeout(resolve, 300));
    limparBackdrops();

    await window.loadModal('modal_mapa.html');
    const modalMapaEl = document.getElementById('modalMapa');
    if (modalMapaEl) {
        const modalMapa = new bootstrap.Modal(modalMapaEl);
        modalMapa.show();

        const elHeaderSolicitante = document.getElementById('header-nome-solicitante');
        if (elHeaderSolicitante && window.dadosPedidoAtual) {
            elHeaderSolicitante.innerText = window.dadosPedidoAtual.solicitante;
        }

        const elResumoTotal = document.getElementById('resumo-total');
        if (elResumoTotal && window.dadosPedidoAtual) {
            elResumoTotal.className = "text-muted small";
            elResumoTotal.innerHTML = `<span class="text-dark fw-medium">${window.dadosPedidoAtual.tempo}</span> (${window.dadosPedidoAtual.distancia} km)`;
        }

        setTimeout(() => {
            if (window.dadosPedidoAtual && window.dadosPedidoAtual.coordenadas) {
                const latlngs = window.dadosPedidoAtual.coordenadas.map(c => [c.lat, c.lng]);
                window.renderizarMapaUnificado(latlngs);
            }
        }, 300);
    }
};

window.salvarPedidoAPI = async function () {
    const form = document.getElementById('form-checkout');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const btnFinalizar = document.getElementById('btn-finalizar');

    if (!form) return;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return; 
    }

    if (btnText) btnText.innerText = "SALVANDO PEDIDO...";
    if (btnSpinner) btnSpinner.classList.remove('d-none');
    if (btnFinalizar) btnFinalizar.disabled = true;

    const nomeGrupoChat = document.getElementById('chat-header-name')?.innerText || 'RDO EXPRESS CLIENTES';
    const idMensagemChatAleatorio = 'MSG' + Math.floor(10000 + Math.random() * 90000);
    
    const solicitante = document.getElementById('p-solicitante').value;
    const contato = document.getElementById('p-contato').value;
    const horariopara = document.getElementById('p-horario').value;
    const mercadoria = document.getElementById('p-mercadoria').value;
    const depara = document.getElementById('p-rotas').value;
    
    const selectRetorno = document.getElementById('p-retorno');
    const troca_retorno = (selectRetorno && selectRetorno.value !== "0") ? "SIM" : "NÃO";
    
    const selectPrioridade = document.getElementById('p-prioridade');
    const prioridade = selectPrioridade ? selectPrioridade.options[selectPrioridade.selectedIndex].text : 'Normal';
    
    const valor_corrida = document.getElementById('view-valor-final').innerText;
    const observacao = document.getElementById('p-obs').value;

    const payloadBancoDados = {
        id: 'RDO' + Math.floor(10000 + Math.random() * 90000), 
        id_mensagens_chat: idMensagemChatAleatorio,
        solicitante: solicitante,
        contato: contato,
        horario: horariopara,
        mercadoria: mercadoria,
        depara: depara,
        troca_retorno: troca_retorno,
        prioridade: prioridade,
        valor_corrida: valor_corrida,
        motoboy: "A DEFINIR", 
        status: "Pendente",    
        observacao: observacao
    };

    const mensagemFinalChat = `
📦 *${nomeGrupoChat.toUpperCase()}*

*N.SERVIÇO:* ${payloadBancoDados.id}
*Solicitante:* ${payloadBancoDados.solicitante} | *Contato:* ${payloadBancoDados.contato}
*Mercadoria:* ${payloadBancoDados.mercadoria} *Horário:* ${payloadBancoDados.horario} | 
*Distância:* ${document.getElementById('p-distancia').value} KM | *Retorno:* ${payloadBancoDados.troca_retorno} | *Tempo:* ${document.getElementById('p-tempo').value} 

*Rota(s):* ${payloadBancoDados.depara}

*Observação:* ${payloadBancoDados.observacao}
*Valor:* ${payloadBancoDados.valor_corrida}
    `.trim();

    try {
        await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadBancoDados)
        });

        window.enviarMensagemParaChat(mensagemFinalChat);
        form.classList.remove('was-validated');
        
        const modalForm = bootstrap.Modal.getInstance(document.getElementById('modalFormulario'));
        if (modalForm) modalForm.hide();
        
        setTimeout(limparBackdrops, 400);

    } catch (error) {
        console.error("Erro ao salvar dados na tabela de pedidos:", error);
        window.enviarMensagemParaChat(mensagemFinalChat);
        const modalForm = bootstrap.Modal.getInstance(document.getElementById('modalFormulario'));
        if (modalForm) modalForm.hide();
        setTimeout(limparBackdrops, 400);
    } finally {
        if (btnText) btnText.innerText = "EMITIR PEDIDO";
        if (btnSpinner) btnSpinner.classList.add('d-none');
        if (btnFinalizar) btnFinalizar.disabled = false;
    }
};

window.enviarMensagemParaChat = function (texto) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const placeholder = container.querySelector('.text-muted.my-auto');
    if (placeholder) placeholder.remove();

    const div = document.createElement('div');
    div.className = 'd-flex justify-content-end mb-2'; 
    div.innerHTML = `
        <div class="bg-danger text-white p-3 rounded-4 shadow-sm" style="max-width: 80%; white-space: pre-line; font-size: 0.9rem;">
            ${texto.replace(/\n/g, '<br>')}
        </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
};

function limparBackdrops() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}