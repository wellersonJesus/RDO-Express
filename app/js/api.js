const API = {
    call: async (action, data = {}) => {
        try {
            const isAuth = localStorage.getItem('rdo_auth');
            
            if (!isAuth && !window.location.pathname.includes('login.html') && !action.includes('usuarios')) {
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
                console.error("❌ Erro na Planilha:", result.message);
            }
            return result;
        } catch (error) {
            console.error("❌ Erro de conexão:", error);
            return { status: 'error', message: 'Erro de rede' };
        }
    }
};
