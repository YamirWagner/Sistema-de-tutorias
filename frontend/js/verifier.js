// verifier.js - Funciones del Verificador

// Cargar dashboard del verificador
async function loadVerifierDashboard() {
    console.log('Cargando dashboard de verificador...');
    
    // Cargar estadísticas
    await loadVerifierStats();
    
    // Renderizar contenido específico
    renderVerifierContent();
}

// Cargar estadísticas del verificador
async function loadVerifierStats() {
    try {
        const response = await apiGet('/verifier.php?action=stats');
        
        if (response.success) {
            document.getElementById('totalSessions').textContent = response.data.totalSessions || 0;
            document.getElementById('pendingSessions').textContent = response.data.pendingVerification || 0;
            document.getElementById('completedSessions').textContent = response.data.verifiedSessions || 0;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Renderizar contenido del verificador
function renderVerifierContent() {
    const content = document.getElementById('dashboardContent');
    
    const verifierSection = document.createElement('div');
    verifierSection.className = 'mt-8';
    verifierSection.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-xl font-bold mb-4">Panel del Verificador</h3>
            
            <div class="grid md:grid-cols-2 gap-4">
                <button onclick="viewPendingVerifications()" class="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700">
                    Sesiones Pendientes
                </button>
                <button onclick="viewVerifiedSessions()" class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700">
                    Sesiones Verificadas
                </button>
                <button onclick="generateVerificationReport()" class="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700">
                    Generar Reporte
                </button>
                <button onclick="viewVerificationHistory()" class="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700">
                    Historial de Verificaciones
                </button>
            </div>
        </div>
    `;
    
    content.appendChild(verifierSection);
}

// Ver sesiones pendientes de verificación
async function viewPendingVerifications() {
    try {
        const response = await apiGet('/verifier.php?action=pending');
        
        if (response.success) {
            console.log('Sesiones pendientes:', response.data);
            showNotification('Función de verificaciones pendientes en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar sesiones pendientes', 'error');
    }
}

// Ver sesiones verificadas
async function viewVerifiedSessions() {
    try {
        const response = await apiGet('/verifier.php?action=verified');
        
        if (response.success) {
            console.log('Sesiones verificadas:', response.data);
            showNotification('Función de sesiones verificadas en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar sesiones verificadas', 'error');
    }
}

// Generar reporte de verificación
async function generateVerificationReport() {
    showNotification('Función de generar reporte en desarrollo', 'info');
}

// Ver historial de verificaciones
async function viewVerificationHistory() {
    try {
        const response = await apiGet('/verifier.php?action=history');
        
        if (response.success) {
            console.log('Historial:', response.data);
            showNotification('Función de historial en desarrollo', 'info');
        }
    } catch (error) {
        showNotification('Error al cargar historial', 'error');
    }
}
