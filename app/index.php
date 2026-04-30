<?php session_start(); if(!isset($_SESSION['logado'])) header("Location: login.html"); ?>
<!DOCTYPE html>
<html lang="pt-br">
<head><title>RDO Express | App</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"><link rel="stylesheet" href="assets/css/global.css"></head>
<body>
    <div id="admin-panel">
        <aside class="sidebar"><h4>RDO EXPRESS</h4><nav><a href="#" onclick="loadModule('gestao', 'clientes')">Clientes</a></nav></aside>
        <main class="main-content" id="router-view"><h5>Bem-vindo, Gestor.</h5></main>
    </div>
    <script src="assets/js/app.js"></script>
</body>
</html>
