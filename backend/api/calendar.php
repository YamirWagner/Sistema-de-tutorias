<?php
// calendar.php - Integración Google Calendar

require_once '../core/config.php';
require_once '../core/database.php';
require_once '../core/response.php';
require_once '../core/jwt.php';
require_once '../core/google.php';

try {
    // Verificar autenticación
    $token = JWT::getBearerToken();
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
    }
    
    $payload = JWT::decode($token);
    $userId = $payload['user_id'];
    
    // Obtener acción
    $action = $_GET['action'] ?? '';
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Inicializar Google Calendar
    // Nota: En una implementación real, necesitarías gestionar los tokens de acceso por usuario
    // $googleCalendar = new GoogleCalendar();
    
    switch ($action) {
        case 'list':
            // Listar eventos del calendario
            // Por ahora, devolver sesiones de la base de datos
            $query = "SELECT s.*, 
                      t.name as tutor_name, 
                      st.name as student_name 
                      FROM sessions s 
                      JOIN users t ON s.tutor_id = t.id 
                      LEFT JOIN users st ON s.student_id = st.id 
                      WHERE (s.tutor_id = :user_id OR s.student_id = :user_id) 
                      AND s.start_time >= NOW() 
                      ORDER BY s.start_time ASC 
                      LIMIT 10";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            $sessions = $stmt->fetchAll();
            
            $events = [];
            foreach ($sessions as $session) {
                $events[] = [
                    'id' => $session['id'],
                    'title' => $session['title'] ?? 'Sesión de Tutoría',
                    'description' => $session['description'] ?? '',
                    'start' => $session['start_time'],
                    'end' => $session['end_time'],
                    'tutor' => $session['tutor_name'],
                    'student' => $session['student_name']
                ];
            }
            
            Response::success(['events' => $events]);
            break;
            
        case 'create':
            // Crear evento en el calendario
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validar datos
            if (!isset($data['title']) || !isset($data['start']) || !isset($data['end'])) {
                Response::validation(['error' => 'Datos incompletos']);
            }
            
            // Guardar en la base de datos
            $query = "INSERT INTO sessions (tutor_id, title, description, start_time, end_time, status) 
                      VALUES (:tutor_id, :title, :description, :start_time, :end_time, 'pending')";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':tutor_id', $userId);
            $stmt->bindParam(':title', $data['title']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':start_time', $data['start']);
            $stmt->bindParam(':end_time', $data['end']);
            $stmt->execute();
            
            $sessionId = $db->lastInsertId();
            
            Response::success(['id' => $sessionId], 'Evento creado exitosamente', 201);
            break;
            
        case 'update':
            // Actualizar evento
            $eventId = $_GET['id'] ?? null;
            
            if (!$eventId) {
                Response::error('ID de evento requerido');
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Actualizar en la base de datos
            $query = "UPDATE sessions SET 
                      title = COALESCE(:title, title),
                      description = COALESCE(:description, description),
                      start_time = COALESCE(:start_time, start_time),
                      end_time = COALESCE(:end_time, end_time)
                      WHERE id = :id AND tutor_id = :tutor_id";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $eventId);
            $stmt->bindParam(':tutor_id', $userId);
            $stmt->bindParam(':title', $data['title']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':start_time', $data['start']);
            $stmt->bindParam(':end_time', $data['end']);
            $stmt->execute();
            
            Response::success(null, 'Evento actualizado exitosamente');
            break;
            
        case 'delete':
            // Eliminar evento
            $eventId = $_GET['id'] ?? null;
            
            if (!$eventId) {
                Response::error('ID de evento requerido');
            }
            
            $query = "DELETE FROM sessions WHERE id = :id AND tutor_id = :tutor_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $eventId);
            $stmt->bindParam(':tutor_id', $userId);
            $stmt->execute();
            
            Response::success(null, 'Evento eliminado exitosamente');
            break;
            
        default:
            Response::error('Acción no válida');
    }
    
} catch (Exception $e) {
    error_log("Error en calendar.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor');
}
