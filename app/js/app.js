window.loadPage = function(page, title, subtitle) {
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    if(pageTitle) pageTitle.innerText = title;
    if(pageSubtitle) pageSubtitle.innerText = subtitle;

    const container = document.getElementById('router-view');
    if (!container) return;

    fetch(`pages/${page}.html`)
        .then(res => {
            if (!res.ok) throw new Error('Página não encontrada');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            const scripts = container.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement("script");
                newScript.text = oldScript.text;
                document.head.appendChild(newScript).parentNode.removeChild(newScript);
            });
        })
        .catch(err => {
            container.innerHTML = "<div class='alert alert-danger'>Erro ao carregar módulo: " + page + "</div>";
        });
};

document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('user_name');
    if (!user && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
    }
});
