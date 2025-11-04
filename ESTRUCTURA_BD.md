# 📊 Estructura de Base de Datos - Sistema de Tutorías UNSAAC

## 🎯 Descripción General

Base de datos diseñada para gestionar el sistema de tutorías de la Universidad Nacional de San Antonio Abad del Cusco (UNSAAC), permitiendo la asignación, programación, seguimiento y verificación de tutorías académicas, personales y profesionales.

---

## 📋 Tablas Principales

### 🧩 1. USUARIOSISTEMA
**Descripción:** Gestiona administradores, tutores y verificadores del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `dni` | VARCHAR(8) UNIQUE | Documento Nacional de Identidad |
| `nombres` | VARCHAR(100) | Nombres del usuario |
| `apellidos` | VARCHAR(100) | Apellidos del usuario |
| `correo` | VARCHAR(255) UNIQUE | Correo institucional |
| `rol` | ENUM | Administrador, Tutor, Verificador |
| `especialidad` | VARCHAR(255) | Área de especialidad |
| `estado` | ENUM | Activo, Inactivo |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

**Índices:** `idx_dni`, `idx_correo`, `idx_rol`, `idx_estado`

---

### 👨‍🎓 2. ESTUDIANTE
**Descripción:** Almacena información de los estudiantes que reciben tutorías.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `codigo` | VARCHAR(10) UNIQUE | Código universitario |
| `dni` | VARCHAR(8) | Documento Nacional de Identidad |
| `nombres` | VARCHAR(100) | Nombres del estudiante |
| `apellidos` | VARCHAR(100) | Apellidos del estudiante |
| `correo` | VARCHAR(255) UNIQUE | Correo institucional |
| `semestre` | VARCHAR(20) | Semestre actual (ej: 2025-I) |
| `estado` | ENUM | Activo, Inactivo |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

**Índices:** `idx_codigo`, `idx_correo`, `idx_estado`

---

### 📅 3. SEMESTRE
**Descripción:** Define los períodos académicos del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `nombre` | VARCHAR(20) UNIQUE | Nombre del semestre (ej: 2025-I) |
| `fechaInicio` | DATE | Fecha de inicio del semestre |
| `fechaFin` | DATE | Fecha de finalización del semestre |
| `estado` | ENUM | Activo, Cerrado |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

**Índices:** `idx_nombre`, `idx_estado`

---

### 🔗 4. ASIGNACIONTUTOR
**Descripción:** Relaciona tutores con estudiantes en un semestre específico.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `idTutor` | INT (FK) | Referencia a usuariosistema |
| `nombreTutor` | VARCHAR(100) | Nombre del tutor (desnormalizado) |
| `apellidoTutor` | VARCHAR(100) | Apellido del tutor (desnormalizado) |
| `idEstudiante` | INT (FK) | Referencia a estudiante |
| `codigoEstudiante` | VARCHAR(10) | Código del estudiante (desnormalizado) |
| `nombreEstudiante` | VARCHAR(100) | Nombre del estudiante (desnormalizado) |
| `apellidoEstudiante` | VARCHAR(100) | Apellido del estudiante (desnormalizado) |
| `idSemestre` | INT (FK) | Referencia a semestre |
| `fechaAsignacion` | DATE | Fecha de la asignación |
| `estado` | ENUM | Activa, Inactiva |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

**Relaciones:**
- `idTutor` → `usuariosistema.id`
- `idEstudiante` → `estudiante.id`
- `idSemestre` → `semestre.id`

**Índices:** `idx_tutor`, `idx_estudiante`, `idx_semestre`, `idx_estado`

---

### 🕐 5. CRONOGRAMA
**Descripción:** Define los horarios y ambientes para las tutorías programadas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `idSemestre` | INT (FK) | Referencia a semestre |
| `fecha` | DATE | Fecha de la tutoría |
| `horaInicio` | TIME | Hora de inicio |
| `horaFin` | TIME | Hora de finalización |
| `ambiente` | VARCHAR(100) | Lugar físico (aula, laboratorio) |
| `descripcion` | TEXT | Descripción del evento |
| `estado` | ENUM | Programada, Completada, Cancelada |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

**Relaciones:**
- `idSemestre` → `semestre.id`

**Índices:** `idx_semestre`, `idx_fecha`, `idx_estado`

---

### 📝 6. TUTORIA
**Descripción:** Registra las sesiones de tutoría realizadas o pendientes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `idAsignacion` | INT (FK) | Referencia a asignaciontutor |
| `idCronograma` | INT (FK) | Referencia a cronograma |
| `tipo` | ENUM | Académica, Personal, Profesional |
| `fechaRealizada` | DATE | Fecha en que se realizó |
| `observaciones` | TEXT | Notas y observaciones |
| `estado` | ENUM | Pendiente, Realizada, Cancelada |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

**Relaciones:**
- `idAsignacion` → `asignaciontutor.id`
- `idCronograma` → `cronograma.id`

**Índices:** `idx_asignacion`, `idx_cronograma`, `idx_tipo`, `idx_estado`

---

### 📚 7. MATERIALES
**Descripción:** Almacena recursos educativos asociados a las tutorías.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `idTutoria` | INT (FK) | Referencia a tutoria |
| `titulo` | VARCHAR(255) | Título del material |
| `descripcion` | TEXT | Descripción del contenido |
| `tipo` | ENUM | PDF, Video, Documento, Enlace, Otro |
| `enlace` | VARCHAR(500) | URL o ruta del recurso |
| `fechaRegistro` | DATE | Fecha de registro |
| `created_at` | TIMESTAMP | Fecha de creación |

**Relaciones:**
- `idTutoria` → `tutoria.id`

**Índices:** `idx_tutoria`, `idx_tipo`

---

### ✅ 8. VERIFICACION
**Descripción:** Registra la validación de tutorías por parte de verificadores.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `idTutoria` | INT (FK) | Referencia a tutoria |
| `idVerificador` | INT (FK) | Referencia a usuariosistema |
| `fechaVerificacion` | DATE | Fecha de verificación |
| `comentarios` | TEXT | Observaciones del verificador |
| `aprobado` | TINYINT(1) | 1=Aprobado, 0=Rechazado |
| `created_at` | TIMESTAMP | Fecha de creación |

**Relaciones:**
- `idTutoria` → `tutoria.id`
- `idVerificador` → `usuariosistema.id`

**Índices:** `idx_tutoria`, `idx_verificador`

---

## 🔐 Tablas Auxiliares

### 🔑 VERIFICATION_CODES
**Descripción:** Gestiona códigos de verificación para autenticación.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `correo` | VARCHAR(255) | Correo del usuario |
| `code` | VARCHAR(6) | Código de verificación |
| `expires_at` | DATETIME | Fecha de expiración |
| `used` | TINYINT(1) | Si fue usado (0/1) |
| `created_at` | TIMESTAMP | Fecha de creación |

**Índices:** `idx_correo`, `idx_code`, `idx_expires`

---

### 📊 LOGIN_HISTORY
**Descripción:** Registra el historial de accesos al sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `correo` | VARCHAR(255) | Correo del usuario |
| `rol` | VARCHAR(50) | Rol del usuario |
| `ip_address` | VARCHAR(45) | Dirección IP |
| `user_agent` | TEXT | Navegador/dispositivo |
| `created_at` | TIMESTAMP | Fecha de acceso |

**Índices:** `idx_correo`, `idx_date`

---

## 🔄 Diagrama de Relaciones

```
┌─────────────────────┐
│  USUARIOSISTEMA     │
│  (Tutores, Admin,   │
│   Verificadores)    │
└──────┬──────────────┘
       │
       │ 1:N
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│ ASIGNACIONTUTOR  │          │  VERIFICACION    │
│                  │          │                  │
└───┬──────────────┘          └──────────────────┘
    │                                  ▲
    │                                  │
    │ N:1                              │ N:1
    ├─────────────┐                    │
    │             │                    │
    ▼             ▼                    │
┌──────────┐  ┌─────────────────────┐ │
│ESTUDIANTE│  │     TUTORIA         ├─┘
│          │  │                     │
└──────────┘  └───┬─────────────────┘
                  │
                  │ 1:N
                  ├──────────────┐
                  │              │
                  ▼              ▼
          ┌──────────────┐  ┌──────────────┐
          │  MATERIALES  │  │  CRONOGRAMA  │
          │              │  │              │
          └──────────────┘  └──┬───────────┘
                               │
                               │ N:1
                               ▼
                        ┌──────────────┐
                        │   SEMESTRE   │
                        │              │
                        └──────────────┘
```

---

## 🔗 Flujo de Relaciones Detallado

### 1️⃣ **Asignación de Tutorías**
```
USUARIOSISTEMA (Tutor) ──┐
                         │
ESTUDIANTE ──────────────┼──→ ASIGNACIONTUTOR ──→ Relación Tutor-Estudiante
                         │
SEMESTRE ────────────────┘
```

### 2️⃣ **Programación y Realización**
```
SEMESTRE ──→ CRONOGRAMA (Horarios)
                 │
                 ├──→ TUTORIA ──→ Sesión realizada
                 │       │
ASIGNACIONTUTOR ─┘       ├──→ MATERIALES (Recursos)
                         │
                         └──→ VERIFICACION (Aprobación)
```

### 3️⃣ **Verificación**
```
TUTORIA ──────┐
              │
              └──→ VERIFICACION ──→ USUARIOSISTEMA (Verificador)
```

---

## 📌 Características Clave

### ✨ **Integridad Referencial**
- Todas las relaciones utilizan `FOREIGN KEY` con políticas `ON DELETE CASCADE` o `ON DELETE SET NULL`
- Índices en campos clave para optimización de consultas

### 🔍 **Desnormalización Estratégica**
- Tabla `asignaciontutor` incluye nombres desnormalizados para consultas rápidas
- Reduce JOINs en reportes frecuentes

### 🏷️ **Estados y Enumeraciones**
- Estados claros: Activo/Inactivo, Pendiente/Realizada/Cancelada
- Tipos de tutoría: Académica, Personal, Profesional
- Roles: Administrador, Tutor, Verificador

### 📊 **Auditoría**
- Campos `created_at` y `updated_at` en todas las tablas principales
- Tabla `login_history` para registro de accesos

---

## 🎯 Casos de Uso

### 1. **Consultar tutorías de un estudiante**
```sql
SELECT 
    t.*, 
    a.nombreTutor, 
    a.apellidoTutor,
    c.fecha, 
    c.horaInicio, 
    c.horaFin,
    c.ambiente
FROM tutoria t
JOIN asignaciontutor a ON t.idAsignacion = a.id
JOIN cronograma c ON t.idCronograma = c.id
WHERE a.codigoEstudiante = '231442';
```

### 2. **Obtener tutorías pendientes de verificación**
```sql
SELECT 
    t.*,
    a.nombreTutor,
    a.nombreEstudiante
FROM tutoria t
JOIN asignaciontutor a ON t.idAsignacion = a.id
LEFT JOIN verificacion v ON t.id = v.idTutoria
WHERE t.estado = 'Realizada' AND v.id IS NULL;
```

### 3. **Listar materiales de una tutoría**
```sql
SELECT m.*
FROM materiales m
WHERE m.idTutoria = 1
ORDER BY m.fechaRegistro DESC;
```

---

## 🚀 Configuración

### Instalación
```bash
# Acceder a MySQL
mysql -u root -p

# Ejecutar el script
source c:/xampp/htdocs/Sistema-de-tutorias/backend/sql/schema.sql
```

### Verificación
```sql
SHOW TABLES;
SELECT COUNT(*) FROM estudiante;
SELECT COUNT(*) FROM usuariosistema;
```

---

## 📈 Datos de Prueba Incluidos

- ✅ **10 usuarios del sistema** (1 admin, 6 tutores, 2 verificadores)
- ✅ **27 estudiantes** con datos reales
- ✅ **2 semestres** (2024-II cerrado, 2025-I activo)
- ✅ **10 asignaciones** tutor-estudiante
- ✅ **4 cronogramas** programados
- ✅ **4 tutorías** (2 realizadas, 2 pendientes)
- ✅ **4 materiales** educativos
- ✅ **4 verificaciones** completadas

---

## 📝 Notas Técnicas

### Motor de Base de Datos
- **InnoDB**: Soporte completo para transacciones y claves foráneas
- **Charset**: utf8mb4 para compatibilidad con caracteres especiales

### Optimización
- Índices en campos de búsqueda frecuente
- Campos ENUM para valores predefinidos
- Timestamps automáticos para auditoría

### Seguridad
- Correos únicos en todas las tablas de usuarios
- DNI único para identificación
- Códigos de verificación con expiración

---

## 👥 Roles y Permisos

| Rol | Capacidades |
|-----|-------------|
| **Administrador** | Gestión completa del sistema, usuarios y configuración |
| **Tutor** | Crear cronogramas, realizar tutorías, subir materiales |
| **Estudiante** | Ver tutorías asignadas, acceder a materiales |
| **Verificador** | Validar y aprobar tutorías realizadas |

---

## 📧 Contacto y Soporte

**Sistema de Tutorías - UNSAAC**  
Escuela Profesional de Ingeniería Informática y de Sistemas  
Universidad Nacional de San Antonio Abad del Cusco

---

*Última actualización: 3 de noviembre de 2025*
