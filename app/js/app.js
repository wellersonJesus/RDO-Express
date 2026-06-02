window.loadPage = async function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;

    // 1. Limpeza rigorosa de modais e backdrops pendentes
    document.querySelectorAll('.modal.show').forEach(m => {
        const inst = bootstrap.Modal.getInstance(m);
        if (inst) inst.hide();
    });
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    // 2. Atualização UI
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    try {
        // 3. Carregamento do HTML
        const response = await fetch(`pages/${page}/${page}.html`);
        if (!response.ok) throw new Error(`Página ${page} não encontrada.`);
        container.innerHTML = await response.text();

        // 4. MAPEAMENTO INTELIGENTE (Adicione novas páginas aqui)
        const pageScripts = {
            'bot':            { func: 'initBot', path: 'js/bot/bot.js' },
            'administracao':  { func: 'carregarAdmin', path: 'js/administracao/administracao.js', arg: 'clientes' },
            'chat':           { func: 'iniciarChat', path: 'js/chat/chat.js' }
        };

        const config = pageScripts[page];

        // 5. Execução automática com verificação de carregamento
        if (config) {
            const executar = () => {
                if (typeof window[config.func] === 'function') {
                    config.arg ? window[config.func](config.arg) : window[config.func]();
                } else {
                    console.error(`Função ${config.func} não definida no script carregado.`);
                }
            };

            if (typeof window[config.func] === 'function') {
                executar();
            } else {
                const script = document.createElement('script');
                script.src = config.path;
                script.onload = executar;
                script.onerror = () => console.error(`Falha ao carregar script: ${config.path}`);
                document.body.appendChild(script);
            }
        }
        
    } catch (err) {
        console.error("Erro fatal na navegação:", err);
        container.innerHTML = `<div class="p-4 text-center text-danger">Erro ao carregar a página: ${page}. Verifique o console.</div>`;
    }
};

window.loadModal = function(arquivo) {
    return fetch(`pages/chat/${arquivo}`)
        .then(res => res.text())
        .then(html => {
            document.getElementById('modal-container').innerHTML = html;
        });
};
