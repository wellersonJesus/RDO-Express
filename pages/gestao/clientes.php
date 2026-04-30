<div class="card shadow-sm border-0 p-3 p-md-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="m-0 fw-bold">Clientes</h4>
        <button class="btn btn-danger" onclick="alert('Novo Cliente')">
            <i class="bi bi-person-plus-fill me-md-2"></i><span class="d-none d-md-inline">Novo Cliente</span>
        </button>
    </div>

    <div class="table-responsive">
        <table class="table align-middle">
            <thead class="table-light">
                <tr>
                    <th class="d-none d-md-table-cell">ID</th>
                    <th>Nome do Cliente</th>
                    <th class="d-none d-md-table-cell">Status</th>
                    <th class="text-center">Ações</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="d-none d-md-table-cell">#001</td>
                    <td><div class="fw-bold">Wellerson Silva</div><small class="text-muted">wellerson@email.com</small></td>
                    <td class="d-none d-md-table-cell"><span class="badge bg-success-subtle text-success">Ativo</span></td>
                    <td id="row-001" class="text-center"></td>
                </tr>
                <tr>
                    <td class="d-none d-md-table-cell">#002</td>
                    <td><div class="fw-bold">Rodrigo Pereira</div><small class="text-muted">rodrigo@email.com</small></td>
                    <td class="d-none d-md-table-cell"><span class="badge bg-warning-subtle text-warning">Pendente</span></td>
                    <td id="row-002" class="text-center"></td>
                </tr>
                <tr>
                    <td class="d-none d-md-table-cell">#003</td>
                    <td><div class="fw-bold">Maria Oliveira</div><small class="text-muted">maria@email.com</small></td>
                    <td class="d-none d-md-table-cell"><span class="badge bg-secondary-subtle text-secondary">Inativo</span></td>
                    <td id="row-003" class="text-center"></td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script>
    // Injeção dos botões usando o motor renderActions que criamos no app.js
    document.getElementById('row-001').innerHTML = renderActions('001');
    document.getElementById('row-002').innerHTML = renderActions('002');
    document.getElementById('row-003').innerHTML = renderActions('003');
</script>
