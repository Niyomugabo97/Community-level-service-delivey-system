// Leader Dashboard JavaScript

// Check authentication
document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser || currentUser.userType !== 'leader') {
        window.location.href = 'login.html';
        return;
    }

    // Initialize face recognition system
    try {
        await initializeFaceRecognition();
        setupFaceRecognitionControls();
        setupFaceRegistrationControls();
    } catch (error) {
        console.error('Failed to initialize face recognition:', error);
    }

    // Initialize dashboard
    async function initializeDashboard() {
        try {
            // Initialize face recognition system first
            faceSystem = await initializeFaceRecognition();
            
            // Initialize attendance tracking for existing members
            initializeAllMembersAttendanceTracking();
            
            // Setup navigation and forms
            setupNavigation();
            setupForms();
            setupFaceRecognitionControls();
            setupFaceRegistrationControls();
            
            // Load all data
            loadAllTables();
            loadLeaderHomeUpdates();
            loadLeaderChatMessages();
            loadLeaderInbox();
            // Home updates (activities, upcoming, trending)
            setupHomeUpdatesTabs();
            setupHomeUpdateForms();
            loadLeaderHomeUpdatesList();
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            alert('Failed to initialize dashboard. Please refresh the page.');
        }
    }

    initializeDashboard();
});

function setupNavigation() {
    document.querySelectorAll('.dashboard-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links and sections
            document.querySelectorAll('.dashboard-menu a').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link and corresponding section
            link.classList.add('active');
            const sectionId = link.getAttribute('data-section');
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('active');
            }
        });
    });

    // Show Register Members by default
    document.getElementById('register').classList.add('active');

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
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
    document.getElementById('caseForm').addEventListener('submit', handleCaseSubmit);
    
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

function loadUmugandaTable() {
    // Get records from both possible sources
    const records1 = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
    const records2 = JSON.parse(localStorage.getItem('umugandaData')) || [];
    
    // Merge records (remove duplicates based on name + date)
    const allRecords = [...records1, ...records2];
    const uniqueRecords = allRecords.filter((record, index, self) =>
        index === self.findIndex((r) => 
            r.name === record.name && r.date === record.date
        )
    );
    
    // Sort by date (newest first)
    uniqueRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const tbody = document.getElementById('umugandaTableBody');
    
    if (uniqueRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">No attendance records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = uniqueRecords.map((record, index) => {
        const methodIcon = record.checkInMethod === 'face_recognition' 
            ? '<i class="fa-solid fa-face-smile" style="color: #28a745;"></i> Face Recognition'
            : '<i class="fa-solid fa-keyboard" style="color: #007bff;"></i> Manual';
            
        return `
            <tr data-index="${index}">
                <td>${record.name}</td>
                <td>${record.age || '-'}</td>
                <td>${record.sex || '-'}</td>
                <td>${record.sector || '-'}</td>
                <td>${record.cell || '-'}</td>
                <td>${record.village || '-'}</td>
                <td>${formatDate(record.date)}</td>
                <td>${methodIcon}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteAttendanceRecord(${index})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
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

function handleIntekoSubmit(e) {
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
        id: Date.now(),
        meetingTitle: document.getElementById('meetingTitle').value,
        meetingType: document.getElementById('meetingType').value,
        meetingDate: document.getElementById('meetingDate').value,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        venue: document.getElementById('venue').value,
        meetingNumber: document.getElementById('meetingNumber').value,
        chairperson: document.getElementById('chairperson').value,
        attendees,
        apologies: document.getElementById('apologies').value,
        quorumStatus: document.getElementById('quorumStatus').value,
        agendaItems,
        discussionSummary: document.getElementById('discussionSummary').value,
        decisions,
        actions,
        reportSummary: document.getElementById('reportSummary').value,
        keyOutcomes: document.getElementById('keyOutcomes').value,
        challenges: document.getElementById('challenges').value,
        recommendations: document.getElementById('recommendations').value,
        attachedFiles: document.getElementById('attachedFiles').value,
        preparedBy: document.getElementById('preparedBy').value,
        reviewedBy: document.getElementById('reviewedBy').value,
        approvedBy: document.getElementById('approvedBy').value,
        approvalDate: document.getElementById('approvalDate').value,
        nextMeetingDate: document.getElementById('nextMeetingDate').value,
        followUpNotes: document.getElementById('followUpNotes').value,
        minutesStatus: document.getElementById('minutesStatus').value,
        archiveRef: document.getElementById('archiveRef').value,
        createdAt: new Date().toISOString()
    };

    const records = JSON.parse(localStorage.getItem('intekoRecords')) || [];
    records.push(record);
    localStorage.setItem('intekoRecords', JSON.stringify(records));

    e.target.reset();
    loadIntekoRecords();
    alert('Inteko minutes saved successfully!');
}

function loadIntekoRecords() {
    const records = JSON.parse(localStorage.getItem('intekoRecords')) || [];
    const container = document.getElementById('intekoRecords');
    
    container.innerHTML = records.map(record => `
        <div class="inteko-record-card" style="background: white; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h4>${record.meetingTitle}</h4>
            <p><strong>Type:</strong> ${record.meetingType}</p>
            <p><strong>Date:</strong> ${formatDate(record.meetingDate)}</p>
            <p><strong>Chairperson:</strong> ${record.chairperson}</p>
            <p><strong>Status:</strong> ${record.minutesStatus}</p>
            <button class="btn btn-secondary" onclick="viewIntekoDetails(${record.id})">View Details</button>
        </div>
    `).join('');
}

// Register New People
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const editingInfo = sessionStorage.getItem('editingMember');
    const isEditing = editingInfo !== null;
    
    const record = {
        id: isEditing ? JSON.parse(editingInfo).id : Date.now(),
        name: document.getElementById('regName').value,
        sex: document.getElementById('regSex').value,
        age: parseInt(document.getElementById('regAge').value),
        telephone: document.getElementById('regTelephone').value,
        sector: document.getElementById('regSector').value,
        cell: document.getElementById('regCell').value,
        village: document.getElementById('regVillage').value,
        status: document.getElementById('regStatus').value,
        date: new Date().toISOString()
    };

    if (isEditing) {
        // Update existing member
        const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
        const index = records.findIndex(r => r.id === record.id);
        if (index !== -1) {
            records[index] = record;
            localStorage.setItem('registerRecords', JSON.stringify(records));
            alert('Member updated successfully!');
        }
        
        // Reset editing state
        sessionStorage.removeItem('editingMember');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Register Member';
        submitBtn.classList.remove('btn-warning');
        submitBtn.classList.add('btn-primary');
        
    } else {
        // Add new member
        const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
        records.push(record);
        localStorage.setItem('registerRecords', JSON.stringify(records));
        
        // Initialize attendance tracking for new member
        initializeAttendanceTracking(record.telephone, record.name);
        
        // Show notification with 0% attendance rate
        showNotification(`Member registered successfully! Current attendance rate: 0%`, 'success');
    }

    // Reset form
    e.target.reset();
    
    // Reload tables
    loadRegisterTable();
    loadAttendanceList();
    updateSectorVillageFilters();
}

function loadRegisterTable() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const tbody = document.getElementById('registerTableBody');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #666;">No registered members found</td></tr>';
        return;
    }
    
    tbody.innerHTML = records.map((record, index) => {
        // Calculate attendance percentage
        const attendancePercentage = calculateAttendancePercentage(record.telephone, record.name);
        
        // Determine attendance color and icon
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
            <tr data-index="${index}">
                <td>${record.name}</td>
                <td>${record.sex}</td>
                <td>${record.telephone}</td>
                <td>${record.sector}</td>
                <td>${record.cell}</td>
                <td>${record.village}</td>
                <td>${record.age}</td>
                <td>${record.status}</td>
                <td>${attendanceDisplay}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editMemberRecord(${index})">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMemberRecord(${index})">
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

// Calculate attendance percentage for a member
function calculateAttendancePercentage(memberTelephone, memberName) {
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
    
    // Count total Umuganda sessions (unique dates)
    const totalSessions = [...new Set(uniqueRecords.map(r => r.date.split('T')[0]))].length;
    
    // Count member's attendance using telephone number
    const memberAttendance = uniqueRecords.filter(record => 
        record.name === memberName || 
        (record.citizenId && record.citizenId === memberTelephone)
    ).length;
    
    // Calculate percentage - return 0% for new members with no sessions
    if (totalSessions === 0 || memberAttendance === 0) return 0;
    
    const percentage = Math.round((memberAttendance / totalSessions) * 100);
    return percentage;
}

// Initialize attendance tracking for new member
function initializeAttendanceTracking(memberTelephone, memberName) {
    const attendanceTracking = JSON.parse(localStorage.getItem('attendanceTracking')) || {};
    
    if (!attendanceTracking[memberTelephone]) {
        attendanceTracking[memberTelephone] = {
            name: memberName,
            totalSessions: 0,
            attendedSessions: 0,
            lastUpdated: new Date().toISOString(),
            registrationDate: new Date().toISOString()
        };
        
        localStorage.setItem('attendanceTracking', JSON.stringify(attendanceTracking));
    }
}

// Update attendance tracking when member attends
function updateAttendanceTracking(memberTelephone, memberName) {
    const attendanceTracking = JSON.parse(localStorage.getItem('attendanceTracking')) || {};
    
    if (!attendanceTracking[memberTelephone]) {
        attendanceTracking[memberTelephone] = {
            name: memberName,
            totalSessions: 0,
            attendedSessions: 0,
            lastUpdated: new Date().toISOString(),
            registrationDate: new Date().toISOString()
        };
    }
    
    attendanceTracking[memberTelephone].attendedSessions++;
    attendanceTracking[memberTelephone].lastUpdated = new Date().toISOString();
    
    localStorage.setItem('attendanceTracking', JSON.stringify(attendanceTracking));
}

// Initialize attendance tracking for all existing members (for backward compatibility)
function initializeAllMembersAttendanceTracking() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const attendanceTracking = JSON.parse(localStorage.getItem('attendanceTracking')) || {};
    
    records.forEach(record => {
        if (!attendanceTracking[record.telephone]) {
            attendanceTracking[record.telephone] = {
                name: record.name,
                totalSessions: 0,
                attendedSessions: 0,
                lastUpdated: new Date().toISOString(),
                registrationDate: record.date || new Date().toISOString()
            };
        }
    });
    
    localStorage.setItem('attendanceTracking', JSON.stringify(attendanceTracking));
}

// Initialize default locations
function initializeDefaultLocations() {
    // Get existing locations from localStorage or initialize with defaults
    let locations = JSON.parse(localStorage.getItem('systemLocations')) || {
        sectors: ['Nyarugenge', 'Ruhuha'],
        cells: ['Murambi', 'Kamabare'],
        villages: ['Cyeru', 'Kanombe']
    };
    
    // Save to localStorage if not exists
    if (!localStorage.getItem('systemLocations')) {
        localStorage.setItem('systemLocations', JSON.stringify(locations));
    }
    
    return locations;
}

// Add new sector
function addNewSector() {
    openLocationModal('sector');
}

// Add new cell
function addNewCell() {
    openLocationModal('cell');
}

// Add new village
function addNewVillage() {
    openLocationModal('village');
}

// Open location modal
function openLocationModal(type) {
    const modal = document.getElementById('locationModal');
    const title = document.getElementById('modalTitle');
    const input = document.getElementById('locationInput');
    const typeSelect = document.getElementById('locationType');
    
    // Set modal title and type
    const titles = {
        sector: 'Add New Sector',
        cell: 'Add New Cell',
        village: 'Add New Village'
    };
    
    title.textContent = titles[type];
    typeSelect.value = type;
    input.value = '';
    input.placeholder = `Enter new ${type} name...`;
    
    // Show modal
    modal.style.display = 'flex';
    
    // Focus on input
    setTimeout(() => input.focus(), 100);
}

// Close location modal
function closeLocationModal() {
    const modal = document.getElementById('locationModal');
    modal.style.display = 'none';
    
    // Clear form
    document.getElementById('locationInput').value = '';
    document.getElementById('locationType').value = 'sector';
}

// Save new location
function saveNewLocation() {
    const input = document.getElementById('locationInput');
    const typeSelect = document.getElementById('locationType');
    const locationName = input.value.trim();
    const locationType = typeSelect.value;
    
    if (!locationName) {
        showNotification('Please enter a valid location name', 'error');
        input.focus();
        return;
    }
    
    const locations = JSON.parse(localStorage.getItem('systemLocations')) || initializeDefaultLocations();
    
    // Check for duplicates based on type
    if (locations[locationType + 's'].includes(locationName)) {
        showNotification(`${locationType.charAt(0).toUpperCase() + locationType.slice(1)} already exists`, 'error');
        input.focus();
        return;
    }
    
    // Add new location
    locations[locationType + 's'].push(locationName);
    localStorage.setItem('systemLocations', JSON.stringify(locations));
    
    // Close modal
    closeLocationModal();
    
    // Reload relevant dropdown
    if (locationType === 'sector') {
        loadSectorsForLeader();
    } else if (locationType === 'cell') {
        const selectedSector = document.getElementById('leaderSector').value;
        if (selectedSector) {
            updateLeaderCells();
        }
    } else if (locationType === 'village') {
        const selectedSector = document.getElementById('leaderSector').value;
        const selectedCell = document.getElementById('leaderCell').value;
        if (selectedSector && selectedCell) {
            updateLeaderVillages();
        }
    }
    
    showNotification(`${locationType.charAt(0).toUpperCase() + locationType.slice(1)} "${locationName}" added successfully`, 'success');
}

// Update updateLeaderCells to use system locations
function updateLeaderCells() {
    const selectedSector = document.getElementById('leaderSector').value;
    const cellSelect = document.getElementById('leaderCell');
    const villageSelect = document.getElementById('leaderVillage');
    
    // Reset and disable dependent selects
    cellSelect.innerHTML = '<option value="">Select your cell</option>';
    cellSelect.disabled = !selectedSector;
    
    villageSelect.innerHTML = '<option value="">Select your village</option>';
    villageSelect.disabled = true;
    
    if (!selectedSector) return;
    
    // Get locations from system and member records
    const locations = JSON.parse(localStorage.getItem('systemLocations')) || { sectors: [], cells: [], villages: [] };
    const memberRecords = JSON.parse(localStorage.getItem('registerRecords')) || [];
    
    // Combine system cells with member cells for selected sector
    const memberCells = [...new Set(memberRecords
        .filter(r => r.sector === selectedSector)
        .map(r => r.cell)
        .filter(c => c)
    )];
    const allCells = [...new Set([...locations.cells, ...memberCells])];
    
    cellSelect.innerHTML = '<option value="">Select your cell</option>' +
        allCells.map(cell => `<option value="${cell}">${cell}</option>`).join('');
    
    // Restore selected value if it exists
    const currentLocation = currentLeaderLocation;
    if (currentLocation && currentLocation.cell && currentLocation.sector === selectedSector) {
        cellSelect.value = currentLocation.cell;
    }
}

// Leader Location Selection Functions
let currentLeaderLocation = null;

// Initialize leader location selection
function initializeLeaderLocationSelection() {
    loadSectorsForLeader();
}

// Load sectors for leader selection
function loadSectorsForLeader() {
    const locations = JSON.parse(localStorage.getItem('systemLocations')) || initializeDefaultLocations();
    const memberRecords = JSON.parse(localStorage.getItem('registerRecords')) || [];
    
    // Combine system sectors with member sectors
    const memberSectors = [...new Set(memberRecords.map(r => r.sector).filter(s => s))];
    const allSectors = [...new Set([...locations.sectors, ...memberSectors])];
    
    const sectorSelect = document.getElementById('leaderSector');
    sectorSelect.innerHTML = '<option value="">Select your sector</option>' +
        allSectors.map(sector => `<option value="${sector}">${sector}</option>`).join('');
    
    // Restore selected value if it exists
    const currentLocation = currentLeaderLocation;
    if (currentLocation && currentLocation.sector) {
        sectorSelect.value = currentLocation.sector;
    }
}

// Update cells based on selected sector
function updateLeaderCells() {
    const selectedSector = document.getElementById('leaderSector').value;
    const cellSelect = document.getElementById('leaderCell');
    const villageSelect = document.getElementById('leaderVillage');
    
    // Reset and disable dependent selects
    cellSelect.innerHTML = '<option value="">Select your cell</option>';
    cellSelect.disabled = !selectedSector;
    
    villageSelect.innerHTML = '<option value="">Select your village</option>';
    villageSelect.disabled = true;
    
    if (!selectedSector) return;
    
    // Load cells for selected sector
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const cells = [...new Set(records
        .filter(r => r.sector === selectedSector)
        .map(r => r.cell)
        .filter(c => c)
    )];
    
    cellSelect.innerHTML = '<option value="">Select your cell</option>' +
        cells.map(cell => `<option value="${cell}">${cell}</option>`).join('');
}

// Update villages based on selected cell
function updateLeaderVillages() {
    const selectedSector = document.getElementById('leaderSector').value;
    const selectedCell = document.getElementById('leaderCell').value;
    const villageSelect = document.getElementById('leaderVillage');
    
    // Reset village select
    villageSelect.innerHTML = '<option value="">Select your village</option>';
    villageSelect.disabled = !selectedCell;
    
    if (!selectedSector || !selectedCell) return;
    
    // Load villages for selected sector and cell
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const villages = [...new Set(records
        .filter(r => r.sector === selectedSector && r.cell === selectedCell)
        .map(r => r.village)
        .filter(v => v)
    )];
    
    villageSelect.innerHTML = '<option value="">Select your village</option>' +
        villages.map(village => `<option value="${village}">${village}</option>`).join('');
}

// Confirm leader location
function confirmLeaderLocation() {
    const sector = document.getElementById('leaderSector').value;
    const cell = document.getElementById('leaderCell').value;
    const village = document.getElementById('leaderVillage').value;
    
    if (!sector || !cell || !village) {
        showNotification('Please select all location fields (Sector, Cell, and Village)', 'error');
        return;
    }
    
    // Store current leader location
    currentLeaderLocation = {
        sector: sector,
        cell: cell,
        village: village
    };
    
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
                    <input type="text" class="attendance-notes" id="notes-${record.telephone}" placeholder="Add notes...">
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
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const tbody = document.getElementById('attendanceTableBody');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No registered members found</td></tr>';
        return;
    }
    
    // Set today's date as default and make it readonly
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    dateInput.value = today;
    dateInput.readOnly = true;
    dateInput.style.backgroundColor = '#f8f9fa';
    dateInput.style.cursor = 'not-allowed';
    
    tbody.innerHTML = records.map((record, index) => {
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
                    <input type="text" class="attendance-notes" id="notes-${record.telephone}" placeholder="Add notes...">
                </td>
            </tr>
        `;
    }).join('');
    
    updateAttendanceSummary();
}

// Mark individual member attendance
function markMemberAttendance(memberId, status, index) {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const member = records[index];
    
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
    tempAttendance[memberId] = {
        status: status,
        name: member.name,
        notes: document.getElementById(`notes-${memberId}`).value,
        timestamp: new Date().toISOString()
    };
    sessionStorage.setItem('tempAttendance', JSON.stringify(tempAttendance));
    
    updateAttendanceSummary();
}

// Mark all members as present
function markAllPresent() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const allPresentAttendance = {};
    
    records.forEach((record, index) => {
        const row = document.querySelector(`tr[data-member-id="${record.telephone}"]`);
        if (row) {
            const buttons = row.querySelectorAll('.status-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            buttons[0].classList.add('active'); // Present button
        }
        
        allPresentAttendance[record.telephone] = {
            status: 'present',
            name: record.name,
            notes: document.getElementById(`notes-${record.telephone}`).value,
            timestamp: new Date().toISOString()
        };
    });
    
    sessionStorage.setItem('tempAttendance', JSON.stringify(allPresentAttendance));
    updateAttendanceSummary();
    
    showNotification(`All ${records.length} members marked as present`, 'success');
}

// Mark all members as absent
function markAllAbsent() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const allAbsentAttendance = {};
    
    records.forEach((record, index) => {
        const row = document.querySelector(`tr[data-member-id="${record.telephone}"]`);
        if (row) {
            const buttons = row.querySelectorAll('.status-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            buttons[1].classList.add('active'); // Absent button
        }
        
        allAbsentAttendance[record.telephone] = {
            status: 'absent',
            name: record.name,
            notes: document.getElementById(`notes-${record.telephone}`).value,
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
    
    const presentCount = Object.values(tempAttendance).filter(a => a.status === 'present').length;
    const absentCount = Object.values(tempAttendance).filter(a => a.status === 'absent').length;
    
    document.getElementById('totalMembersCount').textContent = records.length;
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
}

// Save attendance to localStorage
function saveAttendance() {
    const currentAttendance = JSON.parse(sessionStorage.getItem('tempAttendance')) || {};
    
    // Use today's date automatically
    const attendanceDate = new Date().toISOString().split('T')[0];
    
    if (Object.keys(currentAttendance).length === 0) {
        alert('Please mark attendance for at least one member');
        return;
    }
    
    // Get existing attendance records
    let umugandaData = JSON.parse(localStorage.getItem('umugandaData')) || [];
    
    // Convert temp attendance to permanent records
    Object.entries(currentAttendance).forEach(([memberId, attendance]) => {
        const memberRecord = JSON.parse(localStorage.getItem('registerRecords')) || []
            .find(r => r.telephone === memberId);
        
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
                notes: attendance.notes,
                attendanceDate: attendanceDate // Add date field for easy filtering
            };
            
            // Check if attendance already exists for this date and member
            const existingIndex = umugandaData.findIndex(r => 
                r.citizenId === memberId && 
                r.date.split('T')[0] === attendanceDate.split('T')[0]
            );
            
            if (existingIndex !== -1) {
                umugandaData[existingIndex] = attendanceRecord;
            } else {
                umugandaData.push(attendanceRecord);
            }
            
            // Update attendance tracking
            if (attendance.status === 'present') {
                updateAttendanceTracking(memberId, attendance.name);
            }
        }
    });
    
    // Save to localStorage
    localStorage.setItem('umugandaData', JSON.stringify(umugandaData));
    
    // Clear temporary attendance
    sessionStorage.removeItem('tempAttendance');
    
    // Refresh tables and statistics
    loadUmugandaTable();
    loadRegisterTable();
    updateAttendanceStatistics();
    updateVillageSectorStatistics();
    
    const attendanceCount = Object.keys(currentAttendance).length;
    showNotification(`Attendance saved for ${attendanceCount} members on ${attendanceDate}!`, 'success');
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
                    <input type="text" class="attendance-notes" id="notes-${record.telephone}" placeholder="Add notes...">
                </td>
            </tr>
        `;
    }).join('');
}

// Update village and sector statistics
function updateVillageSectorStatistics() {
    const villageStats = calculateVillageStatistics();
    const sectorStats = calculateSectorStatistics();
    
    // Update village statistics
    updateVillageDisplay(villageStats);
    drawVillageChart(villageStats);
    
    // Update sector statistics
    updateSectorDisplay(sectorStats);
    drawSectorChart(sectorStats);
}

// Calculate village statistics
function calculateVillageStatistics() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const attendanceRecords = JSON.parse(localStorage.getItem('umugandaData')) || [];
    
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

// Calculate sector statistics
function calculateSectorStatistics() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const attendanceRecords = JSON.parse(localStorage.getItem('umugandaData')) || [];
    
    // Group members by sector
    const sectorGroups = {};
    records.forEach(member => {
        if (!sectorGroups[member.sector]) {
            sectorGroups[member.sector] = {
                members: [],
                present: 0,
                absent: 0
            };
        }
        sectorGroups[member.sector].members.push(member);
    });
    
    // Calculate attendance for each sector
    Object.keys(sectorGroups).forEach(sector => {
        const sectorMembers = sectorGroups[sector].members;
        
        attendanceRecords.forEach(attendance => {
            const member = sectorMembers.find(m => m.telephone === attendance.citizenId);
            if (member) {
                if (attendance.status === 'present') {
                    sectorGroups[sector].present++;
                } else {
                    sectorGroups[sector].absent++;
                }
            }
        });
    });
    
    // Convert to array and calculate percentages
    const sectorStats = Object.entries(sectorGroups).map(([sector, data]) => {
        const total = data.present + data.absent;
        const percentage = total > 0 ? Math.round((data.present / total) * 100) : 0;
        
        return {
            name: sector,
            totalMembers: data.members.length,
            present: data.present,
            absent: data.absent,
            percentage: percentage
        };
    });
    
    // Sort by percentage (highest first)
    return sectorStats.sort((a, b) => b.percentage - a.percentage);
}

// Update village display
function updateVillageDisplay(villageStats) {
    const detailsContainer = document.getElementById('villageDetails');
    
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
    
    if (sectorStats.length === 0) {
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
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (villageStats.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No village data available', width / 2, height / 2);
        return;
    }
    
    // Prepare data
    const maxPercentage = Math.max(...villageStats.map(v => v.percentage), 1);
    const barWidth = width / (villageStats.length * 2);
    const chartHeight = height - 60;
    const chartTop = 40;
    
    // Draw bars
    villageStats.forEach((village, index) => {
        const barHeight = (village.percentage / maxPercentage) * chartHeight;
        const x = (index * 2 + 0.5) * barWidth;
        const y = chartTop + chartHeight - barHeight;
        
        // Draw bar
        const color = village.percentage >= 80 ? '#28a745' : 
                     village.percentage >= 50 ? '#fd7e14' : 
                     village.percentage > 0 ? '#ffc107' : '#dc3545';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw percentage on top
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${village.percentage}%`, x + barWidth / 2, y - 5);
        
        // Draw village name below
        ctx.save();
        ctx.translate(x + barWidth / 2, height - 5);
        ctx.rotate(-Math.PI / 6);
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(village.name, 0, 0);
        ctx.restore();
    });
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Village Attendance Rates', width / 2, 20);
}

// Draw sector chart
function drawSectorChart(sectorStats) {
    const canvas = document.getElementById('sectorChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    if (sectorStats.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No sector data available', width / 2, height / 2);
        return;
    }
    
    // Prepare data
    const maxPercentage = Math.max(...sectorStats.map(s => s.percentage), 1);
    const barWidth = width / (sectorStats.length * 2);
    const chartHeight = height - 60;
    const chartTop = 40;
    
    // Draw bars
    sectorStats.forEach((sector, index) => {
        const barHeight = (sector.percentage / maxPercentage) * chartHeight;
        const x = (index * 2 + 0.5) * barWidth;
        const y = chartTop + chartHeight - barHeight;
        
        // Draw bar
        const color = sector.percentage >= 80 ? '#28a745' : 
                     sector.percentage >= 50 ? '#fd7e14' : 
                     sector.percentage > 0 ? '#ffc107' : '#dc3545';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw percentage on top
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${sector.percentage}%`, x + barWidth / 2, y - 5);
        
        // Draw sector name below
        ctx.save();
        ctx.translate(x + barWidth / 2, height - 5);
        ctx.rotate(-Math.PI / 6);
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(sector.name, 0, 0);
        ctx.restore();
    });
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sector Attendance Rates', width / 2, 20);
}

// Update sector and village filters
function updateSectorVillageFilters() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    
    // Get unique sectors and villages
    const sectors = [...new Set(records.map(r => r.sector).filter(s => s))];
    const villages = [...new Set(records.map(r => r.village).filter(v => v))];
    
    // Update sector filter
    const sectorSelect = document.getElementById('filterSector');
    const currentSectorValue = sectorSelect.value;
    sectorSelect.innerHTML = '<option value="">All Sectors</option>' +
        sectors.map(sector => `<option value="${sector}">${sector}</option>`).join('');
    sectorSelect.value = currentSectorValue;
    
    // Update village filter
    const villageSelect = document.getElementById('filterVillage');
    const currentVillageValue = villageSelect.value;
    villageSelect.innerHTML = '<option value="">All Villages</option>' +
        villages.map(village => `<option value="${village}">${village}</option>`).join('');
    villageSelect.value = currentVillageValue;
}

// Calculate attendance statistics
function calculateAttendanceStatistics() {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const attendanceTracking = JSON.parse(localStorage.getItem('attendanceTracking')) || {};
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const records1 = JSON.parse(localStorage.getItem('umugandaRecords')) || [];
    const records2 = JSON.parse(localStorage.getItem('umugandaData')) || [];
    const allRecords = [...records1, ...records2];
    
    const todayAttendance = allRecords.filter(record => 
        record.date && record.date.split('T')[0] === today
    );
    
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
    const presentToday = todayAttendance.length;
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

// Get attendance category based on percentage
function getAttendanceCategory(percentage) {
    if (percentage === 0) return 'none';
    if (percentage < 50) return 'poor';
    if (percentage < 80) return 'good';
    return 'excellent';
}

// Update statistics display
function updateAttendanceStatistics() {
    const stats = calculateAttendanceStatistics();
    
    // Update stat cards
    document.getElementById('overallAttendanceRate').textContent = stats.overallRate + '%';
    document.getElementById('totalMembers').textContent = stats.totalMembers;
    document.getElementById('presentToday').textContent = stats.presentToday;
    document.getElementById('absentToday').textContent = stats.absentToday;
    
    // Update progress bar
    const progressFill = document.getElementById('attendanceProgress');
    progressFill.style.width = stats.overallRate + '%';
    
    // Update category counts and bars
    updateCategoryStats('excellent', stats.categories.excellent, stats.totalMembers);
    updateCategoryStats('good', stats.categories.good, stats.totalMembers);
    updateCategoryStats('poor', stats.categories.poor, stats.totalMembers);
    updateCategoryStats('none', stats.categories.none, stats.totalMembers);
    
    // Draw bar chart
    drawAttendanceChart(stats);
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
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Chart data
    const data = [
        { label: 'Excellent (80-100%)', value: stats.categories.excellent, color: '#28a745' },
        { label: 'Good (50-79%)', value: stats.categories.good, color: '#fd7e14' },
        { label: 'Poor (1-49%)', value: stats.categories.poor, color: '#ffc107' },
        { label: 'None (0%)', value: stats.categories.none, color: '#dc3545' }
    ];
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barWidth = width / (data.length * 2);
    const chartHeight = height - 60;
    const chartTop = 40;
    
    // Draw bars
    data.forEach((item, index) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = (index * 2 + 0.5) * barWidth;
        const y = chartTop + chartHeight - barHeight;
        
        // Draw bar
        ctx.fillStyle = item.color;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw value on top of bar
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.value, x + barWidth / 2, y - 5);
        
        // Draw label below bar
        ctx.save();
        ctx.translate(x + barWidth / 2, height - 5);
        ctx.rotate(-Math.PI / 6);
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(item.label, 0, 0);
        ctx.restore();
    });
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Attendance Distribution by Category', width / 2, 20);
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
    
    alert('Attendance data exported successfully!');
}

function refreshAnalytics() {
    updateAttendanceStatistics();
    alert('Analytics data refreshed!');
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
function editMemberRecord(index) {
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const record = records[index];
    
    if (!record) {
        alert('Member record not found');
        return;
    }
    
    // Fill form with record data
    document.getElementById('regName').value = record.name || '';
    document.getElementById('regSex').value = record.sex || '';
    document.getElementById('regAge').value = record.age || '';
    document.getElementById('regTelephone').value = record.telephone || '';
    document.getElementById('regID').value = record.idNumber || '';
    document.getElementById('regSector').value = record.sector || '';
    document.getElementById('regCell').value = record.cell || '';
    document.getElementById('regVillage').value = record.village || '';
    document.getElementById('regStatus').value = record.status || '';
    document.getElementById('regArrivalTime').value = record.arrivalTime || '';
    document.getElementById('regReturnTime').value = record.returnTime || '';
    
    // Store editing info
    sessionStorage.setItem('editingMember', JSON.stringify({
        index: index,
        id: record.id
    }));
    
    // Change button text
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    submitBtn.textContent = 'Update Member';
    submitBtn.classList.remove('btn-primary');
    submitBtn.classList.add('btn-warning');
    
    // Scroll to form
    document.getElementById('register').scrollIntoView({ behavior: 'smooth' });
}

function deleteMemberRecord(index) {
    if (!confirm('Are you sure you want to delete this member record?')) {
        return;
    }
    
    const records = JSON.parse(localStorage.getItem('registerRecords')) || [];
    const recordToDelete = records[index];
    
    if (!recordToDelete) {
        alert('Member record not found');
        return;
    }
    
    // Remove from records
    records.splice(index, 1);
    localStorage.setItem('registerRecords', JSON.stringify(records));
    
    // Also remove from face database if exists
    if (faceSystem && recordToDelete.idNumber) {
        const faceRemoved = faceSystem.deleteCitizen(recordToDelete.idNumber);
        if (faceRemoved) {
            console.log(`Face data removed for ${recordToDelete.name}`);
        }
    }
    
    alert('Member record deleted successfully');
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

function loadInsuranceTable() {
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
        reportedBy: (currentUser && currentUser.name) ? currentUser.name : 'Village Leader',
        reportedByEmail: (currentUser && currentUser.email) ? currentUser.email : '',
        reportedByPhone: (currentUser && currentUser.phone) ? currentUser.phone : '',
        date: new Date().toISOString()
    };

    const records = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    records.push(record);
    localStorage.setItem('drugsRecords', JSON.stringify(records));

    e.target.reset();
    loadDrugsTable();
    alert('Drug report sent successfully! Visible on village, cell and sector pages.');
}

function truncateDesc(text, len) {
    if (!text) return '—';
    return text.length <= len ? escapeHtml(text) : escapeHtml(text.slice(0, len)) + '…';
}

function loadDrugsTable() {
    const records = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    const tbody = document.getElementById('drugsTableBody');
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
            <td><button class="btn btn-secondary" onclick="viewDrugsDetails(${record.id})">View details</button></td>
        </tr>
    `).join('');
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
        reportedBy: (currentUser && currentUser.name) ? currentUser.name : 'Village Leader',
        reportedByEmail: (currentUser && currentUser.email) ? currentUser.email : '',
        reportedByPhone: (currentUser && currentUser.phone) ? currentUser.phone : '',
        date: new Date().toISOString()
    };

    const records = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    records.push(record);
    localStorage.setItem('violenceRecords', JSON.stringify(records));

    e.target.reset();
    loadViolenceTable();
    alert('Sexual violence report sent successfully! Visible on village, cell and sector pages.');
}

function loadViolenceTable() {
    const records = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    const tbody = document.getElementById('violenceTableBody');
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
            <td><button class="btn btn-secondary" onclick="viewViolenceDetails(${record.id})">View details</button></td>
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

    function saveReport(imageData) {
        const record = {
            id: Date.now(),
            place: place,
            date: dateVal,
            image: imageData || null,
            description: desc,
            reportedBy: currentUser.name || 'Village Leader',
            reportedByEmail: currentUser.email || '',
            dateReported: new Date().toISOString()
        };

        const records = JSON.parse(localStorage.getItem('infrastructureReports')) || [];
        records.push(record);
        localStorage.setItem('infrastructureReports', JSON.stringify(records));

        e.target.reset();
        loadLeaderInfrastructureTable();
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

function loadLeaderInfrastructureTable() {
    const records = JSON.parse(localStorage.getItem('infrastructureReports')) || [];
    const tbody = document.getElementById('leaderInfrastructureTableBody');
    if (!tbody) return;

    tbody.innerHTML = records.length > 0 ? records.map(r => `
        <tr>
            <td>${escapeHtml(r.place)}</td>
            <td>${formatDate(r.date || r.dateReported)}</td>
            <td>${r.image ? `<img src="${r.image}" alt="img" style="width:100px;height:60px;object-fit:cover;border-radius:4px;" />` : '—'}</td>
            <td>${truncateDesc(r.description, 80)}</td>
            <td>${formatDate(r.dateReported)}</td>
        </tr>
    `).join('') : '<tr><td colspan="5">No reports yet</td></tr>';
}

// Load visitor reports for this leader (filter by leader area when available)
function loadVisitorReports() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};
    const leaderSector = currentUser.sector || currentUser.leaderSector || '';
    const leaderCell = currentUser.cell || currentUser.leaderCell || '';
    const leaderVillage = currentUser.village || currentUser.leaderVillage || '';

    const records = JSON.parse(localStorage.getItem('visitorReports')) || [];
    const tbody = document.getElementById('visitorReportsTableBody');
    if (!tbody) return;

    // If leader area known, filter to visitor reports where host matches leader's area
    let visible = records;
    if (leaderVillage || leaderCell || leaderSector) {
        visible = records.filter(r => (
            (leaderVillage && r.yourVillage && r.yourVillage === leaderVillage) ||
            (leaderCell && r.yourCell && r.yourCell === leaderCell) ||
            (leaderSector && r.yourSector && r.yourSector === leaderSector)
        ));
    }

    // If no leader area specified, show all reports
    tbody.innerHTML = visible.length > 0 ? visible.map(r => `
        <tr>
            <td>${escapeHtml([r.yourSector, r.yourCell, r.yourVillage].filter(Boolean).join(' / '))}</td>
            <td>${escapeHtml(r.visitorNames)}</td>
            <td>${r.visitorCount}</td>
            <td>${escapeHtml([r.fromProvince, r.fromDistrict, r.fromSector, r.fromCell, r.fromVillage].filter(Boolean).join(' / '))}</td>
            <td>${escapeHtml(r.reason || '—')}</td>
            <td>${r.returnDate ? formatDate(r.returnDate) : '—'}</td>
            <td>${escapeHtml(r.reportedBy || '—')}</td>
            <td>${formatDate(r.dateReported)}</td>
        </tr>
    `).join('') : '<tr><td colspan="8">No visitor reports.</td></tr>';
}

// Shift Automate Case
function handleCaseSubmit(e) {
    e.preventDefault();
    
    const resolutionDays = parseInt(document.getElementById('caseResolutionDays').value);
    const caseDate = new Date(document.getElementById('caseDate').value);
    const resolutionDate = new Date(caseDate);
    resolutionDate.setDate(resolutionDate.getDate() + resolutionDays);
    
    const record = {
        id: Date.now(),
        leaderName: document.getElementById('caseLeaderName').value,
        leaderTelephone: document.getElementById('caseLeaderTelephone').value,
        sector: document.getElementById('caseSector').value,
        cell: document.getElementById('caseCell').value,
        village: document.getElementById('caseVillage').value,
        plaintiff: document.getElementById('casePlaintiff').value,
        defendant: document.getElementById('caseDefendant').value,
        description: document.getElementById('caseDescription').value,
        caseDate: caseDate.toISOString(),
        resolutionDays,
        expectedResolutionDate: resolutionDate.toISOString(),
        status: 'Pending',
        level: 'Village',
        date: new Date().toISOString()
    };

    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    records.push(record);
    localStorage.setItem('caseRecords', JSON.stringify(records));

    e.target.reset();
    loadCaseTable();
    alert('Case recorded successfully! The countdown timer has started.');
}

function loadCaseTable() {
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const tbody = document.getElementById('caseTableBody');
    
    tbody.innerHTML = records.map(record => {
        const statusClass = record.status === 'Solved' ? 'status-solved' : 
                           record.status === 'Escalated' ? 'status-escalated' : 'status-pending';
        
        // Calculate countdown
        const countdown = calculateCountdown(record);
        
        return `
            <tr>
                <td>#${record.id}</td>
                <td>${record.plaintiff}</td>
                <td>${record.defendant}</td>
                <td>${record.sector}</td>
                <td>${record.cell}</td>
                <td>${record.village}</td>
                <td><span class="status-badge ${statusClass}">${record.status}</span></td>
                <td>${formatDate(record.caseDate)}</td>
                <td>
                    <div class="countdown-timer" data-case-id="${record.id}" data-resolution-date="${record.expectedResolutionDate}">
                        ${countdown}
                    </div>
                </td>
                <td>
                    ${record.status === 'Pending' ? 
                        `<button class="btn btn-primary" onclick="markCaseSolved(${record.id})">Mark Solved</button>` : 
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
    if (record.status === 'Solved' || record.status === 'Escalated') {
        return '<span class="countdown-expired">N/A</span>';
    }
    
    if (!record.expectedResolutionDate) {
        return '<span class="countdown-error">No date set</span>';
    }
    
    const now = new Date();
    const resolutionDate = new Date(record.expectedResolutionDate);
    const diff = resolutionDate - now;
    
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
    
    // Add warning class if less than 24 hours remaining
    const warningClass = diff < (24 * 60 * 60 * 1000) ? 'countdown-warning' : '';
    
    return `<div class="countdown-display ${warningClass}">${countdownHtml}</div>`;
}

// Start countdown updates
let countdownInterval = null;
function startCountdownUpdates() {
    // Clear existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Update countdown every second
    countdownInterval = setInterval(() => {
        const timers = document.querySelectorAll('.countdown-timer');
        timers.forEach(timer => {
            const caseId = parseInt(timer.dataset.caseId);
            const resolutionDate = timer.dataset.resolutionDate;
            
            // Get record to check status
            const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
            const record = records.find(r => r.id === caseId);
            
            if (record && (record.status === 'Pending')) {
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
                timer.innerHTML = '<span class="countdown-expired">N/A</span>';
            }
        });
    }, 1000); // Update every second
}

// Mark case as solved
window.markCaseSolved = function(caseId) {
    const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
    const record = records.find(r => r.id === caseId);
    
    if (record) {
        record.status = 'Solved';
        record.solvedDate = new Date().toISOString();
        localStorage.setItem('caseRecords', JSON.stringify(records));
        loadCaseTable();
        alert('Case marked as solved! Countdown stopped.');
    }
};

// Case auto-escalation
function setupCaseAutoEscalation() {
    setInterval(() => {
        const records = JSON.parse(localStorage.getItem('caseRecords')) || [];
        const now = new Date();
        let updated = false;
        
        records.forEach(record => {
            if (record.status === 'Pending' && record.level === 'Village') {
                const expectedDate = new Date(record.expectedResolutionDate);
                if (now > expectedDate) {
                    // Auto-escalate from Village to Cell
                    record.status = 'Escalated';
                    record.escalatedDate = now.toISOString();
                    record.level = 'Cell';
                    // Set new resolution date for cell (default 7 days)
                    const cellResolutionDate = new Date(now);
                    cellResolutionDate.setDate(cellResolutionDate.getDate() + 7);
                    record.cellResolutionDate = cellResolutionDate.toISOString();
                    updated = true;
                    console.log(`Case #${record.id} has been automatically escalated to Cell level!`);
                }
            }
        });
        
        if (updated) {
            localStorage.setItem('caseRecords', JSON.stringify(records));
            loadCaseTable(); // Reload table to update countdown
        }
    }, 60000); // Check every minute
}

// Load notifications
function loadNotifications() {
    // Inteko notifications - people who should attend but didn't
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
function loadAllTables() {
    loadUmugandaTable();
    loadIntekoRecords();
    loadRegisterTable();
    loadInsuranceTable();
    loadDrugsTable();
    loadViolenceTable();
    loadInfrastructureTable();
    loadCaseTable();
    loadLeaderHomeUpdatesList();
    
    // Load attendance statistics
    updateAttendanceStatistics();
    updateVillageSectorStatistics();
    updateSectorVillageFilters();
    
    // Initialize leader location selection
    initializeLeaderLocationSelection();
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
window.viewIntekoDetails = function(id) {
    const records = JSON.parse(localStorage.getItem('intekoRecords')) || [];
    const record = records.find(r => r.id === id);
    
    if (record) {
        const details = `
Meeting Title: ${record.meetingTitle}
Type: ${record.meetingType}
Date: ${formatDate(record.meetingDate)}
Chairperson: ${record.chairperson}
Attendees: ${record.attendees.length}
Decisions: ${record.decisions.length}
Status: ${record.minutesStatus}
        `;
        alert(details);
    }
};

window.viewDrugsDetails = function(id) {
    const records = JSON.parse(localStorage.getItem('drugsRecords')) || [];
    const record = records.find(r => r.id === id);
    if (record) {
        const details = `Name(s): ${record.name}\nLocation: ${record.village}, ${record.cell}, ${record.sector}\nReported by: ${record.reportedBy || '—'}\nDescription: ${record.description || '—'}\nDate: ${formatDate(record.date)}`;
        alert(details);
    }
};

window.viewViolenceDetails = function(id) {
    const records = JSON.parse(localStorage.getItem('violenceRecords')) || [];
    const record = records.find(r => r.id === id);
    
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
function loadLeaderChatMessages() {
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
function loadLeaderInbox() {
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
window.replyToCitizenFromLeader = function(email, name) {
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
    loadLeaderHomeUpdatesList();
    alert('Recent activity posted! It will appear on the home page.');
}

function handleLeaderUpcomingSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('leaderUpcomingTitle').value.trim();
    const description = document.getElementById('leaderUpcomingDesc').value.trim();
    const place = document.getElementById('leaderUpcomingPlace').value.trim();
    const date = document.getElementById('leaderUpcomingDate').value;
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

function handleLeaderTrendingSubmit(e) {
    e.preventDefault();
    const description = document.getElementById('leaderTrendingDesc').value.trim();
    const place = document.getElementById('leaderTrendingPlace').value.trim();
    const date = document.getElementById('leaderTrendingDate').value;
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

function loadLeaderHomeUpdatesList() {
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
        console.error('Face recognition controls not found');
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
        console.error('Face registration controls not found');
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
    const attendance = {
        name: citizen.name,
        age: citizen.age,
        sex: citizen.sex,
        sector: citizen.sector,
        cell: citizen.cell,
        village: citizen.village,
        date: new Date().toISOString(),
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
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `face_database_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        alert('Face database exported successfully!');
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export face database. Check console for details.');
    }
}