<?php
// admin.php - Endpoints del Administrador

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
    
    // Control de actividad (cierre por inactividad + touch)
    $database = new Database();
    $db = $database->getConnection();
    Activity::enforceAndTouch($db, $payload);
    
    // Verificar rol de administrador
    if ($payload['role'] !== 'admin') {
        Response::forbidden('Acceso denegado');
    }
    
    // Obtener acción
    $action = $_GET['action'] ?? '';
    
    // $db ya inicializado
    
    switch ($action) {
        case 'stats':
            // Estadísticas generales
            $stats = [];
            
            // Total de sesiones
            $query = "SELECT COUNT(*) as total FROM sessions";
            $stmt = $db->query($query);
            $stats['totalSessions'] = $stmt->fetchColumn();
            
            // Sesiones pendientes
            $query = "SELECT COUNT(*) as total FROM sessions WHERE status = 'pending'";
            $stmt = $db->query($query);
            $stats['pendingSessions'] = $stmt->fetchColumn();
            
            // Sesiones completadas
            $query = "SELECT COUNT(*) as total FROM sessions WHERE status = 'completed'";
            $stmt = $db->query($query);
            $stats['completedSessions'] = $stmt->fetchColumn();
            
            Response::success($stats);
            break;
            
        case 'users':
            // Listar usuarios
            $query = "SELECT id, email, name, role, active, created_at FROM users ORDER BY created_at DESC";
            $stmt = $db->query($query);
            $users = $stmt->fetchAll();
            
            Response::success($users);
            break;
            
        case 'tutors':
            // Listar tutores
            $query = "SELECT id, email, name, created_at FROM users WHERE role = 'tutor' AND active = 1";
            $stmt = $db->query($query);
            $tutors = $stmt->fetchAll();
            
            Response::success($tutors);
            break;
            
        case 'reports':
            // Obtener reportes
            $query = "SELECT r.*, u.name as tutor_name 
                      FROM reports r 
                      JOIN users u ON r.tutor_id = u.id 
                      ORDER BY r.created_at DESC 
                      LIMIT 50";
            $stmt = $db->query($query);
            $reports = $stmt->fetchAll();
            
            Response::success($reports);
            break;
            
        default:
            Response::error('Acción no válida');
    }
    
} catch (Exception $e) {
    error_log("Error en admin.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor');
}
