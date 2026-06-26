window.API = {
    call: function (action, data) {
        var payload = { action: action };

        if (data && typeof data === 'object') {
            Object.keys(data).forEach(function (k) {
                payload[k] = data[k];
            });
        }

        console.log('[API.call] Action:', action, '| Payload:', payload);

        return fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function (res) {
            console.log('[API.call] HTTP Status:', res.status);
            if (!res.ok) {
                return res.text().then(function (txt) {
                    console.error('[API.call] Erro HTTP:', txt);
                    throw new Error('HTTP ' + res.status + ': ' + txt.substring(0, 100));
                });
            }
            return res.json();
        })
        .then(function (result) {
            console.log('[API.call] Resposta:', result);
            if (result && result.status === 'error') {
                throw new Error(result.message || 'Erro desconhecido');
            }
            return result;
        })
        .catch(function (err) {
            console.error('[API.call] Exceção:', err.message);
            throw err;
        });
    }
};
