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
            // Usar helper simplificado
            const htmlPath = window.PATH?.adminAsignaciones() || 
                           `${(window.APP_BASE_PATH || '').replace(/\/+$/, '')}/frontend/components/administrador/asignaciones.html`;
            
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
                        // Mantener el tutor seleccionado si sigue disponible, si no seleccionar el primero
                        let seleccionado = window.tutorSeleccionado;
                        if (!seleccionado || !window.tutores.some(t => String(t.id) === String(seleccionado))) {
                            seleccionado = window.tutores[0].id;
                        }
                        seleccionarTutor(seleccionado);
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

/* ============================================================
   UTILIDADES
   ============================================================ */

/**
 * Obtiene el nombre completo de una persona
 */
function getFullName(person) {
    return person?.nombre || 
           (person?.nombres && person?.apellidos ? `${person.nombres} ${person.apellidos}` : 'Sin nombre');
}

/* ------------------------------------------------------------
2. Cargar lista de tutores
------------------------------------------------------------ */


function cargarTutores(filtroNombre = "") {
    const contenedor = document.querySelector(".tutor-items");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const tutoresFiltrados = window.tutores.filter(t => {
        return getFullName(t).toLowerCase().includes(filtroNombre.toLowerCase());
    });

    tutoresFiltrados.forEach(tutor => {
            const totalAsignados = window.asignaciones[tutor.id]?.length || 0;
            const displayName = getFullName(tutor);

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
        const isSelected = btn.dataset.id == tutorID;
        if (isSelected) {
            btn.classList.remove('bg-white', 'border-gray-300');
            btn.classList.add('bg-red-300', 'border-red-800');
        } else {
            btn.classList.remove('bg-red-200', 'border-red-800');
            btn.classList.add('bg-white', 'border-gray-300');
        }
    });
    
    // Actualizar nombre del tutor seleccionado
    const tutor = window.tutores.find(t => t.id === tutorID);
    const nombreTutorSpan = document.getElementById('nombre-tutor-seleccionado');
    if (nombreTutorSpan && tutor) {
        nombreTutorSpan.textContent = getFullName(tutor);
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
        return e && getFullName(e).toLowerCase().includes(filtroNombre.toLowerCase());
    });

    estudiantesFiltrados.forEach(est => {
            const estudianteNombre = getFullName(est);
            
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
        return getFullName(e).toLowerCase().includes(filtroNombre.toLowerCase());
    });

    estudiantesFiltrados.forEach(est => {
            const nombre = getFullName(est);
            
            const div = document.createElement("div");
            div.className = `student-item border border-gray-400 rounded p-2.5 flex justify-between items-center hover:bg-white bg-gray-50`;

            div.innerHTML = `
                <div class="font-medium text-gray-900 text-sm">${nombre}</div>
                <button class="assign-btn bg-red-700 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-800">
                    + Asignar
                </button>
            `;

            div.querySelector(".assign-btn").addEventListener("click", () => {
                asignarEstudiante(est.id);
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
    // Mapeo de búsquedas para evitar repetición
    const searchConfigs = [
        { inputId: 'inputBuscarTutor', callback: cargarTutores },
        { inputId: 'inputBuscarEstudianteAsignado', callback: cargarEstudiantesAsignados },
        { inputId: 'inputBuscarEstudianteNoAsignado', callback: cargarEstudiantesNoAsignados }
    ];
    
    searchConfigs.forEach(({ inputId, callback }) => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', (e) => callback(e.target.value));
        }
    });
}

/* ============================================================
   9. MODAL DE ASIGNACIÓN AUTOMÁTICA - REFACTORIZADO
   ============================================================ */

/**
 * Crea la estructura HTML del modal
 */
function crearModalHTML() {
    return `
    <div id="modalAsignacionAleatoria" 
        class="modal-overlay hidden"
        role="dialog"
        aria-labelledby="modalTitle"
        aria-hidden="true">
        
        <div class="modal-content animate-fadeInScale">
            
            <!-- Header -->
            <div class="modal-header flex items-center justify-between">
                <h2 id="modalTitle" class="text-2xl font-bold text-gray-900">Asignación Automática de Estudiantes</h2>
                <button type="button" 
                    id="btnCerrarModalX"
                    class="text-gray-500 hover:text-gray-700 transition"
                    aria-label="Cerrar modal">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="modal-body space-y-3">
                
                <!-- Información del Semestre -->
                <div class="info-card bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                        <svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <h3 class="font-bold text-blue-900 text-sm">Semestre Activo</h3>
                    </div>
                    <p class="text-blue-800 font-semibold text-sm ml-7" id="modalSemestreNombre">Cargando...</p>
                </div>

                <!-- Información de Estudiantes -->
                <div class="info-card bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                        <svg class="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                        <h3 class="font-bold text-amber-900 text-sm">Estudiantes Sin Asignar</h3>
                    </div>
                    <p class="text-amber-800 font-semibold text-sm ml-7">
                        Total: <span id="modalTotalEstudiantes" class="text-lg font-bold">0</span> pendientes
                    </p>
                </div>

                <!-- Selección de Tutores -->
                <div class="tutores-section">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-bold text-gray-900 text-base">Tutores para Asignación</h3>
                        <button id="btnSeleccionarTodosTutores" type="button"
                            class="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold transition">
                            Seleccionar todos
                        </button>
                    </div>
                    <p class="text-xs text-gray-600 mb-3">
                        Seleccione tutores para distribución equitativa.
                    </p>
                    
                    <div id="listaTutoresModal" 
                        class="tutores-grid border-2 border-gray-300 rounded-lg overflow-y-auto bg-white divide-y">
                        <!-- Se llena dinámicamente -->
                    </div>
                </div>

            </div>

            <!-- Footer -->
            <div class="modal-footer flex justify-end gap-3">
                <button id="btnCancelarAsignacion" 
                    type="button"
                    class="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold text-sm rounded-lg transition-colors duration-200 shadow-sm">
                    Cancelar
                </button>
                <button id="btnConfirmarAsignacion" 
                    type="button"
                    class="px-5 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
                    Procesar
                </button>
            </div>
            
        </div>
    </div>
    `;
}

/**
 * Obtiene o crea el modal y lo inyecta en el body
 */
function asegurarModalEnBody() {
    let modal = document.getElementById('modalAsignacionAleatoria');
    
    if (!modal) {
        // Crear modal y agregarlo directamente al body
        const modalHTML = crearModalHTML();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('modalAsignacionAleatoria');
    }
    
    return modal;
}

/**
 * Abre y configura el modal de asignación automática
 */
function abrirModalAsignacion() {
    // Validaciones previas
    if (!validarAsignacionAutomatica()) {
        return;
    }

    // Asegurar que el modal existe en el body
    const modal = asegurarModalEnBody();
    if (!modal) {
        console.error('❌ No se pudo crear el modal');
        return;
    }

    // Bloquear scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';

    // Actualizar información del modal
    actualizarInfoModal();
    
    // Llenar lista de tutores
    llenarListaTutoresModal();
    
    // Mostrar modal con transición suave
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    // Activar fallback de centrado
    modal.classList.add('modal-centered');
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
    
    // Resetear scroll del modal body
    requestAnimationFrame(() => {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    });
    
    // Registrar event listeners después de que el modal sea visible
    setTimeout(() => {
        registrarEventosModal();
        
        // Focus en el botón de cerrar para mejor accesibilidad
        const closeBtn = document.getElementById('btnCerrarModalX');
        if (closeBtn) closeBtn.focus();
        // Resetear scroll del cuerpo del modal
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
    }, 50);
}

/**
 * Valida que sea posible realizar la asignación automática
 */
function validarAsignacionAutomatica() {
    if (!window.tutores || window.tutores.length === 0) {
        alert('❌ No hay tutores disponibles para la asignación automática');
        return false;
    }

    if (!window.estudiantesNoAsignados || window.estudiantesNoAsignados.length === 0) {
        alert('❌ No hay estudiantes sin asignar');
        return false;
    }

    return true;
}

/**
 * Actualiza la información mostrada en el modal
 */
function actualizarInfoModal() {
    const semestreNombre = document.getElementById('modalSemestreNombre');
    const totalEstudiantes = document.getElementById('modalTotalEstudiantes');
    
    if (semestreNombre) {
        semestreNombre.textContent = window.CURRENT_SEMESTER_NOMBRE || 'Semestre Activo';
    }
    
    if (totalEstudiantes) {
        totalEstudiantes.textContent = window.estudiantesNoAsignados?.length || 0;
    }
}

/**
 * Registra los event listeners del modal
 */
function registrarEventosModal() {
    const btnConfirmar = document.getElementById('btnConfirmarAsignacion');
    const btnCancelar = document.getElementById('btnCancelarAsignacion');
    const btnCerrar = document.getElementById('btnCerrarModalX');
    const btnSeleccionarTodos = document.getElementById('btnSeleccionarTodosTutores');

    // Clonar botón confirmar para eliminar listeners previos
    if (btnConfirmar) {
        const nuevoBtn = btnConfirmar.cloneNode(true);
        btnConfirmar.replaceWith(nuevoBtn);
        nuevoBtn.addEventListener('click', asignarAleatoriamente);
    }
    
    btnCancelar?.addEventListener('click', cerrarModalAsignacion);
    btnCerrar?.addEventListener('click', cerrarModalAsignacion);
    btnSeleccionarTodos?.addEventListener('click', toggleSeleccionTodosTutores);

    // Listener para tecla ESC
    document.removeEventListener('keydown', manejarTeclaESC);
    document.addEventListener('keydown', manejarTeclaESC);
}

/**
 * Maneja la tecla ESC para cerrar el modal
 */
function manejarTeclaESC(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('modalAsignacionAleatoria');
        if (modal && !modal.classList.contains('hidden')) {
            cerrarModalAsignacion();
        }
    }
}

/**
 * Llena la lista de tutores en el modal con checkboxes
 */
function llenarListaTutoresModal() {
    const listaTutoresModal = document.getElementById('listaTutoresModal');
    if (!listaTutoresModal) return;

    listaTutoresModal.innerHTML = '';

    if (window.tutores.length === 0) {
        listaTutoresModal.innerHTML = '<div class="p-4 text-center text-gray-500">No hay tutores disponibles</div>';
        return;
    }

    window.tutores.forEach((tutor, index) => {
        const tutorId = tutor.id;
        const asignados = window.asignaciones[tutorId] ? window.asignaciones[tutorId].length : 0;
        const maximo = tutor.max || 10;
        const disponibles = maximo - asignados;
        const estaLleno = disponibles <= 0;
        
        const displayName = tutor.nombre || 
                          (tutor.nombres && tutor.apellidos ? `${tutor.nombres} ${tutor.apellidos}` : 'Sin nombre');

        const tutorItem = document.createElement('div');
        tutorItem.className = 'tutor-item-modal';
        
        const statusColor = estaLleno 
            ? 'text-red-600 font-bold' 
            : 'text-green-600 font-medium';
        
        const statusText = estaLleno 
            ? '⚠️ Sin cupo disponible' 
            : `✓ ${disponibles} disponible(s)`;

        tutorItem.innerHTML = `
            <label class="flex items-center gap-3 flex-1">
                <input type="checkbox" 
                    id="tutor-checkbox-${tutorId}" 
                    value="${tutorId}" 
                    class="tutor-checkbox"
                    ${estaLleno ? 'disabled' : 'checked'}
                    aria-label="Seleccionar tutor ${displayName}">
                <div class="tutor-info flex-1">
                    <div class="font-semibold text-gray-900">${displayName}</div>
                    <div class="text-sm text-gray-600">
                        Asignados: ${asignados}/${maximo}
                        <span class="${statusColor}"> ${statusText}</span>
                    </div>
                </div>
            </label>
        `;

        listaTutoresModal.appendChild(tutorItem);
    });
}

/**
 * Alterna la selección de todos los tutores
 */
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

/**
 * Cierra el modal de asignación
 */
function cerrarModalAsignacion() {
    const modal = document.getElementById('modalAsignacionAleatoria');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    // Restaurar scroll del body
    document.body.style.overflow = '';
    
    // Restaurar scroll del body
    document.body.style.overflow = '';
    
    // Remover listener de ESC al cerrar
    document.removeEventListener('keydown', manejarTeclaESC);
    // Desactivar fallback de centrado
    modal.classList.remove('modal-centered');
}

/**
 * Ejecuta la asignación automática de estudiantes
 */
async function asignarAleatoriamente() {
    // Obtener tutores seleccionados
    const checkboxes = document.querySelectorAll('.tutor-checkbox:checked');
    const tutoresSeleccionados = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (tutoresSeleccionados.length === 0) {
        alert('❌ Debe seleccionar al menos un tutor para la asignación');
        return;
    }

    if (!window.estudiantesNoAsignados || window.estudiantesNoAsignados.length === 0) {
        alert('❌ No hay estudiantes para asignar');
        return;
    }

    // Confirmación de la acción
    const totalEstudiantes = window.estudiantesNoAsignados.length;
    const confirmacion = confirm(
        `✓ Asignará ${totalEstudiantes} estudiante(s) entre ${tutoresSeleccionados.length} tutor(es).\n\n¿Continuar?`
    );

    if (!confirmacion) return;

    cerrarModalAsignacion();

    try {
        const response = await apiPost('/asignaciones?action=autoAssign', {
            semesterId: window.CURRENT_SEMESTER_ID,
            tutoresSeleccionados: tutoresSeleccionados
        });

        if (!response || !response.success) {
            alert('❌ ' + (response?.message || 'Error al asignar automáticamente'));
            return;
        }

        const { estudiantesAsignados, tutoresUtilizados } = response.data || {};
        
        alert(`✅ Asignación completada:\n• ${estudiantesAsignados} estudiantes asignados\n• ${tutoresUtilizados} tutores utilizados`);
        
        // Recargar datos del módulo
        await initAssignmentModule();
    } catch (error) {
        console.error('❌ Error en asignación automática:', error);
        alert('❌ Error al procesar la asignación automática');
    }
}

})(); // Fin del IIFE
