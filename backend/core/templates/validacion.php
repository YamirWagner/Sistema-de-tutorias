<?php
/**
 * Plantilla de correo: validación de código
 * Variables disponibles (desde Mailer::sendVerificationCode):
 * - $appName, $appUrl, $logoUrl
 * - $safeName, $code, $expiresMinutes
 * - $browser, $ip, $userAgent, $datetime
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verificación de acceso</title>
  <style>
    /* Estilos inline sencillos y compatibles con la mayoría de clientes */
    body { margin:0; padding:0; background:#f6f7fb; font-family: Arial, Helvetica, sans-serif; color:#111827; }
    .wrapper { width:100%; background:#f6f7fb; padding:24px 0; }
    .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.05); }
  /* Guinda (similar a index.html) */
  .header { padding:20px 24px; background:#7f1d1d; color:#ffffff; display:flex; align-items:center; gap:12px; }
    .header img { height:32px; width:auto; display:block; border:0; }
    .brand { font-size:16px; font-weight:600; letter-spacing:.2px; }
    .content { padding:24px; }
    h1 { font-size:20px; margin:0 0 8px; }
    p { margin:0 0 12px; line-height:1.5; color:#374151; }
  .code { font-size:28px; font-weight:700; letter-spacing:6px; text-align:center; color:#991b1b; background:#fef2f2; padding:16px; border-radius:10px; margin:16px 0 4px; }
    .muted { color:#6b7280; font-size:12px; }
    .details { background:#f9fafb; border:1px solid #e5e7eb; padding:12px 14px; border-radius:8px; margin-top:12px; }
    .details-item { font-size:13px; color:#374151; margin:4px 0; }
  .button { display:inline-block; background:#7f1d1d; color:#ffffff !important; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:600; margin-top:12px; }
  .footer { padding:16px 24px; background:#fef2f2; color:#7f1d1d; font-size:12px; text-align:center; }
    .hr { height:1px; background:#e5e7eb; border:none; margin:20px 0; }
    @media (prefers-color-scheme: dark) {
      body { background:#0b0f16; color:#e5e7eb; }
      .container { background:#121212; }
      .header { background:#651717; }
      .footer { background:#1a0b0b; color:#fca5a5; }
      .details { background:#0b0f16; border-color:#3f2d2d; }
      .code { background:#1a0b0b; color:#fca5a5; }
      .button { background:#8b1c1c; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <img src="<?= htmlspecialchars($logoUrl) ?>" alt="Logo" />
              <div class="brand"><?= htmlspecialchars($appName) ?></div>
            </div>

            <!-- Contenido principal -->
            <div class="content">
              <h1>Hola, <?= htmlspecialchars($safeName) ?> 👋</h1>
              <p>Usa este código para ingresar a tu cuenta en <strong><?= htmlspecialchars($appName) ?></strong>:</p>
              <div class="code"><?= htmlspecialchars($code) ?></div>
              <p class="muted">El código expira en <?= (int)$expiresMinutes ?> minutos.</p>

              <div class="details">
                <div class="details-item">Fecha y hora: <strong><?= htmlspecialchars($datetime) ?></strong></div>
                <div class="details-item">Navegador: <strong><?= htmlspecialchars($browser) ?></strong></div>
                <div class="details-item">IP: <strong><?= $ip ? htmlspecialchars($ip) : 'No disponible' ?></strong></div>
                <div class="details-item muted">Agente: <?= $userAgent ? htmlspecialchars($userAgent) : 'No disponible' ?></div>
              </div>

              <?php if (!empty($appUrl)) : ?>
                <p>
                  <a class="button" href="<?= rtrim(htmlspecialchars($appUrl), '/') ?>/login" target="_blank" rel="noopener">Acceder al sistema</a>
                </p>
              <?php endif; ?>

              <hr class="hr" />
              <p class="muted">Si tú no solicitaste este código, puedes ignorar este correo. Nadie podrá acceder sin el código.</p>
            </div>

            <!-- Footer -->
            <div class="footer">
              © <?= date('Y') ?> <?= htmlspecialchars($appName) ?>. Enviado automáticamente, no respondas a este correo.
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
