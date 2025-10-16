# Guía Rápida de Uso - Sistema de Tutorías

## 🚀 Inicio Rápido

### 1. Acceder al Sistema
```
http://localhost/Sistema-de-tutorias1/frontend/index.html
```

### 2. Iniciar Sesión

1. Click en "Iniciar Sesión"
2. Ingresa un correo de prueba:
   - `admin@institucion.edu` (Administrador)
   - `tutor1@institucion.edu` (Tutor)
   - `estudiante1@institucion.edu` (Estudiante)
   - `verificador@institucion.edu` (Verificador)

3. **Obtener el código**:
   
   **Método 1 - Base de Datos** (Recomendado para pruebas):
   - Ve a http://localhost/phpmyadmin
   - Abre la base de datos `sistema_tutorias`
   - Click en la tabla `verification_codes`
   - Busca el código más reciente (columna `code`)
   - Cópialo y pégalo en la pantalla de verificación
   
   **Método 2 - Correo** (Requiere configuración SMTP):
   - Configura SMTP en `backend/.env`
   - El código llegará a tu correo

4. Ingresa el código de 6 dígitos
5. ¡Listo! Serás redirigido a tu dashboard

## 📋 Funciones por Rol

### 👨‍💼 Administrador
```
Dashboard → Gestión completa del sistema
├── Gestionar Usuarios
├── Gestionar Tutores
├── Ver Reportes
└── Configuración del Sistema
```

**Funciones principales**:
- Ver estadísticas globales
- Administrar todos los usuarios
- Revisar reportes completos
- Configurar el sistema

### 👨‍🏫 Tutor
```
Dashboard → Gestión de tutorías
├── Mis Sesiones
├── Crear Sesión
├── Mis Estudiantes
└── Subir Materiales
```

**Funciones principales**:
- Crear sesiones de tutoría
- Gestionar estudiantes asignados
- Subir materiales de estudio
- Generar reportes de sesiones

### 👨‍🎓 Estudiante
```
Dashboard → Panel del estudiante
├── Buscar Tutores
├── Solicitar Sesión
├── Mis Solicitudes
└── Materiales de Estudio
```

**Funciones principales**:
- Buscar tutores disponibles
- Solicitar sesiones de tutoría
- Ver sesiones programadas
- Acceder a materiales

### 🔍 Verificador
```
Dashboard → Panel de verificación
├── Sesiones Pendientes
├── Sesiones Verificadas
├── Generar Reporte
└── Historial
```

**Funciones principales**:
- Verificar sesiones completadas
- Revisar evidencias
- Aprobar/rechazar sesiones
- Generar reportes de verificación

## 🔧 Comandos Útiles

### Reiniciar el Sistema
```bash
# Detener servicios en XAMPP
# Iniciar servicios nuevamente
```

### Ver Logs de Errores
```bash
# Logs PHP
C:\xampp\apache\logs\error.log

# Logs del sistema
backend\storage\logs\
```

### Resetear Base de Datos
```sql
-- En phpMyAdmin, ejecuta:
DROP DATABASE sistema_tutorias;

-- Luego importa nuevamente:
-- backend/sql/schema.sql
```

## 📱 Atajos del Teclado

| Atajo | Acción |
|-------|--------|
| `Alt + L` | Ir a Login |
| `Alt + D` | Ir a Dashboard |
| `Ctrl + Q` | Cerrar Sesión |
| `F5` | Recargar página |

## 🐛 Solución Rápida de Problemas

### Problema: "No puedo iniciar sesión"
✅ Solución:
1. Verifica que MySQL esté corriendo
2. Importa `schema.sql` si no lo has hecho
3. Obtén el código de la base de datos directamente

### Problema: "Error de conexión a la base de datos"
✅ Solución:
1. Abre el Panel de Control de XAMPP
2. Inicia MySQL si está detenido
3. Verifica `backend/.env` tenga las credenciales correctas

### Problema: "Página en blanco"
✅ Solución:
1. Abre la consola del navegador (F12)
2. Revisa errores de JavaScript
3. Verifica que Apache esté corriendo
4. Confirma la ruta del proyecto

### Problema: "Token expirado"
✅ Solución:
1. Vuelve a iniciar sesión
2. El token dura 24 horas por defecto
3. Se renueva en cada login

## 📊 Datos de Prueba Incluidos

### Usuarios (6)
- 1 Administrador
- 2 Tutores
- 2 Estudiantes
- 1 Verificador

### Sesiones (3)
- Tutoría de Matemáticas
- Tutoría de Programación
- Tutoría de Física

## 🎯 Flujo de Trabajo Típico

### Para Estudiantes:
1. Iniciar sesión → 2. Buscar tutor → 3. Solicitar sesión → 4. Esperar aprobación → 5. Asistir a sesión → 6. Recibir materiales

### Para Tutores:
1. Iniciar sesión → 2. Revisar solicitudes → 3. Aprobar/crear sesión → 4. Realizar tutoría → 5. Subir materiales → 6. Generar reporte

### Para Verificadores:
1. Iniciar sesión → 2. Ver sesiones completadas → 3. Verificar evidencias → 4. Aprobar/rechazar → 5. Generar reporte

## 💡 Tips y Trucos

### Tip 1: Cambiar idioma
- Todos los textos están en español
- Para cambiar, edita los archivos HTML y JS

### Tip 2: Personalizar colores
- Edita `frontend/css/styles.css`
- Cambia las clases de Tailwind en los HTML

### Tip 3: Agregar más usuarios
```sql
-- En phpMyAdmin:
INSERT INTO users (email, name, role) 
VALUES ('nuevo@institucion.edu', 'Nombre Apellido', 'student');
```

### Tip 4: Ver consultas SQL
- Abre `backend/core/database.php`
- Descomenta líneas de debug si es necesario

### Tip 5: Modo desarrollo
```php
// En backend/core/config.php
putenv('APP_ENV=development'); // Ver errores
```

## 📞 Ayuda Rápida

¿Necesitas ayuda? Sigue este orden:

1. ✅ Consulta `INSTALACION.md`
2. ✅ Revisa `ESTRUCTURA.md`
3. ✅ Lee `README.md`
4. ✅ Busca en los logs
5. ✅ Abre un issue en GitHub

## 🎓 Recursos de Aprendizaje

### PHP
- https://www.php.net/manual/es/
- https://www.w3schools.com/php/

### MySQL
- https://dev.mysql.com/doc/
- https://www.w3schools.com/mysql/

### JavaScript
- https://developer.mozilla.org/es/
- https://javascript.info/

### Tailwind CSS
- https://tailwindcss.com/docs
- https://flowbite.com/docs/

## ✨ Próximos Pasos

1. ✅ Instalar el sistema
2. ✅ Probar todas las funciones
3. ✅ Personalizar el diseño
4. ✅ Agregar tus propios usuarios
5. ✅ Configurar SMTP para correos reales
6. ✅ Integrar Google Calendar (opcional)
7. ✅ Desplegar en producción (opcional)

---

**¡Disfruta tu Sistema de Tutorías!** 🚀

Para soporte: Abre un issue en GitHub
