<?php
session_start();

// 1. Carregamento Robusto do .env
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env');
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        
        // Divide apenas no primeiro "=" encontrado
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $value = trim($parts[1], " \t\n\r\0\x0B\"'"); // Remove aspas e espaços
            $_ENV[$key] = $value;
            putenv("$key=$value"); // Garante que o sistema enxergue
        }
    }
}

$apiUrl = $_ENV['API_URL'] ?? getenv('API_URL');
$masterUser = $_ENV['MASTER_USER'] ?? "master";
$masterPass = $_ENV['MASTER_PASS'] ?? "123456";

// 2. Lógica de Login
if (isset($_POST['login'])) {
    if (strtolower(trim($_POST['user'])) === strtolower($masterUser) && $_POST['pass'] === $masterPass) {
        $_SESSION['autenticado'] = true;
        header("Location: index.php");
        exit;
    }
}

if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: index.php");
    exit;
}

// 3. Função para buscar dados
function getSheetData($url) {
    if (empty($url)) return null;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . "?action=read");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15); // Timeout de segurança
    $result = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);
    
    return $result ? json_decode($result, true) : null;
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GMS Logística</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f0f2f5; font-family: 'Segoe UI', sans-serif; }
        .login-card { max-width: 360px; margin-top: 15vh; border: none; border-radius: 15px; }
        .table-gms { background: white; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .badge-money { background: #e8f5e9; color: #2e7d32; font-weight: 600; border: 1px solid #c8e6c9; }
    </style>
</head>
<body>

<?php if (!isset($_SESSION['autenticado'])): ?>
    <div class="container d-flex justify-content-center">
        <div class="card login-card shadow-lg p-4">
            <h3 class="text-center fw-bold text-primary mb-4">GMS <span class="text-dark">LOG</span></h3>
            <form method="POST">
                <div class="mb-3">
                    <input type="text" name="user" class="form-control form-control-lg" placeholder="Usuário" required>
                </div>
                <div class="mb-4">
                    <input type="password" name="pass" class="form-control form-control-lg" placeholder="Senha" required>
                </div>
                <button type="submit" name="login" class="btn btn-primary btn-lg w-100 shadow-sm">Acessar Painel</button>
            </form>
        </div>
    </div>

<?php else: ?>
    <nav class="navbar navbar-dark bg-dark shadow-sm mb-4">
        <div class="container">
            <span class="navbar-brand fw-bold">GMS <span class="text-primary">PILOTO</span></span>
            <a href="?logout=1" class="btn btn-sm btn-outline-danger border-0">Sair</a>
        </div>
    </nav>

    <div class="container-fluid px-4">
        <div class="table-gms p-2">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>DATA</th>
                        <th>CLIENTE</th>
                        <th>SOLICITAÇÃO</th>
                        <th>SERVIÇO</th>
                        <th>ENDEREÇO</th>
                        <th>VALOR</th>
                        <th>MOTOBOY</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $dados = getSheetData($apiUrl);
                    if (is_array($dados) && count($dados) > 0):
                        foreach ($dados as $row): ?>
                        <tr>
                            <td class="text-muted small"><?= $row['data'] ?? '---' ?></td>
                            <td class="fw-bold"><?= $row['dataclientss'] ?? ($row['clientes'] ?? '---') ?></td>
                            <td><?= $row['solicitacao'] ?? '---' ?></td>
                            <td><span class="badge bg-light text-dark border"><?= $row['tipodoservico'] ?? '---' ?></span></td>
                            <td style="max-width: 250px;"><small class="text-truncate d-block"><?= $row['endereco'] ?? '---' ?></small></td>
                            <td><span class="badge badge-money"><?= $row['valor'] ?? '---' ?></span></td>
                            <td><span class="badge bg-primary px-3"><?= $row['motoboy'] ?? '---' ?></span></td>
                        </tr>
                    <?php endforeach; 
                    else: ?>
                        <tr>
                            <td colspan="7" class="text-center py-5">
                                <div class="spinner-border text-primary mb-3" role="status"></div>
                                <p class="text-muted">Aguardando dados da API ou Planilha Vazia...<br>
                                <small>Verifique se o link no .env termina em <strong>/exec</strong></small></p>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
<?php endif; ?>
</body>
</html>
