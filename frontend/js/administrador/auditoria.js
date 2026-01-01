// ============================================
// FUNCIÓN DE CARGA DEL MÓDULO (Para navegación dinámica)
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
        const basePath = (window.APP_BASE_PATH || '').replace(/\/+$/, '');
        const cssPath = `${basePath}/frontend/css/administrador/auditoria.css`;
        
        if (!document.querySelector(`link[href*="auditoria.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
            console.log('✅ CSS de auditoría cargado:', cssPath);
        }
        
        // Cargar HTML
        const url = window.PATH?.adminAuditoria() || `${basePath}/frontend/components/administrador/auditoria.html`;
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

// Estado global
let currentOffset = 0;
let currentLimit = 50;
let isLoading = false;
let hasMoreData = true;

// Inicializar cuando el DOM esté listo (solo si ya estamos en la vista de auditoría)
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si el contenedor de auditoría ya está presente
    const auditoriaContainer = document.querySelector('.auditoria-container');
    if (auditoriaContainer) {
        inicializarAuditoria();
    }
});

function inicializarAuditoria() {
    console.log('🎨 Inicializando módulo de auditoría...');
    
    const btnBuscar = document.getElementById('btnBuscarAuditoria');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    const inputUsuario = document.getElementById('filtroUsuario');
    const inputAccion = document.getElementById('filtroAccion');
    
    if (!btnBuscar) {
        console.error('❌ Elementos del módulo de auditoría no encontrados');
        return;
    }
    
    console.log('✅ Elementos encontrados, configurando eventos...');
    
    // Event listeners
    btnBuscar.addEventListener('click', () => {
        currentOffset = 0;
        hasMoreData = true;
        cargarRegistrosAuditoria();
    });
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }
    
    // Enter en los inputs de filtro
    if (inputUsuario) {
        inputUsuario.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentOffset = 0;
                hasMoreData = true;
                cargarRegistrosAuditoria();
            }
        });
    }
    
    if (inputAccion) {
        inputAccion.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentOffset = 0;
                hasMoreData = true;
                cargarRegistrosAuditoria();
            }
        });
    }
    
    // Cargar datos iniciales
    cargarEstadisticas();
    cargarRegistrosAuditoria();
    
    console.log('✅ Módulo de auditoría inicializado');
}

/**
 * Cargar estadísticas de auditoría
 */
async function cargarEstadisticas() {
    try {
        const API_URL = window.API_URL || ((window.APP_BASE_PATH || '').replace(/\/+$/, '') + '/api');
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/auditoria?action=estadisticas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            document.getElementById('totalAcciones').textContent = stats.accionesTotales || '0';
            document.getElementById('accionesHoy').textContent = stats.accionesHoy || '0';
            document.getElementById('usuariosActivos').textContent = stats.usuariosActivos || '0';
            document.getElementById('asignacionesActivas').textContent = stats.asignaciones || '0';
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

/**
 * Cargar registros de auditoría con filtros
 */
async function cargarRegistrosAuditoria() {
    if (isLoading || !hasMoreData) return;
    
    isLoading = true;
    const btnBuscar = document.getElementById('btnBuscarAuditoria');
    if (btnBuscar) {
        btnBuscar.disabled = true;
        btnBuscar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
    }
    
    try {
        const API_URL = window.API_URL || ((window.APP_BASE_PATH || '').replace(/\/+$/, '') + '/api');
        const token = localStorage.getItem('token');
        
        // Obtener filtros
        const usuario = document.getElementById('filtroUsuario')?.value || '';
        const accion = document.getElementById('filtroAccion')?.value || '';
        const desde = document.getElementById('filtroDesde')?.value || '';
        const hasta = document.getElementById('filtroHasta')?.value || '';
        
        // Construir URL con parámetros
        const params = new URLSearchParams({
            action: 'registros',
            limit: currentLimit,
            offset: currentOffset
        });
        
        if (usuario) params.append('usuario', usuario);
        if (accion) params.append('accion', accion);
        if (desde) params.append('desde', desde);
        if (hasta) params.append('hasta', hasta);
        
        const response = await fetch(`${API_URL}/auditoria?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const registros = data.data;
            
            // Si es la primera carga, limpiar la tabla
            if (currentOffset === 0) {
                const tbody = document.getElementById('auditoriaTableBody');
                if (tbody) tbody.innerHTML = '';
            }
            
            if (registros.length > 0) {
                mostrarRegistros(registros);
                currentOffset += registros.length;
                
                // Si recibimos menos registros que el límite, no hay más datos
                if (registros.length < currentLimit) {
                    hasMoreData = false;
                }
            } else {
                if (currentOffset === 0) {
                    mostrarMensajeVacio();
                }
                hasMoreData = false;
            }
        } else {
            throw new Error(data.message || 'Error al cargar registros');
        }
    } catch (error) {
        console.error('Error al cargar registros de auditoría:', error);
        mostrarError('Error al cargar los registros de auditoría');
    } finally {
        isLoading = false;
        if (btnBuscar) {
            btnBuscar.disabled = false;
            btnBuscar.innerHTML = '<i class="fas fa-search"></i> Buscar';
        }
    }
}

/**
 * Mostrar registros en la tabla
 */
function mostrarRegistros(registros) {
    const tbody = document.getElementById('auditoriaTableBody');
    if (!tbody) return;
    
    registros.forEach(registro => {
        const tr = document.createElement('tr');
        
        // Formatear fecha
        const fecha = new Date(registro.fechaHora);
        const fechaFormateada = fecha.toLocaleString('es-PE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Badge de estado de sesión
        let estadoBadge = '';
        if (registro.estadoSesion) {
            const estadoClass = registro.estadoSesion.toLowerCase() === 'activa' ? 'success' : 
                              registro.estadoSesion.toLowerCase() === 'cerrada' ? 'secondary' : 'warning';
            estadoBadge = `<span class="badge badge-${estadoClass}">${registro.estadoSesion}</span>`;
        }
        
        // Badge de rol
        let rolBadge = '';
        if (registro.rol && registro.rol !== 'N/A') {
            const rolClass = registro.rol.toLowerCase() === 'administrador' ? 'primary' : 
                           registro.rol.toLowerCase() === 'tutor' ? 'info' : 
                           registro.rol.toLowerCase() === 'verificador' ? 'warning' : 'secondary';
            rolBadge = `<span class="badge badge-${rolClass}">${registro.rol}</span>`;
        }
        
        tr.innerHTML = `
            <td>${fechaFormateada}</td>
            <td>
                ${registro.usuario}
                ${rolBadge}
            </td>
            <td><span class="accion-text">${registro.accion || 'N/A'}</span></td>
            <td class="descripcion-cell">${registro.descripcion || '-'}</td>
            <td><code class="ip-text">${registro.ipOrigen || '-'}</code></td>
            <td>${estadoBadge}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Actualizar contador
    const totalMostrados = tbody.querySelectorAll('tr').length;
    const contadorElement = document.getElementById('contadorRegistros');
    if (contadorElement) {
        contadorElement.textContent = `Mostrando ${totalMostrados} registros`;
    }
}

/**
 * Mostrar mensaje cuando no hay datos
 */
function mostrarMensajeVacio() {
    const tbody = document.getElementById('auditoriaTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 2rem; color: #7f8c8d;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <p>No se encontraron registros con los filtros aplicados</p>
            </td>
        </tr>
    `;
}

/**
 * Mostrar mensaje de error
 */
function mostrarError(mensaje) {
    const tbody = document.getElementById('auditoriaTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 2rem; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <p>${mensaje}</p>
            </td>
        </tr>
    `;
}

/**
 * Limpiar filtros
 */
function limpiarFiltros() {
    document.getElementById('filtroUsuario').value = '';
    document.getElementById('filtroAccion').value = '';
    document.getElementById('filtroDesde').value = '';
    document.getElementById('filtroHasta').value = '';
    
    currentOffset = 0;
    hasMoreData = true;
    cargarRegistrosAuditoria();
}

/**
 * Exportar datos (función futura)
 */
function exportarAuditoria() {
    alert('Función de exportación en desarrollo');
}
