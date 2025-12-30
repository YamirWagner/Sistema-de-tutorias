<?php
// student.php - Endpoints del Estudiante

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

try {
    // Activar logging de errores temporalmente
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
    error_log("=== student.php iniciado ===");
    
    // Verificar autenticación
    $token = JWT::getBearerToken();
    error_log("Token obtenido: " . ($token ? "SI" : "NO"));
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
    }
    
    $payload = JWT::decode($token);
    error_log("Payload decodificado - user_id: " . ($payload['user_id'] ?? 'N/A') . ", role: " . ($payload['role'] ?? 'N/A'));
    
    // Verificar rol de estudiante
    if ($payload['role'] !== 'student') {
        error_log("Rol incorrecto: " . $payload['role']);
        Response::forbidden('Acceso denegado');
    }
    
    $userId = $payload['user_id'];
    error_log("User ID: $userId");
    
    // Obtener acción
    $action = $_GET['action'] ?? '';
    error_log("Action: $action");
    
    $database = new Database();
    $db = $database->getConnection();
    error_log("Conexión a BD establecida");
    
    switch ($action) {
        case 'myTutor':
            error_log("=== Ejecutando myTutor ===");
            // Obtener tutor asignado al estudiante
            $query = "SELECT 
                        u.id,
                        u.nombres,
                        u.apellidos,
                        CONCAT(u.nombres, ' ', u.apellidos) as nombre,
                        u.correo as email,
                        u.especialidad,
                        a.fechaAsignacion,
                        a.estado as estadoAsignacion
                      FROM asignaciontutor a
                      INNER JOIN usuariosistema u ON a.idTutor = u.id
                      WHERE a.idEstudiante = :student_id 
                      AND a.estado = 'Activa'
                      ORDER BY a.fechaAsignacion DESC
                      LIMIT 1";
            
            error_log("Query preparada");
            $stmt = $db->prepare($query);
            $stmt->bindParam(':student_id', $userId, PDO::PARAM_INT);
            error_log("Ejecutando query con student_id: $userId");
            $stmt->execute();
            $tutor = $stmt->fetch(PDO::FETCH_ASSOC);
            error_log("Resultado: " . ($tutor ? json_encode($tutor) : "NULL"));
            
            if ($tutor) {
                Response::success($tutor);
            } else {
                Response::success(null, 'No tienes tutor asignado');
            }
            break;
            
        default:
            Response::error('Acción no válida');
    }
    
} catch (Exception $e) {
    error_log("=== ERROR EN student.php ===");
    error_log("Mensaje: " . $e->getMessage());
    error_log("Archivo: " . $e->getFile());
    error_log("Línea: " . $e->getLine());
    error_log("Trace: " . $e->getTraceAsString());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor: ' . $e->getMessage());
}
