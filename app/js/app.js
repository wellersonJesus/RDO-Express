window.AppRDO = window.AppRDO || {
    isFetching: false,
    listaCarregada: false,
    clienteId: null
};

window.loadPage = async function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;

    // Atualiza título e subtítulo
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    try {
        const response = await fetch(`pages/${page}/${page}.html`);
        container.innerHTML = await response.text();

        // Garante que o avatar sempre tente atualizar ao trocar de página
        if (window.atualizarAvatar) window.atualizarAvatar();

        // MAPEAMENTO DE INICIALIZAÇÃO AUTOMÁTICA
        // Aqui chamamos as funções que fazem o "polling" dos dados
        const rotasExecucao = {
            'chat': () => { if(window.iniciarChat) window.iniciarChat(); },
            'bot': () => { if(window.initBot) window.initBot(); },
            'administracao': () => { if(window.carregarAdmin) window.carregarAdmin('clientes'); }
        };

        if (rotasExecucao[page]) {
            rotasExecucao[page]();
        }
    } catch (err) {
        console.error("Erro ao carregar página:", err);
    }
};

window.loadModal = function(arquivo) {
    return fetch(`pages/chat/${arquivo}`)
        .then(res => res.text())
        .then(html => {
            document.getElementById('modal-container').innerHTML = html;
        });
};

window.atualizarAvatar = () => {
    const imgElement = document.getElementById('user-avatar-img');
    const iconElement = document.getElementById('user-avatar-icon');
    const imagem = localStorage.getItem('imagem');

    if (!imgElement || !iconElement) return;

    // Validação estrita
    const hasValidImage = imagem && 
                          imagem !== 'null' && 
                          imagem !== 'undefined' && 
                          imagem.trim().length > 0;

    if (hasValidImage) {
        imgElement.src = imagem;
        imgElement.style.display = 'block';
        iconElement.style.display = 'none';
        
        imgElement.onerror = () => {
            imgElement.style.display = 'none';
            iconElement.style.display = 'block';
        };
    } else {
        imgElement.style.display = 'none';
        iconElement.style.display = 'block';
    }
};