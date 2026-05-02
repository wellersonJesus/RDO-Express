<div class="card shadow-sm border-0 p-4">
    <h4 class="fw-bold mb-4">Clientes</h4>
    <div class="table-responsive">
        <table class="table align-middle">
            <thead class="table-light"><tr><th>Nome</th><th class="d-none d-md-table-cell">Status</th><th class="text-center">Ações</th></tr></thead>
            <tbody>
                <tr><td>Wellerson Silva</td><td class="d-none d-md-table-cell"><span class="badge bg-success-subtle text-success">Ativo</span></td><td id="row-1" class="text-center"></td></tr>
            </tbody>
        </table>
    </div>
</div>
<script>document.getElementById('row-1').innerHTML = renderActions('1');</script>
