const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://api.rdo-express.com';

async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : null
    };
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    return await response.json();
}
