// GESTIÓN DE SESIONES DE TUTORÍA
let agendamientoActual = null;
let modalAtencionInicializado = false;

window.inicializarModalAtencion = async function() {
    if (modalAtencionInicializado) return;
    if (document.getElementById('modalAtencionTutoria')) {
        modalAtencionInicializado = true;
        return;
    }

    try {
        // Cargar el modal desde el archivo HTML externo
        const response = await fetch('components/tutor/atenciontutoria.html');
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        modalAtencionInicializado = true;
        console.log('✅ Modal de atención cargado desde HTML externo');
    } catch (error) {
        console.error('❌ Error al cargar modal de atención:', error);
        mostrarError('Error al cargar el formulario de atención');
    }
};

// Inicializar inmediatamente cuando se carga el script
setTimeout(function() {
    window.inicializarModalAtencion();
}, 100);

window.abrirModalAtencionTutoria = async function(agendamiento) {
    try {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        
        const modal = document.getElementById('modalAtencionTutoria');
        if (!modal) {
            mostrarError('El modal de atención no está disponible. Por favor, recarga la página.');
            return;
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        agendamientoActual = agendamiento;
        mostrarFormularioRegistroDirecto();
    } catch (error) {
        mostrarError('Error al cargar los datos de la sesión: ' + error.message);
    }
};

window.cerrarModalAtencion = function() {
    document.getElementById('modalAtencionTutoria').style.display = 'none';
    document.body.style.overflow = 'auto';
    limpiarFormulariosAtencion();
    document.getElementById('vistaFormularioAtencion').style.display = 'none';
    agendamientoActual = null;
};

function mostrarFormularioRegistroDirecto() {
    if (!agendamientoActual) {
        mostrarError('No hay agendamiento seleccionado');
        return;
    }

    console.log('=== DEPURACIÓN MODAL ATENCIÓN ===');
    console.log('Agendamiento completo:', agendamientoActual);
    console.log('Tipo Tutoría:', agendamientoActual.tipoTutoria);
    console.log('Modalidad:', agendamientoActual.modalidad);

    document.getElementById('vistaFormularioAtencion').style.display = 'block';
    document.getElementById('idTutoriaAtencion').value = agendamientoActual.id;
    document.getElementById('tipoTutoriaSeleccionada').value = agendamientoActual.tipoTutoria;
    document.getElementById('estudianteNombreAtencion').value = 
        `${agendamientoActual.estudianteNombres} ${agendamientoActual.estudianteApellidos}`;
    document.getElementById('fechaSesionRegistro').value = agendamientoActual.fecha;
    document.getElementById('horaSesionRegistro').value = 
        `${formatearHora(agendamientoActual.horaInicio)} - ${formatearHora(agendamientoActual.horaFin)}`;
    
    // Mostrar tipo de tutoría
    const tipoDisplay = document.getElementById('tipoTutoriaDisplay');
    console.log('Campo tipoTutoriaDisplay encontrado:', tipoDisplay);
    if (tipoDisplay) {
        tipoDisplay.value = agendamientoActual.tipoTutoria || 'No especificado';
        console.log('Valor asignado a tipoTutoriaDisplay:', tipoDisplay.value);
    } else {
        console.error('❌ Campo tipoTutoriaDisplay NO encontrado en el DOM');
    }
    
    // Mostrar modalidad
    const modalidadDisplay = document.getElementById('modalidadSesionRegistro');
    console.log('Campo modalidadSesionRegistro encontrado:', modalidadDisplay);
    if (modalidadDisplay) {
        modalidadDisplay.value = agendamientoActual.modalidad || 'No especificada';
        console.log('Valor asignado a modalidadSesionRegistro:', modalidadDisplay.value);
    } else {
        console.error('❌ Campo modalidadSesionRegistro NO encontrado en el DOM');
    }

    // Mostrar secciones según el tipo de tutoría
    mostrarSeccionesSegunTipo(agendamientoActual.tipoTutoria);
    actualizarTituloModal(agendamientoActual.tipoTutoria);
    
    // Cargar datos guardados previamente
    cargarDatosGuardados(agendamientoActual);
    
    // Bloquear campos si el estado es Realizada
    if (agendamientoActual.estado === 'Realizada') {
        bloquearCamposFormulario();
    }
    
    console.log('=== FIN DEPURACIÓN ===');
}

function mostrarSeccionesSegunTipo(tipoTutoria) {
    // Ocultar todas las secciones específicas
    const seccionAcademica = document.getElementById('seccionAcademica');
    const seccionPersonal = document.getElementById('seccionPersonal');
    const seccionProfesional = document.getElementById('seccionProfesional');
    
    if (seccionAcademica) seccionAcademica.style.display = 'none';
    if (seccionPersonal) seccionPersonal.style.display = 'none';
    if (seccionProfesional) seccionProfesional.style.display = 'none';
    
    // Mostrar solo la sección correspondiente
    if (tipoTutoria === 'Academica' && seccionAcademica) {
        seccionAcademica.style.display = 'block';
    } else if (tipoTutoria === 'Personal' && seccionPersonal) {
        seccionPersonal.style.display = 'block';
    } else if (tipoTutoria === 'Profesional' && seccionProfesional) {
        seccionProfesional.style.display = 'block';
    }
}

function cargarDatosGuardados(agendamiento) {
    if (!agendamiento.observaciones) return;
    
    try {
        // Si observaciones es string, parsearlo como JSON
        const datos = typeof agendamiento.observaciones === 'string' 
            ? JSON.parse(agendamiento.observaciones) 
            : agendamiento.observaciones;
        
        console.log('Cargando datos guardados:', datos);
        
        // Cargar datos según el tipo de tutoría
        if (agendamiento.tipoTutoria === 'Academica') {
            document.getElementById('temaPrincipalAtencion').value = datos.temaPrincipal || '';
            document.getElementById('contenidoEspecificoAtencion').value = datos.contenidoEspecifico || '';
            document.getElementById('observacionesDesempenoAtencion').value = datos.observacionesDesempeno || '';
            document.getElementById('actividadesRealizadasAtencion').value = datos.actividadesRealizadas || '';
            document.getElementById('tareasAsignadasAtencion').value = datos.tareasAsignadas || '';
            document.getElementById('recursosRecomendadosAtencion').value = datos.recursosRecomendados || '';
            if (datos.notasAdicionales) {
                document.getElementById('notasAdicionalesAtencion').value = datos.notasAdicionales;
            }
        } else if (agendamiento.tipoTutoria === 'Personal') {
            document.getElementById('situacionPersonal').value = datos.situacionPersonal || '';
            document.getElementById('estadoEmocional').value = datos.estadoEmocional || '';
            document.getElementById('observacionesPersonales').value = datos.observacionesPersonales || '';
            document.getElementById('accionesTomadas').value = datos.accionesTomadas || '';
            document.getElementById('requiereDerivacion').value = datos.requiereDerivacion || 'No';
            document.getElementById('motivoDerivacion').value = datos.motivoDerivacion || '';
            if (datos.notasAdicionales) {
                document.getElementById('notasAdicionalesAtencion').value = datos.notasAdicionales;
            }
        } else if (agendamiento.tipoTutoria === 'Profesional') {
            document.getElementById('temaProfesional').value = datos.temaProfesional || '';
            document.getElementById('descripcionTema').value = datos.descripcionTema || '';
            document.getElementById('avancesLogros').value = datos.avancesLogros || '';
            document.getElementById('observacionesProfesionales').value = datos.observacionesProfesionales || '';
            document.getElementById('recursosContactos').value = datos.recursosContactos || '';
            if (datos.notasAdicionales) {
                document.getElementById('notasAdicionalesAtencion').value = datos.notasAdicionales;
            }
        }
    } catch (error) {
        console.error('Error al cargar datos guardados:', error);
    }
}

function bloquearCamposFormulario() {
    // Bloquear todos los inputs y textareas del formulario
    const inputs = document.querySelectorAll('#vistaFormularioAtencion input:not([readonly]), #vistaFormularioAtencion textarea, #vistaFormularioAtencion select');
    inputs.forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = '#f5f5f5';
        input.style.cursor = 'not-allowed';
    });
    
    // Ocultar botones de guardado parcial
    const botonesParciales = document.querySelectorAll('[onclick^="guardarSeccion"]');
    botonesParciales.forEach(boton => {
        boton.style.display = 'none';
    });
    
    // Mostrar mensaje de solo lectura
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-atencion';
    alertDiv.innerHTML = '⚠️ Esta tutoría ya ha sido finalizada y no puede ser modificada';
    alertDiv.style.marginBottom = '20px';
    
    const vistaFormulario = document.getElementById('vistaFormularioAtencion');
    if (vistaFormulario && vistaFormulario.firstChild) {
        vistaFormulario.insertBefore(alertDiv, vistaFormulario.firstChild);
    }
}

function actualizarTituloModal(tipoTutoria) {
    const titulo = document.getElementById('tituloModalAtencion');
    const iconos = {
        'Academica': '📚',
        'Personal': '💭',
        'Profesional': '💼'
    };
    const textos = {
        'Academica': 'Tutoría Académica',
        'Personal': 'Tutoría Personal',
        'Profesional': 'Tutoría Profesional'
    };
    
    if (titulo) {
        titulo.textContent = `${iconos[tipoTutoria] || '📚'} Registrar ${textos[tipoTutoria] || 'Sesión'}`;
    }
}

function limpiarFormulariosAtencion() {
    const form = document.getElementById('formRegistroAtencion');
    if (form) form.reset();
}

function formatearFechaLarga(fecha) {
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', opciones);
}

function formatearHora(hora) {
    return hora ? hora.substring(0, 5) : '';
}

function mostrarLoaderAtencion() {
    document.getElementById('loaderAtencion').style.display = 'flex';
}

function ocultarLoaderAtencion() {
    document.getElementById('loaderAtencion').style.display = 'none';
}

function mostrarError(mensaje) {
    alert('❌ Error: ' + mensaje);
}

function mostrarExito(mensaje) {
    alert('✅ ' + mensaje);
}

// ==================== GESTIÓN DE MATERIALES ====================
let archivosCargados = [];

window.procesarArchivos = function(input) {
    const archivos = Array.from(input.files);
    
    archivos.forEach(archivo => {
        // Validar tamaño (máx 10MB)
        if (archivo.size > 10 * 1024 * 1024) {
            mostrarError(`El archivo ${archivo.name} excede el tamaño máximo de 10MB`);
            return;
        }
        
        archivosCargados.push({
            id: Date.now() + Math.random(),
            archivo: archivo,
            nombre: archivo.name,
            tamano: formatearTamano(archivo.size),
            tipo: obtenerTipoArchivo(archivo.name)
        });
    });
    
    actualizarListaArchivos();
    input.value = ''; // Limpiar input
};

window.eliminarArchivo = function(id) {
    archivosCargados = archivosCargados.filter(a => a.id !== id);
    actualizarListaArchivos();
};

function actualizarListaArchivos() {
    const listaArchivos = document.getElementById('listaArchivosCargados');
    
    if (archivosCargados.length === 0) {
        listaArchivos.innerHTML = '';
        return;
    }
    
    listaArchivos.innerHTML = archivosCargados.map(archivo => `
        <div class="archivo-item">
            <div class="archivo-info">
                <span class="archivo-icono">📄</span>
                <div>
                    <span class="archivo-nombre">${archivo.nombre}</span>
                    <span class="archivo-tamano">${archivo.tamano}</span>
                </div>
            </div>
            <button type="button" class="btn-remove-archivo" onclick="eliminarArchivo(${archivo.id})">
                🗑️
            </button>
        </div>
    `).join('');
}

function formatearTamano(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

let materialesAcademica = [];
let materialesPersonal = [];
let materialesProfesional = [];

window.agregarMaterial = function(seccion) {
    const archivoInput = document.getElementById(`archivoMaterial${seccion}`);
    const descripcionInput = document.getElementById(`descripcionMaterial${seccion}`);
    
    const archivo = archivoInput.files[0];
    const descripcion = descripcionInput.value.trim();
    
    // Validar que haya al menos un archivo o una descripción/enlace
    if (!archivo && !descripcion) {
        mostrarError('Debe agregar un archivo o una descripción/enlace');
        return;
    }
    
    const material = {
        id: Date.now(),
        archivo: archivo || null,
        nombreArchivo: archivo ? archivo.name : null,
        tipoArchivo: archivo ? obtenerTipoArchivo(archivo.name) : 'Enlace',
        descripcion: descripcion,
        esEnlace: !archivo && esURL(descripcion)
    };
    
    // Agregar al array correspondiente
    if (seccion === 'Academica') {
        materialesAcademica.push(material);
        actualizarListaMateriales('Academica');
    } else if (seccion === 'Personal') {
        materialesPersonal.push(material);
        actualizarListaMateriales('Personal');
    } else if (seccion === 'Profesional') {
        materialesProfesional.push(material);
        actualizarListaMateriales('Profesional');
    }
    
    // Limpiar inputs
    archivoInput.value = '';
    descripcionInput.value = '';
};

window.eliminarMaterial = function(seccion, id) {
    if (seccion === 'Academica') {
        materialesAcademica = materialesAcademica.filter(m => m.id !== id);
        actualizarListaMateriales('Academica');
    } else if (seccion === 'Personal') {
        materialesPersonal = materialesPersonal.filter(m => m.id !== id);
        actualizarListaMateriales('Personal');
    } else if (seccion === 'Profesional') {
        materialesProfesional = materialesProfesional.filter(m => m.id !== id);
        actualizarListaMateriales('Profesional');
    }
};

function actualizarListaMateriales(seccion) {
    const listaMateriales = document.getElementById(`listaMateriales${seccion}`);
    let materiales = [];
    
    if (seccion === 'Academica') materiales = materialesAcademica;
    else if (seccion === 'Personal') materiales = materialesPersonal;
    else if (seccion === 'Profesional') materiales = materialesProfesional;
    
    if (materiales.length === 0) {
        listaMateriales.innerHTML = '';
        return;
    }
    
    listaMateriales.innerHTML = materiales.map(material => {
        const icono = material.archivo ? '📄' : (material.esEnlace ? '🔗' : '📝');
        const nombre = material.nombreArchivo || material.descripcion.substring(0, 50);
        
        return `
            <div class="material-item">
                <div class="material-info">
                    <div>
                        ${icono} <span class="material-nombre">${nombre}</span>
                        <span class="material-tipo">${material.tipoArchivo}</span>
                    </div>
                    ${material.descripcion && material.archivo ? 
                        `<div class="material-descripcion">${material.descripcion}</div>` : ''}
                </div>
                <button type="button" class="btn-remove-material" onclick="eliminarMaterial('${seccion}', ${material.id})">
                    🗑️
                </button>
            </div>
        `;
    }).join('');
}

function obtenerTipoArchivo(nombreArchivo) {
    const extension = nombreArchivo.split('.').pop().toLowerCase();
    const tipos = {
        'pdf': 'PDF',
        'doc': 'Word',
        'docx': 'Word',
        'xls': 'Excel',
        'xlsx': 'Excel',
        'ppt': 'PowerPoint',
        'pptx': 'PowerPoint',
        'jpg': 'Imagen',
        'jpeg': 'Imagen',
        'png': 'Imagen',
        'gif': 'Imagen'
    };
    return tipos[extension] || 'Documento';
}

function esURL(texto) {
    try {
        new URL(texto);
        return texto.startsWith('http://') || texto.startsWith('https://');
    } catch {
        return false;
    }
}

// ==================== FUNCIONES DE GUARDADO PARCIAL ====================
window.guardarSeccionAcademica = async function() {
    if (!agendamientoActual) {
        mostrarError('No hay agendamiento seleccionado');
        return;
    }

    // Recopilar datos de la sección académica
    const datosAcademicos = {
        idTutoria: agendamientoActual.id,
        tipoTutoria: 'Academica',
        temaPrincipal: document.getElementById('temaPrincipalAtencion').value,
        contenidoEspecifico: document.getElementById('contenidoEspecificoAtencion').value,
        observacionesDesempeno: document.getElementById('observacionesDesempenoAtencion').value,
        actividadesRealizadas: document.getElementById('actividadesRealizadasAtencion').value,
        tareasAsignadas: document.getElementById('tareasAsignadasAtencion').value,
        recursosRecomendados: document.getElementById('recursosRecomendadosAtencion').value,
        notasAdicionales: document.getElementById('notasAdicionalesAtencion')?.value || ''
    };

    // Validar campos obligatorios
    if (!datosAcademicos.temaPrincipal || !datosAcademicos.contenidoEspecifico || !datosAcademicos.observacionesDesempeno) {
        mostrarError('Por favor, complete los campos obligatorios (*) de la tutoría académica');
        return;
    }

    await guardarTutoriaParcial(datosAcademicos, 'Académica', 'registrar-academica');
};

window.guardarSeccionPersonal = async function() {
    if (!agendamientoActual) {
        mostrarError('No hay agendamiento seleccionado');
        return;
    }

    // Recopilar datos de la sección personal
    const datosPersonales = {
        idTutoria: agendamientoActual.id,
        tipoTutoria: 'Personal',
        situacionPersonal: document.getElementById('situacionPersonal').value,
        estadoEmocional: document.getElementById('estadoEmocional').value,
        observacionesPersonales: document.getElementById('observacionesPersonales').value,
        accionesTomadas: document.getElementById('accionesTomadas').value,
        requiereDerivacion: document.getElementById('requiereDerivacion').value,
        motivoDerivacion: document.getElementById('motivoDerivacion').value,
        notasAdicionales: document.getElementById('notasAdicionalesAtencion')?.value || ''
    };

    // Validar campos obligatorios
    if (!datosPersonales.situacionPersonal || !datosPersonales.estadoEmocional || !datosPersonales.observacionesPersonales) {
        mostrarError('Por favor, complete los campos obligatorios (*) de la tutoría personal');
        return;
    }

    await guardarTutoriaParcial(datosPersonales, 'Personal', 'registrar-personal');
};

window.guardarSeccionProfesional = async function() {
    if (!agendamientoActual) {
        mostrarError('No hay agendamiento seleccionado');
        return;
    }

    // Recopilar datos de la sección profesional
    const datosProfesionales = {
        idTutoria: agendamientoActual.id,
        tipoTutoria: 'Profesional',
        temaProfesional: document.getElementById('temaProfesional').value,
        descripcionTema: document.getElementById('descripcionTema').value,
        avancesLogros: document.getElementById('avancesLogros').value,
        observacionesProfesionales: document.getElementById('observacionesProfesionales').value,
        recursosContactos: document.getElementById('recursosContactos').value,
        notasAdicionales: document.getElementById('notasAdicionalesAtencion')?.value || ''
    };

    // Validar campos obligatorios
    if (!datosProfesionales.temaProfesional || !datosProfesionales.descripcionTema || !datosProfesionales.observacionesProfesionales) {
        mostrarError('Por favor, complete los campos obligatorios (*) de la tutoría profesional');
        return;
    }

    await guardarTutoriaParcial(datosProfesionales, 'Profesional', 'registrar-profesional');
};

async function guardarTutoriaParcial(datos, tipoNombre, action) {
    try {
        mostrarLoaderAtencion();
        
        console.log('=== GUARDANDO TUTORÍA PARCIAL ===');
        console.log('Datos a enviar:', datos);
        console.log('Action:', action);
        
        const token = localStorage.getItem('token');
        const response = await fetch(
            `${APP_CONFIG.API.BASE_URL}/atencionTutoria.php?action=${action}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            }
        );
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        // Capturar la respuesta como texto primero
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        ocultarLoaderAtencion();
        
        // Intentar parsear como JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('Error parseando JSON:', e);
            console.error('Respuesta HTML recibida:', responseText.substring(0, 500));
            mostrarError(`Error del servidor: ${response.status}. Revisa la consola para más detalles.`);
            return;
        }
        
        if (result.success) {
            mostrarExito(`Tutoría ${tipoNombre} guardada correctamente`);
            // NO cerrar modal, permitir seguir editando
            // Actualizar observaciones en el objeto actual
            agendamientoActual.observaciones = JSON.stringify(datos);
        } else {
            mostrarError(result.message || `Error al guardar tutoría ${tipoNombre}`);
        }
    } catch (error) {
        ocultarLoaderAtencion();
        console.error('Error al guardar tutoría parcial:', error);
        mostrarError(`Error de conexión al guardar tutoría ${tipoNombre}`);
    }
}

// ==================== FUNCIÓN DE FINALIZACIÓN TOTAL ====================
window.finalizarTutoria = async function() {
    if (!agendamientoActual) {
        mostrarError('No hay agendamiento seleccionado');
        return;
    }

    // Recopilar todos los datos según el tipo de tutoría
    let datosCompletos = {
        idTutoria: agendamientoActual.id,
        tipoTutoria: agendamientoActual.tipoTutoria,
        notasAdicionales: document.getElementById('notasAdicionalesAtencion')?.value || ''
    };

    // Agregar datos específicos según el tipo
    if (agendamientoActual.tipoTutoria === 'Academica') {
        datosCompletos = {
            ...datosCompletos,
            temaPrincipal: document.getElementById('temaPrincipalAtencion').value,
            contenidoEspecifico: document.getElementById('contenidoEspecificoAtencion').value,
            observacionesDesempeno: document.getElementById('observacionesDesempenoAtencion').value,
            actividadesRealizadas: document.getElementById('actividadesRealizadasAtencion').value,
            tareasAsignadas: document.getElementById('tareasAsignadasAtencion').value,
            recursosRecomendados: document.getElementById('recursosRecomendadosAtencion').value
        };
        
        // Validar campos obligatorios
        if (!datosCompletos.temaPrincipal || !datosCompletos.contenidoEspecifico || !datosCompletos.observacionesDesempeno) {
            mostrarError('Por favor, complete todos los campos obligatorios (*) de la tutoría académica');
            return;
        }
    } else if (agendamientoActual.tipoTutoria === 'Personal') {
        datosCompletos = {
            ...datosCompletos,
            situacionPersonal: document.getElementById('situacionPersonal').value,
            estadoEmocional: document.getElementById('estadoEmocional').value,
            observacionesPersonales: document.getElementById('observacionesPersonales').value,
            accionesTomadas: document.getElementById('accionesTomadas').value,
            requiereDerivacion: document.getElementById('requiereDerivacion').value,
            motivoDerivacion: document.getElementById('motivoDerivacion').value
        };
        
        // Validar campos obligatorios
        if (!datosCompletos.situacionPersonal || !datosCompletos.estadoEmocional || !datosCompletos.observacionesPersonales) {
            mostrarError('Por favor, complete todos los campos obligatorios (*) de la tutoría personal');
            return;
        }
    } else if (agendamientoActual.tipoTutoria === 'Profesional') {
        datosCompletos = {
            ...datosCompletos,
            temaProfesional: document.getElementById('temaProfesional').value,
            descripcionTema: document.getElementById('descripcionTema').value,
            avancesLogros: document.getElementById('avancesLogros').value,
            observacionesProfesionales: document.getElementById('observacionesProfesionales').value,
            recursosContactos: document.getElementById('recursosContactos').value
        };
        
        // Validar campos obligatorios
        if (!datosCompletos.temaProfesional || !datosCompletos.descripcionTema || !datosCompletos.observacionesProfesionales) {
            mostrarError('Por favor, complete todos los campos obligatorios (*) de la tutoría profesional');
            return;
        }
    }

    // Confirmar finalización
    if (!confirm('¿Está seguro de finalizar esta tutoría? Una vez finalizada no podrá ser modificada.')) {
        return;
    }

    try {
        mostrarLoaderAtencion();
        
        console.log('=== FINALIZANDO TUTORÍA ===');
        console.log('Datos completos:', datosCompletos);
        
        const token = localStorage.getItem('token');
        const response = await fetch(
            `${APP_CONFIG.API.BASE_URL}/atencionTutoria.php?action=registrar-final`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosCompletos)
            }
        );
        
        console.log('Response status:', response.status);
        
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        ocultarLoaderAtencion();
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('Error parseando JSON:', e);
            console.error('Respuesta HTML recibida:', responseText.substring(0, 500));
            mostrarError(`Error del servidor: ${response.status}. Revisa la consola para más detalles.`);
            return;
        }
        
        if (result.success) {
            mostrarExito('Tutoría finalizada correctamente');
            cerrarModalAtencion();
            // Recargar agendamientos
            if (typeof cargarAgendamientos === 'function') {
                cargarAgendamientos();
            }
        } else {
            mostrarError(result.message || 'Error al finalizar tutoría');
        }
    } catch (error) {
        ocultarLoaderAtencion();
        console.error('Error al finalizar tutoría:', error);
        mostrarError('Error de conexión al finalizar tutoría');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Listener para mostrar/ocultar campo de motivo de derivación
    const requiereDerivacion = document.getElementById('requiereDerivacion');
    if (requiereDerivacion) {
        requiereDerivacion.addEventListener('change', function() {
            const divMotivo = document.getElementById('divMotivoDerivacion');
            if (divMotivo) {
                divMotivo.style.display = this.value === 'Si' ? 'block' : 'none';
            }
        });
    }

    const formRegistro = document.getElementById('formRegistroAtencion');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!agendamientoActual) {
                mostrarError('No hay agendamiento seleccionado');
                return;
            }
            
            const tipoTutoria = document.getElementById('tipoTutoriaSeleccionada').value;
            
            // Recopilar datos comunes
            const datosRegistro = {
                idTutoria: agendamientoActual.id,
                tipoTutoria: tipoTutoria,
                modalidad: document.getElementById('modalidadSesionRegistro').value,
                notasAdicionales: document.getElementById('notasAdicionalesAtencion')?.value || ''
            };
            
            // Recopilar datos según tipo de tutoría
            if (tipoTutoria === 'Academica') {
                datosRegistro.temaPrincipal = document.getElementById('temaPrincipalAtencion').value;
                datosRegistro.contenidoEspecifico = document.getElementById('contenidoEspecificoAtencion').value;
                datosRegistro.observacionesDesempeno = document.getElementById('observacionesDesempenoAtencion').value;
                datosRegistro.actividadesRealizadas = document.getElementById('actividadesRealizadasAtencion').value;
                datosRegistro.tareasAsignadas = document.getElementById('tareasAsignadasAtencion').value;
                datosRegistro.recursosRecomendados = document.getElementById('recursosRecomendadosAtencion').value;
                
                if (!datosRegistro.temaPrincipal || !datosRegistro.contenidoEspecifico || !datosRegistro.observacionesDesempeno) {
                    mostrarError('Por favor, complete los campos obligatorios (*)');
                    return;
                }
            } else if (tipoTutoria === 'Personal') {
                datosRegistro.situacionPersonal = document.getElementById('situacionPersonal').value;
                datosRegistro.estadoEmocional = document.getElementById('estadoEmocional').value;
                datosRegistro.observacionesPersonales = document.getElementById('observacionesPersonales').value;
                datosRegistro.accionesTomadas = document.getElementById('accionesTomadas').value;
                datosRegistro.requiereDerivacion = document.getElementById('requiereDerivacion').value;
                datosRegistro.motivoDerivacion = document.getElementById('motivoDerivacion').value;
                
                if (!datosRegistro.situacionPersonal || !datosRegistro.estadoEmocional || !datosRegistro.observacionesPersonales) {
                    mostrarError('Por favor, complete los campos obligatorios (*)');
                    return;
                }
            } else if (tipoTutoria === 'Profesional') {
                datosRegistro.temaProfesional = document.getElementById('temaProfesional').value;
                datosRegistro.descripcionTema = document.getElementById('descripcionTema').value;
                datosRegistro.avancesLogros = document.getElementById('avancesLogros').value;
                datosRegistro.observacionesProfesionales = document.getElementById('observacionesProfesionales').value;
                datosRegistro.recursosContactos = document.getElementById('recursosContactos').value;
                
                if (!datosRegistro.temaProfesional || !datosRegistro.descripcionTema || !datosRegistro.observacionesProfesionales) {
                    mostrarError('Por favor, complete los campos obligatorios (*)');
                    return;
                }
            }
            
            try {
                mostrarLoaderAtencion();
                
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `${APP_CONFIG.API.BASE_URL}/atencionTutoria.php?action=registrar`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(datosRegistro)
                    }
                );
                
                const data = await response.json();
                
                ocultarLoaderAtencion();
                
                if (data.success) {
                    mostrarExito('Sesión registrada correctamente');
                    cerrarModalAtencion();
                    // Recargar agendamientos si la función existe
                    if (typeof cargarAgendamientos === 'function') {
                        cargarAgendamientos();
                    }
                    // Recargar la página como alternativa
                    location.reload();
                } else {
                    mostrarError(data.message || 'Error al registrar la sesión');
                }
            } catch (error) {
                ocultarLoaderAtencion();
                console.error('Error:', error);
                mostrarError('Error al registrar la sesión');
            }
        });
    }

    // Cerrar modal al hacer clic fuera del contenedor
    const modalOverlay = document.getElementById('modalAtencionTutoria');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                cerrarModalAtencion();
            }
        });
    }
});
