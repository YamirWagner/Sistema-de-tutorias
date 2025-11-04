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
    
    // Verificar si el usuario existe (buscar en usuariosistema y estudiante)
    require_once '../../models/user.php';
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
