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
        
        if (response.success && response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
         
        return response;
    } catch (error) {
        console.error('Error al verificar código:', error);
        throw error;
    }
}

// Mostrar mensaje
function showMessage(elementId, message, type = 'info') {
    const messageDiv = document.getElementById(elementId);
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
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            
            try {
                const response = await sendVerificationCode(email);
                
                if (response.success) {
                    showMessage('message', 'Código enviado exitosamente. Revisa tu correo.', 'success');
                    
                    // Guardar email temporalmente y redirigir
                    sessionStorage.setItem('tempEmail', email);
                    
                    setTimeout(() => {
                        window.location.href = 'verify.html';
                    }, 2000);
                } else {
                    showMessage('message', response.message || 'Error al enviar código', 'error');
                }
            } catch (error) {
                showMessage('login-message', 'Intenta nuevamente.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Código de Verificación';
            }
        });
    }
    
    // Formulario de verificación
    const verifyForm = document.getElementById('verifyForm');
    
    if (verifyForm) {
        const email = sessionStorage.getItem('tempEmail');
        
        if (!email) {
            window.location.href = 'login.html';
            return;
        }
        
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const code = document.getElementById('code').value;
            const submitBtn = e.target.querySelector('button[type="submit"]');
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verificando...';
            
            try {
                const response = await verifyCode(email, code);
                
                if (response.success) {
                    showMessage('message', 'Código verificado. Redirigiendo...', 'success');
                    
                    sessionStorage.removeItem('tempEmail');
                    
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showMessage('message', response.message || 'Código inválido', 'error');
                }
            } catch (error) {
                showMessage('message', 'Error de conexión. Intenta nuevamente.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verificar';
            }
        });
        
        // Botón reenviar código
        const resendBtn = document.getElementById('resendBtn');
        if (resendBtn) {
            resendBtn.addEventListener('click', async () => {
                try {
                    await sendVerificationCode(email);
                    showMessage('message', 'Código reenviado exitosamente', 'success');
                } catch (error) {
                    showMessage('message', 'Error al reenviar código', 'error');
                }
            });
        }
    }
});
