<?php
// Plantilla fallback de cierre de sesión (similar estilo a validación)
$v = $GLOBALS['__tpl_vars'] ?? [];
$safe = function($k,$d=''){return htmlspecialchars(($GLOBALS['__tpl_vars'][$k] ?? $d), ENT_QUOTES, 'UTF-8');};
?>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Cierre de sesión</title>
  </head>
  <body style="margin:0;padding:24px;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.05)">
      <div style="padding:20px 24px;background:#7f1d1d;color:#fff;display:flex;align-items:center;gap:12px">
        <img src="<?php echo $safe('logoUrl'); ?>" alt="Logo" style="height:32px;width:auto"/>
        <div style="font-weight:600"><?php echo $safe('appName','Sistema de Tutorías'); ?></div>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 8px;font-size:20px;">Hola, <?php echo $safe('safeName','usuario'); ?> 👋</h1>
        <p style="background:#fef2f2;border:1px solid #fecaca;padding:12px 14px;border-radius:10px;color:#991b1b;font-weight:600;">Tu sesión fue cerrada por inactividad.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:12px 14px;border-radius:8px;margin-top:12px">
          <div style="font-size:13px;color:#374151;margin:4px 0;">Fecha y hora: <strong><?php echo $safe('datetime'); ?></strong></div>
          <div style="font-size:13px;color:#374151;margin:4px 0;">Navegador: <strong><?php echo $safe('browser'); ?></strong></div>
          <div style="font-size:13px;color:#374151;margin:4px 0;">IP: <strong><?php echo $safe('ip'); ?></strong></div>
          <div style="font-size:12px;color:#6b7280;margin:4px 0;">Agente: <?php echo $safe('userAgent'); ?></div>
        </div>
        <p>
          <a href="<?php echo rtrim($safe('appUrl'),'/'); ?>/login" style="display:inline-block;background:#7f1d1d;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;margin-top:12px">Volver a iniciar sesión</a>
        </p>
        <hr style="border:none;height:1px;background:#e5e7eb;margin:20px 0"/>
        <p style="color:#6b7280;font-size:12px">Si no reconoces este cierre, inicia sesión y revisa tu actividad.</p>
      </div>
      <div style="padding:16px 24px;background:#fef2f2;color:#7f1d1d;font-size:12px;text-align:center;">© <?php echo date('Y'); ?> <?php echo $safe('appName','Sistema de Tutorías'); ?>.</div>
    </div>
  </body>
</html>
