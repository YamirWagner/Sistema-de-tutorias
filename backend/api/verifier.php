<?php
// verifier.php - Endpoints del Verificador

require_once '../core/config.php';
require_once '../core/database.php';
require_once '../core/response.php';
require_once '../core/jwt.php';
require_once '../core/activity.php';

try {
    // Verificar autenticación
    $token = JWT::getBearerToken();
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
    }
    
    $payload = JWT::decode($token);
    
    $database = new Database();
    $db = $database->getConnection();
    // Control de actividad (cierre por inactividad + touch)
    Activity::enforceAndTouch($db, $payload);
    
    // Verificar rol de verificador
    if ($payload['role'] !== 'verifier') {
        Response::forbidden('Acceso denegado');
    }
    
    $userId = $payload['user_id'];
    
    // Obtener acción
    $action = $_GET['action'] ?? '';
    
    // $db ya inicializado
    
    switch ($action) {
        case 'stats':
            // Estadísticas del verificador
            $stats = [];
            
            // Total de sesiones
            $query = "SELECT COUNT(*) as total FROM sessions";
            $stmt = $db->query($query);
            $stats['totalSessions'] = $stmt->fetchColumn();
            
            // Pendientes de verificación
            $query = "SELECT COUNT(*) as total FROM sessions WHERE verified = 0 AND status = 'completed'";
            $stmt = $db->query($query);
            $stats['pendingVerification'] = $stmt->fetchColumn();
            
            // Sesiones verificadas
            $query = "SELECT COUNT(*) as total FROM sessions WHERE verified = 1";
            $stmt = $db->query($query);
            $stats['verifiedSessions'] = $stmt->fetchColumn();
            
            Response::success($stats);
            break;
            
        case 'pending':
            // Sesiones pendientes de verificación
            $query = "SELECT s.*, 
                      t.name as tutor_name, 
                      st.name as student_name 
                      FROM sessions s 
                      JOIN users t ON s.tutor_id = t.id 
                      LEFT JOIN users st ON s.student_id = st.id 
                      WHERE s.verified = 0 AND s.status = 'completed' 
                      ORDER BY s.end_time DESC";
            
            $stmt = $db->query($query);
            $sessions = $stmt->fetchAll();
            
            Response::success($sessions);
            break;
            
        case 'verified':
            // Sesiones verificadas
            $query = "SELECT s.*, 
                      t.name as tutor_name, 
                      st.name as student_name,
                      v.name as verifier_name 
                      FROM sessions s 
                      JOIN users t ON s.tutor_id = t.id 
                      LEFT JOIN users st ON s.student_id = st.id 
                      LEFT JOIN users v ON s.verified_by = v.id 
                      WHERE s.verified = 1 
                      ORDER BY s.verified_at DESC 
                      LIMIT 50";
            
            $stmt = $db->query($query);
            $sessions = $stmt->fetchAll();
            
            Response::success($sessions);
            break;
            
        case 'history':
            // Historial de verificaciones realizadas por este verificador
            $query = "SELECT s.*, 
                      t.name as tutor_name, 
                      st.name as student_name 
                      FROM sessions s 
                      JOIN users t ON s.tutor_id = t.id 
                      LEFT JOIN users st ON s.student_id = st.id 
                      WHERE s.verified_by = :verifier_id 
                      ORDER BY s.verified_at DESC";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':verifier_id', $userId);
            $stmt->execute();
            $history = $stmt->fetchAll();
            
            Response::success($history);
            break;
            
        default:
            Response::error('Acción no válida');
    }
    
} catch (Exception $e) {
    error_log("Error en verifier.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor');
}
