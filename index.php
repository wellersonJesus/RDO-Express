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
            <div class="py-4 text-center border-bottom">
                <h4 class="fw-bold m-0"><span class="text-danger">RDO</span> <span class="text-dark">EXPRESS</span></h4>
            </div>
            <nav class="pt-3">
                <a onclick="toggleSubmenu('m-painel')"><i class="bi bi-grid me-2"></i> Painel</a>
                <ul class="submenu" id="m-painel">
                    <li><a onclick="loadModule('dashboard', 'dashboard', 'Visão Geral')">Visão Geral</a></li>
                    <li><a onclick="loadModule('comunicacao', 'chat', 'Chat')">Chat</a></li>
                </ul>
                <a onclick="toggleSubmenu('m-cad')"><i class="bi bi-people me-2"></i> Cadastros</a>
                <ul class="submenu" id="m-cad">
                    <li><a onclick="loadModule('gestao', 'clientes', 'Clientes')">Clientes</a></li>
                    <li><a onclick="loadModule('gestao', 'motoboys', 'Motoboys')">Motoboys</a></li>
                </ul>
                <a onclick="toggleSubmenu('m-rdo')"><i class="bi bi-speedometer2 me-2"></i> RDO Express</a>
                <ul class="submenu" id="m-rdo">
                    <li><a onclick="loadModule('gestao', 'operacao', 'Operação Fast')">Operação</a></li>
                </ul>
                <a onclick="toggleSubmenu('m-rel')"><i class="bi bi-graph-up me-2"></i> Relatórios</a>
                <ul class="submenu" id="m-rel">
                    <li><a onclick="loadModule('relatorios', 'relatorio', 'Relatórios')">Gerar</a></li>
                </ul>
                <a onclick="toggleSubmenu('m-adm')"><i class="bi bi-gear me-2"></i> Administração</a>
                <ul class="submenu" id="m-adm">
                    <li><a onclick="loadModule('adm', 'usuarios', 'Usuários')">Usuários</a></li>
                    <li><a onclick="loadModule('adm', 'crm', 'CRM')">CRM</a></li>
                </ul>
                <a onclick="toggleSubmenu('m-config')"><i class="bi bi-sliders me-2"></i> Configuração</a>
                <ul class="submenu" id="m-config">
                    <li><a onclick="loadModule('configuracao', 'ia', 'IA')">IA</a></li>
                    <li><a onclick="loadModule('configuracao', 'seguranca', 'Segurança')">Segurança</a></li>
                </ul>
            </nav>
            <div class="mt-auto border-top">
                <a onclick="openModal('sairModal')" class="text-danger"><i class="bi bi-box-arrow-left me-2"></i> Sair</a>
            </div>
        </aside>
        <div class="flex-grow-1 d-flex flex-column">
            <header class="top-header">
                <h5 class="fw-bold text-dark m-0" id="dynamic-title">Dashboard</h5>
                <div class="d-flex align-items-center gap-3">
                    <div class="text-end">
                        <div class="fw-bold text-dark lh-1">Gestor</div>
                        <small class="text-danger fw-bold">Master</small>
                    </div>
                    <div class="user-avatar-btn" onclick="openModal('sairModal')"><i class="bi bi-person-fill"></i></div>
                </div>
            </header>
            <main class="main-content" id="router-view"><h5>Bem-vindo, Gestor.</h5></main>
        </div>
    </div>

    <div class="modal fade" id="sairModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow"><div class="modal-body text-center p-5"><i class="bi bi-box-arrow-right fs-1 text-danger"></i><h5 class="mt-3">Deseja sair do sistema?</h5></div><div class="modal-footer justify-content-center border-0 pb-4"><button class="btn btn-light px-4" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-danger px-4" onclick="location.reload()">Confirmar Sair</button></div></div></div></div>

    <script src="assets/js/app.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
