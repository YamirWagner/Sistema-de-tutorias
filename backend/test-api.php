<?php
// test-api.php - Script de prueba rápida de la API

// Cargar configuración
require_once __DIR__ . '/core/config.php';
require_once __DIR__ . '/core/database.php';

echo "<h1>Test de Configuración - Sistema de Tutorías</h1>";
echo "<hr>";

// 1. Test de variables de entorno
echo "<h2>1. Variables de Entorno (.env)</h2>";
echo "<ul>";
echo "<li>DB_HOST: " . DB_HOST . "</li>";
echo "<li>DB_NAME: " . DB_NAME . "</li>";
echo "<li>DB_USER: " . DB_USER . "</li>";
echo "<li>SMTP_HOST: " . SMTP_HOST . "</li>";
echo "<li>SMTP_PORT: " . SMTP_PORT . "</li>";
echo "<li>SMTP_USER: " . SMTP_USER . "</li>";
echo "<li>APP_URL: " . APP_URL . "</li>";
echo "</ul>";

// 2. Test de conexión a base de datos
echo "<h2>2. Conexión a Base de Datos</h2>";
try {
    $database = new Database();
    $db = $database->getConnection();
    echo "<p style='color: green;'>✓ Conexión exitosa a la base de datos</p>";
    
    // Contar usuarios
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $result = $stmt->fetch();
    echo "<p>Total de usuarios en la BD: " . $result['total'] . "</p>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'>✗ Error de conexión: " . $e->getMessage() . "</p>";
}

// 3. Test de PHPMailer
echo "<h2>3. PHPMailer</h2>";
if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    echo "<p style='color: green;'>✓ PHPMailer está instalado</p>";
} else {
    echo "<p style='color: red;'>✗ PHPMailer NO está instalado</p>";
    echo "<p>Ejecuta: <code>composer require phpmailer/phpmailer</code></p>";
}

// 4. Test de rutas de API
echo "<h2>4. Endpoints de API</h2>";
echo "<ul>";
echo "<li>Send Code: <a href='api/auth/send-code.php' target='_blank'>api/auth/send-code.php</a></li>";
echo "<li>Verify Code: <a href='api/auth/verify-code.php' target='_blank'>api/auth/verify-code.php</a></li>";
echo "</ul>";

echo "<hr>";
echo "<p><strong>Fecha:</strong> " . date('Y-m-d H:i:s') . "</p>";
