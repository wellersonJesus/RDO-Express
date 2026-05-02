<?php
session_start();
header('Content-Type: application/json');

function getEnvData() {
    $envFile = __DIR__ . '/.env';
    if (!file_exists($envFile)) return [];
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $data = [];
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0 || strpos(trim($line), '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $data[trim($key)] = trim($value);
    }
    return $data;
}

$credentials = getEnvData();
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['user']) && isset($data['pass']) && 
    $data['user'] === $credentials['MASTER_USER'] && 
    $data['pass'] === $credentials['MASTER_PASS']) {
    
    $_SESSION['auth'] = true;
    $_SESSION['user'] = $data['user'];
    echo json_encode(['success' => true]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Credenciais inválidas']);
}
