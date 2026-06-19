'use strict';

(function () {

  var state = {
    financeiro: [],
    pedidos: [],
    clientes: [],
    colaboradores: [],
    fetching: false
  };

  var els = {};

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str.toString()));
    return div.innerHTML;
  }

  function formatarMoeda(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function toISO(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
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

  function parseDataISO(raw) {
    if (!raw) return '';
    raw = raw.toString().trim();
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      var dt = new Date(raw);
      if (!isNaN(dt.getTime())) return toISO(dt);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.substring(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      var p = raw.split('/');
      return p[2] + '-' + p[1] + '-' + p[0];
    }
    if (/^\d{4}-\d{2}-\d{2}\s/.test(raw)) return raw.substring(0, 10);
    return '';
  }

  function normalizarFinanceiro(d) {
    var tipoRaw = (d.tipo || d.type || '').toString().trim().toUpperCase();
    var tipo = (tipoRaw === 'RECEITA' || tipoRaw === 'ENTRADA' || tipoRaw === 'INCOME') ? 'entrada' : 'saida';
    var valorRaw = d.valor;
    var valor = 0;
    if (typeof valorRaw === 'number') {
      valor = valorRaw;
    } else if (typeof valorRaw === 'string') {
      var c = valorRaw.replace('R$', '').replace(/\s/g, '');
      if (c.indexOf(',') !== -1 && c.indexOf('.') !== -1) c = c.replace(/\./g, '').replace(',', '.');
      else if (c.indexOf(',') !== -1) c = c.replace(',', '.');
      valor = parseFloat(c) || 0;
    }
    var situacao = (d.situacao || d.status || 'pendente').toString().trim().toLowerCase();
    var colaboradorId = (d.colaborador_id || '').toString().trim();
    var valorColab = parseFloat(d.valor_colaborador) || 0;
    var valorEmpresa = parseFloat(d.valor_empresa) || 0;
    if (tipo === 'entrada' && valorColab === 0 && valorEmpresa === 0) {
      if (colaboradorId) { valorColab = valor * 0.8; valorEmpresa = valor * 0.2; }
      else valorEmpresa = valor;
    }
    return {
      id: (d.id || '').toString().trim(),
      idPedido: (d.id_pedido || d.idPedido || '').toString().trim(),
      dataISO: parseDataISO(d.data),
      dataBR: formatDateBR(parseDataISO(d.data)),
      tipo: tipo,
      descricao: (d.descricao || '').toString().trim(),
      valor: valor,
      valorColaborador: valorColab,
      valorEmpresa: valorEmpresa,
      colaboradorId: colaboradorId,
      motoboy: (d.nome_colaborador || d.colaborador || d.motoboy || '-').toString().trim(),
      situacao: situacao,
      categoria: (d.categoria || '').toString().trim(),
      cliente: (d.cliente || '').toString().trim(),
      solicitante: (d.solicitante || '').toString().trim()
    };
  }

  function spinOn() {
    var btn = els.btnSync;
    var icon = els.syncIcon;
    if (btn) { btn.classList.add('syncing'); btn.disabled = true; }
    if (icon) icon.className = 'bi bi-arrow-repeat loading-spin';
  }

  function spinOff() {
    var btn = els.btnSync;
    var icon = els.syncIcon;
    if (btn) { btn.classList.remove('syncing'); btn.disabled = false; }
    if (icon) icon.className = 'bi bi-arrow-repeat';
  }

  function relToast(msg, tipo) {
    tipo = tipo || 'info';
    var cores = {
      success: { bg: '#198754', icon: 'bi-check-circle-fill' },
      danger: { bg: '#dc3545', icon: 'bi-exclamation-triangle-fill' },
      warning: { bg: '#fd7e14', icon: 'bi-exclamation-circle-fill' },
      info: { bg: '#0d6efd', icon: 'bi-info-circle-fill' }
    };
    var cor = cores[tipo] || cores.info;
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;background:' + cor.bg + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:.78rem;box-shadow:0 4px 16px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;max-width:380px;';
    toast.innerHTML = '<i class="bi ' + cor.icon + '"></i><span>' + escapeHtml(msg) + '</span>';
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .3s ease';
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 3000);
  }

  function statusBadge(situacao) {
    var s = (situacao || '').toLowerCase();
    var map = {
      pago: '<span class="rel-badge rel-badge-pago"><i class="bi bi-check-circle-fill"></i> Pago</span>',
      recebido: '<span class="rel-badge rel-badge-recebido"><i class="bi bi-check-circle-fill"></i> Recebido</span>',
      cancelado: '<span class="rel-badge rel-badge-cancelado"><i class="bi bi-x-circle-fill"></i> Cancelado</span>',
      pendente: '<span class="rel-badge rel-badge-pendente"><i class="bi bi-clock-fill"></i> Pendente</span>'
    };
    return map[s] || map.pendente;
  }

  function tipoBadge(tipo) {
    if (tipo === 'entrada') return '<span class="rel-badge rel-badge-entrada"><i class="bi bi-arrow-down-circle-fill"></i> Receita</span>';
    return '<span class="rel-badge rel-badge-saida"><i class="bi bi-arrow-up-circle-fill"></i> Despesa</span>';
  }

  function definirPeriodoPadrao() {
    var hoje = new Date();
    var primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    var ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    var di = toISO(primeiroDia);
    var df = toISO(ultimoDia);
    var ids = ['rel-mb-data-inicio', 'rel-mb-data-fim', 'rel-cli-data-inicio', 'rel-cli-data-fim', 'rel-fin-data-inicio', 'rel-fin-data-fim', 'rel-glob-data-inicio', 'rel-glob-data-fim'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) el.value = ids[i].indexOf('inicio') !== -1 ? di : df;
    }
  }

  function popularSelectMotoboys() {
    var sel = document.getElementById('rel-mb-select');
    if (!sel) return;
    sel.innerHTML = '<option value="__todos__">Todos os motoboys</option>';
    var mapa = {};
    state.financeiro.forEach(function (r) {
      var mb = (r.motoboy || '').trim();
      if (mb && mb !== '-') mapa[mb.toLowerCase()] = mb;
    });
    Object.keys(mapa).sort().forEach(function (k) {
      var opt = document.createElement('option');
      opt.value = mapa[k];
      opt.textContent = mapa[k];
      sel.appendChild(opt);
    });
  }

  function popularSelectClientes() {
    var sel = document.getElementById('rel-cli-select');
    if (!sel) return;
    sel.innerHTML = '<option value="__todos__">Todos os clientes</option>';
    state.clientes.forEach(function (c) {
      var nome = (c.username || c.nome || '').trim();
      var id = (c.id || '').toString().trim();
      if (!nome || !id) return;
      var opt = document.createElement('option');
      opt.value = id;
      opt.textContent = nome;
      sel.appendChild(opt);
    });
  }

  function filtrarPorPeriodo(lista, di, df) {
    return lista.filter(function (r) {
      if (!r.dataISO) return false;
      return r.dataISO >= di && r.dataISO <= df;
    });
  }

  function construirCardsResumo(items) {
    var totalEnt = 0, totalSai = 0, totalColab = 0, totalEmp = 0;
    items.forEach(function (r) {
      if (r.tipo === 'entrada') {
        totalEnt += r.valor;
        totalColab += r.valorColaborador;
        totalEmp += r.valorEmpresa;
      } else {
        totalSai += r.valor;
      }
    });
    var saldo = totalEmp - totalSai;
    return '<div class="rel-cards-resumo">' +
      '<div class="rel-card-resumo"><div class="rel-card-label">Receitas</div><div class="rel-card-valor verde">' + formatarMoeda(totalEnt) + '</div></div>' +
      '<div class="rel-card-resumo"><div class="rel-card-label">Despesas</div><div class="rel-card-valor vermelho">' + formatarMoeda(totalSai) + '</div></div>' +
      '<div class="rel-card-resumo"><div class="rel-card-label">Colaboradores</div><div class="rel-card-valor roxo">' + formatarMoeda(totalColab) + '</div></div>' +
      '<div class="rel-card-resumo"><div class="rel-card-label">Empresa</div><div class="rel-card-valor azul">' + formatarMoeda(totalEmp) + '</div></div>' +
      '<div class="rel-card-resumo"><div class="rel-card-label">Saldo</div><div class="rel-card-valor ' + (saldo >= 0 ? 'verde' : 'vermelho') + '">' + formatarMoeda(saldo) + '</div></div>' +
      '<div class="rel-card-resumo"><div class="rel-card-label">Registros</div><div class="rel-card-valor">' + items.length + '</div></div>' +
      '</div>';
  }

  function construirTabelaRegistros(items) {
    if (!items.length) return '<div class="rel-empty"><i class="bi bi-inbox"></i>Nenhum registro encontrado.</div>';
    return '<div class="rel-table-wrap"><table class="rel-table">' +
      '<thead><tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Motoboy</th><th>Tipo</th><th>Situação</th><th class="text-end">Valor</th></tr></thead>' +
      '<tbody>' + items.map(function (r) {
        return '<tr>' +
          '<td>' + escapeHtml(r.dataBR || '-') + '</td>' +
          '<td>' + escapeHtml(r.idPedido || '-') + '</td>' +
          '<td>' + escapeHtml(r.cliente || '-') + '</td>' +
          '<td>' + escapeHtml(r.motoboy && r.motoboy !== '-' ? r.motoboy : '-') + '</td>' +
          '<td>' + tipoBadge(r.tipo) + '</td>' +
          '<td>' + statusBadge(r.situacao) + '</td>' +
          '<td class="text-end" style="font-weight:600;color:' + (r.tipo === 'entrada' ? '#198754' : '#dc3545') + ';">' +
          (r.tipo === 'entrada' ? '+' : '-') + ' ' + formatarMoeda(r.valor) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function textoRelatorioCopiar(titulo, periodoLabel, items) {
    var totalEnt = 0, totalSai = 0, totalColab = 0, totalEmp = 0;
    var linhas = '';
    items.forEach(function (r) {
      if (r.tipo === 'entrada') { totalEnt += r.valor; totalColab += r.valorColaborador; totalEmp += r.valorEmpresa; }
      else totalSai += r.valor;
      linhas += (r.dataBR || '-') + ' | ' + (r.idPedido || '-') + ' | ' + (r.cliente || '-') + ' | ' + (r.motoboy || '-') + ' | ' + (r.tipo === 'entrada' ? '+' : '-') + ' ' + formatarMoeda(r.valor) + ' | ' + (r.situacao || '-') + '\n';
    });
    var saldo = totalEmp - totalSai;
    return '========== ' + titulo.toUpperCase() + ' ==========\n' +
      'Período: ' + periodoLabel + '\n' +
      '--------------------------------------------\n' +
      'Data | Pedido | Cliente | Motoboy | Valor | Situação\n' +
      '--------------------------------------------\n' +
      linhas +
      '--------------------------------------------\n' +
      'Receitas: ' + formatarMoeda(totalEnt) + '\n' +
      'Despesas: ' + formatarMoeda(totalSai) + '\n' +
      'Colaboradores: ' + formatarMoeda(totalColab) + '\n' +
      'Empresa: ' + formatarMoeda(totalEmp) + '\n' +
      'Saldo: ' + formatarMoeda(saldo) + '\n' +
      'Registros: ' + items.length + '\n' +
      '============================================';
  }

  function abrirModal(titulo, htmlBody, textoPlano, periodoLabel) {
    var overlay = document.getElementById('rel-modal-overlay');
    var tituloEl = document.getElementById('rel-modal-titulo');
    var bodyEl = document.getElementById('rel-modal-body');
    if (!overlay || !bodyEl) return;
    if (tituloEl) tituloEl.textContent = titulo.toUpperCase();
    bodyEl.innerHTML = htmlBody;
    overlay.style.display = 'flex';

    function fechar() { overlay.style.display = 'none'; }

    var btnFechar = document.getElementById('rel-modal-fechar');
    var btnFecharFooter = document.getElementById('rel-btn-fechar-modal');
    var btnCopiar = document.getElementById('rel-btn-copiar');
    var btnWhatsapp = document.getElementById('rel-btn-whatsapp');
    var btnEmail = document.getElementById('rel-btn-email');

    if (btnFechar) btnFechar.onclick = fechar;
    if (btnFecharFooter) btnFecharFooter.onclick = fechar;
    overlay.onclick = function (e) { if (e.target === overlay) fechar(); };

    if (btnCopiar) {
      btnCopiar.onclick = function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textoPlano)
            .then(function () { relToast('Relatório copiado!', 'success'); })
            .catch(function () { fallbackCopy(textoPlano); });
        } else {
          fallbackCopy(textoPlano);
        }
      };
    }

    if (btnWhatsapp) {
      btnWhatsapp.onclick = function () {
        var encoded = encodeURIComponent(textoPlano);
        window.open('https://api.whatsapp.com/send?text=' + encoded, '_blank');
      };
    }

    if (btnEmail) {
      btnEmail.onclick = function () {
        var assunto = encodeURIComponent(titulo + ' — ' + periodoLabel);
        var corpo = encodeURIComponent(textoPlano);
        window.location.href = 'mailto:?subject=' + assunto + '&body=' + corpo;
      };
    }
  }

  function fallbackCopy(texto) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      relToast('Relatório copiado!', 'success');
    } catch (e) {
      relToast('Não foi possível copiar.', 'warning');
    }
  }

  function gerarRelatorioMotoboy() {
    var di = (document.getElementById('rel-mb-data-inicio') || {}).value || '';
    var df = (document.getElementById('rel-mb-data-fim') || {}).value || '';
    var mbSel = (document.getElementById('rel-mb-select') || {}).value || '__todos__';
    var container = document.getElementById('rel-motoboy-resultado');
    if (!di || !df) { relToast('Selecione o período.', 'warning'); return; }
    var lista = filtrarPorPeriodo(state.financeiro, di, df).filter(function (r) { return r.tipo === 'entrada'; });
    if (mbSel !== '__todos__') lista = lista.filter(function (r) { return (r.motoboy || '').trim().toLowerCase() === mbSel.toLowerCase(); });
    var periodoLabel = formatDateBR(di) + ' a ' + formatDateBR(df);
    var titulo = mbSel === '__todos__' ? 'Relatório Geral de Motoboys' : 'Relatório — ' + mbSel;
    var htmlBody = construirCardsResumo(lista);

    if (mbSel === '__todos__') {
      var grupos = {};
      lista.forEach(function (r) {
        var mb = (r.motoboy || 'Sem motoboy').trim();
        if (!grupos[mb]) grupos[mb] = [];
        grupos[mb].push(r);
      });
      Object.keys(grupos).sort().forEach(function (mb) {
        var regs = grupos[mb];
        var totColab = 0;
        regs.forEach(function (r) { totColab += r.valorColaborador; });
        htmlBody += '<div class="rel-section-grupo">' +
          '<div class="rel-section-grupo-header"><i class="bi bi-bicycle"></i>' + escapeHtml(mb) + ' — ' + regs.length + ' entrega(s) — Repasse: ' + formatarMoeda(totColab) + '</div>' +
          construirTabelaRegistros(regs) +
          '</div>';
      });
    } else {
      htmlBody += construirTabelaRegistros(lista);
    }

    if (container) container.innerHTML = htmlBody;
    abrirModal(titulo, htmlBody, textoRelatorioCopiar(titulo, periodoLabel, lista), periodoLabel);
  }

  function gerarRelatorioCliente() {
    var di = (document.getElementById('rel-cli-data-inicio') || {}).value || '';
    var df = (document.getElementById('rel-cli-data-fim') || {}).value || '';
    var cliSel = (document.getElementById('rel-cli-select') || {}).value || '__todos__';
    var container = document.getElementById('rel-cliente-resultado');
    if (!di || !df) { relToast('Selecione o período.', 'warning'); return; }
    var lista = filtrarPorPeriodo(state.financeiro, di, df);
    var periodoLabel = formatDateBR(di) + ' a ' + formatDateBR(df);
    var titulo = 'Relatório de Clientes';
    var nomeCliente = '';

    if (cliSel !== '__todos__') {
      var cliObj = state.clientes.find(function (c) { return (c.id || '').toString() === cliSel; });
      nomeCliente = cliObj ? (cliObj.username || cliObj.nome || '') : cliSel;
      lista = lista.filter(function (r) {
        var idPed = r.idPedido;
        if (!idPed) return false;
        var ped = state._pedidosCache ? state._pedidosCache[idPed] : null;
        return ped && (ped.id_cliente || '').toString() === cliSel;
      });
      titulo = 'Relatório — ' + nomeCliente;
    }

    var htmlBody = construirCardsResumo(lista);

    if (cliSel === '__todos__') {
      var mapaCliente = {};
      lista.forEach(function (r) {
        var nome = (r.cliente && r.cliente !== '-') ? r.cliente : 'Sem cliente';
        if (!mapaCliente[nome]) mapaCliente[nome] = [];
        mapaCliente[nome].push(r);
      });
      Object.keys(mapaCliente).sort().forEach(function (nome) {
        var regs = mapaCliente[nome];
        htmlBody += '<div class="rel-section-grupo">' +
          '<div class="rel-section-grupo-header"><i class="bi bi-person"></i>' + escapeHtml(nome) + ' — ' + regs.length + ' registro(s)</div>' +
          construirTabelaRegistros(regs) +
          '</div>';
      });
    } else {
      htmlBody += construirTabelaRegistros(lista);
    }

    if (container) container.innerHTML = htmlBody;
    abrirModal(titulo, htmlBody, textoRelatorioCopiar(titulo, periodoLabel, lista), periodoLabel);
  }

  function gerarRelatorioFinanceiro() {
    var di = (document.getElementById('rel-fin-data-inicio') || {}).value || '';
    var df = (document.getElementById('rel-fin-data-fim') || {}).value || '';
    var tipoSel = (document.getElementById('rel-fin-tipo') || {}).value || '__todos__';
    var container = document.getElementById('rel-financeiro-resultado');
    if (!di || !df) { relToast('Selecione o período.', 'warning'); return; }
    var lista = filtrarPorPeriodo(state.financeiro, di, df);
    if (tipoSel !== '__todos__') lista = lista.filter(function (r) { return r.tipo === tipoSel; });
    var periodoLabel = formatDateBR(di) + ' a ' + formatDateBR(df);
    var labelTipo = tipoSel === 'entrada' ? 'Receitas' : tipoSel === 'saida' ? 'Despesas' : 'Geral';
    var titulo = 'Relatório Financeiro — ' + labelTipo;
    var htmlBody = construirCardsResumo(lista) + construirTabelaRegistros(lista);
    if (container) container.innerHTML = htmlBody;
    abrirModal(titulo, htmlBody, textoRelatorioCopiar(titulo, periodoLabel, lista), periodoLabel);
  }

  function gerarRelatorioGlobal() {
    var di = (document.getElementById('rel-glob-data-inicio') || {}).value || '';
    var df = (document.getElementById('rel-glob-data-fim') || {}).value || '';
    var container = document.getElementById('rel-global-resultado');
    if (!di || !df) { relToast('Selecione o período.', 'warning'); return; }
    var lista = filtrarPorPeriodo(state.financeiro, di, df);
    var periodoLabel = formatDateBR(di) + ' a ' + formatDateBR(df);
    var titulo = 'Relatório Global';

    var htmlBody = construirCardsResumo(lista);

    var porDia = {};
    lista.forEach(function (r) {
      var key = r.dataISO || 'sem-data';
      if (!porDia[key]) porDia[key] = [];
      porDia[key].push(r);
    });

    htmlBody += '<div class="rel-section-grupo"><div class="rel-section-grupo-header"><i class="bi bi-bicycle"></i> Por Motoboy</div>';
    var porMb = {};
    lista.filter(function (r) { return r.tipo === 'entrada'; }).forEach(function (r) {
      var mb = (r.motoboy || 'Sem motoboy').trim();
      if (!porMb[mb]) porMb[mb] = { entregas: 0, totalBruto: 0, totalColab: 0, totalEmp: 0 };
      porMb[mb].entregas++;
      porMb[mb].totalBruto += r.valor;
      porMb[mb].totalColab += r.valorColaborador;
      porMb[mb].totalEmp += r.valorEmpresa;
    });
    htmlBody += '<div class="rel-table-wrap"><table class="rel-table"><thead><tr><th>Motoboy</th><th class="text-end">Entregas</th><th class="text-end">Total Bruto</th><th class="text-end">Repasse</th><th class="text-end">Empresa</th></tr></thead><tbody>';
    Object.keys(porMb).sort().forEach(function (mb) {
      var d = porMb[mb];
      htmlBody += '<tr><td>' + escapeHtml(mb) + '</td><td class="text-end">' + d.entregas + '</td><td class="text-end" style="color:#198754;font-weight:600;">' + formatarMoeda(d.totalBruto) + '</td><td class="text-end" style="color:#6f42c1;">' + formatarMoeda(d.totalColab) + '</td><td class="text-end" style="color:#0d6efd;">' + formatarMoeda(d.totalEmp) + '</td></tr>';
    });
    if (!Object.keys(porMb).length) htmlBody += '<tr><td colspan="5" class="rel-empty">Nenhum dado.</td></tr>';
    htmlBody += '</tbody></table></div></div>';

    htmlBody += '<div class="rel-section-grupo"><div class="rel-section-grupo-header"><i class="bi bi-people"></i> Por Cliente</div>';
    var porCli = {};
    lista.forEach(function (r) {
      var nome = (r.cliente && r.cliente !== '-') ? r.cliente : 'Sem cliente';
      if (!porCli[nome]) porCli[nome] = { registros: 0, total: 0 };
      porCli[nome].registros++;
      porCli[nome].total += r.valor;
    });
    htmlBody += '<div class="rel-table-wrap"><table class="rel-table"><thead><tr><th>Cliente</th><th class="text-end">Registros</th><th class="text-end">Total</th></tr></thead><tbody>';
    Object.keys(porCli).sort().forEach(function (nome) {
      var d = porCli[nome];
      htmlBody += '<tr><td>' + escapeHtml(nome) + '</td><td class="text-end">' + d.registros + '</td><td class="text-end" style="font-weight:600;">' + formatarMoeda(d.total) + '</td></tr>';
    });
    if (!Object.keys(porCli).length) htmlBody += '<tr><td colspan="3" class="rel-empty">Nenhum dado.</td></tr>';
    htmlBody += '</tbody></table></div></div>';

    htmlBody += '<div class="rel-section-grupo"><div class="rel-section-grupo-header"><i class="bi bi-wallet2"></i> Todos os Lançamentos</div>' + construirTabelaRegistros(lista) + '</div>';

    if (container) container.innerHTML = htmlBody;
    abrirModal(titulo, htmlBody, textoRelatorioCopiar(titulo, periodoLabel, lista), periodoLabel);
  }

  function bind() {
    els.btnSync = document.getElementById('btn-sync-relatorio');
    els.syncIcon = document.getElementById('sync-icon-relatorio');
  }

  function registrarEventos() {
    if (els.btnSync) els.btnSync.addEventListener('click', function () { carregarDados(); });
    var btnMb = document.getElementById('btn-gerar-rel-motoboy');
    var btnCli = document.getElementById('btn-gerar-rel-cliente');
    var btnFin = document.getElementById('btn-gerar-rel-financeiro');
    var btnGlob = document.getElementById('btn-gerar-rel-global');
    if (btnMb) btnMb.addEventListener('click', gerarRelatorioMotoboy);
    if (btnCli) btnCli.addEventListener('click', gerarRelatorioCliente);
    if (btnFin) btnFin.addEventListener('click', gerarRelatorioFinanceiro);
    if (btnGlob) btnGlob.addEventListener('click', gerarRelatorioGlobal);
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
      var clientesArr = extrairArray(results[2]);
      state.clientes = clientesArr;
      state._pedidosCache = {};
      extrairArray(results[1]).forEach(function (p) {
        var id = (p.id || '').toString().trim();
        if (id) state._pedidosCache[id] = { id: id, id_cliente: (p.id_cliente || '').toString().trim(), solicitante: (p.solicitante || '').toString().trim() };
      });
      state.colaboradores = extrairArray(results[3]);
      state.financeiro = [];
      extrairArray(results[0]).forEach(function (d) {
        try { state.financeiro.push(normalizarFinanceiro(d)); } catch (e) {}
      });
      state.financeiro.forEach(function (r) {
        if (!r.idPedido) return;
        var ped = state._pedidosCache[r.idPedido];
        if (!ped) return;
        if (!r.solicitante || r.solicitante === '' || r.solicitante === '-') r.solicitante = ped.solicitante || '-';
        if (!r.cliente || r.cliente === '' || r.cliente === '-') {
          var cliObj = clientesArr.find(function (c) { return (c.id || '').toString() === ped.id_cliente; });
          r.cliente = cliObj ? (cliObj.username || cliObj.nome || '-') : '-';
        }
      });
      popularSelectMotoboys();
      popularSelectClientes();
    }).catch(function () {
      relToast('Erro ao carregar dados.', 'danger');
    }).finally(function () {
      state.fetching = false;
      spinOff();
    });
  }

  window.initRelatorios = function () {
    state.fetching = false;
    state.financeiro = [];
    state.pedidos = [];
    state.clientes = [];
    state.colaboradores = [];
    bind();
    registrarEventos();
    definirPeriodoPadrao();
    carregarDados();
  };

})();
