window.RDO_PEDIDOS = window.RDO_PEDIDOS || {};

window.pedidosState = {
    isFetching: false,
    filtroCategoria: 'todos',
    paginaAtual: 1,
    itensPorPagina: 20
};

function _esc(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.formatarIdServico = function (id) {
    try {
        var num = parseInt(String(id || '0').replace(/\D/g, ''), 10);
        if (isNaN(num)) num = 0;
        return 'RDO' + String(num).padStart(3, '0');
    } catch (_) {
        return 'RDO000';
    }
};

window.resolverNomeCliente = function (pedido) {
    try {
        var idChat = String(pedido.id_chat || '').trim();
        if (!idChat) return String(pedido.solicitante || '—');

        var clientes = [];
        if (Array.isArray(window.AppRDO?.clientesCache)) {
            clientes = window.AppRDO.clientesCache;
        } else if (Array.isArray(window.adminState?.dados)) {
            clientes = window.adminState.dados;
        }

        for (var c of clientes) {
            var cId = String(c.id_chat || c.id || '').trim();
            if (cId === idChat) return String(c.nome || c.name || c.solicitante || '—');
        }

        if (window.AppRDO?.contatosCache) {
            var contato = window.AppRDO.contatosCache[idChat];
            if (contato) return String(contato.nome || contato.name || contato.pushname || '—');
        }

        if (window.AppRDO?.chatsCache) {
            for (var chat of window.AppRDO.chatsCache) {
                var chatId = String(chat.id || chat.id_chat || '').trim();
                if (chatId === idChat) return String(chat.nome || chat.name || chat.pushname || '—');
            }
        }

        return String(pedido.solicitante || '—');
    } catch (_) {
        return String(pedido.solicitante || '—');
    }
};

function _resolverSolicitantePorIdChat(idChat) {
    try {
        var id = String(idChat || '').trim();
        if (!id) return '';

        var clientes = [];
        if (Array.isArray(window.AppRDO?.clientesCache)) {
            clientes = window.AppRDO.clientesCache;
        } else if (Array.isArray(window.adminState?.dados)) {
            clientes = window.adminState.dados;
        }

        for (var c of clientes) {
            var cId = String(c.id_chat || c.id || '').trim();
            if (cId === id) return String(c.nome || c.name || c.solicitante || '');
        }

        if (window.AppRDO?.contatosCache) {
            var contato = window.AppRDO.contatosCache[id];
            if (contato) return String(contato.nome || contato.name || contato.pushname || '');
        }

        if (window.AppRDO?.chatsCache) {
            for (var chat of window.AppRDO.chatsCache) {
                var chatId = String(chat.id || chat.id_chat || '').trim();
                if (chatId === id) return String(chat.nome || chat.name || chat.pushname || '');
            }
        }

        return '';
    } catch (_) {
        return '';
    }
}

function _statusPuro(pedido) {
    var s = String(pedido.status || 'PENDENTE').trim();
    return (s.includes('/') ? s.split('/').pop().trim() : s).toUpperCase();
}

function _isFinalizado(pedido) {
    var s = _statusPuro(pedido);
    return s === 'CONCLUIDO' || s === 'CONCLUÍDO' || s === 'CANCELADO';
}

async function _carregarModaisPedidos() {
    var container = document.getElementById('modal-pedidos-container');
    if (!container) return;
    if (container.dataset.loaded === 'true') return;

    try {
        var resp = await fetch('app/pages/pedidos/form_pedidos.html');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var html = await resp.text();
        container.innerHTML = html;
        container.dataset.loaded = 'true';
    } catch (e) {
        console.error('[Pedidos] Falha ao carregar form_pedidos.html:', e);
    }
}

async function _fetchPedidos() {
    if (window.pedidosState.isFetching) return;
    window.pedidosState.isFetching = true;
    _atualizarBotaoLoop(true);
    try {
        var resposta = await API.call('getpedidos');
        var lista = Array.isArray(resposta) ? resposta : [];
        window.AppRDO.pedidosCache = lista;
        window.pedidosState.paginaAtual = 1;
        _renderizarTabela(lista);
    } catch (_) {}
    finally {
        window.pedidosState.isFetching = false;
        _atualizarBotaoLoop(false);
    }
}

window.toggleLoopPedidos = async function () {
    if (window.pedidosState.isFetching) return;
    await _fetchPedidos();
};

function _atualizarBotaoLoop(girando) {
    var icon = document.getElementById('icon-loop-pedidos');
    var btn = document.getElementById('btn-loop-pedidos');
    if (!icon || !btn) return;
    if (girando) {
        icon.classList.add('spinner-rotate');
        btn.disabled = true;
    } else {
        icon.classList.remove('spinner-rotate');
        btn.disabled = false;
    }
}

window.mudarPaginaPedidos = function (dir) {
    var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
    var termo = (document.getElementById('filtro-pedidos')?.value || '').trim().toLowerCase();
    var categoria = window.pedidosState.filtroCategoria || 'todos';
    var filtrada = termo ? cache.filter(function (p) { return _matchFiltro(p, termo, categoria); }) : cache;
    var totalPag = Math.max(1, Math.ceil(filtrada.length / window.pedidosState.itensPorPagina));
    var novaPagina = window.pedidosState.paginaAtual + dir;
    if (novaPagina >= 1 && novaPagina <= totalPag) {
        window.pedidosState.paginaAtual = novaPagina;
        _renderizarTabela(cache);
    }
};

function _atualizarPaginador(totalFiltrado) {
    var info = document.getElementById('info-paginacao-pedidos');
    if (!info) return;
    var totalPag = Math.max(1, Math.ceil(totalFiltrado / window.pedidosState.itensPorPagina));
    info.innerText = 'Pág ' + window.pedidosState.paginaAtual + ' de ' + totalPag;
}

function _bindFiltro() {
    var input = document.getElementById('filtro-pedidos');
    if (!input) return;
    var timer = null;
    input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
            window.pedidosState.paginaAtual = 1;
            var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
            _renderizarTabela(cache);
        }, 200);
    });
}

function _bindFiltroCategoria() {
    var container = document.querySelector('.dropdown-filtro-wrapper');
    if (!container) return;
    var items = container.querySelectorAll('.dropdown-menu .dropdown-item[data-filtro]');
    var label = document.getElementById('filtro-label');
    var input = document.getElementById('filtro-pedidos');

    items.forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            items.forEach(function (el) { el.classList.remove('active'); });
            item.classList.add('active');
            var cat = item.getAttribute('data-filtro');
            window.pedidosState.filtroCategoria = cat;
            if (label) label.textContent = item.textContent.trim();

            var placeholders = {
                todos: 'Buscar...',
                servico: 'Ex: RDO001',
                cliente: 'Nome do cliente...',
                valor: 'Ex: R$ 15,00',
                status: 'Ex: Pendente, Em Rota...'
            };
            if (input) {
                input.placeholder = placeholders[cat] || 'Buscar...';
                input.value = '';
                input.focus();
            }

            var bsDrop = bootstrap.Dropdown.getInstance(document.getElementById('dropdownFiltroCategoria'));
            if (bsDrop) bsDrop.hide();

            window.pedidosState.paginaAtual = 1;
            var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
            _renderizarTabela(cache);
        });
    });
}

function _matchFiltro(p, termo, categoria) {
    var t = termo.toLowerCase();

    if (categoria === 'servico') {
        var idFmt = window.formatarIdServico(p.id);
        return idFmt.toLowerCase().indexOf(t) !== -1 || String(p.id || '').toLowerCase().indexOf(t) !== -1;
    }
    if (categoria === 'cliente') {
        var nome = window.resolverNomeCliente(p);
        return nome.toLowerCase().indexOf(t) !== -1;
    }
    if (categoria === 'valor') {
        return String(p.valor_corrida || '').toLowerCase().indexOf(t) !== -1;
    }
    if (categoria === 'status') {
        var s = String(p.status || '').trim();
        var sp = s.includes('/') ? s.split('/').pop().trim() : s;
        return sp.toLowerCase().indexOf(t) !== -1 || s.toLowerCase().indexOf(t) !== -1;
    }

    var idFmt = window.formatarIdServico(p.id);
    var nomeCliente = window.resolverNomeCliente(p);
    var campos = [
        idFmt, String(p.id || ''), nomeCliente, String(p.solicitante || ''),
        String(p.valor_corrida || ''), String(p.status || ''), String(p.motoboy || ''),
        String(p.mercadoria || ''), String(p.contato || ''), String(p.observacao || '')
    ];
    for (var c of campos) {
        if (c.toLowerCase().indexOf(t) !== -1) return true;
    }
    return false;
}

function _badgeStatus(status) {
    var mapa = {
        'PENDENTE':   { classe: 'bg-status-pending', icon: 'bi-clock' },
        'EM_ROTA':    { classe: 'bg-status-route', icon: 'bi-bicycle' },
        'EM ROTA':    { classe: 'bg-status-route', icon: 'bi-bicycle' },
        'CONCLUIDO':  { classe: 'bg-status-done', icon: 'bi-check-circle' },
        'CONCLUÍDO':  { classe: 'bg-status-done', icon: 'bi-check-circle' },
        'CANCELADO':  { classe: 'bg-status-cancel', icon: 'bi-x-circle' }
    };
    var cfg = mapa[status] || { classe: 'bg-status-default', icon: 'bi-question-circle' };
    return '<span class="status-badge ' + cfg.classe + '"><i class="bi ' + cfg.icon + '"></i> ' + status + '</span>';
}

function _renderizarTabela(lista) {
    var corpo = document.getElementById('corpo-tabela-pedidos');
    if (!corpo) return;

    var termo = (document.getElementById('filtro-pedidos')?.value || '').trim().toLowerCase();
    var categoria = window.pedidosState.filtroCategoria || 'todos';

    var filtrada = termo ? lista.filter(function (p) { return _matchFiltro(p, termo, categoria); }) : lista;

    var totalFiltrada = filtrada.length;
    var totalPag = Math.max(1, Math.ceil(totalFiltrada / window.pedidosState.itensPorPagina));
    if (window.pedidosState.paginaAtual > totalPag) window.pedidosState.paginaAtual = totalPag;

    var inicio = (window.pedidosState.paginaAtual - 1) * window.pedidosState.itensPorPagina;
    var paginada = filtrada.slice(inicio, inicio + window.pedidosState.itensPorPagina);
    _atualizarPaginador(totalFiltrada);

    if (paginada.length === 0) {
        corpo.innerHTML =
            '<tr><td colspan="5" class="text-center text-muted py-4" style="font-size:0.8rem;">' +
            (termo
                ? '<i class="bi bi-search me-1"></i>Nenhum resultado para o filtro.'
                : '<i class="bi bi-inbox d-block mb-1" style="font-size:1.3rem;"></i>Nenhum pedido encontrado.') +
            '</td></tr>';
        return;
    }

    corpo.innerHTML = paginada.map(function (p) {
        var id = String(p.id || '0');
        var idFormatado = window.formatarIdServico(id);
        var solicitante = _resolverSolicitantePorIdChat(p.id_chat) || String(p.solicitante || '—');
        var valor = String(p.valor_corrida || 'R$ 0,00');
        var stPuro = _statusPuro(p);
        var badge = _badgeStatus(stPuro);
        var finalizado = _isFinalizado(p);

        var acoes = '';
        if (finalizado) {
            acoes =
                '<button class="btn btn-light btn-sm" onclick="window.RDO_PEDIDOS.abrirDetalhes(\'' + _esc(id) + '\')" title="Visualizar">' +
                '<i class="bi bi-eye"></i></button>';
        } else {
            acoes =
                '<button class="btn btn-light btn-sm me-1" onclick="window.RDO_PEDIDOS.abrirEdicao(\'' + _esc(id) + '\')" title="Editar">' +
                '<i class="bi bi-pencil-square"></i></button>' +
                '<button class="btn btn-light btn-sm me-1" onclick="window.RDO_PEDIDOS.abrirDetalhes(\'' + _esc(id) + '\')" title="Visualizar">' +
                '<i class="bi bi-eye"></i></button>' +
                '<button class="btn btn-light btn-sm" onclick="window.RDO_PEDIDOS.excluirPedido(\'' + _esc(id) + '\')" title="Excluir">' +
                '<i class="bi bi-trash"></i></button>';
        }

        return '<tr>' +
            '<td class="ps-3 py-2"><span class="pedido-id-label">' + idFormatado + '</span></td>' +
            '<td class="py-2">' + _esc(solicitante) + '</td>' +
            '<td class="py-2">' + _esc(valor) + '</td>' +
            '<td class="py-2">' + badge + '</td>' +
            '<td class="text-end pe-3 py-2">' + acoes + '</td>' +
            '</tr>';
    }).join('');
}

window.RDO_PEDIDOS.abrirDetalhes = function (pedidoId) {
    var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
    var pedido = null;
    for (var i = 0; i < cache.length; i++) {
        if (String(cache[i].id || '').trim() === String(pedidoId).trim()) { pedido = cache[i]; break; }
    }
    if (!pedido) return;

    var solicitante = _resolverSolicitantePorIdChat(pedido.id_chat) || String(pedido.solicitante || '—');

    document.getElementById('detalhe-titulo').textContent = window.formatarIdServico(pedido.id);
    document.getElementById('det-pedido-id').value = window.formatarIdServico(pedido.id);
    document.getElementById('det-solicitante').value = solicitante;
    document.getElementById('det-cliente').value = window.resolverNomeCliente(pedido);
    document.getElementById('det-contato').value = pedido.contato || '—';
    document.getElementById('det-motoboy').value = pedido.motoboy || '—';
    document.getElementById('det-status').value = pedido.status || '—';
    document.getElementById('det-mercadoria').value = pedido.mercadoria || '—';
    document.getElementById('det-de').value = pedido.de || pedido.rota_de || '—';
    document.getElementById('det-para').value = pedido.para || pedido.rota_para || '—';
    document.getElementById('det-retorno').value = pedido.retorno || '—';
    document.getElementById('det-horario').value = pedido.horario || '—';
    document.getElementById('det-prioridade').value = pedido.prioridade || '—';
    document.getElementById('det-valor').value = pedido.valor_corrida || '—';
    document.getElementById('det-id-chat').value = pedido.id_chat || '—';
    document.getElementById('det-obs').value = pedido.observacao || '—';

    var modalEl = document.getElementById('modalPedidoDetalhes');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
};

window.RDO_PEDIDOS.abrirEdicao = function (pedidoId) {
    var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
    var pedido = null;
    for (var i = 0; i < cache.length; i++) {
        if (String(cache[i].id || '').trim() === String(pedidoId).trim()) { pedido = cache[i]; break; }
    }
    if (!pedido) {
        Swal.fire({ icon: 'warning', title: 'Não encontrado', text: 'Pedido não localizado.', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
        return;
    }

    if (_isFinalizado(pedido)) {
        Swal.fire({ icon: 'info', title: 'Pedido finalizado', html: '<div style="font-size:0.9rem;">Pedidos concluídos ou cancelados não podem ser editados.</div>', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
        return;
    }

    var setVal = function (id, val) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') {
            for (var i = 0; i < el.options.length; i++) {
                if (el.options[i].value === val || el.options[i].text === val) { el.selectedIndex = i; return; }
            }
            el.value = val || '';
        } else {
            el.value = val || '';
        }
    };

    var tituloEl = document.getElementById('editar-titulo');
    if (tituloEl) tituloEl.textContent = window.formatarIdServico(pedido.id);

    var errDiv = document.getElementById('edit-error-msg');
    if (errDiv) errDiv.classList.add('d-none');

    document.getElementById('edit-pedido-id').value = pedido.id || '';

    var solicitante = _resolverSolicitantePorIdChat(pedido.id_chat) || String(pedido.solicitante || '');
    setVal('edit-solicitante', solicitante);
    setVal('edit-contato', pedido.contato);
    setVal('edit-mercadoria', pedido.mercadoria);
    setVal('edit-horario', pedido.horario);
    setVal('edit-retorno', pedido.retorno);
    setVal('edit-prioridade', pedido.prioridade);

    var de = String(pedido.de || pedido.rota_de || '').trim();
    var para = String(pedido.para || pedido.rota_para || '').trim();
    var rotasTexto = de && para ? de + ' | ' + para : de || para || '';
    setVal('edit-rotas', rotasTexto);
    setVal('edit-obs', pedido.observacao);

    var modalEl = document.getElementById('modalEditarPedido');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
};

window.RDO_PEDIDOS.salvarEdicao = async function () {
    var btn = document.getElementById('btn-salvar-edicao');
    var errDiv = document.getElementById('edit-error-msg');

    try {
        var id = document.getElementById('edit-pedido-id').value;
        if (!id) return;

        var getVal = function (elId) {
            var el = document.getElementById(elId);
            return (el?.value || '').trim();
        };

        var solicitante = getVal('edit-solicitante');
        if (!solicitante) {
            if (errDiv) { errDiv.textContent = 'O campo SOLICITANTE é obrigatório.'; errDiv.classList.remove('d-none'); }
            document.getElementById('edit-solicitante')?.focus();
            return;
        }

        if (errDiv) errDiv.classList.add('d-none');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...'; }

        var payload = {
            id: id,
            solicitante: solicitante,
            contato: getVal('edit-contato'),
            mercadoria: getVal('edit-mercadoria'),
            horario: getVal('edit-horario'),
            retorno: getVal('edit-retorno'),
            prioridade: getVal('edit-prioridade'),
            rotas_texto: getVal('edit-rotas'),
            observacao: getVal('edit-obs')
        };

        var resp = await API.call('updatepedido', payload);

        if (resp?.status === 'success') {
            var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
            var pedido = null;
            for (var i = 0; i < cache.length; i++) {
                if (String(cache[i].id) === String(id)) { pedido = cache[i]; break; }
            }
            if (pedido) {
                pedido.solicitante = payload.solicitante;
                pedido.contato = payload.contato;
                pedido.mercadoria = payload.mercadoria;
                pedido.horario = payload.horario;
                pedido.retorno = payload.retorno;
                pedido.prioridade = payload.prioridade;
                pedido.observacao = payload.observacao;
            }
            _renderizarTabela(cache);

            var modalEl = document.getElementById('modalEditarPedido');
            if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

            Swal.fire({ icon: 'success', title: 'Salvo!', text: 'Pedido atualizado com sucesso.', timer: 2000, timerProgressBar: true, confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
        } else {
            throw new Error(resp?.message || 'Erro ao salvar.');
        }
    } catch (e) {
        if (errDiv) { errDiv.textContent = 'Erro: ' + (e.message || ''); errDiv.classList.remove('d-none'); }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = 'SALVAR'; }
    }
};

window.RDO_PEDIDOS.excluirPedido = async function (pedidoId) {
    if (!pedidoId) return;

    var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
    var pedido = null;
    for (var i = 0; i < cache.length; i++) {
        if (String(cache[i].id || '').trim() === String(pedidoId).trim()) { pedido = cache[i]; break; }
    }

    if (pedido && _isFinalizado(pedido)) {
        Swal.fire({ icon: 'info', title: 'Pedido finalizado', html: '<div style="font-size:0.9rem;">Pedidos concluídos ou cancelados não podem ser excluídos.</div>', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
        return;
    }

    var idFormatado = window.formatarIdServico(pedidoId);

    var result = await Swal.fire({
        icon: 'warning',
        title: 'Excluir Pedido?',
        html: '<div style="font-size:0.9rem;color:#555;">O pedido <strong class="text-danger">' + idFormatado + '</strong> será removido permanentemente.</div>',
        showCancelButton: true,
        confirmButtonText: 'Sim, Excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        customClass: { popup: 'rounded-4', confirmButton: 'rounded-3', cancelButton: 'rounded-3' }
    });

    if (!result.isConfirmed) return;

    Swal.fire({ title: 'Excluindo...', allowOutsideClick: false, allowEscapeKey: false, didOpen: function () { Swal.showLoading(); } });

    try {
        var resp = await API.call('deletepedido', { id: pedidoId });

        if (resp?.status === 'success') {
            window.AppRDO.pedidosCache = cache.filter(function (p) {
                return String(p.id || '').trim() !== String(pedidoId).trim();
            });
            _renderizarTabela(window.AppRDO.pedidosCache);
            Swal.fire({ icon: 'success', title: 'Excluído!', text: 'Pedido removido com sucesso.', timer: 2000, timerProgressBar: true, confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
        } else {
            throw new Error(resp?.message || 'Erro na exclusão.');
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível excluir: ' + (e.message || ''), confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
    }
};

window.RDO_PEDIDOS.abrirFormNovo = function () {
    var errDiv = document.getElementById('novo-error-msg');
    if (errDiv) errDiv.classList.add('d-none');

    var chatAtivo = window.AppRDO?.chatAtivo || window.chatAtivo || null;
    var idChat = '';
    var nomeSolicitante = '';

    if (chatAtivo) {
        idChat = String(chatAtivo.id_chat || chatAtivo.id || '').trim();
        nomeSolicitante = _resolverSolicitantePorIdChat(idChat) || String(chatAtivo.nome || chatAtivo.name || chatAtivo.pushname || '');
    }

    document.getElementById('novo-id-chat').value = idChat;
    document.getElementById('novo-solicitante').value = nomeSolicitante;
    document.getElementById('novo-contato').value = '';
    document.getElementById('novo-obs').value = '';
    document.getElementById('novo-rotas').value = '';
    document.getElementById('novo-horario').value = '';

    var mercSel = document.getElementById('novo-mercadoria');
    if (mercSel) mercSel.selectedIndex = 0;
    var retSel = document.getElementById('novo-retorno');
    if (retSel) retSel.selectedIndex = 0;
    var prioSel = document.getElementById('novo-prioridade');
    if (prioSel) prioSel.selectedIndex = 0;

    var modalEl = document.getElementById('modalNovoPedido');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
};

window.RDO_PEDIDOS.salvarNovo = async function () {
    var btn = document.getElementById('btn-salvar-novo');
    var errDiv = document.getElementById('novo-error-msg');

    try {
        var getVal = function (elId) {
            var el = document.getElementById(elId);
            return (el?.value || '').trim();
        };

        var solicitante = getVal('novo-solicitante');
        var idChat = getVal('novo-id-chat');

        if (!solicitante) {
            if (errDiv) { errDiv.textContent = 'Selecione um chat para definir o solicitante.'; errDiv.classList.remove('d-none'); }
            return;
        }

        if (errDiv) errDiv.classList.add('d-none');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Criando...'; }

        var payload = {
            id_chat: idChat,
            solicitante: solicitante,
            contato: getVal('novo-contato'),
            mercadoria: getVal('novo-mercadoria'),
            horario: getVal('novo-horario'),
            retorno: getVal('novo-retorno'),
            prioridade: getVal('novo-prioridade'),
            rotas_texto: getVal('novo-rotas'),
            observacao: getVal('novo-obs')
        };

        var resp = await API.call('createpedido', payload);

        if (resp?.status === 'success') {
            var modalEl = document.getElementById('modalNovoPedido');
            if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

            await _fetchPedidos();

            Swal.fire({ icon: 'success', title: 'Criado!', text: 'Pedido criado com sucesso.', timer: 2000, timerProgressBar: true, confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
        } else {
            throw new Error(resp?.message || 'Erro ao criar pedido.');
        }
    } catch (e) {
        if (errDiv) { errDiv.textContent = 'Erro: ' + (e.message || ''); errDiv.classList.remove('d-none'); }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = 'CRIAR PEDIDO'; }
    }
};

window.RDO_PEDIDOS.preencherSolicitanteDoChat = function (idChat, nome) {
    var inputSolic = document.getElementById('novo-solicitante');
    var inputIdChat = document.getElementById('novo-id-chat');
    if (inputSolic) inputSolic.value = nome || '';
    if (inputIdChat) inputIdChat.value = idChat || '';
};

(async function _init() {
    await _carregarModaisPedidos();
    _bindFiltro();
    _bindFiltroCategoria();
    _fetchPedidos();
})();
