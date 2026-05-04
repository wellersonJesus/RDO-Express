window.loadPage = function(page, title, subtitle) {
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;
    
    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => {
            document.getElementById('router-view').innerHTML = html;
            if(page === 'usuarios') {
                console.log("Página de usuários carregada, iniciando busca de dados...");
                carregarUsuarios();
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('router-view').innerHTML = "<h3>Página em construção</h3>";
        });
};

window.carregarUsuarios = async function() {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) {
        console.error("ERRO: Elemento #user-table-body não encontrado no HTML!");
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Buscando no banco...</td></tr>';
    
    const users = await API.call('getUsuarios');
    
    if (!users || users.status === 'error') {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Erro: ${users?.message || 'Resposta vazia'}</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.nome}</td>
            <td>${u.login}</td>
            <td><span class="badge bg-light text-dark border">${u.cargo}</span></td>
        </tr>
    `).join('');
};

// --- SIDEBAR E UI ---
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-btn');
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        window.innerWidth <= 768 ? sidebar.classList.toggle('active') : sidebar.classList.toggle('collapsed');
    });
}
window.logout = function() { UI.confirm("Encerrar Sessão", "Sair?", () => { window.location.href = 'login.html'; }); };
