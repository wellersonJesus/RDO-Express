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

window.listaMotoboys = ["João Silva", "Maria Oliveira", "Carlos Souza", "Ana Santos"];

window.abrirModalStatus = function(msgId) {
    const statusOptions = [
        { label: "📦 Em rota", value: "ROTA" },
        { label: "⭕ Cancelado", value: "CANCELADO" },
        { label: "✅ Concluído", value: "CONCLUIDO" }
    ];

    // Cria o HTML dos botões de status
    let htmlOptions = statusOptions.map(opt => `
        <button class="btn btn-outline-primary w-100 mb-2" 
                onclick="window.selecionarStatus('${msgId}', '${opt.value}', '${opt.label}')">
            ${opt.label}
        </button>
    `).join('');

    Swal.fire({
        title: 'Gerenciar Pedido',
        html: htmlOptions,
        showCancelButton: true,
        cancelButtonText: 'Fechar'
    });
};

window.selecionarStatus = function(msgId, statusValue, statusLabel) {
    if (statusValue === "ROTA") {
        // Se for rota, abre seleção de motoboy
        let optionsMotoboy = window.listaMotoboys.map(m => 
            `<button class="btn btn-info text-white w-100 mb-2" onclick="window.confirmarStatus('${msgId}', '${statusLabel}', '${m}')">${m}</button>`
        ).join('');

        Swal.fire({
            title: 'Quem pegou o pedido?',
            html: optionsMotoboy
        });
    } else {
        // Se for cancelado ou concluído, confirma direto
        window.confirmarStatus(msgId, statusLabel);
    }
};

window.confirmarStatus = function(msgId, statusLabel, motoboy = "") {
    const statusEl = document.getElementById('status-' + msgId);
    const emoji = statusLabel.substring(0, 2);
    const textoMotoboy = motoboy ? ` | Motoboy: ${motoboy}` : "";
    
    if (statusEl) {
        statusEl.innerHTML = `<span style="font-size: 24px;">${emoji}</span>`;
        statusEl.setAttribute('title', statusLabel + textoMotoboy);
    }
    Swal.fire('Atualizado!', `Status alterado para: ${statusLabel}${motoboy ? ' com ' + motoboy : ''}`, 'success');
};