window.salvarNovo = async () => {
    const btn = document.getElementById('btn-save-modal');
    const originalText = btn.innerHTML;
    
    // Captura múltiplos tipos
    const select = document.getElementById('u-tipo');
    const tipos = Array.from(select.selectedOptions).map(o => o.value).join(',');
    
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
        console.error("Erro:", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};
