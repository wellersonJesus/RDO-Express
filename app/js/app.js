// --- Lógica de Inicialização e Header ---
document.addEventListener('DOMContentLoaded', () => {
    // Validação de autenticação
    if (!localStorage.getItem('username')) {
        window.location.href = 'login.html';
        return;
    }

    // Configuração da Sidebar e Toggle
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.toggle('collapsed');
        });
    }

    // Ações dos Menus
    document.querySelectorAll('.menu-title').forEach(item => {
        item.addEventListener('click', function() {
            this.parentElement.classList.toggle('active');
        });
    });

    window.updateHeaderUI();
    window.loadPage('dashboard', 'Dashboard', 'Visão geral operacional');
});

// Atualiza o topo com dados do usuário (Login)
window.updateHeaderUI = () => {
    const username = localStorage.getItem('username');
    const cargo = localStorage.getItem('tipo');
    const imagem = localStorage.getItem('imagem');

    const displayUsername = document.getElementById('display-username');
    const displayCargo = document.getElementById('display-cargo');
    const avatarContainer = document.getElementById('avatar-container');

    if (displayUsername) displayUsername.innerText = username || 'Usuário';
    if (displayCargo) displayCargo.innerText = cargo || 'Colaborador';
    
    if (avatarContainer && imagem && imagem.length > 5) {
        avatarContainer.innerHTML = `<img src="${imagem}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
};

// Navegação Dinâmica
window.loadPage = function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;
    
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    // Carrega o arquivo HTML da página (ex: pages/usuarios/usuarios.html)
    fetch(`pages/${page}/${page}.html`)
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            // Se a página for de usuários, dispara a busca no banco
            if (page === 'usuarios') {
                carregarDadosUsuarios();
            }
        });
};

// --- AQUI ESTÁ A CORREÇÃO PARA A TABELA DE USUÁRIOS ---
async function carregarDadosUsuarios() {
    const tbody = document.getElementById('tabela-usuarios-body');
    if (!tbody) return;

    try {
        // Ajuste a URL abaixo para o seu endpoint real que consulta o banco
        const response = await fetch('/api/usuarios'); 
        const usuarios = await response.json();

        tbody.innerHTML = usuarios.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.tipo}</td>
                <td><img src="${user.imagem}" width="40" style="border-radius:50%"></td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">Erro ao carregar do banco</td></tr>`;
    }
}

// Helpers
window.logout = () => {
    localStorage.clear();
    window.location.href = 'login.html';
};

window.abrirModalLogout = () => {
    const modalEl = document.getElementById('logoutModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
};

