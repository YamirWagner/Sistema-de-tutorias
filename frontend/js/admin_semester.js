// =====================================================
// ADMIN_SEMESTER.JS - Módulo de Gestión de Semestre
// Sistema de Tutorías UNSAAC - Optimizado
// =====================================================

'use strict';

/**
 * Módulo de Semestre
 */
const SemesterModule = {
    state: { currentSemester: null, stats: null, tutorWorkload: [], isLoading: false },
    API: {
        STATS: '/admin?action=semester_stats',
        UPDATE: '/admin?action=update_semester',
        CLOSE: '/admin?action=close_semester'
    }
};

// ============= CORE =============

async function initSemesterModule() {
    if (SemesterModule.state.isLoading) return;
    
    console.log('📅 Inicializando módulo de semestre...');
    SemesterModule.state.isLoading = true;
    
    try {
        await loadSemesterData();
        setupSemesterListeners();
        console.log('✅ Módulo de semestre listo');
    } catch (e) {
        console.error('❌ Error:', e);
        showNotification?.('Error al cargar semestre', 'error');
    } finally {
        SemesterModule.state.isLoading = false;
    }
}

async function loadSemesterData() {
    try {
        const res = await apiGet(SemesterModule.API.STATS);
        if (res?.success && res.data) {
            Object.assign(SemesterModule.state, {
                currentSemester: res.data.semester,
                stats: res.data.stats,
                tutorWorkload: res.data.tutorWorkload || []
            });
            updateSemesterUI(res.data);
            return;
        }
    } catch (e) {
        console.warn('⚠️ Backend no disponible');
    }
    loadMockData();
}

function loadMockData() {
    const endDate = '2025-12-16';
    const data = {
        semester: { id: 1, name: '2025-2', status: 'active', startDate: '2025-10-18', endDate },
        stats: {
            totalStudents: 53, assignedStudents: 48, unassignedStudents: 5,
            totalTutors: 5, sessionsScheduled: 24, sessionsCompleted: 18,
            daysRemaining: Math.max(0, Math.ceil((new Date(endDate) - new Date()) / 864e5))
        },
        tutorWorkload: [
            { id: 1, name: 'C. López', shortName: 'C.\nLópez', students: 5, max: 10 },
            { id: 2, name: 'M. Fdez', shortName: 'M.\nFdez', students: 8, max: 10 },
            { id: 3, name: 'J. Pérez', shortName: 'J.\nPérez', students: 10, max: 10 },
            { id: 4, name: 'A. García', shortName: 'A.\nGarcía', students: 0, max: 10 },
            { id: 5, name: 'R. Cruz', shortName: 'R.\nCruz', students: 7, max: 10 }
        ]
    };
    Object.assign(SemesterModule.state, data);
    updateSemesterUI(data);
}

// ============= UI UPDATES =============

function updateSemesterUI(data) {
    if (!data) return;
    updateHeader(data.semester);
    updateCards(data.stats);
    updateDonut(data.stats);
    updateWorkload(data.tutorWorkload);
    updateSummary(data.stats);
}

function updateHeader(sem) {
    if (!sem) return;
    setText('semesterName', `Semestre ${sem.name}: `);
    
    const badge = $('semesterStatusBadge');
    const text = $('semesterStatusText');
    if (badge && text) {
        badge.className = `semester-status-badge ${sem.status}`;
        text.textContent = { active: 'ACTIVO', inactive: 'INACTIVO', closed: 'CERRADO' }[sem.status] || '?';
    }
    
    if (sem.startDate && sem.endDate) {
        setText('semesterPeriod', `${fmtDate(sem.startDate)} - ${fmtDate(sem.endDate)}`);
    }
}

function updateCards(s) {
    if (!s) return;
    setText('unassignedCount', s.unassignedStudents || 0);
    setText('assignedCount', s.assignedStudents || 0);
    $('unassignedCount')?.closest('.semester-card')?.classList.toggle('pulse-alert', s.unassignedStudents > 0);
}

function updateDonut(s) {
    if (!s) return;
    const { totalStudents: t = 0, assignedStudents: a = 0, unassignedStudents: u = 0 } = s;
    
    setText('totalStudentsDonut', t);
    setText('assignedLegend', a);
    setText('unassignedLegend', u);
    
    if (t > 0) {
        const aPct = (a / t) * 100, uPct = (u / t) * 100;
        const aEl = document.querySelector('.donut-segment.assigned');
        const uEl = document.querySelector('.donut-segment.unassigned');
        if (aEl) aEl.style.strokeDasharray = `${aPct} ${100 - aPct}`;
        if (uEl) {
            uEl.style.strokeDasharray = `${uPct} ${100 - uPct}`;
            uEl.style.strokeDashoffset = `-${aPct - 25}`;
        }
    }
}

function updateWorkload(tutors) {
    const c = $('workloadChartContainer');
    if (!c || !Array.isArray(tutors)) return;
    
    c.innerHTML = tutors.map(t => {
        const pct = (t.students / (t.max || 10)) * 100;
        const h = Math.max(pct * 1.3, 4);
        const cls = pct >= 80 ? 'high' : pct >= 50 ? 'medium' : 'low';
        return `<div class="workload-bar">
            <div class="bar-container">
                <span class="bar-value">${t.students}</span>
                <div class="bar-fill ${cls}" style="height:${h}px"></div>
            </div>
            <span class="bar-label">${t.shortName || t.name}</span>
        </div>`;
    }).join('');
}

function updateSummary(s) {
    if (!s) return;
    ['summaryTotalTutors', 'summaryTotalStudents', 'summarySessionsScheduled', 
     'summarySessionsCompleted', 'summaryDaysRemaining'].forEach((id, i) => {
        const vals = [s.totalTutors, s.totalStudents, s.sessionsScheduled, s.sessionsCompleted, s.daysRemaining];
        setText(id, vals[i] ?? 0);
    });
}

function setupSemesterListeners() {
    const input = $('closeConfirmInput'), btn = $('btnExecuteClose');
    input?.addEventListener('input', () => btn && (btn.disabled = input.value.toUpperCase() !== 'CERRAR'));
}

// ============= MODALS =============

function openScheduleManager() {
    const m = $('scheduleManagerModal'), s = SemesterModule.state.currentSemester;
    if (!m) return;
    if (s) {
        setVal('semesterNameInput', s.name);
        setVal('semesterStartDate', s.startDate);
        setVal('semesterEndDate', s.endDate);
        setVal('semesterStatusSelect', s.status);
    }
    m.classList.remove('hidden');
}

const closeScheduleManager = () => $('scheduleManagerModal')?.classList.add('hidden');

async function saveSemesterSchedule() {
    const d = {
        id: SemesterModule.state.currentSemester?.id,
        name: getVal('semesterNameInput'),
        startDate: getVal('semesterStartDate'),
        endDate: getVal('semesterEndDate'),
        status: getVal('semesterStatusSelect')
    };
    
    if (!d.name || !d.startDate || !d.endDate) return showNotification?.('Complete todos los campos', 'warning');
    if (new Date(d.startDate) >= new Date(d.endDate)) return showNotification?.('Fechas inválidas', 'warning');
    
    try {
        const res = await apiPost(SemesterModule.API.UPDATE, d);
        if (res?.success) {
            showNotification?.('Cronograma actualizado', 'success');
            closeScheduleManager();
            await loadSemesterData();
        } else {
            showNotification?.(res?.message || 'Error', 'error');
        }
    } catch (e) {
        showNotification?.('Error de conexión', 'error');
    }
}

function confirmCloseSemester() {
    const m = $('closeSemesterModal');
    if (m) {
        setVal('closeConfirmInput', '');
        const b = $('btnExecuteClose'); if (b) b.disabled = true;
        m.classList.remove('hidden');
    }
}

const cancelCloseSemester = () => $('closeSemesterModal')?.classList.add('hidden');

async function executeSemesterClose() {
    if (getVal('closeConfirmInput').toUpperCase() !== 'CERRAR') 
        return showNotification?.('Escriba CERRAR', 'warning');
    
    try {
        const res = await apiPost(SemesterModule.API.CLOSE, { semesterId: SemesterModule.state.currentSemester?.id });
        if (res?.success) {
            showNotification?.('Semestre cerrado', 'success');
            cancelCloseSemester();
            await loadSemesterData();
        } else {
            showNotification?.(res?.message || 'Error', 'error');
        }
    } catch (e) {
        showNotification?.('Error de conexión', 'error');
    }
}

// ============= ACTIONS =============

function assignUnassignedStudents() {
    handleMenuAction?.('showAssignmentSection');
    setTimeout(() => $('unassigned-students')?.scrollIntoView({ behavior: 'smooth' }), 300);
}

function viewAllAssignments() {
    loadActiveAssignments?.();
    $('assignmentsContainer')?.scrollIntoView({ behavior: 'smooth' });
}

async function refreshSemesterData() {
    const btn = document.querySelector('.btn-refresh');
    if (btn) { btn.disabled = true; btn.classList.add('refreshing'); }
    await loadSemesterData();
    if (btn) { btn.disabled = false; btn.classList.remove('refreshing'); }
    showNotification?.('Actualizado', 'success');
}

async function loadSemesterContent() {
    try {
        const res = await fetch('/Sistema-de-tutorias/components/admin-semester.html');
        if (!res.ok) throw new Error(res.status);
        const html = await res.text();
        const c = $('dashboardContent');
        if (!c) return;
        c.querySelector('.semester-section')?.remove();
        c.insertAdjacentHTML('afterbegin', html);
        await initSemesterModule();
    } catch (e) {
        console.error('Error:', e);
        showNotification?.('Error al cargar', 'error');
    }
}

// ============= UTILS =============

const $ = id => document.getElementById(id);
const setText = (id, v) => { const e = $(id); if (e) e.textContent = v; };
const getVal = id => $(id)?.value?.trim() || '';
const setVal = (id, v) => { const e = $(id); if (e) e.value = v || ''; };
const fmtDate = d => {
    if (!d) return '';
    const m = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getDate()} ${m[dt.getMonth()]}`;
};

// ============= EXPORTS =============
Object.assign(window, {
    initSemesterModule, loadSemesterData, loadSemesterContent,
    openScheduleManager, closeScheduleManager, saveSemesterSchedule,
    confirmCloseSemester, cancelCloseSemester, executeSemesterClose,
    assignUnassignedStudents, viewAllAssignments, refreshSemesterData
});
