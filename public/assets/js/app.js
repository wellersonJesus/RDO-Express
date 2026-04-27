const API_URL = "SUA_URL_DO_APP_SCRIPT_AQUI"; // <--- COLOQUE SUA URL AQUI

function showPage(pageId) {
    document.getElementById('page-home').classList.add('hidden');
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('page-painel').classList.add('hidden');
    document.getElementById('page-' + pageId).classList.remove('hidden');
    if(pageId === 'painel') loadData();
}

function doLogin() {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    if(u === 'Master' && p === '123456') {
        showPage('painel');
    } else {
        alert('Acesso negado!');
    }
}

function logout() { showPage('home'); }

async function loadData() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">Carregando...</td></tr>';
    const res = await fetch(API_URL + "?action=read");
    const data = await res.json();
    tbody.innerHTML = '';
    data.forEach(item => {
        tbody.innerHTML += `<tr>
            <td>${item.nome || ''}</td>
            <td>${item.email || ''}</td>
            <td class="text-end"><button class="btn btn-sm text-danger"><i class="bi bi-trash"></i></button></td>
        </tr>`;
    });
}

async function addData() {
    const nome = document.getElementById('inputNome').value;
    const email = document.getElementById('inputEmail').value;
    await fetch(API_URL + "?action=create", {
        method: 'POST',
        body: JSON.stringify({nome, email})
    });
    alert('Dados salvos!');
    loadData();
}
