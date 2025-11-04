// ========================================
// HEADER PANEL - Sistema de Tutorías UNSAAC
// ========================================

/**
 * Actualiza la información del semestre en el header
 */
function updateSemesterInfo() {
    try {
        const user = getUserFromToken();
        
        if (user && user.semestre) {
            const semesterElement = document.getElementById('headerSemester');
            if (semesterElement) {
                semesterElement.textContent = user.semestre;
            }
        }
        
        // Calcular días restantes del semestre
        calculateDaysRemaining();
    } catch (error) {
        console.error('Error al actualizar info del semestre:', error);
    }
}

/**
 * Calcula los días restantes hasta el fin del semestre
 */
function calculateDaysRemaining() {
    const daysElement = document.getElementById('headerDaysRemaining');
    if (!daysElement) return;
    
    // Obtener fecha actual
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 0-11 -> 1-12
    
    // Determinar el semestre actual y fecha de fin
    let endDate;
    
    // Semestre I: Enero - Julio (termina aproximadamente 31 de julio)
    // Semestre II: Agosto - Diciembre (termina aproximadamente 20 de diciembre)
    if (currentMonth >= 1 && currentMonth <= 7) {
        // Semestre I
        endDate = new Date(currentYear, 6, 31); // 31 de julio
    } else {
        // Semestre II
        endDate = new Date(currentYear, 11, 20); // 20 de diciembre
    }
    
    // Si ya pasó la fecha de fin del semestre actual, calcular para el siguiente
    if (today > endDate) {
        if (currentMonth <= 7) {
            // Ya pasó semestre I, calcular para semestre II
            endDate = new Date(currentYear, 11, 20);
        } else {
            // Ya pasó semestre II, calcular para semestre I del siguiente año
            endDate = new Date(currentYear + 1, 6, 31);
        }
    }
    
    // Calcular diferencia en días
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Actualizar el elemento
    if (diffDays > 0) {
        daysElement.textContent = diffDays;
        
        // Cambiar color según días restantes
        if (diffDays <= 15) {
            daysElement.style.color = '#DC2626'; // Rojo
        } else if (diffDays <= 30) {
            daysElement.style.color = '#F59E0B'; // Amarillo
        } else {
            daysElement.style.color = '#7B1113'; // Color normal
        }
    } else {
        daysElement.textContent = '0';
        daysElement.style.color = '#DC2626';
    }
}

/**
 * Actualizar información del usuario en el header
 */
function updateHeaderUserInfo() {
    try {
        const user = getUserFromToken();
        if (!user) {
            console.warn('No se pudo obtener información del usuario');
            return;
        }
        
        const userNameElement = document.getElementById('headerUserName');
        const userRoleElement = document.getElementById('headerUserRole');
        
        if (userNameElement) {
            const displayName = user.name || user.email || 'Usuario';
            userNameElement.textContent = displayName;
            userNameElement.title = displayName; // Tooltip para nombres largos
        }
        
        if (userRoleElement) {
            const roles = {
                'admin': 'Administrador',
                'tutor': 'Tutor',
                'student': 'Estudiante',
                'verifier': 'Verificador'
            };
            userRoleElement.textContent = roles[user.role] || user.role;
        }
    } catch (error) {
        console.error('Error al actualizar info del usuario:', error);
    }
}

/**
 * Mostrar modal de ayuda
 */
function showHelp() {
    try {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.style.display = 'flex';
            // Prevenir scroll del body cuando el modal está abierto
            document.body.style.overflow = 'hidden';
        } else {
            console.error('Modal de ayuda no encontrado');
        }
    } catch (error) {
        console.error('Error al mostrar modal de ayuda:', error);
    }
}

/**
 * Cerrar modal de ayuda
 */
function closeHelp() {
    try {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.style.display = 'none';
            // Restaurar scroll del body
            document.body.style.overflow = '';
        }
    } catch (error) {
        console.error('Error al cerrar modal de ayuda:', error);
    }
}

/**
 * Cerrar modal al hacer clic fuera de él
 */
function handleModalClick(event) {
    if (event.target.id === 'helpModal') {
        closeHelp();
    }
}

/**
 * Inicialización del header
 */
function initializeHeader() {
    console.log('🎯 Inicializando Header Panel...');
    
    // Actualizar información
    updateSemesterInfo();
    updateHeaderUserInfo();
    
    // Agregar listener para cerrar modal al hacer clic fuera
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.addEventListener('click', handleModalClick);
    }
    
    console.log('✅ Header Panel inicializado');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initializeHeader, 100);
    });
} else {
    setTimeout(initializeHeader, 100);
}

// ========== EXPONER FUNCIONES GLOBALES ==========
window.updateHeaderPanelInfo = function() {
    updateSemesterInfo();
    updateHeaderUserInfo();
};

window.showHelp = showHelp;
window.closeHelp = closeHelp;
