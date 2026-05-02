const UI = {
    // Modal de Confirmação (Remover, Sair, etc)
    confirm: (title, message, onConfirm) => {
        const modalHtml = `
            <div class="modal fade show" style="display:block; background:rgba(0,0,0,0.5);">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content p-3">
                        <h5 class="modal-title text-danger"><i class="bi bi-exclamation-triangle"></i> ${title}</h5>
                        <p class="mt-3">${message}</p>
                        <div class="d-flex gap-2 justify-content-end">
                            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                            <button class="btn btn-rdo btn-rdo-danger" id="confirmAction">Confirmar</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('confirmAction').onclick = () => { onConfirm(); document.querySelector('.modal').remove(); };
    }
};
