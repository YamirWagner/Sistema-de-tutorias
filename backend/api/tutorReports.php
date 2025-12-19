<?php
// tutorReports.php - Generación de PDFs para reportes y constancias (usa TCPDF)
require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';

// Cargar TCPDF
require_once __DIR__ . '/../../TCPDF/tcpdf.php';

try {
    $token = JWT::getBearerToken();
    if (!$token) { http_response_code(401); echo 'Token no proporcionado'; exit; }
    $payload = JWT::decode($token);
    if (!$payload) { http_response_code(401); echo 'Token inválido'; exit; }
    if (strtolower($payload['role'] ?? '') !== 'tutor') { http_response_code(403); echo 'Acceso denegado'; exit; }

    $tutorId = $payload['user_id'];
    $action = $_GET['action'] ?? '';

    $db = (new Database())->getConnection();

    switch ($action) {
        case 'list':
            generateListPdf($db, $tutorId);
            break;
        case 'constancia':
            $estudianteId = $_GET['estudianteId'] ?? null;
            if (!$estudianteId) { http_response_code(400); echo 'estudianteId requerido'; exit; }
            generateConstanciaPdf($db, $tutorId, $estudianteId);
            break;
        default:
            http_response_code(400); echo 'Acción no válida';
    }

} catch (Exception $e) {
    error_log('Error en tutorReports.php: '.$e->getMessage());
    http_response_code(500); echo 'Error interno';
}

function generateListPdf($db, $tutorId) {
    try {
        // Obtener semestre activo
        $stmtSem = $db->query("SELECT id, nombre FROM semestre WHERE estado='Activo' ORDER BY fechaInicio DESC LIMIT 1");
        $sem = $stmtSem->fetch(PDO::FETCH_ASSOC);
        $semId = $sem['id'] ?? null;

        // Obtener estudiantes que completaron >=3 sesiones
        $sql = "SELECT e.codigo AS codigo, CONCAT(e.nombres, ' ', e.apellidos) AS nombre, MAX(t.fecha) AS fecha_ultima, COUNT(t.id) AS sesiones
                FROM asignaciontutor a
                JOIN estudiante e ON a.idEstudiante = e.id
                JOIN tutoria t ON t.idAsignacion = a.id AND t.estado = 'Realizada'
                WHERE a.idTutor = :tutorId AND a.estado='Activa'";
        if ($semId) $sql .= " AND a.idSemestre = :semId";
        $sql .= " GROUP BY e.id HAVING COUNT(t.id) >= 3 ORDER BY e.apellidos";

        $stmt = $db->prepare($sql);
        $params = [':tutorId' => $tutorId];
        if ($semId) $params[':semId'] = $semId;
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Generar PDF con TCPDF
        $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->SetCreator('Sistema de Tutorías');
        $pdf->SetAuthor('UNSAAC');
        $pdf->SetTitle('Reporte de estudiantes que pasaron tutoría');
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->AddPage();

        // Header
        $logo = __DIR__ . '/../../frontend/assets/Logo-UNSAAC.webp';
        if (file_exists($logo)) $pdf->Image($logo, 10, 8, 30);
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetXY(50, 10);
        $pdf->Cell(0, 6, 'TUTORIAS UNSAAC - REPORTE DE ESTUDIANTES QUE PASARON TUTORÍA', 0, 1, 'L');
        $pdf->Ln(8);

        // Table header
        $html = '<table border="1" cellpadding="4">';
        $html .= '<tr style="font-weight:bold; background-color:#e6e6e6;"><th width="20%">Código</th><th width="60%">Nombre del estudiante</th><th width="20%">Fecha</th></tr>';

        foreach ($rows as $r) {
            $fecha = $r['fecha_ultima'] ? date('d/m/Y', strtotime($r['fecha_ultima'])) : '';
            $html .= '<tr><td align="center">'.htmlspecialchars($r['codigo']).'</td><td>'.htmlspecialchars($r['nombre']).'</td><td align="center">'.$fecha.'</td></tr>';
        }

        $html .= '</table>';
        $pdf->writeHTML($html, true, false, false, false, '');

        // Output PDF
        $pdfData = $pdf->Output('', 'S');
        header('Content-Type: application/pdf');
        header('Content-Length: ' . strlen($pdfData));
        echo $pdfData;
        exit;

    } catch (Exception $e) {
        error_log('Error generateListPdf: '.$e->getMessage());
        http_response_code(500); echo 'Error generando PDF'; exit;
    }
}

function generateConstanciaPdf($db, $tutorId, $estudianteId) {
    try {
        // Verificar asignación
        $stmtA = $db->prepare("SELECT a.id, a.idSemestre FROM asignaciontutor a WHERE a.idTutor = :tutor AND a.idEstudiante = :est AND a.estado='Activa' LIMIT 1");
        $stmtA->execute([':tutor' => $tutorId, ':est' => $estudianteId]);
        $asig = $stmtA->fetch(PDO::FETCH_ASSOC);
        if (!$asig) { http_response_code(403); echo 'Estudiante no asignado al tutor'; exit; }

        // Obtener estudiante
        $stmtE = $db->prepare("SELECT codigo, nombres, apellidos FROM estudiante WHERE id = :id LIMIT 1");
        $stmtE->execute([':id' => $estudianteId]);
        $est = $stmtE->fetch(PDO::FETCH_ASSOC);
        if (!$est) { http_response_code(404); echo 'Estudiante no encontrado'; exit; }

        // Obtener sesiones realizadas por tipo
        $stmtS = $db->prepare("SELECT tipo AS tipoTutoria, fecha, observaciones FROM tutoria t WHERE t.idAsignacion = :asigId AND t.estado = 'Realizada' ORDER BY t.fecha ASC");
        $stmtS->execute([':asigId' => $asig['id']]);
        $sesiones = $stmtS->fetchAll(PDO::FETCH_ASSOC);

        $areas = ['Académica' => [], 'Personal' => [], 'Profesional' => []];
        foreach ($sesiones as $s) {
            $tipo = $s['tipoTutoria'] ?? $s['tipo'] ?? 'Académica';
            if (!isset($areas[$tipo])) $areas[$tipo] = [];
            $areas[$tipo][] = $s;
        }

        // Obtener tutor
        $stmtT = $db->prepare("SELECT nombres, apellidos FROM usuariosistema WHERE id = :id LIMIT 1");
        $stmtT->execute([':id' => $tutorId]);
        $tutor = $stmtT->fetch(PDO::FETCH_ASSOC);

        // Generar PDF
        $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->SetCreator('Sistema de Tutorías');
        $pdf->SetTitle('Constancia de Tutoría');
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->AddPage();

        $logo = __DIR__ . '/../../frontend/assets/Logo-UNSAAC.webp';
        if (file_exists($logo)) $pdf->Image($logo, 10, 8, 30);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->SetXY(50, 10);
        $pdf->Cell(0, 6, 'TUTORIAS UNSAAC - PREVISUALIZACIÓN DE LA CONSTANCIA DE TUTORADO', 0, 1, 'L');
        $pdf->Ln(6);

        $pdf->SetFont('helvetica', '', 11);
        $pdf->Cell(0, 6, 'Nombre del estudiante: ' . trim($est['nombres'].' '.$est['apellidos']), 0, 1);
        $pdf->Ln(4);

        // Areas
        foreach (['Académica','Personal','Profesional'] as $area) {
            $pdf->SetFillColor(123,31,31);
            $pdf->SetTextColor(255,255,255);
            $pdf->SetFont('helvetica','B',11);
            $pdf->Cell(0, 8, ' Area - '.$area, 0, 1, 'L', 1);

            $pdf->SetFont('helvetica','',10);
            $pdf->SetTextColor(0,0,0);
            // mostrar la primera sesión si existe
            if (!empty($areas[$area])) {
                $s = $areas[$area][0];
                $fecha = $s['fecha'] ? date('d/m/Y H:i', strtotime($s['fecha'])) : '';
                $pdf->Cell(0,6, 'Fecha y hora de edición: ' . $fecha, 0, 1);
                $pdf->Cell(0,6, 'Descripción: ' . ($s['observaciones'] ?? ''), 0, 1);
            } else {
                $pdf->Cell(0,6, 'Fecha y hora de edición: ', 0, 1);
                $pdf->Cell(0,6, 'Descripción: ', 0, 1);
            }
            $pdf->Ln(4);
        }

        $pdf->Ln(6);
        $pdf->Cell(0, 30, 'Panel para observaciones del tutor:', 0, 1);
        $pdf->Ln(16);

        $pdf->Cell(0,6, 'Tutor: ' . ($tutor['nombres'].' '.$tutor['apellidos']), 0, 1, 'C');

        $pdfData = $pdf->Output('', 'S');
        header('Content-Type: application/pdf');
        header('Content-Length: ' . strlen($pdfData));
        echo $pdfData;
        exit;

    } catch (Exception $e) {
        error_log('Error generateConstanciaPdf: '.$e->getMessage());
        http_response_code(500); echo 'Error generando constancia'; exit;
    }
}
