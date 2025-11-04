// calendar.js - Conexión con Google Calendar

// Obtener eventos del calendario
async function getCalendarEvents() {
    try {
        // Datos mock mientras se implementa el endpoint
        console.log('Función de calendario aún no implementada, usando datos temporales...');
        return { success: true, events: [] };
        
        // TODO: Descomentar cuando el endpoint esté listo
        // const response = await apiGet('/calendar?action=list');
        // return response;
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        return { success: false, events: [] };
    }
}

// Crear evento en el calendario
async function createCalendarEvent(eventData) {
    try {
        const response = await apiPost('/calendar?action=create', eventData);
        return response;
    } catch (error) {
        console.error('Error al crear evento:', error);
        throw error;
    }
}

// Actualizar evento
async function updateCalendarEvent(eventId, eventData) {
    try {
        const response = await apiPut(`/calendar?action=update&id=${eventId}`, eventData);
        return response;
    } catch (error) {
        console.error('Error al actualizar evento:', error);
        return { success: false };
    }
}

// Eliminar evento
async function deleteCalendarEvent(eventId) {
    try {
        const response = await apiDelete(`/calendar?action=delete&id=${eventId}`);
        return response;
    } catch (error) {
        console.error('Error al eliminar evento:', error);
        throw error;
    }
}

// Renderizar eventos en el dashboard
async function renderUpcomingSessions() {
    const container = document.getElementById('upcomingSessions');
    
    if (!container) return;
    
    container.innerHTML = '<p class="text-gray-500">Cargando sesiones...</p>';
    
    try {
        const response = await getCalendarEvents();
        
        if (response.success && response.events && response.events.length > 0) {
            container.innerHTML = '';
            
            response.events.slice(0, 5).forEach(event => {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'border-b py-3 last:border-b-0';
                eventDiv.innerHTML = `
                    <h4 class="font-semibold">${event.title}</h4>
                    <p class="text-sm text-gray-600">${formatDate(event.start)}</p>
                    <p class="text-sm text-gray-500">${event.description || 'Sin descripción'}</p>
                `;
                container.appendChild(eventDiv);
            });
        } else {
            container.innerHTML = '<p class="text-gray-500">No hay sesiones programadas</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="text-red-500">Error al cargar sesiones</p>';
    }
}

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return date.toLocaleDateString('es-ES', options);
}

// Inicializar calendario en el panel
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('panel') || window.location.pathname.includes('dashboard')) {
        setTimeout(() => {
            renderUpcomingSessions();
        }, 1000);
    }
});
