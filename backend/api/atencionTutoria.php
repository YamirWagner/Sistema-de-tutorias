<?php
// atenciontutoria.php - API para gestión de sesiones de tutoría

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    $token = JWT::getBearerToken();
    if (!$token) Response::unauthorized('Token no proporcionado');
    
    $payload = JWT::decode($token);
    $database = new Database();
    $db = $database->getConnection();
    Activity::enforceAndTouch($db, $payload);
    
    $role = strtolower($payload['role'] ?? '');
    if ($role !== 'tutor') Response::forbidden('Acceso denegado - Solo tutores');
    
    $tutorId = $payload['user_id'] ?? null;
    if (!$tutorId) Response::error('ID de tutor no encontrado');
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    switch ($method) {
        case 'GET':
            if ($action === 'detalle') obtenerDetalleSesion($db, $tutorId);
            else Response::error('Acción no válida', 400);
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) Response::error('Datos no válidos', 400);
            
            if (in_array($action, ['registrar-academica', 'registrar-personal', 'registrar-profesional'])) {
                registrarSesion($db, $tutorId, $data);
            } else {
                Response::error('Acción no válida', 400);
            }
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) Response::error('Datos no válidos', 400);
            
            if ($action === 'posponer') posponerSesion($db, $tutorId, $data);
            else Response::error('Acción no válida', 400);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
    
} catch (Exception $e) {
    error_log("Error en atenciontutoria.php: " . $e->getMessage());
    Response::error($e->getMessage(), 500);
}

function obtenerDetalleSesion($db, $tutorId) {
    try {
        $idSesion = $_GET['id'] ?? null;
        if (!$idSesion) Response::error('ID de sesión no proporcionado', 400);
        
        $query = "SELECT 
                    t.id,
                    t.fecha,
                    t.horaInicio,
                    t.horaFin,
                    t.tipo AS tipoTutoria,
                    t.modalidad,
                    t.estado,
                    e.codigo AS estudianteCodigo,
                    e.nombres AS estudianteNombres,
                    e.apellidos AS estudianteApellidos,
                    e.correo AS estudianteEmail
                  FROM tutoria t
                  INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
                  INNER JOIN estudiante e ON at.idEstudiante = e.id
                  WHERE t.id = :idSesion 
                    AND at.idTutor = :tutorId
                    AND t.estado IN ('Programada', 'Reprogramada')";
        
        $stmt = $db->prepare($query);
        $stmt->execute([':idSesion' => $idSesion, ':tutorId' => $tutorId]);
        
        $sesion = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$sesion) Response::error('Sesión no encontrada', 404);
        
        Response::success($sesion, 'Detalles obtenidos');
        
    } catch (Exception $e) {
        error_log("Error en obtenerDetalleSesion: " . $e->getMessage());
        Response::error('Error: ' . $e->getMessage(), 500);
    }
}

function posponerSesion($db, $tutorId, $data) {
    try {
        $idSesion = $data['id'] ?? null;
        $nuevaFecha = $data['fecha'] ?? null;
        $nuevaHoraInicio = $data['horaInicio'] ?? null;
        $nuevaHoraFin = $data['horaFin'] ?? null;
        
        if (!$idSesion || !$nuevaFecha || !$nuevaHoraInicio || !$nuevaHoraFin) {
            Response::error('Datos incompletos', 400);
        }
        
        $queryVerify = "SELECT t.id 
                        FROM tutoria t
                        INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
                        WHERE t.id = :idSesion AND at.idTutor = :tutorId";
        
        $stmtVerify = $db->prepare($queryVerify);
        $stmtVerify->execute([':idSesion' => $idSesion, ':tutorId' => $tutorId]);
        
        if (!$stmtVerify->fetch()) Response::forbidden('Sin permisos');
        
        $query = "UPDATE tutoria 
                  SET fecha = :fecha,
                      horaInicio = :horaInicio,
                      horaFin = :horaFin,
                      estado = 'Reprogramada'
                  WHERE id = :id";
        
        $stmt = $db->prepare($query);
        $resultado = $stmt->execute([
            ':id' => $idSesion,
            ':fecha' => $nuevaFecha,
            ':horaInicio' => $nuevaHoraInicio,
            ':horaFin' => $nuevaHoraFin
        ]);
        
        if ($resultado) Response::success(['id' => $idSesion], 'Sesión pospuesta');
        else Response::error('Error al posponer', 500);
        
    } catch (Exception $e) {
        error_log("Error en posponerSesion: " . $e->getMessage());
        Response::error('Error: ' . $e->getMessage(), 500);
    }
}

function registrarSesion($db, $tutorId, $data) {
    try {
        $idTutoria = $data['idTutoria'] ?? null;
        if (!$idTutoria) Response::error('ID de tutoría no proporcionado', 400);
        
        $queryVerify = "SELECT t.id 
                        FROM tutoria t
                        INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
                        WHERE t.id = :idTutoria AND at.idTutor = :tutorId";
        
        $stmtVerify = $db->prepare($queryVerify);
        $stmtVerify->execute([':idTutoria' => $idTutoria, ':tutorId' => $tutorId]);
        
        if (!$stmtVerify->fetch()) Response::forbidden('Sin permisos');
        
        $db->beginTransaction();
        
        $queryUpdate = "UPDATE tutoria 
                        SET estado = 'Realizada',
                            observaciones = :observaciones,
                            fechaRealizada = CURDATE()
                        WHERE id = :idTutoria";
        
        $stmtUpdate = $db->prepare($queryUpdate);
        $stmtUpdate->execute([
            ':idTutoria' => $idTutoria,
            ':observaciones' => json_encode($data, JSON_UNESCAPED_UNICODE)
        ]);
        
        $db->commit();
        
        Response::success(['id' => $idTutoria], 'Sesión registrada correctamente');
        
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log("Error en registrarSesion: " . $e->getMessage());
        Response::error('Error: ' . $e->getMessage(), 500);
    }
}
