let debounceTimer;
let clienteSelecionado = null;
let rotasAtuais = [];
let listaCarregada = false;

// =====================================================================
// EVENTOS GLOBAIS E DELEGAÇÃO
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

document.addEventListener('click', (e) => {
    if (e.target && e.target.closest('#sync-icon-chat')) {
        window.carregarDados();
    }
});

// =====================================================================
// OBSERVAR PÁGINA 7 (Carrega automaticamente)
// =====================================================================

const observerPagina = new MutationObserver((mutations) => {
    const listaExiste = document.getElementById('lista-contatos-chat');
    
    if (listaExiste && !listaCarregada) {
        window.carregarDados();
        listaCarregada = true;
    } else if (!listaExiste) {
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
        if (syncIcon) syncIcon.classList.remove('spinner-rotate');
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
// FORMATAÇÕES HUMANAS (Tempo e KM)
// =====================================================================

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

// =====================================================================
// NOVO SISTEMA DE CÁLCULO DE ROTAS (EFEITO GOOGLE MAPS)
// =====================================================================

async function buscarCoordenadasEndereco(enderecoTexto) {
    try {
        // Limpeza básica do texto
        let termo = enderecoTexto.replace(/^[0-9\.\s]+/, '').replace(/(De:|Para:|\||-)/gi, '').trim();
        // Apenas o parâmetro q é necessário. O Nominatim entende "MG" dentro da query.
        const busca = encodeURIComponent(termo + ", MG, Brasil");
        
        // Usamos viewbox para priorizar a região de BH sem quebrar a URL
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&viewbox=-44.3,-20.2,-43.5,-19.6&bounded=1&q=${busca}`;
        
        const response = await fetch(url);
        const dados = await response.json();
        
        return (dados && dados.length > 0) ? { 
            lat: parseFloat(dados[0].lat), 
            lng: parseFloat(dados[0].lon), 
            endereco: termo 
        } : null;
    } catch (err) { return null; }
}

window.renderizarMapaUnificado = async function() {
    const container = document.getElementById('container-mapa-visual');
    if (!container) return;
    container.innerHTML = '<div id="map-instance" style="width:100%; height:100%;"></div>';
    
    const map = L.map('map-instance').setView([-19.9167, -43.9345], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const dados = window.dadosPedidoAtual;
    if (dados && dados.coordenadas && dados.coordenadas.length > 0) {
        // Marcadores
        dados.coordenadas.forEach(p => L.marker([p.lat, p.lng]).addTo(map).bindPopup(p.endereco));

        // DESENHO DA LINHA AZUL: Agora percorre os segmentos
        // Precisamos desenhar uma polilinha para cada par de coordenadas (trecho)
        for (let i = 0; i < dados.coordenadas.length; i += 2) {
            if (dados.coordenadas[i+1]) {
                const p1 = dados.coordenadas[i];
                const p2 = dados.coordenadas[i+1];
                
                // OSRM para desenhar o trajeto entre os dois pontos
                const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?geometries=geojson`;
                fetch(url).then(r => r.json()).then(data => {
                    if (data.routes && data.routes[0]) {
                        const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                        L.polyline(coords, { color: '#1a73e8', weight: 5 }).addTo(map);
                    }
                });
            }
        }
    }
};

window.iniciarFluxoCheckout = async function () {
    const msgInput = document.getElementById('msg-input');
    if (!msgInput || !msgInput.value.trim()) return;

    const texto = msgInput.value;
    const blocoRotas = texto.match(/ROTA:([\s\S]*?)(?=TROCA|PRIORIDADE|OBSERVAÇÃO|$)/i)?.[1] || '';
    const linhas = blocoRotas.split(/\n/).filter(l => l.includes('De:') && l.includes('Para:'));

    // Abre o modal
    await window.loadModal('modal_mapa.html');
    new bootstrap.Modal(document.getElementById('modalMapa')).show();

    let kmTotal = 0;
    let minTotal = 0;
    let listaCoords = [];

    for (let linha of linhas) {
        const partes = linha.split(/Para:|De:/gi).filter(p => p.trim().length > 3);
        if (partes.length >= 2) {
            const p1 = await buscarCoordenadasEndereco(partes[0]);
            const p2 = await buscarCoordenadasEndereco(partes[1]);

            if (p1 && p2) {
                // Cálculo de trecho isolado sem otimização extra
                const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=false&alternatives=false`;
                const resp = await fetch(url);
                const data = await resp.json();
                
                if (data.routes && data.routes.length > 0) {
                    // ADIÇÃO DE FILTRO: Se o trecho for maior que 60km, é um erro de geocodificação
                    const dist = data.routes[0].distance / 1000;
                    if (dist < 60) {
                        kmTotal += dist;
                        minTotal += (data.routes[0].duration / 60);
                        listaCoords.push(p1, p2);
                    }
                }
            }
        }
    }

    // Exibição
    window.dadosPedidoAtual = {
        distancia: kmTotal.toFixed(1),
        tempo: formatarTempoHumano(minTotal),
        coordenadas: listaCoords
    };

    document.getElementById('resumo-total').innerHTML = `⏱️ ${window.dadosPedidoAtual.tempo} | 📍 ${window.dadosPedidoAtual.distancia} km`;
    window.renderizarMapaUnificado();
};

async function calcularTrechoIndividual(p1, p2) {
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
        
        // Aplica o calculo real nos campos invisíveis/visíveis
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

    // Converte a string "14.2" para float matematicamente
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
            elResumoTotal.innerHTML = `<span class="text-dark fw-medium" style="font-size: 16px;">⏱️ ${window.dadosPedidoAtual.tempo}</span> <span style="color: #dc3545; font-weight: bold; font-size: 16px; margin-left: 10px;">📍 ${window.dadosPedidoAtual.distancia} km</span>`;
        }

        setTimeout(() => {
            window.renderizarMapaUnificado();
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