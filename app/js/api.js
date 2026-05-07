const API = {
    call: async (action, data = {}) => {
        try {
            const token = localStorage.getItem('rdo_auth');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            
            const result = await response.json();
            
            if (result.status === 'error') {
                console.error("❌ Erro retornado pela Planilha:", result.message);
            }
            
            return result;
        } catch (error) {
            console.error("❌ Erro de conexão com o servidor:", error);
            return { status: 'error', message: 'Erro de rede' };
        }
    }
};
