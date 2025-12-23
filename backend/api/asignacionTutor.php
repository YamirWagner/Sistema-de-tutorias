<?php
// asignacionTutor.php - API para gestión de agendamientos de tutorías

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';

// Activar reporte de errores
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
    
    // Verificar rol de tutor (el rol puede venir como 'tutor' o 'Tutor')
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
    $action = $_GET['action'] ?? '';
    
    switch ($method) {
        case 'GET':
            handleGet($db, $tutorId, $action);
            break;
            
        case 'POST':
            handlePost($db, $tutorId, $action);
            break;
            
        case 'PUT':
            handlePut($db, $tutorId, $action);
            break;
            
        case 'DELETE':
            handleDelete($db, $tutorId, $action);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
    
} catch (Exception $e) {
    error_log("Error en asignacionTutor.php: " . $e->getMessage());
    Response::error($e->getMessage(), 500);
}

/**
 * Manejo de peticiones GET
 */
function handleGet($db, $tutorId, $action) {
    switch ($action) {
        case 'estudiantes':
            getEstudiantesAsignados($db, $tutorId);
            break;
            
        case 'agendamientos':
            getAgendamientos($db, $tutorId);
            break;
            
        case 'disponibilidad':
            verificarDisponibilidad($db, $tutorId);
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
    
    if (!$data) {
        Response::error('Datos no válidos', 400);
    }
    
    switch ($action) {
        case 'crear':
            crearAgendamiento($db, $tutorId, $data);
            break;
            
        default:
            Response::error('Acción no válida', 400);
    }
}

/**
 * Manejo de peticiones PUT
 */
function handlePut($db, $tutorId, $action) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        Response::error('Datos no válidos', 400);
    }
    
    switch ($action) {
        case 'actualizar':
            actualizarAgendamiento($db, $tutorId, $data);
            break;
            
        case 'cancelar':
            cancelarAgendamiento($db, $tutorId, $data);
            break;
            
        default:
            Response::error('Acción no válida', 400);
    }
}

/**
 * Manejo de peticiones DELETE
 */
function handleDelete($db, $tutorId, $action) {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        Response::error('ID de agendamiento no proporcionado', 400);
    }
    
    cancelarAgendamiento($db, $tutorId, ['id' => $id, 'motivo' => 'Eliminado por el tutor']);
}

/**
 * Obtener estudiantes asignados al tutor
 */
function getEstudiantesAsignados($db, $tutorId) {
    try {
        // Obtener semestre activo
        $querySemestre = "SELECT id FROM semestre WHERE estado = 'Activo' ORDER BY fechaInicio DESC LIMIT 1";
        $stmtSemestre = $db->prepare($querySemestre);
        $stmtSemestre->execute();
        $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
        
        if (!$semestre) {
            Response::success([], 'No hay semestre activo');
        }
        
        // Obtener estudiantes asignados
        $query = "SELECT 
                    e.id,
                    e.codigo,
                    e.nombres,
                    e.apellidos,
                    e.correo,
                    e.semestre,
                    a.fechaAsignacion
                  FROM asignaciontutor a
                  INNER JOIN estudiante e ON a.idEstudiante = e.id
                  WHERE a.idTutor = :tutor_id 
                  AND a.idSemestre = :semestre_id
                  AND a.estado = 'Activa'
                  AND e.estado = 'Activo'
                  ORDER BY e.apellidos, e.nombres";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
        $stmt->bindParam(':semestre_id', $semestre['id'], PDO::PARAM_INT);
        $stmt->execute();
        
        $estudiantes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Response::success($estudiantes, 'Estudiantes obtenidos correctamente');
        
    } catch (Exception $e) {
        error_log("Error en getEstudiantesAsignados: " . $e->getMessage());
        Response::error('Error al obtener estudiantes', 500);
    }
}

/**
 * Obtener agendamientos del tutor
 */
function getAgendamientos($db, $tutorId) {
    try {
        $mes = $_GET['mes'] ?? date('Y-m');
        $estudianteId = $_GET['estudiante'] ?? null;
        
        // Obtener semestre activo
        $querySemestre = "SELECT id FROM semestre WHERE estado = 'Activo' ORDER BY fechaInicio DESC LIMIT 1";
        $stmtSemestre = $db->prepare($querySemestre);
        $stmtSemestre->execute();
        $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
        
        if (!$semestre) {
            Response::success([], 'No hay semestre activo');
        }
        
        // Construir query con LEFT JOIN para no omitir datos
        $query = "SELECT 
                    t.id,
                    t.fecha,
                    t.horaInicio,
                    t.horaFin,
                    t.tipo as tipoTutoria,
                    t.modalidad,
                    t.observaciones,
                    t.estado,
                    t.motivoCancelacion,
                    t.fechaCancelacion,
                    t.idAsignacion,
                    asig.idTutor,
                    asig.idSemestre,
                    asig.idEstudiante,
                    COALESCE(e.id, 0) as estudianteId,
                    COALESCE(e.codigo, 'N/A') as estudianteCodigo,
                    COALESCE(e.nombres, 'Sin asignar') as estudianteNombres,
                    COALESCE(e.apellidos, '') as estudianteApellidos
                  FROM tutoria t
                  LEFT JOIN asignaciontutor asig ON t.idAsignacion = asig.id
                  LEFT JOIN estudiante e ON asig.idEstudiante = e.id
                  WHERE (asig.idTutor = :tutor_id OR asig.idTutor IS NULL)
                  AND (asig.idSemestre = :semestre_id OR asig.idSemestre IS NULL)
                  AND t.fecha IS NOT NULL";
        
        $params = [
            ':tutor_id' => $tutorId,
            ':semestre_id' => $semestre['id']
        ];
        
        // Filtrar por mes si se proporciona
        if ($mes) {
            $query .= " AND DATE_FORMAT(t.fecha, '%Y-%m') = :mes";
            $params[':mes'] = $mes;
        }
        
        // Filtrar por estudiante si se proporciona
        if ($estudianteId) {
            $query .= " AND asig.idEstudiante = :estudiante_id";
            $params[':estudiante_id'] = $estudianteId;
        }
        
        $query .= " ORDER BY t.fecha, t.horaInicio";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        
        $agendamientos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Response::success($agendamientos, 'Agendamientos obtenidos correctamente');
        
    } catch (Exception $e) {
        error_log("Error en getAgendamientos: " . $e->getMessage());
        Response::error('Error al obtener agendamientos', 500);
    }
}

/**
 * Verificar disponibilidad de horario
 */
function verificarDisponibilidad($db, $tutorId) {
    try {
        $fecha = $_GET['fecha'] ?? null;
        $horaInicio = $_GET['horaInicio'] ?? null;
        $horaFin = $_GET['horaFin'] ?? null;
        $agendamientoId = $_GET['agendamientoId'] ?? null;
        
        if (!$fecha || !$horaInicio || !$horaFin) {
            Response::error('Faltan parámetros requeridos', 400);
        }
        
        // Obtener semestre activo
        $querySemestre = "SELECT id FROM semestre WHERE estado = 'Activo' ORDER BY fechaInicio DESC LIMIT 1";
        $stmtSemestre = $db->prepare($querySemestre);
        $stmtSemestre->execute();
        $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
        
        if (!$semestre) {
            Response::error('No hay semestre activo', 400);
        }
        
        // Verificar conflictos de horario
        $query = "SELECT COUNT(*) as conflictos
                  FROM tutoria t
                  LEFT JOIN asignaciontutor asig ON t.idAsignacion = asig.id
                  WHERE (asig.idTutor = :tutor_id OR t.idAsignacion IN (
                      SELECT id FROM asignaciontutor WHERE idTutor = :tutor_id
                  ))
                  AND (asig.idSemestre = :semestre_id OR asig.id IS NULL)
                  AND t.fecha = :fecha
                  AND t.estado IN ('Programada', 'Realizada')
                  AND (
                      (t.horaInicio < :hora_fin AND t.horaFin > :hora_inicio)
                  )";
        
        $params = [
            ':tutor_id' => $tutorId,
            ':semestre_id' => $semestre['id'],
            ':fecha' => $fecha,
            ':hora_inicio' => $horaInicio,
            ':hora_fin' => $horaFin
        ];
        
        // Si es actualización, excluir el agendamiento actual
        if ($agendamientoId) {
            $query .= " AND id != :agendamiento_id";
            $params[':agendamiento_id'] = $agendamientoId;
        }
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        
        $resultado = $stmt->fetch(PDO::FETCH_ASSOC);
        $disponible = $resultado['conflictos'] == 0;
        
        Response::success([
            'disponible' => $disponible,
            'mensaje' => $disponible ? 'Horario disponible' : 'Ya existe un agendamiento en este horario'
        ]);
        
    } catch (Exception $e) {
        error_log("Error en verificarDisponibilidad: " . $e->getMessage());
        Response::error('Error al verificar disponibilidad', 500);
    }
}

/**
 * Crear nuevo agendamiento
 */
function crearAgendamiento($db, $tutorId, $data) {
    try {
        // Validar datos requeridos
        $camposRequeridos = ['estudianteId', 'fecha', 'horaInicio', 'horaFin', 'tipoTutoria', 'modalidad'];
        foreach ($camposRequeridos as $campo) {
            if (!isset($data[$campo]) || empty($data[$campo])) {
                Response::error("El campo $campo es requerido", 400);
            }
        }
        
        // Obtener semestre activo
        $querySemestre = "SELECT id FROM semestre WHERE estado = 'Activo' ORDER BY fechaInicio DESC LIMIT 1";
        $stmtSemestre = $db->prepare($querySemestre);
        $stmtSemestre->execute();
        $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
        
        if (!$semestre) {
            Response::error('No hay semestre activo', 400);
        }
        
        // Verificar que el estudiante esté asignado al tutor
        $queryAsignacion = "SELECT id
                           FROM asignaciontutor
                           WHERE idTutor = :tutor_id
                           AND idEstudiante = :estudiante_id
                           AND idSemestre = :semestre_id
                           AND estado = 'Activa'";
        
        $stmtAsignacion = $db->prepare($queryAsignacion);
        $stmtAsignacion->execute([
            ':tutor_id' => $tutorId,
            ':estudiante_id' => $data['estudianteId'],
            ':semestre_id' => $semestre['id']
        ]);
        
        $asignacion = $stmtAsignacion->fetch(PDO::FETCH_ASSOC);
        
        if (!$asignacion) {
            Response::error('El estudiante no está asignado a este tutor', 403);
        }
        
        // Verificar que la fecha sea futura
        if (strtotime($data['fecha']) < strtotime(date('Y-m-d'))) {
            Response::error('No se pueden crear agendamientos en fechas pasadas', 400);
        }
        
        // Verificar disponibilidad de horario con LEFT JOIN para incluir todos los agendamientos
        $queryConflicto = "SELECT COUNT(*) as conflictos
                          FROM tutoria t
                          LEFT JOIN asignaciontutor asig ON t.idAsignacion = asig.id
                          WHERE asig.idTutor = :tutor_id
                          AND asig.idSemestre = :semestre_id
                          AND t.fecha = :fecha
                          AND t.estado IN ('Programada', 'Realizada')
                          AND t.horaInicio IS NOT NULL
                          AND t.horaFin IS NOT NULL
                          AND (
                              (t.horaInicio < :hora_fin AND t.horaFin > :hora_inicio)
                          )";
        
        $stmtConflicto = $db->prepare($queryConflicto);
        $stmtConflicto->execute([
            ':tutor_id' => $tutorId,
            ':semestre_id' => $semestre['id'],
            ':fecha' => $data['fecha'],
            ':hora_inicio' => $data['horaInicio'],
            ':hora_fin' => $data['horaFin']
        ]);
        
        $conflicto = $stmtConflicto->fetch(PDO::FETCH_ASSOC);
        
        if ($conflicto['conflictos'] > 0) {
            Response::error('Ya existe un agendamiento en este horario', 409);
        }
        
        // Insertar agendamiento
        $query = "INSERT INTO tutoria 
                  (idAsignacion, fecha, horaInicio, horaFin, tipo, modalidad, observaciones, estado)
                  VALUES 
                  (:asignacion_id, :fecha, :hora_inicio, :hora_fin, :tipo_tutoria, :modalidad, :observaciones, 'Programada')";
        
        $stmt = $db->prepare($query);
        $resultado = $stmt->execute([
            ':asignacion_id' => $asignacion['id'],
            ':fecha' => $data['fecha'],
            ':hora_inicio' => $data['horaInicio'],
            ':hora_fin' => $data['horaFin'],
            ':tipo_tutoria' => $data['tipoTutoria'],
            ':modalidad' => $data['modalidad'],
            ':observaciones' => $data['observaciones'] ?? null
        ]);
        
        if ($resultado) {
            $agendamientoId = $db->lastInsertId();
            
            Response::success([
                'id' => $agendamientoId,
                'mensaje' => 'Agendamiento creado correctamente'
            ], 'Agendamiento creado correctamente', 201);
        } else {
            Response::error('Error al crear el agendamiento', 500);
        }
        
    } catch (Exception $e) {
        error_log("Error en crearAgendamiento: " . $e->getMessage());
        Response::error('Error al crear agendamiento: ' . $e->getMessage(), 500);
    }
}

/**
 * Actualizar agendamiento existente
 */
function actualizarAgendamiento($db, $tutorId, $data) {
    try {
        // Validar datos requeridos
        if (!isset($data['id']) || empty($data['id'])) {
            Response::error('ID de agendamiento es requerido', 400);
        }
        
        // Verificar que el agendamiento pertenezca al tutor con LEFT JOIN
        $queryVerificar = "SELECT t.*, asig.idTutor, asig.idSemestre, asig.idEstudiante
                          FROM tutoria t
                          LEFT JOIN asignaciontutor asig ON t.idAsignacion = asig.id
                          WHERE t.id = :id AND (asig.idTutor = :tutor_id OR asig.id IS NOT NULL)";
        
        $stmtVerificar = $db->prepare($queryVerificar);
        $stmtVerificar->execute([
            ':id' => $data['id'],
            ':tutor_id' => $tutorId
        ]);
        
        $agendamiento = $stmtVerificar->fetch(PDO::FETCH_ASSOC);
        
        if (!$agendamiento) {
            Response::error('Agendamiento no encontrado o no autorizado', 404);
        }
        
        // Verificar que no esté cancelado o realizado
        if (in_array($agendamiento['estado'], ['Cancelada', 'Realizada'])) {
            Response::error('No se puede modificar un agendamiento cancelado o realizado', 400);
        }
        
        // Verificar que la fecha sea futura
        if (strtotime($agendamiento['fecha']) < strtotime(date('Y-m-d'))) {
            Response::error('No se pueden modificar agendamientos pasados', 400);
        }
        
        // Construir query de actualización dinámicamente
        $camposActualizables = [];
        $params = [':id' => $data['id']];
        
        if (isset($data['fecha'])) {
            if (strtotime($data['fecha']) < strtotime(date('Y-m-d'))) {
                Response::error('No se pueden programar agendamientos en fechas pasadas', 400);
            }
            $camposActualizables[] = "fecha = :fecha";
            $params[':fecha'] = $data['fecha'];
        }
        
        if (isset($data['horaInicio'])) {
            $camposActualizables[] = "horaInicio = :hora_inicio";
            $params[':hora_inicio'] = $data['horaInicio'];
        }
        
        if (isset($data['horaFin'])) {
            $camposActualizables[] = "horaFin = :hora_fin";
            $params[':hora_fin'] = $data['horaFin'];
        }
        
        if (isset($data['tipoTutoria'])) {
            $camposActualizables[] = "tipo = :tipo_tutoria";
            $params[':tipo_tutoria'] = $data['tipoTutoria'];
        }
        
        if (isset($data['modalidad'])) {
            $camposActualizables[] = "modalidad = :modalidad";
            $params[':modalidad'] = $data['modalidad'];
        }
        
        if (isset($data['observaciones'])) {
            $camposActualizables[] = "observaciones = :observaciones";
            $params[':observaciones'] = $data['observaciones'];
        }
        
        if (empty($camposActualizables)) {
            Response::error('No hay campos para actualizar', 400);
        }
        
        // Verificar disponibilidad si se cambia fecha u hora
        if (isset($data['fecha']) || isset($data['horaInicio']) || isset($data['horaFin'])) {
            $fechaVerificar = $data['fecha'] ?? $agendamiento['fecha'];
            $horaInicioVerificar = $data['horaInicio'] ?? $agendamiento['horaInicio'];
            $horaFinVerificar = $data['horaFin'] ?? $agendamiento['horaFin'];
            
            $queryConflicto = "SELECT COUNT(*) as conflictos
                              FROM tutoria t
                              LEFT JOIN asignaciontutor asig ON t.idAsignacion = asig.id
                              WHERE asig.idTutor = :tutor_id
                              AND t.fecha = :fecha
                              AND t.estado IN ('Programada', 'Realizada')
                              AND t.id != :id
                              AND t.horaInicio IS NOT NULL
                              AND t.horaFin IS NOT NULL
                              AND (
                                  (t.horaInicio < :hora_fin AND t.horaFin > :hora_inicio)
                              )";
            
            $stmtConflicto = $db->prepare($queryConflicto);
            $stmtConflicto->execute([
                ':tutor_id' => $tutorId,
                ':fecha' => $fechaVerificar,
                ':hora_inicio' => $horaInicioVerificar,
                ':hora_fin' => $horaFinVerificar,
                ':id' => $data['id']
            ]);
            
            $conflicto = $stmtConflicto->fetch(PDO::FETCH_ASSOC);
            
            if ($conflicto['conflictos'] > 0) {
                Response::error('Ya existe un agendamiento en este horario', 409);
            }
        }
        
        // Actualizar agendamiento
        $query = "UPDATE tutoria SET " . implode(', ', $camposActualizables) . " WHERE id = :id";
        
        $stmt = $db->prepare($query);
        $resultado = $stmt->execute($params);
        
        if ($resultado) {
            Response::success(['id' => $data['id']], 'Agendamiento actualizado correctamente');
        } else {
            Response::error('Error al actualizar el agendamiento', 500);
        }
        
    } catch (Exception $e) {
        error_log("Error en actualizarAgendamiento: " . $e->getMessage());
        Response::error('Error al actualizar agendamiento: ' . $e->getMessage(), 500);
    }
}

/**
 * Cancelar agendamiento
 */
function cancelarAgendamiento($db, $tutorId, $data) {
    try {
        // Validar datos requeridos
        if (!isset($data['id']) || empty($data['id'])) {
            Response::error('ID de agendamiento es requerido', 400);
        }
        
        // Verificar que el agendamiento pertenezca al tutor con LEFT JOIN
        $queryVerificar = "SELECT t.*, asig.idTutor, asig.idEstudiante
                          FROM tutoria t
                          LEFT JOIN asignaciontutor asig ON t.idAsignacion = asig.id
                          WHERE t.id = :id AND (asig.idTutor = :tutor_id OR asig.id IS NOT NULL)";
        
        $stmtVerificar = $db->prepare($queryVerificar);
        $stmtVerificar->execute([
            ':id' => $data['id'],
            ':tutor_id' => $tutorId
        ]);
        
        $agendamiento = $stmtVerificar->fetch(PDO::FETCH_ASSOC);
        
        if (!$agendamiento) {
            Response::error('Agendamiento no encontrado o no autorizado', 404);
        }
        
        // Verificar que no esté ya cancelado o realizado
        if (in_array($agendamiento['estado'], ['Cancelada', 'Realizada'])) {
            Response::error('El agendamiento ya está cancelado o realizado', 400);
        }
        
        // Verificar que la fecha sea futura
        if (strtotime($agendamiento['fecha']) < strtotime(date('Y-m-d'))) {
            Response::error('No se pueden cancelar agendamientos pasados', 400);
        }
        
        $motivo = $data['motivo'] ?? 'Cancelado por el tutor';
        
        // Cancelar agendamiento
        $query = "UPDATE tutoria 
                  SET estado = 'Cancelada', 
                      motivoCancelacion = :motivo, 
                      fechaCancelacion = NOW() 
                  WHERE id = :id";
        
        $stmt = $db->prepare($query);
        $resultado = $stmt->execute([
            ':id' => $data['id'],
            ':motivo' => $motivo
        ]);
        
        if ($resultado) {
            Response::success(['id' => $data['id']], 'Agendamiento cancelado correctamente');
        } else {
            Response::error('Error al cancelar el agendamiento', 500);
        }
        
    } catch (Exception $e) {
        error_log("Error en cancelarAgendamiento: " . $e->getMessage());
        Response::error('Error al cancelar agendamiento: ' . $e->getMessage(), 500);
    }
}
