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
            
            // Total de usuarios
            $query = "SELECT COUNT(*) as total FROM users WHERE active = 1";
            $stmt = $db->query($query);
            $stats['totalUsers'] = $stmt->fetchColumn();
            
            // Total de tutores
            $query = "SELECT COUNT(*) as total FROM users WHERE role = 'tutor' AND active = 1";
            $stmt = $db->query($query);
            $stats['totalTutors'] = $stmt->fetchColumn();
            
            // Total de estudiantes
            $query = "SELECT COUNT(*) as total FROM users WHERE role = 'student' AND active = 1";
            $stmt = $db->query($query);
            $stats['totalStudents'] = $stmt->fetchColumn();
            
            // Asignaciones activas
            $query = "SELECT COUNT(DISTINCT tutor_id) as total FROM requests WHERE status = 'active'";
            $stmt = $db->query($query);
            $stats['activeAssignments'] = $stmt->fetchColumn();
            
            Response::success($stats);
            break;
            
        case 'users':
            // Listar usuarios (con filtro opcional por rol)
            $role = $_GET['role'] ?? null;
            
            if ($role && $role !== 'all') {
                $query = "SELECT id, email, name, role, active, created_at FROM users WHERE role = :role ORDER BY created_at DESC";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':role', $role);
                $stmt->execute();
            } else {
                $query = "SELECT id, email, name, role, active, created_at FROM users ORDER BY created_at DESC";
                $stmt = $db->query($query);
            }
            
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
        
        case 'assignments':
            // Obtener asignaciones activas (tutores con estudiantes)
            $query = "SELECT 
                        u.id as tutor_id,
                        u.email as tutor_email,
                        u.name as tutor_name,
                        COUNT(DISTINCT r.student_id) as student_count,
                        MIN(r.created_at) as created_at
                      FROM users u
                      INNER JOIN requests r ON u.id = r.tutor_id
                      WHERE u.role = 'tutor' AND r.status = 'active'
                      GROUP BY u.id, u.email, u.name
                      ORDER BY student_count DESC";
            $stmt = $db->query($query);
            $assignments = $stmt->fetchAll();
            
            Response::success($assignments);
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
        
        case 'createUser':
            // Crear nuevo usuario (solo POST)
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                Response::error('Método no permitido');
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['email']) || !isset($input['name']) || !isset($input['role'])) {
                Response::error('Datos incompletos');
            }
            
            $email = filter_var($input['email'], FILTER_VALIDATE_EMAIL);
            if (!$email) {
                Response::error('Email inválido');
            }
            
            $name = trim($input['name']);
            $role = $input['role'];
            
            // Validar rol
            $validRoles = ['admin', 'tutor', 'student', 'verifier'];
            if (!in_array($role, $validRoles)) {
                Response::error('Rol inválido');
            }
            
            // Verificar si el email ya existe
            $query = "SELECT id FROM users WHERE email = :email";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':email', $email);
            $stmt->execute();
            
            if ($stmt->fetch()) {
                Response::error('El email ya está registrado');
            }
            
            // Crear usuario
            $query = "INSERT INTO users (email, name, role, active, created_at) 
                      VALUES (:email, :name, :role, 1, NOW())";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':role', $role);
            
            if ($stmt->execute()) {
                Response::success([
                    'id' => $db->lastInsertId(),
                    'message' => 'Usuario creado exitosamente'
                ]);
            } else {
                Response::error('Error al crear usuario');
            }
            break;
        
        case 'toggleUser':
            // Activar/Desactivar usuario (solo POST)
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                Response::error('Método no permitido');
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['userId']) || !isset($input['active'])) {
                Response::error('Datos incompletos');
            }
            
            $userId = intval($input['userId']);
            $active = intval($input['active']);
            
            $query = "UPDATE users SET active = :active WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':active', $active);
            $stmt->bindParam(':id', $userId);
            
            if ($stmt->execute()) {
                Response::success(['message' => 'Estado actualizado exitosamente']);
            } else {
                Response::error('Error al actualizar estado');
            }
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
