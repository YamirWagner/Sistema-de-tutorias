<?php
/**
 * ============================================================
 * API: Contactar Tutor - Sistema de Tutorías UNSAAC
 * ============================================================
 * Permite al estudiante enviar un mensaje a su tutor
 */

// Limpiar cualquier salida previa
ob_start();

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/mailer.php';

// Limpiar buffer antes de enviar JSON
ob_clean();

header('Content-Type: application/json');

try {
    // Verificar autenticación
    $token = JWT::getBearerToken();
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
        exit;
    }
    
    $payload = JWT::decode($token);
    
    // Verificar rol de estudiante
    if ($payload['role'] !== 'student') {
        Response::forbidden('Solo estudiantes pueden usar esta función');
        exit;
    }
    
    $userId = $payload['user_id'];
    
    // Obtener datos del formulario
    $data = json_decode(file_get_contents('php://input'), true);
    $asunto = trim($data['asunto'] ?? '');
    $mensaje = trim($data['mensaje'] ?? '');
    
    // Validar datos
    if (empty($asunto) || empty($mensaje)) {
        Response::error('Asunto y mensaje son requeridos', 400);
        exit;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Obtener datos del estudiante
    $queryEstudiante = "SELECT codigo, nombres, apellidos, correo 
                       FROM estudiante 
                       WHERE id = :student_id";
    $stmtEstudiante = $db->prepare($queryEstudiante);
    $stmtEstudiante->bindParam(':student_id', $userId, PDO::PARAM_INT);
    $stmtEstudiante->execute();
    $estudiante = $stmtEstudiante->fetch(PDO::FETCH_ASSOC);
    
    if (!$estudiante) {
        Response::error('Estudiante no encontrado', 404);
        exit;
    }
    
    // Obtener tutor asignado
    $queryTutor = "SELECT u.id, u.nombres, u.apellidos, u.correo, u.especialidad
                  FROM asignaciontutor a
                  INNER JOIN usuariosistema u ON a.idTutor = u.id
                  WHERE a.idEstudiante = :student_id 
                  AND a.estado = 'Activa'
                  ORDER BY a.fechaAsignacion DESC
                  LIMIT 1";
    
    $stmtTutor = $db->prepare($queryTutor);
    $stmtTutor->bindParam(':student_id', $userId, PDO::PARAM_INT);
    $stmtTutor->execute();
    $tutor = $stmtTutor->fetch(PDO::FETCH_ASSOC);
    
    if (!$tutor) {
        Response::error('No tienes un tutor asignado', 404);
        exit;
    }
    
    // Preparar datos para el correo
    $templateData = [
        'appName' => 'Sistema de Tutorías UNSAAC',
        'appUrl' => APP_URL,
        'logoUrl' => APP_URL . '/frontend/assets/logo.png',
        'estudianteNombre' => $estudiante['nombres'] . ' ' . $estudiante['apellidos'],
        'estudianteCorreo' => $estudiante['correo'],
        'tutorNombre' => $tutor['nombres'] . ' ' . $tutor['apellidos'],
        'tutorCorreo' => $tutor['correo'],
        'tutorEspecialidad' => $tutor['especialidad'],
        'asunto' => $asunto,
        'mensaje' => $mensaje,
        'datetime' => date('d/m/Y H:i:s')
    ];
    
    // Enviar correo al tutor
    $mailer = new Mailer();
    $emailSent = $mailer->sendTemplate(
        $tutor['correo'],
        'Mensaje de tu estudiante: ' . $asunto,
        'contactar_tutor',
        $templateData
    );
    
    if ($emailSent) {
        Response::success([
            'tutorNombre' => $tutor['nombres'] . ' ' . $tutor['apellidos'],
            'tutorCorreo' => $tutor['correo']
        ], 'Mensaje enviado correctamente al tutor');
    } else {
        Response::error('Error al enviar el correo. Intenta nuevamente.', 500);
    }
    
} catch (Exception $e) {
    error_log("Error en contactarTutor.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    } else {
        Response::serverError('Error al procesar la solicitud');
    }
}
