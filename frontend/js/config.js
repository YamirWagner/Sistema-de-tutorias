/* ============================================================
   CONFIGURACIÓN GLOBAL - Sistema de Tutorías UNSAAC
   ============================================================ */

(function() {
    'use strict';

    // Configuración base del proyecto
    window.APP_BASE_PATH = '/Sistema-de-tutorias';
    
    window.APP_CONFIG = {
        BASE_PATH: '/Sistema-de-tutorias',
        
        PATHS: {
            FRONTEND: '/Sistema-de-tutorias/frontend',
            BACKEND: '/Sistema-de-tutorias/backend',
            API: '/Sistema-de-tutorias/backend/api',
            ASSETS: '/Sistema-de-tutorias/frontend/assets',
            CSS: '/Sistema-de-tutorias/frontend/css',
            JS: '/Sistema-de-tutorias/frontend/js',
            COMPONENTS: '/Sistema-de-tutorias/frontend/components'
        },
        
        COMPONENTS: {
            HEADER: '/Sistema-de-tutorias/frontend/components/header-panel.html',
            SIDEBAR: '/Sistema-de-tutorias/frontend/components/sidebar-panel.html',
            FOOTER: '/Sistema-de-tutorias/frontend/components/footer-panel.html',
            MODALS: '/Sistema-de-tutorias/frontend/components/modals.html',
            
            ADMIN: {
                PANEL: '/Sistema-de-tutorias/frontend/components/administrador/panel.html',
                ASIGNACIONES: '/Sistema-de-tutorias/frontend/components/administrador/asignaciones.html',
                REPORTES: '/Sistema-de-tutorias/frontend/components/administrador/reportes.html',
                SEMESTRE: '/Sistema-de-tutorias/frontend/components/administrador/semestre.html',
                GESTION_USUARIOS: '/Sistema-de-tutorias/frontend/components/administrador/gestionUsuarios.html',
                MODALS: '/Sistema-de-tutorias/frontend/components/administrador/modals.html'
            }
        },
        
        API: {
            BASE_URL: '/Sistema-de-tutorias/backend/api'
        },
        
        ASSETS: {
            LOGO: '/Sistema-de-tutorias/frontend/assets/Logo-UNSAAC.webp'
        }
    };

    // Helpers simplificados
    window.PATH = {
        header: () => window.APP_CONFIG.COMPONENTS.HEADER,
        sidebar: () => window.APP_CONFIG.COMPONENTS.SIDEBAR,
        footer: () => window.APP_CONFIG.COMPONENTS.FOOTER,
        modals: () => window.APP_CONFIG.COMPONENTS.MODALS,
        adminPanel: () => window.APP_CONFIG.COMPONENTS.ADMIN.PANEL,
        adminAsignaciones: () => window.APP_CONFIG.COMPONENTS.ADMIN.ASIGNACIONES,
        adminReportes: () => window.APP_CONFIG.COMPONENTS.ADMIN.REPORTES,
        adminSemestre: () => window.APP_CONFIG.COMPONENTS.ADMIN.SEMESTRE,
        adminGestionUsuarios: () => window.APP_CONFIG.COMPONENTS.ADMIN.GESTION_USUARIOS,
        adminModals: () => window.APP_CONFIG.COMPONENTS.ADMIN.MODALS,
        logo: () => window.APP_CONFIG.ASSETS.LOGO,
        css: (subpath = '') => window.APP_CONFIG.PATHS.CSS + (subpath ? '/' + subpath : '')
    };

    console.log('✅ Configuración global cargada');

})();
