// ============================================
// FUNCIÓN DE CARGA DEL MÓDULO
// ============================================

/**
 * Cargar el contenido del módulo de auditoría
 */
async function loadAuditoriaContent() {
    console.log('🔍 loadAuditoriaContent() ejecutándose...');
    
    const content = document.getElementById('dashboardContent');
    if (!content) {
        console.error('❌ dashboardContent no encontrado');
        return;
    }
    
    try {
        content.innerHTML = '<div class="loading-message"><i class="fa-solid fa-spinner fa-spin"></i><p>Cargando módulo de auditoría...</p></div>';
        
        // Cargar CSS si no existe
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const cssPath = `${basePath}/frontend/css/administrador/auditoria.css`;
        
        if (!document.querySelector(`link[href*="auditoria.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
            console.log('✅ CSS de auditoría cargado:', cssPath);
        }
        
        // Cargar HTML
        const url = `${basePath}/frontend/components/administrador/auditoria.html`;
        console.log('📄 Cargando HTML desde:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error al cargar auditoría: ${response.status}`);
        }
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        console.log('✅ HTML de auditoría cargado');
        
        // Esperar procesamiento del DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Inicializar el módulo
        console.log('🎯 Inicializando módulo de auditoría...');
        inicializarAuditoria();
        
        console.log('✅ Módulo de auditoría cargado correctamente');
        
    } catch (error) {
        console.error('❌ Error al cargar módulo de auditoría:', error);
        content.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 2rem; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.2rem; font-weight: 600;">Error al cargar el módulo de auditoría</p>
                <small style="color: #7f8c8d;">${error.message}</small>
            </div>
        `;
    }
}

// Exponer función globalmente
window.loadAuditoriaContent = loadAuditoriaContent;

// ============================================
// LÓGICA DEL MÓDULO
// ============================================

let registrosActuales = [];

function inicializarAuditoria() {
    console.log('🎨 Inicializando módulo de auditoría...');
    
    const btnFiltrar = document.getElementById('btnFiltrar');
    
    if (!btnFiltrar) {
        console.error('❌ Elementos de auditoría no encontrados');
        return;
    }
    
    console.log('✅ Elementos encontrados, configurando...');
    
    // Cargar estadísticas iniciales
    cargarEstadisticas();
    
    // Event listener para el botón de filtrar
    btnFiltrar.addEventListener('click', function() {
        cargarRegistros();
    });
    
    // Enter en los inputs para filtrar
    const inputs = ['filtroUsuario', 'filtroAccion', 'filtroDesde', 'filtroHasta'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    cargarRegistros();
                }
            });
        }
    });
    
    console.log('✅ Módulo de auditoría inicializado');
}

async function cargarEstadisticas() {
    try {
        const apiUrl = window.APP_CONFIG?.API.BASE_URL || '/Sistema-de-tutorias/backend/api';
        const response = await fetch(`${apiUrl}/auditoria?action=estadisticas`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            document.getElementById('statAccionesTotales').textContent = stats.accionesTotales || 0;
            document.getElementById('statAccionesHoy').textContent = stats.accionesHoy || 0;
            document.getElementById('statUsuariosActivos').textContent = stats.usuariosActivos || 0;
            document.getElementById('statAsignaciones').textContent = stats.asignaciones || 0;
            
            console.log('✅ Estadísticas cargadas');
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

async function cargarRegistros() {
    const tbody = document.getElementById('tablaAuditoriaBody');
    const loadingDiv = document.getElementById('loadingAuditoria');
    
    // Obtener filtros
    const usuario = document.getElementById('filtroUsuario').value.trim();
    const accion = document.getElementById('filtroAccion').value.trim();
    const desde = document.getElementById('filtroDesde').value;
    const hasta = document.getElementById('filtroHasta').value;
    
    // Mostrar loading
    loadingDiv.style.display = 'block';
    tbody.innerHTML = '';
    
    try {
        const apiUrl = window.APP_CONFIG?.API.BASE_URL || '/Sistema-de-tutorias/backend/api';
        let url = `${apiUrl}/auditoria?action=registros`;
        
        const params = new URLSearchParams();
        if (usuario) params.append('usuario', usuario);
        if (accion) params.append('accion', accion);
        if (desde) params.append('desde', desde + ' 00:00:00');
        if (hasta) params.append('hasta', hasta + ' 23:59:59');
        
        if (params.toString()) {
            url += '&' + params.toString();
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            registrosActuales = data.data;
            renderizarRegistros(data.data);
        } else {
            throw new Error(data.message || 'Error al cargar registros');
        }
    } catch (error) {
        console.error('Error al cargar registros:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar los registros: ${error.message}</p>
                </td>
            </tr>
        `;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function renderizarRegistros(registros) {
    const tbody = document.getElementById('tablaAuditoriaBody');
    
    if (registros.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron registros con los filtros aplicados</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    registros.forEach(registro => {
        const fechaFormateada = formatearFechaHora(registro.fechaHora);
        
        html += `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${registro.usuario}</td>
                <td>${registro.rol}</td>
                <td>${registro.accion}</td>
                <td>
                    <a href="#" class="btn-ver-mas" onclick="mostrarDetalle(${registro.id}); return false;">Ver más...</a>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function formatearFechaHora(fechaHora) {
    if (!fechaHora) return 'N/A';
    
    const fecha = new Date(fechaHora);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    const hora = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    
    return `${dia}/${mes}/${año} ${hora}:${minutos}`;
}

function mostrarDetalle(idLog) {
    const registro = registrosActuales.find(r => r.id === idLog);
    
    if (!registro) {
        console.error('Registro no encontrado');
        return;
    }
    
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'modal-detalle';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Detalle del Registro</h3>
                <button class="btn-cerrar" onclick="cerrarModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="detalle-item">
                    <div class="detalle-label">Fecha y Hora</div>
                    <div class="detalle-valor">${formatearFechaHora(registro.fechaHora)}</div>
                </div>
                <div class="detalle-item">
                    <div class="detalle-label">Usuario</div>
                    <div class="detalle-valor">${registro.usuario}</div>
                </div>
                <div class="detalle-item">
                    <div class="detalle-label">Rol</div>
                    <div class="detalle-valor">${registro.rol}</div>
                </div>
                <div class="detalle-item">
                    <div class="detalle-label">Acción</div>
                    <div class="detalle-valor">${registro.accion}</div>
                </div>
                <div class="detalle-item">
                    <div class="detalle-label">Descripción</div>
                    <div class="detalle-valor">${registro.descripcion || 'Sin descripción'}</div>
                </div>
                <div class="detalle-item">
                    <div class="detalle-label">IP de Origen</div>
                    <div class="detalle-valor">${registro.ipOrigen || 'N/A'}</div>
                </div>
                <div class="detalle-item">
                    <div class="detalle-label">Estado de Sesión</div>
                    <div class="detalle-valor">${registro.estadoSesion || 'N/A'}</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar al hacer click fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModal();
        }
    });
}

function cerrarModal() {
    const modal = document.querySelector('.modal-detalle');
    if (modal) {
        modal.remove();
    }
}

// Exponer funciones globalmente
window.mostrarDetalle = mostrarDetalle;
window.cerrarModal = cerrarModal;
