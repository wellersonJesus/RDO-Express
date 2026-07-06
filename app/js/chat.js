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

window.limparCampoInvalido = function () {
    var input = document.getElementById('msg-input');
    if (!input) return;
    input.style.border = '';
    input.style.boxShadow = '';
    input.setAttribute('placeholder', 'Digite o pedido...');
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
window.AppRDO.notificacoes = window.AppRDO.notificacoes || [];

window.dadosPedidoAtual = window.dadosPedidoAtual || {};

window.NotificationManager = (function () {
    var notificacoes = [];
    var maxNotificacoes = 50;
    var audioCtx = null;
    var isAberto = false;

    function _getCtx() {
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { audioCtx = null; }
        }
        return audioCtx;
    }

    function _tocarTom(freqs, duracoes, tipo) {
        var ctx = _getCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) { } }
        var tempoAtual = ctx.currentTime;
        freqs.forEach(function (freq, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = tipo || 'sine';
            osc.frequency.value = freq;
            var inicio = tempoAtual + (i * (duracoes[i] || 0.12));
            var dur = duracoes[i] || 0.12;
            gain.gain.setValueAtTime(0, inicio);
            gain.gain.linearRampToValueAtTime(0.35, inicio + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, inicio + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(inicio);
            osc.stop(inicio + dur + 0.02);
        });
    }

    function _tocarSomConcluido() { _tocarTom([1200, 1500, 1900, 2400], [0.09, 0.09, 0.09, 0.18], 'sine'); }
    function _tocarSomCancelado() { _tocarTom([440, 330], [0.15, 0.28], 'sawtooth'); }
    function _tocarSomExcluido() { _tocarTom([600, 400, 250], [0.1, 0.1, 0.22], 'triangle'); }

    function _escutarEventos() {
        if (!window.EventBus) return;

        window.EventBus.on('pedido:statusAtualizado', function (data) {
            var status = (data.status || '').toUpperCase();
            var pedidoId = data.pedidoId || data.id;
            var tipo = '';

            if (status.includes('CONCLUIDO') || status.includes('CONCLUÍDO')) { tipo = 'CONCLUÍDO'; _tocarSomConcluido(); }
            else if (status.includes('CANCELADO')) { tipo = 'CANCELADO'; _tocarSomCancelado(); }
            else if (status.includes('EM_ROTA') || status.includes('EM ROTA')) tipo = 'EM ROTA';
            else if (status.includes('PENDENTE')) tipo = 'PENDENTE';
            else if (status.includes('PREPARANDO')) tipo = 'PREPARANDO';
            else tipo = status;

            if (tipo) {
                _adicionarNotificacao({ pedidoId: pedidoId, tipo: tipo, timestamp: new Date(), variant: _getVariant(tipo) });
            }
        });

        window.EventBus.on('pedido:excluido', function (data) {
            _tocarSomExcluido();
            _adicionarNotificacao({ pedidoId: data.pedidoId || data.id, tipo: 'EXCLUÍDO', timestamp: new Date(), variant: 'danger' });
        });

        window.EventBus.on('pedido:adicionado', function (data) {
            _adicionarNotificacao({ pedidoId: data.pedidoId || data.id, tipo: 'CRIADO', timestamp: new Date(), variant: 'success' });
        });
    }

    function _getVariant(tipo) {
        switch (tipo) {
            case 'CONCLUÍDO':
            case 'CRIADO': return 'success';
            case 'CANCELADO':
            case 'EXCLUÍDO': return 'danger';
            case 'EM ROTA':
            case 'PREPARANDO': return 'primary';
            case 'PENDENTE': return 'warning';
            default: return 'info';
        }
    }

    function _adicionarNotificacao(dados) {
        var notif = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            pedidoId: dados.pedidoId,
            tipo: dados.tipo,
            timestamp: dados.timestamp.toISOString(),
            variant: dados.variant || 'info',
            lida: false
        };
        notificacoes.unshift(notif);
        if (notificacoes.length > maxNotificacoes) notificacoes = notificacoes.slice(0, maxNotificacoes);
        if (window.AppRDO) window.AppRDO.notificacoes = notificacoes;
        _atualizarBadge();
        _renderizarLista();
    }

    function _atualizarBadge() {
        var badge = document.getElementById('notif-badge');
        if (!badge) return;
        var naoLidas = notificacoes.filter(function (n) { return !n.lida; }).length;
        if (naoLidas > 0) { badge.textContent = naoLidas > 99 ? '99+' : naoLidas; badge.classList.remove('d-none'); }
        else badge.classList.add('d-none');
    }

    function _renderizarLista() {
        var listaEl = document.getElementById('notifications-list');
        if (!listaEl) return;

        if (notificacoes.length === 0) {
            listaEl.innerHTML = '<div class="p-4 text-center text-muted"><i class="bi bi-bell-slash me-2"></i><small>Nenhuma notificação</small></div>';
            return;
        }

        listaEl.innerHTML = notificacoes.map(function (n) {
            var icone = _getIcone(n.tipo);
            var tempo = _formatarTempo(n.timestamp);
            var classeNaoLida = n.lida ? '' : 'bg-light';
            return '<div class="notif-item ' + classeNaoLida + '" data-nid="' + n.id + '" onclick="window.NotificationManager.marcarLida(\'' + n.id + '\'); window.NotificationManager.irParaPedido(\'' + n.pedidoId + '\');">' +
                '<div class="d-flex align-items-start gap-2">' + icone +
                '<div class="flex-grow-1">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<span class="fw-semibold" style="font-size:0.75rem;">Pedido ' + _formatarIdPedido(n.pedidoId) + '</span>' +
                '<span class="text-muted" style="font-size:0.68rem;">' + tempo + '</span>' +
                '</div>' +
                '<div class="text-muted" style="font-size:0.68rem;font-weight:300;">Status: <b style="font-weight:500;">' + n.tipo + '</b></div>' +
                '</div></div></div>';
        }).join('');
    }

    function _getIcone(tipo) {
        switch (tipo) {
            case 'CONCLUÍDO': return '<i class="bi bi-check-circle-fill text-success" style="font-size:1rem;"></i>';
            case 'CANCELADO':
            case 'EXCLUÍDO': return '<i class="bi bi-x-circle-fill text-danger" style="font-size:1rem;"></i>';
            case 'EM ROTA': return '<i class="bi bi-bicycle text-primary" style="font-size:1rem;"></i>';
            case 'CRIADO': return '<i class="bi bi-plus-circle-fill text-success" style="font-size:1rem;"></i>';
            case 'PENDENTE': return '<i class="bi bi-clock-fill text-warning" style="font-size:1rem;"></i>';
            case 'PREPARANDO': return '<i class="bi bi-hourglass-split text-primary" style="font-size:1rem;"></i>';
            default: return '<i class="bi bi-bell-fill text-info" style="font-size:1rem;"></i>';
        }
    }

    function _formatarTempo(timestamp) {
        var data = new Date(timestamp);
        var horas = data.getHours().toString().padStart(2, '0');
        var minutos = data.getMinutes().toString().padStart(2, '0');
        return horas + ':' + minutos;
    }

    function _formatarIdPedido(id) {
        if (typeof window._formatarNomeServico === 'function') return window._formatarNomeServico(id);
        return id;
    }

    function _marcarLida(notifId) {
        var notif = notificacoes.find(function (n) { return n.id === notifId; });
        if (notif) { notif.lida = true; _atualizarBadge(); _renderizarLista(); }
    }

    function _irParaPedido(pedidoId) {
        if (typeof window._destacarPedidoNoChat === 'function') window._destacarPedidoNoChat(pedidoId);
        _fecharDropdown();
    }

    function _marcarTodasComoLidas() {
        notificacoes.forEach(function (n) { n.lida = true; });
        _atualizarBadge();
        _renderizarLista();
    }

    function _limparTodas() {
        notificacoes = [];
        if (window.AppRDO) window.AppRDO.notificacoes = [];
        _atualizarBadge();
        _renderizarLista();
    }

    function _getMenu() {
        return document.getElementById('notif-dropdown-menu');
    }

    function _getBtn() {
        return document.querySelector('.btn-notifications');
    }

    function _posicionarDropdown() {
        var btn = _getBtn();
        var menu = _getMenu();
        if (!btn || !menu) return;

        var margem = 12;
        var rect = btn.getBoundingClientRect();
        var menuW = menu.offsetWidth || 340;
        var menuH = menu.offsetHeight || 480;
        var windowW = window.innerWidth;
        var windowH = window.innerHeight;

        var left = rect.right - menuW;
        if (left < margem) left = margem;
        if (left + menuW > windowW - margem) left = windowW - menuW - margem;

        var top = rect.bottom + 8;
        if (top + menuH > windowH - margem) {
            var topAcima = rect.top - menuH - 8;
            top = topAcima > margem ? topAcima : margem;
        }

        menu.style.position = 'fixed';
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
        menu.style.right = 'auto';
        menu.style.bottom = 'auto';
    }

    function _abrirDropdown() {
        var menu = _getMenu();
        if (!menu) return;
        if (window.PedidosDropdown && typeof window.PedidosDropdown.close === 'function') window.PedidosDropdown.close();
        _renderizarLista();
        menu.style.display = 'flex';
        menu.style.flexDirection = 'column';
        _posicionarDropdown();
        requestAnimationFrame(function () { menu.classList.add('show'); });
        isAberto = true;
        window.addEventListener('resize', _posicionarDropdown);
        window.addEventListener('scroll', _posicionarDropdown, true);
    }

    function _fecharDropdown() {
        var menu = _getMenu();
        if (!menu) return;
        menu.classList.remove('show');
        setTimeout(function () {
            if (!menu.classList.contains('show')) menu.style.display = 'none';
        }, 180);
        isAberto = false;
        window.removeEventListener('resize', _posicionarDropdown);
        window.removeEventListener('scroll', _posicionarDropdown, true);
    }

    function _toggleDropdown() {
        if (isAberto) _fecharDropdown();
        else _abrirDropdown();
    }

    function _configurar() {
        document.addEventListener('click', function (e) {
            var btn = _getBtn();
            var menu = _getMenu();
            if (!btn || !menu) return;

            if (btn.contains(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                _toggleDropdown();
                return;
            }

            if (isAberto && !menu.contains(e.target)) _fecharDropdown();
        });
    }

    function _init() {
        _escutarEventos();
        _atualizarBadge();
        _configurar();
    }

    return {
        init: _init,
        marcarLida: _marcarLida,
        irParaPedido: _irParaPedido,
        abrirDropdown: _abrirDropdown,
        fecharDropdown: _fecharDropdown,
        close: _fecharDropdown,
        marcarTodasComoLidas: _marcarTodasComoLidas,
        limparNotificacoes: _limparTodas,
        tocarSomConcluido: _tocarSomConcluido,
        tocarSomCancelado: _tocarSomCancelado,
        tocarSomExcluido: _tocarSomExcluido
    };
})();

window.PedidosDropdown = (function () {
    var pedidosAtuais = [];
    var btn = document.getElementById('btn-dropdown-pedidos');
    var painel = document.getElementById('dropdown-pedidos-lista');
    var inputBusca = document.getElementById('busca-pedido-id');
    var listaItens = document.getElementById('lista-pedidos-itens');

    function abrir() {
        if (!btn || !painel || !inputBusca) return;
        if (window.NotificationManager && typeof window.NotificationManager.close === 'function') {
            window.NotificationManager.close();
        }
        posicionarPainel();
        painel.style.display = 'flex';
        requestAnimationFrame(function () { painel.classList.add('show'); });
        inputBusca.value = '';
        inputBusca.focus();
        renderizarLista(pedidosAtuais);
        document.addEventListener('click', fecharAoClicarFora, true);
    }

    function fechar() {
        if (!painel) return;
        painel.classList.remove('show');
        setTimeout(function () {
            if (!painel.classList.contains('show')) painel.style.display = 'none';
        }, 180);
        document.removeEventListener('click', fecharAoClicarFora, true);
    }

    function fecharAoClicarFora(e) {
        if (!painel || !btn) return;
        if (!painel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) fechar();
    }

    function posicionarPainel() {
        if (!btn || !painel) return;
        var rect = btn.getBoundingClientRect();
        var larguraPainel = 320;
        var left = rect.right - larguraPainel;
        if (left < 8) left = 8;
        painel.style.position = 'fixed';
        painel.style.top = (rect.bottom + 6) + 'px';
        painel.style.left = left + 'px';
        painel.style.right = 'auto';
    }

    function renderizarLista(pedidos) {
        if (!listaItens) return;
        if (!pedidos || pedidos.length === 0) {
            listaItens.innerHTML = '<div class="px-3 py-3 text-muted text-center"><small>Nenhum pedido encontrado</small></div>';
            return;
        }

        listaItens.innerHTML = pedidos.map(function (p) {
            var idExibicao = p.idFormatado || p.id;
            return '<div class="pedido-item" data-pedido-id="' + p.id + '">' +
                '<div class="pedido-item-info">' +
                '<span class="pedido-item-id">' + idExibicao + '</span>' +
                '<span class="pedido-item-rota">' + (p.resumo || '') + '</span>' +
                '</div></div>';
        }).join('');

        listaItens.querySelectorAll('.pedido-item').forEach(function (el) {
            el.addEventListener('click', function () {
                var id = el.getAttribute('data-pedido-id');
                irParaPedidoNoChat(id);
                fechar();
            });
        });
    }

    function filtrar(termo) {
        termo = (termo || '').trim().toLowerCase();
        if (!termo) { renderizarLista(pedidosAtuais); return; }
        var filtrados = pedidosAtuais.filter(function (p) {
            var idFmt = (p.idFormatado || '').toLowerCase();
            var idBruto = String(p.id).toLowerCase();
            return idFmt.includes(termo) || idBruto.includes(termo);
        });
        renderizarLista(filtrados);
    }

    function irParaPedidoNoChat(id) {
        var msgEl = document.querySelector('#chat-messages-container [data-pedido-id="' + id + '"]');
        if (!msgEl) return;
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var wrapper = msgEl.closest('.message-wrapper') || msgEl;
        wrapper.classList.add('pedido-highlight');
        setTimeout(function () { wrapper.classList.remove('pedido-highlight'); }, 1600);
    }

    function setPedidos(lista) {
        pedidosAtuais = lista || [];
        if (painel && painel.classList.contains('show')) renderizarLista(pedidosAtuais);
    }

    function init() {
        if (!btn || !painel || !inputBusca) return;
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var aberto = painel.classList.contains('show');
            aberto ? fechar() : abrir();
        });
        inputBusca.addEventListener('input', function (e) { filtrar(e.target.value); });
    }

    return { init: init, setPedidos: setPedidos, abrir: abrir, fechar: fechar, close: fechar };
})();

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

function _limparBackdrop() {
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-y');
    document.body.style.removeProperty('padding-right');
}
window._limparBackdrop = _limparBackdrop;

function _limparModalContainer() {
    var container = document.getElementById('modal-container');
    if (!container) return;
    container.querySelectorAll('.modal').forEach(function (modalEl) {
        try { var inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.dispose(); } catch (_) { }
    });
    container.innerHTML = '';
}

window.loadModal = function (arquivo) {
    return new Promise(function (resolve) {
        var container = document.getElementById('modal-container');
        if (!container) { resolve(false); return; }

        var abertos = Array.prototype.slice.call(document.querySelectorAll('#modal-container .modal.show'));
        var pendentes = abertos.length;

        function _carregarHtml() {
            var base = window.location.pathname.replace(/\/[^/]*$/, '/');
            if (base.indexOf('/pages/') !== -1) base = base.substring(0, base.indexOf('/pages/') + 1);
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

        if (pendentes === 0) { _limparBackdrop(); _limparModalContainer(); _carregarHtml(); return; }

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
            try { inst.hide(); } catch (_) { pendentes--; if (pendentes === 0) { _limparBackdrop(); _carregarHtml(); } }
        });
    });
};

window.iniciarChat = function () { return window.carregarDados(); };

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

document.addEventListener('keydown', function (e) {
    if (!e.target || e.target.id !== 'msg-input') return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.enviarMensagemGeral(); }
});

document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest || !e.target.closest('#btn-sync-chat')) return;
    if (window.AppRDO && window.AppRDO.isFetching) return;
    if (typeof window.carregarDados === 'function') window.carregarDados();
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
    var temSolic = !!(matchS && matchS[1] && matchS[1].trim().length > 0);
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

    if (temSolic && temContato && temRota) return { valido: true, tipo: 'ok', rotas: quantRotas };

    var faltando = [];
    if (!temSolic) faltando.push('SOLICITANTE');
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
                title: opcoes.titulo || 'Atenção',
                html: mensagem,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Entendi'
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

    document.querySelectorAll('#modal-container .modal.show').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) { try { inst.hide(); } catch (_) { } }
    });

    try {
        var instExist = bootstrap.Modal.getInstance(modalEl);
        if (instExist) { try { instExist.dispose(); } catch (_) { } }
        var jaAberto = document.querySelectorAll('#modal-container .modal.show').length > 0;
        setTimeout(function () { _limparBackdrop(); new bootstrap.Modal(modalEl).show(); }, jaAberto ? 350 : 0);
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
    container.innerHTML = '<div class="chat-empty-state"><div class="chat-empty-label">' + texto + '</div></div>';
}

function _mostrarContatosEmptyState(texto) {
    var listEl = document.getElementById('lista-contatos-chat');
    if (!listEl) return;
    listEl.innerHTML = '<div class="chat-empty-state"><div class="chat-empty-label">' + texto + '</div></div>';
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

function _parseMoedaSeguro(valor) {
    if (valor === null || valor === undefined || valor === '') return 0;
    var n = Number(valor);
    if (!isNaN(n)) return n;
    var str = String(valor).trim().replace(/R\$\s*/gi, '');
    var temVirgula = str.includes(',');
    var temPonto = str.includes('.');
    if (temVirgula && temPonto) {
        var iPonto = str.lastIndexOf('.');
        var iVirgula = str.lastIndexOf(',');
        str = iVirgula > iPonto
            ? str.replace(/\./g, '').replace(',', '.')
            : str.replace(/,/g, '');
    } else if (temVirgula) {
        str = str.replace(',', '.');
    }
    var num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}
window._parseMoedaSeguro = _parseMoedaSeguro;

function _formatarNomeServico(idBruto) {
    if (!idBruto) return 'N/D';
    var s = String(idBruto).trim();
    if (s.toUpperCase().startsWith('RDO')) return s.toUpperCase();
    var num = parseInt(s, 10);
    if (!isNaN(num)) return 'RDO' + (num < 1000 ? String(num).padStart(3, '0') : String(num));
    return 'RDO' + s;
}
window._formatarNomeServico = _formatarNomeServico;

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
            return String(d.getDate()).padStart(2, '0') + '/' +
                String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
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

        var listaParaDropdown = pedidosCliente.map(function (p) {
            var idFormatado = typeof window._formatarNomeServico === 'function'
                ? window._formatarNomeServico(p.id)
                : String(p.id);
            var resumo = String(p.de || '').trim() && String(p.para || '').trim()
                ? p.de + ' → ' + p.para
                : (p.status || '');
            return { id: String(p.id).trim(), idFormatado: idFormatado, resumo: resumo };
        });

        if (window.PedidosDropdown && typeof window.PedidosDropdown.setPedidos === 'function') {
            window.PedidosDropdown.setPedidos(listaParaDropdown);
        }

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
    var nameEl = document.getElementById('chat-header-name');
    if (nameEl) { nameEl.innerText = nome; nameEl.className = 'text-dark fw-bold'; }

    _mostrarLoadingMensagens();

    var msgInput = document.getElementById('msg-input');
    if (msgInput) {
        msgInput.value = '';
        msgInput.style.height = 'auto';
        msgInput.style.border = '';
        msgInput.style.boxShadow = '';
        msgInput.setAttribute('placeholder', 'Digite o pedido...');
    }

    return window.carregarPedidosDoCliente(String(id).trim());
};

function _resolverTextoMensagem(msg, pedido) {
    var textoSalvo = msg && msg.texto != null ? String(msg.texto).trim() : '';
    if (textoSalvo.length > 0) return textoSalvo;
    if (!pedido) return '';

    var distancia = parseFloat(String(pedido.distancia || pedido.distanciaTotal || '0').replace(',', '.')) || 0;
    var tempo = String(pedido.tempo || pedido.tempoFormatado || '').trim();
    var tempoMin = 0;
    var mH = tempo.match(/(\d+)h/);
    var mM = tempo.match(/(\d+)min/);
    if (mH) tempoMin += parseInt(mH[1]) * 60;
    if (mM) tempoMin += parseInt(mM[1]);

    return window.gerarMensagemFormatada({
        id: String(pedido.id || '').trim(),
        solicitante: String(pedido.solicitante || 'Não informado').trim(),
        contato: String(pedido.contato || '').trim(),
        mercadoria: String(pedido.mercadoria || 'ENTREGA').trim(),
        de: String(pedido.de || '').trim(),
        para: String(pedido.para || '').trim(),
        distanciaTotal: distancia,
        tempoTotal: tempoMin,
        valorEstimado: _parseMoedaSeguro(pedido.valor_total || pedido.valor_final || 0)
    });
}

function _criarWrapperMensagem(pedidoId, texto, hora, temStatus, statusPuro, tooltipTexto) {
    var div = document.createElement('div');
    div.className = 'message-wrapper';

    var iconHTML = temStatus
        ? window.getIconePorStatus(statusPuro)
        : '<i class="bi bi-arrow-repeat spinner-rotate"></i>';

    div.innerHTML =
        '<div class="msg-action-buttons">' +
        '<button class="btn-copiar-msg" title="Copiar mensagem" ' +
        'onclick="event.stopPropagation();window._copiarMensagemWrapper(\'' + pedidoId + '\', this)">' +
        '<i class="bi bi-clipboard"></i>' +
        '</button>' +
        '<button class="btn-excluir-msg" title="Excluir mensagem" ' +
        'onclick="event.stopPropagation();window.MasterAuth.abrir(\'' + pedidoId + '\')">' +
        '<i class="bi bi-trash3-fill"></i>' +
        '</button>' +
        '</div>' +
        '<div class="message-sent" data-pedido-id="' + pedidoId + '" ' +
        'onclick="window.abrirModalEdicao(\'' + pedidoId + '\')">' +
        '<div class="message-body">' + String(texto).replace(/\n/g, '<br>') + '</div>' +
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

window._copiarMensagemWrapper = function (pedidoId, botao) {
    var msgEl = document.querySelector('[data-pedido-id="' + pedidoId + '"] .message-body');
    if (!msgEl) return;
    var texto = msgEl.textContent || msgEl.innerText || '';

    function _feedbackSucesso() {
        if (botao) {
            var icon = botao.querySelector('i');
            if (icon) {
                icon.className = 'bi bi-check2';
                setTimeout(function () { icon.className = 'bi bi-clipboard'; }, 1500);
            }
        }
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Pedido copiado!',
                text: 'Agora você pode colar no WhatsApp.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1800,
                timerProgressBar: true,
                customClass: { popup: 'rounded-4 shadow' }
            });
        }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(_feedbackSucesso).catch(function () {
            _copiarFallback(texto, _feedbackSucesso);
        });
    } else {
        _copiarFallback(texto, _feedbackSucesso);
    }
};

function _copiarFallback(texto, callback) {
    var temp = document.createElement('textarea');
    temp.value = texto;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    try { document.execCommand('copy'); } catch (_) { }
    document.body.removeChild(temp);
    if (typeof callback === 'function') callback();
}

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
            var sep = document.createElement('div');
            sep.className = 'chat-date-separator';
            sep.innerHTML = '<span class="chat-date-badge">' + labelData + '</span>';
            container.appendChild(sep);
        }

        var pedido = pedidos.find(function (p) {
            return String(p.id).trim() === String(msg.pedido_id).trim();
        });

        var statusBruto = String(pedido ? pedido.status : '').trim();
        var motoboyNome = String(pedido ? (pedido.motoboy || '') : '').trim();
        var statusPuro = statusBruto.includes('/') ? statusBruto.split('/').pop().trim() : statusBruto;
        var statusUpper = statusPuro.toUpperCase();
        var isFinal = statusUpper === 'CONCLUIDO' || statusUpper === 'CONCLUÍDO' || statusUpper === 'CANCELADO';
        var isEmRota = statusUpper === 'EM_ROTA' || statusUpper === 'EM ROTA' || statusBruto.includes('/');
        var temStatus = isEmRota || isFinal;
        var statusLabel = statusPuro.replace(/_/g, ' ');
        var tooltipTexto = temStatus
            ? (motoboyNome ? motoboyNome + ' • ' + statusLabel : statusLabel)
            : 'Alterar Status';

        var textoMensagem = _resolverTextoMensagem(msg, pedido);

        container.appendChild(
            _criarWrapperMensagem(msg.pedido_id, textoMensagem, msg.hora || '', temStatus, statusPuro, tooltipTexto)
        );
    });

    container.scrollTop = container.scrollHeight;
};

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

window.gerarMensagemFormatada = function (dados) {
    var idBruto = String(dados.id || dados.numeroServico || '').trim();
    var nomeServico = _formatarNomeServico(idBruto);
    var solicitante = String(dados.solicitante || 'Não informado').trim();
    var contato = String(dados.contato || '').trim();
    var mercadoria = String(dados.mercadoria || 'ENTREGA').trim().toUpperCase();

    var linhas = [
        '📦 N.SERVIÇO: ' + nomeServico,
        '👤 : ' + solicitante + ' 📞 : ' + contato,
        '📦 : ' + mercadoria,
        '.',
        '📍 ROTAS:'
    ];

    if (dados.rotasProcessadas && dados.rotasProcessadas.length > 0) {
        dados.rotasProcessadas.forEach(function (r, i) {
            linhas.push((i + 1) + '. De: ' + String(r.de || '').trim() + ' | Para: ' + String(r.para || '').trim());
            linhas.push('.');
        });
    }
    else if (dados.rotas && String(dados.rotas).trim()) {
        String(dados.rotas).trim().split('\n').forEach(function (linha, i) {
            linha = linha.trim();
            if (!linha) return;
            if (!/^\d+\./.test(linha)) linha = (i + 1) + '. ' + linha;
            linhas.push(linha);
            linhas.push('.');
        });
    }
    else if (dados.de && dados.para) {
        linhas.push('1. De: ' + String(dados.de).trim() + ' | Para: ' + String(dados.para).trim());
        linhas.push('.');
    }

    var km = Number(dados.distanciaTotal || dados.distancia || 0);
    var min = Number(dados.tempoTotal || 0);
    var valor = Number(dados.valorEstimado || dados.valor_total || dados.valor_final || 0);

    linhas.push(
        '🛣️ ' + km.toFixed(2) + ' km ' +
        '⏱️ ' + window.formatarTempoHumano(min) + ' ' +
        '💰 ' + valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    );

    return linhas.join('\n');
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
            _safeText(_el('modal-status-texto'), 'Alterar Status');
            var icone = _el('modal-status-icone');
            if (icone) icone.className = 'bi bi-arrow-repeat text-danger';
            _safeClass(_el('box-botoes-status'), 'remove', 'd-none');
            _safeClass(_el('box-selecao-motoboy'), 'add', 'd-none');
            _safeClass(_el('box-cancelamento'), 'add', 'd-none');
            var select = _el('select-motoboy');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Selecione o motoboy...</option>';
                select.style.borderColor = '';
                select.disabled = false;
            }
            document.querySelectorAll('#box-cancelamento .cancel-cb').forEach(function (cb) { cb.checked = false; });
            _safeClass(_el('cancel-error'), 'add', 'd-none');
        } catch (_) { }
    }

    function _normalizarId(id) {
        var s = String(id || '').trim();
        return s.replace(/^RDO0*/i, '') || s;
    }

    function _getIconEl(id) {
        var msgEl = document.querySelector('[data-pedido-id="' + id + '"]');
        return msgEl ? msgEl.querySelector('.status-icon') : null;
    }

    function _setSpinnerNoBotao(id) {
        try {
            var iconEl = _getIconEl(id);
            if (!iconEl) return;
            iconEl.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
            iconEl.classList.remove('status-updated');
            iconEl.classList.add('status-pending');
            iconEl.setAttribute('data-tooltip', 'Atualizando...');
        } catch (_) { }
    }

    function _setIconeFinal(id, status, motoboyNome) {
        try {
            var iconEl = _getIconEl(id);
            if (!iconEl) return;
            iconEl.innerHTML = typeof window.getIconePorStatus === 'function'
                ? window.getIconePorStatus(status)
                : '<i class="bi bi-question-circle"></i>';
            iconEl.classList.remove('status-pending');
            iconEl.classList.add('status-updated');
            var label = String(status || '').replace(/_/g, ' ');
            var tooltip = motoboyNome ? motoboyNome + ' • ' + label : label;
            iconEl.setAttribute('data-tooltip', tooltip);
            iconEl.setAttribute('title', tooltip);
        } catch (_) { }
    }

    function _atualizarCache(id, statusFmt, motoboyNome) {
        try {
            var cache = window.AppRDO && Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
            var idNorm = _normalizarId(id);
            var pedido = cache.find(function (p) {
                return _normalizarId(String(p.id || '').trim()) === idNorm;
            });
            if (!pedido) return;
            pedido.status = statusFmt;
            if (motoboyNome) pedido.motoboy = motoboyNome;
        } catch (_) { }
    }

    async function _carregarMotoboys() {
        var select = _el('select-motoboy');
        if (!select) return;
        select.innerHTML = '<option value="" disabled selected>Carregando...</option>';
        select.disabled = true;
        try {
            var todos = await API.call('getcolaboradores');
            var lista = Array.isArray(todos) ? todos : [];
            var motoboys = lista.filter(function (c) {
                return String(c.colaborador || '').toUpperCase().includes('MOTOBOY') &&
                    String(c.status || '').toUpperCase() === 'TRUE';
            });
            select.disabled = false;
            select.innerHTML = motoboys.length > 0
                ? '<option value="" disabled selected>Selecione o motoboy...</option>' +
                motoboys.map(function (m) {
                    return '<option value="' + String(m.id || '') + '">' +
                        String(m.username || m.nome || 'Sem nome') + '</option>';
                }).join('')
                : '<option value="" disabled selected>Nenhum motoboy disponível</option>';
        } catch (_) {
            if (select) { select.disabled = false; select.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>'; }
        }
    }

    async function _executarAlteracao(status, motoboyId, motivosCancelamento) {
        var motoboyNome = '';
        var statusFmt = String(status || '');

        if (motoboyId) {
            try {
                var select = _el('select-motoboy');
                if (select && select.selectedIndex >= 0)
                    motoboyNome = String(select.options[select.selectedIndex].text || '').trim();
            } catch (_) { motoboyNome = ''; }
        }
        if (motoboyNome) statusFmt = motoboyNome + '/' + status;

        _setSpinnerNoBotao(_pedidoId);
        try { if (_modalBS) _modalBS.hide(); } catch (_) { }

        try {
            var payload = { id: _normalizarId(_pedidoId), status: statusFmt, motoboy: motoboyNome };
            if (motivosCancelamento && motivosCancelamento.length > 0)
                payload.motivo_cancelamento = motivosCancelamento.join(' | ');

            var resposta = await API.call('updatepedido', payload);
            if (resposta && resposta.status === 'success') {
                _atualizarCache(_pedidoId, statusFmt, motoboyNome);
                _setIconeFinal(_pedidoId, status, motoboyNome);

                if (window.RDO_PEDIDOS && typeof window.RDO_PEDIDOS.atualizarStatusLocal === 'function') {
                    window.RDO_PEDIDOS.atualizarStatusLocal(
                        _pedidoId, statusFmt, motoboyNome,
                        (motivosCancelamento && motivosCancelamento.length > 0) ? motivosCancelamento.join(' | ') : undefined
                    );
                }
                if (typeof window.EventBus !== 'undefined') {
                    window.EventBus.emit('pedido:statusAtualizado', {
                        id: _pedidoId,
                        status: statusFmt,
                        motoboy: motoboyNome,
                        motivo_cancelamento: motivosCancelamento ? motivosCancelamento.join(' | ') : ''
                    });
                }
            } else {
                throw new Error((resposta && resposta.message) || 'Falha na API');
            }
        } catch (e) {
            _setSpinnerNoBotao(_pedidoId);
            var iconEl = _getIconEl(_pedidoId);
            if (iconEl) { iconEl.innerHTML = '<i class="bi bi-exclamation-circle-fill" style="color:#dc3545;"></i>'; iconEl.setAttribute('data-tooltip', 'Erro ao atualizar'); }
            try {
                Swal.fire({
                    icon: 'error', title: 'Erro',
                    html: '<div style="font-size:.9rem;">Não foi possível alterar o status.<br>' +
                        '<small class="text-secondary">' + (e.message || 'Tente novamente.') + '</small></div>',
                    confirmButtonText: 'Fechar', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' }
                });
            } catch (_) { alert('Erro ao alterar o status do pedido.'); }
        }
    }

    function abrir(pedidoId) {
        try {
            if (!pedidoId || pedidoId === 'null' || pedidoId === 'undefined') return;
            var cache = (window.AppRDO && Array.isArray(window.AppRDO.pedidosCache)) ? window.AppRDO.pedidosCache : [];
            var idNorm = _normalizarId(String(pedidoId).trim());
            var pedido = cache.find(function (p) { return _normalizarId(String(p.id || '').trim()) === idNorm; });
            var statusB = String(pedido ? pedido.status : '').trim();
            var statusP = (statusB.includes('/') ? statusB.split('/').pop().trim() : statusB).toUpperCase();

            if (statusP === 'CONCLUIDO' || statusP === 'CONCLUÍDO' || statusP === 'CANCELADO') {
                var isConcluido = statusP !== 'CANCELADO';
                Swal.fire({
                    icon: isConcluido ? 'success' : 'error',
                    title: 'Pedido Finalizado',
                    html: '<div style="font-size:.93rem;color:#555;">Este pedido já foi ' +
                        '<strong style="color:' + (isConcluido ? '#28a745' : '#dc3545') + ';">' +
                        (isConcluido ? 'Concluído' : 'Cancelado') +
                        '</strong> e não pode mais ser alterado.</div>',
                    confirmButtonText: 'Entendi', confirmButtonColor: '#dc3545',
                    customClass: { popup: 'rounded-4', confirmButton: 'rounded-3' }
                });
                return;
            }

            _pedidoId = String(pedidoId).trim();
            _resetar();

            var modalEl = _el('modalStatus');
            if (!modalEl) return;
            try { var ex = bootstrap.Modal.getInstance(modalEl); if (ex) ex.dispose(); } catch (_) { }
            _modalBS = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });
            _modalBS.show();
        } catch (_) { }
    }

    function processar(status) {
        try {
            if (status === 'EM_ROTA') {
                _safeText(_el('modal-status-texto'), 'Selecionar Motoboy');
                var iconeR = _el('modal-status-icone');
                if (iconeR) iconeR.className = 'bi bi-bicycle text-primary';
                _safeClass(_el('box-botoes-status'), 'add', 'd-none');
                _safeClass(_el('box-cancelamento'), 'add', 'd-none');
                _safeClass(_el('box-selecao-motoboy'), 'remove', 'd-none');
                _carregarMotoboys();
                return;
            }
            if (status === 'CANCELADO') {
                _safeText(_el('modal-status-texto'), 'Motivo do Cancelamento');
                var iconeC = _el('modal-status-icone');
                if (iconeC) iconeC.className = 'bi bi-x-circle-fill text-danger';
                _safeClass(_el('box-botoes-status'), 'add', 'd-none');
                _safeClass(_el('box-selecao-motoboy'), 'add', 'd-none');
                _safeClass(_el('box-cancelamento'), 'remove', 'd-none');
                return;
            }
            if (status === 'CONCLUIDO') {
                try { if (_modalBS) _modalBS.hide(); } catch (_) { }
                setTimeout(function () {
                    Swal.fire({
                        icon: 'question', title: 'Concluir Pedido?',
                        html: '<div style="font-size:.9rem;color:#555;">Ao concluir, este pedido <strong>não poderá</strong> mais ser alterado.</div>',
                        showCancelButton: true, confirmButtonText: 'Sim, Concluir',
                        cancelButtonText: 'Voltar', confirmButtonColor: '#28a745',
                        cancelButtonColor: '#6c757d', reverseButtons: true,
                        customClass: { popup: 'rounded-4', confirmButton: 'rounded-3', cancelButton: 'rounded-3' }
                    }).then(function (result) {
                        if (result.isConfirmed) _executarAlteracao('CONCLUIDO');
                    }).catch(function () { });
                }, 300);
            }
        } catch (_) { }
    }

    async function confirmarMotoboy() {
        try {
            var select = _el('select-motoboy');
            var motoboyId = select ? select.value : '';
            if (!motoboyId) {
                if (select) { select.style.borderColor = '#dc3545'; select.focus(); setTimeout(function () { if (select) select.style.borderColor = ''; }, 1500); }
                return;
            }
            await _executarAlteracao('EM_ROTA', motoboyId);
        } catch (_) { }
    }

    async function confirmarCancelamento() {
        try {
            var checked = document.querySelectorAll('#box-cancelamento .cancel-cb:checked');
            var motivos = [];
            checked.forEach(function (cb) { motivos.push(cb.value); });
            if (motivos.length === 0) {
                var errEl = _el('cancel-error');
                if (errEl) {
                    errEl.classList.remove('d-none');
                    errEl.style.opacity = '0';
                    setTimeout(function () { if (errEl) { errEl.style.transition = 'opacity .2s'; errEl.style.opacity = '1'; } }, 30);
                }
                return;
            }
            _safeClass(_el('cancel-error'), 'add', 'd-none');
            await _executarAlteracao('CANCELADO', null, motivos);
        } catch (_) { }
    }

    function voltar() { _resetar(); }

    return { abrir: abrir, processar: processar, confirmarMotoboy: confirmarMotoboy, confirmarCancelamento: confirmarCancelamento, voltar: voltar };
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

window.excluirPedido = async function (pedidoId) {
    if (!pedidoId) return;
    var idStr = String(pedidoId).trim();
    try {
        var resultados = await Promise.allSettled([
            API.call('deletepedido', { id: idStr }),
            API.call('deletechat', { pedido_id: idStr })
        ]);

        var erroPedido = resultados[0].status === 'rejected' ||
            (resultados[0].value && resultados[0].value.status === 'error');

        if (erroPedido) {
            var msg = (resultados[0].reason && resultados[0].reason.message) ||
                (resultados[0].value && resultados[0].value.message) || 'Falha ao excluir pedido';
            throw new Error(msg);
        }

        if (typeof window.EventBus !== 'undefined')
            window.EventBus.emit('pedido:excluido', { id: idStr });
    } catch (e) {
        Swal.fire({
            icon: 'error', title: 'Erro ao excluir',
            text: e.message || 'Não foi possível excluir o pedido.',
            confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' }
        });
    }
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

window.exibirErro = function (erro, contexto) {
    contexto = contexto || 'Erro desconhecido';
    var container = document.getElementById('chat-messages-container');
    if (container) {
        container.innerHTML =
            '<div class="alert alert-danger m-3 rounded-4 shadow-sm">' +
            '<i class="bi bi-exclamation-triangle-fill me-2"></i>' +
            '<strong>Ops!</strong> Algo deu errado ao ' + contexto + '.' +
            '<br><small class="text-secondary">' + (erro.message || erro) + '</small>' +
            '<div class="mt-2"><button class="btn btn-sm btn-outline-danger" ' +
            'onclick="window.carregarDados()">Tentar Novamente</button></div></div>';
    } else {
        window.exibirModalValidacao('Falha ao ' + contexto + ': ' + (erro.message || erro));
    }
};

window.renderizarMapaUnificado = function () {
    var loaderEl = document.getElementById('mapa-loader');
    var containerEl = document.getElementById('container-mapa-visual');
    if (!containerEl) return;

    if (window._leafletMapInstance) { try { window._leafletMapInstance.remove(); } catch (_) { } window._leafletMapInstance = null; }
    containerEl.innerHTML = '';
    containerEl.style.display = 'none';

    if (!window.dadosPedidoAtual || !window.dadosPedidoAtual.coordenadas || window.dadosPedidoAtual.coordenadas.length === 0) {
        if (loaderEl) { loaderEl.style.display = ''; loaderEl.innerHTML = '<p class="text-muted small mb-0"><i class="bi bi-exclamation-circle me-1"></i>Nenhuma rota para exibir.</p>'; }
        return;
    }
    if (typeof L === 'undefined') {
        if (loaderEl) { loaderEl.style.display = ''; loaderEl.innerHTML = '<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Biblioteca de mapa não carregada.</p>'; }
        return;
    }

    if (loaderEl) loaderEl.style.display = 'none';
    containerEl.style.display = 'block';
    if (!containerEl.offsetHeight || containerEl.offsetHeight < 50) containerEl.style.height = '340px';

    var mapa = L.map(containerEl, { zoomControl: true, scrollWheelZoom: true }).setView([-19.92, -43.94], 12);
    window._leafletMapInstance = mapa;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>', maxZoom: 19
    }).addTo(mapa);

    var cores = ['#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'];
    var todosOsPontos = [];
    var criarIcone = function (emoji) {
        return L.divIcon({ html: '<div style="font-size:22px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3));">' + emoji + '</div>', className: 'custom-div-icon', iconSize: [28, 28], iconAnchor: [14, 14] });
    };

    window.dadosPedidoAtual.coordenadas.forEach(function (caminho, i) {
        if (!caminho || caminho.length === 0) return;
        L.polyline(caminho, { color: cores[i % cores.length], weight: 4, opacity: 0.85, dashArray: '10,8' }).addTo(mapa);
        if (i === 0) L.marker(caminho[0], { icon: criarIcone('🏁') }).addTo(mapa).bindPopup('<strong>Origem</strong>');
        if (i === window.dadosPedidoAtual.coordenadas.length - 1)
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('📍') }).addTo(mapa).bindPopup('<strong>Destino Final</strong>');
        else
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('🔄') }).addTo(mapa).bindPopup('<strong>Parada ' + (i + 1) + '</strong>');
        caminho.forEach(function (p) { todosOsPontos.push(p); });
    });

    if (todosOsPontos.length > 0) { try { mapa.fitBounds(L.latLngBounds(todosOsPontos).pad(0.15)); } catch (_) { } }
    setTimeout(function () { try { mapa.invalidateSize(true); } catch (_) { } }, 300);
};

window._renderizarResumo = function (km, min, valor) {
    var footer = document.getElementById('footer-resumo-dados');
    if (!footer) return;
    footer.innerHTML =
        '<div class="d-flex align-items-center justify-content-center gap-4 py-3">' +
        '<div class="d-flex align-items-center gap-2"><i class="bi bi-signpost-split-fill text-danger" style="font-size:1.5rem;"></i>' +
        '<div><div class="small text-muted mb-1">Distância</div><div class="fw-bold text-dark fs-5">' + km + ' km</div></div></div>' +
        '<div class="vr" style="height:50px;opacity:0.3;"></div>' +
        '<div class="d-flex align-items-center gap-2"><i class="bi bi-clock-fill text-primary" style="font-size:1.5rem;"></i>' +
        '<div><div class="small text-muted mb-1">Tempo</div><div class="fw-bold text-dark fs-5">' + window.formatarTempoHumano(min) + '</div></div></div>' +
        '<div class="vr" style="height:50px;opacity:0.3;"></div>' +
        '<div class="d-flex align-items-center gap-2"><i class="bi bi-cash-stack text-success" style="font-size:1.5rem;"></i>' +
        '<div><div class="small text-muted mb-1">Valor</div><div class="fw-bold text-success fs-5">' + valor + '</div></div></div></div>';
};

window.enviarMensagemGeral = function () {
    var input = document.getElementById('msg-input');
    if (!window.AppRDO || !window.AppRDO.clienteId) { window.exibirModalValidacao('Selecione um cliente na lista primeiro.'); return; }
    if (!input || !input.value.trim()) { window.marcarCampoInvalido(); return; }
    if (!window.AppRDO.isMasterOn) { window.exibirModalValidacao('O sistema está desligado.<br><strong>Contate o administrador.</strong>'); return; }

    var clienteAtual = (window.AppRDO.clientesCache || []).find(function (c) {
        return String(c.id) === String(window.AppRDO.clienteId);
    });
    if (clienteAtual && String(clienteAtual.status || '').toUpperCase() !== 'TRUE') {
        window.exibirModalValidacao('Por favor, entre em contato com o seu administrador.<br><strong>O cliente está offline.</strong>');
        return;
    }
    window.iniciarFluxoCheckout();
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
        if (!carregou) { window.AppRDO._mapaModalAberto = false; return; }

        var modalEl = document.getElementById('modalMapa');
        if (!modalEl) { window.AppRDO._mapaModalAberto = false; return; }

        modalEl.addEventListener('hidden.bs.modal', function () {
            window.AppRDO._mapaModalAberto = false;
            if (window._leafletMapInstance) { try { window._leafletMapInstance.remove(); } catch (_) { } window._leafletMapInstance = null; }
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
                    kmArredondado, minTotal,
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
    if (!window.dadosPedidoAtual || !window.dadosPedidoAtual.distanciaTotal) { alert('Dados do pedido não foram calculados corretamente.'); return; }

    var modalMapa = document.getElementById('modalMapa');
    var instMapa = modalMapa ? bootstrap.Modal.getInstance(modalMapa) : null;
    if (instMapa) { try { instMapa.hide(); } catch (_) { } }

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

window.calcularTudo = function () {
    var distancia = parseFloat((document.getElementById('p-distancia') || {}).value) || 0;
    var valorKm = parseFloat((document.getElementById('p-valor-km') || {}).value) || 3.00;
    var retorno = parseFloat((document.getElementById('p-retorno') || {}).value) || 0;
    var dinamica = parseFloat((document.getElementById('p-dinamica') || {}).value) || 0;
    var prioridade = parseFloat((document.getElementById('p-prioridade') || {}).value) || 0;

    var base = distancia * valorKm;
    var taxaRetorno = retorno > 0 ? base * retorno : 0;
    var total = base + taxaRetorno + dinamica + prioridade;

    var elFinal = document.getElementById('view-valor-final');
    if (elFinal) elFinal.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (window.dadosPedidoAtual) {
        window.dadosPedidoAtual.valorEstimado = total;
        window.dadosPedidoAtual.valorKm = valorKm;
        window.dadosPedidoAtual.retorno = retorno;
        window.dadosPedidoAtual.dinamica = dinamica;
        window.dadosPedidoAtual.prioridade = prioridade;
    }
};

window.remitirPedido = async function () {
    var _validarCampo = function (el) {
        if (!el || !String(el.value || '').trim()) {
            if (el) {
                el.style.border = '2px solid #dc3545';
                el.style.boxShadow = '0 0 0 0.2rem rgba(220,53,69,.25)';
                setTimeout(function () { el.style.border = ''; el.style.boxShadow = ''; }, 3000);
            }
            return false;
        }
        return true;
    };

    var invalido = false;
    ['p-solicitante', 'p-contato', 'p-mercadoria', 'p-rotas'].forEach(function (id) {
        if (!_validarCampo(document.getElementById(id))) invalido = true;
    });
    if (invalido) return;

    if (typeof window.calcularTudo === 'function') window.calcularTudo();

    var dados = window.dadosPedidoAtual || {};
    var solicitante = String((document.getElementById('p-solicitante') || {}).value || dados.solicitante || '').trim();
    var contato = String((document.getElementById('p-contato') || {}).value || dados.contato || '').trim();
    var horario = String((document.getElementById('p-horario') || {}).value || dados.horario || '').trim();
    var mercadoria = String((document.getElementById('p-mercadoria') || {}).value || dados.mercadoria || 'ENTREGA').trim();
    var distancia = parseFloat((document.getElementById('p-distancia') || {}).value || dados.distanciaTotal || 0) || 0;
    var tempo = String((document.getElementById('p-tempo') || {}).value || '').trim();
    var obs = String((document.getElementById('p-obs') || {}).value || dados.obs || '').trim();
    var valorKm = String((document.getElementById('p-valor-km') || {}).value || '3').trim();
    var retorno = String((document.getElementById('p-retorno') || {}).value || '0').trim();
    var dinamica = String((document.getElementById('p-dinamica') || {}).value || '0').trim();
    var prioridade = String((document.getElementById('p-prioridade') || {}).value || '0').trim();
    var valorTotal = Number(dados.valorEstimado || 0);

    var rotasProcessadas = (
        Array.isArray(dados.rotasProcessadas) && dados.rotasProcessadas.length > 0
    ) ? dados.rotasProcessadas : [];

    var rotasTexto = '';
    if (rotasProcessadas.length > 0) {
        rotasTexto = rotasProcessadas.map(function (r, i) {
            return (i + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
        }).join('\n');
    } else {
        rotasTexto = String((document.getElementById('p-rotas') || {}).value || '').trim();
    }

    var dadosParaMensagem = {
        id: '[ID_GERADO]',
        solicitante: solicitante,
        contato: contato,
        mercadoria: mercadoria,
        rotasProcessadas: rotasProcessadas,
        distanciaTotal: dados.distanciaTotal || distancia,
        tempoTotal: dados.tempoTotal || 0,
        valorEstimado: valorTotal
    };

    var mensagemProvisoria = typeof window.gerarMensagemFormatada === 'function'
        ? window.gerarMensagemFormatada(dadosParaMensagem)
        : '';

    var payload = {
        id_cliente: String((window.AppRDO && window.AppRDO.clienteId) || ''),
        solicitante: solicitante,
        contato: contato,
        horario: horario,
        mercadoria: mercadoria,
        rotas: rotasTexto,
        distancia: distancia.toFixed(2),
        tempo: tempo,
        obs: obs,
        valor_km: valorKm,
        retorno: retorno,
        dinamica: dinamica,
        prioridade: prioridade,
        valor_total: valorTotal,
        valor_final: valorTotal,
        status: 'PENDENTE',
        texto: mensagemProvisoria
    };

    if (!payload.id_cliente) { window.exibirModalValidacao('Nenhum cliente selecionado.'); return; }

    var btnRemitir = document.getElementById('btn-remitir-pedido');
    var textoOriginal = btnRemitir ? btnRemitir.innerHTML : '';
    if (btnRemitir) {
        btnRemitir.disabled = true;
        btnRemitir.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Enviando...';
    }

    try {
        var resposta = await API.call('createpedido', payload);
        if (!resposta || resposta.status !== 'success')
            throw new Error((resposta && resposta.message) || 'Resposta inválida da API');

        var novoPedidoIdRaw = String(resposta.id || resposta.pedido_id || '').trim();
        var novoPedidoId = novoPedidoIdRaw.replace(/^RDO0*/i, '') || novoPedidoIdRaw;

        var mensagemFinal = mensagemProvisoria.replace('[ID_GERADO]', novoPedidoIdRaw);

        var modalForm = document.getElementById('modalFormulario');
        var instForm = modalForm ? bootstrap.Modal.getInstance(modalForm) : null;
        if (instForm) { try { instForm.hide(); } catch (_) { } }

        if (mensagemFinal && typeof window.enviarMensagemParaChat === 'function')
            window.enviarMensagemParaChat(mensagemFinal, false, novoPedidoId || null);

        if (novoPedidoId) {
            var novoPedidoCache = Object.assign({}, payload, {
                id: novoPedidoId,
                status: 'PENDENTE',
                motoboy: '',
                mensagem: mensagemFinal
            });
            if (Array.isArray(window.AppRDO.pedidosCache))
                window.AppRDO.pedidosCache.push(novoPedidoCache);

            if (Array.isArray(window.AppRDO.mensagensCache))
                window.AppRDO.mensagensCache.push({
                    id_cliente: payload.id_cliente,
                    pedido_id: novoPedidoId,
                    texto: mensagemFinal,
                    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    data: new Date().toISOString()
                });

            if (typeof window.EventBus !== 'undefined')
                window.EventBus.emit('pedido:adicionado', novoPedidoCache);
        }

        window.dadosPedidoAtual = {};
        window.AppRDO._mapaModalAberto = false;
        window.AppRDO.isProcessingCheckout = false;

        var msgInput = document.getElementById('msg-input');
        if (msgInput) {
            msgInput.value = '';
            msgInput.style.height = 'auto';
            msgInput.setAttribute('placeholder', 'Digite o pedido...');
        }

        setTimeout(function () { _limparBackdrop(); }, 350);

        try {
            Swal.fire({
                icon: 'success', title: 'Pedido enviado!',
                text: 'O pedido foi registrado com sucesso.',
                toast: true, position: 'top-end',
                showConfirmButton: false, timer: 3000,
                timerProgressBar: true, customClass: { popup: 'rounded-4 shadow' }
            });
        } catch (_) { }

    } catch (err) {
        if (btnRemitir) { btnRemitir.disabled = false; btnRemitir.innerHTML = textoOriginal; }
        try {
            Swal.fire({
                icon: 'error', title: 'Erro ao enviar pedido',
                html: '<div style="font-size:.9rem;">' + (err.message || 'Tente novamente.') + '</div>',
                confirmButtonText: 'Fechar', confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
        } catch (_) { alert('Erro ao enviar pedido: ' + (err.message || '')); }
    }
};

window._preencherFormulario = function (dados) {
    if (!dados) return;

    var _setInput = function (id, valor) {
        var el = document.getElementById(id);
        if (!el) return;
        el.value = valor;
        el.style.border = '';
        el.style.boxShadow = '';
    };
    var _setSelect = function (id, valor) {
        var el = document.getElementById(id);
        if (!el || valor == null) return;
        var str = String(valor);
        var encontrou = Array.prototype.some.call(el.options, function (o) { return o.value === str; });
        if (encontrou) el.value = str;
        el.style.border = '';
        el.style.boxShadow = '';
    };

    _setInput('p-solicitante', dados.solicitante || '');
    _setInput('p-contato', dados.contato || '');
    _setInput('p-horario', dados.horario || '');
    _setInput('p-distancia', Number(dados.distanciaTotal || 0).toFixed(2));
    _setInput('p-tempo', dados.tempoTotal ? window.formatarTempoHumano(dados.tempoTotal) : '');
    _setInput('p-obs', dados.obs || '');

    _setSelect('p-mercadoria', dados.mercadoria || 'ENTREGA');
    _setSelect('p-valor-km', dados.valorKm != null ? dados.valorKm : '3.00');
    _setSelect('p-retorno', dados.retorno != null ? dados.retorno : '0');
    _setSelect('p-dinamica', dados.dinamica != null ? dados.dinamica : '0');
    _setSelect('p-prioridade', dados.prioridade != null ? dados.prioridade : '0');

    var elRotas = document.getElementById('p-rotas');
    if (elRotas && dados.rotasProcessadas && dados.rotasProcessadas.length > 0)
        elRotas.value = dados.rotasProcessadas.map(function (r, i) {
            return (i + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
        }).join('\n');

    var elHeaderCliente = document.getElementById('header-nome-cliente');
    if (elHeaderCliente) elHeaderCliente.innerText = dados.cliente || 'N/A';

    window.calcularTudo();
};

window.voltarParaMapa = function () {
    var modalForm = document.getElementById('modalFormulario');
    var instForm = modalForm ? bootstrap.Modal.getInstance(modalForm) : null;
    if (instForm) { try { instForm.hide(); } catch (_) { } }

    setTimeout(function () {
        window.loadModal('mapa_clientes.html').then(function (ok) {
            if (!ok) return;
            var modalMapa = document.getElementById('modalMapa');
            if (!modalMapa) return;
            var bsModalMapa = new bootstrap.Modal(modalMapa, { backdrop: 'static', keyboard: false });
            modalMapa.addEventListener('shown.bs.modal', function () {
                var elSolicitante = document.getElementById('header-nome-solicitante');
                if (elSolicitante && window.dadosPedidoAtual) elSolicitante.innerText = window.dadosPedidoAtual.solicitante || 'N/A';
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
    if (inst) { try { inst.hide(); } catch (_) { } }
    setTimeout(function () { window.voltarParaMapa(); }, 400);
};

window.fecharParaChat = function (modalId) {
    var ids = modalId ? [modalId] : ['modalFormulario', 'modalMapa'];
    ids.forEach(function (id) {
        var modalEl = document.getElementById(id);
        if (!modalEl) return;
        var inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) { try { inst.hide(); } catch (_) { } }
    });

    window.AppRDO._mapaModalAberto = false;
    window.AppRDO.isProcessingCheckout = false;
    if (window._leafletMapInstance) { try { window._leafletMapInstance.remove(); } catch (_) { } window._leafletMapInstance = null; }
    window.dadosPedidoAtual = {};

    var input = document.getElementById('msg-input');
    if (input) {
        input.value = '';
        input.style.height = 'auto';
        input.disabled = false;
        input.readOnly = false;
        input.style.border = '';
        input.style.boxShadow = '';
        input.style.opacity = '';
        input.style.pointerEvents = '';
        input.setAttribute('placeholder', 'Digite o pedido...');
    }
    var btnEnviar = document.getElementById('btn-enviar-mensagem');
    if (btnEnviar) { btnEnviar.disabled = false; btnEnviar.style.opacity = ''; btnEnviar.style.pointerEvents = ''; }

    setTimeout(function () { _limparBackdrop(); var inp = document.getElementById('msg-input'); if (inp) inp.focus(); }, 400);
};

(function () {
    function _tentarInit() {
        if (window.AppRDO) {
            window.AppRDO.isMasterOn = localStorage.getItem('bot_master_active') === 'true';
            window.AppRDO.listaCarregada = false;
            window.AppRDO._mapaModalAberto = false;
        }
        window.PedidosDropdown.init();
        window.NotificationManager.init();
        if (window.AppRDO && !window.AppRDO.isFetching) window.carregarDados();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _tentarInit);
    else _tentarInit();

    function _registrarEventos() {
        if (typeof window.EventBus === 'undefined') { setTimeout(_registrarEventos, 300); return; }

        window.EventBus.on('pedido:excluido', function (dados) {
            var idStr = String(dados.id).trim();
            if (Array.isArray(window.AppRDO.mensagensCache))
                window.AppRDO.mensagensCache = window.AppRDO.mensagensCache.filter(function (m) {
                    return String(m.pedido_id).trim() !== idStr;
                });
            if (Array.isArray(window.AppRDO.pedidosCache))
                window.AppRDO.pedidosCache = window.AppRDO.pedidosCache.filter(function (p) {
                    return String(p.id).trim() !== idStr;
                });

            var msgEl = document.querySelector('[data-pedido-id="' + idStr + '"]');
            if (msgEl) {
                var wrapper = msgEl.closest('.message-wrapper');
                if (wrapper) {
                    wrapper.style.transition = 'opacity .3s ease, transform .3s ease';
                    wrapper.style.opacity = '0';
                    wrapper.style.transform = 'translateX(30px)';
                    setTimeout(function () { try { wrapper.remove(); } catch (_) { } }, 300);
                }
            }

            var clienteId = window.AppRDO && window.AppRDO.clienteId;
            if (clienteId) {
                setTimeout(function () {
                    if (!window.AppRDO.isFetching) {
                        _spinChatOn();
                        window.carregarPedidosDoCliente(clienteId).finally(function () { _spinChatOff(); });
                    }
                }, 350);
            }
        });

        window.EventBus.on('pedido:statusAtualizado', function (dados) {
            var idStr = String(dados.id || '').trim();
            var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
            var pedido = cache.find(function (p) {
                return String(p.id || '').trim() === idStr ||
                    String(p.id || '').trim().replace(/^RDO0*/i, '') === idStr.replace(/^RDO0*/i, '');
            });
            if (pedido) {
                pedido.status = dados.status || pedido.status;
                if (dados.motoboy) pedido.motoboy = dados.motoboy;
                if (dados.motivo_cancelamento !== undefined) pedido.motivo_cancelamento = dados.motivo_cancelamento;
            }
        });
    }

    _registrarEventos();
})();
