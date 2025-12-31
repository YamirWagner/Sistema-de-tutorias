<?php
/**
 * API para gestión de sesiones de tutoría
 * 
 * Endpoints:
 * - GET detalle: Obtiene detalles de una sesión específica
 * - POST registrar-academica/personal/profesional: Guardado parcial
 * - POST registrar-final: Finalización de tutoría
 * - PUT posponer: Reprogramar sesión
 * 
 * Seguridad:
 * - Validación JWT
 * - Verificación de permisos por tutor
 * - Protección contra edición de tutorías finalizadas
 * - Transacciones para integridad de datos
 * 
 * @version 2.0
 * @date 2025-12-23
 * @optimizado Mejor manejo de errores, validaciones reforzadas
 */

require_once __DIR__ . '/../core/config.php';
require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/jwt.php';
require_once __DIR__ . '/../core/activity.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../storage/logs/atencion_debug.log');

try {
    $token = JWT::getBearerToken();
    if (!$token) Response::unauthorized('Token no proporcionado');
    
    $payload = JWT::decode($token);
    $database = new Database();
    $db = $database->getConnection();
    Activity::enforceAndTouch($db, $payload);
    
    $role = strtolower($payload['role'] ?? '');
    if ($role !== 'tutor') Response::forbidden('Acceso denegado - Solo tutores');
    
    $tutorId = $payload['user_id'] ?? null;
    if (!$tutorId) Response::error('ID de tutor no encontrado');
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    switch ($method) {
        case 'GET':
            if ($action === 'detalle') obtenerDetalleSesion($db, $tutorId);
            else Response::error('Acción no válida', 400);
            break;
            
        case 'POST':
            // Verificar si viene FormData con archivos
            if (!empty($_FILES)) {
                // Viene FormData (archivos + datos JSON)
                $datosJSON = $_POST['datos'] ?? null;
                if (!$datosJSON) Response::error('Datos no proporcionados', 400);
                
                $data = json_decode($datosJSON, true);
                if (!$data) Response::error('Datos JSON no válidos', 400);
                
                error_log("FormData recibido - Archivos: " . count($_FILES));
            } else {
                // Viene JSON puro (sin archivos)
                $data = json_decode(file_get_contents('php://input'), true);
                if (!$data) Response::error('Datos no válidos', 400);
            }
            
            if (in_array($action, ['registrar-academica', 'registrar-personal', 'registrar-profesional'])) {
                guardarParcial($db, $tutorId, $data);
            } elseif ($action === 'registrar-final') {
                registrarSesionFinal($db, $tutorId, $data);
            } else {
                Response::error('Acción no válida', 400);
            }
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) Response::error('Datos no válidos', 400);
            
            if ($action === 'posponer') posponerSesion($db, $tutorId, $data);
            else Response::error('Acción no válida', 400);
            break;
            
        default:
            Response::error('Método no permitido', 405);
    }
    
} catch (Exception $e) {
    error_log("Error en atenciontutoria.php: " . $e->getMessage());
    Response::error($e->getMessage(), 500);
}

function obtenerDetalleSesion($db, $tutorId) {
    try {
        $idSesion = $_GET['id'] ?? null;
        if (!$idSesion) Response::error('ID de sesión no proporcionado', 400);
        
        $query = "SELECT 
                    t.id,
                    t.fecha,
                    t.horaInicio,
                    t.horaFin,
                    t.tipo AS tipoTutoria,
                    t.modalidad,
                    t.estado,
                    t.observaciones,
                    e.codigo AS estudianteCodigo,
                    e.nombres AS estudianteNombres,
                    e.apellidos AS estudianteApellidos,
                    e.correo AS estudianteEmail
                  FROM tutoria t
                  INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
                  INNER JOIN estudiante e ON at.idEstudiante = e.id
                  WHERE t.id = :idSesion 
                    AND at.idTutor = :tutorId
                    AND t.estado IN ('Programada', 'Reprogramada', 'Realizando', 'Realizada')";
        
        $stmt = $db->prepare($query);
        $stmt->execute([':idSesion' => $idSesion, ':tutorId' => $tutorId]);
        
        $sesion = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$sesion) Response::error('Sesión no encontrada', 404);
        
        Response::success($sesion, 'Detalles obtenidos');
        
    } catch (Exception $e) {
        error_log("Error en obtenerDetalleSesion: " . $e->getMessage());
        Response::error('Error: ' . $e->getMessage(), 500);
    }
}

function posponerSesion($db, $tutorId, $data) {
    try {
        $idSesion = $data['id'] ?? null;
        $nuevaFecha = $data['fecha'] ?? null;
        $nuevaHoraInicio = $data['horaInicio'] ?? null;
        $nuevaHoraFin = $data['horaFin'] ?? null;
        
        if (!$idSesion || !$nuevaFecha || !$nuevaHoraInicio || !$nuevaHoraFin) {
            Response::error('Datos incompletos', 400);
        }
        
        $queryVerify = "SELECT t.id 
                        FROM tutoria t
                        INNER JOIN asignaciontutor at ON t.idAsignacion = at.id
                        WHERE t.id = :idSesion AND at.idTutor = :tutorId";
        
        $stmtVerify = $db->prepare($queryVerify);
        $stmtVerify->execute([':idSesion' => $idSesion, ':tutorId' => $tutorId]);
        
        if (!$stmtVerify->fetch()) Response::forbidden('Sin permisos');
        
        $query = "UPDATE tutoria 
                  SET fecha = :fecha,
                      horaInicio = :horaInicio,
                      horaFin = :horaFin,
                      estado = 'Reprogramada'
                  WHERE id = :id";
        
        $stmt = $db->prepare($query);
        $resultado = $stmt->execute([
            ':id' => $idSesion,
            ':fecha' => $nuevaFecha,
            ':horaInicio' => $nuevaHoraInicio,
            ':horaFin' => $nuevaHoraFin
        ]);
        
        if ($resultado) Response::success(['id' => $idSesion], 'Sesión pospuesta');
        else Response::error('Error al posponer', 500);
        
    } catch (Exception $e) {
        error_log("Error en posponerSesion: " . $e->getMessage());
        Response::error('Error: ' . $e->getMessage(), 500);
    }
}

function guardarParcial($db, $tutorId, $data) {
    try {
        $idTutoria = $data['idTutoria'] ?? null;
        if (!$idTutoria) Response::error('ID de tutoría no proporcionado', 400);
        
        $queryVerify = "SELECT t.id, t.idAsignacion, t.estado, at.idTutor
                        FROM tutoria t
                        LEFT JOIN asignaciontutor at ON t.idAsignacion = at.id
                        WHERE t.id = :idTutoria";
        
        $stmtVerify = $db->prepare($queryVerify);
        $stmtVerify->execute([':idTutoria' => $idTutoria]);
        
        $result = $stmtVerify->fetch();
        
        if (!$result) {
            Response::error('Tutoría no encontrada', 404);
        }
        
        if ($result['idTutor'] != $tutorId) {
            Response::forbidden('Sin permisos para esta tutoría');
        }
        
        if ($result['estado'] === 'Realizada') {
            Response::error('No se puede modificar una tutoría ya finalizada', 400);
        }
        
        $db->beginTransaction();
        
        $queryUpdate = "UPDATE tutoria 
                        SET estado = 'Realizando',
                            observaciones = :observaciones
                        WHERE id = :idTutoria";
        
        $stmtUpdate = $db->prepare($queryUpdate);
        $resultado = $stmtUpdate->execute([
            ':idTutoria' => $idTutoria,
            ':observaciones' => json_encode($data, JSON_UNESCAPED_UNICODE)
        ]);
        
        if (!$resultado) {
            throw new Exception('Error al actualizar los datos de la tutoría');
        }
        
        $db->commit();
        
        Response::success(['id' => $idTutoria, 'estado' => 'Realizando'], 'Datos guardados correctamente');
        
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log("Error en guardarParcial: " . $e->getMessage());
        Response::error('Error al guardar: ' . $e->getMessage(), 500);
    }
}

function registrarSesionFinal($db, $tutorId, $data) {
    try {
        // Log detallado de los datos recibidos
        error_log("=========== INICIO registrarSesionFinal ===========");
        error_log("tutorId: $tutorId");
        error_log("idTutoria: " . ($data['idTutoria'] ?? 'NO DEFINIDO'));
        error_log("tipoTutoria: " . ($data['tipoTutoria'] ?? 'NO DEFINIDO'));
        error_log("materialesApoyo presente: " . (isset($data['materialesApoyo']) ? 'SÍ' : 'NO'));
        error_log("recursosRecomendados presente: " . (isset($data['recursosRecomendados']) ? 'SÍ' : 'NO'));
        if (isset($data['materialesApoyo'])) {
            error_log("materialesApoyo tipo: " . gettype($data['materialesApoyo']));
            error_log("materialesApoyo contenido: " . json_encode($data['materialesApoyo'], JSON_UNESCAPED_UNICODE));
        }
        if (isset($data['recursosRecomendados'])) {
            error_log("recursosRecomendados tipo: " . gettype($data['recursosRecomendados']));
            error_log("recursosRecomendados contenido: " . json_encode($data['recursosRecomendados'], JSON_UNESCAPED_UNICODE));
        }
        
        $idTutoria = $data['idTutoria'] ?? null;
        if (!$idTutoria) Response::error('ID de tutoría no proporcionado', 400);
        
        $queryVerify = "SELECT t.id, t.idAsignacion, t.estado, at.idTutor
                        FROM tutoria t
                        LEFT JOIN asignaciontutor at ON t.idAsignacion = at.id
                        WHERE t.id = :idTutoria";
        
        $stmtVerify = $db->prepare($queryVerify);
        $stmtVerify->execute([':idTutoria' => $idTutoria]);
        
        $result = $stmtVerify->fetch();
        
        if (!$result) {
            Response::error('Tutoría no encontrada', 404);
        }
        
        if ($result['idTutor'] != $tutorId) {
            Response::forbidden('Sin permisos para esta tutoría');
        }
        
        // Validar que no esté ya finalizada
        if ($result['estado'] === 'Realizada') {
            Response::error('Esta tutoría ya ha sido finalizada', 400);
        }
        
        $db->beginTransaction();
        
        // Guardado final: cambiar estado a Realizada
        $queryUpdate = "UPDATE tutoria 
                        SET estado = 'Realizada',
                            observaciones = :observaciones,
                            fechaRealizada = CURDATE()
                        WHERE id = :idTutoria";
        
        $stmtUpdate = $db->prepare($queryUpdate);
        $resultado = $stmtUpdate->execute([
            ':idTutoria' => $idTutoria,
            ':observaciones' => json_encode($data, JSON_UNESCAPED_UNICODE)
        ]);
        
        if (!$resultado) {
            throw new Exception('Error al actualizar el estado de la tutoría');
        }
        
        error_log("Tutoría actualizada a estado 'Realizada', procesando materiales...");
        
        // ==================== PROCESAR ARCHIVOS SUBIDOS ====================
        $archivosGuardados = procesarArchivosSubidos($db, $idTutoria);
        
        // ==================== PROCESAR MATERIALES DE APOYO ====================
        procesarMateriales($db, $idTutoria, $data, 'materialesApoyo', 'Material de apoyo');
        
        // ==================== PROCESAR RECURSOS RECOMENDADOS ====================
        procesarMateriales($db, $idTutoria, $data, 'recursosRecomendados', 'Recurso recomendado');
        
        // ==================== PROCESAR TAREAS ASIGNADAS (Solo para Académica) ====================
        if (($data['tipoTutoria'] ?? '') === 'Academica' && !empty($data['tareasAsignadas'])) {
            procesarTareas($db, $idTutoria, $data['tareasAsignadas']);
        }
        
        $db->commit();
        
        error_log("=========== Tutoría $idTutoria FINALIZADA correctamente por tutor $tutorId ===========");
        Response::success(['id' => $idTutoria, 'estado' => 'Realizada'], 'Tutoría finalizada correctamente');
        
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log("ERROR en registrarSesionFinal: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        Response::error('Error al finalizar la tutoría: ' . $e->getMessage(), 500);
    }
}

/**
 * Procesa y guarda materiales (apoyo o recursos) en la BD
 * Soporta: strings con saltos de línea, arrays de strings, arrays de objetos
 * 
 * @param PDO $db Conexión a base de datos
 * @param int $idTutoria ID de la tutoría
 * @param array $data Datos completos recibidos
 * @param string $campo Nombre del campo a procesar ('materialesApoyo' o 'recursosRecomendados')
 * @param string $tituloDefault Título por defecto para los materiales
 */
function procesarMateriales($db, $idTutoria, $data, $campo, $tituloDefault) {
    if (!isset($data[$campo]) || empty($data[$campo])) {
        error_log("Campo '$campo' no presente o vacío");
        return;
    }
    
    $materiales = $data[$campo];
    $materialesArray = [];
    
    // Convertir a array según el tipo recibido
    if (is_string($materiales)) {
        // Si es un string, separar por saltos de línea
        $lineas = explode("\n", trim($materiales));
        foreach ($lineas as $linea) {
            $linea = trim($linea);
            if (!empty($linea)) {
                $materialesArray[] = [
                    'contenido' => $linea,
                    'descripcion' => $linea
                ];
            }
        }
        error_log("$campo procesado como STRING: " . count($materialesArray) . " elementos");
    } elseif (is_array($materiales)) {
        // Si es un array
        foreach ($materiales as $material) {
            if (is_string($material)) {
                // Array de strings
                $material = trim($material);
                if (!empty($material)) {
                    $materialesArray[] = [
                        'contenido' => $material,
                        'descripcion' => $material
                    ];
                }
            } elseif (is_array($material) || is_object($material)) {
                // Array de objetos con estructura {archivo, descripcion, enlace, etc.}
                $mat = (array)$material;
                $contenido = $mat['descripcion'] ?? $mat['enlace'] ?? $mat['contenido'] ?? '';
                if (!empty($contenido)) {
                    $materialesArray[] = [
                        'contenido' => $contenido,
                        'descripcion' => $mat['descripcion'] ?? $contenido,
                        'archivo' => $mat['nombreArchivo'] ?? null,
                        'tipo' => $mat['tipoArchivo'] ?? null
                    ];
                }
            }
        }
        error_log("$campo procesado como ARRAY: " . count($materialesArray) . " elementos");
    } else {
        error_log("$campo tiene un tipo no soportado: " . gettype($materiales));
        return;
    }
    
    // Guardar cada material en la BD
    $contador = 0;
    foreach ($materialesArray as $material) {
        $contenido = trim($material['contenido']);
        if (empty($contenido)) continue;
        
        // Determinar tipo de material inteligentemente
        $tipo = determinarTipoMaterial($contenido, $material['tipo'] ?? null);
        
        // Generar título descriptivo
        $titulo = generarTituloMaterial($contenido, $tituloDefault, $material['archivo'] ?? null);
        
        try {
            $queryMaterial = "INSERT INTO materiales 
                             (idTutoria, titulo, descripcion, tipo, enlace, fechaRegistro) 
                             VALUES (:idTutoria, :titulo, :descripcion, :tipo, :enlace, CURDATE())";
            
            $stmtMaterial = $db->prepare($queryMaterial);
            $resultado = $stmtMaterial->execute([
                ':idTutoria' => $idTutoria,
                ':titulo' => $titulo,
                ':descripcion' => $material['descripcion'] ?? $contenido,
                ':tipo' => $tipo,
                ':enlace' => $contenido,
            ]);
            
            if ($resultado) {
                $contador++;
                error_log("Material guardado: Título='$titulo', Tipo='$tipo', Enlace='$contenido'");
            }
        } catch (Exception $e) {
            error_log("Error al guardar material: " . $e->getMessage());
            // Continuar con los siguientes materiales
        }
    }
    
    error_log("Total de $campo guardados: $contador de " . count($materialesArray));
}

/**
 * Determina el tipo de material según su contenido
 */
function determinarTipoMaterial($contenido, $tipoSugerido = null) {
    // Si ya viene un tipo específico, usarlo
    if ($tipoSugerido && in_array($tipoSugerido, ['PDF', 'Video', 'Documento', 'Enlace', 'Otro'])) {
        return $tipoSugerido;
    }
    
    // Detectar por extensión de archivo
    if (preg_match('/\.pdf$/i', $contenido)) return 'PDF';
    if (preg_match('/\.(docx?|odt|txt|rtf)$/i', $contenido)) return 'Documento';
    if (preg_match('/\.(xlsx?|csv|ods)$/i', $contenido)) return 'Documento';
    if (preg_match('/\.(pptx?|odp)$/i', $contenido)) return 'Documento';
    
    // Detectar videos
    if (preg_match('/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)/i', $contenido)) {
        return 'Video';
    }
    
    // Detectar enlaces web
    if (preg_match('/^https?:\/\//i', $contenido)) return 'Enlace';
    
    // Si contiene palabras clave de enlaces
    if (preg_match('/www\./i', $contenido)) return 'Enlace';
    
    // Por defecto
    return 'Otro';
}

/**
 * Genera un título descriptivo para el material
 */
function generarTituloMaterial($contenido, $tituloDefault, $archivo = null) {
    // Si hay un nombre de archivo, usarlo
    if ($archivo) {
        return basename($archivo);
    }
    
    // Si es una URL, extraer el dominio o última parte
    if (preg_match('/^https?:\/\/([^\/]+)/i', $contenido, $matches)) {
        $dominio = $matches[1];
        
        // Casos especiales para sitios conocidos
        if (stripos($dominio, 'youtube.com') !== false || stripos($dominio, 'youtu.be') !== false) {
            return 'Video de YouTube';
        }
        if (stripos($dominio, 'vimeo.com') !== false) {
            return 'Video de Vimeo';
        }
        if (stripos($dominio, 'drive.google.com') !== false) {
            return 'Archivo de Google Drive';
        }
        if (stripos($dominio, 'dropbox.com') !== false) {
            return 'Archivo de Dropbox';
        }
        
        return $tituloDefault . ' - ' . $dominio;
    }
    
    // Si el contenido es corto, usarlo como título
    if (strlen($contenido) < 50) {
        return $contenido;
    }
    
    // Truncar y agregar puntos suspensivos
    return substr($contenido, 0, 47) . '...';
}

/**
 * Procesa y guarda tareas asignadas (solo para tutorías académicas)
 */
function procesarTareas($db, $idTutoria, $tareas) {
    if (empty($tareas)) return;
    
    $tareasArray = [];
    if (is_string($tareas)) {
        $lineas = explode("\n", trim($tareas));
        foreach ($lineas as $linea) {
            $linea = trim($linea);
            if (!empty($linea)) {
                $tareasArray[] = $linea;
            }
        }
    } elseif (is_array($tareas)) {
        $tareasArray = array_filter(array_map('trim', $tareas));
    }
    
    error_log("Procesando " . count($tareasArray) . " tareas asignadas");
    
    $contador = 0;
    foreach ($tareasArray as $tarea) {
        try {
            $queryTarea = "INSERT INTO materiales 
                          (idTutoria, titulo, descripcion, tipo, enlace, fechaRegistro) 
                          VALUES (:idTutoria, :titulo, :descripcion, :tipo, :enlace, CURDATE())";
            
            $stmtTarea = $db->prepare($queryTarea);
            $resultado = $stmtTarea->execute([
                ':idTutoria' => $idTutoria,
                ':titulo' => 'Tarea asignada',
                ':descripcion' => $tarea,
                ':tipo' => 'Otro',
                ':enlace' => '',
            ]);
            
            if ($resultado) {
                $contador++;
                error_log("Tarea guardada: $tarea");
            }
        } catch (Exception $e) {
            error_log("Error al guardar tarea: " . $e->getMessage());
        }
    }
    
    error_log("Total de tareas guardadas: $contador de " . count($tareasArray));
}

/**
 * Procesa y guarda archivos físicos subidos desde el formulario
 */
function procesarArchivosSubidos($db, $idTutoria) {
    if (empty($_FILES)) {
        error_log("No hay archivos en la solicitud");
        return [];
    }
    
    // Obtener materiales estructurados si existen
    $materialesEstructurados = [];
    if (isset($_POST['materialesEstructurados'])) {
        $materialesEstructurados = json_decode($_POST['materialesEstructurados'], true) ?? [];
        error_log("Materiales estructurados recibidos: " . count($materialesEstructurados));
    }
    
    // Directorio de almacenamiento
    $uploadDir = __DIR__ . '/../storage/uploads/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $archivosGuardados = [];
    $contador = 0;
    
    // Procesar cada archivo
    foreach ($_FILES as $key => $archivo) {
        if (!is_array($archivo['name'])) {
            // Archivo único (formato: archivo_0, archivo_1, etc.)
            if ($archivo['error'] !== UPLOAD_ERR_OK) {
                error_log("Error al subir archivo $key: " . $archivo['error']);
                continue;
            }
            
            // Obtener metadatos del POST
            $tipo = $_POST["{$key}_tipo"] ?? 'Otro';
            $titulo = $_POST["{$key}_titulo"] ?? $archivo['name'];
            $descripcion = $_POST["{$key}_descripcion"] ?? '';
            
            // Validar tamaño (50MB máximo para videos, 10MB para otros)
            $maxSize = ($tipo === 'Video') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
            if ($archivo['size'] > $maxSize) {
                error_log("Archivo $key excede el tamaño máximo");
                continue;
            }
            
            // Generar nombre seguro y único
            $extension = pathinfo($archivo['name'], PATHINFO_EXTENSION);
            $nombreSeguro = uniqid('material_' . $idTutoria . '_') . '.' . $extension;
            $rutaDestino = $uploadDir . $nombreSeguro;
            
            // Mover archivo
            if (move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
                // Guardar en BD
                try {
                    $rutaRelativa = 'backend/storage/uploads/' . $nombreSeguro;
                    
                    $queryMaterial = "INSERT INTO materiales 
                                     (idTutoria, titulo, descripcion, tipo, enlace, fechaRegistro) 
                                     VALUES (:idTutoria, :titulo, :descripcion, :tipo, :enlace, CURDATE())";
                    
                    $stmtMaterial = $db->prepare($queryMaterial);
                    $resultado = $stmtMaterial->execute([
                        ':idTutoria' => $idTutoria,
                        ':titulo' => $titulo,
                        ':descripcion' => $descripcion,
                        ':tipo' => $tipo,
                        ':enlace' => $rutaRelativa,
                    ]);
                    
                    if ($resultado) {
                        $contador++;
                        $archivosGuardados[] = $nombreSeguro;
                        error_log("Archivo guardado: Tipo='$tipo', Título='$titulo', Ruta='$rutaRelativa'");
                    }
                } catch (Exception $e) {
                    error_log("Error al guardar archivo en BD: " . $e->getMessage());
                    // Eliminar archivo si falla el guardado en BD
                    if (file_exists($rutaDestino)) {
                        unlink($rutaDestino);
                    }
                }
            } else {
                error_log("Error al mover archivo $key a $rutaDestino");
            }
        }
    }
    
    // Procesar materiales estructurados sin archivo (solo enlaces)
    foreach ($materialesEstructurados as $material) {
        if (!$material['tieneArchivo'] && !empty($material['enlace'])) {
            try {
                $queryMaterial = "INSERT INTO materiales 
                                 (idTutoria, titulo, descripcion, tipo, enlace, fechaRegistro) 
                                 VALUES (:idTutoria, :titulo, :descripcion, :tipo, :enlace, CURDATE())";
                
                $stmtMaterial = $db->prepare($queryMaterial);
                $resultado = $stmtMaterial->execute([
                    ':idTutoria' => $idTutoria,
                    ':titulo' => $material['titulo'],
                    ':descripcion' => $material['descripcion'] ?? '',
                    ':tipo' => $material['tipo'],
                    ':enlace' => $material['enlace'],
                ]);
                
                if ($resultado) {
                    $contador++;
                    error_log("Material enlace guardado: Tipo='{$material['tipo']}', Título='{$material['titulo']}'");
                }
            } catch (Exception $e) {
                error_log("Error al guardar material enlace: " . $e->getMessage());
            }
        }
    }
    
    error_log("Total de materiales/archivos procesados: $contador");
    return $archivosGuardados;
}
