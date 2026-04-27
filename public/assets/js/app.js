document.getElementById('login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const user = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;

    if (user === CONFIG.MASTER_USER && pass === CONFIG.MASTER_PASS) {
        localStorage.setItem('gms_auth', 'true');
        checkAuth();
    } else {
        document.getElementById('login-error').classList.remove('d-none');
    }
});

function checkAuth() {
    const isAuth = localStorage.getItem('gms_auth');
    if (isAuth === 'true') {
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('main-panel').classList.remove('d-none');
        fetchData();
    }
}

function logout() {
    localStorage.removeItem('gms_auth');
    location.reload();
}

async function fetchData() {
    const tableBody = document.getElementById('data-table');
    try {
        const response = await fetch(`${CONFIG.API_URL}?action=read`);
        const data = await response.json();
        
        tableBody.innerHTML = '';
        data.forEach(row => {
            tableBody.innerHTML += `
                <tr>
                    <td><small>${row.data || '---'}</small></td>
                    <td><strong>${row.dataclientss || row.clientes || '---'}</strong></td>
                    <td>${row.solicitacao || '---'}</td>
                    <td><span class="badge bg-light text-dark border">${row.tipodoservico || '---'}</span></td>
                    <td><span class="badge bg-success bg-opacity-10 text-success border border-success">R$ ${row.valor || '0,00'}</span></td>
                    <td><span class="badge bg-primary px-3">${row.motoboy || '---'}</span></td>
                </tr>
            `;
        });
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar dados. Verifique a URL da API.</td></tr>';
    }
}

// Inicia checando o login
checkAuth();
