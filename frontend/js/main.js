// main.js - Lógica general y navegación
console.log('📜 main.js cargado correctamente');

// Obtener configuración del sistema
async function loadAppConfig() {
    try {
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const apiUrl = basePath.replace(/\/$/, '') + '/api';
        
        const response = await fetch(`${apiUrl}/config`);
        const config = await response.json();
        
        if (config.success) {
            window.APP_VERSION = config.data.version;
            window.APP_NAME = config.data.app_name;
            updateFooterVersion(config.data.version);
        }
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        window.APP_VERSION = '1.0.0';
    }
}

// Actualizar versión en el footer
function updateFooterVersion(version) {
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        const footer = footerContainer.querySelector('footer');
        if (footer) {
            footer.style.display = 'block';
            footer.style.visibility = 'visible';
            footer.style.opacity = '1';
        }
    }
    
    const versionElements = document.querySelectorAll('.app-version');
    versionElements.forEach(el => {
        el.textContent = version;
    });
}

// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    const basePath = window.APP_BASE_PATH || '';

    // Normalizar ruta relativa al proyecto para evitar falsos positivos
    // Ej: "/Sistema-de-tutorias/" contiene "tutor" por "tutorias".
    let relPath = path;
    if (basePath && relPath.startsWith(basePath)) {
        relPath = relPath.slice(basePath.length);
    }
    const segments = relPath.split('/').filter(Boolean);
    const firstSeg = segments[0] || '';
    
    console.log('🔐 checkAuth() ejecutado');
    console.log('   - Path:', path);
    console.log('   - Token presente:', token ? 'SÍ' : 'NO');
    
    const isPanel = firstSeg === 'panel' || firstSeg === 'dashboard';
    const isTutor = firstSeg === 'tutor';
    const isSemestre = firstSeg === 'semestre';
    const isGestionUsuarios = firstSeg === 'gestion-usuarios';
    const isAsignaciones = firstSeg === 'asignaciones';
    const isReportes = firstSeg === 'reportes';
    const isAuditoria = firstSeg === 'auditoria';
    const isAsignacionTutor = firstSeg === 'asignacionTutor';
    const isMisEstudiantes = firstSeg === 'mis-estudiantes';
    const isLogin = firstSeg === 'login';
    const isVerify = firstSeg === 'verify';
    const isIndex = segments.length === 0 || firstSeg === 'index';
    
    const isProtectedPage = isPanel || isTutor || isSemestre || isGestionUsuarios || isAsignaciones || isReportes || isAuditoria || isAsignacionTutor || isMisEstudiantes;
    
    console.log('   - Es página protegida:', isProtectedPage);
    console.log('   - Es tutor:', isTutor);
    
    if (!token && isProtectedPage) {
        console.log('❌ Sin token, redirigiendo a login');
        window.location.href = basePath + '/login';
        return false;
    }
    
    if (token && (isLogin || isVerify || isIndex)) {
        // Redirigir según el rol del usuario
        const user = getUserFromToken();
        let redirectPath = '/panel';
        
        if (user && (user.role === 'tutor' || user.role === 'Tutor')) {
            redirectPath = '/tutor';
            console.log('➡️ Redirigiendo tutor autenticado a /tutor');
        }
        
        window.location.href = basePath + redirectPath;
        return false;
    }
    
    console.log('✅ checkAuth() - acceso permitido');
    return true;
}

// Obtener datos del usuario desde el token
function getUserFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        const payload = window.decodeJwtPayload ? window.decodeJwtPayload(token) : JSON.parse(atob(token.split('.')[1]));
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
        const fullPath = componentPath.startsWith('/') ? componentPath : 
                        `${window.APP_BASE_PATH || '/Sistema-de-tutorias'}/${componentPath}`;
        
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`❌ Elemento #${elementId} NO EXISTE`);
            return;
        }
        
        const response = await fetch(fullPath);
        
        if (!response.ok) {
            console.error(`❌ Error HTTP ${response.status} al cargar ${fullPath}`);
            return;
        }
        
        const html = await response.text();
        element.innerHTML = html;
        
        // Asegurar visibilidad de componentes principales
        if (['header-container', 'sidebar-container', 'footer-container'].includes(elementId)) {
            element.style.display = 'block';
            element.style.visibility = 'visible';
            element.style.opacity = '1';
        }
        
    } catch (error) {
        console.error(`❌ Error cargando ${componentPath}:`, error);
    }
}

// Inicializar dashboard
async function initDashboard() {
    console.log('='.repeat(50));
    console.log('🚀 INICIANDO DASHBOARD');
    console.log('URL actual:', window.location.href);
    console.log('Path:', window.location.pathname);
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
    await loadAppConfig();
    
    // Cargar componentes
    const headerPath = window.PATH?.header() || 'frontend/components/header-panel.html';
    await loadComponent('header-container', headerPath);
    const headerCheck = document.getElementById('header-container');
    
    // Asegurar visibilidad del header
    if (headerCheck && headerCheck.innerHTML.length > 0) {
        headerCheck.style.display = 'block';
        headerCheck.style.visibility = 'visible';
        headerCheck.style.opacity = '1';
    }
    
    // Actualizar información del header
    if (typeof window.updateHeaderPanelInfo === 'function') {
        setTimeout(() => window.updateHeaderPanelInfo(), 100);
    }
    
    const sidebarPath = window.PATH?.sidebar() || 'frontend/components/sidebar-panel.html';
    await loadComponent('sidebar-container', sidebarPath);
    
    // Asegurar visibilidad del sidebar
    const sidebarCheck = document.getElementById('sidebar-container');
    if (sidebarCheck && sidebarCheck.innerHTML.length > 0) {
        sidebarCheck.style.display = 'block';
        sidebarCheck.style.visibility = 'visible';
        sidebarCheck.style.opacity = '1';
    }
    
    // Inicializar funcionalidad del sidebar
    if (typeof window.initializeSidebar === 'function') {
        setTimeout(() => window.initializeSidebar(), 150);
    }
    
    const footerPath = window.PATH?.footer() || 'frontend/components/footer-panel.html';
    await loadComponent('footer-container', footerPath);
    const footerCheck = document.getElementById('footer-container');
    
    if (footerCheck && footerCheck.innerHTML.length > 0) {
        footerCheck.style.display = 'block';
        footerCheck.style.visibility = 'visible';
        footerCheck.style.opacity = '1';
        
        const footerElement = footerCheck.querySelector('footer');
        if (footerElement) {
            footerElement.style.display = 'block';
            footerElement.style.visibility = 'visible';
            footerElement.style.opacity = '1';
        }
    }
    
    // Obtener datos del usuario
    const user = getUserFromToken();
    const userRole = user ? normalizeRole(user.role) : null;
    
    // Cargar modales
    const modalsPath = window.PATH?.modals() || 'frontend/components/modals.html';
    await loadComponent('modals-container', modalsPath);
    const modalsCheck = document.getElementById('modals-container');
    
    // Cargar modales específicos del rol
    if (userRole === 'admin') {
        const adminModalsPath = window.PATH?.adminModals() || 
                               '/Sistema-de-tutorias/frontend/components/administrador/modals.html';
        try {
            const response = await fetch(adminModalsPath);
            if (response.ok) {
                const html = await response.text();
                modalsCheck.insertAdjacentHTML('beforeend', html);
            }
        } catch (error) {
            console.error('Error cargando modales de administrador:', error);
        }
    }
    
    // Actualizar versión en el footer
    setTimeout(() => {
        if (window.APP_VERSION) {
            updateFooterVersion(window.APP_VERSION);
        }
    }, 100);
    
    // Actualizar información del usuario
    if (user) {
        const userRoleName = getRoleName(user.role);
        const welcomeMsg = document.getElementById('welcomeMessage');
        const userRoleEl = document.getElementById('userRole');
        
        if (welcomeMsg) welcomeMsg.textContent = `Bienvenido, ${user.name || user.email}`;
        if (userRoleEl) userRoleEl.textContent = `Rol: ${userRoleName}`;
        
        setTimeout(() => {
            const headerUserName = document.getElementById('headerUserName');
            const headerUserRole = document.getElementById('headerUserRole');
            const sidebarUserRole = document.getElementById('sidebarUserRole');
            
            if (headerUserName) headerUserName.textContent = user.name || user.email;
            if (headerUserRole) headerUserRole.textContent = userRoleName;
            if (sidebarUserRole) sidebarUserRole.textContent = userRoleName;
        }, 200);
        
        // ============= DETECCIÓN DE MÓDULOS =============
        const currentPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        const moduleParam = urlParams.get('module');
        
        console.log('='.repeat(60));
        console.log('🔍 DETECCIÓN DE MÓDULO');
        console.log('Path completo:', currentPath);
        console.log('Parámetro module:', moduleParam);
        console.log('Rol del usuario:', user.role);
        console.log('='.repeat(60));
        
        // Configuración de módulos
        const modulesConfig = {
            'semestre': {
                paths: ['/semestre', '/Sistema-de-tutorias/semestre'],
                param: 'semestre',
                loadFn: 'loadCronogramaContent'
            },
            'gestion-usuarios': {
                paths: ['/gestion-usuarios', '/Sistema-de-tutorias/gestion-usuarios'],
                param: 'gestion-usuarios',
                loadFn: 'loadGestionUsuariosContent'
            },
            'asignaciones': {
                paths: ['/asignaciones', '/Sistema-de-tutorias/asignaciones'],
                param: 'asignaciones',
                loadFn: 'loadAsignacionesContent'
            },
            'reportes': {
                paths: ['/reportes', '/Sistema-de-tutorias/reportes'],
                param: 'reportes',
                loadFn: 'loadReportesContent'
            },
            'historial': {
                paths: ['/historial', '/Sistema-de-tutorias/historial'],
                param: 'historial',
                loadFn: 'loadHistorialContent'
            },
            'auditoria': {
                paths: ['/auditoria', '/Sistema-de-tutorias/auditoria'],
                param: 'auditoria',
                loadFn: 'loadAuditoriaContent'
            },
            'tutor': {
                paths: ['/tutor', '/Sistema-de-tutorias/tutor'],
                param: 'tutor',
                loadFn: 'loadTutorDashboard'
            },
            'asignacionTutor': {
                paths: ['/asignacionTutor', '/Sistema-de-tutorias/asignacionTutor'],
                param: 'asignacionTutor',
                loadFn: 'loadAsignacionTutorContent'
            },
            'mis-estudiantes': {
                paths: ['/mis-estudiantes', '/Sistema-de-tutorias/mis-estudiantes'],
                param: 'mis-estudiantes',
                loadFn: 'loadMisEstudiantesContent'
            }
        };
        
        // Buscar módulo coincidente
        let moduleToLoad = null;
        
        for (const [moduleName, config] of Object.entries(modulesConfig)) {
            const matchPath = config.paths.some(p => {
                const matches = currentPath.includes(p);
                if (matches) {
                    console.log(`✅ Match encontrado: "${moduleName}" - Path: ${p}`);
                }
                return matches;
            });
            const matchParam = moduleParam === config.param;
            
            if (matchPath || matchParam) {
                moduleToLoad = { name: moduleName, config };
                console.log('🎯 Módulo seleccionado:', moduleName);
                break;
            }
        }
        
        if (moduleToLoad) {
            console.log('✅ Módulo detectado:', moduleToLoad.name);
            console.log('📋 Función a ejecutar:', moduleToLoad.config.loadFn);
            
            const tryLoadModule = () => {
                const loadFn = window[moduleToLoad.config.loadFn];
                
                console.log('🔍 Verificando función:', moduleToLoad.config.loadFn);
                console.log('📦 Tipo:', typeof loadFn);
                console.log('📦 Función disponible:', loadFn ? 'SÍ' : 'NO');
                
                if (typeof loadFn === 'function') {
                    console.log('✅ Ejecutando función de carga...');
                    try {
                        loadFn();
                        console.log('✅ Función ejecutada exitosamente');
                    } catch (error) {
                        console.error(`❌ Error al ejecutar ${moduleToLoad.config.loadFn}:`, error);
                    }
                } else {
                    console.warn('⚠️ Función no disponible aún');
                    if (!tryLoadModule.attempts) {
                        tryLoadModule.attempts = 0;
                    }
                    tryLoadModule.attempts++;
                    
                    if (tryLoadModule.attempts < 5) {
                        console.log(`🔄 Reintento ${tryLoadModule.attempts}/5 en 500ms...`);
                        setTimeout(tryLoadModule, 500);
                    } else {
                        console.error(`❌ No se pudo cargar el módulo ${moduleToLoad.name} después de ${tryLoadModule.attempts} intentos`);
                        const dashboardContent = document.getElementById('dashboardContent');
                        if (dashboardContent) {
                            dashboardContent.innerHTML = `<div class="p-6 text-red-600">Error: No se pudo cargar el módulo ${moduleToLoad.name}. La función ${moduleToLoad.config.loadFn} no está disponible.</div>`;
                        }
                    }
                }
            };
            
            setTimeout(tryLoadModule, 300);
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
            console.log('🎯 Cargando dashboard del tutor...');
            if (typeof loadTutorDashboard === 'function') {
                console.log('✅ Ejecutando loadTutorDashboard()');
                loadTutorDashboard();
            } else {
                console.error('❌ loadTutorDashboard no está disponible');
                console.log('Funciones disponibles:', Object.keys(window).filter(k => k.includes('Tutor')));
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
    const basePath = window.APP_BASE_PATH || '';
    let relPath = path;
    if (basePath && relPath.startsWith(basePath)) {
        relPath = relPath.slice(basePath.length);
    }
    const segments = relPath.split('/').filter(Boolean);
    const firstSeg = segments[0] || '';
    
    console.log('🚀 DOM Cargado - Inicializando aplicación...');
    console.log('📍 Ruta actual:', path);
    
    // Detectar si estamos en una página que requiere el panel (funciona con URLs limpias y .html)
    const isPanelPage = firstSeg === 'panel' ||
                       firstSeg === 'dashboard' ||
                       firstSeg === 'tutor' ||
                       firstSeg === 'semestre' ||
                       firstSeg === 'gestion-usuarios' ||
                       firstSeg === 'asignaciones' ||
                       firstSeg === 'reportes' ||
                       firstSeg === 'historial' ||
                       firstSeg === 'auditoria' ||
                       firstSeg === 'asignacionTutor' ||
                       firstSeg === 'mis-estudiantes';
    
    console.log('🔍 Detección de página:');
    console.log('   - isPanelPage:', isPanelPage);
    console.log('   - firstSeg:', firstSeg);
    console.log('   - isTutor:', firstSeg === 'tutor');
    console.log('   - isPanel:', firstSeg === 'panel');
    
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
