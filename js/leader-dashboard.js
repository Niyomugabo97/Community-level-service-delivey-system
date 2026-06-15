// Leader Dashboard JavaScript

// Check if ApiService is available
if (typeof ApiService === 'undefined') {
    console.error('ApiService is not loaded. Please ensure api.js is loaded before leader-dashboard.js');
    // Create a simple fallback API service
    window.ApiService = class {
        constructor() {
            this.baseURL = 'https://backen-community-level-servece-delivery-system-production.up.railway.app/api';
        }

        async createHomeUpdate(data, file) {
            throw new Error('API Service not available');
        }

        async createMember(data) {
            throw new Error('API Service not available');
        }

        async updateMember(id, data) {
            throw new Error('API Service not available');
        }

        async saveAttendance(data) {
            throw new Error('API Service not available');
        }
    };
}

// Check authentication
document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!currentUser || currentUser.userType !== 'leader') {
        window.location.href = 'login.html';
        return;
    }

    // Face recognition system removed - no longer needed

    // Initialize dashboard
    async function initializeDashboard() {
        try {
            console.log('Initializing dashboard...');

            // Load locations from MongoDB first so dropdowns are populated
            try {
                await loadLocationsFromDB();
                console.log('Locations loaded from DB');
            } catch (error) {
                console.warn('Locations load failed, using defaults:', error);
            }

            // Initialize attendance tracking for existing members
            try {
                initializeAllMembersAttendanceTracking();
                console.log('Attendance tracking initialized');
            } catch (error) {
                console.warn('Attendance tracking initialization failed:', error);
            }

            // Setup navigation and forms
            try {
                setupNavigation();
                setupForms();
                console.log('Navigation and forms setup complete');
            } catch (error) {
                console.warn('Navigation/forms setup failed:', error);
            }

            // Load all data with error handling for each
            try {
                await loadAllTables();
                console.log('Tables loaded successfully');
            } catch (error) {
                console.warn('Failed to load tables:', error);
            }

            try {
                await loadLeaderHomeUpdates();
                console.log('Home updates loaded successfully');
            } catch (error) {
                console.warn('Failed to load home updates:', error);
            }

            try {
                await loadLeaderChatMessages();
                console.log('Chat messages loaded successfully');
            } catch (error) {
                console.warn('Failed to load chat messages:', error);
            }

            try {
                await loadLeaderInbox();
                console.log('Inbox loaded successfully');
            } catch (error) {
                console.warn('Failed to load inbox:', error);
            }

            // Home updates (activities, upcoming, trending)
            try {
                setupHomeUpdatesTabs();
                setupHomeUpdateForms();
                await loadLeaderHomeUpdatesList();
                console.log('Home updates setup complete');
            } catch (error) {
                console.warn('Home updates setup failed:', error);
            }

            console.log('Dashboard initialization completed successfully');
            showNotification('Dashboard loaded successfully!', 'success');

        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            showNotification('Dashboard partially loaded. Some features may not work properly.', 'warning');
        }
    }

    initializeDashboard();
});

function setupNavigation() {
    const menu = document.querySelector('.dashboard-menu');
    const links = () => Array.from(document.querySelectorAll('.dashboard-menu a'));
    const sections = () => Array.from(document.querySelectorAll('.dashboard-section'));

    function activateSection(sectionId, { updateHash = true } = {}) {
        if (!sectionId) return;

        const section = document.getElementById(sectionId);
        if (!section) {
            console.warn('Unknown dashboard section:', sectionId);
            return;
        }

        links().forEach(l => l.classList.remove('active'));
        sections().forEach(s => s.classList.remove('active'));

        const activeLink = links().find(l => l.getAttribute('data-section') === sectionId);
        if (activeLink) activeLink.classList.add('active');
        section.classList.add('active');

        if (updateHash) {
            // Keep URL in sync for refresh/back button support
            history.replaceState(null, '', `#${encodeURIComponent(sectionId)}`);
        }

        // Ensure the newly-activated content is visible
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Load analytics data when section 4 is activated
        if (sectionId === 'analytics') {
            loadUmugandaAnalytics();
            loadIntekoAnalytics();
        }
    }

    // Delegate clicks so it works even if menu is re-rendered
    if (menu) {
        menu.addEventListener('click', (e) => {
            const link = e.target?.closest?.('a[data-section]');
            if (!link) return;
            e.preventDefault();
            activateSection(link.getAttribute('data-section'));
        });
    }

    // Restore section from hash (or default to register)
    const initial = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    activateSection(initial || 'register', { updateHash: false });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('currentUser');
        window.location.href = 'home.html';
    });
}

// =========================
// Yearly Performance (Attendance)
// - Starts at 100% every year
// - Marking Absent decreases by 1% (only when switching into Absent)
// - Marking Present does not increase it back
// =========================
function getPerformanceYear() {
    return String(new Date().getFullYear());
}

function loadPerformanceStore() {
    try {
        return JSON.parse(localStorage.getItem('memberPerformanceByYear')) || {};
    } catch {
        return {};
    }
}

function savePerformanceStore(store) {
    try {
        localStorage.setItem('memberPerformanceByYear', JSON.stringify(store));
    } catch (e) {
        console.warn('Failed to save performance store', e);
    }
}

function ensureMemberPerformance(memberId) {
    const year = getPerformanceYear();
    const store = loadPerformanceStore();
    store[year] ||= {};
    store[year][memberId] ||= { score: 100, absences: 0, updatedAt: new Date().toISOString() };
    savePerformanceStore(store);
    return store[year][memberId];
}

function getMemberPerformancePercents(memberId) {
    const entry = ensureMemberPerformance(memberId);
    const present = Math.max(0, Math.min(100, Number(entry.score) || 0));
    const absent = 100 - present;
    return { present, absent };
}

function applyAbsentPenalty(memberId) {
    const year = getPerformanceYear();
    const store = loadPerformanceStore();
    store[year] ||= {};
    const entry = store[year][memberId] || { score: 100, absences: 0 };
    entry.score = Math.max(0, (Number(entry.score) || 100) - 1);
    entry.absences = (Number(entry.absences) || 0) + 1;
    entry.updatedAt = new Date().toISOString();
    store[year][memberId] = entry;
    savePerformanceStore(store);
    return entry;
}

function renderPerformanceText(memberId) {
    const { present, absent } = getMemberPerformancePercents(memberId);
    return `Present: ${present}% | Absent: ${absent}%`;
}

function updatePerformanceUI(memberId) {
    const el = document.getElementById(`perf-${memberId}`);
    if (el) el.textContent = renderPerformanceText(memberId);
}

// Setup all forms
function setupForms() {
    // Inteko form
    document.getElementById('intekoForm').addEventListener('submit', handleIntekoSubmit);
    setupIntekoDynamicFields();

    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegisterSubmit);
    // Toggle return-time visibility based on status
    const regStatusEl = document.getElementById('regStatus');
    const regReturnGroup = document.getElementById('regReturnGroup');
    const regReturnInput = document.getElementById('regReturnTime');
    const regArrivalGroup = document.getElementById('regArrivalGroup');
    const regArrivalInput = document.getElementById('regArrivalTime');
    function updateRegReturnVisibility() {
        if (!regStatusEl) return;

        // If New Member: show arrival, hide return
        if (regStatusEl.value === 'New Member') {
            if (regArrivalGroup) regArrivalGroup.style.display = '';
            if (regArrivalInput) regArrivalInput.required = true;

            if (regReturnGroup) regReturnGroup.style.display = 'none';
            if (regReturnInput) { regReturnInput.required = false; regReturnInput.value = ''; }

            // If Current Member: hide both arrival and return
        } else if (regStatusEl.value === 'Current Member') {
            if (regArrivalGroup) { regArrivalGroup.style.display = 'none'; if (regArrivalInput) { regArrivalInput.required = false; regArrivalInput.value = ''; } }
            if (regReturnGroup) { regReturnGroup.style.display = 'none'; if (regReturnInput) { regReturnInput.required = false; regReturnInput.value = ''; } }

            // Default: show both but keep not required
        } else {
            if (regArrivalGroup) regArrivalGroup.style.display = '';
            if (regArrivalInput) regArrivalInput.required = false;
            if (regReturnGroup) regReturnGroup.style.display = '';
            if (regReturnInput) regReturnInput.required = false;
        }
    }
    if (regStatusEl) {
        regStatusEl.addEventListener('change', updateRegReturnVisibility);
        updateRegReturnVisibility();
    }

    // Insurance form
    document.getElementById('insuranceForm').addEventListener('submit', handleInsuranceSubmit);

    // Drugs form
    document.getElementById('drugsForm').addEventListener('submit', handleDrugsSubmit);

    // Violence form
    document.getElementById('violenceForm').addEventListener('submit', handleViolenceSubmit);

    // Case form
    const caseForm = document.getElementById('caseForm');
    if (caseForm) caseForm.addEventListener('submit', handleCaseSubmit);

    // Infrastructure form (leader)
    const leaderInfraForm = document.getElementById('leaderInfrastructureForm');
    if (leaderInfraForm) leaderInfraForm.addEventListener('submit', handleLeaderInfrastructureSubmit);

    // Chat form
    const leaderChatForm = document.getElementById('leaderChatForm');
    if (leaderChatForm) {
        leaderChatForm.addEventListener('submit', handleLeaderChatSubmit);
    }
    const leaderActivityForm = document.getElementById('leaderActivityForm');
    if (leaderActivityForm) leaderActivityForm.addEventListener('submit', handleLeaderActivitySubmit);
    const leaderUpcomingForm = document.getElementById('leaderUpcomingForm');
    if (leaderUpcomingForm) leaderUpcomingForm.addEventListener('submit', handleLeaderUpcomingSubmit);
    const leaderTrendingForm = document.getElementById('leaderTrendingForm');
    if (leaderTrendingForm) leaderTrendingForm.addEventListener('submit', handleLeaderTrendingSubmit);
}

async function loadUmugandaTable() {
    try {
        // If the new "Saved Attendance Records" UI exists, render that instead.
        // This keeps the old (debug) implementation from interfering.
        if (document.getElementById('umugandaSavedRecordsWrap') && document.getElementById('umugandaTableBody')) {
            return loadUmugandaSavedRecordsTable();
        }

        // Fetch data from MongoDB API
        const api = new ApiService();
        const [umugandaRecords, umugandaData] = await Promise.all([
            api.getAttendance({ checkInMethod: 'face' }),
            api.getAttendance({ checkInMethod: 'manual' })
        ]);

        // Get records from both possible sources
        const records1 = umugandaRecords;
        const records2 = umugandaData;

        // Merge records (remove duplicates based on name + date)
        const allRecords = [...records1, ...records2];

        const uniqueRecords = allRecords.filter((record, index, self) => {
            const duplicateIndex = self.findIndex((r) =>
                r.name === record.name && r.date === record.date
            );
            return index === duplicateIndex;
        });

        // Determine this leader's location (prefer currentLeaderLocation, then account data)
        let location = currentLeaderLocation;

        if (!location) {
            const user = JSON.parse(sessionStorage.getItem('currentUser')) || {};
            location = {
                sector: user.sector || user.leaderSector || null,
                cell: user.cell || user.leaderCell || null,
                village: user.village || user.leaderVillage || null
            };
            console.log('Location from user data:', location);
        }

        // Filter records so each leader only sees their own village/cell/sector
        let scopedRecords = uniqueRecords;

        // RE-ENABLE LOCATION FILTERING - Each village sees only their records
        if (location && (location.sector || location.cell || location.village)) {
            console.log('DEBUG - Location filter details:', JSON.stringify(location, null, 2));
            console.log('DEBUG - Available records before filtering:', uniqueRecords.length);

            // Show sample records to debug location matching
            console.log('DEBUG - Sample saved records:');
            uniqueRecords.slice(0, 3).forEach((r, i) => {
                console.log(`${i + 1}. Name: ${r.name}, Sector: "${r.sector}", Cell: "${r.cell}", Village: "${r.village}"`);
            });

            scopedRecords = uniqueRecords.filter(r => {
                const matchesSector = !location.sector || r.sector === location.sector;
                const matchesCell = !location.cell || r.cell === location.cell;
                const matchesVillage = !location.village || r.village === location.village;

                console.log('DEBUG - Record check:', {
                    recordName: r.name,
                    recordSector: `"${r.sector}"`,
                    recordCell: `"${r.cell}"`,
                    recordVillage: `"${r.village}"`,
                    filterSector: `"${location.sector}"`,
                    filterCell: `"${location.cell}"`,
                    filterVillage: `"${location.village}"`,
                    matchesSector,
                    matchesCell,
                    matchesVillage,
                    allMatch: matchesSector && matchesCell && matchesVillage
                });

                return matchesSector && matchesCell && matchesVillage;
            });
            console.log('Filtered records for location:', scopedRecords.length);
            console.log('Location filter details:', location);
        }

        // Sort by date (newest first)
        scopedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Update village name in header
        const villageNameElement = document.getElementById('currentVillageName');
        if (villageNameElement && location && location.village) {
            villageNameElement.textContent = `${location.village}, ${location.cell}, ${location.sector}`;
        }

        // Refresh tables and statistics
        console.log('About to refresh tables...');

        // IMMEDIATELY SHOW SAVED RECORDS - bypass all filtering for now
        const savedRecords = JSON.parse(localStorage.getItem('umugandaData')) || [];
        const tbody = document.getElementById('umugandaTableBody');

        if (savedRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">No attendance records found</td></tr>';
            return;
        }

        // Sort by date (newest first)
        savedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Create table rows
        let tableHTML = '';
        savedRecords.forEach((record, index) => {
            const methodIcon = record.checkInMethod === 'face_recognition'
                ? '<i class="fa-solid fa-face-smile" style="color: #28a745;"></i> Face Recognition'
                : '<i class="fa-solid fa-keyboard" style="color: #007bff;"></i> Manual';

            tableHTML += `
            <tr data-index="${index}">
                <td>${record.name}</td>
                <td>${record.age || '-'}</td>
                <td>${record.sex || '-'}</td>
                <td>${record.sector || '-'}</td>
                <td>${record.cell || '-'}</td>
                <td>${record.village || '-'}</td>
                <td>${formatDate(record.date)}</td>
                <td>${methodIcon}</td>
                <td>-</td>
            </tr>
        `;
        });

        tbody.innerHTML = tableHTML;
        console.log('Attendance records displayed:', savedRecords.length);
    } catch (error) {
        console.error('Error loading umuganda table:', error);
        // Fallback to localStorage if API fails
        const umugandaRecords = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
        const umugandaData = JSON.parse(localStorage.getItem('umugandaData')) || [];

        // Get records from both possible sources
        const records1 = umugandaRecords;
        const records2 = umugandaData;

        // Merge records (remove duplicates based on name + date)
        const allRecords = [...records1, ...records2];

        const uniqueRecords = allRecords.filter((record, index, self) => {
            const duplicateIndex = self.findIndex((r) =>
                r.name === record.name && r.date === record.date
            );
            return index === duplicateIndex;
        });

        // Continue with localStorage logic...
        // (rest of the function would continue here)
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function populateUmugandaSavedRecordsFilters(members) {
    const sectorSelect = document.getElementById('umugandaFilterSector');
    const cellSelect = document.getElementById('umugandaFilterCell');
    const villageSelect = document.getElementById('umugandaFilterVillage');
    if (!sectorSelect || !cellSelect || !villageSelect) return;

    const prevSector = sectorSelect.value || '';
    const prevCell = cellSelect.value || '';
    const prevVillage = villageSelect.value || '';

    const sectors = [...new Set(members.map(m => (m.sector || '').trim()).filter(Boolean))].sort();
    const cells = [...new Set(members.map(m => (m.cell || '').trim()).filter(Boolean))].sort();
    const villages = [...new Set(members.map(m => (m.village || '').trim()).filter(Boolean))].sort();

    sectorSelect.innerHTML = '<option value="">All Sectors</option>' + sectors.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    cellSelect.innerHTML = '<option value="">All Cells</option>' + cells.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    villageSelect.innerHTML = '<option value="">All Villages</option>' + villages.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');

    // Keep previous selection if still available
    sectorSelect.value = sectors.includes(prevSector) ? prevSector : '';
    cellSelect.value = cells.includes(prevCell) ? prevCell : '';
    villageSelect.value = villages.includes(prevVillage) ? prevVillage : '';
}

function filterUmugandaSavedRecords() {
    const tbody = document.getElementById('umugandaTableBody');
    if (!tbody) return;

    const searchInput = document.getElementById('umugandaSearchName');
    const nameTerm = (searchInput?.value || '').trim().toLowerCase();

    const sectorSelect = document.getElementById('umugandaFilterSector');
    const cellSelect = document.getElementById('umugandaFilterCell');
    const villageSelect = document.getElementById('umugandaFilterVillage');

    const sector = sectorSelect?.value || '';
    const cell = cellSelect?.value || '';
    const village = villageSelect?.value || '';

    const rows = Array.from(tbody.querySelectorAll('tr[data-name]'));
    rows.forEach(row => {
        const rowName = (row.dataset.name || '').toLowerCase();
        const rowSector = row.dataset.sector || '';
        const rowCell = row.dataset.cell || '';
        const rowVillage = row.dataset.village || '';

        const matchesName = !nameTerm || rowName.includes(nameTerm);
        const matchesSector = !sector || rowSector === sector;
        const matchesCell = !cell || rowCell === cell;
        const matchesVillage = !village || rowVillage === village;

        row.style.display = (matchesName && matchesSector && matchesCell && matchesVillage) ? '' : 'none';
    });
}

function loadUmugandaSavedRecordsTable() {
    const tbody = document.getElementById('umugandaTableBody');
    const wrapper = document.getElementById('umugandaSavedRecordsWrap');
    if (!tbody || !wrapper) return;

    const attendanceDate = sessionStorage.getItem('lastUmugandaAttendanceDate') || new Date().toISOString().split('T')[0];
    const members = JSON.parse(localStorage.getItem('registerRecords')) || [];

    // Load all normalized attendance records for the chosen day
    const allRecords = getAllUmugandaAttendanceRecords();
    const dayRecords = allRecords.filter(r => r.day === attendanceDate);

    // Map citizenKey -> record for quick lookup
    const byCitizenKey = {};
    dayRecords.forEach(r => {
        const key = r.citizenKey;
        if (!key) return;
        byCitizenKey[key] = r; // keep last
    });

    // Render rows: ALL registered members + attendance status for this day + performance
    const rowsHtml = members.map(member => {
        const key = member.telephone;
        const attendance = byCitizenKey[key];

        let attendanceStatus = '-';
        if (attendance && attendance.status) {
            if (attendance.status === 'present') attendanceStatus = 'Present';
            else if (attendance.status === 'absent') attendanceStatus = 'Absent';
        }

        const performanceText = renderPerformanceText(member.telephone);

        return `
            <tr
                data-name="${escapeHtml(member.name)}"
                data-sector="${escapeHtml((member.sector || '').trim())}"
                data-cell="${escapeHtml((member.cell || '').trim())}"
                data-village="${escapeHtml((member.village || '').trim())}"
                data-telephone="${escapeHtml(member.telephone)}"
            >
                <td>${escapeHtml(member.name)}</td>
                <td>${escapeHtml(member.sex || '')}</td>
                <td>${escapeHtml(member.age || '')}</td>
                <td>${escapeHtml(member.telephone || '')}</td>
                <td>${escapeHtml(member.sector || '')}</td>
                <td>${escapeHtml(member.cell || '')}</td>
                <td>${escapeHtml(member.village || '')}</td>
                <td>${escapeHtml(attendanceStatus)}</td>
                <td>${escapeHtml(performanceText)}</td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml || '<tr><td colspan="9" style="text-align: center; color: #666;">No registered members found</td></tr>';

    // Fill filters and apply current filter immediately
    populateUmugandaSavedRecordsFilters(members);
    wrapper.style.display = '';
    filterUmugandaSavedRecords();
}

// Inteko Minutes
function setupIntekoDynamicFields() {
    // Add attendee
    document.getElementById('addAttendeeBtn').addEventListener('click', () => {
        const container = document.getElementById('attendeesContainer');
        const newItem = document.createElement('div');
        newItem.className = 'attendee-item';
        newItem.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" class="attendee-name" required>
                </div>
                <div class="form-group">
                    <label>Role / Position</label>
                    <input type="text" class="attendee-role">
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger remove-attendee">Remove</button>
                </div>
            </div>
        `;
        container.appendChild(newItem);

        newItem.querySelector('.remove-attendee').addEventListener('click', () => {
            newItem.remove();
        });
    });

    // Add agenda
    document.getElementById('addAgendaBtn').addEventListener('click', () => {
        const container = document.getElementById('agendaContainer');
        const count = container.children.length + 1;
        const newItem = document.createElement('div');
        newItem.className = 'agenda-item';
        newItem.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Agenda Number</label>
                    <input type="number" class="agenda-number" value="${count}" required>
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" class="agenda-title" required>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger remove-agenda">Remove</button>
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="agenda-description" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>Presenter</label>
                <input type="text" class="agenda-presenter">
            </div>
        `;
        container.appendChild(newItem);

        newItem.querySelector('.remove-agenda').addEventListener('click', () => {
            newItem.remove();
        });
    });

    // Add decision
    document.getElementById('addDecisionBtn').addEventListener('click', () => {
        const container = document.getElementById('decisionsContainer');
        const newItem = document.createElement('div');
        newItem.className = 'decision-item';
        newItem.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Decision ID</label>
                    <input type="text" class="decision-id" required>
                </div>
                <div class="form-group">
                    <label>Decision Type</label>
                    <select class="decision-type" required>
                        <option value="">Select</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Deferred">Deferred</option>
                    </select>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger remove-decision">Remove</button>
                </div>
            </div>
            <div class="form-group">
                <label>Decision Description</label>
                <textarea class="decision-description" rows="3" required></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Voting Method</label>
                    <select class="voting-method">
                        <option value="">Select</option>
                        <option value="Consensus">Consensus</option>
                        <option value="Majority vote">Majority vote</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Votes Yes</label>
                    <input type="number" class="votes-yes" min="0">
                </div>
                <div class="form-group">
                    <label>Votes No</label>
                    <input type="number" class="votes-no" min="0">
                </div>
                <div class="form-group">
                    <label>Abstain</label>
                    <input type="number" class="votes-abstain" min="0">
                </div>
            </div>
            <div class="form-group">
                <label>Effective Date</label>
                <input type="date" class="effective-date">
            </div>
        `;
        container.appendChild(newItem);

        newItem.querySelector('.remove-decision').addEventListener('click', () => {
            newItem.remove();
        });
    });

    // Add action
    document.getElementById('addActionBtn').addEventListener('click', () => {
        const container = document.getElementById('actionsContainer');
        const newItem = document.createElement('div');
        newItem.className = 'action-item';
        newItem.innerHTML = `
            <div class="form-group">
                <label>Action Description</label>
                <textarea class="action-description" rows="2" required></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Responsible Person / Department</label>
                    <input type="text" class="responsible-person" required>
                </div>
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" class="start-date">
                </div>
                <div class="form-group">
                    <label>Deadline</label>
                    <input type="date" class="deadline">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select class="action-status">
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger remove-action">Remove</button>
                </div>
            </div>
            <div class="form-group">
                <label>Progress Notes</label>
                <textarea class="progress-notes" rows="2"></textarea>
            </div>
        `;
        container.appendChild(newItem);

        newItem.querySelector('.remove-action').addEventListener('click', () => {
            newItem.remove();
        });
    });
}

async function handleIntekoSubmit(e) {
    e.preventDefault();

    // Collect attendees
    const attendees = [];
    document.querySelectorAll('.attendee-item').forEach(item => {
        attendees.push({
            name: item.querySelector('.attendee-name').value,
            role: item.querySelector('.attendee-role').value
        });
    });

    // Collect agenda items
    const agendaItems = [];
    document.querySelectorAll('.agenda-item').forEach(item => {
        agendaItems.push({
            number: item.querySelector('.agenda-number').value,
            title: item.querySelector('.agenda-title').value,
            description: item.querySelector('.agenda-description').value,
            presenter: item.querySelector('.agenda-presenter').value
        });
    });

    // Collect decisions
    const decisions = [];
    document.querySelectorAll('.decision-item').forEach(item => {
        decisions.push({
            id: item.querySelector('.decision-id').value,
            type: item.querySelector('.decision-type').value,
            description: item.querySelector('.decision-description').value,
            votingMethod: item.querySelector('.voting-method').value,
            votesYes: item.querySelector('.votes-yes').value,
            votesNo: item.querySelector('.votes-no').value,
            votesAbstain: item.querySelector('.votes-abstain').value,
            effectiveDate: item.querySelector('.effective-date').value
        });
    });

    // Collect action items
    const actions = [];
    document.querySelectorAll('.action-item').forEach(item => {
        actions.push({
            description: item.querySelector('.action-description').value,
            responsiblePerson: item.querySelector('.responsible-person').value,
            startDate: item.querySelector('.start-date').value,
            deadline: item.querySelector('.deadline').value,
            status: item.querySelector('.action-status').value,
            progressNotes: item.querySelector('.progress-notes').value
        });
    });

    const record = {
        meetingTitle: document.getElementById('meetingTitle').value,
        meetingType: document.getElementById('meetingType').value,
        meetingDate: document.getElementById('meetingDate').value,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        location: document.getElementById('venue').value || '',
        attendees: attendees.length,
        agenda: JSON.stringify(agendaItems),
        decisions: JSON.stringify(decisions),
        actionItems: JSON.stringify(actions),
        reportSummary: document.getElementById('reportSummary').value,
        keyOutcomes: document.getElementById('keyOutcomes').value,
        challenges: document.getElementById('challenges').value,
        recommendations: document.getElementById('recommendations').value,
        attachedFiles: [document.getElementById('attachedFiles').value || ''],
        leaderName: document.getElementById('preparedBy').value || 'Leader'
    };

    try {
        const api = new ApiService();
        await api.createIntekoRecord(record);
    } catch (err) {
        console.warn('Failed to save Inteko record to MongoDB, falling back to local storage:', err);
        const fallback = {
            id: Date.now(),
            ...record,
            chairperson: document.getElementById('chairperson').value,
            minutesStatus: document.getElementById('minutesStatus').value,
            createdAt: new Date().toISOString()
        };
        const records = JSON.parse(localStorage.getItem('intekoRecords')) || [];
        records.push(fallback);
        localStorage.setItem('intekoRecords', JSON.stringify(records));
    }

    e.target.reset();
    await loadIntekoRecords();
    showNotification('Inteko minutes saved successfully!', 'success');
}

async function loadIntekoRecords() {
    const container = document.getElementById('intekoRecords');
    if (!container) return;

    let records = [];
    try {
        const api = new ApiService();
        const serverRecords = await api.getIntekoRecords();
        records = serverRecords.map(r => ({
            id: r._id,
            meetingTitle: r.meetingTitle || '—',
            meetingType: r.meetingType || '—',
            meetingDate: r.meetingDate || r.createdAt,
            chairperson: r.leaderName || '—',
            minutesStatus: r.reportSummary ? 'Final' : 'Pending',
            attendees: r.attendees || 0
        }));
    } catch (err) {
        console.warn('Failed to load Inteko records from server, falling back to local storage:', err);
        const localRecords = JSON.parse(localStorage.getItem('intekoRecords')) || [];
        records = localRecords.map(r => ({
            id: r.id,
            meetingTitle: r.meetingTitle || '—',
            meetingType: r.meetingType || '—',
            meetingDate: r.meetingDate || r.createdAt,
            chairperson: r.chairperson || '—',
            minutesStatus: r.minutesStatus || '—',
            attendees: r.attendees?.length || 0
        }));
    }

    container.innerHTML = records.map(record => `
        <div class="inteko-record-card" style="background: white; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h4>${record.meetingTitle}</h4>
            <p><strong>Type:</strong> ${record.meetingType}</p>
            <p><strong>Date:</strong> ${formatDate(record.meetingDate)}</p>
            <p><strong>Chairperson:</strong> ${record.chairperson}</p>
            <p><strong>Status:</strong> ${record.minutesStatus}</p>
            <button class="btn btn-secondary" onclick="viewIntekoDetails('${record.id}')">View Details</button>
        </div>
    `).join('');
}

// Register New People
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const editingInfo = sessionStorage.getItem('editingMember');
    const isEditing = editingInfo !== null;

    const record = {
        name: document.getElementById('regName').value,
        sex: document.getElementById('regSex').value,
        age: parseInt(document.getElementById('regAge').value),
        telephone: document.getElementById('regTelephone').value,
        sector: document.getElementById('regSector').value,
        cell: document.getElementById('regCell').value,
        village: document.getElementById('regVillage').value,
        status: document.getElementById('regStatus').value,
        role: 'member',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        // Check if ApiService is available
        if (typeof ApiService === 'undefined') {
            throw new Error('ApiService not available - falling back to localStorage');
        }

        // Use API service to save to MongoDB
        const api = new ApiService();

        if (isEditing) {
            // Update existing member in MongoDB
            const editingRecord = JSON.parse(editingInfo);
            const result = await api.updateMember(editingRecord.id, record);

            console.log('Member updated in MongoDB:', result);
            showNotification('Member updated successfully!', 'success');

            // Reset editing state
            sessionStorage.removeItem('editingMember');
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Register Member';
            submitBtn.classList.remove('btn-warning');
            submitBtn.classList.add('btn-primary');

        } else {
            // Add new member to MongoDB
            const result = await api.createMember(record);

            console.log('Member registered in MongoDB:', result);
            showNotification('Member registered successfully!', 'success');

            // Initialize attendance tracking for new member
            initializeAttendanceTracking(record.telephone, record.name);
        }

        // Reset form
        e.target.reset();

        // Reload tables
        loadRegisterTable();
        loadAttendanceList();
        updateSectorVillageFilters();

    } catch (error) {
        console.error('Error saving member to MongoDB:', error);
        showNotification('Error saving member: ' + error.message, 'error');

        // Fallback to localStorage if API fails
        const fallbackRecord = {
            id: isEditing ? JSON.parse(editingInfo).id : Date.now(),
            ...record,
            date: new Date().toISOString()
        };

        if (isEditing) {
            const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
            const index = records.findIndex(r => r.id === fallbackRecord.id);
            if (index !== -1) {
                records[index] = fallbackRecord;
                localStorage.setItem('registerRecords', JSON.stringify(records));
                showNotification('Member updated successfully!', 'success');
            }

            sessionStorage.removeItem('editingMember');
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Register Member';
            submitBtn.classList.remove('btn-warning');
            submitBtn.classList.add('btn-primary');

        } else {
            const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
            records.push(fallbackRecord);
            localStorage.setItem('registerRecords', JSON.stringify(records));

            initializeAttendanceTracking(fallbackRecord.telephone, fallbackRecord.name);
            showNotification('Member registered successfully! Current attendance rate: 0%', 'success');
        }

        e.target.reset();
        loadRegisterTable();
        loadAttendanceList();
        updateSectorVillageFilters();
    }
}

// Module-level cache so edit/delete can look up records by _id
window._cachedMembers = [];

// Module-level location cache (loaded from MongoDB on init)
window._cachedLocations = { sectors: ['Ruhuha', 'Nyarugenge', 'Mayange'], cells: [], villages: [] };
window._cachedLocationsId = null;

async function loadLocationsFromDB() {
    try {
        const api = new ApiService();
        const docs = await api.getLocations();
        if (docs && docs.length > 0) {
            window._cachedLocations = {
                sectors: docs[0].sectors || [],
                cells: docs[0].cells || [],
                villages: docs[0].villages || []
            };
            window._cachedLocationsId = docs[0]._id;
        } else {
            const defaults = { sectors: ['Ruhuha', 'Nyarugenge', 'Mayange'], cells: [], villages: [] };
            const created = await api.createLocations(defaults);
            window._cachedLocations = defaults;
            window._cachedLocationsId = created._id;
        }
        localStorage.setItem('systemLocations', JSON.stringify(window._cachedLocations));
    } catch (err) {
        console.warn('Failed to load locations from DB, using localStorage:', err);
        const stored = JSON.parse(localStorage.getItem('systemLocations'));
        if (stored && Array.isArray(stored.sectors) && stored.sectors.length > 0) {
            window._cachedLocations = stored;
        }
    }
}

async function saveLocationsToDB(locations) {
    window._cachedLocations = locations;
    localStorage.setItem('systemLocations', JSON.stringify(locations));
    try {
        const api = new ApiService();
        if (window._cachedLocationsId) {
            await api.updateLocations(window._cachedLocationsId, locations);
        } else {
            const created = await api.createLocations(locations);
            window._cachedLocationsId = created._id;
        }
    } catch (err) {
        console.warn('Locations saved to localStorage only (DB unavailable):', err);
    }
}

async function loadRegisterTable() {
    const tbody = document.getElementById('registerTableBody');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#666;">Loading...</td></tr>';

    let records = [];
    try {
        const api = new ApiService();
        records = await api.getMembers();
    } catch (err) {
        console.warn('API fetch failed, falling back to localStorage:', err);
        records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    }

    window._cachedMembers = records;

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">No registered members found</td></tr>';
        return;
    }

    tbody.innerHTML = records.map((record) => {
        const memberId = record._id || record.id;
        const attendancePercentage = calculateAttendancePercentage(record.telephone, record.name);

        let attendanceDisplay = '';
        if (attendancePercentage === 0) {
            attendanceDisplay = `<span style="color: #dc3545; font-weight: bold;">${attendancePercentage}% <i class="fa-solid fa-circle-xmark"></i></span>`;
        } else if (attendancePercentage < 50) {
            attendanceDisplay = `<span style="color: #ffc107; font-weight: bold;">${attendancePercentage}% <i class="fa-solid fa-triangle-exclamation"></i></span>`;
        } else if (attendancePercentage < 80) {
            attendanceDisplay = `<span style="color: #fd7e14; font-weight: bold;">${attendancePercentage}% <i class="fa-solid fa-user-check"></i></span>`;
        } else {
            attendanceDisplay = `<span style="color: #28a745; font-weight: bold;">${attendancePercentage}% <i class="fa-solid fa-star"></i></span>`;
        }

        return `
            <tr data-member-id="${memberId}">
                <td>${record.name}</td>
                <td>${record.sex}</td>
                <td>${record.telephone}</td>
                <td>${record.sector}</td>
                <td>${record.cell}</td>
                <td>${record.village}</td>
                <td>${record.age}</td>
                <td>${record.status}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editMemberRecord('${memberId}')">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMemberRecord('${memberId}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Check if member has face registration
function checkFaceRegistration(idNumber) {
    if (!faceSystem) return false;
    return faceSystem.faceDescriptors.has(idNumber);
}

// Calculate attendance percentage for a member (monthly Umuganda tracking)
function calculateAttendancePercentage(memberTelephone, memberName) {
    console.log(`Calculating attendance for ${memberName} (${memberTelephone})`);

    // Get all attendance records
    const records1 = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
    const records2 = JSON.parse(localStorage.getItem('umugandaData')) || [];
    const allRecords = [...records1, ...records2];

    // Remove duplicates
    const uniqueRecords = allRecords.filter((record, index, self) =>
        index === self.findIndex((r) =>
            r.name === record.name && r.date === record.date
        )
    );

    // Extract unique months (YYYY-MM format) from attendance dates
    const uniqueMonths = [...new Set(uniqueRecords.map(r => r.date.substring(0, 7)))].sort();
    const totalMonthlySessions = uniqueMonths.length;

    console.log('Total monthly sessions found:', totalMonthlySessions);
    console.log('Unique months:', uniqueMonths);

    // Count member's attendance for each month
    const memberMonthlyAttendance = uniqueMonths.filter(month => {
        return uniqueRecords.some(record =>
            (record.name === memberName || (record.citizenId && record.citizenId === memberTelephone)) &&
            record.date.substring(0, 7) === month &&
            record.status === 'present'
        );
    }).length;

    console.log('Member attended months:', memberMonthlyAttendance);

    // Calculate percentage - return 0% for new members with no sessions
    if (totalMonthlySessions === 0 || memberMonthlyAttendance === 0) return 0;

    const percentage = Math.round((memberMonthlyAttendance / totalMonthlySessions) * 100);
    console.log(`Final attendance percentage for ${memberName}: ${percentage}%`);

    return percentage;
}

// Initialize attendance tracking for new member (monthly Umuganda)
function initializeAttendanceTracking(memberTelephone, memberName) {
    const attendanceTracking = JSON.parse(localStorage.getItem('attendanceTracking')) || {};

    if (!attendanceTracking[memberTelephone]) {
        attendanceTracking[memberTelephone] = {
            name: memberName,
            totalMonthlySessions: 0,
            attendedMonthlySessions: 0,
            lastUpdated: new Date().toISOString(),
            registrationDate: new Date().toISOString()
        };

        localStorage.setItem('attendanceTracking', JSON.stringify(attendanceTracking));
    }
}

// Update attendance tracking when member attends (monthly Umuganda)
function updateAttendanceTracking(memberTelephone, memberName) {
    const attendanceTracking = JSON.parse(localStorage.getItem('attendanceTracking')) || {};

    if (!attendanceTracking[memberTelephone]) {
        attendanceTracking[memberTelephone] = {
            name: memberName,
            totalMonthlySessions: 0,
            attendedMonthlySessions: 0,
            lastUpdated: new Date().toISOString(),
            registrationDate: new Date().toISOString()
        };
    }

    attendanceTracking[memberTelephone].attendedMonthlySessions++;
    attendanceTracking[memberTelephone].lastUpdated = new Date().toISOString();

    localStorage.setItem('attendanceTracking', JSON.stringify(attendanceTracking));
}

// Update total monthly sessions for all members when new month attendance is saved
function updateTotalMonthlySessions() {
    console.log('updateTotalMonthlySessions called');

    const attendanceTracking = JSON.parse(localStorage.getItem('attendanceTracking')) || {};
    const records1 = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
    const records2 = JSON.parse(localStorage.getItem('umugandaData')) || [];
    const allRecords = [...records1, ...records2];

    console.log('All records for monthly calculation:', allRecords.length);

    // Get unique months from all attendance records
    const uniqueMonths = [...new Set(allRecords.map(r => r.date.substring(0, 7)))].sort();
    const totalMonthlySessions = uniqueMonths.length;

    console.log('Unique months found:', uniqueMonths);
    console.log('Total monthly sessions:', totalMonthlySessions);

    // Update total monthly sessions for all members
    Object.keys(attendanceTracking).forEach(memberTelephone => {
        if (attendanceTracking[memberTelephone]) {
            attendanceTracking[memberTelephone].totalMonthlySessions = totalMonthlySessions;
            console.log(`Updated ${memberTelephone}: ${attendanceTracking[memberTelephone].totalMonthlySessions} sessions`);
        }
    });

    localStorage.setItem('attendanceTracking', JSON.stringify(attendanceTracking));
    console.log('Attendance tracking updated with new monthly session counts');
}

// Initialize attendance tracking for all existing members (monthly Umuganda)
function initializeAllMembersAttendanceTracking() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const attendanceTracking = JSON.parse(localStorage.getItem('attendanceTracking')) || {};

    records.forEach(record => {
        if (!attendanceTracking[record.telephone]) {
            attendanceTracking[record.telephone] = {
                name: record.name,
                totalMonthlySessions: 0,
                attendedMonthlySessions: 0,
                lastUpdated: new Date().toISOString(),
                registrationDate: record.date || new Date().toISOString()
            };
        }
    });

    localStorage.setItem('attendanceTracking', JSON.stringify(attendanceTracking));
}

// Initialize default locations
function initializeDefaultLocations() {
    const cached = window._cachedLocations;
    if (cached && Array.isArray(cached.sectors) && cached.sectors.length > 0) {
        return cached;
    }
    const defaults = {
        sectors: ['Ruhuha', 'Nyarugenge', 'Mayange'],
        cells: ['Murambi', 'Kamabare'],
        villages: ['Cyeru', 'Kanombe']
    };
    window._cachedLocations = defaults;
    return defaults;
}

// Add new sector
function addNewSector() {
    showInputPrompt('Enter new sector name', 'Sector name', async (sectorName) => {
        if (!sectorName) { showNotification('Sector addition cancelled', 'info'); return; }
        const locations = { ...window._cachedLocations, sectors: [...(window._cachedLocations.sectors || [])] };
        if (locations.sectors.includes(sectorName.trim())) { showNotification('Sector already exists', 'error'); return; }
        locations.sectors.push(sectorName.trim());
        await saveLocationsToDB(locations);
        loadSectorsForLeader();
        loadIntekoSectors();
        showNotification(`Sector "${sectorName}" added successfully`, 'success');
    });
}

// Add new cell
function addNewCell() {
    showInputPrompt('Enter new cell name', 'Cell name', async (cellName) => {
        if (!cellName) { showNotification('Cell addition cancelled', 'info'); return; }
        const locations = { ...window._cachedLocations, cells: [...(window._cachedLocations.cells || [])] };
        if (locations.cells.includes(cellName.trim())) { showNotification('Cell already exists', 'error'); return; }
        locations.cells.push(cellName.trim());
        await saveLocationsToDB(locations);
        const selectedSector = document.getElementById('leaderSector').value;
        if (selectedSector) updateLeaderCells();
        showNotification(`Cell "${cellName}" added successfully`, 'success');
    });
}

// Add new village
function addNewVillage() {
    showInputPrompt('Enter new village name', 'Village name', async (villageName) => {
        if (!villageName) { showNotification('Village addition cancelled', 'info'); return; }
        const locations = { ...window._cachedLocations, villages: [...(window._cachedLocations.villages || [])] };
        if (locations.villages.includes(villageName.trim())) { showNotification('Village already exists', 'error'); return; }
        locations.villages.push(villageName.trim());
        await saveLocationsToDB(locations);
        const selectedSector = document.getElementById('leaderSector').value;
        const selectedCell = document.getElementById('leaderCell').value;
        if (selectedSector && selectedCell) updateLeaderVillages();
        showNotification(`Village "${villageName}" added successfully`, 'success');
    });
}

// Debug function to check localStorage
function debugSystemLocations() {
    const locations = JSON.parse(localStorage.getItem('systemLocations'));
    console.log('Current systemLocations in localStorage:', locations);
    return locations;
}

// Add this to the console for testing
// You can type: debugSystemLocations() in browser console to check current data

// (duplicate removed — see updateLeaderCells below)

// Leader Location Selection Functions
let currentLeaderLocation = null;

// Initialize leader location selection
function initializeLeaderLocationSelection() {
    // Try to restore last used location from localStorage
    let lastLocation = null;
    try {
        lastLocation = JSON.parse(localStorage.getItem('leaderLastLocation'));
    } catch (e) {
        lastLocation = null;
    }
    if (lastLocation && lastLocation.sector && lastLocation.cell && lastLocation.village) {
        currentLeaderLocation = lastLocation;
    }

    // Load sectors (this will also restore sector if currentLeaderLocation is set)
    loadSectorsForLeader();

    // If we have a stored location, also restore cell and village and open attendance
    if (currentLeaderLocation) {
        const sectorSelect = document.getElementById('leaderSector');
        const cellSelect = document.getElementById('leaderCell');
        const villageSelect = document.getElementById('leaderVillage');

        if (sectorSelect && currentLeaderLocation.sector) {
            sectorSelect.value = currentLeaderLocation.sector;
        }

        // Populate cells for this sector, then select stored cell
        updateLeaderCells();
        if (cellSelect && currentLeaderLocation.cell) {
            cellSelect.value = currentLeaderLocation.cell;
            cellSelect.disabled = false;
        }

        // Populate villages for this cell, then select stored village
        updateLeaderVillages();
        if (villageSelect && currentLeaderLocation.village) {
            villageSelect.value = currentLeaderLocation.village;
            villageSelect.disabled = false;
        }

        // Update label and show attendance section directly
        const selectedLocationEl = document.getElementById('selectedLocation');
        if (selectedLocationEl) {
            selectedLocationEl.textContent = `${currentLeaderLocation.village}, ${currentLeaderLocation.cell}, ${currentLeaderLocation.sector}`;
        }
        const attendanceSection = document.getElementById('attendanceMarkingSection');
        if (attendanceSection) {
            attendanceSection.style.display = 'block';
        }
        // Load attendance list for this location
        loadLeaderAttendance();
    }
}

// Load sectors for leader selection
function loadSectorsForLeader() {
    let locations = window._cachedLocations;
    if (!locations || !Array.isArray(locations.sectors) || locations.sectors.length === 0) {
        locations = initializeDefaultLocations();
    }
    const memberRecords = window._cachedMembers && window._cachedMembers.length > 0
        ? window._cachedMembers
        : JSON.parse(localStorage.getItem('registerRecords')) || [];
    const memberSectors = [...new Set(memberRecords.map(r => r.sector).filter(s => s))];
    let allSectors = [...new Set([...(locations.sectors || []), ...memberSectors])];
    if (!allSectors.length) allSectors = initializeDefaultLocations().sectors;

    const sectorSelect = document.getElementById('leaderSector');
    if (!sectorSelect) return;
    sectorSelect.innerHTML = '<option value="">Select your sector</option>' +
        allSectors.map(sector => `<option value="${sector}">${sector}</option>`).join('');
    if (currentLeaderLocation && currentLeaderLocation.sector) {
        sectorSelect.value = currentLeaderLocation.sector;
    }
}

// Update cells based on selected sector
function updateLeaderCells() {
    const selectedSector = document.getElementById('leaderSector').value;
    const cellSelect = document.getElementById('leaderCell');
    const villageSelect = document.getElementById('leaderVillage');

    cellSelect.innerHTML = '<option value="">Select your cell</option>';
    cellSelect.disabled = !selectedSector;
    villageSelect.innerHTML = '<option value="">Select your village</option>';
    villageSelect.disabled = true;

    if (!selectedSector) return;

    const locations = window._cachedLocations || initializeDefaultLocations();
    const memberRecords = window._cachedMembers && window._cachedMembers.length > 0
        ? window._cachedMembers
        : JSON.parse(localStorage.getItem('registerRecords')) || [];

    const memberCells = [...new Set(memberRecords
        .filter(r => r.sector === selectedSector).map(r => r.cell).filter(c => c))];
    const systemCells = Array.isArray(locations.cells) ? locations.cells : [];
    const allCells = [...new Set([...systemCells, ...memberCells])];

    cellSelect.innerHTML = '<option value="">Select your cell</option>' +
        allCells.map(cell => `<option value="${cell}">${cell}</option>`).join('');
}

// Update villages based on selected cell
function updateLeaderVillages() {
    const selectedSector = document.getElementById('leaderSector').value;
    const selectedCell = document.getElementById('leaderCell').value;
    const villageSelect = document.getElementById('leaderVillage');

    villageSelect.innerHTML = '<option value="">Select your village</option>';
    villageSelect.disabled = !selectedCell;

    if (!selectedSector || !selectedCell) return;

    const locations = window._cachedLocations || initializeDefaultLocations();
    const memberRecords = window._cachedMembers && window._cachedMembers.length > 0
        ? window._cachedMembers
        : JSON.parse(localStorage.getItem('registerRecords')) || [];

    const memberVillages = [...new Set(memberRecords
        .filter(r => r.sector === selectedSector && r.cell === selectedCell)
        .map(r => r.village).filter(v => v))];
    const systemVillages = Array.isArray(locations.villages) ? locations.villages : [];
    const allVillages = [...new Set([...systemVillages, ...memberVillages])];

    villageSelect.innerHTML = '<option value="">Select your village</option>' +
        allVillages.map(village => `<option value="${village}">${village}</option>`).join('');
}

// Update attendance date based on selected month
function updateAttendanceDate() {
    const monthSelect = document.getElementById('attendanceMonth');
    const dateInput = document.getElementById('attendanceDate');

    if (monthSelect && dateInput) {
        const selectedMonth = parseInt(monthSelect.value);
        const currentYear = new Date().getFullYear();

        if (selectedMonth !== '' && !isNaN(selectedMonth)) {
            // Only set date if the current date field is empty or not set for this month
            const currentDateValue = dateInput.value;
            const currentMonthSet = currentDateValue ? new Date(currentDateValue).getMonth() : null;

            // Only auto-set if no date is currently set OR if the current date is for a different month
            if (!currentDateValue || currentMonthSet !== selectedMonth) {
                // Set date to the first day of selected month
                const selectedDate = new Date(currentYear, selectedMonth, 1);
                const formattedDate = selectedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                dateInput.value = formattedDate;

                console.log('DEBUG: Attendance month selected:', selectedMonth, 'Date set to:', formattedDate);
            } else {
                console.log('DEBUG: Date already set for this month, keeping existing date:', currentDateValue);
            }
        } else {
            // Clear date if no month selected
            if (currentDateValue) {
                dateInput.value = '';
                console.log('DEBUG: Month cleared, date reset');
            }
        }
    }
}

// Confirm leader location (enhanced to set current month)
function confirmLeaderLocation() {
    const sector = document.getElementById('leaderSector').value;
    const cell = document.getElementById('leaderCell').value;
    const village = document.getElementById('leaderVillage').value;

    if (!sector || !cell || !village) {
        showNotification('Please select all location fields (Sector, Cell, and Village)', 'error');
        return;
    }

    // Set current month automatically when location is confirmed (only if no month is currently selected)
    const monthSelect = document.getElementById('attendanceMonth');
    if (monthSelect) {
        const currentMonthValue = monthSelect.value;

        // Only auto-set if no month is currently selected
        if (!currentMonthValue || currentMonthValue === '') {
            const currentMonth = new Date().getMonth();
            monthSelect.value = currentMonth.toString();

            // Trigger updateAttendanceDate to set the date
            updateAttendanceDate();

            console.log('DEBUG: Auto-set current month to:', currentMonth);
        } else {
            console.log('DEBUG: Month already selected, keeping existing selection:', currentMonthValue);
        }
    }

    // Update selected location display
    const locationDisplay = document.getElementById('selectedLocation');
    if (locationDisplay) {
        locationDisplay.textContent = `${sector}, ${cell}, ${village}`;
    }

    // Store current leader location in memory
    currentLeaderLocation = {
        sector: sector,
        cell: cell,
        village: village
    };
    // Also persist to localStorage so it is remembered next time
    try {
        localStorage.setItem('leaderLastLocation', JSON.stringify(currentLeaderLocation));
    } catch (e) {
        console.warn('Failed to persist leader location', e);
    }

    // Update UI
    document.getElementById('selectedLocation').textContent = `${village}, ${cell}, ${sector}`;

    // Show attendance marking section
    document.getElementById('attendanceMarkingSection').style.display = 'block';

    // Load attendance for selected location
    loadLeaderAttendance();

    showNotification(`Location confirmed: ${village}, ${cell}, ${sector}`, 'success');
}

// Load attendance for leader's specific location
function loadLeaderAttendance() {
    if (!currentLeaderLocation) {
        document.getElementById('attendanceTableBody').innerHTML =
            '<tr><td colspan="6" style="text-align: center; color: #666;">Please select your location first</td></tr>';
        return;
    }

    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const tbody = document.getElementById('attendanceTableBody');

    // Filter members by leader's location
    const locationMembers = records.filter(member =>
        member.sector === currentLeaderLocation.sector &&
        member.cell === currentLeaderLocation.cell &&
        member.village === currentLeaderLocation.village
    );

    if (locationMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No members found in your location</td></tr>';
        return;
    }

    // Set today's date as default and make it readonly
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    dateInput.value = today;
    dateInput.readOnly = true;
    dateInput.style.backgroundColor = '#f8f9fa';
    dateInput.style.cursor = 'not-allowed';

    tbody.innerHTML = locationMembers.map((record, index) => {
        const originalIndex = records.findIndex(r => r.telephone === record.telephone);
        return `
            <tr data-member-id="${record.telephone}" data-index="${originalIndex}">
                <td>${record.name}</td>
                <td>${record.sector}</td>
                <td>${record.cell}</td>
                <td>${record.village}</td>
                <td>${record.telephone}</td>
                <td>
                    <div class="attendance-status">
                        <button class="status-btn present" onclick="markMemberAttendance('${record.telephone}', 'present', ${originalIndex})">
                            <i class="fa-solid fa-check"></i> Present
                        </button>
                        <button class="status-btn absent" onclick="markMemberAttendance('${record.telephone}', 'absent', ${originalIndex})">
                            <i class="fa-solid fa-times"></i> Absent
                        </button>
                    </div>
                </td>
                <td>
                    <span id="perf-${record.telephone}">${renderPerformanceText(record.telephone)}</span>
                </td>
            </tr>
        `;
    }).join('');

    updateAttendanceSummary();
}

// Change location (reset selection)
function changeLocation() {
    currentLeaderLocation = null;

    // Reset form
    document.getElementById('leaderSector').value = '';
    document.getElementById('leaderCell').value = '';
    document.getElementById('leaderCell').disabled = true;
    document.getElementById('leaderVillage').value = '';
    document.getElementById('leaderVillage').disabled = true;

    // Hide attendance marking section
    document.getElementById('attendanceMarkingSection').style.display = 'none';

    // Clear temporary attendance
    sessionStorage.removeItem('tempAttendance');

    showNotification('Location selection reset. Please select your new location.', 'info');
}

// Load attendance list for manual marking (updated for leader system)
function loadAttendanceList() {
    const records = window._cachedMembers && window._cachedMembers.length > 0
        ? window._cachedMembers
        : JSON.parse(localStorage.getItem('registerRecords')) || [];
    const tbody = document.getElementById('attendanceTableBody');

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No registered members found</td></tr>';
        return;
    }

    // Filter records by current leader's location
    let villageRecords = records;
    if (currentLeaderLocation && (currentLeaderLocation.sector || currentLeaderLocation.cell || currentLeaderLocation.village)) {
        villageRecords = records.filter(record => {
            const matchesSector = !currentLeaderLocation.sector || record.sector === currentLeaderLocation.sector;
            const matchesCell = !currentLeaderLocation.cell || record.cell === currentLeaderLocation.cell;
            const matchesVillage = !currentLeaderLocation.village || record.village === currentLeaderLocation.village;
            return matchesSector && matchesCell && matchesVillage;
        });
    }

    if (villageRecords.length === 0) {
        const locationText = currentLeaderLocation && currentLeaderLocation.village ?
            `${currentLeaderLocation.village}, ${currentLeaderLocation.cell}, ${currentLeaderLocation.sector}` :
            'your village';
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #666;">No registered members found for ${locationText}</td></tr>`;
        return;
    }

    // Set today's date as default and make it readonly
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    dateInput.value = today;
    dateInput.readOnly = true;
    dateInput.style.backgroundColor = '#f8f9fa';
    dateInput.style.cursor = 'not-allowed';

    tbody.innerHTML = villageRecords.map((record, index) => {
        return `
            <tr data-member-id="${record.telephone}" data-index="${index}">
                <td>${record.name}</td>
                <td>${record.sector}</td>
                <td>${record.cell}</td>
                <td>${record.village}</td>
                <td>${record.telephone}</td>
                <td>
                    <div class="attendance-status">
                        <button class="status-btn present" onclick="markMemberAttendance('${record.telephone}', 'present', ${index})">
                            <i class="fa-solid fa-check"></i> Present
                        </button>
                        <button class="status-btn absent" onclick="markMemberAttendance('${record.telephone}', 'absent', ${index})">
                            <i class="fa-solid fa-times"></i> Absent
                        </button>
                    </div>
                </td>
                <td>
                    <span id="perf-${record.telephone}">${renderPerformanceText(record.telephone)}</span>
                </td>
            </tr>
        `;
    }).join('');

    updateAttendanceSummary();
}

// Mark individual member attendance
function markMemberAttendance(memberId, status, index) {
    console.log('markMemberAttendance called with:', { memberId, status, index });

    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const member = records[index];
    console.log('Member found:', member);

    // Update button states
    const row = document.querySelector(`tr[data-member-id="${memberId}"]`);
    const buttons = row.querySelectorAll('.status-btn');

    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    if (status === 'present') {
        buttons[0].classList.add('active');
        showNotification(`${member.name} marked as present`, 'success');
    } else {
        buttons[1].classList.add('active');
        showNotification(`${member.name} marked as absent`, 'info');
    }

    // Store temporary attendance data
    const tempAttendance = JSON.parse(sessionStorage.getItem('tempAttendance')) || {};
    const prevStatus = tempAttendance[memberId]?.status;

    // Apply performance penalty only when switching into "absent"
    if (status === 'absent' && prevStatus !== 'absent') {
        applyAbsentPenalty(memberId);
        updatePerformanceUI(memberId);
    } else {
        // Ensure the UI always has a baseline value
        ensureMemberPerformance(memberId);
        updatePerformanceUI(memberId);
    }

    tempAttendance[memberId] = {
        status: status,
        name: member.name,
        timestamp: new Date().toISOString()
    };
    sessionStorage.setItem('tempAttendance', JSON.stringify(tempAttendance));
    console.log('Updated tempAttendance:', tempAttendance);

    updateAttendanceSummary();
}

// Mark all members as present
function markAllPresent() {
    if (!currentLeaderLocation) {
        showNotification('Please select your location first', 'error');
        return;
    }

    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];

    // Get only members for current leader's village
    const locationMembers = records.filter(member =>
        member.sector === currentLeaderLocation.sector &&
        member.cell === currentLeaderLocation.cell &&
        member.village === currentLeaderLocation.village
    );

    const allPresentAttendance = {};

    locationMembers.forEach((record, index) => {
        const row = document.querySelector(`tr[data-member-id="${record.telephone}"]`);
        if (row) {
            const buttons = row.querySelectorAll('.status-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            buttons[0].classList.add('active'); // Present button
        }

        allPresentAttendance[record.telephone] = {
            status: 'present',
            name: record.name,
            timestamp: new Date().toISOString()
        };

        ensureMemberPerformance(record.telephone);
        updatePerformanceUI(record.telephone);
    });

    sessionStorage.setItem('tempAttendance', JSON.stringify(allPresentAttendance));
    updateAttendanceSummary();

    showNotification(`All ${locationMembers.length} members in ${currentLeaderLocation.village} marked as present`, 'success');
}

// Mark all members as absent
function markAllAbsent() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const allAbsentAttendance = {};

    const tempAttendance = JSON.parse(sessionStorage.getItem('tempAttendance')) || {};

    records.forEach((record, index) => {
        const row = document.querySelector(`tr[data-member-id="${record.telephone}"]`);
        if (row) {
            const buttons = row.querySelectorAll('.status-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            buttons[1].classList.add('active'); // Absent button
        }

        // Apply performance penalty only if this member wasn't already absent
        const prevStatus = tempAttendance[record.telephone]?.status;
        if (prevStatus !== 'absent') {
            applyAbsentPenalty(record.telephone);
        } else {
            ensureMemberPerformance(record.telephone);
        }
        updatePerformanceUI(record.telephone);

        allAbsentAttendance[record.telephone] = {
            status: 'absent',
            name: record.name,
            timestamp: new Date().toISOString()
        };
    });

    sessionStorage.setItem('tempAttendance', JSON.stringify(allAbsentAttendance));
    updateAttendanceSummary();

    showNotification(`All ${records.length} members marked as absent`, 'info');
}

// Update attendance summary
function updateAttendanceSummary() {
    const tempAttendance = JSON.parse(sessionStorage.getItem('tempAttendance')) || {};
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];

    // Get members for current leader's location
    const locationMembers = currentLeaderLocation ? records.filter(member =>
        member.sector === currentLeaderLocation.sector &&
        member.cell === currentLeaderLocation.cell &&
        member.village === currentLeaderLocation.village
    ) : [];

    const presentCount = Object.values(tempAttendance).filter(a => a.status === 'present').length;
    const absentCount = Object.values(tempAttendance).filter(a => a.status === 'absent').length;

    // Count only members in the selected village, not all members
    document.getElementById('totalMembersCount').textContent = locationMembers.length;
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
}

// Save attendance to localStorage
async function saveAttendance() {
    console.log('saveAttendance function called');

    const currentAttendance = JSON.parse(sessionStorage.getItem('tempAttendance')) || {};
    console.log('Current attendance data:', currentAttendance);

    // Get the selected date from the form instead of using today's date
    const attendanceDateInput = document.getElementById('attendanceDate');
    const attendanceMonthSelect = document.getElementById('attendanceMonth');

    if (!attendanceDateInput || !attendanceDateInput.value) {
        showNotification('Please select a date for attendance', 'error');
        return;
    }

    const attendanceDate = attendanceDateInput.value;
    console.log('Attendance date from form:', attendanceDate);

    if (Object.keys(currentAttendance).length === 0) {
        showNotification('Please mark attendance for at least one member', 'error');
        return;
    }

    try {
        // Check if ApiService is available
        if (typeof ApiService === 'undefined') {
            throw new Error('ApiService not available - falling back to localStorage');
        }

        // Use API service to save to MongoDB
        const api = new ApiService();

        // Convert temp attendance to permanent records and save to MongoDB
        for (const [memberId, attendance] of Object.entries(currentAttendance)) {
            const memberRecord = JSON.parse(localStorage.getItem('registerRecords')) || []
                .find(r => r.telephone === memberId);

            console.log(`Processing attendance for ${memberId}:`, attendance);

            if (memberRecord) {
                const attendanceRecord = {
                    name: attendance.name,
                    age: memberRecord.age,
                    sex: memberRecord.sex,
                    sector: memberRecord.sector,
                    cell: memberRecord.cell,
                    village: memberRecord.village,
                    date: new Date(attendanceDate).toISOString(),
                    checkInMethod: 'manual',
                    citizenId: memberId,
                    status: attendance.status,
                    attendanceDate: attendanceDate // Add date field for easy filtering
                };

                console.log('Creating attendance record:', attendanceRecord);

                // Save to MongoDB
                const result = await api.saveAttendance(attendanceRecord);
                console.log('Attendance saved to MongoDB:', result);

                // Also save to localStorage for analytics compatibility
                const existingRecords = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
                existingRecords.push(attendanceRecord);
                localStorage.setItem('umugandaRecords', JSON.stringify(existingRecords));
                console.log('Attendance also saved to localStorage for analytics');

                // Update attendance tracking
                if (attendance.status === 'present') {
                    updateAttendanceTracking(memberId, attendance.name);
                }
            } else {
                console.log(`Member record not found for ${memberId}`);
            }
        }

        showNotification('Attendance saved successfully!', 'success');

        // Clear temporary attendance
        sessionStorage.removeItem('tempAttendance');
        console.log('Cleared tempAttendance from sessionStorage');

        // Refresh attendance table
        loadUmugandaTable();
        await updateAttendanceStatistics();

    } catch (error) {
        console.error('Error saving attendance to MongoDB:', error);
        showNotification('Error saving attendance: ' + error.message, 'error');

        // Fallback to localStorage if API fails
        let umugandaRecords = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
        console.log('Fallback: Using localStorage, existing records:', umugandaRecords.length);

        // Convert temp attendance to permanent records
        Object.entries(currentAttendance).forEach(([memberId, attendance]) => {
            const memberRecord = JSON.parse(localStorage.getItem('registerRecords')) || []
                .find(r => r.telephone === memberId);

            console.log(`Fallback: Processing attendance for ${memberId}:`, attendance);

            if (memberRecord) {
                const attendanceRecord = {
                    name: attendance.name,
                    age: memberRecord.age,
                    sex: memberRecord.sex,
                    sector: memberRecord.sector,
                    cell: memberRecord.cell,
                    village: memberRecord.village,
                    date: new Date(attendanceDate).toISOString(),
                    checkInMethod: 'manual',
                    citizenId: memberId,
                    status: attendance.status,
                    attendanceDate: attendanceDate
                };

                // Check if attendance already exists for this date and member
                const existingIndex = umugandaRecords.findIndex(r =>
                    r.citizenId === memberId &&
                    r.date.split('T')[0] === attendanceDate.split('T')[0]
                );

                if (existingIndex !== -1) {
                    umugandaRecords[existingIndex] = attendanceRecord;
                } else {
                    umugandaRecords.push(attendanceRecord);
                }

                // Update attendance tracking
                if (attendance.status === 'present') {
                    updateAttendanceTracking(memberId, attendance.name);
                }
            }
        });

        // Save to localStorage
        localStorage.setItem('umugandaRecords', JSON.stringify(umugandaRecords));
        sessionStorage.removeItem('tempAttendance');
        showNotification('Attendance saved to local storage (backup)', 'warning');
        loadUmugandaTable();
        await updateAttendanceStatistics();
    }

    // Refresh tables and statistics
    console.log('About to refresh tables...');

    // Remember which day was just saved so the table shows Present/Absent for that day
    sessionStorage.setItem('lastUmugandaAttendanceDate', attendanceDate);

    // Render saved records table (all registered members + performance)
    loadUmugandaTable();
    loadRegisterTable();
    await updateAttendanceStatistics();
    updateVillageSectorStatistics();

    // Explicitly redraw the monthly overall attendance chart
    drawMonthlyOverallAttendanceChart();

    // Update total monthly sessions for all members
    updateTotalMonthlySessions();

    console.log('Refreshed tables and statistics including monthly chart');

    const attendanceCount = Object.keys(currentAttendance).length;
    showNotification(`Attendance saved for ${attendanceCount} members on ${attendanceDate}!`, 'success');
    console.log('Save attendance completed successfully');
}

// Filter attendance list
function filterAttendanceList() {
    const searchTerm = document.getElementById('searchMemberAttendance').value.toLowerCase();
    const sectorFilter = document.getElementById('filterSector').value.toLowerCase();
    const villageFilter = document.getElementById('filterVillage').value.toLowerCase();

    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const filteredRecords = records.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(searchTerm) ||
            record.telephone.includes(searchTerm);
        const matchesSector = !sectorFilter || record.sector.toLowerCase().includes(sectorFilter);
        const matchesVillage = !villageFilter || record.village.toLowerCase().includes(villageFilter);

        return matchesSearch && matchesSector && matchesVillage;
    });

    const tbody = document.getElementById('attendanceTableBody');
    if (filteredRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No members found</td></tr>';
        return;
    }

    tbody.innerHTML = filteredRecords.map((record, index) => {
        const originalIndex = records.findIndex(r => r.telephone === record.telephone);
        return `
            <tr data-member-id="${record.telephone}" data-index="${originalIndex}">
                <td>${record.name}</td>
                <td>${record.sector}</td>
                <td>${record.cell}</td>
                <td>${record.village}</td>
                <td>${record.telephone}</td>
                <td>
                    <div class="attendance-status">
                        <button class="status-btn present" onclick="markMemberAttendance('${record.telephone}', 'present', ${originalIndex})">
                            <i class="fa-solid fa-check"></i> Present
                        </button>
                        <button class="status-btn absent" onclick="markMemberAttendance('${record.telephone}', 'absent', ${originalIndex})">
                            <i class="fa-solid fa-times"></i> Absent
                        </button>
                    </div>
                </td>
                <td>
                    <span id="perf-${record.telephone}">${renderPerformanceText(record.telephone)}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// Update village and sector statistics
async function updateVillageSectorStatistics() {
    const villageStats = calculateVillageStatistics();
    const sectorStats = await calculateSectorStatistics();

    // Update village statistics
    updateVillageDisplay(villageStats);
    drawVillageChart(villageStats);

    // Update sector statistics
    updateSectorDisplay(sectorStats);
    drawSectorChart(sectorStats);
}

// Calculate village statistics
function calculateVillageStatistics() {
    const allMembers = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const records = getLeaderScopedMembers(allMembers);
    const attendanceRecords = getAllUmugandaAttendanceRecords();

    // Group members by village
    const villageGroups = {};
    records.forEach(member => {
        if (!villageGroups[member.village]) {
            villageGroups[member.village] = {
                members: [],
                present: 0,
                absent: 0
            };
        }
        villageGroups[member.village].members.push(member);
    });

    // Calculate attendance for each village
    Object.keys(villageGroups).forEach(village => {
        const villageMembers = villageGroups[village].members;

        attendanceRecords.forEach(attendance => {
            const member = villageMembers.find(m => m.telephone === attendance.citizenId);
            if (member) {
                if (attendance.status === 'present') {
                    villageGroups[village].present++;
                } else {
                    villageGroups[village].absent++;
                }
            }
        });
    });

    // Convert to array and calculate percentages
    const villageStats = Object.entries(villageGroups).map(([village, data]) => {
        const total = data.present + data.absent;
        const percentage = total > 0 ? Math.round((data.present / total) * 100) : 0;

        return {
            name: village,
            totalMembers: data.members.length,
            present: data.present,
            absent: data.absent,
            percentage: percentage
        };
    });

    // Sort by percentage (highest first)
    return villageStats.sort((a, b) => b.percentage - a.percentage);
}

// Calculate sector statistics with village breakdown
async function calculateSectorStatistics() {
    try {
        // Fetch data from MongoDB API
        const api = new ApiService();
        const [allMembers, attendanceRecords] = await Promise.all([
            api.getMembers(),
            api.getAttendance()
        ]);

        const records = getLeaderScopedMembers(allMembers);

        // Group members by sector and village
        const sectorGroups = {};
        records.forEach(member => {
            if (!sectorGroups[member.sector]) {
                sectorGroups[member.sector] = {
                    members: [],
                    villages: {},
                    present: 0,
                    absent: 0
                };
            }
            sectorGroups[member.sector].members.push(member);

            // Group by village within sector
            if (!sectorGroups[member.sector].villages[member.village]) {
                sectorGroups[member.sector].villages[member.village] = {
                    members: [],
                    present: 0,
                    absent: 0
                };
            }
            sectorGroups[member.sector].villages[member.village].members.push(member);
        });

        // Calculate attendance for each sector and village
        Object.keys(sectorGroups).forEach(sector => {
            const sectorData = sectorGroups[sector];

            attendanceRecords.forEach(attendance => {
                const member = sectorData.members.find(m => m.telephone === attendance.citizenId);
                if (member) {
                    if (attendance.status === 'present') {
                        sectorData.present++;
                        // Also count for village
                        if (sectorData.villages[member.village]) {
                            sectorData.villages[member.village].present++;
                        }
                    } else {
                        sectorData.absent++;
                        // Also count for village
                        if (sectorData.villages[member.village]) {
                            sectorData.villages[member.village].absent++;
                        }
                    }
                }
            });
        });

        // Convert to array and calculate percentages
        const sectorStats = Object.entries(sectorGroups).map(([sector, data]) => {
            const total = data.present + data.absent;
            const percentage = total > 0 ? Math.round((data.present / total) * 100) : 0;

            // Calculate village statistics
            const villageStats = Object.entries(data.villages).map(([village, villageData]) => {
                const villageTotal = villageData.present + villageData.absent;
                const villagePercentage = villageTotal > 0 ? Math.round((villageData.present / villageTotal) * 100) : 0;

                return {
                    name: village,
                    totalMembers: villageData.members.length,
                    present: villageData.present,
                    absent: villageData.absent,
                    percentage: villagePercentage
                };
            }).sort((a, b) => b.percentage - a.percentage);

            return {
                name: sector,
                totalMembers: data.members.length,
                present: data.present,
                absent: data.absent,
                percentage: percentage,
                villages: villageStats
            };
        });

        // Sort by percentage (highest first)
        const sortedSectorStats = sectorStats.sort((a, b) => b.percentage - a.percentage);

        // Extract villages from all sectors
        const allVillages = sortedSectorStats.flatMap(sector => sector.villages || []);

        return {
            sectors: sortedSectorStats,
            villages: allVillages
        };
    } catch (error) {
        console.error('Error calculating sector statistics:', error);
        // Fallback to localStorage if API fails
        const allMembers = JSON.parse(localStorage.getItem('registerRecords')) || [];
        const records = getLeaderScopedMembers(allMembers);
        const attendanceRecords = getAllUmugandaAttendanceRecords();

        // Group members by sector and village
        const sectorGroups = {};
        records.forEach(member => {
            if (!sectorGroups[member.sector]) {
                sectorGroups[member.sector] = {
                    members: [],
                    villages: {},
                    present: 0,
                    absent: 0
                };
            }
            sectorGroups[member.sector].members.push(member);

            // Group by village within sector
            if (!sectorGroups[member.sector].villages[member.village]) {
                sectorGroups[member.sector].villages[member.village] = {
                    members: [],
                    present: 0,
                    absent: 0
                };
            }
            sectorGroups[member.sector].villages[member.village].members.push(member);
        });

        // Calculate attendance for each sector and village
        attendanceRecords.forEach(record => {
            const member = records.find(m => m.telephone === record.citizenId);
            if (member) {
                const sector = member.sector;
                const village = member.village;

                if (sectorGroups[sector]) {
                    if (record.status === 'present') {
                        sectorGroups[sector].present++;
                        if (sectorGroups[sector].villages[village]) {
                            sectorGroups[sector].villages[village].present++;
                        }
                    } else {
                        sectorGroups[sector].absent++;
                        if (sectorGroups[sector].villages[village]) {
                            sectorGroups[sector].villages[village].absent++;
                        }
                    }
                }
            }
        });

        // Convert to arrays and calculate percentages
        const sectorStats = Object.keys(sectorGroups).map(sector => {
            const data = sectorGroups[sector];
            const total = data.present + data.absent;
            const percentage = total > 0 ? Math.round((data.present / total) * 100) : 0;

            const villageStats = Object.keys(data.villages).map(village => {
                const villageData = data.villages[village];
                const villageTotal = villageData.present + villageData.absent;
                const villagePercentage = villageTotal > 0 ? Math.round((villageData.present / villageTotal) * 100) : 0;

                return {
                    name: village,
                    present: villageData.present,
                    absent: villageData.absent,
                    percentage: villagePercentage
                };
            });

            return {
                name: sector,
                present: data.present,
                absent: data.absent,
                percentage: percentage,
                villages: villageStats.sort((a, b) => b.percentage - a.percentage)
            };
        });

        // Sort sectors by percentage (highest first)
        const sortedSectorStats = sectorStats.sort((a, b) => b.percentage - a.percentage);

        // Extract villages from all sectors
        const allVillages = sortedSectorStats.flatMap(sector => sector.villages || []);

        return {
            sectors: sortedSectorStats,
            villages: allVillages
        };
    }
}

// Update village display
function updateVillageDisplay(villageStats) {
    const detailsContainer = document.getElementById('villageDetails');

    // Check if container exists
    if (!detailsContainer) {
        console.log('DEBUG - villageDetails container not found, skipping update');
        return;
    }

    if (villageStats.length === 0) {
        detailsContainer.innerHTML = '<p style="text-align: center; color: #666;">No village data available</p>';
        return;
    }

    detailsContainer.innerHTML = villageStats.map(village => `
        <div class="location-stat-item">
            <span class="location-name">${village.name}</span>
            <div class="location-stats">
                <span class="stat-present">${village.present} P</span>
                <span class="stat-absent">${village.absent} A</span>
                <span class="stat-rate">${village.percentage}%</span>
            </div>
        </div>
    `).join('');
}

// Update sector display
function updateSectorDisplay(sectorStats) {
    const detailsContainer = document.getElementById('sectorDetails');

    // Check if sectorStats is an array and has data
    if (!Array.isArray(sectorStats) || sectorStats.length === 0) {
        detailsContainer.innerHTML = '<p style="text-align: center; color: #666;">No sector data available</p>';
        return;
    }

    detailsContainer.innerHTML = sectorStats.map(sector => `
        <div class="location-stat-item">
            <span class="location-name">${sector.name}</span>
            <div class="location-stats">
                <span class="stat-present">${sector.present} P</span>
                <span class="stat-absent">${sector.absent} A</span>
                <span class="stat-rate">${sector.percentage}%</span>
            </div>
        </div>
    `).join('');
}

// Draw village chart
function drawVillageChart(villageStats) {
    const canvas = document.getElementById('villageChart');
    if (!canvas) {
        console.log('DEBUG: villageChart canvas not found');
        return;
    }

    console.log('DEBUG: Drawing village chart with stats:', villageStats);

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    console.log('DEBUG: Village canvas dimensions:', width, 'x', height);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (villageStats.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No village data available', width / 2, height / 2);
        return;
    }

    // Prepare data with better spacing
    const maxPercentage = Math.max(...villageStats.map(v => v.percentage), 1);
    const barWidth = Math.min(55, width / (villageStats.length * 2.3));
    const chartHeight = height - 120; // More space for labels
    const chartTop = 40;
    const spacing = (width - barWidth * villageStats.length) / (villageStats.length + 1);

    // Draw bars
    villageStats.forEach((village, index) => {
        const barHeight = (village.percentage / maxPercentage) * chartHeight;
        const x = spacing + index * (barWidth + spacing);
        const y = chartTop + chartHeight - barHeight;

        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        const color = village.percentage >= 80 ? '#28a745' :
            village.percentage >= 50 ? '#fd7e14' :
                village.percentage > 0 ? '#ffc107' : '#dc3545';
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColor(color, -20));
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw bar border
        ctx.strokeStyle = adjustColor(color, -30);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Draw percentage on top with background
        const percentageText = `${village.percentage}%`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(percentageText);
        const textWidth = textMetrics.width;
        const textHeight = 18;

        // Background for percentage
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x + (barWidth - textWidth) / 2 - 4, y - textHeight - 8, textWidth + 8, textHeight);

        // Percentage text
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(percentageText, x + barWidth / 2, y - 10);

        // Draw village name and member count in a structured way at bottom
        ctx.save();
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#333';

        // Check if text fits, if not, truncate it
        const maxWidth = barWidth + spacing - 5;
        let displayName = village.name;
        if (ctx.measureText(displayName).width > maxWidth) {
            displayName = displayName.substring(0, 8) + '...';
        }

        // Draw village name background
        const nameY = height - 45;
        const nameHeight = 20;
        ctx.fillStyle = 'rgba(248, 249, 250, 0.9)';
        ctx.fillRect(x - 5, nameY - nameHeight / 2, barWidth + 10, nameHeight);

        // Draw village name
        ctx.fillStyle = '#333';
        ctx.fillText(displayName, x + barWidth / 2, nameY + 4);

        // Draw member count with background
        ctx.font = '9px Arial';
        const memberText = `${village.total} members`;
        const memberY = height - 20;
        const memberHeight = 16;

        ctx.fillStyle = 'rgba(233, 236, 239, 0.9)';
        ctx.fillRect(x - 5, memberY - memberHeight / 2, barWidth + 10, memberHeight);

        ctx.fillStyle = '#666';
        ctx.fillText(memberText, x + barWidth / 2, memberY + 3);
        ctx.restore();
    });

    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Village Attendance Rates', width / 2, 25);

    // Draw axis with better styling
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, chartTop + chartHeight);
    ctx.lineTo(width - 20, chartTop + chartHeight);
    ctx.stroke();

    // Draw bottom border for better separation
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, height - 55);
    ctx.lineTo(width - 10, height - 55);
    ctx.stroke();
}

// Draw sector chart
function drawSectorChart(sectorStats) {
    const canvas = document.getElementById('sectorChart');
    if (!canvas) {
        console.log('DEBUG: sectorChart canvas not found');
        return;
    }

    console.log('DEBUG: Drawing sector chart with stats:', sectorStats);

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    console.log('DEBUG: Sector canvas dimensions:', width, 'x', height);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!Array.isArray(sectorStats) || sectorStats.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No sector data available', width / 2, height / 2);
        return;
    }

    // Prepare data with better spacing
    const maxPercentage = Math.max(...sectorStats.map(s => s.percentage), 1);
    const barWidth = Math.min(70, width / (sectorStats.length * 2.2));
    const chartHeight = height - 120; // More space for labels
    const chartTop = 40;
    const spacing = (width - barWidth * sectorStats.length) / (sectorStats.length + 1);

    // Draw bars
    sectorStats.forEach((sector, index) => {
        const barHeight = (sector.percentage / maxPercentage) * chartHeight;
        const x = spacing + index * (barWidth + spacing);
        const y = chartTop + chartHeight - barHeight;

        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        const color = sector.percentage >= 80 ? '#28a745' :
            sector.percentage >= 50 ? '#fd7e14' :
                sector.percentage > 0 ? '#ffc107' : '#dc3545';
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColor(color, -20));
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw bar border
        ctx.strokeStyle = adjustColor(color, -30);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Draw percentage on top with background
        const percentageText = `${sector.percentage}%`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(percentageText);
        const textWidth = textMetrics.width;
        const textHeight = 18;

        // Background for percentage
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x + (barWidth - textWidth) / 2 - 4, y - textHeight - 8, textWidth + 8, textHeight);

        // Percentage text
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(percentageText, x + barWidth / 2, y - 10);

        // Draw sector name and member count in a structured way at bottom
        ctx.save();
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#333';

        // Check if text fits, if not, truncate it
        const maxWidth = barWidth + spacing - 5;
        let displayName = sector.name;
        if (ctx.measureText(displayName).width > maxWidth) {
            displayName = displayName.substring(0, 10) + '...';
        }

        // Draw sector name background
        const nameY = height - 45;
        const nameHeight = 20;
        ctx.fillStyle = 'rgba(248, 249, 250, 0.9)';
        ctx.fillRect(x - 5, nameY - nameHeight / 2, barWidth + 10, nameHeight);

        // Draw sector name
        ctx.fillStyle = '#333';
        ctx.fillText(displayName, x + barWidth / 2, nameY + 4);

        // Draw member count with background
        ctx.font = '10px Arial';
        const memberText = `${sector.total} members`;
        const memberY = height - 20;
        const memberHeight = 16;

        ctx.fillStyle = 'rgba(233, 236, 239, 0.9)';
        ctx.fillRect(x - 5, memberY - memberHeight / 2, barWidth + 10, memberHeight);

        ctx.fillStyle = '#666';
        ctx.fillText(memberText, x + barWidth / 2, memberY + 3);
        ctx.restore();
    });

    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sector Attendance Rates', width / 2, 25);

    // Draw axis with better styling
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, chartTop + chartHeight);
    ctx.lineTo(width - 20, chartTop + chartHeight);
    ctx.stroke();

    // Draw bottom border for better separation
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, height - 55);
    ctx.lineTo(width - 10, height - 55);
    ctx.stroke();
}

// Update sector and village filters
function updateSectorVillageFilters() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];

    // Get unique sectors and villages
    const sectors = [...new Set(records.map(r => r.sector).filter(s => s))];
    const villages = [...new Set(records.map(r => r.village).filter(v => v))];

    // Update sector filter
    const sectorSelect = document.getElementById('filterSector');
    if (sectorSelect) {
        const currentSectorValue = sectorSelect.value || '';
        sectorSelect.innerHTML = '<option value="">All Sectors</option>' +
            sectors.map(sector => `<option value="${sector}">${sector}</option>`).join('');
        sectorSelect.value = currentSectorValue;
    }

    // Update village filter
    const villageSelect = document.getElementById('filterVillage');
    if (villageSelect) {
        const currentVillageValue = villageSelect.value || '';
        villageSelect.innerHTML = '<option value="">All Villages</option>' +
            villages.map(village => `<option value="${village}">${village}</option>`).join('');
        villageSelect.value = currentVillageValue;
    }
}

// Get all Umuganda attendance records (manual + face recognition),
// normalized and ready for analytics.
function getAllUmugandaAttendanceRecords() {
    const records1 = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
    const records2 = JSON.parse(localStorage.getItem('umugandaData')) || [];
    const all = [...records1, ...records2];

    return all
        .filter(r => r && r.date)
        .map(r => {
            const dateStr = typeof r.date === 'string' ? r.date : String(r.date);
            const day = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.substring(0, 10);

            // Many older records won't have status; treat them as "present"
            const status = (r.status || (r.checkInMethod ? 'present' : 'present')).toLowerCase();

            return {
                ...r,
                day,
                status: status === 'absent' ? 'absent' : 'present',
                citizenKey: r.citizenId || r.telephone || r.memberId || r.name
            };
        });
}

function getLeaderScopedMembers(allMembers) {
    if (!currentLeaderLocation) return allMembers;
    return allMembers.filter(m =>
        (!currentLeaderLocation.sector || m.sector === currentLeaderLocation.sector) &&
        (!currentLeaderLocation.cell || m.cell === currentLeaderLocation.cell) &&
        (!currentLeaderLocation.village || m.village === currentLeaderLocation.village)
    );
}

// Calculate attendance statistics
async function calculateAttendanceStatistics() {
    try {
        // Fetch data from MongoDB API
        const api = new ApiService();
        const [allMembers, allRecords] = await Promise.all([
            api.getMembers(),
            api.getAttendance()
        ]);

        const records = getLeaderScopedMembers(allMembers);

        // Get today's attendance (deduped per member)
        const today = new Date().toISOString().split('T')[0];
        const scopedIds = new Set(records.map(m => m.telephone));
        const todayMap = {};
        allRecords.forEach(r => {
            if (r.day !== today) return;
            if (!r.citizenKey) return;
            if (r.citizenId && !scopedIds.has(r.citizenId)) return;
            // if multiple records exist, keep the last one encountered
            todayMap[r.citizenKey] = r;
        });
        const todayRecords = Object.values(todayMap);
        const presentToday = todayRecords.filter(r => r.status === 'present').length;

        // Calculate attendance percentages for all members
        const attendanceData = records.map(record => {
            const percentage = calculateAttendancePercentage(record.telephone, record.name);
            return {
                name: record.name,
                telephone: record.telephone,
                percentage: percentage,
                category: getAttendanceCategory(percentage)
            };
        });

        // Categorize members
        const categories = {
            excellent: attendanceData.filter(m => m.category === 'excellent').length,
            good: attendanceData.filter(m => m.category === 'good').length,
            poor: attendanceData.filter(m => m.category === 'poor').length,
            none: attendanceData.filter(m => m.category === 'none').length
        };

        // Calculate overall statistics
        const totalMembers = records.length;
        const absentToday = totalMembers - presentToday;
        const overallRate = totalMembers > 0 ? Math.round((attendanceData.reduce((sum, m) => sum + m.percentage, 0) / totalMembers)) : 0;

        return {
            totalMembers,
            presentToday,
            absentToday,
            overallRate,
            categories,
            attendanceData
        };
    } catch (error) {
        console.error('Error calculating attendance statistics:', error);
        // Fallback to localStorage if API fails
        const allMembers = JSON.parse(localStorage.getItem('registerRecords')) || [];
        const records = getLeaderScopedMembers(allMembers);
        const allRecords = getAllUmugandaAttendanceRecords();

        // Get today's attendance (deduped per member)
        const today = new Date().toISOString().split('T')[0];
        const scopedIds = new Set(records.map(m => m.telephone));
        const todayMap = {}; // Added missing todayMap declaration
        allRecords.forEach(r => {
            if (r.day !== today) return;
            if (!r.citizenKey) return;
            if (r.citizenId && !scopedIds.has(r.citizenId)) return;
            todayMap[r.citizenKey] = r;
        });
        const todayRecords = Object.values(todayMap);
        const presentToday = todayRecords.filter(r => r.status === 'present').length;

        // Calculate attendance percentages for all members
        const attendanceData = records.map(record => {
            const percentage = calculateAttendancePercentage(record.telephone, record.name);
            return {
                name: record.name,
                telephone: record.telephone,
                percentage: percentage,
                category: getAttendanceCategory(percentage)
            };
        });

        // Categorize members
        const categories = {
            excellent: attendanceData.filter(m => m.category === 'excellent').length,
            good: attendanceData.filter(m => m.category === 'good').length,
            poor: attendanceData.filter(m => m.category === 'poor').length,
            none: attendanceData.filter(m => m.category === 'none').length
        };

        // Calculate overall statistics
        const totalMembers = records.length;
        const absentToday = totalMembers - presentToday;
        const overallRate = totalMembers > 0 ? Math.round((attendanceData.reduce((sum, m) => sum + m.percentage, 0) / totalMembers)) : 0;

        return {
            totalMembers,
            presentToday,
            absentToday,
            overallRate,
            categories,
            attendanceData
        };
    }
}

// Get attendance category based on percentage
function getAttendanceCategory(percentage) {
    if (percentage === 0) return 'none';
    if (percentage < 50) return 'poor';
    if (percentage < 80) return 'good';
    return 'excellent';
}

// Synchronize analytics data between leader dashboard and home page
async function synchronizeAnalyticsData() {
    // Update home page analytics if elements exist
    if (document.getElementById('overallAttendanceRate')) {
        await updateAttendanceStatistics();
    }
    if (document.getElementById('attendanceChart')) {
        drawAttendanceChart();
    }
    if (document.getElementById('sectorChart')) {
        drawSectorChart();
    }
    if (document.getElementById('villageChart')) {
        drawVillageChart();
    }
}

// Update attendance statistics (enhanced to sync with home page and use leader's location)
async function updateAttendanceStatistics() {
    // Get leader's current location from memory or localStorage
    let leaderLocation = currentLeaderLocation;

    // If not in memory, try to get from localStorage
    if (!leaderLocation) {
        try {
            const savedLocation = localStorage.getItem('leaderLastLocation');
            if (savedLocation) {
                leaderLocation = JSON.parse(savedLocation);
            }
        } catch (e) {
            console.log('DEBUG: Could not retrieve saved leader location');
        }
    }

    console.log('DEBUG: Leader location for analytics:', leaderLocation);

    // Calculate statistics based on leader's location
    const stats = calculateLocationBasedAttendanceStatistics(leaderLocation);

    // Update leader dashboard elements
    const overallRateEl = document.getElementById('overallAttendanceRate');
    const totalMembersEl = document.getElementById('totalMembers');
    const presentTodayEl = document.getElementById('presentToday');
    const absentTodayEl = document.getElementById('absentToday');

    if (overallRateEl) {
        overallRateEl.textContent = `${stats.overallAttendanceRate}%`;
        const progressEl = document.getElementById('attendanceProgress');
        if (progressEl) {
            progressEl.style.width = `${stats.overallAttendanceRate}%`;
        }
    }

    if (totalMembersEl) totalMembersEl.textContent = stats.totalMembers;
    if (presentTodayEl) presentTodayEl.textContent = stats.presentToday;
    if (absentTodayEl) absentTodayEl.textContent = stats.absentToday;

    // Update category statistics
    updateCategoryStats('excellent', stats.categories.excellent, stats.totalMembers);
    updateCategoryStats('good', stats.categories.good, stats.totalMembers);
    updateCategoryStats('poor', stats.categories.poor, stats.totalMembers);
    updateCategoryStats('none', stats.categories.none, stats.totalMembers);

    // Update sector and village statistics (still show all for broader view)
    const { sectors, villages } = await calculateSectorStatistics();
    updateSectorDisplay(sectors);
    updateVillageDisplay(villages);

    // Draw charts with location-based stats for overview chart
    drawAttendanceChart(stats);
    drawSectorChart(sectors);
    drawVillageChart(villages);

    // Draw monthly overall attendance chart
    await drawMonthlyOverallAttendanceChart();

    // Update home page elements if they exist (synchronization)
    const homeOverallRateEl = document.getElementById('homeOverallAttendanceRate');
    const homeTotalMembersEl = document.getElementById('homeTotalMembers');
    const homePresentTodayEl = document.getElementById('homePresentToday');
    const homeAbsentTodayEl = document.getElementById('homeAbsentToday');

    if (homeOverallRateEl) {
        homeOverallRateEl.textContent = `${stats.overallAttendanceRate}%`;
        const homeProgressEl = document.getElementById('homeAttendanceProgress');
        if (homeProgressEl) {
            homeProgressEl.style.width = `${stats.overallAttendanceRate}%`;
        }
    }

    if (homeTotalMembersEl) homeTotalMembersEl.textContent = stats.totalMembers;
    if (homePresentTodayEl) homePresentTodayEl.textContent = stats.presentToday;
    if (homeAbsentTodayEl) homeAbsentTodayEl.textContent = stats.absentToday;

    // Update home page category statistics
    updateHomeCategoryStats('excellent', stats.categories.excellent, stats.totalMembers);
    updateHomeCategoryStats('good', stats.categories.good, stats.totalMembers);
    updateHomeCategoryStats('poor', stats.categories.poor, stats.totalMembers);
    updateHomeCategoryStats('none', stats.categories.none, stats.totalMembers);

    // Update home page sector and village displays
    updateHomeSectorDisplay(sectors);
    updateHomeVillageDisplay(villages);

    // Draw home page charts
    drawHomeSectorChart(sectors);
    drawHomeVillageChart(villages);
}

// Calculate attendance statistics based on leader's location
function calculateLocationBasedAttendanceStatistics(leaderLocation) {
    console.log('DEBUG: Calculating statistics for leader location:', leaderLocation);

    // Get all members
    const allMembers = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const records = getLeaderScopedMembers(allMembers);

    // Filter members based on leader's location
    let filteredMembers = records;

    if (leaderLocation) {
        if (leaderLocation.sector) {
            filteredMembers = filteredMembers.filter(member => member.sector === leaderLocation.sector);
        }
        if (leaderLocation.cell) {
            filteredMembers = filteredMembers.filter(member => member.cell === leaderLocation.cell);
        }
        if (leaderLocation.village) {
            filteredMembers = filteredMembers.filter(member => member.village === leaderLocation.village);
        }
    }

    console.log('DEBUG: Filtered members count for location:', filteredMembers.length);

    // Get attendance records
    const attendanceRecords = getAllUmugandaAttendanceRecords();
    const today = new Date().toISOString().split('T')[0];

    // Calculate attendance for filtered members
    let presentToday = 0;
    let absentToday = 0;
    const attendanceData = [];

    // Get today's attendance records for filtered members
    const todayRecords = attendanceRecords.filter(record => {
        const recordDate = record.date.split('T')[0];
        return recordDate === today;
    });

    console.log('DEBUG: Today\'s attendance records:', todayRecords.length);
    console.log('DEBUG: Filtered members for location:', filteredMembers.map(m => m.name));

    filteredMembers.forEach(member => {
        let attendedSessions = 0;
        let totalSessions = 0;
        let isPresentToday = false;

        // Calculate overall attendance from all records for this member
        const memberRecords = attendanceRecords.filter(record =>
            record.citizenKey === member.telephone
        );

        totalSessions = memberRecords.length;

        // Count attended sessions
        memberRecords.forEach(record => {
            if (record.status === 'present') {
                attendedSessions++;
            }
        });

        // Check today's attendance specifically
        const todayAttendance = todayRecords.find(record =>
            record.citizenKey === member.telephone
        );

        if (todayAttendance) {
            if (todayAttendance.status === 'present') {
                isPresentToday = true;
                presentToday++;
            } else {
                absentToday++;
            }
        }

        const percentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;
        const category = getAttendanceCategory(percentage);

        attendanceData.push({
            name: member.name,
            telephone: member.telephone,
            percentage: percentage,
            category: category,
            attendedSessions: attendedSessions,
            totalSessions: totalSessions
        });

        console.log(`DEBUG: Member ${member.name} - Sessions: ${totalSessions}, Attended: ${attendedSessions}, Today: ${isPresentToday ? 'Present' : 'Not recorded'}`);
    });

    // Calculate categories
    const categories = {
        excellent: attendanceData.filter(m => m.category === 'excellent').length,
        good: attendanceData.filter(m => m.category === 'good').length,
        poor: attendanceData.filter(m => m.category === 'poor').length,
        none: attendanceData.filter(m => m.category === 'none').length
    };

    // Calculate overall statistics
    const totalMembers = filteredMembers.length;
    const overallAttendanceRate = totalMembers > 0 ?
        Math.round((attendanceData.reduce((sum, m) => sum + m.percentage, 0) / totalMembers)) : 0;

    console.log('DEBUG: Location-based stats:', {
        totalMembers,
        presentToday,
        absentToday,
        overallAttendanceRate,
        categories
    });

    return {
        categories: categories,
        totalMembers: totalMembers,
        presentToday: presentToday,
        absentToday: absentToday,
        overallAttendanceRate: overallAttendanceRate
    };
}

// Update home page category statistics
function updateHomeCategoryStats(category, count, total) {
    const countElement = document.getElementById(category + 'Count');
    const barElement = document.getElementById(category + 'Bar');

    if (countElement) countElement.textContent = count;
    if (barElement) {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        barElement.style.width = percentage + '%';
    }
}

// Update home page sector display
function updateHomeSectorDisplay(sectorStats) {
    const detailsContainer = document.getElementById('sectorDetails');
    if (!detailsContainer) return;

    if (!Array.isArray(sectorStats) || sectorStats.length === 0) {
        detailsContainer.innerHTML = '<p style="text-align: center; color: #666;">No sector data available</p>';
        return;
    }

    detailsContainer.innerHTML = sectorStats.map(sector => `
        <div class="sector-stat-item">
            <span class="sector-stat-name">${sector.name}</span>
            <span class="sector-stat-value ${sector.percentage >= 80 ? 'high' : sector.percentage >= 50 ? 'medium' : 'low'}">
                ${sector.percentage}%
            </span>
        </div>
    `).join('');
}

// Update home page village display
function updateHomeVillageDisplay(villageStats) {
    const detailsContainer = document.getElementById('villageBreakdownContainer');
    if (!detailsContainer) return;

    if (villageStats.length === 0) {
        detailsContainer.innerHTML = '<p style="text-align: center; color: #666;">No village data available</p>';
        return;
    }

    detailsContainer.innerHTML = villageStats.map(village => `
        <div class="village-stat-item">
            <span class="village-stat-name">${village.name}</span>
            <span class="village-stat-value ${village.percentage >= 80 ? 'high' : village.percentage >= 50 ? 'medium' : 'low'}">
                ${village.percentage}%
            </span>
        </div>
    `).join('');
}

// Draw home page sector chart
function drawHomeSectorChart(sectorStats) {
    const canvas = document.getElementById('sectorChart');
    if (!canvas) return;

    // Use the same drawing logic as the leader dashboard but with home canvas
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!Array.isArray(sectorStats) || sectorStats.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No sector data available', width / 2, height / 2);
        return;
    }

    // Use the same drawing logic as drawSectorChart function
    const maxPercentage = Math.max(...sectorStats.map(s => s.percentage), 1);
    const barWidth = Math.min(70, width / (sectorStats.length * 2.2));
    const chartHeight = height - 120;
    const chartTop = 40;
    const spacing = (width - barWidth * sectorStats.length) / (sectorStats.length + 1);

    sectorStats.forEach((sector, index) => {
        const barHeight = (sector.percentage / maxPercentage) * chartHeight;
        const x = spacing + index * (barWidth + spacing);
        const y = chartTop + chartHeight - barHeight;

        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        const color = sector.percentage >= 80 ? '#28a745' :
            sector.percentage >= 50 ? '#fd7e14' :
                sector.percentage > 0 ? '#ffc107' : '#dc3545';
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColor(color, -20));
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw bar border
        ctx.strokeStyle = adjustColor(color, -30);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Draw percentage on top with background
        const percentageText = `${sector.percentage}%`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(percentageText);
        const textWidth = textMetrics.width;
        const textHeight = 18;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x + (barWidth - textWidth) / 2 - 4, y - textHeight - 8, textWidth + 8, textHeight);

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(percentageText, x + barWidth / 2, y - 10);

        // Draw sector name and member count
        ctx.save();
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#333';

        const maxWidth = barWidth + spacing - 5;
        let displayName = sector.name;
        if (ctx.measureText(displayName).width > maxWidth) {
            displayName = displayName.substring(0, 10) + '...';
        }

        const nameY = height - 45;
        const nameHeight = 20;
        ctx.fillStyle = 'rgba(248, 249, 250, 0.9)';
        ctx.fillRect(x - 5, nameY - nameHeight / 2, barWidth + 10, nameHeight);

        ctx.fillStyle = '#333';
        ctx.fillText(displayName, x + barWidth / 2, nameY + 4);

        ctx.font = '10px Arial';
        const memberText = `${sector.totalMembers} members`;
        const memberY = height - 20;
        const memberHeight = 16;

        ctx.fillStyle = 'rgba(233, 236, 239, 0.9)';
        ctx.fillRect(x - 5, memberY - memberHeight / 2, barWidth + 10, memberHeight);

        ctx.fillStyle = '#666';
        ctx.fillText(memberText, x + barWidth / 2, memberY + 3);
        ctx.restore();
    });

    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sector Attendance Rates', width / 2, 25);

    // Draw axis
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, chartTop + chartHeight);
    ctx.lineTo(width - 20, chartTop + chartHeight);
    ctx.stroke();

    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, height - 55);
    ctx.lineTo(width - 10, height - 55);
    ctx.stroke();
}

// Draw home page village chart
function drawHomeVillageChart(villageStats) {
    const canvas = document.getElementById('villageChart');
    if (!canvas) return;

    // Use the same drawing logic as the leader dashboard but with home canvas
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (villageStats.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No village data available', width / 2, height / 2);
        return;
    }

    const maxPercentage = Math.max(...villageStats.map(v => v.percentage), 1);
    const barWidth = Math.min(55, width / (villageStats.length * 2.3));
    const chartHeight = height - 120;
    const chartTop = 40;
    const spacing = (width - barWidth * villageStats.length) / (villageStats.length + 1);

    villageStats.forEach((village, index) => {
        const barHeight = (village.percentage / maxPercentage) * chartHeight;
        const x = spacing + index * (barWidth + spacing);
        const y = chartTop + chartHeight - barHeight;

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        const color = village.percentage >= 80 ? '#28a745' :
            village.percentage >= 50 ? '#fd7e14' :
                village.percentage > 0 ? '#ffc107' : '#dc3545';
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColor(color, -20));
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.strokeStyle = adjustColor(color, -30);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        const percentageText = `${village.percentage}%`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(percentageText);
        const textWidth = textMetrics.width;
        const textHeight = 18;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x + (barWidth - textWidth) / 2 - 4, y - textHeight - 8, textWidth + 8, textHeight);

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(percentageText, x + barWidth / 2, y - 10);

        ctx.save();
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#333';

        const maxWidth = barWidth + spacing - 5;
        let displayName = village.name;
        if (ctx.measureText(displayName).width > maxWidth) {
            displayName = displayName.substring(0, 8) + '...';
        }

        const nameY = height - 45;
        const nameHeight = 20;
        ctx.fillStyle = 'rgba(248, 249, 250, 0.9)';
        ctx.fillRect(x - 5, nameY - nameHeight / 2, barWidth + 10, nameHeight);

        ctx.fillStyle = '#333';
        ctx.fillText(displayName, x + barWidth / 2, nameY + 4);

        ctx.font = '9px Arial';
        const memberText = `${village.totalMembers} members`;
        const memberY = height - 20;
        const memberHeight = 16;

        ctx.fillStyle = 'rgba(233, 236, 239, 0.9)';
        ctx.fillRect(x - 5, memberY - memberHeight / 2, barWidth + 10, memberHeight);

        ctx.fillStyle = '#666';
        ctx.fillText(memberText, x + barWidth / 2, memberY + 3);
        ctx.restore();
    });

    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Village Attendance Rates', width / 2, 25);

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, chartTop + chartHeight);
    ctx.lineTo(width - 20, chartTop + chartHeight);
    ctx.stroke();

    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, height - 55);
    ctx.lineTo(width - 10, height - 55);
    ctx.stroke();
}

// Update category statistics
function updateCategoryStats(category, count, total) {
    const countElement = document.getElementById(category + 'Count');
    const barElement = document.getElementById(category + 'Bar');

    countElement.textContent = count;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    barElement.style.width = percentage + '%';
}

// Draw attendance bar chart
function drawAttendanceChart(stats) {
    const canvas = document.getElementById('attendanceChart');
    if (!canvas) {
        console.log('DEBUG: attendanceChart canvas not found');
        return;
    }

    console.log('DEBUG: Drawing attendance chart with stats:', stats);

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    console.log('DEBUG: Canvas dimensions:', width, 'x', height);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart data
    const data = [
        { label: 'Excellent (80-100%)', value: stats.categories.excellent, color: '#28a745' },
        { label: 'Good (50-79%)', value: stats.categories.good, color: '#fd7e14' },
        { label: 'Poor (1-49%)', value: stats.categories.poor, color: '#ffc107' },
        { label: 'None (0%)', value: stats.categories.none, color: '#dc3545' }
    ];

    console.log('DEBUG: Chart data:', data);

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barWidth = Math.min(80, width / (data.length * 2.5));
    const chartHeight = height - 100;
    const chartTop = 50;
    const spacing = (width - barWidth * data.length) / (data.length + 1);

    console.log('DEBUG: Chart layout - maxValue:', maxValue, 'barWidth:', barWidth, 'chartHeight:', chartHeight);

    // Draw bars
    data.forEach((item, index) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = spacing + index * (barWidth + spacing);
        const y = chartTop + chartHeight - barHeight;

        console.log(`DEBUG: Drawing bar ${index} - value: ${item.value}, barHeight: ${barHeight}, x: ${x}, y: ${y}`);

        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, item.color);
        gradient.addColorStop(1, adjustColor(item.color, -20));
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw bar border
        ctx.strokeStyle = adjustColor(item.color, -30);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Draw value on top of bar with background
        const valueText = item.value.toString();
        ctx.font = 'bold 16px Arial';
        const textMetrics = ctx.measureText(valueText);
        const textWidth = textMetrics.width;
        const textHeight = 20;

        // Background for value
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x + (barWidth - textWidth) / 2 - 4, y - textHeight - 8, textWidth + 8, textHeight);

        // Value text
        ctx.fillStyle = item.color;
        ctx.textAlign = 'center';
        ctx.fillText(valueText, x + barWidth / 2, y - 10);

        // Draw percentage
        const percentage = stats.totalMembers > 0 ? Math.round((item.value / stats.totalMembers) * 100) : 0;
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#333';
        ctx.fillText(`${percentage}%`, x + barWidth / 2, y - 28);

        // Draw label below bar
        ctx.save();
        ctx.translate(x + barWidth / 2, height - 15);
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#333';

        // Split label for better readability
        const labelParts = item.label.split(' ');
        ctx.fillText(labelParts[0], 0, 0);
        if (labelParts[1]) {
            ctx.fillText(labelParts[1], 0, 15);
        }
        ctx.restore();
    });

    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Attendance Distribution by Category', width / 2, 25);

    // Draw axis
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, chartTop + chartHeight);
    ctx.lineTo(width - 20, chartTop + chartHeight);
    ctx.stroke();

    console.log('DEBUG: Attendance chart drawn successfully');
}

// Calculate monthly overall attendance statistics
async function calculateMonthlyOverallAttendance() {
    try {
        // Fetch data from MongoDB API
        const api = new ApiService();
        const [allMembers, attendanceRecords] = await Promise.all([
            api.getMembers(),
            api.getAttendance()
        ]);

        const records = getLeaderScopedMembers(allMembers);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        // Calculate overall attendance for each month
        const monthlyOverallStats = months.map((month, index) => {
            // Skip months that haven't occurred yet
            if (index > currentMonth) {
                return {
                    month: month,
                    attendance: 'Not Defined',
                    percentage: null,
                    isDefined: false
                };
            }

            let totalAttendanceSessions = 0;
            let totalPossibleAttendance = 0;

            // Check all attendance records for this month
            attendanceRecords.forEach(record => {
                const recordDate = new Date(record.date);
                if (recordDate.getFullYear() === currentYear && recordDate.getMonth() === index) {
                    totalAttendanceSessions++;
                    // Each member could attend each session
                    totalPossibleAttendance += records.length;

                    // Count actual attendances
                    if (record.attendees) {
                        record.attendees.forEach(attendeePhone => {
                            // Check if this attendee is in our member list
                            if (records.some(member => member.telephone === attendeePhone)) {
                                // This is counted in the actual attendance
                            }
                        });
                    }
                }
            });

            // Calculate attendance percentage for the month
            let attendancePercentage = 0;
            if (totalPossibleAttendance > 0) {
                let totalAttended = 0;
                attendanceRecords.forEach(record => {
                    const recordDate = new Date(record.date);
                    if (recordDate.getFullYear() === currentYear && recordDate.getMonth() === index) {
                        if (record.attendees) {
                            record.attendees.forEach(attendeePhone => {
                                if (records.some(member => member.telephone === attendeePhone)) {
                                    totalAttended++;
                                }
                            });
                        }
                    }
                });
                attendancePercentage = Math.round((totalAttended / totalPossibleAttendance) * 100);
            }

            return {
                month: month,
                attendance: totalAttendanceSessions > 0 ? `${attendancePercentage}%` : 'No Attendance',
                percentage: attendancePercentage,
                isDefined: totalAttendanceSessions > 0
            };
        });

        return monthlyOverallStats;
    } catch (error) {
        console.error('Error calculating monthly overall attendance:', error);
        // Fallback to localStorage if API fails
        const allMembers = JSON.parse(localStorage.getItem('registerRecords')) || [];
        const records = getLeaderScopedMembers(allMembers);
        const attendanceRecords = getAllUmugandaAttendanceRecords();

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        // Calculate overall attendance for each month
        const monthlyOverallStats = months.map((month, index) => {
            // Skip months that haven't occurred yet
            if (index > currentMonth) {
                return {
                    month: month,
                    attendance: 'Not Defined',
                    percentage: null,
                    isDefined: false
                };
            }

            let totalAttendanceSessions = 0;
            let totalPossibleAttendance = 0;

            // Check all attendance records for this month
            attendanceRecords.forEach(record => {
                const recordDate = new Date(record.date);
                if (recordDate.getFullYear() === currentYear && recordDate.getMonth() === index) {
                    totalAttendanceSessions++;
                    // Each member could attend each session
                    totalPossibleAttendance += records.length;
                }
            });

            const percentage = totalPossibleAttendance > 0 ?
                Math.round((totalAttendanceSessions / totalPossibleAttendance) * 100) : 0;

            return {
                month: month,
                attendance: totalAttendanceSessions,
                percentage: percentage,
                isDefined: true
            };
        });

        return monthlyOverallStats;
    }
}

// Draw monthly overall attendance chart
async function drawMonthlyOverallAttendanceChart() {
    console.log('DEBUG: drawMonthlyOverallAttendanceChart called');

    const canvas = document.getElementById('monthlyOverallAttendanceChart');
    if (!canvas) {
        console.log('DEBUG: Creating monthly overall attendance chart canvas');
        // Create canvas if it doesn't exist
        const attendanceSection = document.querySelector('.attendance-categories');
        if (attendanceSection) {
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container';
            chartContainer.innerHTML = `
                <h4>Monthly Overall Attendance</h4>
                <div class="chart-wrapper">
                    <canvas id="monthlyOverallAttendanceChart" width="800" height="400"></canvas>
                </div>
            `;
            attendanceSection.parentNode.insertBefore(chartContainer, attendanceSection.nextSibling);
        }
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get monthly data
    const monthlyData = await calculateMonthlyOverallAttendance();

    console.log('DEBUG: Monthly overall attendance data:', monthlyData);

    // Filter out undefined months for chart calculations
    const definedMonths = monthlyData.filter(month => month.isDefined);

    console.log('DEBUG: Defined months:', definedMonths);

    if (definedMonths.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No attendance data available for current year', width / 2, height / 2);
        return;
    }

    // Chart data
    const data = monthlyData;
    const maxPercentage = Math.max(...definedMonths.map(m => m.percentage), 1);

    console.log('DEBUG: Max percentage:', maxPercentage);

    const barWidth = Math.min(50, width / (data.length * 2));
    const chartHeight = height - 80;
    const chartTop = 40;
    const spacing = (width - barWidth * data.length) / (data.length + 1);

    // Draw bars
    data.forEach((item, index) => {
        const x = spacing + index * (barWidth + spacing);

        if (!item.isDefined) {
            // Draw gray bar for undefined months
            const barHeight = 20;
            const y = chartTop + chartHeight - barHeight;

            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(x, y, barWidth, barHeight);

            // Draw "Not Defined" text
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('N/A', x + barWidth / 2, y - 5);

            // Draw month label
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.fillText(item.month, x + barWidth / 2, height - 10);
        } else {
            const barHeight = (item.percentage / maxPercentage) * chartHeight;
            const y = chartTop + chartHeight - barHeight;

            console.log(`DEBUG: Drawing bar for ${item.month}: ${item.percentage}% at position ${x}, y=${y}, height=${barHeight}`);

            // Draw bar with gradient
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            const color = item.percentage >= 80 ? '#28a745' :
                item.percentage >= 50 ? '#fd7e14' :
                    item.percentage > 0 ? '#ffc107' : '#dc3545';
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, adjustColor(color, -20));
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Draw bar border
            ctx.strokeStyle = adjustColor(color, -30);
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, barWidth, barHeight);

            // Draw percentage on top
            ctx.fillStyle = color;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${item.percentage}%`, x + barWidth / 2, y - 5);

            // Draw month label
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.fillText(item.month, x + barWidth / 2, height - 10);
        }
    });

    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Monthly Overall Attendance - Current Year', width / 2, 25);

    // Draw axis
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, chartTop + chartHeight);
    ctx.lineTo(width - 20, chartTop + chartHeight);
    ctx.stroke();

    console.log('DEBUG: Monthly overall attendance chart drawn successfully');
}

// Test function to force chart rendering
function testCharts() {
    console.log('DEBUG: Testing chart rendering...');

    // Test attendance chart
    if (typeof calculateAttendanceStatistics === 'function') {
        const stats = calculateAttendanceStatistics();
        console.log('DEBUG: Attendance stats calculated:', stats);
        if (typeof drawAttendanceChart === 'function') {
            drawAttendanceChart(stats);
        }
    }

    // Test sector and village charts
    if (typeof calculateSectorStatistics === 'function') {
        const { sectors, villages } = calculateSectorStatistics();
        console.log('DEBUG: Sector stats calculated:', sectors);
        console.log('DEBUG: Village stats calculated:', villages);
        if (typeof drawSectorChart === 'function') {
            drawSectorChart(sectors);
        }
        if (typeof drawVillageChart === 'function') {
            drawVillageChart(villages);
        }
    }
}

// Helper function to adjust color brightness
function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Analytics action functions
function exportAttendanceData() {
    const stats = calculateAttendanceStatistics();
    const data = {
        generatedDate: new Date().toISOString(),
        statistics: stats,
        members: JSON.parse(localStorage.getItem('registerRecords')) || [],
        attendanceRecords: [
            ...JSON.parse(localStorage.getItem('umugandaRecords')) || [],
            ...JSON.parse(localStorage.getItem('umugandaData')) || []
        ]
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    showNotification('Attendance data exported successfully!', 'success');
}

async function refreshAnalytics() {
    await updateAttendanceStatistics();
    showNotification('Analytics data refreshed!', 'success');
}

function viewDetailedReport() {
    const stats = calculateAttendanceStatistics();

    // Create detailed report
    const report = `
ATTENDANCE ANALYTICS DETAILED REPORT
Generated: ${new Date().toLocaleString()}

=== OVERVIEW ===
Total Members: ${stats.totalMembers}
Overall Attendance Rate: ${stats.overallRate}%
Present Today: ${stats.presentToday}
Absent Today: ${stats.absentToday}

=== CATEGORIES ===
Excellent (80-100%): ${stats.categories.excellent} members (${Math.round(stats.categories.excellent / stats.totalMembers * 100)}%)
Good (50-79%): ${stats.categories.good} members (${Math.round(stats.categories.good / stats.totalMembers * 100)}%)
Poor (1-49%): ${stats.categories.poor} members (${Math.round(stats.categories.poor / stats.totalMembers * 100)}%)
No Attendance (0%): ${stats.categories.none} members (${Math.round(stats.categories.none / stats.totalMembers * 100)}%)

=== INDIVIDUAL MEMBER BREAKDOWN ===
${stats.attendanceData.map(member =>
        `${member.name}: ${member.percentage}% (${member.category})`
    ).join('\n')}
    `;

    // Create modal or alert with report
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 10px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        font-family: monospace;
        white-space: pre-line;
    `;

    content.textContent = report;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close Report';
    closeBtn.style.cssText = `
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    `;
    closeBtn.onclick = () => modal.remove();

    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

// Custom input prompt function
function showInputPrompt(title, placeholder, callback) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        animation: slideIn 0.3s ease;
    `;

    modal.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: var(--primary-color);">${title}</h3>
        <input type="text" id="customPromptInput" placeholder="${placeholder}" style="
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            margin-bottom: 15px;
            box-sizing: border-box;
        ">
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="promptCancel" style="
                padding: 8px 16px;
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">Cancel</button>
            <button id="promptOk" style="
                padding: 8px 16px;
                background: var(--primary-color);
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">OK</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus input
    setTimeout(() => {
        document.getElementById('customPromptInput').focus();
    }, 100);

    // Handle events
    const input = document.getElementById('customPromptInput');
    const okBtn = document.getElementById('promptOk');
    const cancelBtn = document.getElementById('promptCancel');

    const closeModal = () => {
        document.body.removeChild(overlay);
    };

    const handleOk = () => {
        const value = input.value.trim();
        closeModal();
        callback(value);
    };

    const handleCancel = () => {
        closeModal();
        callback(null);
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);

    // Enter key to submit
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleOk();
        }
    });

    // Escape key to cancel
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            handleCancel();
        }
    });
}

// Show notification function
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification-toast');
    existingNotifications.forEach(notif => notif.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Add styles
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8'
    };

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 250px;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification styles to page
function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification-toast i {
            font-size: 18px;
        }
        
        .notification-toast span {
            flex: 1;
        }
    `;
    document.head.appendChild(style);
}

// Member Record Management
function editMemberRecord(memberId) {
    const record = (window._cachedMembers || []).find(r => (r._id || r.id) == memberId);

    if (!record) {
        alert('Member record not found');
        return;
    }

    // Fill form with record data
    document.getElementById('regName').value = record.name || '';
    document.getElementById('regSex').value = record.sex || '';
    document.getElementById('regAge').value = record.age || '';
    document.getElementById('regTelephone').value = record.telephone || '';
    if (document.getElementById('regID')) document.getElementById('regID').value = record.idNumber || '';
    document.getElementById('regSector').value = record.sector || '';
    document.getElementById('regCell').value = record.cell || '';
    document.getElementById('regVillage').value = record.village || '';
    document.getElementById('regStatus').value = record.status || '';
    if (document.getElementById('regArrivalTime')) document.getElementById('regArrivalTime').value = record.arrivalTime || '';
    if (document.getElementById('regReturnTime')) document.getElementById('regReturnTime').value = record.returnTime || '';

    // Store editing info
    sessionStorage.setItem('editingMember', JSON.stringify({
        id: record._id || record.id
    }));

    // Change button text
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    submitBtn.textContent = 'Update Member';
    submitBtn.classList.remove('btn-primary');
    submitBtn.classList.add('btn-warning');

    // Scroll to form
    document.getElementById('register').scrollIntoView({ behavior: 'smooth' });
}

async function deleteMemberRecord(memberId) {
    if (!confirm('Are you sure you want to delete this member record?')) {
        return;
    }

    const recordToDelete = (window._cachedMembers || []).find(r => (r._id || r.id) == memberId);

    try {
        const api = new ApiService();
        await api.deleteMember(memberId);
        showNotification('Member record deleted successfully', 'success');
    } catch (err) {
        console.warn('API delete failed, removing from localStorage:', err);
        const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
        const idx = records.findIndex(r => (r._id || r.id) == memberId);
        if (idx !== -1) records.splice(idx, 1);
        localStorage.setItem('registerRecords', JSON.stringify(records));
        showNotification('Member record deleted successfully', 'success');
    }

    // Also remove from face database if exists
    if (faceSystem && recordToDelete && recordToDelete.idNumber) {
        const faceRemoved = faceSystem.deleteCitizen(recordToDelete.idNumber);
        if (faceRemoved) {
            console.log(`Face data removed for ${recordToDelete.name}`);
        }
    }

    loadRegisterTable();
}

function addFaceToMember(index) {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const record = records[index];

    if (!record) {
        alert('Member record not found');
        return;
    }

    if (!faceSystem) {
        alert('Face recognition system not initialized');
        return;
    }

    // Check if already has face registration
    if (checkFaceRegistration(record.idNumber)) {
        alert('This member already has face registration');
        return;
    }

    // Switch to registration tab and start camera
    document.getElementById('register').scrollIntoView({ behavior: 'smooth' });

    // Pre-fill form with member data
    document.getElementById('regName').value = record.name || '';
    document.getElementById('regSex').value = record.sex || '';
    document.getElementById('regAge').value = record.age || '';
    document.getElementById('regTelephone').value = record.telephone || '';
    document.getElementById('regID').value = record.idNumber || '';
    document.getElementById('regSector').value = record.sector || '';
    document.getElementById('regCell').value = record.cell || '';
    document.getElementById('regVillage').value = record.village || '';
    document.getElementById('regStatus').value = record.status || '';

    // Start camera for face capture
    setTimeout(() => {
        startRegCamera();
        alert(`Camera started for ${record.name}. Please capture their photo for face registration.`);
    }, 1000);
}

// Insurance Payment
function handleInsuranceSubmit(e) {
    e.preventDefault();

    const record = {
        id: Date.now(),
        name: document.getElementById('insuranceName').value,
        telephone: document.getElementById('insuranceTelephone').value,
        sector: document.getElementById('insuranceSector').value,
        cell: document.getElementById('insuranceCell').value,
        village: document.getElementById('insuranceVillage').value,
        status: document.getElementById('insuranceStatus').value,
        date: new Date().toISOString()
    };

    const records = JSON.parse(localStorage.getItem('insuranceRecords')) || [];
    records.push(record);
    localStorage.setItem('insuranceRecords', JSON.stringify(records));

    e.target.reset();
    loadInsuranceTable();
    alert('Insurance payment status recorded!');
}

async function loadInsuranceTable() {
    const records = JSON.parse(localStorage.getItem('insuranceRecords')) || [];
    const tbody = document.getElementById('insuranceTableBody');

    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${record.name}</td>
            <td>${record.telephone || 'N/A'}</td>
            <td>${record.sector}</td>
            <td>${record.cell}</td>
            <td>${record.village}</td>
            <td><span class="status-badge ${record.status === 'Paid' ? 'status-completed' : 'status-pending'}">${record.status}</span></td>
            <td>${formatDate(record.date)}</td>
        </tr>
    `).join('');
}

// Report Drugs
async function handleDrugsSubmit(e) {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const caseData = {
        name: document.getElementById('drugsName').value,
        sector: document.getElementById('drugsSector').value,
        cell: document.getElementById('drugsCell').value,
        village: document.getElementById('drugsVillage').value,
        description: (document.getElementById('drugsDescription') && document.getElementById('drugsDescription').value) ? document.getElementById('drugsDescription').value.trim() : ''
    };

    const payload = {
        type: 'drugs',
        data: caseData,
        reportedBy: (currentUser && currentUser.name) ? currentUser.name : 'Village Leader',
        reportedByEmail: (currentUser && currentUser.email) ? currentUser.email : '',
        reportedByPhone: (currentUser && currentUser.phone) ? currentUser.phone : '',
        dateReported: new Date().toISOString()
    };

    try {
        const api = new ApiService();
        await api.createLeaderReport(payload);
    } catch (err) {
        console.warn('Failed to save leader drug report to server, falling back to local storage:', err);
        const fallback = {
            id: Date.now(),
            ...caseData,
            reportedBy: payload.reportedBy,
            reportedByEmail: payload.reportedByEmail,
            reportedByPhone: payload.reportedByPhone,
            date: new Date().toISOString()
        };
        const records = JSON.parse(localStorage.getItem('drugsRecords')) || [];
        records.push(fallback);
        localStorage.setItem('drugsRecords', JSON.stringify(records));
    }

    e.target.reset();
    await loadDrugsTable();
    alert('Drug report sent successfully! Saved in database and visible on dashboards.');
}

function truncateDesc(text, len) {
    if (!text) return '—';
    return text.length <= len ? escapeHtml(text) : escapeHtml(text.slice(0, len)) + '…';
}

async function loadDrugsTable() {
    const tbody = document.getElementById('drugsTableBody');
    if (!tbody) return;

    let records = [];
    try {
        const api = new ApiService();
        const serverRecords = await api.getLeaderReports({ type: 'drugs' });
        records = serverRecords.map(r => ({
            id: r._id,
            name: r.data?.name || '—',
            sector: r.data?.sector || '—',
            cell: r.data?.cell || '—',
            village: r.data?.village || '—',
            description: r.data?.description || '—',
            reportedBy: r.reportedBy,
            date: r.dateReported || r.createdAt
        }));
    } catch (err) {
        console.warn('Failed to load leader drug reports from server, falling back to local storage:', err);
        const localRecords = JSON.parse(localStorage.getItem('drugsRecords')) || [];
        records = localRecords.map(r => ({
            id: r.id,
            name: r.name || '—',
            sector: r.sector || '—',
            cell: r.cell || '—',
            village: r.village || '—',
            description: r.description || '—',
            reportedBy: r.reportedBy,
            date: r.date || r.createdAt
        }));
    }

    const reportedByLabel = (r) => r.reportedBy || '—';
    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${escapeHtml(record.name)}</td>
            <td>${escapeHtml(record.sector || '—')}</td>
            <td>${escapeHtml(record.cell || '—')}</td>
            <td>${escapeHtml(record.village || '—')}</td>
            <td>${truncateDesc(record.description, 40)}</td>
            <td>${escapeHtml(reportedByLabel(record))}</td>
            <td>${formatDate(record.date)}</td>
            <td><button class="btn btn-secondary" onclick="viewDrugsDetails('${record.id}')">View details</button></td>
        </tr>
    `).join('');
}

// Report Sexual Violence
async function handleViolenceSubmit(e) {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const caseData = {
        victimName: document.getElementById('violenceVictimName').value,
        telephone: document.getElementById('violenceTelephone').value,
        sector: document.getElementById('violenceSector').value,
        cell: document.getElementById('violenceCell').value,
        village: document.getElementById('violenceVillage').value,
        description: document.getElementById('violenceDescription').value
    };

    const payload = {
        type: 'violence',
        data: caseData,
        reportedBy: (currentUser && currentUser.name) ? currentUser.name : 'Village Leader',
        reportedByEmail: (currentUser && currentUser.email) ? currentUser.email : '',
        reportedByPhone: (currentUser && currentUser.phone) ? currentUser.phone : '',
        dateReported: new Date().toISOString()
    };

    try {
        const api = new ApiService();
        await api.createLeaderReport(payload);
    } catch (err) {
        console.warn('Failed to save leader violence report to server, falling back to local storage:', err);
        const fallback = {
            id: Date.now(),
            ...caseData,
            reportedBy: payload.reportedBy,
            reportedByEmail: payload.reportedByEmail,
            reportedByPhone: payload.reportedByPhone,
            date: new Date().toISOString()
        };
        const records = JSON.parse(localStorage.getItem('violenceRecords')) || [];
        records.push(fallback);
        localStorage.setItem('violenceRecords', JSON.stringify(records));
    }

    e.target.reset();
    await loadViolenceTable();
    alert('Sexual violence report sent successfully! Saved in database and visible on dashboards.');
}

async function loadViolenceTable() {
    const tbody = document.getElementById('violenceTableBody');
    if (!tbody) return;

    let records = [];
    try {
        const api = new ApiService();
        const serverRecords = await api.getLeaderReports({ type: 'violence' });
        records = serverRecords.map(r => ({
            id: r._id,
            victimName: r.data?.victimName || '—',
            telephone: r.data?.telephone || '—',
            sector: r.data?.sector || '—',
            cell: r.data?.cell || '—',
            village: r.data?.village || '—',
            description: r.data?.description || '—',
            reportedBy: r.reportedBy,
            date: r.dateReported || r.createdAt
        }));
    } catch (err) {
        console.warn('Failed to load leader violence reports from server, falling back to local storage:', err);
        const localRecords = JSON.parse(localStorage.getItem('violenceRecords')) || [];
        records = localRecords.map(r => ({
            id: r.id,
            victimName: r.victimName || '—',
            telephone: r.telephone || '—',
            sector: r.sector || '—',
            cell: r.cell || '—',
            village: r.village || '—',
            description: r.description || '—',
            reportedBy: r.reportedBy,
            date: r.date || r.createdAt
        }));
    }

    const reportedByLabel = (r) => r.reportedBy || '—';
    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${escapeHtml(record.victimName)}</td>
            <td>${escapeHtml(record.telephone || '—')}</td>
            <td>${escapeHtml(record.sector || '—')}</td>
            <td>${escapeHtml(record.cell || '—')}</td>
            <td>${escapeHtml(record.village || '—')}</td>
            <td>${truncateDesc(record.description, 40)}</td>
            <td>${escapeHtml(reportedByLabel(record))}</td>
            <td>${formatDate(record.date)}</td>
            <td><button class="btn btn-secondary" onclick="viewViolenceDetails('${record.id}')">View details</button></td>
        </tr>
    `).join('');
}

// Handle infrastructure report submission (leader)
function handleLeaderInfrastructureSubmit(e) {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};

    const place = document.getElementById('leaderInfrastructurePlace').value.trim();
    const dateVal = document.getElementById('leaderInfrastructureDate').value;
    const desc = (document.getElementById('leaderInfrastructureDescription') && document.getElementById('leaderInfrastructureDescription').value) ? document.getElementById('leaderInfrastructureDescription').value.trim() : '';
    const fileInput = document.getElementById('leaderInfrastructureImage');
    const file = fileInput && fileInput.files && fileInput.files[0];

    async function saveReport(imageData) {
        const caseData = {
            place: place,
            date: dateVal,
            image: imageData || null,
            description: desc
        };

        const payload = {
            type: 'infrastructure',
            data: caseData,
            reportedBy: currentUser.name || 'Village Leader',
            reportedByEmail: currentUser.email || '',
            reportedByPhone: currentUser.phone || '',
            dateReported: new Date().toISOString()
        };

        try {
            const api = new ApiService();
            await api.createLeaderReport(payload);
        } catch (err) {
            console.warn('Failed to save leader infrastructure report to server, falling back to local storage:', err);
            const fallback = {
                id: Date.now(),
                ...caseData,
                reportedBy: payload.reportedBy,
                reportedByEmail: payload.reportedByEmail,
                dateReported: new Date().toISOString()
            };
            const records = JSON.parse(localStorage.getItem('infrastructureReports')) || [];
            records.push(fallback);
            localStorage.setItem('infrastructureReports', JSON.stringify(records));
        }

        e.target.reset();
        await loadLeaderInfrastructureTable();
        alert('Infrastructure report submitted successfully! Saved in database.');
    }

    if (file) {
        const compressImage = (f) => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 800;
                    let { width, height } = img;
                    if (width > MAX || height > MAX) {
                        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
                        else { width = Math.round(width * MAX / height); height = MAX; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(f);
        });
        compressImage(file).then(saveReport);
    } else {
        saveReport(null);
    }
}

async function loadLeaderInfrastructureTable() {
    const tbody = document.getElementById('leaderInfrastructureTableBody');
    if (!tbody) return;

    let records = [];
    try {
        const api = new ApiService();
        const serverRecords = await api.getLeaderReports({ type: 'infrastructure' });
        records = serverRecords.map(r => ({
            id: r._id,
            place: r.data?.place || '—',
            date: r.data?.date || r.dateReported,
            image: r.data?.image,
            description: r.data?.description || '—',
            dateReported: r.dateReported || r.createdAt
        }));
    } catch (err) {
        console.warn('Failed to load leader infrastructure reports from server, falling back to local storage:', err);
        const localRecords = JSON.parse(localStorage.getItem('infrastructureReports')) || [];
        records = localRecords.map(r => ({
            id: r.id,
            place: r.place || '—',
            date: r.date || r.dateReported,
            image: r.image,
            description: r.description || '—',
            dateReported: r.dateReported || r.createdAt
        }));
    }

    tbody.innerHTML = records.length > 0 ? records.map(r => `
        <tr>
            <td>${escapeHtml(r.place)}</td>
            <td>${formatDate(r.date)}</td>
            <td>${r.image ? `<img src="${r.image}" alt="img" style="width:100px;height:60px;object-fit:cover;border-radius:4px;" />` : '—'}</td>
            <td>${truncateDesc(r.description, 80)}</td>
            <td>${formatDate(r.dateReported)}</td>
            <td style="white-space:nowrap;">
                <button class="btn btn-secondary" style="margin-right:4px;" onclick="openEditInfraModal('${r.id}','${escapeHtml(r.place)}','${r.date}','${escapeHtml(r.description)}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteLeaderInfrastructure('${r.id}')">Delete</button>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="6">No reports yet</td></tr>';
}

let _editInfraId = null;

function openEditInfraModal(id, place, date, description) {
    _editInfraId = id;
    document.getElementById('editInfraPlace').value = place;
    document.getElementById('editInfraDate').value = date;
    document.getElementById('editInfraDescription').value = description;
    document.getElementById('editInfraImage').value = '';
    const modal = document.getElementById('editInfrastructureModal');
    modal.style.display = 'flex';
}

function closeEditInfraModal() {
    document.getElementById('editInfrastructureModal').style.display = 'none';
    _editInfraId = null;
}

async function submitEditInfrastructure() {
    if (!_editInfraId) return;
    const place = document.getElementById('editInfraPlace').value.trim();
    const date = document.getElementById('editInfraDate').value;
    const description = document.getElementById('editInfraDescription').value.trim();
    const fileInput = document.getElementById('editInfraImage');
    const file = fileInput && fileInput.files && fileInput.files[0];

    async function doUpdate(imageData) {
        const api = new ApiService();
        try {
            const payload = { data: { place, date, description } };
            if (imageData) payload.data.image = imageData;
            await api.updateLeaderReport(_editInfraId, payload);
            closeEditInfraModal();
            await loadLeaderInfrastructureTable();
        } catch (err) {
            alert('Failed to update report: ' + err.message);
        }
    }

    if (file) {
        const compressImage = (f) => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 800;
                    let { width, height } = img;
                    if (width > MAX || height > MAX) {
                        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
                        else { width = Math.round(width * MAX / height); height = MAX; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(f);
        });
        doUpdate(await compressImage(file));
    } else {
        doUpdate(null);
    }
}

async function deleteLeaderInfrastructure(id) {
    if (!confirm('Delete this infrastructure report? This cannot be undone.')) return;
    const api = new ApiService();
    try {
        await api.deleteLeaderReport(id);
        await loadLeaderInfrastructureTable();
    } catch (err) {
        alert('Failed to delete report: ' + err.message);
    }
}

// Shift Automate Citizen Cases
function handleCaseSubmit(e) {
    e.preventDefault();
    // Case submission is handled on citizen side. Stabbing function.
}

async function loadCaseTable() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const leaderSector = currentUser.sector || currentUser.leaderSector || '';
    const leaderCell = currentUser.cell || currentUser.leaderCell || '';
    const leaderVillage = currentUser.village || currentUser.leaderVillage || '';

    const tbody = document.getElementById('caseTableBody');
    if (!tbody) return;

    let records = [];
    try {
        const res = await fetch('/api/citizen-reports?type=case');
        if (!res.ok) throw new Error('Failed to fetch from MongoDB');
        records = await res.json();
    } catch (err) {
        console.warn('Could not fetch citizen reports from backend, fallback to local storage:', err);
        const localCases = JSON.parse(localStorage.getItem('citizenCases')) || [];
        records = localCases.map(c => ({
            _id: c._id || String(c.id),
            type: 'case',
            reportedBy: 'Citizen',
            reportedByEmail: '',
            reportedByPhone: '',
            dateReported: c.createdAt || new Date().toISOString(),
            data: c
        }));
    }

    // Filter to leader's location
    let visible = records;
    if (leaderVillage || leaderCell || leaderSector) {
        visible = records.filter(r => {
            const d = r.data || {};
            return (
                (leaderVillage && d.village && d.village === leaderVillage) ||
                (leaderCell && d.cell && d.cell === leaderCell) ||
                (leaderSector && d.sector && d.sector === leaderSector)
            );
        });
    }

    // Check for auto-escalations and shift case level
    let hasEscalatedAny = false;
    for (let r of visible) {
        const escalated = await checkAndEscalate(r);
        if (escalated) hasEscalatedAny = true;
    }
    if (hasEscalatedAny) {
        try {
            const res = await fetch('/api/citizen-reports?type=case');
            if (res.ok) {
                const fresh = await res.json();
                if (leaderVillage || leaderCell || leaderSector) {
                    visible = fresh.filter(r => {
                        const d = r.data || {};
                        return (
                            (leaderVillage && d.village && d.village === leaderVillage) ||
                            (leaderCell && d.cell && d.cell === leaderCell) ||
                            (leaderSector && d.sector && d.sector === leaderSector)
                        );
                    });
                } else {
                    visible = fresh;
                }
            }
        } catch (err) {
            console.warn('Failed to refresh after auto-escalation:', err);
        }
    }

    if (visible.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; color: #666; padding: 20px;">No citizen cases reported yet</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = visible.reverse().map(r => {
        const c = r.data || {};
        const caseId = r._id;
        const status = c.status || 'pending';
        const priority = c.priority || 'medium';
        const level = c.level || 'Village';

        const statusClass = status === 'resolved' ? 'status-solved' :
            status === 'under-review' ? 'status-escalated' : 'status-pending';

        const priorityClass = priority === 'emergency' ? 'status-escalated' :
            priority === 'high' ? 'status-escalated' : 
            priority === 'medium' ? 'status-pending' : 'status-solved';

        const locationText = [c.sector, c.cell, c.village].filter(Boolean).join(' / ');
        const accusedText = `${c.accusedName || '—'} (${c.accusedPhone || '—'})`;
        const evidenceImg = c.image ? `<img src="${c.image}" style="width:80px;height:50px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="viewEvidenceModal('${c.image}')" />` : 'No Image';
        const countdownHtml = getCaseCountdownHtml(r);

        return `
            <tr>
                <td>${escapeHtml(c.caseType || c.type || '—')}</td>
                <td>
                    <span style="font-weight:bold;">${escapeHtml(c.caseTitle || c.title || '—')}</span><br/>
                    <small style="color:#666;" title="${escapeHtml(c.caseDescription || c.description || '')}">${truncateDesc(c.caseDescription || c.description, 45)}</small>
                </td>
                <td>
                    ${escapeHtml(r.reportedBy || '—')}<br/>
                    <small style="color:#666;">${escapeHtml(r.reportedByEmail || '')}</small>
                </td>
                <td>${escapeHtml(accusedText)}</td>
                <td>${escapeHtml(locationText)}</td>
                <td><span class="status-badge ${priorityClass}">${capitalize(priority)}</span></td>
                <td><span class="status-badge status-pending" style="background: #e2f0fe; color: #1f4e79; border: 1px solid #b8daff;">${level}</span></td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${capitalize(status)}
                    </span>
                </td>
                <td>${countdownHtml}</td>
                <td>${evidenceImg}</td>
                <td>${formatDate(c.incidentDate || r.dateReported)}</td>
                <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn btn-secondary btn-sm" onclick="readCaseDetails('${caseId}')" style="background: #1f4e79; border-color: #1f4e79;"><i class="fa-solid fa-eye"></i> Read</button>
                        <select onchange="updateCaseStatus('${caseId}', this.value)" style="padding:6px; border-radius:4px; border:1px solid #ccc; background:#fff; font-size:12px; cursor:pointer; font-weight: bold;">
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="under-review" ${status === 'under-review' ? 'selected' : ''}>Under Review</option>
                            <option value="resolved" ${status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (!casesRefreshInterval) {
        startCountdownUpdates();
    }
}

// Injects custom slide down styles for our case detail viewer
if (!document.getElementById('modalAnimationStyles')) {
    const style = document.createElement('style');
    style.id = 'modalAnimationStyles';
    style.innerHTML = `
        @keyframes slideDown {
            from { transform: translateY(-30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }
    `;
    document.head.appendChild(style);
}

window.readCaseDetails = async function (id) {
    try {
        const getRes = await fetch(`/api/citizen-reports`);
        if (!getRes.ok) throw new Error('Could not fetch reports');
        const reports = await getRes.json();
        const report = reports.find(r => r._id === id);
        if (!report) {
            alert('Case record not found in MongoDB');
            return;
        }

        const c = report.data || {};
        const status = c.status || 'pending';
        const level = c.level || 'Village';
        const priority = c.priority || 'medium';
        const reporterName = report.reportedBy || 'Citizen';
        const reporterEmail = report.reportedByEmail || '—';
        const reporterPhone = report.reportedByPhone || '—';

        const evidenceHtml = c.image ? `
            <div style="margin-top: 15px; text-align: center;">
                <strong>Evidence Image:</strong><br/>
                <img src="${c.image}" style="max-width: 100%; max-height: 250px; border-radius: 8px; margin-top: 8px; border: 1px solid #ccc; cursor: pointer;" onclick="viewEvidenceModal('${c.image}')" />
            </div>
        ` : '<p style="color: #666; font-style: italic; margin-top: 15px;">No evidence image uploaded.</p>';

        const modal = document.createElement('div');
        modal.id = 'caseDetailsModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(3px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        modal.innerHTML = `
            <div style="background: white; width: 620px; max-width: 95%; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); overflow: hidden; animation: slideDown 0.25s cubic-bezier(0.1, 0.8, 0.3, 1);">
                <div style="background: #1f4e79; color: white; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;"><i class="fa-solid fa-scale-balanced"></i> Read Case Details</h3>
                    <span style="cursor: pointer; font-size: 24px; font-weight: bold; line-height: 1;" onclick="document.getElementById('caseDetailsModal').remove()">&times;</span>
                </div>
                <div style="padding: 24px; max-height: 65vh; overflow-y: auto; font-size: 14px; color: #333; line-height: 1.6;">
                    <div style="margin-bottom: 12px;"><strong>Case Type:</strong> ${escapeHtml(c.caseType || c.type || '—')}</div>
                    <div style="margin-bottom: 12px;"><strong>Case Title:</strong> <span style="font-weight: bold; color: #1f4e79; font-size: 15px;">${escapeHtml(c.caseTitle || c.title || '—')}</span></div>
                    <div style="margin-bottom: 18px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
                        <strong>Description:</strong>
                        <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1f4e79; margin: 6px 0 0 0; white-space: pre-wrap;">${escapeHtml(c.caseDescription || c.description || '—')}</p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 18px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
                        <div>
                            <strong style="color:#1f4e79;">Reporter (Plaintiff):</strong><br/>
                            Name: ${escapeHtml(reporterName)}<br/>
                            Phone: ${escapeHtml(reporterPhone)}<br/>
                            Email: ${escapeHtml(reporterEmail)}
                        </div>
                        <div>
                            <strong style="color:#1f4e79;">Accused (Defendant):</strong><br/>
                            Name: ${escapeHtml(c.accusedName || '—')}<br/>
                            Phone: ${escapeHtml(c.accusedPhone || '—')}
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 18px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
                        <div>
                            <strong>Incident Date:</strong><br/>
                            ${formatDate(c.incidentDate || report.dateReported)}
                        </div>
                        <div>
                            <strong>Location Details:</strong><br/>
                            ${escapeHtml([c.sector, c.cell, c.village].filter(Boolean).join(' / '))}
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div>
                            <strong>Priority:</strong><br/>
                            <span class="status-badge ${priority === 'high' || priority === 'emergency' ? 'status-escalated' : priority === 'medium' ? 'status-pending' : 'status-solved'}">${capitalize(priority)}</span>
                        </div>
                        <div>
                            <strong>Current Level:</strong><br/>
                            <span class="status-badge status-pending" style="background: #e2f0fe; color: #1f4e79; border: 1px solid #b8daff;">${level}</span>
                        </div>
                        <div>
                            <strong>Status:</strong><br/>
                            <span class="status-badge ${status === 'resolved' ? 'status-solved' : status === 'under-review' ? 'status-escalated' : 'status-pending'}">${capitalize(status)}</span>
                        </div>
                    </div>

                    ${evidenceHtml}
                </div>
                <div style="background: #f8f9fa; padding: 18px 24px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <strong>Update Status:</strong>
                        <select id="modalStatusSelect" style="padding: 6px 12px; border-radius: 4px; border: 1px solid #ccc; font-weight: bold; cursor: pointer;">
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="under-review" ${status === 'under-review' ? 'selected' : ''}>Under Review</option>
                            <option value="resolved" ${status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" onclick="document.getElementById('caseDetailsModal').remove()">Close</button>
                        <button class="btn btn-primary" onclick="saveModalStatus('${id}')">Save Changes</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (err) {
        console.error('Error viewing case details:', err);
        alert('Failed to read case details.');
    }
};

window.saveModalStatus = async function (id) {
    const newStatus = document.getElementById('modalStatusSelect').value;
    document.getElementById('caseDetailsModal').remove();
    await updateCaseStatus(id, newStatus);
};

async function checkAndEscalate(r) {
    const c = r.data || {};
    const caseId = r._id;
    if (c.status === 'resolved') return false; 

    const now = new Date();
    const createdAtTime = new Date(c.createdAt || r.dateReported).getTime();
    const ESCALATION_PERIOD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
    
    if (c.level === 'Village' || !c.level) {
        const timeDiff = now.getTime() - createdAtTime;
        if (timeDiff >= ESCALATION_PERIOD_MS) {
            c.level = 'Cell';
            c.escalatedToCellAt = now.toISOString();
            await updateCaseOnServer(caseId, r);
            return true;
        }
    } else if (c.level === 'Cell') {
        const escalatedToCellTime = new Date(c.escalatedToCellAt || c.createdAt || r.dateReported).getTime();
        const timeDiff = now.getTime() - escalatedToCellTime;
        if (timeDiff >= ESCALATION_PERIOD_MS) {
            c.level = 'Sector';
            c.escalatedToSectorAt = now.toISOString();
            await updateCaseOnServer(caseId, r);
            return true;
        }
    }
    return false;
}

async function updateCaseOnServer(id, report) {
    try {
        await fetch(`/api/citizen-reports/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
    } catch (err) {
        console.error('Failed to auto-escalate case on server:', err);
    }
}

function getCaseCountdownHtml(r) {
    const c = r.data || {};
    if (c.status === 'resolved') {
        return `<span style="color: #28a745; font-weight: bold;"><i class="fa-solid fa-circle-check"></i> Solved</span>`;
    }

    const now = new Date();
    const createdAtTime = new Date(c.createdAt || r.dateReported).getTime();
    const ESCALATION_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

    let deadline = createdAtTime + ESCALATION_PERIOD_MS;
    if (c.level === 'Cell') {
        const escalatedToCellTime = new Date(c.escalatedToCellAt || c.createdAt || r.dateReported).getTime();
        deadline = escalatedToCellTime + ESCALATION_PERIOD_MS;
    } else if (c.level === 'Sector') {
        return `<span style="color: #dc3545; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> Sector (Max)</span>`;
    }

    const timeLeft = deadline - now.getTime();
    if (timeLeft <= 0) {
        return `<span style="color: #dc3545; font-weight: bold; animation: pulse 1s infinite;">Escalating...</span>`;
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

    return `<span style="color: ${color}; font-weight: bold;" title="Time remaining before cell escalation"><i class="fa-regular fa-clock"></i> ${displayStr}</span>`;
}

window.updateCaseStatus = async function (id, newStatus) {
    if (!confirm(`Are you sure you want to update this case status to "${newStatus}"?`)) {
        loadCaseTable();
        return;
    }

    try {
        const getRes = await fetch(`/api/citizen-reports`);
        if (!getRes.ok) throw new Error('Could not fetch existing reports');
        const reports = await getRes.json();
        const report = reports.find(r => r._id === id);
        if (!report) {
            alert('Case record not found in MongoDB');
            return;
        }

        report.data.status = newStatus;

        const putRes = await fetch(`/api/citizen-reports/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(report)
        });

        if (!putRes.ok) {
            const errBody = await putRes.text();
            throw new Error(`Server failed to update: ${errBody}`);
        }

        showNotification(`Case status updated to ${newStatus} successfully!`, 'success');
        loadCaseTable();
    } catch (err) {
        console.error('Error updating case status in MongoDB:', err);
        const localCases = JSON.parse(localStorage.getItem('citizenCases')) || [];
        const cIndex = localCases.findIndex(c => String(c.id) === id || c._id === id);
        if (cIndex !== -1) {
            localCases[cIndex].status = newStatus;
            localStorage.setItem('citizenCases', JSON.stringify(localCases));
            showNotification(`Case status updated to ${newStatus} locally.`, 'success');
            loadCaseTable();
        } else {
            alert(`Failed to update case status: ${err.message}`);
        }
    }
};

window.viewEvidenceModal = function (imgSrc) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    modal.onclick = () => modal.remove();

    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 8px;
        box-shadow: 0 4px 25px rgba(0,0,0,0.6);
        border: 2px solid white;
    `;
    modal.appendChild(img);
    document.body.appendChild(modal);
};

function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

let casesRefreshInterval = null;
function startCountdownUpdates() {
    if (casesRefreshInterval) clearInterval(casesRefreshInterval);
    casesRefreshInterval = setInterval(() => {
        const caseTable = document.getElementById('caseTable');
        if (caseTable && caseTable.getBoundingClientRect().width > 0) {
            loadCaseTable();
        }
    }, 30000);
}
function setupCaseAutoEscalation() {}

// Load notifications
function loadNotifications() {
    const intekoRecords = JSON.parse(localStorage.getItem('intekoRecords')) || [];
    const registerRecords = JSON.parse(localStorage.getItem('registerRecords')) || [];

    // Simple logic: show registered people who haven't attended recent inteko
    const recentInteko = intekoRecords.slice(-5);
    const intekoAttendees = new Set();
    recentInteko.forEach(record => {
        record.attendees.forEach(att => intekoAttendees.add(att.name));
    });

    const missingInteko = registerRecords.filter(reg =>
        reg.status === 'New Member' && !intekoAttendees.has(reg.name)
    );

    const intekoNotifications = document.getElementById('intekoNotifications');
    if (intekoNotifications) {
        intekoNotifications.innerHTML = missingInteko.length > 0 ?
            missingInteko.map(person => `
                <div class="notification-item">
                    <strong>${person.name}</strong> - ${person.village}, ${person.cell}
                </div>
            `).join('') : '<p>All members have attended Inteko meetings.</p>';
    }

    // Umuganda notifications
    const umugandaRecords = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
    const umugandaAttendees = new Set(umugandaRecords.map(r => r.name));

    const missingUmuganda = registerRecords.filter(reg =>
        reg.status === 'New Member' && !umugandaAttendees.has(reg.name)
    );

    const umugandaNotifications = document.getElementById('umugandaNotifications');
    if (umugandaNotifications) {
        umugandaNotifications.innerHTML = missingUmuganda.length > 0 ?
            missingUmuganda.map(person => `
                <div class="notification-item">
                    <strong>${person.name}</strong> - ${person.village}, ${person.cell}
                </div>
            `).join('') : '<p>All members have attended Umuganda.</p>';
    }
}

// Load all tables
async function loadAllTables() {
    try {
        await loadIntekoRecords();
        await loadRegisterTable();
        await loadInsuranceTable();
        await loadDrugsTable();
        await loadViolenceTable();
        // Leader-specific infrastructure table
        await loadLeaderInfrastructureTable();
        await loadCaseTable();
        await loadLeaderHomeUpdatesList();
        await loadVisitorReports();
    } catch (error) {
        console.warn('Some tables failed to load:', error);
    }
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

// View details functions
window.viewIntekoDetails = async function (id) {
    let record = null;
    try {
        const api = new ApiService();
        const res = await fetch(`${api.baseURL}/inteko`);
        if (res.ok) {
            const records = await res.json();
            const r = records.find(item => String(item._id) === String(id));
            if (r) {
                record = {
                    meetingTitle: r.meetingTitle || '—',
                    meetingType: r.meetingType || '—',
                    meetingDate: r.meetingDate || r.createdAt,
                    chairperson: r.leaderName || '—',
                    attendeesCount: r.attendees || 0,
                    decisionsCount: r.decisions ? JSON.parse(r.decisions).length : 0,
                    minutesStatus: r.reportSummary ? 'Final' : 'Pending'
                };
            }
        }
    } catch (err) {
        console.warn('Failed to fetch Inteko details from server:', err);
    }

    if (!record) {
        const records = JSON.parse(localStorage.getItem('intekoRecords')) || [];
        const r = records.find(item => String(item.id) === String(id));
        if (r) {
            record = {
                meetingTitle: r.meetingTitle || '—',
                meetingType: r.meetingType || '—',
                meetingDate: r.meetingDate || r.createdAt,
                chairperson: r.chairperson || '—',
                attendeesCount: r.attendees?.length || 0,
                decisionsCount: r.decisions?.length || 0,
                minutesStatus: r.minutesStatus || '—'
            };
        }
    }

    if (record) {
        const details = `
Meeting Title: ${record.meetingTitle}
Type: ${record.meetingType}
Date: ${formatDate(record.meetingDate)}
Chairperson: ${record.chairperson}
Attendees: ${record.attendeesCount}
Decisions: ${record.decisionsCount}
Status: ${record.minutesStatus}
        `;
        alert(details);
    } else {
        alert('Details not found');
    }
};

window.viewDrugsDetails = async function (id) {
    let record = null;
    try {
        const api = new ApiService();
        const res = await fetch(`${api.baseURL}/leader-reports/${id}`);
        if (res.ok) {
            const r = await res.json();
            record = {
                id: r._id,
                name: r.data?.name || '—',
                sector: r.data?.sector || '—',
                cell: r.data?.cell || '—',
                village: r.data?.village || '—',
                description: r.data?.description || '—',
                reportedBy: r.reportedBy,
                date: r.dateReported || r.createdAt
            };
        }
    } catch (err) {
        console.warn('Failed to fetch details from server:', err);
    }

    if (!record) {
        const records = JSON.parse(localStorage.getItem('drugsRecords')) || [];
        record = records.find(r => String(r.id) === String(id));
    }

    if (record) {
        const details = `Name(s): ${record.name}\nLocation: ${record.village}, ${record.cell}, ${record.sector}\nReported by: ${record.reportedBy || '—'}\nDescription: ${record.description || '—'}\nDate: ${formatDate(record.date)}`;
        alert(details);
    } else {
        alert('Details not found');
    }
};

window.viewViolenceDetails = async function (id) {
    let record = null;
    try {
        const api = new ApiService();
        const res = await fetch(`${api.baseURL}/leader-reports/${id}`);
        if (res.ok) {
            const r = await res.json();
            record = {
                id: r._id,
                victimName: r.data?.victimName || '—',
                telephone: r.data?.telephone || '—',
                sector: r.data?.sector || '—',
                cell: r.data?.cell || '—',
                village: r.data?.village || '—',
                description: r.data?.description || '—',
                reportedBy: r.reportedBy,
                date: r.dateReported || r.createdAt
            };
        }
    } catch (err) {
        console.warn('Failed to fetch details from server:', err);
    }

    if (!record) {
        const records = JSON.parse(localStorage.getItem('violenceRecords')) || [];
        record = records.find(r => String(r.id) === String(id));
    }

    if (record) {
        const details = `
Victim: ${record.victimName}
Telephone: ${record.telephone}
Location: ${record.village}, ${record.cell}, ${record.sector}
Reported by: ${record.reportedBy || '—'}
Description: ${record.description || '—'}
Date Reported: ${formatDate(record.date)}
        `;
        alert(details);
    } else {
        alert('Details not found');
    }
};

// ===== Chat Logic for Leader Dashboard =====

let leaderReplyTarget = null;

// Handle sending chat message from village leader
function handleLeaderChatSubmit(e) {
    e.preventDefault();

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const toRole = document.getElementById('leaderChatRecipientRole').value;
    const messageText = document.getElementById('leaderChatMessage').value.trim();

    if (toRole === 'citizen' && !leaderReplyTarget) {
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
        fromRole: 'leader',  // village leader
        toRole: toRole,      // 'citizen', 'cell', 'sector'
        toEmail: leaderReplyTarget ? leaderReplyTarget.email : null,
        toName: leaderReplyTarget ? leaderReplyTarget.name : null,
        text: messageText,
        timestamp: new Date().toISOString()
    };

    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    messages.push(message);
    localStorage.setItem('chatMessages', JSON.stringify(messages));

    e.target.reset();
    loadLeaderChatMessages();
}

// Load chat messages relevant for this leader
async function loadLeaderChatMessages() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];

    // Show messages where this leader is sender or receiver
    const relevant = messages.filter(m =>
        m.fromEmail === currentUser.email || m.toEmail === currentUser.email
    );

    const container = document.getElementById('leaderChatMessages');
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

// Build inbox of citizens who have sent messages to this leader
async function loadLeaderInbox() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // Only citizen → this leader
    const incoming = messages.filter(m =>
        m.toEmail === currentUser.email && m.fromRole === 'citizen'
    );

    const byCitizen = {};
    incoming.forEach(m => {
        if (!byCitizen[m.fromEmail] || new Date(m.timestamp) > new Date(byCitizen[m.fromEmail].timestamp)) {
            byCitizen[m.fromEmail] = m;
        }
    });

    const tbody = document.getElementById('leaderInboxBody');
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
                    <td><button class="btn btn-secondary" onclick="replyToCitizenFromLeader('${m.fromEmail.replace(/'/g, "\\'")}', '${escapeHtml(name)}')">Reply</button></td>
                </tr>
            `;
        }).join('');
}

// Set reply target for leader
window.replyToCitizenFromLeader = function (email, name) {
    leaderReplyTarget = { email, name };
    const msgInput = document.getElementById('leaderChatMessage');
    const roleSelect = document.getElementById('leaderChatRecipientRole');
    if (roleSelect) {
        roleSelect.value = 'citizen';
    }
    if (msgInput) {
        msgInput.focus();
    }
};

// Shared helpers (if not already defined)
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

// --- Home updates (Recent Activity, Upcoming Session, Trending) ---
const HOME_LEVEL = 'village';

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
    // Default date to today for new posts
    const today = new Date().toISOString().slice(0, 10);
    ['leaderActivityDate', 'leaderUpcomingDate', 'leaderTrendingDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = today;
    });
}

function getCurrentLeaderName() {
    const u = JSON.parse(sessionStorage.getItem('currentUser'));
    return (u && (u.name || u.email)) ? (u.name || u.email) : 'Village Leader';
}

function readImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            compressImageDataUrl(dataUrl, 800, 0.8).then(resolve).catch(() => resolve(dataUrl));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function compressImageDataUrl(dataUrl, maxWidth, quality) {
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

async function handleLeaderActivitySubmit(e) {
    e.preventDefault();
    const description = document.getElementById('leaderActivityDesc').value.trim();
    const place = document.getElementById('leaderActivityPlace').value.trim();
    const date = document.getElementById('leaderActivityDate').value;
    const fileInput = document.getElementById('leaderActivityImage');
    const file = fileInput && fileInput.files && fileInput.files[0];

    // Prepare data for MongoDB
    const updateData = {
        type: 'activity',
        title: 'Activity',
        description,
        place,
        date,
        postedBy: getCurrentLeaderName()
    };

    try {
        // Check if ApiService is available
        if (typeof ApiService === 'undefined') {
            throw new Error('ApiService not available - falling back to localStorage');
        }

        // Use API service to save to MongoDB
        const api = new ApiService();
        const result = await api.createHomeUpdate(updateData, file);

        console.log('Activity saved to MongoDB:', result);
        showNotification('Activity posted successfully!', 'success');

        // Reset form
        e.target.reset();
        document.getElementById('leaderActivityDate').value = new Date().toISOString().slice(0, 10);

        // Refresh home updates list
        loadLeaderHomeUpdatesList();

    } catch (error) {
        console.error('Error saving activity to MongoDB:', error);
        showNotification('Error posting activity: ' + error.message, 'error');

        // Fallback to localStorage if API fails
        let imageData = 'https://via.placeholder.com/400x200?text=Activity';
        if (file) {
            try {
                const dataUrl = await readImageAsDataUrl(file);
                if (dataUrl) imageData = dataUrl;
            } catch (err) {
                console.warn('Image read failed', err);
            }
        }
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        const item = {
            id: Date.now(),
            description,
            place,
            date,
            image: imageData,
            level: HOME_LEVEL,
            uploadedBy: getCurrentLeaderName()
        };
        activities.push(item);
        localStorage.setItem('activities', JSON.stringify(activities));
        e.target.reset();
        document.getElementById('leaderActivityDate').value = new Date().toISOString().slice(0, 10);
    }
    loadLeaderHomeUpdatesList();
    alert('Recent activity posted! It will appear on the home page.');
}

async function handleLeaderUpcomingSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('leaderUpcomingTitle').value.trim();
    const description = document.getElementById('leaderUpcomingDesc').value.trim();
    const place = document.getElementById('leaderUpcomingPlace').value.trim();
    const date = document.getElementById('leaderUpcomingDate').value;
    const fileInput = document.getElementById('leaderUpcomingImage');
    const file = fileInput && fileInput.files && fileInput.files[0];

    // Prepare data for MongoDB
    const updateData = {
        type: 'upcoming',
        title,
        description,
        place,
        date,
        postedBy: getCurrentLeaderName()
    };

    try {
        // Check if ApiService is available
        if (typeof ApiService === 'undefined') {
            throw new Error('ApiService not available - falling back to localStorage');
        }

        // Use API service to save to MongoDB
        const api = new ApiService();
        const result = await api.createHomeUpdate(updateData, file);

        console.log('Upcoming session saved to MongoDB:', result);
        showNotification('Upcoming session posted successfully!', 'success');

        // Reset form
        e.target.reset();
        document.getElementById('leaderUpcomingDate').value = new Date().toISOString().slice(0, 10);

        // Refresh home updates list
        loadLeaderHomeUpdatesList();

    } catch (error) {
        console.error('Error saving upcoming session to MongoDB:', error);
        showNotification('Error posting upcoming session: ' + error.message, 'error');

        // Fallback to localStorage if API fails
        const news = JSON.parse(localStorage.getItem('news')) || [];
        const item = {
            id: Date.now(),
            title,
            description,
            place,
            date,
            level: HOME_LEVEL,
            uploadedBy: getCurrentLeaderName()
        };
        news.push(item);
        localStorage.setItem('news', JSON.stringify(news));
        e.target.reset();
        document.getElementById('leaderUpcomingDate').value = new Date().toISOString().slice(0, 10);
        loadLeaderHomeUpdatesList();
        alert('Upcoming session posted! It will appear on the home page.');
    }
}

async function handleLeaderTrendingSubmit(e) {
    e.preventDefault();
    const description = document.getElementById('leaderTrendingDesc').value.trim();
    const place = document.getElementById('leaderTrendingPlace').value.trim();
    const date = document.getElementById('leaderTrendingDate').value;
    const fileInput = document.getElementById('leaderTrendingImage');
    const file = fileInput && fileInput.files && fileInput.files[0];

    // Prepare data for MongoDB
    const updateData = {
        type: 'trending',
        title: 'Trending Topic',
        description,
        place,
        date,
        postedBy: getCurrentLeaderName()
    };

    try {
        // Check if ApiService is available
        if (typeof ApiService === 'undefined') {
            throw new Error('ApiService not available - falling back to localStorage');
        }

        // Use API service to save to MongoDB
        const api = new ApiService();
        const result = await api.createHomeUpdate(updateData, file);

        console.log('Trending topic saved to MongoDB:', result);
        showNotification('Trending topic posted successfully!', 'success');

        // Reset form
        e.target.reset();
        document.getElementById('leaderTrendingDate').value = new Date().toISOString().slice(0, 10);

        // Refresh home updates list
        loadLeaderHomeUpdatesList();

    } catch (error) {
        console.error('Error saving trending topic to MongoDB:', error);
        showNotification('Error posting trending topic: ' + error.message, 'error');

        // Fallback to localStorage if API fails
        const trending = JSON.parse(localStorage.getItem('trending')) || [];
        const item = {
            id: Date.now(),
            description,
            place,
            date,
            level: HOME_LEVEL,
            uploadedBy: getCurrentLeaderName()
        };
        trending.push(item);
        localStorage.setItem('trending', JSON.stringify(trending));
        e.target.reset();
        document.getElementById('leaderTrendingDate').value = new Date().toISOString().slice(0, 10);
        loadLeaderHomeUpdatesList();
        alert('Trending topic posted! It will appear on the home page.');
    }
}

// Load leader home updates (alias for loadLeaderHomeUpdatesList)
async function loadLeaderHomeUpdates() {
    await loadLeaderHomeUpdatesList();
}

async function loadLeaderHomeUpdatesList() {
    const listEl = document.getElementById('leaderHomeUpdatesList');
    if (!listEl) return;
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const news = JSON.parse(localStorage.getItem('news')) || [];
    const trending = JSON.parse(localStorage.getItem('trending')) || [];
    const myName = getCurrentLeaderName();
    const myActivities = activities.filter(a => a.level === HOME_LEVEL && a.uploadedBy === myName);
    const myNews = news.filter(n => n.level === HOME_LEVEL && n.uploadedBy === myName);
    const myTrending = trending.filter(t => t.level === HOME_LEVEL && t.uploadedBy === myName);
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

// Face Recognition Functions
let faceSystem = null;
let isCameraActive = false;
let regCameraActive = false;
let capturedPhotoData = null;

function setupFaceRecognitionControls() {
    const startBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureFaceBtn');
    const stopBtn = document.getElementById('stopCameraBtn');
    const video = document.getElementById('cameraVideo');
    const placeholder = document.getElementById('cameraPlaceholder');

    if (!startBtn || !captureBtn || !stopBtn || !video || !placeholder) {
        console.warn('Face recognition controls not found in this layout – skipping setup.');
        return;
    }

    startBtn.addEventListener('click', startCamera);
    captureBtn.addEventListener('click', captureFace);
    stopBtn.addEventListener('click', stopCamera);
}

function setupFaceRegistrationControls() {
    const startBtn = document.getElementById('startRegCameraBtn');
    const captureBtn = document.getElementById('captureRegFaceBtn');
    const stopBtn = document.getElementById('stopRegCameraBtn');
    const retakeBtn = document.getElementById('retakePhotoBtn');
    const video = document.getElementById('regCameraVideo');
    const placeholder = document.getElementById('regCameraPlaceholder');

    if (!startBtn || !captureBtn || !stopBtn || !retakeBtn || !video || !placeholder) {
        console.warn('Face registration controls not found in this layout – skipping setup.');
        return;
    }

    startBtn.addEventListener('click', startRegCamera);
    captureBtn.addEventListener('click', captureRegPhoto);
    stopBtn.addEventListener('click', stopRegCamera);
    retakeBtn.addEventListener('click', retakePhoto);
}

async function startRegCamera() {
    const startBtn = document.getElementById('startRegCameraBtn');
    const captureBtn = document.getElementById('captureRegFaceBtn');
    const stopBtn = document.getElementById('stopRegCameraBtn');
    const video = document.getElementById('regCameraVideo');
    const placeholder = document.getElementById('regCameraPlaceholder');
    const photoPreview = document.getElementById('regPhotoPreview');

    try {
        if (!faceSystem) {
            faceSystem = await initializeFaceRecognition();
        }

        await faceSystem.startCamera(video);

        video.style.display = 'block';
        placeholder.style.display = 'none';
        photoPreview.style.display = 'none';
        startBtn.disabled = true;
        captureBtn.disabled = false;
        stopBtn.disabled = false;
        regCameraActive = true;

    } catch (error) {
        console.error('Failed to start registration camera:', error);
        alert('Failed to start camera. Please ensure camera permissions are granted.');
    }
}

async function captureRegPhoto() {
    if (!faceSystem || !regCameraActive) return;

    const captureBtn = document.getElementById('captureRegFaceBtn');
    const video = document.getElementById('regCameraVideo');
    const photoPreview = document.getElementById('regPhotoPreview');
    const photoImage = document.getElementById('regPhotoImage');

    try {
        captureBtn.disabled = true;

        // Capture photo from video
        capturedPhotoData = faceSystem.capturePhoto();

        // Show captured photo
        photoImage.src = capturedPhotoData;
        photoPreview.style.display = 'block';

        // Stop camera
        stopRegCamera();

    } catch (error) {
        console.error('Failed to capture photo:', error);
        alert('Failed to capture photo. Please try again.');
    } finally {
        captureBtn.disabled = false;
    }
}

function stopRegCamera() {
    if (!faceSystem || !regCameraActive) return;

    const startBtn = document.getElementById('startRegCameraBtn');
    const captureBtn = document.getElementById('captureRegFaceBtn');
    const stopBtn = document.getElementById('stopRegCameraBtn');
    const video = document.getElementById('regCameraVideo');
    const placeholder = document.getElementById('regCameraPlaceholder');

    faceSystem.stopCamera();

    video.style.display = 'none';
    placeholder.style.display = 'block';
    startBtn.disabled = false;
    captureBtn.disabled = true;
    stopBtn.disabled = true;
    regCameraActive = false;
}

function retakePhoto() {
    const photoPreview = document.getElementById('regPhotoPreview');
    const photoImage = document.getElementById('regPhotoImage');

    capturedPhotoData = null;
    photoPreview.style.display = 'none';
    photoImage.src = '';

    // Restart camera
    startRegCamera();
}

async function startCamera() {
    const startBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureFaceBtn');
    const stopBtn = document.getElementById('stopCameraBtn');
    const video = document.getElementById('cameraVideo');
    const placeholder = document.getElementById('cameraPlaceholder');

    try {
        if (!faceSystem) {
            faceSystem = await initializeFaceRecognition();
        }

        await faceSystem.startCamera(video);

        video.style.display = 'block';
        placeholder.style.display = 'none';
        startBtn.disabled = true;
        captureBtn.disabled = false;
        stopBtn.disabled = false;
        isCameraActive = true;

    } catch (error) {
        console.error('Failed to start camera:', error);
        alert('Failed to start camera. Please ensure camera permissions are granted.');
    }
}

async function captureFace() {
    if (!faceSystem || !isCameraActive) return;

    const captureBtn = document.getElementById('captureFaceBtn');
    const resultDiv = document.getElementById('recognitionResult');
    const resultMessage = document.getElementById('resultMessage');
    const processingIcon = document.getElementById('processingIcon');

    try {
        // Disable capture button during processing
        captureBtn.disabled = true;

        // Show processing state
        resultDiv.style.display = 'block';
        resultDiv.className = 'recognition-result processing';
        processingIcon.style.display = 'inline-block';
        resultMessage.textContent = 'Processing face...';

        // Capture photo
        const imageData = faceSystem.capturePhoto();

        // Recognize face
        const result = await faceSystem.recognizeFace(imageData);

        if (result.success) {
            // Face recognized - mark attendance
            resultDiv.className = 'recognition-result success';
            processingIcon.style.display = 'none';
            resultMessage.innerHTML = `
                <i class="fa-solid fa-check-circle"></i>
                <strong>${result.citizen.name}</strong> - Attendance marked successfully!
                <br><small>Confidence: ${(result.confidence * 100).toFixed(1)}%</small>
            `;

            // Auto-fill attendance form
            autoFillAttendanceForm(result.citizen);

            // Save attendance record
            saveFaceAttendanceRecord(result.citizen);

        } else {
            // Face not recognized
            resultDiv.className = 'recognition-result error';
            processingIcon.style.display = 'none';
            resultMessage.innerHTML = `
                <i class="fa-solid fa-exclamation-triangle"></i>
                ${result.message || 'Face not recognized. Citizen not registered.'}
            `;
        }

        // Hide result after 5 seconds
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 5000);

    } catch (error) {
        console.error('Face capture failed:', error);
        resultDiv.className = 'recognition-result error';
        processingIcon.style.display = 'none';
        resultMessage.innerHTML = `
            <i class="fa-solid fa-exclamation-circle"></i>
            Error processing face. Please try again.
        `;
    } finally {
        captureBtn.disabled = false;
    }
}

function stopCamera() {
    if (!faceSystem || !isCameraActive) return;

    const startBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureFaceBtn');
    const stopBtn = document.getElementById('stopCameraBtn');
    const video = document.getElementById('cameraVideo');
    const placeholder = document.getElementById('cameraPlaceholder');

    faceSystem.stopCamera();

    video.style.display = 'none';
    placeholder.style.display = 'block';
    startBtn.disabled = false;
    captureBtn.disabled = true;
    stopBtn.disabled = true;
    isCameraActive = false;
}

function autoFillAttendanceForm(citizen) {
    const nameInput = document.getElementById('umugandaName');
    const ageInput = document.getElementById('umugandaAge');
    const sexSelect = document.getElementById('umugandaSex');
    const sectorInput = document.getElementById('umugandaSector');
    const cellInput = document.getElementById('umugandaCell');
    const villageInput = document.getElementById('umugandaVillage');

    if (nameInput) nameInput.value = citizen.name || '';
    if (ageInput) ageInput.value = citizen.age || '';
    if (sexSelect) sexSelect.value = citizen.sex || '';
    if (sectorInput) sectorInput.value = citizen.sector || '';
    if (cellInput) cellInput.value = citizen.cell || '';
    if (villageInput) villageInput.value = citizen.village || '';
}

function saveFaceAttendanceRecord(citizen) {
    const attendanceDate = new Date().toISOString().split('T')[0];
    sessionStorage.setItem('lastUmugandaAttendanceDate', attendanceDate);

    const attendance = {
        name: citizen.name,
        age: citizen.age,
        sex: citizen.sex,
        sector: citizen.sector,
        cell: citizen.cell,
        village: citizen.village,
        date: new Date(attendanceDate).toISOString(),
        checkInMethod: 'face_recognition',
        citizenId: citizen.id || citizen.nationalId
    };

    // Get existing attendance records
    let umugandaData = JSON.parse(localStorage.getItem('umugandaData')) || [];

    // Add new record
    umugandaData.push(attendance);

    // Save to localStorage
    localStorage.setItem('umugandaData', JSON.stringify(umugandaData));

    // Update attendance tracking for this member
    updateAttendanceTracking(citizen.id || citizen.nationalId, citizen.name);

    // Refresh tables
    loadUmugandaTable();
    loadRegisterTable(); // Refresh to show updated attendance percentage
    updateAttendanceStatistics(); // Refresh statistics display
}

function debugFaceDatabase() {
    if (!faceSystem) {
        alert('Face recognition system not initialized');
        return;
    }

    const dbSize = faceSystem.faceDescriptors.size;

    if (dbSize === 0) {
        alert('No faces registered in database. Please register citizens with photos first.');
    } else {
        alert(`Face database contains ${dbSize} registered citizens. Check console for details.`);
    }
}

// Attendance Record Management
function deleteAttendanceRecord(index) {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
        return;
    }

    // Get records from both sources
    const records1 = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
    const records2 = JSON.parse(localStorage.getItem('umugandaData')) || [];
    const allRecords = [...records1, ...records2];

    // Remove duplicates and sort
    const uniqueRecords = allRecords.filter((record, idx, self) =>
        idx === self.findIndex((r) =>
            r.name === record.name && r.date === record.date
        )
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    const recordToDelete = uniqueRecords[index];
    if (!recordToDelete) {
        alert('Record not found');
        return;
    }

    // Find and remove from appropriate source
    let updated = false;

    // Try to remove from umugandaRecords
    const records1Index = records1.findIndex(r =>
        r.name === recordToDelete.name && r.date === recordToDelete.date
    );
    if (records1Index !== -1) {
        records1.splice(records1Index, 1);
        localStorage.setItem('umugandaRecords', JSON.stringify(records1));
        updated = true;
    }

    // Try to remove from umugandaData
    const records2Index = records2.findIndex(r =>
        r.name === recordToDelete.name && r.date === recordToDelete.date
    );
    if (records2Index !== -1) {
        records2.splice(records2Index, 1);
        localStorage.setItem('umugandaData', JSON.stringify(records2));
        updated = true;
    }

    if (updated) {
        alert('Attendance record deleted successfully');
        if (recordToDelete.date) {
            const deletedDay = new Date(recordToDelete.date).toISOString().split('T')[0];
            sessionStorage.setItem('lastUmugandaAttendanceDate', deletedDay);
        }
        loadUmugandaTable();
    } else {
        alert('Failed to delete record');
    }
}

function viewStoredImages() {
    if (!faceSystem) {
        alert('Face recognition system not initialized');
        return;
    }

    faceSystem.viewAllStoredImages();
    alert('Stored images information logged to console. Check browser console (F12).');
}

function exportFaceDatabase() {
    if (!faceSystem) {
        alert('Face recognition system not initialized');
        return;
    }

    try {
        const exportData = faceSystem.exportFaceDatabase();
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `face_database_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        showNotification('Face database exported successfully!', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('Failed to export face database. Check console for details.', 'error');
    }
}

// Visitor Reports Functions
async function loadVisitorReports() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const leaderSector = currentUser.sector || currentUser.leaderSector || '';
    const leaderCell = currentUser.cell || currentUser.leaderCell || '';
    const leaderVillage = currentUser.village || currentUser.leaderVillage || '';

    const tableBody = document.getElementById('visitorReportsTableBody');
    const noDataMessage = document.getElementById('noVisitorReports');
    if (!tableBody) return;

    let serverRecords = [];
    try {
        const api = new ApiService();
        serverRecords = await api.getCitizenReports({ type: 'visitors' });
    } catch (err) {
        console.warn('Failed to load visitor reports from server, falling back to local storage:', err);
        serverRecords = JSON.parse(localStorage.getItem('visitorReports')) || [];
    }

    // Map database records to a flat structure
    const visitorReports = serverRecords.map(r => {
        const d = r.data || {};
        return {
            id: r._id || r.id,
            visitorNames: d.visitorNames || r.visitorNames || 'N/A',
            visitorCount: d.visitorCount || r.visitorCount || 1,
            visitorIDs: d.visitorIDs || r.visitorIDs || 'N/A',
            visitorTelephone: d.visitorTelephone || r.visitorTelephone || 'N/A',
            fromProvince: d.fromProvince || r.fromProvince || '',
            fromDistrict: d.fromDistrict || r.fromDistrict || '',
            fromSector: d.fromSector || r.fromSector || '',
            fromCell: d.fromCell || r.fromCell || '',
            fromVillage: d.fromVillage || r.fromVillage || '',
            yourSector: d.yourSector || r.yourSector || '',
            yourCell: d.yourCell || r.yourCell || '',
            yourVillage: d.yourVillage || r.yourVillage || '',
            yourTelephone: d.yourTelephone || r.yourTelephone || 'N/A',
            reason: d.reason || r.reason || 'N/A',
            returnDate: d.returnDate || r.returnDate,
            reportedBy: r.reportedBy || d.reportedBy || 'N/A',
            reportedByEmail: r.reportedByEmail || d.reportedByEmail || 'N/A',
            dateReported: r.dateReported || r.createdAt || new Date().toISOString(),
            status: d.status || r.status || 'pending'
        };
    });

    // Filter to leader's location
    let visibleReports = visitorReports;
    if (leaderVillage || leaderCell || leaderSector) {
        visibleReports = visitorReports.filter(r => (
            (leaderVillage && r.yourVillage && r.yourVillage === leaderVillage) ||
            (leaderCell && r.yourCell && r.yourCell === leaderCell) ||
            (leaderSector && r.yourSector && r.yourSector === leaderSector)
        ));
    }

    // Cache the visible visitor reports globally to avoid extra lookups
    window.currentVisitorReports = visibleReports;

    // Update summary cards
    updateVisitorSummaryCards(visibleReports);

    // Get filter values
    const searchTerm = document.getElementById('searchVisitors')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterVisitorStatus')?.value || '';
    const dateFilter = document.getElementById('filterVisitorDate')?.value || '';

    // Filter reports by search, status, and date
    let filteredReports = visibleReports.filter(report => {
        // Search filter
        const matchesSearch = !searchTerm ||
            report.visitorNames?.toLowerCase().includes(searchTerm) ||
            report.reportedBy?.toLowerCase().includes(searchTerm) ||
            report.reason?.toLowerCase().includes(searchTerm) ||
            [report.fromProvince, report.fromDistrict, report.fromSector, report.fromCell, report.fromVillage].join(' ').toLowerCase().includes(searchTerm);

        // Status filter
        const matchesStatus = !statusFilter || report.status === statusFilter;

        // Date filter
        let matchesDate = true;
        if (dateFilter) {
            const reportDate = new Date(report.dateReported);
            const today = new Date();

            switch (dateFilter) {
                case 'today':
                    matchesDate = reportDate.toDateString() === today.toDateString();
                    break;
                case 'week':
                    const weekAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
                    matchesDate = reportDate >= weekAgo;
                    break;
                case 'month':
                    const monthAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                    matchesDate = reportDate >= monthAgo;
                    break;
            }
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort by date (newest first)
    filteredReports.sort((a, b) => new Date(b.dateReported) - new Date(a.dateReported));

    if (filteredReports.length === 0) {
        tableBody.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }

    noDataMessage.style.display = 'none';

    tableBody.innerHTML = filteredReports.map((report) => `
        <tr>
            <td>${formatDate(report.dateReported)}</td>
            <td>${escapeHtml(report.visitorNames)}</td>
            <td>${escapeHtml(report.reason)}</td>
            <td>${escapeHtml(report.reportedBy)}</td>
            <td>${escapeHtml([report.fromProvince, report.fromDistrict, report.fromSector, report.fromCell, report.fromVillage].filter(Boolean).join(', ') || 'N/A')}</td>
            <td>${report.returnDate ? formatDate(report.returnDate) : 'N/A'}</td>
            <td>${escapeHtml([report.yourSector, report.yourCell, report.yourVillage].filter(Boolean).join(', ') || 'N/A')}</td>
            <td><span class="status-badge status-${report.status}">${report.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewVisitorDetails('${report.id}')" title="View Details">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    ${report.status === 'pending' ? `
                        <button class="btn-action btn-approve" onclick="updateVisitorStatus('${report.id}', 'approved')" title="Approve">
                            <i class="fa-solid fa-check"></i>
                        </button>
                        <button class="btn-action btn-reject" onclick="updateVisitorStatus('${report.id}', 'rejected')" title="Reject">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function updateVisitorSummaryCards(visitorReports) {
    const today = new Date().toDateString();
    const todayReports = visitorReports.filter(report =>
        new Date(report.dateReported).toDateString() === today
    );
    const pendingReports = visitorReports.filter(report =>
        report.status === 'pending'
    );

    document.getElementById('totalVisitorsCount').textContent = visitorReports.length;
    document.getElementById('todayVisitorsCount').textContent = todayReports.length;
    document.getElementById('pendingVisitorsCount').textContent = pendingReports.length;
}

function viewVisitorDetails(visitorId) {
    const reports = window.currentVisitorReports || [];
    const report = reports.find(r => r.id === visitorId);

    if (!report) {
        showNotification('Visitor report not found', 'error');
        return;
    }

    const details = `
VISITOR REPORT DETAILS
=====================

Date Reported: ${formatDate(report.dateReported)}
Return Date: ${report.returnDate ? formatDate(report.returnDate) : 'Not specified'}

Visitor Information:
- Names: ${report.visitorNames || 'N/A'}
- Number of Visitors: ${report.visitorCount || 'N/A'}
- ID Numbers: ${report.visitorIDs || 'N/A'}
- Telephone: ${report.visitorTelephone || 'N/A'}

Visitor Origin:
- Province: ${report.fromProvince || 'N/A'}
- District: ${report.fromDistrict || 'N/A'}
- Sector: ${report.fromSector || 'N/A'}
- Cell: ${report.fromCell || 'N/A'}
- Village: ${report.fromVillage || 'N/A'}

Host Information:
- Reported By: ${report.reportedBy || 'N/A'}
- Reporter Email: ${report.reportedByEmail || 'N/A'}
- Host Location: ${[report.yourSector, report.yourCell, report.yourVillage].filter(Boolean).join(', ') || 'N/A'}

Visit Details:
- Reason: ${report.reason || 'N/A'}
- Status: ${report.status || 'pending'}
- Host Telephone: ${report.yourTelephone || 'N/A'}
    `;

    showNotification('Visitor details displayed in console', 'info');
    console.log(details);
}

async function updateVisitorStatus(visitorId, newStatus) {
    try {
        const api = new ApiService();
        // Fetch all visitor reports to get the database schema structure
        const serverRecords = await api.getCitizenReports({ type: 'visitors' });
        const report = serverRecords.find(r => r._id === visitorId);
        if (!report) {
            showNotification('Visitor report not found in database', 'error');
            return;
        }

        // Initialize report.data if not present
        if (!report.data) {
            report.data = {};
        }

        report.data.status = newStatus;
        report.data.reviewedDate = new Date().toISOString();
        report.data.reviewedBy = 'Village Leader';

        await api.updateCitizenReport(visitorId, report);

        showNotification(`Visitor report ${newStatus} successfully`, 'success');
        await loadVisitorReports();
    } catch (err) {
        console.error('Failed to update visitor report status on MongoDB:', err);
        // Fallback to localStorage
        const visitorReports = JSON.parse(localStorage.getItem('visitorReports')) || [];
        const reportIndex = visitorReports.findIndex(r => r.id === visitorId);
        if (reportIndex !== -1) {
            visitorReports[reportIndex].status = newStatus;
            visitorReports[reportIndex].reviewedDate = new Date().toISOString();
            visitorReports[reportIndex].reviewedBy = 'Village Leader';
            localStorage.setItem('visitorReports', JSON.stringify(visitorReports));
            showNotification(`Visitor report ${newStatus} locally`, 'success');
            loadVisitorReports();
        } else {
            showNotification('Failed to update visitor report status', 'error');
        }
    }
}

// Add event listeners for visitor filters
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchVisitors');
    const statusFilter = document.getElementById('filterVisitorStatus');
    const dateFilter = document.getElementById('filterVisitorDate');

    if (searchInput) {
        searchInput.addEventListener('input', loadVisitorReports);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', loadVisitorReports);
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', loadVisitorReports);
    }
});

// ============================================================
// INTEKO ATTENDANCE — separate performance + DB save
// ============================================================

let currentIntekoLocation = null;

// --- Inteko-specific performance store (separate from umuganda) ---
function loadIntekoPerformanceStore() {
    try {
        return JSON.parse(localStorage.getItem('intekoPerformanceByYear')) || {};
    } catch {
        return {};
    }
}

function saveIntekoPerformanceStore(store) {
    try {
        localStorage.setItem('intekoPerformanceByYear', JSON.stringify(store));
    } catch (e) {
        console.warn('Failed to save inteko performance store', e);
    }
}

function ensureIntekoMemberPerformance(memberId) {
    const year = getPerformanceYear();
    const store = loadIntekoPerformanceStore();
    store[year] ||= {};
    store[year][memberId] ||= { score: 100, absences: 0, updatedAt: new Date().toISOString() };
    saveIntekoPerformanceStore(store);
    return store[year][memberId];
}

function applyIntekoAbsentPenalty(memberId) {
    const year = getPerformanceYear();
    const store = loadIntekoPerformanceStore();
    store[year] ||= {};
    const entry = store[year][memberId] || { score: 100, absences: 0 };
    entry.score = Math.max(0, (Number(entry.score) || 100) - 1);
    entry.absences = (Number(entry.absences) || 0) + 1;
    entry.updatedAt = new Date().toISOString();
    store[year][memberId] = entry;
    saveIntekoPerformanceStore(store);
    return entry;
}

function renderIntekoPerformanceText(memberId) {
    const entry = ensureIntekoMemberPerformance(memberId);
    const present = Math.max(0, Math.min(100, Number(entry.score) || 0));
    const absent = 100 - present;
    return `Present: ${present}% | Absent: ${absent}%`;
}

function updateIntekoPerformanceUI(memberId) {
    const el = document.getElementById(`inteko-perf-${memberId}`);
    if (el) el.textContent = renderIntekoPerformanceText(memberId);
}

// --- Location dropdowns ---
function updateIntekoLeaderCells() {
    const selectedSector = document.getElementById('intekoSector').value;
    const cellSelect = document.getElementById('intekoCell');
    const villageSelect = document.getElementById('intekoVillage');

    cellSelect.innerHTML = '<option value="">Select your cell</option>';
    cellSelect.disabled = !selectedSector;
    villageSelect.innerHTML = '<option value="">Select your village</option>';
    villageSelect.disabled = true;

    if (!selectedSector) return;

    const locations = window._cachedLocations || initializeDefaultLocations();
    const memberRecords = window._cachedMembers && window._cachedMembers.length > 0
        ? window._cachedMembers
        : JSON.parse(localStorage.getItem('registerRecords')) || [];

    const memberCells = [...new Set(memberRecords.filter(r => r.sector === selectedSector).map(r => r.cell).filter(c => c))];
    const systemCells = Array.isArray(locations.cells) ? locations.cells : [];
    const allCells = [...new Set([...systemCells, ...memberCells])];

    cellSelect.innerHTML = '<option value="">Select your cell</option>' +
        allCells.map(cell => `<option value="${cell}">${cell}</option>`).join('');
}

function updateIntekoLeaderVillages() {
    const selectedSector = document.getElementById('intekoSector').value;
    const selectedCell = document.getElementById('intekoCell').value;
    const villageSelect = document.getElementById('intekoVillage');

    villageSelect.innerHTML = '<option value="">Select your village</option>';
    villageSelect.disabled = !selectedCell;

    if (!selectedSector || !selectedCell) return;

    const locations = window._cachedLocations || initializeDefaultLocations();
    const memberRecords = window._cachedMembers && window._cachedMembers.length > 0
        ? window._cachedMembers
        : JSON.parse(localStorage.getItem('registerRecords')) || [];

    const memberVillages = [...new Set(memberRecords
        .filter(r => r.sector === selectedSector && r.cell === selectedCell)
        .map(r => r.village).filter(v => v))];
    const systemVillages = Array.isArray(locations.villages) ? locations.villages : [];
    const allVillages = [...new Set([...systemVillages, ...memberVillages])];

    villageSelect.innerHTML = '<option value="">Select your village</option>' +
        allVillages.map(village => `<option value="${village}">${village}</option>`).join('');
}

function updateIntekoAttendanceDate() {
    const monthSelect = document.getElementById('intekoAttendanceMonth');
    const dateInput = document.getElementById('intekoAttendanceDate');

    if (monthSelect && dateInput) {
        const selectedMonth = parseInt(monthSelect.value);
        const currentYear = new Date().getFullYear();

        if (selectedMonth !== '' && !isNaN(selectedMonth)) {
            const currentDateValue = dateInput.value;
            const currentMonthSet = currentDateValue ? new Date(currentDateValue).getMonth() : null;
            if (!currentDateValue || currentMonthSet !== selectedMonth) {
                dateInput.value = new Date(currentYear, selectedMonth, 1).toISOString().split('T')[0];
            }
        } else {
            dateInput.value = '';
        }
    }
}

function confirmIntekoLocation() {
    const sector = document.getElementById('intekoSector').value;
    const cell = document.getElementById('intekoCell').value;
    const village = document.getElementById('intekoVillage').value;

    if (!sector || !cell || !village) {
        showNotification('Please select all location fields (Sector, Cell, and Village)', 'error');
        return;
    }

    const monthSelect = document.getElementById('intekoAttendanceMonth');
    if (monthSelect && (!monthSelect.value || monthSelect.value === '')) {
        monthSelect.value = new Date().getMonth().toString();
        updateIntekoAttendanceDate();
    }

    currentIntekoLocation = { sector, cell, village };
    try { localStorage.setItem('intekoLastLocation', JSON.stringify(currentIntekoLocation)); } catch (e) {}

    const locationDisplay = document.getElementById('intekoSelectedLocation');
    if (locationDisplay) locationDisplay.textContent = `${village}, ${cell}, ${sector}`;

    document.getElementById('intekoAttendanceMarkingSection').style.display = 'block';
    loadIntekoLeaderAttendance();
    showNotification(`Location confirmed: ${village}, ${cell}, ${sector}`, 'success');
}

function loadIntekoLeaderAttendance() {
    if (!currentIntekoLocation) {
        document.getElementById('intekoAttendanceTableBody').innerHTML =
            '<tr><td colspan="7" style="text-align:center;color:#666;">Please select your location first</td></tr>';
        return;
    }

    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const tbody = document.getElementById('intekoAttendanceTableBody');

    const locationMembers = records.filter(m =>
        m.sector === currentIntekoLocation.sector &&
        m.cell === currentIntekoLocation.cell &&
        m.village === currentIntekoLocation.village
    );

    if (locationMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#666;">No members found in your location</td></tr>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('intekoAttendanceDate');
    if (!dateInput.value) {
        dateInput.value = today;
    }

    tbody.innerHTML = locationMembers.map(record => {
        const originalIndex = records.findIndex(r => r.telephone === record.telephone);
        return `
            <tr data-inteko-member-id="${record.telephone}" data-index="${originalIndex}">
                <td>${record.name}</td>
                <td>${record.sector}</td>
                <td>${record.cell}</td>
                <td>${record.village}</td>
                <td>${record.telephone}</td>
                <td>
                    <div class="attendance-status">
                        <button class="status-btn present" onclick="markIntekoMemberAttendance('${record.telephone}', 'present', ${originalIndex})">
                            <i class="fa-solid fa-check"></i> Present
                        </button>
                        <button class="status-btn absent" onclick="markIntekoMemberAttendance('${record.telephone}', 'absent', ${originalIndex})">
                            <i class="fa-solid fa-times"></i> Absent
                        </button>
                    </div>
                </td>
                <td><span id="inteko-perf-${record.telephone}">${renderIntekoPerformanceText(record.telephone)}</span></td>
            </tr>
        `;
    }).join('');

    updateIntekoAttendanceSummary();
}

function changeIntekoLocation() {
    currentIntekoLocation = null;

    document.getElementById('intekoSector').value = '';
    document.getElementById('intekoCell').value = '';
    document.getElementById('intekoCell').disabled = true;
    document.getElementById('intekoVillage').value = '';
    document.getElementById('intekoVillage').disabled = true;

    document.getElementById('intekoAttendanceMarkingSection').style.display = 'none';
    sessionStorage.removeItem('intekoTempAttendance');

    showNotification('Location selection reset. Please select your new location.', 'info');
}

function markIntekoMemberAttendance(memberId, status, index) {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const member = records[index];

    const row = document.querySelector(`tr[data-inteko-member-id="${memberId}"]`);
    if (row) {
        const buttons = row.querySelectorAll('.status-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        if (status === 'present') {
            buttons[0].classList.add('active');
        } else {
            buttons[1].classList.add('active');
        }
    }

    const tempAttendance = JSON.parse(sessionStorage.getItem('intekoTempAttendance')) || {};
    const prevStatus = tempAttendance[memberId]?.status;

    if (status === 'absent' && prevStatus !== 'absent') {
        applyIntekoAbsentPenalty(memberId);
    } else {
        ensureIntekoMemberPerformance(memberId);
    }
    updateIntekoPerformanceUI(memberId);

    tempAttendance[memberId] = {
        status,
        name: member ? member.name : memberId,
        timestamp: new Date().toISOString()
    };
    sessionStorage.setItem('intekoTempAttendance', JSON.stringify(tempAttendance));

    if (member) {
        showNotification(`${member.name} marked as ${status}`, status === 'present' ? 'success' : 'info');
    }

    updateIntekoAttendanceSummary();
}

function markAllIntekoPresent() {
    if (!currentIntekoLocation) {
        showNotification('Please select your location first', 'error');
        return;
    }

    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const locationMembers = records.filter(m =>
        m.sector === currentIntekoLocation.sector &&
        m.cell === currentIntekoLocation.cell &&
        m.village === currentIntekoLocation.village
    );

    const allPresentAttendance = {};
    locationMembers.forEach(record => {
        const row = document.querySelector(`tr[data-inteko-member-id="${record.telephone}"]`);
        if (row) {
            const buttons = row.querySelectorAll('.status-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            buttons[0].classList.add('active');
        }
        allPresentAttendance[record.telephone] = {
            status: 'present',
            name: record.name,
            timestamp: new Date().toISOString()
        };
        ensureIntekoMemberPerformance(record.telephone);
        updateIntekoPerformanceUI(record.telephone);
    });

    sessionStorage.setItem('intekoTempAttendance', JSON.stringify(allPresentAttendance));
    updateIntekoAttendanceSummary();
    showNotification(`All ${locationMembers.length} members marked as present`, 'success');
}

function markAllIntekoAbsent() {
    if (!currentIntekoLocation) {
        showNotification('Please select your location first', 'error');
        return;
    }

    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const locationMembers = records.filter(m =>
        m.sector === currentIntekoLocation.sector &&
        m.cell === currentIntekoLocation.cell &&
        m.village === currentIntekoLocation.village
    );
    const tempAttendance = JSON.parse(sessionStorage.getItem('intekoTempAttendance')) || {};
    const allAbsentAttendance = {};

    locationMembers.forEach(record => {
        const row = document.querySelector(`tr[data-inteko-member-id="${record.telephone}"]`);
        if (row) {
            const buttons = row.querySelectorAll('.status-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            buttons[1].classList.add('active');
        }

        const prevStatus = tempAttendance[record.telephone]?.status;
        if (prevStatus !== 'absent') {
            applyIntekoAbsentPenalty(record.telephone);
        } else {
            ensureIntekoMemberPerformance(record.telephone);
        }
        updateIntekoPerformanceUI(record.telephone);

        allAbsentAttendance[record.telephone] = {
            status: 'absent',
            name: record.name,
            timestamp: new Date().toISOString()
        };
    });

    sessionStorage.setItem('intekoTempAttendance', JSON.stringify(allAbsentAttendance));
    updateIntekoAttendanceSummary();
    showNotification(`All ${locationMembers.length} members marked as absent`, 'info');
}

function updateIntekoAttendanceSummary() {
    const tempAttendance = JSON.parse(sessionStorage.getItem('intekoTempAttendance')) || {};
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];

    const locationMembers = currentIntekoLocation ? records.filter(m =>
        m.sector === currentIntekoLocation.sector &&
        m.cell === currentIntekoLocation.cell &&
        m.village === currentIntekoLocation.village
    ) : [];

    const presentCount = Object.values(tempAttendance).filter(a => a.status === 'present').length;
    const absentCount = Object.values(tempAttendance).filter(a => a.status === 'absent').length;

    const totalEl = document.getElementById('intekoTotalMembersCount');
    const presentEl = document.getElementById('intekoPresentCount');
    const absentEl = document.getElementById('intekoAbsentCount');
    if (totalEl) totalEl.textContent = locationMembers.length;
    if (presentEl) presentEl.textContent = presentCount;
    if (absentEl) absentEl.textContent = absentCount;
}

async function saveIntekoAttendance() {
    const currentAttendance = JSON.parse(sessionStorage.getItem('intekoTempAttendance')) || {};
    const dateInput = document.getElementById('intekoAttendanceDate');

    if (!dateInput || !dateInput.value) {
        showNotification('Please select a date for attendance', 'error');
        return;
    }
    if (Object.keys(currentAttendance).length === 0) {
        showNotification('Please mark attendance for at least one member', 'error');
        return;
    }

    const attendanceDate = dateInput.value;
    const allRecords = JSON.parse(localStorage.getItem('registerRecords')) || [];
    let intekoRecords = JSON.parse(localStorage.getItem('intekoRecords')) || [];

    try {
        if (typeof ApiService === 'undefined') {
            throw new Error('ApiService not available');
        }

        const api = new ApiService();

        for (const [memberId, attendance] of Object.entries(currentAttendance)) {
            const memberRecord = allRecords.find(r => r.telephone === memberId);
            if (!memberRecord) continue;

            const attendanceRecord = {
                name: attendance.name,
                age: memberRecord.age,
                sex: memberRecord.sex,
                sector: memberRecord.sector,
                cell: memberRecord.cell,
                village: memberRecord.village,
                telephone: memberId,
                citizenId: memberId,
                date: new Date(attendanceDate).toISOString(),
                attendanceDate,
                checkInMethod: 'manual',
                status: attendance.status
            };

            await api.saveIntekoAttendanceRecord(attendanceRecord);

            // Mirror to localStorage for offline/analytics use
            const existingIndex = intekoRecords.findIndex(r =>
                r.citizenId === memberId && r.attendanceDate === attendanceDate
            );
            if (existingIndex !== -1) {
                intekoRecords[existingIndex] = attendanceRecord;
            } else {
                intekoRecords.push(attendanceRecord);
            }
        }

        showNotification(`Inteko attendance saved to database for ${Object.keys(currentAttendance).length} members!`, 'success');

    } catch (error) {
        console.error('Error saving inteko attendance to DB:', error);
        showNotification('Saved to local storage (DB unavailable): ' + error.message, 'warning');

        // Fallback: save only to localStorage
        Object.entries(currentAttendance).forEach(([memberId, attendance]) => {
            const memberRecord = allRecords.find(r => r.telephone === memberId);
            if (!memberRecord) return;

            const attendanceRecord = {
                name: attendance.name,
                age: memberRecord.age,
                sex: memberRecord.sex,
                sector: memberRecord.sector,
                cell: memberRecord.cell,
                village: memberRecord.village,
                telephone: memberId,
                citizenId: memberId,
                date: new Date(attendanceDate).toISOString(),
                attendanceDate,
                status: attendance.status
            };

            const existingIndex = intekoRecords.findIndex(r =>
                r.citizenId === memberId && r.attendanceDate === attendanceDate
            );
            if (existingIndex !== -1) {
                intekoRecords[existingIndex] = attendanceRecord;
            } else {
                intekoRecords.push(attendanceRecord);
            }
        });
    }

    localStorage.setItem('intekoRecords', JSON.stringify(intekoRecords));
    sessionStorage.removeItem('intekoTempAttendance');
    loadIntekoSavedRecordsTable();
}

function loadIntekoSavedRecordsTable() {
    const tbody = document.getElementById('intekoSavedTableBody');
    const wrapper = document.getElementById('intekoSavedRecordsWrap');
    if (!tbody || !wrapper) return;

    const intekoRecords = JSON.parse(localStorage.getItem('intekoRecords')) || [];
    const allRecords = JSON.parse(localStorage.getItem('registerRecords')) || [];

    const combined = allRecords.map(reg => {
        const saved = intekoRecords.find(r => r.telephone === reg.telephone);
        return {
            name: reg.name,
            sex: reg.sex,
            age: reg.age,
            telephone: reg.telephone,
            sector: reg.sector,
            cell: reg.cell,
            village: reg.village,
            status: saved ? saved.status : 'Not recorded',
            attendanceDate: saved ? saved.attendanceDate : ''
        };
    });

    if (combined.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    wrapper.style.display = 'block';
    populateIntekoSavedRecordsFilters(combined);

    tbody.innerHTML = combined.map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${m.sex || '-'}</td>
            <td>${m.age || '-'}</td>
            <td>${m.telephone}</td>
            <td>${m.sector}</td>
            <td>${m.cell}</td>
            <td>${m.village}</td>
            <td>
                <span class="status-badge ${m.status === 'present' ? 'present' : m.status === 'absent' ? 'absent' : 'pending'}">
                    ${m.status}
                </span>
            </td>
            <td>${renderIntekoPerformanceText(m.telephone)}</td>
        </tr>
    `).join('');
}

function populateIntekoSavedRecordsFilters(members) {
    const sectorSelect = document.getElementById('intekoFilterSector');
    const cellSelect = document.getElementById('intekoFilterCell');
    const villageSelect = document.getElementById('intekoFilterVillage');
    if (!sectorSelect || !cellSelect || !villageSelect) return;

    const sectors = [...new Set(members.map(m => m.sector).filter(Boolean))];
    const cells = [...new Set(members.map(m => m.cell).filter(Boolean))];
    const villages = [...new Set(members.map(m => m.village).filter(Boolean))];

    sectorSelect.innerHTML = '<option value="">All Sectors</option>' + sectors.map(s => `<option value="${s}">${s}</option>`).join('');
    cellSelect.innerHTML = '<option value="">All Cells</option>' + cells.map(c => `<option value="${c}">${c}</option>`).join('');
    villageSelect.innerHTML = '<option value="">All Villages</option>' + villages.map(v => `<option value="${v}">${v}</option>`).join('');
}

function filterIntekoSavedRecords() {
    const tbody = document.getElementById('intekoSavedTableBody');
    if (!tbody) return;

    const search = (document.getElementById('intekoSearchName')?.value || '').toLowerCase();
    const sector = document.getElementById('intekoFilterSector')?.value || '';
    const cell = document.getElementById('intekoFilterCell')?.value || '';
    const village = document.getElementById('intekoFilterVillage')?.value || '';

    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (!cells.length) return;
        const name = (cells[0]?.textContent || '').toLowerCase();
        const rowSector = cells[4]?.textContent || '';
        const rowCell = cells[5]?.textContent || '';
        const rowVillage = cells[6]?.textContent || '';

        const visible =
            (!search || name.includes(search)) &&
            (!sector || rowSector === sector) &&
            (!cell || rowCell === cell) &&
            (!village || rowVillage === village);

        row.style.display = visible ? '' : 'none';
    });
}

// ============================================================
// SECTION 4 — ATTENDANCE ANALYTICS (Umuganda + Inteko)
// ============================================================

// Wire up the two sub-tabs inside section 4
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-atab]').forEach(tab => {
        tab.addEventListener('click', e => {
            e.preventDefault();
            const target = tab.dataset.atab;
            document.querySelectorAll('[data-atab]').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('[id^="atab-"]').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById(`atab-${target}`);
            if (panel) panel.classList.add('active');
        });
    });

    // Load both panels whenever section 4 is activated
    const analyticsLink = document.querySelector('[data-section="analytics"]');
    if (analyticsLink) {
        analyticsLink.addEventListener('click', () => {
            setTimeout(() => {
                loadUmugandaAnalytics();
                loadIntekoAnalytics();
            }, 50);
        });
    }
});

function _buildAttendanceRows(records, status) {
    const filtered = records.filter(r => r.status === status);
    if (!filtered.length) {
        return `<tr><td colspan="9" style="text-align:center;color:#999;">No ${status} records found.</td></tr>`;
    }
    return filtered.map((r, i) => {
        const date = r.attendanceDate || (r.date ? r.date.split('T')[0] : '—');
        return `<tr>
            <td>${i + 1}</td>
            <td>${r.name || '—'}</td>
            <td>${r.sex || '—'}</td>
            <td>${r.age || '—'}</td>
            <td>${r.sector || '—'}</td>
            <td>${r.cell || '—'}</td>
            <td>${r.village || '—'}</td>
            <td>${r.telephone || r.citizenId || '—'}</td>
            <td>${date}</td>
        </tr>`;
    }).join('');
}

function _applyDateFilter(records, dateValue) {
    if (!dateValue) return records;
    return records.filter(r => {
        const d = r.attendanceDate || (r.date ? r.date.split('T')[0] : '');
        return d === dateValue;
    });
}

function _renderAnalyticsPanel(prefix, records) {
    const allMembers = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const present = records.filter(r => r.status === 'present').length;
    const absent  = records.filter(r => r.status === 'absent').length;
    const total   = records.length;
    const rate    = total > 0 ? Math.round((present / total) * 100) : 0;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl(`${prefix}-totalMembers`, allMembers.length);
    setEl(`${prefix}-present`, present);
    setEl(`${prefix}-absent`, absent);
    setEl(`${prefix}-rate`, `${rate}%`);
    setEl(`${prefix}-present-count`, `(${present} records)`);
    setEl(`${prefix}-absent-count`, `(${absent} records)`);

    const presentTbody = document.getElementById(`${prefix}-present-tbody`);
    const absentTbody  = document.getElementById(`${prefix}-absent-tbody`);
    if (presentTbody) presentTbody.innerHTML = _buildAttendanceRows(records, 'present');
    if (absentTbody)  absentTbody.innerHTML  = _buildAttendanceRows(records, 'absent');
}

async function loadUmugandaAnalytics() {
    const dateFilter = document.getElementById('uga-dateFilter')?.value || '';
    let records = [];

    // Try API first, fall back to localStorage
    try {
        if (typeof ApiService !== 'undefined') {
            const api = new ApiService();
            const params = dateFilter ? { attendanceDate: dateFilter } : {};
            records = await api.getAttendance(params);
        }
    } catch (e) { /* fall through */ }

    if (!records.length) {
        records = [
            ...(JSON.parse(localStorage.getItem('umugandaRecords')) || []),
            ...(JSON.parse(localStorage.getItem('umugandaData'))    || [])
        ];
    }

    records = _applyDateFilter(records, dateFilter);
    _renderAnalyticsPanel('uga', records);
}

async function loadIntekoAnalytics() {
    const dateFilter = document.getElementById('int-dateFilter')?.value || '';
    let records = [];

    // Try dedicated IntekoAttendance API first
    try {
        if (typeof ApiService !== 'undefined') {
            const api = new ApiService();
            const params = dateFilter ? { attendanceDate: dateFilter } : {};
            records = await api.getIntekoAttendance(params);
        }
    } catch (e) { /* fall through */ }

    if (!records.length) {
        records = JSON.parse(localStorage.getItem('intekoRecords')) || [];
    }

    records = _applyDateFilter(records, dateFilter);
    _renderAnalyticsPanel('int', records);
}

function downloadAttendanceCSV(type) {
    const prefix    = type === 'umuganda' ? 'uga' : 'int';
    const typeName  = type === 'umuganda' ? 'Umuganda' : 'Inteko';
    const headers   = ['#','Name','Sex','Age','Sector','Cell','Village','Telephone','Date','Status'];

    const presentTbody = document.getElementById(`${prefix}-present-tbody`);
    const absentTbody  = document.getElementById(`${prefix}-absent-tbody`);

    const rowsFromTable = tbody => {
        if (!tbody) return [];
        return Array.from(tbody.querySelectorAll('tr'))
            .filter(tr => tr.querySelectorAll('td').length > 1)
            .map(tr => Array.from(tr.querySelectorAll('td')).map(td => `"${td.textContent.trim()}"`));
    };

    const presentRows = rowsFromTable(presentTbody).map(r => [...r, '"Present"']);
    const absentRows  = rowsFromTable(absentTbody).map(r  => [...r, '"Absent"']);
    const allRows     = [...presentRows, ...absentRows];

    if (!allRows.length) {
        showNotification('No attendance data to download.', 'warning');
        return;
    }

    const csv  = [headers.join(','), ...allRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${typeName}_Attendance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`${typeName} attendance downloaded successfully.`, 'success');
}

// ── Inteko location: add new Sector / Cell / Village ──────────────────────
function addNewIntekoSector() {
    showInputPrompt('Enter new sector name', 'Sector name', async (name) => {
        if (!name) return;
        const locations = { ...window._cachedLocations, sectors: [...(window._cachedLocations.sectors || [])] };
        if (locations.sectors.includes(name.trim())) { showNotification('Sector already exists', 'error'); return; }
        locations.sectors.push(name.trim());
        await saveLocationsToDB(locations);
        loadSectorsForLeader();
        loadIntekoSectors();
        showNotification(`Sector "${name}" added successfully`, 'success');
    });
}

function addNewIntekoCell() {
    showInputPrompt('Enter new cell name', 'Cell name', async (name) => {
        if (!name) return;
        const locations = { ...window._cachedLocations, cells: [...(window._cachedLocations.cells || [])] };
        if (locations.cells.includes(name.trim())) { showNotification('Cell already exists', 'error'); return; }
        locations.cells.push(name.trim());
        await saveLocationsToDB(locations);
        const sel = document.getElementById('intekoSector');
        if (sel && sel.value) updateIntekoLeaderCells();
        showNotification(`Cell "${name}" added successfully`, 'success');
    });
}

function addNewIntekoVillage() {
    showInputPrompt('Enter new village name', 'Village name', async (name) => {
        if (!name) return;
        const locations = { ...window._cachedLocations, villages: [...(window._cachedLocations.villages || [])] };
        if (locations.villages.includes(name.trim())) { showNotification('Village already exists', 'error'); return; }
        locations.villages.push(name.trim());
        await saveLocationsToDB(locations);
        const s = document.getElementById('intekoSector');
        const c = document.getElementById('intekoCell');
        if (s && c && s.value && c.value) updateIntekoLeaderVillages();
        showNotification(`Village "${name}" added successfully`, 'success');
    });
}

function loadIntekoSectors() {
    const locations = window._cachedLocations || initializeDefaultLocations();
    const memberRecords = window._cachedMembers && window._cachedMembers.length > 0
        ? window._cachedMembers
        : JSON.parse(localStorage.getItem('registerRecords')) || [];
    const memberSectors = [...new Set(memberRecords.map(r => r.sector).filter(Boolean))];
    const allSectors = [...new Set([...(locations.sectors || []), ...memberSectors])];
    const sel = document.getElementById('intekoSector');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">-- Select your sector --</option>' +
        allSectors.map(s => `<option value="${s}">${s}</option>`).join('');
    if (current) sel.value = current;
}
