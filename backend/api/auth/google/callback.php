<?php
// callback de OAuth con Google
require_once '../../../core/config.php';
require_once '../../../core/response.php';
require_once '../../../core/jwt.php';
require_once '../../../core/google.php';
require_once '../../../core/database.php';
require_once '../../../core/activity.php';

try {
    // Forzar tipo de contenido HTML para permitir redirección o mensaje
    header('Content-Type: text/html; charset=utf-8');

    $code = $_GET['code'] ?? null;
    $state = $_GET['state'] ?? null;
    if (!$code || !$state) {
        echo '<script>window.close && window.close();</script>Faltan parámetros.';
        exit;
    }

    // Validar el JWT recibido como state
    $payload = JWT::decode($state);
    $userId = $payload['user_id'] ?? null;
    if (!$userId) {
        echo 'Token inválido.';
        exit;
    }

    // Enforce inactividad y touch
    $database = new Database();
    $db = $database->getConnection();
    Activity::enforceAndTouch($db, $payload);

    // Obtener y guardar token
    $google = new GoogleCalendar();
    $token = $google->authenticate($code);
    if (!$token) {
        echo 'No se pudo obtener el token de Google.';
        exit;
    }

    // Guardar token por usuario
    $google->saveTokenForUser($userId, $token);

    // Redirigir a la app
    $redirect = rtrim(APP_URL, '/') . '/panel.html?google=linked';
    header('Location: ' . $redirect, true, 302);
    exit;

} catch (Exception $e) {
    header('Content-Type: application/json; charset=utf-8');
    Response::serverError('Error en callback de Google: ' . $e->getMessage());
}
