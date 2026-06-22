window.marcarCampoInvalido = function () {
    var input = document.getElementById('msg-input');
    if (!input) return;
    input.style.border = '2px solid #dc3545';
    input.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
    input.setAttribute('placeholder', '⚠️ Digite os dados do pedido aqui...');
    setTimeout(function () {
        input.style.border = '';
        input.style.boxShadow = '';
        input.setAttribute('placeholder', 'Digite o pedido...');
    }, 3000);
};

window.marcarCampoFormInvalido = function (campo) {
    if (!campo) return;
    campo.style.border = '2px solid #dc3545';
    campo.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
    setTimeout(function () {
        campo.style.border = '';
        campo.style.boxShadow = '';
    }, 3000);
};

window.AppRDO = window.AppRDO || {
    debounceTimer: null,
    listaCarregada: false,
    isFetching: false,
    isProcessingCheckout: false,
    pedidosCache: [],
    motoboyCache: [],
    pedidoEmEdicao: null,
    clienteId: null,
    clienteSelecionado: null,
    clientesCache: [],
    mensagensCache: [],
    isMasterOn: false
};

window.dadosPedidoAtual = window.dadosPedidoAtual || {};

function _getOrCreateModal(el, options) {
    if (!el) return null;
    var existing = bootstrap.Modal.getInstance(el);
    if (existing) return existing;
    return new bootstrap.Modal(el, options || {});
}

function _disposeModal(el) {
    if (!el) return;
    try {
        var instance = bootstrap.Modal.getInstance(el);
        if (instance) {
            instance.hide();
            instance.dispose();
        }
    } catch (_) {}
}

function _limparModalContainer() {
    var container = document.getElementById('modal-container');
    if (!container) return;
    container.querySelectorAll('.modal').forEach(function (modalEl) {
        _disposeModal(modalEl);
    });
    document.querySelectorAll('.modal-backdrop').forEach(function (bd) {
        bd.remove();
    });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    container.innerHTML = '';
}

window.loadModal = function (arquivo) {
    _limparModalContainer();
    var container = document.getElementById('modal-container');
    if (!container) return Promise.resolve(false);
    return fetch('pages/chat/' + arquivo)
        .then(function (resp) {
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return resp.text();
        })
        .then(function (html) {
            container.innerHTML = html;
            return true;
        })
        .catch(function () {
            return false;
        });
};

window.iniciarChat = async function () {
    await window.carregarDados();
};

document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'p-contato') {
        var val = e.target.value.replace(/\D/g, '');
        e.target.value = typeof window.formatarTelefone === 'function'
            ? window.formatarTelefone(val) : val;
    }
    if (e.target && e.target.id === 'chat-search') {
        window.filtrarContatos();
    }
    if (e.target && e.target.closest && e.target.closest('#modalFormulario')) {
        e.target.style.border = '';
        e.target.style.boxShadow = '';
    }
    if (e.target && e.target.id === 'msg-input') {
        e.target.style.border = '';
        e.target.style.boxShadow = '';
        e.target.setAttribute('placeholder', 'Digite o pedido...');
    }
});

document.addEventListener('change', function (e) {
    if (e.target && e.target.closest && e.target.closest('#modalFormulario')) {
        e.target.style.border = '';
        e.target.style.boxShadow = '';
        if (typeof window.calcularTudo === 'function') {
            window.calcularTudo();
        }
    }
});

window.MODELO_PADRAO = [
    '📦 Olá! Para agilizarmos o pedido, por favor preencha os dados abaixo:',
    '',
    'SOLICITANTE: ',
    'CONTATO: ',
    'HORÁRIO ESTIMADO P/ COLETA:  ',
    'MERCADORIA: (Sacola, Coleta, Bolsa, Envelope)',
    'ROTA(s): ',
    '📍1. De: ... | Para: ...',
    '📍2. De: ... | Para: ... ',
    '📍3. De: ... | Para: ... ',
    'RETORNO:  (SIM /NÃO)',
    'PRIORIDADE: (Normal, Agendado, Urgente) ',
    'OBSERVAÇÃO: Descreva a observação aqui se necessario',
    '',
    'Assim que enviar esta mensagem preenchida, ',
    'calcularemos á sua taxa! 🏁'
].join('\n');

window.CAMPOS_OBRIGATORIOS_MSG = [
    { chave: 'SOLICITANTE', regex: /(?:SOLICITANTE|NOME|CLIENTE):\s*(.+)/i },
    { chave: 'CONTATO', regex: /(?:CONTATO|CONATO|TEL|TELEFONE):\s*([\d\s\-\(\)]+)/i },
    { chave: 'ROTA', regex: /de:\s*.+\s*\|?\s*para:\s*.+/i }
];

window.validarClienteOnline = function () {
    if (!window.AppRDO || !window.AppRDO.clienteId) return false;
    var cliente = window.AppRDO.clientesCache.find(function (c) {
        return String(c.id) === String(window.AppRDO.clienteId);
    });
    if (!cliente) return false;
    return window.AppRDO.isMasterOn &&
        String(cliente.status || '').toUpperCase() === 'TRUE';
};

window.validarMensagemModelo = function (texto) {
    if (!texto || !texto.trim()) {
        return { valido: false, tipo: 'vazio' };
    }
    var temSolicitante = false;
    var temContato = false;
    var temRota = false;
    var regexSolicitante = /(?:SOLICITANTE|NOME|CLIENTE)\s*:\s*(.+)/i;
    var matchSolicitante = texto.match(regexSolicitante);
    if (matchSolicitante && matchSolicitante[1] && matchSolicitante[1].trim().length > 0) {
        temSolicitante = true;
    }
    var regexContato = /(?:CONTATO|CONATO|TEL|TELEFONE)\s*:\s*(.+)/i;
    var matchContato = texto.match(regexContato);
    if (matchContato && matchContato[1] && matchContato[1].trim().length > 0) {
        temContato = true;
    }
    var linhas = texto.split('\n');
    var quantidadeRotas = 0;
    for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i].trim();
        if (/de\s*:/i.test(linha) && /para\s*:/i.test(linha)) {
            var valorDe = linha.match(/de\s*:\s*([^|]+)/i);
            var valorPara = linha.match(/para\s*:\s*(.+)/i);
            var dePreenchido = valorDe && valorDe[1] && valorDe[1].trim().length > 0 && valorDe[1].trim() !== '...';
            var paraPreenchido = valorPara && valorPara[1] && valorPara[1].trim().length > 0 && valorPara[1].trim() !== '...';
            if (dePreenchido && paraPreenchido) {
                quantidadeRotas++;
            }
        }
    }
    temRota = quantidadeRotas >= 1;
    if (temSolicitante && temContato && temRota) {
        return { valido: true, tipo: 'ok', rotas: quantidadeRotas };
    }
    var faltando = [];
    if (!temSolicitante) faltando.push('SOLICITANTE');
    if (!temContato) faltando.push('CONTATO');
    if (!temRota) faltando.push('ROTA (De: ... | Para: ...)');
    return {
        valido: false,
        tipo: 'modelo',
        camposPendentes: faltando
    };
};

window.exibirModalValidacao = function (mensagem, opcoes) {
    opcoes = opcoes || {};
    var modalEl = document.getElementById('modalValidacao');
    if (!modalEl) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: opcoes.icone === 'bi-check-circle-fill' ? 'success' : 'warning',
                title: opcoes.titulo || 'Atenção',
                html: mensagem,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Entendi'
            });
        } else {
            alert(mensagem.replace(/<[^>]*>/g, ''));
        }
        return;
    }
    var msgEl = document.getElementById('modal-validacao-mensagem');
    if (msgEl) msgEl.innerHTML = mensagem;
    var iconeEl = document.getElementById('modal-validacao-icone');
    var tituloEl = document.getElementById('modal-validacao-titulo');
    if (iconeEl) {
        iconeEl.className = 'bi ' + (opcoes.icone || 'bi-exclamation-triangle-fill') + ' text-warning fs-4';
    }
    if (tituloEl) {
        tituloEl.innerText = opcoes.titulo || 'Atenção';
    }
    var modeloContainer = document.getElementById('modal-validacao-modelo');
    var textareaEl = document.getElementById('modal-validacao-textarea');
    if (opcoes.modelo && modeloContainer && textareaEl) {
        textareaEl.value = opcoes.modelo;
        modeloContainer.classList.remove('d-none');
    } else if (modeloContainer) {
        modeloContainer.classList.add('d-none');
    }
    document.querySelectorAll('.modal.show').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) {
            try { inst.hide(); } catch (_) {}
        }
    });
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    try {
        var instanciaExistente = bootstrap.Modal.getInstance(modalEl);
        if (instanciaExistente) {
            try { instanciaExistente.dispose(); } catch (_) {}
        }
        var modal = new bootstrap.Modal(modalEl);
        modal.show();
    } catch (err) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                html: mensagem,
                confirmButtonColor: '#dc3545'
            });
        } else {
            alert(mensagem.replace(/<[^>]*>/g, ''));
        }
    }
};

window.copiarModeloValidacao = function () {
    var texto = document.getElementById('modal-validacao-textarea');
    if (!texto) return;
    texto.select();
    document.execCommand('copy');
    var btn = texto.nextElementSibling;
    if (btn) {
        var original = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2 me-1"></i> Copiado!';
        btn.classList.remove('btn-outline-danger');
        btn.classList.add('btn-success');
        setTimeout(function () {
            btn.innerHTML = original;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-danger');
        }, 2000);
    }
};

window.limparCampoInvalido = function () {
    var input = document.getElementById('msg-input');
    if (!input) return;
    input.style.border = '';
    input.style.boxShadow = '';
    input.setAttribute('placeholder', 'Digite o pedido...');
};

window.filtrarContatos = function () {
    clearTimeout(window.AppRDO.debounceTimer);
    window.AppRDO.debounceTimer = setTimeout(function () {
        var searchEl = document.getElementById('chat-search');
        var termo = (searchEl ? searchEl.value : '').toLowerCase().trim();
        document.querySelectorAll('.contact-item-clean').forEach(function (item) {
            var nameEl = item.querySelector('.contact-name');
            var nome = (nameEl ? nameEl.innerText : '').toLowerCase();
            item.style.setProperty('display', nome.includes(termo) ? 'flex' : 'none', 'important');
        });
    }, 300);
};

function _mostrarLoadingContatos() {
    var listEl = document.getElementById('lista-contatos-chat');
    if (!listEl) return;
    listEl.innerHTML =
        '<div class="text-center text-muted py-4">' +
        '<div class="spinner-border spinner-border-sm text-danger opacity-50"></div>' +
        '<div class="mt-2 chat-loading-text">Buscando clientes<span class="chat-dots"></span></div>' +
        '</div>';
}

function _mostrarLoadingMensagens() {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML =
        '<div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">' +
        '<div class="spinner-border spinner-border-sm text-danger opacity-50"></div>' +
        '<div class="mt-2 chat-loading-text">Buscando mensagens<span class="chat-dots"></span></div>' +
        '</div>';
}

function _mostrarChatEmptyState(texto) {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML =
        '<div class="chat-empty-state">' +
        '<div class="chat-empty-label">' + texto + '</div>' +
        '</div>';
}

function _mostrarContatosEmptyState(texto) {
    var listEl = document.getElementById('lista-contatos-chat');
    if (!listEl) return;
    listEl.innerHTML =
        '<div class="chat-empty-state">' +
        '<div class="chat-empty-label">' + texto + '</div>' +
        '</div>';
}

function _spinChatOn() {
    var btn = document.getElementById('btn-sync-chat');
    var icon = document.getElementById('sync-icon-header');
    if (btn) { btn.classList.add('syncing'); btn.disabled = true; }
    if (icon) icon.classList.add('spinner-rotate');
}

function _spinChatOff() {
    var btn = document.getElementById('btn-sync-chat');
    var icon = document.getElementById('sync-icon-header');
    if (btn) { btn.classList.remove('syncing'); btn.disabled = false; }
    if (icon) icon.classList.remove('spinner-rotate');
}

window.carregarDados = async function () {
    var listEl = document.getElementById('lista-contatos-chat');
    var searchInput = document.getElementById('chat-search');
    if (!listEl || window.AppRDO.isFetching) return;
    window.AppRDO.isFetching = true;
    _spinChatOn();
    _mostrarLoadingContatos();
    if (searchInput) searchInput.placeholder = 'Sincronizando...';
    try {
        var results = await Promise.all([
            API.call('getclientes'),
            API.call('getchat'),
            API.call('getpedidos')
        ]);
        var listaClientes = Array.isArray(results[0]) ? results[0] : [];
        var listaMensagens = Array.isArray(results[1]) ? results[1] : [];
        var listaPedidos = Array.isArray(results[2]) ? results[2] : [];
        var isMasterOn = localStorage.getItem('bot_master_active') === 'true';
        window.AppRDO.clientesCache = listaClientes;
        window.AppRDO.mensagensCache = listaMensagens;
        window.AppRDO.pedidosCache = listaPedidos;
        window.AppRDO.isMasterOn = isMasterOn;
        window.renderizarLista(listaClientes, isMasterOn);
        if (!window.AppRDO.clienteId && listaClientes.length > 0) {
            var primeiro = listaClientes[0];
            var id = String(primeiro.id || '');
            var nome = primeiro.username || 'Sem nome';
            var isOnline = isMasterOn && String(primeiro.status || '').toUpperCase() === 'TRUE';
            window.selecionarEAbrir(id, nome, isOnline);
        } else if (window.AppRDO.clienteId) {
            var clienteAtual = listaClientes.find(function (c) {
                return String(c.id) === String(window.AppRDO.clienteId);
            });
            if (clienteAtual) {
                var nomeAtual = clienteAtual.username || 'Sem nome';
                var isOnlineAtual = isMasterOn && String(clienteAtual.status || '').toUpperCase() === 'TRUE';
                window.abrirConversa(window.AppRDO.clienteId, nomeAtual, null, isOnlineAtual);
            }
        } else {
            _mostrarChatEmptyState('Nenhum contato disponível');
        }
        window.AppRDO.listaCarregada = true;
        if (searchInput) searchInput.placeholder = 'Buscar cliente...';
    } catch (e) {
        _mostrarContatosEmptyState('Erro ao carregar dados');
        _mostrarChatEmptyState('Erro ao carregar mensagens');
    } finally {
        window.AppRDO.isFetching = false;
        _spinChatOff();
    }
};

window.renderizarLista = function (lista, isMasterOn) {
    var listEl = document.getElementById('lista-contatos-chat');
    if (!listEl) return;
    if (lista.length === 0) {
        _mostrarContatosEmptyState('Nenhum contato disponível');
        return;
    }
    var clienteAtivo = window.AppRDO.clienteId;
    listEl.innerHTML = lista.map(function (cliente) {
        var id = String(cliente.id || '');
        var nome = cliente.username || 'Sem nome';
        var imagem = cliente.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        var isOnline = isMasterOn && String(cliente.status || '').toUpperCase() === 'TRUE';
        var statusColor = isOnline ? '#28a745' : '#adb5bd';
        var isActive = id === String(clienteAtivo);
        var nomeEscapado = nome.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return '<div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean ' +
            (isActive ? 'active-contact' : '') + '" ' +
            'id="item-contato-' + id + '" ' +
            'onclick="window.selecionarEAbrir(\'' + id + '\', \'' + nomeEscapado + '\', ' + isOnline + ')">' +
            '<div class="position-relative">' +
            '<img src="' + imagem + '" class="rounded-circle contact-avatar" ' +
            'onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">' +
            '<span class="position-absolute bottom-0 end-0 rounded-circle border border-white contact-status-dot" ' +
            'style="background-color: ' + statusColor + ';"></span>' +
            '</div>' +
            '<div class="ms-2 overflow-hidden text-truncate">' +
            '<div class="contact-name">' + nome + '</div>' +
            '<div class="small text-muted contact-status">' + (isOnline ? 'Online' : 'Offline') + '</div>' +
            '</div></div>';
    }).join('');
};

window.selecionarEAbrir = function (id, nome, isOnline) {
    window.AppRDO.clienteId = id;
    window.AppRDO.clienteSelecionado = nome;
    localStorage.setItem('clienteSelecionadoNome', nome);
    document.querySelectorAll('.contact-item-clean').forEach(function (el) {
        el.classList.remove('active-contact');
    });
    var itemAtivo = document.getElementById('item-contato-' + id);
    if (itemAtivo) {
        itemAtivo.classList.add('active-contact');
    }
    if (!isOnline) {
        window.exibirModalValidacao(
            'Por favor, entre em contato com o seu administrador.<strong>O cliente está offline.</strong>'
        );
    }
    window.abrirConversa(id, nome, null, isOnline);
};

window.abrirConversa = async function (id, nome, urlImagem, isOnline) {
    var container = document.getElementById('chat-messages-container');
    var idCliente = String(id).trim();
    var nameEl = document.getElementById('chat-header-name');
    if (nameEl) {
        nameEl.innerText = nome;
        nameEl.className = 'text-dark fw-bold';
    }
    _mostrarLoadingMensagens();
    try {
        var todasMensagens = window.AppRDO.mensagensCache;
        var todosPedidos = window.AppRDO.pedidosCache;
        if (!todasMensagens || todasMensagens.length === 0 ||
            !todosPedidos || todosPedidos.length === 0) {
            var results = await Promise.all([
                API.call('getchat'),
                API.call('getpedidos')
            ]);
            todasMensagens = Array.isArray(results[0]) ? results[0] : [];
            todosPedidos = Array.isArray(results[1]) ? results[1] : [];
            window.AppRDO.mensagensCache = todasMensagens;
            window.AppRDO.pedidosCache = todosPedidos;
        }
        var historico = todasMensagens.filter(function (m) {
            return String(m.id_cliente || '').trim() === idCliente;
        });
        container.innerHTML = '';
        if (historico.length === 0) {
            _mostrarChatEmptyState('Nenhum histórico encontrado');
        } else {
            window.renderizarMensagens(historico, todosPedidos);
        }
    } catch (e) {
        container.innerHTML =
            '<div class="chat-empty-state text-danger">' +
            '<i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i>' +
            '<div class="chat-empty-label">Erro ao carregar histórico.</div>' +
            '</div>';
    }
};

window.renderizarMensagens = function (mensagens, pedidos) {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML = '';
    window.AppRDO.pedidosCache = pedidos;
    if (!mensagens || mensagens.length === 0) {
        _mostrarChatEmptyState('Nenhum histórico encontrado');
        return;
    }
    var ultimaData = null;
    mensagens.forEach(function (msg) {
        var labelData = window.formatarDataSeparador(msg.data || null);
        if (labelData && labelData !== ultimaData) {
            ultimaData = labelData;
            var separador = document.createElement('div');
            separador.className = 'chat-date-separator';
            separador.innerHTML = '<span class="chat-date-badge">' + labelData + '</span>';
            container.appendChild(separador);
        }
        var pedido = pedidos.find(function (p) {
            return String(p.id).trim() === String(msg.pedido_id).trim();
        });
        var statusBruto = String(pedido ? pedido.status : '').trim();
        var motoboyNome = String(pedido ? pedido.motoboy : '').trim();
        var horaMsg = msg.hora || '';
        var statusPuro = statusBruto.includes('/')
            ? statusBruto.split('/').pop().trim()
            : statusBruto;
        var statusUpper = statusPuro.toUpperCase();
        var isFinal = statusUpper === 'CONCLUIDO' || statusUpper === 'CONCLUÍDO' || statusUpper === 'CANCELADO';
        var isEmRota = statusUpper === 'EM_ROTA' || statusUpper === 'EM ROTA' || statusBruto.includes('/');
        var temStatus = isEmRota || isFinal;
        var tooltipTexto = 'Alterar Status';
        if (temStatus) {
            var statusLabel = statusPuro.replace(/_/g, ' ');
            tooltipTexto = motoboyNome ? motoboyNome + ' • ' + statusLabel : statusLabel;
        }
        var div = document.createElement('div');
        div.className = 'message-wrapper';
        div.innerHTML =
            '<div class="message-sent" data-pedido-id="' + msg.pedido_id + '" ' +
            'onclick="window.abrirModalEdicao(\'' + msg.pedido_id + '\')">' +
            '<div class="message-body">' + (msg.texto || '').replace(/\n/g, '<br>') + '</div>' +
            '<div class="status-icon ' + (temStatus ? 'status-updated' : 'status-pending') + '" ' +
            'onclick="event.stopPropagation(); window.abrirModalStatus(\'' + msg.pedido_id + '\')" ' +
            'data-tooltip="' + tooltipTexto + '">' +
            (temStatus ? window.getIconePorStatus(statusPuro) : '<i class="bi bi-arrow-repeat spinner-rotate"></i>') +
            '</div>' +
            '<span class="message-time">' + horaMsg + '</span>' +
            '</div>';
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
};

window.enviarMensagemParaChat = function (texto, isRecebida, pedidoId) {
    isRecebida = isRecebida || false;
    pedidoId = pedidoId || null;
    var container = document.getElementById('chat-messages-container');
    if (!container) return;
    var emptyState = container.querySelector('.chat-empty-state');
    if (emptyState) emptyState.remove();
    var hojeLabel = 'HOJE';
    var ultimoSeparador = container.querySelector('.chat-date-separator:last-of-type .chat-date-badge');
    if (!ultimoSeparador || ultimoSeparador.textContent !== hojeLabel) {
        var separador = document.createElement('div');
        separador.className = 'chat-date-separator';
        separador.innerHTML = '<span class="chat-date-badge">' + hojeLabel + '</span>';
        container.appendChild(separador);
    }
    var horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    var div = document.createElement('div');
    div.className = 'message-wrapper';
    div.innerHTML =
        '<div class="message-sent" data-pedido-id="' + pedidoId + '" ' +
        'onclick="window.abrirModalEdicao(\'' + pedidoId + '\')">' +
        '<div class="message-body">' + texto.replace(/\n/g, '<br>') + '</div>' +
        '<div class="status-icon status-pending" ' +
        'onclick="event.stopPropagation(); window.abrirModalStatus(\'' + pedidoId + '\')" ' +
        'data-tooltip="Alterar Status">' +
        '<i class="bi bi-arrow-repeat spinner-rotate"></i>' +
        '</div>' +
        '<span class="message-time">' + horaAtual + '</span>' +
        '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
};

window.getIconePorStatus = function (status) {
    var s = String(status || '').trim().toUpperCase();
    if (s.includes('EM_ROTA') || s.includes('EM ROTA') || s.includes('/')) {
        return '<i class="bi bi-bicycle" style="color: #0d6efd;"></i>';
    }
    if (s.includes('CONCLUIDO') || s.includes('CONCLUÍDO')) {
        return '<i class="bi bi-check-circle-fill" style="color: #28a745;"></i>';
    }
    if (s.includes('CANCELADO')) {
        return '<i class="bi bi-x-circle-fill" style="color: #dc3545;"></i>';
    }
    return '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
};

window.StatusModal = (function () {
    var _pedidoId = null;
    var _modalBS = null;

    function _el(id) {
        return document.getElementById(id) || null;
    }

    function _safeText(el, txt) {
        if (el && typeof txt === 'string') el.textContent = txt;
    }

    function _safeClass(el, action) {
        if (!el || !el.classList) return;
        var classes = Array.prototype.slice.call(arguments, 2);
        classes.forEach(function (c) {
            if (action === 'add') el.classList.add(c);
            else if (action === 'remove') el.classList.remove(c);
        });
    }

    function _resetar() {
        try {
            var texto = _el('modal-status-texto');
            var icone = _el('modal-status-icone');
            var boxBotoes = _el('box-botoes-status');
            var boxMotoboy = _el('box-selecao-motoboy');
            var select = _el('select-motoboy');
            _safeText(texto, 'Alterar Status');
            if (icone) icone.className = 'bi bi-arrow-repeat';
            _safeClass(boxBotoes, 'remove', 'd-none');
            _safeClass(boxMotoboy, 'add', 'd-none');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Selecione o motoboy...</option>';
                select.style.borderColor = '#ddd';
            }
        } catch (_) {}
    }

    async function _carregarMotoboys() {
        var select = _el('select-motoboy');
        if (!select) return;
        select.innerHTML = '<option value="" disabled selected>Carregando...</option>';
        try {
            var todos = await API.call('getcolaboradores');
            var lista = Array.isArray(todos) ? todos : [];
            var motoboys = lista.filter(function (c) {
                var cargo = String(c.colaborador || '').toUpperCase();
                var ativo = String(c.status || '').toUpperCase();
                return cargo.includes('MOTOBOY') && ativo === 'TRUE';
            });
            if (motoboys.length > 0) {
                select.innerHTML =
                    '<option value="" disabled selected>Selecione o motoboy...</option>' +
                    motoboys.map(function (m) {
                        var nome = String(m.username || m.nome || 'Sem nome');
                        var mid = String(m.id || '');
                        return '<option value="' + mid + '">' + nome + '</option>';
                    }).join('');
            } else {
                select.innerHTML = '<option value="" disabled selected>Nenhum motoboy disponível</option>';
            }
        } catch (_) {
            select.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        }
    }

    function _setSpinnerNoBotao(pedidoId) {
        try {
            if (!pedidoId) return;
            var msgEl = document.querySelector('[data-pedido-id="' + pedidoId + '"]');
            var iconEl = msgEl ? msgEl.querySelector('.status-icon') : null;
            if (!iconEl) return;
            iconEl.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
            _safeClass(iconEl, 'remove', 'status-updated');
            _safeClass(iconEl, 'add', 'status-pending');
            iconEl.setAttribute('data-tooltip', 'Atualizando...');
        } catch (_) {}
    }

    function _setIconeFinal(pedidoId, status, motoboyNome) {
        try {
            if (!pedidoId) return;
            var msgEl = document.querySelector('[data-pedido-id="' + pedidoId + '"]');
            var iconEl = msgEl ? msgEl.querySelector('.status-icon') : null;
            if (!iconEl) return;
            var iconHTML = typeof window.getIconePorStatus === 'function'
                ? window.getIconePorStatus(status)
                : '<i class="bi bi-question-circle"></i>';
            iconEl.innerHTML = iconHTML;
            _safeClass(iconEl, 'remove', 'status-pending');
            _safeClass(iconEl, 'add', 'status-updated');
            var statusLabel = String(status || '').replace(/_/g, ' ');
            var tooltip = motoboyNome ? motoboyNome + ' • ' + statusLabel : statusLabel;
            iconEl.setAttribute('data-tooltip', tooltip);
            iconEl.setAttribute('title', tooltip);
        } catch (_) {}
    }

    function _atualizarCache(pedidoId, statusFormatado, motoboyNome) {
        try {
            var cache = window.AppRDO ? window.AppRDO.pedidosCache : null;
            if (!Array.isArray(cache)) return;
            var pedido = cache.find(function (p) {
                return String(p.id || '').trim() === String(pedidoId || '').trim();
            });
            if (!pedido) return;
            pedido.status = statusFormatado;
            if (motoboyNome) pedido.motoboy = motoboyNome;
        } catch (_) {}
    }

    async function _executarAlteracao(status, motoboyId) {
        var motoboyNome = '';
        var statusFormatado = String(status || '');
        try {
            if (motoboyId) {
                var select = _el('select-motoboy');
                if (select && select.selectedIndex >= 0) {
                    var opt = select.options[select.selectedIndex];
                    motoboyNome = String(opt ? opt.text : '').trim();
                }
            }
        } catch (_) {
            motoboyNome = '';
        }
        if (motoboyNome) {
            statusFormatado = motoboyNome + '/' + status;
        }
        _setSpinnerNoBotao(_pedidoId);
        try { if (_modalBS) _modalBS.hide(); } catch (_) {}
        try {
            var payload = {
                id: String(_pedidoId || ''),
                status: statusFormatado,
                motoboy: motoboyNome
            };
            var resposta = await API.call('updatepedido', payload);
            if (resposta && resposta.status === 'success') {
                _atualizarCache(_pedidoId, statusFormatado, motoboyNome);
                _setIconeFinal(_pedidoId, status, motoboyNome);
                try {
                    if (window.RDO_PEDIDOS && typeof window.RDO_PEDIDOS.atualizarStatusLocal === 'function') {
                        window.RDO_PEDIDOS.atualizarStatusLocal(_pedidoId, statusFormatado, motoboyNome);
                    }
                } catch (_) {}
            } else {
                throw new Error((resposta && resposta.message) || 'Falha na API');
            }
        } catch (e) {
            _setIconeFinal(_pedidoId, '', '');
            try {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    html: '<div style="font-size: 0.9rem;">Não foi possível alterar o status.</div>',
                    confirmButtonText: 'Fechar',
                    confirmButtonColor: '#dc3545',
                    customClass: { popup: 'rounded-4' }
                });
            } catch (_) {
                alert('Erro ao alterar o status do pedido.');
            }
        }
    }

    function abrir(pedidoId) {
        try {
            if (!pedidoId || pedidoId === 'null' || pedidoId === 'undefined') return;
            var cache = (window.AppRDO && Array.isArray(window.AppRDO.pedidosCache))
                ? window.AppRDO.pedidosCache : [];
            var pedido = cache.find(function (p) {
                return String(p.id || '').trim() === String(pedidoId).trim();
            });
            var statusBruto = String(pedido ? pedido.status : '').trim();
            var statusPuro = statusBruto.includes('/')
                ? statusBruto.split('/').pop().trim().toUpperCase()
                : statusBruto.toUpperCase();
            if (statusPuro === 'CONCLUIDO' || statusPuro === 'CONCLUÍDO' || statusPuro === 'CANCELADO') {
                var isConcluido = statusPuro === 'CONCLUIDO' || statusPuro === 'CONCLUÍDO';
                Swal.fire({
                    icon: isConcluido ? 'success' : 'error',
                    title: 'Pedido Finalizado',
                    html: '<div style="font-size: 0.93rem; color: #555;">' +
                        'Este pedido já foi ' +
                        '<strong style="color: ' + (isConcluido ? '#28a745' : '#dc3545') + ';">' +
                        (isConcluido ? 'Concluído' : 'Cancelado') +
                        '</strong> e não pode mais ser alterado.</div>',
                    confirmButtonText: 'Entendi',
                    confirmButtonColor: '#dc3545',
                    customClass: { popup: 'rounded-4', confirmButton: 'rounded-3' }
                });
                return;
            }
            _pedidoId = pedidoId;
            _resetar();
            var modalEl = _el('modalStatus');
            if (!modalEl) return;
            _modalBS = _getOrCreateModal(modalEl, { backdrop: 'static' });
            if (_modalBS) _modalBS.show();
        } catch (e) {}
    }

    function processar(status) {
        try {
            if (status === 'EM_ROTA') {
                var texto = _el('modal-status-texto');
                var icone = _el('modal-status-icone');
                _safeText(texto, 'Selecione o Motoboy');
                if (icone) icone.className = 'bi bi-bicycle';
                _safeClass(_el('box-botoes-status'), 'add', 'd-none');
                _safeClass(_el('box-selecao-motoboy'), 'remove', 'd-none');
                _carregarMotoboys();
                return;
            }
            var opcoes = {
                CONCLUIDO: {
                    titulo: 'Concluir Pedido?',
                    html: 'Ao concluir, este pedido <strong>não poderá</strong> mais ser alterado.',
                    icone: 'question',
                    btnTexto: 'Sim, Concluir',
                    btnCor: '#28a745'
                },
                CANCELADO: {
                    titulo: 'Cancelar Pedido?',
                    html: 'Ao cancelar, este pedido <strong>não poderá</strong> mais ser reaberto.',
                    icone: 'warning',
                    btnTexto: 'Sim, Cancelar',
                    btnCor: '#dc3545'
                }
            };
            var cfg = opcoes[status];
            if (!cfg) return;
            try { if (_modalBS) _modalBS.hide(); } catch (_) {}
            Swal.fire({
                icon: cfg.icone,
                title: cfg.titulo,
                html: '<div style="font-size: 0.9rem; color: #555;">' + cfg.html + '</div>',
                showCancelButton: true,
                confirmButtonText: cfg.btnTexto,
                cancelButtonText: 'Voltar',
                confirmButtonColor: cfg.btnCor,
                cancelButtonColor: '#6c757d',
                reverseButtons: true,
                customClass: { popup: 'rounded-4', confirmButton: 'rounded-3', cancelButton: 'rounded-3' }
            }).then(async function (result) {
                if (result.isConfirmed) {
                    await _executarAlteracao(status);
                }
            }).catch(function () {});
        } catch (e) {}
    }

    async function confirmarMotoboy() {
        try {
            var select = _el('select-motoboy');
            var motoboyId = select ? select.value : '';
            if (!motoboyId) {
                if (select) {
                    select.style.borderColor = '#dc3545';
                    select.focus();
                    _safeClass(select, 'add', 'animate__animated', 'animate__shakeX');
                    setTimeout(function () {
                        if (select) {
                            select.style.borderColor = '#ddd';
                            _safeClass(select, 'remove', 'animate__animated', 'animate__shakeX');
                        }
                    }, 1500);
                }
                return;
            }
            await _executarAlteracao('EM_ROTA', motoboyId);
        } catch (e) {}
    }

    function voltar() {
        _resetar();
    }

    return { abrir: abrir, processar: processar, confirmarMotoboy: confirmarMotoboy, voltar: voltar };
})();

window.abrirModalStatus = function (pedidoId) {
    window.StatusModal.abrir(pedidoId);
};

window.abrirModalEdicao = function (msgId) {
    Swal.fire({
        title: 'Gerenciar Pedido #' + (msgId || ''),
        showDenyButton: true,
        confirmButtonText: 'Mensagem Padrão',
        denyButtonText: 'Excluir',
        customClass: {
            confirmButton: 'btn btn-outline-secondary btn-lg w-100 mb-3',
            denyButton: 'btn btn-outline-danger btn-lg w-100',
            popup: 'p-4'
        },
        buttonsStyling: false,
        allowOutsideClick: true
    }).then(function (result) {
        if (result.isConfirmed) window.abrirModalMensagemPadrao();
        else if (result.isDenied) window.excluirPedido(msgId);
    });
};

window.abrirModalMensagemPadrao = function () {
    var modalEl = document.getElementById('modalMensagemPadrao');
    if (!modalEl) return;
    var modal = _getOrCreateModal(modalEl);
    if (modal) modal.show();
};

window.copiarModelo = function () {
    var texto = document.getElementById('texto-modelo');
    if (!texto) return;
    texto.select();
    document.execCommand('copy');
    Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Modelo copiado com sucesso!',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: { popup: 'rounded-4 shadow' }
    });
};

window.excluirPedido = async function (msgId) {
    if (!msgId) return;
    var confirmResult = await Swal.fire({
        title: 'Tem certeza?',
        text: 'Esta ação não pode ser desfeita!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });
    if (confirmResult.isConfirmed) {
        try {
            var resposta = await API.call('deletepedido', { id: msgId });
            if (resposta && resposta.status === 'success') {
                var msgEl = document.querySelector('[data-pedido-id="' + msgId + '"]');
                var wrapper = msgEl ? msgEl.closest('.message-wrapper') : null;
                if (wrapper) {
                    wrapper.remove();
                    Swal.fire('Excluído!', 'O pedido foi removido.', 'success');
                }
            } else {
                throw new Error((resposta && resposta.message) || 'Erro ao excluir no servidor.');
            }
        } catch (e) {
            Swal.fire('Erro!', 'Não foi possível excluir: ' + e.message, 'error');
        }
    }
};

window.renderizarFooterResumo = function (resumoEl) {
    if (!resumoEl || !window.dadosPedidoAtual) return;
    var d = window.dadosPedidoAtual;
    resumoEl.innerHTML =
        '<span class="me-3"><i class="bi bi-signpost-split me-1"></i><strong>' + (d.distancia || '0') + ' km</strong></span>' +
        '<span class="me-3"><i class="bi bi-clock me-1"></i><strong>' + (d.tempo || '--') + '</strong></span>' +
        '<span><i class="bi bi-cash me-1"></i><strong>' + (d.valor || 'R$ 0,00') + '</strong></span>';
};

window.buscarCoordenadasEndereco = function (endereco) {
    return new Promise(function (resolve) {
        var busca = endereco;
        if (!/MG|Minas Gerais/i.test(busca)) busca += ', MG';
        if (!/Brasil|Brazil/i.test(busca)) busca += ', Brasil';
        var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
            encodeURIComponent(busca) + '&limit=1&countrycodes=br';
        fetch(url)
            .then(function (resp) { return resp.json(); })
            .then(function (data) {
                if (data && data.length > 0) {
                    resolve({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                } else {
                    resolve(null);
                }
            })
            .catch(function () { resolve(null); });
    });
};

window.renderizarMapaUnificado = function () {
    var container = document.getElementById('container-mapa-visual');
    if (!container) return;
    if (window._leafletMapInstance) {
        try { window._leafletMapInstance.remove(); } catch (_) {}
        window._leafletMapInstance = null;
    }
    if (!container.style.height || container.style.height === '0px') {
        container.style.height = '350px';
    }
    var dados = window.dadosPedidoAtual;
    if (!dados || !dados.coordenadas || dados.coordenadas.length === 0) {
        container.innerHTML = '<p class="text-center text-muted p-4">Nenhuma rota para exibir.</p>';
        return;
    }
    if (typeof L === 'undefined') {
        container.innerHTML = '<p class="text-center text-danger p-4">Leaflet não carregado.</p>';
        return;
    }
    var mapa = L.map(container).setView([-19.92, -43.94], 12);
    window._leafletMapInstance = mapa;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapa);
    var cores = ['#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'];
    var todosOsPontos = [];
    var criarIcone = function (emoji) {
        return L.divIcon({
            html: '<div style="font-size:22px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3));">' + emoji + '</div>',
            className: 'custom-div-icon',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    };
    dados.coordenadas.forEach(function (caminho, i) {
        if (!caminho || caminho.length === 0) return;
        var cor = cores[i % cores.length];
        L.polyline(caminho, {
            color: cor, weight: 4, opacity: 0.85, dashArray: '10, 8'
        }).addTo(mapa);
        if (i === 0) {
            L.marker(caminho[0], { icon: criarIcone('🏁') }).addTo(mapa).bindPopup('<strong>Origem</strong>');
        }
        if (i === dados.coordenadas.length - 1) {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('📍') }).addTo(mapa).bindPopup('<strong>Destino Final</strong>');
        } else {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('🔄') }).addTo(mapa).bindPopup('<strong>Parada ' + (i + 1) + '</strong>');
        }
        caminho.forEach(function (p) { todosOsPontos.push(p); });
    });
    if (todosOsPontos.length > 0) {
        mapa.fitBounds(L.latLngBounds(todosOsPontos).pad(0.15));
    }
    setTimeout(function () { mapa.invalidateSize(); }, 400);
};

window.enviarMensagemGeral = async function () {
    var input = document.getElementById('msg-input');
    if (!window.AppRDO || !window.AppRDO.clienteId) {
        window.exibirModalValidacao('Selecione um cliente na lista primeiro.');
        return;
    }
    if (!input || !input.value.trim()) {
        window.marcarCampoInvalido();
        return;
    }
    if (window.AppRDO.isMasterOn) {
        var clienteAtual = (window.AppRDO.clientesCache || []).find(function (c) {
            return String(c.id) === String(window.AppRDO.clienteId);
        });
        if (clienteAtual && String(clienteAtual.status || '').toUpperCase() !== 'TRUE') {
            window.exibirModalValidacao(
                'Por favor, entre em contato com o seu administrador.<br><strong>O cliente está offline.</strong>'
            );
            return;
        }
    }
    await window.iniciarFluxoCheckout();
};

window.formatarTelefone = function (tel) {
    if (!tel) return '';
    var val = String(tel).replace(/\D/g, '');
    if (val.length === 8) return val.replace(/^(\d{4})(\d{4})$/, '$1-$2');
    if (val.length === 10) return val.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    if (val.length === 11) return val.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    return val;
};

window.formatarTempoHumano = function (minutos) {
    var h = Math.floor(minutos / 60);
    var m = Math.round(minutos % 60);
    if (h > 0) return h + 'h ' + m + 'min';
    return m + 'min';
};

window.formatarDataSeparador = function (dataStr) {
    if (!dataStr) return null;
    var raw = String(dataStr);
    if (raw.includes('T') || raw.includes('-')) {
        var d = new Date(raw);
        if (!isNaN(d.getTime())) {
            var dia = String(d.getDate()).padStart(2, '0');
            var mes = String(d.getMonth() + 1).padStart(2, '0');
            var ano = d.getFullYear();
            var hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            d.setHours(0, 0, 0, 0);
            var diffDias = Math.floor((hoje - d) / (1000 * 60 * 60 * 24));
            if (diffDias === 0) return 'HOJE';
            if (diffDias === 1) return 'ONTEM';
            return dia + '/' + mes + '/' + ano;
        }
    }
    var partes = raw.split('/');
    if (partes.length === 3) {
        var dataMsg = new Date(partes[2], partes[1] - 1, partes[0]);
        var hojeComp = new Date();
        hojeComp.setHours(0, 0, 0, 0);
        dataMsg.setHours(0, 0, 0, 0);
        var diffDiasComp = Math.floor((hojeComp - dataMsg) / (1000 * 60 * 60 * 24));
        if (diffDiasComp === 0) return 'HOJE';
        if (diffDiasComp === 1) return 'ONTEM';
        return raw;
    }
    return raw;
};

window.exibirErro = function (erro, contexto) {
    contexto = contexto || 'Erro desconhecido';
    var container = document.getElementById('chat-messages-container');
    if (container) {
        container.innerHTML =
            '<div class="alert alert-danger m-3 rounded-4 shadow-sm">' +
            '<i class="bi bi-exclamation-triangle-fill me-2"></i>' +
            '<strong>Ops!</strong> Algo deu errado ao ' + contexto + '.' +
            '<br><small class="text-secondary">' + (erro.message || erro) + '</small>' +
            '<div class="mt-2">' +
            '<button class="btn btn-sm btn-outline-danger" onclick="window.carregarDados()">Tentar Novamente</button>' +
            '</div></div>';
    } else {
        window.exibirModalValidacao('Falha ao ' + contexto + ': ' + (erro.message || erro));
    }
};

window.exibirErroNoModal = function (mensagem) {
    var container = document.getElementById('form-error-container');
    var texto = document.getElementById('form-error-text');
    if (texto) texto.innerText = mensagem;
    if (container) {
        container.classList.remove('d-none');
        setTimeout(function () {
            container.classList.add('d-none');
        }, 4000);
    }
};

window.exibirModalAviso = function (mensagem) {
    window.exibirModalValidacao(mensagem);
};

window.extrairRotasDaMensagem = function (texto) {
    var rotas = [];
    var linhas = texto.split('\n');
    for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i].trim();
        if (!linha) continue;
        var match = linha.match(/De:\s*(.+?)\s*(?:\||–|—|-|→)\s*Para:\s*(.+)/i);
        if (match) {
            rotas.push({
                de: match[1].replace(/^\d+[\.\)\-]\s*/, '').trim(),
                para: match[2].trim()
            });
            continue;
        }
        var match2 = linha.match(/De:\s*(.+?)\s+Para:\s*(.+)/i);
        if (match2) {
            rotas.push({
                de: match2[1].replace(/^\d+[\.\)\-]\s*/, '').trim(),
                para: match2[2].trim()
            });
        }
    }
    return rotas;
};

window.voltarParaChat = function () {
    var stepForm = document.getElementById('step-formulario');
    var stepMapa = document.getElementById('step-mapa');
    var stepChat = document.getElementById('step-chat');
    if (stepForm) stepForm.classList.add('d-none');
    if (stepMapa) stepMapa.classList.add('d-none');
    if (stepChat) stepChat.classList.remove('d-none');
};

window.calcularTudo = function () {
    var elDist = document.getElementById('p-distancia');
    var elVkm = document.getElementById('p-valor-km');
    var elRet = document.getElementById('p-retorno');
    var elDin = document.getElementById('p-dinamica');
    var elPri = document.getElementById('p-prioridade');
    var distancia = parseFloat(elDist ? elDist.value : 0) || 0;
    var valorKm = parseFloat(elVkm ? elVkm.value : 0) || 0;
    var retorno = parseFloat(elRet ? elRet.value : 0) || 0;
    var dinamica = parseFloat(elDin ? elDin.value : 0) || 0;
    var prioridade = parseFloat(elPri ? elPri.value : 0) || 0;
    var base = distancia * valorKm;
    var comRetorno = base + (base * retorno);
    var total = comRetorno + dinamica + prioridade;
    if (total > 0 && total < 10) total = 10;
    var viewEl = document.getElementById('view-valor-final');
    if (viewEl) {
        viewEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    if (window.dadosPedidoAtual) {
        window.dadosPedidoAtual.valorFinal = total;
    }
};

window.preencherDadosFormulario = function () {
    var d = window.dadosPedidoAtual;
    if (!d) return;
    var headerCliente = document.getElementById('header-nome-cliente');
    if (headerCliente) {
        var nomeCliente = d.cliente
            || (window.AppRDO ? window.AppRDO.clienteSelecionado : null)
            || localStorage.getItem('clienteSelecionadoNome')
            || 'Não identificado';
        headerCliente.innerText = nomeCliente;
    }
    var el = function (id) { return document.getElementById(id); };
    if (el('p-solicitante')) el('p-solicitante').value = d.solicitante || '';
    if (el('p-contato')) el('p-contato').value = d.contato || '';
    if (el('p-distancia')) el('p-distancia').value = d.distancia || '';
    if (el('p-tempo')) el('p-tempo').value = d.tempo || '';
    if (el('p-rotas') && d.rawInput) {
        var rotas = window.extrairRotasDaMensagem(d.rawInput);
        var textoRotas = rotas.map(function (r, i) {
            return (i + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
        }).join('\n');
        el('p-rotas').value = textoRotas;
    }
    if (el('p-horario') && !el('p-horario').value) {
        var agora = new Date();
        el('p-horario').value = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
};

window.validarFormularioCheckout = function () {
    var ids = ['p-solicitante', 'p-mercadoria', 'p-rotas'];
    var valido = true;
    var primeiroCampoInvalido = null;
    for (var i = 0; i < ids.length; i++) {
        var campo = document.getElementById(ids[i]);
        if (!campo) continue;
        campo.style.border = '';
        campo.style.boxShadow = '';
        var valor = (campo.value || '').trim();
        if (!valor) {
            window.marcarCampoFormInvalido(campo);
            valido = false;
            if (!primeiroCampoInvalido) primeiroCampoInvalido = campo;
        }
    }
    if (primeiroCampoInvalido) {
        primeiroCampoInvalido.focus();
    }
    return valido;
};

window.iniciarFluxoCheckout = function () {
    var msgInput = document.getElementById('msg-input');
    var texto = msgInput ? (msgInput.value || '').trim() : '';
    if (!texto) {
        window.marcarCampoInvalido();
        return;
    }
    var solicitante = (texto.match(/(?:SOLICITANTE|NOME|CLIENTE):\s*(.*)/i) || [])[1] || 'Não informado';
    solicitante = solicitante.trim();
    var contato = (texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE):\s*([\d\s\-\(\)\+]+)/i) || [])[1] || '';
    contato = contato.trim();
    var rotasExtraidas = window.extrairRotasDaMensagem(texto);
    if (rotasExtraidas.length === 0) {
        window.exibirModalValidacao('Nenhuma rota encontrada.<br>Use o formato: <strong>De: Origem | Para: Destino</strong>');
        return;
    }
    window.loadModal('mapa_clientes.html').then(function (carregou) {
        if (!carregou) return;
        var modalEl = document.getElementById('modalMapa');
        if (!modalEl) return;
        var modal = new bootstrap.Modal(modalEl);
        modalEl.addEventListener('shown.bs.modal', function () {
            var elSolicitante = document.getElementById('header-nome-solicitante');
            var resumoEl = document.getElementById('resumo-total');
            var listaRotasEl = document.getElementById('lista-rotas-editavel');
            if (elSolicitante) elSolicitante.innerText = solicitante;
            if (resumoEl) resumoEl.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Calculando rotas...';
            if (listaRotasEl) {
                listaRotasEl.innerHTML = rotasExtraidas.map(function (r, i) {
                    return '<div class="d-flex align-items-center px-3 py-2 ' + (i > 0 ? 'border-top' : '') + '">' +
                        '<span class="badge bg-danger me-2">' + (i + 1) + '</span>' +
                        '<span class="text-dark"><strong>De:</strong> ' + r.de +
                        ' <i class="bi bi-arrow-right mx-1 text-muted"></i> ' +
                        '<strong>Para:</strong> ' + r.para + '</span></div>';
                }).join('');
            }
            var kmTotal = 0;
            var minTotal = 0;
            var listaCaminhos = [];
            var promessas = [];
            rotasExtraidas.forEach(function (rota) {
                var promessa = Promise.all([
                    window.buscarCoordenadasEndereco(rota.de),
                    window.buscarCoordenadasEndereco(rota.para)
                ]).then(function (coords) {
                    var p1 = coords[0];
                    var p2 = coords[1];
                    if (!p1 || !p2) return;
                    var url = 'https://router.project-osrm.org/route/v1/driving/' +
                        p1.lng + ',' + p1.lat + ';' + p2.lng + ',' + p2.lat +
                        '?overview=full&geometries=geojson';
                    return fetch(url)
                        .then(function (resp) { return resp.json(); })
                        .then(function (data) {
                            if (data.routes && data.routes[0]) {
                                kmTotal += (data.routes[0].distance / 1000);
                                minTotal += (data.routes[0].duration / 60);
                                listaCaminhos.push(
                                    data.routes[0].geometry.coordinates.map(function (c) {
                                        return [c[1], c[0]];
                                    })
                                );
                            }
                        });
                });
                promessas.push(promessa);
            });
            Promise.all(promessas).then(function () {
                var kmArredondado = Math.round(kmTotal);
                window.dadosPedidoAtual = {
                    solicitante: solicitante,
                    contato: contato,
                    cliente: (window.AppRDO ? window.AppRDO.clienteSelecionado : null)
                        || localStorage.getItem('clienteSelecionadoNome')
                        || 'N/A',
                    distancia: kmArredondado.toString(),
                    tempo: window.formatarTempoHumano(minTotal),
                    coordenadas: listaCaminhos,
                    valor: (kmArredondado * 3.00).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    rawInput: texto
                };
                window.renderizarFooterResumo(resumoEl);
                window.renderizarMapaUnificado();
            }).catch(function () {
                if (resumoEl) {
                    resumoEl.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Erro ao calcular rotas</span>';
                }
            });
        }, { once: true });
        modal.show();
    });
};

window.prosseguirParaFormulario = function () {
    var modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    if (modalMapa) modalMapa.hide();
    window.loadModal('form_clientes.html').then(function (carregou) {
        if (!carregou) return;
        var modalEl = document.getElementById('modalFormulario');
        if (!modalEl) return;
        var modalForm = new bootstrap.Modal(modalEl);
        modalEl.addEventListener('shown.bs.modal', function () {
            window.preencherDadosFormulario();
            window.calcularTudo();
        }, { once: true });
        modalForm.show();
    });
};

window.voltarParaMapa = function () {
    var modalForm = bootstrap.Modal.getInstance(document.getElementById('modalFormulario'));
    if (modalForm) modalForm.hide();
    window.loadModal('mapa_clientes.html').then(function (carregou) {
        if (!carregou) return;
        var modalEl = document.getElementById('modalMapa');
        if (!modalEl) return;
        var modalMapa = new bootstrap.Modal(modalEl);
        modalEl.addEventListener('shown.bs.modal', function () {
            var elHeader = document.getElementById('header-nome-solicitante');
            if (elHeader && window.dadosPedidoAtual) {
                elHeader.innerText = window.dadosPedidoAtual.solicitante || 'Cliente';
            }
            var resumoEl = document.getElementById('resumo-total');
            if (resumoEl) window.renderizarFooterResumo(resumoEl);
            window.renderizarMapaUnificado();
        }, { once: true });
        modalMapa.show();
    });
};

window.salvarPedidoAPI = async function () {
    if (typeof window.validarFormularioCheckout === 'function' && !window.validarFormularioCheckout()) {
        return;
    }
    var idCliente = window.AppRDO ? window.AppRDO.clienteId : null;
    if (!idCliente) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Nenhum cliente selecionado',
                text: 'Selecione um cliente na lista antes de emitir o pedido.',
                confirmButtonColor: '#dc3545'
            });
        }
        return;
    }
    var d = window.dadosPedidoAtual || {};
    var elSolicitante = document.getElementById('p-solicitante');
    var elContato = document.getElementById('p-contato');
    var elHorario = document.getElementById('p-horario');
    var elMercadoria = document.getElementById('p-mercadoria');
    var elRotas = document.getElementById('p-rotas');
    var elRetorno = document.getElementById('p-retorno');
    var elPrioridade = document.getElementById('p-prioridade');
    var elValor = document.getElementById('view-valor-final');
    var elObs = document.getElementById('p-obs');
    var solicitante = elSolicitante ? elSolicitante.value.trim() : (d.solicitante || '');
    var contato = elContato ? elContato.value.trim() : (d.contato || '');
    var horario = elHorario ? elHorario.value.trim() : (d.horario || '');
    var mercadoria = elMercadoria ? elMercadoria.value.trim() : (d.mercadoria || '');
    var rotasRaw = elRotas ? elRotas.value.trim() : '';
    var observacao = elObs ? elObs.value.trim() : '';
    var valorCorrida = elValor ? elValor.innerText.trim() : 'R$ 0,00';
    if (!observacao) observacao = 'N/A';
    var retorno = 'Não';
    if (elRetorno) {
        var rv = (elRetorno.value || '').trim().toUpperCase();
        if (rv === 'SIM' || rv === 'S' || rv === 'TRUE' || rv === '1') {
            retorno = 'Sim';
        }
    }
    var prioridade = elPrioridade ? (elPrioridade.value || '0').trim() : '0';
    var rotasLimpas = [];
    if (d.rotas && Array.isArray(d.rotas) && d.rotas.length > 0) {
        rotasLimpas = d.rotas.map(function (r) {
            return {
                de: (r.de || '').replace(/^\d+\.\s*/, '').replace(/^De:\s*/i, '').trim(),
                para: (r.para || '').replace(/^Para:\s*/i, '').trim()
            };
        });
    } else if (rotasRaw) {
        var linhas = rotasRaw.split('\n');
        for (var i = 0; i < linhas.length; i++) {
            var linha = linhas[i].trim();
            if (!linha) continue;
            if (/de:/i.test(linha) && /\|/.test(linha)) {
                var partes = linha.split('|');
                rotasLimpas.push({
                    de: partes[0].replace(/^De:\s*/i, '').replace(/^\d+\.\s*/, '').trim(),
                    para: (partes[1] || '').replace(/^Para:\s*/i, '').trim()
                });
            }
        }
    }
    var rotasTextoBackend = rotasLimpas.map(function (r) {
        return 'De: ' + r.de + ' | Para: ' + r.para;
    }).join('\n');
    var rotasTextoChat = rotasLimpas.map(function (r, idx) {
        return '📍' + (idx + 1) + '. De: ' + r.de + ' | \n      Para: ' + r.para;
    }).join('\n');
    var mensagemChat = [
        '📦 SOLICITANTE: ' + solicitante,
        '',
        'N.SERVIÇO: [ID_GERADO]',
        'SOLICITANTE: ' + solicitante + ' ',
        'CONTATO: ' + contato + ' | HR: ' + horario,
        '-',
        'MERCADORIA: ' + mercadoria,
        'RETORNO: ' + retorno,
        '-',
        'ROTA(s): ',
        rotasTextoChat,
        '-',
        'OBSERVAÇÃO: ' + observacao,
        valorCorrida
    ].join('\n');
    var payload = {
        id_cliente: idCliente,
        solicitante: solicitante,
        contato: contato,
        horario: horario,
        mercadoria: mercadoria,
        rotas_texto: rotasTextoBackend,
        retorno: retorno,
        prioridade: prioridade,
        valor_corrida: valorCorrida,
        observacao: observacao,
        mensagem: mensagemChat
    };
    var btnEmitir = document.getElementById('btn-emitir-pedido');
    if (btnEmitir) {
        btnEmitir.disabled = true;
        btnEmitir.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Emitindo...';
    }
    try {
        var resposta = await API.call('finalizarpedido', payload);
        var idGerado = resposta.id || '';
        var idClienteResp = resposta.id_cliente || idCliente;
        var modalEl = document.getElementById('modalFormulario');
        if (modalEl) {
            var modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }
        var mensagemFinal = mensagemChat.replace('[ID_GERADO]', idGerado);
        var horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        var dataAgora = new Date().toLocaleDateString('pt-BR');
        var novaMsgChat = {
            id: idClienteResp + '_' + idGerado,
            id_cliente: idClienteResp,
            pedido_id: idGerado,
            texto: mensagemFinal,
            hora: horaAgora,
            data: dataAgora,
            finalizado: 'TRUE'
        };
        if (window.AppRDO && window.AppRDO.mensagensCache) {
            window.AppRDO.mensagensCache.push(novaMsgChat);
        }
        var novoPedido = {
            id: idGerado,
            id_cliente: idClienteResp,
            solicitante: solicitante,
            contato: contato,
            horario: horario,
            mercadoria: mercadoria,
            de: rotasLimpas.map(function (r) { return r.de; }).join(', '),
            para: rotasLimpas.map(function (r) { return r.para; }).join(', '),
            retorno: retorno,
            prioridade: prioridade,
            valor_corrida: valorCorrida,
            motoboy: '',
            status: 'PENDENTE',
            observacao: observacao
        };
        if (window.AppRDO && window.AppRDO.pedidosCache) {
            window.AppRDO.pedidosCache.push(novoPedido);
        }
        var container = document.getElementById('chat-messages-container');
        if (container) {
            var emptyState = container.querySelector('.chat-empty-state');
            if (emptyState) emptyState.remove();
            var ultimoSeparador = container.querySelector('.chat-date-separator:last-of-type .chat-date-badge');
            if (!ultimoSeparador || ultimoSeparador.textContent !== 'HOJE') {
                var separador = document.createElement('div');
                separador.className = 'chat-date-separator';
                separador.innerHTML = '<span class="chat-date-badge">HOJE</span>';
                container.appendChild(separador);
            }
            var div = document.createElement('div');
            div.className = 'message-wrapper';
            div.innerHTML =
                '<div class="message-sent" data-pedido-id="' + idGerado + '" ' +
                'onclick="window.abrirModalEdicao(\'' + idGerado + '\')">' +
                '<div class="message-body">' + mensagemFinal.replace(/\n/g, '<br>') + '</div>' +
                '<div class="status-icon status-pending" ' +
                'onclick="event.stopPropagation(); window.abrirModalStatus(\'' + idGerado + '\')" ' +
                'data-tooltip="Alterar Status">' +
                '<i class="bi bi-arrow-repeat spinner-rotate"></i>' +
                '</div>' +
                '<span class="message-time">' + horaAgora + '</span>' +
                '</div>';
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
        var msgInput = document.getElementById('msg-input');
        if (msgInput) msgInput.value = '';
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Pedido ' + idGerado + ' Emitido!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                customClass: { popup: 'rounded-4 shadow' }
            });
        }
        if (btnEmitir) {
            btnEmitir.disabled = false;
            btnEmitir.innerHTML = '<i class="bi bi-send-fill me-1"></i>EMITIR PEDIDO';
        }
    } catch (err) {
        if (btnEmitir) {
            btnEmitir.disabled = false;
            btnEmitir.innerHTML = '<i class="bi bi-send-fill me-1"></i>EMITIR PEDIDO';
        }
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Erro ao emitir pedido',
                text: err.message || 'Falha ao salvar o pedido.',
                confirmButtonColor: '#dc3545'
            });
        }
    }
};

(function () {
    function _handleSyncClick(e) {
        var btn = e.target.closest('#btn-sync-chat');
        if (!btn) return;
        if (window.AppRDO && window.AppRDO.isFetching) return;
        if (typeof window.carregarDados === 'function') {
            window.carregarDados();
        }
    }

    document.removeEventListener('click', _handleSyncClick);
    document.addEventListener('click', _handleSyncClick);

    function _tentarInit() {
        var btn = document.getElementById('btn-sync-chat');
        if (btn && window.AppRDO && !window.AppRDO.listaCarregada && !window.AppRDO.isFetching) {
            window.carregarDados();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _tentarInit);
    } else {
        _tentarInit();
    }
})();