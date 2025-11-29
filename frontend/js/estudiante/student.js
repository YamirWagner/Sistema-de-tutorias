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
