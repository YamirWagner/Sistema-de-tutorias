// api.js - Peticiones fetch al backend

const API_BASE_URL = '../backend/api';

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
        
        const data = await response.json();
        
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
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });
        
        const responseData = await response.json();
        
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
        
        const responseData = await response.json();
        
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
        
        const data = await response.json();
        
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
        
        const data = await response.json();
        
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
