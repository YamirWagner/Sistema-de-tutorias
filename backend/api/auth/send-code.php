<?php
// send-code.php - Enviar código de verificación

// Las rutas son relativas a routes.php que está en backend/
require_once __DIR__ . '/../../core/config.php';
require_once __DIR__ . '/../../core/database.php';
require_once __DIR__ . '/../../core/response.php';
require_once __DIR__ . '/../../core/mailer.php';

try {
    // Obtener datos de la petición
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email'])) {
        Response::validation(['email' => 'El correo es requerido']);
    }
    
    $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
    
    if (!$email) {
        Response::validation(['email' => 'Correo inválido']);
    }
    
    // Conectar a la base de datos
    $database = new Database();
    $db = $database->getConnection();
    
    // Verificar si el usuario existe (buscar en usuariosistema y estudiante)
    require_once __DIR__ . '/../../models/user.php';
    $userModel = new User($db);
    $user = $userModel->getByEmail($email);
    
    if (!$user) {
        Response::error('Usuario no encontrado o inactivo', 404);
    }
    
    // Generar código de 6 dígitos
    $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // Guardar código en la base de datos con expiración de 10 minutos
    $expiration = date('Y-m-d H:i:s', time() + 600); // 10 minutos
    
    // Primero eliminar códigos anteriores del usuario
    $query = "DELETE FROM verification_codes WHERE correo = :correo";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':correo', $email);
    $stmt->execute();
    
    // Insertar nuevo código
    $query = "INSERT INTO verification_codes (correo, code, expires_at) 
              VALUES (:correo, :code, :expires_at)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':correo', $email);
    $stmt->bindParam(':code', $code);
    $stmt->bindParam(':expires_at', $expiration);
    $stmt->execute();
    
    // Función auxiliar para obtener la IP del cliente (considerando proxies)
    $getClientIp = function() {
        $keys = [
            'HTTP_CF_CONNECTING_IP', // Cloudflare
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR'
        ];
        foreach ($keys as $key) {
            if (!empty($_SERVER[$key])) {
                $value = $_SERVER[$key];
                // X-Forwarded-For puede traer lista
                if ($key === 'HTTP_X_FORWARDED_FOR') {
                    $parts = array_map('trim', explode(',', $value));
                    foreach ($parts as $part) {
                        if (filter_var($part, FILTER_VALIDATE_IP)) {
                            // Normalizar ::1 a 127.0.0.1
                            if ($part === '::1' || $part === '0:0:0:0:0:0:0:1') {
                                return '127.0.0.1';
                            }
                            return $part;
                        }
                    }
                } else {
                    if (filter_var($value, FILTER_VALIDATE_IP)) {
                        if ($value === '::1' || $value === '0:0:0:0:0:0:0:1') {
                            return '127.0.0.1';
                        }
                        return $value;
                    }
                }
            }
        }
        return '';
    };

    // Enviar código por correo (con nombre y metadatos)
    $mailer = new Mailer();
    $recipientName = $user['name'] ?? null;
    $meta = [
        'ip' => $getClientIp(),
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'datetime' => date('d/m/Y H:i:s')
    ];
    $sent = $mailer->sendVerificationCode($email, $code, $recipientName, $meta);
    
    if (!$sent) {
        Response::serverError('Error al enviar el correo');
    }
    
    Response::success(null, 'Código enviado exitosamente');
    
} catch (Exception $e) {
    error_log("Error en send-code.php: " . $e->getMessage());
    Response::serverError('Error en el servidor');
}
