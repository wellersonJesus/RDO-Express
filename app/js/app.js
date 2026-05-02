function loadPage(page, title) {
    const container = document.getElementById('router-view');
    document.getElementById('page-title').innerText = title;
    if(window.innerWidth <= 768) toggleSidebar();
    
    // Simula carregamento
    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => container.innerHTML = html)
        .catch(() => container.innerHTML = "<h3>Módulo em desenvolvimento</h3>");
}

function toggleSubmenu(el) {
    const submenu = el.nextElementSibling;
    if (submenu.classList.contains('submenu')) {
        submenu.style.display = (submenu.style.display === 'block') ? 'none' : 'block';
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.querySelector('.overlay').classList.toggle('active');
}

function logout() {
    UI.confirm(
        "Encerrar Sessão", 
        "Deseja realmente sair do sistema?", 
        () => window.location.href = 'login.html'
    );
}

// Init
loadPage('dashboard', 'Dashboard');
