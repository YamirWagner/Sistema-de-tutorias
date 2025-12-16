// Asignaciontutor.js - Gestión de agendamientos de tutorías

(function() {
    'use strict';

    // ==================== VARIABLES GLOBALES ====================
    let currentDate = new Date();
    let fechaActual = new Date(); // Variable para las vistas de semana y día
    let currentView = 'mes';
    let agendamientos = [];
    let estudiantes = [];
    let agendamientoSeleccionado = null;

    // ==================== FUNCIÓN DE CARGA DEL MÓDULO ====================
    window.loadAsignacionTutorContent = async function() {
        console.log('🎯 Cargando módulo de Asignación de Tutor / Agendamientos');
        
        try {
            const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
            const componentPath = `${basePath}/frontend/components/tutor/asignacionTutor.html`;
            
            console.log('📄 Cargando componente desde:', componentPath);
            
            const response = await fetch(componentPath);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const dashboardContent = document.getElementById('dashboardContent');
            
            if (!dashboardContent) {
                throw new Error('No se encontró el contenedor dashboardContent');
            }
            
            dashboardContent.innerHTML = html;
            
            console.log('✅ HTML del módulo cargado correctamente');
            
            // Inicializar el módulo
            setTimeout(() => {
                inicializarSelectoresAnio();
                initializeEventListeners();
                cargarEstudiantes();
                actualizarSelectoresFecha();
                cargarAgendamientos();
                renderizarVista();
                console.log('✅ Módulo de Asignación de Tutor inicializado');
            }, 100);
            
        } catch (error) {
            console.error('❌ Error al cargar módulo de Asignación de Tutor:', error);
            const dashboardContent = document.getElementById('dashboardContent');
            if (dashboardContent) {
                dashboardContent.innerHTML = '<div class="p-6 text-red-600">Error al cargar el módulo de agendamientos</div>';
            }
        }
    };

    // ==================== INICIALIZACIÓN ====================
    document.addEventListener('DOMContentLoaded', function() {
        // Solo inicializar si estamos en una página que ya tiene el HTML cargado
        const agendamientoContainer = document.querySelector('.agendamiento-container');
        if (agendamientoContainer) {
            inicializarSelectoresAnio();
            initializeEventListeners();
            cargarEstudiantes();
            cargarAgendamientos();
            renderizarVista();
            actualizarSelectoresFecha();
        }
    });

    // ==================== INICIALIZACIÓN ====================
    function inicializarSelectoresAnio() {
        const selectorAnio = document.getElementById('selectorAnio');
        if (!selectorAnio) return;

        const anioActual = new Date().getFullYear();
        const anioInicio = anioActual - 5;
        const anioFin = anioActual + 5;

        for (let anio = anioInicio; anio <= anioFin; anio++) {
            const option = document.createElement('option');
            option.value = anio;
            option.textContent = anio;
            if (anio === anioActual) {
                option.selected = true;
            }
            selectorAnio.appendChild(option);
        }
    }

    function actualizarSelectoresFecha() {
        const selectorMes = document.getElementById('selectorMes');
        const selectorAnio = document.getElementById('selectorAnio');

        if (selectorMes) {
            selectorMes.value = currentDate.getMonth();
        }
        if (selectorAnio) {
            selectorAnio.value = currentDate.getFullYear();
        }
    }

    // ==================== EVENT LISTENERS ====================
    function initializeEventListeners() {
        // Tabs de vistas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                cambiarVista(this.dataset.vista);
            });
        });

        // Navegación del calendario (adaptable según vista)
        document.getElementById('btnAnterior')?.addEventListener('click', navegarAnterior);
        document.getElementById('btnSiguiente')?.addEventListener('click', navegarSiguiente);
        document.getElementById('btnHoy')?.addEventListener('click', irAHoy);
        
        // Selectores de mes y año
        document.getElementById('selectorMes')?.addEventListener('change', cambiarMes);
        document.getElementById('selectorAnio')?.addEventListener('change', cambiarAnio);

        // Modal de agendamiento
        document.getElementById('btnNuevoAgendamiento')?.addEventListener('click', abrirModalNuevo);
        document.getElementById('btnCerrarModal')?.addEventListener('click', cerrarModalAgendamiento);
        document.getElementById('btnCancelarModal')?.addEventListener('click', cerrarModalAgendamiento);
        document.getElementById('formAgendamiento')?.addEventListener('submit', guardarAgendamiento);

        // Modal de cancelación
        document.getElementById('btnCerrarModalCancelar')?.addEventListener('click', cerrarModalCancelar);
        document.getElementById('btnCerrarCancelar')?.addEventListener('click', cerrarModalCancelar);
        document.getElementById('btnConfirmarCancelar')?.addEventListener('click', confirmarCancelacion);

        // Modal de detalle
        document.getElementById('btnCerrarModalDetalle')?.addEventListener('click', cerrarModalDetalle);

        // Validación de horas - calcular hora fin automáticamente
        document.getElementById('horaInicio')?.addEventListener('change', function() {
            const horaInicio = this.value;
            if (horaInicio) {
                // Calcular 30 minutos después
                const [horas, minutos] = horaInicio.split(':');
                const fecha = new Date();
                fecha.setHours(parseInt(horas), parseInt(minutos));
                fecha.setMinutes(fecha.getMinutes() + 30);
                
                const horaFin = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
                document.getElementById('horaFin').value = horaFin;
            }
        });

        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                cerrarTodosModales();
            }
        });
    }

    // ==================== CARGA DE DATOS ====================
    async function cargarEstudiantes() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${APP_CONFIG.API.BASE_URL}/asignacionTutor.php?action=estudiantes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                estudiantes = data.data;
                llenarSelectEstudiantes();
            } else {
                mostrarError('Error al cargar estudiantes: ' + data.message);
            }
        } catch (error) {
            console.error('Error al cargar estudiantes:', error);
            mostrarError('Error de conexión al cargar estudiantes');
        }
    }

    async function cargarAgendamientos() {
        try {
            const token = localStorage.getItem('token');
            const anio = currentDate.getFullYear();
            const mes = currentDate.getMonth() + 1;
            const mesFormateado = `${anio}-${String(mes).padStart(2, '0')}`;
            
            console.log('📅 Cargando agendamientos para:', mesFormateado, '- Fecha actual:', currentDate);
            
            const response = await fetch(`${APP_CONFIG.API.BASE_URL}/asignacionTutor.php?action=agendamientos&mes=${mesFormateado}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                agendamientos = data.data;
                console.log('✅ Agendamientos cargados:', agendamientos.length);
                actualizarSelectoresFecha();
                renderizarVista();
            } else {
                mostrarError('Error al cargar agendamientos: ' + data.message);
            }
        } catch (error) {
            console.error('Error al cargar agendamientos:', error);
            mostrarError('Error de conexión al cargar agendamientos');
        }
    }

    // ==================== RENDERIZADO ====================
    function renderizarVista() {
        switch (currentView) {
            case 'mes':
                renderizarCalendarioMes();
                break;
            case 'semana':
                renderizarCalendarioSemana();
                break;
            case 'dia':
                renderizarCalendarioDia();
                break;
            case 'agenda':
                renderizarAgendaLista();
                break;
        }
        actualizarTituloMes();
    }

    function renderizarCalendarioMes() {
        const calendarioGrid = document.getElementById('calendarioGrid');
        if (!calendarioGrid) return;

        calendarioGrid.innerHTML = '';

        const primerDia = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const ultimoDia = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const diasMesAnterior = primerDia.getDay();
        const totalDias = ultimoDia.getDate();

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Días del mes anterior
        const ultimoDiaMesAnterior = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        for (let i = diasMesAnterior - 1; i >= 0; i--) {
            const celda = crearCeldaDia(ultimoDiaMesAnterior - i, true, null);
            calendarioGrid.appendChild(celda);
        }

        // Días del mes actual
        for (let dia = 1; dia <= totalDias; dia++) {
            const fecha = new Date(currentDate.getFullYear(), currentDate.getMonth(), dia);
            const agendamientosDia = obtenerAgendamientosDia(fecha);
            const esHoy = fecha.getTime() === hoy.getTime();
            const celda = crearCeldaDia(dia, false, agendamientosDia, esHoy, fecha);
            calendarioGrid.appendChild(celda);
        }

        // Días del mes siguiente
        const celdasRestantes = 42 - calendarioGrid.children.length;
        for (let i = 1; i <= celdasRestantes; i++) {
            const celda = crearCeldaDia(i, true, null);
            calendarioGrid.appendChild(celda);
        }
    }

    function crearCeldaDia(dia, otroMes, agendamientosDia, esHoy = false, fecha = null) {
        const celda = document.createElement('div');
        celda.className = 'calendario-celda';
        
        if (otroMes) {
            celda.classList.add('otro-mes');
        }
        
        if (esHoy) {
            celda.classList.add('hoy');
        }

        const diaNumero = document.createElement('div');
        diaNumero.className = 'dia-numero';
        diaNumero.textContent = dia;
        celda.appendChild(diaNumero);

        if (agendamientosDia && agendamientosDia.length > 0) {
            agendamientosDia.slice(0, 3).forEach(agendamiento => {
                const item = crearAgendamientoItem(agendamiento);
                celda.appendChild(item);
            });

            if (agendamientosDia.length > 3) {
                const mas = document.createElement('div');
                mas.className = 'agendamiento-item';
                mas.textContent = `+${agendamientosDia.length - 3} más`;
                celda.appendChild(mas);
            }
        }

        if (fecha && !otroMes) {
            celda.addEventListener('click', function(e) {
                if (!e.target.classList.contains('agendamiento-item')) {
                    abrirModalNuevoConFecha(fecha);
                }
            });
        }

        return celda;
    }

    function crearAgendamientoItem(agendamiento) {
        const item = document.createElement('div');
        item.className = `agendamiento-item ${agendamiento.tipoTutoria.toLowerCase()}`;
        
        if (agendamiento.estado === 'Cancelada' || agendamiento.estado === 'Cancelada_Automatica') {
            item.classList.add('cancelada');
        }

        const hora = document.createElement('div');
        hora.className = 'agendamiento-hora';
        hora.textContent = formatearHora(agendamiento.horaInicio);
        item.appendChild(hora);

        const estudiante = document.createElement('div');
        estudiante.className = 'agendamiento-estudiante';
        estudiante.textContent = `${agendamiento.estudianteNombres} ${agendamiento.estudianteApellidos}`;
        item.appendChild(estudiante);

        item.addEventListener('click', function(e) {
            e.stopPropagation();
            mostrarDetalleAgendamiento(agendamiento);
        });

        return item;
    }

    function renderizarAgendaLista() {
        const agendaLista = document.getElementById('agendaLista');
        if (!agendaLista) return;

        agendaLista.innerHTML = '';

        const agendamientosOrdenados = [...agendamientos].sort((a, b) => {
            const fechaA = new Date(`${a.fecha} ${a.horaInicio}`);
            const fechaB = new Date(`${b.fecha} ${b.horaInicio}`);
            return fechaA - fechaB;
        });

        if (agendamientosOrdenados.length === 0) {
            agendaLista.innerHTML = '<div class="agenda-mensaje-vacio">No hay agendamientos para mostrar</div>';
            return;
        }

        agendamientosOrdenados.forEach(agendamiento => {
            const item = crearAgendaItem(agendamiento);
            agendaLista.appendChild(item);
        });
    }

    function crearAgendaItem(agendamiento) {
        const item = document.createElement('div');
        item.className = 'agenda-item';
        
        if (agendamiento.estado === 'Cancelada' || agendamiento.estado === 'Cancelada_Automatica') {
            item.classList.add('cancelada');
        }

        const fecha = new Date(agendamiento.fecha);
        const dia = fecha.getDate();
        const mes = fecha.toLocaleDateString('es-ES', { month: 'short' });

        item.innerHTML = `
            <div class="agenda-fecha">
                <div class="agenda-fecha-dia">${dia}</div>
                <div class="agenda-fecha-mes">${mes}</div>
            </div>
            <div class="agenda-contenido">
                <div class="agenda-hora">${formatearHora(agendamiento.horaInicio)} - ${formatearHora(agendamiento.horaFin)}</div>
                <div class="agenda-estudiante">${agendamiento.estudianteNombres} ${agendamiento.estudianteApellidos}</div>
                <div class="agenda-meta">
                    <span class="agenda-tipo ${agendamiento.tipoTutoria.toLowerCase()}">${agendamiento.tipoTutoria}</span>
                    <span class="agenda-modalidad">${agendamiento.modalidad}</span>
                    <span class="agenda-estado ${agendamiento.estado.toLowerCase()}">${agendamiento.estado}</span>
                </div>
            </div>
        `;

        item.addEventListener('click', () => mostrarDetalleAgendamiento(agendamiento));

        return item;
    }

    function renderizarCalendarioSemana() {
        const calendarioSemana = document.getElementById('calendarioSemana');
        if (!calendarioSemana) return;
        
        // Obtener el primer día de la semana actual
        const primerDiaSemana = new Date(fechaActual);
        primerDiaSemana.setDate(fechaActual.getDate() - fechaActual.getDay());
        
        // Generar header con días de la semana
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const fechasSemana = [];
        
        let headerHTML = '<div class="semana-grid"><div class="semana-header"><div class="semana-hora-col">Hora</div>';
        
        for (let i = 0; i < 7; i++) {
            const fecha = new Date(primerDiaSemana);
            fecha.setDate(primerDiaSemana.getDate() + i);
            fechasSemana.push(fecha);
            
            const dia = diasSemana[i].substring(0, 3);
            const numero = fecha.getDate();
            const esHoy = fecha.toDateString() === new Date().toDateString();
            
            headerHTML += `<div class="semana-dia-header ${esHoy ? 'hoy' : ''}">
                <div class="semana-dia-nombre">${dia}</div>
                <div class="semana-dia-numero">${numero}</div>
            </div>`;
        }
        headerHTML += '</div>';
        
        // Generar filas de horas (8:00 - 18:00)
        const horaInicio = 8;
        const horaFin = 19;
        let bodyHTML = '';
        
        for (let hora = horaInicio; hora < horaFin; hora++) {
            bodyHTML += `<div class="semana-fila">
                <div class="semana-hora-label">${String(hora).padStart(2, '0')}:00</div>`;
            
            // Generar celdas para cada día
            for (let dia = 0; dia < 7; dia++) {
                const fecha = fechasSemana[dia];
                const fechaStr = fecha.toISOString().split('T')[0];
                
                // Filtrar agendamientos de esta fecha y hora
                const agendamientosDia = agendamientos.filter(a => {
                    if (a.fecha !== fechaStr) return false;
                    const horaAgendamiento = parseInt(a.horaInicio.split(':')[0]);
                    return horaAgendamiento === hora;
                });
                
                let celdaContent = '';
                agendamientosDia.forEach(ag => {
                    const duracion = calcularDuracionMinutos(ag.horaInicio, ag.horaFin);
                    const alturaPixeles = (duracion / 60) * 60; // 60px por hora
                    
                    celdaContent += `<div class="semana-evento ${ag.tipoTutoria.toLowerCase()}" 
                        style="height: ${alturaPixeles}px;" 
                        data-id="${ag.id}"
                        onclick="window.verDetalleAgendamiento(${ag.id})">
                        <div class="evento-hora">${formatearHora(ag.horaInicio)}</div>
                        <div class="evento-estudiante">${ag.estudianteNombres}</div>
                        <div class="evento-tipo">${ag.tipoTutoria}</div>
                    </div>`;
                });
                
                bodyHTML += `<div class="semana-celda" data-fecha="${fechaStr}" data-hora="${hora}" onclick="window.crearAgendamientoEnFecha('${fechaStr}', ${hora})">${celdaContent}</div>`;
            }
            
            bodyHTML += '</div>';
        }
        
        calendarioSemana.innerHTML = headerHTML + bodyHTML + '</div>';
    }
    
    window.crearAgendamientoEnFecha = function(fechaStr, hora) {
        const fecha = new Date(fechaStr);
        fecha.setHours(hora, 0, 0, 0);
        abrirModalNuevoConFecha(fecha);
    };
    
    function calcularDuracionMinutos(horaInicio, horaFin) {
        const [h1, m1] = horaInicio.split(':').map(Number);
        const [h2, m2] = horaFin.split(':').map(Number);
        return (h2 * 60 + m2) - (h1 * 60 + m1);
    }
    
    window.verDetalleAgendamiento = function(id) {
        const agendamiento = agendamientos.find(a => a.id === id);
        if (agendamiento) {
            mostrarDetalleAgendamiento(agendamiento);
        }
    };

    function renderizarCalendarioDia() {
        const calendarioDia = document.getElementById('calendarioDia');
        if (!calendarioDia) return;
        
        const fechaStr = fechaActual.toISOString().split('T')[0];
        const agendamientosDia = agendamientos.filter(a => a.fecha === fechaStr);
        
        let html = `<div class="dia-header">
            <h3>${fechaActual.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
        </div>
        <div class="dia-timeline">`;
        
        // Generar timeline de 8:00 a 18:00
        for (let hora = 8; hora < 19; hora++) {
            const horaStr = `${String(hora).padStart(2, '0')}:00`;
            const agendamientosHora = agendamientosDia.filter(a => {
                const horaAgendamiento = parseInt(a.horaInicio.split(':')[0]);
                return horaAgendamiento === hora;
            });
            
            html += `<div class="dia-hora-bloque">
                <div class="dia-hora-label">${horaStr}</div>
                <div class="dia-hora-contenido">`;
            
            if (agendamientosHora.length > 0) {
                agendamientosHora.forEach(ag => {
                    html += `<div class="dia-evento ${ag.tipoTutoria.toLowerCase()}" onclick="window.verDetalleAgendamiento(${ag.id})">
                        <div class="evento-hora">${formatearHora(ag.horaInicio)} - ${formatearHora(ag.horaFin)}</div>
                        <div class="evento-estudiante">${ag.estudianteNombres} ${ag.estudianteApellidos}</div>
                        <div class="evento-detalles">${ag.tipoTutoria} • ${ag.modalidad}</div>
                    </div>`;
                });
            }
            
            html += `</div></div>`;
        }
        
        html += '</div>';
        calendarioDia.innerHTML = html;
    }

    // ==================== MODALES ====================
    async function abrirModalNuevo() {
        document.getElementById('modalTitulo').textContent = 'Nuevo Agendamiento';
        document.getElementById('formAgendamiento').reset();
        document.getElementById('agendamientoId').value = '';
        
        // Establecer fecha mínima como hoy
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fechaAgendamiento').min = hoy;
        
        // Cargar semestre activo
        await cargarSemestreActivo();
        
        document.getElementById('modalAgendamiento').classList.add('active');
    }

    async function cargarSemestreActivo() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${APP_CONFIG.API.BASE_URL}/semestre.php?action=activo`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success && data.data) {
                document.getElementById('semestreActual').value = data.data.nombre || 'No hay semestre activo';
            } else {
                document.getElementById('semestreActual').value = 'No hay semestre activo';
            }
        } catch (error) {
            console.error('Error al cargar semestre:', error);
            document.getElementById('semestreActual').value = 'Error al cargar semestre';
        }
    }

    function abrirModalNuevoConFecha(fecha) {
        abrirModalNuevo();
        
        // Establecer fecha
        const fechaStr = fecha.toISOString().split('T')[0];
        document.getElementById('fechaAgendamiento').value = fechaStr;
        
        // Establecer hora si está disponible
        const horas = fecha.getHours();
        if (horas >= 8 && horas < 18) {
            const horaStr = `${String(horas).padStart(2, '0')}:00`;
            document.getElementById('horaInicio').value = horaStr;
            
            // Calcular hora fin automáticamente
            const horaFin = new Date(fecha);
            horaFin.setMinutes(horaFin.getMinutes() + 30);
            const horaFinStr = `${String(horaFin.getHours()).padStart(2, '0')}:${String(horaFin.getMinutes()).padStart(2, '0')}`;
            document.getElementById('horaFin').value = horaFinStr;
        }
    }

    async function abrirModalEditar(agendamiento) {
        document.getElementById('modalTitulo').textContent = 'Editar Agendamiento';
        document.getElementById('agendamientoId').value = agendamiento.id;
        document.getElementById('estudianteSelect').value = agendamiento.estudianteId;
        document.getElementById('fechaAgendamiento').value = agendamiento.fecha;
        document.getElementById('horaInicio').value = agendamiento.horaInicio;
        document.getElementById('horaFin').value = agendamiento.horaFin;
        document.getElementById('tipoTutoria').value = agendamiento.tipoTutoria;
        document.getElementById('modalidad').value = agendamiento.modalidad;
        document.getElementById('observaciones').value = agendamiento.observaciones || '';

        // Cargar semestre activo
        await cargarSemestreActivo();

        document.getElementById('modalAgendamiento').classList.add('active');
    }

    function cerrarModalAgendamiento() {
        document.getElementById('modalAgendamiento').classList.remove('active');
    }

    function abrirModalCancelar(agendamiento) {
        agendamientoSeleccionado = agendamiento;
        document.getElementById('motivoCancelacion').value = '';
        document.getElementById('modalCancelar').classList.add('active');
    }

    function cerrarModalCancelar() {
        document.getElementById('modalCancelar').classList.remove('active');
        agendamientoSeleccionado = null;
    }

    function mostrarDetalleAgendamiento(agendamiento) {
        const body = document.getElementById('detalleAgendamientoBody');
        const footer = document.getElementById('detalleAgendamientoFooter');
        
        const fecha = new Date(agendamiento.fecha);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        const estadoClass = agendamiento.estado.toLowerCase();
        const tipoClass = agendamiento.tipoTutoria.toLowerCase();

        body.innerHTML = `
            <div class="detalle-grupo">
                <div class="detalle-label">Estudiante</div>
                <div class="detalle-valor">${agendamiento.estudianteNombres} ${agendamiento.estudianteApellidos}</div>
                <div class="detalle-valor" style="color: #666; font-size: 14px;">Código: ${agendamiento.estudianteCodigo}</div>
            </div>
            <div class="detalle-grupo">
                <div class="detalle-label">Fecha y Hora</div>
                <div class="detalle-valor">${fechaFormateada}</div>
                <div class="detalle-valor">${formatearHora(agendamiento.horaInicio)} - ${formatearHora(agendamiento.horaFin)}</div>
            </div>
            <div class="detalle-grupo">
                <div class="detalle-label">Tipo y Modalidad</div>
                <div>
                    <span class="detalle-badge agenda-tipo ${tipoClass}">${agendamiento.tipoTutoria}</span>
                    <span class="detalle-badge agenda-modalidad">${agendamiento.modalidad}</span>
                </div>
            </div>
            <div class="detalle-grupo">
                <div class="detalle-label">Estado</div>
                <div>
                    <span class="detalle-badge agenda-estado ${estadoClass}">${agendamiento.estado}</span>
                </div>
            </div>
            ${agendamiento.observaciones ? `
                <div class="detalle-grupo">
                    <div class="detalle-label">Observaciones</div>
                    <div class="detalle-valor">${agendamiento.observaciones}</div>
                </div>
            ` : ''}
            ${agendamiento.motivoCancelacion ? `
                <div class="detalle-grupo">
                    <div class="detalle-label">Motivo de Cancelación</div>
                    <div class="detalle-valor">${agendamiento.motivoCancelacion}</div>
                </div>
            ` : ''}
        `;

        // Mostrar botones solo si el agendamiento está programado y es futuro
        const fechaAgendamiento = new Date(agendamiento.fecha);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (agendamiento.estado === 'Programada' && fechaAgendamiento >= hoy) {
            footer.innerHTML = `
                <button type="button" class="btn btn-secondary" id="btnEditarAgendamiento">Modificar</button>
                <button type="button" class="btn btn-danger" id="btnCancelarAgendamiento">Cancelar</button>
            `;

            document.getElementById('btnEditarAgendamiento').addEventListener('click', () => {
                cerrarModalDetalle();
                abrirModalEditar(agendamiento);
            });

            document.getElementById('btnCancelarAgendamiento').addEventListener('click', () => {
                cerrarModalDetalle();
                abrirModalCancelar(agendamiento);
            });
        } else {
            footer.innerHTML = '';
        }

        document.getElementById('modalDetalle').classList.add('active');
    }

    function cerrarModalDetalle() {
        document.getElementById('modalDetalle').classList.remove('active');
    }

    function cerrarTodosModales() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // ==================== ACCIONES ====================
    async function guardarAgendamiento(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = {
            estudianteId: formData.get('estudianteId'),
            fecha: formData.get('fecha'),
            horaInicio: formData.get('horaInicio'),
            horaFin: formData.get('horaFin'),
            tipoTutoria: formData.get('tipoTutoria'),
            modalidad: formData.get('modalidad'),
            observaciones: formData.get('observaciones')
        };

        const agendamientoId = document.getElementById('agendamientoId').value;
        
        if (agendamientoId) {
            data.id = agendamientoId;
        }

        // Validaciones
        if (!validarFormulario(data)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const url = agendamientoId 
                ? `${APP_CONFIG.API.BASE_URL}/asignacionTutor.php?action=actualizar`
                : `${APP_CONFIG.API.BASE_URL}/asignacionTutor.php?action=crear`;
            
            const method = agendamientoId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                mostrarExito(result.message);
                cerrarModalAgendamiento();
                cargarAgendamientos();
            } else {
                mostrarError(result.message);
            }
        } catch (error) {
            console.error('Error al guardar agendamiento:', error);
            mostrarError('Error de conexión al guardar agendamiento');
        }
    }

    async function confirmarCancelacion() {
        const motivo = document.getElementById('motivoCancelacion').value.trim();
        
        if (!motivo) {
            mostrarError('Debe ingresar un motivo de cancelación');
            return;
        }

        if (!agendamientoSeleccionado) {
            mostrarError('No hay agendamiento seleccionado');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${APP_CONFIG.API.BASE_URL}/asignacionTutor.php?action=cancelar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: agendamientoSeleccionado.id,
                    motivo: motivo
                })
            });

            const result = await response.json();

            if (result.success) {
                mostrarExito(result.message);
                cerrarModalCancelar();
                cargarAgendamientos();
            } else {
                mostrarError(result.message);
            }
        } catch (error) {
            console.error('Error al cancelar agendamiento:', error);
            mostrarError('Error de conexión al cancelar agendamiento');
        }
    }

    // ==================== VALIDACIONES ====================
    function validarFormulario(data) {
        // Validar que todos los campos requeridos estén presentes
        if (!data.estudianteId || !data.fecha || !data.horaInicio || !data.horaFin || !data.tipoTutoria || !data.modalidad) {
            mostrarError('Todos los campos marcados con * son obligatorios');
            return false;
        }

        // Validar que la fecha sea futura
        const fechaAgendamiento = new Date(data.fecha);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaAgendamiento < hoy) {
            mostrarError('La fecha debe ser igual o posterior a hoy');
            return false;
        }

        // Validar que hora fin sea mayor que hora inicio
        if (data.horaFin <= data.horaInicio) {
            mostrarError('La hora de fin debe ser posterior a la hora de inicio');
            return false;
        }

        return true;
    }

    function validarHoras() {
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFin = document.getElementById('horaFin').value;
        
        if (horaInicio && horaFin && horaFin <= horaInicio) {
            mostrarError('La hora de fin debe ser posterior a la hora de inicio');
            document.getElementById('horaFin').value = '';
        }
    }

    // ==================== NAVEGACIÓN ====================
    function cambiarVista(vista) {
        currentView = vista;
        
        // Actualizar tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-vista="${vista}"]`).classList.add('active');

        // Actualizar vistas
        document.querySelectorAll('.vista-contenedor').forEach(contenedor => {
            contenedor.classList.remove('active');
        });
        
        const vistaId = {
            'mes': 'vistaMes',
            'semana': 'vistaSemana',
            'dia': 'vistaDia',
            'agenda': 'vistaAgenda'
        };
        
        document.getElementById(vistaId[vista])?.classList.add('active');

        renderizarVista();
    }

    // ==================== NAVEGACIÓN ====================
    function navegarAnterior() {
        switch (currentView) {
            case 'mes':
            case 'agenda':
                currentDate.setMonth(currentDate.getMonth() - 1);
                fechaActual.setMonth(fechaActual.getMonth() - 1);
                break;
            case 'semana':
                currentDate.setDate(currentDate.getDate() - 7);
                fechaActual.setDate(fechaActual.getDate() - 7);
                break;
            case 'dia':
                currentDate.setDate(currentDate.getDate() - 1);
                fechaActual.setDate(fechaActual.getDate() - 1);
                break;
        }
        actualizarSelectoresFecha();
        if (currentView === 'mes' || currentView === 'agenda') {
            cargarAgendamientos();
        } else {
            renderizarVista();
        }
    }

    function navegarSiguiente() {
        switch (currentView) {
            case 'mes':
            case 'agenda':
                currentDate.setMonth(currentDate.getMonth() + 1);
                fechaActual.setMonth(fechaActual.getMonth() + 1);
                break;
            case 'semana':
                currentDate.setDate(currentDate.getDate() + 7);
                fechaActual.setDate(fechaActual.getDate() + 7);
                break;
            case 'dia':
                currentDate.setDate(currentDate.getDate() + 1);
                fechaActual.setDate(fechaActual.getDate() + 1);
                break;
        }
        actualizarSelectoresFecha();
        if (currentView === 'mes' || currentView === 'agenda') {
            cargarAgendamientos();
        } else {
            renderizarVista();
        }
    }

    function irAHoy() {
        currentDate = new Date();
        fechaActual = new Date();
        actualizarSelectoresFecha();
        cargarAgendamientos();
    }

    function cambiarMes() {
        const selectorMes = document.getElementById('selectorMes');
        if (!selectorMes) return;

        const nuevoMes = parseInt(selectorMes.value);
        console.log('📆 Cambiando a mes:', nuevoMes, 'Fecha antes:', currentDate);
        
        currentDate.setMonth(nuevoMes);
        fechaActual.setMonth(nuevoMes);
        
        console.log('📆 Fecha después:', currentDate);
        cargarAgendamientos();
    }

    function cambiarAnio() {
        const selectorAnio = document.getElementById('selectorAnio');
        if (!selectorAnio) return;

        const nuevoAnio = parseInt(selectorAnio.value);
        console.log('📆 Cambiando a año:', nuevoAnio, 'Fecha antes:', currentDate);
        
        currentDate.setFullYear(nuevoAnio);
        fechaActual.setFullYear(nuevoAnio);
        
        console.log('📆 Fecha después:', currentDate);
        cargarAgendamientos();
    }

    // ==================== UTILIDADES ====================
    function obtenerAgendamientosDia(fecha) {
        const fechaStr = fecha.toISOString().split('T')[0];
        return agendamientos.filter(a => a.fecha === fechaStr);
    }

    function llenarSelectEstudiantes() {
        const select = document.getElementById('estudianteSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccione un estudiante</option>';
        
        estudiantes.forEach(estudiante => {
            const option = document.createElement('option');
            option.value = estudiante.id;
            option.textContent = `${estudiante.apellidos}, ${estudiante.nombres} (${estudiante.codigo})`;
            select.appendChild(option);
        });
    }

    function actualizarTituloMes() {
        const titulo = document.getElementById('tituloMes');
        if (!titulo) return;

        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        titulo.textContent = `${meses[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    function formatearHora(hora) {
        // Formato HH:MM
        if (!hora) return '';
        return hora.substring(0, 5);
    }

    function mostrarError(mensaje) {
        alert('Error: ' + mensaje);
    }

    function mostrarExito(mensaje) {
        alert(mensaje);
    }

})();
