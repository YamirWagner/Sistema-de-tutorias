# Módulo Verificador - Sistema de Tutorías UNSAAC

## 📋 Descripción

El módulo de verificador permite supervisar y gestionar todas las actividades del sistema de tutorías. Incluye dashboard con estadísticas, gestión de administradores, historial por estudiantes y seguimiento por tutores.

## 🎯 Características Principales

### 1. Dashboard Principal (Inicio)
**Ruta:** `http://localhost/Sistema-de-tutorias/verificador`

- Estadísticas generales (Total sesiones, Pendientes, Verificadas, Faltantes)
- Gráficos de asistencia general
- Gráficos de tutorías por mes
- Top 5 estudiantes más activos
- Top 5 tutores más activos
- Accesos rápidos a todos los módulos

### 2. Administradores
**Ruta:** `http://localhost/Sistema-de-tutorias/administradores`

- Lista completa de administradores del sistema
- Búsqueda en tiempo real
- Estadísticas de administradores activos
- Último acceso registrado
- Ver detalles de cada administrador

### 3. Historial por Estudiante
**Ruta:** `http://localhost/Sistema-de-tutorias/historial-estudiante`

- Búsqueda de estudiantes por código o nombre
- Información completa del estudiante
- Estadísticas de asistencia (Total, Asistencias, Faltas)
- Historial completo de tutorías
- Filtros por semestre y estado
- Información detallada de cada sesión

### 4. Seguimiento por Tutor
**Ruta:** `http://localhost/Sistema-de-tutorias/seguimiento-tutor`

- Selección de tutor del sistema
- Estadísticas del tutor (Sesiones totales, Realizadas, Pendientes, Estudiantes atendidos)
- Gráficos de sesiones por mes
- Gráfico de distribución de estados
- Historial completo de sesiones del tutor
- Filtros por mes y estado
- Exportación a PDF (en desarrollo)

## 📁 Estructura de Archivos

```
Sistema-de-tutorias/
├── backend/
│   └── api/
│       ├── verificador.php          # API principal del verificador
│       └── verficador.php           # Archivo antiguo (deprecado)
│
├── frontend/
│   ├── components/
│   │   └── verificador/
│   │       ├── verificador.html               # Dashboard principal
│   │       ├── administradores.html           # Módulo de administradores
│   │       ├── historial-estudiante.html      # Módulo historial estudiante
│   │       └── seguimiento-tutor.html         # Módulo seguimiento tutor
│   │
│   ├── css/
│   │   └── verificador/
│   │       ├── verificador.css                # Estilos dashboard
│   │       ├── administradores.css            # Estilos administradores
│   │       ├── historial-estudiante.css       # Estilos historial
│   │       ├── seguimiento-tutor.css          # Estilos seguimiento
│   │       └── veficador.css                  # Archivo antiguo (deprecado)
│   │
│   └── js/
│       └── verificador/
│           ├── verificador.js                 # Lógica dashboard principal
│           ├── administradores.js             # Lógica administradores
│           ├── historial-estudiante.js        # Lógica historial
│           └── seguimiento-tutor.js           # Lógica seguimiento
```

## 🎨 Paleta de Colores

El módulo utiliza la paleta de colores institucional de UNSAAC:

- **Primario:** `#9B192D` (Rojo UNSAAC)
- **Secundario:** `#7B1113` (Rojo oscuro)
- **Éxito:** `#4caf50` (Verde)
- **Advertencia:** `#ff9800` (Naranja)
- **Peligro:** `#f44336` (Rojo)
- **Info:** `#3498db` (Azul)
- **Texto:** `#2c3e50` (Gris oscuro)
- **Texto secundario:** `#7f8c8d` (Gris)
- **Fondo:** `#f5f5f5` (Gris claro)

## 🔌 Endpoints del API

### Dashboard
- `GET /api/verificador?action=stats` - Obtener estadísticas generales
- `GET /api/verificador?action=chart-data` - Obtener datos para gráficos
- `GET /api/verificador?action=top-students` - Top 5 estudiantes
- `GET /api/verificador?action=top-tutors` - Top 5 tutores

### Administradores
- `GET /api/verificador?action=administradores` - Listar administradores

### Historial por Estudiante
- `GET /api/verificador?action=buscar-estudiante&codigo=XXX` - Buscar estudiante
- `GET /api/verificador?action=buscar-estudiante&nombre=XXX` - Buscar por nombre
- `GET /api/verificador?action=historial-estudiante&estudiante_id=XXX` - Historial

### Seguimiento por Tutor
- `GET /api/verificador?action=lista-tutores` - Listar todos los tutores
- `GET /api/verificador?action=datos-tutor&tutor_id=XXX` - Datos del tutor
- `GET /api/verificador?action=sesiones-tutor&tutor_id=XXX` - Sesiones del tutor

## 🚀 Uso

### 1. Iniciar sesión como verificador
Utilice credenciales de un usuario con rol `verifier`.

### 2. Acceder al dashboard
Al iniciar sesión, será redirigido automáticamente a:
```
http://localhost/Sistema-de-tutorias/verificador
```

### 3. Navegación
Utilice el menú lateral (sidebar) para navegar entre módulos:
- **Inicio:** Dashboard principal
- **Administradores:** Gestión de administradores
- **Lista de Asistencias:** (Módulo existente)
- **Búsqueda de Tutorías:** (Módulo existente)
- **Historial por Estudiante:** Consultar historial de estudiantes
- **Seguimiento por Tutor:** Monitorear actividad de tutores

## 📊 Gráficos (Chart.js)

El módulo utiliza Chart.js para visualización de datos:

- **Gráfico de Donut:** Distribución de asistencia
- **Gráfico de Línea:** Tutorías por mes
- **Gráfico de Barras:** Sesiones por tutor/mes
- **Gráfico de Donut:** Estados de sesiones

## 🔐 Seguridad

- Todas las rutas requieren autenticación JWT
- Validación de rol `verifier` en el backend
- Protección contra inyección SQL con PDO prepared statements
- Validación de parámetros en todas las consultas

## 🐛 Depuración

Para ver logs en consola del navegador:
```javascript
// Dashboard
console.log('%c🔍 VERIFICADOR CARGADO', ...)

// Administradores
console.log('%c👥 MÓDULO ADMINISTRADORES CARGADO', ...)

// Historial
console.log('%c📚 MÓDULO HISTORIAL POR ESTUDIANTE CARGADO', ...)

// Seguimiento
console.log('%c👨‍🏫 MÓDULO SEGUIMIENTO POR TUTOR CARGADO', ...)
```

## 📝 Notas de Desarrollo

- **Versión:** 1.0.0
- **Fecha:** 31 de Diciembre de 2025
- **Autor:** Sistema de Tutorías UNSAAC
- **Dependencias:** Chart.js, Font Awesome, Flowbite

## ⚠️ Archivos Deprecados

Los siguientes archivos son de la implementación antigua y deben ser ignorados:
- `/backend/api/verficador.php` (error de ortografía)
- `/frontend/css/verificador/veficador.css` (error de ortografía)
- `/frontend/components/verificador/verificador.html` (antiguo, usar dashboard)

## 🔄 Próximas Actualizaciones

- [ ] Exportación de reportes a PDF
- [ ] Filtros avanzados en todas las secciones
- [ ] Notificaciones en tiempo real
- [ ] Modo de comparación entre tutores
- [ ] Dashboard personalizable
- [ ] Integración con módulos de asistencias existentes

## 📞 Soporte

Para problemas o consultas, contactar al equipo de desarrollo del Sistema de Tutorías UNSAAC.
