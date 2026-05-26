window.API = {
    call: async (action, data = {}) => {
        try {
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });
            const result = await response.json();
            if (result.status === 'error') throw new Error(result.message);
            return result;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    }
};
