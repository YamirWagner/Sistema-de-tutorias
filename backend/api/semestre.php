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
    
    if (!in_array($data['estado'], ['Activo', 'Cerrado', 'Programado', 'Finalizado'])) {
        Response::error('Estado inválido. Debe ser "Activo", "Programado" o "Finalizado"', 400);
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
    // Autenticación
    $token = JWT::getBearerToken();
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
    }
    
    $payload = JWT::decode($token);
    
    // Conexión a BD
    $db = (new Database())->getConnection();
    
    // Control de actividad
    Activity::enforceAndTouch($db, $payload);
    
    $userId = $payload['id'];
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        
        // ============= OBTENER SEMESTRE ACTIVO =============
        case 'current':
            $semestre = fetchOne($db, "SELECT * FROM semestre WHERE estado = 'Activo' LIMIT 1");
            
            if (!$semestre) {
                Response::success([
                    'semester' => [
                        'id' => null,
                        'nombre' => 'No hay semestre activo',
                        'name' => 'No hay semestre activo',
                        'startDate' => null,
                        'endDate' => null,
                        'status' => null,
                        'daysRemaining' => 0
                    ]
                ]);
            }
            
            $daysRemaining = calculateDaysRemaining($semestre['fechaFin']);
            
            Response::success([
                'semester' => [
                    'id' => (int)$semestre['id'],
                    'nombre' => $semestre['nombre'],
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
            // Verificar rol admin
            if ($payload['role'] !== 'admin') {
                Response::forbidden('Acceso denegado');
            }
            
            $semestres = fetchAll($db, "SELECT * FROM semestre ORDER BY fechaInicio DESC");
            Response::success($semestres, 'Semestres obtenidos exitosamente');
            break;
        
        // ============= CREAR SEMESTRE =============
        case 'create':
            requirePost();
            
            // Verificar rol admin
            if ($payload['role'] !== 'admin') {
                Response::forbidden('Acceso denegado');
            }
            
            $input = getJsonInput();
            
            validateSemesterData($input);
            
            // Si el nuevo semestre es activo, cerrar el anterior
            if ($input['estado'] === 'Activo') {
                $stmt = $db->prepare("UPDATE semestre SET estado = 'Finalizado' WHERE estado = 'Activo'");
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
            
            // Verificar rol admin
            if ($payload['role'] !== 'admin') {
                Response::forbidden('Acceso denegado');
            }
            
            $input = getJsonInput();
            
            validateSemesterData($input, true);
            
            // Verificar que el semestre existe
            $existing = fetchOne($db, "SELECT * FROM semestre WHERE id = ?", [$input['id']]);
            
            if (!$existing) {
                Response::error('Semestre no encontrado', 404);
            }
            
            // Si se cambia a activo, cerrar otros semestres activos
            if ($input['estado'] === 'Activo' && $existing['estado'] !== 'Activo') {
                $stmt = $db->prepare("UPDATE semestre SET estado = 'Finalizado' WHERE estado = 'Activo' AND id != ?");
                $stmt->execute([$input['id']]);
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
            
            // Verificar rol admin
            if ($payload['role'] !== 'admin') {
                Response::forbidden('Acceso denegado');
            }
            
            $input = getJsonInput();
            
            $semesterId = $input['id'] ?? null;
            if (!$semesterId) {
                Response::error('ID de semestre requerido', 400);
            }
            
            $stmt = $db->prepare("UPDATE semestre SET estado = 'Finalizado' WHERE id = ?");
            $result = $stmt->execute([$semesterId]);
            
            if (!$result || $stmt->rowCount() === 0) {
                Response::error('No se pudo finalizar el semestre', 400);
            }
            
            Response::success([
                'message' => 'Semestre finalizado exitosamente'
            ]);
            break;
        
        default:
            Response::error('Acción no válida', 400);
    }
    
} catch (PDOException $e) {
    Response::serverError('Error en la base de datos');
} catch (Exception $e) {
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor');
}
