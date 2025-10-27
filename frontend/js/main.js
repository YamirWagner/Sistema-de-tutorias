// main.js - Lógica general y navegación

// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    
    // Detectar página actual (funciona con URLs limpias y .html)
    const isDashboard = path.includes('dashboard');
    const isLogin = path.includes('login');
    const isVerify = path.includes('verify');
    
    // Si no hay token y está en dashboard, redirigir a login
    if (!token && isDashboard) {
        window.location.href = 'login.html';
        return false;
    }
    
    // Si hay token y está en login/verify, redirigir a dashboard
    if (token && (isLogin || isVerify)) {
        window.location.href = 'dashboard.html';
        return false;
    }
    
    return true;
}

// Obtener datos del usuario desde el token
function getUserFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch (e) {
        console.error('Error al decodificar token:', e);
        return null;
    }
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Cargar componentes HTML (header, sidebar, footer)
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
    } catch (error) {
        console.error(`Error cargando componente ${componentPath}:`, error);
    }
}

// Inicializar dashboard
async function initDashboard() {
    if (!checkAuth()) return;
    
    // Cargar componentes
    await loadComponent('header-container', 'components/header.html');
    await loadComponent('sidebar-container', 'components/sidebar.html');
    await loadComponent('footer-container', 'components/footer.html');
    
    // Obtener datos del usuario
    const user = getUserFromToken();
    if (user) {
        document.getElementById('welcomeMessage').textContent = `Bienvenido, ${user.name || user.email}`;
        document.getElementById('userRole').textContent = `Rol: ${getRoleName(user.role)}`;
        
        // Cargar contenido según el rol
        loadDashboardByRole(user.role);
    }
    
    // Configurar botón de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Obtener nombre del rol
function getRoleName(role) {
    const roles = {
        'admin': 'Administrador',
        'tutor': 'Tutor',
        'student': 'Estudiante',
        'verifier': 'Verificador'
    };
    return roles[role] || role;
}

// Cargar dashboard según rol
function loadDashboardByRole(role) {
    switch(role) {
        case 'admin':
            if (typeof loadAdminDashboard === 'function') {
                loadAdminDashboard();
            }
            break;
        case 'tutor':
            if (typeof loadTutorDashboard === 'function') {
                loadTutorDashboard();
            }
            break;
        case 'student':
            if (typeof loadStudentDashboard === 'function') {
                loadStudentDashboard();
            }
            break;
        case 'verifier':
            if (typeof loadVerifierDashboard === 'function') {
                loadVerifierDashboard();
            }
            break;
    }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const colors = {
        'success': 'bg-green-100 border-green-500 text-green-700',
        'error': 'bg-red-100 border-red-500 text-red-700',
        'warning': 'bg-yellow-100 border-yellow-500 text-yellow-700',
        'info': 'bg-blue-100 border-blue-500 text-blue-700'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} border-l-4 p-4 rounded shadow-lg z-50`;
    notification.innerHTML = `
        <p class="font-bold">${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Detectar si estamos en dashboard (funciona con URLs limpias y .html)
    if (path.includes('dashboard')) {
        console.log('Inicializando dashboard...');
        console.log('Token:', localStorage.getItem('token'));
        console.log('User:', localStorage.getItem('user'));
        initDashboard();
    } else {
        checkAuth();
    }
});

window.addEventListener('load', () => {

    // 1. Seleccionar los elementos
    const track = document.querySelector('.carousel-track');
    // Salir si no hay carrusel en la página
    if (!track) return; 
    
    const slides = Array.from(track.children);
    const nextButton = document.querySelector('.btn-next');
    const prevButton = document.querySelector('.btn-prev');
    
    // ¡NUEVO! Seleccionamos el contenedor principal
    const container = document.querySelector('.carousel-container');

    // 2. Obtener el ancho de un slide
    const slideWidth = slides[0].getBoundingClientRect().width;

    // 3. Guardar el índice actual
    let currentIndex = 0;

    // 4. Función para mover el 'track' Y AJUSTAR ALTURA
    function moveToSlide(index) {
        // Mueve el track horizontalmente
        track.style.transform = 'translateX(-' + (slideWidth * index) + 'px)';
        
        // --- LÓGICA DE ALTURA DINÁMICA ---
        // 1. Obtiene el slide al que nos movemos
        const slideToMoveTo = slides[index];
        // 2. Obtiene su altura
        const newHeight = slideToMoveTo.getBoundingClientRect().height;
        // 3. Aplica esa altura al contenedor (el CSS se encarga de animarlo)
        container.style.height = newHeight + 'px';

        currentIndex = index;
    }

    // 5. Evento para el botón 'Siguiente'
    nextButton.addEventListener('click', () => {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= slides.length) {
            nextIndex = 0; 
        }
        moveToSlide(nextIndex);
    });

    // 6. Evento para el botón 'Anterior'
    prevButton.addEventListener('click', () => {
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = slides.length - 1; 
        }
        moveToSlide(prevIndex);
    });

    // 7. --- INICIALIZAR ALTURA ---
    // Al cargar la página, establece la altura del primer slide
    const initialHeight = slides[0].getBoundingClientRect().height;
    container.style.height = initialHeight + 'px';

});
