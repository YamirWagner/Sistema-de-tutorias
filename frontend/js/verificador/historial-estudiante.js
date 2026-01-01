// ============================================
// HISTORIAL POR ESTUDIANTE - Verificador
// ============================================

(function() {
    'use strict';

    let currentStudentData = null;

    // Cargar contenido de historial por estudiante
    window.loadHistorialEstudianteVerificadorContent = async function() {
        console.log('📚 Cargando módulo de historial por estudiante...');
        
        const content = document.getElementById('dashboardContent');
        if (!content) {
            console.error('❌ No se encontró el contenedor dashboardContent');
            return;
        }
        
        try {
            // Cargar el HTML del módulo
            const basePath = (window.APP_BASE_PATH || '').replace(/\/+$/, '');
            const response = await fetch(`${basePath}/frontend/components/verificador/historial-estudiante.html`);
            const html = await response.text();
            content.innerHTML = html;
            
            // Configurar event listeners
            setupHistorialEstudianteListeners();
            
            console.log('✅ Módulo de historial por estudiante cargado correctamente');
        } catch (error) {
            console.error('❌ Error al cargar módulo:', error);
            content.innerHTML = `
                <div class="error-message">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>Error al cargar el módulo de historial por estudiante</p>
                </div>
            `;
        }
    };

    console.log('✅ loadHistorialEstudianteVerificadorContent exportada INMEDIATAMENTE:', typeof window.loadHistorialEstudianteVerificadorContent);

    // Configurar listeners
    function setupHistorialEstudianteListeners() {
        // Enter en inputs de búsqueda
        const codigoInput = document.getElementById('codigoEstudiante');
        const nombreInput = document.getElementById('nombreEstudiante');
    
    if (codigoInput) {
        codigoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarEstudianteVerificador();
        });
    }
    
    if (nombreInput) {
        nombreInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarEstudianteVerificador();
        });
    }
    
    // Filtros
    const filterSemestre = document.getElementById('filterSemestre');
    const filterEstado = document.getElementById('filterEstado');
    
    if (filterSemestre) {
        filterSemestre.addEventListener('change', aplicarFiltrosVerificador);
    }
    
    if (filterEstado) {
        filterEstado.addEventListener('change', aplicarFiltrosVerificador);
    }
}

// Buscar estudiante
async function buscarEstudianteVerificador() {
    const codigo = document.getElementById('codigoEstudiante').value.trim();
    const nombre = document.getElementById('nombreEstudiante').value.trim();
    
    if (!codigo && !nombre) {
        showNotification('Por favor ingrese un código o nombre para buscar', 'warning');
        return;
    }
    
    console.log('🔍 Buscando estudiante:', { codigo, nombre });
    
    try {
        const params = new URLSearchParams();
        params.append('action', 'buscar');
        if (codigo) params.append('codigo', codigo);
        if (nombre) params.append('nombre', nombre);
        
        const response = await apiGet(`/historialEstudiante?${params.toString()}`);
        
        if (response.success && response.data) {
            currentStudentData = response.data;
            mostrarInformacionEstudiante(response.data);
            await cargarHistorialTutorias(response.data.id);
        } else {
            showNotification('No se encontró el estudiante', 'error');
        }
    } catch (error) {
        console.error('❌ Error al buscar estudiante:', error);
        showNotification('Error al buscar el estudiante', 'error');
    }
}

// Mostrar información del estudiante
function mostrarInformacionEstudiante(data) {
    document.getElementById('studentName').textContent = data.nombre || '-';
    document.getElementById('studentCode').textContent = data.codigo || '-';
    document.getElementById('studentEmail').textContent = data.correo || '-';
    document.getElementById('studentCareer').textContent = data.carrera || '-';
    document.getElementById('totalTutorias').textContent = data.total_tutorias || 0;
    document.getElementById('asistencias').textContent = data.asistencias || 0;
    document.getElementById('faltas').textContent = data.faltas || 0;
    
    document.getElementById('studentInfo').style.display = 'block';
    document.getElementById('tutoriasHistory').style.display = 'block';
}

// Cargar historial de tutorías
async function cargarHistorialTutorias(estudianteId) {
    console.log('📋 Cargando historial de tutorías para estudiante:', estudianteId);
    
    try {
        const response = await apiGet(`/historialEstudiante?action=historial&estudiante_id=${estudianteId}`);
        
        if (response.success && response.data) {
            renderTutoriasTable(response.data.tutorias || []);
            cargarSemestres(response.data.semestres || []);
        } else {
            renderTutoriasTable([]);
        }
    } catch (error) {
        console.error('❌ Error al cargar historial:', error);
        renderTutoriasTable([]);
    }
}

// Renderizar tabla de tutorías
function renderTutoriasTable(tutorias) {
    const tbody = document.getElementById('tutoriasTableBody');
    if (!tbody) return;
    
    if (tutorias.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-row">
                    No hay tutorías registradas para este estudiante
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = tutorias.map(tutoria => {
        const estadoClass = tutoria.estado === 'asistio' ? 'status-asistio' : 
                           tutoria.estado === 'no_asistio' ? 'status-no-asistio' : 
                           'status-pendiente';
        
        const estadoTexto = tutoria.estado === 'asistio' ? 'Asistió' : 
                           tutoria.estado === 'no_asistio' ? 'No Asistió' : 
                           'Pendiente';
        
        return `
            <tr>
                <td>${tutoria.fecha || '-'}</td>
                <td>${tutoria.tutor || '-'}</td>
                <td>${tutoria.tema || '-'}</td>
                <td>${tutoria.duracion || '-'}</td>
                <td>
                    <span class="status-badge ${estadoClass}">
                        ${estadoTexto}
                    </span>
                </td>
                <td>${tutoria.observaciones || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Cargar semestres en select
function cargarSemestres(semestres) {
    const select = document.getElementById('filterSemestre');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todos los semestres</option>' +
        semestres.map(sem => `<option value="${sem.id}">${sem.nombre}</option>`).join('');
}

// Aplicar filtros
function aplicarFiltrosVerificador() {
    const semestreId = document.getElementById('filterSemestre').value;
    const estado = document.getElementById('filterEstado').value;
    
    console.log('🔍 Aplicando filtros:', { semestreId, estado });
    
    if (!currentStudentData) return;
    
    // Recargar con filtros
    const params = new URLSearchParams({
        estudiante_id: currentStudentData.id
    });
    
    if (semestreId) params.append('semestre_id', semestreId);
    if (estado) params.append('estado', estado);
    
    apiGet(`/historialEstudiante?action=historial&${params.toString()}`)
        .then(response => {
            if (response.success && response.data) {
                renderTutoriasTable(response.data.tutorias || []);
            }
        })
        .catch(error => console.error('Error al aplicar filtros:', error));
    }

    // Exponer funciones globales adicionales
    window.buscarEstudianteVerificador = buscarEstudianteVerificador;
    window.aplicarFiltrosVerificador = aplicarFiltrosVerificador;

})(); // Fin IIFE
