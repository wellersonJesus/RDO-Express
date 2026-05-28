window.abrirModalEspecifico = (origem) => {
    // Fecha o modal de escolha primeiro
    const modalEscolha = bootstrap.Modal.getInstance(document.getElementById('modalEscolhaTipo'));
    if (modalEscolha) modalEscolha.hide();
    
    // Define a origem para o salvamento
    window.botState.origemEmEdicao = origem;
    
    // Abre o modal de usuário
    const modalUser = new bootstrap.Modal(document.getElementById('modalUsuario'));
    modalUser.show();
};
