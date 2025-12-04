// admin.js - Funciones del Administrador (Solo Lógica)

// ============= CARGAR PANEL DEL ADMINISTRADOR =============

async function loadAdminPanelContent() {
    console.log('🔵 Cargando panel del administrador...');
    const content = document.getElementById('dashboardContent');
    
    if (!content) {
        console.error('❌ dashboardContent no encontrado');
        return;
    }
    
    try {
        // Limpiar contenido previo
        content.innerHTML = '';
        
        // Construir URL correcta
        const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
        const url = `${basePath}/components/administrador/panel.html`;
        console.log('📡 Cargando desde:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        
        const html = await response.text();
        console.log('📄 HTML recibido:', html.length, 'caracteres');
        
        // Insertar el HTML
        content.innerHTML = html;
        console.log('✅ HTML del panel insertado en el DOM');
        
        // Cargar datos
        await loadAdminStats();
        
    } catch (error) {
        console.error('❌ Error al cargar panel del administrador:', error);
        content.innerHTML = `
            <div class="p-6 bg-red-50 text-red-700 rounded-lg m-6">
                <h3 class="font-bold mb-2">Error al cargar el panel del administrador</h3>
                <p class="text-sm">${error.message}</p>
            </div>
        `;
    }
}

// Cargar dashboard del administrador
async function loadAdminDashboard() {
    console.log('Cargando dashboard de administrador...');
    
    // Cargar estadísticas
    await loadAdminStats();
    
    // Cargar contenido HTML del componente
    await loadAdminContent();
}

// Cargar estadísticas del administrador
async function loadAdminStats() {
    console.log('📊 Cargando estadísticas del administrador...');
    try {
        const response = await apiGet('/admin?action=stats');
        
        if (response && response.success) {
            const stats = response.data;
            console.log('✅ Estadísticas recibidas:', stats);
            updateAdminStats(stats);
        } else {
            console.warn('⚠️ No se pudieron cargar estadísticas, usando datos de ejemplo');
            // Datos de ejemplo para visualización
            const mockStats = {
                totalStudents: 27,
                assignedStudents: 14,
                unassignedStudents: 13,
                totalTutors: 6,
                tutorWorkload: [
                    { name: 'Tutor 1', count: 6 },
                    { name: 'Tutor 2', count: 2 },
                    { name: 'Tutor 3', count: 2 },
                    { name: 'Tutor 4', count: 2 },
                    { name: 'Tutor 5', count: 1 },
                    { name: 'Tutor 6', count: 1 }
                ]
            };
            updateAdminStats(mockStats);
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
        // Datos de ejemplo para visualización
        const mockStats = {
            totalStudents: 27,
            assignedStudents: 14,
            unassignedStudents: 13,
            totalTutors: 6,
            tutorWorkload: [
                { name: 'Tutor 1', count: 6 },
                { name: 'Tutor 2', count: 2 },
                { name: 'Tutor 3', count: 2 },
                { name: 'Tutor 4', count: 2 },
                { name: 'Tutor 5', count: 1 },
                { name: 'Tutor 6', count: 1 }
            ]
        };
        updateAdminStats(mockStats);
    }
}

// Actualizar estadísticas en el DOM
function updateAdminStats(stats) {
    console.log('📝 Actualizando estadísticas en el DOM:', stats);
    
    // Actualizar valores
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value || 0;
            console.log(`✓ ${id}:`, value);
        } else {
            console.warn(`⚠️ Elemento #${id} no encontrado`);
        }
    };
    
    // Actualizar contadores del nuevo diseño
    updateElement('unassignedCount', stats.unassignedStudents || (stats.totalStudents - stats.assignedStudents) || 0);
    updateElement('assignedCount', stats.assignedStudents || 0);
    updateElement('totalStudentsChart', stats.totalStudents || 0);
    
    // Actualizar gráficos si existen los datos
    if (stats.tutorWorkload) {
        updateAssignmentCharts(stats);
    }
}

// Actualizar gráficos de asignación
function updateAssignmentCharts(stats) {
    // Actualizar gráfico circular de estado de asignación
    const circle = document.getElementById('assignedCircle');
    if (circle && stats.totalStudents > 0) {
        const circumference = 2 * Math.PI * 80; // 2πr where r=80
        const assignedPercent = (stats.assignedStudents || 0) / stats.totalStudents;
        const offset = circumference * (1 - assignedPercent);
        circle.style.strokeDashoffset = offset;
    }
    
    // Actualizar gráfico de barras de carga de trabajo
    const chartContainer = document.getElementById('tutorWorkloadChart');
    if (chartContainer && stats.tutorWorkload) {
        chartContainer.innerHTML = '';
        const maxCount = Math.max(...stats.tutorWorkload.map(t => t.count), 10);
        
        stats.tutorWorkload.forEach(tutor => {
            const barWrapper = document.createElement('div');
            barWrapper.className = 'flex flex-col items-center flex-1';
            
            const heightPercent = (tutor.count / maxCount) * 100;
            const barColor = tutor.count >= 6 ? 'bg-orange-500' : tutor.count >= 2 ? 'bg-green-500' : 'bg-green-400';
            
            barWrapper.innerHTML = `
                <div class="text-sm font-bold mb-1">${tutor.count}</div>
                <div class="${barColor} w-12 rounded-t transition-all" style="height: ${heightPercent}%"></div>
                <div class="text-xs text-gray-600 mt-2 text-center">${tutor.name || 'T' + (stats.tutorWorkload.indexOf(tutor) + 1)}</div>
            `;
            
            chartContainer.appendChild(barWrapper);
        });
    }
}

// Navegar a la sección de asignaciones
function irAAsignaciones() {
    console.log('🔄 Navegando a asignaciones...');
    // Si existe la función del sidebar, usarla
    if (typeof handleMenuAction === 'function') {
        handleMenuAction('showAssignmentsSection');
    } else {
        // Scroll a la sección de asignaciones si está en la misma página
        const assignSection = document.querySelector('.admin-panel-section');
        if (assignSection) {
            assignSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Cargar contenido HTML del administrador
async function loadAdminContent() {
    const content = document.getElementById('dashboardContent');
    
    try {
        // 1. Cargar primero el módulo de semestre (Estado del Semestre)
        await loadSemesterContent();
        
        // 2. Cargar el cronograma académico
        if (typeof loadCronogramaContent === 'function') {
            await loadCronogramaContent();
        }
        
        // 3. Cargar el dashboard del administrador
        const response = await fetch('/frontend/components/administrador/dashboard.html');
        const html = await response.text();
        
        // Limpiar contenido existente del admin panel
        const existingAdmin = content.querySelector('.admin-panel-section');
        if (existingAdmin) {
            existingAdmin.remove();
        }
        
        // Insertar contenido del dashboard después de la sección de semestre
        content.insertAdjacentHTML('beforeend', html);
        
        // Cargar asignaciones activas (resumen)
        loadActiveAssignments();
        
        // Inicializar módulo de asignación/reasignación
        initAssignmentModule();
        
        // Inicializar módulo de Registro de Auditoría (admin)
        initAuditModule();
        
    } catch (error) {
        console.error('Error al cargar contenido del administrador:', error);
    }
}

// Gestionar usuarios
async function manageUsers(role = 'all') {
    try {
        const endpoint = role === 'all' ? '/admin?action=users' : `/admin?action=users&role=${role}`;
        const response = await apiGet(endpoint);
        
        if (response.success) {
            renderUsersTable(response.data);
        } else {
            showNotification('Error al cargar usuarios', 'error');
        }
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        showNotification('Error al cargar usuarios', 'error');
    }
}

// Renderizar tabla de usuarios usando template
function renderUsersTable(users) {
    const container = document.getElementById('usersTableContainer');
    
    if (!users || users.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay usuarios para mostrar</p>';
        return;
    }
    
    // Clonar template de tabla
    const tableTemplate = document.getElementById('usersTableTemplate');
    if (!tableTemplate) {
        // Fallback si no hay template
        displayUsersTableFallback(users, container);
        return;
    }
    
    const tableClone = tableTemplate.content.cloneNode(true);
    const tbody = tableClone.getElementById('usersTableBody');
    
    // Etiquetas de roles
    const roleLabels = {
        'admin': 'Administrador',
        'tutor': 'Tutor',
        'student': 'Estudiante',
        'verifier': 'Verificador'
    };
    
    // Generar filas
    users.forEach(user => {
        const rowTemplate = document.getElementById('userRowTemplate');
        if (!rowTemplate) return;
        
        const row = rowTemplate.content.cloneNode(true);
        
        // Llenar datos
        row.querySelector('[data-field="email"]').textContent = user.email;
        row.querySelector('[data-field="name"]').textContent = user.name || 'Sin nombre';
        row.querySelector('[data-field="role"]').textContent = roleLabels[user.role] || user.role;
        
        // Estado
        const statusBadge = user.active == 1 
            ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Activo</span>'
            : '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactivo</span>';
        row.querySelector('[data-field="status"]').innerHTML = statusBadge;
        
        // Acciones
        const actionsHTML = `
            <button onclick="editUser(${user.id})" class="text-blue-600 hover:text-blue-800 mr-3">Editar</button>
            <button onclick="toggleUserStatus(${user.id}, ${user.active})" class="text-${user.active == 1 ? 'red' : 'green'}-600 hover:text-${user.active == 1 ? 'red' : 'green'}-800">
                ${user.active == 1 ? 'Desactivar' : 'Activar'}
            </button>
        `;
        row.querySelector('[data-field="actions"]').innerHTML = actionsHTML;
        
        tbody.appendChild(row);
    });
    
    container.innerHTML = '';
    container.appendChild(tableClone);
}
// Fallback para mostrar tabla sin template
function displayUsersTableFallback(users, container) {
    const roleLabels = {
        'admin': 'Administrador',
        'tutor': 'Tutor',
        'student': 'Estudiante',
        'verifier': 'Verificador'
    };
    
    let tableHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    users.forEach(user => {
        const statusBadge = user.active == 1 
            ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Activo</span>'
            : '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactivo</span>';
        
        tableHTML += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.name || 'Sin nombre'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${roleLabels[user.role] || user.role}</td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button onclick="editUser(${user.id})" class="text-blue-600 hover:text-blue-800 mr-3">Editar</button>
                    <button onclick="toggleUserStatus(${user.id}, ${user.active})" class="text-${user.active == 1 ? 'red' : 'green'}-600 hover:text-${user.active == 1 ? 'red' : 'green'}-800">
                        ${user.active == 1 ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Cargar todos los usuarios
async function loadAllUsers() {
    await manageUsers('all');
}

// Cargar asignaciones activas
async function loadActiveAssignments() {
    try {
        const response = await apiGet('/admin?action=assignments');
        
        if (response.success) {
            renderAssignments(response.data);
        } else {
            showNotification('Error al cargar asignaciones', 'error');
        }
    } catch (error) {
        console.error('Error al cargar asignaciones:', error);
        document.getElementById('assignmentsContainer').innerHTML = 
            '<p class="text-red-500 text-center py-4">Error al cargar asignaciones</p>';
    }
}
// ------------------- PRUEBA (Para la historia de usuario de las asignaciones)------------------

// ID del tutor actualmente seleccionado
let tutorSeleccionado = null;

/* ------------------------------------------------------------
   1. Inicializar módulo
   ------------------------------------------------------------ */

async function initAssignmentModule() {
    try {
        console.log('[admin] Requesting assignmentData... API_BASE_URL=', window.__API_BASE_URL);
        const response = await apiGet('/admin?action=assignmentData');
        console.log('[admin] assignmentData response:', response);

        if (response && response.success) {
            const data = response.data;

            tutores = data.tutors || [];
            asignaciones = data.assignments || {};
            estudiantesNoAsignados = data.unassignedStudents || [];

            // Guardar semestre actual para usar al asignar
            window.CURRENT_SEMESTER_ID = data.semesterId || null;

            cargarTutores();
            if (tutores.length > 0) {
                seleccionarTutor(tutores[0].id);
            }

            // Eventos de búsqueda (si quieres hacerlos funcionales)
            initAssignmentSearchEvents();

            // Botón asignar aleatoriamente
            const btnRandom = document.getElementById("btnAsignarAleatorio");
            if (btnRandom) {
                btnRandom.addEventListener("click", asignarAleatoriamente);
            }
        } else {
            console.error('Error al cargar datos de asignación:', response?.message || 'sin respuesta');
        }
    } catch (error) {
        console.error('Error al inicializar módulo de asignación:', error);
    }
}

/* ------------------------------------------------------------
   2. Cargar lista de tutores
   ------------------------------------------------------------ */


function cargarTutores(filtroNombre = "") {
    const contenedor = document.querySelector(".tutor-items");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    tutores
        .filter(t => (t.name || t.nombre || '').toLowerCase().includes(filtroNombre.toLowerCase()))
        .forEach(tutor => {
            const totalAsignados = asignaciones[tutor.id]?.length || 0;
            const displayName = tutor.nombre || tutor.name || (tutor.nombres ? `${tutor.nombres} ${tutor.apellidos || ''}`.trim() : 'Sin nombre');

            const btn = document.createElement("button");
            btn.className = `
                tutor-btn text-left px-3 py-2 bg-gray-100 rounded-lg 
                hover:bg-gray-200 transition
            `;
            btn.dataset.id = tutor.id;

            const maxCapacity = tutor.max || 10;
            btn.innerHTML = `
                <strong>${displayName}</strong><br>
                <span class="text-sm text-gray-600">
                    Estudiantes asignados: ${totalAsignados} / ${maxCapacity}
                </span>
            `;

            btn.addEventListener("click", () => seleccionarTutor(tutor.id));

            contenedor.appendChild(btn);
        });
}

/* ------------------------------------------------------------
   3. Seleccionar tutor
   ------------------------------------------------------------ */

function seleccionarTutor(tutorID) {
    tutorSeleccionado = tutorID;

    // Resaltar el tutor seleccionado
    document.querySelectorAll(".tutor-btn").forEach(btn => {
        const isSelected = btn.dataset.id === tutorID;
        btn.classList.toggle("bg-red-200", btn.dataset.id === tutorID);
        btn.classList.toggle("border", true);
        btn.classList.toggle("border-red-600", btn.dataset.id === tutorID);
    });

    cargarEstudiantesAsignados();
    cargarEstudiantesNoAsignados();
}


/* ------------------------------------------------------------
   4. Mostrar estudiantes asignados
   ------------------------------------------------------------ */

function cargarEstudiantesAsignados(filtroNombre = "") {
    const contenedor = document.getElementById("assigned-students");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (!tutorSeleccionado) {
        contenedor.innerHTML = `<p class="text-gray-500">Seleccione un tutor</p>`;
        return;
    }

    (asignaciones[tutorSeleccionado] || [])
        .filter(e => {
            if (!e) return false;
            const nombre = e.nombre || e.nombreEstudiante || (e.nombres ? `${e.nombres} ${e.apellidos || ''}`.trim() : '');
            return String(nombre).toLowerCase().includes(String(filtroNombre || '').toLowerCase());
        })
        .forEach(est => {
            // Compatibilidad: manejar diferentes shapes de objeto de estudiante
            const estudianteId = est.idEstudiante || est.id || est.codigo || '';
            const estudianteNombre = est.nombreEstudiante || est.nombre || (est.nombres ? `${est.nombres} ${est.apellidos || ''}`.trim() : 'Sin nombre');
            if (!String(estudianteNombre).toLowerCase().includes(String(filtroNombre || '').toLowerCase())) return;
            const div = document.createElement("div");
            div.className = `
                student-item bg-white border rounded-lg p-3 
                flex justify-between items-center shadow-sm
            `;

            div.innerHTML = `
                <span>${estudianteNombre}</span>
                <button class="remove-btn bg-red-800 text-white px-3 py-1 rounded hover:bg-red-700">
                    Quitar
                </button>
            `;
            /* 
            tutor-btn text-left px-3 py-2 bg-gray-100 rounded-lg 
                hover:bg-gray-200 transition
            */

            div.querySelector(".remove-btn").addEventListener("click", () => {
                quitarEstudiante(estudianteId);
            });

            contenedor.appendChild(div);
        });
}


/* ------------------------------------------------------------
   5. Mostrar estudiantes NO asignados
   ------------------------------------------------------------ */

function cargarEstudiantesNoAsignados(filtroNombre = "") {
    const contenedor = document.getElementById("unassigned-students");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    estudiantesNoAsignados
        .filter(e => {
            const nombre = e.nombre || (e.nombres ? `${e.nombres} ${e.apellidos || ''}`.trim() : '');
            return nombre.toLowerCase().includes(filtroNombre.toLowerCase());
        })
        .forEach(est => {
            const estudianteId = est.id || est.codigo || '';
            const nombre = est.nombre || (est.nombres ? `${est.nombres} ${est.apellidos || ''}`.trim() : 'Sin nombre');
            const div = document.createElement("div");
            div.className = `
                student-item bg-gray border rounded-lg p-3 
                flex justify-between items-center shadow-sm
            `;

            div.innerHTML = `
                <span>${nombre}</span>
                <button class="assign-btn bg-red-700 text-white px-4 py-1 rounded-lg hover:bg-red-800">
                    + Asignar
                </button>
            `;

            div.querySelector(".assign-btn").addEventListener("click", () => {
                asignarEstudiante(estudianteId);
            });

            contenedor.appendChild(div);
        });
}



/* ------------------------------------------------------------
   6. Asignar un estudiante
   ------------------------------------------------------------ */

async function asignarEstudiante(idEstudiante) {
    if (!tutorSeleccionado) return alert('Seleccione un tutor');

    const semesterId = window.CURRENT_SEMESTER_ID;
    if (!semesterId) return alert('No hay semestre activo configurado');

    try {
        const resp = await apiPost('/admin?action=assignStudent', {
            tutorId: tutorSeleccionado,
            studentId: idEstudiante,
            semesterId: semesterId
        });

        if (!resp) return alert('Error en la petición');
        if (!resp.success) return alert(resp.message || 'No se pudo asignar estudiante');

        // Refrescar datos desde el backend
        await initAssignmentModule();
    } catch (e) {
        console.error('Error al asignar estudiante:', e);
        alert('Error al asignar estudiante');
    }
}



/* ------------------------------------------------------------
   7. Quitar un estudiante (volver a "no asignado")
   ------------------------------------------------------------ */

/* -------- 7. Quitar un estudiante (volver a no asignado) -------- */

async function quitarEstudiante(idEstudiante) {
    if (!tutorSeleccionado) return alert('Seleccione un tutor');

    const lista = asignaciones[tutorSeleccionado] || [];
    const asign = lista.find(a => String(a.id) === String(idEstudiante) || String(a.idEstudiante) === String(idEstudiante));
    if (!asign) return alert('No se encontró la asignación para este estudiante');

    const asignacionId = asign.id || asign.asignacionId || asign.idAsignacion || null;
    if (!asignacionId) return alert('ID de asignación no disponible');

    try {
        const resp = await apiPost('/admin?action=unassignStudent', { asignacionId });
        if (!resp) return alert('Error en la petición');
        if (!resp.success) return alert(resp.message || 'No se pudo desasignar estudiante');

        // Refrescar datos
        await initAssignmentModule();
    } catch (e) {
        console.error('Error al desasignar estudiante:', e);
        alert('Error al desasignar estudiante');
    }
}


/* ------------------------------------------------------------
   8. Botón "Asignar Aleatoriamente"
   ------------------------------------------------------------ */

async function asignarAleatoriamente() {
    // Aquí puedes meter lógica de máximo por tutor (tutor.max)
    estudiantesNoAsignados.forEach(est => {
        const tutor = tutores[Math.floor(Math.random() * tutores.length)];
        asignaciones[tutor.id] = asignaciones[tutor.id] || [];
        asignaciones[tutor.id].push(est);
    });

    estudiantesNoAsignados = [];

    // OPCIONAL: avisar al backend con una sola llamada masiva

    cargarEstudiantesAsignados();
    cargarEstudiantesNoAsignados();
    cargarTutores();
}

/* ------------------------------------------------------------
   9. Busquedas
   ------------------------------------------------------------ */

function initAssignmentSearchEvents() {
    // Buscar tutor
    const formTutor = document.getElementById("formBuscarTutor");
    const inputTutor = document.getElementById("inputBuscarTutor");
    if (formTutor && inputTutor) {
        formTutor.addEventListener("submit", (e) => {
            e.preventDefault();
            cargarTutores(inputTutor.value);
        });
    }

    // Buscar estudiante asignado
    const formEstAsig = document.getElementById("formBuscarEstudianteAsignado");
    const inputEstAsig = document.getElementById("inputBuscarEstudianteAsignado");
    if (formEstAsig && inputEstAsig) {
        formEstAsig.addEventListener("submit", (e) => {
            e.preventDefault();
            cargarEstudiantesAsignados(inputEstAsig.value);
        });
    }

    // Buscar estudiante NO asignado
    const formEstNoAsig = document.getElementById("formBuscarEstudianteNoAsignado");
    const inputEstNoAsig = document.getElementById("inputBuscarEstudianteNoAsignado");
    if (formEstNoAsig && inputEstNoAsig) {
        formEstNoAsig.addEventListener("submit", (e) => {
            e.preventDefault();
            cargarEstudiantesNoAsignados(inputEstNoAsig.value);
        });
    }
}



// -------------------



// Renderizar asignaciones usando template
function renderAssignments(assignments) {
    const container = document.getElementById('assignmentsContainer');
    
    if (!assignments || assignments.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay asignaciones activas</p>';
        return;
    }
    
    const gridDiv = document.createElement('div');
    gridDiv.className = 'grid md:grid-cols-2 gap-4';
    
    const cardTemplate = document.getElementById('assignmentCardTemplate');
    
    assignments.forEach(assignment => {
        if (cardTemplate) {
            // Usar template
            const card = cardTemplate.content.cloneNode(true);
            
            card.querySelector('[data-field="tutor_name"]').textContent = assignment.tutor_name;
            card.querySelector('[data-field="student_count"]').textContent = `${assignment.student_count} estudiantes`;
            card.querySelector('[data-field="tutor_email"]').textContent = `Email: ${assignment.tutor_email}`;
            card.querySelector('[data-field="created_at"]').textContent = `Asignado: ${formatDate(assignment.created_at)}`;
            
            const detailsBtn = card.querySelector('[data-field="details_button"]');
            detailsBtn.onclick = () => viewAssignmentDetails(assignment.tutor_id);
            
            gridDiv.appendChild(card);
        } else {
            // Fallback sin template
            const cardDiv = document.createElement('div');
            cardDiv.className = 'border rounded-lg p-4 hover:shadow-md transition';
            cardDiv.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-semibold text-gray-800">${assignment.tutor_name}</h4>
                        <p class="text-sm text-gray-600">Tutor</p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        ${assignment.student_count} estudiantes
                    </span>
                </div>
                <div class="text-sm text-gray-500">
                    <p>Email: ${assignment.tutor_email}</p>
                    <p class="mt-1">Asignado: ${formatDate(assignment.created_at)}</p>
                </div>
                <button onclick="viewAssignmentDetails(${assignment.tutor_id})" 
                        class="mt-3 text-blue-600 hover:text-blue-800 text-sm">
                    Ver detalles →
                </button>
            `;
            gridDiv.appendChild(cardDiv);
        }
    });
    
    container.innerHTML = '';
    container.appendChild(gridDiv);
}

// Cargar sección de reportes
async function loadReportsSection() {
    try {
        const response = await apiGet('/admin?action=reports');
        
        if (response.success) {
            showReportsModal(response.data);
        } else {
            showNotification('Error al cargar reportes', 'error');
        }
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        showNotification('Error al cargar reportes', 'error');
    }
}

// Mostrar modal de reportes
function showReportsModal(reports) {
    const template = document.getElementById('reportsModalTemplate');
    
    if (!template) {
        // Fallback si no existe el template
        showReportsModalFallback(reports);
        return;
    }
    
    const modal = template.content.cloneNode(true);
    const modalDiv = modal.querySelector('[data-modal="reports"]');
    
    // Cerrar al hacer clic fuera
    modalDiv.onclick = (e) => {
        if (e.target === modalDiv) closeModal('reports');
    };
    
    document.body.appendChild(modal);
    
    // Renderizar reportes
    const reportsContent = document.getElementById('reportsContent');
    
    if (!reports || reports.length === 0) {
        reportsContent.innerHTML = '<p class="text-gray-500 text-center py-4">No hay reportes disponibles</p>';
        return;
    }
    
    // Usar template de tabla
    const tableTemplate = document.getElementById('reportsTableTemplate');
    if (!tableTemplate) {
        // Fallback
        reportsContent.innerHTML = generateReportsTableHTML(reports);
        return;
    }
    
    const tableClone = tableTemplate.content.cloneNode(true);
    const tbody = tableClone.getElementById('reportsTableBody');
    
    reports.forEach(report => {
        const rowTemplate = document.getElementById('reportRowTemplate');
        if (!rowTemplate) return;
        
        const row = rowTemplate.content.cloneNode(true);
        
        row.querySelector('[data-field="tutor_name"]').textContent = report.tutor_name || 'N/A';
        row.querySelector('[data-field="created_at"]').textContent = formatDate(report.created_at);
        row.querySelector('[data-field="description"]').textContent = report.description || 'Sin descripción';
        
        tbody.appendChild(row);
    });
    
    reportsContent.innerHTML = '';
    reportsContent.appendChild(tableClone);
}

// Fallback modal de reportes sin template
function showReportsModalFallback(reports) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.setAttribute('data-modal', 'reports');
    modal.onclick = (e) => {
        if (e.target === modal) closeModal('reports');
    };
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-hidden" onclick="event.stopPropagation()">
            <div class="p-6 border-b">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-800">Reportes del Sistema</h3>
                    <button onclick="closeModal('reports')" class="text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="p-6">
                ${!reports || reports.length === 0 
                    ? '<p class="text-gray-500 text-center py-4">No hay reportes disponibles</p>'
                    : generateReportsTableHTML(reports)
                }
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Generar HTML de tabla de reportes
function generateReportsTableHTML(reports) {
    let html = `
        <div class="overflow-x-auto max-h-96 overflow-y-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Tutor</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    reports.forEach(report => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm">${report.tutor_name || 'N/A'}</td>
                <td class="px-4 py-2 text-sm">${formatDate(report.created_at)}</td>
                <td class="px-4 py-2 text-sm">${report.description || 'Sin descripción'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

// Mostrar modal para crear usuario
function showCreateUserModal() {
    const template = document.getElementById('createUserModalTemplate');
    
    if (!template) {
        // Fallback si no existe el template
        showNotification('Template no encontrado', 'error');
        return;
    }
    
    const modal = template.content.cloneNode(true);
    const modalDiv = modal.querySelector('[data-modal="createUser"]');
    
    // Cerrar al hacer clic fuera
    modalDiv.onclick = (e) => {
        if (e.target === modalDiv) closeModal('createUser');
    };
    
    document.body.appendChild(modal);
    
    // Adjuntar evento de submit
    document.getElementById('createUserForm').onsubmit = async (e) => {
        e.preventDefault();
        await createUser();
    };
}

// Crear usuario
async function createUser() {
    const email = document.getElementById('newUserEmail').value;
    const name = document.getElementById('newUserName').value;
    const role = document.getElementById('newUserRole').value;
    
    try {
        const response = await apiPost('/admin?action=createUser', {
            email,
            name,
            role
        });
        
        if (response.success) {
            showNotification('Usuario creado exitosamente', 'success');
            closeModal('createUser');
            loadAllUsers();
        } else {
            showNotification(response.message || 'Error al crear usuario', 'error');
        }
    } catch (error) {
        console.error('Error al crear usuario:', error);
        showNotification('Error al crear usuario', 'error');
    }
}

// Cerrar modal
function closeModal(modalName) {
    const modal = document.querySelector(`[data-modal="${modalName}"]`);
    if (modal) {
        modal.remove();
    }
}

// Mostrar modal para asignar estudiante
function showAssignStudentModal() {
    showNotification('Función de asignación en desarrollo', 'info');
}

// Ver detalles de asignación
function viewAssignmentDetails(tutorId) {
    showNotification(`Ver detalles del tutor ${tutorId}`, 'info');
}

// Editar usuario
function editUser(userId) {
    showNotification(`Editar usuario ${userId} - En desarrollo`, 'info');
}

// Activar/Desactivar usuario
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const action = newStatus == 1 ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Estás seguro de ${action} este usuario?`)) {
        return;
    }
    
    try {
        const response = await apiPost('/admin?action=toggleUser', {
            userId,
            active: newStatus
        });
        
        if (response.success) {
            showNotification(`Usuario ${action}do exitosamente`, 'success');
            loadAllUsers();
        } else {
            showNotification(response.message || `Error al ${action} usuario`, 'error');
        }
    } catch (error) {
        console.error('Error al cambiar estado del usuario:', error);
        showNotification(`Error al ${action} usuario`, 'error');
    }
}

// Función auxiliar para actualizar texto de elemento
function updateElementText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ------------------ Módulo Registro de Auditoría (Admin) ------------------
function initAuditModule() {
    const container = document.getElementById('auditLogContainer');
    if (!container) return;

    const html = `
        <div class="mb-4">
            <form id="auditFilterForm" class="flex flex-wrap gap-2 items-end">
                <div class="w-full sm:w-auto">
                    <label class="text-sm text-gray-600">Usuario</label>
                    <input type="text" id="auditUsuario" class="border p-2 rounded w-full" placeholder="Nombre o correo">
                </div>
                <div class="w-full sm:w-auto">
                    <label class="text-sm text-gray-600">Acción</label>
                    <input type="text" id="auditAccion" class="border p-2 rounded w-full" placeholder="p.ej. login, crear_usuario">
                </div>
                <div class="w-full sm:w-auto">
                    <label class="text-sm text-gray-600">Desde</label>
                    <input type="datetime-local" id="auditDesde" class="border p-2 rounded w-full">
                </div>
                <div class="w-full sm:w-auto">
                    <label class="text-sm text-gray-600">Hasta</label>
                    <input type="datetime-local" id="auditHasta" class="border p-2 rounded w-full">
                </div>
                <div class="w-full sm:w-auto">
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Filtrar</button>
                </div>
                <div class="w-full sm:w-auto">
                    <button type="button" id="auditClear" class="px-4 py-2 bg-gray-200 rounded">Limpiar</button>
                </div>
            </form>
        </div>
        <div id="auditTableWrap" class="overflow-x-auto">
            <p class="text-gray-500 text-center py-4">Use los filtros y presione "Filtrar" para ver registros</p>
        </div>
    `;

    container.innerHTML = html;

    const form = document.getElementById('auditFilterForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAuditSearch();
    });

    document.getElementById('auditClear').addEventListener('click', async () => {
        document.getElementById('auditUsuario').value = '';
        document.getElementById('auditAccion').value = '';
        document.getElementById('auditDesde').value = '';
        document.getElementById('auditHasta').value = '';
        await handleAuditSearch();
    });

    // Cargar últimos registros por defecto
    handleAuditSearch();
}

async function handleAuditSearch() {
    const usuario = document.getElementById('auditUsuario').value.trim();
    const accion = document.getElementById('auditAccion').value.trim();
    const desde = document.getElementById('auditDesde').value;
    const hasta = document.getElementById('auditHasta').value;

    const params = new URLSearchParams();
    if (usuario) params.append('usuario', usuario);
    if (accion) params.append('accion', accion);
    if (desde) params.append('desde', desde.replace('T', ' '));
    if (hasta) params.append('hasta', hasta.replace('T', ' '));
    params.append('limit', '200');

    try {
        const response = await apiGet('/log.php?' + params.toString());
        const wrap = document.getElementById('auditTableWrap');
        if (!response || !response.success) {
            wrap.innerHTML = `<p class="text-red-500 text-center py-4">${response?.message || 'Error al consultar auditoría'}</p>`;
            return;
        }

        const logs = response.data || [];
        renderAuditTable(logs);
    } catch (error) {
        const wrap = document.getElementById('auditTableWrap');
        wrap.innerHTML = `<p class="text-red-500 text-center py-4">Error de conexión al consultar auditoría</p>`;
        console.error('Error al cargar auditoría:', error);
    }
}

function renderAuditTable(logs) {
    const wrap = document.getElementById('auditTableWrap');
    if (!logs || logs.length === 0) {
        wrap.innerHTML = '<p class="text-gray-500 text-center py-4">No se encontraron registros</p>';
        return;
    }

    let html = `
        <div class="overflow-x-auto max-h-96 overflow-y-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha y hora</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Usuario</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Rol</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Acción</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500">IP</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;

    logs.forEach(r => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm">${formatDateTime(r.fechaHora)}</td>
                <td class="px-4 py-2 text-sm">${r.usuario || 'N/A'}</td>
                <td class="px-4 py-2 text-sm">${r.tipoAcceso || 'N/A'}</td>
                <td class="px-4 py-2 text-sm">${r.accion || ''}</td>
                <td class="px-4 py-2 text-sm">${r.descripcion || ''}</td>
                <td class="px-4 py-2 text-sm">${r.ipOrigen || ''}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    wrap.innerHTML = html;
}

function formatDateTime(dt) {
    if (!dt) return 'N/A';
    try {
        const d = new Date(dt);
        return d.toLocaleString('es-PE');
    } catch (e) {
        return dt;
    }
}

// ------------------ Fin módulo auditoría ------------------

// ============= EXPORTAR FUNCIONES GLOBALES =============
window.loadAdminPanelContent = loadAdminPanelContent;
window.loadAdminStats = loadAdminStats;
window.updateAssignmentCharts = updateAssignmentCharts;
window.irAAsignaciones = irAAsignaciones;
window.refreshUpcomingSessions = () => console.log('Refrescando sesiones próximas...');
window.refreshRecentActivity = () => console.log('Refrescando actividad reciente...');
