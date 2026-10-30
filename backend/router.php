<?php
$requestPath = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$requestPath = str_replace('\\', '/', $requestPath);
$projectRoot = dirname(__DIR__);
$frontendRoot = $projectRoot . DIRECTORY_SEPARATOR . 'frontend';

if ($requestPath === '/') {
    require $frontendRoot . DIRECTORY_SEPARATOR . 'index.html';
    return true;
}

$routes = [
    '/api/' => __DIR__ . DIRECTORY_SEPARATOR . 'api',
    '/css/' => $frontendRoot . DIRECTORY_SEPARATOR . 'css',
    '/js/' => $frontendRoot . DIRECTORY_SEPARATOR . 'js'
];

foreach ($routes as $urlPrefix => $directory) {
    if (strpos($requestPath, $urlPrefix) !== 0) {
        continue;
    }

    $relativePath = substr($requestPath, strlen($urlPrefix));
    if ($relativePath === '' || strpos($relativePath, "\0") !== false) {
        break;
    }

    $root = realpath($directory);
    $requestedFile = realpath($directory . DIRECTORY_SEPARATOR
        . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
    if ($root === false || $requestedFile === false
        || strpos($requestedFile, $root . DIRECTORY_SEPARATOR) !== 0
        || !is_file($requestedFile)) {
        break;
    }

    $extension = strtolower(pathinfo($requestedFile, PATHINFO_EXTENSION));
    if ($urlPrefix === '/api/') {
        if ($extension !== 'php') {
            break;
        }
        require $requestedFile;
        return true;
    }

    $contentTypes = ['css' => 'text/css; charset=utf-8', 'js' => 'text/javascript; charset=utf-8'];
    if (!isset($contentTypes[$extension])) {
        break;
    }

    header('Content-Type: ' . $contentTypes[$extension]);
    header('X-Content-Type-Options: nosniff');
    readfile($requestedFile);
    return true;
}

http_response_code(404);
echo 'Not Found';
return true;
