// mis_estudiantes.js - Módulo para "Mis estudiantes"
(function(){
    'use strict';

    window.loadMisEstudiantesContent = async function() {
        try {
            const basePath = window.APP_BASE_PATH || '';
            const componentPath = `${basePath}/frontend/components/tutor/mis_estudiantes.html`;
            const resp = await fetch(componentPath);
            const html = await resp.text();
            const target = document.getElementById('dashboardContent');
            if (!target) return;
            target.innerHTML = html;

            // Inicializar eventos
            document.getElementById('filterSearch').addEventListener('input', aplicarFiltros);
            document.getElementById('filterTipo').addEventListener('change', aplicarFiltros);
            document.getElementById('filterModalidad').addEventListener('change', aplicarFiltros);
            document.getElementById('btnGenerarReporte').addEventListener('click', generarReporteLista);

            // Cargar datos
            await cargarEstudiantes();
        } catch (err) {
            console.error('Error cargando Mis estudiantes:', err);
        }
    };

    let estudiantes = [];

    async function cargarEstudiantes(){
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${APP_CONFIG.API.BASE_URL}/asignacionTutor.php?action=estudiantes`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (!data.success) return alert('Error al obtener estudiantes: '+(data.message || ''));
            estudiantes = data.data || [];
            renderizarTabla(estudiantes);
        } catch (e) { console.error(e); alert('Error de conexión al cargar estudiantes'); }
    }

    async function obtenerSesionesPorEstudiante(estudianteId){
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${APP_CONFIG.API.BASE_URL}/asignacionTutor.php?action=agendamientos&estudiante=${estudianteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const json = await res.json();
            if (!json.success) return [];
            return json.data || [];
        } catch (e) { console.error(e); return []; }
    }

    async function renderizarTabla(list){
        const tbody = document.getElementById('studentsTbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        for (const est of list) {
            const sesiones = await obtenerSesionesPorEstudiante(est.id);

            // Buscar por tipo
            const tipos = { 'Académica': null, 'Personal': null, 'Profesional': null };
            sesiones.filter(s=>s.estado==='Realizada').forEach(s=>{
                const tipo = s.tipoTutoria || s.tipo || s.tipoTutoria || s.tipo;
                if (tipo && tipos[tipo] === null) tipos[tipo] = s.fecha;
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${est.nombres} ${est.apellidos}<br><small>${est.codigo || ''}</small></td>
                <td class="center">${checkboxHtml(tipos['Académica'])}</td>
                <td class="center">${checkboxHtml(tipos['Personal'])}</td>
                <td class="center">${checkboxHtml(tipos['Profesional'])}</td>
                <td>${determineModalidadFromSessions(sesiones)}</td>
                <td class="center"><button class="btn-primary btn-generate" data-id="${est.id}">Generar constancia</button></td>
            `;

            tbody.appendChild(tr);
        }

        // attach listeners
        document.querySelectorAll('.btn-generate').forEach(b => {
            b.addEventListener('click', async function(){
                const id = this.dataset.id;
                await previewConstancia(id);
            });
        });
    }

    function checkboxHtml(fecha){
        if (!fecha) return `<div style="opacity:0.35">☐<span class="session-date">DD/MM/YY</span></div>`;
        const d = formatDate(fecha);
        return `<div>☑<span class="session-date">${d}</span></div>`;
    }

    function formatDate(fecha){
        if (!fecha) return '';
        const dt = new Date(fecha);
        if (isNaN(dt)) return fecha;
        return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getFullYear()).slice(-2)}`;
    }

    function determineModalidadFromSessions(sesiones){
        if (!sesiones || sesiones.length===0) return 'N/A';
        const m = sesiones.find(s=>s.modalidad);
        return m ? m.modalidad : 'N/A';
    }

    function aplicarFiltros(){
        const q = document.getElementById('filterSearch').value.toLowerCase();
        const tipo = document.getElementById('filterTipo').value;
        const mod = document.getElementById('filterModalidad').value;

        const filtered = estudiantes.filter(e=>{
            const name = (e.nombres+' '+e.apellidos+' '+(e.codigo||'')).toLowerCase();
            if (q && !name.includes(q)) return false;
            return true; // tipo/modalidad deben aplicarse por sesiones (omitir server-side hacia atrás)
        });

        renderizarTabla(filtered);
    }

    // Preview constancia: fetch PDF blob and show in modal
    async function previewConstancia(estudianteId){
        try {
            const token = localStorage.getItem('token');
            const url = `${APP_CONFIG.API.BASE_URL}/tutorReports.php?action=constancia&estudianteId=${encodeURIComponent(estudianteId)}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) { const txt = await res.text(); throw new Error(txt || 'Error generando constancia'); }
            const blob = await res.blob();
            setPreviewBlob('previewConstanciaIframe', blob);
            openPreviewModal('previewConstanciaModal');
        } catch (e) { console.error(e); alert('Error al previsualizar constancia: '+e.message); }
    }

    // Generar reporte lista y previsualizar
    async function generarReporteLista(){
        try {
            const token = localStorage.getItem('token');
            const url = `${APP_CONFIG.API.BASE_URL}/tutorReports.php?action=list`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) { const txt = await res.text(); throw new Error(txt || 'Error generando reporte'); }
            const blob = await res.blob();
            setPreviewBlob('previewReporteIframe', blob);
            openPreviewModal('previewReporteModal');
        } catch (e) { console.error(e); alert('Error al generar reporte: '+e.message); }
    }

    // Reexport helpers used by modals
    window.setPreviewBlob = function(iframeId, blob){
        if (window.setPreviewBlobGlobal) return window.setPreviewBlobGlobal(iframeId, blob);
        const script = document.createElement('script'); // fallback no-op
    };

    // When module loads, ensure helper setPreviewBlob from modals is available
    function hookupPreviewSetter(){
        if (typeof setPreviewBlob === 'function') {
            window.setPreviewBlobGlobal = setPreviewBlob;
            window.setPreviewBlob = setPreviewBlob;
        } else {
            setTimeout(hookupPreviewSetter, 200);
        }
    }
    hookupPreviewSetter();

})();
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
            if (!map[idEst]) map[idEst] = { Academica: null, Personal: null, Profesional: null, modalidades: new Set() };

            const estado = (a.estado || '').toLowerCase();
            const tipo = (a.tipoTutoria || a.tipo || '').toLowerCase();
            if (estado === 'realizada' || estado === 'realizado' || estado === 'realizada') {
                let key = null;
                if (tipo.includes('acad')) key = 'Academica';
                else if (tipo.includes('personal')) key = 'Personal';
                else if (tipo.includes('profesional')) key = 'Profesional';

                if (key) {
                    // guardar la fecha más reciente si hay varias
                    const fecha = a.fecha;
                    if (!map[idEst][key] || map[idEst][key] < fecha) map[idEst][key] = fecha;
                }
            }

            if (a.modalidad) map[idEst].modalidades.add(a.modalidad);
        });
        return map;
    }

    function formatDateShort(isoDate){
        if (!isoDate) return 'DD/MM/YY';
        try {
            const d = new Date(isoDate);
            const day = String(d.getDate()).padStart(2,'0');
            const mon = String(d.getMonth()+1).padStart(2,'0');
            const year = String(d.getFullYear()).slice(-2);
            return `${day}/${mon}/${year}`;
        } catch(e){ return 'DD/MM/YY'; }
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
            const map = sessionsMap[sid] || { Academica: null, Personal: null, Profesional: null, modalidades: new Set() };

            const modal = [...map.modalidades][0] || 'Presencial';
            const row = document.createElement('tr');

            const tdEst = document.createElement('td');
            tdEst.innerHTML = `<strong>${nombre}</strong><br><small>${codigo}</small>`;

            const tdA = document.createElement('td');
            tdA.className = 'center';
            tdA.innerHTML = `<input type="checkbox" disabled ${map.Academica ? 'checked' : ''}><span class="session-date">${formatDateShort(map.Academica)}</span>`;

            const tdP = document.createElement('td');
            tdP.className = 'center';
            tdP.innerHTML = `<input type="checkbox" disabled ${map.Personal ? 'checked' : ''}><span class="session-date">${formatDateShort(map.Personal)}</span>`;

            const tdPr = document.createElement('td');
            tdPr.className = 'center';
            tdPr.innerHTML = `<input type="checkbox" disabled ${map.Profesional ? 'checked' : ''}><span class="session-date">${formatDateShort(map.Profesional)}</span>`;

            const tdModal = document.createElement('td');
            tdModal.textContent = modal;

            const tdAction = document.createElement('td');
            tdAction.className = 'center';
            const allThree = map.Academica && map.Personal && map.Profesional;
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
                    if (!m[key]) return false;
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
        // Placeholder: el backend TCPDF se implementará más adelante
        const passed = [];
        const map = mapSessionsByStudent();
        estudiantes.forEach(e => { if (map[e.id] && map[e.id].Academica && map[e.id].Personal && map[e.id].Profesional) passed.push(e); });
        if (passed.length === 0) return alert('No hay estudiantes que cumplan las 3 sesiones');
        // Abrir nueva ventana con listado (temporal)
        const content = passed.map(p => `${p.nombres} ${p.apellidos} (${p.codigo})`).join('\n');
        const w = window.open('', '_blank');
        w.document.write('<pre>' + content + '</pre>');
    }

    function generarConstancia(estudianteId){
        // Placeholder: se implementará generación PDF con TCPDF posteriormente
        alert('Generar constancia (pendiente backend). Estudiante ID: ' + estudianteId);
    }

})();
