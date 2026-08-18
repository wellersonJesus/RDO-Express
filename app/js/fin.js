'use strict';

if (!window.EventBus) {
  window.EventBus = (function () {
    var listeners = {};
    return {
      on: function (evento, callback) {
        if (!listeners[evento]) listeners[evento] = [];
        listeners[evento].push(callback);
      },
      off: function (evento, callback) {
        if (!listeners[evento]) return;
        listeners[evento] = listeners[evento].filter(function (cb) { return cb !== callback; });
      },
      emit: function (evento, payload) {
        if (!listeners[evento]) return;
        listeners[evento].forEach(function (cb) {
          try { cb(payload); } catch (e) { console.error('[EventBus] Erro no listener de "' + evento + '":', e); }
        });
      }
    };
  })();
}

(function () {

  var EXTRATO_STORAGE_KEY = 'rdo_extratos_salvos';
  var EXTRATO_MAX = 50;
  var els = {};
  var filtroCaixaAtivo = null;
  var _finJaInicializado = false;
  var _relatorioFinCarregando = null;

  var CAIXA_PERIODO_STORAGE_KEY = 'rdo_periodos_caixa_salvos';
  var CAIXA_PERIODO_MAX = 50;
  var caixaPeriodoAtual = { inicio: '', fim: '', registros: [] };
  var CAIXA_BUSCA_SESSION_KEY = 'rdo_caixa_busca_atual';
  var _tokenAbrirPedidoFinanceiro = 0;

  var _repassesAbrindoAgora = false;
  var _extratosCaixaAbrindoAgora = false;
  var _rdoValoresVisiveis = false;

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
    todos: { pagina: 1, porPagina: obterPorPaginaFin(), totalPag: 1 },
    caixa: { pagina: 1, porPagina: obterPorPaginaFin(), totalPag: 1, dataInicio: '', dataFim: '', filtroDescricao: '', filtroValor: '', dadosFiltrados: [], listaFiltradaAtual: [], buscaRealizada: false },
    extrato: { filtroDescricao: '' }
  };
  window._debugFinState = state;

  window.financeiroState = state;

  function normalizarIdComparacao(valor) {
    if (valor === null || valor === undefined) return null;
    var digitos = String(valor).replace(/\D/g, "");
    if (!digitos) return null;
    var semZeros = digitos.replace(/^0+/, "");
    return semZeros || "0";
  }

  function limparSufixoHoraValorDescricao(descricao) {
    if (!descricao) return descricao;
    return String(descricao).replace(/\s*\[\s*\d{1,2}:\d{2}\s*\|\s*r\$?\s*[\d.,]+\s*\]\s*$/i, '').trim();
  }

  function montarLinhaExtratoHtml(r, estiloDescricao, estiloValor) {
    var valorClasse = r.tipo === 'entrada' ? 'text-success' : 'text-danger';
    var hora = r.hora || obterHoraRegistro(r) || '--:--';
    var descricaoLimpa = limparSufixoHoraValorDescricao(r.descricao) || '-';
    return '' +
      '<div style="display:flex;align-items:baseline;gap:6px;padding:6px 4px;">' +
      '<span style="font-size:.72rem;color:#999;white-space:nowrap;flex-shrink:0;width:36px;">' + escapeHtml(hora) + '</span>' +
      '<span style="font-size:.78rem;color:#555;white-space:nowrap;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;max-width:55%;">' + escapeHtml(descricaoLimpa) + '</span>' +
      '<span style="flex:1;border-bottom:1.5px dotted #b8b8b8;height:1px;margin:0 2px;position:relative;top:-4px;"></span>' +
      '<span class="' + valorClasse + '" style="font-size:.8rem;font-weight:700;white-space:nowrap;flex-shrink:0;">' + formatarMoeda(r.valor) + '</span>' +
      '</div>';
  }

  function gerarHtmlRelatorioExtrato(ext) {
    var registros = ext.registros || [];
    var totais = calcularTotaisRegistros(registros);
    var blocos = agruparRegistrosPorData(registros);

    var blocosHtml = blocos.map(function (bloco, idx) {
      var cor = corBlocoDataFin(idx);
      var totaisDia = calcularTotaisRegistros(bloco.registros);
      var labelData = bloco.dataISO !== 'sem-data' ? formatDateBR(bloco.dataISO) : 'Sem data';
      var labelSemana = bloco.dataISO !== 'sem-data' ? getDiaSemanaCompleto(bloco.dataISO) : '';

      var registrosOrdenados = bloco.registros.slice().sort(function (a, b) {
        var ha = (a.hora || '');
        var hb = (b.hora || '');
        return ha < hb ? -1 : (ha > hb ? 1 : 0);
      });

      var linhas = registrosOrdenados.map(function (r) {
        var valorClasse = r.valor >= 0 && r.tipo === 'entrada' ? 'positivo' : 'negativo';
        var hora = r.hora || obterHoraRegistro(r) || '--:--';
        return '' +
          '<div class="linha-extrato">' +
          '<span class="hora-extrato">' + escapeHtml(hora) + '</span>' +
          '<span class="desc-extrato">' + escapeHtml(limparSufixoHoraValorDescricao(r.descricao) || '-') + '</span>' +
          '<span class="pontos-extrato"></span>' +
          '<span class="valor-extrato ' + valorClasse + '">' + formatarMoeda(r.valor) + '</span>' +
          '</div>';
      }).join('');

      return '' +
        '<div class="bloco-data" style="background:' + cor.bg + ';border:1px solid ' + cor.borda + ';">' +
        '<div class="bloco-data-header" style="border-bottom:1px solid ' + cor.borda + ';">' +
        '<span class="bloco-data-label">' + labelData + (labelSemana ? ' <span class="bloco-data-semana">' + labelSemana + '</span>' : '') + '</span>' +
        '<span class="bloco-data-saldo" style="color:' + (totaisDia.saldo >= 0 ? '#2e7d32' : '#c62828') + ';">' + formatarMoeda(totaisDia.saldo) + '</span>' +
        '</div>' +
        '<div class="bloco-data-body">' + linhas + '</div>' +
        '</div>';
    }).join('');

    return '' +
      '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
      '<title>Extrato - ' + escapeHtml(ext.origem || '-') + '</title>' +
      '<style>' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }' +
      'body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: #333; padding: 24px; -webkit-font-smoothing: antialiased; }' +
      '.relatorio-header { margin-bottom: 18px; padding-bottom: 10px; border-bottom: 1px solid #eee; }' +
      '.relatorio-titulo { font-size: 14px; font-weight: 600; color: #333; }' +
      '.relatorio-periodo { font-size: 10.5px; font-weight: 400; color: #999; text-transform: uppercase; letter-spacing: .3px; margin-top: 2px; }' +
      '.bloco-data { border-radius: 10px; margin-bottom: 12px; overflow: hidden; }' +
      '.bloco-data-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; }' +
      '.bloco-data-label { font-size: 11.5px; font-weight: 700; color: #444; }' +
      '.bloco-data-semana { font-size: 10px; font-weight: 400; color: #888; margin-left: 6px; }' +
      '.bloco-data-saldo { font-size: 11px; font-weight: 700; }' +
      '.bloco-data-body { padding: 4px 12px 8px; }' +
      '.linha-extrato { display: flex; align-items: baseline; gap: 6px; padding: 5px 0; }' +
      '.hora-extrato { font-size: 10.5px; color: #999; white-space: nowrap; flex-shrink: 0; width: 40px; }' +
      '.desc-extrato { font-size: 11.5px; color: #555; white-space: nowrap; flex-shrink: 0; max-width: 55%; overflow: hidden; text-overflow: ellipsis; }' +
      '.pontos-extrato { flex: 1; border-bottom: 1.5px dotted #b0b0b0; height: 1px; margin: 0 2px; position: relative; top: -4px; }' +
      '.valor-extrato { font-size: 12px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }' +
      '.valor-extrato.positivo { color: #2e7d32; }' +
      '.valor-extrato.negativo { color: #c62828; }' +
      '.relatorio-total { margin-top: 18px; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }' +
      '.relatorio-total-label { font-size: 11px; color: #666; }' +
      '.relatorio-total-valor { font-size: 14px; font-weight: 700; color: #333; margin-left: 6px; }' +
      '</style></head><body>' +
      '<div class="relatorio-header">' +
      '<div class="relatorio-titulo">' + escapeHtml(ext.origem || '-') + '</div>' +
      '<div class="relatorio-periodo">' + escapeHtml(ext.periodoLabel || '-') + '</div>' +
      '</div>' +
      blocosHtml +
      '<div class="relatorio-total">' +
      '<div class="relatorio-total-linha"><span class="relatorio-total-label">Total Receitas:</span><span class="relatorio-total-valor" style="color:#2e7d32;">' + formatarMoeda(totais.entradas) + '</span></div>' +
      '<div class="relatorio-total-linha"><span class="relatorio-total-label">Total Despesas:</span><span class="relatorio-total-valor" style="color:#c62828;">' + formatarMoeda(totais.saidas) + '</span></div>' +
      '<div class="relatorio-total-linha relatorio-total-final"><span class="relatorio-total-label">Saldo:</span><span class="relatorio-total-valor" style="color:' + (totais.saldo >= 0 ? '#2e7d32' : '#c62828') + ';">' + formatarMoeda(totais.saldo) + '</span></div>' +
      '</div>' +
      '</body></html>';
  }

  function abrirJanelaPdfExtrato(ext) {
    var html = gerarHtmlRelatorioExtrato(ext); // usa a versão "bonita" com blocos por data
    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { finToast('Seu navegador bloqueou a janela de impressão. Permita pop-ups.', 'warning'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = function () { win.focus(); setTimeout(function () { win.print(); }, 300); };
  }

  function configurarInfoHoverFin() {
    var itens = document.querySelectorAll('#fin-tab-content-todos .fin-status-action-item');
    itens.forEach(function (item) {
      if (item._hoverFinBound) return;
      item._hoverFinBound = true;
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        itens.forEach(function (i) { if (i !== item) i.classList.remove('mostrar-info'); });
        this.classList.toggle('mostrar-info');
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.fin-status-action-item')) {
        itens.forEach(function (i) { i.classList.remove('mostrar-info'); });
      }
    });
  }

  function configurarInfoHoverCaixa() {
    var itens = document.querySelectorAll('#fin-tab-content-caixa .caixa-mini-card');
    itens.forEach(function (item) {
      if (item._hoverCaixaBound) return;
      item._hoverCaixaBound = true;
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        itens.forEach(function (i) { if (i !== item) i.classList.remove('mostrar-info'); });
        this.classList.toggle('mostrar-info');
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#fin-tab-content-caixa .caixa-mini-card')) {
        itens.forEach(function (i) { i.classList.remove('mostrar-info'); });
      }
    });
  }

  function bindFiltrosMiniCaixa() {
    var cards = document.querySelectorAll('#fin-tab-content-caixa .caixa-mini-card[data-filtro-caixa]');
    cards.forEach(function (card) {
      if (card._finCaixaBound) return;
      card._finCaixaBound = true;
      card.addEventListener('click', function (e) {
        e.stopPropagation();
        var tipo = card.getAttribute('data-filtro-caixa');
        aplicarFiltroCaixaMini(tipo, card);
        var itens = document.querySelectorAll('#fin-tab-content-caixa .caixa-mini-card');
        itens.forEach(function (i) { if (i !== card) i.classList.remove('mostrar-info'); });
        card.classList.toggle('mostrar-info');
      });
    });
  }

  function configurarOlhinhoCarteiraRDOP() {
    var btn = els.btnToggleCaixaVal || document.getElementById('btn-toggle-caixa-valores');
    var icon = els.iconToggleCaixaVal || document.getElementById('icon-toggle-caixa-val');
    var painel = document.getElementById('rdo-pay-saldo-wrap') || (els.rdoPaySaldo ? els.rdoPaySaldo.closest('.rdo-pay-saldo-wrap') : null);
    if (!btn || btn._olhinhoRdopBound) return;
    btn._olhinhoRdopBound = true;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      state.caixaValoresVisiveis = !state.caixaValoresVisiveis;

      btn.classList.toggle('oculto', !state.caixaValoresVisiveis);
      if (icon) icon.className = state.caixaValoresVisiveis ? 'bi bi-eye' : 'bi bi-eye-slash';
      btn.title = state.caixaValoresVisiveis ? 'Ocultar valores da carteira RDOP' : 'Mostrar valores da carteira RDOP';

      if (painel) painel.classList.toggle('mostrar-info', state.caixaValoresVisiveis);

      aplicarMascaraValores();
      renderCaixa();
    });
  }

  function initCaixaExtras() {
    bindFiltrosMiniCaixa();
    bindDropdownFiltroCaixa();
    configurarInfoHoverCaixa();
    configurarOlhinhoCarteiraRDOP();
  }

  function obterPorPaginaFin() {
    return window.innerWidth <= 576 ? 5 : 5;
  }

  function aplicarFiltroCaixaMini(tipo, cardEl) {
    if (filtroCaixaAtivo === tipo) {
      filtroCaixaAtivo = null;
      if (cardEl) cardEl.classList.remove('active');
    } else {
      filtroCaixaAtivo = tipo;
      document.querySelectorAll('#fin-tab-content-caixa .caixa-mini-card[data-filtro-caixa]').forEach(function (c) {
        c.classList.remove('active');
      });
      if (cardEl) cardEl.classList.add('active');
    }

    aplicarFiltroCaixaLocal();
  }

  function bindDropdownFiltroCaixa() {
    var btn = document.getElementById('btn-filtrar-caixa');
    var menu = document.getElementById('dropdown-filtro-menu-caixa');
    var wrapper = document.getElementById('dropdown-filtro-wrapper-caixa');
    if (!btn || !menu || !wrapper) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        menu.classList.remove('show');
      }
    });

    var btnLimpar = document.getElementById('btn-caixa-filtro-limpar');
    var btnAplicar = document.getElementById('btn-caixa-filtro-aplicar');
    var inputDesc = document.getElementById('caixa-filtro-descricao');
    var inputValor = document.getElementById('caixa-filtro-valor');

    if (btnLimpar) {
      btnLimpar.addEventListener('click', function () {
        if (inputDesc) inputDesc.value = '';
        if (inputValor) inputValor.value = '';
        filtrarListaDiariaPorTexto('', '');
      });
    }

    if (btnAplicar) {
      btnAplicar.addEventListener('click', function () {
        var desc = inputDesc ? inputDesc.value.trim().toLowerCase() : '';
        var valor = inputValor ? inputValor.value.trim() : '';
        filtrarListaDiariaPorTexto(desc, valor);
        menu.classList.remove('show');
      });
    }
  }

  function filtrarListaDiariaPorTexto(desc, valor) {
    var itens = document.querySelectorAll('#caixa-lista-diaria [data-desc-item]');
    if (!itens.length) return;
    itens.forEach(function (item) {
      var textoDesc = (item.getAttribute('data-desc-item') || '').toLowerCase();
      var textoValor = (item.getAttribute('data-valor-item') || '');
      var passaDesc = !desc || textoDesc.indexOf(desc) !== -1;
      var passaValor = !valor || textoValor.indexOf(valor) !== -1;
      item.style.display = (passaDesc && passaValor) ? '' : 'none';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCaixaExtras);
  } else {
    initCaixaExtras();
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str.toString()));
    return div.innerHTML;
  }

  function debounce(fn, delay) {
    delay = delay || 300;
    var timer = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  function mostrarLupinha(containerId, mensagem) {
    var container = document.getElementById(containerId);
    if (!container) return;
    mensagem = mensagem || 'Buscando informações';
    container.innerHTML =
      '<div class="fin-loading-overlay">' +
      '<div class="fin-loading-content">' +
      '<i class="bi bi-search fin-loading-spin"></i>' +
      '<span class="fin-loading-text">' + mensagem + '<span class="fin-loading-dots"><span>.</span><span>.</span><span>.</span></span></span>' +
      '</div>' +
      '</div>';
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

  function parseCurrencyField(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return v;
    var s = String(v).replace(/R\$\s*/g, '').replace(/%/g, '').replace(/\s/g, '');
    if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') !== -1) s = s.replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? NaN : n;
  }

  function normalizarRegistro(d) {
    var idPedido = (d.id_pedido || d.idPedido || '').toString().trim();
    var dataObj = parseData(d.data_lancamento || d.data);
    var tipoNorm = (d.tipo || '').toString().trim().toLowerCase();
    var valorNum = _parseValor(d.vlr_servico || d.valor || 0);
    var situacaoNorm = (d.situacao || 'pendente').toString().trim().toLowerCase();
    var colaboradorId = (d.colaborador_id || d.colaboradorId || '').toString().trim();

    return {
      id: (d.id || '').toString().trim(),
      idFinanceiro: (d.id || '').toString().trim(),
      idPedido: idPedido,
      colaboradorId: colaboradorId,
      dataISO: dataObj.iso,
      dataBR: dataObj.br,
      dataDisplay: dataObj.display,
      dataPedidoISO: '',
      dataPedidoBR: '',
      dataPedidoDisplay: '',
      tipo: tipoNorm,
      descricao: (d.descricao || '').toString().trim(),
      valor: valorNum,
      situacao: situacaoNorm,
      motoboy: (d.colaborador || d.nome_colaborador || d.colaborador_nome || '').toString().trim() || '-',
      cliente: '',
      solicitante: '',
      observacao: (d.observacao || '').toString().trim(),
      updatedAt: d.updated_at || ''
    };
  }

  function resolverClienteSolicitante() {
    for (var i = 0; i < state.cache.length; i++) {
      var reg = state.cache[i];
      var idPedido = (reg.idPedido || '').toString().trim();

      if (reg.colaboradorId && state.colaboradoresCache[reg.colaboradorId] && (!reg.motoboy || reg.motoboy === '-')) {
        var cAtual = state.colaboradoresCache[reg.colaboradorId];
        reg.motoboy = (cAtual.username || cAtual.nome || '').toString().trim() || '-';
      }

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
      if (!reg.solicitante || reg.solicitante === '' || reg.solicitante === '-')
        reg.solicitante = (pedido.solicitante || '').toString().trim() || '-';
      if (!reg.cliente || reg.cliente === '' || reg.cliente === '-') {
        var idCliente = (pedido.id_cliente || '').toString().trim();
        reg.cliente = (idCliente && state.clientesCache[idCliente])
          ? (state.clientesCache[idCliente].username || '').toString().trim() || '-'
          : '-';
      }
      if (!reg.motoboy || reg.motoboy === '-') {
        var colabIdPedido = (pedido.colaborador_id || '').toString().trim();
        if (colabIdPedido && state.colaboradoresCache[colabIdPedido]) {
          var cPedido = state.colaboradoresCache[colabIdPedido];
          reg.motoboy = (cPedido.username || cPedido.nome || '').toString().trim() || '-';
          if (!reg.colaboradorId) reg.colaboradorId = colabIdPedido;
        }
      }

      if (pedido.data_pedido) {
        var dpObj = parseData(pedido.data_pedido);
        reg.dataPedidoISO = dpObj.iso;
        reg.dataPedidoBR = dpObj.br;
        reg.dataPedidoDisplay = dpObj.display;
      }
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

  function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function formatarMoeda(valor) {
    var num = typeof valor === 'number' ? valor : parseCurrencyField(valor);
    if (isNaN(num)) num = 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function ehReceitaFin(tipo) {
    var t = (tipo || '').toString().trim().toLowerCase();
    return t === 'corrida' || t === 'entrada';
  }

  function formatarMoedaComSinal(valor, tipo) {
    var num = typeof valor === 'number' ? valor : parseCurrencyField(valor);
    if (isNaN(num)) num = 0;
    var sinal = ehReceitaFin(tipo) ? '+' : '−';
    // Remove sinal negativo nativo do toLocaleString (caso valor já venha negativo) para não duplicar
    var absFormatado = Math.abs(num).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return sinal + ' ' + absFormatado;
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function toISO(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function getDiaSemanaCompleto(dataISO) {
    try {
      if (!dataISO) return '';
      var nomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      var data = new Date(dataISO);
      if (isNaN(data.getTime())) return '';
      return nomes[data.getDay()] || '';
    } catch (e) { return ''; }
  }

  function obterMesAtualRange() {
    var hoje = new Date();
    var y = hoje.getFullYear();
    var m = String(hoje.getMonth() + 1).padStart(2, '0');
    var lastDay = new Date(y, hoje.getMonth() + 1, 0).getDate();
    return { inicio: y + '-' + m + '-01', fim: y + '-' + m + '-' + String(lastDay).padStart(2, '0') };
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
      navigator.clipboard.writeText(texto).then(function () { finToast('Extrato copiado!', 'success'); }).catch(function () { fallbackCopy(texto); });
    } else { fallbackCopy(texto); }
  }

  function gerarIdFinanceiro() { return Math.random().toString(36).substr(2, 11); }
  function gerarIdExtrato() { return Math.random().toString(36).substr(2, 11); }

  function carregarPeriodosCaixaStorage() {
    try {
      var raw = localStorage.getItem(CAIXA_PERIODO_STORAGE_KEY);
      if (!raw) return [];
      var lista = JSON.parse(raw);
      lista = Array.isArray(lista) ? lista : [];
      return lista.filter(function (p) { return !p.excluido; });
    } catch (e) { return []; }
  }

  function salvarBuscaCaixaSession(inicio, fim, registros) {
    try {
      sessionStorage.setItem(CAIXA_BUSCA_SESSION_KEY, JSON.stringify({ inicio: inicio, fim: fim, registros: registros }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function carregarBuscaCaixaSession() {
    try {
      var raw = sessionStorage.getItem(CAIXA_BUSCA_SESSION_KEY);
      if (!raw) return null;
      var dados = JSON.parse(raw);
      if (!dados || !dados.inicio || !dados.fim || !Array.isArray(dados.registros)) return null;
      return dados;
    } catch (e) {
      return null;
    }
  }

  function limparBuscaCaixaSession() {
    try {
      sessionStorage.removeItem(CAIXA_BUSCA_SESSION_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function salvarPeriodoCaixaStorage(periodo) {
    try {
      var lista = carregarPeriodosCaixaStorage();
      lista.unshift(periodo);
      if (lista.length > CAIXA_PERIODO_MAX) lista = lista.slice(0, CAIXA_PERIODO_MAX);
      localStorage.setItem(CAIXA_PERIODO_STORAGE_KEY, JSON.stringify(lista));
      return true;
    } catch (e) { return false; }
  }

  function buscarPeriodoCaixaPorId(id) {
    return carregarPeriodosCaixaStorage().find(function (p) { return p.id === id; }) || null;
  }

  function removerPeriodoCaixaStorage(id) {
    try {
      var lista = carregarPeriodosCaixaStorage().filter(function (p) { return p.id !== id; });
      localStorage.setItem(CAIXA_PERIODO_STORAGE_KEY, JSON.stringify(lista));
      return true;
    } catch (e) { return false; }
  }

  function gerarTextoPeriodoCaixa(periodo) {
    var totais = calcularTotaisRegistros(periodo.registros);
    var linhas = [];
    linhas.push('RELATÓRIO DE CAIXA');
    linhas.push('Período: ' + (periodo.periodoLabel || '-'));
    linhas.push('');
    (periodo.registros || []).slice().sort(function (a, b) { return a.dataISO < b.dataISO ? -1 : 1; }).forEach(function (r) {
      linhas.push(r.dataDisplay + ' | ' + (r.tipo === 'entrada' ? 'Receita' : 'Despesa') + ' | ' + (r.descricao || '-') + ' | ' + formatarMoeda(r.valor));
    });
    linhas.push('');
    linhas.push('Total Entradas: ' + formatarMoeda(totais.entradas));
    linhas.push('Total Saídas: ' + formatarMoeda(totais.saidas));
    linhas.push('Saldo: ' + formatarMoeda(totais.saldo));
    return linhas.join('\n');
  }

  function gerarTextoExtrato(extrato) {
    var totais = calcularTotaisRegistros(extrato.registros);
    var linhas = [];
    linhas.push('EXTRATO - ' + (extrato.origem || '-'));
    linhas.push('Período: ' + (extrato.periodoLabel || '-'));
    linhas.push('');
    (extrato.registros || []).slice().sort(function (a, b) { return a.dataISO < b.dataISO ? -1 : 1; }).forEach(function (r) {
      linhas.push(r.dataDisplay + ' | ' + (r.tipo === 'entrada' ? 'Receita' : 'Despesa') + ' | ' + (r.descricao || '-') + ' | ' + formatarMoeda(r.valor));
    });
    linhas.push('');
    linhas.push('Total Entradas: ' + formatarMoeda(totais.entradas));
    linhas.push('Total Saídas: ' + formatarMoeda(totais.saidas));
    linhas.push('Saldo: ' + formatarMoeda(totais.saldo));
    return linhas.join('\n');
  }

  function filtrarLogicoCaixa(lista, descricaoTermo, valorTermo) {
    var desc = removerAcentos((descricaoTermo || '').toLowerCase().trim());
    var val = (valorTermo || '').toString().trim();
    if (!desc && !val) return lista;

    return lista.filter(function (d) {
      if (desc) {
        var poolDesc = removerAcentos(
          [d.descricao, d.motoboy, d.observacao, d.idPedido, d.cliente, d.solicitante, d.dataBR, d.dataDisplay]
            .map(function (c) { return (c || '').toString(); }).join(' ').toLowerCase()
        );
        var termosDesc = desc.split(/\s+/);
        for (var i = 0; i < termosDesc.length; i++) {
          if (termosDesc[i] && poolDesc.indexOf(termosDesc[i]) === -1) return false;
        }
      }
      if (val) {
        var valorNumBusca = parseValor(val);
        var valorFormatado = formatarMoeda(d.valor);
        var valorSimples = (d.valor || 0).toFixed(2).replace('.', ',');
        var valorPonto = (d.valor || 0).toFixed(2);
        var valorInt = String(Math.round(d.valor || 0));
        var poolValor = removerAcentos([valorFormatado, valorSimples, valorPonto, valorInt].join(' ').toLowerCase());
        var termoValorLimpo = removerAcentos(val.toLowerCase());
        var batePorTexto = poolValor.indexOf(termoValorLimpo) !== -1;
        var batePorNumero = valorNumBusca > 0 && Math.abs((d.valor || 0) - valorNumBusca) < 0.01;
        if (!batePorTexto && !batePorNumero) return false;
      }
      return true;
    });
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
    els.btnFiltrarCaixa = document.getElementById('btn-buscar-periodo-caixa');
    els.btnRelatorioCaixaModal = document.getElementById('btn-relatorio-fin-caixa');
    els.caixaCardEntradas = document.getElementById('caixa-card-entradas');
    els.caixaCardSaidas = document.getElementById('caixa-card-saidas');
    els.caixaCardEmpresa = document.getElementById('caixa-card-empresa');
    els.caixaCardColaboradores = document.getElementById('caixa-card-colaboradores');
    els.caixaCardRegistros = document.getElementById('caixa-card-registros');
    els.caixaCardSaldoTotal = document.getElementById('caixa-card-saldo-total');
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
    els.extratoListaDiaria = document.getElementById('extrato-lista');
    els.extratoModalOverlay = document.getElementById('extrato-modal-overlay');
    els.extratoModalTitulo = document.getElementById('extrato-modal-titulo');
    els.extratoModalBody = document.getElementById('extrato-modal-body');
    els.extratoModalFechar = document.getElementById('extrato-modal-fechar');
    els.extratoModalCopiar = document.getElementById('extrato-modal-copiar');
    els.extratoModalPdf = document.getElementById('extrato-modal-pdf');
    els.extratoFiltroDescricao = document.getElementById('extrato-filtro-descricao');
  }

  function renderListaPeriodoModal(registros) {
    var container = document.getElementById('modal-periodo-caixa-lista');
    if (!container) return;

    var totais = calcularTotaisRegistros(registros);
    setText('modal-periodo-caixa-entradas', formatarMoeda(totais.entradas));
    setText('modal-periodo-caixa-saidas', formatarMoeda(totais.saidas));
    setText('modal-periodo-caixa-empresa', formatarMoeda(totais.empresa));
    setText('modal-periodo-caixa-colaboradores', formatarMoeda(totais.colaboradores));
    setText('modal-periodo-caixa-saldo', formatarMoeda(totais.saldo));

    if (!registros.length) {
      container.innerHTML = '<div class="text-center text-muted py-4">Nenhum lançamento no período.</div>';
      return;
    }

    var blocos = agruparRegistrosPorData(registros);

    container.innerHTML = blocos.map(function (bloco, idx) {
      var cor = corBlocoDataFin(idx);
      var totaisDia = calcularTotaisRegistros(bloco.registros);
      var labelData = bloco.dataISO !== 'sem-data' ? formatDateBR(bloco.dataISO) : 'Sem data';
      var labelSemana = bloco.dataISO !== 'sem-data' ? getDiaSemanaCompleto(bloco.dataISO) : '';

      var linhas = bloco.registros.map(function (r) {
        return '<tr>' +
          '<td style="font-size:.74rem;color:#666;padding:6px 8px;" title="' + escapeHtml(r.descricao || '-') + '">' + escapeHtml(resumirDescricao(r.descricao)) + '</td>' +
          '<td class="text-end ' + (r.tipo === 'entrada' ? 'text-success' : 'text-danger') + '" style="font-size:.76rem;font-weight:600;padding:6px 8px;white-space:nowrap;">' + formatarMoeda(r.valor) + '</td>' +
          '<td class="text-center" style="padding:6px 8px;">' + getStatusBadge(r.situacao) + '</td>' +
          '</tr>';
      }).join('');

      return '' +
        '<div style="background:' + cor.bg + ';border:1px solid ' + cor.borda + ';border-radius:12px;margin-bottom:10px;overflow:hidden;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid ' + cor.borda + ';">' +
        '<div><span style="font-size:.8rem;font-weight:700;color:#444;">' + labelData + '</span>' +
        '<span style="font-size:.68rem;color:#888;margin-left:6px;">' + labelSemana + '</span></div>' +
        '<span style="font-size:.76rem;font-weight:700;color:' + (totaisDia.saldo >= 0 ? '#198754' : '#dc3545') + ';">' + formatarMoeda(totaisDia.saldo) + '</span>' +
        '</div>' +
        '<table class="table table-sm mb-0" style="background:transparent;">' +
        '<tbody>' + linhas + '</tbody>' +
        '</table>' +
        '</div>';
    }).join('');
  }

  function abrirModalPeriodoCaixa(inicio, fim, registros) {
    var modalEl = document.getElementById('modalPeriodoCaixa');
    if (!modalEl) return;
    setText('modal-periodo-caixa-titulo', formatDateBR(inicio) + ' a ' + formatDateBR(fim));
    renderListaPeriodoModal(registros);
    var modalInst = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInst.show();
  }

  function spinOn() {
    if (els.syncIcon) els.syncIcon.classList.add('fin-spin-icon');
  }

  function spinOff() {
    if (els.syncIcon) els.syncIcon.classList.remove('fin-spin-icon');
  }

  function _mostrarLoadingFin() {
    if (els.tbodyTodos) {
      els.tbodyTodos.innerHTML =
        '<tr><td colspan="4" class="p-0 border-0">' +
        '<div class="fin-loading-overlay">' +
        '<div class="fin-loading-content">' +
        '<i class="bi bi-search fin-loading-spin"></i>' +
        '<span class="fin-loading-text">Buscando lançamentos<span class="fin-loading-dots"><span>.</span><span>.</span><span>.</span></span></span>' +
        '</div>' +
        '</div>' +
        '</td></tr>';
    }
  }

  function excluirRegistroDefinitivo(id) {
    if (!id) {
      console.error('[excluirRegistroDefinitivo] ID não informado.');
      return Promise.reject(new Error('ID não informado'));
    }

    return window.API.call('delfinanceiro', { id: id })
      .then(function (res) {
        var sucesso = res && (res.status === 'success' || res.success === true || res.ok === true);

        if (sucesso) {
          // Remove do cache local, se existir
          var idx = state.cache.findIndex(function (r) { return String(r.id) === String(id); });
          if (idx !== -1) {
            state.cache.splice(idx, 1);
          }

          if (typeof renderCaixa === 'function') renderCaixa();
          if (typeof renderTodos === 'function') renderTodos();
          if (typeof renderizarListaExtratos === 'function') renderizarListaExtratos(); // corrigido

          console.log('[excluirRegistroDefinitivo] Registro ' + id + ' excluído com sucesso.');
        } else {
          console.error('[excluirRegistroDefinitivo] Falha ao excluir registro ' + id + ':', res);
        }

        return res;
      })
      .catch(function (err) {
        console.error('[excluirRegistroDefinitivo] Erro na chamada da API:', err);
        throw err;
      });
  }

  function notificarSituacaoFinanceiraAtualizada(idPedido, situacaoFinanceira) {
    var situacaoNormalizada = (situacaoFinanceira || '').toString().trim().toLowerCase();

    // Label única para todos os módulos: pendente, pago, recebido, cancelado
    var statusLabel = situacaoNormalizada
      ? situacaoNormalizada.charAt(0).toUpperCase() + situacaoNormalizada.slice(1)
      : 'Pendente';

    var payload = {
      idPedido: idPedido,
      situacaoFinanceira: situacaoNormalizada,
      statusPedido: statusLabel // agora é o MESMO valor, sem tradução (Pendente, Pago, Recebido, Cancelado)
    };

    if (window.EventBus && typeof window.EventBus.emit === 'function') {
      window.EventBus.emit('financeiro:situacaoAtualizada', payload);
    }

    document.dispatchEvent(new CustomEvent('financeiro:situacaoAtualizada', { detail: payload }));
  }

  function salvarRegistroFinanceiro(id, dados) {
    if (!id) {
      return Promise.reject(new Error('ID do registro não informado.'));
    }
    if (!dados || typeof dados !== 'object') {
      return Promise.reject(new Error('Dados do lançamento não informados ou inválidos.'));
    }

    var payload;
    try {
      payload = Object.assign({ id: id }, dados);
      if (payload.valor !== undefined) {
        var vNum = parseValor(payload.valor);
        payload.valor = isNaN(vNum) ? 0 : vNum;
      }
    } catch (errPayload) {
      console.error('[salvarRegistroFinanceiro] Erro ao montar payload:', errPayload);
      return Promise.reject(new Error('Erro ao preparar os dados para envio: ' + errPayload.message));
    }

    if (typeof window.API === 'undefined' || typeof window.API.call !== 'function') {
      return Promise.reject(new Error('API indisponível. Verifique sua conexão ou recarregue a página.'));
    }

    return window.API.call('updatefinanceiro', payload)
      .catch(function (errApi) {
        console.error('[salvarRegistroFinanceiro] Falha na chamada API:', errApi);
        throw new Error('Falha na comunicação com o servidor: ' + (errApi && errApi.message ? errApi.message : 'Erro desconhecido.'));
      })
      .then(function (resFin) {
        console.log('[salvarRegistroFinanceiro] resposta backend:', resFin);

        if (!resFin) {
          throw new Error('O servidor não retornou nenhuma resposta.');
        }

        var sucessoFin = resFin.status === 'success' ||
          resFin.success === true ||
          resFin.success === 'true' ||
          resFin.success === 1 ||
          resFin.ok === true;

        if (resFin.status === 'partial_error') {
          finToast('Atenção: ' + (resFin.message || 'coluna não localizada na planilha.'), 'warning');
        } else if (!sucessoFin) {
          var msgErroFin = resFin.message || resFin.msg || resFin.error || 'O banco financeiro não confirmou a atualização.';
          throw new Error(msgErroFin);
        }

        var idx = state.cache.findIndex(function (r) { return String(r.id) === String(id); });

        if (idx === -1 && dados.id_pedido !== undefined) {
          idx = state.cache.findIndex(function (r) { return String(r.idPedido) === String(dados.id_pedido); });
        }

        var idPedidoNotificar = null;
        var camposAlteradosParaChat = null;

        if (idx !== -1) {
          try {
            var reg = state.cache[idx];

            var valorAntes = reg.valor;
            var motoboyAntes = reg.motoboy;
            var clienteAntes = reg.cliente;

            if (dados.valor !== undefined) reg.valor = parseValor(dados.valor);
            if (dados.tipo !== undefined) reg.tipo = dados.tipo;
            if (dados.situacao !== undefined) reg.situacao = dados.situacao;
            if (dados.descricao !== undefined) reg.descricao = dados.descricao;
            if (dados.observacao !== undefined) reg.observacao = dados.observacao;
            if (dados.colaborador_id !== undefined) reg.colaboradorId = dados.colaborador_id;
            if (dados.motoboy !== undefined) reg.motoboy = dados.motoboy || '-';
            if (dados.cliente !== undefined) reg.cliente = dados.cliente || '-';
            if (dados.grupo !== undefined) reg.grupo = dados.grupo || '';

            if (ehReceitaFin(reg.tipo)) {
              var pctColab = 80;
              if (reg.colaboradorId && state.colaboradoresCache[reg.colaboradorId] && state.colaboradoresCache[reg.colaboradorId].percentual_comissao) {
                pctColab = parseFloat(state.colaboradoresCache[reg.colaboradorId].percentual_comissao) || 80;
              }
              reg.percentualComissao = pctColab;
              reg.valorColaborador = reg.valor * (pctColab / 100);
              reg.valorEmpresa = reg.valor * ((100 - pctColab) / 100);
            } else {
              reg.valorColaborador = 0;
              reg.valorEmpresa = 0;
            }

            state.cache[idx] = reg;
            idPedidoNotificar = reg.idPedido || null;

            if (dados.situacao !== undefined && reg.idPedido && state.pedidosCache[reg.idPedido]) {
              state.pedidosCache[reg.idPedido].situacao_financeira = dados.situacao;
            }

            var valorMudou = valorAntes !== reg.valor;
            var motoboyMudou = motoboyAntes !== reg.motoboy;
            var clienteMudou = clienteAntes !== reg.cliente;

            if (idPedidoNotificar && (valorMudou || motoboyMudou || clienteMudou)) {
              camposAlteradosParaChat = {
                id: idPedidoNotificar,
                valor_total: reg.valor,
                valor_final: reg.valor,
                valor_corrida: reg.valor
              };
              if (motoboyMudou && reg.motoboy && reg.motoboy !== '-') {
                camposAlteradosParaChat.motoboy = reg.motoboy;
              }
              if (clienteMudou && reg.cliente && reg.cliente !== '-') {
                camposAlteradosParaChat.cliente = reg.cliente;
              }
            }
          } catch (errCache) {
            console.error('[salvarRegistroFinanceiro] Erro ao atualizar cache local:', errCache);
            finToast('Salvo no servidor, mas houve um erro ao atualizar a tela localmente. Atualize a página se necessário.', 'warning');
          }
        } else {
          console.warn('[salvarRegistroFinanceiro] Registro id=' + id + ' não encontrado no cache local. Forçando novo carregamento.');
          carregarDados();
        }

        if (dados.situacao !== undefined && idPedidoNotificar) {
          try {
            notificarSituacaoFinanceiraAtualizada(idPedidoNotificar, dados.situacao);
          } catch (errNotify) {
            console.error('[salvarRegistroFinanceiro] Erro ao emitir evento financeiro:situacaoAtualizada:', errNotify);
            finToast('Situação salva, mas a tela de pedidos pode não atualizar automaticamente.', 'warning');
          }
        }

        if (camposAlteradosParaChat) {
          try {
            window.EventBus.emit('pedido:atualizado', Object.assign({ __origemFinanceiro: true }, camposAlteradosParaChat));
          } catch (errEmit) {
            console.error('[salvarRegistroFinanceiro] Erro ao emitir pedido:atualizado:', errEmit);
            finToast('Financeiro salvo, mas a sincronização com pedido/chat pode ter falhado.', 'warning');
          }
        }
        return { resultado: resFin, idxAtualizado: idx };
      })
      .then(function (contexto) {
        try {
          if (contexto.idxAtualizado !== -1) {
            if (typeof renderTodos === 'function') renderTodos();
            if (typeof renderRdoContadores === 'function') renderRdoContadores();
            if (typeof renderCaixa === 'function') renderCaixa();
            if (typeof renderizarListaExtratos === 'function') renderizarListaExtratos();
          }
        } catch (errRender) {
          console.error('[salvarRegistroFinanceiro] Erro ao re-renderizar telas:', errRender);
          finToast('Dados salvos, mas houve um erro ao atualizar a tela. Recarregue se necessário.', 'warning');
        }

        if (!contexto.resultado || contexto.resultado.status !== 'partial_error') {
          finToast('Lançamento atualizado com sucesso!', 'success');
        }
        return contexto.resultado;
      })
      .catch(function (err) {
        console.error('[salvarRegistroFinanceiro] Erro:', err);
        try {
          if (typeof renderTodos === 'function') renderTodos();
        } catch (errRenderErro) {
          console.error('[salvarRegistroFinanceiro] Erro ao re-renderizar após falha:', errRenderErro);
        }
        throw err instanceof Error ? err : new Error(String(err));
      });
  }

  if (!window._finListenerPedidoAtualizadoBind) {
    window._finListenerPedidoAtualizadoBind = true;

    window.EventBus.on('pedido:atualizado', function (dados) {
      if (!dados || !dados.id) return;

      var idFormatado = typeof window._formatarNomeServico === 'function'
        ? window._formatarNomeServico(dados.id)
        : String(dados.id);

      // 🛑 GUARDA CONTRA DUPLICAÇÃO
      // Verifica se já existe um lançamento financeiro para este pedido
      var jaExiste = (window.financeiroState?.cache || []).some(function (r) {
        return String(r.idPedido || '').trim() === String(idFormatado).trim();
      });

      if (jaExiste) {
        console.log('[Financeiro] Ignorando criação duplicada para pedido:', idFormatado);
        return; // Já existe, não cria de novo
      }

      var valorNum = window._parseMoedaSeguro(dados.valor_final || dados.valor_total || dados.valor_corrida || 0);

      var dataLancamentoFinal = String(dados.data_pedido || '').trim();
      if (!dataLancamentoFinal) {
        var hoje = new Date();
        dataLancamentoFinal =
          String(hoje.getDate()).padStart(2, '0') + '/' +
          String(hoje.getMonth() + 1).padStart(2, '0') + '/' +
          hoje.getFullYear();
      }

      var nomeColaboradorEvento = (dados.motoboy || dados.colaborador || dados.nome_colaborador || dados.colaborador_nome || '').toString().trim();
      var idColaboradorEvento = (dados.colaborador_id || dados.colaboradorId || '').toString().trim();

      if (!nomeColaboradorEvento && idColaboradorEvento && state.colaboradoresCache[idColaboradorEvento]) {
        var cEvento = state.colaboradoresCache[idColaboradorEvento];
        nomeColaboradorEvento = (cEvento.username || cEvento.nome || '').toString().trim();
      }

      window.API.call('addfinanceiro', {
        tipo: 'entrada',
        data_lancamento: dataLancamentoFinal,
        descricao: 'Pedido ' + idFormatado,
        vlr_servico: valorNum,
        situacao: 'pendente',
        colaborador: nomeColaboradorEvento,
        colaborador_id: idColaboradorEvento,
        observacao: '',
        id_pedido: idFormatado
      });
    });

  }

  function _toggleBtnClearBuscaFin() {
    if (els.btnClearBuscaFin) {
      var temTexto = els.inputBuscaFin && els.inputBuscaFin.value.trim().length > 0;
      els.btnClearBuscaFin.classList.toggle('d-none', !temTexto);
    }
    if (els.btnClearBuscaExtrato) {
      var temTextoExtrato = els.inputBuscaExtrato && els.inputBuscaExtrato.value.trim().length > 0;
      els.btnClearBuscaExtrato.classList.toggle('d-none', !temTextoExtrato);
    }
  }

  function _bindBuscaFin() {
    els.btnClearBuscaFin = document.getElementById('btn-limpar-busca-fin');
    els.inputBuscaFin = document.getElementById('filtro-busca-fin');
    els.btnClearBuscaExtrato = document.getElementById('btn-limpar-busca-extrato');
    els.inputBuscaExtrato = document.getElementById('extrato-filtro-descricao');

    if (els.inputBuscaFin) {
      var buscaFinDebounced = debounce(function (valor) {
        state.filtroBusca = valor;
        state.todos.pagina = 1;
        renderTodos();
      }, 350);

      els.inputBuscaFin.oninput = function () {
        _toggleBtnClearBuscaFin();
        buscaFinDebounced(els.inputBuscaFin.value);
      };
    }

    if (els.btnClearBuscaFin) {
      els.btnClearBuscaFin.onclick = function () {
        els.inputBuscaFin.value = '';
        state.filtroBusca = '';
        state.todos.pagina = 1;
        _toggleBtnClearBuscaFin();
        els.inputBuscaFin.focus();
        renderTodos();
      };
    }

    if (els.inputBuscaExtrato) {
      els.inputBuscaExtrato.oninput = function () {
        state.extrato.filtroDescricao = els.inputBuscaExtrato.value.trim();
        _toggleBtnClearBuscaFin();
        renderizarListaExtratos();
      };
    }

    if (els.btnClearBuscaExtrato) {
      els.btnClearBuscaExtrato.onclick = function () {
        els.inputBuscaExtrato.value = '';
        state.extrato.filtroDescricao = '';
        _toggleBtnClearBuscaFin();
        els.inputBuscaExtrato.focus();
        renderizarListaExtratos();
      };
    }

    _toggleBtnClearBuscaFin();
  }

  window.excluirRegistroDefinitivo = excluirRegistroDefinitivo;

  function _esconderLoadingFin() {
    var el = document.getElementById('fin-loading');
    if (el) el.classList.add('d-none');
  }

  function finToast(msg, tipo) {
    tipo = tipo || 'info';
    var cores = { success: { bg: '#198754', icon: 'bi-check-circle-fill' }, danger: { bg: '#dc3545', icon: 'bi-exclamation-triangle-fill' }, warning: { bg: '#fd7e14', icon: 'bi-exclamation-circle-fill' }, info: { bg: '#0d6efd', icon: 'bi-info-circle-fill' } };
    var cor = cores[tipo] || cores.info;
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:' + cor.bg + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:.78rem;box-shadow:0 4px 16px rgba(0,0,0,0.18);display:flex;align-items:center;gap:8px;max-width:380px;';
    toast.innerHTML = '<i class="bi ' + cor.icon + '"></i><span>' + escapeHtml(msg) + '</span>';
    document.body.appendChild(toast);
    setTimeout(function () { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s ease'; setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350); }, 3000);
  }

  function bindDropdownConfirmarExclusao(container, selectorBtn, onConfirmar) {
    container.querySelectorAll(selectorBtn + ' .fin-confirm-excluir').forEach(function (btnConfirmar) {
      btnConfirmar.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = this.getAttribute('data-id');
        onConfirmar(id);
      });
    });
    container.querySelectorAll(selectorBtn + ' .fin-confirm-cancelar').forEach(function (btnCancelar) {
      btnCancelar.addEventListener('click', function (e) {
        e.stopPropagation();
        var dropdownEl = this.closest('.dropdown');
        var toggleEl = dropdownEl ? dropdownEl.querySelector('[data-bs-toggle="dropdown"]') : null;
        if (toggleEl) {
          var inst = bootstrap.Dropdown.getInstance(toggleEl);
          if (inst) inst.hide();
        }
      });
    });
    container.querySelectorAll(selectorBtn + ' [data-bs-toggle="dropdown"]').forEach(function (toggle) {
      toggle.addEventListener('click', function (e) { e.stopPropagation(); });
    });
  }

  function excluirPeriodoCaixaStorage(id) {
    try {
      var periodos = carregarPeriodosCaixaStorage();
      var idx = periodos.findIndex(function (p) { return p.id === id; });
      if (idx === -1) return false;

      periodos[idx].excluido = true;
      periodos[idx].excluidoEm = Date.now();

      localStorage.setItem(CAIXA_PERIODO_STORAGE_KEY, JSON.stringify(periodos));
      return true;
    } catch (e) {
      console.error('[excluirPeriodoCaixaStorage] Erro ao excluir carteira:', e);
      finToast('Erro ao excluir carteira: ' + e.message, 'danger');
      return false;
    }
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

  function aplicarMascaraValores() {
    document.querySelectorAll('.fin-valor-caixa').forEach(function (el) {
      var real = el.getAttribute('data-valor-real');
      if (!real) return;
      el.textContent = state.caixaValoresVisiveis ? real : 'R$ ****';
    });
  }

  function abrirModalAdicionarDinheiro() {
    var OLD_ID = 'modalAdicionarDinheiroDyn';
    var old = document.getElementById(OLD_ID);
    if (old) {
      var oi = bootstrap.Modal.getInstance(old);
      if (oi) {
        old.addEventListener('hidden.bs.modal', function () {
          if (old && old.parentNode) old.remove();
        }, { once: true });
        oi.hide();
      } else {
        old.remove();
      }
    }
    var html = '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered" style="max-width:400px;"><div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden"><div style="background:linear-gradient(135deg,#198754 0%,#146c43 100%);padding:20px 24px 16px;position:relative;"><div class="d-flex align-items-center gap-3"><div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-plus-circle-fill" style="font-size:1.2rem;color:#fff;"></i></div><div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;">Adicionar Dinheiro</h6><small style="color:rgba(255,255,255,.65);font-size:.72rem;">Registrar entrada manual no caixa</small></div></div><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div><div class="modal-body px-4 py-4"><div id="add-dinheiro-erro-dyn" class="alert alert-danger d-none py-2 px-3 mb-3" style="font-size:.74rem;border-radius:10px;"></div><div class="mb-3"><label class="fin-field-label">Valor (R$)</label><input type="text" id="add-dinheiro-valor-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="0,00" inputmode="decimal"></div><div class="mb-3"><label class="fin-field-label">Descrição</label><input type="text" id="add-dinheiro-descricao-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="Ex: Depósito, Aporte..."></div></div><div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex justify-content-end"><button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;"><i class="bi bi-x-lg me-1"></i>Cancelar</button><button type="button" class="btn btn-success rounded-pill px-4" id="btn-add-dinheiro-confirmar-dyn" style="font-size:.78rem;height:38px;font-weight:600;"><i class="bi bi-check-lg me-1"></i>Confirmar</button></div></div></div></div>';
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
      if (isNaN(valorNum) || valorNum <= 0) { erroEl.textContent = 'Informe um valor válido.'; erroEl.classList.remove('d-none'); return; }
      var desc = descEl ? descEl.value.trim() : '';
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      window.API.call('addfinanceiro', {
        tipo: 'entrada',
        data: toISO(new Date()),
        descricao: desc || 'Entrada manual',
        vlr_servico: valorNum,
        situacao: 'recebido',
        motoboy: '',
        colaborador_id: '',
        observacao: ''
      }).then(function (res) {
        if (isRespostaSucesso(res)) { finToast('Depósito adicionado!', 'success'); modalInst.hide(); carregarDados(); }
        else { erroEl.textContent = 'Erro: ' + ((res && (res.message || res.msg)) || 'Tente novamente.'); erroEl.classList.remove('d-none'); btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Confirmar'; }
      }).catch(function () {
        erroEl.textContent = 'Falha na comunicação com o servidor.'; erroEl.classList.remove('d-none');
        btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Confirmar';
      });
    });
    modalEl.addEventListener('hidden.bs.modal', function () { modalInst.dispose(); if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); });
    modalInst.show();
  }

  function abrirModalTransferir() {
    var OLD_ID = 'modalTransferirDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }
    var html = '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered" style="max-width:400px;"><div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden"><div style="background:linear-gradient(135deg,#0d6efd 0%,#0a58ca 100%);padding:20px 24px 16px;position:relative;"><div class="d-flex align-items-center gap-3"><div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-arrow-left-right" style="font-size:1.2rem;color:#fff;"></i></div><div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;">Transferir</h6><small style="color:rgba(255,255,255,.65);font-size:.72rem;">Registrar saída / transferência</small></div></div><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div><div class="modal-body px-4 py-4"><div id="transferir-erro-dyn" class="alert alert-danger d-none py-2 px-3 mb-3" style="font-size:.74rem;border-radius:10px;"></div><div class="mb-3"><label class="fin-field-label">Valor (R$)</label><input type="text" id="transferir-valor-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="0,00" inputmode="decimal"></div><div class="mb-3"><label class="fin-field-label">Destino</label><input type="text" id="transferir-destino-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="Ex: Conta bancária, Colaborador..."></div><div class="mb-3"><label class="fin-field-label">Descrição</label><input type="text" id="transferir-descricao-dyn" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="Ex: Pagamento de salário..."></div></div><div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex justify-content-end"><button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;"><i class="bi bi-x-lg me-1"></i>Cancelar</button><button type="button" class="btn btn-primary rounded-pill px-4" id="btn-transferir-confirmar-dyn" style="font-size:.78rem;height:38px;font-weight:600;"><i class="bi bi-check-lg me-1"></i>Confirmar</button></div></div></div></div>';
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
      if (isNaN(valorNum) || valorNum <= 0) { erroEl.textContent = 'Informe um valor válido.'; erroEl.classList.remove('d-none'); return; }
      var desc = descEl ? descEl.value.trim() : '';
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      window.API.call('addfinanceiro', {
        tipo: 'saida',
        data: toISO(new Date()),
        descricao: (desc || 'Transferência') + (destino ? ' → ' + destino : ''),
        vlr_servico: valorNum,
        situacao: 'pago',
        motoboy: '',
        colaborador_id: '',
        observacao: ''
      }).then(function (res) {
        if (isRespostaSucesso(res)) { finToast('Transferência realizada!', 'success'); modalInst.hide(); carregarDados(); }
        else { erroEl.textContent = 'Erro: ' + ((res && (res.message || res.msg)) || 'Tente novamente.'); erroEl.classList.remove('d-none'); btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Confirmar'; }
      }).catch(function () {
        erroEl.textContent = 'Falha na comunicação com o servidor.'; erroEl.classList.remove('d-none');
        btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Confirmar';
      });
    });
    modalEl.addEventListener('hidden.bs.modal', function () { modalInst.dispose(); if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); });
    modalInst.show();
  }

  function abrirModalRepasses() {
    if (_repassesAbrindoAgora) return;
    _repassesAbrindoAgora = true;

    var OLD_ID = 'modalRepassesDyn';
    var old = document.getElementById(OLD_ID);
    if (old) {
      var oi = bootstrap.Modal.getInstance(old);
      if (oi) oi.dispose();
      old.remove();
    }

    var dados = state.caixa.dadosFiltrados.length ? state.caixa.dadosFiltrados : state.cache;
    var entradas = dados.filter(function (r) { return ehReceitaFin(r.tipo); });
    var por = {};
    entradas.forEach(function (r) {
      var nome = (r.motoboy && r.motoboy !== '-') ? r.motoboy : 'Sem colaborador';
      por[nome] = (por[nome] || 0) + (parseFloat(r.valor) || 0);
    });
    var nomes = Object.keys(por).sort(function (a, b) { return por[b] - por[a]; });
    var listaHtml = nomes.length ? nomes.map(function (nome) {
      return '<div class="d-flex justify-content-between align-items-center py-2 px-1" style="border-bottom:1px solid #f0f0f0;"><div class="d-flex align-items-center gap-2"><div style="width:36px;height:36px;border-radius:50%;background:#f3e8ff;display:flex;align-items:center;justify-content:center;"><i class="bi bi-person" style="color:#6f42c1;font-size:.9rem;"></i></div><span style="font-size:.82rem;font-weight:600;">' + escapeHtml(nome) + '</span></div><span style="font-size:.84rem;font-weight:700;color:#6f42c1;">' + formatarMoeda(por[nome]) + '</span></div>';
    }).join('') : '<div class="text-center text-muted py-5"><i class="bi bi-people" style="font-size:2rem;opacity:.3;display:block;margin-bottom:10px;"></i>Nenhum dado disponível.</div>';
    var periodoLabel = state.caixa.dataInicio && state.caixa.dataFim ? formatDateBR(state.caixa.dataInicio) + ' a ' + formatDateBR(state.caixa.dataFim) : 'Todos os registros';
    var html = '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:420px;"><div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden"><div style="background:linear-gradient(135deg,#6f42c1 0%,#59359a 100%);padding:20px 24px 16px;position:relative;"><div class="d-flex align-items-center gap-3"><div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-people-fill" style="font-size:1.2rem;color:#fff;"></i></div><div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;">Repasses</h6><small style="color:rgba(255,255,255,.65);font-size:.72rem;">' + escapeHtml(periodoLabel) + '</small></div></div><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div><div class="modal-body px-3 py-3">' + listaHtml + '</div><div class="modal-footer border-0 px-4 pb-4 pt-0 justify-content-end"><button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;"><i class="bi bi-x-lg me-1"></i>Fechar</button></div></div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById(OLD_ID);

    if (!modalEl) {
      _repassesAbrindoAgora = false;
      finToast('Erro ao montar o modal de repasses.', 'danger');
      return;
    }

    var modalInst = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () {
      modalInst.dispose();
      if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
      _repassesAbrindoAgora = false;
    });
    modalInst.show();
  }

  function abrirModalExtratosCaixa() {
    if (_extratosCaixaAbrindoAgora) return;
    _extratosCaixaAbrindoAgora = true;

    var OLD_ID = 'modalExtratosCaixaDyn';
    var old = document.getElementById(OLD_ID);

    function montarEExibir() {
      document.querySelectorAll('.modal-backdrop').forEach(function (bd) {
        if (bd.parentNode) bd.parentNode.removeChild(bd);
      });
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');

      var html = '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:480px;"><div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden"><div style="background:linear-gradient(135deg,#0dcaf0 0%,#0aa2c0 100%);padding:20px 24px 16px;position:relative;"><div class="d-flex align-items-center gap-3"><div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-file-earmark-bar-graph-fill" style="font-size:1.2rem;color:#fff;"></i></div><div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;">Extratos Salvos</h6><small style="color:rgba(255,255,255,.65);font-size:.72rem;">Histórico de relatórios gerados</small></div></div><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div><div class="modal-body px-3 py-3" id="' + OLD_ID + '-lista"><div class="text-center text-muted py-5"><div class="spinner-border spinner-border-sm text-secondary"></div></div></div><div class="modal-footer border-0 px-4 pb-4 pt-0 justify-content-end"><button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;"><i class="bi bi-x-lg me-1"></i>Fechar</button></div></div></div></div>';
      document.body.insertAdjacentHTML('beforeend', html);

      var modalEl = document.getElementById(OLD_ID);
      if (!modalEl) { _extratosCaixaAbrindoAgora = false; return; }

      var modalInst = new bootstrap.Modal(modalEl);
      var container = document.getElementById(OLD_ID + '-lista');
      mostrarLupinha(OLD_ID + '-lista', 'Carregando extratos');

      function abrirExtratoESuperpor(ext) {
        if (!ext) return;
        var onHidden = function () {
          modalEl.removeEventListener('hidden.bs.modal', onHidden);
          setTimeout(function () { abrirExtratoModal(ext); }, 50);
        };
        modalEl.addEventListener('hidden.bs.modal', onHidden);
        modalInst.hide();
      }

      var extratos = carregarExtratosStorage();
      if (!extratos.length) {
        container.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-file-earmark-bar-graph" style="font-size:2rem;opacity:.4;display:block;margin-bottom:12px;"></i><div>Nenhum extrato gerado ainda.</div><small class="opacity-75">Acesse a aba <strong>Extrato</strong> para gerar relatórios</small></div>';
      } else {
        container.innerHTML = extratos.map(function (ex) {
          var totais = calcularTotaisRegistros(ex.registros);
          var totalRegs = (ex.registros || []).length;
          var criadoLabel = ex.criadoEm ? new Date(ex.criadoEm).toLocaleString('pt-BR') : '-';
          var saldoColor = totais.saldo >= 0 ? '#198754' : '#dc3545';
          return '<div class="extrato-item-card" data-extrato-id="' + escapeHtml(ex.id) + '" style="cursor:pointer;"><div class="extrato-item-left"><div class="extrato-item-icon"><i class="bi bi-file-earmark-bar-graph"></i></div><div><div class="extrato-item-titulo">' + escapeHtml(ex.origem || '-') + '</div><div class="extrato-item-sub">' + escapeHtml(ex.periodoLabel || '-') + ' · ' + totalRegs + ' registro' + (totalRegs !== 1 ? 's' : '') + '</div><div class="extrato-item-sub" style="font-size:.68rem;opacity:.7;">' + criadoLabel + '</div></div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;"><span style="font-size:.72rem;font-weight:700;color:' + saldoColor + ';">' + formatarMoeda(totais.saldo) + '</span><button class="extrato-item-btn extrato-item-btn-ver-modal" data-id="' + escapeHtml(ex.id) + '" title="Visualizar" style="pointer-events:auto;"><i class="bi bi-eye"></i></button></div></div>';
        }).join('');
        container.querySelectorAll('.extrato-item-btn-ver-modal').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var ext = buscarExtratoStoragePorId(this.getAttribute('data-id'));
            if (ext) abrirExtratoESuperpor(ext);
          });
        });
        container.querySelectorAll('.extrato-item-card').forEach(function (card) {
          card.addEventListener('click', function () {
            var ext = buscarExtratoStoragePorId(this.getAttribute('data-extrato-id'));
            if (ext) abrirExtratoESuperpor(ext);
          });
        });
      }

      modalEl.addEventListener('hidden.bs.modal', function () {
        modalInst.dispose();
        if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
        document.querySelectorAll('.modal-backdrop').forEach(function (bd) {
          if (bd.parentNode) bd.parentNode.removeChild(bd);
        });
        _extratosCaixaAbrindoAgora = false;
      });

      modalInst.show();
    }

    if (old) {
      var oldInst = bootstrap.Modal.getInstance(old);
      if (oldInst) {
        old.addEventListener('hidden.bs.modal', function onOldHidden() {
          old.removeEventListener('hidden.bs.modal', onOldHidden);
          oldInst.dispose();
          if (old.parentNode) old.parentNode.removeChild(old);
          setTimeout(montarEExibir, 50);
        });
        oldInst.hide();
      } else {
        old.remove();
        setTimeout(montarEExibir, 50);
      }
    } else {
      montarEExibir();
    }
  }

  function abrirModalEditar(reg) {
    console.log('🔍 REG RECEBIDO NO MODAL:', reg);
    var OLD_ID = 'modalEditarFinDyn';
    var old = document.getElementById(OLD_ID);
    if (old) {
      var oi = bootstrap.Modal.getInstance(old);
      if (oi) oi.dispose();
      old.remove();
    }

    var isEntrada = reg.tipo === 'entrada';
    var corHeader = isEntrada
      ? 'linear-gradient(135deg,#198754 0%,#146c43 100%)'
      : 'linear-gradient(135deg,#dc3545 0%,#c82333 100%)';
    var valorFormatado = (reg.valor || 0).toFixed(2).replace('.', ',');
    var idExibicao = reg.idFinanceiro || reg.id || '';

    var listaClientes = Object.keys(state.clientesCache || {}).map(function (k) { return state.clientesCache[k]; });
    listaClientes.sort(function (a, b) {
      return (a.nome || a.username || '').localeCompare(b.nome || b.username || '');
    });

    var clienteAtualNome = (reg.cliente || '').toString().trim().toLowerCase();
    var opcoesCliente = '<option value="">Cliente avulso / Nenhum</option>' + listaClientes.map(function (c) {
      var nomeC = (c.nome || c.username || '').toString().trim().toLowerCase();
      var selecionado = (clienteAtualNome && nomeC === clienteAtualNome) ? 'selected' : '';
      return '<option value="' + escapeHtml(c.id) + '" ' + selecionado + '>' + escapeHtml(c.nome || c.username || '-') + '</option>';
    }).join('');

    var listaColaboradores = state.colaboradores || [];
    var colaboradorAtualId = reg.colaboradorId || reg.colaborador_id || '';
    var opcoesColaborador = '<option value="">Nenhum</option>' + listaColaboradores.map(function (c) {
      var selecionado = (String(c.id) === String(colaboradorAtualId)) ? 'selected' : '';
      return '<option value="' + escapeHtml(c.id) + '" ' + selecionado + '>' + escapeHtml(c.username || c.nome || '-') + '</option>';
    }).join('');

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered modal-md">' +
      '<div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">' +

      '<div class="fin-extrato-header" style="background:' + corHeader + ';">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div class="fin-extrato-header-icon"><i class="bi bi-pencil-square"></i></div>' +
      '<div><div class="fin-extrato-tipo">EDITAR LANÇAMENTO</div>' +
      '<div class="fin-extrato-date">' + escapeHtml(reg.dataDisplay || '') + '</div></div></div>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
      '</div></div>' +

      '<div class="modal-body p-0">' +

      '<div class="fin-extrato-status-bar">' +
      '<div>' + getStatusBadge(reg.situacao) + '</div>' +
      '<span class="fin-extrato-id">#' + escapeHtml(idExibicao) + '</span>' +
      '</div>' +

      '<div id="fin-editar-erro" class="alert alert-danger d-none mx-3 mt-3 py-2 px-3" style="font-size:.74rem;border-radius:10px;"></div>' +

      '<div class="fin-extrato-body">' +

      '<div class="fin-view-valor-destaque ' + (isEntrada ? 'fin-valor-footer-entrada' : 'fin-valor-footer-saida') + '" id="fin-valor-editar-wrapper" style="position:relative;">' +
      '<div class="fin-view-valor-destaque-label"><i class="bi bi-cash-coin"></i><span>VALOR DO LANÇAMENTO</span></div>' +
      '<input type="text" id="fin-edit-valor" class="fin-edit-valor-input" value="' + valorFormatado + '" inputmode="decimal">' +
      '</div>' +

      '<div class="fin-extrato-section">' +
      '<div class="fin-extrato-section-title">Informações do Lançamento</div>' +
      '<div class="fin-view-grid-2x2">' +

      '<div class="fin-view-grid-item">' +
      '<div class="fin-view-grid-label"><i class="bi bi-person"></i> Cliente</div>' +
      '<select id="fin-edit-cliente" class="form-select form-select-sm fin-edit-input">' + opcoesCliente + '</select>' +
      '</div>' +

      '<div class="fin-view-grid-item">' +
      '<div class="fin-view-grid-label"><i class="bi bi-person-badge"></i> Colaborador</div>' +
      '<select id="fin-edit-colaborador" class="form-select form-select-sm fin-edit-input">' + opcoesColaborador + '</select>' +
      '</div>' +

      '<div class="fin-view-grid-item">' +
      '<div class="fin-view-grid-label"><i class="bi bi-arrow-down-up"></i> Tipo</div>' +
      '<select id="fin-edit-tipo" class="form-select form-select-sm fin-edit-input">' +
      '<option value="entrada" ' + (isEntrada ? 'selected' : '') + '>Receita</option>' +
      '<option value="saida" ' + (!isEntrada ? 'selected' : '') + '>Despesa</option>' +
      '</select></div>' +

      '<div class="fin-view-grid-item">' +
      '<div class="fin-view-grid-label"><i class="bi bi-circle-half"></i> Situação</div>' +
      '<select id="fin-edit-situacao" class="form-select form-select-sm fin-edit-input">' +
      '<option value="pendente" ' + (reg.situacao === 'pendente' ? 'selected' : '') + '>Pendente</option>' +
      '<option value="pago" ' + (reg.situacao === 'pago' ? 'selected' : '') + '>Pago</option>' +
      '<option value="recebido" ' + (reg.situacao === 'recebido' ? 'selected' : '') + '>Recebido</option>' +
      '<option value="cancelado" ' + (reg.situacao === 'cancelado' ? 'selected' : '') + '>Cancelado</option>' +
      '</select></div>' +

      '</div></div>' +

      '<div class="fin-extrato-divider"></div>' +

      '<div class="fin-extrato-section">' +
      '<div class="fin-extrato-section-title">Detalhes</div>' +

      '<div class="fin-extrato-row fin-extrato-row-vertical">' +
      '<div class="fin-extrato-row-label"><i class="bi bi-file-text"></i> Descrição</div>' +
      '<input type="text" id="fin-edit-descricao" class="form-control form-control-sm fin-edit-input" value="' + escapeHtml(reg.descricao || '') + '">' +
      '</div>' +

      '<div class="fin-extrato-row fin-extrato-row-vertical">' +
      '<div class="fin-extrato-row-label"><i class="bi bi-chat-left-text"></i> Observação</div>' +
      '<textarea id="fin-edit-observacao" class="form-control form-control-sm fin-edit-input" rows="2">' + escapeHtml(reg.observacao || '') + '</textarea>' +
      '</div>' +

      '</div>' +
      '</div>' +

      '</div>' +

      '<div class="fin-extrato-footer fin-extrato-footer-actions">' +
      '<button type="button" class="fin-btn-cancelar-editar" id="fin-btn-cancelar-editar">Fechar</button>' +
      '<button type="button" class="fin-btn-salvar-editar" id="fin-btn-salvar-editar">' +
      '<i class="bi bi-check-lg" id="fin-btn-salvar-editar-icon"></i>' +
      '<span id="fin-btn-salvar-editar-texto">Salvar Alterações</span>' +
      '</button>' +
      '</div>' +

      '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl, { backdrop: 'static' });

    mascaraValor(document.getElementById('fin-edit-valor'));

    var btnSalvar = document.getElementById('fin-btn-salvar-editar');
    var btnCancelar = document.getElementById('fin-btn-cancelar-editar');
    var btnIcon = document.getElementById('fin-btn-salvar-editar-icon');
    var btnTexto = document.getElementById('fin-btn-salvar-editar-texto');
    var erroEl = document.getElementById('fin-editar-erro');
    var btnClose = modalEl.querySelector('.btn-close');

    var elValor = document.getElementById('fin-edit-valor');
    var elDescricao = document.getElementById('fin-edit-descricao');
    var elCliente = document.getElementById('fin-edit-cliente');
    var elColaborador = document.getElementById('fin-edit-colaborador');
    var elTipo = document.getElementById('fin-edit-tipo');
    var elSituacao = document.getElementById('fin-edit-situacao');
    var elObservacao = document.getElementById('fin-edit-observacao');

    var _houveAlteracao = false;
    var _jaSalvouOuFechou = false;
    var _fechamentoForcado = false;

    [elValor, elDescricao, elCliente, elColaborador, elTipo, elSituacao, elObservacao].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', function () { _houveAlteracao = true; });
      el.addEventListener('change', function () { _houveAlteracao = true; });
    });

    function coletarDadosParaSalvar() {
      var clienteId = elCliente.value;
      var colaboradorId = elColaborador.value;
      var clienteObj = clienteId ? state.clientesCache[clienteId] : null;
      var colaboradorObj = colaboradorId ? state.colaboradoresCache[colaboradorId] : null;

      return {
        valor: parseValor(elValor.value.trim()),
        motoboy: colaboradorObj ? (colaboradorObj.username || colaboradorObj.nome || '') : '',
        colaborador_id: colaboradorId || '',
        cliente: clienteObj ? (clienteObj.nome || clienteObj.username || '') : '',
        cliente_id: clienteId || '',
        tipo: elTipo.value,
        situacao: elSituacao.value,
        descricao: elDescricao.value.trim(),
        observacao: elObservacao.value.trim()
      };
    }

    function fecharModal() {
      if (_fechamentoForcado) return;
      _fechamentoForcado = true;
      modalInst.hide();
    }

    function persistirESolicitarFechamento() {
      if (_jaSalvouOuFechou) return;

      if (!_houveAlteracao) {
        _jaSalvouOuFechou = true;
        fecharModal();
        return;
      }

      var descricao = elDescricao.value.trim();
      var valorNum = parseValor(elValor.value.trim());

      if (!descricao) {
        erroEl.textContent = 'Informe a descrição.';
        erroEl.classList.remove('d-none');
        return;
      }
      if (valorNum <= 0) {
        erroEl.textContent = 'Informe um valor válido.';
        erroEl.classList.remove('d-none');
        return;
      }

      _jaSalvouOuFechou = true;

      var dadosAtualizados = coletarDadosParaSalvar();

      btnSalvar.disabled = true;
      btnCancelar.disabled = true;
      if (btnClose) btnClose.disabled = true;
      btnIcon.className = 'bi bi-arrow-repeat fin-spin-icon';
      btnTexto.textContent = 'Salvando...';

      salvarRegistroFinanceiro(reg.id, dadosAtualizados)
        .then(function () { fecharModal(); })
        .catch(function (err) {
          console.error('Erro ao salvar registro financeiro:', err);
          erroEl.textContent = err.message || 'Não foi possível salvar as alterações.';
          erroEl.classList.remove('d-none');
          btnSalvar.disabled = false;
          btnCancelar.disabled = false;
          if (btnClose) btnClose.disabled = false;
          btnIcon.className = 'bi bi-check-lg';
          btnTexto.textContent = 'Salvar Alterações';
          _jaSalvouOuFechou = false;
        });
    }

    function fecharSemSalvar() {
      erroEl.classList.add('d-none');
      _jaSalvouOuFechou = true;
      fecharModal();
    }

    btnSalvar.addEventListener('click', function () {
      erroEl.classList.add('d-none');
      persistirESolicitarFechamento();
    });

    btnCancelar.addEventListener('click', fecharSemSalvar);
    if (btnClose) btnClose.addEventListener('click', fecharSemSalvar);

    modalEl.addEventListener('hide.bs.modal', function (e) {
      if (_fechamentoForcado) return;
      e.preventDefault();
      erroEl.classList.add('d-none');
      persistirESolicitarFechamento();
    });

    modalEl.addEventListener('hidden.bs.modal', function () {
      modalInst.dispose();
      if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    });

    modalInst.show();

    var wrapperValor = document.getElementById('fin-valor-editar-wrapper');
    var inputValor = document.getElementById('fin-edit-valor');
    if (wrapperValor && inputValor) {
      inputValor.classList.add('fin-input-valor-piscando');
      if (!wrapperValor.querySelector('.fin-seta-editar-valor')) {
        var seta = document.createElement('i');
        seta.className = 'bi bi-arrow-left-circle-fill fin-seta-editar-valor';
        seta.setAttribute('title', 'Você pode editar este valor');
        wrapperValor.appendChild(seta);
      }
    }
  }

  function editarPorId(id) {
    var reg = state.cache.find(function (r) { return String(r.id) === String(id); });
    if (!reg) {
      console.error('Registro não encontrado para o ID:', id);
      finToast('Lançamento não encontrado.', 'warning');
      return;
    }
    abrirModalEditar(reg);
  }

  function _atualizarContadoresFin() {
    var lista = state.cache;
    var count = { pendente: 0, pago: 0, recebido: 0, cancelado: 0 };

    lista.forEach(function (r) {
      var sit = (r.situacao || '').toLowerCase();
      if (sit === 'pendente') count.pendente++;
      else if (sit === 'pago') count.pago++;
      else if (sit === 'recebido') count.recebido++;
      else if (sit === 'cancelado') count.cancelado++;
    });

    setText('fin-status-count-pendente', count.pendente);
    setText('fin-status-count-pago', count.pago);
    setText('fin-status-count-recebido', count.recebido);
    setText('fin-status-count-cancelado', count.cancelado);
    setText('fin-status-count-total', lista.length);

    document.querySelectorAll('#fin-tab-content-todos .fin-status-action-item[data-filtro-situacao]').forEach(function (item) {
      if (!item._finBound) {
        item._finBound = true;
        item.addEventListener('click', function () {
          state.filtroTipo = this.getAttribute('data-filtro-tipo') || 'todos';
          state.filtroSituacao = this.getAttribute('data-filtro-situacao');
          state.todos.pagina = 1;
          atualizarCardAtivoFin();
          renderTodos();
        });
      }
    });

    configurarInfoHoverFin();
  }

  function registrarEventos() {
    try {
      bindBtnSalvarPeriodoCaixa();
      configurarOlhinhoCarteiraRDOP();

      document.querySelectorAll('.fin-tab').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
          e.preventDefault();
          try {
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
          } catch (err) {
            console.error('[fin-tab click]', err);
            finToast('Erro ao trocar de aba: ' + err.message, 'danger');
          }
        });
      });

      if (els.btnSortData) {
        els.btnSortData.addEventListener('click', function () {
          try {
            state.sortDataDesc = !state.sortDataDesc;
            if (els.iconSortData) els.iconSortData.className = state.sortDataDesc ? 'bi bi-arrow-down' : 'bi bi-arrow-up';
            state.todos.pagina = 1;
            renderTodos();
          } catch (err) {
            console.error('[btnSortData]', err);
            finToast('Erro ao ordenar: ' + err.message, 'danger');
          }
        });
      }

      if (els.pagPrevTodos) els.pagPrevTodos.addEventListener('click', function () { try { if (state.todos.pagina > 1) { state.todos.pagina--; renderTodos(); } } catch (err) { console.error(err); finToast('Erro de paginação: ' + err.message, 'danger'); } });
      if (els.pagNextTodos) els.pagNextTodos.addEventListener('click', function () { try { if (state.todos.pagina < state.todos.totalPag) { state.todos.pagina++; renderTodos(); } } catch (err) { console.error(err); finToast('Erro de paginação: ' + err.message, 'danger'); } });
      if (els.pagPrevCaixa) els.pagPrevCaixa.addEventListener('click', function () { try { if (state.caixa.pagina > 1) { state.caixa.pagina--; renderCaixaListaDiaria(); } } catch (err) { console.error(err); finToast('Erro de paginação: ' + err.message, 'danger'); } });
      if (els.pagNextCaixa) els.pagNextCaixa.addEventListener('click', function () { try { if (state.caixa.pagina < state.caixa.totalPag) { state.caixa.pagina++; renderCaixaListaDiaria(); } } catch (err) { console.error(err); finToast('Erro de paginação: ' + err.message, 'danger'); } });

      function obterPeriodoCaixa() {
        var inicio = els.caixaDataInicio ? els.caixaDataInicio.value : '';
        var fim = els.caixaDataFim ? els.caixaDataFim.value : '';
        if (!inicio || !fim) { finToast('Selecione o período (De e Até).', 'warning'); return null; }
        if (inicio > fim) { finToast('Data inicial maior que a final.', 'warning'); return null; }
        return { inicio: inicio, fim: fim };
      }

      function registrosNoPeriodo(inicio, fim) {
        return state.cache.filter(function (r) { return r.dataISO >= inicio && r.dataISO <= fim; });
      }

      if (els.btnFiltrarCaixa) {
        els.btnFiltrarCaixa.addEventListener('click', function () {
          try {
            var periodo = obterPeriodoCaixa();
            if (!periodo) return;

            state.caixa.dataInicio = periodo.inicio;
            state.caixa.dataFim = periodo.fim;
            state.caixa.buscaRealizada = true;

            renderCaixa();

            var registros = registrosNoPeriodo(periodo.inicio, periodo.fim);
            if (!registros.length) { finToast('Nenhum registro encontrado no período.', 'warning'); return; }

            if (periodoJaExisteStorage(periodo.inicio, periodo.fim)) {
              mostrarModalPeriodoDuplicado(formatDateBR(periodo.inicio) + ' a ' + formatDateBR(periodo.fim));
              return;
            }

            var registrosIsolados = registros.map(function (r) {
              return {
                dataISO: r.dataISO,
                dataDisplay: r.dataDisplay,
                tipo: r.tipo,
                descricao: r.descricao,
                valor: r.valor,
                motoboy: r.motoboy,
                valorColaborador: r.valorColaborador,
                valorEmpresa: r.valorEmpresa,
                situacao: r.situacao
              };
            });

            var periodoSalvo = {
              id: gerarIdExtrato(),
              inicio: periodo.inicio,
              fim: periodo.fim,
              periodoLabel: formatDateBR(periodo.inicio) + ' a ' + formatDateBR(periodo.fim),
              registros: registrosIsolados,
              criadoEm: Date.now()
            };

            salvarPeriodoCaixaStorage(periodoSalvo);
            renderPeriodosSalvosCaixa();
            limparBuscaCaixaSession();

            caixaPeriodoAtual = { inicio: periodo.inicio, fim: periodo.fim, registros: registros };
            salvarBuscaCaixaSession(periodo.inicio, periodo.fim, registros);

            finToast('Caixa gerado com sucesso!', 'success');
          } catch (err) {
            console.error('[btnFiltrarCaixa]', err);
            finToast('Erro ao gerar caixa: ' + err.message, 'danger');
          }
        });
      }

      if (els.btnRelatorioCaixaModal) {
        els.btnRelatorioCaixaModal.addEventListener('click', function () {
          try {
            if (!state.caixa.dataInicio || !state.caixa.dataFim) { finToast('Nenhum período selecionado.', 'warning'); return; }
            var lista = registrosNoPeriodo(state.caixa.dataInicio, state.caixa.dataFim);
            if (!lista.length) { finToast('Nenhum registro no período para gerar relatório.', 'warning'); return; }

            var periodoLabel = formatDateBR(state.caixa.dataInicio) + ' a ' + formatDateBR(state.caixa.dataFim);
            abrirJanelaPdfFinanceiro('Relatório de Caixa - ' + periodoLabel, periodoLabel, lista);
          } catch (err) {
            console.error('[btnRelatorioCaixaModal]', err);
            finToast('Erro ao gerar relatório: ' + err.message, 'danger');
          }
        });
      }

      var btnBaixarCaixaModal = document.getElementById('btn-baixar-fin-caixa');
      if (btnBaixarCaixaModal) {
        btnBaixarCaixaModal.addEventListener('click', function () {
          try {
            if (!state.caixa.dataInicio || !state.caixa.dataFim) { finToast('Nenhum período selecionado.', 'warning'); return; }
            var lista = registrosNoPeriodo(state.caixa.dataInicio, state.caixa.dataFim);
            if (!lista.length) { finToast('Nenhum registro no período.', 'warning'); return; }

            var periodoLabel = formatDateBR(state.caixa.dataInicio) + ' a ' + formatDateBR(state.caixa.dataFim);
            baixarHtmlFinanceiro('Relatorio_Caixa_' + periodoLabel.replace(/[\s\/]+/g, '_'), periodoLabel, lista);
          } catch (err) {
            console.error('[btnBaixarCaixaModal]', err);
            finToast('Erro ao baixar relatório: ' + err.message, 'danger');
          }
        });
      }

      if (els.caixaDataInicio) els.caixaDataInicio.addEventListener('change', function () {
        state.caixa.pagina = 1;
        state.caixa.buscaRealizada = false;
        limparBuscaCaixaSession();
        renderCaixa();
      });

      if (els.caixaDataFim) els.caixaDataFim.addEventListener('change', function () {
        state.caixa.pagina = 1;
        state.caixa.buscaRealizada = false;
        limparBuscaCaixaSession();
        renderCaixa();
      });

      if (els.extratoFiltroDescricao) {
        var extratoFiltroDebounced = debounce(function (valor) {
          try {
            state.extrato.filtroDescricao = (valor || '').trim();
            renderizarListaExtratos();
          } catch (err) {
            console.error('[extratoFiltroDescricao]', err);
            finToast('Erro ao filtrar extrato: ' + err.message, 'danger');
          }
        }, 350);
        els.extratoFiltroDescricao.addEventListener('input', function () { extratoFiltroDebounced(this.value); });
      }

      if (els.btnGerarExtrato) els.btnGerarExtrato.addEventListener('click', function () {
        try { gerarNovoExtrato(); } catch (err) { console.error('[btnGerarExtrato]', err); finToast('Erro ao gerar extrato: ' + err.message, 'danger'); }
      });

      if (els.btnRefresh) els.btnRefresh.addEventListener('click', function () {
        try { carregarDados(); } catch (err) { console.error('[btnRefresh]', err); finToast('Erro ao atualizar dados: ' + err.message, 'danger'); }
      });

      if (els.btnNovo) els.btnNovo.addEventListener('click', function () {
        try { abrirModalNovo(); } catch (err) { console.error('[btnNovo]', err); finToast('Erro ao abrir novo lançamento: ' + err.message, 'danger'); }
      });

      document.addEventListener('keydown', function (e) {
        try {
          if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); abrirModalNovo(); }
          if (e.key === '/' && ['INPUT', 'TEXTAREA'].indexOf(document.activeElement.tagName) === -1) { e.preventDefault(); if (els.filtroBusca) els.filtroBusca.focus(); }
        } catch (err) {
          console.error('[keydown shortcut]', err);
        }
      });

      var btnAdicionar = document.querySelector('[data-rdo-action="adicionar"]');
      if (btnAdicionar) btnAdicionar.addEventListener('click', function (e) {
        e.preventDefault();
        try { abrirModalAdicionarDinheiro(); } catch (err) { console.error('[btnAdicionar]', err); finToast('Erro ao abrir modal: ' + err.message, 'danger'); }
      });

      var btnTransferir = document.querySelector('[data-rdo-action="transferir"]');
      if (btnTransferir) btnTransferir.addEventListener('click', function (e) {
        e.preventDefault();
        try { abrirModalTransferir(); } catch (err) { console.error('[btnTransferir]', err); finToast('Erro ao abrir transferência: ' + err.message, 'danger'); }
      });

      var btnRepasses = document.getElementById('btn-ver-repasses');
      if (btnRepasses) btnRepasses.addEventListener('click', function (e) {
        e.preventDefault();
        try { abrirModalRepasses(); } catch (err) { console.error('[btnRepasses]', err); finToast('Erro ao abrir repasses: ' + err.message, 'danger'); }
      });

      var btnExtratosCaixa = document.querySelector('[data-rdo-action="extratos"]');
      if (btnExtratosCaixa) btnExtratosCaixa.addEventListener('click', function (e) {
        e.preventDefault();
        try { abrirModalExtratosCaixa(); } catch (err) { console.error('[btnExtratosCaixa]', err); finToast('Erro ao abrir extratos: ' + err.message, 'danger'); }
      });

      var finColabEl = document.getElementById('fin-colaborador-id') || document.getElementById('fin-colaborador');
      if (finColabEl) finColabEl.addEventListener('change', function () {
        try { atualizarPreviewComissao(); } catch (err) { console.error('[atualizarPreviewComissao]', err); finToast('Erro ao calcular comissão: ' + err.message, 'danger'); }
      });

      var btnSalvarNovo = document.getElementById('btn-salvar-novo-fin');
      if (btnSalvarNovo) btnSalvarNovo.addEventListener('click', function () {
        try { salvarLancamento(); } catch (err) { console.error('[btnSalvarNovo]', err); finToast('Erro ao salvar lançamento: ' + err.message, 'danger'); }
      });

      if (els.extratoModalFechar) els.extratoModalFechar.addEventListener('click', function () { if (els.extratoModalOverlay) els.extratoModalOverlay.style.display = 'none'; });
      if (els.extratoModalOverlay) els.extratoModalOverlay.addEventListener('click', function (e) { if (e.target === els.extratoModalOverlay) els.extratoModalOverlay.style.display = 'none'; });

      var btnRelatorioExtrato = document.getElementById('btn-relatorio-fin-extrato');
      if (btnRelatorioExtrato) {
        btnRelatorioExtrato.addEventListener('click', function () {
          try {
            if (!els.extratoDataInicio || !els.extratoDataFim) {
              finToast('Campos de período do extrato não encontrados.', 'danger');
              return;
            }
            var inicio = els.extratoDataInicio.value;
            var fim = els.extratoDataFim.value;
            if (!inicio || !fim) { finToast('Selecione o período.', 'warning'); return; }
            if (inicio > fim) { finToast('Data inicial maior que a final.', 'warning'); return; }

            var origemSelect = els.extratoOrigem ? els.extratoOrigem.value : '__caixa__';
            var registros = registrosNoPeriodo(inicio, fim);

            if (origemSelect && origemSelect !== '__caixa__') {
              registros = registros.filter(function (r) { return r.motoboy === origemSelect || r.grupo === origemSelect; });
            }

            if (!registros.length) { finToast('Nenhum registro encontrado no período.', 'warning'); return; }

            var origemLabel = (origemSelect === '__caixa__' || !origemSelect) ? 'Caixa Geral' : origemSelect;
            abrirRelatorioFinanceiro('extrato', registros, 'Relatório de Extrato - ' + origemLabel, inicio, fim);
          } catch (err) {
            console.error('[btnRelatorioExtrato]', err);
            finToast('Erro ao gerar relatório de extrato: ' + err.message, 'danger');
          }
        });
      }

    } catch (err) {
      console.error('[registrarEventos] Falha crítica ao registrar eventos:', err);
      if (typeof finToast === 'function') {
        finToast('Erro crítico ao inicializar eventos da tela financeira: ' + err.message, 'danger');
      } else {
        alert('Erro crítico ao inicializar eventos financeiros: ' + err.message);
      }
    }
  }

  function exibirErroViewFin(msg) {
    var box = document.getElementById('fin-view-erro-box');
    var txt = document.getElementById('fin-view-erro-msg');
    if (box && txt) {
      txt.textContent = msg || 'Ocorreu um erro inesperado.';
      box.classList.remove('d-none');
    }
  }

  function ocultarErroViewFin() {
    var box = document.getElementById('fin-view-erro-box');
    if (box) box.classList.add('d-none');
  }

  function renderRdoContadores() {
    var totais = calcularTotaisRegistros(state.cache);
    var mapa = {
      'rdo-card-entradas': totais.entradas,
      'rdo-card-saidas': totais.saidas,
      'rdo-card-empresa': totais.empresa,
      'rdo-card-colaboradores': totais.colaboradores,
      'rdo-card-saldo-total': totais.saldo
    };
    Object.keys(mapa).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('data-valor-real', formatarMoeda(mapa[id]));
      el.textContent = _rdoValoresVisiveis ? formatarMoeda(mapa[id]) : 'R$ ****';
    });
    var elReg = document.getElementById('rdo-card-registros');
    if (elReg) elReg.textContent = state.cache.length;
  }

  function aplicarMascaraValoresRdo() {
    document.querySelectorAll('#fin-tab-content-todos .fin-valor-rdo').forEach(function (el) {
      var real = el.getAttribute('data-valor-real');
      if (!real) return;
      el.textContent = _rdoValoresVisiveis ? real : 'R$ ****';
    });
  }

  function bindOlhinhoRdo() {
    var btn = document.getElementById('btn-toggle-rdo-valores');
    var icon = document.getElementById('icon-toggle-rdo-val');
    if (!btn || btn._rdoOlhinhoBound) return;
    btn._rdoOlhinhoBound = true;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      _rdoValoresVisiveis = !_rdoValoresVisiveis;
      btn.classList.toggle('oculto', !_rdoValoresVisiveis);
      if (icon) icon.className = _rdoValoresVisiveis ? 'bi bi-eye' : 'bi bi-eye-slash';
      btn.title = _rdoValoresVisiveis ? 'Ocultar valores' : 'Mostrar valores';
      aplicarMascaraValoresRdo();
    });
  }

  function atualizarCardsCaixa(valores) {
    Object.keys(valores).forEach(function (k) {
      if (!els[k]) return;
      els[k].setAttribute('data-valor-real', formatarMoeda(valores[k]));
      els[k].textContent = state.caixaValoresVisiveis ? formatarMoeda(valores[k]) : 'R$ ****';
    });
  }

  function agruparPorDia(registros) {
    var porDia = {};
    registros.forEach(function (r) {
      var dia = r.dataISO || 'sem-data';
      if (!porDia[dia]) porDia[dia] = [];
      porDia[dia].push(r);
    });
    return porDia;
  }

  var btnFecharErroFin = document.getElementById('fin-view-erro-fechar');
  if (btnFecharErroFin) btnFecharErroFin.addEventListener('click', ocultarErroViewFin);

  function periodoJaExisteStorage(inicio, fim) {
    return carregarPeriodosCaixaStorage().some(function (p) {
      return !p.excluido && p.inicio === inicio && p.fim === fim;
    });
  }

  function mostrarModalPeriodoDuplicado(periodoLabel) {
    var OLD_ID = 'modalPeriodoDuplicadoDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered" style="max-width:380px;">' +
      '<div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">' +
      '<div style="background:linear-gradient(135deg,#fd7e14 0%,#c65e0a 100%);padding:20px 24px 16px;">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">' +
      '<i class="bi bi-exclamation-triangle-fill" style="font-size:1.1rem;color:#fff;"></i></div>' +
      '<div><h6 class="fw-bold mb-0 text-white" style="font-size:.9rem;">Período já salvo</h6>' +
      '<small style="color:rgba(255,255,255,.75);font-size:.72rem;">' + escapeHtml(periodoLabel) + '</small></div></div></div>' +
      '<div class="modal-body px-4 py-4" style="font-size:.82rem;">' +
      'Esse período já foi salvo, esse período já existe na lista.</div>' +
      '<div class="modal-footer border-0 px-4 pb-4 pt-0 justify-content-end">' +
      '<button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;">Entendi</button>' +
      '</div></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function () {
      modalInst.dispose();
      if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
      _limparModalsBackdropOrfaos(); // 🔧 limpeza extra ao fechar
    });
    modalInst.show();
  }

  function abrirModalConfirmarExclusaoFin(opcoes) {
    opcoes = opcoes || {};
    var titulo = opcoes.titulo || 'Confirmar exclusão';
    var mensagem = opcoes.mensagem || 'Tem certeza que deseja excluir este item? Essa ação não pode ser desfeita.';
    var subtitulo = opcoes.subtitulo || '';
    var onConfirmar = typeof opcoes.onConfirmar === 'function' ? opcoes.onConfirmar : function () { };

    var OLD_ID = 'modalConfirmarExclusaoFinDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered" style="max-width:380px;">' +
      '<div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">' +

      '<div style="background:linear-gradient(135deg,#dc3545 0%,#b02a37 100%);padding:20px 24px 16px;">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
      '<i class="bi bi-trash3-fill" style="font-size:1.1rem;color:#fff;"></i></div>' +
      '<div><h6 class="fw-bold mb-0 text-white" style="font-size:.9rem;">' + escapeHtml(titulo) + '</h6>' +
      (subtitulo ? '<small style="color:rgba(255,255,255,.75);font-size:.72rem;">' + escapeHtml(subtitulo) + '</small>' : '') +
      '</div></div></div>' +

      '<div class="modal-body px-4 py-4" style="font-size:.82rem;color:#444;">' +
      escapeHtml(mensagem) +
      '</div>' +

      '<div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex justify-content-end">' +
      '<button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;">' +
      '<i class="bi bi-x-lg me-1"></i>Cancelar</button>' +
      '<button type="button" class="btn btn-danger rounded-pill px-4" id="' + OLD_ID + '-btn-confirmar" style="font-size:.78rem;height:38px;font-weight:600;">' +
      '<i class="bi bi-trash3 me-1"></i>Excluir</button>' +
      '</div>' +

      '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl);
    var btnConfirmar = document.getElementById(OLD_ID + '-btn-confirmar');

    btnConfirmar.addEventListener('click', function () {
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      try {
        onConfirmar();
      } finally {
        modalInst.hide();
      }
    });

    modalEl.addEventListener('hidden.bs.modal', function () {
      modalInst.dispose();
      if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    });

    modalInst.show();
  }

  function bindBtnSalvarPeriodoCaixa() {
    var btn = document.getElementById('btn-salvar-periodo-caixa');
    if (!btn || btn._bindSalvarPeriodo) return;
    btn._bindSalvarPeriodo = true;

    var textoOriginal = btn.innerHTML;

    btn.addEventListener('click', function () {
      if (btn.disabled) return;

      if (!caixaPeriodoAtual.registros.length) {
        finToast('Nenhum lançamento para salvar. Faça uma busca primeiro.', 'warning');
        return;
      }

      var periodoLabel = formatDateBR(caixaPeriodoAtual.inicio) + ' a ' + formatDateBR(caixaPeriodoAtual.fim);

      if (periodoJaExisteStorage(caixaPeriodoAtual.inicio, caixaPeriodoAtual.fim)) {
        mostrarModalPeriodoDuplicado(periodoLabel);
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-arrow-repeat fin-spin-icon"></i>';

      setTimeout(function () {
        try {
          var registrosIsolados = caixaPeriodoAtual.registros.map(function (r) {
            return {
              dataISO: r.dataISO,
              dataDisplay: r.dataDisplay,
              tipo: r.tipo,
              descricao: r.descricao,
              valor: r.valor,
              situacao: r.situacao
            };
          });

          var periodoSalvo = {
            id: gerarIdExtrato(),
            inicio: caixaPeriodoAtual.inicio,
            fim: caixaPeriodoAtual.fim,
            periodoLabel: periodoLabel,
            registros: registrosIsolados,
            criadoEm: Date.now()
          };

          salvarPeriodoCaixaStorage(periodoSalvo);
          renderPeriodosSalvosCaixa();
          limparBuscaCaixaSession();
          finToast('Período salvo com sucesso!', 'success');

          var modalEl = document.getElementById('modalPeriodoCaixa');
          if (modalEl) {
            var inst = bootstrap.Modal.getOrCreateInstance(modalEl);
            inst.hide();
          }
        } catch (err) {
          console.error('[bindBtnSalvarPeriodoCaixa]', err);
          finToast('Erro ao salvar período: ' + err.message, 'danger');
        } finally {
          btn.disabled = false;
          btn.innerHTML = textoOriginal;
        }
      }, 400);
    });
  }

  function abrirModalVisualizarPeriodoCaixa(periodo) {
    var idModal = 'modal-visualizar-caixa-' + periodo.id;
    var registros = periodo.registros || [];
    var totais = calcularTotaisRegistros(registros);

    // Cor única e suave para todos os blocos de dia (cinza clarinho)
    var corBlocoUnica = { bg: '#f7f7f8', borda: '#e4e4e7' };

    var blocos = agruparRegistrosPorData(registros);

    var blocosHtml = blocos.map(function (bloco) {
      var totaisDia = calcularTotaisRegistros(bloco.registros);
      var labelData = bloco.dataISO !== 'sem-data' ? formatDateBR(bloco.dataISO) : 'Sem data';
      var labelSemana = bloco.dataISO !== 'sem-data' ? getDiaSemanaCompleto(bloco.dataISO) : '';

      var linhas = bloco.registros.map(function (r) {
        var valorClasse = r.tipo === 'entrada' ? 'text-success' : 'text-danger';
        return '' +
          '<div style="display:flex;align-items:baseline;gap:6px;padding:6px 4px;">' +
          '<span style="font-size:.78rem;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55%;flex-shrink:0;" title="' + escapeHtml(r.descricao || '-') + '">' + escapeHtml(r.descricao || '-') + '</span>' +
          '<span style="flex:1;border-bottom:1.5px dotted #b8b8b8;height:1px;margin:0 2px;position:relative;top:-4px;"></span>' +
          '<span class="' + valorClasse + '" style="font-size:.8rem;font-weight:700;white-space:nowrap;flex-shrink:0;">' + formatarMoeda(r.valor) + '</span>' +
          '</div>';
      }).join('');

      return '' +
        '<div style="background:' + corBlocoUnica.bg + ';border:1px solid ' + corBlocoUnica.borda + ';border-radius:12px;margin-bottom:10px;overflow:hidden;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-bottom:1px solid ' + corBlocoUnica.borda + ';">' +
        '<div><span style="font-size:.78rem;font-weight:700;color:#444;">' + labelData + '</span>' +
        '<span style="font-size:.66rem;color:#888;margin-left:6px;">' + labelSemana + '</span></div>' +
        '<span style="font-size:.74rem;font-weight:700;color:' + (totaisDia.saldo >= 0 ? '#198754' : '#dc3545') + ';">' + formatarMoeda(totaisDia.saldo) + '</span>' +
        '</div>' +
        '<div style="padding:4px 10px;">' + linhas + '</div>' +
        '</div>';
    }).join('');

    if (!blocos.length) {
      blocosHtml = '<div class="text-center text-muted py-4">Nenhum lançamento neste período.</div>';
    }

    var modalHtml =
      '<div class="modal fade" id="' + idModal + '" tabindex="-1">' +
      '<div class="modal-dialog modal-lg modal-dialog-scrollable">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<h5 class="modal-title">Carteira &middot; ' + escapeHtml(periodo.periodoLabel || '-') + '</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
      '</div>' +
      '<div class="modal-body">' +
      '<div class="d-flex flex-wrap gap-2 mb-3">' +
      '<div class="border rounded-3 px-3 py-2 flex-fill"><div class="small text-muted">Receitas</div><div class="fw-bold text-success">' + formatarMoeda(totais.entradas) + '</div></div>' +
      '<div class="border rounded-3 px-3 py-2 flex-fill"><div class="small text-muted">Despesas</div><div class="fw-bold text-danger">' + formatarMoeda(totais.saidas) + '</div></div>' +
      '<div class="border rounded-3 px-3 py-2 flex-fill"><div class="small text-muted">Empresa (20%)</div><div class="fw-bold">' + formatarMoeda(totais.empresa) + '</div></div>' +
      '<div class="border rounded-3 px-3 py-2 flex-fill"><div class="small text-muted">Colaboradores (80%)</div><div class="fw-bold">' + formatarMoeda(totais.colaboradores) + '</div></div>' +
      '<div class="border rounded-3 px-3 py-2 flex-fill"><div class="small text-muted">Saldo</div><div class="fw-bold text-primary">' + formatarMoeda(totais.saldo) + '</div></div>' +
      '</div>' +
      '<div>' + blocosHtml + '</div>' +
      '<div class="d-flex justify-content-between pt-3 fw-bold" style="font-size:.85rem;border-top:1px solid #eee;margin-top:6px;">' +
      '<span>Saldo total:</span><span class="' + (totais.saldo >= 0 ? 'text-success' : 'text-danger') + '">' + formatarMoeda(totais.saldo) + '</span></div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal">Fechar</button>' +
      '<button type="button" class="btn btn-danger btn-sm rounded-pill px-3" id="' + idModal + '-btn-pdf"><i class="bi bi-file-pdf me-1"></i>Gerar PDF</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    var antigo = document.getElementById(idModal);
    if (antigo) antigo.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    var modalEl = document.getElementById(idModal);
    var modalInstance = new bootstrap.Modal(modalEl);

    var btnPdf = document.getElementById(idModal + '-btn-pdf');
    var btnBaixar = document.getElementById(idModal + '-btn-baixar');

    if (btnPdf) {
      btnPdf.addEventListener('click', function () {
        abrirJanelaPdfFinanceiro('Relatório de Caixa', periodo.periodoLabel, registros);
      });
    }

    if (btnBaixar) {
      btnBaixar.addEventListener('click', function () {
        var nomeArquivo = 'Relatorio_Caixa_' + (periodo.periodoLabel || '').replace(/[\s\/]+/g, '_');
        baixarHtmlFinanceiro(nomeArquivo, periodo.periodoLabel, registros);
      });
    }

    modalEl.addEventListener('hidden.bs.modal', function () {
      modalEl.remove();
    });

    modalInstance.show();
  }

  function abrirModalView(lancamento) {
    ocultarErroViewFin();
    try {
      if (!lancamento || !lancamento.id) throw new Error('Lançamento inválido ou não encontrado.');
      // ... preenchimento normal dos campos do modal ...
    } catch (err) {
      console.error('[abrirModalView]', err);
      exibirErroViewFin(err.message || String(err));
    }
  }

  function obterUsuarioLogadoFin() {
    try {
      var raw = localStorage.getItem('usuarioLogado') || sessionStorage.getItem('usuarioLogado');
      if (raw) {
        var u = JSON.parse(raw);
        return { id: u.id || u.usuario_id || '', username: u.username || u.nome || 'N/D' };
      }
    } catch (e) { /* silencioso */ }
    return { id: '', username: 'N/D' };
  }

  function _normalizarIdPedidoBusca(valor) {
    if (valor === null || valor === undefined) return null;
    // Remove QUALQUER caractere que não seja dígito, em qualquer posição
    var digitos = String(valor).replace(/\D/g, '');
    if (!digitos) return null;
    var semZerosEsquerda = digitos.replace(/^0+/, '');
    return semZerosEsquerda || '0';
  }

  function dadosFiltradosTodos() {
    var lista = state.cache.slice();

    if (state.filtroTipo !== 'todos') {
      lista = lista.filter(function (r) { return r.tipo === state.filtroTipo; });
    }
    if (state.filtroSituacao !== 'todos') {
      lista = lista.filter(function (r) { return (r.situacao || '').toLowerCase() === state.filtroSituacao; });
    }
    if (state.filtroBusca) {
      var termoOriginal = removerAcentos(state.filtroBusca.toLowerCase().trim());
      var termos = termoOriginal.split(/\s+/).filter(Boolean);
      var termoIdNormalizado = _normalizarIdPedidoBusca(state.filtroBusca);
      var pareceIdPedido = /^(rdo)?\d+$/i.test(state.filtroBusca.trim());

      lista = lista.filter(function (r) {
        var idPedidoRaw = (r.idPedido || '').toString();
        var idPedidoNormalizado = _normalizarIdPedidoBusca(idPedidoRaw);

        var matchId = !!(termoIdNormalizado && idPedidoNormalizado && termoIdNormalizado === idPedidoNormalizado);
        if (matchId) return true;

        if (pareceIdPedido) return false;

        // NOVO: pool agora inclui as duas datas (lançamento + pedido)
        var pool = removerAcentos(
          [
            r.descricao, r.motoboy, r.observacao, idPedidoRaw, 'RDO' + idPedidoNormalizado,
            r.cliente, r.solicitante,
            r.dataBR, r.dataDisplay,
            r.dataPedidoBR, r.dataPedidoDisplay
          ].map(function (c) { return (c || '').toString(); }).join(' ').toLowerCase()
        );

        for (var i = 0; i < termos.length; i++) {
          if (termos[i] && pool.indexOf(termos[i]) === -1) return false;
        }
        return true;
      });
    }

    lista.sort(function (a, b) {
      var da = a.dataISO || '', db = b.dataISO || '';
      if (da === db) return 0;
      return state.sortDataDesc ? (da < db ? 1 : -1) : (da < db ? -1 : 1);
    });

    return lista;
  }

  function renderTodos() {
    if (!els.tbodyTodos) return;
    var lista = dadosFiltradosTodos();
    var totalItens = lista.length;
    state.todos.totalPag = Math.max(1, Math.ceil(totalItens / state.todos.porPagina));
    if (state.todos.pagina > state.todos.totalPag) state.todos.pagina = state.todos.totalPag;

    var inicio = (state.todos.pagina - 1) * state.todos.porPagina;
    var pagina = lista.slice(inicio, inicio + state.todos.porPagina);

    if (!pagina.length) {
      els.tbodyTodos.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-inbox" style="font-size:1.6rem;opacity:.4;display:block;margin-bottom:8px;"></i>Nenhum registro encontrado.</td></tr>';
    } else {
      els.tbodyTodos.innerHTML = pagina.map(function (r) {
        var badgeSituacao = getStatusBadge(r.situacao);

        return '<tr class="fin-row" data-idpedido="' + escapeHtml(r.idPedido || '') + '" style="cursor:pointer;">' +
          '<td>' + escapeHtml(r.dataDisplay || '-') + '</td>' +
          '<td class="fin-td-descricao-mobile" title="' + escapeHtml(r.descricao || '-') + '">' + formatarDescricaoMobile(r.descricao) + '</td>' +
          '<td class="fin-col-tipo">' + badgeSituacao + '</td>' +
          '<td class="text-end">' +
          '<div class="fin-actions-group">' +
          '<button class="fin-btn-action fin-btn-view fin-btn-ver" data-idpedido="' + escapeHtml(r.idPedido || '') + '"><i class="bi bi-eye"></i></button>' +
          '<button class="fin-btn-action fin-btn-edit fin-btn-editar" data-idpedido="' + escapeHtml(r.idPedido || '') + '"><i class="bi bi-pencil-square"></i></button>' +
          '</div>' +
          '</td>' +
          '</tr>';
      }).join('');

      var linhasDom = els.tbodyTodos.querySelectorAll('tr.fin-row');

      linhasDom.forEach(function (linhaEl, index) {
        var reg = pagina[index];
        if (!reg) return;

        var btnVer = linhaEl.querySelector('.fin-btn-ver');
        var btnEditar = linhaEl.querySelector('.fin-btn-editar');

        linhaEl.addEventListener('click', function (e) {
          e.stopPropagation();
          abrirModalVisualizar(reg);
        });

        if (btnVer) {
          btnVer.addEventListener('click', function (e) {
            e.stopPropagation();
            abrirModalVisualizar(reg);
          });
        }

        if (btnEditar) {
          btnEditar.addEventListener('click', function (e) {
            e.stopPropagation();
            abrirModalEditar(reg);
          });
        }
      });
    }

    if (els.pagLabelTodos) els.pagLabelTodos.textContent = 'Pág ' + state.todos.pagina;
    if (els.pagInfoTodos) els.pagInfoTodos.textContent = totalItens + ' registro' + (totalItens !== 1 ? 's' : '');
    if (els.pagPrevTodos) els.pagPrevTodos.disabled = state.todos.pagina <= 1;
    if (els.pagNextTodos) els.pagNextTodos.disabled = state.todos.pagina >= state.todos.totalPag;

    _atualizarContadoresFin();
  }

  var PALETA_BORDAS_DATA_FIN = ['#cfe3fb', '#cdeedd', '#f5e3c4', '#e6cdf5', '#c9f0ea', '#f5cccc'];

  function corBlocoDataFin(indice) {
    var cores = [
      { bg: '#eef6ff', borda: '#cfe3fb' },
      { bg: '#eefaf3', borda: '#cdeedd' },
      { bg: '#fef8ec', borda: '#f5e3c4' },
      { bg: '#f8eefb', borda: '#e6cdf5' },
      { bg: '#eafbf8', borda: '#c9f0ea' },
      { bg: '#fdeeee', borda: '#f5cccc' }
    ];
    var i = ((indice % cores.length) + cores.length) % cores.length;
    return cores[i];
  }

  function agruparRegistrosPorData(registros) {
    var mapa = {};
    var ordem = [];
    (registros || []).forEach(function (r) {
      var k = r.dataISO || 'sem-data';
      if (!mapa[k]) { mapa[k] = []; ordem.push(k); }
      mapa[k].push(r);
    });
    ordem.sort(function (a, b) { return a < b ? 1 : -1; });
    return ordem.map(function (k) { return { dataISO: k, registros: mapa[k] }; });
  }

  function calcularTotaisRegistros(lista) {
    var totais = { entradas: 0, saidas: 0, empresa: 0, colaboradores: 0, saldo: 0, qtd: (lista || []).length };
    (lista || []).forEach(function (r) {
      var valor = parseFloat(r.valor) || 0;
      if (ehReceitaFin(r.tipo)) {
        totais.entradas += valor;
        totais.empresa += parseFloat(r.valorEmpresa) || 0;
        totais.colaboradores += parseFloat(r.valorColaborador) || 0;
      } else {
        totais.saidas += valor;
      }
    });
    totais.saldo = totais.entradas - totais.saidas;
    return totais;
  }

  function gerarJanelaImpressaoFinanceira(titulo, periodoLabel, registros) {
    registros = registros || [];
    var totais = calcularTotaisRegistros(registros);
    var blocos = agruparRegistrosPorData(registros);

    var blocosHtml = blocos.map(function (bloco) {
      var totaisDia = calcularTotaisRegistros(bloco.registros);
      var labelData = bloco.dataISO !== 'sem-data' ? formatDateBR(bloco.dataISO) : 'Sem data';
      var labelSemana = bloco.dataISO !== 'sem-data' ? getDiaSemanaCompleto(bloco.dataISO) : '';

      var registrosOrdenados = bloco.registros.slice().sort(function (a, b) {
        var ha = (a.hora || '');
        var hb = (b.hora || '');
        return ha < hb ? -1 : (ha > hb ? 1 : 0);
      });

      var linhas = registrosOrdenados.map(function (r) {
        var valorClasse = r.tipo === 'entrada' ? 'positivo' : 'negativo';
        var hora = r.hora || obterHoraRegistro(r) || '--:--';
        return '' +
          '<div class="linha-extrato">' +
          '<span class="hora-extrato">' + escapeHtml(hora) + '</span>' +
          '<span class="desc-extrato">' + escapeHtml(limparSufixoHoraValorDescricao(r.descricao) || '-') + '</span>' +
          '<span class="pontos-extrato"></span>' +
          '<span class="valor-extrato ' + valorClasse + '">' + formatarMoeda(r.valor) + '</span>' +
          '</div>';
      }).join('');

      return '' +
        '<div class="bloco-data">' +
        '<div class="bloco-data-header">' +
        '<span class="bloco-data-label">' + labelData + (labelSemana ? ' <span class="bloco-data-semana">' + labelSemana + '</span>' : '') + '</span>' +
        '<span class="bloco-data-saldo" style="color:' + (totaisDia.saldo >= 0 ? '#2e7d32' : '#c62828') + ';">' + formatarMoeda(totaisDia.saldo) + '</span>' +
        '</div>' +
        '<div class="bloco-data-body">' + linhas + '</div>' +
        '</div>';
    }).join('');

    return '' +
      '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
      '<title>' + escapeHtml(titulo || '-') + '</title>' +
      '<style>' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }' +
      'body { font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: #333; padding: 24px; -webkit-font-smoothing: antialiased; }' +
      '.relatorio-header { margin-bottom: 18px; padding-bottom: 10px; border-bottom: 1px solid #eee; }' +
      '.relatorio-titulo { font-size: 14px; font-weight: 600; color: #333; }' +
      '.relatorio-periodo { font-size: 10.5px; font-weight: 400; color: #999; text-transform: uppercase; letter-spacing: .3px; margin-top: 2px; }' +
      '.bloco-data { border-radius: 10px; margin-bottom: 12px; overflow: hidden; background:#f7f7f8; border:1px solid #e4e4e7; }' +
      '.bloco-data-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom:1px solid #e4e4e7; }' +
      '.bloco-data-label { font-size: 11.5px; font-weight: 700; color: #444; }' +
      '.bloco-data-semana { font-size: 10px; font-weight: 400; color: #888; margin-left: 6px; }' +
      '.bloco-data-saldo { font-size: 11px; font-weight: 700; }' +
      '.bloco-data-body { padding: 4px 12px 8px; }' +
      '.linha-extrato { display: flex; align-items: baseline; gap: 6px; padding: 5px 0; }' +
      '.hora-extrato { font-size: 10.5px; color: #999; white-space: nowrap; flex-shrink: 0; width: 40px; }' +
      '.desc-extrato { font-size: 11.5px; color: #555; white-space: nowrap; flex-shrink: 0; max-width: 55%; overflow: hidden; text-overflow: ellipsis; }' +
      '.pontos-extrato { flex: 1; border-bottom: 1.5px dotted #b0b0b0; height: 1px; margin: 0 2px; position: relative; top: -4px; }' +
      '.valor-extrato { font-size: 12px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }' +
      '.valor-extrato.positivo { color: #2e7d32; }' +
      '.valor-extrato.negativo { color: #c62828; }' +
      '.relatorio-total { margin-top: 18px; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }' +
      '.relatorio-total-label { font-size: 11px; color: #666; }' +
      '.relatorio-total-valor { font-size: 14px; font-weight: 700; color: #333; margin-left: 6px; }' +
      '</style></head><body>' +
      '<div class="relatorio-header">' +
      '<div class="relatorio-titulo">' + escapeHtml(titulo || '-') + '</div>' +
      '<div class="relatorio-periodo">' + escapeHtml(periodoLabel || '-') + '</div>' +
      '</div>' +
      blocosHtml +
      '<div class="relatorio-total">' +
      '<div class="relatorio-total-linha"><span class="relatorio-total-label">Total Receitas:</span><span class="relatorio-total-valor" style="color:#2e7d32;">' + formatarMoeda(totais.entradas) + '</span></div>' +
      '<div class="relatorio-total-linha"><span class="relatorio-total-label">Total Despesas:</span><span class="relatorio-total-valor" style="color:#c62828;">' + formatarMoeda(totais.saidas) + '</span></div>' +
      '<div class="relatorio-total-linha relatorio-total-final"><span class="relatorio-total-label">Saldo:</span><span class="relatorio-total-valor" style="color:' + (totais.saldo >= 0 ? '#2e7d32' : '#c62828') + ';">' + formatarMoeda(totais.saldo) + '</span></div>' +
      '</div>' +
      '</body></html>';
  }

  function abrirJanelaPdfFinanceiro(titulo, periodoLabel, registros) {
    var html = gerarJanelaImpressaoFinanceira(titulo, periodoLabel, registros);
    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      finToast('Seu navegador bloqueou a janela de impressão. Permita pop-ups.', 'warning');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = function () {
      win.focus();
      setTimeout(function () { win.print(); }, 300);
    };
  }

  function abrirModalDetalheDia(dia, registros) {
    var modalEl = document.getElementById('modalDetalheDia');
    if (!modalEl) return;
    var totais = calcularTotaisRegistros(registros);
    setText('modal-detalhe-dia-titulo', formatDateBR(dia) + ' · ' + getDiaSemanaCompleto(dia));
    setText('modal-detalhe-dia-entradas', formatarMoeda(totais.entradas));
    setText('modal-detalhe-dia-saidas', formatarMoeda(totais.saidas));
    setText('modal-detalhe-dia-empresa', formatarMoeda(totais.empresa));
    setText('modal-detalhe-dia-colaboradores', formatarMoeda(totais.colaboradores));
    setText('modal-detalhe-dia-saldo', formatarMoeda(totais.saldo));
    var body = document.getElementById('modal-detalhe-dia-body');
    if (body) {
      body.innerHTML = registros.map(function (r) {
        return '<tr><td>' + escapeHtml(r.descricao || '-') + '</td>' +
          '<td class="text-end">' + formatarMoeda(r.valor) + '</td>' +
          '<td class="text-end">' + formatarMoeda(r.valorColaborador) + '</td>' +
          '<td class="text-end">' + formatarMoeda(r.valorEmpresa) + '</td>' +
          '<td class="text-center">' + getStatusBadge(r.situacao) + '</td></tr>';
      }).join('');
    }
    var modalInst = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInst.show();
  }

  function getInfoTipoFinanceiro(registro) {
    var tipoNorm = (registro.tipo || '').toString().trim().toLowerCase();
    var ehReceita = tipoNorm === 'corrida' || tipoNorm === 'entrada';
    return {
      ehReceita: ehReceita,
      label: ehReceita ? 'Corrida' : 'Despesa',
      badgeClasse: ehReceita ? 'fin-badge-corrida' : 'fin-badge-despesa',
      valorClasse: ehReceita ? 'fin-valor-positivo' : 'fin-valor-negativo',
      sinal: ehReceita ? '+' : '−'
    };
  }

  function formatarValorComSinal(registro) {
    var tipoNormalizado = (registro.tipo || '').toString().trim().toLowerCase();
    var ehReceita = tipoNormalizado === 'corrida' || tipoNormalizado === 'entrada';
    var valor = parseFloat(registro.valor) || 0;

    return {
      sinal: ehReceita ? '+' : '−',
      cor: ehReceita ? '#bde7bf' : '#d5a5a5', // verde / vermelho
      classe: ehReceita ? 'text-success' : 'text-danger',
      textoFormatado: (ehReceita ? '+ ' : '− ') + formatarMoeda(valor)
    };
  }

  function carregarExtratosStorage() {
    try {
      var raw = localStorage.getItem(EXTRATO_STORAGE_KEY);
      if (!raw) return [];
      var lista = JSON.parse(raw);
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  }

  function salvarExtratoStorage(extrato) {
    try {
      var lista = carregarExtratosStorage();
      lista.unshift(extrato);
      if (lista.length > EXTRATO_MAX) lista = lista.slice(0, EXTRATO_MAX);
      localStorage.setItem(EXTRATO_STORAGE_KEY, JSON.stringify(lista));
      return true;
    } catch (e) { return false; }
  }

  function buscarExtratoStoragePorId(id) {
    return carregarExtratosStorage().find(function (e) { return e.id === id; }) || null;
  }

  function removerExtratoStorage(id) {
    try {
      var lista = carregarExtratosStorage().filter(function (e) { return e.id !== id; });
      localStorage.setItem(EXTRATO_STORAGE_KEY, JSON.stringify(lista));
      return true;
    } catch (e) { return false; }
  }

  function gerarNovoExtrato() {
    if (!els.extratoDataInicio || !els.extratoDataFim) return;
    var inicio = els.extratoDataInicio.value;
    var fim = els.extratoDataFim.value;
    if (!inicio || !fim) { finToast('Selecione o período.', 'warning'); return; }
    if (inicio > fim) { finToast('Data inicial maior que a final.', 'warning'); return; }

    var origemValue = els.extratoOrigem ? els.extratoOrigem.value : '__caixa__';
    var resultado = registrosPorOrigemExtrato(origemValue, inicio, fim);

    if (!resultado.registros.length) { finToast('Nenhum registro encontrado para essa origem no período.', 'warning'); return; }

    var periodoLabel = formatDateBR(inicio) + ' a ' + formatDateBR(fim);

    salvarExtratoStorage({
      id: gerarIdExtrato(),
      origem: resultado.label,
      periodoLabel: periodoLabel,
      registros: resultado.registros,
      criadoEm: Date.now()
    });
    renderizarListaExtratos();

    abrirJanelaPdfExtrato({ origem: resultado.label, periodoLabel: periodoLabel, registros: resultado.registros });
  }

  function dadosFiltradosExtratos() {
    var lista = carregarExtratosStorage();
    if (state.extrato.filtroDescricao) {
      var termo = removerAcentos(state.extrato.filtroDescricao.toLowerCase());
      lista = lista.filter(function (e) {
        var pool = removerAcentos((e.origem + ' ' + e.periodoLabel).toLowerCase());
        return pool.indexOf(termo) !== -1;
      });
    }
    return lista;
  }

  function renderizarListaExtratos() {
    if (!els.extratoListaDiaria) return;
    var lista = dadosFiltradosExtratos();
    if (!lista.length) {
      els.extratoListaDiaria.innerHTML = '<div class="extrato-placeholder"><i class="bi bi-file-earmark-text"></i><span>Nenhum extrato gerado ainda.<br>Selecione o período, a origem e clique em <strong>Gerar</strong>.</span></div>';
      return;
    }
    els.extratoListaDiaria.innerHTML = lista.map(function (ex) {
      var totais = calcularTotaisRegistros(ex.registros);
      var totalRegs = (ex.registros || []).length;
      var criadoLabel = ex.criadoEm ? new Date(ex.criadoEm).toLocaleString('pt-BR') : '-';
      var saldoColor = totais.saldo >= 0 ? '#198754' : '#dc3545';
      return '<div class="extrato-item-card" data-extrato-id="' + escapeHtml(ex.id) + '">' +
        '<div class="extrato-item-left"><div class="extrato-item-icon"><i class="bi bi-file-earmark-bar-graph"></i></div>' +
        '<div><div class="extrato-item-titulo">' + escapeHtml(ex.origem || '-') + '</div>' +
        '<div class="extrato-item-sub">' + escapeHtml(ex.periodoLabel || '-') + ' · ' + totalRegs + ' registro' + (totalRegs !== 1 ? 's' : '') + '</div>' +
        '<div class="extrato-item-sub" style="font-size:.68rem;opacity:.7;">' + criadoLabel + '</div></div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">' +
        '<span class="extrato-saldo-valor" data-valor-real="' + formatarMoeda(totais.saldo) + '" data-visivel="0" style="font-size:.72rem;font-weight:700;color:' + saldoColor + ';">R$ ****</span>' +
        '<div style="display:flex;gap:6px;">' +
        '<button class="btn-icone-retangular btn-toggle-valor-extrato" data-id="' + escapeHtml(ex.id) + '" title="Mostrar/ocultar valor"><i class="bi bi-eye-slash"></i></button>' +
        '<button class="btn-icone-retangular btn-visualizar-icone extrato-btn-ver" data-id="' + escapeHtml(ex.id) + '" title="Visualizar"><i class="bi bi-file-earmark-text"></i></button>' +
        '<button class="btn-icone-retangular btn-excluir-icone extrato-btn-excluir" data-id="' + escapeHtml(ex.id) + '" title="Remover"><i class="bi bi-trash"></i></button>' +
        '</div></div></div>';
    }).join('');

    // ✅ CORREÇÃO: bind dos botões (faltava isso)
    els.extratoListaDiaria.querySelectorAll('.extrato-btn-ver').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var ext = buscarExtratoStoragePorId(this.getAttribute('data-id'));
        if (ext) abrirExtratoModal(ext);
        else finToast('Extrato não encontrado.', 'warning');
      });
    });

    els.extratoListaDiaria.querySelectorAll('.extrato-btn-excluir').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = this.getAttribute('data-id');
        var ext = buscarExtratoStoragePorId(id);
        if (!ext) { finToast('Extrato não encontrado.', 'warning'); return; }

        abrirModalConfirmarExclusaoFin({
          titulo: 'Excluir extrato',
          mensagem: 'Tem certeza que deseja excluir este extrato salvo? Essa ação não pode ser desfeita.',
          subtitulo: ext.origem || '',
          onConfirmar: function () {
            var ok = removerExtratoStorage(id);
            if (ok) {
              finToast('Extrato removido com sucesso!', 'success');
              renderizarListaExtratos();
            } else {
              finToast('Erro ao remover extrato.', 'danger');
            }
          }
        });
      });
    });

    els.extratoListaDiaria.querySelectorAll('.btn-toggle-valor-extrato').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var card = this.closest('.extrato-item-card');
        var span = card ? card.querySelector('.extrato-saldo-valor') : null;
        if (!span) return;

        var visivel = span.getAttribute('data-visivel') === '1';
        var real = span.getAttribute('data-valor-real');

        span.textContent = visivel ? 'R$ ****' : real;
        span.setAttribute('data-visivel', visivel ? '0' : '1');

        var icon = this.querySelector('i');
        if (icon) icon.className = visivel ? 'bi bi-eye-slash' : 'bi bi-eye';
      });
    });
  }

  function renderBlocoDia(dia, registros) {
    var totaisDia = calcularTotaisRegistros(registros);
    var labelData = dia !== 'sem-data' ? formatDateBR(dia) : 'Sem data';
    var labelSemana = dia !== 'sem-data' ? getDiaSemanaCompleto(dia) : '';
    var saldoClasse = totaisDia.saldo > 0 ? 'positivo' : (totaisDia.saldo < 0 ? 'negativo' : 'neutro');

    return '<div class="caixa-dia-item" data-dia="' + escapeHtml(dia) + '">' +
      '<div class="caixa-dia-item-left" data-acao="abrir-dia" style="cursor:pointer;">' +
      '<div class="caixa-dia-icon" style="color:#198754;background:rgba(25,135,84,.12);"><i class="bi bi-cash-coin"></i></div>' +
      '<div><div class="caixa-dia-info-data">' + labelData + '</div>' +
      '<div class="caixa-dia-info-semana">' + labelSemana + ' · ' + registros.length + ' lanç.</div></div></div>' +
      '<div class="d-flex align-items-center gap-2">' +
      '<span class="caixa-dia-saldo ' + saldoClasse + '" data-acao="abrir-dia" style="cursor:pointer;">' +
      (state.caixaValoresVisiveis ? formatarMoeda(totaisDia.saldo) : 'R$ ****') + '</span>' +
      '<button type="button" class="btn-icone-retangular btn-visualizar-icone btn-visualizar-dia" data-dia="' + escapeHtml(dia) + '" title="Visualizar este dia"><i class="bi bi-eye"></i></button>' +
      '</div></div>';
  }

  function bindEventosDiaCaixa() {
    els.caixaListaDiaria.querySelectorAll('[data-acao="abrir-dia"]').forEach(function (el) {
      el.addEventListener('click', function () {
        var dia = this.closest('.caixa-dia-item').getAttribute('data-dia');
        var regsDoDia = (state.caixa.listaFiltradaAtual || []).filter(function (r) { return r.dataISO === dia; });
        abrirModalDetalheDia(dia, regsDoDia);
      });
    });

    els.caixaListaDiaria.querySelectorAll('.btn-visualizar-dia').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var dia = this.getAttribute('data-dia');
        var regsDoDia = (state.caixa.listaFiltradaAtual || []).filter(function (r) { return r.dataISO === dia; });
        abrirModalDetalheDia(dia, regsDoDia);
      });
    });
  }

  function atualizarPaginacaoCaixa(totalItens) {
    if (els.pagLabelCaixa) els.pagLabelCaixa.textContent = 'Pág ' + state.caixa.pagina + ' de ' + state.caixa.totalPag;
    if (els.pagInfoCaixa) els.pagInfoCaixa.textContent = totalItens + ' registro' + (totalItens !== 1 ? 's' : '');
    if (els.pagPrevCaixa) els.pagPrevCaixa.disabled = state.caixa.pagina <= 1;
    if (els.pagNextCaixa) els.pagNextCaixa.disabled = state.caixa.pagina >= state.caixa.totalPag;
  }

  function abrirExtratoModal(extrato) {
    if (!els.extratoModalOverlay || !els.extratoModalBody) {
      finToast('Componente de modal de extrato não encontrado na página.', 'danger');
      return;
    }

    var totais = calcularTotaisRegistros(extrato.registros);
    var blocos = agruparRegistrosPorData(extrato.registros);

    if (els.extratoModalTitulo) els.extratoModalTitulo.textContent = (extrato.origem || '-') + ' · ' + (extrato.periodoLabel || '-');

    var blocosHtml = blocos.map(function (bloco, idx) {
      var cor = corBlocoDataFin(idx);
      var totaisDia = calcularTotaisRegistros(bloco.registros);
      var labelData = bloco.dataISO !== 'sem-data' ? formatDateBR(bloco.dataISO) : 'Sem data';
      var labelSemana = bloco.dataISO !== 'sem-data' ? getDiaSemanaCompleto(bloco.dataISO) : '';

      var registrosOrdenados = bloco.registros.slice().sort(function (a, b) {
        var ha = a.hora || '';
        var hb = b.hora || '';
        return ha < hb ? -1 : (ha > hb ? 1 : 0);
      });

      var linhas = registrosOrdenados.map(function (r) {
        return montarLinhaExtratoHtml(r);
      }).join('');

      return '' +
        '<div style="background:' + cor.bg + ';border:1px solid ' + cor.borda + ';border-radius:12px;margin-bottom:10px;overflow:hidden;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-bottom:1px solid ' + cor.borda + ';">' +
        '<div><span style="font-size:.78rem;font-weight:700;color:#444;">' + labelData + '</span>' +
        '<span style="font-size:.66rem;color:#888;margin-left:6px;">' + labelSemana + '</span></div>' +
        '<span style="font-size:.74rem;font-weight:700;color:' + (totaisDia.saldo >= 0 ? '#198754' : '#dc3545') + ';">' + formatarMoeda(totaisDia.saldo) + '</span>' +
        '</div>' +
        '<div style="padding:4px 10px;">' + linhas + '</div>' +
        '</div>';
    }).join('');

    els.extratoModalBody.innerHTML = blocosHtml +
      '<div style="border-top:1px solid #eee;margin-top:6px;padding-top:8px;">' +
      '<div class="d-flex justify-content-between" style="font-size:.78rem;padding:3px 0;color:#666;"><span>Total Receitas:</span><span class="text-success fw-bold">' + formatarMoeda(totais.entradas) + '</span></div>' +
      '<div class="d-flex justify-content-between" style="font-size:.78rem;padding:3px 0;color:#666;"><span>Total Despesas:</span><span class="text-danger fw-bold">' + formatarMoeda(totais.saidas) + '</span></div>' +
      '<div class="d-flex justify-content-between pt-2 fw-bold" style="font-size:.85rem;border-top:1px dashed #ddd;margin-top:4px;"><span>Saldo:</span><span class="' + (totais.saldo >= 0 ? 'text-success' : 'text-danger') + '">' + formatarMoeda(totais.saldo) + '</span></div>' +
      '</div>';

    if (els.extratoModalCopiar) els.extratoModalCopiar.onclick = function () { copiarTextoClipboard(gerarTextoExtrato(extrato)); };
    if (els.extratoModalPdf) els.extratoModalPdf.onclick = function () { abrirJanelaPdfExtrato(extrato); };
    if (els.extratoModalFechar) els.extratoModalFechar.onclick = function () {
      els.extratoModalOverlay.style.display = 'none';
      document.querySelectorAll('.modal-backdrop').forEach(function (bd) { if (bd.parentNode) bd.parentNode.removeChild(bd); });
    };

    document.body.appendChild(els.extratoModalOverlay);
    els.extratoModalOverlay.style.display = 'flex';
  }

  function renderPeriodosSalvosCaixa() {
    var wrapper = document.getElementById('caixa-relatorios-salvos');
    var lista = document.getElementById('caixa-relatorios-salvos-lista');
    if (!wrapper || !lista) return;

    var periodos = carregarPeriodosCaixaStorage();
    if (!periodos.length) {
      wrapper.style.display = 'none';
      lista.innerHTML = '';
      return;
    }
    wrapper.style.display = 'block';

    lista.innerHTML = periodos.map(function (p) {
      var totais = calcularTotaisRegistros(p.registros);
      var totalRegs = (p.registros || []).length;
      var criadoLabel = p.criadoEm ? new Date(p.criadoEm).toLocaleString('pt-BR') : '-';
      var saldoColor = totais.saldo >= 0 ? '#198754' : '#dc3545';

      return '<div class="extrato-item-card" data-periodo-id="' + escapeHtml(p.id) + '" style="cursor:pointer;">' +
        '<div class="extrato-item-left">' +
        '<div class="extrato-item-icon" style="color:#8B5E3C;background:rgba(139,94,60,.12);"><i class="bi bi-wallet2"></i></div>' +
        '<div>' +
        '<div class="extrato-item-titulo">' + escapeHtml(p.periodoLabel || '-') + '</div>' +
        '<div class="extrato-item-sub">' + totalRegs + ' lançamento' + (totalRegs !== 1 ? 's' : '') + '</div>' +
        '<div class="extrato-item-sub" style="font-size:.68rem;opacity:.7;">' + criadoLabel + '</div>' +
        '</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">' +
        '<span style="font-size:.72rem;font-weight:700;color:' + saldoColor + ';">' + formatarMoeda(totais.saldo) + '</span>' +
        '<div style="display:flex;gap:6px;">' +
        '<button class="btn-icone-retangular btn-visualizar-icone periodo-caixa-btn-ver" data-id="' + escapeHtml(p.id) + '" title="Visualizar carteira" style="pointer-events:auto;"><i class="bi bi-eye"></i></button>' +
        '<button class="btn-icone-retangular btn-excluir-icone periodo-caixa-btn-excluir" data-id="' + escapeHtml(p.id) + '" title="Excluir carteira" style="pointer-events:auto;"><i class="bi bi-trash"></i></button>' +
        '</div>' +
        '</div></div>';
    }).join('');

    lista.querySelectorAll('.periodo-caixa-btn-ver').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var p = buscarPeriodoCaixaPorId(this.getAttribute('data-id'));
        if (p) abrirModalVisualizarPeriodoCaixa(p);
      });
    });

    lista.querySelectorAll('.periodo-caixa-btn-excluir').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var id = this.getAttribute('data-id');
        var p = buscarPeriodoCaixaPorId(id);
        if (!p) {
          finToast('Carteira não encontrada.', 'warning');
          return;
        }

        abrirModalAtencaoExclusaoCarteira(
          'Sua carteira "' + (p.periodoLabel || '') + '" será excluída. Isso remove apenas este relatório salvo localmente — nenhum dado do seu banco/lista será apagado.',
          function () {
            var ok = excluirPeriodoCaixaStorage(id);
            if (ok) {
              finToast('Carteira excluída com sucesso!', 'success');
            }
            renderPeriodosSalvosCaixa(); // sempre re-renderiza, ok ou não
          }
        );
      });
    });

    lista.querySelectorAll('.extrato-item-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('.btn-icone-retangular')) return;
        var p = buscarPeriodoCaixaPorId(this.getAttribute('data-periodo-id'));
        if (p) abrirModalVisualizarPeriodoCaixa(p);
      });
    });
  }

  function atualizarPreviewComissao() {
    var colabEl = document.getElementById('fin-colaborador-id') || document.getElementById('fin-colaborador');
    var valorEl = document.getElementById('fin-valor');
    var previewEl = document.getElementById('fin-preview-comissao');
    if (!colabEl || !previewEl) return;
    var colabId = colabEl.value;
    var colab = state.colaboradoresCache[colabId];
    var valor = valorEl ? parseValor(valorEl.value) : 0;
    if (!colab || !valor) { previewEl.innerHTML = ''; return; }
    var pct = parseFloat(colab.percentual_comissao) || 80;
    var valorColab = valor * (pct / 100);
    var valorEmpresa = valor - valorColab;
    previewEl.innerHTML = '<small class="text-muted">Colaborador (' + pct + '%): <strong>' + formatarMoeda(valorColab) + '</strong> · Empresa: <strong>' + formatarMoeda(valorEmpresa) + '</strong></small>';
  }

  function _limparModalsBackdropOrfaos() {
    document.querySelectorAll('.modal-backdrop').forEach(function (bd) {
      if (bd.parentNode) bd.parentNode.removeChild(bd);
    });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }

  function obterHoraRegistro(reg) {
    if (reg.idPedido && state.pedidosCache[reg.idPedido]) {
      var pedido = state.pedidosCache[reg.idPedido];
      return (pedido.horario || pedido.hora || '').toString().trim();
    }
    return '';
  }

  function gerarTituloResumido(reg) {
    var desc = (reg.descricao || reg.mercadoria || '').toLowerCase();
    var palavrasChave = ['cesta', 'sacola', 'bolsa', 'envelope', 'coleta', 'documento', 'encomenda'];
    var encontrada = '';
    for (var i = 0; i < palavrasChave.length; i++) {
      if (desc.indexOf(palavrasChave[i]) !== -1) { encontrada = palavrasChave[i]; break; }
    }
    var titulo = encontrada ? ('Entrega de ' + encontrada) : (reg.tipo === 'entrada' ? 'Receita' : 'Despesa');
    return titulo.charAt(0).toUpperCase() + titulo.slice(1);
  }

  function abrirModalVisualizar(reg) {
    var OLD_ID = 'modalViewFinDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var isEntrada = reg.tipo === 'entrada';
    var corHeader = isEntrada ? 'linear-gradient(135deg,#198754 0%,#146c43 100%)' : 'linear-gradient(135deg,#dc3545 0%,#c82333 100%)';
    var tipoLabel = isEntrada ? 'RECEITA' : 'DESPESA';
    var iconHeader = isEntrada ? 'bi-arrow-down-left' : 'bi-arrow-up-right';
    var hora = obterHoraRegistro(reg) || '-';
    var situacaoBadge = getStatusBadge(reg.situacao);
    var tipoTexto = isEntrada ? 'Receita' : 'Despesa';
    var valorFooterIcon = isEntrada ? 'bi-arrow-down-circle-fill' : 'bi-arrow-up-circle-fill';
    var valorFooterTitulo = isEntrada ? 'VALOR DA RECEITA' : 'VALOR DA DESPESA';
    var footerClasse = isEntrada ? 'fin-valor-footer-entrada' : 'fin-valor-footer-saida';
    var idExibicao = reg.idFinanceiro || reg.id || '';

    var pedidoHtml = reg.idPedido ? ('#' + escapeHtml(reg.idPedido)) : '-';
    var obsRowHtml = reg.observacao
      ? '<div class="fin-extrato-row">' +
      '<div class="fin-extrato-row-icon"><i class="bi bi-chat-left-text"></i></div>' +
      '<div class="fin-extrato-row-content"><div class="fin-extrato-row-label">Observação</div>' +
      '<div class="fin-extrato-row-value">' + escapeHtml(reg.observacao) + '</div></div></div>'
      : '';

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered modal-md">' +
      '<div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">' +

      '<div class="fin-extrato-header" style="background:' + corHeader + ';">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div class="fin-extrato-header-icon"><i class="bi ' + iconHeader + '"></i></div>' +
      '<div><div class="fin-extrato-tipo">' + tipoLabel + '</div>' +
      '<div class="fin-extrato-date">' + escapeHtml(reg.dataDisplay || '-') + '</div></div></div>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
      '</div></div>' +

      '<div class="modal-body p-0">' +

      '<div class="fin-extrato-status-bar">' +
      '<div>' + situacaoBadge + '</div>' +
      '<span class="fin-extrato-id">#' + escapeHtml(idExibicao) + '</span>' +
      '</div>' +
      '<div id="fin-view-erro-excluir" class="alert alert-danger d-none mx-3 mt-3 py-2 px-3" style="font-size:.74rem;border-radius:10px;"></div>' +

      '<div class="fin-extrato-body">' +

      '<div class="fin-view-valor-destaque ' + footerClasse + '">' +
      '<div class="fin-view-valor-destaque-label"><i class="bi ' + valorFooterIcon + '"></i><span>' + valorFooterTitulo + '</span></div>' +
      '<div class="fin-view-valor-destaque-valor">' + formatarMoeda(reg.valor) + '</div>' +
      '</div>' +

      '<div class="fin-extrato-section">' +
      '<div class="fin-extrato-section-title">Informações do Lançamento</div>' +
      '<div class="fin-view-grid-2x2">' +
      '<div class="fin-view-grid-item"><div class="fin-view-grid-label"><i class="bi bi-person"></i> Cliente</div><div class="fin-view-grid-value">' + escapeHtml(reg.cliente || '-') + '</div></div>' +
      '<div class="fin-view-grid-item"><div class="fin-view-grid-label"><i class="bi bi-person-badge"></i> Colaborador</div><div class="fin-view-grid-value">' + escapeHtml(reg.motoboy || '-') + '</div></div>' +
      '<div class="fin-view-grid-item"><div class="fin-view-grid-label"><i class="bi bi-arrow-down-up"></i> Tipo</div><div class="fin-view-grid-value">' + tipoTexto + '</div></div>' +
      '<div class="fin-view-grid-item"><div class="fin-view-grid-label"><i class="bi bi-circle-half"></i> Situação</div><div class="fin-view-grid-value">' + escapeHtml((reg.situacao || '-').charAt(0).toUpperCase() + (reg.situacao || '-').slice(1)) + '</div></div>' +
      '<div class="fin-view-grid-item"><div class="fin-view-grid-label"><i class="bi bi-clock"></i> Hora</div><div class="fin-view-grid-value">' + escapeHtml(hora) + '</div></div>' +
      '</div></div>' +

      '<div class="fin-extrato-divider"></div>' +

      '<div class="fin-extrato-section">' +
      '<div class="fin-extrato-section-title">Detalhes</div>' +
      '<div class="fin-extrato-row">' +
      '<div class="fin-extrato-row-icon"><i class="bi bi-file-text"></i></div>' +
      '<div class="fin-extrato-row-content"><div class="fin-extrato-row-label">Descrição</div>' +
      '<div class="fin-extrato-row-value">' + escapeHtml(reg.descricao || '-') + '</div></div></div>' +
      '<div class="fin-extrato-row">' +
      '<div class="fin-extrato-row-icon"><i class="bi bi-box-seam"></i></div>' +
      '<div class="fin-extrato-row-content"><div class="fin-extrato-row-label">Pedido Vinculado</div>' +
      '<div class="fin-extrato-row-value">' + pedidoHtml + '</div></div></div>' +
      obsRowHtml +
      '</div>' +

      '</div>' +

      '<div class="fin-extrato-footer fin-extrato-footer-actions">' +
      '<div class="fin-extrato-footer-line"><i class="bi bi-clock-history"></i><span>Atualizado agora</span></div>' +
      '<div class="d-flex gap-2">' +
      '<button type="button" class="fin-btn-cancelar-editar text-danger" id="fin-view-btn-excluir" data-id="' + escapeHtml(reg.id) + '"><i class="bi bi-trash3"></i><span>Excluir</span></button>' +
      '<button type="button" class="fin-btn-salvar-editar" id="fin-view-btn-editar"><i class="bi bi-pencil-square"></i><span>Editar</span></button>' +
      '<button type="button" class="fin-btn-cancelar-editar" data-bs-dismiss="modal">Fechar</button>' +
      '</div></div>' +

      '</div></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl);

    document.getElementById('fin-view-btn-editar').addEventListener('click', function () {
      modalInst.hide();
      setTimeout(function () { abrirModalEditar(reg); }, 250);
    });

    document.getElementById('fin-view-btn-excluir').addEventListener('click', function () {
      var id = this.getAttribute('data-id');
      var idPedido = reg.idPedido;
      var erroEl = document.getElementById('fin-view-erro-excluir');
      var btn = this;
      var btnHtmlOriginal = btn.innerHTML;

      if (!id) {
        erroEl.textContent = 'Não foi possível identificar o lançamento.';
        erroEl.classList.remove('d-none');
        return;
      }

      abrirModalConfirmarExclusaoFin({
        titulo: 'Excluir lançamento',
        mensagem: 'Tem certeza que deseja excluir este lançamento? Essa ação não pode ser desfeita.',
        subtitulo: reg.descricao ? resumirDescricao(reg.descricao, 40) : '',
        onConfirmar: function () {
          abrirModalSenhaMaster(function (senha) {
            window.API.call('validarSenhaMaster', { senha: senha }).then(function (resSenha) {
              var senhaOk = resSenha && (resSenha.status === 'success' || resSenha.valido === true);

              if (!senhaOk) {
                finToast('Senha incorreta. Exclusão cancelada.', 'danger');
                return;
              }

              btn.disabled = true;
              btn.innerHTML = '<i class="bi bi-search fin-loading-spin"></i>';
              erroEl.classList.add('d-none');

              // ✅ delpedido já cai em cascata para o chat — não chamar delchat separadamente
              Promise.allSettled([
                excluirRegistroDefinitivo(id),                                                          // [0] financeiro
                idPedido ? window.API.call('delpedido', { id: idPedido }) : Promise.resolve({ status: 'success' }) // [1] pedido + chat (cascata no backend)
              ]).then(function (resultados) {
                var finRes = resultados[0], pedidoRes = resultados[1];

                var finOk = finRes.status === 'fulfilled';
                var pedidoOk = pedidoRes.status === 'fulfilled';

                if (finOk && pedidoOk) {
                  finToast('Lançamento excluído com sucesso do financeiro, pedidos e chat!', 'success');
                  modalInst.hide();

                  if (typeof window.EventBus !== 'undefined') {
                    window.EventBus.emit('pedido:excluido', { id: idPedido });
                    window.EventBus.emit('financeiro:excluido', { id: id });
                  }
                } else {
                  var falhas = [];
                  if (!finOk) falhas.push('financeiro (' + (finRes.reason && finRes.reason.message || finRes.reason) + ')');
                  if (!pedidoOk) falhas.push('pedidos/chat (' + (pedidoRes.reason && pedidoRes.reason.message || pedidoRes.reason) + ')');

                  console.error('[exclusao em cascata] Falhas detalhadas:', { finRes, pedidoRes });
                  erroEl.textContent = 'Falha ao excluir: ' + falhas.join('; ') + '. Verifique manualmente.';
                  erroEl.classList.remove('d-none');
                  btn.disabled = false;
                  btn.innerHTML = btnHtmlOriginal;

                  if (finOk && typeof window.EventBus !== 'undefined') {
                    window.EventBus.emit('financeiro:excluido', { id: id });
                  }
                }
              });
            }).catch(function (err) {
              console.error('[validarSenhaMaster]', err);
              finToast('Erro ao validar senha.', 'danger');
            });
          });
        }
      });
    });

    modalEl.addEventListener('hidden.bs.modal', function () { modalInst.dispose(); if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); });
    modalInst.show();
  }

  function resumirDescricao(desc, limiteChars) {
    if (!desc) return '-';
    if (limiteChars) {
      desc = desc.trim();
      return desc.length > limiteChars ? desc.slice(0, limiteChars).trim() + '…' : desc;
    }
    var preposicoes = ['de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'para', 'pra', 'com', 'a', 'o', 'e'];
    var palavras = desc.trim().split(/\s+/);
    if (palavras.length <= 2) return desc;

    var resultado = [palavras[0]];
    var idx = 1;

    if (preposicoes.indexOf(palavras[1].toLowerCase()) !== -1 && palavras.length > 2) {
      resultado.push(palavras[1]);
      resultado.push(palavras[2]);
      idx = 3;
    } else {
      resultado.push(palavras[1]);
      idx = 2;
    }

    if (idx < palavras.length) {
      return resultado.join(' ') + '...';
    }
    return resultado.join(' ');
  }

  function abrirModalSenhaMaster(onConfirmar) {
    var OLD_ID = 'modalSenhaMasterDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered" style="max-width:380px;">' +
      '<div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden">' +
      '<div style="background:linear-gradient(135deg,#dc3545 0%,#b02a37 100%);padding:20px 24px 16px;">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
      '<i class="bi bi-shield-lock-fill" style="font-size:1.1rem;color:#fff;"></i></div>' +
      '<div><h6 class="fw-bold mb-0 text-white" style="font-size:.9rem;">Confirmação Necessária</h6>' +
      '<small style="color:rgba(255,255,255,.75);font-size:.72rem;">Digite a senha master para continuar</small></div></div></div>' +
      '<div class="modal-body px-4 py-4">' +
      '<div id="senha-master-erro" class="alert alert-danger d-none py-2 px-3 mb-3" style="font-size:.74rem;border-radius:10px;"></div>' +
      '<label class="fin-field-label">Senha Master</label>' +
      '<div style="position:relative;">' +
      '<input type="password" id="senha-master-input" class="form-control form-control-sm rounded-pill fin-field-input" placeholder="••••••••" autocomplete="off" style="padding-right:38px;">' +
      '<button type="button" id="senha-master-toggle-olho" tabindex="-1" style="position:absolute;top:50%;right:12px;transform:translateY(-50%);background:none;border:none;padding:0;color:#888;cursor:pointer;font-size:.95rem;line-height:1;">' +
      '<i class="bi bi-eye-slash"></i></button>' +
      '</div>' +
      '</div>' +
      '<div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex justify-content-end">' +
      '<button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;">' +
      '<i class="bi bi-x-lg me-1"></i>Cancelar</button>' +
      '<button type="button" class="btn btn-danger rounded-pill px-4" id="senha-master-btn-confirmar" style="font-size:.78rem;height:38px;font-weight:600;">' +
      '<i class="bi bi-check-lg me-1"></i>Confirmar</button>' +
      '</div></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl, { backdrop: 'static' });
    var input = document.getElementById('senha-master-input');
    var erroEl = document.getElementById('senha-master-erro');
    var btnConfirmar = document.getElementById('senha-master-btn-confirmar');
    var btnToggleOlho = document.getElementById('senha-master-toggle-olho');

    btnConfirmar.addEventListener('click', function () {
      var senha = input.value.trim();
      if (!senha) {
        erroEl.textContent = 'Informe a senha.';
        erroEl.classList.remove('d-none');
        return;
      }
      erroEl.classList.add('d-none');
      modalInst.hide();
      onConfirmar(senha);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') btnConfirmar.click();
    });

    btnToggleOlho.addEventListener('click', function () {
      var visivel = input.type === 'text';
      input.type = visivel ? 'password' : 'text';
      this.querySelector('i').className = visivel ? 'bi bi-eye-slash' : 'bi bi-eye';
    });

    modalEl.addEventListener('hidden.bs.modal', function () {
      modalInst.dispose();
      if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    });

    modalInst.show();
    setTimeout(function () { input.focus(); }, 300);
  }

  function bindSortDataTodos() {
    var th = els.btnSortData ? els.btnSortData.closest('th') : null;

    function executarOrdenacao(e) {
      if (e) e.stopPropagation();
      state.sortDataDesc = !state.sortDataDesc;
      if (els.iconSortData) els.iconSortData.className = state.sortDataDesc ? 'bi bi-arrow-down' : 'bi bi-arrow-up';
      state.todos.pagina = 1;
      renderTodos();
    }

    if (els.btnSortData && !els.btnSortData._sortBound) {
      els.btnSortData._sortBound = true;
      els.btnSortData.addEventListener('click', executarOrdenacao);
    }

    if (els.iconSortData && !els.iconSortData._sortBound) {
      els.iconSortData._sortBound = true;
      els.iconSortData.addEventListener('click', executarOrdenacao);
    }

    if (th && !th._sortBound) {
      th._sortBound = true;
      th.style.cursor = 'pointer';
      th.addEventListener('click', executarOrdenacao);
    }
  }

  function formatarDescricaoMobile(desc) {
    if (!desc) return '-';
    var isMobile = window.innerWidth <= 576;
    if (!isMobile) return escapeHtml(resumirDescricao(desc, 22));
    var palavras = String(desc).trim().split(/\s+/);
    var resumo = palavras.slice(0, 3).join(' ');
    if (palavras.length > 3) resumo += '...';
    return escapeHtml(resumo);
  }

  function bindNotifCardsFin() {
    document.querySelectorAll('.caixa-mini-card').forEach(function (c) {
      c.classList.remove('active');
    });

    var cards = document.querySelectorAll('#fin-tab-content-todos .caixa-mini-card[data-filtro-situacao]');
    if (!cards.length) return;

    cards.forEach(function (card) {
      if (card._finBound) return;
      card._finBound = true;
      card.addEventListener('click', function () {
        state.filtroTipo = this.getAttribute('data-filtro-tipo') || 'todos';
        state.filtroSituacao = this.getAttribute('data-filtro-situacao') || 'todos';
        state.todos.pagina = 1;
        atualizarCardAtivoFin();
        renderTodos();
      });
    });

    // ✅ Corrigido: mostra TODOS os registros por padrão ao carregar a tela
    state.filtroTipo = 'todos';
    state.filtroSituacao = 'todos';
    atualizarCardAtivoFin();
  }

  function atualizarCardAtivoFin() {
    document.querySelectorAll('.caixa-mini-card').forEach(function (c) {
      c.classList.remove('active');
    });
    if (state.filtroSituacao === 'todos') return; // nenhum card fica marcado quando é "todos"

    var cards = document.querySelectorAll('#fin-tab-content-todos .caixa-mini-card[data-filtro-situacao]');
    cards.forEach(function (card) {
      var s = card.getAttribute('data-filtro-situacao');
      if (state.filtroSituacao === s) {
        card.classList.add('active');
      }
    });
  }

  function abrirModalNovo() {
    var OLD_ID = 'modalNovoFinDyn';
    var old = document.getElementById(OLD_ID);
    if (old) { var oi = bootstrap.Modal.getInstance(old); if (oi) oi.dispose(); old.remove(); }

    var opcoesColab = state.colaboradores.map(function (c) {
      return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.username) + '</option>';
    }).join('');

    var html =
      '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered modal-md">' +
      '<div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">' +

      '<div class="fin-extrato-header" style="background:linear-gradient(135deg,#dc3545 0%,#c82333 100%);">' +
      '<div class="d-flex align-items-center justify-content-between">' +
      '<div class="d-flex align-items-center gap-3">' +
      '<div class="fin-extrato-header-icon"><i class="bi bi-plus-lg"></i></div>' +
      '<div><div class="fin-extrato-tipo">NOVO LANÇAMENTO</div>' +
      '<div class="fin-extrato-date">Preencha os dados abaixo</div></div></div>' +
      '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
      '</div></div>' +

      '<div class="modal-body p-0">' +

      '<div class="fin-extrato-status-bar">' +
      '<div>' + getStatusBadge('pendente') + '</div>' +
      '<span class="fin-extrato-id">NOVO</span>' +
      '</div>' +

      '<div id="fin-novo-erro" class="alert alert-danger d-none mx-3 mt-3 py-2 px-3" style="font-size:.74rem;border-radius:10px;"></div>' +

      '<div class="fin-extrato-body">' +

      '<div class="fin-view-valor-destaque fin-valor-footer-entrada">' +
      '<div class="fin-view-valor-destaque-label"><i class="bi bi-cash-coin"></i><span>VALOR DO LANÇAMENTO</span></div>' +
      '<input type="text" id="fin-valor" class="fin-edit-valor-input" placeholder="0,00" inputmode="decimal">' +
      '</div>' +

      '<div class="fin-extrato-section">' +
      '<div class="fin-extrato-section-title">Informações do Lançamento</div>' +
      '<div class="fin-view-grid-2x2">' +

      '<div class="fin-view-grid-item">' +
      '<div class="fin-view-grid-label"><i class="bi bi-calendar3"></i> Data</div>' +
      '<input type="date" id="fin-data" class="form-control form-control-sm fin-edit-input" value="' + toISO(new Date()) + '">' +
      '</div>' +

      '<div class="fin-view-grid-item">' +
      '<div class="fin-view-grid-label"><i class="bi bi-person-badge"></i> Colaborador</div>' +
      '<select id="fin-colaborador-id" class="form-select form-select-sm fin-edit-input"><option value="">Nenhum</option>' + opcoesColab + '</select>' +
      '</div>' +

      '<div class="fin-view-grid-item">' +
      '<div class="fin-view-grid-label"><i class="bi bi-arrow-down-up"></i> Tipo</div>' +
      '<select id="fin-tipo" class="form-select form-select-sm fin-edit-input">' +
      '<option value="entrada">Receita</option>' +
      '<option value="saida">Despesa</option>' +
      '</select></div>' +

      '<div class="fin-view-grid-item">' +
      '<div class="fin-view-grid-label"><i class="bi bi-circle-half"></i> Situação</div>' +
      '<select id="fin-situacao" class="form-select form-select-sm fin-edit-input">' +
      '<option value="pendente">Pendente</option>' +
      '<option value="pago">Pago</option>' +
      '<option value="recebido">Recebido</option>' +
      '<option value="cancelado">Cancelado</option>' +
      '</select></div>' +

      '</div></div>' +

      '<div class="fin-extrato-divider"></div>' +

      '<div class="fin-extrato-section">' +
      '<div class="fin-extrato-section-title">Detalhes</div>' +

      '<div class="fin-extrato-row fin-extrato-row-vertical">' +
      '<div class="fin-extrato-row-label"><i class="bi bi-file-text"></i> Descrição</div>' +
      '<input type="text" id="fin-descricao" class="form-control form-control-sm fin-edit-input" placeholder="Ex: Entrega #123">' +
      '</div>' +

      '<div id="fin-preview-comissao" class="mb-2" style="font-size:.72rem;"></div>' +

      '<div class="fin-extrato-row fin-extrato-row-vertical">' +
      '<div class="fin-extrato-row-label"><i class="bi bi-chat-left-text"></i> Observação</div>' +
      '<textarea id="fin-observacao" class="form-control form-control-sm fin-edit-input" rows="2" placeholder="Observações opcionais..."></textarea>' +
      '</div>' +

      '</div>' +
      '</div>' +

      '</div>' +

      '<div class="fin-extrato-footer fin-extrato-footer-actions">' +
      '<button type="button" class="fin-btn-cancelar-editar" id="fin-btn-cancelar-novo" data-bs-dismiss="modal">Cancelar</button>' +
      '<button type="button" class="fin-btn-salvar-editar" id="btn-salvar-novo-fin">' +
      '<i class="bi bi-check-lg" id="fin-btn-salvar-novo-icon"></i><span id="fin-btn-salvar-novo-texto">Salvar</span>' +
      '</button>' +
      '</div>' +

      '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modalEl = document.getElementById(OLD_ID);
    var modalInst = new bootstrap.Modal(modalEl, { backdrop: 'static' });

    mascaraValor(document.getElementById('fin-valor'));
    document.getElementById('fin-colaborador-id').addEventListener('change', atualizarPreviewComissao);
    document.getElementById('fin-valor').addEventListener('input', atualizarPreviewComissao);
    document.getElementById('btn-salvar-novo-fin').addEventListener('click', function () { salvarLancamento(modalInst, modalEl); });

    modalEl.addEventListener('hidden.bs.modal', function () { modalInst.dispose(); if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl); });
    modalInst.show();
  }

  function salvarLancamento(modalInst, modalEl) {
    var erroEl = document.getElementById('fin-novo-erro');
    var tipo = document.getElementById('fin-tipo').value;
    var data = document.getElementById('fin-data').value;
    var descricao = document.getElementById('fin-descricao').value.trim();
    var valorStr = document.getElementById('fin-valor').value.trim();
    var colaboradorId = document.getElementById('fin-colaborador-id').value;
    var situacao = document.getElementById('fin-situacao').value;
    var observacao = document.getElementById('fin-observacao').value.trim();
    var btnTexto = document.getElementById('fin-btn-salvar-novo-texto');
    var btnIcon = document.getElementById('fin-btn-salvar-novo-icon');
    var btn = document.getElementById('btn-salvar-novo-fin');

    erroEl.classList.add('d-none');
    if (!tipo) { erroEl.textContent = 'Selecione o tipo.'; erroEl.classList.remove('d-none'); return; }
    if (!data) { erroEl.textContent = 'Informe a data.'; erroEl.classList.remove('d-none'); return; }
    if (!descricao) { erroEl.textContent = 'Informe a descrição.'; erroEl.classList.remove('d-none'); return; }
    var valorNum = parseValor(valorStr);
    if (valorNum <= 0) { erroEl.textContent = 'Informe um valor válido.'; erroEl.classList.remove('d-none'); return; }

    var motoboy = '';
    if (colaboradorId && state.colaboradoresCache[colaboradorId]) motoboy = state.colaboradoresCache[colaboradorId].username || '';

    btn.disabled = true;
    btnIcon.className = 'bi bi-arrow-repeat fin-spin-icon';
    btnTexto.textContent = 'Salvando...';

    window.API.call('addfinanceiro', {
      tipo: tipo,
      data: data,
      descricao: descricao,
      vlr_servico: valorNum,
      situacao: situacao,
      colaborador: motoboy,
      colaborador_id: colaboradorId,
      observacao: observacao
    }).then(function (res) {
      if (isRespostaSucesso(res)) {
        finToast('Lançamento salvo!', 'success');
        if (modalInst) modalInst.hide();
        carregarDados();
        aplicarMascaraValores();
      } else {
        erroEl.textContent = 'Erro: ' + ((res && (res.message || res.msg)) || 'Tente novamente.');
        erroEl.classList.remove('d-none');
      }
    }).catch(function () {
      erroEl.textContent = 'Falha na comunicação com o servidor.';
      erroEl.classList.remove('d-none');
    }).finally(function () {
      btn.disabled = false;
      btnIcon.className = 'bi bi-check-lg';
      btnTexto.textContent = 'Salvar';
    });
  }

  function identificarFantasmasPeriodo() {
    var padraoPeriodo = /^\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4}$/;
    return state.cache.filter(function (r) {
      return padraoPeriodo.test((r.descricao || '').trim());
    });
  }

  function abrirModalAtencaoExclusaoCarteira(mensagem, onConfirmar) {
    var overlay = document.getElementById('modal-confirmar-exclusao-carteira');
    var texto = document.getElementById('modal-atencao-texto-carteira');
    var btnConfirmar = document.getElementById('btn-confirmar-exclusao-carteira');
    var btnCancelar = document.getElementById('btn-cancelar-exclusao-carteira');

    if (!overlay || !texto || !btnConfirmar || !btnCancelar) {
      var ok = window.confirm(mensagem);
      if (ok) onConfirmar();
      return;
    }

    texto.textContent = mensagem;
    overlay.style.display = 'flex';

    function fechar() {
      overlay.style.display = 'none';
      btnConfirmar.removeEventListener('click', confirmarHandler);
      btnCancelar.removeEventListener('click', fechar);
    }
    function confirmarHandler() {
      fechar();
      onConfirmar();
    }

    btnConfirmar.addEventListener('click', confirmarHandler);
    btnCancelar.addEventListener('click', fechar);
  }

  function excluirLancamentoFinanceiro(id) {
    return window.API.call('delfinanceiro', { id: id }).then(function (res) {
      console.log('Resposta da exclusão para ID', id, ':', res);
      return res;
    });
  }

  function limparLancamentosFantasmasPeriodo() {
    var fantasmas = identificarFantasmasPeriodo();

    if (!fantasmas.length) {
      finToast('Nenhum lançamento fantasma encontrado.', 'info');
      return;
    }

    var confirmar = window.confirm(
      'Foram encontrados ' + fantasmas.length + ' lançamento(s) fantasma(s).\n' +
      'Deseja excluí-los permanentemente do banco de dados?'
    );
    if (!confirmar) return;

    finToast('Excluindo ' + fantasmas.length + ' lançamento(s)...', 'info');

    var promessas = fantasmas.map(function (r) {
      return excluirLancamentoFinanceiro(r.id).then(function (res) {
        return { id: r.id, ok: isRespostaSucesso(res), res: res };
      }).catch(function (err) {
        return { id: r.id, ok: false, erro: err };
      });
    });

    Promise.all(promessas).then(function (resultados) {
      var sucesso = resultados.filter(function (r) { return r.ok; }).length;
      var falhas = resultados.length - sucesso;

      if (sucesso > 0) {
        finToast(sucesso + ' lançamento(s) excluído(s) com sucesso!', 'success');
      }
      if (falhas > 0) {
        finToast(falhas + ' lançamento(s) não puderam ser excluídos.', 'warning');
        console.error('Falhas na exclusão de fantasmas:', resultados.filter(function (r) { return !r.ok; }));
      }
      carregarDados();
    });
  }

  window.limparLancamentosFantasmasPeriodo = limparLancamentosFantasmasPeriodo;

  function registrosPorOrigemExtrato(origemValue, inicio, fim) {
    var lista = state.cache.filter(function (r) { return r.dataISO >= inicio && r.dataISO <= fim; });

    if (!origemValue || origemValue === '__caixa__') {
      return { registros: lista, label: 'Caixa Geral' };
    }

    var partes = origemValue.split('::');
    var tipoOrigem = partes[0];
    var valorOrigem = partes[1] || '';

    if (tipoOrigem === 'motoboy') {
      var filtradosMoto = lista.filter(function (r) { return r.motoboy === valorOrigem; });
      return { registros: filtradosMoto, label: valorOrigem };
    }

    if (tipoOrigem === 'cliente') {
      var filtradosCliente = lista.filter(function (r) { return r.cliente === valorOrigem; });
      return { registros: filtradosCliente, label: valorOrigem };
    }

    return { registros: lista, label: 'Caixa Geral' };
  }

  function gerarHtmlExtratoSimples(titulo, periodoLabel, registros) {
    var ordenados = (registros || []).slice().sort(function (a, b) {
      return a.dataISO < b.dataISO ? 1 : -1;
    });

    var totalValor = 0;
    var linhasHtml = ordenados.length ? ordenados.map(function (r) {
      totalValor += (parseFloat(r.valor) || 0);
      return '<tr>' +
        '<td>' + escapeHtml(r.dataDisplay || '-') + '</td>' +
        '<td>' + escapeHtml(r.motoboy || '-') + '</td>' +
        '<td title="' + escapeHtml(r.descricao || '') + '">' + escapeHtml(resumirDescricao(r.descricao)) + '</td>' +
        '<td style="text-align:right;">' + formatarMoeda(r.valor) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="4" style="text-align:center;padding:20px;color:#888;">Nenhum lançamento neste período.</td></tr>';

    var agora = new Date().toLocaleString('pt-BR');
    var qtd = ordenados.length;

    return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>' + escapeHtml(titulo) + '</title>' +
      '<style>' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }' +
      'body{font-family:"Segoe UI",Arial,Helvetica,sans-serif;font-weight:400;margin:24px;color:#333;-webkit-font-smoothing:antialiased;}' +
      'h1{font-size:15px;margin:0 0 2px;font-weight:400;color:#444;}' +
      'h1 span{color:#dc3545;}' +
      '.sub{font-size:11px;color:#888;margin-bottom:18px;}' +
      'table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:10px;}' +
      'thead th{text-align:left;padding:6px 4px;border-bottom:1px solid #ddd;font-size:10.5px;font-weight:400;color:#999;text-transform:uppercase;letter-spacing:.3px;}' +
      'thead th.col-valor{text-align:right;}' +
      'tbody td{padding:8px 4px;border-bottom:1px solid #eee;font-weight:400;white-space:nowrap;}' +
      'tbody tr:last-child td{border-bottom:none;}' +
      'td:nth-child(2){color:#555;width:130px;}' +
      'td:nth-child(3){color:#555;max-width:240px;overflow:hidden;text-overflow:ellipsis;}' +
      'td:nth-child(1){color:#999;font-size:10.5px;width:80px;}' +
      'td:nth-child(4){text-align:right;width:100px;}' +
      'tfoot td{padding:10px 4px;font-weight:400;border-top:1px solid #ddd;font-size:13px;color:#333;}' +
      'footer{margin-top:24px;font-size:10px;color:#aaa;text-align:right;}' +
      '.btn-imprimir-extrato{position:fixed;top:16px;right:16px;background:#dc3545;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:12px;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.15);z-index:999;}' +
      '.btn-imprimir-extrato:hover{background:#c82333;}' +
      '@media print{ body{margin:10mm;} .btn-imprimir-extrato{display:none;} }' +
      '</style></head><body>' +
      '<button type="button" class="btn-imprimir-extrato" onclick="window.print()"><i class="bi bi-printer-fill"></i> Imprimir / Salvar PDF</button>' +
      '<h1><span>RDO</span> Express - Extrato</h1>' +
      '<div class="sub">' + escapeHtml(titulo) + ' &middot; Período: ' + escapeHtml(periodoLabel || '-') + ' &middot; Gerado em ' + agora + '</div>' +
      '<table><thead><tr><th>Data</th><th>Colaborador</th><th>Descrição</th><th class="col-valor">Valor</th></tr></thead>' +
      '<tbody>' + linhasHtml + '</tbody>' +
      '<tfoot><tr><td colspan="3">Total de lançamentos: ' + qtd + '</td><td style="text-align:right;">' + formatarMoeda(totalValor) + '</td></tr></tfoot>' +
      '</table>' +
      '<footer>RDO Express &middot; Relatório gerado automaticamente</footer>' +
      '</body></html>';
  }

  function abrirJanelaPdfExtratoSimples(titulo, periodoLabel, registros) {
    var html = gerarHtmlExtratoSimples(titulo, periodoLabel, registros);
    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { finToast('Seu navegador bloqueou a janela de impressão. Permita pop-ups.', 'warning'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = function () { win.focus(); };
  }

  function baixarHtmlExtrato(titulo, periodoLabel, registros) {
    var html = gerarHtmlExtratoSimples(titulo, periodoLabel, registros);
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (titulo || 'extrato').replace(/[^\w\-]+/g, '_') + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    finToast('Arquivo baixado! Abra-o e use Ctrl+P para gerar o PDF.', 'success');
  }

  function preencherOrigensExtrato() {
    var selectMotoboys = document.getElementById('extrato-opt-motoboys');
    var selectClientes = document.getElementById('extrato-opt-clientes');
    if (!selectMotoboys || !selectClientes) return;

    var nomesMotoboys = {};
    state.cache.forEach(function (r) {
      if (r.motoboy && r.motoboy !== '-') nomesMotoboys[r.motoboy] = true;
    });
    var listaMotoboys = Object.keys(nomesMotoboys).sort(function (a, b) { return a.localeCompare(b); });
    selectMotoboys.innerHTML = listaMotoboys.map(function (nome) {
      return '<option value="motoboy::' + escapeHtml(nome) + '">' + escapeHtml(nome) + '</option>';
    }).join('');

    var nomesClientes = {};
    state.cache.forEach(function (r) {
      if (r.cliente && r.cliente !== '-') nomesClientes[r.cliente] = true;
    });
    var listaClientes = Object.keys(nomesClientes).sort(function (a, b) { return a.localeCompare(b); });
    selectClientes.innerHTML = listaClientes.map(function (nome) {
      return '<option value="cliente::' + escapeHtml(nome) + '">' + escapeHtml(nome) + '</option>';
    }).join('');
  }

  function carregarDados() {
    if (state.fetching) return;
    state.fetching = true;
    spinOn();
    _mostrarLoadingFin();

    Promise.all([
      window.API.call('listfinanceiro', {}),
      window.API.call('listpedidos', {}),
      window.API.call('listclientes', {}),
      window.API.call('listcolaboradores', {})
    ]).then(function (results) {
      var financeiro = extrairArray(results[0]);
      var pedidos = extrairArray(results[1]);
      var clientes = extrairArray(results[2]);
      var colaboradores = extrairArray(results[3]);

      state.pedidosCache = {};
      pedidos.forEach(function (p) { if (p.id) state.pedidosCache[p.id] = p; });

      state.clientesCache = {};
      clientes.forEach(function (c) { if (c.id) state.clientesCache[c.id] = c; });

      state.colaboradoresCache = {};
      state.colaboradores = colaboradores;
      colaboradores.forEach(function (c) { if (c.id) state.colaboradoresCache[c.id] = c; });

      state.gruposCache = {};

      state.cache = financeiro.map(normalizarRegistro);
      resolverClienteSolicitante();
      preencherOrigensExtrato();

      _atualizarContadoresFin();
      renderTodos();
      renderRdoContadores();
      renderCaixa();
      renderizarListaExtratos();
      tentarAbrirPedidoFinanceiro();

    }).catch(function (err) {
      console.error('[fin.js] Erro ao carregar dados do financeiro:', err);
      finToast('Erro ao carregar dados financeiros: ' + (err && err.message ? err.message : 'Erro desconhecido.'), 'danger');
    }).finally(function () {
      state.fetching = false;
      spinOff();
      _esconderLoadingFin();
    });
  }

  function initExtratoFluxo() {
    var overlay = document.getElementById('extrato-fluxo-overlay');
    var btnAbrir = document.getElementById('btn-abrir-fluxo-extrato');
    if (!overlay || !btnAbrir || btnAbrir._bound) return;
    btnAbrir._bound = true;

    var titulo = document.getElementById('extrato-fluxo-titulo');
    var btnVoltar = document.getElementById('extrato-fluxo-voltar');
    var btnFechar = document.getElementById('extrato-fluxo-fechar');
    var etapaTipo = document.getElementById('extrato-etapa-tipo');
    var etapaLista = document.getElementById('extrato-etapa-lista');
    var etapaPeriodo = document.getElementById('extrato-etapa-periodo');
    var listaSelecao = document.getElementById('extrato-lista-selecao');
    var buscaLista = document.getElementById('extrato-busca-lista');
    var selecionarTodos = document.getElementById('extrato-selecionar-todos');
    var btnContinuarLista = document.getElementById('btn-extrato-continuar-lista');
    var btnGerarFinal = document.getElementById('btn-extrato-gerar-final');

    var fluxo = { tipo: null, selecionados: [], etapa: 'tipo' };

    function abrirOverlay() {
      fluxo = { tipo: null, selecionados: [], etapa: 'tipo' };
      var inputIni = document.getElementById('extrato-fluxo-data-inicio');
      var inputFim = document.getElementById('extrato-fluxo-data-fim');
      if (inputIni) inputIni.value = '';
      if (inputFim) inputFim.value = '';
      if (buscaLista) buscaLista.value = '';
      if (selecionarTodos) selecionarTodos.checked = false;
      mostrarEtapa('tipo');
      overlay.style.display = 'flex';
    }

    function fecharOverlay() { overlay.style.display = 'none'; }

    function mostrarEtapa(nome) {
      [etapaTipo, etapaLista, etapaPeriodo].forEach(function (e) { if (e) e.style.display = 'none'; });
      fluxo.etapa = nome;
      if (nome === 'tipo') {
        titulo.textContent = 'Gerar Extrato';
        btnVoltar.style.display = 'none';
        etapaTipo.style.display = 'block';
      }
      if (nome === 'lista') {
        titulo.textContent = fluxo.tipo === 'colaboradores' ? 'Selecionar Colaboradores' : 'Selecionar Clientes';
        btnVoltar.style.display = 'inline-flex';
        etapaLista.style.display = 'block';
        renderListaSelecao();
      }
      if (nome === 'periodo') {
        titulo.textContent = 'Período do Extrato';
        btnVoltar.style.display = 'inline-flex';
        etapaPeriodo.style.display = 'block';
      }
    }

    function obterNomesUnicos(campo) {
      var nomes = {};
      (state.cache || []).forEach(function (r) {
        var v = r[campo];
        if (v && v !== '-') nomes[v] = true;
      });
      return Object.keys(nomes).sort(function (a, b) { return a.localeCompare(b); });
    }

    function renderListaSelecao(filtro) {
      var campo = fluxo.tipo === 'colaboradores' ? 'motoboy' : 'cliente';
      var nomes = obterNomesUnicos(campo);
      if (filtro) {
        var f = filtro.toLowerCase();
        nomes = nomes.filter(function (n) { return n.toLowerCase().indexOf(f) !== -1; });
      }
      if (!nomes.length) {
        listaSelecao.innerHTML = '<div class="text-center text-muted py-4" style="font-size:.78rem;">Nenhum registro encontrado.</div>';
        return;
      }
      listaSelecao.innerHTML = nomes.map(function (n) {
        var checked = fluxo.selecionados.indexOf(n) !== -1 ? 'checked' : '';
        return '<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #eee;border-radius:10px;font-size:.78rem;cursor:pointer;">' +
          '<input type="checkbox" class="extrato-check-item" value="' + escapeHtml(n) + '" ' + checked + '>' +
          '<span>' + escapeHtml(n) + '</span></label>';
      }).join('');
      listaSelecao.querySelectorAll('.extrato-check-item').forEach(function (chk) {
        chk.addEventListener('change', function () {
          var v = this.value;
          if (this.checked) {
            if (fluxo.selecionados.indexOf(v) === -1) fluxo.selecionados.push(v);
          } else {
            fluxo.selecionados = fluxo.selecionados.filter(function (x) { return x !== v; });
          }
          btnContinuarLista.disabled = fluxo.selecionados.length === 0;
        });
      });
      btnContinuarLista.disabled = fluxo.selecionados.length === 0;
    }

    if (buscaLista) buscaLista.addEventListener('input', function () { renderListaSelecao(this.value); });

    if (selecionarTodos) selecionarTodos.addEventListener('change', function () {
      var campo = fluxo.tipo === 'colaboradores' ? 'motoboy' : 'cliente';
      fluxo.selecionados = this.checked ? obterNomesUnicos(campo) : [];
      renderListaSelecao(buscaLista ? buscaLista.value : '');
    });

    document.querySelectorAll('.extrato-opcao-tipo').forEach(function (btn) {
      btn.addEventListener('click', function () {
        fluxo.tipo = this.getAttribute('data-tipo');
        fluxo.selecionados = [];
        mostrarEtapa(fluxo.tipo === 'global' ? 'periodo' : 'lista');
      });
    });

    if (btnContinuarLista) btnContinuarLista.addEventListener('click', function () { mostrarEtapa('periodo'); });

    if (btnVoltar) btnVoltar.addEventListener('click', function () {
      if (fluxo.etapa === 'periodo') mostrarEtapa(fluxo.tipo === 'global' ? 'tipo' : 'lista');
      else if (fluxo.etapa === 'lista') mostrarEtapa('tipo');
    });

    if (btnFechar) btnFechar.addEventListener('click', fecharOverlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) fecharOverlay(); });

    if (btnGerarFinal) btnGerarFinal.addEventListener('click', function () {
      var inicio = document.getElementById('extrato-fluxo-data-inicio').value;
      var fim = document.getElementById('extrato-fluxo-data-fim').value;
      if (!inicio || !fim) { finToast('Selecione o período.', 'warning'); return; }
      if (inicio > fim) { finToast('Data inicial maior que a final.', 'warning'); return; }

      var lista = (state.cache || []).filter(function (r) { return r.dataISO >= inicio && r.dataISO <= fim; });
      var label = 'Caixa Geral';

      function limparLabelOrigem(arr) {
        return (arr || [])
          .filter(function (n) { return n && n.trim() && n.trim() !== '-'; })
          .join(', ');
      }

      if (fluxo.tipo === 'colaboradores') {
        lista = lista.filter(function (r) { return fluxo.selecionados.indexOf(r.motoboy) !== -1; });
        label = limparLabelOrigem(fluxo.selecionados) || 'Colaboradores';
      } else if (fluxo.tipo === 'clientes') {
        lista = lista.filter(function (r) { return fluxo.selecionados.indexOf(r.cliente) !== -1; });
        label = limparLabelOrigem(fluxo.selecionados) || 'Clientes';
      }

      if (!lista.length) { finToast('Nenhum registro encontrado para essa seleção no período.', 'warning'); return; }

      var periodoLabel = formatDateBR(inicio) + ' a ' + formatDateBR(fim);

      salvarExtratoStorage({
        id: gerarIdExtrato(),
        origem: label,
        periodoLabel: periodoLabel,
        registros: lista,
        criadoEm: Date.now()
      });

      renderizarListaExtratos();
      fecharOverlay();
      abrirJanelaPdfExtrato({ origem: label, periodoLabel: periodoLabel, registros: lista });
      finToast('Extrato gerado com sucesso!', 'success');
    });

    btnAbrir.addEventListener('click', abrirOverlay);
  }

  function tentarAbrirPedidoFinanceiro(tentativas, meuToken) {
    tentativas = tentativas || 0;

    if (meuToken === undefined) {
      meuToken = ++_tokenAbrirPedidoFinanceiro;
    }

    if (meuToken !== _tokenAbrirPedidoFinanceiro) return;

    var pedidoId = window.AppRDO && window.AppRDO._pedidoAlvoFinanceiro;
    if (!pedidoId) return;

    if (!state.cache.length || state.fetching) {
      if (tentativas < 40) {
        setTimeout(function () { tentarAbrirPedidoFinanceiro(tentativas + 1, meuToken); }, 200);
        return;
      }
      finToast('Não foi possível carregar os dados financeiros para localizar o pedido.', 'warning');
      window.AppRDO._pedidoAlvoFinanceiro = null;
      return;
    }

    if (meuToken !== _tokenAbrirPedidoFinanceiro) return;

    var idBuscaNormalizado = _normalizarIdPedidoBusca(pedidoId);

    if (!idBuscaNormalizado) {
      finToast('ID de pedido inválido: ' + pedidoId, 'warning');
      window.AppRDO._pedidoAlvoFinanceiro = null;
      return;
    }

    var reg = state.cache.find(function (r) {
      var idRegNormalizado = _normalizarIdPedidoBusca(r.idPedido);
      return idRegNormalizado !== null && idRegNormalizado === idBuscaNormalizado;
    });

    window.AppRDO._pedidoAlvoFinanceiro = null;

    if (!reg) {
      finToast('Pedido ' + pedidoId + ' não encontrado no financeiro.', 'warning');
      return;
    }

    var idRegConfirmacao = _normalizarIdPedidoBusca(reg.idPedido);
    if (idRegConfirmacao !== idBuscaNormalizado) {
      finToast('Erro ao localizar o pedido correto.', 'danger');
      return;
    }

    var tabRDO = document.querySelector('.fin-tab[data-tab="todos"]');
    if (tabRDO && !tabRDO.classList.contains('active')) {
      tabRDO.click();
    }

    var termoFiltro = idRegConfirmacao;
    state.filtroBusca = termoFiltro;

    var inputBusca = document.getElementById('filtro-busca-fin');
    if (inputBusca) inputBusca.value = termoFiltro;

    var btnLimpar = document.getElementById('btn-limpar-busca-fin');
    if (btnLimpar) btnLimpar.classList.remove('d-none');

    state.todos.pagina = 1;
    renderTodos();

    setTimeout(function () {
      if (meuToken !== _tokenAbrirPedidoFinanceiro) return;

      var tbody = document.getElementById('tabela-fin-body-todos');
      var linha = tbody ? tbody.querySelector('[data-idpedido="' + reg.idPedido + '"]') : null;
      if (linha) {
        linha.scrollIntoView({ behavior: 'smooth', block: 'center' });
        linha.classList.add('fin-row-destaque');
        setTimeout(function () { linha.classList.remove('fin-row-destaque'); }, 1500);
      }
      abrirModalVisualizar(reg);
    }, 300);
  }

  function bindEventoAbrirPedidoFinanceiro() {
    if (window._abrirPedidoFinanceiroBound) return;
    window._abrirPedidoFinanceiroBound = true;

    window.addEventListener('abrirPedidoFinanceiro', function (e) {
      var pedidoId = e.detail && e.detail.pedidoId;
      if (!pedidoId) return;
      window.AppRDO = window.AppRDO || {};
      window.AppRDO._pedidoAlvoFinanceiro = pedidoId;

      if (typeof window.tentarAbrirPedidoFinanceiro === 'function') {
        window.tentarAbrirPedidoFinanceiro();
      }
    });
  }

  function init() {
    if (_finJaInicializado) return;
    _finJaInicializado = true;

    bind();
    _bindBuscaFin();
    registrarEventos();
    bindNotifCardsFin();
    bindOlhinhoRdo();
    bindFiltrosRdo();
    initExtratoFluxo();
    bindEventoAbrirPedidoFinanceiro();
    renderPeriodosSalvosCaixa();
    carregarDados();

    window.addEventListener('resize', debounce(function () {
      var novo = obterPorPaginaFin();
      if (state.todos.porPagina !== novo) {
        state.todos.porPagina = novo;
        state.todos.pagina = 1;
        renderTodos();
      }
      if (state.caixa.porPagina !== novo) {
        state.caixa.porPagina = novo;
        state.caixa.pagina = 1;
        renderCaixaListaDiaria();
      }
    }, 250));
  }

  function bindFiltrosRdo() {
    var cardsTipo = document.querySelectorAll('[data-filtro-tipo]');
    cardsTipo.forEach(function (card) {
      card.addEventListener('click', function () {
        var valor = card.getAttribute('data-filtro-tipo');
        state.filtroTipo = valor;
        atualizarCardAtivoFin();
        state.todos.pagina = 1;
        renderTodos();
      });
    });

    var cardsSituacao = document.querySelectorAll('[data-filtro-situacao]');
    cardsSituacao.forEach(function (card) {
      card.addEventListener('click', function () {
        var valor = card.getAttribute('data-filtro-situacao');
        state.filtroSituacao = valor;
        atualizarCardAtivoFin();
        state.todos.pagina = 1;
        renderTodos();
      });
    });

    var inputBusca = document.getElementById('filtro-busca-fin');
    if (inputBusca) {
      inputBusca.addEventListener('input', function () {
        state.filtroBusca = inputBusca.value.trim();
        var btnLimparBusca = document.getElementById('btn-limpar-busca-fin');
        if (btnLimparBusca) btnLimparBusca.classList.toggle('d-none', !state.filtroBusca);
        state.todos.pagina = 1;
        renderTodos();
      });
    }

    var btnLimparBusca = document.getElementById('btn-limpar-busca-fin');
    if (btnLimparBusca) {
      btnLimparBusca.addEventListener('click', function () {
        state.filtroBusca = '';
        if (inputBusca) inputBusca.value = '';
        btnLimparBusca.classList.add('d-none');
        state.todos.pagina = 1;
        renderTodos();
      });
    }

    var btnOrdenarData = document.getElementById('btn-ordenar-data-fin');
    if (btnOrdenarData) {
      btnOrdenarData.addEventListener('click', function () {
        state.sortDataDesc = !state.sortDataDesc;
        renderTodos();
      });
    }
  }

  window.FinanceiroModule = {
    carregarDados: carregarDados,
    renderTodos: renderTodos,
    renderCaixa: renderCaixa,
    tentarAbrirPedidoFinanceiro: tentarAbrirPedidoFinanceiro,
    init: init
  };

  function renderCaixa() {
    if (!els.caixaListaDiaria) return;

    var lista = state.caixa.listaFiltradaAtual || state.cache.filter(function (r) {
      return ehReceitaFin(r.tipo) || r.tipo === 'despesa';
    });

    if (!lista.length) {
      els.caixaListaDiaria.innerHTML = '<div class="text-center text-muted py-4">Nenhum registro encontrado.</div>';
      atualizarPaginacaoCaixa(0);
      return;
    }

    var agrupado = agruparPorDia(lista);
    var dias = Object.keys(agrupado).sort(function (a, b) {
      if (a === 'sem-data') return 1;
      if (b === 'sem-data') return -1;
      return state.sortDataDesc ? (a < b ? 1 : -1) : (a < b ? -1 : 1);
    });

    var totalItens = dias.length;
    state.caixa.totalPag = Math.max(1, Math.ceil(totalItens / state.caixa.porPagina));
    if (state.caixa.pagina > state.caixa.totalPag) state.caixa.pagina = state.caixa.totalPag;

    var inicio = (state.caixa.pagina - 1) * state.caixa.porPagina;
    var diasPagina = dias.slice(inicio, inicio + state.caixa.porPagina);

    var html = diasPagina.map(function (dia) {
      return renderBlocoDia(dia, agrupado[dia]);
    }).join('');

    els.caixaListaDiaria.innerHTML = html;
    bindEventosDiaCaixa();
    atualizarPaginacaoCaixa(totalItens);
  }

  window.tentarAbrirPedidoFinanceiro = tentarAbrirPedidoFinanceiro;
  window.initFinanceiro = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function preencherModalViewFin(item) {
    document.getElementById('fin-view-cliente-grid').textContent = item.cliente || '-';
    document.getElementById('fin-view-colaborador-grid').textContent = item.colaborador || '-';
    document.getElementById('fin-view-tipo-grid').textContent = item.tipo === 'entrada' ? 'Receita' : 'Despesa';
    document.getElementById('fin-view-situacao-grid').textContent = item.situacao || '-';
    document.getElementById('fin-view-hora-grid').textContent = item.hora || '-';

    document.getElementById('fin-view-valor').textContent = formatarMoeda(item.valor || 0); // ✅ corrigido

    aplicarCorValorFin(item.tipo);
  }

  function aplicarCorValorFin(tipo) {
    const footer = document.getElementById('fin-view-valor-footer');
    const icon = document.getElementById('fin-view-valor-footer-icon');
    const titulo = document.getElementById('fin-view-valor-footer-titulo');

    footer.classList.remove('fin-valor-footer-entrada', 'fin-valor-footer-saida');

    if (tipo === 'entrada') {
      footer.classList.add('fin-valor-footer-entrada');
      icon.className = 'bi bi-arrow-down-circle-fill';
      titulo.textContent = 'VALOR DA RECEITA';
    } else {
      footer.classList.add('fin-valor-footer-saida');
      icon.className = 'bi bi-arrow-up-circle-fill';
      titulo.textContent = 'VALOR DA DESPESA';
    }
  }

  function gerarIdRelatorioFin() {
    return (Date.now().toString(36) + Math.random().toString(36).substring(2, 10)).toUpperCase().substring(0, 14);
  }

  function montarSnapshotFinanceiro(registros, tituloBanco) {
    var totais = calcularTotaisRegistros(registros);
    var linhas = registros.map(function (r) {
      return {
        data: r.dataDisplay,
        descricao: r.descricao,
        tipo: r.tipo === 'entrada' ? 'Receita' : 'Despesa',
        motoboy: r.motoboy,
        valor: formatarMoeda(r.valor),
        situacao: (r.situacao || '-').charAt(0).toUpperCase() + (r.situacao || '-').slice(1)
      };
    });

    return {
      bancos: {
        financeiro: {
          label: tituloBanco || 'Financeiro',
          campos: [
            { chave: 'data', label: 'Data' },
            { chave: 'descricao', label: 'Descrição' },
            { chave: 'tipo', label: 'Tipo' },
            { chave: 'motoboy', label: 'Colaborador' },
            { chave: 'valor', label: 'Valor' },
            { chave: 'situacao', label: 'Situação' }
          ],
          linhas: linhas,
          totais: { qtd: registros.length, somaValor: totais.entradas - totais.saidas, somaPagos: totais.entradas, temValor: true, temSituacao: true }
        }
      },
      resumos: {},
      meta: {
        usuarioGerador: (function () {
          try {
            var sess = JSON.parse(sessionStorage.getItem('usuario') || localStorage.getItem('usuario') || 'null');
            return (sess && (sess.username || sess.nome)) || 'Não identificado';
          } catch (e) { return 'Não identificado'; }
        })(),
        horaGeracao: new Date().toLocaleString('pt-BR')
      }
    };
  }

  function abrirRelatorioFinanceiro(tipo, registros, tituloBanco, inicio, fim) {
    var lista = Array.isArray(registros) ? registros : [];
    var periodoLabel = (inicio && fim) ? (formatDateBR(inicio) + ' a ' + formatDateBR(fim)) : 'Todos os registros';

    if (!lista.length) {
      finToast('Nenhum registro para gerar relatório.', 'warning');
      return;
    }

    var origemLabel = 'Caixa';
    if (tipo === 'extrato') origemLabel = tituloBanco || 'Extrato';
    if (tipo === 'financeiro') origemLabel = 'Financeiro (RDO)';
    if (tipo === 'caixa') origemLabel = tituloBanco || 'Relatório de Caixa';

    if (tipo === 'caixa') {
      abrirJanelaPdfFinanceiro(origemLabel, periodoLabel, lista);
    }

    if (tipo === 'extrato') {
      abrirJanelaPdfExtrato({ origem: origemLabel, periodoLabel: periodoLabel, registros: lista });
    }

    salvarExtratoStorage({
      id: gerarIdExtrato(),
      origem: origemLabel,
      periodoLabel: periodoLabel,
      registros: lista,
      criadoEm: Date.now()
    });

    renderizarListaExtratos();
    finToast('Relatório gerado com sucesso!', 'success');
  }

  function _garantirModuloRelatorioFin() {
    if (typeof window.abrirModalRelatorioFin === 'function') {
      return Promise.resolve();
    }
    if (_relatorioFinCarregando) {
      return _relatorioFinCarregando;
    }
    if (typeof window.carregarScriptExterno !== 'function') {
      return Promise.resolve();
    }
    _relatorioFinCarregando = window.carregarScriptExterno('/js/relatorios_fin.js')
      .then(function () {
        // pequena espera para garantir que o script definiu window.abrirModalRelatorioFin
        return new Promise(function (resolve) {
          var tentativas = 0;
          (function checar() {
            tentativas++;
            if (typeof window.abrirModalRelatorioFin === 'function' || tentativas > 30) {
              resolve();
            } else {
              setTimeout(checar, 100);
            }
          })();
        });
      })
      .finally(function () { _relatorioFinCarregando = null; });
    return _relatorioFinCarregando;
  }

})();