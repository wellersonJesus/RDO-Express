window.loadPage = function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;
    
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    fetch(`pages/${page}/${page}.html`)
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            
            // --- ESTA É A MUDANÇA ESSENCIAL ---
            if (page === 'bot' && typeof window.initBotPage === 'function') {
                window.initBotPage(); // Agora o bot.js recebe o comando de "acordar"
            }
            if (page === 'usuarios') {
                carregarDadosUsuarios();
            }
        });
};

window.abrirModalStatus = function(msgId) {
    const statusOptions = [
        { label: "⏳ Aguardando", full: "⏳ Aguardando confirmação do Motoboy!" },
        { label: "📦 Em rota", full: "📦 Pedido em rota." },
        { label: "⭕ Cancelado", full: "⭕ Pedido CANCELADO!" },
        { label: "✅ Concluído", full: "✅ Pedido CONCLUÍDO." }
    ];

    let htmlOptions = statusOptions.map(opt => `
        <button class="btn btn-outline-secondary w-100 mb-2" 
                onclick="window.atualizarStatus('${msgId}', '${opt.full}')">
            ${opt.label}
        </button>
    `).join('');

    Swal.fire({
        title: 'Status do Pedido',
        html: htmlOptions,
        showCancelButton: true,
        cancelButtonText: 'Fechar',
        showConfirmButton: false
    });
};

window.atualizarStatus = function(msgId, novoStatus) {
    const statusEl = document.getElementById('status-' + msgId);
    
    // Mapeamento dos ícones para cada status (usando o mesmo tamanho do anterior)
    const icones = {
        "⏳ Aguardando": "bi-clock-history",
        "📦 Em rota": "bi-box-seam",
        "⭕ Cancelado": "bi-x-circle",
        "✅ Concluído": "bi-check-circle"
    };

    // Extrai o emoji e o texto do rótulo
    const emoji = novoStatus.substring(0, 2);
    const textoLimpo = novoStatus.replace(/⏳|📦|⭕|✅/g, '').trim();

    if (statusEl) {
        // Mantém o mesmo tamanho de fonte do anterior (24px)
        statusEl.innerHTML = `<span style="font-size: 24px;">${emoji}</span>`;
        // Define o title para exibir o texto completo no hover
        statusEl.setAttribute('title', textoLimpo);
    }
    Swal.close();
};