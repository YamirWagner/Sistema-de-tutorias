<?php
/**
 * ============================================================
 * API: Solicitar Cambio de Tutor - Sistema de Tutorías UNSAAC
 * ============================================================
 * Permite al estudiante solicitar un cambio de tutor
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
    $idAdministrador = (int)($data['idAdministrador'] ?? 0);
    $motivo = trim($data['motivo'] ?? '');
    $detalles = trim($data['detalles'] ?? '');
    
    // Validar datos
    if (empty($idAdministrador)) {
        Response::error('Debe seleccionar un administrador', 400);
        exit;
    }
    
    if (empty($motivo)) {
        Response::error('El motivo de la solicitud es requerido', 400);
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
    
    // Obtener tutor actual
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
        Response::error('No tienes un tutor asignado actualmente', 404);
        exit;
    }
    
    // Obtener correo del administrador seleccionado
    $queryAdmin = "SELECT correo, nombres, apellidos FROM usuariosistema 
                  WHERE id = :idAdministrador
                  AND rol = 'Administrador' 
                  AND estado = 'Activo'";
    $stmtAdmin = $db->prepare($queryAdmin);
    $stmtAdmin->bindParam(':idAdministrador', $idAdministrador, PDO::PARAM_INT);
    $stmtAdmin->execute();
    $admin = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
    
    if (!$admin) {
        Response::error('Administrador no válido o inactivo', 400);
        exit;
    }
    
    $adminEmail = $admin['correo'];
    
    // Preparar datos para el correo
    $templateData = [
        'appName' => 'Sistema de Tutorías UNSAAC',
        'appUrl' => APP_URL,
        'logoUrl' => APP_URL . '/frontend/assets/logo.png',
        'estudianteNombre' => $estudiante['nombres'] . ' ' . $estudiante['apellidos'],
        'estudianteCodigo' => $estudiante['codigo'],
        'estudianteCorreo' => $estudiante['correo'],
        'tutorActualNombre' => $tutor['nombres'] . ' ' . $tutor['apellidos'],
        'tutorActualCorreo' => $tutor['correo'],
        'motivo' => $motivo,
        'detalles' => $detalles,
        'datetime' => date('d/m/Y H:i:s')
    ];
    
    // Enviar correo al administrador
    $mailer = new Mailer();
    $emailSent = $mailer->sendTemplate(
        $adminEmail,
        'Solicitud de Cambio de Tutor - ' . $estudiante['nombres'],
        'solicitar_cambio',
        $templateData
    );
    
    if ($emailSent) {
        Response::success([
            'tutorActual' => $tutor['nombres'] . ' ' . $tutor['apellidos'],
            'solicitudEnviada' => true
        ], 'Solicitud enviada correctamente. El administrador la revisará pronto.');
    } else {
        Response::error('Error al enviar la solicitud. Intenta nuevamente.', 500);
    }
    
} catch (Exception $e) {
    // Limpiar cualquier salida previa antes de enviar JSON
    if (ob_get_length()) {
        ob_clean();
    }
    
    error_log("Error en solicitarCambio.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    } else {
        Response::serverError('Error al procesar la solicitud: ' . $e->getMessage());
    }
}
