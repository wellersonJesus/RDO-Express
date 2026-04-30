async function loadModule(folder, file, title) {
    const route = `pages/${folder}/${file}.php`;
    const view = document.getElementById('router-view');
    document.getElementById('dynamic-title').innerText = title;
    try {
        const response = await fetch(route);
        view.innerHTML = await response.text();
    } catch (e) { view.innerHTML = `<div class="p-3 text-danger">Erro ao carregar módulo.</div>`; }
    if(window.innerWidth <= 768) toggleSidebar();
}
function toggleSubmenu(id) {
    document.querySelectorAll('.submenu').forEach(m => { if (m.id !== id) m.classList.remove('show'); });
    document.getElementById(id).classList.toggle('show');
}
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('show');
    document.querySelector('.overlay').classList.toggle('show');
}
function openModal(id) { new bootstrap.Modal(document.getElementById(id)).show(); }

// Motor de Interpolação de Botões (CRUD)
function renderActions(id) {
    return `
        <div class="d-flex justify-content-center">
            <button class="btn-action btn-view" title="Visualizar" onclick="console.log('Ver ${id}')"><i class="bi bi-eye"></i></button>
            <button class="btn-action btn-edit" title="Editar" onclick="console.log('Editar ${id}')"><i class="bi bi-pencil"></i></button>
            <button class="btn-action btn-delete" title="Remover" onclick="openModal('exclusaoModal')"><i class="bi bi-trash"></i></button>
        </div>
    `;
}
