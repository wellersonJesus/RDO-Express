(function () {

    window.RDO_PEDIDOS = window.RDO_PEDIDOS || {};

    window.pedidosState = {
        isFetching: false,
        filtroCategoria: 'todos',
        filtroStatus: 'todos',
        filtroData: '',
        paginaAtual: 1,
        itensPorPagina: 15,
        modaisCarregados: false
    };

    window.AppRDO = window.AppRDO || {};
    window.AppRDO.chatsCache = window.AppRDO.chatsCache || [];

    var els = {};

    function bind() {
        els.corpo = document.getElementById('corpo-tabela-pedidos');
        els.filtro = document.getElementById('filtro-pedidos');
        els.filtroData = document.getElementById('filtro-data-pedidos');
        els.syncIcon = document.getElementById('icon-loop-pedidos');
        els.btnSync = document.getElementById('btn-loop-pedidos');
        els.infoPag = document.getElementById('info-paginacao-pedidos');
        els.btnPrev = document.getElementById('btn-pag-prev-pedidos');
        els.btnNext = document.getElementById('btn-pag-next-pedidos');
        els.btnFiltro = document.getElementById('btn-filtro-tipo');
        els.modalContainer = document.getElementById('modal-pedidos-container');
    }

    function _esc(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function _escAttr(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
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

    function _parseCurrency(str) {
        if (!str) return 0;
        var limpo = String(str).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        var val = parseFloat(limpo);
        return isNaN(val) ? 0 : val;
    }

    function _formatCurrency(val) {
        return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function _formatarHorario(valor) {
        if (!valor) return '';
        var s = String(valor).trim();
        if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
        if (/^\d{2}:\d{2}$/.test(s)) return s + ':00';
        var d = new Date(s);
        if (!isNaN(d.getTime())) {
            return String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0') + ':' +
                String(d.getSeconds()).padStart(2, '0');
        }
        return s;
    }

    function _resolverValorBase(pedido) {
        var candidatos = [
            pedido.valor_base,
            pedido.valor,
            pedido.valor_corrida,
            pedido.valor_frete,
            pedido.preco,
            pedido.total
        ];
        for (var i = 0; i < candidatos.length; i++) {
            var v = _parseCurrency(candidatos[i]);
            if (v > 0) {
                if (candidatos[i] === pedido.valor_corrida) {
                    var taxa = _parseCurrency(pedido.taxa_espera || '0');
                    var base = v - taxa;
                    return base > 0 ? base : v;
                }
                return v;
            }
        }
        return 0;
    }

    function _calcularTaxaEspera(tipo, minutos) {
        var franquia = 10;
        var tarifaMin = 0.60;
        var min = parseFloat(minutos) || 0;
        if (!tipo || tipo === 'sem_espera') return 0;
        if (tipo === 'ambos') {
            return parseFloat((Math.max(0, min - franquia) * 2 * tarifaMin).toFixed(2));
        }
        return parseFloat((Math.max(0, min - franquia) * tarifaMin).toFixed(2));
    }

    function _buscarDataNoChatCache(pedidoId) {
        var id = String(pedidoId || '').trim();
        if (!id) return '';
        var chats = Array.isArray(window.AppRDO.chatsCache) ? window.AppRDO.chatsCache : [];
        for (var i = 0; i < chats.length; i++) {
            if (String(chats[i].pedido_id || '').trim() === id) return String(chats[i].data || '').trim();
        }
        return '';
    }

    function _extrairDataPedido(pedido) {
        var raw = _buscarDataNoChatCache(pedido.id);
        if (!raw) return '';
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
        if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
            var p = raw.substring(0, 10).split('/');
            return p[2] + '-' + p[1] + '-' + p[0];
        }
        var parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) {
            return parsed.getFullYear() + '-' +
                String(parsed.getMonth() + 1).padStart(2, '0') + '-' +
                String(parsed.getDate()).padStart(2, '0');
        }
        return '';
    }

    function _formatarDataExibicao(isoDate) {
        if (!isoDate || isoDate.length < 10) return '—';
        var p = isoDate.substring(0, 10).split('-');
        if (p.length !== 3) return '—';
        return p[2] + '/' + p[1] + '/' + p[0];
    }

    window.resolverNomeCliente = function (pedido) {
        try {
            var idChat = String(pedido.id_chat || pedido.id_cliente || '').trim();
            if (!idChat) return String(pedido.solicitante || '—');
            var clientes = [];
            if (Array.isArray(window.AppRDO && window.AppRDO.clientesCache)) clientes = window.AppRDO.clientesCache;
            else if (window.adminState && Array.isArray(window.adminState.dados)) clientes = window.adminState.dados;
            for (var i = 0; i < clientes.length; i++) {
                var c = clientes[i];
                var cId = String(c.id_chat || c.id || '').trim();
                if (cId === idChat) return String(c.nome || c.name || c.username || c.solicitante || '—');
            }
            if (window.AppRDO && window.AppRDO.contatosCache) {
                var ct = window.AppRDO.contatosCache[idChat];
                if (ct) return String(ct.nome || ct.name || ct.pushname || '—');
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
            if (Array.isArray(window.AppRDO && window.AppRDO.clientesCache)) clientes = window.AppRDO.clientesCache;
            else if (window.adminState && Array.isArray(window.adminState.dados)) clientes = window.adminState.dados;
            for (var i = 0; i < clientes.length; i++) {
                var c = clientes[i];
                var cId = String(c.id_chat || c.id || '').trim();
                if (cId === id) return String(c.nome || c.name || c.username || c.solicitante || '');
            }
            if (window.AppRDO && window.AppRDO.contatosCache) {
                var ct = window.AppRDO.contatosCache[id];
                if (ct) return String(ct.nome || ct.name || ct.pushname || '');
            }
            return '';
        } catch (_) {
            return '';
        }
    }

    function _statusPuro(pedido) {
        var s = String(pedido.status || 'PENDENTE').trim();
        return (s.indexOf('/') !== -1 ? s.split('/').pop().trim() : s).toUpperCase();
    }

    function _isFinalizado(pedido) {
        var s = _statusPuro(pedido);
        return s === 'CONCLUIDO' || s === 'CONCLUÍDO' || s === 'CANCELADO';
    }

    function _badgeStatus(status) {
        var mapa = {
            'PENDENTE': { classe: 'bg-status-pending', icon: 'bi-clock' },
            'EM_ROTA': { classe: 'bg-status-route', icon: 'bi-bicycle' },
            'EM ROTA': { classe: 'bg-status-route', icon: 'bi-bicycle' },
            'CONCLUIDO': { classe: 'bg-status-done', icon: 'bi-check-circle' },
            'CONCLUÍDO': { classe: 'bg-status-done', icon: 'bi-check-circle' },
            'CANCELADO': { classe: 'bg-status-cancel', icon: 'bi-x-circle' }
        };
        var cfg = mapa[status] || { classe: 'bg-status-default', icon: 'bi-question-circle' };
        return '<span class="status-badge ' + cfg.classe + '"><i class="bi ' + cfg.icon + '"></i> ' + status + '</span>';
    }

    function spinOn() {
        if (els.btnSync) { els.btnSync.classList.add('syncing'); els.btnSync.disabled = true; }
        if (els.syncIcon) els.syncIcon.classList.add('spinner-rotate');
    }

    function spinOff() {
        if (els.btnSync) { els.btnSync.classList.remove('syncing'); els.btnSync.disabled = false; }
        if (els.syncIcon) els.syncIcon.classList.remove('spinner-rotate');
    }

    function mostrarLoading() {
        if (!els.corpo) return;
        els.corpo.innerHTML =
            '<tr><td colspan="5" class="text-center text-muted py-4">' +
            '<div class="spinner-border spinner-border-sm text-danger opacity-50"></div>' +
            '<div class="mt-2 pedidos-loading-text">Buscando pedidos<span class="pedidos-dots"></span></div>' +
            '</td></tr>';
    }

    function _atualizarPaginador(totalFiltrado) {
        var totalPag = Math.max(1, Math.ceil(totalFiltrado / window.pedidosState.itensPorPagina));
        if (els.infoPag) els.infoPag.innerText = 'Pág ' + window.pedidosState.paginaAtual + ' de ' + totalPag;
        if (els.btnPrev) els.btnPrev.disabled = window.pedidosState.paginaAtual <= 1;
        if (els.btnNext) els.btnNext.disabled = window.pedidosState.paginaAtual >= totalPag;
    }

    function _matchFiltroStatus(pedido, sf) {
        if (!sf || sf === 'todos') return true;
        var s = _statusPuro(pedido);
        if (sf === 'CONCLUIDO') return s === 'CONCLUIDO' || s === 'CONCLUÍDO';
        if (sf === 'EM ROTA') return s === 'EM ROTA' || s === 'EM_ROTA';
        return s === sf;
    }

    function _matchFiltroPorCategoria(p, termo, categoria) {
        var t = termo.toLowerCase();
        if (!t) return true;
        if (categoria === 'servico') {
            return window.formatarIdServico(p.id).toLowerCase().indexOf(t) !== -1 ||
                String(p.id || '').toLowerCase().indexOf(t) !== -1;
        }
        if (categoria === 'cliente') {
            return window.resolverNomeCliente(p).toLowerCase().indexOf(t) !== -1 ||
                String(p.solicitante || '').toLowerCase().indexOf(t) !== -1;
        }
        var campos = [
            window.formatarIdServico(p.id), String(p.id || ''),
            window.resolverNomeCliente(p), String(p.solicitante || ''),
            String(p.valor_corrida || ''), String(p.status || ''), String(p.motoboy || ''),
            String(p.mercadoria || ''), String(p.contato || ''), String(p.observacao || ''),
            _formatarDataExibicao(_extrairDataPedido(p))
        ];
        for (var i = 0; i < campos.length; i++) {
            if (campos[i].toLowerCase().indexOf(t) !== -1) return true;
        }
        return false;
    }

    function _matchData(p, dataFiltro) {
        if (!dataFiltro) return true;
        return _extrairDataPedido(p) === dataFiltro;
    }

    function _buscarPedidoNoCache(pedidoId) {
        var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var idBusca = String(pedidoId).trim();
        for (var i = 0; i < cache.length; i++) {
            if (String(cache[i].id || '').trim() === idBusca) return cache[i];
        }
        return null;
    }

    function _aplicarFiltros(lista) {
        var termo = els.filtro ? els.filtro.value.trim() : '';
        var datFiltro = window.pedidosState.filtroData || '';
        var cat = window.pedidosState.filtroCategoria || 'todos';
        var sf = window.pedidosState.filtroStatus || 'todos';
        var r = lista;
        if (sf && sf !== 'todos') r = r.filter(function (p) { return _matchFiltroStatus(p, sf); });
        if (termo) r = r.filter(function (p) { return _matchFiltroPorCategoria(p, termo, cat); });
        if (datFiltro) r = r.filter(function (p) { return _matchData(p, datFiltro); });
        return r;
    }

    function _renderizarTabela(lista) {
        if (!els.corpo) return;
        var filtrada = _aplicarFiltros(lista);
        var total = filtrada.length;
        var totalPag = Math.max(1, Math.ceil(total / window.pedidosState.itensPorPagina));
        if (window.pedidosState.paginaAtual > totalPag) window.pedidosState.paginaAtual = totalPag;
        if (window.pedidosState.paginaAtual < 1) window.pedidosState.paginaAtual = 1;
        var inicio = (window.pedidosState.paginaAtual - 1) * window.pedidosState.itensPorPagina;
        var paginada = filtrada.slice(inicio, inicio + window.pedidosState.itensPorPagina);
        _atualizarPaginador(total);
        if (paginada.length === 0) {
            var tf = (els.filtro && els.filtro.value.trim()) ||
                window.pedidosState.filtroData ||
                (window.pedidosState.filtroStatus && window.pedidosState.filtroStatus !== 'todos');
            els.corpo.innerHTML =
                '<tr><td colspan="5" class="text-center text-muted py-4" style="font-size:0.8rem;">' +
                (tf ? '<i class="bi bi-search me-1"></i>Nenhum resultado para o filtro.'
                    : '<i class="bi bi-inbox d-block mb-1" style="font-size:1.3rem;"></i>Nenhum pedido encontrado.') +
                '</td></tr>';
            return;
        }
        els.corpo.innerHTML = paginada.map(function (p) {
            var id = String(p.id || '0');
            var idFmt = window.formatarIdServico(id);
            var data = _formatarDataExibicao(_extrairDataPedido(p));
            var nome = _resolverSolicitantePorIdChat(p.id_chat || p.id_cliente) || String(p.solicitante || '—');
            var badge = _badgeStatus(_statusPuro(p));
            var final = _isFinalizado(p);
            var idSafe = _escAttr(id);
            var acoes = final
                ? '<button class="btn btn-light btn-sm btn-pedido-view" data-id="' + idSafe + '" title="Visualizar"><i class="bi bi-eye"></i></button>'
                : '<button class="btn btn-light btn-sm me-1 btn-pedido-edit" data-id="' + idSafe + '" title="Editar"><i class="bi bi-pencil-square"></i></button>' +
                '<button class="btn btn-light btn-sm me-1 btn-pedido-view" data-id="' + idSafe + '" title="Visualizar"><i class="bi bi-eye"></i></button>' +
                '<button class="btn btn-light btn-sm btn-pedido-delete" data-id="' + idSafe + '" title="Excluir"><i class="bi bi-trash"></i></button>';
            return '<tr style="font-weight:300;">' +
                '<td class="ps-3 py-2" style="color:#000;">' + idFmt + '</td>' +
                '<td class="py-2">' + _esc(data) + '</td>' +
                '<td class="py-2">' + _esc(nome) + '</td>' +
                '<td class="py-2">' + badge + '</td>' +
                '<td class="text-end pe-3 py-2">' + acoes + '</td></tr>';
        }).join('');
        _registrarEventosLinhas();
    }

    function _registrarEventosLinhas() {
        if (!els.corpo) return;
        els.corpo.querySelectorAll('.btn-pedido-view').forEach(function (btn) {
            btn.addEventListener('click', function () { window.RDO_PEDIDOS.abrirDetalhes(btn.getAttribute('data-id')); });
        });
        els.corpo.querySelectorAll('.btn-pedido-edit').forEach(function (btn) {
            btn.addEventListener('click', function () { window.RDO_PEDIDOS.abrirEdicao(btn.getAttribute('data-id')); });
        });
        els.corpo.querySelectorAll('.btn-pedido-delete').forEach(function (btn) {
            btn.addEventListener('click', function () { window.RDO_PEDIDOS.excluirPedido(btn.getAttribute('data-id')); });
        });
    }

    async function _carregarModaisPedidos() {
        if (!els.modalContainer) return false;
        if (window.pedidosState.modaisCarregados) return true;
        try {
            var resp = await fetch('pages/pedidos/form_pedidos.html');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            els.modalContainer.innerHTML = await resp.text();
            window.pedidosState.modaisCarregados = true;
            return true;
        } catch (_) {
            if (els.modalContainer) els.modalContainer.innerHTML = '';
            window.pedidosState.modaisCarregados = false;
            return false;
        }
    }

    async function _garantirModais() {
        if (window.pedidosState.modaisCarregados && document.getElementById('modalPedidoDetalhes')) return true;
        window.pedidosState.modaisCarregados = false;
        return await _carregarModaisPedidos();
    }

    async function _fetchPedidos() {
        if (window.pedidosState.isFetching) return;
        window.pedidosState.isFetching = true;
        spinOn();
        mostrarLoading();
        try {
            var res = await Promise.all([API.call('getchat'), API.call('getpedidos')]);
            window.AppRDO.chatsCache = Array.isArray(res[0]) ? res[0] : [];
            var lista = Array.isArray(res[1]) ? res[1] : [];
            window.AppRDO.pedidosCache = lista;
            window.pedidosState.paginaAtual = 1;
            _renderizarTabela(lista);
        } catch (_) {
            if (els.corpo) {
                els.corpo.innerHTML =
                    '<tr><td colspan="5" class="text-center text-danger py-4" style="font-size:0.8rem;">' +
                    '<i class="bi bi-exclamation-triangle me-1"></i>Erro ao carregar pedidos.</td></tr>';
            }
        } finally {
            window.pedidosState.isFetching = false;
            spinOff();
        }
    }

    function _populateHeader() {
        var elNome = document.getElementById('header-user-nome');
        var elCargo = document.getElementById('header-user-cargo');
        var elAvatar = document.getElementById('header-user-avatar');
        var elFallback = document.getElementById('header-avatar-fallback');
        var username = localStorage.getItem('username') || 'Usuário';
        var tipo = localStorage.getItem('tipo') || '';
        var imagem = localStorage.getItem('imagem');
        if (elNome) elNome.textContent = username;
        if (elCargo) elCargo.textContent = tipo;
        var isValid = imagem && imagem !== 'null' && imagem !== 'undefined' && imagem.trim().length > 0;
        if (isValid && elAvatar) {
            elAvatar.src = imagem;
            elAvatar.style.display = 'block';
            if (elFallback) elFallback.style.display = 'none';
            elAvatar.onerror = function () {
                elAvatar.style.display = 'none';
                if (elFallback) elFallback.style.display = 'flex';
            };
        } else {
            if (elAvatar) elAvatar.style.display = 'none';
            if (elFallback) elFallback.style.display = 'flex';
        }
    }

    function _toggleDropdown() {
        var w = els.btnFiltro ? els.btnFiltro.closest('.dropdown-filtro-wrapper') : null;
        if (w) w.classList.toggle('open');
    }

    function _fecharDropdown() {
        var w = els.btnFiltro ? els.btnFiltro.closest('.dropdown-filtro-wrapper') : null;
        if (!w) return;
        w.classList.remove('open');
        var sub = w.querySelector('.dropdown-filtro-item-has-sub');
        if (sub) sub.classList.remove('sub-open');
    }

    function _selecionarFiltroTipo(tipo, label, el) {
        window.pedidosState.filtroCategoria = tipo;
        window.pedidosState.filtroStatus = 'todos';
        window.pedidosState.paginaAtual = 1;
        var lEl = document.getElementById('label-filtro-tipo');
        if (lEl) lEl.textContent = label;
        document.querySelectorAll('#dropdown-filtro-menu > .dropdown-filtro-item:not(.dropdown-filtro-item-has-sub)').forEach(function (i) { i.classList.remove('active'); });
        var sp = document.querySelector('#dropdown-filtro-menu .dropdown-filtro-item-has-sub');
        if (sp) sp.classList.remove('active', 'sub-open');
        document.querySelectorAll('#dropdown-filtro-menu .dropdown-filtro-subitem').forEach(function (i) { i.classList.remove('active'); });
        if (el) el.classList.add('active');
        _fecharDropdown();
        if (els.filtro) {
            if (tipo === 'servico') els.filtro.placeholder = 'Ex: RDO001';
            else if (tipo === 'cliente') els.filtro.placeholder = 'Nome do cliente...';
            else els.filtro.placeholder = 'Buscar...';
        }
        _renderizarTabela(Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : []);
    }

    function _selecionarFiltroStatus(status, label, el) {
        window.pedidosState.filtroCategoria = 'todos';
        window.pedidosState.filtroStatus = status;
        window.pedidosState.paginaAtual = 1;
        var lEl = document.getElementById('label-filtro-tipo');
        if (lEl) lEl.textContent = status === 'todos' ? 'Status' : label;
        document.querySelectorAll('#dropdown-filtro-menu > .dropdown-filtro-item:not(.dropdown-filtro-item-has-sub)').forEach(function (i) { i.classList.remove('active'); });
        var sp = document.querySelector('#dropdown-filtro-menu .dropdown-filtro-item-has-sub');
        if (sp) { sp.classList.add('active'); sp.classList.remove('sub-open'); }
        document.querySelectorAll('#submenu-status .dropdown-filtro-subitem').forEach(function (i) { i.classList.remove('active'); });
        if (el) el.classList.add('active');
        _fecharDropdown();
        if (els.filtro) els.filtro.placeholder = 'Buscar...';
        _renderizarTabela(Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : []);
    }

    function _toggleSubMenuStatus(e) {
        e.stopPropagation();
        var parent = e.currentTarget.closest('.dropdown-filtro-item-has-sub');
        if (parent) parent.classList.toggle('sub-open');
    }

    function _registrarEventosDropdown() {
        if (els.btnFiltro) {
            els.btnFiltro.addEventListener('click', function (e) { e.stopPropagation(); _toggleDropdown(); });
        }
        document.querySelectorAll('#dropdown-filtro-menu > .dropdown-filtro-item:not(.dropdown-filtro-item-has-sub)').forEach(function (item) {
            item.addEventListener('click', function () { _selecionarFiltroTipo(item.getAttribute('data-filtro'), item.textContent.trim(), item); });
        });
        var sLabel = document.querySelector('#dropdown-filtro-menu .dropdown-filtro-item-has-sub .dropdown-filtro-item-label');
        if (sLabel) sLabel.addEventListener('click', function (e) { _toggleSubMenuStatus(e); });
        document.querySelectorAll('#submenu-status .dropdown-filtro-subitem').forEach(function (item) {
            item.addEventListener('click', function () { _selecionarFiltroStatus(item.getAttribute('data-status'), item.textContent.trim(), item); });
        });
        document.addEventListener('click', function (e) {
            var w = els.btnFiltro ? els.btnFiltro.closest('.dropdown-filtro-wrapper') : null;
            if (w && !w.contains(e.target)) _fecharDropdown();
        });
    }

    function _registrarEventos() {
        if (els.btnSync) els.btnSync.addEventListener('click', function () { if (!window.pedidosState.isFetching) _fetchPedidos(); });
        if (els.btnPrev) els.btnPrev.addEventListener('click', function () { _mudarPagina(-1); });
        if (els.btnNext) els.btnNext.addEventListener('click', function () { _mudarPagina(1); });
        if (els.filtro) {
            var timer = null;
            els.filtro.addEventListener('input', function () {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    window.pedidosState.paginaAtual = 1;
                    _renderizarTabela(Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : []);
                }, 200);
            });
        }
        if (els.filtroData) {
            els.filtroData.addEventListener('change', function () {
                window.pedidosState.filtroData = els.filtroData.value || '';
                window.pedidosState.paginaAtual = 1;
                _renderizarTabela(Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : []);
            });
        }
        _registrarEventosDropdown();
    }

    function _mudarPagina(dir) {
        var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var filtrada = _aplicarFiltros(cache);
        var totalPag = Math.max(1, Math.ceil(filtrada.length / window.pedidosState.itensPorPagina));
        var nova = window.pedidosState.paginaAtual + dir;
        if (nova >= 1 && nova <= totalPag) {
            window.pedidosState.paginaAtual = nova;
            _renderizarTabela(cache);
        }
    }

    window.toggleLoopPedidos = function () { if (!window.pedidosState.isFetching) _fetchPedidos(); };
    window.mudarPaginaPedidos = function (dir) { _mudarPagina(dir); };
    window.toggleDropdownFiltro = function () { _toggleDropdown(); };
    window.toggleSubMenuStatus = function (e) { _toggleSubMenuStatus(e); };
    window.selecionarFiltroTipo = function (tipo, label, el) { _selecionarFiltroTipo(tipo, label, el); };
    window.selecionarFiltroStatus = function (status, label, el) { _selecionarFiltroStatus(status, label, el); };

    window.RDO_PEDIDOS.calcularEspera = function () {
        var tipoEl     = document.getElementById('edit-espera-tipo');
        var minutosEl  = document.getElementById('edit-espera-minutos');
        var baseEl     = document.getElementById('edit-valor-base');
        var finalEl    = document.getElementById('edit-espera-valor-final');
        var boxResumo  = document.getElementById('box-espera-resumo');
        var boxMinutos = document.getElementById('box-espera-minutos');
        var boxFinal   = document.getElementById('box-espera-valor-final');

        if (!tipoEl || !minutosEl || !baseEl || !finalEl || !boxResumo) return;

        var tipo      = tipoEl.value;
        var semEspera = tipo === 'sem_espera';

        if (boxMinutos) boxMinutos.style.display = semEspera ? 'none' : '';
        if (boxFinal)   boxFinal.style.display   = semEspera ? 'none' : 'block';

        if (semEspera) {
            boxResumo.style.display = 'none';
            finalEl.innerText = '—';
            return;
        }

        var valorBase  = parseFloat(baseEl.value) || 0;
        var minutos    = parseFloat(minutosEl.value) || 0;
        var tarifaMin  = 0.60;
        var franquia   = tipo === 'ambos' ? 20 : 10;
        var excedente  = Math.max(0, minutos - franquia);
        var taxa       = parseFloat((excedente * tarifaMin).toFixed(2));
        var valorFinal = parseFloat((valorBase + taxa).toFixed(2));

        finalEl.innerText = _formatCurrency(valorFinal);

        var elOri   = document.getElementById('resumo-valor-original');
        var elMin   = document.getElementById('resumo-minutos');
        var elTax   = document.getElementById('resumo-taxa');
        var elTotal = document.getElementById('resumo-total');

        if (elOri)   elOri.textContent   = _formatCurrency(valorBase);
        if (elMin)   elMin.textContent   = excedente > 0
            ? excedente + ' min excedente'
            : minutos + ' min (dentro da franquia)';
        if (elTax)   elTax.textContent   = _formatCurrency(taxa);
        if (elTotal) elTotal.textContent = _formatCurrency(valorFinal);

        boxResumo.style.display = '';
    };

    window.RDO_PEDIDOS.abrirEdicao = async function (pedidoId) {
        var ok = await _garantirModais();
        if (!ok) {
            Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar o formulário de edição.', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            return;
        }

        var pedido = _buscarPedidoNoCache(pedidoId);
        if (!pedido) {
            Swal.fire({ icon: 'warning', title: 'Não encontrado', text: 'Pedido não localizado.', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            return;
        }
        if (_isFinalizado(pedido)) {
            Swal.fire({ icon: 'info', title: 'Pedido finalizado', html: '<div style="font-size:0.9rem;">Pedidos concluídos ou cancelados não podem ser editados.</div>', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            return;
        }

        var errDiv = document.getElementById('edit-error-msg');
        if (errDiv) errDiv.classList.add('d-none');

        var tituloEl = document.getElementById('editar-titulo');
        if (tituloEl) tituloEl.textContent = window.formatarIdServico(pedido.id);

        var idInput = document.getElementById('edit-pedido-id');
        if (idInput) idInput.value = pedido.id || '';

        var valorBase = _resolverValorBase(pedido);

        var valorBaseInput = document.getElementById('edit-valor-base');
        if (valorBaseInput) valorBaseInput.value = valorBase.toFixed(2);

        var elValorDisplay = document.getElementById('edit-valor-pedido-display');
        if (elValorDisplay) elValorDisplay.value = valorBase > 0 ? _formatCurrency(valorBase) : 'R$ 0,00';

        var solicitante = _resolverSolicitantePorIdChat(pedido.id_chat || pedido.id_cliente) || String(pedido.solicitante || '');

        var setVal = function (id, val) {
            var e = document.getElementById(id);
            if (e) e.value = val || '';
        };

        setVal('edit-solicitante', solicitante);
        setVal('edit-contato', pedido.contato);
        setVal('edit-horario', _formatarHorario(pedido.horario));
        setVal('edit-obs', pedido.observacao);

        var tipoEl = document.getElementById('edit-espera-tipo');
        if (tipoEl) tipoEl.value = 'sem_espera';

        var minEl = document.getElementById('edit-espera-minutos');
        if (minEl) minEl.value = '';

        var elFinal = document.getElementById('edit-espera-valor-final');
        if (elFinal) elFinal.innerText = '—';

        var boxResumo = document.getElementById('box-espera-resumo');
        if (boxResumo) boxResumo.style.display = 'none';

        var boxMin = document.getElementById('box-espera-minutos');
        var boxFin = document.getElementById('box-espera-valor-final');
        if (boxMin) boxMin.style.display = 'none';
        if (boxFin) boxFin.style.display = 'block';

        var modalEl = document.getElementById('modalEditarPedido');
        if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    };

    window.RDO_PEDIDOS.salvarEdicao = async function () {
        var btn    = document.getElementById('btn-salvar-edicao');
        var errDiv = document.getElementById('edit-error-msg');
        try {
            var idEl = document.getElementById('edit-pedido-id');
            var id   = idEl ? idEl.value.trim() : '';
            if (!id) return;

            var getVal = function (elId) {
                var e = document.getElementById(elId);
                return e ? e.value.trim() : '';
            };

            var solicitante = getVal('edit-solicitante');
            if (!solicitante) {
                if (errDiv) { errDiv.textContent = 'O campo CLIENTE é obrigatório.'; errDiv.classList.remove('d-none'); }
                var solEl = document.getElementById('edit-solicitante');
                if (solEl) solEl.focus();
                return;
            }

            var valorBaseEl  = document.getElementById('edit-valor-base');
            var valorBase    = parseFloat(valorBaseEl ? valorBaseEl.value : '0') || 0;
            var tipoEspera   = getVal('edit-espera-tipo');
            var minutosReais = parseFloat(getVal('edit-espera-minutos')) || 0;
            var franquia     = tipoEspera === 'ambos' ? 20 : 10;
            var excedente    = tipoEspera === 'sem_espera' ? 0 : Math.max(0, minutosReais - franquia);
            var taxa         = parseFloat((excedente * 0.60).toFixed(2));
            var valorFinal   = parseFloat((valorBase + taxa).toFixed(2));

            if (errDiv) errDiv.classList.add('d-none');
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...'; }

            var payload = {
                id:                   id,
                solicitante:          solicitante,
                contato:              getVal('edit-contato'),
                horario:              getVal('edit-horario'),
                observacao:           getVal('edit-obs'),
                valor_base:           _formatCurrency(valorBase),
                valor_corrida:        _formatCurrency(valorFinal),
                taxa_espera:          _formatCurrency(taxa),
                tempo_espera_tipo:    tipoEspera,
                tempo_espera_minutos: String(minutosReais)
            };

            var resp = await API.call('updatepedido', payload);
            if (resp && resp.status === 'success') {
                var pedido = _buscarPedidoNoCache(id);
                if (pedido) {
                    pedido.solicitante          = payload.solicitante;
                    pedido.contato              = payload.contato;
                    pedido.horario              = payload.horario;
                    pedido.observacao           = payload.observacao;
                    pedido.valor_base           = payload.valor_base;
                    pedido.valor_corrida        = payload.valor_corrida;
                    pedido.taxa_espera          = payload.taxa_espera;
                    pedido.tempo_espera_tipo    = payload.tempo_espera_tipo;
                    pedido.tempo_espera_minutos = payload.tempo_espera_minutos;
                }
                _renderizarTabela(Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : []);
                var modalEl = document.getElementById('modalEditarPedido');
                if (modalEl) { var inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.hide(); }
                Swal.fire({ icon: 'success', title: 'Salvo!', text: 'Pedido atualizado com sucesso.', timer: 2000, timerProgressBar: true, confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            } else {
                throw new Error((resp && resp.message) || 'Erro ao salvar.');
            }
        } catch (e) {
            if (errDiv) { errDiv.textContent = 'Erro: ' + (e.message || 'Falha inesperada ao salvar.'); errDiv.classList.remove('d-none'); }
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'SALVAR'; }
        }
    };

    window.RDO_PEDIDOS.abrirDetalhes = async function (pedidoId) {
        var ok = await _garantirModais();
        if (!ok) {
            Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar os detalhes.', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            return;
        }

        var pedido = _buscarPedidoNoCache(pedidoId);
        if (!pedido) {
            Swal.fire({ icon: 'warning', title: 'Não encontrado', text: 'Pedido não localizado.', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            return;
        }

        var el       = function (id) { return document.getElementById(id); };
        var setInput = function (id, val) { var e = el(id); if (e) e.value = val || '—'; };

        var mapaEspera = {
            'sem_espera': 'Sem espera',
            'coleta':     'Espera na Coleta',
            'entrega':    'Espera na Entrega',
            'ambos':      'Coleta + Entrega'
        };

        var valorBase  = _resolverValorBase(pedido);
        var taxa       = _parseCurrency(pedido.taxa_espera || '0');
        var valorFinal = _parseCurrency(pedido.valor_corrida || pedido.valor || pedido.valor_base || '0');

        if (el('detalhe-titulo')) el('detalhe-titulo').textContent = window.formatarIdServico(pedido.id);

        setInput('det-pedido-id',      window.formatarIdServico(pedido.id));
        setInput('det-data',           _formatarDataExibicao(_extrairDataPedido(pedido)));
        setInput('det-contato',        pedido.contato);
        setInput('det-cliente',        window.resolverNomeCliente(pedido));
        setInput('det-horario',        _formatarHorario(pedido.horario));
        setInput('det-mercadoria',     pedido.mercadoria);
        setInput('det-de',             pedido.de);
        setInput('det-para',           pedido.para);
        setInput('det-retorno',        pedido.retorno);
        setInput('det-prioridade',     pedido.prioridade);
        setInput('det-motoboy',        pedido.motoboy);
        setInput('det-status',         pedido.status);
        setInput('det-obs',            pedido.observacao);
        setInput('det-espera-tipo',    mapaEspera[pedido.tempo_espera_tipo] || 'Sem espera');
        setInput('det-espera-minutos', pedido.tempo_espera_minutos ? pedido.tempo_espera_minutos + ' min' : '—');
        setInput('det-valor-original', valorBase > 0 ? _formatCurrency(valorBase) : '—');
        setInput('det-taxa-espera',    taxa > 0 ? _formatCurrency(taxa) : '—');
        setInput('det-valor-final',    valorFinal > 0 ? _formatCurrency(valorFinal) : '—');

        var elValFinal = el('det-valor-final');
        if (elValFinal) elValFinal.style.color = '#dc3545';

        var modalEl = document.getElementById('modalPedidoDetalhes');
        if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    };

    window.RDO_PEDIDOS.atualizarStatusLocal = function (pedidoId, statusFormatado, motoboyNome) {
        var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
        for (var i = 0; i < cache.length; i++) {
            if (String(cache[i].id || '').trim() === String(pedidoId || '').trim()) {
                cache[i].status = statusFormatado;
                if (motoboyNome) cache[i].motoboy = motoboyNome;
                break;
            }
        }
        if (els.corpo) _renderizarTabela(cache);
    };

    window.RDO_PEDIDOS.inserirPedidoLocal = function (novoPedido) {
        if (!novoPedido || !novoPedido.id) return;
        var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var existe = false;
        for (var i = 0; i < cache.length; i++) {
            if (String(cache[i].id || '').trim() === String(novoPedido.id).trim()) { existe = true; break; }
        }
        if (!existe) { cache.push(novoPedido); window.AppRDO.pedidosCache = cache; }
        if (els.corpo) _renderizarTabela(cache);
    };

    window.RDO_PEDIDOS.excluirPedido = async function (pedidoId) {
        if (!pedidoId) return;
        var pedido = _buscarPedidoNoCache(pedidoId);
        if (pedido && _isFinalizado(pedido)) {
            Swal.fire({ icon: 'info', title: 'Pedido finalizado', html: '<div style="font-size:0.9rem;">Pedidos concluídos ou cancelados não podem ser excluídos.</div>', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            return;
        }
        var result = await Swal.fire({
            icon: 'warning',
            title: 'Excluir Pedido?',
            html: '<div style="font-size:0.9rem;color:#555;">O pedido <strong class="text-danger">' + window.formatarIdServico(pedidoId) + '</strong> será removido permanentemente.</div>',
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
            if (resp && resp.status === 'success') {
                window.AppRDO.pedidosCache = (Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : []).filter(function (p) {
                    return String(p.id || '').trim() !== String(pedidoId).trim();
                });
                _renderizarTabela(window.AppRDO.pedidosCache);
                Swal.fire({ icon: 'success', title: 'Excluído!', text: 'Pedido removido com sucesso.', timer: 2000, timerProgressBar: true, confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            } else {
                throw new Error((resp && resp.message) || 'Erro na exclusão.');
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível excluir: ' + (e.message || ''), confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
        }
    };

    window.RDO_PEDIDOS.abrirFormNovo = async function () {
        var ok = await _garantirModais();
        if (!ok) {
            Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível carregar o formulário.', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            return;
        }
        var errDiv = document.getElementById('novo-error-msg');
        if (errDiv) errDiv.classList.add('d-none');
        var chatAtivo = (window.AppRDO && window.AppRDO.chatAtivo) || window.chatAtivo || null;
        var idChat = '';
        var nomeSolicitante = '';
        if (chatAtivo) {
            idChat = String(chatAtivo.id_chat || chatAtivo.id || '').trim();
            nomeSolicitante = _resolverSolicitantePorIdChat(idChat) || String(chatAtivo.nome || chatAtivo.name || chatAtivo.pushname || '');
        }
        var el = function (id) { return document.getElementById(id); };
        if (el('novo-id-chat'))     el('novo-id-chat').value     = idChat;
        if (el('novo-solicitante')) el('novo-solicitante').value  = nomeSolicitante;
        if (el('novo-contato'))     el('novo-contato').value     = '';
        if (el('novo-obs'))         el('novo-obs').value         = '';
        if (el('novo-de'))          el('novo-de').value          = '';
        if (el('novo-para'))        el('novo-para').value        = '';
        if (el('novo-horario'))     el('novo-horario').value     = '';
        var mercSel = el('novo-mercadoria'); if (mercSel) mercSel.selectedIndex = 0;
        var retSel  = el('novo-retorno');    if (retSel)  retSel.selectedIndex  = 0;
        var prioSel = el('novo-prioridade'); if (prioSel) prioSel.selectedIndex = 0;
        var modalEl = document.getElementById('modalNovoPedido');
        if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    };

    window.RDO_PEDIDOS.salvarNovo = async function () {
        var btn    = document.getElementById('btn-salvar-novo');
        var errDiv = document.getElementById('novo-error-msg');
        try {
            var getVal = function (elId) { var e = document.getElementById(elId); return e ? e.value.trim() : ''; };
            var solicitante = getVal('novo-solicitante');
            var idCliente   = getVal('novo-id-chat');
            if (!solicitante) {
                if (errDiv) { errDiv.textContent = 'Selecione um chat para definir o solicitante.'; errDiv.classList.remove('d-none'); }
                return;
            }
            if (errDiv) errDiv.classList.add('d-none');
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Criando...'; }
            var deVal   = getVal('novo-de');
            var paraVal = getVal('novo-para');
            var payload = {
                id_cliente:  idCliente,
                solicitante: solicitante,
                contato:     getVal('novo-contato'),
                mercadoria:  getVal('novo-mercadoria'),
                horario:     getVal('novo-horario'),
                retorno:     getVal('novo-retorno'),
                prioridade:  getVal('novo-prioridade'),
                rotas_texto: (deVal || paraVal) ? 'De: ' + (deVal || '') + ' | Para: ' + (paraVal || '') : '',
                observacao:  getVal('novo-obs'),
                mensagem:    'Pedido [ID_GERADO] criado via painel.'
            };
            var resp = await API.call('finalizarpedido', payload);
            if (resp && resp.status === 'success') {
                var modalEl = document.getElementById('modalNovoPedido');
                if (modalEl) { var inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.hide(); }
                await _fetchPedidos();
                Swal.fire({ icon: 'success', title: 'Criado!', text: 'Pedido criado com sucesso.', timer: 2000, timerProgressBar: true, confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' } });
            } else {
                throw new Error((resp && resp.message) || 'Erro ao criar pedido.');
            }
        } catch (e) {
            if (errDiv) { errDiv.textContent = 'Erro: ' + (e.message || ''); errDiv.classList.remove('d-none'); }
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = 'CRIAR PEDIDO'; }
        }
    };

    window.RDO_PEDIDOS.preencherSolicitanteDoChat = function (idChat, nome) {
        var s = document.getElementById('novo-solicitante');
        var c = document.getElementById('novo-id-chat');
        if (s) s.value = nome || '';
        if (c) c.value = idChat || '';
    };

    window.initPedidos = async function () {
        window.pedidosState.isFetching       = false;
        window.pedidosState.filtroCategoria  = 'todos';
        window.pedidosState.filtroStatus     = 'todos';
        window.pedidosState.filtroData       = '';
        window.pedidosState.paginaAtual      = 1;
        window.pedidosState.modaisCarregados = false;
        bind();
        if (els.filtroData) els.filtroData.value = '';
        if (els.filtro)     els.filtro.value     = '';
        _populateHeader();
        await _carregarModaisPedidos();
        _registrarEventos();
        await _fetchPedidos();
    };

})();
