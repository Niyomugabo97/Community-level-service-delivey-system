// Cell Level Dashboard JavaScript

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser || currentUser.userType !== 'cell') {
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

            // Lazy-load data when section is opened
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

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
}

// Setup forms
function setupForms() {
    document.getElementById('resolveCaseForm').addEventListener('submit', handleCaseResolution);

    const cellChatForm = document.getElementById('cellChatForm');
    if (cellChatForm) {
        cellChatForm.addEventListener('submit', handleCellChatSubmit);
    }
    const cellActivityForm = document.getElementById('cellActivityForm');
    if (cellActivityForm) cellActivityForm.addEventListener('submit', handleCellActivitySubmit);
    const cellUpcomingForm = document.getElementById('cellUpcomingForm');
    if (cellUpcomingForm) cellUpcomingForm.addEventListener('submit', handleCellUpcomingSubmit);
    const cellTrendingForm = document.getElementById('cellTrendingForm');
    if (cellTrendingForm) cellTrendingForm.addEventListener('submit', handleCellTrendingSubmit);
}

// Load all data
function loadAllData() {
    loadCaseTable();
    loadActivities();
    loadReports();
    loadStatistics();
    updateCaseSelect();
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

// Load escalated cases
function loadCaseTable() {
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    // Filter cases escalated to Cell level
    const cellCases = records.filter(record => 
        record.level === 'Cell' && 
        record.status !== 'Solved' &&
        record.cell === currentUser.cell
    );
    
    const tbody = document.getElementById('caseTableBody');
    
    if (cellCases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No escalated cases at Cell level</td></tr>';
        return;
    }
    
    tbody.innerHTML = cellCases.map(record => {
        const statusClass = record.status === 'Solved' ? 'status-solved' : 
                           record.status === 'Escalated' ? 'status-escalated' : 
                           record.status === 'In Progress' ? 'status-in-progress' : 'status-pending';
        
        // Calculate countdown
        const countdown = calculateCountdown(record);
        
        return `
            <tr>
                <td>#${record.id}</td>
                <td>${record.plaintiff}</td>
                <td>${record.defendant}</td>
                <td>${record.village}</td>
                <td>${record.leaderName}</td>
                <td>${record.description.substring(0, 50)}${record.description.length > 50 ? '...' : ''}</td>
                <td><span class="status-badge ${statusClass}">${record.status}</span></td>
                <td>${record.escalatedDate ? formatDate(record.escalatedDate) : formatDate(record.date)}</td>
                <td>
                    <div class="countdown-timer" data-case-id="${record.id}" data-resolution-date="${record.expectedResolutionDate || record.cellResolutionDate}">
                        ${countdown}
                    </div>
                </td>
                <td>
                    <button class="btn btn-secondary" onclick="viewCaseDetails(${record.id})">View</button>
                    ${record.status === 'Pending' || record.status === 'In Progress' ? 
                        `<button class="btn btn-primary" onclick="selectCaseForResolution(${record.id})">Resolve</button>` : 
                        ''}
                </td>
            </tr>
        `;
    }).join('');
    
    // Start countdown updates
    startCountdownUpdates();
}

// Calculate countdown timer
function calculateCountdown(record) {
    if (record.status === 'Solved') {
        return '<span class="countdown-expired">Solved</span>';
    }
    
    const resolutionDate = record.cellResolutionDate || record.expectedResolutionDate;
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
    
    countdownInterval = setInterval(() => {
        const timers = document.querySelectorAll('.countdown-timer');
        timers.forEach(timer => {
            const caseId = parseInt(timer.dataset.caseId);
            const resolutionDate = timer.dataset.resolutionDate;
            
            const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
            const record = records.find(r => r.id === caseId);
            
            if (record && record.status !== 'Solved') {
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
    }, 1000);
}

// Handle case resolution
function handleCaseResolution(e) {
    e.preventDefault();
    
    const caseId = parseInt(document.getElementById('resolveCaseId').value);
    const resolutionDays = parseInt(document.getElementById('cellResolutionDays').value);
    const resolutionDate = document.getElementById('cellResolutionDate').value;
    const resolutionNotes = document.getElementById('cellResolutionNotes').value;
    const status = document.getElementById('cellCaseStatus').value;
    
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const record = records.find(r => r.id === caseId);
    
    if (!record) {
        alert('Case not found');
        return;
    }
    
    // Update case
    record.status = status;
    record.cellResolutionDays = resolutionDays;
    record.cellResolutionDate = new Date(resolutionDate).toISOString();
    record.cellResolutionNotes = resolutionNotes;
    record.cellResolvedBy = JSON.parse(sessionStorage.getItem('currentUser')).name;
    record.cellResolvedDate = new Date().toISOString();
    
    // If escalating to sector
    if (status === 'Escalate to Sector') {
        record.level = 'Sector';
        record.status = 'Escalated';
        record.escalatedDate = new Date().toISOString();
        // Set new resolution date for sector
        const sectorResolutionDate = new Date(resolutionDate);
        sectorResolutionDate.setDate(sectorResolutionDate.getDate() + resolutionDays);
        record.sectorResolutionDate = sectorResolutionDate.toISOString();
    }
    
    localStorage.setItem('caseRecords', JSON.stringify(records));
    
    e.target.reset();
    loadCaseTable();
    updateCaseSelect();
    loadStatistics();
    
    alert(`Case #${caseId} ${status === 'Solved' ? 'marked as solved' : status === 'Escalate to Sector' ? 'escalated to Sector level' : 'updated'}!`);
}

// Update case select dropdown
function updateCaseSelect() {
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    const cellCases = records.filter(record => 
        record.level === 'Cell' && 
        record.status !== 'Solved' &&
        record.cell === currentUser.cell
    );
    
    const select = document.getElementById('resolveCaseId');
    select.innerHTML = '<option value="">Select a case to resolve</option>' +
        cellCases.map(record => 
            `<option value="${record.id}">Case #${record.id} - ${record.plaintiff} vs ${record.defendant}</option>`
        ).join('');
}

// Select case for resolution
window.selectCaseForResolution = function(caseId) {
    document.getElementById('resolveCaseId').value = caseId;
    document.getElementById('resolveCaseId').scrollIntoView({ behavior: 'smooth' });
};

// View case details
window.viewCaseDetails = function(caseId) {
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const record = records.find(r => r.id === caseId);
    
    if (record) {
        const details = `
Case ID: #${record.id}
Plaintiff: ${record.plaintiff}
Defendant: ${record.defendant}
Village: ${record.village}
Cell: ${record.cell}
Sector: ${record.sector}
Original Leader: ${record.leaderName}
Status: ${record.status}
Level: ${record.level}
Case Date: ${formatDate(record.caseDate)}
Escalated Date: ${record.escalatedDate ? formatDate(record.escalatedDate) : 'N/A'}

Description:
${record.description}

${record.cellResolutionNotes ? `\nResolution Notes:\n${record.cellResolutionNotes}` : ''}
        `;
        alert(details);
    }
};

// Load activities
function loadActivities() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    // Umuganda summary
    const umugandaRecords = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
    const cellUmuganda = umugandaRecords.filter(r => r.cell === currentUser.cell);
    document.getElementById('umugandaSummary').innerHTML = `
        <p><strong>Total Attendance:</strong> ${cellUmuganda.length}</p>
        <p><strong>This Month:</strong> ${cellUmuganda.filter(r => {
            const date = new Date(r.date);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length}</p>
    `;
    
    // Inteko summary
    const intekoRecords = JSON.parse(localStorage.getItem('intekoRecords')) || [];
    document.getElementById('intekoSummary').innerHTML = `
        <p><strong>Total Meetings:</strong> ${intekoRecords.length}</p>
        <p><strong>This Month:</strong> ${intekoRecords.filter(r => {
            const date = new Date(r.meetingDate);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length}</p>
    `;
    
    // Registration summary
    const registerRecords = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const cellRegistrations = registerRecords.filter(r => r.cell === currentUser.cell);
    document.getElementById('registrationSummary').innerHTML = `
        <p><strong>Total Registered:</strong> ${cellRegistrations.length}</p>
        <p><strong>New Members:</strong> ${cellRegistrations.filter(r => r.status === 'New Member').length}</p>
    `;
    
    // Reports summary
    const drugsRecords = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    const violenceRecords = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    document.getElementById('reportsSummary').innerHTML = `
        <p><strong>Drug Reports:</strong> ${drugsRecords.length}</p>
        <p><strong>Violence Reports:</strong> ${violenceRecords.length}</p>
    `;
}

function truncateDescCell(text, len) {
    if (!text) return '—';
    return text.length <= len ? escapeHtml(text) : escapeHtml(text.slice(0, len)) + '…';
}

// Load reports (full details – visible automatically from citizens & village leaders)
function loadReports() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const reportedByLabel = (r) => r.reportedBy || '—';
    
    // Drugs reports – filter by cell, show all details including description
    const drugsRecords = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    const cellDrugs = drugsRecords.filter(r => r.cell === currentUser.cell);
    const drugsBody = document.getElementById('drugsReportsBody');
    drugsBody.innerHTML = cellDrugs.length > 0 ? 
        cellDrugs.map(r => `
            <tr>
                <td>${escapeHtml(r.name)}</td>
                <td>${escapeHtml(r.sector || '—')}</td>
                <td>${escapeHtml(r.cell || '—')}</td>
                <td>${escapeHtml(r.village || '—')}</td>
                <td>${truncateDescCell(r.description, 40)}</td>
                <td>${escapeHtml(reportedByLabel(r))}</td>
                <td>${formatDate(r.date)}</td>
                <td><button class="btn btn-secondary" onclick="viewDrugsDetailsCell(${r.id})">View details</button></td>
            </tr>
        `).join('') : '<tr><td colspan="8">No reports in this cell</td></tr>';
    
    // Violence reports – filter by cell, show all details + View button
    const violenceRecords = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    const cellViolence = violenceRecords.filter(r => r.cell === currentUser.cell);
    const violenceBody = document.getElementById('violenceReportsBody');
    violenceBody.innerHTML = cellViolence.length > 0 ?
        cellViolence.map(r => `
            <tr>
                <td>${escapeHtml(r.victimName)}</td>
                <td>${escapeHtml(r.telephone || '—')}</td>
                <td>${escapeHtml(r.sector || '—')}</td>
                <td>${escapeHtml(r.cell || '—')}</td>
                <td>${escapeHtml(r.village || '—')}</td>
                <td>${truncateDescCell(r.description, 40)}</td>
                <td>${escapeHtml(reportedByLabel(r))}</td>
                <td>${formatDate(r.date)}</td>
                <td><button class="btn btn-secondary" onclick="viewViolenceDetailsCell(${r.id})">View details</button></td>
            </tr>
        `).join('') : '<tr><td colspan="9">No reports in this cell</td></tr>';
}

window.viewDrugsDetailsCell = function(id) {
    const records = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    const record = records.find(r => r.id === id);
    if (record) {
        const details = `Name(s): ${record.name}\nLocation: ${record.village}, ${record.cell}, ${record.sector}\nReported by: ${record.reportedBy || '—'}\nDescription: ${record.description || '—'}\nDate: ${formatDate(record.date)}`;
        alert(details);
    }
};

window.viewViolenceDetailsCell = function(id) {
    const records = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    const record = records.find(r => r.id === id);
    if (record) {
        const details = `Victim: ${record.victimName}\nTelephone: ${record.telephone}\nLocation: ${record.village}, ${record.cell}, ${record.sector}\nReported by: ${record.reportedBy || '—'}\nDescription: ${record.description || '—'}\nDate: ${formatDate(record.date)}`;
        alert(details);
    }
};

// Load statistics
function loadStatistics() {
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    const cellCases = records.filter(r => r.level === 'Cell' && r.cell === currentUser.cell);
    
    document.getElementById('totalCases').textContent = cellCases.length;
    document.getElementById('pendingCases').textContent = cellCases.filter(r => r.status === 'Pending' || r.status === 'In Progress').length;
    document.getElementById('solvedCases').textContent = cellCases.filter(r => r.status === 'Solved').length;
    document.getElementById('escalatedCases').textContent = cellCases.filter(r => r.level === 'Sector').length;
}

// Setup auto-refresh
function setupAutoRefresh() {
    // Refresh case table every 30 seconds to catch new escalations
    setInterval(() => {
        loadCaseTable();
        loadStatistics();
    }, 30000);
    
    // Check for auto-escalation
    setInterval(() => {
        const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
        const now = new Date();
        let updated = false;
        
        records.forEach(record => {
            if (record.level === 'Cell' && (record.status === 'Pending' || record.status === 'In Progress')) {
                const resolutionDate = record.cellResolutionDate || record.expectedResolutionDate;
                if (resolutionDate) {
                    const resolutionDateObj = new Date(resolutionDate);
                    if (now > resolutionDateObj && record.status !== 'Solved') {
                        record.status = 'Escalated';
                        record.level = 'Sector';
                        record.escalatedDate = now.toISOString();
                        updated = true;
                    }
                }
            }
        });
        
        if (updated) {
            localStorage.setItem('caseRecords', JSON.stringify(records));
            loadCaseTable();
            loadStatistics();
        }
    }, 60000); // Check every minute
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

// ===== Chat Logic for Cell Dashboard =====

// Handle sending chat message from cell leader
function handleCellChatSubmit(e) {
    e.preventDefault();

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const toRole = document.getElementById('cellChatRecipientRole').value;
    const messageText = document.getElementById('cellChatMessage').value.trim();

    if (toRole === 'citizen' && !cellReplyTarget) {
        alert('Select a citizen to reply to from the list below.');
        return;
    }

    if (!messageText) {
        alert('Please enter a message.');
        return;
    }

    const message = {
        id: Date.now(),
        fromName: currentUser.name,
        fromEmail: currentUser.email,
        fromRole: 'cell',
        toRole: toRole, // 'citizen', 'leader', 'sector'
        toEmail: cellReplyTarget ? cellReplyTarget.email : null,
        toName: cellReplyTarget ? cellReplyTarget.name : null,
        text: messageText,
        timestamp: new Date().toISOString()
    };

    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    messages.push(message);
    localStorage.setItem('chatMessages', JSON.stringify(messages));

    e.target.reset();
    loadCellChatMessages();
}

// Load chat messages relevant for this cell leader
function loadCellChatMessages() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];

    // Show messages where this cell leader is sender or receiver
    const relevant = messages.filter(m =>
        m.fromEmail === currentUser.email || m.toEmail === currentUser.email
    );

    const container = document.getElementById('cellChatMessages');
    if (!container) return;

    if (relevant.length === 0) {
        container.innerHTML = '<p>No messages yet.</p>';
        return;
    }

    container.innerHTML = relevant
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(m => {
            const isMe = m.fromEmail === currentUser.email;
            const otherName = isMe ? (m.toName || roleLabel(m.toRole)) : (m.fromName || roleLabel(m.fromRole));
            const direction = isMe ? 'You → ' + otherName : otherName + ' → You';
            return `
                <div class="chat-message ${isMe ? 'chat-message-me' : 'chat-message-other'}">
                    <div class="chat-meta">
                        <span class="chat-direction">${direction}</span>
                        <span class="chat-time">${formatDateTime(m.timestamp)}</span>
                    </div>
                    <div class="chat-text">${escapeHtml(m.text)}</div>
                </div>
            `;
        }).join('');
}

// Additional helpers (reuse if defined globally)
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

// Build inbox of citizens who have sent messages to this cell leader
function loadCellInbox() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];

    const incoming = messages.filter(m =>
        m.toEmail === currentUser.email && m.fromRole === 'citizen'
    );

    const byCitizen = {};
    incoming.forEach(m => {
        if (!byCitizen[m.fromEmail] || new Date(m.timestamp) > new Date(byCitizen[m.fromEmail].timestamp)) {
            byCitizen[m.fromEmail] = m;
        }
    });

    const tbody = document.getElementById('cellInboxBody');
    if (!tbody) return;

    const entries = Object.values(byCitizen);
    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No messages from citizens yet.</td></tr>';
        return;
    }

    tbody.innerHTML = entries
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(m => {
            const user = users.find(u => u.email === m.fromEmail);
            const phone = m.fromPhone || (user ? (user.phone || '') : '');
            const name = m.fromName || (user ? user.name : m.fromEmail);
            const when = formatDateTime(m.timestamp);
            return `
                <tr>
                    <td>${escapeHtml(name)}</td>
                    <td>${escapeHtml(phone || 'N/A')}</td>
                    <td>${escapeHtml(when)}</td>
                    <td><button class="btn btn-secondary" onclick="replyToCitizenFromCell('${m.fromEmail.replace(/'/g, "\\'")}', '${escapeHtml(name)}')">Reply</button></td>
                </tr>
            `;
        }).join('');
}

let cellReplyTarget = null;

window.replyToCitizenFromCell = function(email, name) {
    cellReplyTarget = { email, name };
    const msgInput = document.getElementById('cellChatMessage');
    const roleSelect = document.getElementById('cellChatRecipientRole');
    if (roleSelect) {
        roleSelect.value = 'citizen';
    }
    if (msgInput) {
        msgInput.focus();
    }
};

// --- Home updates (Recent Activity, Upcoming Session, Trending) ---
const HOME_LEVEL_CELL = 'cell';

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
    ['cellActivityDate', 'cellUpcomingDate', 'cellTrendingDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = today;
    });
}

function getCurrentCellLeaderName() {
    const u = JSON.parse(sessionStorage.getItem('currentUser'));
    return (u && (u.name || u.email)) ? (u.name || u.email) : 'Cell Leader';
}

function readImageAsDataUrlCell(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            compressImageDataUrlCell(dataUrl, 800, 0.8).then(resolve).catch(() => resolve(dataUrl));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function compressImageDataUrlCell(dataUrl, maxWidth, quality) {
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

async function handleCellActivitySubmit(e) {
    e.preventDefault();
    const description = document.getElementById('cellActivityDesc').value.trim();
    const place = document.getElementById('cellActivityPlace').value.trim();
    const date = document.getElementById('cellActivityDate').value;
    const fileInput = document.getElementById('cellActivityImage');
    const file = fileInput && fileInput.files && fileInput.files[0];
    let imageData = 'https://via.placeholder.com/400x200?text=Activity';
    if (file) {
        try {
            const dataUrl = await readImageAsDataUrlCell(file);
            if (dataUrl) imageData = dataUrl;
        } catch (err) {
            console.warn('Image read failed', err);
        }
    }
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    activities.push({
        id: Date.now(),
        description,
        place,
        date,
        image: imageData,
        level: HOME_LEVEL_CELL,
        uploadedBy: getCurrentCellLeaderName()
    });
    localStorage.setItem('activities', JSON.stringify(activities));
    e.target.reset();
    document.getElementById('cellActivityDate').value = new Date().toISOString().slice(0, 10);
    loadCellHomeUpdatesList();
    alert('Recent activity posted! It will appear on the home page.');
}

function handleCellUpcomingSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('cellUpcomingTitle').value.trim();
    const description = document.getElementById('cellUpcomingDesc').value.trim();
    const place = document.getElementById('cellUpcomingPlace').value.trim();
    const date = document.getElementById('cellUpcomingDate').value;
    const news = JSON.parse(localStorage.getItem('news')) || [];
    news.push({
        id: Date.now(),
        title,
        description,
        place,
        date,
        level: HOME_LEVEL_CELL,
        uploadedBy: getCurrentCellLeaderName()
    });
    localStorage.setItem('news', JSON.stringify(news));
    e.target.reset();
    document.getElementById('cellUpcomingDate').value = new Date().toISOString().slice(0, 10);
    loadCellHomeUpdatesList();
    alert('Upcoming session posted! It will appear on the home page.');
}

function handleCellTrendingSubmit(e) {
    e.preventDefault();
    const description = document.getElementById('cellTrendingDesc').value.trim();
    const place = document.getElementById('cellTrendingPlace').value.trim();
    const date = document.getElementById('cellTrendingDate').value;
    const trending = JSON.parse(localStorage.getItem('trending')) || [];
    trending.push({
        id: Date.now(),
        description,
        place,
        date,
        level: HOME_LEVEL_CELL,
        uploadedBy: getCurrentCellLeaderName()
    });
    localStorage.setItem('trending', JSON.stringify(trending));
    e.target.reset();
    document.getElementById('cellTrendingDate').value = new Date().toISOString().slice(0, 10);
    loadCellHomeUpdatesList();
    alert('Trending topic posted! It will appear on the home page.');
}

function loadCellHomeUpdatesList() {
    const listEl = document.getElementById('cellHomeUpdatesList');
    if (!listEl) return;
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const news = JSON.parse(localStorage.getItem('news')) || [];
    const trending = JSON.parse(localStorage.getItem('trending')) || [];
    const myName = getCurrentCellLeaderName();
    const myActivities = activities.filter(a => a.level === HOME_LEVEL_CELL && a.uploadedBy === myName);
    const myNews = news.filter(n => n.level === HOME_LEVEL_CELL && n.uploadedBy === myName);
    const myTrending = trending.filter(t => t.level === HOME_LEVEL_CELL && t.uploadedBy === myName);
    const all = [
        ...myActivities.map(a => ({ type: 'Activity', date: a.date, text: a.description })),
        ...myNews.map(n => ({ type: 'Upcoming', date: n.date, text: n.title })),
        ...myTrending.map(t => ({ type: 'Trending', date: t.date, text: t.description }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
    if (all.length === 0) {
        listEl.innerHTML = '<p>No posts yet. Use the forms above to post.</p>';
        return;
    }
    listEl.innerHTML = '<ul class="simple-list">' + all.map(item =>
        `<li><strong>${item.type}</strong> — ${formatDate(item.date)}: ${escapeHtml(item.text.slice(0, 60))}${item.text.length > 60 ? '…' : ''}</li>`
    ).join('') + '</ul>';
}


