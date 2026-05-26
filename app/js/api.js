// app/js/app.js

window.loadPage = function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;
    
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    fetch(`pages/${page}/${page}.html`)
        .then(res => res.ok ? res.text() : Promise.reject())
        .then(html => { container.innerHTML = html; })
        .catch(() => { container.innerHTML = `<div class='alert alert-danger'>Erro ao carregar.</div>`; });
};

function updateProfileUI() {
    const name = localStorage.getItem('user_name');
    const role = localStorage.getItem('user_role');
    const img = localStorage.getItem('user_img');

    document.getElementById('display-username').innerText = name || 'Usuário';
    document.getElementById('display-cargo').innerText = role || 'Colaborador';

    const avatar = document.getElementById('avatar-container');
    if (avatar) {
        // Se img for válida e não for 'null' ou string vazia
        if (img && img !== 'null' && img.length > 5) {
            avatar.innerHTML = `<img src="${img}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            // Ícone padrão do Bootstrap se não houver imagem
            avatar.innerHTML = `<i class="bi bi-person-fill text-white" style="font-size: 1.5rem;"></i>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('rdo_auth')) {
        window.location.href = 'login.html';
        return;
    }
    updateProfileUI();
    window.loadPage('dashboard', 'Dashboard', 'Visão geral');
});