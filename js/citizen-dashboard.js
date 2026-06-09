// Citizen Dashboard JavaScript

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser || currentUser.userType !== 'citizen') {
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
    
    // Auto fill location details
    autoFillLocation();
    
    // Load data tables
    loadAllTables();
    
    // Load chat messages
    loadCitizenChatMessages();

    // Prepare leader list for private chat
    setupLeaderRecipients();
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

// Setup all forms
function setupForms() {
    // Drugs form
    document.getElementById('drugsForm').addEventListener('submit', handleDrugsSubmit);
    
    // Violence form
    document.getElementById('violenceForm').addEventListener('submit', handleViolenceSubmit);
    
     // Chat form
    const chatForm = document.getElementById('citizenChatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', handleCitizenChatSubmit);
    }
    
    // Infrastructure form
    const infraForm = document.getElementById('infrastructureForm');
    if (infraForm) infraForm.addEventListener('submit', handleInfrastructureSubmit);

    // Visitors form
    const visitorsForm = document.getElementById('visitorsForm');
    if (visitorsForm) visitorsForm.addEventListener('submit', handleVisitorsSubmit);

    // Case form
    const caseForm = document.getElementById('caseForm');
    if (caseForm) caseForm.addEventListener('submit', handleCaseSubmit);
}

// Send report to backend API; returns true on success, false on failure
async function sendReportToServer(record) {
    try {
        const res = await fetch('/api/citizen-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        if (!res.ok) throw new Error('Server responded with ' + res.status);
        return true;
    } catch (err) {
        console.warn('sendReportToServer failed:', err);
        return false;
    }
}

async function uploadInfrastructureImage(file) {
    try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error('Upload failed: ' + res.status + ' ' + errorText);
        }

        const data = await res.json();
        return data.url || data.path || null;
    } catch (err) {
        console.error('uploadInfrastructureImage failed:', err);
        throw err;
    }
}

// Build leader recipients dropdown based on selected role
function setupLeaderRecipients() {
    const roleSelect = document.getElementById('chatRecipientRole');
    const userSelect = document.getElementById('chatRecipientUser');
    if (!roleSelect || !userSelect) return;

    const users = JSON.parse(localStorage.getItem('users')) || [];

    function fillLeaders() {
        const role = roleSelect.value;
        const leaders = users.filter(u => u.userType === role);
        if (leaders.length === 0) {
            userSelect.innerHTML = '<option value=\"\">No leaders registered</option>';
            return;
        }
        userSelect.innerHTML = '<option value=\"\">Select Leader</option>' +
            leaders.map(u => `<option value=\"${u.email}\">${u.name} (${u.email})</option>`).join('');
    }

    roleSelect.addEventListener('change', fillLeaders);
    fillLeaders();
}

// Report Drugs
async function handleDrugsSubmit(e) {
    e.preventDefault();
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    const record = {
        type: 'drugs',
        data: {
            name: document.getElementById('drugsName').value,
            sector: document.getElementById('drugsSector').value,
            cell: document.getElementById('drugsCell').value,
            village: document.getElementById('drugsVillage').value,
            description: (document.getElementById('drugsDescription') && document.getElementById('drugsDescription').value) ? document.getElementById('drugsDescription').value.trim() : ''
        },
        reportedBy: currentUser ? currentUser.name : 'Citizen',
        reportedByEmail: currentUser ? currentUser.email : '',
        reportedByPhone: currentUser ? (currentUser.phone || '') : '',
        dateReported: new Date().toISOString()
    };

    const saved = await sendReportToServer(record);
    if (!saved) {
        alert('Failed to send drug report to server. Please try again.');
    } else {
        alert('Drug report sent successfully!');
    }

    e.target.reset();
    autoFillLocation();
    loadDrugsTable();
}

async function loadDrugsTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const tbody = document.getElementById('drugsTableBody');
    const trunc = (t, len) => (!t || t.length <= len) ? (t || '—') : t.slice(0, len) + '…';

    try {
        const res = await fetch(`/api/citizen-reports?type=drugs&reportedByEmail=${encodeURIComponent(currentUser.email)}`);
        if (!res.ok) throw new Error('Server error');
        const userRecords = await res.json();
        tbody.innerHTML = userRecords.length > 0 ? userRecords.map(r => `
            <tr>
                <td>${escapeHtml(r.data.name)}</td>
                <td>${escapeHtml(r.data.sector)}</td>
                <td>${escapeHtml(r.data.cell)}</td>
                <td>${escapeHtml(r.data.village)}</td>
                <td>${trunc(r.data.description, 40)}</td>
                <td>${formatDate(r.dateReported)}</td>
            </tr>
        `).join('') : '<tr><td colspan="6">No reports yet</td></tr>';
    } catch (err) {
        console.warn('Could not load drugs reports:', err);
        tbody.innerHTML = '<tr><td colspan="6">Unable to load reports</td></tr>';
    }
}

// Report Sexual Violence
async function handleViolenceSubmit(e) {
    e.preventDefault();
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    const record = {
        type: 'violence',
        data: {
            victimName: document.getElementById('violenceVictimName').value,
            telephone: document.getElementById('violenceTelephone').value,
            sector: document.getElementById('violenceSector').value,
            cell: document.getElementById('violenceCell').value,
            village: document.getElementById('violenceVillage').value,
            description: document.getElementById('violenceDescription').value
        },
        reportedBy: currentUser ? currentUser.name : 'Citizen',
        reportedByEmail: currentUser ? currentUser.email : '',
        reportedByPhone: currentUser ? (currentUser.phone || '') : '',
        dateReported: new Date().toISOString()
    };

    const saved = await sendReportToServer(record);
    if (!saved) {
        alert('Failed to send violence report to server. Please try again.');
    } else {
        alert('Sexual violence report sent successfully!');
    }

    e.target.reset();
    autoFillLocation();
    loadViolenceTable();
}

async function loadViolenceTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const tbody = document.getElementById('violenceTableBody');
    const trunc = (t, len) => (!t || t.length <= len) ? (t || '—') : t.slice(0, len) + '…';

    try {
        const res = await fetch(`/api/citizen-reports?type=violence&reportedByEmail=${encodeURIComponent(currentUser.email)}`);
        if (!res.ok) throw new Error('Server error');
        const userRecords = await res.json();
        tbody.innerHTML = userRecords.length > 0 ? userRecords.map(r => `
            <tr>
                <td>${escapeHtml(r.data.victimName)}</td>
                <td>${escapeHtml(r.data.telephone)}</td>
                <td>${escapeHtml(r.data.sector)}</td>
                <td>${escapeHtml(r.data.cell)}</td>
                <td>${escapeHtml(r.data.village)}</td>
                <td>${trunc(r.data.description, 40)}</td>
                <td>${formatDate(r.dateReported)}</td>
            </tr>
        `).join('') : '<tr><td colspan="7">No reports yet</td></tr>';
    } catch (err) {
        console.warn('Could not load violence reports:', err);
        tbody.innerHTML = '<tr><td colspan="7">Unable to load reports</td></tr>';
    }
}

// Load all tables
function loadAllTables() {
    loadDrugsTable();
    loadViolenceTable();
    loadInfrastructureTable();
    loadVisitorsTable();
    loadCaseTable();
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

// Handle infrastructure report submission (citizen)
async function handleInfrastructureSubmit(e) {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    const place = document.getElementById('infrastructurePlace').value.trim();
    const dateVal = document.getElementById('infrastructureDate').value;
    const desc = (document.getElementById('infrastructureDescription') && document.getElementById('infrastructureDescription').value) ? document.getElementById('infrastructureDescription').value.trim() : '';
    const fileInput = document.getElementById('infrastructureImage');
    const file = fileInput && fileInput.files && fileInput.files[0];

    let imageUrl = null;
    if (file) {
        try {
            imageUrl = await uploadInfrastructureImage(file);
        } catch (err) {
            alert('Failed to upload infrastructure image. Please try again.');
            return;
        }
    }

    const record = {
        type: 'infrastructure',
        data: {
            place: place,
            date: dateVal,
            image: imageUrl,
            description: desc
        },
        reportedBy: currentUser ? currentUser.name : 'Citizen',
        reportedByEmail: currentUser ? currentUser.email : '',
        dateReported: new Date().toISOString()
    };

    const saved = await sendReportToServer(record);
    if (!saved) {
        alert('Failed to send infrastructure report to server. Please try again.');
    } else {
        alert('Infrastructure report submitted successfully!');
        e.target.reset();
        autoFillLocation();
        loadInfrastructureTable();
    }
}

async function loadInfrastructureTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const tbody = document.getElementById('infrastructureTableBody');
    if (!tbody) return;

    try {
        const res = await fetch(`/api/citizen-reports?type=infrastructure&reportedByEmail=${encodeURIComponent(currentUser.email)}`);
        if (!res.ok) throw new Error('Server error');
        const userRecords = await res.json();
        tbody.innerHTML = userRecords.length > 0 ? userRecords.map(r => `
            <tr>
                <td>${escapeHtml(r.data.place)}</td>
                <td>${formatDate(r.data.date || r.dateReported)}</td>
                <td>${r.data.image ? `<img src="${r.data.image}" alt="img" style="width:80px;height:50px;object-fit:cover;border-radius:4px;" />` : '—'}</td>
                <td>${truncateDesc(r.data.description, 60)}</td>
                <td>${formatDate(r.dateReported)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editInfrastructureReport('${r._id}')"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteInfrastructureReport('${r._id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="6">No reports yet</td></tr>';
    } catch (err) {
        console.warn('Could not load infrastructure reports:', err);
        tbody.innerHTML = '<tr><td colspan="6">Unable to load reports</td></tr>';
    }
}

// Handle visitors/guests report submission (citizen)
async function handleVisitorsSubmit(e) {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};

    const record = {
        type: 'visitors',
        data: {
            yourSector: document.getElementById('visitorYourSector').value,
            yourCell: document.getElementById('visitorYourCell').value,
            yourVillage: document.getElementById('visitorYourVillage').value,
            yourTelephone: document.getElementById('visitorYourTelephone').value,
            visitorNames: document.getElementById('visitorNames').value,
            visitorCount: parseInt(document.getElementById('visitorCount').value) || 1,
            visitorIDs: document.getElementById('visitorIDs').value,
            visitorTelephone: document.getElementById('visitorTelephone').value,
            fromProvince: document.getElementById('visitorFromProvince').value,
            fromDistrict: document.getElementById('visitorFromDistrict').value,
            fromSector: document.getElementById('visitorFromSector').value,
            fromCell: document.getElementById('visitorFromCell').value,
            fromVillage: document.getElementById('visitorFromVillage').value,
            reason: document.getElementById('visitorReason').value,
            returnDate: document.getElementById('visitorReturnDate').value
        },
        reportedBy: currentUser.name || 'Citizen',
        reportedByEmail: currentUser.email || '',
        dateReported: new Date().toISOString()
    };

    const saved = await sendReportToServer(record);
    if (!saved) {
        alert('Failed to send visitor report to server. Please try again.');
    } else {
        alert('Visitor report submitted successfully!');
    }

    e.target.reset();
    autoFillLocation();
    loadVisitorsTable();
}

async function loadVisitorsTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const tbody = document.getElementById('visitorsTableBody');
    if (!tbody) return;

    try {
        const res = await fetch(`/api/citizen-reports?type=visitors&reportedByEmail=${encodeURIComponent(currentUser.email)}`);
        if (!res.ok) throw new Error('Server error');
        const userRecords = await res.json();
        tbody.innerHTML = userRecords.length > 0 ? userRecords.map(r => `
            <tr>
                <td>${escapeHtml(r.data.visitorNames)}</td>
                <td>${r.data.visitorCount}</td>
                <td>${escapeHtml(r.data.visitorIDs || '—')}</td>
                <td>${escapeHtml([r.data.fromProvince, r.data.fromDistrict, r.data.fromSector, r.data.fromCell, r.data.fromVillage].filter(Boolean).join(' / '))}</td>
                <td>${truncateDesc(r.data.reason, 60)}</td>
                <td>${r.data.returnDate ? formatDate(r.data.returnDate) : '—'}</td>
                <td>${formatDate(r.dateReported)}</td>
            </tr>
        `).join('') : '<tr><td colspan="7">No visitor reports yet</td></tr>';
    } catch (err) {
        console.warn('Could not load visitor reports:', err);
        tbody.innerHTML = '<tr><td colspan="7">Unable to load reports</td></tr>';
    }
}

// ===== Chat between Citizen and Leaders =====

// Handle sending chat message from citizen
function handleCitizenChatSubmit(e) {
    e.preventDefault();
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const toRole = document.getElementById('chatRecipientRole').value;
    const toEmail = document.getElementById('chatRecipientUser').value;
    const messageText = document.getElementById('citizenChatMessage').value.trim();
    
    if (!toEmail) {
        alert('Please select which leader you want to chat with.');
        return;
    }

    if (!messageText) {
        alert('Please enter a message.');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const targetUser = users.find(u => u.email === toEmail);
    const toName = targetUser ? targetUser.name : toEmail;
    
    const message = {
        id: Date.now(),
        fromName: currentUser.name,
        fromEmail: currentUser.email,
        fromRole: 'citizen',
        toName,
        toEmail,
        toRole: toRole, // 'leader', 'cell', 'sector'
        text: messageText,
        timestamp: new Date().toISOString()
    };
    
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    messages.push(message);
    localStorage.setItem('chatMessages', JSON.stringify(messages));
    
    e.target.reset();
    loadCitizenChatMessages();
}

// Load chat messages relevant for this citizen
function loadCitizenChatMessages() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    
    // Show messages where this citizen is sender or receiver (per-conversation)
    const relevant = messages.filter(m => 
        m.fromEmail === currentUser.email || m.toEmail === currentUser.email
    );
    
    const container = document.getElementById('citizenChatMessages');
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

// Helper to format date & time
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

// Helper to label roles
function roleLabel(role) {
    switch (role) {
        case 'leader': return 'Village Leader';
        case 'cell': return 'Cell Leader';
        case 'sector': return 'Sector Leader';
        case 'citizen': return 'Citizen';
        default: return role;
    }
}

// Simple HTML escaping
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateDesc(text, len) {
    if (!text) return '—';
    return text.length <= len ? escapeHtml(text) : escapeHtml(text.slice(0, len)) + '…';
}

// Auto fill location details for citizen
function autoFillLocation() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Drugs Form
    if (document.getElementById('drugsSector')) document.getElementById('drugsSector').value = currentUser.sector || '';
    if (document.getElementById('drugsCell')) document.getElementById('drugsCell').value = currentUser.cell || '';
    if (document.getElementById('drugsVillage')) document.getElementById('drugsVillage').value = currentUser.village || '';

    // Violence Form
    if (document.getElementById('violenceSector')) document.getElementById('violenceSector').value = currentUser.sector || '';
    if (document.getElementById('violenceCell')) document.getElementById('violenceCell').value = currentUser.cell || '';
    if (document.getElementById('violenceVillage')) document.getElementById('violenceVillage').value = currentUser.village || '';

    // Visitors Form
    if (document.getElementById('visitorYourSector')) document.getElementById('visitorYourSector').value = currentUser.sector || '';
    if (document.getElementById('visitorYourCell')) document.getElementById('visitorYourCell').value = currentUser.cell || '';
    if (document.getElementById('visitorYourVillage')) document.getElementById('visitorYourVillage').value = currentUser.village || '';
    if (document.getElementById('visitorYourTelephone')) document.getElementById('visitorYourTelephone').value = currentUser.telephone || currentUser.phone || '';

    // Case Form
    if (document.getElementById('caseReporterName')) document.getElementById('caseReporterName').value = currentUser.name || '';
    if (document.getElementById('caseSector')) document.getElementById('caseSector').value = currentUser.sector || '';
    if (document.getElementById('caseCell')) document.getElementById('caseCell').value = currentUser.cell || '';
    if (document.getElementById('caseVillage')) document.getElementById('caseVillage').value = currentUser.village || '';
}

// Convert file to Base64
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Custom Citizen Case Submit
async function handleCaseSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('caseSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
    }

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const fileInput = document.getElementById('caseEvidenceImage');
    const file = fileInput ? fileInput.files[0] : null;

    let imageData = null;
    if (file) {
        try {
            imageData = await convertToBase64(file);
        } catch (err) {
            console.warn('Failed to convert image to base64:', err);
        }
    }

    const reporterName = document.getElementById('caseReporterName') ? document.getElementById('caseReporterName').value.trim() : (currentUser ? currentUser.name : 'Citizen');
    const caseData = {
        id: Date.now(),
        type: document.getElementById('caseType').value,
        title: document.getElementById('caseTitle').value,
        description: document.getElementById('caseDescription').value,
        sector: document.getElementById('caseSector').value,
        cell: document.getElementById('caseCell').value,
        village: document.getElementById('caseVillage').value,
        accusedName: document.getElementById('caseAccusedName').value,
        accusedPhone: document.getElementById('caseAccusedPhone').value,
        incidentDate: document.getElementById('caseIncidentDate').value,
        priority: document.getElementById('casePriority').value,
        image: imageData,
        status: "pending",
        level: "Village",
        escalatedToCellAt: null,
        escalatedToSectorAt: null,
        createdAt: new Date().toISOString()
    };

    const record = {
        type: 'case',
        data: caseData,
        reportedBy: reporterName,
        reportedByEmail: currentUser ? currentUser.email : '',
        reportedByPhone: currentUser ? (currentUser.phone || '') : '',
        dateReported: new Date().toISOString()
    };

    const saved = await sendReportToServer(record);
    if (!saved) {
        // Fallback to local storage if server fails
        const cases = JSON.parse(localStorage.getItem('citizenCases')) || [];
        cases.push(caseData);
        localStorage.setItem('citizenCases', JSON.stringify(cases));
        alert('Case saved locally due to server issues.');
    } else {
        const successMessage = document.getElementById('caseSuccessMessage');
        if (successMessage) {
            successMessage.style.display = "block";
            setTimeout(() => {
                successMessage.style.display = "none";
            }, 3000);
        } else {
            alert('Case submitted successfully!');
        }
    }

    e.target.reset();
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Case";
    }
    autoFillLocation();
    loadCaseTable();
}

async function loadCaseTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const tbody = document.getElementById('caseTableBody');
    if (!tbody) return;

    let cases = [];
    try {
        const res = await fetch(`/api/citizen-reports?type=case&reportedByEmail=${encodeURIComponent(currentUser.email)}`);
        if (!res.ok) throw new Error('Server error');
        const userRecords = await res.json();
        cases = userRecords.map(r => ({ ...r.data, _id: r._id, reportedBy: r.reportedBy }));
    } catch (err) {
        console.warn('Could not load cases from server, loading from localStorage:', err);
        const localCases = JSON.parse(localStorage.getItem('citizenCases')) || [];
        cases = localCases.map(c => ({ ...c, reportedBy: currentUser.name }));
    }

    if (cases.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #666; padding: 20px;">No cases submitted yet</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = cases.reverse().map(c => {
        const statusClass = c.status === 'resolved' ? 'status-solved' :
            c.status === 'under-review' ? 'status-escalated' : 'status-pending';
            
        const priorityClass = c.priority === 'emergency' ? 'status-escalated' :
            c.priority === 'high' ? 'status-escalated' : 
            c.priority === 'medium' ? 'status-pending' : 'status-solved';

        const level = c.level || 'Village';
        const countdownHtml = getCaseCountdownHtml(c);

        return `
            <tr>
                <td>${escapeHtml(c.type)}</td>
                <td>${escapeHtml(c.title)}</td>
                <td>${escapeHtml(c.reportedBy || currentUser.name)}</td>
                <td><span class="status-badge ${priorityClass}">${capitalize(c.priority)}</span></td>
                <td><span class="status-badge status-pending" style="background: #e2f0fe; color: #1f4e79; border: 1px solid #b8daff;">${level}</span></td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${capitalize(c.status)}
                    </span>
                </td>
                <td>${countdownHtml}</td>
                <td>
                    ${c.image ? `<img src="${c.image}" style="width:80px;height:50px;object-fit:cover;border-radius:4px;" />` : 'No Image'}
                </td>
                <td>${formatDate(c.incidentDate || c.createdAt)}</td>
            </tr>
        `;
    }).join('');

    if (!citizenCasesInterval) {
        startCountdownUpdates();
    }
}

function getCaseCountdownHtml(c) {
    if (c.status === 'resolved') {
        return `<span style="color: #28a745; font-weight: bold;"><i class="fa-solid fa-circle-check"></i> Solved</span>`;
    }

    const now = new Date();
    const createdAtTime = new Date(c.createdAt).getTime();
    const ESCALATION_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

    let deadline = createdAtTime + ESCALATION_PERIOD_MS;
    if (c.level === 'Cell') {
        const escalatedToCellTime = new Date(c.escalatedToCellAt || c.createdAt).getTime();
        deadline = escalatedToCellTime + ESCALATION_PERIOD_MS;
    } else if (c.level === 'Sector') {
        return `<span style="color: #dc3545; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> Sector (Max)</span>`;
    }

    const timeLeft = deadline - now.getTime();
    if (timeLeft <= 0) {
        return `<span style="color: #dc3545; font-weight: bold;">Escalating...</span>`;
    }

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    let displayStr = '';
    if (days > 0) displayStr += `${days}d `;
    if (hours > 0 || days > 0) displayStr += `${hours}h `;
    displayStr += `${minutes}m`;

    let color = '#28a745'; 
    if (days < 2) {
        color = '#dc3545'; 
    } else if (days < 5) {
        color = '#fd7e14'; 
    }

    return `<span style="color: ${color}; font-weight: bold;"><i class="fa-regular fa-clock"></i> ${displayStr}</span>`;
}

function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

let citizenCasesInterval = null;
function startCountdownUpdates() {
    if (citizenCasesInterval) clearInterval(citizenCasesInterval);
    citizenCasesInterval = setInterval(() => {
        const caseTable = document.getElementById('caseTable');
        if (caseTable && caseTable.getBoundingClientRect().width > 0) {
            loadCaseTable();
        }
    }, 30000);
}
// Edit Infrastructure Report
function editInfrastructureReport(reportId) {
    alert('Edit functionality for report ID: ' + reportId + ' will be implemented');
    // TODO: Implement edit modal or redirect to edit page
}

// Delete Infrastructure Report
async function deleteInfrastructureReport(reportId) {
    if (!confirm('Are you sure you want to delete this report?')) {
        return;
    }

    try {
        const res = await fetch('/api/citizen-reports/' + reportId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.ok) throw new Error('Server error');
        
        alert('Report deleted successfully');
        loadInfrastructureTable();
    } catch (err) {
        console.error('Error deleting report:', err);
        alert('Failed to delete report');
    }
}
