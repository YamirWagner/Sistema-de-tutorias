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
     * Enviar código de verificación
     */
    public function sendVerificationCode($email, $code) {
        try {
            $this->mail->addAddress($email);
            $this->mail->isHTML(true);
            $this->mail->Subject = 'Código de Verificación - Sistema de Tutorías';
            
            $this->mail->Body = "
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .code { font-size: 32px; font-weight: bold; color: #2563eb; 
                                text-align: center; padding: 20px; background: #f3f4f6; 
                                border-radius: 8px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <h2>Código de Verificación</h2>
                        <p>Has solicitado acceso al Sistema de Tutorías.</p>
                        <p>Tu código de verificación es:</p>
                        <div class='code'>{$code}</div>
                        <p>Este código expirará en 10 minutos.</p>
                        <p>Si no solicitaste este código, ignora este correo.</p>
                        <hr>
                        <p style='color: #666; font-size: 12px;'>
                            Este es un correo automático, por favor no respondas.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            $this->mail->AltBody = "Tu código de verificación es: {$code}. Este código expirará en 10 minutos.";
            
            $this->mail->send();
            return true;
            
        } catch (Exception $e) {
            error_log("Error al enviar correo: {$this->mail->ErrorInfo}");
            return false;
        }
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
