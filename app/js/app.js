window.loadPage = async function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;

    // 1. Limpeza de modais (Segurança)
    document.querySelectorAll('.modal.show').forEach(m => {
        const inst = bootstrap.Modal.getInstance(m);
        if (inst) inst.hide();
    });

    // 2. Atualização de Títulos
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    try {
        // 3. Carregamento do HTML
        const response = await fetch(`pages/${page}/${page}.html`);
        if (!response.ok) throw new Error(`Página ${page} não encontrada.`);
        container.innerHTML = await response.text();

        // 4. INICIALIZAÇÃO AUTOMÁTICA (O PONTO QUE VOCÊ PRECISAVA)
        // Sempre que o HTML carregar, verificamos o script do Bot
        if (page === 'bot') {
            // Garante que o script do bot esteja carregado antes de inicializar
            if (typeof window.initBot !== 'function') {
                const script = document.createElement('script');
                script.src = 'js/bot/bot.js';
                script.onload = () => window.initBot(); // Inicia assim que carregar
                document.body.appendChild(script);
            } else {
                window.initBot(); // Se já estiver carregado, apenas inicia
            }
        }
        
        // Adicione outros 'if (page === ...)' conforme necessário para outras páginas
        
    } catch (err) {
        console.error("Erro na navegação:", err);
    }
};

window.loadModal = function(arquivo) {
    return fetch(`pages/chat/${arquivo}`)
        .then(res => res.text())
        .then(html => {
            document.getElementById('modal-container').innerHTML = html;
        });
};
