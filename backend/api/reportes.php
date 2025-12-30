<?php
// reportes.php - API de Reportes y Constancias
// Sistema de Tutorías UNSAAC

require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

header('Content-Type: application/json; charset=utf-8');

// Configurar logging
$logFile = __DIR__ . '/../storage/logs/reportes_' . date('Y-m-d') . '.log';
ini_set('error_log', $logFile);
ini_set('log_errors', 1);

// Log de inicio
error_log("=== REPORTES.PHP INICIADO ===" . PHP_EOL, 3, $logFile);
error_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD'] . PHP_EOL, 3, $logFile);
error_log("REQUEST_URI: " . $_SERVER['REQUEST_URI'] . PHP_EOL, 3, $logFile);
error_log("ACTION: " . ($_GET['action'] ?? 'NO ACTION') . PHP_EOL, 3, $logFile);

try {
    // Verificar autenticación
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

    if (!$token) {
        Response::error('Token no proporcionado', 401);
        exit;
    }

    $decoded = JWT::decode($token);
    if (!$decoded) {
        Response::error('Token inválido o expirado', 401);
        exit;
    }

    $userRole = $decoded['role'] ?? $decoded['rol'] ?? null;
    $userId = $decoded['id'] ?? $decoded['user_id'] ?? null;

    // Log para debug
    error_log("Reportes - Usuario ID: " . $userId . ", Rol: " . $userRole);

    // Normalizar el rol y verificar roles permitidos
    $roleMap = [
        'admin' => 'Administrador',
        'tutor' => 'Tutor',
        'verifier' => 'Verificador',
        'Administrador' => 'Administrador',
        'Tutor' => 'Tutor',
        'Verificador' => 'Verificador'
    ];

    $normalizedRole = $roleMap[$userRole] ?? null;
    $allowedRoles = ['Administrador', 'Tutor', 'Verificador'];

    if (!$normalizedRole || !in_array($normalizedRole, $allowedRoles)) {
        Response::error('Acceso denegado. Rol no autorizado para acceder a reportes', 403);
        exit;
    }

    // Obtener parámetros
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    // Conectar a la base de datos
    $database = new Database();
    $db = $database->getConnection();
    
    // Manejar diferentes acciones según el método
    switch($method) {
        case 'GET':
            handleGetRequest($db, $action);
            break;
        case 'POST':
            handlePostRequest($db);
            break;
        default:
            Response::error('Método no permitido', 405);
    }
} catch (Exception $e) {
    error_log("Error en reportes.php: " . $e->getMessage());
    Response::error('Error interno del servidor: ' . $e->getMessage(), 500);
}

// ===== FUNCIONES DE MANEJO DE PETICIONES =====

function handleGetRequest($db, $action) {
    switch($action) {
        case 'getTutors':
            getTutorsBySemester($db);
            break;
        case 'getTutorStudents':
            getTutorStudents($db);
            break;
        case 'searchStudents':
            searchStudents($db);
            break;
        case 'searchStudentByCode':
            searchStudentByCode($db);
            break;
        case 'getConstanciaData':
            getConstanciaData($db);
            break;
        case 'getComplianceStats':
            getComplianceStats($db);
            break;
        default:
            Response::error('Acción no válida', 400);
    }
}

function handlePostRequest($db) {
    // Aquí se pueden añadir acciones POST si se necesitan en el futuro
    Response::error('No hay acciones POST implementadas', 400);
}

// ===== FUNCIONES DE REPORTES =====

/**
 * Obtener tutores por semestre
 */
function getTutorsBySemester($db) {
    try {
        $semesterId = $_GET['semesterId'] ?? null;
        
        if (!$semesterId) {
            Response::error('ID de semestre requerido', 400);
            return;
        }
        
        error_log("getTutorsBySemester - SemestreID: " . $semesterId);
        
        $query = "SELECT DISTINCT 
                    u.id,
                    u.nombres,
                    u.apellidos,
                    u.especialidad,
                    COUNT(DISTINCT a.idEstudiante) as estudiantesAsignados
                  FROM usuariosistema u
                  INNER JOIN asignaciontutor a ON u.id = a.idTutor
                  WHERE u.rol = 'Tutor' 
                    AND a.idSemestre = :semesterId
                    AND a.estado = 'Activa'
                  GROUP BY u.id, u.nombres, u.apellidos, u.especialidad
                  ORDER BY u.apellidos, u.nombres";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':semesterId', $semesterId, PDO::PARAM_INT);
        $stmt->execute();
        
        $tutors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("getTutorsBySemester - Tutores encontrados: " . count($tutors));
        
        Response::success($tutors, 'Tutores obtenidos');
    } catch (Exception $e) {
        error_log("Error en getTutorsBySemester: " . $e->getMessage());
        Response::error('Error al obtener tutores: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener lista de estudiantes asignados a un tutor
 */
function getTutorStudents($db) {
    $semesterId = $_GET['semesterId'] ?? null;
    $tutorId = $_GET['tutorId'] ?? null;
    
    if (!$semesterId) {
        Response::error('ID de semestre requerido', 400);
        return;
    }
    
    // Obtener información del semestre
    $querySemestre = "SELECT nombre FROM semestre WHERE id = :semesterId";
    $stmtSemestre = $db->prepare($querySemestre);
    $stmtSemestre->bindParam(':semesterId', $semesterId, PDO::PARAM_INT);
    $stmtSemestre->execute();
    $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
    
    if (!$semestre) {
        Response::error('Semestre no encontrado', 404);
        return;
    }
    
    // Query base
    $baseQuery = "SELECT 
                    e.id,
                    e.codigo,
                    e.nombres,
                    e.apellidos,
                    e.correo,
                    e.semestre as semestreEstudiante,
                    u.nombres as tutorNombres,
                    u.apellidos as tutorApellidos,
                    COUNT(t.id) as sesionesCompletadas
                  FROM estudiante e
                  INNER JOIN asignaciontutor a ON e.id = a.idEstudiante
                  INNER JOIN usuariosistema u ON a.idTutor = u.id
                  LEFT JOIN tutoria t ON a.id = t.idAsignacion AND t.estado = 'Realizada'
                  WHERE a.idSemestre = :semesterId
                    AND a.estado = 'Activa'";
    
    $tutorInfo = "Todos los Tutores";
    
    if ($tutorId && $tutorId !== 'all') {
        $baseQuery .= " AND a.idTutor = :tutorId";
        
        // Obtener nombre del tutor
        $queryTutor = "SELECT CONCAT(nombres, ' ', apellidos) as nombre FROM usuariosistema WHERE id = :tutorId";
        $stmtTutor = $db->prepare($queryTutor);
        $stmtTutor->bindParam(':tutorId', $tutorId, PDO::PARAM_INT);
        $stmtTutor->execute();
        $tutor = $stmtTutor->fetch(PDO::FETCH_ASSOC);
        $tutorInfo = $tutor ? $tutor['nombre'] : 'Desconocido';
    }
    
    $baseQuery .= " GROUP BY e.id, e.codigo, e.nombres, e.apellidos, e.correo, e.semestre, u.nombres, u.apellidos
                    ORDER BY e.apellidos, e.nombres";
    
    $stmt = $db->prepare($baseQuery);
    $stmt->bindParam(':semesterId', $semesterId, PDO::PARAM_INT);
    if ($tutorId && $tutorId !== 'all') {
        $stmt->bindParam(':tutorId', $tutorId, PDO::PARAM_INT);
    }
    $stmt->execute();
    
    $estudiantes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $data = [
        'semestre' => $semestre['nombre'],
        'tutor' => $tutorInfo,
        'estudiantes' => $estudiantes
    ];
    
    Response::success($data, 'Estudiantes obtenidos');
}

/**
 * Buscar estudiantes por código o nombre
 */
function searchStudents($db) {
    $query = $_GET['query'] ?? '';
    
    if (strlen($query) < 3) {
        Response::error('La búsqueda debe tener al menos 3 caracteres', 400);
        return;
    }
    
    $searchTerm = "%{$query}%";
    
    $sql = "SELECT 
                id,
                codigo,
                nombres,
                apellidos,
                correo
            FROM estudiante
            WHERE (codigo LIKE :search1 
                OR nombres LIKE :search2 
                OR apellidos LIKE :search3
                OR CONCAT(nombres, ' ', apellidos) LIKE :search4)
                AND estado = 'Activo'
            ORDER BY apellidos, nombres
            LIMIT 10";
    
    $stmt = $db->prepare($sql);
    $stmt->bindParam(':search1', $searchTerm);
    $stmt->bindParam(':search2', $searchTerm);
    $stmt->bindParam(':search3', $searchTerm);
    $stmt->bindParam(':search4', $searchTerm);
    $stmt->execute();
    
    $estudiantes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    Response::success($estudiantes, 'Estudiantes encontrados');
}

/**
 * Obtener datos para generar constancia
 */
function getConstanciaData($db) {
    $semesterId = $_GET['semesterId'] ?? null;
    $studentId = $_GET['studentId'] ?? null;
    
    if (!$semesterId || !$studentId) {
        Response::error('ID de semestre y estudiante requeridos', 400);
        return;
    }
    
    // Obtener información del estudiante
    $queryStudent = "SELECT codigo, nombres, apellidos FROM estudiante WHERE id = :studentId";
    $stmtStudent = $db->prepare($queryStudent);
    $stmtStudent->bindParam(':studentId', $studentId, PDO::PARAM_INT);
    $stmtStudent->execute();
    $estudiante = $stmtStudent->fetch(PDO::FETCH_ASSOC);
    
    if (!$estudiante) {
        Response::error('Estudiante no encontrado', 404);
        return;
    }
    
    // Obtener información del semestre
    $querySemestre = "SELECT nombre FROM semestre WHERE id = :semesterId";
    $stmtSemestre = $db->prepare($querySemestre);
    $stmtSemestre->bindParam(':semesterId', $semesterId, PDO::PARAM_INT);
    $stmtSemestre->execute();
    $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
    
    if (!$semestre) {
        Response::error('Semestre no encontrado', 404);
        return;
    }
    
    // Contar sesiones completadas
    $queryCount = "SELECT COUNT(*) as total
                   FROM tutoria t
                   INNER JOIN asignaciontutor a ON t.idAsignacion = a.id
                   WHERE a.idEstudiante = :studentId
                     AND a.idSemestre = :semesterId
                     AND t.estado = 'Realizada'";
    
    $stmtCount = $db->prepare($queryCount);
    $stmtCount->bindParam(':studentId', $studentId, PDO::PARAM_INT);
    $stmtCount->bindParam(':semesterId', $semesterId, PDO::PARAM_INT);
    $stmtCount->execute();
    $result = $stmtCount->fetch(PDO::FETCH_ASSOC);
    
    $sesionesCompletadas = $result['total'];
    
    // Considerar completado si tiene al menos 3 sesiones
    $completado = $sesionesCompletadas >= 3;
    
    $data = [
        'estudiante' => $estudiante,
        'semestre' => $semestre['nombre'],
        'sesionesCompletadas' => $sesionesCompletadas,
        'completado' => $completado
    ];
    
    Response::success($data, 'Datos de constancia obtenidos');
}

/**
 * Obtener estadísticas de cumplimiento
 */
function getComplianceStats($db) {
    $semesterId = $_GET['semesterId'] ?? null;
    
    if (!$semesterId) {
        Response::error('ID de semestre requerido', 400);
        return;
    }
    
    // Total de tutores asignados en el semestre
    $queryTutores = "SELECT COUNT(DISTINCT idTutor) as total
                     FROM asignaciontutor
                     WHERE idSemestre = :semesterId AND estado = 'Activa'";
    $stmtTutores = $db->prepare($queryTutores);
    $stmtTutores->bindParam(':semesterId', $semesterId, PDO::PARAM_INT);
    $stmtTutores->execute();
    $totalTutores = $stmtTutores->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Total de estudiantes en el semestre
    $queryEstudiantes = "SELECT COUNT(DISTINCT idEstudiante) as total
                         FROM asignaciontutor
                         WHERE idSemestre = :semesterId AND estado = 'Activa'";
    $stmtEstudiantes = $db->prepare($queryEstudiantes);
    $stmtEstudiantes->bindParam(':semesterId', $semesterId, PDO::PARAM_INT);
    $stmtEstudiantes->execute();
    $totalEstudiantes = $stmtEstudiantes->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Total de sesiones registradas
    $querySesiones = "SELECT COUNT(*) as total
                      FROM tutoria t
                      INNER JOIN asignaciontutor a ON t.idAsignacion = a.id
                      WHERE a.idSemestre = :semesterId AND t.estado = 'Realizada'";
    $stmtSesiones = $db->prepare($querySesiones);
    $stmtSesiones->bindParam(':semesterId', $semesterId, PDO::PARAM_INT);
    $stmtSesiones->execute();
    $totalSesiones = $stmtSesiones->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Promedio de sesiones por estudiante
    $promedioSesiones = $totalEstudiantes > 0 ? $totalSesiones / $totalEstudiantes : 0;
    
    // Sesiones por tutor
    $queryTutoresDetalle = "SELECT 
                              CONCAT(u.nombres, ' ', u.apellidos) as nombre,
                              COUNT(t.id) as sesiones
                            FROM usuariosistema u
                            INNER JOIN asignaciontutor a ON u.id = a.idTutor
                            LEFT JOIN tutoria t ON a.id = t.idAsignacion AND t.estado = 'Realizada'
                            WHERE a.idSemestre = :semesterId 
                              AND a.estado = 'Activa'
                              AND u.rol = 'Tutor'
                            GROUP BY u.id, u.nombres, u.apellidos
                            ORDER BY sesiones DESC";
    $stmtTutoresDetalle = $db->prepare($queryTutoresDetalle);
    $stmtTutoresDetalle->bindParam(':semesterId', $semesterId, PDO::PARAM_INT);
    $stmtTutoresDetalle->execute();
    $tutoresDetalle = $stmtTutoresDetalle->fetchAll(PDO::FETCH_ASSOC);
    
    $data = [
        'totalTutores' => (int)$totalTutores,
        'totalEstudiantes' => (int)$totalEstudiantes,
        'totalSesiones' => (int)$totalSesiones,
        'promedioSesiones' => round($promedioSesiones, 2),
        'tutores' => $tutoresDetalle
    ];
    
    Response::success($data, 'Estadísticas obtenidas');
}

/**
 * Buscar estudiante por código
 */
function searchStudentByCode($db) {
    try {
        $codigo = $_GET['codigo'] ?? null;
        
        if (!$codigo) {
            Response::error('Código de estudiante requerido', 400);
            return;
        }
        
        error_log("searchStudentByCode - Código: " . $codigo);
        
        $query = "SELECT 
                    id,
                    codigo,
                    nombres,
                    apellidos,
                    correo,
                    semestre
                  FROM estudiante
                  WHERE codigo = :codigo
                  LIMIT 1";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':codigo', $codigo, PDO::PARAM_STR);
        $stmt->execute();
        
        $student = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$student) {
            Response::error('Estudiante no encontrado', 404);
            return;
        }
        
        error_log("searchStudentByCode - Estudiante encontrado: " . $student['nombres'] . " " . $student['apellidos']);
        
        Response::success($student, 'Estudiante encontrado');
    } catch (Exception $e) {
        error_log("Error en searchStudentByCode: " . $e->getMessage());
        Response::error('Error al buscar estudiante: ' . $e->getMessage(), 500);
    }
}
