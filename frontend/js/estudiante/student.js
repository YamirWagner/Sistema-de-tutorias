// student.js - Panel del Estudiante

// Cargar dashboard del estudiante
async function loadStudentDashboard() {
    console.log('Cargando dashboard de estudiante...');
    
    // Cargar estadísticas
    await loadStudentStats();
    
    // Renderizar contenido específico
    renderStudentContent();
}

// Cargar estadísticas del estudiante
async function loadStudentStats() {
    try {
        // Datos mock mientras se implementa el endpoint
        console.log('Cargando estadísticas del estudiante (datos temporales)...');
        document.getElementById('totalSessions').textContent = '0';
        document.getElementById('pendingSessions').textContent = '0';
        document.getElementById('completedSessions').textContent = '0';
        
        // TODO: Descomentar cuando el endpoint esté listo
        // const response = await apiGet('/student?action=stats');
        // if (response.success) {
        //     document.getElementById('totalSessions').textContent = response.data.totalSessions || 0;
        //     document.getElementById('pendingSessions').textContent = response.data.pendingSessions || 0;
        //     document.getElementById('completedSessions').textContent = response.data.completedSessions || 0;
        // }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Renderizar contenido del estudiante
function renderStudentContent() {
    const content = document.getElementById('dashboardContent');
    
    const studentSection = document.createElement('div');
    studentSection.className = 'mt-8';
    studentSection.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-xl font-bold mb-4">Panel del Estudiante</h3>
            
            <div class="grid md:grid-cols-2 gap-4">
                <button onclick="searchTutors()" class="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700">
                    Buscar Tutores
                </button>
                <button onclick="requestSession()" class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700">
                    Solicitar Sesión
                </button>
                <button onclick="viewMyRequests()" class="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700">
                    Mis Solicitudes
                </button>
                <button onclick="viewMaterials()" class="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700">
                    Materiales de Estudio
                </button>
            </div>
        </div>
    `;
    
    content.appendChild(studentSection);
}

// Buscar tutores
async function searchTutors() {
    try {
        const response = await apiGet('/student?action=tutors');
        
        if (response.success) {
            console.log('Tutores disponibles:', response.data);
            showNotification('Función de búsqueda de tutores en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al buscar tutores', 'error');
    }
}

// Solicitar sesión
async function requestSession() {
    showNotification('Función de solicitar sesión en desarrollo', 'info');
}

// Ver mis solicitudes
async function viewMyRequests() {
    try {
        const response = await apiGet('/student?action=requests');
        
        if (response.success) {
            console.log('Mis solicitudes:', response.data);
            showNotification('Función de solicitudes en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar solicitudes', 'error');
    }
}

// Ver materiales
async function viewMaterials() {
    try {
        const response = await apiGet('/student?action=materials');
        
        if (response.success) {
            console.log('Materiales:', response.data);
            showNotification('Función de materiales en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar materiales', 'error');
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
    if (!content) {
        console.error('❌ No se encontró el contenedor dashboardContent');
        return;
    }
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando módulo...</p></div>';
        
        // Cargar CSS si es necesario
        const cssPath = '/Sistema-de-tutorias/frontend/css/estudiante/estudiante.css';
        
        if (!document.querySelector(`link[href*="estudiante.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
            console.log('✅ CSS cargado:', cssPath);
        }
        
        // Cargar HTML
        const url = '/Sistema-de-tutorias/frontend/components/estudiante/estudiante.html';
        console.log('📄 Cargando HTML desde:', url);
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        console.log('✅ HTML cargado correctamente');
        
        // Cargar dashboard del estudiante
        await loadStudentDashboard();
        
        console.log('✅ Módulo de inicio del estudiante cargado');
    } catch (error) {
        console.error('❌ Error al cargar módulo de inicio:', error);
        content.innerHTML = `<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">
            <i class="fa-solid fa-exclamation-triangle" style="font-size:48px;margin-bottom:16px;"></i>
            <h3>Error al cargar el módulo</h3>
            <p style="color:#666;">${error.message}</p>
        </div>`;
    }
}

/**
 * Cargar contenido del módulo "Sesión actual" (sesion-estudiante.html)
 */
async function loadSesionActualContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) {
        console.error('❌ No se encontró el contenedor dashboardContent');
        return;
    }
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando sesión actual...</p></div>';
        
        // Cargar CSS si es necesario
        const cssPath = '/Sistema-de-tutorias/frontend/css/estudiante/sesion-estudiante.css';
        
        if (!document.querySelector(`link[href*="sesion-estudiante.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
            console.log('✅ CSS cargado:', cssPath);
        }
        
        // Cargar HTML
        const url = '/Sistema-de-tutorias/frontend/components/estudiante/sesion-estudiante.html';
        console.log('📄 Cargando HTML desde:', url);
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        console.log('✅ HTML cargado correctamente');
        
        // Inicializar funcionalidad de sesión actual
        // TODO: Implementar lógica de sesión actual
        console.log('✅ Módulo de sesión actual cargado');
    } catch (error) {
        console.error('❌ Error al cargar módulo de sesión actual:', error);
        content.innerHTML = `<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">
            <i class="fa-solid fa-exclamation-triangle" style="font-size:48px;margin-bottom:16px;"></i>
            <h3>Error al cargar el módulo</h3>
            <p style="color:#666;">${error.message}</p>
        </div>`;
    }
}

/**
 * Cargar contenido del módulo "Historial de tutorías" (historial-estudiante.html)
 */
async function loadHistorialTutoriasContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) {
        console.error('❌ No se encontró el contenedor dashboardContent');
        return;
    }
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando historial...</p></div>';
        
        // Cargar CSS si es necesario
        const cssPath = '/Sistema-de-tutorias/frontend/css/estudiante/historial-estudiante.css';
        
        if (!document.querySelector(`link[href*="historial-estudiante.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
            console.log('✅ CSS cargado:', cssPath);
        }
        
        // Cargar HTML
        const url = '/Sistema-de-tutorias/frontend/components/estudiante/historial-estudiante.html';
        console.log('📄 Cargando HTML desde:', url);
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        console.log('✅ HTML cargado correctamente');
        
        // Inicializar funcionalidad de historial
        // TODO: Implementar lógica de historial
        console.log('✅ Módulo de historial de tutorías cargado');
    } catch (error) {
        console.error('❌ Error al cargar módulo de historial:', error);
        content.innerHTML = `<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">
            <i class="fa-solid fa-exclamation-triangle" style="font-size:48px;margin-bottom:16px;"></i>
            <h3>Error al cargar el módulo</h3>
            <p style="color:#666;">${error.message}</p>
        </div>`;
    }
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================
window.loadEstudianteContent = loadEstudianteContent;
window.loadSesionActualContent = loadSesionActualContent;
window.loadHistorialTutoriasContent = loadHistorialTutoriasContent;
