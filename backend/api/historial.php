<?php
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    if ($decoded->rol !== 'Administrador') {
        Response::error('Acceso denegado. Solo administradores', 403);
    }
} catch (Exception $e) {
    Response::error('Token inválido: ' . $e->getMessage(), 401);
}

$db = new Database();
$conn = $db->getConnection();

// Obtener método y acción
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments = explode('/', trim($uri, '/'));

// Buscar estudiante
if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'buscar') {
    $busqueda = $_GET['busqueda'] ?? '';
    
    if (empty($busqueda)) {
        Response::error('Parámetro de búsqueda requerido', 400);
    }
    
    try {
        $sql = "SELECT u.ID_Usuario, u.Codigo, u.Nombre, u.Apellido, u.Email,
                       t.Nombre as TutorNombre, t.Apellido as TutorApellido
                FROM Usuario u
                LEFT JOIN asignacion a ON u.ID_Usuario = a.ID_Estudiante
                LEFT JOIN Usuario t ON a.ID_Tutor = t.ID_Usuario
                WHERE u.Rol = 'Estudiante' 
                AND (u.Codigo LIKE ? OR CONCAT(u.Nombre, ' ', u.Apellido) LIKE ?)
                LIMIT 10";
        
        $stmt = $conn->prepare($sql);
        $searchParam = "%{$busqueda}%";
        $stmt->bind_param("ss", $searchParam, $searchParam);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $estudiantes = [];
        while ($row = $result->fetch_assoc()) {
            $tutorActual = null;
            if ($row['TutorNombre']) {
                $tutorActual = $row['TutorNombre'] . ' ' . $row['TutorApellido'];
            }
            
            $estudiantes[] = [
                'id' => $row['ID_Usuario'],
                'codigo' => $row['Codigo'],
                'nombre' => $row['Nombre'] . ' ' . $row['Apellido'],
                'email' => $row['Email'],
                'tutorActual' => $tutorActual
            ];
        }
        
        Response::success($estudiantes);
        
    } catch (Exception $e) {
        Response::error('Error al buscar estudiante: ' . $e->getMessage(), 500);
    }
}

// Obtener historial completo de un estudiante
if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'historial') {
    $idEstudiante = $_GET['id_estudiante'] ?? null;
    
    if (!$idEstudiante) {
        Response::error('ID de estudiante requerido', 400);
    }
    
    try {
        // Obtener información del estudiante
        $sqlEstudiante = "SELECT u.ID_Usuario, u.Codigo, u.Nombre, u.Apellido,
                                 t.Nombre as TutorNombre, t.Apellido as TutorApellido
                          FROM Usuario u
                          LEFT JOIN asignacion a ON u.ID_Usuario = a.ID_Estudiante
                          LEFT JOIN Usuario t ON a.ID_Tutor = t.ID_Usuario
                          WHERE u.ID_Usuario = ? AND u.Rol = 'Estudiante'";
        
        $stmt = $conn->prepare($sqlEstudiante);
        $stmt->bind_param("i", $idEstudiante);
        $stmt->execute();
        $estudiante = $stmt->get_result()->fetch_assoc();
        
        if (!$estudiante) {
            Response::error('Estudiante no encontrado', 404);
        }
        
        // Obtener todas las sesiones del estudiante
        $sqlSesiones = "SELECT s.ID_Sesion, s.Fecha, s.Hora_Inicio, s.Hora_Fin,
                              s.Tema_Academico, s.Avance_Academico, s.Notas_Academicas,
                              s.Tema_Personal, s.Notas_Personales,
                              s.Tema_Profesional, s.Notas_Profesionales,
                              s.Asistencia, s.Fecha_Registro,
                              t.Nombre as TutorNombre, t.Apellido as TutorApellido
                       FROM sesion s
                       INNER JOIN Usuario t ON s.ID_Tutor = t.ID_Usuario
                       WHERE s.ID_Estudiante = ?
                       ORDER BY s.Fecha DESC, s.Hora_Inicio DESC";
        
        $stmt = $conn->prepare($sqlSesiones);
        $stmt->bind_param("i", $idEstudiante);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $sesiones = [];
        while ($row = $result->fetch_assoc()) {
            $sesiones[] = [
                'id' => $row['ID_Sesion'],
                'fecha' => $row['Fecha'],
                'horaInicio' => $row['Hora_Inicio'],
                'horaFin' => $row['Hora_Fin'],
                'academico' => [
                    'tema' => $row['Tema_Academico'],
                    'avance' => $row['Avance_Academico'],
                    'notas' => $row['Notas_Academicas']
                ],
                'personal' => [
                    'tema' => $row['Tema_Personal'],
                    'notas' => $row['Notas_Personales']
                ],
                'profesional' => [
                    'tema' => $row['Tema_Profesional'],
                    'notas' => $row['Notas_Profesionales']
                ],
                'asistencia' => $row['Asistencia'],
                'fechaRegistro' => $row['Fecha_Registro'],
                'tutor' => $row['TutorNombre'] . ' ' . $row['TutorApellido']
            ];
        }
        
        $response = [
            'estudiante' => [
                'id' => $estudiante['ID_Usuario'],
                'codigo' => $estudiante['Codigo'],
                'nombre' => $estudiante['Nombre'] . ' ' . $estudiante['Apellido'],
                'tutorActual' => $estudiante['TutorNombre'] ? 
                    $estudiante['TutorNombre'] . ' ' . $estudiante['TutorApellido'] : null
            ],
            'sesiones' => $sesiones,
            'totalSesiones' => count($sesiones)
        ];
        
        Response::success($response);
        
    } catch (Exception $e) {
        Response::error('Error al obtener historial: ' . $e->getMessage(), 500);
    }
}

Response::error('Acción no válida', 400);
