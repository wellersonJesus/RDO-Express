window.loadPage = function(page, title, subtitle) {
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;
    const container = document.getElementById('router-view');

    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            
            // Re-executa os scripts da página carregada
            const scripts = container.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement("script");
                newScript.text = oldScript.text;
                document.head.appendChild(newScript).parentNode.removeChild(newScript);
            });
        })
        .catch(err => {
            container.innerHTML = "<h3>Erro ao carregar módulo.</h3>";
        });
};
