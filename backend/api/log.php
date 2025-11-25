<?php
// log.php - API para registrar y consultar bitácora (logacceso)

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../models/logacceso.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    $logger = new LogAcceso($db);

    // Helper para obtener IP real del cliente
    $getClientIp = function() {
        $keys = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR'
        ];
        foreach ($keys as $key) {
            if (!empty($_SERVER[$key])) {
                $value = $_SERVER[$key];
                if ($key === 'HTTP_X_FORWARDED_FOR') {
                    $parts = array_map('trim', explode(',', $value));
                    foreach ($parts as $part) {
                        if (filter_var($part, FILTER_VALIDATE_IP)) {
                            if ($part === '::1' || $part === '0:0:0:0:0:0:0:1') { return '127.0.0.1'; }
                            return $part;
                        }
                    }
                } else {
                    if (filter_var($value, FILTER_VALIDATE_IP)) {
                        if ($value === '::1' || $value === '0:0:0:0:0:0:0:1') { return '127.0.0.1'; }
                        return $value;
                    }
                }
            }
        }
        return '';
    };

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        // Intentar identificar usuario por JWT (recomendado)
        $payload = null;
        $token = JWT::getBearerToken();
        if ($token) {
            try { $payload = JWT::decode($token); } catch (Exception $e) { $payload = null; }
        }

        $body = json_decode(file_get_contents('php://input'), true) ?: [];

        // Datos base desde body
        $data = [
            'accion' => $body['accion'] ?? '',
            'descripcion' => $body['descripcion'] ?? null,
            'estadoSesion' => $body['estadoSesion'] ?? null,
            'fechaHora' => $body['fechaHora'] ?? null,
            'ipOrigen' => $body['ipOrigen'] ?? $getClientIp(),
        ];

        // Si hay token, sobreescribir con datos del usuario autenticado
        if ($payload) {
            // Este módulo está diseñado para Usuarios del sistema (usuariosistema)
            if (($payload['userType'] ?? 'sistema') === 'estudiante') {
                $data['idEstudiante'] = $payload['user_id'] ?? null;
            } else {
                $data['idUsuario'] = $payload['user_id'] ?? null;
            }
            // Mapear role del token a etiquetas esperadas
            $role = $payload['role'] ?? '';
            $map = ['admin' => 'Administrador', 'tutor' => 'Tutor', 'verifier' => 'Verificador', 'student' => 'Estudiante'];
            $data['tipoAcceso'] = $map[$role] ?? $role;
            $data['usuario'] = $payload['name'] ?? null;
            $data['correo'] = $payload['email'] ?? null;
        } else {
            // Si no hay token, se permite registro manual (menos recomendado)
            $data['idUsuario'] = $body['idUsuario'] ?? null;
            $data['idEstudiante'] = $body['idEstudiante'] ?? null;
            $data['usuario'] = $body['usuario'] ?? null;
            $data['tipoAcceso'] = $body['tipoAcceso'] ?? null;
            $data['correo'] = $body['correo'] ?? null;
            $data['codigo'] = $body['codigo'] ?? null;
        }

        // Registrar
        $id = $logger->registrar($data);
        Response::success(['idLog' => $id], 'Evento registrado');
    }

    if ($method === 'GET') {
        // Requerir token y sólo permitir a administradores consultar la bitácora
        $token = JWT::getBearerToken();
        if (!$token) {
            Response::error('No autorizado', 401);
        }
        try {
            $payload = JWT::decode($token);
        } catch (Exception $e) {
            Response::error('No autorizado', 401);
        }

        $role = $payload['role'] ?? '';
        if ($role !== 'admin') {
            Response::error('Acceso restringido', 403);
        }

        // Filtros básicos por query string
        $filters = [
            'idUsuario' => $_GET['idUsuario'] ?? null,
            'tipoAcceso' => $_GET['tipoAcceso'] ?? null,
            'accion' => $_GET['accion'] ?? null,
            'usuario' => $_GET['usuario'] ?? null,
            'estadoSesion' => $_GET['estadoSesion'] ?? null,
            'desde' => $_GET['desde'] ?? null,
            'hasta' => $_GET['hasta'] ?? null,
        ];
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $items = $logger->listar($filters, $limit, $offset);
        Response::success($items);
    }

    Response::error('Método no permitido', 405);

} catch (Exception $e) {
    error_log('Error en log.php: ' . $e->getMessage());
    Response::serverError('Error en el servidor');
}
