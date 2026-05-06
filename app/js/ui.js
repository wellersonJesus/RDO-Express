document.addEventListener('DOMContentLoaded', () => {
    // Toggle Sidebar
    const toggleBtn = document.getElementById('toggle-btn');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    // Toggle Submenus
    document.querySelectorAll('.menu-title').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const group = this.parentElement;
            document.querySelectorAll('.menu-group').forEach(g => {
                if (g !== group) g.classList.remove('active');
            });
            group.classList.toggle('active');
        });
    });
});

window.logout = () => {
    if(confirm("Deseja realmente sair?")) window.location.href = 'login.html';
};
