# 🚀 Guía de Despliegue - Sistema de Tutorías

## 📋 Tabla de Contenidos
- [Requisitos Previos](#requisitos-previos)
- [Configuración General](#configuración-general)
- [Despliegue con Nginx](#despliegue-con-nginx)
- [Despliegue con Apache](#despliegue-con-apache)
- [Despliegue en Hosting Compartido](#despliegue-en-hosting-compartido)
- [Configuración SSL/HTTPS](#configuración-ssl-https)
- [Verificación del Despliegue](#verificación-del-despliegue)
- [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Requisitos Previos

### Software Necesario
- **PHP**: Versión 7.4 o superior (recomendado PHP 8.1+)
- **MySQL/MariaDB**: Versión 5.7+ / 10.3+
- **Servidor Web**: Nginx o Apache
- **Extensiones PHP**:
  - mysqli
  - pdo_mysql
  - json
  - mbstring
  - openssl
  - fileinfo
  - gd (opcional, para PDFs con imágenes)

### Verificar PHP
```bash
php -v
php -m | grep -E 'mysqli|pdo_mysql|json|mbstring|openssl'
```

---

## ⚙️ Configuración General

### 1. Subir Archivos al Servidor

Sube todos los archivos del proyecto a tu servidor. La estructura debe quedar así:

```
/var/www/html/               # O tu directorio web
├── frontend/
├── backend/
├── .htaccess               # Solo para Apache
└── nginx.conf              # Solo para Nginx (referencia)
```

### 2. Configurar Base de Datos

**a) Crear la base de datos:**
```sql
CREATE DATABASE sistema_tutorias CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**b) Importar el esquema:**
```bash
mysql -u root -p sistema_tutorias < backend/sql/schema.sql
```

O desde phpMyAdmin:
1. Selecciona la base de datos `sistema_tutorias`
2. Ir a "Importar"
3. Seleccionar `backend/sql/schema.sql`
4. Click en "Continuar"

### 3. Configurar Variables de Entorno

Edita el archivo `backend/.env` con los datos de tu servidor:

```env
# Base de datos
DB_HOST=localhost
DB_NAME=sistema_tutorias
DB_USER=tu_usuario
DB_PASS=tu_contraseña

# URL del proyecto (¡IMPORTANTE!)
# Si está en la raíz del dominio: https://tudominio.com
# Si está en subcarpeta: https://tudominio.com/tutorias
APP_URL=https://tudominio.com

# Configuración JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui_cambiar_en_produccion
JWT_EXPIRATION=3600

# Configuración de Correo (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tucorreo@gmail.com
SMTP_PASS=tu_contraseña_de_aplicacion
SMTP_FROM_EMAIL=tucorreo@gmail.com
SMTP_FROM_NAME=Sistema de Tutorías

# Google OAuth (Opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Entorno
APP_ENV=production
APP_DEBUG=false
```

**⚠️ IMPORTANTE:** Cambia `JWT_SECRET` por una cadena aleatoria segura.

### 4. Configurar Permisos

```bash
# Dar permisos de escritura a las carpetas necesarias
chmod 755 backend/storage
chmod 755 backend/storage/logs
chmod 755 backend/storage/constancias
chmod 755 backend/storage/uploads
chmod 755 backend/storage/backups
chmod 755 backend/storage/tokens

# Asegurar que el usuario del servidor web tenga acceso
chown -R www-data:www-data backend/storage  # Ubuntu/Debian
# O
chown -R nginx:nginx backend/storage         # CentOS/RHEL
# O
chown -R apache:apache backend/storage       # Otros
```

---

## 🔵 Despliegue con Nginx

### 1. Copiar Configuración

Copia el archivo `nginx.conf` del proyecto a la configuración de Nginx:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/sistema-tutorias
```

### 2. Editar Configuración

Edita el archivo y ajusta estas líneas:

```nginx
# Línea 8-9: Cambia por tu dominio
server_name tudominio.com www.tudominio.com;

# Línea 12: Cambia por la ruta de tu proyecto
root /var/www/html;

# Línea 103: Ajusta la versión de PHP si es diferente
fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
```

**Para encontrar tu socket PHP:**
```bash
# Buscar el socket de PHP-FPM
ls -la /var/run/php/
# O
ls -la /var/run/php-fpm/
```

### 3. Activar el Sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/sistema-tutorias /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm
```

### 4. Verificar Estado

```bash
sudo systemctl status nginx
sudo systemctl status php8.1-fpm
```

---

## 🟢 Despliegue con Apache

El proyecto ya incluye un archivo `.htaccess` configurado automáticamente.

### 1. Habilitar mod_rewrite

```bash
sudo a2enmod rewrite
sudo a2enmod headers
sudo systemctl restart apache2
```

### 2. Configurar VirtualHost

Edita `/etc/apache2/sites-available/000-default.conf` o crea uno nuevo:

```apache
<VirtualHost *:80>
    ServerName tudominio.com
    ServerAlias www.tudominio.com
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/tutorias_error.log
    CustomLog ${APACHE_LOG_DIR}/tutorias_access.log combined
</VirtualHost>
```

### 3. Ajustar .htaccess (si es necesario)

Si tu proyecto está en una **subcarpeta**, edita `.htaccess` línea 15:

```apache
# Si está en: https://tudominio.com/tutorias/
RewriteBase /tutorias/

# Si está en la raíz: https://tudominio.com/
RewriteBase /
```

### 4. Reiniciar Apache

```bash
sudo systemctl restart apache2
```

---

## 🌐 Despliegue en Hosting Compartido

### Opción A: Proyecto en Raíz del Dominio

1. **Subir archivos** vía FTP/SFTP a `public_html/` o `www/`
2. **Configurar base de datos** desde el panel de control (cPanel, Plesk, etc.)
3. **Editar `.env`** con los datos de conexión
4. **Ajustar `.htaccess`** línea 15:
   ```apache
   RewriteBase /
   ```
5. Listo! Accede a `https://tudominio.com`

### Opción B: Proyecto en Subcarpeta

1. **Crear carpeta** `tutorias/` en `public_html/`
2. **Subir archivos** a `public_html/tutorias/`
3. **Configurar base de datos**
4. **Editar `.env`**:
   ```env
   APP_URL=https://tudominio.com/tutorias
   ```
5. **Ajustar `.htaccess`** línea 15:
   ```apache
   RewriteBase /tutorias/
   ```
6. Accede a `https://tudominio.com/tutorias`

### Configuración desde cPanel

1. **MySQL Database Wizard**:
   - Crear base de datos
   - Crear usuario
   - Asignar privilegios
2. **phpMyAdmin**:
   - Importar `backend/sql/schema.sql`
3. **File Manager**:
   - Editar `backend/.env` con los datos

---

## 🔒 Configuración SSL/HTTPS

### Opción 1: Let's Encrypt (Gratuito)

**Para Nginx:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

**Para Apache:**
```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d tudominio.com -d www.tudominio.com
```

### Opción 2: SSL desde Hosting

Si usas hosting compartido:
1. Buscar "SSL/TLS" en el panel
2. Activar "AutoSSL" o "Let's Encrypt"
3. O subir tu certificado personalizado

### Renovación Automática

```bash
# Agregar a crontab para renovar automáticamente
sudo crontab -e

# Agregar esta línea
0 3 * * * certbot renew --quiet
```

---

## ✅ Verificación del Despliegue

### 1. Verificar Frontend

Accede a: `https://tudominio.com`

Deberías ver la página de inicio del sistema.

### 2. Verificar API

Accede a: `https://tudominio.com/api/config`

Deberías ver un JSON como este:
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "environment": "production"
  }
}
```

### 3. Verificar Base de Datos

```bash
mysql -u usuario -p -e "USE sistema_tutorias; SHOW TABLES;"
```

Deberías ver 8 tablas.

### 4. Probar Login

1. Ir a `https://tudominio.com/login`
2. Ingresar: `admin@institucion.edu`
3. Obtener el código de verificación:
   - Desde tu correo (si configuraste SMTP)
   - O desde la base de datos: tabla `verification_codes`

### 5. Verificar Logs

```bash
# Ver logs de errores de PHP
tail -f backend/storage/logs/app.log

# Ver logs de Nginx
tail -f /var/log/nginx/tutorias_error.log

# Ver logs de Apache
tail -f /var/log/apache2/tutorias_error.log
```

---

## 🔧 Solución de Problemas

### ❌ Error: 404 Not Found

**Causa**: Rutas no configuradas correctamente.

**Solución**:

**Para Nginx:**
- Verificar que `fastcgi_pass` apunte al socket correcto de PHP
- Reiniciar Nginx y PHP-FPM

**Para Apache:**
- Verificar que `mod_rewrite` esté habilitado: `sudo a2enmod rewrite`
- Verificar `AllowOverride All` en VirtualHost
- Ajustar `RewriteBase` en `.htaccess`

### ❌ Error: 500 Internal Server Error

**Causas posibles**:
1. **Error en `.env`**: Verificar sintaxis y variables requeridas
2. **Permisos incorrectos**: `chmod 755 backend/storage -R`
3. **Error de PHP**: Revisar logs

**Solución**:
```bash
# Ver error específico
tail -50 backend/storage/logs/app.log

# Verificar permisos
ls -la backend/storage

# Verificar PHP
php backend/routes.php  # Debe mostrar un JSON
```

### ❌ Error: Cannot connect to database

**Solución**:
1. Verificar credenciales en `backend/.env`
2. Verificar que MySQL esté corriendo:
   ```bash
   sudo systemctl status mysql
   ```
3. Probar conexión manualmente:
   ```bash
   mysql -h localhost -u usuario -p
   ```

### ❌ Rutas de frontend no funcionan

**Solución**:
1. Abrir DevTools (F12) → Console
2. Buscar errores de JavaScript
3. Verificar que `config.js` se esté cargando
4. Ver el log: "🔍 Base Path detectado: ..."

### ❌ API devuelve errores CORS

**Para Nginx**, agregar al bloque `server`:
```nginx
add_header Access-Control-Allow-Origin "*" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
```

**Para Apache**, ya está configurado en `.htaccess`.

### ❌ No llegan los correos

**Solución**:
1. Verificar configuración SMTP en `.env`
2. Usar contraseña de aplicación de Gmail (no tu contraseña normal)
3. Habilitar acceso de aplicaciones menos seguras (o usar OAuth2)
4. Verificar logs: `backend/storage/logs/app.log`

### ❌ PDFs no se generan

**Solución**:
```bash
# Verificar extensiones PHP
php -m | grep -E 'gd|mbstring|zlib'

# Instalar si faltan
sudo apt install php-gd php-mbstring php-zip

# Dar permisos
chmod 755 backend/storage/constancias
```

---

## 📊 Monitoreo y Mantenimiento

### Logs a Revisar

```bash
# Logs del sistema
tail -f backend/storage/logs/app.log

# Logs de acceso
tail -f backend/storage/logs/access.log

# Logs del servidor web
tail -f /var/log/nginx/tutorias_access.log
tail -f /var/log/apache2/tutorias_access.log
```

### Backups Automáticos

```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-tutorias.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/tutorias"

# Backup de base de datos
mysqldump -u usuario -p'contraseña' sistema_tutorias > $BACKUP_DIR/db_$DATE.sql

# Backup de archivos
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/html

# Eliminar backups antiguos (más de 7 días)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
# Dar permisos
sudo chmod +x /usr/local/bin/backup-tutorias.sh

# Agregar a crontab (diario a las 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-tutorias.sh
```

---

## 🎉 ¡Listo!

Tu sistema de tutorías debería estar funcionando correctamente.

### Próximos Pasos

1. ✅ Cambiar contraseñas de usuarios de prueba
2. ✅ Configurar correos de notificación
3. ✅ Probar todas las funcionalidades
4. ✅ Configurar backups automáticos
5. ✅ Monitorear logs periódicamente

### Soporte

Si encuentras problemas:
1. Revisar los logs
2. Consultar esta guía
3. Verificar la configuración paso a paso

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2025
