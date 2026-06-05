window.atualizarAvatar = () => {
    const avatarContainer = document.getElementById('avatar-container');
    // Pegamos a chave 'imagem' que deve ser definida no seu login.js
    const imagem = localStorage.getItem('imagem'); 

    if (avatarContainer) {
        if (imagem && imagem !== 'null' && imagem !== '' && imagem !== 'undefined') {
            // Se a imagem for uma URL válida, exibe a imagem
            avatarContainer.innerHTML = `<img src="${imagem}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            avatarContainer.style.background = 'transparent';
        } else {
            // Fallback para o ícone padrão
            avatarContainer.innerHTML = `<i class="bi bi-person-fill text-white"></i>`;
        }
    }
};

window.loadPage = function(page, title, subtitle) {
    const container = document.getElementById('router-view');
    if (!container) return;
    
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;

    fetch(`pages/${page}/${page}.html`)
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            window.atualizarAvatar(); // Garante atualização após carregar página
            
            if (page === 'bot' && typeof window.initBotPage === 'function') window.initBotPage();
            if (page === 'usuarios') carregarDadosUsuarios();
        });
};

window.listaMotoboys = ["João Silva", "Maria Oliveira", "Carlos Souza", "Ana Santos"];

window.abrirModalStatus = function(msgId) {
    const statusOptions = [
        { label: "📦 Em rota", value: "ROTA" },
        { label: "⭕ Cancelado", value: "CANCELADO" },
        { label: "✅ Concluído", value: "CONCLUIDO" }
    ];

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

window.selecionarStatus = async function(msgId, statusValue, statusLabel) {
    if (statusValue === "ROTA") {
        const motoboys = await window.carregarMotoboys();
        if (motoboys.length === 0) return Swal.fire('Aviso', 'Nenhum motoboy disponível.', 'warning');

        let optionsMotoboy = motoboys.map(m => 
            `<button class="btn btn-info w-100 mb-2" onclick="window.confirmarStatus('${msgId}', '${statusLabel}', '${m.nome}')">
                ${m.nome}
            </button>`
        ).join('');

        Swal.fire({ title: 'Quem pegou o pedido?', html: optionsMotoboy });
    } else {
        window.confirmarStatus(msgId, statusLabel);
    }
};

window.confirmarStatus = async function(msgId, statusLabel, motoboyNome = "") {
    const msgElement = document.getElementById(msgId);
    if (!msgElement) return;

    const pedidoId = msgElement.getAttribute('data-pedido-id');
    const statusLimpo = statusLabel.replace(/📦|⭕|✅/g, '').trim();

    const resposta = await API.call('updatepedido', {
        id: pedidoId,
        status: statusLimpo,
        motoboy: motoboyNome
    });

    if (resposta && resposta.status === 'success') {
        const statusEl = document.getElementById('status-' + msgId);
        if (statusEl) {
            const emoji = statusLabel.substring(0, 2);
            const tooltip = motoboyNome ? `Status: ${statusLimpo} | Motoboy: ${motoboyNome}` : `Status: ${statusLimpo}`;
            statusEl.innerHTML = `<span style="font-size: 24px;">${emoji}</span>`;
            statusEl.setAttribute('title', tooltip);
        }

        Swal.fire({
            title: 'Atualizado!',
            text: motoboyNome ? `Pedido em rota com ${motoboyNome}` : `Status alterado para ${statusLimpo}`,
            icon: 'success',
            confirmButtonColor: '#a30000'
        });
    } else {
        Swal.fire('Erro', 'Não foi possível salvar no banco: ' + (resposta.message || ''), 'error');
    }
};

window.carregarMotoboys = async function() {
    try {
        const listaColaboradores = await API.call('getcolaborador'); 
        if (!Array.isArray(listaColaboradores)) return [];
        return listaColaboradores
            .filter(c => String(c.colaborador || "").toLowerCase().includes('motoboy'))
            .map(c => ({ nome: c.username }));
    } catch (e) {
        console.error("Erro ao buscar motoboys:", e);
        return [];
    }
};