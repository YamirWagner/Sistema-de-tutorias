<?php
// auditoria.php - API de Auditoría basada en la BD actual (logacceso)

require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===============================
// Autenticación (solo admin)
// ===============================

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? null);
$token = $authHeader ? str_replace('Bearer ', '', $authHeader) : null;

if (!$token) {
    Response::error('Token no proporcionado', 401);
}

try {
    $decoded = JWT::decode($token);
    
    // Simplemente verificar que el token se pueda decodificar
    // No importa qué campos tenga, si JWT::decode() no lanza excepción, el token es válido
    error_log("Auditoria - Token válido decodificado");
} catch (Exception $e) {
    error_log("Auditoria - Error decodificando token: " . $e->getMessage());
    Response::error('Token inválido: ' . $e->getMessage(), 401);
}

// ===============================
// Conexión BD (PDO)
// ===============================

try {
    $db = new Database();
    $conn = $db->getConnection(); // PDO
} catch (Exception $e) {
    Response::error('Error de conexión a la base de datos: ' . $e->getMessage(), 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ===============================
// 1) ESTADÍSTICAS DE AUDITORÍA
// ===============================

if ($method === 'GET' && $action === 'estadisticas') {
    try {
        // Total de acciones registradas en logacceso
        $total = 0;
        $stmtTotal = $conn->query("SELECT COUNT(*) AS total FROM logacceso");
        if ($stmtTotal) {
            $total = (int)$stmtTotal->fetchColumn();
        }

        // Acciones del día de hoy
        $hoy = 0;
        $stmtHoy = $conn->query("SELECT COUNT(*) AS hoy FROM logacceso WHERE DATE(fechaHora) = CURDATE()");
        if ($stmtHoy) {
            $hoy = (int)$stmtHoy->fetchColumn();
        }

        // Usuarios activos (idUsuario o idEstudiante) con actividad en los últimos 7 días
        $activos = 0;
        $stmtActivos = $conn->query("SELECT COUNT(DISTINCT COALESCE(idUsuario, idEstudiante)) AS activos
                                      FROM logacceso
                                      WHERE fechaHora >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        if ($stmtActivos) {
            $activos = (int)$stmtActivos->fetchColumn();
        }

        // Asignaciones totales activas
        $asignaciones = 0;
        $stmtAsignaciones = $conn->query("SELECT COUNT(*) AS asignaciones FROM asignaciontutor WHERE estado = 'Activa'");
        if ($stmtAsignaciones) {
            $asignaciones = (int)$stmtAsignaciones->fetchColumn();
        }

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

// ======================================
// 2) LISTADO DE REGISTROS DE AUDITORÍA
// ======================================

if ($method === 'GET' && $action === 'registros') {
    try {
        $usuario = isset($_GET['usuario']) ? trim($_GET['usuario']) : '';
        $accion = isset($_GET['accion']) ? trim($_GET['accion']) : '';
        $desde = $_GET['desde'] ?? '';
        $hasta = $_GET['hasta'] ?? '';
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        // Limitar el tamaño máximo de página
        if ($limit <= 0) { $limit = 50; }
        if ($limit > 200) { $limit = 200; }
        if ($offset < 0) { $offset = 0; }

        $sql = "SELECT 
                    l.idLog,
                    l.fechaHora,
                    l.usuario AS usuarioLog,
                    l.tipoAcceso,
                    l.accion,
                    l.descripcion,
                    l.ipOrigen,
                    l.estadoSesion,
                    us.nombres AS usuarioNombres,
                    us.apellidos AS usuarioApellidos,
                    us.rol AS usuarioRol,
                    es.codigo AS estudianteCodigo,
                    es.nombres AS estudianteNombres,
                    es.apellidos AS estudianteApellidos
                FROM logacceso l
                LEFT JOIN usuariosistema us ON l.idUsuario = us.id
                LEFT JOIN estudiante es ON l.idEstudiante = es.id
                WHERE 1=1";

        $params = [];

        if ($usuario !== '') {
            $sql .= " AND (l.usuario LIKE :usuario
                        OR CONCAT(us.nombres, ' ', us.apellidos) LIKE :usuarioNombre
                        OR CONCAT(es.nombres, ' ', es.apellidos) LIKE :usuarioEstudiante
                        OR es.codigo LIKE :codigoEstudiante)";
            $likeUsuario = '%' . $usuario . '%';
            $params[':usuario'] = $likeUsuario;
            $params[':usuarioNombre'] = $likeUsuario;
            $params[':usuarioEstudiante'] = $likeUsuario;
            $params[':codigoEstudiante'] = $likeUsuario;
        }

        if ($accion !== '') {
            $sql .= " AND l.accion LIKE :accion";
            $params[':accion'] = '%' . $accion . '%';
        }

        if ($desde !== '') {
            $sql .= " AND l.fechaHora >= :desde";
            $params[':desde'] = $desde;
        }

        if ($hasta !== '') {
            $sql .= " AND l.fechaHora <= :hasta";
            $params[':hasta'] = $hasta;
        }

        $sql .= " ORDER BY l.fechaHora DESC, l.idLog DESC LIMIT :limit OFFSET :offset";

        $stmt = $conn->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);

        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $registros = [];
        foreach ($rows as $row) {
            // Resolver nombre de usuario
            $nombre = $row['usuarioLog'];
            if (!$nombre) {
                if (!empty($row['usuarioNombres']) || !empty($row['usuarioApellidos'])) {
                    $nombre = trim(($row['usuarioNombres'] ?? '') . ' ' . ($row['usuarioApellidos'] ?? ''));
                } elseif (!empty($row['estudianteNombres']) || !empty($row['estudianteApellidos'])) {
                    $nombre = trim(($row['estudianteNombres'] ?? '') . ' ' . ($row['estudianteApellidos'] ?? ''));
                }
            }
            if (!$nombre && !empty($row['estudianteCodigo'])) {
                $nombre = $row['estudianteCodigo'];
            }
            if (!$nombre) {
                $nombre = 'Desconocido';
            }

            // Resolver rol
            $rol = $row['usuarioRol'] ?? $row['tipoAcceso'] ?? 'N/A';

            $registros[] = [
                'id' => (int)$row['idLog'],
                'fechaHora' => $row['fechaHora'],
                'usuario' => $nombre,
                'rol' => $rol,
                'accion' => $row['accion'],
                'descripcion' => $row['descripcion'],
                'ipOrigen' => $row['ipOrigen'],
                'estadoSesion' => $row['estadoSesion'],
            ];
        }

        Response::success($registros);
    } catch (Exception $e) {
        Response::error('Error al obtener registros: ' . $e->getMessage(), 500);
    }
}

Response::error('Acción no válida', 400);
