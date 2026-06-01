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
    if (!container) {
        console.error("Erro: #modal-container não encontrado no index.html");
        return;
    }
    try {
        const res = await fetch(`pages/chat/${arquivo}`);
        if (!res.ok) throw new Error("Falha ao carregar arquivo");
        container.innerHTML = await res.text();
        
        // Inicializa e exibe o modal
        const modalEl = container.querySelector('.modal');
        if (modalEl) {
            new bootstrap.Modal(modalEl).show();
        }
    } catch (e) {
        console.error("Erro ao carregar modal:", e);
    }
};