/**
 * ============================================================
 * MÓDULO DE SESIÓN ACTUAL - ESTUDIANTE
 * Sistema de Tutorías UNSAAC
 * ============================================================
 * 
 * Gestiona la visualización y funcionalidad de las sesiones de tutoría
 * del estudiante, incluyendo sesión activa, próximas sesiones e historial.
 */

(function() {
    'use strict';

    // Variable global para almacenar todas las sesiones
    let allSessions = [];
    let filteredSessions = [];
    let constanciasData = [];

    /**
     * Cargar contenido del módulo "Mis sesiones"
     */
    async function loadSesionActualContent() {
        const content = document.getElementById('dashboardContent');
        if (!content) return;
        
        try {
            content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando sesiones...</p></div>';
            
            // Cargar CSS
            const cssPath = '/Sistema-de-tutorias/frontend/css/estudiante/sesion-estudiante.css';
            if (!document.querySelector(`link[href="${cssPath}"]`)) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = cssPath;
                document.head.appendChild(cssLink);
            }
            
            // Cargar HTML
            const url = '/Sistema-de-tutorias/frontend/components/estudiante/sesion-estudiante.html';
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
            
            const htmlText = await response.text();
            content.innerHTML = htmlText;
            
            // Inicializar módulo
            await initializeSesionActual();
            
            console.log('✅ Módulo de sesiones cargado');
        } catch (error) {
            console.error('❌ Error al cargar módulo:', error);
            content.innerHTML = '<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">Error al cargar el módulo</div>';
        }
    }

    /**
     * Inicializar funcionalidad del módulo
     */
    async function initializeSesionActual() {
        try {
            // Cargar sesión activa
            const activeSesion = await getActiveSesion();
            if (activeSesion && activeSesion.id) {
                displayActiveSesion(activeSesion);
            }

            // Cargar próximas sesiones
            const upcomingSessions = await getUpcomingSessions();
            displayUpcomingSessions(upcomingSessions);

            // Cargar historial completo
            await loadAllSessions();

            // Cargar materiales
            await loadMaterials();

            // Cargar constancias
            await loadConstancias();

        } catch (error) {
            console.error('❌ Error al inicializar:', error);
        }
    }

    /**
     * Obtener sesión activa
     */
    async function getActiveSesion() {
        try {
            const response = await apiGet('/sesionActual?action=active');
            return response.success && response.data ? response.data : null;
        } catch (error) {
            console.error('❌ Error al obtener sesión activa:', error);
            return null;
        }
    }

    /**
     * Mostrar sesión activa
     */
    function displayActiveSesion(sesion) {
        const card = document.getElementById('activeSessionCard');
        if (!card) return;

        const title = document.getElementById('activeSessionTitle');
        const tutor = document.getElementById('activeTutor');
        const time = document.getElementById('activeTime');
        const location = document.getElementById('activeLocation');

        if (title) title.textContent = `Tutoría ${sesion.type || 'General'}`;
        if (tutor) tutor.textContent = sesion.tutorName || 'No asignado';
        if (time) time.textContent = sesion.time || 'No especificado';
        
        // Manejar location según modalidad
        const locationText = sesion.mode === 'virtual' || sesion.mode === 'Virtual' 
            ? 'Virtual' 
            : sesion.location || 'Presencial';
        if (location) location.textContent = locationText;

        card.style.display = 'block';
    }

    /**
     * Obtener próximas sesiones
     */
    async function getUpcomingSessions() {
        try {
            const response = await apiGet('/sesionActual?action=upcoming');
            return response.success && response.data ? response.data : [];
        } catch (error) {
            console.error('❌ Error al obtener próximas sesiones:', error);
            return [];
        }
    }

    /**
     * Mostrar próximas sesiones
     */
    function displayUpcomingSessions(sessions) {
        const container = document.getElementById('upcomingSessionsList');
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<p style="color:#999;text-align:center;padding:2rem;">No tienes sesiones programadas próximamente</p>';
            return;
        }

        container.innerHTML = sessions.map(session => {
            // Obtener fecha correcta (de tutoría o cronograma)
            const fechaStr = session.fechaTutoria || session.fechaCronograma || session.fecha;
            const fecha = new Date(fechaStr + 'T00:00:00');
            const dia = fecha.getDate();
            const mes = fecha.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
            
            // Obtener horas correctas
            const horaInicio = session.tutoriaHoraInicio || session.cronoHoraInicio || session.horaInicio || '';
            const horaFin = session.tutoriaHoraFin || session.cronoHoraFin || session.horaFin || '';
            const horario = horaInicio && horaFin ? `${horaInicio.substring(0,5)} - ${horaFin.substring(0,5)}` : 'Hora no especificada';
            
            // Obtener modalidad
            const modalidad = session.tutoriaModalidad || session.modalidad || 'presencial';
            const ambiente = session.ambiente || 'Por confirmar';
            
            return `
                <div class="upcoming-card">
                    <div class="date">
                        <div class="day">${dia}</div>
                        <div class="month">${mes}</div>
                    </div>
                    <h4>${session.tipo || 'Tutoría'}</h4>
                    <div class="meta">
                        <span><i class="fa-solid fa-clock"></i> ${horario}</span>
                        <span><i class="fa-solid fa-location-dot"></i> ${modalidad === 'Virtual' ? 'Virtual' : ambiente}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Cargar todas las sesiones (historial)
     */
    async function loadAllSessions() {
        const loader = document.getElementById('sessionsLoader');
        const list = document.getElementById('sessionsList');
        
        if (loader) loader.style.display = 'block';
        if (list) list.style.display = 'none';

        try {

            const data = await apiGet('/student?action=sessions');
            allSessions = data.success && data.data ? data.data : [];
            filteredSessions = [...allSessions];
            displaySessions(allSessions);

        } catch (error) {
            console.error('❌ Error al cargar sesiones:', error);
            if (list) list.innerHTML = '<p style="color:#d32f2f;text-align:center;padding:2rem;">Error al cargar el historial</p>';
        } finally {
            if (loader) loader.style.display = 'none';
            if (list) list.style.display = 'block';
        }
    }

    /**
     * Mostrar sesiones en la lista
     */
    function displaySessions(sessions) {
        const list = document.getElementById('sessionsList');
        const noResults = document.getElementById('noResultsMessage');
        const count = document.getElementById('resultsCount');

        if (!list) return;

        if (count) {
            count.textContent = `Mostrando ${sessions.length} sesión${sessions.length !== 1 ? 'es' : ''}`;
        }

        if (sessions.length === 0) {
            list.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        if (noResults) noResults.style.display = 'none';
        list.style.display = 'flex';

        list.innerHTML = sessions.map(session => {
            const fecha = new Date(session.fechaRealizada || session.fecha);
            const fechaStr = fecha.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const estado = session.estado || 'Pendiente';
            const tipo = session.tipo || 'General';
            const modalidad = session.modalidad || 'presencial';

            // Procesar observaciones - no mostrar si es JSON
            let observacionesHTML = '';
            if (session.observaciones && !session.observaciones.trim().startsWith('{')) {
                observacionesHTML = `
                    <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #f0f0f0;">
                        <p style="color:#666;margin:0;font-size:0.9rem;line-height:1.5;"><i class="fa-solid fa-note-sticky" style="color:#9B192D;margin-right:0.5rem;"></i>${session.observaciones}</p>
                    </div>
                `;
            }

            return `
                <div class="session-card ${estado.toLowerCase()}">
                    <div class="session-card-header">
                        <div class="session-main-info">
                            <h4><i class="fa-solid fa-graduation-cap" style="color:#9B192D;margin-right:0.5rem;"></i>${tipo}</h4>
                            <div class="session-tutor">
                                <i class="fa-solid fa-user-tie"></i>
                                Tutor asignado
                            </div>
                            <div class="session-date">
                                <i class="fa-solid fa-calendar-days"></i>
                                ${fechaStr}
                            </div>
                        </div>
                        <div class="session-badges">
                            <span class="badge tipo-${tipo.toLowerCase()}">${tipo}</span>
                            <span class="badge modalidad-${modalidad.toLowerCase()}">${modalidad === 'virtual' ? 'Virtual' : 'Presencial'}</span>
                            <span class="badge estado-${estado.toLowerCase()}">${estado}</span>
                        </div>
                    </div>
                    ${observacionesHTML}
                </div>
            `;
        }).join('');
    }

    /**
     * Cargar materiales de apoyo desde la API
     */
    async function loadMaterials() {
        const container = document.getElementById('materialsList');
        const noMaterialsMsg = document.getElementById('noMaterialsMessage');
        if (!container) return;

        try {
            const response = await apiGet('/sesionActual?action=materials');
            const materials = response.success && response.data ? response.data : [];

            if (materials.length === 0) {
                if (noMaterialsMsg) noMaterialsMsg.style.display = 'block';
                container.style.display = 'none';
                return;
            }

            if (noMaterialsMsg) noMaterialsMsg.style.display = 'none';
            container.style.display = 'grid';

            container.innerHTML = materials.map(material => {
                const tipoIcon = {
                    'PDF': 'fa-file-pdf',
                    'Video': 'fa-video',
                    'Documento': 'fa-file-word',
                    'Enlace': 'fa-link',
                    'Otro': 'fa-file'
                };

                const tipoColor = {
                    'PDF': '#dc2626',
                    'Video': '#9333ea',
                    'Documento': '#2563eb',
                    'Enlace': '#059669',
                    'Otro': '#6b7280'
                };

                return `
                    <div class="material-card">
                        <div class="material-icon" style="background:${tipoColor[material.tipo] || '#6b7280'}20;color:${tipoColor[material.tipo] || '#6b7280'};">
                            <i class="fa-solid ${tipoIcon[material.tipo] || 'fa-file'}"></i>
                        </div>
                        <div class="material-info">
                            <h5>${material.titulo}</h5>
                            <p>${material.descripcion || 'Material de apoyo'}</p>
                            <div class="material-meta">
                                <span class="material-type" style="background:${tipoColor[material.tipo] || '#6b7280'}20;color:${tipoColor[material.tipo] || '#6b7280'};"><i class="fa-solid ${tipoIcon[material.tipo] || 'fa-file'}" style="margin-right:0.25rem;"></i>${material.tipo}</span>
                                <span style="color:#999;font-size:0.75rem;"><i class="fa-solid fa-calendar" style="margin-right:0.25rem;"></i>${new Date(material.fechaRegistro).toLocaleDateString('es-ES')}</span>
                            </div>
                        </div>
                        <div class="material-actions">
                            <button class="btn-view" onclick="verMaterial('${material.enlace}', '${material.tipo}')" title="Ver material">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="btn-download" onclick="descargarMaterial('${material.enlace}', '${material.titulo}')" title="Descargar">
                                <i class="fa-solid fa-download"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('❌ Error al cargar materiales:', error);
            if (noMaterialsMsg) noMaterialsMsg.style.display = 'block';
            container.style.display = 'none';
        }
    }

    /**
     * Cargar constancias del estudiante desde la BD
     */
    async function loadConstancias() {
        const container = document.getElementById('constanciasList');
        const noConstanciasMsg = document.getElementById('noConstanciasMessage');
        if (!container) return;

        try {
            const token = localStorage.getItem('token');
            const basePath = (window.APP_BASE_PATH || '').replace(/\/$/, '');
            const response = await fetch(`${basePath}/backend/api/listar-constancias.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al cargar constancias');

            const data = await response.json();
            constanciasData = data.data || [];

            if (constanciasData.length === 0) {
                if (noConstanciasMsg) noConstanciasMsg.style.display = 'block';
                container.style.display = 'none';
                return;
            }

            if (noConstanciasMsg) noConstanciasMsg.style.display = 'none';
            container.style.display = 'grid';

            container.innerHTML = constanciasData.map(c => {
                const fechaGen = new Date(c.fechaGeneracion);
                const fechaStr = fechaGen.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                return `
                    <div class="constancia-card ${c.firmado ? 'firmada' : 'sin-firmar'}">
                        <div class="constancia-header">
                            <span class="constancia-badge ${c.firmado ? 'firmada' : 'sin-firmar'}">
                                ${c.firmado ? '✓ Firmada' : 'Pendiente de firma'}
                            </span>
                        </div>
                        <div class="constancia-info">
                            <h5>Constancia de Tutoría</h5>
                            <div class="constancia-meta">
                                <span>
                                    <i class="fa-solid fa-calendar"></i>
                                    Generada: ${fechaStr}
                                </span>
                                <span>
                                    <i class="fa-solid fa-user"></i>
                                    ${c.tutor.nombreCompleto}
                                </span>
                                <span>
                                    <i class="fa-solid fa-graduation-cap"></i>
                                    ${c.semestre.nombre}
                                </span>
                                ${c.fechaFirma ? `
                                <span>
                                    <i class="fa-solid fa-pen"></i>
                                    Firmada: ${new Date(c.fechaFirma).toLocaleDateString('es-ES')}
                                </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="constancia-actions">
                            <button class="btn-view-constancia" onclick="verConstancia(${c.id})">
                                <i class="fa-solid fa-eye"></i>
                                Ver
                            </button>
                            <button class="btn-download-constancia" onclick="descargarConstancia(${c.id})">
                                <i class="fa-solid fa-download"></i>
                                Descargar
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('❌ Error al cargar constancias:', error);
            if (noConstanciasMsg) noConstanciasMsg.style.display = 'block';
            container.style.display = 'none';
        }
    }

    /**
     * Solicitar cambio de tutor
     */
    window.solicitarCambioTutor = async function() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
                return;
            }

            // Obtener administradores y tutor en paralelo
            const [responseAdmins, responseTutor] = await Promise.all([
                apiGet('/sesionActual?action=administradores'),
                apiGet('/sesionActual?action=myTutor')
            ]);

            // Procesar administradores
            if (responseAdmins.success && responseAdmins.data && responseAdmins.data.length > 0) {
                const selectAdmin = document.getElementById('cambioAdministrador');
                if (selectAdmin) {
                    selectAdmin.innerHTML = '<option value="">Seleccione un administrador</option>' +
                        responseAdmins.data.map(admin => 
                            `<option value="${admin.id}">${admin.nombre}</option>`
                        ).join('');
                }
            } else {
                alert('No hay administradores disponibles');
                return;
            }

            // Procesar tutor
            if (responseTutor.success && responseTutor.data) {
                const tutor = responseTutor.data;
                document.getElementById('cambioTutorNombre').textContent = tutor.nombre || 'No asignado';
                document.getElementById('cambioTutorEspecialidad').textContent = tutor.especialidad || '-';
                document.getElementById('cambioTutorCorreo').textContent = tutor.email || '-';
                document.getElementById('modalSolicitarCambio').style.display = 'flex';
            } else {
                alert('No tienes un tutor asignado actualmente');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            alert('Error al cargar información. Intenta nuevamente.');
        }
    };

    /**
     * Contactar tutor
     */
    window.contactarTutor = async function() {
        try {
            const response = await apiGet('/sesionActual?action=myTutor');
            
            if (response.success && response.data) {
                const tutor = response.data;
                document.getElementById('contactTutorNombre').textContent = tutor.nombre || 'No asignado';
                document.getElementById('contactTutorEspecialidad').textContent = tutor.especialidad || '-';
                document.getElementById('contactTutorCorreo').textContent = tutor.email || '-';
                document.getElementById('modalContactarTutor').style.display = 'flex';
            } else {
                alert('No tienes un tutor asignado actualmente');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            alert('Error al cargar información del tutor');
        }
    };

    /**
     * Enviar mensaje al tutor
     */
    window.enviarMensajeTutor = async function(event) {
        event.preventDefault();
        
        const asunto = document.getElementById('contactAsunto').value.trim();
        const mensaje = document.getElementById('contactMensaje').value.trim();
        
        if (!asunto || !mensaje) {
            alert('Por favor, completa todos los campos');
            return;
        }
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
        
        try {
            const token = localStorage.getItem('token');
            const basePath = (window.APP_BASE_PATH || '').replace(/\/$/, '');
            const response = await fetch(`${basePath}/backend/api/contactarTutor.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ asunto, mensaje })
            });
            
            const data = await response.json();
            
            if (data.success) {
                cerrarModalContactar();
                mostrarConfirmacion('✅ Mensaje enviado', data.message || 'Tu mensaje ha sido enviado correctamente al tutor');
                document.getElementById('formContactarTutor').reset();
            } else {
                alert(data.message || 'Error al enviar el mensaje');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al enviar el mensaje. Intenta nuevamente.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    };

    /**
     * Enviar solicitud de cambio de tutor
     */
    window.enviarSolicitudCambio = async function(event) {
        event.preventDefault();
        
        const idAdministrador = document.getElementById('cambioAdministrador').value;
        const motivo = document.getElementById('cambioMotivo').value;
        const detalles = document.getElementById('cambioDetalles').value.trim();
        
        if (!idAdministrador) {
            alert('Por favor, selecciona un administrador');
            return;
        }
        
        if (!motivo) {
            alert('Por favor, selecciona un motivo');
            return;
        }
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
        
        try {
            const token = localStorage.getItem('token');
            const basePath = (window.APP_BASE_PATH || '').replace(/\/$/, '');
            const response = await fetch(`${basePath}/backend/api/solicitarCambio.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idAdministrador, motivo, detalles })
            });
            
            const data = await response.json();
            
            if (data.success) {
                cerrarModalSolicitud();
                mostrarConfirmacion('✅ Solicitud enviada', data.message || 'Tu solicitud ha sido enviada al administrador');
                document.getElementById('formSolicitarCambio').reset();
            } else {
                alert(data.message || 'Error al enviar la solicitud');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al enviar la solicitud. Intenta nuevamente.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    };

    /**
     * Cerrar modales
     */
    window.cerrarModalContactar = function() {
        document.getElementById('modalContactarTutor').style.display = 'none';
    };

    window.cerrarModalSolicitud = function() {
        document.getElementById('modalSolicitarCambio').style.display = 'none';
    };

    window.cerrarModalConfirmacion = function() {
        document.getElementById('modalConfirmacion').style.display = 'none';
    };

    /**
     * Mostrar modal de confirmación
     */
    function mostrarConfirmacion(titulo, mensaje) {
        document.getElementById('confirmTitulo').textContent = titulo;
        document.getElementById('confirmMensaje').textContent = mensaje;
        document.getElementById('modalConfirmacion').style.display = 'flex';
    }

    /**
     * Contador de caracteres
     */
    document.addEventListener('DOMContentLoaded', function() {
        const contactMensaje = document.getElementById('contactMensaje');
        const contactCharCount = document.getElementById('contactCharCount');
        const cambioDetalles = document.getElementById('cambioDetalles');
        const cambioCharCount = document.getElementById('cambioCharCount');

        if (contactMensaje && contactCharCount) {
            contactMensaje.addEventListener('input', function() {
                contactCharCount.textContent = this.value.length;
            });
        }

        if (cambioDetalles && cambioCharCount) {
            cambioDetalles.addEventListener('input', function() {
                cambioCharCount.textContent = this.value.length;
            });
        }

        // Cerrar modal al hacer clic fuera
        window.onclick = function(event) {
            if (event.target.classList.contains('modal-overlay')) {
                event.target.style.display = 'none';
            }
        };
    });

    /**
     * Unirse a sesión
     */
    window.unirseASesion = function() {
        alert('Redirigiendo a la sesión virtual...');
    };

    /**
     * Ver material
     */
    window.verMaterial = function(enlace, tipo) {
        console.log('Ver material:', enlace, tipo);
        
        if (!enlace) {
            alert('Material no disponible');
            return;
        }

        if (tipo === 'Enlace') {
            window.open(enlace, '_blank');
        } else {
            // Abrir archivo en nueva pestaña
            const fullPath = enlace.startsWith('http') ? enlace : `/Sistema-de-tutorias/${enlace}`;
            window.open(fullPath, '_blank');
        }
    };

    /**
     * Descargar material
     */
    window.descargarMaterial = function(enlace, titulo) {
        console.log('Descargar material:', enlace, titulo);
        
        if (!enlace) {
            alert('Material no disponible');
            return;
        }

        const fullPath = enlace.startsWith('http') ? enlace : `/Sistema-de-tutorias/${enlace}`;
        
        const link = document.createElement('a');
        link.href = fullPath;
        link.download = titulo || 'material';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /**
     * Ver constancia (desde rutaPDF de la BD)
     */
    window.verConstancia = function(constanciaId) {
        console.log('Ver constancia:', constanciaId);
        
        const constancia = constanciasData.find(c => c.id === constanciaId);
        if (!constancia || !constancia.rutaPDF) {
            alert('No se encontró la ruta del PDF');
            return;
        }

        // Construir ruta completa (agregar backend/ si no lo tiene)
        let rutaPDF = constancia.rutaPDF;
        if (!rutaPDF.startsWith('backend/')) {
            rutaPDF = 'backend/' + rutaPDF;
        }
        
        const url = `/Sistema-de-tutorias/${rutaPDF}`;
        window.open(url, '_blank');
    };

    /**
     * Descargar constancia (desde rutaPDF de la BD)
     */
    window.descargarConstancia = function(constanciaId) {
        console.log('Descargar constancia:', constanciaId);
        
        const constancia = constanciasData.find(c => c.id === constanciaId);
        if (!constancia || !constancia.rutaPDF) {
            alert('No se encontró la ruta del PDF');
            return;
        }

        // Construir ruta completa (agregar backend/ si no lo tiene)
        let rutaPDF = constancia.rutaPDF;
        if (!rutaPDF.startsWith('backend/')) {
            rutaPDF = 'backend/' + rutaPDF;
        }

        // Descargar PDF desde la ruta almacenada en la BD
        const link = document.createElement('a');
        link.href = `/Sistema-de-tutorias/${rutaPDF}`;
        link.download = `constancia_${constanciaId}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Exportar función principal
    window.loadSesionActualContent = loadSesionActualContent;

})();
