// tutor.js - Funciones del Tutor

// Cargar dashboard del tutor
async function loadTutorDashboard() {
    console.log('Cargando dashboard de tutor...');
    
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

// Crear sesión de tutoría
async function createSession() {
    showNotification('Función de crear sesión en desarrollo', 'info');
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
