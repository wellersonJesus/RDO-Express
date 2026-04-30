<div class="card shadow-sm border-0 p-3 p-md-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="m-0">Clientes</h4>
        <button class="btn btn-danger" onclick="alert('Novo Cliente')">
            <i class="bi bi-person-plus-fill me-md-2"></i><span class="d-none d-md-inline">Novo Cliente</span>
        </button>
    </div>

    <div class="table-responsive">
        <table class="table align-middle">
            <thead class="table-light">
                <tr>
                    <th>Nome do Cliente</th>
                    <th class="d-none d-md-table-cell">Status</th>
                    <th class="text-center">Ações</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Wellerson Silva<br><small class="text-muted">wellerson@email.com</small></td>
                    <td class="d-none d-md-table-cell"><span class="badge bg-success-subtle text-success">Ativo</span></td>
                    <td id="row-001" class="text-center"></td>
                </tr>
                <tr>
                    <td>Rodrigo Pereira<br><small class="text-muted">rodrigo@email.com</small></td>
                    <td class="d-none d-md-table-cell"><span class="badge bg-warning-subtle text-warning">Pendente</span></td>
                    <td id="row-002" class="text-center"></td>
                </tr>
                <tr>
                    <td>Maria Oliveira<br><small class="text-muted">maria@email.com</small></td>
                    <td class="d-none d-md-table-cell"><span class="badge bg-secondary-subtle text-secondary">Inativo</span></td>
                    <td id="row-003" class="text-center"></td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script>
    // Motor de renderização mantido
    document.getElementById('row-001').innerHTML = renderActions('001');
    document.getElementById('row-002').innerHTML = renderActions('002');
    document.getElementById('row-003').innerHTML = renderActions('003');
</script>
