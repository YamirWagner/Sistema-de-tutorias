'use strict';

const GestionUsuariosModule = {
    state: {
        users: [],
        filteredUsers: [],
        isLoading: false
    }
};

const GESTION_API_BASE = (() => {
    const configured = window.APP_CONFIG?.API?.BASE_URL;
    if (configured) {
        return configured.replace(/\/$/, '');
    }
    const basePath = (window.APP_BASE_PATH || '').replace(/\/$/, '');
    return `${basePath}/api`;
})();

// ============= CONFIGURACIÓN DE EVENTOS =============

function setupEventListeners() {
    // Botón abrir modal
    const btnOpen = document.getElementById('btnOpenRegister');
    if (btnOpen) {
        btnOpen.onclick = function() {
            openRegisterModal();
        };
    }
    
    // Búsqueda
    const search = document.getElementById('searchUser');
    if (search) {
        search.oninput = applyFilters;
    }
    
    // Filtro de rol
    const filter = document.getElementById('filterRole');
    if (filter) {
        filter.onchange = applyFilters;
    }
    
    // Cambio de rol en formulario
    const rolSelect = document.getElementById('inputRol');
    if (rolSelect) {
        rolSelect.onchange = handleRoleChange;
    }
}

// ============= INICIALIZACIÓN =============

async function initGestionUsuariosModule() {
    if (GestionUsuariosModule.state.isLoading) return;
    
    GestionUsuariosModule.state.isLoading = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Configurar botón registrar
        const btnOpen = document.getElementById('btnOpenRegister');
        if (btnOpen) {
            btnOpen.onclick = () => {
                const modal = document.getElementById('registerModal');
                if (modal) {
                    modal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                }
            };
        }
        
        // Botones de cerrar modales
        const closeBtns = document.querySelectorAll('.modal-close-btn');
        closeBtns.forEach(btn => {
            btn.onclick = () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            };
        });
        
        // Configurar filtros
        const searchInput = document.getElementById('searchUser');
        const filterRole = document.getElementById('filterRole');
        
        if (searchInput) {
            searchInput.oninput = () => applyFilters();
        }
        
        if (filterRole) {
            filterRole.onchange = () => applyFilters();
        }
        
        // Cambio de rol en formularios
        const rolSelect = document.getElementById('inputRol');
        if (rolSelect) {
            rolSelect.onchange = function() {
                handleRoleChange.call(this);
            };
        }
        
        const rolSelectEdit = document.getElementById('editInputRol');
        if (rolSelectEdit) {
            rolSelectEdit.onchange = function() {
                handleRoleChange.call(this);
            };
        }
        
        await loadUsers();
    } catch (e) {
        console.error('Error en inicialización:', e);
    } finally {
        GestionUsuariosModule.state.isLoading = false;
    }
}

async function loadGestionUsuariosContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    cleanupGestionUsuariosModals();
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando módulo...</p></div>';
        
        const cssPath = window.PATH?.css('administrador/gestionUsuarios.css') || 
                       `${(window.APP_BASE_PATH || '').replace(/\/+$/, '')}/frontend/css/administrador/gestionUsuarios.css`;
        
        if (!document.querySelector(`link[href*="gestionUsuarios.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        const url = window.PATH?.adminGestionUsuarios() || 
                `${(window.APP_BASE_PATH || '').replace(/\/+$/, '')}/frontend/components/administrador/gestionUsuarios.html`;
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        await initGestionUsuariosModule();
        
    } catch (error) {
        console.error('Error al cargar módulo:', error);
        content.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <h3 style="color:#ef4444;margin-bottom:12px;">Error al cargar el módulo</h3>
                <p style="color:#666;">${error.message}</p>
            </div>`;
    }
}

// ============= FUNCIONES GLOBALES DE MODALES =============

function openRegisterModal() {
    console.log('📂 Intentando abrir modal...');
    const modal = document.getElementById('registerModal');
    console.log('🔍 Modal:', modal);
    
    if (modal) {
        console.log('✅ Modal encontrado, abriendo...');
        resetRegisterForm();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('✅ Modal abierto');
        
        // Click en overlay para cerrar
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeRegisterModal();
            }
        };
    } else {
        console.error('❌ Modal NO encontrado en el DOM');
    }
}

function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        modal.onclick = null;
    }
}

function openEditModal(userId, userType) {
    const modal = document.getElementById('editModal');
    if (modal) {
        loadUserDataForEdit(userId, userType);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeEditModal();
            }
        };
    }
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        modal.onclick = null;
    }
}

function handleRoleChange() {
    const rol = this.value;
    const studentFields = document.querySelectorAll('.student-field');
    const systemFields = document.querySelectorAll('.system-field');
    const dniField = document.getElementById('inputDNI');
    const dniReq = document.getElementById('dniRequired');
    
    if (rol === 'Estudiante') {
        studentFields.forEach(f => f.classList.remove('hidden'));
        systemFields.forEach(f => f.classList.add('hidden'));
        if (dniReq) dniReq.style.display = 'none';
        if (dniField) dniField.removeAttribute('required');
    } else if (rol) {
        studentFields.forEach(f => f.classList.add('hidden'));
        systemFields.forEach(f => f.classList.add('hidden'));
        if (rol === 'Tutor' || rol === 'Verificador') {
            systemFields.forEach(f => f.classList.remove('hidden'));
        }
        if (dniReq) dniReq.style.display = 'inline';
        if (dniField) dniField.setAttribute('required', 'required');
    }
}

// ============= FUNCIONES DE UI =============

function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationsContainer');
    if (!container) {
        console.error('Contenedor de notificaciones no encontrado');
        return;
    }
    
    const icons = {
        'success': 'fa-circle-check',
        'error': 'fa-circle-xmark',
        'warning': 'fa-triangle-exclamation',
        'info': 'fa-circle-info'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 4000);
    
    notification.style.cursor = 'pointer';
    notification.onclick = () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    };
}

function resetRegisterForm() {
    const form = document.getElementById('registerForm');
    if (form) form.reset();
    
    document.querySelectorAll('.student-field').forEach(f => f.classList.add('hidden'));
    document.querySelectorAll('.system-field').forEach(f => f.classList.add('hidden'));
    
    const dniReq = document.getElementById('dniRequired');
    if (dniReq) dniReq.style.display = 'none';
}

// ============= CARGA DE DATOS =============

async function loadUsers(role = null, estado = null, search = null) {
    try {
        let url = `${GESTION_API_BASE}/gestionUsuarios?action=list`;
        
        if (role) url += `&role=${encodeURIComponent(role)}`;
        if (estado) url += `&estado=${encodeURIComponent(estado)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok || data.status === 'error') {
            throw new Error(data.message || 'Error al cargar usuarios');
        }
        
        const result = data.data || data;
        GestionUsuariosModule.state.users = result.users || [];
        GestionUsuariosModule.state.filteredUsers = GestionUsuariosModule.state.users;
        
        renderUsersTable();
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        showNotification('Error al cargar usuarios: ' + error.message, 'error');
    }
}

function applyFilters() {
    const search = document.getElementById('searchUser');
    const filter = document.getElementById('filterRole');
    
    if (!search || !filter) return;
    
    const searchTerm = search.value.toLowerCase().trim();
    const roleFilter = filter.value;
    
    GestionUsuariosModule.state.filteredUsers = GestionUsuariosModule.state.users.filter(user => {
        const matchRole = roleFilter === 'Todos' || user.rol === roleFilter;
        
        const matchSearch = !searchTerm || 
            (user.nombres && user.nombres.toLowerCase().includes(searchTerm)) ||
            (user.apellidos && user.apellidos.toLowerCase().includes(searchTerm)) ||
            (user.correo && user.correo.toLowerCase().includes(searchTerm)) ||
            (user.codigo && user.codigo.toLowerCase().includes(searchTerm)) ||
            (user.dni && user.dni.includes(searchTerm));
        
        return matchRole && matchSearch;
    });
    
    renderUsersTable();
}

// ============= RENDERIZADO =============

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (GestionUsuariosModule.state.filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fa-solid fa-users-slash" style="font-size: 32px;"></i>
                    <p style="margin-top: 10px;">No se encontraron usuarios</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = GestionUsuariosModule.state.filteredUsers.map(user => {
        const roleClass = getRoleClass(user.rol);
        const isActive = user.estado === 'Activo';
        const statusClass = isActive ? 'active' : 'inactive';
        const statusText = isActive ? 'Activo' : 'Inactivo';
        const displayInfo = user.codigo || user.correo;
        const fullName = `${user.nombres} ${user.apellidos}`;
        
        return `
            <tr>
                <td>
                    <span class="user-name">${fullName}</span>
                </td>
                <td>
                    <span class="user-code">${displayInfo}</span>
                </td>
                <td>
                    <span class="role-badge ${roleClass}">${user.rol}</span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="actions">
                        <button class="btn-action btn-edit" onclick="window.openEditModal(${user.id}, '${user.userType}')">Editar</button>
                        ${isActive ? 
                            `<button class="btn-deactivate" onclick="window.toggleUserStatus(${user.id}, '${user.userType}', false)">Desactivar</button>` :
                            `<button class="btn-activate" onclick="window.toggleUserStatus(${user.id}, '${user.userType}', true)">Activar</button>`
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getRoleClass(rol) {
    const roleMap = {
        'Administrador': 'admin',
        'Tutor': 'tutor',
        'Verificador': 'verifier',
        'Estudiante': 'student'
    };
    return roleMap[rol] || 'student';
}

// ============= ACCIONES =============

async function saveNewUser() {
    const form = document.getElementById('registerForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const rol = document.getElementById('inputRol').value;
    const dni = document.getElementById('inputDNI').value.trim();
    const nombres = document.getElementById('inputNombres').value.trim();
    const apellidos = document.getElementById('inputApellidos').value.trim();
    const correo = document.getElementById('inputCorreo').value.trim();
    
    const payload = {
        action: 'register',
        rol,
        dni,
        nombres,
        apellidos,
        correo
    };
    
    if (rol === 'Estudiante') {
        payload.codigo = document.getElementById('inputCodigo').value.trim();
        payload.semestre = document.getElementById('inputSemestre').value.trim();
        
        if (!payload.codigo || !payload.semestre) {
            showNotification('Para estudiantes, el código y semestre son obligatorios', 'error');
            return;
        }
    } else {
        if (!dni) {
            showNotification('El DNI es obligatorio para usuarios del sistema', 'error');
            return;
        }
        
        const especialidad = document.getElementById('inputEspecialidad').value.trim();
        if (especialidad) {
            payload.especialidad = especialidad;
        }
    }
    
    try {
        const response = await fetch(`${GESTION_API_BASE}/gestionUsuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok || data.status === 'error') {
            throw new Error(data.message || 'Error al registrar usuario');
        }
        
        showNotification('Usuario registrado exitosamente', 'success');
        hideModal(document.getElementById('registerModal'));
        await loadUsers();
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

async function toggleUserStatus(userId, userType, activate) {
    const action = activate ? 'activate' : 'deactivate';
    
    try {
        const response = await fetch(`${GESTION_API_BASE}/gestionUsuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, userId, userType })
        });
        
        const data = await response.json();
        
        if (!response.ok || data.status === 'error') {
            throw new Error(data.message || 'Error al actualizar estado');
        }
        
        showNotification(activate ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// ============= EDICIÓN DE USUARIOS =============

async function loadUserDataForEdit(userId, userType) {
    try {
        const user = GestionUsuariosModule.state.users.find(u => 
            u.id === userId && u.userType === userType
        );
        
        if (!user) {
            showNotification('Usuario no encontrado', 'error');
            return;
        }
        
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserType').value = user.userType;
        document.getElementById('editRol').value = user.rol;
        document.getElementById('editNombres').value = user.nombres;
        document.getElementById('editApellidos').value = user.apellidos;
        document.getElementById('editCorreo').value = user.correo;
        
        const isStudent = user.rol === 'Estudiante';
        const isTutorOrVerifier = user.rol === 'Tutor' || user.rol === 'Verificador';
        
        document.querySelectorAll('.edit-student-field').forEach(f => 
            f.classList.toggle('hidden', !isStudent)
        );
        document.querySelectorAll('.edit-system-field').forEach(f => 
            f.classList.toggle('hidden', !isTutorOrVerifier)
        );
        
        const dniField = document.getElementById('editFieldDNI');
        if (dniField) {
            dniField.classList.toggle('hidden', isStudent);
        }
        
        if (isStudent) {
            document.getElementById('editCodigo').value = user.codigo || '';
            document.getElementById('editSemestre').value = user.semestre || '';
        } else {
            document.getElementById('editDNI').value = user.dni || '';
            if (isTutorOrVerifier) {
                document.getElementById('editEspecialidad').value = user.especialidad || '';
            }
        }
    } catch (error) {
        console.error('Error al abrir modal de edición:', error);
        showNotification('Error al cargar datos del usuario', 'error');
    }
}

async function saveEditUser() {
    const form = document.getElementById('editForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const userId = document.getElementById('editUserId').value;
    const userType = document.getElementById('editUserType').value;
    const rol = document.getElementById('editRol').value;
    const nombres = document.getElementById('editNombres').value.trim();
    const apellidos = document.getElementById('editApellidos').value.trim();
    const correo = document.getElementById('editCorreo').value.trim();
    
    const payload = {
        action: 'update',
        userId,
        userType,
        nombres,
        apellidos,
        correo
    };
    
    if (rol === 'Estudiante') {
        payload.semestre = document.getElementById('editSemestre').value.trim();
        if (!payload.semestre) {
            showNotification('El semestre es obligatorio', 'error');
            return;
        }
    } else {
        const dni = document.getElementById('editDNI').value.trim();
        if (dni) {
            payload.dni = dni;
        }
        
        if (rol === 'Tutor' || rol === 'Verificador') {
            const especialidad = document.getElementById('editEspecialidad').value.trim();
            if (especialidad) {
                payload.especialidad = especialidad;
            }
        }
    }
    
    try {
        const response = await fetch(`${GESTION_API_BASE}/gestionUsuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok || data.status === 'error') {
            throw new Error(data.message || 'Error al actualizar usuario');
        }
        
        showNotification('Usuario actualizado correctamente', 'success');
        hideModal(document.getElementById('editModal'));
        await loadUsers();
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// ============= LIMPIEZA DE MODALES =============

function cleanupGestionUsuariosModals() {
    // Eliminar modales anteriores si existen
    const oldModals = document.querySelectorAll('#registerModal, #editModal');
    oldModals.forEach(modal => {
        if (modal && modal.parentElement) {
            modal.remove();
        }
    });
}

// ============= EXPORTAR A WINDOW =============

window.loadGestionUsuariosContent = loadGestionUsuariosContent;
window.initGestionUsuariosModule = initGestionUsuariosModule;
window.toggleUserStatus = toggleUserStatus;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.saveNewUser = saveNewUser;
window.saveEditUser = saveEditUser;
window.cleanupGestionUsuariosModals = cleanupGestionUsuariosModals;
