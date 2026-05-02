<?php
// Captura a URI da requisição (ex: /login.html ou /css/global.css)
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Define a pasta onde estão os arquivos (app)
$baseFolder = __DIR__ . '/app';

// Se a URI for a raiz (/), direciona para index.html
if ($uri === '/') {
    $uri = '/index.html';
}

// Constrói o caminho completo do arquivo
$filePath = $baseFolder . $uri;

// Verifica se o arquivo existe e não é um diretório
if (file_exists($filePath) && !is_dir($filePath)) {
    // Define o tipo de conteúdo (MIME type) para o navegador entender
    $extension = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimeTypes = [
        'css' => 'text/css',
        'js' => 'application/javascript',
        'html' => 'text/html',
        'png' => 'image/png',
        'jpg' => 'image/jpeg'
    ];
    
    $contentType = $mimeTypes[$extension] ?? 'text/plain';
    header("Content-Type: $contentType");
    
    // Entrega o arquivo para o navegador
    readfile($filePath);
    exit;
}

// Se não encontrar nada, retorna 404
http_response_code(404);
echo "404 - Recurso não encontrado: " . $uri;