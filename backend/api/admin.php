<?php
/**
 * admin.php - API del Administrador
 * Sistema de Tutorías UNSAAC
 * 
 * Endpoints disponibles:
 * - stats: Estadísticas generales
 * - users: Listar usuarios
 * - tutors: Listar tutores
 * - assignments: Asignaciones activas
 * - reports: Reportes
 * - createUser: Crear usuario (POST)
 * - toggleUser: Activar/Desactivar usuario (POST)
 * - semester_stats: Estadísticas del semestre
 * - update_semester: Actualizar semestre (POST)
 * - close_semester: Cerrar semestre (POST)
 */

require_once '../core/config.php';
require_once '../core/database.php';
require_once '../core/response.php';
require_once '../core/jwt.php';
require_once '../core/activity.php';

// ============= FUNCIONES HELPER =============

/**
 * Obtener input JSON del body
 */
function getJsonInput(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

/**
 * Validar método POST
 */
function requirePost(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Response::error('Método no permitido', 405);
    }
}

/**
 * Ejecutar query simple y retornar un valor
 */
function fetchColumn(PDO $db, string $query, array $params = []): mixed {
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    return $stmt->fetchColumn();
}

/**
 * Ejecutar query y retornar todos los resultados
 */
function fetchAll(PDO $db, string $query, array $params = []): array {
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Ejecutar query y retornar un registro
 */
function fetchOne(PDO $db, string $query, array $params = []): ?array {
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
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
    
    // Verificar rol admin
    if ($payload['role'] !== 'admin') {
        Response::forbidden('Acceso denegado');
    }
    
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        
        // ============= ESTADÍSTICAS =============
        case 'stats':
            $stats = [
                'totalSessions' => fetchColumn($db, "SELECT COUNT(*) FROM sessions"),
                'pendingSessions' => fetchColumn($db, "SELECT COUNT(*) FROM sessions WHERE status = 'pending'"),
                'completedSessions' => fetchColumn($db, "SELECT COUNT(*) FROM sessions WHERE status = 'completed'"),
                'totalUsers' => fetchColumn($db, "SELECT COUNT(*) FROM users WHERE active = 1"),
                'totalTutors' => fetchColumn($db, "SELECT COUNT(*) FROM users WHERE role = 'tutor' AND active = 1"),
                'totalStudents' => fetchColumn($db, "SELECT COUNT(*) FROM users WHERE role = 'student' AND active = 1"),
                'activeAssignments' => fetchColumn($db, "SELECT COUNT(DISTINCT tutor_id) FROM requests WHERE status = 'active'")
            ];
            Response::success($stats);
            break;
        
        // ============= USUARIOS =============
        case 'users':
            $role = $_GET['role'] ?? null;
            $query = "SELECT id, email, name, role, active, created_at FROM users";
            $params = [];
            
            if ($role && $role !== 'all') {
                $query .= " WHERE role = :role";
                $params[':role'] = $role;
            }
            $query .= " ORDER BY created_at DESC";
            
            Response::success(fetchAll($db, $query, $params));
            break;
        
        case 'tutors':
            Response::success(fetchAll($db, 
                "SELECT id, email, name, created_at FROM users WHERE role = 'tutor' AND active = 1"
            ));
            break;
        
        // ============= ASIGNACIONES =============
        case 'assignments':
            Response::success(fetchAll($db, "
                SELECT u.id as tutor_id, u.email as tutor_email, u.name as tutor_name,
                       COUNT(DISTINCT r.student_id) as student_count, MIN(r.created_at) as created_at
                FROM users u
                INNER JOIN requests r ON u.id = r.tutor_id
                WHERE u.role = 'tutor' AND r.status = 'active'
                GROUP BY u.id, u.email, u.name
                ORDER BY student_count DESC
            "));
            break;
        
        // ============= REPORTES =============
        case 'reports':
            Response::success(fetchAll($db, "
                SELECT r.*, u.name as tutor_name 
                FROM reports r 
                JOIN users u ON r.tutor_id = u.id 
                ORDER BY r.created_at DESC 
                LIMIT 50
            "));
            break;
        
        // ============= CREAR USUARIO =============
        case 'createUser':
            requirePost();
            $input = getJsonInput();
            
            // Validaciones
            if (empty($input['email']) || empty($input['name']) || empty($input['role'])) {
                Response::error('Datos incompletos');
            }
            
            $email = filter_var($input['email'], FILTER_VALIDATE_EMAIL);
            if (!$email) {
                Response::error('Email inválido');
            }
            
            $validRoles = ['admin', 'tutor', 'student', 'verifier'];
            if (!in_array($input['role'], $validRoles)) {
                Response::error('Rol inválido');
            }
            
            // Verificar email único
            if (fetchColumn($db, "SELECT id FROM users WHERE email = :email", [':email' => $email])) {
                Response::error('El email ya está registrado');
            }
            
            // Insertar
            $stmt = $db->prepare("INSERT INTO users (email, name, role, active, created_at) VALUES (:email, :name, :role, 1, NOW())");
            $stmt->execute([
                ':email' => $email,
                ':name' => trim($input['name']),
                ':role' => $input['role']
            ]);
            
            Response::success(['id' => $db->lastInsertId(), 'message' => 'Usuario creado exitosamente']);
            break;
        
        // ============= TOGGLE USUARIO =============
        case 'toggleUser':
            requirePost();
            $input = getJsonInput();
            
            if (!isset($input['userId'], $input['active'])) {
                Response::error('Datos incompletos');
            }
            
            $stmt = $db->prepare("UPDATE users SET active = :active WHERE id = :id");
            $stmt->execute([':active' => (int)$input['active'], ':id' => (int)$input['userId']]);
            
            Response::success(['message' => 'Estado actualizado']);
            break;
        
        // ============= ESTADÍSTICAS SEMESTRE =============
        case 'semester_stats':
            // Obtener semestre activo o más reciente
            $semester = fetchOne($db, "
                SELECT id, nombre as name, fechaInicio as startDate, fechaFin as endDate, 
                       LOWER(estado) as status 
                FROM semestre 
                WHERE estado = 'Activo' 
                LIMIT 1
            ") ?? fetchOne($db, "
                SELECT id, nombre as name, fechaInicio as startDate, fechaFin as endDate, 
                       LOWER(estado) as status 
                FROM semestre 
                ORDER BY id DESC 
                LIMIT 1
            ");
            
            $semesterId = $semester['id'] ?? 0;
            
            // Estadísticas
            $totalStudents = (int)fetchColumn($db, "SELECT COUNT(*) FROM estudiante WHERE estado = 'Activo'");
            $assignedStudents = (int)fetchColumn($db, 
                "SELECT COUNT(DISTINCT idEstudiante) FROM asignaciontutor WHERE idSemestre = :id AND estado = 'Activa'",
                [':id' => $semesterId]
            );
            $totalTutors = (int)fetchColumn($db, "SELECT COUNT(*) FROM usuariosistema WHERE rol = 'Tutor' AND estado = 'Activo'");
            
            // Sesiones
            $sessions = fetchOne($db, "
                SELECT COUNT(*) as total, SUM(CASE WHEN estado = 'Completada' THEN 1 ELSE 0 END) as completed
                FROM cronograma WHERE idSemestre = :id
            ", [':id' => $semesterId]) ?? ['total' => 0, 'completed' => 0];
            
            // Días restantes
            $daysRemaining = 0;
            if (!empty($semester['endDate'])) {
                $diff = (new DateTime($semester['endDate']))->diff(new DateTime());
                $daysRemaining = $diff->invert ? $diff->days : 0;
            }
            
            // Carga de trabajo por tutor
            $tutorWorkload = fetchAll($db, "
                SELECT u.id,
                       CONCAT(SUBSTRING(u.nombres, 1, 1), '. ', u.apellidos) as name,
                       CONCAT(SUBSTRING(u.nombres, 1, 1), '.\\n', SUBSTRING(u.apellidos, 1, 6)) as shortName,
                       COUNT(a.idEstudiante) as students,
                       10 as max
                FROM usuariosistema u
                LEFT JOIN asignaciontutor a ON u.id = a.idTutor AND a.idSemestre = :id AND a.estado = 'Activa'
                WHERE u.rol = 'Tutor' AND u.estado = 'Activo'
                GROUP BY u.id, u.nombres, u.apellidos
                ORDER BY students DESC
                LIMIT 10
            ", [':id' => $semesterId]);
            
            // Convertir a int
            foreach ($tutorWorkload as &$t) {
                $t['students'] = (int)$t['students'];
                $t['max'] = (int)$t['max'];
            }
            
            Response::success([
                'semester' => $semester ?? ['id' => null, 'name' => 'Sin semestre', 'status' => 'inactive'],
                'stats' => [
                    'totalStudents' => $totalStudents,
                    'assignedStudents' => $assignedStudents,
                    'unassignedStudents' => $totalStudents - $assignedStudents,
                    'totalTutors' => $totalTutors,
                    'sessionsScheduled' => (int)$sessions['total'],
                    'sessionsCompleted' => (int)$sessions['completed'],
                    'daysRemaining' => $daysRemaining
                ],
                'tutorWorkload' => $tutorWorkload
            ]);
            break;
        
        // ============= ACTUALIZAR SEMESTRE =============
        case 'update_semester':
            requirePost();
            $input = getJsonInput();
            
            $id = $input['id'] ?? null;
            $name = trim($input['name'] ?? '');
            $startDate = $input['startDate'] ?? null;
            $endDate = $input['endDate'] ?? null;
            $status = $input['status'] ?? 'active';
            
            if (!$name || !$startDate || !$endDate) {
                Response::error('Datos incompletos');
            }
            
            $statusMap = ['active' => 'Activo', 'inactive' => 'Inactivo', 'closed' => 'Cerrado'];
            $dbStatus = $statusMap[$status] ?? 'Activo';
            
            $params = [':name' => $name, ':start' => $startDate, ':end' => $endDate, ':status' => $dbStatus];
            
            if ($id) {
                $params[':id'] = $id;
                $stmt = $db->prepare("UPDATE semestre SET nombre = :name, fechaInicio = :start, fechaFin = :end, estado = :status WHERE id = :id");
            } else {
                $stmt = $db->prepare("INSERT INTO semestre (nombre, fechaInicio, fechaFin, estado) VALUES (:name, :start, :end, :status)");
            }
            
            $stmt->execute($params);
            
            // Si activo, desactivar otros
            if ($dbStatus === 'Activo') {
                $newId = $id ?: $db->lastInsertId();
                $db->prepare("UPDATE semestre SET estado = 'Cerrado' WHERE id != :id AND estado = 'Activo'")
                   ->execute([':id' => $newId]);
            }
            
            Response::success(['message' => 'Semestre actualizado']);
            break;
        
        // ============= CERRAR SEMESTRE =============
        case 'close_semester':
            requirePost();
            $input = getJsonInput();
            $semesterId = $input['semesterId'] ?? null;
            
            if (!$semesterId) {
                Response::error('ID de semestre requerido');
            }
            
            $db->beginTransaction();
            try {
                // Cerrar semestre
                $db->prepare("UPDATE semestre SET estado = 'Cerrado' WHERE id = :id")
                   ->execute([':id' => $semesterId]);
                
                // Desactivar asignaciones
                $db->prepare("UPDATE asignaciontutor SET estado = 'Inactiva' WHERE idSemestre = :id")
                   ->execute([':id' => $semesterId]);
                
                // Cancelar sesiones pendientes
                $db->prepare("UPDATE cronograma SET estado = 'Cancelada' WHERE idSemestre = :id AND estado = 'Programada'")
                   ->execute([':id' => $semesterId]);
                
                $db->commit();
                Response::success(['message' => 'Semestre cerrado']);
                
            } catch (Exception $e) {
                $db->rollBack();
                throw $e;
            }
            break;
        
        // ============= GESTIÓN DE SEMESTRE =============
        
        case 'cronograma_events':
            $semestre = fetchOne($db, "SELECT * FROM semestre WHERE estado = 'Activo' LIMIT 1");
            
            if (!$semestre) {
                Response::error('No hay semestre activo');
            }
            
            $endDate = new DateTime($semestre['fechaFin']);
            $today = new DateTime();
            $interval = $today->diff($endDate);
            $daysRemaining = $interval->invert ? 0 : $interval->days;
            
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
        
        case 'semester_list':
            $semesters = fetchAll($db, "SELECT * FROM semestre ORDER BY fechaInicio DESC");
            Response::success($semesters);
            break;
        
        case 'update_semester':
            requirePost();
            $input = getJsonInput();
            
            $required = ['id', 'nombre', 'fechaInicio', 'fechaFin', 'estado'];
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    Response::error("Campo requerido: $field");
                }
            }
            
            if (!in_array($input['estado'], ['Activo', 'Cerrado'])) {
                Response::error('Estado inválido');
            }
            
            $stmt = $db->prepare("
                UPDATE semestre 
                SET nombre = ?, fechaInicio = ?, fechaFin = ?, estado = ? 
                WHERE id = ?
            ");
            
            $stmt->execute([
                $input['nombre'],
                $input['fechaInicio'],
                $input['fechaFin'],
                $input['estado'],
                $input['id']
            ]);
            
            if ($stmt->rowCount() > 0) {
                logActivity($db, $userId, 'update', 'semestre', $input['id']);
                Response::success(['message' => 'Semestre actualizado']);
            } else {
                Response::error('No se actualizó ningún registro');
            }
            break;
        
        default:
            Response::error('Acción no válida', 400);
    }
    
} catch (Exception $e) {
    error_log("Error en admin.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor');
}
