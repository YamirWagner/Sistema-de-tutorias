<?php
// ============================================
// API ADMINISTRADORES - Verificador
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
$action = $_GET['action'] ?? 'lista';

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
        case 'lista':
            getAdministradores($conn);
            break;
        
        case 'detalle':
            getDetalleAdministrador($conn);
            break;
        
        default:
            sendResponse(false, null, 'Acción no válida', 400);
    }
} catch (Exception $e) {
    error_log("Error en administradores API: " . $e->getMessage());
    sendResponse(false, null, 'Error en el servidor: ' . $e->getMessage(), 500);
}

// ============================================
// FUNCIONES
// ============================================

/**
 * Obtener lista de administradores
 */
function getAdministradores($conn) {
    try {
        $query = "SELECT 
            u.id,
            u.dni as codigo,
            CONCAT(u.nombres, ' ', u.apellidos) as nombre,
            u.correo,
            u.estado,
            lh.created_at as ultimo_acceso
            FROM usuariosistema u
            LEFT JOIN (
                SELECT correo, MAX(created_at) as created_at
                FROM login_history
                GROUP BY correo
            ) lh ON u.correo = lh.correo
            WHERE u.rol = 'Administrador'
            ORDER BY u.nombres, u.apellidos";
        
        $stmt = $conn->query($query);
        $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular estadísticas
        $total = count($admins);
        $activos = count(array_filter($admins, fn($a) => $a['estado'] === 'Activo'));
        
        // Obtener el último acceso más reciente
        $ultimoAccesoTimestamp = null;
        foreach ($admins as $admin) {
            if ($admin['ultimo_acceso']) {
                $timestamp = strtotime($admin['ultimo_acceso']);
                if ($ultimoAccesoTimestamp === null || $timestamp > $ultimoAccesoTimestamp) {
                    $ultimoAccesoTimestamp = $timestamp;
                }
            }
        }
        
        $ultimoAcceso = $ultimoAccesoTimestamp 
            ? date('d/m/Y H:i', $ultimoAccesoTimestamp)
            : 'Nunca';
        
        // Formatear datos
        foreach ($admins as &$admin) {
            $admin['estado'] = $admin['estado'] === 'Activo' ? 'activo' : 'inactivo';
            $admin['ultimo_acceso'] = $admin['ultimo_acceso'] 
                ? date('d/m/Y H:i', strtotime($admin['ultimo_acceso']))
                : 'Nunca';
        }
        
        sendResponse(true, [
            'total' => $total,
            'activos' => $activos,
            'ultimoAcceso' => $ultimoAcceso,
            'administradores' => $admins
        ]);
    } catch (Exception $e) {
        error_log("Error al obtener administradores: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener administradores: ' . $e->getMessage(), 500);
    }
}

/**
 * Obtener detalle de un administrador específico
 */
function getDetalleAdministrador($conn) {
    try {
        $adminId = $_GET['admin_id'] ?? '';
        
        if (empty($adminId)) {
            sendResponse(false, null, 'ID de administrador requerido', 400);
        }
        
        $query = "SELECT 
            u.id,
            u.dni as codigo,
            CONCAT(u.nombres, ' ', u.apellidos) as nombre,
            u.correo,
            u.estado,
            u.created_at as fecha_creacion,
            lh.created_at as ultimo_acceso,
            COUNT(DISTINCT lh2.id) as total_accesos
            FROM usuariosistema u
            LEFT JOIN (
                SELECT correo, MAX(created_at) as created_at
                FROM login_history
                GROUP BY correo
            ) lh ON u.correo = lh.correo
            LEFT JOIN login_history lh2 ON u.correo = lh2.correo
            WHERE u.id = :admin_id AND u.rol = 'Administrador'
            GROUP BY u.id";
        
        $stmt = $conn->prepare($query);
        $stmt->bindValue(':admin_id', $adminId);
        $stmt->execute();
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$admin) {
            sendResponse(false, null, 'Administrador no encontrado', 404);
        }
        
        // Formatear datos
        $admin['estado'] = $admin['estado'] === 'Activo' ? 'activo' : 'inactivo';
        $admin['fecha_creacion'] = date('d/m/Y', strtotime($admin['fecha_creacion']));
        $admin['ultimo_acceso'] = $admin['ultimo_acceso'] 
            ? date('d/m/Y H:i', strtotime($admin['ultimo_acceso']))
            : 'Nunca';
        
        sendResponse(true, $admin);
    } catch (Exception $e) {
        error_log("Error al obtener detalle de administrador: " . $e->getMessage());
        sendResponse(false, null, 'Error al obtener detalle: ' . $e->getMessage(), 500);
    }
}
