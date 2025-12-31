<?php
/**
 * Plantilla de correo: Solicitud de Cambio de Tutor
 * Variables disponibles:
 * - $appName, $appUrl, $logoUrl
 * - $estudianteNombre, $estudianteCorreo, $estudianteCodigo
 * - $tutorActualNombre, $tutorActualCorreo
 * - $motivo, $detalles
 * - $datetime
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Solicitud de Cambio de Tutor</title>
  <style>
    body { margin:0; padding:0; background:#f6f7fb; font-family: Arial, Helvetica, sans-serif; color:#111827; }
    .wrapper { width:100%; background:#f6f7fb; padding:24px 0; }
    .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.05); }
    .header { padding:20px 24px; background:#7f1d1d; color:#ffffff; display:flex; align-items:center; gap:12px; }
    .header img { height:32px; width:auto; display:block; border:0; }
    .brand { font-size:16px; font-weight:600; letter-spacing:.2px; }
    .content { padding:24px; }
    h1 { font-size:20px; margin:0 0 8px; }
    p { margin:0 0 12px; line-height:1.5; color:#374151; }
    .alert-box { background:#fef3c7; border-left:4px solid #f59e0b; padding:16px; border-radius:8px; margin:16px 0; }
    .details { background:#f9fafb; border:1px solid #e5e7eb; padding:12px 14px; border-radius:8px; margin-top:12px; }
    .details-item { font-size:13px; color:#374151; margin:6px 0; }
    .reason-box { background:#fef2f2; border:1px solid #fca5a5; padding:16px; border-radius:8px; margin:16px 0; }
    .button { display:inline-block; background:#7f1d1d; color:#ffffff !important; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:600; margin-top:12px; }
    .footer { padding:16px 24px; background:#fef2f2; color:#7f1d1d; font-size:12px; text-align:center; }
    .hr { height:1px; background:#e5e7eb; border:none; margin:20px 0; }
    @media (prefers-color-scheme: dark) {
      body { background:#0b0f16; color:#e5e7eb; }
      .container { background:#121212; }
      .header { background:#651717; }
      .footer { background:#1a0b0b; color:#fca5a5; }
      .details { background:#0b0f16; border-color:#3f2d2d; }
      .alert-box { background:#1a0f00; border-left-color:#f59e0b; }
      .reason-box { background:#1a0b0b; border-color:#7f1d1d; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <div class="container">
            <div class="header">
              <img src="<?= htmlspecialchars($logoUrl) ?>" alt="Logo" />
              <div class="brand"><?= htmlspecialchars($appName) ?></div>
            </div>

            <div class="content">
              <h1>⚠️ Solicitud de Cambio de Tutor</h1>
              <p>Se ha recibido una solicitud de cambio de tutor que requiere tu atención.</p>

              <div class="alert-box">
                <p style="margin:0; font-weight:600;">Esta solicitud debe ser revisada y procesada por el administrador del sistema.</p>
              </div>

              <h2 style="font-size:16px; margin:16px 0 8px; color:#7f1d1d;">Datos del Estudiante</h2>
              <div class="details">
                <div class="details-item"><strong>Nombre:</strong> <?= htmlspecialchars($estudianteNombre) ?></div>
                <div class="details-item"><strong>Código:</strong> <?= htmlspecialchars($estudianteCodigo) ?></div>
                <div class="details-item"><strong>Correo:</strong> <?= htmlspecialchars($estudianteCorreo) ?></div>
              </div>

              <h2 style="font-size:16px; margin:16px 0 8px; color:#7f1d1d;">Tutor Actual</h2>
              <div class="details">
                <div class="details-item"><strong>Nombre:</strong> <?= htmlspecialchars($tutorActualNombre) ?></div>
                <div class="details-item"><strong>Correo:</strong> <?= htmlspecialchars($tutorActualCorreo) ?></div>
              </div>

              <h2 style="font-size:16px; margin:16px 0 8px; color:#7f1d1d;">Motivo de la Solicitud</h2>
              <div class="reason-box">
                <p><strong><?= htmlspecialchars($motivo) ?></strong></p>
                <?php if (!empty($detalles)) : ?>
                  <p style="margin-top:12px;"><?= nl2br(htmlspecialchars($detalles)) ?></p>
                <?php endif; ?>
              </div>

              <div class="details">
                <div class="details-item"><strong>Fecha de solicitud:</strong> <?= htmlspecialchars($datetime) ?></div>
              </div>

              <?php if (!empty($appUrl)) : ?>
                <p>
                  <a class="button" href="<?= rtrim(htmlspecialchars($appUrl), '/') ?>" target="_blank" rel="noopener">Gestionar solicitud</a>
                </p>
              <?php endif; ?>

              <hr class="hr" />
              <p style="color:#6b7280; font-size:12px;">Esta solicitud requiere acción administrativa. Por favor, contacta al estudiante para más detalles si es necesario.</p>
            </div>

            <div class="footer">
              © <?= date('Y') ?> <?= htmlspecialchars($appName) ?>. Enviado automáticamente.
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
