// Authentication - Tab switching and form handling

document.addEventListener('DOMContentLoaded', () => {
    initAuthPage();
});

function initAuthPage() {
    setupTabSwitching();
    handleQueryParams();
    setupFormValidation();
    setupUserTypeFields();
}

// Tab Switching
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabSwitches = document.querySelectorAll('.tab-switch');

    // Tab button clicks
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab, tabButtons, loginForm, signupForm);
        });
    });

    // Tab switch links (in footer text)
    tabSwitches.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = btn.dataset.tab;
            switchTab(tab, tabButtons, loginForm, signupForm);
        });
    });
}

function switchTab(tab, tabButtons, loginForm, signupForm) {
    tabButtons.forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        window.history.replaceState({}, '', 'auth.html');
    } else if (tab === 'signup') {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        window.history.replaceState({}, '', 'auth.html?tab=signup');
    }
}

// Handle query parameters (e.g., auth.html?tab=signup)
function handleQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');

    if (tab === 'signup') {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        switchTab('signup', tabButtons, loginForm, signupForm);
    }
}

// User Type Selection - Show/Hide Fields
function setupUserTypeFields() {
    const signupUserType = document.getElementById('signupUserType');
    const locationFields = document.getElementById('locationFields');

    if (!signupUserType) return;

    signupUserType.addEventListener('change', () => {
        const t = signupUserType.value;
        if (locationFields) {
            locationFields.style.display = ['citizen','leader','cell','sector'].includes(t) ? 'block' : 'none';
        }
    });
}

// Form Validation
function setupFormValidation() {
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLoginSubmit();
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSignupSubmit();
        });
    }
}

function handleLoginSubmit() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }

    // Send login request to backend
    const apiUrl = (window.CONFIG && window.CONFIG.API_BASE_URL) ? window.CONFIG.API_BASE_URL : 'https://backen-community-level-servece-delivery-system-production.up.railway.app/api';
    fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showAlert(data.error || 'Invalid credentials', 'error');
            return;
        }

        // store token and user session
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));
        sessionStorage.setItem('token', data.token);

        const user = data.user;
        if (user.userType === 'leader') {
            window.location.href = 'leader-dashboard.html';
        } else if (user.userType === 'cell') {
            window.location.href = 'cell-dashboard.html';
        } else if (user.userType === 'sector') {
            window.location.href = 'sector-dashboard.html';
        } else if (user.userType === 'school') {
            window.location.href = 'school-dashboard.html';
        } else {
            window.location.href = 'citizen-dashboard.html';
        }
    })
    .catch(err => {
        console.error(err);
        showAlert('Login failed. Check console for details.', 'error');
    });
}

function handleSignupSubmit() {
    const fullName = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
    const userType = document.getElementById('signupUserType').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    // Validation
    if (!fullName || !email || !phone || !password || !confirmPassword || !userType) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    if (!agreeTerms) {
        showAlert('Please agree to the terms of service and privacy policy', 'error');
        return;
    }

    // Read the unified location fields
    const sector  = document.getElementById('signupSector')  ? document.getElementById('signupSector').value.trim()  : '';
    const cell    = document.getElementById('signupCell')    ? document.getElementById('signupCell').value.trim()    : '';
    const village = document.getElementById('signupVillage') ? document.getElementById('signupVillage').value.trim() : '';

    // Validate location fields for every role that needs them
    if (userType === 'citizen') {
        if (!sector || !cell || !village) {
            showAlert('Please fill in your Sector, Cell and Village. The system uses this to route your cases to your village leader.', 'error');
            return;
        }
    } else if (userType === 'leader') {
        if (!sector || !cell || !village) {
            showAlert('Please fill in Sector, Cell and Village for your area.', 'error');
            return;
        }
    } else if (userType === 'cell') {
        if (!sector || !cell) {
            showAlert('Please fill in Sector and Cell for your area.', 'error');
            return;
        }
    } else if (userType === 'sector') {
        if (!sector) {
            showAlert('Please fill in your Sector.', 'error');
            return;
        }
    }

    // Build payload — include location for all roles
    const payload = {
        name: fullName,
        email,
        telephone: phone,
        password,
        userType,
        sector,
        cell,
        village
    };

    const apiUrl = (window.CONFIG && window.CONFIG.API_BASE_URL) ? window.CONFIG.API_BASE_URL : 'https://backen-community-level-servece-delivery-system-production.up.railway.app/api';
    fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showAlert(data.error || 'Registration failed', 'error');
            return;
        }

        showAlert('Account created successfully! Redirecting...', 'success');
        // store token and user session
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));
        sessionStorage.setItem('token', data.token);

        // Redirect after a short delay
        setTimeout(() => {
            if (data.user.userType === 'leader') {
                window.location.href = 'leader-dashboard.html';
            } else if (data.user.userType === 'cell') {
                window.location.href = 'cell-dashboard.html';
            } else if (data.user.userType === 'sector') {
                window.location.href = 'sector-dashboard.html';
            } else if (data.user.userType === 'school') {
                window.location.href = 'school-dashboard.html';
            } else {
                window.location.href = 'citizen-dashboard.html';
            }
        }, 800);
    })
    .catch(err => {
        console.error(err);
        showAlert('Registration failed. Check console for details.', 'error');
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidUsername(username) {
    // Simple username validation (alphanumeric and underscore)
    return /^[a-zA-Z0-9_]{3,}$/.test(username);
}

function showAlert(message, type = 'info') {
    // Simple alert - in production, replace with toast notifications
    if (type === 'error') {
        alert('❌ ' + message);
    } else if (type === 'success') {
        alert('✅ ' + message);
    } else {
        alert('ℹ️ ' + message);
    }
}



