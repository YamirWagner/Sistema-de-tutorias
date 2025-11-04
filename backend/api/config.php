<?php
// config.php - Endpoint para obtener configuración pública

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/response.php';

// Devolver solo información pública (no sensible)
Response::success([
    'version' => APP_VERSION,
    'app_name' => APP_NAME,
    'environment' => APP_ENV
]);
