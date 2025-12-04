'use strict';

const SemesterManageModule = {
    state: {
        semesterInfo: null,
        allSemesters: [],
        isLoading: false
    }
};

// ============= INICIALIZACIÓN =============

async function initCronogramaModule() {
    if (SemesterManageModule.state.isLoading) {
        return;
    }
    
    SemesterManageModule.state.isLoading = true;
    
    const template = document.getElementById('semesterCardTemplate');
    if (!template) {
        SemesterManageModule.state.isLoading = false;
        return;
    }
    
    try {
        await loadSemesterData();
    } catch (e) {
        loadMockData();
    } finally {
        SemesterManageModule.state.isLoading = false;
    }
}

async function loadCronogramaContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) {
        return;
    }
    
    try {
        content.innerHTML = '<div class="loading-message"><i class="fa-solid fa-spinner fa-spin"></i><p>Cargando módulo...</p></div>';
        
        // Cargar CSS si no existe
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const cssPath = `${basePath}/frontend/css/administrador/semestre.css`;
        
        if (!document.querySelector(`link[href*="semestre.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        // Cargar HTML
        const url = `${basePath}/frontend/components/administrador/semestre.html`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error al cargar: ${response.status}`);
        }
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        // Esperar procesamiento del DOM
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        
        // Verificar template
        const template = document.getElementById('semesterCardTemplate');
        if (!template) {
            throw new Error('Template no encontrado');
        }
        
        await initCronogramaModule();
        
    } catch (error) {
        content.innerHTML = `
            <div class="error-message">
                <h3>Error al cargar el módulo</h3>
                <p>${error.message}</p>
            </div>`;
    }
}

// ============= CARGA DE DATOS =============

async function loadSemesterData() {
    try {
        const response = await apiGet('/semestre?action=list');
        
        if (response?.success && response.data) {
            const data = response.data;
            
            if (Array.isArray(data) && data.length > 0) {
                SemesterManageModule.state.allSemesters = data;
                renderSemesterCards(data);
                return;
            } else {
                const container = document.getElementById('semesterCardsContainer');
                if (container) {
                    container.innerHTML = '<div class="loading-message">No hay semestres registrados. Crea uno nuevo.</div>';
                }
                return;
            }
        }
        
        loadMockData();
        
    } catch (error) {
        loadMockData();
    }
}

function loadMockData() {
    const mockData = [
        { id: 2, nombre: '2025-II', fechaInicio: '2025-08-18', fechaFin: '2025-12-16', estado: 'Activo' },
        { id: 3, nombre: '2026-I', fechaInicio: '2026-03-01', fechaFin: '2026-07-15', estado: 'Programado' },
        { id: 1, nombre: '2025-I', fechaInicio: '2025-03-01', fechaFin: '2025-07-15', estado: 'Finalizado' }
    ];
    
    SemesterManageModule.state.allSemesters = mockData;
    renderSemesterCards(mockData);
}

// ============= UI =============

function renderSemesterCards(semesters) {
    const container = document.getElementById('semesterCardsContainer');
    const template = document.getElementById('semesterCardTemplate');
    
    if (!container || !template) {
        return;
    }
    
    if (!semesters || semesters.length === 0) {
        container.innerHTML = '<div class="loading-message">No hay semestres registrados</div>';
        return;
    }
    
    container.innerHTML = '';
    
    semesters.forEach((sem, index) => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.semester-card');
        
        if (!card) {
            return;
        }
        
        // Normalizar estado (Cerrado = Finalizado para el frontend)
        let estadoNormalizado = sem.estado || 'Programado';
        if (estadoNormalizado === 'Cerrado') {
            estadoNormalizado = 'Finalizado';
        }
        
        const estadoLower = estadoNormalizado.toLowerCase();
        
        // Asignar data attributes
        card.dataset.semesterId = sem.id;
        card.dataset.estado = estadoLower;
        
        // Actualizar contenido de texto
        const nombreEl = clone.querySelector('[data-field="nombre"]');
        if (nombreEl) nombreEl.textContent = `Semestre ${sem.nombre}`;
        
        const badge = clone.querySelector('[data-field="badge"]');
        if (badge) {
            badge.classList.add(`badge-${estadoLower}`);
            badge.textContent = estadoNormalizado;
            badge.dataset.estado = estadoLower;
        }
        
        const periodoEl = clone.querySelector('[data-field="periodo"]');
        if (periodoEl) {
            const startDate = formatDateLong(sem.fechaInicio);
            const endDate = formatDateLong(sem.fechaFin);
            periodoEl.textContent = `Periodo: ${startDate} - ${endDate}`;
        }
        
        // Countdown para semestres activos
        const countdownBox = clone.querySelector('.countdown-box');
        if (estadoNormalizado === 'Activo' && countdownBox) {
            const days = calculateDaysRemaining(sem.fechaFin);
            const numberEl = clone.querySelector('.countdown-number');
            if (numberEl) numberEl.textContent = days;
            countdownBox.style.display = 'flex';
        } else if (countdownBox) {
            countdownBox.remove();
        }
        
        // Botones - Solo lógica
        const btnEdit = clone.querySelector('.btn-edit');
        const btnAction = clone.querySelector('.btn-action');
        
        if (btnEdit) {
            btnEdit.onclick = () => editSemester(sem.id);
        }
        
        if (btnAction) {
            if (estadoNormalizado === 'Activo') {
                btnAction.textContent = 'Finalizar Semestre';
                btnAction.classList.add('btn-finalize');
                btnAction.onclick = () => finalizeSemester(sem.id);
            } else if (estadoNormalizado === 'Finalizado') {
                btnAction.textContent = 'Finalizado';
                btnAction.classList.add('btn-disabled');
                btnAction.disabled = true;
            } else {
                btnAction.textContent = 'Activar Semestre';
                btnAction.classList.add('btn-activate');
                btnAction.onclick = () => activateSemester(sem.id);
            }
        }
        
        container.appendChild(clone);
    });
}

// ============= ACCIONES =============

function showCreateSemesterModal() {
    setValue('semesterId', '');
    setValue('semesterName', '');
    setValue('semesterStartDate', '');
    setValue('semesterEndDate', '');
    setValue('semesterStatus', 'Programado');
    setText('modalTitle', 'Crear Nuevo Semestre');
    showModal('editSemesterModal');
}

function editSemester(id) {
    const sem = SemesterManageModule.state.allSemesters.find(s => s.id == id);
    if (!sem) return;
    
    setValue('semesterId', sem.id);
    setValue('semesterName', sem.nombre);
    setValue('semesterStartDate', sem.fechaInicio);
    setValue('semesterEndDate', sem.fechaFin);
    setValue('semesterStatus', sem.estado);
    setText('modalTitle', 'Editar Semestre');
    
    showModal('editSemesterModal');
}

async function activateSemester(id) {
    if (!confirm('¿Activar este semestre? Esto finalizará cualquier otro semestre activo.')) return;
    
    try {
        const sem = SemesterManageModule.state.allSemesters.find(s => s.id == id);
        if (!sem) return;
        
        const response = await apiPost('/semestre?action=update', {
            ...sem,
            estado: 'Activo'
        });
        
        if (response?.success) {
            showNotification('Semestre activado exitosamente', 'success');
            await loadSemesterData();
        } else {
            showNotification(response?.message || 'Error al activar semestre', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    }
}

async function finalizeSemester(id) {
    if (!confirm('¿Finalizar este semestre?')) return;
    
    try {
        const response = await apiPost('/semestre?action=close', { id });
        
        if (response?.success) {
            showNotification('Semestre finalizado exitosamente', 'success');
            await loadSemesterData();
        } else {
            showNotification(response?.message || 'Error al finalizar semestre', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    }
}

async function saveSemester(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const id = formData.get('semesterId');
    const isNew = !id;
    
    const data = {
        id,
        nombre: formData.get('nombre'),
        fechaInicio: formData.get('fechaInicio'),
        fechaFin: formData.get('fechaFin'),
        estado: formData.get('estado')
    };
    
    // Validación de fechas
    if (new Date(data.fechaFin) <= new Date(data.fechaInicio)) {
        showNotification('La fecha de fin debe ser posterior a la fecha de inicio', 'error');
        return;
    }
    
    const action = isNew ? 'create' : 'update';
    
    try {
        const response = await apiPost(`/semestre?action=${action}`, data);
        
        if (response?.success) {
            showNotification(`Semestre ${isNew ? 'creado' : 'actualizado'} exitosamente`, 'success');
            closeEditSemesterModal();
            await loadSemesterData();
        } else {
            showNotification(response?.message || 'No se pudo guardar', 'error');
        }
    } catch (error) {
        showNotification('Error al guardar cambios', 'error');
    }
}

// ============= UTILIDADES =============

// Fallback para notificaciones si no está disponible globalmente
function showNotification(message, type = 'info') {
    if (window.showNotification && typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

function calculateDaysRemaining(endDateStr) {
    const end = new Date(endDateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

function formatDateLong(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

function closeEditSemesterModal() {
    const modal = document.getElementById('editSemesterModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function showModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = 'flex';
    }
}

// Exportar

window.initCronogramaModule = initCronogramaModule;
window.loadCronogramaContent = loadCronogramaContent;
window.showCreateSemesterModal = showCreateSemesterModal;
window.closeEditSemesterModal = closeEditSemesterModal;
window.saveSemester = saveSemester;
window.editSemester = editSemester;
window.activateSemester = activateSemester;
window.finalizeSemester = finalizeSemester;
