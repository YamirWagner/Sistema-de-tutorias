// auth.js - Login y verificación por código

// Enviar código de verificación
async function sendVerificationCode(email) {
    try {
        const response = await apiPost('/auth/send-code.php', { email });
        return response;
    } catch (error) {
        console.error('Error al enviar código:', error);
        throw error;
    }
}

// Verificar código
async function verifyCode(email, code) {
    try {
        const response = await apiPost('/auth/verify-code.php', { email, code });
        
        console.log('Respuesta verify-code:', response);
        
        if (response && response.success) {
            // Verificar que tenemos token y data
            const token = response.token || (response.data && response.data.token);
            const user = response.user || (response.data && response.data.user);
            
            if (token) {
                localStorage.setItem('token', token);
                console.log('Token guardado:', token);
            }
            
            if (user) {
                localStorage.setItem('user', JSON.stringify(user));
                console.log('Usuario guardado:', user);
            }
        }
         
        return response;
    } catch (error) {
        console.error('Error al verificar código:', error);
        throw error;
    }
}

// Mostrar mensaje (usa login-message si existe, si no, usa el id indicado o crea uno)
function showMessage(elementId, message, type = 'info') {
    let messageDiv = document.getElementById('login-message') || document.getElementById(elementId);
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = elementId || 'message';
        const form = document.getElementById('loginForm') || document.body;
        form.prepend(messageDiv);
    }
    const colors = {
        'success': 'bg-green-100 border-green-500 text-green-700',
        'error': 'message-error',
        'info': 'bg-blue-100 border-blue-500 text-blue-700'
    };
    
    messageDiv.className = `${colors[type]} border-l-4 p-4 rounded`;
    messageDiv.textContent = message;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

// Inicializar formulario de login
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const verificacionContainer = document.getElementById('login-verificacion');
            
            // Ocultar el bloque de verificación si ya estaba visible (reintento)
            if (verificacionContainer) {
                verificacionContainer.style.display = 'none';
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Validando...';
            
            try {
                const response = await sendVerificationCode(email);
                
                if (response && response.success) {
                    // Código enviado exitosamente
                    showMessage('login-message', 'Código enviado. Revisa tu correo e ingresa el código.', 'success');
                    // Mostrar bloque de verificación
                    renderInlineVerification(email);
                } else {
                    // Error: correo no existe o error al enviar
                    const msg = (response && (response.message || response.error)) || 'Correo no existe o error al enviar código';
                    showMessage('login-message', msg, 'error');
                    // NO mostrar el campo de verificación
                }
            } catch (error) {
                // Error de conexión o de parsing
                showMessage('login-message', 'Error de conexión. Intenta nuevamente.', 'error');
                // NO mostrar el campo de verificación
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Validar correo';
            }
        });
    }
});

// Renderizar verificación inline en login.html
function renderInlineVerification(email) {
    const container = document.getElementById('login-verificacion');
    if (!container) return;
    
    // Ocultar el botón de validar y el formulario de email
    const validateBtn = document.getElementById('validate-btn');
    const loginForm = document.getElementById('login-form');
    if (validateBtn) validateBtn.style.display = 'none';
    if (loginForm) loginForm.style.display = 'none';
    
    // Mostrar el bloque (ya existe en el HTML)
    container.style.display = 'block';

    const inlineForm = document.getElementById('inlineVerifyForm');
    if (!inlineForm) return;
    
    // Obtener todos los inputs de código (6 dígitos individuales)
    const codeInputs = inlineForm.querySelectorAll('.code-input');
    
    // Limpiar todos los inputs
    codeInputs.forEach(input => input.value = '');
    
    // Remover event listeners previos clonando el formulario
    const newForm = inlineForm.cloneNode(true);
    inlineForm.parentNode.replaceChild(newForm, inlineForm);
    
    // Configurar navegación entre inputs
    setupCodeInputs(newForm);
    
    // Adjuntar handler de verificación
    attachVerifyHandler(newForm, email, 'login-message');
    
    // Enfocar el primer input
    const firstInput = newForm.querySelector('.code-input');
    if (firstInput) firstInput.focus();
}

/**
 * Verificar si el usuario está autenticado
 */
function isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < now) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return false;
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Obtener información del usuario desde el token JWT
 */
function getUserFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.user_id || payload.id || payload.userId,
            email: payload.email,
            name: payload.name || payload.nombres,
            role: payload.role,
            semestre: payload.semestre,
            userType: payload.userType,
            codigo: payload.codigo,
            dni: payload.dni,
            especialidad: payload.especialidad
        };
    } catch (error) {
        return null;
    }
}

/**
 * Cerrar sesión
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
    window.location.href = basePath + '/login';
}

// Configurar navegación entre inputs de código
function setupCodeInputs(formEl) {
    const inputs = formEl.querySelectorAll('.code-input');
    
    inputs.forEach((input, index) => {
        // Solo permitir números
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Solo aceptar números
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Si hay un dígito, mover al siguiente input
            if (value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        
        // Manejar teclas especiales
        input.addEventListener('keydown', (e) => {
            // Backspace: borrar y regresar al anterior
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
            
            // Flechas izquierda/derecha
            if (e.key === 'ArrowLeft' && index > 0) {
                e.preventDefault();
                inputs[index - 1].focus();
            }
            
            if (e.key === 'ArrowRight' && index < inputs.length - 1) {
                e.preventDefault();
                inputs[index + 1].focus();
            }
        });
        
        // Manejar pegado de código completo
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').trim();
            
            // Si pegaron el código completo (6 dígitos)
            if (/^\d{6}$/.test(pastedData)) {
                inputs.forEach((inp, idx) => {
                    inp.value = pastedData[idx] || '';
                });
                inputs[inputs.length - 1].focus();
            }
        });
    });
}

function attachVerifyHandler(formEl, email, messageElementId) {
    if (!formEl) return;
    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = formEl.querySelector('button[type="submit"]');
        
        // Recolectar código de los 6 inputs individuales
        const codeInputs = formEl.querySelectorAll('.code-input');
        let code = '';
        codeInputs.forEach(input => {
            code += input.value;
        });
        
        code = code.trim();
        
        if (!code || code.length !== 6) { 
            showMessage(messageElementId, 'Ingresa el código de 6 dígitos', 'error'); 
            return; 
        }
        
        submitBtn.disabled = true; 
        submitBtn.textContent = 'Verificando...';
        
        try {
            const response = await verifyCode(email, code);
            if (response && response.success) {
                showMessage(messageElementId, 'Código verificado. Ingresando al sistema...', 'success');
                const basePath = window.APP_BASE_PATH || '';
                
                // Obtener rol del usuario desde el token
                const token = localStorage.getItem('token');
                let userRole = 'student'; // Por defecto
                
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        userRole = payload.role || 'student';
                        console.log('👤 Rol detectado:', userRole);
                    } catch (e) {
                        console.error('Error al decodificar token:', e);
                    }
                }
                
                // Redirigir según el rol
                let redirectPath = '/panel';
                if (userRole === 'tutor' || userRole === 'Tutor') {
                    redirectPath = '/tutor';
                    console.log('➡️ Redirigiendo tutor a /tutor');
                }
                
                setTimeout(() => { 
                    window.location.href = basePath + redirectPath; 
                }, 1000);
            } else {
                const msg = (response && (response.message || response.error)) || 'Código inválido o expirado';
                showMessage(messageElementId, msg, 'error');
            }
        } catch (err) {
            showMessage(messageElementId, 'Error de conexión. Intenta nuevamente.', 'error');
        } finally {
            submitBtn.disabled = false; 
            submitBtn.textContent = 'Ingresar';
        }
    });
}

// ===== EXPONER FUNCIONES GLOBALES =====
window.sendVerificationCode = sendVerificationCode;
window.verifyCode = verifyCode;
window.isAuthenticated = isAuthenticated;
window.getUserFromToken = getUserFromToken;
window.logout = logout;
window.showMessage = showMessage;
