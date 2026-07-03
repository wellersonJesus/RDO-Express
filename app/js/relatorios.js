'use strict';

(function () {
  const BANCOS = {
    usuarios: {
      label: 'Usuários', icon: 'bi-person-badge', endpoint: 'getusuarios',
      campos: { id: 'ID', username: 'Nome', cargo: 'Cargo', contato: 'Contato', status: 'Status' }
    },
    clientes: {
      label: 'Clientes', icon: 'bi-people', endpoint: 'getclientes',
      campos: { id: 'ID', username: 'Nome', responsavel: 'Responsável', contato: 'Contato', status: 'Status' }
    },
    colaboradores: {
      label: 'Colaboradores', icon: 'bi-person-workspace', endpoint: 'getcolaboradores',
      campos: { username: 'Nome', colaborador: 'Função', cpf_cnpj: 'CPF/CNPJ', placa: 'Placa', email: 'Email', endereco: 'Endereço', bairro: 'Bairro', chave_pix: 'Chave Pix', comissao: 'Comissão', status: 'Status' }
    },
    pedidos: {
      label: 'Pedidos', icon: 'bi-box-seam', endpoint: 'getpedidos',
      campos: { id_cliente: 'Cliente', solicitante: 'Solicitante', contato: 'Contato', horario: 'Horário', mercadoria: 'Mercadoria', de: 'De', para: 'Para', retorno: 'Retorno', prioridade: 'Prioridade', valor_corrida: 'Valor Corrida', motoboy: 'Motoboy', status: 'Status', observacao: 'Observação' }
    },
    chat: {
      label: 'Chat', icon: 'bi-chat-dots', endpoint: 'getchat',
      campos: { id: 'ID', id_cliente: 'Cliente', pedido_id: 'Pedido', texto: 'Texto', hora: 'Hora', data: 'Data', finalizado: 'Finalizado' }
    },
    financeiro: {
      label: 'Financeiro', icon: 'bi-wallet2', endpoint: 'getfinanceiro',
      campos: { colaborador_id: 'Colaborador', id_pedido: 'Pedido', data: 'Data', tipo: 'Tipo', descricao: 'Descrição', motoboy: 'Motoboy', vlr_servico: 'Valor Serviço', colaborador: 'Colaborador', rdo: 'RDO', observacao: 'Observação', situacao: 'Situação' }
    }
  };

  const PRESETS = {
    motoboys: { bancos: ['colaboradores', 'pedidos', 'financeiro'], campos: { colaboradores: ['username', 'colaborador', 'placa', 'comissao'], pedidos: ['motoboy', 'de', 'para', 'valor_corrida', 'status'], financeiro: ['motoboy', 'data', 'tipo', 'vlr_servico', 'situacao'] } },
    clientes: { bancos: ['clientes', 'pedidos', 'chat'], campos: { clientes: ['username', 'responsavel', 'contato'], pedidos: ['id_cliente', 'solicitante', 'de', 'para', 'valor_corrida', 'status'], chat: ['id_cliente', 'texto', 'data'] } },
    financeiro: { bancos: ['financeiro'], campos: { financeiro: ['data', 'tipo', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'situacao'] } },
    global: { bancos: ['usuarios', 'clientes', 'colaboradores', 'pedidos', 'financeiro'], campos: { usuarios: ['username', 'cargo', 'status'], clientes: ['username', 'responsavel'], colaboradores: ['username', 'colaborador', 'status'], pedidos: ['id_cliente', 'motoboy', 'de', 'para', 'valor_corrida', 'status'], financeiro: ['data', 'tipo', 'vlr_servico', 'situacao'] } }
  };

  const state = {
    tabAtual: 'motoboys',
    usuarios: [],
    motoboys: [],
    clientes: [],
    pedidos: [],
    chat: [],
    financeiro: [],
    relatoriosSalvos: [],
    fetching: false,
    relatorioAtual: null,
    paginaAtual: 1,
    itensPorPagina: 10,
    builder: {
      tipo: null,
      periodo: { inicio: '', fim: '' },
      filtroExtra: null,
      bancoAtivo: null,
      selecionados: {},
      step: 1,
      nome: ''
    }
  };

  let els = {};

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str.toString()));
    return div.innerHTML;
  }

  function formatarMoeda(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    const p = iso.split('-');
    if (p.length !== 3) return iso;
    return `${p[2]}/${p[1]}/${p[0]}`;
  }

  function toISO(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function gerarIdRelatorio() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 15).toUpperCase();
    return (timestamp + random).substring(0, 11);
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
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    }, 3000);
  }

  function extrairArray(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.status === 'success' && res.data && Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (typeof res === 'object' && !Array.isArray(res)) {
      const arr = [];
      Object.keys(res).forEach(function (k) {
        const item = res[k];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          if (!item.id) item.id = k;
          arr.push(item);
        }
      });
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
    els.mbLista = document.getElementById('rel-motoboys-lista');

    els.cliDataInicio = document.getElementById('rel-cli-data-inicio');
    els.cliDataFim = document.getElementById('rel-cli-data-fim');
    els.cliSelect = document.getElementById('rel-cli-select');
    els.cliLista = document.getElementById('rel-clientes-lista');

    els.finDataInicio = document.getElementById('rel-fin-data-inicio');
    els.finDataFim = document.getElementById('rel-fin-data-fim');
    els.finTipo = document.getElementById('rel-fin-tipo');
    els.finLista = document.getElementById('rel-financeiro-lista');

    els.globDataInicio = document.getElementById('rel-glob-data-inicio');
    els.globDataFim = document.getElementById('rel-glob-data-fim');
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
    els.modalBtnPdf = document.getElementById('modal-rel-btn-pdf');

    els.builderOverlay = document.getElementById('modalBuilderOverlay');
    els.builderTabs = document.getElementById('rb-banco-tabs');
    els.builderPanels = document.getElementById('rb-banco-panels');
    els.builderStep1 = document.getElementById('rb-step-1');
    els.builderStep2 = document.getElementById('rb-step-2');
    els.builderHeaderStep = document.getElementById('rb-header-step');
    els.builderBtnFechar = document.getElementById('rb-btn-fechar');
    els.builderBtnVoltar = document.getElementById('rb-btn-voltar');
    els.builderBtnAvancar = document.getElementById('rb-btn-avancar');
    els.builderBtnGerar = document.getElementById('rb-btn-gerar-final');
    els.builderNomeInput = document.getElementById('rb-nome-relatorio');
    els.builderResumo = document.getElementById('rb-step2-resumo');
    els.builderStepDots = document.querySelectorAll('.rb-step-dot');

    els.paginacao = {
      motoboys: { prev: document.getElementById('btn-pag-prev-motoboys'), next: document.getElementById('btn-pag-next-motoboys'), info: document.getElementById('info-paginacao-motoboys') },
      clientes: { prev: document.getElementById('btn-pag-prev-clientes'), next: document.getElementById('btn-pag-next-clientes'), info: document.getElementById('info-paginacao-clientes') },
      financeiro: { prev: document.getElementById('btn-pag-prev-financeiro'), next: document.getElementById('btn-pag-next-financeiro'), info: document.getElementById('info-paginacao-financeiro') },
      global: { prev: document.getElementById('btn-pag-prev-global'), next: document.getElementById('btn-pag-next-global'), info: document.getElementById('info-paginacao-global') }
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

    Promise.all([
      window.API.call('getusuarios', {}),
      window.API.call('getclientes', {}),
      window.API.call('getcolaboradores', {}),
      window.API.call('getpedidos', {}),
      window.API.call('getchat', {}),
      window.API.call('getfinanceiro', {}),
      window.API.call('getrelatorios', {})
    ])
      .then(function (r) {
        state.usuarios = extrairArray(r[0]);
        state.clientes = extrairArray(r[1]);
        state.motoboys = extrairArray(r[2]);
        state.pedidos = extrairArray(r[3]);
        state.chat = extrairArray(r[4]);
        state.financeiro = extrairArray(r[5]);
        state.relatoriosSalvos = extrairArray(r[6]);

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
    const loadingHtml = '<div class="rel-lista-loading"><div class="spinner-border text-danger" role="status"></div><div class="mt-3" style="font-size:.85rem;color:#999;font-weight:400;">Buscando relatórios<span class="rel-dots"></span></div></div>';
    if (els.mbLista) els.mbLista.innerHTML = loadingHtml;
    if (els.cliLista) els.cliLista.innerHTML = loadingHtml;
    if (els.finLista) els.finLista.innerHTML = loadingHtml;
    if (els.globLista) els.globLista.innerHTML = loadingHtml;
  }

  function spinOn() {
    if (els.btnSync) { els.btnSync.classList.add('syncing'); els.btnSync.disabled = true; }
    if (els.syncIcon) els.syncIcon.className = 'bi bi-arrow-repeat loading-spin';
  }

  function spinOff() {
    setTimeout(function () {
      if (els.btnSync) { els.btnSync.classList.remove('syncing'); els.btnSync.disabled = false; }
      if (els.syncIcon) els.syncIcon.className = 'bi bi-arrow-repeat';
    }, 500);
  }

  function validarDatas(inicio, fim) {
    if (!inicio || !fim) { relToast('Informe o período completo.', 'warning'); return false; }
    if (inicio > fim) { relToast('Data inicial maior que final.', 'warning'); return false; }
    return true;
  }

  function abrirBuilder(tipo) {
    let inicio = '', fim = '', filtroExtra = null;

    if (tipo === 'motoboys') {
      inicio = els.mbDataInicio.value; fim = els.mbDataFim.value;
      filtroExtra = { campo: 'motoboy_id', valor: els.mbSelect.value };
    } else if (tipo === 'clientes') {
      inicio = els.cliDataInicio.value; fim = els.cliDataFim.value;
      filtroExtra = { campo: 'cliente_id', valor: els.cliSelect.value };
    } else if (tipo === 'financeiro') {
      inicio = els.finDataInicio.value; fim = els.finDataFim.value;
      filtroExtra = { campo: 'tipo_lancamento', valor: els.finTipo.value };
    } else if (tipo === 'global') {
      inicio = els.globDataInicio.value; fim = els.globDataFim.value;
    }

    if (!validarDatas(inicio, fim)) return;

    state.builder.tipo = tipo;
    state.builder.periodo = { inicio: inicio, fim: fim };
    state.builder.filtroExtra = filtroExtra;
    state.builder.step = 1;
    state.builder.nome = '';
    state.builder.selecionados = {};

    const preset = PRESETS[tipo] || PRESETS.global;
    preset.bancos.forEach(function (banco) {
      state.builder.selecionados[banco] = {};
      const camposPreset = preset.campos[banco] || Object.keys(BANCOS[banco].campos);
      Object.keys(BANCOS[banco].campos).forEach(function (campo) {
        state.builder.selecionados[banco][campo] = camposPreset.indexOf(campo) !== -1;
      });
    });
    state.builder.bancoAtivo = preset.bancos[0];

    renderizarBuilderTabs();
    renderizarBuilderPanels();
    irParaStep(1);

    if (els.builderOverlay) {
      els.builderOverlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function fecharBuilder() {
    if (els.builderOverlay) {
      els.builderOverlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function bancosDoBuilder() {
    return Object.keys(state.builder.selecionados);
  }

  function contarSelecionados(banco) {
    const obj = state.builder.selecionados[banco] || {};
    return Object.keys(obj).filter(function (k) { return obj[k]; }).length;
  }

  function renderizarBuilderTabs() {
    if (!els.builderTabs) return;
    const bancos = bancosDoBuilder();
    let html = '';
    bancos.forEach(function (banco) {
      const info = BANCOS[banco];
      const ativo = banco === state.builder.bancoAtivo ? 'active' : '';
      html += '<div class="rb-banco-tab ' + ativo + '" data-banco="' + banco + '">' +
        '<i class="bi ' + info.icon + '"></i>' + info.label +
        '<span class="rb-tab-count">' + contarSelecionados(banco) + '</span></div>';
    });
    els.builderTabs.innerHTML = html;

    els.builderTabs.querySelectorAll('.rb-banco-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        state.builder.bancoAtivo = tab.dataset.banco;
        renderizarBuilderTabs();
        renderizarBuilderPanels();
      });
    });
  }

  function renderizarBuilderPanels() {
    if (!els.builderPanels) return;
    const bancos = bancosDoBuilder();
    let html = '';
    bancos.forEach(function (banco) {
      const info = BANCOS[banco];
      const ativo = banco === state.builder.bancoAtivo ? 'active' : '';
      html += '<div class="rb-banco-panel ' + ativo + '" data-banco="' + banco + '">' +
        '<div class="rb-panel-toolbar">' +
        '<div class="rb-panel-toolbar-title"><i class="bi ' + info.icon + '"></i>' + info.label + '</div>' +
        '<div class="rb-panel-toolbar-actions">' +
        '<button data-acao="marcar" data-banco="' + banco + '">Marcar todos</button>' +
        '<button data-acao="desmarcar" data-banco="' + banco + '">Desmarcar</button>' +
        '</div></div>' +
        '<div class="rb-campos-grid">';

      Object.keys(info.campos).forEach(function (campo) {
        const checked = state.builder.selecionados[banco][campo];
        html += '<div class="rb-campo-item ' + (checked ? 'checked' : '') + '" data-banco="' + banco + '" data-campo="' + campo + '">' +
          '<input type="checkbox" id="rb-chk-' + banco + '-' + campo + '" ' + (checked ? 'checked' : '') + '>' +
          '<label for="rb-chk-' + banco + '-' + campo + '">' + escapeHtml(info.campos[campo]) + '</label></div>';
      });

      html += '</div></div>';
    });
    els.builderPanels.innerHTML = html;

    els.builderPanels.querySelectorAll('.rb-campo-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        const banco = item.dataset.banco;
        const campo = item.dataset.campo;
        state.builder.selecionados[banco][campo] = !state.builder.selecionados[banco][campo];
        renderizarBuilderTabs();
        renderizarBuilderPanels();
      });
    });

    els.builderPanels.querySelectorAll('[data-acao]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const banco = btn.dataset.banco;
        const marcar = btn.dataset.acao === 'marcar';
        Object.keys(state.builder.selecionados[banco]).forEach(function (campo) {
          state.builder.selecionados[banco][campo] = marcar;
        });
        renderizarBuilderTabs();
        renderizarBuilderPanels();
      });
    });
  }

  function irParaStep(step) {
    state.builder.step = step;
    if (els.builderStep1) els.builderStep1.classList.toggle('active', step === 1);
    if (els.builderStep2) els.builderStep2.classList.toggle('active', step === 2);
    if (els.builderHeaderStep) els.builderHeaderStep.textContent = step === 1 ? 'Etapa 1 de 2 - Selecione os campos' : 'Etapa 2 de 2 - Nomeie o relatório';
    if (els.builderBtnVoltar) els.builderBtnVoltar.style.display = step === 2 ? 'inline-flex' : 'none';
    if (els.builderBtnAvancar) els.builderBtnAvancar.style.display = step === 1 ? 'inline-flex' : 'none';
    if (els.builderBtnGerar) els.builderBtnGerar.style.display = step === 2 ? 'inline-flex' : 'none';

    els.builderStepDots.forEach(function (dot) {
      dot.classList.toggle('active', parseInt(dot.dataset.step, 10) <= step);
    });

    if (step === 2) {
      montarResumoStep2();
      if (els.builderNomeInput) setTimeout(function () { els.builderNomeInput.focus(); }, 100);
    }
  }

  function montarResumoStep2() {
    if (!els.builderResumo) return;
    let totalCampos = 0;
    let html = '';
    bancosDoBuilder().forEach(function (banco) {
      const qtd = contarSelecionados(banco);
      if (qtd > 0) {
        totalCampos += qtd;
        html += '<div><strong>' + escapeHtml(BANCOS[banco].label) + ':</strong> ' + qtd + ' campo(s)</div>';
      }
    });
    html += '<div style="margin-top:8px;"><strong>Período:</strong> ' + formatDateBR(state.builder.periodo.inicio) + ' a ' + formatDateBR(state.builder.periodo.fim) + '</div>';
    html += '<div><strong>Total de campos selecionados:</strong> ' + totalCampos + '</div>';
    els.builderResumo.innerHTML = html;
  }

  function validarSelecao() {
    const total = bancosDoBuilder().reduce(function (acc, banco) { return acc + contarSelecionados(banco); }, 0);
    if (total === 0) { relToast('Selecione ao menos um campo.', 'warning'); return false; }
    return true;
  }

  function dentroPeriodo(dataStr, inicio, fim) {
    if (!dataStr) return true;
    const d = dataStr.length >= 10 ? dataStr.substring(0, 10) : dataStr;
    return d >= inicio && d <= fim;
  }

  function coletarDadosBanco(banco) {
    const p = state.builder.periodo;
    let dados = [];

    if (banco === 'usuarios') dados = state.usuarios.slice();
    if (banco === 'clientes') dados = state.clientes.slice();
    if (banco === 'colaboradores') dados = state.motoboys.slice();
    if (banco === 'pedidos') dados = state.pedidos.filter(function (r) { return dentroPeriodo(r.horario || r.data, p.inicio, p.fim); });
    if (banco === 'chat') dados = state.chat.filter(function (r) { return dentroPeriodo(r.data, p.inicio, p.fim); });
    if (banco === 'financeiro') dados = state.financeiro.filter(function (r) { return dentroPeriodo(r.data, p.inicio, p.fim); });

    const fx = state.builder.filtroExtra;
    if (fx && fx.valor && fx.valor !== '__todos__') {
      if (fx.campo === 'motoboy_id') {
        if (banco === 'colaboradores') dados = dados.filter(function (r) { return r.id === fx.valor; });
        if (banco === 'pedidos') dados = dados.filter(function (r) { return r.motoboy === fx.valor || r.id_motoboy === fx.valor; });
        if (banco === 'financeiro') dados = dados.filter(function (r) { return r.colaborador_id === fx.valor || r.motoboy === fx.valor; });
      }
      if (fx.campo === 'cliente_id') {
        if (banco === 'clientes') dados = dados.filter(function (r) { return r.id === fx.valor; });
        if (banco === 'pedidos') dados = dados.filter(function (r) { return r.id_cliente === fx.valor; });
        if (banco === 'chat') dados = dados.filter(function (r) { return r.id_cliente === fx.valor; });
      }
      if (fx.campo === 'tipo_lancamento' && banco === 'financeiro') {
        dados = dados.filter(function (r) { return r.tipo === fx.valor; });
      }
    }

    return dados;
  }

  function montarSnapshot() {
    const snapshot = { bancos: {} };
    bancosDoBuilder().forEach(function (banco) {
      const camposSel = Object.keys(state.builder.selecionados[banco]).filter(function (c) { return state.builder.selecionados[banco][c]; });
      if (!camposSel.length) return;
      const dados = coletarDadosBanco(banco);
      const linhas = dados.map(function (registro) {
        const linha = {};
        camposSel.forEach(function (campo) { linha[campo] = registro[campo]; });
        return linha;
      });
      snapshot.bancos[banco] = { label: BANCOS[banco].label, campos: camposSel.map(function (c) { return { chave: c, label: BANCOS[banco].campos[c] }; }), linhas: linhas };
    });
    return snapshot;
  }

  function finalizarGeracao() {
    const nome = (els.builderNomeInput.value || '').trim();
    if (!nome) { relToast('Informe o nome do relatório.', 'warning'); els.builderNomeInput.focus(); return; }

    els.builderBtnGerar.disabled = true;
    els.builderBtnGerar.innerHTML = '<span class="spinner-border spinner-border-sm"></span><span>Gerando...</span>';

    const snapshot = montarSnapshot();
    const p = state.builder.periodo;
    const tipo = state.builder.tipo;

    const rel = {
      id: gerarIdRelatorio(),
      tipo: tipo,
      titulo: nome,
      data_inicio: p.inicio,
      data_fim: p.fim,
      periodoLabel: formatDateBR(p.inicio) + ' a ' + formatDateBR(p.fim),
      criadoEm: Date.now(),
      snapshot: snapshot
    };

    setTimeout(function () {
      els.builderBtnGerar.disabled = false;
      els.builderBtnGerar.innerHTML = '<i class="bi bi-file-earmark-bar-graph"></i><span>Gerar Relatório</span>';
      fecharBuilder();
      abrirModalRelatorio(rel, true);
    }, 400);
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

    document.querySelectorAll('.btn-rel-gerar').forEach(function (btn) {
      btn.addEventListener('click', function () { abrirBuilder(btn.dataset.tabTipo); });
    });

    if (els.modalBtnFechar) els.modalBtnFechar.addEventListener('click', fecharModalRelatorio);
    if (els.modalBtnCancelar) els.modalBtnCancelar.addEventListener('click', fecharModalRelatorio);
    if (els.modalBtnSalvar) els.modalBtnSalvar.addEventListener('click', salvarRelatorioModal);
    if (els.modalBtnCopiar) els.modalBtnCopiar.addEventListener('click', copiarRelatorioModal);
    if (els.modalBtnPdf) els.modalBtnPdf.addEventListener('click', function () { window.print(); });
    if (els.modalOverlay) {
      els.modalOverlay.addEventListener('click', function (e) { if (e.target === els.modalOverlay) fecharModalRelatorio(); });
    }

    if (els.builderBtnFechar) els.builderBtnFechar.addEventListener('click', fecharBuilder);
    if (els.builderBtnAvancar) els.builderBtnAvancar.addEventListener('click', function () {
      if (!validarSelecao()) return;
      irParaStep(2);
    });
    if (els.builderBtnVoltar) els.builderBtnVoltar.addEventListener('click', function () { irParaStep(1); });
    if (els.builderBtnGerar) els.builderBtnGerar.addEventListener('click', finalizarGeracao);
    if (els.builderOverlay) {
      els.builderOverlay.addEventListener('click', function (e) { if (e.target === els.builderOverlay) fecharBuilder(); });
    }

    Object.keys(els.paginacao).forEach(function (tab) {
      const p = els.paginacao[tab];
      if (p.prev) p.prev.addEventListener('click', function () { if (state.paginaAtual > 1) { state.paginaAtual--; renderizarListas(); } });
      if (p.next) p.next.addEventListener('click', function () { state.paginaAtual++; renderizarListas(); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (els.builderOverlay && els.builderOverlay.style.display === 'flex') fecharBuilder();
      else if (els.modalOverlay && els.modalOverlay.style.display === 'flex') fecharModalRelatorio();
    });
  }

  function abrirModalRelatorio(relatorio, novoGerado) {
    const modal = els.modalOverlay;
    if (!modal) { relToast('Modal não encontrado no DOM!', 'danger'); return; }

    state.relatorioAtual = relatorio;

    if (els.modalTitulo) els.modalTitulo.textContent = (relatorio.titulo || '').toUpperCase();
    if (els.modalPeriodo) els.modalPeriodo.textContent = relatorio.periodoLabel || '';

    if (els.modalIcon) {
      const icons = { motoboys: 'bi-bicycle', clientes: 'bi-people', financeiro: 'bi-wallet2', global: 'bi-globe2' };
      els.modalIcon.className = 'bi ' + (icons[relatorio.tipo] || 'bi-file-earmark-bar-graph');
    }

    if (els.modalBtnSalvar) els.modalBtnSalvar.style.display = novoGerado ? 'inline-flex' : 'none';

    if (els.modalBody) {
      const snapshot = relatorio.snapshot || parseSnapshot(relatorio);
      els.modalBody.innerHTML = construirConteudoRelatorio(relatorio, snapshot);
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function parseSnapshot(relatorio) {
    if (relatorio.snapshot) return relatorio.snapshot;
    if (relatorio.descricao) {
      try { return JSON.parse(relatorio.descricao); } catch (e) { return { bancos: {} }; }
    }
    return { bancos: {} };
  }

  function fecharModalRelatorio() {
    if (els.modalOverlay) { els.modalOverlay.style.display = 'none'; document.body.style.overflow = ''; }
    state.relatorioAtual = null;
  }

  function salvarRelatorioModal() {
    if (!state.relatorioAtual) { relToast('Nenhum relatório para salvar.', 'warning'); return; }

    const btnSalvar = els.modalBtnSalvar;
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

    const atual = state.relatorioAtual;
    const payload = {
      id: atual.id,
      colaborador_id: '',
      id_pedido: '',
      data: atual.data_inicio + '_' + atual.data_fim,
      tipo: atual.tipo,
      descricao: JSON.stringify(atual.snapshot || {}),
      motoboy: '',
      vlr_servico: '',
      colaborador: '',
      rdo: atual.titulo,
      observacao: atual.periodoLabel,
      situacao: 'gerado'
    };

    window.API.call('addrelatorio', payload)
      .then(function (res) {
        if (res && res.status === 'success') {
          const registroLista = {
            id: payload.id,
            tipo: payload.tipo,
            titulo: payload.rdo,
            periodoLabel: payload.observacao,
            criadoEm: atual.criadoEm,
            descricao: payload.descricao
          };
          state.relatoriosSalvos.unshift(registroLista);
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
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = '<i class="bi bi-save"></i><span>Salvar Relatório</span>';
      });
  }

  function copiarRelatorioModal() {
    if (!els.modalBody) return;
    const texto = els.modalBody.innerText;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(function () { relToast('Relatório copiado!', 'success'); })
        .catch(function () { relToast('Erro ao copiar.', 'danger'); });
    } else {
      relToast('Navegador não suporta cópia.', 'warning');
    }
  }

  function construirConteudoRelatorio(relatorio, snapshot) {
    let html = '<div class="rel-modal-content-inner">';

    html += '<div class="rel-modal-section">';
    html += '<div class="rel-modal-section-title"><i class="bi bi-info-circle"></i> Informações</div>';
    html += '<div class="rel-modal-grid">';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Tipo</div><div class="rel-modal-card-value">' + escapeHtml(relatorio.tipo) + '</div></div>';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Período</div><div class="rel-modal-card-value">' + escapeHtml(relatorio.periodoLabel) + '</div></div>';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Criado em</div><div class="rel-modal-card-value">' + escapeHtml(relatorio.criadoEm ? new Date(relatorio.criadoEm).toLocaleString('pt-BR') : '-') + '</div></div>';
    html += '</div></div>';

    const bancos = snapshot && snapshot.bancos ? snapshot.bancos : {};
    Object.keys(bancos).forEach(function (banco) {
      const info = bancos[banco];
      html += '<div class="rel-modal-divider"></div>';
      html += '<div class="rel-modal-section">';
      html += '<div class="rel-modal-section-title"><i class="bi bi-list-ul"></i> ' + escapeHtml(info.label) + ' (' + info.linhas.length + ')</div>';

      if (!info.linhas.length) {
        html += '<div class="rel-registro-vazio">Nenhum registro no período.</div>';
      } else {
        html += '<div class="rel-registros-lista">';
        info.linhas.forEach(function (linha, idx) {
          html += '<div class="rel-registro-card">';
          html += '<div class="rel-registro-num">#' + (idx + 1) + '</div>';
          html += '<div class="rel-registro-campos">';
          info.campos.forEach(function (c) {
            let valor = linha[c.chave];
            if (c.chave === 'vlr_servico' || c.chave === 'valor_corrida') valor = formatarMoeda(valor);
            html += '<div class="rel-registro-campo">' +
              '<span class="rel-registro-label">' + escapeHtml(c.label) + '</span>' +
              '<span class="rel-registro-valor">' + escapeHtml(valor) + '</span>' +
              '</div>';
          });
          html += '</div></div>';
        });
        html += '</div>';
      }
      html += '</div>';
    });

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

    const html = '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered" style="max-width:380px;"><div class="modal-content border-0 rounded-4 shadow-lg overflow-hidden"><div style="background:linear-gradient(135deg,#dc3545 0%,#b02a37 100%);padding:20px 24px 16px;position:relative;"><div class="d-flex align-items-center gap-3"><div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-trash-fill" style="font-size:1.2rem;color:#fff;"></i></div><div><h6 class="fw-semibold mb-0 text-white" style="font-size:.92rem;">Excluir Relatório</h6><small style="color:rgba(255,255,255,.65);font-size:.72rem;">Esta ação não pode ser desfeita</small></div></div><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position:absolute;top:16px;right:16px;opacity:.8;"></button></div><div class="modal-body px-4 py-4"><p style="font-size:.82rem;color:#444;margin:0;">Tem certeza que deseja excluir este relatório?</p><div style="background:#f8f9fa;border-radius:10px;padding:10px 14px;margin-top:12px;font-size:.76rem;"><div><span class="text-muted">Título: </span><span>' + escapeHtml(rel.titulo || '-') + '</span></div><div><span class="text-muted">Período: </span><span>' + escapeHtml(rel.periodoLabel || '-') + '</span></div><div><span class="text-muted">Tipo: </span><span>' + escapeHtml(rel.tipo || '-') + '</span></div></div></div><div class="modal-footer border-0 px-4 pb-4 pt-0 gap-2 d-flex justify-content-end"><button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal" style="font-size:.78rem;height:38px;">Cancelar</button><button type="button" class="btn btn-danger rounded-pill px-4" id="btn-confirm-excluir-rel-dyn" style="font-size:.78rem;height:38px;font-weight:600;"><i class="bi bi-trash me-1"></i>Excluir</button></div></div></div></div>';

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
    if (state.tabAtual === 'motoboys') renderizarListaGenerica(els.mbLista, 'motoboys', 'bi-bicycle', 'motoboys');
    else if (state.tabAtual === 'clientes') renderizarListaGenerica(els.cliLista, 'clientes', 'bi-people', 'clientes');
    else if (state.tabAtual === 'financeiro') renderizarListaGenerica(els.finLista, 'financeiro', 'bi-wallet2', 'financeiro');
    else if (state.tabAtual === 'global') renderizarListaGenerica(els.globLista, 'global', 'bi-globe2', 'global');
  }

  function renderizarListaGenerica(container, tipo, icone, tab) {
    if (!container) return;
    const relatorios = state.relatoriosSalvos.filter(function (r) { return r && r.tipo === tipo; });
    renderizarListaPaginada(container, relatorios, icone, tab);
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
    if (p.info) p.info.textContent = totalPag > 0 ? 'Pág ' + state.paginaAtual + ' de ' + totalPag : 'Pág 0 de 0';
    if (p.prev) p.prev.disabled = (state.paginaAtual === 1);
    if (p.next) p.next.disabled = (state.paginaAtual >= totalPag || totalPag === 0);
  }

  function bindAcoesLista() {
    document.querySelectorAll('.rel-btn-view').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = b.dataset.id;
        const r = state.relatoriosSalvos.find(function (rel) { return rel.id === id; });
        if (r) abrirModalRelatorio(r, false);
      });
    });

    document.querySelectorAll('.rel-btn-delete').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = b.dataset.id;
        const r = state.relatoriosSalvos.find(function (rel) { return rel.id === id; });
        if (r) confirmarExclusaoRelatorio(r);
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

  function construirTituloInterno(snapshot) {
    const bancos = snapshot && snapshot.bancos ? Object.keys(snapshot.bancos) : [];
    if (!bancos.length) return 'Relatório Geral';
    const labels = bancos.map(function (b) { return snapshot.bancos[b].label; });
    if (labels.length === 1) return 'Relatório de ' + labels[0];
    const ultimo = labels.pop();
    return 'Relatório de ' + labels.join(', ') + ' e ' + ultimo;
  }

  function construirConteudoRelatorio(relatorio, snapshot) {
    let html = '<div class="rel-modal-content-inner">';

    // Título interno dinâmico
    html += '<div class="rel-extrato-titulo"><i class="bi bi-receipt"></i> ' + escapeHtml(construirTituloInterno(snapshot)) + '</div>';
    html += '<div class="rel-extrato-sub">' + escapeHtml(relatorio.periodoLabel || '') + '</div>';

    html += '<div class="rel-extrato-lista">';

    const bancos = snapshot && snapshot.bancos ? snapshot.bancos : {};
    let totalItens = 0;

    Object.keys(bancos).forEach(function (banco) {
      const info = bancos[banco];
      info.linhas.forEach(function (linha, idx) {
        totalItens++;
        // Cabeçalho leve do registro (numeração, sem título de banco)
        html += '<div class="rel-extrato-registro-marca">Registro ' + (totalItens) + '</div>';
        info.campos.forEach(function (c) {
          let valor = linha[c.chave];
          if (c.chave === 'vlr_servico' || c.chave === 'valor_corrida') valor = formatarMoeda(valor);
          html += '<div class="rel-extrato-linha">' +
            '<span class="rel-extrato-label">' + escapeHtml(c.label) + '</span>' +
            '<span class="rel-extrato-dots"></span>' +
            '<span class="rel-extrato-valor">' + escapeHtml(valor) + '</span>' +
            '</div>';
        });
      });
    });

    if (!totalItens) {
      html += '<div class="rel-registro-vazio">Nenhum registro encontrado no período.</div>';
    }

    html += '</div>'; // fim lista

    // Footer objetivo
    const agora = new Date();
    html += '<div class="rel-extrato-footer">' +
      '<span>RDO Express</span>' +
      '<span>' + agora.toLocaleDateString('pt-BR') + '</span>' +
      '<span>' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</span>' +
      '</div>';

    html += '</div>';
    return html;
  }

})();
