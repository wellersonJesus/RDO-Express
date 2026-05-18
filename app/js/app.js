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
                // Remove instâncias anteriores injetadas no head com o mesmo conteúdo para evitar vazamento
                const scriptsAntigos = document.head.querySelectorAll(`script[data-origin="${page}"]`);
                scriptsAntigos.forEach(s => s.parentNode.removeChild(s));

                const newScript = document.createElement("script");
                newScript.setAttribute('data-origin', page);

                // TRATAMENTO EXPLICITO DE ESCOPO COM PRESERVAÇÃO DE FUNÇÕES GLOBAIS:
                // Se o script usar declarações globais com 'let dadosChat', transformamos de forma segura 
                // em declarações que não causam SyntaxError ao serem reinjetadas no escopo do navegador,
                // permitindo que os binds de clique (como enviar mensagem/aviaozinho) continuem funcionando.
                let cleanText = oldScript.text
                    .replace(/let\s+dadosChat\s*=/g, 'var dadosChat =')
                    .replace(/const\s+dadosChat\s*=/g, 'var dadosChat =');

                newScript.text = cleanText;
                document.head.appendChild(newScript);
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
