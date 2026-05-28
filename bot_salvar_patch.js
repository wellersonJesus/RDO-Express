window.salvarNovo = async () => {
    const btn = document.getElementById('btn-save-modal');
    // Captura múltiplos tipos do select
    const select = document.getElementById('u-tipo');
    const tipos = Array.from(select.selectedOptions).map(o => o.value).join(',');

    const dados = { 
        username: document.getElementById('u-username').value, 
        password: document.getElementById('u-password').value,
        imagem: document.getElementById('u-imagem').value,
        tipo: tipos
    };

    btn.disabled = true;
    btn.innerText = "Salvando...";

    try {
        await window.API.call('add' + window.botState.origemEmEdicao, dados);
        bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
        window.reloadBot();
    } catch(e) {
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerText = "Salvar";
    }
};
