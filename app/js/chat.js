window.AppRDO = window.AppRDO || { debounceTimer: null, listaCarregada: false, observerIniciado: false };
window.dadosPedidoAtual = window.dadosPedidoAtual || {};

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

window.abrirConversa = async function (id, nome, urlImagem, isOnline) {
    // 1. Verificação de status
    const statusOnline = isOnline === true || String(isOnline).toUpperCase() === 'TRUE';

    if (!statusOnline) {
        const msgEl = document.getElementById('modal-atencao-mensagem');
        if (msgEl) msgEl.innerText = `Atenção: O cliente ${nome} está offline. Não é possível enviar mensagens.`;
        new bootstrap.Modal(document.getElementById('modalAtencao')).show();
        return;
    }

    // 2. Atualizar estado e cabeçalho
    window.AppRDO.clienteSelecionado = nome;
    window.AppRDO.clienteId = id;

    const nameEl = document.getElementById('chat-header-name');
    if (nameEl) nameEl.innerText = nome;

    // 3. Reset do Chat
    const container = document.getElementById('chat-messages-container');
    if (container) {
        container.innerHTML = '<div class="text-center text-muted my-auto"><i class="bi bi-arrow-repeat spinner-rotate"></i> Carregando histórico...</div>';
    }

    // 4. Carregar Histórico do Banco
    try {
        const todosPedidos = await API.call('getpedidos');
        const pedidosDoCliente = (Array.isArray(todosPedidos) ? todosPedidos : []).filter(p => p.id_mensagens_chat == id);

        if (container) container.innerHTML = '';

        // Renderiza com o modelo padronizado
        pedidosDoCliente.forEach(pedido => {
            // Formata rotas se vierem com quebra de linha ou vírgula
            const rotas = (pedido.depara || '').split('\n')
                .map(l => l.trim() ? `📍${l.trim()}` : '')
                .filter(l => l !== '')
                .join('\n');

            const msgFormatada = `📦 NOME: ${nome}

N.SERVIÇO: ${pedido.id || 'N/A'}
SOLICITANTE: ${pedido.solicitante || 'N/A'} | CONTATO: ${pedido.contato || 'N/A'}
HORÁRIO: ${pedido.horario || 'N/A'}
-
MERCADORIA: ${pedido.mercadoria || 'Pedido RDO'}
TROCA/RETORNO: ${pedido.troca_retorno || 'Não'}
-
ROTA(s): 
${rotas}
-
OBSERVAÇÃO: ${pedido.obs || pedido.observacao || ''}
${pedido.valor_corrida || ''}`;

            // IMPORTANTE: Passamos o pedido.id como terceiro parâmetro aqui!
            // Isso ativa o "data-pedido-id" no chat e libera o modal de motoboys.
            window.enviarMensagemParaChat(msgFormatada, false, pedido.id);
        });

    } catch (e) {
        console.error("Erro ao carregar histórico:", e);
        if (container) container.innerHTML = '<div class="text-center text-muted">Erro ao carregar histórico.</div>';
    }
};

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

window.analisarMensagemEntrada = function(texto) {
    // Expressões regulares flexíveis para encontrar os dados
    const regexSolicitante = /SOLICITANTE:\s*(.*)/i;
    const regexKM = /(?:KM|DISTÂNCIA):\s*(\d+)/i;
    const regexRota = /ROTA:\s*([\s\S]*?)(?=(?:$|TROCA|RETORNO|OBSERVAÇÃO|PRIORIDADE))/i;

    const solicitante = texto.match(regexSolicitante)?.[1]?.trim();
    const km = texto.match(regexKM)?.[1];
    const rota = texto.match(regexRota)?.[1]?.trim();

    // Validação: Só prossegue se os 3 campos existirem
    if (solicitante && km && rota) {
        return { solicitante, km, rota, valido: true };
    }
    
    return { valido: false };
};

window.iniciarFluxoCheckout = async function () {
    const msgInput = document.getElementById('msg-input');
    const msgAtencao = document.getElementById('modal-atencao-mensagem');
    const modalAtencaoEl = document.getElementById('modalAtencao');

    // 1. VERIFICAÇÃO CRÍTICA: Cliente selecionado
    if (!window.AppRDO?.clienteId) {
        if (msgAtencao) {
            msgAtencao.innerText = "Atenção: Você precisa selecionar um cliente na lista à esquerda.";
        }
        if (modalAtencaoEl) {
            new bootstrap.Modal(modalAtencaoEl).show();
        }
        return; // Interrompe o fluxo imediatamente
    }

    // 2. VERIFICAÇÃO CRÍTICA: Mensagem preenchida
    if (!msgInput || !msgInput.value.trim()) {
        if (msgAtencao) {
            msgAtencao.innerText = "Atenção: Digite ou cole a mensagem do pedido antes de enviar.";
        }
        if (modalAtencaoEl) {
            new bootstrap.Modal(modalAtencaoEl).show();
        }
        return; // Interrompe o fluxo imediatamente
    }

    // 3. FLUXO PRINCIPAL (Só executa se as validações acima passarem)
    try {
        let texto = msgInput.value;

        // Limpeza e Extração
        texto = texto.replace(/^\d+\.\s*/gm, ''); 
        const solicitante = (texto.match(/(?:SOLICITANTE|NOME|CLIENTE):\s*(.*)/i)?.[1] || "Não informado").trim();
        const contato = (texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE):\s*([\d\s\-\(\)]+)/i)?.[1] || "").trim();
        const linhasRota = texto.split('\n').filter(l => /de:/i.test(l) && /para:/i.test(l));

        if (!contato || linhasRota.length === 0) {
            throw new Error("Formato inválido. Use o padrão 'De: X Para: Y'.");
        }

        const nomeCliente = window.AppRDO.clienteSelecionado;

        // Carrega o modal de mapa
        await window.loadModal('modal_mapa.html');
        const modalEl = document.getElementById('modalMapa');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        modalEl.addEventListener('shown.bs.modal', async () => {
            const elSolicitante = document.getElementById('header-nome-solicitante');
            const resumoEl = document.getElementById('resumo-total');
            if (elSolicitante) elSolicitante.innerText = solicitante;
            if (resumoEl) resumoEl.innerHTML = 'Processando...';

            try {
                let kmTotal = 0, minTotal = 0, listaCaminhos = [];

                for (const linha of linhasRota) {
                    const p = linha.split(/Para:|\|/gi).map(x => x.replace(/De:/gi, '').trim());
                    if (p.length >= 2) {
                        const p1 = await buscarCoordenadasEndereco(p[0]);
                        const p2 = await buscarCoordenadasEndereco(p[1]);
                        if (p1 && p2) {
                            const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=full&geometries=geojson`;
                            const resp = await fetch(url);
                            const data = await resp.json();
                            if (data.routes?.[0]) {
                                kmTotal += (data.routes[0].distance / 1000);
                                minTotal += (data.routes[0].duration / 60);
                                listaCaminhos.push(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
                            }
                        }
                    }
                }

                window.dadosPedidoAtual = {
                    solicitante, contato, cliente: nomeCliente,
                    distancia: Math.round(kmTotal).toString(),
                    tempo: formatarTempoHumano(minTotal),
                    coordenadas: listaCaminhos,
                    valor: ((Math.round(kmTotal) * 3.00)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                };

                window.renderizarFooterResumo(resumoEl);
                window.renderizarMapaUnificado();
                if (typeof window.preencherDadosFormulario === 'function') window.preencherDadosFormulario();
            } catch (err) {
                if (resumoEl) resumoEl.innerHTML = `<span class="text-danger">Erro: ${err.message}</span>`;
            }
        }, { once: true });
    } catch (err) {
        window.exibirErroRodape?.(err.message);
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

window.formatarTelefone = function (tel) {
    if (!tel) return '';
    if (tel.length === 11) return tel.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    if (tel.length === 10) return tel.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    return tel;
};

window.salvarPedidoAPI = async function () {
    const btn = document.getElementById('btn-emitir-pedido');
    const errorMsg = document.getElementById('form-error-msg');
    
    if (!window.AppRDO?.clienteId) {
        errorMsg.innerText = "Erro: Selecione um cliente primeiro.";
        errorMsg.classList.remove('d-none');
        return;
    }

    const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

    // 1. Coleta todos os dados do formulário
    const d = {
        id_mensagens_chat: window.AppRDO.clienteId,
        solicitante: getVal('p-solicitante'),
        contato: getVal('p-contato'),
        horario: getVal('p-horario'),
        mercadoria: getVal('p-mercadoria'),
        retorno: getVal('p-retorno'),
        dinamica: getVal('p-dinamica'),
        prioridade: getVal('p-prioridade'),
        valor_corrida: getVal('view-valor-final'),
        obs: getVal('p-obs')
    };

    // 2. Lógica de Separação DE / PARA
    // Assume que a entrada no textarea p-rotas está como "De: X | Para: Y"
    const rotasTexto = getVal('p-rotas');
    
    // Divide pela linha, depois separa pelo "|"
    // O que estiver antes do "|" vai para 'de', o que estiver depois vai para 'para'
    const partes = rotasTexto.split('|');
    
    // Limpa os termos: remove "De:" e "Para:" se existirem, e remove espaços extras
    d.de = partes[0] ? partes[0].replace(/de:/gi, '').trim() : '';
    d.para = partes[1] ? partes[1].replace(/para:/gi, '').trim() : '';

    // 3. Validação
    if (!d.solicitante || !d.de || !d.para || !d.mercadoria) {
        errorMsg.innerText = "Preencha os campos obrigatórios (Solicitante, Rota e Mercadoria).";
        errorMsg.classList.remove('d-none');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `Processando...`;

    try {
        const resp = await API.call('finalizarpedido', d);
        
        if (resp.status !== 'success') throw new Error(resp.message);

        // Feedback no chat
        const msgFormatada = `📦 PEDIDO #${resp.id}\nSOLICITANTE: ${d.solicitante}\nDE: ${d.de}\nPARA: ${d.para}\nVALOR: ${d.valor_corrida}`;
        window.enviarMensagemParaChat(msgFormatada, false, resp.id);
        
        bootstrap.Modal.getInstance(document.getElementById('modalFormulario'))?.hide();
        window.limparBackdrops();
    } catch (err) {
        errorMsg.innerText = "Erro ao salvar: " + err.message;
        errorMsg.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        btn.innerHTML = "EMITIR PEDIDO";
    }
};

window.enviarMensagemParaChat = function (texto, isRecebida = false, pedidoId = "") {
    const container = document.getElementById('chat-messages-container');
    const div = document.createElement('div');
    div.className = 'message-wrapper';
    const msgId = 'msg-' + Date.now();

    // Note o atributo data-pedido-id="${pedidoId}"
    div.innerHTML = `
        <div class="${isRecebida ? 'message-received' : 'message-sent'}" 
             id="${msgId}" 
             data-pedido-id="${pedidoId}" 
             onclick="window.abrirModalStatus('${msgId}')"
             style="cursor: pointer;">
            <div class="message-body">${texto}</div>
            ${!isRecebida ? `
                <div class="status-icon" id="status-${msgId}" title="Clique para alterar status">
                    <span style="font-size: 24px;">⏳</span>
                </div>
            ` : ''}
        </div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
};

window.enviarMensagemGeral = async function () {
    const input = document.getElementById('msg-input');
    const texto = input?.value?.trim();
    const btnEnviar = document.getElementById('btn-enviar-mensagem'); // Ajuste o ID conforme seu HTML

    // 1. trava de segurança: Cliente obrigatório
    if (!window.AppRDO?.clienteId) {
        const msgEl = document.getElementById('modal-atencao-mensagem');
        if (msgEl) {
            msgEl.innerText = "Você precisa selecionar um cliente na lista à esquerda antes de enviar uma mensagem.";
        }
        const modalAtencao = new bootstrap.Modal(document.getElementById('modalAtencao'));
        modalAtencao.show();
        return;
    }

    // 2. Validação básica
    if (!texto) return;

    if (btnEnviar) btnEnviar.disabled = true;

    try {
        // 3. Envio para o Backend
        const resp = await API.call('sendmessage', {
            id_chat: window.AppRDO.clienteId,
            mensagem: texto
        });

        if (resp.status !== 'success') {
            throw new Error(resp.message || "Erro ao enviar mensagem.");
        }

        // 4. Sucesso: Usa sua função original de renderização
        // Passamos 'false' para isRecebida (mensagem enviada pelo atendente)
        window.enviarMensagemParaChat(texto, false, "");

        // 5. Limpeza
        if (input) input.value = '';

    } catch (err) {
        console.error("Erro no envio:", err);
        const msgEl = document.getElementById('modal-atencao-mensagem');
        if (msgEl) msgEl.innerText = "Erro: " + err.message;
        new bootstrap.Modal(document.getElementById('modalAtencao')).show();
    } finally {
        if (btnEnviar) btnEnviar.disabled = false;
    }
};

function limparBackdrops() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}