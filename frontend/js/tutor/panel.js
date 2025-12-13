// panel.js - Inicialización del panel del tutor

console.log('📋 Panel.js del Tutor cargado');

/**
 * Inicializar el panel del tutor
 * Esta función se expone globalmente pero NO se ejecuta automáticamente
 * porque el flujo de carga lo maneja main.js
 */
async function initTutorPanel() {
    console.log('🎯 initTutorPanel() llamada');
    
    try {
        // Cargar el dashboard del tutor
        if (typeof loadTutorDashboard === 'function') {
            await loadTutorDashboard();
            console.log('✅ Dashboard del tutor cargado correctamente');
        } else {
            console.error('❌ loadTutorDashboard no está definida');
            console.log('Funciones disponibles:', Object.keys(window).filter(k => k.includes('Tutor')));
        }
    } catch (error) {
        console.error('❌ Error al inicializar panel del tutor:', error);
    }
}

// Exponer función globalmente (NO ejecutar automáticamente)
window.initTutorPanel = initTutorPanel;

console.log('✅ panel.js: initTutorPanel disponible globalmente');
