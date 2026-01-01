// ============================================
// SIDEBAR PANEL - Sistema de Tutorías UNSAAC
// ============================================

console.log('%c🔄 SIDEBAR ACTUALIZADO - 27/Nov/2025 07:30', 'background: #00ff00; color: #000; font-weight: bold; padding: 5px;');

/**
 * Toggle sidebar collapse/expand (Desktop)
 */
function toggleSidebar() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return; // No funciona en móvil
    
    const sidebar = document.querySelector('.sidebar-panel');
    
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        
        // Guardar estado en localStorage
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
        
        console.log(`Sidebar ${isCollapsed ? 'colapsado' : 'expandido'}`);
    }
}

/**
 * Restaurar estado del sidebar al cargar (Desktop)
 */
function restoreSidebarState() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return; // No aplica en móvil
    
    const sidebar = document.querySelector('.sidebar-panel');
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    if (sidebar && isCollapsed) {
        sidebar.classList.add('collapsed');
        console.log('✅ Estado del sidebar restaurado: colapsado');
    }
}

/**
 * Toggle sidebar mobile
 */
function toggleSidebarMobile() {
    const sidebar = document.querySelector('.sidebar-panel');
    const body = document.body;
    
    if (!sidebar) {
        console.error('Sidebar no encontrado');
        return;
    }
    
    const isOpening = !sidebar.classList.contains('mobile-open');
    
    if (isOpening) {
        // Abrir sidebar
        sidebar.classList.add('mobile-open');
        body.classList.add('sidebar-mobile-open');
        console.log('📱 Sidebar móvil abierto');
    } else {
        // Cerrar sidebar
        sidebar.classList.remove('mobile-open');
        body.classList.remove('sidebar-mobile-open');
        console.log('📱 Sidebar móvil cerrado');
    }
}

/**
 * Cerrar sidebar mobile al hacer click fuera
 */
function handleClickOutside(event) {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    
    const sidebar = document.querySelector('.sidebar-panel');
    const body = document.body;
    
    if (!sidebar || !sidebar.classList.contains('mobile-open')) return;
    
    const isClickInsideSidebar = sidebar.contains(event.target);
    const isMobileMenuBtn = event.target.closest('.mobile-menu-btn');
    
    // Cerrar si se hace click fuera del sidebar y no es el botón de menú
    if (!isClickInsideSidebar && !isMobileMenuBtn) {
        sidebar.classList.remove('mobile-open');
        body.classList.remove('sidebar-mobile-open');
        console.log('📱 Sidebar cerrado (click fuera)');
    }
}

// Registrar listener
document.addEventListener('click', handleClickOutside);

// Cerrar sidebar al hacer click en un link del menú (móvil)
function closeSidebarOnNavigation() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    
    const sidebar = document.querySelector('.sidebar-panel');
    const body = document.body;
    
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        body.classList.remove('sidebar-mobile-open');
    }
    
    // Limpiar modales de gestión de usuarios y semestre al navegar
    if (typeof window.cleanupGestionUsuariosModals === 'function') {
        window.cleanupGestionUsuariosModals();
    }
    if (typeof window.cleanupSemestreModals === 'function') {
        window.cleanupSemestreModals();
    }
}

// Auto-cerrar sidebar en resize a desktop
function handleResponsiveSidebar() {
    const sidebar = document.querySelector('.sidebar-panel');
    const body = document.body;
    const isMobile = window.innerWidth <= 768;
    
    if (sidebar) {
        if (isMobile) {
            // En móvil: asegurar que está cerrado
            sidebar.classList.remove('mobile-open');
            body.classList.remove('sidebar-mobile-open');
        } else {
            // En desktop: remover clases móviles
            sidebar.classList.remove('mobile-open');
            body.classList.remove('sidebar-mobile-open');
        }
    }
}

/**
 * Función principal de inicialización
 */
function initializeSidebar() {
    console.log('🎨 Inicializando Sidebar Panel...');
    
    const isMobile = window.innerWidth <= 768;
    
    // Restaurar estado guardado (solo desktop)
    if (!isMobile) {
        restoreSidebarState();
    }
    
    // Cargar menú dinámico según rol
    loadSidebarMenu();
    
    // Adjuntar listeners a los links del menú
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    console.log(`📍 ${sidebarLinks.length} enlaces encontrados`);
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeSidebarOnNavigation();
            // Limpiar modales al navegar
            if (typeof window.cleanupGestionUsuariosModals === 'function') {
                window.cleanupGestionUsuariosModals();
            }
            if (typeof window.cleanupSemestreModals === 'function') {
                window.cleanupSemestreModals();
            }
        });
    });
    
    // Verificar botón toggle móvil
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    if (mobileBtn) {
        console.log('✅ Botón menú móvil encontrado');
    } else {
        console.warn('⚠️ Botón menú móvil NO encontrado');
    }
    
    console.log('✅ Sidebar inicializado correctamente');
}

/**
 * Cargar menú dinámico según el rol del usuario
 */
async function loadSidebarMenu() {
    // Obtener rol del token primero (rápido)
    const token = localStorage.getItem('token');
    let role = 'student'; // Rol por defecto
    
    if (token) {
        try {
            // Decodificar el token JWT para obtener el rol
            const payload = JSON.parse(atob(token.split('.')[1]));
            role = payload.role || 'student';
            console.log('👤 Rol del usuario:', role);
        } catch (error) {
            console.error('❌ Error al decodificar token:', error);
        }
    }
    
    const menuContainer = document.getElementById('sidebarMenuItems');
    if (!menuContainer) {
        console.error('❌ No se encontró el contenedor del menú');
        return;
    }
    
    // Configuración simplificada de menús por rol
    const menus = {
        admin: [
            { icon: 'fa-solid fa-house', text: 'Inicio', module: null, active: true },
            { icon: 'fa-solid fa-calendar-days', text: 'Semestre', module: 'semestre' },
            { icon: 'fa-solid fa-users-gear', text: 'Gestión de usuarios', module: 'gestion-usuarios' },
            { icon: 'fa-solid fa-clipboard-list', text: 'Asignaciones', module: 'asignaciones' },
            { icon: 'fa-solid fa-chart-line', text: 'Reportes', module: 'reportes' },
            { icon: 'fa-solid fa-magnifying-glass-chart', text: 'Historial', module: 'historial' },
            { icon: 'fa-solid fa-shield-halved', text: 'Auditoría', module: 'auditoria' },
        ],
        tutor: [
            { icon: 'fa-solid fa-house', text: 'Inicio', module: 'tutor', active: true },
            { icon: 'fa-solid fa-calendar-check', text: 'Agendamientos', module: 'asignacionTutor' },
            { icon: 'fa-solid fa-user-graduate', text: 'Mis estudiantes', module: 'mis-estudiantes' },
        ],
        student: [
            { icon: 'fa-solid fa-house', text: 'Inicio', module: 'estudiante', active: true },
            { icon: 'fa-solid fa-calendar-check', text: 'Mis sesiones', module: 'sesion-actual' },
            { icon: 'fa-solid fa-clock-rotate-left', text: 'Historial de tutorías', module: 'historial-tutorias' },
        ],
        verifier: [
            { icon: 'fa-solid fa-house', text: 'Inicio', module: 'verificador', active: true },
            { icon: 'fa-solid fa-users-gear', text: 'Administradores', module: 'administradores' },
            { icon: 'fa-solid fa-user-clock', text: 'Historial por Estudiante', module: 'historial-estudiante' },
            { icon: 'fa-solid fa-chalkboard-teacher', text: 'Seguimiento por Tutor', module: 'seguimiento-tutor' },
        ]
    };
    
    const menuItems = menus[role] || menus.student;
    
    // Obtener el módulo actual de la URL
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(s => s);
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    console.log('📍 Detección de módulo activo:');
    console.log('   Path:', currentPath);
    console.log('   Último segmento:', lastSegment);
    console.log('   Rol:', role);
    
    // Determinar si estamos en la página de inicio según el rol
    let isPanelPage = false;
    
    if (role === 'student') {
        // Para estudiantes, SOLO /estudiante es inicio
        isPanelPage = lastSegment === 'estudiante';
    } else if (role === 'tutor') {
        // Para tutores, SOLO /tutor es inicio
        isPanelPage = lastSegment === 'tutor';
    } else if (role === 'verifier') {
        // Para verificadores, SOLO /verificador es inicio
        isPanelPage = lastSegment === 'verificador';
    } else {
        // Para admin, /panel o /dashboard es inicio
        isPanelPage = lastSegment === 'panel' || 
                     lastSegment === 'dashboard' || 
                     lastSegment === 'Sistema-de-tutorias' ||
                     !lastSegment;
    }
    
    console.log('   ¿Es página de inicio?', isPanelPage);
    
    let menuHTML = '';
    menuItems.forEach((item) => { 
        // Determinar si este enlace es activo
        let isActive = false;
        
        if (item.module === null) {
            // El botón de Inicio se activa cuando estamos en panel, dashboard o raíz
            isActive = isPanelPage;
        } else {
            // Los demás botones se activan cuando el módulo coincide con la URL
            isActive = item.module === lastSegment;
        }
        
        const activeClass = isActive ? 'active' : '';
        const moduleAttr = item.module ? `data-module="${item.module}"` : '';
        
        if (isActive) {
            console.log('   ✅ Botón activo:', item.text);
        }
        
        menuHTML += `
            <li>
                <a href="#" class="${activeClass}" ${moduleAttr} onclick="navigateToModule(this); return false;">
                    <i class="${item.icon}"></i>
                    <span class="sidebar-menu-text">${item.text}</span>
                </a>
            </li>
        `;
    });
    
    menuContainer.innerHTML = menuHTML;
}

/**
 * Navegar a un módulo (función simplificada y unificada)
 */
function navigateToModule(element) {
    const module = element.getAttribute('data-module');
    const basePath = (window.APP_BASE_PATH || '').replace(/\/+$/, '');
    
    // Remover clase active de todos los enlaces y agregar al actual
    const allLinks = document.querySelectorAll('.sidebar-menu a');
    allLinks.forEach(link => link.classList.remove('active'));
    element.classList.add('active');
    
    // Cerrar sidebar en móvil
    closeSidebarOnNavigation();
    
    console.log('🎯 Navegando a módulo:', module);
    
    // Si no hay módulo, ir a inicio
    if (!module || module === 'null') {
        // Obtener el rol del usuario
        const token = localStorage.getItem('token');
        let role = 'student';
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                role = payload.role || 'student';
            } catch (error) {
                console.error('❌ Error al decodificar token:', error);
            }
        }
        
        // Cambiar URL según el rol
        let homeUrl = `${basePath}/panel`;
        if (role === 'student') {
            homeUrl = `${basePath}/estudiante`;
        } else if (role === 'tutor') {
            homeUrl = `${basePath}/tutor`;
        } else if (role === 'verifier') {
            homeUrl = `${basePath}/verificador`;
        }
        
        window.history.pushState({module: 'inicio'}, '', homeUrl);
        
        // Cargar contenido según el rol
        console.log('📍 Cargando inicio para rol:', role);
        
        if (role === 'student' && typeof window.loadEstudianteContent === 'function') {
            window.loadEstudianteContent();
        } else if (role === 'tutor' && typeof window.loadTutorDashboard === 'function') {
            window.loadTutorDashboard();
        } else if (role === 'admin' && typeof window.loadAdminPanelContent === 'function') {
            window.loadAdminPanelContent();
        } else if (role === 'verifier' && typeof window.loadVerifierDashboard === 'function') {
            window.loadVerifierDashboard();
        } else {
            // Fallback: cargar dashboard genérico
            console.log('⚠️ Función de dashboard no encontrada, usando loadDashboardByRole');
            if (typeof window.loadDashboardByRole === 'function') {
                window.loadDashboardByRole(role);
            }
        }
        
        return;
    }
    
    // Mapeo de módulos a funciones de carga
    const moduleLoaders = {
        'semestre': 'loadCronogramaContent',
        'gestion-usuarios': 'loadGestionUsuariosContent',
        'asignaciones': 'loadAsignacionesContent',
        'reportes': 'loadReportesContent',
        'auditoria': 'loadAuditoriaContent',
        'historial': 'loadHistorialContent', // Módulo de historial de administrador
        'buscar-historial': null, // Página independiente
        // Tutor
        'tutor': 'loadTutorDashboard',
        'nueva-sesion': 'loadNuevaSesionContent',
        'asignacionTutor': 'loadAsignacionTutorContent',
        'mis-estudiantes': 'loadMisEstudiantesContent',
        // Estudiante
        'estudiante': 'loadEstudianteContent',
        'sesion-actual': 'loadSesionActualContent',
        'historial-tutorias': 'loadHistorialEstudianteContent',
        // Verificador
        'verificador': 'loadVerifierDashboard',
        'administradores': 'loadAdministradoresContent',
        'historial-estudiante': 'loadHistorialEstudianteVerificadorContent',
        'seguimiento-tutor': 'loadSeguimientoTutorContent'
    };
    
    const loaderFn = moduleLoaders[module];
    
    console.log('📋 Función a ejecutar:', loaderFn, '| Tipo:', typeof window[loaderFn]);
    
    // Si el módulo requiere página completa (como buscar-historial)
    if (loaderFn === null) {
        window.location.href = `${basePath}/${module}`;
        return;
    }
    
    // Cambiar URL sin recargar
    window.history.pushState({module: module}, '', `${basePath}/${module}`);
    
    // Cargar el módulo dinámicamente
    if (loaderFn && typeof window[loaderFn] === 'function') {
        console.log(`✅ Ejecutando ${loaderFn}()...`);
        window[loaderFn]();
        console.log(`✅ Módulo ${module} cargado`);
    } else {
        // Intentar esperar un poco por si el script aún se está cargando
        setTimeout(() => {
            if (loaderFn && typeof window[loaderFn] === 'function') {
                console.log(`✅ Ejecutando ${loaderFn}() (retry)...`);
                window[loaderFn]();
                console.log(`✅ Módulo ${module} cargado`);
            } else {
                console.warn(`⚠️ Módulo ${module} en desarrollo o función no encontrada`);
                console.warn(`   Función buscada: ${loaderFn}`);
                console.warn(`   Tipo encontrado: ${typeof window[loaderFn]}`);
                showNotification(`Módulo "${module}" en desarrollo`, 'info');
            }
        }, 100);
    }
}

/**
 * Listener para resize (debounced)
 */
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResponsiveSidebar, 250);
});

// ========== EXPONER FUNCIONES GLOBALES ==========
window.toggleSidebar = toggleSidebar;
window.toggleSidebarMobile = toggleSidebarMobile;
window.restoreSidebarState = restoreSidebarState;
window.closeSidebarOnNavigation = closeSidebarOnNavigation;
window.initializeSidebar = initializeSidebar;
window.loadSidebarMenu = loadSidebarMenu;
window.navigateToModule = navigateToModule;

