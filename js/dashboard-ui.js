/* ============================================================
   dashboard-ui.js — reusable dashboard chrome controller
   Populates the logged-in user (topbar chip, dropdown, sidebar
   card), handles the profile dropdown, mobile drawer + desktop
   collapse, and logout. Works on any dashboard that uses the
   .topbar / .dashboard-sidebar markup. Loaded after the page's
   own dashboard JS so sessionStorage is already populated.
   ============================================================ */
(function () {
    function initials(name, email) {
        const src = ((name || '').trim()) || ((email || '').trim());
        if (!src) return '–';
        const parts = src.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return src.slice(0, 2).toUpperCase();
    }

    function roleLabel(type) {
        return ({
            cell: 'Cell Leader', leader: 'Village Leader', sector: 'Sector Leader',
            citizen: 'Citizen', school: 'School Admin', admin: 'Administrator'
        })[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'User');
    }

    function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

    document.addEventListener('DOMContentLoaded', () => {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const name = user.name || user.email || 'User';
        const role = roleLabel(user.userType || user.role);
        const ini  = initials(user.name, user.email);
        const loc  = [
            user.sector ? user.sector + ' Sector' : null,
            user.cell   ? user.cell   + ' Cell'   : null
        ].filter(Boolean).join('  ›  ') || 'Location not set';

        ['chipAvatar', 'ddAvatar', 'sbAvatar'].forEach(id => setText(id, ini));
        ['chipName', 'ddName', 'sbName'].forEach(id => setText(id, name));
        ['chipRole', 'sbRole'].forEach(id => setText(id, role));
        setText('ddEmail', user.email || '—');
        setText('ddLoc', loc);

        /* ---- user dropdown ---- */
        const chip = document.getElementById('userChipBtn');
        const dd   = document.getElementById('userDropdown');
        if (chip && dd) {
            chip.addEventListener('click', e => {
                e.stopPropagation();
                dd.classList.toggle('open');
                chip.classList.toggle('active');
            });
            document.addEventListener('click', e => {
                if (!e.target.closest('.user-menu')) {
                    dd.classList.remove('open');
                    chip.classList.remove('active');
                }
            });
        }

        /* ---- sidebar drawer (mobile) / collapse (desktop) ---- */
        const sidebar = document.querySelector('.dashboard-sidebar');
        const toggle  = document.getElementById('sidebarToggle');
        const overlay = document.getElementById('sidebarOverlay');
        const isMobile = () => window.innerWidth <= 768;
        const closeDrawer = () => {
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        };

        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                if (isMobile()) {
                    sidebar.classList.toggle('open');
                    if (overlay) overlay.classList.toggle('show');
                } else {
                    sidebar.classList.toggle('collapsed');
                    document.body.classList.toggle('sidebar-collapsed');
                }
            });
        }
        if (overlay) overlay.addEventListener('click', closeDrawer);
        document.querySelectorAll('.dashboard-menu a').forEach(a =>
            a.addEventListener('click', () => { if (isMobile()) closeDrawer(); }));

        /* ---- section shortcut from dropdown (data-go="<section>") ---- */
        document.querySelectorAll('[data-go]').forEach(el =>
            el.addEventListener('click', e => {
                e.preventDefault();
                const target = el.getAttribute('data-go');
                const link = document.querySelector('.dashboard-menu a[data-section="' + target + '"]');
                if (link) link.click();
                if (dd) dd.classList.remove('open');
                if (chip) chip.classList.remove('active');
            }));

        /* ---- logout (any .js-logout trigger) ---- */
        document.querySelectorAll('.js-logout').forEach(el =>
            el.addEventListener('click', e => {
                e.preventDefault();
                sessionStorage.removeItem('currentUser');
                window.location.href = 'auth.html';
            }));

        /* ---- generic My Profile section (citizen/sector/school) ----
           Guarded by #dbProfileName so it never touches the leader/cell
           dashboards, which have their own profile sections. */
        const pName = document.getElementById('dbProfileName');
        if (pName) {
            const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ''; };
            setVal('dbProfileName', user.name);
            setVal('dbProfileEmail', user.email);
            setVal('dbProfileSector', user.sector);
            setVal('dbProfileCell', user.cell);
            setVal('dbProfileVillage', user.village);
            setText('dbProfileCardName', name);
            setText('dbProfileCardRole', role);
            setText('dbProfileAvatar', ini);

            const saveBtn = document.querySelector('.js-profile-save');
            if (saveBtn) {
                saveBtn.addEventListener('click', async e => {
                    e.preventDefault();
                    const sector  = (document.getElementById('dbProfileSector').value  || '').trim();
                    const cell    = (document.getElementById('dbProfileCell').value    || '').trim();
                    const village = (document.getElementById('dbProfileVillage').value || '').trim();
                    const msg = document.querySelector('.js-profile-msg');
                    try {
                        const resp = await fetch('/api/auth/update-profile', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: user.email, sector, cell, village })
                        });
                        if (!resp.ok) throw new Error('Server returned ' + resp.status);
                        const merged = { ...user, sector, cell, village };
                        sessionStorage.setItem('currentUser', JSON.stringify(merged));
                        if (msg) { msg.textContent = 'Saved! Your dashboard will use the updated location.'; msg.style.display = ''; }
                        setText('ddLoc', [sector && sector + ' Sector', cell && cell + ' Cell'].filter(Boolean).join('  ›  ') || 'Location not set');
                    } catch (err) {
                        if (msg) { msg.textContent = 'Could not save: ' + err.message; msg.style.display = ''; msg.classList.add('error'); }
                    }
                });
            }
        }

        /* ---- global helpers so higher levels can confirm receipt ---- */
        window.sendNotification = async function (payload) {
            try {
                const resp = await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                return resp.ok;
            } catch { return false; }
        };

        // Confirm a case/report was received and notify the person who submitted it.
        window.confirmReceived = async function (toEmail, toName, refType, refId, customMsg) {
            if (!toEmail) { alert('This item has no reporter contact on file — cannot notify.'); return false; }
            const u = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            const roleName = ({ cell: 'Cell Leader', leader: 'Village Leader', sector: 'Sector Leader' }[u.userType]) || (u.name || 'A leader');
            const msg = customMsg || `${roleName} confirmed your ${refType || 'submission'} was received and is being handled.`;
            const ok = await window.sendNotification({
                toEmail, toName,
                fromName: u.name || roleName,
                fromRole: u.userType || u.role,
                kind: 'received', refType, refId, message: msg
            });
            alert(ok ? 'The reporter has been notified that their submission was received.'
                     : 'Could not send the notification — please try again.');
            return ok;
        };

        /* ---- notification bell in the topbar (receive side) ---- */
        const topbarRight = document.querySelector('.topbar-right');
        if (topbarRight && user.email) {
            const esc = s => { const d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; };
            const timeAgo = d => {
                const diff = Date.now() - new Date(d).getTime();
                const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dd = Math.floor(diff / 86400000);
                if (m < 1) return 'just now';
                if (m < 60) return m + 'm ago';
                if (h < 24) return h + 'h ago';
                return dd + 'd ago';
            };

            const wrap = document.createElement('div');
            wrap.className = 'notif-menu';
            wrap.innerHTML =
                '<button class="icon-btn notif-bell" id="notifBellBtn" title="Notifications" aria-label="Notifications">' +
                    '<i class="fa-solid fa-bell"></i><span class="notif-badge" id="notifBadge" style="display:none;">0</span>' +
                '</button>' +
                '<div class="notif-dropdown" id="notifDropdown">' +
                    '<div class="notif-head"><i class="fa-solid fa-bell"></i> Notifications</div>' +
                    '<div class="notif-list" id="notifList"><p class="notif-empty">Loading…</p></div>' +
                '</div>';
            topbarRight.insertBefore(wrap, topbarRight.querySelector('.user-menu'));

            const dropdown = wrap.querySelector('#notifDropdown');
            const badge    = wrap.querySelector('#notifBadge');
            const listEl   = wrap.querySelector('#notifList');
            let notifs = [];

            async function loadNotifs() {
                try {
                    const resp = await fetch('/api/notifications?email=' + encodeURIComponent(user.email));
                    notifs = resp.ok ? await resp.json() : [];
                } catch { notifs = []; }
                const unread = notifs.filter(n => !n.read).length;
                if (unread > 0) { badge.textContent = unread > 99 ? '99+' : unread; badge.style.display = ''; }
                else badge.style.display = 'none';
                listEl.innerHTML = notifs.length ? notifs.map(n =>
                    '<div class="notif-item ' + (n.read ? '' : 'unread') + '">' +
                        '<span class="notif-icon"><i class="fa-solid fa-circle-check"></i></span>' +
                        '<div class="notif-body"><div class="notif-text">' + esc(n.message || 'Your submission was received.') + '</div>' +
                        '<div class="notif-meta">' + esc(n.fromName || '') + ' · ' + timeAgo(n.createdAt) + '</div></div>' +
                    '</div>'
                ).join('') : '<p class="notif-empty">No notifications yet.</p>';
            }

            wrap.querySelector('#notifBellBtn').addEventListener('click', async e => {
                e.stopPropagation();
                const opening = !dropdown.classList.contains('open');
                dropdown.classList.toggle('open');
                if (opening && notifs.some(n => !n.read)) {
                    try { await fetch('/api/notifications/read-all?email=' + encodeURIComponent(user.email), { method: 'PUT' }); } catch {}
                    notifs.forEach(n => n.read = true);
                    badge.style.display = 'none';
                    listEl.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
                }
            });
            document.addEventListener('click', e => { if (!e.target.closest('.notif-menu')) dropdown.classList.remove('open'); });

            loadNotifs();
            setInterval(loadNotifs, 30000);
        }
    });
})();
