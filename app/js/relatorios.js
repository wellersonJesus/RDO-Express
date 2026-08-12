'use strict';

(function () {
  window.addEventListener('error', function (e) {
    relToast('Erro: ' + e.message, 'danger');
  });

  window.addEventListener('unhandledrejection', function (e) {
    const msg = (e.reason && e.reason.message) ? e.reason.message : e.reason;
    relToast('Erro assíncrono: ' + msg, 'danger');
  });

  const ALIASES = {
    pedidos: {
      id: ['id'], id_cliente: ['id_cliente'], solicitante: ['solicitante'], contato: ['contato'],
      data: ['data'], horario: ['horario', 'hora'], mercadoria: ['mercadoria'], de: ['de'], para: ['para'],
      retorno: ['retorno'], prioridade: ['prioridade'], valor_corrida: ['valor_corrida', 'vlr_servico'],
      motoboy: ['motoboy'], status: ['status'], observacao: ['observacao']
    },
    financeiro: {
      label: 'Financeiro', icon: 'bi-wallet2', endpoint: 'getfinanceirocompleto',
      campos: {
        id_pedido: 'Pedido', data: 'Data', tipo: 'Tipo', cliente: 'Cliente', descricao: 'Descrição',
        motoboy: 'Motoboy', vlr_servico: 'Valor Serviço', colaborador: 'Colaborador',
        observacao: 'Observação', situacao: ['situacao', 'status_pagamento', 'status']
      }
    },
    clientes: {
      bancos: ['clientes', 'pedidos', 'chat', 'financeiro'],
      campos: {
        clientes: ['username', 'responsavel', 'contato', 'pagamento', 'status'],
        pedidos: ['id', 'solicitante', 'contato', 'data', 'horario', 'mercadoria', 'de', 'para', 'retorno', 'prioridade', 'valor_corrida', 'motoboy', 'status', 'observacao'],
        chat: ['pedido_id', 'texto', 'hora', 'data', 'finalizado'],
        financeiro: ['id_pedido', 'data', 'tipo', 'cliente', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao']
      },
      defaults: {
        clientes: ['username'],
        pedidos: ['id', 'data', 'horario', 'de', 'para', 'valor_corrida', 'motoboy', 'status'],
        chat: [],
        financeiro: ['data', 'cliente', 'descricao', 'vlr_servico']
      }
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

  const GRUPOS_CLIENTE_ALIAS = {
    'ELISA ATHENIENSE': ['HXQ9VBU59DG']
  };

  function normalizarIdCliente(id) {
    return String(id == null ? '' : id).trim().toUpperCase();
  }

  function nomeCanonicoDoGrupo(idCliente) {
    const idNorm = normalizarIdCliente(idCliente);
    if (!idNorm) return null;
    const chaves = Object.keys(GRUPOS_CLIENTE_ALIAS);
    for (let i = 0; i < chaves.length; i++) {
      if (GRUPOS_CLIENTE_ALIAS[chaves[i]].indexOf(idNorm) !== -1) return chaves[i];
    }
    return null;
  }

  function idsDoGrupoAlias(idCliente) {
    const canonico = nomeCanonicoDoGrupo(idCliente);
    if (!canonico) return [normalizarIdCliente(idCliente)];
    return GRUPOS_CLIENTE_ALIAS[canonico].slice();
  }

  function canonicoPorNomeExato(nome) {
    const nomeNorm = normalizarComparacao(nome);
    if (!nomeNorm) return null;
    const chaves = Object.keys(GRUPOS_CLIENTE_ALIAS);
    for (let i = 0; i < chaves.length; i++) {
      if (normalizarComparacao(chaves[i]) === nomeNorm) return chaves[i];
    }
    return null;
  }

  function idsDoGrupoPorNomeOuId(idOuNome) {
    const canonicoPorId = nomeCanonicoDoGrupo(idOuNome);
    if (canonicoPorId) return GRUPOS_CLIENTE_ALIAS[canonicoPorId].slice();
    const canonicoPorNome = canonicoPorNomeExato(idOuNome);
    if (canonicoPorNome) return GRUPOS_CLIENTE_ALIAS[canonicoPorNome].slice();
    return [normalizarIdCliente(idOuNome)];
  }

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
        id_pedido: 'Pedido', data: 'Data', tipo: 'Tipo', cliente: 'Cliente', descricao: 'Descrição',
        motoboy: 'Motoboy', vlr_servico: 'Valor Serviço', colaborador: 'Colaborador',
        observacao: 'Observação', situacao: 'Situação'
      }
    },

  };

  const PRESETS = {
    motoboys: {
      bancos: ['colaborador', 'pedidos', 'financeiro'],
      campos: {
        colaborador: ['username', 'colaborador', 'cpf_cnpj', 'placa', 'email', 'endereco', 'bairro', 'chave_pix', 'comissao', 'status'],
        pedidos: ['id', 'solicitante', 'contato', 'data', 'horario', 'mercadoria', 'de', 'para', 'retorno', 'prioridade', 'valor_corrida', 'motoboy', 'status', 'observacao'],
        financeiro: ['id_pedido', 'data', 'tipo', 'cliente', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao']
      },
      defaults: {
        colaborador: ['username'],
        pedidos: [],
        financeiro: ['data', 'cliente', 'descricao', 'vlr_servico']
      }
    },
    clientes: {
      bancos: ['clientes', 'pedidos', 'chat', 'financeiro'],
      campos: {
        clientes: ['username', 'responsavel', 'contato', 'pagamento', 'status'],
        pedidos: ['id', 'solicitante', 'contato', 'data', 'horario', 'mercadoria', 'de', 'para', 'retorno', 'prioridade', 'valor_corrida', 'motoboy', 'status', 'observacao'],
        chat: ['pedido_id', 'texto', 'hora', 'data', 'finalizado'],
        financeiro: ['id_pedido', 'data', 'tipo', 'cliente', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao']
      },
      defaults: {
        clientes: ['username'],
        pedidos: [],
        chat: [],
        financeiro: ['data', 'cliente', 'descricao', 'vlr_servico']
      }
    },
    financeiro: {
      bancos: ['financeiro', 'pedidos'],
      campos: {
        financeiro: ['id_pedido', 'data', 'tipo', 'cliente', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao'],
        pedidos: ['id', 'motoboy', 'valor_corrida', 'status', 'data', 'solicitante']
      },
      defaults: {
        financeiro: ['data', 'tipo', 'descricao', 'vlr_servico'],
        pedidos: []
      }
    },
    global: {
      bancos: ['colaborador', 'clientes', 'pedidos', 'financeiro', 'chat'],
      campos: {
        colaborador: ['username', 'colaborador', 'cpf_cnpj', 'placa', 'email', 'endereco', 'bairro', 'chave_pix', 'comissao', 'status'],
        clientes: ['username', 'responsavel', 'contato', 'pagamento', 'status'],
        pedidos: ['id', 'solicitante', 'contato', 'data', 'horario', 'mercadoria', 'de', 'para', 'retorno', 'prioridade', 'valor_corrida', 'motoboy', 'status', 'observacao'],
        financeiro: ['id_pedido', 'data', 'tipo', 'cliente', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao'],
        chat: ['pedido_id', 'texto', 'hora', 'data', 'finalizado']
      },
      defaults: {
        colaborador: ['username', 'colaborador', 'cpf_cnpj', 'placa', 'email', 'endereco', 'bairro', 'chave_pix', 'comissao', 'status'],
        clientes: ['username', 'responsavel', 'contato', 'pagamento', 'status'],
        pedidos: ['id', 'solicitante', 'contato', 'data', 'horario', 'mercadoria', 'de', 'para', 'retorno', 'prioridade', 'valor_corrida', 'motoboy', 'status', 'observacao'],
        financeiro: ['id_pedido', 'data', 'tipo', 'cliente', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao'],
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
    ordenacao: { motoboys: 'desc', clientes: 'desc', financeiro: 'desc', global: 'desc' },
    builder: { tipo: null, periodo: { inicio: '', fim: '' }, filtroExtra: null, bancoAtivo: null, selecionados: {}, step: 1, nome: '' }
  };

  const ENDERECOS_CLIENTE_ALIAS = {
    'PLURAL': [
      'AV DO CONTORNO 2316', 'AVENIDA DO CONTORNO 2316', 'DIAMOND MALL',
      'R MIGUEL GOMES DA COSTA 52', 'RUA MIGUEL GOMES DA COSTA 52',
      'MIGUEL GOMES DA COSTA 52 MANTIQUEIRA'
    ]
  };

  const els = {};
  let inicializado = false;

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

    els.filtrosPorTipo = {
      motoboys: {
        dataInicio: document.getElementById('rel-mb-data-inicio'),
        dataFim: document.getElementById('rel-mb-data-fim'),
        select: document.getElementById('rel-mb-select')
      },
      clientes: {
        dataInicio: document.getElementById('rel-cli-data-inicio'),
        dataFim: document.getElementById('rel-cli-data-fim'),
        select: document.getElementById('rel-cli-select')
      },
      financeiro: {
        dataInicio: document.getElementById('rel-fin-data-inicio'),
        dataFim: document.getElementById('rel-fin-data-fim'),
        select: document.getElementById('rel-fin-tipo')
      },
      global: {
        dataInicio: document.getElementById('rel-glob-data-inicio'),
        dataFim: document.getElementById('rel-glob-data-fim'),
        select: null
      }
    };

    els.formMotoboySelect = els.filtrosPorTipo.motoboys.select;
    els.formClienteSelect = els.filtrosPorTipo.clientes.select;

    els.mbLista = document.getElementById('rel-motoboys-lista');
    els.cliLista = document.getElementById('rel-clientes-lista');
    els.finLista = document.getElementById('rel-financeiro-lista');
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
    els.btnsOrdenar = document.querySelectorAll('.btn-sort-data');
  }

  function exibirLoadingListas() {
    const loadingHtml =
      '<div class="rel-lista-loading">' +
      '<i class="bi bi-search rel-loading-spin"></i>' +
      '<span>Buscando informações' +
      '<span class="rel-dots-anim"><span>.</span><span>.</span><span>.</span></span>' +
      '</span>' +
      '</div>';

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
    if (inicio > fim) { relToast('Data inicial maior que a final.', 'warning'); return false; }
    return true;
  }

  function coletarFiltrosInline(tipo) {
    const f = els.filtrosPorTipo[tipo];
    if (!f) {
      relToast('Tipo de relatório inválido: ' + tipo, 'danger');
      return null;
    }

    const inicio = f.dataInicio ? f.dataInicio.value : '';
    const fim = f.dataFim ? f.dataFim.value : '';

    if (!validarDatas(inicio, fim)) return null;

    let filtroExtra = null;
    if (tipo === 'motoboys') {
      const v = f.select ? f.select.value : '__todos__';
      filtroExtra = { campo: 'motoboy_id', valor: [v] };
    } else if (tipo === 'clientes') {
      const v = f.select ? f.select.value : '__todos__';
      filtroExtra = { campo: 'cliente_id', valor: [v] };
    } else if (tipo === 'financeiro') {
      const v = f.select ? f.select.value : '__todos__';
      filtroExtra = { campo: 'tipo_lancamento', valor: [v] };
    }

    return { periodo: { inicio: inicio, fim: fim }, filtroExtra: filtroExtra };
  }

  function iniciarBuilder(tipo, periodo, filtroExtra) {
    try {
      state.builder.tipo = tipo;
      state.builder.periodo = periodo;
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
      } else {
        relToast('Construtor de relatório não encontrado no DOM.', 'danger');
      }
    } catch (e) {
      relToast('Erro ao abrir construtor de relatório: ' + e.message, 'danger');
    }
  }

  function abrirBuilder(tipo, estadoPreservado) {
    if (estadoPreservado) {
      state.builder = JSON.parse(JSON.stringify(estadoPreservado));
      renderizarBuilderTabs();
      renderizarBuilderPanels();
      irParaStep(2);
      if (els.builderNomeInput) els.builderNomeInput.value = state.builder.nome || '';
      if (els.builderOverlay) { els.builderOverlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
      return;
    }

    const filtros = coletarFiltrosInline(tipo);
    if (!filtros) return;

    iniciarBuilder(tipo, filtros.periodo, filtros.filtroExtra);
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

    if (els.builderStepDots) {
      els.builderStepDots.forEach(function (dot) {
        dot.classList.toggle('active', parseInt(dot.dataset.step, 10) <= step);
      });
    }

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
        labels = state.motoboys
          .filter(function (m) { return fx.valor.indexOf(String(m.id)) !== -1; })
          .map(function (m) { return resolverValor('colaborador', 'username', m); });
      } else if (fx.campo === 'cliente_id') {
        labels = state.clientes
          .filter(function (c) { return fx.valor.indexOf(String(c.id)) !== -1; })
          .map(function (c) { return resolverValor('clientes', 'username', c); });
      }

      if (labels.length) html += '<div><strong>Filtro:</strong> ' + escapeHtml(labels.join(', ')) + '</div>';
    }

    html += '<div><strong>Total de campos selecionados:</strong> ' + totalCampos + '</div>';
    els.builderResumo.innerHTML = html;
  }

  function validarSelecao() {
    const total = bancosDoBuilder().reduce(function (acc, banco) { return acc + contarSelecionados(banco); }, 0);
    if (total === 0) { relToast('Selecione ao menos um campo.', 'warning'); return false; }

    if ((state.builder.tipo === 'clientes' || state.builder.tipo === 'motoboys') && contarSelecionados('pedidos') === 0) {
      relToast('Atenção: nenhum campo de "Pedidos" foi selecionado. O resumo de corridas ficará zerado.', 'warning');
    }

    return true;
  }

  function normalizarComparacao(v) {
    return String(v == null ? '' : v)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  function tokenizar(v) {
    return normalizarComparacao(v).split(' ').filter(function (t) { return t.length > 0; });
  }

  function idClientePertenceAOutroCliente(idClienteRegistro, idsExpandidosAlvo) {
    const idNorm = normalizarIdCliente(idClienteRegistro);
    if (!idNorm) return false;

    const clienteEncontrado = state.clientes.find(function (c) {
      return normalizarIdCliente(c.id) === idNorm;
    });
    if (!clienteEncontrado) return false; // id não reconhecido, não bloqueia

    return idsExpandidosAlvo.indexOf(idNorm) === -1;
  }

  function extrairNomesAlvoCliente(valoresBrutos, clientesSelecionados) {
    const nomesTexto = [];

    valoresBrutos.forEach(function (v) {
      const canonico = nomeCanonicoDoGrupo(v) || canonicoPorNomeExato(v);
      if (canonico && nomesTexto.indexOf(canonico) === -1) nomesTexto.push(canonico);
    });

    clientesSelecionados.forEach(function (c) {
      const username = resolverValor('clientes', 'username', c);
      const canonico = nomeCanonicoDoGrupo(c.id) || canonicoPorNomeExato(username);

      if (canonico) {
        if (nomesTexto.indexOf(canonico) === -1) nomesTexto.push(canonico);
        return;
      }

      if (username && nomesTexto.indexOf(username) === -1) nomesTexto.push(username);

      const responsavel = resolverValor('clientes', 'responsavel', c);
      if (responsavel && nomeAlvoEhSeguroParaFuzzy(responsavel) && nomesTexto.indexOf(responsavel) === -1) {
        nomesTexto.push(responsavel);
      }
    });

    return nomesTexto;
  }

  function ehAbreviacaoDeterministica(nomeCurto, nomeCompleto) {
    const tCurto = tokenizar(nomeCurto);
    const tCompleto = tokenizar(nomeCompleto);
    if (!tCurto.length || !tCompleto.length) return false;
    if (tCurto.length !== tCompleto.length) return false;
    if (tCurto.length === 1) return false;

    for (let i = 0; i < tCurto.length; i++) {
      const a = tCurto[i].replace(/\.$/, '');
      const b = tCompleto[i];
      if (a === b) continue;
      if (a.length === 1 && b.charAt(0) === a) continue;
      return false;
    }
    return true;
  }

  function textoContemNomeForte(texto, nomesAlvoSeguros) {
    if (!texto || !nomesAlvoSeguros || !nomesAlvoSeguros.length) return false;
    const tokensTexto = tokensSignificativos(texto);
    if (!tokensTexto.length) return false;

    return nomesAlvoSeguros.some(function (nome) {
      const tokensNome = tokensSignificativos(nome);
      if (!tokensNome.length) return false;

      const comuns = tokensEmComum(texto, nome);
      if (comuns >= tokensNome.length) return true;

      const primeiroToken = tokensNome[0];
      if (primeiroToken.length >= 3 && tokensTexto.indexOf(primeiroToken) !== -1) return true;

      return false;
    });
  }

  function pedidoContemNomeAlvoEmCampos(pedido, nomesAlvoSeguros) {
    if (!nomesAlvoSeguros || !nomesAlvoSeguros.length) return false;
    const campos = ['de', 'para', 'mercadoria', 'observacao', 'solicitante'];
    return campos.some(function (campo) {
      const v = resolverValor('pedidos', campo, pedido);
      return v && textoContemNomeForte(v, nomesAlvoSeguros);
    });
  }

  function pedidoCorrespondeCliente(pedido, clientesSelecionados, idsStr, nomesAlvo) {
    const idPed = normalizarIdCliente(resolverValor('pedidos', 'id_cliente', pedido));

    const idsExpandidos = [];
    idsStr.forEach(function (v) {
      idsDoGrupoPorNomeOuId(v).forEach(function (id) {
        if (idsExpandidos.indexOf(id) === -1) idsExpandidos.push(id);
      });
    });

    if (idPed) {
      if (idsExpandidos.indexOf(idPed) !== -1) return true;
      const canonicoPedido = nomeCanonicoDoGrupo(idPed);
      if (canonicoPedido && nomesAlvo.indexOf(canonicoPedido) !== -1) return true;
    }

    const nomesAlvoSeguros = nomesAlvo.filter(nomeAlvoEhSeguroParaFuzzy);

    if (nomesAlvoSeguros.length && pedidoContemNomeAlvoEmCampos(pedido, nomesAlvoSeguros)) return true;

    if (idPed && idClientePertenceAOutroCliente(idPed, idsExpandidos)) return false;

    const solicitante = resolverValor('pedidos', 'solicitante', pedido);
    if (solicitante && nomesAlvoSeguros.length && valorCorrespondeNomesAlvo(solicitante, nomesAlvoSeguros)) return true;

    return false;
  }

  function normalizarEndereco(v) {
    return normalizarComparacao(v)
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function enderecoPertenceAoCliente(nomeCanonico, textoEndereco) {
    const enderecos = ENDERECOS_CLIENTE_ALIAS[nomeCanonico];
    if (!enderecos || !textoEndereco) return false;
    const endNorm = normalizarEndereco(textoEndereco);
    return enderecos.some(function (e) {
      return endNorm.indexOf(normalizarEndereco(e)) !== -1;
    });
  }

  function pedidoBateEnderecoAlvo(pedido, nomesAlvo) {
    if (!pedido || !nomesAlvo || !nomesAlvo.length) return false;
    const de = resolverValor('pedidos', 'de', pedido);
    const para = resolverValor('pedidos', 'para', pedido);
    return nomesAlvo.some(function (nome) {
      return enderecoPertenceAoCliente(nome, de) || enderecoPertenceAoCliente(nome, para);
    });
  }

  function textoContemEnderecoAlvo(texto, nomesAlvo) {
    if (!texto || !nomesAlvo || !nomesAlvo.length) return false;
    return nomesAlvo.some(function (nome) {
      return enderecoPertenceAoCliente(nome, texto);
    });
  }

  function tokensSignificativos(v) {
    return tokenizar(v).filter(function (t) { return t.length >= 3; });
  }

  function tokensEmComum(a, b) {
    const tA = tokensSignificativos(a);
    const tB = tokensSignificativos(b);
    if (!tA.length || !tB.length) return 0;
    let count = 0;
    tA.forEach(function (t) {
      if (tB.indexOf(t) !== -1) count++;
    });
    return count;
  }

  function tokensTotais(v) {
    return tokenizar(v);
  }

  function tokensFortes(v) {
    return tokenizar(v).filter(function (t) { return t.length >= 5; });
  }

  function nomeAlvoEhSeguroParaFuzzy(nome) {
    const todos = tokensTotais(nome);
    const fortes = tokensFortes(nome);
    return todos.length >= 1 && fortes.length >= 1;
  }

  function extrairSolicitanteEClienteDescricao(descricao) {
    if (!descricao) return { solicitante: '', clienteTexto: '' };
    const texto = String(descricao).trim();
    const mPara = texto.match(/(?:de\s+)?(.+?)\s+para\s+(.+?)(?:\s*[—-]|\s*\[|$)/i);
    if (mPara) return { solicitante: mPara[1].trim(), clienteTexto: mPara[2].trim() };
    return { solicitante: '', clienteTexto: '' };
  }

  function extrairNomeClienteDescricao(descricao) {
    if (!descricao) return '';
    const texto = String(descricao);
    const padroes = [
      /cliente\s*:?\s*([^\-\|\n,]+)/i,
      /para\s+o\s+cliente\s+([^\-\|\n,]+)/i,
      /ref\.?\s*cliente\s*:?\s*([^\-\|\n,]+)/i
    ];
    for (let i = 0; i < padroes.length; i++) {
      const m = texto.match(padroes[i]);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  }

  let _cacheNomesClientesReais = null;
  let _cacheNomesClientesRealsHash = null;

  function _construirIndiceNomesClientesReais() {
    const hashAtual = state.clientes.length + '|' + state.clientes.map(function (c) { return c.id; }).join(',');
    if (_cacheNomesClientesReais && _cacheNomesClientesRealsHash === hashAtual) {
      return _cacheNomesClientesReais;
    }

    const indice = [];

    // Grupos de alias (ex: ELISA ATHENIENSE) entram como nomes-alvo válidos
    Object.keys(GRUPOS_CLIENTE_ALIAS).forEach(function (nomeCanonico) {
      if (nomeAlvoEhSeguroParaFuzzy(nomeCanonico)) {
        indice.push({ nome: nomeCanonico, cliente: null, canonico: nomeCanonico });
      }
    });

    state.clientes.forEach(function (c) {
      const username = resolverValor('clientes', 'username', c);
      const canonicoGrupo = nomeCanonicoDoGrupo(c.id) || canonicoPorNomeExato(username);

      if (canonicoGrupo) {
        // já coberto pelo grupo-alias acima; não duplica
        return;
      }

      if (username && nomeAlvoEhSeguroParaFuzzy(username)) {
        indice.push({ nome: username, cliente: c, canonico: null });
      }

      const responsavel = resolverValor('clientes', 'responsavel', c);
      if (responsavel && nomeAlvoEhSeguroParaFuzzy(responsavel)) {
        indice.push({ nome: responsavel, cliente: c, canonico: null });
      }
    });

    _cacheNomesClientesReais = indice;
    _cacheNomesClientesRealsHash = hashAtual;
    return indice;
  }

  function identificarClienteRealPorTexto(texto) {
    const nomePadrao = normalizarNomeClienteRegex(texto);
    if (!nomePadrao || nomePadrao === 'CLIENTE AVULSO') return null;
    const idPadrao = obterIdPadraoCliente(nomePadrao);
    const cliente = state.clientes.find(function (c) { return normalizarIdCliente(c.id) === normalizarIdCliente(idPadrao); }) || null;
    return { nome: nomePadrao, cliente: cliente, canonico: nomePadrao };
  }

  function identificarClienteRealDoRegistroFinanceiro(registro, pedidoVinculado) {
    const descricao = resolverValor('financeiro', 'descricao', registro);
    const observacao = resolverValor('financeiro', 'observacao', registro);
    const cliente = resolverValor('financeiro', 'cliente', registro);

    let de = '', para = '', mercadoria = '', obsPed = '', solicitante = '';
    if (pedidoVinculado) {
      de = resolverValor('pedidos', 'de', pedidoVinculado);
      para = resolverValor('pedidos', 'para', pedidoVinculado);
      mercadoria = resolverValor('pedidos', 'mercadoria', pedidoVinculado);
      obsPed = resolverValor('pedidos', 'observacao', pedidoVinculado);
      solicitante = resolverValor('pedidos', 'solicitante', pedidoVinculado);
    }

    const nomePadrao = resolverNomeClienteComFallback(descricao, observacao, para, mercadoria, obsPed, cliente, solicitante, de);
    if (nomePadrao === 'CLIENTE AVULSO') return null;

    const idPadrao = obterIdPadraoCliente(nomePadrao);
    const clienteCadastro = state.clientes.find(function (c) { return normalizarIdCliente(c.id) === normalizarIdCliente(idPadrao); }) || null;
    return { nome: nomePadrao, cliente: clienteCadastro, canonico: nomePadrao };
  }

  function nomeExibicaoDaEntradaCliente(entrada) {
    if (!entrada) return '';
    if (entrada.canonico) return entrada.canonico;
    if (entrada.cliente) {
      const username = resolverValor('clientes', 'username', entrada.cliente);
      return username || entrada.nome;
    }
    return entrada.nome;
  }

  function pedidoContemNomeAlvoEmCampos_OLD_UNUSED() { /* mantido apenas para não quebrar referências antigas, se existirem */ }

  function financeiroCorrespondeCliente(registro, nomesAlvo) {
    const pedidoVinculado = buscarPedidoDoFinanceiro(registro);
    const clienteRealIdentificado = identificarClienteRealDoRegistroFinanceiro(registro, pedidoVinculado);
    const nomeReal = clienteRealIdentificado ? clienteRealIdentificado.nome : 'CLIENTE AVULSO';

    const nomesAlvoNorm = nomesAlvo.map(function (n) { return normalizarComparacao(n); });
    return nomesAlvoNorm.indexOf(normalizarComparacao(nomeReal)) !== -1;
  }

  function financeiroEhClienteAvulso(registro) {
    const pedidoVinculado = buscarPedidoDoFinanceiro(registro);
    return identificarClienteRealDoRegistroFinanceiro(registro, pedidoVinculado) === null;
  }

  function chatCorrespondeCliente(registroChat, idsStr, nomesAlvo) {
    const idChat = normalizarIdCliente(resolverValor('chat', 'id_cliente', registroChat));
    const idsExpandidos = [];
    idsStr.forEach(function (v) {
      idsDoGrupoPorNomeOuId(v).forEach(function (id) {
        if (idsExpandidos.indexOf(id) === -1) idsExpandidos.push(id);
      });
    });
    if (idChat && idsExpandidos.indexOf(idChat) !== -1) return true;

    const pedidoVinculado = buscarPedidoDoChat(registroChat);
    if (pedidoVinculado) {
      const nomesAlvoSeguros = nomesAlvo.filter(nomeAlvoEhSeguroParaFuzzy);
      if (nomesAlvoSeguros.length && pedidoContemNomeAlvoEmCampos(pedidoVinculado, nomesAlvoSeguros)) return true;
    }

    if (idChat && idClientePertenceAOutroCliente(idChat, idsExpandidos)) return false;

    if (!pedidoVinculado) return false;
    return pedidoCorrespondeCliente(pedidoVinculado, [], idsStr, nomesAlvo);
  }

  function obterValorCampoFinanceiro(campo, registro, nomesAlvo) {
    let valor = resolverValor('financeiro', campo, registro);

    if (campo === 'cliente') {
      const pedido = buscarPedidoDoFinanceiro(registro);
      const identificado = identificarClienteRealDoRegistroFinanceiro(registro, pedido);
      return identificado ? identificado.nome : 'CLIENTE AVULSO';
    }

    if (campo === 'motoboy' && !valor) {
      const pedido = buscarPedidoDoFinanceiro(registro);
      if (pedido) {
        const mbPedido = resolverValor('pedidos', 'motoboy', pedido);
        if (mbPedido) valor = mbPedido;
      }
    }

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

  function calcularTotaisBanco(banco, dadosOriginais, nomesAlvo) {
    const totais = { qtd: dadosOriginais.length, somaValor: 0, somaPagos: 0, temValor: false, temSituacao: false };

    if (banco === 'pedidos') {
      totais.temValor = true;
      dadosOriginais.forEach(function (r) {
        const v = parseMoeda(obterValorCampoPedido('valor_corrida', r));
        if (!isNaN(v)) totais.somaValor += v;
      });
    } else if (banco === 'financeiro') {
      totais.temValor = true;
      totais.temSituacao = true;
      dadosOriginais.forEach(function (r) {
        const tipo = normalizarComparacao(resolverValor('financeiro', 'tipo', r));
        if (tipo && tipo !== 'RECEITA' && tipo !== 'CORRIDA' && tipo !== 'SERVICO') return;

        const v = parseMoeda(obterValorCampoFinanceiro('vlr_servico', r, nomesAlvo));
        if (!isNaN(v)) totais.somaValor += v;
        const sit = normalizarComparacao(resolverValor('financeiro', 'situacao', r));
        if (sit === 'PAGO' && !isNaN(v)) totais.somaPagos += v;
      });
    }
    return totais;
  }

  const PERCENTUAL_MOTOBOY = 0.80;
  const PERCENTUAL_RDO = 0.20;

  function idsParaClientesSelecionados(ids) {
    const idsExpandidos = [];
    ids.forEach(function (v) {
      idsDoGrupoPorNomeOuId(v).forEach(function (id) {
        if (idsExpandidos.indexOf(id) === -1) idsExpandidos.push(id);
      });
    });
    return state.clientes.filter(function (c) {
      return idsExpandidos.indexOf(normalizarIdCliente(c.id)) !== -1;
    });
  }

  function nomesCorrespondem(a, b) {
    if (!a || !b) return false;
    return normalizarComparacao(a) === normalizarComparacao(b);
  }

  function nomesRelacionados(a, b) {
    if (!a || !b) return false;
    if (nomesCorrespondem(a, b)) return true;

    const canonicoA = canonicoPorNomeExato(a);
    const canonicoB = canonicoPorNomeExato(b);
    if (canonicoA && canonicoB && canonicoA === canonicoB) return true;

    return ehAbreviacaoDeterministica(a, b) || ehAbreviacaoDeterministica(b, a);
  }

  function valorContemNome(valor, nomeAlvo) {
    if (!valor || !nomeAlvo) return false;
    return normalizarComparacao(valor) === normalizarComparacao(nomeAlvo);
  }

  function valorCorrespondeNomesAlvo(valor, nomesAlvo) {
    if (!valor) return false;
    return nomesAlvo.some(function (nome) {
      return nomesRelacionados(valor, nome) || valorContemNome(valor, nome);
    });
  }

  function dentroPeriodo(dataStr, inicio, fim) {
    const d = normalizarDataISO(dataStr);
    if (!d || !inicio || !fim) return false;
    return d >= inicio && d <= fim;
  }

  function obterNomeClienteDoPedido(pedido) {
    const idCliente = resolverValor('pedidos', 'id_cliente', pedido);
    const canonico = nomeCanonicoDoGrupo(idCliente);
    const solicitante = resolverValor('pedidos', 'solicitante', pedido);

    if (canonico) {
      if (solicitante && normalizarComparacao(solicitante) !== normalizarComparacao(canonico)) {
        return canonico + ' (' + String(solicitante).toUpperCase() + ')';
      }
      return canonico;
    }

    if (idCliente) {
      const cli = state.clientes.find(function (c) { return normalizarIdCliente(c.id) === normalizarIdCliente(idCliente); });
      if (cli) {
        const username = resolverValor('clientes', 'username', cli);
        if (username) {
          if (solicitante && normalizarComparacao(solicitante) !== normalizarComparacao(username)) {
            return username.toUpperCase() + ' (' + String(solicitante).toUpperCase() + ')';
          }
          return username;
        }
      }
    }

    if (solicitante) return solicitante;

    const mercadoria = resolverValor('pedidos', 'mercadoria', pedido);
    if (mercadoria) return mercadoria;

    const de = resolverValor('pedidos', 'de', pedido);
    if (de) return de;

    const destino = resolverValor('pedidos', 'para', pedido);
    if (destino) return destino;

    const observacao = resolverValor('pedidos', 'observacao', pedido);
    if (observacao) return observacao;

    if (idCliente) return idCliente;

    return '';
  }

  function coletarDadosBanco(banco) {
    const p = state.builder.periodo;
    let dados = [];

    if (banco === 'clientes') dados = state.clientes.slice();
    else if (banco === 'colaborador') dados = state.motoboys.slice();
    else if (banco === 'pedidos') {
      dados = state.pedidos.filter(function (r) {
        return dentroPeriodo(obterDataPedidoComFallback(r), p.inicio, p.fim);
      });
    }
    else if (banco === 'chat') {
      dados = state.chat.filter(function (r) {
        return dentroPeriodo(obterDataChatComFallback(r), p.inicio, p.fim);
      });
    }
    else if (banco === 'financeiro') {
      dados = state.financeiro.filter(function (r) {
        const tipo = normalizarComparacao(resolverValor('financeiro', 'tipo', r));
        const tipoValido = !tipo || tipo === 'RECEITA' || tipo === 'CORRIDA' || tipo === 'SERVICO';
        if (!tipoValido) return false;

        const dataResolvida = obterValorCampoFinanceiro('data', r);
        if (!dataResolvida) return true; // mantém — será tratado como fallback

        return dentroPeriodo(dataResolvida, p.inicio, p.fim);
      });
    }

    const fx = state.builder.filtroExtra;
    if (!fx || !fx.valor) return dados;

    const valoresBrutos = Array.isArray(fx.valor) ? fx.valor : [fx.valor];
    const contemTodos = valoresBrutos.indexOf('__todos__') !== -1;
    if (contemTodos || !valoresBrutos.length) return dados;

    const valoresStr = valoresBrutos.map(function (v) { return String(v).trim(); });

    function idBate(valorCampo) {
      return valoresStr.indexOf(String(valorCampo).trim()) !== -1;
    }

    if (fx.campo === 'motoboy_id') {
      if (banco === 'colaborador') {
        return dados.filter(function (r) { return idBate(r.id); });
      }
      if (banco === 'pedidos') {
        const nomesSelecionados = idsParaNomes(valoresBrutos, state.motoboys, 'colaborador');
        return dados.filter(function (r) {
          const mb = normalizarComparacao(resolverValor('pedidos', 'motoboy', r));
          return nomesSelecionados.indexOf(mb) !== -1;
        });
      }
      if (banco === 'financeiro') {
        return dados.filter(function (r) {
          const colabId = String(resolverValor('financeiro', 'colaborador_id', r)).trim();
          return valoresStr.indexOf(colabId) !== -1;
        });
      }
      return dados;
    }

    if (fx.campo === 'cliente_id') {
      const clientesSelecionados = idsParaClientesSelecionados(valoresBrutos);
      const nomesAlvo = extrairNomesAlvoCliente(valoresBrutos, clientesSelecionados);
      const ehFiltroAvulso = valoresStr.length === 1 && (valoresStr[0] === 'AVULSO' || valoresStr[0] === '__avulso__' || valoresStr[0] === 'CLIENTE_AVULSO');

      if (banco === 'clientes') {
        return dados.filter(function (r) { return idBate(r.id); });
      }

      if (banco === 'pedidos') {
        return dados.filter(function (r) { return pedidoCorrespondeCliente(r, clientesSelecionados, valoresStr, nomesAlvo); });
      }

      if (banco === 'chat') {
        return dados.filter(function (r) { return chatCorrespondeCliente(r, valoresStr, nomesAlvo); });
      }

      if (banco === 'financeiro') {
        // 🔑 Filtro dedicado para "Cliente Avulso": usa a mesma verificação
        // rigorosa que impede um lançamento com cliente real identificado
        // na descrição de aparecer indevidamente como avulso.
        if (ehFiltroAvulso) {
          return dados.filter(function (r) { return financeiroEhClienteAvulso(r); });
        }
        return dados.filter(function (r) { return financeiroCorrespondeCliente(r, nomesAlvo); });
      }
    }

    if (fx.campo === 'tipo_lancamento' && banco === 'financeiro') {
      return dados.filter(function (r) {
        return valoresStr.indexOf(String(resolverValor('financeiro', 'tipo', r)).trim()) !== -1;
      });
    }

    return dados;
  }

  function buscarFinanceiroDoPedido(pedido) {
    const idPedido = pedido.id;
    return state.financeiro.find(function (f) {
      return String(resolverValor('financeiro', 'id_pedido', f)) === String(idPedido);
    });
  }

  function buscarPedidoDoFinanceiro(registro) {
    const idPedido = String(resolverValor('financeiro', 'id_pedido', registro)).trim();
    return state.pedidos.find(function (p) {
      const idP = String(resolverValor('pedidos', 'id', p)).trim();
      return idP === idPedido ||
        idP.replace(/^RDO0*/i, '') === idPedido.replace(/^RDO0*/i, '');
    });
  }

  function obterDataPedidoComFallback(pedido) {
    const data = resolverValor('pedidos', 'data', pedido);
    if (data) return data;
    const lanc = buscarFinanceiroDoPedido(pedido);
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

  function obterValorCampoChat(campo, registro) {
    if (campo === 'data') return obterDataChatComFallback(registro);
    return resolverValor('chat', campo, registro);
  }

  const MOTOBOY_INVALIDOS = ['CANCELADO', 'CONCLUIDO', 'PENDENTE', 'SEM MOTOBOY', ''];

  function agruparPorMotoboyFinanceiro(registrosFinanceiro, nomesAlvo) {
    const mapa = {};

    registrosFinanceiro.forEach(function (r) {
      const nomeRaw = obterValorCampoFinanceiro('motoboy', r, nomesAlvo);
      const nomeNorm = normalizarComparacao(nomeRaw);

      const nome = (!nomeRaw || MOTOBOY_INVALIDOS.indexOf(nomeNorm) !== -1)
        ? 'SEM MOTOBOY ATRIBUÍDO'
        : nomeRaw;

      const sit = normalizarComparacao(resolverValor('financeiro', 'situacao', r));
      const valor = parseMoeda(obterValorCampoFinanceiro('vlr_servico', r, nomesAlvo));
      const valorValido = !isNaN(valor) ? valor : 0;
      const pago = (sit === 'PAGO');

      if (!mapa[nome]) {
        mapa[nome] = { nome: nome, qtd: 0, qtdPendente: 0, receitaTotal: 0, receitaPendente: 0 };
      }

      mapa[nome].qtd++;
      mapa[nome].receitaTotal += valorValido;

      if (!pago) {
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
      let nome = obterNomeClienteDoPedido(p) || 'Sem cliente';
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

  function idsParaNomes(ids, lista, banco) {
    const idsStr = ids.map(function (v) { return String(v).trim(); });
    const nomes = [];
    lista.forEach(function (item) {
      if (idsStr.indexOf(String(item.id).trim()) !== -1) {
        const username = resolverValor(banco, 'username', item);
        const nomeColab = resolverValor(banco, 'colaborador', item);
        if (username) nomes.push(normalizarComparacao(username));
        if (nomeColab) nomes.push(normalizarComparacao(nomeColab));
      }
    });
    return nomes;
  }

  function criarAutocompleteFiltro(cfg) {
    const input = document.getElementById(cfg.inputId);
    const hidden = document.getElementById(cfg.hiddenId);
    const dropdown = document.getElementById(cfg.dropdownId);
    const clearBtn = document.getElementById(cfg.clearId);
    if (!input || !hidden || !dropdown) return;

    let itens = cfg.dados();
    let filtrados = itens;
    let ativo = -1;

    function render() {
      if (!filtrados.length) {
        dropdown.innerHTML = '<div class="rel-autocomplete-empty">Nenhum resultado encontrado.</div>';
      } else {
        dropdown.innerHTML = filtrados.map(function (it, i) {
          return '<div class="rel-autocomplete-item' + (i === ativo ? ' active' : '') +
            '" data-id="' + escapeHtml(it.id) + '" data-nome="' + escapeHtml(it.nome) + '">' +
            escapeHtml(it.nome) + '</div>';
        }).join('');
      }
      dropdown.classList.add('show');
    }

    function filtrar(termo) {
      const t = normalizarComparacao(termo);
      if (!t) {
        filtrados = itens;
      } else {
        filtrados = itens.filter(function (it) {
          const nomeNorm = normalizarComparacao(it.nome);
          return nomeNorm === t || nomeNorm.indexOf(t) === 0 || nomesRelacionados(it.nome, termo);
        });

        filtrados.sort(function (a, b) {
          const na = normalizarComparacao(a.nome);
          const nb = normalizarComparacao(b.nome);
          const aExato = na === t ? 0 : 1;
          const bExato = nb === t ? 0 : 1;
          if (aExato !== bExato) return aExato - bExato;
          return na.localeCompare(nb);
        });
      }
      ativo = -1;
      render();
    }

    function selecionar(id, nome) {
      hidden.value = id;
      input.value = id === '__todos__' ? '' : nome;
      clearBtn && clearBtn.classList.toggle('show', id !== '__todos__');
      dropdown.classList.remove('show');
    }

    function limpar() { selecionar('__todos__', ''); input.focus(); }

    input.addEventListener('focus', function () { filtrar(input.value); });
    input.addEventListener('input', function () { filtrar(input.value); });

    input.addEventListener('keydown', function (e) {
      const linhas = dropdown.querySelectorAll('.rel-autocomplete-item');
      if (!linhas.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); ativo = Math.min(ativo + 1, linhas.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ativo = Math.max(ativo - 1, 0); render(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const alvo = linhas[ativo >= 0 ? ativo : 0];
        if (alvo) selecionar(alvo.dataset.id, alvo.dataset.nome);
      } else if (e.key === 'Escape') dropdown.classList.remove('show');
    });

    dropdown.addEventListener('click', function (e) {
      const item = e.target.closest('.rel-autocomplete-item');
      if (item) selecionar(item.dataset.id, item.dataset.nome);
    });

    if (clearBtn) clearBtn.addEventListener('click', limpar);

    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !dropdown.contains(e.target) && (!clearBtn || !clearBtn.contains(e.target))) {
        dropdown.classList.remove('show');
      }
    });

    cfg._atualizarDados = function () { itens = cfg.dados(); filtrar(input.value); };
    selecionar(hidden.value || '__todos__', input.value);
  }

  function popularSelectMotoboys() {
    if (!els._autoMb) {
      els._autoMb = {
        inputId: 'rel-mb-input', hiddenId: 'rel-mb-select', dropdownId: 'rel-mb-dropdown', clearId: 'rel-mb-clear',
        dados: function () {
          return state.motoboys.map(function (mb) {
            return { id: mb.id, nome: resolverValor('colaborador', 'username', mb) || 'Sem nome' };
          });
        }
      };
      criarAutocompleteFiltro(els._autoMb);
    } else {
      els._autoMb._atualizarDados();
    }
  }

  function popularSelectClientes() {
    if (!els._autoCli) {
      els._autoCli = {
        inputId: 'rel-cli-input', hiddenId: 'rel-cli-select', dropdownId: 'rel-cli-dropdown', clearId: 'rel-cli-clear',
        dados: function () {
          return state.clientes.map(function (cli) {
            return { id: cli.id, nome: resolverValor('clientes', 'username', cli) || 'Sem nome' };
          });
        }
      };
      criarAutocompleteFiltro(els._autoCli);
    } else {
      els._autoCli._atualizarDados();
    }
  }

  function adicionarClienteSeNaoExistir(novoCliente) {
    const jaExiste = state.clientes.some(function (c) {
      return normalizarTexto(resolverValor('clientes', 'username', c)) === normalizarTexto(novoCliente.username);
    });

    if (jaExiste) {
      console.warn('Cliente já cadastrado, inserção ignorada:', novoCliente.username);
      return false;
    }

    state.clientes.push(novoCliente);
    console.info('Cliente adicionado com sucesso:', novoCliente.username);

    // Se seu app persiste em backend/planilha, dispare aqui a chamada
    // ex: salvarClienteNoBanco(novoCliente);

    return true;
  }

  function normalizarTexto(txt) {
    if (!txt) return '';
    return String(txt)
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^A-Z0-9\s]/g, ' ')    // remove hífens, & , etc.
      .replace(/\s+/g, ' ')
      .trim();
  }

  const NOME_CLIENTE_AVULSO = 'CLIENTE AVULSO';
  const ID_CLIENTE_AVULSO = 'AVUL5O0000X';

  const CESTA_TEXT_PATTERN = /\bcesta\b/i;

  const MAPA_NORMALIZACAO_CLIENTES = [
    [/\bm\.?\s*pitanga\b|\bmaria\s*pitanga\b/i, 'MARIA PITANGA'],
    [/\bcacau\s*show\b|\bcacaushow\b/i, 'CACAU SHOW'],
    [/\bbreno\b/i, 'BRENO'],
    [/\bval\s*fortunatt?o\b/i, 'VAL FORTUNATO'],
    [/\bnatu\s*pet\b|\bnatupet\b/i, 'NATUPET'],
    [/\bcpap\s*minas\b/i, 'CPAP MINAS'],
    [/\bammis\b/i, 'AMMIS'],
    [/\bescrit[oó]rio\s*incloset\b/i, 'INCLOSET'],
    [/\bin\s*closet\b|\bincloset\b/i, 'INCLOSET'],
    [/\bdeluza\b/i, 'DELUZA'],
    [/\bop\s*i?\s*minas\b|\bopminas\b/i, 'OPMINAS'],
    [/\btelecom\b/i, 'TELECOM'],
    [/\bs[\.\s]?manoel\b|\bs[ãa]o\s+manoel\b/i, 'S MANOEL'],
    [/\bff\s*fashion\b|\bffashion\b/i, 'FF FASHION'],
    [/\bkopenhagen\b/i, 'KOPENHAGEN'],
    [/\bjosi\s*fraga\b|\bjosifraga\b/i, 'JOSI FRAGA'],
    [/\bmari\s*dant\b|\bmarileni\s*dant\b/i, 'MARI DANT'],
    [/\bbasique\b/i, 'BASIQUE'],
    [/\bmima[\s\-]?me\b/i, 'MIMA-ME'],
    [/\blepo[eh]h?\b/i, 'LEPOEH'],
    [/\bmiss\s*dele\b/i, 'MISS DELE'],
    [/\bjacira\b/i, 'JACIRA'],
    [/\bag3\s*alimentos\b|\bag3\b/i, 'AG3 ALIMENTOS'],
    [/\bsara\s*santos\b/i, 'SARA SANTOS'],
    [/\bbete\s*plural\s*(diamond\s*mall)?\b/i, 'PLURAL'],
    [/\bplural\b/i, 'PLURAL'],
    [/\bcpap\s*aire\b/i, 'CPAP AIRE'],
    [/\barte\s*em\s*comemorar\b/i, 'ARTE EM COMEMORAR'],
    [/\bp\s*&\s*p\s*distribuidora\b|\bp&p\b/i, 'P&P DISTRIBUIDORA'],
    [/\belisa\s*athenien[cs]e\b/i, 'ELISA ATHENIENSE'],
    [/\barya[nm]?ne\b/i, 'ARYANNE'],
    [/\bhop+e\b/i, 'HOPPE'],
    [CESTA_TEXT_PATTERN, 'ARTE EM COMEMORAR']
  ];

  const IDS_CLIENTES_PADRAO = {
    'MARIA PITANGA': 'ZEX40L56SJD',
    'CACAU SHOW': 'R2Q6K7H7OSY',
    'BRENO': 'GQ2H8MLYPTW',
    'VAL FORTUNATO': 'BQVEGBEA07N',
    'NATUPET': 'Z9T82O4CVGA',
    'CPAP MINAS': '7NDXMET4BY1',
    'AMMIS': '8OXAGYGBNZ2',
    'INCLOSET': '5ZKL0IHDIIY',
    'DELUZA': 'ZZOVKXPIBAT',
    'OPMINAS': 'QYURDAK3F7H',
    'TELECOM': 'PJ117O5LI4G',
    'S MANOEL': '7RZBKEC257F',
    'FF FASHION': 'VDC7X7XTBYD',
    'KOPENHAGEN': 'RO08OGQ25F3',
    'JOSI FRAGA': 'PVRJ2ZGDDVN',
    'MARI DANT': 'OHPF1U95H77',
    'BASIQUE': 'AXYXC04TUOA',
    'MIMA-ME': '9ZY1FW6IQ54',
    'LEPOEH': 'XN1YYCY4D7X',
    'MISS DELE': 'S7PB7KTZ8Z1',
    'JACIRA': 'B700EX1CX17',
    'AG3 ALIMENTOS': 'THGG3ITLFAY',
    'SARA SANTOS': 'RVWHRWM6KGD',
    'PLURAL': 'NF10JRBK7BR',
    'CPAP AIRE': 'MTCU5ORJWCA',
    'ARTE EM COMEMORAR': 'UM679H0784H',
    'P&P DISTRIBUIDORA': 'OWVY3N7YZWS',
    'ELISA ATHENIENSE': 'HXQ9VBU59DG',
    'ARYANNE': '7OQRUCKFK3E',
    'HOPPE': 'G6MZPAIC52V'
  };
  IDS_CLIENTES_PADRAO[NOME_CLIENTE_AVULSO] = ID_CLIENTE_AVULSO;

  function normalizarNomeClienteRegex(texto) {
    const t = String(texto == null ? '' : texto).trim();
    if (!t) return '';
    for (let i = 0; i < MAPA_NORMALIZACAO_CLIENTES.length; i++) {
      const [padrao, nomePadrao] = MAPA_NORMALIZACAO_CLIENTES[i];
      if (padrao.test(t)) return nomePadrao;
    }
    return '';
  }

  function resolverNomeClienteComFallback() {
    for (let i = 0; i < arguments.length; i++) {
      const nomePadrao = normalizarNomeClienteRegex(arguments[i]);
      if (nomePadrao) return nomePadrao;
    }
    return NOME_CLIENTE_AVULSO;
  }

  function obterIdPadraoCliente(nomePadrao, idAtual) {
    const idConhecido = IDS_CLIENTES_PADRAO[nomePadrao];
    return idConhecido ? idConhecido : String(idAtual == null ? '' : idAtual).trim();
  }

  function tokensDe(txt) {
    return normalizarTexto(txt).split(' ').filter(Boolean);
  }

  function tokensCombinam(tokenA, tokenB) {
    if (!tokenA || !tokenB) return false;
    if (tokenA === tokenB) return true;
    // abreviação: token de 1-2 letras é prefixo do outro
    if (tokenA.length <= 2 && tokenB.startsWith(tokenA)) return true;
    if (tokenB.length <= 2 && tokenA.startsWith(tokenB)) return true;
    return false;
  }

  function nomeBateComDescricao(nomeCliente, tokensDescricao) {
    const tokensNome = tokensDe(nomeCliente);
    if (!tokensNome.length) return false;

    let acertos = 0;
    for (const tNome of tokensNome) {
      const achou = tokensDescricao.some(function (tDesc) {
        return tokensCombinam(tNome, tDesc);
      });
      if (achou) acertos++;
    }

    // Exige que pelo menos 60% dos tokens do nome do cliente
    // (ou todos, se o nome tiver só 1 token) estejam presentes
    const minimoNecessario = tokensNome.length === 1 ? 1 : Math.ceil(tokensNome.length * 0.6);
    return acertos >= minimoNecessario;
  }

  function nomesSaoParecidos(nomeA, nomeB) {
    const a = normalizarTexto(nomeA).replace(/\s+/g, '');
    const b = normalizarTexto(nomeB).replace(/\s+/g, '');
    if (!a || !b) return false;
    if (a === b) return true;
    // um contém o outro (ex.: MIMAME contém em MIMAMI parcialmente)
    const menor = a.length <= b.length ? a : b;
    const maior = a.length <= b.length ? b : a;
    if (menor.length >= 4 && maior.includes(menor.slice(0, Math.max(4, Math.floor(menor.length * 0.7))))) {
      return true;
    }
    return false;
  }

  function montarSnapshot() {
    const snapshot = { bancos: {}, resumos: {}, meta: {} };
    const preset = PRESETS[state.builder.tipo] || PRESETS.global;
    const nomesAlvo = state.builder.filtroExtra && state.builder.filtroExtra.campo === 'cliente_id'
      ? extrairNomesAlvoCliente(
        state.builder.filtroExtra.valor,
        idsParaClientesSelecionados(state.builder.filtroExtra.valor)
      )
      : [];

    bancosDoBuilder().forEach(function (banco) {
      const camposSelecionados = Object.keys(state.builder.selecionados[banco] || {})
        .filter(function (c) { return state.builder.selecionados[banco][c]; });
      if (!camposSelecionados.length) return;

      const dadosOriginais = coletarDadosBanco(banco);
      const info = BANCOS[banco];

      const linhas = dadosOriginais.map(function (registro) {
        const linha = {};
        camposSelecionados.forEach(function (campo) {
          if (banco === 'financeiro') linha[campo] = obterValorCampoFinanceiro(campo, registro, nomesAlvo);
          else if (banco === 'pedidos') linha[campo] = obterValorCampoPedido(campo, registro);
          else if (banco === 'chat') linha[campo] = obterValorCampoChat(campo, registro);
          else linha[campo] = resolverValor(banco, campo, registro);
        });
        return linha;
      });

      snapshot.bancos[banco] = {
        label: info.label,
        campos: camposSelecionados.map(function (c) { return { chave: c, label: info.campos[c] }; }),
        linhas: linhas,
        totais: calcularTotaisBanco(banco, dadosOriginais, nomesAlvo)
      };

      if (banco === 'pedidos') snapshot.resumos.clientes = agruparPorCliente(dadosOriginais);
      if (banco === 'financeiro' && state.builder.tipo === 'motoboys') {
        snapshot.resumos.motoboys = agruparPorMotoboyFinanceiro(dadosOriginais, nomesAlvo);
      }
    });

    return snapshot;
  }

  function agruparPorMotoboy(pedidos) {
    const mapa = {};
    pedidos.forEach(function (p) {
      const nomeRaw = obterValorCampoPedido('motoboy', p);
      const nomeNorm = normalizarComparacao(nomeRaw);
      const nome = (!nomeRaw || MOTOBOY_INVALIDOS.indexOf(nomeNorm) !== -1) ? 'SEM MOTOBOY ATRIBUÍDO' : nomeRaw;

      const status = normalizarComparacao(resolverValor('pedidos', 'status', p));
      const valor = parseMoeda(obterValorCampoPedido('valor_corrida', p));
      const valorValido = !isNaN(valor) ? valor : 0;
      const pendente = (status !== 'CONCLUIDO' && status !== 'CONCLUÍDO');

      if (!mapa[nome]) {
        mapa[nome] = { nome: nome, qtd: 0, qtdPendente: 0, receitaTotal: 0, receitaPendente: 0 };
      }

      mapa[nome].qtd++;
      mapa[nome].receitaTotal += valorValido;
      if (pendente) {
        mapa[nome].qtdPendente++;
        mapa[nome].receitaPendente += valorValido;
      }
    });

    return Object.keys(mapa).map(function (k) {
      const m = mapa[k];
      const valorMotoboy = m.receitaTotal * PERCENTUAL_MOTOBOY;
      const valorRdo = m.receitaTotal * PERCENTUAL_RDO;
      return {
        nome: m.nome,
        qtd: m.qtd,
        qtdPendente: m.qtdPendente,
        receitaTotal: m.receitaTotal,
        receitaPendente: m.receitaPendente,
        valorMotoboy: valorMotoboy,
        valorRdo: valorRdo,
        valorTotalCalculado: valorMotoboy + valorRdo
      };
    }).sort(function (a, b) { return b.receitaTotal - a.receitaTotal; });
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

  function registrarEventosLocais() {
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

    if (els.btnsOrdenar) {
      els.btnsOrdenar.forEach(function (btn) {
        btn.addEventListener('click', function () {
          const tab = btn.dataset.tab;
          if (!tab) return;
          state.ordenacao[tab] = state.ordenacao[tab] === 'desc' ? 'asc' : 'desc';
          state.paginaAtual = 1;
          renderizarListas();
        });
      });
    }

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

  function registrarEventosGlobais() {
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

    const atual = state.relatorioAtual;
    const registroLista = {
      id: atual.id,
      tipo: atual.tipo,
      titulo: atual.titulo,
      periodoLabel: atual.periodoLabel,
      criadoEm: atual.criadoEm,
      snapshot: atual.snapshot,
      data_inicio: atual.data_inicio,
      data_fim: atual.data_fim,
      usuarioGerador: atual.usuarioGerador,
      horaGeracao: atual.horaGeracao
    };

    state.relatoriosSalvos.unshift(registroLista);
    persistirRelatoriosLocal();
    state.ultimoBuilderState = null;
    state.paginaAtual = 1;
    renderizarListas();
    relToast('Relatório salvo com sucesso!', 'success');
    fecharModalRelatorio();
  }

  function excluirRelatorioLocal(id) {
    state.relatoriosSalvos = state.relatoriosSalvos.filter(r => r.id !== id);
    persistirRelatoriosLocal();
    renderizarListas();
    relToast('Relatório excluído com sucesso!', 'success');
  }

  const LS_KEY = 'rdo_relatorios_salvos';

  function persistirRelatoriosLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state.relatoriosSalvos));
    } catch (e) {
      relToast('Erro ao salvar localmente: ' + e.message, 'danger');
    }
  }

  function carregarRelatoriosLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      state.relatoriosSalvos = raw ? JSON.parse(raw) : [];
    } catch (e) {
      state.relatoriosSalvos = [];
    }
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

  function agruparLinhasPorData(linhas, chaveData) {
    const mapa = {};
    const ordemDatas = [];

    linhas.forEach(function (linha) {
      const dataRaw = linha[chaveData];
      const dataISO = normalizarDataISO(dataRaw);
      const chave = dataISO || 'sem-data';
      const label = dataISO ? formatDateBR(dataISO) : 'Sem data';

      if (!mapa[chave]) {
        mapa[chave] = { chave: chave, label: label, linhas: [], subtotal: 0 };
        ordemDatas.push(chave);
      }
      mapa[chave].linhas.push(linha);
    });

    ordemDatas.sort(function (a, b) {
      if (a === 'sem-data') return 1;
      if (b === 'sem-data') return -1;
      return a.localeCompare(b);
    });

    return ordemDatas.map(function (k) { return mapa[k]; });
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
        html += '</div>';
        return;
      }

      const temCampoData = info.campos.some(function (c) { return c.chave === 'data'; });
      const temCampoValor = info.campos.some(function (c) { return c.chave === 'vlr_servico' || c.chave === 'valor_corrida'; });
      const chaveValor = info.campos.some(function (c) { return c.chave === 'vlr_servico'; }) ? 'vlr_servico' : 'valor_corrida';

      if (!temCampoData) {
        html += '<div style="overflow-x:auto;"><table class="table table-sm table-bordered" style="font-size:.72rem;background:#fff;">';
        html += '<thead><tr>';
        info.campos.forEach(function (c) { html += '<th>' + escapeHtml(c.label) + '</th>'; });
        html += '</tr></thead><tbody>';

        info.linhas.forEach(function (linha) {
          html += '<tr>';
          info.campos.forEach(function (c) {
            let valor = linha[c.chave];
            if (c.chave === 'vlr_servico' || c.chave === 'valor_corrida') valor = formatarMoeda(valor);
            else if (c.chave === 'horario') valor = extrairHora(valor);
            else if (c.chave === 'solicitante') valor = abreviarNome(valor);
            html += '<td class="rel-td-nowrap">' + escapeHtml(valor === undefined || valor === null ? '' : valor) + '</td>';
          });
          html += '</tr>';
        });
        html += '</tbody></table></div>';
      } else {
        const blocos = agruparLinhasPorData(info.linhas, 'data');
        let somaGeralBanco = 0;

        blocos.forEach(function (bloco) {
          let subtotalBloco = 0;
          if (temCampoValor) {
            bloco.linhas.forEach(function (linha) {
              const v = parseMoeda(linha[chaveValor]);
              if (!isNaN(v)) subtotalBloco += v;
            });
          }
          somaGeralBanco += subtotalBloco;

          html += '<div style="margin-bottom:16px;border:1px solid #dee2e6;border-radius:10px;overflow:hidden;">';
          html += '<div style="background:#eef2f7;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dee2e6;">';
          html += '<span style="font-size:.8rem;font-weight:700;color:#1c3d5a;"><i class="bi bi-calendar3-fill" style="margin-right:6px;"></i>' + escapeHtml(bloco.label) + '</span>';
          html += '<span style="font-size:.75rem;color:#555;">' + bloco.linhas.length + (bloco.linhas.length === 1 ? ' registro' : ' registros') +
            (temCampoValor ? ' · Subtotal: <strong style="color:#0a7d2c;">' + formatarMoeda(subtotalBloco) + '</strong>' : '') + '</span>';
          html += '</div>';

          html += '<div style="overflow-x:auto;"><table class="table table-sm table-bordered mb-0" style="font-size:.72rem;background:#fff;">';
          html += '<thead><tr>';
          info.campos.forEach(function (c) { if (c.chave !== 'data') html += '<th>' + escapeHtml(c.label) + '</th>'; });
          html += '</tr></thead><tbody>';

          bloco.linhas.forEach(function (linha) {
            html += '<tr>';
            info.campos.forEach(function (c) {
              if (c.chave === 'data') return;
              let valor = linha[c.chave];
              if (c.chave === 'vlr_servico' || c.chave === 'valor_corrida') valor = formatarMoeda(valor);
              else if (c.chave === 'horario') valor = extrairHora(valor);
              else if (c.chave === 'solicitante') valor = abreviarNome(valor);
              html += '<td class="rel-td-nowrap">' + escapeHtml(valor === undefined || valor === null ? '' : valor) + '</td>';
            });
            html += '</tr>';
          });
          html += '</tbody></table></div></div>';
        });

        if (temCampoValor) {
          html += '<div style="background:#fff9f0;border:2px solid #ffc107;border-radius:10px;padding:10px 16px;margin-top:4px;display:flex;justify-content:space-between;align-items:center;">';
          html += '<span style="font-size:.85rem;font-weight:700;color:#444;">TOTAL GERAL (todas as datas)</span>';
          html += '<span style="font-size:.95rem;font-weight:700;color:#0a7d2c;">' + formatarMoeda(somaGeralBanco) + '</span>';
          html += '</div>';
        }
      }

      if (info.totais && (info.totais.temValor || info.totais.temSituacao)) {
        html += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:12px;">';
        html += '<div class="rel-modal-card" style="background:#f0f7ff;"><div class="rel-modal-card-label">Total de Registros</div><div class="rel-modal-card-value">' + info.totais.qtd + '</div></div>';
        if (info.totais.temValor) {
          html += '<div class="rel-modal-card" style="background:#eafaf0;"><div class="rel-modal-card-label">Soma Valor Serviço</div><div class="rel-modal-card-value" style="color:#0a7d2c;">' + formatarMoeda(info.totais.somaValor) + '</div></div>';
        }
        if (info.totais.temSituacao) {
          html += '<div class="rel-modal-card" style="background:#fff6e8;"><div class="rel-modal-card-label">Soma Pagos</div><div class="rel-modal-card-value" style="color:#b06d00;">' + formatarMoeda(info.totais.somaPagos) + '</div></div>';
        }
        html += '</div>';
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
          '<td class="rel-td-nowrap"><strong>' + escapeHtml(abreviarNome(m.nome)) + '</strong></td>' +
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
          '<td class="rel-td-nowrap"><strong>' + escapeHtml(abreviarNome(c.nome)) + '</strong></td>' +
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
      if (window.bootstrap) {
        const oi = bootstrap.Modal.getInstance(old);
        if (oi) oi.dispose();
      }
      old.remove();
    }

    const html = '<div class="modal fade" id="' + OLD_ID + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered modal-sm">' +
      '<div class="modal-content rounded-4 border-0 shadow-lg">' +
      '<div class="modal-body text-center p-4">' +
      '<i class="bi bi-exclamation-triangle-fill" style="font-size:2.2rem;color:#dc3545;"></i>' +
      '<h6 class="fw-bold mt-3 mb-1">Excluir relatório?</h6>' +
      '<p class="text-muted mb-4" style="font-size:.8rem;">Esta ação não pode ser desfeita.</p>' +
      '<div class="d-flex gap-2 justify-content-center">' +
      '<button type="button" class="btn btn-light btn-sm rounded-pill px-3" data-bs-dismiss="modal">Cancelar</button>' +
      '<button type="button" id="btn-confirmar-excluir-rel" class="btn btn-danger btn-sm rounded-pill px-3">Excluir</button>' +
      '</div></div></div></div></div>';

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);

    const modalEl = document.getElementById(OLD_ID);
    if (!window.bootstrap) { relToast('Bootstrap não carregado.', 'danger'); modalEl.remove(); return; }
    const modalInst = new bootstrap.Modal(modalEl);
    modalInst.show();

    modalEl.addEventListener('hidden.bs.modal', function () {
      modalInst.dispose();
      modalEl.remove();
    });

    const btnConfirmar = document.getElementById('btn-confirmar-excluir-rel');
    btnConfirmar.addEventListener('click', function () {
      excluirRelatorioLocal(rel.id);
      modalInst.hide();
    });
  }

  function carregarHtml2Pdf() {
    return new Promise(function (resolve, reject) {
      if (window.html2pdf) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Falha ao carregar html2pdf.')); };
      document.head.appendChild(script);
    });
  }

  function gerarPdfRelatorio() {
    if (!state.relatorioAtual || !els.modalBody) { relToast('Nenhum relatório para exportar.', 'warning'); return; }

    const btn = els.modalBtnPdf;
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Gerando PDF...';

    carregarHtml2Pdf().then(function () {
      const icons = { motoboys: 'bi-bicycle', clientes: 'bi-people', financeiro: 'bi-wallet2', global: 'bi-globe2' };
      const iconClass = icons[state.relatorioAtual.tipo] || 'bi-file-earmark-bar-graph';

      const container = document.createElement('div');
      container.style.background = '#fff';
      container.style.width = '100%';

      container.innerHTML =
        '<div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:20px 24px;display:flex;align-items:center;gap:14px;border-radius:10px 10px 0 0;">' +
        '<div style="width:50px;height:50px;border-radius:12px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">' +
        '<i class="bi ' + iconClass + '" style="color:#fff;font-size:1.4rem;"></i></div>' +
        '<div><div style="font-size:1rem;font-weight:700;color:#fff;letter-spacing:.5px;">' + escapeHtml((state.relatorioAtual.titulo || '').toUpperCase()) + '</div>' +
        '<div style="font-size:.72rem;color:rgba(255,255,255,.6);margin-top:2px;">' + escapeHtml(state.relatorioAtual.periodoLabel) + '</div></div>' +
        '</div>' +
        '<div style="padding:20px 24px;background:#f8f9fa;">' + els.modalBody.innerHTML + '</div>';

      const opt = {
        margin: 8,
        filename: (state.relatorioAtual.titulo || 'relatorio').replace(/[^a-z0-9]+/gi, '_') + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.rel-modal-card', '.rel-modal-section'] }
      };

      return window.html2pdf().set(opt).from(container).save();
    }).then(function () {
      relToast('PDF gerado com sucesso!', 'success');
    }).catch(function (err) {
      relToast('Erro ao gerar PDF: ' + err.message, 'danger');
    }).finally(function () {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    });
  }

  function obterUsuarioLogado() {
    try {
      const sess = JSON.parse(sessionStorage.getItem('usuario') || localStorage.getItem('usuario') || 'null');
      if (sess && sess.username) return sess.username;
      if (sess && sess.nome) return sess.nome;
    } catch (e) { }
    return 'Não identificado';
  }

  function obterHoraAtualBR() {
    return new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function renderizarListas() {
    const config = {
      motoboys: { el: els.mbLista, filtro: function (r) { return r.tipo === 'motoboys'; }, pag: els.paginacao.motoboys },
      clientes: { el: els.cliLista, filtro: function (r) { return r.tipo === 'clientes'; }, pag: els.paginacao.clientes },
      financeiro: { el: els.finLista, filtro: function (r) { return r.tipo === 'financeiro'; }, pag: els.paginacao.financeiro },
      global: { el: els.globLista, filtro: function (r) { return r.tipo === 'global'; }, pag: els.paginacao.global }
    };

    const c = config[state.tabAtual];
    if (!c || !c.el) return;

    const direcao = state.ordenacao[state.tabAtual] || 'desc';
    const lista = state.relatoriosSalvos.filter(c.filtro).sort(function (a, b) {
      return direcao === 'desc' ? (b.criadoEm - a.criadoEm) : (a.criadoEm - b.criadoEm);
    });

    const btnOrdenar = document.querySelector('.rel-btn-ordenar[data-tab="' + state.tabAtual + '"]');
    if (btnOrdenar) {
      const icon = btnOrdenar.querySelector('i');
      if (icon) icon.className = direcao === 'desc' ? 'bi bi-sort-down' : 'bi bi-sort-up';
      btnOrdenar.title = direcao === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro';
    }

    const totalPaginas = Math.max(1, Math.ceil(lista.length / state.itensPorPagina));
    if (state.paginaAtual > totalPaginas) state.paginaAtual = totalPaginas;

    const inicio = (state.paginaAtual - 1) * state.itensPorPagina;
    const paginaLista = lista.slice(inicio, inicio + state.itensPorPagina);

    const icons = { motoboys: 'bi-bicycle', clientes: 'bi-people', financeiro: 'bi-wallet2', global: 'bi-globe2' };

    if (!lista.length) {
      c.el.innerHTML = '<div class="rel-lista-vazio"><i class="bi bi-inbox"></i><span>Nenhum relatório gerado ainda.</span></div>';
    } else {
      let html = '';
      paginaLista.forEach(function (rel) {
        const dataValida = rel.criadoEm && !isNaN(rel.criadoEm);
        const dataFormatada = dataValida ? new Date(rel.criadoEm).toLocaleDateString('pt-BR') : '';
        const iconClass = icons[rel.tipo] || 'bi-file-earmark-bar-graph';

        html += '<div class="rel-item-card" data-id="' + escapeHtml(rel.id) + '">' +
          '<div class="rel-item-left">' +
          '<div class="rel-item-icon"><i class="bi ' + iconClass + '"></i></div>' +
          '<div class="rel-item-info">' +
          '<div class="rel-item-titulo">' + escapeHtml(rel.titulo) + '</div>' +
          '<div class="rel-item-descricao"><i class="bi bi-calendar3"></i> ' + escapeHtml(rel.periodoLabel) +
          (dataValida ? ' · Gerado em ' + dataFormatada : '') + '</div>' +
          '</div>' +
          '</div>' +
          '<div class="rel-item-actions">' +
          '<button type="button" class="rel-item-btn rel-btn-view" data-id="' + escapeHtml(rel.id) + '" title="Visualizar">' +
          '<i class="bi bi-eye"></i></button>' +
          '<button type="button" class="rel-item-btn rel-btn-delete" data-id="' + escapeHtml(rel.id) + '" title="Excluir">' +
          '<i class="bi bi-trash"></i></button>' +
          '</div></div>';
      });
      c.el.innerHTML = html;

      c.el.querySelectorAll('.rel-btn-view').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const rel = state.relatoriosSalvos.find(function (r) { return r.id === btn.dataset.id; });
          if (rel) abrirModalRelatorio(rel, false);
        });
      });

      c.el.querySelectorAll('.rel-btn-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const rel = state.relatoriosSalvos.find(function (r) { return r.id === btn.dataset.id; });
          if (rel) confirmarExclusaoRelatorio(rel);
        });
      });
    }

    if (c.pag) {
      if (c.pag.info) c.pag.info.textContent = 'Página ' + state.paginaAtual + ' de ' + totalPaginas;
      if (c.pag.prev) c.pag.prev.disabled = state.paginaAtual <= 1;
      if (c.pag.next) c.pag.next.disabled = state.paginaAtual >= totalPaginas;
    }
  }

  function carregarDados() {
    if (state.fetching || window._relatorioFetchEmAndamento) return;
    window._relatorioFetchEmAndamento = true;
    state.fetching = true;
    spinOn();
    exibirLoadingListas();

    const ENDPOINTS = [
      { chave: 'motoboys', nome: 'getcolaboradores' },
      { chave: 'clientes', nome: 'getclientes' },
      { chave: 'pedidos', nome: 'getpedidos' },
      { chave: 'chat', nome: 'getchat' },
      { chave: 'financeiro', nome: 'getfinanceirocompleto' }
    ];

    Promise.allSettled(
      ENDPOINTS.map(function (e) { return window.API.call(e.nome, {}); })
    ).then(function (resultados) {
      const falhas = [];

      resultados.forEach(function (resultado, i) {
        const chave = ENDPOINTS[i].chave;
        const nome = ENDPOINTS[i].nome;

        if (resultado.status === 'fulfilled') {
          state[chave] = extrairArray(resultado.value);
        } else {
          state[chave] = state[chave] && state[chave].length ? state[chave] : [];
          falhas.push(nome);
        }
      });

      popularSelectMotoboys();
      popularSelectClientes();
      renderizarListas();

      if (falhas.length === ENDPOINTS.length) {
        relToast('Falha total na comunicação com o servidor. Tente novamente em alguns instantes.', 'danger');
      } else if (falhas.length > 0) {
        relToast('Dados parcialmente atualizados. Falha em: ' + falhas.join(', ') + '.', 'warning');
      } else {
        relToast('Dados atualizados com sucesso!', 'success');
      }
    }).catch(function (err) {
      relToast('Erro inesperado ao carregar dados: ' + err.message, 'danger');
    }).finally(function () {
      state.fetching = false;
      window._relatorioFetchEmAndamento = false;
      spinOff();
    });
  }

  let _eventosGlobaisRegistrados = false;

  function initRelatorios() {
    bind();

    if (!inicializado) {
      inicializado = true;
      carregarRelatoriosLocal();
    }

    registrarEventosLocais();

    if (!_eventosGlobaisRegistrados) {
      _eventosGlobaisRegistrados = true;
      registrarEventosGlobais();
    }

    if (state.motoboys.length || state.clientes.length || state.pedidos.length) {
      popularSelectMotoboys();
      popularSelectClientes();
      renderizarListas();
    }

    if (!state.fetching) carregarDados();
  }

  function _clientePorId(idCliente) {
    const idStr = String(idCliente || '').trim();
    if (!idStr) return null;
    return state.clientes.find(function (c) {
      return String(c.id).trim() === idStr;
    }) || null;
  }

  function _clientePorNomeAproximado(nomeAlvo) {
    if (!nomeAlvo) return null;
    return state.clientes.find(function (c) {
      const username = resolverValor('clientes', 'username', c);
      return nomesRelacionados(username, nomeAlvo) || valorContemNome(username, nomeAlvo);
    }) || null;
  }

  function _obterPeriodoExatoDoPedido(pedido) {
    const dataPedido = normalizarDataISO(
      pedido ? (resolverValor('pedidos', 'data', pedido) || obterDataPedidoComFallback(pedido)) : ''
    );
    const iso = dataPedido || toISO(new Date());
    return { inicio: iso, fim: iso };
  }

  function _obterHoraCorte(textoFechamento) {
    const t = normalizarComparacao(textoFechamento);
    return t.indexOf('INICIO') !== -1 ? 8 : 17;
  }

  function _obterDiaSemanaFechamento(textoFechamento) {
    const t = normalizarComparacao(textoFechamento);
    const DIAS = { DOMINGO: 0, SEGUNDA: 1, TERCA: 2, QUARTA: 3, QUINTA: 4, SEXTA: 5, SABADO: 6 };
    const chaves = Object.keys(DIAS);
    for (let i = 0; i < chaves.length; i++) {
      if (t.indexOf(chaves[i]) !== -1) return DIAS[chaves[i]];
    }
    return null;
  }

  function _obterDiasCorteMes(textoFechamento) {
    const matches = String(textoFechamento || '').match(/\d{1,2}/g);
    if (!matches) return [1];
    let dias = matches.map(d => parseInt(d, 10)).filter(d => d >= 1 && d <= 31);
    dias = dias.filter((v, i) => dias.indexOf(v) === i).sort((a, b) => a - b);
    return dias.length ? dias : [1];
  }

  function _construirDataHora(ano, mes, dia, hora) {
    return new Date(ano, mes, dia, hora, 0, 0, 0);
  }

  function _calcularPeriodoSemanal(cliente, agora) {
    let diaSemana = _obterDiaSemanaFechamento(cliente.dia_fechamento);
    if (diaSemana === null) diaSemana = 1;
    const hora = _obterHoraCorte(cliente.dia_fechamento);

    const cursor = new Date(agora);
    cursor.setHours(0, 0, 0, 0);
    const diff = (cursor.getDay() - diaSemana + 7) % 7;
    const ultimoDia = new Date(cursor);
    ultimoDia.setDate(cursor.getDate() - diff);
    let ultimoFechamentoDatHora = _construirDataHora(ultimoDia.getFullYear(), ultimoDia.getMonth(), ultimoDia.getDate(), hora);

    if (ultimoFechamentoDatHora > agora) {
      ultimoDia.setDate(ultimoDia.getDate() - 7);
      ultimoFechamentoDatHora = _construirDataHora(ultimoDia.getFullYear(), ultimoDia.getMonth(), ultimoDia.getDate(), hora);
    }

    const dataFinal = new Date(ultimoDia);
    const dataInicial = new Date(ultimoDia);
    dataInicial.setDate(dataInicial.getDate() - 6);

    return { inicio: toISO(dataInicial), fim: toISO(dataFinal) };
  }

  function _calcularPeriodoMensalQuinzenal(cliente, agora) {
    const dias = _obterDiasCorteMes(cliente.dia_fechamento);
    const hora = _obterHoraCorte(cliente.dia_fechamento);

    const candidatos = [];
    [-1, 0, 1].forEach(offsetMes => {
      dias.forEach(dia => {
        candidatos.push(new Date(agora.getFullYear(), agora.getMonth() + offsetMes, dia, hora, 0, 0, 0));
      });
    });
    candidatos.sort((a, b) => a - b);

    let ultimoFechamento = null;
    for (let i = candidatos.length - 1; i >= 0; i--) {
      if (candidatos[i] <= agora) { ultimoFechamento = candidatos[i]; break; }
    }
    if (!ultimoFechamento) ultimoFechamento = candidatos[0];

    const idx = candidatos.indexOf(ultimoFechamento);
    const penultimoFechamento = idx > 0 ? candidatos[idx - 1] : null;

    const dataFinal = new Date(ultimoFechamento.getFullYear(), ultimoFechamento.getMonth(), ultimoFechamento.getDate());
    let dataInicial;
    if (penultimoFechamento) {
      dataInicial = new Date(penultimoFechamento.getFullYear(), penultimoFechamento.getMonth(), penultimoFechamento.getDate() + 1);
    } else {
      dataInicial = new Date(dataFinal);
      dataInicial.setDate(dataInicial.getDate() - 14);
    }

    return { inicio: toISO(dataInicial), fim: toISO(dataFinal) };
  }

  function _calcularPeriodoPagamentoCliente(cliente, pedido) {
    const agora = new Date();
    const tipoPagamento = normalizarComparacao(cliente && cliente.pagamento ? cliente.pagamento : 'DIARIO');

    if (tipoPagamento === 'SEMANAL') return _calcularPeriodoSemanal(cliente, agora);
    if (tipoPagamento === 'QUINZENAL' || tipoPagamento === 'MENSAL') return _calcularPeriodoMensalQuinzenal(cliente, agora);

    return _obterPeriodoExatoDoPedido(pedido);
  }

  function _obterPeriodoParaPedido(pedido) {
    const dataPedido = normalizarDataISO(resolverValor('pedidos', 'data', pedido));
    const base = dataPedido ? new Date(dataPedido) : new Date();

    const inicio = new Date(base.getFullYear(), base.getMonth(), 1);
    const fim = new Date(base.getFullYear(), base.getMonth() + 1, 0);

    return { inicio: toISO(inicio), fim: toISO(fim) };
  }

  let _tokenRelatorioAutomatico = 0;

  function abrirRelatorioAutomaticoDoPedido(pedidoId, clienteId, periodoExterno) {
    const meuToken = ++_tokenRelatorioAutomatico;
    _executarAberturaAutomatica(pedidoId, clienteId, periodoExterno, meuToken);
  }

  window._abrirRelatorioAutomaticoDoPedido = abrirRelatorioAutomaticoDoPedido;

  function _executarAberturaAutomatica(pedidoId, clienteId, periodoExterno, meuToken) {
    if (meuToken !== _tokenRelatorioAutomatico) return;

    if (state.fetching || !state.clientes.length || !state.pedidos.length) {
      setTimeout(function () {
        _executarAberturaAutomatica(pedidoId, clienteId, periodoExterno, meuToken);
      }, 400);
      return;
    }

    const pedido = state.pedidos.find(function (p) {
      return String(resolverValor('pedidos', 'id', p)).trim() === String(pedidoId).trim();
    });

    let cliente = _clientePorId(clienteId) || (pedido ? _clientePorId(resolverValor('pedidos', 'id_cliente', pedido)) : null);

    if (!cliente && pedido) {
      const solicitante = resolverValor('pedidos', 'solicitante', pedido);
      cliente = _clientePorNomeAproximado(solicitante);
    }

    if (!cliente) {
      relToast('Cliente do pedido #' + pedidoId + ' não encontrado. Selecione manualmente na aba Clientes.', 'warning');
      return;
    }

    if (meuToken !== _tokenRelatorioAutomatico) return;

    fecharModalRelatorio();
    fecharBuilder();
    window.dispatchEvent(new CustomEvent('fecharDashboardPedido'));

    let periodo;
    if (periodoExterno && periodoExterno.inicio && periodoExterno.fim) {
      periodo = { inicio: periodoExterno.inicio, fim: periodoExterno.fim };
    } else {
      periodo = _calcularPeriodoPagamentoCliente(cliente, pedido);
    }

    const filtroExtra = { campo: 'cliente_id', valor: [String(cliente.id)] };

    state.tabAtual = 'clientes';
    document.querySelectorAll('.rel-tab').forEach(function (el) { el.classList.remove('active'); });
    const tabClientes = document.querySelector('.rel-tab[data-tab="clientes"]');
    if (tabClientes) tabClientes.classList.add('active');
    document.querySelectorAll('.rel-tab-content').forEach(function (el) { el.classList.remove('active'); });
    const contentClientes = document.getElementById('rel-tab-content-clientes');
    if (contentClientes) contentClientes.classList.add('active');

    setTimeout(function () {
      iniciarBuilder('clientes', periodo, filtroExtra);
      relToast('Relatório do cliente "' + resolverValor('clientes', 'username', cliente) + '" pronto para gerar.', 'info');
    }, 50);
  }

  if (!window._relatorioListenerAbrirPedido) {
    window._relatorioListenerAbrirPedido = true;

    window.addEventListener('abrirRelatorioDoPedido', function (e) {
      const pedidoId = e.detail && e.detail.pedidoId;
      const clienteId = e.detail && e.detail.clienteId;
      const periodo = e.detail && e.detail.periodo;
      if (!pedidoId && !clienteId) return;

      if (typeof window.initRelatorios === 'function') window.initRelatorios();

      if (typeof window._abrirRelatorioAutomaticoDoPedido === 'function') {
        window._abrirRelatorioAutomaticoDoPedido(pedidoId, clienteId, periodo);
      }
    });
  }

  function abreviarNome(nomeCompleto) {
    if (!nomeCompleto) return '';
    const texto = String(nomeCompleto).trim();

    if (/^sem\s/i.test(texto)) return texto;

    const partes = texto.split(/\s+/).filter(Boolean);
    if (partes.length <= 1) return partes[0] || '';

    const primeiro = partes[0];
    const ultimo = partes[partes.length - 1];
    return primeiro.charAt(0).toUpperCase() + '. ' + ultimo;
  }

  window.initRelatorios = initRelatorios;
})();
