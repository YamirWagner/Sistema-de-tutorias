<?php
/**
 * API: Firmar Constancia - Sistema de Tutorías UNSAAC
 * Permite al tutor firmar digitalmente una constancia generada
 */

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';

header('Content-Type: application/json');

try {
    // Verificar que sea método POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        exit;
    }
    
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
    
    // Verificar rol de tutor o administrador
    $role = strtolower($payload['role'] ?? '');
    $isAdmin = ($role === 'admin' || $role === 'administrador');
    $isTutor = ($role === 'tutor');
    
    if (!$isTutor && !$isAdmin) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado', 'message' => 'Solo tutores y administradores pueden firmar constancias']);
        exit;
    }
    
    $userId = $payload['user_id'] ?? null;
    
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de usuario no encontrado en el token']);
        exit;
    }
    
    // Obtener datos del POST
    $data = json_decode(file_get_contents('php://input'), true);
    $constanciaId = $data['constanciaId'] ?? null;
    
    if (!$constanciaId) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de constancia no proporcionado']);
        exit;
    }
    
    // Verificar que la constancia existe y pertenece al tutor (si no es admin)
    if ($isAdmin) {
        $query = "SELECT id, idTutor, firmado FROM constancia WHERE id = :constancia_id AND estado = 'Activo'";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':constancia_id', $constanciaId, PDO::PARAM_INT);
    } else {
        $query = "SELECT id, idTutor, firmado FROM constancia WHERE id = :constancia_id AND idTutor = :tutor_id AND estado = 'Activo'";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':constancia_id', $constanciaId, PDO::PARAM_INT);
        $stmt->bindParam(':tutor_id', $userId, PDO::PARAM_INT);
    }
    
    $stmt->execute();
    $constancia = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$constancia) {
        http_response_code(404);
        echo json_encode(['error' => 'Constancia no encontrada o no autorizada']);
        exit;
    }
    
    // Verificar si ya está firmada
    if ($constancia['firmado']) {
        http_response_code(400);
        echo json_encode(['error' => 'La constancia ya está firmada']);
        exit;
    }
    
    // Firmar constancia
    $queryUpdate = "UPDATE constancia 
                   SET firmado = 1, 
                       fechaFirma = NOW(),
                       updated_at = NOW()
                   WHERE id = :constancia_id";
    
    $stmtUpdate = $db->prepare($queryUpdate);
    $stmtUpdate->bindParam(':constancia_id', $constanciaId, PDO::PARAM_INT);
    
    if ($stmtUpdate->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Constancia firmada exitosamente',
            'constanciaId' => $constanciaId,
            'fechaFirma' => date('Y-m-d H:i:s')
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al firmar la constancia']);
    }
    
} catch (Exception $e) {
    error_log("[firmar-constancia.php] ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Error interno del servidor',
        'message' => $e->getMessage()
    ]);
}
