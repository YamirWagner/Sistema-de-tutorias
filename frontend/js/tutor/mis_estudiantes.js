// mis_estudiantes.js - Módulo "Mis estudiantes" para el tutor
(function(){
    'use strict';

    window.loadMisEstudiantesContent = async function() {
        try {
            const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
            const componentPath = `${basePath}/frontend/components/tutor/mis_estudiantes.html`;
            const res = await fetch(componentPath);
            if (!res.ok) throw new Error('No se pudo cargar el componente');
            const html = await res.text();
            const container = document.getElementById('dashboardContent');
            container.innerHTML = html;

            // Inicializar
            await cargarDatosYRender();
            agregarEventListeners();
        } catch (err) {
            console.error('Error cargando Mis estudiantes:', err);
            const container = document.getElementById('dashboardContent');
            if (container) container.innerHTML = '<div class="p-4 text-red-600">Error al cargar módulo Mis estudiantes</div>';
        }
    };

    let estudiantes = [];
    let agendamientos = [];

    async function cargarDatosYRender(){
        try {
            const token = localStorage.getItem('token');
            const baseApi = APP_CONFIG.API.BASE_URL;

            // Obtener estudiantes asignados
            const resEst = await fetch(`${baseApi}/asignacionTutor.php?action=estudiantes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataEst = await resEst.json();
            if (dataEst.success) estudiantes = dataEst.data || [];
            else estudiantes = [];

            // Obtener todos los agendamientos (sin filtrar por mes) para poder revisar sesiones realizadas
            const resAgen = await fetch(`${baseApi}/asignacionTutor.php?action=agendamientos&mes=`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataAgen = await resAgen.json();
            if (dataAgen.success) agendamientos = dataAgen.data || [];
            else agendamientos = [];

            renderTabla(estudiantes, agendamientos);
        } catch (e) {
            console.error('Error cargando datos:', e);
        }
    }

    function mapSessionsByStudent() {
        const map = {};
        agendamientos.forEach(a => {
            const idEst = parseInt(a.idEstudiante || a.estudianteId || 0);
            if (!idEst) return;
            if (!map[idEst]) map[idEst] = {
                Academica: {date: null, modalidad: null},
                Personal: {date: null, modalidad: null},
                Profesional: {date: null, modalidad: null},
                modalidades: new Set(),
                count: 0,
                lastDateTime: null,
                lastModalidad: null
            };

            const estado = String(a.estado || '').toLowerCase();
            // considerar solo sesiones registradas como realizadas
            if (estado === 'realizada' || estado === 'realizado' || estado === 'realizada') {
                // construir fechaHora para comparaciones: preferir fecha + horaInicio
                let fechaHora = null;
                if (a.fecha) {
                    fechaHora = a.fecha;
                    if (a.horaInicio) fechaHora = `${a.fecha} ${a.horaInicio}`;
                }

                // incrementar contador
                map[idEst].count += 1;

                // actualizar lastDateTime / lastModalidad
                if (fechaHora) {
                    const prev = map[idEst].lastDateTime;
                    if (!prev || (new Date(fechaHora) > new Date(prev))) {
                        map[idEst].lastDateTime = fechaHora;
                        map[idEst].lastModalidad = a.modalidad || null;
                    }
                } else {
                    // si no hay fecha, aún podemos usar modalidad
                    if (!map[idEst].lastModalidad && a.modalidad) map[idEst].lastModalidad = a.modalidad;
                }

                const tipo = String(a.tipoTutoria || a.tipo || '').toLowerCase();
                let key = null;
                if (tipo.includes('acad')) key = 'Academica';
                else if (tipo.includes('personal')) key = 'Personal';
                else if (tipo.includes('profesional')) key = 'Profesional';

                if (key) {
                    // si ya existe una fecha para el area, comparar y mantener la más reciente
                    const area = map[idEst][key];
                    const areaFecha = area.date;
                    if (fechaHora) {
                        if (!areaFecha || (new Date(fechaHora) > new Date(areaFecha))) {
                            area.date = fechaHora;
                            area.modalidad = a.modalidad || null;
                        }
                    } else {
                        if (!area.date) {
                            area.modalidad = a.modalidad || null;
                        }
                    }
                }
            }

            if (a.modalidad) map[idEst].modalidades.add(a.modalidad);
        });
        return map;
    }

    function formatDateShort(isoDate){
        if (!isoDate) return '';
        try {
            const d = new Date(isoDate);
            if (isNaN(d)) return '';
            const day = String(d.getDate()).padStart(2,'0');
            const mon = String(d.getMonth()+1).padStart(2,'0');
            const year = String(d.getFullYear()).slice(-2);
            return `${day}/${mon}/${year}`;
        } catch(e){ return ''; }
    }

    function formatDateTime(isoDateTime){
        if (!isoDateTime) return '';
        try {
            const d = new Date(isoDateTime);
            if (isNaN(d)) return '';
            const day = String(d.getDate()).padStart(2,'0');
            const mon = String(d.getMonth()+1).padStart(2,'0');
            const year = String(d.getFullYear()).slice(-2);
            const hh = String(d.getHours()).padStart(2,'0');
            const mm = String(d.getMinutes()).padStart(2,'0');
            return `${day}/${mon}/${year} ${hh}:${mm}`;
        } catch(e){ return ''; }
    }

    function shortModal(mod) {
        if (!mod) return '';
        const m = String(mod).toLowerCase();
        if (m.includes('pres')) return 'Pres';
        if (m.includes('virt')) return 'Virt';
        return mod.substring(0,3).toUpperCase();
    }

    function renderTabla(estudiantesList, agendamientosList){
        const tbody = document.getElementById('studentsTbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const sessionsMap = mapSessionsByStudent();

        estudiantesList.forEach(est => {
            const sid = est.id;
            const nombre = `${est.nombres || ''} ${est.apellidos || ''}`.trim();
            const codigo = est.codigo || '';
            const map = sessionsMap[sid] || { Academica:{date:null,modalidad:null}, Personal:{date:null,modalidad:null}, Profesional:{date:null,modalidad:null}, modalidades:new Set(), count:0, lastDateTime:null, lastModalidad:null };

            const modal = map.lastModalidad || [...map.modalidades][0] || '';
            const row = document.createElement('tr');

            const tdEst = document.createElement('td');
            tdEst.innerHTML = `<strong>${nombre}</strong><br><small>${codigo}</small>`;

            const tdA = document.createElement('td');
            tdA.className = 'center';
            const aDate = map.Academica.date || null;
            const aMod = map.Academica.modalidad || '';
            tdA.innerHTML = `<div><span class="session-date">${aDate ? formatDateShort(aDate) : '--/--/--'} - ${aMod ? shortModal(aMod) : 'Mod'}</span></div>`;

            const tdP = document.createElement('td');
            tdP.className = 'center';
            const pDate = map.Personal.date || null;
            const pMod = map.Personal.modalidad || '';
            tdP.innerHTML = `<div><span class="session-date">${pDate ? formatDateShort(pDate) : '--/--/--'} - ${pMod ? shortModal(pMod) : 'Mod'}</span></div>`;

            const tdPr = document.createElement('td');
            tdPr.className = 'center';
            const prDate = map.Profesional.date || null;
            const prMod = map.Profesional.modalidad || '';
            tdPr.innerHTML = `<div><span class="session-date">${prDate ? formatDateShort(prDate) : '--/--/--'} - ${prMod ? shortModal(prMod) : 'Mod'}</span></div>`;

            const tdCount = document.createElement('td');
            tdCount.className = 'center';
            const count = map.count || 0;
            tdCount.textContent = `${count}/3`;

            const tdAction = document.createElement('td');
            tdAction.className = 'center';
            const btn = document.createElement('button');
            btn.textContent = 'Generar constancia';
            btn.dataset.estudianteId = sid;
            if (count >= 3) {
                btn.className = 'btn-generate-enabled';
                btn.disabled = false;
                btn.addEventListener('click', () => generarConstancia(sid));
            } else {
                btn.className = 'btn-generate-disabled';
                btn.disabled = true;
            }
            tdAction.appendChild(btn);

            row.appendChild(tdEst);
            row.appendChild(tdA);
            row.appendChild(tdP);
            row.appendChild(tdPr);
            row.appendChild(tdCount);
            row.appendChild(tdAction);

            tbody.appendChild(row);
        });
    }

    function agregarEventListeners(){
        const search = document.getElementById('filterSearch');
        const tipo = document.getElementById('filterTipo');
        const modalidad = document.getElementById('filterModalidad');
        const btnReporte = document.getElementById('btnGenerarReporte');

        if (search) search.addEventListener('input', filtrar);
        if (tipo) tipo.addEventListener('change', filtrar);
        if (modalidad) modalidad.addEventListener('change', filtrar);
        if (btnReporte) btnReporte.addEventListener('click', generarReporteLista);
    }

    function filtrar(){
        const q = document.getElementById('filterSearch').value.toLowerCase();
        const tipo = document.getElementById('filterTipo').value;
        const modalidad = document.getElementById('filterModalidad').value;

        // Filtrar estudiantes localmente
        let lista = estudiantes.slice();

        if (q) {
            lista = lista.filter(e => ((e.nombres||'') + ' ' + (e.apellidos||'') + ' ' + (e.codigo||'')).toLowerCase().includes(q));
        }

        // Si se solicita filtrar por tipo o modalidad, revisar agendamientos
        if (tipo || modalidad) {
            const sessionsMap = mapSessionsByStudent();
            lista = lista.filter(e => {
                const m = sessionsMap[e.id] || { modalidades: new Set() };
                if (tipo) {
                    const key = tipo === 'Academica' ? 'Academica' : tipo;
                    if (!m[key] || !m[key].date) return false;
                }
                if (modalidad) {
                    if (![...m.modalidades].includes(modalidad)) return false;
                }
                return true;
            });
        }

        renderTabla(lista, agendamientos);
    }

    function generarReporteLista(){
        // Generar reporte via backend (TCPDF) y previsualizar
        (async ()=>{
            try {
                const token = localStorage.getItem('token');
                const url = `${APP_CONFIG.API.BASE_URL}/tutorReports.php?action=list`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) { const txt = await res.text(); throw new Error(txt || 'Error generando reporte'); }
                const blob = await res.blob();
                if (typeof setPreviewBlob === 'function') setPreviewBlob('previewReporteIframe', blob);
                if (typeof openPreviewModal === 'function') openPreviewModal('previewReporteModal');
            } catch (e) {
                console.error(e);
                alert('Error al generar reporte: ' + e.message);
            }
        })();
    }

    function generarConstancia(estudianteId){
        (async ()=>{
            try {
                const token = localStorage.getItem('token');
                const url = `${APP_CONFIG.API.BASE_URL}/tutorReports.php?action=constancia&estudianteId=${encodeURIComponent(estudianteId)}`;
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) { const txt = await res.text(); throw new Error(txt || 'Error generando constancia'); }
                const blob = await res.blob();
                if (typeof setPreviewBlob === 'function') setPreviewBlob('previewConstanciaIframe', blob);
                if (typeof openPreviewModal === 'function') openPreviewModal('previewConstanciaModal');
            } catch (e) {
                console.error(e);
                alert('Error al generar constancia: ' + e.message);
            }
        })();
    }

})();
