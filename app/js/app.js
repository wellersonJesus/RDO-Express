async function loadPage(page, title) {
    const container = document.getElementById('router-view');
    const pageTitle = document.getElementById('page-title');
    
    // Atualiza título e fecha menu mobile
    pageTitle.innerText = title;
    if(window.innerWidth <= 768) toggleSidebar();
    
    try {
        const response = await fetch(`pages/${page}.html`);
        const html = await response.text();
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = "<h3>Erro ao carregar página.</h3>";
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.querySelector('.overlay').classList.toggle('active');
}

function logout() {
    UI.confirm(
        "Sair do Painel", 
        "Deseja realmente encerrar a sessão?", 
        () => {
            window.location.href = 'login.html';
        }
    );
}

// Inicializa
loadPage('dashboard', 'Dashboard');
