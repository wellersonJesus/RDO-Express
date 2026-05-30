let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
});

async function carregarDados() {
    const listEl = document.getElementById('lista-contatos-chat');
    const syncIcon = document.getElementById('sync-icon-chat');
    
    if (!listEl) return;
    if (syncIcon) syncIcon.classList.add('spinner-rotate');

    try {
        const clientes = await API.call('getclientes') || [];
        const isMasterOn = localStorage.getItem('bot_master_active') === 'true';

        listEl.innerHTML = clientes.map(c => {
            // Regra: Master OFF força todos como Offline
            const statusReal = String(c.status).toUpperCase() === 'TRUE';
            const isOnline = isMasterOn ? statusReal : false;
            
            const statusText = isOnline ? 'Online' : 'Offline';
            const statusColor = isOnline ? '#28a745' : '#adb5bd';

            return `
                <div class="list-group-item list-group-item-action border-0 d-flex align-items-center p-2 contact-item-clean" 
                     onclick="abrirConversa('${c.id}')">
                    <div class="position-relative">
                        <img src="${c.imagem || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" 
                             class="rounded-circle img-avatar-small">
                        <span class="position-absolute bottom-0 end-0 rounded-circle border border-white status-dot" 
                              style="background-color: ${statusColor};"></span>
                    </div>
                    <div class="ms-3 overflow-hidden">
                        <div class="contact-name text-truncate">${c.nome || c.username || 'Sem nome'}</div>
                        <div class="contact-status">${statusText}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Erro ao carregar lista:", e);
        listEl.innerHTML = '<div class="p-3 text-center text-danger small">Erro ao carregar.</div>';
    } finally {
        if (syncIcon) syncIcon.classList.remove('spinner-rotate');
    }
}

function filtrarContatos() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const input = document.getElementById('chat-search');
        const filter = input.value.toLowerCase();
        const list = document.getElementById('lista-contatos-chat');
        const items = list.getElementsByClassName('list-group-item');
        let encontradoAlgum = false;

        Array.from(items).forEach(item => {
            const nome = item.querySelector('.contact-name').textContent.toLowerCase();
            const visivel = nome.includes(filter);
            item.style.display = visivel ? "flex" : "none";
            if (visivel) encontradoAlgum = true;
        });

        // Gerencia mensagem de "Nenhum resultado"
        let msg = document.getElementById('no-results-msg');
        if (!encontradoAlgum) {
            if (!msg) list.insertAdjacentHTML('beforeend', '<div id="no-results-msg" class="p-3 text-center text-muted small">Nenhum contato encontrado.</div>');
        } else if (msg) {
            msg.remove();
        }
    }, 200);
}

function abrirConversa(id) {
    console.log("Abrindo chat com ID:", id);
    // Sua lógica de carregar mensagens aqui
}