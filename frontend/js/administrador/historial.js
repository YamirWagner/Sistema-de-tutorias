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
        const basePath = (window.APP_BASE_PATH || '').replace(/\/+$/, '');
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
    console.log('🔍 Buscando estudiante:', busqueda);
    
    try {
        const token = localStorage.getItem('token');
        console.log('🔑 Token:', token ? 'Presente' : 'Ausente');
        
        if (!token) {
            mostrarError('No se encontró token de autenticación. Por favor, inicia sesión nuevamente.');
            return;
        }
        
        // ✅ CORRECCIÓN: Usar la ruta limpia sin .php y respetar APP_BASE_PATH dinámico
        const basePath = (window.APP_BASE_PATH || '').replace(/\/+$/, '');
        const url = `${basePath}/api/historial?action=buscar&busqueda=${encodeURIComponent(busqueda)}`;
        
        console.log('📡 URL de búsqueda:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Response status:', response.status);
        console.log('📊 Response OK:', response.ok);
        
        // Verificar si la respuesta es realmente JSON
        const contentType = response.headers.get('content-type');
        console.log('📊 Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ La respuesta no es JSON. Primeros 500 caracteres:', text.substring(0, 500));
            
            // Mostrar si es HTML
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                throw new Error('El servidor devolvió HTML en lugar de JSON. Revisa el archivo historial.php y routes.php');
            }
            
            throw new Error('El servidor no devolvió JSON válido');
        }
        
        const data = await response.json();
        console.log('✅ Datos recibidos:', data);
        
        if (data.success && data.data && data.data.length > 0) {
            mostrarResultados(data.data);
        } else {
            mostrarResultadosVacios();
        }
    } catch (error) {
        console.error('❌ Error completo al buscar estudiante:', error);
        mostrarError('Error al realizar la búsqueda: ' + error.message);
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
    if (resultadosDiv) {
        resultadosDiv.style.display = 'none';
    }
}

async function seleccionarEstudiante(idEstudiante) {
    console.log('👤 Seleccionando estudiante:', idEstudiante);
    
    ocultarResultados();
    mostrarLoading();
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('No se encontró token de autenticación');
        }
        
        // ✅ CORRECCIÓN: Usar la ruta limpia sin .php y respetar APP_BASE_PATH dinámico
        const basePath = (window.APP_BASE_PATH || '').replace(/\/+$/, '');
        const url = `${basePath}/api/historial?action=historial&id_estudiante=${idEstudiante}`;
        
        console.log('📡 URL de historial:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Response status:', response.status);
        console.log('📊 Response OK:', response.ok);
        
        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        console.log('📊 Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ La respuesta no es JSON. Primeros 500 caracteres:', text.substring(0, 500));
            
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                throw new Error('El servidor devolvió HTML en lugar de JSON. Revisa historial.php');
            }
            
            throw new Error('El servidor no devolvió JSON válido');
        }
        
        const data = await response.json();
        console.log('✅ Historial recibido:', data);
        
        if (data.success) {
            estudianteActual = data.data;
            mostrarHistorial(data.data);
        } else {
            throw new Error(data.message || 'Error al cargar historial');
        }
    } catch (error) {
        console.error('❌ Error completo al cargar historial:', error);
        mostrarError('Error al cargar el historial del estudiante: ' + error.message);
    } finally {
        ocultarLoading();
    }
}

function mostrarHistorial(datos) {
    console.log('📋 Mostrando historial:', datos);
    
    // Mostrar información del estudiante
    const infoEstudiante = document.getElementById('infoEstudiante');
    const estudianteNombre = document.getElementById('estudianteNombre');
    const estudianteCodigo = document.getElementById('estudianteCodigo');
    const estudianteTutor = document.getElementById('estudianteTutor');
    
    if (estudianteNombre) estudianteNombre.textContent = datos.estudiante.nombre;
    if (estudianteCodigo) estudianteCodigo.textContent = datos.estudiante.codigo;
    if (estudianteTutor) estudianteTutor.textContent = datos.estudiante.tutorActual || 'Sin tutor asignado';
    if (infoEstudiante) infoEstudiante.style.display = 'block';
    
    // Mostrar título
    const tituloHistorial = document.getElementById('tituloHistorial');
    if (tituloHistorial) tituloHistorial.style.display = 'block';
    
    // Mostrar sesiones
    const sesionesContainer = document.getElementById('sesionesContainer');
    
    if (!sesionesContainer) {
        console.error('❌ sesionesContainer no encontrado');
        return;
    }
    
    if (!datos.sesiones || datos.sesiones.length === 0) {
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
    const mensajeVacio = document.getElementById('mensajeVacio');
    if (mensajeVacio) {
        mensajeVacio.style.display = 'none';
    }
}

function renderizarSesion(sesion) {
    const fecha = formatearFecha(sesion.fecha);
    const hora = sesion.horaInicio ? sesion.horaInicio.substring(0, 5) : '';
    const horaFin = sesion.horaFin ? sesion.horaFin.substring(0, 5) : '';
    const horario = hora && horaFin ? `${hora} - ${horaFin}` : hora || 'N/A';
    
    // Badges de estado y modalidad
    const estadoBadge = obtenerBadgeEstado(sesion.estado);
    const modalidadBadge = sesion.modalidad ? `<span class="badge-modalidad">${sesion.modalidad}</span>` : '';
    
    // Intentar parsear observaciones si están en formato JSON
    let detalles = null;
    let notasOriginales = null;
    
    // Buscar las notas según el tipo de tutoría
    if (sesion.tipo === 'Academica' && sesion.academico && sesion.academico.notas) {
        notasOriginales = sesion.academico.notas;
    } else if (sesion.tipo === 'Personal' && sesion.personal && sesion.personal.notas) {
        notasOriginales = sesion.personal.notas;
    } else if (sesion.tipo === 'Profesional' && sesion.profesional && sesion.profesional.notas) {
        notasOriginales = sesion.profesional.notas;
    } else if (sesion.observaciones) {
        notasOriginales = sesion.observaciones;
    }
    
    // Intentar parsear si parece JSON
    if (notasOriginales && typeof notasOriginales === 'string' && notasOriginales.trim().startsWith('{')) {
        try {
            detalles = JSON.parse(notasOriginales);
        } catch (e) {
            console.warn('No se pudo parsear JSON:', e);
            detalles = null;
        }
    }
    
    let contenidoHTML = '';
    
    // Si tenemos detalles JSON, mostrarlos con formato mejorado
    if (detalles) {
        if (detalles.temaProfesional || sesion.tipo === 'Profesional') {
            // Tutoría Profesional
            contenidoHTML = `
                <div class="detalle-profesional">
                    <h4><i class="fas fa-briefcase"></i> Tutoría Profesional</h4>
                    <div class="detalle-grid">
                        ${detalles.temaProfesional ? `
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-tag"></i> Tema:</span>
                                <span class="detalle-value">${detalles.temaProfesional}</span>
                            </div>
                        ` : ''}
                        ${detalles.descripcionTema ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-align-left"></i> Descripción:</span>
                                <span class="detalle-value">${detalles.descripcionTema}</span>
                            </div>
                        ` : ''}
                        ${detalles.avancesLogros ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-chart-line"></i> Avances y Logros:</span>
                                <span class="detalle-value">${detalles.avancesLogros}</span>
                            </div>
                        ` : ''}
                        ${detalles.observacionesProfesionales ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-clipboard"></i> Observaciones:</span>
                                <span class="detalle-value">${detalles.observacionesProfesionales}</span>
                            </div>
                        ` : ''}
                        ${detalles.recursosContactos ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-link"></i> Recursos/Contactos:</span>
                                <span class="detalle-value">${detalles.recursosContactos}</span>
                            </div>
                        ` : ''}
                        ${detalles.notasAdicionales ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-sticky-note"></i> Notas Adicionales:</span>
                                <span class="detalle-value">${detalles.notasAdicionales}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else if (detalles.temaAcademico || detalles.cursoAsignatura || sesion.tipo === 'Academica') {
            // Tutoría Académica
            contenidoHTML = `
                <div class="detalle-academico">
                    <h4><i class="fas fa-graduation-cap"></i> Tutoría Académica</h4>
                    <div class="detalle-grid">
                        ${detalles.cursoAsignatura ? `
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-book"></i> Curso/Asignatura:</span>
                                <span class="detalle-value">${detalles.cursoAsignatura}</span>
                            </div>
                        ` : ''}
                        ${detalles.temaAcademico ? `
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-tag"></i> Tema:</span>
                                <span class="detalle-value">${detalles.temaAcademico}</span>
                            </div>
                        ` : ''}
                        ${detalles.descripcionTema ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-align-left"></i> Descripción:</span>
                                <span class="detalle-value">${detalles.descripcionTema}</span>
                            </div>
                        ` : ''}
                        ${detalles.dificultadesEncontradas ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-exclamation-circle"></i> Dificultades:</span>
                                <span class="detalle-value">${detalles.dificultadesEncontradas}</span>
                            </div>
                        ` : ''}
                        ${detalles.estrategiasAplicadas ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-lightbulb"></i> Estrategias Aplicadas:</span>
                                <span class="detalle-value">${detalles.estrategiasAplicadas}</span>
                            </div>
                        ` : ''}
                        ${detalles.recursosRecomendados ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-link"></i> Recursos Recomendados:</span>
                                <span class="detalle-value">${detalles.recursosRecomendados}</span>
                            </div>
                        ` : ''}
                        ${detalles.notasAdicionales ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-sticky-note"></i> Notas Adicionales:</span>
                                <span class="detalle-value">${detalles.notasAdicionales}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else if (detalles.temaPersonal || sesion.tipo === 'Personal') {
            // Tutoría Personal
            contenidoHTML = `
                <div class="detalle-personal">
                    <h4><i class="fas fa-user"></i> Tutoría Personal</h4>
                    <div class="detalle-grid">
                        ${detalles.temaPersonal ? `
                            <div class="detalle-item">
                                <span class="detalle-label"><i class="fas fa-tag"></i> Tema:</span>
                                <span class="detalle-value">${detalles.temaPersonal}</span>
                            </div>
                        ` : ''}
                        ${detalles.descripcionSituacion ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-align-left"></i> Descripción de la Situación:</span>
                                <span class="detalle-value">${detalles.descripcionSituacion}</span>
                            </div>
                        ` : ''}
                        ${detalles.emocionesExpresadas ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-heart"></i> Emociones Expresadas:</span>
                                <span class="detalle-value">${detalles.emocionesExpresadas}</span>
                            </div>
                        ` : ''}
                        ${detalles.orientacionBrindada ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-compass"></i> Orientación Brindada:</span>
                                <span class="detalle-value">${detalles.orientacionBrindada}</span>
                            </div>
                        ` : ''}
                        ${detalles.acuerdosCompromisos ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-handshake"></i> Acuerdos/Compromisos:</span>
                                <span class="detalle-value">${detalles.acuerdosCompromisos}</span>
                            </div>
                        ` : ''}
                        ${detalles.notasAdicionales ? `
                            <div class="detalle-item full-width">
                                <span class="detalle-label"><i class="fas fa-sticky-note"></i> Notas Adicionales:</span>
                                <span class="detalle-value">${detalles.notasAdicionales}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    } else {
        // Formato simple cuando no hay JSON o no se pudo parsear
        const temaDisplay = sesion.academico?.tema || sesion.personal?.tema || sesion.profesional?.tema || 'Sin especificar';
        const notasDisplay = notasOriginales || 'Sin observaciones registradas';
        
        contenidoHTML = `
            <div class="sesion-content-simple">
                <div class="categoria">
                    <div class="categoria-titulo">
                        ${sesion.tipo === 'Academica' ? '<i class="fas fa-graduation-cap"></i> Académica' : 
                          sesion.tipo === 'Personal' ? '<i class="fas fa-user"></i> Personal' : 
                          '<i class="fas fa-briefcase"></i> Profesional'}
                    </div>
                    <div class="categoria-item">
                        <div class="item-label">Tema:</div>
                        <div class="item-value">${temaDisplay}</div>
                    </div>
                    <div class="categoria-item full-width">
                        <div class="item-label">Observaciones:</div>
                        <div class="item-value">${notasDisplay}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="sesion-card">
            <div class="sesion-header">
                <div class="sesion-info">
                    <div class="sesion-fecha"><i class="far fa-calendar"></i> ${fecha}</div>
                    <div class="sesion-hora"><i class="far fa-clock"></i> ${horario}</div>
                </div>
                <div class="sesion-badges">
                    ${estadoBadge}
                    ${modalidadBadge}
                </div>
            </div>
            
            <div class="sesion-tutor">
                <i class="fas fa-user-tie"></i> <strong>${sesion.tutor || 'No especificado'}</strong>
            </div>
            
            ${contenidoHTML}
        </div>
    `;
}

function obtenerBadgeEstado(estado) {
    const badges = {
        'Realizada': '<span class="badge-estado realizada"><i class="fas fa-check-circle"></i> Realizada</span>',
        'Programada': '<span class="badge-estado programada"><i class="far fa-calendar-check"></i> Programada</span>',
        'Cancelada': '<span class="badge-estado cancelada"><i class="fas fa-times-circle"></i> Cancelada</span>',
        'Reprogramada': '<span class="badge-estado reprogramada"><i class="fas fa-redo"></i> Reprogramada</span>',
        'Realizando': '<span class="badge-estado realizando"><i class="fas fa-spinner"></i> En curso</span>',
        'Pendiente': '<span class="badge-estado pendiente"><i class="far fa-clock"></i> Pendiente</span>'
    };
    return badges[estado] || `<span class="badge-estado">${estado}</span>`;
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
    
    return `${dia} de ${mes}, ${año}`;
}

function mostrarLoading() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
    }
    
    const sesionesContainer = document.getElementById('sesionesContainer');
    if (sesionesContainer) {
        sesionesContainer.innerHTML = '';
    }
    
    const infoEstudiante = document.getElementById('infoEstudiante');
    if (infoEstudiante) {
        infoEstudiante.style.display = 'none';
    }
    
    const tituloHistorial = document.getElementById('tituloHistorial');
    if (tituloHistorial) {
        tituloHistorial.style.display = 'none';
    }
}

function ocultarLoading() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

function mostrarError(mensaje) {
    const sesionesContainer = document.getElementById('sesionesContainer');
    if (sesionesContainer) {
        sesionesContainer.innerHTML = `
            <div class="mensaje-vacio">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${mensaje}</p>
            </div>
        `;
    }
    
    const infoEstudiante = document.getElementById('infoEstudiante');
    if (infoEstudiante) {
        infoEstudiante.style.display = 'none';
    }
    
    const tituloHistorial = document.getElementById('tituloHistorial');
    if (tituloHistorial) {
        tituloHistorial.style.display = 'none';
    }
}

// Exponer funciones globalmente para onclick
window.seleccionarEstudiante = seleccionarEstudiante;