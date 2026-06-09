// School Dropout Dashboard JavaScript

const api = new ApiService();

document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!currentUser || currentUser.userType !== 'school') {
        window.location.href = 'auth.html';
        return;
    }

    initializeSchoolDashboard(currentUser);
});

function initializeSchoolDashboard(currentUser) {
    setupSchoolNav();
    setupSchoolForms(currentUser);
    setupReportButtons(currentUser);
    loadSchoolData(currentUser);
}

// Navigation
function setupSchoolNav() {
    const menuLinks = document.querySelectorAll('.dashboard-menu a');
    const sections = document.querySelectorAll('.dashboard-section');

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            const target = document.getElementById(sectionId);
            if (target) target.classList.add('active');
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('currentUser');
            sessionStorage.removeItem('token');
            window.location.href = 'auth.html';
        });
    }
}

// Forms
function setupSchoolForms(currentUser) {
    const schoolInfoForm = document.getElementById('schoolInfoForm');
    const dropoutForm = document.getElementById('dropoutForm');

    if (schoolInfoForm) {
        schoolInfoForm.addEventListener('submit', (e) => handleSchoolInfoSubmit(e, currentUser));
    }
    if (dropoutForm) {
        dropoutForm.addEventListener('submit', (e) => handleDropoutSubmit(e, currentUser));
    }
}

// Load all school data
async function loadSchoolData(currentUser) {
    await loadSchoolInfo(currentUser);
    await loadDropoutTable(currentUser);
}

// Handle school info save → POST to database
async function handleSchoolInfoSubmit(e, currentUser) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const school = {
        schoolName: document.getElementById('schoolName').value,
        schoolLeader: document.getElementById('schoolLeader').value,
        email: document.getElementById('schoolEmail').value,
        phone: document.getElementById('schoolPhone').value,
        totalStudents: parseInt(document.getElementById('totalStudents').value) || 0,
        totalDropouts: parseInt(document.getElementById('totalDropouts').value) || 0,
        ownerEmail: currentUser.email
    };

    try {
        await api.saveSchool(school);
        await loadSchoolInfo(currentUser);
        alert('School information saved successfully!');
    } catch (err) {
        alert('Failed to save school information. Please try again.');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save School Information';
    }
}

// Load school info from database
async function loadSchoolInfo(currentUser) {
    try {
        const schools = await api.getSchools(currentUser.email);
        const school = schools[0];

        if (school) {
            document.getElementById('schoolName').value = school.schoolName || '';
            document.getElementById('schoolLeader').value = school.schoolLeader || '';
            document.getElementById('schoolEmail').value = school.email || '';
            document.getElementById('schoolPhone').value = school.phone || '';
            document.getElementById('totalStudents').value = school.totalStudents || 0;
            document.getElementById('totalDropouts').value = school.totalDropouts || 0;

            const total = school.totalStudents || 0;
            const dropouts = school.totalDropouts || 0;
            const rate = total > 0 ? ((dropouts / total) * 100).toFixed(1) : 0;

            document.getElementById('statTotalStudents').textContent = total;
            document.getElementById('statTotalDropouts').textContent = dropouts;
            document.getElementById('statDropoutRate').textContent = rate + '%';
        } else {
            document.getElementById('statTotalStudents').textContent = 0;
            document.getElementById('statTotalDropouts').textContent = 0;
            document.getElementById('statDropoutRate').textContent = '0%';
        }
    } catch (err) {
        console.error('Error loading school info:', err);
    }
}

// Handle dropout record save → POST to database
async function handleDropoutSubmit(e, currentUser) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const record = {
        schoolName: document.getElementById('dropoutSchoolName').value,
        schoolLeader: document.getElementById('dropoutSchoolLeader').value,
        leaderPhone: document.getElementById('dropoutLeaderPhone').value,
        leaderEmail: document.getElementById('dropoutLeaderEmail').value,
        studentName: document.getElementById('studentName').value,
        sex: document.getElementById('studentSex').value,
        age: parseInt(document.getElementById('studentAge').value) || null,
        recentLevel: document.getElementById('recentLevel').value,
        fatherName: document.getElementById('fatherName').value,
        fatherPhone: document.getElementById('fatherPhone').value,
        motherName: document.getElementById('motherName').value,
        guardianPhone: document.getElementById('guardianPhone').value,
        ownerEmail: currentUser.email
    };

    try {
        await api.saveDropoutRecord(record);
        e.target.reset();
        await loadDropoutTable(currentUser);
        await syncDropoutCountToSchoolProfile(currentUser);
        alert('Dropout record saved successfully!');
    } catch (err) {
        alert('Failed to save dropout record. Please try again.');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Dropout Record';
    }
}

// Load dropout table from database
async function loadDropoutTable(currentUser) {
    const tbody = document.getElementById('dropoutTableBody');
    if (!tbody) return;

    try {
        const records = await api.getDropoutRecords(currentUser.email);

        if (!records || records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9">No dropout records yet.</td></tr>';
            return;
        }

        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${r.studentName}</td>
                <td>${r.sex || ''}</td>
                <td>${r.age || ''}</td>
                <td>${r.recentLevel || ''}</td>
                <td>${r.schoolName || ''}</td>
                <td>${r.fatherName || ''}</td>
                <td>${r.motherName || ''}</td>
                <td>${r.guardianPhone || ''}</td>
                <td>${formatDateShort(r.date)}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="9">Failed to load records.</td></tr>';
        console.error('Error loading dropout table:', err);
    }
}

// After adding student records, auto-update the school's totalDropouts count
async function syncDropoutCountToSchoolProfile(currentUser) {
    try {
        const [schools, records] = await Promise.all([
            api.getSchools(currentUser.email),
            api.getDropoutRecords(currentUser.email)
        ]);
        const school = schools[0];
        if (!school) return;

        await api.saveSchool({
            ...school,
            ownerEmail: currentUser.email,
            totalDropouts: records.length
        });

        await loadSchoolInfo(currentUser);
    } catch (err) {
        console.error('Error syncing dropout count:', err);
    }
}

function formatDateShort(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

// ─── Report: Download & Share ──────────────────────────────────────────────

function setupReportButtons(currentUser) {
    const downloadBtn = document.getElementById('downloadReportBtn');
    const shareBtn    = document.getElementById('shareReportBtn');

    if (downloadBtn) downloadBtn.addEventListener('click', () => downloadReport(currentUser));
    if (shareBtn)    shareBtn.addEventListener('click',    () => shareReport(currentUser));
}

async function gatherReportData(currentUser) {
    const [schools, records] = await Promise.all([
        api.getSchools(currentUser.email),
        api.getDropoutRecords(currentUser.email)
    ]);
    const school = schools[0] || {};
    return { school, records };
}

async function downloadReport(currentUser) {
    const btn = document.getElementById('downloadReportBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

    try {
        const { school, records } = await gatherReportData(currentUser);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const primaryColor = [44, 95, 138];   // #2c5f8a
        const lightGray    = [245, 247, 250];
        const darkText     = [30, 40, 50];
        const pageW        = doc.internal.pageSize.getWidth();
        const pageH        = doc.internal.pageSize.getHeight();

        // ── Header banner ──
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageW, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('SCHOOL DROPOUT REPORT', pageW / 2, 12, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Community Level Service Delivery Platform', pageW / 2, 19, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`, pageW / 2, 25, { align: 'center' });

        let y = 36;

        // ── School Information ──
        doc.setFillColor(...lightGray);
        doc.roundedRect(10, y, pageW - 20, 38, 3, 3, 'F');
        doc.setTextColor(...darkText);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('SCHOOL INFORMATION', 15, y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const info = [
            ['School Name:', school.schoolName || '—'],
            ['School Leader:', school.schoolLeader || '—'],
            ['Email:', school.email || '—'],
            ['Telephone:', school.phone || '—'],
        ];
        info.forEach(([label, val], i) => {
            const col = i < 2 ? 15 : pageW / 2 + 5;
            const row = y + 14 + (i % 2) * 8;
            doc.setFont('helvetica', 'bold');
            doc.text(label, col, row);
            doc.setFont('helvetica', 'normal');
            doc.text(val, col + 32, row);
        });

        y += 46;

        // ── Summary Statistics ──
        const total    = school.totalStudents || 0;
        const dropouts = school.totalDropouts || records.length;
        const rate     = total > 0 ? ((dropouts / total) * 100).toFixed(1) : '0.0';
        const active   = total - dropouts;

        const stats = [
            { label: 'Total Students',  value: total },
            { label: 'Total Dropouts',  value: dropouts },
            { label: 'Active Students', value: active >= 0 ? active : 0 },
            { label: 'Dropout Rate',    value: rate + '%' },
        ];

        const cardW = (pageW - 20 - 9) / 4;
        stats.forEach((s, i) => {
            const x = 10 + i * (cardW + 3);
            doc.setFillColor(...primaryColor);
            doc.roundedRect(x, y, cardW, 20, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(String(s.value), x + cardW / 2, y + 10, { align: 'center' });
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(s.label, x + cardW / 2, y + 17, { align: 'center' });
        });

        y += 28;

        // ── Dropout Students Table ──
        doc.setTextColor(...darkText);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DROPOUT STUDENT RECORDS', 10, y);
        y += 4;

        if (records.length === 0) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text('No dropout student records have been submitted yet.', 10, y + 8);
        } else {
            doc.autoTable({
                startY: y,
                head: [['#', 'Student Name', 'Sex', 'Age', 'Level', 'Father', 'Mother', 'Guardian Phone', 'Date']],
                body: records.map((r, i) => [
                    i + 1,
                    r.studentName || '',
                    r.sex || '',
                    r.age || '',
                    r.recentLevel || '',
                    r.fatherName || '',
                    r.motherName || '',
                    r.guardianPhone || '',
                    r.date ? new Date(r.date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : ''
                ]),
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: lightGray },
                margin: { left: 10, right: 10 },
                columnStyles: { 0: { cellWidth: 8 } }
            });
        }

        // ── Footer ──
        const footerY = pageH - 10;
        doc.setFillColor(...primaryColor);
        doc.rect(0, footerY - 6, pageW, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Community Level Service Delivery Platform  |  Confidential School Report', pageW / 2, footerY, { align: 'center' });

        const filename = `School_Report_${(school.schoolName || 'School').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(filename);

    } catch (err) {
        console.error('PDF generation error:', err);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download PDF Report';
    }
}

async function shareReport(currentUser) {
    const btn = document.getElementById('shareReportBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';

    try {
        const { school, records } = await gatherReportData(currentUser);

        if (!school.schoolName) {
            alert('Please save your school information first before sharing a report.');
            return;
        }

        const total    = school.totalStudents || 0;
        const dropouts = school.totalDropouts || records.length;
        const rate     = total > 0 ? ((dropouts / total) * 100).toFixed(1) : '0.0';
        const active   = Math.max(0, total - dropouts);

        showShareOptionsModal({ school, records, total, dropouts, active, rate, currentUser });

    } catch (err) {
        console.error('Share report error:', err);
        alert(`Failed to load report data: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Share to Leaders';
    }
}

function buildReportText(school, records, total, dropouts, active, rate) {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let text = `SCHOOL DROPOUT REPORT\n`;
    text += `================================\n`;
    text += `School:  ${school.schoolName}\n`;
    text += `Leader:  ${school.schoolLeader || '-'}\n`;
    text += `Phone:   ${school.phone || '-'}\n`;
    text += `Email:   ${school.email || '-'}\n`;
    text += `Date:    ${date}\n\n`;
    text += `STATISTICS\n`;
    text += `--------------------------------\n`;
    text += `Total Students:   ${total}\n`;
    text += `Dropout Students: ${dropouts}\n`;
    text += `Active Students:  ${active}\n`;
    text += `Dropout Rate:     ${rate}%\n`;
    if (records.length > 0) {
        text += `\nDROPOUT RECORDS (${records.length} students)\n`;
        text += `--------------------------------\n`;
        records.forEach((r, i) => {
            text += `${i + 1}. ${r.studentName} | ${r.sex || '-'} | Age ${r.age || '-'} | ${r.recentLevel || '-'}\n`;
            if (r.fatherName || r.motherName || r.guardianPhone) {
                text += `   Father: ${r.fatherName || '-'} | Mother: ${r.motherName || '-'} | Phone: ${r.guardianPhone || '-'}\n`;
            }
        });
    }
    return text;
}

function showShareOptionsModal({ school, records, total, dropouts, active, rate, currentUser }) {
    const existing = document.getElementById('shareOptionsModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'shareOptionsModal';
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;
        display:flex;align-items:center;justify-content:center;
    `;
    modal.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:32px 36px;max-width:440px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,0.22);">
            <h3 style="margin:0 0 4px;color:#2c3e50;font-size:18px;font-weight:700;">
                <i class="fa-solid fa-share-nodes" style="color:#2c5f8a;margin-right:8px;"></i>Share Report
            </h3>
            <p style="color:#888;font-size:13px;margin:0 0 22px;">
                Sharing dropout report for <strong style="color:#2c3e50;">${school.schoolName}</strong>
            </p>

            <div style="display:flex;flex-direction:column;gap:10px;">
                <button id="shareEmailBtn" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border:2px solid #e3e8ef;border-radius:10px;background:#fff;cursor:pointer;text-align:left;transition:border-color 0.2s,background 0.2s;">
                    <span style="width:40px;height:40px;border-radius:50%;background:#e8f0fe;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid fa-envelope" style="color:#1a73e8;font-size:17px;"></i>
                    </span>
                    <span>
                        <span style="display:block;font-size:14px;font-weight:700;color:#2c3e50;">Share via Email</span>
                        <span style="font-size:12px;color:#888;">Opens your email app with the report</span>
                    </span>
                </button>

                <button id="shareWhatsAppBtn" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border:2px solid #e3e8ef;border-radius:10px;background:#fff;cursor:pointer;text-align:left;transition:border-color 0.2s,background 0.2s;">
                    <span style="width:40px;height:40px;border-radius:50%;background:#e7fbed;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-brands fa-whatsapp" style="color:#25d366;font-size:20px;"></i>
                    </span>
                    <span>
                        <span style="display:block;font-size:14px;font-weight:700;color:#2c3e50;">Share via WhatsApp</span>
                        <span style="font-size:12px;color:#888;">Opens WhatsApp with the report message</span>
                    </span>
                </button>

            </div>

            <button id="shareModalCancelBtn" style="margin-top:18px;width:100%;padding:10px;border:1px solid #dde3ec;border-radius:8px;background:#f5f7fa;cursor:pointer;font-size:13px;color:#666;font-weight:500;">
                Cancel
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('shareModalCancelBtn').addEventListener('click', () => modal.remove());

    const reportText = buildReportText(school, records, total, dropouts, active, rate);
    const subject    = `School Dropout Report - ${school.schoolName}`;

    document.getElementById('shareEmailBtn').addEventListener('click', () => {
        modal.remove();
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportText)}`;
        if (mailtoUrl.length > 2000) {
            showEmailCopyModal(subject, reportText);
        } else {
            const a = document.createElement('a');
            a.href = mailtoUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    document.getElementById('shareWhatsAppBtn').addEventListener('click', () => {
        modal.remove();
        window.open(`https://wa.me/?text=${encodeURIComponent(reportText)}`, '_blank');
    });
}

function showEmailCopyModal(subject, body) {
    const existing = document.getElementById('emailCopyModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'emailCopyModal';
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;
        display:flex;align-items:center;justify-content:center;
    `;
    modal.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:28px 32px;max-width:520px;width:94%;box-shadow:0 8px 40px rgba(0,0,0,0.22);">
            <h3 style="margin:0 0 6px;color:#2c3e50;font-size:17px;font-weight:700;">
                <i class="fa-solid fa-envelope" style="color:#1a73e8;margin-right:8px;"></i>Share via Email
            </h3>
            <p style="color:#888;font-size:13px;margin:0 0 4px;">Subject: <strong style="color:#2c3e50;">${subject}</strong></p>
            <p style="color:#888;font-size:12px;margin:0 0 12px;">Copy the text below and paste it into your email body:</p>
            <textarea id="emailBodyText" readonly style="width:100%;height:220px;border:1px solid #dde3ec;border-radius:8px;padding:12px;font-size:12px;font-family:monospace;color:#2c3e50;resize:vertical;box-sizing:border-box;">${body}</textarea>
            <div style="display:flex;gap:10px;margin-top:14px;">
                <button id="copyEmailBodyBtn" style="flex:1;padding:10px;background:#1a73e8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">
                    <i class="fa-solid fa-copy"></i> Copy Text
                </button>
                <button onclick="document.getElementById('emailCopyModal').remove()" style="flex:1;padding:10px;background:#f5f7fa;color:#666;border:1px solid #dde3ec;border-radius:8px;cursor:pointer;font-size:13px;">
                    Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('copyEmailBodyBtn').addEventListener('click', () => {
        const ta = document.getElementById('emailBodyText');
        ta.select();
        navigator.clipboard.writeText(ta.value).then(() => {
            const btn = document.getElementById('copyEmailBodyBtn');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            btn.style.background = '#27ae60';
            setTimeout(() => {
                btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Text';
                btn.style.background = '#1a73e8';
            }, 2000);
        });
    });
}

function showShareSuccessModal(schoolName) {
    const existing = document.getElementById('shareSuccessModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'shareSuccessModal';
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;
        display:flex;align-items:center;justify-content:center;
    `;
    modal.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:36px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
            <div style="width:64px;height:64px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
                <i class="fa-solid fa-check" style="font-size:28px;color:#27ae60;"></i>
            </div>
            <h3 style="margin:0 0 10px;color:#2c3e50;font-size:18px;">Report Saved Successfully!</h3>
            <p style="color:#666;margin:0 0 6px;font-size:14px;">
                The dropout report for <strong>${schoolName}</strong> has been shared with community leaders.
            </p>
            <p style="color:#999;font-size:12px;margin:0 0 24px;">
                Leaders can now view this report in their dashboards.
            </p>
            <button onclick="document.getElementById('shareSuccessModal').remove()"
                style="background:#2c5f8a;color:#fff;border:none;border-radius:6px;padding:10px 28px;font-size:14px;font-weight:600;cursor:pointer;">
                OK
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}
