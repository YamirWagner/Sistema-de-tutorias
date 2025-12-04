// ID del tutor actualmente seleccionado
let tutorSeleccionado = null;
/* ------------------------------------------------------------
   1. Inicializar módulo
   ------------------------------------------------------------ */

async function initAssignmentModule() {
    try {console.log('[admin] Requesting assignmentData... API_BASE_URL=', window.__API_BASE_URL);
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
        } else { console.error('Error al cargar datos de asignación:', response?.message || 'sin respuesta');
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

    tutores .filter(t => (t.name || t.nombre || '').toLowerCase().includes(filtroNombre.toLowerCase()))
        .forEach(tutor => {
            const totalAsignados = asignaciones[tutor.id]?.length || 0;
            const displayName = tutor.nombre || tutor.name || (tutor.nombres ? `${tutor.nombres} ${tutor.apellidos || ''}`.trim() : 'Sin nombre');

            const btn = document.createElement("button");
            btn.className = `tutor-btn text-left px-3 py-2 bg-gray-100 rounded-lg 
                hover:bg-gray-200 transition
            `;
            btn.dataset.id = tutor.id;

            const maxCapacity = tutor.max || 10;
            btn.innerHTML = `Estudiantes asignados: ${totalAsignados} / ${maxCapacity}
                </span>
            `;btn.addEventListener("click", () => seleccionarTutor(tutor.id));

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

    (asignaciones[tutorSeleccionado] || []).filter(e => {
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
                student-item bg-white border rounded-lg p-3 flex justify-between items-center shadow-sm
            `;

            div.innerHTML = ` <span>${estudianteNombre}</span>
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

    estudiantesNoAsignados.filter(e => {
            const nombre = e.nombre || (e.nombres ? `${e.nombres} ${e.apellidos || ''}`.trim() : '');
            return nombre.toLowerCase().includes(filtroNombre.toLowerCase());
        })
        .forEach(est => {
            const estudianteId = est.id || est.codigo || '';
            const nombre = est.nombre || (est.nombres ? `${est.nombres} ${est.apellidos || ''}`.trim() : 'Sin nombre');
            const div = document.createElement("div");
            div.className = `student-item bg-gray border rounded-lg p-3 
                flex justify-between items-center shadow-sm
            `;

            div.innerHTML = `<span>${nombre}</span>
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
