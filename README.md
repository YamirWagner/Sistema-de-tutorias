# Sistema de Tutorías Institucional

Sistema web completo para la gestión de tutorías académicas con autenticación por código de verificación, integración con Google Calendar y gestión por roles.

## 🚀 Características

- **Autenticación segura** mediante código de 6 dígitos enviado por correo
- **Sistema de roles**: Administrador, Tutor, Estudiante y Verificador
- **Integración con Google Calendar** para gestión de sesiones
- **Panel personalizado** según el rol del usuario
- **Gestión de sesiones de tutoría**
- **Sistema de reportes y verificación**
- **Subida de materiales de estudio**

## 📋 Requisitos

- PHP 7.4 o superior
- MySQL 5.7 o superior
- XAMPP, WAMP o servidor web similar
- Composer (para dependencias PHP)
- Cuenta de correo SMTP (Gmail recomendado)

## 🛠️ Instalación

### 1. Clonar o descargar el proyecto

```bash
git clone https://github.com/YamirWagner/Sistema-de-tutorias.git
cd Sistema-de-tutorias1
```

### 2. Configurar la base de datos

1. Abre phpMyAdmin o tu gestor de MySQL
2. Importa el archivo `backend/sql/schema.sql`
3. Esto creará la base de datos `sistema_tutorias` con todas las tablas necesarias

### 3. Configurar variables de entorno

1. Edita el archivo `.env` en la carpeta `backend/`
2. Configura los valores según tu entorno

### 4. Iniciar el servidor

Si usas XAMPP:
1. Copia el proyecto a `C:\xampp\htdocs\Sistema-de-tutorias1`
2. Inicia Apache y MySQL desde el panel de XAMPP
3. Accede a `http://localhost/Sistema-de-tutorias1/frontend/index.html`

## 👥 Usuarios de Prueba

| Email | Rol | Descripción |
|-------|-----|-------------|
| admin@institucion.edu | Administrador | Acceso completo |
| tutor1@institucion.edu | Tutor | Gestión de sesiones |
| estudiante1@institucion.edu | Estudiante | Solicitar tutorías |
| verificador@institucion.edu | Verificador | Verificar sesiones |

## 📁 Estructura del Proyecto

```
/sistema-tutorias/
├─ frontend/              # Interfaz del usuario
│  ├─ index.html          # Página principal
│  ├─ login.html          # Login por correo
│  ├─ verify.html         # Verificación de código
│  ├─ dashboard.html      # Panel principal
│  ├─ js/                 # JavaScript
│  ├─ css/                # Estilos
│  ├─ components/         # Componentes reutilizables
│  └─ assets/             # Imágenes y recursos
│
├─ backend/               # Lógica del sistema
│  ├─ api/                # Endpoints de la API
│  ├─ core/               # Funciones principales
│  ├─ models/             # Modelos de datos
│  ├─ storage/            # Archivos y logs
│  └─ sql/                # Esquema de BD
│
└─ README.md
```

## 🎯 Uso del Sistema

### Flujo de Autenticación

1. Usuario ingresa su correo institucional
2. Se genera y envía un código de 6 dígitos
3. Usuario ingresa el código recibido
4. Sistema valida y genera token JWT
5. Redirección al dashboard según rol

## 👨‍💻 Autor

Sistema desarrollado por YamirWagner