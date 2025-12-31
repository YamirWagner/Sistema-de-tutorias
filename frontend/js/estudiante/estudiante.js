/**
 * ============================================
 * STUDENT.JS - Panel del Estudiante
 * ============================================
 * 
 * Archivo JavaScript principal para el panel del estudiante.
 * Gestiona todos los componentes del dashboard del estudiante.
 * 
 * FUNCIONES PRINCIPALES:
 * - loadStudentDashboard() - Carga el dashboard completo
 * - loadMyTutor() - Información del tutor asignado
 * - loadMyStats() - Estadísticas de tutorías
 * - loadMySessions() - Últimas 4 sesiones
 * - loadCurrentSemestre() - Datos del semestre actual
 * 
 * NAVEGACIÓN ENTRE MÓDULOS:
 * - loadEstudianteContent() - Panel principal (inicio)
 * - loadHistorialTutoriasContent() - Historial completo
 * 
 * Nota: loadSesionActualContent() está en sesion-actual.js
 * 
 * @author Sistema de Tutorías
 * @version 2.0
 */

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

/**
 * Cargar dashboard del estudiante
 * Carga todos los componentes del panel: semestre, tutor, estadísticas y sesiones
 */
async function loadStudentDashboard() {
    try {
        // Cargar datos del semestre actual
        await loadCurrentSemestre();
        
        // Cargar datos del tutor asignado (no detiene si falla)
        await loadMyTutor().catch(err => console.warn('Tutor no disponible:', err.message));
        
        // Cargar estadísticas del estudiante (no detiene si falla)
        await loadMyStats().catch(err => console.warn('Estadísticas no disponibles:', err.message));
        
        // Cargar últimas sesiones realizadas (no detiene si falla)
        await loadMySessions().catch(err => console.warn('Sesiones no disponibles:', err.message));
    } catch (error) {
        console.error('Error crítico al cargar dashboard:', error);
    }
}

// ============================================
// FUNCIONES DE COMPONENTES DEL PANEL
// ============================================

/**
 * Cargar datos del tutor asignado
 */
async function loadMyTutor() {
    const tutorWidget = document.getElementById('tutorWidget');
    const noTutorWidget = document.getElementById('noTutorWidget');
    
    try {
        const response = await apiGet('/sesionActual?action=myTutor');
        
        if (!response || !response.success) {
            // No hay tutor asignado - mostrar mensaje informativo
            if (tutorWidget) tutorWidget.style.display = 'none';
            if (noTutorWidget) noTutorWidget.style.display = 'block';
            return;
        }
        
        if (response.data) {
            const tutor = response.data;
            
            // Mostrar widget del tutor
            if (tutorWidget) {
                tutorWidget.style.display = 'block';
                
                // Llenar datos
                const nombreEl = document.getElementById('tutorNombre');
                if (nombreEl) nombreEl.textContent = tutor.nombre || `${tutor.nombres} ${tutor.apellidos}`;
                
                const especialidadEl = document.getElementById('tutorEspecialidad');
                if (especialidadEl) especialidadEl.textContent = tutor.especialidad || 'Especialidad no especificada';
                
                const emailEl = document.getElementById('tutorEmail');
                if (emailEl) emailEl.textContent = tutor.email || tutor.correo || '-';
                
                const fechaEl = document.getElementById('tutorFechaAsignacion');
                if (fechaEl && tutor.fechaAsignacion) {
                    const fecha = new Date(tutor.fechaAsignacion);
                    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
                    fechaEl.textContent = fecha.toLocaleDateString('es-ES', opciones);
                } else if (fechaEl) {
                    fechaEl.textContent = '-';
                }
            }
            
            if (noTutorWidget) noTutorWidget.style.display = 'none';
        } else {
            // No hay datos de tutor
            if (tutorWidget) tutorWidget.style.display = 'none';
            if (noTutorWidget) noTutorWidget.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al cargar tutor:', error);
        if (tutorWidget) tutorWidget.style.display = 'none';
        if (noTutorWidget) noTutorWidget.style.display = 'block';
    }
}

/**
 * Función para contactar al tutor vía email
 */
function contactarTutor() {
    const emailEl = document.getElementById('tutorEmail');
    if (emailEl && emailEl.textContent && emailEl.textContent !== '-') {
        window.location.href = `mailto:${emailEl.textContent}`;
    } else {
        alert('No se ha encontrado el email del tutor');
    }
}

/**
 * Cargar estadísticas del estudiante
 * Muestra: sesiones completadas, porcentaje de avance, horas de tutoría y próxima sesión
 */
async function loadMyStats() {
    const progressWidget = document.getElementById('progressWidget');
    
    try {
        const response = await apiGet('/student?action=stats');
        
        if (!response || !response.success) {
            throw new Error(response?.message || 'No se pudieron cargar las estadísticas');
        }
        
        if (response.data) {
            const stats = response.data;
            
            // Mostrar widget de progreso
            if (progressWidget) {
                progressWidget.style.display = 'block';
            }
            
            // Sesiones completadas
            const sesionesEl = document.getElementById('sesionesCompletadas');
            if (sesionesEl) {
                sesionesEl.textContent = stats.sesionesCompletadas;
            }
            
            // Porcentaje de avance
            const porcentajeEl = document.getElementById('porcentajeAvance');
            if (porcentajeEl) {
                porcentajeEl.textContent = stats.porcentajeAvance + '%';
            }
            
            // Horas totales
            const horasEl = document.getElementById('horasTutoria');
            if (horasEl) {
                horasEl.textContent = stats.horasTotales + 'h';
            }
            
            // Próxima sesión
            const proximaEl = document.getElementById('proximaSesion');
            if (stats.proximaSesion) {
                if (proximaEl) {
                    const fecha = new Date(stats.proximaSesion.fecha + 'T' + stats.proximaSesion.horaInicio);
                    const opciones = { day: 'numeric', month: 'long' };
                    const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
                    const hora = stats.proximaSesion.horaInicio.substring(0, 5);
                    proximaEl.textContent = `${fechaFormateada}, ${hora}`;
                }
            } else {
                if (proximaEl) {
                    proximaEl.textContent = 'Ninguna';
                }
            }
        } else {
            // No hay datos de estadísticas
            if (progressWidget) progressWidget.style.display = 'none';
            throw new Error('No se pudieron cargar las estadísticas');
        }
    } catch (error) {
        if (progressWidget) progressWidget.style.display = 'none';
        throw error; // Re-lanzar para que loadStudentDashboard lo maneje
    }
}

/**
 * Cargar últimas sesiones realizadas
 * Muestra las 4 sesiones más recientes del estudiante
 */
async function loadMySessions() {
    const sessionsList = document.getElementById('sessionsList');
    const sessionsContainer = document.getElementById('sessionsContainer');
    const noSessionsMessage = document.getElementById('noSessionsMessage');
    
    try {
        const response = await apiGet('/student?action=sessions');
        
        if (!response || !response.success) {
            throw new Error(response?.message || 'No se pudieron cargar las sesiones');
        }
        
        if (response.data && response.data.length > 0) {
            // Limitar a las últimas 4 sesiones
            const sesiones = response.data.slice(0, 4);
            
            // Mostrar sección de sesiones
            if (sessionsList) sessionsList.style.display = 'block';
            if (noSessionsMessage) noSessionsMessage.style.display = 'none';
            
            // Limpiar contenedor
            if (sessionsContainer) {
                sessionsContainer.innerHTML = '';
                
                // Crear HTML para cada sesión
                sesiones.forEach((sesion, index) => {
                    // Formatear fecha y hora
                    let fechaFormateada = 'Fecha no disponible';
                    if (sesion.fechaRealizada || sesion.fecha) {
                        const fecha = new Date(sesion.fechaRealizada || sesion.fecha);
                        const dia = fecha.getDate();
                        const mes = fecha.toLocaleDateString('es-ES', { month: 'long' });
                        const anio = fecha.getFullYear();
                        const hora = sesion.horaInicio ? sesion.horaInicio.substring(0, 5) : '';
                        fechaFormateada = `${dia} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} del ${anio}${hora ? ' - ' + hora : ''}`;
                    }
                    
                    // Determinar icono y color según tipo
                    let iconoTipo = '📚';
                    let colorTipo = '#10b981';
                    let tituloTipo = sesion.tipo || 'Sesión';
                    
                    if (sesion.tipo === 'Academica') {
                        iconoTipo = '📚';
                        colorTipo = '#10b981';
                        tituloTipo = 'Tema Académico';
                    } else if (sesion.tipo === 'Personal') {
                        iconoTipo = '🧘';
                        colorTipo = '#ec4899';
                        tituloTipo = 'Aspecto Personal';
                    } else if (sesion.tipo === 'Profesional') {
                        iconoTipo = '💼';
                        colorTipo = '#8b5cf6';
                        tituloTipo = 'Desarrollo Profesional';
                    }
                    
                    // Obtener y formatear observaciones como lista desde JSON
                    let observacionesTexto = sesion.observaciones || sesion.cronograma_descripcion || 'Sin descripción disponible';
                    observacionesTexto = observacionesTexto.trim();
                    
                    // Convertir observaciones en lista
                    let observacionesHTML = '';
                    let items = [];
                    
                    // Función para formatear nombres de claves JSON
                    function formatearClave(clave) {
                        // Convertir camelCase o snake_case a texto legible
                        let texto = clave
                            .replace(/([A-Z])/g, ' $1') // Separar camelCase
                            .replace(/_/g, ' ') // Reemplazar guiones bajos
                            .trim();
                        
                        // Capitalizar cada palabra
                        texto = texto.split(' ')
                            .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
                            .join(' ');
                        
                        return texto;
                    }
                    
                    // Intentar parsear como JSON
                    try {
                        const jsonData = JSON.parse(observacionesTexto);
                        
                        // Si es un array, usar directamente
                        if (Array.isArray(jsonData)) {
                            items = jsonData.filter(item => item && item.toString().trim().length > 0);
                        }
                        // Si es un objeto, extraer las claves y valores formateados
                        else if (typeof jsonData === 'object' && jsonData !== null) {
                            items = Object.entries(jsonData)
                                .filter(([key, value]) => value && value.toString().trim().length > 0)
                                .map(([key, value]) => {
                                    const claveFormateada = formatearClave(key);
                                    return `<strong>${claveFormateada}:</strong> ${value}`;
                                });
                        }
                        // Si es un string simple
                        else if (typeof jsonData === 'string') {
                            items = [jsonData];
                        }
                    } catch (e) {
                        // No es JSON válido, usar el texto como está
                        if (observacionesTexto.includes('\n')) {
                            items = observacionesTexto.split('\n').filter(item => item.trim().length > 0);
                        }
                        else if (observacionesTexto.includes('. ')) {
                            items = observacionesTexto.split('. ').filter(item => item.trim().length > 0);
                            items = items.map((item, index) => {
                                item = item.trim();
                                if (index < items.length - 1 && !item.endsWith('.')) {
                                    return item + '.';
                                }
                                return item;
                            });
                        }
                        else if (observacionesTexto.includes(', ')) {
                            items = observacionesTexto.split(', ').filter(item => item.trim().length > 0);
                        }
                        else {
                            items = [observacionesTexto];
                        }
                    }
                    
                    // Capitalizar primera letra de cada item (solo si no tiene HTML)
                    items = items.map(item => {
                        item = item.toString().trim();
                        if (item.length > 0 && !item.includes('<strong>')) {
                            item = item.charAt(0).toUpperCase() + item.slice(1);
                        }
                        return item;
                    });
                    
                    // Generar HTML de la lista
                    if (items.length > 0) {
                        observacionesHTML = '<ul style="margin: 0; padding-left: 1.25rem; list-style: none;">';
                        items.forEach(item => {
                            observacionesHTML += `
                                <li style="margin-bottom: 0.375rem; position: relative; padding-left: 0.25rem;">
                                    <span style="color: ${colorTipo}; font-weight: bold; margin-right: 0.5rem;">•</span>
                                    <span style="color: #4b5563;">${item}</span>
                                </li>
                            `;
                        });
                        observacionesHTML += '</ul>';
                    } else {
                        observacionesHTML = `<p style="font-size: 0.875rem; color: #4b5563; margin: 0; line-height: 1.6; font-style: italic;">Sin descripción disponible</p>`;
                    }
                    
                    const sesionHTML = `
                        <div style="border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.25rem; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fa-solid fa-calendar" style="color: #6b7280; font-size: 0.875rem;"></i>
                                    <span style="font-weight: 600; color: #1f2937; font-size: 0.9375rem;">${fechaFormateada}</span>
                                </div>
                                <span style="background-color: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
                                    Completada
                                </span>
                            </div>
                            
                            <div style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); border: 1px solid #e5e7eb; border-left: 4px solid ${colorTipo}; border-radius: 0.5rem; padding: 1.125rem; margin-bottom: 0.75rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                <div style="display: flex; align-items: start; gap: 0.875rem;">
                                    <div style="background: white; width: 40px; height: 40px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex-shrink: 0;">
                                        <span style="font-size: 1.25rem;">${iconoTipo}</span>
                                    </div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="background: white; border-radius: 0.375rem; padding: 0.75rem; border: 1px solid #e5e7eb;">
                                            ${observacionesHTML}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            ${sesion.modalidad ? `
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; padding: 0.5rem; background: #f9fafb; border-radius: 0.375rem;">
                                <i class="fa-solid fa-${sesion.modalidad === 'Virtual' ? 'video' : sesion.modalidad === 'Presencial' ? 'users' : 'desktop'}" style="color: #9B192D; font-size: 0.875rem;"></i>
                                <span style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">${sesion.modalidad}</span>
                                ${sesion.ambiente ? `<span style="color: #d1d5db;">•</span><span style="font-size: 0.875rem; color: #6b7280;">${sesion.ambiente}</span>` : ''}
                            </div>
                            ` : ''}
                        </div>
                    `;
                    
                    sessionsContainer.innerHTML += sesionHTML;
                    console.log('💻 Modalidad:', sesion.modalidad || 'No especificada');
                    
                    if (sesion.ambiente) {
                        console.log('📍 Ambiente:', sesion.ambiente);
                    }
                    
                });
            }
            
        } else {
            // No hay sesiones
            if (sessionsList) sessionsList.style.display = 'block';
            if (sessionsContainer) sessionsContainer.innerHTML = '';
            if (noSessionsMessage) noSessionsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al cargar sesiones:', error);
        if (sessionsList) sessionsList.style.display = 'none';
    }
}

/**
 * Cargar datos del semestre actual
 * Muestra: nombre, estado (badge) y período con días restantes
 */
async function loadCurrentSemestre() {
    try {
        // Intentar obtener del API (misma lógica que header_panel.js)
        try {
            const response = await apiGet('/semestre?action=current');
            
            if (response?.success && response.data?.semester) {
                const semester = response.data.semester;
                console.log('✅ Semestre obtenido desde BD:', semester);
                
                // Actualizar nombre del semestre
                const semestreActualEl = document.getElementById('semestreActual');
                if (semestreActualEl) {
                    semestreActualEl.textContent = semester.name || semester.nombre || 'Sin semestre';
                }
                
                // Actualizar estado del semestre
                const estadoSemestreEl = document.getElementById('estadoSemestre');
                const estadoBadgeEl = document.getElementById('estadoBadge');
                if (estadoSemestreEl) {
                    const estado = semester.status || semester.estado || 'Inactivo';
                    estadoSemestreEl.textContent = estado;
                    
                    // Cambiar clase según el estado (usa CSS en lugar de inline styles)
                    if (estadoBadgeEl) {
                        // Limpiar clases anteriores
                        estadoBadgeEl.classList.remove('badge-activo', 'badge-cerrado', 'badge-programado', 'badge-inactivo');
                        
                        if (estado === 'Activo') {
                            estadoBadgeEl.classList.add('badge-activo');
                        } else if (estado === 'Cerrado' || estado === 'Finalizado') {
                            estadoBadgeEl.classList.add('badge-cerrado');
                        } else if (estado === 'Programado') {
                            estadoBadgeEl.classList.add('badge-programado');
                        } else {
                            estadoBadgeEl.classList.add('badge-inactivo');
                        }
                    }
                }
                
                // Actualizar período y días restantes
                const periodoSemestreEl = document.getElementById('periodoSemestre');
                if (periodoSemestreEl && semester.startDate && semester.endDate) {
                    const startDate = new Date(semester.startDate);
                    const endDate = new Date(semester.endDate);
                    const today = new Date();
                    
                    // Calcular días restantes
                    const diffTime = endDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    // Formatear fechas
                    const formatDate = (date) => {
                        const day = date.getDate();
                        const month = date.toLocaleDateString('es-ES', { month: 'long' });
                        return `${day} de ${month}`;
                    };
                    
                    const periodoTexto = `Período: ${formatDate(startDate)} - ${formatDate(endDate)}`;
                    const diasRestantes = diffDays > 0 ? `${diffDays} días restantes` : 'Finalizado';
                    
                    periodoSemestreEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> ${periodoTexto} - ${diasRestantes}`;
                }
                
                console.log('✅ Semestre cargado en dashboard:', semester.name || semester.nombre);
                return; // Salir si todo fue exitoso
            }
        } catch (apiError) {
            console.warn('⚠️ No se pudo obtener semestre del API:', apiError.message);
        }
        
        // Fallback: usar datos del token si existen
        const user = getUserFromToken();
        if (user && user.semestre) {
            const semestreActualEl = document.getElementById('semestreActual');
            if (semestreActualEl) {
                semestreActualEl.textContent = user.semestre;
            }
            
            const estadoSemestreEl = document.getElementById('estadoSemestre');
            const estadoBadgeEl = document.getElementById('estadoBadge');
            if (estadoSemestreEl) {
                estadoSemestreEl.textContent = 'Activo';
                if (estadoBadgeEl) estadoBadgeEl.style.backgroundColor = '#10b981';
            }
            
            const periodoSemestreEl = document.getElementById('periodoSemestre');
            if (periodoSemestreEl) {
                periodoSemestreEl.textContent = 'Período: Sin información disponible';
            }
            
            console.log('✅ Semestre del token:', user.semestre);
            return;
        }
        
        // Si no hay datos, mostrar mensaje
        const semestreActualEl = document.getElementById('semestreActual');
        if (semestreActualEl) {
            semestreActualEl.textContent = 'Sin semestre activo';
        }
        
        const estadoSemestreEl = document.getElementById('estadoSemestre');
        const estadoBadgeEl = document.getElementById('estadoBadge');
        if (estadoSemestreEl) {
            estadoSemestreEl.textContent = 'Inactivo';
            if (estadoBadgeEl) estadoBadgeEl.style.backgroundColor = '#6b7280';
        }
        
        const periodoSemestreEl = document.getElementById('periodoSemestre');
        if (periodoSemestreEl) {
            periodoSemestreEl.textContent = 'Período: Sin información';
        }
        
    } catch (error) {
        console.error('❌ Error al cargar semestre actual:', error);
        const semestreActualEl = document.getElementById('semestreActual');
        if (semestreActualEl) {
            semestreActualEl.textContent = 'Error al cargar';
        }
        const estadoSemestreEl = document.getElementById('estadoSemestre');
        const estadoBadgeEl = document.getElementById('estadoBadge');
        if (estadoSemestreEl) {
            estadoSemestreEl.textContent = 'Error';
            if (estadoBadgeEl) estadoBadgeEl.style.backgroundColor = '#6b7280';
        }
        const periodoSemestreEl = document.getElementById('periodoSemestre');
        if (periodoSemestreEl) {
            periodoSemestreEl.textContent = 'Período: Error al cargar';
        }
    }
}

// ============================================
// FUNCIONES DE NAVEGACIÓN ENTRE MÓDULOS
// ============================================

/**
 * Cargar contenido del módulo "Inicio" (estudiante.html)
 * Carga el panel principal con: semestre, tutor, estadísticas y últimas sesiones
 */
async function loadEstudianteContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando módulo...</p></div>';
        
        // Cargar CSS si es necesario
        const cssPath = window.PATH?.css('estudiante/estudiante.css') || 
                       '/Sistema-de-tutorias/frontend/css/estudiante/estudiante.css';
        
        if (!document.querySelector(`link[href*="estudiante.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        // Cargar HTML
        const url = window.PATH?.component('estudiante/estudiante.html') || 
                    '/Sistema-de-tutorias/frontend/components/estudiante/estudiante.html';
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        // Cargar dashboard del estudiante
        await loadStudentDashboard();
        
        console.log('✅ Módulo de inicio del estudiante cargado');
    } catch (error) {
        console.error('❌ Error al cargar módulo de inicio:', error);
        content.innerHTML = '<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">Error al cargar el módulo</div>';
    }
}

// La función loadSesionActualContent() ahora está en sesion-actual.js

/**
 * Cargar contenido del módulo "Historial de tutorías" (historial-estudiante.html)
 * Muestra el registro completo de sesiones de tutoría con filtros
 */
async function loadHistorialTutoriasContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando historial...</p></div>';
        
        // Cargar CSS si es necesario
        const cssPath = window.PATH?.css('estudiante/historial-estudiante.css') || 
                       '/Sistema-de-tutorias/frontend/css/estudiante/historial-estudiante.css';
        
        if (!document.querySelector(`link[href*="historial-estudiante.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        // Cargar HTML
        const url = window.PATH?.component('estudiante/historial-estudiante.html') || 
                    '/Sistema-de-tutorias/frontend/components/estudiante/historial-estudiante.html';
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        // Inicializar funcionalidad de historial
        // TODO: Implementar lógica de historial
        console.log('✅ Módulo de historial de tutorías cargado');
    } catch (error) {
        console.error('❌ Error al cargar módulo de historial:', error);
        content.innerHTML = '<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">Error al cargar el módulo</div>';
    }
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================
window.loadEstudianteContent = loadEstudianteContent;
// window.loadSesionActualContent está en sesion-actual.js
window.loadHistorialTutoriasContent = loadHistorialTutoriasContent;
window.contactarTutor = contactarTutor;
