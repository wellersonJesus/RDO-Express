window.API = {
    call: function (action, data) {
        var payload = { action: action };

        if (data && typeof data === 'object') {
            Object.keys(data).forEach(function (k) {
                payload[k] = data[k];
            });
        }

        return fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function (res) {
            if (!res.ok) {
                return res.text().then(function (txt) {
                    throw new Error('HTTP ' + res.status + ': ' + txt.substring(0, 100));
                });
            }
            return res.json();
        })
        .then(function (result) {
            if (result && result.status === 'error') {
                throw new Error(result.message || 'Erro desconhecido');
            }
            return result;
        })
        .catch(function (err) {
            throw err;
        });
    }
};
