window.loadPage = async function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;

    // 1. Limpeza de ambiente: fecha modais abertos e remove backdrops pendentes
    document.querySelectorAll('.modal.show').forEach(m => {
        const inst = bootstrap.Modal.getInstance(m);
        if (inst) inst.hide();
    });
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    // 2. Atualização visual do cabeçalho
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    try {
        // 3. Busca o HTML da página
        const response = await fetch(`pages/${page}/${page}.html`);
        if (!response.ok) throw new Error(`Página ${page} não encontrada.`);
        
        container.innerHTML = await response.text();

        // 4. Mapeamento de inicialização (Ajuste os caminhos conforme sua estrutura de pastas)
        const pageConfigs = {
            'chat':           { init: 'iniciarChat', script: 'js/chat/chat.js' },
            'bot':            { init: 'initBotPage', script: 'js/bot/bot.js' },
            'administracao':  { init: 'initAdminPage', script: 'js/administracao/administracao.js' }
        };

        const config = pageConfigs[page];

        // 5. Lógica de Execução com Injeção Dinâmica
        if (config) {
            const iniciar = () => {
                if (typeof window[config.init] === 'function') {
                    window[config.init]();
                } else {
                    console.warn(`Função ${config.init} não encontrada.`);
                }
            };

            if (typeof window[config.init] === 'function') {
                iniciar();
            } else {
                console.log(`Carregando script para: ${page}...`);
                const script = document.createElement('script');
                script.src = config.script;
                script.onload = iniciar;
                script.onerror = () => console.error(`Falha ao carregar ${config.script}`);
                document.body.appendChild(script);
            }
        }

    } catch (err) {
        console.error("Erro na navegação:", err);
        container.innerHTML = `<div class="p-4 text-danger text-center">Erro ao carregar o módulo: ${page}.</div>`;
    }
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