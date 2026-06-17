// Cell Level Dashboard JavaScript

let _cellCaseCache = [];
let _cellRegistrationsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser || currentUser.userType !== 'cell') {
        window.location.href = 'login.html';
        return;
    }
    await initializeDashboard();
});

async function initializeDashboard() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    // Re-fetch profile so sector/cell are always up-to-date
    try {
        const resp = await fetch(`/api/auth/profile?email=${encodeURIComponent(currentUser.email)}`);
        if (resp.ok) {
            const profile = await resp.json();
            const merged = { ...currentUser, ...profile };
            sessionStorage.setItem('currentUser', JSON.stringify(merged));
            populateProfileForm(merged);
            showLocationBanner(merged);
        } else {
            populateProfileForm(currentUser);
            showLocationBanner(currentUser);
        }
    } catch {
        populateProfileForm(currentUser);
        showLocationBanner(currentUser);
    }

    setupNavigation();
    setupForms();
    loadAllData();
    setupAutoRefresh();
}

function showLocationBanner(user) {
    const sector = (user.sector || '').trim();
    const cell   = (user.cell   || '').trim();
    document.getElementById('bannerSector').textContent = sector || '—';
    document.getElementById('bannerCell').textContent   = cell   || '—';
    if (!sector || !cell) {
        document.getElementById('bannerWarning').style.display = '';
    } else {
        document.getElementById('bannerWarning').style.display = 'none';
    }
}

function populateProfileForm(user) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('profileName', user.name);
    set('profileEmail', user.email);
    set('profileSector', user.sector);
    set('profileCell', user.cell);
    set('profileVillage', user.village);
}

window.saveProfile = async function () {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const sector  = (document.getElementById('profileSector').value  || '').trim();
    const cell    = (document.getElementById('profileCell').value    || '').trim();
    const village = (document.getElementById('profileVillage').value || '').trim();

    if (!sector || !cell) { alert('Sector and Cell are required.'); return; }

    try {
        const resp = await fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, sector, cell, village })
        });
        if (resp.ok) {
            const merged = { ...currentUser, sector, cell, village };
            sessionStorage.setItem('currentUser', JSON.stringify(merged));
            showLocationBanner(merged);
            const msg = document.getElementById('profileSaveMsg');
            if (msg) msg.style.display = '';
            loadAllData();
        } else {
            alert('Failed to save profile.');
        }
    } catch (err) {
        alert('Error saving profile: ' + err.message);
    }
};

function getCellLocation() {
    const u = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    return { sector: (u.sector || '').trim(), cell: (u.cell || '').trim() };
}

// Navigation
function setupNavigation() {
    const menuLinks = document.querySelectorAll('.dashboard-menu a');
    const sections  = document.querySelectorAll('.dashboard-section');

    menuLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            const target = document.getElementById(sectionId);
            if (target) target.classList.add('active');

            if (sectionId === 'attendance') {
                loadCellUmugandaAnalytics();
                loadCellIntekoAnalytics();
            } else if (sectionId === 'registrations') {
                loadCellRegistrations();
            } else if (sectionId === 'infra-visitors') {
                loadCellInfraVisitors();
            }
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', e => {
            e.preventDefault();
            sessionStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }
}

// Forms
function setupForms() {
    document.getElementById('resolveCaseForm').addEventListener('submit', handleCaseResolution);

    const cellChatForm     = document.getElementById('cellChatForm');
    const cellActivityForm = document.getElementById('cellActivityForm');
    const cellUpcomingForm = document.getElementById('cellUpcomingForm');
    const cellTrendingForm = document.getElementById('cellTrendingForm');
    if (cellChatForm)     cellChatForm.addEventListener('submit', handleCellChatSubmit);
    if (cellActivityForm) cellActivityForm.addEventListener('submit', handleCellActivitySubmit);
    if (cellUpcomingForm) cellUpcomingForm.addEventListener('submit', handleCellUpcomingSubmit);
    if (cellTrendingForm) cellTrendingForm.addEventListener('submit', handleCellTrendingSubmit);
}

// Load all data
function loadAllData() {
    loadCaseTable();
    loadActivities();
    loadReports();
    loadStatistics();
    loadCellChatMessages();
    loadCellInbox();
    setupHomeUpdatesTabs();
    setupHomeUpdateForms();
    loadCellHomeUpdatesList();
    loadCellRegistrations();
    setupCellAttendanceTabs();
    setupCellInfraVisitorsTabs();
    loadCellInfraVisitors();
}

// ===== CASES =====

async function loadCaseTable() {
    const { sector, cell } = getCellLocation();
    const tbody = document.getElementById('caseTableBody');
    if (!sector || !cell) {
        tbody.innerHTML = emptyRow(12, 'fa-location-dot', 'Profile location not set', 'Go to "My Profile / Location" and set your sector & cell to load data.', 'warning');
        return;
    }
    try {
        // Fetch all cases matching this cell's sector+cell (Village AND Cell level)
        const params = new URLSearchParams({ type: 'case', sector, cell });
        const resp = await fetch('/api/citizen-reports?' + params);
        const cases = await resp.json();
        _cellCaseCache = cases;
        renderCaseTable(cases);
        updateCaseSelect();
    } catch (err) {
        tbody.innerHTML = emptyRow(12, 'fa-triangle-exclamation', 'Could not load cases', err.message, 'error');
    }
}

function renderCaseTable(cases) {
    const tbody = document.getElementById('caseTableBody');
    if (!cases.length) {
        tbody.innerHTML = emptyRow(12, 'fa-scale-balanced', 'No escalated cases', 'Cases escalated from village level will appear here for review.');
        return;
    }
    tbody.innerHTML = cases.map(r => {
        const c = r.data || {};
        const status   = c.status   || 'Pending';
        const priority = c.priority || 'medium';
        const level    = c.level    || 'Village';

        const statusClass = (status === 'resolved' || status === 'Solved') ? 'status-solved' :
                           (status === 'Escalate to Sector' || status === 'Escalated' || status === 'under-review') ? 'status-escalated' :
                           status === 'In Progress' ? 'status-in-progress' : 'status-pending';
        const priorityClass = (priority === 'emergency' || priority === 'high') ? 'status-escalated' :
                             priority === 'medium' ? 'status-pending' : 'status-solved';
        const levelClass = level === 'Cell' ? 'status-in-progress' : level === 'Sector' ? 'status-escalated' : 'status-pending';

        const locationText = [c.sector, c.cell, c.village].filter(Boolean).join(' / ') || '—';
        const accusedText  = `${c.accusedName || c.defendant || '—'} (${c.accusedPhone || '—'})`;
        const title        = c.caseTitle || c.title || '—';
        const desc         = c.caseDescription || c.description || '';
        const evidence     = c.image
            ? `<img src="${c.image}" class="evidence-thumb" onclick="viewEvidenceModal('${c.image}')" alt="evidence">`
            : '<span class="muted-text">No image</span>';
        const countdown = calculateCountdownFromData(c);
        const repEmail = (r.reportedByEmail || '').replace(/'/g, "\\'");
        const repName  = (r.reportedBy || '').replace(/'/g, "\\'");

        return `
            <tr>
                <td>${escapeHtml(c.caseType || c.type || '—')}</td>
                <td>
                    <span class="cell-strong">${escapeHtml(title)}</span><br>
                    <small class="cell-sub" title="${escapeHtml(desc)}">${truncateDescCell(desc, 45)}</small>
                </td>
                <td>
                    ${escapeHtml(r.reportedBy || '—')}<br>
                    <small class="cell-sub">${escapeHtml(r.reportedByEmail || '')}</small>
                </td>
                <td>${escapeHtml(accusedText)}</td>
                <td>${escapeHtml(locationText)}</td>
                <td><span class="status-badge ${priorityClass}">${escapeHtml(capitalize(priority))}</span></td>
                <td><span class="status-badge ${levelClass}">${escapeHtml(level)}</span></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(capitalize(status))}</span></td>
                <td>${countdown}</td>
                <td>${evidence}</td>
                <td>${formatDate(c.incidentDate || c.escalatedToCellAt || r.createdAt)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewCaseDetails('${r._id}')"><i class="fa-solid fa-eye"></i> View</button>
                    <button class="btn btn-sm" onclick="confirmReceived('${repEmail}','${repName}','case','${r._id}')" style="background:#1e8a4a;color:#fff;border:none;" title="Notify the reporter this case was received"><i class="fa-solid fa-bell"></i> Confirm</button>
                    ${level === 'Cell' && status !== 'resolved' && status !== 'Solved' ?
                        `<button class="btn btn-primary btn-sm" onclick="selectCaseForResolution('${r._id}')"><i class="fa-solid fa-gavel"></i> Resolve</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
    startCountdownUpdates();
}

function calculateCountdownFromData(d) {
    if (d.status === 'resolved' || d.status === 'Solved') return '<span class="countdown-expired">Solved</span>';
    const resDate = d.cellResolutionDate || d.expectedResolutionDate;
    if (!resDate) return '<span class="countdown-error">No date set</span>';
    const diff = new Date(resDate) - new Date();
    if (diff <= 0) return '<span class="countdown-expired">Time Expired</span>';
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000)  / 60000);
    const seconds = Math.floor((diff % 60000)    / 1000);
    let html = '';
    if (days)                       html += `<span class="countdown-days">${days}d</span> `;
    if (hours || days)              html += `<span class="countdown-hours">${hours}h</span> `;
    if (minutes || hours || days)   html += `<span class="countdown-minutes">${minutes}m</span> `;
    html += `<span class="countdown-seconds">${seconds}s</span>`;
    const cls = diff < 86400000 ? 'countdown-warning' : '';
    return `<div class="countdown-display ${cls}">${html}</div>`;
}

let countdownInterval = null;
function startCountdownUpdates() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        _cellCaseCache.forEach(r => {
            const d = r.data || {};
            const el = document.querySelector(`.countdown-timer[data-id="${r._id}"]`);
            if (el) el.innerHTML = calculateCountdownFromData(d);
        });
    }, 1000);
}

async function handleCaseResolution(e) {
    e.preventDefault();
    const caseId        = document.getElementById('resolveCaseId').value;
    const resDays       = parseInt(document.getElementById('cellResolutionDays').value);
    const resDate       = document.getElementById('cellResolutionDate').value;
    const resNotes      = document.getElementById('cellResolutionNotes').value;
    const status        = document.getElementById('cellCaseStatus').value;

    if (!caseId) { alert('Select a case.'); return; }
    const record = _cellCaseCache.find(r => r._id === caseId);
    if (!record) { alert('Case not found.'); return; }

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const d = { ...(record.data || {}) };
    d.status              = status;
    d.cellResolutionDays  = resDays;
    d.cellResolutionDate  = new Date(resDate).toISOString();
    d.cellResolutionNotes = resNotes;
    d.cellResolvedBy      = currentUser.name;
    d.cellResolvedDate    = new Date().toISOString();

    if (status === 'Escalate to Sector') {
        d.level = 'Sector';
        d.status = 'Escalated';
        d.escalatedToSectorAt = new Date().toISOString();
    }

    try {
        const resp = await fetch(`/api/citizen-reports/${caseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: d })
        });
        if (!resp.ok) throw new Error('Server error');
        e.target.reset();
        await loadCaseTable();
        await loadStatistics();
        alert(`Case updated: ${status}`);
    } catch (err) {
        alert('Error updating case: ' + err.message);
    }
}

function updateCaseSelect() {
    const select = document.getElementById('resolveCaseId');
    select.innerHTML = '<option value="">Select a case to resolve</option>' +
        _cellCaseCache
            .filter(r => { const s = (r.data || {}).status || ''; return s !== 'resolved' && s !== 'Solved'; })
            .map(r => {
                const d = r.data || {};
                const label = `${d.plaintiff || '?'} vs ${d.defendant || '?'}`;
                return `<option value="${r._id}">#${r._id.slice(-6)} — ${escapeHtml(label)}</option>`;
            }).join('');
}

window.selectCaseForResolution = function (id) {
    document.getElementById('resolveCaseId').value = id;
    document.getElementById('resolveCaseId').scrollIntoView({ behavior: 'smooth' });
};

window.viewCaseDetails = function (id) {
    const record = _cellCaseCache.find(r => r._id === id);
    if (!record) return;
    const d = record.data || {};
    alert(
        `Case #${record._id.slice(-6)}\n` +
        `Plaintiff: ${d.plaintiff || '—'}\n` +
        `Defendant: ${d.defendant || '—'}\n` +
        `Village: ${d.village || '—'}   Cell: ${d.cell || '—'}   Sector: ${d.sector || '—'}\n` +
        `Reported by: ${record.reportedBy || '—'}\n` +
        `Status: ${d.status || '—'}   Level: ${d.level || '—'}\n` +
        `Escalated to Cell: ${d.escalatedToCellAt ? formatDate(d.escalatedToCellAt) : 'N/A'}\n\n` +
        `Description:\n${d.description || '—'}\n\n` +
        (d.cellResolutionNotes ? `Resolution Notes:\n${d.cellResolutionNotes}` : '')
    );
};

// ===== ACTIVITIES =====

async function loadActivities() {
    const { sector, cell } = getCellLocation();

    try {
        const [attResp, intekoResp, membResp, repResp] = await Promise.all([
            fetch(`/api/attendance?sector=${encodeURIComponent(sector)}&cell=${encodeURIComponent(cell)}`),
            fetch(`/api/inteko-attendance?sector=${encodeURIComponent(sector)}&cell=${encodeURIComponent(cell)}`),
            fetch(`/api/members?sector=${encodeURIComponent(sector)}&cell=${encodeURIComponent(cell)}`),
            fetch(`/api/citizen-reports?sector=${encodeURIComponent(sector)}&cell=${encodeURIComponent(cell)}`)
        ]);

        const [umuganda, inteko, members, reports] = await Promise.all([
            attResp.ok   ? attResp.json()   : [],
            intekoResp.ok ? intekoResp.json() : [],
            membResp.ok  ? membResp.json()  : [],
            repResp.ok   ? repResp.json()   : []
        ]);

        const now = new Date();
        const thisMonth = r => {
            const d = new Date(r.date || r.attendanceDate || r.createdAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        };

        document.getElementById('umugandaSummary').innerHTML = `
            <p><strong>Total Records:</strong> ${umuganda.length}</p>
            <p><strong>This Month:</strong> ${umuganda.filter(thisMonth).length}</p>
        `;
        document.getElementById('intekoSummary').innerHTML = `
            <p><strong>Total Records:</strong> ${inteko.length}</p>
            <p><strong>This Month:</strong> ${inteko.filter(thisMonth).length}</p>
        `;
        document.getElementById('registrationSummary').innerHTML = `
            <p><strong>Total Registered:</strong> ${members.length}</p>
            <p><strong>New Members:</strong> ${members.filter(m => m.status === 'New Member').length}</p>
        `;
        const drugs    = reports.filter(r => r.type === 'drugs');
        const violence = reports.filter(r => r.type === 'violence');
        document.getElementById('reportsSummary').innerHTML = `
            <p><strong>Drug Reports:</strong> ${drugs.length}</p>
            <p><strong>Violence Reports:</strong> ${violence.length}</p>
        `;
    } catch (err) {
        console.error('loadActivities error:', err);
    }
}

// ===== REPORTS =====

let _cellDrugsCache    = [];
let _cellViolenceCache = [];

async function loadReports() {
    const { sector, cell } = getCellLocation();
    const drugsBody    = document.getElementById('drugsReportsBody');
    const violenceBody = document.getElementById('violenceReportsBody');

    try {
        const params = `sector=${encodeURIComponent(sector)}&cell=${encodeURIComponent(cell)}`;
        const [crDrugs, crViolence, lrDrugs, lrViolence] = await Promise.all([
            fetch(`/api/citizen-reports?type=drugs&${params}`).then(r => r.json()),
            fetch(`/api/citizen-reports?type=violence&${params}`).then(r => r.json()),
            fetch(`/api/leader-reports?type=drugs&${params}`).then(r => r.json()),
            fetch(`/api/leader-reports?type=violence&${params}`).then(r => r.json())
        ]);

        _cellDrugsCache    = [...crDrugs,    ...lrDrugs];
        _cellViolenceCache = [...crViolence, ...lrViolence];

        drugsBody.innerHTML = _cellDrugsCache.length
            ? _cellDrugsCache.map((r, i) => {
                const d = r.data || {};
                return `<tr>
                    <td>${escapeHtml(d.name || r.reportedBy || '—')}</td>
                    <td>${escapeHtml(d.sector || '—')}</td>
                    <td>${escapeHtml(d.cell   || '—')}</td>
                    <td>${escapeHtml(d.village || '—')}</td>
                    <td>${truncateDescCell(d.description, 40)}</td>
                    <td>${escapeHtml(r.reportedBy || '—')}</td>
                    <td>${formatDate(r.createdAt)}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="viewDrugsDetailsCell(${i})">View</button>
                        <button class="btn btn-sm" onclick="confirmReceived('${(r.reportedByEmail || d.reportedByEmail || '').replace(/'/g, "\\'")}','${(r.reportedBy || '').replace(/'/g, "\\'")}','drugs','${r._id}')" style="background:#1e8a4a;color:#fff;border:none;" title="Notify the reporter this report was received"><i class="fa-solid fa-bell"></i> Confirm</button>
                    </td>
                </tr>`;
            }).join('')
            : emptyRow(8, 'fa-wine-bottle', 'No drug reports', 'Drug and illegal-drink reports from citizens and village leaders will show here.');

        violenceBody.innerHTML = _cellViolenceCache.length
            ? _cellViolenceCache.map((r, i) => {
                const d = r.data || {};
                return `<tr>
                    <td>${escapeHtml(d.victimName || d.name || '—')}</td>
                    <td>${escapeHtml(d.telephone || '—')}</td>
                    <td>${escapeHtml(d.sector || '—')}</td>
                    <td>${escapeHtml(d.cell   || '—')}</td>
                    <td>${escapeHtml(d.village || '—')}</td>
                    <td>${truncateDescCell(d.description, 40)}</td>
                    <td>${escapeHtml(r.reportedBy || '—')}</td>
                    <td>${formatDate(r.createdAt)}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="viewViolenceDetailsCell(${i})">View</button>
                        <button class="btn btn-sm" onclick="confirmReceived('${(r.reportedByEmail || d.reportedByEmail || '').replace(/'/g, "\\'")}','${(r.reportedBy || '').replace(/'/g, "\\'")}','violence','${r._id}')" style="background:#1e8a4a;color:#fff;border:none;" title="Notify the reporter this report was received"><i class="fa-solid fa-bell"></i> Confirm</button>
                    </td>
                </tr>`;
            }).join('')
            : emptyRow(9, 'fa-shield-heart', 'No violence reports', 'Sexual-violence reports in your cell will appear here.');
    } catch (err) {
        drugsBody.innerHTML    = emptyRow(8, 'fa-triangle-exclamation', 'Could not load reports', err.message, 'error');
        violenceBody.innerHTML = emptyRow(9, 'fa-triangle-exclamation', 'Could not load reports', err.message, 'error');
    }
}

window.viewDrugsDetailsCell = function (idx) {
    const r = _cellDrugsCache[idx];
    if (!r) return;
    const d = r.data || {};
    alert(`Drug Report\nName: ${d.name || '—'}\nLocation: ${d.village || '—'}, ${d.cell || '—'}, ${d.sector || '—'}\nReported by: ${r.reportedBy || '—'}\nDescription: ${d.description || '—'}\nDate: ${formatDate(r.createdAt)}`);
};

window.viewViolenceDetailsCell = function (idx) {
    const r = _cellViolenceCache[idx];
    if (!r) return;
    const d = r.data || {};
    alert(`Violence Report\nVictim: ${d.victimName || d.name || '—'}\nTelephone: ${d.telephone || '—'}\nLocation: ${d.village || '—'}, ${d.cell || '—'}, ${d.sector || '—'}\nReported by: ${r.reportedBy || '—'}\nDescription: ${d.description || '—'}\nDate: ${formatDate(r.createdAt)}`);
};

// ===== STATISTICS =====

async function loadStatistics() {
    const { sector, cell } = getCellLocation();
    try {
        const params = new URLSearchParams({ type: 'case', sector, cell });
        const resp  = await fetch('/api/citizen-reports?' + params);
        const cases = await resp.json();
        document.getElementById('totalCases').textContent     = cases.length;
        document.getElementById('pendingCases').textContent   = cases.filter(r => { const s = (r.data || {}).status || ''; return s === 'pending' || s === 'Pending' || s === 'In Progress'; }).length;
        document.getElementById('solvedCases').textContent    = cases.filter(r => { const s = (r.data || {}).status || ''; return s === 'Solved' || s === 'resolved'; }).length;
        document.getElementById('escalatedCases').textContent = cases.filter(r => (r.data || {}).level === 'Sector').length;
    } catch (err) {
        console.error('loadStatistics error:', err);
    }
}

// ===== MEMBER REGISTRATIONS =====

async function loadCellRegistrations() {
    const { sector, cell } = getCellLocation();
    const tbody = document.getElementById('cellRegistrationsBody');
    try {
        const params = new URLSearchParams({ sector, cell });
        const resp   = await fetch('/api/members?' + params);
        const members = await resp.json();
        _cellRegistrationsCache = members;

        // Populate village filter
        const villages = [...new Set(members.map(m => m.village).filter(Boolean))].sort();
        const villageFilter = document.getElementById('cellRegVillageFilter');
        if (villageFilter) {
            villageFilter.innerHTML = '<option value="">All Villages</option>' +
                villages.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
        }

        renderCellRegistrations(members);
    } catch (err) {
        tbody.innerHTML = emptyRow(10, 'fa-triangle-exclamation', 'Could not load members', err.message, 'error');
    }
}

function filterCellRegistrations() {
    const search  = (document.getElementById('cellRegSearch')?.value  || '').toLowerCase();
    const village = (document.getElementById('cellRegVillageFilter')?.value || '');
    const status  = (document.getElementById('cellRegStatusFilter')?.value  || '');

    let filtered = _cellRegistrationsCache;
    if (search)  filtered = filtered.filter(m => (m.name || '').toLowerCase().includes(search));
    if (village) filtered = filtered.filter(m => m.village === village);
    if (status)  filtered = filtered.filter(m => m.status === status);
    renderCellRegistrations(filtered);
}
window.filterCellRegistrations = filterCellRegistrations;

function renderCellRegistrations(members) {
    const total   = members.length;
    const current = members.filter(m => m.status === 'Current Member').length;
    const newM    = members.filter(m => m.status === 'New Member').length;
    const male    = members.filter(m => (m.sex || '').toLowerCase() === 'male').length;
    const female  = members.filter(m => (m.sex || '').toLowerCase() === 'female').length;

    document.getElementById('cellRegTotal').textContent   = total;
    document.getElementById('cellRegCurrent').textContent = current;
    document.getElementById('cellRegNew').textContent     = newM;
    document.getElementById('cellRegGender').textContent  = `${male}M / ${female}F`;

    const tbody = document.getElementById('cellRegistrationsBody');
    if (!members.length) {
        tbody.innerHTML = emptyRow(10, 'fa-users', 'No members found', 'No registered members match the current filters.');
        return;
    }
    tbody.innerHTML = members.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(m.name || '—')}</td>
            <td>${escapeHtml(m.sex  || '—')}</td>
            <td>${m.age  || '—'}</td>
            <td>${escapeHtml(m.telephone || '—')}</td>
            <td>${escapeHtml(m.sector  || '—')}</td>
            <td>${escapeHtml(m.cell    || '—')}</td>
            <td>${escapeHtml(m.village || '—')}</td>
            <td>${memberRoleBadge(m.status)}</td>
            <td>${formatDate(m.createdAt)}</td>
        </tr>
    `).join('');
}

// ===== ATTENDANCE TABS =====

function setupCellAttendanceTabs() {
    const tabs = document.querySelectorAll('.sub-analytics-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById('atab-' + tab.dataset.atab);
            if (panel) panel.classList.add('active');
        });
    });
}

// ===== UMUGANDA ANALYTICS =====

async function loadCellUmugandaAnalytics() {
    const { sector, cell } = getCellLocation();
    const dateFilter = document.getElementById('cuga-dateFilter')?.value || '';
    const params = new URLSearchParams({ sector, cell });
    if (dateFilter) params.set('date', dateFilter);
    try {
        const resp    = await fetch('/api/attendance?' + params);
        const records = await resp.json();
        const present = records.filter(r => (r.status || '').toLowerCase() === 'present');
        const absent  = records.filter(r => (r.status || '').toLowerCase() === 'absent');
        const rate    = records.length ? Math.round((present.length / records.length) * 100) : 0;

        document.getElementById('cuga-total').textContent   = records.length;
        document.getElementById('cuga-present').textContent = present.length;
        document.getElementById('cuga-absent').textContent  = absent.length;
        document.getElementById('cuga-rate').textContent    = rate + '%';

        const rowHtml = arr => arr.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(r.name    || '—')}</td>
                <td>${escapeHtml(r.sex     || '—')}</td>
                <td>${r.age               || '—'}</td>
                <td>${escapeHtml(r.sector  || '—')}</td>
                <td>${escapeHtml(r.cell    || '—')}</td>
                <td>${escapeHtml(r.village || '—')}</td>
                <td>${escapeHtml(r.telephone || '—')}</td>
                <td>${r.attendanceDate || formatDate(r.date || r.createdAt)}</td>
            </tr>
        `).join('');

        document.getElementById('cuga-present-tbody').innerHTML = present.length ? rowHtml(present) : emptyRow(9, 'fa-user-check', 'No present records', 'No members were marked present for this period.');
        document.getElementById('cuga-absent-tbody').innerHTML  = absent.length  ? rowHtml(absent)  : emptyRow(9, 'fa-user-xmark', 'No absent records', 'No absentees recorded for this period.');
    } catch (err) {
        console.error('loadCellUmugandaAnalytics error:', err);
    }
}
window.loadCellUmugandaAnalytics = loadCellUmugandaAnalytics;

// ===== INTEKO ANALYTICS =====

async function loadCellIntekoAnalytics() {
    const { sector, cell } = getCellLocation();
    const dateFilter = document.getElementById('cint-dateFilter')?.value || '';
    const params = new URLSearchParams({ sector, cell });
    if (dateFilter) params.set('attendanceDate', dateFilter);
    try {
        const resp    = await fetch('/api/inteko-attendance?' + params);
        const records = await resp.json();
        const present = records.filter(r => (r.status || '').toLowerCase() === 'present');
        const absent  = records.filter(r => (r.status || '').toLowerCase() === 'absent');
        const rate    = records.length ? Math.round((present.length / records.length) * 100) : 0;

        document.getElementById('cint-total').textContent   = records.length;
        document.getElementById('cint-present').textContent = present.length;
        document.getElementById('cint-absent').textContent  = absent.length;
        document.getElementById('cint-rate').textContent    = rate + '%';

        const rowHtml = arr => arr.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(r.name    || '—')}</td>
                <td>${escapeHtml(r.sex     || '—')}</td>
                <td>${r.age               || '—'}</td>
                <td>${escapeHtml(r.sector  || '—')}</td>
                <td>${escapeHtml(r.cell    || '—')}</td>
                <td>${escapeHtml(r.village || '—')}</td>
                <td>${escapeHtml(r.telephone || '—')}</td>
                <td>${r.attendanceDate || formatDate(r.date || r.createdAt)}</td>
            </tr>
        `).join('');

        document.getElementById('cint-present-tbody').innerHTML = present.length ? rowHtml(present) : emptyRow(9, 'fa-user-check', 'No present records', 'No members were marked present for this period.');
        document.getElementById('cint-absent-tbody').innerHTML  = absent.length  ? rowHtml(absent)  : emptyRow(9, 'fa-user-xmark', 'No absent records', 'No absentees recorded for this period.');
    } catch (err) {
        console.error('loadCellIntekoAnalytics error:', err);
    }
}
window.loadCellIntekoAnalytics = loadCellIntekoAnalytics;

// ===== INFRA / VISITORS TABS =====

function setupCellInfraVisitorsTabs() {
    const section = document.getElementById('infra-visitors');
    if (!section) return;
    const tabBtns = section.querySelectorAll('.tab-btn');
    const panels  = section.querySelectorAll('.home-update-form');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            panels.forEach(p => {
                p.classList.remove('active');
                if (p.id === 'tab-' + btn.dataset.tab) p.classList.add('active');
            });
        });
    });
}

async function loadCellInfraVisitors() {
    const { sector, cell } = getCellLocation();
    const params = `sector=${encodeURIComponent(sector)}&cell=${encodeURIComponent(cell)}`;

    try {
        const [infraResp, visitorResp, membersResp] = await Promise.all([
            fetch(`/api/leader-reports?type=infrastructure&${params}`),
            fetch(`/api/citizen-reports?type=visitor&${params}`),
            fetch(`/api/members?${params}`)
        ]);
        const [infra, visitors, members] = await Promise.all([
            infraResp.ok    ? infraResp.json()    : [],
            visitorResp.ok  ? visitorResp.json()  : [],
            membersResp.ok  ? membersResp.json()  : []
        ]);

        // Infrastructure
        const infraBody = document.getElementById('cellInfraBody');
        infraBody.innerHTML = infra.length
            ? infra.map((r, i) => {
                const d = r.data || {};
                return `<tr>
                    <td>${i + 1}</td>
                    <td>${escapeHtml(d.place || '—')}</td>
                    <td>${d.date ? formatDate(d.date) : '—'}</td>
                    <td>${escapeHtml(d.description || '—')}</td>
                    <td>${escapeHtml(r.reportedBy || '—')}</td>
                    <td>${formatDate(r.createdAt)}</td>
                </tr>`;
            }).join('')
            : emptyRow(6, 'fa-road', 'No infrastructure reports', 'Reported road or facility damage in your cell will appear here.');

        // Visitors
        const now      = new Date();
        const thisMonth = visitors.filter(r => {
            const d = new Date(r.createdAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        document.getElementById('cellVisitorTotal').textContent = visitors.length;
        document.getElementById('cellVisitorMonth').textContent = thisMonth.length;
        const visBody = document.getElementById('cellVisitorBody');
        visBody.innerHTML = visitors.length
            ? visitors.map((r, i) => {
                const d = r.data || {};
                return `<tr>
                    <td>${i + 1}</td>
                    <td>${escapeHtml(d.visitorNames || d.name || '—')}</td>
                    <td>${d.count || '—'}</td>
                    <td>${escapeHtml(d.from || d.province || '—')}</td>
                    <td>${escapeHtml(d.reason || '—')}</td>
                    <td>${d.returnDate ? formatDate(d.returnDate) : '—'}</td>
                    <td>${escapeHtml(d.hostLocation || d.village || '—')}</td>
                    <td>${escapeHtml(r.reportedBy || '—')}</td>
                    <td>${formatDate(r.createdAt)}</td>
                </tr>`;
            }).join('')
            : emptyRow(9, 'fa-user-group', 'No visitor reports', 'Guest and visitor reports submitted in your cell will appear here.');
    } catch (err) {
        console.error('loadCellInfraVisitors error:', err);
    }
}
window.loadCellInfraVisitors = loadCellInfraVisitors;

// ===== AUTO-REFRESH =====

function setupAutoRefresh() {
    setInterval(async () => {
        await loadCaseTable();
        await loadStatistics();
    }, 30000);
}

// ===== HELPERS =====

function truncateDescCell(text, len) {
    if (!text) return '—';
    return text.length <= len ? escapeHtml(text) : escapeHtml(text.slice(0, len)) + '…';
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function roleLabel(role) {
    return { leader: 'Village Leader', cell: 'Cell Leader', sector: 'Sector Leader', citizen: 'Citizen' }[role] || role;
}

function capitalize(s) {
    s = String(s || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}

// Lightbox for case evidence images
window.viewEvidenceModal = function (src) {
    const old = document.getElementById('evidenceModal');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'evidenceModal';
    overlay.className = 'evidence-modal-overlay';
    overlay.innerHTML = `
        <div class="evidence-modal">
            <button class="evidence-modal-close" aria-label="Close">&times;</button>
            <img src="${src}" alt="Case evidence">
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
        if (e.target === overlay || e.target.classList.contains('evidence-modal-close')) overlay.remove();
    });
};

// Advanced empty-state row for tables
function emptyRow(colspan, icon, title, subtitle = '', variant = '') {
    return `<tr class="empty-row"><td colspan="${colspan}">
        <div class="empty-state ${variant}">
            <i class="fa-solid ${icon}"></i>
            <p class="empty-title">${escapeHtml(title)}</p>
            ${subtitle ? `<p class="empty-sub">${escapeHtml(subtitle)}</p>` : ''}
        </div>
    </td></tr>`;
}

// Coloured pill badge
function badge(text, variant) {
    return `<span class="badge badge-${variant}">${escapeHtml(text)}</span>`;
}

function memberRoleBadge(role) {
    const r = (role || '').toLowerCase();
    if (r === 'current member') return badge('Current Member', 'success');
    if (r === 'new member')     return badge('New Member', 'info');
    return badge(role || '—', 'neutral');
}


// ===== HOME UPDATES TABS =====

function setupHomeUpdatesTabs() {
    const section = document.getElementById('homeupdates');
    if (!section) return;
    const tabBtns = section.querySelectorAll('.tab-btn');
    const forms   = section.querySelectorAll('.home-update-form');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            forms.forEach(f => {
                f.classList.remove('active');
                if (f.id === 'tab-' + tab) f.classList.add('active');
            });
        });
    });
}

function setupHomeUpdateForms() {
    const today = new Date().toISOString().slice(0, 10);
    ['cellActivityDate', 'cellUpcomingDate', 'cellTrendingDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = today;
    });
}

function getCurrentCellLeaderName() {
    const u = JSON.parse(sessionStorage.getItem('currentUser'));
    return u ? (u.name || u.email) : 'Cell Leader';
}

// Home updates use localStorage (home-updates API requires multipart/Cloudinary upload)
function postHomeUpdateLocal(storageKey, item) {
    const list = JSON.parse(localStorage.getItem(storageKey)) || [];
    list.push({ id: Date.now(), ...item });
    localStorage.setItem(storageKey, JSON.stringify(list));
    return true;
}

function readImageAsDataUrlCell(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload  = () => compressImageDataUrlCell(reader.result, 800, 0.8).then(resolve).catch(() => resolve(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function compressImageDataUrlCell(dataUrl, maxWidth, quality) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            try { resolve(canvas.toDataURL('image/jpeg', quality)); } catch { resolve(dataUrl); }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// Post a home update to MongoDB (multipart so the backend uploads the image to Cloudinary).
async function postHomeUpdateToDB(fields, file) {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v ?? ''));
    if (file) fd.append('image', file);
    const resp = await fetch('/api/home-updates', { method: 'POST', body: fd });
    if (!resp.ok) throw new Error('Server returned ' + resp.status);
    return resp.json();
}

async function handleCellActivitySubmit(e) {
    e.preventDefault();
    const place = document.getElementById('cellActivityPlace').value.trim();
    const file  = document.getElementById('cellActivityImage')?.files?.[0];
    try {
        await postHomeUpdateToDB({
            type: 'activity',
            title: place,
            description: document.getElementById('cellActivityDesc').value.trim(),
            place,
            date: document.getElementById('cellActivityDate').value,
            postedBy: getCurrentCellLeaderName()
        }, file);
        e.target.reset();
        document.getElementById('cellActivityDate').value = new Date().toISOString().slice(0, 10);
        loadCellHomeUpdatesList();
        alert('Activity posted! It will appear on the home page.');
    } catch (err) {
        alert('Could not post activity: ' + err.message);
    }
}

async function handleCellUpcomingSubmit(e) {
    e.preventDefault();
    try {
        await postHomeUpdateToDB({
            type: 'upcoming',
            title: document.getElementById('cellUpcomingTitle').value.trim(),
            description: document.getElementById('cellUpcomingDesc').value.trim(),
            place: document.getElementById('cellUpcomingPlace').value.trim(),
            date: document.getElementById('cellUpcomingDate').value,
            postedBy: getCurrentCellLeaderName()
        });
        e.target.reset();
        document.getElementById('cellUpcomingDate').value = new Date().toISOString().slice(0, 10);
        loadCellHomeUpdatesList();
        alert('Upcoming session posted!');
    } catch (err) {
        alert('Could not post upcoming session: ' + err.message);
    }
}

async function handleCellTrendingSubmit(e) {
    e.preventDefault();
    try {
        await postHomeUpdateToDB({
            type: 'trending',
            title: document.getElementById('cellTrendingPlace').value.trim(),
            description: document.getElementById('cellTrendingDesc').value.trim(),
            place: document.getElementById('cellTrendingPlace').value.trim(),
            date: document.getElementById('cellTrendingDate').value,
            postedBy: getCurrentCellLeaderName()
        });
        e.target.reset();
        document.getElementById('cellTrendingDate').value = new Date().toISOString().slice(0, 10);
        loadCellHomeUpdatesList();
        alert('Trending topic posted!');
    } catch (err) {
        alert('Could not post trending topic: ' + err.message);
    }
}

async function loadCellHomeUpdatesList() {
    const listEl = document.getElementById('cellHomeUpdatesList');
    if (!listEl) return;
    const myName = getCurrentCellLeaderName();
    let updates = [];
    try {
        const resp = await fetch('/api/home-updates');
        updates = resp.ok ? await resp.json() : [];
    } catch { updates = []; }

    const typeLabel = t => ({ activity: 'Activity', upcoming: 'Upcoming', trending: 'Trending' }[t] || t);
    const mine = updates
        .filter(u => (u.postedBy || '') === myName)
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
        .slice(0, 15);

    if (!mine.length) {
        listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bullhorn"></i><p class="empty-title">No posts yet</p><p class="empty-sub">Use the forms above to post activities, sessions or trending topics.</p></div>';
        return;
    }
    listEl.innerHTML = '<ul class="simple-list">' +
        mine.map(item => {
            const text = item.title || item.description || '';
            return `<li><strong>${typeLabel(item.type)}</strong> — ${formatDate(item.date || item.createdAt)}: ${escapeHtml(text.slice(0, 60))}${text.length > 60 ? '…' : ''}</li>`;
        }).join('') +
        '</ul>';
}

// ===== CHAT =====

let cellReplyTarget = null;

async function handleCellChatSubmit(e) {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const toRole      = document.getElementById('cellChatRecipientRole').value;
    const messageText = document.getElementById('cellChatMessage').value.trim();

    if (toRole === 'citizen' && !cellReplyTarget) { alert('Select a citizen to reply to from the list below.'); return; }
    if (!messageText) { alert('Please enter a message.'); return; }

    try {
        const resp = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromName:  currentUser.name,
                fromEmail: currentUser.email,
                fromRole:  'cell',
                toRole,
                toEmail: cellReplyTarget ? cellReplyTarget.email : null,
                toName:  cellReplyTarget ? cellReplyTarget.name  : null,
                text: messageText
            })
        });
        if (!resp.ok) throw new Error('Server returned ' + resp.status);
        e.target.reset();
        cellReplyTarget = null;
        loadCellChatMessages();
    } catch (err) {
        alert('Could not send message: ' + err.message);
    }
}

async function _fetchCellMessages() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    try {
        const resp = await fetch('/api/messages?email=' + encodeURIComponent(currentUser.email));
        return resp.ok ? await resp.json() : [];
    } catch { return []; }
}

async function loadCellChatMessages() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages    = await _fetchCellMessages();
    const container   = document.getElementById('cellChatMessages');
    if (!container) return;
    if (!messages.length) { container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-comments"></i><p class="empty-title">No conversation yet</p><p class="empty-sub">Send a message above to start a conversation.</p></div>'; return; }
    container.innerHTML = messages
        .sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp))
        .map(m => {
            const isMe  = m.fromEmail === currentUser.email;
            const other = isMe ? (m.toName || roleLabel(m.toRole)) : (m.fromName || roleLabel(m.fromRole));
            return `
                <div class="chat-message ${isMe ? 'chat-message-me' : 'chat-message-other'}">
                    <div class="chat-meta">
                        <span class="chat-direction">${isMe ? 'You → ' + other : other + ' → You'}</span>
                        <span class="chat-time">${formatDateTime(m.createdAt || m.timestamp)}</span>
                    </div>
                    <div class="chat-text">${escapeHtml(m.text)}</div>
                </div>
            `;
        }).join('');
}

async function loadCellInbox() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages    = await _fetchCellMessages();
    const incoming    = messages.filter(m => m.toEmail === currentUser.email && m.fromRole === 'citizen');
    const byCitizen   = {};
    incoming.forEach(m => {
        const t = m.createdAt || m.timestamp;
        const prev = byCitizen[m.fromEmail];
        if (!prev || new Date(t) > new Date(prev.createdAt || prev.timestamp)) byCitizen[m.fromEmail] = m;
    });
    const tbody   = document.getElementById('cellInboxBody');
    if (!tbody) return;
    const entries = Object.values(byCitizen);
    if (!entries.length) { tbody.innerHTML = emptyRow(4, 'fa-inbox', 'No messages yet', 'Citizens who message you will appear here.'); return; }
    tbody.innerHTML = entries
        .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
        .map(m => `
            <tr>
                <td>${escapeHtml(m.fromName || m.fromEmail)}</td>
                <td>${escapeHtml(m.fromPhone || 'N/A')}</td>
                <td>${formatDateTime(m.createdAt || m.timestamp)}</td>
                <td><button class="btn btn-secondary" onclick="replyToCitizenFromCell('${m.fromEmail.replace(/'/g, "\\'")}', '${escapeHtml(m.fromName || '')}')">Reply</button></td>
            </tr>
        `).join('');
}

window.replyToCitizenFromCell = function (email, name) {
    cellReplyTarget = { email, name };
    const roleSelect = document.getElementById('cellChatRecipientRole');
    if (roleSelect) roleSelect.value = 'citizen';
    const msgInput = document.getElementById('cellChatMessage');
    if (msgInput) msgInput.focus();
};
