// main.js - Lógica general y navegación

// Obtener configuración del sistema
async function loadAppConfig() {
    try {
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const apiUrl = basePath.replace(/\/$/, '') + '/api';
        
        const response = await fetch(`${apiUrl}/config`);
        const config = await response.json();
        
        console.log('Configuración cargada:', config);
        
        if (config.success) {
            // Guardar versión en variable global
            window.APP_VERSION = config.data.version;
            window.APP_NAME = config.data.app_name;
            
            console.log('Versión del sistema:', window.APP_VERSION);
            
            // Actualizar footer si existe
            updateFooterVersion(config.data.version);
        }
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        window.APP_VERSION = '1.0.0'; // Versión por defecto
    }
}

// Actualizar versión en el footer
function updateFooterVersion(version) {
    console.log('📌 Actualizando versión a:', version);
    
    // Verificar que el footer esté visible
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        const footer = footerContainer.querySelector('footer');
        if (footer) {
            footer.style.display = 'block';
            footer.style.visibility = 'visible';
            footer.style.opacity = '1';
            console.log('✅ Footer forzado a visible en updateFooterVersion');
        }
    }
    
    // Actualizar versión
    const versionElements = document.querySelectorAll('.app-version');
    console.log('📍 Elementos de versión encontrados:', versionElements.length);
    versionElements.forEach((el, index) => {
        el.textContent = version;
        console.log(`  ${index + 1}. Actualizado:`, el.parentElement?.className || 'sin clase');
    });
}

// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    const basePath = window.APP_BASE_PATH || '';
    
    // Detectar página actual (funciona con URLs limpias y .html)
    const isPanel = path.includes('panel') || path.includes('dashboard');
    const isLogin = path.includes('login');
    const isVerify = path.includes('verify');
    const isIndex = path.endsWith('/') || path.includes('index');
    
    // Si no hay token y está en panel, redirigir a login
    if (!token && isPanel) {
        window.location.href = basePath + '/login';
        return false;
    }
    
    // Si hay token y está en login/verify/index, redirigir a panel
    if (token && (isLogin || isVerify || isIndex)) {
        window.location.href = basePath + '/panel';
        return false;
    }
    
    return true;
}

// Obtener datos del usuario desde el token
function getUserFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch (e) {
        console.error('Error al decodificar token:', e);
        return null;
    }
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const basePath = window.APP_BASE_PATH || '';
    window.location.href = basePath + '/login';
}

// Cargar componentes HTML (header, sidebar, footer)
async function loadComponent(elementId, componentPath) {
    try {
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        // Construir URL completa con basePath
        const fullPath = `${basePath}/${componentPath}`;
        
        console.log(`🔄 Cargando componente: ${fullPath}`);
        console.log(`📍 Elemento destino: #${elementId}`);
        
        // Verificar que el elemento existe ANTES de hacer fetch
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`❌ Elemento #${elementId} NO EXISTE en el DOM`);
            console.log('📋 Elementos disponibles:', Array.from(document.querySelectorAll('[id]')).map(e => e.id));
            return;
        }
        console.log(`✅ Elemento #${elementId} encontrado`);
        
        const response = await fetch(fullPath);
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
            console.error(`❌ Error HTTP ${response.status} al cargar ${fullPath}`);
            const errorText = await response.text();
            console.error('Response:', errorText.substring(0, 200));
            return;
        }
        
        const html = await response.text();
        console.log(`📦 HTML recibido: ${html.length} caracteres`);
        console.log(`📝 Primeros 100 caracteres:`, html.substring(0, 100));
        
        element.innerHTML = html;
        console.log(`✅ Componente ${componentPath} insertado en #${elementId}`);
        
        // Verificar que el contenido se insertó
        if (element.innerHTML.length > 0) {
            console.log(`✅ Verificación: #${elementId} ahora tiene ${element.innerHTML.length} caracteres`);
        } else {
            console.error(`❌ PROBLEMA: #${elementId} está vacío después de insertar`);
        }
        
    } catch (error) {
        console.error(`❌ ERROR CRÍTICO cargando ${componentPath}:`, error);
        console.error('Stack:', error.stack);
    }
}

// Inicializar dashboard
async function initDashboard() {
    console.log('='.repeat(50));
    console.log('🚀 INICIANDO DASHBOARD');
    console.log('='.repeat(50));
    
    if (!checkAuth()) {
        console.log('❌ checkAuth() falló - Redirigiendo');
        return;
    }
    console.log('✅ Usuario autenticado');
    
    // Verificar que los contenedores existen
    console.log('🔍 Verificando contenedores en el DOM...');
    const headerContainer = document.getElementById('header-container');
    const sidebarContainer = document.getElementById('sidebar-container');
    const footerContainer = document.getElementById('footer-container');
    
    console.log('Header container:', headerContainer ? '✅ Existe' : '❌ NO EXISTE');
    console.log('Sidebar container:', sidebarContainer ? '✅ Existe' : '❌ NO EXISTE');
    console.log('Footer container:', footerContainer ? '✅ Existe' : '❌ NO EXISTE');
    
    // Cargar configuración del sistema
    console.log('\n📡 Paso 1: Cargando configuración del sistema...');
    await loadAppConfig();
    
    // Cargar componentes
    console.log('\n📦 Paso 2: Cargando componentes HTML...');
    
    console.log('--- Header ---');
    await loadComponent('header-container', 'components/header-panel.html');
    const headerCheck = document.getElementById('header-container');
    console.log('✔️ Header insertado:', headerCheck && headerCheck.innerHTML.length > 0 ? `${headerCheck.innerHTML.length} chars` : '❌ VACÍO');
    
    // Actualizar información del header (semestre y días restantes)
    if (typeof window.updateHeaderPanelInfo === 'function') {
        setTimeout(async () => {
            await window.updateHeaderPanelInfo();
            console.log('✅ Información del header actualizada');
        }, 100);
    }
    
    console.log('--- Sidebar ---');
    await loadComponent('sidebar-container', 'components/sidebar-panel.html');
    const sidebarCheck = document.getElementById('sidebar-container');
    console.log('✔️ Sidebar insertado:', sidebarCheck && sidebarCheck.innerHTML.length > 0 ? `${sidebarCheck.innerHTML.length} chars` : '❌ VACÍO');
    
    // Inicializar funcionalidad del sidebar
    if (typeof window.initializeSidebar === 'function') {
        setTimeout(() => {
            window.initializeSidebar();
            console.log('✅ Sidebar inicializado');
        }, 150);
    }
    
    console.log('--- Footer ---');
    await loadComponent('footer-container', 'components/footer-panel.html');
    const footerCheck = document.getElementById('footer-container');
    console.log('✔️ Footer insertado:', footerCheck && footerCheck.innerHTML.length > 0 ? `${footerCheck.innerHTML.length} chars` : '❌ VACÍO');
    
    // Verificación final visual
    if (footerCheck && footerCheck.innerHTML.length > 0) {
        console.log('🎉 FOOTER CARGADO EXITOSAMENTE');
        console.log('Footer HTML:', footerCheck.innerHTML.substring(0, 100));
        
        // Forzar visibilidad del footer
        const footerElement = footerCheck.querySelector('footer');
        if (footerElement) {
            footerElement.style.display = 'block';
            footerElement.style.visibility = 'visible';
            footerElement.style.opacity = '1';
            console.log('✅ Footer forzado a visible');
        }
    } else {
        console.error('⚠️ PROBLEMA: Footer NO se cargó correctamente');
    }
    
    console.log('--- Modales ---');
    await loadComponent('modals-container', '../components/administrador/modals.html');
    const modalsCheck = document.getElementById('modals-container');
    console.log('✔️ Modales insertados:', modalsCheck && modalsCheck.innerHTML.length > 0 ? `${modalsCheck.innerHTML.length} chars` : '❌ VACÍO');
    
    console.log('\n✅ Todos los componentes procesados');
    
    // Actualizar versión en el footer después de cargarlo
    setTimeout(() => {
        if (window.APP_VERSION) {
            updateFooterVersion(window.APP_VERSION);
        }
    }, 100);
    
    // Obtener datos del usuario
    const user = getUserFromToken();
    if (user) {
        // Actualizar información en el contenido principal
        const welcomeMsg = document.getElementById('welcomeMessage');
        const userRoleEl = document.getElementById('userRole');
        
        if (welcomeMsg) welcomeMsg.textContent = `Bienvenido, ${user.name || user.email}`;
        if (userRoleEl) userRoleEl.textContent = `Rol: ${getRoleName(user.role)}`;
        
        // Actualizar información en el header y sidebar (después de que se carguen)
        setTimeout(() => {
            const headerUserName = document.getElementById('headerUserName');
            const headerUserRole = document.getElementById('headerUserRole');
            const sidebarUserRole = document.getElementById('sidebarUserRole');
            
            if (headerUserName) headerUserName.textContent = user.name || user.email;
            if (headerUserRole) headerUserRole.textContent = getRoleName(user.role);
            if (sidebarUserRole) sidebarUserRole.textContent = getRoleName(user.role);
        }, 200);
        
        // Cargar contenido según el rol
        loadDashboardByRole(user.role);
    }
    
    // Configurar botón de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Obtener nombre del rol
function getRoleName(role) {
    const roles = {
        'admin': 'Administrador',
        'tutor': 'Tutor',
        'student': 'Estudiante',
        'verifier': 'Verificador'
    };
    return roles[role] || role;
}

// Cargar dashboard según rol
function loadDashboardByRole(role) {
    switch(role) {
        case 'admin':
            if (typeof loadAdminDashboard === 'function') {
                loadAdminDashboard();
            }
            break;
        case 'tutor':
            if (typeof loadTutorDashboard === 'function') {
                loadTutorDashboard();
            }
            break;
        case 'student':
            if (typeof loadStudentDashboard === 'function') {
                loadStudentDashboard();
            }
            break;
        case 'verifier':
            if (typeof loadVerifierDashboard === 'function') {
                loadVerifierDashboard();
            }
            break;
    }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const colors = {
        'success': 'bg-green-100 border-green-500 text-green-700',
        'error': 'bg-red-100 border-red-500 text-red-700',
        'warning': 'bg-yellow-100 border-yellow-500 text-yellow-700',
        'info': 'bg-blue-100 border-blue-500 text-blue-700'
    };

    // Calcular la posición vertical basada en notificaciones existentes
    const existingNotifications = document.querySelectorAll('.notification');
    const topOffset = 16 + (existingNotifications.length * 80); // 16px base + 80px por notificación

    const notification = document.createElement('div');
    notification.className = `notification fixed ${colors[type]} border-r-4 p-4 rounded shadow-lg z-50`;
    notification.style.top = `${topOffset}px`;
    notification.style.left = '16px';
    notification.innerHTML = `
        <p class="font-bold">${message}</p>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Detectar si estamos en panel (funciona con URLs limpias y .html)
    if (path.includes('panel') || path.includes('dashboard')) {
        console.log('Inicializando panel...');
        console.log('Token:', localStorage.getItem('token'));
        console.log('User:', localStorage.getItem('user'));
        initDashboard();
    } else {
        checkAuth();
    }
});
