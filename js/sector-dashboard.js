// Sector Level Dashboard JavaScript

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser || currentUser.userType !== 'sector') {
        window.location.href = 'login.html';
        return;
    }

    initializeDashboard();
});

function initializeDashboard() {
    // Navigation
    setupNavigation();
    
    // Forms
    setupForms();
    
    // Load data
    loadAllData();
    
    // Setup auto-refresh for cases
    setupAutoRefresh();
}

// Navigation between sections
function setupNavigation() {
    const menuLinks = document.querySelectorAll('.dashboard-menu a');
    const sections = document.querySelectorAll('.dashboard-section');

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            
            // Update active states
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('currentUser');
        window.location.href = 'home.html';
    });
}

// Setup forms
function setupForms() {
    document.getElementById('resolveCaseForm').addEventListener('submit', handleCaseResolution);

    const sectorChatForm = document.getElementById('sectorChatForm');
    if (sectorChatForm) {
        sectorChatForm.addEventListener('submit', handleSectorChatSubmit);
    }
    const sectorActivityForm = document.getElementById('sectorActivityForm');
    if (sectorActivityForm) sectorActivityForm.addEventListener('submit', handleSectorActivitySubmit);
    const sectorUpcomingForm = document.getElementById('sectorUpcomingForm');
    if (sectorUpcomingForm) sectorUpcomingForm.addEventListener('submit', handleSectorUpcomingSubmit);
    const sectorTrendingForm = document.getElementById('sectorTrendingForm');
    if (sectorTrendingForm) sectorTrendingForm.addEventListener('submit', handleSectorTrendingSubmit);
}

// Load all data
async function loadAllData() {
    await loadCaseTable();
    await loadActivities();
    await loadReports();
    await loadStatistics();
    await loadSectorBreakdown();
    await updateCaseSelect();
    loadSectorChatMessages();
    loadSectorInbox();
    setupHomeUpdatesTabs();
    setupHomeUpdateForms();
    await loadSectorHomeUpdatesList();
}

// Normalise a location/level string for tolerant matching (trim + case-insensitive)
function normLoc(s) { return (s || '').trim().toLowerCase(); }

// A case is "at sector level" if explicitly marked Sector, or it carries any
// signal that a cell escalated/handed it to the sector. Used for the resolve action.
function atSectorLevel(d) {
    if (!d) return false;
    return normLoc(d.level) === 'sector'
        || !!d.escalatedToSectorAt
        || !!d.sectorResolutionDate
        || normLoc(d.status) === 'escalated';
}

// A case is visible to the sector if it has reached AT LEAST cell level
// (handled by a cell or escalated up). This includes solved cases, so the
// sector sees the full history of cases that came up from cell level.
function reachedCellLevel(d) {
    if (!d) return false;
    const lvl = normLoc(d.level);
    return lvl === 'cell' || lvl === 'sector'
        || !!d.escalatedToCellAt || !!d.escalatedToSectorAt
        || !!d.cellResolutionDate || !!d.sectorResolutionDate
        || normLoc(d.status) === 'escalated';
}

// Is this case still open (i.e. the sector can act on it)?
function isOpenCase(d) {
    return !['solved', 'resolved', 'referred'].includes(normLoc(d && d.status));
}

// ===== Detail modal (replaces raw alert() popups) =====
function detailRow(label, value) {
    const v = (value === null || value === undefined || value === '') ? '—' : value;
    return `<div class="detail-row"><span class="detail-label">${escapeHtml(label)}</span><span class="detail-value">${escapeHtml(v)}</span></div>`;
}
function showDetailModal(title, bodyHtml) {
    const old = document.getElementById('detailModal');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'detailModal';
    overlay.className = 'detail-modal-overlay';
    overlay.innerHTML = `
        <div class="detail-modal" role="dialog" aria-modal="true">
            <div class="detail-modal-head">
                <h3>${escapeHtml(title)}</h3>
                <button class="detail-modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="detail-modal-body">${bodyHtml}</div>
        </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.detail-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
}

// Load escalated cases
async function loadCaseTable() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        
        // Fetch citizen reports with type 'case' from the database
        const response = await fetch('/api/citizen-reports?type=case');
        const records = await response.json();
        
        // Show ALL cases from cell level in this sector — escalated AND solved.
        // NOTE: status/level live inside record.data (not on the top-level record).
        const sectorCases = records.filter(record =>
            normLoc(record.data?.sector) === normLoc(currentUser.sector) &&
            reachedCellLevel(record.data)
        );
    
    const tbody = document.getElementById('caseTableBody');
    
    if (sectorCases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align: center;">No cases from cell level yet.</td></tr>';
        return;
    }
    
    tbody.innerHTML = sectorCases.map(record => {
        const data = record.data || {};
        const status = data.status || 'Pending';
        const level  = data.level  || 'Village';
        const statusClass = (status === 'Solved' || status === 'resolved') ? 'status-solved' :
                           (status === 'Escalated' || status === 'Referred') ? 'status-escalated' :
                           status === 'In Progress' ? 'status-in-progress' : 'status-pending';
        const levelClass = level === 'Cell' ? 'status-in-progress' :
                           level === 'Sector' ? 'status-escalated' : 'status-pending';
        const countdown = calculateCountdown(record);
        const shortId = record._id ? record._id.slice(-6) : '—';
        const desc = data.description || '';

        return `
            <tr>
                <td>#${shortId}</td>
                <td>${escapeHtml(data.plaintiff || '—')}</td>
                <td>${escapeHtml(data.defendant || '—')}</td>
                <td>${escapeHtml(data.cell || '—')}</td>
                <td>${escapeHtml(data.village || '—')}</td>
                <td>${escapeHtml(data.leaderName || '—')}</td>
                <td>${escapeHtml(desc.substring(0, 50))}${desc.length > 50 ? '…' : ''}</td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(status)}</span></td>
                <td><span class="status-badge ${levelClass}">${escapeHtml(level)}</span></td>
                <td>${data.escalatedDate ? formatDate(data.escalatedDate) : formatDate(data.caseDate || data.dateReported)}</td>
                <td>
                    <div class="countdown-timer" data-case-id="${record._id}" data-resolution-date="${data.sectorResolutionDate || data.expectedResolutionDate || ''}">
                        ${countdown}
                    </div>
                </td>
                <td>
                    <button class="btn btn-secondary" onclick="viewCaseDetails('${record._id}')">View</button>
                    ${(atSectorLevel(data) && isOpenCase(data)) ?
                        `<button class="btn btn-primary" onclick="selectCaseForResolution('${record._id}')">Resolve</button>` :
                        ''}
                </td>
            </tr>
        `;
    }).join('');
    
    // Start countdown updates
    startCountdownUpdates();
    } catch (err) {
        console.error('Error loading cases:', err);
        const tbody = document.getElementById('caseTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; color: red;">Error loading cases</td></tr>';
        }
    }
}

// Calculate countdown timer
function calculateCountdown(record) {
    const data = record.data || record;
    
    if (data.status === 'Solved') {
        return '<span class="countdown-expired">Solved</span>';
    }
    
    const resolutionDate = data.sectorResolutionDate || data.expectedResolutionDate;
    if (!resolutionDate) {
        return '<span class="countdown-error">No date set</span>';
    }
    
    const now = new Date();
    const resolutionDateObj = new Date(resolutionDate);
    const diff = resolutionDateObj - now;
    
    if (diff <= 0) {
        return '<span class="countdown-expired">Time Expired</span>';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let countdownHtml = '';
    if (days > 0) {
        countdownHtml = `<span class="countdown-days">${days}d</span> `;
    }
    if (hours > 0 || days > 0) {
        countdownHtml += `<span class="countdown-hours">${hours}h</span> `;
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        countdownHtml += `<span class="countdown-minutes">${minutes}m</span> `;
    }
    countdownHtml += `<span class="countdown-seconds">${seconds}s</span>`;
    
    const warningClass = diff < (24 * 60 * 60 * 1000) ? 'countdown-warning' : '';
    
    return `<div class="countdown-display ${warningClass}">${countdownHtml}</div>`;
}

// Start countdown updates
let countdownInterval = null;
function startCountdownUpdates() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/citizen-reports?type=case');
            const records = await response.json();
            
            const timers = document.querySelectorAll('.countdown-timer');
            timers.forEach(timer => {
                const caseId = timer.dataset.caseId;
                const resolutionDate = timer.dataset.resolutionDate;
                
                const record = records.find(r => r._id === caseId);
                
                if (record && record.data?.status !== 'Solved') {
                    const now = new Date();
                    const resolutionDateObj = new Date(resolutionDate);
                    const diff = resolutionDateObj - now;
                    
                    if (diff <= 0) {
                        timer.innerHTML = '<span class="countdown-expired">Time Expired</span>';
                    } else {
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                        
                        let countdownHtml = '';
                        if (days > 0) {
                            countdownHtml = `<span class="countdown-days">${days}d</span> `;
                        }
                        if (hours > 0 || days > 0) {
                            countdownHtml += `<span class="countdown-hours">${hours}h</span> `;
                        }
                        if (minutes > 0 || hours > 0 || days > 0) {
                            countdownHtml += `<span class="countdown-minutes">${minutes}m</span> `;
                        }
                        countdownHtml += `<span class="countdown-seconds">${seconds}s</span>`;
                        
                        const warningClass = diff < (24 * 60 * 60 * 1000) ? 'countdown-warning' : '';
                        timer.innerHTML = `<div class="countdown-display ${warningClass}">${countdownHtml}</div>`;
                    }
                } else {
                    timer.innerHTML = '<span class="countdown-expired">Solved</span>';
                }
            });
        } catch (err) {
            console.error('Error updating countdown:', err);
        }
    }, 1000);
}

// Handle case resolution
async function handleCaseResolution(e) {
    e.preventDefault();
    
    try {
        const caseId = document.getElementById('resolveCaseId').value;
        const resolutionDays = parseInt(document.getElementById('sectorResolutionDays').value);
        const resolutionDate = document.getElementById('sectorResolutionDate').value;
        const resolutionNotes = document.getElementById('sectorResolutionNotes').value;
        const status = document.getElementById('sectorCaseStatus').value;
        
        if (!caseId) {
            alert('Please select a case');
            return;
        }
        
        // Fetch the case from the database
        const response = await fetch(`/api/citizen-reports?type=case`);
        const records = await response.json();
        const record = records.find(r => r._id === caseId);
        
        if (!record) {
            alert('Case not found');
            return;
        }
        
        // Update case data
        const data = record.data || {};
        data.status = status;
        data.sectorResolutionDays = resolutionDays;
        data.sectorResolutionDate = new Date(resolutionDate).toISOString();
        data.sectorResolutionNotes = resolutionNotes;
        data.sectorResolvedBy = JSON.parse(sessionStorage.getItem('currentUser')).name;
        data.sectorResolvedDate = new Date().toISOString();
        
        // If referring to authorities
        if (status === 'Referred to Authorities') {
            data.status = 'Referred';
            data.referredDate = new Date().toISOString();
        }
        
        // Update in database
        const updateResponse = await fetch(`/api/citizen-reports/${caseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data })
        });
        
        if (!updateResponse.ok) {
            throw new Error('Failed to update case');
        }
        
        e.target.reset();
        await loadCaseTable();
        await updateCaseSelect();
        await loadStatistics();
        
        alert(`Case ${status === 'Solved' ? 'marked as solved' : status === 'Referred to Authorities' ? 'referred to authorities' : 'updated'}!`);
    } catch (err) {
        console.error('Error resolving case:', err);
        alert('Error updating case: ' + err.message);
    }
}

// Update case select dropdown
async function updateCaseSelect() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        
        const response = await fetch('/api/citizen-reports?type=case');
        const records = await response.json();
        
        const sectorCases = records.filter(record =>
            atSectorLevel(record.data) &&
            normLoc(record.data?.status) !== 'solved' &&
            normLoc(record.data?.sector) === normLoc(currentUser.sector)
        );

        const select = document.getElementById('resolveCaseId');
        select.innerHTML = '<option value="">Select a case to resolve</option>' +
            sectorCases.map(record => 
                `<option value="${record._id}">Case #${record.data?.id || '?'} - ${record.data?.plaintiff || '?'} vs ${record.data?.defendant || '?'}</option>`
            ).join('');
    } catch (err) {
        console.error('Error updating case select:', err);
    }
}

// Select case for resolution
window.selectCaseForResolution = function(caseId) {
    document.getElementById('resolveCaseId').value = caseId;
    document.getElementById('resolveCaseId').scrollIntoView({ behavior: 'smooth' });
};

// View case details
window.viewCaseDetails = async function(caseId) {
    try {
        const response = await fetch('/api/citizen-reports?type=case');
        const records = await response.json();
        const record = records.find(r => r._id === caseId);
        
        if (record) {
            const d = record.data || {};
            const escalated = d.escalatedDate ? formatDate(d.escalatedDate)
                            : (d.escalatedToSectorAt ? formatDate(d.escalatedToSectorAt) : 'N/A');
            const body = `
                <div class="detail-grid">
                    <p class="detail-section-title">Parties</p>
                    ${detailRow('Plaintiff', d.plaintiff)}
                    ${detailRow('Defendant', d.defendant)}
                    ${detailRow('Original Leader', d.leaderName)}
                    <p class="detail-section-title">Location</p>
                    ${detailRow('Village', d.village)}
                    ${detailRow('Cell', d.cell)}
                    ${detailRow('Sector', d.sector)}
                    <p class="detail-section-title">Status</p>
                    ${detailRow('Status', d.status)}
                    ${detailRow('Level', d.level)}
                    ${detailRow('Case Date', d.caseDate ? formatDate(d.caseDate) : 'N/A')}
                    ${detailRow('Escalated to Sector', escalated)}
                </div>
                <p class="detail-section-title">Description</p>
                <p class="detail-text">${escapeHtml(d.description || '—')}</p>
                ${d.cellResolutionNotes ? `<p class="detail-section-title">Cell Resolution Notes</p><p class="detail-text">${escapeHtml(d.cellResolutionNotes)}</p>` : ''}
                ${d.sectorResolutionNotes ? `<p class="detail-section-title">Sector Resolution Notes</p><p class="detail-text">${escapeHtml(d.sectorResolutionNotes)}</p>` : ''}
            `;
            showDetailModal('Case #' + (d.id || record._id.slice(-6)), body);
        }
    } catch (err) {
        console.error('Error viewing case details:', err);
    }
};

// Load activities
async function loadActivities() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const sector = currentUser.sector || '';
        const q = 'sector=' + encodeURIComponent(sector);

        // Real attendance (umuganda + inteko), registrations and reports for this sector
        const [umuganda, inteko, members, reports] = await Promise.all([
            fetch('/api/attendance?' + q).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/inteko-attendance?' + q).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/members?' + q).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/citizen-reports').then(r => r.ok ? r.json() : []).catch(() => [])
        ]);

        const countPresent = arr => arr.filter(r => (r.status || '').toLowerCase() === 'present').length;
        const countAbsent  = arr => arr.filter(r => (r.status || '').toLowerCase() === 'absent').length;
        const rateOf       = arr => arr.length ? Math.round((countPresent(arr) / arr.length) * 100) : 0;

        const attendanceCard = (arr) => `
            <div class="metric-lead"><span class="metric-num">${rateOf(arr)}%</span><span class="metric-cap">attendance rate</span></div>
            <div class="metric-breakdown">
                <span><i class="fa-solid fa-user-check stat-present"></i> ${countPresent(arr)} present</span>
                <span><i class="fa-solid fa-user-xmark stat-absent"></i> ${countAbsent(arr)} absent</span>
                <span><i class="fa-solid fa-list-ol"></i> ${arr.length} records</span>
            </div>`;

        document.getElementById('umugandaSummary').innerHTML = attendanceCard(umuganda);
        document.getElementById('intekoSummary').innerHTML   = attendanceCard(inteko);

        const newMembers = members.filter(r => r.status === 'New Member').length;
        document.getElementById('registrationSummary').innerHTML = `
            <div class="metric-lead"><span class="metric-num">${members.length}</span><span class="metric-cap">registered members</span></div>
            <div class="metric-breakdown">
                <span><i class="fa-solid fa-user-plus stat-present"></i> ${newMembers} new</span>
                <span><i class="fa-solid fa-user-check"></i> ${members.length - newMembers} current</span>
            </div>`;

        const drugsRecords    = reports.filter(r => r.type === 'drugs'    && normLoc(r.data?.sector) === normLoc(sector));
        const violenceRecords = reports.filter(r => r.type === 'violence' && normLoc(r.data?.sector) === normLoc(sector));
        document.getElementById('reportsSummary').innerHTML = `
            <div class="metric-lead"><span class="metric-num">${drugsRecords.length + violenceRecords.length}</span><span class="metric-cap">total reports</span></div>
            <div class="metric-breakdown">
                <span><i class="fa-solid fa-wine-bottle"></i> ${drugsRecords.length} drugs</span>
                <span><i class="fa-solid fa-triangle-exclamation"></i> ${violenceRecords.length} violence</span>
            </div>`;
    } catch (err) {
        console.error('Error loading activities:', err);
    }
}

function truncateDescSector(text, len) {
    if (!text) return '—';
    return text.length <= len ? escapeHtml(text) : escapeHtml(text.slice(0, len)) + '…';
}

// Load reports (full details – visible automatically from citizens & village leaders)
async function loadReports() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const reportedByLabel = (r) => r.reportedBy || r.data?.reportedBy || '—';
        
        // Fetch reports from both citizens and village leaders
        const [crReports, lrReports] = await Promise.all([
            fetch('/api/citizen-reports').then(r => r.json()).catch(() => []),
            fetch('/api/leader-reports').then(r => r.json()).catch(() => [])
        ]);
        const reports = [...crReports, ...lrReports];

        // Filter by sector and type
        const sectorDrugs = reports.filter(r =>
            r.type === 'drugs' &&
            normLoc(r.data?.sector) === normLoc(currentUser.sector)
        );
        const sectorViolence = reports.filter(r =>
            r.type === 'violence' &&
            normLoc(r.data?.sector) === normLoc(currentUser.sector)
        );
        
        // Drugs reports
        const drugsBody = document.getElementById('drugsReportsBody');
        drugsBody.innerHTML = sectorDrugs.length > 0 ? 
            sectorDrugs.map(r => {
                const data = r.data || {};
                return `
                    <tr>
                        <td>${escapeHtml(data.name || '—')}</td>
                        <td>${escapeHtml(data.sector || '—')}</td>
                        <td>${escapeHtml(data.cell || '—')}</td>
                        <td>${escapeHtml(data.village || '—')}</td>
                        <td>${truncateDescSector(data.description, 40)}</td>
                        <td>${escapeHtml(reportedByLabel(r))}</td>
                        <td>${formatDate(r.dateReported || r.createdAt)}</td>
                        <td><button class="btn btn-secondary" onclick="viewDrugsDetailsSector('${r._id}')">View details</button></td>
                    </tr>
                `;
            }).join('') : '<tr><td colspan="8">No reports in this sector</td></tr>';
        
        // Violence reports
        const violenceBody = document.getElementById('violenceReportsBody');
        violenceBody.innerHTML = sectorViolence.length > 0 ?
            sectorViolence.map(r => {
                const data = r.data || {};
                return `
                    <tr>
                        <td>${escapeHtml(data.victimName || '—')}</td>
                        <td>${escapeHtml(data.telephone || '—')}</td>
                        <td>${escapeHtml(data.sector || '—')}</td>
                        <td>${escapeHtml(data.cell || '—')}</td>
                        <td>${escapeHtml(data.village || '—')}</td>
                        <td>${truncateDescSector(data.description, 40)}</td>
                        <td>${escapeHtml(reportedByLabel(r))}</td>
                        <td>${formatDate(r.dateReported || r.createdAt)}</td>
                        <td><button class="btn btn-secondary" onclick="viewViolenceDetailsSector('${r._id}')">View details</button></td>
                    </tr>
                `;
            }).join('') : '<tr><td colspan="9">No reports in this sector</td></tr>';
    } catch (err) {
        console.error('Error loading reports:', err);
    }
}

window.viewDrugsDetailsSector = async function(id) {
    try {
        const [cr, lr] = await Promise.all([
            fetch('/api/citizen-reports').then(r => r.json()).catch(() => []),
            fetch('/api/leader-reports').then(r => r.json()).catch(() => [])
        ]);
        const record = [...cr, ...lr].find(r => r._id === id);
        if (record) {
            const d = record.data || {};
            const body = `
                <div class="detail-grid">
                    ${detailRow('Name(s)', d.name)}
                    ${detailRow('Sector', d.sector)}
                    ${detailRow('Cell', d.cell)}
                    ${detailRow('Village', d.village)}
                    ${detailRow('Reported by', d.reportedBy || record.reportedBy)}
                    ${detailRow('Date', formatDate(record.dateReported || record.createdAt))}
                </div>
                <p class="detail-section-title">Description</p>
                <p class="detail-text">${escapeHtml(d.description || '—')}</p>
            `;
            showDetailModal('Drug / Illegal Drinks Report', body);
        }
    } catch (err) {
        console.error('Error viewing drugs details:', err);
    }
};

window.viewViolenceDetailsSector = async function(id) {
    try {
        const [cr, lr] = await Promise.all([
            fetch('/api/citizen-reports').then(r => r.json()).catch(() => []),
            fetch('/api/leader-reports').then(r => r.json()).catch(() => [])
        ]);
        const record = [...cr, ...lr].find(r => r._id === id);
        if (record) {
            const d = record.data || {};
            const body = `
                <div class="detail-grid">
                    ${detailRow('Victim', d.victimName)}
                    ${detailRow('Telephone', d.telephone)}
                    ${detailRow('Sector', d.sector)}
                    ${detailRow('Cell', d.cell)}
                    ${detailRow('Village', d.village)}
                    ${detailRow('Reported by', d.reportedBy || record.reportedBy)}
                    ${detailRow('Date', formatDate(record.dateReported || record.createdAt))}
                </div>
                <p class="detail-section-title">Description</p>
                <p class="detail-text">${escapeHtml(d.description || '—')}</p>
            `;
            showDetailModal('Sexual Violence Report', body);
        }
    } catch (err) {
        console.error('Error viewing violence details:', err);
    }
};

// Load statistics
async function loadStatistics() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        
        const response = await fetch('/api/citizen-reports?type=case');
        const records = await response.json();
        
        // Sector-wide overview: count ALL cases in this sector (any level),
        // so the cards show real numbers even before cases reach sector level.
        const sectorCases = records.filter(r => normLoc(r.data?.sector) === normLoc(currentUser.sector));
        const st = r => normLoc(r.data?.status);
        const isSolved   = r => st(r) === 'solved' || st(r) === 'resolved';
        const isReferred = r => st(r) === 'referred';

        document.getElementById('totalCases').textContent    = sectorCases.length;
        document.getElementById('pendingCases').textContent  = sectorCases.filter(r => !isSolved(r) && !isReferred(r)).length;
        document.getElementById('solvedCases').textContent   = sectorCases.filter(isSolved).length;
        document.getElementById('referredCases').textContent = sectorCases.filter(isReferred).length;
    } catch (err) {
        console.error('Error loading statistics:', err);
    }
}

// ===== Per-cell and per-village breakdown (histograms) =====
let _cellChart = null;
let _villageChart = null;

// Render a grouped bar histogram (Umuganda % + Inteko %). Destroys any prior chart.
function _renderRateHistogram(canvasId, emptyId, existing, labels, umugandaRates, intekoRates) {
    const canvas  = document.getElementById(canvasId);
    const emptyEl = document.getElementById(emptyId);
    if (!canvas) return existing;
    if (existing) { existing.destroy(); existing = null; }

    const hasData = labels.length > 0;
    if (emptyEl) emptyEl.style.display = hasData ? 'none' : '';
    canvas.style.display = hasData ? '' : 'none';
    if (!hasData || typeof Chart === 'undefined') return null;

    return new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Umuganda %', data: umugandaRates, backgroundColor: '#1a73e8', borderRadius: 4, maxBarThickness: 46 },
                { label: 'Inteko %',   data: intekoRates,   backgroundColor: '#41a0d4', borderRadius: 4, maxBarThickness: 46 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y}%` } }
            },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, title: { display: true, text: 'Attendance rate' } },
                x: { ticks: { autoSkip: false } }
            }
        }
    });
}

async function loadSectorBreakdown() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const sector = currentUser.sector || '';
    const q = 'sector=' + encodeURIComponent(sector);

    try {
        const [members, umuganda, inteko] = await Promise.all([
            fetch('/api/members?' + q).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/attendance?' + q).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/inteko-attendance?' + q).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);

        const present = arr => arr.filter(r => normLoc(r.status) === 'present').length;
        const rate    = arr => arr.length ? Math.round((present(arr) * 100) / arr.length) : 0;

        // Case-insensitive grouping so "kindama" and "Kindama" are treated as ONE
        // cell/village. Records are keyed by the lowercased name (normLoc); the bar
        // is labelled in Title Case.
        const titleCase = s => (s || '').trim().toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
        const groupByCI = (arr, keyFn) => {
            const m = {};
            arr.forEach(x => { const k = normLoc(keyFn(x)); if (k) (m[k] ||= []).push(x); });
            return m;
        };
        // Unique [key, displayLabel] pairs across the given name lists, sorted by label.
        const uniqueNames = (...lists) => {
            const seen = new Map();
            lists.flat().forEach(n => { const k = normLoc(n); if (k && !seen.has(k)) seen.set(k, titleCase(n)); });
            return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
        };

        // ---------- By Cell ----------
        const cells = uniqueNames(members.map(m => m.cell), umuganda.map(r => r.cell), inteko.map(r => r.cell));
        const ugaByCell = groupByCI(umuganda, r => r.cell);
        const intByCell = groupByCI(inteko,   r => r.cell);
        _cellChart = _renderRateHistogram('cellChart', 'cellChartEmpty', _cellChart,
            cells.map(([, label]) => label),
            cells.map(([k]) => rate(ugaByCell[k] || [])),
            cells.map(([k]) => rate(intByCell[k] || [])));

        // ---------- By Village ----------
        const villages = uniqueNames(members.map(m => m.village), umuganda.map(r => r.village), inteko.map(r => r.village));
        const ugaByVil = groupByCI(umuganda, r => r.village);
        const intByVil = groupByCI(inteko,   r => r.village);
        _villageChart = _renderRateHistogram('villageChart', 'villageChartEmpty', _villageChart,
            villages.map(([, label]) => label),
            villages.map(([k]) => rate(ugaByVil[k] || [])),
            villages.map(([k]) => rate(intByVil[k] || [])));
    } catch (err) {
        console.error('loadSectorBreakdown error:', err);
    }
}

// Setup auto-refresh
function setupAutoRefresh() {
    // Refresh case table every 30 seconds to catch new escalations
    setInterval(() => {
        loadCaseTable();
        loadStatistics();
    }, 30000);
}

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// ===== Chat Logic for Sector Dashboard =====

// Handle sending chat message from sector leader
async function _fetchSectorMessages() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    try {
        const resp = await fetch('/api/messages?email=' + encodeURIComponent(currentUser.email));
        return resp.ok ? await resp.json() : [];
    } catch { return []; }
}

async function handleSectorChatSubmit(e) {
    e.preventDefault();

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const toRole = document.getElementById('sectorChatRecipientRole').value;
    const messageText = document.getElementById('sectorChatMessage').value.trim();

    if (toRole === 'citizen' && !sectorReplyTarget) {
        alert('Select a citizen to reply to from the list below.');
        return;
    }
    if (!messageText) {
        alert('Please enter a message.');
        return;
    }

    try {
        const resp = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromName: currentUser.name,
                fromEmail: currentUser.email,
                fromRole: 'sector',
                toRole,
                toEmail: sectorReplyTarget ? sectorReplyTarget.email : null,
                toName: sectorReplyTarget ? sectorReplyTarget.name : null,
                text: messageText
            })
        });
        if (!resp.ok) throw new Error('Server returned ' + resp.status);
        e.target.reset();
        sectorReplyTarget = null;
        loadSectorChatMessages();
    } catch (err) {
        alert('Could not send message: ' + err.message);
    }
}

// Load chat messages relevant for this sector leader
async function loadSectorChatMessages() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages = await _fetchSectorMessages();

    const container = document.getElementById('sectorChatMessages');
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = '<p>No messages yet.</p>';
        return;
    }

    container.innerHTML = messages
        .sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp))
        .map(m => {
            const isMe = m.fromEmail === currentUser.email;
            const otherName = isMe ? (m.toName || roleLabel(m.toRole)) : (m.fromName || roleLabel(m.fromRole));
            const direction = isMe ? 'You → ' + otherName : otherName + ' → You';
            return `
                <div class="chat-message ${isMe ? 'chat-message-me' : 'chat-message-other'}">
                    <div class="chat-meta">
                        <span class="chat-direction">${direction}</span>
                        <span class="chat-time">${formatDateTime(m.createdAt || m.timestamp)}</span>
                    </div>
                    <div class="chat-text">${escapeHtml(m.text)}</div>
                </div>
            `;
        }).join('');
}

// Helpers (reuse names)
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function roleLabel(role) {
    switch (role) {
        case 'leader': return 'Village Leader';
        case 'cell': return 'Cell Leader';
        case 'sector': return 'Sector Leader';
        case 'citizen': return 'Citizen';
        default: return role;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Build inbox of citizens who have sent messages to this sector leader
async function loadSectorInbox() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages = await _fetchSectorMessages();

    const incoming = messages.filter(m =>
        m.toEmail === currentUser.email && m.fromRole === 'citizen'
    );

    const byCitizen = {};
    incoming.forEach(m => {
        const t = m.createdAt || m.timestamp;
        const prev = byCitizen[m.fromEmail];
        if (!prev || new Date(t) > new Date(prev.createdAt || prev.timestamp)) byCitizen[m.fromEmail] = m;
    });

    const tbody = document.getElementById('sectorInboxBody');
    if (!tbody) return;

    const entries = Object.values(byCitizen);
    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No messages from citizens yet.</td></tr>';
        return;
    }

    tbody.innerHTML = entries
        .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
        .map(m => {
            const phone = m.fromPhone || '';
            const name = m.fromName || m.fromEmail;
            const when = formatDateTime(m.createdAt || m.timestamp);
            return `
                <tr>
                    <td>${escapeHtml(name)}</td>
                    <td>${escapeHtml(phone || 'N/A')}</td>
                    <td>${escapeHtml(when)}</td>
                    <td><button class="btn btn-secondary" onclick="replyToCitizenFromSector('${m.fromEmail.replace(/'/g, "\\'")}', '${escapeHtml(name)}')">Reply</button></td>
                </tr>
            `;
        }).join('');
}

let sectorReplyTarget = null;

window.replyToCitizenFromSector = function(email, name) {
    sectorReplyTarget = { email, name };
    const msgInput = document.getElementById('sectorChatMessage');
    const roleSelect = document.getElementById('sectorChatRecipientRole');
    if (roleSelect) {
        roleSelect.value = 'citizen';
    }
    if (msgInput) {
        msgInput.focus();
    }
};

// --- Home updates (Recent Activity, Upcoming Session, Trending) ---
const HOME_LEVEL_SECTOR = 'sector';

function setupHomeUpdatesTabs() {
    const section = document.getElementById('homeupdates');
    if (!section) return;
    const tabBtns = section.querySelectorAll('.tab-btn');
    const forms = section.querySelectorAll('.home-update-form');
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
    ['sectorActivityDate', 'sectorUpcomingDate', 'sectorTrendingDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = today;
    });
}

function getCurrentSectorLeaderName() {
    const u = JSON.parse(sessionStorage.getItem('currentUser'));
    return (u && (u.name || u.email)) ? (u.name || u.email) : 'Sector Leader';
}

function readImageAsDataUrlSector(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            compressImageDataUrlSector(dataUrl, 800, 0.8).then(resolve).catch(() => resolve(dataUrl));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function compressImageDataUrlSector(dataUrl, maxWidth, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > maxWidth) {
                h = (h * maxWidth) / w;
                w = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            try {
                resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (e) {
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

async function handleSectorActivitySubmit(e) {
    e.preventDefault();
    
    try {
        const description = document.getElementById('sectorActivityDesc').value.trim();
        const place = document.getElementById('sectorActivityPlace').value.trim();
        const date = document.getElementById('sectorActivityDate').value;
        const fileInput = document.getElementById('sectorActivityImage');
        const file = fileInput && fileInput.files && fileInput.files[0];
        
        let imageUrl = null;
        let publicId = null;
        
        // If file exists, upload it
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (uploadResponse.ok) {
                    const uploadData = await uploadResponse.json();
                    // /api/upload returns { url, publicId, ... }
                    imageUrl = uploadData.url || uploadData.secure_url || uploadData.imageUrl;
                    publicId = uploadData.publicId || uploadData.public_id;
                }
            } catch (err) {
                console.warn('Image upload failed', err);
            }
        }
        
        // Save to database
        const response = await fetch('/api/home-updates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'activity',
                title: place,
                description,
                place,
                date,
                postedBy: getCurrentSectorLeaderName(),
                imageUrl,
                publicId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to post activity');
        }
        
        e.target.reset();
        document.getElementById('sectorActivityDate').value = new Date().toISOString().slice(0, 10);
        await loadSectorHomeUpdatesList();
        alert('Recent activity posted! It will appear on the home page.');
    } catch (err) {
        console.error('Error submitting activity:', err);
        alert('Error posting activity: ' + err.message);
    }
}

async function handleSectorUpcomingSubmit(e) {
    e.preventDefault();
    
    try {
        const title = document.getElementById('sectorUpcomingTitle').value.trim();
        const description = document.getElementById('sectorUpcomingDesc').value.trim();
        const place = document.getElementById('sectorUpcomingPlace').value.trim();
        const date = document.getElementById('sectorUpcomingDate').value;
        
        const response = await fetch('/api/home-updates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'upcoming',
                title,
                description,
                place,
                date,
                postedBy: getCurrentSectorLeaderName()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to post upcoming session');
        }
        
        e.target.reset();
        document.getElementById('sectorUpcomingDate').value = new Date().toISOString().slice(0, 10);
        await loadSectorHomeUpdatesList();
        alert('Upcoming session posted! It will appear on the home page.');
    } catch (err) {
        console.error('Error submitting upcoming session:', err);
        alert('Error posting upcoming session: ' + err.message);
    }
}

async function handleSectorTrendingSubmit(e) {
    e.preventDefault();
    try {
        const place = document.getElementById('sectorTrendingPlace').value.trim();
        const resp = await fetch('/api/home-updates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'trending',
                title: place,
                description: document.getElementById('sectorTrendingDesc').value.trim(),
                place,
                date: document.getElementById('sectorTrendingDate').value,
                postedBy: getCurrentSectorLeaderName()
            })
        });
        if (!resp.ok) throw new Error('Server returned ' + resp.status);
        e.target.reset();
        document.getElementById('sectorTrendingDate').value = new Date().toISOString().slice(0, 10);
        await loadSectorHomeUpdatesList();
        alert('Trending topic posted! It will appear on the home page.');
    } catch (err) {
        alert('Could not post trending topic: ' + err.message);
    }
}

async function loadSectorHomeUpdatesList() {
    const listEl = document.getElementById('sectorHomeUpdatesList');
    if (!listEl) return;
    const myName = getCurrentSectorLeaderName();
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

    if (mine.length === 0) {
        listEl.innerHTML = '<p>No posts yet. Use the forms above to post.</p>';
        return;
    }
    listEl.innerHTML = '<ul class="simple-list">' + mine.map(item => {
        const text = item.title || item.description || '';
        return `<li><strong>${typeLabel(item.type)}</strong> — ${formatDate(item.date || item.createdAt)}: ${escapeHtml(text.slice(0, 60))}${text.length > 60 ? '…' : ''}</li>`;
    }).join('') + '</ul>';
}


