<?php
// student.php - Endpoints del Estudiante

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

try {
    // Activar logging de errores temporalmente
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
    error_log("=== student.php iniciado ===");
    
    // Verificar autenticación
    $token = JWT::getBearerToken();
    error_log("Token obtenido: " . ($token ? "SI" : "NO"));
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
    }
    
    $payload = JWT::decode($token);
    error_log("Payload decodificado - user_id: " . ($payload['user_id'] ?? 'N/A') . ", role: " . ($payload['role'] ?? 'N/A'));
    
    // Verificar rol de estudiante
    if ($payload['role'] !== 'student') {
        error_log("Rol incorrecto: " . $payload['role']);
        Response::forbidden('Acceso denegado');
    }
    
    $userId = $payload['user_id'];
    error_log("User ID: $userId");
    
    // Obtener acción
    $action = $_GET['action'] ?? '';
    error_log("Action: $action");
    
    $database = new Database();
    $db = $database->getConnection();
    error_log("Conexión a BD establecida");
    
    switch ($action) {
        case 'myTutor':
            error_log("=== Ejecutando myTutor ===");
            // Obtener tutor asignado al estudiante
            $query = "SELECT 
                        u.id,
                        u.nombres,
                        u.apellidos,
                        CONCAT(u.nombres, ' ', u.apellidos) as nombre,
                        u.correo as email,
                        u.especialidad,
                        a.fechaAsignacion,
                        a.estado as estadoAsignacion
                      FROM asignaciontutor a
                      INNER JOIN usuariosistema u ON a.idTutor = u.id
                      WHERE a.idEstudiante = :student_id 
                      AND a.estado = 'Activa'
                      ORDER BY a.fechaAsignacion DESC
                      LIMIT 1";
            
            error_log("Query preparada");
            $stmt = $db->prepare($query);
            $stmt->bindParam(':student_id', $userId, PDO::PARAM_INT);
            error_log("Ejecutando query con student_id: $userId");
            $stmt->execute();
            $tutor = $stmt->fetch(PDO::FETCH_ASSOC);
            error_log("Resultado: " . ($tutor ? json_encode($tutor) : "NULL"));
            
            if ($tutor) {
                Response::success($tutor);
            } else {
                Response::success(null, 'No tienes tutor asignado');
            }
            break;
            
        case 'stats':
            error_log("=== Ejecutando stats ===");
            
            // Obtener ID de asignación activa
            $queryAsignacion = "SELECT id FROM asignaciontutor 
                               WHERE idEstudiante = :student_id 
                               AND estado = 'Activa' 
                               LIMIT 1";
            $stmtAsignacion = $db->prepare($queryAsignacion);
            $stmtAsignacion->bindParam(':student_id', $userId, PDO::PARAM_INT);
            $stmtAsignacion->execute();
            $asignacion = $stmtAsignacion->fetch(PDO::FETCH_ASSOC);
            
            if (!$asignacion) {
                Response::success([
                    'sesionesCompletadas' => 0,
                    'porcentajeAvance' => 0,
                    'horasTotales' => 0,
                    'proximaSesion' => null
                ], 'No tienes asignación activa');
                break;
            }
            
            $idAsignacion = $asignacion['id'];
            
            // 1. Contar sesiones completadas (Realizada)
            $querySesiones = "SELECT COUNT(*) as total FROM tutoria 
                            WHERE idAsignacion = :id_asignacion 
                            AND estado = 'Realizada'";
            $stmtSesiones = $db->prepare($querySesiones);
            $stmtSesiones->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
            $stmtSesiones->execute();
            $resultSesiones = $stmtSesiones->fetch(PDO::FETCH_ASSOC);
            $sesionesCompletadas = (int)$resultSesiones['total'];
            
            // 2. Calcular porcentaje (100% = 3 sesiones)
            $porcentajeAvance = round(($sesionesCompletadas / 3) * 100, 2);
            
            // 3. Calcular horas totales acumuladas
            $queryHoras = "SELECT horaInicio, horaFin FROM tutoria 
                          WHERE idAsignacion = :id_asignacion 
                          AND estado = 'Realizada'
                          AND horaInicio IS NOT NULL 
                          AND horaFin IS NOT NULL";
            $stmtHoras = $db->prepare($queryHoras);
            $stmtHoras->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
            $stmtHoras->execute();
            $sesiones = $stmtHoras->fetchAll(PDO::FETCH_ASSOC);
            
            $horasTotales = 0;
            foreach ($sesiones as $sesion) {
                $inicio = new DateTime($sesion['horaInicio']);
                $fin = new DateTime($sesion['horaFin']);
                $diferencia = $inicio->diff($fin);
                $horasTotales += $diferencia->h + ($diferencia->i / 60);
            }
            $horasTotales = round($horasTotales, 2);
            
            // 4. Obtener próxima sesión programada
            $queryProxima = "SELECT fecha, horaInicio, horaFin, tipo, modalidad 
                            FROM tutoria 
                            WHERE idAsignacion = :id_asignacion 
                            AND fecha >= CURDATE()
                            AND estado IN ('Programada', 'Pendiente')
                            ORDER BY fecha ASC, horaInicio ASC
                            LIMIT 1";
            $stmtProxima = $db->prepare($queryProxima);
            $stmtProxima->bindParam(':id_asignacion', $idAsignacion, PDO::PARAM_INT);
            $stmtProxima->execute();
            $proximaSesion = $stmtProxima->fetch(PDO::FETCH_ASSOC);
            
            Response::success([
                'sesionesCompletadas' => $sesionesCompletadas,
                'porcentajeAvance' => $porcentajeAvance,
                'horasTotales' => $horasTotales,
                'proximaSesion' => $proximaSesion ?: null
            ]);
            break;
            
        default:
            Response::error('Acción no válida');
    }
    
} catch (Exception $e) {
    error_log("=== ERROR EN student.php ===");
    error_log("Mensaje: " . $e->getMessage());
    error_log("Archivo: " . $e->getFile());
    error_log("Línea: " . $e->getLine());
    error_log("Trace: " . $e->getTraceAsString());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error en el servidor: ' . $e->getMessage());
}
