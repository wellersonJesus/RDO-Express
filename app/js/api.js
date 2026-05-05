const API = {
    // Aponta para a porta 3000 (local ou Render)
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://rdo-express-backend.onrender.com',

    call: async (action, data = {}) => {
        try {
            const response = await fetch(`${API.BASE_URL}/api/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            return await response.json();
        } catch (error) {
            console.error("Erro na comunicação:", error);
            return { status: 'error', message: error.message };
        }
    }
};
