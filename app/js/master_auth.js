window.MasterAuth = (function () {
    'use strict';

    var _pedidoId = null;
    var _origem = null;
    var _modalBS = null;
    var _tentativas = 0;

    function _el(id) {
        return document.getElementById(id);
    }

    function _resetar() {
        _tentativas = 0;
        var input = _el('input-senha-master');
        var erro = _el('msg-erro-senha');
        var btn = _el('btn-confirmar-exclusao');
        var icon = _el('icon-toggle-senha');

        if (input) {
            input.value = '';
            input.type = 'password';
        }
        if (erro) {
            erro.style.display = 'none';
            erro.classList.add('d-none');
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash3-fill me-2"></i>Confirmar Exclusão';
        }
        if (icon) {
            icon.className = 'bi bi-eye-slash';
        }
    }

    function _erro(msg) {
        var textoEl = _el('msg-erro-senha-texto');
        var erroEl = _el('msg-erro-senha');

        if (textoEl) textoEl.textContent = msg;
        if (erroEl) {
            erroEl.style.display = 'flex';
            erroEl.classList.remove('d-none');
        }
    }

    function _limparBackdrop() {
        document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }

    async function _executarExclusao(id, senha) {
        var idNorm = String(id).replace(/^RDO0*/i, '').trim();
        console.log('[MasterAuth] 🗑️ Executando exclusão:', idNorm);

        try {
            var resposta = await window.API.call('deletepedido', {
                id: idNorm,
                senha_master: senha
            });

            if (resposta && resposta.status === 'success') {
                console.log('[MasterAuth] ✅ Exclusão bem-sucedida');

                if (typeof window.EventBus !== 'undefined') {
                    window.EventBus.emit('pedido:excluido', { id: idNorm });
                }

                if (_origem === 'chat' && window.RDO_CHAT && window.RDO_CHAT.removerMensagemDoCache) {
                    window.RDO_CHAT.removerMensagemDoCache(idNorm);
                }

                if (_origem === 'pedidos' && window.RDO_PEDIDOS && window.RDO_PEDIDOS.removerDoCache) {
                    window.RDO_PEDIDOS.removerDoCache(idNorm);
                }

                try { if (_modalBS) _modalBS.hide(); } catch (_) { }
                _limparBackdrop();

                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sucesso!',
                        html: '<div style="font-size:.95rem;">Pedido excluído com sucesso!</div>',
                        timer: 2000,
                        showConfirmButton: false,
                        customClass: { popup: 'rounded-4' }
                    });
                } else {
                    alert('Pedido excluído com sucesso!');
                }
            } else {
                throw new Error(resposta && resposta.message ? resposta.message : 'Falha ao excluir');
            }

        } catch (err) {
            console.error('[MasterAuth] ❌ Erro:', err);

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    html: err.message || 'Não foi possível excluir o pedido.',
                    confirmButtonColor: '#dc3545'
                });
            } else {
                alert('Erro: ' + err.message);
            }
        }
    }

    function _carregarModal(callback) {
        console.log('[MasterAuth] 📦 Carregando modal...');

        fetch('/pages/modals/modal_master_auth.html')
            .then(function (res) {
                if (!res.ok) throw new Error('Modal não encontrado (404)');
                return res.text();
            })
            .then(function (html) {
                console.log('[MasterAuth] ✅ Modal carregado');

                var container = document.getElementById('modal-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'modal-container';
                    document.body.appendChild(container);
                }

                var wrapper = document.createElement('div');
                wrapper.innerHTML = html.trim();
                container.appendChild(wrapper.firstChild);

                if (callback) callback();
            })
            .catch(function (err) {
                console.error('[MasterAuth] ❌ Erro ao carregar modal:', err);
                alert('Erro ao carregar sistema de autenticação.');
            });
    }

    function abrir(pedidoId, origem) {
        console.log('[MasterAuth] 🔐 abrir():', { pedidoId, origem });

        if (!pedidoId || pedidoId === 'null' || pedidoId === 'undefined') {
            console.error('[MasterAuth] ❌ pedidoId inválido!');
            return;
        }

        _pedidoId = String(pedidoId).replace(/^RDO0*/i, '').trim();
        _origem = origem || 'chat';

        var modalEl = document.getElementById('modalMasterAuth');

        if (!modalEl) {
            _carregarModal(function () {
                _abrirModal();
            });
        } else {
            _abrirModal();
        }
    }

    function _abrirModal() {
        var modalEl = document.getElementById('modalMasterAuth');
        if (!modalEl) {
            console.error('[MasterAuth] ❌ Modal não encontrado!');
            return;
        }

        _resetar();

        _modalBS = bootstrap.Modal.getInstance(modalEl) ||
            new bootstrap.Modal(modalEl, {
                backdrop: 'static',
                keyboard: false
            });

        _modalBS.show();

        setTimeout(function () {
            var input = _el('input-senha-master');
            if (input) input.focus();
        }, 300);
    }

    function cancelar() {
        console.log('[MasterAuth] ❌ Cancelado');

        if (_modalBS) {
            try {
                _modalBS.hide();
            } catch (e) {
                console.error('[MasterAuth] Erro ao fechar modal:', e);
            }
        }

        _resetar();
        _pedidoId = null;
        _origem = null;
    }

    async function confirmar() {
        console.log('[MasterAuth] ✅ confirmar()');

        var input = _el('input-senha-master');
        var senha = input ? input.value.trim() : '';

        if (!senha) {
            _erro('Digite a senha master');
            return;
        }

        var btn = _el('btn-confirmar-exclusao');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...';
        }

        try {
            var validar = await window.API.call('validarsenhamaster', { senha: senha });

            if (!validar || validar.status !== 'success') {
                _tentativas++;

                if (_tentativas >= 3) {
                    _erro('Máximo de tentativas excedido');
                    setTimeout(function () {
                        cancelar();
                    }, 2000);
                } else {
                    _erro('Senha incorreta. Tentativa ' + _tentativas + ' de 3');
                }

                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-trash3-fill me-2"></i>Confirmar Exclusão';
                }
                return;
            }

            console.log('[MasterAuth] ✅ Senha validada');

            var idExcluir = _pedidoId;
            var senhaExcluir = senha;

            _pedidoId = null;

            try {
                if (_modalBS) _modalBS.hide();
            } catch (_) { }

            _resetar();

            await _executarExclusao(idExcluir, senhaExcluir);

        } catch (err) {
            console.error('[MasterAuth] ❌ erro:', err);

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    html: err.message || 'Erro ao validar senha',
                    confirmButtonColor: '#dc3545'
                });
            } else {
                alert('Erro: ' + err.message);
            }

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-trash3-fill me-2"></i>Confirmar Exclusão';
            }
        }
    }

    function toggleSenha() {
        var input = _el('input-senha-master');
        var icon = _el('icon-toggle-senha');

        if (!input || !icon) return;

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'bi bi-eye-fill';
        } else {
            input.type = 'password';
            icon.className = 'bi bi-eye-slash';
        }
    }

    function onKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmar();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelar();
        }
    }

    console.log('[MasterAuth] ✅ Módulo carregado');

    return {
        abrir: abrir,
        cancelar: cancelar,
        confirmar: confirmar,
        toggleSenha: toggleSenha,
        onKeydown: onKeydown
    };
})();
