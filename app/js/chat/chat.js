// =====================================================================
// PROTEÇÃO E ESTADO GLOBAL
// =====================================================================
window.AppRDO = window.AppRDO || { debounceTimer: null, listaCarregada: false, observerIniciado: false };
window.dadosPedidoAtual = window.dadosPedidoAtual || {};

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
document.addEventListener('DOMContentLoaded', () => {
    const inputContato = document.getElementById('p-contato');
    if (inputContato) {
        inputContato.addEventListener('input', function (e) {
            let val = e.target.value.replace(/\D/g, '');
            if (val.length > 11) val = val.substring(0, 11);
            e.target.value = window.formatarTelefone(val);
        });
    }
});

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

// =====================================================================
// 1. RENDERIZAÇÃO UNIFICADA DO RODAPÉ (NUNCA ALTERAR PARA .innerText) E SEGURA
// =====================================================================
window.renderizarMapaUnificado = function () {
    const container = document.getElementById('container-mapa-visual');
    if (!container || !window.dadosPedidoAtual?.coordenadas) return;

    if (window.mapaInstancia) { window.mapaInstancia.remove(); window.mapaInstancia = null; }

    const coords = window.dadosPedidoAtual.coordenadas;
    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']; // Lista de cores para rotas
    
    window.mapaInstancia = L.map('container-mapa-visual').setView([coords[0].lat, coords[0].lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.mapaInstancia);

    // Definição dos ícones
    const criarIcone = (html) => L.divIcon({ html: `<div style="font-size: 20px;">${html}</div>`, className: 'custom-div-icon' });
    const iconeBandeira = criarIcone('🏁');
    const iconeParada = criarIcone('📌');
    const iconeFinal = criarIcone('📍');

    const listaRotas = document.getElementById('p-rotas')?.value.split('\n').filter(l => l.includes('De:')) || [];

    for (let i = 0; i < coords.length; i += 2) {
        if (!coords[i + 1]) break;
        
        const cor = cores[(i / 2) % cores.length];
        const descricao = listaRotas[i / 2] || "Rota";

        // Linha com cor dinâmica
        L.polyline([ [coords[i].lat, coords[i].lng], [coords[i+1].lat, coords[i+1].lng] ], 
            { color: cor, weight: 5, dashArray: '10, 10' }).addTo(window.mapaInstancia);

        // Ícone Início (Bandeira)
        L.marker([coords[i].lat, coords[i].lng], { icon: iconeBandeira }).addTo(window.mapaInstancia).bindTooltip(descricao);

        // Lógica: Se for último ponto, ícone FINAL, se não, ícone PARADA
        const iconePonto = (i + 2 >= coords.length) ? iconeFinal : iconeParada;
        L.marker([coords[i+1].lat, coords[i+1].lng], { icon: iconePonto }).addTo(window.mapaInstancia).bindTooltip(descricao);
    }
    window.mapaInstancia.fitBounds(coords.map(c => [c.lat, c.lng]), { padding: [50, 50] });
};

window.exibirErroRodape = function (mensagem) {
    const el = document.getElementById('resumo-total');
    if (el) el.innerHTML = `<span class="text-danger small"><i class="bi bi-exclamation-triangle"></i> ${mensagem}</span>`;
    console.error("ERRO RDO:", mensagem);
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

window.iniciarFluxoCheckout = async function () {
    const msgInput = document.getElementById('msg-input');
    if (!msgInput || !msgInput.value.trim()) {
        console.warn("Input de mensagem vazio ou inválido.");
        return;
    }

    // 1. Extração inicial protegida
    const texto = msgInput.value;
    const solicitanteMatch = texto.match(/SOLICITANTE:\s*(.*)/i);
    const solicitante = solicitanteMatch ? solicitanteMatch[1].trim() : 'Cliente';

    // 2. Carregamento do Modal
    try {
        await window.loadModal('modal_mapa.html');
    } catch (e) {
        console.error("Erro ao carregar o modal do mapa:", e);
        return;
    }

    const modalEl = document.getElementById('modalMapa');
    if (!modalEl) {
        console.error("Elemento 'modalMapa' não encontrado no DOM.");
        return;
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // 3. Execução pós-abertura do modal
    modalEl.addEventListener('shown.bs.modal', async () => {
        const elHeader = document.getElementById('header-nome-solicitante');
        const resumoEl = document.getElementById('resumo-total');
        
        if (elHeader) elHeader.innerText = solicitante;
        if (resumoEl) resumoEl.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Calculando rota...';

        try {
            // Regex para capturar rotas de forma segura
            const rotaMatch = msgInput.value.match(/ROTA:([\s\S]*?)(?=TROCA|PRIORIDADE|OBSERVAÇÃO|$)/i);
            const linhas = rotaMatch ? rotaMatch[1].split('\n').filter(l => l.includes('De:') && l.includes('Para:')) : [];
            
            if (linhas.length === 0) throw new Error("Nenhuma rota válida encontrada no formato solicitado.");

            let kmTotal = 0, minTotal = 0, listaCoords = [];

            for (const linha of linhas) {
                const partes = linha.split(/Para:|De:/gi).filter(p => p.trim().length > 3);
                if (partes.length >= 2) {
                    const p1 = await buscarCoordenadasEndereco(partes[0]);
                    const p2 = await buscarCoordenadasEndereco(partes[1]);
                    
                    if (p1 && p2) {
                        const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=false`;
                        const resp = await fetch(url);
                        const data = await resp.json();
                        
                        if (data.routes?.[0]) {
                            kmTotal += (data.routes[0].distance / 1000);
                            minTotal += (data.routes[0].duration / 60);
                            listaCoords.push(p1, p2);
                        }
                    }
                }
            }

            if (listaCoords.length === 0) throw new Error("Não foi possível calcular trajetos válidos.");

            // 4. Cálculo do Valor (Exemplo: R$ 3,00/km)
            const precoPorKm = 3.00;
            const valorCalculado = (kmTotal * precoPorKm).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // 5. Persistência de Estado (Fonte única da verdade)
            window.dadosPedidoAtual = {
                solicitante: solicitante,
                distancia: kmTotal.toFixed(1),
                tempo: formatarTempoHumano(minTotal),
                coordenadas: listaCoords,
                valor: valorCalculado
            };

            // 6. Renderização
            window.renderizarFooterResumo(resumoEl);
            window.renderizarMapaUnificado();

        } catch (err) {
            console.error("Erro no processamento da rota:", err);
            window.exibirErroRodape(err.message);
        }
    }, { once: true });
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
window.preencherDadosFormulario = function () {
    try {
        console.log("Iniciando preenchimento do formulário...");
        const dados = window.dadosPedidoAtual || {};
        const texto = document.getElementById('msg-input')?.value || '';

        // 1. Mapeamento de Campos (Regex)
        const campos = [
            { id: 'p-solicitante', regex: /SOLICITANTE:\s*(.*)/i },
            { id: 'p-contato', regex: /\(?\d{2}\)?\s?9?\d{4,5}-?\d{4}/ },
            { id: 'p-rotas', regex: /ROTA:([\s\S]*?)(?=TROCA|RETORNO|OBSERVAÇÃO|PRIORIDADE|$)/i },
            { id: 'p-obs', regex: /OBSERVAÇÃO:\s*(.*)/i }
        ];

        campos.forEach(c => {
            const el = document.getElementById(c.id);
            if (el) {
                const match = texto.match(c.regex);
                if (match) {
                    el.value = match[1] ? match[1].trim() : match[0];
                }
            } else {
                console.warn(`Elemento não encontrado: ${c.id}`);
            }
        });

        // 2. Garantia do Solicitante
        const elSolicitante = document.getElementById('p-solicitante');
        if (elSolicitante && !elSolicitante.value) {
            elSolicitante.value = dados.solicitante || 'Cliente';
        }

        // 3. Preenchimento de Cálculos e Seletores
        if (document.getElementById('p-distancia')) document.getElementById('p-distancia').value = dados.distancia || '0';
        if (document.getElementById('p-tempo')) document.getElementById('p-tempo').value = dados.tempo || '0 min';

        // 4. Seleção Automática de Dinâmica e Prioridade baseada no texto
        const elDin = document.getElementById('p-dinamica');
        if (elDin) {
            if (texto.includes('Taxa 05')) elDin.value = '15';
            else if (texto.includes('Taxa 04')) elDin.value = '10';
            else if (texto.includes('Taxa 03')) elDin.value = '7';
            else if (texto.includes('Taxa 02')) elDin.value = '5';
            else elDin.value = '0';
        }

        const elPrior = document.getElementById('p-prioridade');
        if (elPrior) {
            if (texto.includes('Urgente')) elPrior.value = '7';
            else if (texto.includes('Agendado')) elPrior.value = '5';
            else elPrior.value = '0';
        }

        // 5. Execução do Cálculo Final
        if (typeof window.calcularTudo === 'function') {
            window.calcularTudo();
            console.log("Formulário preenchido e cálculo realizado com sucesso.");
        }

    } catch (error) {
        console.error("ERRO CRÍTICO no preenchimento do formulário:", error);
    }
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

// =====================================================================
// UTILS
// =====================================================================
window.formatarTelefone = function (tel) {
    if (!tel) return '';
    if (tel.length === 11) return tel.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    if (tel.length === 10) return tel.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    return tel;
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