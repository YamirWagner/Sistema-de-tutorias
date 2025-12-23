// GESTIÓN DE SESIONES DE TUTORÍA
let agendamientoActual = null;
let modalAtencionInicializado = false;

window.inicializarModalAtencion = function() {
    if (modalAtencionInicializado) return;
    if (document.getElementById('modalAtencionTutoria')) {
        modalAtencionInicializado = true;
        return;
    }

    const modalHTML = `
<div id="modalAtencionTutoria" class="modal-atencion-overlay" style="display: none;">
    <div class="modal-atencion-container">
        <div class="modal-atencion-header">
            <h2 id="tituloModalAtencion">📚 Registrar Sesión de Tutoría</h2>
            <button class="btn-close-atencion" onclick="cerrarModalAtencion()">✕</button>
        </div>

        <!-- Formulario de Registro -->
        <div id="vistaFormularioAtencion" class="modal-atencion-content">
            <form id="formRegistroAtencion">
                <input type="hidden" id="idTutoriaAtencion">
                <input type="hidden" id="tipoTutoriaSeleccionada">

                <!-- Sección Información Básica -->
                <div class="form-section-atencion">
                    <h3 class="section-title-atencion">📋 Información Básica de la Sesión</h3>
                    
                    <div class="form-group-atencion">
                        <label for="estudianteNombreAtencion">👤 Estudiante <span class="required">*</span></label>
                        <input type="text" id="estudianteNombreAtencion" class="form-control-atencion" readonly>
                    </div>

                    <div class="form-row-atencion">
                        <div class="form-group-atencion">
                            <label for="fechaSesionRegistro">📅 Fecha de la Sesión <span class="required">*</span></label>
                            <input type="date" id="fechaSesionRegistro" class="form-control-atencion" readonly>
                        </div>
                        <div class="form-group-atencion">
                            <label for="horaSesionRegistro">🕐 Hora de la Sesión <span class="required">*</span></label>
                            <input type="text" id="horaSesionRegistro" class="form-control-atencion" readonly>
                        </div>
                    </div>

                    <div class="form-group-atencion">
                        <label for="modalidadSesionRegistro">🏫 Modalidad de la Sesión</label>
                        <select id="modalidadSesionRegistro" class="form-control-atencion">
                            <option value="">--Seleccionar modalidad--</option>
                            <option value="Presencial">Presencial</option>
                            <option value="Virtual">Virtual</option>
                            <option value="Híbrida">Híbrida</option>
                        </select>
                    </div>
                </div>

                <!-- Sección Académica -->
                <div class="form-section-atencion">
                    <h3 class="section-title-atencion">📚 SECCIÓN ACADÉMICA</h3>
                    <p class="section-description-atencion">Registra los temas académicos abordados durante la sesión, el contenido específico trabajado y el progreso del estudiante.</p>
                    
                    <div class="form-group-atencion">
                        <label for="temaPrincipalAtencion">📖 Tema Principal Tratado <span class="required">*</span></label>
                        <input type="text" id="temaPrincipalAtencion" class="form-control-atencion" 
                               placeholder="Ej: Programación Orientada a Objetos, Cálculo Diferencial..." required>
                    </div>

                    <div class="form-group-atencion">
                        <label for="contenidoEspecificoAtencion">📝 Contenido Específico</label>
                        <textarea id="contenidoEspecificoAtencion" class="form-control-atencion" rows="3"
                                  placeholder="Describe el contenido específico trabajado durante la sesión..."></textarea>
                    </div>

                    <div class="form-group-atencion">
                        <label for="observacionesDesempenoAtencion">💬 Observaciones de Desempeño Académico <span class="required">*</span></label>
                        <textarea id="observacionesDesempenoAtencion" class="form-control-atencion" rows="5"
                                  placeholder="Describe el desempeño del estudiante durante la sesión:&#10;• Fortalezas identificadas&#10;• Dificultades encontradas&#10;• Nivel de comprensión de los temas&#10;• Recomendaciones académicas" required></textarea>
                    </div>

                    <div class="form-group-atencion">
                        <label for="actividadesRealizadasAtencion">✏️ Actividades Realizadas</label>
                        <textarea id="actividadesRealizadasAtencion" class="form-control-atencion" rows="3"
                                  placeholder="Lista los ejercicios, problemas o actividades que se trabajaron durante la sesión..."></textarea>
                    </div>
                </div>

                <!-- Materiales y Tareas -->
                <div class="form-section-atencion">
                    <h3 class="section-title-atencion">📚 MATERIALES Y TAREAS</h3>
                    
                    <div class="form-group-atencion">
                        <label for="materialesApoyoAtencion">📎 Materiales de Apoyo (opcional)</label>
                        <div class="file-upload-atencion">
                            <div class="file-upload-icon">📁</div>
                            <p>Haz clic para subir archivos</p>
                            <small>PDF, Word, Excel, PowerPoint, imágenes (Máx. 10MB por archivo)</small>
                        </div>
                        <textarea id="materialesApoyoAtencion" class="form-control-atencion" rows="2"
                                  placeholder="Lista los materiales utilizados o proporciona enlaces..."></textarea>
                    </div>

                    <div class="form-group-atencion">
                        <label for="tareasAsignadasAtencion">📋 Tareas Asignadas para la Próxima Sesión</label>
                        <textarea id="tareasAsignadasAtencion" class="form-control-atencion" rows="4"
                                  placeholder="Lista las tareas, ejercicios o actividades que el estudiante debe completar antes de la próxima sesión:&#10;&#10;• Resolver ejercicios del 1 al 13 de la pág. 23&#10;• Preparar preguntas sobre el tema&#10;• Revisar material complementario..."></textarea>
                    </div>

                    <div class="form-group-atencion">
                        <label for="recursosRecomendadosAtencion">🔗 Recursos Recomendados (Enlaces, libros, videos)</label>
                        <textarea id="recursosRecomendadosAtencion" class="form-control-atencion" rows="3"
                                  placeholder="Agrega enlaces, títulos de libros, videos de YouTube o cualquier recurso que el estudiante pueda consultar..."></textarea>
                    </div>

                    <div class="form-group-atencion">
                        <label for="notasAdicionalesAtencion">📌 Notas o Comentarios Adicionales</label>
                        <textarea id="notasAdicionalesAtencion" class="form-control-atencion" rows="3"
                                  placeholder="Cualquier información adicional relevante que quieras registrar sobre esta sesión..."></textarea>
                    </div>
                </div>

                <!-- Nota Importante -->
                <div class="alert-warning-atencion">
                    <strong>📌 NOTA IMPORTANTE:</strong> Toda la información registrada será visible para el estudiante en su panel. Sé claro, constructivo y profesional en tus observaciones. Esta información también será utilizada para el seguimiento y evaluación del progreso del estudiante.
                </div>

                <!-- Sección de Firmas (Opcional - futuro) -->
                <div class="form-section-atencion" style="border: 2px dashed #ccc; background: #f9f9f9;">
                    <h3 class="section-title-atencion">✍️ Firma Digital (Próximamente)</h3>
                    <div class="firma-placeholder">
                        <p style="text-align: center; color: #999; padding: 30px;">
                            Función de firma digital en desarrollo<br>
                            <small>Pronto podrás agregar tu firma digital y la del estudiante</small>
                        </p>
                    </div>
                </div>

                <div class="modal-actions-atencion">
                    <button type="button" class="btn-atencion btn-secondary-atencion" onclick="cerrarModalAtencion()">
                        Cancelar
                    </button>
                    <button type="submit" class="btn-atencion btn-success-atencion">
                        💾 Guardar Registro
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Loader Atención -->
<div id="loaderAtencion" class="loader-overlay-atencion" style="display: none;">
    <div class="loader-atencion"></div>
</div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modalAtencionInicializado = true;
    console.log('✅ Modal de atención insertado en el DOM');
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

    document.getElementById('vistaFormularioAtencion').style.display = 'block';
    document.getElementById('idTutoriaAtencion').value = agendamientoActual.id;
    document.getElementById('tipoTutoriaSeleccionada').value = agendamientoActual.tipoTutoria;
    document.getElementById('estudianteNombreAtencion').value = 
        `${agendamientoActual.estudianteNombres} ${agendamientoActual.estudianteApellidos}`;
    document.getElementById('fechaSesionRegistro').value = agendamientoActual.fecha;
    document.getElementById('horaSesionRegistro').value = 
        `${formatearHora(agendamientoActual.horaInicio)} - ${formatearHora(agendamientoActual.horaFin)}`;
    
    if (agendamientoActual.modalidad) {
        document.getElementById('modalidadSesionRegistro').value = agendamientoActual.modalidad;
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

document.addEventListener('DOMContentLoaded', function() {
    const formRegistro = document.getElementById('formRegistroAtencion');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!agendamientoActual) {
                mostrarError('No hay agendamiento seleccionado');
                return;
            }
            
            // Recopilar datos del formulario
            const datosRegistro = {
                idTutoria: agendamientoActual.id,
                tipoTutoria: document.getElementById('tipoTutoriaSeleccionada').value,
                modalidad: document.getElementById('modalidadSesionRegistro').value,
                temaPrincipal: document.getElementById('temaPrincipalAtencion').value,
                contenidoEspecifico: document.getElementById('contenidoEspecificoAtencion').value,
                observacionesDesempeno: document.getElementById('observacionesDesempenoAtencion').value,
                actividadesRealizadas: document.getElementById('actividadesRealizadasAtencion').value,
                materialesApoyo: document.getElementById('materialesApoyoAtencion').value,
                tareasAsignadas: document.getElementById('tareasAsignadasAtencion').value,
                recursosRecomendados: document.getElementById('recursosRecomendadosAtencion').value,
                notasAdicionales: document.getElementById('notasAdicionalesAtencion').value
            };
            
            // Validar campos obligatorios
            if (!datosRegistro.temaPrincipal || !datosRegistro.observacionesDesempeno) {
                mostrarError('Por favor, complete los campos obligatorios (*)');
                return;
            }
            
            try {
                mostrarLoaderAtencion();
                
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `${APP_CONFIG.API.BASE_URL}/atencionTutoria.php?action=registrar-academica`,
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
