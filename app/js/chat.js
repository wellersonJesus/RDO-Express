window.RDO_PEDIDOS = window.RDO_PEDIDOS || {};

var MAPA_BAIRRO_CIDADE = {
    "savassi": "belo horizonte",
    "funcionarios": "belo horizonte",
    "lourdes": "belo horizonte",
    "santo agostinho": "belo horizonte",
    "cidade jardim": "belo horizonte",
    "sion": "belo horizonte",
    "belvedere": "belo horizonte",
    "mangabeiras": "belo horizonte",
    "anchieta": "belo horizonte",
    "cruzeiro": "belo horizonte",
    "carmo": "belo horizonte",
    "serra": "belo horizonte",
    "santa lucia": "belo horizonte",
    "buritis": "belo horizonte",
    "estoril": "belo horizonte",
    "jardim america": "belo horizonte",
    "gutierrez": "belo horizonte",
    "prado": "belo horizonte",
    "calafate": "belo horizonte",
    "barroca": "belo horizonte",
    "nova suica": "belo horizonte",
    "salgado filho": "belo horizonte",
    "havai": "belo horizonte",
    "betania": "belo horizonte",
    "camargos": "belo horizonte",
    "barreiro": "belo horizonte",
    "diamante": "belo horizonte",
    "milionarios": "belo horizonte",
    "flavio marques lisboa": "belo horizonte",
    "tirol": "belo horizonte",
    "pilar": "belo horizonte",
    "vale do jatoba": "belo horizonte",
    "pampulha": "belo horizonte",
    "sao luiz": "belo horizonte",
    "ouro preto": "belo horizonte",
    "planalto": "belo horizonte",
    "castelo": "belo horizonte",
    "itapoa": "belo horizonte",
    "braunas": "belo horizonte",
    "santa amelia": "belo horizonte",
    "santa branca": "belo horizonte",
    "engenho nogueira": "belo horizonte",
    "san pedro": "belo horizonte",
    "trevo": "belo horizonte",
    "dona clara": "belo horizonte",
    "liberdade": "belo horizonte",
    "urca": "belo horizonte",
    "jaragua": "belo horizonte",
    "venda nova": "belo horizonte",
    "sao joao batista": "belo horizonte",
    "candelaria": "belo horizonte",
    "mantiqueira": "belo horizonte",
    "leticia": "belo horizonte",
    "rio branco": "belo horizonte",
    "piratininga": "belo horizonte",
    "europa": "belo horizonte",
    "copacabana": "belo horizonte",
    "vila cloris": "belo horizonte",
    "cachoeirinha": "belo horizonte",
    "floresta": "belo horizonte",
    "sagrada familia": "belo horizonte",
    "colegio batista": "belo horizonte",
    "horto": "belo horizonte",
    "sao geraldo": "belo horizonte",
    "pompeia": "belo horizonte",
    "concordia": "belo horizonte",
    "goiania": "belo horizonte",
    "conjunto taquaril": "belo horizonte",
    "taquaril": "belo horizonte",
    "granja de freitas": "belo horizonte",
    "boa vista": "belo horizonte",
    "santa efigenia": "belo horizonte",
    "santa tereza": "belo horizonte",
    "pompeu": "belo horizonte",
    "esplanada": "belo horizonte",
    "gameleira": "belo horizonte",
    "olhos dagua": "belo horizonte",
    "coracao eucaristico": "belo horizonte",
    "vera cruz": "belo horizonte",
    "santa ines": "belo horizonte",
    "cidade nova": "belo horizonte",
    "lagoinha": "belo horizonte",
    "caicaras": "belo horizonte",
    "bonfim": "belo horizonte",
    "riacho das pedras": "contagem",
    "eldorado": "contagem",
    "cinco": "contagem",
    "bela vista": "contagem",
    "santa terezinha": "contagem",
    "bernardo monteiro": "contagem",
    "bitacula": "contagem",
    "40 alqueires": "contagem",
    "fonte grande": "contagem",
    "santa helena": "contagem",
    "vila belem": "contagem",
    "canada": "contagem",
    "nossa senhora do carmo": "contagem",
    "vila panama": "contagem",
    "lucio de abreu": "contagem",
    "praia": "contagem",
    "sapucaias": "contagem",
    "petrolandia": "contagem",
    "ressaca": "contagem",
    "industrial": "contagem",
    "vila oeste": "contagem",
    "vila perus": "contagem",
    "jardim riacho das pedras": "contagem",
    "nacoes unidas": "contagem",
    "icaivera": "betim",
    "citrolandia": "betim",
    "terezopolis": "betim",
    "imbirucu": "betim",
    "ptb": "betim",
    "alterosa": "betim",
    "alterosas": "betim",
    "vianopolis": "betim",
    "petrovale": "betim",
    "acude": "betim",
    "alta villa": "betim",
    "alto das flores": "betim",
    "alvorada": "betim",
    "amarante": "betim",
    "amazonas": "betim",
    "amoras": "betim",
    "angola": "betim",
    "aroeiras": "betim",
    "arquipelago verde": "betim",
    "bandeirinhas": "betim",
    "betim industrial": "betim",
    "bodoco": "betim",
    "bom repouso": "betim",
    "bom retiro": "betim",
    "brasileia": "betim",
    "brodoski": "betim",
    "cachoeira": "betim",
    "california": "betim",
    "campos eliseos": "betim",
    "campos elisios": "betim",
    "capelinha": "betim",
    "casa amarela": "betim",
    "chacara": "betim",
    "chacaras": "betim",
    "chacaras arapua": "betim",
    "charneca": "betim",
    "cidade verde": "betim",
    "colonia santa isabel": "betim",
    "cruzeiro do sul": "betim",
    "decamao": "betim",
    "dom bosco": "betim",
    "duque de caxias": "betim",
    "espirito santo": "betim",
    "estancia do sereno": "betim",
    "filadelfia": "betim",
    "flores e florestas": "betim",
    "gentileza": "betim",
    "granja santo afonso": "betim",
    "granja sao joao": "betim",
    "granja verde": "betim",
    "guanabara": "betim",
    "guaruja": "betim",
    "guaruja mansoes": "betim",
    "inga": "betim",
    "itacolomi": "betim",
    "jardim alterosa": "betim",
    "jardim brasilia": "betim",
    "jardim casa branca": "betim",
    "jardim cidade": "betim",
    "jardim das acacias": "betim",
    "jardim piemont": "betim",
    "novo horizonte betim": "betim",
    "santa luzia": "santa luzia",
    "ribeirao das neves": "ribeirão das neves",
    "vespasiano": "vespasiano",
    "nova lima": "nova lima",
    "sabara": "sabará",
    "sarzedo": "sarzedo",
    "ibirite": "ibirité",
    "mario campos": "mário campos",
    "esmeraldas": "esmeraldas",
    "mateus leme": "mateus leme",
    "juatuba": "juatuba",
    "brumadinho": "brumadinho",
    "caete": "caeté",
    "raposos": "raposos",
    "rio acima": "rio acima",
    "nova uniao": "nova união"
};

function normalizarParaGeocodificacao(enderecoOriginal) {
    var texto = String(enderecoOriginal || "");

    // Expande abreviações comuns (com ou sem espaço/ponto)
    texto = texto.replace(/\bR\.?\s*/gi, "Rua ");
    texto = texto.replace(/\bAv\.?\s*/gi, "Avenida ");
    texto = texto.replace(/\bAl\.?\s*/gi, "Alameda ");
    texto = texto.replace(/\bPç\.?\s*/gi, "Praça ");
    texto = texto.replace(/\bPc\.?\s*/gi, "Praça ");
    texto = texto.replace(/\bTv\.?\s*/gi, "Travessa ");
    texto = texto.replace(/\bRod\.?\s*/gi, "Rodovia ");

    // Remove complemento de apto/bloco/sala que confunde a API (fica só número da rua)
    // Ex: "64/902,Bl2,Buritis" -> pega só "64"
    texto = texto.replace(/(\d+)\/\d+[a-zA-Z]*(,?\s*Bl\.?\d*)?/gi, "$1");
    texto = texto.replace(/,?\s*(sl|sala|apto|apt|bl|bloco|loja|lj)\.?\s*\d+[a-zA-Z]*/gi, "");

    // Remove rotas múltiplas (fica só o primeiro trecho, antes de "→" ou "De:"/"Para:")
    if (texto.indexOf("→") !== -1) texto = texto.split("→")[0];
    texto = texto.replace(/^De:\s*/i, "").replace(/\s*Para:.*$/i, "");

    // Garante espaço após vírgulas e pontos
    texto = texto.replace(/,(?=\S)/g, ", ");

    // Remove múltiplos espaços
    texto = texto.replace(/\s+/g, " ").trim();

    return texto;
}

function completarEnderecoComCidadePadrao(enderecoOriginal) {
    var limpo = limparSeparadoresEndereco(enderecoOriginal);
    var norm = normalizarEnderecoParaBusca(limpo);

    if (enderecoContemCidade(norm)) return limpo;

    var bairroEncontrado = Object.keys(MAPA_BAIRRO_CIDADE)
        .sort(function (a, b) { return b.length - a.length; })
        .find(function (chave) { return norm.indexOf(chave) !== -1; });

    var cidade = bairroEncontrado ? MAPA_BAIRRO_CIDADE[bairroEncontrado] : "Belo Horizonte";

    return limpo + ", " + cidade + ", MG";
}

window._storageComExpiracao = (function () {
    var VALIDADE_MS = 24 * 60 * 60 * 1000;

    function set(chave, valor) {
        var payload = { valor: valor, expiraEm: Date.now() + VALIDADE_MS };
        try { localStorage.setItem(chave, JSON.stringify(payload)); } catch (e) { window._exibirErroGlobal(e, 'salvar configuração local'); }
    }

    function get(chave, valorPadrao) {
        try {
            var bruto = localStorage.getItem(chave);
            if (!bruto) return valorPadrao;
            var payload = JSON.parse(bruto);
            if (!payload || typeof payload.expiraEm !== 'number') return valorPadrao;
            if (Date.now() > payload.expiraEm) {
                localStorage.removeItem(chave);
                return valorPadrao;
            }
            return payload.valor;
        } catch (e) { window._exibirErroGlobal(e, 'ler configuração local'); return valorPadrao; }
    }

    function remove(chave) {
        try { localStorage.removeItem(chave); } catch (e) { window._exibirErroGlobal(e, 'remover configuração local'); }
    }

    return { set: set, get: get, remove: remove };
})();

window._exibirErroGlobal = function (erro, contexto) {
    var ctx = contexto || 'executar operação';

    var existeErro = erro !== null && erro !== undefined &&
        !(typeof erro === 'string' && erro.trim() === '') &&
        !(erro instanceof Event && !erro.error && !erro.message && !erro.reason);

    if (!existeErro) return;

    var msg;
    if (erro instanceof Error) {
        msg = erro.message || erro.name || 'Erro sem mensagem';
    } else if (typeof erro === 'string') {
        msg = erro;
    } else if (erro && typeof erro === 'object') {
        msg = erro.message || erro.reason || erro.error || (function () {
            try { return JSON.stringify(erro); } catch (_) { return 'Erro desconhecido'; }
        })();
    } else {
        msg = String(erro);
    }

    try { console.error('[ERRO][' + ctx + ']', erro); } catch (_) { }

    var msgSegura = String(msg)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    try {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Erro: ' + ctx,
                html: '<div style="font-size:.85rem;word-break:break-word;">' + msgSegura + '</div>',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4500,
                timerProgressBar: true,
                customClass: { popup: 'rounded-4 shadow' }
            });
        }
    } catch (_) { }
};

window.addEventListener('error', function (e) {
    window._exibirErroGlobal(e.error || e.message || e, 'Erro em tempo de execução');
});

window.addEventListener('unhandledrejection', function (e) {
    window._exibirErroGlobal(e.reason, 'Promise não tratada');
});

window.marcarCampoInvalido = function () {
    var input = document.getElementById('msg-input');
    if (!input) return;
    input.style.border = '2px solid #dc3545';
    input.style.boxShadow = '0 0 0 0.2rem rgba(220,53,69,.25)';
    input.setAttribute('placeholder', '⚠️ Digite os dados do pedido aqui...');
    setTimeout(function () {
        input.style.border = '';
        input.style.boxShadow = '';
        input.setAttribute('placeholder', 'Digite o pedido...');
    }, 3000);
};

window.marcarCampoFormInvalido = function (campo) {
    if (!campo) return;
    campo.style.border = '2px solid #dc3545';
    campo.style.boxShadow = '0 0 0 0.2rem rgba(220,53,69,.25)';
    setTimeout(function () {
        campo.style.border = '';
        campo.style.boxShadow = '';
    }, 3000);
};

window.limparCampoInvalido = function () {
    var input = document.getElementById('msg-input');
    if (!input) return;
    input.style.border = '';
    input.style.boxShadow = '';
    input.setAttribute('placeholder', 'Digite o pedido...');
};

window.AppRDO = window.AppRDO || {};
window.AppRDO.debounceTimer = window.AppRDO.debounceTimer || null;
window.AppRDO.listaCarregada = false;
window.AppRDO.isFetching = window.AppRDO.isFetching || false;
window.AppRDO.isProcessingCheckout = false;
window.AppRDO.pedidosCache = window.AppRDO.pedidosCache || [];
window.AppRDO.motoboyCache = window.AppRDO.motoboyCache || [];
window.AppRDO.pedidoEmEdicao = null;
window.AppRDO.clienteId = window.AppRDO.clienteId || null;
window.AppRDO.clienteSelecionado = window.AppRDO.clienteSelecionado || null;
window.AppRDO.clientesCache = window.AppRDO.clientesCache || [];
window.AppRDO.mensagensCache = window.AppRDO.mensagensCache || [];
window.AppRDO.isMasterOn = localStorage.getItem('bot_master_active') === 'true';
window.AppRDO._mapaModalAberto = false;
window.AppRDO.notificacoes = window.AppRDO.notificacoes || [];
window.AppRDO._chatRequestToken = window.AppRDO._chatRequestToken || 0;

window.dadosPedidoAtual = window.dadosPedidoAtual || {};

window.NotificationManager = (function () {
    var notificacoes = [];
    var maxNotificacoes = 50;
    var audioCtx = null;
    var isAberto = false;
    var eventosRegistrados = false;

    var CHAVE_SOM = 'rdo_sound_settings';
    var CHAVE_NOTIF = 'rdo_notificacoes_persistidas';
    var VALIDADE_NOTIF_MS = 24 * 60 * 60 * 1000;
    var somPadrao = { criado: false, cancelado: false, concluido: false };

    function _lerConfigSom() {
        var salvo = window._storageComExpiracao.get(CHAVE_SOM, null);
        return Object.assign({}, somPadrao, salvo || {});
    }

    function _salvarConfigSom(cfg) {
        window._storageComExpiracao.set(CHAVE_SOM, cfg);
    }

    var configSom = _lerConfigSom();

    function _somEstaMutado(tipo) { return !!configSom[tipo]; }

    function _alternarMudo(tipo) {
        configSom[tipo] = !configSom[tipo];
        _salvarConfigSom(configSom);
        _renderizarPainelSom();
    }

    function _getCtx() {
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { window._exibirErroGlobal(e, 'inicializar áudio'); audioCtx = null; }
        }
        return audioCtx;
    }

    function _tocarTom(freqs, duracoes, tipo) {
        try {
            var ctx = _getCtx();
            if (!ctx) return;
            if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { window._exibirErroGlobal(e, 'retomar áudio'); } }
            var tempoAtual = ctx.currentTime;
            freqs.forEach(function (freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = tipo || 'sine';
                osc.frequency.value = freq;
                var inicio = tempoAtual + (i * (duracoes[i] || 0.12));
                var dur = duracoes[i] || 0.12;
                gain.gain.setValueAtTime(0, inicio);
                gain.gain.linearRampToValueAtTime(0.35, inicio + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, inicio + dur);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(inicio);
                osc.stop(inicio + dur + 0.02);
            });
        } catch (e) { window._exibirErroGlobal(e, 'tocar som'); }
    }

    function _tocarSomCriado() {
        if (_somEstaMutado('criado')) return;
        _tocarTom([700, 1000], [0.09, 0.14], 'triangle');
    }

    function _tocarSomCancelado() {
        if (_somEstaMutado('cancelado')) return;
        _tocarTom([440, 330], [0.15, 0.28], 'sawtooth');
    }

    function _tocarSomConcluido() {
        if (_somEstaMutado('concluido')) return;
        try {
            var ctx = _getCtx();
            if (!ctx) return;
            if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { window._exibirErroGlobal(e, 'retomar áudio'); } }

            var tempoAtual = ctx.currentTime;
            var totalMoedas = 8;

            for (var i = 0; i < totalMoedas; i++) {
                (function (idx) {
                    var inicio = tempoAtual + idx * (0.045 + Math.random() * 0.05);
                    var freqBase = 2200 + Math.random() * 1400;

                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freqBase, inicio);
                    osc.frequency.exponentialRampToValueAtTime(freqBase * 0.5, inicio + 0.09);

                    gain.gain.setValueAtTime(0, inicio);
                    gain.gain.linearRampToValueAtTime(0.3, inicio + 0.005);
                    gain.gain.exponentialRampToValueAtTime(0.001, inicio + 0.15);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(inicio);
                    osc.stop(inicio + 0.18);

                    var osc2 = ctx.createOscillator();
                    var gain2 = ctx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(freqBase * 2.4, inicio);
                    osc2.frequency.exponentialRampToValueAtTime(freqBase * 1.2, inicio + 0.06);

                    gain2.gain.setValueAtTime(0, inicio);
                    gain2.gain.linearRampToValueAtTime(0.12, inicio + 0.004);
                    gain2.gain.exponentialRampToValueAtTime(0.001, inicio + 0.08);

                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start(inicio);
                    osc2.stop(inicio + 0.1);
                })(i);
            }
        } catch (e) { window._exibirErroGlobal(e, 'tocar som de moedas'); }
    }

    function _tocarSomExcluido() { _tocarTom([600, 400, 250], [0.1, 0.1, 0.22], 'triangle'); }

    function _tiposPersistidos() {
        return ['CRIADO', 'CANCELADO', 'CONCLUÍDO', 'EXCLUÍDO'];
    }

    function _dentroDeVinteQuatroHoras(timestampISO) {
        var t = new Date(timestampISO).getTime();
        if (isNaN(t)) return false;
        return (Date.now() - t) <= VALIDADE_NOTIF_MS;
    }

    function _ordenarPorTimestampDesc(lista) {
        return lista.slice().sort(function (a, b) {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    }

    function _persistirNotificacoes() {
        try {
            var relevantes = notificacoes.filter(function (n) {
                return _tiposPersistidos().indexOf(n.tipo) !== -1 && _dentroDeVinteQuatroHoras(n.timestamp);
            });
            var ordenadas = _ordenarPorTimestampDesc(relevantes).slice(0, maxNotificacoes);
            localStorage.setItem(CHAVE_NOTIF, JSON.stringify(ordenadas));
        } catch (e) { window._exibirErroGlobal(e, 'persistir notificações'); }
    }

    function _carregarNotificacoesPersistidas() {
        try {
            var bruto = localStorage.getItem(CHAVE_NOTIF);
            if (!bruto) return [];
            var lista = JSON.parse(bruto);
            if (!Array.isArray(lista)) return [];
            var validas = lista.filter(function (n) {
                return n && n.timestamp && _dentroDeVinteQuatroHoras(n.timestamp);
            });
            return _ordenarPorTimestampDesc(validas);
        } catch (e) { window._exibirErroGlobal(e, 'carregar notificações persistidas'); return []; }
    }

    function _restaurarNotificacoes() {
        notificacoes = _carregarNotificacoesPersistidas();
        if (window.AppRDO) window.AppRDO.notificacoes = notificacoes;
        _persistirNotificacoes();
        _atualizarBadge();
        _renderizarLista();
    }

    function _escutarEventos() {
        if (eventosRegistrados) return;
        if (!window.EventBus) { setTimeout(_escutarEventos, 300); return; }
        eventosRegistrados = true;

        window.EventBus.on('pedido:statusAtualizado', function (data) {
            var status = (data.status || '').toUpperCase();
            var pedidoId = data.pedidoId || data.id;
            var tipo = '';

            if (status.includes('CONCLUIDO') || status.includes('CONCLUÍDO')) { tipo = 'CONCLUÍDO'; _tocarSomConcluido(); }
            else if (status.includes('CANCELADO')) { tipo = 'CANCELADO'; _tocarSomCancelado(); }
            else if (status.includes('EM_ROTA') || status.includes('EM ROTA')) tipo = 'EM ROTA';
            else if (status.includes('PENDENTE')) tipo = 'PENDENTE';
            else if (status.includes('PREPARANDO')) tipo = 'PREPARANDO';
            else tipo = status;

            if (tipo) {
                _adicionarNotificacao({ pedidoId: pedidoId, tipo: tipo, timestamp: new Date(), variant: _getVariant(tipo) });
            }
        });

        window.EventBus.on('pedido:excluido', function (data) {
            _tocarSomExcluido();
            _adicionarNotificacao({ pedidoId: data.pedidoId || data.id, tipo: 'EXCLUÍDO', timestamp: new Date(), variant: 'danger' });
        });

        window.EventBus.on('pedido:adicionado', function (data) {
            _tocarSomCriado();
            _adicionarNotificacao({ pedidoId: data.pedidoId || data.id, tipo: 'CRIADO', timestamp: new Date(), variant: 'success' });
        });
    }

    function _getVariant(tipo) {
        switch (tipo) {
            case 'CONCLUÍDO':
            case 'CRIADO': return 'success';
            case 'CANCELADO':
            case 'EXCLUÍDO': return 'danger';
            case 'EM ROTA':
            case 'PREPARANDO': return 'primary';
            case 'PENDENTE': return 'warning';
            default: return 'info';
        }
    }

    function _adicionarNotificacao(dados) {
        var notif = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            pedidoId: dados.pedidoId,
            tipo: dados.tipo,
            timestamp: dados.timestamp.toISOString(),
            variant: dados.variant || 'info',
            lida: false
        };
        notificacoes.unshift(notif);
        notificacoes = _ordenarPorTimestampDesc(notificacoes);
        if (notificacoes.length > maxNotificacoes) notificacoes = notificacoes.slice(0, maxNotificacoes);
        if (window.AppRDO) window.AppRDO.notificacoes = notificacoes;
        _persistirNotificacoes();
        _atualizarBadge();
        _renderizarLista();
    }

    function _atualizarBadge() {
        var badge = document.getElementById('notif-badge');
        if (!badge) return;
        var naoLidas = notificacoes.filter(function (n) { return !n.lida; }).length;
        if (naoLidas > 0) { badge.textContent = naoLidas > 99 ? '99+' : naoLidas; badge.classList.remove('d-none'); }
        else badge.classList.add('d-none');
    }

    function _renderizarLista() {
        var listaEl = document.getElementById('notifications-list');
        if (!listaEl) return;

        var visiveis = notificacoes.filter(function (n) { return _dentroDeVinteQuatroHoras(n.timestamp); });

        if (visiveis.length === 0) {
            listaEl.innerHTML = '<div class="p-4 text-center text-muted"><i class="bi bi-bell-slash me-2"></i><small>Nenhuma notificação</small></div>';
            return;
        }

        listaEl.innerHTML = visiveis.map(function (n) {
            var icone = _getIcone(n.tipo);
            var tempo = _formatarTempo(n.timestamp);
            var classeNaoLida = n.lida ? '' : 'bg-light';
            return '<div class="notif-item ' + classeNaoLida + '" data-nid="' + n.id + '" onclick="window.NotificationManager.marcarLida(\'' + n.id + '\'); window.NotificationManager.irParaPedido(\'' + n.pedidoId + '\');">' +
                '<div class="d-flex align-items-start gap-2">' + icone +
                '<div class="flex-grow-1">' +
                '<div class="d-flex justify-content-between align-items-start">' +
                '<span class="fw-semibold" style="font-size:0.75rem;">Pedido ' + _formatarIdPedido(n.pedidoId) + '</span>' +
                '<span class="text-muted" style="font-size:0.68rem;">' + tempo + '</span>' +
                '</div>' +
                '<div class="text-muted" style="font-size:0.68rem;font-weight:300;">Status: <b style="font-weight:500;">' + n.tipo + '</b></div>' +
                '</div></div></div>';
        }).join('');
    }

    function _getIcone(tipo) {
        switch (tipo) {
            case 'CONCLUÍDO': return '<i class="bi bi-check-circle-fill text-success" style="font-size:1rem;"></i>';
            case 'CANCELADO':
            case 'EXCLUÍDO': return '<i class="bi bi-x-circle-fill text-danger" style="font-size:1rem;"></i>';
            case 'EM ROTA': return '<i class="bi bi-bicycle text-primary" style="font-size:1rem;"></i>';
            case 'CRIADO': return '<i class="bi bi-plus-circle-fill text-success" style="font-size:1rem;"></i>';
            case 'PENDENTE': return '<i class="bi bi-clock-fill text-warning" style="font-size:1rem;"></i>';
            case 'PREPARANDO': return '<i class="bi bi-hourglass-split text-primary" style="font-size:1rem;"></i>';
            default: return '<i class="bi bi-bell-fill text-info" style="font-size:1rem;"></i>';
        }
    }

    function _formatarTempo(timestamp) {
        var data = new Date(timestamp);
        var horas = data.getHours().toString().padStart(2, '0');
        var minutos = data.getMinutes().toString().padStart(2, '0');
        return horas + ':' + minutos;
    }

    function _formatarIdPedido(id) {
        if (typeof window._formatarNomeServico === 'function') return window._formatarNomeServico(id);
        return id;
    }

    function _marcarLida(notifId) {
        var notif = notificacoes.find(function (n) { return n.id === notifId; });
        if (notif) { notif.lida = true; _persistirNotificacoes(); _atualizarBadge(); _renderizarLista(); }
    }

    function _irParaPedido(pedidoId) {
        if (typeof window._destacarPedidoNoChat === 'function') window._destacarPedidoNoChat(pedidoId);
        _fecharDropdown();
    }

    function _marcarTodasComoLidas() {
        notificacoes.forEach(function (n) { n.lida = true; });
        _persistirNotificacoes();
        _atualizarBadge();
        _renderizarLista();
    }

    function _limparTodas() {
        notificacoes = [];
        if (window.AppRDO) window.AppRDO.notificacoes = [];
        try { localStorage.removeItem(CHAVE_NOTIF); } catch (e) { window._exibirErroGlobal(e, 'limpar notificações persistidas'); }
        _atualizarBadge();
        _renderizarLista();
    }

    function _getMenu() {
        return document.getElementById('notif-dropdown-menu');
    }

    function _getBtn() {
        return document.getElementById('btn-notifications');
    }

    function _posicionarDropdown() {
        var btn = _getBtn();
        var menu = _getMenu();
        if (!btn || !menu) return;

        var margem = 12;
        var rect = btn.getBoundingClientRect();
        var menuW = menu.offsetWidth || 340;
        var menuH = menu.offsetHeight || 480;
        var windowW = window.innerWidth;
        var windowH = window.innerHeight;

        var left = rect.right - menuW;
        if (left < margem) left = margem;
        if (left + menuW > windowW - margem) left = windowW - menuW - margem;

        var top = rect.bottom + 8;
        if (top + menuH > windowH - margem) {
            var topAcima = rect.top - menuH - 8;
            top = topAcima > margem ? topAcima : margem;
        }

        menu.style.position = 'fixed';
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
        menu.style.right = 'auto';
        menu.style.bottom = 'auto';
    }

    function _abrirDropdown() {
        var menu = _getMenu();
        if (!menu) return;
        if (window.PedidosDropdown && typeof window.PedidosDropdown.close === 'function') window.PedidosDropdown.close();
        _fecharPainelSom();
        _renderizarLista();
        menu.style.display = 'flex';
        menu.style.flexDirection = 'column';
        _posicionarDropdown();
        requestAnimationFrame(function () { menu.classList.add('show'); });
        isAberto = true;
        window.addEventListener('resize', _posicionarDropdown);
        window.addEventListener('scroll', _posicionarDropdown, true);
    }

    function _fecharDropdown() {
        var menu = _getMenu();
        if (!menu) return;
        menu.classList.remove('show');
        setTimeout(function () {
            if (!menu.classList.contains('show')) menu.style.display = 'none';
        }, 180);
        isAberto = false;
        window.removeEventListener('resize', _posicionarDropdown);
        window.removeEventListener('scroll', _posicionarDropdown, true);
    }

    function _toggleDropdown() {
        if (isAberto) _fecharDropdown();
        else _abrirDropdown();
    }

    var somPainelAberto = false;

    function _criarBotaoSom() {
        if (document.getElementById('btn-sound-settings')) return;

        var btnNotif = document.querySelector('.btn-notifications');
        if (!btnNotif || !btnNotif.parentElement) {
            setTimeout(_criarBotaoSom, 300);
            return;
        }

        var pai = btnNotif.parentElement;
        pai.style.display = 'flex';
        pai.style.alignItems = 'center';

        var btn = document.createElement('button');
        btn.id = 'btn-sound-settings';
        btn.className = 'btn-notifications btn-sound-toggle';
        btn.title = 'Configurar sons de notificação';
        btn.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
        pai.insertBefore(btn, btnNotif);

        var painel = document.createElement('div');
        painel.id = 'painel-sound-settings';
        painel.className = 'painel-sound-settings';
        document.body.appendChild(painel);

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (window.PedidosDropdown && typeof window.PedidosDropdown.close === 'function') window.PedidosDropdown.close();
            _fecharDropdown();
            somPainelAberto ? _fecharPainelSom() : _abrirPainelSom(btn);
        });

        aplicarEstadoMute(window._storageComExpiracao.get('rdo_notif_muted', false) === true);
    }

    function aplicarEstadoMute(muted) {
        var bellBtn = document.getElementById('btn-notifications');
        var icon = document.getElementById('icon-notifications');
        var btnMute = document.getElementById('btn-mute-notif');
        if (!bellBtn || !icon) return;

        bellBtn.setAttribute('data-muted', String(muted));
        bellBtn.classList.toggle('is-muted', muted);

        icon.classList.remove('bi-bell-fill', 'bi-bell-slash-fill');
        icon.classList.add(muted ? 'bi-bell-slash-fill' : 'bi-bell-fill');

        if (btnMute) {
            btnMute.innerHTML = muted
                ? '<i class="bi bi-bell-fill me-1"></i>Ativar'
                : '<i class="bi bi-bell-slash me-1"></i>Silenciar';
        }
    }

    window._aplicarEstadoMuteNotif = aplicarEstadoMute;

    function _abrirPainelSom(btn) {
        var painel = document.getElementById('painel-sound-settings');
        if (!painel) return;
        var rect = btn.getBoundingClientRect();
        painel.style.top = (rect.bottom + 8) + 'px';
        var left = rect.left;
        var maxLeft = window.innerWidth - 236;
        if (left > maxLeft) left = maxLeft;
        if (left < 8) left = 8;
        painel.style.left = left + 'px';
        painel.style.display = 'block';
        somPainelAberto = true;
        _renderizarPainelSom();

        window.addEventListener('resize', function _reposiciona() {
            if (!somPainelAberto) { window.removeEventListener('resize', _reposiciona); return; }
            _abrirPainelSom(btn);
        });
    }

    function _fecharPainelSom() {
        var painel = document.getElementById('painel-sound-settings');
        if (!painel) return;
        painel.style.display = 'none';
        somPainelAberto = false;
    }

    function _renderizarPainelSom() {
        var painel = document.getElementById('painel-sound-settings');
        if (!painel) return;

        var itens = [
            { tipo: 'criado', label: 'Pedido Lançado', icone: 'bi-plus-circle-fill', cor: '#28a745' },
            { tipo: 'cancelado', label: 'Pedido Cancelado', icone: 'bi-x-circle-fill', cor: '#dc3545' },
            { tipo: 'concluido', label: 'Pedido Concluído', icone: 'bi-check-circle-fill', cor: '#ffc107' }
        ];

        painel.innerHTML =
            '<div class="sound-panel-title">🔔 Sons de Notificação</div>' +
            itens.map(function (item) {
                var mutado = _somEstaMutado(item.tipo);
                return '<div class="sound-item" onclick="window.NotificationManager.alternarMudo(\'' + item.tipo + '\')">' +
                    '<span><i class="bi ' + item.icone + ' me-2" style="color:' + item.cor + ';"></i>' + item.label + '</span>' +
                    '<i class="bi ' + (mutado ? 'bi-volume-mute-fill' : 'bi-volume-up-fill sound-active') + '"></i>' +
                    '</div>';
            }).join('');
    }

    var _configurado = false;

    function _configurar() {
        if (_configurado) return;

        var btnSino = _getBtn();
        if (!btnSino) {
            setTimeout(_configurar, 300); // tenta de novo, ainda não marcou como configurado
            return;
        }

        _configurado = true;

        btnSino.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            _toggleDropdown();
        });

        document.addEventListener('click', function (e) {
            var menu = _getMenu();
            if (!menu || !isAberto) return;
            if (!menu.contains(e.target) && e.target !== btnSino && !btnSino.contains(e.target)) {
                _fecharDropdown();
            }
        });

        document.addEventListener('click', function (e) {
            var target = e.target.closest('#btn-mute-notif');
            if (!target) return;
            e.preventDefault();
            e.stopPropagation();
            var atual = window._storageComExpiracao.get('rdo_notif_muted', false) === true;
            var novo = !atual;
            window._storageComExpiracao.set('rdo_notif_muted', novo);
            aplicarEstadoMute(novo);
        });

        document.addEventListener('click', function (e) {
            if (e.target.closest('#btn-marcar-lidas')) { e.preventDefault(); _marcarTodasComoLidas(); }
            if (e.target.closest('#btn-limpar-notif')) { e.preventDefault(); _limparTodas(); }
        });
    }

    function _init() {
        _restaurarNotificacoes();
        _escutarEventos();
        _criarBotaoSom();
        _configurar();
        if (typeof window._aplicarEstadoMuteNotif === 'function') {
            window._aplicarEstadoMuteNotif(window._storageComExpiracao.get('rdo_notif_muted', false) === true);
        }
    }

    return {
        init: _init,
        marcarLida: _marcarLida,
        irParaPedido: _irParaPedido,
        abrirDropdown: _abrirDropdown,
        fecharDropdown: _fecharDropdown,
        close: _fecharDropdown,
        marcarTodasComoLidas: _marcarTodasComoLidas,
        limparNotificacoes: _limparTodas,
        tocarSomConcluido: _tocarSomConcluido,
        tocarSomCancelado: _tocarSomCancelado,
        tocarSomCriado: _tocarSomCriado,
        tocarSomExcluido: _tocarSomExcluido,
        alternarMudo: _alternarMudo,
        somEstaMutado: _somEstaMutado
    };
})();

function _atualizarHeaderCliente(nome, isOnline) {
    var nameEl = document.getElementById('chat-header-name');
    if (nameEl) nameEl.innerText = nome;

    var statusEl = document.getElementById('chat-header-status');
    if (statusEl) statusEl.textContent = isOnline ? 'Online' : 'Offline';

    if (window.AppRDO && window.AppRDO.clienteId) {
        var item = document.getElementById('item-contato-' + window.AppRDO.clienteId);
        if (item) {
            var dot = item.querySelector('.contact-status-dot');
            var label = item.querySelector('.contact-status');
            if (dot) dot.style.backgroundColor = isOnline ? '#28a745' : '#adb5bd';
            if (label) label.textContent = isOnline ? 'Online' : 'Offline';
        }
    }
}
window._atualizarHeaderCliente = _atualizarHeaderCliente;

window.addEventListener('masterStatusChanged', function (e) {
    var isOn = !!(e.detail && e.detail.isOn);
    window.AppRDO.isMasterOn = isOn;
    var clientes = window.AppRDO.clientesCache || [];
    window.renderizarLista(clientes, isOn);
    if (window.AppRDO.clienteId) {
        var cliente = clientes.find(function (c) {
            return String(c.id) === String(window.AppRDO.clienteId);
        });
        if (cliente) {
            _atualizarHeaderCliente(
                cliente.username || 'Sem nome',
                isOn && String(cliente.status || '').toUpperCase() === 'TRUE'
            );
        }
    }
});

window.addEventListener('clienteStatusChanged', function (e) {
    if (!e.detail) return;
    var clientes = e.detail.clientes || window.AppRDO.clientesCache || [];
    var isMasterOn = e.detail.isMasterOn;
    window.AppRDO.clientesCache = clientes;
    window.AppRDO.isMasterOn = isMasterOn;
    window.renderizarLista(clientes, isMasterOn);
});

function _limparBackdrop() {
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-y');
    document.body.style.removeProperty('padding-right');
}
window._limparBackdrop = _limparBackdrop;

function _limparModalContainer() {
    var container = document.getElementById('modal-container');
    if (!container) return;
    container.querySelectorAll('.modal').forEach(function (modalEl) {
        try { var inst = bootstrap.Modal.getInstance(modalEl); if (inst) inst.dispose(); } catch (e) { window._exibirErroGlobal(e, 'limpar modal'); }
    });
    container.innerHTML = '';
}

window.loadModal = function (arquivo) {
    return new Promise(function (resolve) {
        var container = document.getElementById('modal-container');
        if (!container) { resolve(false); return; }

        function _removerModaisOrfaosPorId(html) {
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            var idsNovos = Array.prototype.slice.call(tempDiv.querySelectorAll('.modal[id]'))
                .map(function (el) { return el.id; });

            idsNovos.forEach(function (id) {
                document.querySelectorAll('#' + id).forEach(function (modalEl) {
                    try {
                        var inst = bootstrap.Modal.getInstance(modalEl);
                        if (inst) { try { inst.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal órfão ' + id); } try { inst.dispose(); } catch (e) { window._exibirErroGlobal(e, 'liberar modal órfão ' + id); } }
                    } catch (e) { window._exibirErroGlobal(e, 'obter instância de modal órfão ' + id); }
                    try { modalEl.remove(); } catch (e) { window._exibirErroGlobal(e, 'remover modal órfão ' + id); }
                });
            });
        }

        function _abortarCalculosPendentes() {
            window.AppRDO._mapaModalAberto = false;
            window.AppRDO.isProcessingCheckout = false;
            window.AppRDO._checkoutToken = (window.AppRDO._checkoutToken || 0) + 1;
            if (window._leafletMapInstance) {
                try { window._leafletMapInstance.remove(); } catch (e) { window._exibirErroGlobal(e, 'remover mapa ao trocar de modal'); }
                window._leafletMapInstance = null;
            }
        }

        var abertos = Array.prototype.slice.call(document.querySelectorAll('.modal.show'));
        var pendentes = abertos.length;

        function _carregarHtml() {
            var base = window.location.pathname.replace(/\/[^/]*$/, '/');
            if (base.indexOf('/pages/') !== -1) base = base.substring(0, base.indexOf('/pages/') + 1);
            fetch(base + 'pages/chat/' + arquivo)
                .then(function (resp) {
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    return resp.text();
                })
                .then(function (html) {
                    _abortarCalculosPendentes();
                    _removerModaisOrfaosPorId(html);
                    _limparBackdrop();
                    _limparModalContainer();
                    container.innerHTML = html;
                    setTimeout(function () { resolve(true); }, 80);
                })
                .catch(function (e) { window._exibirErroGlobal(e, 'carregar modal ' + arquivo); resolve(false); });
        }

        if (pendentes === 0) { _carregarHtml(); return; }

        abertos.forEach(function (modalEl) {
            var inst = bootstrap.Modal.getInstance(modalEl);
            if (!inst) {
                try { modalEl.classList.remove('show'); modalEl.style.display = 'none'; } catch (e) { window._exibirErroGlobal(e, 'fechar modal'); }
                pendentes--;
                if (pendentes === 0) _carregarHtml();
                return;
            }
            modalEl.addEventListener('hidden.bs.modal', function () {
                try { inst.dispose(); } catch (e) { window._exibirErroGlobal(e, 'liberar modal'); }
                pendentes--;
                if (pendentes === 0) _carregarHtml();
            }, { once: true });
            try { inst.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal'); pendentes--; if (pendentes === 0) _carregarHtml(); }
        });
    });
};

function _inicializarListenersGlobaisChat() {
    if (window._chatListenersRegistrados) return;
    window._chatListenersRegistrados = true;

    document.addEventListener('input', function (e) {
        if (!e.target) return;
        if (e.target.id === 'p-contato') {
            var val = e.target.value.replace(/\D/g, '');
            e.target.value = typeof window.formatarTelefone === 'function'
                ? window.formatarTelefone(val) : val;
        }
        if (e.target.id === 'chat-search') window.filtrarContatos();
        if (e.target.closest && e.target.closest('#modalFormulario')) {
            e.target.style.border = '';
            e.target.style.boxShadow = '';
        }
        if (e.target.id === 'msg-input') {
            e.target.style.border = '';
            e.target.style.boxShadow = '';
            e.target.setAttribute('placeholder', 'Digite o pedido...');
        }
    });

    document.addEventListener('change', function (e) {
        if (!e.target) return;
        if (e.target.closest && e.target.closest('#modalFormulario')) {
            e.target.style.border = '';
            e.target.style.boxShadow = '';
            if (typeof window.calcularTudo === 'function') window.calcularTudo();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (!e.target || e.target.id !== 'msg-input') return;
        if (e.isComposing) return;

        if (e.key === 'Enter') {
            // Nunca envia com Enter — sempre quebra linha (edição livre).
            e.preventDefault();
            e.stopPropagation();

            var el = e.target;
            var inicio = el.selectionStart;
            var fim = el.selectionEnd;
            var valorAtual = el.value;

            el.value = valorAtual.slice(0, inicio) + '\n' + valorAtual.slice(fim);

            var novaPosicao = inicio + 1;
            el.selectionStart = el.selectionEnd = novaPosicao;

            // Dispara o evento 'input' manualmente para acionar
            // auto-expansão da caixa e outros listeners dependentes.
            el.dispatchEvent(new Event('input', { bubbles: true }));

            // Garante que a área visível role até o cursor/nova linha.
            el.scrollTop = el.scrollHeight;
        }
    }, true);

    document.addEventListener('keypress', function (e) {
        if (!e.target || e.target.id !== 'msg-input') return;
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    document.addEventListener('click', function (e) {
        if (!e.target || !e.target.closest || !e.target.closest('#btn-sync-chat')) return;
        if (window.AppRDO && window.AppRDO.isFetching) return;
        if (typeof window.carregarDados === 'function') window.carregarDados();
    });
}

_inicializarListenersGlobaisChat();

window.PedidosDropdown = (function () {
    var pedidosAtuais = [];
    var btn = null;
    var painel = null;
    var inputBusca = null;
    var listaItens = null;
    var _inicializado = false;

    function abrir() {
        if (!btn || !painel || !inputBusca) return;
        if (window.NotificationManager && typeof window.NotificationManager.close === 'function') {
            window.NotificationManager.close();
        }
        posicionarPainel();
        painel.style.display = 'flex';
        requestAnimationFrame(function () { painel.classList.add('show'); });
        inputBusca.value = '';
        inputBusca.focus();
        renderizarLista(pedidosAtuais);
        document.addEventListener('click', fecharAoClicarFora, true);
    }

    function fechar() {
        if (!painel) return;
        painel.classList.remove('show');
        setTimeout(function () {
            if (!painel.classList.contains('show')) painel.style.display = 'none';
        }, 180);
        document.removeEventListener('click', fecharAoClicarFora, true);
    }

    function fecharAoClicarFora(e) {
        if (!painel || !btn) return;
        if (!painel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) fechar();
    }

    function posicionarPainel() {
        if (!btn || !painel) return;
        var rect = btn.getBoundingClientRect();
        var larguraPainel = 320;
        var left = rect.right - larguraPainel;
        if (left < 8) left = 8;
        painel.style.position = 'fixed';
        painel.style.top = (rect.bottom + 6) + 'px';
        painel.style.left = left + 'px';
        painel.style.right = 'auto';
    }

    function renderizarLista(pedidos) {
        if (!listaItens) return;
        if (!pedidos || pedidos.length === 0) {
            listaItens.innerHTML = '<div class="px-3 py-3 text-muted text-center"><small>Nenhum pedido encontrado</small></div>';
            return;
        }

        listaItens.innerHTML = pedidos.map(function (p) {
            var idExibicao = p.idFormatado || p.id;
            return '<div class="pedido-item" data-pedido-id="' + p.id + '">' +
                '<div class="pedido-item-info">' +
                '<span class="pedido-item-id">' + idExibicao + '</span>' +
                '<span class="pedido-item-rota">' + (p.resumo || '') + '</span>' +
                '</div></div>';
        }).join('');

        listaItens.querySelectorAll('.pedido-item').forEach(function (el) {
            el.addEventListener('click', function () {
                var id = el.getAttribute('data-pedido-id');
                irParaPedidoNoChat(id);
                fechar();
            });
        });
    }

    function filtrar(termo) {
        termo = (termo || '').trim().toLowerCase();
        if (!termo) { renderizarLista(pedidosAtuais); return; }
        var filtrados = pedidosAtuais.filter(function (p) {
            var idFmt = (p.idFormatado || '').toLowerCase();
            var idBruto = String(p.id).toLowerCase();
            return idFmt.includes(termo) || idBruto.includes(termo);
        });
        renderizarLista(filtrados);
    }

    function irParaPedidoNoChat(id) {
        var msgEl = document.querySelector('#chat-messages-container [data-pedido-id="' + id + '"]');
        if (!msgEl) return;
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var wrapper = msgEl.closest('.message-wrapper') || msgEl;
        wrapper.classList.add('pedido-highlight');
        setTimeout(function () { wrapper.classList.remove('pedido-highlight'); }, 1600);
    }

    function setPedidos(lista) {
        pedidosAtuais = lista || [];
        if (painel && painel.classList.contains('show')) renderizarLista(pedidosAtuais);
    }

    function init() {
        if (_inicializado) return;

        btn = document.getElementById('btn-dropdown-pedidos');
        painel = document.getElementById('dropdown-pedidos-lista');
        inputBusca = document.getElementById('busca-pedido-id');
        listaItens = document.getElementById('lista-pedidos-itens');

        if (!btn || !painel || !inputBusca) return;

        _inicializado = true;

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var aberto = painel.classList.contains('show');
            aberto ? fechar() : abrir();
        });
        inputBusca.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();

            var termo = (inputBusca.value || '').trim().toLowerCase();
            if (!termo) return;

            var encontrado = pedidosAtuais.find(function (p) {
                var idFmt = (p.idFormatado || '').toLowerCase();
                var idBruto = String(p.id).toLowerCase();
                return idFmt === termo || idBruto === termo || idFmt.includes(termo) || idBruto.includes(termo);
            });

            if (encontrado) {
                irParaPedidoNoChat(encontrado.id);
                fechar();
            } else {
                inputBusca.style.border = '2px solid #dc3545';
                inputBusca.style.boxShadow = '0 0 0 0.2rem rgba(220,53,69,.25)';
                setTimeout(function () {
                    inputBusca.style.border = '';
                    inputBusca.style.boxShadow = '';
                }, 1500);
            }
        });
    }

    return { init: init, setPedidos: setPedidos, abrir: abrir, fechar: fechar, close: fechar };
})();

window.PedidoSearch = (function () {
    var aberto = false;
    var inicializado = false;

    function _elWrapper() { return document.getElementById('wrapper-pesquisa-pedido'); }
    function _elDropdown() { return document.getElementById('pedido-search-dropdown'); }
    function _elInput() { return document.getElementById('pedido-search-input'); }
    function _elLista() { return document.getElementById('pedido-search-lista'); }
    function _elClose() { return document.getElementById('pedido-search-close'); }

    function _garantirListeners() {
        if (inicializado) return;

        var wrapper = _elWrapper();
        var dropdown = _elDropdown();
        var input = _elInput();
        var closeBtn = _elClose();

        if (!wrapper || !dropdown || !input) {
            // Elementos ainda não existem no DOM (ex: header não carregado). Tenta de novo depois.
            setTimeout(_garantirListeners, 300);
            return;
        }

        inicializado = true;

        if (closeBtn) closeBtn.addEventListener('click', fechar);

        input.addEventListener('input', function (e) {
            filtrar(e.target.value);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var primeiro = dropdown.querySelector('.pedido-search-item');
                if (primeiro) primeiro.click();
            }
            if (e.key === 'Escape') fechar();
        });

        document.addEventListener('click', function (e) {
            if (!aberto) return;
            var btn = document.getElementById('btn-pesquisar-pedido');
            if (!dropdown.contains(e.target) && e.target !== btn && (!btn || !btn.contains(e.target))) {
                fechar();
            }
        });
    }

    function obterPedidosDoCliente() {
        if (!window.AppRDO) return [];

        var clienteId = window.AppRDO.clienteId;
        if (!clienteId) return [];

        var pedidos = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];

        var pedidosDoCliente = pedidos.filter(function (p) {
            return String(p.id_cliente || '').trim() === String(clienteId).trim();
        });

        return pedidosDoCliente.map(function (p) {
            var id = String(p.id || '').trim();
            var idFormatado = typeof window._formatarNomeServico === 'function'
                ? window._formatarNomeServico(id)
                : ('#' + id);
            var resumo = (String(p.de || '').trim() && String(p.para || '').trim())
                ? p.de + ' → ' + p.para
                : (p.status || '');
            return { id: id, idFormatado: idFormatado, resumo: resumo };
        });
    }

    function renderizarLista(lista) {
        var box = _elLista();
        if (!box) return;

        if (!lista.length) {
            box.innerHTML = '<div class="pedido-search-vazio">Nenhum pedido encontrado</div>';
            return;
        }

        box.innerHTML = lista.map(function (p) {
            return '<div class="pedido-search-item" data-id="' + p.id + '">' +
                '<span class="pedido-search-idbadge">' + p.idFormatado + '</span>' +
                '<span class="pedido-search-resumo">' + (p.resumo || '') + '</span>' +
                '</div>';
        }).join('');

        Array.prototype.forEach.call(box.querySelectorAll('.pedido-search-item'), function (item) {
            item.addEventListener('click', function () {
                var id = item.getAttribute('data-id');
                irParaPedido(id);
                fechar();
            });
        });
    }

    function filtrar(termo) {
        termo = (termo || '').trim().toLowerCase();
        var todos = obterPedidosDoCliente();

        if (!termo) { renderizarLista(todos); return; }

        var filtrados = todos.filter(function (p) {
            var idFmt = (p.idFormatado || '').toLowerCase();
            var idBruto = String(p.id).toLowerCase();
            return idFmt.includes(termo) || idBruto.includes(termo);
        });

        renderizarLista(filtrados);
    }

    function irParaPedido(id) {
        var el = document.querySelector('[data-pedido-id="' + id + '"]');
        if (!el) {
            window.exibirModalValidacao && window.exibirModalValidacao('Pedido não encontrado no chat atual.');
            return;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var wrapper = el.closest('.message-wrapper') || el;
        wrapper.classList.add('pedido-highlight');
        setTimeout(function () { wrapper.classList.remove('pedido-highlight'); }, 1600);
    }

    function abrir() {
        if (!window.AppRDO || !window.AppRDO.clienteId) {
            window.exibirModalValidacao && window.exibirModalValidacao('Selecione um cliente na lista primeiro.');
            return;
        }

        _garantirListeners();

        var dropdown = _elDropdown();
        if (!dropdown) return;

        dropdown.classList.add('show');
        aberto = true;
        filtrar('');

        setTimeout(function () {
            var input = _elInput();
            if (input) { input.value = ''; input.focus(); }
        }, 50);
    }

    function fechar() {
        var dropdown = _elDropdown();
        if (dropdown) dropdown.classList.remove('show');
        aberto = false;
    }

    function toggle() {
        aberto ? fechar() : abrir();
    }

    _garantirListeners();

    return { abrir: abrir, fechar: fechar, toggle: toggle };
})();

window.MODELO_PADRAO = [
    'SOLICITANTE: ',
    'CONTATO: ',
    'HORÁRIO ESTIMADO P/ COLETA: ',
    'MERCADORIA: (Sacola, Coleta, Bolsa, Envelope)',
    '',
    'ROTA(s):',
    '📍1. De: Rua, Número, Bairro, Complemento | Para: Rua, Número, Bairro, Complemento',
    '📍2. De: Rua, Número, Bairro, Complemento | Para: Rua, Número, Bairro, Complemento',
    '📍3. De: Rua, Número, Bairro, Complemento | Para: Rua, Número, Bairro, Complemento',
    '',
    'RETORNO: (SIM/NÃO)',
    'PRIORIDADE: (Normal, Agendado, Urgente)',
    'OBSERVAÇÃO: '
].join('\n');

window.abrirModalMensagemPadrao = function (config) {
    config = config || {};

    function _gerarHtmlModeloDestacado(textoModelo) {
        var linhas = String(textoModelo || '').split('\n');
        var htmlLinhas = linhas.map(function (linha) {
            var linhaEscapada = linha
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            linhaEscapada = linhaEscapada.replace(
                /^(SOLICITANTE|CONTATO|ROTA\(s\))(\s*:)/i,
                '<strong style="color:#dc3545;font-weight:900;">$1$2</strong>'
            );

            return linhaEscapada;
        });
        return htmlLinhas.join('<br>');
    }

    function _gerarHtmlBlocoInfo() {
        return '<div id="modal-mensagem-info-wrapper">' +
            '<div class="d-flex align-items-start gap-2 mb-3" style="background-color:#eaf4ff;border:1px solid #cfe6ff;border-radius:.65rem;padding:.75rem 1rem;">' +
            '<i class="bi bi-info-circle-fill text-primary" style="font-size:1.15rem;margin-top:1px;"></i>' +
            '<div style="font-size:.82rem;color:#1c4e80;line-height:1.55;">' +
            'Para que a mensagem possa ser enviada, é importante preencher os campos obrigatórios: ' +
            '<strong>SOLICITANTE</strong>, <strong>CONTATO</strong> e <strong>ROTA(s)</strong>.<br>' +
            'Em <strong>ROTA(s)</strong>, informe <strong>Endereço, Número, Bairro e Complemento</strong> de origem e destino.' +
            '</div>' +
            '</div>' +
            '<div class="small text-muted mb-2" style="font-size:.75rem;">Segue o modelo da mensagem padrão:</div>' +
            '</div>';
    }

    function _montarEExibir() {
        var modalEl = document.getElementById('modalMensagemPadrao');
        if (!modalEl) return;

        if (modalEl.parentElement !== document.body) {
            document.body.appendChild(modalEl);
        }

        var existing = bootstrap.Modal.getInstance(modalEl);
        if (existing) {
            try { existing.dispose(); }
            catch (e) { window._exibirErroGlobal(e, 'liberar modal de mensagem padrão'); }
        }
        if (typeof _limparBackdrop === 'function') _limparBackdrop();

        var isErro = !!config.erro;
        var tituloEl = modalEl.querySelector('#modal-mensagem-titulo, .modal-title');
        var iconeEl = modalEl.querySelector('#modal-mensagem-icone');
        var textareaEl = modalEl.querySelector('#texto-modelo');
        var btnCopiar = modalEl.querySelector('#btn-copiar-modelo');
        var alertaErroEl = modalEl.querySelector('#modal-mensagem-erro-box');
        var infoWrapperExistente = modalEl.querySelector('#modal-mensagem-info-wrapper');

        if (isErro) {
            if (infoWrapperExistente) infoWrapperExistente.remove();

            if (tituloEl) tituloEl.textContent = config.titulo || 'Ocorreu um erro';
            if (iconeEl) iconeEl.className = 'bi ' + (config.icone || 'bi-exclamation-triangle-fill') + ' text-danger';
            if (textareaEl) {
                var wrapperTextarea = textareaEl.closest('.mb-3, .form-group');
                if (wrapperTextarea) wrapperTextarea.classList.add('d-none');
                else textareaEl.style.display = 'none';
            }
            var previewErro = modalEl.querySelector('#texto-modelo-preview');
            if (previewErro) previewErro.classList.add('d-none');
            if (btnCopiar) btnCopiar.classList.add('d-none');
            if (alertaErroEl) {
                alertaErroEl.classList.remove('d-none');
                alertaErroEl.innerHTML =
                    '<i class="bi bi-exclamation-circle-fill me-2"></i>' +
                    (config.erro || 'Algo deu errado. Tente novamente.');
            }
        } else {
            if (tituloEl) tituloEl.textContent = config.titulo || 'Mensagem Padrão';
            if (iconeEl) iconeEl.className = 'bi ' + (config.icone || 'bi-chat-left-text-fill') + ' text-secondary';

            var textoFinal = config.texto || window.MODELO_PADRAO || '';

            if (textareaEl) {
                var wrapperTextarea2 = textareaEl.closest('.mb-3, .form-group');
                if (wrapperTextarea2) wrapperTextarea2.classList.remove('d-none');
                else textareaEl.style.display = '';
                textareaEl.value = textoFinal;
                textareaEl.style.position = 'absolute';
                textareaEl.style.left = '-9999px';
                textareaEl.style.opacity = '0';
                textareaEl.style.height = '1px';
                textareaEl.style.pointerEvents = 'none';
            }

            if (infoWrapperExistente) {
                infoWrapperExistente.outerHTML = _gerarHtmlBlocoInfo();
            } else if (textareaEl) {
                textareaEl.insertAdjacentHTML('beforebegin', _gerarHtmlBlocoInfo());
            }

            var previewEl = modalEl.querySelector('#texto-modelo-preview');
            if (!previewEl && textareaEl) {
                previewEl = document.createElement('div');
                previewEl.id = 'texto-modelo-preview';
                previewEl.style.whiteSpace = 'pre-wrap';
                previewEl.style.fontFamily = 'inherit';
                previewEl.style.fontSize = '0.85rem';
                previewEl.style.lineHeight = '1.5';
                previewEl.style.background = '#f8f9fa';
                previewEl.style.border = '1px solid #dee2e6';
                previewEl.style.borderRadius = '.5rem';
                previewEl.style.padding = '.75rem 1rem';
                previewEl.style.maxHeight = '320px';
                previewEl.style.overflowY = 'auto';
                textareaEl.insertAdjacentElement('afterend', previewEl);
            }
            if (previewEl) {
                previewEl.classList.remove('d-none');
                previewEl.innerHTML = _gerarHtmlModeloDestacado(textoFinal);
            }

            if (btnCopiar) btnCopiar.classList.remove('d-none');
            if (alertaErroEl) alertaErroEl.classList.add('d-none');
        }

        modalEl.classList.add('modal-prioridade-maxima');

        var modal = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });

        modalEl.addEventListener('hide.bs.modal', function () {
            if (document.activeElement && modalEl.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        });

        modalEl.addEventListener('shown.bs.modal', function () {
            var backdrops = document.querySelectorAll('.modal-backdrop');
            var ultimoBackdrop = backdrops[backdrops.length - 1];
            if (ultimoBackdrop) ultimoBackdrop.classList.add('modal-prioridade-maxima');
        }, { once: true });

        modalEl.addEventListener('hidden.bs.modal', function () {
            if (typeof _limparBackdrop === 'function') _limparBackdrop();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            modalEl.classList.remove('modal-prioridade-maxima');
        }, { once: true });

        modal.show();
    }

    if (window.Swal && typeof Swal.isVisible === 'function' && Swal.isVisible()) {
        Swal.close();
        setTimeout(_montarEExibir, 300);
    } else {
        _montarEExibir();
    }
};

window.validarMensagemModelo = function (texto) {
    if (!texto || !texto.trim()) return { valido: false, tipo: 'vazio' };

    var matchS = texto.match(/(?:SOLICITANTE|NOME|CLIENTE)\s*:\s*(.+)/i);
    var temSolic = !!(matchS && matchS[1] && matchS[1].trim().length > 0);
    var matchC = texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE)\s*:\s*(.+)/i);
    var temContato = !!(matchC && matchC[1] && matchC[1].trim().length > 0);

    var quantRotas = 0;
    var rotasIncompletas = 0;
    texto.split('\n').forEach(function (linha) {
        linha = linha.trim();
        if (!/de\s*:/i.test(linha) || !/para\s*:/i.test(linha)) return;
        var vDe = linha.match(/de\s*:\s*([^|]+)/i);
        var vPara = linha.match(/para\s*:\s*(.+)/i);
        var deTexto = vDe && vDe[1] ? vDe[1].trim() : '';
        var paraTexto = vPara && vPara[1] ? vPara[1].trim() : '';
        var deValido = deTexto && deTexto !== '...' && deTexto.length > 0;
        var paraValido = paraTexto && paraTexto !== '...' && paraTexto.length > 0;
        if (deValido && paraValido) {
            quantRotas++;
            var deVirgulas = deTexto.split(',').length - 1;
            var paraVirgulas = paraTexto.split(',').length - 1;
            if (deVirgulas < 2 || paraVirgulas < 2) rotasIncompletas++;
        }
    });
    var temRota = quantRotas >= 1;

    if (temSolic && temContato && temRota && rotasIncompletas === 0) {
        return { valido: true, tipo: 'ok', rotas: quantRotas };
    }

    var faltando = [];
    if (!temSolic) faltando.push('SOLICITANTE');
    if (!temContato) faltando.push('CONTATO');
    if (!temRota) faltando.push('ROTA (De: Rua, Número, Bairro, Cidade | Para: Rua, Número, Bairro, Cidade)');
    if (temRota && rotasIncompletas > 0) faltando.push('Endereço incompleto: informe Rua, Número, Bairro e Cidade em cada rota');

    return { valido: false, tipo: 'modelo', camposPendentes: faltando };
};

window.iniciarFluxoCheckout = function () {
    if (window.AppRDO._mapaModalAberto) return;
    if (window.AppRDO.isProcessingCheckout) return;

    var msgInput = document.getElementById('msg-input');
    var texto = msgInput ? (msgInput.value || '').trim() : '';
    if (!texto) { window.marcarCampoInvalido(); return; }

    var validacao = window.validarMensagemModelo(texto);
    if (!validacao.valido) {
        var faltantes = validacao.camposPendentes ? validacao.camposPendentes.join(', ') : '';
        window.exibirModalValidacao(
            'Preencha corretamente o modelo antes de enviar.<br>Campos pendentes: <strong>' + faltantes + '</strong>',
            { titulo: 'Modelo incompleto', icone: 'bi-exclamation-triangle-fill', modelo: window.MODELO_PADRAO }
        );
        return;
    }

    var solicitante = ((texto.match(/(?:SOLICITANTE|NOME|CLIENTE):\s*(.*)/i) || [])[1] || 'Não informado').trim();
    var contato = ((texto.match(/(?:CONTATO|CONATO|TEL|TELEFONE):\s*([\d\s\-\(\)\+]+)/i) || [])[1] || '').trim();
    var horario = ((texto.match(/(?:HORÁRIO|HORARIO).*?:\s*([\d:]+)/i) || [])[1] || '').trim();
    var mercadoria = ((texto.match(/(?:MERCADORIA):\s*(.*)/i) || [])[1] || 'ENTREGA').trim().toUpperCase();
    var obs = ((texto.match(/(?:OBSERVAÇÃO|OBSERVACAO):\s*(.*)/i) || [])[1] || '').trim();
    var rotasExtraidas = window.extrairRotasDaMensagem(texto);

    if (rotasExtraidas.length === 0) {
        window.exibirModalValidacao(
            'Nenhuma rota encontrada.<br>Use o formato: <strong>De: Rua, Número, Bairro, Cidade | Para: Rua, Número, Bairro, Cidade</strong>',
            { titulo: 'Rota inválida', icone: 'bi-signpost-split-fill', modelo: window.MODELO_PADRAO }
        );
        return;
    }

    window.AppRDO._mapaModalAberto = true;
    window.AppRDO.isProcessingCheckout = true;

    function _falharAbertura(mensagem) {
        window.AppRDO._mapaModalAberto = false;
        window.AppRDO.isProcessingCheckout = false;
        try {
            Swal.fire({
                icon: 'error',
                title: 'Erro ao abrir mapa',
                html: '<div style="font-size:.9rem;">' + (mensagem || 'Não foi possível abrir o modal de rotas.') + '</div>',
                confirmButtonText: 'Fechar', confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
        } catch (_) { alert(mensagem || 'Erro ao abrir modal de rotas.'); }
    }

    window.loadModal('mapa_clientes.html').then(function (carregou) {
        try {
            if (!carregou) {
                _falharAbertura('Falha ao carregar o arquivo do modal de mapa (mapa_clientes.html).');
                return;
            }

            var meuTokenCheckout = window.AppRDO._checkoutToken;

            var modalEl = document.getElementById('modalMapa');
            if (!modalEl) {
                _falharAbertura('Elemento #modalMapa não encontrado após o carregamento do modal.');
                return;
            }

            if (modalEl.parentElement !== document.body) {
                document.body.appendChild(modalEl);
            }

            try {
                var existente = bootstrap.Modal.getInstance(modalEl);
                if (existente) existente.dispose();
            } catch (e) { window._exibirErroGlobal(e, 'liberar modal de mapa'); }
            if (typeof _limparBackdrop === 'function') _limparBackdrop();

            modalEl.addEventListener('hidden.bs.modal', function () {
                window.AppRDO._mapaModalAberto = false;
                window.AppRDO.isProcessingCheckout = false;
                if (window._leafletMapInstance) {
                    try { window._leafletMapInstance.remove(); } catch (e) { window._exibirErroGlobal(e, 'remover mapa ao fechar modal'); }
                    window._leafletMapInstance = null;
                }
            }, { once: true });

            modalEl.addEventListener('hidden.bs.modal', function () {
                if (typeof _limparBackdrop === 'function') _limparBackdrop();
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, { once: true });

            var modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

            modalEl.addEventListener('shown.bs.modal', function () {
                try {
                    modalEl.style.zIndex = '1075';
                    var backdrops = document.querySelectorAll('.modal-backdrop');
                    var ultimoBackdrop = backdrops[backdrops.length - 1];
                    if (ultimoBackdrop) ultimoBackdrop.style.zIndex = '1070';

                    var elSolicitante = document.getElementById('header-nome-solicitante');
                    var loaderEl = document.getElementById('mapa-loader');
                    if (elSolicitante) elSolicitante.innerText = solicitante;
                    if (loaderEl) {
                        loaderEl.style.display = '';
                        loaderEl.innerHTML = '<div class="spinner-border spinner-border-sm text-danger"></div><p class="text-muted small mb-0 mt-2">Calculando rotas...</p>';
                    }

                    var footer = document.getElementById('footer-resumo-dados');
                    if (footer) footer.innerHTML = '';

                    var kmTotal = 0, minTotal = 0, listaCaminhos = [];
                    var rotasComFalha = [];

                    function _coletarEnderecosUnicos(rotas) {
                        var mapa = {};
                        var lista = [];
                        rotas.forEach(function (rota) {
                            [rota.de, rota.para].forEach(function (end) {
                                var chave = String(end || '').trim().toLowerCase();
                                if (chave && !mapa[chave]) {
                                    mapa[chave] = true;
                                    lista.push(end);
                                }
                            });
                        });
                        return lista;
                    }

                    function _geocodificarTodosUnicos(rotas) {
                        var enderecosUnicos = _coletarEnderecosUnicos(rotas);
                        return Promise.all(
                            enderecosUnicos.map(function (end) {
                                return window.buscarCoordenadasEndereco(end).then(function (coords) {
                                    return { endereco: end, coords: coords };
                                });
                            })
                        ).then(function (resultados) {
                            var mapaCoords = {};
                            resultados.forEach(function (r) {
                                mapaCoords[String(r.endereco || '').trim().toLowerCase()] = r.coords;
                            });
                            return mapaCoords;
                        });
                    }

                    function _sanitizarCoord(valor) {
                        var num = parseFloat(String(valor).replace(',', '.'));
                        if (isNaN(num)) return null;

                        if (Math.abs(num) > 180) {
                            var str = String(Math.trunc(num));
                            var negativo = str.startsWith('-');
                            var digitos = negativo ? str.slice(1) : str;
                            var parteInteira = digitos.slice(0, 2);
                            var parteDecimal = digitos.slice(2);
                            num = parseFloat((negativo ? '-' : '') + parteInteira + '.' + parteDecimal);
                        }

                        return isNaN(num) ? null : num;
                    }

                    function _fetchComTimeout(url, ms) {
                        return fetch(url, { signal: AbortSignal.timeout(ms) });
                    }

                    var _filaOsrm = Promise.resolve();

                    function _enfileirarOsrm(fn) {
                        var resultado = _filaOsrm.then(function () {
                            return fn().then(function (r) {
                                return new Promise(function (resolve) {
                                    setTimeout(function () { resolve(r); }, 300);
                                });
                            });
                        });
                        _filaOsrm = resultado.catch(function () { return null; });
                        return resultado;
                    }

                    function _processarRota(rota, idx, mapaCoords) {
                        var p1raw = mapaCoords[String(rota.de || '').trim().toLowerCase()];
                        var p2raw = mapaCoords[String(rota.para || '').trim().toLowerCase()];

                        var p1 = p1raw ? { lat: _sanitizarCoord(p1raw.lat), lng: _sanitizarCoord(p1raw.lng) } : null;
                        var p2 = p2raw ? { lat: _sanitizarCoord(p2raw.lat), lng: _sanitizarCoord(p2raw.lng) } : null;

                        if (!p1 || p1.lat === null || p1.lng === null) {
                            rotasComFalha.push({ indice: idx + 1, endereco: rota.de, motivo: (p1raw && p1raw.erro) || 'Endereço de origem não localizado ou coordenadas inválidas.' });
                            return Promise.resolve();
                        }
                        if (!p2 || p2.lat === null || p2.lng === null) {
                            rotasComFalha.push({ indice: idx + 1, endereco: rota.para, motivo: (p2raw && p2raw.erro) || 'Endereço de destino não localizado ou coordenadas inválidas.' });
                            return Promise.resolve();
                        }

                        return _enfileirarOsrm(function () {
                            return _fetchComTimeout(
                                'https://router.project-osrm.org/route/v1/driving/' +
                                p1.lng.toFixed(6) + ',' + p1.lat.toFixed(6) + ';' + p2.lng.toFixed(6) + ',' + p2.lat.toFixed(6) +
                                '?overview=full&geometries=geojson',
                                6000
                            );
                        })
                            .then(function (resp) {
                                if (!resp || !resp.ok) {
                                    return (resp ? resp.json().catch(function () { return null; }) : Promise.resolve(null)).then(function (body) {
                                        console.error('[OSRM DEBUG] Rota ' + (idx + 1) + ' falhou.', {
                                            origem: rota.de,
                                            destino: rota.para,
                                            p1: p1,
                                            p2: p2,
                                            status: resp ? resp.status : '?',
                                            body: body
                                        });
                                        var motivo = (body && body.code === 'NoRoute')
                                            ? 'Nenhuma rota rodoviária encontrada (coordenadas podem estar incorretas).'
                                            : 'HTTP ' + (resp ? resp.status : '?') + ' ao calcular rota ' + (idx + 1);
                                        throw new Error(motivo);
                                    });
                                }
                                return resp.json();
                            })
                            .then(function (data) {
                                if (data && data.routes && data.routes[0]) {
                                    kmTotal += data.routes[0].distance / 1000;
                                    minTotal += data.routes[0].duration / 60;
                                    listaCaminhos.push(data.routes[0].geometry.coordinates.map(function (c) { return [c[1], c[0]]; }));
                                } else {
                                    rotasComFalha.push({ indice: idx + 1, endereco: rota.de + ' → ' + rota.para, motivo: 'Rota não encontrada pelo serviço de mapas.' });
                                }
                            })
                            .catch(function (e) {
                                window._exibirErroGlobal(e, 'calcular rota ' + (idx + 1));
                                rotasComFalha.push({ indice: idx + 1, endereco: rota.de + ' → ' + rota.para, motivo: e.message || 'Erro ao calcular rota.' });
                            });
                    }

                    _geocodificarTodosUnicos(rotasExtraidas)
                        .then(function (mapaCoords) {
                            return Promise.all(rotasExtraidas.map(function (rota, idx) {
                                return _processarRota(rota, idx, mapaCoords);
                            }));
                        })
                        .then(function () {
                            if (meuTokenCheckout !== window.AppRDO._checkoutToken) return;

                            if (listaCaminhos.length === 0) {
                                var motivoPrincipal = (rotasComFalha[0] && rotasComFalha[0].motivo) || 'Verifique se a Rua, Número, Bairro e Cidade estão corretos.';
                                if (loaderEl) {
                                    loaderEl.style.display = '';
                                    loaderEl.innerHTML = '<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>' + motivoPrincipal + '</p>';
                                }
                                window.AppRDO.isProcessingCheckout = false;
                                return;
                            }

                            var kmArredondado = Math.round(kmTotal);
                            var valorCalculado = kmArredondado * 3.00;

                            window.dadosPedidoAtual = {
                                solicitante: solicitante,
                                contato: contato,
                                horario: horario,
                                mercadoria: mercadoria,
                                obs: obs,
                                cliente: (window.AppRDO ? window.AppRDO.clienteSelecionado : null) || localStorage.getItem('clienteSelecionadoNome') || 'N/A',
                                distanciaTotal: kmArredondado,
                                tempoTotal: Math.round(minTotal),
                                coordenadas: listaCaminhos,
                                valorEstimado: valorCalculado,
                                rotasProcessadas: rotasExtraidas,
                                rawInput: texto
                            };

                            if (loaderEl) loaderEl.style.display = 'none';

                            window._renderizarResumo(
                                kmArredondado, minTotal,
                                valorCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            );
                            window.renderizarMapaUnificado();
                            window.AppRDO.isProcessingCheckout = false;

                            if (rotasComFalha.length > 0) {
                                var listaErros = rotasComFalha.map(function (f) {
                                    return '• Rota ' + f.indice + ' (<strong>' + (f.endereco || 'endereço') + '</strong>): ' + f.motivo;
                                }).join('<br>');

                                Swal.fire({
                                    icon: 'warning',
                                    title: 'Não foi possível geolocalizar algumas rotas',
                                    html: '<div style="font-size:.85rem;text-align:left;">' + listaErros + '</div><hr>O valor exibido considera apenas as rotas encontradas.',
                                    confirmButtonColor: '#dc3545'
                                });
                            }
                        })
                        .catch(function (e) {
                            if (meuTokenCheckout !== window.AppRDO._checkoutToken) return;

                            window._exibirErroGlobal(e, 'calcular rotas do pedido');
                            window.AppRDO.isProcessingCheckout = false;
                            if (loaderEl) {
                                loaderEl.style.display = '';
                                loaderEl.innerHTML = '<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Erro ao calcular rotas.</p>';
                            }
                            var footerErro = document.getElementById('footer-resumo-dados');
                            if (footerErro) footerErro.innerHTML = '<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Erro ao calcular rotas</span>';
                            try {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Erro ao calcular rotas',
                                    html: '<div style="font-size:.9rem;">' + (e.message || 'Tente novamente.') + '</div>',
                                    confirmButtonText: 'Fechar', confirmButtonColor: '#dc3545',
                                    customClass: { popup: 'rounded-4' }
                                });
                            } catch (_) { }
                        });
                } catch (eShown) {
                    window._exibirErroGlobal(eShown, 'preparar exibição do modal de mapa');
                    window.AppRDO.isProcessingCheckout = false;
                    try {
                        Swal.fire({
                            icon: 'error',
                            title: 'Erro inesperado',
                            html: '<div style="font-size:.9rem;">' + (eShown.message || 'Falha ao preparar o modal de mapa.') + '</div>',
                            confirmButtonText: 'Fechar', confirmButtonColor: '#dc3545',
                            customClass: { popup: 'rounded-4' }
                        });
                    } catch (_) { }
                }
            }, { once: true });

            modal.show();
        } catch (eCarregou) {
            window._exibirErroGlobal(eCarregou, 'processar carregamento do modal de mapa');
            _falharAbertura(eCarregou.message || 'Erro inesperado ao processar o modal.');
        }
    }).catch(function (eLoad) {
        window._exibirErroGlobal(eLoad, 'carregar modal de mapa (Promise rejeitada)');
        _falharAbertura(eLoad.message || 'Falha inesperada ao carregar o modal de mapa.');
    });
};

window.validarClienteOnline = function () {
    if (!window.AppRDO || !window.AppRDO.clienteId) return false;
    var cliente = window.AppRDO.clientesCache.find(function (c) {
        return String(c.id) === String(window.AppRDO.clienteId);
    });
    if (!cliente) return false;
    return window.AppRDO.isMasterOn && String(cliente.status || '').toUpperCase() === 'TRUE';
};

window.exibirModalValidacao = function (mensagem, opcoes) {
    opcoes = opcoes || {};
    var modalEl = document.getElementById('modalValidacao');
    if (!modalEl) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: opcoes.icone === 'bi-check-circle-fill' ? 'success' : 'warning',
                title: opcoes.titulo || 'Atenção',
                html: mensagem,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Entendi'
            });
        } else { alert(mensagem.replace(/<[^>]*>/g, '')); }
        return;
    }

    var msgEl = document.getElementById('modal-validacao-mensagem');
    var iconeEl = document.getElementById('modal-validacao-icone');
    var tituloEl = document.getElementById('modal-validacao-titulo');

    if (msgEl) msgEl.innerHTML = mensagem;
    if (iconeEl) iconeEl.className = 'bi ' + (opcoes.icone || 'bi-exclamation-triangle-fill') + ' text-warning fs-4';
    if (tituloEl) tituloEl.innerText = opcoes.titulo || 'Atenção';

    var modeloContainer = document.getElementById('modal-validacao-modelo');
    var textareaEl = document.getElementById('modal-validacao-textarea');
    if (opcoes.modelo && modeloContainer && textareaEl) {
        textareaEl.value = opcoes.modelo;
        modeloContainer.classList.remove('d-none');
    } else if (modeloContainer) {
        modeloContainer.classList.add('d-none');
    }

    document.querySelectorAll('#modal-container .modal.show').forEach(function (m) {
        var inst = bootstrap.Modal.getInstance(m);
        if (inst) { try { inst.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de validação'); } }
    });

    try {
        var instExist = bootstrap.Modal.getInstance(modalEl);
        if (instExist) { try { instExist.dispose(); } catch (e) { window._exibirErroGlobal(e, 'liberar modal de validação'); } }
        var jaAberto = document.querySelectorAll('#modal-container .modal.show').length > 0;
        setTimeout(function () { _limparBackdrop(); new bootstrap.Modal(modalEl).show(); }, jaAberto ? 350 : 0);
    } catch (e) {
        window._exibirErroGlobal(e, 'exibir modal de validação');
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', title: 'Atenção', html: mensagem, confirmButtonColor: '#dc3545' });
        } else { alert(mensagem.replace(/<[^>]*>/g, '')); }
    }
};

window.filtrarContatos = function () {
    clearTimeout(window.AppRDO.debounceTimer);
    window.AppRDO.debounceTimer = setTimeout(function () {
        var searchEl = document.getElementById('chat-search');
        var termo = (searchEl ? searchEl.value : '').toLowerCase().trim();
        document.querySelectorAll('.contact-item-clean').forEach(function (item) {
            var nameEl = item.querySelector('.contact-name');
            var nome = (nameEl ? nameEl.innerText : '').toLowerCase();
            item.style.setProperty('display', nome.includes(termo) ? 'flex' : 'none', 'important');
        });
    }, 300);
};

function _mostrarLoadingContatos() {
    var listEl = document.getElementById('lista-contatos-chat');
    if (!listEl) return;
    listEl.innerHTML =
        '<div class="text-center text-muted py-4">' +
        '<div class="spinner-border spinner-border-sm text-danger opacity-50"></div>' +
        '<div class="mt-2 chat-loading-text">Buscando clientes<span class="chat-dots"></span></div>' +
        '</div>';
}

function _mostrarLoadingMensagens() {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML =
        '<div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">' +
        '<div class="spinner-border spinner-border-sm text-danger opacity-50"></div>' +
        '<div class="mt-2 chat-loading-text">Buscando mensagens<span class="chat-dots"></span></div>' +
        '</div>';
}

function _mostrarChatEmptyState(texto) {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML = '<div class="chat-empty-state"><div class="chat-empty-label">' + texto + '</div></div>';
}

function _mostrarContatosEmptyState(texto) {
    var listEl = document.getElementById('lista-contatos-chat');
    if (!listEl) return;
    listEl.innerHTML = '<div class="chat-empty-state"><div class="chat-empty-label">' + texto + '</div></div>';
}

function _spinChatOn() {
    var btn = document.getElementById('btn-sync-chat');
    var icon = document.getElementById('sync-icon-header');
    if (btn) { btn.classList.add('syncing'); btn.disabled = true; }
    if (icon) icon.classList.add('spinner-rotate');
}

function _spinChatOff() {
    var btn = document.getElementById('btn-sync-chat');
    var icon = document.getElementById('sync-icon-header');
    if (btn) { btn.classList.remove('syncing'); btn.disabled = false; }
    if (icon) icon.classList.remove('spinner-rotate');
}

function _parseMoedaSeguro(valor) {
    if (valor === null || valor === undefined || valor === '') return 0;
    var n = Number(valor);
    if (!isNaN(n)) return n;
    var str = String(valor).trim().replace(/R\$\s*/gi, '');
    var temVirgula = str.includes(',');
    var temPonto = str.includes('.');
    if (temVirgula && temPonto) {
        var iPonto = str.lastIndexOf('.');
        var iVirgula = str.lastIndexOf(',');
        str = iVirgula > iPonto
            ? str.replace(/\./g, '').replace(',', '.')
            : str.replace(/,/g, '');
    } else if (temVirgula) {
        str = str.replace(',', '.');
    }
    var num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

window._parseMoedaSeguro = _parseMoedaSeguro;

function _formatarNomeServico(idBruto) {
    if (!idBruto) return 'N/D';
    var s = String(idBruto).trim();
    if (s === '[ID_GERADO]') return s;
    if (s.toUpperCase().startsWith('RDO')) return s.toUpperCase();
    var num = parseInt(s, 10);
    if (!isNaN(num)) return 'RDO' + (num < 1000 ? String(num).padStart(3, '0') : String(num));
    return 'RDO' + s;
}

window._formatarNomeServico = _formatarNomeServico;

window._formatarNomeServico = _formatarNomeServico;

window.formatarTelefone = function (tel) {
    if (!tel) return '';
    var val = String(tel).replace(/\D/g, '');
    if (val.length === 8) return val.replace(/^(\d{4})(\d{4})$/, '$1-$2');
    if (val.length === 10) return val.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    if (val.length === 11) return val.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    return val;
};

window.formatarTempoHumano = function (minutos) {
    var h = Math.floor(minutos / 60);
    var m = Math.round(minutos % 60);
    return h > 0 ? h + 'h ' + m + 'min' : m + 'min';
};

function _registrarListenerExpansaoInput() {
    var textarea = document.getElementById('msg-input');
    var inputArea = document.querySelector('.chat-input-area');
    if (!textarea || !inputArea) { setTimeout(_registrarListenerExpansaoInput, 300); return; }
    if (textarea._listenerExpandidoRegistrado) return;
    textarea._listenerExpandidoRegistrado = true;

    textarea.addEventListener('focus', function () {
        textarea.classList.add('textarea-expandida');
        inputArea.classList.add('input-expandido');
    });

    textarea.addEventListener('blur', function () {
        if (!textarea.value.trim()) {
            textarea.classList.remove('textarea-expandida');
            inputArea.classList.remove('input-expandido');
        }
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _registrarListenerExpansaoInput);
else _registrarListenerExpansaoInput();

window.formatarDataSeparador = function (dataStr) {
    if (!dataStr) return null;
    var raw = String(dataStr);
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    if (raw.includes('T') || raw.includes('-')) {
        var d = new Date(raw);
        if (!isNaN(d.getTime())) {
            d.setHours(0, 0, 0, 0);
            var diff = Math.floor((hoje - d) / 86400000);
            if (diff === 0) return 'HOJE';
            if (diff === 1) return 'ONTEM';
            return String(d.getDate()).padStart(2, '0') + '/' +
                String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
        }
    }
    var partes = raw.split('/');
    if (partes.length === 3) {
        var dm = new Date(partes[2], partes[1] - 1, partes[0]); dm.setHours(0, 0, 0, 0);
        var dc = Math.floor((hoje - dm) / 86400000);
        if (dc === 0) return 'HOJE';
        if (dc === 1) return 'ONTEM';
    }
    return raw;
};

window.carregarPedidosDoCliente = async function (clienteId) {
    if (!clienteId) return;

    var meuToken = (window.AppRDO._chatRequestToken = (window.AppRDO._chatRequestToken || 0) + 1);

    try {
        var todosPedidos = await API.call('getpedidos');
        var todasMensagens = await API.call('getchat');

        if (meuToken !== window.AppRDO._chatRequestToken) return;

        var pedidosCliente = todosPedidos.filter(function (p) {
            return String(p.id_cliente).trim() === String(clienteId).trim();
        });
        var mensagensCliente = todasMensagens.filter(function (m) {
            return String(m.id_cliente).trim() === String(clienteId).trim();
        });

        window.AppRDO.pedidosCache = todosPedidos;
        window.AppRDO.mensagensCache = todasMensagens;

        var listaParaDropdown = pedidosCliente.map(function (p) {
            var idFormatado = typeof window._formatarNomeServico === 'function'
                ? window._formatarNomeServico(p.id)
                : String(p.id);
            var resumo = String(p.de || '').trim() && String(p.para || '').trim()
                ? p.de + ' → ' + p.para
                : (p.status || '');
            return { id: String(p.id).trim(), idFormatado: idFormatado, resumo: resumo };
        });

        if (window.PedidosDropdown && typeof window.PedidosDropdown.setPedidos === 'function') {
            window.PedidosDropdown.setPedidos(listaParaDropdown);
        }

        window.renderizarMensagens(mensagensCliente, pedidosCliente);
    } catch (err) {
        if (meuToken !== window.AppRDO._chatRequestToken) return;
        window._exibirErroGlobal(err, 'carregar pedidos do cliente');
        _mostrarChatEmptyState('Erro ao carregar mensagens');
    }
};

window.carregarDados = function () {
    var listEl = document.getElementById('lista-contatos-chat');
    var searchInput = document.getElementById('chat-search');
    if (!listEl || window.AppRDO.isFetching) return Promise.resolve();

    window.AppRDO.isMasterOn = localStorage.getItem('bot_master_active') === 'true';
    window.AppRDO.isFetching = true;
    _spinChatOn();
    _mostrarLoadingContatos();
    if (searchInput) searchInput.placeholder = 'Sincronizando...';

    return Promise.all([
        API.call('getclientes'),
        API.call('getchat'),
        API.call('getpedidos')
    ]).then(function (results) {
        var listaClientes = Array.isArray(results[0]) ? results[0] : [];
        var listaMensagens = Array.isArray(results[1]) ? results[1] : [];
        var listaPedidos = Array.isArray(results[2]) ? results[2] : [];
        var isMasterOn = window.AppRDO.isMasterOn;

        window.AppRDO.clientesCache = listaClientes;
        window.AppRDO.mensagensCache = listaMensagens;
        window.AppRDO.pedidosCache = listaPedidos;

        window.renderizarLista(listaClientes, isMasterOn);

        if (!window.AppRDO.clienteId && listaClientes.length > 0) {
            var primeiro = listaClientes[0];
            window.selecionarEAbrir(
                String(primeiro.id || ''),
                primeiro.username || 'Sem nome',
                isMasterOn && String(primeiro.status || '').toUpperCase() === 'TRUE'
            );
        } else if (window.AppRDO.clienteId) {
            var clienteAtual = listaClientes.find(function (c) {
                return String(c.id) === String(window.AppRDO.clienteId);
            });
            if (clienteAtual) {
                window.abrirConversa(
                    window.AppRDO.clienteId,
                    clienteAtual.username || 'Sem nome',
                    null,
                    isMasterOn && String(clienteAtual.status || '').toUpperCase() === 'TRUE'
                );
            }
        } else {
            _mostrarChatEmptyState('Nenhum contato disponível');
        }

        window.AppRDO.listaCarregada = true;
        if (searchInput) searchInput.placeholder = 'Buscar cliente...';
    }).catch(function (e) {
        window._exibirErroGlobal(e, 'carregar dados iniciais');
        _mostrarContatosEmptyState('Erro ao carregar dados');
        _mostrarChatEmptyState('Erro ao carregar mensagens');
    }).finally(function () {
        window.AppRDO.isFetching = false;
        _spinChatOff();
    });
};

window.renderizarLista = function (lista, isMasterOn) {
    var listEl = document.getElementById('lista-contatos-chat');
    if (!listEl) return;
    if (!lista || lista.length === 0) { _mostrarContatosEmptyState('Nenhum contato disponível'); return; }

    var clienteAtivo = window.AppRDO.clienteId;
    listEl.innerHTML = lista.map(function (cliente) {
        var id = String(cliente.id || '');
        var nome = cliente.username || 'Sem nome';
        var imagem = cliente.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        var isOnline = isMasterOn && String(cliente.status || '').toUpperCase() === 'TRUE';
        var isActive = id === String(clienteAtivo);
        var nomeEsc = nome.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return '<div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean ' +
            (isActive ? 'active-contact' : '') + '" id="item-contato-' + id + '" ' +
            'onclick="window.selecionarEAbrir(\'' + id + '\',\'' + nomeEsc + '\',' + isOnline + ')">' +
            '<div class="position-relative">' +
            '<img src="' + imagem + '" class="rounded-circle contact-avatar" ' +
            'onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">' +
            '<span class="position-absolute bottom-0 end-0 rounded-circle border border-white contact-status-dot" ' +
            'style="background-color:' + (isOnline ? '#28a745' : '#adb5bd') + ';"></span>' +
            '</div>' +
            '<div class="ms-2 overflow-hidden text-truncate">' +
            '<div class="contact-name">' + nome + '</div>' +
            '<div class="small text-muted contact-status">' + (isOnline ? 'Online' : 'Offline') + '</div>' +
            '</div></div>';
    }).join('');
};

window.selecionarEAbrir = function (id, nome, isOnline) {
    window.AppRDO.clienteId = id;
    window.AppRDO.clienteSelecionado = nome;
    localStorage.setItem('clienteSelecionadoNome', nome);

    document.querySelectorAll('.contact-item-clean').forEach(function (el) {
        el.classList.remove('active-contact');
    });
    var item = document.getElementById('item-contato-' + id);
    if (item) item.classList.add('active-contact');

    if (!isOnline) {
        window.exibirModalValidacao(
            'Por favor, entre em contato com o seu administrador.<strong> O cliente está offline.</strong>'
        );
    }
    window.abrirConversa(id, nome, null, isOnline);

    if (typeof window._fecharDrawerContatosMobile === 'function') {
        window._fecharDrawerContatosMobile();
    }
};

window.abrirConversa = function (id, nome, urlImagem, isOnline) {
    _atualizarHeaderCliente(nome, isOnline);

    _mostrarLoadingMensagens();

    var msgInput = document.getElementById('msg-input');
    if (msgInput) {
        msgInput.value = '';
        msgInput.style.height = 'auto';
        msgInput.style.border = '';
        msgInput.style.boxShadow = '';
        msgInput.setAttribute('placeholder', 'Digite o pedido...');
    }

    return window.carregarPedidosDoCliente(String(id).trim());
};

window.abrirMenuHeaderCliente = function () {
    Swal.fire({
        title: 'Opções da Conversa',
        html:
            '<div class="d-flex flex-column gap-2 mt-2">' +
            '<button class="btn btn-outline-danger btn-lg w-100" id="btn-menu-msg-padrao">' +
            '<i class="bi bi-chat-left-text-fill me-2"></i>Mensagem Padrão</button>' +
            '<button class="btn btn-outline-danger btn-lg w-100" id="btn-menu-sync-chat">' +
            '<i class="bi bi-arrow-repeat me-2"></i>Sincronizar Chat</button>' +
            '<button class="btn btn-outline-dark btn-lg w-100" id="btn-menu-fechar">' +
            '<i class="bi bi-x-lg me-2"></i>Fechar</button>' +
            '</div>',
        showConfirmButton: false,
        showCancelButton: false,
        showCloseButton: true,
        customClass: { popup: 'p-4' },
        didOpen: function () {
            var elMsgPadrao = document.getElementById('btn-menu-msg-padrao');
            var elSync = document.getElementById('btn-menu-sync-chat');
            var elFechar = document.getElementById('btn-menu-fechar');

            if (elMsgPadrao) elMsgPadrao.addEventListener('click', function () {
                Swal.close();
                setTimeout(function () { _limparBackdrop(); window.abrirModalMensagemPadrao(); }, 150);
            });

            if (elSync) elSync.addEventListener('click', function () {
                Swal.close();
                setTimeout(function () { _limparBackdrop(); window.carregarDados(); }, 150);
            });

            if (elFechar) elFechar.addEventListener('click', function () {
                Swal.close();
                setTimeout(function () { _limparBackdrop(); }, 150);
            });
        }
    });
};

window.abrirPesquisaPedido = function () {
    if (!window.AppRDO || !window.AppRDO.clienteId) {
        window.exibirModalValidacao('Selecione um cliente na lista primeiro.');
        return;
    }

    // Garante que o dropdown está inicializado e populado com os pedidos do cliente atual
    if (window.PedidosDropdown && typeof window.PedidosDropdown.abrir === 'function') {
        window.PedidosDropdown.abrir();
    } else {
        window._exibirErroGlobal('PedidosDropdown não disponível', 'abrir pesquisa de pedido');
    }
};

function _resolverTextoMensagem(msg, pedido) {
    var textoSalvo = msg && msg.texto != null ? String(msg.texto).trim() : '';
    if (textoSalvo.length > 0) return textoSalvo;
    if (!pedido) return null;

    return window.gerarMensagemFormatada({
        id: String(pedido.id || '').trim(),
        solicitante: String(pedido.solicitante || 'Não informado').trim(),
        contato: String(pedido.contato || '').trim(),
        mercadoria: String(pedido.mercadoria || 'ENTREGA').trim(),
        de: String(pedido.de || '').trim(),
        para: String(pedido.para || '').trim(),
        distanciaTotal: _parseMoedaSeguro(pedido.distancia || 0),
        tempoTotal: _parseMoedaSeguro(pedido.tempo || 0),
        valorEstimado: _parseMoedaSeguro(pedido.valor_total || 0)
    });
}

window.remitirPedido = async function () {
    var _validarCampo = function (el) {
        if (!el || !String(el.value || '').trim()) {
            if (el) {
                el.style.border = '2px solid #dc3545';
                el.style.boxShadow = '0 0 0 0.2rem rgba(220,53,69,.25)';
                setTimeout(function () { el.style.border = ''; el.style.boxShadow = ''; }, 3000);
            }
            return false;
        }
        return true;
    };

    var invalido = false;
    ['p-solicitante', 'p-contato', 'p-mercadoria', 'p-rotas'].forEach(function (id) {
        if (!_validarCampo(document.getElementById(id))) invalido = true;
    });
    if (invalido) return;

    if (typeof window.calcularTudo === 'function') window.calcularTudo();

    var dados = window.dadosPedidoAtual || {};
    var solicitante = String((document.getElementById('p-solicitante') || {}).value || dados.solicitante || '').trim();
    var contato = String((document.getElementById('p-contato') || {}).value || dados.contato || '').trim();
    var horario = String((document.getElementById('p-horario') || {}).value || dados.horario || '').trim();
    var mercadoria = String((document.getElementById('p-mercadoria') || {}).value || dados.mercadoria || 'ENTREGA').trim();
    var distancia = parseFloat((document.getElementById('p-distancia') || {}).value || dados.distanciaTotal || 0) || 0;
    var tempo = String((document.getElementById('p-tempo') || {}).value || '').trim();
    var obs = String((document.getElementById('p-obs') || {}).value || dados.obs || '').trim();
    var valorKm = String((document.getElementById('p-valor-km') || {}).value || '3').trim();
    var retorno = String((document.getElementById('p-retorno') || {}).value || '0').trim();
    var dinamica = String((document.getElementById('p-dinamica') || {}).value || '0').trim();
    var prioridade = String((document.getElementById('p-prioridade') || {}).value || '0').trim();
    var valorTotal = Number(dados.valorEstimado || 0);
    var dataPedido = String(dados.dataPedido || '').trim();

    var rotasProcessadas = (
        Array.isArray(dados.rotasProcessadas) && dados.rotasProcessadas.length > 0
    ) ? dados.rotasProcessadas : [];

    var rotasTexto = '';
    if (rotasProcessadas.length > 0) {
        rotasTexto = rotasProcessadas.map(function (r, i) {
            return (i + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
        }).join('\n');
    } else {
        rotasTexto = String((document.getElementById('p-rotas') || {}).value || '').trim();
    }

    var primeiraRota = rotasProcessadas.length > 0 ? rotasProcessadas[0] : null;
    var deStr = primeiraRota ? primeiraRota.de : '';
    var paraStr = primeiraRota ? primeiraRota.para : '';

    var dadosParaMensagem = {
        id: '[ID_GERADO]',
        solicitante: solicitante,
        contato: contato,
        mercadoria: mercadoria,
        rotasProcessadas: rotasProcessadas,
        distanciaTotal: dados.distanciaTotal || distancia,
        tempoTotal: dados.tempoTotal || 0,
        valorEstimado: valorTotal,
        dataPedido: dataPedido
    };

    var mensagemProvisoria = typeof window.gerarMensagemFormatada === 'function'
        ? window.gerarMensagemFormatada(dadosParaMensagem)
        : '';

    var payload = {
        id_cliente: String((window.AppRDO && window.AppRDO.clienteId) || ''),
        solicitante: solicitante,
        contato: contato,
        horario: horario,
        mercadoria: mercadoria,
        rotas_texto: rotasTexto,
        de: deStr,
        para: paraStr,
        distancia: distancia.toFixed(2),
        tempo: tempo,
        obs: obs,
        valor_km: valorKm,
        retorno: retorno,
        dinamica: dinamica,
        prioridade: prioridade,
        valor_corrida: valorTotal,
        valor_final: valorTotal,
        status: 'PENDENTE',
        situacao_financeira: 'PENDENTE',
        texto: mensagemProvisoria,
        data_pedido: dataPedido
    };

    if (!payload.id_cliente) { window.exibirModalValidacao('Nenhum cliente selecionado.'); return; }

    var btnRemitir = document.getElementById('btn-remitir-pedido');
    var textoOriginal = btnRemitir ? btnRemitir.innerHTML : '';
    if (btnRemitir) {
        btnRemitir.disabled = true;
        btnRemitir.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Enviando...';
    }

    try {
        var resposta = await API.call('createpedido', payload);
        if (!resposta || resposta.status !== 'success')
            throw new Error((resposta && resposta.message) || 'Resposta inválida da API');

        window.AppRDO._chatRequestToken = (window.AppRDO._chatRequestToken || 0) + 1;

        var novoPedidoIdRaw = String(resposta.id || resposta.pedido_id || '').trim();
        var novoPedidoId = novoPedidoIdRaw.replace(/^RDO0*/i, '') || novoPedidoIdRaw;
        var novoChatId = String(resposta.chat_id || resposta.id_chat || '').trim();

        var mensagemFinal = mensagemProvisoria.replace('[ID_GERADO]', novoPedidoIdRaw);

        var modalForm = document.getElementById('modalFormulario');
        var instForm = modalForm ? bootstrap.Modal.getInstance(modalForm) : null;
        if (instForm) { try { instForm.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de formulário'); } }

        if (mensagemFinal && typeof window.enviarMensagemParaChat === 'function')
            window.enviarMensagemParaChat(mensagemFinal, false, novoPedidoId || null);

        if (novoPedidoId) {
            var novoPedidoCache = Object.assign({}, payload, {
                id: novoPedidoId,
                status: 'PENDENTE',
                situacao_financeira: 'PENDENTE',
                motoboy: '',
                mensagem: mensagemFinal
            });
            if (Array.isArray(window.AppRDO.pedidosCache))
                window.AppRDO.pedidosCache.push(novoPedidoCache);

            if (Array.isArray(window.AppRDO.mensagensCache))
                window.AppRDO.mensagensCache.push({
                    id: novoChatId || null,
                    id_cliente: payload.id_cliente,
                    pedido_id: novoPedidoId,
                    texto: mensagemFinal,
                    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    data: new Date().toISOString()
                });
        }

        window.dadosPedidoAtual = {};
        window.AppRDO._mapaModalAberto = false;
        window.AppRDO.isProcessingCheckout = false;

        var msgInput = document.getElementById('msg-input');
        if (msgInput) {
            msgInput.value = '';
            msgInput.style.height = 'auto';
            msgInput.setAttribute('placeholder', 'Digite o pedido...');
        }

        if (btnRemitir) { btnRemitir.disabled = false; btnRemitir.innerHTML = textoOriginal; }

        setTimeout(function () { _limparBackdrop(); }, 350);

        try {
            Swal.fire({
                icon: 'success', title: 'Pedido enviado!',
                text: 'O pedido foi registrado com sucesso.',
                toast: true, position: 'top-end',
                showConfirmButton: false, timer: 3000,
                timerProgressBar: true, customClass: { popup: 'rounded-4 shadow' }
            });
        } catch (_) { }

    } catch (err) {
        window._exibirErroGlobal(err, 'enviar pedido');
        if (btnRemitir) { btnRemitir.disabled = false; btnRemitir.innerHTML = textoOriginal; }
        try {
            Swal.fire({
                icon: 'error', title: 'Erro ao enviar pedido',
                html: '<div style="font-size:.9rem;">' + (err.message || 'Tente novamente.') + '</div>',
                confirmButtonText: 'Fechar', confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
        } catch (_) { alert('Erro ao enviar pedido: ' + (err.message || '')); }
    }
};

function _criarWrapperMensagem(pedidoId, texto, hora, temStatus, statusPuro, tooltipTexto) {
    var div = document.createElement('div');
    div.className = 'message-wrapper';

    var iconHTML = temStatus
        ? window.getIconePorStatus(statusPuro)
        : '<i class="bi bi-arrow-repeat spinner-rotate"></i>';

    var textoSeguro = String(texto || '');
    var textoEscapadoAttr = textoSeguro
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');

    div.innerHTML =
        '<div class="msg-action-buttons">' +
        '<button class="btn-copiar-msg" title="Copiar mensagem" ' +
        'onclick="event.stopPropagation();window._copiarMensagemWrapper(\'' + pedidoId + '\', this)">' +
        '<i class="bi bi-clipboard"></i>' +
        '</button>' +
        '<button class="btn-excluir-msg" title="Excluir mensagem" ' +
        'onclick="event.stopPropagation();window.MasterAuth.abrir(\'' + pedidoId + '\')">' +
        '<i class="bi bi-trash3-fill"></i>' +
        '</button>' +
        '</div>' +
        '<div class="message-sent" data-pedido-id="' + pedidoId + '" ' +
        'data-texto-original="' + textoEscapadoAttr + '" ' +
        'onclick="window.abrirModalEdicao(\'' + pedidoId + '\')">' +
        '<div class="message-body">' + _estilizarRotasNaMensagem(textoSeguro.replace(/\n/g, '<br>')) + '</div>' +
        '<div class="status-icon ' + (temStatus ? 'status-updated' : 'status-pending') + '" ' +
        'onclick="event.stopPropagation();window.abrirModalStatus(\'' + pedidoId + '\')" ' +
        'data-tooltip="' + tooltipTexto + '">' +
        iconHTML +
        '</div>' +
        '<span class="message-time">' + hora + '</span>' +
        '</div>';

    div.addEventListener('mouseenter', function () { div.classList.add('msg-hover-active'); });
    div.addEventListener('mouseleave', function () { div.classList.remove('msg-hover-active'); });

    return div;
}

window._criarWrapperMensagem = _criarWrapperMensagem;

window._copiarMensagemWrapper = function (pedidoId, botao) {
    var msgEl = document.querySelector('[data-pedido-id="' + pedidoId + '"]');
    if (!msgEl) return;

    var textoOriginal = msgEl.getAttribute('data-texto-original');
    var texto = textoOriginal
        ? textoOriginal.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        : (msgEl.querySelector('.message-body') ? msgEl.querySelector('.message-body').innerText : '');

    texto = String(texto || '').trim();

    if (!texto) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning', title: 'Nada para copiar',
                toast: true, position: 'top-end',
                showConfirmButton: false, timer: 2000
            });
        }
        return;
    }

    function _feedbackSucesso() {
        if (botao) {
            var icon = botao.querySelector('i');
            if (icon) {
                icon.className = 'bi bi-check2';
                setTimeout(function () { icon.className = 'bi bi-clipboard'; }, 1500);
            }
        }
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Pedido copiado!',
                text: 'Agora você pode colar no WhatsApp.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1800,
                timerProgressBar: true,
                customClass: { popup: 'rounded-4 shadow' }
            });
        }
    }

    function _feedbackErro(e) {
        window._exibirErroGlobal(e, 'copiar mensagem');
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Não foi possível copiar',
                text: 'Selecione e copie manualmente o texto.',
                confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
        }
    }

    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        navigator.clipboard.writeText(texto)
            .then(_feedbackSucesso)
            .catch(function (e) {
                _copiarFallback(texto, _feedbackSucesso, function () { _feedbackErro(e); });
            });
    } else {
        _copiarFallback(texto, _feedbackSucesso, _feedbackErro);
    }
};

function _copiarFallback(texto, callbackSucesso, callbackErro) {
    var sucesso = false;
    var temp = document.createElement('textarea');

    temp.value = texto;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.top = '0';
    temp.style.left = '0';
    temp.style.width = '1px';
    temp.style.height = '1px';
    temp.style.padding = '0';
    temp.style.border = 'none';
    temp.style.outline = 'none';
    temp.style.boxShadow = 'none';
    temp.style.background = 'transparent';
    temp.style.fontSize = '16px';
    temp.style.opacity = '0';
    temp.style.zIndex = '-1';

    document.body.appendChild(temp);

    try {
        temp.focus({ preventScroll: true });
        temp.select();
        temp.setSelectionRange(0, temp.value.length);

        sucesso = document.execCommand('copy');
    } catch (err) {
        window._exibirErroGlobal(err, 'copiar via fallback');
        sucesso = false;
    }

    document.body.removeChild(temp);

    if (sucesso) {
        if (typeof callbackSucesso === 'function') callbackSucesso();
    } else {
        if (typeof callbackErro === 'function') callbackErro();
    }
}

window.renderizarMensagens = function (mensagens, pedidos) {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;
    container.innerHTML = '';
    window.AppRDO.pedidosCache = pedidos;

    if (!mensagens || mensagens.length === 0) {
        _mostrarChatEmptyState('Nenhum histórico encontrado');
        return;
    }

    var ultimaData = null;
    mensagens.forEach(function (msg) {
        var pedidoId = String(msg.pedido_id || '').trim();

        var labelData = window.formatarDataSeparador(msg.data || null);
        if (labelData && labelData !== ultimaData) {
            ultimaData = labelData;
            var sep = document.createElement('div');
            sep.className = 'chat-date-separator';
            sep.innerHTML = '<span class="chat-date-badge">' + labelData + '</span>';
            container.appendChild(sep);
        }

        var pedido = pedidos.find(function (p) {
            return String(p.id).trim() === pedidoId;
        });

        var statusBruto = String(pedido ? pedido.status : '').trim();
        var motoboyNome = String(pedido ? (pedido.motoboy || '') : '').trim();
        var statusPuro = statusBruto.includes('/') ? statusBruto.split('/').pop().trim() : statusBruto;
        var statusUpper = statusPuro.toUpperCase();
        var isFinal = statusUpper === 'CONCLUIDO' || statusUpper === 'CONCLUÍDO' || statusUpper === 'CANCELADO';
        var isEmRota = statusUpper === 'EM_ROTA' || statusUpper === 'EM ROTA' || statusBruto.includes('/');
        var temStatus = isEmRota || isFinal;
        var statusLabel = statusPuro.replace(/_/g, ' ');
        var tooltipTexto = temStatus
            ? (motoboyNome ? motoboyNome + ' • ' + statusLabel : statusLabel)
            : 'Alterar Status';

        var textoMensagem = _resolverTextoMensagem(msg, pedido);
        if (textoMensagem === null) return;

        container.appendChild(
            _criarWrapperMensagem(pedidoId, textoMensagem, msg.hora || '', temStatus, statusPuro, tooltipTexto)
        );
    });

    container.scrollTop = container.scrollHeight;
};

window.enviarMensagemParaChat = function (texto, isRecebida, pedidoId) {
    var container = document.getElementById('chat-messages-container');
    if (!container) return;

    var emptyState = container.querySelector('.chat-empty-state');
    if (emptyState) emptyState.remove();

    var loadingState = container.querySelector('.chat-loading-text');
    if (loadingState) container.innerHTML = '';

    var hojeLabel = 'HOJE';
    var ultimoSep = container.querySelector('.chat-date-separator:last-of-type .chat-date-badge');
    if (!ultimoSep || ultimoSep.textContent !== hojeLabel) {
        var sep = document.createElement('div');
        sep.className = 'chat-date-separator';
        sep.innerHTML = '<span class="chat-date-badge">' + hojeLabel + '</span>';
        container.appendChild(sep);
    }

    var horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    container.appendChild(_criarWrapperMensagem(pedidoId || null, texto, horaAtual, false, '', 'Alterar Status'));
    container.scrollTop = container.scrollHeight;
};

window.getIconePorStatus = function (status) {
    var s = String(status || '').trim().toUpperCase();
    if (s.includes('EM_ROTA') || s.includes('EM ROTA') || s.includes('/'))
        return '<i class="bi bi-bicycle" style="color:#0d6efd;"></i>';
    if (s.includes('CONCLUIDO') || s.includes('CONCLUÍDO'))
        return '<i class="bi bi-check-circle-fill" style="color:#28a745;"></i>';
    if (s.includes('CANCELADO'))
        return '<i class="bi bi-x-circle-fill" style="color:#dc3545;"></i>';
    return '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
};

window.gerarMensagemFormatada = function (dados) {
    var idBruto = String(dados.id || dados.numeroServico || '').trim();
    var nomeServico = _formatarNomeServico(idBruto);
    var solicitante = String(dados.solicitante || 'Não informado').trim();
    var contato = String(dados.contato || '').trim();
    var mercadoria = String(dados.mercadoria || 'ENTREGA').trim().toUpperCase();

    var dataFormatada = '';
    if (dados.dataPedido) {
        var p = String(dados.dataPedido).split('-');
        if (p.length === 3) dataFormatada = p[2] + '/' + p[1] + '/' + p[0];
    }

    var linhas = [
        '📦 N.SERVIÇO: ' + nomeServico,
        '📅 DATA DO PEDIDO: ' + (dataFormatada || 'Não informada'),
        '👤 : ' + solicitante + ' 📞 : ' + contato,
        '📦 : ' + mercadoria,
        '.',
        '📍 ROTAS:'
    ];

    var rotasFinais = [];
    if (dados.rotasProcessadas && dados.rotasProcessadas.length > 0) {
        rotasFinais = dados.rotasProcessadas;
    } else if (dados.rotas && String(dados.rotas).trim()) {
        rotasFinais = String(dados.rotas).trim().split('\n')
            .map(function (linha) { return linha.trim(); })
            .filter(function (linha) { return !!linha; })
            .map(function (linha) {
                var m = linha.match(/De:\s*(.+?)\s*\|\s*Para:\s*(.+)/i);
                return m ? { de: m[1].trim(), para: m[2].trim() } : { de: linha, para: '' };
            });
    } else if (dados.de && dados.para) {
        rotasFinais = [{ de: String(dados.de).trim(), para: String(dados.para).trim() }];
    }

    rotasFinais.forEach(function (r, i) {
        linhas.push((i + 1) + '. De: ' + String(r.de || '').trim() + ' | Para: ' + String(r.para || '').trim());
        linhas.push('.');
    });

    var km = Number(dados.distanciaTotal || dados.distancia || 0);
    var min = Number(dados.tempoTotal || 0);
    var valor = Number(dados.valorEstimado || dados.valor_total || dados.valor_final || 0);

    linhas.push(
        '🛣️ ' + km.toFixed(2) + ' km ' +
        '⏱️ ' + window.formatarTempoHumano(min) + ' ' +
        '💰 ' + valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    );

    return linhas.join('\n');
};

window.StatusModal = (function () {
    var _pedidoId = null;
    var _modalBS = null;

    function _el(id) { return document.getElementById(id) || null; }
    function _safeText(el, txt) { if (el && typeof txt === 'string') el.textContent = txt; }
    function _safeClass(el, action) {
        if (!el || !el.classList) return;
        Array.prototype.slice.call(arguments, 2).forEach(function (c) {
            if (action === 'add') el.classList.add(c);
            else if (action === 'remove') el.classList.remove(c);
        });
    }

    function _resetar() {
        try {
            _safeText(_el('modal-status-texto'), 'Alterar Status');
            var icone = _el('modal-status-icone');
            if (icone) icone.className = 'bi bi-arrow-repeat text-danger';
            _safeClass(_el('box-botoes-status'), 'remove', 'd-none');
            _safeClass(_el('box-selecao-motoboy'), 'add', 'd-none');
            _safeClass(_el('box-cancelamento'), 'add', 'd-none');
            var select = _el('select-motoboy');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Selecione o motoboy...</option>';
                select.style.borderColor = '';
                select.disabled = false;
            }
            document.querySelectorAll('#box-cancelamento .cancel-cb').forEach(function (cb) { cb.checked = false; });
            _safeClass(_el('cancel-error'), 'add', 'd-none');
        } catch (e) { window._exibirErroGlobal(e, 'resetar modal de status'); }
    }

    function _normalizarId(id) {
        var s = String(id || '').trim();
        return s.replace(/^RDO0*/i, '') || s;
    }

    function _getIconEl(id) {
        var msgEl = document.querySelector('[data-pedido-id="' + id + '"]');
        return msgEl ? msgEl.querySelector('.status-icon') : null;
    }

    function _setSpinnerNoBotao(id) {
        try {
            var iconEl = _getIconEl(id);
            if (!iconEl) return;
            iconEl.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i>';
            iconEl.classList.remove('status-updated');
            iconEl.classList.add('status-pending');
            iconEl.setAttribute('data-tooltip', 'Atualizando...');
        } catch (e) { window._exibirErroGlobal(e, 'exibir spinner de status'); }
    }

    function _setIconeFinal(id, status, motoboyNome) {
        try {
            var iconEl = _getIconEl(id);
            if (!iconEl) return;
            iconEl.innerHTML = typeof window.getIconePorStatus === 'function'
                ? window.getIconePorStatus(status)
                : '<i class="bi bi-question-circle"></i>';
            iconEl.classList.remove('status-pending');
            iconEl.classList.add('status-updated');
            var label = String(status || '').replace(/_/g, ' ');
            var tooltip = motoboyNome ? motoboyNome + ' • ' + label : label;
            iconEl.setAttribute('data-tooltip', tooltip);
            iconEl.setAttribute('title', tooltip);
        } catch (e) { window._exibirErroGlobal(e, 'atualizar ícone de status'); }
    }

    function _atualizarCache(id, statusFmt, motoboyNome) {
        try {
            var cache = window.AppRDO && Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
            var idNorm = _normalizarId(id);
            var pedido = cache.find(function (p) {
                return _normalizarId(String(p.id || '').trim()) === idNorm;
            });
            if (!pedido) return;
            pedido.status = statusFmt;
            if (motoboyNome) pedido.motoboy = motoboyNome;
        } catch (e) { window._exibirErroGlobal(e, 'atualizar cache de pedido'); }
    }

    async function _carregarMotoboys() {
        var select = _el('select-motoboy');
        if (!select) return;
        select.innerHTML = '<option value="" disabled selected>Carregando...</option>';
        select.disabled = true;
        try {
            var todos = await API.call('getcolaboradores');
            var lista = Array.isArray(todos) ? todos : [];
            var motoboys = lista.filter(function (c) {
                return String(c.status || '').toUpperCase() === 'TRUE';
            });
            select.disabled = false;
            select.innerHTML = motoboys.length > 0
                ? '<option value="" disabled selected>Selecione o motoboy...</option>' +
                motoboys.map(function (m) {
                    return '<option value="' + String(m.id || '') + '">' +
                        String(m.username || m.nome || 'Sem nome') + '</option>';
                }).join('')
                : '<option value="" disabled selected>Nenhum motoboy disponível</option>';
        } catch (e) {
            window._exibirErroGlobal(e, 'carregar motoboys');
            if (select) { select.disabled = false; select.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>'; }
        }
    }

    async function _excluirChatLogicamente(pedidoIdRaw) {
        var idNorm = _normalizarId(pedidoIdRaw);
        try {
            var respChat = await API.call('deletechat', { pedido_id: idNorm });
            var erroChat = !respChat || respChat.status === 'error';

            if (erroChat) {
                window._exibirErroGlobal((respChat && respChat.message) || 'Falha ao excluir chat', 'excluir chat do pedido ' + idNorm);
                return false;
            }

            if (Array.isArray(window.AppRDO.mensagensCache)) {
                window.AppRDO.mensagensCache = window.AppRDO.mensagensCache.filter(function (m) {
                    return _normalizarId(String(m.pedido_id || '').trim()) !== idNorm;
                });
            }

            var msgEl = document.querySelector('[data-pedido-id="' + pedidoIdRaw + '"]');
            if (msgEl) {
                var wrapper = msgEl.closest('.message-wrapper');
                if (wrapper) {
                    wrapper.style.transition = 'opacity .3s ease, transform .3s ease';
                    wrapper.style.opacity = '0';
                    wrapper.style.transform = 'translateX(30px)';
                    setTimeout(function () { try { wrapper.remove(); } catch (e) { window._exibirErroGlobal(e, 'remover bolha de mensagem'); } }, 300);
                }
            }

            if (typeof window.EventBus !== 'undefined') {
                window.EventBus.emit('chat:excluidoLogico', { pedidoId: idNorm });
            }

            return true;
        } catch (e) {
            window._exibirErroGlobal(e, 'excluir chat logicamente');
            return false;
        }
    }

    function _obterPedidoDoCache(id) {
        var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
        var idNorm = _normalizarId(id);
        return cache.find(function (p) {
            return _normalizarId(String(p.id || '').trim()) === idNorm;
        }) || null;
    }

    async function _executarAlteracao(status, motoboyId, motivosCancelamento) {
        if (status === 'CONCLUIDO') {
            var pedidoCheck = _obterPedidoDoCache(_pedidoId);
            var motoboyJaExistente = pedidoCheck ? String(pedidoCheck.motoboy || '').trim() : '';
            if (!motoboyJaExistente) {
                try { if (_modalBS) _modalBS.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de status'); }
                setTimeout(function () {
                    try {
                        Swal.fire({
                            icon: 'warning', title: 'Motoboy não selecionado',
                            html: '<div style="font-size:.9rem;color:#555;">Este pedido ainda não tem um <strong>motoboy</strong> definido.<br>Selecione um motoboy (status "Em Rota") antes de concluir o pedido.</div>',
                            confirmButtonText: 'Entendi', confirmButtonColor: '#dc3545',
                            customClass: { popup: 'rounded-4', confirmButton: 'rounded-3' }
                        });
                    } catch (e) {
                        window._exibirErroGlobal(e, 'exibir aviso de motoboy obrigatório');
                    }
                }, 300);
                return;
            }
        }

        var motoboyNome = '';
        var statusFmt = String(status || '');

        if (motoboyId) {
            try {
                var select = _el('select-motoboy');
                if (select && select.selectedIndex >= 0)
                    motoboyNome = String(select.options[select.selectedIndex].text || '').trim();
            } catch (e) { window._exibirErroGlobal(e, 'obter nome do motoboy'); motoboyNome = ''; }
        }

        // 🛡️ PROTEÇÃO DEFINITIVA: Se estiver concluindo e o nome do motoboy estiver vazio, resgata do cache do pedido!
        if (!motoboyNome && status === 'CONCLUIDO') {
            var pedidoCache = _obterPedidoDoCache(_pedidoId);
            if (pedidoCache && pedidoCache.motoboy) {
                motoboyNome = String(pedidoCache.motoboy).trim();
            }
        }

        if (motoboyNome) statusFmt = motoboyNome + '/' + status;

        _setSpinnerNoBotao(_pedidoId);
        try { if (_modalBS) _modalBS.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de status'); }

        try {
            var payload = {
                id: _normalizarId(_pedidoId),
                status: String(status || '').trim().toUpperCase(),
                motoboy: motoboyNome // Agora envia o nome do motoboy resgatado corretamente!
            };

            if (motivosCancelamento && motivosCancelamento.length > 0)
                payload.motivo_cancelamento = motivosCancelamento.join(' | ');

            var resposta = await API.call('updatepedido', payload);
            if (resposta && resposta.status === 'success') {
                _atualizarCache(_pedidoId, statusFmt, motoboyNome);
                _setIconeFinal(_pedidoId, status, motoboyNome);

                if (status === 'CANCELADO') {
                    await _excluirChatLogicamente(_pedidoId);
                }

                if (window.RDO_PEDIDOS && typeof window.RDO_PEDIDOS.atualizarStatusLocal === 'function') {
                    window.RDO_PEDIDOS.atualizarStatusLocal(
                        _pedidoId, statusFmt, motoboyNome,
                        (motivosCancelamento && motivosCancelamento.length > 0) ? motivosCancelamento.join(' | ') : undefined
                    );
                }

                if (typeof window.EventBus !== 'undefined') {
                    window.EventBus.emit('pedido:statusAtualizado', {
                        id: _pedidoId,
                        status: statusFmt,
                        motoboy: motoboyNome,
                        motivo_cancelamento: motivosCancelamento ? motivosCancelamento.join(' | ') : ''
                    });

                    if (status === 'CONCLUIDO') {
                        var pedidoConcluido = _obterPedidoDoCache(_pedidoId);

                        function parseValorMoeda(str) {
                            if (!str) return 0;
                            if (typeof str === 'number') return str;
                            var limpo = String(str)
                                .replace(/[^\d,.-]/g, '')
                                .replace(/\./g, '')
                                .replace(',', '.');
                            var num = parseFloat(limpo);
                            return isNaN(num) ? 0 : num;
                        }

                        var valorFinalPedido = pedidoConcluido
                            ? parseValorMoeda(pedidoConcluido.valor_corrida)
                            : 0;

                        var dataPedidoFinal = pedidoConcluido
                            ? (pedidoConcluido.data_pedido || pedidoConcluido.dataPedido ||
                                pedidoConcluido.data_lancamento || pedidoConcluido.dataLancamento ||
                                pedidoConcluido.updated_at || '')
                            : '';

                        window.EventBus.emit('pedido:atualizado', {
                            id: _pedidoId,
                            valor_final: valorFinalPedido,
                            valor_total: valorFinalPedido,
                            valor_corrida: valorFinalPedido,
                            motoboy: motoboyNome,
                            data_pedido: dataPedidoFinal
                        });
                    }
                }

            } else {
                throw new Error((resposta && resposta.message) || 'Falha na API');
            }
        } catch (e) {
            window._exibirErroGlobal(e, 'atualizar status do pedido');
            _setSpinnerNoBotao(_pedidoId);
            var iconEl = _getIconEl(_pedidoId);
            if (iconEl) { iconEl.innerHTML = '<i class="bi bi-exclamation-circle-fill" style="color:#dc3545;"></i>'; iconEl.setAttribute('data-tooltip', 'Erro ao atualizar'); }
            try {
                Swal.fire({
                    icon: 'error', title: 'Erro',
                    html: '<div style="font-size:.9rem;">Não foi possível alterar o status.<br>' +
                        '<small class="text-secondary">' + (e.message || 'Tente novamente.') + '</small></div>',
                    confirmButtonText: 'Fechar', confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' }
                });
            } catch (_) { alert('Erro ao alterar o status do pedido.'); }
        }
    }

    function abrir(pedidoId) {
        try {
            _pedidoId = String(pedidoId).trim();

            var pedidoAtual = _obterPedidoDoCache(_pedidoId);
            var statusAtual = pedidoAtual ? String(pedidoAtual.status || '') : '';
            var statusPuroAtual = statusAtual.includes('/') ? statusAtual.split('/').pop().trim() : statusAtual;

            if (statusPuroAtual.toUpperCase() === 'CONCLUIDO') {
                window.MasterAuth.abrir(_pedidoId, 'alterarMotoboyConcluido');
                return;
            }

            _abrirModalReal(_pedidoId);
        } catch (e) { window._exibirErroGlobal(e, 'abrir modal de status'); }
    }

    function _abrirModalReal(pedidoId) {
        try {
            _pedidoId = String(pedidoId).trim();
            _resetar();

            var modalEl = _el('modalStatus');
            if (!modalEl) return false;

            if (modalEl.parentElement !== document.body) {
                document.body.appendChild(modalEl);
            }

            try { var ex = bootstrap.Modal.getInstance(modalEl); if (ex) ex.dispose(); } catch (e) { window._exibirErroGlobal(e, 'liberar modal de status'); }
            if (typeof _limparBackdrop === 'function') _limparBackdrop();

            _modalBS = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });

            modalEl.addEventListener('hide.bs.modal', function () {
                if (document.activeElement && modalEl.contains(document.activeElement)) {
                    document.activeElement.blur();
                }
            });

            modalEl.addEventListener('shown.bs.modal', function () {
                modalEl.style.zIndex = '1075';
                var backdrops = document.querySelectorAll('.modal-backdrop');
                var ultimoBackdrop = backdrops[backdrops.length - 1];
                if (ultimoBackdrop) ultimoBackdrop.style.zIndex = '1070';
            }, { once: true });

            modalEl.addEventListener('hidden.bs.modal', function () {
                if (typeof _limparBackdrop === 'function') _limparBackdrop();
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, { once: true });

            _modalBS.show();
            return true;
        } catch (e) {
            window._exibirErroGlobal(e, 'abrir modal de status desbloqueado');
            return false;
        }
    }

    function processar(status) {
        try {
            if (status === 'EM_ROTA') {
                _safeText(_el('modal-status-texto'), 'Selecionar Motoboy');
                var iconeR = _el('modal-status-icone');
                if (iconeR) iconeR.className = 'bi bi-bicycle text-primary';
                _safeClass(_el('box-botoes-status'), 'add', 'd-none');
                _safeClass(_el('box-cancelamento'), 'add', 'd-none');
                _safeClass(_el('box-selecao-motoboy'), 'remove', 'd-none');
                _carregarMotoboys();
                return;
            }
            if (status === 'CANCELADO') {
                _safeText(_el('modal-status-texto'), 'Motivo do Cancelamento');
                var iconeC = _el('modal-status-icone');
                if (iconeC) iconeC.className = 'bi bi-x-circle-fill text-danger';
                _safeClass(_el('box-botoes-status'), 'add', 'd-none');
                _safeClass(_el('box-selecao-motoboy'), 'add', 'd-none');
                _safeClass(_el('box-cancelamento'), 'remove', 'd-none');
                return;
            }
            if (status === 'CONCLUIDO') {
                var pedidoAtual = _obterPedidoDoCache(_pedidoId);
                var temMotoboy = pedidoAtual && String(pedidoAtual.motoboy || '').trim() !== '';

                if (!temMotoboy) {
                    try { if (_modalBS) _modalBS.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de status'); }
                    setTimeout(function () {
                        try {
                            var resultado = Swal.fire({
                                icon: 'warning', title: 'Motoboy não selecionado',
                                html: '<div style="font-size:.9rem;color:#555;">Este pedido ainda não tem um <strong>motoboy</strong> definido.<br>Selecione um motoboy (status "Em Rota") antes de concluir o pedido.</div>',
                                confirmButtonText: 'Entendi', confirmButtonColor: '#dc3545',
                                customClass: { popup: 'rounded-4', confirmButton: 'rounded-3' }
                            });
                            if (resultado && typeof resultado.catch === 'function') {
                                resultado.catch(function (e) { window._exibirErroGlobal(e, 'exibir aviso de motoboy obrigatório'); });
                            }
                        } catch (e) {
                            window._exibirErroGlobal(e, 'exibir aviso de motoboy obrigatório');
                        }
                    }, 300);
                    return;
                }

                try { if (_modalBS) _modalBS.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de status'); }
                setTimeout(function () {
                    Swal.fire({
                        icon: 'question', title: 'Concluir Pedido?',
                        html: '<div style="font-size:.9rem;color:#555;">Ao concluir, este pedido <strong>não poderá</strong> mais ser alterado.</div>',
                        showCancelButton: true, confirmButtonText: 'Sim, Concluir',
                        cancelButtonText: 'Voltar', confirmButtonColor: '#28a745',
                        cancelButtonColor: '#6c757d', reverseButtons: true,
                        customClass: { popup: 'rounded-4', confirmButton: 'rounded-3', cancelButton: 'rounded-3' }
                    }).then(function (result) {
                        if (result.isConfirmed) _executarAlteracao('CONCLUIDO');
                    }).catch(function (e) { window._exibirErroGlobal(e, 'confirmar conclusão'); });
                }, 300);
            }
        } catch (e) { window._exibirErroGlobal(e, 'processar status'); }
    }

    async function confirmarMotoboy() {
        try {
            var select = _el('select-motoboy');
            var motoboyId = select ? select.value : '';
            if (!motoboyId) {
                if (select) { select.style.borderColor = '#dc3545'; select.focus(); setTimeout(function () { if (select) select.style.borderColor = ''; }, 1500); }
                return;
            }
            await _executarAlteracao('EM_ROTA', motoboyId);
        } catch (e) { window._exibirErroGlobal(e, 'confirmar motoboy'); }
    }

    async function confirmarCancelamento() {
        try {
            var checked = document.querySelectorAll('#box-cancelamento .cancel-cb:checked');
            var motivos = [];
            checked.forEach(function (cb) { motivos.push(cb.value); });
            if (motivos.length === 0) {
                var errEl = _el('cancel-error');
                if (errEl) {
                    errEl.classList.remove('d-none');
                    errEl.style.opacity = '0';
                    setTimeout(function () { if (errEl) { errEl.style.transition = 'opacity .2s'; errEl.style.opacity = '1'; } }, 30);
                }
                return;
            }
            _safeClass(_el('cancel-error'), 'add', 'd-none');
            await _executarAlteracao('CANCELADO', null, motivos);
        } catch (e) { window._exibirErroGlobal(e, 'confirmar cancelamento'); }
    }

    function voltar() { _resetar(); }

    return { abrir: abrir, processar: processar, confirmarMotoboy: confirmarMotoboy, confirmarCancelamento: confirmarCancelamento, voltar: voltar };
})();

window.abrirModalStatus = function (pedidoId) { window.StatusModal.abrir(pedidoId); };

window.abrirModalEdicao = function (msgId) {
    Swal.fire({
        title: 'Gerenciar Pedido #' + (msgId || ''),
        showDenyButton: true,
        confirmButtonText: 'Mensagem Padrão',
        denyButtonText: 'Excluir',
        customClass: {
            confirmButton: 'btn btn-outline-danger btn-lg w-100 mb-3',
            denyButton: 'btn btn-outline-danger btn-lg w-100',
            popup: 'p-4'
        },
        buttonsStyling: false,
        allowOutsideClick: true
    }).then(function (result) {
        setTimeout(function () {
            _limparBackdrop();
            if (result.isConfirmed) window.abrirModalMensagemPadrao();
            else if (result.isDenied) window.MasterAuth.abrir(msgId);
        }, 150);
    }).catch(function (e) { window._exibirErroGlobal(e, 'abrir modal de edição'); });
};

window.exibirErroModalPadrao = function (mensagemErro, titulo) {
    window.abrirModalMensagemPadrao({
        erro: mensagemErro || 'Algo deu errado. Tente novamente.',
        titulo: titulo || 'Ocorreu um erro'
    });
};

window.copiarModelo = function () {
    var texto = document.getElementById('texto-modelo');
    if (!texto) return;
    texto.select();
    document.execCommand('copy');
    Swal.fire({
        icon: 'success', title: 'Sucesso!', text: 'Modelo copiado com sucesso!',
        toast: true, position: 'top-end', showConfirmButton: false,
        timer: 2000, timerProgressBar: true, customClass: { popup: 'rounded-4 shadow' }
    });
};

window.excluirPedido = async function (pedidoId) {
    if (!pedidoId) return;
    var idStr = String(pedidoId).trim();
    try {
        var respChat = await API.call('deletechat', { pedido_id: idStr });
        var erroChat = !respChat || respChat.status === 'error';
        if (erroChat) {
            throw new Error((respChat && respChat.message) || 'Falha ao excluir o chat do pedido');
        }

        var respPedido = await API.call('deletepedido', { id: idStr });
        var erroPedido = !respPedido || respPedido.status === 'error';
        if (erroPedido) {
            throw new Error((respPedido && respPedido.message) || 'Falha ao excluir pedido');
        }

        if (typeof window.EventBus !== 'undefined')
            window.EventBus.emit('pedido:excluido', { id: idStr });

    } catch (e) {
        window._exibirErroGlobal(e, 'excluir pedido');
        Swal.fire({
            icon: 'error', title: 'Erro ao excluir',
            text: e.message || 'Não foi possível excluir o pedido.',
            confirmButtonColor: '#dc3545', customClass: { popup: 'rounded-4' }
        });
    }
};

window._extrairRotasParciais = function (texto) {
    var rotas = [];
    String(texto || '').split('\n').forEach(function (linha) {
        linha = linha.trim();
        if (!linha) return;

        // Linha completa: "De: X | Para: Y" (com qualquer separador)
        var mCompleta = linha.match(/De\s*:\s*(.+?)\s*(?:\||–|—|-|→)\s*Para\s*:\s*(.+)/i);
        if (mCompleta) {
            rotas.push({ de: mCompleta[1].replace(/^\d+[\.\)\-]\s*/, '').trim(), para: mCompleta[2].trim(), parcial: false });
            return;
        }
        var mCompleta2 = linha.match(/De\s*:\s*(.+?)\s+Para\s*:\s*(.+)/i);
        if (mCompleta2) {
            rotas.push({ de: mCompleta2[1].replace(/^\d+[\.\)\-]\s*/, '').trim(), para: mCompleta2[2].trim(), parcial: false });
            return;
        }

        // ✅ NOVO: linha só com "Para:"
        var mPara = linha.match(/^(?:\d+[\.\)\-]\s*)?Para\s*:\s*(.+)/i);
        if (mPara) { rotas.push({ de: '', para: mPara[1].trim(), parcial: true }); return; }

        // ✅ NOVO: linha só com "De:"
        var mDe = linha.match(/^(?:\d+[\.\)\-]\s*)?De\s*:\s*(.+)/i);
        if (mDe) { rotas.push({ de: mDe[1].trim(), para: '', parcial: true }); return; }
    });
    return rotas;
};

window.extrairRotasDaMensagem = function (texto) {
    return window._extrairRotasParciais(texto).filter(function (r) {
        return r.de && r.para;
    });
};

window._promessasGeocodificacaoEmAndamento = window._promessasGeocodificacaoEmAndamento || {};
window._cacheGeocodificacao = window._cacheGeocodificacao || {};

function _limparComplementoParaGeocoding(endereco) {
    return String(endereco || '')
        .replace(/,?\s*\b(sl|sala|apto|ap|bloco|bl|cs|casa|fundos|lj|loja)\b\s*[\w\/\-]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/,\s*,/g, ',')
        .trim();
}

function _gerarVariacoesEndereco(enderecoOriginal) {
    var variacoes = [];
    var limpo = _limparComplementoParaGeocoding(enderecoOriginal);

    variacoes.push(limpo);
    if (limpo !== enderecoOriginal) variacoes.push(enderecoOriginal);

    var semNumero = limpo.replace(/,?\s*\d+\s*,/, ',').replace(/,\s*,/g, ',').trim();
    if (semNumero && semNumero !== limpo) variacoes.push(semNumero);

    var partes = limpo.split(',').map(function (p) { return p.trim(); }).filter(Boolean);
    if (partes.length > 2) {
        var semUltimaParte = partes.slice(0, -1).join(', ');
        if (semUltimaParte && variacoes.indexOf(semUltimaParte) === -1) variacoes.push(semUltimaParte);
    }
    if (partes.length > 1) {
        var soPrimeiraEsegunda = partes.slice(0, 2).join(', ');
        if (soPrimeiraEsegunda && variacoes.indexOf(soPrimeiraEsegunda) === -1) variacoes.push(soPrimeiraEsegunda);
    }

    var comCidade = limpo.toLowerCase().includes('belo horizonte') || limpo.toLowerCase().includes(' mg')
        ? null
        : limpo + ', Belo Horizonte, MG';
    if (comCidade && variacoes.indexOf(comCidade) === -1) variacoes.push(comCidade);

    return variacoes.filter(function (v, i, arr) { return v && arr.indexOf(v) === i; });
}

function _tentarUmaVariacao(endereco) {
    return _geocodificarExterno(endereco).then(function (resultado) {
        if (resultado && !resultado.erro) return resultado;

        return _tentarPhoton(endereco, 8000).then(function (coordsPhoton) {
            if (coordsPhoton) return { lat: coordsPhoton.lat, lng: coordsPhoton.lng, erro: null, fonte: 'photon' };

            return _tentarNominatim(endereco, 8000).then(function (coordsNomi) {
                if (coordsNomi) return { lat: coordsNomi.lat, lng: coordsNomi.lng, erro: null, fonte: 'nominatim' };
                return resultado;
            });
        });
    });
}

function pareceEndereco(valor) {
    var norm = valor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return /\b(rua|av|avenida|alameda|al|praca|travessa|rodovia|estrada|rod)\b/.test(norm) && /\d/.test(norm);
}

function extrairEnderecosDoTexto(textoBruto) {
    return String(textoBruto || "")
        .split("\n")
        .map(function (l) { return l.trim(); })
        .filter(function (l) { return l && pareceEndereco(l); });
}

function _geocodificarComFallback(enderecoCompleto) {
    var variacoes = _gerarVariacoesEndereco(enderecoCompleto);
    var ultimoErro = null;

    function _tentarProxima(idx) {
        if (idx >= variacoes.length) {
            return Promise.resolve(ultimoErro || { lat: null, lng: null, erro: 'Endereço não encontrado em nenhuma variação.' });
        }
        return _tentarUmaVariacao(variacoes[idx]).then(function (resultado) {
            if (resultado && !resultado.erro) {
                if (idx > 0) resultado.aproximado = true;
                return resultado;
            }
            ultimoErro = resultado;
            return _tentarProxima(idx + 1);
        });
    }

    return _tentarProxima(0);
}

window.buscarCoordenadasEndereco = function (endereco) {
    var busca = String(endereco || '').trim();
    if (!busca) return Promise.resolve(null);

    var chaveCache = busca.toLowerCase();
    if (window._cacheGeocodificacao[chaveCache] !== undefined) {
        return Promise.resolve(window._cacheGeocodificacao[chaveCache]);
    }
    if (window._promessasGeocodificacaoEmAndamento[chaveCache]) {
        return window._promessasGeocodificacaoEmAndamento[chaveCache];
    }

    function _tentarBackendInterno() {
        return API.call('buscarenderecogeo', { endereco: busca })
            .then(function (resp) {
                if (resp && resp.status === 'success' && resp.encontrado && !resp.precisaGeocodificar && resp.lat && resp.lng) {
                    return { coords: { lat: parseFloat(resp.lat), lng: parseFloat(resp.lng), erro: null }, resolvidoInterno: true };
                }
                var enderecoParaBuscar = (resp && resp.endereco_sugerido) ? resp.endereco_sugerido : busca;
                return { enderecoParaBuscar: enderecoParaBuscar, resolvidoInterno: false };
            })
            .catch(function (e) {
                window._exibirErroGlobal(e, 'consultar endereço "' + busca + '" no backend');
                return { enderecoParaBuscar: busca, resolvidoInterno: false };
            });
    }

    function _comTimeoutDeSeguranca(promiseOriginal, ms) {
        var timeoutId;
        var promiseTimeout = new Promise(function (resolve) {
            timeoutId = setTimeout(function () {
                resolve({
                    lat: null, lng: null,
                    erro: 'Tempo limite excedido ao consultar o endereço (backend não respondeu em ' + (ms / 1000) + 's).',
                    enderecoOriginal: busca
                });
            }, ms);
        });

        return Promise.race([promiseOriginal, promiseTimeout]).finally(function () {
            clearTimeout(timeoutId);
        });
    }

    var promessaReal = _tentarBackendInterno().then(function (resultadoInterno) {
        if (resultadoInterno.resolvidoInterno) {
            window._cacheGeocodificacao[chaveCache] = resultadoInterno.coords;
            return resultadoInterno.coords;
        }

        return _geocodificarComFallback(resultadoInterno.enderecoParaBuscar).then(function (resultadoExterno) {
            if (!resultadoExterno || resultadoExterno.erro) {
                var falha = { lat: null, lng: null, erro: (resultadoExterno && resultadoExterno.erro) || 'Endereço não encontrado.', enderecoOriginal: busca };
                window._cacheGeocodificacao[chaveCache] = falha;
                return falha;
            }

            window._cacheGeocodificacao[chaveCache] = resultadoExterno;

            _salvarGeoSerializado({
                endereco_original: busca,
                lat: resultadoExterno.lat,
                lng: resultadoExterno.lng,
                cliente_solicitante: (window.AppRDO && window.AppRDO.clienteSelecionado) || '',
                origem_resolucao: resultadoExterno.fonte || 'geocodificado'
            });

            return resultadoExterno;
        });
    }).catch(function (e) {
        window._exibirErroGlobal(e, 'buscar/geocodificar endereço "' + busca + '"');
        var falha = { lat: null, lng: null, erro: e.message || 'Erro inesperado.', enderecoOriginal: busca };
        window._cacheGeocodificacao[chaveCache] = falha;
        return falha;
    });

    var promessa = _comTimeoutDeSeguranca(promessaReal, 35000).then(function (resultado) {
        delete window._promessasGeocodificacaoEmAndamento[chaveCache];
        return resultado;
    });

    window._promessasGeocodificacaoEmAndamento[chaveCache] = promessa;
    return promessa;
};

function _fetchGeoComTimeout(url, ms, headers) {
    return fetch(url, { signal: AbortSignal.timeout(ms), headers: headers || {} });
}

function _tentarPhoton(query, ms) {
    return _fetchGeoComTimeout(
        'https://photon.komoot.io/api/?limit=1&lat=-19.92&lon=-43.94&q=' + encodeURIComponent(query),
        ms
    )
        .then(function (resp) { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
        .then(function (data) {
            if (data && data.features && data.features.length > 0) {
                var coords = data.features[0].geometry.coordinates;
                return { lat: coords[1], lng: coords[0] };
            }
            return null;
        })
        .catch(function (e) { window._exibirErroGlobal(e, 'geocodificar via Photon'); return null; });
}

window._filaNominatim = window._filaNominatim || Promise.resolve();

function _tentarNominatimReal(query, ms) {
    return _fetchGeoComTimeout(
        'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(query),
        ms,
        { 'Accept-Language': 'pt-BR' }
    )
        .then(function (resp) { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
        .then(function (data) {
            return (data && data.length > 0) ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
        })
        .catch(function (e) { window._exibirErroGlobal(e, 'geocodificar via Nominatim'); return null; });
}

function _tentarNominatim(query, ms) {
    var resultado = window._filaNominatim.then(function () {
        return _tentarNominatimReal(query, ms).then(function (r) {
            return new Promise(function (resolve) {
                setTimeout(function () { resolve(r); }, 600);
            });
        });
    });
    window._filaNominatim = resultado.catch(function () { return null; });
    return resultado;
}

function _geocodificarExterno(busca) {
    return API.call('geocodificarendereco', { endereco: busca }).then(function (resp) {
        if (resp && resp.status === 'success' && resp.encontrado) {
            return { lat: resp.lat, lng: resp.lng, erro: null };
        }
        var motivo = (resp && resp.message) || 'Endereço não localizado pelo serviço de geocodificação.';
        return { lat: null, lng: null, erro: motivo };
    }).catch(function (e) {
        window._exibirErroGlobal(e, 'geocodificar endereço "' + busca + '"');
        return { lat: null, lng: null, erro: e.message || 'Falha de comunicação com o servidor.' };
    });
}

function _parseMoeda(valor) {
    return window._parseMoedaSeguro(valor);
}

function _formatarMoedaBR(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _resolverValor(pedido) {
    return _parseMoeda(pedido.valor_total || pedido.valor_corrida || pedido.valor_final || 0);
}

function _normalizarStatus(status) {
    var s = String(status || '').trim();
    return s.includes('/') ? s.split('/').pop().trim() : s;
}

function _formatarIdServico(id) {
    return typeof window._formatarNomeServico === 'function' ? window._formatarNomeServico(id) : String(id);
}

function _garantirModal(modalId, callback) {
    var modalEl = document.getElementById(modalId);
    if (modalEl) { callback(true); return; }
    callback(false);
}

function _renderizarTabela(pedidos) {
    if (typeof window._renderizarTabelaPedidos === 'function') window._renderizarTabelaPedidos(pedidos);
}

window.RDO_PEDIDOS.onEditarValorInput = function (input) {
    var valor = _parseMoeda(input.value);
    document.getElementById('edit-valor-base').value = valor;
    window.RDO_PEDIDOS.calcularEspera();
};

window.RDO_PEDIDOS.calcularEspera = function () {
    var tipo = (document.getElementById('edit-espera-tipo') || {}).value || 'sem_espera';
    var minutos = parseFloat((document.getElementById('edit-espera-minutos') || {}).value) || 0;
    var valorBase = _parseMoeda((document.getElementById('edit-valor-base') || {}).value);

    var boxMinutos = document.getElementById('box-espera-minutos');
    var boxResumo = document.getElementById('box-espera-resumo');
    var elFinal = document.getElementById('edit-espera-valor-final');

    var TARIFA_MIN = 0.60;
    var FRANQUIA_MIN = 10;

    if (tipo === 'sem_espera') {
        if (boxMinutos) boxMinutos.style.display = 'none';
        if (boxResumo) boxResumo.style.display = 'none';
        if (elFinal) elFinal.textContent = 'R$ ' + _formatarMoedaBR(valorBase);
        window.RDO_PEDIDOS._valorFinalCalculado = valorBase;
        window.RDO_PEDIDOS._taxaEsperaCalculada = 0;
        return;
    }

    if (boxMinutos) boxMinutos.style.display = 'block';

    var franquiaTotal = tipo === 'ambos' ? FRANQUIA_MIN * 2 : FRANQUIA_MIN;
    var minutosExcedentes = Math.max(0, minutos - franquiaTotal);
    var taxaEspera = minutosExcedentes * TARIFA_MIN;
    var valorFinal = valorBase + taxaEspera;

    if (elFinal) elFinal.textContent = 'R$ ' + _formatarMoedaBR(valorFinal);

    if (boxResumo) {
        boxResumo.style.display = 'block';
        var elOriginal = document.getElementById('resumo-valor-original');
        var elMin = document.getElementById('resumo-minutos');
        var elTaxa = document.getElementById('resumo-taxa');
        var elTotal = document.getElementById('resumo-total');
        if (elOriginal) elOriginal.textContent = 'R$ ' + _formatarMoedaBR(valorBase);
        if (elMin) elMin.textContent = minutosExcedentes + ' min';
        if (elTaxa) elTaxa.textContent = 'R$ ' + _formatarMoedaBR(taxaEspera);
        if (elTotal) elTotal.textContent = 'R$ ' + _formatarMoedaBR(valorFinal);
    }

    window.RDO_PEDIDOS._valorFinalCalculado = valorFinal;
    window.RDO_PEDIDOS._taxaEsperaCalculada = taxaEspera;
};

window.editarPedido = function (id) {
    var pedido = (window.AppRDO.pedidosCache || []).find(function (p) {
        return String(p.id || p._id || '').trim() === String(id).trim();
    });
    if (!pedido) { console.error('[pedidos.js] ❌ Pedido não encontrado:', id); return; }

    _garantirModal('modalEditarPedido', function (ok) {
        if (!ok) { console.error('[pedidos.js] ❌ #modalEditarPedido indisponível'); return; }

        var modalEl = document.getElementById('modalEditarPedido');

        document.querySelectorAll('.modal.show').forEach(function (m) {
            var inst = bootstrap.Modal.getInstance(m);
            if (inst) inst.hide();
        });

        function _s(elId, val) {
            var el = document.getElementById(elId);
            if (el) el.value = val != null ? String(val) : '';
            else console.warn('[pedidos.js] ⚠️ Campo ausente:', elId);
        }

        var valor = _resolverValor(pedido);
        var rotaDe = String(pedido.de || pedido.origem || pedido.endereco_coleta || '').trim();
        var rotaPara = String(pedido.para || pedido.destino || pedido.endereco_entrega || '').trim();

        _s('edit-pedido-id', id);
        _s('edit-valor-base', valor.toFixed(2));
        _s('edit-de', rotaDe);
        _s('edit-para', rotaPara);
        _s('edit-obs', pedido.observacao || '');
        _s('edit-valor-pedido-display', _formatarMoeda(valor));
        _s('edit-espera-tipo', pedido.espera_tipo || 'sem_espera');
        _s('edit-espera-minutos', pedido.espera_minutos || '');

        _s('esp-cliente', _resolverNomeCliente(pedido));
        _s('esp-mercadoria', pedido.mercadoria || '—');
        _s('esp-retorno', String(pedido.retorno || 'Não').trim());
        _s('esp-prioridade', _labelPrioridade(pedido.prioridade));

        var tituloEl = document.getElementById('editar-titulo');
        if (tituloEl) tituloEl.textContent = _formatarIdServico(id);

        var errEl = document.getElementById('edit-error-msg');
        if (errEl) errEl.classList.add('d-none');

        setTimeout(function () {
            if (typeof window.RDO_PEDIDOS.calcularEspera === 'function')
                window.RDO_PEDIDOS.calcularEspera();
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
            _ativarDestaqueValor();
        }, 50);
    });
};

window.RDO_PEDIDOS.salvarEdicao = function () {
    var btnSalvar = document.getElementById('btn-salvar-edicao') || document.getElementById('btn-salvar-valor-pedido');
    var errEl = document.getElementById('edit-error-msg');

    if (errEl) errEl.classList.add('d-none');

    var pedidoId = (document.getElementById('edit-pedido-id') || {}).value || '';
    var valorBase = _parseMoeda((document.getElementById('edit-valor-base') || {}).value);
    var tipo = (document.getElementById('edit-espera-tipo') || {}).value || 'sem_espera';
    var minutos = parseInt((document.getElementById('edit-espera-minutos') || {}).value || '0', 10) || 0;

    if (!pedidoId) {
        if (errEl) { errEl.textContent = 'ID do pedido não encontrado.'; errEl.classList.remove('d-none'); }
        return;
    }

    var pontos = tipo === 'ambos' ? 2 : 1;
    var franquiaTotal = FRANQUIA_MIN * pontos;
    var excedente = (tipo !== 'sem_espera' && minutos > 0) ? Math.max(0, minutos - franquiaTotal) : 0;
    var taxa = excedente * TARIFA_MIN;
    var valorFinal = valorBase + taxa;

    var payload = {
        id_cliente: String((window.AppRDO && window.AppRDO.clienteId) || ''),
        solicitante: solicitante,
        contato: contato,
        horario: horario,
        mercadoria: mercadoria,
        rotas_texto: rotasTexto,
        de: deStr,
        para: paraStr,
        distancia: distancia.toFixed(2),
        tempo: tempo,
        obs: obs,
        valor_km: valorKm,
        retorno: retorno,
        dinamica: dinamica,
        prioridade: prioridade,
        valor_corrida: valorTotal,
        valor_final: valorTotal,
        status: 'PENDENTE',
        situacao_financeira: 'PENDENTE',
        texto: mensagemProvisoria,
        data: dados.dataPedido || ''
    };

    _setBotaoLoading(btnSalvar, true);

    API.call('updatepedido', payload)
        .then(function (res) {
            if (res && res.status === 'error') throw new Error(res.message || 'Erro ao salvar');

            var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
            var pedido = cache.find(function (p) {
                return String(p.id || '').trim() === String(pedidoId).trim();
            });
            if (pedido) {
                Object.assign(pedido, {
                    de: payload.de,
                    para: payload.para,
                    observacao: payload.observacao,
                    espera_tipo: payload.espera_tipo,
                    espera_minutos: payload.espera_minutos,
                    taxa_espera: payload.taxa_espera,
                    valor_corrida: payload.valor_corrida,
                    valor_total: payload.valor_total,
                    valor_final: payload.valor_final
                });
            }

            _renderizarTabela(window.AppRDO.pedidosCache);

            var modalEl = document.getElementById('modalEditarPedido');
            if (modalEl) {
                var inst = bootstrap.Modal.getInstance(modalEl);
                if (inst) inst.hide();
            }

            if (typeof window.EventBus !== 'undefined')
                window.EventBus.emit('pedido:atualizado', {
                    id: _pedidoId,
                    valor_final: valorFinalPedido,
                    valor_total: valorFinalPedido,
                    valor_corrida: valorFinalPedido,
                    motoboy: motoboyNome,
                    data_pedido: pedidoConcluido
                        ? (pedidoConcluido.data_lancamento || pedidoConcluido.dataLancamento || pedidoConcluido.updated_at || '')
                        : ''
                });

            if (typeof Swal !== 'undefined')
                Swal.fire({
                    icon: 'success', title: 'Pedido atualizado!',
                    toast: true, timer: 2000, position: 'top-end', showConfirmButton: false
                });
        })
        .catch(function (err) {
            console.error('[pedidos.js] ❌ salvarEdicao:', err);
            if (errEl) { errEl.textContent = err.message || 'Falha ao salvar.'; errEl.classList.remove('d-none'); }
        })
        .finally(function () {
            _setBotaoLoading(btnSalvar, false, 'bi bi-check-lg', 'SALVAR');
        });
};

window.RDO_PEDIDOS.salvarValorPedido = function () {
    var btnSalvar = document.getElementById('btn-salvar-valor-pedido');
    if (btnSalvar && btnSalvar.disabled) return;

    var errEl = document.getElementById('edit-error-msg');
    if (errEl) errEl.classList.add('d-none');

    window.RDO_PEDIDOS.calcularEspera();

    var pedidoId = (document.getElementById('edit-pedido-id') || {}).value || '';
    var valorBase = _parseMoeda((document.getElementById('edit-valor-base') || {}).value);
    var tipoEspera = (document.getElementById('edit-espera-tipo') || {}).value || 'sem_espera';
    var minutosEspera = parseFloat((document.getElementById('edit-espera-minutos') || {}).value) || 0;
    var taxaEspera = window.RDO_PEDIDOS._taxaEsperaCalculada || 0;
    var valorFinal = window.RDO_PEDIDOS._valorFinalCalculado != null
        ? window.RDO_PEDIDOS._valorFinalCalculado
        : valorBase;
    var de = (document.getElementById('edit-de') || {}).value || '';
    var para = (document.getElementById('edit-para') || {}).value || '';
    var obs = (document.getElementById('edit-obs') || {}).value || '';

    if (!pedidoId) {
        if (errEl) { errEl.textContent = 'ID do pedido não encontrado.'; errEl.classList.remove('d-none'); }
        return;
    }
    if (!valorBase || valorBase <= 0) {
        if (errEl) { errEl.textContent = 'Informe um valor válido.'; errEl.classList.remove('d-none'); }
        return;
    }

    var textoOriginalBtn = btnSalvar ? btnSalvar.innerHTML : '';
    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Salvando...';
    }

    API.call('updatepedido', {
        id: pedidoId,
        valor_total: valorBase,
        valor_corrida: valorBase,
        valor_final: valorFinal,
        taxa_espera: taxaEspera,
        espera_tipo: tipoEspera,
        espera_minutos: minutosEspera,
        de: de,
        para: para,
        obs: obs
    })
        .then(function (res) {
            if (res && res.status === 'error') throw new Error(res.message || 'Erro ao salvar');

            var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
            var pedido = cache.find(function (p) {
                return String(p.id || '').trim() === String(pedidoId).trim();
            });
            if (pedido) {
                pedido.valor_total = valorBase;
                pedido.valor_final = valorFinal;
                pedido.valor_corrida = valorBase;
                pedido.taxa_espera = taxaEspera;
                pedido.espera_tipo = tipoEspera;
                pedido.espera_minutos = minutosEspera;
                pedido.de = de;
                pedido.para = para;
                pedido.obs = obs;
            }

            _renderizarTabela(window.AppRDO.pedidosCache);

            var modalEl = document.getElementById('modalEditarPedido');
            if (modalEl) {
                var inst = bootstrap.Modal.getInstance(modalEl);
                if (inst) inst.hide();
            }

            if (typeof window.EventBus !== 'undefined')
                window.EventBus.emit('pedido:atualizado', {
                    id: pedidoId, valor_total: valorBase, valor_final: valorFinal
                });

            if (typeof Swal !== 'undefined')
                Swal.fire({
                    icon: 'success', title: 'Pedido atualizado!',
                    toast: true, timer: 2000, position: 'top-end', showConfirmButton: false
                });
        })
        .catch(function (err) {
            console.error('[pedidos.js] ❌ salvarValorPedido:', err);
            if (errEl) { errEl.textContent = err.message || 'Falha ao salvar.'; errEl.classList.remove('d-none'); }
        })
        .finally(function () {
            if (btnSalvar) {
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = textoOriginalBtn || '<i class="bi bi-check-lg me-1"></i>Salvar';
            }
        });
};

window.processarRotasEAbrirMapa = function (dadosBase, rotasExtraidas) {
    if (window.AppRDO._mapaModalAberto) return;
    if (window.AppRDO.isProcessingCheckout) return;

    if (!rotasExtraidas || rotasExtraidas.length === 0) {
        window.exibirModalValidacao(
            'Nenhuma rota informada.<br>Selecione ao menos um endereço de <strong>De</strong> e <strong>Para</strong>.',
            { titulo: 'Rota inválida', icone: 'bi-signpost-split-fill' }
        );
        return;
    }

    var solicitante = String(dadosBase.solicitante || 'Não informado').trim();
    var dataPedido = String(dadosBase.dataPedido || '').trim();
    var contato = String(dadosBase.contato || '').trim();
    var horario = String(dadosBase.horario || '').trim();
    var mercadoria = String(dadosBase.mercadoria || 'ENTREGA').trim().toUpperCase();
    var obs = String(dadosBase.obs || '').trim();

    window.AppRDO._mapaModalAberto = true;
    window.AppRDO.isProcessingCheckout = true;

    function _falharAbertura(mensagem) {
        window.AppRDO._mapaModalAberto = false;
        window.AppRDO.isProcessingCheckout = false;
        try {
            Swal.fire({
                icon: 'error', title: 'Erro ao abrir mapa',
                html: '<div style="font-size:.9rem;">' + (mensagem || 'Não foi possível abrir o modal de rotas.') + '</div>',
                confirmButtonText: 'Fechar', confirmButtonColor: '#dc3545',
                customClass: { popup: 'rounded-4' }
            });
        } catch (_) { alert(mensagem || 'Erro ao abrir modal de rotas.'); }
    }

    window.loadModal('mapa_clientes.html').then(function (carregou) {
        try {
            if (!carregou) { _falharAbertura('Falha ao carregar mapa_clientes.html.'); return; }

            var meuTokenCheckout = window.AppRDO._checkoutToken;
            var modalEl = document.getElementById('modalMapa');
            if (!modalEl) { _falharAbertura('#modalMapa não encontrado.'); return; }

            if (modalEl.parentElement !== document.body) document.body.appendChild(modalEl);

            try {
                var existente = bootstrap.Modal.getInstance(modalEl);
                if (existente) existente.dispose();
            } catch (e) { window._exibirErroGlobal(e, 'liberar modal de mapa'); }
            if (typeof _limparBackdrop === 'function') _limparBackdrop();

            modalEl.addEventListener('hidden.bs.modal', function () {
                window.AppRDO._mapaModalAberto = false;
                window.AppRDO.isProcessingCheckout = false;
                if (window._leafletMapInstance) {
                    try { window._leafletMapInstance.remove(); } catch (e) { window._exibirErroGlobal(e, 'remover mapa'); }
                    window._leafletMapInstance = null;
                }
            }, { once: true });

            modalEl.addEventListener('hidden.bs.modal', function () {
                if (typeof _limparBackdrop === 'function') _limparBackdrop();
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, { once: true });

            var modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

            modalEl.addEventListener('shown.bs.modal', function () {
                try {
                    modalEl.style.zIndex = '1075';
                    var backdrops = document.querySelectorAll('.modal-backdrop');
                    var ultimoBackdrop = backdrops[backdrops.length - 1];
                    if (ultimoBackdrop) ultimoBackdrop.style.zIndex = '1070';

                    var elSolicitante = document.getElementById('header-nome-solicitante');
                    var loaderEl = document.getElementById('mapa-loader');
                    if (elSolicitante) elSolicitante.innerText = solicitante;
                    if (loaderEl) {
                        loaderEl.style.display = '';
                        loaderEl.innerHTML = '<div class="spinner-border spinner-border-sm text-danger"></div><p class="text-muted small mb-0 mt-2">Calculando rotas...</p>';
                    }

                    var footer = document.getElementById('footer-resumo-dados');
                    if (footer) footer.innerHTML = '';

                    var kmTotal = 0, minTotal = 0, listaCaminhos = [];
                    var rotasComFalha = [];

                    function _coletarEnderecosUnicos(rotas) {
                        var mapa = {}, lista = [];
                        rotas.forEach(function (rota) {
                            [rota.de, rota.para].forEach(function (end) {
                                var chave = String(end || '').trim().toLowerCase();
                                if (chave && !mapa[chave]) { mapa[chave] = true; lista.push(end); }
                            });
                        });
                        return lista;
                    }

                    function _geocodificarTodosUnicos(rotas) {
                        var enderecosUnicos = _coletarEnderecosUnicos(rotas);
                        return Promise.all(
                            enderecosUnicos.map(function (end) {
                                return window.buscarCoordenadasEndereco(end).then(function (coords) {
                                    return { endereco: end, coords: coords };
                                });
                            })
                        ).then(function (resultados) {
                            var mapaCoords = {};
                            resultados.forEach(function (r) { mapaCoords[String(r.endereco || '').trim().toLowerCase()] = r.coords; });
                            return mapaCoords;
                        });
                    }

                    function _sanitizarCoord(valor) {
                        var num = parseFloat(String(valor).replace(',', '.'));
                        if (isNaN(num)) return null;
                        if (Math.abs(num) > 180) {
                            var str = String(Math.trunc(num));
                            var negativo = str.startsWith('-');
                            var digitos = negativo ? str.slice(1) : str;
                            num = parseFloat((negativo ? '-' : '') + digitos.slice(0, 2) + '.' + digitos.slice(2));
                        }
                        return isNaN(num) ? null : num;
                    }

                    function _fetchComTimeout(url, ms) { return fetch(url, { signal: AbortSignal.timeout(ms) }); }

                    var _filaOsrm = Promise.resolve();
                    function _enfileirarOsrm(fn) {
                        var resultado = _filaOsrm.then(function () {
                            return fn().then(function (r) {
                                return new Promise(function (resolve) { setTimeout(function () { resolve(r); }, 300); });
                            });
                        });
                        _filaOsrm = resultado.catch(function () { return null; });
                        return resultado;
                    }

                    function _processarRota(rota, idx, mapaCoords) {
                        var p1raw = mapaCoords[String(rota.de || '').trim().toLowerCase()];
                        var p2raw = mapaCoords[String(rota.para || '').trim().toLowerCase()];
                        var p1 = p1raw ? { lat: _sanitizarCoord(p1raw.lat), lng: _sanitizarCoord(p1raw.lng) } : null;
                        var p2 = p2raw ? { lat: _sanitizarCoord(p2raw.lat), lng: _sanitizarCoord(p2raw.lng) } : null;

                        if (!p1 || p1.lat === null || p1.lng === null) {
                            rotasComFalha.push({ indice: idx + 1, endereco: rota.de, motivo: (p1raw && p1raw.erro) || 'Endereço de origem não localizado.' });
                            return Promise.resolve();
                        }
                        if (!p2 || p2.lat === null || p2.lng === null) {
                            rotasComFalha.push({ indice: idx + 1, endereco: rota.para, motivo: (p2raw && p2raw.erro) || 'Endereço de destino não localizado.' });
                            return Promise.resolve();
                        }

                        return _enfileirarOsrm(function () {
                            return _fetchComTimeout(
                                'https://router.project-osrm.org/route/v1/driving/' +
                                p1.lng.toFixed(6) + ',' + p1.lat.toFixed(6) + ';' + p2.lng.toFixed(6) + ',' + p2.lat.toFixed(6) +
                                '?overview=full&geometries=geojson', 6000
                            );
                        })
                            .then(function (resp) {
                                if (!resp || !resp.ok) {
                                    return (resp ? resp.json().catch(function () { return null; }) : Promise.resolve(null)).then(function (body) {
                                        var motivo = (body && body.code === 'NoRoute')
                                            ? 'Nenhuma rota rodoviária encontrada.'
                                            : 'HTTP ' + (resp ? resp.status : '?') + ' ao calcular rota ' + (idx + 1);
                                        throw new Error(motivo);
                                    });
                                }
                                return resp.json();
                            })
                            .then(function (data) {
                                if (data && data.routes && data.routes[0]) {
                                    kmTotal += data.routes[0].distance / 1000;
                                    minTotal += data.routes[0].duration / 60;
                                    listaCaminhos.push(data.routes[0].geometry.coordinates.map(function (c) { return [c[1], c[0]]; }));
                                } else {
                                    rotasComFalha.push({ indice: idx + 1, endereco: rota.de + ' → ' + rota.para, motivo: 'Rota não encontrada pelo serviço de mapas.' });
                                }
                            })
                            .catch(function (e) {
                                window._exibirErroGlobal(e, 'calcular rota ' + (idx + 1));
                                rotasComFalha.push({ indice: idx + 1, endereco: rota.de + ' → ' + rota.para, motivo: e.message || 'Erro ao calcular rota.' });
                            });
                    }

                    _geocodificarTodosUnicos(rotasExtraidas)
                        .then(function (mapaCoords) {
                            return Promise.all(rotasExtraidas.map(function (rota, idx) { return _processarRota(rota, idx, mapaCoords); }));
                        })
                        .then(function () {
                            if (meuTokenCheckout !== window.AppRDO._checkoutToken) return;

                            if (listaCaminhos.length === 0) {
                                var motivoPrincipal = (rotasComFalha[0] && rotasComFalha[0].motivo) || 'Verifique os endereços.';
                                if (loaderEl) {
                                    loaderEl.style.display = '';
                                    loaderEl.innerHTML = '<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>' + motivoPrincipal + '</p>';
                                }
                                window.AppRDO.isProcessingCheckout = false;
                                return;
                            }

                            var kmArredondado = Math.round(kmTotal);
                            var valorCalculado = kmArredondado * 3.00;
                            var destinoFinal = (rotasExtraidas && rotasExtraidas.length > 0) ? rotasExtraidas[rotasExtraidas.length - 1].para : '';

                            window.dadosPedidoAtual = {
                                solicitante: solicitante,
                                contato: contato,
                                horario: horario,
                                mercadoria: mercadoria,
                                para: destinoFinal,
                                obs: obs,
                                dataPedido: dataPedido,
                                cliente: (window.AppRDO ? window.AppRDO.clienteSelecionado : null) || localStorage.getItem('clienteSelecionadoNome') || 'N/A',
                                distanciaTotal: kmArredondado,
                                tempoTotal: Math.round(minTotal),
                                coordenadas: listaCaminhos,
                                valorEstimado: valorCalculado,
                                rotasProcessadas: rotasExtraidas,
                                rawInput: dadosBase.rawInput || ''
                            };

                            if (loaderEl) loaderEl.style.display = 'none';

                            window._renderizarResumo(kmArredondado, minTotal, valorCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                            window.renderizarMapaUnificado();
                            window.AppRDO.isProcessingCheckout = false;

                            if (rotasComFalha.length > 0) {
                                var listaErros = rotasComFalha.map(function (f) {
                                    return '• Rota ' + f.indice + ' (<strong>' + (f.endereco || 'endereço') + '</strong>): ' + f.motivo;
                                }).join('<br>');
                                Swal.fire({
                                    icon: 'warning', title: 'Não foi possível geolocalizar algumas rotas',
                                    html: '<div style="font-size:.85rem;text-align:left;">' + listaErros + '</div><hr>O valor exibido considera apenas as rotas encontradas.',
                                    confirmButtonColor: '#dc3545'
                                });
                            }
                        })
                        .catch(function (e) {
                            if (meuTokenCheckout !== window.AppRDO._checkoutToken) return;
                            window._exibirErroGlobal(e, 'calcular rotas do pedido');
                            window.AppRDO.isProcessingCheckout = false;
                            if (loaderEl) {
                                loaderEl.style.display = '';
                                loaderEl.innerHTML = '<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Erro ao calcular rotas.</p>';
                            }
                        });
                } catch (eShown) {
                    window._exibirErroGlobal(eShown, 'preparar exibição do modal de mapa');
                    window.AppRDO.isProcessingCheckout = false;
                }
            }, { once: true });

            modal.show();
        } catch (eCarregou) {
            window._exibirErroGlobal(eCarregou, 'processar carregamento do modal de mapa');
            _falharAbertura(eCarregou.message);
        }
    }).catch(function (eLoad) {
        window._exibirErroGlobal(eLoad, 'carregar modal de mapa (Promise rejeitada)');
        _falharAbertura(eLoad.message);
    });
};

window.RotaRapida = (function () {
    var enderecosCache = [];
    var enderecosPorCliente = {};
    var carregado = false;

    function _normalizar(str) {
        return String(str || '').trim().toLowerCase();
    }

    async function _carregarEnderecos() {
        if (carregado) return;
        try {
            var resp = await API.call('getenderecosgeo');

            // ✅ Aceita tanto array direto quanto { data: [...] }
            var lista;
            if (Array.isArray(resp)) {
                lista = resp;
            } else if (resp && Array.isArray(resp.data)) {
                lista = resp.data;
            } else {
                lista = [];
            }

            enderecosCache = lista;

            console.log('[RotaRapida] Endereços carregados:', enderecosCache.length, enderecosCache);

            enderecosPorCliente = {};
            enderecosCache.forEach(function (e) {
                var cli = _normalizar(e.cliente_solicitante);
                if (!cli) return;
                if (!enderecosPorCliente[cli]) enderecosPorCliente[cli] = [];
                enderecosPorCliente[cli].push(e);
            });

            carregado = true;
        } catch (e) {
            window._exibirErroGlobal(e, 'carregar endereços salvos');
            carregado = false; // ✅ permite tentar novamente na próxima abertura do modal
        }
    }

    function _listaEnderecosCliente(nomeCliente) {
        var chave = _normalizar(nomeCliente);
        var lista = enderecosPorCliente[chave] || [];
        return lista.slice().sort(function (a, b) {
            return (parseInt(b.qtd_usos, 10) || 0) - (parseInt(a.qtd_usos, 10) || 0);
        });
    }

    function _sugerirDeParaIndice(nomeCliente, indice) {
        var lista = _listaEnderecosCliente(nomeCliente);
        if (lista.length === 0) return '';
        var item = lista[indice % lista.length];
        return item ? item.endereco_original : '';
    }

    function _renderizarLista(listaEl, termo, inputEl) {
        var termoNorm = _normalizar(termo);
        var resultados = enderecosCache.filter(function (e) {
            return _normalizar(e.endereco_original).includes(termoNorm);
        }).slice(0, 8);

        var html = '';
        resultados.forEach(function (e) {
            var tag = e.cliente_solicitante ? '<span class="rr-item-tag">' + e.cliente_solicitante + '</span>' : '';
            html += '<div class="rr-item" data-endereco="' + e.endereco_original.replace(/"/g, '&quot;') + '" data-lat="' + (e.lat || '') + '" data-lng="' + (e.lng || '') + '">' + tag + e.endereco_original + '</div>';
        });

        if (termo && termo.trim().length > 2) {
            html += '<div class="rr-item rr-item-novo" data-endereco="' + termo.replace(/"/g, '&quot;') + '"><i class="bi bi-plus-circle me-1"></i>Usar endereço: "' + termo + '"</div>';
        }

        listaEl.innerHTML = html || '<div class="rr-item text-muted">Nenhum endereço encontrado</div>';
        if (html) listaEl.classList.add('show');

        listaEl.querySelectorAll('.rr-item[data-endereco]').forEach(function (item) {
            item.addEventListener('click', function () {
                inputEl.value = item.getAttribute('data-endereco');
                inputEl.dataset.lat = item.getAttribute('data-lat') || '';
                inputEl.dataset.lng = item.getAttribute('data-lng') || '';
                listaEl.classList.remove('show');
            });
        });
    }

    function _ativarAutocomplete(inputEl, listaEl) {
        if (!inputEl || !listaEl) return;
        inputEl.addEventListener('input', function () {
            inputEl.dataset.lat = '';
            inputEl.dataset.lng = '';
            _renderizarLista(listaEl, inputEl.value, inputEl);
        });
        inputEl.addEventListener('focus', function () { _renderizarLista(listaEl, inputEl.value, inputEl); });
        document.addEventListener('click', function (e) {
            if (!listaEl.contains(e.target) && e.target !== inputEl) listaEl.classList.remove('show');
        });
    }

    function _criarLinhaRota(de, para) {
        var container = document.getElementById('rr-rotas-container');
        if (!container) return;

        var item = document.createElement('div');
        item.className = 'rr-rota-item border rounded-3 p-3 mb-3 position-relative';
        item.innerHTML =
            '<button type="button" class="btn-close btn-sm position-absolute top-0 end-0 m-2 rr-btn-remover-rota"></button>' +
            '<div class="row g-2 align-items-start">' +
            '<div class="col-6 position-relative rr-autocomplete-wrapper d-flex flex-column">' +
            '<label class="form-label small fw-bold mb-1" style="min-height:20px;line-height:20px;">🚩 De</label>' +
            '<input type="text" class="form-control form-control-sm rr-de-input" autocomplete="off">' +
            '<div class="rr-dropdown-lista rr-de-lista"></div>' +
            '</div>' +
            '<div class="col-6 position-relative rr-autocomplete-wrapper d-flex flex-column">' +
            '<label class="form-label small fw-bold mb-1" style="min-height:20px;line-height:20px;">🏁 Para</label>' +
            '<input type="text" class="form-control form-control-sm rr-para-input" autocomplete="off">' +
            '<div class="rr-dropdown-lista rr-para-lista"></div>' +
            '</div>' +
            '</div>';

        container.appendChild(item);

        var deInput = item.querySelector('.rr-de-input');
        var paraInput = item.querySelector('.rr-para-input');
        var deLista = item.querySelector('.rr-de-lista');
        var paraLista = item.querySelector('.rr-para-lista');

        deInput.value = de || '';
        paraInput.value = para || '';

        _ativarAutocomplete(deInput, deLista);
        _ativarAutocomplete(paraInput, paraLista);

        item.querySelector('.rr-btn-remover-rota').addEventListener('click', function () {
            if (container.querySelectorAll('.rr-rota-item').length <= 1) return;
            item.remove();
        });

        return item;
    }

    function _limparRotas() {
        var container = document.getElementById('rr-rotas-container');
        if (container) container.innerHTML = '';
    }

    function _coletarRotas() {
        var itens = document.querySelectorAll('#rr-rotas-container .rr-rota-item');
        var rotas = [];
        itens.forEach(function (item) {
            var de = (item.querySelector('.rr-de-input') || {}).value || '';
            var para = (item.querySelector('.rr-para-input') || {}).value || '';
            if (de.trim() && para.trim()) rotas.push({ de: de.trim(), para: para.trim() });
        });
        return rotas;
    }

    function parseMensagem(texto) {
        var dados = { solicitante: '', contato: '', mercadoria: '', observacao: '', rotas: [] };
        var linhasBrutas = String(texto || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        var linhasRestantes = [];

        linhasBrutas.forEach(function (linha) {
            if (/^SOLICITANTE\s*:/i.test(linha)) dados.solicitante = linha.split(':').slice(1).join(':').trim();
            else if (/^CONTATO\s*:/i.test(linha)) dados.contato = linha.split(':').slice(1).join(':').trim();
            else if (/^MERCADORIA\s*:/i.test(linha)) dados.mercadoria = linha.split(':').slice(1).join(':').trim();
            else if (/^OBSERVA[ÇC][ÃA]O\s*:/i.test(linha)) dados.observacao = linha.split(':').slice(1).join(':').trim();
            else linhasRestantes.push(linha);
        });

        function _pareceLinhaDeRota(linha) {
            return /de\s*:/i.test(linha) || /para\s*:/i.test(linha);
        }

        function _pareceEndereco(linha) {
            return /\d/.test(linha);
        }

        if (!dados.solicitante) {
            var idxCandidata = linhasRestantes.findIndex(function (l) { return !_pareceLinhaDeRota(l); });
            if (idxCandidata !== -1) {
                dados.solicitante = linhasRestantes[idxCandidata];
                linhasRestantes.splice(idxCandidata, 1);
            }
        }

        if (!dados.contato && linhasRestantes.length > 0) {
            var candidataContato = linhasRestantes[0];
            if (!_pareceLinhaDeRota(candidataContato) && !_pareceEndereco(candidataContato)) {
                dados.contato = candidataContato;
                linhasRestantes.splice(0, 1);
            }
        }

        var temFormatoExplicito = linhasRestantes.some(_pareceLinhaDeRota);

        if (temFormatoExplicito) {
            dados.rotas = window._extrairRotasParciais(linhasRestantes.join('\n'));
        } else if (linhasRestantes.length > 0) {
            var rotasSequenciais = [];
            for (var i = 0; i < linhasRestantes.length; i += 2) {
                var de = linhasRestantes[i] || '';
                var para = linhasRestantes[i + 1] || '';
                rotasSequenciais.push({ de: de, para: para, parcial: !para });
            }
            dados.rotas = rotasSequenciais;
        }

        return dados;
    }

    function preencherFormulario(dados) {
        var elSolic = document.getElementById('rr-solicitante');
        var elContato = document.getElementById('rr-contato');
        var elMerc = document.getElementById('rr-mercadoria');
        var elObs = document.getElementById('rr-obs');

        if (elSolic) elSolic.value = dados.solicitante || '';
        if (elContato) elContato.value = dados.contato || '';
        if (elMerc) elMerc.value = dados.mercadoria || 'ENTREGA';
        if (elObs) elObs.value = dados.observacao || '';

        _limparRotas();

        var inputData = document.getElementById('rr-data-pedido');
        if (inputData) {
            var hojeISO = new Date().toISOString().split('T')[0];
            inputData.max = hojeISO;
            if (!inputData.value) inputData.value = hojeISO;

            // remove listener anterior, se existir
            if (inputData._handlerValidarData) {
                inputData.removeEventListener('change', inputData._handlerValidarData);
            }

            inputData._handlerValidarData = function () {
                var v = _validarDataRetroativa(inputData.value);
                var erroBox = document.getElementById('rr-erro-box');
                if (!v.valido) {
                    inputData.value = hojeISO;
                    if (erroBox) {
                        erroBox.textContent = v.mensagem;
                        erroBox.classList.remove('d-none');
                    }
                } else if (erroBox) {
                    erroBox.classList.add('d-none');
                }
            };

            inputData.addEventListener('change', inputData._handlerValidarData);
        }

        var nomeCliente = dados.solicitante || '';
        var rotas = dados.rotas && dados.rotas.length > 0 ? dados.rotas : [{ de: '', para: '' }];

        rotas.forEach(function (rota, idx) {
            var de = rota.de || '';
            var para = rota.para || '';

            // ✅ Regra: o lado que faltar é buscado no banco pelo nome do cliente
            if (!de && !para) {
                de = _sugerirDeParaIndice(nomeCliente, idx);
                para = _sugerirDeParaIndice(nomeCliente, idx + 1);
            } else if (!de) {
                de = _sugerirDeParaIndice(nomeCliente, idx);
            } else if (!para) {
                para = _sugerirDeParaIndice(nomeCliente, idx);
            }

            _criarLinhaRota(de, para);
        });
    }

    async function abrir(mensagemTexto) {
        await _carregarEnderecos();

        var carregou = await window.loadModal('modal_rota_rapida.html');
        if (!carregou) {
            window._exibirErroGlobal('Falha ao carregar modal_rota_rapida.html', 'abrir rota rápida');
            return;
        }

        var modalEl = document.getElementById('modalRotaRapida');
        if (!modalEl) {
            window._exibirErroGlobal('Modal não encontrado no DOM após loadModal', 'abrir rota rápida');
            return;
        }

        if (modalEl.parentElement !== document.body) document.body.appendChild(modalEl);

        try { var ex = bootstrap.Modal.getInstance(modalEl); if (ex) ex.dispose(); } catch (e) { window._exibirErroGlobal(e, 'liberar modal existente'); }

        var erroBoxInicial = document.getElementById('rr-erro-box');
        if (erroBoxInicial) erroBoxInicial.classList.add('d-none');

        var nomeAtual = (window.AppRDO && window.AppRDO.clienteSelecionado) || '';

        function _setVal(id, valor) {
            var el = document.getElementById(id);
            if (el) el.value = valor;
        }

        if (mensagemTexto && mensagemTexto.trim()) {
            var dados = parseMensagem(mensagemTexto);
            if (!dados.solicitante && nomeAtual) dados.solicitante = nomeAtual;
            preencherFormulario(dados);
        } else {
            _setVal('rr-solicitante', nomeAtual);
            _setVal('rr-contato', '');
            _setVal('rr-mercadoria', 'ENTREGA');
            _setVal('rr-obs', '');
            _limparRotas();

            var deSugerido = _sugerirDeParaIndice(nomeAtual, 0);
            _criarLinhaRota(deSugerido, '');
        }

        var solicitanteInput = document.getElementById('rr-solicitante');
        if (solicitanteInput) {
            solicitanteInput.addEventListener('blur', function () {
                var itens = document.querySelectorAll('#rr-rotas-container .rr-rota-item');
                itens.forEach(function (item, idx) {
                    var deInput = item.querySelector('.rr-de-input');
                    if (deInput && !deInput.value.trim()) {
                        deInput.value = _sugerirDeParaIndice(solicitanteInput.value, idx);
                    }
                });
            });
        }

        var btnAdd = document.getElementById('rr-btn-add-rota');
        if (btnAdd) {
            btnAdd.addEventListener('click', function () {
                var qtd = document.querySelectorAll('#rr-rotas-container .rr-rota-item').length;
                var deSugerido = _sugerirDeParaIndice(solicitanteInput ? solicitanteInput.value : '', qtd);
                _criarLinhaRota(deSugerido, '');
            });
        }

        var modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });
        modal.show();
    }

    async function _salvarEnderecoSeNovo(inputEl, clienteSolicitante) {
        var valor = (inputEl.value || '').trim();
        if (!valor) return;
        if (inputEl.dataset.lat && inputEl.dataset.lng) return;

        try {
            var geo = await API.call('geocodificarendereco', { endereco: valor });
            if (geo && geo.encontrado) {
                await API.call('salvarenderecogeo', {
                    endereco_original: valor,
                    lat: geo.lat,
                    lng: geo.lng,
                    cliente_solicitante: clienteSolicitante,
                    origem_resolucao: geo.fonte || 'geocodificado'
                });
                carregado = false;
            }
        } catch (e) {
            window._exibirErroGlobal(e, 'salvar endereço geocodificado');
        }
    }


    function avancar() {
        var solicitante = (document.getElementById('rr-solicitante') || {}).value || '';
        var dataPedido = (document.getElementById('rr-data-pedido') || {}).value || '';
        var erroBox = document.getElementById('rr-erro-box');

        if (!solicitante.trim()) {
            window.marcarCampoFormInvalido(document.getElementById('rr-solicitante'));
            if (erroBox) {
                erroBox.textContent = 'Informe o nome do cliente.';
                erroBox.classList.remove('d-none');
            }
            return;
        }

        var validacaoData = _validarDataRetroativa(dataPedido);
        if (!validacaoData.valido) {
            window.marcarCampoFormInvalido(document.getElementById('rr-data-pedido'));
            if (erroBox) {
                erroBox.textContent = validacaoData.mensagem;
                erroBox.classList.remove('d-none');
            }
            return;
        }

        var rotas = _coletarRotas();
        if (rotas.length === 0) {
            if (erroBox) {
                erroBox.textContent = 'Preencha ao menos uma rota completa (De e Para).';
                erroBox.classList.remove('d-none');
            }
            return;
        }

        if (erroBox) erroBox.classList.add('d-none');

        var modalEl = document.getElementById('modalRotaRapida');
        var inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) try { inst.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de rota rápida'); }

        document.querySelectorAll('#rr-rotas-container .rr-rota-item').forEach(function (item) {
            var deInput = item.querySelector('.rr-de-input');
            var paraInput = item.querySelector('.rr-para-input');
            _salvarEnderecoSeNovo(deInput, solicitante);
            _salvarEnderecoSeNovo(paraInput, solicitante);
        });

        setTimeout(function () {
            window.processarRotasEAbrirMapa({
                solicitante: solicitante,
                contato: (document.getElementById('rr-contato') || {}).value,
                mercadoria: (document.getElementById('rr-mercadoria') || {}).value,
                obs: (document.getElementById('rr-obs') || {}).value,
                dataPedido: dataPedido,
                rawInput: ''
            }, rotas);
        }, 350);
    }

    return {
        abrir: abrir,
        avancar: avancar,
        parseMensagem: parseMensagem,
        preencherFormulario: preencherFormulario
    };
})();

function _estilizarRotasNaMensagem(textoEscapado) {
    return textoEscapado
        .replace(/(^|\s)De:/g, '$1<span class="icone-rota icone-rota-de">🛵</span>De:')
        .replace(/(^|\s)Para:/g, '$1<span class="icone-rota icone-rota-para">🏁</span>Para:');
}

function _normIdChat(id) {
    return String(id || '').trim().replace(/^RDO0*/i, '').toUpperCase();
}

function _sincronizarValorNoChat(dados) {
    var pedidoId = String(dados && dados.id || '').trim();
    if (!pedidoId) return;

    var idNorm = _normIdChat(pedidoId);
    var houveAlteracao = false;

    var cachePedidos = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
    var pedidoCache = cachePedidos.find(function (p) { return _normIdChat(p.id) === idNorm; });

    var cacheMsgs = Array.isArray(window.AppRDO.mensagensCache) ? window.AppRDO.mensagensCache : [];
    var msg = cacheMsgs.find(function (m) { return _normIdChat(m.pedido_id) === idNorm; });
    if (!msg || !msg.texto || !msg.id) return;

    var textoAtualizado = msg.texto;

    var valorBruto = dados.valor_final != null ? dados.valor_final
        : dados.valor_total != null ? dados.valor_total
            : dados.valor_corrida;

    if (valorBruto != null && valorBruto !== '') {
        var novoValor = typeof valorBruto === 'number'
            ? valorBruto
            : parseFloat(String(valorBruto).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3},)/g, '').replace(',', '.'));

        if (!isNaN(novoValor)) {
            var valorFormatado = novoValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            var regexValor = /💰\s*R\$\s*[\d.,]+/;
            if (regexValor.test(textoAtualizado)) {
                var textoComValor = textoAtualizado.replace(regexValor, '💰 ' + valorFormatado);
                if (textoComValor !== textoAtualizado) {
                    textoAtualizado = textoComValor;
                    houveAlteracao = true;
                }
            }
        }
    }

    if (dados.cliente !== undefined) {
        var clienteNovo = String(dados.cliente || '').trim();
        if (clienteNovo && clienteNovo !== '-') {
            var regexCliente = /(👤\s*:\s*)([^📞\n]+)/;
            if (regexCliente.test(textoAtualizado)) {
                var textoComCliente = textoAtualizado.replace(regexCliente, '$1' + clienteNovo + ' ');
                if (textoComCliente !== textoAtualizado) {
                    textoAtualizado = textoComCliente;
                    houveAlteracao = true;
                }
            }
            if (pedidoCache) pedidoCache.cliente = clienteNovo;
        }
    }

    var motoboyNovo = '';
    if (dados.motoboy !== undefined) {
        motoboyNovo = String(dados.motoboy || '').trim();
        if (motoboyNovo && motoboyNovo !== '-') {
            if (pedidoCache) pedidoCache.motoboy = motoboyNovo;
            houveAlteracao = true;
        }
    }

    var msgEl = document.querySelector('[data-pedido-id="' + pedidoId + '"]');
    if (msgEl) {
        var iconEl = msgEl.querySelector('.status-icon');
        if (iconEl && pedidoCache) {
            var statusBrutoAtual = String(pedidoCache.status || '').trim();
            var statusPuroAtual = statusBrutoAtual.includes('/') ? statusBrutoAtual.split('/').pop().trim() : statusBrutoAtual;
            var statusLabelAtual = statusPuroAtual.replace(/_/g, ' ');
            var motoboyParaTooltip = motoboyNovo || pedidoCache.motoboy || '';
            var novoTooltip = motoboyParaTooltip ? motoboyParaTooltip + ' • ' + statusLabelAtual : statusLabelAtual;
            iconEl.setAttribute('data-tooltip', novoTooltip);
            iconEl.setAttribute('title', novoTooltip);
        }
    }

    if (!houveAlteracao || textoAtualizado === msg.texto) return;

    var chatId = msg.id;
    if (!chatId) return;

    msg.texto = textoAtualizado;

    if (msgEl) {
        var bodyEl = msgEl.querySelector('.message-body');
        if (bodyEl) {
            bodyEl.innerHTML = _estilizarRotasNaMensagem(
                textoAtualizado
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br>')
            );
        }
        msgEl.setAttribute(
            'data-texto-original',
            textoAtualizado.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        );
    }

    API.call('updatechat', { id: chatId, texto: textoAtualizado })
        .then(function (res) {
            if (!res || res.status === 'error') {
                throw new Error((res && res.message) || 'Falha ao sincronizar dados no banco de chat');
            }
        })
        .catch(function (e) {
            window._exibirErroGlobal(e, 'sincronizar dados do pedido no chat');
        });
}

function _validarDataRetroativa(dataStr) {
    if (!dataStr) return { valido: false, mensagem: 'Selecione a data do pedido.' };

    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    var partes = String(dataStr).split('-');
    var dataSelecionada = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    dataSelecionada.setHours(0, 0, 0, 0);

    if (dataSelecionada.getTime() > hoje.getTime()) {
        return { valido: false, mensagem: 'Escolha outra data. Essa data não pode ser lançada.' };
    }
    return { valido: true, mensagem: '' };
}

window._validarDataRetroativa = _validarDataRetroativa;

window._sincronizarValorNoChat = _sincronizarValorNoChat;

window._sincronizarValorNoChat = _sincronizarValorNoChat;

window._sincronizarValorNoChat = _sincronizarValorNoChat;

window._estilizarRotasNaMensagem = _estilizarRotasNaMensagem;

window._filaSalvarGeo = window._filaSalvarGeo || Promise.resolve();

function _salvarGeoSerializado(payload) {
    var resultado = window._filaSalvarGeo.then(function () {
        return API.call('salvarenderecogeo', payload).catch(function (e) {
            window._exibirErroGlobal(e, 'salvar endereço geocodificado no banco');
            return null;
        });
    });
    window._filaSalvarGeo = resultado.catch(function () { return null; });
    return resultado;
}

window.exibirErro = function (erro, contexto) {
    contexto = contexto || 'Erro desconhecido';
    window._exibirErroGlobal(erro, contexto);
    var container = document.getElementById('chat-messages-container');
    if (container) {
        container.innerHTML =
            '<div class="alert alert-danger m-3 rounded-4 shadow-sm">' +
            '<i class="bi bi-exclamation-triangle-fill me-2"></i>' +
            '<strong>Ops!</strong> Algo deu errado ao ' + contexto + '.' +
            '<br><small class="text-secondary">' + (erro.message || erro) + '</small>' +
            '<div class="mt-2"><button class="btn btn-sm btn-outline-danger" ' +
            'onclick="window.carregarDados()">Tentar Novamente</button></div></div>';
    } else {
        window.exibirModalValidacao('Falha ao ' + contexto + ': ' + (erro.message || erro));
    }
};

window.renderizarMapaUnificado = function () {
    window.carregarLeaflet().then(function () {
        _renderizarMapaUnificadoInterno();
    });
};

function _renderizarMapaUnificadoInterno() {
    var mapaContainer = document.getElementById('container-mapa-visual');
    if (!mapaContainer) return;

    // Torna o container visível (estava com display:none por padrão)
    mapaContainer.style.display = 'block';

    // Remove instância anterior, se existir
    if (window._leafletMapInstance) {
        try { window._leafletMapInstance.remove(); } catch (e) { window._exibirErroGlobal(e, 'remover mapa anterior'); }
        window._leafletMapInstance = null;
    }

    var dados = window.dadosPedidoAtual || {};
    var caminhos = dados.coordenadas || [];

    if (caminhos.length === 0) return;

    var map = L.map(mapaContainer, { zoomControl: true, attributionControl: false });
    window._leafletMapInstance = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    var todosPontos = [];

    caminhos.forEach(function (caminho) {
        if (!caminho || caminho.length === 0) return;

        L.polyline(caminho, { color: '#dc3545', weight: 4, opacity: 0.85 }).addTo(map);

        var origem = caminho[0];
        var destino = caminho[caminho.length - 1];

        L.marker(origem, {
            icon: L.divIcon({ className: 'marker-origem', html: '<i class="bi bi-geo-alt-fill" style="color:#28a745;font-size:1.5rem;"></i>' })
        }).addTo(map);

        L.marker(destino, {
            icon: L.divIcon({ className: 'marker-destino', html: '<i class="bi bi-geo-alt-fill" style="color:#dc3545;font-size:1.5rem;"></i>' })
        }).addTo(map);

        todosPontos = todosPontos.concat(caminho);
    });

    if (todosPontos.length > 0) {
        map.fitBounds(L.latLngBounds(todosPontos), { padding: [30, 30] });
    } else {
        map.setView([-19.92, -43.94], 12);
    }

    setTimeout(function () { map.invalidateSize(); }, 200);
}

async function _esperarModal(timeoutMs) {
    var tentativas = 0;
    var maxTentativas = (timeoutMs || 3000) / 100;
    while (!document.getElementById('modalRotaRapida') && tentativas < maxTentativas) {
        await new Promise(function (r) { setTimeout(r, 100); });
        tentativas++;
    }
    return document.getElementById('modalRotaRapida');
}

window._renderizarResumo = function (km, min, valor) {
    var footer = document.getElementById('footer-resumo-dados');
    if (!footer) return;
    footer.innerHTML =
        '<div class="d-flex align-items-center justify-content-center gap-4 py-3">' +
        '<div class="d-flex align-items-center gap-2"><i class="bi bi-signpost-split-fill text-danger" style="font-size:1.5rem;"></i>' +
        '<div><div class="small text-muted mb-1">Distância</div><div class="fw-bold text-dark fs-5">' + km + ' km</div></div></div>' +
        '<div class="vr" style="height:50px;opacity:0.3;"></div>' +
        '<div class="d-flex align-items-center gap-2"><i class="bi bi-clock-fill text-primary" style="font-size:1.5rem;"></i>' +
        '<div><div class="small text-muted mb-1">Tempo</div><div class="fw-bold text-dark fs-5">' + window.formatarTempoHumano(min) + '</div></div></div>' +
        '<div class="vr" style="height:50px;opacity:0.3;"></div>' +
        '<div class="d-flex align-items-center gap-2"><i class="bi bi-cash-stack text-success" style="font-size:1.5rem;"></i>' +
        '<div><div class="small text-muted mb-1">Valor</div><div class="fw-bold text-success fs-5">' + valor + '</div></div></div></div>';
};

window.enviarMensagemGeral = function () {
    if (!window.AppRDO || !window.AppRDO.clienteId) { window.exibirModalValidacao('Selecione um cliente na lista primeiro.'); return; }
    if (!window.AppRDO.isMasterOn) { window.exibirModalValidacao('O sistema está desligado.<br><strong>Contate o administrador.</strong>'); return; }

    var msgInput = document.getElementById('msg-input');
    var texto = msgInput ? (msgInput.value || '').trim() : '';

    window.RotaRapida.abrir(texto); // ✅ agora envia o texto digitado
};

window.prosseguirParaFormulario = function () {
    if (!window.dadosPedidoAtual || !window.dadosPedidoAtual.distanciaTotal) {
        alert('Dados do pedido não foram calculados corretamente.');
        return;
    }

    var modalMapa = document.getElementById('modalMapa');
    var instMapa = modalMapa ? bootstrap.Modal.getInstance(modalMapa) : null;
    if (instMapa) { try { instMapa.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de mapa'); } }

    setTimeout(function () {
        window.loadModal('form_clientes.html').then(function (ok) {
            if (!ok) return;

            var modalForm = document.getElementById('modalFormulario');
            if (!modalForm) return;

            // 🔑 PORTAL: escapa do stacking context
            if (modalForm.parentElement !== document.body) {
                document.body.appendChild(modalForm);
            }

            try {
                var existente = bootstrap.Modal.getInstance(modalForm);
                if (existente) existente.dispose();
            } catch (e) { window._exibirErroGlobal(e, 'liberar modal de formulário'); }
            if (typeof _limparBackdrop === 'function') _limparBackdrop();

            var bsModalForm = new bootstrap.Modal(modalForm, { backdrop: 'static', keyboard: false });

            modalForm.addEventListener('shown.bs.modal', function () {
                modalForm.style.zIndex = '1075';
                var backdrops = document.querySelectorAll('.modal-backdrop');
                var ultimoBackdrop = backdrops[backdrops.length - 1];
                if (ultimoBackdrop) ultimoBackdrop.style.zIndex = '1070';

                window._preencherFormulario(window.dadosPedidoAtual);
            }, { once: true });

            modalForm.addEventListener('hidden.bs.modal', function () {
                if (typeof _limparBackdrop === 'function') _limparBackdrop();
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, { once: true });

            bsModalForm.show();
        });
    }, 400);
};

window.calcularTudo = function () {
    var distancia = parseFloat((document.getElementById('p-distancia') || {}).value) || 0;
    var valorKm = parseFloat((document.getElementById('p-valor-km') || {}).value) || 3.00;
    var retorno = parseFloat((document.getElementById('p-retorno') || {}).value) || 0;
    var dinamica = parseFloat((document.getElementById('p-dinamica') || {}).value) || 0;
    var prioridade = parseFloat((document.getElementById('p-prioridade') || {}).value) || 0;

    var base = distancia * valorKm;
    var taxaRetorno = retorno > 0 ? base * retorno : 0;
    var total = base + taxaRetorno + dinamica + prioridade;

    var elFinal = document.getElementById('view-valor-final');
    if (elFinal) elFinal.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (window.dadosPedidoAtual) {
        window.dadosPedidoAtual.valorEstimado = total;
        window.dadosPedidoAtual.valorKm = valorKm;
        window.dadosPedidoAtual.retorno = retorno;
        window.dadosPedidoAtual.dinamica = dinamica;
        window.dadosPedidoAtual.prioridade = prioridade;
    }
};

window._preencherFormulario = function (dados) {
    if (!dados) return;

    var _setInput = function (id, valor) {
        var el = document.getElementById(id);
        if (!el) return;
        el.value = valor;
        el.style.border = '';
        el.style.boxShadow = '';
    };
    var _setSelect = function (id, valor) {
        var el = document.getElementById(id);
        if (!el || valor == null) return;
        var str = String(valor);
        var encontrou = Array.prototype.some.call(el.options, function (o) { return o.value === str; });
        if (encontrou) el.value = str;
        el.style.border = '';
        el.style.boxShadow = '';
    };

    _setInput('p-solicitante', dados.solicitante || '');
    _setInput('p-contato', dados.contato || '');
    _setInput('p-horario', dados.horario || '');
    _setInput('p-distancia', Number(dados.distanciaTotal || 0).toFixed(2));
    _setInput('p-tempo', dados.tempoTotal ? window.formatarTempoHumano(dados.tempoTotal) : '');
    _setInput('p-obs', dados.obs || '');

    _setSelect('p-mercadoria', dados.mercadoria || 'ENTREGA');
    _setSelect('p-valor-km', dados.valorKm != null ? dados.valorKm : '3.00');
    _setSelect('p-retorno', dados.retorno != null ? dados.retorno : '0');
    _setSelect('p-dinamica', dados.dinamica != null ? dados.dinamica : '0');
    _setSelect('p-prioridade', dados.prioridade != null ? dados.prioridade : '0');

    var elRotas = document.getElementById('p-rotas');
    if (elRotas && dados.rotasProcessadas && dados.rotasProcessadas.length > 0)
        elRotas.value = dados.rotasProcessadas.map(function (r, i) {
            return (i + 1) + '. De: ' + r.de + ' | Para: ' + r.para;
        }).join('\n');

    var elHeaderCliente = document.getElementById('header-nome-cliente');
    if (elHeaderCliente) elHeaderCliente.innerText = dados.cliente || 'N/A';

    window.calcularTudo();
};

window.voltarParaMapa = function () {
    var modalForm = document.getElementById('modalFormulario');
    var instForm = modalForm ? bootstrap.Modal.getInstance(modalForm) : null;
    if (instForm) { try { instForm.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de formulário'); } }

    setTimeout(function () {
        window.loadModal('mapa_clientes.html').then(function (ok) {
            if (!ok) return;

            var modalMapa = document.getElementById('modalMapa');
            if (!modalMapa) return;

            // 🔑 PORTAL: escapa do stacking context
            if (modalMapa.parentElement !== document.body) {
                document.body.appendChild(modalMapa);
            }

            try {
                var existente = bootstrap.Modal.getInstance(modalMapa);
                if (existente) existente.dispose();
            } catch (e) { window._exibirErroGlobal(e, 'liberar modal de mapa'); }
            if (typeof _limparBackdrop === 'function') _limparBackdrop();

            var bsModalMapa = new bootstrap.Modal(modalMapa, { backdrop: 'static', keyboard: false });

            modalMapa.addEventListener('shown.bs.modal', function () {
                modalMapa.style.zIndex = '1075';
                var backdrops = document.querySelectorAll('.modal-backdrop');
                var ultimoBackdrop = backdrops[backdrops.length - 1];
                if (ultimoBackdrop) ultimoBackdrop.style.zIndex = '1070';

                var elSolicitante = document.getElementById('header-nome-solicitante');
                if (elSolicitante && window.dadosPedidoAtual) elSolicitante.innerText = window.dadosPedidoAtual.solicitante || 'N/A';
                if (window.dadosPedidoAtual && window.dadosPedidoAtual.distanciaTotal) {
                    window._renderizarResumo(
                        window.dadosPedidoAtual.distanciaTotal,
                        window.dadosPedidoAtual.tempoTotal || 0,
                        (window.dadosPedidoAtual.valorEstimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    );
                }
                window.renderizarMapaUnificado();
            }, { once: true });

            modalMapa.addEventListener('hidden.bs.modal', function () {
                if (typeof _limparBackdrop === 'function') _limparBackdrop();
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            }, { once: true });

            bsModalMapa.show();
        });
    }, 400);
};

window.fecharParaMapa = function () {
    var modalForm = document.getElementById('modalFormulario');
    if (!modalForm) return;
    var inst = bootstrap.Modal.getInstance(modalForm);
    if (inst) { try { inst.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal de formulário'); } }
    setTimeout(function () { window.voltarParaMapa(); }, 400);
};

window.fecharParaChat = function (modalId) {
    var ids = modalId ? [modalId] : ['modalFormulario', 'modalMapa'];
    ids.forEach(function (id) {
        var modalEl = document.getElementById(id);
        if (!modalEl) return;
        var inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) { try { inst.hide(); } catch (e) { window._exibirErroGlobal(e, 'ocultar modal ' + id); } }
    });

    window.AppRDO._mapaModalAberto = false;
    window.AppRDO.isProcessingCheckout = false;
    if (window._leafletMapInstance) { try { window._leafletMapInstance.remove(); } catch (e) { window._exibirErroGlobal(e, 'remover instância de mapa'); } window._leafletMapInstance = null; }
    window.dadosPedidoAtual = {};

    var input = document.getElementById('msg-input');
    if (input) {
        input.value = '';
        input.style.height = 'auto';
        input.disabled = false;
        input.readOnly = false;
        input.style.border = '';
        input.style.boxShadow = '';
        input.style.opacity = '';
        input.style.pointerEvents = '';
        input.setAttribute('placeholder', 'Digite o pedido...');
    }
    var btnEnviar = document.getElementById('btn-enviar-mensagem');
    if (btnEnviar) { btnEnviar.disabled = false; btnEnviar.style.opacity = ''; btnEnviar.style.pointerEvents = ''; }

    setTimeout(function () { _limparBackdrop(); var inp = document.getElementById('msg-input'); if (inp) inp.focus(); }, 400);
};

window.EventBus.on('pedido:atualizado', function (dados) {
    _sincronizarValorNoChat(dados);
});

(function () {
    function _tentarInit() {
        try {
            if (window.AppRDO) {
                window.AppRDO.isMasterOn = localStorage.getItem('bot_master_active') === 'true';
                window.AppRDO.listaCarregada = false;
                window.AppRDO._mapaModalAberto = false;
            }
            window.PedidosDropdown.init();
            window.NotificationManager.init();
            var btnMenu = document.getElementById('btn-menu-contatos-mobile');
            if (btnMenu) btnMenu.addEventListener('click', window._abrirDrawerContatosMobile);
            var overlay = document.getElementById('drawer-overlay-mobile');
            if (overlay) overlay.addEventListener('click', window._fecharDrawerContatosMobile);
            if (window.AppRDO && !window.AppRDO.isFetching) window.carregarDados();
        } catch (e) {
            window._exibirErroGlobal(e, 'inicializar aplicação');
        }
    }

    function _abrirDrawerContatosMobile() {
        var chatEl = document.getElementById('chat');
        if (chatEl) chatEl.classList.add('mostrar-contatos-mobile');
    }

    function _fecharDrawerContatosMobile() {
        var chatEl = document.getElementById('chat');
        if (chatEl) chatEl.classList.remove('mostrar-contatos-mobile');
    }

    window._abrirDrawerContatosMobile = _abrirDrawerContatosMobile;
    window._fecharDrawerContatosMobile = _fecharDrawerContatosMobile;

    function _normId(id) {
        return String(id || '').trim().replace(/^RDO0*/i, '').toUpperCase();
    }

    function _registrarEventos() {
        if (typeof window.EventBus === 'undefined') { setTimeout(_registrarEventos, 300); return; }

        window.EventBus.on('pedido:excluido', function (dados) {
            try {
                var idNorm = _normId(dados && dados.id);
                if (!idNorm) return;

                if (Array.isArray(window.AppRDO.mensagensCache)) {
                    window.AppRDO.mensagensCache = window.AppRDO.mensagensCache.filter(function (m) {
                        return _normId(m.pedido_id) !== idNorm;
                    });
                }
                if (Array.isArray(window.AppRDO.pedidosCache)) {
                    window.AppRDO.pedidosCache = window.AppRDO.pedidosCache.filter(function (p) {
                        return _normId(p.id) !== idNorm;
                    });
                }

                document.querySelectorAll('[data-pedido-id]').forEach(function (msgEl) {
                    if (_normId(msgEl.getAttribute('data-pedido-id')) !== idNorm) return;
                    var wrapper = msgEl.closest('.message-wrapper');
                    if (wrapper) {
                        wrapper.style.transition = 'opacity .3s ease, transform .3s ease';
                        wrapper.style.opacity = '0';
                        wrapper.style.transform = 'translateX(30px)';
                        setTimeout(function () { try { wrapper.remove(); } catch (e) { window._exibirErroGlobal(e, 'remover bolha excluída'); } }, 300);
                    } else {
                        try { msgEl.remove(); } catch (e) { window._exibirErroGlobal(e, 'remover elemento de mensagem'); }
                    }
                });

                var clienteId = window.AppRDO && window.AppRDO.clienteId;
                if (clienteId) {
                    setTimeout(function () {
                        if (!window.AppRDO.isFetching) {
                            _spinChatOn();
                            window.carregarPedidosDoCliente(clienteId).finally(function () { _spinChatOff(); });
                        }
                    }, 350);
                }
            } catch (e) { window._exibirErroGlobal(e, 'processar evento de exclusão'); }
        });

        window.EventBus.on('chat:excluidoLogico', function (dados) {
            try {
                var idNorm = _normId(dados && dados.pedidoId);
                if (!idNorm) return;
                if (Array.isArray(window.AppRDO.mensagensCache)) {
                    window.AppRDO.mensagensCache = window.AppRDO.mensagensCache.filter(function (m) {
                        return _normId(m.pedido_id) !== idNorm;
                    });
                }
            } catch (e) { window._exibirErroGlobal(e, 'processar exclusão lógica de chat'); }
        });

        window.EventBus.on('pedido:statusAtualizado', function (dados) {
            try {
                var idStr = _normId(dados && dados.id);
                var cache = Array.isArray(window.AppRDO.pedidosCache) ? window.AppRDO.pedidosCache : [];
                var pedido = cache.find(function (p) { return _normId(p.id) === idStr; });
                if (pedido) {
                    pedido.status = dados.status || pedido.status;
                    if (dados.motoboy) pedido.motoboy = dados.motoboy;
                    if (dados.motivo_cancelamento !== undefined) pedido.motivo_cancelamento = dados.motivo_cancelamento;
                }
            } catch (e) { window._exibirErroGlobal(e, 'processar atualização de status'); }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _tentarInit);
    else _tentarInit();

    _registrarEventos();
})();

