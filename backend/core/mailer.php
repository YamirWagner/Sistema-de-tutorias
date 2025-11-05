<?php
// mailer.php - Envío de correos con PHPMailer

// Cargar PHPMailer manualmente
require_once __DIR__ . '/../vendor/phpmailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/SMTP.php';
require_once __DIR__ . '/../vendor/phpmailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class Mailer {
    private $mail;
    
    public function __construct() {
        $this->mail = new PHPMailer(true);
        $this->configure();
    }
    
    /**
     * Enviar correo de cierre de sesión (p.ej., por inactividad)
     * @param string $email
     * @param string|null $name
     * @param array $meta [ip => string, user_agent => string, datetime => string]
     * @param string $reason 'inactividad' | 'manual' | 'seguridad'
     */
    public function sendSessionClosedEmail($email, $name = null, array $meta = [], $reason = 'inactividad') {
        try {
            $this->mail->addAddress($email);
            $this->mail->isHTML(true);
            $subjectReason = 'inactividad';
            if (is_string($reason)) {
                if (stripos($reason, 'dispositivo') !== false) { $subjectReason = 'acceso desde otro dispositivo'; }
                elseif (stripos($reason, 'manual') !== false) { $subjectReason = 'cierre de sesión'; }
                elseif (stripos($reason, 'seguridad') !== false) { $subjectReason = 'seguridad'; }
            }
            $this->mail->Subject = 'Sesión cerrada por ' . $subjectReason . ' - ' . (defined('APP_NAME') ? APP_NAME : 'Sistema de Tutorías');

            $appName = defined('APP_NAME') ? APP_NAME : 'Sistema de Tutorías';
            $appUrl = defined('APP_URL') ? APP_URL : '';
            $logoUrl = rtrim($appUrl, '/') . '/frontend/assets/Logo-UNSAAC.webp';

            $safeName = $name ?: explode('@', $email)[0];
            $ip = $meta['ip'] ?? '';
            $userAgent = $meta['user_agent'] ?? '';
            $browser = $this->detectBrowser($userAgent);
            $datetime = $meta['datetime'] ?? date('d/m/Y H:i:s');

            // Renderizar plantilla HTML (frontend/correos/cierre_sesion.html)
            $htmlTemplatePath = BASE_PATH . '/frontend/correos/cierre_sesion.html';
            if (file_exists($htmlTemplatePath)) {
                $template = file_get_contents($htmlTemplatePath);
                $loginUrl = rtrim($appUrl, '/') . '/login';
                $replacements = [
                    '{{app_name}}' => $appName,
                    '{{logo_url}}' => $logoUrl,
                    '{{name}}' => htmlspecialchars($safeName, ENT_QUOTES, 'UTF-8'),
                    '{{datetime}}' => htmlspecialchars($datetime, ENT_QUOTES, 'UTF-8'),
                    '{{browser}}' => htmlspecialchars($browser, ENT_QUOTES, 'UTF-8'),
                    '{{ip}}' => htmlspecialchars($ip ?: 'No disponible', ENT_QUOTES, 'UTF-8'),
                    '{{user_agent}}' => htmlspecialchars($userAgent ?: 'No disponible', ENT_QUOTES, 'UTF-8'),
                    '{{reason}}' => htmlspecialchars($reason, ENT_QUOTES, 'UTF-8'),
                    '{{login_url}}' => $loginUrl,
                    '{{year}}' => date('Y'),
                ];
                $body = strtr($template, $replacements);
            } else {
                // Fallback: plantilla PHP del backend
                $templatePath = __DIR__ . '/templates/cierre_sesion.php';
                if (file_exists($templatePath)) {
                    $GLOBALS['__tpl_vars'] = compact('safeName','browser','ip','userAgent','datetime','appName','appUrl','logoUrl','reason');
                    ob_start();
                    include $templatePath;
                    $body = ob_get_clean();
                } else {
                    // Fallback mínimo
                    $body = "<html><body style=\"font-family:Arial,sans-serif\">".
                        "<h2 style=\"margin:0 0 16px\">Hola, {$safeName}</h2>".
                        "<p>Tu sesión fue cerrada por inactividad.</p>".
                        "<div style=\"background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px\">".
                        "<div><strong>Fecha/Hora:</strong> {$datetime}</div>".
                        "<div><strong>Navegador:</strong> {$browser}</div>".
                        "<div><strong>IP:</strong> ".($ip ?: 'No disponible')."</div>".
                        "</div>".
                        "<p style=\"margin-top:12px\"><a href=\"".rtrim($appUrl,'/')."/login\" style=\"display:inline-block;background:#7f1d1d;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600\">Volver a iniciar sesión</a></p>".
                        "</body></html>";
                }
            }

            $this->mail->Body = $body;
            $this->mail->AltBody = "Hola, {$safeName}. Tu sesión fue cerrada por {$subjectReason}. Fecha/Hora: {$datetime}. IP: ".($ip ?: 'N/D').", Navegador: {$browser}.";

            $this->mail->send();
            return true;

        } catch (Exception $e) {
            error_log("Error al enviar correo: {$this->mail->ErrorInfo}");
            return false;
        }
    }

    /**
     * Configurar PHPMailer
     */
    private function configure() {
        try {
            // Configuración del servidor
            $this->mail->isSMTP();
            $this->mail->Host = SMTP_HOST;
            $this->mail->SMTPAuth = true;
            $this->mail->Username = SMTP_USER;
            $this->mail->Password = SMTP_PASS;
            
            // Usar SSL para puerto 465, STARTTLS para 587
            if (SMTP_PORT == 465) {
                $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } else {
                $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }
            $this->mail->Port = SMTP_PORT;
            
            // Codificación
            $this->mail->CharSet = 'UTF-8';
            
            // Remitente por defecto
            $this->mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
            
        } catch (Exception $e) {
            error_log("Error al configurar mailer: {$e->getMessage()}");
        }
    }
    
    /**
     * Enviar código de verificación con plantilla minimalista
     * @param string $email Correo del destinatario
     * @param string $code Código de 6 dígitos
     * @param string|null $name Nombre del destinatario (para saludo)
     * @param array $meta [ip => string, user_agent => string, datetime => string]
     */
    public function sendVerificationCode($email, $code, $name = null, array $meta = []) {
        try {
            $this->mail->addAddress($email);
            $this->mail->isHTML(true);
            $this->mail->Subject = 'Código de verificación - ' . (defined('APP_NAME') ? APP_NAME : 'Sistema de Tutorías');

            // Datos del entorno
            $appName = defined('APP_NAME') ? APP_NAME : 'Sistema de Tutorías';
            $appUrl = defined('APP_URL') ? APP_URL : '';
            $logoUrl = rtrim($appUrl, '/') . '/frontend/assets/Logo-UNSAAC.webp';
            $expiresMinutes = 10;

            // Normalizar datos
            $safeName = $name ?: explode('@', $email)[0];
            $ip = $meta['ip'] ?? '';
            $userAgent = $meta['user_agent'] ?? '';
            $browser = $this->detectBrowser($userAgent);
            $datetime = $meta['datetime'] ?? date('d/m/Y H:i:s');

            // Renderizar plantilla HTML (frontend/correos/validacion.html)
            $htmlTemplatePath = BASE_PATH . '/frontend/correos/validacion.html';
            if (file_exists($htmlTemplatePath)) {
                $template = file_get_contents($htmlTemplatePath);
                $loginUrl = rtrim($appUrl, '/') . '/login';
                $replacements = [
                    '{{app_name}}' => $appName,
                    '{{logo_url}}' => $logoUrl,
                    '{{name}}' => htmlspecialchars($safeName, ENT_QUOTES, 'UTF-8'),
                    '{{code}}' => htmlspecialchars($code, ENT_QUOTES, 'UTF-8'),
                    '{{expires_minutes}}' => $expiresMinutes,
                    '{{datetime}}' => htmlspecialchars($datetime, ENT_QUOTES, 'UTF-8'),
                    '{{browser}}' => htmlspecialchars($browser, ENT_QUOTES, 'UTF-8'),
                    '{{ip}}' => htmlspecialchars($ip ?: 'No disponible', ENT_QUOTES, 'UTF-8'),
                    '{{user_agent}}' => htmlspecialchars($userAgent ?: 'No disponible', ENT_QUOTES, 'UTF-8'),
                    '{{login_url}}' => $loginUrl,
                    '{{year}}' => date('Y'),
                ];
                $body = strtr($template, $replacements);
            } else {
                // Fallback: plantilla PHP del backend
                $templatePath = __DIR__ . '/templates/validacion.php';
                if (file_exists($templatePath)) {
                    ob_start();
                    include $templatePath;
                    $body = ob_get_clean();
                } else {
                    // Fallback mínimo si no hay plantillas
                    $body = "<html><body style=\"font-family:Arial,sans-serif\">".
                        "<h2 style=\"margin:0 0 16px\">Hola, {$safeName}</h2>".
                        "<p>Tu código de verificación es:</p>".
                        "<div style=\"font-size:32px;font-weight:700;color:#2563eb;background:#f3f4f6;padding:16px;text-align:center;border-radius:8px\">{$code}</div>".
                        "<p>Expira en {$expiresMinutes} minutos.</p>".
                        "<hr style=\"border:none;height:1px;background:#e5e7eb;margin:24px 0\">".
                        "<p style=\"color:#6b7280;font-size:12px\">IP: ".($ip ?: 'No disponible')." | Navegador: ".$browser."</p>".
                        "</body></html>";
                }
            }

            $this->mail->Body = $body;
            $this->mail->AltBody = "Hola, {$safeName}. Tu código de verificación es: {$code}. Expira en {$expiresMinutes} minutos. IP: " . ($ip ?: 'N/D') . ", Navegador: {$browser}, Fecha/Hora: {$datetime}.";

            $this->mail->send();
            return true;

        } catch (Exception $e) {
            error_log("Error al enviar correo: {$this->mail->ErrorInfo}");
            return false;
        }
    }

    /** Detectar navegador de un user-agent muy simple */
    private function detectBrowser($ua) {
        $ua = strtolower($ua ?? '');
        if (!$ua) return 'No disponible';
        if (strpos($ua, 'edg') !== false) return 'Microsoft Edge';
        if (strpos($ua, 'chrome') !== false && strpos($ua, 'chromium') === false) return 'Google Chrome';
        if (strpos($ua, 'firefox') !== false) return 'Mozilla Firefox';
        if (strpos($ua, 'safari') !== false && strpos($ua, 'chrome') === false) return 'Safari';
        if (strpos($ua, 'opera') !== false || strpos($ua, 'opr/') !== false) return 'Opera';
        return 'Otro';
    }
    
    /**
     * Enviar correo genérico
     */
    public function send($to, $subject, $body, $altBody = '') {
        try {
            $this->mail->addAddress($to);
            $this->mail->isHTML(true);
            $this->mail->Subject = $subject;
            $this->mail->Body = $body;
            $this->mail->AltBody = $altBody;
            
            $this->mail->send();
            return true;
            
        } catch (Exception $e) {
            error_log("Error al enviar correo: {$this->mail->ErrorInfo}");
            return false;
        }
    }
}
