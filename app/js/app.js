function loadPage(page, title, subtitle) {
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;
    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => document.getElementById('router-view').innerHTML = html)
        .catch(() => document.getElementById('router-view').innerHTML = "<h3>Página em construção</h3>");
}

// O logout agora sempre passa pelo modal
function logout() {
    UI.confirm(
        "Encerrar Sessão", 
        "Deseja realmente sair do sistema?", 
        () => {
            window.location.href = 'login.html';
        }
    );
}

loadPage('dashboard', 'Dashboard', 'Visão geral operacional');
