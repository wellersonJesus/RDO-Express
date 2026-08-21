const fs = require("fs");
const caminho = "app/js/chat.js";

try {
    if (!fs.existsSync(caminho)) {
        console.error("❌ Arquivo app/js/chat.js não encontrado.");
        process.exit(1);
    }

    let conteudo = fs.readFileSync(caminho, "utf8");

    // Ponto de ancoragem exato no código atual para injetar a chamada financeira
    const alvoAncora = "var resposta = await API.call(\x27updatepedido\x27, payload);";
    
    if (!conteudo.includes(alvoAncora)) {
        console.error("❌ Ponto de ancoragem não encontrado em app/js/chat.js. Verifique se o arquivo foi alterado.");
        process.exit(1);
    }

    // Verifica se já foi aplicado anteriormente para evitar duplicação
    if (conteudo.includes("ADIÇÃO SRE: Inserção automática no financeiro")) {
        console.log("⚠️ O patch financeiro já havia sido aplicado anteriormente em app/js/chat.js.");
        process.exit(0);
    }

    const codigoInjecao = `var resposta = await API.call(updatepedido, payload);
    if (resposta && resposta.status === success) {
        // 🚀 ADIÇÃO SRE: Inserção automática no financeiro ao concluir o pedido
        if (status === CONCLUIDO) {
            try {
                var pedidoCache = _obterPedidoDoCache(_pedidoId) || {};
                var payloadFinanceiro = {
                    id_pedido: _normalizarId(_pedidoId),
                    data_lancamento: new Date().toLocaleDateString(pt-BR),
                    tipo: Receita,
                    descricao: String(pedidoCache.mercadoria || ENTREGA).trim() + 
