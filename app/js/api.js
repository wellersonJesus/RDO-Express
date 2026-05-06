const API = {
    BASE_URL: window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://rdo-express-backend.onrender.com',

    call: async (action, data = {}) => {
        try {
            // A chave é injetada no backend, aqui enviamos apenas os dados da ação
            const response = await fetch(`${API.BASE_URL}/api/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            return await response.json();
        } catch (error) {
            console.error("Erro API:", error);
            return { status: 'error', message: error.message };
        }
    }
};
