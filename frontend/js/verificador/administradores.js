// ============================================
// ADMINISTRADORES - Verificador
// ============================================

console.log('%c👥 MÓDULO ADMINISTRADORES CARGADO', 'background: #9B192D; color: #fff; font-weight: bold; padding: 5px;');

// Cargar contenido de administradores
async function loadAdministradoresContent() {
    console.log('👥 Cargando módulo de administradores...');
    
    const content = document.getElementById('dashboardContent');
    if (!content) {
        console.error('❌ No se encontró el contenedor dashboardContent');
        return;
    }
    
    try {
        // Cargar el HTML del módulo
        const response = await fetch('/Sistema-de-tutorias/frontend/components/verificador/administradores.html');
        const html = await response.text();
        content.innerHTML = html;
        
        // Cargar datos
        await loadAdministradoresData();
        
        // Configurar búsqueda en tiempo real
        const searchInput = document.getElementById('searchAdmin');
        if (searchInput) {
            searchInput.addEventListener('input', filterAdminTable);
        }
        
        console.log('✅ Módulo de administradores cargado correctamente');
    } catch (error) {
        console.error('❌ Error al cargar módulo de administradores:', error);
        content.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>Error al cargar el módulo de administradores</p>
            </div>
        `;
    }
}

// Cargar datos de administradores
async function loadAdministradoresData() {
    console.log('📊 Cargando datos de administradores...');
    
    try {
        const response = await apiGet('/administradores?action=lista');
        
        if (response.success && response.data) {
            // Actualizar estadísticas
            document.getElementById('totalAdmins').textContent = response.data.total || 0;
            document.getElementById('activeAdmins').textContent = response.data.activos || 0;
            document.getElementById('lastLoginAdmin').textContent = response.data.ultimoAcceso || '-';
            
            // Renderizar tabla
            renderAdminTable(response.data.administradores || []);
            
            console.log('✅ Datos de administradores cargados');
        } else {
            // Datos de ejemplo
            document.getElementById('totalAdmins').textContent = '0';
            document.getElementById('activeAdmins').textContent = '0';
            document.getElementById('lastLoginAdmin').textContent = '-';
            
            renderAdminTable([]);
        }
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        renderAdminTable([]);
    }
}

// Renderizar tabla de administradores
function renderAdminTable(admins) {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;
    
    if (admins.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    No hay administradores registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = admins.map(admin => `
        <tr data-admin-id="${admin.id}">
            <td>${admin.codigo || '-'}</td>
            <td>${admin.nombre || 'Sin nombre'}</td>
            <td>${admin.correo || '-'}</td>
            <td>
                <span class="status-badge ${admin.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                    ${admin.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>${admin.ultimo_acceso || '-'}</td>
            <td>
                <button onclick="viewAdminDetails(${admin.id})" class="action-btn btn-view">
                    <i class="fa-solid fa-eye"></i> Ver
                </button>
            </td>
        </tr>
    `).join('');
}

// Filtrar tabla
function filterAdminTable() {
    const searchTerm = document.getElementById('searchAdmin').value.toLowerCase();
    const rows = document.querySelectorAll('#adminTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Ver detalles de administrador
async function viewAdminDetails(adminId) {
    console.log('👁️ Ver detalles del administrador:', adminId);
    
    // Mostrar modal
    const modal = document.getElementById('adminDetailModal');
    const content = document.getElementById('adminDetailContent');
    
    console.log('🔍 Modal encontrado:', modal ? 'Sí' : 'No');
    console.log('🔍 Content encontrado:', content ? 'Sí' : 'No');
    
    if (!modal || !content) {
        console.error('❌ Elementos del modal no encontrados en el DOM');
        showNotification('Error: No se pudo abrir el modal. Intenta recargar la página.', 'error');
        return;
    }
    
    modal.style.display = 'flex';
    content.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando detalles...</p>
        </div>
    `;
    
    try {
        const response = await apiGet(`/administradores?action=detalle&admin_id=${adminId}`);
        
        console.log('📥 Respuesta del servidor:', response);
        
        if (response.success) {
            const admin = response.data;
            content.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <label><i class="fa-solid fa-id-card"></i> Código/DNI:</label>
                        <span>${admin.codigo}</span>
                    </div>
                    <div class="detail-item">
                        <label><i class="fa-solid fa-user"></i> Nombre Completo:</label>
                        <span>${admin.nombre}</span>
                    </div>
                    <div class="detail-item">
                        <label><i class="fa-solid fa-envelope"></i> Correo Electrónico:</label>
                        <span>${admin.correo}</span>
                    </div>
                    <div class="detail-item">
                        <label><i class="fa-solid fa-circle-info"></i> Estado:</label>
                        <span class="badge ${admin.estado === 'activo' ? 'badge-success' : 'badge-danger'}">
                            ${admin.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                    <div class="detail-item">
                        <label><i class="fa-solid fa-calendar-plus"></i> Fecha de Creación:</label>
                        <span>${admin.fecha_creacion}</span>
                    </div>
                    <div class="detail-item">
                        <label><i class="fa-solid fa-clock"></i> Último Acceso:</label>
                        <span>${admin.ultimo_acceso}</span>
                    </div>
                    <div class="detail-item">
                        <label><i class="fa-solid fa-chart-line"></i> Total de Accesos:</label>
                        <span>${admin.total_accesos}</span>
                    </div>
                </div>
            `;
            console.log('✅ Detalles mostrados en el modal');
        } else {
            content.innerHTML = `
                <div class="error-message">
                    <i class="fa-solid fa-exclamation-circle"></i>
                    <p>${response.message || 'Error al cargar detalles'}</p>
                </div>
            `;
            showNotification(response.message || 'Error al cargar detalles', 'error');
        }
    } catch (error) {
        console.error('❌ Error al obtener detalles:', error);
        content.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>Error al cargar los detalles del administrador</p>
            </div>
        `;
        showNotification('Error al cargar los detalles', 'error');
    }
}

// Cerrar modal de detalles
function closeAdminDetailModal() {
    const modal = document.getElementById('adminDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Cerrar modal al hacer clic fuera de él
document.addEventListener('click', function(event) {
    const modal = document.getElementById('adminDetailModal');
    if (modal && event.target === modal) {
        closeAdminDetailModal();
    }
});

// Exponer funciones globales
window.loadAdministradoresContent = loadAdministradoresContent;
window.loadAdministradoresData = loadAdministradoresData;
window.viewAdminDetails = viewAdminDetails;
window.closeAdminDetailModal = closeAdminDetailModal;
window.filterAdminTable = filterAdminTable;

console.log('✅ Módulo administradores inicializado');
