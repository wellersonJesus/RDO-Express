(function () {
  'use strict';

  const MODAL_ID = 'modalRelatorioFin';
  let _modalCarregado = false;

  function _garantirModalNoDOM() {
    if (document.getElementById(MODAL_ID)) {
      _modalCarregado = true;
      return Promise.resolve();
    }
    return fetch('/pages/fin/modal_relatorio_fin.html')
      .then((res) => res.text())
      .then((html) => {
        document.body.insertAdjacentHTML('beforeend', html);
        _modalCarregado = true;
        _bindBotoesModal();
      });
  }

  function _bindBotoesModal() {
    const modal = document.getElementById(MODAL_ID);
    document.getElementById('relFin-btn-fechar').onclick = fecharModalRelatorioFin;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) fecharModalRelatorioFin();
    });
    document.getElementById('relFin-btn-copiar').onclick = _copiarRelatorio;
    document.getElementById('relFin-btn-pdf').onclick = _imprimirRelatorio;
  }

  function fecharModalRelatorioFin() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.style.display = 'none';
  }

  function _copiarRelatorio() {
    const body = document.getElementById('relFin-body');
    const texto = body ? body.innerText : '';
    navigator.clipboard.writeText(texto).then(() => {
      _toastFin('Relatório copiado!');
    }).catch(() => {
      _toastFin('Não foi possível copiar.', true);
    });
  }

  function _imprimirRelatorio() {
    const resumo = document.getElementById('relFin-resumo')?.innerHTML || '';
    const body = document.getElementById('relFin-body')?.innerHTML || '';
    const titulo = document.getElementById('relFin-titulo')?.innerText || 'Relatório Financeiro';

    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>${titulo}</title>
          <meta charset="utf-8">
          <style>
            body{font-family:Arial,sans-serif;padding:24px;color:#222;}
            h2{margin-bottom:4px;}
            table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px;}
            th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;}
            th{background:#f4f4f4;}
            .resumo-item{display:inline-block;margin-right:16px;font-size:12px;}
          </style>
        </head>
        <body>
          <h2>${titulo}</h2>
          <div>${resumo}</div>
          ${body}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  function _toastFin(msg, erro) {
    // Toast simples, sem dependência externa
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `position:fixed;bottom:20px;right:20px;background:${erro ? '#dc3545' : '#198754'};
      color:#fff;padding:10px 16px;border-radius:8px;font-size:.78rem;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,.2);`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function _brl(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function _extrairTabela(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return { colunas: [], linhas: [] };

    const colunas = Array.from(table.querySelectorAll('thead th'))
      .map((th) => th.textContent.trim())
      .filter((t) => t && t.toLowerCase() !== 'ações');

    const linhas = Array.from(table.querySelectorAll('tbody tr')).map((tr) => {
      return Array.from(tr.children)
        .slice(0, colunas.length)
        .map((td) => td.textContent.trim());
    });

    return { colunas, linhas };
  }

  function _montarTabelaHtml(colunas, linhas) {
    if (!linhas.length) {
      return '<p class="text-muted text-center py-4">Nenhum registro encontrado para este relatório.</p>';
    }
    const thead = `<tr>${colunas.map((c) => `<th>${c}</th>`).join('')}</tr>`;
    const tbody = linhas
      .map((linha) => `<tr>${linha.map((v) => `<td>${v}</td>`).join('')}</tr>`)
      .join('');
    return `
      <table class="table table-sm table-hover align-middle">
        <thead style="background:#f8f9fa;">${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>`;
  }

  function _montarResumoHtml(itens) {
    return itens
      .map(
        (i) => `
        <div class="col-6 col-md-3">
          <div style="background:#f8f9fa;border-radius:10px;padding:10px 12px;">
            <div style="font-size:.62rem;color:#888;text-transform:uppercase;">${i.label}</div>
            <div style="font-size:.92rem;font-weight:700;color:${i.cor || '#212529'};">${i.valor}</div>
          </div>
        </div>`
      )
      .join('');
  }

  function _relatorioTodos() {
    const { colunas, linhas } = _extrairTabela('tabela-fin-todos');
    document.getElementById('relFin-titulo').textContent = 'RELATÓRIO — LANÇAMENTOS (RDO)';
    document.getElementById('relFin-subtitulo').textContent =
      'Gerado em ' + new Date().toLocaleString('pt-BR');

    const resumo = [
      { label: 'Receitas', valor: document.getElementById('fin-status-count-receitas')?.textContent || '0', cor: '#198754' },
      { label: 'Despesas', valor: document.getElementById('fin-status-count-despesas')?.textContent || '0', cor: '#dc3545' },
      { label: 'Pago', valor: document.getElementById('fin-status-count-pago')?.textContent || '0' },
      { label: 'Pendentes', valor: document.getElementById('fin-status-count-pendente')?.textContent || '0', cor: '#856404' },
    ];

    document.getElementById('relFin-resumo').innerHTML = _montarResumoHtml(resumo);
    document.getElementById('relFin-body').innerHTML = _montarTabelaHtml(colunas, linhas);
  }

  function _relatorioCaixa() {
    document.getElementById('relFin-titulo').textContent = 'RELATÓRIO — CAIXA (RDO PAY)';
    document.getElementById('relFin-subtitulo').textContent =
      'Gerado em ' + new Date().toLocaleString('pt-BR');

    const getVal = (id) =>
      document.getElementById(id)?.getAttribute('data-valor-real') ||
      document.getElementById(id)?.textContent ||
      _brl(0);

    const resumo = [
      { label: 'Receitas', valor: getVal('caixa-card-entradas'), cor: '#198754' },
      { label: 'Despesas', valor: getVal('caixa-card-saidas'), cor: '#dc3545' },
      { label: 'Empresa (20%)', valor: getVal('caixa-card-empresa'), cor: '#6f42c1' },
      { label: 'Colaborador (80%)', valor: getVal('caixa-card-colaboradores'), cor: '#0d6efd' },
      { label: 'Registros', valor: document.getElementById('caixa-card-registros')?.textContent || '0' },
      { label: 'Saldo Total', valor: getVal('caixa-card-saldo-total') },
    ];

    document.getElementById('relFin-resumo').innerHTML = _montarResumoHtml(resumo);

    // A "lista diária" não é uma <table>, então clonamos o conteúdo renderizado
    const lista = document.getElementById('caixa-lista-diaria');
    document.getElementById('relFin-body').innerHTML = lista
      ? `<div>${lista.innerHTML}</div>`
      : '<p class="text-muted text-center py-4">Nenhum dado disponível.</p>';
  }
  
  function _relatorioExtrato() {
    document.getElementById('relFin-titulo').textContent = 'RELATÓRIO — EXTRATO';
    document.getElementById('relFin-subtitulo').textContent =
      'Gerado em ' + new Date().toLocaleString('pt-BR');
    document.getElementById('relFin-resumo').innerHTML = '';

    const lista = document.getElementById('extrato-lista');
    const placeholder = document.getElementById('extrato-placeholder');
    const vazio = !lista || (placeholder && !placeholder.classList.contains('d-none') && lista.children.length <= 1);

    document.getElementById('relFin-body').innerHTML = vazio
      ? '<p class="text-muted text-center py-4">Gere o extrato na aba correspondente antes de visualizar o relatório.</p>'
      : `<div>${lista.innerHTML}</div>`;
  }

  /**
   * Função pública principal.
   * @param {'todos'|'caixa'|'extrato'} tipo
   */
  window.abrirModalRelatorioFin = function (tipo) {
    _garantirModalNoDOM().then(() => {
      const modal = document.getElementById(MODAL_ID);
      modal.style.display = 'flex';

      switch (tipo) {
        case 'todos':
          _relatorioTodos();
          break;
        case 'caixa':
          _relatorioCaixa();
          break;
        case 'extrato':
          _relatorioExtrato();
          break;
        default:
          console.warn('[relatorios_fin.js] Tipo de relatório inválido:', tipo);
      }
    });
  };

  window.fecharModalRelatorioFin = fecharModalRelatorioFin;

  function _bindBotoesPagina() {
    const btnTodos = document.getElementById('btn-relatorio-fin-todos');
    const btnCaixa = document.getElementById('btn-relatorio-fin-caixa');
    const btnExtrato = document.getElementById('btn-relatorio-fin-extrato');

    if (btnTodos) btnTodos.addEventListener('click', () => window.abrirModalRelatorioFin('todos'));
    if (btnCaixa) btnCaixa.addEventListener('click', () => window.abrirModalRelatorioFin('caixa'));
    if (btnExtrato) btnExtrato.addEventListener('click', () => window.abrirModalRelatorioFin('extrato'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bindBotoesPagina);
  } else {
    _bindBotoesPagina();
  }
  
})();
