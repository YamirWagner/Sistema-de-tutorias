/* ============================================================
   CONFIGURACIÓN GLOBAL - Sistema de Tutorías UNSAAC
   DETECCIÓN AUTOMÁTICA DE RUTAS (funciona con cualquier dominio)
   ============================================================ */

(function() {
    'use strict';

    // ============================================
    // DETECCIÓN AUTOMÁTICA DEL BASE PATH
    // ============================================
    
    /**
     * Detecta automáticamente el base path del proyecto
     * Funciona tanto en desarrollo local como en producción con cualquier dominio
     * 
     * Ejemplos:
     * - http://localhost/Sistema-de-tutorias/  → BASE_PATH = '/Sistema-de-tutorias'
     * - https://tudominio.com/                 → BASE_PATH = ''
     * - https://miapp.ejemplo.com/tutorias/    → BASE_PATH = '/tutorias'
     */
    function detectBasePath() {
        // Obtener la ruta del script actual
        const currentScript = document.currentScript || document.querySelector('script[src*="config.js"]');
        
        if (currentScript && currentScript.src) {
            const scriptUrl = new URL(currentScript.src);
            const scriptPath = scriptUrl.pathname;
            
            // Remover sufijo del path del script para obtener el base path
            // Soporta tanto '/frontend/js/config.js' como '/js/config.js'
            let basePath = scriptPath
                .replace(/\/frontend\/js\/config\.js$/, '')
                .replace(/\/js\/config\.js$/, '');

            return basePath || '';
        }
        
        // Fallback: detectar desde la ubicación actual del documento
        const pathname = window.location.pathname;
        
        // Si estamos en la raíz o en páginas principales
        if (pathname === '/' || pathname === '/index.html' || pathname === '/login' || pathname === '/panel') {
            return '';
        }
        
        // Si detectamos /frontend/ en la ruta, extraer el base path
        if (pathname.includes('/frontend/')) {
            const parts = pathname.split('/frontend/');
            return parts[0] || '';
        }
        
        // Por defecto, asumir que está en la raíz del dominio
        return '';
    }
    
    // Detectar el base path automáticamente
    const BASE_PATH = detectBasePath();
    
    // Log para debug (puedes comentar en producción)
    console.log('🔍 Base Path detectado:', BASE_PATH || '(raíz del dominio)');
    
    // ============================================
    // CONFIGURACIÓN GLOBAL
    // ============================================
    
    window.APP_BASE_PATH = BASE_PATH;
    
    window.APP_CONFIG = {
        BASE_PATH: BASE_PATH,
        
        PATHS: {
            FRONTEND: BASE_PATH + '/frontend',
            BACKEND: BASE_PATH + '/backend',
            API: BASE_PATH + '/api',
            ASSETS: BASE_PATH + '/frontend/assets',
            CSS: BASE_PATH + '/frontend/css',
            JS: BASE_PATH + '/frontend/js',
            COMPONENTS: BASE_PATH + '/frontend/components'
        },
        
        COMPONENTS: {
            HEADER: BASE_PATH + '/frontend/components/header-panel.html',
            SIDEBAR: BASE_PATH + '/frontend/components/sidebar-panel.html',
            FOOTER: BASE_PATH + '/frontend/components/footer-panel.html',
            MODALS: BASE_PATH + '/frontend/components/modals.html',
            
            ADMIN: {
                PANEL: BASE_PATH + '/frontend/components/administrador/panel.html',
                ASIGNACIONES: BASE_PATH + '/frontend/components/administrador/asignaciones.html',
                REPORTES: BASE_PATH + '/frontend/components/administrador/reportes.html',
                SEMESTRE: BASE_PATH + '/frontend/components/administrador/semestre.html',
                GESTION_USUARIOS: BASE_PATH + '/frontend/components/administrador/gestionUsuarios.html',
                HISTORIAL: BASE_PATH + '/frontend/components/administrador/historial.html',
                AUDITORIA: BASE_PATH + '/frontend/components/administrador/auditoria.html',
                MODALS: BASE_PATH + '/frontend/components/administrador/modals.html'
            }
        },
        
        API: {
            BASE_URL: BASE_PATH + '/api'
        },
        
        ASSETS: {
            LOGO: BASE_PATH + '/frontend/assets/Logo-UNSAAC.webp'
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
        adminHistorial: () => window.APP_CONFIG.COMPONENTS.ADMIN.HISTORIAL,
        adminAuditoria: () => window.APP_CONFIG.COMPONENTS.ADMIN.AUDITORIA,
        adminModals: () => window.APP_CONFIG.COMPONENTS.ADMIN.MODALS,
        logo: () => window.APP_CONFIG.ASSETS.LOGO,
        css: (subpath = '') => window.APP_CONFIG.PATHS.CSS + (subpath ? '/' + subpath : ''),
        component: (subpath = '') => window.APP_CONFIG.PATHS.COMPONENTS + (subpath ? '/' + subpath : '')
    };

    console.log('✅ Configuración global cargada');

})();
