// api.js - Peticiones fetch al backend

// Usar SIEMPRE el path fijo del proyecto (definido en el HTML antes de cargar este script)
// Si no está definido, usar el primer segmento del path como fallback
const API_BASE_URL = (function() {
    const base = window.APP_BASE_PATH || '/Sistema-de-tutorias1';
    return base.replace(/\/$/, '') + '/backend/api';
})();

// Exponer para depuración
window.__API_BASE_URL = API_BASE_URL;
console.log('API_BASE_URL configurado en:', API_BASE_URL);

// Obtener token de autenticación
function getAuthToken() {
    return localStorage.getItem('token');
}

// Petición GET
async function apiGet(endpoint) {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: headers
        });
        
        // Asegurar parseo JSON seguro
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : { success: false, message: 'Respuesta no JSON del servidor' };
        
        if (response.status === 401) {
            // Token inválido o expirado
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            throw new Error('Sesión expirada');
        }
        
        return data;
    } catch (error) {
        console.error('Error en petición GET:', error);
        throw error;
    }
}

// Petición POST
async function apiPost(endpoint, data) {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log('POST Request:', fullUrl);
    
    try {
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });
        
        console.log('Response status:', response.status);
        
        if (response.status === 404) {
            console.error('Endpoint no encontrado:', fullUrl);
            throw new Error(`Endpoint no encontrado: ${endpoint}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        const responseData = contentType.includes('application/json') ? await response.json() : { success: false, message: 'Respuesta no JSON del servidor' };
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            throw new Error('Sesión expirada');
        }
        
        return responseData;
    } catch (error) {
        console.error('Error en petición POST:', error);
        throw error;
    }
}

// Petición PUT
async function apiPut(endpoint, data) {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        });
        
        const contentType = response.headers.get('content-type') || '';
        const responseData = contentType.includes('application/json') ? await response.json() : { success: false, message: 'Respuesta no JSON del servidor' };
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            throw new Error('Sesión expirada');
        }
        
        return responseData;
    } catch (error) {
        console.error('Error en petición PUT:', error);
        throw error;
    }
}

// Petición DELETE
async function apiDelete(endpoint) {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: headers
        });
        
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : { success: false, message: 'Respuesta no JSON del servidor' };
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            throw new Error('Sesión expirada');
        }
        
        return data;
    } catch (error) {
        console.error('Error en petición DELETE:', error);
        throw error;
    }
}

// Subir archivo
async function apiUpload(endpoint, formData) {
    const token = getAuthToken();
    
    const headers = {};
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : { success: false, message: 'Respuesta no JSON del servidor' };
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            throw new Error('Sesión expirada');
        }
        
        return data;
    } catch (error) {
        console.error('Error al subir archivo:', error);
        throw error;
    }
}
