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

window.loadModal = async function(arquivo) {
    const container = document.getElementById('modal-container');
    const res = await fetch(`pages/chat/${arquivo}`);
    const html = await res.text();
    container.innerHTML = html;
    
    // Seleciona o modal que acabou de chegar e abre
    const modalEl = container.querySelector('.modal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
};