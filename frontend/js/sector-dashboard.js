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
    await updateCaseSelect();
    loadSectorChatMessages();
    loadSectorInbox();
    setupHomeUpdatesTabs();
    setupHomeUpdateForms();
    await loadSectorHomeUpdatesList();
}

// Load escalated cases
async function loadCaseTable() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        
        // Fetch citizen reports with type 'case' from the database
        const response = await fetch('/api/citizen-reports?type=case');
        const records = await response.json();
        
        // Filter cases escalated to Sector level
        const sectorCases = records.filter(record => 
            record.level === 'Sector' && 
            record.status !== 'Solved' &&
            record.data?.sector === currentUser.sector
        );
    
    const tbody = document.getElementById('caseTableBody');
    
    if (sectorCases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center;">No escalated cases at Sector level</td></tr>';
        return;
    }
    
    tbody.innerHTML = sectorCases.map(record => {
        const data = record.data || {};
        const statusClass = data.status === 'Solved' ? 'status-solved' : 
                           data.status === 'Escalated' ? 'status-escalated' : 
                           data.status === 'In Progress' ? 'status-in-progress' : 'status-pending';
        
        // Calculate countdown
        const countdown = calculateCountdown(record);
        
        return `
            <tr>
                <td>#${data.id || record._id}</td>
                <td>${data.plaintiff || '—'}</td>
                <td>${data.defendant || '—'}</td>
                <td>${data.cell || '—'}</td>
                <td>${data.village || '—'}</td>
                <td>${data.leaderName || '—'}</td>
                <td>${(data.description || '').substring(0, 50)}${(data.description || '').length > 50 ? '...' : ''}</td>
                <td><span class="status-badge ${statusClass}">${data.status || 'Pending'}</span></td>
                <td>${data.escalatedDate ? formatDate(data.escalatedDate) : formatDate(data.caseDate || data.dateReported)}</td>
                <td>
                    <div class="countdown-timer" data-case-id="${record._id}" data-resolution-date="${data.sectorResolutionDate || data.expectedResolutionDate || ''}">
                        ${countdown}
                    </div>
                </td>
                <td>
                    <button class="btn btn-secondary" onclick="viewCaseDetails('${record._id}')">View</button>
                    ${(data.status === 'Pending' || data.status === 'In Progress') ? 
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
            tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: red;">Error loading cases</td></tr>';
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
            record.data?.level === 'Sector' && 
            record.data?.status !== 'Solved' &&
            record.data?.sector === currentUser.sector
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
            const data = record.data || {};
            const details = `
Case ID: #${data.id || '?'}
Plaintiff: ${data.plaintiff || '?'}
Defendant: ${data.defendant || '?'}
Village: ${data.village || '?'}
Cell: ${data.cell || '?'}
Sector: ${data.sector || '?'}
Original Leader: ${data.leaderName || '?'}
Status: ${data.status || '?'}
Level: ${data.level || '?'}
Case Date: ${data.caseDate ? formatDate(data.caseDate) : 'N/A'}
Escalated Date: ${data.escalatedDate ? formatDate(data.escalatedDate) : 'N/A'}

Description:
${data.description || 'N/A'}

${data.cellResolutionNotes ? `\nCell Resolution Notes:\n${data.cellResolutionNotes}` : ''}
${data.sectorResolutionNotes ? `\nSector Resolution Notes:\n${data.sectorResolutionNotes}` : ''}
            `;
            alert(details);
        }
    } catch (err) {
        console.error('Error viewing case details:', err);
        alert('Error loading case details');
    }
};

// Load activities
async function loadActivities() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        
        // Fetch home updates for activities
        const homeResponse = await fetch('/api/home-updates');
        const homeUpdates = await homeResponse.json();
        const activities = homeUpdates.filter(r => r.type === 'activity');
        
        // Fetch inteko meetings
        const intekoResponse = await fetch('/api/inteko');
        const intekoRecords = await intekoResponse.json();
        
        // Fetch members for registration summary
        const memberResponse = await fetch('/api/members?sector=' + currentUser.sector);
        const members = await memberResponse.json();
        
        // Fetch citizen reports for drug and violence reports
        const reportsResponse = await fetch('/api/citizen-reports');
        const reports = await reportsResponse.json();
        const drugsRecords = reports.filter(r => r.type === 'drugs');
        const violenceRecords = reports.filter(r => r.type === 'violence');
        
        document.getElementById('umugandaSummary').innerHTML = `
            <p><strong>Total Activities:</strong> ${activities.length}</p>
            <p><strong>This Month:</strong> ${activities.filter(r => {
                const date = new Date(r.createdAt || r.date);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}</p>
        `;
        
        document.getElementById('intekoSummary').innerHTML = `
            <p><strong>Total Meetings:</strong> ${intekoRecords.length}</p>
            <p><strong>This Month:</strong> ${intekoRecords.filter(r => {
                const date = new Date(r.meetingDate);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}</p>
        `;
        
        document.getElementById('registrationSummary').innerHTML = `
            <p><strong>Total Registered:</strong> ${members.length}</p>
            <p><strong>New Members:</strong> ${members.filter(r => r.status === 'New Member').length}</p>
        `;
        
        document.getElementById('reportsSummary').innerHTML = `
            <p><strong>Drug Reports:</strong> ${drugsRecords.length}</p>
            <p><strong>Violence Reports:</strong> ${violenceRecords.length}</p>
        `;
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
        
        // Fetch citizen reports from database
        const response = await fetch('/api/citizen-reports');
        const reports = await response.json();
        
        // Filter by sector and type
        const sectorDrugs = reports.filter(r => 
            r.type === 'drugs' && 
            r.data?.sector === currentUser.sector
        );
        const sectorViolence = reports.filter(r => 
            r.type === 'violence' && 
            r.data?.sector === currentUser.sector
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
        const response = await fetch('/api/citizen-reports');
        const records = await response.json();
        const record = records.find(r => r._id === id);
        if (record) {
            const data = record.data || {};
            const details = `Name(s): ${data.name || '—'}\nLocation: ${data.village || '—'}, ${data.cell || '—'}, ${data.sector || '—'}\nReported by: ${data.reportedBy || record.reportedBy || '—'}\nDescription: ${data.description || '—'}\nDate: ${formatDate(record.dateReported || record.createdAt)}`;
            alert(details);
        }
    } catch (err) {
        console.error('Error viewing drugs details:', err);
    }
};

window.viewViolenceDetailsSector = async function(id) {
    try {
        const response = await fetch('/api/citizen-reports');
        const records = await response.json();
        const record = records.find(r => r._id === id);
        if (record) {
            const data = record.data || {};
            const details = `Victim: ${data.victimName || '—'}\nTelephone: ${data.telephone || '—'}\nLocation: ${data.village || '—'}, ${data.cell || '—'}, ${data.sector || '—'}\nReported by: ${data.reportedBy || record.reportedBy || '—'}\nDescription: ${data.description || '—'}\nDate: ${formatDate(record.dateReported || record.createdAt)}`;
            alert(details);
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
        
        const sectorCases = records.filter(r => 
            r.data?.level === 'Sector' && 
            r.data?.sector === currentUser.sector
        );
        
        document.getElementById('totalCases').textContent = sectorCases.length;
        document.getElementById('pendingCases').textContent = sectorCases.filter(r => 
            r.data?.status === 'Pending' || r.data?.status === 'In Progress'
        ).length;
        document.getElementById('solvedCases').textContent = sectorCases.filter(r => 
            r.data?.status === 'Solved'
        ).length;
        document.getElementById('referredCases').textContent = sectorCases.filter(r => 
            r.data?.status === 'Referred'
        ).length;
    } catch (err) {
        console.error('Error loading statistics:', err);
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
                    imageUrl = uploadData.secure_url || uploadData.imageUrl;
                    publicId = uploadData.public_id || uploadData.publicId;
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


