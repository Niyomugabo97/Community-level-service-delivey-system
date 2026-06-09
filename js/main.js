// Main JavaScript for Home Page

// Initialize API service
let api;

// Sample data for activities, news, and trending
const sampleActivities = [
    {
        id: 1,
        image: 'https://via.placeholder.com/400x200?text=Community+Activity',
        date: '2024-01-10',
        description: 'Community cleanup day organized by local leaders',
        place: 'Sector Center'
    },
    {
        id: 2,
        image: 'https://via.placeholder.com/400x200?text=Umuganda+Day',
        date: '2024-01-05',
        description: 'Monthly Umuganda community work',
        place: 'Village Square'
    },
    {
        id: 3,
        image: 'https://via.placeholder.com/400x200?text=Meeting+Session',
        date: '2024-01-03',
        description: 'Inteko rusange meeting discussing community development',
        place: 'Community Hall'
    }
];

const sampleNews = [
    {
        id: 1,
        title: 'Upcoming Inteko Meeting',
        date: '2024-01-20',
        description: 'Monthly Inteko rusange meeting scheduled for next week',
        place: 'Community Hall'
    },
    {
        id: 2,
        title: 'Umuganda Schedule',
        date: '2024-01-25',
        description: 'Next Umuganda day announced for road maintenance',
        place: 'Main Road'
    }
];

const sampleTrending = [
    {
        id: 1,
        date: '2024-01-12',
        description: 'New community health center construction begins',
        place: 'Sector Center'
    },
    {
        id: 2,
        date: '2024-01-11',
        description: 'Youth entrepreneurship program launched',
        place: 'Village Office'
    }
];

// Helper to escape HTML characters
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Truncate description helper
function truncateDesc(text, len) {
    if (!text) return '—';
    return text.length <= len ? escapeHtml(text) : escapeHtml(text.slice(0, len)) + '…';
}

// Load configuration
document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'config.js';
    script.onload = () => {
        initializeHome();
    };
    document.head.appendChild(script);
});

function initializeHome() {
    console.log('CONFIG loaded:', CONFIG);
    api = new ApiService();
    
    // Trigger loading of all components
    loadAllComponents();
}

async function loadAllComponents() {
    await Promise.all([
        loadHomeUpdates(),
        loadInfrastructureReports(),
        loadSchoolDropoutStats()
    ]);

    // Load attendance analytics for home page
    if (typeof updateAttendanceStatistics === 'function') {
        updateAttendanceStatistics();
    }

    // Draw charts with proper data
    setTimeout(() => {
        if (typeof calculateAttendanceStatistics === 'function') {
            const stats = calculateAttendanceStatistics();
            if (typeof drawAttendanceChart === 'function') {
                drawAttendanceChart(stats);
            }
        }
        
        if (typeof calculateSectorStatistics === 'function') {
            const { sectors, villages } = calculateSectorStatistics();
            if (typeof drawSectorChart === 'function') {
                drawSectorChart(sectors);
            }
            if (typeof drawVillageChart === 'function') {
                drawVillageChart(villages);
            }
        }
    }, 100);
}

// Load Home Updates (Activities, News, and Trending)
async function loadHomeUpdates() {
    let updates = [];
    try {
        if (api) {
            updates = await api.getHomeUpdates();
        }
    } catch (err) {
        console.warn('Failed to load home updates from backend, falling back to local storage/sample:', err);
    }

    // Merge/Fallback for Activities
    const activitiesGrid = document.getElementById('activitiesGrid');
    if (activitiesGrid) {
        let activities = updates.filter(u => u.type === 'activity');
        if (activities.length === 0) {
            const stored = JSON.parse(localStorage.getItem('activities')) || sampleActivities;
            activities = stored;
        }
        const sorted = [...activities].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        const levelBadge = (level) => level ? `<span class="level-badge ${level}">${escapeHtml(level.charAt(0).toUpperCase() + level.slice(1))}</span>` : '';
        const byLine = (a) => (a.uploadedBy || a.postedBy) ? `<small class="card-by">By: ${escapeHtml(a.uploadedBy || a.postedBy)}</small>` : '';

        activitiesGrid.innerHTML = sorted.map(activity => `
            <div class="activity-card">
                <img src="${activity.imageUrl || activity.image || 'https://via.placeholder.com/400x200?text=Activity'}" alt="Activity">
                ${levelBadge(activity.level || 'Village')}
                <div class="card-date">${formatDate(activity.date || activity.createdAt)}</div>
                <p>${escapeHtml(activity.description)}</p>
                <div class="card-place">📍 ${escapeHtml(activity.place || '—')}</div>
                ${byLine(activity)}
            </div>
        `).join('');
    }

    // Merge/Fallback for News (upcoming sessions)
    const newsGrid = document.getElementById('newsGrid');
    if (newsGrid) {
        let news = updates.filter(u => u.type === 'upcoming');
        if (news.length === 0) {
            const stored = JSON.parse(localStorage.getItem('news')) || sampleNews;
            news = stored;
        }
        const sorted = [...news].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
        const levelBadge = (level) => level ? `<span class="level-badge ${level}">${escapeHtml(level.charAt(0).toUpperCase() + level.slice(1))}</span>` : '';
        const byLine = (n) => (n.uploadedBy || n.postedBy) ? `<small class="card-by">By: ${escapeHtml(n.uploadedBy || n.postedBy)}</small>` : '';

        newsGrid.innerHTML = sorted.map(item => `
            <div class="news-card">
                <img src="${item.imageUrl || item.image || 'https://via.placeholder.com/400x200?text=Upcoming+Session'}" alt="Upcoming Session">
                ${levelBadge(item.level || 'Village')}
                <h3>${escapeHtml(item.title || 'Upcoming Session')}</h3>
                <div class="card-date">${formatDate(item.date || item.createdAt)}</div>
                <p>${escapeHtml(item.description)}</p>
                <div class="card-place">📍 ${escapeHtml(item.place || '—')}</div>
                ${byLine(item)}
            </div>
        `).join('');
    }

    // Merge/Fallback for Trending
    const trendingGrid = document.getElementById('trendingGrid');
    if (trendingGrid) {
        let trending = updates.filter(u => u.type === 'trending');
        if (trending.length === 0) {
            const stored = JSON.parse(localStorage.getItem('trending')) || sampleTrending;
            trending = stored;
        }
        const sorted = [...trending].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        const levelBadge = (level) => level ? `<span class="level-badge ${level}">${escapeHtml(level.charAt(0).toUpperCase() + level.slice(1))}</span>` : '';
        const byLine = (t) => (t.uploadedBy || t.postedBy) ? `<small class="card-by">By: ${escapeHtml(t.uploadedBy || t.postedBy)}</small>` : '';

        trendingGrid.innerHTML = sorted.map(item => `
            <div class="trending-card">
                <img src="${item.imageUrl || item.image || 'https://via.placeholder.com/400x200?text=Trending'}" alt="Trending">
                ${levelBadge(item.level || 'Village')}
                <div class="card-date">${formatDate(item.date || item.createdAt)}</div>
                <p>${escapeHtml(item.description)}</p>
                <div class="card-place">📍 ${escapeHtml(item.place || '—')}</div>
                ${byLine(item)}
            </div>
        `).join('');
    }
}

// Load Infrastructure Reports for home page (combines leader and citizen infrastructure reports)
async function loadInfrastructureReports() {
    const container = document.getElementById('infrastructureReports');
    if (!container) return;

    let reports = [];
    try {
        if (api) {
            const [leaderReports, citizenReports] = await Promise.all([
                api.getLeaderReports({ type: 'infrastructure' }),
                api.getCitizenReports({ type: 'infrastructure' })
            ]);

            reports = [
                ...leaderReports.map(r => ({
                    id: r._id,
                    place: r.data?.place || '—',
                    date: r.data?.date || r.dateReported,
                    image: r.data?.image,
                    description: r.data?.description || '—',
                    reportedBy: r.reportedBy || 'Village Leader',
                    dateReported: r.dateReported || r.createdAt
                })),
                ...citizenReports.map(r => ({
                    id: r._id,
                    place: r.data?.place || '—',
                    date: r.data?.date || r.dateReported,
                    image: r.data?.image,
                    description: r.data?.description || '—',
                    reportedBy: r.reportedBy || 'Citizen',
                    dateReported: r.dateReported || r.createdAt
                }))
            ];
        }
    } catch (err) {
        console.warn('Failed to load infrastructure reports from backend:', err);
    }

    if (reports.length === 0) {
        const local = JSON.parse(localStorage.getItem('infrastructureReports')) || [];
        reports = local;
    }

    if (reports.length === 0) {
        container.innerHTML = '<p>No infrastructure reports yet.</p>';
        return;
    }

    const sorted = [...reports].sort((a, b) => new Date(b.dateReported || b.date) - new Date(a.dateReported || a.date));

    container.innerHTML = sorted.map(r => `
        <div class="activity-card">
            <img src="${r.image || 'https://via.placeholder.com/400x200?text=No+Image'}" alt="Infrastructure image">
            <div class="card-date">${formatDate(r.date || r.dateReported)}</div>
            <p>${escapeHtml(r.description || 'No description provided.')}</p>
            <div class="card-place">📍 ${escapeHtml(r.place || '—')}</div>
            <small class="card-by">Reported by: ${escapeHtml(r.reportedBy || 'Anonymous')}</small>
        </div>
    `).join('');
}

// Load school dropout statistics (home page)
async function loadSchoolDropoutStats() {
    const totalSchoolsEl = document.getElementById('homeTotalSchools');
    const totalDropoutsEl = document.getElementById('homeTotalDropouts');
    const averageRateEl = document.getElementById('homeAverageRate');
    const schoolListEl = document.getElementById('homeSchoolList');

    if (!totalSchoolsEl || !totalDropoutsEl || !averageRateEl) return;

    let schools = [];
    try {
        if (api) {
            schools = await api.getSchools();
        }
    } catch (err) {
        console.warn('Failed to load schools from backend:', err);
    }

    if (schools.length === 0) {
        schools = JSON.parse(localStorage.getItem('schools')) || [];
    }

    const totalSchools = schools.length;
    const totalDropouts = schools.reduce((sum, s) => sum + (s.totalDropouts || 0), 0);
    const totalStudents = schools.reduce((sum, s) => sum + (s.totalStudents || 0), 0);
    const avgRate = totalStudents > 0 ? ((totalDropouts / totalStudents) * 100).toFixed(1) : 0;

    totalSchoolsEl.textContent = totalSchools;
    totalDropoutsEl.textContent = totalDropouts;
    averageRateEl.textContent = avgRate + '%';

    // Render per-school statistics
    if (schoolListEl) {
        if (schools.length === 0) {
            schoolListEl.innerHTML = '<p>No schools registered yet.</p>';
        } else {
            schoolListEl.innerHTML = schools.map(s => {
                const ts = s.totalStudents || 0;
                const td = s.totalDropouts || 0;
                const rate = ts > 0 ? ((td / ts) * 100).toFixed(1) : 0;
                return `
                    <div class="school-card">
                        <h3>${escapeHtml(s.schoolName || 'Unnamed School')}</h3>
                        <p><strong>Leader:</strong> ${escapeHtml(s.schoolLeader || 'N/A')}</p>
                        <p><strong>Total Students:</strong> ${ts}</p>
                        <p><strong>Dropouts:</strong> ${td}</p>
                        <p><strong>Dropout Rate:</strong> ${rate}%</p>
                    </div>
                `;
            }).join('');
        }
    }
}
