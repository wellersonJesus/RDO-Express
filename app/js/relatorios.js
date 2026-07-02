'use strict';

(function() {

  const STORAGE_KEY = 'rdo_relatorios_salvos';
  const MAX_RELATORIOS = 100;

  const state = {
    tabAtual: 'motoboys',
    motoboys: [],
    clientes: [],
    relatoriosSalvos: [],
    fetching: false
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
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function carregarRelatoriosStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function salvarRelatoriosStorage(lista) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch (e) {}
  }

  function adicionarRelatorio(relatorio) {
    let lista = carregarRelatoriosStorage();
    lista.unshift(relatorio);
    if (lista.length > MAX_RELATORIOS) {
      lista = lista.slice(0, MAX_RELATORIOS);
    }
    salvarRelatoriosStorage(lista);
    state.relatoriosSalvos = lista;
  }

  function removerRelatorio(id) {
    let lista = carregarRelatoriosStorage();
    lista = lista.filter(r => r.id !== id);
    salvarRelatoriosStorage(lista);
    state.relatoriosSalvos = lista;
  }

  function buscarRelatorio(id) {
    const lista = carregarRelatoriosStorage();
    return lista.find(r => r.id === id);
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
  }

  function popularSelectMotoboys() {
    if (!els.mbSelect) return;
    if (!state.motoboys.length) {
      els.mbSelect.innerHTML = '<option value="__todos__">Todos os motoboys</option>';
      return;
    }
    let html = '<option value="__todos__">Todos os motoboys</option>';
    state.motoboys.forEach(mb => {
      const nome = mb.username || mb.nome || 'Sem nome';
      html += `<option value="${escapeHtml(mb.id)}">${escapeHtml(nome)}</option>`;
    });
    els.mbSelect.innerHTML = html;
  }

  function popularSelectClientes() {
    if (!els.cliSelect) return;
    if (!state.clientes.length) {
      els.cliSelect.innerHTML = '<option value="__todos__">Todos os clientes</option>';
      return;
    }
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
      window.API.call('getcolaboradores', {}).catch(() => []),
      window.API.call('getclientes', {}).catch(() => [])
    ];

    Promise.all(promessas)
      .then(resultados => {
        const rawColabs = extrairArray(resultados[0]);
        const rawClientes = extrairArray(resultados[1]);

        state.motoboys = rawColabs.filter(c => c && c.id);
        state.clientes = rawClientes.filter(c => c && c.id);

        popularSelectMotoboys();
        popularSelectClientes();

        state.relatoriosSalvos = carregarRelatoriosStorage();
        renderizarListas();
      })
      .catch(() => {
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
    if (els.syncIcon) {
      els.syncIcon.className = 'bi bi-arrow-repeat loading-spin';
    }
  }

  function spinOff() {
    setTimeout(() => {
      if (els.btnSync) {
        els.btnSync.classList.remove('syncing');
        els.btnSync.disabled = false;
      }
      if (els.syncIcon) {
        els.syncIcon.className = 'bi bi-arrow-repeat';
      }
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

    if (els.btnSync) {
      els.btnSync.addEventListener('click', () => carregarDados());
    }

    if (els.btnGerarMb) {
      els.btnGerarMb.addEventListener('click', () => gerarRelatorioMotoboy());
    }

    if (els.btnGerarCli) {
      els.btnGerarCli.addEventListener('click', () => gerarRelatorioCliente());
    }

    if (els.btnGerarFin) {
      els.btnGerarFin.addEventListener('click', () => gerarRelatorioFinanceiro());
    }

    if (els.btnGerarGlob) {
      els.btnGerarGlob.addEventListener('click', () => gerarRelatorioGlobal());
    }
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

  function validarDatas(dataInicio, dataFim) {
    if (!dataInicio || !dataFim) {
      relToast('Informe o período (Data Inicial e Data Final).', 'warning');
      return false;
    }
    if (dataInicio > dataFim) {
      relToast('Data inicial não pode ser maior que a data final.', 'warning');
      return false;
    }
    return true;
  }

  function gerarRelatorioMotoboy() {
    const dataInicio = els.mbDataInicio ? els.mbDataInicio.value : '';
    const dataFim = els.mbDataFim ? els.mbDataFim.value : '';
    const motoboyId = els.mbSelect ? els.mbSelect.value : '__todos__';

    if (!validarDatas(dataInicio, dataFim)) return;

    setBtnLoading(els.btnGerarMb, true);

    const motoboyNome = motoboyId === '__todos__' 
      ? 'Todos os motoboys' 
      : (state.motoboys.find(m => m.id === motoboyId)?.username || 'Motoboy');

    const relatorio = {
      id: gerarIdRelatorio(),
      tipo: 'motoboy',
      titulo: motoboyNome,
      dataInicio,
      dataFim,
      periodoLabel: `${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}`,
      criadoEm: Date.now(),
      filtros: { motoboyId }
    };

    setTimeout(() => {
      adicionarRelatorio(relatorio);
      renderizarListas();
      relToast('Relatório gerado com sucesso!', 'success');
      setBtnLoading(els.btnGerarMb, false);
    }, 800);
  }

  function gerarRelatorioCliente() {
    const dataInicio = els.cliDataInicio ? els.cliDataInicio.value : '';
    const dataFim = els.cliDataFim ? els.cliDataFim.value : '';
    const clienteId = els.cliSelect ? els.cliSelect.value : '__todos__';

    if (!validarDatas(dataInicio, dataFim)) return;

    setBtnLoading(els.btnGerarCli, true);

    const clienteNome = clienteId === '__todos__' 
      ? 'Todos os clientes' 
      : (state.clientes.find(c => c.id === clienteId)?.username || 'Cliente');

    const relatorio = {
      id: gerarIdRelatorio(),
      tipo: 'cliente',
      titulo: clienteNome,
      dataInicio,
      dataFim,
      periodoLabel: `${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}`,
      criadoEm: Date.now(),
      filtros: { clienteId }
    };

    setTimeout(() => {
      adicionarRelatorio(relatorio);
      renderizarListas();
      relToast('Relatório gerado com sucesso!', 'success');
      setBtnLoading(els.btnGerarCli, false);
    }, 800);
  }

  function gerarRelatorioFinanceiro() {
    const dataInicio = els.finDataInicio ? els.finDataInicio.value : '';
    const dataFim = els.finDataFim ? els.finDataFim.value : '';
    const tipo = els.finTipo ? els.finTipo.value : '__todos__';

    if (!validarDatas(dataInicio, dataFim)) return;

    setBtnLoading(els.btnGerarFin, true);

    const tipoLabel = tipo === '__todos__' ? 'Todos' : (tipo === 'entrada' ? 'Receitas' : 'Despesas');

    const relatorio = {
      id: gerarIdRelatorio(),
      tipo: 'financeiro',
      titulo: `Financeiro - ${tipoLabel}`,
      dataInicio,
      dataFim,
      periodoLabel: `${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}`,
      criadoEm: Date.now(),
      filtros: { tipoFinanceiro: tipo }
    };

    setTimeout(() => {
      adicionarRelatorio(relatorio);
      renderizarListas();
      relToast('Relatório gerado com sucesso!', 'success');
      setBtnLoading(els.btnGerarFin, false);
    }, 800);
  }

  function gerarRelatorioGlobal() {
    const dataInicio = els.globDataInicio ? els.globDataInicio.value : '';
    const dataFim = els.globDataFim ? els.globDataFim.value : '';

    if (!validarDatas(dataInicio, dataFim)) return;

    setBtnLoading(els.btnGerarGlob, true);

    const relatorio = {
      id: gerarIdRelatorio(),
      tipo: 'global',
      titulo: 'Relatório Global',
      dataInicio,
      dataFim,
      periodoLabel: `${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}`,
      criadoEm: Date.now(),
      filtros: {}
    };

    setTimeout(() => {
      adicionarRelatorio(relatorio);
      renderizarListas();
      relToast('Relatório global gerado com sucesso!', 'success');
      setBtnLoading(els.btnGerarGlob, false);
    }, 800);
  }

  function renderizarListas() {
    renderizarListaMotoboys();
    renderizarListaClientes();
    renderizarListaFinanceiro();
    renderizarListaGlobal();
  }

  function renderizarListaMotoboys() {
    if (!els.mbLista) return;
    const relatorios = state.relatoriosSalvos.filter(r => r.tipo === 'motoboy');
    if (!relatorios.length) {
      els.mbLista.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório salvo ainda.</span></div>';
      return;
    }
    let html = '';
    relatorios.forEach(rel => {
      const criadoLabel = new Date(rel.criadoEm).toLocaleString('pt-BR');
      html += `
        <div class="rel-item-card" data-id="${escapeHtml(rel.id)}">
          <div class="rel-item-left">
            <div class="rel-item-icon">
              <i class="bi bi-bicycle"></i>
            </div>
            <div class="rel-item-info">
              <div class="rel-item-titulo">${escapeHtml(rel.titulo)}</div>
              <div class="rel-item-sub">${escapeHtml(rel.periodoLabel)} • ${criadoLabel}</div>
            </div>
          </div>
          <div class="rel-item-actions">
            <button class="rel-item-btn rel-btn-view" data-id="${escapeHtml(rel.id)}" title="Visualizar">
              <i class="bi bi-eye"></i>
            </button>
            <button class="rel-item-btn rel-btn-delete" data-id="${escapeHtml(rel.id)}" title="Excluir">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    els.mbLista.innerHTML = html;
    bindAcoesLista();
  }

  function renderizarListaClientes() {
    if (!els.cliLista) return;
    const relatorios = state.relatoriosSalvos.filter(r => r.tipo === 'cliente');
    if (!relatorios.length) {
      els.cliLista.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório salvo ainda.</span></div>';
      return;
    }
    let html = '';
    relatorios.forEach(rel => {
      const criadoLabel = new Date(rel.criadoEm).toLocaleString('pt-BR');
      html += `
        <div class="rel-item-card" data-id="${escapeHtml(rel.id)}">
          <div class="rel-item-left">
            <div class="rel-item-icon">
              <i class="bi bi-people"></i>
            </div>
            <div class="rel-item-info">
              <div class="rel-item-titulo">${escapeHtml(rel.titulo)}</div>
              <div class="rel-item-sub">${escapeHtml(rel.periodoLabel)} • ${criadoLabel}</div>
            </div>
          </div>
          <div class="rel-item-actions">
            <button class="rel-item-btn rel-btn-view" data-id="${escapeHtml(rel.id)}" title="Visualizar">
              <i class="bi bi-eye"></i>
            </button>
            <button class="rel-item-btn rel-btn-delete" data-id="${escapeHtml(rel.id)}" title="Excluir">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    els.cliLista.innerHTML = html;
    bindAcoesLista();
  }

  function renderizarListaFinanceiro() {
    if (!els.finLista) return;
    const relatorios = state.relatoriosSalvos.filter(r => r.tipo === 'financeiro');
    if (!relatorios.length) {
      els.finLista.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório salvo ainda.</span></div>';
      return;
    }
    let html = '';
    relatorios.forEach(rel => {
      const criadoLabel = new Date(rel.criadoEm).toLocaleString('pt-BR');
      html += `
        <div class="rel-item-card" data-id="${escapeHtml(rel.id)}">
          <div class="rel-item-left">
            <div class="rel-item-icon">
              <i class="bi bi-wallet2"></i>
            </div>
            <div class="rel-item-info">
              <div class="rel-item-titulo">${escapeHtml(rel.titulo)}</div>
              <div class="rel-item-sub">${escapeHtml(rel.periodoLabel)} • ${criadoLabel}</div>
            </div>
          </div>
          <div class="rel-item-actions">
            <button class="rel-item-btn rel-btn-view" data-id="${escapeHtml(rel.id)}" title="Visualizar">
              <i class="bi bi-eye"></i>
            </button>
            <button class="rel-item-btn rel-btn-delete" data-id="${escapeHtml(rel.id)}" title="Excluir">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    els.finLista.innerHTML = html;
    bindAcoesLista();
  }

  function renderizarListaGlobal() {
    if (!els.globLista) return;
    const relatorios = state.relatoriosSalvos.filter(r => r.tipo === 'global');
    if (!relatorios.length) {
      els.globLista.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório salvo ainda.</span></div>';
      return;
    }
    let html = '';
    relatorios.forEach(rel => {
      const criadoLabel = new Date(rel.criadoEm).toLocaleString('pt-BR');
      html += `
        <div class="rel-item-card" data-id="${escapeHtml(rel.id)}">
          <div class="rel-item-left">
            <div class="rel-item-icon">
              <i class="bi bi-globe2"></i>
            </div>
            <div class="rel-item-info">
              <div class="rel-item-titulo">${escapeHtml(rel.titulo)}</div>
              <div class="rel-item-sub">${escapeHtml(rel.periodoLabel)} • ${criadoLabel}</div>
            </div>
          </div>
          <div class="rel-item-actions">
            <button class="rel-item-btn rel-btn-view" data-id="${escapeHtml(rel.id)}" title="Visualizar">
              <i class="bi bi-eye"></i>
            </button>
            <button class="rel-item-btn rel-btn-delete" data-id="${escapeHtml(rel.id)}" title="Excluir">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    });
    els.globLista.innerHTML = html;
    bindAcoesLista();
  }

  function bindAcoesLista() {
    document.querySelectorAll('.rel-btn-view').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const rel = buscarRelatorio(id);
        if (rel) visualizarRelatorio(rel);
      });
    });

    document.querySelectorAll('.rel-btn-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        confirmarExclusaoRelatorio(id);
      });
    });
  }

  function visualizarRelatorio(rel) {
    alert(`Visualizar Relatório:\n\nID: ${rel.id}\nTipo: ${rel.tipo}\nTítulo: ${rel.titulo}\nPeríodo: ${rel.periodoLabel}`);
  }

  function confirmarExclusaoRelatorio(id) {
    if (confirm('Deseja realmente excluir este relatório?')) {
      removerRelatorio(id);
      renderizarListas();
      relToast('Relatório excluído.', 'info');
    }
  }

  window.initRelatorios = function() {
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
