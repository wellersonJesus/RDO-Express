'use strict';

(function () {
  window.addEventListener('error', function (e) {
    relToast('Erro: ' + e.message, 'danger');
  });
  window.addEventListener('unhandledrejection', function (e) {
    const msg = (e.reason && e.reason.message) ? e.reason.message : e.reason;
    relToast('Erro assíncrono: ' + msg, 'danger');
  });

  const PERCENTUAL_MOTOBOY = 0.80;
  const PERCENTUAL_RDO = 0.20;

  const ALIASES = {
    pedidos: {
      id: ['id'], id_cliente: ['id_cliente'], solicitante: ['solicitante'], contato: ['contato'],
      data: ['data'], horario: ['horario', 'hora'], mercadoria: ['mercadoria'], de: ['de'], para: ['para'],
      retorno: ['retorno'], prioridade: ['prioridade'], valor_corrida: ['valor_corrida', 'vlr_servico'],
      motoboy: ['motoboy'], status: ['status'], observacao: ['observacao']
    },
    financeiro: {
      id_pedido: ['id_pedido'], data: ['data'], tipo: ['tipo'], descricao: ['descricao'],
      motoboy: ['motoboy'], vlr_servico: ['vlr_servico', 'valor_corrida'], colaborador: ['colaborador'],
      observacao: ['observacao'], situacao: ['situacao']
    },
    clientes: {
      id: ['id'], username: ['username'], responsavel: ['responsavel'], contato: ['contato'],
      pagamento: ['pagamento'], status: ['status']
    },
    colaborador: {
      id: ['id'], username: ['username'], colaborador: ['colaborador'], cpf_cnpj: ['cpf_cnpj'],
      placa: ['placa'], email: ['email'], endereco: ['endereco'], bairro: ['bairro'],
      chave_pix: ['chave_pix'], comissao: ['comissao'], status: ['status']
    },
    chat: {
      id: ['id'], id_cliente: ['id_cliente'], pedido_id: ['pedido_id'], texto: ['texto'],
      hora: ['hora'], data: ['data'], finalizado: ['finalizado']
    }
  };

  function resolverValor(banco, campo, registro) {
    if (!registro) return '';
    const chaves = (ALIASES[banco] && ALIASES[banco][campo]) || [campo];
    for (let i = 0; i < chaves.length; i++) {
      const k = chaves[i];
      if (registro[k] !== undefined && registro[k] !== null && registro[k] !== '') return registro[k];
    }
    return '';
  }

  function parseMoeda(v) {
    if (v === null || v === undefined || v === '') return NaN;
    if (typeof v === 'number') return v;
    let s = String(v).trim();
    s = s.replace(/r\$\s*/gi, '');
    if (s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '');
      s = s.replace(',', '.');
    }
    s = s.replace(/[^0-9.\-]/g, '');
    const n = parseFloat(s);
    return n;
  }

  function valorNumericoValido(v) {
    const n = parseMoeda(v);
    return !isNaN(n) && n !== 0;
  }

  function extrairHora(valor) {
    if (!valor) return '';
    const v = String(valor).trim();
    const mCompleto = v.match(/(\d{2}:\d{2}(:\d{2})?)/);
    if (mCompleto) return mCompleto[1].substring(0, 5);
    return v;
  }

  const BANCOS = {
    colaborador: {
      label: 'Colaboradores', icon: 'bi-person-workspace', endpoint: 'getcolaboradores',
      campos: {
        username: 'Username', colaborador: 'Colaborador', cpf_cnpj: 'CPF/CNPJ', placa: 'Placa',
        email: 'Email', endereco: 'Endereço', bairro: 'Bairro', chave_pix: 'Chave Pix',
        comissao: 'Comissão', status: 'Status'
      }
    },
    clientes: {
      label: 'Clientes', icon: 'bi-people', endpoint: 'getclientes',
      campos: { username: 'Username', responsavel: 'Responsável', contato: 'Contato', pagamento: 'Pagamento', status: 'Status' }
    },
    pedidos: {
      label: 'Pedidos', icon: 'bi-box-seam', endpoint: 'getpedidos',
      campos: {
        id: 'ID', solicitante: 'Solicitante', contato: 'Contato', data: 'Data', horario: 'Horário',
        mercadoria: 'Mercadoria', de: 'De', para: 'Para', retorno: 'Retorno', prioridade: 'Prioridade',
        valor_corrida: 'Valor Corrida', motoboy: 'Motoboy', status: 'Status', observacao: 'Observação'
      }
    },
    chat: {
      label: 'Chat', icon: 'bi-chat-dots', endpoint: 'getchat',
      campos: { pedido_id: 'Pedido', texto: 'Texto', hora: 'Hora', data: 'Data', finalizado: 'Finalizado' }
    },
    financeiro: {
      label: 'Financeiro', icon: 'bi-wallet2', endpoint: 'getfinanceiro',
      campos: {
        id_pedido: 'Pedido', data: 'Data', tipo: 'Tipo', descricao: 'Descrição', motoboy: 'Motoboy',
        vlr_servico: 'Valor Serviço', colaborador: 'Colaborador', observacao: 'Observação', situacao: 'Situação'
      }
    }
  };

  const PRESETS = {
    motoboys: {
      bancos: ['colaborador', 'pedidos', 'financeiro'],
      campos: {
        colaborador: ['username', 'colaborador', 'cpf_cnpj', 'placa', 'email', 'endereco', 'bairro', 'chave_pix', 'comissao', 'status'],
        pedidos: ['id', 'solicitante', 'contato', 'data', 'horario', 'mercadoria', 'de', 'para', 'retorno', 'prioridade', 'valor_corrida', 'motoboy', 'status', 'observacao'],
        financeiro: ['id_pedido', 'data', 'tipo', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao']
      },
      defaults: {
        colaborador: ['username'],
        pedidos: [],
        financeiro: ['data', 'descricao','vlr_servico']
      }
    },
    clientes: {
      bancos: ['clientes', 'pedidos', 'chat', 'financeiro'],
      campos: {
        clientes: ['username', 'responsavel', 'contato', 'pagamento', 'status'],
        pedidos: ['id', 'solicitante', 'contato', 'data', 'horario', 'mercadoria', 'de', 'para', 'retorno', 'prioridade', 'valor_corrida', 'motoboy', 'status', 'observacao'],
        chat: ['pedido_id', 'texto', 'hora', 'data', 'finalizado'],
        financeiro: ['id_pedido', 'data', 'tipo', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao']
      },
      defaults: {
        clientes: ['username'],
        pedidos: [],
        chat: [],
        financeiro: ['data', 'descricao', 'vlr_servico']
      }
    },
    financeiro: {
      bancos: ['financeiro', 'pedidos'],
      campos: {
        financeiro: ['id_pedido', 'data', 'tipo', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao'],
        pedidos: ['id', 'motoboy', 'valor_corrida', 'status', 'data', 'solicitante']
      },
      defaults: {
        financeiro: ['id_pedido', 'data', 'tipo', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao'],
        pedidos: ['motoboy', 'valor_corrida', 'status', 'data']
      }
    },
    global: {
      bancos: ['colaborador', 'clientes', 'pedidos', 'financeiro', 'chat'],
      campos: {
        colaborador: ['username', 'colaborador', 'cpf_cnpj', 'placa', 'email', 'endereco', 'bairro', 'chave_pix', 'comissao', 'status'],
        clientes: ['username', 'responsavel', 'contato', 'pagamento', 'status'],
        pedidos: ['id', 'solicitante', 'contato', 'data', 'horario', 'mercadoria', 'de', 'para', 'retorno', 'prioridade', 'valor_corrida', 'motoboy', 'status', 'observacao'],
        financeiro: ['id_pedido', 'data', 'tipo', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao'],
        chat: ['pedido_id', 'texto', 'hora', 'data', 'finalizado']
      },
      defaults: {
        colaborador: ['username', 'colaborador', 'cpf_cnpj', 'placa', 'email', 'endereco', 'bairro', 'chave_pix', 'comissao', 'status'],
        clientes: ['username', 'responsavel', 'contato', 'pagamento', 'status'],
        pedidos: ['id', 'solicitante', 'contato', 'data', 'horario', 'mercadoria', 'de', 'para', 'retorno', 'prioridade', 'valor_corrida', 'motoboy', 'status', 'observacao'],
        financeiro: ['id_pedido', 'data', 'tipo', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao'],
        chat: ['pedido_id', 'texto', 'hora', 'data', 'finalizado']
      }
    }
  };

  const state = {
    tabAtual: 'motoboys',
    motoboys: [], clientes: [], pedidos: [], chat: [], financeiro: [],
    relatoriosSalvos: [],
    fetching: false,
    relatorioAtual: null,
    ultimoBuilderState: null,
    paginaAtual: 1,
    itensPorPagina: 10,
    builder: { tipo: null, periodo: { inicio: '', fim: '' }, filtroExtra: null, bancoAtivo: null, selecionados: {}, step: 1, nome: '' }
  };

  const els = {};

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str.toString()));
    return div.innerHTML;
  }

  function formatarMoeda(valor) {
    const n = parseMoeda(valor);
    if (isNaN(n)) return 'R$ 0,00';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    const p = iso.split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function toISO(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function normalizarDataISO(valor) {
    if (!valor) return '';
    let v = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10);
    const mBR = v.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (mBR) return mBR[3] + '-' + mBR[2] + '-' + mBR[1];
    const d = new Date(v);
    if (!isNaN(d.getTime())) return toISO(d);
    return '';
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
    }, 4000);
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
    els.modalBtnVoltar = document.getElementById('modal-rel-btn-voltar');
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
      const nome = resolverValor('colaborador', 'username', mb) || 'Sem nome';
      html += '<option value="' + escapeHtml(mb.id) + '">' + escapeHtml(nome) + '</option>';
    });
    els.mbSelect.innerHTML = html;
  }

  function popularSelectClientes() {
    if (!els.cliSelect) return;
    let html = '<option value="__todos__">Todos os clientes</option>';
    state.clientes.forEach(function (cli) {
      const nome = resolverValor('clientes', 'username', cli) || 'Sem nome';
      html += '<option value="' + escapeHtml(cli.id) + '">' + escapeHtml(nome) + '</option>';
    });
    els.cliSelect.innerHTML = html;
  }

  function exibirLoadingListas() {
    const loadingHtml = '<div class="rel-lista-loading"><div class="spinner-border text-danger" role="status"></div><div class="mt-3" style="font-size:.85rem;color:#999;font-weight:500;">Buscando relatórios<span class="rel-dots"></span></div></div>';
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

  function obterValoresSelecionados(selectEl) {
    if (!selectEl) return ['__todos__'];
    const opts = Array.from(selectEl.selectedOptions || []).map(function (o) { return o.value; });
    if (!opts.length) return ['__todos__'];
    return opts;
  }

  function abrirBuilder(tipo, estadoPreservado) {
    try {
      if (estadoPreservado) {
        state.builder = JSON.parse(JSON.stringify(estadoPreservado));
        renderizarBuilderTabs();
        renderizarBuilderPanels();
        irParaStep(2);
        if (els.builderNomeInput) els.builderNomeInput.value = state.builder.nome || '';
        if (els.builderOverlay) { els.builderOverlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
        return;
      }

      let inicio = '', fim = '', filtroExtra = null;

      if (tipo === 'motoboys') {
        inicio = els.mbDataInicio.value; fim = els.mbDataFim.value;
        filtroExtra = { campo: 'motoboy_id', valor: obterValoresSelecionados(els.mbSelect) };
      } else if (tipo === 'clientes') {
        inicio = els.cliDataInicio.value; fim = els.cliDataFim.value;
        filtroExtra = { campo: 'cliente_id', valor: obterValoresSelecionados(els.cliSelect) };
      } else if (tipo === 'financeiro') {
        inicio = els.finDataInicio.value; fim = els.finDataFim.value;
        filtroExtra = { campo: 'tipo_lancamento', valor: els.finTipo.value ? [els.finTipo.value] : ['__todos__'] };
      } else if (tipo === 'global') {
        inicio = els.globDataInicio.value; fim = els.globDataFim.value;
      } else {
        relToast('Tipo de relatório inválido.', 'danger');
        return;
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
        if (!BANCOS[banco]) return;
        state.builder.selecionados[banco] = {};
        const camposDefault = (preset.defaults && preset.defaults[banco]) || Object.keys(BANCOS[banco].campos);
        Object.keys(BANCOS[banco].campos).forEach(function (campo) {
          state.builder.selecionados[banco][campo] = camposDefault.indexOf(campo) !== -1;
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
    } catch (e) {
      relToast('Erro ao abrir construtor de relatório: ' + e.message, 'danger');
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
      if (!info) return;
      const ativo = banco === state.builder.bancoAtivo ? 'active' : '';
      html += '<div class="rb-banco-tab ' + ativo + '" data-banco="' + banco + '">' +
        '<i class="bi ' + info.icon + '"></i>' + escapeHtml(info.label) +
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
      if (!info) return;
      const ativo = banco === state.builder.bancoAtivo ? 'active' : '';
      html += '<div class="rb-banco-panel ' + ativo + '" data-banco="' + banco + '">' +
        '<div class="rb-panel-toolbar">' +
        '<div class="rb-panel-toolbar-title"><i class="bi ' + info.icon + '"></i>' + escapeHtml(info.label) + '</div>' +
        '<div class="rb-panel-toolbar-actions">' +
        '<button type="button" data-acao="marcar" data-banco="' + banco + '">Marcar todos</button>' +
        '<button type="button" data-acao="desmarcar" data-banco="' + banco + '">Desmarcar</button>' +
        '</div></div><div class="rb-campos-grid">';

      Object.keys(info.campos).forEach(function (campo) {
        const checked = !!state.builder.selecionados[banco][campo];
        html += '<div class="rb-campo-item ' + (checked ? 'checked' : '') + '" data-banco="' + banco + '" data-campo="' + campo + '">' +
          '<span class="rb-campo-checkicon"><i class="bi ' + (checked ? 'bi-check-square-fill' : 'bi-square') + '"></i></span>' +
          '<label>' + escapeHtml(info.campos[campo]) + '</label></div>';
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

    const fx = state.builder.filtroExtra;
    if (fx && Array.isArray(fx.valor) && fx.valor.indexOf('__todos__') === -1 && fx.valor.length) {
      let labels = [];
      if (fx.campo === 'motoboy_id') {
        labels = state.motoboys.filter(function (m) { return fx.valor.indexOf(m.id) !== -1; }).map(function (m) { return resolverValor('colaborador', 'username', m); });
      } else if (fx.campo === 'cliente_id') {
        labels = state.clientes.filter(function (c) { return fx.valor.indexOf(c.id) !== -1; }).map(function (c) { return resolverValor('clientes', 'username', c); });
      }
      if (labels.length) html += '<div><strong>Filtro:</strong> ' + escapeHtml(labels.join(', ')) + '</div>';
    }

    html += '<div><strong>Total de campos selecionados:</strong> ' + totalCampos + '</div>';
    els.builderResumo.innerHTML = html;
  }

  function validarSelecao() {
    const total = bancosDoBuilder().reduce(function (acc, banco) { return acc + contarSelecionados(banco); }, 0);
    if (total === 0) { relToast('Selecione ao menos um campo.', 'warning'); return false; }
    return true;
  }

  function dentroPeriodo(dataStr, inicio, fim) {
    const d = normalizarDataISO(dataStr);
    if (!d) return false;
    return d >= inicio && d <= fim;
  }

  function normalizarComparacao(v) {
    return String(v == null ? '' : v).trim().toUpperCase();
  }

  function idsParaNomes(ids, lista, banco) {
    const nomes = [];
    lista.forEach(function (item) {
      if (ids.indexOf(item.id) !== -1 || ids.indexOf(String(item.id)) !== -1) {
        const nome = resolverValor(banco, 'username', item);
        if (nome) nomes.push(normalizarComparacao(nome));
      }
    });
    return nomes;
  }

  function buscarFinanceiroDoPedido(pedido) {
    const idPedido = pedido.id;
    return state.financeiro.find(function (f) {
      return String(resolverValor('financeiro', 'id_pedido', f)) === String(idPedido);
    });
  }

  function buscarPedidoDoFinanceiro(registro) {
    const idPedido = resolverValor('financeiro', 'id_pedido', registro);
    return state.pedidos.find(function (p) {
      return String(resolverValor('pedidos', 'id', p)) === String(idPedido);
    });
  }

  function obterDataPedidoComFallback(pedido) {
    var data = resolverValor('pedidos', 'data', pedido);
    if (data) return data;
    var lanc = buscarFinanceiroDoPedido(pedido);
    return lanc ? resolverValor('financeiro', 'data', lanc) : '';
  }

  function buscarPedidoDoChat(registroChat) {
    const idPedido = resolverValor('chat', 'pedido_id', registroChat);
    if (!idPedido) return null;
    return state.pedidos.find(function (p) {
      return String(resolverValor('pedidos', 'id', p)) === String(idPedido);
    });
  }

  function obterDataChatComFallback(registroChat) {
    const dataPropria = resolverValor('chat', 'data', registroChat);
    if (dataPropria) return dataPropria;
    const pedido = buscarPedidoDoChat(registroChat);
    return pedido ? obterDataPedidoComFallback(pedido) : '';
  }

  function obterValorCampoPedido(campo, pedido) {
    let valor = resolverValor('pedidos', campo, pedido);
    if (campo === 'horario') return extrairHora(valor);
    if (campo === 'data' && !valor) return obterDataPedidoComFallback(pedido);
    if (campo === 'valor_corrida' && !valorNumericoValido(valor)) {
      const lanc = buscarFinanceiroDoPedido(pedido);
      if (lanc) {
        const vFin = resolverValor('financeiro', 'vlr_servico', lanc);
        if (valorNumericoValido(vFin)) valor = vFin;
      }
    }
    return valor;
  }

  function obterValorCampoFinanceiro(campo, registro) {
    let valor = resolverValor('financeiro', campo, registro);
    if (campo === 'vlr_servico' && !valorNumericoValido(valor)) {
      const pedido = buscarPedidoDoFinanceiro(registro);
      if (pedido) {
        const vPed = resolverValor('pedidos', 'valor_corrida', pedido);
        if (valorNumericoValido(vPed)) valor = vPed;
      }
    }
    if (campo === 'data' && !valor) {
      const pedido = buscarPedidoDoFinanceiro(registro);
      if (pedido) valor = resolverValor('pedidos', 'data', pedido);
    }
    return valor;
  }

  function obterValorCampoChat(campo, registro) {
    if (campo === 'data') return obterDataChatComFallback(registro);
    return resolverValor('chat', campo, registro);
  }

  function agruparPorMotoboy(pedidos) {
    const mapa = {};

    pedidos.forEach(function (p) {
      const nome = resolverValor('pedidos', 'motoboy', p) || 'Sem motoboy';
      const status = normalizarComparacao(resolverValor('pedidos', 'status', p));
      const valor = parseMoeda(obterValorCampoPedido('valor_corrida', p));
      const valorValido = !isNaN(valor) ? valor : 0;
      const concluido = (status === 'CONCLUIDO' || status === 'CONCLUÍDO');

      if (!mapa[nome]) {
        mapa[nome] = { nome: nome, qtd: 0, qtdPendente: 0, receitaTotal: 0, receitaPendente: 0 };
      }

      mapa[nome].qtd++;
      mapa[nome].receitaTotal += valorValido;

      if (!concluido) {
        mapa[nome].qtdPendente++;
        mapa[nome].receitaPendente += valorValido;
      }
    });

    return Object.keys(mapa).map(function (k) {
      const m = mapa[k];
      const valorMotoboy = m.receitaTotal * PERCENTUAL_MOTOBOY;
      const valorRdo = m.receitaTotal * PERCENTUAL_RDO;
      const valorMotoboyPendente = m.receitaPendente * PERCENTUAL_MOTOBOY;
      const valorRdoPendente = m.receitaPendente * PERCENTUAL_RDO;

      return {
        nome: m.nome,
        qtd: m.qtd,
        qtdPendente: m.qtdPendente,
        receitaTotal: m.receitaTotal,
        receitaPendente: m.receitaPendente,
        valorMotoboy: valorMotoboy,
        valorRdo: valorRdo,
        valorMotoboyPendente: valorMotoboyPendente,
        valorRdoPendente: valorRdoPendente,
        valorTotalCalculado: valorMotoboy + valorRdo
      };
    }).sort(function (a, b) { return b.receitaTotal - a.receitaTotal; });
  }

  function agruparPorCliente(pedidos) {
    const mapa = {};
    pedidos.forEach(function (p) {
      let nome = resolverValor('pedidos', 'solicitante', p) || '';
      const idCliente = resolverValor('pedidos', 'id_cliente', p);
      if (!nome && idCliente) {
        const cli = state.clientes.find(function (c) { return String(c.id) === String(idCliente); });
        if (cli) nome = resolverValor('clientes', 'username', cli);
      }
      if (!nome) nome = 'Sem cliente';

      const status = normalizarComparacao(resolverValor('pedidos', 'status', p));
      const valor = parseMoeda(obterValorCampoPedido('valor_corrida', p));

      if (!mapa[nome]) mapa[nome] = { nome: nome, total: 0, qtd: 0, totalPendente: 0, qtdPendente: 0 };
      mapa[nome].qtd++;
      if (!isNaN(valor)) mapa[nome].total += valor;

      if (status !== 'CONCLUIDO' && status !== 'CONCLUÍDO') {
        mapa[nome].qtdPendente++;
        if (!isNaN(valor)) mapa[nome].totalPendente += valor;
      }
    });
    return Object.keys(mapa).map(function (k) { return mapa[k]; }).sort(function (a, b) { return b.total - a.total; });
  }

  function coletarDadosBanco(banco) {
    const p = state.builder.periodo;
    let dados = [];

    if (banco === 'clientes') dados = state.clientes.slice();
    else if (banco === 'colaborador') dados = state.motoboys.slice();
    else if (banco === 'pedidos') dados = state.pedidos.filter(function (r) {
      return dentroPeriodo(obterDataPedidoComFallback(r), p.inicio, p.fim);
    });
    else if (banco === 'chat') dados = state.chat.filter(function (r) {
      return dentroPeriodo(obterDataChatComFallback(r), p.inicio, p.fim);
    });
    else if (banco === 'financeiro') dados = state.financeiro.filter(function (r) {
      const dataF = obterValorCampoFinanceiro('data', r);
      return dentroPeriodo(dataF, p.inicio, p.fim);
    });

    const fx = state.builder.filtroExtra;
    if (!fx || !fx.valor) return dados;

    const valoresBrutos = Array.isArray(fx.valor) ? fx.valor : [fx.valor];
    const contemTodos = valoresBrutos.indexOf('__todos__') !== -1;
    if (contemTodos || !valoresBrutos.length) return dados;

    // Normaliza TUDO para string, eliminando bug number vs string
    const valoresStr = valoresBrutos.map(function (v) { return String(v).trim(); });

    function idBate(valorCampo) {
      return valoresStr.indexOf(String(valorCampo).trim()) !== -1;
    }

    // ---------- FILTRO POR MOTOBOY ----------
    if (fx.campo === 'motoboy_id') {
      const nomesSelecionados = idsParaNomes(valoresBrutos, state.motoboys, 'colaborador');

      if (banco === 'colaborador') {
        dados = dados.filter(function (r) { return idBate(r.id); });
      }
      if (banco === 'pedidos') {
        dados = dados.filter(function (r) {
          const mb = normalizarComparacao(resolverValor('pedidos', 'motoboy', r));
          return nomesSelecionados.indexOf(mb) !== -1;
        });
      }
      if (banco === 'financeiro') {
        dados = dados.filter(function (r) {
          const mb = normalizarComparacao(resolverValor('financeiro', 'motoboy', r));
          const colab = normalizarComparacao(resolverValor('financeiro', 'colaborador', r));
          return nomesSelecionados.indexOf(mb) !== -1 || nomesSelecionados.indexOf(colab) !== -1;
        });
      }
      return dados;
    }

    // ---------- FILTRO POR CLIENTE ----------
    if (fx.campo === 'cliente_id') {

      if (banco === 'clientes') {
        dados = dados.filter(function (r) { return idBate(r.id); });
        return dados;
      }

      if (banco === 'pedidos') {
        dados = dados.filter(function (r) {
          const v = resolverValor('pedidos', 'id_cliente', r);
          return idBate(v);
        });
        return dados;
      }

      if (banco === 'chat') {
        dados = dados.filter(function (r) {
          const v = resolverValor('chat', 'id_cliente', r);
          return idBate(v);
        });
        return dados;
      }

      // financeiro: precisa cruzar via pedidos, sem depender do que foi marcado nos checkboxes
      if (banco === 'financeiro') {
        const pedidosDoCliente = state.pedidos.filter(function (ped) {
          const v = resolverValor('pedidos', 'id_cliente', ped);
          return idBate(v);
        });

        const idsPedidosDoCliente = pedidosDoCliente.map(function (ped) {
          return String(resolverValor('pedidos', 'id', ped)).trim();
        });

        // DEBUG opcional — remova em produção
        if (!idsPedidosDoCliente.length) {
          console.warn('[Relatorios] Nenhum pedido encontrado para o(s) cliente(s):', valoresStr,
            '— verifique se pedidos.id_cliente está preenchido e com o mesmo tipo do id do cliente.');
        }

        dados = dados.filter(function (r) {
          const idPed = String(resolverValor('financeiro', 'id_pedido', r)).trim();
          return idsPedidosDoCliente.indexOf(idPed) !== -1;
        });
        return dados;
      }
    }

    // ---------- FILTRO POR TIPO DE LANÇAMENTO ----------
    if (fx.campo === 'tipo_lancamento' && banco === 'financeiro') {
      dados = dados.filter(function (r) {
        return valoresStr.indexOf(String(resolverValor('financeiro', 'tipo', r)).trim()) !== -1;
      });
    }

    return dados;
  }

  function calcularTotaisBanco(banco, linhas, camposSel) {
    const totais = { qtd: linhas.length, somaValor: 0, somaPagos: 0, temValor: false, temSituacao: false };
    const campoValor = banco === 'financeiro' ? 'vlr_servico' : (banco === 'pedidos' ? 'valor_corrida' : null);
    if (campoValor && camposSel.indexOf(campoValor) !== -1) {
      totais.temValor = true;
      linhas.forEach(function (l) {
        const v = parseMoeda(l[campoValor]);
        if (!isNaN(v)) totais.somaValor += v;
      });
    }
    if (banco === 'financeiro' && camposSel.indexOf('situacao') !== -1) {
      totais.temSituacao = true;
      linhas.forEach(function (l) {
        const sit = normalizarComparacao(l.situacao);
        const v = parseMoeda(l[campoValor]);
        if (sit === 'PAGO' && !isNaN(v)) {
          totais.somaPagos += v;
        }
      });
    }
    return totais;
  }

  function montarSnapshot() {
    const snapshot = { bancos: {}, meta: {}, resumos: {} };

    bancosDoBuilder().forEach(function (banco) {
      const camposSel = Object.keys(state.builder.selecionados[banco]).filter(function (c) { return state.builder.selecionados[banco][c]; });
      if (!camposSel.length) return;
      const dados = coletarDadosBanco(banco);
      const linhas = dados.map(function (registro) {
        const linha = {};
        camposSel.forEach(function (campo) {
          if (banco === 'pedidos') {
            linha[campo] = obterValorCampoPedido(campo, registro);
          } else if (banco === 'financeiro') {
            linha[campo] = obterValorCampoFinanceiro(campo, registro);
          } else if (banco === 'chat') {
            linha[campo] = obterValorCampoChat(campo, registro);
          } else {
            linha[campo] = resolverValor(banco, campo, registro);
          }
        });
        return linha;
      });
      snapshot.bancos[banco] = {
        label: BANCOS[banco].label,
        campos: camposSel.map(function (c) { return { chave: c, label: BANCOS[banco].campos[c] }; }),
        linhas: linhas,
        totais: calcularTotaisBanco(banco, linhas, camposSel)
      };
    });

    const pedidosSelecionado = !!snapshot.bancos.pedidos;
    if (pedidosSelecionado) {
      const pedidosData = coletarDadosBanco('pedidos');
      const resumoMotoboys = agruparPorMotoboy(pedidosData);
      const resumoClientes = agruparPorCliente(pedidosData);
      snapshot.resumos.motoboys = resumoMotoboys;
      snapshot.resumos.clientes = resumoClientes;

      const datasPorMotoboy = {};
      pedidosData.forEach(function (registro) {
        const nomeMotoboy = obterValorCampoPedido('motoboy', registro);
        if (!nomeMotoboy) return;
        const dataBruta = obterDataPedidoComFallback(registro);
        const dataISO = normalizarDataISO(dataBruta);
        const dataFormatada = dataISO ? formatDateBR(dataISO) : null;
        if (!dataFormatada) return;
        if (!datasPorMotoboy[nomeMotoboy]) datasPorMotoboy[nomeMotoboy] = [];
        if (datasPorMotoboy[nomeMotoboy].indexOf(dataFormatada) === -1) {
          datasPorMotoboy[nomeMotoboy].push(dataFormatada);
        }
      });

      const totalChamados = pedidosData.length;
      const totalMotoboysDistintos = resumoMotoboys.length;
      const valorTotalGeral = resumoMotoboys.reduce(function (acc, m) { return acc + m.receitaTotal; }, 0);
      const valorTotalMotoboys = resumoMotoboys.reduce(function (acc, m) { return acc + m.valorMotoboy; }, 0);
      const valorTotalRdo = resumoMotoboys.reduce(function (acc, m) { return acc + m.valorRdo; }, 0);
      const totalPendentes = resumoMotoboys.reduce(function (acc, m) { return acc + m.qtdPendente; }, 0);

      snapshot.resumos.geral = {
        totalChamados: totalChamados,
        totalMotoboysDistintos: totalMotoboysDistintos,
        valorTotalGeral: valorTotalGeral,
        valorTotalMotoboys: valorTotalMotoboys,
        valorTotalRdo: valorTotalRdo,
        totalPendentes: totalPendentes,
        motoboys: resumoMotoboys.map(function (m) {
          return {
            nome: m.nome,
            qtd: m.qtd,
            receitaTotal: m.receitaTotal,
            valorMotoboy: m.valorMotoboy,
            datas: (datasPorMotoboy[m.nome] || []).sort(function (a, b) {
              return new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'));
            })
          };
        })
      };
    }

    snapshot.meta.usuarioGerador = obterUsuarioLogado();
    snapshot.meta.horaGeracao = obterHoraAtualBR();
    return snapshot;
  }

  function finalizarGeracao() {
    try {
      if (!els.builderNomeInput) return;
      const nome = (els.builderNomeInput.value || '').trim();
      if (!nome) { relToast('Informe o nome do relatório.', 'warning'); els.builderNomeInput.focus(); return; }

      state.builder.nome = nome;
      state.ultimoBuilderState = JSON.parse(JSON.stringify(state.builder));

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
        usuarioGerador: obterUsuarioLogado(),
        horaGeracao: obterHoraAtualBR(),
        snapshot: snapshot
      };

      setTimeout(function () {
        els.builderBtnGerar.disabled = false;
        els.builderBtnGerar.innerHTML = '<i class="bi bi-file-earmark-bar-graph"></i><span>Gerar Relatório</span>';
        fecharBuilder();
        abrirModalRelatorio(rel, true);
      }, 400);
    } catch (e) {
      relToast('Erro ao gerar relatório: ' + e.message, 'danger');
      if (els.builderBtnGerar) {
        els.builderBtnGerar.disabled = false;
        els.builderBtnGerar.innerHTML = '<i class="bi bi-file-earmark-bar-graph"></i><span>Gerar Relatório</span>';
      }
    }
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
    if (els.modalBtnPdf) els.modalBtnPdf.addEventListener('click', gerarPdfRelatorio);

    if (els.modalBtnVoltar) els.modalBtnVoltar.addEventListener('click', function () {
      if (!state.ultimoBuilderState) { relToast('Não há edição anterior disponível.', 'warning'); return; }
      fecharModalRelatorio();
      abrirBuilder(state.ultimoBuilderState.tipo, state.ultimoBuilderState);
    });

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

    if (els.paginacao) {
      Object.keys(els.paginacao).forEach(function (tab) {
        const p = els.paginacao[tab];
        if (p.prev) p.prev.addEventListener('click', function () { if (state.paginaAtual > 1) { state.paginaAtual--; renderizarListas(); } });
        if (p.next) p.next.addEventListener('click', function () { state.paginaAtual++; renderizarListas(); });
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (els.builderOverlay && els.builderOverlay.style.display === 'flex') fecharBuilder();
      else if (els.modalOverlay && els.modalOverlay.style.display === 'flex') fecharModalRelatorio();
    });
  }

  function abrirModalRelatorio(relatorio, novoGerado) {
    try {
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
      if (els.modalBtnVoltar) els.modalBtnVoltar.style.display = (novoGerado && state.ultimoBuilderState) ? 'inline-flex' : 'none';

      if (els.modalBody) {
        const snapshot = relatorio.snapshot || { bancos: {} };
        els.modalBody.innerHTML = construirConteudoRelatorio(relatorio, snapshot);
      }

      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    } catch (e) {
      relToast('Erro ao exibir relatório: ' + e.message, 'danger');
    }
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
    const descricao = JSON.stringify({ titulo: atual.titulo, snapshot: atual.snapshot });

    const payload = {
      id: atual.id,
      id_pedido: '',
      data: formatDateBR(atual.data_inicio) + ' - ' + formatDateBR(atual.data_fim),
      tipo: atual.tipo,
      descricao: descricao,
      motoboy: '',
      vlr_servico: '',
      colaborador: '',
      observacao: atual.periodoLabel,
      situacao: 'gerado'
    };

    window.API.call('addrelatorio', payload)
      .then(function (res) {
        if (res && res.status === 'success') {
          const registroLista = {
            id: payload.id,
            tipo: payload.tipo,
            titulo: atual.titulo,
            periodoLabel: payload.observacao,
            criadoEm: atual.criadoEm,
            descricao: payload.descricao,
            snapshot: atual.snapshot,
            data_inicio: atual.data_inicio,
            data_fim: atual.data_fim,
            data: payload.data,
            usuarioGerador: atual.usuarioGerador,
            horaGeracao: atual.horaGeracao
          };

          state.relatoriosSalvos.unshift(registroLista);
          state.ultimoBuilderState = null;
          state.paginaAtual = 1;
          renderizarListas();
          relToast('Relatório salvo com sucesso!', 'success');
          fecharModalRelatorio();
        } else {
          throw new Error((res && res.message) || 'Erro desconhecido ao salvar');
        }
      })
      .catch(function (err) {
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

    const usuarioGerador = relatorio.usuarioGerador || (snapshot && snapshot.meta && snapshot.meta.usuarioGerador) || 'Não identificado';
    const horaGeracao = relatorio.horaGeracao || (snapshot && snapshot.meta && snapshot.meta.horaGeracao) || '-';

    html += '<div class="rel-modal-section">';
    html += '<div class="rel-modal-section-title"><i class="bi bi-info-circle"></i> Informações</div>';
    html += '<div class="rel-modal-grid">';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Tipo</div><div class="rel-modal-card-value">' + escapeHtml(relatorio.tipo) + '</div></div>';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Período</div><div class="rel-modal-card-value">' + escapeHtml(relatorio.periodoLabel) + '</div></div>';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Gerado por</div><div class="rel-modal-card-value">' + escapeHtml(usuarioGerador) + '</div></div>';
    html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Hora</div><div class="rel-modal-card-value">' + escapeHtml(horaGeracao) + '</div></div>';
    html += '</div></div>';

    const bancos = snapshot && snapshot.bancos ? snapshot.bancos : {};
    Object.keys(bancos).forEach(function (banco) {
      const info = bancos[banco];
      if (!info || !info.campos || !info.campos.length) return;
      html += '<div class="rel-modal-divider"></div>';
      html += '<div class="rel-modal-section">';
      html += '<div class="rel-modal-section-title"><i class="bi bi-table"></i> ' + escapeHtml(info.label) + ' (' + info.linhas.length + ')</div>';

      if (!info.linhas.length) {
        html += '<div style="font-size:.75rem;color:#999;">Nenhum registro no período.</div>';
      } else {
        html += '<div style="overflow-x:auto;"><table class="table table-sm table-bordered" style="font-size:.72rem;background:#fff;">';
        html += '<thead><tr>';
        info.campos.forEach(function (c) { html += '<th>' + escapeHtml(c.label) + '</th>'; });
        html += '</tr></thead><tbody>';
        info.linhas.forEach(function (linha) {
          html += '<tr>';
          info.campos.forEach(function (c) {
            let valor = linha[c.chave];
            if (c.chave === 'vlr_servico' || c.chave === 'valor_corrida') {
              valor = formatarMoeda(valor);
            } else if (c.chave === 'horario') {
              valor = extrairHora(valor);
            }
            html += '<td>' + escapeHtml(valor === undefined || valor === null ? '' : valor) + '</td>';
          });
          html += '</tr>';
        });
        html += '</tbody></table></div>';

        if (info.totais && (info.totais.temValor || info.totais.temSituacao)) {
          html += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;">';
          html += '<div class="rel-modal-card" style="background:#f0f7ff;"><div class="rel-modal-card-label">Total de Registros</div><div class="rel-modal-card-value">' + info.totais.qtd + '</div></div>';
          if (info.totais.temValor) {
            html += '<div class="rel-modal-card" style="background:#eafaf0;"><div class="rel-modal-card-label">Soma Valor Serviço</div><div class="rel-modal-card-value" style="color:#0a7d2c;">' + formatarMoeda(info.totais.somaValor) + '</div></div>';
          }
          if (info.totais.temSituacao) {
            html += '<div class="rel-modal-card" style="background:#fff6e8;"><div class="rel-modal-card-label">Soma Pagos</div><div class="rel-modal-card-value" style="color:#b06d00;">' + formatarMoeda(info.totais.somaPagos) + '</div></div>';
          }
          html += '</div>';
        }
      }
      html += '</div>';
    });

    const resumos = snapshot && snapshot.resumos ? snapshot.resumos : {};

    if (resumos.motoboys && resumos.motoboys.length) {
      html += '<div class="rel-modal-divider"></div>';
      html += '<div class="rel-modal-section">';
      html += '<div class="rel-modal-section-title"><i class="bi bi-bicycle"></i> Resumo por Motoboy</div>';

      html += '<div style="background:#f0f7ff;border:1px solid #cfe2ff;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:.75rem;color:#1c3d5a;">';
      html += '<i class="bi bi-info-circle-fill" style="margin-right:6px;color:#0d6efd;"></i>';
      html += '<strong>Regra de divisão da corrida:</strong> do valor total de cada corrida, <strong>' +
        (PERCENTUAL_MOTOBOY * 100).toFixed(0) + '%</strong> é destinado ao motoboy e <strong>' +
        (PERCENTUAL_RDO * 100).toFixed(0) + '%</strong> é retido pela RDO (empresa). ' +
        'O "Valor Total Receita" representa a soma bruta das corridas; "Valor Motoboy" e "Valor RDO" são os valores já calculados conforme essa divisão.';
      html += '</div>';

      html += '<div style="overflow-x:auto;"><table class="table table-sm table-bordered" style="font-size:.72rem;background:#fff;">';
      html += '<thead><tr>' +
        '<th>Motoboy</th>' +
        '<th>Qtd. Corridas</th>' +
        '<th>Valor Total Receita</th>' +
        '<th>Valor Motoboy (' + (PERCENTUAL_MOTOBOY * 100).toFixed(0) + '%)</th>' +
        '<th>Valor RDO (' + (PERCENTUAL_RDO * 100).toFixed(0) + '%)</th>' +
        '<th>Total Calculado</th>' +
        '</tr></thead><tbody>';

      let totalGeralReceita = 0, totalGeralMotoboy = 0, totalGeralRdo = 0, totalGeralCalculado = 0;

      resumos.motoboys.forEach(function (m) {
        totalGeralReceita += m.receitaTotal;
        totalGeralMotoboy += m.valorMotoboy;
        totalGeralRdo += m.valorRdo;
        totalGeralCalculado += m.valorTotalCalculado;

        html += '<tr>' +
          '<td><strong>' + escapeHtml(m.nome) + '</strong></td>' +
          '<td>' + m.qtd + '</td>' +
          '<td>' + formatarMoeda(m.receitaTotal) + '</td>' +
          '<td style="color:#0a7d2c;font-weight:600;">' + formatarMoeda(m.valorMotoboy) + '</td>' +
          '<td style="color:#0d6efd;font-weight:600;">' + formatarMoeda(m.valorRdo) + '</td>' +
          '<td>' + formatarMoeda(m.valorTotalCalculado) + '</td>' +
          '</tr>';
      });

      html += '</tbody><tfoot><tr style="font-weight:700;background:#f8f9fa;">' +
        '<td>TOTAL GERAL</td>' +
        '<td>-</td>' +
        '<td>' + formatarMoeda(totalGeralReceita) + '</td>' +
        '<td style="color:#0a7d2c;">' + formatarMoeda(totalGeralMotoboy) + '</td>' +
        '<td style="color:#0d6efd;">' + formatarMoeda(totalGeralRdo) + '</td>' +
        '<td>' + formatarMoeda(totalGeralCalculado) + '</td>' +
        '</tr></tfoot></table></div>';

      const temPendentes = resumos.motoboys.some(function (m) { return m.qtdPendente > 0; });
      if (temPendentes) {
        html += '<div style="margin-top:12px;font-size:.72rem;color:#b02a37;background:#fff3f3;border:1px solid #f5c2c7;border-radius:8px;padding:8px 12px;">';
        html += '<i class="bi bi-exclamation-triangle-fill" style="margin-right:6px;"></i>';
        html += '<strong>Atenção:</strong> existem corridas com status pendente (não concluído) inclusas nos totais acima. Consulte a coluna de status na tabela de pedidos para detalhes individuais.';
        html += '</div>';
      }

      html += '</div>';
    }

    if (resumos.clientes && resumos.clientes.length) {
      html += '<div class="rel-modal-divider"></div>';
      html += '<div class="rel-modal-section">';
      html += '<div class="rel-modal-section-title"><i class="bi bi-people"></i> Resumo por Cliente</div>';
      html += '<div style="overflow-x:auto;"><table class="table table-sm table-bordered" style="font-size:.75rem;background:#fff;">';
      html += '<thead><tr><th>Cliente</th><th>Qtd. Pedidos</th><th>Total Gasto</th><th>Pendente (qtd)</th><th>Total Pendente</th></tr></thead><tbody>';
      let totalGeralCli = 0, totalPendGeralCli = 0;
      resumos.clientes.forEach(function (c) {
        totalGeralCli += c.total;
        totalPendGeralCli += c.totalPendente;
        html += '<tr>' +
          '<td><strong>' + escapeHtml(c.nome) + '</strong></td>' +
          '<td>' + c.qtd + '</td>' +
          '<td>' + formatarMoeda(c.total) + '</td>' +
          '<td>' + (c.qtdPendente || '-') + '</td>' +
          '<td>' + (c.totalPendente ? formatarMoeda(c.totalPendente) : '-') + '</td>' +
          '</tr>';
      });
      html += '</tbody><tfoot><tr style="font-weight:700;background:#f8f9fa;">' +
        '<td>TOTAL GERAL</td><td>-</td><td>' + formatarMoeda(totalGeralCli) + '</td><td>-</td><td>' + formatarMoeda(totalPendGeralCli) + '</td>' +
        '</tr></tfoot></table></div></div>';
    }

    if (resumos.geral) {
      const g = resumos.geral;
      html += '<div class="rel-modal-divider"></div>';
      html += '<div class="rel-modal-section" style="background:#fff9f0;border:2px solid #ffc107;border-radius:12px;padding:16px 18px;">';
      html += '<div class="rel-modal-section-title" style="font-size:.95rem;"><i class="bi bi-clipboard2-check-fill" style="color:#dc3545;"></i> Resumo Final do Relatório</div>';

      html += '<div class="rel-modal-grid" style="margin-bottom:14px;grid-template-columns:repeat(3,1fr);">';
      html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Total de Corridas</div><div class="rel-modal-card-value" style="font-size:1rem;color:#dc3545;">' + g.totalChamados + '</div></div>';
      html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Total a Cobrar do Cliente</div><div class="rel-modal-card-value" style="font-size:1rem;color:#0d6efd;">' + formatarMoeda(g.valorTotalGeral) + '</div></div>';
      html += '<div class="rel-modal-card"><div class="rel-modal-card-label">Corridas Pendentes</div><div class="rel-modal-card-value" style="font-size:1rem;color:#b02a37;">' + g.totalPendentes + '</div></div>';
      html += '</div>';

      html += '<div style="font-size:.8rem;font-weight:700;color:#444;margin-bottom:8px;">Corridas por Motoboy</div>';
      html += '<div style="display:flex;flex-direction:column;gap:8px;">';
      g.motoboys.forEach(function (m) {
        const datasHtml = (m.datas && m.datas.length)
          ? m.datas.map(function (d) {
            return '<span style="display:inline-block;background:#f8f9fa;border:1px solid #dee2e6;border-radius:12px;padding:2px 8px;margin:2px;font-size:.68rem;color:#555;">' + escapeHtml(d) + '</span>';
          }).join('')
          : '<span style="font-size:.68rem;color:#999;">Sem datas registradas</span>';

        html += '<div style="background:#fff;border:1px solid #eee;border-radius:8px;padding:10px 12px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
        html += '<span style="font-size:.82rem;"><i class="bi bi-person-fill me-1" style="color:#dc3545;"></i><strong>' + escapeHtml(m.nome) + '</strong> — ' + m.qtd + (m.qtd === 1 ? ' corrida' : ' corridas') + '</span>';
        html += '<span style="font-weight:600;color:#0a7d2c;font-size:.82rem;">' + formatarMoeda(m.receitaTotal) + '</span>';
        html += '</div>';
        html += '<div>' + datasHtml + '</div>';
        html += '</div>';
      });
      html += '</div>';

      html += '</div>';
    }

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
    if (state.tabAtual === 'motoboys') renderizarListaGenerica(els.mbLista, 'motoboys', 'bi-bicycle', 'motoboys');
    else if (state.tabAtual === 'clientes') renderizarListaGenerica(els.cliLista, 'clientes', 'bi-people', 'clientes');
    else if (state.tabAtual === 'financeiro') renderizarListaGenerica(els.finLista, 'financeiro', 'bi-wallet2', 'financeiro');
    else if (state.tabAtual === 'global') renderizarListaGenerica(els.globLista, 'global', 'bi-globe2', 'global');
  }

  function obterUsuarioLogado() {
    try {
      if (window.usuarioLogado && (window.usuarioLogado.username || window.usuarioLogado.nome)) {
        return window.usuarioLogado.username || window.usuarioLogado.nome;
      }
      const username = localStorage.getItem('username');
      if (username && username.trim() && username !== 'null' && username !== 'undefined') return username.trim();
      const fontes = [sessionStorage, localStorage];
      for (let i = 0; i < fontes.length; i++) {
        const store = fontes[i];
        const raw = store.getItem('usuarioLogado') || store.getItem('usuario') || store.getItem('user');
        if (raw) {
          try {
            const obj = JSON.parse(raw);
            if (obj && (obj.username || obj.nome)) return obj.username || obj.nome;
          } catch (e) {
            if (typeof raw === 'string' && raw.trim()) return raw.trim();
          }
        }
      }
    } catch (e) { }
    return 'Usuário não identificado';
  }

  function obterHoraAtualBR() {
    return new Date().toLocaleString('pt-BR');
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
        '<div class="rel-item-sub">' + escapeHtml(rel.periodoLabel || 'Sem período') + ' • ' + escapeHtml(dtCriado) + '</div>' +
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

  function apiComRetry(endpoint, params, tentativas) {
    tentativas = tentativas || 2;
    return window.API.call(endpoint, params).catch(function (err) {
      if (tentativas > 1) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(apiComRetry(endpoint, params, tentativas - 1));
          }, 800);
        });
      }
      throw err;
    });
  }

  function executarSequencial(chamadas) {
    const resultados = [];
    return chamadas.reduce(function (promessaAnterior, fnChamada) {
      return promessaAnterior.then(function () {
        return fnChamada()
          .then(function (res) { resultados.push({ status: 'fulfilled', value: res }); })
          .catch(function (err) { resultados.push({ status: 'rejected', reason: err }); });
      });
    }, Promise.resolve()).then(function () { return resultados; });
  }

  function carregarDados() {
    if (state.fetching) return;
    state.fetching = true;
    spinOn();
    exibirLoadingListas();

    const chamadas = [
      function () { return apiComRetry('getclientes', {}); },
      function () { return apiComRetry('getcolaboradores', {}); },
      function () { return apiComRetry('getpedidos', {}); },
      function () { return apiComRetry('getchat', {}); },
      function () { return apiComRetry('getfinanceiro', {}); },
      function () { return apiComRetry('getrelatorios', {}); }
    ];

    executarSequencial(chamadas)
      .then(function (r) {
        function pega(idx) {
          return r[idx].status === 'fulfilled' ? r[idx].value : null;
        }

        const labels = ['clientes', 'colaboradores', 'pedidos', 'chat', 'financeiro', 'relatorios'];
        let houveFalha = false;

        r.forEach(function (res, i) {
          if (res.status === 'rejected') {
            houveFalha = true;
            relToast('Falha ao carregar "' + labels[i] + '": ' + (res.reason && res.reason.message ? res.reason.message : res.reason), 'danger');
          }
        });

        state.clientes = extrairArray(pega(0));
        state.motoboys = extrairArray(pega(1));
        state.pedidos = extrairArray(pega(2));
        state.chat = extrairArray(pega(3));
        state.financeiro = extrairArray(pega(4));

        state.relatoriosSalvos = extrairArray(pega(5)).map(function (rel) {
          let titulo = '';
          let snapshot = null;
          if (rel.descricao) {
            try {
              const obj = JSON.parse(rel.descricao);
              if (obj && obj.titulo) titulo = obj.titulo;
              if (obj && obj.snapshot) snapshot = obj.snapshot;
              else if (obj && obj.bancos) snapshot = obj;
            } catch (e) { }
          }
          rel.titulo = titulo || rel.tipo || 'Relatório';
          rel.snapshot = snapshot;
          rel.periodoLabel = rel.observacao || rel.data || '';
          return rel;
        });

        popularSelectMotoboys();
        popularSelectClientes();
        renderizarListas();

        if (houveFalha) {
          relToast('Alguns dados não foram carregados. Clique em sincronizar para tentar novamente.', 'warning');
        }
      })
      .catch(function (err) {
        relToast('Erro ao carregar dados: ' + err.message, 'danger');
        renderizarListas();
      })
      .finally(function () {
        state.fetching = false;
        spinOff();
      });
  }

  window.RelatoriosDebug = {
    getState: function () { return state; },
    recarregar: carregarDados,
    parseMoeda: parseMoeda
  };

  window.initRelatorios = function () {
    try {
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
    } catch (e) {
      relToast('Erro ao inicializar módulo de relatórios: ' + e.message, 'danger');
    }
  };

  function gerarPdfRelatorio() {
    if (!state.relatorioAtual) { relToast('Nenhum relatório para gerar PDF.', 'warning'); return; }

    const rel = state.relatorioAtual;
    const snapshot = rel.snapshot || { bancos: {} };
    const conteudo = construirConteudoRelatorio(rel, snapshot);

    const win = window.open('', '_blank');
    if (!win) { relToast('Bloqueador de pop-up impediu a geração do PDF.', 'warning'); return; }

    const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
      '<title>' + escapeHtml(rel.titulo || 'Relatório') + '</title>' +
      '<style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#222;padding:24px;font-size:12px;}' +
      'h1{font-size:18px;margin-bottom:4px;}' +
      '.periodo{color:#666;font-size:12px;margin-bottom:16px;}' +
      '.rel-modal-divider{border-top:1px solid #ddd;margin:18px 0;}' +
      '.rel-modal-section-title{font-weight:700;font-size:13px;margin-bottom:10px;}' +
      '.rel-modal-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;}' +
      '.rel-modal-card{background:#f7f7f7;border-radius:8px;padding:8px 10px;}' +
      '.rel-modal-card-label{font-size:10px;color:#777;}' +
      '.rel-modal-card-value{font-weight:700;font-size:13px;}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:10px;}' +
      'th,td{border:1px solid #ccc;padding:5px 7px;font-size:11px;text-align:left;}' +
      'th{background:#f0f0f0;}' +
      'tfoot tr{background:#f8f9fa;font-weight:700;}' +
      '@media print{body{padding:0;}}' +
      '</style></head><body>' +
      '<h1>' + escapeHtml(rel.titulo || 'Relatório') + '</h1>' +
      '<div class="periodo">' + escapeHtml(rel.periodoLabel || '') + '</div>' +
      conteudo +
      '</body></html>';

    win.document.open();
    win.document.write(html);
    win.document.close();

    win.onload = function () {
      setTimeout(function () {
        win.focus();
        win.print();
      }, 300);
    };
  }
})();
