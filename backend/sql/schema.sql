-- schema.sql - Estructura de base de datos Sistema de Tutorías UNSAAC

CREATE DATABASE IF NOT EXISTS sistema_tutorias CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sistema_tutorias;

-- ============================================
-- 1. TABLA USUARIOSISTEMA (Administrador, Tutores y Verificadores)
-- ============================================
CREATE TABLE IF NOT EXISTS usuariosistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(8) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    rol ENUM('Administrador', 'Tutor', 'Verificador') NOT NULL,
    especialidad VARCHAR(255),
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dni (dni),
    INDEX idx_correo (correo),
    INDEX idx_rol (rol),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Eliminado: no usar tablas adicionales para control de sesión)

-- ============================================
-- 2. TABLA ESTUDIANTE
-- ============================================
CREATE TABLE IF NOT EXISTS estudiante (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    dni VARCHAR(8),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    semestre VARCHAR(20) NOT NULL,
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo),
    INDEX idx_correo (correo),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. TABLA SEMESTRE
-- ============================================
CREATE TABLE IF NOT EXISTS semestre (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    fechaInicio DATE NOT NULL,
    fechaFin DATE NOT NULL,
    estado ENUM('Activo', 'Cerrado') DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. TABLA ASIGNACIONTUTOR (Relación Tutor-Estudiante-Semestre)
-- ============================================
CREATE TABLE IF NOT EXISTS asignaciontutor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idTutor INT NOT NULL,
    idEstudiante INT NOT NULL,
    idSemestre INT NOT NULL,
    fechaAsignacion DATE NOT NULL,
    estado ENUM('Activa', 'Inactiva') DEFAULT 'Activa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idTutor) REFERENCES usuariosistema(id) ON DELETE CASCADE,
    FOREIGN KEY (idEstudiante) REFERENCES estudiante(id) ON DELETE CASCADE,
    FOREIGN KEY (idSemestre) REFERENCES semestre(id) ON DELETE CASCADE,
    INDEX idx_tutor (idTutor),
    INDEX idx_estudiante (idEstudiante),
    INDEX idx_semestre (idSemestre),
    INDEX idx_estado (estado),
    UNIQUE KEY unique_asignacion (idTutor, idEstudiante, idSemestre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. TABLA CRONOGRAMA
-- ============================================
CREATE TABLE IF NOT EXISTS cronograma (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idSemestre INT NOT NULL,
    fecha DATE NOT NULL,
    horaInicio TIME NOT NULL,
    horaFin TIME NOT NULL,
    ambiente VARCHAR(100),
    descripcion TEXT,
    estado ENUM('Programada', 'Completada', 'Cancelada') DEFAULT 'Programada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idSemestre) REFERENCES semestre(id) ON DELETE CASCADE,
    INDEX idx_semestre (idSemestre),
    INDEX idx_fecha (fecha),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. TABLA TUTORIA (También funciona como Agendamientos)
-- ============================================
CREATE TABLE IF NOT EXISTS tutoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idAsignacion INT NOT NULL,
    idCronograma INT NULL,
    fecha DATE NULL,
    horaInicio TIME NULL,
    horaFin TIME NULL,
    tipo ENUM('Academica', 'Personal', 'Profesional') NOT NULL,
    modalidad ENUM('Presencial', 'Virtual', 'Hibrida') NULL,
    fechaRealizada DATE,
    observaciones TEXT,
    motivoCancelacion TEXT,
    fechaCancelacion DATETIME,
    estado ENUM('Pendiente', 'Programada', 'Reprogramada', 'Realizando', 'Realizada', 'Cancelada', 'Cancelada_Automatica') DEFAULT 'Programada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idAsignacion) REFERENCES asignaciontutor(id) ON DELETE CASCADE,
    FOREIGN KEY (idCronograma) REFERENCES cronograma(id) ON DELETE SET NULL,
    INDEX idx_asignacion (idAsignacion),
    INDEX idx_cronograma (idCronograma),
    INDEX idx_tipo (tipo),
    INDEX idx_estado (estado),
    INDEX idx_fecha (fecha),
    INDEX idx_fecha_estado (fecha, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. TABLA MATERIALES
-- ============================================
CREATE TABLE IF NOT EXISTS materiales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idTutoria INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo ENUM('PDF', 'Video', 'Documento', 'Enlace', 'Otro') NOT NULL,
    enlace VARCHAR(500),
    fechaRegistro DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idTutoria) REFERENCES tutoria(id) ON DELETE CASCADE,
    INDEX idx_tutoria (idTutoria),
    INDEX idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. TABLA VERIFICACION
-- ============================================
CREATE TABLE IF NOT EXISTS verificacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idTutoria INT NOT NULL,
    idVerificador INT NOT NULL,
    fechaVerificacion DATE NOT NULL,
    comentarios TEXT,
    aprobado TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idTutoria) REFERENCES tutoria(id) ON DELETE CASCADE,
    FOREIGN KEY (idVerificador) REFERENCES usuariosistema(id) ON DELETE CASCADE,
    INDEX idx_tutoria (idTutoria),
    INDEX idx_verificador (idVerificador)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLAS AUXILIARES PARA AUTENTICACIÓN
-- ============================================

-- Tabla de códigos de verificación
CREATE TABLE IF NOT EXISTS verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    correo VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_correo (correo),
    INDEX idx_code (code),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de historial de inicio de sesión
CREATE TABLE IF NOT EXISTS login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    correo VARCHAR(255) NOT NULL,
    rol VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_correo (correo),
    INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATOS DE PRUEBA
-- ============================================

-- Insertar UsuarioSistema
INSERT INTO usuariosistema (dni, nombres, apellidos, correo, rol, especialidad, estado) VALUES
('74852146', 'Ana', 'Quispe Huamán', 'ana.quispe@unsaac.edu.pe', 'Administrador', 'Gestión Académica', 'Activo'),
('72365412', 'Luis', 'Paredes Ramos', 'luis.paredes@unsaac.edu.pe', 'Tutor', 'Inteligencia Artificial', 'Activo'),
('75123987', 'María', 'Choque Condori', 'maria.choque@unsaac.edu.pe', 'Tutor', 'Ingeniería de Software', 'Activo'),
('74569321', 'José', 'Huillca Torres', 'jose.huillca@unsaac.edu.pe', 'Tutor', 'Redes y Comunicaciones', 'Activo'),
('73546812', 'Walter', 'Huamán Tito', 'walter.huaman@unsaac.edu.pe', 'Tutor', 'Gestión de Proyectos', 'Activo'),
('75236147', 'Diego', 'Vargas Arce', 'diego.vargas@unsaac.edu.pe', 'Tutor', 'Ciencia de Datos', 'Activo'),
('74002563', 'Rosa', 'Suca Ccahuana', 'rosa.suca@unsaac.edu.pe', 'Tutor', 'Sistemas Embebidos', 'Activo'),
('74125698', 'Pedro', 'Mamani Flores', 'pedro.mamani@unsaac.edu.pe', 'Verificador', 'Gestión Educativa', 'Activo'),
('73251489', 'Silvia', 'Pino Zúñiga', 'silvia.pino@unsaac.edu.pe', 'Verificador', 'Evaluación Académica', 'Activo'),
('72856932', 'Carla', 'Apaza Gómez', 'carla.apaza@unsaac.edu.pe', 'Tutor', 'Ciberseguridad', 'Inactivo');

-- Insertar Estudiantes
INSERT INTO estudiante (codigo, dni, nombres, apellidos, correo, semestre, estado) VALUES
('231861', NULL, 'Diana Azumi', 'Accostupa Alcca', '231861@unsaac.edu.pe', '2025-I', 'Activo'),
('204792', NULL, 'Andree', 'Achahuanco Valenza', '204792@unsaac.edu.pe', '2025-I', 'Activo'),
('231862', NULL, 'Eduardo Sebastian', 'Achahui Jimenez', '231862@unsaac.edu.pe', '2025-I', 'Activo'),
('221443', NULL, 'Andre Alfredo', 'Calderon Rodriguez', '221443@unsaac.edu.pe', '2025-I', 'Activo'),
('232317', NULL, 'Erick Sebastian', 'Chuchon Valdez', '232317@unsaac.edu.pe', '2025-I', 'Activo'),
('231866', NULL, 'Fidel Enrique', 'Colque Quispe', '231866@unsaac.edu.pe', '2025-I', 'Activo'),
('210924', NULL, 'Ibeth Janela del Pilar', 'Cusi Diaz', '210924@unsaac.edu.pe', '2025-I', 'Activo'),
('230601', NULL, 'Gisel Dayana', 'Farfan Gomez', '230601@unsaac.edu.pe', '2025-I', 'Activo'),
('231442', NULL, 'Yamir Wagner', 'Florez Vega', '231442@unsaac.edu.pe', '2025-I', 'Activo'),
('225452', NULL, 'Marco Abel', 'Gallegos Silva', '225452@unsaac.edu.pe', '2025-I', 'Activo'),
('231443', NULL, 'Gerald Benjamin', 'Huanto Ayma', '231443@unsaac.edu.pe', '2025-I', 'Activo'),
('231444', NULL, 'Jhoel Fabrizzio', 'Magaña Osorio', '231444@unsaac.edu.pe', '2025-I', 'Activo'),
('231445', NULL, 'Brenda Lucia', 'Mayhuire Chacon', '231445@unsaac.edu.pe', '2025-I', 'Activo'),
('230971', NULL, 'Jose Daniel', 'Mendoza Quispe', '230971@unsaac.edu.pe', '2025-I', 'Activo'),
('231447', NULL, 'Rosy Aurely', 'Montalvo Solorzano', '231447@unsaac.edu.pe', '2025-I', 'Activo'),
('154636', NULL, 'Jose Ramiro', 'Palomino Auquitayasi', '154636@unsaac.edu.pe', '2025-I', 'Activo'),
('210939', NULL, 'Gustavo', 'Pantoja Olave', '210939@unsaac.edu.pe', '2025-I', 'Activo'),
('225461', NULL, 'Jhon Andherson', 'Quispe Llavilla', '225461@unsaac.edu.pe', '2025-I', 'Activo'),
('191978', NULL, 'Domingo de Guzman', 'Quispe Mamani', '191978@unsaac.edu.pe', '2025-I', 'Activo'),
('230972', NULL, 'Carlos Rodrigo', 'Rivera Solorzano', '230972@unsaac.edu.pe', '2025-I', 'Activo'),
('141158', NULL, 'Cesar Andersson', 'Saire Hancco', '141158@unsaac.edu.pe', '2025-I', 'Activo'),
('200341', NULL, 'Elbert Cesar', 'Sanchez Chacon', '200341@unsaac.edu.pe', '2025-I', 'Activo'),
('230603', NULL, 'Eduardo Jhosef', 'Santos Pillco', '230603@unsaac.edu.pe', '2025-I', 'Activo'),
('225465', NULL, 'Raul Franshesco', 'Vasquez Mamani', '225465@unsaac.edu.pe', '2025-I', 'Activo'),
('220555', NULL, 'Edu Piero', 'Villavicencio Seguil', '220555@unsaac.edu.pe', '2025-I', 'Activo'),
('160337', NULL, 'Efrain', 'Vitorino Marin', '160337@unsaac.edu.pe', '2025-I', 'Activo'),
('231448', NULL, 'Kaled Salvador', 'Yuca Chipana', '231448@unsaac.edu.pe', '2025-I', 'Activo');

-- Insertar Semestres
INSERT INTO semestre (nombre, fechaInicio, fechaFin, estado) VALUES
('2024-II', '2024-08-01', '2024-12-20', 'Cerrado'),
('2025-I', '2025-03-01', '2025-07-15', 'Activo');

-- Insertar AsignacionTutor
INSERT INTO asignaciontutor (idTutor, idEstudiante, idSemestre, fechaAsignacion) VALUES
(2, 1, 2, '2025-03-05'),
(3, 2, 2, '2025-03-05'),
(4, 3, 2, '2025-03-06'),
(7, 4, 2, '2025-03-06'),
(5, 5, 2, '2025-03-07'),
(2, 6, 2, '2025-03-07'),
(6, 7, 2, '2025-03-07'),
(3, 8, 2, '2025-03-07'),
(4, 9, 2, '2025-03-07'),
(7, 10, 2, '2025-03-07');

-- Insertar Cronograma
INSERT INTO cronograma (idSemestre, fecha, horaInicio, horaFin, ambiente, descripcion, estado) VALUES
(2, '2025-04-10', '09:00', '10:00', 'Lab A', 'Tutoría inicial', 'Programada'),
(2, '2025-04-20', '10:00', '11:00', 'Aula 101', 'Tutoría personal', 'Programada'),
(2, '2025-05-05', '08:00', '09:00', 'Lab B', 'Tutoría profesional', 'Programada'),
(2, '2025-06-01', '11:00', '12:00', 'Aula 202', 'Seguimiento final', 'Programada');

-- Insertar Tutorías
INSERT INTO tutoria (idAsignacion, idCronograma, tipo, fechaRealizada, observaciones, estado) VALUES
(1, 1, 'Académica', '2025-04-10', 'Revisión de notas', 'Realizada'),
(2, 2, 'Personal', '2025-04-20', 'Hábitos de estudio', 'Realizada'),
(3, 3, 'Profesional', '2025-05-05', 'Evaluación profesional', 'Pendiente'),
(4, 4, 'Académica', '2025-06-01', 'Cierre de ciclo', 'Pendiente');

-- Insertar Materiales
INSERT INTO materiales (idTutoria, titulo, descripcion, tipo, enlace, fechaRegistro) VALUES
(1, 'Guía C++', 'Introducción a programación', 'PDF', 'https://unsaac.edu.pe/mat1', '2025-04-10'),
(2, 'Video Hábitos', 'Técnicas de estudio', 'Video', 'https://youtu.be/abc123', '2025-04-20'),
(3, 'Plantilla CV', 'Formato profesional', 'Documento', 'https://unsaac.edu.pe/mat2', '2025-05-05'),
(4, 'Informe final', 'Resumen de progreso', 'Documento', 'https://unsaac.edu.pe/mat3', '2025-06-01');

-- Insertar Verificaciones
INSERT INTO verificacion (idTutoria, idVerificador, fechaVerificacion, comentarios, aprobado) VALUES
(1, 8, '2025-04-15', 'Correctamente documentada', 1),
(2, 9, '2025-04-21', 'Comunicación efectiva', 1),
(3, 8, '2025-05-10', 'Evaluación profesional pendiente', 1),
(4, 9, '2025-06-05', 'Tutoría aprobada', 1);

-- ============================================
-- 9. TABLA CONSTANCIA
-- ============================================
CREATE TABLE IF NOT EXISTS constancia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idTutor INT NOT NULL,
    idEstudiante INT NOT NULL,
    idAsignacion INT NOT NULL,
    idSemestre INT NOT NULL,
    fechaGeneracion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rutaPDF VARCHAR(500) NOT NULL,
    firmado TINYINT(1) DEFAULT 0,
    fechaFirma DATETIME NULL,
    estado ENUM('Activo', 'Anulado') DEFAULT 'Activo',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idTutor) REFERENCES usuariosistema(id) ON DELETE CASCADE,
    FOREIGN KEY (idEstudiante) REFERENCES estudiante(id) ON DELETE CASCADE,
    FOREIGN KEY (idAsignacion) REFERENCES asignaciontutor(id) ON DELETE CASCADE,
    FOREIGN KEY (idSemestre) REFERENCES semestre(id) ON DELETE CASCADE,
    INDEX idx_tutor (idTutor),
    INDEX idx_estudiante (idEstudiante),
    INDEX idx_asignacion (idAsignacion),
    INDEX idx_semestre (idSemestre),
    INDEX idx_estado (estado),
    INDEX idx_firmado (firmado),
    INDEX idx_fecha (fechaGeneracion),
    UNIQUE KEY unique_constancia (idEstudiante, idAsignacion, idSemestre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. TABLA LOGACCESO (Bitácora del sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS logacceso (
    idLog INT AUTO_INCREMENT PRIMARY KEY,
    idUsuario INT NULL,
    idEstudiante INT NULL,
    usuario VARCHAR(100) NULL,
    tipoAcceso VARCHAR(50) NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fechaHora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estadoSesion ENUM('activa', 'cerrada') NULL,
    ipOrigen VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idUsuario) REFERENCES usuariosistema(id) ON DELETE SET NULL,
    FOREIGN KEY (idEstudiante) REFERENCES estudiante(id) ON DELETE SET NULL,
    INDEX idx_idUsuario (idUsuario),
    INDEX idx_idEstudiante (idEstudiante),
    INDEX idx_usuario (usuario),
    INDEX idx_tipoAcceso (tipoAcceso),
    INDEX idx_accion (accion),
    INDEX idx_fechaHora (fechaHora),
    INDEX idx_estadoSesion (estadoSesion),
    INDEX idx_ipOrigen (ipOrigen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
