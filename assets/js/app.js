const loginForm = document.getElementById('login-form');
const loginScreen = document.getElementById('login-screen');
const mainPanel = document.getElementById('main-panel');
const tableBody = document.getElementById('table-body');
const tableHead = document.getElementById('table-head');

loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;

    if (u === CONFIG.MASTER_USER && p === CONFIG.MASTER_PASS) {
        localStorage.setItem('rdo_auth', 'true');
        init();
    } else {
        document.getElementById('login-error').classList.remove('d-none');
    }
});

function logout() {
    localStorage.removeItem('rdo_auth');
    location.reload();
}

function init() {
    if (localStorage.getItem('rdo_auth') === 'true') {
        loginScreen.classList.add('d-none');
        mainPanel.classList.remove('d-none');
        loadSheet('dados'); // Carrega a padrão
    }
}

async function loadSheet(sheetName, element = null) {
    // UI: Muda aba ativa
    if (element) {
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }

    tableBody.innerHTML = '<tr><td colspan="10" class="text-center p-5"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const res = await fetch(`${CONFIG.API_URL}?action=read&sheet=${sheetName}`);
        const data = await res.json();

        if (!data || data.error || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" class="text-center p-5 text-danger font-monospace">${data.error || 'Nenhum dado encontrado'}</td></tr>`;
            return;
        }

        // Monta Cabeçalho dinâmico baseado nas chaves do primeiro objeto
        const headers = Object.keys(data[0]);
        tableHead.innerHTML = `<tr>${headers.map(h => `<th>${h.toUpperCase().replace(/_/g, ' ')}</th>`).join('')}</tr>`;

        // Monta Linhas
        tableBody.innerHTML = data.map(row => {
            return `<tr>${headers.map(h => `<td>${row[h] || '---'}</td>`).join('')}</tr>`;
        }).join('');

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center p-5 text-danger">Erro de conexão com o Google Sheets.</td></tr>`;
    }
}

init();
