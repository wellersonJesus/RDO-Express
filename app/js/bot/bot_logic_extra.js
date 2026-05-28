// Função para o "olhinho" da senha
window.toggleSenha = () => {
    const input = document.getElementById('u-password');
    const icon = document.getElementById('eye-icon');
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
        input.type = "password";
        icon.classList.replace('bi-eye-slash', 'bi-eye');
    }
};

// Ajuste na função salvar para garantir que os campos novos sejam lidos
window.salvarNovo = async () => {
    const btn = document.getElementById('btn-save-modal');
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner-rotate"></i> Salvando...';
    
    const tipos = Array.from(document.getElementById('u-tipo').selectedOptions).map(o => o.value).join(',');
    
    await window.API.call('add' + window.botState.origemEmEdicao, { 
        username: document.getElementById('u-username').value, 
        password: document.getElementById('u-password').value,
        imagem: document.getElementById('u-imagem').value, 
        tipo: tipos
    });
    
    bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
    window.reloadBot();
    btn.innerHTML = "Salvar";
};
