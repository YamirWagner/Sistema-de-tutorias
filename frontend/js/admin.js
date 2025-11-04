// admin.js - Funciones del Administrador

// Cargar dashboard del administrador
async function loadAdminDashboard() {
    console.log('Cargando dashboard de administrador...');
    
    // Cargar estadísticas
    await loadAdminStats();
    
    // Renderizar contenido específico
    renderAdminContent();
}

// Cargar estadísticas del administrador
async function loadAdminStats() {
    try {
        // Datos mock mientras se implementa el endpoint
        console.log('Cargando estadísticas del administrador (datos temporales)...');
        document.getElementById('totalSessions').textContent = '0';
        document.getElementById('pendingSessions').textContent = '0';
        document.getElementById('completedSessions').textContent = '0';
        
        // TODO: Descomentar cuando el endpoint esté listo
        // const response = await apiGet('/admin?action=stats');
        // if (response.success) {
        //     document.getElementById('totalSessions').textContent = response.data.totalSessions || 0;
        //     document.getElementById('pendingSessions').textContent = response.data.pendingSessions || 0;
        //     document.getElementById('completedSessions').textContent = response.data.completedSessions || 0;
        // }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Renderizar contenido del administrador
function renderAdminContent() {
    const content = document.getElementById('dashboardContent');
    
    const adminSection = document.createElement('div');
    adminSection.className = 'mt-8';
    adminSection.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-xl font-bold mb-4">Panel de Administración</h3>
            
            <div class="grid md:grid-cols-2 gap-4">
                <button onclick="manageUsers()" class="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700">
                    Gestionar Usuarios
                </button>
                <button onclick="manageTutors()" class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700">
                    Gestionar Tutores
                </button>
                <button onclick="viewReports()" class="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700">
                    Ver Reportes
                </button>
                <button onclick="systemSettings()" class="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700">
                    Configuración del Sistema
                </button>
            </div>
        </div>
    `;
    
    content.appendChild(adminSection);
}

// Gestionar usuarios
async function manageUsers() {
    try {
        const response = await apiGet('/admin?action=users');
        
        if (response.success) {
            console.log('Usuarios:', response.data);
            showNotification('Función de gestión de usuarios en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar usuarios', 'error');
    }
}

// Gestionar tutores
async function manageTutors() {
    try {
        const response = await apiGet('/admin?action=tutors');
        
        if (response.success) {
            console.log('Tutores:', response.data);
            showNotification('Función de gestión de tutores en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar tutores', 'error');
    }
}

// Ver reportes
async function viewReports() {
    try {
        const response = await apiGet('/admin?action=reports');
        
        if (response.success) {
            console.log('Reportes:', response.data);
            showNotification('Función de reportes en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar reportes', 'error');
    }
}

// Configuración del sistema
function systemSettings() {
    showNotification('Función de configuración en desarrollo', 'info');
}
