<?php
// config.php - Configuración general del sistema

// Cargar variables de entorno desde .env
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    throw new Exception("Archivo .env no encontrado en: " . $envFile);
}

$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    // Ignorar comentarios
    if (strpos(trim($line), '#') === 0) continue;
    
    // Procesar líneas con =
    if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        
        // Establecer variables de entorno
        if (!array_key_exists($key, $_ENV)) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

// Helper para obtener valores del .env con validación
function env($key, $default = null) {
    $value = getenv($key);
    if ($value === false) {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? $default;
    }
    return $value;
}

// Validar variables críticas del .env
$requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET', 'APP_URL'];
foreach ($requiredEnvVars as $var) {
    if (empty(env($var))) {
        throw new Exception("Variable de entorno requerida no encontrada: $var");
    }
}

// Configuración de la base de datos (100% desde .env)
define('DB_HOST', env('DB_HOST'));
define('DB_NAME', env('DB_NAME'));
define('DB_USER', env('DB_USER'));
define('DB_PASS', env('DB_PASS', ''));
define('DB_CHARSET', 'utf8mb4');

// Configuración SMTP para correos (100% desde .env)
define('SMTP_HOST', env('SMTP_HOST', 'localhost'));
define('SMTP_PORT', env('SMTP_PORT', 587));
define('SMTP_USER', env('SMTP_USER', ''));
define('SMTP_PASS', env('SMTP_PASS', ''));
define('SMTP_FROM', env('SMTP_FROM', 'noreply@localhost'));
define('SMTP_FROM_NAME', env('SMTP_FROM_NAME', 'Sistema de Tutorías'));

// Configuración JWT (100% desde .env)
define('JWT_SECRET', env('JWT_SECRET'));
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', 86400); // 24 horas en segundos

// Google Calendar API (100% desde .env)
define('GOOGLE_CLIENT_ID', env('GOOGLE_CLIENT_ID', ''));
define('GOOGLE_CLIENT_SECRET', env('GOOGLE_CLIENT_SECRET', ''));
define('GOOGLE_REDIRECT_URI', env('GOOGLE_REDIRECT_URI', ''));

// Configuración general (100% desde .env)
define('APP_NAME', 'Sistema de Tutorías UNSAAC');
define('APP_URL', env('APP_URL'));
define('APP_ENV', env('APP_ENV', 'production'));
define('APP_VERSION', env('APP_VERSION', '1.0.0'));
define('TIMEZONE', 'America/Lima');

// Configuración de sesiones
define('SESSION_LIFETIME', 3600); // 1 hora

// Rutas del sistema
define('BASE_PATH', dirname(__DIR__));
define('UPLOAD_PATH', BASE_PATH . '/storage/uploads/');
define('LOG_PATH', BASE_PATH . '/storage/logs/');
define('BACKUP_PATH', BASE_PATH . '/storage/backups/');

// Zona horaria
date_default_timezone_set(TIMEZONE);

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Error reporting basado en APP_ENV
if (APP_ENV === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
    ini_set('error_log', LOG_PATH . 'php_errors.log');
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', LOG_PATH . 'php_errors.log');
}
