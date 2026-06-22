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
        if (instance) { instance.hide(); instance.dispose(); }
    } catch (_) {}
}

function _limparModalContainer() {
    var container = document.getElementById('modal-container');
    if (!container) return;
    container.querySelectorAll('.modal').forEach(function (modalEl) { _disposeModal(modalEl); });
    document.querySelectorAll('.modal-backdrop').forEach(function (bd) { bd.remove(); });
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
        .then(function (html) { container.innerHTML = html; return true; })
        .catch(function () { return false; });
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
    if (e.target && e.target.id === 'chat-search') window.filtrarContatos();
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
        if (typeof window.calcularTudo === 'function') window.calcularTudo();
    }
});

window.MODELO_PADRAO = [
    '📦 Olá! Para agilizarmos o pedido, por favor preencha os dados abaixo:',
    '', 'SOLICITANTE: ', 'CONTATO: ', 'HORÁRIO ESTIMADO P/ COLETA:  ',
    'MERCADORIA: (Sacola, Coleta, Bolsa, Envelope)', 'ROTA(s): ',
    '📍1. De: ... | Para: ...', '📍2. De: ... | Para: ... ', '📍3. De: ... | Para: ... ',
    'RETORNO:  (SIM /NÃO)', 'PRIORIDADE: (Normal, Agendado, Urgente) ',
    'OBSERVAÇÃO: Descreva a observação aqui se necessario', '',
    'Assim que enviar esta mensagem preenchida, ', 'calcularemos á sua taxa! 🏁'
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
    return window.AppRDO.isMasterOn && String(cliente.status || '').toUpperCase() === 'TRUE';
};

window.validarMensagemModelo = function (texto) {
    if (!texto || !texto.trim()) return { valido: false, tipo: 'vazio' };
    var temSolicitante = false, temContato = false, temRota = false;
    var matchS = texto.match(/(?:SOLICITANTE|NOME|CLIENTE)\s*:\s*(.+)/i);
    if (matchS && matchS[1] && matchS[1].trim().length > 0) temSolicitante = true;
    var matchC = texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE)\s*:\s*(.+)/i);
    if (matchC && matchC[1] && matchC[1].trim().length > 0) temContato = true;
    var quantRotas = 0;
    texto.split('\n').forEach(function (linha) {
        linha = linha.trim();
        if (/de\s*:/i.test(linha) && /para\s*:/i.test(linha)) {
            var vDe = linha.match(/de\s*:\s*([^|]+)/i);
            var vPara = linha.match(/para\s*:\s*(.+)/i);
            if (vDe && vDe[1] && vDe[1].trim() !== '...' && vDe[1].trim().length > 0 &&
                vPara && vPara[1] && vPara[1].trim() !== '...' && vPara[1].trim().length > 0) {
                quantRotas++;
            }
        }
    });
    temRota = quantRotas >= 1;
    if (temSolicitante && temContato && temRota) return { valido: true, tipo: 'ok', rotas: quantRotas };
    var faltando = [];
    if (!temSolicitante) faltando.push('SOLICITANTE');
    if (!temContato) faltando.push('CONTATO');
    if (!temRota) faltando.push('ROTA (De: ... | Para: ...)');
    return { valido: false, tipo: 'modelo', camposPendentes: faltando };
};

window.exibirModalValidacao = function (mensagem, opcoes) {
    opcoes = opcoes || {};
    var modalEl = document.getElementById('modalValidacao');
    if (!modalEl) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: opcoes.icone === 'bi-check-circle-fill' ? 'success' : 'warning',
                title: opcoes.titulo || 'Atenção', html: mensagem,
                confirmButtonColor: '#dc3545', confirmButtonText: 'Entendi'
            });
        } else { alert(mensagem.replace(/<[^>]*>/g, '')); }
        return;
    }
    var msgEl = document.getElementById('modal-validacao-mensagem');
    if (msgEl) msgEl.innerHTML = mensagem;
    var iconeEl = document.getElementById('modal-validacao-icone');
    var tituloEl = document.getElementById('modal-validacao-titulo');
    if (iconeEl) iconeEl.className = 'bi ' + (opcoes.icone || 'bi-exclamation-triangle-fill') + ' text-warning fs-4';
    if (tituloEl) tituloEl.innerText = opcoes.titulo || 'Atenção';
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
        if (inst) { try { inst.hide(); } catch (_) {} }
    });
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    try {
        var instExist = bootstrap.Modal.getInstance(modalEl);
        if (instExist) { try { instExist.dispose(); } catch (_) {} }
        new bootstrap.Modal(modalEl).show();
    } catch (err) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', title: 'Atenção', html: mensagem, confirmButtonColor: '#dc3545' });
        } else { alert(mensagem.replace(/<[^>]*>/g, '')); }
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
        btn.classList.replace('btn-outline-danger', 'btn-success');
        setTimeout(function () {
            btn.innerHTML = original;
            btn.classList.replace('btn-success', 'btn-outline-danger');
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
        '<div class="chat-empty-state"><div class="chat-empty-label">' + texto + '</div></div>';
}

function _mostrarContatosEmptyState(texto) {
    var listEl = document.getElementById('lista-contatos-chat');
    if (!listEl) return;
    listEl.innerHTML =
        '<div class="chat-empty-state"><div class="chat-empty-label">' + texto + '</div></div>';
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

window.MasterAuth = (function () {
    var _pedidoId = null;
    var _modalBS = null;
    var _senhaVisivel = false;

    function _el(id) { return document.getElementById(id); }

    function _resetar() {
        var input = _el('input-senha-master');
        var erroEl = _el('msg-erro-senha');
        var btnConfirmar = _el('btn-confirmar-exclusao');
        _senhaVisivel = false;
        if (input) {
            input.value = '';
            input.type = 'password';
            input.classList.remove('is-invalid');
        }
        if (erroEl) erroEl.classList.remove('visivel');
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '<i class="bi bi-trash3-fill me-2"></i>Confirmar Exclusão';
        }
        var iconToggle = _el('icon-toggle-senha');
        if (iconToggle) iconToggle.className = 'bi bi-eye-slash';
    }

    function _mostrarErro(msg) {
        var erroEl = _el('msg-erro-senha');
        var textoEl = _el('msg-erro-senha-texto');
        var input = _el('input-senha-master');
        if (textoEl) textoEl.textContent = msg || 'Senha incorreta. Acesso negado.';
        if (erroEl) erroEl.classList.add('visivel');
        if (input) {
            input.classList.add('is-invalid');
            input.focus();
            input.select();
            setTimeout(function () {
                if (input) input.classList.remove('is-invalid');
            }, 800);
        }
    }

    function _setBtnCarregando() {
        var btn = _el('btn-confirmar-exclusao');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML =
                '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...';
        }
    }

    function _setBtnPadrao() {
        var btn = _el('btn-confirmar-exclusao');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash3-fill me-2"></i>Confirmar Exclusão';
        }
    }

    function abrir(pedidoId) {
        if (!pedidoId || pedidoId === 'null' || pedidoId === 'undefined') return;
        _pedidoId = pedidoId;
        _resetar();
        var modalEl = _el('modalMasterAuth');
        if (!modalEl) return;
        _modalBS = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
        _modalBS.show();
        modalEl.addEventListener('shown.bs.modal', function () {
            var input = _el('input-senha-master');
            if (input) input.focus();
        }, { once: true });
    }

    function cancelar() {
        try { if (_modalBS) _modalBS.hide(); } catch (_) {}
        _pedidoId = null;
        _resetar();
    }

    function toggleSenha() {
        _senhaVisivel = !_senhaVisivel;
        var input = _el('input-senha-master');
        var icon = _el('icon-toggle-senha');
        if (input) input.type = _senhaVisivel ? 'text' : 'password';
        if (icon) icon.className = _senhaVisivel ? 'bi bi-eye' : 'bi bi-eye-slash';
    }

    function onKeydown(e) {
        if (e.key === 'Enter') { e.preventDefault(); confirmar(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelar(); }
    }

    async function confirmar() {
        var input = _el('input-senha-master');
        var senha = input ? input.value : '';

        if (!senha || !senha.trim()) {
            _mostrarErro('Informe a senha master para continuar.');
            return;
        }

        _setBtnCarregando();

        try {
            /*
             * O backend recebe a senha em texto plano,
             * busca o usuário Master no banco e executa:
             *   bcrypt.compare(senha_recebida, hash_do_banco)
             * Nunca expõe nem compara com o .env diretamente no frontend.
             * Se a senha no .env mudar e o banco for atualizado com o novo hash,
             * a comparação continua funcionando automaticamente.
             */
            var resposta = await API.call('validarsenhamaster', { senha: senha.trim() });

            if (!resposta || resposta.status !== 'success' || !resposta.valido) {
                _mostrarErro('Senha incorreta. Acesso negado.');
                _setBtnPadrao();
                return;
            }

            var idParaExcluir = _pedidoId;
            _pedidoId = null;

            try { if (_modalBS) _modalBS.hide(); } catch (_) {}
            _resetar();

            await _executarExclusao(idParaExcluir);

        } catch (err) {
            _mostrarErro('Erro de comunicação. Tente novamente.');
            _setBtnPadrao();
        }
    }

    async function _executarExclusao(msgId) {
        try {
            var resposta = await API.call('deletepedido', { id: msgId });

            if (!resposta || resposta.status !== 'success') {
                throw new Error((resposta && resposta.message) || 'Falha ao excluir no servidor.');
            }

            var msgEl = document.querySelector('[data-pedido-id="' + msgId + '"]');
            var wrapper = msgEl ? msgEl.closest('.message-wrapper') : null;
            if (wrapper) {
                wrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                wrapper.style.opacity = '0';
                wrapper.style.transform = 'translateX(30px)';
                setTimeout(function () {
                    try { wrapper.remove(); } catch (_) {}
                }, 300);
            }

            if (window.AppRDO) {
                if (Array.isArray(window.AppRDO.pedidosCache)) {
                    window.AppRDO.pedidosCache = window.AppRDO.pedidosCache.filter(function (p) {
                        return String(p.id) !== String(msgId);
                    });
                }
                if (Array.isArray(window.AppRDO.mensagensCache)) {
                    window.AppRDO.mensagensCache = window.AppRDO.mensagensCache.filter(function (m) {
                        return String(m.pedido_id) !== String(msgId);
                    });
                }
            }

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Excluído!',
                    text: 'A mensagem foi removida com sucesso.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2500,
                    timerProgressBar: true,
                    customClass: { popup: 'rounded-4 shadow' }
                });
            }

        } catch (err) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao excluir',
                    text: err.message || 'Não foi possível remover a mensagem.',
                    confirmButtonColor: '#dc3545',
                    customClass: { popup: 'rounded-4' }
                });
            }
        }
    }

    return {
        abrir: abrir,
        cancelar: cancelar,
        confirmar: confirmar,
        toggleSenha: toggleSenha,
        onKeydown: onKeydown
    };
})();

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
    if (lista.length === 0) { _mostrarContatosEmptyState('Nenhum contato disponível'); return; }
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
            (isActive ? 'active-contact' : '') + '" id="item-contato-' + id + '" ' +
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
    if (itemAtivo) itemAtivo.classList.add('active-contact');
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
    if (nameEl) { nameEl.innerText = nome; nameEl.className = 'text-dark fw-bold'; }
    _mostrarLoadingMensagens();
    try {
        var todasMensagens = window.AppRDO.mensagensCache;
        var todosPedidos = window.AppRDO.pedidosCache;
        if (!todasMensagens || todasMensagens.length === 0 || !todosPedidos || todosPedidos.length === 0) {
            var results = await Promise.all([API.call('getchat'), API.call('getpedidos')]);
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
            ? statusBruto.split('/').pop().trim() : statusBruto;
        var statusUpper = statusPuro.toUpperCase();
        var isFinal = statusUpper === 'CONCLUIDO' || statusUpper === 'CONCLUÍDO' || statusUpper === 'CANCELADO';
        var isEmRota = statusUpper === 'EM_ROTA' || statusUpper === 'EM ROTA' || statusBruto.includes('/');
        var temStatus = isEmRota || isFinal;
        var tooltipTexto = 'Alterar Status';
        if (temStatus) {
            var statusLabel = statusPuro.replace(/_/g, ' ');
            tooltipTexto = motoboyNome ? motoboyNome + ' • ' + statusLabel : statusLabel;
        }
        container.appendChild(_criarWrapperMensagem(msg.pedido_id, msg.texto || '', horaMsg, temStatus, statusPuro, tooltipTexto));
    });
    container.scrollTop = container.scrollHeight;
};

function _criarWrapperMensagem(pedidoId, texto, hora, temStatus, statusPuro, tooltipTexto) {
    var div = document.createElement('div');
    div.className = 'message-wrapper';

    var iconHTML = temStatus
        ? window.getIconePorStatus(statusPuro)
        : '<i class="bi bi-arrow-repeat spinner-rotate"></i>';

    div.innerHTML =
        '<button class="btn-excluir-msg" title="Excluir mensagem" ' +
        'onclick="event.stopPropagation(); window.MasterAuth.abrir(\'' + pedidoId + '\')">' +
        '<i class="bi bi-trash3-fill"></i>' +
        '</button>' +
        '<div class="message-sent" data-pedido-id="' + pedidoId + '" ' +
        'onclick="window.abrirModalEdicao(\'' + pedidoId + '\')">' +
        '<div class="message-body">' + texto.replace(/\n/g, '<br>') + '</div>' +
        '<div class="status-icon ' + (temStatus ? 'status-updated' : 'status-pending') + '" ' +
        'onclick="event.stopPropagation(); window.abrirModalStatus(\'' + pedidoId + '\')" ' +
        'data-tooltip="' + tooltipTexto + '">' +
        iconHTML +
        '</div>' +
        '<span class="message-time">' + hora + '</span>' +
        '</div>';

    // Hover via JS para suporte touch
    div.addEventListener('mouseenter', function () { div.classList.add('msg-hover-active'); });
    div.addEventListener('mouseleave', function () { div.classList.remove('msg-hover-active'); });

    return div;
}

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
    container.appendChild(_criarWrapperMensagem(pedidoId, texto, horaAtual, false, '', 'Alterar Status'));
    container.scrollTop = container.scrollHeight;
};

window.getIconePorStatus = function (status) {
    var s = String(status || '').trim().toUpperCase();
    if (s.includes('EM_ROTA') || s.includes('EM ROTA') || s.includes('/'))
        return '<i class="bi bi-bicycle" style="color: #0d6efd;"></i>';
    if (s.includes('CONCLUIDO') || s.includes('CONCLUÍDO'))
        return '<i class="bi bi-check-circle-fill" style="color: #28a745;"></i>';
    if (s.includes('CANCELADO'))
        return '<i class="bi bi-x-circle-fill" style="color: #dc3545;"></i>';
    return '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
};

window.StatusModal = (function () {
    var _pedidoId = null;
    var _modalBS = null;

    function _el(id) { return document.getElementById(id) || null; }
    function _safeText(el, txt) { if (el && typeof txt === 'string') el.textContent = txt; }
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
            if (select) { select.innerHTML = '<option value="" disabled selected>Selecione o motoboy...</option>'; select.style.borderColor = '#ddd'; }
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
                return String(c.colaborador || '').toUpperCase().includes('MOTOBOY') &&
                    String(c.status || '').toUpperCase() === 'TRUE';
            });
            if (motoboys.length > 0) {
                select.innerHTML = '<option value="" disabled selected>Selecione o motoboy...</option>' +
                    motoboys.map(function (m) {
                        return '<option value="' + String(m.id || '') + '">' +
                            String(m.username || m.nome || 'Sem nome') + '</option>';
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
            iconEl.innerHTML = typeof window.getIconePorStatus === 'function'
                ? window.getIconePorStatus(status) : '<i class="bi bi-question-circle"></i>';
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
                    motoboyNome = String(select.options[select.selectedIndex].text || '').trim();
                }
            }
        } catch (_) { motoboyNome = ''; }
        if (motoboyNome) statusFormatado = motoboyNome + '/' + status;
        _setSpinnerNoBotao(_pedidoId);
        try { if (_modalBS) _modalBS.hide(); } catch (_) {}
        try {
            var resposta = await API.call('updatepedido', {
                id: String(_pedidoId || ''), status: statusFormatado, motoboy: motoboyNome
            });
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
                    icon: 'error', title: 'Erro',
                    html: '<div style="font-size: 0.9rem;">Não foi possível alterar o status.</div>',
                    confirmButtonText: 'Fechar', confirmButtonColor: '#dc3545',
                    customClass: { popup: 'rounded-4' }
                });
            } catch (_) { alert('Erro ao alterar o status do pedido.'); }
        }
    }

    function abrir(pedidoId) {
        try {
            if (!pedidoId || pedidoId === 'null' || pedidoId === 'undefined') return;
            var cache = (window.AppRDO && Array.isArray(window.AppRDO.pedidosCache)) ? window.AppRDO.pedidosCache : [];
            var pedido = cache.find(function (p) { return String(p.id || '').trim() === String(pedidoId).trim(); });
            var statusBruto = String(pedido ? pedido.status : '').trim();
            var statusPuro = statusBruto.includes('/') ? statusBruto.split('/').pop().trim().toUpperCase() : statusBruto.toUpperCase();
            if (statusPuro === 'CONCLUIDO' || statusPuro === 'CONCLUÍDO' || statusPuro === 'CANCELADO') {
                var isConcluido = statusPuro === 'CONCLUIDO' || statusPuro === 'CONCLUÍDO';
                Swal.fire({
                    icon: isConcluido ? 'success' : 'error', title: 'Pedido Finalizado',
                    html: '<div style="font-size: 0.93rem; color: #555;">Este pedido já foi <strong style="color: ' +
                        (isConcluido ? '#28a745' : '#dc3545') + ';">' +
                        (isConcluido ? 'Concluído' : 'Cancelado') + '</strong> e não pode mais ser alterado.</div>',
                    confirmButtonText: 'Entendi', confirmButtonColor: '#dc3545',
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
                _safeText(_el('modal-status-texto'), 'Selecione o Motoboy');
                var icone = _el('modal-status-icone');
                if (icone) icone.className = 'bi bi-bicycle';
                _safeClass(_el('box-botoes-status'), 'add', 'd-none');
                _safeClass(_el('box-selecao-motoboy'), 'remove', 'd-none');
                _carregarMotoboys();
                return;
            }
            var opcoes = {
                CONCLUIDO: { titulo: 'Concluir Pedido?', html: 'Ao concluir, este pedido <strong>não poderá</strong> mais ser alterado.', icone: 'question', btnTexto: 'Sim, Concluir', btnCor: '#28a745' },
                CANCELADO: { titulo: 'Cancelar Pedido?', html: 'Ao cancelar, este pedido <strong>não poderá</strong> mais ser reaberto.', icone: 'warning', btnTexto: 'Sim, Cancelar', btnCor: '#dc3545' }
            };
            var cfg = opcoes[status];
            if (!cfg) return;
            try { if (_modalBS) _modalBS.hide(); } catch (_) {}
            Swal.fire({
                icon: cfg.icone, title: cfg.titulo,
                html: '<div style="font-size: 0.9rem; color: #555;">' + cfg.html + '</div>',
                showCancelButton: true, confirmButtonText: cfg.btnTexto,
                cancelButtonText: 'Voltar', confirmButtonColor: cfg.btnCor,
                cancelButtonColor: '#6c757d', reverseButtons: true,
                customClass: { popup: 'rounded-4', confirmButton: 'rounded-3', cancelButton: 'rounded-3' }
            }).then(async function (result) {
                if (result.isConfirmed) await _executarAlteracao(status);
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
                    setTimeout(function () { if (select) select.style.borderColor = '#ddd'; }, 1500);
                }
                return;
            }
            await _executarAlteracao('EM_ROTA', motoboyId);
        } catch (e) {}
    }

    function voltar() { _resetar(); }

    return { abrir: abrir, processar: processar, confirmarMotoboy: confirmarMotoboy, voltar: voltar };
})();

window.abrirModalStatus = function (pedidoId) { window.StatusModal.abrir(pedidoId); };

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
        else if (result.isDenied) window.MasterAuth.abrir(msgId);
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
        icon: 'success', title: 'Sucesso!', text: 'Modelo copiado com sucesso!',
        toast: true, position: 'top-end', showConfirmButton: false,
        timer: 2000, timerProgressBar: true, customClass: { popup: 'rounded-4 shadow' }
    });
};

window.excluirPedido = function (msgId) {
    if (!msgId) return;
    window.MasterAuth.abrir(msgId);
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
        fetch('https://nominatim.openstreetmap.org/search?format=json&q=' +
            encodeURIComponent(busca) + '&limit=1&countrycodes=br')
            .then(function (resp) { return resp.json(); })
            .then(function (data) {
                if (data && data.length > 0) resolve({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                else resolve(null);
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
    if (!container.style.height || container.style.height === '0px') container.style.height = '350px';
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapa);
    var cores = ['#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'];
    var todosOsPontos = [];
    var criarIcone = function (emoji) {
        return L.divIcon({
            html: '<div style="font-size:22px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3));">' + emoji + '</div>',
            className: 'custom-div-icon', iconSize: [28, 28], iconAnchor: [14, 14]
        });
    };
    dados.coordenadas.forEach(function (caminho, i) {
        if (!caminho || caminho.length === 0) return;
        L.polyline(caminho, { color: cores[i % cores.length], weight: 4, opacity: 0.85, dashArray: '10, 8' }).addTo(mapa);
        if (i === 0) L.marker(caminho[0], { icon: criarIcone('🏁') }).addTo(mapa).bindPopup('<strong>Origem</strong>');
        if (i === dados.coordenadas.length - 1) {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('📍') }).addTo(mapa).bindPopup('<strong>Destino Final</strong>');
        } else {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('🔄') }).addTo(mapa).bindPopup('<strong>Parada ' + (i + 1) + '</strong>');
        }
        caminho.forEach(function (p) { todosOsPontos.push(p); });
    });
    if (todosOsPontos.length > 0) mapa.fitBounds(L.latLngBounds(todosOsPontos).pad(0.15));
    setTimeout(function () { mapa.invalidateSize(); }, 400);
};

window.enviarMensagemGeral = async function () {
    var input = document.getElementById('msg-input');
    if (!window.AppRDO || !window.AppRDO.clienteId) {
        window.exibirModalValidacao('Selecione um cliente na lista primeiro.');
        return;
    }
    if (!input || !input.value.trim()) { window.marcarCampoInvalido(); return; }
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
    return h > 0 ? h + 'h ' + m + 'min' : m + 'min';
};

window.formatarDataSeparador = function (dataStr) {
    if (!dataStr) return null;
    var raw = String(dataStr);
    if (raw.includes('T') || raw.includes('-')) {
        var d = new Date(raw);
        if (!isNaN(d.getTime())) {
            var hoje = new Date(); hoje.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
            var diff = Math.floor((hoje - d) / 86400000);
            if (diff === 0) return 'HOJE';
            if (diff === 1) return 'ONTEM';
            return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
        }
    }
    var partes = raw.split('/');
    if (partes.length === 3) {
        var dm = new Date(partes[2], partes[1] - 1, partes[0]); dm.setHours(0, 0, 0, 0);
        var hc = new Date(); hc.setHours(0, 0, 0, 0);
        var dc = Math.floor((hc - dm) / 86400000);
        if (dc === 0) return 'HOJE';
        if (dc === 1) return 'ONTEM';
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
            '<div class="mt-2"><button class="btn btn-sm btn-outline-danger" onclick="window.carregarDados()">Tentar Novamente</button></div></div>';
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
        setTimeout(function () { container.classList.add('d-none'); }, 4000);
    }
};

window.exibirModalAviso = function (mensagem) { window.exibirModalValidacao(mensagem); };

window.extrairRotasDaMensagem = function (texto) {
    var rotas = [];
    texto.split('\n').forEach(function (linha) {
        linha = linha.trim();
        if (!linha) return;
        var m = linha.match(/De:\s*(.+?)\s*(?:\||–|—|-|→)\s*Para:\s*(.+)/i);
        if (m) { rotas.push({ de: m[1].replace(/^\d+[\.\)\-]\s*/, '').trim(), para: m[2].trim() }); return; }
        var m2 = linha.match(/De:\s*(.+?)\s+Para:\s*(.+)/i);
        if (m2) rotas.push({ de: m2[1].replace(/^\d+[\.\)\-]\s*/, '').trim(), para: m2[2].trim() });
    });
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
    var distancia = parseFloat((document.getElementById('p-distancia') || {}).value || 0) || 0;
    var valorKm = parseFloat((document.getElementById('p-valor-km') || {}).value || 0) || 0;
    var retorno = parseFloat((document.getElementById('p-retorno') || {}).value || 0) || 0;
    var dinamica = parseFloat((document.getElementById('p-dinamica') || {}).value || 0) || 0;
    var prioridade = parseFloat((document.getElementById('p-prioridade') || {}).value || 0) || 0;
    var base = distancia * valorKm;
    var total = base + (base * retorno) + dinamica + prioridade;
    if (total > 0 && total < 10) total = 10;
    var viewEl = document.getElementById('view-valor-final');
    if (viewEl) viewEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (window.dadosPedidoAtual) window.dadosPedidoAtual.valorFinal = total;
};

window.preencherDadosFormulario = function () {
    var d = window.dadosPedidoAtual;
    if (!d) return;
    var headerCliente = document.getElementById('header-nome-cliente');
    if (headerCliente) {
        headerCliente.innerText = d.cliente
            || (window.AppRDO ? window.AppRDO.clienteSelecionado : null)
            || localStorage.getItem('clienteSelecionadoNome')
            || 'Não identificado';
    }
    var el = function (id) { return document.getElementById(id); };
    if (el('p-solicitante')) el('p-solicitante').value = d.solicitante || '';
    if (el('p-contato')) el('p-contato').value = d.contato || '';
    if (el('p-distancia')) el('p-distancia').value = d.distancia || '';
    if (el('p-tempo')) el('p-tempo').value = d.tempo || '';
    if (el('p-rotas') && d.rawInput) {
        var rotas = window.extrairRotasDaMensagem(d.rawInput);
        el('p-rotas').value = rotas.map(function (r, i) {
            return (i + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
        }).join('\n');
    }
    if (el('p-horario') && !el('p-horario').value) {
        var agora = new Date();
        el('p-horario').value = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
};

window.validarFormularioCheckout = function () {
    var ids = ['p-solicitante', 'p-mercadoria', 'p-rotas'];
    var valido = true;
    var primeiro = null;
    ids.forEach(function (id) {
        var campo = document.getElementById(id);
        if (!campo) return;
        campo.style.border = '';
        campo.style.boxShadow = '';
        if (!(campo.value || '').trim()) {
            window.marcarCampoFormInvalido(campo);
            valido = false;
            if (!primeiro) primeiro = campo;
        }
    });
    if (primeiro) primeiro.focus();
    return valido;
};

window.iniciarFluxoCheckout = function () {
    var msgInput = document.getElementById('msg-input');
    var texto = msgInput ? (msgInput.value || '').trim() : '';
    if (!texto) { window.marcarCampoInvalido(); return; }
    var solicitante = ((texto.match(/(?:SOLICITANTE|NOME|CLIENTE):\s*(.*)/i) || [])[1] || 'Não informado').trim();
    var contato = ((texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE):\s*([\d\s\-\(\)\+]+)/i) || [])[1] || '').trim();
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
                        ' <i class="bi bi-arrow-right mx-1 text-muted"></i>' +
                        '<strong>Para:</strong> ' + r.para + '</span></div>';
                }).join('');
            }
            var kmTotal = 0, minTotal = 0, listaCaminhos = [];
            Promise.all(rotasExtraidas.map(function (rota) {
                return Promise.all([
                    window.buscarCoordenadasEndereco(rota.de),
                    window.buscarCoordenadasEndereco(rota.para)
                ]).then(function (coords) {
                    var p1 = coords[0], p2 = coords[1];
                    if (!p1 || !p2) return;
                    return fetch('https://router.project-osrm.org/route/v1/driving/' +
                        p1.lng + ',' + p1.lat + ';' + p2.lng + ',' + p2.lat +
                        '?overview=full&geometries=geojson')
                        .then(function (resp) { return resp.json(); })
                        .then(function (data) {
                            if (data.routes && data.routes[0]) {
                                kmTotal += data.routes[0].distance / 1000;
                                minTotal += data.routes[0].duration / 60;
                                listaCaminhos.push(data.routes[0].geometry.coordinates.map(function (c) { return [c[1], c[0]]; }));
                            }
                        });
                });
            })).then(function () {
                var kmArredondado = Math.round(kmTotal);
                window.dadosPedidoAtual = {
                    solicitante: solicitante, contato: contato,
                    cliente: (window.AppRDO ? window.AppRDO.clienteSelecionado : null) || localStorage.getItem('clienteSelecionadoNome') || 'N/A',
                    distancia: kmArredondado.toString(), tempo: window.formatarTempoHumano(minTotal),
                    coordenadas: listaCaminhos,
                    valor: (kmArredondado * 3.00).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    rawInput: texto
                };
                window.renderizarFooterResumo(resumoEl);
                window.renderizarMapaUnificado();
            }).catch(function () {
                if (resumoEl) resumoEl.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Erro ao calcular rotas</span>';
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
            if (elHeader && window.dadosPedidoAtual) elHeader.innerText = window.dadosPedidoAtual.solicitante || 'Cliente';
            var resumoEl = document.getElementById('resumo-total');
            if (resumoEl) window.renderizarFooterResumo(resumoEl);
            window.renderizarMapaUnificado();
        }, { once: true });
        modalMapa.show();
    });
};

window.salvarPedidoAPI = async function () {
    if (typeof window.validarFormularioCheckout === 'function' && !window.validarFormularioCheckout()) return;
    var idCliente = window.AppRDO ? window.AppRDO.clienteId : null;
    if (!idCliente) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', title: 'Nenhum cliente selecionado', text: 'Selecione um cliente na lista antes de emitir o pedido.', confirmButtonColor: '#dc3545' });
        }
        return;
    }
    var d = window.dadosPedidoAtual || {};
    var el = function (id) { return document.getElementById(id); };
    var solicitante = (el('p-solicitante') ? el('p-solicitante').value.trim() : '') || d.solicitante || '';
    var contato = (el('p-contato') ? el('p-contato').value.trim() : '') || d.contato || '';
    var horario = (el('p-horario') ? el('p-horario').value.trim() : '') || d.horario || '';
    var mercadoria = (el('p-mercadoria') ? el('p-mercadoria').value.trim() : '') || d.mercadoria || '';
    var rotasRaw = el('p-rotas') ? el('p-rotas').value.trim() : '';
    var observacao = (el('p-obs') ? el('p-obs').value.trim() : '') || 'N/A';
    var valorCorrida = (el('view-valor-final') ? el('view-valor-final').innerText.trim() : '') || 'R$ 0,00';
    var retorno = 'Não';
    if (el('p-retorno')) {
        var rv = (el('p-retorno').value || '').trim().toUpperCase();
        if (rv === 'SIM' || rv === 'S' || rv === 'TRUE' || rv === '1') retorno = 'Sim';
    }
    var prioridade = el('p-prioridade') ? (el('p-prioridade').value || '0').trim() : '0';
    var rotasLimpas = [];
    if (d.rotas && Array.isArray(d.rotas) && d.rotas.length > 0) {
        rotasLimpas = d.rotas.map(function (r) {
            return { de: (r.de || '').replace(/^\d+\.\s*/, '').replace(/^De:\s*/i, '').trim(), para: (r.para || '').replace(/^Para:\s*/i, '').trim() };
        });
    } else if (rotasRaw) {
        rotasRaw.split('\n').forEach(function (linha) {
            linha = linha.trim();
            if (!linha) return;
            if (/de:/i.test(linha) && /\|/.test(linha)) {
                var partes = linha.split('|');
                rotasLimpas.push({
                    de: partes[0].replace(/^De:\s*/i, '').replace(/^\d+\.\s*/, '').trim(),
                    para: (partes[1] || '').replace(/^Para:\s*/i, '').trim()
                });
            }
        });
    }
    var rotasTextoBackend = rotasLimpas.map(function (r) { return 'De: ' + r.de + ' | Para: ' + r.para; }).join('\n');
    var rotasTextoChat = rotasLimpas.map(function (r, idx) { return '📍' + (idx + 1) + '. De: ' + r.de + ' | \n      Para: ' + r.para; }).join('\n');
    var mensagemChat = [
        '📦 SOLICITANTE: ' + solicitante, '',
        'N.SERVIÇO: [ID_GERADO]',
        'SOLICITANTE: ' + solicitante + ' ',
        'CONTATO: ' + contato + ' | HR: ' + horario, '-',
        'MERCADORIA: ' + mercadoria, 'RETORNO: ' + retorno, '-',
        'ROTA(s): ', rotasTextoChat, '-',
        'OBSERVAÇÃO: ' + observacao, valorCorrida
    ].join('\n');
    var btnEmitir = document.getElementById('btn-emitir-pedido');
    if (btnEmitir) { btnEmitir.disabled = true; btnEmitir.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Emitindo...'; }
    try {
        var resposta = await API.call('finalizarpedido', {
            id_cliente: idCliente, solicitante: solicitante, contato: contato,
            horario: horario, mercadoria: mercadoria, rotas_texto: rotasTextoBackend,
            retorno: retorno, prioridade: prioridade, valor_corrida: valorCorrida,
            observacao: observacao, mensagem: mensagemChat
        });
        var idGerado = resposta.id || '';
        var idClienteResp = resposta.id_cliente || idCliente;
        var modalEl = document.getElementById('modalFormulario');
        if (modalEl) { var mi = bootstrap.Modal.getInstance(modalEl); if (mi) mi.hide(); }
        var mensagemFinal = mensagemChat.replace('[ID_GERADO]', idGerado);
        var horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        var dataAgora = new Date().toLocaleDateString('pt-BR');
        if (window.AppRDO) {
            if (window.AppRDO.mensagensCache) window.AppRDO.mensagensCache.push({
                id: idClienteResp + '_' + idGerado, id_cliente: idClienteResp, pedido_id: idGerado,
                texto: mensagemFinal, hora: horaAgora, data: dataAgora, finalizado: 'TRUE'
            });
            if (window.AppRDO.pedidosCache) window.AppRDO.pedidosCache.push({
                id: idGerado, id_cliente: idClienteResp, solicitante: solicitante, contato: contato,
                horario: horario, mercadoria: mercadoria,
                de: rotasLimpas.map(function (r) { return r.de; }).join(', '),
                para: rotasLimpas.map(function (r) { return r.para; }).join(', '),
                retorno: retorno, prioridade: prioridade, valor_corrida: valorCorrida,
                motoboy: '', status: 'PENDENTE', observacao: observacao
            });
        }
        var container = document.getElementById('chat-messages-container');
        if (container) {
            var emptyState = container.querySelector('.chat-empty-state');
            if (emptyState) emptyState.remove();
            var ultimoSep = container.querySelector('.chat-date-separator:last-of-type .chat-date-badge');
            if (!ultimoSep || ultimoSep.textContent !== 'HOJE') {
                var sep = document.createElement('div');
                sep.className = 'chat-date-separator';
                sep.innerHTML = '<span class="chat-date-badge">HOJE</span>';
                container.appendChild(sep);
            }
            container.appendChild(_criarWrapperMensagem(idGerado, mensagemFinal, horaAgora, false, '', 'Alterar Status'));
            container.scrollTop = container.scrollHeight;
        }
        var msgInput = document.getElementById('msg-input');
        if (msgInput) msgInput.value = '';
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success', title: 'Pedido ' + idGerado + ' Emitido!',
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 3000, timerProgressBar: true, customClass: { popup: 'rounded-4 shadow' }
            });
        }
        if (btnEmitir) { btnEmitir.disabled = false; btnEmitir.innerHTML = '<i class="bi bi-send-fill me-1"></i>EMITIR PEDIDO'; }
    } catch (err) {
        if (btnEmitir) { btnEmitir.disabled = false; btnEmitir.innerHTML = '<i class="bi bi-send-fill me-1"></i>EMITIR PEDIDO'; }
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Erro ao emitir pedido', text: err.message || 'Falha ao salvar o pedido.', confirmButtonColor: '#dc3545' });
        }
    }
};

(function () {
    function _handleSyncClick(e) {
        var btn = e.target.closest('#btn-sync-chat');
        if (!btn) return;
        if (window.AppRDO && window.AppRDO.isFetching) return;
        if (typeof window.carregarDados === 'function') window.carregarDados();
    }
    document.removeEventListener('click', _handleSyncClick);
    document.addEventListener('click', _handleSyncClick);
    function _tentarInit() {
        if (window.AppRDO && !window.AppRDO.listaCarregada && !window.AppRDO.isFetching) window.carregarDados();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _tentarInit);
    else _tentarInit();
})();
