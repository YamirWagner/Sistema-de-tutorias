<?php
/**
 * ============================================================
 * API ESTUDIANTE - Sistema de Tutorías UNSAAC
 * ============================================================
 * 
 * Endpoints disponibles:
 * - myTutor: Obtener tutor asignado
 * - stats: Estadísticas del estudiante (sesiones, avance, horas)
 * - sessions: Historial de sesiones realizadas
 * - materials: Materiales de una tutoría específica
 * 
 * Nota: Para sesiones activas y próximas usar sesionActual.php
 */

// Limpiar cualquier salida previa
ob_start();

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

// Limpiar buffer antes de enviar JSON
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
    $action = $_GET['action'] ?? '';
    
    $database = new Database();
    $db = $database->getConnection();
    
    switch ($action) {
        case 'stats':
            // Obtener estadísticas del estudiante
            
            // Obtener ID de asignación activa
            $queryAsignacion = "SELECT id FROM asignaciontutor 
                               WHERE idEstudiante = :student_id 
                               AND estado = 'Activa' 
                               LIMIT 1";
            $stmtAsignacion = $db->prepare($queryAsignacion);
            $stmtAsignacion->bindParam(':student_id', $userId, PDO::PARAM_INT);
            $stmtAsignacion->execute();
            $asignacion = $stmtAsignacion->fetch(PDO::FETCH_ASSOC);
            
            if (!$asignacion) {
                Response::success([
                    'sesionesCompletadas' => 0,
                    'porcentajeAvance' => 0,
                    'horasTotales' => 0,
                    'proximaSesion' => null
                ], 'No tienes asignación activa');
                break;
            }
            
            $idAsignacion = $asignacion['id'];
            
            // 1. Contar sesiones completadas (Realizada)
            $querySesiones = "SELECT COUNT(*) as total FROM tutoria 
                            WHERE idAsignacion = :id_asignacion 
                            AND estado = 'Realizada'";
            $stmtSesiones = $db->prepare($querySesiones);
            $stmtSesiones->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
            $stmtSesiones->execute();
            $resultSesiones = $stmtSesiones->fetch(PDO::FETCH_ASSOC);
            $sesionesCompletadas = (int)$resultSesiones['total'];
            
            // 2. Calcular porcentaje (100% = 3 sesiones)
            $porcentajeAvance = round(($sesionesCompletadas / 3) * 100, 2);
            
            // 3. Calcular horas totales acumuladas
            $queryHoras = "SELECT horaInicio, horaFin FROM tutoria 
                          WHERE idAsignacion = :id_asignacion 
                          AND estado = 'Realizada'
                          AND horaInicio IS NOT NULL 
                          AND horaFin IS NOT NULL";
            $stmtHoras = $db->prepare($queryHoras);
            $stmtHoras->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
            $stmtHoras->execute();
            $sesiones = $stmtHoras->fetchAll(PDO::FETCH_ASSOC);
            
            $horasTotales = 0;
            foreach ($sesiones as $sesion) {
                $inicio = new DateTime($sesion['horaInicio']);
                $fin = new DateTime($sesion['horaFin']);
                $diferencia = $inicio->diff($fin);
                $horasTotales += $diferencia->h + ($diferencia->i / 60);
            }
            $horasTotales = round($horasTotales, 2);
            
            // 4. Obtener próxima sesión programada
            $queryProxima = "SELECT fecha, horaInicio, horaFin, tipo, modalidad 
                            FROM tutoria 
                            WHERE idAsignacion = :id_asignacion 
                            AND fecha >= CURDATE()
                            AND estado IN ('Programada', 'Pendiente')
                            ORDER BY fecha ASC, horaInicio ASC
                            LIMIT 1";
            $stmtProxima = $db->prepare($queryProxima);
            $stmtProxima->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
            $stmtProxima->execute();
            $proximaSesion = $stmtProxima->fetch(PDO::FETCH_ASSOC);
            
            Response::success([
                'sesionesCompletadas' => $sesionesCompletadas,
                'porcentajeAvance' => $porcentajeAvance,
                'horasTotales' => $horasTotales,
                'proximaSesion' => $proximaSesion ?: null
            ]);
            break;
            
        case 'sessions':
            // Obtener historial de sesiones realizadas
            
            // Verificar si se especifica un semestre
            $semesterId = $_GET['semesterId'] ?? null;
            
            if ($semesterId) {
                // Buscar sesiones por semestre específico
                $queryAsignacion = "SELECT id FROM asignaciontutor 
                                   WHERE idEstudiante = :student_id 
                                   AND idSemestre = :semestre_id
                                   LIMIT 1";
                $stmtAsignacion = $db->prepare($queryAsignacion);
                $stmtAsignacion->bindParam(':student_id', $userId, PDO::PARAM_INT);
                $stmtAsignacion->bindParam(':semestre_id', $semesterId, PDO::PARAM_INT);
                $stmtAsignacion->execute();
                $asignacion = $stmtAsignacion->fetch(PDO::FETCH_ASSOC);
                
                if (!$asignacion) {
                    Response::success([], 'No tienes asignación en este semestre');
                    break;
                }
            } else {
                // Obtener ID de asignación activa (semestre actual)
                $queryAsignacion = "SELECT id FROM asignaciontutor 
                                   WHERE idEstudiante = :student_id 
                                   AND estado = 'Activa' 
                                   LIMIT 1";
                $stmtAsignacion = $db->prepare($queryAsignacion);
                $stmtAsignacion->bindParam(':student_id', $userId, PDO::PARAM_INT);
                $stmtAsignacion->execute();
                $asignacion = $stmtAsignacion->fetch(PDO::FETCH_ASSOC);
                
                if (!$asignacion) {
                    Response::success([], 'No tienes asignación activa');
                    break;
                }
            }
            
            $idAsignacion = $asignacion['id'];
            
            // Obtener todas las sesiones (realizadas, programadas, etc.)
            $querySesiones = "SELECT 
                                t.id,
                                t.fecha,
                                t.horaInicio,
                                t.horaFin,
                                t.tipo,
                                t.modalidad,
                                t.fechaRealizada,
                                t.observaciones,
                                t.estado,
                                t.created_at,
                                c.ambiente,
                                c.descripcion as cronograma_descripcion
                            FROM tutoria t
                            LEFT JOIN cronograma c ON t.idCronograma = c.id
                            WHERE t.idAsignacion = :id_asignacion 
                            ORDER BY 
                                CASE 
                                    WHEN t.fechaRealizada IS NOT NULL THEN t.fechaRealizada
                                    WHEN t.fecha IS NOT NULL THEN t.fecha
                                    ELSE c.fecha
                                END DESC,
                                t.created_at DESC";
            
            $stmtSesiones = $db->prepare($querySesiones);
            $stmtSesiones->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
            $stmtSesiones->execute();
            $sesiones = $stmtSesiones->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($sesiones);
            break;
            
        case 'materials':
            // Obtener materiales de una tutoría específica
            $tutoriaId = $_GET['tutoriaId'] ?? null;
            
            if (!$tutoriaId) {
                Response::error('ID de tutoría no proporcionado');
                break;
            }
            
            // Verificar que la tutoría pertenece al estudiante
            $queryVerificar = "SELECT t.id 
                              FROM tutoria t
                              INNER JOIN asignaciontutor a ON t.idAsignacion = a.id
                              WHERE t.id = :tutoria_id 
                              AND a.idEstudiante = :student_id";
            
            $stmtVerificar = $db->prepare($queryVerificar);
            $stmtVerificar->bindParam(':tutoria_id', $tutoriaId, PDO::PARAM_INT);
            $stmtVerificar->bindParam(':student_id', $userId, PDO::PARAM_INT);
            $stmtVerificar->execute();
            $tutoriaAccess = $stmtVerificar->fetch(PDO::FETCH_ASSOC);
            
            if (!$tutoriaAccess) {
                Response::forbidden('No tienes acceso a esta tutoría');
                break;
            }
            
            // Obtener materiales
            $queryMateriales = "SELECT 
                                    id,
                                    titulo,
                                    descripcion,
                                    tipo,
                                    enlace,
                                    fechaRegistro
                                FROM materiales
                                WHERE idTutoria = :tutoria_id
                                ORDER BY fechaRegistro DESC";
            
            $stmtMateriales = $db->prepare($queryMateriales);
            $stmtMateriales->bindParam(':tutoria_id', $tutoriaId, PDO::PARAM_INT);
            $stmtMateriales->execute();
            $materiales = $stmtMateriales->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($materiales);
            break;

        default:
            Response::error('Acción no válida');
    }
    
} catch (Exception $e) {
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    } else {
        error_log("Error en student.php: " . $e->getMessage());
        Response::serverError('Error en el servidor');
    }
}
