<?php
// Archivo temporal para debuggear el rewrite
header('Content-Type: application/json');
echo json_encode([
    'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'N/A',
    'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'] ?? 'N/A',
    'PHP_SELF' => $_SERVER['PHP_SELF'] ?? 'N/A',
    'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'N/A',
    'PATH_INFO' => $_SERVER['PATH_INFO'] ?? 'N/A',
], JSON_PRETTY_PRINT);
