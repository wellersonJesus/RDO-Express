'use strict';

(function () {
  const STORAGE_KEY = 'rdo_relatorios_salvos';
  const MAX_RELATORIOS = 100;

  const state = {
    tabAtual: 'motoboys',
    motoboys: [],
    clientes: [],
    pedidos: [],
    relatoriosSalvos: [],
    fetching: false,
    relatorioAtual: null
  };

  let els = {};

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str.toString()));
    return div.innerHTML;
  }

  function formatarMoeda(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    return parseFloat(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    const p = iso.split('-');
    if (p.length !== 3) return iso;
    return `${p[2]}/${p[1]}/${p[0]}`;
  }

  function toISO(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function gerarIdRelatorio() {
    return 'REL' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  function relToast(msg, tipo = 'info') {
    const cores = {
      success: { bg: '#198754', icon: 'bi-check-circle-fill' },
      danger: { bg: '#dc3545', icon: 'bi-exclamation-triangle-fill' },
      warning: { bg: '#fd7e14', icon: 'bi-exclamation-circle-fill' },
      info: { bg: '#0d6efd', icon: 'bi-info-circle-fill' }
    };
    const cor = cores[tipo] || cores.info;
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;top:20px;right:20px;z-index:99999;background:${cor.bg};color:#fff;padding:12px 20px;border-radius:10px;font-size:.78rem;box-shadow:0 4px 16px rgba(0,0,0,0.18);display:flex;align-items:center;gap:8px;max-width:380px;`;
    toast.innerHTML = `<i class="bi ${cor.icon}"></i><span>${escapeHtml(msg)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .3s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, 3000);
  }

  function extrairArray(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.status === 'success' && res.data && Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (typeof res === 'object' && !Array.isArray(res)) {
      const arr = [];
      const keys = Object.keys(res);
      for (let i = 0; i < keys.length; i++) {
        const item = res[keys[i]];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          if (!item.id) item.id = keys[i];
          arr.push(item);
        }
      }
      return arr;
    }
    return [];
  }

  function bind() {
    els.btnSync = document.getElementById('btn-sync-relatorio');
    els.syncIcon = document.getElementById('sync-icon-relatorio');

    els.mbDataInicio = document.getElementById('rel-mb-data-inicio');
    els.mbDataFim = document.getElementById('rel-mb-data-fim');
    els.mbSelect = document.getElementById('rel-mb-select');
    els.btnGerarMb = document.getElementById('btn-gerar-rel-motoboy');
    els.mbLista = document.getElementById('rel-motoboys-lista');

    els.cliDataInicio = document.getElementById('rel-cli-data-inicio');
    els.cliDataFim = document.getElementById('rel-cli-data-fim');
    els.cliSelect = document.getElementById('rel-cli-select');
    els.btnGerarCli = document.getElementById('btn-gerar-rel-cliente');
    els.cliLista = document.getElementById('rel-clientes-lista');

    els.finDataInicio = document.getElementById('rel-fin-data-inicio');
    els.finDataFim = document.getElementById('rel-fin-data-fim');
    els.finTipo = document.getElementById('rel-fin-tipo');
    els.btnGerarFin = document.getElementById('btn-gerar-rel-financeiro');
    els.finLista = document.getElementById('rel-financeiro-lista');

    els.globDataInicio = document.getElementById('rel-glob-data-inicio');
    els.globDataFim = document.getElementById('rel-glob-data-fim');
    els.btnGerarGlob = document.getElementById('btn-gerar-rel-global');
    els.globLista = document.getElementById('rel-global-lista');

    els.modalOverlay = document.getElementById('modalRelatorioOverlay');
    els.modalBody = document.getElementById('modal-rel-body');
    els.modalTitulo = document.getElementById('modal-rel-titulo');
    els.modalPeriodo = document.getElementById('modal-rel-periodo');
    els.modalIcon = document.getElementById('modal-rel-icon');
    els.modalBtnFechar = document.getElementById('modal-rel-fechar');
    els.modalBtnCancelar = document.getElementById('modal-rel-btn-cancelar');
    els.modalBtnSalvar = document.getElementById('modal-rel-btn-salvar');
    els.modalBtnCopiar = document.getElementById('modal-rel-btn-copiar');
  }

  function popularSelectMotoboys() {
    if (!els.mbSelect) return;
    let html = '<option value="__todos__">Todos os motoboys</option>';
    state.motoboys.forEach(mb => {
      const nome = mb.username || mb.nome || 'Sem nome';
      html += `<option value="${escapeHtml(mb.id)}">${escapeHtml(nome)}</option>`;
    });
    els.mbSelect.innerHTML = html;
  }

  function popularSelectClientes() {
    if (!els.cliSelect) return;
    let html = '<option value="__todos__">Todos os clientes</option>';
    state.clientes.forEach(cli => {
      const nome = cli.username || cli.nome || cli.razao_social || 'Sem nome';
      html += `<option value="${escapeHtml(cli.id)}">${escapeHtml(nome)}</option>`;
    });
    els.cliSelect.innerHTML = html;
  }

  function carregarDados() {
    if (state.fetching) return;
    state.fetching = true;
    spinOn();

    const promessas = [
      window.API.call('getcolaboradores', {}),
      window.API.call('getclientes', {}),
      window.API.call('getpedidos', {}),
      window.API.call('getrelatorios', {})
    ];

    Promise.all(promessas)
      .then(resultados => {
        state.motoboys = extrairArray(resultados[0]);
        state.clientes = extrairArray(resultados[1]);
        state.pedidos = extrairArray(resultados[2]);
        state.relatoriosSalvos = extrairArray(resultados[3]);

        popularSelectMotoboys();
        popularSelectClientes();
        renderizarListas();
      })
      .catch(err => {
        console.error('[RELATORIOS] Erro:', err);
        relToast('Erro ao carregar dados.', 'danger');
      })
      .finally(() => {
        state.fetching = false;
        spinOff();
      });
  }

  function spinOn() {
    if (els.btnSync) {
      els.btnSync.classList.add('syncing');
      els.btnSync.disabled = true;
    }
    if (els.syncIcon) els.syncIcon.className = 'bi bi-arrow-repeat loading-spin';
  }

  function spinOff() {
    setTimeout(() => {
      if (els.btnSync) {
        els.btnSync.classList.remove('syncing');
        els.btnSync.disabled = false;
      }
      if (els.syncIcon) els.syncIcon.className = 'bi bi-arrow-repeat';
    }, 500);
  }

  function registrarEventos() {
    document.querySelectorAll('.rel-tab').forEach(tab => {
      tab.addEventListener('click', e => {
        e.preventDefault();
        const t = tab.getAttribute('data-tab');
        if (!t) return;
        state.tabAtual = t;
        document.querySelectorAll('.rel-tab').forEach(el => el.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.rel-tab-content').forEach(el => el.classList.remove('active'));
        const content = document.getElementById(`rel-tab-content-${t}`);
        if (content) content.classList.add('active');
        renderizarListas();
      });
    });

    if (els.btnSync) els.btnSync.addEventListener('click', () => carregarDados());
    if (els.btnGerarMb) els.btnGerarMb.addEventListener('click', () => gerarRelatorioMotoboy());
    if (els.btnGerarCli) els.btnGerarCli.addEventListener('click', () => gerarRelatorioCliente());
    if (els.btnGerarFin) els.btnGerarFin.addEventListener('click', () => gerarRelatorioFinanceiro());
    if (els.btnGerarGlob) els.btnGerarGlob.addEventListener('click', () => gerarRelatorioGlobal());
    if (els.modalBtnFechar) els.modalBtnFechar.addEventListener('click', () => fecharModalRelatorio());
    if (els.modalBtnCancelar) els.modalBtnCancelar.addEventListener('click', () => fecharModalRelatorio());
    if (els.modalBtnSalvar) els.modalBtnSalvar.addEventListener('click', () => salvarRelatorioModal());
    if (els.modalBtnCopiar) els.modalBtnCopiar.addEventListener('click', () => copiarRelatorioModal());
    if (els.modalOverlay) {
      els.modalOverlay.addEventListener('click', e => {
        if (e.target === els.modalOverlay) fecharModalRelatorio();
      });
    }
  }

  function validarDatas(inicio, fim) {
    if (!inicio || !fim) {
      relToast('Informe o período completo.', 'warning');
      return false;
    }
    if (inicio > fim) {
      relToast('Data inicial maior que final.', 'warning');
      return false;
    }
    return true;
  }

  function gerarRelatorioMotoboy() {
    const inicio = els.mbDataInicio?.value;
    const fim = els.mbDataFim?.value;
    const motoboyId = els.mbSelect?.value || '__todos__';
    if (!validarDatas(inicio, fim)) return;

    setBtnLoading(els.btnGerarMb, true);
    const titulo = motoboyId === '__todos__' ? 'Todos os motoboys' : (state.motoboys.find(m => m.id === motoboyId)?.username || 'Motoboy');

    const rel = {
      id: gerarIdRelatorio(),
      tipo: 'motoboy',
      titulo,
      data_inicio: inicio,
      data_fim: fim,
      periodoLabel: `${formatDateBR(inicio)} a ${formatDateBR(fim)}`,
      criadoEm: Date.now(),
      colaborador_id: motoboyId === '__todos__' ? '' : motoboyId,
      motoboy: titulo,
      temporario: true
    };

    setTimeout(() => {
      state.relatorioAtual = rel;
      abrirModalRelatorio(rel);
      setBtnLoading(els.btnGerarMb, false);
    }, 300);
  }

  function gerarRelatorioCliente() {
    const inicio = els.cliDataInicio?.value;
    const fim = els.cliDataFim?.value;
    const clienteId = els.cliSelect?.value || '__todos__';
    if (!validarDatas(inicio, fim)) return;

    setBtnLoading(els.btnGerarCli, true);
    const titulo = clienteId === '__todos__' ? 'Todos os clientes' : (state.clientes.find(c => c.id === clienteId)?.username || 'Cliente');

    const rel = {
      id: gerarIdRelatorio(),
      tipo: 'cliente',
      titulo,
      data_inicio: inicio,
      data_fim: fim,
      periodoLabel: `${formatDateBR(inicio)} a ${formatDateBR(fim)}`,
      criadoEm: Date.now(),
      id_cliente: clienteId === '__todos__' ? '' : clienteId,
      temporario: true
    };

    setTimeout(() => {
      state.relatorioAtual = rel;
      abrirModalRelatorio(rel);
      setBtnLoading(els.btnGerarCli, false);
    }, 300);
  }

  function gerarRelatorioFinanceiro() {
    const inicio = els.finDataInicio?.value;
    const fim = els.finDataFim?.value;
    const tipo = els.finTipo?.value || '__todos__';
    if (!validarDatas(inicio, fim)) return;

    setBtnLoading(els.btnGerarFin, true);
    const labelTipo = tipo === '__todos__' ? 'Todos' : (tipo === 'entrada' ? 'Receitas' : 'Despesas');

    const rel = {
      id: gerarIdRelatorio(),
      tipo: 'financeiro',
      titulo: `Financeiro - ${labelTipo}`,
      data_inicio: inicio,
      data_fim: fim,
      periodoLabel: `${formatDateBR(inicio)} a ${formatDateBR(fim)}`,
      criadoEm: Date.now(),
      tipo_lancamento: tipo === '__todos__' ? '' : tipo,
      temporario: true
    };

    setTimeout(() => {
      state.relatorioAtual = rel;
      abrirModalRelatorio(rel);
      setBtnLoading(els.btnGerarFin, false);
    }, 300);
  }

  function gerarRelatorioGlobal() {
    const inicio = els.globDataInicio?.value;
    const fim = els.globDataFim?.value;
    if (!validarDatas(inicio, fim)) return;

    setBtnLoading(els.btnGerarGlob, true);
    const rel = {
      id: gerarIdRelatorio(),
      tipo: 'global',
      titulo: 'Relatório Global',
      data_inicio: inicio,
      data_fim: fim,
      periodoLabel: `${formatDateBR(inicio)} a ${formatDateBR(fim)}`,
      criadoEm: Date.now(),
      temporario: true
    };

    setTimeout(() => {
      state.relatorioAtual = rel;
      abrirModalRelatorio(rel);
      setBtnLoading(els.btnGerarGlob, false);
    }, 300);
  }

  function setBtnLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  function abrirModalRelatorio(relatorio) {
    const modal = document.getElementById('modalRelatorioOverlay');
    if (!modal) {
      relToast('Modal não encontrado no DOM!', 'danger');
      console.error('[RELATORIOS] Modal #modalRelatorioOverlay não existe no DOM');
      return;
    }

    const titulo = document.getElementById('modal-rel-titulo');
    const periodo = document.getElementById('modal-rel-periodo');
    const icon = document.getElementById('modal-rel-icon');
    const body = document.getElementById('modal-rel-body');

    if (titulo) titulo.textContent = relatorio.titulo.toUpperCase();
    if (periodo) periodo.textContent = relatorio.periodoLabel;

    if (icon) {
      const icons = {
        motoboy: 'bi-bicycle',
        cliente: 'bi-people',
        financeiro: 'bi-wallet2',
        global: 'bi-globe2'
      };
      icon.className = `bi ${icons[relatorio.tipo] || 'bi-file-earmark-bar-graph'}`;
    }

    if (body) {
      body.innerHTML = '<div class="rel-modal-loading text-center py-5"><div class="spinner-border text-danger"></div><div class="mt-3" style="font-size:.8rem;color:#999;">Gerando relatório<span class="rel-dots"></span></div></div>';
    }

    // ✅ Mostrar modal com flexbox
    modal.style.display = 'flex';

    setTimeout(() => {
      if (body) {
        body.innerHTML = construirConteudoRelatorio(relatorio);
      }
    }, 1200);
  }

  function fecharModalRelatorio() {
    const modal = document.getElementById('modalRelatorioOverlay');
    if (modal) {
      modal.style.display = 'none';
      state.relatorioAtual = null;
    }
  }

  function salvarRelatorioModal() {
    if (!state.relatorioAtual) {
      relToast('Nenhum relatório para salvar.', 'warning');
      return;
    }

    const btnSalvar = document.getElementById('modal-rel-btn-salvar');
    if (!btnSalvar) return;

    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

    const payload = {
      id: state.relatorioAtual.id,
      tipo: state.relatorioAtual.tipo,
      titulo: state.relatorioAtual.titulo,
      data_inicio: state.relatorioAtual.data_inicio,
      data_fim: state.relatorioAtual.data_fim,
      periodoLabel: state.relatorioAtual.periodoLabel,
      criadoEm: state.relatorioAtual.criadoEm || Date.now(),
      colaborador_id: state.relatorioAtual.colaborador_id || '',
      id_cliente: state.relatorioAtual.id_cliente || '',
      tipo_lancamento: state.relatorioAtual.tipo_lancamento || ''
    };

    window.API.call('addrelatorio', payload)
      .then(res => {
        if (res && res.status === 'success') {
          const index = state.relatoriosSalvos.findIndex(r => r.id === payload.id);
          if (index === -1) {
            state.relatoriosSalvos.unshift(payload);
          }
          renderizarListas();
          relToast('Relatório salvo com sucesso!', 'success');
          fecharModalRelatorio();
        } else {
          throw new Error(res?.message || 'Erro desconhecido ao salvar');
        }
      })
      .catch(err => {
        console.error('[RELATORIOS] Erro ao salvar:', err);
        relToast('Erro ao salvar relatório: ' + err.message, 'danger');
      })
      .finally(() => {
        if (btnSalvar) {
          btnSalvar.disabled = false;
          btnSalvar.innerHTML = '<i class="bi bi-save"></i><span>Salvar Relatório</span>';
        }
      });
  }

  function copiarRelatorioModal() {
    if (!els.modalBody) return;
    const texto = els.modalBody.innerText;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(() => relToast('Relatório copiado!', 'success'))
        .catch(() => relToast('Erro ao copiar.', 'danger'));
    } else {
      relToast('Navegador não suporta cópia.', 'warning');
    }
  }

  function construirConteudoRelatorio(relatorio) {
    let html = '<div class="rel-modal-content-inner">';

    html += '<div class="rel-modal-section">';
    html += '<div class="rel-modal-section-title"><i class="bi bi-info-circle"></i> Informações</div>';
    html += '<div class="rel-modal-grid">';
    html += `<div class="rel-modal-card"><div class="rel-modal-card-label">Tipo</div><div class="rel-modal-card-value">${escapeHtml(relatorio.tipo)}</div></div>`;
    html += `<div class="rel-modal-card"><div class="rel-modal-card-label">Período</div><div class="rel-modal-card-value">${escapeHtml(relatorio.periodoLabel)}</div></div>`;
    html += `<div class="rel-modal-card"><div class="rel-modal-card-label">ID</div><div class="rel-modal-card-value">${escapeHtml(relatorio.id)}</div></div>`;
    html += '</div></div>';

    html += '<div class="rel-modal-divider"></div>';

    html += '<div class="rel-modal-section">';
    html += '<div class="rel-modal-section-title"><i class="bi bi-calculator"></i> Resumo</div>';
    html += '<div class="rel-modal-grid">';
    html += '<div class="rel-modal-card rel-card-success"><div class="rel-modal-card-label">Total Receitas</div><div class="rel-modal-card-value">R$ 12.500,00</div></div>';
    html += '<div class="rel-modal-card rel-card-danger"><div class="rel-modal-card-label">Total Despesas</div><div class="rel-modal-card-value">R$ 3.200,00</div></div>';
    html += '</div></div>';

    html += '</div>';
    return html;
  }

  function renderizarListas() {
    renderizarListaMotoboys();
    renderizarListaClientes();
    renderizarListaFinanceiro();
    renderizarListaGlobal();
  }

  function renderizarListaMotoboys() {
    if (!els.mbLista) return;
    const relatorios = state.relatoriosSalvos.filter(r => r && r.tipo === 'motoboy' && !r.temporario);

    if (!relatorios.length) {
      els.mbLista.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório salvo.</span></div>';
      return;
    }

    let html = '';
    relatorios.forEach(rel => {
      const dtCriado = rel.criadoEm ? new Date(rel.criadoEm).toLocaleString('pt-BR') : 'Data não disponível';
      html += `
    <div class="rel-item-card">
      <div class="rel-item-left">
        <div class="rel-item-icon"><i class="bi bi-bicycle"></i></div>
        <div class="rel-item-info">
          <div class="rel-item-titulo">${escapeHtml(rel.titulo || 'Sem título')}</div>
          <div class="rel-item-sub">${escapeHtml(rel.periodoLabel || 'Sem período')} • ${dtCriado}</div>
        </div>
      </div>
      <div class="rel-item-actions">
        <button class="rel-item-btn rel-btn-view" data-id="${escapeHtml(rel.id)}"><i class="bi bi-eye"></i></button>
        <button class="rel-item-btn rel-btn-delete" data-id="${escapeHtml(rel.id)}"><i class="bi bi-trash"></i></button>
      </div>
    </div>`;
    });
    els.mbLista.innerHTML = html;
    bindAcoesLista();
  }

  function renderizarListaClientes() {
    if (!els.cliLista) return;
    const relatorios = state.relatoriosSalvos.filter(r => r && r.tipo === 'cliente' && !r.temporario);

    if (!relatorios.length) {
      els.cliLista.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório salvo.</span></div>';
      return;
    }

    let html = '';
    relatorios.forEach(rel => {
      const dtCriado = rel.criadoEm ? new Date(rel.criadoEm).toLocaleString('pt-BR') : 'Data não disponível';
      html += `
    <div class="rel-item-card">
      <div class="rel-item-left">
        <div class="rel-item-icon"><i class="bi bi-people"></i></div>
        <div class="rel-item-info">
          <div class="rel-item-titulo">${escapeHtml(rel.titulo || 'Sem título')}</div>
          <div class="rel-item-sub">${escapeHtml(rel.periodoLabel || 'Sem período')} • ${dtCriado}</div>
        </div>
      </div>
      <div class="rel-item-actions">
        <button class="rel-item-btn rel-btn-view" data-id="${escapeHtml(rel.id)}"><i class="bi bi-eye"></i></button>
        <button class="rel-item-btn rel-btn-delete" data-id="${escapeHtml(rel.id)}"><i class="bi bi-trash"></i></button>
      </div>
    </div>`;
    });
    els.cliLista.innerHTML = html;
    bindAcoesLista();
  }

  function renderizarListaFinanceiro() {
    if (!els.finLista) return;
    const relatorios = state.relatoriosSalvos.filter(r => r && r.tipo === 'financeiro' && !r.temporario);

    if (!relatorios.length) {
      els.finLista.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório salvo.</span></div>';
      return;
    }

    let html = '';
    relatorios.forEach(rel => {
      const dtCriado = rel.criadoEm ? new Date(rel.criadoEm).toLocaleString('pt-BR') : 'Data não disponível';
      html += `
    <div class="rel-item-card">
      <div class="rel-item-left">
        <div class="rel-item-icon"><i class="bi bi-wallet2"></i></div>
        <div class="rel-item-info">
          <div class="rel-item-titulo">${escapeHtml(rel.titulo || 'Sem título')}</div>
          <div class="rel-item-sub">${escapeHtml(rel.periodoLabel || 'Sem período')} • ${dtCriado}</div>
        </div>
      </div>
      <div class="rel-item-actions">
        <button class="rel-item-btn rel-btn-view" data-id="${escapeHtml(rel.id)}"><i class="bi bi-eye"></i></button>
        <button class="rel-item-btn rel-btn-delete" data-id="${escapeHtml(rel.id)}"><i class="bi bi-trash"></i></button>
      </div>
    </div>`;
    });
    els.finLista.innerHTML = html;
    bindAcoesLista();
  }

  function renderizarListaGlobal() {
    if (!els.globLista) return;
    const relatorios = state.relatoriosSalvos.filter(r => r && r.tipo === 'global' && !r.temporario);

    if (!relatorios.length) {
      els.globLista.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório salvo.</span></div>';
      return;
    }

    let html = '';
    relatorios.forEach(rel => {
      const dtCriado = rel.criadoEm ? new Date(rel.criadoEm).toLocaleString('pt-BR') : 'Data não disponível';
      html += `
    <div class="rel-item-card">
      <div class="rel-item-left">
        <div class="rel-item-icon"><i class="bi bi-globe2"></i></div>
        <div class="rel-item-info">
          <div class="rel-item-titulo">${escapeHtml(rel.titulo || 'Sem título')}</div>
          <div class="rel-item-sub">${escapeHtml(rel.periodoLabel || 'Sem período')} • ${dtCriado}</div>
        </div>
      </div>
      <div class="rel-item-actions">
        <button class="rel-item-btn rel-btn-view" data-id="${escapeHtml(rel.id)}"><i class="bi bi-eye"></i></button>
        <button class="rel-item-btn rel-btn-delete" data-id="${escapeHtml(rel.id)}"><i class="bi bi-trash"></i></button>
      </div>
    </div>`;
    });
    els.globLista.innerHTML = html;
    bindAcoesLista();
  }

  function bindAcoesLista() {
    document.querySelectorAll('.rel-btn-view').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const id = b.dataset.id;
        const r = state.relatoriosSalvos.find(rel => rel.id === id);
        if (r) {
          state.relatorioAtual = r;
          abrirModalRelatorio(r);
        }
      });
    });

    document.querySelectorAll('.rel-btn-delete').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const id = b.dataset.id;
        if (confirm('Excluir este relatório?')) {
          window.API.call('deleterelatorio', { id })
            .then(() => {
              state.relatoriosSalvos = state.relatoriosSalvos.filter(r => r.id !== id);
              renderizarListas();
              relToast('Relatório excluído!', 'success');
            })
            .catch(err => {
              relToast('Erro ao excluir: ' + err.message, 'danger');
            });
        }
      });
    });
  }

  window.initRelatorios = function () {
    bind();
    registrarEventos();

    const hoje = toISO(new Date());
    if (els.mbDataInicio) els.mbDataInicio.value = hoje;
    if (els.mbDataFim) els.mbDataFim.value = hoje;
    if (els.cliDataInicio) els.cliDataInicio.value = hoje;
    if (els.cliDataFim) els.cliDataFim.value = hoje;
    if (els.finDataInicio) els.finDataInicio.value = hoje;
    if (els.finDataFim) els.finDataFim.value = hoje;
    if (els.globDataInicio) els.globDataInicio.value = hoje;
    if (els.globDataFim) els.globDataFim.value = hoje;

    carregarDados();
  };

})();
