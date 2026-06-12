// ============================================================
// LEADER PROFILE SECTION (#14)
// ============================================================

const leaderProfileApi = new ApiService();

let currentProfileId = null;
let profilePhotoUrl = '';
let profilePhotoPublicId = '';

async function initLeaderProfile() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const email = currentUser.email;
    if (!email) return;

    try {
        const profile = await leaderProfileApi.getLeaderProfileByEmail(email);
        if (profile) {
            // Load saved profile
            currentProfileId = profile._id;
            profilePhotoUrl = profile.photoUrl || '';
            profilePhotoPublicId = profile.photoPublicId || '';
            document.getElementById('profileName').value = profile.name || '';
            document.getElementById('profileRole').value = profile.role || '';
            document.getElementById('profileSector').value = profile.sector || '';
            document.getElementById('profileCell').value = profile.cell || '';
            document.getElementById('profileVillage').value = profile.village || '';
            document.getElementById('profileTelephone').value = profile.telephone || '';
            document.getElementById('profileBio').value = profile.bio || '';
            if (profile.photoUrl) {
                document.getElementById('profilePhotoPreview').innerHTML =
                    '<img src="' + profile.photoUrl + '" alt="Profile photo">';
            }
            document.getElementById('deleteProfileBtn').style.display = 'inline-flex';
        } else {
            // Pre-fill from session account data
            document.getElementById('profileName').value = currentUser.name || '';
            document.getElementById('profileSector').value = currentUser.sector || '';
            document.getElementById('profileCell').value = currentUser.cell || '';
            document.getElementById('profileVillage').value = currentUser.village || '';
            document.getElementById('profileTelephone').value = currentUser.telephone || '';
        }
        updateLeaderCardPreview();
    } catch (e) {
        console.warn('Could not load leader profile:', e);
        // Still pre-fill from session on error
        document.getElementById('profileName').value = currentUser.name || '';
        document.getElementById('profileSector').value = currentUser.sector || '';
        document.getElementById('profileCell').value = currentUser.cell || '';
        document.getElementById('profileVillage').value = currentUser.village || '';
        document.getElementById('profileTelephone').value = currentUser.telephone || '';
        updateLeaderCardPreview();
    }
}

function updateLeaderCardPreview() {
    const name      = document.getElementById('profileName').value.trim();
    const role      = document.getElementById('profileRole').value.trim();
    const sector    = document.getElementById('profileSector').value.trim();
    const cell      = document.getElementById('profileCell').value.trim();
    const village   = document.getElementById('profileVillage').value.trim();
    const telephone = document.getElementById('profileTelephone').value.trim();
    const bio       = document.getElementById('profileBio').value.trim();

    if (!name && !sector) {
        document.getElementById('leaderCardPreview').style.display = 'none';
        return;
    }
    document.getElementById('leaderCardPreview').style.display = 'block';

    document.getElementById('previewName').textContent = name || '—';
    document.getElementById('previewRole').textContent = role || 'Village Leader';
    document.getElementById('previewLocation').textContent =
        [village, cell, sector].filter(Boolean).join(', ') || '—';
    document.getElementById('previewTelephone').textContent = telephone || '—';
    document.getElementById('previewBio').textContent = bio;

    const previewPhoto = document.getElementById('previewPhoto');
    if (profilePhotoUrl) {
        previewPhoto.innerHTML = '<img src="' + profilePhotoUrl + '" alt="Profile photo">';
    } else {
        previewPhoto.innerHTML = '<i class="fa-solid fa-user-tie"></i>';
    }
}

async function handleProfilePhotoUpload(file) {
    const statusEl = document.getElementById('profilePhotoUploadStatus');
    statusEl.textContent = 'Uploading to Cloudinary...';
    statusEl.style.color = '#888';
    try {
        // Uses /api/leader-profiles/upload-photo → Cloudinary folder: leader_profiles
        const result = await leaderProfileApi.uploadLeaderPhoto(file);
        profilePhotoUrl = result.url || '';       // full Cloudinary HTTPS URL
        profilePhotoPublicId = result.publicId || ''; // stored for later deletion
        document.getElementById('profilePhotoPreview').innerHTML =
            '<img src="' + profilePhotoUrl + '" alt="Profile photo">';
        statusEl.textContent = 'Photo uploaded to Cloudinary!';
        statusEl.style.color = 'green';
        updateLeaderCardPreview();
    } catch (e) {
        statusEl.textContent = 'Upload failed: ' + e.message;
        statusEl.style.color = 'red';
    }
}

async function saveLeaderProfile(e) {
    e.preventDefault();
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const email = currentUser.email;
    if (!email) {
        showProfileStatus('You must be logged in to save a profile.', 'error');
        return;
    }

    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const data = {
        email,
        name:           document.getElementById('profileName').value.trim(),
        role:           document.getElementById('profileRole').value.trim() || 'Village Leader',
        sector:         document.getElementById('profileSector').value.trim(),
        cell:           document.getElementById('profileCell').value.trim(),
        village:        document.getElementById('profileVillage').value.trim(),
        telephone:      document.getElementById('profileTelephone').value.trim(),
        bio:            document.getElementById('profileBio').value.trim(),
        photoUrl:       profilePhotoUrl,
        photoPublicId:  profilePhotoPublicId
    };

    try {
        const saved = await leaderProfileApi.saveLeaderProfile(data);
        currentProfileId = saved._id;
        document.getElementById('deleteProfileBtn').style.display = 'inline-flex';
        showProfileStatus('Profile saved! It is now visible on the About Us page.', 'success');
        updateLeaderCardPreview();
    } catch (err) {
        showProfileStatus('Failed to save profile: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Profile';
    }
}

async function deleteLeaderProfileConfirm() {
    if (!currentProfileId) return;
    if (!confirm('Delete your public profile? It will be removed from the About Us page.')) return;
    try {
        await leaderProfileApi.deleteLeaderProfile(currentProfileId);
        currentProfileId = null;
        profilePhotoUrl = '';
        profilePhotoPublicId = '';
        document.getElementById('leaderProfileForm').reset();
        document.getElementById('profilePhotoPreview').innerHTML = '<i class="fa-solid fa-user-tie"></i>';
        document.getElementById('leaderCardPreview').style.display = 'none';
        document.getElementById('deleteProfileBtn').style.display = 'none';
        document.getElementById('profilePhotoUploadStatus').textContent = '';
        showProfileStatus('Profile deleted.', 'success');
    } catch (err) {
        showProfileStatus('Failed to delete: ' + err.message, 'error');
    }
}

function showProfileStatus(msg, type) {
    const el = document.getElementById('profileFormStatus');
    el.style.display = 'block';
    el.textContent = msg;
    el.className = 'form-status ' + (type === 'success' ? 'status-success' : 'status-error');
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('leaderProfileForm');
    if (profileForm) profileForm.addEventListener('submit', saveLeaderProfile);

    const deleteBtn = document.getElementById('deleteProfileBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteLeaderProfileConfirm);

    const photoInput = document.getElementById('profilePhotoFile');
    if (photoInput) {
        photoInput.addEventListener('change', e => {
            if (e.target.files[0]) handleProfilePhotoUpload(e.target.files[0]);
        });
    }

    ['profileName','profileRole','profileSector','profileCell',
     'profileVillage','profileTelephone','profileBio'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateLeaderCardPreview);
    });

    // Patch sidebar navigation to load profile when section is activated
    document.querySelectorAll('[data-section="my-profile"]').forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(initLeaderProfile, 100);
        });
    });
});
