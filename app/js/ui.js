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

window.selecionarStatus = async function(msgId, statusValue, statusLabel) {
    if (statusValue === "ROTA") {
        const motoboys = await window.carregarMotoboys();
        if (motoboys.length === 0) return Swal.fire('Aviso', 'Nenhum motoboy encontrado.', 'warning');

        let optionsMotoboy = motoboys.map(m => 
            `<button class="btn btn-info w-100 mb-2" onclick="window.confirmarDuplo('${msgId}', '${statusLabel}', '${m.nome}')">
                ${m.nome}
            </button>`
        ).join('');

        Swal.fire({ title: 'Quem pegou o pedido?', html: optionsMotoboy });
    } else {
        // Para Cancelado/Concluído, vai direto para a confirmação
        window.confirmarDuplo(msgId, statusLabel, "");
    }
};

window.confirmarDuplo = function(msgId, statusLabel, motoboyNome) {
    const msgElement = document.getElementById(msgId);
    const pedidoId = msgElement ? msgElement.getAttribute('data-pedido-id') : null;

    // PROTEÇÃO: Se não achar o ID, avisa o usuário e não tenta salvar
    if (!pedidoId || pedidoId === "null" || pedidoId === "") {
        console.error("ID do pedido não encontrado na mensagem!", msgId);
        Swal.fire('Erro', 'Esta mensagem não possui um ID de pedido válido. O pedido pode ter sido deletado.', 'error');
        return;
    }

    Swal.fire({
        title: 'Confirmar Seleção?',
        text: `Deseja salvar: ${statusLabel}${motoboyNome ? ' com ' + motoboyNome : ''}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirmar'
    }).then((result) => {
        if (result.isConfirmed) {
            window.finalizarStatusNoBanco(msgId, statusLabel, motoboyNome);
        }
    });
};

window.finalizarStatusNoBanco = async function(msgId, statusLabel, motoboyNome) {
    const msgElement = document.getElementById(msgId);
    const pedidoId = msgElement.getAttribute('data-pedido-id');
    const statusLimpo = statusLabel.replace(/📦|⭕|✅/g, '').trim();

    // Mostra o carregamento rápido
    Swal.fire({ title: 'Salvando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const resposta = await API.call('updatepedido', {
        id: pedidoId,
        status: statusLimpo,
        motoboy: motoboyNome
    });

    if (resposta && resposta.status === 'success') {
        const statusEl = document.getElementById('status-' + msgId);
        if (statusEl) {
            const emoji = statusLabel.substring(0, 2);
            statusEl.innerHTML = `<span style="font-size: 24px;">${emoji}</span>`;
            statusEl.setAttribute('title', motoboyNome ? `Status: ${statusLimpo} | Motoboy: ${motoboyNome}` : `Status: ${statusLimpo}`);
        }
        
        Swal.fire({
            title: 'Salvo com sucesso!',
            text: 'Dados gravados no banco.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    } else {
        Swal.fire('Erro', 'Falha ao salvar no banco.', 'error');
    }
};

window.confirmarStatus = async function(msgId, statusLabel, motoboyNome = "") {
    const msgElement = document.getElementById(msgId);
    if (!msgElement) return;

    // Recupera o ID do pedido vinculado à mensagem
    const pedidoId = msgElement.getAttribute('data-pedido-id');
    const statusLimpo = statusLabel.replace(/📦|⭕|✅/g, '').trim();

    // Preparação dos dados para a sua função handleUpdate do Apps Script
    const dadosUpdate = {
        id: pedidoId,
        status: statusLimpo, // Deve ser igual ao nome da coluna na sua planilha
        motoboy: motoboyNome   // Deve ser igual ao nome da coluna na sua planilha
    };

    // Chamada para sua API (que executa a handleUpdate)
    const resposta = await API.call('updatepedido', dadosUpdate);

    if (resposta && resposta.status === 'success') {
        // Atualiza a interface (Chat)
        const statusEl = document.getElementById('status-' + msgId);
        
        if (statusEl) {
            // Define o emoji e o title (mãozinha)
            const emoji = statusLabel.substring(0, 2);
            const tooltip = motoboyNome ? `Status: ${statusLimpo} | Motoboy: ${motoboyNome}` : `Status: ${statusLimpo}`;
            
            statusEl.innerHTML = `<span style="font-size: 24px;">${emoji}</span>`;
            statusEl.setAttribute('title', tooltip);
        }

        // Feedback de sucesso igual aos outros status
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

/**
 * LÓGICA DE STATUS E MOTOBY NO CHAT
 */
window.carregarMotoboys = async function() {
    try {
        // 1. Busca a lista completa da planilha 'colaboradores'
        const listaColaboradores = await API.call('getcolaborador'); 
        
        if (!Array.isArray(listaColaboradores)) return [];

        // 2. Filtragem Lógica:
        // - Verifica se o campo 'colaborador' contém a palavra 'motoboy' (ignora maiúsculas/minúsculas)
        // - Retorna apenas um objeto com o campo que você quer exibir (username)
        const motoboys = listaColaboradores
            .filter(c => String(c.colaborador || "").toLowerCase().includes('motoboy'))
            .map(c => ({
                nome: c.username // Pega o nome limpo do colaborador
            }));

        console.log("Motoboys filtrados:", motoboys);
        return motoboys;
        
    } catch (e) {
        console.error("Erro ao buscar motoboys:", e);
        return [];
    }
};

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
        
        if (motoboys.length === 0) {
            Swal.fire('Aviso', 'Nenhum motoboy disponível.', 'warning');
            return;
        }

        // Agora usamos apenas 'm.nome', o que garante que virá apenas o username
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

