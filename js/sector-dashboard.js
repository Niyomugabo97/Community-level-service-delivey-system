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
function loadAllData() {
    loadCaseTable();
    loadActivities();
    loadReports();
    loadStatistics();
    updateCaseSelect();
    loadSectorChatMessages();
    loadSectorInbox();
    setupHomeUpdatesTabs();
    setupHomeUpdateForms();
    loadSectorHomeUpdatesList();
}

// Load escalated cases
function loadCaseTable() {
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    // Filter cases escalated to Sector level
    const sectorCases = records.filter(record => 
        record.level === 'Sector' && 
        record.status !== 'Solved' &&
        record.sector === currentUser.sector
    );
    
    const tbody = document.getElementById('caseTableBody');
    
    if (sectorCases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center;">No escalated cases at Sector level</td></tr>';
        return;
    }
    
    tbody.innerHTML = sectorCases.map(record => {
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
                <td>${record.cell}</td>
                <td>${record.village}</td>
                <td>${record.leaderName}</td>
                <td>${record.description.substring(0, 50)}${record.description.length > 50 ? '...' : ''}</td>
                <td><span class="status-badge ${statusClass}">${record.status}</span></td>
                <td>${record.escalatedDate ? formatDate(record.escalatedDate) : formatDate(record.date)}</td>
                <td>
                    <div class="countdown-timer" data-case-id="${record.id}" data-resolution-date="${record.sectorResolutionDate || record.expectedResolutionDate}">
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
    
    const resolutionDate = record.sectorResolutionDate || record.expectedResolutionDate;
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
    const resolutionDays = parseInt(document.getElementById('sectorResolutionDays').value);
    const resolutionDate = document.getElementById('sectorResolutionDate').value;
    const resolutionNotes = document.getElementById('sectorResolutionNotes').value;
    const status = document.getElementById('sectorCaseStatus').value;
    
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const record = records.find(r => r.id === caseId);
    
    if (!record) {
        alert('Case not found');
        return;
    }
    
    // Update case
    record.status = status;
    record.sectorResolutionDays = resolutionDays;
    record.sectorResolutionDate = new Date(resolutionDate).toISOString();
    record.sectorResolutionNotes = resolutionNotes;
    record.sectorResolvedBy = JSON.parse(sessionStorage.getItem('currentUser')).name;
    record.sectorResolvedDate = new Date().toISOString();
    
    // If referring to authorities
    if (status === 'Referred to Authorities') {
        record.status = 'Referred';
        record.referredDate = new Date().toISOString();
    }
    
    localStorage.setItem('caseRecords', JSON.stringify(records));
    
    e.target.reset();
    loadCaseTable();
    updateCaseSelect();
    loadStatistics();
    
    alert(`Case #${caseId} ${status === 'Solved' ? 'marked as solved' : status === 'Referred to Authorities' ? 'referred to authorities' : 'updated'}!`);
}

// Update case select dropdown
function updateCaseSelect() {
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    const sectorCases = records.filter(record => 
        record.level === 'Sector' && 
        record.status !== 'Solved' &&
        record.sector === currentUser.sector
    );
    
    const select = document.getElementById('resolveCaseId');
    select.innerHTML = '<option value="">Select a case to resolve</option>' +
        sectorCases.map(record => 
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

${record.cellResolutionNotes ? `\nCell Resolution Notes:\n${record.cellResolutionNotes}` : ''}
${record.sectorResolutionNotes ? `\nSector Resolution Notes:\n${record.sectorResolutionNotes}` : ''}
        `;
        alert(details);
    }
};

// Load activities
function loadActivities() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    // Umuganda summary
    const umugandaRecords = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
    const sectorUmuganda = umugandaRecords.filter(r => r.sector === currentUser.sector);
    document.getElementById('umugandaSummary').innerHTML = `
        <p><strong>Total Attendance:</strong> ${sectorUmuganda.length}</p>
        <p><strong>This Month:</strong> ${sectorUmuganda.filter(r => {
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
    const sectorRegistrations = registerRecords.filter(r => r.sector === currentUser.sector);
    document.getElementById('registrationSummary').innerHTML = `
        <p><strong>Total Registered:</strong> ${sectorRegistrations.length}</p>
        <p><strong>New Members:</strong> ${sectorRegistrations.filter(r => r.status === 'New Member').length}</p>
    `;
    
    // Reports summary
    const drugsRecords = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    const violenceRecords = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    document.getElementById('reportsSummary').innerHTML = `
        <p><strong>Drug Reports:</strong> ${drugsRecords.length}</p>
        <p><strong>Violence Reports:</strong> ${violenceRecords.length}</p>
    `;
}

function truncateDescSector(text, len) {
    if (!text) return '—';
    return text.length <= len ? escapeHtml(text) : escapeHtml(text.slice(0, len)) + '…';
}

// Load reports (full details – visible automatically from citizens & village leaders)
function loadReports() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const reportedByLabel = (r) => r.reportedBy || '—';
    
    // Drugs reports – filter by sector, show all details including description
    const drugsRecords = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    const sectorDrugs = drugsRecords.filter(r => r.sector === currentUser.sector);
    const drugsBody = document.getElementById('drugsReportsBody');
    drugsBody.innerHTML = sectorDrugs.length > 0 ? 
        sectorDrugs.map(r => `
            <tr>
                <td>${escapeHtml(r.name)}</td>
                <td>${escapeHtml(r.sector || '—')}</td>
                <td>${escapeHtml(r.cell || '—')}</td>
                <td>${escapeHtml(r.village || '—')}</td>
                <td>${truncateDescSector(r.description, 40)}</td>
                <td>${escapeHtml(reportedByLabel(r))}</td>
                <td>${formatDate(r.date)}</td>
                <td><button class="btn btn-secondary" onclick="viewDrugsDetailsSector(${r.id})">View details</button></td>
            </tr>
        `).join('') : '<tr><td colspan="8">No reports in this sector</td></tr>';
    
    // Violence reports – filter by sector, show all details + View button
    const violenceRecords = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    const sectorViolence = violenceRecords.filter(r => r.sector === currentUser.sector);
    const violenceBody = document.getElementById('violenceReportsBody');
    violenceBody.innerHTML = sectorViolence.length > 0 ?
        sectorViolence.map(r => `
            <tr>
                <td>${escapeHtml(r.victimName)}</td>
                <td>${escapeHtml(r.telephone || '—')}</td>
                <td>${escapeHtml(r.sector || '—')}</td>
                <td>${escapeHtml(r.cell || '—')}</td>
                <td>${escapeHtml(r.village || '—')}</td>
                <td>${truncateDescSector(r.description, 40)}</td>
                <td>${escapeHtml(reportedByLabel(r))}</td>
                <td>${formatDate(r.date)}</td>
                <td><button class="btn btn-secondary" onclick="viewViolenceDetailsSector(${r.id})">View details</button></td>
            </tr>
        `).join('') : '<tr><td colspan="9">No reports in this sector</td></tr>';
}

window.viewDrugsDetailsSector = function(id) {
    const records = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    const record = records.find(r => r.id === id);
    if (record) {
        const details = `Name(s): ${record.name}\nLocation: ${record.village}, ${record.cell}, ${record.sector}\nReported by: ${record.reportedBy || '—'}\nDescription: ${record.description || '—'}\nDate: ${formatDate(record.date)}`;
        alert(details);
    }
};

window.viewViolenceDetailsSector = function(id) {
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
    
    const sectorCases = records.filter(r => r.level === 'Sector' && r.sector === currentUser.sector);
    
    document.getElementById('totalCases').textContent = sectorCases.length;
    document.getElementById('pendingCases').textContent = sectorCases.filter(r => r.status === 'Pending' || r.status === 'In Progress').length;
    document.getElementById('solvedCases').textContent = sectorCases.filter(r => r.status === 'Solved').length;
    document.getElementById('referredCases').textContent = sectorCases.filter(r => r.status === 'Referred').length;
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
function handleSectorChatSubmit(e) {
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

    const message = {
        id: Date.now(),
        fromName: currentUser.name,
        fromEmail: currentUser.email,
        fromRole: 'sector',
        toRole: toRole, // 'citizen', 'leader', 'cell'
        toEmail: sectorReplyTarget ? sectorReplyTarget.email : null,
        toName: sectorReplyTarget ? sectorReplyTarget.name : null,
        text: messageText,
        timestamp: new Date().toISOString()
    };

    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    messages.push(message);
    localStorage.setItem('chatMessages', JSON.stringify(messages));

    e.target.reset();
    loadSectorChatMessages();
}

// Load chat messages relevant for this sector leader
function loadSectorChatMessages() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];

    // Show messages where this sector leader is sender or receiver
    const relevant = messages.filter(m =>
        m.fromEmail === currentUser.email || m.toEmail === currentUser.email
    );

    const container = document.getElementById('sectorChatMessages');
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
function loadSectorInbox() {
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

    const tbody = document.getElementById('sectorInboxBody');
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
    const description = document.getElementById('sectorActivityDesc').value.trim();
    const place = document.getElementById('sectorActivityPlace').value.trim();
    const date = document.getElementById('sectorActivityDate').value;
    const fileInput = document.getElementById('sectorActivityImage');
    const file = fileInput && fileInput.files && fileInput.files[0];
    let imageData = 'https://via.placeholder.com/400x200?text=Activity';
    if (file) {
        try {
            const dataUrl = await readImageAsDataUrlSector(file);
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
        level: HOME_LEVEL_SECTOR,
        uploadedBy: getCurrentSectorLeaderName()
    });
    localStorage.setItem('activities', JSON.stringify(activities));
    e.target.reset();
    document.getElementById('sectorActivityDate').value = new Date().toISOString().slice(0, 10);
    loadSectorHomeUpdatesList();
    alert('Recent activity posted! It will appear on the home page.');
}

function handleSectorUpcomingSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('sectorUpcomingTitle').value.trim();
    const description = document.getElementById('sectorUpcomingDesc').value.trim();
    const place = document.getElementById('sectorUpcomingPlace').value.trim();
    const date = document.getElementById('sectorUpcomingDate').value;
    const news = JSON.parse(localStorage.getItem('news')) || [];
    news.push({
        id: Date.now(),
        title,
        description,
        place,
        date,
        level: HOME_LEVEL_SECTOR,
        uploadedBy: getCurrentSectorLeaderName()
    });
    localStorage.setItem('news', JSON.stringify(news));
    e.target.reset();
    document.getElementById('sectorUpcomingDate').value = new Date().toISOString().slice(0, 10);
    loadSectorHomeUpdatesList();
    alert('Upcoming session posted! It will appear on the home page.');
}

function handleSectorTrendingSubmit(e) {
    e.preventDefault();
    const description = document.getElementById('sectorTrendingDesc').value.trim();
    const place = document.getElementById('sectorTrendingPlace').value.trim();
    const date = document.getElementById('sectorTrendingDate').value;
    const trending = JSON.parse(localStorage.getItem('trending')) || [];
    trending.push({
        id: Date.now(),
        description,
        place,
        date,
        level: HOME_LEVEL_SECTOR,
        uploadedBy: getCurrentSectorLeaderName()
    });
    localStorage.setItem('trending', JSON.stringify(trending));
    e.target.reset();
    document.getElementById('sectorTrendingDate').value = new Date().toISOString().slice(0, 10);
    loadSectorHomeUpdatesList();
    alert('Trending topic posted! It will appear on the home page.');
}

function loadSectorHomeUpdatesList() {
    const listEl = document.getElementById('sectorHomeUpdatesList');
    if (!listEl) return;
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const news = JSON.parse(localStorage.getItem('news')) || [];
    const trending = JSON.parse(localStorage.getItem('trending')) || [];
    const myName = getCurrentSectorLeaderName();
    const myActivities = activities.filter(a => a.level === HOME_LEVEL_SECTOR && a.uploadedBy === myName);
    const myNews = news.filter(n => n.level === HOME_LEVEL_SECTOR && n.uploadedBy === myName);
    const myTrending = trending.filter(t => t.level === HOME_LEVEL_SECTOR && t.uploadedBy === myName);
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


