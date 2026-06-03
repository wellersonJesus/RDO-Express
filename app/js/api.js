window.API = {
    call: async (action, data = {}) => {
        try {
            console.log("Chamando API:", action, data); // LOG PARA DEBUG
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data, apiKey: "aquieumakdjdddggjrtr" }) // Chave incluída aqui
            });
            
            const result = await response.json();
            
            if (result.status === 'error') {
                console.error("API retornou erro:", result.message);
                throw new Error(result.message);
            }
            
            return result;
        } catch (err) {
            console.error('API Error detalhado:', err);
            throw err;
        }
    }
};