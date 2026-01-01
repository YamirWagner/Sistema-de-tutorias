// mis_estudiantes.js - Módulo "Mis estudiantes" para el tutor
(function() {
    'use strict';

    // ================== CARGA DEL COMPONENTE ==================
    window.loadMisEstudiantesContent = async function() {
        try {
            const basePath = window.APP_BASE_PATH || '';
            const componentPath = `${basePath}/frontend/components/tutor/mis_estudiantes.html`;
            const res = await fetch(componentPath);
            if (!res.ok) throw new Error('No se pudo cargar el componente Mis estudiantes');

            const html = await res.text();
            const container = document.getElementById('dashboardContent');
            if (!container) return;

            container.innerHTML = html;

            await cargarDatosYRender();
            agregarEventListeners();
        } catch (error) {
            console.error('Error cargando Mis estudiantes:', error);
            const container = document.getElementById('dashboardContent');
            if (container) {
                container.innerHTML = '<div style="padding: 20px; color: #dc3545;">Error al cargar módulo Mis estudiantes</div>';
            }
        }
    };

    // ================== ESTADO ==================
    let estudiantes = [];
    let sessionsMap = {};
    let constanciasMap = {};

    // ================== CARGA DE DATOS ==================
    async function cargarDatosYRender() {
        try {
            const data = await apiGet('/misEstudiantes?action=lista');

            if (data.success) {
                estudiantes = data.data || [];
            } else {
                estudiantes = [];
                console.error('Error al cargar estudiantes:', data.message);
            }

            // Cargar constancias
            await cargarConstancias();

            // intentar poblar sessionsMap si existe un array global `agendamientos`
            try {
                if (typeof agendamientos !== 'undefined' && Array.isArray(agendamientos)) {
                    sessionsMap = mapSessionsByStudent();
                } else if (window.sessionsMap && typeof window.sessionsMap === 'object') {
                    sessionsMap = window.sessionsMap;
                } else {
                    sessionsMap = {};
                }
            } catch (e) {
                sessionsMap = {};
            }

            renderTabla(estudiantes);
        } catch (error) {
            console.error('Error cargando datos de Mis estudiantes:', error);
        }
    }

    // ================== CARGAR CONSTANCIAS ==================
    async function cargarConstancias() {
        try {
            const data = await apiGet('/listar-constancias');
            if (data.success && data.constancias) {
                constanciasMap = {};
                data.constancias.forEach(c => {
                    constanciasMap[c.estudiante.id] = c;
                });
            }
        } catch (error) {
            console.error('Error cargando constancias:', error);
            constanciasMap = {};
        }
    }

    // ================== UTILIDADES ==================
    function formatDateShort(isoDate) {
        if (!isoDate) return 'DD/MM/YY';
        try {
            const d = new Date(isoDate + 'T00:00:00');
            const day = String(d.getDate()).padStart(2, '0');
            const mon = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(-2);
            return `${day}/${mon}/${year}`;
        } catch (e) {
            return 'DD/MM/YY';
        }
    }

    async function descargarArchivo(url, nombreArchivo) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('No se pudo descargar el archivo');

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = nombreArchivo || 'constancia.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();

            setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
            return true;
        } catch (e) {
            console.warn('Descarga directa falló, usando fallback:', e);
            try {
                window.open(url, '_blank', 'noopener');
            } catch (_) {
                // sin-op
            }
            return false;
        }
    }

    // ================== RENDER TABLA ==================
    function renderTabla(estudiantesList) {
        const tbody = document.getElementById('studentsTbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        estudiantesList.forEach(est => {
            const sid = est.id;
            const nombre = `${est.nombres || ''} ${est.apellidos || ''}`.trim();
            const codigo = est.codigo || '';

            const sesionAcademica = est.ultimaAcademica || null;
            const sesionPersonal = est.ultimaPersonal || null;
            const sesionProfesional = est.ultimaProfesional || null;
            const modalidad = est.modalidadPreferida || 'Presencial';

            const row = document.createElement('tr');

            const tdEst = document.createElement('td');
            tdEst.innerHTML = `<strong>${nombre}</strong><br><small>${codigo}</small>`;

            const tdA = document.createElement('td');
            tdA.className = 'center';
            const modalidadA = est.modalidadAcademica || 'Presencial';
            const badgeA = sesionAcademica ? `<div style="font-size: 9px; background: ${modalidadA === 'Virtual' ? '#17a2b8' : '#28a745'}; color: white; padding: 1px 5px; border-radius: 6px; margin-top: 3px; display: inline-block;">${modalidadA}</div>` : '';
            tdA.innerHTML = `<input type="checkbox" disabled ${sesionAcademica ? 'checked' : ''}><span class="session-date">${formatDateShort(sesionAcademica)}</span>${badgeA}`;

            const tdP = document.createElement('td');
            tdP.className = 'center';
            const modalidadP = est.modalidadPersonal || 'Presencial';
            const badgeP = sesionPersonal ? `<div style="font-size: 9px; background: ${modalidadP === 'Virtual' ? '#17a2b8' : '#28a745'}; color: white; padding: 1px 5px; border-radius: 6px; margin-top: 3px; display: inline-block;">${modalidadP}</div>` : '';
            tdP.innerHTML = `<input type="checkbox" disabled ${sesionPersonal ? 'checked' : ''}><span class="session-date">${formatDateShort(sesionPersonal)}</span>${badgeP}`;

            const tdPr = document.createElement('td');
            tdPr.className = 'center';
            const modalidadPr = est.modalidadProfesional || 'Presencial';
            const badgePr = sesionProfesional ? `<div style="font-size: 9px; background: ${modalidadPr === 'Virtual' ? '#17a2b8' : '#28a745'}; color: white; padding: 1px 5px; border-radius: 6px; margin-top: 3px; display: inline-block;">${modalidadPr}</div>` : '';
            tdPr.innerHTML = `<input type="checkbox" disabled ${sesionProfesional ? 'checked' : ''}><span class="session-date">${formatDateShort(sesionProfesional)}</span>${badgePr}`;

            // Columna Constancia
            const tdConstancia = document.createElement('td');
            tdConstancia.className = 'center';
            const constancia = constanciasMap[sid];
            const allThree = !!est.completoTresSesiones;
            
            if (constancia && constancia.rutaPDF) {
                // Ya existe constancia - mostrar icono PDF
                const pdfLink = document.createElement('a');
                const basePath = (window.APP_BASE_PATH || '').replace(/\/+$/, '');
                const pdfUrl = `${basePath}/backend/${constancia.rutaPDF}`;
                pdfLink.href = pdfUrl;
                pdfLink.title = 'Descargar constancia';
                pdfLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="#dc3545" viewBox="0 0 16 16">
                    <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                    <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>
                </svg>`;

                // Descargar automáticamente al hacer click
                pdfLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const nombre = `constancia_${codigo || sid}.pdf`;
                    descargarArchivo(pdfUrl, nombre);
                });
                tdConstancia.appendChild(pdfLink);
                
                // Agregar indicador de firmado
                if (constancia.firmado) {
                    const firmadoSpan = document.createElement('span');
                    firmadoSpan.style.marginLeft = '5px';
                    firmadoSpan.style.color = '#28a745';
                    firmadoSpan.style.fontSize = '12px';
                    firmadoSpan.textContent = '✓ Firmado';
                    tdConstancia.appendChild(firmadoSpan);
                }
            } else if (allThree) {
                // Puede generar constancia
                const btnGen = document.createElement('button');
                btnGen.textContent = 'Generar';
                btnGen.className = 'btn-primary';
                btnGen.style.fontSize = '12px';
                btnGen.style.padding = '4px 8px';
                btnGen.dataset.estudianteId = sid;
                btnGen.addEventListener('click', async () => {
                    if (typeof window.generarConstanciaPDFTutor === 'function') {
                        await window.generarConstanciaPDFTutor(sid);
                        // Recargar datos después de generar
                        await cargarDatosYRender();
                    } else {
                        alert('Función de generar constancia no disponible');
                    }
                });
                tdConstancia.appendChild(btnGen);
            } else {
                tdConstancia.innerHTML = '<span style="color: #999; font-size: 12px;">Incompleto</span>';
            }

            const tdAction = document.createElement('td');
            tdAction.className = 'center';
            
            // Botón de firmar si existe constancia y no está firmada
            if (constancia && !constancia.firmado) {
                const btnFirmar = document.createElement('button');
                btnFirmar.textContent = 'Firmar';
                btnFirmar.className = 'btn-success';
                btnFirmar.style.fontSize = '12px';
                btnFirmar.style.padding = '4px 8px';
                btnFirmar.addEventListener('click', async () => {
                    if (confirm('¿Desea firmar esta constancia?')) {
                        await firmarConstancia(constancia.id);
                        await cargarDatosYRender();
                    }
                });
                tdAction.appendChild(btnFirmar);
            }

            row.appendChild(tdEst);
            row.appendChild(tdA);
            row.appendChild(tdP);
            row.appendChild(tdPr);
            row.appendChild(tdConstancia);
            row.appendChild(tdAction);

            tbody.appendChild(row);
        });
    }

    // ================== EVENTOS ==================
    function agregarEventListeners() {
        const search = document.getElementById('filterSearch');
        const tipo = document.getElementById('filterTipo');
        const modalidad = document.getElementById('filterModalidad');
        const btnReporte = document.getElementById('btnGenerarReporte');

        if (search) search.addEventListener('input', filtrar);
        if (tipo) tipo.addEventListener('change', filtrar);
        if (modalidad) modalidad.addEventListener('change', filtrar);
        if (btnReporte) btnReporte.addEventListener('click', generarReporteLista);
    }

    function filtrar() {
        const q = (document.getElementById('filterSearch').value || '').toLowerCase();
        const tipo = document.getElementById('filterTipo').value;
        const modalidad = document.getElementById('filterModalidad').value;

        let lista = estudiantes.slice();

        if (q) {
            lista = lista.filter(e => (`${e.nombres || ''} ${e.apellidos || ''} ${e.codigo || ''}`).toLowerCase().includes(q));
        }

        if (tipo) {
            lista = lista.filter(e => {
                if (tipo === 'Academica') return !!e.ultimaAcademica;
                if (tipo === 'Personal') return !!e.ultimaPersonal;
                if (tipo === 'Profesional') return !!e.ultimaProfesional;
                return true;
            });
        }

        if (modalidad) {
            lista = lista.filter(e => (e.modalidadPreferida || 'Presencial') === modalidad);
        }

        renderTabla(lista);
    }

    // ================== FIRMAR CONSTANCIA ==================
    async function firmarConstancia(constanciaId) {
        try {
            const response = await apiPost('/firmar-constancia', { constanciaId });
            if (response.success) {
                alert('Constancia firmada exitosamente');
            } else {
                alert('Error al firmar: ' + (response.message || response.error));
            }
        } catch (error) {
            console.error('Error firmando constancia:', error);
            alert('Error al firmar la constancia');
        }
    }

    // ================== REPORTES ==================
    
    async function generarReporteLista() {
        try {
            // Verificar que existe la función del modal
            if (typeof window.generarConstanciaPDFTutor !== 'function') {
                alert('Error: Modal de PDF no disponible');
                return;
            }
            
            // Abrir modal con el reporte (sin estudianteId para indicar que es reporte general)
            await window.generarConstanciaPDFTutor(null, true);
            
        } catch (error) {
            console.error('Error generando reporte:', error);
            alert('Error al generar el reporte');
        }
    }
})();
