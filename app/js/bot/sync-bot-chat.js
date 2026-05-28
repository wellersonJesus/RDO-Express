window.SyncBotUtils = {
    toggleSpin: (elementId, active) => {
        const icon = document.getElementById(elementId);
        if (!icon) return;

        if (active) {
            icon.classList.add('spinner-rotate');
        } else {
            // Pequeno delay para garantir que o usuário perceba o giro
            requestAnimationFrame(() => {
                setTimeout(() => {
                    icon.classList.remove('spinner-rotate');
                }, 400); // Tempo mínimo de giro para ser visível
            });
        }
    },

    fetchBots: async () => {
        try {
            if (!window.API) throw new Error("API não carregada");
            const data = await window.API.call('getbotconfig');
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.error("Erro em fetchBots:", e);
            return [];
        }
    }
};