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
  const LIMIAR_SIMILARIDADE = 0.55;

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
        observacao: 'Observação', situacao: 'Situação'
      }
    },
    clientes: {
      bancos: ['clientes', 'pedidos', 'chat', 'financeiro'],
      campos: { /* ...igual... */ },
      defaults: {
        clientes: ['username'],
        pedidos: ['id', 'data', 'horario', 'de', 'para', 'valor_corrida', 'motoboy', 'status'],
        chat: [],
        financeiro: ['data', 'descricao', 'vlr_servico']
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
        financeiro: ['id_pedido', 'data', 'tipo', 'cliente', 'descricao', 'motoboy', 'vlr_servico', 'colaborador', 'observacao', 'situacao'],
        pedidos: ['motoboy', 'valor_corrida', 'status', 'data']
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

    inicializarCombosBase();
  }

  function inicializarCombosBase() {
    if (els.formMotoboySelect) transformarSelectEmComboBusca(els.formMotoboySelect);
    if (els.formClienteSelect) transformarSelectEmComboBusca(els.formClienteSelect);
    if (els.filtrosPorTipo.financeiro.select) transformarSelectEmComboBusca(els.filtrosPorTipo.financeiro.select);
  }

  function normalizarBusca(v) {
    return String(v || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim();
  }

  const ComboBuscaManager = (function () {
    let dropdownAtivo = null;

    function fecharTodos() {
      document.querySelectorAll('.rel-combo-dropdown').forEach(function (d) {
        d.style.display = 'none';
      });
      dropdownAtivo = null;
    }

    // Único listener global — fecha qualquer dropdown aberto se o clique
    // não for dentro de um wrapper de combo ou do próprio dropdown
    document.addEventListener('mousedown', function (e) {
      if (e.target.closest('.rel-combo-busca') || e.target.closest('.rel-combo-dropdown')) return;
      fecharTodos();
    });

    window.addEventListener('scroll', function () {
      if (dropdownAtivo && dropdownAtivo._reposicionar) dropdownAtivo._reposicionar();
    }, true);
    window.addEventListener('resize', function () {
      if (dropdownAtivo && dropdownAtivo._reposicionar) dropdownAtivo._reposicionar();
    });

    return {
      fecharTodos: fecharTodos,
      setAtivo: function (dropdown) { dropdownAtivo = dropdown; }
    };
  })();

  function transformarSelectEmComboBusca(selectEl) {
    if (!selectEl) return;
    if (selectEl.dataset.comboInit === '1') return;
    selectEl.dataset.comboInit = '1';

    let opcoes = Array.from(selectEl.options).map(function (o) {
      return { value: o.value, label: o.textContent };
    });

    const classesOriginais = selectEl.className;

    const wrapper = document.createElement('div');
    wrapper.className = 'rel-combo-busca';
    wrapper.style.cssText = 'position:relative;display:block;width:100%;';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = classesOriginais + ' rel-combo-input';
    input.style.cssText = 'display:block;width:100%;cursor:pointer;background:#fff !important;';
    input.placeholder = 'Digite para buscar...';
    input.autocomplete = 'off';

    const dropdown = document.createElement('div');
    dropdown.className = 'rel-combo-dropdown';
    dropdown.style.setProperty('position', 'fixed', 'important');
    dropdown.style.setProperty('max-height', '240px', 'important');
    dropdown.style.setProperty('overflow-y', 'auto', 'important');
    dropdown.style.setProperty('background', '#ffffff', 'important');
    dropdown.style.setProperty('border', '1px solid #ddd', 'important');
    dropdown.style.setProperty('border-radius', '8px', 'important');
    dropdown.style.setProperty('box-shadow', '0 6px 18px rgba(0,0,0,.25)', 'important');
    dropdown.style.setProperty('z-index', '2147483647', 'important');
    dropdown.style.setProperty('display', 'none', 'important');
    dropdown.style.setProperty('margin', '0', 'important');
    dropdown.style.setProperty('padding', '4px 0', 'important');
    dropdown.style.setProperty('list-style', 'none', 'important');

    selectEl.style.display = 'none';
    selectEl.parentNode.insertBefore(wrapper, selectEl);
    wrapper.appendChild(input);
    wrapper.appendChild(selectEl);
    document.body.appendChild(dropdown);

    let digitando = false;

    function reposicionar() {
      const rect = input.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        requestAnimationFrame(reposicionar);
        return;
      }
      dropdown.style.top = (rect.bottom + 4) + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.width = Math.max(rect.width, 200) + 'px';
    }
    dropdown._reposicionar = reposicionar;

    function abrir(lista) {
      if (!lista.length) {
        dropdown.innerHTML = '<div style="padding:10px 12px;font-size:.78rem;color:#999;">Nenhum resultado</div>';
      } else {
        dropdown.innerHTML = lista.map(function (o) {
          return '<div class="rel-combo-item" data-value="' + escapeHtml(o.value) + '" style="padding:8px 12px;font-size:.8rem;cursor:pointer;color:#222;">' + escapeHtml(o.label) + '</div>';
        }).join('');
      }

      reposicionar();
      dropdown.style.setProperty('display', 'block', 'important');
      ComboBuscaManager.setAtivo(dropdown);

      dropdown.querySelectorAll('.rel-combo-item').forEach(function (item) {
        item.addEventListener('mousedown', function (e) {
          e.preventDefault();
          e.stopPropagation();
          const val = item.dataset.value;
          const opt = opcoes.find(function (o) { return o.value === val; });
          selectEl.value = val;
          input.value = opt ? opt.label : '';
          digitando = false;
          dropdown.style.setProperty('display', 'none', 'important');
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        });
        item.addEventListener('mouseenter', function () {
          dropdown.querySelectorAll('.rel-combo-item').forEach(function (i2) { i2.style.background = ''; });
          item.style.background = '#f4f4f4';
        });
      });
    }

    function filtrar(texto) {
      const t = normalizarBusca(texto);
      if (!t) { abrir(opcoes); return; }
      const filtrado = opcoes.filter(function (o) {
        return normalizarBusca(o.label).indexOf(t) !== -1;
      });
      abrir(filtrado);
    }

    input.addEventListener('mousedown', function (e) {
      e.stopPropagation();
      digitando = false;
      abrir(opcoes);
    });

    input.addEventListener('focus', function () {
      input.select();
    });

    input.addEventListener('input', function () {
      digitando = true;
      filtrar(input.value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') dropdown.style.setProperty('display', 'none', 'important');
      if (e.key === 'ArrowDown') abrir(digitando ? opcoes.filter(function (o) { return normalizarBusca(o.label).indexOf(normalizarBusca(input.value)) !== -1; }) : opcoes);
    });

    const selecionado = opcoes.find(function (o) { return o.value === selectEl.value; }) || opcoes[0];
    if (selecionado) {
      input.value = selecionado.label;
      selectEl.value = selecionado.value;
    }

    selectEl._comboBuscaRefresh = function (novasOpcoes) {
      opcoes = novasOpcoes;
      const sel = opcoes.find(function (o) { return o.value === selectEl.value; }) || opcoes[0];
      if (sel) {
        selectEl.value = sel.value;
        input.value = sel.label;
      } else {
        input.value = '';
        selectEl.value = '';
      }
    };
  }

  function popularSelectMotoboys() {
    if (!els.formMotoboySelect) return;
    const opcoes = [{ value: '__todos__', label: 'Todos os motoboys' }];
    state.motoboys
      .map(function (mb) { return { id: mb.id, nome: resolverValor('colaborador', 'username', mb) || resolverValor('colaborador', 'colaborador', mb) || 'Sem nome' }; })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); })
      .forEach(function (mb) { opcoes.push({ value: String(mb.id), label: mb.nome }); });

    els.formMotoboySelect.innerHTML = opcoes.map(function (o) {
      return '<option value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</option>';
    }).join('');

    if (els.formMotoboySelect._comboBuscaRefresh) {
      els.formMotoboySelect._comboBuscaRefresh(opcoes);
    } else {
      transformarSelectEmComboBusca(els.formMotoboySelect);
    }
  }

  function popularSelectClientes() {
    if (!els.formClienteSelect) return;
    const opcoes = [{ value: '__todos__', label: 'Todos os clientes' }];
    state.clientes
      .map(function (cli) { return { id: cli.id, nome: resolverValor('clientes', 'username', cli) || resolverValor('clientes', 'responsavel', cli) || 'Sem nome' }; })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); })
      .forEach(function (cli) { opcoes.push({ value: String(cli.id), label: cli.nome }); });

    els.formClienteSelect.innerHTML = opcoes.map(function (o) {
      return '<option value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</option>';
    }).join('');

    if (els.formClienteSelect._comboBuscaRefresh) {
      els.formClienteSelect._comboBuscaRefresh(opcoes);
    } else {
      transformarSelectEmComboBusca(els.formClienteSelect);
    }
  }

  function popularSelectFinanceiro() {
    const selFin = els.filtrosPorTipo.financeiro.select;
    if (!selFin) return;

    const tiposEncontrados = {};
    state.financeiro.forEach(function (r) {
      const tipo = String(resolverValor('financeiro', 'tipo', r) || '').trim();
      if (tipo) tiposEncontrados[tipo.toUpperCase()] = tipo;
    });

    const opcoes = [{ value: '__todos__', label: 'Todos os lançamentos' }];
    Object.keys(tiposEncontrados).sort().forEach(function (chave) {
      opcoes.push({ value: tiposEncontrados[chave], label: tiposEncontrados[chave] });
    });

    if (!Object.keys(tiposEncontrados).length) {
      opcoes.push({ value: 'Receita', label: 'Receita' });
      opcoes.push({ value: 'Despesa', label: 'Despesa' });
    }

    selFin.innerHTML = opcoes.map(function (o) {
      return '<option value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</option>';
    }).join('');

    if (selFin._comboBuscaRefresh) {
      selFin._comboBuscaRefresh(opcoes);
    } else {
      transformarSelectEmComboBusca(selFin);
    }
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
      ComboBuscaManager.fecharTodos();
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
        labels = state.motoboys.filter(function (m) { return fx.valor.indexOf(String(m.id)) !== -1; }).map(function (m) { return resolverValor('colaborador', 'username', m); });
      } else if (fx.campo === 'cliente_id') {
        labels = state.clientes.filter(function (c) { return fx.valor.indexOf(String(c.id)) !== -1; }).map(function (c) { return resolverValor('clientes', 'username', c); });
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
    return String(v == null ? '' : v)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  function tokenizar(v) {
    return normalizarComparacao(v).split(' ').filter(function (t) { return t.length > 0; });
  }

  function levenshtein(a, b) {
    a = a || '';
    b = b || '';
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j];
        dp[j] = a[i - 1] === b[j - 1]
          ? prev
          : Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
        prev = temp;
      }
    }
    return dp[n];
  }

  function similaridade(a, b) {
    const na = normalizarComparacao(a);
    const nb = normalizarComparacao(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1) return 0.9;
    const dist = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    return maxLen === 0 ? 0 : 1 - (dist / maxLen);
  }

  function similaridadeTokens(a, b) {
    const tokensA = tokenizar(a);
    const tokensB = tokenizar(b);
    if (!tokensA.length || !tokensB.length) return 0;
    let melhores = 0;
    tokensA.forEach(function (ta) {
      let melhorLocal = 0;
      tokensB.forEach(function (tb) {
        const sim = similaridade(ta, tb);
        if (sim > melhorLocal) melhorLocal = sim;
      });
      melhores += melhorLocal;
    });
    return melhores / Math.max(tokensA.length, tokensB.length);
  }

  function nomesCorrespondem(a, b) {
    if (!a || !b) return false;
    const direta = similaridade(a, b);
    if (direta >= LIMIAR_SIMILARIDADE) return true;
    const porTokens = similaridadeTokens(a, b);
    return porTokens >= LIMIAR_SIMILARIDADE;
  }

  function obterNomeClienteDoPedido(pedido) {
    const idCliente = resolverValor('pedidos', 'id_cliente', pedido);
    if (idCliente && /^\d+$/.test(String(idCliente).trim())) {
      const cli = state.clientes.find(function (c) { return String(c.id) === String(idCliente).trim(); });
      if (cli) return resolverValor('clientes', 'username', cli);
    }

    const destino = resolverValor('pedidos', 'para', pedido);
    if (destino) return destino;

    if (idCliente) return idCliente;

    const solicitante = resolverValor('pedidos', 'solicitante', pedido);
    if (solicitante) return solicitante;

    const observacao = resolverValor('pedidos', 'observacao', pedido);
    return observacao || '';
  }

  function idsParaClientesSelecionados(ids) {
    const idsStr = ids.map(function (v) { return String(v).trim(); });
    return state.clientes.filter(function (c) { return idsStr.indexOf(String(c.id).trim()) !== -1; });
  }

  function extrairNomesAlvoCliente(valoresBrutos, clientesSelecionados) {
    const nomesTexto = [];
    valoresBrutos.forEach(function (v) {
      const vStr = String(v).trim();
      if (!vStr) return;
      if (/^\d+$/.test(vStr)) return;
      nomesTexto.push(vStr);
    });
    clientesSelecionados.forEach(function (c) {
      const username = resolverValor('clientes', 'username', c);
      const responsavel = resolverValor('clientes', 'responsavel', c);
      if (username) nomesTexto.push(username);
      if (responsavel) nomesTexto.push(responsavel);
    });
    return nomesTexto;
  }

  function valorCorrespondeNomesAlvo(valor, nomesAlvo) {
    if (!valor) return false;
    return nomesAlvo.some(function (nome) { return nomesCorrespondem(valor, nome); });
  }

  function pedidoCorrespondeCliente(pedido, clientesSelecionados, idsStr, nomesAlvo) {
    const idPed = String(resolverValor('pedidos', 'id_cliente', pedido)).trim();
    if (idsStr.indexOf(idPed) !== -1) return true;
    const destino = resolverValor('pedidos', 'para', pedido);
    if (valorCorrespondeNomesAlvo(destino, nomesAlvo)) return true;
    const nomePedido = obterNomeClienteDoPedido(pedido);
    if (!nomePedido) return false;
    return valorCorrespondeNomesAlvo(nomePedido, nomesAlvo);
  }

  function chatCorrespondeCliente(registroChat, idsStr, nomesAlvo) {
    const idChat = String(resolverValor('chat', 'id_cliente', registroChat)).trim();
    if (idsStr.indexOf(idChat) !== -1) return true;
    const pedidoVinculado = buscarPedidoDoChat(registroChat);
    if (!pedidoVinculado) return false;
    return pedidoCorrespondeCliente(pedidoVinculado, [], idsStr, nomesAlvo);
  }

  function financeiroCorrespondeCliente(registro, nomesAlvo) {
    const nomeFin = obterValorCampoFinanceiro('cliente', registro);
    if (valorCorrespondeNomesAlvo(nomeFin, nomesAlvo)) return true;
    const pedidoVinculado = buscarPedidoDoFinanceiro(registro);
    if (!pedidoVinculado) return false;
    const destino = resolverValor('pedidos', 'para', pedidoVinculado);
    return valorCorrespondeNomesAlvo(destino, nomesAlvo) || valorCorrespondeNomesAlvo(obterNomeClienteDoPedido(pedidoVinculado), nomesAlvo);
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
        return dentroPeriodo(obterValorCampoFinanceiro('data', r), p.inicio, p.fim);
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
      const nomesSelecionados = idsParaNomes(valoresBrutos, state.motoboys, 'colaborador');

      if (banco === 'colaborador') {
        return dados.filter(function (r) { return idBate(r.id); });
      }
      if (banco === 'pedidos') {
        return dados.filter(function (r) {
          const mb = normalizarComparacao(resolverValor('pedidos', 'motoboy', r));
          return nomesSelecionados.indexOf(mb) !== -1;
        });
      }
      if (banco === 'financeiro') {
        return dados.filter(function (r) {
          const mb = normalizarComparacao(resolverValor('financeiro', 'motoboy', r));
          const colab = normalizarComparacao(resolverValor('financeiro', 'colaborador', r));
          return nomesSelecionados.indexOf(mb) !== -1 || nomesSelecionados.indexOf(colab) !== -1;
        });
      }
      return dados;
    }

    if (fx.campo === 'cliente_id') {
      const clientesSelecionados = idsParaClientesSelecionados(valoresBrutos);
      const nomesAlvo = extrairNomesAlvoCliente(valoresBrutos, clientesSelecionados);

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
    const idPedido = resolverValor('financeiro', 'id_pedido', registro);
    return state.pedidos.find(function (p) {
      return String(resolverValor('pedidos', 'id', p)) === String(idPedido);
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

  function obterValorCampoFinanceiro(campo, registro) {
    let valor = resolverValor('financeiro', campo, registro);

    if (campo === 'cliente') {
      if (valor) return valor; // já vem resolvido do backend (getfinanceirocompleto)

      const descricao = resolverValor('financeiro', 'descricao', registro);
      const nomeDaDescricao = extrairNomeClienteDescricao(descricao);
      if (nomeDaDescricao) return nomeDaDescricao;

      const pedido = buscarPedidoDoFinanceiro(registro);
      if (pedido) return obterNomeClienteDoPedido(pedido);

      return '';
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
        const nome = resolverValor(banco, 'username', item);
        if (nome) nomes.push(normalizarComparacao(nome));
      }
    });
    return nomes;
  }

  function calcularTotaisBanco(banco, dadosOriginais) {
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
        const v = parseMoeda(obterValorCampoFinanceiro('vlr_servico', r));
        if (!isNaN(v)) totais.somaValor += v;
        const sit = normalizarComparacao(resolverValor('financeiro', 'situacao', r));
        if (sit === 'PAGO' && !isNaN(v)) totais.somaPagos += v;
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
        totais: calcularTotaisBanco(banco, dados)
      };
    });

    const pedidosSelecionado = !!snapshot.bancos.pedidos;
    const financeiroSelecionado = !!snapshot.bancos.financeiro;

    if (pedidosSelecionado || financeiroSelecionado) {
      let resumoMotoboys, baseDados;

      if (pedidosSelecionado) {
        baseDados = coletarDadosBanco('pedidos');
        resumoMotoboys = agruparPorMotoboy(baseDados);
      } else {
        baseDados = coletarDadosBanco('financeiro');
        resumoMotoboys = agruparPorMotoboyFinanceiro(baseDados);
      }

      snapshot.resumos.motoboys = resumoMotoboys;

      if (pedidosSelecionado) {
        snapshot.resumos.clientes = agruparPorCliente(baseDados);
      }

      const datasPorMotoboy = {};
      baseDados.forEach(function (registro) {
        const nomeMotoboy = pedidosSelecionado
          ? obterValorCampoPedido('motoboy', registro)
          : (resolverValor('financeiro', 'motoboy', registro) || resolverValor('financeiro', 'colaborador', registro));
        if (!nomeMotoboy) return;

        const dataBruta = pedidosSelecionado
          ? obterDataPedidoComFallback(registro)
          : obterValorCampoFinanceiro('data', registro);

        const dataISO = normalizarDataISO(dataBruta);
        const dataFormatada = dataISO ? formatDateBR(dataISO) : null;
        if (!dataFormatada) return;
        if (!datasPorMotoboy[nomeMotoboy]) datasPorMotoboy[nomeMotoboy] = [];
        if (datasPorMotoboy[nomeMotoboy].indexOf(dataFormatada) === -1) {
          datasPorMotoboy[nomeMotoboy].push(dataFormatada);
        }
      });

      const totalChamados = baseDados.length;
      const valorTotalGeral = resumoMotoboys.reduce(function (acc, m) { return acc + m.receitaTotal; }, 0);
      const valorTotalMotoboys = resumoMotoboys.reduce(function (acc, m) { return acc + m.valorMotoboy; }, 0);
      const valorTotalRdo = resumoMotoboys.reduce(function (acc, m) { return acc + m.valorRdo; }, 0);
      const totalPendentes = resumoMotoboys.reduce(function (acc, m) { return acc + m.qtdPendente; }, 0);

      snapshot.resumos.geral = {
        totalChamados: totalChamados,
        totalMotoboysDistintos: resumoMotoboys.length,
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

  function abrirModalRelatorio(relatorio, novoGerado) {
    try {
      ComboBuscaManager.fecharTodos();
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
    if (!window.API || typeof window.API.call !== 'function') { relToast('API não disponível.', 'danger'); return; }

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
      situacao: 'gerado',
      data_criacao: new Date().toISOString().slice(0, 10)
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
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

      window.API.call('delrelatorio', { id: rel.id })
        .then(function (res) {
          if (res && res.status === 'success') {
            state.relatoriosSalvos = state.relatoriosSalvos.filter(function (r) { return r.id !== rel.id; });
            renderizarListas();
            relToast('Relatório excluído com sucesso!', 'success');
            modalInst.hide();
          } else {
            throw new Error((res && res.message) || 'Erro ao excluir');
          }
        })
        .catch(function (err) {
          relToast('Erro ao excluir relatório: ' + err.message, 'danger');
          btnConfirmar.disabled = false;
          btnConfirmar.innerHTML = 'Excluir';
        });
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
    if (state.fetching) return;
    if (!window.API || typeof window.API.call !== 'function') {
      relToast('API não disponível.', 'danger');
      return;
    }
    state.fetching = true;
    spinOn();
    exibirLoadingListas();

    Promise.all([
      window.API.call('getcolaboradores', {}),
      window.API.call('getclientes', {}),
      window.API.call('getpedidos', {}),
      window.API.call('getchat', {}),
      window.API.call('getfinanceirocompleto', {}),
      window.API.call('getrelatorios', {})
    ]).then(function (resultados) {
      state.motoboys = extrairArray(resultados[0]);
      state.clientes = extrairArray(resultados[1]);
      state.pedidos = extrairArray(resultados[2]);
      state.chat = extrairArray(resultados[3]);
      state.financeiro = extrairArray(resultados[4]);

      const relatoriosBrutos = extrairArray(resultados[5]);
      state.relatoriosSalvos = relatoriosBrutos.map(function (r) {
        let snapshot = {};
        let titulo = r.tipo || 'Relatório';
        try {
          const parsed = JSON.parse(r.descricao);
          snapshot = parsed.snapshot || {};
          titulo = parsed.titulo || titulo;
        } catch (e) { }

        const dataCriacaoISO = normalizarDataISO(r.data_criacao || r.criadoEm || r.data);
        const criadoEmTimestamp = dataCriacaoISO ? new Date(dataCriacaoISO).getTime() : Date.now();

        return {
          id: r.id,
          tipo: r.tipo,
          titulo: titulo,
          periodoLabel: r.observacao || r.data,
          criadoEm: isNaN(criadoEmTimestamp) ? Date.now() : criadoEmTimestamp,
          descricao: r.descricao,
          snapshot: snapshot,
          data: r.data
        };
      });

      popularSelectMotoboys();
      popularSelectClientes();
      popularSelectFinanceiro();
      renderizarListas();
      relToast('Dados atualizados com sucesso!', 'success');
    }).catch(function (err) {
      relToast('Erro ao carregar dados: ' + err.message, 'danger');
    }).finally(function () {
      state.fetching = false;
      spinOff();
    });
  }

  function initRelatorios() {
    if (inicializado) return;
    inicializado = true;
    bind();
    registrarEventos();
    carregarDados();
  }

  function agruparPorMotoboyFinanceiro(registrosFinanceiro) {
    const mapa = {};

    registrosFinanceiro.forEach(function (r) {
      const nome = resolverValor('financeiro', 'motoboy', r) ||
        resolverValor('financeiro', 'colaborador', r) ||
        'Sem motoboy';
      const sit = normalizarComparacao(resolverValor('financeiro', 'situacao', r));
      const valor = parseMoeda(obterValorCampoFinanceiro('vlr_servico', r));
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
      return {
        nome: m.nome,
        qtd: m.qtd,
        qtdPendente: m.qtdPendente,
        receitaTotal: m.receitaTotal,
        receitaPendente: m.receitaPendente,
        valorMotoboy: m.receitaTotal * PERCENTUAL_MOTOBOY,
        valorRdo: m.receitaTotal * PERCENTUAL_RDO,
        valorMotoboyPendente: m.receitaPendente * PERCENTUAL_MOTOBOY,
        valorRdoPendente: m.receitaPendente * PERCENTUAL_RDO,
        valorTotalCalculado: (m.receitaTotal * PERCENTUAL_MOTOBOY) + (m.receitaTotal * PERCENTUAL_RDO)
      };
    }).sort(function (a, b) { return b.receitaTotal - a.receitaTotal; });
  }

  window.initRelatorios = initRelatorios;
})();