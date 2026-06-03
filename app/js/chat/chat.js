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
// 1. RENDERIZAÇÃO UNIFICADA E SEGURA
// =====================================================================
window.renderizarMapaUnificado = function () {
    // Validação de segurança: o mapa tem os dados necessários?
    if (!window.dadosPedidoAtual?.coordenadas || window.dadosPedidoAtual.coordenadas.length < 2) {
        console.warn("Mapa ignorado: dados insuficientes.");
        return;
    }

    const container = document.getElementById('container-mapa-visual');
    if (!container) return;

    // Garante visibilidade do contêiner
    container.style.display = 'block';
    container.style.height = '350px';

    // Limpa instância anterior para evitar erros de renderização
    if (window.mapaInstancia) {
        window.mapaInstancia.remove();
        window.mapaInstancia = null;
    }

    // Inicializa o mapa
    const coords = window.dadosPedidoAtual.coordenadas;
    window.mapaInstancia = L.map('container-mapa-visual').setView([coords[0].lat, coords[0].lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.mapaInstancia);

    // Renderiza as rotas (Seu loop existente...)
    // ... [mantenha sua lógica de L.polyline e L.marker aqui] ...

    // Força o ajuste do mapa após renderização
    setTimeout(() => window.mapaInstancia.invalidateSize(), 200);
};

// =====================================================================
// RENDERIZAÇÃO UNIFICADA DO RODAPÉ (NUNCA ALTERAR PARA .innerText)
// ===========================================
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
    if (!msgInput || !msgInput.value.trim()) return;

    // 1. Extrai solicitante antes de abrir o modal
    const texto = msgInput.value;
    const solicitante = texto.match(/SOLICITANTE:\s*(.*)/i)?.[1] || 'Cliente';

    await window.loadModal('modal_mapa.html');
    const modalEl = document.getElementById('modalMapa');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    modalEl.addEventListener('shown.bs.modal', async () => {
        // Atualiza header
        const elHeader = document.getElementById('header-nome-solicitante');
        if (elHeader) elHeader.innerText = solicitante;

        const resumoEl = document.getElementById('resumo-total');
        if (resumoEl) resumoEl.innerHTML = "Calculando rota e valores...";

        try {
            const linhas = msgInput.value.match(/ROTA:([\s\S]*?)(?=TROCA|PRIORIDADE|OBSERVAÇÃO|$)/i)?.[1]?.split('\n').filter(l => l.includes('De:') && l.includes('Para:')) || [];
            
            let kmTotal = 0, minTotal = 0, listaCoords = [];

            for (let linha of linhas) {
                const partes = linha.split(/Para:|De:/gi).filter(p => p.trim().length > 3);
                if (partes.length >= 2) {
                    const p1 = await buscarCoordenadasEndereco(partes[0]);
                    const p2 = await buscarCoordenadasEndereco(partes[1]);
                    if (p1 && p2) {
                        const resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=false`);
                        const data = await resp.json();
                        if (data.routes?.[0]) {
                            kmTotal += (data.routes[0].distance / 1000);
                            minTotal += (data.routes[0].duration / 60);
                            listaCoords.push(p1, p2);
                        }
                    }
                }
            }

            // AGORA 'solicitante' existe neste escopo
            window.dadosPedidoAtual = {
                solicitante: solicitante, 
                distancia: kmTotal.toFixed(1),
                tempo: formatarTempoHumano(minTotal),
                coordenadas: listaCoords,
                valor: "R$ 0,00"
            };

            window.renderizarFooterResumo(resumoEl);
            if (listaCoords.length > 0) window.renderizarMapaUnificado();
            else throw new Error("Não foi possível processar a rota.");

        } catch (err) {
            console.error("Falha no checkout:", err);
            window.exibirErroRodape("Erro: " + err.message);
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
    const dados = window.dadosPedidoAtual || {};
    const texto = document.getElementById('msg-input')?.value || '';

    // Mapeamento: ID do campo HTML -> Expressão regular para extrair
    const campos = [
        { id: 'p-solicitante', regex: /SOLICITANTE:\s*(.*)/i },
        { id: 'p-contato', regex: /\(?\d{2}\)?\s?9?\d{4,5}-?\d{4}/ },
        { id: 'p-rotas', regex: /ROTA:([\s\S]*?)(?=OBSERVAÇÃO|PRIORIDADE|$)/i },
        { id: 'p-obs', regex: /OBSERVAÇÃO:\s*(.*)/i }
    ];

    campos.forEach(c => {
        const el = document.getElementById(c.id);
        if (el) {
            const match = texto.match(c.regex);
            if (match) el.value = match[1] ? match[1].trim() : match[0];
        }
    });

    // Campos de cálculo direto do objeto
    if (document.getElementById('p-distancia')) document.getElementById('p-distancia').value = dados.distancia || '';
    if (document.getElementById('p-tempo')) document.getElementById('p-tempo').value = dados.tempo || '';

    if (typeof window.calcularTudo === 'function') window.calcularTudo();
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
    bootstrap.Modal.getInstance(document.getElementById('modalMapa'))?.hide();
    await window.loadModal('modal_form.html');
    const modal = new bootstrap.Modal(document.getElementById('modalFormulario'));
    modal.show();
    document.getElementById('modalFormulario').addEventListener('shown.bs.modal', window.preencherDadosFormulario, { once: true });
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