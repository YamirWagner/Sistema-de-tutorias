// =====================================================
// ADMIN_SEMESTER_MANAGE.JS - Módulo de Gestión de Semestre
// Sistema de Tutorías UNSAAC - Optimizado
// =====================================================

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
    if (SemesterManageModule.state.isLoading) return;
    
    console.log('📅 Inicializando gestión de semestre...');
    SemesterManageModule.state.isLoading = true;
    
    try {
        await loadSemesterData();
        console.log('✅ Módulo listo con datos de BD');
    } catch (e) {
        console.warn('⚠️ Error al cargar desde BD, usando datos mock:', e.message);
        loadMockData();
    } finally {
        SemesterManageModule.state.isLoading = false;
    }
}

async function loadCronogramaContent() {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔵 INICIANDO CARGA DE SEMESTRE');
    console.log('═══════════════════════════════════════════════════');
    
    const content = document.getElementById('dashboardContent');
    console.log('📦 Contenedor dashboardContent:', content ? '✅ Encontrado' : '❌ NO ENCONTRADO');
    
    if (!content) {
        console.error('❌ dashboardContent no encontrado - ABORTANDO');
        return;
    }
    
    try {
        // Limpiar TODO el contenido previo (panel, semestre, etc.)
        console.log('🗑️ Limpiando contenido previo...');
        console.log('   Contenido actual:', content.innerHTML.length, 'caracteres');
        content.innerHTML = '';
        console.log('   ✅ Contenido limpiado');
        
        // Construir URL correcta
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const url = `${basePath}/components/administrador/semestre.html`;
        console.log('📡 Cargando desde:', url);
        
        const response = await fetch(url);
        console.log('📥 Respuesta recibida:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        
        const html = await response.text();
        console.log('📄 HTML recibido:', html.length, 'caracteres');
        console.log('📝 Primeros 200 caracteres:', html.substring(0, 200));
        
        // Insertar el HTML
        content.innerHTML = html;
        console.log('✅ HTML insertado en el DOM');
        console.log('📦 Contenido final:', content.innerHTML.length, 'caracteres');
        
        // Inicializar módulo
        await initCronogramaModule();
        
    } catch (error) {
        console.error('❌ Error al cargar semestre:', error);
        content.insertAdjacentHTML('beforeend', 
            `<div class="p-6 bg-red-50 text-red-700 rounded-lg m-6">
                <h3 class="font-bold mb-2">Error al cargar el módulo de semestre</h3>
                <p class="text-sm">${error.message}</p>
            </div>`
        );
    }
}

// ============= CARGA DE DATOS =============

async function loadSemesterData() {
    try {
        console.log('🔄 Cargando semestre desde backend...');
        
        // Cargar semestre activo
        const semesterResponse = await apiGet('/semestre?action=current');
        
        console.log('📡 Respuesta del servidor:', semesterResponse);
        
        if (semesterResponse?.success && semesterResponse.data?.semester) {
            console.log('✅ Semestre cargado desde BD:', semesterResponse.data.semester);
            SemesterManageModule.state.semesterInfo = semesterResponse.data.semester;
            updateUI();
            return;
        } else {
            console.warn('⚠️ Respuesta sin datos válidos:', semesterResponse);
        }
    } catch (error) {
        console.error('❌ Error al cargar desde backend:', error);
    }
    
    throw new Error('No data');
}

function loadMockData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date('2025-07-15');
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    SemesterManageModule.state.semesterInfo = {
        id: 2,
        name: '2025-I',
        startDate: '2025-03-01',
        endDate: '2025-07-15',
        status: 'Activo',
        daysRemaining: Math.max(0, diffDays)
    };
    
    SemesterManageModule.state.allSemesters = [
        { id: 2, nombre: '2025-I', fechaInicio: '2025-03-01', fechaFin: '2025-07-15', estado: 'Activo' },
        { id: 1, nombre: '2024-II', fechaInicio: '2024-08-01', fechaFin: '2024-12-20', estado: 'Cerrado' }
    ];
    
    updateUI();
}

// ============= UI =============

function updateUI() {
    updateCurrentSemester();
    updateSemesterHistory();
}

function updateCurrentSemester() {
    const info = SemesterManageModule.state.semesterInfo;
    if (!info) return;
    
    setText('currentSemesterName', info.name || '-');
    
    const start = formatDate(info.startDate);
    const end = formatDate(info.endDate);
    setText('currentSemesterPeriod', `${start} - ${end}`);
    
    const statusEl = document.getElementById('currentSemesterStatus');
    if (statusEl) {
        const isActive = info.status === 'Activo';
        statusEl.textContent = isActive ? 'ACTIVO' : 'CERRADO';
        statusEl.className = `px-3 py-1 rounded-full text-sm font-semibold text-white inline-block w-fit shadow-sm ${
            isActive ? 'bg-green-600' : 'bg-gray-600'
        }`;
    }
    const days = info.daysRemaining || 0;
    const daysText = days === 1 ? 'día restante' : 'días restantes';
    setText('currentSemesterDays', `${days} ${daysText}`);

    // Mostrar advertencia si quedan 0 días
    if (days === 0) {
        showNotification('El semestre ha concluido', 'warning');
    }
}

async function updateSemesterHistory() {
    const tableBody = document.getElementById('semesterHistoryTable');
    if (!tableBody) return;
    
    let semesters = SemesterManageModule.state.allSemesters;
    
    if (!semesters || semesters.length === 0) {
        try {
            const response = await apiGet('/semestre?action=list');
            if (response?.success && response.data) {
                semesters = response.data;
                SemesterManageModule.state.allSemesters = semesters;
            }
        } catch (error) {
            console.warn('⚠️ No se pudo cargar historial');
        }
    }
    
    renderSemesterTable(tableBody, semesters);
}

function renderSemesterTable(tableBody, semesters) {
    if (!semesters || semesters.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">No hay semestres</td></tr>';
        return;
    }
    
    tableBody.innerHTML = semesters.map(sem => {
        const isActive = sem.estado === 'Activo';
        const badgeClass = isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">${sem.nombre}</td>
            <td class="px-4 py-3 text-gray-600">${formatDate(sem.fechaInicio)}</td>
            <td class="px-4 py-3 text-gray-600">${formatDate(sem.fechaFin)}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs rounded-full ${badgeClass}">${sem.estado}</span>
            </td>
            <td class="px-4 py-3 text-center">
                ${isActive ? `
                    <button onclick="editSemester(${sem.id})" 
                            class="text-blue-600 hover:text-blue-800" 
                            title="Editar">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                ` : '<span class="text-gray-400">-</span>'}
            </td>
        </tr>
        `;
    }).join('');
}

// ============= MODALES =============

function showEditSemesterModal() {
    const info = SemesterManageModule.state.semesterInfo;
    if (!info) {
        showNotification?.('No hay datos del semestre', 'error');
        return;
    }
    
    setValue('semesterId', info.id || '');
    setValue('semesterName', info.name || '');
    setValue('semesterStartDate', info.startDate || '');
    setValue('semesterEndDate', info.endDate || '');
    setValue('semesterStatus', info.status || 'Activo');
    
    showModal('editSemesterModal');
}

function closeEditSemesterModal() {
    hideModal('editSemesterModal');
}

function editSemester(semesterId) {
    showEditSemesterModal();
}

async function saveSemester(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        id: formData.get('semesterId'),
        nombre: formData.get('nombre'),
        fechaInicio: formData.get('fechaInicio'),
        fechaFin: formData.get('fechaFin'),
        estado: formData.get('estado')
    };
    
    console.log('💾 Guardando semestre:', data);
    
    try {
        const response = await apiPost('/semestre?action=update', data);
        console.log('📡 Respuesta:', response);
        
        if (response?.success) {
            showNotification?.('Semestre actualizado exitosamente', 'success');
            closeEditSemesterModal();
            await loadSemesterData();
        } else {
            console.warn('⚠️ Error:', response);
            showNotification?.('Error: ' + (response?.message || 'No se pudo actualizar'), 'error');
        }
    } catch (error) {
        console.error('❌ Error al guardar:', error);
        showNotification?.('Error al guardar cambios', 'error');
    }
}

// ============= UTILIDADES =============

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
    if (el) el.classList.remove('hidden');
}

function hideModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

// ============= EXPORTAR =============

window.initCronogramaModule = initCronogramaModule;
window.loadCronogramaContent = loadCronogramaContent;
window.showEditSemesterModal = showEditSemesterModal;
window.closeEditSemesterModal = closeEditSemesterModal;
window.editSemester = editSemester;
window.saveSemester = saveSemester;

// Log de confirmación
console.log('✅ semestre.js cargado correctamente');
console.log('📋 Funciones exportadas:', {
    initCronogramaModule: typeof window.initCronogramaModule,
    loadCronogramaContent: typeof window.loadCronogramaContent,
    showEditSemesterModal: typeof window.showEditSemesterModal
});
