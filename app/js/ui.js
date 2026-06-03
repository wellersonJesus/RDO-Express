window.loadPage = function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;
    
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    fetch(`pages/${page}/${page}.html`)
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            if (page === 'bot' && typeof window.initBotPage === 'function') {
                window.initBotPage();
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

    // Note: Usamos a classe 'btn-outline-primary' que será estilizada pelo CSS Vermelho Suave
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
        cancelButtonText: 'Fechar',
        confirmButtonText: 'Cancelar' // Apenas um fallback
    });
};

window.selecionarStatus = function(msgId, statusValue, statusLabel) {
    if (statusValue === "ROTA") {
        // Seleção de Motoboy (usamos btn-info que via CSS foi mapeado para vermelho suave)
        let optionsMotoboy = window.listaMotoboys.map(m => 
            `<button class="btn btn-info w-100 mb-2" onclick="window.confirmarStatus('${msgId}', '${statusLabel}', '${m}')">${m}</button>`
        ).join('');

        Swal.fire({
            title: 'Quem pegou o pedido?',
            html: optionsMotoboy,
            showCancelButton: true,
            cancelButtonText: 'Voltar'
        });
    } else {
        window.confirmarStatus(msgId, statusLabel);
    }
};

window.confirmarStatus = function(msgId, statusLabel, motoboy = "") {
    const statusEl = document.getElementById('status-' + msgId);
    
    // Extrai o emoji do início da string
    const emoji = statusLabel.substring(0, 2);
    const textoMotoboy = motoboy ? ` | Motoboy: ${motoboy}` : "";
    const textoCompleto = statusLabel.replace(/📦|⭕|✅/g, '').trim() + textoMotoboy;
    
    if (statusEl) {
        statusEl.innerHTML = `<span style="font-size: 24px;">${emoji}</span>`;
        statusEl.setAttribute('title', textoCompleto);
    }
    
    Swal.fire({
        title: 'Atualizado!',
        text: `Status: ${statusLabel}${motoboy ? ' com ' + motoboy : ''}`,
        icon: 'success',
        confirmButtonColor: '#d9534f' // Força o botão de OK ser vermelho
    });
};