window.salvarNovo = async () => {
    const btn = document.getElementById('btn-save-modal');
    const originalText = btn.innerHTML;
    
    // Captura múltiplos tipos selecionados no Select
    const tipos = Array.from(document.getElementById('u-tipo').selectedOptions).map(o => o.value).join(',');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    try {
        await window.API.call('add' + window.botState.origemEmEdicao, { 
            username: document.getElementById('u-username').value, 
            password: document.getElementById('u-password').value,
            imagem: document.getElementById('u-imagem').value, 
            tipo: tipos 
        });
        
        bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
        window.reloadBot();
    } catch(e) {
        console.error("Erro ao salvar:", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
