window.marcarCampoInvalido = function () {
    var input = document.getElementById('msg-input');
    if (!input) return;
    input.style.border = '2px solid #dc3545';
    input.style.boxShadow = '0 0 0 0.2rem rgba(220,53,69,.25)';
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
    campo.style.boxShadow = '0 0 0 0.2rem rgba(220,53,69,.25)';
    setTimeout(function () {
        campo.style.border = '';
        campo.style.boxShadow = '';
    }, 3000);
};

window.AppRDO = window.AppRDO || {};
window.AppRDO.debounceTimer = window.AppRDO.debounceTimer || null;
window.AppRDO.listaCarregada = false;
window.AppRDO.isFetching = window.AppRDO.isFetching || false;
window.AppRDO.isProcessingCheckout = false;
window.AppRDO.pedidosCache = window.AppRDO.pedidosCache || [];
window.AppRDO.motoboyCache = window.AppRDO.motoboyCache || [];
window.AppRDO.pedidoEmEdicao = null;
window.AppRDO.clienteId = window.AppRDO.clienteId || null;
window.AppRDO.clienteSelecionado = window.AppRDO.clienteSelecionado || null;
window.AppRDO.clientesCache = window.AppRDO.clientesCache || [];
window.AppRDO.mensagensCache = window.AppRDO.mensagensCache || [];
window.AppRDO.isMasterOn = localStorage.getItem('bot_master_active') === 'true';
window.AppRDO._mapaModalAberto = false;

window.dadosPedidoAtual = window.dadosPedidoAtual || {};

window.addEventListener('masterStatusChanged', function (e) {
    var isOn = !!(e.detail && e.detail.isOn);
    window.AppRDO.isMasterOn = isOn;
    var clientes = window.AppRDO.clientesCache || [];
    window.renderizarLista(clientes, isOn);
    if (window.AppRDO.clienteId) {
        var cliente = clientes.find(function (c) {
            return String(c.id) === String(window.AppRDO.clienteId);
        });
        if (cliente) {
            _atualizarHeaderCliente(
                cliente.username || 'Sem nome',
                isOn && String(cliente.status || '').toUpperCase() === 'TRUE'
            );
        }
    }
});

window.addEventListener('clienteStatusChanged', function (e) {
    if (!e.detail) return;
    var clientes = e.detail.clientes || window.AppRDO.clientesCache || [];
    var isMasterOn = e.detail.isMasterOn;
    window.AppRDO.clientesCache = clientes;
    window.AppRDO.isMasterOn = isMasterOn;
    window.renderizarLista(clientes, isMasterOn);
});

function _atualizarHeaderCliente(nome, isOnline) {
    var nameEl = document.getElementById('chat-header-name');
    if (nameEl) nameEl.innerText = nome;
    if (window.AppRDO && window.AppRDO.clienteId) {
        var item = document.getElementById('item-contato-' + window.AppRDO.clienteId);
        if (item) {
            var dot = item.querySelector('.contact-status-dot');
            var label = item.querySelector('.contact-status');
            if (dot) dot.style.backgroundColor = isOnline ? '#28a745' : '#adb5bd';
            if (label) label.textContent = isOnline ? 'Online' : 'Offline';
        }
    }
}

function _limparBackdrop() {
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-y');
    document.body.style.removeProperty('padding-right');
}

function _limparModalContainer() {
    var container = document.getElementById('modal-container');
    if (!container) return;
    container.querySelectorAll('.modal').forEach(function (modalEl) {
        try {
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (inst) inst.dispose();
        } catch (_) { }
    });
    container.innerHTML = '';
}

window._limparBackdrop = _limparBackdrop;

window.loadModal = function (arquivo) {
    return new Promise(function (resolve) {
        var container = document.getElementById('modal-container');
        if (!container) { resolve(false); return; }

        var abertos = Array.prototype.slice.call(
            document.querySelectorAll('#modal-container .modal.show')
        );
        var pendentes = abertos.length;

        function _carregarHtml() {
            var base = window.location.pathname.replace(/\/[^/]*$/, '/');
            if (base.indexOf('/pages/') !== -1) {
                base = base.substring(0, base.indexOf('/pages/') + 1);
            }
            fetch(base + 'pages/chat/' + arquivo)
                .then(function (resp) {
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    return resp.text();
                })
                .then(function (html) {
                    _limparBackdrop();
                    container.innerHTML = html;
                    setTimeout(function () { resolve(true); }, 80);
                })
                .catch(function () { resolve(false); });
        }

        if (pendentes === 0) {
            _limparBackdrop();
            _limparModalContainer();
            _carregarHtml();
            return;
        }

        abertos.forEach(function (modalEl) {
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (!inst) {
                try { modalEl.classList.remove('show'); modalEl.style.display = 'none'; } catch (_) { }
                pendentes--;
                if (pendentes === 0) { _limparBackdrop(); _carregarHtml(); }
                return;
            }
            modalEl.addEventListener('hidden.bs.modal', function () {
                try { inst.dispose(); } catch (_) { }
                pendentes--;
                if (pendentes === 0) { _limparBackdrop(); _carregarHtml(); }
            }, { once: true });
            try {
                inst.hide();
            } catch (_) {
                pendentes--;
                if (pendentes === 0) { _limparBackdrop(); _carregarHtml(); }
            }
        });
    });
};

window.iniciarChat = function () {
    return window.carregarDados();
};

document.addEventListener('input', function (e) {
    if (!e.target) return;
    if (e.target.id === 'p-contato') {
        var val = e.target.value.replace(/\D/g, '');
        e.target.value = typeof window.formatarTelefone === 'function'
            ? window.formatarTelefone(val) : val;
    }
    if (e.target.id === 'chat-search') window.filtrarContatos();
    if (e.target.closest && e.target.closest('#modalFormulario')) {
        e.target.style.border = '';
        e.target.style.boxShadow = '';
    }
    if (e.target.id === 'msg-input') {
        e.target.style.border = '';
        e.target.style.boxShadow = '';
        e.target.setAttribute('placeholder', 'Digite o pedido...');
    }
});

document.addEventListener('change', function (e) {
    if (!e.target) return;
    if (e.target.closest && e.target.closest('#modalFormulario')) {
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
    var matchS = texto.match(/(?:SOLICITANTE|NOME|CLIENTE)\s*:\s*(.+)/i);
    var temSolicitante = !!(matchS && matchS[1] && matchS[1].trim().length > 0);
    var matchC = texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE)\s*:\s*(.+)/i);
    var temContato = !!(matchC && matchC[1] && matchC[1].trim().length > 0);
    var quantRotas = 0;
    texto.split('\n').forEach(function (linha) {
        linha = linha.trim();
        if (!/de\s*:/i.test(linha) || !/para\s*:/i.test(linha)) return;
        var vDe = linha.match(/de\s*:\s*([^|]+)/i);
        var vPara = linha.match(/para\s*:\s*(.+)/i);
        if (vDe && vDe[1] && vDe[1].trim() !== '...' && vDe[1].trim().length > 0 &&
            vPara && vPara[1] && vPara[1].trim() !== '...' && vPara[1].trim().length > 0) {
            quantRotas++;
        }
    });
    var temRota = quantRotas >= 1;
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
    var iconeEl = document.getElementById('modal-validacao-icone');
    var tituloEl = document.getElementById('modal-validacao-titulo');
    if (msgEl) msgEl.innerHTML = mensagem;
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
    var modaisAbertos = document.querySelectorAll('#modal-container .modal.show');
    modaisAbertos.forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) { try { inst.hide(); } catch (_) { } }
    });
    try {
        var instExist = bootstrap.Modal.getInstance(modalEl);
        if (instExist) { try { instExist.dispose(); } catch (_) { } }
        setTimeout(function () {
            _limparBackdrop();
            new bootstrap.Modal(modalEl).show();
        }, modaisAbertos.length > 0 ? 350 : 0);
    } catch (_) {
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
    if (!btn) return;
    var original = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check2 me-1"></i> Copiado!';
    btn.classList.replace('btn-outline-danger', 'btn-success');
    setTimeout(function () {
        btn.innerHTML = original;
        btn.classList.replace('btn-success', 'btn-outline-danger');
    }, 2000);
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
        var btnConfirm = _el('btn-confirmar-exclusao');
        _senhaVisivel = false;
        if (input) { input.value = ''; input.type = 'password'; input.classList.remove('is-invalid'); }
        if (erroEl) erroEl.classList.remove('visivel');
        if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.innerHTML = '<i class="bi bi-trash3-fill me-2"></i>Confirmar Exclusão'; }
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
            input.focus(); input.select();
            setTimeout(function () { if (input) input.classList.remove('is-invalid'); }, 800);
        }
    }

    function _setBtnCarregando() {
        var btn = _el('btn-confirmar-exclusao');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...'; }
    }

    function _setBtnPadrao() {
        var btn = _el('btn-confirmar-exclusao');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-trash3-fill me-2"></i>Confirmar Exclusão'; }
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
        try { if (_modalBS) _modalBS.hide(); } catch (_) { }
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
        if (!senha || !senha.trim()) { _mostrarErro('Informe a senha master para continuar.'); return; }
        _setBtnCarregando();
        try {
            var resposta = await API.call('validarsenhamaster', { senha: senha.trim() });
            if (!resposta || resposta.status !== 'success' || !resposta.valido) {
                _mostrarErro('Senha incorreta. Acesso negado.');
                _setBtnPadrao();
                return;
            }
            var idParaExcluir = _pedidoId;
            _pedidoId = null;
            try { if (_modalBS) _modalBS.hide(); } catch (_) { }
            _resetar();
            await _executarExclusao(idParaExcluir);
        } catch (_) {
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
                wrapper.style.transition = 'opacity .3s ease, transform .3s ease';
                wrapper.style.opacity = '0';
                wrapper.style.transform = 'translateX(30px)';
                setTimeout(function () { try { wrapper.remove(); } catch (_) { } }, 300);
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
                    icon: 'success', title: 'Excluído!', text: 'A mensagem foi removida com sucesso.',
                    toast: true, position: 'top-end', showConfirmButton: false,
                    timer: 2500, timerProgressBar: true, customClass: { popup: 'rounded-4 shadow' }
                });
            }
        } catch (err) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error', title: 'Erro ao excluir',
                    text: err.message || 'Não foi possível remover a mensagem.',
                    confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' }
                });
            }
        }
    }

    return { abrir: abrir, cancelar: cancelar, confirmar: confirmar, toggleSenha: toggleSenha, onKeydown: onKeydown };
})();

window.carregarPedidosDoCliente = async function (clienteId) {
    if (!clienteId) return;
    try {
        var todosPedidos = await API.call('getpedidos');
        var todasMensagens = await API.call('getchat');
        var pedidosCliente = todosPedidos.filter(function (p) {
            return String(p.id_cliente).trim() === String(clienteId).trim();
        });
        var mensagensCliente = todasMensagens.filter(function (m) {
            return String(m.id_cliente).trim() === String(clienteId).trim();
        });
        window.AppRDO.pedidosCache = todosPedidos;
        window.AppRDO.mensagensCache = todasMensagens;
        window.renderizarMensagens(mensagensCliente, pedidosCliente);
    } catch (err) {
        _mostrarChatEmptyState('Erro ao carregar mensagens');
    }
};

window.carregarDados = function () {
    var listEl = document.getElementById('lista-contatos-chat');
    var searchInput = document.getElementById('chat-search');
    if (!listEl || window.AppRDO.isFetching) return Promise.resolve();
    window.AppRDO.isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    window.AppRDO.isFetching = true;
    _spinChatOn();
    _mostrarLoadingContatos();
    if (searchInput) searchInput.placeholder = 'Sincronizando...';
    return Promise.all([
        API.call('getclientes'),
        API.call('getchat'),
        API.call('getpedidos')
    ]).then(function (results) {
        var listaClientes = Array.isArray(results[0]) ? results[0] : [];
        var listaMensagens = Array.isArray(results[1]) ? results[1] : [];
        var listaPedidos = Array.isArray(results[2]) ? results[2] : [];
        var isMasterOn = window.AppRDO.isMasterOn;
        window.AppRDO.clientesCache = listaClientes;
        window.AppRDO.mensagensCache = listaMensagens;
        window.AppRDO.pedidosCache = listaPedidos;
        window.renderizarLista(listaClientes, isMasterOn);
        if (!window.AppRDO.clienteId && listaClientes.length > 0) {
            var primeiro = listaClientes[0];
            window.selecionarEAbrir(
                String(primeiro.id || ''),
                primeiro.username || 'Sem nome',
                isMasterOn && String(primeiro.status || '').toUpperCase() === 'TRUE'
            );
        } else if (window.AppRDO.clienteId) {
            var clienteAtual = listaClientes.find(function (c) {
                return String(c.id) === String(window.AppRDO.clienteId);
            });
            if (clienteAtual) {
                window.abrirConversa(
                    window.AppRDO.clienteId,
                    clienteAtual.username || 'Sem nome',
                    null,
                    isMasterOn && String(clienteAtual.status || '').toUpperCase() === 'TRUE'
                );
            }
        } else {
            _mostrarChatEmptyState('Nenhum contato disponível');
        }
        window.AppRDO.listaCarregada = true;
        if (searchInput) searchInput.placeholder = 'Buscar cliente...';
    }).catch(function () {
        _mostrarContatosEmptyState('Erro ao carregar dados');
        _mostrarChatEmptyState('Erro ao carregar mensagens');
    }).finally(function () {
        window.AppRDO.isFetching = false;
        _spinChatOff();
    });
};

window.renderizarLista = function (lista, isMasterOn) {
    var listEl = document.getElementById('lista-contatos-chat');
    if (!listEl) return;
    if (!lista || lista.length === 0) { _mostrarContatosEmptyState('Nenhum contato disponível'); return; }
    var clienteAtivo = window.AppRDO.clienteId;
    listEl.innerHTML = lista.map(function (cliente) {
        var id = String(cliente.id || '');
        var nome = cliente.username || 'Sem nome';
        var imagem = cliente.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        var isOnline = isMasterOn && String(cliente.status || '').toUpperCase() === 'TRUE';
        var isActive = id === String(clienteAtivo);
        var nomeEsc = nome.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return '<div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean ' +
            (isActive ? 'active-contact' : '') + '" id="item-contato-' + id + '" ' +
            'onclick="window.selecionarEAbrir(\'' + id + '\',\'' + nomeEsc + '\',' + isOnline + ')">' +
            '<div class="position-relative">' +
            '<img src="' + imagem + '" class="rounded-circle contact-avatar" ' +
            'onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">' +
            '<span class="position-absolute bottom-0 end-0 rounded-circle border border-white contact-status-dot" ' +
            'style="background-color:' + (isOnline ? '#28a745' : '#adb5bd') + ';"></span>' +
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
    var item = document.getElementById('item-contato-' + id);
    if (item) item.classList.add('active-contact');
    if (!isOnline) {
        window.exibirModalValidacao(
            'Por favor, entre em contato com o seu administrador.<strong> O cliente está offline.</strong>'
        );
    }
    window.abrirConversa(id, nome, null, isOnline);
};

window.abrirConversa = function (id, nome, urlImagem, isOnline) {
    var idCliente = String(id).trim();
    var nameEl = document.getElementById('chat-header-name');
    if (nameEl) { nameEl.innerText = nome; nameEl.className = 'text-dark fw-bold'; }
    _mostrarLoadingMensagens();
    var msgInput = document.getElementById('msg-input');
    if (msgInput) {
        msgInput.value = window.MODELO_PADRAO;
        msgInput.style.border = '';
        msgInput.style.boxShadow = '';
        msgInput.setAttribute('placeholder', 'Digite o pedido...');
    }
    return window.carregarPedidosDoCliente(idCliente);
};

window.renderizarMensagens = function (mensagens, pedidos) {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML = '';
    window.AppRDO.pedidosCache = pedidos;
    if (!mensagens || mensagens.length === 0) { _mostrarChatEmptyState('Nenhum histórico encontrado'); return; }
    var ultimaData = null;
    mensagens.forEach(function (msg) {
        var labelData = window.formatarDataSeparador(msg.data || null);
        if (labelData && labelData !== ultimaData) {
            ultimaData = labelData;
            var sep = document.createElement('div');
            sep.className = 'chat-date-separator';
            sep.innerHTML = '<span class="chat-date-badge">' + labelData + '</span>';
            container.appendChild(sep);
        }
        var pedido = pedidos.find(function (p) { return String(p.id).trim() === String(msg.pedido_id).trim(); });
        var statusBruto = String(pedido ? pedido.status : '').trim();
        var motoboyNome = String(pedido ? pedido.motoboy : '').trim();
        var statusPuro = statusBruto.includes('/') ? statusBruto.split('/').pop().trim() : statusBruto;
        var statusUpper = statusPuro.toUpperCase();
        var isFinal = statusUpper === 'CONCLUIDO' || statusUpper === 'CONCLUÍDO' || statusUpper === 'CANCELADO';
        var isEmRota = statusUpper === 'EM_ROTA' || statusUpper === 'EM ROTA' || statusBruto.includes('/');
        var temStatus = isEmRota || isFinal;
        var statusLabel = statusPuro.replace(/_/g, ' ');
        var tooltipTexto = temStatus
            ? (motoboyNome ? motoboyNome + ' • ' + statusLabel : statusLabel)
            : 'Alterar Status';
        container.appendChild(_criarWrapperMensagem(msg.pedido_id, msg.texto || '', msg.hora || '', temStatus, statusPuro, tooltipTexto));
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
        'onclick="event.stopPropagation();window.MasterAuth.abrir(\'' + pedidoId + '\')">' +
        '<i class="bi bi-trash3-fill"></i>' +
        '</button>' +
        '<div class="message-sent" data-pedido-id="' + pedidoId + '" ' +
        'onclick="window.abrirModalEdicao(\'' + pedidoId + '\')">' +
        '<div class="message-body">' + texto.replace(/\n/g, '<br>') + '</div>' +
        '<div class="status-icon ' + (temStatus ? 'status-updated' : 'status-pending') + '" ' +
        'onclick="event.stopPropagation();window.abrirModalStatus(\'' + pedidoId + '\')" ' +
        'data-tooltip="' + tooltipTexto + '">' +
        iconHTML +
        '</div>' +
        '<span class="message-time">' + hora + '</span>' +
        '</div>';
    div.addEventListener('mouseenter', function () { div.classList.add('msg-hover-active'); });
    div.addEventListener('mouseleave', function () { div.classList.remove('msg-hover-active'); });
    return div;
}

window._criarWrapperMensagem = _criarWrapperMensagem;

window.enviarMensagemParaChat = function (texto, isRecebida, pedidoId) {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;
    var emptyState = container.querySelector('.chat-empty-state');
    if (emptyState) emptyState.remove();
    var hojeLabel = 'HOJE';
    var ultimoSep = container.querySelector('.chat-date-separator:last-of-type .chat-date-badge');
    if (!ultimoSep || ultimoSep.textContent !== hojeLabel) {
        var sep = document.createElement('div');
        sep.className = 'chat-date-separator';
        sep.innerHTML = '<span class="chat-date-badge">' + hojeLabel + '</span>';
        container.appendChild(sep);
    }
    var horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    container.appendChild(_criarWrapperMensagem(pedidoId || null, texto, horaAtual, false, '', 'Alterar Status'));
    container.scrollTop = container.scrollHeight;
};

window.getIconePorStatus = function (status) {
    var s = String(status || '').trim().toUpperCase();
    if (s.includes('EM_ROTA') || s.includes('EM ROTA') || s.includes('/'))
        return '<i class="bi bi-bicycle" style="color:#0d6efd;"></i>';
    if (s.includes('CONCLUIDO') || s.includes('CONCLUÍDO'))
        return '<i class="bi bi-check-circle-fill" style="color:#28a745;"></i>';
    if (s.includes('CANCELADO'))
        return '<i class="bi bi-x-circle-fill" style="color:#dc3545;"></i>';
    return '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
};

window.StatusModal = (function () {
    var _pedidoId = null;
    var _modalBS = null;

    function _el(id) { return document.getElementById(id) || null; }
    function _safeText(el, txt) { if (el && typeof txt === 'string') el.textContent = txt; }
    function _safeClass(el, action) {
        if (!el || !el.classList) return;
        Array.prototype.slice.call(arguments, 2).forEach(function (c) {
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
        } catch (_) { }
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
            select.innerHTML = motoboys.length > 0
                ? '<option value="" disabled selected>Selecione o motoboy...</option>' +
                motoboys.map(function (m) {
                    return '<option value="' + String(m.id || '') + '">' +
                        String(m.username || m.nome || 'Sem nome') + '</option>';
                }).join('')
                : '<option value="" disabled selected>Nenhum motoboy disponível</option>';
        } catch (_) {
            select.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        }
    }

    function _setSpinnerNoBotao(pedidoId) {
        try {
            var msgEl = document.querySelector('[data-pedido-id="' + pedidoId + '"]');
            var iconEl = msgEl ? msgEl.querySelector('.status-icon') : null;
            if (!iconEl) return;
            iconEl.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
            iconEl.classList.remove('status-updated');
            iconEl.classList.add('status-pending');
            iconEl.setAttribute('data-tooltip', 'Atualizando...');
        } catch (_) { }
    }

    function _setIconeFinal(pedidoId, status, motoboyNome) {
        try {
            var msgEl = document.querySelector('[data-pedido-id="' + pedidoId + '"]');
            var iconEl = msgEl ? msgEl.querySelector('.status-icon') : null;
            if (!iconEl) return;
            iconEl.innerHTML = typeof window.getIconePorStatus === 'function'
                ? window.getIconePorStatus(status) : '<i class="bi bi-question-circle"></i>';
            iconEl.classList.remove('status-pending');
            iconEl.classList.add('status-updated');
            var statusLabel = String(status || '').replace(/_/g, ' ');
            var tooltip = motoboyNome ? motoboyNome + ' • ' + statusLabel : statusLabel;
            iconEl.setAttribute('data-tooltip', tooltip);
            iconEl.setAttribute('title', tooltip);
        } catch (_) { }
    }

    function _atualizarCache(pedidoId, statusFormatado, motoboyNome) {
        try {
            var cache = window.AppRDO ? window.AppRDO.pedidosCache : null;
            if (!Array.isArray(cache)) return;
            var pedido = cache.find(function (p) { return String(p.id || '').trim() === String(pedidoId || '').trim(); });
            if (!pedido) return;
            pedido.status = statusFormatado;
            if (motoboyNome) pedido.motoboy = motoboyNome;
        } catch (_) { }
    }

    async function _executarAlteracao(status, motoboyId) {
        var motoboyNome = '';
        var statusFormatado = String(status || '');
        if (motoboyId) {
            try {
                var select = _el('select-motoboy');
                if (select && select.selectedIndex >= 0) {
                    motoboyNome = String(select.options[select.selectedIndex].text || '').trim();
                }
            } catch (_) { motoboyNome = ''; }
        }
        if (motoboyNome) statusFormatado = motoboyNome + '/' + status;
        _setSpinnerNoBotao(_pedidoId);
        try { if (_modalBS) _modalBS.hide(); } catch (_) { }
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
                } catch (_) { }
            } else {
                throw new Error((resposta && resposta.message) || 'Falha na API');
            }
        } catch (e) {
            _setIconeFinal(_pedidoId, '', '');
            try {
                Swal.fire({
                    icon: 'error', title: 'Erro',
                    html: '<div style="font-size:.9rem;">Não foi possível alterar o status.</div>',
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
                var isConcluido = statusPuro !== 'CANCELADO';
                Swal.fire({
                    icon: isConcluido ? 'success' : 'error', title: 'Pedido Finalizado',
                    html: '<div style="font-size:.93rem;color:#555;">Este pedido já foi <strong style="color:' +
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
            _modalBS = new bootstrap.Modal(modalEl, { backdrop: 'static' });
            _modalBS.show();
        } catch (_) { }
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
            try { if (_modalBS) _modalBS.hide(); } catch (_) { }
            Swal.fire({
                icon: cfg.icone, title: cfg.titulo,
                html: '<div style="font-size:.9rem;color:#555;">' + cfg.html + '</div>',
                showCancelButton: true, confirmButtonText: cfg.btnTexto,
                cancelButtonText: 'Voltar', confirmButtonColor: cfg.btnCor,
                cancelButtonColor: '#6c757d', reverseButtons: true,
                customClass: { popup: 'rounded-4', confirmButton: 'rounded-3', cancelButton: 'rounded-3' }
            }).then(async function (result) {
                if (result.isConfirmed) await _executarAlteracao(status);
            }).catch(function () { });
        } catch (_) { }
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
        } catch (_) { }
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
    var existing = bootstrap.Modal.getInstance(modalEl);
    if (existing) { try { existing.dispose(); } catch (_) { } }
    new bootstrap.Modal(modalEl).show();
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

window.buscarCoordenadasEndereco = function (endereco) {
    return new Promise(function (resolve) {
        var busca = endereco;
        if (!/MG|Minas Gerais/i.test(busca)) busca += ', MG';
        if (!/Brasil|Brazil/i.test(busca)) busca += ', Brasil';
        fetch('https://nominatim.openstreetmap.org/search?format=json&q=' +
            encodeURIComponent(busca) + '&limit=1&countrycodes=br')
            .then(function (resp) { return resp.json(); })
            .then(function (data) {
                resolve(data && data.length > 0 ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null);
            })
            .catch(function () { resolve(null); });
    });
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
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    if (raw.includes('T') || raw.includes('-')) {
        var d = new Date(raw);
        if (!isNaN(d.getTime())) {
            d.setHours(0, 0, 0, 0);
            var diff = Math.floor((hoje - d) / 86400000);
            if (diff === 0) return 'HOJE';
            if (diff === 1) return 'ONTEM';
            return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
        }
    }
    var partes = raw.split('/');
    if (partes.length === 3) {
        var dm = new Date(partes[2], partes[1] - 1, partes[0]); dm.setHours(0, 0, 0, 0);
        var dc = Math.floor((hoje - dm) / 86400000);
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

window.renderizarMapaUnificado = function () {
    var loaderEl = document.getElementById('mapa-loader');
    var containerEl = document.getElementById('container-mapa-visual');
    if (!containerEl) return;

    if (window._leafletMapInstance) {
        try { window._leafletMapInstance.remove(); } catch (_) { }
        window._leafletMapInstance = null;
    }
    containerEl.innerHTML = '';
    containerEl.style.display = 'none';

    if (!window.dadosPedidoAtual || !window.dadosPedidoAtual.coordenadas || window.dadosPedidoAtual.coordenadas.length === 0) {
        if (loaderEl) {
            loaderEl.style.display = '';
            loaderEl.innerHTML = '<p class="text-muted small mb-0"><i class="bi bi-exclamation-circle me-1"></i>Nenhuma rota para exibir.</p>';
        }
        return;
    }

    if (typeof L === 'undefined') {
        if (loaderEl) {
            loaderEl.style.display = '';
            loaderEl.innerHTML = '<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Biblioteca de mapa não carregada.</p>';
        }
        return;
    }

    if (loaderEl) loaderEl.style.display = 'none';
    containerEl.style.display = 'block';

    var altura = containerEl.offsetHeight;
    if (!altura || altura < 50) containerEl.style.height = '340px';

    var mapa = L.map(containerEl, { zoomControl: true, scrollWheelZoom: true }).setView([-19.92, -43.94], 12);
    window._leafletMapInstance = mapa;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19
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

    window.dadosPedidoAtual.coordenadas.forEach(function (caminho, i) {
        if (!caminho || caminho.length === 0) return;
        L.polyline(caminho, { color: cores[i % cores.length], weight: 4, opacity: 0.85, dashArray: '10,8' }).addTo(mapa);
        if (i === 0) {
            L.marker(caminho[0], { icon: criarIcone('🏁') }).addTo(mapa).bindPopup('<strong>Origem</strong>');
        }
        if (i === window.dadosPedidoAtual.coordenadas.length - 1) {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('📍') }).addTo(mapa).bindPopup('<strong>Destino Final</strong>');
        } else {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('🔄') }).addTo(mapa).bindPopup('<strong>Parada ' + (i + 1) + '</strong>');
        }
        caminho.forEach(function (p) { todosOsPontos.push(p); });
    });

    if (todosOsPontos.length > 0) {
        try { mapa.fitBounds(L.latLngBounds(todosOsPontos).pad(0.15)); } catch (_) { }
    }

    setTimeout(function () {
        try { mapa.invalidateSize(true); } catch (_) { }
    }, 300);
};

window._renderizarResumo = function (km, min, valor) {
    var footer = document.getElementById('footer-resumo-dados');
    if (!footer) return;
    footer.innerHTML =
        '<div class="d-flex align-items-center justify-content-center gap-4 py-3">' +
        '<div class="d-flex align-items-center gap-2">' +
        '<i class="bi bi-signpost-split-fill text-danger" style="font-size:1.5rem;"></i>' +
        '<div><div class="small text-muted mb-1">Distância</div>' +
        '<div class="fw-bold text-dark fs-5">' + km + ' km</div></div></div>' +
        '<div class="vr" style="height:50px;opacity:0.3;"></div>' +
        '<div class="d-flex align-items-center gap-2">' +
        '<i class="bi bi-clock-fill text-primary" style="font-size:1.5rem;"></i>' +
        '<div><div class="small text-muted mb-1">Tempo</div>' +
        '<div class="fw-bold text-dark fs-5">' + window.formatarTempoHumano(min) + '</div></div></div>' +
        '<div class="vr" style="height:50px;opacity:0.3;"></div>' +
        '<div class="d-flex align-items-center gap-2">' +
        '<i class="bi bi-cash-stack text-success" style="font-size:1.5rem;"></i>' +
        '<div><div class="small text-muted mb-1">Valor</div>' +
        '<div class="fw-bold text-success fs-5">' + valor + '</div></div></div></div>';
};

window.enviarMensagemGeral = function () {
    var input = document.getElementById('msg-input');
    if (!window.AppRDO || !window.AppRDO.clienteId) {
        window.exibirModalValidacao('Selecione um cliente na lista primeiro.');
        return;
    }
    if (!input || !input.value.trim()) { window.marcarCampoInvalido(); return; }
    if (!window.AppRDO.isMasterOn) {
        window.exibirModalValidacao('O sistema está desligado.<br><strong>Contate o administrador.</strong>');
        return;
    }
    var clienteAtual = (window.AppRDO.clientesCache || []).find(function (c) {
        return String(c.id) === String(window.AppRDO.clienteId);
    });
    if (clienteAtual && String(clienteAtual.status || '').toUpperCase() !== 'TRUE') {
        window.exibirModalValidacao(
            'Por favor, entre em contato com o seu administrador.<br><strong>O cliente está offline.</strong>'
        );
        return;
    }
    window.iniciarFluxoCheckout();
};

window.gerarMensagemFormatada = function (dados) {
    var nomeServico = String(dados.numeroServico || '').replace(/^RDO/, '');
    var linhas = [
        '📦 N.SERVIÇO: ' + nomeServico,
        '👤 : ' + (dados.solicitante || 'Não informado') + ' 📞 : ' + (dados.contato || ''),
        '📦 : ' + (dados.mercadoria || 'ENTREGA'),
        '.',
        '📍 ROTAS:'
    ];
    if (dados.rotasProcessadas && dados.rotasProcessadas.length > 0) {
        dados.rotasProcessadas.forEach(function (r, i) {
            linhas.push((i + 1) + '. De: ' + r.de + ' | Para: ' + r.para);
            linhas.push('.');
        });
    }
    linhas.push(
        '🛣️ ' + (dados.distanciaTotal || 0).toFixed(2) + ' km ' +
        '⏱️ ' + window.formatarTempoHumano(dados.tempoTotal || 0) + ' ' +
        '💰 ' + (dados.valorEstimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    );
    return linhas.join('\n');
};

window.iniciarFluxoCheckout = function () {
    if (window.AppRDO._mapaModalAberto) return;

    var msgInput = document.getElementById('msg-input');
    var texto = msgInput ? (msgInput.value || '').trim() : '';
    if (!texto) { window.marcarCampoInvalido(); return; }

    var solicitante = ((texto.match(/(?:SOLICITANTE|NOME|CLIENTE):\s*(.*)/i) || [])[1] || 'Não informado').trim();
    var contato = ((texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE):\s*([\d\s\-\(\)\+]+)/i) || [])[1] || '').trim();
    var horario = ((texto.match(/(?:HORÁRIO|HORARIO).*?:\s*([\d:]+)/i) || [])[1] || '').trim();
    var mercadoria = ((texto.match(/(?:MERCADORIA):\s*(.*)/i) || [])[1] || 'ENTREGA').trim().toUpperCase();
    var obs = ((texto.match(/(?:OBSERVAÇÃO|OBSERVACAO):\s*(.*)/i) || [])[1] || '').trim();
    var rotasExtraidas = window.extrairRotasDaMensagem(texto);

    if (rotasExtraidas.length === 0) {
        window.exibirModalValidacao('Nenhuma rota encontrada.<br>Use o formato: <strong>De: Origem | Para: Destino</strong>');
        return;
    }

    window.AppRDO._mapaModalAberto = true;

    window.loadModal('mapa_clientes.html').then(function (carregou) {
        if (!carregou) {
            window.AppRDO._mapaModalAberto = false;
            return;
        }
        var modalEl = document.getElementById('modalMapa');
        if (!modalEl) {
            window.AppRDO._mapaModalAberto = false;
            return;
        }

        modalEl.addEventListener('hidden.bs.modal', function () {
            window.AppRDO._mapaModalAberto = false;
            if (window._leafletMapInstance) {
                try { window._leafletMapInstance.remove(); } catch (_) { }
                window._leafletMapInstance = null;
            }
        }, { once: true });

        var modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

        modalEl.addEventListener('shown.bs.modal', function () {
            var elSolicitante = document.getElementById('header-nome-solicitante');
            var loaderEl = document.getElementById('mapa-loader');

            if (elSolicitante) elSolicitante.innerText = solicitante;
            if (loaderEl) loaderEl.style.display = '';

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
                var valorCalculado = kmArredondado * 3.00;

                window.dadosPedidoAtual = {
                    solicitante: solicitante,
                    contato: contato,
                    horario: horario,
                    mercadoria: mercadoria,
                    obs: obs,
                    cliente: (window.AppRDO ? window.AppRDO.clienteSelecionado : null) || localStorage.getItem('clienteSelecionadoNome') || 'N/A',
                    distanciaTotal: kmArredondado,
                    tempoTotal: Math.round(minTotal),
                    coordenadas: listaCaminhos,
                    valorEstimado: valorCalculado,
                    rotasProcessadas: rotasExtraidas,
                    rawInput: texto
                };

                window._renderizarResumo(
                    kmArredondado,
                    minTotal,
                    valorCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                );

                window.renderizarMapaUnificado();
            }).catch(function () {
                var footer = document.getElementById('footer-resumo-dados');
                if (footer) footer.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Erro ao calcular rotas</span>';
            });
        }, { once: true });

        modal.show();
    });
};

window.prosseguirParaFormulario = function () {
    if (!window.dadosPedidoAtual || !window.dadosPedidoAtual.distanciaTotal) {
        alert('Dados do pedido não foram calculados corretamente.');
        return;
    }

    var modalMapa = document.getElementById('modalMapa');
    var instMapa = modalMapa ? bootstrap.Modal.getInstance(modalMapa) : null;

    if (instMapa) {
        try { instMapa.hide(); } catch (_) { }
    }

    setTimeout(function () {
        window.loadModal('form_clientes.html').then(function (ok) {
            if (!ok) return;

            var modalForm = document.getElementById('modalFormulario');
            if (!modalForm) return;

            var bsModalForm = new bootstrap.Modal(modalForm, { backdrop: 'static', keyboard: false });

            modalForm.addEventListener('shown.bs.modal', function () {
                window._preencherFormulario(window.dadosPedidoAtual);
            }, { once: true });

            bsModalForm.show();
        });
    }, 400);
};

window._preencherFormulario = function (dados) {
    if (!dados) return;

    var elSolicitante = document.getElementById('p-solicitante');
    var elContato = document.getElementById('p-contato');
    var elHorario = document.getElementById('p-horario');
    var elMercadoria = document.getElementById('p-mercadoria');
    var elDistancia = document.getElementById('p-distancia');
    var elTempo = document.getElementById('p-tempo');
    var elRotas = document.getElementById('p-rotas');
    var elObs = document.getElementById('p-obs');
    var elHeaderCliente = document.getElementById('header-nome-cliente');

    if (elSolicitante) elSolicitante.value = dados.solicitante || '';
    if (elContato) elContato.value = dados.contato || '';
    if (elHorario) elHorario.value = dados.horario || '';
    if (elMercadoria) elMercadoria.value = dados.mercadoria || 'ENTREGA';
    if (elDistancia) elDistancia.value = (dados.distanciaTotal || 0).toFixed(2);
    if (elTempo) elTempo.value = dados.tempoTotal ? window.formatarTempoHumano(dados.tempoTotal) : '';
    if (elObs) elObs.value = dados.obs || '';
    if (elHeaderCliente) elHeaderCliente.innerText = dados.cliente || 'N/A';

    if (elRotas && dados.rotasProcessadas && dados.rotasProcessadas.length > 0) {
        elRotas.value = dados.rotasProcessadas.map(function (r, i) {
            return (i + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
        }).join('\n');
    }

    if (typeof window.calcularTudo === 'function') {
        setTimeout(function () { window.calcularTudo(); }, 200);
    }
};

window.voltarParaMapa = function () {
    var modalForm = document.getElementById('modalFormulario');
    var instForm = modalForm ? bootstrap.Modal.getInstance(modalForm) : null;

    if (instForm) {
        try { instForm.hide(); } catch (_) { }
    }

    setTimeout(function () {
        window.loadModal('mapa_clientes.html').then(function (ok) {
            if (!ok) return;

            var modalMapa = document.getElementById('modalMapa');
            if (!modalMapa) return;

            var bsModalMapa = new bootstrap.Modal(modalMapa, { backdrop: 'static', keyboard: false });

            modalMapa.addEventListener('shown.bs.modal', function () {
                var elSolicitante = document.getElementById('header-nome-solicitante');
                if (elSolicitante && window.dadosPedidoAtual) {
                    elSolicitante.innerText = window.dadosPedidoAtual.solicitante || 'N/A';
                }

                if (window.dadosPedidoAtual && window.dadosPedidoAtual.distanciaTotal) {
                    window._renderizarResumo(
                        window.dadosPedidoAtual.distanciaTotal,
                        window.dadosPedidoAtual.tempoTotal || 0,
                        (window.dadosPedidoAtual.valorEstimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    );
                }

                window.renderizarMapaUnificado();
            }, { once: true });

            bsModalMapa.show();
        });
    }, 400);
};

window.fecharParaMapa = function () {
    var modalForm = document.getElementById('modalFormulario');
    if (!modalForm) return;

    var inst = bootstrap.Modal.getInstance(modalForm);
    if (inst) {
        try { inst.hide(); } catch (_) { }
    }

    setTimeout(function () {
        window.voltarParaMapa();
    }, 400);
};

window.fecharParaChat = function (modalId) {
    var modalEl = document.getElementById(modalId || 'modalMapa');
    if (!modalEl) return;

    var inst = bootstrap.Modal.getInstance(modalEl);
    if (inst) {
        try { inst.hide(); } catch (_) { }
    }

    window.AppRDO._mapaModalAberto = false;

    if (window._leafletMapInstance) {
        try { window._leafletMapInstance.remove(); } catch (_) { }
        window._leafletMapInstance = null;
    }

    window.dadosPedidoAtual = {};

    setTimeout(function () {
        _limparBackdrop();
    }, 400);
};

(function () {
    function _handleSyncClick(e) {
        if (!e.target.closest('#btn-sync-chat')) return;
        if (window.AppRDO && window.AppRDO.isFetching) return;
        if (typeof window.carregarDados === 'function') window.carregarDados();
    }

    document.removeEventListener('click', _handleSyncClick);
    document.addEventListener('click', _handleSyncClick);

    function _tentarInit() {
        if (window.AppRDO) {
            window.AppRDO.isMasterOn = localStorage.getItem('bot_master_active') === 'true';
            window.AppRDO.listaCarregada = false;
            window.AppRDO._mapaModalAberto = false;
        }
        if (window.AppRDO && !window.AppRDO.isFetching) window.carregarDados();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _tentarInit);
    } else {
        _tentarInit();
    }

    if (typeof window.EventBus !== 'undefined') {
        window.EventBus.on('pedido:excluido', function (dados) {
            var idStr = String(dados.id).trim();

            if (Array.isArray(window.AppRDO.mensagensCache)) {
                window.AppRDO.mensagensCache = window.AppRDO.mensagensCache.filter(function (m) {
                    return String(m.pedido_id).trim() !== idStr;
                });
            }

            if (Array.isArray(window.AppRDO.pedidosCache)) {
                window.AppRDO.pedidosCache = window.AppRDO.pedidosCache.filter(function (p) {
                    return String(p.id).trim() !== idStr;
                });
            }

            var msgEl = document.querySelector('[data-pedido-id="' + idStr + '"]');
            if (msgEl) {
                var wrapper = msgEl.closest('.message-wrapper');
                if (wrapper) {
                    wrapper.style.transition = 'opacity .3s ease, transform .3s ease';
                    wrapper.style.opacity = '0';
                    wrapper.style.transform = 'translateX(30px)';
                    setTimeout(function () { wrapper.remove(); }, 300);
                }
            }
        });
    }
})();
