<?php
// activity.php - Control de actividad de sesión con cierre por inactividad

require_once __DIR__ . '/response.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/../models/logacceso.php';

class Activity {
    const TIMEOUT_SECONDS = 1800; // 30 minutos

    /** Obtener IP real del cliente */
    public static function clientIp(): string {
        $keys = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_CLIENT_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR'
        ];
        foreach ($keys as $key) {
            if (!empty($_SERVER[$key])) {
                $value = $_SERVER[$key];
                if ($key === 'HTTP_X_FORWARDED_FOR') {
                    $parts = array_map('trim', explode(',', $value));
                    foreach ($parts as $part) {
                        if (filter_var($part, FILTER_VALIDATE_IP)) {
                            if ($part === '::1' || $part === '0:0:0:0:0:0:0:1') return '127.0.0.1';
                            return $part;
                        }
                    }
                } else {
                    if (filter_var($value, FILTER_VALIDATE_IP)) {
                        if ($value === '::1' || $value === '0:0:0:0:0:0:0:1') return '127.0.0.1';
                        return $value;
                    }
                }
            }
        }
        return '';
    }

    /** Verificar y registrar actividad; cerrar por inactividad si corresponde. */
    public static function enforceAndTouch(PDO $db, array $payload): void {
        // Aplica a usuarios del sistema y estudiantes
        $role = $payload['role'] ?? '';
        $userType = $payload['userType'] ?? 'sistema';
        $userId = (int)($payload['user_id'] ?? 0);
        if ($userId <= 0) return;

        $logger = new LogAcceso($db);

        // Obtener último registro activo
        if ($userType === 'estudiante') {
            $stmt = $db->prepare("SELECT idLog, fechaHora FROM logacceso WHERE idEstudiante = :uid AND estadoSesion = 'activa' ORDER BY fechaHora DESC, idLog DESC LIMIT 1");
        } else {
            $stmt = $db->prepare("SELECT idLog, fechaHora FROM logacceso WHERE idUsuario = :uid AND estadoSesion = 'activa' ORDER BY fechaHora DESC, idLog DESC LIMIT 1");
        }
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $last = $stmt->fetch();

        if ($last) {
            $lastTs = strtotime($last['fechaHora']);
            $now = time();
            if ($now - $lastTs > self::TIMEOUT_SECONDS) {
                // Cerrar por inactividad
                try {
                    $logger->registrar([
                        'idUsuario' => $userId,
                        'usuario' => $payload['name'] ?? null,
                        'tipoAcceso' => self::mapRole($role),
                        'accion' => 'cierre de sesión',
                        'descripcion' => 'Cierre automático por inactividad (> 15 minutos)',
                        'estadoSesion' => 'cerrada',
                        'ipOrigen' => self::clientIp(),
                    ]);
                } catch (Exception $e) {
                    error_log('No se pudo registrar cierre por inactividad: ' . $e->getMessage());
                }

                // Enviar correo de notificación
                try {
                    $mailer = new Mailer();
                    $meta = [
                        'ip' => self::clientIp(),
                        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                        'datetime' => date('d/m/Y H:i:s')
                    ];
                    $mailer->sendSessionClosedEmail($payload['email'] ?? '', $payload['name'] ?? null, $meta, 'inactividad');
                } catch (Exception $e) {
                    error_log('No se pudo enviar correo de cierre por inactividad: ' . $e->getMessage());
                }

                // Bloquear la petición actual
                Response::unauthorized('Sesión cerrada por inactividad');
            }
        }

        // Registrar actividad de API actual
        try {
            $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
            $method = $_SERVER['REQUEST_METHOD'] ?? '';
            $data = [
                'usuario' => $payload['name'] ?? null,
                'tipoAcceso' => self::mapRole($role, $userType),
                'accion' => 'actividad',
                'descripcion' => "${method} ${path}",
                'estadoSesion' => 'activa',
                'ipOrigen' => self::clientIp(),
            ];
            if ($userType === 'estudiante') { $data['idEstudiante'] = $userId; }
            else { $data['idUsuario'] = $userId; }
            $logger->registrar($data);
        } catch (Exception $e) {
            error_log('No se pudo registrar actividad: ' . $e->getMessage());
        }
    }

    /** Cerrar sesión activa si existe (para nueva solicitud de login) */
    public static function closeActiveIfExists(PDO $db, int $userId, ?string $usuario = null, ?string $tipoAcceso = null, string $motivo = 'Nueva solicitud de código', string $userType = 'sistema'): bool {
        // ¿Existe activa?
        if ($userType === 'estudiante') {
            $stmt = $db->prepare("SELECT idLog, fechaHora FROM logacceso WHERE idEstudiante = :uid AND estadoSesion = 'activa' ORDER BY fechaHora DESC, idLog DESC LIMIT 1");
        } else {
            $stmt = $db->prepare("SELECT idLog, fechaHora FROM logacceso WHERE idUsuario = :uid AND estadoSesion = 'activa' ORDER BY fechaHora DESC, idLog DESC LIMIT 1");
        }
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $last = $stmt->fetch();
        if (!$last && $usuario) {
            // Fallback: si no hay por idUsuario, intentar por usuario + tipoAcceso
            $sql = "SELECT idLog, fechaHora FROM logacceso WHERE usuario = :usuario AND tipoAcceso = :tipo AND estadoSesion = 'activa' ORDER BY fechaHora DESC, idLog DESC LIMIT 1";
            $st = $db->prepare($sql);
            $st->bindValue(':usuario', $usuario);
            $st->bindValue(':tipo', $tipoAcceso);
            $st->execute();
            $last = $st->fetch();
        }
        if ($last) {
            $logger = new LogAcceso($db);
            try {
                $data = [
                    'usuario' => $usuario,
                    'tipoAcceso' => $tipoAcceso,
                    'accion' => 'cierre de sesión',
                    'descripcion' => $motivo,
                    'estadoSesion' => 'cerrada',
                    'ipOrigen' => self::clientIp(),
                ];
                if ($userType === 'estudiante') { $data['idEstudiante'] = $userId; }
                else { $data['idUsuario'] = $userId; }
                $logger->registrar($data);
            } catch (Exception $e) {
                error_log('No se pudo cerrar sesión activa previa: ' . $e->getMessage());
            }
            return true;
        }
        return false;
    }

    private static function mapRole(string $role, string $userType = 'sistema'): string {
        if ($userType === 'estudiante') return 'Estudiante';
        $map = ['admin' => 'Administrador', 'tutor' => 'Tutor', 'verifier' => 'Verificador'];
        return $map[$role] ?? $role;
    }
}
