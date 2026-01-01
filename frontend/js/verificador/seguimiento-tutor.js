// ============================================
// SEGUIMIENTO POR TUTOR - Verificador
// ============================================

console.log('%c👨‍🏫 MÓDULO SEGUIMIENTO POR TUTOR CARGADO', 'background: #9B192D; color: #fff; font-weight: bold; padding: 5px;');

let currentTutorData = null;
let tutorMonthlyChart = null;
let tutorStatusChart = null;

// Cargar contenido de seguimiento por tutor
async function loadSeguimientoTutorContent() {
    console.log('👨‍🏫 Cargando módulo de seguimiento por tutor...');
    
    const content = document.getElementById('dashboardContent');
    if (!content) {
        console.error('❌ No se encontró el contenedor dashboardContent');
        return;
    }
    
    try {
        // Cargar el HTML del módulo
        const basePath = (window.APP_BASE_PATH || '').replace(/\/+$/, '');
        const response = await fetch(`${basePath}/frontend/components/verificador/seguimiento-tutor.html`);
        const html = await response.text();
        content.innerHTML = html;
        
        // Cargar lista de tutores
        await cargarListaTutores();
        
        // Configurar event listeners
        setupSeguimientoTutorListeners();
        
        console.log('✅ Módulo de seguimiento por tutor cargado correctamente');
    } catch (error) {
        console.error('❌ Error al cargar módulo:', error);
        content.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>Error al cargar el módulo de seguimiento por tutor</p>
            </div>
        `;
    }
}

// Configurar listeners
function setupSeguimientoTutorListeners() {
    const filterMes = document.getElementById('filterMes');
    const filterEstado = document.getElementById('filterEstadoTutor');
    
    if (filterMes) {
        filterMes.addEventListener('change', aplicarFiltrosTutor);
    }
    
    if (filterEstado) {
        filterEstado.addEventListener('change', aplicarFiltrosTutor);
    }
}

// Cargar lista de tutores
async function cargarListaTutores() {
    console.log('📋 Cargando lista de tutores...');
    
    try {
        const response = await apiGet('/seguimientoTutor?action=lista');
        
        if (response.success && response.data) {
            const select = document.getElementById('selectTutor');
            if (select) {
                select.innerHTML = '<option value="">Seleccione un tutor...</option>' +
                    response.data.map(tutor => 
                        `<option value="${tutor.id}">${tutor.nombre} - ${tutor.codigo}</option>`
                    ).join('');
            }
            console.log('✅ Lista de tutores cargada');
        }
    } catch (error) {
        console.error('❌ Error al cargar lista de tutores:', error);
    }
}

// Cargar datos del tutor seleccionado
async function cargarDatosTutor() {
    const tutorId = document.getElementById('selectTutor').value;
    
    if (!tutorId) {
        // Ocultar secciones si no hay tutor seleccionado
        document.getElementById('tutorInfo').style.display = 'none';
        document.getElementById('tutorCharts').style.display = 'none';
        document.getElementById('tutorSessions').style.display = 'none';
        return;
    }
    
    console.log('📊 Cargando datos del tutor:', tutorId);
    
    try {
        const response = await apiGet(`/seguimientoTutor?action=datos&tutor_id=${tutorId}`);
        
        if (response.success && response.data) {
            currentTutorData = response.data;
            mostrarInformacionTutor(response.data);
            await cargarSesionesTutor(tutorId);
            inicializarGraficosTutor(response.data);
        }
    } catch (error) {
        console.error('❌ Error al cargar datos del tutor:', error);
        showNotification('Error al cargar los datos del tutor', 'error');
    }
}

// Mostrar información del tutor
function mostrarInformacionTutor(data) {
    document.getElementById('tutorName').textContent = data.nombre || '-';
    document.getElementById('tutorCode').textContent = data.codigo || '-';
    document.getElementById('tutorEmail').textContent = data.correo || '-';
    document.getElementById('tutorSpecialty').textContent = data.especialidad || '-';
    document.getElementById('totalSesiones').textContent = data.total_sesiones || 0;
    document.getElementById('sesionesRealizadas').textContent = data.sesiones_realizadas || 0;
    document.getElementById('sesionesPendientes').textContent = data.sesiones_pendientes || 0;
    document.getElementById('estudiantesAtendidos').textContent = data.estudiantes_atendidos || 0;
    
    document.getElementById('tutorInfo').style.display = 'block';
    document.getElementById('tutorCharts').style.display = 'grid';
    document.getElementById('tutorSessions').style.display = 'block';
}

// Inicializar gráficos del tutor
function inicializarGraficosTutor(data) {
    // Destruir gráficos existentes
    if (tutorMonthlyChart) {
        tutorMonthlyChart.destroy();
    }
    if (tutorStatusChart) {
        tutorStatusChart.destroy();
    }
    
    // Gráfico de sesiones por mes
    const monthlyCtx = document.getElementById('tutorMonthlyChart');
    if (monthlyCtx) {
        tutorMonthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Sesiones',
                    data: data.sesiones_por_mes || Array(12).fill(0),
                    backgroundColor: 'rgba(155, 25, 45, 0.8)',
                    borderColor: '#9B192D',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
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
    
    // Gráfico de distribución de estados
    const statusCtx = document.getElementById('tutorStatusChart');
    if (statusCtx) {
        tutorStatusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Realizadas', 'Pendientes', 'Canceladas'],
                datasets: [{
                    data: [
                        data.sesiones_realizadas || 0,
                        data.sesiones_pendientes || 0,
                        data.sesiones_canceladas || 0
                    ],
                    backgroundColor: [
                        '#4caf50',
                        '#ff9800',
                        '#f44336'
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
}

// Cargar sesiones del tutor
async function cargarSesionesTutor(tutorId) {
    console.log('📋 Cargando sesiones del tutor:', tutorId);
    
    try {
        const response = await apiGet(`/seguimientoTutor?action=sesiones&tutor_id=${tutorId}`);
        
        if (response.success && response.data) {
            renderSessionsTable(response.data.sesiones || []);
        } else {
            renderSessionsTable([]);
        }
    } catch (error) {
        console.error('❌ Error al cargar sesiones:', error);
        renderSessionsTable([]);
    }
}

// Renderizar tabla de sesiones
function renderSessionsTable(sesiones) {
    const tbody = document.getElementById('sessionsTableBody');
    if (!tbody) return;
    
    if (sesiones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-row">
                    No hay sesiones registradas para este tutor
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sesiones.map(sesion => {
        const estadoClass = sesion.estado === 'realizada' ? 'status-realizada' : 
                           sesion.estado === 'pendiente' ? 'status-pendiente' : 
                           'status-cancelada';
        
        const asistenciaClass = sesion.asistencia === 'si' ? 'asistencia-si' : 
                                sesion.asistencia === 'no' ? 'asistencia-no' : 
                                'asistencia-pendiente';
        
        const asistenciaTexto = sesion.asistencia === 'si' ? 'Sí' : 
                                sesion.asistencia === 'no' ? 'No' : 
                                'Pendiente';
        
        return `
            <tr>
                <td>${sesion.fecha || '-'}</td>
                <td>${sesion.hora || '-'}</td>
                <td>${sesion.estudiante || '-'}</td>
                <td>${sesion.tema || '-'}</td>
                <td>${sesion.duracion || '-'}</td>
                <td>
                    <span class="status-badge ${estadoClass}">
                        ${sesion.estado || 'Pendiente'}
                    </span>
                </td>
                <td>
                    <span class="asistencia-badge ${asistenciaClass}">
                        ${asistenciaTexto}
                    </span>
                </td>
                <td>${sesion.observaciones || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Aplicar filtros
function aplicarFiltrosTutor() {
    const mes = document.getElementById('filterMes').value;
    const estado = document.getElementById('filterEstadoTutor').value;
    
    if (!currentTutorData) return;
    
    console.log('🔍 Aplicando filtros:', { mes, estado });
    
    const params = new URLSearchParams({
        tutor_id: document.getElementById('selectTutor').value
    });
    
    if (mes) params.append('mes', mes);
    if (estado) params.append('estado', estado);
    
    apiGet(`/seguimientoTutor?action=sesiones&${params.toString()}`)
        .then(response => {
            if (response.success && response.data) {
                renderSessionsTable(response.data.sesiones || []);
            }
        })
        .catch(error => console.error('Error al aplicar filtros:', error));
}

// Exportar reporte del tutor
function exportarReporteTutor() {
    const tutorId = document.getElementById('selectTutor').value;
    
    if (!tutorId) {
        showNotification('Por favor seleccione un tutor primero', 'warning');
        return;
    }
    
    console.log('📄 Exportando reporte del tutor:', tutorId);
    showNotification('Función de exportación en desarrollo', 'info');
}

// Exponer funciones globales
window.loadSeguimientoTutorContent = loadSeguimientoTutorContent;
window.cargarListaTutores = cargarListaTutores;
window.cargarDatosTutor = cargarDatosTutor;
window.aplicarFiltrosTutor = aplicarFiltrosTutor;
window.exportarReporteTutor = exportarReporteTutor;

console.log('✅ Módulo seguimiento por tutor inicializado');
