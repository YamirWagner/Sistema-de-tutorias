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

            renderTabla(estudiantes);
        } catch (error) {
            console.error('Error cargando datos de Mis estudiantes:', error);
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
            tdA.innerHTML = `<input type="checkbox" disabled ${sesionAcademica ? 'checked' : ''}><span class="session-date">${formatDateShort(sesionAcademica)}</span>`;

            const tdP = document.createElement('td');
            tdP.className = 'center';
            tdP.innerHTML = `<input type="checkbox" disabled ${sesionPersonal ? 'checked' : ''}><span class="session-date">${formatDateShort(sesionPersonal)}</span>`;

            const tdPr = document.createElement('td');
            tdPr.className = 'center';
            tdPr.innerHTML = `<input type="checkbox" disabled ${sesionProfesional ? 'checked' : ''}><span class="session-date">${formatDateShort(sesionProfesional)}</span>`;

            const tdModal = document.createElement('td');
            tdModal.textContent = modalidad;

            const tdAction = document.createElement('td');
            tdAction.className = 'center';
            const allThree = !!est.completoTresSesiones;
            const btn = document.createElement('button');
            btn.textContent = 'Generar constancia';
            btn.className = 'btn-primary';
            btn.disabled = !allThree;
            btn.dataset.estudianteId = sid;
            btn.addEventListener('click', () => generarConstancia(sid));
            tdAction.appendChild(btn);

            row.appendChild(tdEst);
            row.appendChild(tdA);
            row.appendChild(tdP);
            row.appendChild(tdPr);
            row.appendChild(tdModal);
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

    // ================== REPORTES Y CONSTANCIAS ==================
    async function generarReporteLista() {
        try {
            const data = await apiGet('/misEstudiantes?action=reporte');

            if (!data.success || !data.data || data.data.total === 0) {
                alert('No hay estudiantes que hayan completado las 3 sesiones');
                return;
            }

            const reporte = data.data;
            const content = reporte.estudiantes.map(p => `${p.nombres} ${p.apellidos} (${p.codigo})`).join('\n');

            const w = window.open('', '_blank');
            if (w) {
                w.document.write('<html><head><title>Reporte de Estudiantes</title></head><body>');
                w.document.write(`<h2>Estudiantes que completaron las 3 sesiones - ${reporte.semestre}</h2>`);
                w.document.write(`<p>Total: <strong>${reporte.total}</strong> estudiantes</p>`);
                w.document.write('<pre>' + content + '</pre>');
                w.document.write('</body></html>');
            }
        } catch (error) {
            console.error('Error generando reporte:', error);
            alert('Error al generar el reporte');
        }
    }

    async function generarConstancia(estudianteId) {
        try {
            const data = await apiPost('/misEstudiantes?action=constancia', {
                estudiante_id: estudianteId
            });

            if (!data.success) {
                alert('Error al generar constancia: ' + data.message);
                return;
            }

            const constancia = data.data;
            const est = constancia.estudiante;

            const w = window.open('', '_blank');
            if (w) {
                w.document.write(`<html><head><title>Constancia de Tutoría</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                        h1 { text-align: center; color: #7b1f1f; }
                        .info { margin: 20px 0; line-height: 1.8; }
                        .firma { margin-top: 60px; text-align: center; }
                    </style>
                    </head><body>`);
                w.document.write('<h1>CONSTANCIA DE TUTORÍA</h1>');
                w.document.write(`<div class="info">
                    <p><strong>Semestre:</strong> ${constancia.semestre}</p>
                    <p><strong>Estudiante:</strong> ${est.nombres} ${est.apellidos}</p>
                    <p><strong>Código:</strong> ${est.codigo}</p>
                    <p><strong>Tutor:</strong> ${est.tutorNombres} ${est.tutorApellidos}</p>
                    <p>Se hace constar que el estudiante mencionado ha completado satisfactoriamente las tres (3) sesiones de tutoría obligatorias:</p>
                    <ul>
                        <li>Sesión Académica: ${constancia.sesiones.academica > 0 ? '✓' : '✗'}</li>
                        <li>Sesión Personal: ${constancia.sesiones.personal > 0 ? '✓' : '✗'}</li>
                        <li>Sesión Profesional: ${constancia.sesiones.profesional > 0 ? '✓' : '✗'}</li>
                    </ul>
                    <p><strong>Fecha de expedición:</strong> ${new Date(constancia.fechaGeneracion).toLocaleDateString('es-PE')}</p>
                </div>
                <div class="firma">
                    <p>_________________________</p>
                    <p>${est.tutorNombres} ${est.tutorApellidos}<br>Tutor Académico</p>
                </div>
                </body></html>`);
            }
        } catch (error) {
            console.error('Error generando constancia:', error);
            alert('Error al generar la constancia');
        }
    }

})();
