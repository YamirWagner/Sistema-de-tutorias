/**
 * ============================================================
 * MÓDULO DE HISTORIAL DE SESIONES - ESTUDIANTE
 * Sistema de Tutorías UNSAAC
 * ============================================================
 * 
 * Módulo independiente para visualizar el historial completo
 * de sesiones del estudiante con filtros y ordenamiento.
 */

(function() {
    'use strict';

    // Variables globales del módulo
    let todasLasSesiones = [];
    let estadisticas = {};

    /**
     * Cargar contenido del módulo
     */
    async function loadHistorialEstudianteContent() {
        const content = document.getElementById('dashboardContent');
        if (!content) return;
        
        try {
            content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando historial...</p></div>';
            
            // Cargar CSS
            const cssPath = '/Sistema-de-tutorias/frontend/css/estudiante/historial-estudiante.css';
            if (!document.querySelector(`link[href="${cssPath}"]`)) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = cssPath;
                document.head.appendChild(cssLink);
            }
            
            // Cargar HTML
            const url = '/Sistema-de-tutorias/frontend/components/estudiante/historial-estudiante.html';
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
            
            const htmlText = await response.text();
            content.innerHTML = htmlText;
            
            // Inicializar módulo
            await initializeHistorial();
            
            console.log('✅ Módulo de historial cargado');
        } catch (error) {
            console.error('❌ Error al cargar módulo:', error);
            content.innerHTML = '<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">Error al cargar el módulo</div>';
        }
    }

    /**
     * Inicializar funcionalidad del módulo
     */
    async function initializeHistorial() {
        // Configurar event listeners de filtros
        setupFilterListeners();
        
        // Cargar datos iniciales
        await cargarHistorial();
    }

    /**
     * Configurar listeners de filtros
     */
    function setupFilterListeners() {
        const btnFiltrar = document.getElementById('btnFiltrar');
        const btnLimpiar = document.getElementById('btnLimpiarFiltros');
        const btnExportar = document.getElementById('btnExportar');
        
        if (btnFiltrar) {
            btnFiltrar.addEventListener('click', aplicarFiltros);
        }
        
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', limpiarFiltros);
        }
        
        if (btnExportar) {
            btnExportar.addEventListener('click', exportarHistorial);
        }
    }

    /**
     * Cargar historial desde el backend
     */
    async function cargarHistorial(filtros = {}) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Sesión expirada');
                const basePath = (window.APP_BASE_PATH || '').replace(/\/$/, '');
                window.location.href = (basePath || '') + '/login';
                return;
            }

            // Construir URL con parámetros de filtro
            const params = new URLSearchParams();
            if (filtros.estado) params.append('estado', filtros.estado);
            if (filtros.tipo) params.append('tipo', filtros.tipo);
            if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
            if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
            if (filtros.orden) params.append('orden', filtros.orden);
            
            const basePath = (window.APP_BASE_PATH || '').replace(/\/$/, '');
            const url = `${basePath}/backend/api/historiaestudiante.php?${params.toString()}`;
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al cargar historial');

            const data = await response.json();
            
            if (data.success) {
                todasLasSesiones = data.data.sesiones || [];
                estadisticas = data.data.estadisticas || {};
                
                mostrarEstadisticas();
                mostrarTabla(todasLasSesiones);
            } else {
                throw new Error(data.message || 'Error al cargar datos');
            }

        } catch (error) {
            console.error('❌ Error al cargar historial:', error);
            alert('Error al cargar el historial. Por favor, intenta nuevamente.');
        }
    }

    /**
     * Mostrar estadísticas
     */
    function mostrarEstadisticas() {
        const total = document.getElementById('statTotal');
        const completadas = document.getElementById('statCompletadas');
        const pendientes = document.getElementById('statPendientes');
        const canceladas = document.getElementById('statCanceladas');
        
        if (total) total.textContent = estadisticas.total || 0;
        if (completadas) completadas.textContent = estadisticas.completadas || 0;
        if (pendientes) pendientes.textContent = estadisticas.pendientes || 0;
        if (canceladas) canceladas.textContent = estadisticas.canceladas || 0;
    }

    /**
     * Mostrar tabla de sesiones
     */
    function mostrarTabla(sesiones) {
        const tbody = document.getElementById('historialTableBody');
        const noData = document.getElementById('noDataMessage');
        
        if (!tbody) return;

        if (sesiones.length === 0) {
            tbody.innerHTML = '';
            if (noData) noData.style.display = 'table-row';
            return;
        }

        if (noData) noData.style.display = 'none';

        tbody.innerHTML = sesiones.map(sesion => {
            const fecha = new Date(sesion.fecha);
            const fechaStr = fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            
            const horaInicio = sesion.horaInicio ? sesion.horaInicio.substring(0, 5) : '-';
            const horaFin = sesion.horaFin ? sesion.horaFin.substring(0, 5) : '-';
            const horario = `${horaInicio} - ${horaFin}`;
            
            // Determinar clase de estado
            let estadoClass = '';
            let estadoTexto = sesion.estado;
            
            if (sesion.estado === 'Realizada') {
                estadoClass = 'badge-success';
                estadoTexto = 'Completada';
            } else if (sesion.estado === 'Pendiente' || sesion.estado === 'Programada') {
                estadoClass = 'badge-warning';
                estadoTexto = 'Pendiente';
            } else if (sesion.estado === 'Cancelada') {
                estadoClass = 'badge-danger';
                estadoTexto = 'Cancelada';
            }
            
            // Modalidad
            const modalidadIcon = sesion.modalidad === 'Virtual' 
                ? '<i class="fa-solid fa-video"></i>' 
                : '<i class="fa-solid fa-building"></i>';
            
            return `
                <tr>
                    <td>
                        <strong>${fechaStr}</strong><br>
                        <small style="color:#999;">${horario}</small>
                    </td>
                    <td>
                        <strong>${sesion.tutorNombre}</strong><br>
                        <small style="color:#999;">${sesion.tutorEspecialidad || '-'}</small>
                    </td>
                    <td>
                        <span class="badge badge-tipo-${sesion.tipo.toLowerCase()}">${sesion.tipo}</span>
                    </td>
                    <td>
                        ${modalidadIcon} ${sesion.modalidad}
                        ${sesion.ambiente ? `<br><small style="color:#999;">${sesion.ambiente}</small>` : ''}
                    </td>
                    <td>
                        <span class="badge ${estadoClass}">${estadoTexto}</span>
                    </td>
                    <td class="text-center">
                        <button class="btn-icon btn-view" onclick="window.verDetallesSesion(${sesion.id})" title="Ver detalles">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Aplicar filtros
     */
    async function aplicarFiltros() {
        const filtros = {
            estado: document.getElementById('filtroEstado')?.value || 'todos',
            tipo: document.getElementById('filtroTipo')?.value || 'todos',
            fechaInicio: document.getElementById('filtroFechaInicio')?.value || null,
            fechaFin: document.getElementById('filtroFechaFin')?.value || null,
            orden: 'DESC'
        };
        
        await cargarHistorial(filtros);
    }

    /**
     * Limpiar filtros
     */
    async function limpiarFiltros() {
        const filtroEstado = document.getElementById('filtroEstado');
        const filtroTipo = document.getElementById('filtroTipo');
        const filtroFechaInicio = document.getElementById('filtroFechaInicio');
        const filtroFechaFin = document.getElementById('filtroFechaFin');
        
        if (filtroEstado) filtroEstado.value = 'todos';
        if (filtroTipo) filtroTipo.value = 'todos';
        if (filtroFechaInicio) filtroFechaInicio.value = '';
        if (filtroFechaFin) filtroFechaFin.value = '';
        
        await cargarHistorial();
    }

    /**
     * Exportar historial a CSV
     */
    function exportarHistorial() {
        if (todasLasSesiones.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        const csv = [
            ['Fecha', 'Hora Inicio', 'Hora Fin', 'Tutor', 'Tipo', 'Modalidad', 'Estado'],
            ...todasLasSesiones.map(s => [
                s.fecha,
                s.horaInicio || '-',
                s.horaFin || '-',
                s.tutorNombre,
                s.tipo,
                s.modalidad,
                s.estado
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historial_sesiones_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    /**
     * Ver detalles de sesión (modal)
     */
    window.verDetallesSesion = function(sesionId) {
        const sesion = todasLasSesiones.find(s => s.id === sesionId);
        if (!sesion) return;

        // Fecha
        const fecha = new Date(sesion.fecha);
        const fechaStr = fecha.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById('detalleFecha').textContent = fechaStr;

        // Horario
        const horaInicio = sesion.horaInicio ? sesion.horaInicio.substring(0, 5) : '-';
        const horaFin = sesion.horaFin ? sesion.horaFin.substring(0, 5) : '-';
        document.getElementById('detalleHorario').textContent = `${horaInicio} - ${horaFin}`;

        // Tipo con badge
        const tipoHtml = `<span class="badge badge-tipo-${sesion.tipo.toLowerCase()}">${sesion.tipo}</span>`;
        document.getElementById('detalleTipo').innerHTML = tipoHtml;

        // Modalidad con icono
        const modalidadIcon = sesion.modalidad === 'Virtual' 
            ? '<i class="fa-solid fa-video"></i>' 
            : '<i class="fa-solid fa-building"></i>';
        document.getElementById('detalleModalidad').innerHTML = `${modalidadIcon} ${sesion.modalidad}`;

        // Estado con badge
        let estadoClass = '';
        let estadoTexto = sesion.estado;
        if (sesion.estado === 'Realizada') {
            estadoClass = 'badge-success';
            estadoTexto = 'Completada';
        } else if (sesion.estado === 'Pendiente' || sesion.estado === 'Programada') {
            estadoClass = 'badge-warning';
            estadoTexto = 'Pendiente';
        } else if (sesion.estado === 'Cancelada') {
            estadoClass = 'badge-danger';
            estadoTexto = 'Cancelada';
        }
        const estadoHtml = `<span class="badge ${estadoClass}">${estadoTexto}</span>`;
        document.getElementById('detalleEstado').innerHTML = estadoHtml;

        // Tutor
        document.getElementById('detalleTutorNombre').textContent = sesion.tutorNombre;
        document.getElementById('detalleTutorEspecialidad').textContent = sesion.tutorEspecialidad || '-';

        // Ambiente (solo si es presencial)
        const seccionAmbiente = document.getElementById('seccionAmbiente');
        if (sesion.modalidad !== 'Virtual' && sesion.ambiente) {
            seccionAmbiente.style.display = 'block';
            document.getElementById('detalleAmbiente').textContent = sesion.ambiente;
        } else {
            seccionAmbiente.style.display = 'none';
        }

        // Observaciones
        const observaciones = sesion.observaciones;
        const observacionesContainer = document.getElementById('detalleObservaciones');
        
        if (!observaciones || observaciones === 'null' || observaciones.trim() === '') {
            observacionesContainer.innerHTML = '<p class="text-muted">Sin observaciones registradas</p>';
        } else {
            // Intentar parsear si es JSON
            try {
                const obsJSON = JSON.parse(observaciones);
                let contenido = '';
                
                // Mapeo de campos conocidos a etiquetas legibles
                const fieldLabels = {
                    'temaProfesional': 'Tema Profesional',
                    'notasAdicionales': 'Notas Adicionales',
                    'observacionesProfesionales': 'Observaciones Profesionales',
                    'tema': 'Tema',
                    'observaciones': 'Observaciones',
                    'descripcionTema': 'Descripción',
                    'avancesLogros': 'Avances y Logros',
                    'recursosUtilizados': 'Recursos Utilizados',
                    'recomendaciones': 'Recomendaciones'
                };
                
                // Iterar sobre todas las propiedades del JSON
                for (const [key, value] of Object.entries(obsJSON)) {
                    if (value && value !== '' && value !== 'null' && key !== 'idTutoria' && key !== 'tipo') {
                        const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').trim();
                        const labelCapitalized = label.charAt(0).toUpperCase() + label.slice(1);
                        contenido += `<div class="obs-item"><strong>${labelCapitalized}:</strong> <span>${value}</span></div>`;
                    }
                }
                
                observacionesContainer.innerHTML = contenido || '<p class="text-muted">Sin observaciones</p>';
            } catch {
                // Si no es JSON, mostrar como texto plano
                observacionesContainer.innerHTML = `<div class="obs-item">${observaciones}</div>`;
            }
        }

        // Archivos adjuntos - mostrar materiales de la BD
        const seccionArchivos = document.getElementById('seccionArchivos');
        const archivosContainer = document.getElementById('detalleArchivos');
        
        if (sesion.materiales && sesion.materiales.length > 0) {
            seccionArchivos.style.display = 'block';
            
            // Mapeo de iconos por tipo de material
            const iconosPorTipo = {
                'PDF': 'fa-file-pdf',
                'Video': 'fa-video',
                'Documento': 'fa-file-word',
                'Enlace': 'fa-link',
                'Otro': 'fa-file'
            };
            
            // Colores por tipo
            const coloresPorTipo = {
                'PDF': '#ef4444',
                'Video': '#8b5cf6',
                'Documento': '#3b82f6',
                'Enlace': '#10b981',
                'Otro': '#6b7280'
            };
            
            let materialesHtml = '<div class="materiales-list">';
            
            sesion.materiales.forEach(material => {
                const icono = iconosPorTipo[material.tipo] || 'fa-file';
                const color = coloresPorTipo[material.tipo] || '#6b7280';
                
                materialesHtml += `
                    <div class="material-item">
                        <div class="material-icon" style="background-color: ${color};">
                            <i class="fa-solid ${icono}"></i>
                        </div>
                        <div class="material-info">
                            <strong>${material.titulo}</strong>
                            ${material.descripcion ? `<p>${material.descripcion}</p>` : ''}
                            <span class="material-tipo">${material.tipo}</span>
                        </div>
                        <a href="${material.enlace}" target="_blank" class="material-download" title="Abrir material">
                            <i class="fa-solid fa-external-link-alt"></i>
                        </a>
                    </div>
                `;
            });
            
            materialesHtml += '</div>';
            archivosContainer.innerHTML = materialesHtml;
        } else {
            seccionArchivos.style.display = 'none';
        }

        // Mostrar modal
        document.getElementById('modalDetallesSesion').style.display = 'flex';
    };

    /**
     * Cerrar modal de detalles
     */
    window.cerrarModalDetalles = function() {
        document.getElementById('modalDetallesSesion').style.display = 'none';
    };

    /**
     * Imprimir detalles de la sesión
     */
    window.imprimirDetalles = function() {
        const modalBody = document.querySelector('#modalDetallesSesion .modal-body');
        const modalHeader = document.querySelector('#modalDetallesSesion .modal-header h3');
        
        // Crear una ventana de impresión con estilos
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Detalles de Sesión - Sistema de Tutorías UNSAAC</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 30px;
                        color: #333;
                    }
                    .header { 
                        text-align: center; 
                        border-bottom: 3px solid #a42727; 
                        padding-bottom: 20px; 
                        margin-bottom: 30px;
                    }
                    .header h1 { color: #a42727; font-size: 24px; margin-bottom: 10px; }
                    .header h2 { color: #666; font-size: 18px; font-weight: normal; }
                    .detalles-grid { display: block; }
                    .detalle-section { 
                        margin-bottom: 25px; 
                        border-left: 4px solid #a42727; 
                        padding-left: 15px;
                    }
                    .detalle-section h4 { 
                        color: #a42727; 
                        font-size: 16px; 
                        margin-bottom: 15px;
                        text-transform: uppercase;
                    }
                    .detalle-item { 
                        margin: 10px 0; 
                        display: flex;
                        line-height: 1.6;
                    }
                    .detalle-label { 
                        font-weight: bold; 
                        min-width: 130px;
                        color: #666;
                    }
                    .detalle-value { color: #333; }
                    .detalle-observaciones { 
                        background: #f9f9f9; 
                        padding: 15px; 
                        border-radius: 5px;
                        margin-top: 10px;
                    }
                    .obs-item { 
                        margin: 12px 0; 
                        padding-bottom: 12px;
                        border-bottom: 1px solid #e0e0e0;
                    }
                    .obs-item:last-child { border-bottom: none; }
                    .obs-item strong { 
                        display: block; 
                        color: #a42727; 
                        font-size: 11px;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                    }
                    .obs-item span { display: block; color: #444; }
                    .badge { 
                        padding: 4px 10px; 
                        border-radius: 12px; 
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                    }
                    .badge-success { background: #d1fae5; color: #065f46; }
                    .badge-warning { background: #fef3c7; color: #92400e; }
                    .badge-danger { background: #fee2e2; color: #991b1b; }
                    .tutor-info-detalle { margin: 10px 0; }
                    @media print {
                        body { padding: 20px; }
                        .no-print { display: none; }
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 2px solid #e0e0e0;
                        text-align: center;
                        color: #999;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Sistema de Tutorías - UNSAAC</h1>
                    <h2>${modalHeader ? modalHeader.textContent : 'Detalles de la Sesión'}</h2>
                </div>
                ${modalBody ? modalBody.innerHTML : ''}
                <div class="footer">
                    <p>Generado el ${new Date().toLocaleDateString('es-PE', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                    <p>Universidad Nacional de San Antonio Abad del Cusco</p>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Esperar a que cargue e imprimir
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    };

    // Cerrar modal al hacer clic fuera
    document.addEventListener('click', function(event) {
        const modal = document.getElementById('modalDetallesSesion');
        if (modal && event.target === modal) {
            cerrarModalDetalles();
        }
    });

    // Exportar función principal
    window.loadHistorialEstudianteContent = loadHistorialEstudianteContent;

})();
