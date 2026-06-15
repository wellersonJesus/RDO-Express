window.API = {
    call: function (action, data) {
        var payload = {};

        if (data && typeof data === 'object') {
            var keys = Object.keys(data);
            for (var i = 0; i < keys.length; i++) {
                payload[keys[i]] = data[keys[i]];
            }
        }

        payload.action = action;

        console.log('[API.call] action:', action, '| keys:', Object.keys(payload).join(', '));

        return fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function (response) {
            console.log('[API.call] HTTP status:', response.status);

            if (!response.ok) {
                return response.text().then(function (txt) {
                    console.error('[API.call] Erro HTTP:', response.status, txt.substring(0, 200));
                    throw new Error('HTTP ' + response.status + ': ' + txt.substring(0, 100));
                });
            }

            return response.json();
        })
        .then(function (result) {
            console.log('[API.call] Resultado tipo:', typeof result, '| Array?', Array.isArray(result));

            if (result && result.status === 'error') {
                console.error('[API.call] Erro da API:', result.message);
                throw new Error(result.message || 'Erro desconhecido');
            }

            return result;
        })
        .catch(function (err) {
            console.error('[API.call] Exception:', err.message);
            throw err;
        });
    }
};
