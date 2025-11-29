<?php
/**
 * semestre.php - API de Gestión de Semestres
 * Sistema de Tutorías UNSAAC
 * 
 * Endpoints:
 * - GET ?action=current - Obtener semestre activo
 * - GET ?action=list - Listar todos los semestres
 * - POST ?action=update - Actualizar semestre
 * - POST ?action=create - Crear nuevo semestre
 * - POST ?action=close - Cerrar semestre activo
 */

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';

// ============= FUNCIONES HELPER =============

function fetchColumn(PDO $db, string $query, array $params = []): mixed {
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    return $stmt->fetchColumn();
}

function fetchAll(PDO $db, string $query, array $params = []): array {
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function fetchOne(PDO $db, string $query, array $params = []): ?array {
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function getJsonInput(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function requirePost(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Response::error('Método no permitido', 405);
    }
}

function validateSemesterData(array $data, bool $requireId = false): void {
    $required = ['nombre', 'fechaInicio', 'fechaFin', 'estado'];
    if ($requireId) {
        $required[] = 'id';
    }
    
    foreach ($required as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            Response::error("Campo requerido: $field", 400);
        }
    }
    
    if (!in_array($data['estado'], ['Activo', 'Cerrado'])) {
        Response::error('Estado inválido. Debe ser "Activo" o "Cerrado"', 400);
    }
    
    // Validar fechas
    $inicio = DateTime::createFromFormat('Y-m-d', $data['fechaInicio']);
    $fin = DateTime::createFromFormat('Y-m-d', $data['fechaFin']);
    
    if (!$inicio || !$fin) {
        Response::error('Formato de fecha inválido. Use YYYY-MM-DD', 400);
    }
    
    if ($fin <= $inicio) {
        Response::error('La fecha de fin debe ser posterior a la fecha de inicio', 400);
    }
}

function calculateDaysRemaining(string $endDate): int {
    try {
        $end = new DateTime($endDate);
        $today = new DateTime();
        $today->setTime(0, 0, 0);
        $end->setTime(0, 0, 0);
        
        $interval = $today->diff($end);
        return $interval->invert ? 0 : (int)$interval->days;
    } catch (Exception $e) {
        return 0;
    }
}

// ============= LÓGICA PRINCIPAL =============

try {
    error_log("=== SEMESTRE.PHP: Inicio ===");
    
    // Autenticación
    $token = JWT::getBearerToken();
    error_log("Token obtenido: " . ($token ? 'SI' : 'NO'));
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
    }
    
    $payload = JWT::decode($token);
    error_log("Payload decodificado - Role: " . ($payload['role'] ?? 'NO DEFINIDO'));
    
    // Conexión a BD
    $db = (new Database())->getConnection();
    error_log("Conexión BD: OK");
    
    // Control de actividad
    Activity::enforceAndTouch($db, $payload);
    error_log("Activity check: OK");
    
    // Verificar rol admin
    if ($payload['role'] !== 'admin') {
        error_log("Rol rechazado: " . $payload['role']);
        Response::forbidden('Acceso denegado');
    }
    
    $userId = $payload['id'];
    $action = $_GET['action'] ?? '';
    error_log("Action solicitada: " . $action);
    
    switch ($action) {
        
        // ============= OBTENER SEMESTRE ACTIVO =============
        case 'current':
            $semestre = fetchOne($db, "SELECT * FROM semestre WHERE estado = 'Activo' LIMIT 1");
            
            if (!$semestre) {
                Response::error('No hay semestre activo', 404);
            }
            
            $daysRemaining = calculateDaysRemaining($semestre['fechaFin']);
            
            Response::success([
                'semester' => [
                    'id' => (int)$semestre['id'],
                    'name' => $semestre['nombre'],
                    'startDate' => $semestre['fechaInicio'],
                    'endDate' => $semestre['fechaFin'],
                    'status' => $semestre['estado'],
                    'daysRemaining' => $daysRemaining
                ]
            ]);
            break;
        
        // ============= LISTAR SEMESTRES =============
        case 'list':
            $semestres = fetchAll($db, "SELECT * FROM semestre ORDER BY fechaInicio DESC");
            Response::success($semestres);
            break;
        
        // ============= CREAR SEMESTRE =============
        case 'create':
            requirePost();
            $input = getJsonInput();
            
            validateSemesterData($input);
            
            // Si el nuevo semestre es activo, cerrar el anterior
            if ($input['estado'] === 'Activo') {
                $stmt = $db->prepare("UPDATE semestre SET estado = 'Cerrado' WHERE estado = 'Activo'");
                $stmt->execute();
            }
            
            $stmt = $db->prepare("
                INSERT INTO semestre (nombre, fechaInicio, fechaFin, estado) 
                VALUES (?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $input['nombre'],
                $input['fechaInicio'],
                $input['fechaFin'],
                $input['estado']
            ]);
            
            $newId = $db->lastInsertId();
            
            Response::success([
                'message' => 'Semestre creado exitosamente',
                'id' => $newId
            ], 201);
            break;
        
        // ============= ACTUALIZAR SEMESTRE =============
        case 'update':
            requirePost();
            $input = getJsonInput();
            
            error_log("UPDATE SEMESTRE - Input recibido: " . json_encode($input));
            
            validateSemesterData($input, true);
            
            // Verificar que el semestre existe
            $existing = fetchOne($db, "SELECT * FROM semestre WHERE id = ?", [$input['id']]);
            
            if (!$existing) {
                error_log("UPDATE SEMESTRE - No encontrado ID: " . $input['id']);
                Response::error('Semestre no encontrado', 404);
            }
            
            error_log("UPDATE SEMESTRE - Semestre encontrado: " . json_encode($existing));
            
            // Si se cambia a activo, cerrar otros semestres activos
            if ($input['estado'] === 'Activo' && $existing['estado'] !== 'Activo') {
                $stmt = $db->prepare("UPDATE semestre SET estado = 'Cerrado' WHERE estado = 'Activo' AND id != ?");
                $stmt->execute([$input['id']]);
                error_log("UPDATE SEMESTRE - Cerrados otros semestres activos");
            }
            
            $stmt = $db->prepare("
                UPDATE semestre 
                SET nombre = ?, fechaInicio = ?, fechaFin = ?, estado = ? 
                WHERE id = ?
            ");
            
            $result = $stmt->execute([
                $input['nombre'],
                $input['fechaInicio'],
                $input['fechaFin'],
                $input['estado'],
                $input['id']
            ]);
            
            error_log("UPDATE SEMESTRE - Resultado: " . ($result ? 'SUCCESS' : 'FAIL') . " - Rows affected: " . $stmt->rowCount());
            
            if (!$result) {
                Response::serverError('Error al actualizar semestre');
            }
            
            Response::success([
                'message' => 'Semestre actualizado exitosamente'
            ]);
            break;
        
        // ============= CERRAR SEMESTRE ACTIVO =============
        case 'close':
            requirePost();
            $input = getJsonInput();
            
            $semesterId = $input['id'] ?? null;
            if (!$semesterId) {
                Response::error('ID de semestre requerido', 400);
            }
            
            $stmt = $db->prepare("UPDATE semestre SET estado = 'Cerrado' WHERE id = ?");
            $result = $stmt->execute([$semesterId]);
            
            if (!$result || $stmt->rowCount() === 0) {
                Response::error('No se pudo cerrar el semestre', 400);
            }
            
            Response::success([
                'message' => 'Semestre cerrado exitosamente'
            ]);
            break;
        
        default:
            Response::error('Acción no válida', 400);
    }
    
} catch (PDOException $e) {
    error_log("Error de BD en semestre.php: " . $e->getMessage());
    Response::serverError('Error en la base de datos');
} catch (Exception $e) {
    error_log("Error en semestre.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor');
}
