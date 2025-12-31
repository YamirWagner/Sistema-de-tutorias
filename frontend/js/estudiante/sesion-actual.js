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
            const response = await fetch(url, { cache: 'no-store' });
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
            const token = localStorage.getItem('token');
            if (!token) return null;

            const response = await fetch('/Sistema-de-tutorias/backend/api/sesionActual.php?action=active', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Error HTTP:', response.status);
                return null;
            }

            const data = await response.json();
            return data.success && data.data ? data.data : null;
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
            const token = localStorage.getItem('token');
            if (!token) return [];

            const response = await fetch('/Sistema-de-tutorias/backend/api/sesionActual.php?action=upcoming', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return [];

            const data = await response.json();
            return data.success && data.data ? data.data : [];
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
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No hay token');

            const response = await fetch('/Sistema-de-tutorias/backend/api/student.php?action=sessions', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const data = await response.json();
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

            return `
                <div class="session-card ${estado.toLowerCase()}">
                    <div class="session-card-header">
                        <div class="session-main-info">
                            <h4>${tipo}</h4>
                            <div class="session-tutor">
                                <i class="fa-solid fa-user"></i>
                                Tutor asignado
                            </div>
                            <div class="session-date">
                                <i class="fa-solid fa-calendar"></i>
                                ${fechaStr}
                            </div>
                        </div>
                        <div class="session-badges">
                            <span class="badge tipo-${tipo.toLowerCase()}">${tipo}</span>
                            <span class="badge modalidad-${modalidad.toLowerCase()}">${modalidad === 'virtual' ? 'Virtual' : 'Presencial'}</span>
                            <span class="badge estado-${estado.toLowerCase()}">${estado}</span>
                        </div>
                    </div>
                    ${session.observaciones ? `<p style="color:#666;margin:0;font-size:0.9rem;">${session.observaciones}</p>` : ''}
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
            const token = localStorage.getItem('token');
            if (!token) return;

            // Obtener todas las sesiones del estudiante
            const response = await fetch('/Sistema-de-tutorias/backend/api/student.php?action=sessions', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Error al cargar materiales');

            const data = await response.json();
            const sesiones = data.success && data.data ? data.data : [];

            // Obtener IDs de tutorías realizadas
            const tutoriaIds = sesiones
                .filter(s => s.estado === 'Realizada')
                .map(s => s.id);

            if (tutoriaIds.length === 0) {
                if (noMaterialsMsg) noMaterialsMsg.style.display = 'block';
                container.style.display = 'none';
                return;
            }

            // Cargar materiales de cada tutoría
            const materialsPromises = tutoriaIds.map(async (id) => {
                const matResponse = await fetch(`/Sistema-de-tutorias/backend/api/student.php?action=materials&tutoriaId=${id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (matResponse.ok) {
                    const matData = await matResponse.json();
                    return matData.success && matData.data ? matData.data : [];
                }
                return [];
            });

            const allMaterialsArrays = await Promise.all(materialsPromises);
            const materials = allMaterialsArrays.flat();

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

                return `
                    <div class="material-card">
                        <div class="material-info">
                            <h5>
                                <i class="fa-solid ${tipoIcon[material.tipo] || 'fa-file'}"></i>
                                ${material.titulo}
                            </h5>
                            <p>${material.descripcion || 'Material de apoyo'}</p>
                            <span class="material-type">${material.tipo}</span>
                        </div>
                        <div class="material-actions">
                            <button class="btn-view" onclick="verMaterial('${material.enlace}', '${material.tipo}')">
                                <i class="fa-solid fa-eye"></i> Ver
                            </button>
                            <button class="btn-download" onclick="descargarMaterial('${material.enlace}', '${material.titulo}')">
                                <i class="fa-solid fa-download"></i> Descargar
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
     * Cargar constancias del estudiante
     */
    async function loadConstancias() {
        const container = document.getElementById('constanciasList');
        const noConstanciasMsg = document.getElementById('noConstanciasMessage');
        if (!container) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('/Sistema-de-tutorias/backend/api/listar-constancias.php', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Error al cargar constancias');

            const data = await response.json();
            const constancias = data.constancias || data.data || [];

            if (constancias.length === 0) {
                if (noConstanciasMsg) noConstanciasMsg.style.display = 'block';
                container.style.display = 'none';
                return;
            }

            if (noConstanciasMsg) noConstanciasMsg.style.display = 'none';
            container.style.display = 'grid';

            container.innerHTML = constancias.map(constancia => {
                const firmada = constancia.firmado || constancia.firmada;
                const fechaGen = new Date(constancia.fechaGeneracion);
                const fechaStr = fechaGen.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                return `
                    <div class="constancia-card ${firmada ? 'firmada' : 'sin-firmar'}">
                        <div class="constancia-header">
                            <span class="constancia-badge ${firmada ? 'firmada' : 'sin-firmar'}">
                                ${firmada ? '✓ Firmada' : 'Pendiente de firma'}
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
                                    ${constancia.tutorNombres} ${constancia.tutorApellidos}
                                </span>
                                <span>
                                    <i class="fa-solid fa-graduation-cap"></i>
                                    ${constancia.semestreNombre || 'Semestre actual'}
                                </span>
                                ${constancia.fechaFirma ? `
                                <span>
                                    <i class="fa-solid fa-pen"></i>
                                    Firmada: ${new Date(constancia.fechaFirma).toLocaleDateString('es-ES')}
                                </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="constancia-actions">
                            <button class="btn-view-constancia" onclick="verConstancia(${constancia.id})">
                                <i class="fa-solid fa-eye"></i>
                                Ver
                            </button>
                            <button class="btn-download-constancia" onclick="descargarConstancia(${constancia.id})">
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

            // Obtener lista de administradores
            const responseAdmins = await fetch('/Sistema-de-tutorias/backend/api/sesionActual.php?action=administradores', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!responseAdmins.ok) {
                console.error('Error HTTP:', responseAdmins.status);
                throw new Error('Error al obtener administradores');
            }
            const dataAdmins = await responseAdmins.json();

            console.log('Respuesta administradores:', dataAdmins);
            console.log('dataAdmins.data es array?', Array.isArray(dataAdmins.data));
            console.log('Contenido de dataAdmins.data:', dataAdmins.data);

            if (dataAdmins.success && dataAdmins.data) {
                const administradores = Array.isArray(dataAdmins.data) ? dataAdmins.data : [dataAdmins.data];
                
                console.log('Administradores procesados:', administradores);
                
                if (administradores.length === 0) {
                    alert('No hay administradores disponibles');
                    return;
                }
                
                // Llenar select de administradores
                const selectAdmin = document.getElementById('cambioAdministrador');
                if (!selectAdmin) {
                    console.error('No se encontró el elemento #cambioAdministrador');
                    return;
                }
                
                selectAdmin.innerHTML = '<option value="">Seleccione un administrador</option>';
                
                administradores.forEach(admin => {
                    console.log('Agregando admin:', admin);
                    const option = document.createElement('option');
                    option.value = admin.id;
                    // Solo mostrar nombre, sin especialidad para administradores
                    option.textContent = admin.nombre;
                    selectAdmin.appendChild(option);
                });
                
                console.log('Total opciones agregadas:', selectAdmin.options.length - 1);
            } else {
                console.error('Respuesta sin éxito o sin datos:', dataAdmins);
                alert('No hay administradores disponibles');
                return;
            }

            // Obtener datos del tutor
            const response = await fetch('/Sistema-de-tutorias/backend/api/sesionActual.php?action=myTutor', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Error al obtener datos del tutor');

            const data = await response.json();
            
            if (data.success && data.data) {
                const tutor = data.data;
                // Llenar datos en el modal
                document.getElementById('cambioTutorNombre').textContent = tutor.nombre || 'No asignado';
                document.getElementById('cambioTutorEspecialidad').textContent = tutor.especialidad || '-';
                document.getElementById('cambioTutorCorreo').textContent = tutor.email || '-';
                
                // Mostrar modal
                document.getElementById('modalSolicitarCambio').style.display = 'flex';
            } else {
                alert('No tienes un tutor asignado actualmente');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar información. Intenta nuevamente.');
        }
    };

    /**
     * Contactar tutor
     */
    window.contactarTutor = async function() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
                return;
            }

            // Obtener datos del tutor
            const response = await fetch('/Sistema-de-tutorias/backend/api/sesionActual.php?action=myTutor', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Error al obtener datos del tutor');

            const data = await response.json();
            
            if (data.success && data.data) {
                const tutor = data.data;
                // Llenar datos en el modal
                document.getElementById('contactTutorNombre').textContent = tutor.nombre || 'No asignado';
                document.getElementById('contactTutorEspecialidad').textContent = tutor.especialidad || '-';
                document.getElementById('contactTutorCorreo').textContent = tutor.email || '-';
                
                // Mostrar modal
                document.getElementById('modalContactarTutor').style.display = 'flex';
            } else {
                alert('No tienes un tutor asignado actualmente');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar información. Intenta nuevamente.');
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
            const response = await fetch('/Sistema-de-tutorias/backend/api/contactarTutor.php', {
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
            const response = await fetch('/Sistema-de-tutorias/backend/api/solicitarCambio.php', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idAdministrador, motivo, detalles })
            });
            
            // Capturar el texto de la respuesta primero
            const responseText = await response.text();
            console.log('Respuesta raw del servidor:', responseText);
            
            // Intentar parsear como JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Error al parsear JSON:', parseError);
                console.error('Texto recibido:', responseText);
                alert('Error del servidor. Revisa la consola para más detalles.');
                return;
            }
            
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
     * Ver constancia
     */
    window.verConstancia = function(constanciaId) {
        console.log('Ver constancia:', constanciaId);
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesión expirada');
            return;
        }

        // Abrir PDF de constancia en nueva pestaña
        const url = `/Sistema-de-tutorias/backend/api/generar-pdf.php?id=${constanciaId}`;
        window.open(url, '_blank');
    };

    /**
     * Descargar constancia
     */
    window.descargarConstancia = function(constanciaId) {
        console.log('Descargar constancia:', constanciaId);
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Sesión expirada');
            return;
        }

        // Descargar PDF de constancia
        const link = document.createElement('a');
        link.href = `/Sistema-de-tutorias/backend/api/generar-pdf.php?id=${constanciaId}&download=1`;
        link.download = `constancia_${constanciaId}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Exportar función principal
    window.loadSesionActualContent = loadSesionActualContent;

})();
