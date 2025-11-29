# Módulo de Cronograma Académico

## 📋 Descripción

El módulo de cronograma permite a los administradores gestionar eventos y fechas importantes del semestre académico.

## 📁 Archivos del Módulo

### Frontend
- **HTML**: `frontend/components/admin-cronograma.html`
- **JavaScript**: `frontend/js/admin_cronograma.js`
- **CSS**: `frontend/css/admin_cronograma.css`

### Integración
- Incluido en `frontend/panel.html`
- Llamado desde `frontend/js/admin.js` → `loadAdminContent()`
- Acción del sidebar: `showScheduleSection` en `frontend/js/sidebar_panel.js`

## 🎯 Funcionalidades

### 1. Visualización de Eventos
- **Vista Timeline**: Lista cronológica de eventos
- **Vista Calendario**: Calendario mensual con eventos

### 2. Filtros
- Todos los eventos
- Eventos académicos
- Eventos de tutorías
- Fechas límite
- Otros eventos

### 3. Gestión de Eventos
- Crear nuevo evento
- Editar evento existente
- Eliminar evento
- Campos del evento:
  - Título
  - Descripción
  - Tipo (académico, tutorías, fecha límite, feriado, otro)
  - Fecha de inicio/fin
  - Hora de inicio/fin (opcional)

### 4. Estadísticas
- Total de eventos
- Eventos próximos
- Fechas límite
- Sesiones de tutorías programadas

### 5. Información del Semestre
- Nombre del semestre
- Período (fecha inicio - fecha fin)
- Días restantes

## 🔧 Uso

### Desde el Sidebar
1. Click en "Cronograma" en el menú lateral
2. El componente se carga dinámicamente
3. Scroll automático a la sección

### Desde el Dashboard
El cronograma se carga automáticamente al cargar el dashboard del administrador:
1. Estado del Semestre
2. **Cronograma Académico** ← Nuevo
3. Panel de Administración (usuarios, asignaciones, etc.)

## 📊 Tipos de Eventos

| Tipo | Color | Icono | Descripción |
|------|-------|-------|-------------|
| `academic` | Azul | 🎓 | Eventos académicos generales |
| `tutoring` | Verde | 👨‍🏫 | Sesiones o eventos de tutorías |
| `deadline` | Rojo | ⏰ | Fechas límite importantes |
| `holiday` | Morado | 🏖️ | Feriados o días no laborables |
| `other` | Gris | ℹ️ | Otros eventos |

## 🔌 API Endpoints (Esperados)

### GET `/admin?action=cronograma_events`
Obtiene todos los eventos del cronograma

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "semester": {
      "name": "2025-2",
      "startDate": "2025-10-18",
      "endDate": "2025-12-16",
      "daysRemaining": 14
    },
    "events": [
      {
        "id": 1,
        "title": "Inicio de Clases",
        "description": "Inicio oficial del semestre",
        "type": "academic",
        "startDate": "2025-10-18",
        "endDate": null,
        "startTime": "08:00",
        "endTime": null,
        "status": "completed"
      }
    ]
  }
}
```

### POST `/admin?action=create_event`
Crea un nuevo evento

**Body:**
```json
{
  "title": "Exámenes Finales",
  "description": "Semana de evaluaciones finales",
  "type": "academic",
  "startDate": "2025-12-12",
  "endDate": "2025-12-16",
  "startTime": null,
  "endTime": null
}
```

### POST `/admin?action=update_event`
Actualiza un evento existente

**Body:**
```json
{
  "id": 1,
  "title": "Inicio de Clases (Actualizado)",
  "description": "...",
  "type": "academic",
  "startDate": "2025-10-18",
  "endDate": null,
  "startTime": "08:00",
  "endTime": null
}
```

### POST `/admin?action=delete_event`
Elimina un evento

**Body:**
```json
{
  "id": 1
}
```

## 🧪 Modo Mock (Datos de Prueba)

Si el backend no está disponible, el módulo carga automáticamente datos de prueba (`loadMockCronogramaData()`):
- 9 eventos de ejemplo
- Información del semestre 2025-2
- Diferentes tipos de eventos
- Estados variados (completado, próximo)

## 💡 Notas de Desarrollo

### Estado del Módulo
```javascript
CronogramaModule.state = {
    events: [],              // Array de eventos
    currentFilter: 'all',    // Filtro activo
    currentView: 'timeline', // Vista activa (timeline/calendar)
    semesterInfo: null,      // Info del semestre
    isLoading: false         // Estado de carga
}
```

### Funciones Principales
- `initCronogramaModule()` - Inicializa el módulo
- `loadCronogramaContent()` - Carga el HTML del componente
- `loadCronogramaData()` - Obtiene datos del backend
- `updateCronogramaUI()` - Actualiza toda la interfaz
- `filterEventsByType(type)` - Filtra eventos por tipo
- `toggleCronogramaView(view)` - Cambia entre vistas
- `saveEvent(e)` - Guarda evento (crear/editar)
- `deleteEvent(id)` - Elimina evento

## 🎨 Personalización

### Modificar colores de tipos de evento
Editar en `admin_cronograma.js`:
```javascript
const typeColors = {
    academic: { bg: 'bg-blue-50', border: 'border-blue-500', ... },
    // ...
}
```

### Modificar formato de fechas
Editar funciones `formatDate()` y `formatEventDate()` en `admin_cronograma.js`

## 🔄 Integración con Backend

Para conectar con el backend real:

1. Implementar los endpoints en `backend/api/admin.php`
2. Agregar actions: `cronograma_events`, `create_event`, `update_event`, `delete_event`
3. El módulo detectará automáticamente si el backend responde y usará datos reales
4. En caso de error, fallback a datos mock

## ✅ Checklist de Implementación Backend

- [ ] Crear tabla `cronograma_eventos` en la base de datos
- [ ] Implementar endpoint GET para listar eventos
- [ ] Implementar endpoint POST para crear evento
- [ ] Implementar endpoint POST para actualizar evento
- [ ] Implementar endpoint POST para eliminar evento
- [ ] Validación de permisos (solo admin)
- [ ] Validación de fechas dentro del semestre activo
- [ ] Logs de auditoría para cambios en el cronograma
