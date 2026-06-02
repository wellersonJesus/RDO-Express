window.loadPage = async function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;

    // 1. Limpeza de ambiente
    document.querySelectorAll('.modal.show').forEach(m => {
        const inst = bootstrap.Modal.getInstance(m);
        if (inst) inst.hide();
    });
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    // 2. Atualização UI
    const titleEl = document.getElementById('page-title');
    const subEl = document.getElementById('page-subtitle');
    if (titleEl) titleEl.innerText = title;
    if (subEl) subEl.innerText = subtitle;

    try {
        // 3. Carregamento do HTML
        const response = await fetch(`pages/${page}/${page}.html`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        container.innerHTML = await response.text();

        // 4. Mapeamento
        const pageScripts = {
            'bot':            { func: 'initBot', path: 'js/bot/bot.js' },
            'administracao':  { func: 'carregarAdmin', path: 'js/administracao/administracao.js', arg: 'clientes' },
            'chat':           { func: 'iniciarChat', path: 'js/chat/chat.js' }
        };

        const config = pageScripts[page];

        // 5. Execução com sistema de espera (Polling)
        if (config) {
            const tentarExecutar = () => {
                if (typeof window[config.func] === 'function') {
                    config.arg ? window[config.func](config.arg) : window[config.func]();
                    return true;
                }
                return false;
            };

            // Se o script já existe, executa. Se não, carrega.
            if (!tentarExecutar()) {
                const script = document.createElement('script');
                script.src = config.path;
                script.onload = () => {
                    // Após carregar, tenta executar por até 2 segundos (a cada 100ms)
                    let tentativas = 0;
                    const check = setInterval(() => {
                        if (tentarExecutar() || tentativas++ > 20) clearInterval(check);
                    }, 100);
                };
                script.onerror = () => console.error(`Falha ao carregar: ${config.path}`);
                document.body.appendChild(script);
            }
        }
        
    } catch (err) {
        console.error("Erro na navegação:", err);
        container.innerHTML = `<div class="p-4 text-center text-danger">Erro ao carregar módulo: ${page}.</div>`;
    }
};

window.loadModal = function(arquivo) {
    return fetch(`pages/chat/${arquivo}`)
        .then(res => res.text())
        .then(html => {
            document.getElementById('modal-container').innerHTML = html;
        });
};
