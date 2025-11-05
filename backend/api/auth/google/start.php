<?php
// inicio de OAuth con Google
require_once '../../../core/config.php';
require_once '../../../core/response.php';
require_once '../../../core/jwt.php';
require_once '../../../core/google.php';

try {
    // Permitir redirección (sobrescribir header JSON del router)
    header('Content-Type: text/html; charset=utf-8');

    // Obtener token JWT desde Authorization: Bearer o query ?token=
    $bearer = JWT::getBearerToken();
    $tokenParam = $_GET['token'] ?? null;
    $jwt = $bearer ?: $tokenParam;
    if (!$jwt) {
        Response::unauthorized('Token no proporcionado');
    }

    // Validar token para verificar usuario
    $payload = JWT::decode($jwt);
    if (empty($payload['user_id'])) {
        Response::unauthorized('Token inválido');
    }

    // Iniciar cliente Google
    $google = new GoogleCalendar();
    if ($google->usingServiceAccount()) {
        // No requiere flujo OAuth, ya está autenticado
        $redirect = rtrim(APP_URL, '/') . '/panel.html?google=linked';
        header('Location: ' . $redirect, true, 302);
        exit;
    }
    // Incluir scopes offline para refresh_token
    $google->setAccessType('offline');
    $google->setPrompt('consent');
    $google->setState($jwt);

    $authUrl = $google->getAuthUrl();

    header('Location: ' . $authUrl, true, 302);
    exit;

} catch (Exception $e) {
    // Si la librería no está instalada u otro error, responder con JSON
    header('Content-Type: application/json; charset=utf-8');
    Response::serverError('No se pudo iniciar la vinculación con Google: ' . $e->getMessage());
}
