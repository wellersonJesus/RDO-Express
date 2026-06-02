// =====================================================================
// PROTEÇÃO CONTRA DUPLA DECLARAÇÃO
// =====================================================================

window.AppRDO = window.AppRDO || {
    debounceTimer: null,
    listaCarregada: false,
    observerIniciado: false
};

// =====================================================================
// EVENTOS E OBSERVERS
// =====================================================================
// (Mantenha seus EventListeners aqui, apenas troque debounceTimer por window.AppRDO.debounceTimer)

window.filtrarContatos = function () {
    clearTimeout(window.AppRDO.debounceTimer);
    window.AppRDO.debounceTimer = setTimeout(() => {
        const termo = document.getElementById('chat-search')?.value.toLowerCase().trim() || '';
        document.querySelectorAll('.contact-item-clean').forEach(item => {
            const nome = item.querySelector('.contact-name')?.innerText.toLowerCase() || '';
            item.style.setProperty('display', nome.includes(termo) ? 'flex' : 'none', 'important');
        });
    }, 300);
};

// =====================================================================
// OBSERVER PROTEGIDO E DEBUGÁVEL
// =====================================================================
if (!window.AppRDO.observerIniciado) {
    console.log("Iniciando MutationObserver para lista de contatos...");
    
    new MutationObserver((mutations) => {
        try {
            const listaExiste = document.getElementById('lista-contatos-chat');
            
            if (listaExiste) {
                if (!window.AppRDO.listaCarregada) {
                    console.log("Lista detectada! Carregando dados...");
                    window.AppRDO.listaCarregada = true;
                    
                    // Verificação de segurança: a função existe?
                    if (typeof window.carregarDados === 'function') {
                        window.carregarDados().catch(err => {
                            console.error("Erro ao executar carregarDados:", err);
                        });
                    } else {
                        console.error("ERRO: window.carregarDados não está definida!");
                    }
                }
            } else {
                // Se a lista sumiu do DOM, reseta o estado
                if (window.AppRDO.listaCarregada) {
                    console.log("Lista removida do DOM. Resetando estado.");
                    window.AppRDO.listaCarregada = false;
                }
            }
        } catch (err) {
            console.error("Erro crítico no MutationObserver:", err);
        }
    }).observe(document.body, { childList: true, subtree: true });
    
    window.AppRDO.observerIniciado = true;
} else {
    console.warn("O Observer já estava iniciado. Tentativa de duplicação bloqueada.");
}

// =====================================================================
// EVENTOS GLOBAIS E DELEGAÇÃO
// =====================================================================

document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'chat-search') window.filtrarContatos();
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
// FUNÇÕES DE CONTATOS E CHAT
// =====================================================================

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

window.renderizarMapaUnificado = function() {
    // 1. Validação de segurança
    if (!window.dadosPedidoAtual || !window.dadosPedidoAtual.coordenadas || window.dadosPedidoAtual.coordenadas.length === 0) {
        console.warn("Sem coordenadas para renderizar.");
        return;
    }

    const coords = window.dadosPedidoAtual.coordenadas;
    
    // 2. Inicialização do Mapa (se não existir)
    if (!window.mapaInstancia) {
        const mapEl = document.getElementById('mapa-container'); // ID do seu div de mapa
        if (!mapEl) return;
        
        window.mapaInstancia = L.map('mapa-container').setView([coords[0].lat, coords[0].lng], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(window.mapaInstancia);
    }

    // 3. Limpeza de camadas anteriores (para não sobrepor linhas)
    window.mapaInstancia.eachLayer(layer => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            window.mapaInstancia.removeLayer(layer);
        }
    });

    // 4. Desenho dos Pontos e Linha Azul
    const latlngs = coords.map(c => [c.lat, c.lng]);
    
    // Desenha a Linha Azul
    L.polyline(latlngs, {
        color: '#0d6efd', // Azul Bootstrap
        weight: 6,
        opacity: 0.8,
        smoothFactor: 1
    }).addTo(window.mapaInstancia);

    // Desenha os marcadores (Origem, Pontos intermediários, Destino)
    latlngs.forEach((latlng, index) => {
        L.circleMarker(latlng, {
            radius: 8,
            fillColor: index === 0 ? "#28a745" : (index === latlngs.length - 1 ? "#dc3545" : "#ffc107"),
            color: "#fff",
            weight: 2,
            fillOpacity: 1
        }).addTo(window.mapaInstancia).bindPopup(index === 0 ? "Origem" : "Destino");
    });

    // 5. Ajuste automático do zoom
    window.mapaInstancia.fitBounds(latlngs, { padding: [50, 50] });
};

window.iniciarFluxoCheckout = async function () {
    const msgInput = document.getElementById('msg-input');
    if (!msgInput || !msgInput.value.trim()) return;

    const texto = msgInput.value;
    
    // Extração melhorada: garante que o nome do solicitante seja capturado
    const solicitanteMatch = texto.match(/SOLICITANTE:\s*(.*)/i);
    const solicitante = solicitanteMatch ? solicitanteMatch[1].trim() : 'Cliente';
    
    const blocoRotas = texto.match(/ROTA:([\s\S]*?)(?=TROCA|PRIORIDADE|OBSERVAÇÃO|$)/i)?.[1] || '';
    const linhas = blocoRotas.split(/\n/).filter(l => l.includes('De:') && l.includes('Para:'));

    // Abre o modal
    await window.loadModal('modal_mapa.html');
    const modalEl = document.getElementById('modalMapa');
    const modalMapa = new bootstrap.Modal(modalEl);
    modalMapa.show();
    
    // Atualiza o cabeçalho do solicitante no modal (ID precisa existir no seu HTML)
    const elHeader = document.getElementById('header-nome-solicitante');
    if (elHeader) elHeader.innerText = solicitante;

    document.getElementById('resumo-total').innerText = "Calculando rota...";

    let kmTotal = 0;
    let minTotal = 0;
    let listaCoords = [];

    for (let linha of linhas) {
        const partes = linha.split(/Para:|De:/gi).filter(p => p.trim().length > 3);
        if (partes.length >= 2) {
            const p1 = await buscarCoordenadasEndereco(partes[0]);
            const p2 = await buscarCoordenadasEndereco(partes[1]);

            if (p1 && p2) {
                const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=false`;
                try {
                    const resp = await fetch(url);
                    const data = await resp.json();
                    if (data.routes && data.routes.length > 0) {
                        const dist = data.routes[0].distance / 1000;
                        if (dist < 60) {
                            kmTotal += dist;
                            minTotal += (data.routes[0].duration / 60);
                            listaCoords.push(p1, p2);
                        }
                    }
                } catch (e) { console.error("Erro no cálculo:", e); }
            }
        }
    }

    // Comunicação com seu servidor para valor final
    let valorFinal = 0;
    try {
        const respPreco = await fetch('/api/calcular-rota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                coordenadas: listaCoords,
                prioridade: texto.includes('Urgente') ? 'Urgente' : 'Normal',
                retorno: texto.includes('TROCA/RETORNO') ? 'SIM' : 'NÃO'
            })
        });
        const dataPreco = await respPreco.json();
        valorFinal = dataPreco.valor_taxa || 0;
    } catch (e) { console.error("Erro no servidor de precificação:", e); }

    // Salva globalmente para uso no formulário e mapa
    window.dadosPedidoAtual = {
        solicitante: solicitante,
        distancia: kmTotal.toFixed(1),
        tempo: formatarTempoHumano(minTotal),
        coordenadas: listaCoords,
        valor: valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    };

    document.getElementById('resumo-total').innerHTML = `⏱️ ${window.dadosPedidoAtual.tempo} | 📍 ${window.dadosPedidoAtual.distancia} km | 💰 ${window.dadosPedidoAtual.valor}`;
    
    // Pequeno delay para garantir que o modal esteja renderizado antes de desenhar o mapa
    setTimeout(() => {
        if (typeof window.renderizarMapaUnificado === 'function') {
            window.renderizarMapaUnificado();
        }
    }, 500);
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

// =====================================================================
// TRANSIÇÃO FORMULÁRIO E FINALIZAÇÃO
// =====================================================================

window.prosseguirParaFormulario = async function () {
    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    if (modalMapa) modalMapa.hide();

    await window.loadModal('modal_form.html');
    const modalForm = new bootstrap.Modal(document.getElementById('modalFormulario'));
    modalForm.show();

    // Aguarda o modal estar visível para preencher os inputs
    setTimeout(() => {
        const textoOriginal = document.getElementById('msg-input').value;
        const dados = window.dadosPedidoAtual; // Dados calculados no mapa

        if (dados) {
            // Preenchimento das métricas calculadas
            document.getElementById('p-distancia').value = dados.distancia;
            document.getElementById('p-tempo').value = dados.tempo;
            
            // Preenchimento do Itinerário (Lista de Rotas)
            // Extrai apenas a parte da rota do texto original
            const rotas = textoOriginal.match(/ROTA:([\s\S]*?)(?=TROCA|PRIORIDADE|OBSERVAÇÃO|$)/i)?.[1]?.trim() || '';
            document.getElementById('p-rotas').value = rotas;

            // Preenchimento do Telefone/Contato
            // Procura por formatos como (XX) XXXXX-XXXX ou apenas números
            const telefone = textoOriginal.match(/(?:\(\d{2}\)\s*)?\d{4,5}-?\d{4}/)?.[0] || '';
            document.getElementById('p-contato').value = telefone;

            // Outros campos
            document.getElementById('p-solicitante').value = dados.solicitante;
            
            // Dispara o recálculo do valor final baseado nos novos dados carregados
            if (typeof window.calcularTudo === 'function') {
                window.calcularTudo();
            }
        }
    }, 500);
};

window.calcularTudo = function () {
    const km = parseFloat(document.getElementById('p-distancia')?.value) || 0;
    const valorKm = parseFloat(document.getElementById('p-valor-km')?.value) || 2.20;
    const prioridade = parseFloat(document.getElementById('p-prioridade')?.value) || 0;
    const retorno = parseFloat(document.getElementById('p-retorno')?.value) || 0; // Ex: 0.5 para 50%
    
    let valorBase = km * valorKm;
    valorBase += prioridade;
    
    // Aplica a taxa de retorno se houver
    if (retorno > 0) {
        valorBase += (valorBase * retorno);
    }

    const viewValorFinal = document.getElementById('view-valor-final');
    if (viewValorFinal) {
        viewValorFinal.innerText = valorBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
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