try {
    console.log("[SRE] Iniciando teste simulado do fluxo...");

    // Simulando o objeto de pedido recebido do chat/pedidos
    const pedido = {
        solicitante: "Maria Pitanga",
        motoboy: "Rodrigo",
        mercadoria: "Açaí Especial 500ml",
        de: "Loja Centro",
        para: "Rua das Flores, 123",
        valor_corrida: 18.50,
        status: "concluido"
    };

    // Aplicando a regra refatorada de interpolação para a descrição financeira
    const descricaoInterpolada = `${pedido.mercadoria} de ${pedido.de} para ${pedido.para}`;
    
    const payloadFinanceiro = {
        descricao: descricaoInterpolada,
        colaborador: pedido.motoboy,
        cliente: pedido.solicitante,
        vlr_servico: pedido.valor_corrida,
        tipo: "Corrida",
        situacao: "CONCLUIDO"
    };

    console.log("📝 Descrição Gerada:", payloadFinanceiro.descricao);
    
    if (!payloadFinanceiro.descricao.includes("Açaí Especial 500ml de Loja Centro para Rua das Flores, 123")) {
        throw new Error("A interpolação da descrição falhou no teste unitário.");
    }

    console.log("✅ Teste executado com sucesso e sem erros estruturais!");
} catch (err) {
    console.error("❌ ERRO CAPTURADO NO TESTE:", err.message);
    process.exit(1);
}
