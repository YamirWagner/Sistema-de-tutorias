// tutor.js - Funciones del Tutor

// Cargar dashboard del tutor
async function loadTutorDashboard() {
    console.log('Cargando dashboard de tutor...');
    
    // Cargar estadísticas
    await loadTutorStats();
    
    // Renderizar contenido específico
    renderTutorContent();
}

// Cargar estadísticas del tutor
async function loadTutorStats() {
    try {
        const response = await apiGet('/tutor.php?action=stats');
        
        if (response.success) {
            document.getElementById('totalSessions').textContent = response.data.totalSessions || 0;
            document.getElementById('pendingSessions').textContent = response.data.pendingSessions || 0;
            document.getElementById('completedSessions').textContent = response.data.completedSessions || 0;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Renderizar contenido del tutor
function renderTutorContent() {
    const content = document.getElementById('dashboardContent');
    
    const tutorSection = document.createElement('div');
    tutorSection.className = 'mt-8';
    tutorSection.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-xl font-bold mb-4">Panel del Tutor</h3>
            
            <div class="grid md:grid-cols-2 gap-4">
                <button onclick="viewMySessions()" class="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700">
                    Mis Sesiones
                </button>
                <button onclick="createSession()" class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700">
                    Crear Sesión
                </button>
                <button onclick="viewStudents()" class="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700">
                    Mis Estudiantes
                </button>
                <button onclick="uploadMaterials()" class="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700">
                    Subir Materiales
                </button>
            </div>
        </div>
    `;
    
    content.appendChild(tutorSection);
}

// Ver sesiones del tutor
async function viewMySessions() {
    try {
        const response = await apiGet('/tutor.php?action=sessions');
        
        if (response.success) {
            console.log('Mis sesiones:', response.data);
            showNotification('Función de mis sesiones en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar sesiones', 'error');
    }
}

// Crear sesión de tutoría
async function createSession() {
    showNotification('Función de crear sesión en desarrollo', 'info');
}

// Ver estudiantes
async function viewStudents() {
    try {
        const response = await apiGet('/tutor.php?action=students');
        
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
