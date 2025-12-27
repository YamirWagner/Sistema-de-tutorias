<?php
/**
 * API: Generador de PDF de Constancias - Sistema de Tutorías UNSAAC
 * Genera constancias en PDF para estudiantes que completaron las 3 sesiones
 * Usa HTML2PDF para convertir HTML/CSS a PDF
 */

// CRÍTICO: Suprimir TODA salida antes del PDF
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../storage/logs/generar-pdf-errors.log');

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
error_log("[generar-pdf.php] === INICIO REQUEST ===");
error_log("[generar-pdf.php] Método: " . $_SERVER['REQUEST_METHOD']);
error_log("[generar-pdf.php] URI: " . $_SERVER['REQUEST_URI']);
$headers = getallheaders();
error_log("[generar-pdf.php] Headers recibidos: " . json_encode($headers));

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
                error_log("[constancia.php] Token obtenido manualmente del header Authorization");
            }
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
                error_log("[constancia.php] Token obtenido manualmente del header authorization (lowercase)");
            }
        }
    }
    
    if (!$token) {
        error_log("[constancia.php] Token no encontrado en ningún header");
        http_response_code(401);
        echo json_encode(['error' => 'Token no proporcionado', 'headers' => array_keys(getallheaders())]);
        exit;
    }
    
    $payload = JWT::decode($token);
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Control de actividad
    Activity::enforceAndTouch($db, $payload);
    
    // Verificar rol de tutor o administrador
    $role = strtolower($payload['role'] ?? '');
    $isAdmin = ($role === 'admin' || $role === 'administrador');
    $isTutor = ($role === 'tutor');
    
    // Log para debugging
    error_log("[constancia.php] Rol del usuario: " . $role . " | isAdmin: " . ($isAdmin ? 'SI' : 'NO') . " | isTutor: " . ($isTutor ? 'SI' : 'NO'));
    
    if (!$isTutor && !$isAdmin) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado', 'message' => 'Solo tutores y administradores pueden generar constancias', 'role' => $role]);
        exit;
    }
    
    $tutorId = $payload['user_id'] ?? null;
    
    if (!$tutorId) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de usuario no encontrado en el token']);
        exit;
    }
    
    // Obtener ID del estudiante
    $estudianteId = $_GET['estudianteId'] ?? null;
    
    if (!$estudianteId) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de estudiante no proporcionado']);
        exit;
    }
    
    // Verificar parámetros adicionales
    $firmar = isset($_GET['firmar']) && $_GET['firmar'] == '1';
    $guardar = isset($_GET['guardar']) && $_GET['guardar'] == '1';
    
    error_log("[constancia.php] Generando constancia - Tutor/User ID: $tutorId, Estudiante ID: $estudianteId, Firmar: " . ($firmar ? 'SI' : 'NO') . ", Guardar: " . ($guardar ? 'SI' : 'NO'));
    
    // Si solo es para guardar, no generar PDF
    if ($guardar && !$firmar) {
        guardarConstanciaEnBD($db, $tutorId, $estudianteId, $isAdmin);
        exit;
    }
    
    // Generar constancia
    generarConstanciaPDF($db, $tutorId, $estudianteId, $isAdmin, $firmar);
    
} catch (Exception $e) {
    // Limpiar cualquier buffer antes de enviar el error
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    error_log("[generar-pdf.php] ERROR CRÍTICO: " . $e->getMessage());
    error_log("[generar-pdf.php] Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Error interno del servidor',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
    exit;
}

/**
 * Generar PDF de constancia individual
 */
function generarConstanciaPDF($db, $userId, $estudianteId, $isAdmin = false, $firmar = false) {
    try {
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
        error_log("[constancia.php] Semestre activo: {$semestre['nombre']} (ID: $semestreId)");
        
        // Si es admin, buscar la asignación del estudiante (cualquier tutor)
        // Si es tutor, verificar que el estudiante esté asignado a él
        if ($isAdmin) {
            $queryAsignacion = "SELECT a.id, a.idTutor 
                               FROM asignaciontutor a
                               WHERE a.idEstudiante = :estudiante_id
                                 AND a.idSemestre = :semestre_id
                                 AND a.estado = 'Activa'
                               LIMIT 1";
            
            $stmtAsig = $db->prepare($queryAsignacion);
            $stmtAsig->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
            $stmtAsig->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
            $stmtAsig->execute();
            $asignacion = $stmtAsig->fetch(PDO::FETCH_ASSOC);
            
            if (!$asignacion) {
                http_response_code(404);
                echo json_encode(['error' => 'El estudiante no tiene asignación activa en el semestre actual']);
                exit;
            }
            
            // Usar el tutor de la asignación
            $tutorId = $asignacion['idTutor'];
            error_log("[constancia.php] Admin generando constancia - Tutor asignado ID: $tutorId");
        } else {
            // Tutor: verificar que el estudiante esté asignado a él
            $queryAsignacion = "SELECT a.id 
                               FROM asignaciontutor a
                               WHERE a.idTutor = :tutor_id
                                 AND a.idEstudiante = :estudiante_id
                                 AND a.idSemestre = :semestre_id
                                 AND a.estado = 'Activa'";
            
            $stmtAsig = $db->prepare($queryAsignacion);
            $stmtAsig->bindParam(':tutor_id', $userId, PDO::PARAM_INT);
            $stmtAsig->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
            $stmtAsig->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
            $stmtAsig->execute();
            $asignacion = $stmtAsig->fetch(PDO::FETCH_ASSOC);
            
            if (!$asignacion) {
                error_log("[constancia.php] ERROR - Estudiante $estudianteId no asignado al tutor $userId en semestre $semestreId");
                http_response_code(403);
                echo json_encode(['error' => 'Estudiante no asignado a este tutor', 'tutorId' => $userId, 'estudianteId' => $estudianteId]);
                exit;
            }
            
            $tutorId = $userId;
            error_log("[constancia.php] Tutor generando su propia constancia - Tutor ID: $tutorId");
        }
        
        $asignacionId = $asignacion['id'];
        
        // Obtener datos del estudiante
        $queryEstudiante = "SELECT codigo, nombres, apellidos, correo, semestre
                           FROM estudiante
                           WHERE id = :estudiante_id";
        
        $stmtEst = $db->prepare($queryEstudiante);
        $stmtEst->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtEst->execute();
        $estudiante = $stmtEst->fetch(PDO::FETCH_ASSOC);
        
        if (!$estudiante) {
            http_response_code(404);
            echo 'Estudiante no encontrado';
            exit;
        }
        
        // Obtener datos del tutor
        $queryTutor = "SELECT nombres, apellidos FROM usuariosistema WHERE id = :tutor_id";
        $stmtTutor = $db->prepare($queryTutor);
        $stmtTutor->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
        $stmtTutor->execute();
        $tutor = $stmtTutor->fetch(PDO::FETCH_ASSOC);
        
        // Verificar si ya existe constancia firmada en la BD
        $queryConstancia = "SELECT firmado, fechaFirma FROM constancia 
                           WHERE idEstudiante = :estudiante_id 
                             AND idAsignacion = :asignacion_id 
                             AND idSemestre = :semestre_id 
                             AND estado = 'Activo'
                           LIMIT 1";
        
        $stmtConstancia = $db->prepare($queryConstancia);
        $stmtConstancia->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtConstancia->bindParam(':asignacion_id', $asignacionId, PDO::PARAM_INT);
        $stmtConstancia->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
        $stmtConstancia->execute();
        $constanciaExistente = $stmtConstancia->fetch(PDO::FETCH_ASSOC);
        
        // Si existe constancia firmada, usar esa fecha; si no, usar fecha actual si se está firmando
        $fechaFirmaReal = null;
        $estaFirmada = false;
        
        if ($constanciaExistente && $constanciaExistente['firmado'] == 1 && $constanciaExistente['fechaFirma']) {
            $fechaFirmaReal = $constanciaExistente['fechaFirma'];
            $estaFirmada = true;
            error_log("[constancia.php] Constancia ya firmada en BD, usando fecha: $fechaFirmaReal");
        } elseif ($firmar) {
            $fechaFirmaReal = date('Y-m-d H:i:s');
            $estaFirmada = true;
            error_log("[constancia.php] Firmando por primera vez, fecha actual: $fechaFirmaReal");
        }
        
                // Obtener sesiones realizadas por tipo (incluye modalidad para mostrar en la constancia)
                $querySesiones = "SELECT tipo, fecha, horaInicio, horaFin, modalidad, observaciones
                         FROM tutoria
                         WHERE idAsignacion = :asignacion_id
                           AND estado = 'Realizada'
                         ORDER BY fecha ASC, horaInicio ASC";
        
        $stmtSesiones = $db->prepare($querySesiones);
        $stmtSesiones->bindParam(':asignacion_id', $asignacionId, PDO::PARAM_INT);
        $stmtSesiones->execute();
        $sesiones = $stmtSesiones->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("[constancia.php] Sesiones encontradas para asignación $asignacionId: " . count($sesiones));
        
        // Organizar sesiones por tipo
        $sesionesAcademica = [];
        $sesionesPersonal = [];
        $sesionesProfesional = [];
        
        foreach ($sesiones as $sesion) {
            error_log("[constancia.php]   - Sesión tipo: {$sesion['tipo']}, fecha: {$sesion['fecha']}, modalidad: " . ($sesion['modalidad'] ?? 'N/A'));
            switch ($sesion['tipo']) {
                case 'Academica':
                    $sesionesAcademica[] = $sesion;
                    break;
                case 'Personal':
                    $sesionesPersonal[] = $sesion;
                    break;
                case 'Profesional':
                    $sesionesProfesional[] = $sesion;
                    break;
            }
        }
        
        error_log("[constancia.php] Sesiones por tipo - Académica: " . count($sesionesAcademica) . ", Personal: " . count($sesionesPersonal) . ", Profesional: " . count($sesionesProfesional));
        
        // Verificar que tenga las 3 sesiones
        if (empty($sesionesAcademica) || empty($sesionesPersonal) || empty($sesionesProfesional)) {
            $faltantes = [];
            if (empty($sesionesAcademica)) $faltantes[] = 'Académica';
            if (empty($sesionesPersonal)) $faltantes[] = 'Personal';
            if (empty($sesionesProfesional)) $faltantes[] = 'Profesional';
            
            $mensajeFaltantes = implode(', ', $faltantes);
            error_log("[constancia.php] ERROR - Sesiones faltantes: $mensajeFaltantes");
            
            http_response_code(400);
            echo json_encode([
                'error' => 'El estudiante no ha completado las 3 sesiones obligatorias',
                'faltantes' => $faltantes,
                'completadas' => [
                    'academica' => count($sesionesAcademica),
                    'personal' => count($sesionesPersonal),
                    'profesional' => count($sesionesProfesional)
                ]
            ]);
            exit;
        }
        
        // Cargar plantilla JSON
        $templatePath = __DIR__ . '/../storage/constancia_individual_template.json';
        $template = null;
        
        if (file_exists($templatePath)) {
            $templateJson = file_get_contents($templatePath);
            $template = json_decode($templateJson, true);
        }
        
        if (!$template) {
            $template = getDefaultTemplate();
        }
        
        // Construir estructura de datos JSON
        $constanciaData = [
            'generatedAt' => date('c'),
            'semestre' => $semestre['nombre'],
            'tutorId' => $tutorId,
            'estudianteId' => $estudianteId,
            'header' => $template['header'],
            'estudiante' => [
                'nombreCompleto' => trim($estudiante['nombres'] . ' ' . $estudiante['apellidos']),
                'codigo' => $estudiante['codigo'],
                'correo' => $estudiante['correo'],
                'semestre' => $estudiante['semestre']
            ],
            'areas' => [
                'Academica' => [
                    'nombre' => 'Área 1 - Académico',
                    'fecha' => !empty($sesionesAcademica) ? formatearFechaHora($sesionesAcademica[0]) : '',
                    'modalidad' => !empty($sesionesAcademica) && !empty($sesionesAcademica[0]['modalidad']) ? $sesionesAcademica[0]['modalidad'] : '',
                    'descripcion' => !empty($sesionesAcademica) ? extraerDescripcion($sesionesAcademica[0]['observaciones']) : '',
                    'observaciones' => !empty($sesionesAcademica) ? extraerObservaciones($sesionesAcademica[0]['observaciones']) : ''
                ],
                'Personal' => [
                    'nombre' => 'Área 2 - Personal',
                    'fecha' => !empty($sesionesPersonal) ? formatearFechaHora($sesionesPersonal[0]) : '',
                    'modalidad' => !empty($sesionesPersonal) && !empty($sesionesPersonal[0]['modalidad']) ? $sesionesPersonal[0]['modalidad'] : '',
                    'descripcion' => !empty($sesionesPersonal) ? extraerDescripcion($sesionesPersonal[0]['observaciones']) : '',
                    'observaciones' => !empty($sesionesPersonal) ? extraerObservaciones($sesionesPersonal[0]['observaciones']) : ''
                ],
                'Profesional' => [
                    'nombre' => 'Área 3 - Profesional',
                    'fecha' => !empty($sesionesProfesional) ? formatearFechaHora($sesionesProfesional[0]) : '',
                    'modalidad' => !empty($sesionesProfesional) && !empty($sesionesProfesional[0]['modalidad']) ? $sesionesProfesional[0]['modalidad'] : '',
                    'descripcion' => !empty($sesionesProfesional) ? extraerDescripcion($sesionesProfesional[0]['observaciones']) : '',
                    'observaciones' => !empty($sesionesProfesional) ? extraerObservaciones($sesionesProfesional[0]['observaciones']) : ''
                ]
            ],
            'tutor' => [
                'nombreCompleto' => trim($tutor['nombres'] . ' ' . $tutor['apellidos'])
            ],
            'firma' => [
                'firmado' => $estaFirmada,
                'fechaFirma' => $fechaFirmaReal
            ]
        ];
        
        // Guardar JSON para auditoría
        $jsonOutPath = __DIR__ . '/../storage/backups/constancia_' . $estudianteId . '_' . date('Ymd_His') . '.json';
        @file_put_contents($jsonOutPath, json_encode($constanciaData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        
        error_log("[constancia.php] JSON guardado en: $jsonOutPath");
        error_log("[constancia.php] Generando PDF...");
        
        // Generar PDF con HTML2PDF
        $pdfData = generarPDFConHTML2PDF($constanciaData, $template);
        
        // Verificar que el PDF se generó correctamente
        if (empty($pdfData)) {
            throw new Exception("El PDF generado está vacío");
        }
        
        if (strlen($pdfData) < 100) {
            throw new Exception("El PDF generado es demasiado pequeño (" . strlen($pdfData) . " bytes)");
        }
        
        // Verificar que empiece con la firma PDF
        if (substr($pdfData, 0, 4) !== '%PDF') {
            error_log("[constancia.php] ERROR: Los datos no son un PDF válido. Primeros 50 bytes: " . substr($pdfData, 0, 50));
            throw new Exception("Los datos generados no son un PDF válido");
        }
        
        error_log("[constancia.php] PDF generado exitosamente, tamaño: " . strlen($pdfData) . " bytes");
        error_log("[constancia.php] PDF validado correctamente (comienza con %PDF)");
        
        // Guardar PDF en el servidor
        $pdfDirectory = __DIR__ . '/../storage/constancias/';
        if (!is_dir($pdfDirectory)) {
            mkdir($pdfDirectory, 0755, true);
        }
        
        $pdfFileName = 'constancia_' . $estudianteId . '_' . $semestreId . '_' . date('Ymd_His') . '.pdf';
        $pdfFilePath = $pdfDirectory . $pdfFileName;
        $pdfSaved = file_put_contents($pdfFilePath, $pdfData);
        
        if ($pdfSaved === false) {
            error_log("[constancia.php] ERROR: No se pudo guardar el PDF en: $pdfFilePath");
            throw new Exception("Error al guardar el archivo PDF");
        }
        
        error_log("[constancia.php] PDF guardado en: $pdfFilePath");
        
        // Registrar constancia en la base de datos
        $rutaPDFRelativa = 'storage/constancias/' . $pdfFileName;
        
        // Verificar si ya existe una constancia para esta asignación
        $queryExiste = "SELECT id FROM constancia 
                       WHERE idEstudiante = :estudiante_id 
                         AND idAsignacion = :asignacion_id 
                         AND idSemestre = :semestre_id 
                         AND estado = 'Activo'";
        
        $stmtExiste = $db->prepare($queryExiste);
        $stmtExiste->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtExiste->bindParam(':asignacion_id', $asignacionId, PDO::PARAM_INT);
        $stmtExiste->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
        $stmtExiste->execute();
        $constanciaExistente = $stmtExiste->fetch(PDO::FETCH_ASSOC);
        
        if ($constanciaExistente) {
            // Actualizar constancia existente
            if ($firmar) {
                $queryUpdate = "UPDATE constancia 
                               SET rutaPDF = :ruta_pdf, 
                                   fechaGeneracion = NOW(),
                                   firmado = 1,
                                   fechaFirma = NOW(),
                                   updated_at = NOW()
                               WHERE id = :constancia_id";
            } else {
                $queryUpdate = "UPDATE constancia 
                               SET rutaPDF = :ruta_pdf, 
                                   fechaGeneracion = NOW(),
                                   updated_at = NOW()
                               WHERE id = :constancia_id";
            }
            
            $stmtUpdate = $db->prepare($queryUpdate);
            $stmtUpdate->bindParam(':ruta_pdf', $rutaPDFRelativa);
            $stmtUpdate->bindParam(':constancia_id', $constanciaExistente['id'], PDO::PARAM_INT);
            $stmtUpdate->execute();
            
            error_log("[constancia.php] Constancia actualizada en BD, ID: " . $constanciaExistente['id'] . ($firmar ? ' (FIRMADA)' : ''));
        } else {
            // Insertar nueva constancia
            $queryInsert = "INSERT INTO constancia 
                           (idTutor, idEstudiante, idAsignacion, idSemestre, rutaPDF, fechaGeneracion, firmado, fechaFirma) 
                           VALUES 
                           (:tutor_id, :estudiante_id, :asignacion_id, :semestre_id, :ruta_pdf, NOW(), :firmado, " . ($firmar ? 'NOW()' : 'NULL') . ")";
            
            $stmtInsert = $db->prepare($queryInsert);
            $stmtInsert->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
            $stmtInsert->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
            $stmtInsert->bindParam(':asignacion_id', $asignacionId, PDO::PARAM_INT);
            $stmtInsert->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
            $stmtInsert->bindParam(':ruta_pdf', $rutaPDFRelativa);
            $firmadoValue = $firmar ? 1 : 0;
            $stmtInsert->bindParam(':firmado', $firmadoValue, PDO::PARAM_INT);
            $stmtInsert->execute();
            
            $constanciaId = $db->lastInsertId();
            error_log("[constancia.php] Constancia registrada en BD, ID: $constanciaId" . ($firmar ? ' (FIRMADA)' : ''));
        }
        
        // Limpiar cualquier salida previa
        $bufferContent = '';
        while (ob_get_level()) {
            $bufferContent .= ob_get_clean();
        }
        
        if (!empty($bufferContent)) {
            error_log("[constancia.php] ADVERTENCIA: Se encontró contenido en el buffer (" . strlen($bufferContent) . " bytes): " . substr($bufferContent, 0, 100));
        }
        
        // Enviar headers para PDF
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="constancia_' . $estudianteId . '.pdf"');
        header('Content-Length: ' . strlen($pdfData));
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        header('Accept-Ranges: bytes');
        
        error_log("[constancia.php] Headers enviados, enviando contenido PDF...");
        
        // Enviar PDF
        echo $pdfData;
        flush();
        
        error_log("[constancia.php] PDF enviado exitosamente");
        exit;
        
    } catch (Exception $e) {
        error_log("[constancia.php] ERROR en generarConstanciaPDF: " . $e->getMessage());
        error_log("[constancia.php] Stack trace: " . $e->getTraceAsString());
        
        // Limpiar buffer antes de enviar error
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Error al generar constancia',
            'message' => $e->getMessage(),
            'type' => get_class($e)
        ]);
        exit;
    }
}

/**
 * Generar PDF usando HTML2PDF
 */
function generarPDFConHTML2PDF($data, $template) {
    try {
        error_log("[generar-pdf.php] Iniciando generación de PDF con HTML2PDF...");
        
        // Construir HTML limpio directamente (sin cargar archivo con botones)
        // HTML2PDF NO soporta: button, input, script, form
        
        // Preparar datos
        $nombreEstudiante = htmlspecialchars($data['estudiante']['nombreCompleto'] ?? '-', ENT_QUOTES, 'UTF-8');
        $codigoEstudiante = htmlspecialchars($data['estudiante']['codigo'] ?? '-', ENT_QUOTES, 'UTF-8');
        $correoEstudiante = htmlspecialchars($data['estudiante']['correo'] ?? '-', ENT_QUOTES, 'UTF-8');
        $nombreTutor = htmlspecialchars($data['tutor']['nombreCompleto'] ?? '-', ENT_QUOTES, 'UTF-8');
        $semestre = htmlspecialchars($data['semestre'] ?? '', ENT_QUOTES, 'UTF-8');
        
        // Logo en base64
        $logoPath = __DIR__ . '/../../frontend/assets/LogoBarra.png';
        $logoHTML = '';
        if (file_exists($logoPath)) {
            $logoData = file_get_contents($logoPath);
            $logoBase64 = 'data:image/png;base64,' . base64_encode($logoData);
            $logoHTML = '<img src="' . $logoBase64 . '" alt="UNSAAC" class="logo" style="width: 150px;" />';
            error_log("[generar-pdf.php] Logo cargado: " . strlen($logoData) . " bytes");
        } else {
            error_log("[generar-pdf.php] ADVERTENCIA: Logo no encontrado en $logoPath");
        }
        
        // Construir HTML de las áreas
        $areasHTML = '';
        if (!empty($data['areas']) && is_array($data['areas'])) {
            foreach ($data['areas'] as $areaId => $areaData) {
                $areaNombre = htmlspecialchars($areaData['nombre'] ?? 'Área', ENT_QUOTES, 'UTF-8');
                $fecha = htmlspecialchars($areaData['fecha'] ?? '', ENT_QUOTES, 'UTF-8');
                $modalidad = htmlspecialchars($areaData['modalidad'] ?? '', ENT_QUOTES, 'UTF-8');
                $descripcion = htmlspecialchars($areaData['descripcion'] ?? '', ENT_QUOTES, 'UTF-8');
                $observaciones = htmlspecialchars($areaData['observaciones'] ?? '', ENT_QUOTES, 'UTF-8');
                
                // Valores por defecto si están vacíos
                if (empty($fecha)) $fecha = '&nbsp;';
                if (empty($modalidad)) $modalidad = '&nbsp;';
                if (empty($descripcion)) $descripcion = '&nbsp;';
                if (empty($observaciones)) $observaciones = '&nbsp;';
                
                $areasHTML .= '
<div class="area">
    <div class="area-title">' . $areaNombre . '</div>
    <table class="area-table">
        <tr>
            <td class="field-label">Fecha y hora de edición</td>
            <td class="field-value">' . $fecha . '</td>
        </tr>
        <tr>
            <td class="field-label">Modalidad</td>
            <td class="field-value">' . $modalidad . '</td>
        </tr>
        <tr>
            <td class="field-label">Descripción</td>
            <td class="field-value">' . $descripcion . '</td>
        </tr>
        <tr>
            <td class="field-label">Observaciones específicas</td>
            <td class="field-value">' . $observaciones . '</td>
        </tr>
    </table>
</div>';
            }
        } else {
            error_log("[generar-pdf.php] ADVERTENCIA: No hay áreas disponibles");
        }
        
        // Preparar sección de firma desde los datos
        $firmaHTML = '';
        $firmaData = $data['firma'] ?? null;
        
        if ($firmaData && $firmaData['firmado'] && $firmaData['fechaFirma']) {
            // Ya está firmada, usar fecha de la BD
            $fechaFirmaObj = new DateTime($firmaData['fechaFirma']);
            $fechaFirmaFormateada = $fechaFirmaObj->format('d/m/Y H:i');

            // HTML2PDF: el centrado es más estable con tablas + align.
            $firmaHTML = '
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; margin-bottom: 20px;">
        <tr>
            <td align="center">
                <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                        <td align="center" bgcolor="#28a745" style="color: #fff; padding: 5px 18px; font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 12px;">
                            Firmado digitalmente
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding-top: 12px;">
                <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                        <td align="center" style="border-top: 2px solid #333; width: 220px; padding-top: 8px; font-size: 10pt; font-weight: bold; color: #333;">
                            ' . $nombreTutor . '
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding-top: 6px;">
                <span style="font-size: 8pt; color: #666; font-style: italic;">Fecha: ' . $fechaFirmaFormateada . '</span>
            </td>
        </tr>
    </table>';
        } else {
            $firmaHTML = '
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; margin-bottom: 20px;">
        <tr>
            <td align="center">
                <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                        <td align="center" style="border-top: 2px solid #333; width: 200px; padding-top: 8px; font-size: 9pt; color: #555;">
                            Firma del Tutor
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>';
        }
        
        // Construir HTML completo del PDF (sin botones ni elementos no soportados)
        // Optimizado para caber en 1 sola página
        $html = '<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Constancia de Tutoría</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9pt; color: #333; line-height: 1.2; }
        .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #7B1113; }
        .logo { max-width: 100px; height: auto; margin-bottom: 5px; background-color: white; padding: 10px; border-radius: 8px; }
        .header h1 { color: #7B1113; font-size: 14pt; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
        .header h2 { color: #333; font-size: 11pt; font-weight: normal; margin: 3px 0; }
        .content { padding: 10px 20px; }
        .info-section { margin-bottom: 12px; }
        .info-section h3 { color: #7B1113; font-size: 10pt; font-weight: bold; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid #ddd; }
        .info-row { margin: 4px 0; padding: 2px 0; }
        .info-label { font-weight: bold; color: #555; display: inline-block; width: 100px; font-size: 9pt; }
        .info-value { color: #333; display: inline-block; font-size: 9pt; }
        .area { margin: 10px 0; page-break-inside: avoid; }
        .area-title { background: #7B1113; color: white; padding: 5px 10px; font-size: 9pt; font-weight: bold; margin-bottom: 5px; }
        .area-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .area-table td { padding: 4px 6px; border: 1px solid #ddd; font-size: 8pt; vertical-align: top; }
        .field-label { font-weight: bold; background: #f9f9f9; width: 25%; color: #555; }
        .field-value { width: 75%; font-size: 8pt; }
        .footer { margin-top: 15px; padding-top: 8px; border-top: 1px solid #7B1113; text-align: center; font-size: 7pt; color: #666; }
        .signature-section { 
            margin: 30px 0 20px 0; 
            text-align: center; 
            width: 100%; 
            clear: both; 
            display: block;
        }
        .signature-box { 
            margin: 0 auto; 
            text-align: center; 
            display: block;
            width: 100%;
        }
        .firma-digital-badge { 
            background: #28a745; 
            color: white; 
            padding: 5px 18px; 
            border-radius: 12px; 
            font-size: 8pt; 
            font-weight: bold; 
            display: inline-block; 
            margin: 0 auto 12px auto; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
        }
        .signature-line { 
            border-top: 2px solid #333; 
            margin: 0 auto; 
            padding-top: 8px; 
            font-size: 10pt; 
            font-weight: bold; 
            color: #333; 
            width: 220px; 
            display: block; 
            text-align: center;
        }
        .signature-line-simple {
            border-top: 2px solid #333; 
            margin: 0 auto; 
            padding-top: 8px; 
            font-size: 9pt; 
            color: #555; 
            width: 200px; 
            display: block; 
            text-align: center;
        }
        .signature-date { 
            font-size: 8pt; 
            color: #666; 
            margin-top: 6px; 
            font-style: italic; 
            text-align: center;
            display: block;
        }
    </style>
</head>
<body>
    <div class="header">
        ' . $logoHTML . '
        <h1>Universidad Nacional de San Antonio Abad del Cusco</h1>
        <h2>Constancia de Tutoría</h2>
    </div>
    <div class="content">
        <div class="info-section">
            <h3>Información del Estudiante</h3>
            <div class="info-row">
                <span class="info-label">Estudiante:</span>
                <span class="info-value">' . $nombreEstudiante . '</span>
            </div>
            <div class="info-row">
                <span class="info-label">Código:</span>
                <span class="info-value">' . $codigoEstudiante . '</span>
            </div>
            <div class="info-row">
                <span class="info-label">Correo:</span>
                <span class="info-value">' . $correoEstudiante . '</span>
            </div>
        </div>
        <div class="info-section">
            <h3>Sesiones de Tutoría Realizadas</h3>
            ' . $areasHTML . '
        </div>
    </div>
    ' . $firmaHTML . '
    <div class="footer">
        <p>Sistema de Tutorías UNSAAC - Generado el ' . date('d/m/Y H:i') . '</p>
    </div>
</body>
</html>';

        error_log("[generar-pdf.php] HTML construido (" . strlen($html) . " bytes), generando PDF...");
        
        // Crear instancia de HTML2PDF con configuración optimizada
        $html2pdf = new Html2Pdf('P', 'A4', 'es', true, 'UTF-8', [15, 15, 15, 15]);
        
        // Configuraciones adicionales para mejor renderizado
        $html2pdf->pdf->SetDisplayMode('fullpage');
        $html2pdf->pdf->SetTitle('Constancia de Tutoría - ' . $nombreEstudiante);
        $html2pdf->pdf->SetAuthor('Sistema de Tutorías UNSAAC');
        
        error_log("[generar-pdf.php] Procesando HTML con HTML2PDF...");
        $html2pdf->writeHTML($html);
        
        error_log("[generar-pdf.php] Generando salida PDF...");
        
        // Generar PDF
        $pdfData = $html2pdf->output('', 'S');
        
        error_log("[generar-pdf.php] PDF generado exitosamente, tamaño: " . strlen($pdfData) . " bytes");
        
        return $pdfData;
        
    } catch (Exception $e) {
        error_log("[generar-pdf.php] ERROR al generar PDF: " . $e->getMessage());
        error_log("[generar-pdf.php] Tipo: " . get_class($e));
        error_log("[generar-pdf.php] Stack: " . $e->getTraceAsString());
        throw $e;
    }
}

/**
 * Formatear fecha y hora de una sesión
 */
function formatearFechaHora($sesion) {
    if (empty($sesion) || !is_array($sesion)) {
        return '';
    }
    
    $fecha = $sesion['fecha'] ?? '';
    $horaInicio = $sesion['horaInicio'] ?? '';
    
    if (empty($fecha)) {
        return '';
    }
    
    // Formatear fecha (ej: 2025-12-27 -> 27/12/2025)
    $fechaObj = DateTime::createFromFormat('Y-m-d', $fecha);
    if ($fechaObj) {
        $fechaFormateada = $fechaObj->format('d/m/Y');
    } else {
        $fechaFormateada = $fecha;
    }
    
    // Si hay hora de inicio, agregarla
    if (!empty($horaInicio)) {
        // Formatear hora (ej: 14:30:00 -> 14:30)
        $horaFormateada = substr($horaInicio, 0, 5);
        return $fechaFormateada . ' ' . $horaFormateada;
    }
    
    return $fechaFormateada;
}

/**
 * Extraer descripción de sesión
 */
function extraerDescripcion($sesion) {
    if ($sesion === null || $sesion === '') return '';

    // Si llega como array (por compatibilidad)
    if (is_array($sesion)) {
        if (!empty($sesion['descripcion'])) return (string)$sesion['descripcion'];
        if (!empty($sesion['observaciones'])) $sesion = (string)$sesion['observaciones'];
        else return '';
    }

    $text = (string)$sesion;
    $obs = json_decode($text, true);
    if (is_array($obs)) {
        $campos = ['temaPrincipal', 'contenidoEspecifico', 'situacionPersonal', 'estadoEmocional', 'temaProfesional', 'descripcionTema'];
        foreach ($campos as $campo) {
            if (!empty($obs[$campo])) {
                return mb_substr((string)$obs[$campo], 0, 220);
            }
        }
    }

    return mb_substr($text, 0, 220);
}

/**
 * Extraer observaciones de sesión
 */
function extraerObservaciones($sesion) {
    if ($sesion === null || $sesion === '') return '';

    // Si llega como array (por compatibilidad)
    if (is_array($sesion)) {
        if (!empty($sesion['observaciones'])) $sesion = (string)$sesion['observaciones'];
        else return '';
    }

    $text = (string)$sesion;
    $obs = json_decode($text, true);
    if (is_array($obs)) {
        $campos = ['observacionesDesempeno', 'observacionesPersonales', 'observacionesProfesionales', 'notasAdicionales'];
        foreach ($campos as $campo) {
            if (!empty($obs[$campo])) {
                return mb_substr((string)$obs[$campo], 0, 220);
            }
        }
    }

    return mb_substr($text, 0, 220);
}

/**
 * Guardar constancia en la BD sin generar PDF
 */
function guardarConstanciaEnBD($db, $userId, $estudianteId, $isAdmin = false) {
    try {
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
        
        // Obtener asignación y tutor
        if ($isAdmin) {
            $queryAsignacion = "SELECT a.id, a.idTutor 
                               FROM asignaciontutor a
                               WHERE a.idEstudiante = :estudiante_id
                                 AND a.idSemestre = :semestre_id
                                 AND a.estado = 'Activa'
                               LIMIT 1";
            
            $stmtAsig = $db->prepare($queryAsignacion);
            $stmtAsig->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
            $stmtAsig->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
            $stmtAsig->execute();
            $asignacion = $stmtAsig->fetch(PDO::FETCH_ASSOC);
            
            if (!$asignacion) {
                http_response_code(404);
                echo json_encode(['error' => 'El estudiante no tiene asignación activa']);
                exit;
            }
            
            $tutorId = $asignacion['idTutor'];
        } else {
            $queryAsignacion = "SELECT a.id 
                               FROM asignaciontutor a
                               WHERE a.idTutor = :tutor_id
                                 AND a.idEstudiante = :estudiante_id
                                 AND a.idSemestre = :semestre_id
                                 AND a.estado = 'Activa'";
            
            $stmtAsig = $db->prepare($queryAsignacion);
            $stmtAsig->bindParam(':tutor_id', $userId, PDO::PARAM_INT);
            $stmtAsig->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
            $stmtAsig->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
            $stmtAsig->execute();
            $asignacion = $stmtAsig->fetch(PDO::FETCH_ASSOC);
            
            if (!$asignacion) {
                http_response_code(403);
                echo json_encode(['error' => 'Estudiante no asignado a este tutor']);
                exit;
            }
            
            $tutorId = $userId;
        }
        
        $asignacionId = $asignacion['id'];
        
        // Verificar que la constancia ya existe en storage
        $pdfDirectory = __DIR__ . '/../storage/constancias/';
        $files = glob($pdfDirectory . 'constancia_' . $estudianteId . '_' . $semestreId . '_*.pdf');
        
        if (empty($files)) {
            http_response_code(400);
            echo json_encode(['error' => 'No se encontró el archivo PDF. Debe generarlo primero.']);
            exit;
        }
        
        // Usar el archivo más reciente
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        $pdfFilePath = $files[0];
        $pdfFileName = basename($pdfFilePath);
        $rutaPDFRelativa = 'storage/constancias/' . $pdfFileName;
        
        // Verificar si ya existe registro en BD
        $queryExiste = "SELECT id FROM constancia 
                       WHERE idEstudiante = :estudiante_id 
                         AND idAsignacion = :asignacion_id 
                         AND idSemestre = :semestre_id 
                         AND estado = 'Activo'";
        
        $stmtExiste = $db->prepare($queryExiste);
        $stmtExiste->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtExiste->bindParam(':asignacion_id', $asignacionId, PDO::PARAM_INT);
        $stmtExiste->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
        $stmtExiste->execute();
        $constanciaExistente = $stmtExiste->fetch(PDO::FETCH_ASSOC);
        
        if ($constanciaExistente) {
            // Ya existe
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'La constancia ya está guardada en la base de datos',
                'constanciaId' => $constanciaExistente['id']
            ]);
            exit;
        }
        
        // Insertar nueva constancia
        $queryInsert = "INSERT INTO constancia 
                       (idTutor, idEstudiante, idAsignacion, idSemestre, rutaPDF, fechaGeneracion) 
                       VALUES 
                       (:tutor_id, :estudiante_id, :asignacion_id, :semestre_id, :ruta_pdf, NOW())";
        
        $stmtInsert = $db->prepare($queryInsert);
        $stmtInsert->bindParam(':tutor_id', $tutorId, PDO::PARAM_INT);
        $stmtInsert->bindParam(':estudiante_id', $estudianteId, PDO::PARAM_INT);
        $stmtInsert->bindParam(':asignacion_id', $asignacionId, PDO::PARAM_INT);
        $stmtInsert->bindParam(':semestre_id', $semestreId, PDO::PARAM_INT);
        $stmtInsert->bindParam(':ruta_pdf', $rutaPDFRelativa);
        $stmtInsert->execute();
        
        $constanciaId = $db->lastInsertId();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Constancia guardada exitosamente en la base de datos',
            'constanciaId' => $constanciaId
        ]);
        exit;
        
    } catch (Exception $e) {
        error_log("[guardar-constancia] ERROR: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'error' => 'Error al guardar constancia',
            'message' => $e->getMessage()
        ]);
        exit;
    }
}

/**
 * Obtener template por defecto
 */
function getDefaultTemplate() {
    return [
        'header' => [
            'title' => 'TUTORIAS UNSAAC - PREVISUALIZACIÓN DE LA CONSTANCIA DE TUTORADO',
            'subtitle' => 'Constancia de Tutoría',
            'logoPath' => 'frontend/assets/Logo-UNSAAC.webp'
        ]
    ];
}

