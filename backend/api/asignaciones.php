<?php
// asignaciones.php - API para gestión de asignaciones tutor-estudiante

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Cargar configuración primero (define constantes necesarias)
require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../models/logacceso.php';

try {
    // Verificar autenticación
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
    
    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        Response::error('Token no proporcionado', 401);
    }
    
    $token = $matches[1];
    $payload = JWT::decode($token);
    
    if (!$payload) {
        Response::error('Token inválido o expirado', 401);
    }
    
    // Verificar rol de administrador
    if ($payload['role'] !== 'admin') {
        Response::error('No tienes permisos para acceder a este recurso', 403);
    }
    
    $db = (new Database())->getConnection();
    $action = $_GET['action'] ?? 'getData';
    
    switch ($action) {
        case 'getData':
            // Obtener todos los datos necesarios para las asignaciones
            getData($db, $payload);
            break;
            
        case 'assignStudent':
            // Asignar un estudiante a un tutor
            assignStudent($db, $payload);
            break;
            
        case 'unassignStudent':
            // Desasignar un estudiante de un tutor
            unassignStudent($db, $payload);
            break;
            
        case 'reassignStudent':
            // Reasignar un estudiante a otro tutor
            reassignStudent($db, $payload);
            break;
            
        case 'autoAssign':
            // Asignación automática equitativa
            autoAssign($db, $payload);
            break;
            
        case 'getReport':
            // Generar reporte de asignaciones
            getReport($db, $payload);
            break;
            
        default:
            Response::error('Acción no válida', 400);
    }
    
} catch (Exception $e) {
    error_log('Error en asignaciones.php: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    // En desarrollo, mostrar detalles del error
    $isDev = ($_ENV['APP_ENV'] ?? 'production') === 'development';
    $errorMessage = $isDev ? $e->getMessage() : 'Error interno del servidor';
    
    Response::error($errorMessage, 500);
}

/**
 * Obtener datos para el módulo de asignaciones
 */
function getData($db, $payload) {
    try {
        // Obtener semestre activo
        $stmtSemestre = $db->query("SELECT id, nombre FROM semestre WHERE estado = 'Activo' LIMIT 1");
        $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
        
        if (!$semestre) {
            Response::error('No hay semestre activo', 400);
        }
        
        $semesterId = $semestre['id'];
        
        // Obtener tutores activos con información de asignaciones
        $stmtTutores = $db->query("
            SELECT 
                u.id,
                u.nombres,
                u.apellidos,
                CONCAT(u.nombres, ' ', u.apellidos) as nombre,
                u.especialidad,
                COUNT(a.id) as totalAsignados
            FROM usuariosistema u
            LEFT JOIN asignaciontutor a ON u.id = a.idTutor AND a.idSemestre = $semesterId AND a.estado = 'Activa'
            WHERE u.rol = 'Tutor' AND u.estado = 'Activo'
            GROUP BY u.id
            ORDER BY u.apellidos, u.nombres
        ");
        
        $tutores = $stmtTutores->fetchAll(PDO::FETCH_ASSOC);
        
        // Obtener asignaciones por tutor
        $asignaciones = [];
        foreach ($tutores as $tutor) {
            $stmtAsignaciones = $db->prepare("
                SELECT 
                    a.id,
                    a.idEstudiante,
                    e.codigo,
                    e.nombres,
                    e.apellidos,
                    CONCAT(e.nombres, ' ', e.apellidos) as nombreEstudiante,
                    a.fechaAsignacion
                FROM asignaciontutor a
                INNER JOIN estudiante e ON a.idEstudiante = e.id
                WHERE a.idTutor = :tutorId 
                AND a.idSemestre = :semesterId 
                AND a.estado = 'Activa'
                ORDER BY e.apellidos, e.nombres
            ");
            
            $stmtAsignaciones->execute([
                ':tutorId' => $tutor['id'],
                ':semesterId' => $semesterId
            ]);
            
            $asignaciones[$tutor['id']] = $stmtAsignaciones->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Obtener estudiantes sin asignar en el semestre activo
        $stmtNoAsignados = $db->prepare("
            SELECT 
                e.id,
                e.codigo,
                e.nombres,
                e.apellidos,
                CONCAT(e.nombres, ' ', e.apellidos) as nombre,
                e.correo
            FROM estudiante e
            WHERE e.estado = 'Activo'
            AND e.id NOT IN (
                SELECT idEstudiante 
                FROM asignaciontutor 
                WHERE idSemestre = :semesterId 
                AND estado = 'Activa'
            )
            ORDER BY e.apellidos, e.nombres
        ");
        
        $stmtNoAsignados->execute([':semesterId' => $semesterId]);
        $estudiantesNoAsignados = $stmtNoAsignados->fetchAll(PDO::FETCH_ASSOC);
        
        Response::success([
            'semesterId' => $semesterId,
            'semestreNombre' => $semestre['nombre'],
            'tutors' => $tutores,
            'assignments' => $asignaciones,
            'unassignedStudents' => $estudiantesNoAsignados
        ], 'Datos obtenidos correctamente');
        
    } catch (Exception $e) {
        error_log('Error en getData: ' . $e->getMessage());
        Response::error('Error al obtener datos', 500);
    }
}

/**
 * Asignar un estudiante a un tutor
 */
function assignStudent($db, $payload) {
    try {
        $rawInput = file_get_contents('php://input');
        error_log('assignStudent - Raw input: ' . $rawInput);
        
        $data = json_decode($rawInput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('JSON decode error: ' . json_last_error_msg());
            Response::error('Datos JSON inválidos: ' . json_last_error_msg(), 400);
        }
        
        $tutorId = $data['tutorId'] ?? null;
        $studentId = $data['studentId'] ?? null;
        $semesterId = $data['semesterId'] ?? null;
        
        error_log("assignStudent - Parámetros: tutorId=$tutorId, studentId=$studentId, semesterId=$semesterId");
        
        if (!$tutorId || !$studentId || !$semesterId) {
            Response::error('Datos incompletos. Se requiere tutorId, studentId y semesterId', 400);
        }
        
        $db->beginTransaction();
        
        // Verificar que el tutor existe y está activo
        $stmtTutor = $db->prepare("SELECT id, nombres, apellidos FROM usuariosistema WHERE id = :id AND rol = 'Tutor' AND estado = 'Activo'");
        $stmtTutor->execute([':id' => $tutorId]);
        $tutor = $stmtTutor->fetch(PDO::FETCH_ASSOC);
        
        if (!$tutor) {
            $db->rollBack();
            Response::error('Tutor no encontrado o inactivo', 404);
        }
        
        // Verificar que el estudiante existe y está activo
        $stmtStudent = $db->prepare("SELECT id, codigo, nombres, apellidos FROM estudiante WHERE id = :id AND estado = 'Activo'");
        $stmtStudent->execute([':id' => $studentId]);
        $student = $stmtStudent->fetch(PDO::FETCH_ASSOC);
        
        if (!$student) {
            $db->rollBack();
            Response::error('Estudiante no encontrado o inactivo', 404);
        }
        
        // Verificar que el estudiante no está ya asignado en este semestre
        $stmtCheck = $db->prepare("
            SELECT id FROM asignaciontutor 
            WHERE idEstudiante = :studentId 
            AND idSemestre = :semesterId 
            AND estado = 'Activa'
        ");
        $stmtCheck->execute([
            ':studentId' => $studentId,
            ':semesterId' => $semesterId
        ]);
        
        if ($stmtCheck->fetch()) {
            $db->rollBack();
            Response::error('El estudiante ya tiene un tutor asignado en este semestre', 409);
        }
        
        // Insertar asignación (solo con IDs)
        $stmtInsert = $db->prepare("
            INSERT INTO asignaciontutor 
            (idTutor, idEstudiante, idSemestre, fechaAsignacion, estado) 
            VALUES (:tutorId, :studentId, :semesterId, NOW(), 'Activa')
        ");
        
        $stmtInsert->execute([
            ':tutorId' => $tutorId,
            ':studentId' => $studentId,
            ':semesterId' => $semesterId
        ]);
        
        $asignacionId = $db->lastInsertId();
        
        // Registrar en log
        $logger = new LogAcceso($db);
        $logger->registrar([
            'idUsuario' => $payload['user_id'],
            'usuario' => $payload['name'] ?? null,
            'accion' => 'Asignar estudiante',
            'descripcion' => "Asignó estudiante {$student['nombres']} {$student['apellidos']} (ID: $studentId) al tutor {$tutor['nombres']} {$tutor['apellidos']} (ID: $tutorId)"
        ]);
        
        $db->commit();
        
        Response::success([
            'asignacionId' => $asignacionId
        ], 'Estudiante asignado correctamente');
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Error en assignStudent: ' . $e->getMessage());
        error_log('SQL Error Code: ' . ($e->getCode() ?? 'N/A'));
        error_log('Stack trace: ' . $e->getTraceAsString());
        error_log('Request data: ' . json_encode($data ?? []));
        
        // En desarrollo, mostrar detalles del error
        $isDev = ($_ENV['APP_ENV'] ?? 'production') === 'development';
        $errorMessage = $isDev ? 'Error al asignar estudiante: ' . $e->getMessage() : 'Error al asignar estudiante';
        
        Response::error($errorMessage, 500);
    }
}

/**
 * Desasignar un estudiante
 */
function unassignStudent($db, $payload) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $asignacionId = $data['asignacionId'] ?? null;
        
        if (!$asignacionId) {
            Response::error('ID de asignación no proporcionado', 400);
        }
        
        $db->beginTransaction();
        
        // Obtener información de la asignación antes de eliminar
        $stmtInfo = $db->prepare("
            SELECT 
                a.*,
                u.nombres as nombreTutor,
                u.apellidos as apellidoTutor,
                e.nombres as nombreEstudiante,
                e.apellidos as apellidoEstudiante
            FROM asignaciontutor a
            INNER JOIN usuariosistema u ON a.idTutor = u.id
            INNER JOIN estudiante e ON a.idEstudiante = e.id
            WHERE a.id = :id
        ");
        $stmtInfo->execute([':id' => $asignacionId]);
        $asignacion = $stmtInfo->fetch(PDO::FETCH_ASSOC);
        
        if (!$asignacion) {
            $db->rollBack();
            Response::error('Asignación no encontrada', 404);
        }
        
        // Marcar como inactiva en lugar de eliminar (preservar historial)
        $stmtUpdate = $db->prepare("UPDATE asignaciontutor SET estado = 'Inactiva' WHERE id = :id");
        $stmtUpdate->execute([':id' => $asignacionId]);
        
        // Registrar en log
        $logger = new LogAcceso($db);
        $logger->registrar([
            'idUsuario' => $payload['user_id'],
            'usuario' => $payload['name'] ?? null,
            'accion' => 'Desasignar estudiante',
            'descripcion' => "Desasignó estudiante {$asignacion['nombreEstudiante']} {$asignacion['apellidoEstudiante']} del tutor {$asignacion['nombreTutor']} {$asignacion['apellidoTutor']}"
        ]);
        
        $db->commit();
        
        Response::success('Estudiante desasignado correctamente');
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Error en unassignStudent: ' . $e->getMessage());
        Response::error('Error al desasignar estudiante', 500);
    }
}

/**
 * Reasignar estudiante a otro tutor
 */
function reassignStudent($db, $payload) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $asignacionId = $data['asignacionId'] ?? null;
        $nuevoTutorId = $data['nuevoTutorId'] ?? null;
        
        if (!$asignacionId || !$nuevoTutorId) {
            Response::error('Datos incompletos', 400);
        }
        
        $db->beginTransaction();
        
        // Obtener asignación actual
        $stmtAsig = $db->prepare("SELECT * FROM asignaciontutor WHERE id = :id AND estado = 'Activa'");
        $stmtAsig->execute([':id' => $asignacionId]);
        $asignacion = $stmtAsig->fetch(PDO::FETCH_ASSOC);
        
        if (!$asignacion) {
            $db->rollBack();
            Response::error('Asignación no encontrada', 404);
        }
        
        // Verificar nuevo tutor
        $stmtTutor = $db->prepare("SELECT id FROM usuariosistema WHERE id = :id AND rol = 'Tutor' AND estado = 'Activo'");
        $stmtTutor->execute([':id' => $nuevoTutorId]);
        
        if (!$stmtTutor->fetch()) {
            $db->rollBack();
            Response::error('Nuevo tutor no válido', 404);
        }
        
        // Desactivar asignación anterior
        $stmtDesactivar = $db->prepare("UPDATE asignaciontutor SET estado = 'Inactiva' WHERE id = :id");
        $stmtDesactivar->execute([':id' => $asignacionId]);
        
        // Crear nueva asignación
        $stmtNueva = $db->prepare("
            INSERT INTO asignaciontutor 
            (idTutor, idEstudiante, idSemestre, fechaAsignacion, estado) 
            VALUES (:tutorId, :studentId, :semesterId, NOW(), 'Activa')
        ");
        
        $stmtNueva->execute([
            ':tutorId' => $nuevoTutorId,
            ':studentId' => $asignacion['idEstudiante'],
            ':semesterId' => $asignacion['idSemestre']
        ]);
        
        // Registrar en log
        $logger = new LogAcceso($db);
        $logger->registrar([
            'idUsuario' => $payload['user_id'],
            'usuario' => $payload['name'] ?? null,
            'accion' => 'Reasignar estudiante',
            'descripcion' => "Reasignó estudiante (ID: {$asignacion['idEstudiante']}) del tutor {$asignacion['idTutor']} al tutor $nuevoTutorId"
        ]);
        
        $db->commit();
        
        Response::success('Estudiante reasignado correctamente');
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Error en reassignStudent: ' . $e->getMessage());
        Response::error('Error al reasignar estudiante', 500);
    }
}

/**
 * Asignación automática equitativa
 */
function autoAssign($db, $payload) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $semesterId = $data['semesterId'] ?? null;
        $tutoresSeleccionados = $data['tutoresSeleccionados'] ?? [];
        
        if (!$semesterId) {
            Response::error('Semestre no especificado', 400);
        }
        
        $db->beginTransaction();
        
        // Si se proporcionaron tutores seleccionados, usar esos; sino, usar todos los activos
        if (!empty($tutoresSeleccionados)) {
            // Validar que los tutores existan y estén activos
            $placeholders = implode(',', array_fill(0, count($tutoresSeleccionados), '?'));
            $stmtValidar = $db->prepare("
                SELECT id FROM usuariosistema 
                WHERE id IN ($placeholders) 
                AND rol = 'Tutor' 
                AND estado = 'Activo'
            ");
            $stmtValidar->execute($tutoresSeleccionados);
            $tutoresValidos = $stmtValidar->fetchAll(PDO::FETCH_COLUMN);
            
            if (empty($tutoresValidos)) {
                $db->rollBack();
                Response::error('Los tutores seleccionados no son válidos', 400);
            }
            
            // Mezclar aleatoriamente para distribución equitativa
            shuffle($tutoresValidos);
            $tutores = $tutoresValidos;
        } else {
            // Obtener todos los tutores activos
            $stmtTutores = $db->query("
                SELECT id FROM usuariosistema 
                WHERE rol = 'Tutor' AND estado = 'Activo'
                ORDER BY RAND()
            ");
            $tutores = $stmtTutores->fetchAll(PDO::FETCH_COLUMN);
        }
        
        if (empty($tutores)) {
            $db->rollBack();
            Response::error('No hay tutores activos disponibles', 400);
        }
        
        // Obtener estudiantes sin asignar
        $stmtEstudiantes = $db->prepare("
            SELECT id FROM estudiante 
            WHERE estado = 'Activo'
            AND id NOT IN (
                SELECT idEstudiante FROM asignaciontutor 
                WHERE idSemestre = :semesterId AND estado = 'Activa'
            )
        ");
        $stmtEstudiantes->execute([':semesterId' => $semesterId]);
        $estudiantes = $stmtEstudiantes->fetchAll(PDO::FETCH_COLUMN);
        
        if (empty($estudiantes)) {
            $db->rollBack();
            Response::error('No hay estudiantes sin asignar', 400);
        }
        
        // Asignar equitativamente
        $stmtInsert = $db->prepare("
            INSERT INTO asignaciontutor 
            (idTutor, idEstudiante, idSemestre, fechaAsignacion, estado) 
            VALUES (:tutorId, :studentId, :semesterId, NOW(), 'Activa')
        ");
        
        $tutorIndex = 0;
        $totalTutores = count($tutores);
        $asignados = 0;
        
        foreach ($estudiantes as $estudianteId) {
            $tutorId = $tutores[$tutorIndex];
            
            $stmtInsert->execute([
                ':tutorId' => $tutorId,
                ':studentId' => $estudianteId,
                ':semesterId' => $semesterId
            ]);
            
            $asignados++;
            $tutorIndex = ($tutorIndex + 1) % $totalTutores;
        }
        
        // Registrar en log
        $logger = new LogAcceso($db);
        $logger->registrar([
            'idUsuario' => $payload['user_id'],
            'usuario' => $payload['name'] ?? null,
            'accion' => 'Asignación automática',
            'descripcion' => "Asignó automáticamente $asignados estudiantes entre $totalTutores tutores"
        ]);
        
        $db->commit();
        
        Response::success([
            'estudiantesAsignados' => $asignados,
            'tutoresUtilizados' => $totalTutores
        ], 'Asignación automática completada');
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Error en autoAssign: ' . $e->getMessage());
        Response::error('Error en asignación automática', 500);
    }
}

/**
 * Generar reporte de asignaciones
 */
function getReport($db, $payload) {
    try {
        $semesterId = $_GET['semesterId'] ?? null;
        
        if (!$semesterId) {
            Response::error('Semestre no especificado', 400);
        }
        
        $stmt = $db->prepare("
            SELECT 
                e.codigo as codigoEstudiante,
                CONCAT(e.nombres, ' ', e.apellidos) as nombreEstudiante,
                CONCAT(u.nombres, ' ', u.apellidos) as nombreTutor,
                u.especialidad,
                s.nombre as semestre,
                a.fechaAsignacion,
                a.estado
            FROM asignaciontutor a
            INNER JOIN estudiante e ON a.idEstudiante = e.id
            INNER JOIN usuariosistema u ON a.idTutor = u.id
            INNER JOIN semestre s ON a.idSemestre = s.id
            WHERE a.idSemestre = :semesterId
            ORDER BY u.apellidos, e.apellidos
        ");
        
        $stmt->execute([':semesterId' => $semesterId]);
        $reporte = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        Response::success([
            'asignaciones' => $reporte,
            'total' => count($reporte)
        ], 'Reporte generado');
        
    } catch (Exception $e) {
        error_log('Error en getReport: ' . $e->getMessage());
        Response::error('Error al generar reporte', 500);
    }
}
