<?php
// ============================================
// API SEGUIMIENTO TUTOR - Verificador
// ============================================

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/response.php';

// Verificar autenticación y rol
$token = JWT::getBearerToken();

if (!$token) {
    sendResponse(false, null, 'Token no proporcionado', 401);
}

try {
    $payload = JWT::decode($token);
} catch (Exception $e) {
    sendResponse(false, null, 'Token inválido o expirado: ' . $e->getMessage(), 401);
}

// Verificar que el usuario sea verificador
if ($payload['role'] !== 'verifier') {
    sendResponse(false, null, 'Acceso denegado. Solo verificadores', 403);
}

$database = new Database();
$conn = $database->getConnection();
$action = $_GET['action'] ?? 'lista';

// Función helper para compatibilidad
function sendResponse($success, $data = null, $message = '', $code = 200) {
    if ($success) {
        Response::success($data, $message ?: 'Operación exitosa', $code);
    } else {
        Response::error($message ?: 'Error en la operación', $code);
    }
}

try {
    switch ($action) {
        case 'lista':
            getListaTutores($conn);
            break;
        
        case 'datos':
            getDatosTutor($conn);
            break;
        
        case 'sesiones':
            getSesionesTutor($conn);
            break;
        
        default:
            sendResponse(false, null, 'Acción no válida', 400);
    }
} catch (Exception $e) {
    error_log("Error en seguimiento tutor API: " . $e->getMessage());
    sendResponse(false, null, 'Error en el servidor: ' . $e->getMessage(), 500);
}

// ============================================
// FUNCIONES
// ============================================

/**
 * Obtener lista de todos los tutores activos
 */
function getListaTutores($conn) {
    try {
        $query = "SELECT 
            id,
            dni,
            CONCAT(nombres, ' ', apellidos) as nombre,
            especialidad
            FROM usuariosistema
            WHERE rol = 'Tutor' AND estado = 'Activo'
            ORDER BY nombres, apellidos";
        
        $stmt = $conn->query($query);
        $tutores = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, $tutores);
    } catch (Exception $e) {
        error_log("Error al obtener lista de tutores: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener lista de tutores: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener datos y estadísticas de un tutor específico
 */
function getDatosTutor($conn) {
    try {
        $tutorId = $_GET['tutor_id'] ?? '';
        
        if (empty($tutorId)) {
            sendResponse(false, null, 'ID de tutor requerido', 400);
        }
        
        // Datos básicos del tutor y estadísticas generales
        $query = "SELECT 
            u.id,
            u.dni,
            CONCAT(u.nombres, ' ', u.apellidos) as nombre,
            u.correo,
            u.especialidad,
            COUNT(t.id) as total_sesiones,
            SUM(CASE WHEN t.estado = 'Realizada' THEN 1 ELSE 0 END) as sesiones_realizadas,
            SUM(CASE WHEN t.estado IN ('Pendiente', 'Programada') THEN 1 ELSE 0 END) as sesiones_pendientes,
            SUM(CASE WHEN t.estado IN ('Cancelada', 'Cancelada_Automatica') THEN 1 ELSE 0 END) as sesiones_canceladas,
            COUNT(DISTINCT at.idEstudiante) as estudiantes_atendidos
            FROM usuariosistema u
            LEFT JOIN asignaciontutor at ON u.id = at.idTutor
            LEFT JOIN tutoria t ON at.id = t.idAsignacion
            WHERE u.id = :tutor_id
            GROUP BY u.id";
        
        $stmt = $conn->prepare($query);
        $stmt->bindValue(':tutor_id', $tutorId);
        $stmt->execute();
        $tutor = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tutor) {
            sendResponse(false, null, 'Tutor no encontrado', 404);
        }
        
        // Sesiones por mes del año actual
        $queryMonthly = "SELECT 
            MONTH(t.fecha) as mes,
            COUNT(*) as total
            FROM tutoria t
            INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
            WHERE at.idTutor = :tutor_id 
            AND YEAR(t.fecha) = YEAR(CURDATE())
            GROUP BY MONTH(t.fecha)";
        
        $stmtMonthly = $conn->prepare($queryMonthly);
        $stmtMonthly->bindValue(':tutor_id', $tutorId);
        $stmtMonthly->execute();
        
        $sesionesPorMes = array_fill(0, 12, 0);
        while ($row = $stmtMonthly->fetch(PDO::FETCH_ASSOC)) {
            $sesionesPorMes[$row['mes'] - 1] = (int)$row['total'];
        }
        
        // Distribución de estados de sesiones
        $queryEstados = "SELECT 
            t.estado,
            COUNT(*) as cantidad
            FROM tutoria t
            INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
            WHERE at.idTutor = :tutor_id
            GROUP BY t.estado";
        
        $stmtEstados = $conn->prepare($queryEstados);
        $stmtEstados->bindValue(':tutor_id', $tutorId);
        $stmtEstados->execute();
        
        $distribucionEstados = [
            'Realizada' => 0,
            'Pendiente' => 0,
            'Programada' => 0,
            'Cancelada' => 0,
            'Cancelada_Automatica' => 0
        ];
        
        while ($row = $stmtEstados->fetch(PDO::FETCH_ASSOC)) {
            if (isset($distribucionEstados[$row['estado']])) {
                $distribucionEstados[$row['estado']] = (int)$row['cantidad'];
            }
        }
        
        $tutor['sesiones_por_mes'] = $sesionesPorMes;
        $tutor['distribucion_estados'] = $distribucionEstados;
        
        sendResponse(true, $tutor);
    } catch (Exception $e) {
        error_log("Error al obtener datos del tutor: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener datos del tutor: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener sesiones del tutor con filtros opcionales
 */
function getSesionesTutor($conn) {
    try {
        $tutorId = $_GET['tutor_id'] ?? '';
        
        if (empty($tutorId)) {
            sendResponse(false, null, 'ID de tutor requerido', 400);
        }
        
        $query = "SELECT 
            t.id,
            DATE_FORMAT(t.fecha, '%d/%m/%Y') as fecha,
            t.horaInicio as hora,
            CONCAT(e.nombres, ' ', e.apellidos) as estudiante,
            e.codigo as codigo_estudiante,
            t.tipo as tema,
            CONCAT(TIMESTAMPDIFF(MINUTE, 
                CONCAT(t.fecha, ' ', t.horaInicio), 
                CONCAT(t.fecha, ' ', t.horaFin)), ' min') as duracion,
            t.estado,
            CASE 
                WHEN t.estado = 'Realizada' THEN 'si'
                WHEN t.estado IN ('Cancelada', 'Cancelada_Automatica') THEN 'no'
                ELSE 'pendiente'
            END as asistencia,
            t.observaciones
            FROM tutoria t
            INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
            INNER JOIN estudiante e ON at.idEstudiante = e.id
            WHERE at.idTutor = :tutor_id";
        
        // Filtros opcionales
        if (isset($_GET['mes']) && !empty($_GET['mes'])) {
            $query .= " AND MONTH(t.fecha) = :mes AND YEAR(t.fecha) = YEAR(CURDATE())";
        }
        if (isset($_GET['estado']) && !empty($_GET['estado'])) {
            $query .= " AND t.estado = :estado";
        }
        
        $query .= " ORDER BY t.fecha DESC, t.horaInicio DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->bindValue(':tutor_id', $tutorId);
        
        if (isset($_GET['mes']) && !empty($_GET['mes'])) {
            $stmt->bindValue(':mes', $_GET['mes']);
        }
        if (isset($_GET['estado']) && !empty($_GET['estado'])) {
            $stmt->bindValue(':estado', $_GET['estado']);
        }
        
        $stmt->execute();
        $sesiones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, ['sesiones' => $sesiones]);
    } catch (Exception $e) {
        error_log("Error al obtener sesiones del tutor: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener sesiones del tutor: ' . $e->getMessage(), 500);
    }
}
