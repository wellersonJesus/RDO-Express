const BotCore = {
    getMasterStatus: () => localStorage.getItem('bot_master_active') === 'true',

    isOnline: (item) => {
        return BotCore.getMasterStatus() && String(item.status) === 'true';
    },

    syncLoggedUser: async () => {
        try {
            const rawUser = localStorage.getItem('user_data');
            if (!rawUser) return;
            
            const user = JSON.parse(rawUser);
            const configs = await API.call('getbotconfig');
            
            const exists = configs.find(c => String(c.username).toLowerCase() === String(user.username).toLowerCase());

            if (!exists) {
                await API.call('addbotconfig', {
                    username: user.username,
                    jid_numero: user.jid || '0',
                    imagem: user.imagem || '',
                    tipo: user.tipo || 'Operador',
                    status: 'true'
                });
            }
        } catch (err) {
            console.error("Erro na sincronização automática:", err);
        }
    }
};
