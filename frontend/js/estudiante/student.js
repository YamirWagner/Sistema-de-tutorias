// student.js - Panel del Estudiante

// Cargar dashboard del estudiante
async function loadStudentDashboard() {
    console.log('Cargando dashboard de estudiante...');
    
    // Cargar datos del semestre actual
    await loadCurrentSemester();
    
    // Cargar datos del tutor asignado
    await loadMyTutor();    
    // Cargar estadísticas del estudiante
    await loadMyStats();
    
    // Cargar sesiones realizadas
    await loadMySessions();
    
    // NO verificar constancia automáticamente, solo cuando el usuario haga clic en "Buscar"
    
    // Cargar semestres para búsqueda
    await cargarSemestresParaBusqueda();
}

// Verificar si el estudiante tiene constancia disponible
async function verificarConstancia() {
    const constanciaEstado = document.getElementById('constanciaEstado');
    const btnDescargar = document.getElementById('btnDescargarConstancia');
    const constanciaInfo = document.getElementById('constanciaInfo');
    const constanciaNoDisponible = document.getElementById('constanciaNoDisponible');
    
    try {
        // Mostrar estado de búsqueda
        if (constanciaEstado) {
            constanciaEstado.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando constancia...';
            constanciaEstado.className = 'constancia-buscando';
        }
        
        // Obtener constancias del estudiante desde la BD
        const response = await apiGet('/listar-constancias');
        
        if (response?.success && response.constancias && response.constancias.length > 0) {
            // Tiene constancia disponible
            const constancia = response.constancias[0]; // Tomar la más reciente
            
            if (constancia.firmado) {
                // Constancia firmada y lista para descargar
                if (constanciaEstado) {
                    constanciaEstado.innerHTML = '<i class="fa-solid fa-check-circle"></i> Constancia firmada y disponible';
                    constanciaEstado.className = 'constancia-disponible';
                }
                if (btnDescargar) {
                    btnDescargar.style.display = 'inline-block';
                    btnDescargar.setAttribute('data-ruta', constancia.rutaPDF);
                }
                if (constanciaInfo) {
                    const fecha = new Date(constancia.fechaGeneracion).toLocaleDateString('es-ES');
                    constanciaInfo.innerHTML = `
                        <p>
                            <i class="fa-solid fa-file-pdf"></i> Tu constancia está firmada y lista para descargar.
                            <br><small>Generada el: ${fecha}</small>
                        </p>
                    `;
                    constanciaInfo.classList.remove('hidden');
                }
                if (constanciaNoDisponible) constanciaNoDisponible.classList.add('hidden');
            } else {
                // Constancia generada pero aún no firmada
                if (constanciaEstado) {
                    constanciaEstado.innerHTML = '<i class="fa-solid fa-clock"></i> Constancia pendiente de firma';
                    constanciaEstado.className = 'constancia-pendiente';
                }
                if (btnDescargar) btnDescargar.style.display = 'none';
                if (constanciaInfo) constanciaInfo.classList.add('hidden');
                if (constanciaNoDisponible) {
                    constanciaNoDisponible.innerHTML = `
                        <p>
                            <i class="fa-solid fa-signature"></i> Tu constancia aún no ha sido firmada por tu tutor. 
                            Por favor comunícate con tu tutor asignado.
                        </p>
                    `;
                    constanciaNoDisponible.classList.remove('hidden');
                }
            }
        } else {
            // No tiene constancia aún
            const statsResponse = await apiGet('/student?action=stats');
            const sesionesCompletadas = statsResponse?.data?.sesionesCompletadas || 0;
            
            if (constanciaEstado) {
                constanciaEstado.innerHTML = `<i class="fa-solid fa-times-circle"></i> Constancia no disponible`;
                constanciaEstado.className = 'constancia-no-disponible';
            }
            if (btnDescargar) btnDescargar.style.display = 'none';
            if (constanciaInfo) constanciaInfo.classList.add('hidden');
            if (constanciaNoDisponible) {
                const mensaje = sesionesCompletadas >= 3 
                    ? 'Has completado las 3 sesiones requeridas. Tu tutor debe generar tu constancia.'
                    : `Debes completar al menos 3 sesiones de tutoría para obtener tu constancia. Llevas ${sesionesCompletadas} sesiones.`;
                
                constanciaNoDisponible.innerHTML = `
                    <p>
                        <i class="fa-solid fa-exclamation-triangle"></i> 
                        ${mensaje}
                    </p>
                `;
                constanciaNoDisponible.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error al verificar constancia:', error);
        if (constanciaEstado) {
            constanciaEstado.innerHTML = '<i class="fa-solid fa-exclamation-circle"></i> Error al buscar';
            constanciaEstado.className = 'constancia-error';
        }
    }
}

// Descargar constancia del estudiante
async function descargarMiConstancia() {
    try {
        const btnDescargar = document.getElementById('btnDescargarConstancia');
        const rutaPDF = btnDescargar?.getAttribute('data-ruta');
        
        if (!rutaPDF) {
            showNotification('No se encontró la ruta del PDF', 'error');
            return;
        }
        
        showNotification('Descargando constancia...', 'info');
        
        const token = localStorage.getItem('token');
        const basePath = window.location.hostname === 'localhost' ? 'http://localhost/Sistema-de-tutorias/backend' : '/backend';
        
        // Descargar el PDF desde la ruta almacenada
        const response = await fetch(`${basePath}/${rutaPDF}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al descargar la constancia');
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
            throw new Error('El PDF está vacío');
        }
        
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Constancia_Tutorias.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        
        showNotification('Constancia descargada exitosamente', 'success');
    } catch (error) {
        console.error('Error al descargar constancia:', error);
        showNotification(error.message || 'Error al descargar la constancia', 'error');
    }
}

// Cargar semestres para búsqueda de sesiones
async function cargarSemestresParaBusqueda() {
    const semestreBusqueda = document.getElementById('semestreBusqueda');
    
    try {
        const response = await apiGet('/semestre?action=list');
        
        if (response?.success && response.data) {
            semestreBusqueda.innerHTML = '<option value="">Semestre Actual</option>';
            
            response.data.forEach(semestre => {
                const option = document.createElement('option');
                option.value = semestre.id;
                option.textContent = semestre.nombre;
                semestreBusqueda.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar semestres:', error);
    }
}

// Buscar sesiones del estudiante
async function buscarMisSesiones() {
    const semestreBusqueda = document.getElementById('semestreBusqueda');
    const misSesionesLista = document.getElementById('misSesionesLista');
    const semesterId = semestreBusqueda.value;
    
    try {
        misSesionesLista.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando sesiones...</p>';
        
        // Obtener sesiones del estudiante
        let url = '/student?action=sessions';
        if (semesterId) {
            url += `&semesterId=${semesterId}`;
        }
        
        const response = await apiGet(url);
        
        if (response?.success && response.data && response.data.length > 0) {
            const sesiones = response.data;
            
            let html = `
                <div style="margin-bottom: 1rem;">
                    <p style="font-weight: 600; color: #374151;">
                        <i class="fa-solid fa-calendar-check"></i> Total de sesiones encontradas: ${sesiones.length}
                    </p>
                </div>
                <div style="display: grid; gap: 1rem;">
            `;
            
            sesiones.forEach(sesion => {
                // Formatear fecha
                let fechaFormateada = 'Fecha no disponible';
                if (sesion.fechaRealizada || sesion.fecha) {
                    const fecha = new Date(sesion.fechaRealizada || sesion.fecha);
                    const dia = fecha.getDate();
                    const mes = fecha.toLocaleDateString('es-ES', { month: 'long' });
                    const anio = fecha.getFullYear();
                    fechaFormateada = `${dia} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} del ${anio}`;
                }
                
                // Color según estado
                let estadoColor = '#6b7280';
                let estadoIcono = 'fa-circle';
                if (sesion.estado === 'Realizada' || sesion.estado === 'completada') {
                    estadoColor = '#10b981';
                    estadoIcono = 'fa-check-circle';
                } else if (sesion.estado === 'cancelada') {
                    estadoColor = '#ef4444';
                    estadoIcono = 'fa-times-circle';
                } else if (sesion.estado === 'ausente') {
                    estadoColor = '#f59e0b';
                    estadoIcono = 'fa-exclamation-circle';
                }
                
                html += `
                    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <div>
                                <p style="font-weight: 600; color: #1f2937; margin: 0 0 0.25rem 0;">
                                    <i class="fa-solid fa-calendar"></i> ${fechaFormateada}
                                </p>
                                ${sesion.horaInicio ? `<p style="font-size: 0.875rem; color: #6b7280; margin: 0;"><i class="fa-solid fa-clock"></i> ${sesion.horaInicio.substring(0, 5)}</p>` : ''}
                            </div>
                            <span style="display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; background-color: ${estadoColor}20; color: ${estadoColor};">
                                <i class="fa-solid ${estadoIcono}"></i>
                                ${sesion.estado || 'Sin estado'}
                            </span>
                        </div>
                        <div style="margin-top: 0.75rem;">
                            <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">
                                <strong>Tipo:</strong> ${sesion.tipo || 'No especificado'}
                            </p>
                            ${sesion.modalidad ? `<p style="font-size: 0.875rem; color: #6b7280; margin: 0.25rem 0 0 0;"><strong>Modalidad:</strong> ${sesion.modalidad}</p>` : ''}
                            ${sesion.observaciones ? `<p style="font-size: 0.875rem; color: #6b7280; margin: 0.25rem 0 0 0;"><strong>Observaciones:</strong> ${sesion.observaciones}</p>` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            misSesionesLista.innerHTML = html;
            
        } else {
            misSesionesLista.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 3rem; color: #d1d5db; margin-bottom: 1rem;"></i>
                    <p style="font-weight: 600; color: #6b7280; margin: 0;">No se encontraron sesiones</p>
                    <p style="font-size: 0.875rem; color: #9ca3af; margin: 0.5rem 0 0 0;">
                        ${semesterId ? 'No tienes sesiones registradas en este semestre' : 'No tienes sesiones registradas en el semestre actual'}
                    </p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al buscar sesiones:', error);
        misSesionesLista.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem;">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 2rem; color: #ef4444; margin-bottom: 0.5rem;"></i>
                <p style="font-weight: 600; color: #991b1b; margin: 0;">Error al buscar sesiones</p>
            </div>
        `;
    }
}

// Cargar datos del tutor asignado
async function loadMyTutor() {
    const tutorWidget = document.getElementById('tutorWidget');
    const noTutorWidget = document.getElementById('noTutorWidget');
    
    try {
        console.log('🔄 Obteniendo datos del tutor asignado...');
        const response = await apiGet('/student?action=myTutor');
        
        if (response?.success && response.data) {
            const tutor = response.data;
            console.log('✅ DATOS DEL TUTOR ASIGNADO:', tutor);
            
            // Mostrar widget del tutor
            if (tutorWidget) {
                tutorWidget.style.display = 'block';
                
                // Llenar datos
                const nombreEl = document.getElementById('tutorNombre');
                if (nombreEl) nombreEl.textContent = tutor.nombre || `${tutor.nombres} ${tutor.apellidos}`;
                
                const especialidadEl = document.getElementById('tutorEspecialidad');
                if (especialidadEl) especialidadEl.textContent = tutor.especialidad || 'Especialidad no especificada';
                
                const emailEl = document.getElementById('tutorEmail');
                if (emailEl) emailEl.textContent = tutor.email || tutor.correo || '-';
                
                const fechaEl = document.getElementById('tutorFechaAsignacion');
                if (fechaEl && tutor.fechaAsignacion) {
                    // Formatear fecha
                    const fecha = new Date(tutor.fechaAsignacion);
                    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
                    fechaEl.textContent = fecha.toLocaleDateString('es-ES', opciones);
                } else if (fechaEl) {
                    fechaEl.textContent = '-';
                }
            }
            
            if (noTutorWidget) noTutorWidget.style.display = 'none';
            
        } else {
            console.log('⚠️ No tienes tutor asignado en este semestre');
            
            // Mostrar mensaje de no tutor
            if (tutorWidget) tutorWidget.style.display = 'none';
            if (noTutorWidget) noTutorWidget.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Error al obtener datos del tutor:', error);
        
        // Ocultar ambos widgets en caso de error
        if (tutorWidget) tutorWidget.style.display = 'none';
        if (noTutorWidget) noTutorWidget.style.display = 'none';
    }
}

// Función para contactar al tutor
function contactarTutor() {
    const emailEl = document.getElementById('tutorEmail');
    if (emailEl && emailEl.textContent && emailEl.textContent !== '-') {
        window.location.href = `mailto:${emailEl.textContent}`;
    } else {
        alert('No se ha encontrado el email del tutor');
    }
}

// Cargar estadísticas del estudiante
async function loadMyStats() {
    const progressWidget = document.getElementById('progressWidget');
    
    try {
        console.log('\n📊 ============================================');
        console.log('📊 ESTADÍSTICAS DE TUTORÍAS');
        console.log('📊 ============================================');
        
        const response = await apiGet('/student?action=stats');
        
        if (response?.success && response.data) {
            const stats = response.data;
            
            // Mostrar widget de progreso
            if (progressWidget) {
                progressWidget.style.display = 'block';
            }
            
            // Sesiones completadas
            const sesionesEl = document.getElementById('sesionesCompletadas');
            if (sesionesEl) {
                sesionesEl.textContent = stats.sesionesCompletadas;
            }
            console.log('\n✅ Sesiones Completadas:', stats.sesionesCompletadas, 'de 3');
            
            // Porcentaje de avance
            const porcentajeEl = document.getElementById('porcentajeAvance');
            if (porcentajeEl) {
                porcentajeEl.textContent = stats.porcentajeAvance + '%';
            }
            console.log('📈 Porcentaje de Avance:', stats.porcentajeAvance + '%', '(100% = 3 sesiones)');
            
            // Horas totales
            const horasEl = document.getElementById('horasTutoria');
            if (horasEl) {
                horasEl.textContent = stats.horasTotales + 'h';
            }
            console.log('⏱️  Horas Totales de Tutoría:', stats.horasTotales, 'horas');
            
            // Próxima sesión
            const proximaEl = document.getElementById('proximaSesion');
            if (stats.proximaSesion) {
                if (proximaEl) {
                    const fecha = new Date(stats.proximaSesion.fecha + 'T' + stats.proximaSesion.horaInicio);
                    const opciones = { day: 'numeric', month: 'long' };
                    const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
                    const hora = stats.proximaSesion.horaInicio.substring(0, 5);
                    proximaEl.textContent = `${fechaFormateada}, ${hora}`;
                }
                console.log('\n📅 Próxima Sesión:');
                console.log('   • Fecha:', stats.proximaSesion.fecha);
                console.log('   • Hora:', stats.proximaSesion.horaInicio, '-', stats.proximaSesion.horaFin);
                console.log('   • Tipo:', stats.proximaSesion.tipo);
                console.log('   • Modalidad:', stats.proximaSesion.modalidad || 'No especificada');
            } else {
                if (proximaEl) {
                    proximaEl.textContent = 'Ninguna';
                    proximaEl.style.fontSize = '1rem';
                }
                console.log('\n📅 Próxima Sesión: Ninguna');
            }
            
            console.log('\n📊 ============================================\n');
        } else {
            console.log('⚠️ No se pudieron cargar las estadísticas');
            if (progressWidget) {
                progressWidget.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
        if (progressWidget) {
            progressWidget.style.display = 'none';
        }
    }
}

// Cargar sesiones realizadas
async function loadMySessions() {
    const sessionsList = document.getElementById('sessionsList');
    const sessionsContainer = document.getElementById('sessionsContainer');
    const noSessionsMessage = document.getElementById('noSessionsMessage');
    
    try {
        console.log('\n📚 ============================================');
        console.log('📚 SESIONES REALIZADAS');
        console.log('📚 ============================================\n');
        
        const response = await apiGet('/student?action=sessions');
        
        if (response?.success && response.data && response.data.length > 0) {
            const sesiones = response.data;
            
            // Mostrar sección de sesiones
            if (sessionsList) sessionsList.style.display = 'block';
            if (noSessionsMessage) noSessionsMessage.style.display = 'none';
            
            console.log(`Total de sesiones realizadas: ${sesiones.length}\n`);
            
            // Limpiar contenedor
            if (sessionsContainer) {
                sessionsContainer.innerHTML = '';
                
                // Crear HTML para cada sesión
                sesiones.forEach((sesion, index) => {
                    // Formatear fecha y hora
                    let fechaFormateada = 'Fecha no disponible';
                    if (sesion.fechaRealizada || sesion.fecha) {
                        const fecha = new Date(sesion.fechaRealizada || sesion.fecha);
                        const dia = fecha.getDate();
                        const mes = fecha.toLocaleDateString('es-ES', { month: 'long' });
                        const anio = fecha.getFullYear();
                        const hora = sesion.horaInicio ? sesion.horaInicio.substring(0, 5) : '';
                        fechaFormateada = `${dia} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} del ${anio}${hora ? ' - ' + hora : ''}`;
                    }
                    
                    // Determinar icono y color según tipo
                    let iconoTipo = '📚';
                    let colorTipo = '#10b981';
                    let tituloTipo = sesion.tipo || 'Sesión';
                    
                    if (sesion.tipo === 'Academica') {
                        iconoTipo = '📚';
                        colorTipo = '#10b981';
                        tituloTipo = 'Tema Académico';
                    } else if (sesion.tipo === 'Personal') {
                        iconoTipo = '🧘';
                        colorTipo = '#ec4899';
                        tituloTipo = 'Aspecto Personal';
                    } else if (sesion.tipo === 'Profesional') {
                        iconoTipo = '💼';
                        colorTipo = '#8b5cf6';
                        tituloTipo = 'Desarrollo Profesional';
                    }
                    
                    // Obtener y formatear observaciones como lista desde JSON
                    let observacionesTexto = sesion.observaciones || sesion.cronograma_descripcion || 'Sin descripción disponible';
                    observacionesTexto = observacionesTexto.trim();
                    
                    // Convertir observaciones en lista
                    let observacionesHTML = '';
                    let items = [];
                    
                    // Función para formatear nombres de claves JSON
                    function formatearClave(clave) {
                        // Convertir camelCase o snake_case a texto legible
                        let texto = clave
                            .replace(/([A-Z])/g, ' $1') // Separar camelCase
                            .replace(/_/g, ' ') // Reemplazar guiones bajos
                            .trim();
                        
                        // Capitalizar cada palabra
                        texto = texto.split(' ')
                            .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
                            .join(' ');
                        
                        return texto;
                    }
                    
                    // Intentar parsear como JSON
                    try {
                        const jsonData = JSON.parse(observacionesTexto);
                        
                        // Si es un array, usar directamente
                        if (Array.isArray(jsonData)) {
                            items = jsonData.filter(item => item && item.toString().trim().length > 0);
                        }
                        // Si es un objeto, extraer las claves y valores formateados
                        else if (typeof jsonData === 'object' && jsonData !== null) {
                            items = Object.entries(jsonData)
                                .filter(([key, value]) => value && value.toString().trim().length > 0)
                                .map(([key, value]) => {
                                    const claveFormateada = formatearClave(key);
                                    return `<strong>${claveFormateada}:</strong> ${value}`;
                                });
                        }
                        // Si es un string simple
                        else if (typeof jsonData === 'string') {
                            items = [jsonData];
                        }
                    } catch (e) {
                        // No es JSON válido, usar el texto como está
                        if (observacionesTexto.includes('\n')) {
                            items = observacionesTexto.split('\n').filter(item => item.trim().length > 0);
                        }
                        else if (observacionesTexto.includes('. ')) {
                            items = observacionesTexto.split('. ').filter(item => item.trim().length > 0);
                            items = items.map((item, index) => {
                                item = item.trim();
                                if (index < items.length - 1 && !item.endsWith('.')) {
                                    return item + '.';
                                }
                                return item;
                            });
                        }
                        else if (observacionesTexto.includes(', ')) {
                            items = observacionesTexto.split(', ').filter(item => item.trim().length > 0);
                        }
                        else {
                            items = [observacionesTexto];
                        }
                    }
                    
                    // Capitalizar primera letra de cada item (solo si no tiene HTML)
                    items = items.map(item => {
                        item = item.toString().trim();
                        if (item.length > 0 && !item.includes('<strong>')) {
                            item = item.charAt(0).toUpperCase() + item.slice(1);
                        }
                        return item;
                    });
                    
                    // Generar HTML de la lista
                    if (items.length > 0) {
                        observacionesHTML = '<ul style="margin: 0; padding-left: 1.25rem; list-style: none;">';
                        items.forEach(item => {
                            observacionesHTML += `
                                <li style="margin-bottom: 0.375rem; position: relative; padding-left: 0.25rem;">
                                    <span style="color: ${colorTipo}; font-weight: bold; margin-right: 0.5rem;">•</span>
                                    <span style="color: #4b5563;">${item}</span>
                                </li>
                            `;
                        });
                        observacionesHTML += '</ul>';
                    } else {
                        observacionesHTML = `<p style="font-size: 0.875rem; color: #4b5563; margin: 0; line-height: 1.6; font-style: italic;">Sin descripción disponible</p>`;
                    }
                    
                    const sesionHTML = `
                        <div style="border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.25rem; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fa-solid fa-calendar" style="color: #6b7280; font-size: 0.875rem;"></i>
                                    <span style="font-weight: 600; color: #1f2937; font-size: 0.9375rem;">${fechaFormateada}</span>
                                </div>
                                <span style="background-color: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
                                    Completada
                                </span>
                            </div>
                            
                            <div style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); border: 1px solid #e5e7eb; border-left: 4px solid ${colorTipo}; border-radius: 0.5rem; padding: 1.125rem; margin-bottom: 0.75rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                <div style="display: flex; align-items: start; gap: 0.875rem;">
                                    <div style="background: white; width: 40px; height: 40px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex-shrink: 0;">
                                        <span style="font-size: 1.25rem;">${iconoTipo}</span>
                                    </div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="background: white; border-radius: 0.375rem; padding: 0.75rem; border: 1px solid #e5e7eb;">
                                            ${observacionesHTML}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            ${sesion.modalidad ? `
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; padding: 0.5rem; background: #f9fafb; border-radius: 0.375rem;">
                                <i class="fa-solid fa-${sesion.modalidad === 'Virtual' ? 'video' : sesion.modalidad === 'Presencial' ? 'users' : 'desktop'}" style="color: #9B192D; font-size: 0.875rem;"></i>
                                <span style="font-size: 0.875rem; color: #6b7280; font-weight: 500;">${sesion.modalidad}</span>
                                ${sesion.ambiente ? `<span style="color: #d1d5db;">•</span><span style="font-size: 0.875rem; color: #6b7280;">${sesion.ambiente}</span>` : ''}
                            </div>
                            ` : ''}
                        </div>
                    `;
                    
                    sessionsContainer.innerHTML += sesionHTML;
                    
                    // Log en consola
                    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                    console.log(`📌 SESIÓN #${index + 1}`);
                    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                    console.log('\n🆔 ID de Sesión:', sesion.id);
                    console.log('📅 Fecha Programada:', sesion.fecha || 'No especificada');
                    console.log('📅 Fecha Realizada:', sesion.fechaRealizada || 'No registrada');
                    
                    if (sesion.horaInicio && sesion.horaFin) {
                        const inicio = new Date(`2000-01-01T${sesion.horaInicio}`);
                        const fin = new Date(`2000-01-01T${sesion.horaFin}`);
                        const duracion = (fin - inicio) / (1000 * 60 * 60);
                        console.log('🕐 Horario:', `${sesion.horaInicio} - ${sesion.horaFin}`);
                        console.log('⏱️  Duración:', `${duracion.toFixed(2)} horas`);
                    } else {
                        console.log('🕐 Horario: No especificado');
                    }
                    
                    console.log('📋 Tipo:', sesion.tipo || 'No especificado');
                    console.log('💻 Modalidad:', sesion.modalidad || 'No especificada');
                    
                    if (sesion.ambiente) {
                        console.log('📍 Ambiente:', sesion.ambiente);
                    }
                    
                    if (sesion.observaciones) {
                        console.log('\n📝 Observaciones:');
                        console.log('   ' + sesion.observaciones);
                    }
                    
                    if (sesion.cronograma_descripcion) {
                        console.log('\n📄 Descripción:');
                        console.log('   ' + sesion.cronograma_descripcion);
                    }
                    
                    console.log('\n✅ Estado:', sesion.estado);
                    
                    if (sesion.created_at) {
                        const fechaRegistro = new Date(sesion.created_at);
                        console.log('📝 Registrado:', fechaRegistro.toLocaleString('es-ES'));
                    }
                    
                    console.log('\n');
                });
            }
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`✅ Total: ${sesiones.length} sesión${sesiones.length !== 1 ? 'es' : ''} realizada${sesiones.length !== 1 ? 's' : ''}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
        } else {
            console.log('⚠️ No tienes sesiones realizadas todavía\n');
            
            // Mostrar mensaje de no sesiones
            if (sessionsList) sessionsList.style.display = 'block';
            if (sessionsContainer) sessionsContainer.innerHTML = '';
            if (noSessionsMessage) noSessionsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Error al cargar sesiones:', error);
        
        // Ocultar sección en caso de error
        if (sessionsList) sessionsList.style.display = 'none';
    }
}

// Cargar datos del semestre actual (usa la misma lógica del header)
async function loadCurrentSemester() {
    try {
        console.log('🔄 Cargando semestre actual en dashboard estudiante...');
        
        // Intentar obtener del API (misma lógica que header_panel.js)
        try {
            const response = await apiGet('/semestre?action=current');
            
            if (response?.success && response.data?.semester) {
                const semester = response.data.semester;
                console.log('✅ Semestre obtenido desde BD:', semester);
                
                // Actualizar nombre del semestre
                const semestreActualEl = document.getElementById('semestreActual');
                if (semestreActualEl) {
                    semestreActualEl.textContent = semester.name || semester.nombre || 'Sin semestre';
                }
                
                // Actualizar estado del semestre
                const estadoSemestreEl = document.getElementById('estadoSemestre');
                if (estadoSemestreEl) {
                    const estado = semester.status || semester.estado || 'Inactivo';
                    estadoSemestreEl.textContent = estado;
                    
                    // Cambiar color según el estado
                    const estadoSpan = estadoSemestreEl.parentElement;
                    if (estadoSpan) {
                        if (estado === 'Activo') {
                            estadoSpan.style.backgroundColor = '#10b981'; // Verde
                        } else if (estado === 'Cerrado' || estado === 'Finalizado') {
                            estadoSpan.style.backgroundColor = '#ef4444'; // Rojo
                        } else if (estado === 'Programado') {
                            estadoSpan.style.backgroundColor = '#f59e0b'; // Amarillo
                        } else {
                            estadoSpan.style.backgroundColor = '#6b7280'; // Gris
                        }
                    }
                }
                
                console.log('✅ Semestre cargado en dashboard:', semester.name || semester.nombre);
                return; // Salir si todo fue exitoso
            }
        } catch (apiError) {
            console.warn('⚠️ No se pudo obtener semestre del API:', apiError.message);
        }
        
        // Fallback: usar datos del token si existen
        const user = getUserFromToken();
        if (user && user.semestre) {
            const semestreActualEl = document.getElementById('semestreActual');
            if (semestreActualEl) {
                semestreActualEl.textContent = user.semestre;
            }
            
            const estadoSemestreEl = document.getElementById('estadoSemestre');
            if (estadoSemestreEl) {
                estadoSemestreEl.textContent = 'Activo';
                estadoSemestreEl.parentElement.style.backgroundColor = '#10b981';
            }
            
            console.log('✅ Semestre del token:', user.semestre);
            return;
        }
        
        // Si no hay datos, mostrar mensaje
        const semestreActualEl = document.getElementById('semestreActual');
        if (semestreActualEl) {
            semestreActualEl.textContent = 'Sin semestre activo';
        }
        
        const estadoSemestreEl = document.getElementById('estadoSemestre');
        if (estadoSemestreEl) {
            estadoSemestreEl.textContent = 'Inactivo';
            estadoSemestreEl.parentElement.style.backgroundColor = '#6b7280';
        }
        
    } catch (error) {
        console.error('❌ Error al cargar semestre actual:', error);
        const semestreActualEl = document.getElementById('semestreActual');
        if (semestreActualEl) {
            semestreActualEl.textContent = 'Error al cargar';
        }
        const estadoSemestreEl = document.getElementById('estadoSemestre');
        if (estadoSemestreEl) {
            estadoSemestreEl.textContent = 'Error';
            estadoSemestreEl.parentElement.style.backgroundColor = '#6b7280';
        }
    }
}

// ============================================
// FUNCIONES DE CARGA DE MÓDULOS DE ESTUDIANTE
// ============================================

/**
 * Cargar contenido del módulo "Inicio" (estudiante.html)
 */
async function loadEstudianteContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando módulo...</p></div>';
        
        // Cargar CSS si es necesario
        const cssPath = window.PATH?.css('estudiante/estudiante.css') || 
                       '/Sistema-de-tutorias/frontend/css/estudiante/estudiante.css';
        
        if (!document.querySelector(`link[href*="estudiante.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        // Cargar HTML
        const url = window.PATH?.component('estudiante/estudiante.html') || 
                    '/Sistema-de-tutorias/frontend/components/estudiante/estudiante.html';
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        // Cargar dashboard del estudiante
        await loadStudentDashboard();
        
        console.log('✅ Módulo de inicio del estudiante cargado');
    } catch (error) {
        console.error('❌ Error al cargar módulo de inicio:', error);
        content.innerHTML = '<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">Error al cargar el módulo</div>';
    }
}

/**
 * Cargar contenido del módulo "Sesión actual" (sesion-estudiante.html)
 */
async function loadSesionActualContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando sesión actual...</p></div>';
        
        // Cargar CSS si es necesario
        const cssPath = window.PATH?.css('estudiante/sesion-estudiante.css') || 
                       '/Sistema-de-tutorias/frontend/css/estudiante/sesion-estudiante.css';
        
        if (!document.querySelector(`link[href*="sesion-estudiante.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        // Cargar HTML
        const url = window.PATH?.component('estudiante/sesion-estudiante.html') || 
                    '/Sistema-de-tutorias/frontend/components/estudiante/sesion-estudiante.html';
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        // Inicializar funcionalidad de sesión actual
        // TODO: Implementar lógica de sesión actual
        console.log('✅ Módulo de sesión actual cargado');
    } catch (error) {
        console.error('❌ Error al cargar módulo de sesión actual:', error);
        content.innerHTML = '<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">Error al cargar el módulo</div>';
    }
}

/**
 * Cargar contenido del módulo "Historial de tutorías" (historial-estudiante.html)
 */
async function loadHistorialTutoriasContent() {
    const content = document.getElementById('dashboardContent');
    if (!content) return;
    
    try {
        content.innerHTML = '<div class="loading-message" style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:32px;color:#a42727;"></i><p style="margin-top:16px;color:#666;">Cargando historial...</p></div>';
        
        // Cargar CSS si es necesario
        const cssPath = window.PATH?.css('estudiante/historial-estudiante.css') || 
                       '/Sistema-de-tutorias/frontend/css/estudiante/historial-estudiante.css';
        
        if (!document.querySelector(`link[href*="historial-estudiante.css"]`)) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssPath;
            document.head.appendChild(cssLink);
        }
        
        // Cargar HTML
        const url = window.PATH?.component('estudiante/historial-estudiante.html') || 
                    '/Sistema-de-tutorias/frontend/components/estudiante/historial-estudiante.html';
        
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Error al cargar: ${response.status}`);
        
        const htmlText = await response.text();
        content.innerHTML = htmlText;
        
        // Inicializar funcionalidad de historial
        // TODO: Implementar lógica de historial
        console.log('✅ Módulo de historial de tutorías cargado');
    } catch (error) {
        console.error('❌ Error al cargar módulo de historial:', error);
        content.innerHTML = '<div class="error-message" style="text-align:center;padding:40px;color:#d32f2f;">Error al cargar el módulo</div>';
    }
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================
window.loadEstudianteContent = loadEstudianteContent;
window.loadSesionActualContent = loadSesionActualContent;
window.loadHistorialTutoriasContent = loadHistorialTutoriasContent;
window.contactarTutor = contactarTutor;
