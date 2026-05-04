function loadPage(page, title, subtitle) {
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;
    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => document.getElementById('router-view').innerHTML = html)
        .catch(() => document.getElementById('router-view').innerHTML = "<h3>Página em construção</h3>");
}

const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-btn');

toggleBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active'); // Mobile Slide
    } else {
        sidebar.classList.toggle('collapsed'); // Desktop Collapse
    }
});

function logout() {
    // Uso do seu componente UI.confirm aprovado
    UI.confirm(
        "Encerrar Sessão", 
        "Deseja realmente sair do sistema?", 
        () => { window.location.href = 'login.html'; }
    );
}

loadPage('dashboard', 'Dashboard', 'Visão geral operacional');
