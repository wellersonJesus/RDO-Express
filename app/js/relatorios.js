'use strict';

(function () {
  const state = {
    tabAtual: 'motoboys',
    motoboys: [],
    clientes: [],
    pedidos: [],
    relatoriosSalvos: [],
    fetching: false,
    relatorioAtual: null,
    paginaAtual: 1,
    itensPorPagina: 10
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
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 15).toUpperCase();
    const combined = timestamp + random;
    return combined.substring(0, 11);
  }

  function relToast(msg, tipo) {
    tipo = tipo || 'info';
    const cores = {
      success: { bg: '#198754', icon: 'bi-check-circle-fill' },
      danger: { bg: '#dc3545', icon: 'bi-exclamation-triangle-fill' },
      warning: { bg: '#fd7e14', icon: 'bi-exclamation-circle-fill' },
      info: { bg: '#0d6efd', icon: 'bi-info-circle-fill' }
    };
    const cor = cores[tipo] || cores.info;
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:' + cor.bg + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:.78rem;box-shadow:0 4px 16px rgba(0,0,0,0.18);display:flex;align-items:center;gap:8px;max-width:380px;';
    toast.innerHTML = '<i class="bi ' + cor.icon + '"></i><span>' + escapeHtml(msg) + '</span>';
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity .3s ease';
      setTimeout(function () {
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

    els.paginacao = {
      motoboys: {
        prev: document.getElementById('btn-pag-prev-motoboys'),
        next: document.getElementById('btn-pag-next-motoboys'),
        info: document.getElementById('info-paginacao-motoboys')
      },
      clientes: {
        prev: document.getElementById('btn-pag-prev-clientes'),
        next: document.getElementById('btn-pag-next-clientes'),
        info: document.getElementById('info-paginacao-clientes')
      },
      financeiro: {
        prev: document.getElementById('btn-pag-prev-financeiro'),
        next: document.getElementById('btn-pag-next-financeiro'),
        info: document.getElementById('info-paginacao-financeiro')
      },
      global: {
        prev: document.getElementById('btn-pag-prev-global'),
        next: document.getElementById('btn-pag-next-global'),
        info: document.getElementById('info-paginacao-global')
      }
    };
  }

  function popularSelectMotoboys() {
    if (!els.mbSelect) return;
    let html = '<option value="__todos__">Todos os motoboys</option>';
    state.motoboys.forEach(function (mb) {
      const nome = mb.username || mb.nome || 'Sem nome';
      html += '<option value="' + escapeHtml(mb.id) + '">' + escapeHtml(nome) + '</option>';
    });
    els.mbSelect.innerHTML = html;
  }

  function popularSelectClientes() {
    if (!els.cliSelect) return;
    let html = '<option value="__todos__">Todos os clientes</option>';
    state.clientes.forEach(function (cli) {
      const nome = cli.username || cli.nome || cli.razao_social || 'Sem nome';
      html += '<option value="' + escapeHtml(cli.id) + '">' + escapeHtml(nome) + '</option>';
    });
    els.cliSelect.innerHTML = html;
  }

  function carregarDados() {
    if (state.fetching) return;
    state.fetching = true;
    spinOn();
    exibirLoadingListas();

    const promessas = [
      window.API.call('getcolaboradores', {}),
      window.API.call('getclientes', {}),
      window.API.call('getpedidos', {}),
      window.API.call('getrelatorios', {})
    ];

    Promise.all(promessas)
      .then(function (resultados) {
        state.motoboys = extrairArray(resultados[0]);
        state.clientes = extrairArray(resultados[1]);
        state.pedidos = extrairArray(resultados[2]);
        state.relatoriosSalvos = extrairArray(resultados[3]);

        popularSelectMotoboys();
        popularSelectClientes();
        renderizarListas();
      })
      .catch(function (err) {
        console.error('[RELATORIOS] Erro:', err);
        relToast('Erro ao carregar dados.', 'danger');
        renderizarListas();
      })
      .finally(function () {
        state.fetching = false;
        spinOff();
      });
  }

  function exibirLoadingListas() {
    const loadingHtml = '<div class="rel-lista-loading"><div class="spinner-border text-danger" role="status"></div><div class="mt-3" style="font-size:.85rem;color:#999;font-weight:500;">Buscando relatórios<span class="rel-dots"></span></div></div>';

    if (els.mbLista) els.mbLista.innerHTML = loadingHtml;
    if (els.cliLista) els.cliLista.innerHTML = loadingHtml;
    if (els.finLista) els.finLista.innerHTML = loadingHtml;
    if (els.globLista) els.globLista.innerHTML = loadingHtml;
  }

  function spinOn() {
    if (els.btnSync) {
      els.btnSync.classList.add('syncing');
      els.btnSync.disabled = true;
    }
    if (els.syncIcon) els.syncIcon.className = 'bi bi-arrow-repeat loading-spin';
  }

  function spinOff() {
    setTimeout(function () {
      if (els.btnSync) {
        els.btnSync.classList.remove('syncing');
        els.btnSync.disabled = false;
      }
      if (els.syncIcon) els.syncIcon.className = 'bi bi-arrow-repeat';
    }, 500);
  }

  function registrarEventos() {
    document.querySelectorAll('.rel-tab').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        const t = tab.getAttribute('data-tab');
        if (!t) return;
        state.tabAtual = t;
        state.paginaAtual = 1;
        document.querySelectorAll('.rel-tab').forEach(function (el) { el.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('.rel-tab-content').forEach(function (el) { el.classList.remove('active'); });
        const content = document.getElementById('rel-tab-content-' + t);
        if (content) content.classList.add('active');
        renderizarListas();
      });
    });

    if (els.btnSync) els.btnSync.addEventListener('click', function () { carregarDados(); });
    if (els.btnGerarMb) els.btnGerarMb.addEventListener('click', function () { gerarRelatorioMotoboy(); });
    if (els.btnGerarCli) els.btnGerarCli.addEventListener('click', function () { gerarRelatorioCliente(); });
    if (els.btnGerarFin) els.btnGerarFin.addEventListener('click', function () { gerarRelatorioFinanceiro(); });
    if (els.btnGerarGlob) els.btnGerarGlob.addEventListener('click', function () { gerarRelatorioGlobal(); });
    if (els.modalBtnFechar) els.modalBtnFechar.addEventListener('click', function () { fecharModalRelatorio(); });
    if (els.modalBtnCancelar) els.modalBtnCancelar.addEventListener('click', function () { fecharModalRelatorio(); });
    if (els.modalBtnSalvar) els.modalBtnSalvar.addEventListener('click', function () { salvarRelatorioModal(); });
    if (els.modalBtnCopiar) els.modalBtnCopiar.addEventListener('click', function () { copiarRelatorioModal(); });
    if (els.modalOverlay) {
      els.modalOverlay.addEventListener('click', function (e) {
        if (e.target === els.modalOverlay) fecharModalRelatorio();
      });
    }

    Object.keys(els.paginacao).forEach(function (tab) {
      const p = els.paginacao[tab];
      if (p.prev) {
        p.prev.addEventListener('click', function () {
          if (state.paginaAtual > 1) {
            state.paginaAtual--;
            renderizarListas();
          }
        });
      }
      if (p.next) {
        p.next.addEventListener('click', function () {
          state.paginaAtual++;
          renderizarListas();
        });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.modalOverlay && els.modalOverlay.style.display === 'flex') {
        fecharModalRelatorio();
      }
    });
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
    const inicio = els.mbDataInicio ? els.mbDataInicio.value : '';
    const fim = els.mbDataFim ? els.mbDataFim.value : '';
    const motoboyId = (els.mbSelect && els.mbSelect.value) || '__todos__';
    if (!validarDatas(inicio, fim)) return;

    setBtnLoading(els.btnGerarMb, true);
    const mbEncontrado = state.motoboys.find(function (m) { return m.id === motoboyId; });
    const titulo = motoboyId === '__todos__' ? 'Todos os motoboys' : ((mbEncontrado && mbEncontrado.username) || 'Motoboy');

    const rel = {
      id: gerarIdRelatorio(),
      tipo: 'motoboy',
      titulo: titulo,
      data_inicio: inicio,
      data_fim: fim,
      periodoLabel: formatDateBR(inicio) + ' a ' + formatDateBR(fim),
      criadoEm: Date.now(),
      colaborador_id: motoboyId === '__todos__' ? '' : motoboyId,
      motoboy: titulo,
      temporario: true
    };

    setTimeout(function () {
      abrirModalRelatorio(rel);
      setBtnLoading(els.btnGerarMb, false);
    }, 300);
  }

  function gerarRelatorioCliente() {
    const inicio = els.cliDataInicio ? els.cliDataInicio.value : '';
    const fim = els.cliDataFim ? els.cliDataFim.value : '';
    const clienteId = (els.cliSelect && els.cliSelect.value) || '__todos__';
    if (!validarDatas(inicio, fim)) return;

    setBtnLoading(els.btnGerarCli, true);
    const cliEncontrado = state.clientes.find(function (c) { return c.id === clienteId; });
    const titulo = clienteId === '__todos__' ? 'Todos os clientes' : ((cliEncontrado && cliEncontrado.username) || 'Cliente');

    const rel = {
      id: gerarIdRelatorio(),
      tipo: 'cliente',
      titulo: titulo,
      data_inicio: inicio,
      data_fim: fim,
      periodoLabel: formatDateBR(inicio) + ' a ' + formatDateBR(fim),
      criadoEm: Date.now(),
      id_cliente: clienteId === '__todos__' ? '' : clienteId,
      temporario: true
    };

    setTimeout(function () {
      abrirModalRelatorio(rel);
      setBtnLoading(els.btnGerarCli, false);
    }, 300);
  }

  function gerarRelatorioFinanceiro() {
    const inicio = els.finDataInicio ? els.finDataInicio.value : '';
    const fim = els.finDataFim ? els.finDataFim.value : '';
    const tipo = (els.finTipo && els.finTipo.value) || '__todos__';
    if (!validarDatas(inicio, fim)) return;

    setBtnLoading(els.btnGerarFin, true);
    const labelTipo = tipo === '__todos__' ? 'Todos' : (tipo === 'entrada' ? 'Receitas' : 'Despesas');

    const rel = {
      id: gerarIdRelatorio(),
      tipo: 'financeiro',
      titulo: 'Financeiro - ' + labelTipo,
      data_inicio: inicio,
      data_fim: fim,
      periodoLabel: formatDateBR(inicio) + ' a ' + formatDateBR(fim),
      criadoEm: Date.now(),
      tipo_lancamento: tipo === '__todos__' ? '' : tipo,
      temporario: true
    };

    setTimeout(function () {
      abrirModalRelatorio(rel);
      setBtnLoading(els.btnGerarFin, false);
    }, 300);
  }

  function gerarRelatorioGlobal() {
    const inicio = els.globDataInicio ? els.globDataInicio.value : '';
    const fim = els.globDataFim ? els.globDataFim.value : '';
    if (!validarDatas(inicio, fim)) return;

    setBtnLoading(els.btnGerarGlob, true);
    const rel = {
      id: gerarIdRelatorio(),
      tipo: 'global',
      titulo: 'Relatório Global',
      data_inicio: inicio,
      data_fim: fim,
      periodoLabel: formatDateBR(inicio) + ' a ' + formatDateBR(fim),
      criadoEm: Date.now(),
      temporario: true
    };

    setTimeout(function () {
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

    state.relatorioAtual = relatorio;

    const titulo = document.getElementById('modal-rel-titulo');
    const periodo = document.getElementById('modal-rel-periodo');
    const icon = document.getElementById('modal-rel-icon');
    const body = document.getElementById('modal-rel-body');

    if (titulo) titulo.textContent = (relatorio.titulo || '').toUpperCase();
    if (periodo) periodo.textContent = relatorio.periodoLabel || '';

    if (icon) {
      const icons = {
        motoboy: 'bi-bicycle',
        cliente: 'bi-people',
        financeiro: 'bi-wallet2',
        global: 'bi-globe2'
      };
      icon.className = 'bi ' + (icons[relatorio.tipo] || 'bi-file-earmark-bar-graph');
    }

    if (body) {
      body.innerHTML = '<div class="rel-modal-loading text-center py-5"><div class="spinner-border text-danger"></div><div class="mt-3" style="font-size:.8rem;color:#999;">Gerando relatório<span class="rel-dots"></span></div></div>';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const idAlvo = relatorio.id;
    setTimeout(function () {
      if (body && state.relatorioAtual && state.relatorioAtual.id === idAlvo) {
        body.innerHTML = construirConteudoRelatorio(relatorio);
      }
    }, 600);
  }

  function fecharModalRelatorio() {
    const modal = document.getElementById('modalRelatorioOverlay');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
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

    const atual = state.relatorioAtual;
    const payload = {
      id: atual.id,
      tipo: atual.tipo,
      titulo: atual.titulo,
      data_inicio: atual.data_inicio,
      data_fim: atual.data_fim,
      periodoLabel: atual.periodoLabel,
      criadoEm: atual.criadoEm || Date.now(),
      colaborador_id: atual.colaborador_id || '',
      id_cliente: atual.id_cliente || '',
      tipo_lancamento: atual.tipo_lancamento || ''
    };

    window.API.call('addrelatorio', payload)
      .then(function (res) {
        if (res && res.status === 'success') {
          const index = state.relatoriosSalvos.findIndex(function (r) { return r.id === payload.id; });
          if (index === -1) {
            state.relatoriosSalvos.unshift(payload);
          }
          state.paginaAtual = 1;
          renderizarListas();
          relToast('Relatório salvo com sucesso!', 'success');
          fecharModalRelatorio();
        } else {
          throw new Error((res && res.message) || 'Erro desconhecido ao salvar');
        }
      })
      .catch(function (err) {
        console.error('[RELATORIOS] Erro ao salvar:', err);
        relToast('Erro ao salvar relatório: ' + err.message, 'danger');
      })
      .finally(function () {
        if (btnSalvar) {
          btnSalvar.disabled = false;
          btnSalvar.innerHTML = '<i class="bi bi-save"></i><span>Salvar Relatório</span>';
        }
      });
  }

  function copiarRelatorioModal() {
    const body = document.getElementById('modal-rel-body');
    if (!body) return;
    const texto = body.innerText;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(function () { relToast('Relatório copiado!', 'success'); })
        .catch(function () { relToast('Erro ao copiar.', 'danger'); });
    } else {
      relToast('Navegador não suporta cópia.', 'warning');
    }
  }

  function construirConteudoRelatorio(relatorio) {
    let html = '<div class="rel-modal-content-inner">';

    html += '<div class="rel-modal-section">';
    html += '<div class="rel-modal-section-title"><i class="bi bi-info-circle"></i> Informações</div>';
    html += '<div class="rel-modal-grid">';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Tipo</div><div class="rel-modal-card-value">' + escapeHtml(relatorio.tipo) + '</div></div>';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Período</div><div class="rel-modal-card-value">' + escapeHtml(relatorio.periodoLabel) + '</div></div>';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">ID</div><div class="rel-modal-card-value">' + escapeHtml(relatorio.id) + '</div></div>';
    html += '</div></div>';

    html += '<div class="rel-modal-divider"></div>';

    html += '<div class="rel-modal-section">';
    html += '<div class="rel-modal-section-title"><i class="bi bi-calculator"></i> Resumo</div>';
    html += '<div class="rel-modal-grid">';
    html += '<div class="rel-modal-card rel-card-success"><div class="rel-modal-card-label">Total Receitas</div><div class="rel-modal-card-value">' + formatarMoeda(12500) + '</div></div>';
    html += '<div class="rel-modal-card rel-card-danger"><div class="rel-modal-card-label">Total Despesas</div><div class="rel-modal-card-value">' + formatarMoeda(3200) + '</div></div>';
    html += '</div></div>';

    html += '</div>';
    return html;
  }

  function confirmarExclusaoRelatorio(rel) {
    const OLD_ID = 'modalConfirmExclusaoRelDyn';
    const old = document.getElementById(OLD_ID);
    if (old) {
      const oi = bootstrap.Modal.getInstance(old);
      if (oi) oi.dispose();
      old.remove();
    }

    const html = '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered" style="max-width:380px;"><div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden"><div style="background:linear-gradient(135deg,#dc3545 0%,#b02a37 100%);padding:20px 24px 16px;position:relative;"><div class="d-flex align-items-center gap-3"><div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-trash-fill" style="font-size:1.2rem;color:#fff;"></i></div><div><h6 class="fw-bold mb-0 text-white" style="font-size:.92rem;">Excluir Relatório</h6><small style="color:rgba(255,255,255,.65);font-size:.72rem;">Esta ação não pode ser desfeita</small></div></div><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div><div class="modal-body px-4 py-4"><p style="font-size:.82rem;color:#444;margin:0;">Tem certeza que deseja excluir este relatório?</p><div style="background:#f8f9fa;border-radius:10px;padding:10px 14px;margin-top:12px;font-size:.76rem;"><div><span class="text-muted">Título: </span><span class="fw-bold">' + escapeHtml(rel.titulo || '-') + '</span></div><div><span class="text-muted">Período: </span><span class="fw-bold">' + escapeHtml(rel.periodoLabel || '-') + '</span></div><div><span class="text-muted">Tipo: </span><span class="fw-bold">' + escapeHtml(rel.tipo || '-') + '</span></div></div></div><div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex justify-content-end"><button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;">Cancelar</button><button type="button" class="btn btn-danger rounded-pill px-4" id="btn-confirm-excluir-rel-dyn" style="font-size:.78rem;height:38px;font-weight:600;"><i class="bi bi-trash me-1"></i>Excluir</button></div></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    const modalEl = document.getElementById(OLD_ID);
    const modalInst = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

    document.getElementById('btn-confirm-excluir-rel-dyn').addEventListener('click', function () {
      const btn = this;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

      window.API.call('deleterelatorio', { id: rel.id })
        .then(function (res) {
          if (res && res.status === 'success') {
            state.relatoriosSalvos = state.relatoriosSalvos.filter(function (r) { return r.id !== rel.id; });
            renderizarListas();
            relToast('Relatório excluído!', 'success');
            modalInst.hide();
          } else {
            throw new Error((res && res.message) || 'Erro desconhecido ao excluir');
          }
        })
        .catch(function (err) {
          relToast('Erro ao excluir: ' + err.message, 'danger');
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-trash me-1"></i>Excluir';
        });
    });

    modalEl.addEventListener('hidden.bs.modal', function () {
      modalInst.dispose();
      if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    });

    modalInst.show();
  }

  function renderizarListas() {
    if (state.tabAtual === 'motoboys') renderizarListaMotoboys();
    else if (state.tabAtual === 'clientes') renderizarListaClientes();
    else if (state.tabAtual === 'financeiro') renderizarListaFinanceiro();
    else if (state.tabAtual === 'global') renderizarListaGlobal();
  }

  function renderizarListaMotoboys() {
    if (!els.mbLista) return;
    const relatorios = state.relatoriosSalvos.filter(function (r) { return r && r.tipo === 'motoboy' && !r.temporario; });
    renderizarListaPaginada(els.mbLista, relatorios, 'bi-bicycle', 'motoboys');
  }

  function renderizarListaClientes() {
    if (!els.cliLista) return;
    const relatorios = state.relatoriosSalvos.filter(function (r) { return r && r.tipo === 'cliente' && !r.temporario; });
    renderizarListaPaginada(els.cliLista, relatorios, 'bi-people', 'clientes');
  }

  function renderizarListaFinanceiro() {
    if (!els.finLista) return;
    const relatorios = state.relatoriosSalvos.filter(function (r) { return r && r.tipo === 'financeiro' && !r.temporario; });
    renderizarListaPaginada(els.finLista, relatorios, 'bi-wallet2', 'financeiro');
  }

  function renderizarListaGlobal() {
    if (!els.globLista) return;
    const relatorios = state.relatoriosSalvos.filter(function (r) { return r && r.tipo === 'global' && !r.temporario; });
    renderizarListaPaginada(els.globLista, relatorios, 'bi-globe2', 'global');
  }

  function renderizarListaPaginada(container, relatorios, icone, tab) {
    if (!container) return;

    if (!relatorios.length) {
      container.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório salvo.</span></div>';
      atualizarPaginacao(0, tab);
      return;
    }

    const totalPag = Math.ceil(relatorios.length / state.itensPorPagina);
    state.paginaAtual = Math.min(Math.max(1, state.paginaAtual), totalPag);
    const inicio = (state.paginaAtual - 1) * state.itensPorPagina;
    const paginado = relatorios.slice(inicio, inicio + state.itensPorPagina);

    let html = '';
    paginado.forEach(function (rel) {
      const dtCriado = rel.criadoEm ? new Date(rel.criadoEm).toLocaleString('pt-BR') : 'Data não disponível';
      html += '<div class="rel-item-card">' +
        '<div class="rel-item-left">' +
        '<div class="rel-item-icon"><i class="bi ' + icone + '"></i></div>' +
        '<div class="rel-item-info">' +
        '<div class="rel-item-titulo">' + escapeHtml(rel.titulo || 'Sem título') + '</div>' +
        '<div class="rel-item-sub">' + escapeHtml(rel.periodoLabel || 'Sem período') + ' • ' + dtCriado + '</div>' +
        '</div></div>' +
        '<div class="rel-item-actions">' +
        '<button class="rel-item-btn rel-btn-view" data-id="' + escapeHtml(rel.id) + '"><i class="bi bi-eye"></i></button>' +
        '<button class="rel-item-btn rel-btn-delete" data-id="' + escapeHtml(rel.id) + '"><i class="bi bi-trash"></i></button>' +
        '</div></div>';
    });
    container.innerHTML = html;
    atualizarPaginacao(totalPag, tab);
    bindAcoesLista();
  }

  function atualizarPaginacao(totalPag, tab) {
    const p = els.paginacao ? els.paginacao[tab] : null;
    if (!p) return;
    if (p.info) {
      p.info.textContent = totalPag > 0 ? 'Pág ' + state.paginaAtual + ' de ' + totalPag : 'Pág 0 de 0';
    }
    if (p.prev) p.prev.disabled = (state.paginaAtual === 1);
    if (p.next) p.next.disabled = (state.paginaAtual >= totalPag || totalPag === 0);
  }

  function bindAcoesLista() {
    document.querySelectorAll('.rel-btn-view').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = b.dataset.id;
        const r = state.relatoriosSalvos.find(function (rel) { return rel.id === id; });
        if (r) {
          abrirModalRelatorio(r);
        }
      });
    });

    document.querySelectorAll('.rel-btn-delete').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = b.dataset.id;
        const r = state.relatoriosSalvos.find(function (rel) { return rel.id === id; });
        if (r) {
          confirmarExclusaoRelatorio(r);
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
