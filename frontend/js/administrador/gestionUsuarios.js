'use strict';

console.log('%c✅ SCRIPT GESTION USUARIOS CARGADO', 'background: #4ade80; color: #000; font-weight: bold; padding: 5px;');

const GestionUsuariosModule = {
    state: {
        tutors: [],
        students: [],
        selectedIds: new Set(),
        fromTutorId: null,
        isLoading: false
    }
};

// ============= INICIALIZACIÓN =============

async function initGestionUsuariosModule() {
    console.log('🚀 Inicializando módulo Gestión de Usuarios...');
    
    if (GestionUsuariosModule.state.isLoading) {
        console.log('⏳ Ya está cargando...');
        return;
    }
    
    GestionUsuariosModule.state.isLoading = true;
    
    const btnOpenAssign = document.getElementById('btnOpenAssign');
    if (!btnOpenAssign) {
        console.error('❌ Botones no encontrados en el DOM');
        GestionUsuariosModule.state.isLoading = false;
        return;
    }
    
    console.log('✅ Elementos encontrados, configurando eventos...');
    
    try {
        setupEventListeners();
        console.log('✅ Módulo Gestión de Usuarios inicializado correctamente');
    } catch (e) {
        console.error('❌ Error al inicializar:', e);
    } finally {
        GestionUsuariosModule.state.isLoading = false;
    }
}

async function loadGestionUsuariosContent() {
    console.log('📦 loadGestionUsuariosContent iniciado');
    const content = document.getElementById('dashboardContent');
    if (!content) {
        console.error('❌ dashboardContent no encontrado');
        return;
    }
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando módulo...</p></div>';
        
        // Cargar CSS si no existe
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const cssPath = `${basePath}/css/administrador/gestionUsuarios.css`;
        
        if (!document.querySelector(`link[href*="gestionUsuarios.css"]`)) {
            console.log('📎 Cargando CSS:', cssPath);
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        // Cargar HTML
        const url = `${basePath}/components/administrador/gestionUsuarios.html`;
        console.log('🌐 Cargando HTML desde:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error al cargar: ${response.status}`);
        }
        
        const htmlText = await response.text();
        console.log('📄 HTML recibido:', htmlText.length, 'caracteres');
        content.innerHTML = htmlText;
        
        // Esperar procesamiento del DOM
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        
        console.log('✅ HTML insertado, inicializando módulo...');
        await initGestionUsuariosModule();
        
    } catch (error) {
        console.error('❌ Error al cargar módulo:', error);
        content.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <h3 style="color:#ef4444;margin-bottom:12px;">Error al cargar el módulo</h3>
                <p style="color:#666;">${error.message}</p>
            </div>`;
    }
}

// ============= CONFIGURACIÓN DE EVENTOS =============

function setupEventListeners() {
    const btnOpenAssign = document.getElementById('btnOpenAssign');
    const btnOpenReport = document.getElementById('btnOpenReport');
    const assignModal = document.getElementById('assignModal');
    const reportModal = document.getElementById('reportModal');
    const closeAssign = document.getElementById('closeAssign');
    const closeReport = document.getElementById('closeReport');
    const selectTutor = document.getElementById('selectTutor');
    const searchStudent = document.getElementById('searchStudent');
    const studentsList = document.getElementById('studentsList');
    const selectedList = document.getElementById('selectedList');
    const btnAssign = document.getElementById('btnAssign');
    const btnReassign = document.getElementById('btnReassign');
    const reportBody = document.getElementById('reportBody');
    const btnPrintReport = document.getElementById('btnPrintReport');

    if (btnOpenAssign) {
        btnOpenAssign.onclick = async () => {
            await loadLists();
            showModal(assignModal);
        };
    }

    if (closeAssign) closeAssign.onclick = () => hideModal(assignModal);
    if (closeReport) closeReport.onclick = () => hideModal(reportModal);

    if (btnOpenReport) {
        btnOpenReport.onclick = async () => {
            await loadReport();
            showModal(reportModal);
        };
    }

    if (btnPrintReport) {
        btnPrintReport.onclick = () => printReport();
    }

    if (studentsList) {
        studentsList.onclick = (e) => {
            if (e.target.classList.contains('add')) {
                const id = e.target.dataset.id;
                if (id) {
                    GestionUsuariosModule.state.selectedIds.add(Number(id));
                    renderSelected();
                }
            }
        };
    }

    if (selectedList) {
        selectedList.onclick = (e) => {
            if (e.target.classList.contains('remove')) {
                const id = e.target.dataset.id;
                if (id) {
                    GestionUsuariosModule.state.selectedIds.delete(Number(id));
                    renderSelected();
                }
            }
        };
    }

    if (searchStudent) {
        searchStudent.oninput = () => {
            const q = searchStudent.value.trim().toLowerCase();
            const filtered = GestionUsuariosModule.state.students.filter(s => {
                return (s.nombres + ' ' + s.apellidos).toLowerCase().includes(q) || 
                       String(s.codigo).toLowerCase().includes(q);
            });
            renderStudents(filtered);
        };
    }

    if (btnAssign) btnAssign.onclick = () => doAssign(false);
    if (btnReassign) btnReassign.onclick = () => doAssign(true);
}

// ============= FUNCIONES DE UI =============

function showModal(modal) {
    if (modal) modal.classList.remove('hidden');
}

function hideModal(modal) {
    if (modal) modal.classList.add('hidden');
}

// ============= CARGA DE DATOS =============

async function loadLists() {
    try {
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const response = await fetch(`${basePath}/backend/api/gestionUsuarios.php?action=list`);
        const data = await response.json();
        
        if (!response.ok || data.status === 'error') {
            throw new Error(data.message || 'Error al cargar listas');
        }
        
        const result = data.data || data;
        GestionUsuariosModule.state.tutors = result.tutors || [];
        GestionUsuariosModule.state.students = result.students || [];
        
        renderTutorSelect();
        renderStudents(GestionUsuariosModule.state.students);
    } catch (error) {
        console.error('Error al cargar listas:', error);
        alert('Error al cargar listas: ' + error.message);
    }
}

async function loadReport() {
    try {
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const response = await fetch(`${basePath}/backend/api/gestionUsuarios.php?action=report`);
        const data = await response.json();
        
        if (!response.ok || data.status === 'error') {
            throw new Error(data.message || 'Error al cargar reporte');
        }
        
        const result = data.data || data;
        const items = result.items || [];
        
        const reportBody = document.getElementById('reportBody');
        if (reportBody) {
            reportBody.innerHTML = items.map(r => `
                <tr>
                    <td>${r.estudiante || ''}</td>
                    <td>${r.codigo || ''}</td>
                    <td>${r.tutor || ''}</td>
                    <td>${r.fecha || ''}</td>
                    <td>${r.hora || ''}</td>
                    <td>${r.ambiente || ''}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error al cargar reporte:', error);
        alert('Error al cargar reporte: ' + error.message);
    }
}

// ============= RENDERIZADO =============

function renderTutorSelect() {
    const selectTutor = document.getElementById('selectTutor');
    if (!selectTutor) return;
    
    selectTutor.innerHTML = '<option value="">Seleccione un tutor activo</option>' +
        GestionUsuariosModule.state.tutors.map(t => 
            `<option value="${t.id}">${t.apellidos}, ${t.nombres}</option>`
        ).join('');
}

function renderStudents(list) {
    const studentsList = document.getElementById('studentsList');
    if (!studentsList) return;
    
    studentsList.innerHTML = '';
    list.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${s.apellidos}, ${s.nombres} <small style="color:#6b7280">(${s.codigo})</small></span>
            <button class="add" data-id="${s.id}">Agregar</button>
        `;
        studentsList.appendChild(li);
    });
}

function renderSelected() {
    const selectedList = document.getElementById('selectedList');
    if (!selectedList) return;
    
    selectedList.innerHTML = '';
    const selected = GestionUsuariosModule.state.students.filter(s => 
        GestionUsuariosModule.state.selectedIds.has(Number(s.id))
    );
    
    selected.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${s.apellidos}, ${s.nombres} <small style="color:#6b7280">(${s.codigo})</small></span>
            <button class="remove" data-id="${s.id}">Quitar</button>
        `;
        selectedList.appendChild(li);
    });
}

// ============= ACCIONES =============

async function doAssign(isReassign) {
    const selectTutor = document.getElementById('selectTutor');
    const tutorId = Number(selectTutor?.value);
    const studentIds = Array.from(GestionUsuariosModule.state.selectedIds);
    
    if (!tutorId) {
        alert('Seleccione un tutor activo');
        return;
    }
    
    if (studentIds.length === 0) {
        alert('Seleccione al menos un estudiante');
        return;
    }
    
    const payload = isReassign
        ? { action: 'reassign', toTutorId: tutorId, fromTutorId: GestionUsuariosModule.state.fromTutorId || 0, studentIds }
        : { action: 'assign', tutorId, studentIds };
    
    try {
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const response = await fetch(`${basePath}/backend/api/gestionUsuarios.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok || data.status === 'error') {
            throw new Error(data.message || 'Error al guardar');
        }
        
        alert('Operación exitosa');
        GestionUsuariosModule.state.selectedIds.clear();
        renderSelected();
        hideModal(document.getElementById('assignModal'));
    } catch (error) {
        console.error('Error al asignar:', error);
        alert('Error: ' + error.message);
    }
}

function printReport() {
    const w = window.open('', 'PRINT', 'height=600,width=800');
    const html = `<!doctype html><html><head><title>Reporte de Tutorías</title>
        <style>
            body{font-family:Arial,sans-serif;padding:16px}
            table{width:100%;border-collapse:collapse}
            th,td{border-bottom:1px solid #ddd;padding:8px 10px;text-align:left}
            h2{margin:0 0 12px}
        </style>
    </head><body>
        <h2>Reporte de Tutorías</h2>
        <table>${document.querySelector('.report-table').innerHTML}</table>
    </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    w.close();
}

// ============= EXPORTAR A WINDOW =============

window.loadGestionUsuariosContent = loadGestionUsuariosContent;
window.initGestionUsuariosModule = initGestionUsuariosModule;