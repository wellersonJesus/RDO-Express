document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.toggle(window.innerWidth <= 768 ? 'active' : 'collapsed');
        });
    }

    document.querySelectorAll('.menu-title').forEach(item => {
        item.addEventListener('click', function() {
            const group = this.parentElement;
            group.classList.toggle('active');
        });
    });
});

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
