// ============================================
// FUNCIÓN DE CARGA DEL MÓDULO (Para navegación dinámica)
// ============================================

/**
 * Cargar el contenido del módulo de historial
 */
async function loadHistorialContent() {
    console.log('🔍 loadHistorialContent() ejecutándose...');
    
    const content = document.getElementById('dashboardContent');
    if (!content) {
        console.error('❌ dashboardContent no encontrado');
        return;
    }
    
    try {
        content.innerHTML = '<div class="loading-message"><i class="fa-solid fa-spinner fa-spin"></i><p>Cargando módulo de historial...</p></div>';
        
        // Cargar CSS si no existe
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const cssPath = `${basePath}/frontend/css/administrador/historial.css`;
        
        if (!document.querySelector(`link[href*="historial.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
            console.log('✅ CSS de historial cargado:', cssPath);
        }
        
        // Cargar HTML
        const url = window.PATH?.adminHistorial() || `${basePath}/frontend/components/administrador/historial.html`;
        console.log('📄 Cargando HTML desde:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error al cargar historial: ${response.status}`);
        }
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        console.log('✅ HTML de historial cargado');
        
        // Esperar procesamiento del DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Inicializar el módulo
        console.log('🎯 Inicializando módulo de historial...');
        inicializarHistorial();
        
        console.log('✅ Módulo de historial cargado correctamente');
        
    } catch (error) {
        console.error('❌ Error al cargar módulo de historial:', error);
        content.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 2rem; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.2rem; font-weight: 600;">Error al cargar el módulo de historial</p>
                <small style="color: #7f8c8d;">${error.message}</small>
            </div>
        `;
    }
}

// Exponer función globalmente
window.loadHistorialContent = loadHistorialContent;

// ============================================
// LÓGICA DEL MÓDULO
// ============================================

// Estado global
let estudianteActual = null;
let timeoutBusqueda = null;

// Inicializar cuando el DOM esté listo (solo si ya estamos en la vista de historial)
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si el contenedor de historial ya está presente
    const historialContainer = document.querySelector('.historial-container');
    if (historialContainer) {
        inicializarHistorial();
    }
});

function inicializarHistorial() {
    console.log('🎨 Inicializando módulo de historial...');
    
    const inputBusqueda = document.getElementById('busquedaEstudiante');
    const btnBuscar = document.getElementById('btnBuscar');
    
    if (!inputBusqueda || !btnBuscar) {
        console.error('❌ Elementos del historial no encontrados');
        console.log('inputBusqueda:', inputBusqueda);
        console.log('btnBuscar:', btnBuscar);
        return;
    }
    
    console.log('✅ Elementos encontrados, configurando listeners...');
    
    // Búsqueda en tiempo real
    inputBusqueda.addEventListener('input', function() {
        clearTimeout(timeoutBusqueda);
        const valor = this.value.trim();
        
        if (valor.length >= 2) {
            timeoutBusqueda = setTimeout(() => {
                buscarEstudiante(valor);
            }, 300);
        } else {
            ocultarResultados();
        }
    });
    
    // Búsqueda con botón
    btnBuscar.addEventListener('click', function() {
        const valor = inputBusqueda.value.trim();
        if (valor.length >= 2) {
            buscarEstudiante(valor);
        }
    });
    
    // Enter para buscar
    inputBusqueda.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const valor = this.value.trim();
            if (valor.length >= 2) {
                buscarEstudiante(valor);
            }
        }
    });
    
    // Cerrar resultados al hacer click fuera
    document.addEventListener('click', function(e) {
        const resultadosDiv = document.getElementById('resultadosBusqueda');
        const searchBox = document.querySelector('.search-box');
        
        if (searchBox && !searchBox.contains(e.target)) {
            ocultarResultados();
        }
    });
    
    console.log('✅ Módulo de historial inicializado correctamente');
}

async function buscarEstudiante(busqueda) {
    try {
        const apiUrl = window.APP_CONFIG?.API.BASE_URL || '/Sistema-de-tutorias/backend/api';
        const response = await fetch(`${apiUrl}/historial.php?action=buscar&busqueda=${encodeURIComponent(busqueda)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            mostrarResultados(data.data);
        } else {
            mostrarResultadosVacios();
        }
    } catch (error) {
        console.error('Error al buscar estudiante:', error);
        mostrarError('Error al realizar la búsqueda');
    }
}

function mostrarResultados(estudiantes) {
    const resultadosDiv = document.getElementById('resultadosBusqueda');
    
    let html = '';
    estudiantes.forEach(estudiante => {
        html += `
            <div class="resultado-item" onclick="seleccionarEstudiante(${estudiante.id})">
                <div class="resultado-nombre">${estudiante.nombre}</div>
                <div class="resultado-codigo">Código: ${estudiante.codigo}</div>
                ${estudiante.tutorActual ? 
                    `<div class="resultado-tutor">Tutor: ${estudiante.tutorActual}</div>` : 
                    '<div class="resultado-tutor">Sin tutor asignado</div>'
                }
            </div>
        `;
    });
    
    resultadosDiv.innerHTML = html;
    resultadosDiv.style.display = 'block';
}

function mostrarResultadosVacios() {
    const resultadosDiv = document.getElementById('resultadosBusqueda');
    resultadosDiv.innerHTML = '<div class="resultado-item">No se encontraron estudiantes</div>';
    resultadosDiv.style.display = 'block';
}

function ocultarResultados() {
    const resultadosDiv = document.getElementById('resultadosBusqueda');
    resultadosDiv.style.display = 'none';
}

async function seleccionarEstudiante(idEstudiante) {
    ocultarResultados();
    mostrarLoading();
    
    try {
        const apiUrl = window.APP_CONFIG?.API.BASE_URL || '/Sistema-de-tutorias/backend/api';
        const response = await fetch(`${apiUrl}/historial.php?action=historial&id_estudiante=${idEstudiante}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            estudianteActual = data.data;
            mostrarHistorial(data.data);
        } else {
            throw new Error(data.message || 'Error al cargar historial');
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
        mostrarError('Error al cargar el historial del estudiante');
    } finally {
        ocultarLoading();
    }
}

function mostrarHistorial(datos) {
    // Mostrar información del estudiante
    const infoEstudiante = document.getElementById('infoEstudiante');
    document.getElementById('estudianteNombre').textContent = datos.estudiante.nombre;
    document.getElementById('estudianteCodigo').textContent = datos.estudiante.codigo;
    document.getElementById('estudianteTutor').textContent = datos.estudiante.tutorActual || 'Sin tutor asignado';
    infoEstudiante.style.display = 'block';
    
    // Mostrar título
    document.getElementById('tituloHistorial').style.display = 'block';
    
    // Mostrar sesiones
    const sesionesContainer = document.getElementById('sesionesContainer');
    
    if (datos.sesiones.length === 0) {
        sesionesContainer.innerHTML = `
            <div class="mensaje-vacio">
                <i class="fas fa-calendar-times"></i>
                <p>Este estudiante no tiene sesiones registradas</p>
            </div>
        `;
    } else {
        let html = '';
        datos.sesiones.forEach(sesion => {
            html += renderizarSesion(sesion);
        });
        sesionesContainer.innerHTML = html;
    }
    
    // Ocultar mensaje vacío
    document.getElementById('mensajeVacio').style.display = 'none';
}

function renderizarSesion(sesion) {
    const fecha = formatearFecha(sesion.fecha);
    
    return `
        <div class="sesion-card">
            <div class="sesion-header">
                <div class="sesion-fecha">${fecha}</div>
                <div class="sesion-tutor">Registrado por: <strong>Tutor ${sesion.tutor}</strong></div>
            </div>
            
            <div class="sesion-content">
                <!-- Académico -->
                <div class="categoria">
                    <div class="categoria-titulo">Académico</div>
                    <div class="categoria-item">
                        <div class="item-label">Tema:</div>
                        <div class="item-value">${sesion.academico.tema || 'N/A'}</div>
                    </div>
                    <div class="categoria-item">
                        <div class="item-label">Avance:</div>
                        <div class="item-value">${sesion.academico.avance ? sesion.academico.avance + '%' : 'N/A'}</div>
                    </div>
                    <div class="categoria-item">
                        <div class="item-label">Notas:</div>
                        <div class="item-value ${!sesion.academico.notas ? 'na' : ''}">${sesion.academico.notas || 'No se abordó'}</div>
                    </div>
                </div>
                
                <!-- Personal -->
                <div class="categoria">
                    <div class="categoria-titulo">Personal</div>
                    <div class="categoria-item">
                        <div class="item-label">Tema:</div>
                        <div class="item-value">${sesion.personal.tema || 'N/A'}</div>
                    </div>
                    <div class="categoria-item">
                        <div class="item-label">Notas:</div>
                        <div class="item-value ${!sesion.personal.notas ? 'na' : ''}">${sesion.personal.notas || 'No se abordó'}</div>
                    </div>
                </div>
                
                <!-- Profesional -->
                <div class="categoria">
                    <div class="categoria-titulo">Profesional</div>
                    <div class="categoria-item">
                        <div class="item-label">Tema:</div>
                        <div class="item-value">${sesion.profesional.tema || 'N/A'}</div>
                    </div>
                    <div class="categoria-item">
                        <div class="item-label">Notas:</div>
                        <div class="item-value ${!sesion.profesional.notas ? 'na' : ''}">${sesion.profesional.notas || 'No se abordó'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function formatearFecha(fecha) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const date = new Date(fecha + 'T00:00:00');
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    const año = date.getFullYear();
    
    return `${dia} de ${mes},${año}`;
}

function mostrarLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('sesionesContainer').innerHTML = '';
    document.getElementById('infoEstudiante').style.display = 'none';
    document.getElementById('tituloHistorial').style.display = 'none';
}

function ocultarLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

function mostrarError(mensaje) {
    const sesionesContainer = document.getElementById('sesionesContainer');
    sesionesContainer.innerHTML = `
        <div class="mensaje-vacio">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${mensaje}</p>
        </div>
    `;
    document.getElementById('infoEstudiante').style.display = 'none';
    document.getElementById('tituloHistorial').style.display = 'none';
}
