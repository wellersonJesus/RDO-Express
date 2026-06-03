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
    if (!window.dadosPedidoAtual || !window.dadosPedidoAtual.coordenadas || window.dadosPedidoAtual.coordenadas.length < 2) return;

    const coords = window.dadosPedidoAtual.coordenadas;
    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    // 1. ATUALIZAÇÃO DO RODAPÉ (Fonte: leve, sem negrito, menor)
    const rodape = document.getElementById('resumo-total');
    if (rodape) {
        rodape.style.fontSize = "0.85rem";
        rodape.style.fontWeight = "400";
        rodape.style.color = "#6c757d";
        rodape.innerHTML = `
            <span style="margin-right: 15px;">${window.dadosPedidoAtual.tempo}</span>
            <span style="margin-right: 15px;">${window.dadosPedidoAtual.distancia} km</span>
            <span style="color: #212529;">${window.dadosPedidoAtual.valor}</span>
        `;
    }

    // 2. EXTRAÇÃO DAS ROTAS (Para exibir no hover)
    const textoRotas = document.getElementById('p-rotas')?.value || "";
    // Limpa a string para pegar apenas as linhas válidas da rota
    const listaRotas = textoRotas.split('\n').filter(l => l.includes('De:') && l.includes('Para:'));

    // 3. Ícones
    const iconeBandeira = L.divIcon({
        html: '<div style="font-size: 24px;">🏁</div>',
        className: 'custom-div-icon',
        iconSize: [30, 30], iconAnchor: [15, 30]
    });

    const iconeDestino = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
    });

    if (!window.mapaInstancia) {
        window.mapaInstancia = L.map('container-mapa-visual').setView([coords[0].lat, coords[0].lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.mapaInstancia);
    }

    window.mapaInstancia.eachLayer(layer => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) window.mapaInstancia.removeLayer(layer);
    });

    const todosPontos = [];
    for (let i = 0; i < coords.length - 1; i += 2) {
        const pInicio = coords[i];
        const pFim = coords[i + 1];
        const corAtual = cores[(i / 2) % cores.length];
        
        // Pega a descrição da rota baseada no índice
        const descricaoRota = listaRotas[i / 2] || `Rota ${i/2 + 1}`;

        // Linha pontilhada
        L.polyline([[pInicio.lat, pInicio.lng], [pFim.lat, pFim.lng]], {
            color: corAtual, weight: 4, opacity: 0.8, dashArray: '8, 8'
        }).addTo(window.mapaInstancia);

        // Marcador Partida: Exibe a rota inteira no hover
        L.marker([pInicio.lat, pInicio.lng], { icon: iconeBandeira })
         .addTo(window.mapaInstancia)
         .bindTooltip(descricaoRota, { permanent: false, direction: 'top', className: 'tooltip-rota' });

        // Marcador Destino: Exibe a rota inteira no hover
        L.marker([pFim.lat, pFim.lng], { icon: iconeDestino })
         .addTo(window.mapaInstancia)
         .bindTooltip(descricaoRota, { permanent: false, direction: 'top', className: 'tooltip-rota' });

        todosPontos.push([pInicio.lat, pInicio.lng], [pFim.lat, pFim.lng]);
    }

    window.mapaInstancia.fitBounds(todosPontos, { padding: [50, 50] });
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
    // 1. Oculta o modal do mapa de forma segura
    const modalMapaEl = document.getElementById('modalMapa');
    const modalMapa = bootstrap.Modal.getInstance(modalMapaEl);
    if (modalMapa) modalMapa.hide();

    // 2. Carrega o formulário e exibe
    await window.loadModal('modal_form.html');
    const modalFormEl = document.getElementById('modalFormulario');
    const modalForm = new bootstrap.Modal(modalFormEl);
    modalForm.show();

    // 3. Preenchimento inteligente com delay para garantir carregamento do DOM
    setTimeout(() => {
        const texto = document.getElementById('msg-input')?.value || '';
        const dados = window.dadosPedidoAtual || {};

        // Mapeamento dos campos (Certifique-se de que estes IDs existam no seu modal_form.html)
        document.getElementById('p-solicitante').value = dados.solicitante || 'Não identificado';
        document.getElementById('p-contato').value = texto.match(/\(\d{2}\)\s?9?\d{4}-?\d{4}/)?.[0] || '';
        document.getElementById('p-horario').value = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        document.getElementById('p-distancia').value = dados.distancia || 0;
        document.getElementById('p-tempo').value = dados.tempo || '0 min';
        
        // Extração de Rotas (Regex robusta)
        const rotasMatch = texto.match(/ROTA:([\s\S]*?)(?=OBSERVAÇÃO|$)/i);
        document.getElementById('p-rotas').value = rotasMatch ? rotasMatch[1].trim() : '';
        
        // Dispara o cálculo inicial
        if (typeof window.calcularTudo === 'function') {
            window.calcularTudo();
        }
    }, 500);
};

window.calcularTudo = function () {
    // Função utilitária para capturar valores e tratar vírgulas
    const parse = (id) => {
        const val = document.getElementById(id)?.value;
        if (!val) return 0;
        // Transforma vírgula em ponto para cálculo e converte em float
        return parseFloat(String(val).replace(',', '.')) || 0;
    };
    
    const km = parse('p-distancia');
    const valorKm = parse('p-valor-km');
    const taxaDin = parse('p-dinamica');
    const prioridade = parse('p-prioridade');
    const retorno = parse('p-retorno'); // 0 ou 0.6 (60%)
    
    // Cálculo do subtotal + taxas fixas
    let subtotal = (km * valorKm) + taxaDin + prioridade;
    
    // Aplicação da taxa de retorno
    let total = subtotal + (subtotal * retorno);
    
    // Atualização visual
    const view = document.getElementById('view-valor-final');
    if (view) {
        view.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    // Coleta dados dos inputs do formulário
    const payload = {
        solicitante: document.getElementById('p-solicitante')?.value || 'N/A',
        contato: document.getElementById('p-contato').value,
        horario: document.getElementById('p-horario').value,
        mercadoria: document.getElementById('p-mercadoria').value,
        distancia: document.getElementById('p-distancia').value,
        tempo: document.getElementById('p-tempo').value,
        rotas: document.getElementById('p-rotas').value,
        observacao: document.getElementById('p-obs').value,
        valor: document.getElementById('view-valor-final').innerText
    };

    console.log("Enviando Pedido:", payload);
    // ... restante da sua lógica de fetch ...
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