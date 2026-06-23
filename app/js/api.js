window.API = {
  call: function(action, data) {
    var payload = { action: action };

    if (data && typeof data === 'object') {
      Object.keys(data).forEach(function(k) {
        payload[k] = data[k];
      });
    }

    console.log('[API.call] action:', action, '| keys:', Object.keys(payload).join(', '));

    return fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      console.log('[API.call] HTTP status:', res.status);
      if (!res.ok) {
        return res.text().then(function(txt) {
          console.error('[API.call] Erro HTTP:', res.status, txt.substring(0, 200));
          throw new Error('HTTP ' + res.status + ': ' + txt.substring(0, 100));
        });
      }
      return res.json();
    })
    .then(function(result) {
      console.log('[API.call] Resultado tipo:', typeof result, '| Array?', Array.isArray(result));
      if (result && result.status === 'error') {
        console.error('[API.call] Erro da API:', result.message);
        throw new Error(result.message || 'Erro desconhecido');
      }
      return result;
    })
    .catch(function(err) {
      console.error('[API.call] Exception:', err.message);
      throw err;
    });
  }
};
