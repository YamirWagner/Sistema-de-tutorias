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
        link.addEventListener('click', closeSidebarOnNavigation);
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
    
    const menus = {
        admin: [
            { icon: 'fa-solid fa-house', text: 'Inicio', action: 'goToHome', active: true },
            { icon: 'fa-solid fa-calendar-days', text: 'Semestre', action: 'showScheduleSection' },
            { icon: 'fa-solid fa-users-gear', text: 'Gestión de usuarios', action: 'showUserManagement' },
            { icon: 'fa-solid fa-clipboard-list', text: 'Asignaciones', action: 'showAssignmentsSection' },
            { icon: 'fa-solid fa-chart-line', text: 'Reportes', action: 'showReportsSection' },
            { icon: 'fa-solid fa-magnifying-glass-chart', text: 'Buscar Historial', action: 'showSearchHistory' },
            { icon: 'fa-solid fa-shield-halved', text: 'Auditoría', action: 'showAuditSection' },
        ],
        tutor: [
            { icon: 'fa-solid fa-house', text: 'Inicio', action: 'goToHome', active: true },
            { icon: 'fa-solid fa-plus-circle', text: 'Nueva Sesión', action: 'createNewSession' },
            { icon: 'fa-solid fa-calendar-check', text: 'Agendamientos', action: 'showScheduledSessions' },
            { icon: 'fa-solid fa-user-graduate', text: 'Mis estudiantes', action: 'showMyStudents' },
        ],
        student: [
            { icon: 'fa-solid fa-house', text: 'Inicio', action: 'goToHome', active: true },
            { icon: 'fa-solid fa-chalkboard-user', text: 'Mi Tutor', action: 'showMyTutor' },
            { icon: 'fa-solid fa-clock-rotate-left', text: 'Historial de Sesiones', action: 'showSessionHistory' },
            { icon: 'fa-solid fa-book-open', text: 'Materiales de Apoyo', action: 'showMaterials' },
            { icon: 'fa-solid fa-user-circle', text: 'Mi Perfil', action: 'showMyProfile' },
        ],
        verifier: [
            { icon: 'fa-solid fa-clipboard-check', text: 'Lista de Asistencias', action: 'showAttendanceList', active: true },
            { icon: 'fa-solid fa-search', text: 'Búsqueda de Tutorías', action: 'searchTutorials' },
            { icon: 'fa-solid fa-user-clock', text: 'Historial por Estudiante', action: 'showStudentHistory' },
            { icon: 'fa-solid fa-chalkboard-teacher', text: 'Seguimiento por Tutor', action: 'showTutorTracking' },
        ]
    };
    
    const menuItems = menus[role] || menus.student;
    
    console.log(`📋 Cargando ${menuItems.length} opciones para rol: ${role}`);
    
    let menuHTML = '';
    menuItems.forEach((item) => { 
        const activeClass = item.active ? 'active' : '';
        
        menuHTML += `
            <li>
                <a href="#" class="${activeClass}" onclick="handleMenuAction('${item.action}'); return false;">
                    <i class="${item.icon}"></i>
                    <span class="sidebar-menu-text">${item.text}</span>
                </a>
            </li>
        `;
    });
    
    menuContainer.innerHTML = menuHTML;
}

/**
 * Manejar acciones del menú
 */
function handleMenuAction(action) {
    console.log('═══════════════════════════════════════');
    console.log('🎯 Acción del menú recibida:', action);
    console.log('📝 Tipo:', typeof action);
    console.log('═══════════════════════════════════════');
    
    // Cerrar sidebar en móvil
    closeSidebarOnNavigation();
    
    switch(action) {
        case 'goToHome':
            // Recargar el dashboard completo con semestre
            if (typeof loadAdminContent === 'function') {
                loadAdminContent();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case 'showSemesterSection':
            // Mostrar/recargar sección de semestre
            if (typeof loadSemesterContent === 'function') {
                loadSemesterContent();
            }
            document.querySelector('.semester-section')?.scrollIntoView({ behavior: 'smooth' });
            break;
        case 'showScheduleSection':
            // Cargar y mostrar cronograma
            console.log('🎯 Acción showScheduleSection ejecutada');
            console.log('🔍 loadCronogramaContent disponible?', typeof loadCronogramaContent);
            if (typeof loadCronogramaContent === 'function') {
                console.log('✅ Llamando a loadCronogramaContent()');
                loadCronogramaContent();
                setTimeout(() => {
                    const section = document.querySelector('.cronograma-section');
                    console.log('📍 Sección encontrada?', section);
                    section?.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            } else {
                console.error('❌ loadCronogramaContent no está disponible');
                showNotification('Error: Módulo de cronograma no cargado', 'error');
            }
            break;
        case 'showAssignmentSection':
            showNotification('Función de asignación en desarrollo', 'info');
            break;
        case 'showAssignmentsSection':
            loadActiveAssignments();
            document.querySelector('#assignmentsContainer')?.scrollIntoView({ behavior: 'smooth' });
            break;
        case 'showTutorPanel':
            showNotification('Panel de tutor en desarrollo', 'info');
            break;
        case 'showSessionsSection':
            showNotification('Sección de sesiones en desarrollo', 'info');
            break;
        case 'showMySessions':
            showNotification('Mis sesiones en desarrollo', 'info');
            break;
        case 'showMyStudents':
            showNotification('Mis estudiantes en desarrollo', 'info');
            break;
        case 'showReports':
            loadReportsSection();
            break;
        case 'searchTutors':
            showNotification('Buscar tutores en desarrollo', 'info');
            break;
        case 'showMaterials':
            showNotification('Materiales en desarrollo', 'info');
            break;
        case 'verifySessions':
            showNotification('Verificar sesiones en desarrollo', 'info');
            break;
        case 'showHistory':
            showNotification('Historial en desarrollo', 'info');
            break;
        case 'logout':
            logout();
            break;
        default:
            showNotification('Función en desarrollo', 'info');
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
window.handleMenuAction = handleMenuAction;
