// ============================================
// VERIFICADOR - Sistema de Tutorías UNSAAC
// ============================================

console.log('%c🔍 VERIFICADOR CARGADO - 31/Dic/2025', 'background: #9B192D; color: #fff; font-weight: bold; padding: 5px;');

// Variables globales para gráficos
let attendanceChart = null;
let monthlyChart = null;

// Cargar dashboard del verificador
async function loadVerifierDashboard() {
    console.log('🔍 Cargando dashboard de verificador...');
    
    const content = document.getElementById('dashboardContent');
    if (!content) {
        console.error('❌ No se encontró el contenedor dashboardContent');
        return;
    }
    
    try {
        // Cargar el HTML del dashboard
        const response = await fetch('/Sistema-de-tutorias/frontend/components/verificador/verificador.html');
        const html = await response.text();
        content.innerHTML = html;
        
        // Cargar estadísticas
        await loadVerifierStats();
        
        // Inicializar gráficos
        initializeCharts();
        
        // Cargar listas de top estudiantes y tutores
        await loadTopStudents();
        await loadTopTutors();
        
        console.log('✅ Dashboard de verificador cargado correctamente');
    } catch (error) {
        console.error('❌ Error al cargar dashboard:', error);
        content.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>Error al cargar el dashboard del verificador</p>
            </div>
        `;
    }
}

// Cargar estadísticas del verificador
async function loadVerifierStats() {
    try {
        console.log('📊 Cargando estadísticas del verificador...');
        
        const response = await apiGet('/verificador?action=stats');
        
        if (response.success) {
            const stats = response.data;
            document.getElementById('totalSessions').textContent = stats.totalSessions || 0;
            document.getElementById('pendingSessions').textContent = stats.pendingSessions || 0;
            document.getElementById('verifiedSessions').textContent = stats.verifiedSessions || 0;
            document.getElementById('missingSessions').textContent = stats.missingSessions || 0;
            
            console.log('✅ Estadísticas cargadas:', stats);
        } else {
            // Datos temporales si falla el endpoint
            console.warn('⚠️ Usando datos temporales');
            document.getElementById('totalSessions').textContent = '0';
            document.getElementById('pendingSessions').textContent = '0';
            document.getElementById('verifiedSessions').textContent = '0';
            document.getElementById('missingSessions').textContent = '0';
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
        // Datos por defecto
        document.getElementById('totalSessions').textContent = '0';
        document.getElementById('pendingSessions').textContent = '0';
        document.getElementById('verifiedSessions').textContent = '0';
        document.getElementById('missingSessions').textContent = '0';
    }
}

// Inicializar gráficos con Chart.js
function initializeCharts() {
    // Destruir gráficos existentes si los hay
    if (attendanceChart) {
        attendanceChart.destroy();
    }
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    // Gráfico de asistencia (Pie/Donut)
    const attendanceCtx = document.getElementById('attendanceChart');
    if (attendanceCtx) {
        attendanceChart = new Chart(attendanceCtx, {
            type: 'doughnut',
            data: {
                labels: ['Asistieron', 'No Asistieron', 'Faltantes'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#4caf50',
                        '#f44336',
                        '#ff9800'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Gráfico de tutorías por mes (Line)
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
        monthlyChart = new Chart(monthlyCtx, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Tutorías Realizadas',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#9B192D',
                    backgroundColor: 'rgba(155, 25, 45, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
    
    // Cargar datos reales de los gráficos
    loadChartData();
}

// Cargar datos de los gráficos
async function loadChartData() {
    try {
        const response = await apiGet('/verificador?action=chart-data');
        
        if (response.success && response.data) {
            // Actualizar gráfico de asistencia
            if (attendanceChart && response.data.attendance) {
                attendanceChart.data.datasets[0].data = [
                    response.data.attendance.attended || 0,
                    response.data.attendance.absent || 0,
                    response.data.attendance.missing || 0
                ];
                attendanceChart.update();
            }
            
            // Actualizar gráfico mensual
            if (monthlyChart && response.data.monthly) {
                monthlyChart.data.datasets[0].data = response.data.monthly;
                monthlyChart.update();
            }
        }
    } catch (error) {
        console.error('❌ Error al cargar datos de gráficos:', error);
    }
}

// Cargar top estudiantes
async function loadTopStudents() {
    const container = document.getElementById('topStudentsList');
    if (!container) return;
    
    try {
        const response = await apiGet('/verificador?action=top-students');
        
        if (response.success && response.data && response.data.length > 0) {
            container.innerHTML = response.data.map(student => `
                <div class="list-item">
                    <div class="item-info">
                        <div class="item-name">${student.nombre}</div>
                        <div class="item-detail">Código: ${student.codigo}</div>
                    </div>
                    <div class="item-count">${student.total_sesiones} sesiones</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="loading-text">No hay datos disponibles</p>';
        }
    } catch (error) {
        console.error('❌ Error al cargar top estudiantes:', error);
        container.innerHTML = '<p class="loading-text">Error al cargar datos</p>';
    }
}

// Cargar top tutores
async function loadTopTutors() {
    const container = document.getElementById('topTutorsList');
    if (!container) return;
    
    try {
        const response = await apiGet('/verificador?action=top-tutors');
        
        if (response.success && response.data && response.data.length > 0) {
            container.innerHTML = response.data.map(tutor => `
                <div class="list-item">
                    <div class="item-info">
                        <div class="item-name">${tutor.nombre}</div>
                        <div class="item-detail">${tutor.especialidad || 'Sin especialidad'}</div>
                    </div>
                    <div class="item-count">${tutor.total_sesiones} sesiones</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="loading-text">No hay datos disponibles</p>';
        }
    } catch (error) {
        console.error('❌ Error al cargar top tutores:', error);
        container.innerHTML = '<p class="loading-text">Error al cargar datos</p>';
    }
}

// Ver sesiones pendientes de verificación
async function viewPendingVerifications() {
    console.log('🔍 Ver sesiones pendientes...');
    showNotification('Función en desarrollo', 'info');
}

// Ver sesiones verificadas
async function viewVerifiedSessions() {
    console.log('✅ Ver sesiones verificadas...');
    showNotification('Función en desarrollo', 'info');
}

// Generar reporte de verificación
async function generateVerificationReport() {
    console.log('📄 Generar reporte...');
    showNotification('Función en desarrollo', 'info');
}

// Ver historial de verificaciones
async function viewVerificationHistory() {
    console.log('📋 Ver historial...');
    showNotification('Función en desarrollo', 'info');
}

// Exponer funciones globales
window.loadVerifierDashboard = loadVerifierDashboard;
window.loadVerifierStats = loadVerifierStats;
window.viewPendingVerifications = viewPendingVerifications;
window.viewVerifiedSessions = viewVerifiedSessions;
window.generateVerificationReport = generateVerificationReport;
window.viewVerificationHistory = viewVerificationHistory;

console.log('✅ Módulo verificador inicializado');

