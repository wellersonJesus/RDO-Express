console.log('[relatorios.js] ========== SCRIPT CARREGADO ==========');

(function () {
    'use strict';

    window.relatoriosState = {
        isFetching: false,
        tabAtiva: 'motoboys',
        modalCarregado: false,
        colaboradores: [],
        clientes: []
    };

    window.AppRDO = window.AppRDO || {};
    window.AppRDO.relatoriosCache = {
        motoboys: [],
        clientes: [],
        financeiro: [],
        global: []
    };

    var relDadosAtual = null;
    var relTipoAtual = null;

    var els = {
        btnSync: null,
        iconSync: null,
        tabs: [],
        tabContents: [],
        selectMotoboy: null,
        selectCliente: null
    };

    function _bind() {
        els.btnSync = document.getElementById('btn-sync-relatorio');
        els.iconSync = document.getElementById('sync-icon-relatorio');
        els.tabs = document.querySelectorAll('.rel-tab');
        els.tabContents = document.querySelectorAll('.rel-tab-content');
        els.selectMotoboy = document.getElementById('rel-mb-select');
        els.selectCliente = document.getElementById('rel-cli-select');

        if (!els.btnSync) {
            console.error('[relatorios.js] ❌ btn-sync-relatorio não encontrado');
            return false;
        }
        return true;
    }

    function _spinOn() {
        if (els.btnSync) {
            els.btnSync.classList.add('syncing');
            els.btnSync.disabled = true;
        }
        if (els.iconSync) els.iconSync.classList.add('spinner-rotate');
    }

    function _spinOff() {
        setTimeout(function () {
            if (els.btnSync) {
                els.btnSync.classList.remove('syncing');
                els.btnSync.disabled = false;
            }
            if (els.iconSync) els.iconSync.classList.remove('spinner-rotate');
        }, 500);
    }

    function _mostrarLoadingLista(listaId) {
        var lista = document.getElementById(listaId);
        if (!lista) return;

        lista.innerHTML = `
            <div class="rel-lista-loading">
                <i class="bi bi-arrow-repeat spinner-rotate"></i>
                <div class="rel-dots">
                    <span class="rel-dot"></span>
                    <span class="rel-dot"></span>
                    <span class="rel-dot"></span>
                </div>
                <div class="rel-lista-loading-text">Buscando relatórios<span class="rel-loading-dots"></span></div>
            </div>
        `;
    }

    function _mostrarVazioLista(listaId) {
        var lista = document.getElementById(listaId);
        if (!lista) return;

        lista.innerHTML = `
            <div class="rel-lista-vazio">
                <i class="bi bi-inbox"></i>
                <span>Nenhum relatório salvo ainda.</span>
            </div>
        `;
    }

    function _renderizarLista(tipo) {
        var listaId = 'rel-' + tipo + '-lista';
        var lista = document.getElementById(listaId);
        if (!lista) return;

        var relatorios = window.AppRDO.relatoriosCache[tipo] || [];

        if (relatorios.length === 0) {
            _mostrarVazioLista(listaId);
            return;
        }

        var html = relatorios.map(function (rel) {
            var id = rel.id || '';
            var nome = rel.nome || 'Relatório sem nome';
            var periodo = rel.periodo_label || 'Período não definido';

            return `
                <div class="rel-lista-item" data-rel-id="${id}">
                    <div class="rel-lista-item-info">
                        <div class="rel-lista-item-nome">${nome}</div>
                        <div class="rel-lista-item-periodo">${periodo}</div>
                    </div>
                    <div class="rel-lista-item-acoes">
                        <button class="rel-lista-btn-visualizar" data-rel-id="${id}" data-rel-tipo="${tipo}">
                            <i class="bi bi-eye"></i> Visualizar
                        </button>
                        <button class="rel-lista-btn-remover" data-rel-id="${id}" data-rel-tipo="${tipo}">
                            <i class="bi bi-trash"></i> Remover
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        lista.innerHTML = html;

        lista.querySelectorAll('.rel-lista-btn-visualizar').forEach(function (btn) {
            btn.onclick = function () {
                var id = btn.getAttribute('data-rel-id');
                var tipo = btn.getAttribute('data-rel-tipo');
                _visualizarRelatorio(id, tipo);
            };
        });

        lista.querySelectorAll('.rel-lista-btn-remover').forEach(function (btn) {
            btn.onclick = function () {
                var id = btn.getAttribute('data-rel-id');
                var tipo = btn.getAttribute('data-rel-tipo');
                _removerRelatorio(id, tipo);
            };
        });
    }

    function _visualizarRelatorio(id, tipo) {
        var relatorios = window.AppRDO.relatoriosCache[tipo] || [];
        var rel = relatorios.find(function (r) { return r.id === id; });

        if (!rel) {
            console.error('[relatorios.js] ❌ Relatório não encontrado:', id);
            return;
        }

        _garantirModal(function (ok) {
            if (!ok) {
                console.error('[relatorios.js] ❌ Falha ao carregar modal');
                return;
            }

            relDadosAtual = rel;
            relTipoAtual = tipo;

            var modal = document.getElementById('rel-modal-overlay');
            var titulo = document.getElementById('rel-modal-titulo');
            var body = document.getElementById('rel-modal-body');

            if (titulo) titulo.textContent = rel.titulo || 'RELATÓRIO';
            if (body) body.innerHTML = rel.html_conteudo || '<p>Sem conteúdo</p>';
            if (modal) modal.style.display = 'flex';
        });
    }

    function _removerRelatorio(id, tipo) {
        if (typeof Swal === 'undefined') {
            if (!confirm('Deseja realmente remover este relatório?')) return;
            _executarRemocao(id, tipo);
        } else {
            Swal.fire({
                title: 'Remover relatório?',
                text: 'Esta ação não pode ser desfeita',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, remover',
                cancelButtonText: 'Cancelar'
            }).then(function (result) {
                if (result.isConfirmed) _executarRemocao(id, tipo);
            });
        }
    }

    function _executarRemocao(id, tipo) {
        API.call('deleterelatorio', { id: id })
            .then(function (res) {
                if (res && res.status === 'error') throw new Error(res.message);

                var cache = window.AppRDO.relatoriosCache[tipo] || [];
                window.AppRDO.relatoriosCache[tipo] = cache.filter(function (r) {
                    return r.id !== id;
                });

                _renderizarLista(tipo);

                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Relatório removido',
                        toast: true,
                        timer: 2000,
                        position: 'top-end',
                        showConfirmButton: false
                    });
                }
            })
            .catch(function (err) {
                console.error('[relatorios.js] ❌ Erro ao remover:', err);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro ao remover',
                        text: err.message
                    });
                }
            });
    }

    function _registrarEventosModal() {
        var fecharBtns = [
            document.getElementById('rel-modal-fechar'),
            document.getElementById('rel-btn-fechar-modal')
        ];

        fecharBtns.forEach(function (btn) {
            if (btn) {
                btn.onclick = function () {
                    var modal = document.getElementById('rel-modal-overlay');
                    if (modal) modal.style.display = 'none';
                };
            }
        });

        var btnSalvar = document.getElementById('rel-btn-salvar');
        if (btnSalvar) btnSalvar.onclick = _salvarRelatorio;

        var btnCopiar = document.getElementById('rel-btn-copiar');
        if (btnCopiar) btnCopiar.onclick = _copiarRelatorio;

        var btnWhats = document.getElementById('rel-btn-whatsapp');
        if (btnWhats) btnWhats.onclick = _enviarWhatsApp;

        var btnEmail = document.getElementById('rel-btn-email');
        if (btnEmail) btnEmail.onclick = _enviarEmail;

        var overlay = document.getElementById('rel-modal-overlay');
        if (overlay) {
            overlay.onclick = function (e) {
                if (e.target === overlay) overlay.style.display = 'none';
            };
        }
    }

    function _garantirModal(callback) {
        if (window.relatoriosState.modalCarregado) {
            callback(true);
            return;
        }

        var container = document.getElementById('modal-relatorio-container');
        if (!container) {
            console.error('[relatorios.js] ❌ Container #modal-relatorio-container não encontrado');
            callback(false);
            return;
        }

        var caminhosPossiveis = [
            'pages/relatorio/form_relatorios.html',
            'app/pages/relatorio/form_relatorios.html',
            './pages/relatorio/form_relatorios.html',
            '../pages/relatorio/form_relatorios.html',
            'pages/relatorio/modal_relatorio.html',
            'app/pages/relatorio/modal_relatorio.html'
        ];

        function tentarProximoCaminho(index) {
            if (index >= caminhosPossiveis.length) {
                console.error('[relatorios.js] ❌ Nenhum caminho válido encontrado');
                _criarModalDinamicamente();
                callback(true);
                return;
            }

            var caminho = caminhosPossiveis[index];
            console.log('[relatorios.js] 🔍 Tentando:', caminho);

            fetch(caminho)
                .then(function (response) {
                    if (!response.ok) {
                        console.warn('[relatorios.js] ⚠️ Não encontrado:', caminho);
                        tentarProximoCaminho(index + 1);
                        return null;
                    }
                    return response.text();
                })
                .then(function (html) {
                    if (!html) return;

                    container.innerHTML = html;

                    setTimeout(function () {
                        var modalEl = document.getElementById('rel-modal-overlay');
                        if (modalEl) {
                            window.relatoriosState.modalCarregado = true;
                            _registrarEventosModal();
                            console.log('[relatorios.js] ✅ Modal carregado de:', caminho);
                            callback(true);
                        } else {
                            console.warn('[relatorios.js] ⚠️ #rel-modal-overlay não encontrado, criando dinamicamente');
                            _criarModalDinamicamente();
                            callback(true);
                        }
                    }, 150);
                })
                .catch(function (err) {
                    console.error('[relatorios.js] ❌ Erro ao tentar', caminho, ':', err);
                    tentarProximoCaminho(index + 1);
                });
        }

        tentarProximoCaminho(0);
    }

    function _criarModalDinamicamente() {
        var container = document.getElementById('modal-relatorio-container');
        if (!container) return;

        var modalHTML = `
            <div id="rel-modal-overlay" class="rel-modal-overlay" style="display:none;">
                <div class="rel-modal-content">
                    <div class="rel-modal-header">
                        <h5 id="rel-modal-titulo">RELATÓRIO</h5>
                        <button id="rel-modal-fechar" class="rel-modal-close">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div class="rel-modal-body" id="rel-modal-body">
                        <p>Carregando...</p>
                    </div>
                    <div class="rel-modal-footer">
                        <button id="rel-btn-salvar" class="btn btn-success">
                            <i class="bi bi-save me-1"></i> Salvar
                        </button>
                        <button id="rel-btn-copiar" class="btn btn-secondary">
                            <i class="bi bi-clipboard me-1"></i> Copiar
                        </button>
                        <button id="rel-btn-whatsapp" class="btn btn-success">
                            <i class="bi bi-whatsapp me-1"></i> WhatsApp
                        </button>
                        <button id="rel-btn-email" class="btn btn-primary">
                            <i class="bi bi-envelope me-1"></i> Email
                        </button>
                        <button id="rel-btn-fechar-modal" class="btn btn-outline-secondary">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = modalHTML;
        window.relatoriosState.modalCarregado = true;
        _registrarEventosModal();
        console.log('[relatorios.js] ✅ Modal criado dinamicamente');
    }

    function _salvarRelatorio() {
        if (!relDadosAtual || !relTipoAtual) {
            console.warn('[relatorios.js] ⚠️ Nenhum relatório para salvar');
            return;
        }

        var btnSalvar = document.getElementById('rel-btn-salvar');
        if (btnSalvar) {
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
        }

        var payload = {
            id: relDadosAtual.id,
            tipo: relTipoAtual,
            nome: relDadosAtual.nome,
            periodo_inicio: relDadosAtual.periodo_inicio,
            periodo_fim: relDadosAtual.periodo_fim,
            periodo_label: relDadosAtual.periodo_label,
            titulo: relDadosAtual.titulo,
            html_conteudo: relDadosAtual.html_conteudo,
            texto_plano: relDadosAtual.texto_plano,
            motoboy_id: relDadosAtual.motoboy_id || null,
            cliente_id: relDadosAtual.cliente_id || null,
            fin_tipo: relDadosAtual.fin_tipo || null
        };

        console.log('[relatorios.js] 💾 Salvando:', payload);

        API.call('addrelatorio', payload)
            .then(function (res) {
                console.log('[relatorios.js] 📦 Resposta addrelatorio:', res);

                if (res && res.status === 'error') throw new Error(res.message);

                if (res && res.id) relDadosAtual.id = res.id;

                var cache = window.AppRDO.relatoriosCache[relTipoAtual] || [];
                var existe = cache.findIndex(function (r) { return r.id === relDadosAtual.id; });

                if (existe >= 0) {
                    cache[existe] = relDadosAtual;
                } else {
                    cache.push(relDadosAtual);
                }

                window.AppRDO.relatoriosCache[relTipoAtual] = cache;
                _renderizarLista(relTipoAtual);

                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Relatório salvo!',
                        toast: true,
                        timer: 2000,
                        position: 'top-end',
                        showConfirmButton: false
                    });
                }

                var modal = document.getElementById('rel-modal-overlay');
                if (modal) modal.style.display = 'none';
            })
            .catch(function (err) {
                console.error('[relatorios.js] ❌ Erro ao salvar:', err);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro ao salvar',
                        text: err.message
                    });
                }
            })
            .finally(function () {
                if (btnSalvar) {
                    btnSalvar.disabled = false;
                    btnSalvar.innerHTML = '<i class="bi bi-save"></i> Salvar';
                }
            });
    }

    function _copiarRelatorio() {
        if (!relDadosAtual) return;
        var texto = relDadosAtual.texto_plano || relDadosAtual.html_conteudo || '';
        navigator.clipboard.writeText(texto).then(function () {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Copiado!',
                    toast: true,
                    timer: 1500,
                    position: 'top-end',
                    showConfirmButton: false
                });
            }
        });
    }

    function _enviarWhatsApp() {
        if (!relDadosAtual) return;
        var texto = encodeURIComponent(relDadosAtual.texto_plano || 'Relatório RDO Express');
        window.open('https://wa.me/?text=' + texto, '_blank');
    }

    function _enviarEmail() {
        if (!relDadosAtual) return;
        var assunto = encodeURIComponent(relDadosAtual.titulo || 'Relatório RDO Express');
        var corpo = encodeURIComponent(relDadosAtual.texto_plano || '');
        window.location.href = 'mailto:?subject=' + assunto + '&body=' + corpo;
    }

    function _gerarIdUnico() {
        return 'rel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    function _carregarColaboradores() {
        if (!els.selectMotoboy) {
            console.log('[relatorios.js] ⚠️ Select de motoboys não encontrado');
            return Promise.resolve([]);
        }

        console.log('[relatorios.js] 🔄 Carregando colaboradores...');

        return API.call('getcolaboradores')
            .then(function (res) {
                console.log('[relatorios.js] 📦 Resposta getcolaboradores:', res);

                var colaboradores = [];

                if (Array.isArray(res)) {
                    colaboradores = res;
                } else if (res && Array.isArray(res.colaboradores)) {
                    colaboradores = res.colaboradores;
                } else if (res && Array.isArray(res.data)) {
                    colaboradores = res.data;
                }

                window.relatoriosState.colaboradores = colaboradores;

                var motoboys = colaboradores.filter(function (c) {
                    var funcao = String(c.colaborador || c.funcao || c.cargo || c.tipo || '').toLowerCase();
                    var status = String(c.status || '').toUpperCase();
                    return (funcao.includes('motoboy') || funcao.includes('entregador')) && status === 'TRUE';
                });

                console.log('[relatorios.js] 🏍️ Motoboys ativos:', motoboys.length, 'de', colaboradores.length);

                if (els.selectMotoboy) {
                    els.selectMotoboy.innerHTML = '<option value="__todos__">Todos os motoboys</option>';

                    motoboys.forEach(function (mb) {
                        var opt = document.createElement('option');
                        opt.value = mb.id || mb.id_colaborador || mb.colaborador_id;
                        opt.textContent = mb.username || mb.nome || mb.nome_completo || 'Sem nome';
                        els.selectMotoboy.appendChild(opt);
                    });

                    console.log('[relatorios.js] ✅ Select preenchido com', motoboys.length, 'motoboys');
                }

                return motoboys;
            })
            .catch(function (err) {
                console.error('[relatorios.js] ❌ Erro em getcolaboradores:', err);
                console.log('[relatorios.js] 🔄 Tentando endpoint alternativo: getusuarios');

                return API.call('getusuarios')
                    .then(function (res2) {
                        console.log('[relatorios.js] 📦 Resposta getusuarios:', res2);

                        var usuarios = Array.isArray(res2) ? res2 : (res2.usuarios || res2.data || []);

                        var motoboys = usuarios.filter(function (u) {
                            var tipo = String(u.tipo || u.perfil || u.funcao || u.cargo || '').toLowerCase();
                            return tipo.includes('motoboy') || tipo.includes('entregador');
                        });

                        console.log('[relatorios.js] 🏍️ Motoboys (via getusuarios):', motoboys.length);

                        if (els.selectMotoboy) {
                            els.selectMotoboy.innerHTML = '<option value="__todos__">Todos os motoboys</option>';

                            motoboys.forEach(function (mb) {
                                var opt = document.createElement('option');
                                opt.value = mb.id || mb.usuario_id;
                                opt.textContent = mb.nome || mb.usuario || mb.username || 'Sem nome';
                                els.selectMotoboy.appendChild(opt);
                            });

                            console.log('[relatorios.js] ✅ Select preenchido via fallback');
                        }

                        return motoboys;
                    })
                    .catch(function (err2) {
                        console.error('[relatorios.js] ❌ Fallback falhou:', err2);
                        if (els.selectMotoboy) {
                            els.selectMotoboy.innerHTML = '<option value="__todos__">Todos os motoboys</option>';
                        }
                        return [];
                    });
            });
    }

    function _carregarClientes() {
        if (!els.selectCliente) {
            console.log('[relatorios.js] ⚠️ Select de clientes não encontrado');
            return Promise.resolve([]);
        }

        console.log('[relatorios.js] 🔄 Carregando clientes...');

        return API.call('getclientes')
            .then(function (res) {
                console.log('[relatorios.js] 📦 Resposta getclientes:', res);

                var clientes = [];

                if (Array.isArray(res)) {
                    clientes = res;
                } else if (res && Array.isArray(res.clientes)) {
                    clientes = res.clientes;
                } else if (res && Array.isArray(res.data)) {
                    clientes = res.data;
                }

                window.relatoriosState.clientes = clientes;

                if (els.selectCliente) {
                    els.selectCliente.innerHTML = '<option value="__todos__">Todos os clientes</option>';

                    clientes.forEach(function (cli) {
                        var opt = document.createElement('option');
                        opt.value = cli.id || cli.cliente_id;
                        opt.textContent = cli.username || cli.nome || cli.razao_social || cli.nome_fantasia || 'Sem nome';
                        els.selectCliente.appendChild(opt);
                    });

                    console.log('[relatorios.js] ✅ Select de clientes preenchido:', clientes.length);
                }

                return clientes;
            })
            .catch(function (err) {
                console.error('[relatorios.js] ❌ Erro ao carregar clientes:', err);
                if (els.selectCliente) {
                    els.selectCliente.innerHTML = '<option value="__todos__">Todos os clientes</option>';
                }
                return [];
            });
    }

    function _gerarRelatorioMotoboy() {
        var dataInicio = document.getElementById('rel-mb-data-inicio');
        var dataFim = document.getElementById('rel-mb-data-fim');
        var selectMotoboy = document.getElementById('rel-mb-select');

        if (!dataInicio || !dataFim || !selectMotoboy) {
            console.error('[relatorios.js] ❌ Elementos não encontrados');
            return;
        }

        var inicio = dataInicio.value;
        var fim = dataFim.value;
        var motoboyId = selectMotoboy.value;

        if (!inicio || !fim) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Selecione o período', confirmButtonColor: '#dc3545' });
            } else {
                alert('Selecione o período');
            }
            return;
        }

        var btn = document.getElementById('btn-gerar-rel-motoboy');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Gerando...';
        }

        API.call('getpedidos')
            .then(function (pedidos) {
                var lista = Array.isArray(pedidos) ? pedidos : [];
                var nome = selectMotoboy.options[selectMotoboy.selectedIndex].text;

                var pedidosFiltrados = lista.filter(function (p) {
                    var dataPedido = new Date(p.data_criacao || p.created_at || '');
                    var dataIni = new Date(inicio);
                    var dataFi = new Date(fim);

                    var dentroP = dataPedido >= dataIni && dataPedido <= dataFi;

                    if (motoboyId === '__todos__') return dentroP;

                    var motoboyPedido = String(p.motoboy || p.motoboy_id || '').trim();
                    var motoboyMatch = motoboyPedido.includes(nome) || motoboyPedido === motoboyId;

                    return dentroP && motoboyMatch;
                });

                console.log('[relatorios.js] 📊 Pedidos filtrados:', pedidosFiltrados.length);

                var totalPedidos = pedidosFiltrados.length;
                var concluidos = pedidosFiltrados.filter(function (p) {
                    return String(p.status || '').toUpperCase().includes('CONCLUIDO') || 
                           String(p.status || '').toUpperCase().includes('CONCLUÍDO');
                }).length;
                var cancelados = pedidosFiltrados.filter(function (p) {
                    return String(p.status || '').toUpperCase().includes('CANCELADO');
                }).length;

                var valorTotal = pedidosFiltrados.reduce(function (acc, p) {
                    return acc + (parseFloat(p.valor_total || p.valor_final || 0) || 0);
                }, 0);

                var distanciaTotal = pedidosFiltrados.reduce(function (acc, p) {
                    return acc + (parseFloat(String(p.distancia || '0').replace(',', '.')) || 0);
                }, 0);

                var titulo = 'Relatório de Motoboys - ' + inicio + ' a ' + fim;

                var htmlConteudo = `
                    <div class="relatorio-wrapper">
                        <h4 class="relatorio-titulo">Relatório de Motoboys</h4>
                        <div class="relatorio-info">
                            <p><strong>Motoboy:</strong> ${nome}</p>
                            <p><strong>Período:</strong> ${inicio} a ${fim}</p>
                        </div>
                        <div class="relatorio-estatisticas">
                            <div class="stat-card">
                                <i class="bi bi-box-seam"></i>
                                <div class="stat-valor">${totalPedidos}</div>
                                <div class="stat-label">Total de Pedidos</div>
                            </div>
                            <div class="stat-card">
                                <i class="bi bi-check-circle-fill text-success"></i>
                                <div class="stat-valor">${concluidos}</div>
                                <div class="stat-label">Concluídos</div>
                            </div>
                            <div class="stat-card">
                                <i class="bi bi-x-circle-fill text-danger"></i>
                                <div class="stat-valor">${cancelados}</div>
                                <div class="stat-label">Cancelados</div>
                            </div>
                            <div class="stat-card">
                                <i class="bi bi-signpost-split-fill text-primary"></i>
                                <div class="stat-valor">${distanciaTotal.toFixed(2)} km</div>
                                <div class="stat-label">Distância Total</div>
                            </div>
                            <div class="stat-card">
                                <i class="bi bi-cash-stack text-success"></i>
                                <div class="stat-valor">${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                <div class="stat-label">Valor Total</div>
                            </div>
                        </div>
                    </div>
                `;

                var textoPlano = `
RELATÓRIO DE MOTOBOYS
Motoboy: ${nome}
Período: ${inicio} a ${fim}

ESTATÍSTICAS:
- Total de Pedidos: ${totalPedidos}
- Concluídos: ${concluidos}
- Cancelados: ${cancelados}
- Distância Total: ${distanciaTotal.toFixed(2)} km
- Valor Total: ${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                `.trim();

                relDadosAtual = {
                    id: _gerarIdUnico(),
                    tipo: 'motoboys',
                    nome: nome,
                    motoboy_id: motoboyId !== '__todos__' ? motoboyId : null,
                    periodo_inicio: inicio,
                    periodo_fim: fim,
                    periodo_label: inicio + ' a ' + fim,
                    titulo: titulo,
                    html_conteudo: htmlConteudo,
                    texto_plano: textoPlano
                };

                relTipoAtual = 'motoboys';

                _garantirModal(function (ok) {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="bi bi-file-earmark-text me-1"></i>Gerar';
                    }

                    if (!ok) return;

                    var modal = document.getElementById('rel-modal-overlay');
                    var tituloEl = document.getElementById('rel-modal-titulo');
                    var body = document.getElementById('rel-modal-body');

                    if (tituloEl) tituloEl.textContent = titulo;
                    if (body) body.innerHTML = htmlConteudo;
                    if (modal) modal.style.display = 'flex';
                });
            })
            .catch(function (err) {
                console.error('[relatorios.js] ❌ Erro ao gerar relatório:', err);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-file-earmark-text me-1"></i>Gerar';
                }
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível gerar o relatório' });
                }
            });
    }

    function _gerarRelatorioCliente() {
        var dataInicio = document.getElementById('rel-cli-data-inicio');
        var dataFim = document.getElementById('rel-cli-data-fim');
        var selectCliente = document.getElementById('rel-cli-select');

        if (!dataInicio || !dataFim || !selectCliente) {
            console.error('[relatorios.js] ❌ Elementos não encontrados');
            return;
        }

        var inicio = dataInicio.value;
        var fim = dataFim.value;
        var clienteId = selectCliente.value;

        if (!inicio || !fim) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Selecione o período' });
            } else {
                alert('Selecione o período');
            }
            return;
        }

        var btn = document.getElementById('btn-gerar-rel-cliente');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Gerando...';
        }

        API.call('getpedidos')
            .then(function (pedidos) {
                var lista = Array.isArray(pedidos) ? pedidos : [];
                var nome = selectCliente.options[selectCliente.selectedIndex].text;

                var pedidosFiltrados = lista.filter(function (p) {
                    var dataPedido = new Date(p.data_criacao || p.created_at || '');
                    var dataIni = new Date(inicio);
                    var dataFi = new Date(fim);

                    var dentroP = dataPedido >= dataIni && dataPedido <= dataFi;

                    if (clienteId === '__todos__') return dentroP;

                    return dentroP && String(p.id_cliente || '').trim() === String(clienteId).trim();
                });

                var totalPedidos = pedidosFiltrados.length;
                var valorTotal = pedidosFiltrados.reduce(function (acc, p) {
                    return acc + (parseFloat(p.valor_total || p.valor_final || 0) || 0);
                }, 0);

                var titulo = 'Relatório de Clientes - ' + inicio + ' a ' + fim;

                var htmlConteudo = `
                    <div class="relatorio-wrapper">
                        <h4>Relatório de Clientes</h4>
                        <p><strong>Cliente:</strong> ${nome}</p>
                        <p><strong>Período:</strong> ${inicio} a ${fim}</p>
                        <p><strong>Total de Pedidos:</strong> ${totalPedidos}</p>
                        <p><strong>Valor Total:</strong> ${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                `;

                var textoPlano = `Relatório de Clientes\nCliente: ${nome}\nPeríodo: ${inicio} a ${fim}\nTotal: ${totalPedidos} pedidos`;

                relDadosAtual = {
                    id: _gerarIdUnico(),
                    tipo: 'clientes',
                    nome: nome,
                    cliente_id: clienteId !== '__todos__' ? clienteId : null,
                    periodo_inicio: inicio,
                    periodo_fim: fim,
                    periodo_label: inicio + ' a ' + fim,
                    titulo: titulo,
                    html_conteudo: htmlConteudo,
                    texto_plano: textoPlano
                };

                relTipoAtual = 'clientes';

                _garantirModal(function (ok) {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="bi bi-file-earmark-text me-1"></i>Gerar';
                    }

                    if (!ok) return;

                    var modal = document.getElementById('rel-modal-overlay');
                    var tituloEl = document.getElementById('rel-modal-titulo');
                    var body = document.getElementById('rel-modal-body');

                    if (tituloEl) tituloEl.textContent = titulo;
                    if (body) body.innerHTML = htmlConteudo;
                    if (modal) modal.style.display = 'flex';
                });
            })
            .catch(function (err) {
                console.error('[relatorios.js] ❌ Erro:', err);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-file-earmark-text me-1"></i>Gerar';
                }
            });
    }

    function _gerarRelatorioFinanceiro() {
        var dataInicio = document.getElementById('rel-fin-data-inicio');
        var dataFim = document.getElementById('rel-fin-data-fim');
        var selectTipo = document.getElementById('rel-fin-tipo');

        if (!dataInicio || !dataFim || !selectTipo) {
            console.error('[relatorios.js] ❌ Elementos não encontrados');
            return;
        }

        var inicio = dataInicio.value;
        var fim = dataFim.value;
        var tipo = selectTipo.value;

        if (!inicio || !fim) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Selecione o período' });
            } else {
                alert('Selecione o período');
            }
            return;
        }

        var btn = document.getElementById('btn-gerar-rel-financeiro');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Gerando...';
        }

        setTimeout(function () {
            var tipoLabel = tipo === 'entrada' ? 'Receitas' : tipo === 'saida' ? 'Despesas' : 'Todos';
            var titulo = 'Relatório Financeiro - ' + tipoLabel + ' - ' + inicio + ' a ' + fim;

            var htmlConteudo = `<h4>Relatório Financeiro</h4><p><strong>Tipo:</strong> ${tipoLabel}</p><p><strong>Período:</strong> ${inicio} a ${fim}</p>`;
            var textoPlano = `Relatório Financeiro\nTipo: ${tipoLabel}\nPeríodo: ${inicio} a ${fim}`;

            relDadosAtual = {
                id: _gerarIdUnico(),
                tipo: 'financeiro',
                nome: tipoLabel,
                fin_tipo: tipo,
                periodo_inicio: inicio,
                periodo_fim: fim,
                periodo_label: inicio + ' a ' + fim,
                titulo: titulo,
                html_conteudo: htmlConteudo,
                texto_plano: textoPlano
            };

            relTipoAtual = 'financeiro';

            _garantirModal(function (ok) {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-file-earmark-text me-1"></i>Gerar';
                }

                if (!ok) return;

                var modal = document.getElementById('rel-modal-overlay');
                var tituloEl = document.getElementById('rel-modal-titulo');
                var body = document.getElementById('rel-modal-body');

                if (tituloEl) tituloEl.textContent = titulo;
                if (body) body.innerHTML = htmlConteudo;
                if (modal) modal.style.display = 'flex';
            });
        }, 600);
    }

    function _gerarRelatorioGlobal() {
        var dataInicio = document.getElementById('rel-glob-data-inicio');
        var dataFim = document.getElementById('rel-glob-data-fim');

        if (!dataInicio || !dataFim) {
            console.error('[relatorios.js] ❌ Elementos não encontrados');
            return;
        }

        var inicio = dataInicio.value;
        var fim = dataFim.value;

        if (!inicio || !fim) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Selecione o período' });
            } else {
                alert('Selecione o período');
            }
            return;
        }

        var btn = document.getElementById('btn-gerar-rel-global');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Gerando...';
        }

        setTimeout(function () {
            var titulo = 'Relatório Global - ' + inicio + ' a ' + fim;

            var htmlConteudo = `<h4>Relatório Global</h4><p><strong>Período:</strong> ${inicio} a ${fim}</p>`;
            var textoPlano = `Relatório Global\nPeríodo: ${inicio} a ${fim}`;

            relDadosAtual = {
                id: _gerarIdUnico(),
                tipo: 'global',
                nome: 'Relatório Global',
                periodo_inicio: inicio,
                periodo_fim: fim,
                periodo_label: inicio + ' a ' + fim,
                titulo: titulo,
                html_conteudo: htmlConteudo,
                texto_plano: textoPlano
            };

            relTipoAtual = 'global';

            _garantirModal(function (ok) {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-file-earmark-text me-1"></i>Gerar';
                }

                if (!ok) return;

                var modal = document.getElementById('rel-modal-overlay');
                var tituloEl = document.getElementById('rel-modal-titulo');
                var body = document.getElementById('rel-modal-body');

                if (tituloEl) tituloEl.textContent = titulo;
                if (body) body.innerHTML = htmlConteudo;
                if (modal) modal.style.display = 'flex';
            });
        }, 600);
    }

    async function _fetchRelatorios() {
        if (window.relatoriosState.isFetching) {
            console.log('[relatorios.js] ⚠️ Já buscando');
            return;
        }

        window.relatoriosState.isFetching = true;
        _spinOn();

        ['motoboys', 'clientes', 'financeiro', 'global'].forEach(function (tipo) {
            _mostrarLoadingLista('rel-' + tipo + '-lista');
        });

        try {
            var res = await API.call('getrelatorios');
            console.log('[relatorios.js] 📦 Resposta getrelatorios:', res);

            var dados = [];
            if (Array.isArray(res)) {
                dados = res;
            } else if (res && Array.isArray(res.relatorios)) {
                dados = res.relatorios;
            } else if (res && Array.isArray(res.data)) {
                dados = res.data;
            }

            window.AppRDO.relatoriosCache = {
                motoboys: dados.filter(function (r) { return r.tipo === 'motoboys'; }),
                clientes: dados.filter(function (r) { return r.tipo === 'clientes'; }),
                financeiro: dados.filter(function (r) { return r.tipo === 'financeiro'; }),
                global: dados.filter(function (r) { return r.tipo === 'global'; })
            };

            console.log('[relatorios.js] ✅ Cache:', {
                motoboys: window.AppRDO.relatoriosCache.motoboys.length,
                clientes: window.AppRDO.relatoriosCache.clientes.length,
                financeiro: window.AppRDO.relatoriosCache.financeiro.length,
                global: window.AppRDO.relatoriosCache.global.length
            });

            ['motoboys', 'clientes', 'financeiro', 'global'].forEach(_renderizarLista);

        } catch (err) {
            console.error('[relatorios.js] ❌ Erro:', err);
            ['motoboys', 'clientes', 'financeiro', 'global'].forEach(function (tipo) {
                _mostrarVazioLista('rel-' + tipo + '-lista');
            });
        } finally {
            window.relatoriosState.isFetching = false;
            _spinOff();
        }
    }

    function _registrarEventos() {
        if (els.btnSync) {
            els.btnSync.onclick = function () {
                console.log('[relatorios.js] 🔄 Sync');
                _fetchRelatorios();
            };
        }

        els.tabs.forEach(function (tab) {
            tab.onclick = function (e) {
                e.preventDefault();
                var tipo = tab.getAttribute('data-rel-tab');

                els.tabs.forEach(function (t) { t.classList.remove('active'); });
                els.tabContents.forEach(function (c) { c.classList.remove('active'); });

                tab.classList.add('active');
                var content = document.getElementById('rel-tab-content-' + tipo);
                if (content) content.classList.add('active');

                window.relatoriosState.tabAtiva = tipo;
            };
        });

        var btnMB = document.getElementById('btn-gerar-rel-motoboy');
        if (btnMB) btnMB.onclick = _gerarRelatorioMotoboy;

        var btnCli = document.getElementById('btn-gerar-rel-cliente');
        if (btnCli) btnCli.onclick = _gerarRelatorioCliente;

        var btnFin = document.getElementById('btn-gerar-rel-financeiro');
        if (btnFin) btnFin.onclick = _gerarRelatorioFinanceiro;

        var btnGlob = document.getElementById('btn-gerar-rel-global');
        if (btnGlob) btnGlob.onclick = _gerarRelatorioGlobal;

        console.log('[relatorios.js] ✅ Eventos registrados');
    }

    window.initRelatorios = function () {
        console.log('[relatorios.js] ========== initRelatorios ==========');

        if (!_bind()) {
            console.error('[relatorios.js] ❌ Falha no bind');
            return;
        }

        _registrarEventos();

        Promise.all([
            _carregarColaboradores(),
            _carregarClientes(),
            _fetchRelatorios()
        ]).then(function () {
            console.log('[relatorios.js] ✅ Módulo inicializado');
        }).catch(function (err) {
            console.error('[relatorios.js] ❌ Erro na inicialização:', err);
        });
    };

    console.log('[relatorios.js] ✅ Script carregado');
})();
