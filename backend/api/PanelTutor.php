<?php
// PanelTutor.php - API para el panel de inicio del tutor

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';

// Activar reporte de errores para depuración
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // Verificar autenticación
    $token = JWT::getBearerToken();
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
    }
    
    $payload = JWT::decode($token);
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Control de actividad (cierre por inactividad + touch)
    Activity::enforceAndTouch($db, $payload);
    
    // Verificar rol de tutor
    if ($payload['role'] !== 'tutor') {
        Response::forbidden('Acceso denegado - Solo tutores');
    }
    
    // Obtener ID del tutor desde el token
    $tutorId = $payload['user_id'] ?? null;
    
    if (!$tutorId) {
        error_log("PanelTutor - Payload completo: " . json_encode($payload));
        Response::error('ID de tutor no encontrado en el token. Payload: ' . json_encode($payload));
    }
    
    // Obtener acción
    $action = $_GET['action'] ?? 'dashboard';
    
    switch ($action) {
        case 'dashboard':
            // Obtener todos los datos del panel del tutor
            
            // 1. Información del tutor
            $queryTutor = "SELECT nombres, apellidos, especialidad, correo 
                          FROM usuariosistema 
                          WHERE id = :tutor_id AND rol = 'Tutor' AND estado = 'Activo'";
            $stmtTutor = $db->prepare($queryTutor);
            $stmtTutor->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
            $stmtTutor->execute();
            $tutor = $stmtTutor->fetch(PDO::FETCH_ASSOC);
            
            if (!$tutor) {
                Response::error('Tutor no encontrado o inactivo');
            }
            
            // 2. Obtener semestre activo
            $querySemestre = "SELECT id, nombre, fechaInicio, fechaFin, estado 
                             FROM semestre 
                             WHERE estado = 'Activo' 
                             ORDER BY fechaInicio DESC 
                             LIMIT 1";
            $stmtSemestre = $db->prepare($querySemestre);
            $stmtSemestre->execute();
            $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
            
            if (!$semestre) {
                // Si no hay semestre activo, devolver datos vacíos
                $semestre = [
                    'id' => null,
                    'nombre' => 'Sin semestre activo',
                    'estado' => 'N/A',
                    'fechaInicio' => null,
                    'fechaFin' => null
                ];
            }
            
            // 3. Contar estudiantes asignados al tutor en el semestre activo
            $totalEstudiantes = 0;
            if ($semestre['id']) {
                $queryEstudiantes = "SELECT COUNT(DISTINCT idEstudiante) as total 
                                    FROM asignaciontutor 
                                    WHERE idTutor = :tutor_id 
                                    AND idSemestre = :semestre_id 
                                    AND estado = 'Activa'";
                $stmtEstudiantes = $db->prepare($queryEstudiantes);
                $stmtEstudiantes->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
                $stmtEstudiantes->bindParam(':semestre_id', $semestre['id'], PDO::PARAM_INT);
                $stmtEstudiantes->execute();
                $totalEstudiantes = (int)$stmtEstudiantes->fetchColumn();
                
                error_log("PanelTutor - Estudiantes asignados: " . $totalEstudiantes . " (Tutor ID: $tutorId, Semestre ID: {$semestre['id']})");
            }
            
            // 4. Contar sesiones programadas en el mes actual
            $mesActual = date('Y-m');
            $sesionesMesActual = 0;
            
            if ($semestre['id']) {
                // Obtener cronogramas del mes actual del semestre activo
                $querySesionesMes = "SELECT COUNT(DISTINCT c.id) as total 
                                    FROM cronograma c
                                    WHERE c.idSemestre = :semestre_id 
                                    AND DATE_FORMAT(c.fecha, '%Y-%m') = :mes_actual
                                    AND c.estado IN ('Programada', 'Completada')";
                $stmtSesionesMes = $db->prepare($querySesionesMes);
                $stmtSesionesMes->bindParam(':semestre_id', $semestre['id'], PDO::PARAM_INT);
                $stmtSesionesMes->bindParam(':mes_actual', $mesActual, PDO::PARAM_STR);
                $stmtSesionesMes->execute();
                $sesionesMesActual = (int)$stmtSesionesMes->fetchColumn();
                
                error_log("PanelTutor - Sesiones mes actual ($mesActual): " . $sesionesMesActual . " (Semestre ID: {$semestre['id']})");
            }
            
            // 5. Obtener las 2 próximas sesiones
            $proximasSesiones = [];
            
            if ($semestre['id']) {
                // Primero verificar si hay cronogramas en el semestre
                $queryProximasSesiones = "SELECT 
                                            c.id,
                                            c.fecha,
                                            c.horaInicio,
                                            c.horaFin,
                                            c.ambiente,
                                            c.descripcion,
                                            c.estado
                                         FROM cronograma c
                                         WHERE c.idSemestre = :semestre_id
                                         AND c.fecha >= CURDATE()
                                         AND c.estado = 'Programada'
                                         ORDER BY c.fecha ASC, c.horaInicio ASC
                                         LIMIT 2";
                
                $stmtProximas = $db->prepare($queryProximasSesiones);
                $stmtProximas->bindParam(':semestre_id', $semestre['id'], PDO::PARAM_INT);
                $stmtProximas->execute();
                $proximasSesiones = $stmtProximas->fetchAll(PDO::FETCH_ASSOC);
                
                // Para cada sesión, obtener el número de estudiantes asignados al tutor
                foreach ($proximasSesiones as &$sesion) {
                    // Formatear fecha
                    $fechaObj = new DateTime($sesion['fecha']);
                    $sesion['fechaFormateada'] = $fechaObj->format('d/m/Y');
                    
                    // Formatear horas
                    $sesion['horaInicio'] = substr($sesion['horaInicio'], 0, 5);
                    $sesion['horaFin'] = substr($sesion['horaFin'], 0, 5);
                    
                    // Contar estudiantes asignados al tutor en este semestre
                    $sesion['totalEstudiantes'] = $totalEstudiantes;
                    
                    // Tipo de historial (aquí puedes agregar lógica para determinar el tipo)
                    $sesion['tipoHistorial'] = 'Académica'; // Valor por defecto
                }
            }
            
            // 6. Construir respuesta completa
            $dashboardData = [
                'tutor' => [
                    'nombres' => $tutor['nombres'],
                    'apellidos' => $tutor['apellidos'],
                    'nombreCompleto' => $tutor['nombres'] . ' ' . $tutor['apellidos'],
                    'especialidad' => $tutor['especialidad'],
                    'correo' => $tutor['correo']
                ],
                'semestre' => [
                    'nombre' => $semestre['nombre'],
                    'estado' => $semestre['estado'],
                    'fechaInicio' => $semestre['fechaInicio'],
                    'fechaFin' => $semestre['fechaFin']
                ],
                'estadisticas' => [
                    'totalEstudiantes' => $totalEstudiantes,
                    'sesionesMesActual' => $sesionesMesActual
                ],
                'proximasSesiones' => $proximasSesiones
            ];
            
            Response::success($dashboardData, 'Datos del panel cargados correctamente');
            break;
            
        default:
            Response::error('Acción no válida');
    }
    
} catch (Exception $e) {
    error_log("Error en PanelTutor.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    Response::error('Error al procesar la solicitud: ' . $e->getMessage());
}
