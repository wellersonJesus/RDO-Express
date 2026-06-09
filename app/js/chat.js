window.AppRDO = window.AppRDO || {
    debounceTimer: null,
    listaCarregada: false,
    isFetching: false,
    isProcessingCheckout: false,
    pedidosCache: [],
    motoboyCache: [],
    pedidoEmEdicao: null,
    clienteId: null,
    clienteSelecionado: null
};

window.dadosPedidoAtual = window.dadosPedidoAtual || {};

window.iniciarChat = async () => await window.carregarDados();

document.addEventListener('input', (e) => {
    if (e.target?.id === 'p-contato') {
        let val = e.target.value.replace(/\D/g, '');
        e.target.value = typeof window.formatarTelefone === 'function'
            ? window.formatarTelefone(val) : val;
    }
    if (e.target?.id === 'chat-search') {
        window.filtrarContatos();
    }
    if (e.target.classList.contains('border-danger')) {
        e.target.classList.remove('border', 'border-danger', 'border-2');
    }
});

document.addEventListener('change', (e) => {
    if (e.target && e.target.closest('#modalFormulario')) {
        if (typeof window.calcularTudo === 'function') {
            window.calcularTudo();
        }
    }
});

document.addEventListener('click', (e) => {
    if (e.target.closest('#sync-icon-chat')) {
        const syncIcon = document.getElementById('sync-icon-chat');
        if (syncIcon && !window.AppRDO.isFetching) {
            syncIcon.classList.add('spinner-rotate');
            window.carregarDados().finally(() => {
                syncIcon.classList.remove('spinner-rotate');
            });
        }
    }
});

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

window.carregarDados = async function () {
    const listEl = document.getElementById('lista-contatos-chat');
    const iconHeader = document.getElementById('sync-icon-header');
    const iconSearch = document.getElementById('sync-icon-search');
    const btnSearch = document.getElementById('btn-sync-search');
    const searchInput = document.getElementById('chat-search');

    if (!listEl || window.AppRDO.isFetching) return;

    window.AppRDO.isFetching = true;

    if (iconHeader) iconHeader.classList.add('spinner-rotate');
    if (iconSearch) iconSearch.classList.add('spinner-rotate');
    if (btnSearch) btnSearch.style.opacity = '0.5';
    if (searchInput) searchInput.placeholder = 'Sincronizando...';

    try {
        const [clientes, mensagens, pedidos] = await Promise.all([
            API.call('getclientes'),
            API.call('getchat'),
            API.call('getpedidos')
        ]);

        const listaClientes = Array.isArray(clientes) ? clientes : [];
        const listaMensagens = Array.isArray(mensagens) ? mensagens : [];
        const listaPedidos = Array.isArray(pedidos) ? pedidos : [];
        const isMasterOn = localStorage.getItem('bot_master_active') === 'true';

        window.renderizarLista(listaClientes, isMasterOn);
        window.renderizarMensagens(listaMensagens, listaPedidos);

        window.AppRDO.listaCarregada = true;
        if (searchInput) searchInput.placeholder = 'Buscar cliente...';
    } catch (e) {
        console.error('Erro crítico na sincronização:', e);
        listEl.innerHTML = `
            <div class="p-3 text-center text-danger small">
                <i class="bi bi-exclamation-triangle"></i> Erro ao carregar dados.
            </div>`;
    } finally {
        window.AppRDO.isFetching = false;
        if (iconHeader) iconHeader.classList.remove('spinner-rotate');
        if (iconSearch) iconSearch.classList.remove('spinner-rotate');
        if (btnSearch) btnSearch.style.opacity = '1';
    }
};

window.renderizarLista = function (lista, isMasterOn) {
    const listEl = document.getElementById('lista-contatos-chat');

    if (lista.length === 0) {
        listEl.innerHTML = '<div class="p-3 text-center text-muted small">Nenhum contato disponível.</div>';
        return;
    }

    listEl.innerHTML = lista.map(cliente => {
        const id = String(cliente.id || '');
        const nome = (cliente.nome || cliente.username || 'Sem nome');
        const imagem = cliente.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        const isOnline = isMasterOn && String(cliente.status || '').toUpperCase() === 'TRUE';
        const statusColor = isOnline ? '#28a745' : '#adb5bd';

        return `
            <div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean"
                 id="item-contato-${id}"
                 onclick="window.selecionarEAbrir('${id}', '${nome.replace(/'/g, "\\'")}', ${isOnline})">
                <div class="position-relative">
                    <img src="${imagem}" class="rounded-circle" style="width:32px; height:32px; object-fit:cover;">
                    <span class="position-absolute bottom-0 end-0 rounded-circle border border-white"
                          style="width:8px; height:8px; background-color: ${statusColor};"></span>
                </div>
                <div class="ms-2 overflow-hidden text-truncate">
                    <div class="contact-name">${nome}</div>
                    <div class="small text-muted" style="font-size: 0.7rem;">${isOnline ? 'Online' : 'Offline'}</div>
                </div>
            </div>`;
    }).join('');
};

window.renderizarMensagens = function (mensagens, pedidos) {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = '';

    window.AppRDO.pedidosCache = pedidos;

    let ultimaData = null;

    mensagens.forEach(msg => {
        const labelData = window.formatarDataSeparador(msg.data || null);
        if (labelData && labelData !== ultimaData) {
            ultimaData = labelData;
            const separador = document.createElement('div');
            separador.className = 'chat-date-separator';
            separador.innerHTML = `<span class="chat-date-badge">${labelData}</span>`;
            container.appendChild(separador);
        }

        const pedido = pedidos.find(p => String(p.id).trim() === String(msg.pedido_id).trim());
        const statusBruto = String(pedido?.status || '').trim();
        const motoboyNome = String(pedido?.motoboy || '').trim();
        const horaMsg = msg.hora || '';

        const statusPuro = statusBruto.includes('/')
            ? statusBruto.split('/').pop().trim()
            : statusBruto;

        const statusUpper = statusPuro.toUpperCase();
        const isFinal = statusUpper === 'CONCLUIDO' || statusUpper === 'CONCLUÍDO' || statusUpper === 'CANCELADO';
        const isEmRota = statusUpper === 'EM_ROTA' || statusUpper === 'EM ROTA' || statusBruto.includes('/');
        const temStatus = isEmRota || isFinal;

        let tooltipTexto = 'Alterar Status';
        if (temStatus) {
            const statusLabel = statusPuro.replace(/_/g, ' ');
            tooltipTexto = motoboyNome ? `${motoboyNome} • ${statusLabel}` : statusLabel;
        }

        const div = document.createElement('div');
        div.className = 'message-wrapper';
        div.innerHTML = `
            <div class="message-sent" data-pedido-id="${msg.pedido_id}" onclick="window.abrirModalEdicao('${msg.pedido_id}')">
                <div class="message-body">${(msg.texto || '').replace(/\n/g, '<br>')}</div>
                <div class="status-icon ${temStatus ? 'status-updated' : 'status-pending'}"
                     onclick="event.stopPropagation(); window.abrirModalStatus('${msg.pedido_id}')"
                     data-tooltip="${tooltipTexto}">
                     ${temStatus ? window.getIconePorStatus(statusPuro) : '<i class="bi bi-arrow-repeat spinner-rotate"></i>'}
                </div>
                <span class="message-time">${horaMsg}</span>
            </div>`;
        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
};

window.enviarMensagemParaChat = function (texto, isRecebida = false, pedidoId = null) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const hojeLabel = 'HOJE';
    const ultimoSeparador = container.querySelector('.chat-date-separator:last-of-type .chat-date-badge');
    if (!ultimoSeparador || ultimoSeparador.textContent !== hojeLabel) {
        const separador = document.createElement('div');
        separador.className = 'chat-date-separator';
        separador.innerHTML = `<span class="chat-date-badge">${hojeLabel}</span>`;
        container.appendChild(separador);
    }

    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.className = 'message-wrapper';
    div.innerHTML = `
        <div class="message-sent" data-pedido-id="${pedidoId}" onclick="window.abrirModalEdicao('${pedidoId}')">
            <div class="message-body">${texto.replace(/\n/g, '<br>')}</div>
            <div class="status-icon status-pending"
                 onclick="event.stopPropagation(); window.abrirModalStatus('${pedidoId}')"
                 data-tooltip="Alterar Status">
                 <i class="bi bi-arrow-repeat spinner-rotate"></i>
            </div>
            <span class="message-time">${horaAtual}</span>
        </div>`;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
};

window.getIconePorStatus = function (status) {
    const s = String(status || '').trim().toUpperCase();
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

window.selecionarEAbrir = function (id, nome, isOnline) {
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

    container.innerHTML = `
        <div class="chat-status-container">
            <i class="bi bi-search icon-status-large spinner-rotate"></i>
            <div class="status-label-gray" style="margin-top: 10px;">Buscando mensagens...</div>
        </div>`;

    try {
        const [todasMensagens, todosPedidos] = await Promise.all([
            API.call('getchat'),
            API.call('getpedidos')
        ]);

        if (!todasMensagens) throw new Error('Falha ao obter dados');

        const historico = (Array.isArray(todasMensagens) ? todasMensagens : []).filter(m =>
            String(m.jid_numero || '').trim() === idLimpo
        );

        const pedidos = Array.isArray(todosPedidos) ? todosPedidos : [];
        window.AppRDO.pedidosCache = pedidos;

        container.innerHTML = '';

        if (historico.length === 0) {
            container.innerHTML = `
                <div class="chat-status-container">
                    <i class="bi bi-bootstrap-reboot icon-status-large"></i>
                    <div class="status-label-gray" style="margin-top: 10px;">Nenhum histórico encontrado.</div>
                </div>`;
        } else {
            window.renderizarMensagens(historico, pedidos);
        }
    } catch (e) {
        console.error('Erro ao carregar conversa:', e);
        container.innerHTML = `
            <div class="chat-status-container text-danger">
                <i class="bi bi-exclamation-triangle icon-status-large"></i>
                <div class="status-label-gray" style="margin-top: 10px;">Erro ao carregar histórico.</div>
            </div>`;
    }
};

window.StatusModal = (function () {

    let _pedidoId = null;
    let _modalBS = null;

    /* ─── Helpers seguros ─── */

    function _el(id) {
        return document.getElementById(id) || null;
    }

    function _safeText(el, txt) {
        if (el && typeof txt === 'string') el.textContent = txt;
    }

    function _safeClass(el, action, ...cls) {
        if (!el || !el.classList) return;
        cls.forEach(c => {
            if (action === 'add') el.classList.add(c);
            else if (action === 'remove') el.classList.remove(c);
            else if (action === 'toggle') el.classList.toggle(c);
        });
    }

    /* ─── Reset do modal ─── */

    function _resetar() {
        try {
            const texto = _el('modal-status-texto');
            const icone = _el('modal-status-icone');
            const boxBotoes = _el('box-botoes-status');
            const boxMotoboy = _el('box-selecao-motoboy');
            const select = _el('select-motoboy');

            _safeText(texto, 'Alterar Status');
            if (icone) icone.className = 'bi bi-arrow-repeat';
            _safeClass(boxBotoes, 'remove', 'd-none');
            _safeClass(boxMotoboy, 'add', 'd-none');

            if (select) {
                select.innerHTML = '<option value="" disabled selected>Selecione o motoboy...</option>';
                select.style.borderColor = '#ddd';
            }
        } catch (_) { /* silencioso */ }
    }

    /* ─── Carregar motoboys do API ─── */

    async function _carregarMotoboys() {
        const select = _el('select-motoboy');
        if (!select) return;

        select.innerHTML = '<option value="" disabled selected>⏳ Carregando...</option>';

        try {
            const todos = await API.call('getcolaboradores');
            const lista = Array.isArray(todos) ? todos : [];

            const motoboys = lista.filter(c => {
                const cargo = String(c.colaborador || '').toUpperCase();
                const ativo = String(c.status || '').toUpperCase();
                return cargo.includes('MOTOBOY') && ativo === 'TRUE';
            });

            if (motoboys.length > 0) {
                select.innerHTML =
                    '<option value="" disabled selected>Selecione o motoboy...</option>' +
                    motoboys.map(m => {
                        const nome = String(m.username || m.nome || 'Sem nome');
                        const id = String(m.id || '');
                        return `<option value="${id}">${nome}</option>`;
                    }).join('');
            } else {
                select.innerHTML = '<option value="" disabled selected>Nenhum motoboy disponível</option>';
            }
        } catch (_) {
            select.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
        }
    }

    /* ─── Spinner no ícone de status (dentro do chat) ─── */

    function _setSpinnerNoBotao(pedidoId) {
        try {
            if (!pedidoId) return;
            const msgEl = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
            const iconEl = msgEl?.querySelector('.status-icon');
            if (!iconEl) return;

            iconEl.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
            _safeClass(iconEl, 'remove', 'status-updated');
            _safeClass(iconEl, 'add', 'status-pending');
            iconEl.setAttribute('data-tooltip', 'Atualizando...');
        } catch (_) { /* silencioso */ }
    }

    /* ─── Ícone final após resposta da API ─── */

    function _setIconeFinal(pedidoId, status, motoboyNome) {
        try {
            if (!pedidoId) return;
            const msgEl = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
            const iconEl = msgEl?.querySelector('.status-icon');
            if (!iconEl) return;

            const iconHTML = typeof window.getIconePorStatus === 'function'
                ? window.getIconePorStatus(status)
                : '<i class="bi bi-question-circle"></i>';

            iconEl.innerHTML = iconHTML;
            _safeClass(iconEl, 'remove', 'status-pending');
            _safeClass(iconEl, 'add', 'status-updated');

            const statusLabel = String(status || '').replace(/_/g, ' ');
            const tooltip = motoboyNome ? `${motoboyNome} • ${statusLabel}` : statusLabel;
            iconEl.setAttribute('data-tooltip', tooltip);
            iconEl.setAttribute('title', tooltip);
        } catch (_) { /* silencioso */ }
    }

    /* ─── Atualizar cache local de pedidos (AppRDO) ─── */

    function _atualizarCache(pedidoId, statusFormatado, motoboyNome) {
        try {
            const cache = window.AppRDO?.pedidosCache;
            if (!Array.isArray(cache)) return;

            const pedido = cache.find(
                p => String(p.id || '').trim() === String(pedidoId || '').trim()
            );
            if (!pedido) return;

            pedido.status = statusFormatado;
            if (motoboyNome) pedido.motoboy = motoboyNome;
        } catch (_) { /* silencioso */ }
    }

    /* ─── Executar alteração de status (core) ─── */

    async function _executarAlteracao(status, motoboyId) {
        let motoboyNome = '';
        let statusFormatado = String(status || '');

        // ── Extrair nome do motoboy com segurança ──
        try {
            if (motoboyId) {
                const select = _el('select-motoboy');
                if (select && select.selectedIndex >= 0) {
                    motoboyNome = String(select.options[select.selectedIndex]?.text || '').trim();
                }
            }
        } catch (_) {
            motoboyNome = '';
        }

        // ── Montar status formatado ──
        if (motoboyNome) {
            statusFormatado = `${motoboyNome}/${status}`;
        }

        // ── Feedback visual: spinner ──
        _setSpinnerNoBotao(_pedidoId);

        // ── Fechar modal ──
        try { _modalBS?.hide(); } catch (_) { /* silencioso */ }

        // ── Chamada à API ──
        try {
            const payload = {
                id: String(_pedidoId || ''),
                status: statusFormatado,
                motoboy: motoboyNome
            };

            const resposta = await API.call('updatepedido', payload);

            if (resposta?.status === 'success') {
                // ✅ Atualiza cache do chat (AppRDO)
                _atualizarCache(_pedidoId, statusFormatado, motoboyNome);

                // ✅ Atualiza ícone no chat
                _setIconeFinal(_pedidoId, status, motoboyNome);

                // ✅ Sincroniza com a aba de pedidos (RDO_PEDIDOS)
                try {
                    if (typeof window.RDO_PEDIDOS?.atualizarStatusLocal === 'function') {
                        window.RDO_PEDIDOS.atualizarStatusLocal(_pedidoId, statusFormatado, motoboyNome);
                    }
                } catch (_) { /* silencioso — aba pode não estar carregada */ }

            } else {
                throw new Error(resposta?.message || 'Falha na API');
            }

        } catch (e) {
            // ❌ Restaura ícone neutro no chat
            _setIconeFinal(_pedidoId, '', '');

            // ❌ Exibe alerta de erro
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

    /* ─── Abrir modal de status ─── */

    function abrir(pedidoId) {
        try {
            if (!pedidoId || pedidoId === 'null' || pedidoId === 'undefined') return;

            const cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
            const pedido = cache.find(
                p => String(p.id || '').trim() === String(pedidoId).trim()
            );

            const statusBruto = String(pedido?.status || '').trim();
            const statusPuro = statusBruto.includes('/')
                ? statusBruto.split('/').pop().trim().toUpperCase()
                : statusBruto.toUpperCase();

            if (statusPuro === 'CONCLUIDO' || statusPuro === 'CONCLUÍDO' || statusPuro === 'CANCELADO') {
                const isConcluido = statusPuro === 'CONCLUIDO' || statusPuro === 'CONCLUÍDO';
                Swal.fire({
                    icon: isConcluido ? 'success' : 'error',
                    title: 'Pedido Finalizado',
                    html: `<div style="font-size: 0.93rem; color: #555;">
                        Este pedido já foi
                        <strong style="color: ${isConcluido ? '#28a745' : '#dc3545'};">
                            ${isConcluido ? 'Concluído' : 'Cancelado'}
                        </strong>
                        e não pode mais ser alterado.
                    </div>`,
                    confirmButtonText: 'Entendi',
                    confirmButtonColor: '#dc3545',
                    customClass: { popup: 'rounded-4', confirmButton: 'rounded-3' }
                });
                return;
            }

            _pedidoId = pedidoId;
            _resetar();

            const modalEl = _el('modalStatus');
            if (!modalEl) return;

            if (!_modalBS) {
                _modalBS = new bootstrap.Modal(modalEl, { backdrop: 'static' });
            }

            _modalBS.show();
        } catch (e) {
            console.warn('StatusModal.abrir — erro:', e);
        }
    }

    /* ─── Processar escolha de status ─── */

    function processar(status) {
        try {
            if (status === 'EM_ROTA') {
                const texto = _el('modal-status-texto');
                const icone = _el('modal-status-icone');
                _safeText(texto, 'Selecione o Motoboy');
                if (icone) icone.className = 'bi bi-bicycle';

                _safeClass(_el('box-botoes-status'), 'add', 'd-none');
                _safeClass(_el('box-selecao-motoboy'), 'remove', 'd-none');

                _carregarMotoboys();
                return;
            }

            const opcoes = {
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

            const cfg = opcoes[status];
            if (!cfg) return;

            try { _modalBS?.hide(); } catch (_) { /* silencioso */ }

            Swal.fire({
                icon: cfg.icone,
                title: cfg.titulo,
                html: `<div style="font-size: 0.9rem; color: #555;">${cfg.html}</div>`,
                showCancelButton: true,
                confirmButtonText: cfg.btnTexto,
                cancelButtonText: 'Voltar',
                confirmButtonColor: cfg.btnCor,
                cancelButtonColor: '#6c757d',
                reverseButtons: true,
                customClass: { popup: 'rounded-4', confirmButton: 'rounded-3', cancelButton: 'rounded-3' }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await _executarAlteracao(status);
                }
            }).catch(() => { /* Swal fechado sem ação */ });

        } catch (e) {
            console.warn('StatusModal.processar — erro:', e);
        }
    }

    /* ─── Confirmar motoboy selecionado ─── */

    async function confirmarMotoboy() {
        try {
            const select = _el('select-motoboy');
            const motoboyId = select?.value;

            if (!motoboyId) {
                if (select) {
                    select.style.borderColor = '#dc3545';
                    select.focus();
                    _safeClass(select, 'add', 'animate__animated', 'animate__shakeX');
                    setTimeout(() => {
                        if (select) {
                            select.style.borderColor = '#ddd';
                            _safeClass(select, 'remove', 'animate__animated', 'animate__shakeX');
                        }
                    }, 1500);
                }
                return;
            }

            await _executarAlteracao('EM_ROTA', motoboyId);
        } catch (e) {
            console.warn('StatusModal.confirmarMotoboy — erro:', e);
        }
    }

    /* ─── Voltar para tela inicial do modal ─── */

    function voltar() {
        _resetar();
    }

    /* ─── API Pública ─── */

    return { abrir, processar, confirmarMotoboy, voltar };

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
    }).then(result => {
        if (result.isConfirmed) window.abrirModalMensagemPadrao();
        else if (result.isDenied) window.excluirPedido(msgId);
    });
};

window.abrirModalMensagemPadrao = function () {
    const modalEl = document.getElementById('modalMensagemPadrao');
    if (modalEl) new bootstrap.Modal(modalEl).show();
};

window.copiarModelo = function () {
    const texto = document.getElementById('texto-modelo');
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

    const confirm = await Swal.fire({
        title: 'Tem certeza?',
        text: 'Esta ação não pode ser desfeita!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        try {
            const resposta = await API.call('deletepedido', { id: msgId });
            if (resposta?.status === 'success') {
                const msgEl = document.querySelector(`[data-pedido-id="${msgId}"]`)?.closest('.message-wrapper');
                if (msgEl) {
                    msgEl.remove();
                    Swal.fire('Excluído!', 'O pedido foi removido.', 'success');
                }
            } else {
                throw new Error(resposta?.message || 'Erro ao excluir no servidor.');
            }
        } catch (e) {
            Swal.fire('Erro!', 'Não foi possível excluir: ' + e.message, 'error');
        }
    }
};

async function buscarCoordenadasEndereco(enderecoTexto) {
    try {
        let termo = enderecoTexto
            .replace(/^\d+\.\s*/, '')
            .replace(/[||\-]/g, ' ')
            .trim();

        const busca = encodeURIComponent(termo + ', Belo Horizonte, MG');
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${busca}`;

        const response = await fetch(url);
        const dados = await response.json();

        return (dados && dados.length > 0)
            ? { lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) }
            : null;
    } catch (err) {
        return null;
    }
}

function formatarTempoHumano(minutosTotais) {
    const mins = Math.ceil(minutosTotais);
    if (mins < 60) return `${mins} min`;
    const horas = Math.floor(mins / 60);
    const minsRestantes = mins % 60;
    return minsRestantes === 0 ? `${horas} h` : `${horas} h ${minsRestantes} min`;
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

        L.polyline(caminho, {
            color: cor, weight: 5, dashArray: '8, 8', opacity: 0.9
        }).addTo(window.mapaInstancia);

        if (index === 0) L.marker(caminho[0], { icon: criarIcone('🏁') }).addTo(window.mapaInstancia);

        if (index === trajetos.length - 1) {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('📍') }).addTo(window.mapaInstancia);
        } else {
            L.marker(caminho[caminho.length - 1], { icon: criarIcone('🔄') }).addTo(window.mapaInstancia);
        }
    });

    window.mapaInstancia.fitBounds(trajetos.flat(), { padding: [50, 50] });
};

window.renderizarFooterResumo = function (el) {
    if (!el) return;
    const d = window.dadosPedidoAtual || {};
    el.innerHTML = `
        <span class="me-3"><i class="bi bi-clock-fill"></i> ${d.tempo || '--'}</span>
        <span class="me-3"><i class="bi bi-geo-alt-fill"></i> ${d.distancia || '0'} km</span>
        <span class="fw-bold"><i class="bi bi-wallet2"></i> ${d.valor || 'R$ 0,00'}</span>`;
};

window.enviarMensagemGeral = async function () {
    const input = document.getElementById('msg-input');

    if (!window.AppRDO?.clienteId) {
        Swal.fire('Atenção', 'Selecione um cliente na lista primeiro.', 'warning');
        return;
    }
    if (!input || !input.value.trim()) {
        Swal.fire('Atenção', 'Digite o pedido antes de enviar.', 'warning');
        return;
    }

    await window.iniciarFluxoCheckout();
};

window.iniciarFluxoCheckout = async function () {
    const msgInput = document.getElementById('msg-input');
    const texto = msgInput?.value?.trim();

    if (!texto) {
        window.exibirModalAviso('Por favor, digite os dados do pedido.');
        return;
    }

    const solicitante = (texto.match(/(?:SOLICITANTE|NOME|CLIENTE):\s*(.*)/i)?.[1] || 'Não informado').trim();
    const contato = (texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE):\s*([\d\s\-\(\)]+)/i)?.[1] || '').trim();
    const linhasRota = texto.split('\n').filter(l => /de:/i.test(l) && /para:/i.test(l));

    if (linhasRota.length === 0) {
        window.exibirModalAviso("Formato de rota inválido. Use 'De: X Para: Y'.");
        return;
    }

    await window.loadModal('modal_mapa.html');
    const modalEl = document.getElementById('modalMapa');
    const modal = new bootstrap.Modal(modalEl);

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

            window.dadosPedidoAtual = {
                solicitante, contato,
                cliente: window.AppRDO.clienteSelecionado,
                distancia: Math.round(kmTotal).toString(),
                tempo: formatarTempoHumano(minTotal),
                coordenadas: listaCaminhos,
                valor: (Math.round(kmTotal) * 3.00).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                rawInput: texto
            };

            window.renderizarFooterResumo(resumoEl);
            window.renderizarMapaUnificado();
        } catch (err) {
            if (resumoEl) resumoEl.innerHTML = `<span class="text-danger">Erro: ${err.message}</span>`;
        }
    }, { once: true });

    modal.show();
};

window.prosseguirParaFormulario = async function () {
    const modalMapa = bootstrap.Modal.getInstance(document.getElementById('modalMapa'));
    modalMapa?.hide();

    await window.loadModal('modal_form.html');
    const modalForm = new bootstrap.Modal(document.getElementById('modalFormulario'));

    document.getElementById('modalFormulario').addEventListener('shown.bs.modal', () => {
        window.preencherDadosFormulario();
        if (typeof window.calcularTudo === 'function') window.calcularTudo();
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
        const elHeader = document.getElementById('header-nome-solicitante');
        if (elHeader) elHeader.innerText = window.dadosPedidoAtual?.solicitante || 'Cliente';

        const resumoEl = document.getElementById('resumo-total');
        if (resumoEl) window.renderizarFooterResumo(resumoEl);

        window.renderizarMapaUnificado();
    }, { once: true });

    modalMapa.show();
};

window.voltarParaChat = function () {
    document.getElementById('step-formulario')?.classList.add('d-none');
    document.getElementById('step-mapa')?.classList.add('d-none');
    document.getElementById('step-chat')?.classList.remove('d-none');
};

window.calcularTudo = function () {
    try {
        const parse = (id) => {
            const val = document.getElementById(id)?.value;
            if (!val) return 0;
            return parseFloat(String(val).replace(',', '.')) || 0;
        };

        const km = parse('p-distancia');
        const valorKm = parse('p-valor-km');
        const taxaDin = parse('p-dinamica');
        const prioridade = parse('p-prioridade');
        const retorno = parse('p-retorno');

        let subtotal = (km * valorKm) + taxaDin + prioridade;
        let total = subtotal + (subtotal * retorno);

        const view = document.getElementById('view-valor-final');
        if (view) view.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch (error) {
        const view = document.getElementById('view-valor-final');
        if (view) view.innerText = 'Erro no cálculo';
    }
};

window.preencherDadosFormulario = function () {
    try {
        const dados = window.dadosPedidoAtual || {};
        const msgInput = document.getElementById('msg-input');
        const texto = msgInput ? msgInput.value : '';

        const nomeCliente = window.AppRDO?.clienteSelecionado ||
            document.getElementById('chat-header-name')?.innerText || 'Não identificado';

        const elHeader = document.getElementById('header-nome-cliente');
        if (elHeader) {
            elHeader.innerText = nomeCliente;
            elHeader.classList.remove('text-muted');
            elHeader.classList.add('text-dark');
        }

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

        const elContato = document.getElementById('p-contato');
        if (elContato) {
            const regexTel = /(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/;
            const matchTel = texto.match(regexTel);
            if (matchTel) {
                elContato.value = window.formatarTelefone(matchTel[0].replace(/\D/g, ''));
            }
        }

        if (document.getElementById('p-distancia')) document.getElementById('p-distancia').value = dados.distancia || '0';
        if (document.getElementById('p-tempo')) document.getElementById('p-tempo').value = dados.tempo || '0 min';

        const elHorario = document.getElementById('p-horario');
        if (elHorario && !elHorario.value) {
            elHorario.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

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

        if (typeof window.calcularTudo === 'function') window.calcularTudo();
    } catch (error) {
        console.error('ERRO CRÍTICO no preenchimento do formulário:', error);
    }
};

window.salvarPedidoAPI = async function () {
    var btn = document.getElementById('btn-emitir-pedido');
    var camposObrigatorios = ['p-solicitante', 'p-mercadoria', 'p-distancia', 'p-rotas', 'p-valor-km'];

    var ehValido = true;
    camposObrigatorios.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || !el.value.trim()) {
            el.classList.add('is-invalid');
            ehValido = false;
        } else {
            el.classList.remove('is-invalid');
        }
    });
    if (!ehValido) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Emitindo...';

    try {
        var getVal = function (id) {
            var el = document.getElementById(id);
            return (el?.value || '').trim().replace(/</g, '&lt;').replace(/>/g, '&gt;') || 'N/A';
        };
        var valorFinal = document.getElementById('view-valor-final')?.innerText || 'R$ 0,00';

        var rotasRaw = getVal('p-rotas').split('\n');
        var rotasFormatadas = rotasRaw.map(function (l, i) {
            var partes = l.split('|');
            return '📍' + (i + 1) + '. De: ' + (partes[0]?.trim() || '') + ' | \n      Para: ' + (partes[1]?.trim() || '');
        }).join('\n');

        var PLACEHOLDER_ID = '%%ID_PEDIDO%%';
        var retornoLabel = getVal('p-retorno') === '0.6' ? 'Sim' : 'Não';

        var msgTemplate = '📦 SOLICITANTE: ' + getVal('p-solicitante') + '\n\n' +
            'N.SERVIÇO: ' + PLACEHOLDER_ID + '\n' +
            'SOLICITANTE: ' + getVal('p-solicitante') + ' \n' +
            'CONTATO: ' + getVal('p-contato') + ' | HR: ' + getVal('p-horario') + '\n-\n' +
            'MERCADORIA: ' + getVal('p-mercadoria') + '\n' +
            'RETORNO: ' + retornoLabel + '\n-\n' +
            'ROTA(s): \n' + rotasFormatadas + '\n-\n' +
            'OBSERVAÇÃO: ' + getVal('p-obs') + '\n' +
            valorFinal;

        var resp = await API.call('finalizarpedido', {
            action: 'finalizarpedido',
            id_chat: String(window.AppRDO.clienteId),
            solicitante: getVal('p-solicitante'),
            contato: getVal('p-contato'),
            horario: getVal('p-horario'),
            mercadoria: getVal('p-mercadoria'),
            retorno: retornoLabel,
            rotas_texto: getVal('p-rotas'),
            observacao: getVal('p-obs'),
            valor_corrida: valorFinal,
            prioridade: getVal('p-prioridade'),
            mensagem: msgTemplate.replace(PLACEHOLDER_ID, '[ID_GERADO]')
        });

        if (resp?.status === 'success') {
            var idReal = resp.id || '0';
            var idFormatado = typeof window.formatarIdServico === 'function'
                ? window.formatarIdServico(idReal)
                : '#RDO' + String(idReal).padStart(3, '0');

            var idFormatadoHTML = '<span style="color: #dc3545; font-weight: bold;">' + idFormatado + '</span>';
            var msgParaChat = msgTemplate.replace(PLACEHOLDER_ID, idFormatadoHTML).replace(/\n/g, '<br>');

            window.enviarMensagemParaChat(msgParaChat, false, idReal);
            document.getElementById('msg-input').value = '';
            bootstrap.Modal.getInstance(document.getElementById('modalFormulario'))?.hide();

            if (typeof window.RDO_PEDIDOS?.adicionarPedidoLocal === 'function') {
                window.RDO_PEDIDOS.adicionarPedidoLocal({
                    id: idReal,
                    id_chat: String(window.AppRDO.clienteId),
                    solicitante: getVal('p-solicitante'),
                    contato: getVal('p-contato'),
                    horario: getVal('p-horario'),
                    mercadoria: getVal('p-mercadoria'),
                    de: getVal('p-rotas'),
                    para: '',
                    retorno: retornoLabel,
                    prioridade: getVal('p-prioridade'),
                    valor_corrida: valorFinal,
                    motoboy: '',
                    status: 'PENDENTE',
                    observacao: getVal('p-obs')
                });
            }

            try {
                await API.call('updatechat', {
                    id: resp.id_chat || '',
                    texto: msgTemplate.replace(PLACEHOLDER_ID, idFormatado)
                });
            } catch (updateErr) {
                console.warn('Aviso: não foi possível atualizar o texto no histórico:', updateErr);
            }
        } else {
            throw new Error(resp?.message || 'Erro ao salvar.');
        }
    } catch (err) {
        if (typeof window.exibirErroNoModal === 'function') {
            window.exibirErroNoModal('Erro ao emitir pedido: ' + err.message);
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'EMITIR PEDIDO';
    }
};

window.formatarTelefone = function (tel) {
    if (!tel) return '';
    let val = String(tel).replace(/\D/g, '');

    if (val.length === 8) return val.replace(/^(\d{4})(\d{4})$/, '$1-$2');
    if (val.length === 10) return val.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    if (val.length === 11) return val.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    return val;
};

window.formatarDataSeparador = function (dataStr) {
    if (!dataStr) return null;

    const partes = String(dataStr).split('/');
    if (partes.length !== 3) return null;

    const dataMsg = new Date(partes[2], partes[1] - 1, partes[0]);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataMsg.setHours(0, 0, 0, 0);

    const diffDias = Math.floor((hoje - dataMsg) / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'HOJE';
    if (diffDias === 1) return 'ONTEM';
    return dataStr;
};

window.exibirErro = function (erro, contexto = 'Erro desconhecido') {
    const container = document.getElementById('chat-messages-container');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger m-3 rounded-4 shadow-sm">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Ops!</strong> Algo deu errado ao ${contexto}.
                <br><small class="text-secondary">${erro.message || erro}</small>
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-danger" onclick="window.carregarDados()">Tentar Novamente</button>
                </div>
            </div>`;
    } else {
        window.exibirModalAviso(`Falha ao ${contexto}: ${erro.message || erro}`);
    }
};

window.exibirErroNoModal = function (mensagem) {
    const container = document.getElementById('form-error-container');
    const texto = document.getElementById('form-error-text');
    if (texto) texto.innerText = mensagem;
    if (container) {
        container.classList.remove('d-none');
        setTimeout(() => container.classList.add('d-none'), 4000);
    }
};

window.exibirModalAviso = function (mensagem) {
    const elModal = document.getElementById('modalAtencao');
    const elTexto = document.getElementById('modal-atencao-mensagem');
    if (elTexto) elTexto.innerText = mensagem;
    if (elModal) new bootstrap.Modal(elModal).show();
    else alert(mensagem);
};
