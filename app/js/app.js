window.loadPage = function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;
    fetch(`pages/${page}/${page}.html`)
        .then(res => res.ok ? res.text() : Promise.reject())
        .then(html => container.innerHTML = html)
        .catch(() => container.innerHTML = `<div class='alert alert-danger'>Erro ao carregar página.</div>`);
};

window.logout = function() {
    localStorage.clear();
    window.location.href = 'login.html';
};

window.abrirModalLogout = function() {
    new bootstrap.Modal(document.getElementById('logoutModal')).show();
};

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('rdo_auth')) {
        window.location.href = 'login.html';
        return;
    }

    // Atualiza Header
    document.getElementById('display-username').innerText = localStorage.getItem('user_name') || 'Usuário';
    document.getElementById('display-cargo').innerText = localStorage.getItem('user_role') || 'Cargo não definido';

    const img = localStorage.getItem('user_img');
    const avatar = document.getElementById('avatar-container');
    if (avatar && img && img !== 'null' && img.length > 5) {
        avatar.innerHTML = `<img src="${img}" style="width:100%; height:100%; object-fit:cover;">`;
    }

    // Toggle Sidebar
    document.getElementById('toggle-btn').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle(window.innerWidth <= 768 ? 'active' : 'collapsed');
    });

    window.loadPage('dashboard', 'Dashboard', 'Visão geral operacional');
});