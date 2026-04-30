<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>RDO Express | SRE</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
    <div id="admin-panel">
        <aside class="sidebar">
            <div class="py-4 text-center border-bottom"><h4 class="fw-bold m-0"><span class="text-danger">RDO</span> EXPRESS</h4></div>
            <nav class="flex-grow-1 pt-3">
                <a onclick="toggleSubmenu('m-cad')"><i class="bi bi-people"></i> Cadastros</a>
                <ul class="submenu" id="m-cad">
                    <li><a onclick="loadModule('gestao', 'clientes', 'Clientes')">Clientes</a></li>
                </ul>
            </nav>
            <div class="mt-auto border-top p-3"><a onclick="openLogoutModal()" class="text-danger"><i class="bi bi-box-arrow-left"></i> Sair</a></div>
        </aside>
        <div class="flex-grow-1 d-flex flex-column">
            <header class="top-header">
                <h5 class="fw-bold text-dark m-0" id="dynamic-title">Dashboard</h5>
                <div class="d-flex align-items-center gap-3">
                    <div class="text-end"><div class="fw-bold text-dark lh-1">Gestor</div><small class="text-danger fw-bold" style="font-size: 0.7rem;">Master</small></div>
                    <div class="user-avatar-btn" onclick="openLogoutModal()"><i class="bi bi-person-fill"></i></div>
                </div>
            </header>
            <main class="main-content" id="router-view"><h5>Bem-vindo, Gestor.</h5></main>
        </div>
    </div>
    
    <div class="modal fade" id="logoutModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-body text-center p-4">
                    <i class="bi bi-door-open text-danger fs-1"></i>
                    <h5 class="mt-3">Encerrar sessão?</h5>
                    <div class="d-flex gap-2 justify-content-center mt-3">
                        <button class="btn btn-light px-4" data-bs-dismiss="modal">Cancelar</button>
                        <button class="btn btn-danger px-4" onclick="confirmLogout()">Sim, Sair</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="assets/js/app.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
