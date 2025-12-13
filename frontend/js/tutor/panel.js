// panel.js - Inicialización del panel del tutor

console.log('📋 Panel.js del Tutor cargado');

/**
 * Inicializar el panel del tutor
 */
async function initTutorPanel() {
    console.log('🎯 Inicializando panel del tutor...');
    
    try {
        // Cargar el dashboard del tutor
        if (typeof loadTutorDashboard === 'function') {
            await loadTutorDashboard();
            console.log('✅ Dashboard del tutor cargado correctamente');
        } else {
            console.error('❌ loadTutorDashboard no está definida');
        }
    } catch (error) {
        console.error('❌ Error al inicializar panel del tutor:', error);
    }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTutorPanel);
} else {
    initTutorPanel();
}

// Exponer función globalmente
window.initTutorPanel = initTutorPanel;
