<div class="card shadow-sm border-0 p-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="m-0 fw-bold">Gestão de Clientes</h4>
        <button class="btn btn-danger px-4" onclick="alert('Abrir Modal de Novo Cliente')">
            <i class="bi bi-plus-lg me-2"></i> Novo Cliente
        </button>
    </div>

    <div class="table-responsive">
        <table class="table align-middle table-hover">
            <thead class="table-light">
                <tr>
                    <th>ID</th>
                    <th>Nome do Cliente</th>
                    <th>Status</th>
                    <th>Data Cadastro</th>
                    <th class="text-center">Ações</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>#001</td>
                    <td><div class="fw-bold">Wellerson Silva</div><small class="text-muted">wellerson@email.com</small></td>
                    <td><span class="badge bg-success-subtle text-success">Ativo</span></td>
                    <td>30/04/2026</td>
                    <td id="actions-001" class="text-center"></td>
                </tr>
                <tr>
                    <td>#002</td>
                    <td><div class="fw-bold">Rodrigo Pereira</div><small class="text-muted">rodrigo@email.com</small></td>
                    <td><span class="badge bg-warning-subtle text-warning">Pendente</span></td>
                    <td>29/04/2026</td>
                    <td id="actions-002" class="text-center"></td>
                </tr>
                <tr>
                    <td>#003</td>
                    <td><div class="fw-bold">Maria Oliveira</div><small class="text-muted">maria@email.com</small></td>
                    <td><span class="badge bg-secondary-subtle text-secondary">Inativo</span></td>
                    <td>28/04/2026</td>
                    <td id="actions-003" class="text-center"></td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script>
    // Injeção dos botões de CRUD via interpolação
    document.getElementById('actions-001').innerHTML = renderActions('001');
    document.getElementById('actions-002').innerHTML = renderActions('002');
    document.getElementById('actions-003').innerHTML = renderActions('003');
</script>
