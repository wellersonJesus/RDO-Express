'use strict';

const FinState = {
  colaboradores : [],
  todos         : [],
  filtroTipo    : 'todos',
  filtroSituacao: 'todos',
  filtroBusca   : '',
  sortDataAsc   : false,
  paginaTodos   : 1,
  porPagina     : 15,
  caixaDados    : [],
  paginaCaixa   : 1,
  deletePendingId: null,
  _filtrados    : [],
};

async function finApi(payload) {
  if (!window.API || typeof window.API.call !== 'function') {
    throw new Error('window.API não disponível.');
  }
  const { action, ...data } = payload;
  const res = await window.API.call(action, data);
  if (!res) throw new Error('Resposta nula para action "' + action + '"');
  return res;
}

window.initFinanceiro = function () {
  if (!document.getElementById('tabela-fin-body-todos')) return;
  definirDataPadrao();
  bindEventsTodos();
  bindEventsCaixa();
  bindEventsExtrato();
  bindEventsModais();
  carregarTudo();
};

function definirDataPadrao() {
  const hoje = new Date();
  const ini  = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fmt  = d => d.toISOString().split('T')[0];
  [
    ['caixa-data-inicio',   fmt(ini)],
    ['caixa-data-fim',      fmt(hoje)],
    ['extrato-data-inicio', fmt(ini)],
    ['extrato-data-fim',    fmt(hoje)],
  ].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
}

async function carregarTudo() {
  setRefreshSpinner(true);
  try {
    const [resColabs, resFin] = await Promise.all([
      finApi({ action: 'getColaboradores' }),
      finApi({ action: 'getFinanceiroCompleto' }),
    ]);

    FinState.colaboradores = Array.isArray(resColabs)
      ? resColabs
      : (resColabs?.data || []);

    FinState.todos = (resFin?.status === 'success' && Array.isArray(resFin.data))
      ? resFin.data
      : (Array.isArray(resFin) ? resFin : []);

    preencherSelectColaboradores();
    preencherSelectExtrato();
    aplicarFiltrosETodos();
  } catch (e) {
    console.error('[Fin] carregarTudo():', e.message);
    aplicarFiltrosETodos();
  } finally {
    setRefreshSpinner(false);
  }
}

function bindEventsTodos() {
  document.querySelectorAll('.fin-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.fin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.fin-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('fin-tab-content-' + tab.dataset.tab)?.classList.add('active');
    });
  });

  document.getElementById('btn-refresh-fin')?.addEventListener('click', carregarTudo);

  const inputBusca = document.getElementById('filtro-busca-fin');
  if (inputBusca) {
    inputBusca.addEventListener('input', () => {
      FinState.filtroBusca = inputBusca.value.trim().toLowerCase();
      FinState.paginaTodos = 1;
      aplicarFiltrosETodos();
    });
  }

  document.querySelectorAll('[data-filtro-tipo]').forEach(el => {
    el.addEventListener('click', () => {
      FinState.filtroTipo  = el.dataset.filtroTipo;
      FinState.paginaTodos = 1;
      document.querySelectorAll('[data-filtro-tipo]').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      const label = document.getElementById('label-filtro-fin');
      if (label) label.textContent = el.textContent.trim();
      fecharDropdownFiltro();
      aplicarFiltrosETodos();
    });
  });

  document.querySelectorAll('[data-filtro-situacao]').forEach(el => {
    el.addEventListener('click', () => {
      FinState.filtroSituacao = el.dataset.filtroSituacao;
      FinState.paginaTodos    = 1;
      document.querySelectorAll('[data-filtro-situacao]').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      fecharDropdownFiltro();
      aplicarFiltrosETodos();
    });
  });

  document.getElementById('btn-filtro-fin')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('dropdown-filtro-menu-fin')?.classList.toggle('show');
  });

  document.addEventListener('click', fecharDropdownFiltro);

  document.getElementById('btn-sub-situacao-fin')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('submenu-situacao-fin')?.classList.toggle('show');
  });

  document.getElementById('btn-sort-data-todos')?.addEventListener('click', () => {
    FinState.sortDataAsc = !FinState.sortDataAsc;
    const icon = document.getElementById('icon-sort-data-todos');
    if (icon) icon.className = FinState.sortDataAsc ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
    aplicarFiltrosETodos();
  });

  document.getElementById('fin-pag-prev-todos')?.addEventListener('click', () => {
    if (FinState.paginaTodos > 1) { FinState.paginaTodos--; renderTabelaTodos(); }
  });

  document.getElementById('fin-pag-next-todos')?.addEventListener('click', () => {
    const total = Math.max(1, Math.ceil((FinState._filtrados?.length || 0) / FinState.porPagina));
    if (FinState.paginaTodos < total) { FinState.paginaTodos++; renderTabelaTodos(); }
  });

  document.getElementById('btn-novo-fin')?.addEventListener('click', abrirModalNovo);
}

function fecharDropdownFiltro() {
  document.getElementById('dropdown-filtro-menu-fin')?.classList.remove('show');
  document.getElementById('submenu-situacao-fin')?.classList.remove('show');
}

function normalizarTipo(r) {
  const t = String(r.tipo || r.type || r.categoria || '').toUpperCase().trim();
  if (t === 'RECEITA' || t === 'ENTRADA' || t === 'INCOME') return 'entrada';
  return 'saida';
}

function normalizarSituacao(r) {
  return String(r.situacao || r.status || 'PENDENTE').toUpperCase().trim();
}

function aplicarFiltrosETodos() {
  let lista = [...FinState.todos];

  if (FinState.filtroTipo === 'entrada') {
    lista = lista.filter(r => normalizarTipo(r) === 'entrada');
  } else if (FinState.filtroTipo === 'saida') {
    lista = lista.filter(r => normalizarTipo(r) === 'saida');
  }

  if (FinState.filtroSituacao !== 'todos') {
    lista = lista.filter(r =>
      normalizarSituacao(r).toLowerCase() === FinState.filtroSituacao.toLowerCase()
    );
  }

  if (FinState.filtroBusca) {
    const q = FinState.filtroBusca;
    lista = lista.filter(r =>
      String(r.id_pedido        || r.idPedido   || r.pedido  || '').toLowerCase().includes(q) ||
      String(r.descricao        || '').toLowerCase().includes(q) ||
      String(r.colaborador      || r.nome_colaborador || r.motoboy || '').toLowerCase().includes(q)
    );
  }

  lista.sort((a, b) => {
    const da = parsarDataParaDate(a.data || '');
    const db = parsarDataParaDate(b.data || '');
    return FinState.sortDataAsc ? da - db : db - da;
  });

  FinState._filtrados  = lista;
  FinState.paginaTodos = 1;
  renderTabelaTodos();
}

function parsarDataParaDate(str) {
  if (!str) return new Date(0);
  const s = String(str).trim();
  if (s.includes('/')) {
    const [d, m, y] = s.split('/');
    return new Date(y, m - 1, d);
  }
  if (s.includes('-')) {
    return new Date(s);
  }
  return new Date(0);
}

function renderTabelaTodos() {
  const tbody = document.getElementById('tabela-fin-body-todos');
  if (!tbody) return;

  const lista   = FinState._filtrados || [];
  const total   = lista.length;
  const paginas = Math.max(1, Math.ceil(total / FinState.porPagina));
  const pag     = Math.min(FinState.paginaTodos, paginas);
  const inicio  = (pag - 1) * FinState.porPagina;
  const pagina  = lista.slice(inicio, inicio + FinState.porPagina);

  setText('fin-pag-info-todos',  `${total} registro${total !== 1 ? 's' : ''}`);
  setText('fin-pag-label-todos', `Pág ${pag} / ${paginas}`);

  if (!pagina.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4" style="font-size:.8rem;">
          <i class="bi bi-inbox" style="font-size:1.4rem;display:block;opacity:.3;margin-bottom:6px;"></i>
          Nenhum lançamento encontrado.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = pagina.map(r => {
    const tipo        = normalizarTipo(r);
    const valorTotal  = parseValor(r.valor || 0);
    const colab80     = parseValor(r.valor_colaborador || 0);
    const empresa20   = parseValor(r.valor_empresa || 0);
    const sit         = normalizarSituacao(r);
    const data        = formatarData(r.data || '');
    const pedido      = r.id_pedido || r.idPedido || '—';
    const colaborador = r.nome_colaborador || r.colaborador || r.motoboy || '—';
    const rowId       = escHtml(String(r.id || ''));

    return `
      <tr>
        <td class="ps-3" style="font-size:.78rem;">${data}</td>
        <td style="font-size:.78rem;">${escHtml(String(pedido))}</td>
        <td>
          <span class="badge rounded-pill ${tipo === 'entrada' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}"
            style="font-size:.68rem;">
            <i class="bi bi-arrow-${tipo === 'entrada' ? 'down' : 'up'}-circle me-1"></i>
            ${tipo === 'entrada' ? 'Receita' : 'Despesa'}
          </span>
        </td>
        <td style="font-size:.78rem;">${escHtml(String(colaborador))}</td>
        <td class="text-end fw-bold" style="font-size:.78rem;">${fmtBRL(valorTotal)}</td>
        <td class="text-end" style="font-size:.78rem;color:#6f42c1;">${fmtBRL(colab80)}</td>
        <td class="text-end" style="font-size:.78rem;color:#0d6efd;">${fmtBRL(empresa20)}</td>
        <td class="text-center">${badgeSituacao(sit)}</td>
        <td class="text-end pe-3">
          <div class="d-flex justify-content-end gap-1">
            <button class="btn btn-sm btn-outline-secondary rounded-circle p-0"
              style="width:26px;height:26px;font-size:.72rem;"
              onclick="abrirModalEditar('${rowId}')" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger rounded-circle p-0"
              style="width:26px;height:26px;font-size:.72rem;"
              onclick="confirmarDelete('${rowId}')" title="Excluir">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function bindEventsCaixa() {
  document.getElementById('btn-filtrar-caixa')?.addEventListener('click', filtrarCaixa);
  document.getElementById('btn-ver-repasses')?.addEventListener('click', () => {
    renderRepasses();
    new bootstrap.Modal(document.getElementById('modalRepasses')).show();
  });
  document.getElementById('btn-toggle-caixa-valores')?.addEventListener('click', toggleCaixaValores);
}

async function filtrarCaixa() {
  const ini = document.getElementById('caixa-data-inicio')?.value;
  const fim = document.getElementById('caixa-data-fim')?.value;
  if (!ini || !fim) return;

  setRefreshSpinner(true);
  try {
    const res = await finApi({ action: 'getFinanceiroCompleto' });
    const todos = (res?.status === 'success' && Array.isArray(res.data))
      ? res.data
      : (Array.isArray(res) ? res : FinState.todos);

    const iniDate = new Date(ini);
    const fimDate = new Date(fim);
    fimDate.setHours(23, 59, 59);

    FinState.caixaDados = todos.filter(r => {
      const d = parsarDataParaDate(r.data || '');
      return d >= iniDate && d <= fimDate;
    });
  } catch (e) {
    console.warn('[Fin] filtrarCaixa() usando cache local:', e.message);
    const ini2 = ini;
    const fim2 = fim;
    FinState.caixaDados = FinState.todos.filter(r => {
      const d = parsarDataParaDate(r.data || '');
      const iniD = new Date(ini2);
      const fimD = new Date(fim2);
      fimD.setHours(23, 59, 59);
      return d >= iniD && d <= fimD;
    });
  } finally {
    setRefreshSpinner(false);
  }
  renderCaixa();
}

function renderCaixa() {
  const dados     = FinState.caixaDados;
  const entradas  = dados.filter(r => normalizarTipo(r) === 'entrada');
  const saidas    = dados.filter(r => normalizarTipo(r) === 'saida');

  const totalEntradas = entradas.reduce((s, r) => s + parseValor(r.valor || 0), 0);
  const totalSaidas   = saidas.reduce((s, r)   => s + parseValor(r.valor || 0), 0);
  const totalColabs   = entradas.reduce((s, r) => s + parseValor(r.valor_colaborador || 0), 0);
  const totalEmpresa  = entradas.reduce((s, r) => s + parseValor(r.valor_empresa || 0), 0);
  const saldoEmpresa  = totalEmpresa - totalSaidas;

  setText('caixa-card-entradas',          fmtBRL(totalEntradas));
  setText('caixa-card-saidas',            fmtBRL(totalSaidas));
  setText('caixa-card-empresa',           fmtBRL(totalEmpresa));
  setText('caixa-card-colaboradores',     fmtBRL(totalColabs));
  setText('caixa-card-registros',         String(dados.length));
  setText('rdo-pay-saldo',                fmtBRL(saldoEmpresa));
  setText('rdo-pay-saldo-colaboradores',  fmtBRL(totalColabs));

  renderListaDiaria(dados);
  setText('fin-pag-info-caixa', `${dados.length} registro${dados.length !== 1 ? 's' : ''}`);
}

function renderListaDiaria(dados) {
  const container = document.getElementById('caixa-lista-diaria');
  if (!container) return;

  if (!dados.length) {
    container.innerHTML = `
      <div class="text-center text-muted py-4" style="font-size:.8rem;">
        <i class="bi bi-inbox" style="font-size:1.2rem;display:block;opacity:.4;margin-bottom:4px;"></i>
        Nenhum lançamento no período.
      </div>`;
    return;
  }

  const porDia = {};
  dados.forEach(r => {
    const d = r.data || 'Sem data';
    if (!porDia[d]) porDia[d] = [];
    porDia[d].push(r);
  });

  const diasOrdenados = Object.keys(porDia).sort((a, b) => {
    return parsarDataParaDate(b) - parsarDataParaDate(a);
  });

  container.innerHTML = diasOrdenados.map(dia => {
    const itens    = porDia[dia];
    const totalDia = itens.reduce((s, r) => s + parseValor(r.valor || 0), 0);
    const qtd      = itens.length;
    return `
      <div class="caixa-dia-item" data-dia="${escHtml(dia)}"
        onclick="abrirDetalheDia('${escHtml(dia)}')">
        <div class="d-flex justify-content-between align-items-center px-1">
          <div>
            <span style="font-weight:700;font-size:.82rem;">${formatarData(dia)}</span>
            <span class="text-muted ms-2" style="font-size:.72rem;">${qtd} lançamento${qtd !== 1 ? 's' : ''}</span>
          </div>
          <span class="fw-bold text-success" style="font-size:.82rem;">${fmtBRL(totalDia)}</span>
        </div>
      </div>`;
  }).join('');
}

function abrirDetalheDia(dia) {
  const itens  = FinState.caixaDados.filter(r => (r.data || '') === dia);
  const tbody  = document.getElementById('modal-detalhe-dia-body');
  const titulo = document.getElementById('modal-detalhe-dia-titulo');

  if (titulo) titulo.textContent = formatarData(dia);

  let totalE = 0, totalS = 0;

  if (tbody) {
    tbody.innerHTML = itens.map(r => {
      const tipo   = normalizarTipo(r);
      const vTotal = parseValor(r.valor || 0);
      const c80    = parseValor(r.valor_colaborador || 0);
      const e20    = parseValor(r.valor_empresa || 0);
      const sit    = normalizarSituacao(r);
      if (tipo === 'entrada') totalE += vTotal; else totalS += vTotal;
      return `
        <tr>
          <td style="font-size:.78rem;">${escHtml(String(r.id_pedido || r.idPedido || '—'))}</td>
          <td class="text-end" style="font-size:.78rem;">${fmtBRL(vTotal)}</td>
          <td class="text-end" style="font-size:.78rem;color:#6f42c1;">${fmtBRL(c80)}</td>
          <td class="text-end" style="font-size:.78rem;color:#0d6efd;">${fmtBRL(e20)}</td>
          <td class="text-center">${badgeSituacao(sit)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" class="text-center text-muted py-3">Nenhum lançamento.</td></tr>';
  }

  setText('modal-detalhe-dia-entradas',      fmtBRL(totalE));
  setText('modal-detalhe-dia-saidas',        fmtBRL(totalS));
  setText('modal-detalhe-dia-empresa',       fmtBRL(itens.filter(r => normalizarTipo(r) === 'entrada').reduce((s, r) => s + parseValor(r.valor_empresa || 0), 0)));
  setText('modal-detalhe-dia-colaboradores', fmtBRL(itens.filter(r => normalizarTipo(r) === 'entrada').reduce((s, r) => s + parseValor(r.valor_colaborador || 0), 0)));

  new bootstrap.Modal(document.getElementById('modalDetalheDia')).show();
}

function renderRepasses() {
  const container = document.getElementById('repasses-lista');
  if (!container) return;

  const dados    = FinState.caixaDados.length ? FinState.caixaDados : FinState.todos;
  const entradas = dados.filter(r => normalizarTipo(r) === 'entrada');

  const por = {};
  entradas.forEach(r => {
    const nome = r.nome_colaborador || r.colaborador || r.motoboy || 'Sem colaborador';
    const val  = parseValor(r.valor_colaborador || 0);
    por[nome]  = (por[nome] || 0) + val;
  });

  const itens = Object.entries(por).sort((a, b) => b[1] - a[1]);

  if (!itens.length) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-people" style="font-size:2rem;opacity:.3;display:block;margin-bottom:10px;"></i>
        Nenhum dado disponível.
      </div>`;
    return;
  }

  container.innerHTML = itens.map(([nome, val]) => `
    <div class="d-flex justify-content-between align-items-center py-2 px-2"
      style="border-bottom:1px solid #f0f0f0;">
      <div class="d-flex align-items-center gap-2">
        <div style="width:32px;height:32px;border-radius:50%;background:#f3e8ff;
          display:flex;align-items:center;justify-content:center;font-size:.85rem;">
          <i class="bi bi-person" style="color:#6f42c1;"></i>
        </div>
        <span style="font-size:.82rem;font-weight:600;">${escHtml(nome)}</span>
      </div>
      <span style="font-size:.82rem;font-weight:700;color:#6f42c1;">${fmtBRL(val)}</span>
    </div>`).join('');
}

let _caixaOculto = false;
function toggleCaixaValores() {
  _caixaOculto = !_caixaOculto;
  document.querySelectorAll('.fin-valor-caixa').forEach(el => {
    el.style.filter = _caixaOculto ? 'blur(6px)' : '';
  });
  const icon = document.getElementById('icon-toggle-caixa-val');
  if (icon) icon.className = _caixaOculto ? 'bi bi-eye' : 'bi bi-eye-slash';
  document.getElementById('btn-toggle-caixa-valores')?.classList.toggle('oculto', !_caixaOculto);
}

function bindEventsExtrato() {
  document.querySelectorAll('.extrato-periodo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.extrato-periodo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.getElementById('btn-gerar-extrato')?.addEventListener('click', gerarExtrato);
}

function preencherSelectExtrato() {
  const grp = document.getElementById('extrato-opt-motoboys');
  if (!grp) return;
  grp.innerHTML = FinState.colaboradores.map(c => {
    const id   = c.id   || '';
    const nome = c.colaborador || c.nome || c.username || '?';
    return `<option value="${escHtml(String(id))}">${escHtml(nome)}</option>`;
  }).join('');
}

async function gerarExtrato() {
  const ini    = document.getElementById('extrato-data-inicio')?.value;
  const fim    = document.getElementById('extrato-data-fim')?.value;
  const origem = document.getElementById('extrato-origem')?.value;

  if (!ini || !fim) {
    Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Selecione o período.', confirmButtonColor: '#dc3545' });
    return;
  }

  const lista       = document.getElementById('extrato-lista');
  const placeholder = document.getElementById('extrato-placeholder');
  if (placeholder) placeholder.style.display = 'none';
  if (lista) lista.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border spinner-border-sm text-danger"></div>
      <div class="mt-2 text-muted" style="font-size:.78rem;">Gerando extrato...</div>
    </div>`;

  try {
    const res = await finApi({ action: 'getFinanceiroCompleto' });
    let todos = (res?.status === 'success' && Array.isArray(res.data))
      ? res.data
      : (Array.isArray(res) ? res : []);

    const iniDate = new Date(ini);
    const fimDate = new Date(fim);
    fimDate.setHours(23, 59, 59);

    let dados = todos.filter(r => {
      const d = parsarDataParaDate(r.data || '');
      return d >= iniDate && d <= fimDate;
    });

    if (origem && origem !== '__caixa__') {
      dados = dados.filter(r =>
        String(r.colaborador_id || r.motoboy || '') === String(origem) ||
        String(r.id || '') === String(origem)
      );
    }

    renderExtrato(dados, ini, fim);
  } catch (e) {
    console.error('[Fin] gerarExtrato():', e.message);
    if (lista) lista.innerHTML = `
      <div class="text-center text-danger py-4" style="font-size:.8rem;">
        <i class="bi bi-exclamation-triangle" style="font-size:1.4rem;display:block;margin-bottom:6px;"></i>
        Falha ao gerar extrato.
      </div>`;
  }
}

function renderExtrato(dados, ini, fim) {
  const lista = document.getElementById('extrato-lista');
  if (!lista) return;

  if (!dados.length) {
    lista.innerHTML = `
      <div class="text-center text-muted py-5" style="font-size:.8rem;">
        <i class="bi bi-file-earmark-x" style="font-size:1.4rem;display:block;opacity:.4;margin-bottom:6px;"></i>
        Nenhum lançamento encontrado para o período.
      </div>`;
    return;
  }

  const totalE = dados.filter(r => normalizarTipo(r) === 'entrada')
    .reduce((s, r) => s + parseValor(r.valor || 0), 0);
  const totalS = dados.filter(r => normalizarTipo(r) === 'saida')
    .reduce((s, r) => s + parseValor(r.valor || 0), 0);
  const totalColabs  = dados.filter(r => normalizarTipo(r) === 'entrada')
    .reduce((s, r) => s + parseValor(r.valor_colaborador || 0), 0);
  const totalEmpresa = dados.filter(r => normalizarTipo(r) === 'entrada')
    .reduce((s, r) => s + parseValor(r.valor_empresa || 0), 0);

  lista.innerHTML = `
    <div class="extrato-resumo-header p-3 mb-2 rounded-3" style="background:#f8f9fa;border:1px solid #dee2e6;">
      <div class="d-flex justify-content-between flex-wrap gap-2" style="font-size:.78rem;">
        <span><strong>Período:</strong> ${formatarData(ini.split('-').reverse().join('/'))} até ${formatarData(fim.split('-').reverse().join('/'))}</span>
        <span class="text-success fw-bold"><i class="bi bi-arrow-down-circle me-1"></i>Receitas: ${fmtBRL(totalE)}</span>
        <span class="text-danger fw-bold"><i class="bi bi-arrow-up-circle me-1"></i>Despesas: ${fmtBRL(totalS)}</span>
        <span class="fw-bold" style="color:#0d6efd;"><i class="bi bi-building me-1"></i>Empresa: ${fmtBRL(totalEmpresa)}</span>
        <span class="fw-bold" style="color:#6f42c1;"><i class="bi bi-person-check me-1"></i>Colabs: ${fmtBRL(totalColabs)}</span>
      </div>
    </div>
    ${dados.map(r => {
      const tipo = normalizarTipo(r);
      const val  = parseValor(r.valor || 0);
      const sit  = normalizarSituacao(r);
      return `
        <div class="d-flex justify-content-between align-items-center py-2 px-2"
          style="border-bottom:1px solid #f5f5f5;font-size:.78rem;">
          <div>
            <span class="fw-bold">${formatarData(r.data || '')}</span>
            <span class="text-muted ms-2">${escHtml(String(r.id_pedido || r.idPedido || '—'))}</span>
            <span class="ms-2">${escHtml(String(r.descricao || ''))}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            ${badgeSituacao(sit)}
            <span class="fw-bold ${tipo === 'entrada' ? 'text-success' : 'text-danger'}">
              ${tipo === 'entrada' ? '+' : '-'}${fmtBRL(val)}
            </span>
          </div>
        </div>`;
    }).join('')}`;
}

function bindEventsModais() {
  document.getElementById('fin-valor')?.addEventListener('input', atualizarPreviewComissao);
  document.getElementById('fin-colaborador-id')?.addEventListener('change', atualizarPreviewComissao);
  document.getElementById('btn-salvar-novo-fin')?.addEventListener('click', salvarLancamento);

  document.getElementById('btn-confirmar-delete-fin')?.addEventListener('click', async () => {
    if (!FinState.deletePendingId) return;
    await executarDelete(FinState.deletePendingId);
    bootstrap.Modal.getInstance(document.getElementById('modalConfirmDeleteFin'))?.hide();
    FinState.deletePendingId = null;
  });

  document.getElementById('btn-confirmar-add-dinheiro')?.addEventListener('click', confirmarAdicionarDinheiro);
  document.getElementById('btn-confirmar-transferir')?.addEventListener('click', confirmarTransferir);
}

function preencherSelectColaboradores() {
  const sel = document.getElementById('fin-colaborador-id');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Nenhum (apenas empresa) —</option>';
  FinState.colaboradores.forEach(c => {
    const opt       = document.createElement('option');
    opt.value       = c.id || '';
    opt.textContent = c.colaborador || c.nome || c.username || '?';
    sel.appendChild(opt);
  });
}

function abrirModalNovo() {
  document.getElementById('fin-edit-id').value = '';
  document.getElementById('form-novo-financeiro')?.reset();
  document.getElementById('fin-preview-comissao')?.classList.add('d-none');
  document.getElementById('form-novo-fin-erro')?.classList.add('d-none');
  const inp = document.getElementById('fin-data');
  if (inp) inp.value = new Date().toISOString().split('T')[0];
  new bootstrap.Modal(document.getElementById('modalNovoFinanceiro')).show();
}

function abrirModalEditar(id) {
  const reg = FinState.todos.find(r => String(r.id) === String(id));
  if (!reg) return;

  document.getElementById('fin-edit-id').value       = id;
  document.getElementById('fin-tipo').value           = reg.tipo || '';
  document.getElementById('fin-data').value           = reg.data
    ? reg.data.includes('/')
      ? reg.data.split('/').reverse().join('-')
      : reg.data
    : '';
  document.getElementById('fin-id-pedido').value      = reg.id_pedido || reg.idPedido || '';
  document.getElementById('fin-descricao').value      = reg.descricao || '';
  document.getElementById('fin-colaborador-id').value = reg.colaborador_id || '';
  document.getElementById('fin-valor').value          = fmtBRLInput(parseValor(reg.valor || 0));
  document.getElementById('fin-situacao').value       = normalizarSituacao(reg);
  document.getElementById('fin-obs').value            = reg.obs || reg.observacao || '';
  document.getElementById('form-novo-fin-erro')?.classList.add('d-none');

  atualizarPreviewComissao();
  new bootstrap.Modal(document.getElementById('modalNovoFinanceiro')).show();
}

function atualizarPreviewComissao() {
  const val      = parseValor(document.getElementById('fin-valor')?.value || '0');
  const temColab = !!document.getElementById('fin-colaborador-id')?.value;
  const preview  = document.getElementById('fin-preview-comissao');
  if (!preview) return;

  if (val > 0) {
    preview.classList.remove('d-none');
    setText('preview-valor-total',   fmtBRL(val));
    setText('preview-valor-colab',   temColab ? fmtBRL(val * 0.8) : '—');
    setText('preview-valor-empresa', fmtBRL(val * (temColab ? 0.2 : 1)));
    setText('preview-pct-colab',     temColab ? '80' : '0');
    setText('preview-pct-empresa',   temColab ? '20' : '100');
  } else {
    preview.classList.add('d-none');
  }
}

async function salvarLancamento() {
  const erroEl = document.getElementById('form-novo-fin-erro');
  const hide   = () => erroEl?.classList.add('d-none');
  const show   = msg => { if (erroEl) { erroEl.textContent = msg; erroEl.classList.remove('d-none'); } };
  hide();

  const id            = document.getElementById('fin-edit-id')?.value?.trim();
  const tipo          = document.getElementById('fin-tipo')?.value;
  const data          = document.getElementById('fin-data')?.value;
  const idPedido      = document.getElementById('fin-id-pedido')?.value?.trim();
  const descricao     = document.getElementById('fin-descricao')?.value?.trim();
  const colaboradorId = document.getElementById('fin-colaborador-id')?.value;
  const valorRaw      = document.getElementById('fin-valor')?.value;
  const situacao      = document.getElementById('fin-situacao')?.value;
  const obs           = document.getElementById('fin-obs')?.value?.trim();

  if (!tipo)      return show('Selecione o tipo.');
  if (!data)      return show('Informe a data.');
  if (!descricao) return show('Informe a descrição.');
  if (!valorRaw)  return show('Informe o valor.');

  const valor = parseValor(valorRaw);
  if (valor <= 0) return show('Valor deve ser maior que zero.');

  const dataFormatada = data.includes('-')
    ? data.split('-').reverse().join('/')
    : data;

  const payload = {
    action       : id ? 'updateFinanceiro' : 'addFinanceiro',
    tipo,
    data         : dataFormatada,
    id_pedido    : idPedido,
    descricao,
    colaborador_id: colaboradorId,
    motoboy      : colaboradorId,
    valor,
    situacao,
    obs,
    ...(id ? { id } : {}),
  };

  const btnSalvar = document.getElementById('btn-salvar-novo-fin');
  if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }

  try {
    const res = await finApi(payload);
    if (res?.status === 'success') {
      bootstrap.Modal.getInstance(document.getElementById('modalNovoFinanceiro'))?.hide();
      await carregarTudo();
      Swal.fire({ icon: 'success', title: 'Salvo!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    } else {
      show(res?.message || 'Erro ao salvar.');
    }
  } catch (e) {
    show('Falha na comunicação: ' + e.message);
  } finally {
    if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvar'; }
  }
}

function confirmarDelete(id) {
  FinState.deletePendingId = id;
  new bootstrap.Modal(document.getElementById('modalConfirmDeleteFin')).show();
}

async function executarDelete(id) {
  try {
    const res = await finApi({ action: 'deleteFinanceiro', id });
    if (res?.status === 'success') {
      await carregarTudo();
      Swal.fire({ icon: 'success', title: 'Excluído!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    } else {
      Swal.fire({ icon: 'error', title: 'Erro', text: res?.message || 'Não foi possível excluir.', confirmButtonColor: '#dc3545' });
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Erro', text: e.message, confirmButtonColor: '#dc3545' });
  }
}

async function confirmarAdicionarDinheiro() {
  const valor = parseValor(document.getElementById('add-dinheiro-valor')?.value || '0');
  const desc  = document.getElementById('add-dinheiro-descricao')?.value?.trim() || 'Entrada manual';
  if (valor <= 0) return;
  try {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const res = await finApi({
      action   : 'addFinanceiro',
      tipo     : 'RECEITA',
      data     : dataHoje,
      descricao: desc,
      valor,
      situacao : 'RECEBIDO',
    });
    if (res?.status === 'success') {
      bootstrap.Modal.getInstance(document.getElementById('modalAdicionarDinheiro'))?.hide();
      await carregarTudo();
    }
  } catch (e) { console.error(e); }
}

async function confirmarTransferir() {
  const valor   = parseValor(document.getElementById('transferir-valor')?.value  || '0');
  const destino = document.getElementById('transferir-destino')?.value?.trim()   || '';
  const desc    = document.getElementById('transferir-descricao')?.value?.trim() || 'Transferência';
  if (valor <= 0) return;
  try {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const res = await finApi({
      action   : 'addFinanceiro',
      tipo     : 'SAIDA',
      data     : dataHoje,
      descricao: `${desc}${destino ? ' → ' + destino : ''}`,
      valor,
      situacao : 'PAGO',
    });
    if (res?.status === 'success') {
      bootstrap.Modal.getInstance(document.getElementById('modalTransferir'))?.hide();
      await carregarTudo();
    }
  } catch (e) { console.error(e); }
}

function setRefreshSpinner(on) {
  const icon = document.getElementById('sync-icon-fin');
  if (icon) icon.className = on ? 'bi bi-arrow-repeat loading-spin' : 'bi bi-arrow-repeat';
  const btn = document.getElementById('btn-refresh-fin');
  if (btn) btn.disabled = on;
}

function parseValor(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtBRLInput(v) {
  return v.toFixed(2).replace('.', ',');
}

function formatarData(d) {
  if (!d) return '—';
  const s = String(d).trim();
  if (s.includes('/')) {
    const [dia, mes, ano] = s.split('/');
    if (dia && mes && ano) return `${dia.padStart(2,'0')}/${mes.padStart(2,'0')}/${ano}`;
  }
  if (s.includes('-')) {
    const [ano, mes, dia] = s.split('-');
    if (dia && mes && ano) return `${dia.padStart(2,'0')}/${mes.padStart(2,'0')}/${ano}`;
  }
  return d;
}

function badgeSituacao(sit) {
  const s = String(sit).toUpperCase().trim();
  const map = {
    'PAGO'     : ['bg-success-subtle text-success',     'check-circle',    'Pago'],
    'RECEBIDO' : ['bg-success-subtle text-success',     'check-circle',    'Recebido'],
    'PENDENTE' : ['bg-warning-subtle text-warning',     'clock',           'Pendente'],
    'CANCELADO': ['bg-secondary-subtle text-secondary', 'x-circle',        'Cancelado'],
  };
  const [cls, icon, label] = map[s] || ['bg-secondary-subtle text-secondary', 'question-circle', s || 'N/A'];
  return `<span class="badge rounded-pill ${cls}" style="font-size:.65rem;">
    <i class="bi bi-${icon} me-1"></i>${label}
  </span>`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.abrirModalEditar = abrirModalEditar;
window.confirmarDelete  = confirmarDelete;
window.abrirDetalheDia  = abrirDetalheDia;
window.initFinanceiro   = window.initFinanceiro;
