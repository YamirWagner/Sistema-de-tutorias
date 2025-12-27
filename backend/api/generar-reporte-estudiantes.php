<?php
/**
 * API: Generador de Reporte PDF - Estudiantes que completaron tutorías
 * Genera un reporte PDF con todos los estudiantes asignados al tutor
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../storage/logs/reporte-estudiantes-errors.log');

ob_start();

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';
require_once __DIR__ . '/../vendor/autoload.php';

use Spipu\Html2Pdf\Html2Pdf;

error_log("[generar-reporte-estudiantes.php] === INICIO REQUEST ===");

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
    
    Activity::enforceAndTouch($db, $payload);
    
    // Verificar rol de tutor
    $role = strtolower($payload['role'] ?? '');
    if ($role !== 'tutor') {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado. Solo tutores pueden generar este reporte']);
        exit;
    }
    
    $tutorId = $payload['user_id'] ?? null;
    
    if (!$tutorId) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de tutor no encontrado']);
        exit;
    }
    
    error_log("[generar-reporte-estudiantes.php] Generando reporte para tutor ID: $tutorId");
    
    // Obtener semestre activo
    $querySemestre = "SELECT id, nombre FROM semestre WHERE estado = 'Activo' ORDER BY fechaInicio DESC LIMIT 1";
    $stmtSemestre = $db->prepare($querySemestre);
    $stmtSemestre->execute();
    $semestre = $stmtSemestre->fetch(PDO::FETCH_ASSOC);
    
    if (!$semestre) {
        http_response_code(400);
        echo json_encode(['error' => 'No hay semestre activo']);
        exit;
    }
    
    $semestreId = $semestre['id'];
    $semestreNombre = $semestre['nombre'];
    
    // Obtener datos del tutor
    $queryTutor = "SELECT nombres, apellidos FROM usuariosistema WHERE id = :tutor_id";
    $stmtTutor = $db->prepare($queryTutor);
    $stmtTutor->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
    $stmtTutor->execute();
    $tutor = $stmtTutor->fetch(PDO::FETCH_ASSOC);
    
    $nombreTutor = trim($tutor['nombres'] . ' ' . $tutor['apellidos']);
    
    // Obtener estudiantes asignados con sus sesiones
    $queryEstudiantes = "SELECT 
                    e.id,
                    e.codigo,
                    e.nombres,
                    e.apellidos,
                    
                    CASE WHEN COUNT(CASE WHEN t.tipo = 'Academica' AND t.estado = 'Realizada' THEN 1 END) > 0 THEN 1 ELSE 0 END as completoAcademica,
                    CASE WHEN COUNT(CASE WHEN t.tipo = 'Personal' AND t.estado = 'Realizada' THEN 1 END) > 0 THEN 1 ELSE 0 END as completoPersonal,
                    CASE WHEN COUNT(CASE WHEN t.tipo = 'Profesional' AND t.estado = 'Realizada' THEN 1 END) > 0 THEN 1 ELSE 0 END as completoProfesional
                    
                  FROM asignaciontutor a
                  INNER JOIN estudiante e ON a.idEstudiante = e.id
                  LEFT JOIN tutoria t ON t.idAsignacion = a.id
                  WHERE a.idTutor = :tutor_id 
                    AND a.idSemestre = :semestre_id
                    AND a.estado = 'Activa'
                    AND e.estado = 'Activo'
                  GROUP BY e.id, e.codigo, e.nombres, e.apellidos
                  ORDER BY e.apellidos, e.nombres";
    
    $stmtEst = $db->prepare($queryEstudiantes);
    $stmtEst->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
    $stmtEst->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
    $stmtEst->execute();
    $estudiantes = $stmtEst->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($estudiantes)) {
        http_response_code(400);
        echo json_encode(['error' => 'No hay estudiantes asignados']);
        exit;
    }
    
    error_log("[generar-reporte-estudiantes.php] Estudiantes encontrados: " . count($estudiantes));
    
    // Debug: registrar valores de ejemplo
    if (count($estudiantes) > 0) {
        error_log("[generar-reporte-estudiantes.php] Ejemplo estudiante 1: " . json_encode($estudiantes[0]));
    }
    
    // Generar PDF
    $pdfData = generarReportePDF($estudiantes, $nombreTutor, $semestreNombre);
    
    if (empty($pdfData) || strlen($pdfData) < 100) {
        throw new Exception("El PDF generado está vacío o es demasiado pequeño");
    }
    
    if (substr($pdfData, 0, 4) !== '%PDF') {
        throw new Exception("Los datos generados no son un PDF válido");
    }
    
    error_log("[generar-reporte-estudiantes.php] PDF generado exitosamente: " . strlen($pdfData) . " bytes");
    
    // Limpiar buffer
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Enviar PDF
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="reporte_estudiantes_' . date('Ymd_His') . '.pdf"');
    header('Content-Length: ' . strlen($pdfData));
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    echo $pdfData;
    exit;
    
} catch (Exception $e) {
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    error_log("[generar-reporte-estudiantes.php] ERROR: " . $e->getMessage());
    
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Error al generar reporte',
        'message' => $e->getMessage()
    ]);
    exit;
}

function generarReportePDF($estudiantes, $nombreTutor, $semestreNombre) {
    try {
        // Logo en base64
        $logoPath = __DIR__ . '/../../frontend/assets/LogoBarra.png';
        $logoHTML = '';
        if (file_exists($logoPath)) {
            $logoData = file_get_contents($logoPath);
            $logoBase64 = 'data:image/png;base64,' . base64_encode($logoData);
            $logoHTML = '<img src="' . $logoBase64 . '" alt="UNSAAC" class="logo" />';
        }
        
        // Construir filas de la tabla
        $filasHTML = '';
        $contador = 1;
        
        foreach ($estudiantes as $est) {
            $nombreCompleto = htmlspecialchars(trim($est['nombres'] . ' ' . $est['apellidos']), ENT_QUOTES, 'UTF-8');
            $codigo = htmlspecialchars($est['codigo'], ENT_QUOTES, 'UTF-8');
            
            // Convertir explícitamente a entero y luego evaluar
            $completoA = intval($est['completoAcademica'] ?? 0);
            $completoP = intval($est['completoPersonal'] ?? 0);
            $completoPr = intval($est['completoProfesional'] ?? 0);
            
            error_log("[PDF] Estudiante $codigo: A=$completoA, P=$completoP, Pr=$completoPr");
            
            $checkAcademica = $completoA > 0 ? 'Si' : 'No';
            $checkPersonal = $completoP > 0 ? 'Si' : 'No';
            $checkProfesional = $completoPr > 0 ? 'Si' : 'No';
            
            $colorAcademica = $completoA > 0 ? '#28a745' : '#dc3545';
            $colorPersonal = $completoP > 0 ? '#28a745' : '#dc3545';
            $colorProfesional = $completoPr > 0 ? '#28a745' : '#dc3545';
            
            $filasHTML .= '
        <tr>
            <td style="text-align: center;">' . $contador . '</td>
            <td style="text-align: center;">' . $codigo . '</td>
            <td>' . $nombreCompleto . '</td>
            <td style="text-align: center; color: ' . $colorAcademica . '; font-weight: bold; font-size: 9pt;">' . $checkAcademica . '</td>
            <td style="text-align: center; color: ' . $colorPersonal . '; font-weight: bold; font-size: 9pt;">' . $checkPersonal . '</td>
            <td style="text-align: center; color: ' . $colorProfesional . '; font-weight: bold; font-size: 9pt;">' . $checkProfesional . '</td>
        </tr>';
            $contador++;
        }
        
        // Construir HTML completo
        $html = '<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Estudiantes - Tutorías</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9pt; color: #333; line-height: 1.3; }
        .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #7B1113; }
        .logo { max-width: 100px; height: auto; margin-bottom: 8px; background-color: white; padding: 10px; border-radius: 8px; }
        .header h1 { color: #7B1113; font-size: 14pt; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
        .header h2 { color: #333; font-size: 11pt; font-weight: normal; margin: 3px 0; }
        .info-tutor { margin: 10px 0; padding: 8px; background: #f8f9fa; border-left: 4px solid #7B1113; }
        .info-tutor strong { color: #7B1113; }
        .tabla-estudiantes { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .tabla-estudiantes th { background: #7B1113; color: white; padding: 8px; font-size: 9pt; font-weight: bold; border: 1px solid #5a0f0f; text-align: center; }
        .tabla-estudiantes td { padding: 6px 8px; border: 1px solid #ddd; font-size: 8pt; }
        .tabla-estudiantes tr:nth-child(even) { background: #f9f9f9; }
        .firma-section { margin-top: 40px; text-align: center; }
        .firma-line { border-top: 2px solid #333; width: 250px; margin: 0 auto; padding-top: 8px; font-size: 10pt; font-weight: bold; }
        .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #7B1113; text-align: center; font-size: 7pt; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        ' . $logoHTML . '
        <h1>Universidad Nacional de San Antonio Abad del Cusco</h1>
        <h2>Reporte de Estudiantes - Tutorías</h2>
    </div>
    
    <div class="info-tutor">
        <strong>Tutor:</strong> ' . htmlspecialchars($nombreTutor, ENT_QUOTES, 'UTF-8') . '<br>
        <strong>Semestre:</strong> ' . htmlspecialchars($semestreNombre, ENT_QUOTES, 'UTF-8') . '<br>
        <strong>Fecha de generación:</strong> ' . date('d/m/Y H:i') . '<br>
        <strong>Total de estudiantes:</strong> ' . count($estudiantes) . '
    </div>
    
    <table class="tabla-estudiantes">
        <thead>
            <tr>
                <th style="width: 6%;">N°</th>
                <th style="width: 12%;">Código</th>
                <th style="width: 40%;">Nombres y Apellidos</th>
                <th style="width: 14%;">S. Académica</th>
                <th style="width: 14%;">S. Personal</th>
                <th style="width: 14%;">S. Profesional</th>
            </tr>
        </thead>
        <tbody>
            ' . $filasHTML . '
        </tbody>
    </table>
    
    <div class="firma-section">
        <div class="firma-line">' . htmlspecialchars($nombreTutor, ENT_QUOTES, 'UTF-8') . '</div>
        <div style="font-size: 8pt; color: #666; margin-top: 5px;">Firma del Tutor</div>
    </div>
    
    <div class="footer">
        <p>Sistema de Tutorías UNSAAC</p>
    </div>
</body>
</html>';

        error_log("[generar-reporte-estudiantes.php] HTML construido, generando PDF...");
        
        $html2pdf = new Html2Pdf('P', 'A4', 'es', true, 'UTF-8', [15, 15, 15, 15]);
        $html2pdf->pdf->SetDisplayMode('fullpage');
        $html2pdf->pdf->SetTitle('Reporte de Estudiantes - Tutorías');
        $html2pdf->pdf->SetAuthor('Sistema de Tutorías UNSAAC');
        
        $html2pdf->writeHTML($html);
        $pdfData = $html2pdf->output('', 'S');
        
        error_log("[generar-reporte-estudiantes.php] PDF generado: " . strlen($pdfData) . " bytes");
        
        return $pdfData;
        
    } catch (Exception $e) {
        error_log("[generar-reporte-estudiantes.php] ERROR al generar PDF: " . $e->getMessage());
        throw $e;
    }
}
