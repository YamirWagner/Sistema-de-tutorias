<?php
// routes.php - Enrutador central del backend

// Asegurar buffer de salida para evitar que avisos HTML rompan el JSON
if (function_exists('ob_get_level') && ob_get_level() === 0) {
    ob_start();
}

// Forzar que los errores no se impriman en HTML (se loguean a archivo)
@ini_set('display_errors', '0');
@ini_set('html_errors', '0');

// Manejo de errores fatales para devolver JSON
register_shutdown_function(function() {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (function_exists('ob_get_length') && ob_get_length()) { @ob_clean(); }
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Error interno del servidor'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
});

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
    // Google OAuth (inicio y callback)
    'GET|api/auth/google/start' => 'api/auth/google/start.php',
    'GET|api/auth/google/callback' => 'api/auth/google/callback.php',
    
    // Rutas de administrador
    'GET|api/admin' => 'api/admin.php',
    'POST|api/admin' => 'api/admin.php',
    'PUT|api/admin' => 'api/admin.php',
    'DELETE|api/admin' => 'api/admin.php',
    
    // Rutas de tutor
    'GET|api/tutor' => 'api/tutor.php',
    'POST|api/tutor' => 'api/tutor.php',
    'PUT|api/tutor' => 'api/tutor.php',
    
    // Rutas de panel del tutor
    'GET|api/PanelTutor' => 'api/PanelTutor.php',
    
    // Rutas de estudiante
    'GET|api/student' => 'api/student.php',
    'POST|api/student' => 'api/student.php',
    
    // Rutas de verificador
    'GET|api/verifier' => 'api/verifier.php',
    'POST|api/verifier' => 'api/verifier.php',
    
    // Rutas de calendario
    'GET|api/calendar' => 'api/calendar.php',
    'POST|api/calendar' => 'api/calendar.php',

    // Rutas de semestre
    'GET|api/semestre' => 'api/semestre.php',
    'POST|api/semestre' => 'api/semestre.php',

    // Rutas de asignaciones
    'GET|api/asignaciones' => 'api/asignaciones.php',
    'POST|api/asignaciones' => 'api/asignaciones.php',

    // Rutas de reportes
    'GET|api/reportes' => 'api/reportes.php',
    'POST|api/reportes' => 'api/reportes.php',

    // Rutas de bitácora (log de acceso/actividad)
    'GET|api/log' => 'api/log.php',
    'POST|api/log' => 'api/log.php',

    // Rutas de historial
    'GET|api/historial' => 'api/historial.php',

    // Rutas de auditoría
    'GET|api/auditoria' => 'api/auditoria.php',

    // Rutas de gestión de sesiones de tutoría
    'GET|api/atencionTutoria' => 'api/atencionTutoria.php',
    // Rutas de gestión de sesiones de tutoría
    'GET|api/atenciontutoria' => 'api/atenciontutoria.php',
    'POST|api/atenciontutoria' => 'api/atenciontutoria.php',
    'PUT|api/atenciontutoria' => 'api/atenciontutoria.php',

    // Rutas de asignación de tutor
    'GET|api/asignacionTutor' => 'api/asignacionTutor.php',
    'POST|api/asignacionTutor' => 'api/asignacionTutor.php',
    'PUT|api/asignacionTutor' => 'api/asignacionTutor.php',
    'DELETE|api/asignacionTutor' => 'api/asignacionTutor.php',

    // Rutas del módulo "Mis Estudiantes" del tutor
    'GET|api/misEstudiantes' => 'api/misEstudiantes.php',
    'POST|api/misEstudiantes' => 'api/misEstudiantes.php',

    // Rutas de constancias
    'GET|api/listar-constancias' => 'api/listar-constancias.php',
    'POST|api/firmar-constancia' => 'api/firmar-constancia.php',
    'GET|api/generar-reporte-estudiantes' => 'api/generar-reporte-estudiantes.php',

    // Rutas de gestión de usuarios
    'GET|api/gestionUsuarios' => 'api/gestionUsuarios.php',
    'POST|api/gestionUsuarios' => 'api/gestionUsuarios.php',
    'PUT|api/gestionUsuarios' => 'api/gestionUsuarios.php',
    'DELETE|api/gestionUsuarios' => 'api/gestionUsuarios.php',
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
