const API = {
    call: async (action, data) => {
        const payload = { action: action, ...data };
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors', // Necessário para evitar erros de CORS no GAS
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        return response; // Nota: No-cors não retorna JSON legível, trate o sucesso pelo status
    }
};
