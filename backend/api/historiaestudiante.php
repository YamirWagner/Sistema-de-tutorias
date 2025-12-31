<?php
/**
 * ============================================================
 * HISTORIAL DE SESIONES - API ESTUDIANTE
 * Sistema de Tutorías UNSAAC
 * ============================================================
 * 
 * API independiente para obtener el historial completo de sesiones
 * del estudiante con filtros y ordenamiento.
 */

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

header('Content-Type: application/json');

try {
    // Verificar autenticación
    $token = JWT::getBearerToken();
    
    if (!$token) {
        Response::unauthorized('Token no proporcionado');
        exit;
    }
    
    $payload = JWT::decode($token);
    
    // Verificar rol de estudiante
    if ($payload['role'] !== 'student') {
        Response::forbidden('Acceso denegado. Solo estudiantes pueden acceder.');
        exit;
    }
    
    $userId = $payload['user_id'];
    
    // Obtener parámetros de filtrado
    $estado = $_GET['estado'] ?? 'todos'; // todos, completada, pendiente, cancelada
    $tipo = $_GET['tipo'] ?? 'todos'; // todos, academica, personal, profesional
    $fechaInicio = $_GET['fechaInicio'] ?? null;
    $fechaFin = $_GET['fechaFin'] ?? null;
    $orden = $_GET['orden'] ?? 'DESC'; // ASC o DESC
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Obtener ID de asignación activa del estudiante
    $queryAsignacion = "SELECT id, idTutor FROM asignaciontutor 
                       WHERE idEstudiante = :student_id 
                       AND estado = 'Activa' 
                       LIMIT 1";
    
    $stmtAsignacion = $db->prepare($queryAsignacion);
    $stmtAsignacion->bindParam(':student_id', $userId, PDO::PARAM_INT);
    $stmtAsignacion->execute();
    $asignacion = $stmtAsignacion->fetch(PDO::FETCH_ASSOC);
    
    if (!$asignacion) {
        Response::success([], 'No tienes asignación activa en este semestre');
        exit;
    }
    
    $idAsignacion = $asignacion['id'];
    $idTutor = $asignacion['idTutor'];
    
    // Construir query dinámico con filtros
    $query = "SELECT 
                t.id,
                t.tipo,
                t.fecha,
                t.horaInicio,
                t.horaFin,
                t.modalidad,
                t.fechaRealizada,
                t.observaciones,
                t.estado,
                CONCAT(u.nombres, ' ', u.apellidos) as tutorNombre,
                u.especialidad as tutorEspecialidad,
                c.fecha as fechaCronograma,
                c.horaInicio as cronoHoraInicio,
                c.horaFin as cronoHoraFin,
                c.ambiente
            FROM tutoria t
            INNER JOIN usuariosistema u ON u.id = :id_tutor
            LEFT JOIN cronograma c ON t.idCronograma = c.id
            WHERE t.idAsignacion = :id_asignacion";
    
    // Aplicar filtros
    $params = [
        ':id_asignacion' => $idAsignacion,
        ':id_tutor' => $idTutor
    ];
    
    if ($estado !== 'todos') {
        if ($estado === 'completada') {
            $query .= " AND t.estado = 'Realizada'";
        } elseif ($estado === 'pendiente') {
            $query .= " AND t.estado IN ('Pendiente', 'Programada')";
        } elseif ($estado === 'cancelada') {
            $query .= " AND t.estado = 'Cancelada'";
        }
    }
    
    if ($tipo !== 'todos') {
        $query .= " AND LOWER(t.tipo) = :tipo";
        $params[':tipo'] = strtolower($tipo);
    }
    
    if ($fechaInicio) {
        $query .= " AND (t.fecha >= :fecha_inicio OR c.fecha >= :fecha_inicio)";
        $params[':fecha_inicio'] = $fechaInicio;
    }
    
    if ($fechaFin) {
        $query .= " AND (t.fecha <= :fecha_fin OR c.fecha <= :fecha_fin)";
        $params[':fecha_fin'] = $fechaFin;
    }
    
    // Ordenar por fecha
    $query .= " ORDER BY COALESCE(t.fechaRealizada, t.fecha, c.fecha) " . ($orden === 'ASC' ? 'ASC' : 'DESC');
    
    $stmt = $db->prepare($query);
    
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    
    $stmt->execute();
    $sesiones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Formatear respuesta y obtener materiales
    $resultado = array_map(function($sesion) use ($db) {
        // Obtener materiales asociados a la tutoría
        $queryMateriales = "SELECT id, titulo, descripcion, tipo, enlace, fechaRegistro 
                           FROM materiales 
                           WHERE idTutoria = :id_tutoria 
                           ORDER BY fechaRegistro DESC";
        $stmtMat = $db->prepare($queryMateriales);
        $stmtMat->bindValue(':id_tutoria', $sesion['id'], PDO::PARAM_INT);
        $stmtMat->execute();
        $materiales = $stmtMat->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'id' => (int)$sesion['id'],
            'tipo' => $sesion['tipo'],
            'fecha' => $sesion['fecha'] ?: $sesion['fechaCronograma'],
            'horaInicio' => $sesion['horaInicio'] ?: $sesion['cronoHoraInicio'],
            'horaFin' => $sesion['horaFin'] ?: $sesion['cronoHoraFin'],
            'modalidad' => $sesion['modalidad'],
            'fechaRealizada' => $sesion['fechaRealizada'],
            'observaciones' => $sesion['observaciones'],
            'estado' => $sesion['estado'],
            'tutorNombre' => $sesion['tutorNombre'],
            'tutorEspecialidad' => $sesion['tutorEspecialidad'],
            'ambiente' => $sesion['ambiente'],
            'materiales' => $materiales
        ];
    }, $sesiones);
    
    // Calcular estadísticas
    $total = count($resultado);
    $completadas = count(array_filter($resultado, fn($s) => $s['estado'] === 'Realizada'));
    $pendientes = count(array_filter($resultado, fn($s) => in_array($s['estado'], ['Pendiente', 'Programada'])));
    $canceladas = count(array_filter($resultado, fn($s) => $s['estado'] === 'Cancelada'));
    
    Response::success([
        'sesiones' => $resultado,
        'estadisticas' => [
            'total' => $total,
            'completadas' => $completadas,
            'pendientes' => $pendientes,
            'canceladas' => $canceladas
        ]
    ]);
    
} catch (Exception $e) {
    error_log("❌ ERROR en historiaestudiante.php: " . $e->getMessage());
    
    if ($e->getMessage() === 'Token expirado') {
        Response::unauthorized('Sesión expirada');
    }
    
    Response::serverError('Error al procesar la solicitud');
}
