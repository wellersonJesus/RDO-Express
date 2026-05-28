window.salvarNovo = async () => {
    const btn = document.getElementById('btn-save-modal');
    const originalText = btn.innerHTML;
    
    // Captura múltiplos tipos
    const tiposSelecionados = Array.from(document.getElementById('u-tipo').selectedOptions).map(o => o.value).join(',');
    
    // Feedback visual (loop)
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Salvando...';
    
    try {
        const dados = { 
            username: document.getElementById('u-username').value,
            password: document.getElementById('u-password').value,
            imagem: document.getElementById('u-imagem').value,
            tipo: tiposSelecionados
        };
        
        await window.API.call('add' + window.botState.origemEmEdicao, dados);
        bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
        window.reloadBot();
    } catch (e) {
        console.error("Erro ao salvar:", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
