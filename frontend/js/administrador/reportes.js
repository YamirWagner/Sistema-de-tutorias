// ================================================
// REPORTES.JS - Sistema de Tutorías UNSAAC
// Lógica de reportes y generación de PDFs
// ================================================

// ===== VARIABLES GLOBALES =====
let currentStudentData = null;
let currentHistoryData = [];
let complianceChart = null;

// ===== FUNCIÓN DE CARGA DEL MÓDULO =====
async function loadReportesContent() {
    const content = document.getElementById('dashboardContent');
    
    if (!content) {
        console.error('❌ No se encontró #dashboardContent');
        return;
    }
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando módulo...</p></div>';
        
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const cssPath = `${basePath}/frontend/css/administrador/reportes.css`;
        
        // Cargar CSS si no existe
        if (!document.querySelector(`link[href*="reportes.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        // Cargar HTML
        const url = `${basePath}/frontend/components/administrador/reportes.html`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error al cargar: ${response.status}`);
        }
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        // Esperar procesamiento del DOM
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        
        // Inicializar el módulo
        await initializeReports();
        
    } catch (error) {
        console.error('❌ Error al cargar módulo de reportes:', error);
        content.innerHTML = `
            <div class="error-message" style="padding:40px;text-align:center;">
                <h3 style="color:#dc2626;">Error al cargar el módulo</h3>
                <p style="color:#666;">${error.message}</p>
            </div>`;
    }
}

// Exponer globalmente
window.loadReportesContent = loadReportesContent;

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
        const response = await apiGet('/semestre');
        
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
    
    // Sección 2: Historial de Estudiante
    const studentSearch = document.getElementById('student-search');
    if (studentSearch) {
        studentSearch.addEventListener('input', debounce(searchStudents, 300));
    }
    
    const btnViewHistory = document.getElementById('btn-view-history');
    if (btnViewHistory) {
        btnViewHistory.addEventListener('click', viewStudentHistory);
    }
    
    const btnExportHistory = document.getElementById('btn-export-history');
    if (btnExportHistory) {
        btnExportHistory.addEventListener('click', exportHistoryPDF);
    }
    
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
    
    if (!semesterId || !tutorId) {
        showNotification('Por favor seleccione semestre y tutor', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await apiGet(`/reportes?action=getTutorStudents&semesterId=${semesterId}&tutorId=${tutorId}`);
        
        if (response.success && response.data) {
            generatePDFTutorList(response.data);
            showNotification('PDF generado exitosamente', 'success');
        } else {
            showNotification('No se encontraron datos para generar el reporte', 'warning');
        }
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        showNotification('Error al generar el PDF', 'error');
    } finally {
        showLoading(false);
    }
}

function generatePDFTutorList(data) {
    // Verificar que jsPDF esté disponible
    if (typeof window.jspdf === 'undefined') {
        console.error('❌ jsPDF no está cargado');
        showNotification('Error: Librería PDF no disponible', 'error');
        return;
    }
    
    if (!data || !data.estudiantes || data.estudiantes.length === 0) {
        showNotification('No hay estudiantes para generar el PDF', 'warning');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
    
    // Encabezado
    doc.setFontSize(18);
    doc.text('Lista de Tutorados por Tutor', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Semestre: ${data.semestre}`, 20, 35);
    doc.text(`Tutor: ${data.tutor}`, 20, 42);
    doc.text(`Total de estudiantes: ${data.estudiantes.length}`, 20, 49);
    
    // Tabla
    const tableData = data.estudiantes.map((est, index) => [
        index + 1,
        est.codigo,
        `${est.nombres} ${est.apellidos}`,
        est.email,
        est.sesionesCompletadas || 0
    ]);
    
    doc.autoTable({
        startY: 60,
        head: [['#', 'Código', 'Nombre Completo', 'Email', 'Sesiones']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 10 }
    });
    
    // Fecha de generación
    const today = new Date().toLocaleDateString('es-PE');
    doc.setFontSize(9);
    doc.text(`Generado el: ${today}`, 20, doc.internal.pageSize.height - 10);
    
    const filename = `Lista_Tutorados_${(data.semestre || 'reporte').replace(/\s/g, '_')}.pdf`;
    doc.save(filename);
    
    console.log(`✅ PDF generado: ${filename}`);
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        showNotification('Error al generar el PDF', 'error');
    }
}

// ===== SECCIÓN 2: HISTORIAL DE ESTUDIANTE =====
async function searchStudents() {
    const searchTerm = document.getElementById('student-search').value.trim();
    const suggestionsDiv = document.getElementById('student-suggestions');
    
    if (searchTerm.length < 3) {
        suggestionsDiv.classList.add('hidden');
        return;
    }
    
    try {
        const response = await apiGet(`/reportes?action=searchStudents&query=${encodeURIComponent(searchTerm)}`);
        
        if (response.success && response.data && response.data.length > 0) {
            displayStudentSuggestions(response.data, suggestionsDiv);
        } else {
            suggestionsDiv.innerHTML = '<div class="suggestion-item" style="text-align:center;color:#999;">No se encontraron estudiantes</div>';
            suggestionsDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('❌ Error buscando estudiantes:', error);
    }
}

function displayStudentSuggestions(students, container) {
    container.innerHTML = '';
    container.classList.remove('hidden');
    
    if (students.length === 0) {
        container.innerHTML = '<div class="suggestion-item" style="text-align:center;color:#999;">No se encontraron estudiantes</div>';
        return;
    }
    
    students.forEach(student => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <strong>${student.nombres} ${student.apellidos}</strong>
            <small>Código: ${student.codigo}</small>
        `;
        item.addEventListener('click', () => selectStudent(student, container));
        container.appendChild(item);
    });
}

function selectStudent(student, container) {
    if (!student) return;
    
    currentStudentData = student;
    const searchInput = document.getElementById('student-search');
    if (searchInput) {
        searchInput.value = `${student.codigo} - ${student.nombres} ${student.apellidos}`;
    }
    if (container) {
        container.classList.add('hidden');
    }
    console.log('✅ Estudiante seleccionado:', student);
}

async function viewStudentHistory() {
    if (!currentStudentData) {
        showNotification('Por favor seleccione un estudiante', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await apiGet(`/reportes?action=getStudentHistory&studentId=${currentStudentData.id}`);
        
        if (response.success && response.data) {
            currentHistoryData = response.data.sesiones;
            displayHistoryTable(response.data);
        } else {
            showNotification('No se encontró historial para este estudiante', 'warning');
        }
    } catch (error) {
        console.error('❌ Error cargando historial:', error);
        showNotification('Error al cargar el historial', 'error');
    } finally {
        showLoading(false);
    }
}

function displayHistoryTable(data) {
    const resultsDiv = document.getElementById('history-results');
    const nameDisplay = document.getElementById('student-name-display');
    const badge = document.getElementById('total-sessions-badge');
    const tableBody = document.getElementById('history-table-body');
    
    if (!data || !data.estudiante || !data.sesiones) {
        console.error('❌ Datos incompletos para mostrar historial');
        return;
    }
    
    if (nameDisplay) {
        nameDisplay.textContent = `${data.estudiante.nombres} ${data.estudiante.apellidos}`;
    }
    if (badge) {
        badge.textContent = `${data.sesiones.length} sesiones`;
    }
    
    if (!tableBody) {
        console.error('❌ Tabla de historial no encontrada');
        return;
    }
    
    tableBody.innerHTML = '';
    
    data.sesiones.forEach(sesion => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(sesion.fecha)}</td>
            <td>${sesion.semestre}</td>
            <td>${sesion.tipo}</td>
            <td>${sesion.tutor}</td>
            <td>${sesion.tema}</td>
            <td><span class="status-badge ${sesion.estado}">${sesion.estado}</span></td>
        `;
        tableBody.appendChild(row);
    });
    
    if (resultsDiv) {
        resultsDiv.classList.remove('hidden');
    }
}

async function exportHistoryPDF() {
    if (!currentHistoryData || currentHistoryData.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFontSize(18);
    doc.text('Historial Completo de Estudiante', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Estudiante: ${currentStudentData.nombres} ${currentStudentData.apellidos}`, 20, 35);
    doc.text(`Código: ${currentStudentData.codigo}`, 20, 42);
    doc.text(`Total de sesiones: ${currentHistoryData.length}`, 20, 49);
    
    // Tabla
    const tableData = currentHistoryData.map(sesion => [
        formatDate(sesion.fecha),
        sesion.semestre,
        sesion.tipo,
        sesion.tutor,
        sesion.tema,
        sesion.estado
    ]);
    
    doc.autoTable({
        startY: 60,
        head: [['Fecha', 'Semestre', 'Tipo', 'Tutor', 'Tema', 'Estado']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 9 }
    });
    
    const today = new Date().toLocaleDateString('es-PE');
    doc.setFontSize(9);
    doc.text(`Generado el: ${today}`, 20, doc.internal.pageSize.height - 10);
    
    doc.save(`Historial_${currentStudentData.codigo}.pdf`);
    showNotification('PDF exportado exitosamente', 'success');
}

// ===== SECCIÓN 3: CONSTANCIA DE TUTORÍA =====
async function searchStudentsConstancia() {
    const searchTerm = document.getElementById('student-constancia').value.trim();
    const suggestionsDiv = document.getElementById('student-constancia-suggestions');
    
    if (searchTerm.length < 3) {
        suggestionsDiv.classList.add('hidden');
        return;
    }
    
    try {
        const response = await apiGet(`/reportes?action=searchStudents&query=${encodeURIComponent(searchTerm)}`);
        
        if (response.success && response.data && response.data.length > 0) {
            displayConstanciaSuggestions(response.data, suggestionsDiv);
        } else {
            suggestionsDiv.innerHTML = '<div class="suggestion-item" style="text-align:center;color:#999;">No se encontraron estudiantes</div>';
            suggestionsDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('❌ Error buscando estudiantes:', error);
    }
}

function displayConstanciaSuggestions(students, container) {
    container.innerHTML = '';
    container.classList.remove('hidden');
    
    if (students.length === 0) {
        container.innerHTML = '<div class="suggestion-item" style="text-align:center;color:#999;">No se encontraron estudiantes</div>';
        return;
    }
    
    students.forEach(student => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <strong>${student.nombres} ${student.apellidos}</strong>
            <small>Código: ${student.codigo}</small>
        `;
        item.addEventListener('click', () => selectConstanciaStudent(student, container));
        container.appendChild(item);
    });
}

function selectConstanciaStudent(student, container) {
    if (!student) return;
    
    currentStudentData = student;
    const constanciaInput = document.getElementById('student-constancia');
    if (constanciaInput) {
        constanciaInput.value = `${student.codigo} - ${student.nombres} ${student.apellidos}`;
    }
    if (container) {
        container.classList.add('hidden');
    }
    console.log('✅ Estudiante seleccionado para constancia:', student);
}

async function generateConstanciaPDF() {
    const semesterId = document.getElementById('semester-constancia').value;
    
    if (!semesterId || !currentStudentData) {
        showNotification('Por favor seleccione semestre y estudiante', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await apiGet(`/reportes?action=getConstanciaData&semesterId=${semesterId}&studentId=${currentStudentData.id}`);
        
        if (response.success && response.data) {
            displayConstanciaInfo(response.data);
            generatePDFConstancia(response.data);
            showNotification('Constancia generada exitosamente', 'success');
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

function generatePDFConstancia(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Encabezado formal
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSTANCIA DE TUTORÍA', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const yStart = 60;
    const lineHeight = 10;
    
    doc.text('La Oficina de Tutorías de la Universidad Nacional de San Antonio Abad del Cusco', 20, yStart);
    doc.text('certifica que:', 20, yStart + lineHeight);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.estudiante.nombres} ${data.estudiante.apellidos}`, 105, yStart + lineHeight * 2.5, { align: 'center' });
    doc.text(`Código: ${data.estudiante.codigo}`, 105, yStart + lineHeight * 3.5, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Ha completado satisfactoriamente el plan de tutorías correspondiente al ${data.semestre},`, 20, yStart + lineHeight * 5);
    doc.text(`habiendo asistido a un total de ${data.sesionesCompletadas} sesiones de tutoría académica, personal y profesional.`, 20, yStart + lineHeight * 6);
    
    doc.text('Se expide la presente constancia a solicitud del interesado para los fines que estime conveniente.', 20, yStart + lineHeight * 8);
    
    const today = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Cusco, ${today}`, 105, yStart + lineHeight * 11, { align: 'center' });
    
    // Firma
    doc.line(70, yStart + lineHeight * 15, 140, yStart + lineHeight * 15);
    doc.text('Coordinador de Tutorías', 105, yStart + lineHeight * 15.5, { align: 'center' });
    
    doc.save(`Constancia_${data.estudiante.codigo}_${data.semestre.replace(/\s/g, '_')}.pdf`);
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
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2
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
                        text: 'Sesiones Registradas por Tutor'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
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
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
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

// ===== EXPONER FUNCIONES GLOBALES =====
window.initializeReports = initializeReports;

console.log('✅ reportes.js cargado correctamente');
