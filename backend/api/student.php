<?php
// student.php - Endpoints del Estudiante

require_once '../core/config.php';
require_once '../core/database.php';
require_once '../core/response.php';
require_once '../core/jwt.php';

try {
    // Verificar autenticación
    $token = JWT::getBearerToken();
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
    }
    
    $payload = JWT::decode($token);
    
    // Verificar rol de estudiante
    if ($payload['role'] !== 'student') {
        Response::forbidden('Acceso denegado');
    }
    
    $userId = $payload['user_id'];
    
    // Obtener acción
    $action = $_GET['action'] ?? '';
    
    $database = new Database();
    $db = $database->getConnection();
    
    switch ($action) {
        case 'stats':
            // Estadísticas del estudiante
            $stats = [];
            
            // Total de sesiones
            $query = "SELECT COUNT(*) as total FROM sessions WHERE student_id = :student_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':student_id', $userId);
            $stmt->execute();
            $stats['totalSessions'] = $stmt->fetchColumn();
            
            // Sesiones pendientes
            $query = "SELECT COUNT(*) as total FROM sessions WHERE student_id = :student_id AND status = 'pending'";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':student_id', $userId);
            $stmt->execute();
            $stats['pendingSessions'] = $stmt->fetchColumn();
            
            // Sesiones completadas
            $query = "SELECT COUNT(*) as total FROM sessions WHERE student_id = :student_id AND status = 'completed'";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':student_id', $userId);
            $stmt->execute();
            $stats['completedSessions'] = $stmt->fetchColumn();
            
            Response::success($stats);
            break;
            
        case 'tutors':
            // Listar tutores disponibles
            $query = "SELECT id, name, email FROM users WHERE role = 'tutor' AND active = 1";
            $stmt = $db->query($query);
            $tutors = $stmt->fetchAll();
            
            Response::success($tutors);
            break;
            
        case 'requests':
            // Listar solicitudes del estudiante
            $query = "SELECT r.*, u.name as tutor_name 
                      FROM requests r 
                      JOIN users u ON r.tutor_id = u.id 
                      WHERE r.student_id = :student_id 
                      ORDER BY r.created_at DESC";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':student_id', $userId);
            $stmt->execute();
            $requests = $stmt->fetchAll();
            
            Response::success($requests);
            break;
            
        case 'materials':
            // Listar materiales disponibles
            $query = "SELECT m.*, u.name as tutor_name 
                      FROM materials m 
                      JOIN users u ON m.tutor_id = u.id 
                      WHERE m.public = 1 OR m.student_id = :student_id 
                      ORDER BY m.created_at DESC";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':student_id', $userId);
            $stmt->execute();
            $materials = $stmt->fetchAll();
            
            Response::success($materials);
            break;
            
        default:
            Response::error('Acción no válida');
    }
    
} catch (Exception $e) {
    error_log("Error en student.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor');
}
