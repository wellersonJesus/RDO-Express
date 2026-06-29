console.log('[pedidos.js] ========== SCRIPT CARREGADO ==========');

(function () {
    'use strict';

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
    window.AppRDO.chatsCache   = window.AppRDO.chatsCache   || [];

    var els = {
        tbody: null, btnSync: null, iconSync: null, inputBusca: null,
        filtroData: null, btnFiltroTipo: null, dropdownFiltroMenu: null,
        labelFiltroTipo: null, btnPrev: null, btnNext: null,
        infoPaginacao: null, filtrosStatus: []
    };

    function _bind() {
        els.tbody             = document.getElementById('corpo-tabela-pedidos');
        els.btnSync           = document.getElementById('btn-loop-pedidos');
        els.iconSync          = document.getElementById('icon-loop-pedidos');
        els.inputBusca        = document.getElementById('filtro-pedidos');
        els.filtroData        = document.getElementById('filtro-data-pedidos');
        els.btnFiltroTipo     = document.getElementById('btn-filtro-tipo');
        els.dropdownFiltroMenu= document.getElementById('dropdown-filtro-menu');
        els.labelFiltroTipo   = document.getElementById('label-filtro-tipo');
        els.btnPrev           = document.getElementById('btn-pag-prev-pedidos');
        els.btnNext           = document.getElementById('btn-pag-next-pedidos');
        els.infoPaginacao     = document.getElementById('info-paginacao-pedidos');
        els.filtrosStatus = [
            { el: document.getElementById('ped-filter-todos'),     status: 'todos'     },
            { el: document.getElementById('ped-filter-pendente'),  status: 'pendente'  },
            { el: document.getElementById('ped-filter-em_rota'),   status: 'em_rota'   },
            { el: document.getElementById('ped-filter-concluido'), status: 'concluido' },
            { el: document.getElementById('ped-filter-cancelado'), status: 'cancelado' }
        ];
        if (!els.tbody) { console.error('[pedidos.js] ❌ tbody não encontrado'); return false; }
        return true;
    }

    function _normalizarStatus(s) {
        var st = String(s || 'PENDENTE').toUpperCase().trim();
        if (['EM_ANDAMENTO','ANDAMENTO','EM ROTA','EM_ROTA'].includes(st)) return 'EM_ROTA';
        if (['FINALIZADO','CONCLUIDO','CONCLUÍDO'].includes(st))           return 'CONCLUIDO';
        if (st === 'CANCELADO') return 'CANCELADO';
        return 'PENDENTE';
    }

    function _chatDoPedido(pedidoId) {
        var pid = String(pedidoId || '').trim();
        return (window.AppRDO.chatsCache || []).find(function (c) {
            return String(c.pedido_id || '').trim() === pid;
        }) || null;
    }

    function _resolverHoraPedido(pedido) {
        var chat = _chatDoPedido(pedido.id);
        if (chat && chat.hora) {
            var h = String(chat.hora).trim();
            var match = h.match(/^(\d{1,2}):(\d{2})/);
            if (match) {
                return match[1].padStart(2, '0') + ':' + match[2];
            }
        }
        if (pedido.horario) {
            var h2 = String(pedido.horario).trim();
            var match2 = h2.match(/^(\d{1,2}):(\d{2})/);
            if (match2) return match2[1].padStart(2, '0') + ':' + match2[2];
        }
        return '—';
    }

    function _extrairDataPedido(pedido) {
        var chat = _chatDoPedido(pedido.id);
        if (chat && chat.data) {
            var raw = String(chat.data).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
            if (/^\d{2}\/\d{2}\/\d{4}/.test(raw)) {
                var p = raw.substring(0, 10).split('/');
                return p[2] + '-' + p[1] + '-' + p[0];
            }
        }
        if (pedido.data) {
            var d = String(pedido.data).substring(0, 10);
            if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d;
            if (/^\d{2}\/\d{2}\/\d{4}/.test(d)) {
                var pts = d.split('/');
                return pts[2] + '-' + pts[1] + '-' + pts[0];
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

    function _parseMoeda(valor) {
        if (valor === null || valor === undefined || valor === '') return 0;
        var str = String(valor).trim();
        str = str.replace(/R\$\s*/gi, '');
        str = str.replace(/\./g, '').replace(',', '.');
        var num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }

    function _resolverValor(pedido) {
        return _parseMoeda(pedido.valor_corrida);
    }

    function _formatarMoeda(valor) {
        return 'R$ ' + parseFloat(valor || 0).toFixed(2).replace('.', ',');
    }

    function _resolverNomeCliente(pedido) {
        try {
            var idChat = String(pedido.id_chat || pedido.id_cliente || '').trim();
            if (!idChat) return String(pedido.solicitante || '—');
            var clientes = Array.isArray(window.AppRDO.clientesCache) ? window.AppRDO.clientesCache : [];
            if (window.adminState && Array.isArray(window.adminState.dados)) clientes = window.adminState.dados;
            for (var i = 0; i < clientes.length; i++) {
                var c = clientes[i];
                if (String(c.id_chat || c.id || '').trim() === idChat)
                    return String(c.nome || c.name || c.username || c.solicitante || '—');
            }
            return String(pedido.solicitante || '—');
        } catch (_) { return String(pedido.solicitante || '—'); }
    }

    function _formatarIdServico(id) {
        try {
            var s = String(id || '').trim();
            if (/^RDO\d+$/i.test(s)) return s.toUpperCase();
            var num = parseInt(s.replace(/\D/g, ''), 10);
            return 'RDO' + String(isNaN(num) ? 0 : num).padStart(3, '0');
        } catch (_) { return 'RDO000'; }
    }

    function _escHtml(str) {
        var div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    function _escAttr(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function _spinOn() {
        if (els.btnSync)  { els.btnSync.classList.add('syncing'); els.btnSync.disabled = true; }
        if (els.iconSync) els.iconSync.classList.add('spinner-rotate');
    }

    function _spinOff() {
        setTimeout(function () {
            if (els.btnSync)  { els.btnSync.classList.remove('syncing'); els.btnSync.disabled = false; }
            if (els.iconSync) els.iconSync.classList.remove('spinner-rotate');
        }, 500);
    }

    function _mostrarLoading() {
        if (!els.tbody) return;
        els.tbody.innerHTML =
            '<tr><td colspan="5" class="text-center text-muted py-4">' +
            '<div class="spinner-border spinner-border-sm text-danger opacity-50"></div>' +
            '<div class="mt-2 pedidos-loading-text">Carregando<span class="pedidos-dots"></span></div>' +
            '</td></tr>';
    }

    function _criarLinhaTabela(pedido) {
        var statusNorm  = _normalizarStatus(pedido.status);
        var corStatus   = statusNorm === 'PENDENTE'  ? 'warning' :
                          statusNorm === 'EM_ROTA'   ? 'info'    :
                          statusNorm === 'CANCELADO' ? 'danger'  : 'success';
        var statusLabel = statusNorm === 'EM_ROTA'   ? 'Em Rota'  :
                          statusNorm === 'CONCLUIDO' ? 'Concluído': statusNorm;
        var idPedido    = String(pedido.id || pedido._id || 'S/N');
        var idFmt       = _formatarIdServico(idPedido);
        var solicitante = _resolverNomeCliente(pedido);
        var dataPedido  = _formatarDataExibicao(_extrairDataPedido(pedido));
        var finalizado  = ['CONCLUIDO','CANCELADO'].includes(statusNorm);
        var idSafe      = _escAttr(idPedido);

        var acoes = finalizado
            ? '<button class="btn-pedido-view" data-id="' + idSafe + '" title="Visualizar"><i class="bi bi-eye"></i></button>'
            : '<div class="d-flex gap-1 justify-content-end">' +
              '<button class="btn-pedido-edit"   data-id="' + idSafe + '" title="Editar"><i class="bi bi-pencil-square"></i></button>' +
              '<button class="btn-pedido-delete" data-id="' + idSafe + '" title="Excluir"><i class="bi bi-trash"></i></button>' +
              '</div>';

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
            if (statusFiltro === 'pendente'  && s !== 'PENDENTE')  return false;
            if (statusFiltro === 'em_rota'   && s !== 'EM_ROTA')   return false;
            if (statusFiltro === 'concluido' && s !== 'CONCLUIDO') return false;
            if (statusFiltro === 'cancelado' && s !== 'CANCELADO') return false;
        }
        if (dataFiltro && _extrairDataPedido(p) !== dataFiltro) return false;
        if (termo) {
            var t     = termo.toLowerCase();
            var idFmt = _formatarIdServico(p.id);
            var nome  = _resolverNomeCliente(p);
            if (categoria === 'servico') {
                if (idFmt.toLowerCase().indexOf(t) === -1 && String(p.id || '').toLowerCase().indexOf(t) === -1) return false;
            } else if (categoria === 'cliente') {
                if (nome.toLowerCase().indexOf(t) === -1 && String(p.solicitante || '').toLowerCase().indexOf(t) === -1) return false;
            } else {
                var campos = [idFmt, String(p.id||''), nome, String(p.solicitante||''),
                              String(p.contato||''), String(p.mercadoria||''), String(p.motoboy||''),
                              String(p.de||''), String(p.para||'')];
                if (!campos.some(function (c) { return c.toLowerCase().indexOf(t) !== -1; })) return false;
            }
        }
        return true;
    }

    function _atualizarContadores(pedidos) {
        var total = pedidos.length;
        var pends = pedidos.filter(function (p) { return _normalizarStatus(p.status) === 'PENDENTE';  }).length;
        var rotas = pedidos.filter(function (p) { return _normalizarStatus(p.status) === 'EM_ROTA';   }).length;
        var concl = pedidos.filter(function (p) { return _normalizarStatus(p.status) === 'CONCLUIDO'; }).length;
        var canc  = pedidos.filter(function (p) { return _normalizarStatus(p.status) === 'CANCELADO'; }).length;

        function _set(id, count, pct) {
            var elC = document.getElementById('ped-count-' + id);
            var elP = document.getElementById('ped-pct-'   + id);
            if (elC) elC.textContent = count;
            if (elP) elP.textContent = pct;
        }
        _set('todos',     total, 'de ' + total);
        _set('pendente',  pends, total > 0 ? Math.round((pends / total) * 100) + '%' : '0%');
        _set('em_rota',   rotas, total > 0 ? Math.round((rotas / total) * 100) + '%' : '0%');
        _set('concluido', concl, total > 0 ? Math.round((concl / total) * 100) + '%' : '0%');
        _set('cancelado', canc,  total > 0 ? Math.round((canc  / total) * 100) + '%' : '0%');
    }

    function _renderizarTabela(pedidos) {
        if (!els.tbody) { console.error('[pedidos.js] ❌ tbody não encontrado'); return; }

        var filtrados = pedidos.filter(function (p) {
            return _matchFiltros(p, window.pedidosState.busca, window.pedidosState.filtroCategoria,
                                 window.pedidosState.filtroStatus, window.pedidosState.filtroData);
        });

        _atualizarContadores(pedidos);

        if (filtrados.length === 0) {
            els.tbody.innerHTML =
                '<tr><td colspan="5" class="text-center text-muted py-4">' +
                '<i class="bi bi-inbox d-block mb-2" style="font-size:2rem;"></i>' +
                'Nenhum pedido encontrado</td></tr>';
            if (els.infoPaginacao) els.infoPaginacao.textContent = 'Pág 0 de 0';
            return;
        }

        var inicio   = (window.pedidosState.paginaAtual - 1) * window.pedidosState.itensPorPagina;
        var paginado = filtrados.slice(inicio, inicio + window.pedidosState.itensPorPagina);
        var totalPag = Math.ceil(filtrados.length / window.pedidosState.itensPorPagina);

        els.tbody.innerHTML = paginado.map(_criarLinhaTabela).join('');
        if (els.infoPaginacao) els.infoPaginacao.textContent = 'Pág ' + window.pedidosState.paginaAtual + ' de ' + totalPag;
        if (els.btnPrev) els.btnPrev.disabled = window.pedidosState.paginaAtual === 1;
        if (els.btnNext) els.btnNext.disabled = window.pedidosState.paginaAtual >= totalPag;

        _registrarEventosLinhas();
    }

    function _registrarEventosLinhas() {
        document.querySelectorAll('.btn-pedido-view').forEach(function (btn) {
            btn.onclick = function () {
                if (typeof window.visualizarPedido === 'function') window.visualizarPedido(btn.getAttribute('data-id'));
            };
        });
        document.querySelectorAll('.btn-pedido-edit').forEach(function (btn) {
            btn.onclick = function () {
                if (typeof window.editarPedido === 'function') window.editarPedido(btn.getAttribute('data-id'));
            };
        });
        document.querySelectorAll('.btn-pedido-delete').forEach(function (btn) {
            btn.onclick = function () {
                if (typeof window.MasterAuth !== 'undefined' && typeof window.MasterAuth.abrir === 'function')
                    window.MasterAuth.abrir(btn.getAttribute('data-id'));
                else console.error('[pedidos.js] ❌ MasterAuth não disponível');
            };
        });
    }

    async function _fetchPedidos() {
        if (window.pedidosState.isFetching) return;
        if (window.pedidosState.dadosCarregados && !window.pedidosState.emAcao) return;

        window.pedidosState.isFetching = true;
        window.pedidosState.emAcao     = false;
        _spinOn();
        _mostrarLoading();

        try {
            if (typeof API === 'undefined' || typeof API.call !== 'function')
                throw new Error('API.call indefinido');

            var respChat = await API.call('getchat');
            window.AppRDO.chatsCache = Array.isArray(respChat) ? respChat : [];

            var respPedidos = await API.call('getpedidos');
            var pedidos = [];
            if (Array.isArray(respPedidos)) {
                pedidos = respPedidos;
            } else if (respPedidos && typeof respPedidos === 'object') {
                pedidos = Array.isArray(respPedidos.pedidos) ? respPedidos.pedidos :
                          Array.isArray(respPedidos.data)    ? respPedidos.data    : [];
            }

            window.AppRDO.pedidosCache        = pedidos;
            window.pedidosState.dadosCarregados = true;
            _renderizarTabela(pedidos);

        } catch (e) {
            console.error('[pedidos.js] ❌ Erro no fetch:', e);
            if (els.tbody)
                els.tbody.innerHTML =
                    '<tr><td colspan="5" class="text-center text-danger py-4">' +
                    '<i class="bi bi-exclamation-triangle d-block mb-2" style="font-size:2rem;"></i>' +
                    'Erro: ' + _escHtml(e.message) + '</td></tr>';
        } finally {
            window.pedidosState.isFetching = false;
            _spinOff();
        }
    }

    function _registrarEventos() {
        if (els.btnSync) {
            els.btnSync.onclick = function () {
                window.pedidosState.dadosCarregados = false;
                window.pedidosState.emAcao = true;
                if (!window.pedidosState.isFetching) _fetchPedidos();
            };
        }

        if (els.inputBusca) {
            var tBusca = null;
            els.inputBusca.oninput = function () {
                clearTimeout(tBusca);
                tBusca = setTimeout(function () {
                    window.pedidosState.busca       = els.inputBusca.value.trim();
                    window.pedidosState.paginaAtual = 1;
                    window.pedidosState.emAcao      = true;
                    _renderizarTabela(window.AppRDO.pedidosCache);
                }, 300);
            };
        }

        if (els.filtroData) {
            els.filtroData.onchange = function () {
                window.pedidosState.filtroData  = els.filtroData.value || '';
                window.pedidosState.paginaAtual = 1;
                window.pedidosState.emAcao      = true;
                _renderizarTabela(window.AppRDO.pedidosCache);
            };
        }

        if (els.btnFiltroTipo && els.dropdownFiltroMenu) {
            els.btnFiltroTipo.onclick = function () {
                els.dropdownFiltroMenu.classList.toggle('show');
            };
            document.addEventListener('click', function (e) {
                if (!els.btnFiltroTipo.contains(e.target) && !els.dropdownFiltroMenu.contains(e.target))
                    els.dropdownFiltroMenu.classList.remove('show');
            });
            els.dropdownFiltroMenu.querySelectorAll('.dropdown-filtro-item').forEach(function (item) {
                item.onclick = function () {
                    window.pedidosState.filtroCategoria = item.getAttribute('data-filtro');
                    if (els.labelFiltroTipo) els.labelFiltroTipo.textContent = item.textContent.trim();
                    els.dropdownFiltroMenu.querySelectorAll('.dropdown-filtro-item')
                        .forEach(function (el) { el.classList.remove('active'); });
                    item.classList.add('active');
                    els.dropdownFiltroMenu.classList.remove('show');
                    window.pedidosState.paginaAtual = 1;
                    window.pedidosState.emAcao      = true;
                    _renderizarTabela(window.AppRDO.pedidosCache);
                };
            });
        }

        els.filtrosStatus.forEach(function (f) {
            if (!f.el) return;
            f.el.onclick = function () {
                els.filtrosStatus.forEach(function (fi) { if (fi.el) fi.el.classList.remove('active'); });
                f.el.classList.add('active');
                window.pedidosState.filtroStatus = f.status;
                window.pedidosState.paginaAtual  = 1;
                window.pedidosState.emAcao       = true;
                _renderizarTabela(window.AppRDO.pedidosCache);
            };
        });

        if (els.btnPrev) {
            els.btnPrev.onclick = function () {
                if (window.pedidosState.paginaAtual > 1) {
                    window.pedidosState.paginaAtual--;
                    window.pedidosState.emAcao = true;
                    _renderizarTabela(window.AppRDO.pedidosCache);
                }
            };
        }
        if (els.btnNext) {
            els.btnNext.onclick = function () {
                window.pedidosState.paginaAtual++;
                window.pedidosState.emAcao = true;
                _renderizarTabela(window.AppRDO.pedidosCache);
            };
        }
    }

    window.visualizarPedido = function (id) {
        window.pedidosState.emAcao = true;

        var pedido = (window.AppRDO.pedidosCache || []).find(function (p) {
            return String(p.id || p._id || '').trim() === String(id).trim();
        });
        if (!pedido) { console.error('[pedidos.js] ❌ Pedido não encontrado:', id); return; }

        window.loadModal('form_pedidos.html').then(function (ok) {
            if (!ok) { console.error('[pedidos.js] ❌ loadModal falhou'); return; }

            var modalEl = document.getElementById('modalPedidoDetalhes');
            if (!modalEl) { console.error('[pedidos.js] ❌ #modalPedidoDetalhes não encontrado'); return; }

            var valor    = _resolverValor(pedido);
            var taxaNum  = _parseMoeda(pedido.taxa_espera);
            var finalNum = _parseMoeda(pedido.valor_final) || valor;

            function _s(elId, val) {
                var el = document.getElementById(elId);
                if (el) el.value = val != null ? val : '';
                else console.warn('[pedidos.js] ⚠️ Campo ausente:', elId);
            }

            var tituloEl = document.getElementById('detalhe-titulo');
            if (tituloEl) tituloEl.textContent = _formatarIdServico(id);

            _s('det-pedido-id',      _formatarIdServico(id));
            _s('det-data',           _formatarDataExibicao(_extrairDataPedido(pedido)));
            _s('det-horario',        _resolverHoraPedido(pedido));
            _s('det-contato',        pedido.contato    || '—');
            _s('det-cliente',        _resolverNomeCliente(pedido));
            _s('det-mercadoria',     pedido.mercadoria  || '—');
            _s('det-retorno',        pedido.retorno     || 'Não');
            _s('det-prioridade',     pedido.prioridade  || '0');
            _s('det-de',             pedido.de          || '—');
            _s('det-para',           pedido.para        || '—');
            _s('det-motoboy',        pedido.motoboy     || '—');
            _s('det-status',         _normalizarStatus(pedido.status));
            _s('det-valor-original', _formatarMoeda(valor));
            _s('det-taxa-espera',    _formatarMoeda(taxaNum));
            _s('det-valor-final',    _formatarMoeda(finalNum));
            _s('det-espera-tipo',    pedido.espera_tipo    || 'sem_espera');
            _s('det-espera-minutos', pedido.espera_minutos || '0');
            _s('det-obs',            pedido.observacao     || '');

            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        });
    };

    window.editarPedido = function (id) {
        window.pedidosState.emAcao = true;

        var pedido = (window.AppRDO.pedidosCache || []).find(function (p) {
            return String(p.id || p._id || '').trim() === String(id).trim();
        });
        if (!pedido) { console.error('[pedidos.js] ❌ Pedido não encontrado:', id); return; }

        function _preencherEAbrir() {
            var modalEl = document.getElementById('modalEditarPedido');
            if (!modalEl) { console.error('[pedidos.js] ❌ #modalEditarPedido não encontrado'); return; }

            document.querySelectorAll('.modal.show').forEach(function (m) {
                var inst = bootstrap.Modal.getInstance(m);
                if (inst) inst.hide();
            });

            function _s(elId, val) {
                var el = document.getElementById(elId);
                if (el) el.value = val != null ? String(val) : '';
                else console.warn('[pedidos.js] ⚠️ Campo ausente:', elId);
            }

            var valor = _resolverValor(pedido);

            _s('edit-pedido-id',            id);
            _s('edit-valor-base',           valor);
            _s('edit-solicitante',          pedido.solicitante || '');
            _s('edit-contato',              pedido.contato     || '');
            _s('edit-data',                 _formatarDataExibicao(_extrairDataPedido(pedido)));
            _s('edit-horario',              _resolverHoraPedido(pedido));
            _s('edit-de',                   pedido.de          || '');
            _s('edit-para',                 pedido.para        || '');
            _s('edit-obs',                  pedido.observacao  || '');
            _s('edit-valor-pedido-display', _formatarMoeda(valor));
            _s('edit-espera-tipo',          pedido.espera_tipo    || 'sem_espera');
            _s('edit-espera-minutos',       pedido.espera_minutos || '');

            var tituloEl = document.getElementById('editar-titulo');
            if (tituloEl) tituloEl.textContent = _formatarIdServico(id);

            var errEl = document.getElementById('edit-error-msg');
            if (errEl) errEl.classList.add('d-none');

            if (window.RDO_PEDIDOS && typeof window.RDO_PEDIDOS.calcularEspera === 'function')
                window.RDO_PEDIDOS.calcularEspera();

            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }

        if (document.getElementById('modalEditarPedido')) {
            _preencherEAbrir();
            return;
        }

        if (typeof window.loadModal === 'function') {
            window.loadModal('form_pedidos.html').then(function (ok) {
                if (!ok) { console.error('[pedidos.js] ❌ loadModal falhou'); return; }
                _preencherEAbrir();
            });
        } else {
            console.error('[pedidos.js] ❌ window.loadModal não definido');
        }
    };

    window.RDO_PEDIDOS = window.RDO_PEDIDOS || {};

    window.RDO_PEDIDOS.removerDoCache = function (id) {
        if (!window.AppRDO || !Array.isArray(window.AppRDO.pedidosCache)) return;
        var idStr = String(id || '').trim();
        window.AppRDO.pedidosCache = window.AppRDO.pedidosCache.filter(function (p) {
            return String(p.id || '').trim() !== idStr;
        });
        window.pedidosState.dadosCarregados = false;
        window.pedidosState.emAcao = true;
        if (!window.pedidosState.isFetching) _fetchPedidos();
    };

    window.RDO_PEDIDOS._renderizarTabelaPublico = function () {
        window.pedidosState.emAcao = true;
        _renderizarTabela(window.AppRDO.pedidosCache || []);
    };

    window.RDO_PEDIDOS.atualizarStatusLocal = function (pedidoId, statusFormatado, motoboyNome) {
        var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var pedido = cache.find(function (p) { return String(p.id || '').trim() === String(pedidoId || '').trim(); });
        if (!pedido) return;
        pedido.status = statusFormatado;
        if (motoboyNome) pedido.motoboy = motoboyNome;
        _renderizarTabela(window.AppRDO.pedidosCache);
    };

    window.RDO_PEDIDOS.calcularEspera = function () {
        var FRANQUIA_MIN = 10;
        var TARIFA_MIN   = 0.60;

        var tipo      = (document.getElementById('edit-espera-tipo')     || {}).value || 'sem_espera';
        var minutos   = parseInt((document.getElementById('edit-espera-minutos') || {}).value || '0', 10) || 0;
        var valorBase = _parseMoeda((document.getElementById('edit-valor-base') || {}).value);

        var boxMin    = document.getElementById('box-espera-minutos');
        var boxResumo = document.getElementById('box-espera-resumo');
        var elFinal   = document.getElementById('edit-espera-valor-final');

        if (boxMin) boxMin.style.display = tipo === 'sem_espera' ? 'none' : 'block';

        if (tipo === 'sem_espera' || minutos <= 0) {
            if (elFinal)   elFinal.textContent = _formatarMoeda(valorBase);
            if (boxResumo) boxResumo.style.display = 'none';
            return;
        }

        var pontos        = tipo === 'ambos' ? 2 : 1;
        var franquiaTotal = FRANQUIA_MIN * pontos;
        var excedente     = Math.max(0, minutos - franquiaTotal);
        var taxa          = excedente * TARIFA_MIN;
        var total         = valorBase + taxa;

        if (elFinal) elFinal.textContent = _formatarMoeda(total);

        function _setTxt(elId, val) {
            var el = document.getElementById(elId);
            if (el) el.textContent = val;
        }
        _setTxt('resumo-valor-original', _formatarMoeda(valorBase));
        _setTxt('resumo-minutos',        excedente + ' min');
        _setTxt('resumo-tarifa',         'R$ ' + TARIFA_MIN.toFixed(2).replace('.', ','));
        _setTxt('resumo-taxa',           _formatarMoeda(taxa));
        _setTxt('resumo-total',          _formatarMoeda(total));

        if (boxResumo) boxResumo.style.display = excedente > 0 ? 'block' : 'none';
    };

    function _registrarEventosEventBus() {
        if (typeof window.EventBus === 'undefined') { setTimeout(_registrarEventosEventBus, 300); return; }

        window.EventBus.on('pedido:excluido', function (dados) {
            console.log('[pedidos.js] 📡 pedido:excluido', dados.id);
            window.RDO_PEDIDOS.removerDoCache(dados.id);
        });

        window.EventBus.on('pedido:adicionado', function (novoPedido) {
            console.log('[pedidos.js] 📡 pedido:adicionado', novoPedido);
            if (!window.AppRDO || !Array.isArray(window.AppRDO.pedidosCache)) return;
            window.AppRDO.pedidosCache.push(novoPedido);
            _renderizarTabela(window.AppRDO.pedidosCache);
        });
    }

    window.initPedidos = function () {
        console.log('[pedidos.js] ========== initPedidos ==========');
        if (!document.getElementById('corpo-tabela-pedidos')) {
            console.warn('[pedidos.js] Tabela não encontrada — abortando init');
            return;
        }
        window.pedidosState.paginaAtual     = 1;
        window.pedidosState.isFetching      = false;
        window.pedidosState.dadosCarregados = false;
        window.pedidosState.emAcao          = false;
        if (window.pedidosState.intervaloId) clearInterval(window.pedidosState.intervaloId);
        _bind();
        _registrarEventos();
        _registrarEventosEventBus();
        _fetchPedidos();
        console.log('[pedidos.js] Pronto!');
    };

    console.log('[pedidos.js] Script carregado e pronto.');
})();
