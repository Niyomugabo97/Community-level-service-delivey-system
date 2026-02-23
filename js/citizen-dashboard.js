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
        window.location.href = 'login.html';
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
function handleDrugsSubmit(e) {
    e.preventDefault();
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    const record = {
        id: Date.now(),
        name: document.getElementById('drugsName').value,
        sector: document.getElementById('drugsSector').value,
        cell: document.getElementById('drugsCell').value,
        village: document.getElementById('drugsVillage').value,
        description: (document.getElementById('drugsDescription') && document.getElementById('drugsDescription').value) ? document.getElementById('drugsDescription').value.trim() : '',
        reportedBy: currentUser.name,
        reportedByEmail: currentUser.email,
        reportedByPhone: currentUser.phone || '',
        date: new Date().toISOString()
    };

    const records = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    records.push(record);
    localStorage.setItem('drugsRecords', JSON.stringify(records));

    e.target.reset();
    loadDrugsTable();
    alert('Drug report sent successfully! It will be visible on village, cell and sector pages.');
}

function loadDrugsTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const records = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    
    // Filter to show only current user's reports
    const userRecords = records.filter(r => r.reportedByEmail === currentUser.email);
    
    const tbody = document.getElementById('drugsTableBody');
    
    const trunc = (t, len) => (!t || t.length <= len) ? (t || '—') : t.slice(0, len) + '…';
    tbody.innerHTML = userRecords.length > 0 ? userRecords.map(record => `
        <tr>
            <td>${record.name}</td>
            <td>${record.sector}</td>
            <td>${record.cell}</td>
            <td>${record.village}</td>
            <td>${trunc(record.description, 40)}</td>
            <td>${formatDate(record.date)}</td>
        </tr>
    `).join('') : '<tr><td colspan="6">No reports yet</td></tr>';
}

// Report Sexual Violence
function handleViolenceSubmit(e) {
    e.preventDefault();
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    const record = {
        id: Date.now(),
        victimName: document.getElementById('violenceVictimName').value,
        telephone: document.getElementById('violenceTelephone').value,
        sector: document.getElementById('violenceSector').value,
        cell: document.getElementById('violenceCell').value,
        village: document.getElementById('violenceVillage').value,
        description: document.getElementById('violenceDescription').value,
        reportedBy: currentUser.name,
        reportedByEmail: currentUser.email,
        reportedByPhone: currentUser.phone || '',
        date: new Date().toISOString()
    };

    const records = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    records.push(record);
    localStorage.setItem('violenceRecords', JSON.stringify(records));

    e.target.reset();
    loadViolenceTable();
    alert('Sexual violence report sent successfully! It will be visible on village, cell and sector pages.');
}

function loadViolenceTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const records = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    
    // Filter to show only current user's reports
    const userRecords = records.filter(r => r.reportedByEmail === currentUser.email);
    
    const tbody = document.getElementById('violenceTableBody');
    
    const trunc = (t, len) => (!t || t.length <= len) ? (t || '—') : t.slice(0, len) + '…';
    tbody.innerHTML = userRecords.length > 0 ? userRecords.map(record => `
        <tr>
            <td>${record.victimName}</td>
            <td>${record.telephone}</td>
            <td>${record.sector}</td>
            <td>${record.cell}</td>
            <td>${record.village}</td>
            <td>${trunc(record.description, 40)}</td>
            <td>${formatDate(record.date)}</td>
        </tr>
    `).join('') : '<tr><td colspan="7">No reports yet</td></tr>';
}

// Load all tables
function loadAllTables() {
    loadDrugsTable();
    loadViolenceTable();
    loadInfrastructureTable();
    loadVisitorsTable();
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
function handleInfrastructureSubmit(e) {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    const place = document.getElementById('infrastructurePlace').value.trim();
    const dateVal = document.getElementById('infrastructureDate').value;
    const desc = (document.getElementById('infrastructureDescription') && document.getElementById('infrastructureDescription').value) ? document.getElementById('infrastructureDescription').value.trim() : '';
    const fileInput = document.getElementById('infrastructureImage');
    const file = fileInput && fileInput.files && fileInput.files[0];

    function saveReport(imageData) {
        const record = {
            id: Date.now(),
            place: place,
            date: dateVal,
            image: imageData || null,
            description: desc,
            reportedBy: currentUser ? currentUser.name : 'Citizen',
            reportedByEmail: currentUser ? currentUser.email : '',
            dateReported: new Date().toISOString()
        };

        const records = JSON.parse(localStorage.getItem('infrastructureReports')) || [];
        records.push(record);
        localStorage.setItem('infrastructureReports', JSON.stringify(records));

        e.target.reset();
        loadInfrastructureTable();
        alert('Infrastructure report submitted successfully!');
    }

    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            saveReport(evt.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        saveReport(null);
    }
}

function loadInfrastructureTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const records = JSON.parse(localStorage.getItem('infrastructureReports')) || [];
    const userRecords = records.filter(r => r.reportedByEmail === currentUser.email);
    const tbody = document.getElementById('infrastructureTableBody');
    if (!tbody) return;

    tbody.innerHTML = userRecords.length > 0 ? userRecords.map(r => `
        <tr>
            <td>${escapeHtml(r.place)}</td>
            <td>${formatDate(r.date || r.dateReported)}</td>
            <td>${r.image ? `<img src="${r.image}" alt="img" style="width:80px;height:50px;object-fit:cover;border-radius:4px;" />` : '—'}</td>
            <td>${truncateDesc(r.description, 60)}</td>
            <td>${formatDate(r.dateReported)}</td>
        </tr>
    `).join('') : '<tr><td colspan="5">No reports yet</td></tr>';
}

// Handle visitors/guests report submission (citizen)
function handleVisitorsSubmit(e) {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};

    const record = {
        id: Date.now(),
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
        returnDate: document.getElementById('visitorReturnDate').value,
        reportedBy: currentUser.name || 'Citizen',
        reportedByEmail: currentUser.email || '',
        dateReported: new Date().toISOString()
    };

    const records = JSON.parse(localStorage.getItem('visitorReports')) || [];
    records.push(record);
    localStorage.setItem('visitorReports', JSON.stringify(records));

    e.target.reset();
    loadVisitorsTable();
    alert('Visitor report submitted successfully!');
}

function loadVisitorsTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const records = JSON.parse(localStorage.getItem('visitorReports')) || [];
    const userRecords = records.filter(r => r.reportedByEmail === currentUser.email);
    const tbody = document.getElementById('visitorsTableBody');
    if (!tbody) return;

    tbody.innerHTML = userRecords.length > 0 ? userRecords.map(r => `
        <tr>
            <td>${escapeHtml(r.visitorNames)}</td>
            <td>${r.visitorCount}</td>
            <td>${escapeHtml(r.visitorIDs || '—')}</td>
            <td>${escapeHtml([r.fromProvince, r.fromDistrict, r.fromSector, r.fromCell, r.fromVillage].filter(Boolean).join(' / '))}</td>
            <td>${truncateDesc(r.reason, 60)}</td>
            <td>${r.returnDate ? formatDate(r.returnDate) : '—'}</td>
            <td>${formatDate(r.dateReported)}</td>
        </tr>
    `).join('') : '<tr><td colspan="7">No visitor reports yet</td></tr>';
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