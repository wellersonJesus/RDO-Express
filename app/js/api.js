const API = {
    call: async (action, data = {}) => {
        const payload = { action: action, ...data };
        try {
            console.log("Enviando para API:", action, payload);
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            console.log("Resposta recebida da API:", result);
            return result;
        } catch (error) {
            console.error("Erro CRÍTICO na chamada da API:", error);
            return { status: 'error', message: error.message };
        }
    }
};
