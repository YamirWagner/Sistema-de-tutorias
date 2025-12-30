<?php
// send-code.php - Enviar código de verificación

// Las rutas son relativas a routes.php que está en backend/
require_once __DIR__ . '/../../core/config.php';
require_once __DIR__ . '/../../core/database.php';
require_once __DIR__ . '/../../core/response.php';
require_once __DIR__ . '/../../core/mailer.php';
require_once __DIR__ . '/../../core/activity.php';

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
    
    // Si es usuario del sistema con sesión activa, cerrar la sesión actual
    $closedPrev = false;
    if (($user['userType'] ?? '') === 'sistema' || ($user['userType'] ?? '') === 'estudiante') {
        $roleMap = ['admin' => 'Administrador', 'tutor' => 'Tutor', 'verifier' => 'Verificador', 'student' => 'Estudiante'];
        $tipoAcceso = $roleMap[$user['role']] ?? ($user['rol'] ?? ($user['userType'] === 'estudiante' ? 'Estudiante' : null));
        $closedPrev = Activity::closeActiveIfExists($db, (int)$user['id'], $user['name'] ?? null, $tipoAcceso, 'Cierre de sesión por acceso desde otro dispositivo', $user['userType']);
        if ($closedPrev) {
            // Notificar por correo cierre por acceso desde otro dispositivo
            try {
                $mailerTmp = new Mailer();
                $meta = [
                    'ip' => Activity::clientIp(),
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                    'datetime' => date('d/m/Y H:i:s')
                ];
                $mailerTmp->sendSessionClosedEmail($email, $user['name'] ?? null, $meta, 'acceso desde otro dispositivo');
            } catch (Exception $e) {
                error_log('No se pudo enviar correo por cierre desde otro dispositivo: ' . $e->getMessage());
            }
        }
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
    
    // Enviar código por correo (con nombre y metadatos)
    try {
        $mailer = new Mailer();
        $recipientName = $user['name'] ?? null;
        $meta = [
            'ip' => Activity::clientIp(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'datetime' => date('d/m/Y H:i:s')
        ];
        $sent = $mailer->sendVerificationCode($email, $code, $recipientName, $meta);
        
        $msg = $closedPrev ? 'Sesión previa cerrada y código enviado' : 'Código enviado exitosamente';
        Response::success([ 'sessionClosed' => $closedPrev ], $msg);
        
    } catch (Exception $mailError) {
        error_log("[SEND-CODE] Error al enviar código: " . $mailError->getMessage());
        
        // EN DESARROLLO: Si falla el correo, mostrar el código en los logs y responder con éxito
        if (defined('APP_ENV') && APP_ENV === 'development') {
            error_log("[DESARROLLO] ========================================");
            error_log("[DESARROLLO] Código de verificación para: {$email}");
            error_log("[DESARROLLO] Código: {$code}");
            error_log("[DESARROLLO] Expira: {$expiration}");
            error_log("[DESARROLLO] ========================================");
            
            // Responder con éxito pero indicar que el correo no se envió
            Response::success([
                'sessionClosed' => $closedPrev,
                'emailFailed' => true,
                'debugCode' => $code, // Solo en desarrollo
                'message' => 'Código generado (correo no enviado - revisar logs del servidor)'
            ], 'Código generado exitosamente');
        }
        
        // Mensaje de error más específico según el tipo de error
        $errorMsg = $mailError->getMessage();
        if (strpos($errorMsg, 'suspended') !== false) {
            Response::serverError('El servidor de correo está suspendido. Contacta al administrador del sistema.');
        } elseif (strpos($errorMsg, 'authentication') !== false || strpos($errorMsg, 'Invalid login') !== false) {
            Response::serverError('Error de autenticación del servidor de correo. Verifica las credenciales SMTP.');
        } elseif (strpos($errorMsg, 'Configuración SMTP incompleta') !== false) {
            Response::serverError('Configuración de correo incompleta. Contacta al administrador.');
        } else {
            Response::serverError('Error al enviar el correo. Verifica la configuración SMTP.');
        }
    }
    
} catch (Exception $e) {
    error_log("Error en send-code.php: " . $e->getMessage());
    Response::serverError('Error en el servidor');
}
