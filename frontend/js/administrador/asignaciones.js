/* ============================================================
   MÓDULO DE ASIGNACIONES - Sistema de Tutorías UNSAAC
   ============================================================ */

(function() {
    'use strict';

    // Variables globales
    window.tutorSeleccionado = null;
    window.tutores = [];
    window.asignaciones = {};
    window.estudiantesNoAsignados = [];

    /* ------------------------------------------------------------
       0. Cargar módulo de asignaciones (DEBE SER LO PRIMERO)
       ------------------------------------------------------------ */

    window.loadAsignacionesContent = async function() {
        const dashboardContent = document.getElementById('dashboardContent');
        if (!dashboardContent) {
            console.error('❌ No se encontró #dashboardContent');
            return;
        }
        
        try {
            const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
            const htmlPath = `${basePath}/components/administrador/asignaciones.html`;
            
            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            
            const html = await response.text();
            dashboardContent.innerHTML = html;
            
            // Inicializar el módulo después de cargar el HTML
            setTimeout(() => {
                initAssignmentModule();
            }, 100);
        } catch (error) {
            console.error('❌ Error al cargar módulo de asignaciones:', error);
            dashboardContent.innerHTML = `<div class="p-6 text-red-600">Error al cargar el módulo de asignaciones: ${error.message}</div>`;
        }
    };

    /* ------------------------------------------------------------
       1. Inicializar módulo
       ------------------------------------------------------------ */

    async function initAssignmentModule() {
        try {
            const response = await apiGet('/asignaciones?action=getData');
            
            if (response && response.success) {
                const data = response.data;

                window.tutores = data.tutors || [];
                window.asignaciones = data.assignments || {};
                window.estudiantesNoAsignados = data.unassignedStudents || [];

                // Guardar semestre actual para usar al asignar
                window.CURRENT_SEMESTER_ID = data.semesterId || null;
                window.CURRENT_SEMESTER_NOMBRE = data.semestreNombre || 'Semestre Activo';

                cargarTutores();
                if (window.tutores.length > 0) {
                    seleccionarTutor(window.tutores[0].id);
                }

                // Eventos de búsqueda
                initAssignmentSearchEvents();

                // Botón asignar aleatoriamente - abrir modal
                const btnRandom = document.getElementById("btnAsignarAleatorio");
                if (btnRandom) {
                    btnRandom.addEventListener("click", abrirModalAsignacion);
                }
            } else {
                console.error('Error al cargar datos de asignación:', response?.message || 'sin respuesta');
                alert('Error al cargar datos de asignación');
            }
        } catch (error) {
            console.error('Error al inicializar módulo de asignación:', error);
            alert('Error al cargar el módulo de asignaciones');
        }
    }

/* ------------------------------------------------------------
2. Cargar lista de tutores
------------------------------------------------------------ */


function cargarTutores(filtroNombre = "") {
    const contenedor = document.querySelector(".tutor-items");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const tutoresFiltrados = window.tutores.filter(t => {
        const nombre = t.nombre || (t.nombres && t.apellidos ? `${t.nombres} ${t.apellidos}` : '');
        return nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    });

    tutoresFiltrados.forEach(tutor => {
            const totalAsignados = window.asignaciones[tutor.id]?.length || 0;
            const displayName = tutor.nombre || (tutor.nombres && tutor.apellidos ? `${tutor.nombres} ${tutor.apellidos}` : 'Sin nombre');

            const btn = document.createElement("button");
            btn.className = `tutor-btn text-left px-3 py-2.5 bg-white rounded border border-gray-300 hover:bg-gray-50 transition`;
            btn.dataset.id = tutor.id;

            const maxCapacity = tutor.max || 10;
            
            // Verificar si está en capacidad máxima
            const estaLleno = totalAsignados >= maxCapacity;
            
            btn.innerHTML = `
                <div class="font-semibold text-gray-900 text-sm">${displayName}</div>
                <div class="text-xs ${estaLleno ? 'text-red-600 font-bold' : 'text-gray-600'}">
                    ${estaLleno ? 'CARGA LLENA' : 'Estudiantes Asignados'} : ${totalAsignados} / ${maxCapacity}
                </div>
            `;
            
            btn.addEventListener("click", () => seleccionarTutor(tutor.id));

            contenedor.appendChild(btn);
        });
}
/* ------------------------------------------------------------
   3. Seleccionar tutor
   ------------------------------------------------------------ */

function seleccionarTutor(tutorID) {
    window.tutorSeleccionado = tutorID;

    // Resaltar el tutor seleccionado
    document.querySelectorAll(".tutor-btn").forEach(btn => {
        const isSelected = btn.dataset.id === tutorID;
        if (isSelected) {
            btn.classList.remove('bg-white', 'border-gray-300');
            btn.classList.add('bg-red-200', 'border-red-800');
        } else {
            btn.classList.remove('bg-red-200', 'border-red-800');
            btn.classList.add('bg-white', 'border-gray-300');
        }
    });
    
    // Actualizar nombre del tutor seleccionado
    const tutor = window.tutores.find(t => t.id === tutorID);
    const nombreTutorSpan = document.getElementById('nombre-tutor-seleccionado');
    if (nombreTutorSpan && tutor) {
        const displayName = tutor.nombre || (tutor.nombres && tutor.apellidos ? `${tutor.nombres} ${tutor.apellidos}` : 'Sin nombre');
        nombreTutorSpan.textContent = displayName;
    }
    
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

    const countElement = document.getElementById('count-asignados');
    
    if (!window.tutorSeleccionado) {
        contenedor.innerHTML = `<p class="text-gray-500 text-center py-4">Seleccione un tutor</p>`;
        if (countElement) countElement.textContent = '0';
        return;
    }

    const estudiantesAsignados = window.asignaciones[window.tutorSeleccionado] || [];
    if (countElement) countElement.textContent = estudiantesAsignados.length;
    
    if (estudiantesAsignados.length === 0) {
        contenedor.innerHTML = `<p class="text-gray-500 text-center py-4">No hay estudiantes asignados</p>`;
        return;
    }

    const estudiantesFiltrados = estudiantesAsignados.filter(e => {
        if (!e) return false;
        const nombre = e.nombreEstudiante || e.nombre || (e.nombres && e.apellidos ? `${e.nombres} ${e.apellidos}` : '');
        return nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    });

    estudiantesFiltrados.forEach(est => {
            const estudianteNombre = est.nombreEstudiante || est.nombre || (est.nombres && est.apellidos ? `${est.nombres} ${est.apellidos}` : 'Sin nombre');
            
            const div = document.createElement("div");
            div.className = `student-item border border-gray-400 rounded p-2.5 flex justify-between items-center hover:bg-white bg-gray-50`;

            div.innerHTML = `
                <div class="font-medium text-gray-900 text-sm">${estudianteNombre}</div>
                <button class="remove-btn bg-red-700 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-800">
                    Quitar
                </button>
            `;

            div.querySelector(".remove-btn").addEventListener("click", () => {
                quitarEstudiante(est.id);
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
    
    const countElement = document.getElementById('count-sin-asignar');
    if (countElement) countElement.textContent = window.estudiantesNoAsignados.length;

    if (window.estudiantesNoAsignados.length === 0) {
        contenedor.innerHTML = `<p class="text-gray-500 text-center py-4">Todos los estudiantes están asignados</p>`;
        return;
    }

    const estudiantesFiltrados = window.estudiantesNoAsignados.filter(e => {
        const nombre = e.nombre || (e.nombres && e.apellidos ? `${e.nombres} ${e.apellidos}` : '');
        return nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    });

    estudiantesFiltrados.forEach(est => {
            const estudianteId = est.id || '';
            const nombre = est.nombre || (est.nombres && est.apellidos ? `${est.nombres} ${est.apellidos}` : 'Sin nombre');
            
            const div = document.createElement("div");
            div.className = `student-item border border-gray-400 rounded p-2.5 flex justify-between items-center hover:bg-white bg-gray-50`;

            div.innerHTML = `
                <div class="font-medium text-gray-900 text-sm">${nombre}</div>
                <button class="assign-btn bg-red-700 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-800">
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
    if (!window.tutorSeleccionado) return alert('Seleccione un tutor');
    const semesterId = window.CURRENT_SEMESTER_ID;
    if (!semesterId) return alert('No hay semestre activo configurado');
    try {
        const resp = await apiPost('/asignaciones?action=assignStudent', {
            tutorId: window.tutorSeleccionado,
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
    if (!window.tutorSeleccionado) return alert('Seleccione un tutor');
    const lista = window.asignaciones[window.tutorSeleccionado] || [];
    const asign = lista.find(a => String(a.id) === String(idEstudiante) || String(a.idEstudiante) === String(idEstudiante));
    if (!asign) return alert('No se encontró la asignación para este estudiante');
    const asignacionId = asign.id || asign.asignacionId || asign.idAsignacion || null;
    if (!asignacionId) return alert('ID de asignación no disponible');
    try {
        const resp = await apiPost('/asignaciones?action=unassignStudent', { asignacionId });
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
   8. Funciones de búsqueda
   ------------------------------------------------------------ */

function initAssignmentSearchEvents() {
    // Búsqueda de tutores en tiempo real
    const inputBuscarTutor = document.getElementById('inputBuscarTutor');
    if (inputBuscarTutor) {
        inputBuscarTutor.addEventListener('input', (e) => {
            const filtro = e.target.value;
            cargarTutores(filtro);
        });
    }

    // Búsqueda de estudiantes asignados en tiempo real
    const inputBuscarAsignado = document.getElementById('inputBuscarEstudianteAsignado');
    if (inputBuscarAsignado) {
        inputBuscarAsignado.addEventListener('input', (e) => {
            const filtro = e.target.value;
            cargarEstudiantesAsignados(filtro);
        });
    }

    // Búsqueda de estudiantes no asignados en tiempo real
    const inputBuscarNoAsignado = document.getElementById('inputBuscarEstudianteNoAsignado');
    if (inputBuscarNoAsignado) {
        inputBuscarNoAsignado.addEventListener('input', (e) => {
            const filtro = e.target.value;
            cargarEstudiantesNoAsignados(filtro);
        });
    }
}

/* ------------------------------------------------------------
   9. Asignación aleatoria
   ------------------------------------------------------------ */

function abrirModalAsignacion() {
    if (!window.tutores || window.tutores.length === 0) {
        alert('No hay tutores disponibles');
        return;
    }

    if (!window.estudiantesNoAsignados || window.estudiantesNoAsignados.length === 0) {
        alert('No hay estudiantes sin asignar');
        return;
    }

    // Buscar o crear el modal
    let modal = document.getElementById('modalAsignacionAleatoria');
    
    if (!modal) {
        modal = crearModalAsignacion();
        document.body.appendChild(modal);
    }

    // Mostrar información del semestre
    const semestreNombre = document.getElementById('modalSemestreNombre');
    if (semestreNombre) {
        semestreNombre.textContent = window.CURRENT_SEMESTER_NOMBRE || 'Semestre Activo';
    }

    // Mostrar total de estudiantes
    const totalEstudiantes = document.getElementById('modalTotalEstudiantes');
    if (totalEstudiantes) {
        totalEstudiantes.textContent = window.estudiantesNoAsignados.length;
    }

    // Llenar lista de tutores con checkboxes
    llenarListaTutoresModal();

    // Mostrar modal
    modal.classList.remove('hidden');
}

function crearModalAsignacion() {
    const modal = document.createElement('div');
    modal.id = 'modalAsignacionAleatoria';
    modal.className = 'hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    modal.style.zIndex = '99999';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" style="box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <h3 class="text-xl font-bold mb-4 text-gray-900">Asignación Automática de Estudiantes</h3>
            
            <!-- Información del Semestre -->
            <div class="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-2 mb-2">
                    <svg class="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <h4 class="font-semibold text-blue-900">Semestre Activo</h4>
                </div>
                <p class="text-blue-900 font-bold text-lg" id="modalSemestreNombre">Cargando...</p>
            </div>

            <!-- Información de Estudiantes -->
            <div class="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-2 mb-2">
                    <svg class="w-5 h-5 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                    <h4 class="font-semibold text-yellow-900">Estudiantes Sin Asignar</h4>
                </div>
                <p class="text-yellow-900 font-bold">
                    Total: <span id="modalTotalEstudiantes" class="text-2xl">0</span> estudiantes pendientes de asignación
                </p>
            </div>

            <!-- Selección de Tutores -->
            <div class="mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-gray-900 text-lg">Seleccionar Tutores para Asignación</h4>
                    <button id="btnSeleccionarTodosTutores" class="text-sm text-blue-700 hover:text-blue-900 font-bold underline">
                        Seleccionar todos
                    </button>
                </div>
                <p class="text-sm text-gray-700 mb-3 font-medium">
                    Seleccione los tutores que participarán en la asignación automática. Los estudiantes se distribuirán equitativamente entre ellos.
                </p>
                
                <div id="listaTutoresModal" class="border-2 border-gray-400 rounded-lg max-h-60 overflow-y-auto bg-white">
                    <!-- Se llena dinámicamente -->
                </div>
            </div>

            <!-- Botones de Acción -->
            <div class="flex justify-end gap-3 pt-4 border-t-2 border-gray-300">
                <button id="btnCancelarAsignacion" 
                    class="px-6 py-2.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition font-bold shadow-md">
                    Cancelar
                </button>
                <button id="btnConfirmarAsignacion" 
                    class="px-6 py-2.5 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-600 transition font-bold shadow-lg">
                    Procesar Asignación
                </button>
            </div>
        </div>
    `;
    
    // Agregar event listeners a los botones del modal
    setTimeout(() => {
        const btnConfirmar = document.getElementById('btnConfirmarAsignacion');
        const btnCancelar = document.getElementById('btnCancelarAsignacion');
        const btnSeleccionarTodos = document.getElementById('btnSeleccionarTodosTutores');
        
        if (btnConfirmar) btnConfirmar.addEventListener('click', asignarAleatoriamente);
        if (btnCancelar) btnCancelar.addEventListener('click', cerrarModalAsignacion);
        if (btnSeleccionarTodos) btnSeleccionarTodos.addEventListener('click', toggleSeleccionTodosTutores);
    }, 0);
    
    return modal;
}

function llenarListaTutoresModal() {
    const listaTutoresModal = document.getElementById('listaTutoresModal');
    if (!listaTutoresModal) return;

    listaTutoresModal.innerHTML = '';

    window.tutores.forEach(tutor => {
        const tutorId = tutor.id;
        const asignados = window.asignaciones[tutorId] ? window.asignaciones[tutorId].length : 0;
        const maximo = tutor.max || 10;
        const disponibles = maximo - asignados;
        const displayName = tutor.nombre || (tutor.nombres && tutor.apellidos ? `${tutor.nombres} ${tutor.apellidos}` : 'Sin nombre');

        const tutorItem = document.createElement('div');
        tutorItem.className = 'flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0';
        
        tutorItem.innerHTML = `
            <input type="checkbox" 
                id="tutor-checkbox-${tutorId}" 
                value="${tutorId}" 
                class="tutor-checkbox w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                ${disponibles > 0 ? 'checked' : 'disabled'}>
            <label for="tutor-checkbox-${tutorId}" class="flex-1 cursor-pointer">
                <div class="font-medium text-gray-900">${displayName}</div>
                <div class="text-sm text-gray-600">
                    Asignados: ${asignados} / ${maximo}
                    ${disponibles > 0 
                        ? `<span class="text-green-600 font-medium"> (${disponibles} disponibles)</span>` 
                        : `<span class="text-red-600 font-medium"> (Sin cupo)</span>`}
                </div>
            </label>
        `;

        listaTutoresModal.appendChild(tutorItem);
    });
}

function toggleSeleccionTodosTutores() {
    const checkboxes = document.querySelectorAll('.tutor-checkbox:not([disabled])');
    const todosSeleccionados = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !todosSeleccionados;
    });

    const btn = document.getElementById('btnSeleccionarTodosTutores');
    if (btn) {
        btn.textContent = todosSeleccionados ? 'Seleccionar todos' : 'Deseleccionar todos';
    }
}

function cerrarModalAsignacion() {
    const modal = document.getElementById('modalAsignacionAleatoria');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function asignarAleatoriamente() {
    // Obtener tutores seleccionados
    const checkboxes = document.querySelectorAll('.tutor-checkbox:checked');
    const tutoresSeleccionados = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (tutoresSeleccionados.length === 0) {
        alert('Debe seleccionar al menos un tutor');
        return;
    }

    if (!window.estudiantesNoAsignados || window.estudiantesNoAsignados.length === 0) {
        alert('No hay estudiantes para asignar');
        return;
    }

    // Confirmación
    const totalEstudiantes = window.estudiantesNoAsignados.length;
    const confirmacion = confirm(
        `¿Desea asignar ${totalEstudiantes} estudiante(s) entre ${tutoresSeleccionados.length} tutor(es) seleccionado(s)?`
    );

    if (!confirmacion) return;

    cerrarModalAsignacion();

    try {
        const resp = await apiPost('/asignaciones?action=autoAssign', {
            semesterId: window.CURRENT_SEMESTER_ID,
            tutoresSeleccionados: tutoresSeleccionados
        });

        if (!resp || !resp.success) {
            alert(resp?.message || 'Error al asignar automáticamente');
            return;
        }

        alert(`Asignación automática completada:\n${resp.data.estudiantesAsignados} estudiantes asignados entre ${resp.data.tutoresUtilizados} tutores`);
        await initAssignmentModule();
    } catch (error) {
        console.error('Error en asignación automática:', error);
        alert('Error al asignar automáticamente');
    }
}

})(); // Fin del IIFE
