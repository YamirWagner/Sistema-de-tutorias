<?php
/**
 * API: Mis Estudiantes - Sistema de Tutorías UNSAAC
 * Endpoint especializado para el módulo "Mis estudiantes" del tutor
 * 
 * Funcionalidades:
 * - Listar estudiantes asignados con resumen de sesiones realizadas
 * - Obtener detalle de sesiones por estudiante
 * - Generar reportes y constancias
 */

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';

// Configuración de errores
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Verificar autenticación
    $token = JWT::getBearerToken();
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
    }
    
    $payload = JWT::decode($token);
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Control de actividad
    Activity::enforceAndTouch($db, $payload);
    
    // Verificar rol de tutor
    $role = strtolower($payload['role'] ?? '');
    if ($role !== 'tutor') {
        Response::forbidden('Acceso denegado - Solo tutores');
    }
    
    $tutorId = $payload['user_id'] ?? null;
    
    if (!$tutorId) {
        Response::error('ID de tutor no encontrado en el token');
    }
    
    // Obtener método y acción
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? 'lista';
    
    switch ($method) {
        case 'GET':
            handleGet($db, $tutorId, $action);
            break;
            
        case 'POST':
            handlePost($db, $tutorId, $action);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
    
} catch (Exception $e) {
    error_log("Error en misEstudiantes.php: " . $e->getMessage());
    Response::error($e->getMessage(), 500);
}

/**
 * Manejo de peticiones GET
 */
function handleGet($db, $tutorId, $action) {
    switch ($action) {
        case 'lista':
            getListaEstudiantes($db, $tutorId);
            break;
            
        case 'detalle':
            getDetalleEstudiante($db, $tutorId);
            break;
            
        case 'reporte':
            getReporteCompleto($db, $tutorId);
            break;
            
        default:
            Response::error('Acción no válida', 400);
    }
}

/**
 * Manejo de peticiones POST
 */
function handlePost($db, $tutorId, $action) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    switch ($action) {
        case 'constancia':
            generarConstancia($db, $tutorId, $data);
            break;
            
        default:
            Response::error('Acción no válida', 400);
    }
}

/**
 * Obtener lista de estudiantes con resumen de sesiones
 */
function getListaEstudiantes($db, $tutorId) {
    try {
        // Obtener semestre activo
        $querySemestre = "SELECT id FROM semestre WHERE estado = 'Activo' ORDER BY fechaInicio DESC LIMIT 1";
        $stmtSemestre = $db->prepare($querySemestre);
        $stmtSemestre->execute();
        $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
        
        if (!$semestre) {
            Response::success([], 'No hay semestre activo');
            return;
        }
        
        $semestreId = $semestre['id'];
        
        // Obtener estudiantes asignados con conteo de sesiones
        $query = "SELECT 
                    e.id,
                    e.codigo,
                    e.nombres,
                    e.apellidos,
                    e.correo,
                    e.semestre,
                    a.fechaAsignacion,
                    
                    -- Sesiones Académicas
                    COUNT(CASE WHEN t.tipo = 'Academica' AND t.estado = 'Realizada' THEN 1 END) as sesionesAcademica,
                    MAX(CASE WHEN t.tipo = 'Academica' AND t.estado = 'Realizada' THEN t.fecha END) as ultimaAcademica,
                    
                    -- Sesiones Personales
                    COUNT(CASE WHEN t.tipo = 'Personal' AND t.estado = 'Realizada' THEN 1 END) as sesionesPersonal,
                    MAX(CASE WHEN t.tipo = 'Personal' AND t.estado = 'Realizada' THEN t.fecha END) as ultimaPersonal,
                    
                    -- Sesiones Profesionales
                    COUNT(CASE WHEN t.tipo = 'Profesional' AND t.estado = 'Realizada' THEN 1 END) as sesionesProfesional,
                    MAX(CASE WHEN t.tipo = 'Profesional' AND t.estado = 'Realizada' THEN t.fecha END) as ultimaProfesional,
                    
                                        -- Modalidad utilizada (última registrada en sesión realizada)
                                        MAX(CASE WHEN t.estado = 'Realizada' THEN t.modalidad END) as modalidadPreferida,
                    
                    -- Total de sesiones realizadas
                    COUNT(CASE WHEN t.estado = 'Realizada' THEN 1 END) as totalSesiones
                    
                  FROM asignaciontutor a
                  INNER JOIN estudiante e ON a.idEstudiante = e.id
                  LEFT JOIN tutoria t ON t.idAsignacion = a.id
                  WHERE a.idTutor = :tutor_id 
                    AND a.idSemestre = :semestre_id
                    AND a.estado = 'Activa'
                    AND e.estado = 'Activo'
                  GROUP BY e.id, e.codigo, e.nombres, e.apellidos, e.correo, e.semestre, a.fechaAsignacion
                  ORDER BY e.apellidos, e.nombres";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
        $stmt->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
        $stmt->execute();
        
        $estudiantes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular si completó las 3 sesiones obligatorias
        foreach ($estudiantes as &$est) {
            $est['completoTresSesiones'] = (
                $est['sesionesAcademica'] > 0 && 
                $est['sesionesPersonal'] > 0 && 
                $est['sesionesProfesional'] > 0
            );
            $est['modalidadPreferida'] = $est['modalidadPreferida'] ?? 'Presencial';
        }
        
        Response::success($estudiantes, 'Lista de estudiantes obtenida correctamente');
        
    } catch (Exception $e) {
        error_log("Error en getListaEstudiantes: " . $e->getMessage());
        Response::error('Error al obtener lista de estudiantes: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener detalle completo de un estudiante
 */
function getDetalleEstudiante($db, $tutorId) {
    try {
        $estudianteId = $_GET['estudiante_id'] ?? null;
        
        if (!$estudianteId) {
            Response::error('ID de estudiante no proporcionado', 400);
            return;
        }
        
        // Obtener semestre activo
        $querySemestre = "SELECT id FROM semestre WHERE estado = 'Activo' ORDER BY fechaInicio DESC LIMIT 1";
        $stmtSemestre = $db->prepare($querySemestre);
        $stmtSemestre->execute();
        $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
        
        if (!$semestre) {
            Response::error('No hay semestre activo', 400);
            return;
        }
        
        // Verificar que el estudiante esté asignado al tutor
        $queryAsignacion = "SELECT COUNT(*) as existe
                           FROM asignaciontutor
                           WHERE idTutor = :tutor_id
                             AND idEstudiante = :estudiante_id
                             AND idSemestre = :semestre_id
                             AND estado = 'Activa'";
        
        $stmtAsig = $db->prepare($queryAsignacion);
        $stmtAsig->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
        $stmtAsig->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtAsig->bindParam(':semestre_id', $semestre['id'], PDO::PARAM_INT);
        $stmtAsig->execute();
        $asignacion = $stmtAsig->fetch(PDO::FETCH_ASSOC);
        
        if ($asignacion['existe'] == 0) {
            Response::forbidden('El estudiante no está asignado a este tutor');
            return;
        }
        
        // Obtener datos del estudiante
        $queryEstudiante = "SELECT 
                              e.id, e.codigo, e.nombres, e.apellidos, 
                              e.correo, e.semestre
                            FROM estudiante e
                            WHERE e.id = :estudiante_id";
        
        $stmtEst = $db->prepare($queryEstudiante);
        $stmtEst->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtEst->execute();
        $estudiante = $stmtEst->fetch(PDO::FETCH_ASSOC);
        
        // Obtener todas las tutorías del estudiante
        $queryTutorias = "SELECT 
                            t.id,
                            t.fecha,
                            t.horaInicio,
                            t.horaFin,
                            t.tipo,
                            t.modalidad,
                            t.observaciones,
                            t.estado,
                            t.motivoCancelacion
                          FROM tutoria t
                          INNER JOIN asignaciontutor a ON t.idAsignacion = a.id
                          WHERE a.idTutor = :tutor_id
                            AND a.idEstudiante = :estudiante_id
                            AND a.idSemestre = :semestre_id
                          ORDER BY t.fecha DESC, t.horaInicio DESC";
        
        $stmtTut = $db->prepare($queryTutorias);
        $stmtTut->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
        $stmtTut->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtTut->bindParam(':semestre_id', $semestre['id'], PDO::PARAM_INT);
        $stmtTut->execute();
        $tutorias = $stmtTut->fetchAll(PDO::FETCH_ASSOC);
        
        $estudiante['tutorias'] = $tutorias;
        
        Response::success($estudiante, 'Detalle del estudiante obtenido correctamente');
        
    } catch (Exception $e) {
        error_log("Error en getDetalleEstudiante: " . $e->getMessage());
        Response::error('Error al obtener detalle del estudiante: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener reporte completo (estudiantes que completaron 3 sesiones)
 */
function getReporteCompleto($db, $tutorId) {
    try {
        // Obtener semestre activo
        $querySemestre = "SELECT id, nombre FROM semestre WHERE estado = 'Activo' ORDER BY fechaInicio DESC LIMIT 1";
        $stmtSemestre = $db->prepare($querySemestre);
        $stmtSemestre->execute();
        $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
        
        if (!$semestre) {
            Response::success([], 'No hay semestre activo');
            return;
        }
        
        // Obtener estudiantes que completaron las 3 sesiones
        $query = "SELECT 
                    e.id,
                    e.codigo,
                    e.nombres,
                    e.apellidos,
                    e.correo,
                    
                    MAX(CASE WHEN t.tipo = 'Academica' AND t.estado = 'Realizada' THEN t.fecha END) as fechaAcademica,
                    MAX(CASE WHEN t.tipo = 'Personal' AND t.estado = 'Realizada' THEN t.fecha END) as fechaPersonal,
                    MAX(CASE WHEN t.tipo = 'Profesional' AND t.estado = 'Realizada' THEN t.fecha END) as fechaProfesional
                    
                  FROM asignaciontutor a
                  INNER JOIN estudiante e ON a.idEstudiante = e.id
                  INNER JOIN tutoria t ON t.idAsignacion = a.id
                  WHERE a.idTutor = :tutor_id 
                    AND a.idSemestre = :semestre_id
                    AND a.estado = 'Activa'
                    AND e.estado = 'Activo'
                    AND t.estado = 'Realizada'
                  GROUP BY e.id, e.codigo, e.nombres, e.apellidos, e.correo
                  HAVING fechaAcademica IS NOT NULL 
                     AND fechaPersonal IS NOT NULL 
                     AND fechaProfesional IS NOT NULL
                  ORDER BY e.apellidos, e.nombres";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
        $stmt->bindParam(':semestre_id', $semestre['id'], PDO::PARAM_INT);
        $stmt->execute();
        
        $estudiantes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Response::success([
            'semestre' => $semestre['nombre'],
            'total' => count($estudiantes),
            'estudiantes' => $estudiantes
        ], 'Reporte generado correctamente');
        
    } catch (Exception $e) {
        error_log("Error en getReporteCompleto: " . $e->getMessage());
        Response::error('Error al generar reporte: ' . $e->getMessage(), 500);
    }
}

/**
 * Generar constancia para estudiante que completó las 3 sesiones
 */
function generarConstancia($db, $tutorId, $data) {
    try {
        $estudianteId = $data['estudiante_id'] ?? null;
        
        if (!$estudianteId) {
            Response::error('ID de estudiante no proporcionado', 400);
            return;
        }
        
        // Obtener semestre activo
        $querySemestre = "SELECT id, nombre FROM semestre WHERE estado = 'Activo' ORDER BY fechaInicio DESC LIMIT 1";
        $stmtSemestre = $db->prepare($querySemestre);
        $stmtSemestre->execute();
        $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
        
        if (!$semestre) {
            Response::error('No hay semestre activo', 400);
            return;
        }
        
        // Verificar que completó las 3 sesiones
        $queryVerificar = "SELECT 
                            COUNT(CASE WHEN t.tipo = 'Academica' AND t.estado = 'Realizada' THEN 1 END) as academica,
                            COUNT(CASE WHEN t.tipo = 'Personal' AND t.estado = 'Realizada' THEN 1 END) as personal,
                            COUNT(CASE WHEN t.tipo = 'Profesional' AND t.estado = 'Realizada' THEN 1 END) as profesional
                          FROM tutoria t
                          INNER JOIN asignaciontutor a ON t.idAsignacion = a.id
                          WHERE a.idTutor = :tutor_id
                            AND a.idEstudiante = :estudiante_id
                            AND a.idSemestre = :semestre_id";
        
        $stmtVerif = $db->prepare($queryVerificar);
        $stmtVerif->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
        $stmtVerif->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtVerif->bindParam(':semestre_id', $semestre['id'], PDO::PARAM_INT);
        $stmtVerif->execute();
        $verificacion = $stmtVerif->fetch(PDO::FETCH_ASSOC);
        
        if ($verificacion['academica'] == 0 || $verificacion['personal'] == 0 || $verificacion['profesional'] == 0) {
            Response::error('El estudiante no ha completado las 3 sesiones obligatorias', 400);
            return;
        }
        
        // Obtener datos completos para la constancia
        $queryDatos = "SELECT 
                        e.codigo, e.nombres, e.apellidos, e.correo,
                        t.nombres as tutorNombres, 
                        t.apellidos as tutorApellidos
                      FROM estudiante e, tutor t, asignaciontutor a
                      WHERE e.id = :estudiante_id
                        AND t.id = :tutor_id
                        AND a.idEstudiante = e.id
                        AND a.idTutor = t.id
                        AND a.idSemestre = :semestre_id";
        
        $stmtDatos = $db->prepare($queryDatos);
        $stmtDatos->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtDatos->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
        $stmtDatos->bindParam(':semestre_id', $semestre['id'], PDO::PARAM_INT);
        $stmtDatos->execute();
        $datos = $stmtDatos->fetch(PDO::FETCH_ASSOC);
        
        // Aquí se puede generar un PDF o devolver datos para generar en frontend
        Response::success([
            'semestre' => $semestre['nombre'],
            'estudiante' => $datos,
            'sesiones' => $verificacion,
            'fechaGeneracion' => date('Y-m-d H:i:s')
        ], 'Datos para constancia generados correctamente');
        
    } catch (Exception $e) {
        error_log("Error en generarConstancia: " . $e->getMessage());
        Response::error('Error al generar constancia: ' . $e->getMessage(), 500);
    }
}
