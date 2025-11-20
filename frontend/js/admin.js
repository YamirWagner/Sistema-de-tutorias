// admin.js - Funciones del Administrador (Solo Lógica)

// Cargar dashboard del administrador
async function loadAdminDashboard() {
    console.log('Cargando dashboard de administrador...');
    
    // Cargar estadísticas
    await loadAdminStats();
    
    // Cargar contenido HTML del componente
    await loadAdminContent();
}

// Cargar estadísticas del administrador
async function loadAdminStats() {
    try {
        const response = await apiGet('/admin?action=stats');
        
        if (response.success) {
            const stats = response.data;
            updateAdminStats(stats);
        } else {
            showNotification('Error al cargar estadísticas', 'error');
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        showNotification('Error al cargar estadísticas', 'error');
    }
}

// Actualizar estadísticas en el DOM
function updateAdminStats(stats) {
    // Mostrar estadísticas de administrador (grid 2x2)
    const adminMainStats = document.getElementById('adminMainStats');
    const otherRolesStats = document.getElementById('otherRolesStats');
    
    if (adminMainStats) {
        adminMainStats.style.display = 'grid';
    }
    if (otherRolesStats) {
        otherRolesStats.style.display = 'none';
    }
    
    // Actualizar valores
    updateElementText('totalTutors', stats.totalTutors || 0);
    updateElementText('totalStudents', stats.totalStudents || 0);
    updateElementText('totalSessions', stats.totalSessions || 0);
    updateElementText('activeAssignments', stats.activeAssignments || 0);
}

// Cargar contenido HTML del administrador
async function loadAdminContent() {
    try {
        const response = await fetch('/Sistema-de-tutorias/components/admin-dashboard.html');
        const html = await response.text();
        
        const content = document.getElementById('dashboardContent');
        
        // Limpiar contenido existente
        const existingAdmin = content.querySelector('.admin-panel-section');
        if (existingAdmin) {
            existingAdmin.remove();
        }
        
        // Insertar nuevo contenido
        content.insertAdjacentHTML('beforeend', html);
        
        // Cargar asignaciones activas automáticamente
        loadActiveAssignments();
    } catch (error) {
        console.error('Error al cargar contenido del administrador:', error);
    }
}

// Gestionar usuarios
async function manageUsers(role = 'all') {
    try {
        const endpoint = role === 'all' ? '/admin?action=users' : `/admin?action=users&role=${role}`;
        const response = await apiGet(endpoint);
        
        if (response.success) {
            renderUsersTable(response.data);
        } else {
            showNotification('Error al cargar usuarios', 'error');
        }
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        showNotification('Error al cargar usuarios', 'error');
    }
}

// Renderizar tabla de usuarios usando template
function renderUsersTable(users) {
    const container = document.getElementById('usersTableContainer');
    
    if (!users || users.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay usuarios para mostrar</p>';
        return;
    }
    
    // Clonar template de tabla
    const tableTemplate = document.getElementById('usersTableTemplate');
    if (!tableTemplate) {
        // Fallback si no hay template
        displayUsersTableFallback(users, container);
        return;
    }
    
    const tableClone = tableTemplate.content.cloneNode(true);
    const tbody = tableClone.getElementById('usersTableBody');
    
    // Etiquetas de roles
    const roleLabels = {
        'admin': 'Administrador',
        'tutor': 'Tutor',
        'student': 'Estudiante',
        'verifier': 'Verificador'
    };
    
    // Generar filas
    users.forEach(user => {
        const rowTemplate = document.getElementById('userRowTemplate');
        if (!rowTemplate) return;
        
        const row = rowTemplate.content.cloneNode(true);
        
        // Llenar datos
        row.querySelector('[data-field="email"]').textContent = user.email;
        row.querySelector('[data-field="name"]').textContent = user.name || 'Sin nombre';
        row.querySelector('[data-field="role"]').textContent = roleLabels[user.role] || user.role;
        
        // Estado
        const statusBadge = user.active == 1 
            ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Activo</span>'
            : '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactivo</span>';
        row.querySelector('[data-field="status"]').innerHTML = statusBadge;
        
        // Acciones
        const actionsHTML = `
            <button onclick="editUser(${user.id})" class="text-blue-600 hover:text-blue-800 mr-3">Editar</button>
            <button onclick="toggleUserStatus(${user.id}, ${user.active})" class="text-${user.active == 1 ? 'red' : 'green'}-600 hover:text-${user.active == 1 ? 'red' : 'green'}-800">
                ${user.active == 1 ? 'Desactivar' : 'Activar'}
            </button>
        `;
        row.querySelector('[data-field="actions"]').innerHTML = actionsHTML;
        
        tbody.appendChild(row);
    });
    
    container.innerHTML = '';
    container.appendChild(tableClone);
}
// Fallback para mostrar tabla sin template
function displayUsersTableFallback(users, container) {
    const roleLabels = {
        'admin': 'Administrador',
        'tutor': 'Tutor',
        'student': 'Estudiante',
        'verifier': 'Verificador'
    };
    
    let tableHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    users.forEach(user => {
        const statusBadge = user.active == 1 
            ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Activo</span>'
            : '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactivo</span>';
        
        tableHTML += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.name || 'Sin nombre'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${roleLabels[user.role] || user.role}</td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button onclick="editUser(${user.id})" class="text-blue-600 hover:text-blue-800 mr-3">Editar</button>
                    <button onclick="toggleUserStatus(${user.id}, ${user.active})" class="text-${user.active == 1 ? 'red' : 'green'}-600 hover:text-${user.active == 1 ? 'red' : 'green'}-800">
                        ${user.active == 1 ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Cargar todos los usuarios
async function loadAllUsers() {
    await manageUsers('all');
}

// Cargar asignaciones activas
async function loadActiveAssignments() {
    try {
        const response = await apiGet('/admin?action=assignments');
        
        if (response.success) {
            renderAssignments(response.data);
        } else {
            showNotification('Error al cargar asignaciones', 'error');
        }
    } catch (error) {
        console.error('Error al cargar asignaciones:', error);
        document.getElementById('assignmentsContainer').innerHTML = 
            '<p class="text-red-500 text-center py-4">Error al cargar asignaciones</p>';
    }
}

// Renderizar asignaciones usando template
function renderAssignments(assignments) {
    const container = document.getElementById('assignmentsContainer');
    
    if (!assignments || assignments.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay asignaciones activas</p>';
        return;
    }
    
    const gridDiv = document.createElement('div');
    gridDiv.className = 'grid md:grid-cols-2 gap-4';
    
    const cardTemplate = document.getElementById('assignmentCardTemplate');
    
    assignments.forEach(assignment => {
        if (cardTemplate) {
            // Usar template
            const card = cardTemplate.content.cloneNode(true);
            
            card.querySelector('[data-field="tutor_name"]').textContent = assignment.tutor_name;
            card.querySelector('[data-field="student_count"]').textContent = `${assignment.student_count} estudiantes`;
            card.querySelector('[data-field="tutor_email"]').textContent = `Email: ${assignment.tutor_email}`;
            card.querySelector('[data-field="created_at"]').textContent = `Asignado: ${formatDate(assignment.created_at)}`;
            
            const detailsBtn = card.querySelector('[data-field="details_button"]');
            detailsBtn.onclick = () => viewAssignmentDetails(assignment.tutor_id);
            
            gridDiv.appendChild(card);
        } else {
            // Fallback sin template
            const cardDiv = document.createElement('div');
            cardDiv.className = 'border rounded-lg p-4 hover:shadow-md transition';
            cardDiv.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-semibold text-gray-800">${assignment.tutor_name}</h4>
                        <p class="text-sm text-gray-600">Tutor</p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        ${assignment.student_count} estudiantes
                    </span>
                </div>
                <div class="text-sm text-gray-500">
                    <p>Email: ${assignment.tutor_email}</p>
                    <p class="mt-1">Asignado: ${formatDate(assignment.created_at)}</p>
                </div>
                <button onclick="viewAssignmentDetails(${assignment.tutor_id})" 
                        class="mt-3 text-blue-600 hover:text-blue-800 text-sm">
                    Ver detalles →
                </button>
            `;
            gridDiv.appendChild(cardDiv);
        }
    });
    
    container.innerHTML = '';
    container.appendChild(gridDiv);
}

// Cargar sección de reportes
async function loadReportsSection() {
    try {
        const response = await apiGet('/admin?action=reports');
        
        if (response.success) {
            showReportsModal(response.data);
        } else {
            showNotification('Error al cargar reportes', 'error');
        }
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        showNotification('Error al cargar reportes', 'error');
    }
}

// Mostrar modal de reportes
function showReportsModal(reports) {
    const template = document.getElementById('reportsModalTemplate');
    
    if (!template) {
        // Fallback si no existe el template
        showReportsModalFallback(reports);
        return;
    }
    
    const modal = template.content.cloneNode(true);
    const modalDiv = modal.querySelector('[data-modal="reports"]');
    
    // Cerrar al hacer clic fuera
    modalDiv.onclick = (e) => {
        if (e.target === modalDiv) closeModal('reports');
    };
    
    document.body.appendChild(modal);
    
    // Renderizar reportes
    const reportsContent = document.getElementById('reportsContent');
    
    if (!reports || reports.length === 0) {
        reportsContent.innerHTML = '<p class="text-gray-500 text-center py-4">No hay reportes disponibles</p>';
        return;
    }
    
    // Usar template de tabla
    const tableTemplate = document.getElementById('reportsTableTemplate');
    if (!tableTemplate) {
        // Fallback
        reportsContent.innerHTML = generateReportsTableHTML(reports);
        return;
    }
    
    const tableClone = tableTemplate.content.cloneNode(true);
    const tbody = tableClone.getElementById('reportsTableBody');
    
    reports.forEach(report => {
        const rowTemplate = document.getElementById('reportRowTemplate');
        if (!rowTemplate) return;
        
        const row = rowTemplate.content.cloneNode(true);
        
        row.querySelector('[data-field="tutor_name"]').textContent = report.tutor_name || 'N/A';
        row.querySelector('[data-field="created_at"]').textContent = formatDate(report.created_at);
        row.querySelector('[data-field="description"]').textContent = report.description || 'Sin descripción';
        
        tbody.appendChild(row);
    });
    
    reportsContent.innerHTML = '';
    reportsContent.appendChild(tableClone);
}

// Fallback modal de reportes sin template
function showReportsModalFallback(reports) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.setAttribute('data-modal', 'reports');
    modal.onclick = (e) => {
        if (e.target === modal) closeModal('reports');
    };
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-hidden" onclick="event.stopPropagation()">
            <div class="p-6 border-b">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-800">Reportes del Sistema</h3>
                    <button onclick="closeModal('reports')" class="text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="p-6">
                ${!reports || reports.length === 0 
                    ? '<p class="text-gray-500 text-center py-4">No hay reportes disponibles</p>'
                    : generateReportsTableHTML(reports)
                }
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Generar HTML de tabla de reportes
function generateReportsTableHTML(reports) {
    let html = `
        <div class="overflow-x-auto max-h-96 overflow-y-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Tutor</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    reports.forEach(report => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm">${report.tutor_name || 'N/A'}</td>
                <td class="px-4 py-2 text-sm">${formatDate(report.created_at)}</td>
                <td class="px-4 py-2 text-sm">${report.description || 'Sin descripción'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

// Mostrar modal para crear usuario
function showCreateUserModal() {
    const template = document.getElementById('createUserModalTemplate');
    
    if (!template) {
        // Fallback si no existe el template
        showNotification('Template no encontrado', 'error');
        return;
    }
    
    const modal = template.content.cloneNode(true);
    const modalDiv = modal.querySelector('[data-modal="createUser"]');
    
    // Cerrar al hacer clic fuera
    modalDiv.onclick = (e) => {
        if (e.target === modalDiv) closeModal('createUser');
    };
    
    document.body.appendChild(modal);
    
    // Adjuntar evento de submit
    document.getElementById('createUserForm').onsubmit = async (e) => {
        e.preventDefault();
        await createUser();
    };
}

// Crear usuario
async function createUser() {
    const email = document.getElementById('newUserEmail').value;
    const name = document.getElementById('newUserName').value;
    const role = document.getElementById('newUserRole').value;
    
    try {
        const response = await apiPost('/admin?action=createUser', {
            email,
            name,
            role
        });
        
        if (response.success) {
            showNotification('Usuario creado exitosamente', 'success');
            closeModal('createUser');
            loadAllUsers();
        } else {
            showNotification(response.message || 'Error al crear usuario', 'error');
        }
    } catch (error) {
        console.error('Error al crear usuario:', error);
        showNotification('Error al crear usuario', 'error');
    }
}

// Cerrar modal
function closeModal(modalName) {
    const modal = document.querySelector(`[data-modal="${modalName}"]`);
    if (modal) {
        modal.remove();
    }
}

// Mostrar modal para asignar estudiante
function showAssignStudentModal() {
    showNotification('Función de asignación en desarrollo', 'info');
}

// Ver detalles de asignación
function viewAssignmentDetails(tutorId) {
    showNotification(`Ver detalles del tutor ${tutorId}`, 'info');
}

// Editar usuario
function editUser(userId) {
    showNotification(`Editar usuario ${userId} - En desarrollo`, 'info');
}

// Activar/Desactivar usuario
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const action = newStatus == 1 ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Estás seguro de ${action} este usuario?`)) {
        return;
    }
    
    try {
        const response = await apiPost('/admin?action=toggleUser', {
            userId,
            active: newStatus
        });
        
        if (response.success) {
            showNotification(`Usuario ${action}do exitosamente`, 'success');
            loadAllUsers();
        } else {
            showNotification(response.message || `Error al ${action} usuario`, 'error');
        }
    } catch (error) {
        console.error('Error al cambiar estado del usuario:', error);
        showNotification(`Error al ${action} usuario`, 'error');
    }
}

// Función auxiliar para actualizar texto de elemento
function updateElementText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
