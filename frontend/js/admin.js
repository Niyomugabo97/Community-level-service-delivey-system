'use strict';

const API = 'https://backen-community-level-servece-delivery-system-production.up.railway.app/api/admin';
let allUsers = [];
let userDataMap = {};
let selectedUserId = null;
let deleteUserId = null;

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('adminToken');
  if (token) verifyAndLoad(token);

  document.getElementById('adminLoginForm').addEventListener('submit', handleLogin);
  document.getElementById('adminSignupForm').addEventListener('submit', handleSignup);

  document.getElementById('togglePassword').addEventListener('click', () => {
    const pw = document.getElementById('adminPassword');
    const icon = document.querySelector('#togglePassword i');
    if (pw.type === 'password') { pw.type = 'text'; icon.className = 'fas fa-eye-slash'; }
    else { pw.type = 'password'; icon.className = 'fas fa-eye'; }
  });

  document.getElementById('toggleSignupPassword').addEventListener('click', () => {
    const pw = document.getElementById('signupPassword');
    const icon = document.querySelector('#toggleSignupPassword i');
    if (pw.type === 'password') { pw.type = 'text'; icon.className = 'fas fa-eye-slash'; }
    else { pw.type = 'password'; icon.className = 'fas fa-eye'; }
  });

  document.getElementById('adminLogout').addEventListener('click', handleLogout);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); switchSection(item.dataset.section); });
  });

  document.getElementById('userSearch').addEventListener('input', filterUsers);
  document.getElementById('roleFilter').addEventListener('change', filterUsers);
});

// ─── AUTH ─────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const btn      = e.target.querySelector('.login-btn');
  const errDiv   = document.getElementById('loginError');

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
  btn.disabled = true;
  errDiv.style.display = 'none';

  try {
    const res  = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUser', JSON.stringify(data.user));
    showDashboard(data.user);
  } catch (err) {
    errDiv.textContent = err.message;
    errDiv.style.display = 'block';
    btn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
    btn.disabled = false;
  }
}

async function verifyAndLoad(token) {
  try {
    const res = await fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { localStorage.removeItem('adminToken'); return; }
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    showDashboard(adminUser);
  } catch { /* stay on login */ }
}

function showDashboard(user) {
  document.getElementById('adminLoginSection').style.display = 'none';
  document.getElementById('adminDashboard').style.display   = 'flex';
  if (user && user.name) document.getElementById('adminName').textContent = user.name;
  loadStats();
  loadUsers();
}

function handleLogout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  document.getElementById('adminLoginSection').style.display = 'flex';
  document.getElementById('adminDashboard').style.display   = 'none';
  showLogin();
}

function showSignup() {
  document.getElementById('loginView').style.display  = 'none';
  document.getElementById('signupView').style.display = 'block';
  document.getElementById('authTitle').textContent    = 'Create Admin Account';
  document.getElementById('signupError').style.display = 'none';
  document.getElementById('adminSignupForm').reset();
}

function showLogin() {
  document.getElementById('signupView').style.display = 'none';
  document.getElementById('loginView').style.display  = 'block';
  document.getElementById('authTitle').textContent    = 'Admin Portal';
  document.getElementById('loginError').style.display = 'none';
}

async function handleSignup(e) {
  e.preventDefault();
  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm  = document.getElementById('signupConfirm').value;
  const btn      = e.target.querySelector('.login-btn');
  const errDiv   = document.getElementById('signupError');

  errDiv.style.display = 'none';

  if (password !== confirm) {
    errDiv.textContent = 'Passwords do not match.';
    errDiv.style.display = 'block';
    return;
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…';
  btn.disabled = true;

  try {
    const res  = await fetch(`${API}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Signup failed');

    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUser', JSON.stringify(data.user));
    showDashboard(data.user);
  } catch (err) {
    errDiv.textContent = err.message;
    errDiv.style.display = 'block';
    btn.innerHTML = '<span>Create Account</span><i class="fas fa-user-plus"></i>';
    btn.disabled = false;
  }
}

// ─── NAVIGATION ───────────────────────────────────────────
function switchSection(section) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-section="${section}"]`).classList.add('active');

  const titles = { overview: 'Dashboard Overview', users: 'User Management', reports: 'System Reports', analytics: 'Analytics Dashboard', announcements: 'Announcements' };
  document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';

  document.getElementById('overviewSection').style.display       = section === 'overview'      ? 'block' : 'none';
  document.getElementById('usersSection').style.display          = section === 'users'         ? 'block' : 'none';
  document.getElementById('reportsSection').style.display        = section === 'reports'       ? 'block' : 'none';
  document.getElementById('analyticsSection').style.display      = section === 'analytics'     ? 'block' : 'none';
  document.getElementById('announcementsSection').style.display  = section === 'announcements' ? 'block' : 'none';

  if (section === 'users')         loadUsers();
  if (section === 'reports')       loadStats();
  if (section === 'analytics')     initAnalytics();
  if (section === 'announcements') loadAnnouncements();
}

let _analyticsInstance = null;
function initAnalytics() {
  if (!_analyticsInstance && typeof AnalyticsPage !== 'undefined') {
    _analyticsInstance = new AnalyticsPage();
  }
}

// ─── STATS ────────────────────────────────────────────────
async function loadStats() {
  const token = localStorage.getItem('adminToken');
  try {
    const res  = await fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const d = await res.json();

    setText('totalUsers',       d.users.total);
    setText('totalCitizens',    d.users.citizens);
    setText('totalLeaders',     d.users.leaders);
    setText('totalCellLeaders', d.users.cells);
    setText('totalSectorLeaders', d.users.sectors);
    setText('totalReports',     d.reports.citizen + d.reports.leader);
    setText('citizenReportsCount', d.reports.citizen);
    setText('leaderReportsCount',  d.reports.leader);
    setText('membersCount',        d.members);

    const total = d.users.total || 1;
    const dist  = [
      { label: 'Citizens',        count: d.users.citizens, color: '#1d4ed8' },
      { label: 'Village Leaders', count: d.users.leaders,  color: '#ea580c' },
      { label: 'Cell Leaders',    count: d.users.cells,    color: '#7c3aed' },
      { label: 'Sector Leaders',  count: d.users.sectors,  color: '#0f766e' },
      { label: 'Schools',         count: d.users.schools,  color: '#854d0e' },
    ];
    document.getElementById('roleDistribution').innerHTML = dist.map(r => `
      <div class="role-bar-item">
        <span class="role-bar-label">${r.label}</span>
        <div class="role-bar-track">
          <div class="role-bar-fill" style="width:${Math.round((r.count / total) * 100)}%;background:${r.color}"></div>
        </div>
        <span class="role-bar-count">${r.count}</span>
      </div>`).join('');
  } catch { /* ignore */ }
}

// ─── USERS ────────────────────────────────────────────────
async function loadUsers() {
  const token = localStorage.getItem('adminToken');
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = `<tr><td colspan="8" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Loading users…</td></tr>`;

  try {
    const res = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to load users');
    allUsers = await res.json();
    userDataMap = {};
    allUsers.forEach(u => { userDataMap[u._id] = u; });
    renderUsers(allUsers);
    renderRecentUsers(allUsers.slice(0, 5));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:#dc2626">${err.message}</td></tr>`;
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No users found</td></tr>';
    return;
  }
  tbody.innerHTML = users.map((u, i) => {
    const loc  = [u.sector, u.cell, u.village].filter(Boolean).join(', ') || '—';
    const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—';
    return `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="user-initials">${initials(u.name)}</div>
          <strong>${esc(u.name)}</strong>
        </div>
      </td>
      <td>${esc(u.email)}</td>
      <td>${esc(u.telephone || '—')}</td>
      <td style="font-size:0.82rem;color:#666">${esc(loc)}</td>
      <td>${roleBadge(u.userType)}</td>
      <td style="font-size:0.82rem;color:#666">${date}</td>
      <td>
        <div class="action-btns">
          <button class="btn-role" data-uid="${u._id}" onclick="openRoleModal(this.dataset.uid)">
            <i class="fas fa-user-cog"></i> Role
          </button>
          <button class="btn-del" data-uid="${u._id}" onclick="openDeleteModal(this.dataset.uid)">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderRecentUsers(users) {
  const el = document.getElementById('recentUsersList');
  if (!users.length) { el.innerHTML = '<p class="loading-text">No users registered yet</p>'; return; }
  el.innerHTML = users.map(u => `
    <div class="recent-user-item">
      <div class="recent-user-avatar">${initials(u.name)}</div>
      <div class="recent-user-info">
        <strong>${esc(u.name)}</strong>
        <small>${esc(u.email)}</small>
      </div>
      ${roleBadge(u.userType, true)}
    </div>`).join('');
}

function filterUsers() {
  const q    = document.getElementById('userSearch').value.toLowerCase();
  const role = document.getElementById('roleFilter').value;
  const list = allUsers.filter(u => {
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.telephone||'').includes(q);
    const matchR = !role || normalizeRole(u.userType) === role;
    return matchQ && matchR;
  });
  renderUsers(list);
}

// ─── ROLE MODAL ───────────────────────────────────────────
function openRoleModal(userId) {
  const u = userDataMap[userId];
  if (!u) return;
  selectedUserId = userId;
  document.getElementById('modalUserName').textContent = u.name;
  const norm = normalizeRole(u.userType);
  document.querySelectorAll('input[name="newRole"]').forEach(r => { r.checked = (r.value === norm); });
  document.getElementById('roleModal').style.display = 'flex';
}

function closeRoleModal() {
  document.getElementById('roleModal').style.display = 'none';
  selectedUserId = null;
}

async function confirmRoleChange() {
  const sel = document.querySelector('input[name="newRole"]:checked');
  if (!sel) { showToast('Please select a role', 'error'); return; }

  const token = localStorage.getItem('adminToken');
  try {
    const res = await fetch(`${API}/users/${selectedUserId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: sel.value })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to update role');
    closeRoleModal();
    showToast('User role updated successfully', 'success');
    loadUsers();
    loadStats();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── DELETE MODAL ─────────────────────────────────────────
function openDeleteModal(userId) {
  const u = userDataMap[userId];
  if (!u) return;
  deleteUserId = userId;
  document.getElementById('deleteUserName').textContent = u.name;
  document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  deleteUserId = null;
}

async function confirmDelete() {
  const token = localStorage.getItem('adminToken');
  try {
    const res = await fetch(`${API}/users/${deleteUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to delete user');
    closeDeleteModal();
    showToast('User deleted successfully', 'success');
    loadUsers();
    loadStats();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── CREATE ACCOUNT MODAL ─────────────────────────────────
function openCreateModal() {
  document.getElementById('createUserForm').reset();
  document.getElementById('createUserError').style.display = 'none';
  document.getElementById('createModal').style.display = 'flex';
}

function closeCreateModal() {
  document.getElementById('createModal').style.display = 'none';
}

async function submitCreateUser() {
  const errDiv = document.getElementById('createUserError');
  errDiv.style.display = 'none';

  const name      = document.getElementById('newUserName').value.trim();
  const email     = document.getElementById('newUserEmail').value.trim();
  const password  = document.getElementById('newUserPassword').value;
  const telephone = document.getElementById('newUserTelephone').value.trim();
  const userType  = document.getElementById('newUserType').value;
  const sector    = document.getElementById('newUserSector').value.trim();
  const cell      = document.getElementById('newUserCell').value.trim();
  const village   = document.getElementById('newUserVillage').value.trim();

  if (!name || !email || !password) {
    errDiv.textContent = 'Name, email, and password are required.';
    errDiv.style.display = 'block';
    return;
  }

  const token = localStorage.getItem('adminToken');
  try {
    const res = await fetch(`${API}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email, password, telephone, userType, sector, cell, village })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to create account');
    closeCreateModal();
    showToast(`Account for ${name} created successfully`, 'success');
    loadUsers();
    loadStats();
  } catch (err) {
    errDiv.textContent = err.message;
    errDiv.style.display = 'block';
  }
}

// ─── HELPERS ──────────────────────────────────────────────
async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Server error (${res.status}) — please restart the backend server`); }
}

function normalizeRole(userType) {
  const map = { leader: 'leader', cell: 'cell', sector: 'sector', school: 'school', citizen: 'citizen' };
  return map[userType] || 'citizen';
}

function roleBadge(userType, small = false) {
  const map = {
    leader: { label: 'Village Leader', icon: 'fa-user-tie',      cls: 'leader'  },
    cell:   { label: 'Cell Leader',    icon: 'fa-building',       cls: 'cell'    },
    sector: { label: 'Sector Leader',  icon: 'fa-map-marked-alt', cls: 'sector'  },
    school: { label: 'School',         icon: 'fa-school',         cls: 'school'  },
  };
  const r   = map[userType] || { label: 'Citizen', icon: 'fa-user', cls: 'citizen' };
  const cls = small ? 'role-badge-small' : 'role-badge';
  return `<span class="${cls} ${r.cls}"><i class="fas ${r.icon}"></i> ${r.label}</span>`;
}

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str || '')));
  return d.innerHTML;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function showToast(msg, type = 'info') {
  let c = document.querySelector('.toast-container');
  if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(110%)'; setTimeout(() => t.remove(), 320); }, 3200);
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────
const ANN_API = '/api/announcements';

async function loadAnnouncements() {
  const listEl = document.getElementById('annList');
  listEl.innerHTML = '<div class="ann-loading"><i class="fas fa-spinner fa-spin"></i> Loading…</div>';
  try {
    const res  = await fetch(ANN_API);
    const data = await res.json();
    if (!data.length) {
      listEl.innerHTML = '<div class="ann-empty"><i class="fas fa-bullhorn"></i><p>No announcements yet.</p></div>';
      return;
    }
    listEl.innerHTML = data.map(a => `
      <div class="ann-item ${a.priority === 'urgent' ? 'ann-urgent' : ''}">
        <div class="ann-item-header">
          <div class="ann-item-meta">
            ${a.priority === 'urgent' ? '<span class="ann-badge urgent"><i class="fas fa-exclamation-circle"></i> Urgent</span>' : '<span class="ann-badge normal"><i class="fas fa-info-circle"></i> Normal</span>'}
            <span class="ann-item-title">${esc(a.title)}</span>
          </div>
          <div class="ann-item-actions">
            <span class="ann-item-date">${new Date(a.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
            <button class="ann-delete-btn" onclick="deleteAnnouncement('${a._id}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <p class="ann-item-body">${esc(a.message)}</p>
      </div>`).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="ann-empty" style="color:#dc2626"><i class="fas fa-exclamation-circle"></i><p>${err.message}</p></div>`;
  }
}

async function sendAnnouncement() {
  const title    = document.getElementById('annTitle').value.trim();
  const message  = document.getElementById('annMessage').value.trim();
  const priority = document.getElementById('annPriority').value;
  const msgEl    = document.getElementById('annFormMsg');
  const token    = localStorage.getItem('adminToken');

  msgEl.style.display = 'none';

  if (!title || !message) {
    msgEl.textContent = 'Please enter both a title and a message.';
    msgEl.className = 'ann-msg ann-msg-error';
    msgEl.style.display = 'block';
    return;
  }

  const btn = document.querySelector('.ann-send-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';

  try {
    const res  = await fetch(ANN_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ title, message, priority })
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to send');

    document.getElementById('annTitle').value   = '';
    document.getElementById('annMessage').value = '';
    document.getElementById('annCharCount').textContent = '0 / 1000';
    msgEl.textContent = 'Announcement sent successfully!';
    msgEl.className = 'ann-msg ann-msg-success';
    msgEl.style.display = 'block';
    setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
    loadAnnouncements();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className = 'ann-msg ann-msg-error';
    msgEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Announcement';
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;
  const token = localStorage.getItem('adminToken');
  try {
    const res = await fetch(`${ANN_API}/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Delete failed');
    showToast('Announcement deleted', 'success');
    loadAnnouncements();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Character counter for announcement textarea
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('input', e => {
    if (e.target.id === 'annMessage') {
      document.getElementById('annCharCount').textContent = `${e.target.value.length} / 1000`;
    }
  });
});
