// ========================================
// GESTIÓN DE SESIONES DE TUTORÍA
// ========================================

let sesionActual = null;

// ========================================
// FUNCIONES PRINCIPALES
// ========================================

/**
 * Abre el modal de sesión de tutoría
 * @param {number} idSesion - ID de la sesión a gestionar
 */
async function abrirModalSesionTutoria(idSesion) {
    try {
        mostrarLoader();
        
        // Obtener detalles de la sesión
        const detalles = await obtenerDetallesSesion(idSesion);
        
        if (detalles) {
            sesionActual = detalles;
            mostrarInformacionSesion(detalles);
            // Pre-cargar el ID en el formulario
            document.getElementById('idTutoria').value = detalles.id;
            mostrarModal();
        }
        
        ocultarLoader();
    } catch (error) {
        ocultarLoader();
        console.error('Error al abrir modal:', error);
        mostrarError('Error al cargar los detalles de la sesión');
    }
}

/**
 * Obtiene los detalles de una sesión desde el backend
 * @param {number} idSesion - ID de la sesión
 * @returns {Object} Datos de la sesión
 */
async function obtenerDetallesSesion(idSesion) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('No se encontró el token de autenticación. Por favor, inicie sesión nuevamente.');
    }
    
    const response = await fetch(
        `${APP_CONFIG.API.BASE_URL}/atenciontutoria.php?action=detalle&id=${idSesion}`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );
    
    // Verificar si la respuesta es JSON válida
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error('Respuesta no JSON:', text);
        throw new Error('Error en el servidor. Por favor, contacte al administrador.');
    }
    
    const data = await response.json();
    
    if (data.success) {
        return data.data;
    } else {
        throw new Error(data.message || 'Error al obtener detalles');
    }
}

/**
 * Muestra la información de la sesión en el modal
 * @param {Object} sesion - Datos de la sesión
 */
function mostrarInformacionSesion(sesion) {
    document.getElementById('nombreEstudiante').textContent = 
        `${sesion.estudianteNombres} ${sesion.estudianteApellidos}`;
    document.getElementById('codigoEstudiante').textContent = sesion.estudianteCodigo;
    document.getElementById('tipoTutoria').textContent = sesion.tipoTutoria;
    document.getElementById('fechaSesion').textContent = formatearFecha(sesion.fecha);
    document.getElementById('horarioSesion').textContent = 
        `${sesion.horaInicio} - ${sesion.horaFin}`;
    document.getElementById('modalidadSesion').textContent = sesion.modalidad || 'No especificada';
}

// ========================================
// NAVEGACIÓN ENTRE VISTAS
// ========================================

// ========================================
// REGISTRAR SESIÓN
// ========================================

/**
 * Registra la sesión de tutoría
 * @param {Event} event - Evento del formulario
 */
async function registrarSesion(event) {
    event.preventDefault();
    
    const idTutoria = parseInt(document.getElementById('idTutoria').value);
    const observaciones = document.getElementById('observaciones').value;
    
    try {
        mostrarLoader();
        
        const token = localStorage.getItem('token');
        const response = await fetch(
            `${APP_CONFIG.API.BASE_URL}/atenciontutoria.php?action=registrar-academica`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    idTutoria: idTutoria,
                    observaciones: observaciones
                })
            }
        );
        
        const data = await response.json();
        
        ocultarLoader();
        
        if (data.success) {
            mostrarExito('Sesión registrada correctamente');
            cerrarModalSesion();
            // Recargar el calendario si existe la función
            if (typeof cargarAgendamientos === 'function') {
                cargarAgendamientos();
            }
        } else {
            mostrarError(data.message || 'Error al registrar la sesión');
        }
    } catch (error) {
        ocultarLoader();
        console.error('Error:', error);
        mostrarError('Error al registrar la sesión');
    }
}

// ========================================
// POSPONER SESIÓN
// ========================================

/**
 * Pospone una sesión de tutoría
 * @param {Event} event - Evento del formulario
 */
async function posponerSesion(event) {
    event.preventDefault();
    
    const nuevaFecha = document.getElementById('nuevaFecha').value;
    const nuevaHoraInicio = document.getElementById('nuevaHoraInicio').value;
    const nuevaHoraFin = document.getElementById('nuevaHoraFin').value;
    
    try {
        mostrarLoader();
        
        const token = localStorage.getItem('token');
        const response = await fetch(
            `${APP_CONFIG.API.BASE_URL}/atenciontutoria.php?action=posponer`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: sesionActual.id,
                    fecha: nuevaFecha,
                    horaInicio: nuevaHoraInicio,
                    horaFin: nuevaHoraFin
                })
            }
        );
        
        const data = await response.json();
        
        ocultarLoader();
        
        if (data.success) {
            mostrarExito('Sesión pospuesta correctamente');
            cerrarModalSesion();
            // Recargar el calendario si existe la función
            if (typeof cargarAgendamientos === 'function') {
                cargarAgendamientos();
            }
        } else {
            mostrarError(data.message || 'Error al posponer la sesión');
        }
    } catch (error) {
        ocultarLoader();
        console.error('Error:', error);
        mostrarError('Error al posponer la sesión');
    }
}

// UTILIDADES
// ========================================

/**
 * Formatea una fecha al formato legible
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada
 */
function formatearFecha(fecha) {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-ES', opciones);
}

/**
 * Muestra el modal
 */
function mostrarModal() {
    document.getElementById('modalSesionTutoria').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Cierra el modal
 */
function cerrarModalSesion() {
    document.getElementById('modalSesionTutoria').style.display = 'none';
    document.body.style.overflow = 'auto';
    limpiarFormularios();
    sesionActual = null;
}

/**
 * Limpia todos los formularios
 */
function limpiarFormularios() {
    const formRegistro = document.getElementById('formRegistroSesion');
    if (formRegistro) {
        formRegistro.reset();
    }
    const formPosponer = document.getElementById('formPosponer');
    if (formPosponer) {
        formPosponer.reset();
    }
}

/**
 * Muestra el loader
 */
function mostrarLoader() {
    document.getElementById('loader').style.display = 'flex';
}

/**
 * Oculta el loader
 */
function ocultarLoader() {
    document.getElementById('loader').style.display = 'none';
}

/**
 * Muestra un mensaje de error
 * @param {string} mensaje - Mensaje a mostrar
 */
function mostrarError(mensaje) {
    alert('❌ Error: ' + mensaje);
}

/**
 * Muestra un mensaje de éxito
 * @param {string} mensaje - Mensaje a mostrar
 */
function mostrarExito(mensaje) {
    alert('✅ ' + mensaje);
}

// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Event listener para el formulario de registro
    const formRegistro = document.getElementById('formRegistroSesion');
    if (formRegistro) {
        formRegistro.addEventListener('submit', registrarSesion);
    }
    
    // Event listener para el formulario de posponer
    const formPosponer = document.getElementById('formPosponer');
    if (formPosponer) {
        formPosponer.addEventListener('submit', posponerSesion);
    }
    
    // Cerrar modal al hacer clic fuera del contenedor
    const modalOverlay = document.getElementById('modalSesionTutoria');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                cerrarModalSesion();
            }
        });
    }
});

// Exponer funciones globales para uso desde otros archivos
window.abrirModalSesionTutoria = abrirModalSesionTutoria;
window.cerrarModalSesion = cerrarModalSesion;
