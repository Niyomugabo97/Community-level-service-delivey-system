// Analytics Page JavaScript - Database Connectivity and Data Retrieval

class AnalyticsPage {
    constructor() {
        this.api = new ApiService();
        this.attendanceData = [];
        this.membersData = [];
        this.schoolData = [];
        this.init();
    }

    async init() {
        console.log('Initializing Analytics Page...');
        try {
            await this.loadAllData();
            this.displayAttendanceAnalytics();
            this.displaySchoolDropoutAnalytics();
            this.setupEventListeners();
            
            // Set up automatic refresh every 10 seconds to show changes from leaders automatically
            this.setupAutoRefresh(10000);
            
        } catch (error) {
            console.error('Error initializing analytics page:', error);
            this.showErrorMessage('Failed to load analytics data');
        }
    }

    setupAutoRefresh(intervalMs) {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        
        this.refreshTimer = setInterval(async () => {
            // Only refresh if the page is currently being viewed
            if (document.visibilityState === 'visible') {
                console.log('Auto-refreshing analytics data...');
                try {
                    await this.loadAllData();
                    this.displayAttendanceAnalytics();
                    this.displaySchoolDropoutAnalytics();
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                }
            }
        }, intervalMs);
        
        console.log(`Auto-refresh enabled: every ${intervalMs/1000}s`);
    }

    async loadAllData() {
        console.log('Loading data from database...');
        try {
            // Load all data in parallel
            const [members, attendance, schools] = await Promise.all([
                this.api.getMembers(),
                this.api.getAttendance(),
                this.loadSchoolData()
            ]);

            this.membersData = members || [];
            this.attendanceData = attendance || [];
            this.schoolData = schools || [];

            console.log('Data loaded successfully:', {
                members: this.membersData.length,
                attendance: this.attendanceData.length,
                schools: this.schoolData.length
            });
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    async loadSchoolData() {
        // Load school dropout data from database API
        try {
            const schoolData = await this.api.getSchoolDropoutStatistics();
            console.log('School dropout data loaded from database:', schoolData);
            return schoolData;
        } catch (error) {
            console.error('Error loading school data from API, using fallback:', error);
            // Fallback to generated data if API fails
            const members = await this.api.getMembers();
            return this.generateSchoolDropoutData(members);
        }
    }

    generateSchoolDropoutData(members) {
        // Generate school dropout statistics from member data
        const schoolStats = {
            totalSchools: 0,
            totalDropouts: 0,
            averageRate: 0,
            schools: []
        };

        // Group members by sector/village as "schools"
        const schoolGroups = {};
        members.forEach(member => {
            const schoolKey = `${member.sector}-${member.village}`;
            if (!schoolGroups[schoolKey]) {
                schoolGroups[schoolKey] = {
                    name: schoolKey,
                    totalStudents: 0,
                    dropouts: 0
                };
            }
            schoolGroups[schoolKey].totalStudents++;
            
            // Simulate dropout logic (you can modify this based on your actual dropout criteria)
            if (member.age && member.age > 18 && !member.telephone) {
                schoolGroups[schoolKey].dropouts++;
                schoolStats.totalDropouts++;
            }
        });

        schoolStats.schools = Object.values(schoolGroups);
        schoolStats.totalSchools = schoolStats.schools.length;
        schoolStats.averageRate = schoolStats.totalStudents > 0 
            ? Math.round((schoolStats.totalDropouts / schoolStats.totalStudents) * 100) 
            : 0;

        return schoolStats;
    }

    displayAttendanceAnalytics() {
        console.log('Displaying attendance analytics...');
        
        // Calculate attendance statistics
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = this.attendanceData.filter(record => 
            record.date && record.date.split('T')[0] === today
        );

        const totalMembers = this.membersData.length;

        // Calculate and display categories
        this.displayAttendanceCategories(todayAttendance, totalMembers);

        // Display charts if functions are available
        if (typeof drawAttendanceChart === 'function') {
            this.displayAttendanceCharts(todayAttendance);
        }

        // Calculate and display comprehensive sector and village statistics
        this.displayComprehensiveSectorStatistics();
        this.displayComprehensiveVillageStatistics();

        console.log('Attendance analytics displayed (charts and categories only):', {
            totalMembers,
            todayAttendance: todayAttendance.length
        });
    }

    async displayComprehensiveSectorStatistics() {
        console.log('Fetching comprehensive sector statistics from database...');
        
        try {
            // Fetch best performing sectors from database
            const sectors = await this.api.getBestPerformingSectors(1000); // Get all sectors
            const bestSector = sectors.length > 0 ? sectors[0] : null;

            // Display sector statistics
            this.displaySectorStatistics(sectors, bestSector);

            console.log('Sector statistics fetched from database:', { sectors, bestSector });
        } catch (error) {
            console.error('Error fetching sector statistics from database, using fallback:', error);
            
            // Fallback to calculation from existing data
            this.calculateSectorStatisticsFallback();
        }
    }

    async displayComprehensiveVillageStatistics() {
        console.log('Fetching comprehensive village statistics from database...');
        
        try {
            // Fetch best performing villages from database
            const villages = await this.api.getBestPerformingVillages(1000); // Get all villages
            const bestVillage = villages.length > 0 ? villages[0] : null;

            // Display village statistics
            this.displayVillageStatistics(villages, bestVillage);

            console.log('Village statistics fetched from database:', { villages, bestVillage });
        } catch (error) {
            console.error('Error fetching village statistics from database, using fallback:', error);
            
            // Fallback to calculation from existing data
            this.calculateVillageStatisticsFallback();
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

    displayAttendanceCategories(todayAttendance, totalMembers) {
        const categories = {
            excellent: 0,
            good: 0,
            poor: 0,
            none: 0
        };

        // Calculate attendance categories for all members
        this.membersData.forEach(member => {
            const memberAttendance = todayAttendance.find(record => record.citizenId === member.telephone);
            const attendanceRate = this.calculateMemberAttendanceRate(member);
            
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

    calculateMemberAttendanceRate(member) {
        const memberAttendance = this.attendanceData.filter(record => 
            record.citizenId === member.telephone
        );
        
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
        console.log('Displaying school dropout analytics...');
        
        if (!this.schoolData || !this.schoolData.schools) {
            console.log('No school data available');
            return;
        }

        // Update school statistics
        this.updateElement('homeTotalSchools', this.schoolData.totalSchools);
        this.updateElement('homeTotalDropouts', this.schoolData.totalDropouts);
        this.updateElement('homeAverageRate', `${this.schoolData.averageRate}%`);

        // Display per-school statistics
        this.displayPerSchoolStatistics(this.schoolData.schools);

        console.log('School dropout analytics displayed:', this.schoolData);
    }

    displayPerSchoolStatistics(schools) {
        const schoolListEl = document.getElementById('homeSchoolList');
        if (!schoolListEl) return;

        if (schools.length === 0) {
            schoolListEl.innerHTML = '<p>No school data available</p>';
            return;
        }

        const schoolListHTML = schools.map(school => {
            const rate = school.totalStudents > 0 
                ? Math.round((school.dropouts / school.totalStudents) * 100) 
                : 0;
            
            return `
                <div class="school-stat-item">
                    <h4>${school.name}</h4>
                    <div class="school-stats">
                        <span>Total Students: ${school.totalStudents}</span>
                        <span>Dropouts: ${school.dropouts}</span>
                        <span>Rate: ${rate}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${rate}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        schoolListEl.innerHTML = schoolListHTML;
    }

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
}

// Initialize analytics page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Analytics page loaded, initializing...');
    new AnalyticsPage();
});
