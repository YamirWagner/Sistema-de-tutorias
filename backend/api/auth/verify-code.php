<?php
// verify-code.php - Verificar código y generar token

require_once '../../core/config.php';
require_once '../../core/database.php';
require_once '../../core/response.php';
require_once '../../core/jwt.php';

try {
    // Obtener datos de la petición
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email']) || !isset($data['code'])) {
        Response::validation(['error' => 'Email y código son requeridos']);
    }
    
    $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
    $code = $data['code'];
    
    if (!$email) {
        Response::validation(['email' => 'Correo inválido']);
    }
    
    // Conectar a la base de datos
    $database = new Database();
    $db = $database->getConnection();
    
    // Buscar usuario
    $query = "SELECT id, email, name, role FROM users WHERE email = :email AND active = 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    
    $user = $stmt->fetch();
    
    if (!$user) {
        Response::error('Usuario no encontrado', 404);
    }
    
    // Verificar código
    $query = "SELECT * FROM verification_codes 
              WHERE user_id = :user_id AND code = :code AND used = 0 
              AND expires_at > NOW()";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user['id']);
    $stmt->bindParam(':code', $code);
    $stmt->execute();
    
    $verification = $stmt->fetch();
    
    if (!$verification) {
        Response::error('Código inválido o expirado', 400);
    }
    
    // Marcar código como usado
    $query = "UPDATE verification_codes SET used = 1 WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $verification['id']);
    $stmt->execute();
    
    // Generar token JWT
    $payload = [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role']
    ];
    
    $token = JWT::encode($payload);
    
    // Registrar inicio de sesión
    $query = "INSERT INTO login_history (user_id, ip_address, user_agent) 
              VALUES (:user_id, :ip, :user_agent)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user['id']);
    $stmt->bindValue(':ip', $_SERVER['REMOTE_ADDR'] ?? '');
    $stmt->bindValue(':user_agent', $_SERVER['HTTP_USER_AGENT'] ?? '');
    $stmt->execute();
    
    Response::success([
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role']
        ]
    ], 'Autenticación exitosa');
    
} catch (Exception $e) {
    error_log("Error en verify-code.php: " . $e->getMessage());
    Response::serverError('Error en el servidor');
}
