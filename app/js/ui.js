window.loadPage = function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;
    
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    fetch(`pages/${page}/${page}.html`)
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            
            // --- ESTA É A MUDANÇA ESSENCIAL ---
            if (page === 'bot' && typeof window.initBotPage === 'function') {
                window.initBotPage(); // Agora o bot.js recebe o comando de "acordar"
            }
            if (page === 'usuarios') {
                carregarDadosUsuarios();
            }
        });
};