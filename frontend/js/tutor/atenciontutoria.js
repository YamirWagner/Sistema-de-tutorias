/**
 * GESTIÓN DE SESIONES DE TUTORÍA
 * 
 * Este módulo maneja:
 * - Carga dinámica del modal de atención de tutorías
 * - Registro de sesiones (Académica, Personal, Profesional)
 * - Guardado parcial y finalización de tutorías
 * - Validación de campos obligatorios
 * - Notificaciones personalizadas (sin alerts del navegador)
 * - Protección contra edición de tutorías finalizadas
 * 
 * @version 2.0
 * @date 2025-12-23
 * @optimizado Eliminados console.log, mejorado manejo de errores,
 *             implementadas notificaciones modernas
 */

let agendamientoActual = null;
let modalAtencionInicializado = false;

window.inicializarModalAtencion = async function() {
    if (modalAtencionInicializado) return;
    if (document.getElementById('modalAtencionTutoria')) {
        modalAtencionInicializado = true;
        return;
    }

    try {
        const response = await fetch('components/tutor/atenciontutoria.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        modalAtencionInicializado = true;
    } catch (error) {
        console.error('Error al cargar modal de atención:', error);
        mostrarError('No se pudo cargar el formulario de atención. Por favor, recarga la página.');
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
    materialesAgregados = []; // Limpiar materiales agregados
    actualizarListaMaterialesAgregados();
    
    // Resetear selector de tipo si existe
    const tipoSelect = document.getElementById('tipoMaterialSelect');
    if (tipoSelect) {
        tipoSelect.value = '';
        cambiarTipoMaterial();
    }
};

function mostrarFormularioRegistroDirecto() {
    if (!agendamientoActual) {
        mostrarError('No hay agendamiento seleccionado');
        return;
    }

    // Mostrar vista del formulario
    const vistaFormulario = document.getElementById('vistaFormularioAtencion');
    if (!vistaFormulario) {
        mostrarError('Error al cargar el formulario');
        return;
    }
    vistaFormulario.style.display = 'block';

    // Asignar datos básicos
    asignarValorSeguro('idTutoriaAtencion', agendamientoActual.id);
    asignarValorSeguro('tipoTutoriaSeleccionada', agendamientoActual.tipoTutoria);
    asignarValorSeguro('estudianteNombreAtencion', 
        `${agendamientoActual.estudianteNombres} ${agendamientoActual.estudianteApellidos}`);
    asignarValorSeguro('fechaSesionRegistro', agendamientoActual.fecha);
    asignarValorSeguro('horaSesionRegistro', 
        `${formatearHora(agendamientoActual.horaInicio)} - ${formatearHora(agendamientoActual.horaFin)}`);
    asignarValorSeguro('tipoTutoriaDisplay', agendamientoActual.tipoTutoria || 'No especificado');
    asignarValorSeguro('modalidadSesionRegistro', agendamientoActual.modalidad || 'No especificada');

    // Configurar vista según tipo de tutoría
    mostrarSeccionesSegunTipo(agendamientoActual.tipoTutoria);
    actualizarTituloModal(agendamientoActual.tipoTutoria);
    cargarDatosGuardados(agendamientoActual);
    
    // Bloquear si ya está realizada
    if (agendamientoActual.estado === 'Realizada') {
        bloquearCamposFormulario();
    }
}

// Función auxiliar para asignar valores de forma segura
function asignarValorSeguro(elementId, valor) {
    const elemento = document.getElementById(elementId);
    if (elemento) {
        elemento.value = valor || '';
    }
}

// Obtener de forma segura el valor de un campo por id
function obtenerValor(elementId) {
    const elemento = document.getElementById(elementId);
    if (!elemento) return '';
    const valor = elemento.value ?? '';
    return typeof valor === 'string' ? valor.trim() : valor;
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

    let datos = agendamiento.observaciones;

    // Si es texto plano (no parece JSON), no intentamos parsear ni mostramos error
    if (typeof datos === 'string') {
        const trimmed = datos.trim();

        const pareceObjetoJSON = trimmed.startsWith('{') && trimmed.endsWith('}');
        const pareceArrayJSON = trimmed.startsWith('[') && trimmed.endsWith(']');

        if (!pareceObjetoJSON && !pareceArrayJSON) {
            // Observaciones antiguas en texto libre: no hay datos estructurados que cargar
            return;
        }

        try {
            datos = JSON.parse(trimmed);
        } catch (e) {
            // Si falla el parseo, simplemente ignoramos los datos guardados
            console.warn('Observaciones no son JSON válido, se omite carga estructurada:', e);
            return;
        }
    }

    if (!datos || typeof datos !== 'object') return;

    // Cargar datos según el tipo de tutoría
    const camposPorTipo = {
        'Academica': [
            ['temaPrincipalAtencion', 'temaPrincipal'],
            ['contenidoEspecificoAtencion', 'contenidoEspecifico'],
            ['observacionesDesempenoAtencion', 'observacionesDesempeno'],
            ['actividadesRealizadasAtencion', 'actividadesRealizadas'],
            ['tareasAsignadasAtencion', 'tareasAsignadas'],
            ['recursosRecomendadosAtencion', 'recursosRecomendados']
        ],
        'Personal': [
            ['situacionPersonal', 'situacionPersonal'],
            ['estadoEmocional', 'estadoEmocional'],
            ['observacionesPersonales', 'observacionesPersonales'],
            ['accionesTomadas', 'accionesTomadas'],
            ['requiereDerivacion', 'requiereDerivacion'],
            ['motivoDerivacion', 'motivoDerivacion']
        ],
        'Profesional': [
            ['temaProfesional', 'temaProfesional'],
            ['descripcionTema', 'descripcionTema'],
            ['avancesLogros', 'avancesLogros'],
            ['observacionesProfesionales', 'observacionesProfesionales'],
            ['recursosContactos', 'recursosContactos']
        ]
    };

    const campos = camposPorTipo[agendamiento.tipoTutoria];
    if (campos) {
        campos.forEach(([elementId, dataProp]) => {
            asignarValorSeguro(elementId, datos[dataProp]);
        });
    }

    // Cargar notas adicionales (común para todos)
    asignarValorSeguro('notasComentarios', datos.notasAdicionales);
}

function bloquearCamposFormulario() {
    // Bloquear todos los inputs y textareas del formulario
    const inputs = document.querySelectorAll('#vistaFormularioAtencion input:not([readonly]), #vistaFormularioAtencion textarea, #vistaFormularioAtencion select');
    inputs.forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = '#f5f5f5';
        input.style.cursor = 'not-allowed';
    });
    
    // Ocultar todos los botones de guardado (parcial y final)
    const botonesParciales = document.querySelectorAll('[onclick^="guardarSeccion"]');
    botonesParciales.forEach(boton => {
        boton.style.display = 'none';
    });
    
    // Ocultar botón de finalizar tutoría
    const botonFinalizar = document.querySelector('[onclick="finalizarTutoria()"]');
    if (botonFinalizar) {
        botonFinalizar.style.display = 'none';
    }
    
    // Mostrar mensaje de solo lectura prominente
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-warning-atencion';
    alertDiv.style.marginTop = '20px';
    alertDiv.style.marginBottom = '20px';
    alertDiv.innerHTML = '<strong>📌 TUTORÍA FINALIZADA:</strong> Esta tutoría ha sido finalizada y registrada. Los datos están en modo de solo lectura y no pueden ser modificados.';
    
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
    mostrarNotificacion(mensaje, 'error');
}

function mostrarExito(mensaje) {
    mostrarNotificacion(mensaje, 'success');
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    // Remover notificaciones anteriores
    const notifAnterior = document.querySelector('.notificacion-atencion');
    if (notifAnterior) notifAnterior.remove();
    
    const notif = document.createElement('div');
    notif.className = `notificacion-atencion notificacion-${tipo}`;
    
    const icono = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️';
    notif.innerHTML = `
        <span class="notif-icono">${icono}</span>
        <span class="notif-mensaje">${mensaje}</span>
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => notif.classList.add('show'), 10);
    
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

function mostrarModalConfirmacion(titulo, mensaje, onConfirm) {
    const modalHtml = `
        <div id="modalConfirmAtencion" class="modal-confirm-overlay">
            <div class="modal-confirm-container">
                <div class="modal-confirm-header">
                    <h3>${titulo}</h3>
                </div>
                <div class="modal-confirm-body">
                    <p>${mensaje}</p>
                </div>
                <div class="modal-confirm-footer">
                    <button class="btn-confirm-cancel" onclick="cerrarModalConfirmacionAtencion()">Cancelar</button>
                    <button class="btn-confirm-ok" onclick="confirmarAccion()">Confirmar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    window.confirmarAccion = function() {
        cerrarModalConfirmacionAtencion();
        if (onConfirm) onConfirm();
    };
}

function cerrarModalConfirmacionAtencion() {
    const modal = document.getElementById('modalConfirmAtencion');
    if (modal) modal.remove();
    window.confirmarAccion = null;
}

window.cerrarModalConfirmacionAtencion = cerrarModalConfirmacionAtencion;

// ==================== GESTIÓN DE MATERIALES POR TIPO ====================
let materialesAgregados = [];

window.cambiarTipoMaterial = function() {
    const tipoSelect = document.getElementById('tipoMaterialSelect');
    
    // Si el selector no existe, salir
    if (!tipoSelect) return;
    
    const tipoSeleccionado = tipoSelect.value;
    
    // Ocultar todas las zonas
    document.querySelectorAll('.zona-tipo-material').forEach(zona => {
        zona.style.display = 'none';
    });
    
    // Mostrar zona correspondiente
    if (tipoSeleccionado) {
        const zonaId = `zona${tipoSeleccionado}`;
        const zona = document.getElementById(zonaId);
        if (zona) zona.style.display = 'block';
    }
};

window.agregarMaterialTipo = function(tipo) {
    let material = {
        id: Date.now(),
        tipo: tipo,
        titulo: '',
        descripcion: '',
        archivo: null,
        enlace: ''
    };
    
    let validado = false;
    
    switch(tipo) {
        case 'PDF':
            const archivoPDF = document.getElementById('archivoPDF').files[0];
            const tituloPDF = document.getElementById('tituloPDF').value.trim();
            const descripcionPDF = document.getElementById('descripcionPDF').value.trim();
            
            if (!archivoPDF) {
                mostrarError('Por favor selecciona un archivo PDF');
                return;
            }
            if (archivoPDF.size > 10 * 1024 * 1024) {
                mostrarError('El archivo PDF no debe exceder 10MB');
                return;
            }
            
            material.archivo = archivoPDF;
            material.titulo = tituloPDF || archivoPDF.name;
            material.descripcion = descripcionPDF;
            material.tamano = formatearTamano(archivoPDF.size);
            validado = true;
            
            // Limpiar campos
            document.getElementById('archivoPDF').value = '';
            document.getElementById('tituloPDF').value = '';
            document.getElementById('descripcionPDF').value = '';
            break;
            
        case 'Video':
            const archivoVideo = document.getElementById('archivoVideo').files[0];
            const enlaceVideo = document.getElementById('enlaceVideo').value.trim();
            const tituloVideo = document.getElementById('tituloVideo').value.trim();
            const descripcionVideo = document.getElementById('descripcionVideo').value.trim();
            
            if (!archivoVideo && !enlaceVideo) {
                mostrarError('Proporciona un archivo de video o un enlace');
                return;
            }
            
            if (archivoVideo) {
                if (archivoVideo.size > 50 * 1024 * 1024) {
                    mostrarError('El archivo de video no debe exceder 50MB');
                    return;
                }
                material.archivo = archivoVideo;
                material.titulo = tituloVideo || archivoVideo.name;
                material.tamano = formatearTamano(archivoVideo.size);
            } else {
                material.enlace = enlaceVideo;
                material.titulo = tituloVideo || 'Video en línea';
            }
            
            material.descripcion = descripcionVideo;
            validado = true;
            
            // Limpiar campos
            document.getElementById('archivoVideo').value = '';
            document.getElementById('enlaceVideo').value = '';
            document.getElementById('tituloVideo').value = '';
            document.getElementById('descripcionVideo').value = '';
            break;
            
        case 'Documento':
            const archivoDoc = document.getElementById('archivoDocumento').files[0];
            const tituloDoc = document.getElementById('tituloDocumento').value.trim();
            const descripcionDoc = document.getElementById('descripcionDocumento').value.trim();
            
            if (!archivoDoc) {
                mostrarError('Por favor selecciona un documento');
                return;
            }
            if (archivoDoc.size > 10 * 1024 * 1024) {
                mostrarError('El documento no debe exceder 10MB');
                return;
            }
            
            material.archivo = archivoDoc;
            material.titulo = tituloDoc || archivoDoc.name;
            material.descripcion = descripcionDoc;
            material.tamano = formatearTamano(archivoDoc.size);
            validado = true;
            
            // Limpiar campos
            document.getElementById('archivoDocumento').value = '';
            document.getElementById('tituloDocumento').value = '';
            document.getElementById('descripcionDocumento').value = '';
            break;
            
        case 'Enlace':
            const urlEnlace = document.getElementById('urlEnlace').value.trim();
            const tituloEnlace = document.getElementById('tituloEnlace').value.trim();
            const descripcionEnlace = document.getElementById('descripcionEnlace').value.trim();
            
            if (!urlEnlace) {
                mostrarError('Por favor ingresa una URL');
                return;
            }
            
            // Validar formato URL
            try {
                new URL(urlEnlace);
            } catch(e) {
                mostrarError('La URL no es válida. Debe empezar con http:// o https://');
                return;
            }
            
            material.enlace = urlEnlace;
            material.titulo = tituloEnlace || urlEnlace;
            material.descripcion = descripcionEnlace;
            validado = true;
            
            // Limpiar campos
            document.getElementById('urlEnlace').value = '';
            document.getElementById('tituloEnlace').value = '';
            document.getElementById('descripcionEnlace').value = '';
            break;
            
        case 'Otro':
            const archivoOtro = document.getElementById('archivoOtro').files[0];
            const enlaceOtro = document.getElementById('enlaceOtro').value.trim();
            const tituloOtro = document.getElementById('tituloOtro').value.trim();
            const descripcionOtro = document.getElementById('descripcionOtro').value.trim();
            
            if (!archivoOtro && !enlaceOtro) {
                mostrarError('Proporciona un archivo o un enlace');
                return;
            }
            
            if (archivoOtro) {
                if (archivoOtro.size > 20 * 1024 * 1024) {
                    mostrarError('El archivo no debe exceder 20MB');
                    return;
                }
                material.archivo = archivoOtro;
                material.titulo = tituloOtro || archivoOtro.name;
                material.tamano = formatearTamano(archivoOtro.size);
            } else {
                material.enlace = enlaceOtro;
                material.titulo = tituloOtro || 'Recurso';
            }
            
            material.descripcion = descripcionOtro;
            validado = true;
            
            // Limpiar campos
            document.getElementById('archivoOtro').value = '';
            document.getElementById('enlaceOtro').value = '';
            document.getElementById('tituloOtro').value = '';
            document.getElementById('descripcionOtro').value = '';
            break;
    }
    
    if (validado) {
        materialesAgregados.push(material);
        actualizarListaMaterialesAgregados();
        mostrarExito(`${tipo} agregado correctamente`);
        
        // Resetear selector
        document.getElementById('tipoMaterialSelect').value = '';
        cambiarTipoMaterial();
    }
};

window.eliminarMaterialAgregado = function(id) {
    materialesAgregados = materialesAgregados.filter(m => m.id !== id);
    actualizarListaMaterialesAgregados();
};

function actualizarListaMaterialesAgregados() {
    const lista = document.getElementById('listaMaterialesAgregados');
    
    // Si el elemento no existe (modal no cargado), salir sin error
    if (!lista) {
        return;
    }
    
    if (materialesAgregados.length === 0) {
        lista.innerHTML = '<p style="color: #888; font-style: italic;">No hay materiales agregados</p>';
        return;
    }
    
    lista.innerHTML = '<h4 style="margin-bottom: 10px; color: #333;">📋 Materiales Agregados:</h4>' + 
        materialesAgregados.map(material => {
            const iconos = {
                'PDF': '📄',
                'Video': '🎥',
                'Documento': '📝',
                'Enlace': '🔗',
                'Otro': '📦'
            };
            
            const icono = iconos[material.tipo] || '📎';
            const info = material.archivo ? `${material.titulo} (${material.tamano})` : material.titulo;
            const fuente = material.archivo ? 'Archivo' : 'Enlace';
            
            return `
                <div class="material-item">
                    <div class="material-info">
                        <span style="font-size: 1.3rem; margin-right: 10px;">${icono}</span>
                        <div>
                            <div style="font-weight: 600; color: #2c3e50;">${info}</div>
                            <div style="font-size: 0.85rem; color: #7f8c8d;">
                                <span class="material-tipo">${material.tipo}</span> • 
                                <span>${fuente}</span>
                                ${material.descripcion ? ` • ${material.descripcion}` : ''}
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn-remove-material" onclick="eliminarMaterialAgregado(${material.id})">
                        🗑️ Eliminar
                    </button>
                </div>
            `;
        }).join('');
}

// Mantener funciones antiguas para compatibilidad pero vacías
window.procesarArchivos = function(input) { input.value = ''; };
window.eliminarArchivo = function(id) {};
let archivosCargados = [];

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
        recursosRecomendadosAcademica: document.getElementById('recursosRecomendadosAtencion')?.value || '',
        // Materiales comunes para todas las modalidades
        materialesApoyo: obtenerValor('descripcionMateriales'),
        recursosRecomendados: obtenerValor('recursosRecomendados'),
        notasAdicionales: obtenerValor('notasComentarios')
    };

    console.log('💾 Guardando parcialmente Académica:', datosAcademicos);

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

    const datosPersonales = {
        idTutoria: agendamientoActual.id,
        tipoTutoria: 'Personal',
        situacionPersonal: obtenerValor('situacionPersonal'),
        estadoEmocional: obtenerValor('estadoEmocional'),
        observacionesPersonales: obtenerValor('observacionesPersonales'),
        accionesTomadas: obtenerValor('accionesTomadas'),
        requiereDerivacion: obtenerValor('requiereDerivacion'),
        motivoDerivacion: obtenerValor('motivoDerivacion'),
        // Materiales comunes para todas las modalidades
        materialesApoyo: obtenerValor('descripcionMateriales'),
        recursosRecomendados: obtenerValor('recursosRecomendados'),
        notasAdicionales: obtenerValor('notasComentarios')
    };

    console.log('💾 Guardando parcialmente Personal:', datosPersonales);

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

    const datosProfesionales = {
        idTutoria: agendamientoActual.id,
        tipoTutoria: 'Profesional',
        temaProfesional: obtenerValor('temaProfesional'),
        descripcionTema: obtenerValor('descripcionTema'),
        avancesLogros: obtenerValor('avancesLogros'),
        observacionesProfesionales: obtenerValor('observacionesProfesionales'),
        recursosContactos: obtenerValor('recursosContactos'),
        // Materiales comunes para todas las modalidades
        materialesApoyo: obtenerValor('descripcionMateriales'),
        recursosRecomendados: obtenerValor('recursosRecomendados'),
        notasAdicionales: obtenerValor('notasComentarios')
    };

    console.log('💾 Guardando parcialmente Profesional:', datosProfesionales);

    if (!datosProfesionales.temaProfesional || !datosProfesionales.descripcionTema || !datosProfesionales.observacionesProfesionales) {
        mostrarError('Por favor, complete los campos obligatorios (*) de la tutoría profesional');
        return;
    }

    await guardarTutoriaParcial(datosProfesionales, 'Profesional', 'registrar-profesional');
};

async function guardarTutoriaParcial(datos, tipoNombre, action) {
    try {
        mostrarLoaderAtencion();
        const token = localStorage.getItem('token');
        if (!token) {
            const basePath = (window.APP_BASE_PATH || '').replace(/\/+$/, '');
            ocultarLoaderAtencion();
            mostrarError('Sesión no válida o expirada. Redirigiendo al inicio de sesión...');
            setTimeout(() => {
                window.location.href = basePath + '/login';
            }, 1500);
            return;
        }
        const response = await fetch(`${APP_CONFIG.API.BASE_URL}/atencionTutoria?action=${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(datos)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Error ${response.status}: No se pudo guardar`);
        }

        if (result.success) {
            agendamientoActual.observaciones = JSON.stringify(datos);
            mostrarExito(`✅ Tutoría ${tipoNombre} guardada correctamente`);
        } else {
            throw new Error(result.message || 'Error desconocido al guardar');
        }
        
    } catch (error) {
        console.error(`Error al guardar tutoría ${tipoNombre}:`, error);
        mostrarError(error.message);
    } finally {
        ocultarLoaderAtencion();
    }
}

// ==================== FUNCIÓN DE FINALIZACIÓN TOTAL ====================
window.finalizarTutoria = async function() {
    if (!agendamientoActual) {
        mostrarError('No hay agendamiento seleccionado');
        return;
    }

    // Validar que no esté ya finalizada
    if (agendamientoActual.estado === 'Realizada') {
        mostrarError('Esta tutoría ya ha sido finalizada');
        return;
    }

    // Recopilar todos los datos según el tipo de tutoría
    let datosCompletos = {
        idTutoria: agendamientoActual.id,
        tipoTutoria: agendamientoActual.tipoTutoria,
        notasAdicionales: document.getElementById('notasComentarios')?.value || '',
        // Recursos de texto comunes para todas las modalidades (campo opcional)
        recursosRecomendados: obtenerValor('recursosRecomendados')
    };

    console.log('📦 Datos iniciales:', datosCompletos);

    // Agregar datos específicos según el tipo
    if (agendamientoActual.tipoTutoria === 'Academica') {
        datosCompletos = {
            ...datosCompletos,
            temaPrincipal: document.getElementById('temaPrincipalAtencion').value,
            contenidoEspecifico: document.getElementById('contenidoEspecificoAtencion').value,
            observacionesDesempeno: document.getElementById('observacionesDesempenoAtencion').value,
            actividadesRealizadas: document.getElementById('actividadesRealizadasAtencion').value,
            tareasAsignadas: document.getElementById('tareasAsignadasAtencion').value
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

    console.log('📤 Datos completos antes de enviar:', datosCompletos);
    console.log('� Total materiales estructurados a enviar:', materialesAgregados.length);

    // Validar campos obligatorios antes de mostrar confirmación
    const camposVacios = validarCamposObligatorios(agendamientoActual.tipoTutoria);
    if (camposVacios.length > 0) {
        mostrarError(`Por favor complete los siguientes campos obligatorios: ${camposVacios.join(', ')}`);
        return;
    }

    // Mostrar modal de confirmación personalizado
    mostrarModalConfirmacion(
        '⚠️ Confirmar Finalización',
        '¿Está seguro de finalizar esta tutoría?<br><br><strong>Una vez finalizada no podrá ser modificada.</strong>',
        async () => {
            await ejecutarFinalizacion(datosCompletos);
        }
    );
};

function validarCamposObligatorios(tipoTutoria) {
    const camposVacios = [];
    
    if (tipoTutoria === 'Academica') {
        if (!document.getElementById('temaPrincipalAtencion')?.value) 
            camposVacios.push('Tema Principal');
        if (!document.getElementById('contenidoEspecificoAtencion')?.value) 
            camposVacios.push('Contenido Específico');
        if (!document.getElementById('observacionesDesempenoAtencion')?.value) 
            camposVacios.push('Observaciones de Desempeño');
    } else if (tipoTutoria === 'Personal') {
        if (!document.getElementById('situacionPersonal')?.value) 
            camposVacios.push('Situación Personal');
        if (!document.getElementById('estadoEmocional')?.value) 
            camposVacios.push('Estado Emocional');
        if (!document.getElementById('observacionesPersonales')?.value) 
            camposVacios.push('Observaciones Personales');
    } else if (tipoTutoria === 'Profesional') {
        if (!document.getElementById('temaProfesional')?.value) 
            camposVacios.push('Tema Profesional');
        if (!document.getElementById('descripcionTema')?.value) 
            camposVacios.push('Descripción del Tema');
        if (!document.getElementById('observacionesProfesionales')?.value) 
            camposVacios.push('Observaciones Profesionales');
    }
    
    return camposVacios;
}

async function ejecutarFinalizacion(datosCompletos) {
    try {
        mostrarLoaderAtencion();
        
        console.log('============ FINALIZANDO TUTORÍA ============');
        console.log('📋 Tipo:', datosCompletos.tipoTutoria);
        console.log('🆔 ID:', datosCompletos.idTutoria);
        console.log('📎 Materiales de apoyo:', datosCompletos.materialesApoyo);
        console.log('🔗 Recursos recomendados:', datosCompletos.recursosRecomendados);
        console.log('� Total archivos:', archivosCargados.length);
        
        const token = localStorage.getItem('token');
        
        // Usar FormData para enviar archivos + datos JSON
        const formData = new FormData();
        
        // Agregar datos JSON como un campo
        formData.append('datos', JSON.stringify(datosCompletos));
        
        // Agregar materiales estructurados con archivos
        let archivoIndex = 0;
        materialesAgregados.forEach((material) => {
            if (material.archivo) {
                // Material con archivo físico
                formData.append(`archivo_${archivoIndex}`, material.archivo);
                formData.append(`archivo_${archivoIndex}_tipo`, material.tipo);
                formData.append(`archivo_${archivoIndex}_titulo`, material.titulo);
                formData.append(`archivo_${archivoIndex}_descripcion`, material.descripcion || '');
                console.log(`📄 Archivo ${archivoIndex}: ${material.titulo} - Tipo: ${material.tipo} (${material.tamano || 'N/A'})`);
                archivoIndex++;
            }
        });
        
        // Agregar materiales sin archivo (solo enlaces) como JSON
        const materialesSinArchivo = materialesAgregados.filter(m => !m.archivo && m.enlace);
        if (materialesSinArchivo.length > 0) {
            formData.append('materialesEstructurados', JSON.stringify(materialesSinArchivo.map(m => ({
                tipo: m.tipo,
                titulo: m.titulo,
                descripcion: m.descripcion || '',
                enlace: m.enlace,
                tieneArchivo: false
            }))));
            console.log('🔗 Materiales de solo enlace:', materialesSinArchivo.length);
        }
        
        const response = await fetch(
            `${APP_CONFIG.API.BASE_URL}/atencionTutoria?action=registrar-final`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // NO incluir Content-Type, el navegador lo establece automáticamente con boundary
                },
                body: formData
            }
        );
        
        console.log('✅ Response status:', response.status);
        
        const responseText = await response.text();
        console.log('📥 Response text:', responseText);
        
        ocultarLoaderAtencion();
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ Error parseando JSON:', e);
            console.error('📄 Respuesta HTML recibida:', responseText.substring(0, 500));
            mostrarError(`Error del servidor: ${response.status}. Revisa la consola para más detalles.`);
            return;
        }
        
        if (result.success) {
            console.log('✅ Tutoría finalizada exitosamente');
            mostrarExito('✅ Tutoría finalizada correctamente');
            cerrarModalAtencion();
            // Recargar agendamientos
            if (typeof cargarAgendamientos === 'function') {
                setTimeout(() => cargarAgendamientos(), 500);
            }
        } else {
            console.error('❌ Error del servidor:', result.message);
            mostrarError(result.message || 'Error al finalizar tutoría');
        }
    } catch (error) {
        ocultarLoaderAtencion();
        console.error('❌ Error al finalizar tutoría:', error);
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
                datosRegistro.materialesApoyo = document.getElementById('descripcionMateriales')?.value || '';
                
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
                datosRegistro.recursosRecomendados = document.getElementById('recursosRecomendadosAtencion')?.value || '';
                datosRegistro.materialesApoyo = document.getElementById('descripcionMateriales')?.value || '';
                
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
                datosRegistro.recursosRecomendados = document.getElementById('recursosRecomendadosAtencion')?.value || '';
                datosRegistro.materialesApoyo = document.getElementById('descripcionMateriales')?.value || '';
                
                if (!datosRegistro.temaProfesional || !datosRegistro.descripcionTema || !datosRegistro.observacionesProfesionales) {
                    mostrarError('Por favor, complete los campos obligatorios (*)');
                    return;
                }
            }
            
            try {
                mostrarLoaderAtencion();
                
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `${APP_CONFIG.API.BASE_URL}/atencionTutoria?action=registrar`,
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
