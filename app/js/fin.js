'use strict';

(function () {

  var EXTRATO_STORAGE_KEY = 'rdo_extratos_salvos';
  var EXTRATO_MAX = 50;

  var state = {
    cache: [],
    pedidosCache: {},
    clientesCache: {},
    colaboradoresCache: {},   
    colaboradores: [],
    caixaValoresVisiveis: false,
    tabAtual: 'todos',
    filtroTipo: 'todos',
    filtroSituacao: 'todos',
    filtroBusca: '',
    fetching: false,
    sortDataDesc: true,
    deletePendingId: null,
    todos: { pagina: 1, porPagina: 15, totalPag: 1 },
    caixa: { pagina: 1, porPagina: 10, totalPag: 1, dataInicio: '', dataFim: '', dadosFiltrados: [] }
  };

  window.financeiroState = state;

  var els = {};

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str.toString()));
    return div.innerHTML;
  }

  function parseData(raw) {
    if (!raw) return { iso: '', br: '', display: '' };
    raw = raw.toString().trim();
    var d, m, y;
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      var dt = new Date(raw);
      if (!isNaN(dt.getTime())) {
        d = String(dt.getUTCDate()).padStart(2, '0');
        m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        y = String(dt.getUTCFullYear());
        return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      var parts = raw.split('-');
      y = parts[0]; m = parts[1]; d = parts[2];
      return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      var p = raw.split('/');
      d = p[0]; m = p[1]; y = p[2];
      return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
    }
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(raw)) {
      var p2 = raw.split('/');
      d = p2[0]; m = p2[1]; y = '20' + p2[2];
      return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + p2[2] };
    }
    if (/^\d{13,}$/.test(raw)) {
      var dt2 = new Date(parseInt(raw));
      if (!isNaN(dt2.getTime())) {
        d = String(dt2.getDate()).padStart(2, '0');
        m = String(dt2.getMonth() + 1).padStart(2, '0');
        y = String(dt2.getFullYear());
        return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
      }
    }
    if (/^\d{4}-\d{2}-\d{2}\s/.test(raw)) {
      var parts2 = raw.substring(0, 10).split('-');
      y = parts2[0]; m = parts2[1]; d = parts2[2];
      return { iso: y + '-' + m + '-' + d, br: d + '/' + m + '/' + y, display: d + '/' + m + '/' + y.slice(-2) };
    }
    return { iso: '', br: raw, display: raw };
  }

  function normalizarRegistro(d) {
    var tipoRaw = (d.tipo || d.type || '').toString().trim().toUpperCase();
    var tipoNorm = (tipoRaw === 'RECEITA' || tipoRaw === 'ENTRADA' || tipoRaw === 'INCOME') ? 'entrada' : 'saida';
    var dataObj = parseData(d.data);
    var valorRaw = d.valor;
    var valorNorm = 0;
    if (typeof valorRaw === 'number') {
      valorNorm = valorRaw;
    } else if (typeof valorRaw === 'string') {
      var cleaned = valorRaw.replace('R$', '').replace(/\s/g, '');
      if (cleaned.indexOf(',') !== -1 && cleaned.indexOf('.') !== -1) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (cleaned.indexOf(',') !== -1) {
        cleaned = cleaned.replace(',', '.');
      }
      valorNorm = parseFloat(cleaned) || 0;
    }
    var situacao = (d.situacao || d.status || 'pendente').toString().trim().toLowerCase();
    var idPedido = (d.id_pedido || d.idPedido || d.pedido_id || '').toString().trim();
    var colaboradorId = (d.colaborador_id || '').toString().trim();

    // ── Resolve username do colaborador pelo colaborador_id ──────────────────
    // O campo motoboy no backend guarda o id OU o nome; priorizamos o lookup
    var motoboyRaw = (d.motoboy || d.colaborador || '').toString().trim();
    var motoboyNome = motoboyRaw;
    if (colaboradorId && state.colaboradoresCache[colaboradorId]) {
      motoboyNome = state.colaboradoresCache[colaboradorId].username || motoboyRaw;
    } else if (motoboyRaw && state.colaboradoresCache[motoboyRaw]) {
      // campo motoboy já veio com o id diretamente
      motoboyNome = state.colaboradoresCache[motoboyRaw].username || motoboyRaw;
    }
    // ─────────────────────────────────────────────────────────────────────────

    var observacao = (d.observacao || d.obs || '').toString().trim();

    var valorColabBackend = parseFloat(d.valor_colaborador);
    var valorEmpresaBackend = parseFloat(d.valor_empresa);
    var percentualComissao = parseFloat(d.percentual_comissao) || 80;
    var pctEmpresa = 100 - percentualComissao;

    var valorColab = 0, valorEmpresa = 0;
    if (tipoNorm === 'entrada') {
      var temValoresBackend = !isNaN(valorColabBackend) && !isNaN(valorEmpresaBackend) &&
        (valorColabBackend > 0 || valorEmpresaBackend > 0);
      if (temValoresBackend) {
        valorColab = valorColabBackend;
        valorEmpresa = valorEmpresaBackend;
      } else if (colaboradorId || motoboyNome) {
        valorColab = valorNorm * (percentualComissao / 100);
        valorEmpresa = valorNorm * (pctEmpresa / 100);
      } else {
        valorColab = 0;
        valorEmpresa = valorNorm;
      }
    }

    return {
      id: (d.id || '').toString().trim(),
      idPedido: idPedido,
      dataISO: dataObj.iso,
      dataBR: dataObj.br,
      dataDisplay: dataObj.display,
      tipo: tipoNorm,
      descricao: (d.descricao || '').toString().trim(),
      valor: valorNorm,
      valorColaborador: valorColab,
      valorEmpresa: valorEmpresa,
      percentualComissao: percentualComissao,
      colaboradorId: colaboradorId,
      motoboy: motoboyNome || '-',   // ← agora é sempre o username
      situacao: situacao,
      observacao: observacao,
      grupo: (d.grupo || d.category || d.categoria || '').toString().trim(),
      cliente: (d.cliente || '').toString().trim(),
      solicitante: (d.solicitante || '').toString().trim()
    };
  }

  function resolverClienteSolicitante() {
    for (var i = 0; i < state.cache.length; i++) {
      var reg = state.cache[i];
      var idPedido = (reg.idPedido || '').toString().trim();

      if (!idPedido) {
        if (!reg.cliente || reg.cliente === '') reg.cliente = '-';
        if (!reg.solicitante || reg.solicitante === '') reg.solicitante = '-';
        continue;
      }

      var pedido = state.pedidosCache[idPedido];
      if (!pedido) {
        if (!reg.cliente || reg.cliente === '') reg.cliente = '-';
        if (!reg.solicitante || reg.solicitante === '') reg.solicitante = '-';
        continue;
      }

      // solicitante
      if (!reg.solicitante || reg.solicitante === '' || reg.solicitante === '-')
        reg.solicitante = (pedido.solicitante || '').toString().trim() || '-';

      // cliente
      if (!reg.cliente || reg.cliente === '' || reg.cliente === '-') {
        var idCliente = (pedido.id_cliente || '').toString().trim();
        reg.cliente = (idCliente && state.clientesCache[idCliente])
          ? (state.clientesCache[idCliente].username || '').toString().trim() || '-'
          : '-';
      }

      // ── Motoboy via pedido (fallback quando financeiro não tem colaborador_id) ──
      if (!reg.colaboradorId && (reg.motoboy === '-' || reg.motoboy === '')) {
        var colabIdPedido = (pedido.colaborador_id || '').toString().trim();
        if (colabIdPedido && state.colaboradoresCache[colabIdPedido]) {
          reg.motoboy = state.colaboradoresCache[colabIdPedido].username || '-';
        }
      }
      // ──────────────────────────────────────────────────────────────────────────
    }
  }

  function extrairArray(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.status === 'success' && res.data && Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (typeof res === 'object' && !Array.isArray(res)) {
      if (res.status || res.message) return [];
      var arr = [];
      var keys = Object.keys(res);
      for (var i = 0; i < keys.length; i++) {
        var item = res[keys[i]];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          if (!item.id) item.id = keys[i];
          arr.push(item);
        }
      }
      return arr;
    }
    return [];
  }

  function isRespostaSucesso(res) {
    if (!res) return false;
    if (res.status === 'success') return true;
    if (res.success === true || res.success === 'true' || res.success === 1) return true;
    var msg = (res.message || res.msg || res.mensagem || '').toString().toLowerCase();
    return msg.indexOf('adicionado') !== -1 || msg.indexOf('salvo') !== -1 ||
      msg.indexOf('criado') !== -1 || msg.indexOf('atualizado') !== -1 ||
      msg.indexOf('editado') !== -1 || msg.indexOf('sucesso') !== -1 ||
      msg.indexOf('exclu') !== -1 || msg.indexOf('removido') !== -1 ||
      msg.indexOf('deletado') !== -1;
  }

  function bind() {
    els = {};
    els.btnRefresh = document.getElementById('btn-refresh-fin');
    els.syncIcon = document.getElementById('sync-icon-fin');
    els.filtroBusca = document.getElementById('filtro-busca-fin');
    els.btnNovo = document.getElementById('btn-novo-fin');
    els.btnSortData = document.getElementById('btn-sort-data-todos');
    els.iconSortData = document.getElementById('icon-sort-data-todos');
    els.tbodyTodos = document.getElementById('tabela-fin-body-todos');
    els.pagInfoTodos = document.getElementById('fin-pag-info-todos');
    els.pagPrevTodos = document.getElementById('fin-pag-prev-todos');
    els.pagNextTodos = document.getElementById('fin-pag-next-todos');
    els.pagLabelTodos = document.getElementById('fin-pag-label-todos');
    els.caixaDataInicio = document.getElementById('caixa-data-inicio');
    els.caixaDataFim = document.getElementById('caixa-data-fim');
    els.btnFiltrarCaixa = document.getElementById('btn-filtrar-caixa');
    els.caixaCardEntradas = document.getElementById('caixa-card-entradas');
    els.caixaCardSaidas = document.getElementById('caixa-card-saidas');
    els.caixaCardEmpresa = document.getElementById('caixa-card-empresa');
    els.caixaCardColaboradores = document.getElementById('caixa-card-colaboradores');
    els.caixaCardRegistros = document.getElementById('caixa-card-registros');
    els.caixaListaDiaria = document.getElementById('caixa-lista-diaria');
    els.rdoPaySaldo = document.getElementById('rdo-pay-saldo');
    els.rdoPaySaldoColabs = document.getElementById('rdo-pay-saldo-colaboradores');
    els.pagInfoCaixa = document.getElementById('fin-pag-info-caixa');
    els.pagPrevCaixa = document.getElementById('fin-pag-prev-caixa');
    els.pagNextCaixa = document.getElementById('fin-pag-next-caixa');
    els.pagLabelCaixa = document.getElementById('fin-pag-label-caixa');
    els.btnToggleCaixaVal = document.getElementById('btn-toggle-caixa-valores');
    els.iconToggleCaixaVal = document.getElementById('icon-toggle-caixa-val');
    els.extratoDataInicio = document.getElementById('extrato-data-inicio');
    els.extratoDataFim = document.getElementById('extrato-data-fim');
    els.extratoOrigem = document.getElementById('extrato-origem');
    els.btnGerarExtrato = document.getElementById('btn-gerar-extrato');
    els.extratoLista = document.getElementById('extrato-lista');
    els.extratoModalOverlay = document.getElementById('extrato-modal-overlay');
    els.extratoModalTitulo = document.getElementById('extrato-modal-titulo');
    els.extratoModalBody = document.getElementById('extrato-modal-body');
    els.extratoModalFechar = document.getElementById('extrato-modal-fechar');
    els.extratoModalCopiar = document.getElementById('extrato-modal-copiar');
  }

  function formatarMoeda(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function toISO(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function getDiaSemanaCompleto(dataISO) {
    if (!dataISO) return '';
    var nomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    var partes = dataISO.split('-');
    var dt = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
    return nomes[dt.getDay()] || '';
  }

  function obterMesAtualRange() {
    var hoje = new Date();
    var y = hoje.getFullYear();
    var m = String(hoje.getMonth() + 1).padStart(2, '0');
    var lastDay = new Date(y, hoje.getMonth() + 1, 0).getDate();
    return { inicio: y + '-' + m + '-01', fim: y + '-' + m + '-' + String(lastDay).padStart(2, '0') };
  }

  function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function parseValor(v) {
    if (typeof v === 'number') return v;
    var n = parseFloat(String(v).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function mascaraValor(el) {
    if (!el) return;
    el.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '');
      if (!v) { this.value = ''; return; }
      v = (parseInt(v) / 100).toFixed(2);
      this.value = v.replace('.', ',');
    });
  }

  function spinOn() {
    if (els.btnRefresh) { els.btnRefresh.classList.add('syncing'); els.btnRefresh.disabled = true; }
    if (els.syncIcon) els.syncIcon.className = 'bi bi-arrow-repeat loading-spin';
  }

  function spinOff() {
    if (els.btnRefresh) { els.btnRefresh.classList.remove('syncing'); els.btnRefresh.disabled = false; }
    if (els.syncIcon) els.syncIcon.className = 'bi bi-arrow-repeat';
  }

  function finToast(msg, tipo) {
    tipo = tipo || 'info';
    var cores = {
      success: { bg: '#198754', icon: 'bi-check-circle-fill' },
      danger: { bg: '#dc3545', icon: 'bi-exclamation-triangle-fill' },
      warning: { bg: '#fd7e14', icon: 'bi-exclamation-circle-fill' },
      info: { bg: '#0d6efd', icon: 'bi-info-circle-fill' }
    };
    var cor = cores[tipo] || cores.info;
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:' + cor.bg + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:.78rem;box-shadow:0 4px 16px rgba(0,0,0,0.18);display:flex;align-items:center;gap:8px;max-width:380px;';
    toast.innerHTML = '<i class="bi ' + cor.icon + '"></i><span>' + escapeHtml(msg) + '</span>';
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .3s ease';
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    }, 3000);
  }

  function getStatusBadge(situacao) {
    var s = (situacao || '').toLowerCase();
    if (s === 'pago') return '<span class="fin-badge-situacao fin-badge-pago"><i class="bi bi-check-circle-fill"></i> Pago</span>';
    if (s === 'recebido') return '<span class="fin-badge-situacao fin-badge-recebido"><i class="bi bi-check-circle-fill"></i> Recebido</span>';
    if (s === 'cancelado') return '<span class="fin-badge-situacao fin-badge-cancelado"><i class="bi bi-x-circle-fill"></i> Cancelado</span>';
    return '<span class="fin-badge-situacao fin-badge-pendente"><i class="bi bi-clock-fill"></i> Pendente</span>';
  }

  function getTipoBadge(tipo) {
    if (tipo === 'entrada') return '<span class="fin-badge-tipo fin-badge-entrada"><i class="bi bi-arrow-down-circle-fill"></i> Receita</span>';
    return '<span class="fin-badge-tipo fin-badge-saida"><i class="bi bi-arrow-up-circle-fill"></i> Despesa</span>';
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function fallbackCopy(texto) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      finToast('Extrato copiado!', 'success');
    } catch (e) {
      finToast('Não foi possível copiar.', 'warning');
    }
  }

  function copiarTextoClipboard(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(function () { finToast('Extrato copiado!', 'success'); })
        .catch(function () { fallbackCopy(texto); });
    } else {
      fallbackCopy(texto);
    }
  }

  function aplicarMascaraValores() {
    document.querySelectorAll('.fin-valor-caixa').forEach(function (el) {
      if (state.caixaValoresVisiveis) {
        var real = el.getAttribute('data-valor-real');
        if (real) el.textContent = real;
      } else {
        var current = el.textContent.trim();
        if (current && current !== 'R$ ****') el.setAttribute('data-valor-real', current);
        el.textContent = 'R$ ****';
      }
    });
  }

  function abrirModalAdicionarDinheiro() {
    var OLD_ID = 'modalAdicionarDinheiroDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered" style="max-width:400px;">' +
      '<div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">' +
      '<div style="background:linear-gradient(135deg,#198754 0%,#146c43 100%);padding:20px 24px 16px;position:relative;">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-plus-circle-fill" style="font-size:1.2rem;color:#fff;"></i></div>' +
      '<div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;">Adicionar Dinheiro</h6>' +
      '<small style="color:rgba(255,255,255,.65);font-size:.72rem;">Registrar entrada manual no caixa</small></div></div>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div>' +
      '<div class="modal-body px-4 py-4">' +
      '<div id="add-dinheiro-erro-dyn" class="alert alert-danger d-none py-2 px-3 mb-3" style="font-size:.74rem;border-radius:10px;"></div>' +
      '<div class="mb-3"><label class="fin-field-label">Valor (R$)</label>' +
      '<input type="text" id="add-dinheiro-valor-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="0,00" inputmode="decimal"></div>' +
      '<div class="mb-3"><label class="fin-field-label">Descrição</label>' +
      '<input type="text" id="add-dinheiro-descricao-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="Ex: Depósito, Aporte..."></div></div>' +
      '<div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex justify-content-end">' +
      '<button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;"><i class="bi bi-x-lg me-1"></i>Cancelar</button>' +
      '<button type="button" class="btn btn-success rounded-pill px-4" id="btn-add-dinheiro-confirmar-dyn" style="font-size:.78rem;height:38px;font-weight:600;"><i class="bi bi-check-lg me-1"></i>Confirmar</button>' +
      '</div></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
    mascaraValor(document.getElementById('add-dinheiro-valor-dyn'));

    document.getElementById('btn-add-dinheiro-confirmar-dyn').addEventListener('click', function () {
      var erroEl = document.getElementById('add-dinheiro-erro-dyn');
      var valorEl = document.getElementById('add-dinheiro-valor-dyn');
      var descEl = document.getElementById('add-dinheiro-descricao-dyn');
      var btn = this;
      erroEl.classList.add('d-none');
      var valorStr = valorEl ? valorEl.value.trim() : '';
      if (!valorStr) { erroEl.textContent = 'Informe o valor.'; erroEl.classList.remove('d-none'); return; }
      var valorNum = parseValor(valorStr);
      if (valorNum <= 0) { erroEl.textContent = 'Informe um valor válido.'; erroEl.classList.remove('d-none'); return; }
      var desc = descEl ? descEl.value.trim() : '';
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      window.API.call('addfinanceiro', {
        tipo: 'entrada', data: toISO(new Date()),
        descricao: desc || 'Entrada manual',
        valor: valorNum, situacao: 'recebido',
        motoboy: '', colaborador_id: '', observacao: ''
      }).then(function (res) {
        if (isRespostaSucesso(res)) { finToast('Depósito adicionado!', 'success'); modalInst.hide(); carregarDados(); }
        else { erroEl.textContent = 'Erro: ' + ((res && (res.message || res.msg)) || 'Tente novamente.'); erroEl.classList.remove('d-none'); }
      }).catch(function () {
        erroEl.textContent = 'Falha na comunicação com o servidor.'; erroEl.classList.remove('d-none');
      }).finally(function () { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Confirmar'; });
    });

    modalEl.addEventListener('hidden.bs.modal', function () { modalInst.dispose(); if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); });
    modalInst.show();
  }

  function abrirModalTransferir() {
    var OLD_ID = 'modalTransferirDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered" style="max-width:400px;">' +
      '<div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">' +
      '<div style="background:linear-gradient(135deg,#0d6efd 0%,#0a58ca 100%);padding:20px 24px 16px;position:relative;">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-arrow-left-right" style="font-size:1.2rem;color:#fff;"></i></div>' +
      '<div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;">Transferir</h6>' +
      '<small style="color:rgba(255,255,255,.65);font-size:.72rem;">Registrar saída / transferência</small></div></div>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div>' +
      '<div class="modal-body px-4 py-4">' +
      '<div id="transferir-erro-dyn" class="alert alert-danger d-none py-2 px-3 mb-3" style="font-size:.74rem;border-radius:10px;"></div>' +
      '<div class="mb-3"><label class="fin-field-label">Valor (R$)</label>' +
      '<input type="text" id="transferir-valor-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="0,00" inputmode="decimal"></div>' +
      '<div class="mb-3"><label class="fin-field-label">Destino</label>' +
      '<input type="text" id="transferir-destino-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="Ex: Conta bancária, Colaborador..."></div>' +
      '<div class="mb-3"><label class="fin-field-label">Descrição</label>' +
      '<input type="text" id="transferir-descricao-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="Ex: Pagamento de salário..."></div></div>' +
      '<div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex justify-content-end">' +
      '<button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;"><i class="bi bi-x-lg me-1"></i>Cancelar</button>' +
      '<button type="button" class="btn btn-primary rounded-pill px-4" id="btn-transferir-confirmar-dyn" style="font-size:.78rem;height:38px;font-weight:600;"><i class="bi bi-check-lg me-1"></i>Confirmar</button>' +
      '</div></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
    mascaraValor(document.getElementById('transferir-valor-dyn'));

    document.getElementById('btn-transferir-confirmar-dyn').addEventListener('click', function () {
      var erroEl = document.getElementById('transferir-erro-dyn');
      var valorEl = document.getElementById('transferir-valor-dyn');
      var destinoEl = document.getElementById('transferir-destino-dyn');
      var descEl = document.getElementById('transferir-descricao-dyn');
      var btn = this;
      erroEl.classList.add('d-none');
      var valorStr = valorEl ? valorEl.value.trim() : '';
      var destino = destinoEl ? destinoEl.value.trim() : '';
      if (!valorStr) { erroEl.textContent = 'Informe o valor.'; erroEl.classList.remove('d-none'); return; }
      if (!destino) { erroEl.textContent = 'Informe o destino.'; erroEl.classList.remove('d-none'); return; }
      var valorNum = parseValor(valorStr);
      if (valorNum <= 0) { erroEl.textContent = 'Informe um valor válido.'; erroEl.classList.remove('d-none'); return; }
      var desc = descEl ? descEl.value.trim() : '';
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      window.API.call('addfinanceiro', {
        tipo: 'saida', data: toISO(new Date()),
        descricao: (desc || 'Transferência') + (destino ? ' → ' + destino : ''),
        valor: valorNum, situacao: 'pago',
        motoboy: '', colaborador_id: '', observacao: ''
      }).then(function (res) {
        if (isRespostaSucesso(res)) { finToast('Transferência realizada!', 'success'); modalInst.hide(); carregarDados(); }
        else { erroEl.textContent = 'Erro: ' + ((res && (res.message || res.msg)) || 'Tente novamente.'); erroEl.classList.remove('d-none'); }
      }).catch(function () {
        erroEl.textContent = 'Falha na comunicação com o servidor.'; erroEl.classList.remove('d-none');
      }).finally(function () { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Confirmar'; });
    });

    modalEl.addEventListener('hidden.bs.modal', function () { modalInst.dispose(); if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); });
    modalInst.show();
  }

  function abrirModalRepasses() {
    var OLD_ID = 'modalRepassesDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var dados = state.caixa.dadosFiltrados.length ? state.caixa.dadosFiltrados : state.cache;
    var entradas = dados.filter(function (r) { return r.tipo === 'entrada'; });
    var por = {};
    entradas.forEach(function (r) {
      var nome = (r.motoboy && r.motoboy !== '-') ? r.motoboy : 'Sem colaborador';
      por[nome] = (por[nome] || 0) + (parseFloat(r.valorColaborador) || 0);
    });
    var nomes = Object.keys(por).sort(function (a, b) { return por[b] - por[a]; });

    var listaHtml = nomes.length
      ? nomes.map(function (nome) {
        return '<div class="d-flex justify-content-between align-items-center py-2 px-1" style="border-bottom:1px solid #f0f0f0;">' +
          '<div class="d-flex align-items-center gap-2">' +
          '<div style="width:36px;height:36px;border-radius:50%;background:#f3e8ff;display:flex;align-items:center;justify-content:center;"><i class="bi bi-person" style="color:#6f42c1;font-size:.9rem;"></i></div>' +
          '<span style="font-size:.82rem;font-weight:600;">' + escapeHtml(nome) + '</span></div>' +
          '<span style="font-size:.84rem;font-weight:700;color:#6f42c1;">' + formatarMoeda(por[nome]) + '</span></div>';
      }).join('')
      : '<div class="text-center text-muted py-5"><i class="bi bi-people" style="font-size:2rem;opacity:.3;display:block;margin-bottom:10px;"></i>Nenhum dado disponível.</div>';

    var periodoLabel = state.caixa.dataInicio && state.caixa.dataFim
      ? formatDateBR(state.caixa.dataInicio) + ' a ' + formatDateBR(state.caixa.dataFim)
      : 'Todos os registros';

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:420px;">' +
      '<div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">' +
      '<div style="background:linear-gradient(135deg,#6f42c1 0%,#59359a 100%);padding:20px 24px 16px;position:relative;">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-people-fill" style="font-size:1.2rem;color:#fff;"></i></div>' +
      '<div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;">Repasses</h6>' +
      '<small style="color:rgba(255,255,255,.65);font-size:.72rem;">' + escapeHtml(periodoLabel) + '</small></div></div>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div>' +
      '<div class="modal-body px-3 py-3">' + listaHtml + '</div>' +
      '<div class="modal-footer border-0 px-4 pb-4 pt-0 justify-content-end">' +
      '<button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;"><i class="bi bi-x-lg me-1"></i>Fechar</button>' +
      '</div></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () { modalInst.dispose(); if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); });
    modalInst.show();
  }

  function abrirModalExtratosCaixa() {
    var OLD_ID = 'modalExtratosCaixaDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:480px;">' +
      '<div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">' +
      '<div style="background:linear-gradient(135deg,#0dcaf0 0%,#0aa2c0 100%);padding:20px 24px 16px;position:relative;">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-file-earmark-bar-graph-fill" style="font-size:1.2rem;color:#fff;"></i></div>' +
      '<div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;">Extratos Salvos</h6>' +
      '<small style="color:rgba(255,255,255,.65);font-size:.72rem;">Histórico de relatórios gerados</small></div></div>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div>' +
      '<div class="modal-body px-3 py-3" id="' + OLD_ID + '-lista">' +
      '<div class="text-center text-muted py-5"><div class="spinner-border spinner-border-sm text-secondary"></div></div></div>' +
      '<div class="modal-footer border-0 px-4 pb-4 pt-0 justify-content-end">' +
      '<button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;"><i class="bi bi-x-lg me-1"></i>Fechar</button>' +
      '</div></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl);
    var container = document.getElementById(OLD_ID + '-lista');
    var extratos = carregarExtratosStorage();

    if (!extratos.length) {
      container.innerHTML =
        '<div class="text-center text-muted py-5">' +
        '<i class="bi bi-file-earmark-bar-graph" style="font-size:2rem;opacity:.4;display:block;margin-bottom:12px;"></i>' +
        '<div>Nenhum extrato gerado ainda.</div>' +
        '<small class="opacity-75">Acesse a aba <strong>Extrato</strong> para gerar relatórios</small></div>';
    } else {
      container.innerHTML = extratos.map(function (ex) {
        var totalRegs = (ex.registros || []).length;
        var criadoLabel = ex.criadoEm ? new Date(ex.criadoEm).toLocaleString('pt-BR') : '-';
        var totalEnt = 0, totalSai = 0, totalEmpresa = 0, totalColabs = 0;
        (ex.registros || []).forEach(function (r) {
          var val = parseFloat(r.valor) || 0;
          var vColab = parseFloat(r.valorColaborador) || 0;
          var vEmp = r.tipo === 'entrada' ? (parseFloat(r.valorEmpresa) > 0 ? parseFloat(r.valorEmpresa) : (vColab > 0 ? val * 0.2 : val)) : 0;
          if (r.tipo === 'entrada') { totalEnt += val; totalColabs += vColab; totalEmpresa += vEmp; }
          else { totalSai += val; }
        });
        var saldo = totalEmpresa - totalSai;
        var saldoColor = saldo >= 0 ? '#198754' : '#dc3545';
        return '<div class="extrato-item-card" data-extrato-id="' + escapeHtml(ex.id) + '" style="cursor:pointer;margin-bottom:8px;">' +
          '<div class="extrato-item-left">' +
          '<div class="extrato-item-icon"><i class="bi bi-file-earmark-bar-graph"></i></div>' +
          '<div><div class="extrato-item-titulo">' + escapeHtml(ex.origem || '-') + '</div>' +
          '<div class="extrato-item-sub">' + escapeHtml(ex.periodoLabel || '-') + ' · ' + totalRegs + ' registro' + (totalRegs !== 1 ? 's' : '') + '</div>' +
          '<div class="extrato-item-sub" style="font-size:.68rem;opacity:.7;">' + criadoLabel + '</div></div></div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">' +
          '<span style="font-size:.72rem;font-weight:700;color:' + saldoColor + ';">' + formatarMoeda(saldo) + '</span>' +
          '<button class="extrato-item-btn extrato-item-btn-ver-modal" data-id="' + escapeHtml(ex.id) + '" title="Visualizar" style="pointer-events:auto;"><i class="bi bi-eye"></i></button>' +
          '</div></div>';
      }).join('');

      container.querySelectorAll('.extrato-item-btn-ver-modal').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var ext = buscarExtratoStoragePorId(this.getAttribute('data-id'));
          if (ext) abrirExtratoModal(ext);
        });
      });
      container.querySelectorAll('.extrato-item-card').forEach(function (card) {
        card.addEventListener('click', function () {
          var ext = buscarExtratoStoragePorId(this.getAttribute('data-extrato-id'));
          if (ext) abrirExtratoModal(ext);
        });
      });
    }

    modalEl.addEventListener('hidden.bs.modal', function () { modalInst.dispose(); if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); });
    modalInst.show();
  }

  function registrarEventos() {
    document.querySelectorAll('.fin-tab').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        var t = (this.getAttribute('data-tab') || '').trim();
        if (!t) return;
        state.tabAtual = t;
        document.querySelectorAll('.fin-tab').forEach(function (el) { el.classList.remove('active'); });
        this.classList.add('active');
        document.querySelectorAll('.fin-tab-content').forEach(function (el) { el.classList.remove('active'); });
        var content = document.getElementById('fin-tab-content-' + t);
        if (content) content.classList.add('active');
        if (t === 'todos') renderTodos();
        if (t === 'caixa') renderCaixa();
        if (t === 'extrato') renderizarListaExtratos();
      });
    });

    if (els.filtroBusca) {
      var _buscaTimer = null;
      els.filtroBusca.addEventListener('input', function () {
        var self = this;
        if (_buscaTimer) clearTimeout(_buscaTimer);
        _buscaTimer = setTimeout(function () { state.filtroBusca = self.value; state.todos.pagina = 1; renderTodos(); }, 180);
      });
      els.filtroBusca.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (_buscaTimer) clearTimeout(_buscaTimer); state.filtroBusca = this.value; state.todos.pagina = 1; renderTodos(); }
      });
      els.filtroBusca.addEventListener('search', function () {
        if (!this.value) { state.filtroBusca = ''; state.todos.pagina = 1; renderTodos(); }
      });
    }

    var wrapperFiltro = document.getElementById('dropdown-filtro-wrapper-fin');
    var btnFiltro = document.getElementById('btn-filtro-fin');
    var menuFiltro = document.getElementById('dropdown-filtro-menu-fin');
    var labelFiltro = document.getElementById('label-filtro-fin');
    var btnSubSituacao = document.getElementById('btn-sub-situacao-fin');
    var submenuSituacao = document.getElementById('submenu-situacao-fin');

    if (btnFiltro && menuFiltro && wrapperFiltro) {
      btnFiltro.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); wrapperFiltro.classList.toggle('open'); });
      document.addEventListener('click', function (e) { if (wrapperFiltro && !wrapperFiltro.contains(e.target)) wrapperFiltro.classList.remove('open'); });
      menuFiltro.querySelectorAll('.dropdown-filtro-item[data-filtro-tipo]').forEach(function (item) {
        item.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          state.filtroTipo = this.getAttribute('data-filtro-tipo') || 'todos';
          state.todos.pagina = 1;
          var labelMap = { todos: 'Todos', entrada: 'Receitas', saida: 'Despesas' };
          if (labelFiltro) labelFiltro.textContent = labelMap[state.filtroTipo] || 'Todos';
          menuFiltro.querySelectorAll('.dropdown-filtro-item[data-filtro-tipo]').forEach(function (el) { el.classList.remove('active'); });
          this.classList.add('active');
          wrapperFiltro.classList.remove('open');
          renderTodos();
        });
      });
      if (btnSubSituacao) {
        var parentHasSub = btnSubSituacao.closest('.dropdown-filtro-item-has-sub');
        btnSubSituacao.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (parentHasSub) parentHasSub.classList.toggle('sub-open'); });
      }
      if (submenuSituacao) {
        submenuSituacao.querySelectorAll('.dropdown-filtro-subitem[data-filtro-situacao]').forEach(function (item) {
          item.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            state.filtroSituacao = this.getAttribute('data-filtro-situacao') || 'todos';
            state.todos.pagina = 1;
            submenuSituacao.querySelectorAll('.dropdown-filtro-subitem').forEach(function (el) { el.classList.remove('active'); });
            this.classList.add('active');
            var parentSub = btnSubSituacao ? btnSubSituacao.closest('.dropdown-filtro-item-has-sub') : null;
            if (parentSub) { if (state.filtroSituacao !== 'todos') parentSub.classList.add('active'); else parentSub.classList.remove('active'); }
            wrapperFiltro.classList.remove('open');
            renderTodos();
          });
        });
      }
    }

    if (els.btnSortData) {
      els.btnSortData.addEventListener('click', function () {
        state.sortDataDesc = !state.sortDataDesc;
        if (els.iconSortData) els.iconSortData.className = state.sortDataDesc ? 'bi bi-arrow-down' : 'bi bi-arrow-up';
        state.todos.pagina = 1;
        renderTodos();
      });
    }

    if (els.pagPrevTodos) els.pagPrevTodos.addEventListener('click', function () { if (state.todos.pagina > 1) { state.todos.pagina--; renderTodos(); } });
    if (els.pagNextTodos) els.pagNextTodos.addEventListener('click', function () { if (state.todos.pagina < state.todos.totalPag) { state.todos.pagina++; renderTodos(); } });
    if (els.pagPrevCaixa) els.pagPrevCaixa.addEventListener('click', function () { if (state.caixa.pagina > 1) { state.caixa.pagina--; renderCaixaListaDiaria(); } });
    if (els.pagNextCaixa) els.pagNextCaixa.addEventListener('click', function () { if (state.caixa.pagina < state.caixa.totalPag) { state.caixa.pagina++; renderCaixaListaDiaria(); } });

    if (els.btnFiltrarCaixa) {
      els.btnFiltrarCaixa.addEventListener('click', function () {
        var di = els.caixaDataInicio ? els.caixaDataInicio.value : '';
        var df = els.caixaDataFim ? els.caixaDataFim.value : '';
        if (!di || !df) { finToast('Selecione o período (De e Até) para filtrar.', 'warning'); return; }
        if (di > df) { finToast('A data inicial não pode ser maior que a data final.', 'warning'); return; }
        state.caixa.dataInicio = di;
        state.caixa.dataFim = df;
        state.caixa.pagina = 1;
        renderCaixa();
      });
    }

    if (els.btnRefresh) els.btnRefresh.addEventListener('click', function () { carregarDados(); });
    if (els.btnNovo) els.btnNovo.addEventListener('click', function () { abrirModalNovo(); });

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); abrirModalNovo(); }
      if (e.key === '/' && ['INPUT', 'TEXTAREA'].indexOf(document.activeElement.tagName) === -1) { e.preventDefault(); if (els.filtroBusca) els.filtroBusca.focus(); }
    });

    if (els.btnToggleCaixaVal) {
      els.btnToggleCaixaVal.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        state.caixaValoresVisiveis = !state.caixaValoresVisiveis;
        if (els.iconToggleCaixaVal) els.iconToggleCaixaVal.className = state.caixaValoresVisiveis ? 'bi bi-eye' : 'bi bi-eye-slash';
        this.title = state.caixaValoresVisiveis ? 'Ocultar valores' : 'Mostrar valores';
        aplicarMascaraValores();
      });
    }

    var btnAdicionar = document.querySelector('[data-rdo-action="adicionar"]');
    if (btnAdicionar) btnAdicionar.addEventListener('click', function (e) { e.preventDefault(); abrirModalAdicionarDinheiro(); });

    var btnTransferir = document.querySelector('[data-rdo-action="transferir"]');
    if (btnTransferir) btnTransferir.addEventListener('click', function (e) { e.preventDefault(); abrirModalTransferir(); });

    var btnRepasses = document.getElementById('btn-ver-repasses');
    if (btnRepasses) btnRepasses.addEventListener('click', function (e) { e.preventDefault(); abrirModalRepasses(); });

    var btnExtratosCaixa = document.querySelector('[data-rdo-action="extratos"]');
    if (btnExtratosCaixa) btnExtratosCaixa.addEventListener('click', function (e) { e.preventDefault(); abrirModalExtratosCaixa(); });

    var finValorEl = document.getElementById('fin-valor');
    var finColabEl = document.getElementById('fin-colaborador');
    if (finValorEl) { mascaraValor(finValorEl); finValorEl.addEventListener('input', atualizarPreviewComissao); }
    if (finColabEl) finColabEl.addEventListener('change', atualizarPreviewComissao);

    var btnSalvarFin = document.getElementById('btn-salvar-fin');
    if (btnSalvarFin) btnSalvarFin.addEventListener('click', salvarLancamento);

    var btnSalvarNovo = document.getElementById('btn-salvar-novo-fin');
    if (btnSalvarNovo) btnSalvarNovo.addEventListener('click', salvarLancamento);

    if (els.extratoModalFechar) els.extratoModalFechar.addEventListener('click', function () { if (els.extratoModalOverlay) els.extratoModalOverlay.style.display = 'none'; });
    if (els.extratoModalOverlay) els.extratoModalOverlay.addEventListener('click', function (e) { if (e.target === els.extratoModalOverlay) els.extratoModalOverlay.style.display = 'none'; });
  }

  function dadosFiltradosTodos() {
    var busca = state.filtroBusca;
    return state.cache.filter(function (d) {
      if (state.filtroTipo === 'entrada' && d.tipo !== 'entrada') return false;
      if (state.filtroTipo === 'saida' && d.tipo !== 'saida') return false;
      if (state.filtroSituacao !== 'todos' && d.situacao !== state.filtroSituacao) return false;
      if (busca) {
        var termo = removerAcentos(busca.toLowerCase().trim());
        if (!termo) return true;
        var valorFormatado = formatarMoeda(d.valor);
        var valorSimples = (d.valor || 0).toFixed(2).replace('.', ',');
        var valorPonto = (d.valor || 0).toFixed(2);
        var valorInt = String(Math.round(d.valor || 0));
        var situacaoMap = { pago: 'pago', recebido: 'recebido', pendente: 'pendente', cancelado: 'cancelado' };
        var tipoMap = { entrada: 'receita entrada', saida: 'despesa saida' };
        var campos = [d.id, d.idPedido, d.descricao, d.motoboy, d.observacao, d.dataBR, d.dataDisplay, d.dataISO,
          valorFormatado, valorSimples, valorPonto, valorInt, situacaoMap[d.situacao] || d.situacao,
        tipoMap[d.tipo] || d.tipo, d.cliente, d.solicitante];
        var pool = removerAcentos(campos.map(function (c) { return (c || '').toString(); }).join(' ').toLowerCase());
        var termos = termo.split(/\s+/);
        for (var i = 0; i < termos.length; i++) { if (termos[i] && pool.indexOf(termos[i]) === -1) return false; }
      }
      return true;
    });
  }

  function renderTodos() {
    if (!els.tbodyTodos) return;
    var lista = dadosFiltradosTodos();
    lista.sort(function (a, b) {
      var da = a.dataISO || '', db = b.dataISO || '';
      return state.sortDataDesc ? db.localeCompare(da) : da.localeCompare(db);
    });
    var total = lista.length;
    state.todos.totalPag = Math.max(1, Math.ceil(total / state.todos.porPagina));
    state.todos.pagina = Math.min(Math.max(1, state.todos.pagina), state.todos.totalPag);
    var inicio = (state.todos.pagina - 1) * state.todos.porPagina;
    var paginaAtual = lista.slice(inicio, inicio + state.todos.porPagina);

    if (!paginaAtual.length) {
      els.tbodyTodos.innerHTML =
        '<tr><td colspan="6" class="text-center text-muted py-4">' +
        '<i class="bi bi-inbox" style="font-size:1.2rem;opacity:.4;display:block;margin-bottom:4px;"></i>' +
        'Nenhum registro encontrado</td></tr>';
    } else {
      els.tbodyTodos.innerHTML = paginaAtual.map(function (d, i) {
        var cliente = (d.cliente && d.cliente !== '-' && d.cliente !== '') ? d.cliente : '-';
        var motoboy = (d.motoboy && d.motoboy !== '-' && d.motoboy !== '') ? d.motoboy : '-';
        return '<tr>' +
          '<td class="ps-3" style="font-size:.78rem;">' + escapeHtml(d.dataDisplay || '-') + '</td>' +
          '<td style="font-size:.78rem;">' + escapeHtml(d.idPedido || '-') + '</td>' +
          '<td style="font-size:.78rem;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(cliente) + '">' + escapeHtml(cliente) + '</td>' +
          '<td style="font-size:.78rem;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(motoboy) + '">' + escapeHtml(motoboy) + '</td>' +
          '<td>' + getTipoBadge(d.tipo) + '</td>' +
          '<td class="text-end pe-3"><div class="fin-actions-group">' +
          '<button class="fin-btn-action fin-btn-view  btn-view-todos" data-idx="' + i + '" title="Ver"><i class="bi bi-eye"></i></button>' +
          '<button class="fin-btn-action fin-btn-edit  btn-edit-todos" data-idx="' + i + '" title="Editar"><i class="bi bi-pencil-square"></i></button>' +
          '<button class="fin-btn-action fin-btn-delete btn-del-todos"  data-idx="' + i + '" title="Excluir"><i class="bi bi-trash"></i></button>' +
          '</div></td></tr>';
      }).join('');
    }

    if (els.pagInfoTodos) els.pagInfoTodos.textContent = total + ' registro' + (total !== 1 ? 's' : '');
    if (els.pagPrevTodos) els.pagPrevTodos.disabled = (state.todos.pagina <= 1);
    if (els.pagNextTodos) els.pagNextTodos.disabled = (state.todos.pagina >= state.todos.totalPag);
    if (els.pagLabelTodos) els.pagLabelTodos.textContent = 'Pág ' + state.todos.pagina;

    bindAcoesTodas(paginaAtual);
  }

  function bindAcoesTodas(lista) {
    if (!els.tbodyTodos) return;
    els.tbodyTodos.querySelectorAll('.btn-view-todos').forEach(function (btn) {
      btn.addEventListener('click', function () { var d = lista[parseInt(this.getAttribute('data-idx'), 10)]; if (d) abrirViewModal(d); });
    });
    els.tbodyTodos.querySelectorAll('.btn-edit-todos').forEach(function (btn) {
      btn.addEventListener('click', function () { var d = lista[parseInt(this.getAttribute('data-idx'), 10)]; if (d) abrirModalEditar(d); });
    });
    els.tbodyTodos.querySelectorAll('.btn-del-todos').forEach(function (btn) {
      btn.addEventListener('click', function () { var d = lista[parseInt(this.getAttribute('data-idx'), 10)]; if (d) confirmarExclusao(d); });
    });
  }

  function atualizarResumoCaixa() {
    var lista = state.caixa.dadosFiltrados || [];
    var visivel = state.caixaValoresVisiveis;
    var totalEnt = 0, totalSai = 0, totalColabs = 0, totalEmpresa = 0;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].tipo === 'entrada') {
        totalEnt += parseFloat(lista[i].valor) || 0;
        totalColabs += parseFloat(lista[i].valorColaborador) || 0;
        totalEmpresa += parseFloat(lista[i].valorEmpresa) || 0;
      } else {
        totalSai += parseFloat(lista[i].valor) || 0;
      }
    }
    var saldoEmpresa = totalEmpresa - totalSai;
    function setCard(el, val) {
      if (!el) return;
      var fmt = formatarMoeda(val);
      el.setAttribute('data-valor-real', fmt);
      el.textContent = visivel ? fmt : 'R$ ****';
    }
    setCard(els.caixaCardEntradas, totalEnt);
    setCard(els.caixaCardSaidas, totalSai);
    setCard(els.caixaCardEmpresa, totalEmpresa);
    setCard(els.caixaCardColaboradores, totalColabs);
    if (els.caixaCardRegistros) { els.caixaCardRegistros.setAttribute('data-valor-real', lista.length.toString()); els.caixaCardRegistros.textContent = lista.length; }
    if (els.rdoPaySaldo) { var sf = formatarMoeda(saldoEmpresa); els.rdoPaySaldo.setAttribute('data-valor-real', sf); els.rdoPaySaldo.textContent = visivel ? sf : 'R$ ****'; }
    if (els.rdoPaySaldoColabs) { var cf = formatarMoeda(totalColabs); els.rdoPaySaldoColabs.setAttribute('data-valor-real', cf); els.rdoPaySaldoColabs.textContent = visivel ? cf : 'R$ ****'; }
  }

  function renderCaixa() {
    var di = els.caixaDataInicio ? els.caixaDataInicio.value : '';
    var df = els.caixaDataFim ? els.caixaDataFim.value : '';
    if (!di || !df) {
      var mesAtual = obterMesAtualRange();
      di = mesAtual.inicio; df = mesAtual.fim;
      if (els.caixaDataInicio) els.caixaDataInicio.value = di;
      if (els.caixaDataFim) els.caixaDataFim.value = df;
    }
    state.caixa.dataInicio = di;
    state.caixa.dataFim = df;
    state.caixa.pagina = 1;
    state.caixa.dadosFiltrados = state.cache.filter(function (d) {
      if (!d.dataISO) return false;
      return d.dataISO >= di && d.dataISO <= df;
    }).sort(function (a, b) { return (a.dataISO || '').localeCompare(b.dataISO || ''); });
    atualizarResumoCaixa();
    renderCaixaListaDiaria();
  }

  function renderCaixaListaDiaria() {
    var container = els.caixaListaDiaria;
    if (!container) return;
    var lista = state.caixa.dadosFiltrados || [];
    var visivel = state.caixaValoresVisiveis;

    if (!lista.length) {
      container.innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-inbox" style="font-size:1.2rem;display:block;margin-bottom:4px;opacity:.4;"></i>Nenhum registro no período</div>';
      atualizarPaginacaoCaixa(0);
      return;
    }

    var grupos = {}, diasOrdem = [];
    for (var i = 0; i < lista.length; i++) {
      var key = lista[i].dataISO || '';
      if (!grupos[key]) { grupos[key] = []; diasOrdem.push(key); }
      grupos[key].push(lista[i]);
    }
    diasOrdem.sort();

    var totalDias = diasOrdem.length;
    var diasPorPagina = state.caixa.porPagina;
    var totalPag = Math.max(1, Math.ceil(totalDias / diasPorPagina));
    state.caixa.pagina = Math.min(Math.max(1, state.caixa.pagina || 1), totalPag);
    state.caixa.totalPag = totalPag;

    var inicioDia = (state.caixa.pagina - 1) * diasPorPagina;
    var diasPagina = diasOrdem.slice(inicioDia, inicioDia + diasPorPagina);

    var saldoAcumulado = 0;
    for (var di2 = 0; di2 < inicioDia; di2++) {
      var reg = grupos[diasOrdem[di2]];
      for (var r = 0; r < reg.length; r++) {
        if (reg[r].tipo === 'entrada') saldoAcumulado += parseFloat(reg[r].valorEmpresa) || 0;
        else saldoAcumulado -= parseFloat(reg[r].valor) || 0;
      }
    }

    var html = '';
    for (var idx = 0; idx < diasPagina.length; idx++) {
      var diaISO = diasPagina[idx];
      var registros = grupos[diaISO];
      var partes = diaISO.split('-');
      var dataBR = partes[2] + '/' + partes[1] + '/' + partes[0];
      var diaSemana = getDiaSemanaCompleto(diaISO);
      var totalEntDia = 0, totalSaiDia = 0;
      for (var j = 0; j < registros.length; j++) {
        if (registros[j].tipo === 'entrada') totalEntDia += parseFloat(registros[j].valorEmpresa) || 0;
        else totalSaiDia += parseFloat(registros[j].valor) || 0;
      }
      saldoAcumulado += (totalEntDia - totalSaiDia);
      var saldoClass = saldoAcumulado > 0 ? 'positivo' : saldoAcumulado < 0 ? 'negativo' : 'neutro';
      var saldoTexto = formatarMoeda(saldoAcumulado);
      html +=
        '<div class="caixa-dia-item" data-dia="' + diaISO + '" style="cursor:pointer;">' +
        '<div class="caixa-dia-item-left">' +
        '<div class="caixa-dia-icon"><i class="bi bi-calendar3"></i></div>' +
        '<div><div class="caixa-dia-info-data">' + dataBR + '</div>' +
        '<div class="caixa-dia-info-semana">' + diaSemana + '</div></div></div>' +
        '<div class="d-flex align-items-center">' +
        '<span class="caixa-dia-saldo fin-valor-caixa ' + saldoClass + '" data-valor-real="' + saldoTexto + '">' +
        (visivel ? saldoTexto : 'R$ ****') + '</span>' +
        '<i class="bi bi-chevron-right caixa-dia-chevron"></i></div></div>';
    }
    container.innerHTML = html;

    container.querySelectorAll('.caixa-dia-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var dia = this.getAttribute('data-dia');
        if (dia && grupos[dia]) abrirModalDetalheDia(dia, grupos[dia]);
      });
    });
    atualizarPaginacaoCaixa(totalDias);
  }

  function abrirModalDetalheDia(diaISO, registros) {
    var modalEl = document.getElementById('modalDetalheDia');
    if (!modalEl) return;
    var partes = diaISO.split('-');
    var dataBR = partes[2] + '/' + partes[1] + '/' + partes[0];
    var diaSemana = getDiaSemanaCompleto(diaISO);
    var tituloEl = document.getElementById('modal-detalhe-dia-titulo');
    if (tituloEl) tituloEl.textContent = dataBR + ' (' + diaSemana + ')';
    var bodyEl = document.getElementById('modal-detalhe-dia-body');
    if (!bodyEl) return;
    var totalEnt = 0, totalSai = 0, totalColabs = 0, totalEmpresa = 0;
    if (!registros || !registros.length) {
      bodyEl.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Nenhum lançamento.</td></tr>';
    } else {
      var htmlBody = '';
      for (var i = 0; i < registros.length; i++) {
        var rr = registros[i];
        var isE = rr.tipo === 'entrada';
        var vTotal = parseFloat(rr.valor) || 0;
        var vColab = parseFloat(rr.valorColaborador) || 0;
        var vEmp = parseFloat(rr.valorEmpresa) || 0;
        if (isE) { totalEnt += vTotal; totalColabs += vColab; totalEmpresa += vEmp; }
        else totalSai += vTotal;
        htmlBody +=
          '<tr>' +
          '<td style="font-size:.78rem;">' + escapeHtml(rr.idPedido || '-') + '</td>' +
          '<td class="text-end" style="font-size:.78rem;"><span class="' + (isE ? 'detalhe-dia-valor-entrada' : 'detalhe-dia-valor-saida') + '">' + (isE ? '+ ' : '- ') + formatarMoeda(vTotal) + '</span></td>' +
          '<td class="text-end" style="font-size:.78rem;color:#6f42c1;">' + formatarMoeda(vColab) + '</td>' +
          '<td class="text-end" style="font-size:.78rem;color:#0d6efd;">' + formatarMoeda(vEmp) + '</td>' +
          '<td class="text-center">' + getStatusBadge(rr.situacao) + '</td></tr>';
      }
      bodyEl.innerHTML = htmlBody;
    }
    var elEnt = document.getElementById('modal-detalhe-dia-entradas');
    var elSai = document.getElementById('modal-detalhe-dia-saidas');
    var elEmp = document.getElementById('modal-detalhe-dia-empresa');
    var elCol = document.getElementById('modal-detalhe-dia-colaboradores');
    var elSaldo = document.getElementById('modal-detalhe-dia-saldo');
    if (elEnt) elEnt.textContent = formatarMoeda(totalEnt);
    if (elSai) elSai.textContent = formatarMoeda(totalSai);
    if (elEmp) elEmp.textContent = formatarMoeda(totalEmpresa);
    if (elCol) elCol.textContent = formatarMoeda(totalColabs);
    if (elSaldo) { var saldo = totalEmpresa - totalSai; elSaldo.textContent = formatarMoeda(saldo); elSaldo.style.color = saldo >= 0 ? '#198754' : '#dc3545'; }
    var instExistente = bootstrap.Modal.getInstance(modalEl);
    if (instExistente) instExistente.dispose();
    new bootstrap.Modal(modalEl).show();
  }

  function atualizarPaginacaoCaixa(totalDias) {
    var diasPorPagina = state.caixa.porPagina;
    var totalPag = Math.max(1, Math.ceil(totalDias / diasPorPagina));
    state.caixa.pagina = Math.min(Math.max(1, state.caixa.pagina || 1), totalPag);
    state.caixa.totalPag = totalPag;
    if (els.pagInfoCaixa) els.pagInfoCaixa.textContent = totalDias > 0 ? totalDias + ' dia' + (totalDias !== 1 ? 's' : '') : '0 registros';
    if (els.pagPrevCaixa) els.pagPrevCaixa.disabled = (state.caixa.pagina <= 1);
    if (els.pagNextCaixa) els.pagNextCaixa.disabled = (state.caixa.pagina >= totalPag);
    if (els.pagLabelCaixa) els.pagLabelCaixa.textContent = 'Pág ' + state.caixa.pagina;
  }

  function abrirViewModal(d) {
    var old = document.getElementById('modal-fin-view-dynamic');
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var isE = d.tipo === 'entrada';
    var tipoLabel = isE ? 'RECEITA' : 'DESPESA';
    var tipoIcon = isE ? 'bi-arrow-down-left' : 'bi-arrow-up-right';
    var corValor = isE ? '#198754' : '#dc3545';
    var colaboradorLabel = d.motoboy && d.motoboy !== '-' ? d.motoboy : '-';

    var html =
      '<div class="modal fade" id="modal-fin-view-dynamic" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered">' +
      '<div class="modal-content border-0 rounded-4 shadow overflow-hidden">' +

      /* ── Header ── */
      '<div class="fin-form-header">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div class="fin-form-header-icon"><i class="bi ' + tipoIcon + '"></i></div>' +
      '<div><h6 class="fw-bold mb-0 text-white" style="font-size:.88rem;">' + tipoLabel + '</h6>' +
      '<small class="fin-form-subtitle">' + escapeHtml(d.dataBR || '-') + '</small></div>' +
      '</div>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
      '</div>' +

      /* ── Body ── */
      '<div class="modal-body px-4 py-3">' +

      /* Valor + Badge */
      '<div class="text-center mb-3">' +
      '<div style="font-size:1.6rem;font-weight:700;color:' + corValor + ';">' + formatarMoeda(d.valor) + '</div>' +
      '<div>' + getStatusBadge(d.situacao) + '</div>' +
      '</div>' +

      '<div style="background:#f8f9fa;border-radius:10px;padding:12px;font-size:.76rem;">' +

      /* Linha 1 — Tipo | Descrição | Colaborador */
      '<div class="row g-2 mb-2">' +
      '<div class="col-4"><span class="text-muted d-block">Tipo</span><span class="fw-semibold">' + (isE ? 'Receita' : 'Despesa') + '</span></div>' +
      '<div class="col-4"><span class="text-muted d-block">Descrição</span><span class="fw-semibold" title="' + escapeHtml(d.descricao || '-') + '" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(d.descricao || '-') + '</span></div>' +
      '<div class="col-4"><span class="text-muted d-block">Colaborador</span><span class="fw-semibold">' + escapeHtml(colaboradorLabel) + '</span></div>' +
      '</div>' +

      /* Linha 2 — Pedido | Situação */
      '<div class="row g-2 mb-2">' +
      '<div class="col-6"><span class="text-muted d-block">Pedido</span><span class="fw-semibold">' + escapeHtml(d.idPedido || '-') + '</span></div>' +
      '<div class="col-6"><span class="text-muted d-block">Situação</span><span class="fw-semibold">' + escapeHtml(d.situacao || '-') + '</span></div>' +
      '</div>' +

      /* Linha 3 — Comissões (apenas entrada com colaborador) */
      (isE && d.valorColaborador > 0
        ? '<div class="row g-2 mb-2">' +
        '<div class="col-6"><span class="text-muted d-block">Colaborador (' + d.percentualComissao + '%)</span><span class="fw-semibold" style="color:#6f42c1;">' + formatarMoeda(d.valorColaborador) + '</span></div>' +
        '<div class="col-6"><span class="text-muted d-block">Empresa (' + (100 - d.percentualComissao) + '%)</span><span class="fw-semibold" style="color:#0d6efd;">' + formatarMoeda(d.valorEmpresa) + '</span></div>' +
        '</div>'
        : '') +

      /* Linha 4 — Observação (largura total) */
      '<div class="row g-2">' +
      '<div class="col-12"><span class="text-muted d-block">Observação</span><span class="fw-semibold">' + escapeHtml(d.observacao || '-') + '</span></div>' +
      '</div>' +

      '</div>' + /* fim bloco cinza */
      '</div>' + /* fim modal-body */

      /* ── Footer — botões alinhados à direita ── */
      '<div class="fin-form-footer justify-content-end gap-2">' +
      '<button type="button" class="btn btn-outline-danger btn-sm rounded-pill px-3" id="btn-view-editar-dynamic" style="font-size:.72rem;"><i class="bi bi-pencil-square me-1"></i>Editar</button>' +
      '<button type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal" style="font-size:.72rem;">Fechar</button>' +
      '</div>' +

      '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById('modal-fin-view-dynamic');
    var modalInst = new bootstrap.Modal(modalEl);

    document.getElementById('btn-view-editar-dynamic').addEventListener('click', function () {
      modalInst.hide();
      setTimeout(function () { abrirModalEditar(d); }, 300);
    });

    modalEl.addEventListener('hidden.bs.modal', function () {
      modalInst.dispose();
      if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    });

    modalInst.show();
  }

  function _getModalFinIds() {
    return {
      id: document.getElementById('fin-id') || document.getElementById('fin-edit-id'),
      tipo: document.getElementById('fin-tipo'),
      data: document.getElementById('fin-data'),
      situacao: document.getElementById('fin-situacao'),
      colaborador: document.getElementById('fin-colaborador'),
      descricao: document.getElementById('fin-descricao'),
      valor: document.getElementById('fin-valor'),
      obs: document.getElementById('fin-obs'),
      erro: document.getElementById('form-fin-erro') || document.getElementById('form-novo-fin-erro'),
      btnSalvar: document.getElementById('btn-salvar-fin') || document.getElementById('btn-salvar-novo-fin'),
      spinner: document.getElementById('spinner-salvar-fin'),
      txtSalvar: document.getElementById('txt-salvar-fin')
    };
  }

  function abrirModalNovo() {
    var f = _getModalFinIds();
    if (f.id) f.id.value = '';
    if (f.tipo) f.tipo.value = '';
    if (f.data) f.data.value = toISO(new Date());
    if (f.situacao) f.situacao.value = 'pendente';
    if (f.colaborador) f.colaborador.value = '';
    if (f.descricao) f.descricao.value = '';
    if (f.valor) f.valor.value = '';
    if (f.obs) f.obs.value = '';
    if (f.erro) f.erro.classList.add('d-none');
    var preview = document.getElementById('fin-preview-comissao');
    if (preview) preview.classList.add('d-none');

    var modalEl = document.getElementById('modalFormFin') || document.getElementById('modalNovoFinanceiro');
    if (modalEl) { var inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.dispose(); new bootstrap.Modal(modalEl).show(); }
  }

  function abrirModalEditar(d) {
    var f = _getModalFinIds();
    if (f.erro) f.erro.classList.add('d-none');
    if (f.id) f.id.value = d.id || '';
    if (f.tipo) f.tipo.value = d.tipo || '';
    if (f.data) f.data.value = d.dataISO || '';
    if (f.situacao) f.situacao.value = d.situacao || 'pendente';
    if (f.colaborador) f.colaborador.value = d.motoboy && d.motoboy !== '-' ? d.motoboy : '';
    if (f.descricao) f.descricao.value = d.descricao || '';
    if (f.valor) f.valor.value = parseFloat(d.valor || 0).toFixed(2).replace('.', ',');
    if (f.obs) f.obs.value = d.observacao || '';
    atualizarPreviewComissao();

    var modalEl = document.getElementById('modalFormFin') || document.getElementById('modalNovoFinanceiro');
    if (modalEl) { var inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.dispose(); new bootstrap.Modal(modalEl).show(); }
  }

  function atualizarPreviewComissao() {
    var f = _getModalFinIds();
    var preview = document.getElementById('fin-preview-comissao');
    if (!preview) return;
    var val = parseValor(f.valor ? f.valor.value : '0');
    var temColab = !!(f.colaborador && f.colaborador.value);
    if (val > 0) {
      preview.classList.remove('d-none');
      setText('preview-valor-total', formatarMoeda(val));
      setText('preview-valor-colab', temColab ? formatarMoeda(val * 0.8) : '—');
      setText('preview-valor-empresa', formatarMoeda(val * (temColab ? 0.2 : 1)));
      setText('preview-pct-colab', temColab ? '80' : '0');
      setText('preview-pct-empresa', temColab ? '20' : '100');
    } else {
      preview.classList.add('d-none');
    }
  }

  function salvarLancamento() {
    var f = _getModalFinIds();

    function mostrarErro(msg) {
      if (f.erro) { f.erro.textContent = msg; f.erro.classList.remove('d-none'); }
    }
    if (f.erro) f.erro.classList.add('d-none');

    var id = f.id ? (f.id.value || '').trim() : '';
    var tipo = f.tipo ? (f.tipo.value || '').trim() : '';
    var dataISO = f.data ? (f.data.value || '').trim() : '';
    var situacao = f.situacao ? (f.situacao.value || 'pendente') : 'pendente';
    var colaborador = f.colaborador ? (f.colaborador.value || '').trim() : '';
    var descricao = f.descricao ? (f.descricao.value || '').trim() : '';
    var valorRaw = f.valor ? (f.valor.value || '').trim() : '';
    var obs = f.obs ? (f.obs.value || '').trim() : '';

    if (!tipo) return mostrarErro('Selecione o tipo.');
    if (!dataISO) return mostrarErro('Informe a data.');
    if (!descricao) return mostrarErro('Informe a descrição.');
    if (!valorRaw) return mostrarErro('Informe o valor.');

    var valor = parseValor(valorRaw);
    if (valor <= 0) return mostrarErro('Valor deve ser maior que zero.');

    var dataParts = dataISO.split('-');
    var dataBR = dataParts[2] + '/' + dataParts[1] + '/' + dataParts[0];

    var pctComissao = colaborador ? 80 : 0;
    var pctEmpresa = colaborador ? 20 : 100;
    var valorColab = colaborador ? parseFloat((valor * 0.8).toFixed(2)) : 0;
    var valorEmpresa = colaborador ? parseFloat((valor * 0.2).toFixed(2)) : parseFloat(valor.toFixed(2));

    var payload = {
      tipo: tipo,
      data: dataBR,
      descricao: descricao,
      valor: valor,
      motoboy: colaborador,
      valor_empresa: valorEmpresa,
      valor_colaborador: valorColab,
      percentual_comissao: pctComissao,
      observacao: obs,
      situacao: situacao,
      colaborador_id: '',
      id_pedido: ''
    };

    if (id) {
      payload.id = id;
      payload.action = 'updatefinanceiro';
    } else {
      payload.action = 'addfinanceiro';
    }

    if (f.btnSalvar) { f.btnSalvar.disabled = true; }
    if (f.spinner) { f.spinner.classList.remove('d-none'); }
    if (f.txtSalvar) { f.txtSalvar.textContent = 'Salvando...'; }

    window.API.call(payload.action, payload)
      .then(function (res) {
        if (isRespostaSucesso(res)) {
          var modalEl = document.getElementById('modalFormFin') || document.getElementById('modalNovoFinanceiro');
          if (modalEl) { var inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.hide(); }
          finToast(id ? 'Lançamento atualizado!' : 'Lançamento criado!', 'success');
          carregarDados();
        } else {
          mostrarErro('Erro ao salvar: ' + ((res && (res.message || res.msg)) || 'Erro desconhecido'));
        }
      })
      .catch(function (e) {
        console.error('[Fin][salvar] Erro na API:', e);
        mostrarErro('Falha na comunicação com o servidor.');
      })
      .finally(function () {
        if (f.btnSalvar) { f.btnSalvar.disabled = false; }
        if (f.spinner) { f.spinner.classList.add('d-none'); }
        if (f.txtSalvar) { f.txtSalvar.textContent = 'Salvar'; }
      });
  }

  function confirmarExclusao(item) {
    if (!item || !item.id) return;
    var old = document.getElementById('modalConfirmDeleteFin');
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var tipoLabel = item.tipo === 'entrada' ? 'Receita' : 'Despesa';
    var tipoColor = item.tipo === 'entrada' ? '#198754' : '#dc3545';
    var tipoIcon = item.tipo === 'entrada' ? 'bi-arrow-down-circle-fill' : 'bi-arrow-up-circle-fill';
    var html =
      '<div class="modal fade" id="modalConfirmDeleteFin" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered" style="max-width:420px;">' +
      '<div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">' +
      '<div style="background:linear-gradient(135deg,#dc3545 0%,#b02a37 100%);padding:20px 24px 16px;position:relative;">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-trash3-fill" style="font-size:1.2rem;color:#fff;"></i></div>' +
      '<div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;letter-spacing:.3px;">Confirmar Exclusão</h6>' +
      '<small style="color:rgba(255,255,255,.65);font-size:.72rem;">Esta ação não poderá ser desfeita</small></div></div>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div>' +
      '<div class="modal-body px-4 py-4">' +
      '<div style="background:#fff8f8;border:1.5px solid #f5c2c7;border-radius:12px;padding:14px 16px;margin-bottom:18px;">' +
      '<div class="d-flex align-items-center gap-2 mb-2">' +
      '<i class="bi ' + tipoIcon + '" style="color:' + tipoColor + ';font-size:1rem;"></i>' +
      '<span style="font-size:.72rem;font-weight:700;color:' + tipoColor + ';text-transform:uppercase;letter-spacing:.5px;">' + tipoLabel + '</span></div>' +
      '<div class="d-flex justify-content-between align-items-start mb-1">' +
      '<span style="font-size:.78rem;color:#555;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(item.descricao || '-') + '</span>' +
      '<span style="font-size:.95rem;font-weight:700;color:#dc3545;">' + formatarMoeda(item.valor) + '</span></div>' +
      '<div class="d-flex gap-3"><span style="font-size:.68rem;color:#888;"><i class="bi bi-calendar3 me-1"></i>' + escapeHtml(item.dataBR || '-') + '</span></div></div>' +
      '<div class="d-flex align-items-start gap-2" style="background:#fff3cd;border:1px solid #ffc107;border-radius:10px;padding:10px 14px;">' +
      '<i class="bi bi-exclamation-triangle-fill" style="color:#856404;font-size:.95rem;margin-top:1px;flex-shrink:0;"></i>' +
      '<span style="font-size:.74rem;color:#664d03;line-height:1.45;">Tem certeza que deseja <strong>excluir permanentemente</strong> este lançamento?</span></div></div>' +
      '<div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex justify-content-end">' +
      '<button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;"><i class="bi bi-x-lg me-1"></i>Cancelar</button>' +
      '<button type="button" class="btn btn-danger rounded-pill px-4" id="btn-confirmar-delete-fin" style="font-size:.78rem;height:38px;font-weight:600;"><i class="bi bi-trash3 me-1"></i>Sim, excluir</button>' +
      '</div></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById('modalConfirmDeleteFin');
    var modalInst = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
    document.getElementById('btn-confirmar-delete-fin').addEventListener('click', function () { modalInst.hide(); excluir(item.id); });
    modalEl.addEventListener('hidden.bs.modal', function () { modalInst.dispose(); if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); state.deletePendingId = null; });
    state.deletePendingId = item.id;
    modalInst.show();
  }

  function excluir(id) {
    if (!id) return;
    window.API.call('deletefinanceiro', { id: id })
      .then(function (res) {
        if (isRespostaSucesso(res)) { finToast('Lançamento excluído.', 'success'); carregarDados(); }
        else { finToast('Erro ao excluir: ' + ((res && (res.message || res.msg)) || ''), 'danger'); }
      })
      .catch(function () { finToast('Falha na comunicação.', 'danger'); });
  }

  function popularOrigem() {
    var optMotoboys = document.getElementById('extrato-opt-motoboys');
    var optGrupos = document.getElementById('extrato-opt-grupos');
    if (!optMotoboys || !optGrupos) return;
    optMotoboys.innerHTML = '';
    optGrupos.innerHTML = '';
    var motoboysMap = {}, gruposMap = {};
    for (var i = 0; i < state.cache.length; i++) {
      var reg = state.cache[i];
      var mb = (reg.motoboy || '').trim();
      if (mb && mb !== '-') motoboysMap[mb] = true;
      var gr = (reg.grupo || '').trim();
      if (gr) gruposMap[gr] = true;
    }
    Object.keys(motoboysMap).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (nome) {
      var opt = document.createElement('option');
      opt.value = 'motoboy::' + nome; opt.textContent = '🏍️ ' + nome;
      optMotoboys.appendChild(opt);
    });
    Object.keys(gruposMap).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (nome) {
      var opt = document.createElement('option');
      opt.value = 'grupo::' + nome; opt.textContent = '📂 ' + nome;
      optGrupos.appendChild(opt);
    });
  }

  function aplicarPeriodoExtrato(tipo) {
    var hoje = new Date();
    var inicio = new Date();
    if (tipo === 'semanal') inicio.setDate(hoje.getDate() - 6);
    else if (tipo === 'quinzenal') inicio.setDate(hoje.getDate() - 14);
    else if (tipo === 'mensal') inicio.setDate(hoje.getDate() - 29);
    if (els.extratoDataInicio) els.extratoDataInicio.value = toISO(inicio);
    if (els.extratoDataFim) els.extratoDataFim.value = toISO(hoje);
  }

  function salvarExtratoStorage(extrato) {
    var lista = carregarExtratosStorage();
    var obj = {
      id: extrato.id || ('ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
      origem: extrato.origem || '-',
      periodoLabel: extrato.periodoLabel || '',
      criadoEm: new Date().toISOString(),
      registros: (extrato.registros || []).map(function (r) {
        return {
          dataBR: r.dataBR || '', descricao: r.descricao || '', motoboy: r.motoboy || '-',
          situacao: r.situacao || '', tipo: r.tipo || 'entrada',
          valor: r.valor || 0, valorColaborador: r.valorColaborador || 0, valorEmpresa: r.valorEmpresa || 0,
          cliente: r.cliente || '-', solicitante: r.solicitante || '-'
        };
      })
    };
    lista.unshift(obj);
    if (lista.length > EXTRATO_MAX) lista = lista.slice(0, EXTRATO_MAX);
    try { localStorage.setItem(EXTRATO_STORAGE_KEY, JSON.stringify(lista)); } catch (e) { console.error(e); }
    return obj;
  }

  function carregarExtratosStorage() {
    try { var d = localStorage.getItem(EXTRATO_STORAGE_KEY); return d ? JSON.parse(d) : []; } catch (e) { return []; }
  }

  function removerExtratoStorage(id) {
    var extratos = carregarExtratosStorage().filter(function (ex) { return ex.id !== id; });
    try { localStorage.setItem(EXTRATO_STORAGE_KEY, JSON.stringify(extratos)); } catch (e) { console.error(e); }
  }

  function buscarExtratoStoragePorId(id) {
    var extratos = carregarExtratosStorage();
    for (var i = 0; i < extratos.length; i++) { if (extratos[i].id === id) return extratos[i]; }
    return null;
  }

  function filtrarRegistrosExtrato(dataInicio, dataFim, tipoOrigem, nomeOrigem) {
    var resultado = [];
    for (var i = 0; i < state.cache.length; i++) {
      var reg = state.cache[i];
      var dataReg = reg.dataISO || '';
      if (dataInicio && dataReg < dataInicio) continue;
      if (dataFim && dataReg > dataFim) continue;
      if (tipoOrigem === 'motoboy' && (reg.motoboy || '').trim().toLowerCase() !== nomeOrigem.toLowerCase()) continue;
      if (tipoOrigem === 'grupo' && (reg.grupo || '').trim().toLowerCase() !== nomeOrigem.toLowerCase()) continue;
      resultado.push(reg);
    }
    return resultado.sort(function (a, b) { return (a.dataISO || '').localeCompare(b.dataISO || ''); });
  }

  function montarHtmlExtratoFromObj(extrato) {
    var regs = extrato.registros || [];
    var totalEnt = 0, totalSai = 0, totalColabs = 0, totalEmpresa = 0;
    var linhas = regs.map(function (r) {
      var isE = r.tipo === 'entrada';
      var val = parseFloat(r.valor) || 0;
      var vColab = parseFloat(r.valorColaborador) || 0;
      var vEmp = isE ? (parseFloat(r.valorEmpresa) > 0 ? parseFloat(r.valorEmpresa) : (vColab > 0 ? val * 0.2 : val)) : 0;
      if (isE) { totalEnt += val; totalColabs += vColab; totalEmpresa += vEmp; } else { totalSai += val; }
      return '<tr>' +
        '<td>' + escapeHtml(r.dataBR || '-') + '</td>' +
        '<td>' + escapeHtml(r.cliente || '-') + '</td>' +
        '<td>' + escapeHtml(r.solicitante || '-') + '</td>' +
        '<td class="text-end"><span style="color:' + (isE ? '#198754' : '#dc3545') + ';font-weight:600;">' + (isE ? '+ ' : '- ') + formatarMoeda(val) + '</span></td>' +
        (isE
          ? '<td class="text-end" style="color:#6f42c1;">' + formatarMoeda(vColab) + '</td>' +
          '<td class="text-end" style="color:#0d6efd;">' + formatarMoeda(vEmp) + '</td>'
          : '<td colspan="2"></td>') +
        '</tr>';
    }).join('');
    var saldo = totalEmpresa - totalSai;
    return '<div class="extrato-bank-info">' +
      '<div><strong>Origem:</strong> ' + escapeHtml(extrato.origem || '-') + '</div>' +
      '<div><strong>Período:</strong> ' + escapeHtml(extrato.periodoLabel || '-') + '</div>' +
      '<div><strong>Gerado em:</strong> ' + (extrato.criadoEm ? new Date(extrato.criadoEm).toLocaleString('pt-BR') : '-') + '</div></div>' +
      '<table class="extrato-bank-table"><thead><tr>' +
      '<th>Data</th><th>Cliente</th><th>Solicitante</th>' +
      '<th class="text-end">Valor</th><th class="text-end">Colaborador (80%)</th><th class="text-end">Empresa (20%)</th>' +
      '</tr></thead><tbody>' +
      (linhas || '<tr><td colspan="6" class="text-center text-muted py-3">Nenhum registro.</td></tr>') +
      '</tbody></table>' +
      '<div class="extrato-bank-resumo">' +
      '<span class="extrato-bank-resumo-item"><i class="bi bi-arrow-down-circle text-success"></i> Receitas: <strong>' + formatarMoeda(totalEnt) + '</strong></span>' +
      '<span class="extrato-bank-resumo-item"><i class="bi bi-arrow-up-circle text-danger"></i> Despesas: <strong>' + formatarMoeda(totalSai) + '</strong></span>' +
      '<span class="extrato-bank-resumo-item"><i class="bi bi-person-check" style="color:#6f42c1;"></i> Colaboradores (80%): <strong style="color:#6f42c1;">' + formatarMoeda(totalColabs) + '</strong></span>' +
      '<span class="extrato-bank-resumo-item"><i class="bi bi-building" style="color:#0d6efd;"></i> Empresa (20%): <strong style="color:#0d6efd;">' + formatarMoeda(totalEmpresa) + '</strong></span>' +
      '<span class="extrato-bank-resumo-item"><i class="bi bi-wallet2"></i> Saldo: <strong style="color:' + (saldo >= 0 ? '#198754' : '#dc3545') + ';">' + formatarMoeda(saldo) + '</strong></span></div>';
  }

  function montarTextoExtratoParaCopiar(extrato) {
    var regs = extrato.registros || [];
    var totalEnt = 0, totalSai = 0, totalColabs = 0, totalEmpresa = 0;
    var linhas = '';
    for (var i = 0; i < regs.length; i++) {
      var r = regs[i];
      var isE = r.tipo === 'entrada';
      var val = parseFloat(r.valor) || 0;
      var vColab = parseFloat(r.valorColaborador) || 0;
      var vEmp = isE ? (parseFloat(r.valorEmpresa) > 0 ? parseFloat(r.valorEmpresa) : (vColab > 0 ? val * 0.2 : val)) : 0;
      if (isE) { totalEnt += val; totalColabs += vColab; totalEmpresa += vEmp; } else { totalSai += val; }
      linhas += (r.dataBR || '-') + ' | ' + (r.cliente || '-') + ' | ' + (r.solicitante || '-') +
        ' | ' + (isE ? '+' : '-') + ' ' + formatarMoeda(val) +
        (isE ? ' | Colab: ' + formatarMoeda(vColab) + ' | Emp: ' + formatarMoeda(vEmp) : '') + '\n';
    }
    var saldo = totalEmpresa - totalSai;
    return '========== EXTRATO ==========\nOrigem: ' + (extrato.origem || '-') +
      '\nPeríodo: ' + (extrato.periodoLabel || '-') +
      '\nGerado em: ' + (extrato.criadoEm ? new Date(extrato.criadoEm).toLocaleString('pt-BR') : '-') +
      '\n-----------------------------\n' + linhas + '-----------------------------\n' +
      'Receitas: ' + formatarMoeda(totalEnt) + '\nDespesas: ' + formatarMoeda(totalSai) +
      '\nColaboradores (80%): ' + formatarMoeda(totalColabs) + '\nEmpresa (20%): ' + formatarMoeda(totalEmpresa) +
      '\nSaldo: ' + formatarMoeda(saldo) + '\n=============================';
  }

  function abrirExtratoModal(extrato) {
    if (!extrato || !els.extratoModalOverlay || !els.extratoModalBody) return;
    if (els.extratoModalTitulo) els.extratoModalTitulo.textContent = 'EXTRATO - ' + (extrato.origem || 'CONTA').toUpperCase();
    els.extratoModalBody.innerHTML = montarHtmlExtratoFromObj(extrato);
    els.extratoModalOverlay.style.display = 'flex';
    if (els.extratoModalFechar) els.extratoModalFechar.onclick = function () { els.extratoModalOverlay.style.display = 'none'; };
    if (els.extratoModalCopiar) els.extratoModalCopiar.onclick = function () { copiarTextoClipboard(montarTextoExtratoParaCopiar(extrato)); };
    els.extratoModalOverlay.onclick = function (e) { if (e.target === els.extratoModalOverlay) els.extratoModalOverlay.style.display = 'none'; };
  }

  function renderizarListaExtratos() {
    var container = els.extratoLista;
    if (!container) return;

    var extratos = carregarExtratosStorage();

    if (!extratos.length) {
      container.innerHTML =
        '<div class="extrato-placeholder" id="extrato-placeholder">' +
        '<i class="bi bi-file-earmark-text"></i>' +
        '<span>Nenhum extrato gerado ainda.<br>Selecione o período, a origem e clique em <strong>Gerar</strong>.</span>' +
        '</div>';
      return;
    }

    // ── Build cards ──────────────────────────────────────────────────────────
    container.innerHTML = extratos.map(function (ex) {
      var totalRegs = (ex.registros || []).length;
      var regsLabel = totalRegs + ' registro' + (totalRegs !== 1 ? 's' : '');
      var criadoLabel = ex.criadoEm ? new Date(ex.criadoEm).toLocaleString('pt-BR') : '-';
      var id = escapeHtml(ex.id);

      return (
        '<div class="extrato-item-card" data-extrato-id="' + id + '">' +
        '<div class="extrato-item-left">' +
        '<div class="extrato-item-icon"><i class="bi bi-file-earmark-bar-graph"></i></div>' +
        '<div>' +
        '<div class="extrato-item-titulo">' + escapeHtml(ex.origem || '-') + '</div>' +
        '<div class="extrato-item-sub">' + escapeHtml(ex.periodoLabel || '-') + ' · ' + regsLabel + '</div>' +
        '<div class="extrato-item-sub">' + criadoLabel + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="extrato-item-actions">' +
        '<button class="extrato-item-btn extrato-item-btn-ver" data-id="' + id + '" title="Visualizar"><i class="bi bi-eye"></i></button>' +
        '<button class="extrato-item-btn extrato-item-btn-del" data-id="' + id + '" title="Excluir"><i class="bi bi-trash"></i></button>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    // ── Eventos ──────────────────────────────────────────────────────────────
    container.querySelectorAll('.extrato-item-btn-ver').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var ext = buscarExtratoStoragePorId(this.getAttribute('data-id'));
        if (ext) abrirExtratoModal(ext);
      });
    });

    container.querySelectorAll('.extrato-item-btn-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        removerExtratoStorage(this.getAttribute('data-id'));
        finToast('Extrato removido.', 'success');
        renderizarListaExtratos();
      });
    });

    container.querySelectorAll('.extrato-item-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var ext = buscarExtratoStoragePorId(this.getAttribute('data-extrato-id'));
        if (ext) abrirExtratoModal(ext);
      });
    });
  }

  function initExtrato() {
    aplicarPeriodoExtrato('diario');
    document.querySelectorAll('.extrato-periodo-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.extrato-periodo-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        var periodo = this.getAttribute('data-periodo');
        if (periodo) aplicarPeriodoExtrato(periodo);
      });
    });

    if (els.btnGerarExtrato) {
      els.btnGerarExtrato.addEventListener('click', function () {
        var di = els.extratoDataInicio ? els.extratoDataInicio.value : '';
        var df = els.extratoDataFim ? els.extratoDataFim.value : '';
        var origemVal = els.extratoOrigem ? els.extratoOrigem.value : '';
        if (!di || !df) { finToast('Selecione o período.', 'warning'); return; }
        if (!origemVal) { finToast('Selecione a origem.', 'warning'); return; }
        if (di > df) { finToast('Data inicial maior que a final.', 'warning'); return; }

        var tipoOrigem = '', nomeOrigem = '', origemLabel = '';
        if (origemVal === '__caixa__') {
          tipoOrigem = 'caixa'; origemLabel = 'Caixa Geral';
        } else if (origemVal.indexOf('motoboy::') === 0) {
          tipoOrigem = 'motoboy'; nomeOrigem = origemVal.replace('motoboy::', ''); origemLabel = 'Motoboy: ' + nomeOrigem;
        } else if (origemVal.indexOf('grupo::') === 0) {
          tipoOrigem = 'grupo'; nomeOrigem = origemVal.replace('grupo::', ''); origemLabel = 'Grupo: ' + nomeOrigem;
        }

        var registros = filtrarRegistrosExtrato(di, df, tipoOrigem, nomeOrigem);
        var periodoLabel = formatDateBR(di) + ' a ' + formatDateBR(df);
        var extrato = salvarExtratoStorage({ origem: origemLabel, periodoLabel: periodoLabel, registros: registros });
        finToast('Extrato gerado com ' + registros.length + ' registro(s)!', 'success');
        renderizarListaExtratos();
        abrirExtratoModal(extrato);
      });
    }

    renderizarListaExtratos();
  }

  function carregarDados() {
    if (state.fetching) return;
    state.fetching = true;
    spinOn();

    Promise.all([
      window.API.call('getfinanceiro', {}),
      window.API.call('getpedidos', {}),
      window.API.call('getclientes', {}),
      window.API.call('getColaboradores', {})
    ]).then(function (results) {

      // ── Clientes ────────────────────────────────────────────────────────────
      var clientesArr = extrairArray(results[2]);
      state.clientesCache = {};
      clientesArr.forEach(function (cli) {
        var cliId = (cli.id || '').toString().trim();
        if (cliId) state.clientesCache[cliId] = {
          id: cliId,
          username: (cli.username || '').toString().trim(),
          responsavel: (cli.responsavel || '').toString().trim(),
          contato: (cli.contato || '').toString().trim()
        };
      });

      // ── Colaboradores → cache id → username ─────────────────────────────────
      var colaboradoresArr = extrairArray(results[3]);
      state.colaboradoresCache = {};
      state.colaboradores = colaboradoresArr;
      colaboradoresArr.forEach(function (col) {
        var colId = (col.id || '').toString().trim();
        if (colId) state.colaboradoresCache[colId] = {
          id: colId,
          username: (col.username || '').toString().trim(),
          colaborador: (col.colaborador || '').toString().trim()
        };
      });

      // ── Pedidos → inclui colaborador_id para fallback ────────────────────────
      var pedidosArr = extrairArray(results[1]);
      state.pedidosCache = {};
      pedidosArr.forEach(function (ped) {
        var pedId = (ped.id || '').toString().trim();
        if (pedId) state.pedidosCache[pedId] = {
          id: pedId,
          id_cliente: (ped.id_cliente || '').toString().trim(),
          solicitante: (ped.solicitante || '').toString().trim(),
          colaborador_id: (ped.colaborador_id || '').toString().trim()  // ← NOVO
        };
      });

      // ── Financeiro ──────────────────────────────────────────────────────────
      // colaboradoresCache já populado ANTES de normalizar
      var finArr = extrairArray(results[0]);
      state.cache = [];
      finArr.forEach(function (item) {
        try { state.cache.push(normalizarRegistro(item)); }
        catch (e) { console.error('[Fin][carregarDados] Erro ao normalizar:', item, e); }
      });

      resolverClienteSolicitante();
      popularOrigem();
      renderTodos();
      renderCaixa();
      renderizarListaExtratos();

    }).catch(function (e) {
      console.error('[Fin][carregarDados] Erro:', e);
      finToast('Erro ao carregar dados.', 'danger');
    }).finally(function () {
      state.fetching = false;
      spinOff();
    });
  }

  window.initFinanceiro = function () {
    state.fetching = false;
    state.cache = [];
    state.pedidosCache = {};
    state.clientesCache = {};
    state.colaboradores = [];
    state.caixaValoresVisiveis = false;
    state.tabAtual = 'todos';
    state.filtroTipo = 'todos';
    state.filtroSituacao = 'todos';
    state.filtroBusca = '';
    state.sortDataDesc = true;
    state.deletePendingId = null;
    state.todos.pagina = 1;
    state.caixa.pagina = 1;
    state.caixa.dataInicio = '';
    state.caixa.dataFim = '';
    state.caixa.dadosFiltrados = [];
    bind();
    registrarEventos();
    initExtrato();
    carregarDados();
  };

})();
