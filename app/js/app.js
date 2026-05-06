window.loadPage = function(page, title, subtitle) {
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;
    
    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => {
            const container = document.getElementById('router-view');
            container.innerHTML = html;
            
            // --- CORREÇÃO: Executar scripts injetados ---
            const scripts = container.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    // Executa o conteúdo do script no escopo global (window)
                    new Function(scripts[i].innerText)();
                } catch (err) {
                    console.error("Erro ao executar script da página:", err);
                }
            }
            // -------------------------------------------
            
            // Converte 'clientes' para 'carregarClientes'
            const funcName = 'carregar' + page.charAt(0).toUpperCase() + page.slice(1);
            
            if (typeof window[funcName] === 'function') {
                console.log(`Executando: ${funcName}...`);
                window[funcName]();
            } else {
                console.warn(`Função ${funcName} não encontrada após carregamento.`);
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('router-view').innerHTML = "<h3>Página em construção</h3>";
        });
};

// --- SIDEBAR E UI ---
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-btn');
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        window.innerWidth <= 768 ? sidebar.classList.toggle('active') : sidebar.classList.toggle('collapsed');
    });
}
window.logout = function() { window.location.href = 'login.html'; };
