async function loadModule(folder, file, title) {
    const mainContent = document.getElementById('router-view');
    try {
        const response = await fetch(`pages/${folder}/${file}.php`);
        mainContent.innerHTML = await response.text();
    } catch (e) { mainContent.innerHTML = `<div class="p-3 text-danger">Erro.</div>`; }
}

function toggleSubmenu(id) {
    document.querySelectorAll('.submenu').forEach(m => { if(m.id !== id) m.classList.remove('show'); });
    document.getElementById(id).classList.toggle('show');
}

function openLogoutModal() { new bootstrap.Modal(document.getElementById('logoutModal')).show(); }

function confirmLogout() { window.location.href = 'login.html'; }
