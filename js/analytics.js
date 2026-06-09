// Analytics Page JavaScript - Database Connectivity and Data Retrieval

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Palette used across all school charts
const CHART_COLORS = {
    primary:   '#2c5f8a',
    secondary: '#3a9bd5',
    accent:    '#e74c3c',
    warning:   '#f39c12',
    success:   '#27ae60',
    purple:    '#8e44ad',
    teal:      '#16a085',
    bars: ['#2c5f8a','#3a9bd5','#27ae60','#f39c12','#e74c3c','#8e44ad','#16a085','#e67e22','#2980b9','#c0392b']
};

class AnalyticsPage {
    constructor() {
        this.api = new ApiService();
        this.attendanceData = [];
        this.intekoData = [];
        this.membersData = [];
        this.schoolData = [];
        this.dropoutRecords = [];
        this._schoolCharts = {}; // holds Chart.js instances

        this.selectedMonth = 0; // 0 = all months
        this.selectedYear = 0; // 0 = all years

        this.init();
    }

    async init() {
        console.log('Initializing Analytics Page...');
        try {
            this.setupMonthSelector();
            this.setupTabs();
            await this.loadAllData();
            this.displayAttendanceAnalytics();
            this.displaySchoolDropoutAnalytics();
            this.displayIntekoAttendanceAnalytics();
            this.setupEventListeners();
            this.setupAutoRefresh(30000);
        } catch (error) {
            console.error('Error initializing analytics page:', error);
            this.showErrorMessage('Failed to load analytics data');
        }
    }

    setupMonthSelector() {
        const monthSel = document.getElementById('monthSelector');
        const yearSel = document.getElementById('yearSelector');
        const applyBtn = document.getElementById('applyMonthFilter');

        if (monthSel) monthSel.value = '0';
        if (yearSel) yearSel.value = '0';

        if (applyBtn) {
            applyBtn.addEventListener('click', async () => {
                this.selectedMonth = parseInt(monthSel.value) || 0;
                this.selectedYear = parseInt(yearSel.value) || 0;
                applyBtn.disabled = true;
                applyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
                try {
                    await this.loadAllData();
                    this.displayAttendanceAnalytics();
                    this.displayIntekoAttendanceAnalytics();
                } finally {
                    applyBtn.disabled = false;
                    applyBtn.innerHTML = '<i class="fa-solid fa-filter"></i> Apply Filter';
                }
            });
        }
    }

    setupTabs() {
        // Main tabs
        const tabs = document.querySelectorAll('.analytics-tab');
        const panels = document.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const target = tab.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const panel = document.getElementById(`tab-${target}`);
                if (panel) panel.classList.add('active');
            });
        });

        // Sub-tabs — each group is scoped to its own parent tab-panel
        document.querySelectorAll('.tab-panel').forEach(tabPanel => {
            const subTabs   = tabPanel.querySelectorAll('.sub-analytics-tab');
            const subPanels = tabPanel.querySelectorAll('.sub-tab-panel');

            subTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = tab.dataset.subtab;

                    subTabs.forEach(t => t.classList.remove('active'));
                    subPanels.forEach(p => p.classList.remove('active'));

                    tab.classList.add('active');
                    const panel = document.getElementById(`subtab-${target}`);
                    if (panel) panel.classList.add('active');
                });
            });
        });
    }

    setupAutoRefresh(intervalMs) {
        if (this.refreshTimer) clearInterval(this.refreshTimer);

        this.refreshTimer = setInterval(async () => {
            if (document.visibilityState === 'visible') {
                try {
                    await this.loadAllData();
                    this.displayAttendanceAnalytics();
                    this.displaySchoolDropoutAnalytics();
                    this.displayIntekoAttendanceAnalytics();
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                }
            }
        }, intervalMs);
    }

    async loadAllData() {
        const [members, attendance, intekoAttendance, schools, dropoutRecords] = await Promise.allSettled([
            this.api.getMembers(),
            this.api.getAttendance(),
            this.api.getIntekoAttendance(),   // IntekoAttendance model only
            this.api.getSchoolDropoutStatistics(),
            this.api.getDropoutRecords()
        ]);

        this.membersData     = members.status     === 'fulfilled' ? (members.value     || []) : [];
        this.attendanceData  = attendance.status  === 'fulfilled' ? (attendance.value  || []) : [];
        // Inteko analytics uses ONLY the IntekoAttendance collection — never the general Attendance model
        this.intekoData      = intekoAttendance.status === 'fulfilled' ? (intekoAttendance.value || []) : [];
        this.schoolData      = schools.status     === 'fulfilled' && schools.value
            ? schools.value
            : { totalSchools: 0, totalStudents: 0, totalDropouts: 0, averageRate: 0, schools: [] };
        this.dropoutRecords  = dropoutRecords.status === 'fulfilled' ? (dropoutRecords.value || []) : [];
    }

    getMonthFilteredData() {
        if (!this.selectedMonth && !this.selectedYear) return this.attendanceData;
        return this.attendanceData.filter(record => {
            if (!record.date) return false;
            const d = new Date(record.date);
            const monthOk = !this.selectedMonth || d.getMonth() + 1 === this.selectedMonth;
            const yearOk  = !this.selectedYear  || d.getFullYear() === this.selectedYear;
            return monthOk && yearOk;
        });
    }

    displayAttendanceAnalytics() {
        const subtitleEl = document.getElementById('attendanceMonthSubtitle');
        if (subtitleEl) {
            if (!this.selectedMonth && !this.selectedYear) {
                subtitleEl.innerHTML = `Showing attendance analytics for: <strong style="color: var(--primary-color);">All Time</strong>`;
            } else {
                const monthLabel = this.selectedMonth ? MONTH_NAMES[this.selectedMonth - 1] : 'All Months';
                const yearLabel  = this.selectedYear  ? this.selectedYear : 'All Years';
                subtitleEl.innerHTML = `Showing attendance analytics for: <strong style="color: var(--primary-color);">${monthLabel} ${yearLabel}</strong>`;
            }
        }

        const filteredAttendance = this.getMonthFilteredData();
        const totalMembers = this.membersData.length;

        this.displayAttendanceCategories(filteredAttendance, totalMembers);

        if (typeof drawAttendanceChart === 'function') {
            this.displayAttendanceCharts(filteredAttendance);
        }

        this.displayComprehensiveSectorStatistics();
        this.displayComprehensiveVillageStatistics();
        this.displayCellStatistics();
    }

    async displayComprehensiveSectorStatistics() {
        try {
            const month = this.selectedMonth || undefined;
            const year  = this.selectedYear  || undefined;
            const sectors = await this.api.getBestPerformingSectors(1000, undefined, month, year);
            const bestSector = sectors.length > 0 ? sectors[0] : null;
            this.displaySectorStatistics(sectors, bestSector);
        } catch (error) {
            console.error('Error fetching sector statistics, using fallback:', error);
            this.calculateSectorStatisticsFallback();
        }
    }

    async displayComprehensiveVillageStatistics() {
        try {
            const month = this.selectedMonth || undefined;
            const year  = this.selectedYear  || undefined;
            const villages = await this.api.getBestPerformingVillages(1000, undefined, undefined, month, year);
            const bestVillage = villages.length > 0 ? villages[0] : null;
            this.displayVillageStatistics(villages, bestVillage);
        } catch (error) {
            console.error('Error fetching village statistics, using fallback:', error);
            this.calculateVillageStatisticsFallback();
        }
    }

    async displayCellStatistics() {
        try {
            const month = this.selectedMonth || undefined;
            const year  = this.selectedYear  || undefined;
            const cells = await this.api.getBestPerformingCells(1000, undefined, undefined, month, year);
            this.displayCellRanking(cells);
        } catch (error) {
            console.error('Error fetching cell statistics, using fallback:', error);
            this.calculateCellStatisticsFallback();
        }
    }

    displaySectorStatistics(sectors, bestSector) {
        console.log('Displaying sector statistics...');

        // Update sector details display
        const sectorDetailsEl = document.getElementById('sectorDetails');
        if (sectorDetailsEl) {
            const sectorHTML = sectors.map(sector => {
                const rankDisplay = sector.rank ? `#${sector.rank}` : '';
                const isBest = sector.isBest;

                return `
                    <div class="sector-stat-item ${isBest ? 'best-performer' : ''}">
                        <div class="sector-header">
                            <span class="sector-name">
                                ${rankDisplay ? `<span class="rank-badge">${rankDisplay}</span> ` : ''}${sector.sector}
                            </span>
                        </div>
                        <div class="sector-stats">
                            <span class="stat-item"><i class="fa-solid fa-users"></i> ${sector.total} People</span>
                            <span class="stat-item"><i class="fa-solid fa-check"></i> ${sector.present} Present</span>
                            <span class="stat-item"><i class="fa-solid fa-xmark"></i> ${sector.absent} Absent</span>
                            <span class="stat-item"><i class="fa-solid fa-chart-line"></i> ${sector.rate}% Rate</span>
                        </div>
                        ${isBest ? '<div class="best-performer-label">🏆 Best Performing Sector</div>' : ''}
                    </div>
                `;
            }).join('');

            sectorDetailsEl.innerHTML = sectorHTML;
        }

        // Draw sector chart if function is available
        if (typeof drawSectorChart === 'function') {
            drawSectorChart(sectors);
        }

        console.log('Sector statistics displayed:', sectors);
    }

    displayVillageStatistics(villages, bestVillage) {
        console.log('Displaying village statistics...');

        // Group villages by sector for organized display
        const villagesBySector = {};
        villages.forEach(village => {
            if (!villagesBySector[village.sector]) {
                villagesBySector[village.sector] = [];
            }
            villagesBySector[village.sector].push(village);
        });

        // Update village breakdown display
        const villageContainerEl = document.getElementById('villageBreakdownContainer');
        if (villageContainerEl) {
            const villageHTML = Object.entries(villagesBySector).map(([sector, sectorVillages]) => {
                const sectorBestVillage = sectorVillages.find(v =>
                    bestVillage && (v.sector === bestVillage.sector && v.village === bestVillage.village) || v.isBest
                );

                return `
                    <div class="village-sector-group">
                        <h5><strong>Sector:</strong> ${sector}</h5>
                        <div class="village-list">
                            ${sectorVillages.map(village => {
                    const isBest = sectorBestVillage &&
                        village.sector === sectorBestVillage.sector &&
                        village.village === sectorBestVillage.village;
                    const bestClass = isBest ? 'best-performer' : '';
                    const rankDisplay = village.rank ? `#${village.rank}` : '';

                    return `
                                    <div class="village-stat-item ${bestClass}">
                                        <div class="village-header">
                                            <span class="village-name">
                                                ${rankDisplay ? `<span class="rank-badge">${rankDisplay}</span> ` : ''}${village.village}
                                                ${isBest ? '<i class="fa-solid fa-trophy" style="color: gold; margin-left: 5px;"></i>' : ''}
                                            </span>
                                            <div class="village-location">
                                                <strong>Village:</strong> ${village.village} | <strong>Sector:</strong> ${village.sector}
                                            </div>
                                        </div>
                                        <div class="village-stats">
                                            <span class="stat-item"><strong>Total:</strong> ${village.total}</span>
                                            <span class="stat-item"><strong>Rate:</strong> ${village.rate}%</span>
                                        </div>
                                        <div class="progress-bar">
                                            <div class="progress-fill ${bestClass}" style="width: ${village.rate}%"></div>
                                        </div>
                                        ${isBest ? '<div class="best-performer-label">🏆 Best in Sector</div>' : ''}
                                    </div>
                                `;
                }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            villageContainerEl.innerHTML = villageHTML;
        }

        // Draw village chart if function is available
        if (typeof drawVillageChart === 'function') {
            drawVillageChart(villages);
        }

        console.log('Village statistics displayed:', villages);
    }

    calculateSectorStatisticsFallback() {
        console.log('Using fallback calculation for sector statistics...');

        // Build a phone → member lookup map for cross-referencing
        const memberMap = {};
        this.membersData.forEach(m => {
            if (m.telephone) memberMap[m.telephone] = m;
        });

        // Group attendance data by sector (resolve from member when missing)
        const sectorData = {};

        this.attendanceData.forEach(record => {
            let sector = record.sector;
            let village = record.village;

            // Resolve sector: check attendance record first, then member data
            if (!sector || sector === 'Unknown') {
                const member = memberMap[record.citizenId];
                if (member) {
                    sector = member.sector;
                    village = village || member.village;
                }
            }

            // Ensure we have labels even if resolution fails
            sector = sector || 'Unnamed Sector';
            village = village || 'Unnamed Village';
            if (sector === 'Unknown') sector = 'Unnamed Sector';
            if (village === 'Unknown') village = 'Unnamed Village';

            if (!sectorData[sector]) {
                sectorData[sector] = {
                    sector: sector,
                    total: 0,
                    present: 0,
                    absent: 0,
                    villages: new Set()
                };
            }
            sectorData[sector].total++;
            if (village && village !== 'Unknown') sectorData[sector].villages.add(village);

            if (record.status === 'present') {
                sectorData[sector].present++;
            } else {
                sectorData[sector].absent++;
            }
        });

        // Convert to array and calculate rates
        const sectors = Object.values(sectorData).map(sector => {
            const rate = sector.total > 0 ? Math.round((sector.present / sector.total) * 100) : 0;
            return {
                ...sector,
                rate: rate,
                villageCount: sector.villages.size,
                villages: Array.from(sector.villages),
                rank: 0,
                isBest: false
            };
        });

        // Sort by rate (highest first)
        sectors.sort((a, b) => b.rate - a.rate);

        // Identify best performing sector
        const bestSector = sectors.length > 0 ? sectors[0] : null;
        if (bestSector) {
            bestSector.rank = 1;
            bestSector.isBest = true;
        }

        // Display sector statistics
        this.displaySectorStatistics(sectors, bestSector);
    }

    calculateVillageStatisticsFallback() {
        console.log('Using fallback calculation for village statistics...');

        // Build a phone → member lookup map for cross-referencing
        const memberMap = {};
        this.membersData.forEach(m => {
            if (m.telephone) memberMap[m.telephone] = m;
        });

        // Group attendance data by village and sector (resolve from member when missing)
        const villageData = {};

        this.attendanceData.forEach(record => {
            let sector = record.sector;
            let village = record.village;

            // Resolve sector/village: check attendance record first, then member data
            if (!sector || sector === 'Unknown' || !village || village === 'Unknown') {
                const member = memberMap[record.citizenId];
                if (member) {
                    sector = sector || member.sector;
                    village = village || member.village;
                }
            }

            // Ensure we have labels even if resolution fails
            sector = sector || 'Unnamed Sector';
            village = village || 'Unnamed Village';
            if (sector === 'Unknown') sector = 'Unnamed Sector';
            if (village === 'Unknown') village = 'Unnamed Village';

            const key = `${sector}-${village}`;

            if (!villageData[key]) {
                villageData[key] = {
                    sector: sector,
                    village: village,
                    total: 0,
                    present: 0,
                    absent: 0
                };
            }
            villageData[key].total++;

            if (record.status === 'present') {
                villageData[key].present++;
            } else {
                villageData[key].absent++;
            }
        });

        // Convert to array and calculate rates
        const villages = Object.values(villageData).map(village => {
            const rate = village.total > 0 ? Math.round((village.present / village.total) * 100) : 0;
            return {
                ...village,
                rate: rate,
                rank: 0,
                isBest: false
            };
        });

        // Sort by rate (highest first)
        villages.sort((a, b) => b.rate - a.rate);

        // Identify best performing village
        const bestVillage = villages.length > 0 ? villages[0] : null;
        if (bestVillage) {
            bestVillage.rank = 1;
            bestVillage.isBest = true;
        }

        // Display village statistics
        this.displayVillageStatistics(villages, bestVillage);
    }

    calculateCellStatisticsFallback() {
        console.log('Using fallback calculation for cell statistics...');

        // Use API-loaded data if present, otherwise fall back to localStorage records
        const members = (Array.isArray(this.membersData) && this.membersData.length) ? this.membersData : (JSON.parse(localStorage.getItem('registerRecords')) || []);
        const attendanceRaw = (Array.isArray(this.attendanceData) && this.attendanceData.length) ? this.attendanceData : ((JSON.parse(localStorage.getItem('umugandaRecords')) || []).concat(JSON.parse(localStorage.getItem('umugandaData')) || []));

        // Build a phone -> member lookup map
        const memberMap = {};
        members.forEach(m => { if (m.telephone) memberMap[String(m.telephone).trim()] = m; });

        // Normalize attendance records
        const attendance = (attendanceRaw || []).map(r => {
            const dateStr = r.date && typeof r.date === 'string' ? r.date : (r.day && typeof r.day === 'string' ? r.day : (r.date ? String(r.date) : ''));
            const day = dateStr.includes('T') ? dateStr.split('T')[0] : (dateStr.substring ? dateStr.substring(0, 10) : dateStr);
            const status = (r.status || (r.checkInMethod ? 'present' : 'present')) && String((r.status || '').toLowerCase());
            const citizenId = r.citizenId || r.telephone || r.memberId || r.name;
            return Object.assign({}, r, { date: dateStr, day, status: status === 'absent' ? 'absent' : 'present', citizenId });
        });

        // Group attendance data by sector + cell
        const cellMap = {};
        attendance.forEach(record => {
            let sector = record.sector;
            let cell = record.cell;

            if (!sector || sector === 'Unknown' || !cell || cell === 'Unknown') {
                const member = memberMap[String(record.citizenId || '').trim()];
                if (member) {
                    sector = sector || member.sector;
                    cell = cell || member.cell;
                }
            }

            sector = sector || 'Unnamed Sector';
            cell = cell || 'Unnamed Cell';

            const key = `${sector}||${cell}`;
            if (!cellMap[key]) cellMap[key] = { sector, cell, total: 0, present: 0, absent: 0 };
            cellMap[key].total++;
            if (record.status === 'present') cellMap[key].present++;
            else cellMap[key].absent++;
        });

        // Convert to array and calculate rates
        const cells = Object.values(cellMap).map(data => ({
            sector: data.sector,
            cell: data.cell,
            total: data.total,
            present: data.present,
            absent: data.absent,
            rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
            isBest: false,
            rank: 0
        }));

        // Sort by rate desc, then by total desc
        cells.sort((a, b) => (b.rate - a.rate) || (b.total - a.total));
        cells.forEach((c, i) => { c.rank = i + 1; c.isBest = i === 0 && c.total > 0; });

        // Display into DOM
        this.displayCellRanking(cells);
    }

    displayCellRanking(cells) {
        console.log('Displaying cell rankings (ranked list)...', cells.length);
        const container = document.getElementById('cellAnalyticsContainer');
        if (!container) {
            console.warn('cellAnalyticsContainer not found');
            return;
        }

        if (!Array.isArray(cells) || cells.length === 0) {
            container.innerHTML = '<p style="color:#666; padding: 20px;">No cell data available</p>';
            return;
        }

        // Sort all cells by performance rate (highest to lowest)
        const sortedCells = [...cells].sort((a, b) => b.rate - a.rate);

        // Find best performing cell
        const bestCell = sortedCells[0];

        // Generate HTML for ranked list
        const cellHTML = sortedCells.map((cell, index) => {
            const rankDisplay = `#${index + 1}`;
            const isBest = bestCell && cell.sector === bestCell.sector && cell.cell === bestCell.cell;
            const rateColor = this.getRateColor(cell.rate);

            return `
                <div class="sector-stat-item ${isBest ? 'best-performer' : ''}">
                    <div class="sector-header">
                        <span class="sector-name">
                            <span class="rank-badge">${rankDisplay}</span> ${cell.cell} <span style="color: #999; font-size: 13px;">| ${cell.sector}</span>
                        </span>
                    </div>
                    <div class="sector-stats">
                        <span class="stat-item"><i class="fa-solid fa-users"></i> ${cell.total} People</span>
                        <span class="stat-item"><i class="fa-solid fa-check"></i> ${cell.present} Present</span>
                        <span class="stat-item"><i class="fa-solid fa-xmark"></i> ${cell.absent} Absent</span>
                        <span class="stat-item"><i class="fa-solid fa-chart-line"></i> <strong style="color: ${rateColor};">${cell.rate}% Rate</strong></span>
                    </div>
                    ${isBest ? '<div class="best-performer-label">🏆 Best Performing Cell</div>' : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = cellHTML;
        console.log('Cell rankings displayed successfully - Total cells:', sortedCells.length);
    }

    getRateColor(rate) {
        if (rate >= 80) return '#27ae60'; // Green
        if (rate >= 50) return '#f39c12'; // Orange
        return '#e74c3c'; // Red
    }

    getPerformanceClass(rate) {
        if (rate >= 80) return 'excellent-performance';
        if (rate >= 50) return 'good-performance';
        return 'poor-performance';
    }

    displayAttendanceCategories(filteredAttendance, totalMembers) {
        const categories = { excellent: 0, good: 0, poor: 0, none: 0 };

        this.membersData.forEach(member => {
            const attendanceRate = this.calculateMemberAttendanceRate(member, filteredAttendance);

            if (attendanceRate === 0) {
                categories.none++;
            } else if (attendanceRate < 50) {
                categories.poor++;
            } else if (attendanceRate < 80) {
                categories.good++;
            } else {
                categories.excellent++;
            }
        });

        // Update category displays
        this.updateCategoryDisplay('excellent', categories.excellent, totalMembers);
        this.updateCategoryDisplay('good', categories.good, totalMembers);
        this.updateCategoryDisplay('poor', categories.poor, totalMembers);
        this.updateCategoryDisplay('none', categories.none, totalMembers);
    }

    calculateMemberAttendanceRate(member, filteredData) {
        const source = filteredData || this.getMonthFilteredData();
        const memberAttendance = source.filter(record => record.citizenId === member.telephone);

        if (memberAttendance.length === 0) return 0;

        const presentCount = memberAttendance.filter(record => record.status === 'present').length;
        return Math.round((presentCount / memberAttendance.length) * 100);
    }

    updateCategoryDisplay(category, count, total) {
        this.updateElement(`${category}Count`, count);

        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const barEl = document.getElementById(`${category}Bar`);
        if (barEl) {
            barEl.style.width = `${percentage}%`;
        }
    }

    displaySchoolDropoutAnalytics() {
        const data    = this.schoolData || {};
        const schools = data.schools || [];
        const records = this.dropoutRecords || [];

        this.updateElement('homeTotalSchools',  data.totalSchools  || 0);
        this.updateElement('homeTotalStudents', data.totalStudents || 0);
        this.updateElement('homeTotalDropouts', data.totalDropouts || 0);
        this.updateElement('homeAverageRate',  `${data.averageRate || 0}%`);

        this.displayPerSchoolStatistics(schools);
        this.displayDropoutRecordsTable(records);
        this.renderSchoolCharts(schools, records);
    }

    displayPerSchoolStatistics(schools) {
        const el = document.getElementById('homeSchoolList');
        if (!el) return;

        if (!schools.length) {
            el.innerHTML = '<p style="color:#999;padding:16px 0;">No school data available yet.</p>';
            return;
        }

        el.innerHTML = schools.map(school => {
            const rate = school.dropoutRate || 0;
            const rateColor = rate >= 20 ? '#e74c3c' : rate >= 10 ? '#f39c12' : '#27ae60';
            return `
                <div class="school-stat-item">
                    <div class="school-stat-header">
                        <span class="school-name"><i class="fa-solid fa-school"></i> ${school.name}</span>
                        <span class="school-leader"><i class="fa-solid fa-user-tie"></i> ${school.schoolLeader || '—'}</span>
                    </div>
                    <div class="school-stats">
                        <span><i class="fa-solid fa-users"></i> ${school.totalStudents} Students</span>
                        <span><i class="fa-solid fa-user-graduate"></i> ${school.dropouts} Dropouts</span>
                        <span style="color:${rateColor};font-weight:700;"><i class="fa-solid fa-percent"></i> ${rate}% Rate</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${rate}%;background:${rateColor};"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    displayDropoutRecordsTable(records) {
        const tbody = document.getElementById('analyticsDropoutTableBody');
        if (!tbody) return;

        if (!records.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#999;">No dropout records submitted yet.</td></tr>';
            return;
        }

        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${r.studentName || ''}</td>
                <td>${r.sex || ''}</td>
                <td>${r.age || ''}</td>
                <td>${r.recentLevel || ''}</td>
                <td>${r.schoolName || ''}</td>
                <td>${r.fatherName || ''}</td>
                <td>${r.motherName || ''}</td>
                <td>${r.guardianPhone || ''}</td>
                <td>${r.date ? new Date(r.date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : ''}</td>
            </tr>
        `).join('');
    }

    // ─── School Charts (Chart.js) ──────────────────────────────────────────

    _destroyChart(id) {
        if (this._schoolCharts[id]) {
            this._schoolCharts[id].destroy();
            delete this._schoolCharts[id];
        }
    }

    _makeChart(id, config) {
        this._destroyChart(id);
        const canvas = document.getElementById(id);
        if (!canvas) return;
        this._schoolCharts[id] = new Chart(canvas.getContext('2d'), config);
    }

    renderSchoolCharts(schools, records) {
        this._renderDropoutBarChart(schools);
        this._renderGenderChart(records);
        this._renderCompareChart(schools);
        this._renderMonthlyChart(records);
        this._renderRateChart(schools);
    }

    _renderDropoutBarChart(schools) {
        if (!schools.length) { this._destroyChart('schoolDropoutBarChart'); return; }
        const labels = schools.map(s => s.name);
        const data   = schools.map(s => s.dropouts || 0);

        this._makeChart('schoolDropoutBarChart', {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Dropout Students',
                    data,
                    backgroundColor: CHART_COLORS.bars.slice(0, labels.length),
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} dropouts` } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Number of Dropouts' } },
                    x: { title: { display: true, text: 'School' } }
                }
            }
        });
    }

    _renderGenderChart(records) {
        const male   = records.filter(r => r.sex === 'Male').length;
        const female = records.filter(r => r.sex === 'Female').length;
        const other  = records.length - male - female;

        if (!records.length) { this._destroyChart('schoolGenderChart'); return; }

        const labels = ['Male', 'Female'];
        const data   = [male, female];
        if (other > 0) { labels.push('Other'); data.push(other); }

        this._makeChart('schoolGenderChart', {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: [CHART_COLORS.secondary, CHART_COLORS.accent, CHART_COLORS.warning],
                    hoverOffset: 8,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / records.length * 100)}%)` } }
                }
            }
        });
    }

    _renderCompareChart(schools) {
        if (!schools.length) { this._destroyChart('schoolCompareChart'); return; }
        const labels   = schools.map(s => s.name);
        const students = schools.map(s => s.totalStudents || 0);
        const dropouts = schools.map(s => s.dropouts || 0);
        const active   = schools.map((s, i) => students[i] - dropouts[i]);

        this._makeChart('schoolCompareChart', {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Active Students', data: active,   backgroundColor: CHART_COLORS.success, borderRadius: 4 },
                    { label: 'Dropouts',         data: dropouts, backgroundColor: CHART_COLORS.accent,  borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Students' } }
                }
            }
        });
    }

    _renderMonthlyChart(records) {
        // Build month → count histogram from dropout record dates
        const counts = {};
        records.forEach(r => {
            if (!r.date) return;
            const d = new Date(r.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        const sortedKeys = Object.keys(counts).sort();
        const labels = sortedKeys.map(k => {
            const [y, m] = k.split('-');
            return `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${y}`;
        });
        const data = sortedKeys.map(k => counts[k]);

        if (!sortedKeys.length) { this._destroyChart('schoolMonthlyChart'); return; }

        this._makeChart('schoolMonthlyChart', {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Dropouts Recorded',
                    data,
                    backgroundColor: CHART_COLORS.purple,
                    borderColor: CHART_COLORS.purple,
                    borderWidth: 1,
                    borderRadius: 3,
                    categoryPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} dropout(s) recorded` } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Records' } },
                    x: { title: { display: true, text: 'Month' } }
                }
            }
        });
    }

    _renderRateChart(schools) {
        if (!schools.length) { this._destroyChart('schoolRateChart'); return; }
        const sorted = [...schools].sort((a, b) => (b.dropoutRate || 0) - (a.dropoutRate || 0));
        const labels = sorted.map(s => s.name);
        const data   = sorted.map(s => s.dropoutRate || 0);
        const colors = data.map(v => v >= 20 ? CHART_COLORS.accent : v >= 10 ? CHART_COLORS.warning : CHART_COLORS.success);

        this._makeChart('schoolRateChart', {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Dropout Rate (%)',
                    data,
                    backgroundColor: colors,
                    borderRadius: 5,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}% dropout rate` } }
                },
                scales: {
                    x: { beginAtZero: true, max: 100, title: { display: true, text: 'Dropout Rate (%)' } }
                }
            }
        });
    }

    // ───────────────────────────────────────────────────────────────────────

    displayAttendanceCharts(todayAttendance) {
        // This would use the existing chart functions from leader-dashboard.js
        // For now, we'll just log the data
        console.log('Attendance data for charts:', todayAttendance);

        // If chart functions are available, call them
        if (typeof drawAttendanceChart === 'function') {
            const chartData = this.prepareChartData(todayAttendance);
            drawAttendanceChart(chartData);
        }
    }

    prepareChartData(todayAttendance) {
        // Prepare data for attendance chart
        const presentCount = todayAttendance.filter(record => record.status === 'present').length;
        const absentCount = todayAttendance.filter(record => record.status === 'absent').length;

        return {
            present: presentCount,
            absent: absentCount,
            total: presentCount + absentCount
        };
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    setupEventListeners() {
        // Setup refresh button if exists
        const refreshBtn = document.getElementById('refreshAnalytics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Setup export buttons if they exist
        const exportBtn = document.getElementById('exportAttendanceData');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAttendanceData());
        }
    }

    async refreshData() {
        console.log('Refreshing analytics data...');
        try {
            await this.loadAllData();
            this.displayAttendanceAnalytics();
            this.displaySchoolDropoutAnalytics();
            this.displayIntekoAttendanceAnalytics();
            this.showSuccessMessage('Analytics data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showErrorMessage('Failed to refresh data');
        }
    }

    exportAttendanceData() {
        // Export attendance data to CSV
        const csvContent = this.convertToCSV(this.attendanceData);
        this.downloadFile('attendance_data.csv', csvContent);
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ];

        return csvRows.join('\n');
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    showSuccessMessage(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'success');
        } else {
            console.log('Success:', message);
        }
    }

    showErrorMessage(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            console.error('Error:', message);
        }
    }

    // ─── Inteko Analytics (same structure as Umuganda) ────────────────────────

    getIntekoFilteredData() {
        // Strictly uses IntekoAttendance model data loaded from /api/inteko-attendance
        const data = this.intekoData;

        if (!this.selectedMonth && !this.selectedYear) return data;

        return data.filter(record => {
            const d = new Date(record.date || record.attendanceDate);
            if (isNaN(d)) return false;
            const monthOk = !this.selectedMonth || d.getMonth() + 1 === this.selectedMonth;
            const yearOk  = !this.selectedYear  || d.getFullYear() === this.selectedYear;
            return monthOk && yearOk;
        });
    }

    displayIntekoAttendanceAnalytics() {
        const records = this.getIntekoFilteredData();
        this._displayIntekoPerformanceBreakdown(records);
        this._displayIntekoSectorStatistics(records);
        this._displayIntekoCellStatistics(records);
        this._displayIntekoVillageStatistics(records);
    }

    // Overview: performance breakdown (mirrors displayAttendanceCategories)
    _displayIntekoPerformanceBreakdown(records) {
        const members = this.membersData.length
            ? this.membersData
            : (JSON.parse(localStorage.getItem('registerRecords')) || []);

        const cats  = { excellent: 0, good: 0, poor: 0, none: 0 };
        const total = members.length || 1;

        members.forEach(member => {
            const id = member.telephone;
            const memberRecs = records.filter(r => r.citizenId === id || r.telephone === id);
            let score = 0;
            if (memberRecs.length > 0) {
                const present = memberRecs.filter(r => r.status === 'present').length;
                score = Math.round((present / memberRecs.length) * 100);
            }
            // No localStorage fallback — only IntekoAttendance model data counts
            if (score >= 80)      cats.excellent++;
            else if (score >= 50) cats.good++;
            else if (score > 0)   cats.poor++;
            else                  cats.none++;
        });

        ['excellent', 'good', 'poor', 'none'].forEach(cat => {
            const key = `inteko${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
            this.updateElement(`${key}Count`, cats[cat]);
            const pct = Math.round((cats[cat] / total) * 100);
            const bar = document.getElementById(`${key}Bar`);
            if (bar) bar.style.width = `${pct}%`;
        });
    }

    // Sector Analytics (mirrors displaySectorStatistics)
    _displayIntekoSectorStatistics(records) {
        const memberMap = {};
        this.membersData.forEach(m => { if (m.telephone) memberMap[m.telephone] = m; });

        const sectorData = {};
        records.forEach(record => {
            let sector  = record.sector;
            let village = record.village;
            if (!sector || sector === 'Unknown') {
                const m = memberMap[record.citizenId || record.telephone];
                if (m) { sector = m.sector; village = village || m.village; }
            }
            sector  = sector  || 'Unnamed Sector';
            village = village || 'Unnamed Village';

            if (!sectorData[sector]) sectorData[sector] = { sector, total: 0, present: 0, absent: 0, villages: new Set() };
            sectorData[sector].total++;
            if (village !== 'Unknown') sectorData[sector].villages.add(village);
            if (record.status === 'present') sectorData[sector].present++;
            else sectorData[sector].absent++;
        });

        const sectors = Object.values(sectorData).map(s => ({
            ...s,
            rate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
            villageCount: s.villages.size,
            villages: Array.from(s.villages),
            rank: 0, isBest: false
        })).sort((a, b) => b.rate - a.rate);

        sectors.forEach((s, i) => { s.rank = i + 1; s.isBest = i === 0 && s.total > 0; });

        // Render details list
        const detailsEl = document.getElementById('intekoSectorDetails');
        if (detailsEl) {
            detailsEl.innerHTML = sectors.length
                ? sectors.map(s => `
                    <div class="sector-stat-item ${s.isBest ? 'best-performer' : ''}">
                        <div class="sector-header">
                            <span class="sector-name">
                                <span class="rank-badge">#${s.rank}</span> ${s.sector}
                            </span>
                        </div>
                        <div class="sector-stats">
                            <span class="stat-item"><i class="fa-solid fa-users"></i> ${s.total} People</span>
                            <span class="stat-item"><i class="fa-solid fa-check"></i> ${s.present} Present</span>
                            <span class="stat-item"><i class="fa-solid fa-xmark"></i> ${s.absent} Absent</span>
                            <span class="stat-item"><i class="fa-solid fa-chart-line"></i> ${s.rate}% Rate</span>
                        </div>
                        ${s.isBest ? '<div class="best-performer-label">🏆 Best Performing Sector</div>' : ''}
                    </div>`).join('')
                : '<p style="color:#999;padding:16px;">No inteko sector data yet.</p>';
        }

        // Render chart (same style as Umuganda sector chart)
        this._destroyChart('intekoSectorChart');
        const canvas = document.getElementById('intekoSectorChart');
        if (canvas && sectors.length) {
            this._schoolCharts['intekoSectorChart'] = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sectors.map(s => s.sector),
                    datasets: [
                        { label: 'Present', data: sectors.map(s => s.present), backgroundColor: CHART_COLORS.success, borderRadius: 4 },
                        { label: 'Absent',  data: sectors.map(s => s.absent),  backgroundColor: CHART_COLORS.accent,  borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Records' } }
                    }
                }
            });
        }
    }

    // Cell Analytics (mirrors displayCellRanking)
    _displayIntekoCellStatistics(records) {
        const memberMap = {};
        this.membersData.forEach(m => { if (m.telephone) memberMap[m.telephone] = m; });

        const cellMap = {};
        records.forEach(record => {
            let sector = record.sector;
            let cell   = record.cell;
            if (!sector || !cell || sector === 'Unknown' || cell === 'Unknown') {
                const m = memberMap[record.citizenId || record.telephone];
                if (m) { sector = sector || m.sector; cell = cell || m.cell; }
            }
            sector = sector || 'Unnamed Sector';
            cell   = cell   || 'Unnamed Cell';

            const key = `${sector}||${cell}`;
            if (!cellMap[key]) cellMap[key] = { sector, cell, total: 0, present: 0, absent: 0 };
            cellMap[key].total++;
            if (record.status === 'present') cellMap[key].present++;
            else cellMap[key].absent++;
        });

        const cells = Object.values(cellMap).map(c => ({
            ...c,
            rate: c.total > 0 ? Math.round((c.present / c.total) * 100) : 0,
            rank: 0, isBest: false
        })).sort((a, b) => (b.rate - a.rate) || (b.total - a.total));

        cells.forEach((c, i) => { c.rank = i + 1; c.isBest = i === 0 && c.total > 0; });

        const container = document.getElementById('intekoCellAnalyticsContainer');
        if (!container) return;

        if (!cells.length) {
            container.innerHTML = '<p style="color:#999;padding:20px;">No inteko cell data yet.</p>';
            return;
        }

        container.innerHTML = cells.map((cell, index) => {
            const isBest    = cell.isBest;
            const rateColor = this.getRateColor(cell.rate);
            return `
                <div class="sector-stat-item ${isBest ? 'best-performer' : ''}">
                    <div class="sector-header">
                        <span class="sector-name">
                            <span class="rank-badge">#${index + 1}</span> ${cell.cell}
                            <span style="color:#999;font-size:13px;">| ${cell.sector}</span>
                        </span>
                    </div>
                    <div class="sector-stats">
                        <span class="stat-item"><i class="fa-solid fa-users"></i> ${cell.total} People</span>
                        <span class="stat-item"><i class="fa-solid fa-check"></i> ${cell.present} Present</span>
                        <span class="stat-item"><i class="fa-solid fa-xmark"></i> ${cell.absent} Absent</span>
                        <span class="stat-item"><i class="fa-solid fa-chart-line"></i>
                            <strong style="color:${rateColor};">${cell.rate}% Rate</strong>
                        </span>
                    </div>
                    ${isBest ? '<div class="best-performer-label">🏆 Best Performing Cell</div>' : ''}
                </div>`;
        }).join('');
    }

    // Village Analytics (mirrors displayVillageStatistics)
    _displayIntekoVillageStatistics(records) {
        const memberMap = {};
        this.membersData.forEach(m => { if (m.telephone) memberMap[m.telephone] = m; });

        const villageData = {};
        records.forEach(record => {
            let sector  = record.sector;
            let village = record.village;
            if (!sector || !village || sector === 'Unknown' || village === 'Unknown') {
                const m = memberMap[record.citizenId || record.telephone];
                if (m) { sector = sector || m.sector; village = village || m.village; }
            }
            sector  = sector  || 'Unnamed Sector';
            village = village || 'Unnamed Village';

            const key = `${sector}-${village}`;
            if (!villageData[key]) villageData[key] = { sector, village, total: 0, present: 0, absent: 0 };
            villageData[key].total++;
            if (record.status === 'present') villageData[key].present++;
            else villageData[key].absent++;
        });

        const villages = Object.values(villageData).map(v => ({
            ...v,
            rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
            rank: 0, isBest: false
        })).sort((a, b) => b.rate - a.rate);

        villages.forEach((v, i) => { v.rank = i + 1; v.isBest = i === 0 && v.total > 0; });

        // Group by sector for display
        const bySector = {};
        villages.forEach(v => {
            if (!bySector[v.sector]) bySector[v.sector] = [];
            bySector[v.sector].push(v);
        });

        const containerEl = document.getElementById('intekoVillageBreakdownContainer');
        if (containerEl) {
            containerEl.innerHTML = Object.keys(bySector).length
                ? Object.entries(bySector).map(([sector, vs]) => `
                    <div class="village-sector-group">
                        <h5><strong>Sector:</strong> ${sector}</h5>
                        <div class="village-list">
                            ${vs.map(v => `
                                <div class="village-stat-item ${v.isBest ? 'best-performer' : ''}">
                                    <div class="village-header">
                                        <span class="village-name">
                                            ${v.rank ? `<span class="rank-badge">#${v.rank}</span> ` : ''}${v.village}
                                            ${v.isBest ? '<i class="fa-solid fa-trophy" style="color:gold;margin-left:5px;"></i>' : ''}
                                        </span>
                                    </div>
                                    <div class="village-stats">
                                        <span class="stat-item"><strong>Total:</strong> ${v.total}</span>
                                        <span class="stat-item"><strong>Present:</strong> ${v.present}</span>
                                        <span class="stat-item"><strong>Absent:</strong> ${v.absent}</span>
                                        <span class="stat-item"><strong>Rate:</strong> ${v.rate}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill ${v.isBest ? 'best-performer' : ''}" style="width:${v.rate}%"></div>
                                    </div>
                                    ${v.isBest ? '<div class="best-performer-label">🏆 Best in Sector</div>' : ''}
                                </div>`).join('')}
                        </div>
                    </div>`).join('')
                : '<p style="color:#999;padding:16px;">No inteko village data yet.</p>';
        }

        // Village chart
        this._destroyChart('intekoVillageChart');
        const canvas = document.getElementById('intekoVillageChart');
        if (canvas && villages.length) {
            this._schoolCharts['intekoVillageChart'] = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: villages.map(v => `${v.village} (${v.sector})`),
                    datasets: [
                        { label: 'Present', data: villages.map(v => v.present), backgroundColor: CHART_COLORS.success, borderRadius: 4 },
                        { label: 'Absent',  data: villages.map(v => v.absent),  backgroundColor: CHART_COLORS.accent,  borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Records' } }
                    }
                }
            });
        }
    }
}

// Initialize analytics page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Analytics page loaded, initializing...');
    new AnalyticsPage();
});
