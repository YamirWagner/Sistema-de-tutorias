<?php
// routes.php - Enrutador central del backend

// Configurar headers antes de cualquier salida
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Cargar configuración
require_once __DIR__ . '/core/config.php';
require_once __DIR__ . '/core/database.php';
require_once __DIR__ . '/core/response.php';

// Obtener la ruta solicitada
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Remover el prefijo del proyecto si existe
$basePath = '/Sistema-de-tutorias';
if (strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}

$path = trim($path, '/');

// Definir rutas del API
$routes = [
    // Rutas públicas
    'GET|api/config' => 'api/config.php',
    
    // Rutas de autenticación
    'POST|api/auth/send-code' => 'api/auth/send-code.php',
    'POST|api/auth/verify-code' => 'api/auth/verify-code.php',
    
    // Rutas de administrador
    'GET|api/admin' => 'api/admin.php',
    'POST|api/admin' => 'api/admin.php',
    'PUT|api/admin' => 'api/admin.php',
    'DELETE|api/admin' => 'api/admin.php',
    
    // Rutas de tutor
    'GET|api/tutor' => 'api/tutor.php',
    'POST|api/tutor' => 'api/tutor.php',
    'PUT|api/tutor' => 'api/tutor.php',
    
    // Rutas de estudiante
    'GET|api/student' => 'api/student.php',
    'POST|api/student' => 'api/student.php',
    
    // Rutas de verificador
    'GET|api/verifier' => 'api/verifier.php',
    'POST|api/verifier' => 'api/verifier.php',
    
    // Rutas de calendario
    'GET|api/calendar' => 'api/calendar.php',
    'POST|api/calendar' => 'api/calendar.php',
];

// Obtener el método HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Buscar la ruta
$routeKey = "$method|$path";

if (isset($routes[$routeKey])) {
    $file = __DIR__ . '/' . $routes[$routeKey];
    
    if (file_exists($file)) {
        require $file;
    } else {
        Response::error('Archivo no encontrado: ' . basename($file), 404);
    }
} else {
    Response::error('Ruta no encontrada: ' . $path, 404);
}
