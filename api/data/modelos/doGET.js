/* 
  BOT MONITOR RDO-EXPRESS 
  Cole no console do WhatsApp Web
*/
(function() {
    const API_URL = "SUA_URL_DO_APPS_SCRIPT_AQUI";
    const API_KEY = "aquieumakdjdddggjrtr";

    console.log("🚀 RDO Bot iniciado. Monitorando grupos...");

    // Função para enviar ao banco
    async function enviarParaChatRDO(msgData) {
        const payload = {
            apiKey: API_KEY,
            action: "addchatlive",
            data: new Date().toLocaleDateString(),
            hora: new Date().toLocaleTimeString(),
            cliente: msgData.sender,
            ultima_msg: msgData.text,
            status: "Aberto",
            id_whatsapp: msgData.chatId
        };

        try {
            await fetch(API_URL, {
                method: "POST",
                mode: 'no-cors',
                body: JSON.stringify(payload)
            });
            console.log("✅ Mensagem replicada no RDO Chat");
        } catch (e) {
            console.error("❌ Erro ao enviar para API", e);
        }
    }

    // Observador de mutação para detectar novas mensagens no DOM do Zap
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.addedNodes.length) {
                const lastMsg = document.querySelector(".message-in:last-child");
                if (lastMsg) {
                    const text = lastMsg.innerText;
                    const chatId = lastMsg.closest(".copyable-area")?.previousSibling?.innerText || "Grupo Desconhecido";
                    
                    // Lógica para filtrar apenas se for relevante
                    if(text.includes("ENTREGA") || text.includes("Coletar")) {
                        enviarParaChatRDO({ sender: chatId, text: text, chatId: chatId });
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();