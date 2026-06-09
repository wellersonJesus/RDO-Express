window.RDO_PEDIDOS = (function () {

    let _pedidos = [];
    let _isFetching = false;
    let _bsModal = null;

    function _el(id) {
        return document.getElementById(id);
    }

    function _extrairStatusPuro(statusBruto) {
        const s = String(statusBruto || '').trim();
        if (s.includes('/')) return s.split('/').pop().trim().toUpperCase();
        return s.toUpperCase();
    }

    function _badgeStatus(statusBruto) {
        const puro = _extrairStatusPuro(statusBruto);

        if (puro === 'CONCLUIDO' || puro === 'CONCLUÍDO') {
            return '<span class="status-badge bg-status-done"><i class="bi bi-check-circle-fill"></i> Concluído</span>';
        }
        if (puro === 'CANCELADO') {
            return '<span class="status-badge bg-status-cancel"><i class="bi bi-x-circle-fill"></i> Cancelado</span>';
        }
        if (puro === 'EM_ROTA' || puro === 'EM ROTA' || String(statusBruto || '').includes('/')) {
            return '<span class="status-badge bg-status-route"><i class="bi bi-bicycle"></i> Em Rota</span>';
        }
        return '<span class="status-badge bg-status-pending"><i class="bi bi-clock"></i> Pendente</span>';
    }

    function _labelPrioridade(val) {
        const v = String(val || '0').trim();
        if (v === '7') return 'Urgente';
        if (v === '5') return 'Agendado';
        return 'Normal';
    }

    function _labelStatusTexto(statusBruto) {
        const puro = _extrairStatusPuro(statusBruto);
        if (puro === 'CONCLUIDO' || puro === 'CONCLUÍDO') return 'Concluído';
        if (puro === 'CANCELADO') return 'Cancelado';
        if (puro === 'EM_ROTA' || puro === 'EM ROTA') return 'Em Rota';
        return 'Pendente';
    }

    function _motoboyNome(pedido) {
        const motoboy = String(pedido.motoboy || '').trim();
        if (motoboy) return motoboy;
        const statusBruto = String(pedido.status || '').trim();
        if (statusBruto.includes('/')) return statusBruto.split('/')[0].trim();
        return '—';
    }

    async function carregarPedidos() {
        if (_isFetching) return;
        _isFetching = true;

        const syncIcon = _el('sync-pedidos');
        const loading = _el('loading-pedidos');
        const empty = _el('empty-pedidos');
        const tbody = _el('tabela-pedidos-body');

        if (syncIcon) syncIcon.classList.add('spinner-rotate');
        if (loading) loading.classList.remove('d-none');
        if (empty) empty.classList.add('d-none');
        if (tbody) tbody.innerHTML = '';

        try {
            const resultado = await API.call('getpedidos');
            _pedidos = Array.isArray(resultado) ? resultado : [];
            renderizarTabela();
        } catch (e) {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger py-4">
                            <i class="bi bi-exclamation-triangle me-1"></i> Erro ao carregar pedidos.
                        </td>
                    </tr>`;
            }
        } finally {
            _isFetching = false;
            if (syncIcon) syncIcon.classList.remove('spinner-rotate');
            if (loading) loading.classList.add('d-none');
        }
    }

    function renderizarTabela() {
        const tbody = _el('tabela-pedidos-body');
        const empty = _el('empty-pedidos');
        if (!tbody) return;

        const filtrados = _aplicarFiltro(_pedidos);

        if (filtrados.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.classList.remove('d-none');
            return;
        }

        if (empty) empty.classList.add('d-none');

        tbody.innerHTML = filtrados.map(p => {
            const id = p.id || '—';
            const solicitante = p.solicitante || '—';
            const horario = p.horario || '—';
            const motoboy = _motoboyNome(p);
            const valor = p.valor_corrida || '—';
            const statusHtml = _badgeStatus(p.status);

            return `
                <tr>
                    <td class="px-3 py-2 fw-bold text-dark">${id}</td>
                    <td class="py-2">${solicitante}</td>
                    <td class="py-2">${horario}</td>
                    <td class="py-2">${motoboy}</td>
                    <td class="py-2 fw-semibold">${valor}</td>
                    <td class="py-2">${statusHtml}</td>
                    <td class="px-3 py-2 text-end">
                        <div class="d-flex gap-1 justify-content-end">
                            <button class="btn-action" onclick="window.RDO_PEDIDOS.abrirDetalhes('${id}')" title="Detalhes">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn-action btn-action-danger" onclick="window.RDO_PEDIDOS.excluirPedido('${id}')" title="Excluir">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    function _aplicarFiltro(lista) {
        const tipo = _el('tipo-filtro')?.value || 'todos';
        const termo = (_el('filtro-pedido')?.value || '').toLowerCase().trim();

        if (!termo) return lista;

        return lista.filter(p => {
            if (tipo === 'id') return String(p.id || '').toLowerCase().includes(termo);
            if (tipo === 'motoboy') return _motoboyNome(p).toLowerCase().includes(termo);
            if (tipo === 'status') return _labelStatusTexto(p.status).toLowerCase().includes(termo);
            if (tipo === 'solicitante') return String(p.solicitante || '').toLowerCase().includes(termo);

            const tudo = [
                p.id, p.solicitante, p.contato, p.horario,
                _motoboyNome(p), p.valor_corrida, _labelStatusTexto(p.status)
            ].join(' ').toLowerCase();
            return tudo.includes(termo);
        });
    }

    function abrirDetalhes(pedidoId) {
        const pedido = _pedidos.find(p => String(p.id).trim() === String(pedidoId).trim());
        if (!pedido) {
            Swal.fire({
                icon: 'warning',
                title: 'Pedido não encontrado',
                text: 'Não foi possível localizar os dados deste pedido.',
                confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
            return;
        }

        const setVal = (id, val) => {
            const el = _el(id);
            if (el) el.value = val || '—';
        };

        _el('detalhe-titulo').textContent = '#' + (pedido.id || '');

        setVal('det-pedido-id', pedido.id);
        setVal('det-solicitante', pedido.solicitante);
        setVal('det-contato', pedido.contato);
        setVal('det-motoboy', _motoboyNome(pedido));
        setVal('det-status', _labelStatusTexto(pedido.status));
        setVal('det-mercadoria', pedido.mercadoria);
        setVal('det-de', pedido.de);
        setVal('det-para', pedido.para);
        setVal('det-retorno', pedido.retorno);
        setVal('det-horario', pedido.horario);
        setVal('det-prioridade', _labelPrioridade(pedido.prioridade));
        setVal('det-valor', pedido.valor_corrida);
        setVal('det-id-chat', pedido.id_chat);
        setVal('det-obs', pedido.observacao);

        if (!_bsModal) {
            _bsModal = new bootstrap.Modal(_el('modalPedidoDetalhes'));
        }
        _bsModal.show();
    }

    async function excluirPedido(pedidoId) {
        if (!pedidoId) return;

        const result = await Swal.fire({
            icon: 'warning',
            title: 'Excluir Pedido?',
            html: `<div style="font-size: 0.9rem; color: #555;">
                O pedido <strong class="text-danger">${pedidoId}</strong> será removido permanentemente.
            </div>`,
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
            didOpen: () => Swal.showLoading()
        });

        try {
            const resp = await API.call('deletepedido', { id: pedidoId });

            if (resp?.status === 'success') {
                _pedidos = _pedidos.filter(p => String(p.id).trim() !== String(pedidoId).trim());
                renderizarTabela();

                const msgEl = document.querySelector(`[data-pedido-id="${pedidoId}"]`)?.closest('.message-wrapper');
                if (msgEl) msgEl.remove();

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
                text: 'Não foi possível excluir: ' + e.message,
                confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
        }
    }

    function filtrar() {
        renderizarTabela();
    }

    function adicionarPedidoLocal(pedido) {
        if (!pedido || !pedido.id) return;
        const existe = _pedidos.find(p => String(p.id).trim() === String(pedido.id).trim());
        if (existe) {
            Object.assign(existe, pedido);
        } else {
            _pedidos.unshift(pedido);
        }
        renderizarTabela();
    }

    function atualizarStatusLocal(pedidoId, novoStatus, motoboyNome) {
        const pedido = _pedidos.find(p => String(p.id).trim() === String(pedidoId).trim());
        if (pedido) {
            pedido.status = novoStatus;
            if (motoboyNome) pedido.motoboy = motoboyNome;
            renderizarTabela();
        }
    }

    return {
        carregarPedidos,
        renderizarTabela,
        abrirDetalhes,
        excluirPedido,
        filtrar,
        adicionarPedidoLocal,
        atualizarStatusLocal
    };

})();

window.iniciarPedidos = async () => {
    await window.RDO_PEDIDOS.carregarPedidos();
};

window.carregarPedidos = async () => {
    await window.RDO_PEDIDOS.carregarPedidos();
};
