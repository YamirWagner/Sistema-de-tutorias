<?php
/**
 * ============================================================
 * SESIÓN ACTUAL - API ESTUDIANTE
 * Sistema de Tutorías UNSAAC
 * ============================================================
 * 
 * Gestiona las sesiones de tutoría activas del estudiante.
 * Permite obtener información de sesiones en curso y programadas para hoy.
 */

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

// Limpiar cualquier salida previa
ob_start();
ob_clean();

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
        Response::forbidden('Acceso denegado. Solo estudiantes pueden acceder.');
        exit;
    }
    
    $userId = $payload['user_id'];
    
    // Obtener método y acción
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Enrutador de acciones
    if ($method === 'GET') {
        $action = $action ?: 'active';
        
        switch ($action) {
            case 'active':
            case 'getActiveSesion':
                getActiveSesion($db, $userId);
                break;
                
            case 'today':
                getTodaySessions($db, $userId);
                break;
                
            case 'upcoming':
                getUpcomingSessions($db, $userId);
                break;
                
            case 'myTutor':
                getMyTutor($db, $userId);
                break;
                
            case 'administradores':
                getAdministradores($db);
                break;
                
            default:
                getActiveSesion($db, $userId);
                break;
        }
    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? '';
        
        switch ($action) {
            case 'markAttendance':
                markAttendance($db, $userId, $data);
                break;
                
            default:
                Response::error('Acción no válida');
        }
    } else {
        Response::error('Método no permitido', 405);
    }
    
} catch (Exception $e) {
    error_log("❌ ERROR en sesionActual.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error al procesar la solicitud');
}

/**
 * Obtener sesión activa del estudiante
 */
function getActiveSesion($db, $userId) {
    try {
        // Obtener ID de asignación activa
        $queryAsignacion = "SELECT id, idTutor 
                           FROM asignaciontutor 
                           WHERE idEstudiante = :student_id 
                           AND estado = 'Activa' 
                           LIMIT 1";
        
        $stmtAsignacion = $db->prepare($queryAsignacion);
        $stmtAsignacion->bindParam(':student_id', $userId, PDO::PARAM_INT);
        $stmtAsignacion->execute();
        $asignacion = $stmtAsignacion->fetch(PDO::FETCH_ASSOC);
        
        if (!$asignacion) {
            Response::success(null, 'No tienes asignación activa en este semestre');
            return;
        }
        
        $idAsignacion = $asignacion['id'];
        $idTutor = $asignacion['idTutor'];
        
        // Buscar sesión activa (hoy, con estado Pendiente o en cronograma de hoy)
        $hoy = date('Y-m-d');
        
        $querySesionActiva = "SELECT 
                                t.id,
                                t.tipo,
                                t.fecha as fechaTutoria,
                                t.horaInicio as tutoriaHoraInicio,
                                t.horaFin as tutoriaHoraFin,
                                t.modalidad as tutoriaModalidad,
                                t.fechaRealizada,
                                t.observaciones as tema,
                                t.estado,
                                c.fecha as fechaCronograma,
                                c.horaInicio as cronoHoraInicio,
                                c.horaFin as cronoHoraFin,
                                c.ambiente,
                                c.descripcion,
                                CONCAT(u.nombres, ' ', u.apellidos) as tutorName,
                                u.correo as tutorEmail,
                                u.especialidad as tutorEspecialidad
                            FROM tutoria t
                            LEFT JOIN cronograma c ON t.idCronograma = c.id
                            LEFT JOIN usuariosistema u ON u.id = :id_tutor
                            WHERE t.idAsignacion = :id_asignacion 
                            AND t.estado IN ('Pendiente', 'Programada', 'En Curso')
                            AND (
                                t.fecha = :hoy 
                                OR c.fecha = :hoy2
                            )
                            ORDER BY COALESCE(c.horaInicio, t.horaInicio) ASC, t.created_at DESC
                            LIMIT 1";
        
        $stmtSesion = $db->prepare($querySesionActiva);
        $stmtSesion->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
        $stmtSesion->bindParam(':id_tutor', $idTutor, PDO::PARAM_INT);
        $stmtSesion->bindParam(':hoy', $hoy, PDO::PARAM_STR);
        $stmtSesion->bindParam(':hoy2', $hoy, PDO::PARAM_STR);
        $stmtSesion->execute();
        $sesionActiva = $stmtSesion->fetch(PDO::FETCH_ASSOC);
        
        if ($sesionActiva) {
            // Determinar hora de inicio y fin
            $horaInicio = $sesionActiva['cronoHoraInicio'] ?? $sesionActiva['tutoriaHoraInicio'];
            $horaFin = $sesionActiva['cronoHoraFin'] ?? $sesionActiva['tutoriaHoraFin'];
            
            // Formatear la respuesta
            $response = [
                'id' => (int)$sesionActiva['id'],
                'date' => $sesionActiva['fechaTutoria'] ?? $sesionActiva['fechaCronograma'],
                'time' => ($horaInicio && $horaFin) 
                          ? substr($horaInicio, 0, 5) . ' - ' . substr($horaFin, 0, 5)
                          : 'No especificado',
                'mode' => strtolower($sesionActiva['tutoriaModalidad'] ?? 'presencial'),
                'topic' => $sesionActiva['tema'] 
                          ?? $sesionActiva['descripcion'] 
                          ?? 'Tutoría ' . ($sesionActiva['tipo'] ?? 'General'),
                'type' => $sesionActiva['tipo'] ?? 'General',
                'status' => $sesionActiva['estado'],
                'location' => $sesionActiva['ambiente'] ?? 'Por confirmar',
                'tutorName' => $sesionActiva['tutorName'] ?? 'No asignado',
                'tutorEmail' => $sesionActiva['tutorEmail'] ?? null,
                'tutorEspecialidad' => $sesionActiva['tutorEspecialidad'] ?? null
            ];
            
            Response::success($response);
        } else {
            Response::success(null, 'No tienes sesión activa en este momento');
        }
        
    } catch (Exception $e) {
        error_log("❌ Error en getActiveSesion: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Obtener todas las sesiones programadas para hoy
 */
function getTodaySessions($db, $userId) {
    try {
        // Obtener ID de asignación activa
        $queryAsignacion = "SELECT id, idTutor 
                           FROM asignaciontutor 
                           WHERE idEstudiante = :student_id 
                           AND estado = 'Activa' 
                           LIMIT 1";
        
        $stmtAsignacion = $db->prepare($queryAsignacion);
        $stmtAsignacion->bindParam(':student_id', $userId, PDO::PARAM_INT);
        $stmtAsignacion->execute();
        $asignacion = $stmtAsignacion->fetch(PDO::FETCH_ASSOC);
        
        if (!$asignacion) {
            Response::success([], 'No tienes asignación activa');
            return;
        }
        
        $idAsignacion = $asignacion['id'];
        $hoy = date('Y-m-d');
        
        $querySesiones = "SELECT 
                            t.id,
                            t.tipo,
                            t.fecha as fechaTutoria,
                            t.horaInicio as tutoriaHoraInicio,
                            t.horaFin as tutoriaHoraFin,
                            t.modalidad as tutoriaModalidad,
                            t.fechaRealizada,
                            t.estado,
                            c.fecha as fechaCronograma,
                            c.horaInicio as cronoHoraInicio,
                            c.horaFin as cronoHoraFin,
                            c.ambiente,
                            c.descripcion
                        FROM tutoria t
                        LEFT JOIN cronograma c ON t.idCronograma = c.id
                        WHERE t.idAsignacion = :id_asignacion 
                        AND (t.fecha = :hoy OR c.fecha = :hoy2)
                        ORDER BY COALESCE(c.horaInicio, t.horaInicio) ASC";
        
        $stmtSesiones = $db->prepare($querySesiones);
        $stmtSesiones->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
        $stmtSesiones->bindParam(':hoy', $hoy, PDO::PARAM_STR);
        $stmtSesiones->bindParam(':hoy2', $hoy, PDO::PARAM_STR);
        $stmtSesiones->execute();
        $sesiones = $stmtSesiones->fetchAll(PDO::FETCH_ASSOC);
        
        Response::success($sesiones);
        
    } catch (Exception $e) {
        error_log("❌ Error en getTodaySessions: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Obtener próximas sesiones programadas
 */
function getUpcomingSessions($db, $userId) {
    try {
        // Obtener ID de asignación activa
        $queryAsignacion = "SELECT id 
                           FROM asignaciontutor 
                           WHERE idEstudiante = :student_id 
                           AND estado = 'Activa' 
                           LIMIT 1";
        
        $stmtAsignacion = $db->prepare($queryAsignacion);
        $stmtAsignacion->bindParam(':student_id', $userId, PDO::PARAM_INT);
        $stmtAsignacion->execute();
        $asignacion = $stmtAsignacion->fetch(PDO::FETCH_ASSOC);
        
        if (!$asignacion) {
            Response::success([], 'No tienes asignación activa');
            return;
        }
        
        $idAsignacion = $asignacion['id'];
        $hoy = date('Y-m-d');
        
        $querySesiones = "SELECT 
                            t.id,
                            t.tipo,
                            t.fecha as fechaTutoria,
                            t.horaInicio as tutoriaHoraInicio,
                            t.horaFin as tutoriaHoraFin,
                            t.modalidad as tutoriaModalidad,
                            c.fecha as fechaCronograma,
                            c.horaInicio as cronoHoraInicio,
                            c.horaFin as cronoHoraFin,
                            c.ambiente,
                            c.descripcion
                        FROM tutoria t
                        LEFT JOIN cronograma c ON t.idCronograma = c.id
                        WHERE t.idAsignacion = :id_asignacion 
                        AND COALESCE(t.fecha, c.fecha) >= :hoy
                        AND t.estado IN ('Pendiente', 'Programada')
                        ORDER BY COALESCE(t.fecha, c.fecha) ASC, COALESCE(t.horaInicio, c.horaInicio) ASC
                        LIMIT 5";
        
        $stmtSesiones = $db->prepare($querySesiones);
        $stmtSesiones->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
        $stmtSesiones->bindParam(':hoy', $hoy, PDO::PARAM_STR);
        $stmtSesiones->execute();
        $sesiones = $stmtSesiones->fetchAll(PDO::FETCH_ASSOC);
        
        Response::success($sesiones);
        
    } catch (Exception $e) {
        error_log("❌ Error en getUpcomingSessions: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Marcar asistencia del estudiante
 */
function markAttendance($db, $userId, $data) {
    try {
        $sessionId = $data['sessionId'] ?? null;
        
        if (!$sessionId) {
            Response::error('ID de sesión no proporcionado', 400);
            return;
        }
        
        // Verificar que la sesión pertenece al estudiante
        $queryVerify = "SELECT t.id 
                       FROM tutoria t
                       INNER JOIN asignaciontutor a ON t.idAsignacion = a.id
                       WHERE t.id = :session_id 
                       AND a.idEstudiante = :student_id";
        
        $stmtVerify = $db->prepare($queryVerify);
        $stmtVerify->bindParam(':session_id', $sessionId, PDO::PARAM_INT);
        $stmtVerify->bindParam(':student_id', $userId, PDO::PARAM_INT);
        $stmtVerify->execute();
        
        if ($stmtVerify->rowCount() === 0) {
            Response::forbidden('No tienes permiso para marcar esta sesión');
            return;
        }
        
        // Actualizar estado
        $queryUpdate = "UPDATE tutoria 
                       SET estado = 'En Curso' 
                       WHERE id = :session_id";
        
        $stmtUpdate = $db->prepare($queryUpdate);
        $stmtUpdate->bindParam(':session_id', $sessionId, PDO::PARAM_INT);
        $stmtUpdate->execute();
        
        Response::success(['sessionId' => $sessionId], 'Asistencia registrada correctamente');
        
    } catch (Exception $e) {
        error_log("❌ Error en markAttendance: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Obtener tutor asignado al estudiante
 */
function getMyTutor($db, $userId) {
    try {
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
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':student_id', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $tutor = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($tutor) {
            Response::success($tutor);
        } else {
            Response::success(null, 'No tienes tutor asignado');
        }
        
    } catch (Exception $e) {
        error_log("❌ Error en getMyTutor: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Obtener lista de administradores activos
 */
function getAdministradores($db) {
    try {
        $query = "SELECT 
                    u.id,
                    CONCAT(u.nombres, ' ', u.apellidos) as nombre,
                    u.correo as email
                  FROM usuariosistema u
                  WHERE u.rol = 'Administrador'
                  AND u.estado = 'Activo'
                  ORDER BY u.nombres ASC";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $administradores = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($administradores)) {
            Response::success([], 'No hay administradores activos disponibles');
        } else {
            Response::success($administradores, 'Administradores obtenidos correctamente');
        }
        
    } catch (Exception $e) {
        error_log("❌ Error en getAdministradores: " . $e->getMessage());
        throw $e;
    }
}
