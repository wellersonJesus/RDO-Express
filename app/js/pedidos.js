console.log('[pedidos.js] ========== SCRIPT CARREGADO ==========');

(function () {
    'use strict';

    console.log('[pedidos.js] Iniciando...');

    window.pedidosState = {
        isFetching: false,
        intervaloId: null,
        filtroCategoria: 'todos',
        filtroStatus: 'todos',
        filtroData: '',
        busca: '',
        paginaAtual: 1,
        itensPorPagina: 10,
        dadosCarregados: false,
        emAcao: false
    };

    window.AppRDO = window.AppRDO || {};
    window.AppRDO.pedidosCache = window.AppRDO.pedidosCache || [];
    window.AppRDO.chatsCache = window.AppRDO.chatsCache || [];

    var els = {
        tbody: null,
        btnSync: null,
        iconSync: null,
        inputBusca: null,
        filtroData: null,
        btnFiltroTipo: null,
        dropdownFiltroMenu: null,
        labelFiltroTipo: null,
        btnPrev: null,
        btnNext: null,
        infoPaginacao: null,
        filtrosStatus: []
    };

    function _bind() {
        console.log('[pedidos.js] _bind() iniciando...');
        els.tbody = document.getElementById('corpo-tabela-pedidos');
        els.btnSync = document.getElementById('btn-loop-pedidos');
        els.iconSync = document.getElementById('icon-loop-pedidos');
        els.inputBusca = document.getElementById('filtro-pedidos');
        els.filtroData = document.getElementById('filtro-data-pedidos');
        els.btnFiltroTipo = document.getElementById('btn-filtro-tipo');
        els.dropdownFiltroMenu = document.getElementById('dropdown-filtro-menu');
        els.labelFiltroTipo = document.getElementById('label-filtro-tipo');
        els.btnPrev = document.getElementById('btn-pag-prev-pedidos');
        els.btnNext = document.getElementById('btn-pag-next-pedidos');
        els.infoPaginacao = document.getElementById('info-paginacao-pedidos');

        els.filtrosStatus = [
            { el: document.getElementById('ped-filter-todos'), status: 'todos' },
            { el: document.getElementById('ped-filter-pendente'), status: 'pendente' },
            { el: document.getElementById('ped-filter-em_rota'), status: 'em_rota' },
            { el: document.getElementById('ped-filter-concluido'), status: 'concluido' },
            { el: document.getElementById('ped-filter-cancelado'), status: 'cancelado' }
        ];

        if (!els.tbody) {
            console.error('[pedidos.js] Tabela não encontrada!');
            return false;
        }
        console.log('[pedidos.js] Elementos carregados.');
        return true;
    }

    function _normalizarStatus(s) {
        var statusStr = String(s || 'PENDENTE').toUpperCase().trim();
        if (['EM_ANDAMENTO', 'ANDAMENTO', 'EM ROTA', 'EM_ROTA'].includes(statusStr)) return 'EM_ROTA';
        if (['FINALIZADO', 'CONCLUIDO', 'CONCLUÍDO'].includes(statusStr)) return 'CONCLUIDO';
        if (statusStr === 'CANCELADO') return 'CANCELADO';
        return 'PENDENTE';
    }

    function _extrairDataPedido(pedido) {
        if (pedido.data) {
            var d = String(pedido.data).substring(0, 10);
            if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d;
            if (/^\d{2}\/\d{2}\/\d{4}/.test(d)) {
                var p = d.split('/');
                return p[2] + '-' + p[1] + '-' + p[0];
            }
        }
        for (var chat of window.AppRDO.chatsCache) {
            if (String(chat.pedido_id || '').trim() === String(pedido.id || '').trim()) {
                var raw = String(chat.data || '').trim();
                if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
                if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
                    var p = raw.substring(0, 10).split('/');
                    return p[2] + '-' + p[1] + '-' + p[0];
                }
            }
        }
        return '';
    }

    function _formatarDataExibicao(isoDate) {
        if (!isoDate || isoDate.length < 10) return '—';
        var parts = isoDate.substring(0, 10).split('-');
        if (parts.length !== 3) return '—';
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function _resolverNomeCliente(pedido) {
        try {
            var idChat = String(pedido.id_chat || pedido.id_cliente || '').trim();
            if (!idChat) return String(pedido.solicitante || '—');
            var clientes = Array.isArray(window.AppRDO.clientesCache) ? window.AppRDO.clientesCache : [];
            if (window.adminState && Array.isArray(window.adminState.dados))
                clientes = window.adminState.dados;
            for (var c of clientes) {
                var cId = String(c.id_chat || c.id || '').trim();
                if (cId === idChat) return String(c.nome || c.name || c.username || c.solicitante || '—');
            }
            return String(pedido.solicitante || '—');
        } catch (_) { return String(pedido.solicitante || '—'); }
    }

    function _formatarIdServico(id) {
        try {
            var s = String(id || '').trim();
            if (/^RDO\d+$/i.test(s)) return s.toUpperCase();
            var num = parseInt(s.replace(/\D/g, ''), 10);
            if (isNaN(num)) num = 0;
            return 'RDO' + String(num).padStart(3, '0');
        } catch (_) { return 'RDO000'; }
    }

    function _escHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function _escAttr(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function _spinOn() {
        if (els.btnSync) {
            els.btnSync.classList.add('syncing');
            els.btnSync.disabled = true;
        }
        if (els.iconSync) els.iconSync.classList.add('spinner-rotate');
        console.log('[pedidos.js] 🔄 Spinner ATIVADO');
    }

    function _spinOff() {
        setTimeout(function () {
            if (els.btnSync) {
                els.btnSync.classList.remove('syncing');
                els.btnSync.disabled = false;
            }
            if (els.iconSync) els.iconSync.classList.remove('spinner-rotate');
            console.log('[pedidos.js] ✅ Spinner DESATIVADO');
        }, 500);
    }

    function _mostrarLoading() {
        if (!els.tbody) return;
        els.tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm text-danger opacity-50"></div><div class="mt-2 pedidos-loading-text">Carregando<span class="pedidos-dots"></span></div></td></tr>';
    }

    function _criarLinhaTabela(pedido) {
        var statusNorm = _normalizarStatus(pedido.status);
        var corStatus = statusNorm === 'PENDENTE' ? 'warning' : statusNorm === 'EM_ROTA' ? 'info' : statusNorm === 'CANCELADO' ? 'danger' : 'success';

        var idPedido = pedido.id || pedido._id || 'S/N';
        var idFmt = _formatarIdServico(idPedido);
        var solicitante = _resolverNomeCliente(pedido);
        var dataPedido = _formatarDataExibicao(_extrairDataPedido(pedido));
        var finalizado = ['CONCLUIDO', 'CANCELADO'].includes(statusNorm);

        var idSafe = _escAttr(idPedido);
        var statusLabel = (statusNorm === 'EM_ROTA') ? 'Em Rota' : (statusNorm === 'CONCLUIDO') ? 'Concluído' : statusNorm;

        var acoes = '';
        if (finalizado) {
            acoes = '<button class="btn-pedido-view" data-id="' + idSafe + '" title="Visualizar"><i class="bi bi-eye"></i></button>';
        } else {
            acoes = '<div class="d-flex gap-1 justify-content-end">' +
                '<button class="btn-pedido-edit" data-id="' + idSafe + '" title="Editar"><i class="bi bi-pencil-square"></i></button>' +
                '<button class="btn-pedido-delete" data-id="' + idSafe + '" title="Excluir"><i class="bi bi-trash"></i></button>' +
                '</div>';
        }

        return '<tr data-pedido-id="' + idSafe + '">' +
            '<td class="ps-3"><span class="fw-semibold text-danger">' + _escHtml(idFmt) + '</span></td>' +
            '<td>' + _escHtml(dataPedido) + '</td>' +
            '<td>' + _escHtml(solicitante) + '</td>' +
            '<td><span class="badge bg-' + corStatus + '">' + _escHtml(statusLabel) + '</span></td>' +
            '<td class="text-end pe-3">' + acoes + '</td></tr>';
    }

    function _matchFiltros(p, termo, categoria, statusFiltro, dataFiltro) {
        var s = _normalizarStatus(p.status);
        if (statusFiltro !== 'todos') {
            if (statusFiltro === 'pendente') if (s !== 'PENDENTE') return false;
            if (statusFiltro === 'em_rota') if (s !== 'EM_ROTA') return false;
            if (statusFiltro === 'concluido') if (s !== 'CONCLUIDO') return false;
            if (statusFiltro === 'cancelado') if (s !== 'CANCELADO') return false;
        }
        if (dataFiltro && _extrairDataPedido(p) !== dataFiltro) return false;

        if (termo) {
            var t = termo.toLowerCase();
            var idFmt = _formatarIdServico(p.id);
            var nome = _resolverNomeCliente(p);
            if (categoria === 'servico') {
                if (idFmt.toLowerCase().indexOf(t) === -1 && String(p.id || '').toLowerCase().indexOf(t) === -1) return false;
            } else if (categoria === 'cliente') {
                if (nome.toLowerCase().indexOf(t) === -1 && String(p.solicitante || '').toLowerCase().indexOf(t) === -1) return false;
            } else {
                var campos = [idFmt, String(p.id || ''), nome, String(p.solicitante || ''),
                    String(p.contato || ''), String(p.mercadoria || ''), String(p.motoboy || ''),
                    String(p.de || ''), String(p.para || '')];
                var match = false;
                for (var c of campos) if (c.toLowerCase().indexOf(t) !== -1) { match = true; break; }
                if (!match) return false;
            }
        }
        return true;
    }

    function _atualizarContadores(pedidos) {
        var total = pedidos.length;
        var pends = pedidos.filter(p => _normalizarStatus(p.status) === 'PENDENTE').length;
        var rotas = pedidos.filter(p => _normalizarStatus(p.status) === 'EM_ROTA').length;
        var concl = pedidos.filter(p => _normalizarStatus(p.status) === 'CONCLUIDO').length;
        var canc = pedidos.filter(p => _normalizarStatus(p.status) === 'CANCELADO').length;

        function _atualizar(id, count, pct) {
            var elCount = document.getElementById('ped-count-' + id);
            var elPct = document.getElementById('ped-pct-' + id);
            if (elCount) elCount.textContent = count;
            if (elPct) elPct.textContent = pct;
        }

        _atualizar('todos', total, 'de ' + total);
        _atualizar('pendente', pends, total > 0 ? Math.round((pends / total) * 100) + '%' : '0%');
        _atualizar('em_rota', rotas, total > 0 ? Math.round((rotas / total) * 100) + '%' : '0%');
        _atualizar('concluido', concl, total > 0 ? Math.round((concl / total) * 100) + '%' : '0%');
        _atualizar('cancelado', canc, total > 0 ? Math.round((canc / total) * 100) + '%' : '0%');
    }

    function _renderizarTabela(pedidos) {
        console.log('[pedidos.js] Renderizando...');
        if (!els.tbody) { console.error('[pedidos.js] tbody não encontrado'); return; }

        var termo = window.pedidosState.busca;
        var categoria = window.pedidosState.filtroCategoria;
        var statusFiltro = window.pedidosState.filtroStatus;
        var dataFiltro = window.pedidosState.filtroData;

        var filtrados = pedidos.filter(p => _matchFiltros(p, termo, categoria, statusFiltro, dataFiltro));
        console.log('[pedidos.js] Filtrados:', filtrados.length);

        _atualizarContadores(pedidos);

        if (filtrados.length === 0) {
            els.tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">' +
                '<i class="bi bi-inbox d-block mb-2" style="font-size:2rem;"></i>' +
                'Nenhum pedido encontrado</td></tr>';
            if (els.infoPaginacao) els.infoPaginacao.textContent = 'Pág 0 de 0';
            return;
        }

        var inicio = (window.pedidosState.paginaAtual - 1) * window.pedidosState.itensPorPagina;
        var fim = inicio + window.pedidosState.itensPorPagina;
        var paginado = filtrados.slice(inicio, fim);
        var totalPag = Math.ceil(filtrados.length / window.pedidosState.itensPorPagina);

        els.tbody.innerHTML = paginado.map(_criarLinhaTabela).join('');
        if (els.infoPaginacao) els.infoPaginacao.textContent = 'Pág ' + window.pedidosState.paginaAtual + ' de ' + totalPag;

        if (els.btnPrev) els.btnPrev.disabled = window.pedidosState.paginaAtual === 1;
        if (els.btnNext) els.btnNext.disabled = window.pedidosState.paginaAtual >= totalPag;

        _registrarEventosLinhas();
    }

    function _registrarEventosLinhas() {
        document.querySelectorAll('.btn-pedido-view').forEach(btn => {
            btn.onclick = () => {
                var id = btn.getAttribute('data-id');
                if (typeof window.visualizarPedido === 'function') window.visualizarPedido(id);
                else alert('Visualizar pedido ' + id);
            };
        });
        document.querySelectorAll('.btn-pedido-edit').forEach(btn => {
            btn.onclick = () => {
                var id = btn.getAttribute('data-id');
                if (typeof window.editarPedido === 'function') window.editarPedido(id);
                else alert('Editar pedido ' + id);
            };
        });
        document.querySelectorAll('.btn-pedido-delete').forEach(btn => {
            btn.onclick = () => {
                var id = btn.getAttribute('data-id');
                console.log('[pedidos.js] 🗑️ Excluir clicado:', id);
                window.pedidosState.emAcao = true;
                _spinOn();

                if (typeof window.MasterAuth !== 'undefined' && typeof window.MasterAuth.abrir === 'function') {
                    window.MasterAuth.abrir(id, 'pedidos');
                } else {
                    console.error('[pedidos.js] ❌ MasterAuth não disponível');
                    alert('Erro: Módulo de autenticação não carregado');
                    _spinOff();
                }
            };
        });
    }

    async function _fetchPedidos() {
        if (window.pedidosState.isFetching) {
            console.log('[pedidos.js] fetch já em andamento');
            return;
        }
        if (window.pedidosState.dadosCarregados && !window.pedidosState.emAcao) {
            console.log('[pedidos.js] ✅ Dados já carregados. Modo estático ativo.');
            return;
        }

        window.pedidosState.isFetching = true;
        window.pedidosState.emAcao = false;
        _spinOn();
        _mostrarLoading();

        try {
            if (typeof API === 'undefined' || typeof API.call !== 'function') throw new Error('API.call indefinido');
            var respChat = await API.call('getchat');
            window.AppRDO.chatsCache = Array.isArray(respChat) ? respChat : [];
            var respPedidos = await API.call('getpedidos');
            var pedidos = [];
            if (Array.isArray(respPedidos)) pedidos = respPedidos;
            else if (typeof respPedidos === 'object') {
                if (respPedidos.pedidos && Array.isArray(respPedidos.pedidos))
                    pedidos = respPedidos.pedidos;
                else if (respPedidos.data && Array.isArray(respPedidos.data))
                    pedidos = respPedidos.data;
            }
            window.AppRDO.pedidosCache = pedidos;
            window.pedidosState.dadosCarregados = true;
            _renderizarTabela(pedidos);
        } catch (e) {
            console.error(e);
            els.tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">'
                + '<i class="bi bi-exclamation-triangle d-block mb-2" style="font-size:2rem;"></i>'
                + 'Erro: ' + _escHtml(e.message) + '</td></tr>';
        } finally {
            window.pedidosState.isFetching = false;
            _spinOff();
        }
    }

    function _registrarEventos() {
        if (els.btnSync) {
            els.btnSync.onclick = () => {
                window.pedidosState.dadosCarregados = false;
                window.pedidosState.emAcao = true;
                if (!window.pedidosState.isFetching) _fetchPedidos();
            };
        }
        if (els.inputBusca) {
            let t = null;
            els.inputBusca.oninput = () => {
                clearTimeout(t);
                t = setTimeout(() => {
                    window.pedidosState.busca = els.inputBusca.value.trim();
                    window.pedidosState.paginaAtual = 1;
                    window.pedidosState.emAcao = true;
                    _renderizarTabela(window.AppRDO.pedidosCache);
                }, 300);
            };
        }
        if (els.filtroData) {
            els.filtroData.onchange = () => {
                window.pedidosState.filtroData = els.filtroData.value || '';
                window.pedidosState.paginaAtual = 1;
                window.pedidosState.emAcao = true;
                _renderizarTabela(window.AppRDO.pedidosCache);
            };
        }
        if (els.btnFiltroTipo && els.dropdownFiltroMenu) {
            els.btnFiltroTipo.onclick = () => { els.dropdownFiltroMenu.classList.toggle('show'); };
            document.onclick = (e) => {
                if (!els.btnFiltroTipo.contains(e.target) && !els.dropdownFiltroMenu.contains(e.target))
                    els.dropdownFiltroMenu.classList.remove('show');
            };
            els.dropdownFiltroMenu.querySelectorAll('.dropdown-filtro-item').forEach(i => {
                i.onclick = () => {
                    window.pedidosState.filtroCategoria = i.getAttribute('data-filtro');
                    els.labelFiltroTipo.textContent = i.textContent.trim();
                    els.dropdownFiltroMenu.querySelectorAll('.dropdown-filtro-item').forEach(el => el.classList.remove('active'));
                    i.classList.add('active');
                    els.dropdownFiltroMenu.classList.remove('show');
                    window.pedidosState.paginaAtual = 1;
                    window.pedidosState.emAcao = true;
                    _renderizarTabela(window.AppRDO.pedidosCache);
                };
            });
        }
        els.filtrosStatus.forEach(f => {
            if (f.el) {
                f.el.onclick = () => {
                    els.filtrosStatus.forEach(fi => fi.el && fi.el.classList.remove('active'));
                    f.el.classList.add('active');
                    window.pedidosState.filtroStatus = f.status;
                    window.pedidosState.paginaAtual = 1;
                    window.pedidosState.emAcao = true;
                    _renderizarTabela(window.AppRDO.pedidosCache);
                };
            }
        });
        if (els.btnPrev) {
            els.btnPrev.onclick = () => {
                if (window.pedidosState.paginaAtual > 1) {
                    window.pedidosState.paginaAtual--;
                    window.pedidosState.emAcao = true;
                    _renderizarTabela(window.AppRDO.pedidosCache);
                }
            };
        }
        if (els.btnNext) {
            els.btnNext.onclick = () => {
                window.pedidosState.paginaAtual++;
                window.pedidosState.emAcao = true;
                _renderizarTabela(window.AppRDO.pedidosCache);
            };
        }
    }

    window.visualizarPedido = function (id) {
        window.pedidosState.emAcao = true;
        window.loadModal('form_pedidos.html').then(function (ok) {
            if (!ok) return;
            var pedido = (window.AppRDO.pedidosCache || []).find(function (p) {
                return String(p.id || p._id) === String(id);
            });
            if (!pedido) return;

            var modal = new bootstrap.Modal(document.getElementById('modalPedidoDetalhes'));

            document.getElementById('detalhe-titulo').textContent = _formatarIdServico(id);
            document.getElementById('det-pedido-id').value = _formatarIdServico(id);
            document.getElementById('det-data').value = _formatarDataExibicao(_extrairDataPedido(pedido));
            document.getElementById('det-horario').value = pedido.horario || '—';
            document.getElementById('det-contato').value = pedido.contato || '—';
            document.getElementById('det-cliente').value = _resolverNomeCliente(pedido);
            document.getElementById('det-mercadoria').value = pedido.mercadoria || '—';
            document.getElementById('det-retorno').value = pedido.retorno || 'Não';
            document.getElementById('det-prioridade').value = pedido.prioridade || '0';
            document.getElementById('det-de').value = pedido.de || '—';
            document.getElementById('det-para').value = pedido.para || '—';
            document.getElementById('det-motoboy').value = pedido.motoboy || '—';
            document.getElementById('det-status').value = _normalizarStatus(pedido.status);
            document.getElementById('det-valor-original').value = 'R$ ' + (pedido.valor || 0).toFixed(2);
            document.getElementById('det-taxa-espera').value = pedido.taxa_espera || 'R$ 0,00';
            document.getElementById('det-valor-final').value = 'R$ ' + (pedido.valor_final || pedido.valor || 0).toFixed(2);
            document.getElementById('det-espera-tipo').value = pedido.espera_tipo || 'sem_espera';
            document.getElementById('det-espera-minutos').value = pedido.espera_minutos || '0';
            document.getElementById('det-obs').value = pedido.observacoes || '';

            modal.show();
        });
    };

    window.editarPedido = function (id) {
        window.pedidosState.emAcao = true;
        window.loadModal('form_pedidos.html').then(function (ok) {
            if (!ok) return;
            var pedido = (window.AppRDO.pedidosCache || []).find(function (p) {
                return String(p.id || p._id) === String(id);
            });
            if (!pedido) return;

            var modal = new bootstrap.Modal(document.getElementById('modalEditarPedido'));

            document.getElementById('editar-titulo').textContent = _formatarIdServico(id);
            document.getElementById('edit-pedido-id').value = id;
            document.getElementById('edit-solicitante').value = pedido.solicitante || '';
            document.getElementById('edit-contato').value = pedido.contato || '';
            document.getElementById('edit-data').value = _formatarDataExibicao(_extrairDataPedido(pedido));
            document.getElementById('edit-horario').value = pedido.horario || '';
            document.getElementById('edit-de').value = pedido.de || '';
            document.getElementById('edit-para').value = pedido.para || '';
            document.getElementById('edit-obs').value = pedido.observacoes || '';
            document.getElementById('edit-valor-base').value = pedido.valor || 0;
            document.getElementById('edit-valor-pedido-display').value = 'R$ ' + (pedido.valor || 0).toFixed(2);
            document.getElementById('edit-espera-tipo').value = pedido.espera_tipo || 'sem_espera';
            document.getElementById('edit-espera-minutos').value = pedido.espera_minutos || '';

            modal.show();
        });
    };

    window.RDO_PEDIDOS = window.RDO_PEDIDOS || {};

    window.RDO_PEDIDOS.removerDoCache = function (id) {
        console.log('[pedidos.js] 🗑️ Removendo do cache:', id);
        if (!window.AppRDO || !Array.isArray(window.AppRDO.pedidosCache)) {
            _spinOff();
            return;
        }

        var idStr = String(id || '').trim();

        window.AppRDO.pedidosCache = window.AppRDO.pedidosCache.filter(function (p) {
            return String(p.id || '').trim() !== idStr;
        });

        window.pedidosState.emAcao = true;
        _renderizarTabela(window.AppRDO.pedidosCache);
        setTimeout(_spinOff, 800);
    };

    if (typeof window.EventBus !== 'undefined') {
        window.EventBus.on('pedido:excluido', function (dados) {
            console.log('[pedidos.js] 📡 Recebido evento de exclusão:', dados.id);
            window.RDO_PEDIDOS.removerDoCache(dados.id);
        });
    }

    window.RDO_PEDIDOS._renderizarTabelaPublico = function () {
        console.log('[pedidos.js] 🔄 _renderizarTabelaPublico chamado');
        window.pedidosState.emAcao = true;
        _renderizarTabela(window.AppRDO.pedidosCache || []);
    };

    if (typeof window.EventBus !== 'undefined') {
        window.EventBus.on('pedido:adicionado', function (novoPedido) {
            console.log('[pedidos.js] 📡 Novo pedido recebido:', novoPedido);

            if (!window.AppRDO || !Array.isArray(window.AppRDO.pedidosCache)) return;

            // ✅ ADICIONAR NO CACHE
            window.AppRDO.pedidosCache.push(novoPedido);

            // ✅ RERRENDERIZAR TABELA
            _renderizarTabela(window.AppRDO.pedidosCache);

            console.log('[pedidos.js] ✅ Pedido adicionado na lista');
        });
    }

    window.initPedidos = function () {
        console.log('[pedidos.js] ========== initPedidos ==========');
        var tbody = document.getElementById('corpo-tabela-pedidos');
        if (!tbody) { console.warn('Tabela não encontrada'); return; }
        window.pedidosState.paginaAtual = 1;
        window.pedidosState.isFetching = false;
        window.pedidosState.dadosCarregados = false;
        window.pedidosState.emAcao = false;
        if (window.pedidosState.intervaloId) clearInterval(window.pedidosState.intervaloId);
        _bind();
        _registrarEventos();
        _fetchPedidos();
        console.log('Pronto!');
    };

    console.log('[pedidos.js] Script carregado e pronto.');

})();
