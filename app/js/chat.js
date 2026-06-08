window.AppRDO = window.AppRDO || { 
    debounceTimer: null, 
    listaCarregada: false, 
    isFetching: false,
    isProcessingCheckout: false 
};

window.iniciarChat = async () => await window.carregarDados();

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

document.addEventListener('input', (e) => {
    if (e.target?.id === 'p-contato') {
        let val = e.target.value.replace(/\D/g, '');
        e.target.value = typeof window.formatarTelefone === 'function' ? window.formatarTelefone(val) : val;
    }
    if (e.target?.id === 'chat-search') window.filtrarContatos();
});

document.addEventListener('change', (e) => {
    // 3. Cálculo de formulário (agora com segurança de escopo)
    if (e.target && e.target.closest('#modalFormulario')) {
        if (typeof window.calcularTudo === 'function') {
            window.calcularTudo();
        }
    }
});

document.addEventListener('click', function(e) {
    // Verifica se o clique foi no ícone de sync ou no pai dele
    if (e.target.closest('#sync-icon-chat')) {
        const syncIcon = document.getElementById('sync-icon-chat');
        if (syncIcon && !window.AppRDO.isFetching) {
            console.log("Sincronização manual iniciada...");
            syncIcon.classList.add('spinner-rotate');
            
            // Chama a função global
            window.carregarDados().finally(() => {
                syncIcon.classList.remove('spinner-rotate');
            });
        }
    }
});

window.carregarDados = async function () {
    const listEl = document.getElementById('lista-contatos-chat');
    const syncIcon = document.getElementById('sync-icon-chat');

    if (!listEl) return;
    if (window.AppRDO.isFetching) return;

    window.AppRDO.isFetching = true;
    if (syncIcon) syncIcon.classList.add('spinner-rotate');

    // ESTADO: BUSCANDO
    listEl.innerHTML = `
        <div class="chat-status-container" style="height: 200px;">
            <i class="bi bi-search icon-status-large spinner-rotate"></i>
            <div class="status-label-gray">Buscando contatos...</div>
        </div>
    `;

    try {
        const clientes = await API.call('getclientes');
        const listaClientes = Array.isArray(clientes) ? clientes : [];

        if (listaClientes.length === 0) {
            listEl.innerHTML = `
                <div class="chat-status-container" style="height: 200px;">
                    <i class="bi bi-bootstrap-reboot icon-status-large"></i>
                    <div class="status-label-gray">Nenhum contato disponível.</div>
                </div>`;
        } else {
            listEl.innerHTML = listaClientes.map(cliente => {
                const id = String(cliente.id || '');
                const nome = (cliente.nome || cliente.username || 'Sem nome');
                const isOnline = String(cliente.status || '').toUpperCase() === 'TRUE';
                const statusColor = isOnline ? '#28a745' : '#adb5bd';
                const img = cliente.imagem || cliente.foto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

                return `
                    <div class="list-group-item list-group-item-action contact-item-clean" 
                         id="item-contato-${id}"
                         onclick="window.selecionarEAbrir('${id}', '${nome.replace(/'/g, "\\'")}', ${isOnline})">
                        <div class="position-relative">
                            <img src="${img}" class="rounded-circle" style="width:35px; height:35px; object-fit:cover;">
                            <span class="position-absolute bottom-0 end-0 rounded-circle border border-white" 
                                  style="width:10px; height:10px; background-color: ${statusColor};"></span>
                        </div>
                        <div class="ms-3 overflow-hidden">
                            <div class="contact-name">${nome}</div>
                            <div class="small text-muted">${isOnline ? 'Online' : 'Offline'}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (e) {
        listEl.innerHTML = `
            <div class="chat-status-container text-danger" style="height: 200px;">
                <i class="bi bi-exclamation-triangle icon-status-large"></i>
                <div class="status-label-gray">Falha ao conectar com servidor.</div>
            </div>`;
    } finally {
        window.AppRDO.isFetching = false;
        if (syncIcon) syncIcon.classList.remove('spinner-rotate');
    }
};

window.selecionarEAbrir = function(id, nome, isOnline) {
    window.AppRDO.clienteId = id;
    window.AppRDO.clienteSelecionado = nome;
    window.abrirConversa(id, nome, null, isOnline);
};

window.abrirConversa = async function (id, nome, urlImagem, isOnline) {
    const container = document.getElementById('chat-messages-container');
    const idLimpo = String(id).replace(/\D/g, '');
    
    const nameEl = document.getElementById('chat-header-name');
    if (nameEl) {
        nameEl.innerText = nome;
        nameEl.className = 'text-dark fw-bold';
    }

    // ESTADO: BUSCANDO - Usando o padrão de lupa giratória
    container.innerHTML = `
        <div class="chat-status-container">
            <i class="bi bi-search icon-status-large spinner-rotate"></i>
            <div class="status-label-gray" style="margin-top: 10px;">Buscando mensagens...</div>
        </div>
    `;

    try {
        const todasMensagens = await API.call('getchat');
        if (!todasMensagens) throw new Error("Falha ao obter dados");

        const historico = (Array.isArray(todasMensagens) ? todasMensagens : []).filter(m => 
            String(m.jid_numero || "").trim() === idLimpo
        );

        container.innerHTML = ''; // Limpa o estado de loading

        if (historico.length === 0) {
            // ESTADO: VAZIO - Usando o ícone Bootstrap Premium
            container.innerHTML = `
                <div class="chat-status-container">
                    <i class="bi bi-bootstrap-reboot icon-status-large"></i>
                    <div class="status-label-gray" style="margin-top: 10px;">Nenhum histórico encontrado.</div>
                </div>
            `;
        } else {
            historico.forEach(msg => {
                window.enviarMensagemParaChat(msg.texto || "Sem conteúdo", false, msg.pedido_id);
            });
        }
    } catch (e) {
        container.innerHTML = `
            <div class="chat-status-container text-danger">
                <i class="bi bi-exclamation-triangle icon-status-large"></i>
                <div class="status-label-gray" style="margin-top: 10px;">Erro ao carregar histórico.</div>
            </div>
        `;
    }
};

window.abrirModalEdicao = function(msgId) {
    Swal.fire({
        title: 'Gerenciar Mensagem',
        text: 'O que deseja fazer com esta mensagem?',
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Ver Status',
        denyButtonText: 'Excluir',
        cancelButtonText: 'Fechar',
        confirmButtonColor: '#dc3545',
        denyButtonColor: '#6c757d'
    }).then((result) => {
        if (result.isConfirmed) {
            window.abrirModalStatus(msgId);
        } else if (result.isDenied) {
            // Lógica de exclusão
            const el = document.getElementById(msgId);
            if (el) el.parentElement.remove();
        }
    });
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

window.analisarMensagemEntrada = function (texto) {
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
    const texto = msgInput?.value?.trim();

    if (!texto) {
        window.exibirModalAviso("Por favor, digite os dados do pedido.");
        return;
    }

    // Processamento dos dados
    const solicitante = (texto.match(/(?:SOLICITANTE|NOME|CLIENTE):\s*(.*)/i)?.[1] || "Não informado").trim();
    const contato = (texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE):\s*([\d\s\-\(\)]+)/i)?.[1] || "").trim();
    const linhasRota = texto.split('\n').filter(l => /de:/i.test(l) && /para:/i.test(l));

    if (linhasRota.length === 0) {
        window.exibirModalAviso("Formato de rota inválido. Use 'De: X Para: Y'.");
        return;
    }

    // Carrega o modal do mapa
    await window.loadModal('modal_mapa.html');
    const modalEl = document.getElementById('modalMapa');
    const modal = new bootstrap.Modal(modalEl);
    
    // Adiciona evento ONCE para rodar apenas quando o modal abrir
    modalEl.addEventListener('shown.bs.modal', async () => {
        const elSolicitante = document.getElementById('header-nome-solicitante');
        const resumoEl = document.getElementById('resumo-total');
        if (elSolicitante) elSolicitante.innerText = solicitante;
        if (resumoEl) resumoEl.innerHTML = 'Calculando rotas...';

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

            // ATUALIZAÇÃO DO ESTADO GLOBAL (Para ser lido pelo formulário depois)
            window.dadosPedidoAtual = {
                solicitante, contato, 
                cliente: window.AppRDO.clienteSelecionado,
                distancia: Math.round(kmTotal).toString(),
                tempo: formatarTempoHumano(minTotal),
                coordenadas: listaCaminhos,
                valor: (Math.round(kmTotal) * 3.00).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                rawInput: texto // Salva o input original aqui
            };

            window.renderizarFooterResumo(resumoEl);
            window.renderizarMapaUnificado();
        } catch (err) {
            if (resumoEl) resumoEl.innerHTML = `<span class="text-danger">Erro: ${err.message}</span>`;
        }
    }, { once: true });

    modal.show();
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
        const nomeCliente = window.AppRDO?.clienteSelecionado ||
            document.getElementById('chat-header-name')?.innerText ||
            'Não identificado';

        // Atualiza o header dentro do formulário
        const elHeader = document.getElementById('header-nome-cliente');
        if (elHeader) {
            elHeader.innerText = nomeCliente;
            elHeader.classList.remove('text-muted');
            elHeader.classList.add('text-dark');
        }

        // 2. Mapeamento de campos fixos (Solicitante, Rota, Observação)
        const campos = [
            { id: 'p-solicitante', regex: /(?:SOLICITANTE|NOME):\s*(.*)/i, fallback: nomeCliente },
            { id: 'p-rotas', regex: /ROTA:([\s\S]*?)(?=TROCA|RETORNO|OBSERVAÇÃO|PRIORIDADE|$)/i },
            { id: 'p-obs', regex: /OBSERVAÇÃO:\s*(.*)/i, fallback: 'N/A' }
        ];

        campos.forEach(c => {
            const el = document.getElementById(c.id);
            if (el) {
                const match = texto.match(c.regex);
                el.value = match ? (match[1] ? match[1].trim() : match[0].trim()) : (c.fallback || '');
            }
        });

        // 3. CAPTURA INTELIGENTE E FORÇADA DO TELEFONE
        // Esta Regex busca qualquer formato de número (com ou sem DDD, com ou sem parênteses/hífen)
        const elContato = document.getElementById('p-contato');
        if (elContato) {
            // Busca o padrão: (DDD) 9XXXX-XXXX ou apenas números
            const regexTel = /(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/;
            const matchTel = texto.match(regexTel);

            if (matchTel) {
                // Limpa o que foi capturado, deixando apenas números
                let numLimpo = matchTel[0].replace(/\D/g, '');
                // Aplica a formatação via sua função global
                elContato.value = window.formatarTelefone(numLimpo);
            }
        }

        // 4. Preenchimento de Cálculos (OSRM)
        if (document.getElementById('p-distancia')) document.getElementById('p-distancia').value = dados.distancia || '0';
        if (document.getElementById('p-tempo')) document.getElementById('p-tempo').value = dados.tempo || '0 min';

        // 5. Horário (Hora atual caso esteja vazio)
        const elHorario = document.getElementById('p-horario');
        if (elHorario && !elHorario.value) {
            elHorario.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // 6. Lógica de Valores Dinâmicos (Taxas/Prioridade)
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

        // 7. Recálculo final do valor da corrida
        if (typeof window.calcularTudo === 'function') {
            window.calcularTudo();
        }

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

window.avancarParaFormulario = function () {
    document.getElementById('step-mapa').classList.add('d-none');
    document.getElementById('step-formulario').classList.remove('d-none');
    
    // Dispara preenchimento do formulário
    if (typeof window.preencherDadosFormulario === 'function') {
        window.preencherDadosFormulario();
    }
};

window.voltarParaChat = function () {
    document.getElementById('step-formulario').classList.add('d-none');
    document.getElementById('step-mapa').classList.add('d-none');
    document.getElementById('step-chat').classList.remove('d-none');
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
    let val = String(tel).replace(/\D/g, ''); // Remove tudo que não é número

    // Fixo com 8 dígitos (XXXX-XXXX)
    if (val.length === 8) {
        return val.replace(/^(\d{4})(\d{4})$/, '$1-$2');
    }
    // Fixo com 10 dígitos (DDD + 8 dígitos)
    if (val.length === 10) {
        return val.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    // Celular com 11 dígitos (DDD + 9 + 4 + 4)
    if (val.length === 11) {
        return val.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    }
    return val;
};

window.salvarPedidoAPI = async function () {
    const btn = document.getElementById('btn-emitir-pedido');
    const camposObrigatorios = ['p-solicitante', 'p-contato', 'p-mercadoria', 'p-rotas'];
    let ehValido = true;

    camposObrigatorios.forEach(id => {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) {
            el.classList.add('is-invalid');
            ehValido = false;
        } else {
            el.classList.remove('is-invalid');
        }
    });

    if (!ehValido) return;

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Emitindo...`;

    try {
        const getVal = (id) => document.getElementById(id)?.value?.trim() || 'N/A';
        const valorFinal = document.getElementById('view-valor-final')?.innerText || 'R$ 0,00';

        const rotasRaw = getVal('p-rotas').split('\n');
        const rotasFormatadas = rotasRaw.map((l, i) => {
            const partes = l.split('|');
            return `📍${i + 1}. De: ${partes[0]?.trim() || ''} | \n      Para: ${partes[1]?.trim() || ''}`;
        }).join('\n');

        const msgFormatada = `📦 SOLICITANTE: ${getVal('p-solicitante')}

N.SERVIÇO: [ID_GERADO]
SOLICITANTE: ${getVal('p-solicitante')} 
CONTATO: ${getVal('p-contato')} | HR: ${getVal('p-horario')}
-
MERCADORIA: ${getVal('p-mercadoria')}
RETORNO: ${getVal('p-retorno') === '0.6' ? 'Sim' : 'Não'}
-
ROTA(s): 
${rotasFormatadas}
-
OBSERVAÇÃO: ${getVal('p-obs')}
${valorFinal}`;

        const payload = {
            action: 'finalizarpedido',
            id_chat: String(window.AppRDO.clienteId),
            solicitante: getVal('p-solicitante'),
            contato: getVal('p-contato'),
            horario: getVal('p-horario'),
            mercadoria: getVal('p-mercadoria'),
            rotas_texto: getVal('p-rotas'),
            valor_corrida: valorFinal,
            observacao: getVal('p-obs'),
            mensagem: msgFormatada
        };

        const resp = await API.call('finalizarpedido', payload);

        if (resp?.status === 'success') {
            const msgFinal = msgFormatada.replace('[ID_GERADO]', resp.id);
            // IMPORTANTE: Ao enviar para o chat, garantimos que o pedidoId esteja presente
            window.enviarMensagemParaChat(msgFinal, false, resp.id);

            document.getElementById('msg-input').value = '';
            bootstrap.Modal.getInstance(document.getElementById('modalFormulario'))?.hide();
        } else {
            throw new Error(resp?.message || "Erro ao salvar.");
        }
    } catch (err) {
        console.error("Erro:", err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = "EMITIR PEDIDO";
    }
};

window.enviarMensagemParaChat = function (texto, isRecebida = false, pedidoId = "") {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    // Se não houver pedidoId (ex: mensagem de sistema), gera um temporário
    const dataId = pedidoId || 'msg-' + Date.now();
    
    const div = document.createElement('div');
    div.className = 'message-wrapper';
    
    // O div wrapper da mensagem recebe o clique para exibir status ou excluir
    div.innerHTML = `
        <div class="${isRecebida ? 'message-received' : 'message-sent'}" 
             id="${dataId}"
             onclick="window.abrirModalEdicao('${dataId}')"
             onmouseover="this.style.filter='brightness(0.95)'"
             onmouseout="this.style.filter='brightness(1)'">
             
            <div class="message-body">${texto.replace(/\n/g, '<br>')}</div>
            
            ${!isRecebida ? `
                <div class="status-icon" title="Clique para gerenciar status" onclick="event.stopPropagation(); window.abrirModalStatus('${dataId}')">
                    <i class="bi bi-check2-circle" style="color: #28a745 !important;"></i>
                </div>
            ` : ''}
        </div>
    `;
    
    container.appendChild(div);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
};

window.enviarMensagemGeral = async function () {
    const input = document.getElementById('msg-input');
    
    // Validações
    if (!window.AppRDO?.clienteId) {
        Swal.fire('Atenção', 'Selecione um cliente na lista primeiro.', 'warning');
        return;
    }
    
    if (!input || !input.value.trim()) {
        Swal.fire('Atenção', 'Digite o pedido antes de enviar.', 'warning');
        return;
    }

    // Dispara o fluxo
    console.log("Iniciando fluxo de checkout para:", window.AppRDO.clienteSelecionado);
    await window.iniciarFluxoCheckout(); 
};

window.exibirModalAviso = function(mensagem) {
    const elModal = document.getElementById('modalAtencao');
    const elTexto = document.getElementById('modal-atencao-mensagem');
    
    if (elTexto) {
        elTexto.innerText = mensagem;
    }
    
    if (elModal) {
        const bsModal = new bootstrap.Modal(elModal);
        bsModal.show();
    } else {
        // Fallback caso o elemento não exista no DOM
        alert(mensagem);
    }
};

function limparBackdrops() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}