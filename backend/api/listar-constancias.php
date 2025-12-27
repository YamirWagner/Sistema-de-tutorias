<?php
/**
 * API: Listar Constancias - Sistema de Tutorías UNSAAC
 * Lista las constancias generadas según el rol del usuario
 */

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';

header('Content-Type: application/json');

try {
    // Verificar autenticación
    $token = JWT::getBearerToken();
    
    if (!$token) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }
    }
    
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Token no proporcionado']);
        exit;
    }
    
    $payload = JWT::decode($token);
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Control de actividad
    Activity::enforceAndTouch($db, $payload);
    
    // Verificar rol
    $role = strtolower($payload['role'] ?? '');
    $isAdmin = ($role === 'admin' || $role === 'administrador');
    $isTutor = ($role === 'tutor');
    $isEstudiante = ($role === 'estudiante');
    
    $userId = $payload['user_id'] ?? null;
    
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de usuario no encontrado en el token']);
        exit;
    }
    
    // Construir query según el rol
    if ($isAdmin) {
        // Admin puede ver todas las constancias
        $query = "SELECT c.*, 
                        t.nombres AS tutorNombres, t.apellidos AS tutorApellidos,
                        e.codigo AS estudianteCodigo, e.nombres AS estudianteNombres, e.apellidos AS estudianteApellidos,
                        s.nombre AS semestreNombre
                 FROM constancia c
                 INNER JOIN usuariosistema t ON c.idTutor = t.id
                 INNER JOIN estudiante e ON c.idEstudiante = e.id
                 INNER JOIN semestre s ON c.idSemestre = s.id
                 WHERE c.estado = 'Activo'
                 ORDER BY c.fechaGeneracion DESC";
        
        $stmt = $db->prepare($query);
        
    } elseif ($isTutor) {
        // Tutor solo ve sus constancias
        $query = "SELECT c.*, 
                        t.nombres AS tutorNombres, t.apellidos AS tutorApellidos,
                        e.codigo AS estudianteCodigo, e.nombres AS estudianteNombres, e.apellidos AS estudianteApellidos,
                        s.nombre AS semestreNombre
                 FROM constancia c
                 INNER JOIN usuariosistema t ON c.idTutor = t.id
                 INNER JOIN estudiante e ON c.idEstudiante = e.id
                 INNER JOIN semestre s ON c.idSemestre = s.id
                 WHERE c.idTutor = :tutor_id AND c.estado = 'Activo'
                 ORDER BY c.fechaGeneracion DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':tutor_id', $userId, PDO::PARAM_INT);
        
    } elseif ($isEstudiante) {
        // Estudiante solo ve sus constancias
        $query = "SELECT c.*, 
                        t.nombres AS tutorNombres, t.apellidos AS tutorApellidos,
                        e.codigo AS estudianteCodigo, e.nombres AS estudianteNombres, e.apellidos AS estudianteApellidos,
                        s.nombre AS semestreNombre
                 FROM constancia c
                 INNER JOIN usuariosistema t ON c.idTutor = t.id
                 INNER JOIN estudiante e ON c.idEstudiante = e.id
                 INNER JOIN semestre s ON c.idSemestre = s.id
                 WHERE c.idEstudiante = :estudiante_id AND c.estado = 'Activo'
                 ORDER BY c.fechaGeneracion DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':estudiante_id', $userId, PDO::PARAM_INT);
        
    } else {
        http_response_code(403);
        echo json_encode(['error' => 'Rol no autorizado para ver constancias']);
        exit;
    }
    
    $stmt->execute();
    $constancias = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Formatear respuesta
    $resultado = array_map(function($c) {
        return [
            'id' => (int)$c['id'],
            'tutor' => [
                'id' => (int)$c['idTutor'],
                'nombreCompleto' => trim($c['tutorNombres'] . ' ' . $c['tutorApellidos'])
            ],
            'estudiante' => [
                'id' => (int)$c['idEstudiante'],
                'codigo' => $c['estudianteCodigo'],
                'nombreCompleto' => trim($c['estudianteNombres'] . ' ' . $c['estudianteApellidos'])
            ],
            'semestre' => [
                'id' => (int)$c['idSemestre'],
                'nombre' => $c['semestreNombre']
            ],
            'fechaGeneracion' => $c['fechaGeneracion'],
            'rutaPDF' => $c['rutaPDF'],
            'firmado' => (bool)$c['firmado'],
            'fechaFirma' => $c['fechaFirma'],
            'estado' => $c['estado']
        ];
    }, $constancias);
    
    echo json_encode([
        'success' => true,
        'constancias' => $resultado,
        'total' => count($resultado)
    ]);
    
} catch (Exception $e) {
    error_log("[listar-constancias.php] ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Error interno del servidor',
        'message' => $e->getMessage()
    ]);
}
