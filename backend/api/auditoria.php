<?php
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar autenticación
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

if (!$token) {
    Response::error('Token no proporcionado', 401);
}

try {
    $decoded = JWT::decode($token);
    
    // Verificar que sea administrador
    if ($decoded->role !== 'admin') {
        Response::error('Acceso denegado. Solo administradores', 403);
    }
} catch (Exception $e) {
    Response::error('Token inválido: ' . $e->getMessage(), 401);
}

$db = new Database();
$conn = $db->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Obtener estadísticas de auditoría
if ($method === 'GET' && $action === 'estadisticas') {
    try {
        // Total de acciones
        $sqlTotal = "SELECT COUNT(*) as total FROM logacceso";
        $stmtTotal = $conn->query($sqlTotal);
        $total = $stmtTotal->fetch_assoc()['total'];
        
        // Acciones de hoy
        $sqlHoy = "SELECT COUNT(*) as hoy FROM logacceso WHERE DATE(FechaHora) = CURDATE()";
        $stmtHoy = $conn->query($sqlHoy);
        $hoy = $stmtHoy->fetch_assoc()['hoy'];
        
        // Usuarios activos (únicos con actividad en los últimos 7 días)
        $sqlActivos = "SELECT COUNT(DISTINCT COALESCE(ID_Usuario, ID_Estudiante)) as activos 
                       FROM logacceso 
                       WHERE FechaHora >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        $stmtActivos = $conn->query($sqlActivos);
        $activos = $stmtActivos->fetch_assoc()['activos'];
        
        // Asignaciones totales (ejemplo, ajustar según tu BD)
        $sqlAsignaciones = "SELECT COUNT(*) as asignaciones FROM asignacion";
        $stmtAsignaciones = $conn->query($sqlAsignaciones);
        $asignaciones = $stmtAsignaciones->fetch_assoc()['asignaciones'];
        
        $estadisticas = [
            'accionesTotales' => $total,
            'accionesHoy' => $hoy,
            'usuariosActivos' => $activos,
            'asignaciones' => $asignaciones
        ];
        
        Response::success($estadisticas);
        
    } catch (Exception $e) {
        Response::error('Error al obtener estadísticas: ' . $e->getMessage(), 500);
    }
}

// Obtener registros de auditoría con filtros
if ($method === 'GET' && $action === 'registros') {
    try {
        $usuario = $_GET['usuario'] ?? '';
        $accion = $_GET['accion'] ?? '';
        $desde = $_GET['desde'] ?? '';
        $hasta = $_GET['hasta'] ?? '';
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        
        $sql = "SELECT 
                    l.ID_Log,
                    l.FechaHora,
                    COALESCE(l.Usuario, CONCAT(u.Nombre, ' ', u.Apellido)) as Usuario,
                    COALESCE(l.TipoAcceso, u.Rol) as Rol,
                    l.Accion,
                    l.Descripcion,
                    l.IP_Origen,
                    l.Estado_Sesion
                FROM logacceso l
                LEFT JOIN Usuario u ON l.ID_Usuario = u.ID_Usuario
                WHERE 1=1";
        
        $params = [];
        $types = '';
        
        if (!empty($usuario)) {
            $sql .= " AND (l.Usuario LIKE ? OR CONCAT(u.Nombre, ' ', u.Apellido) LIKE ? OR u.Codigo LIKE ?)";
            $searchParam = "%{$usuario}%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
            $types .= 'sss';
        }
        
        if (!empty($accion)) {
            $sql .= " AND l.Accion LIKE ?";
            $params[] = "%{$accion}%";
            $types .= 's';
        }
        
        if (!empty($desde)) {
            $sql .= " AND l.FechaHora >= ?";
            $params[] = $desde;
            $types .= 's';
        }
        
        if (!empty($hasta)) {
            $sql .= " AND l.FechaHora <= ?";
            $params[] = $hasta;
            $types .= 's';
        }
        
        $sql .= " ORDER BY l.FechaHora DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        $types .= 'ii';
        
        $stmt = $conn->prepare($sql);
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $registros = [];
        while ($row = $result->fetch_assoc()) {
            $registros[] = [
                'id' => $row['ID_Log'],
                'fechaHora' => $row['FechaHora'],
                'usuario' => $row['Usuario'] ?? 'Desconocido',
                'rol' => $row['Rol'] ?? 'N/A',
                'accion' => $row['Accion'],
                'descripcion' => $row['Descripcion'],
                'ipOrigen' => $row['IP_Origen'],
                'estadoSesion' => $row['Estado_Sesion']
            ];
        }
        
        Response::success($registros);
        
    } catch (Exception $e) {
        Response::error('Error al obtener registros: ' . $e->getMessage(), 500);
    }
}

Response::error('Acción no válida', 400);
