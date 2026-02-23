// Main JavaScript for Home Page

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

// Load activities (from leaders + sample/legacy)
function loadActivities() {
    const activitiesGrid = document.getElementById('activitiesGrid');
    if (!activitiesGrid) return;

    const storedActivities = JSON.parse(localStorage.getItem('activities')) || sampleActivities;
    const sorted = [...storedActivities].sort((a, b) => new Date(b.date) - new Date(a.date));
    const levelBadge = (level) => level ? `<span class="level-badge ${level}">${level.charAt(0).toUpperCase() + level.slice(1)}</span>` : '';
    const byLine = (a) => a.uploadedBy ? `<small class="card-by">By: ${a.uploadedBy}</small>` : '';
    
    activitiesGrid.innerHTML = sorted.map(activity => `
        <div class="activity-card">
            <img src="${activity.image || 'https://via.placeholder.com/400x200?text=Activity'}" alt="Activity">
            ${levelBadge(activity.level)}
            <div class="card-date">${formatDate(activity.date)}</div>
            <p>${activity.description}</p>
            <div class="card-place">📍 ${activity.place || '—'}</div>
            ${byLine(activity)}
        </div>
    `).join('');
}

// Load news (upcoming sessions from leaders + sample/legacy)
function loadNews() {
    const newsGrid = document.getElementById('newsGrid');
    if (!newsGrid) return;

    const storedNews = JSON.parse(localStorage.getItem('news')) || sampleNews;
    const sorted = [...storedNews].sort((a, b) => new Date(a.date) - new Date(b.date));
    const levelBadge = (level) => level ? `<span class="level-badge ${level}">${level.charAt(0).toUpperCase() + level.slice(1)}</span>` : '';
    const byLine = (n) => n.uploadedBy ? `<small class="card-by">By: ${n.uploadedBy}</small>` : '';
    
    newsGrid.innerHTML = sorted.map(news => `
        <div class="news-card">
            ${levelBadge(news.level)}
            <h3>${news.title}</h3>
            <div class="card-date">${formatDate(news.date)}</div>
            <p>${news.description}</p>
            <div class="card-place">📍 ${news.place || '—'}</div>
            ${byLine(news)}
        </div>
    `).join('');
}

// Load trending (from leaders + sample/legacy)
function loadTrending() {
    const trendingGrid = document.getElementById('trendingGrid');
    if (!trendingGrid) return;

    const storedTrending = JSON.parse(localStorage.getItem('trending')) || sampleTrending;
    const sorted = [...storedTrending].sort((a, b) => new Date(b.date) - new Date(a.date));
    const levelBadge = (level) => level ? `<span class="level-badge ${level}">${level.charAt(0).toUpperCase() + level.slice(1)}</span>` : '';
    const byLine = (t) => t.uploadedBy ? `<small class="card-by">By: ${t.uploadedBy}</small>` : '';
    
    trendingGrid.innerHTML = sorted.map(item => `
        <div class="trending-card">
            ${levelBadge(item.level)}
            <div class="card-date">${formatDate(item.date)}</div>
            <p>${item.description}</p>
            <div class="card-place">📍 ${item.place || '—'}</div>
            ${byLine(item)}
        </div>
    `).join('');
}

// Load infrastructure reports for home page
function loadInfrastructureReports() {
    const container = document.getElementById('infrastructureReports');
    if (!container) return;

    const reports = JSON.parse(localStorage.getItem('infrastructureReports')) || [];
    if (reports.length === 0) {
        container.innerHTML = '<p>No infrastructure reports yet.</p>';
        return;
    }

    const sorted = [...reports].sort((a, b) => new Date(b.dateReported) - new Date(a.dateReported));

    container.innerHTML = sorted.map(r => `
        <div class="activity-card">
            <img src="${r.image || 'https://via.placeholder.com/400x200?text=No+Image'}" alt="Infrastructure image">
            <div class="card-date">${formatDate(r.date || r.dateReported)}</div>
            <p>${r.description || 'No description provided.'}</p>
            <div class="card-place">📍 ${r.place || '—'}</div>
            <small class="card-by">Reported by: ${r.reportedBy || 'Anonymous'}</small>
        </div>
    `).join('');
}

// Load school dropout statistics (home page)
function loadSchoolDropoutStats() {
    const totalSchoolsEl = document.getElementById('homeTotalSchools');
    const totalDropoutsEl = document.getElementById('homeTotalDropouts');
    const averageRateEl = document.getElementById('homeAverageRate');
    const schoolListEl = document.getElementById('homeSchoolList');

    if (!totalSchoolsEl || !totalDropoutsEl || !averageRateEl) return;

    const schools = JSON.parse(localStorage.getItem('schools')) || [];

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
                        <h3>${s.schoolName || 'Unnamed School'}</h3>
                        <p><strong>Leader:</strong> ${s.schoolLeader || 'N/A'}</p>
                        <p><strong>Total Students:</strong> ${ts}</p>
                        <p><strong>Dropouts:</strong> ${td}</p>
                        <p><strong>Dropout Rate:</strong> ${rate}%</p>
                    </div>
                `;
            }).join('');
        }
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadActivities();
    loadNews();
    loadTrending();
    loadSchoolDropoutStats();
    loadInfrastructureReports();
});



