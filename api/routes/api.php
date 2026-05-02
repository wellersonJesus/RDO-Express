<?php
header('Content-Type: application/json');
$action = $_GET['action'] ?? '';

// Roteamento simples
switch($action) {
    case 'getPedidos':
        echo json_encode(["status" => "success", "data" => []]);
        break;
    default:
        echo json_encode(["error" => "Rota não encontrada"]);
}
