// Navegação Dinâmica Única
window.loadPage = function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;
    
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    fetch(`pages/${page}/${page}.html`)
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            
            // Verificação de inicialização para páginas específicas
            if (page === 'bot' && typeof window.initBotPage === 'function') {
                console.log("Inicializando Bot...");
                window.initBotPage(); 
            }
            if (page === 'usuarios') {
                carregarDadosUsuarios();
            }
        })
        .catch(err => console.error("Erro ao carregar página:", err));
};
window.loadPage = function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    fetch(`pages/${page}/${page}.html`)
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            // Dispara a inicialização correta baseada na página
            if (page === 'bot' && typeof window.initBotPage === 'function') window.initBotPage();
            if (page === 'chat' && typeof window.carregarDados === 'function') window.carregarDados();
        });
};
