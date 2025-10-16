# Guía de Instalación - Sistema de Tutorías

## Pasos Detallados de Instalación

### 1. Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
- XAMPP (incluye Apache, MySQL y PHP)
- Navegador web moderno (Chrome, Firefox, Edge)
- Editor de texto (VS Code recomendado)

### 2. Instalación de XAMPP

1. Descarga XAMPP desde https://www.apachefriends.org/
2. Instala XAMPP en `C:\xampp`
3. Abre el Panel de Control de XAMPP
4. Inicia los servicios Apache y MySQL

### 3. Configuración del Proyecto

1. **Ubicación del proyecto**:
   - El proyecto debe estar en: `C:\xampp\htdocs\Sistema-de-tutorias1`
   - Si lo descargaste en otra ubicación, cópialo a esta carpeta

2. **Verificar estructura**:
   ```
   C:\xampp\htdocs\Sistema-de-tutorias1\
   ├── frontend\
   ├── backend\
   ├── README.md
   └── azure-pipelines.yml
   ```

### 4. Configuración de la Base de Datos

1. **Abrir phpMyAdmin**:
   - Ve a http://localhost/phpmyadmin
   - Usuario: `root`
   - Contraseña: (dejar en blanco)

2. **Importar el esquema**:
   - Click en "Nueva" para crear una base de datos
   - O simplemente importa el archivo que lo hará automáticamente
   - Click en la pestaña "Importar"
   - Selecciona el archivo: `backend/sql/schema.sql`
   - Click en "Continuar"

3. **Verificar importación**:
   - Deberías ver la base de datos `sistema_tutorias`
   - Con 8 tablas: users, verification_codes, login_history, sessions, reports, schedules, requests, materials
   - Y 6 usuarios de prueba

### 5. Configuración del Backend

1. **Archivo .env**:
   - Abre el archivo `backend/.env`
   - Verifica que tenga esta configuración:
   
   ```env
   DB_HOST=localhost
   DB_NAME=sistema_tutorias
   DB_USER=root
   DB_PASS=
   ```

2. **Configuración de correo** (opcional para pruebas):
   - Si quieres probar el envío de códigos por correo:
   - Obtén una contraseña de aplicación de Gmail
   - Actualiza en `.env`:
   
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_correo@gmail.com
   SMTP_PASS=contraseña_de_aplicacion
   ```

### 6. Prueba del Sistema

1. **Acceder al sistema**:
   - Abre tu navegador
   - Ve a: http://localhost/Sistema-de-tutorias1/frontend/index.html

2. **Probar login**:
   - Click en "Iniciar Sesión"
   - Ingresa uno de estos correos:
     * admin@institucion.edu (Administrador)
     * tutor1@institucion.edu (Tutor)
     * estudiante1@institucion.edu (Estudiante)
     * verificador@institucion.edu (Verificador)

3. **Código de verificación**:
   - **IMPORTANTE**: Si no configuraste el correo, deberás obtener el código manualmente:
   
   **Opción A - Ver en la base de datos**:
   - Ve a phpMyAdmin
   - Selecciona la base de datos `sistema_tutorias`
   - Click en la tabla `verification_codes`
   - Busca el código más reciente para tu usuario
   
   **Opción B - Configurar SMTP**:
   - Sigue las instrucciones de configuración de correo (paso 5.2)
   - El código llegará a tu correo

4. **Explorar el dashboard**:
   - Una vez dentro, explora las funciones según tu rol
   - Cada rol tiene diferentes permisos y vistas

### 7. Solución de Problemas Comunes

#### Error: "No se puede conectar a la base de datos"
- Verifica que MySQL esté ejecutándose en XAMPP
- Confirma las credenciales en `backend/.env`
- Asegúrate de haber importado `schema.sql`

#### Error: "No se encuentra el archivo"
- Verifica la ruta del proyecto: `C:\xampp\htdocs\Sistema-de-tutorias1`
- Asegúrate de que Apache esté ejecutándose

#### No llega el código de verificación
- Opción 1: Obtén el código de la base de datos (ver paso 6.3)
- Opción 2: Configura SMTP correctamente
- Opción 3: Revisa los logs en `backend/storage/logs/`

#### Error de token expirado
- El token dura 24 horas por defecto
- Si expira, vuelve a iniciar sesión
- Para cambiar la duración, edita `JWT_EXPIRATION` en `backend/core/config.php`

### 8. Próximos Pasos

Una vez que el sistema funcione correctamente:

1. **Personalizar**:
   - Cambia los logos en `frontend/assets/`
   - Modifica los colores en `frontend/css/styles.css`
   - Actualiza la información institucional

2. **Agregar usuarios reales**:
   - Usa phpMyAdmin para agregar más usuarios
   - O crea un formulario de registro (tarea adicional)

3. **Configurar Google Calendar** (opcional):
   - Crea un proyecto en Google Cloud Console
   - Habilita Calendar API
   - Agrega las credenciales en `.env`

4. **Producción**:
   - Cambia `APP_ENV=production` en `.env`
   - Usa un servidor con HTTPS
   - Cambia el `JWT_SECRET` a algo único y seguro
   - Configura backups automáticos

### 9. Recursos Adicionales

- **Documentación PHP**: https://www.php.net/docs.php
- **MySQL**: https://dev.mysql.com/doc/
- **Flowbite**: https://flowbite.com/docs/
- **Google Calendar API**: https://developers.google.com/calendar

### 10. Contacto y Soporte

Si encuentras problemas:
1. Revisa esta guía completa
2. Consulta los logs en `backend/storage/logs/`
3. Abre un issue en GitHub
4. Contacta al desarrollador

---

**¡Disfruta tu Sistema de Tutorías!** 🎓
