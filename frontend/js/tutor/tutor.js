// tutor.js - Funciones del Tutor

// Variable global para almacenar datos del dashboard
let dashboardData = null;

// Cargar dashboard del tutor
async function loadTutorDashboard() {
    console.log('Cargando dashboard de tutor...');
    
<<<<<<< HEAD
    // Primero cargar el HTML del panel
    await loadTutorPanelHTML();
    
    // Luego cargar datos completos del backend
    await loadTutorStats();
    
    // Finalmente renderizar contenido específico
    renderTutorContent();
}

// Cargar el HTML del panel del tutor
async function loadTutorPanelHTML() {
    try {
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const panelPath = `${basePath}/frontend/components/tutor/panel.html`;
        
        const response = await fetch(panelPath);
        if (!response.ok) {
            console.error('Error al cargar panel.html del tutor');
            return;
        }
        
        const html = await response.text();
        const dashboardContent = document.getElementById('dashboardContent');
        
        if (dashboardContent) {
            dashboardContent.innerHTML = html;
            console.log('✅ Panel HTML del tutor cargado');
        }
    } catch (error) {
        console.error('Error al cargar el panel del tutor:', error);
    }
}

// Cargar estadísticas y datos del tutor
async function loadTutorStats() {
    try {
        console.log('Cargando datos del dashboard del tutor...');
        
        // Llamar al endpoint del backend
        const response = await apiGet('/PanelTutor?action=dashboard');
        
        if (response.success && response.data) {
            dashboardData = response.data;
            
            // Actualizar información del semestre
            const semestreElement = document.getElementById('semestreActual');
            if (semestreElement) {
                semestreElement.textContent = dashboardData.semestre.nombre || 'N/A';
            }
            
            const estadoSemestreElement = document.getElementById('estadoSemestre');
            if (estadoSemestreElement) {
                estadoSemestreElement.textContent = dashboardData.semestre.estado || 'N/A';
            }
            
            // Actualizar estadísticas
            const totalEstudiantesElement = document.getElementById('totalEstudiantes');
            if (totalEstudiantesElement) {
                totalEstudiantesElement.textContent = dashboardData.estadisticas.totalEstudiantes || 0;
            }
            
            const sesionesMesElement = document.getElementById('sesionesMesActual');
            if (sesionesMesElement) {
                sesionesMesElement.textContent = dashboardData.estadisticas.sesionesMesActual || 0;
            }
            
            console.log('✅ Datos del tutor cargados:', dashboardData);
        } else {
            console.warn('⚠️ No se obtuvieron datos del tutor');
            showNotification('No se pudieron cargar los datos del panel', 'warning');
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
        showNotification('Error al cargar los datos del tutor', 'error');
    }
}

// Renderizar contenido del tutor
function renderTutorContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    // Limpiar contenido anterior
    content.innerHTML = '';
    
    // Sección de próximas sesiones
    const proximasSection = document.createElement('div');
    proximasSection.className = 'mt-6';
    proximasSection.innerHTML = `
        <div class="bg-white rounded-lg shadow-md">
            <div class="p-6 border-b border-gray-200">
                <h3 class="text-xl font-bold text-gray-800">Próximas Sesiones</h3>
            </div>
            <div id="proximasSesionesList" class="p-6">
                ${renderProximasSesiones()}
            </div>
            <div class="p-4 border-t border-gray-200 text-center">
                <button onclick="verAgendamiento()" class="text-blue-600 hover:text-blue-800 font-medium">
                    Ver agendamiento completo
                </button>
            </div>
        </div>
    `;
    
    content.appendChild(proximasSection);
}

// Renderizar lista de próximas sesiones
function renderProximasSesiones() {
    if (!dashboardData || !dashboardData.proximasSesiones || dashboardData.proximasSesiones.length === 0) {
        return `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-calendar-times text-4xl mb-3"></i>
                <p>No hay sesiones programadas próximamente</p>
            </div>
        `;
    }
    
    let html = '<div class="space-y-4">';
    
    dashboardData.proximasSesiones.forEach((sesion, index) => {
        html += `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="bg-blue-100 text-blue-600 rounded-full p-3">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-800">
                                ${sesion.descripcion || 'Ing. Informática y de Sistemas'}
                            </h4>
                            <div class="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <span class="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                    Última: ${sesion.fechaFormateada}
                                </span>
                                <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    ${sesion.tipoHistorial}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="nuevaSesion(${sesion.id})" 
                                class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                            <i class="fas fa-plus mr-1"></i> Nueva sesión
                        </button>
                        <button onclick="verHistorial(${sesion.id})" 
                                class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                            Ver Historial
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Ver sesiones del tutor (navegación al agendamiento)
function verAgendamiento() {
    const module = 'agendamientos';
    const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
    
    console.log('Navegando a agendamientos...');
    
    // Actualizar el estado del sidebar
    const allLinks = document.querySelectorAll('.sidebar-menu a');
    allLinks.forEach(link => {
        if (link.getAttribute('data-module') === module) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Cerrar sidebar en móvil
    if (typeof closeSidebarOnNavigation === 'function') {
        closeSidebarOnNavigation();
    }
    
    showNotification('Función de agendamientos en desarrollo', 'info');
=======
    const content = document.getElementById('dashboardContent');
    content.innerHTML = ''; // Limpiar contenido previo
    
    try {
        const response = await fetch('/Sistema-de-tutorias/frontend/components/tutor/inicio-tutor.html');
        if (response.ok) {
            const html = await response.text();
            content.innerHTML = html;
            console.log('Dashboard de tutor cargado correctamente');
            
            // Cargar estadísticas del semestre
            await loadTutorStats();
        } else {
            throw new Error('No se pudo cargar el archivo');
        }
    } catch (error) {
        console.error('Error al cargar dashboard de tutor:', error);
        showNotification('Error al cargar el dashboard', 'error');
    }
}

// ============= CARGAR ESTADÍSTICAS DEL SEMESTRE =============

// Cargar estadísticas del semestre para el tutor
async function loadTutorStats() {
    console.log('📊 Cargando estadísticas del semestre...');
    try {
        // Usar el endpoint de calendario para obtener el semestre actual
        const response = await apiGet('/calendar?action=semester');
        
        if (response && response.success) {
            const semesterInfo = response.data;
            console.log('✅ Información del semestre recibida:', semesterInfo);
            updateTutorSemesterInfo({semesterInfo: semesterInfo});
        } else {
            console.warn('⚠️ No se obtuvo información del semestre, usando valores por defecto');
            // Mostrar valores por defecto si no hay datos
            updateTutorSemesterInfo({semesterInfo: {nombre: 'Semestre Actual', estado: 'ACTIVO'}});
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
        console.log('ℹ️ Cargando valores por defecto...');
        // Usar valores por defecto si hay error
        updateTutorSemesterInfo({semesterInfo: {nombre: 'Semestre Actual', estado: 'ACTIVO'}});
    }
}

// Mostrar error al cargar estadísticas
function showTutorStatsError(message) {
    console.error('❌ Error en estadísticas:', message);
    
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `<span class="text-2xl" title="${message}">⚠️</span>`;
        }
    };
    
    updateElement('currentSemesterName', 'Error');
    updateElement('semesterPeriod', message);
}

// Actualizar información del semestre en el DOM
function updateTutorSemesterInfo(stats) {
    console.log('📝 Actualizando información del semestre en el DOM:', stats);
    
    // Validar que stats tenga datos
    if (!stats || typeof stats !== 'object') {
        console.error('❌ Datos de estadísticas inválidos');
        showTutorStatsError('Datos inválidos del servidor');
        return;
    }
    
    // Actualizar información del semestre
    if (stats.semesterInfo) {
        const semesterName = document.getElementById('currentSemesterName');
        const semesterPeriod = document.getElementById('semesterPeriod');
        const semesterStatus = document.getElementById('semesterStatus');
        
        if (semesterName) semesterName.textContent = stats.semesterInfo.nombre || 'Sin semestre activo';
        if (semesterPeriod && stats.semesterInfo.fechaInicio && stats.semesterInfo.fechaFin) {
            const inicio = new Date(stats.semesterInfo.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
            const fin = new Date(stats.semesterInfo.fechaFin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
            const diasRestantes = stats.semesterInfo.diasRestantes || 0;
            semesterPeriod.textContent = `Periodo: ${inicio} - ${fin} • ${diasRestantes} días restantes`;
        }
        if (semesterStatus) semesterStatus.textContent = stats.semesterInfo.estado || 'ACTIVO';
        
        console.log('✓ Información del semestre actualizada');
    }
>>>>>>> 9a6005b5a5bf5c364a5ac21fb6b5b7f0c8a7c5b4
}

// Ver sesiones del tutor
async function viewMySessions() {
    try {
        const response = await apiGet('/tutor?action=sessions');
        
        if (response.success) {
            console.log('Mis sesiones:', response.data);
            showNotification('Función de mis sesiones en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar sesiones', 'error');
    }
}

// Crear nueva sesión de tutoría
function nuevaSesion(cronogramaId) {
    console.log('Crear nueva sesión para cronograma:', cronogramaId);
    showNotification('Función de crear nueva sesión en desarrollo', 'info');
}

// Crear sesión de tutoría
async function createSession() {
    showNotification('Función de crear sesión en desarrollo', 'info');
}

// Ver historial de un estudiante/cronograma
function verHistorial(cronogramaId) {
    console.log('Ver historial para cronograma:', cronogramaId);
    showNotification('Función de ver historial en desarrollo', 'info');
}

// Ver estudiantes
async function viewStudents() {
    try {
        const response = await apiGet('/tutor?action=students');
        
        if (response.success) {
            console.log('Mis estudiantes:', response.data);
            showNotification('Función de estudiantes en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar estudiantes', 'error');
    }
}

// Subir materiales
async function uploadMaterials() {
    showNotification('Función de subir materiales en desarrollo', 'info');
}
