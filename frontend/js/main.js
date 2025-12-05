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
    
    console.log('🔐 Verificando autenticación...');
    console.log('   Token:', token ? '✅ Presente' : '❌ No hay token');
    console.log('   Ruta actual:', path);
    
    // Detectar página actual (funciona con URLs limpias y .html)
    const isPanel = path.includes('panel') || path.includes('dashboard');
    const isSemestre = path.includes('semestre');
    const isGestionUsuarios = path.includes('gestion-usuarios');
    const isLogin = path.includes('login');
    const isVerify = path.includes('verify');
    const isIndex = path.endsWith('/') || path.includes('index');
    
    // Páginas protegidas que requieren autenticación
    const isProtectedPage = isPanel || isSemestre || isGestionUsuarios;
    
    // Si no hay token y está en una página protegida, redirigir a login
    if (!token && isProtectedPage) {
        console.warn('⚠️ Sin token en página protegida - Redirigiendo a login');
        window.location.href = basePath + '/login';
        return false;
    }
    
    // Si hay token y está en login/verify/index, redirigir a panel
    if (token && (isLogin || isVerify || isIndex)) {
        console.log('✅ Token presente en página pública - Redirigiendo a panel');
        window.location.href = basePath + '/panel';
        return false;
    }
    
    console.log('✅ Autenticación verificada correctamente');
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
    
    // Obtener datos del usuario ANTES de cargar modales
    const user = getUserFromToken();
    const userRole = user ? normalizeRole(user.role) : null;
    const userRoleName = user ? getRoleName(user.role) : null;
    
    console.log('👤 Usuario:', user);
    console.log('🎭 Rol normalizado:', userRole);
    console.log('🎭 Nombre del rol:', userRoleName);
    
    console.log('--- Modales ---');
    // Cargar modales generales primero (incluye helpModal)
    await loadComponent('modals-container', 'components/modals.html');
    const modalsCheck = document.getElementById('modals-container');
    console.log('✔️ Modales generales insertados:', modalsCheck && modalsCheck.innerHTML.length > 0 ? `${modalsCheck.innerHTML.length} chars` : '❌ VACÍO');
    
    // Luego cargar modales específicos del rol
    if (userRole === 'admin') {
        const adminModalsPath = 'components/administrador/modals.html';
        try {
            const response = await fetch(adminModalsPath);
            if (response.ok) {
                const html = await response.text();
                modalsCheck.insertAdjacentHTML('beforeend', html);
                console.log('✔️ Modales de administrador agregados');
            }
        } catch (error) {
            console.log('⚠️ No se pudieron cargar modales de administrador:', error);
        }
    }
    
    console.log('✔️ Total de modales:', modalsCheck && modalsCheck.innerHTML.length > 0 ? `${modalsCheck.innerHTML.length} chars` : '❌ VACÍO');
    
    console.log('\n✅ Todos los componentes procesados');
    
    // Actualizar versión en el footer después de cargarlo
    setTimeout(() => {
        if (window.APP_VERSION) {
            updateFooterVersion(window.APP_VERSION);
        }
    }, 100);
    
    // Actualizar información del usuario en el contenido principal
    if (user) {
        const welcomeMsg = document.getElementById('welcomeMessage');
        const userRoleEl = document.getElementById('userRole');
        
        if (welcomeMsg) welcomeMsg.textContent = `Bienvenido, ${user.name || user.email}`;
        if (userRoleEl) userRoleEl.textContent = `Rol: ${userRoleName}`;
        
        // Actualizar información en el header y sidebar (después de que se carguen)
        setTimeout(() => {
            const headerUserName = document.getElementById('headerUserName');
            const headerUserRole = document.getElementById('headerUserRole');
            const sidebarUserRole = document.getElementById('sidebarUserRole');
            
            if (headerUserName) headerUserName.textContent = user.name || user.email;
            if (headerUserRole) headerUserRole.textContent = userRoleName;
            if (sidebarUserRole) sidebarUserRole.textContent = userRoleName;
        }, 200);
        
        // Detectar si hay un módulo específico en la URL (ej: ?module=semestre)
        const urlParams = new URLSearchParams(window.location.search);
        const moduleParam = urlParams.get('module');
        const currentPath = window.location.pathname;
        
        // Detectar si estamos en una ruta de módulo específico
        const isSemestrePath = currentPath.includes('semestre');
        
        console.log('🔍 Verificando parámetro module:', moduleParam);
        console.log('🔍 URL completa:', window.location.href);
        console.log('🔍 Search params:', window.location.search);
        console.log('🔍 Ruta actual:', currentPath);
        
        // Si está en /semestre O tiene module=semestre, cargar semestre
        if (moduleParam === 'semestre' || isSemestrePath) {
            // Cargar módulo de semestre
            console.log('🎯 Detectado semestre - NO cargar dashboard por defecto');
            console.log('⏳ Esperando a que todos los scripts se carguen...');
            
            // Función para intentar cargar el módulo
            const tryLoadSemestre = () => {
                console.log('🚀 Intentando cargar módulo de semestre');
                console.log('📋 Verificando función loadCronogramaContent:', typeof loadCronogramaContent);
                
                if (typeof loadCronogramaContent === 'function') {
                    console.log('✅ loadCronogramaContent encontrada, ejecutando...');
                    try {
                        loadCronogramaContent();
                    } catch (error) {
                        console.error('❌ Error al ejecutar loadCronogramaContent:', error);
                    }
                } else {
                    console.error('❌ loadCronogramaContent no está disponible');
                    console.log('Funciones window disponibles:', Object.keys(window).filter(k => k.toLowerCase().includes('load')));
                    
                    // Reintentar después de más tiempo (solo una vez más)
                    if (!tryLoadSemestre.retried) {
                        console.log('🔄 Reintentando en 1 segundo...');
                        tryLoadSemestre.retried = true;
                        setTimeout(tryLoadSemestre, 1000);
                    } else {
                        console.error('❌ No se pudo cargar el módulo de semestre después de reintentar');
                    }
                }
            };
            
            // Primer intento después de 500ms
            setTimeout(tryLoadSemestre, 500);
        } else if (moduleParam === 'gestion-usuarios') {
            // Cargar módulo de Gestión de Usuarios
            console.log('🎯 Detectado gestion-usuarios - NO cargar dashboard por defecto');
            console.log('⏳ Esperando a que todos los scripts se carguen...');
            
            // Función para intentar cargar el módulo
            const tryLoadGestionUsuarios = () => {
                console.log('🚀 Intentando cargar módulo de Gestión de Usuarios');
                console.log('📋 Verificando función loadGestionUsuariosContent:', typeof loadGestionUsuariosContent);
                
                if (typeof loadGestionUsuariosContent === 'function') {
                    console.log('✅ loadGestionUsuariosContent encontrada, ejecutando...');
                    try {
                        loadGestionUsuariosContent();
                    } catch (error) {
                        console.error('❌ Error al ejecutar loadGestionUsuariosContent:', error);
                    }
                } else {
                    console.error('❌ loadGestionUsuariosContent no está disponible');
                    console.log('Funciones window disponibles:', Object.keys(window).filter(k => k.toLowerCase().includes('load')));
                    
                    // Reintentar después de más tiempo (solo una vez más)
                    if (!tryLoadGestionUsuarios.retried) {
                        console.log('🔄 Reintentando en 1 segundo...');
                        tryLoadGestionUsuarios.retried = true;
                        setTimeout(tryLoadGestionUsuarios, 1000);
                    } else {
                        console.error('❌ No se pudo cargar el módulo de gestión de usuarios después de reintentar');
                    }
                }
            };
            
            // Primer intento después de 500ms
            setTimeout(tryLoadGestionUsuarios, 500);
        } else {
            // No hay módulo específico, cargar dashboard por defecto según el rol
            console.log('📊 Sin módulo específico, cargando dashboard por defecto');
            loadDashboardByRole(user.role);
        }
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
        'Administrador': 'Administrador',
        'tutor': 'Tutor',
        'Tutor': 'Tutor',
        'student': 'Estudiante',
        'Estudiante': 'Estudiante',
        'verifier': 'Verificador',
        'Verificador': 'Verificador'
    };
    return roles[role] || role;
}

// Normalizar rol para compatibilidad
function normalizeRole(role) {
    const roleMap = {
        'Administrador': 'admin',
        'admin': 'admin',
        'Tutor': 'tutor',
        'tutor': 'tutor',
        'Estudiante': 'student',
        'student': 'student',
        'Verificador': 'verifier',
        'verifier': 'verifier'
    };
    return roleMap[role] || role.toLowerCase();
}

// Cargar dashboard según rol
function loadDashboardByRole(role) {
    const normalizedRole = normalizeRole(role);
    console.log('📋 Cargando dashboard para rol:', role, '→', normalizedRole);
    
    switch(normalizedRole) {
        case 'admin':
            if (typeof loadAdminPanelContent === 'function') {
                console.log('✅ Cargando panel del administrador');
                loadAdminPanelContent();
            } else {
                console.error('❌ loadAdminPanelContent no está disponible');
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
        default:
            console.warn('⚠️ Rol desconocido:', role);
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
    
    console.log('🚀 DOM Cargado - Inicializando aplicación...');
    console.log('📍 Ruta actual:', path);
    
    // Detectar si estamos en una página que requiere el panel (funciona con URLs limpias y .html)
    const isPanelPage = path.includes('panel') || path.includes('dashboard') || path.includes('semestre') || path.includes('gestion-usuarios');
    
    if (isPanelPage) {
        console.log('✅ Detectada página de panel/módulo - Inicializando dashboard...');
        console.log('   Token:', localStorage.getItem('token') ? '✅ Presente' : '❌ Ausente');
        console.log('   User:', localStorage.getItem('user') ? '✅ Presente' : '❌ Ausente');
        initDashboard();
    } else {
        console.log('📄 Página pública - Verificando autenticación...');
        checkAuth();
    }
});
