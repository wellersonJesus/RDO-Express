#!/bin/bash

# Atualizando app/pages/chat.html com lógica de seleção e modal de pedido
cat << 'INNER_EOF' > app/pages/chat.html
<div class="row g-3 h-100">
    <!-- Topo Status Master -->
    <div class="col-12">
        <div class="card border-0 shadow-sm bg-white rounded-4 overflow-hidden">
            <div class="card-body p-3 d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-3">
                    <i class="bi bi-whatsapp fs-3 text-danger"></i>
                    <div>
                        <h5 class="fw-bold mb-0"><span style="color: #FF0000;">RDO</span> <span style="color: #000000;">Express</span></h5>
                        <small class="text-muted" style="font-size: 0.75rem;">Painel de Atendimento</small>
                    </div>
                </div>
                <div id="barra-selecao" class="d-none animate__animated animate__fadeIn">
                    <button class="btn btn-sm btn-outline-secondary me-2" onclick="cancelarSelecao()">Cancelar</button>
                    <button id="btn-relatorio-multi" class="btn btn-sm btn-primary d-none" onclick="gerarRelatorioSelecao()">Gerar Relatório (<span id="count-sel">0</span>)</button>
                    <button id="btn-pedido-unico" class="btn btn-sm btn-danger d-none" onclick="abrirModalPedido()">Gerar Pedido</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Sidebar -->
    <div class="col-md-4">
        <div class="accordion shadow-sm rounded-4 overflow-hidden bg-white" id="accordionChat" style="height: 580px; overflow-y: auto;">
            <div id="lista-atendentes-chat" class="list-group list-group-flush"></div>
            <div id="lista-grupos-chat" class="list-group list-group-flush border-top"></div>
        </div>
    </div>

    <!-- Área do Chat -->
    <div class="col-md-8">
        <div class="card border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column" style="height: 580px;">
            <div id="chat-header" class="p-3 border-bottom bg-white d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <div id="chat-header-avatar"></div>
                    <div class="ms-3">
                        <h6 id="chat-header-name" class="fw-bold mb-0">Selecione um contato</h6>
                        <small id="chat-header-status" class="text-muted">Offline</small>
                    </div>
                </div>
            </div>

            <div id="chat-messages-container" class="flex-grow-1 p-4 whatsapp-bg overflow-auto d-flex flex-column gap-2">
                <div class="text-center my-5 text-muted small">Cole a mensagem do WhatsApp abaixo para iniciar.</div>
            </div>

            <div class="p-3 bg-white border-top">
                <div class="input-group bg-light rounded-pill p-1">
                    <textarea id="msg-input" class="form-control border-0 bg-transparent px-3" rows="1" placeholder="Cole a mensagem aqui..." style="resize: none;"></textarea>
                    <button class="btn btn-danger rounded-pill px-3 ms-1" onclick="enviarMensagemChat()">
                        <i class="bi bi-send-fill"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal de Geração de Pedido -->
<div class="modal fade" id="modalGerarPedido" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow rounded-4">
            <div class="modal-header border-0 pb-0">
                <h5 class="fw-bold">Calcular Rota do Pedido</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="bg-light p-3 rounded-3 mb-3 small" id="preview-msg-pedido"></div>
                <div class="mb-3">
                    <label class="form-label small fw-bold">Endereço de Coleta</label>
                    <input type="text" id="p-coleta" class="form-control form-control-sm" placeholder="Rua, número, bairro...">
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold">Endereço de Entrega</label>
                    <input type="text" id="p-entrega" class="form-control form-control-sm" placeholder="Destino final...">
                </div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label class="form-label small fw-bold">Taxa Total (R$)</label>
                        <input type="number" id="p-valor" class="form-control form-control-sm" step="0.01">
                    </div>
                    <div class="col-6 mb-3">
                        <label class="form-label small fw-bold">Repasse (R$)</label>
                        <input type="number" id="p-repasse" class="form-control form-control-sm" step="0.01">
                    </div>
                </div>
            </div>
            <div class="modal-footer border-0">
                <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-danger px-4" onclick="finalizarGeracaoPedido()">Gerar Pedido</button>
            </div>
        </div>
    </div>
</div>

<style>
    .whatsapp-bg { background-color: #e5ddd5; background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); }
    .msg-bubble { max-width: 80%; padding: 10px 15px; border-radius: 15px; position: relative; cursor: pointer; transition: all 0.2s; background: white; align-self: flex-start; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .msg-bubble.selected { background-color: #ffe5e5; border: 1px solid #ff0000; }
    .check-icon { display: none; color: #ff0000; position: absolute; right: -25px; top: 50%; transform: translateY(-50%); }
    .msg-bubble.selected .check-icon { display: block; }
</style>

<script>
    let mensagensSelecionadas = [];

    function enviarMensagemChat() {
        const input = document.getElementById('msg-input');
        const texto = input.value.trim();
        if(!texto) return;

        const container = document.getElementById('chat-messages-container');
        const id = Date.now();
        
        const html = `
            <div class="msg-bubble animate__animated animate__fadeInUp" id="msg-${id}" onclick="toggleSelect(${id}, \`${texto}\`)">
                <div class="small">${texto}</div>
                <div class="text-end" style="font-size: 0.6rem; color: #999;">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                <i class="bi bi-check-circle-fill check-icon"></i>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
        input.value = '';
        container.scrollTop = container.scrollHeight;
    }

    function toggleSelect(id, texto) {
        const el = document.getElementById(`msg-${id}`);
        const index = mensagensSelecionadas.findIndex(m => m.id === id);

        if(index > -1) {
            mensagensSelecionadas.splice(index, 1);
            el.classList.remove('selected');
        } else {
            mensagensSelecionadas.push({id, texto});
            el.classList.add('selected');
        }

        atualizarBarraSelecao();
    }

    function atualizarBarraSelecao() {
        const barra = document.getElementById('barra-selecao');
        const btnRel = document.getElementById('btn-relatorio-multi');
        const btnPed = document.getElementById('btn-pedido-unico');
        const countSel = document.getElementById('count-sel');

        if(mensagensSelecionadas.length > 0) {
            barra.classList.remove('d-none');
            countSel.innerText = mensagensSelecionadas.length;
            
            if(mensagensSelecionadas.length === 1) {
                btnPed.classList.remove('d-none');
                btnRel.classList.add('d-none');
            } else {
                btnPed.classList.add('d-none');
                btnRel.classList.remove('d-none');
            }
        } else {
            barra.classList.add('d-none');
        }
    }

    function abrirModalPedido() {
        const msg = mensagensSelecionadas[0].texto;
        document.getElementById('preview-msg-pedido').innerText = msg;
        const modal = new bootstrap.Modal(document.getElementById('modalGerarPedido'));
        modal.show();
    }

    async function finalizarGeracaoPedido() {
        const pedido = {
            action: 'addpedido',
            data_solicitacao: new Date().toISOString(),
            id_cliente: window.chatState.jidSelecionado,
            origem: document.getElementById('p-coleta').value,
            destino: document.getElementById('p-entrega').value,
            solicitacao: mensagensSelecionadas[0].texto,
            valor_total_pedido: document.getElementById('p-valor').value,
            valor_repasse_colaborador: document.getElementById('p-repasse').value,
            status: 'Pendente'
        };

        try {
            await API.call('addpedido', pedido);
            alert("Pedido gerado com sucesso!");
            bootstrap.Modal.getInstance(document.getElementById('modalGerarPedido')).hide();
            cancelarSelecao();
        } catch (e) {
            alert("Erro ao salvar pedido.");
        }
    }

    function cancelarSelecao() {
        mensagensSelecionadas = [];
        document.querySelectorAll('.msg-bubble').forEach(el => el.classList.remove('selected'));
        atualizarBarraSelecao();
    }
</script>
INNER_EOF

# Nota: O server.js e pedidos.html permanecem similares, mas garantindo a rota de API addpedido
echo "Configuração concluída. Execute o arquivo setup_chat_pedidos.sh para aplicar."
