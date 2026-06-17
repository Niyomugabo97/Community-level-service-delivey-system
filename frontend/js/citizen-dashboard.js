// ===============================
// 🌐 FIXED API BASE (RAILWAY BACKEND)
// ===============================
const API_BASE = "https://backen-community-level-servece-delivery-system-production.up.railway.app/api";


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
    setupNavigation();
    setupForms();
    autoFillLocation();
    loadAllTables();
    loadCitizenChatMessages();
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

            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId)?.classList.add('active');
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('currentUser');
        window.location.href = 'home.html';
    });
}


// Setup all forms
function setupForms() {
    document.getElementById('drugsForm').addEventListener('submit', handleDrugsSubmit);
    document.getElementById('violenceForm').addEventListener('submit', handleViolenceSubmit);

    const chatForm = document.getElementById('citizenChatForm');
    if (chatForm) chatForm.addEventListener('submit', handleCitizenChatSubmit);

    const infraForm = document.getElementById('infrastructureForm');
    if (infraForm) infraForm.addEventListener('submit', handleInfrastructureSubmit);

    const visitorsForm = document.getElementById('visitorsForm');
    if (visitorsForm) visitorsForm.addEventListener('submit', handleVisitorsSubmit);

    const caseForm = document.getElementById('caseForm');
    if (caseForm) caseForm.addEventListener('submit', handleCaseSubmit);
}


// ===============================
// 🌐 API CORE FIXED FUNCTION
// ===============================
async function sendReportToServer(record) {
    try {
        const res = await fetch(`${API_BASE}/citizen-reports`, {
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


// ===============================
// 🚨 DRUGS
// ===============================
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
            description: document.getElementById('drugsDescription')?.value?.trim() || ''
        },
        reportedBy: currentUser?.name || 'Citizen',
        reportedByEmail: currentUser?.email || '',
        reportedByPhone: currentUser?.phone || '',
        dateReported: new Date().toISOString()
    };

    const saved = await sendReportToServer(record);

    alert(saved ? 'Drug report sent successfully!' : 'Failed to send drug report.');

    e.target.reset();
    autoFillLocation();
    loadDrugsTable();
}


// ===============================
// 📊 LOAD DRUGS
// ===============================
async function loadDrugsTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const tbody = document.getElementById('drugsTableBody');

    try {
        const res = await fetch(`${API_BASE}/citizen-reports?type=drugs&reportedByEmail=${encodeURIComponent(currentUser.email)}`);
        if (!res.ok) throw new Error();

        const data = await res.json();

        tbody.innerHTML = data.length
            ? data.map(r => `
                <tr>
                    <td>${escapeHtml(r.data.name)}</td>
                    <td>${escapeHtml(r.data.sector)}</td>
                    <td>${escapeHtml(r.data.cell)}</td>
                    <td>${escapeHtml(r.data.village)}</td>
                    <td>${escapeHtml(r.data.description || '')}</td>
                    <td>${formatDate(r.dateReported)}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="6">No reports yet</td></tr>`;

    } catch {
        tbody.innerHTML = `<tr><td colspan="6">Unable to load reports</td></tr>`;
    }
}


// ===============================
// 🚨 VIOLENCE
// ===============================
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
        reportedBy: currentUser?.name || 'Citizen',
        reportedByEmail: currentUser?.email || '',
        reportedByPhone: currentUser?.phone || '',
        dateReported: new Date().toISOString()
    };

    const saved = await sendReportToServer(record);

    alert(saved ? 'Violence report sent successfully!' : 'Failed to send violence report.');

    e.target.reset();
    autoFillLocation();
    loadViolenceTable();
}


// ===============================
// 📊 LOAD VIOLENCE
// ===============================
async function loadViolenceTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const tbody = document.getElementById('violenceTableBody');

    try {
        const res = await fetch(`${API_BASE}/citizen-reports?type=violence&reportedByEmail=${encodeURIComponent(currentUser.email)}`);
        if (!res.ok) throw new Error();

        const data = await res.json();

        tbody.innerHTML = data.length
            ? data.map(r => `
                <tr>
                    <td>${escapeHtml(r.data.victimName)}</td>
                    <td>${escapeHtml(r.data.telephone)}</td>
                    <td>${escapeHtml(r.data.sector)}</td>
                    <td>${escapeHtml(r.data.cell)}</td>
                    <td>${escapeHtml(r.data.village)}</td>
                    <td>${escapeHtml(r.data.description || '')}</td>
                    <td>${formatDate(r.dateReported)}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="7">No reports yet</td></tr>`;

    } catch {
        tbody.innerHTML = `<tr><td colspan="7">Unable to load reports</td></tr>`;
    }
}


// ===============================
// 🏗 INFRASTRUCTURE UPLOAD
// ===============================
async function uploadInfrastructureImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error('Upload failed');

    const data = await res.json();
    return data.url || data.path;
}


// ===============================
// 📊 LOAD ALL TABLES
// ===============================
function loadAllTables() {
    loadDrugsTable();
    loadViolenceTable();
}


// ===============================
// 📅 HELPERS
// ===============================
function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}


// ===============================
// 📍 AUTO FILL
// ===============================
function autoFillLocation() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) return;

    if (document.getElementById('drugsSector')) document.getElementById('drugsSector').value = user.sector || '';
    if (document.getElementById('drugsCell')) document.getElementById('drugsCell').value = user.cell || '';
    if (document.getElementById('drugsVillage')) document.getElementById('drugsVillage').value = user.village || '';

    if (document.getElementById('violenceSector')) document.getElementById('violenceSector').value = user.sector || '';
    if (document.getElementById('violenceCell')) document.getElementById('violenceCell').value = user.cell || '';
    if (document.getElementById('violenceVillage')) document.getElementById('violenceVillage').value = user.village || '';
}


// ===============================
// 💬 CHAT (LOCAL STORAGE)
// ===============================
function handleCitizenChatSubmit(e) {
    e.preventDefault();

    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const msg = document.getElementById('citizenChatMessage').value;

    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];

    messages.push({
        from: user.email,
        text: msg,
        time: new Date().toISOString()
    });

    localStorage.setItem('chatMessages', JSON.stringify(messages));

    e.target.reset();
}


// ===============================
// END FILE
// ===============================