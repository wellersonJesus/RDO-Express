const API = {
    BASE_URL: window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://rdo-express-backend.onrender.com',

    call: async (action, data = {}) => {
        try {
            const token = localStorage.getItem('rdo_auth') || '';
            const response = await fetch(`${API.BASE_URL}/api/proxy`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token 
                },
                body: JSON.stringify({ action, ...data })
            });
            
            if (response.status === 401) {
                window.location.href = 'login.html';
                return { status: 'error', message: 'Sessão expirada' };
            }
            
            return await response.json();
        } catch (error) {
            console.error("Erro API:", error);
            return { status: 'error', message: error.message };
        }
    }
};
