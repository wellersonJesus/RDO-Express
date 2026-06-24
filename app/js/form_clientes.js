(function () {
    'use strict';

    var CAMPOS_OBRIGATORIOS = ['p-solicitante', 'p-mercadoria', 'p-contato', 'p-rotas'];

    function _limparValidacao() {
        CAMPOS_OBRIGATORIOS.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.classList.remove('is-invalid', 'is-valid');
        });
    }

    function _validarCampos() {
        var valido = true;
        CAMPOS_OBRIGATORIOS.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            var vazio = !el.value || el.value.trim() === '';
            el.classList.toggle('is-invalid', vazio);
            el.classList.toggle('is-valid', !vazio);
            if (vazio) valido = false;
        });
        return valido;
    }

    function _val(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    }

    function _fnum(id) {
        return parseFloat(_val(id)) || 0;
    }

    window.preencherDadosFormulario = function () {
        var d = window.dadosPedidoAtual || {};

        var elHeaderNome = document.getElementById('header-nome-cliente');
        if (elHeaderNome) {
            elHeaderNome.textContent = d.cliente
                || (window.AppRDO ? window.AppRDO.clienteSelecionado : null)
                || localStorage.getItem('clienteSelecionadoNome')
                || 'Cliente';
        }

        var elSolicitante = document.getElementById('p-solicitante');
        if (elSolicitante) elSolicitante.value = d.solicitante || '';

        var elContato = document.getElementById('p-contato');
        if (elContato) elContato.value = d.contato || '';

        var elDist = document.getElementById('p-distancia');
        if (elDist) elDist.value = d.distancia || '';

        var elTempo = document.getElementById('p-tempo');
        if (elTempo) elTempo.value = d.tempo || '';

        var elRotas = document.getElementById('p-rotas');
        if (elRotas) {
            if (d.rotas && d.rotas.length) {
                elRotas.value = d.rotas.map(function (r) {
                    var origem  = r.origem  || r.de  || '';
                    var destino = r.destino || r.para || '';
                    return (r.numero || '') + '. De: ' + origem + ' | Para: ' + destino;
                }).join('\n');
            } else if (d.rawInput && typeof window.extrairRotasDaMensagem === 'function') {
                var rotasExtraidas = window.extrairRotasDaMensagem(d.rawInput);
                elRotas.value = rotasExtraidas.map(function (r, i) {
                    return (i + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
                }).join('\n');
            }
        }

        var elHorario = document.getElementById('p-horario');
        if (elHorario && !elHorario.value) {
            var agora = new Date();
            var hh    = String(agora.getHours()).padStart(2, '0');
            var mm    = String(agora.getMinutes()).padStart(2, '0');
            elHorario.value = hh + ':' + mm;
        }

        _limparValidacao();
        window.calcularTudo();
    };

    window.calcularTudo = function () {
        var baseKm = _fnum('p-distancia') * _fnum('p-valor-km');
        var total  = baseKm + (baseKm * _fnum('p-retorno')) + _fnum('p-dinamica') + _fnum('p-prioridade');
        if (total > 0 && total < 10) total = 10;
        var elFinal = document.getElementById('view-valor-final');
        if (elFinal) elFinal.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (window.dadosPedidoAtual) window.dadosPedidoAtual.valorFinal = total;
        return total;
    };

    window.salvarPedidoAPI = async function () {
        if (!_validarCampos()) return;

        var btn = document.getElementById('btn-emitir-pedido');
        if (btn) {
            btn.disabled  = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Enviando...';
        }

        var d      = window.dadosPedidoAtual || {};
        var pedido = d;

        var payload = {
            solicitante:  _val('p-solicitante'),
            mercadoria:   _val('p-mercadoria'),
            contato:      _val('p-contato'),
            horario:      _val('p-horario'),
            distancia_km: _fnum('p-distancia'),
            tempo:        _val('p-tempo'),
            rotas:        _val('p-rotas'),
            valor_km:     _fnum('p-valor-km'),
            retorno:      _fnum('p-retorno'),
            dinamica:     _fnum('p-dinamica'),
            prioridade:   _fnum('p-prioridade'),
            observacao:   _val('p-obs'),
            valor_total:  window.calcularTudo(),
            cliente_id:   pedido.clienteId || (window.AppRDO && window.AppRDO.clienteId) || null,
            chat_id:      pedido.chatId    || null
        };

        try {
            var resp = await fetch('/api/pedidos', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });

            if (!resp.ok) {
                var msg = 'Erro ao salvar pedido (HTTP ' + resp.status + ').';
                try { var json = await resp.json(); msg = json.erro || json.message || msg; } catch (e) {}
                throw new Error(msg);
            }

            var modalEl = document.getElementById('modalFormulario');
            if (modalEl) {
                var inst = bootstrap.Modal.getInstance(modalEl);
                if (inst) inst.hide();
            }

            window.dadosPedidoAtual = null;

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon:               'success',
                    title:              'Pedido emitido!',
                    text:               'O pedido foi registrado com sucesso.',
                    confirmButtonColor: '#dc3545',
                    timer:              3000,
                    timerProgressBar:   true
                });
            }

        } catch (err) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon:               'error',
                    title:              'Erro ao emitir',
                    text:               err.message || 'Falha ao enviar o pedido.',
                    confirmButtonColor: '#dc3545'
                });
            }
        } finally {
            if (btn) {
                btn.disabled  = false;
                btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>EMITIR PEDIDO';
            }
        }
    };

})();
