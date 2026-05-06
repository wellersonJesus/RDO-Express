document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-btn');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    document.querySelectorAll('.menu-title').forEach(item => {
        item.addEventListener('click', function(e) {
            if (sidebar.classList.contains('collapsed') && window.innerWidth > 768) return;
            e.preventDefault();
            const group = this.parentElement;
            document.querySelectorAll('.menu-group').forEach(g => {
                if (g !== group) g.classList.remove('active');
            });
            group.classList.toggle('active');
        });
    });
});

// Função centralizada para abrir o modal
window.abrirModalLogout = () => {
    const modalElement = document.getElementById('logoutModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
};
