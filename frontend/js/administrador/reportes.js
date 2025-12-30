// ================================================
// REPORTES.JS - Sistema de Tutorías UNSAAC
// Lógica de reportes y generación de PDFs
// ================================================

console.log('🔄 Iniciando carga de reportes.js...');

// ===== VARIABLES GLOBALES =====
let currentStudentData = null;
let complianceChart = null;

// ===== FUNCIÓN DE CARGA DEL MÓDULO =====
async function loadReportesContent() {
    console.log('🎯 loadReportesContent ejecutándose...');
    const content = document.getElementById('dashboardContent');
    
    if (!content) {
        console.error('❌ No se encontró #dashboardContent');
        return;
    }
    
    try {
        content.innerHTML = '<div class="loading-message"><i class="fa-solid fa-spinner fa-spin"></i><p>Cargando módulo...</p></div>';
        
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const cssPath = `${basePath}/frontend/css/administrador/reportes.css`;
        
        // Cargar CSS si no existe
        if (!document.querySelector(`link[href*="reportes.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
            console.log('✅ CSS de reportes cargado');
        }
        
        // Cargar HTML
        const url = `${basePath}/frontend/components/administrador/reportes.html`;
        console.log('📄 Cargando HTML desde:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error al cargar: ${response.status}`);
        }
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        console.log('✅ HTML de reportes cargado');
        
        // Esperar procesamiento del DOM
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        
        // Inicializar el módulo
        await initializeReports();
        console.log('✅ Módulo de reportes inicializado completamente');
        
    } catch (error) {
        console.error('❌ Error al cargar módulo de reportes:', error);
        content.innerHTML = `
            <div class="error-message">
                <h3>Error al cargar el módulo</h3>
                <p>${error.message}</p>
            </div>`;
    }
}

// ===== EXPONER FUNCIONES GLOBALMENTE (INMEDIATAMENTE) =====
window.loadReportesContent = loadReportesContent;

// Asegurar disponibilidad múltiple
if (typeof window.modules === 'undefined') {
    window.modules = {};
}
window.modules.reportes = { load: loadReportesContent };

console.log('✅ reportes.js: loadReportesContent expuesta globalmente');
console.log('📌 Tipo de window.loadReportesContent:', typeof window.loadReportesContent);
console.log('📌 Disponible en window:', 'loadReportesContent' in window);

// ===== INICIALIZACIÓN =====
async function initializeReports() {
    try {
        await loadSemesters();
        setupEventListeners();
    } catch (error) {
        console.error('Error inicializando reportes:', error);
        showNotification('Error al inicializar reportes', 'error');
    }
}

// ===== CARGAR SEMESTRES =====
async function loadSemesters() {
    try {
        const response = await apiGet('/semestre?action=list');
        
        if (response.success && response.data) {
            const semestres = response.data;
            populateSemesterSelect('semester-tutor-list', semestres);
            populateSemesterSelect('semester-constancia', semestres);
            populateSemesterSelect('semester-compliance', semestres);
        }
    } catch (error) {
        console.error('Error cargando semestres:', error);
        showNotification('Error al cargar semestres', 'error');
    }
}

function populateSemesterSelect(selectId, semestres) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccione un semestre</option>';
    
    semestres.forEach(sem => {
        const option = document.createElement('option');
        option.value = sem.id;
        option.textContent = `${sem.nombre} ${sem.estado === 'activo' ? '(Activo)' : ''}`;
        select.appendChild(option);
    });
}

// ===== CONFIGURAR EVENT LISTENERS =====
function setupEventListeners() {
    // Sección 1: Lista de Tutorados
    const semesterTutorSelect = document.getElementById('semester-tutor-list');
    if (semesterTutorSelect) {
        semesterTutorSelect.addEventListener('change', loadTutorsBySemester);
    }
    
    const btnGenerateTutorList = document.getElementById('btn-generate-tutor-list');
    if (btnGenerateTutorList) {
        btnGenerateTutorList.addEventListener('click', generateTutorListPDF);
    }
    
    // Sección 2: Historial de Estudiante - Solo botón buscar
    // (Ya no necesita listeners de input ni sugerencias)
    
    // Sección 3: Constancia de Tutoría
    const studentConstancia = document.getElementById('student-constancia');
    if (studentConstancia) {
        studentConstancia.addEventListener('input', debounce(searchStudentsConstancia, 300));
    }
    
    const btnGenerateConstancia = document.getElementById('btn-generate-constancia');
    if (btnGenerateConstancia) {
        btnGenerateConstancia.addEventListener('click', generateConstanciaPDF);
    }
    
    // Sección 4: Reporte de Cumplimiento
    const btnGenerateCompliance = document.getElementById('btn-generate-compliance');
    if (btnGenerateCompliance) {
        btnGenerateCompliance.addEventListener('click', generateComplianceReport);
    }
}

// ===== SECCIÓN 1: LISTA DE TUTORADOS POR TUTOR =====
async function loadTutorsBySemester() {
    const semesterId = document.getElementById('semester-tutor-list').value;
    const tutorSelect = document.getElementById('tutor-select');
    
    if (!semesterId) {
        tutorSelect.innerHTML = '<option value="">Primero selecciona un semestre</option>';
        tutorSelect.disabled = true;
        return;
    }
    
    tutorSelect.disabled = false;
    tutorSelect.innerHTML = '<option value="">Cargando tutores...</option>';
    
    try {
        const response = await apiGet(`/reportes?action=getTutors&semesterId=${semesterId}`);
        
        if (response.success && response.data) {
            tutorSelect.innerHTML = '<option value="">Seleccione un tutor</option>';
            tutorSelect.innerHTML += '<option value="all">Todos los Tutores</option>';
            
            response.data.forEach(tutor => {
                const option = document.createElement('option');
                option.value = tutor.id;
                option.textContent = `${tutor.nombres} ${tutor.apellidos} (${tutor.estudiantesAsignados || 0} estudiantes)`;
                tutorSelect.appendChild(option);
            });
            
            console.log(`✅ ${response.data.length} tutores cargados`);
        }
    } catch (error) {
        console.error('❌ Error cargando tutores:', error);
        tutorSelect.innerHTML = '<option value="">Error al cargar tutores</option>';
        showNotification('Error al cargar tutores', 'error');
    }
}

async function generateTutorListPDF() {
    const semesterId = document.getElementById('semester-tutor-list').value;
    const tutorId = document.getElementById('tutor-select').value;
    
    if (!semesterId) {
        showNotification('Por favor seleccione un semestre', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        // Llamar al backend para generar el PDF
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        let url = `${basePath}/api/reporte-pdf.php?tipo=lista-tutores&semesterId=${semesterId}`;
        
        // Si se seleccionó un tutor específico (no "all" ni vacío), agregarlo a la URL
        if (tutorId && tutorId !== 'all' && tutorId !== '') {
            url += `&tutorId=${tutorId}`;
        }
        
        console.log('📄 Generando PDF con URL:', url);
        
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // Mostrar PDF en modal
            const blob = await response.blob();
            const pdfUrl = window.URL.createObjectURL(blob);
            
            // Guardar la URL para descarga
            window.currentPdfUrl = pdfUrl;
            window.currentPdfFilename = `Constancia_Tutores_Semestre_${semesterId}_${new Date().toISOString().split('T')[0]}.pdf`;
            
            // Mostrar en modal
            showPdfModal(pdfUrl);
            
            showNotification('PDF generado exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al generar el PDF', 'error');
        }
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        showNotification('Error al generar el PDF', 'error');
    } finally {
        showLoading(false);
    }
}

// ===== FUNCIONES DEL MODAL PDF =====
window.showPdfModal = function(pdfUrl) {
    console.log('📄 Abriendo modal PDF');
    const modal = document.getElementById('pdf-modal');
    
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('✅ Modal abierto');
    } else {
        console.error('❌ No se encontró el modal');
    }
};

window.openPdfInNewTab = function() {
    if (window.currentPdfUrl) {
        window.open(window.currentPdfUrl, '_blank');
        console.log('📄 PDF abierto en nueva pestaña');
    } else {
        showNotification('No hay PDF disponible', 'error');
    }
};

window.closePdfModal = function() {
    console.log('🚪 Cerrando modal PDF');
    const modal = document.getElementById('pdf-modal');
    
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Liberar URL del blob después de un delay para permitir descargas pendientes
        setTimeout(() => {
            if (window.currentPdfUrl) {
                URL.revokeObjectURL(window.currentPdfUrl);
                window.currentPdfUrl = null;
            }
        }, 1000);
        
        console.log('✅ Modal cerrado');
    }
};

window.downloadCurrentPdf = function() {
    console.log('💾 Descargando PDF:', window.currentPdfFilename);
    if (window.currentPdfUrl && window.currentPdfFilename) {
        const link = document.createElement('a');
        link.href = window.currentPdfUrl;
        link.download = window.currentPdfFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('PDF descargado exitosamente', 'success');
        console.log('✅ PDF descargado');
    } else {
        console.error('❌ No hay PDF para descargar');
        showNotification('No hay PDF para descargar', 'error');
    }
};

// ===== SECCIÓN 2: CONSTANCIA DE TUTORÍA =====
window.buscarConstanciaEstudiante = async function() {
    const semesterId = document.getElementById('semester-constancia').value;
    const codigoEstudiante = document.getElementById('student-code-constancia').value.trim();
    
    if (!semesterId) {
        showNotification('Por favor seleccione un semestre', 'warning');
        return;
    }
    
    if (!codigoEstudiante) {
        showNotification('Por favor ingrese el código del estudiante', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        // Buscar estudiante por código
        const studentResponse = await apiGet(`/reportes?action=searchStudentByCode&codigo=${encodeURIComponent(codigoEstudiante)}`);
        
        if (!studentResponse.success || !studentResponse.data) {
            showNotification('No se encontró un estudiante con ese código', 'error');
            document.getElementById('constancia-result').classList.add('hidden');
            return;
        }
        
        const estudiante = studentResponse.data;
        
        // Buscar constancia en la BD
        const constanciaResponse = await apiGet(`/listar-constancias?semesterId=${semesterId}&estudianteId=${estudiante.id}`);
        
        // Mostrar resultado
        mostrarResultadoConstancia(estudiante, constanciaResponse.data, semesterId);
        
    } catch (error) {
        console.error('❌ Error buscando constancia:', error);
        showNotification('Error al buscar la constancia', 'error');
    } finally {
        showLoading(false);
    }
};

function mostrarResultadoConstancia(estudiante, constancias, semesterId) {
    const resultDiv = document.getElementById('constancia-result');
    const nameDisplay = document.getElementById('result-student-name');
    const codeDisplay = document.getElementById('result-student-code');
    const statusContainer = document.getElementById('constancia-status-container');
    
    // Mostrar nombre y código del estudiante
    nameDisplay.textContent = `${estudiante.nombres} ${estudiante.apellidos}`;
    codeDisplay.textContent = estudiante.codigo;
    
    // Verificar si tiene constancia
    const constancia = constancias && constancias.length > 0 ? constancias[0] : null;
    
    if (constancia && constancia.rutaPDF) {
        // Tiene constancia
        const estaFirmada = constancia.firmado == 1;
        const fechaGeneracion = constancia.fechaGeneracion ? new Date(constancia.fechaGeneracion).toLocaleDateString('es-PE') : 'N/A';
        const fechaFirma = constancia.fechaFirma ? new Date(constancia.fechaFirma).toLocaleDateString('es-PE') : null;
        
        statusContainer.innerHTML = `
            <div class="constancia-found">
                <div class="pdf-icon">
                    <i class="fa-solid fa-file-pdf"></i>
                </div>
                <div class="constancia-details">
                    <h5>
                        <i class="fa-solid fa-check-circle"></i>
                        Constancia Encontrada
                    </h5>
                    <p><strong>Estado:</strong> ${estaFirmada ? '<span class="badge-firmada">Firmada</span>' : '<span class="badge-pendiente">Sin firmar</span>'}</p>
                    <p><strong>Fecha de generación:</strong> ${fechaGeneracion}</p>
                    ${fechaFirma ? `<p><strong>Fecha de firma:</strong> ${fechaFirma}</p>` : ''}
                    <div class="constancia-actions">
                        <button class="btn-download-pdf" onclick="descargarConstancia('${constancia.rutaPDF}', '${estudiante.codigo}')">
                            <i class="fa-solid fa-download"></i>
                            Descargar PDF
                        </button>
                        <button class="btn-secondary" onclick="verConstancia('${constancia.rutaPDF}')">
                            <i class="fa-solid fa-eye"></i>
                            Ver PDF
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // No tiene constancia
        statusContainer.innerHTML = `
            <div class="constancia-not-found">
                <div class="no-icon">
                    <i class="fa-solid fa-file-circle-xmark"></i>
                </div>
                <div class="no-details">
                    <h5>
                        <i class="fa-solid fa-info-circle"></i>
                        No se encontró constancia
                    </h5>
                    <p>Este estudiante no tiene una constancia generada para el semestre seleccionado.</p>
                    <p class="help-text">La constancia se genera automáticamente cuando el estudiante completa las 3 sesiones requeridas (Académica, Personal y Profesional).</p>
                </div>
            </div>
        `;
    }
    
    resultDiv.classList.remove('hidden');
}

window.descargarConstancia = function(rutaPDF, codigoEstudiante) {
    const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
    const url = `${basePath}/backend/${rutaPDF}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `constancia_${codigoEstudiante}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Descargando constancia...', 'success');
};

window.verConstancia = function(rutaPDF) {
    const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
    const url = `${basePath}/backend/${rutaPDF}`;
    window.open(url, '_blank');
};

async function generateConstanciaPDF() {
    const semesterId = document.getElementById('semester-constancia').value;
    
    if (!semesterId || !currentStudentData) {
        showNotification('Por favor seleccione semestre y estudiante', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        // Primero obtener datos para mostrar en pantalla
        const response = await apiGet(`/reportes?action=getConstanciaData&semesterId=${semesterId}&studentId=${currentStudentData.id}`);
        
        if (response.success && response.data) {
            displayConstanciaInfo(response.data);
            
            // Ahora generar el PDF desde el backend usando reporte-pdf.php
            const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
            const url = `${basePath}/api/reporte-pdf.php?tipo=constancia&estudianteId=${currentStudentData.id}&semesterId=${semesterId}`;
            const token = localStorage.getItem('token');
            
            const pdfResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (pdfResponse.ok) {
                const blob = await pdfResponse.blob();
                const filename = `Constancia_${currentStudentData.codigo}_${response.data.semestre.replace(/\s/g, '_')}.pdf`;
                
                // Abrir modal con PDF
                openPdfModal(blob, filename);
                
                showNotification('Constancia generada exitosamente', 'success');
            } else {
                const error = await pdfResponse.json();
                showNotification(error.error || 'Error al generar la constancia', 'error');
            }
        } else {
            showNotification('No se puede generar la constancia. Verifica que el estudiante haya completado las tutorías.', 'warning');
        }
    } catch (error) {
        console.error('❌ Error generando constancia:', error);
        showNotification('Error al generar la constancia', 'error');
    } finally {
        showLoading(false);
    }
}

function displayConstanciaInfo(data) {
    const infoDiv = document.getElementById('constancia-info');
    
    if (!data || !data.estudiante) {
        console.error('❌ Datos incompletos para mostrar constancia');
        return;
    }
    
    const nameEl = document.getElementById('const-student-name');
    const codeEl = document.getElementById('const-student-code');
    const semesterEl = document.getElementById('const-semester');
    const sessionsEl = document.getElementById('const-sessions');
    
    if (nameEl) nameEl.textContent = `${data.estudiante.nombres} ${data.estudiante.apellidos}`;
    if (codeEl) codeEl.textContent = data.estudiante.codigo;
    if (semesterEl) semesterEl.textContent = data.semestre;
    if (sessionsEl) sessionsEl.textContent = data.sesionesCompletadas;
    
    const statusSpan = document.getElementById('const-status');
    if (statusSpan) {
        statusSpan.textContent = data.completado ? 'Completado' : 'En Proceso';
        statusSpan.style.color = data.completado ? '#27ae60' : '#f39c12';
    }
    
    if (infoDiv) {
        infoDiv.classList.remove('hidden');
    }
}

// ===== SECCIÓN 4: REPORTE DE CUMPLIMIENTO =====
async function generateComplianceReport() {
    const semesterId = document.getElementById('semester-compliance').value;
    
    if (!semesterId) {
        showNotification('Por favor seleccione un semestre', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await apiGet(`/reportes?action=getComplianceStats&semesterId=${semesterId}`);
        
        if (response.success && response.data) {
            displayComplianceStats(response.data);
            renderComplianceChart(response.data);
            showNotification('Reporte generado exitosamente', 'success');
        } else {
            showNotification('No se encontraron datos para generar el reporte', 'warning');
        }
    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        showNotification('Error al generar el reporte', 'error');
    } finally {
        showLoading(false);
    }
}

function displayComplianceStats(data) {
    if (!data) {
        console.error('❌ Datos incompletos para estadísticas');
        return;
    }
    
    const elements = {
        tutors: document.getElementById('stat-total-tutors'),
        students: document.getElementById('stat-total-students'),
        sessions: document.getElementById('stat-total-sessions'),
        avg: document.getElementById('stat-avg-sessions'),
        results: document.getElementById('compliance-results')
    };
    
    if (elements.tutors) elements.tutors.textContent = data.totalTutores || 0;
    if (elements.students) elements.students.textContent = data.totalEstudiantes || 0;
    if (elements.sessions) elements.sessions.textContent = data.totalSesiones || 0;
    if (elements.avg) elements.avg.textContent = (data.promedioSesiones || 0).toFixed(1);
    
    if (elements.results) elements.results.classList.remove('hidden');
}

function renderComplianceChart(data) {
    const ctx = document.getElementById('compliance-chart');
    if (!ctx) {
        console.warn('⚠️ Canvas para gráfico no encontrado');
        return;
    }
    
    if (!data || !data.tutores || data.tutores.length === 0) {
        console.warn('⚠️ No hay datos de tutores para el gráfico');
        return;
    }
    
    // Verificar que Chart.js esté disponible
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js no está cargado');
        return;
    }
    
    // Destruir gráfico anterior si existe
    if (complianceChart) {
        complianceChart.destroy();
    }
    
    try {
        complianceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.tutores.map(t => t.nombre || 'Sin nombre'),
                datasets: [{
                    label: 'Sesiones Registradas',
                    data: data.tutores.map(t => t.sesiones || 0),
                    backgroundColor: 'rgba(155, 25, 45, 0.7)',
                    borderColor: 'rgba(155, 25, 45, 1)',
                    borderWidth: 2,
                    hoverBackgroundColor: 'rgba(155, 25, 45, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Sesiones Registradas por Tutor',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#9B192D'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        console.log('✅ Gráfico de cumplimiento renderizado');
    } catch (error) {
        console.error('❌ Error renderizando gráfico:', error);
    }
}

// ===== FUNCIONES AUXILIARES =====
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    } else if (show) {
        console.log('⏳ Cargando...');
    }
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Intentar usar la función global si existe
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    // Crear notificación simple si no existe función global
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#9B192D'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
}

// Cerrar sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
    const suggestions = document.querySelectorAll('#student-suggestions, #student-constancia-suggestions');
    suggestions.forEach(div => {
        if (!e.target.closest(`#${div.id}`) && !e.target.closest(`#${div.id.replace('-suggestions', '')}`)  ) {
            div.classList.add('hidden');
        }
    });
});

// ===== FUNCIONES PARA MODAL PDF =====
let currentPdfBlob = null;
let currentPdfFilename = 'reporte.pdf';

function openPdfModal(blob, filename) {
    currentPdfBlob = blob;
    currentPdfFilename = filename;
    
    const pdfUrl = window.URL.createObjectURL(blob);
    const modal = document.getElementById('pdf-modal');
    const iframe = document.getElementById('pdf-viewer');
    
    iframe.src = pdfUrl;
    modal.style.display = 'flex';
    
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
}

function closePdfModal() {
    const modal = document.getElementById('pdf-modal');
    const iframe = document.getElementById('pdf-viewer');
    
    // Limpiar recursos
    if (iframe.src) {
        window.URL.revokeObjectURL(iframe.src);
        iframe.src = '';
    }
    
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    currentPdfBlob = null;
    currentPdfFilename = 'reporte.pdf';
}

function downloadCurrentPdf() {
    if (!currentPdfBlob) {
        showNotification('No hay PDF para descargar', 'warning');
        return;
    }
    
    const downloadUrl = window.URL.createObjectURL(currentPdfBlob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = currentPdfFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
    
    showNotification('Descarga iniciada', 'success');
}

// Exponer funciones globalmente para onclick
window.closePdfModal = closePdfModal;
window.downloadCurrentPdf = downloadCurrentPdf;

// Cerrar modal con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('pdf-modal');
        if (modal && modal.style.display === 'flex') {
            closePdfModal();
        }
    }
});

console.log('✅ reportes.js cargado correctamente en el DOM');
