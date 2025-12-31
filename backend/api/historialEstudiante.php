<?php
// ============================================
// API HISTORIAL ESTUDIANTE - Verificador
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
$action = $_GET['action'] ?? 'buscar';

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
        case 'buscar':
            buscarEstudiante($conn);
            break;
        
        case 'historial':
            getHistorialEstudiante($conn);
            break;
        
        default:
            sendResponse(false, null, 'Acción no válida', 400);
    }
} catch (Exception $e) {
    error_log("Error en historial estudiante API: " . $e->getMessage());
    sendResponse(false, null, 'Error en el servidor: ' . $e->getMessage(), 500);
}

// ============================================
// FUNCIONES
// ============================================

/**
 * Buscar estudiante por código o nombre
 */
function buscarEstudiante($conn) {
    try {
        $codigo = $_GET['codigo'] ?? '';
        $nombre = $_GET['nombre'] ?? '';
        
        if (empty($codigo) && empty($nombre)) {
            sendResponse(false, null, 'Debe proporcionar código o nombre', 400);
        }
        
        $query = "SELECT 
            e.id,
            e.codigo,
            CONCAT(e.nombres, ' ', e.apellidos) as nombre,
            e.correo,
            e.semestre as carrera,
            COUNT(t.id) as total_tutorias,
            SUM(CASE WHEN t.estado = 'Realizada' THEN 1 ELSE 0 END) as asistencias,
            SUM(CASE WHEN t.estado IN ('Cancelada', 'Cancelada_Automatica') THEN 1 ELSE 0 END) as faltas
            FROM estudiante e
            LEFT JOIN asignaciontutor at ON e.id = at.idEstudiante
            LEFT JOIN tutoria t ON at.id = t.idAsignacion
            WHERE 1=1";
        
        if (!empty($codigo)) {
            $query .= " AND e.codigo = :codigo";
        }
        if (!empty($nombre)) {
            $query .= " AND (e.nombres LIKE :nombre OR e.apellidos LIKE :nombre)";
        }
        
        $query .= " GROUP BY e.id LIMIT 1";
        
        $stmt = $conn->prepare($query);
        if (!empty($codigo)) {
            $stmt->bindValue(':codigo', $codigo);
        }
        if (!empty($nombre)) {
            $stmt->bindValue(':nombre', '%' . $nombre . '%');
        }
        
        $stmt->execute();
        $estudiante = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($estudiante) {
            sendResponse(true, $estudiante);
        } else {
            sendResponse(false, null, 'Estudiante no encontrado', 404);
        }
    } catch (Exception $e) {
        error_log("Error al buscar estudiante: " . $e->getMessage());
        sendResponse(false, null, 'Error al buscar estudiante: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener historial completo de tutorías de un estudiante
 */
function getHistorialEstudiante($conn) {
    try {
        $estudianteId = $_GET['estudiante_id'] ?? '';
        
        if (empty($estudianteId)) {
            sendResponse(false, null, 'ID de estudiante requerido', 400);
        }
        
        // Construir query con filtros opcionales
        $query = "SELECT 
            DATE_FORMAT(t.fecha, '%d/%m/%Y') as fecha,
            CONCAT(u.nombres, ' ', u.apellidos) as tutor,
            t.tipo as tema,
            CONCAT(TIMESTAMPDIFF(MINUTE, 
                CONCAT(t.fecha, ' ', t.horaInicio), 
                CONCAT(t.fecha, ' ', t.horaFin)), ' min') as duracion,
            CASE 
                WHEN t.estado = 'Realizada' THEN 'asistio'
                WHEN t.estado IN ('Cancelada', 'Cancelada_Automatica') THEN 'no_asistio'
                ELSE 'pendiente'
            END as estado,
            t.observaciones,
            s.nombre as semestre
            FROM tutoria t
            INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
            INNER JOIN usuariosistema u ON at.idTutor = u.id
            LEFT JOIN semestre s ON at.idSemestre = s.id
            WHERE at.idEstudiante = :estudiante_id";
        
        // Filtros opcionales
        if (isset($_GET['semestre_id']) && !empty($_GET['semestre_id'])) {
            $query .= " AND at.idSemestre = :semestre_id";
        }
        if (isset($_GET['estado']) && !empty($_GET['estado'])) {
            $estadoMap = [
                'asistio' => 'Realizada',
                'no_asistio' => 'Cancelada',
                'pendiente' => 'Pendiente'
            ];
            if (isset($estadoMap[$_GET['estado']])) {
                $query .= " AND t.estado = :estado_filtro";
            }
        }
        
        $query .= " ORDER BY t.fecha DESC";
        
        $stmt = $conn->prepare($query);
        $stmt->bindValue(':estudiante_id', $estudianteId);
        
        if (isset($_GET['semestre_id']) && !empty($_GET['semestre_id'])) {
            $stmt->bindValue(':semestre_id', $_GET['semestre_id']);
        }
        if (isset($_GET['estado']) && !empty($_GET['estado'])) {
            $estadoMap = [
                'asistio' => 'Realizada',
                'no_asistio' => 'Cancelada',
                'pendiente' => 'Pendiente'
            ];
            if (isset($estadoMap[$_GET['estado']])) {
                $stmt->bindValue(':estado_filtro', $estadoMap[$_GET['estado']]);
            }
        }
        
        $stmt->execute();
        $tutorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Obtener semestres disponibles para el estudiante
        $querySemestres = "SELECT DISTINCT 
            s.id,
            s.nombre
            FROM semestre s
            INNER JOIN asignaciontutor at ON at.idSemestre = s.id
            WHERE at.idEstudiante = :estudiante_id
            ORDER BY s.anio DESC, s.periodo DESC";
        
        $stmtSemestres = $conn->prepare($querySemestres);
        $stmtSemestres->bindValue(':estudiante_id', $estudianteId);
        $stmtSemestres->execute();
        $semestres = $stmtSemestres->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, [
            'tutorias' => $tutorias,
            'semestres' => $semestres
        ]);
    } catch (Exception $e) {
        error_log("Error al obtener historial: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener historial: ' . $e->getMessage(), 500);
    }
}
