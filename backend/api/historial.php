<?php
// Configurar reporte de errores para desarrollo
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/historial_errors.log');

require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

error_log("=== HISTORIAL.PHP INICIADO ===");
error_log("REQUEST_URI: " . $_SERVER['REQUEST_URI']);

$action = $_GET['action'] ?? null;

// Verificar autenticación
$headers = getallheaders();
$token = null;

if (isset($headers['Authorization'])) {
    $token = str_replace('Bearer ', '', $headers['Authorization']);
} elseif (isset($headers['authorization'])) {
    $token = str_replace('Bearer ', '', $headers['authorization']);
}

if (!$token) {
    error_log("ERROR: Token no proporcionado");
    Response::error('Token no proporcionado', 401);
    exit;
}

try {
    $decoded = JWT::decode($token);
    error_log("Token válido para: " . ($decoded->email ?? 'unknown'));
} catch (Exception $e) {
    error_log("ERROR: Token inválido - " . $e->getMessage());
    Response::error('Token inválido: ' . $e->getMessage(), 401);
    exit;
}

// Conectar a la base de datos
try {
    $db = new Database();
    $conn = $db->getConnection();
    error_log("Conexión a BD establecida");
} catch (Exception $e) {
    error_log("ERROR: No se pudo conectar a la BD - " . $e->getMessage());
    Response::error('Error de conexión a la base de datos', 500);
    exit;
}

// ============================================
// BUSCAR ESTUDIANTE
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'buscar') {
    error_log("=== BÚSQUEDA DE ESTUDIANTE ===");
    
    $busqueda = $_GET['busqueda'] ?? '';
    error_log("Término de búsqueda: " . $busqueda);
    
    if (empty($busqueda)) {
        Response::error('Parámetro de búsqueda requerido', 400);
        exit;
    }
    
    try {
        // ✅ Query con PDO
        $sql = "SELECT 
                    e.id,
                    e.codigo,
                    e.nombres,
                    e.apellidos,
                    e.correo,
                    COALESCE(t.nombres, '') AS tutorNombres,
                    COALESCE(t.apellidos, '') AS tutorApellidos
                FROM estudiante e
                LEFT JOIN asignaciontutor a ON e.id = a.idEstudiante AND a.estado = 'Activa'
                LEFT JOIN usuariosistema t ON a.idTutor = t.id
                WHERE e.estado = 'Activo'
                AND (
                    e.codigo LIKE :busqueda1
                    OR CONCAT(e.nombres, ' ', e.apellidos) LIKE :busqueda2
                    OR e.nombres LIKE :busqueda3
                    OR e.apellidos LIKE :busqueda4
                )
                LIMIT 10";
        
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Error al preparar consulta");
        }
        
        $searchParam = "%{$busqueda}%";
        
        // ✅ PDO usa bindParam o bindValue
        $stmt->bindValue(':busqueda1', $searchParam, PDO::PARAM_STR);
        $stmt->bindValue(':busqueda2', $searchParam, PDO::PARAM_STR);
        $stmt->bindValue(':busqueda3', $searchParam, PDO::PARAM_STR);
        $stmt->bindValue(':busqueda4', $searchParam, PDO::PARAM_STR);
        
        if (!$stmt->execute()) {
            throw new Exception("Error al ejecutar consulta");
        }
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("Resultados encontrados: " . count($rows));
        
        $estudiantes = [];
        foreach ($rows as $row) {
            $tutorActual = null;
            if (!empty($row['tutorNombres'])) {
                $tutorActual = trim($row['tutorNombres'] . ' ' . $row['tutorApellidos']);
            }
            
            $estudiantes[] = [
                'id' => (int)$row['id'],
                'codigo' => $row['codigo'],
                'nombre' => trim($row['nombres'] . ' ' . $row['apellidos']),
                'email' => $row['correo'],
                'tutorActual' => $tutorActual
            ];
        }
        
        error_log("Estudiantes procesados: " . count($estudiantes));
        
        Response::success($estudiantes);
        exit;
        
    } catch (Exception $e) {
        error_log("ERROR en búsqueda: " . $e->getMessage());
        Response::error('Error al buscar estudiante: ' . $e->getMessage(), 500);
        exit;
    }
}

// ============================================
// OBTENER HISTORIAL COMPLETO DE UN ESTUDIANTE
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'historial') {
    error_log("=== OBTENER HISTORIAL ===");
    
    $idEstudiante = $_GET['id_estudiante'] ?? null;
    error_log("ID Estudiante: " . ($idEstudiante ?? 'NULL'));
    
    if (!$idEstudiante) {
        Response::error('ID de estudiante requerido', 400);
        exit;
    }
    
    try {
        // ✅ Obtener información del estudiante con PDO
        $sqlEstudiante = "SELECT 
                            e.id,
                            e.codigo,
                            e.nombres,
                            e.apellidos,
                            COALESCE(t.nombres, '') AS tutorNombres,
                            COALESCE(t.apellidos, '') AS tutorApellidos
                          FROM estudiante e
                          LEFT JOIN asignaciontutor a ON e.id = a.idEstudiante AND a.estado = 'Activa'
                          LEFT JOIN usuariosistema t ON a.idTutor = t.id
                          WHERE e.id = :idEstudiante AND e.estado = 'Activo'";
        
        $stmt = $conn->prepare($sqlEstudiante);
        
        if (!$stmt) {
            throw new Exception("Error al preparar consulta estudiante");
        }
        
        $stmt->bindValue(':idEstudiante', $idEstudiante, PDO::PARAM_INT);
        
        if (!$stmt->execute()) {
            throw new Exception("Error al ejecutar consulta estudiante");
        }
        
        $estudiante = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$estudiante) {
            error_log("ERROR: Estudiante no encontrado con ID: " . $idEstudiante);
            Response::error('Estudiante no encontrado', 404);
            exit;
        }
        
        error_log("Estudiante encontrado: " . $estudiante['codigo']);
        
        // ✅ Obtener todas las tutorías del estudiante
        $sqlSesiones = "SELECT 
                          tu.id,
                          c.fecha,
                          c.horaInicio,
                          c.horaFin,
                          tu.tipo,
                          COALESCE(tu.observaciones, '') AS observaciones,
                          tu.estado,
                          COALESCE(tu.fechaRealizada, c.fecha) AS fechaRealizada,
                          COALESCE(t.nombres, '') AS tutorNombres,
                          COALESCE(t.apellidos, '') AS tutorApellidos
                       FROM tutoria tu
                       INNER JOIN asignaciontutor a ON tu.idAsignacion = a.id
                       INNER JOIN cronograma c ON tu.idCronograma = c.id
                       INNER JOIN usuariosistema t ON a.idTutor = t.id
                       WHERE a.idEstudiante = :idEstudiante
                       ORDER BY c.fecha DESC, c.horaInicio DESC";
        
        $stmt = $conn->prepare($sqlSesiones);
        
        if (!$stmt) {
            throw new Exception("Error al preparar consulta sesiones");
        }
        
        $stmt->bindValue(':idEstudiante', $idEstudiante, PDO::PARAM_INT);
        
        if (!$stmt->execute()) {
            throw new Exception("Error al ejecutar consulta sesiones");
        }
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        error_log("Sesiones encontradas: " . count($rows));
        
        $sesiones = [];
        foreach ($rows as $row) {
            // Mapear según el tipo de tutoría
            $academico = ['tema' => null, 'avance' => null, 'notas' => null];
            $personal = ['tema' => null, 'notas' => null];
            $profesional = ['tema' => null, 'notas' => null];
            
            switch ($row['tipo']) {
                case 'Académica':
                    $academico['tema'] = 'Tutoría Académica';
                    $academico['notas'] = $row['observaciones'];
                    break;
                case 'Personal':
                    $personal['tema'] = 'Tutoría Personal';
                    $personal['notas'] = $row['observaciones'];
                    break;
                case 'Profesional':
                    $profesional['tema'] = 'Tutoría Profesional';
                    $profesional['notas'] = $row['observaciones'];
                    break;
            }
            
            $sesiones[] = [
                'id' => (int)$row['id'],
                'fecha' => $row['fecha'],
                'horaInicio' => $row['horaInicio'],
                'horaFin' => $row['horaFin'],
                'academico' => $academico,
                'personal' => $personal,
                'profesional' => $profesional,
                'asistencia' => $row['estado'] === 'Realizada' ? 'Asistió' : 'Pendiente',
                'fechaRegistro' => $row['fechaRealizada'],
                'tutor' => trim($row['tutorNombres'] . ' ' . $row['tutorApellidos'])
            ];
        }
        
        $tutorActual = null;
        if (!empty($estudiante['tutorNombres'])) {
            $tutorActual = trim($estudiante['tutorNombres'] . ' ' . $estudiante['tutorApellidos']);
        }
        
        $response = [
            'estudiante' => [
                'id' => (int)$estudiante['id'],
                'codigo' => $estudiante['codigo'],
                'nombre' => trim($estudiante['nombres'] . ' ' . $estudiante['apellidos']),
                'tutorActual' => $tutorActual
            ],
            'sesiones' => $sesiones,
            'totalSesiones' => count($sesiones)
        ];
        
        error_log("Respuesta exitosa con " . count($sesiones) . " sesiones");
        
        Response::success($response);
        exit;
        
    } catch (Exception $e) {
        error_log("ERROR en historial: " . $e->getMessage());
        Response::error('Error al obtener historial: ' . $e->getMessage(), 500);
        exit;
    }
}

error_log("ERROR: Acción no válida - " . ($action ?? 'NULL'));
Response::error('Acción no válida', 400);