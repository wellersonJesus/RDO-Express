// =====================================================================
// PROTEÇÃO E ESTADO GLOBAL
// =====================================================================
window.AppRDO = window.AppRDO || { debounceTimer: null, listaCarregada: false, observerIniciado: false };
window.dadosPedidoAtual = window.dadosPedidoAtual || {};

// =====================================================================
// EVENTOS E OBSERVERS DE SEGURANÇA
// =====================================================================
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

if (!window.AppRDO.observerIniciado) {
    new MutationObserver((mutations) => {
        const listaExiste = document.getElementById('lista-contatos-chat');
        
        // Só dispara se a lista for detectada pela primeira vez ou após reset
        if (listaExiste && !window.AppRDO.listaCarregada) {
            console.log("Detectado DOM: Carregando contatos...");
            window.carregarDados();
        }
    }).observe(document.body, { childList: true, subtree: true });

    window.AppRDO.observerIniciado = true;
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
    // Verifica se clicou no ícone de sincronizar ou no pai dele
    if (e.target.closest('#sync-icon-chat')) {
        console.log("Sincronização manual iniciada...");
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
    listEl.style.opacity = "0.5";

    try {
        const clientes = await API.call('getclientes') || [];
        const isMasterOn = localStorage.getItem('bot_master_active') === 'true';

        listEl.innerHTML = clientes.length > 0 ? clientes.map(cliente => {
            const id = cliente.id || '';
            const nome = (cliente.nome || cliente.username || 'Sem nome').replace(/'/g, "\\'");
            const imagem = cliente.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            const isOnline = isMasterOn && String(cliente.status || '').toUpperCase() === 'TRUE';
            const statusColor = isOnline ? '#28a745' : '#adb5bd';

            // A MUDANÇA ESTÁ AQUI NO ONCLICK (passamos o isOnline agora):
            return `
                <div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean" 
                     onclick="window.abrirConversa('${id}', '${nome}', '${imagem}', ${isOnline})">
                    <div class="position-relative">
                        <img src="${imagem}" class="rounded-circle" style="width:35px; height:35px; object-fit:cover;">
                        <span class="position-absolute bottom-0 end-0 rounded-circle border border-white" 
                              style="width:10px; height:10px; background-color: ${statusColor};"></span>
                    </div>
                    <div class="ms-3 overflow-hidden">
                        <div class="contact-name">${nome}</div>
                        <div class="small text-muted">${isOnline ? 'Online' : 'Offline'}</div>
                    </div>
                </div>
            `;
        }).join('') : '<div class="p-3 text-center text-muted">Nenhum contato encontrado.</div>';

        window.AppRDO.listaCarregada = true;
    } catch (e) {
        console.error("Erro ao sincronizar:", e);
    } finally {
        if (syncIcon) syncIcon.classList.remove('spinner-rotate');
        listEl.style.opacity = "1";
    }
};

window.abrirConversa = function (id, nome, urlImagem, isOnline) {
    // Verifica status booleano ou string
    const statusOnline = isOnline === true || String(isOnline).toUpperCase() === 'TRUE';

    if (!statusOnline) {
        // Atualiza a mensagem
        const msgEl = document.getElementById('modal-atencao-mensagem');
        if (msgEl) msgEl.innerText = `Atenção: O cliente ${nome} está offline. Não é possível enviar mensagens.`;
        
        // Abre o modal
        const modalElement = document.getElementById('modalAtencao');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        return; 
    }

    // Se estiver online, segue o fluxo normal
    window.AppRDO.clienteSelecionado = nome;
    window.AppRDO.clienteId = id;
    const nameEl = document.getElementById('chat-header-name');
    if (nameEl) nameEl.innerText = nome;
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

    const trajetos = window.dadosPedidoAtual.coordenadas;
    const cores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    
    window.mapaInstancia = L.map('container-mapa-visual').setView(trajetos[0][0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.mapaInstancia);

    const criarIcone = (html) => L.divIcon({ 
        html: `<div style="font-size: 18px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">${html}</div>`, 
        className: 'custom-div-icon',
        iconSize: [25, 25]
    });

    trajetos.forEach((caminho, index) => {
        const cor = cores[index % cores.length];

        // 1. Desenha o trajeto real
        L.polyline(caminho, { 
            color: cor, 
            weight: 5, 
            dashArray: '8, 8',
            opacity: 0.9 
        }).addTo(window.mapaInstancia);

        // 2. Lógica de Ícones Inteligente para evitar sobreposição
        // Se for o primeiro trajeto, coloca Bandeira no início
        if (index === 0) {
            L.marker(caminho[0], { icon: criarIcone('🏁') }).addTo(window.mapaInstancia);
        }

        // Se for o último trajeto, coloca o marcador FINAL
        if (index === trajetos.length - 1) {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('📍') }).addTo(window.mapaInstancia);
        } else {
            // Pontos de parada intermediários (onde acaba um e começa o outro)
            // Deslocamos levemente o ícone ou usamos um marcador de conexão para não esconder a bandeira
            L.marker(caminho[caminho.length - 1], { 
                icon: criarIcone('🔄') // Ícone de transição/parada intermediária
            }).addTo(window.mapaInstancia);
        }
    });
    
    const todosPontos = trajetos.flat();
    window.mapaInstancia.fitBounds(todosPontos, { padding: [50, 50] });
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
    try {
        const msgInput = document.getElementById('msg-input');
        if (!msgInput?.value.trim()) throw new Error("A mensagem do pedido está vazia.");

        const texto = msgInput.value;
        const solicitante = (texto.match(/SOLICITANTE:\s*(.*)/i)?.[1] || 'Cliente').trim();
        const nomeCliente = window.AppRDO?.clienteSelecionado || 'Nenhum cliente selecionado';

        await window.loadModal('modal_mapa.html');
        const modalEl = document.getElementById('modalMapa');
        if (!modalEl) throw new Error("Estrutura do modal não encontrada.");
        
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        modalEl.addEventListener('shown.bs.modal', async () => {
            const elCliente = document.getElementById('header-nome-cliente');
            const elSolicitante = document.getElementById('header-nome-solicitante');
            const resumoEl = document.getElementById('resumo-total');
            
            if (elCliente) elCliente.innerText = nomeCliente;
            if (elSolicitante) elSolicitante.innerText = solicitante;
            if (resumoEl) resumoEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Traçando rota real...';

            try {
                const rotaMatch = texto.match(/ROTA:([\s\S]*?)(?=TROCA|RETORNO|OBSERVAÇÃO|PRIORIDADE|$)/i);
                const linhas = rotaMatch ? rotaMatch[1].split('\n').filter(l => l.includes('De:') && l.includes('Para:')) : [];
                
                if (linhas.length === 0) throw new Error("Nenhuma rota válida encontrada.");

                let kmTotal = 0, minTotal = 0, listaCaminhos = [];

                for (const linha of linhas) {
                    const partes = linha.split(/Para:|De:/gi).filter(p => p.trim().length > 3);
                    if (partes.length >= 2) {
                        const p1 = await buscarCoordenadasEndereco(partes[0]);
                        const p2 = await buscarCoordenadasEndereco(partes[1]);
                        
                        if (p1 && p2) {
                            // A chave está aqui: overview=full e geometries=geojson
                            const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=full&geometries=geojson`;
                            const resp = await fetch(url);
                            const data = await resp.json();
                            
                            if (data.routes?.[0]) {
                                kmTotal += (data.routes[0].distance / 1000);
                                minTotal += (data.routes[0].duration / 60);
                                // Converte [lng, lat] para [lat, lng] para o Leaflet
                                const pontosRota = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                                listaCaminhos.push(pontosRota);
                            }
                        }
                    }
                }

                if (listaCaminhos.length === 0) throw new Error("Não foi possível traçar o trajeto.");

                window.dadosPedidoAtual = {
                    solicitante: solicitante,
                    cliente: nomeCliente,
                    distancia: Math.round(kmTotal).toString(),
                    tempo: formatarTempoHumano(minTotal),
                    coordenadas: listaCaminhos, // Agora listaCaminhos é um array de trajetos
                    valor: ((Math.round(kmTotal) * 3.00)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                };

                window.renderizarFooterResumo(resumoEl);
                window.renderizarMapaUnificado();
                if (typeof window.preencherDadosFormulario === 'function') window.preencherDadosFormulario();

            } catch (err) {
                console.error("Erro no trajeto:", err);
                if (resumoEl) resumoEl.innerHTML = `<span class="text-danger small">Erro: ${err.message}</span>`;
            }
        }, { once: true });
    } catch (err) {
        console.error("Erro crítico:", err);
        window.exibirErroRodape?.("Erro: " + err.message);
    }
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
        const dados = window.dadosPedidoAtual || {};
        const msgInput = document.getElementById('msg-input');
        const texto = msgInput ? msgInput.value : '';

        // 1. Definição do Nome do Cliente (Fonte de Verdade: AppRDO)
        // Se AppRDO estiver vazio, tenta ler do header do chat, se falhar, assume 'Não identificado'
        const nomeCliente = window.AppRDO?.clienteSelecionado || 
                            document.getElementById('chat-header-name')?.innerText || 
                            'Não identificado';

        // Atualiza o header dentro do formulário (fixo para o problema de exibição)
        const elHeader = document.getElementById('header-nome-cliente');
        if (elHeader) {
            elHeader.innerText = nomeCliente;
            elHeader.classList.remove('text-muted'); // Remove o estilo de 'Carregando...'
            elHeader.classList.add('text-dark');
        }

        // 2. Mapeamento de campos fixos
        const campos = [
            { id: 'p-solicitante', regex: /SOLICITANTE:\s*(.*)/i, fallback: nomeCliente },
            { id: 'p-contato', regex: /\(?\d{2}\)?\s?9?\d{4,5}-?\d{4}/ },
            { id: 'p-rotas', regex: /ROTA:([\s\S]*?)(?=TROCA|RETORNO|OBSERVAÇÃO|PRIORIDADE|$)/i },
            { id: 'p-obs', regex: /OBSERVAÇÃO:\s*(.*)/i }
        ];

        campos.forEach(c => {
            const el = document.getElementById(c.id);
            if (el) {
                const match = texto.match(c.regex);
                // Se encontrar o match, usa ele. Se não, usa o fallback (ex: nome do cliente no solicitante)
                el.value = match ? (match[1] ? match[1].trim() : match[0].trim()) : (c.fallback || '');
            }
        });

        // 3. Preenchimento de Cálculos (Objeto dadosPedidoAtual)
        if (document.getElementById('p-distancia')) document.getElementById('p-distancia').value = dados.distancia || '0';
        if (document.getElementById('p-tempo')) document.getElementById('p-tempo').value = dados.tempo || '0 min';
        
        // 4. Horário
        const elHorario = document.getElementById('p-horario');
        if (elHorario && !elHorario.value) {
            elHorario.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // 5. Lógica de Seletores Automáticos
        const elDin = document.getElementById('p-dinamica');
        if (elDin) {
            const taxaMatch = texto.match(/Taxa 0([1-5])/i);
            const valoresTaxa = { '1': '0', '2': '5', '3': '7', '4': '10', '5': '15' };
            elDin.value = taxaMatch ? (valoresTaxa[taxaMatch[1]] || '0') : '0';
        }

        const elPrior = document.getElementById('p-prioridade');
        if (elPrior) {
            if (/Urgente/i.test(texto)) elPrior.value = '7';
            else if (/Agendado/i.test(texto)) elPrior.value = '5';
            else elPrior.value = '0';
        }

        // 6. Recalculo final
        if (typeof window.calcularTudo === 'function') window.calcularTudo();

    } catch (error) {
        console.error("ERRO CRÍTICO no preenchimento do formulário:", error);
        window.exibirErroRodape?.("Erro ao carregar dados: " + error.message);
    }
};

window.calcularTudo = function () {
    try {
        // Função utilitária: limpa a string, troca vírgula por ponto e garante float
        const parse = (id) => {
            const val = document.getElementById(id)?.value;
            if (!val) return 0;
            // Remove qualquer caractere que não seja dígito, ponto ou vírgula
            const limpo = String(val).replace(',', '.');
            return parseFloat(limpo) || 0;
        };

        const km = parse('p-distancia');
        const valorKm = parse('p-valor-km');
        const taxaDin = parse('p-dinamica');
        const prioridade = parse('p-prioridade');
        const retorno = parse('p-retorno');

        // Cálculo Preciso
        let subtotal = (km * valorKm) + taxaDin + prioridade;
        let total = subtotal + (subtotal * retorno);

        // Formatação Final
        const view = document.getElementById('view-valor-final');
        if (view) {
            view.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    } catch (error) {
        console.error("ERRO NO CÁLCULO:", error.message);
        const view = document.getElementById('view-valor-final');
        if (view) view.innerText = "Erro no cálculo";
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
    const btn = document.querySelector('[onclick="window.salvarPedidoAPI()"]');
    const form = document.getElementById('form-checkout');
    
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    // 1. ATIVAR SPINNER IMEDIATAMENTE
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i class="bi bi-arrow-repeat spinner-rotate"></i> Processando...`;
    btn.disabled = true;

    try {
        const dados = {
            id_mensagens_chat: window.AppRDO.clienteId || 'N/A',
            solicitante: document.getElementById('p-solicitante').value,
            contato: document.getElementById('p-contato').value,
            horario: document.getElementById('p-horario').value,
            mercadoria: "Pedido RDO",
            depara: document.getElementById('p-rotas').value,
            troca_retorno: document.getElementById('p-retorno').options[document.getElementById('p-retorno').selectedIndex].text,
            prioridade: document.getElementById('p-prioridade').options[document.getElementById('p-prioridade').selectedIndex].text,
            valor_corrida: document.getElementById('view-valor-final').innerText.replace('R$ ', ''),
            observacao: document.getElementById('p-obs').value,
            status: '⏳ Aguardando'
        };

        const response = await API.call('addpedido', dados);
        if (response.status === 'error') throw new Error(response.message);

        // 2. FORMATAR MENSAGEM PADRÃO RDO
        const msg = `📦 NOME: ${window.AppRDO?.clienteSelecionado || 'N/A'}

N.SERVIÇO: ${response.id || 'RDO'}
SOLICITANTE: ${dados.solicitante}
CONTATO: ${dados.contato}
MERCADORIA: ${dados.mercadoria}
ROTA: ${dados.depara}
HORÁRIO: ${dados.horario}
TROCA/RETORNO: ${dados.troca_retorno}
OBSERVAÇÃO: ${dados.observacao}`;

        // 3. FINALIZAR UI
        bootstrap.Modal.getInstance(document.getElementById('modalFormulario')).hide();
        
        // Envia para o chat e avisa o usuário
        window.enviarMensagemParaChat(msg);
        alert("Pedido emitido com sucesso!");

    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    } finally {
        // Restaurar botão
        btn.innerHTML = originalContent;
        btn.disabled = false;
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