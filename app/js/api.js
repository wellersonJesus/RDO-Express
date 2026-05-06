const API = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://rdo-express-backend.onrender.com',
    KEY: "aquieumakdjdddggjrtr",

    call: async (action, data = {}) => {
        try {
            const response = await fetch(`${API.BASE_URL}/api/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: API.KEY, action, ...data })
            });
            return await response.json();
        } catch (error) {
            console.error("Erro API:", error);
            return { status: 'error', message: error.message };
        }
    }
};
