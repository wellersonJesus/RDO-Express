/* ============================================
   MÓDULO: Pedidos – Lógica Completa
   ============================================ */

/* ─── Estado Global ─── */

window.pedidosState = {
    isFetching: false,
    filtroCategoria: 'todos',
    paginaAtual: 1,
    itensPorPagina: 20
};

/* ─── Utilitário: Escape HTML ─── */

function _esc(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ─── Formatação do ID de Serviço ─── */

window.formatarIdServico = function (id) {
    try {
        var num = parseInt(String(id || '0').replace(/\D/g, ''), 10);
        if (isNaN(num)) num = 0;
        return 'RDO' + String(num).padStart(3, '0');
    } catch (_) {
        return 'RDO000';
    }
};

/* ─── Resolver Nome do Cliente pelo id_chat ─── */

window.resolverNomeCliente = function (pedido) {
    try {
        var idChat = String(pedido.id_chat || '').trim();
        if (!idChat) return String(pedido.solicitante || '—');

        // 1. Cache de clientes (AppRDO ou adminState)
        var clientes = [];
        if (Array.isArray(window.AppRDO?.clientesCache)) {
            clientes = window.AppRDO.clientesCache;
        } else if (Array.isArray(window.adminState?.dados)) {
            clientes = window.adminState.dados;
        }

        for (var i = 0; i < clientes.length; i++) {
            var c = clientes[i];
            var cId = String(c.id_chat || c.id || '').trim();
            if (cId === idChat) {
                return String(c.nome || c.name || c.solicitante || '—');
            }
        }

        // 2. Cache de contatos
        if (window.AppRDO?.contatosCache) {
            var contato = window.AppRDO.contatosCache[idChat];
            if (contato) {
                return String(contato.nome || contato.name || contato.pushname || '—');
            }
        }

        // 3. Cache de chats
        if (window.AppRDO?.chatsCache) {
            for (var j = 0; j < window.AppRDO.chatsCache.length; j++) {
                var chat = window.AppRDO.chatsCache[j];
                var chatId = String(chat.id || chat.id_chat || '').trim();
                if (chatId === idChat) {
                    return String(chat.nome || chat.name || chat.pushname || '—');
                }
            }
        }

        // Fallback
        return String(pedido.solicitante || '—');
    } catch (_) {
        return String(pedido.solicitante || '—');
    }
};

/* ─── Inicialização ─── */

window.initPedidos = async function () {
    try {
        await _fetchPedidos();
        _bindFiltro();
        _bindFiltroCategoria();
    } catch (_) {}
};

/* ─── Fetch / Reload de Pedidos ─── */

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
    } catch (_) {} finally {
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

/* ─── Paginação (Modelo Admin) ─── */

window.mudarPaginaPedidos = function (dir) {
    var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];

    // Aplica filtro para calcular total de páginas corretamente
    var filtroInput = document.getElementById('filtro-pedidos');
    var termo = (filtroInput?.value || '').trim().toLowerCase();
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
    var infoPag = document.getElementById('info-paginacao-pedidos');
    if (!infoPag) return;
    var totalPag = Math.max(1, Math.ceil(totalFiltrado / window.pedidosState.itensPorPagina));
    infoPag.innerText = 'Pág ' + window.pedidosState.paginaAtual + ' de ' + totalPag;
}

/* ─── Filtro: Bind do Input ─── */

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

/* ─── Filtro: Bind do Dropdown de Categorias ─── */

function _bindFiltroCategoria() {
    var menuContainer = document.querySelector('.dropdown-filtro-wrapper');
    if (!menuContainer) return;

    var items = menuContainer.querySelectorAll('.dropdown-menu .dropdown-item[data-filtro]');
    var label = document.getElementById('filtro-label');
    var input = document.getElementById('filtro-pedidos');

    items.forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Marca item ativo
            items.forEach(function (el) { el.classList.remove('active'); });
            item.classList.add('active');

            // Atualiza estado
            var cat = item.getAttribute('data-filtro');
            window.pedidosState.filtroCategoria = cat;
            window.pedidosState.paginaAtual = 1;

            // Atualiza label do botão
            if (label) label.textContent = item.textContent.trim();

            // Atualiza placeholder
            var placeholders = {
                todos:   'Buscar...',
                servico: 'Ex: RDO001',
                cliente: 'Nome do cliente...',
                valor:   'Ex: R$ 15,00',
                status:  'Ex: Pendente, Em Rota...'
            };
            if (input) {
                input.placeholder = placeholders[cat] || 'Buscar...';
                input.value = '';
                input.focus();
            }

            // Fecha o dropdown manualmente (Bootstrap 5)
            var dropdownBtn = document.getElementById('dropdownFiltroCategoria');
            if (dropdownBtn) {
                var bsDropdown = bootstrap.Dropdown.getInstance(dropdownBtn);
                if (bsDropdown) bsDropdown.hide();
            }

            // Re-renderiza
            var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
            _renderizarTabela(cache);
        });
    });
}

/* ─── Filtro: Match por Categoria ─── */

function _matchFiltro(pedido, termo, categoria) {
    if (categoria === 'servico') {
        var idFormatado = window.formatarIdServico(pedido.id);
        return idFormatado.toLowerCase().indexOf(termo) !== -1 ||
               String(pedido.id || '').toLowerCase().indexOf(termo) !== -1;
    }

    if (categoria === 'cliente') {
        var nomeCliente = window.resolverNomeCliente(pedido);
        return nomeCliente.toLowerCase().indexOf(termo) !== -1;
    }

    if (categoria === 'valor') {
        return String(pedido.valor_corrida || '').toLowerCase().indexOf(termo) !== -1;
    }

    if (categoria === 'status') {
        var statusBruto = String(pedido.status || '').trim();
        var statusPuro = statusBruto.includes('/')
            ? statusBruto.split('/').pop().trim()
            : statusBruto;
        return statusPuro.toLowerCase().indexOf(termo) !== -1 ||
               statusBruto.toLowerCase().indexOf(termo) !== -1;
    }

    // "todos" — busca em todos os campos
    var idFmt = window.formatarIdServico(pedido.id);
    var nome = window.resolverNomeCliente(pedido);
    var campos = [
        idFmt,
        String(pedido.id || ''),
        nome,
        String(pedido.solicitante || ''),
        String(pedido.valor_corrida || ''),
        String(pedido.status || ''),
        String(pedido.motoboy || ''),
        String(pedido.mercadoria || ''),
        String(pedido.contato || ''),
        String(pedido.observacao || '')
    ];
    for (var i = 0; i < campos.length; i++) {
        if (campos[i].toLowerCase().indexOf(termo) !== -1) return true;
    }
    return false;
}

/* ─── Badge de Status ─── */

function _badgeStatus(status) {
    var mapa = {
        'PENDENTE':   { classe: 'bg-status-pending', icon: 'bi-clock' },
        'EM_ROTA':    { classe: 'bg-status-route',   icon: 'bi-bicycle' },
        'EM ROTA':    { classe: 'bg-status-route',   icon: 'bi-bicycle' },
        'CONCLUIDO':  { classe: 'bg-status-done',    icon: 'bi-check-circle' },
        'CONCLUÍDO':  { classe: 'bg-status-done',    icon: 'bi-check-circle' },
        'CANCELADO':  { classe: 'bg-status-cancel',  icon: 'bi-x-circle' }
    };

    var cfg = mapa[status] || { classe: 'bg-status-default', icon: 'bi-question-circle' };
    var label = status.replace(/_/g, ' ');

    return '<span class="status-badge ' + cfg.classe + '">' +
        '<i class="bi ' + cfg.icon + '"></i> ' + label + '</span>';
}

/* ─── Renderização da Tabela (com Paginação) ─── */

function _renderizarTabela(lista) {
    var corpo = document.getElementById('corpo-tabela-pedidos');
    if (!corpo) return;

    var filtroInput = document.getElementById('filtro-pedidos');
    var termo = (filtroInput?.value || '').trim().toLowerCase();
    var categoria = window.pedidosState.filtroCategoria || 'todos';

    // 1. Filtra
    var filtrada = termo ? lista.filter(function (p) { return _matchFiltro(p, termo, categoria); }) : lista;

    // 2. Atualiza paginador
    _atualizarPaginador(filtrada.length);

    // 3. Pagina
    var inicio = (window.pedidosState.paginaAtual - 1) * window.pedidosState.itensPorPagina;
    var paginada = filtrada.slice(inicio, inicio + window.pedidosState.itensPorPagina);

    // 4. Vazio
    if (paginada.length === 0) {
        corpo.innerHTML =
            '<tr><td colspan="5" class="text-center text-muted py-4" style="font-size:0.8rem;">' +
            (termo
                ? '<i class="bi bi-search me-1"></i>Nenhum resultado para o filtro.'
                : '<i class="bi bi-inbox d-block mb-1" style="font-size:1.3rem;"></i>Nenhum pedido encontrado.') +
            '</td></tr>';
        return;
    }

    // 5. Monta linhas — Botões no modelo Admin: btn btn-light btn-sm
    corpo.innerHTML = paginada.map(function (p) {
        var id = String(p.id || '0');
        var idFormatado = window.formatarIdServico(id);
        var nomeCliente = window.resolverNomeCliente(p);
        var valor = String(p.valor_corrida || 'R$ 0,00');
        var statusBruto = String(p.status || 'PENDENTE').trim();
        var statusPuro = statusBruto.includes('/')
            ? statusBruto.split('/').pop().trim().toUpperCase()
            : statusBruto.toUpperCase();
        var badge = _badgeStatus(statusPuro);

        return '<tr>' +
            '<td class="ps-3 py-2"><span class="pedido-id-label">' + idFormatado + '</span></td>' +
            '<td class="py-2">' + _esc(nomeCliente) + '</td>' +
            '<td class="py-2">' + _esc(valor) + '</td>' +
            '<td class="py-2">' + badge + '</td>' +
            '<td class="text-end pe-3 py-2">' +
                '<button class="btn btn-light btn-sm me-1" onclick="window.RDO_PEDIDOS.abrirEdicao(\'' + _esc(id) + '\')" title="Editar">' +
                    '<i class="bi bi-pencil-square"></i>' +
                '</button>' +
                '<button class="btn btn-light btn-sm me-1" onclick="window.RDO_PEDIDOS.abrirDetalhes(\'' + _esc(id) + '\')" title="Visualizar">' +
                    '<i class="bi bi-eye"></i>' +
                '</button>' +
                '<button class="btn btn-light btn-sm" onclick="window.RDO_PEDIDOS.excluirPedido(\'' + _esc(id) + '\')" title="Excluir">' +
                    '<i class="bi bi-trash"></i>' +
                '</button>' +
            '</td>' +
            '</tr>';
    }).join('');
}

/* ============================================
   NAMESPACE RDO_PEDIDOS – CRUD COMPLETO
   ============================================ */

window.RDO_PEDIDOS = window.RDO_PEDIDOS || {};

/* ─── Helpers Externos ─── */

window.RDO_PEDIDOS.atualizarStatusLocal = function (pedidoId, statusFormatado, motoboyNome) {
    try {
        var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var pedido = cache.find(function (p) {
            return String(p.id || '').trim() === String(pedidoId).trim();
        });
        if (pedido) {
            pedido.status = statusFormatado;
            if (motoboyNome) pedido.motoboy = motoboyNome;
        }
        _renderizarTabela(cache);
    } catch (_) {}
};

window.RDO_PEDIDOS.adicionarPedidoLocal = function (novoPedido) {
    try {
        if (!novoPedido || !novoPedido.id) return;
        var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var existe = false;
        for (var i = 0; i < cache.length; i++) {
            if (String(cache[i].id).trim() === String(novoPedido.id).trim()) {
                existe = true;
                break;
            }
        }
        if (!existe) {
            cache.unshift(novoPedido);
            window.AppRDO.pedidosCache = cache;
        }
        _renderizarTabela(cache);
    } catch (_) {}
};

/* ─── Abrir Detalhes (Read-Only) ─── */

window.RDO_PEDIDOS.abrirDetalhes = function (pedidoId) {
    try {
        var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var pedido = null;

        for (var i = 0; i < cache.length; i++) {
            if (String(cache[i].id || '').trim() === String(pedidoId).trim()) {
                pedido = cache[i];
                break;
            }
        }

        if (!pedido) {
            Swal.fire({
                icon: 'warning',
                title: 'Não encontrado',
                text: 'Pedido não localizado na base.',
                confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
            return;
        }

        var statusBruto = String(pedido.status || '').trim();
        var statusPuro = statusBruto.includes('/')
            ? statusBruto.split('/').pop().trim()
            : statusBruto;
        var motoboyNome = String(pedido.motoboy || '').trim();
        if (!motoboyNome && statusBruto.includes('/')) {
            motoboyNome = statusBruto.split('/')[0].trim();
        }

        var nomeCliente = window.resolverNomeCliente(pedido);

        var prioridadeLabel = 'Normal';
        var pVal = String(pedido.prioridade || '0').trim();
        if (pVal === '7') prioridadeLabel = 'Urgente';
        if (pVal === '5') prioridadeLabel = 'Agendado';

        var setVal = function (id, val) {
            var el = document.getElementById(id);
            if (el) el.value = val || '—';
        };

        var tituloEl = document.getElementById('detalhe-titulo');
        if (tituloEl) tituloEl.textContent = window.formatarIdServico(pedido.id);

        setVal('det-pedido-id', window.formatarIdServico(pedido.id));
        setVal('det-cliente', nomeCliente);
        setVal('det-solicitante', pedido.solicitante);
        setVal('det-contato', pedido.contato);
        setVal('det-motoboy', motoboyNome || '—');
        setVal('det-status', statusPuro);
        setVal('det-mercadoria', pedido.mercadoria);
        setVal('det-de', pedido.de);
        setVal('det-para', pedido.para);
        setVal('det-retorno', pedido.retorno);
        setVal('det-horario', pedido.horario);
        setVal('det-prioridade', prioridadeLabel);
        setVal('det-valor', pedido.valor_corrida);
        setVal('det-id-chat', pedido.id_chat);
        setVal('det-obs', pedido.observacao);

        var modalEl = document.getElementById('modalPedidoDetalhes');
        if (modalEl) {
            var bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            bsModal.show();
        }
    } catch (e) {
        console.warn('[Pedidos] Erro ao abrir detalhes:', e);
    }
};

/* ─── Abrir Edição ─── */

window.RDO_PEDIDOS.abrirEdicao = function (pedidoId) {
    try {
        var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var pedido = null;

        for (var i = 0; i < cache.length; i++) {
            if (String(cache[i].id || '').trim() === String(pedidoId).trim()) {
                pedido = cache[i];
                break;
            }
        }

        if (!pedido) {
            Swal.fire({
                icon: 'warning',
                title: 'Não encontrado',
                text: 'Pedido não localizado na base.',
                confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
            return;
        }

        var statusBruto = String(pedido.status || '').trim();
        var statusPuro = statusBruto.includes('/')
            ? statusBruto.split('/').pop().trim().toUpperCase()
            : statusBruto.toUpperCase();

        if (statusPuro === 'CONCLUIDO' || statusPuro === 'CONCLUÍDO' || statusPuro === 'CANCELADO') {
            Swal.fire({
                icon: 'info',
                title: 'Pedido finalizado',
                html: '<div style="font-size:0.9rem;">Pedidos concluídos ou cancelados não podem ser editados.</div>',
                confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
            return;
        }

        var setVal = function (id, val) {
            var el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'SELECT') {
                for (var i = 0; i < el.options.length; i++) {
                    if (el.options[i].value === val || el.options[i].text === val) {
                        el.selectedIndex = i;
                        return;
                    }
                }
                el.value = val || '';
            } else {
                el.value = val || '';
            }
        };

        var tituloEl = document.getElementById('editar-titulo');
        if (tituloEl) tituloEl.textContent = window.formatarIdServico(pedido.id);

        var errorMsg = document.getElementById('edit-error-msg');
        if (errorMsg) errorMsg.classList.add('d-none');

        document.getElementById('edit-pedido-id').value = pedido.id || '';

        setVal('edit-solicitante', pedido.solicitante);
        setVal('edit-contato', pedido.contato);
        setVal('edit-mercadoria', pedido.mercadoria);
        setVal('edit-horario', pedido.horario);
        setVal('edit-retorno', pedido.retorno);
        setVal('edit-prioridade', pedido.prioridade);

        var rotaTexto = '';
        var de = String(pedido.de || '').trim();
        var para = String(pedido.para || '').trim();
        if (de && para) {
            rotaTexto = de + ' | ' + para;
        } else if (de) {
            rotaTexto = de;
        }
        setVal('edit-rotas', rotaTexto);
        setVal('edit-obs', pedido.observacao);

        var modalEl = document.getElementById('modalEditarPedido');
        if (modalEl) {
            var bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            bsModal.show();
        }
    } catch (e) {
        console.warn('[Pedidos] Erro ao abrir edição:', e);
    }
};

/* ─── Salvar Edição ─── */

window.RDO_PEDIDOS.salvarEdicao = async function () {
    var btn = document.getElementById('btn-salvar-edicao');
    var errorMsg = document.getElementById('edit-error-msg');

    try {
        var pedidoId = document.getElementById('edit-pedido-id')?.value;
        if (!pedidoId) return;

        var getVal = function (id) {
            var el = document.getElementById(id);
            return (el?.value || '').trim();
        };

        var solicitante = getVal('edit-solicitante');
        if (!solicitante) {
            if (errorMsg) {
                errorMsg.textContent = 'O campo SOLICITANTE é obrigatório.';
                errorMsg.classList.remove('d-none');
            }
            document.getElementById('edit-solicitante')?.focus();
            return;
        }

        if (errorMsg) errorMsg.classList.add('d-none');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
        }

        var payload = {
            id: pedidoId,
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
            var pedido = cache.find(function (p) {
                return String(p.id || '').trim() === String(pedidoId).trim();
            });
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
            if (modalEl) {
                var bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();
            }

            Swal.fire({
                icon: 'success',
                title: 'Salvo!',
                text: 'Pedido atualizado com sucesso.',
                timer: 2000,
                timerProgressBar: true,
                confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
        } else {
            throw new Error(resp?.message || 'Erro ao salvar.');
        }
    } catch (e) {
        if (errorMsg) {
            errorMsg.textContent = 'Erro: ' + (e.message || 'Não foi possível salvar.');
            errorMsg.classList.remove('d-none');
        }
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Não foi possível salvar: ' + (e.message || 'Erro desconhecido'),
            confirmButtonColor: '#dc3545',
            customClass: { popup: 'rounded-4' }
        });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'SALVAR';
        }
    }
};

/* ─── Excluir Pedido ─── */

window.RDO_PEDIDOS.excluirPedido = async function (pedidoId) {
    try {
        if (!pedidoId) return;

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

        Swal.fire({
            title: 'Excluindo...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: function () { Swal.showLoading(); }
        });

        var resp = await API.call('deletepedido', { id: pedidoId });

        if (resp?.status === 'success') {
            var cache = Array.isArray(window.AppRDO?.pedidosCache) ? window.AppRDO.pedidosCache : [];
            window.AppRDO.pedidosCache = cache.filter(function (p) {
                return String(p.id || '').trim() !== String(pedidoId).trim();
            });
            _renderizarTabela(window.AppRDO.pedidosCache);

            Swal.fire({
                icon: 'success',
                title: 'Excluído!',
                text: 'Pedido removido com sucesso.',
                timer: 2000,
                timerProgressBar: true,
                confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
        } else {
            throw new Error(resp?.message || 'Erro na exclusão.');
        }
    } catch (e) {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Não foi possível excluir: ' + (e.message || 'Erro desconhecido'),
            confirmButtonColor: '#dc3545',
            customClass: { popup: 'rounded-4' }
        });
    }
};
