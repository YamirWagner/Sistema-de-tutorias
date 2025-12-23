// mis_estudiantes.js - Módulo "Mis estudiantes" para el tutor
(function(){
    'use strict';

    window.loadMisEstudiantesContent = async function() {
        try {
            const basePath = window.APP_BASE_PATH || '/Sistema-de-tutorias';
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
<<<<<<< Updated upstream
=======
    let agendamientos = [];
>>>>>>> Stashed changes

    // ================== CARGA DE DATOS ==================
    async function cargarDatosYRender() {
        try {
            const data = await apiGet('/misEstudiantes?action=lista');
            const agendData = await apiGet('/atencionTutoria?action=lista');

            if (data.success) {
                estudiantes = data.data || [];
            } else {
                estudiantes = [];
                console.error('Error al cargar estudiantes:', data.message);

                        if (agendData.success) {
                            agendamientos = agendData.data || [];
                        } else {
                            agendamientos = [];
                            console.error('Error al cargar agendamientos:', agendData.message);
                        }

                        sessionsMap = mapSessionsByStudent();
            }

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

    // ================== RENDER TABLA ==================
    function renderTabla(estudiantesList) {
        const tbody = document.getElementById('studentsTbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        estudiantesList.forEach(est => {
            const sid = est.id;
            const nombre = `${est.nombres || ''} ${est.apellidos || ''}`.trim();
            const codigo = est.codigo || '';
            const map = sessionsMap[sid] || { Academica:{date:null,modalidad:null}, Personal:{date:null,modalidad:null}, Profesional:{date:null,modalidad:null}, modalidades:new Set(), count:0, lastDateTime:null, lastModalidad:null };

            const modal = map.lastModalidad || [...map.modalidades][0] || '';
            const row = document.createElement('tr');

            const tdEst = document.createElement('td');
            tdEst.innerHTML = `<strong>${nombre}</strong><br><small>${codigo}</small>`;

            // Académica: fecha y modalidad
            const tdADate = document.createElement('td');
            tdADate.className = 'center';
            const aDate = map.Academica.date || null;
            tdADate.textContent = aDate ? formatDateShort(aDate) : '--/--/--';

            const tdAMod = document.createElement('td');
            tdAMod.className = 'center';
            const aMod = map.Academica.modalidad || map.lastModalidad || '';
            tdAMod.textContent = aMod ? shortModal(aMod) : 'Mod';

            // Personal: fecha y modalidad
            const tdPDate = document.createElement('td');
            tdPDate.className = 'center';
            const pDate = map.Personal.date || null;
            tdPDate.textContent = pDate ? formatDateShort(pDate) : '--/--/--';

            const tdPMod = document.createElement('td');
            tdPMod.className = 'center';
            const pMod = map.Personal.modalidad || map.lastModalidad || '';
            tdPMod.textContent = pMod ? shortModal(pMod) : 'Mod';

            // Profesional: fecha y modalidad
            const tdPrDate = document.createElement('td');
            tdPrDate.className = 'center';
            const prDate = map.Profesional.date || null;
            tdPrDate.textContent = prDate ? formatDateShort(prDate) : '--/--/--';

            const tdPrMod = document.createElement('td');
            tdPrMod.className = 'center';
            const prMod = map.Profesional.modalidad || map.lastModalidad || '';
            tdPrMod.textContent = prMod ? shortModal(prMod) : 'Mod';

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
            row.appendChild(tdADate);
            row.appendChild(tdAMod);
            row.appendChild(tdPDate);
            row.appendChild(tdPMod);
            row.appendChild(tdPrDate);
            row.appendChild(tdPrMod);
            row.appendChild(tdCount);
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

        if (modalidad) {
            lista = lista.filter(e => (e.modalidadPreferida || 'Presencial') === modalidad);
        }

        renderTabla(lista);
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
