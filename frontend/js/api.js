// API Service for Frontend-Backend Connection
class ApiService {
    constructor() {
        this.baseURL = 'https://backen-community-level-servece-delivery-system-production.up.railway.app/api';
    }

    // Home Updates API
    async getHomeUpdates() {
        try {
            const response = await fetch(`${this.baseURL}/home-updates`);
            if (!response.ok) throw new Error('Failed to fetch home updates');
            return await response.json();
        } catch (error) {
            console.error('Error fetching home updates:', error);
            return [];
        }
    }

    async createHomeUpdate(updateData, imageFile) {
        const formData = new FormData();
        Object.keys(updateData).forEach(key => formData.append(key, updateData[key]));
        if (imageFile) formData.append('image', imageFile);
        const response = await fetch(`${this.baseURL}/home-updates`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || `Server error ${response.status}`);
        }
        return await response.json();
    }

    async updateHomeUpdate(id, updateData, imageFile) {
        const formData = new FormData();
        Object.keys(updateData).forEach(key => formData.append(key, updateData[key]));
        if (imageFile) formData.append('image', imageFile);
        const response = await fetch(`${this.baseURL}/home-updates/${id}`, {
            method: 'PUT',
            body: formData
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || `Server error ${response.status}`);
        }
        return await response.json();
    }

    async deleteHomeUpdate(id) {
        const response = await fetch(`${this.baseURL}/home-updates/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || `Server error ${response.status}`);
        }
        return await response.json();
    }

    // Members API
    async getMembers(filters = {}) {
        try {
            const queryString = new URLSearchParams(filters).toString();
            const response = await fetch(`${this.baseURL}/members?${queryString}`);
            if (!response.ok) throw new Error('Failed to fetch members');
            return await response.json();
        } catch (error) {
            console.error('Error fetching members:', error);
            return [];
        }
    }

    async createMember(memberData) {
        const response = await fetch(`${this.baseURL}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memberData)
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || `Server error ${response.status}`);
        }
        return await response.json();
    }

    async updateMember(memberId, memberData) {
        try {
            const response = await fetch(`${this.baseURL}/members/${memberId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(memberData)
            });
            
            if (!response.ok) throw new Error('Failed to update member');
            return await response.json();
        } catch (error) {
            console.error('Error updating member:', error);
            throw error;
        }
    }

    async deleteMember(memberId) {
        try {
            const response = await fetch(`${this.baseURL}/members/${memberId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete member');
            return await response.json();
        } catch (error) {
            console.error('Error deleting member:', error);
            throw error;
        }
    }

    async getSchoolDropoutStatistics() {
        try {
            const response = await fetch(`${this.baseURL}/schools/dropout-statistics`);
            if (!response.ok) throw new Error('Failed to fetch school dropout statistics');
            return await response.json();
        } catch (error) {
            console.error('Error fetching school dropout statistics:', error);
            throw error;
        }
    }

    async getSchools(ownerEmail) {
        try {
            const params = ownerEmail ? `?ownerEmail=${encodeURIComponent(ownerEmail)}` : '';
            const response = await fetch(`${this.baseURL}/schools${params}`);
            if (!response.ok) throw new Error('Failed to fetch schools');
            return await response.json();
        } catch (error) {
            console.error('Error fetching schools:', error);
            throw error;
        }
    }

    async saveSchool(data) {
        try {
            const response = await fetch(`${this.baseURL}/schools`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to save school');
            return await response.json();
        } catch (error) {
            console.error('Error saving school:', error);
            throw error;
        }
    }

    async getDropoutRecords(ownerEmail) {
        try {
            const params = ownerEmail ? `?ownerEmail=${encodeURIComponent(ownerEmail)}` : '';
            const response = await fetch(`${this.baseURL}/schools/dropout-records${params}`);
            if (!response.ok) throw new Error('Failed to fetch dropout records');
            return await response.json();
        } catch (error) {
            console.error('Error fetching dropout records:', error);
            throw error;
        }
    }

    async saveDropoutRecord(data) {
        try {
            const response = await fetch(`${this.baseURL}/schools/dropout-records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to save dropout record');
            return await response.json();
        } catch (error) {
            console.error('Error saving dropout record:', error);
            throw error;
        }
    }

    async getBestPerformingSectors(limit = 10, date, month, year) {
        try {
            const params = new URLSearchParams();
            params.append('limit', limit);
            if (date) params.append('date', date);
            if (month) params.append('month', month);
            if (year) params.append('year', year);

            const response = await fetch(`${this.baseURL}/attendance/best-sectors?${params}`);
            
            if (!response.ok) throw new Error('Failed to fetch best performing sectors');
            return await response.json();
        } catch (error) {
            console.error('Error fetching best performing sectors:', error);
            throw error;
        }
    }

    async getBestPerformingVillages(limit = 10, sector, date, month, year) {
        try {
            const params = new URLSearchParams();
            params.append('limit', limit);
            if (sector) params.append('sector', sector);
            if (date) params.append('date', date);
            if (month) params.append('month', month);
            if (year) params.append('year', year);
            
            const response = await fetch(`${this.baseURL}/attendance/best-villages?${params}`);
            
            if (!response.ok) throw new Error('Failed to fetch best performing villages');
            return await response.json();
        } catch (error) {
            console.error('Error fetching best performing villages:', error);
            throw error;
        }
    }

    async getBestPerformingCells(limit = 10, sector, date, month, year) {
        try {
            const params = new URLSearchParams();
            params.append('limit', limit);
            if (sector) params.append('sector', sector);
            if (date) params.append('date', date);
            if (month) params.append('month', month);
            if (year) params.append('year', year);

            const response = await fetch(`${this.baseURL}/attendance/best-cells?${params}`);
            if (!response.ok) throw new Error('Failed to fetch best performing cells');
            return await response.json();
        } catch (error) {
            console.error('Error fetching best performing cells:', error);
            throw error;
        }
    }

    async getPerformanceRankings(date) {
        try {
            const queryString = date ? `?date=${date}` : '';
            const response = await fetch(`${this.baseURL}/attendance/performance-rankings${queryString}`);
            
            if (!response.ok) throw new Error('Failed to fetch performance rankings');
            return await response.json();
        } catch (error) {
            console.error('Error fetching performance rankings:', error);
            throw error;
        }
    }

    // Attendance API
    async getAttendance(filters = {}) {
        try {
            const queryString = new URLSearchParams(filters).toString();
            const response = await fetch(`${this.baseURL}/attendance?${queryString}`);
            if (!response.ok) throw new Error('Failed to fetch attendance');
            return await response.json();
        } catch (error) {
            console.error('Error fetching attendance:', error);
            return [];
        }
    }

    async saveAttendance(attendanceData) {
        try {
            const response = await fetch(`${this.baseURL}/attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(attendanceData)
            });
            
            if (!response.ok) throw new Error('Failed to save attendance');
            return await response.json();
        } catch (error) {
            console.error('Error saving attendance:', error);
            throw error;
        }
    }

    // Inteko API
    async getIntekoRecords() {
        try {
            const response = await fetch(`${this.baseURL}/inteko`);
            if (!response.ok) throw new Error('Failed to fetch Inteko records');
            return await response.json();
        } catch (error) {
            console.error('Error fetching Inteko records:', error);
            return [];
        }
    }

    async createIntekoRecord(data) {
        try {
            const response = await fetch(`${this.baseURL}/inteko`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create Inteko record');
            return await response.json();
        } catch (error) {
            console.error('Error creating Inteko record:', error);
            throw error;
        }
    }

    // Citizen Reports API
    async getCitizenReports(filters = {}) {
        try {
            const queryString = new URLSearchParams(filters).toString();
            const response = await fetch(`${this.baseURL}/citizen-reports?${queryString}`);
            if (!response.ok) throw new Error('Failed to fetch citizen reports');
            return await response.json();
        } catch (error) {
            console.error('Error fetching citizen reports:', error);
            return [];
        }
    }

    async createCitizenReport(data) {
        try {
            const response = await fetch(`${this.baseURL}/citizen-reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create citizen report');
            return await response.json();
        } catch (error) {
            console.error('Error creating citizen report:', error);
            throw error;
        }
    }

    async updateCitizenReport(id, data) {
        try {
            const response = await fetch(`${this.baseURL}/citizen-reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to update citizen report');
            return await response.json();
        } catch (error) {
            console.error('Error updating citizen report:', error);
            throw error;
        }
    }

    async deleteCitizenReport(id) {
        try {
            const response = await fetch(`${this.baseURL}/citizen-reports/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete citizen report');
            return await response.json();
        } catch (error) {
            console.error('Error deleting citizen report:', error);
            throw error;
        }
    }

    // Leader Reports API
    async getLeaderReports(filters = {}) {
        try {
            const queryString = new URLSearchParams(filters).toString();
            const response = await fetch(`${this.baseURL}/leader-reports?${queryString}`);
            if (!response.ok) throw new Error('Failed to fetch leader reports');
            return await response.json();
        } catch (error) {
            console.error('Error fetching leader reports:', error);
            return [];
        }
    }

    async createLeaderReport(data) {
        try {
            const response = await fetch(`${this.baseURL}/leader-reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.error || `Server error ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating leader report:', error);
            throw error;
        }
    }

    async updateLeaderReport(id, data) {
        try {
            const response = await fetch(`${this.baseURL}/leader-reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to update leader report');
            return await response.json();
        } catch (error) {
            console.error('Error updating leader report:', error);
            throw error;
        }
    }

    async deleteLeaderReport(id) {
        try {
            const response = await fetch(`${this.baseURL}/leader-reports/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete leader report');
            return await response.json();
        } catch (error) {
            console.error('Error deleting leader report:', error);
            throw error;
        }
    }

    // Inteko Attendance API
    async saveIntekoAttendanceRecord(data) {
        try {
            const response = await fetch(`${this.baseURL}/inteko-attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Server error ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error saving inteko attendance:', error);
            throw error;
        }
    }

    async getIntekoAttendance(filters = {}) {
        try {
            const queryString = new URLSearchParams(filters).toString();
            const response = await fetch(`${this.baseURL}/inteko-attendance?${queryString}`);
            if (!response.ok) throw new Error('Failed to fetch inteko attendance');
            return await response.json();
        } catch (error) {
            console.error('Error fetching inteko attendance:', error);
            return [];
        }
    }

    // Leader Profiles API

    // Uploads photo to Cloudinary via /api/leader-profiles/upload-photo
    // Returns { url, publicId } — url is the Cloudinary HTTPS URL
    async uploadLeaderPhoto(imageFile) {
        try {
            const formData = new FormData();
            formData.append('photo', imageFile);
            const response = await fetch(`${this.baseURL}/leader-profiles/upload-photo`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Upload failed: ${response.status}`);
            }
            return await response.json(); // { url, publicId }
        } catch (error) {
            console.error('Error uploading leader photo:', error);
            throw error;
        }
    }

    async saveLeaderProfile(data) {
        try {
            const response = await fetch(`${this.baseURL}/leader-profiles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Server error ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error saving leader profile:', error);
            throw error;
        }
    }

    async getLeaderProfiles() {
        try {
            const response = await fetch(`${this.baseURL}/leader-profiles`);
            if (!response.ok) throw new Error('Failed to fetch leader profiles');
            return await response.json();
        } catch (error) {
            console.error('Error fetching leader profiles:', error);
            return [];
        }
    }

    async getLeaderProfileByEmail(email) {
        try {
            const response = await fetch(`${this.baseURL}/leader-profiles/by-email/${encodeURIComponent(email)}`);
            if (response.status === 404) return null;
            if (!response.ok) throw new Error('Failed to fetch leader profile');
            return await response.json();
        } catch (error) {
            console.error('Error fetching leader profile:', error);
            return null;
        }
    }

    async deleteLeaderProfile(id) {
        try {
            const response = await fetch(`${this.baseURL}/leader-profiles/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete leader profile');
            return await response.json();
        } catch (error) {
            console.error('Error deleting leader profile:', error);
            throw error;
        }
    }

    // Locations API
    async getLocations() {
        try {
            const response = await fetch(`${this.baseURL}/locations`);
            if (!response.ok) throw new Error('Failed to fetch locations');
            return await response.json();
        } catch (error) {
            console.error('Error fetching locations:', error);
            return [];
        }
    }

    async createLocations(data) {
        try {
            const response = await fetch(`${this.baseURL}/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create locations');
            return await response.json();
        } catch (error) {
            console.error('Error creating locations:', error);
            throw error;
        }
    }

    async updateLocations(id, data) {
        try {
            const response = await fetch(`${this.baseURL}/locations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to update locations');
            return await response.json();
        } catch (error) {
            console.error('Error updating locations:', error);
            throw error;
        }
    }

    // Image Upload API
    async uploadImage(imageFile) {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            
            const response = await fetch(`${this.baseURL}/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Failed to upload image');
            return await response.json();
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }
}

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
} else {
    window.ApiService = ApiService;
}
