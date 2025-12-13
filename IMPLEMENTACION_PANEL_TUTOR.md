# Implementación del Panel del Tutor

## 📋 Descripción

Se ha implementado completamente la funcionalidad del panel de inicio para el rol **Tutor**, incluyendo backend y frontend, para mostrar información dinámica y relevante cuando un tutor inicia sesión en el sistema.

## 🎯 Características Implementadas

### Backend (PHP)

**Archivo:** `backend/api/PanelTutor.php`

#### Funcionalidades:
1. **Autenticación y autorización**: Verifica que el usuario sea un tutor válido
2. **Datos del tutor**: Nombre completo, especialidad y correo
3. **Estado del semestre**: Nombre, estado (Activo/Cerrado), fechas de inicio y fin
4. **Estadísticas**:
   - Total de estudiantes asignados al tutor en el semestre activo
   - Número de sesiones programadas en el mes actual
5. **Próximas sesiones**: Obtiene las 2 próximas sesiones programadas con detalles completos

#### Consultas SQL realizadas:
- Información del tutor desde `usuariosistema`
- Semestre activo desde `semestre`
- Estudiantes asignados desde `asignaciontutor`
- Cronogramas desde `cronograma`

#### Endpoint:
```
GET /api/PanelTutor?action=dashboard
```

**Respuesta JSON:**
```json
{
  "success": true,
  "data": {
    "tutor": {
      "nombres": "Luis",
      "apellidos": "Paredes Ramos",
      "nombreCompleto": "Luis Paredes Ramos",
      "especialidad": "Inteligencia Artificial",
      "correo": "luis.paredes@unsaac.edu.pe"
    },
    "semestre": {
      "nombre": "2025-II",
      "estado": "Activo",
      "fechaInicio": "2025-08-01",
      "fechaFin": "2025-12-31"
    },
    "estadisticas": {
      "totalEstudiantes": 8,
      "sesionesMesActual": 12
    },
    "proximasSesiones": [
      {
        "id": 1,
        "fecha": "2025-12-15",
        "fechaFormateada": "15/12/2025",
        "horaInicio": "10:00",
        "horaFin": "12:00",
        "ambiente": "Aula 301",
        "descripcion": "Tutoría grupal",
        "estado": "Programada",
        "tipoHistorial": "Académica",
        "totalEstudiantes": 8
      }
    ]
  },
  "message": "Datos del panel cargados correctamente"
}
```

### Frontend (JavaScript)

**Archivos modificados:**
- `frontend/js/tutor/tutor.js`
- `frontend/js/tutor/panel.js`

#### Funcionalidades:
1. **loadTutorDashboard()**: Función principal que coordina la carga del panel
2. **loadTutorPanelHTML()**: Carga el componente HTML del panel
3. **loadTutorStats()**: Consume el endpoint del backend y actualiza los elementos del DOM
4. **renderTutorContent()**: Renderiza dinámicamente las próximas sesiones
5. **Funciones auxiliares**:
   - `verAgendamiento()`: Navega al módulo de agendamientos
   - `nuevaSesion()`: Crea una nueva sesión (placeholder)
   - `verHistorial()`: Muestra el historial de sesiones (placeholder)

### Frontend (HTML)

**Archivo:** `frontend/components/tutor/panel.html`

#### Estructura:
- **Encabezado**: Muestra el nombre y estado del semestre actual
- **Tarjetas de estadísticas**:
  - Estudiantes asignados
  - Sesiones del mes actual
- **Sección de próximas sesiones**: Lista dinámica con botones de acción

### Frontend (CSS)

**Archivo:** `frontend/css/tutor/panel.css`

- Estilos responsivos para móvil y desktop
- Animaciones suaves (fadeIn, hover effects)
- Temas de color consistentes con el diseño del sistema
- Mejoras de accesibilidad

## 🔧 Configuración

### 1. Registro de rutas

Se agregó la ruta en `backend/routes.php`:
```php
'GET|api/PanelTutor' => 'api/PanelTutor.php',
```

### 2. Inclusión de scripts

Se agregó el script en `frontend/panel.html`:
```html
<script src="/Sistema-de-tutorias/frontend/js/tutor/panel.js"></script>
```

### 3. Inclusión de estilos

Se agregó el CSS en `frontend/panel.html`:
```html
<link rel="stylesheet" href="/Sistema-de-tutorias/frontend/css/tutor/panel.css">
```

## 🚀 Flujo de ejecución

1. Usuario inicia sesión como **Tutor**
2. El sistema detecta el rol y ejecuta `loadTutorDashboard()`
3. Se carga el HTML del panel desde `components/tutor/panel.html`
4. Se realiza una petición GET a `/api/PanelTutor?action=dashboard`
5. El backend consulta la base de datos y devuelve los datos en JSON
6. El frontend actualiza los elementos del DOM con los datos recibidos
7. Se renderizan las próximas sesiones de forma dinámica

## 📊 Datos mostrados

### Encabezado
- Nombre del semestre actual (ej: "2025-II")
- Estado del semestre (Activo/Cerrado)

### Estadísticas
- **Estudiantes Asignados**: Número total de estudiantes bajo la tutoría del usuario
- **Sesiones Este Mes**: Número de sesiones programadas en el mes actual

### Próximas Sesiones
Para cada sesión se muestra:
- Nombre/Descripción
- Fecha de última sesión
- Tipo de historial (Académica, Personal, Profesional)
- Botones de acción:
  - "Nueva sesión"
  - "Ver Historial"

### Botón de navegación
- "Ver agendamiento completo": Redirige al módulo de agendamientos

## 🔐 Seguridad

- ✅ Autenticación mediante JWT
- ✅ Verificación del rol de tutor
- ✅ Control de actividad (cierre automático por inactividad)
- ✅ Prepared statements en todas las consultas SQL
- ✅ Validación de semestre activo
- ✅ Manejo de errores en backend y frontend

## 📱 Responsividad

El panel es completamente responsive:
- **Desktop**: Grid de 2 columnas para estadísticas
- **Móvil**: Layout en una columna con tamaños de fuente ajustados

## 🔄 Integración con el sistema

### Sidebar
El menú del tutor en el sidebar incluye:
- Inicio (carga el panel implementado)
- Nueva Sesión
- Agendamientos
- Mis estudiantes

### Main.js
La función `loadDashboardByRole('tutor')` automáticamente invoca `loadTutorDashboard()` cuando un tutor accede al panel principal.

## 📝 Próximos pasos sugeridos

1. Implementar el módulo "Agendamientos" completo
2. Desarrollar la funcionalidad "Nueva Sesión"
3. Crear la vista "Mis Estudiantes"
4. Implementar la visualización del historial de sesiones
5. Agregar notificaciones en tiempo real para sesiones próximas
6. Implementar filtros y búsqueda en las sesiones

## 🐛 Manejo de errores

- Si no hay semestre activo, se muestra "Sin semestre activo"
- Si no hay sesiones próximas, se muestra un mensaje informativo
- Los errores del backend se capturan y se muestran notificaciones al usuario
- Los logs de errores se registran en la consola del navegador para debugging

## ✅ Testing

Para probar la implementación:

1. Inicia sesión con un usuario que tenga rol "Tutor"
2. Verifica que se muestre:
   - El nombre del semestre actual
   - La cantidad de estudiantes asignados
   - El número de sesiones del mes
   - Las próximas 2 sesiones programadas
3. Verifica la consola del navegador para ver los logs de carga
4. Prueba la responsividad en diferentes tamaños de pantalla

---

**Fecha de implementación:** 12 de diciembre de 2025  
**Desarrollado por:** GitHub Copilot  
**Versión:** 1.0.0
