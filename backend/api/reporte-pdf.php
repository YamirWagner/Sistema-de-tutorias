<?php
/**
 * API: Generador de PDFs de Reportes - Sistema de Tutorías UNSAAC
 * Genera reportes en PDF: Lista de tutores, historial de estudiantes, constancias
 * Usa HTML2PDF para convertir HTML/CSS a PDF
 */

// CRÍTICO: Suprimir TODA salida antes del PDF
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../storage/logs/reporte-pdf-errors.log');

// Iniciar buffer de salida al inicio
ob_start();

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';

// Cargar HTML2PDF via Composer
require_once __DIR__ . '/../vendor/autoload.php';

use Spipu\Html2Pdf\Html2Pdf;

// Debug: registrar todos los headers
error_log("[reporte-pdf.php] === INICIO REQUEST ===");
error_log("[reporte-pdf.php] Método: " . $_SERVER['REQUEST_METHOD']);
error_log("[reporte-pdf.php] URI: " . $_SERVER['REQUEST_URI']);
$headers = getallheaders();
error_log("[reporte-pdf.php] Headers recibidos: " . json_encode($headers));

try {
    // Verificar autenticación
    $token = JWT::getBearerToken();
    
    // Si no se obtuvo el token, intentar obtenerlo manualmente
    if (!$token) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
                error_log("[reporte-pdf.php] Token obtenido manualmente del header Authorization");
            }
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
                error_log("[reporte-pdf.php] Token obtenido manualmente del header authorization (lowercase)");
            }
        }
    }
    
    if (!$token) {
        error_log("[reporte-pdf.php] Token no encontrado en ningún header");
        ob_clean();
        http_response_code(401);
        echo json_encode(['error' => 'Token no proporcionado']);
        exit;
    }
    
    $payload = JWT::decode($token);
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Control de actividad
    Activity::enforceAndTouch($db, $payload);
    
    // Verificar rol (administrador, tutor o verificador)
    $role = strtolower($payload['role'] ?? '');
    $isAdmin = ($role === 'admin' || $role === 'administrador');
    $isTutor = ($role === 'tutor');
    $isVerifier = ($role === 'verificador' || $role === 'verifier');
    
    error_log("[reporte-pdf.php] Rol del usuario: " . $role);
    
    if (!$isAdmin && !$isTutor && !$isVerifier) {
        ob_clean();
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado', 'role' => $role]);
        exit;
    }
    
    $userId = $payload['user_id'] ?? null;
    
    if (!$userId) {
        ob_clean();
        http_response_code(400);
        echo json_encode(['error' => 'ID de usuario no encontrado en el token']);
        exit;
    }
    
    // Obtener tipo de reporte
    $tipoReporte = $_GET['tipo'] ?? null;
    
    if (!$tipoReporte) {
        ob_clean();
        http_response_code(400);
        echo json_encode(['error' => 'Tipo de reporte no especificado']);
        exit;
    }
    
    error_log("[reporte-pdf.php] Tipo de reporte: " . $tipoReporte);
    error_log("[reporte-pdf.php] Timestamp: " . date('Y-m-d H:i:s'));
    error_log("[reporte-pdf.php] Version: 2.0 - Corregida");
    
    // Generar PDF según el tipo
    switch($tipoReporte) {
        case 'lista-tutores':
            generarListaTutoresPDF($db, $userId, $role);
            break;
        case 'historial-estudiante':
            generarHistorialEstudiantePDF($db, $userId, $role);
            break;
        case 'constancia':
            generarConstanciaPDF($db, $userId, $role);
            break;
        default:
            ob_clean();
            http_response_code(400);
            echo json_encode(['error' => 'Tipo de reporte no válido']);
            exit;
    }
    
} catch (Exception $e) {
    ob_clean();
    error_log("[reporte-pdf.php] Error: " . $e->getMessage());
    error_log("[reporte-pdf.php] Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'Error al generar PDF: ' . $e->getMessage()]);
    exit;
}

// ===== FUNCIONES DE GENERACIÓN DE REPORTES =====

/**
 * Genera PDF con lista de tutores y sus estudiantes asignados
 */
function generarListaTutoresPDF($db, $userId, $role) {
    error_log("[reporte-pdf.php] Iniciando generarListaTutoresPDF");
    
    $semesterId = $_GET['semesterId'] ?? null;
    $tutorId = $_GET['tutorId'] ?? null;
    
    error_log("[reporte-pdf.php] semesterId: " . $semesterId . ", tutorId: " . $tutorId);
    
    if (!$semesterId) {
        ob_clean();
        http_response_code(400);
        echo json_encode(['error' => 'ID de semestre no proporcionado']);
        exit;
    }
    
    // Obtener información del semestre
    $stmtSemestre = $db->prepare("SELECT nombre FROM semestre WHERE id = ?");
    $stmtSemestre->execute([$semesterId]);
    $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
    
    error_log("[reporte-pdf.php] Semestre encontrado: " . json_encode($semestre));
    
    if (!$semestre) {
        ob_clean();
        http_response_code(404);
        echo json_encode(['error' => 'Semestre no encontrado']);
        exit;
    }
    
    // Obtener tutores con sus estudiantes y sesiones realizadas
    try {
        $query = "
            SELECT 
                u.id,
                u.nombres,
                u.apellidos,
                u.correo,
                u.especialidad,
                COUNT(DISTINCT at.id) as totalAsignaciones
            FROM usuariosistema u
            INNER JOIN asignaciontutor at ON u.id = at.idTutor
            INNER JOIN estudiante e ON at.idEstudiante = e.id
            WHERE u.rol = 'Tutor' 
                AND at.idSemestre = ?";
        
        // Si se especifica un tutorId, filtrar por ese tutor
        if ($tutorId) {
            $query .= " AND u.id = ?";
        }
        
        $query .= " GROUP BY u.id, u.nombres, u.apellidos, u.correo, u.especialidad
            HAVING totalAsignaciones > 0
            ORDER BY u.apellidos, u.nombres";
        
        $stmt = $db->prepare($query);
        
        if ($tutorId) {
            $stmt->execute([$semesterId, $tutorId]);
        } else {
            $stmt->execute([$semesterId]);
        }
        
        $tutores = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("[reporte-pdf.php] Tutores encontrados: " . count($tutores));
        
        // Para cada tutor, obtener sus estudiantes con sesiones por tipo
        foreach ($tutores as &$tutor) {
            $stmtEst = $db->prepare("
                SELECT 
                    e.id,
                    e.nombres,
                    e.apellidos,
                    e.codigo,
                    at.estado,
                    SUM(CASE WHEN t.tipo = 'Académica' AND t.estado = 'Realizada' THEN 1 ELSE 0 END) as sesionesAcademicas,
                    SUM(CASE WHEN t.tipo = 'Profesional' AND t.estado = 'Realizada' THEN 1 ELSE 0 END) as sesionesProfesionales,
                    SUM(CASE WHEN t.tipo = 'Personal' AND t.estado = 'Realizada' THEN 1 ELSE 0 END) as sesionesPersonales
                FROM asignaciontutor at
                INNER JOIN estudiante e ON at.idEstudiante = e.id
                LEFT JOIN tutoria t ON at.id = t.idAsignacion
                WHERE at.idTutor = ? AND at.idSemestre = ?
                GROUP BY e.id, e.nombres, e.apellidos, e.codigo, at.estado
                ORDER BY e.apellidos, e.nombres
            ");
            $stmtEst->execute([$tutor['id'], $semesterId]);
            $tutor['estudiantes'] = $stmtEst->fetchAll(PDO::FETCH_ASSOC);
        }
        
    } catch (PDOException $e) {
        error_log("[reporte-pdf.php] Error en query: " . $e->getMessage());
        throw $e;
    }
    
    error_log("[reporte-pdf.php] Datos tutores: " . json_encode($tutores));
    
    // Obtener datos del administrador
    $stmtAdmin = $db->prepare("SELECT nombres, apellidos, correo FROM usuariosistema WHERE id = ?");
    $stmtAdmin->execute([$userId]);
    $adminData = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
    
    // Generar HTML del reporte
    $html = generarHTMLListaTutores($semestre, $tutores, $adminData);
    
    error_log("[reporte-pdf.php] HTML generado, longitud: " . strlen($html));
    
    // Limpiar buffer de salida antes de generar PDF
    ob_clean();
    
    // Crear PDF con HTML2PDF
    try {
        $html2pdf = new Html2Pdf('P', 'A4', 'es', true, 'UTF-8');
        $html2pdf->setDefaultFont('Arial');
        $html2pdf->writeHTML($html);
        
        $filename = 'Lista_Tutores_' . $semestre['nombre'] . '_' . date('Y-m-d') . '.pdf';
        $html2pdf->output($filename, 'I'); // 'I' para mostrar en navegador, 'D' para descargar
        
        error_log("[reporte-pdf.php] PDF generado exitosamente: " . $filename);
        
    } catch (Exception $e) {
        error_log("[reporte-pdf.php] Error al generar PDF: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Genera PDF con historial de un estudiante
 */
function generarHistorialEstudiantePDF($db, $userId, $role) {
    $estudianteId = $_GET['estudianteId'] ?? null;
    
    if (!$estudianteId) {
        ob_clean();
        http_response_code(400);
        echo json_encode(['error' => 'ID de estudiante no proporcionado']);
        exit;
    }
    
    // Obtener información del estudiante
    $stmtEstudiante = $db->prepare("
        SELECT e.*
        FROM estudiante e
        WHERE e.id = ?
    ");
    $stmtEstudiante->execute([$estudianteId]);
    $estudiante = $stmtEstudiante->fetch(PDO::FETCH_ASSOC);
    
    if (!$estudiante) {
        ob_clean();
        http_response_code(404);
        echo json_encode(['error' => 'Estudiante no encontrado']);
        exit;
    }
    
    // Verificar permisos (tutor solo puede ver sus estudiantes)
    if ($role === 'tutor') {
        $stmtPermiso = $db->prepare("
            SELECT COUNT(*) as count 
            FROM asignaciontutor 
            WHERE idTutor = ? AND idEstudiante = ?
        ");
        $stmtPermiso->execute([$userId, $estudianteId]);
        $permiso = $stmtPermiso->fetch(PDO::FETCH_ASSOC);
        
        if ($permiso['count'] == 0) {
            ob_clean();
            http_response_code(403);
            echo json_encode(['error' => 'No tienes permiso para ver este estudiante']);
            exit;
        }
    }
    
    // Obtener historial de tutorías
    $stmtHistorial = $db->prepare("
        SELECT 
            t.*,
            s.nombre as semestre,
            u.nombres as tutorNombres,
            u.apellidos as tutorApellidos,
            c.nombre as cronogramaNombre,
            c.fechaInicio,
            c.fechaFin,
            t.fechaRealizada,
            t.tipo,
            t.modalidad
        FROM tutoria t
        INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
        INNER JOIN semestre s ON at.idSemestre = s.id
        INNER JOIN usuariosistema u ON at.idTutor = u.id
        LEFT JOIN cronograma c ON t.idCronograma = c.id
        WHERE at.idEstudiante = ?
        ORDER BY t.fechaRealizada DESC, t.fecha DESC
    ");
    $stmtHistorial->execute([$estudianteId]);
    $historial = $stmtHistorial->fetchAll(PDO::FETCH_ASSOC);
    
    // Generar HTML del reporte
    $html = generarHTMLHistorialEstudiante($estudiante, $historial);
    
    // Limpiar buffer de salida antes de generar PDF
    ob_clean();
    
    // Crear PDF con HTML2PDF
    try {
        $html2pdf = new Html2Pdf('P', 'A4', 'es', true, 'UTF-8');
        $html2pdf->setDefaultFont('Arial');
        $html2pdf->writeHTML($html);
        
        $filename = 'Historial_' . $estudiante['codigo'] . '_' . date('Y-m-d') . '.pdf';
        $html2pdf->output($filename, 'I');
        
        error_log("[reporte-pdf.php] PDF generado exitosamente: " . $filename);
        
    } catch (Exception $e) {
        error_log("[reporte-pdf.php] Error al generar PDF: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Genera constancia PDF para estudiante que completó tutorías
 */
function generarConstanciaPDF($db, $userId, $role) {
    $estudianteId = $_GET['estudianteId'] ?? null;
    $semestreId = $_GET['semesterId'] ?? null;
    
    if (!$estudianteId || !$semestreId) {
        ob_clean();
        http_response_code(400);
        echo json_encode(['error' => 'ID de estudiante o semestre no proporcionado']);
        exit;
    }
    
    // Obtener datos para la constancia (solo estudiantes con 3+ sesiones realizadas)
    $query = "
        SELECT 
            e.nombres AS estudiante_nombres,
            e.apellidos AS estudiante_apellidos,
            e.codigo AS estudiante_codigo,
            e.semestre AS estudiante_semestre,
            s.nombre AS semestre_academico,
            u.nombres AS tutor_nombres,
            u.apellidos AS tutor_apellidos,
            COUNT(CASE WHEN t.estado = 'Realizada' THEN 1 END) AS total_sesiones,
            GROUP_CONCAT(
                CASE WHEN t.estado = 'Realizada' 
                THEN DATE_FORMAT(t.fechaRealizada, '%d/%m/%Y') 
                END 
                ORDER BY t.fechaRealizada 
                SEPARATOR ', '
            ) AS fechas_sesiones
        FROM estudiante e
        INNER JOIN asignaciontutor at ON e.id = at.idEstudiante
        INNER JOIN usuariosistema u ON at.idTutor = u.id
        INNER JOIN semestre s ON at.idSemestre = s.id
        LEFT JOIN tutoria t ON at.id = t.idAsignacion
        WHERE e.id = ? AND s.id = ?
        GROUP BY e.id, u.id, s.id
        HAVING total_sesiones >= 3
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute([$estudianteId, $semestreId]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$data) {
        ob_clean();
        http_response_code(404);
        echo json_encode(['error' => 'No se encontraron datos o el estudiante no completó las 3 sesiones']);
        exit;
    }
    
    // Generar HTML de la constancia
    $html = generarHTMLConstancia($data);
    
    // Limpiar buffer de salida antes de generar PDF
    ob_clean();
    
    // Crear PDF con HTML2PDF
    try {
        $html2pdf = new Html2Pdf('P', 'A4', 'es', true, 'UTF-8');
        $html2pdf->setDefaultFont('Arial');
        $html2pdf->writeHTML($html);
        
        $filename = 'Constancia_' . $data['estudiante_codigo'] . '_' . $data['semestre'] . '.pdf';
        $html2pdf->output($filename, 'I');
        
        error_log("[reporte-pdf.php] Constancia generada exitosamente: " . $filename);
        
    } catch (Exception $e) {
        error_log("[reporte-pdf.php] Error al generar constancia: " . $e->getMessage());
        throw $e;
    }
}

// ===== FUNCIONES DE GENERACIÓN DE HTML =====

function generarHTMLListaTutores($semestre, $tutores, $adminData) {
    $html = '
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #9B192D;
            font-size: 16pt;
            margin: 3px 0;
        }
        .header h2 {
            color: #7B1113;
            font-size: 12pt;
            margin: 3px 0;
        }
        .info-semestre {
            background-color: #EDEDED;
            padding: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #9B192D;
        }
        .tutor-section {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .tutor-header {
            background-color: #9B192D;
            color: white;
            padding: 6px;
            margin-bottom: 8px;
            font-size: 11pt;
        }
        .tutor-info {
            margin-bottom: 10px;
            font-size: 9pt;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 9pt;
        }
        th {
            background-color: #9B192D;
            color: white;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
        }
        td {
            border: 1px solid #ddd;
            padding: 5px 4px;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .si {
            color: #27ae60;
            font-weight: bold;
        }
        .no {
            color: #e74c3c;
        }
        .footer {
            position: fixed;
            bottom: 15px;
            width: 100%;
            text-align: center;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 5px;
        }
    </style>
    
    <page>
        <div class="header">
            <h1>UNIVERSIDAD NACIONAL DE SAN ANTONIO ABAD DEL CUSCO</h1>
            <h2>Sistema de Tutorías</h2>
            <h2>Constancia de Estudiantes Asignados</h2>
        </div>
        
        <div class="info-semestre">
            <strong>Semestre:</strong> ' . htmlspecialchars($semestre['nombre']) . '<br>
            <strong>Fecha de generación:</strong> ' . date('d/m/Y H:i') . '<br>
            <strong>Total de tutores:</strong> ' . count($tutores) . '
        </div>
    ';
    
    // Mostrar cada tutor con tabla de estudiantes
    if (!empty($tutores)) {
        foreach ($tutores as $tutor) {
            $nombreCompleto = htmlspecialchars($tutor['nombres'] . ' ' . $tutor['apellidos']);
            $estudiantes = $tutor['estudiantes'] ?? [];
            
            $html .= '
            <div class="tutor-section">
                <div class="tutor-header">
                    <strong>Tutor: ' . $nombreCompleto . '</strong>
                </div>
                <div class="tutor-info">
                    <strong>Email:</strong> ' . htmlspecialchars($tutor['correo']) . ' | 
                    <strong>Especialidad:</strong> ' . htmlspecialchars($tutor['especialidad']) . ' | 
                    <strong>Estudiantes:</strong> ' . count($estudiantes) . '
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 8%;">Código</th>
                            <th style="width: 35%;">Estudiante</th>
                            <th style="width: 14%;">Académica</th>
                            <th style="width: 14%;">Profesional</th>
                            <th style="width: 14%;">Personal</th>
                            <th style="width: 15%;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>';
            
            foreach ($estudiantes as $est) {
                $nombreEst = htmlspecialchars($est['nombres'] . ' ' . $est['apellidos']);
                $codigo = htmlspecialchars($est['codigo']);
                $estado = htmlspecialchars($est['estado']);
                
                $academica = $est['sesionesAcademicas'] > 0 ? '<span class="si">SÍ</span>' : '<span class="no">NO</span>';
                $profesional = $est['sesionesProfesionales'] > 0 ? '<span class="si">SÍ</span>' : '<span class="no">NO</span>';
                $personal = $est['sesionesPersonales'] > 0 ? '<span class="si">SÍ</span>' : '<span class="no">NO</span>';
                
                $html .= '
                        <tr>
                            <td>' . $codigo . '</td>
                            <td>' . $nombreEst . '</td>
                            <td style="text-align: center;">' . $academica . '</td>
                            <td style="text-align: center;">' . $profesional . '</td>
                            <td style="text-align: center;">' . $personal . '</td>
                            <td>' . $estado . '</td>
                        </tr>';
            }
            
            $html .= '
                    </tbody>
                </table>
            </div>';
        }
    } else {
        $html .= '<p style="text-align:center;color:#666;">No se encontraron estudiantes asignados.</p>';
    }
    
    $adminNombre = htmlspecialchars($adminData['nombres'] . ' ' . $adminData['apellidos']);
    $adminCorreo = htmlspecialchars($adminData['correo']);
    
    $html .= '
        <div class="footer">
            <strong>Generado por:</strong> ' . $adminNombre . ' (' . $adminCorreo . ')<br>
            <strong>Fecha:</strong> ' . date('d/m/Y H:i:s') . ' | Sistema de Tutorías UNSAAC
        </div>
    </page>';
    
    return $html;
}

function generarHTMLHistorialEstudiante($estudiante, $historial) {
    $html = '
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #9B192D;
            font-size: 18pt;
            margin: 5px 0;
        }
        .header h2 {
            color: #7B1113;
            font-size: 14pt;
            margin: 5px 0;
        }
        .info-estudiante {
            background-color: #EDEDED;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #9B192D;
        }
        .tutoria {
            border: 1px solid #ddd;
            padding: 10px;
            margin-bottom: 15px;
            page-break-inside: avoid;
        }
        .tutoria-header {
            background-color: #9B192D;
            color: white;
            padding: 5px 10px;
            margin: -10px -10px 10px -10px;
        }
        .tutoria-info {
            margin: 5px 0;
        }
        .footer {
            position: fixed;
            bottom: 20px;
            width: 100%;
            text-align: center;
            font-size: 9pt;
            color: #666;
        }
    </style>
    
    <page>
        <div class="header">
            <h1>UNIVERSIDAD NACIONAL DE SAN ANTONIO ABAD DEL CUSCO</h1>
            <h2>Sistema de Tutorías</h2>
            <h2>Historial de Tutorías</h2>
        </div>
        
        <div class="info-estudiante">
            <strong>Estudiante:</strong> ' . htmlspecialchars($estudiante['nombres'] . ' ' . $estudiante['apellidos']) . '<br>
            <strong>Código:</strong> ' . htmlspecialchars($estudiante['codigo']) . '<br>
            <strong>Email:</strong> ' . htmlspecialchars($estudiante['correo']) . '<br>
            <strong>Semestre:</strong> ' . htmlspecialchars($estudiante['semestre'] ?? 'N/A') . '<br>
            <strong>Total de tutorías:</strong> ' . count($historial) . '
        </div>
        
        <h3 style="color: #9B192D;">Sesiones de Tutoría</h3>
    ';
    
    if (empty($historial)) {
        $html .= '<p>No se encontraron tutorías registradas para este estudiante.</p>';
    } else {
        foreach ($historial as $tutoria) {
            $nombreTutor = htmlspecialchars($tutoria['tutorNombres'] . ' ' . $tutoria['tutorApellidos']);
            $fechaProgramada = date('d/m/Y', strtotime($tutoria['fecha']));
            $fechaRealizada = $tutoria['fechaRealizada'] ? date('d/m/Y', strtotime($tutoria['fechaRealizada'])) : 'No realizada';
            $estado = htmlspecialchars($tutoria['estado']);
            $tipo = htmlspecialchars($tutoria['tipo'] ?? 'N/A');
            $modalidad = htmlspecialchars($tutoria['modalidad'] ?? 'N/A');
            
            $html .= '
            <div class="tutoria">
                <div class="tutoria-header">
                    <strong>Sesión programada: ' . $fechaProgramada . ' | Estado: ' . $estado . '</strong>
                </div>
                <div class="tutoria-info">
                    <strong>Tutor:</strong> ' . $nombreTutor . '<br>
                    <strong>Semestre:</strong> ' . htmlspecialchars($tutoria['semestre']) . '<br>
                    <strong>Tipo:</strong> ' . $tipo . '<br>
                    <strong>Modalidad:</strong> ' . $modalidad . '<br>
                    <strong>Fecha realizada:</strong> ' . $fechaRealizada . '<br>
                    <strong>Cronograma:</strong> ' . htmlspecialchars($tutoria['cronogramaNombre'] ?? 'N/A') . '<br>
                    <strong>Observaciones:</strong> ' . htmlspecialchars($tutoria['observaciones'] ?? 'Ninguna') . '
                </div>
            </div>';
        }
    }
    
    $html .= '
        <div class="footer">
            Sistema de Tutorías UNSAAC - Generado el ' . date('d/m/Y') . '
        </div>
    </page>';
    
    return $html;
}

function generarHTMLConstancia($data) {
    $nombreCompleto = htmlspecialchars($data['estudiante_nombres'] . ' ' . $data['estudiante_apellidos']);
    $nombreTutor = htmlspecialchars($data['tutor_nombres'] . ' ' . $data['tutor_apellidos']);
    
    $html = '
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            color: #9B192D;
            font-size: 20pt;
            margin: 5px 0;
        }
        .header h2 {
            color: #7B1113;
            font-size: 16pt;
            margin: 5px 0;
        }
        .constancia-body {
            text-align: justify;
            line-height: 1.8;
            margin: 30px 50px;
        }
        .destacado {
            color: #9B192D;
            font-weight: bold;
        }
        .firma {
            margin-top: 80px;
            text-align: center;
        }
        .firma-linea {
            border-top: 2px solid #333;
            width: 250px;
            margin: 0 auto 5px auto;
        }
        .sello {
            margin-top: 50px;
            text-align: center;
            font-size: 10pt;
            color: #666;
        }
    </style>
    
    <page>
        <div class="header">
            <h1>UNIVERSIDAD NACIONAL DE SAN ANTONIO ABAD DEL CUSCO</h1>
            <h2>CONSTANCIA DE TUTORÍA</h2>
        </div>
        
        <div class="constancia-body">
            <p>
                La Dirección del Sistema de Tutorías de la Universidad Nacional de San Antonio Abad del Cusco,
                <strong>HACE CONSTAR</strong> que:
            </p>
            
            <p style="text-align: center; margin: 30px 0;">
                <span class="destacado" style="font-size: 14pt;">' . strtoupper($nombreCompleto) . '</span><br>
                <strong>Código:</strong> ' . htmlspecialchars($data['estudiante_codigo']) . '
            </p>
            
            <p>
                Estudiante del semestre <span class="destacado">' . htmlspecialchars($data['estudiante_semestre']) . '</span>,
                ha participado satisfactoriamente en el <strong>Programa de Tutorías</strong>
                correspondiente al semestre académico <span class="destacado">' . htmlspecialchars($data['semestre_academico']) . '</span>.
            </p>
            
            <p>
                Durante este periodo, el/la estudiante completó <span class="destacado">' . $data['total_sesiones'] . ' sesiones de tutoría</span>
                bajo la orientación del tutor <span class="destacado">' . $nombreTutor . '</span>,
                demostrando compromiso y participación activa en las actividades programadas.
            </p>
            
            <p>
                Las sesiones se realizaron en las siguientes fechas: ' . htmlspecialchars($data['fechas_sesiones']) . '.
            </p>
            
            <p>
                Se expide la presente constancia a solicitud del interesado para los fines que estime conveniente.
            </p>
            
            <p style="text-align: right; margin-top: 40px;">
                Cusco, ' . date('d') . ' de ' . date('F') . ' de ' . date('Y') . '
            </p>
        </div>
        
        <div class="firma">
            <div class="firma-linea"></div>
            <strong>Dirección del Sistema de Tutorías</strong><br>
            Universidad Nacional de San Antonio Abad del Cusco
        </div>
        
        <div class="sello">
            <p>Este documento ha sido generado electrónicamente por el Sistema de Tutorías UNSAAC</p>
        </div>
    </page>';
    
    return $html;
}
