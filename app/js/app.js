window.loadPage = function(page, title, subtitle) {
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;
    
    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('router-view');
            container.innerHTML = html;
            
            // Executa scripts contidos na página carregada
            const scripts = container.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    eval(scripts[i].innerText); // Eval executa no contexto global
                } catch (err) { console.error("Erro no script da página:", err); }
            }
            
            // Tenta disparar a função carregar[Nome]
            const funcName = 'carregar' + page.charAt(0).toUpperCase() + page.slice(1);
            if (typeof window[funcName] === 'function') {
                window[funcName]();
            } else {
                console.warn(`Função ${funcName} não encontrada.`);
            }
        })
        .catch(err => {
            console.error("Erro ao carregar página:", err);
            document.getElementById('router-view').innerHTML = "<h3>Erro ao carregar página.</h3>";
        });
};
