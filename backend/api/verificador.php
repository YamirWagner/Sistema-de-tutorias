<?php
// ============================================
// API VERIFICADOR - Sistema de Tutorías UNSAAC
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
$action = $_GET['action'] ?? 'stats';

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
        case 'stats':
            getVerificadorStats($conn);
            break;
        
        case 'chart-data':
            getChartData($conn);
            break;
        
        case 'top-students':
            getTopStudents($conn);
            break;
        
        case 'top-tutors':
            getTopTutors($conn);
            break;
        
        default:
            sendResponse(false, null, 'Acción no válida', 400);
    }
} catch (Exception $e) {
    error_log("Error en verificador API: " . $e->getMessage());
    sendResponse(false, null, 'Error en el servidor: ' . $e->getMessage(), 500);
}

// ============================================
// FUNCIONES
// ============================================

/**
 * Obtener estadísticas del dashboard principal
 */
function getVerificadorStats($conn) {
    try {
        // Total de tutorías (excluyendo canceladas)
        $queryTotal = "SELECT COUNT(*) as total FROM tutoria WHERE estado NOT IN ('Cancelada', 'Cancelada_Automatica')";
        $stmtTotal = $conn->query($queryTotal);
        $result = $stmtTotal->fetch(PDO::FETCH_ASSOC);
        $total = $result ? (int)$result['total'] : 0;
        
        // Tutorías pendientes de verificación (Realizadas pero sin verificar)
        $queryPending = "SELECT COUNT(*) as pendientes FROM tutoria t
                         LEFT JOIN verificacion v ON t.id = v.idTutoria
                         WHERE t.estado = 'Realizada' AND v.id IS NULL";
        $stmtPending = $conn->query($queryPending);
        $result = $stmtPending->fetch(PDO::FETCH_ASSOC);
        $pendientes = $result ? (int)$result['pendientes'] : 0;
        
        // Tutorías verificadas
        $queryVerified = "SELECT COUNT(DISTINCT t.id) as verificadas FROM tutoria t
                          INNER JOIN verificacion v ON t.id = v.idTutoria
                          WHERE t.estado = 'Realizada'";
        $stmtVerified = $conn->query($queryVerified);
        $result = $stmtVerified->fetch(PDO::FETCH_ASSOC);
        $verificadas = $result ? (int)$result['verificadas'] : 0;
        
        // Tutorías canceladas (faltantes)
        $queryMissing = "SELECT COUNT(*) as faltantes FROM tutoria 
                         WHERE estado IN ('Cancelada', 'Cancelada_Automatica')";
        $stmtMissing = $conn->query($queryMissing);
        $result = $stmtMissing->fetch(PDO::FETCH_ASSOC);
        $faltantes = $result ? (int)$result['faltantes'] : 0;
        
        sendResponse(true, [
            'totalSessions' => $total,
            'pendingSessions' => $pendientes,
            'verifiedSessions' => $verificadas,
            'missingSessions' => $faltantes
        ]);
    } catch (Exception $e) {
        error_log("Error al obtener estadísticas: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener estadísticas: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener datos para los gráficos del dashboard
 */
function getChartData($conn) {
    try {
        // Datos de asistencia (Realizadas, Pendientes, Canceladas)
        $queryAttendance = "SELECT 
            SUM(CASE WHEN estado = 'Realizada' THEN 1 ELSE 0 END) as attended,
            SUM(CASE WHEN estado IN ('Cancelada', 'Cancelada_Automatica') THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN estado IN ('Pendiente', 'Programada') THEN 1 ELSE 0 END) as missing
            FROM tutoria";
        $stmtAttendance = $conn->query($queryAttendance);
        $attendance = $stmtAttendance->fetch(PDO::FETCH_ASSOC);
        
        // Tutorías por mes (últimos 12 meses)
        $queryMonthly = "SELECT 
            MONTH(fecha) as mes,
            COUNT(*) as total
            FROM tutoria
            WHERE YEAR(fecha) = YEAR(CURDATE()) AND fecha IS NOT NULL
            GROUP BY MONTH(fecha)
            ORDER BY mes";
        $stmtMonthly = $conn->query($queryMonthly);
        $monthlyData = array_fill(0, 12, 0);
        
        while ($row = $stmtMonthly->fetch(PDO::FETCH_ASSOC)) {
            $monthlyData[$row['mes'] - 1] = (int)$row['total'];
        }
        
        sendResponse(true, [
            'attendance' => $attendance,
            'monthly' => $monthlyData
        ]);
    } catch (Exception $e) {
        error_log("Error al obtener datos de gráficos: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener datos de gráficos: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener top 5 estudiantes más activos
 */
function getTopStudents($conn) {
    try {
        $query = "SELECT 
            CONCAT(e.nombres, ' ', e.apellidos) as nombre,
            e.codigo,
            COUNT(t.id) as total_sesiones
            FROM estudiante e
            INNER JOIN asignaciontutor at ON e.id = at.idEstudiante
            INNER JOIN tutoria t ON at.id = t.idAsignacion
            WHERE t.estado = 'Realizada'
            GROUP BY e.id
            ORDER BY total_sesiones DESC
            LIMIT 5";
        
        $stmt = $conn->query($query);
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, $students);
    } catch (Exception $e) {
        error_log("Error al obtener top estudiantes: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener top estudiantes: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener top 5 tutores más activos
 */
function getTopTutors($conn) {
    try {
        $query = "SELECT 
            CONCAT(u.nombres, ' ', u.apellidos) as nombre,
            u.especialidad,
            COUNT(t.id) as total_sesiones
            FROM usuariosistema u
            INNER JOIN asignaciontutor at ON u.id = at.idTutor
            INNER JOIN tutoria t ON at.id = t.idAsignacion
            WHERE u.rol = 'Tutor' AND t.estado = 'Realizada'
            GROUP BY u.id
            ORDER BY total_sesiones DESC
            LIMIT 5";
        
        $stmt = $conn->query($query);
        $tutors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, $tutors);
    } catch (Exception $e) {
        error_log("Error al obtener top tutores: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener top tutores: ' . $e->getMessage(), 500);
    }
}
