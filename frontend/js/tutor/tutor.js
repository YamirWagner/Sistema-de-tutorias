// tutor.js - Funciones del Tutor

// Variable global para almacenar datos del dashboard
let dashboardData = null;

// ============================================
// INICIALIZACIÓN DEL DASHBOARD
// ============================================

// Cargar dashboard del tutor
async function loadTutorDashboard() {
    console.log('='.repeat(60));
    console.log('🎯 INICIANDO CARGA DEL DASHBOARD DEL TUTOR');
    console.log('='.repeat(60));
    console.log('📍 Ubicación:', window.location.href);
    console.log('📂 Path:', window.location.pathname);
    
    try {
        // 1. Cargar el HTML del panel
        console.log('📄 Paso 1: Cargando HTML del panel...');
        await loadTutorPanelHTML();
        
        // 2. Cargar datos del backend
        console.log('📊 Paso 2: Cargando datos del backend...');
        await loadTutorStats();
        
        // 3. Renderizar contenido dinámico
        console.log('🎨 Paso 3: Renderizando contenido...');
        renderTutorContent();
        
        console.log('='.repeat(60));
        console.log('✅ DASHBOARD DEL TUTOR CARGADO COMPLETAMENTE');
        console.log('='.repeat(60));
    } catch (error) {
        console.error('='.repeat(60));
        console.error('❌ ERROR AL CARGAR DASHBOARD DEL TUTOR');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
        console.error('='.repeat(60));
        showNotification('Error al cargar el panel del tutor', 'error');
    }
}

// Cargar el HTML del panel del tutor
async function loadTutorPanelHTML() {
    try {
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const panelPath = `${basePath}/frontend/components/tutor/tutor.html`;
        
        console.log('🔍 Intentando cargar:', panelPath);
        
        const response = await fetch(panelPath);
        
        console.log('📡 Respuesta del servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('❌ Error al cargar tutor.html');
            console.error('Status:', response.status);
            console.error('StatusText:', response.statusText);
            return;
        }
        
        const html = await response.text();
        console.log('📄 HTML recibido, tamaño:', html.length, 'caracteres');
        
        const dashboardContent = document.getElementById('dashboardContent');
        
        if (dashboardContent) {
            dashboardContent.innerHTML = html;
            console.log('✅ HTML del tutor insertado en el DOM');
        } else {
            console.error('❌ No se encontró el elemento #dashboardContent');
        }
    } catch (error) {
        console.error('❌ Error al cargar el HTML del tutor:', error);
        showNotification('Error al cargar el panel', 'error');
    }
}

// Cargar estadísticas y datos del tutor desde el backend
async function loadTutorStats() {
    try {
        console.log('📊 Cargando datos del dashboard del tutor...');
        console.log('🔗 Endpoint:', '/PanelTutor?action=dashboard');
        
        // Verificar token
        const token = localStorage.getItem('token');
        console.log('🔑 Token presente:', token ? 'SÍ' : 'NO');
        
        // Llamar al endpoint del backend
        const response = await apiGet('/PanelTutor?action=dashboard');
        
        console.log('📥 Respuesta completa recibida:', response);
        
        if (response && response.success && response.data) {
            dashboardData = response.data;
            
            console.log('✅ Datos del dashboard:', dashboardData);
            console.log('📋 Datos del semestre:', dashboardData.semestre);
            console.log('   - Nombre:', dashboardData.semestre?.nombre);
            console.log('   - Estado:', dashboardData.semestre?.estado);
            
            // Pequeña espera para asegurar que el DOM esté listo
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Actualizar información del semestre
            const semestreElement = document.getElementById('semestreActual');
            console.log('🔍 Buscando elemento #semestreActual:', semestreElement);
            
            if (semestreElement) {
                const nombreSemestre = dashboardData.semestre?.nombre || 'Sin semestre';
                semestreElement.textContent = nombreSemestre;
                console.log('✅ Semestre actualizado a:', nombreSemestre);
            } else {
                console.error('❌ No se encontró elemento #semestreActual en el DOM');
                console.log('Elementos disponibles:', document.querySelectorAll('[id]'));
            }
            
            const estadoSemestreElement = document.getElementById('estadoSemestre');
            console.log('🔍 Buscando elemento #estadoSemestre:', estadoSemestreElement);
            
            if (estadoSemestreElement) {
                const estadoSemestre = dashboardData.semestre?.estado || 'N/A';
                estadoSemestreElement.textContent = estadoSemestre;
                console.log('✅ Estado semestre actualizado a:', estadoSemestre);
            } else {
                console.error('❌ No se encontró elemento #estadoSemestre en el DOM');
            }
            
            // Actualizar estadísticas
            const totalEstudiantesElement = document.getElementById('totalEstudiantes');
            if (totalEstudiantesElement) {
                const total = dashboardData.estadisticas?.totalEstudiantes || 0;
                totalEstudiantesElement.textContent = total;
                console.log('✅ Total estudiantes actualizado a:', total);
            } else {
                console.warn('⚠️ No se encontró elemento #totalEstudiantes');
            }
            
            const sesionesMesElement = document.getElementById('sesionesMesActual');
            if (sesionesMesElement) {
                const sesiones = dashboardData.estadisticas?.sesionesMesActual || 0;
                sesionesMesElement.textContent = sesiones;
                console.log('✅ Sesiones mes actualizado a:', sesiones);
            } else {
                console.warn('⚠️ No se encontró elemento #sesionesMesActual');
            }
            
            console.log('✅ Todos los datos del tutor cargados correctamente');
        } else {
            console.error('❌ Respuesta inválida del servidor');
            console.log('   - response:', response);
            console.log('   - response.success:', response?.success);
            console.log('   - response.data:', response?.data);
            showNotification('No se pudieron cargar los datos del panel', 'error');
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
        console.error('Stack trace:', error.stack);
        showNotification('Error al cargar los datos del tutor', 'error');
        
        // Mostrar datos de error en el dashboard
        const dashboardContent = document.getElementById('dashboardContent');
        if (dashboardContent && !dashboardData) {
            dashboardContent.innerHTML += `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <h3 class="text-red-800 font-bold mb-2">Error al cargar datos</h3>
                    <p class="text-red-600">${error.message}</p>
                </div>
            `;
        }
    }
}

// ============================================
// RENDERIZADO DE CONTENIDO
// ============================================

// Renderizar contenido del tutor
function renderTutorContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    // No limpiar el contenido, solo agregar la sección de próximas sesiones
    const proximasSesionesContainer = content.querySelector('#proximasSesionesContainer');
    
    if (!proximasSesionesContainer) {
        // Si no existe el contenedor, agregar la sección
        const proximasSection = document.createElement('div');
        proximasSection.className = 'mt-6';
        proximasSection.id = 'proximasSesionesContainer';
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
    } else {
        // Si ya existe, solo actualizar el contenido de las sesiones
        const proximasSesionesList = document.getElementById('proximasSesionesList');
        if (proximasSesionesList) {
            proximasSesionesList.innerHTML = renderProximasSesiones();
        }
    }
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
    
    dashboardData.proximasSesiones.forEach((sesion) => {
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
                                    Próxima: ${sesion.fechaFormateada}
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

// ============================================
// NAVEGACIÓN Y ACCIONES
// ============================================

// Ver agendamiento completo
function verAgendamiento() {
    console.log('📅 Navegando a agendamientos...');
    
    // Actualizar el estado del sidebar
    const allLinks = document.querySelectorAll('.sidebar-menu a');
    allLinks.forEach(link => {
        if (link.getAttribute('data-module') === 'agendamientos') {
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
}

// Crear nueva sesión de tutoría
function nuevaSesion(cronogramaId) {
    console.log('➕ Crear nueva sesión para cronograma:', cronogramaId);
    showNotification('Función de crear nueva sesión en desarrollo', 'info');
}

// Ver historial de sesiones
function verHistorial(cronogramaId) {
    console.log('📋 Ver historial para cronograma:', cronogramaId);
    showNotification('Función de ver historial en desarrollo', 'info');
}

// ============================================
// EXPOSICIÓN GLOBAL DE FUNCIONES
// ============================================

// Exponer funciones principales globalmente
window.loadTutorDashboard = loadTutorDashboard;
window.loadTutorPanelHTML = loadTutorPanelHTML;
window.loadTutorStats = loadTutorStats;
window.renderTutorContent = renderTutorContent;
window.verAgendamiento = verAgendamiento;
window.nuevaSesion = nuevaSesion;
window.verHistorial = verHistorial;

console.log('✅ tutor.js cargado - loadTutorDashboard disponible:', typeof window.loadTutorDashboard);
