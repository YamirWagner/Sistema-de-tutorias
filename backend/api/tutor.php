<?php
// tutor.php - Endpoints del Tutor

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
    
    // Verificar rol de tutor
    if ($payload['role'] !== 'tutor') {
        Response::forbidden('Acceso denegado');
    }
    
    $userId = $payload['user_id'];
    
    // Obtener acción
    $action = $_GET['action'] ?? '';
    
    // $db ya inicializado
    
    switch ($action) {
        case 'stats':
            // Estadísticas del tutor
            $stats = [];
            
            // Total de sesiones
            $query = "SELECT COUNT(*) as total FROM sessions WHERE tutor_id = :tutor_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':tutor_id', $userId);
            $stmt->execute();
            $stats['totalSessions'] = $stmt->fetchColumn();
            
            // Sesiones pendientes
            $query = "SELECT COUNT(*) as total FROM sessions WHERE tutor_id = :tutor_id AND status = 'pending'";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':tutor_id', $userId);
            $stmt->execute();
            $stats['pendingSessions'] = $stmt->fetchColumn();
            
            // Sesiones completadas
            $query = "SELECT COUNT(*) as total FROM sessions WHERE tutor_id = :tutor_id AND status = 'completed'";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':tutor_id', $userId);
            $stmt->execute();
            $stats['completedSessions'] = $stmt->fetchColumn();
            
            Response::success($stats);
            break;
            
        case 'sessions':
            // Listar sesiones del tutor
            $query = "SELECT s.*, u.name as student_name 
                      FROM sessions s 
                      LEFT JOIN users u ON s.student_id = u.id 
                      WHERE s.tutor_id = :tutor_id 
                      ORDER BY s.start_time DESC";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':tutor_id', $userId);
            $stmt->execute();
            $sessions = $stmt->fetchAll();
            
            Response::success($sessions);
            break;
            
        case 'students':
            // Listar estudiantes del tutor
            $query = "SELECT DISTINCT u.id, u.name, u.email 
                      FROM users u 
                      JOIN sessions s ON u.id = s.student_id 
                      WHERE s.tutor_id = :tutor_id AND u.role = 'student'";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':tutor_id', $userId);
            $stmt->execute();
            $students = $stmt->fetchAll();
            
            Response::success($students);
            break;
            
        default:
            Response::error('Acción no válida');
    }
    
} catch (Exception $e) {
    error_log("Error en tutor.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor');
}
