<?php
// send-code.php - Enviar código de verificación

require_once '../../core/config.php';
require_once '../../core/database.php';
require_once '../../core/response.php';
require_once '../../core/mailer.php';

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
    
    // Verificar si el usuario existe
    $query = "SELECT id, email, name, role FROM users WHERE email = :email AND active = 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    
    $user = $stmt->fetch();
    
    if (!$user) {
        Response::error('Usuario no encontrado o inactivo', 404);
    }
    
    // Generar código de 6 dígitos
    $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // Guardar código en la base de datos con expiración de 10 minutos
    $expiration = date('Y-m-d H:i:s', time() + 600); // 10 minutos
    
    $query = "INSERT INTO verification_codes (user_id, code, expires_at) 
              VALUES (:user_id, :code, :expires_at)
              ON DUPLICATE KEY UPDATE code = :code, expires_at = :expires_at, used = 0";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user['id']);
    $stmt->bindParam(':code', $code);
    $stmt->bindParam(':expires_at', $expiration);
    $stmt->execute();
    
    // Enviar código por correo
    $mailer = new Mailer();
    $sent = $mailer->sendVerificationCode($email, $code);
    
    if (!$sent) {
        Response::serverError('Error al enviar el correo');
    }
    
    Response::success(null, 'Código enviado exitosamente');
    
} catch (Exception $e) {
    error_log("Error en send-code.php: " . $e->getMessage());
    Response::serverError('Error en el servidor');
}
