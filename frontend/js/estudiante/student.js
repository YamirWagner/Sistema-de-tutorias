// student.js - Panel del Estudiante

// Cargar dashboard del estudiante
async function loadStudentDashboard() {
    console.log('Cargando dashboard de estudiante...');
    
    // Cargar datos del semestre actual
    await loadCurrentSemester();
    
    // Cargar datos del tutor asignado
    await loadMyTutor();    
    // Cargar estadísticas del estudiante
    await loadMyStats();
}

// Cargar datos del tutor asignado
async function loadMyTutor() {
    const tutorWidget = document.getElementById('tutorWidget');
    const noTutorWidget = document.getElementById('noTutorWidget');
    
    try {
        console.log('🔄 Obteniendo datos del tutor asignado...');
        const response = await apiGet('/student?action=myTutor');
        
        if (response?.success && response.data) {
            const tutor = response.data;
            console.log('✅ DATOS DEL TUTOR ASIGNADO:', tutor);
            
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
                    // Formatear fecha
                    const fecha = new Date(tutor.fechaAsignacion);
                    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
                    fechaEl.textContent = fecha.toLocaleDateString('es-ES', opciones);
                } else if (fechaEl) {
                    fechaEl.textContent = '-';
                }
            }
            
            if (noTutorWidget) noTutorWidget.style.display = 'none';
            
        } else {
            console.log('⚠️ No tienes tutor asignado en este semestre');
            
            // Mostrar mensaje de no tutor
            if (tutorWidget) tutorWidget.style.display = 'none';
            if (noTutorWidget) noTutorWidget.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Error al obtener datos del tutor:', error);
        
        // Ocultar ambos widgets en caso de error
        if (tutorWidget) tutorWidget.style.display = 'none';
        if (noTutorWidget) noTutorWidget.style.display = 'none';
    }
}

// Función para contactar al tutor
function contactarTutor() {
    const emailEl = document.getElementById('tutorEmail');
    if (emailEl && emailEl.textContent && emailEl.textContent !== '-') {
        window.location.href = `mailto:${emailEl.textContent}`;
    } else {
        alert('No se ha encontrado el email del tutor');
    }
}

// Cargar estadísticas del estudiante
async function loadMyStats() {
    const progressWidget = document.getElementById('progressWidget');
    
    try {
        console.log('\n📊 ============================================');
        console.log('📊 ESTADÍSTICAS DE TUTORÍAS');
        console.log('📊 ============================================');
        
        const response = await apiGet('/student?action=stats');
        
        if (response?.success && response.data) {
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
            console.log('\n✅ Sesiones Completadas:', stats.sesionesCompletadas, 'de 3');
            
            // Porcentaje de avance
            const porcentajeEl = document.getElementById('porcentajeAvance');
            if (porcentajeEl) {
                porcentajeEl.textContent = stats.porcentajeAvance + '%';
            }
            console.log('📈 Porcentaje de Avance:', stats.porcentajeAvance + '%', '(100% = 3 sesiones)');
            
            // Horas totales
            const horasEl = document.getElementById('horasTutoria');
            if (horasEl) {
                horasEl.textContent = stats.horasTotales + 'h';
            }
            console.log('⏱️  Horas Totales de Tutoría:', stats.horasTotales, 'horas');
            
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
                console.log('\n📅 Próxima Sesión:');
                console.log('   • Fecha:', stats.proximaSesion.fecha);
                console.log('   • Hora:', stats.proximaSesion.horaInicio, '-', stats.proximaSesion.horaFin);
                console.log('   • Tipo:', stats.proximaSesion.tipo);
                console.log('   • Modalidad:', stats.proximaSesion.modalidad || 'No especificada');
            } else {
                if (proximaEl) {
                    proximaEl.textContent = 'Ninguna';
                    proximaEl.style.fontSize = '1rem';
                }
                console.log('\n📅 Próxima Sesión: Ninguna');
            }
            
            console.log('\n📊 ============================================\n');
        } else {
            console.log('⚠️ No se pudieron cargar las estadísticas');
            if (progressWidget) {
                progressWidget.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
        if (progressWidget) {
            progressWidget.style.display = 'none';
        }
    }
}

// Cargar datos del semestre actual (usa la misma lógica del header)
async function loadCurrentSemester() {
    try {
        console.log('🔄 Cargando semestre actual en dashboard estudiante...');
        
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
                if (estadoSemestreEl) {
                    const estado = semester.status || semester.estado || 'Inactivo';
                    estadoSemestreEl.textContent = estado;
                    
                    // Cambiar color según el estado
                    const estadoSpan = estadoSemestreEl.parentElement;
                    if (estadoSpan) {
                        if (estado === 'Activo') {
                            estadoSpan.style.backgroundColor = '#10b981'; // Verde
                        } else if (estado === 'Cerrado' || estado === 'Finalizado') {
                            estadoSpan.style.backgroundColor = '#ef4444'; // Rojo
                        } else if (estado === 'Programado') {
                            estadoSpan.style.backgroundColor = '#f59e0b'; // Amarillo
                        } else {
                            estadoSpan.style.backgroundColor = '#6b7280'; // Gris
                        }
                    }
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
            if (estadoSemestreEl) {
                estadoSemestreEl.textContent = 'Activo';
                estadoSemestreEl.parentElement.style.backgroundColor = '#10b981';
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
        if (estadoSemestreEl) {
            estadoSemestreEl.textContent = 'Inactivo';
            estadoSemestreEl.parentElement.style.backgroundColor = '#6b7280';
        }
        
    } catch (error) {
        console.error('❌ Error al cargar semestre actual:', error);
        const semestreActualEl = document.getElementById('semestreActual');
        if (semestreActualEl) {
            semestreActualEl.textContent = 'Error al cargar';
        }
        const estadoSemestreEl = document.getElementById('estadoSemestre');
        if (estadoSemestreEl) {
            estadoSemestreEl.textContent = 'Error';
            estadoSemestreEl.parentElement.style.backgroundColor = '#6b7280';
        }
    }
}

// ============================================
// FUNCIONES DE CARGA DE MÓDULOS DE ESTUDIANTE
// ============================================

/**
 * Cargar contenido del módulo "Inicio" (estudiante.html)
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

/**
 * Cargar contenido del módulo "Sesión actual" (sesion-estudiante.html)
 */
async function loadSesionActualContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando sesión actual...</p></div>';
        
        // Cargar CSS si es necesario
        const cssPath = window.PATH?.css('estudiante/sesion-estudiante.css') || 
                       '/Sistema-de-tutorias/frontend/css/estudiante/sesion-estudiante.css';
        
        if (!document.querySelector(`link[href*="sesion-estudiante.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        // Cargar HTML
        const url = window.PATH?.component('estudiante/sesion-estudiante.html') || 
                    '/Sistema-de-tutorias/frontend/components/estudiante/sesion-estudiante.html';
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        // Inicializar funcionalidad de sesión actual
        // TODO: Implementar lógica de sesión actual
        console.log('✅ Módulo de sesión actual cargado');
    } catch (error) {
        console.error('❌ Error al cargar módulo de sesión actual:', error);
        content.innerHTML = '<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">Error al cargar el módulo</div>';
    }
}

/**
 * Cargar contenido del módulo "Historial de tutorías" (historial-estudiante.html)
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
window.loadSesionActualContent = loadSesionActualContent;
window.loadHistorialTutoriasContent = loadHistorialTutoriasContent;
window.contactarTutor = contactarTutor;
