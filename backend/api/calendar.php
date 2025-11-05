<?php
// calendar.php - Integración Google Calendar

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/google.php';
require_once __DIR__ . '/../core/activity.php';

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
    $userId = $payload['user_id'];
    
    // Obtener acción
    $action = $_GET['action'] ?? '';
    
    // $db ya inicializado
    
    // Inicializar Google Calendar (si está vinculado)
    $googleCalendar = null;
    try {
        $googleCalendar = new GoogleCalendar();
        if (!$googleCalendar->usingServiceAccount()) {
            if ($googleCalendar->hasTokenForUser($userId)) {
                $googleCalendar->ensureForUser($userId);
            } else {
                $googleCalendar = null; // Sin token de usuario aún
            }
        }
    } catch (Exception $ge) {
        $googleCalendar = null; // Librería no instalada o mal configurado
    }
    
    switch ($action) {
        case 'list':
            // Si hay Google disponible, listar desde Google Calendar
            if ($googleCalendar) {
                $events = $googleCalendar->listEvents(10);
                Response::success(['events' => $events]);
            }
            // Fallback: devolver sesiones de la base de datos
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
            
            try {
                $stmt = $db->prepare($query);
                $stmt->bindParam(':user_id', $userId);
                $stmt->execute();
                $sessions = $stmt->fetchAll();
            } catch (Exception $ex) {
                $sessions = [];
            }
            
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
            
            // Si Google está disponible, crear en Google primero
            if ($googleCalendar) {
                $created = $googleCalendar->createEvent([
                    'title' => $data['title'],
                    'description' => $data['description'] ?? '',
                    'start' => $data['start'],
                    'end' => $data['end'],
                ]);
                if ($created) {
                    Response::success($created, 'Evento creado en Google Calendar', 201);
                }
            }
            // Fallback: Guardar en la base de datos
            $query = "INSERT INTO sessions (tutor_id, title, description, start_time, end_time, status) 
                      VALUES (:tutor_id, :title, :description, :start_time, :end_time, 'pending')";
            
            try {
                $stmt = $db->prepare($query);
                $stmt->bindParam(':tutor_id', $userId);
                $stmt->bindParam(':title', $data['title']);
                $stmt->bindParam(':description', $data['description']);
                $stmt->bindParam(':start_time', $data['start']);
                $stmt->bindParam(':end_time', $data['end']);
                $stmt->execute();
                $sessionId = $db->lastInsertId();
                Response::success(['id' => $sessionId], 'Evento creado exitosamente', 201);
            } catch (Exception $ex) {
                Response::serverError('No se pudo crear el evento');
            }
            break;
            
        case 'update':
            // Actualizar evento
            $eventId = $_GET['id'] ?? null;
            
            if (!$eventId) {
                Response::error('ID de evento requerido');
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Intentar actualizar en Google si aplica
            if ($googleCalendar && isset($data['google_id'])) {
                $ok = $googleCalendar->updateEvent($data['google_id'], [
                    'title' => $data['title'] ?? null,
                    'description' => $data['description'] ?? null,
                    'start' => $data['start'] ?? null,
                    'end' => $data['end'] ?? null,
                ]);
                if ($ok) {
                    Response::success(null, 'Evento actualizado en Google Calendar');
                }
            }
            // Fallback: Actualizar en la base de datos
            $query = "UPDATE sessions SET 
                      title = COALESCE(:title, title),
                      description = COALESCE(:description, description),
                      start_time = COALESCE(:start_time, start_time),
                      end_time = COALESCE(:end_time, end_time)
                      WHERE id = :id AND tutor_id = :tutor_id";
            
            try {
                $stmt = $db->prepare($query);
                $stmt->bindParam(':id', $eventId);
                $stmt->bindParam(':tutor_id', $userId);
                $stmt->bindParam(':title', $data['title']);
                $stmt->bindParam(':description', $data['description']);
                $stmt->bindParam(':start_time', $data['start']);
                $stmt->bindParam(':end_time', $data['end']);
                $stmt->execute();
                Response::success(null, 'Evento actualizado exitosamente');
            } catch (Exception $ex) {
                Response::serverError('No se pudo actualizar el evento');
            }
            break;
            
        case 'delete':
            // Eliminar evento
            $eventId = $_GET['id'] ?? null;
            
            if (!$eventId) {
                Response::error('ID de evento requerido');
            }
            
            // Si viene id de Google para borrar
            if ($googleCalendar && isset($_GET['google_id'])) {
                $ok = $googleCalendar->deleteEvent($_GET['google_id']);
                if ($ok) { Response::success(null, 'Evento eliminado en Google Calendar'); }
            }
            // Fallback BD
            $query = "DELETE FROM sessions WHERE id = :id AND tutor_id = :tutor_id";
            try {
                $stmt = $db->prepare($query);
                $stmt->bindParam(':id', $eventId);
                $stmt->bindParam(':tutor_id', $userId);
                $stmt->execute();
                Response::success(null, 'Evento eliminado exitosamente');
            } catch (Exception $ex) {
                Response::serverError('No se pudo eliminar el evento');
            }
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
