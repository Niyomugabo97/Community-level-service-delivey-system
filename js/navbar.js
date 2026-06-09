// Shared navbar toggle for all pages

document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (!navToggle || !navMenu) return;

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    navMenu.classList.toggle('open');
  });

  // Smooth scrolling for navigation links
  const navLinks = document.querySelectorAll('a[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      
      // Only handle internal links (not empty or just "#")
      if (href && href !== '#') {
        const target = document.querySelector(href);
        
        if (target) {
          e.preventDefault();
          
          // Close mobile menu if open
          navToggle.classList.remove('open');
          navMenu.classList.remove('open');
          
          // Smooth scroll to target
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // Notification Bell Functionality
  initializeNotifications();

  // User Profile Functionality
  initializeUserProfile();
});

function initializeUserProfile() {
  const userProfileIcon = document.getElementById('userProfileIcon');
  const userProfileCard = document.getElementById('userProfileCard');
  const userName = document.getElementById('userName');
  const userFullName = document.getElementById('userFullName');
  const userEmail = document.getElementById('userEmail');
  const userRole = document.getElementById('userRole');

  if (!userProfileIcon || !userProfileCard) return;

  // Get current user from sessionStorage
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || {};

  // Populate user info
  if (currentUser.name) {
    userName.textContent = currentUser.name.split(' ')[0]; // First name only
    userFullName.textContent = currentUser.name;
  }
  if (currentUser.email) {
    userEmail.textContent = currentUser.email;
  }
  if (currentUser.userType) {
    userRole.textContent = currentUser.userType;
  }

  // Toggle profile card on icon click
  userProfileIcon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    userProfileCard.classList.toggle('active');
  });

  // Close profile card when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-profile-item')) {
      userProfileCard.classList.remove('active');
    }
  });

  // Prevent closing when clicking inside the card
  userProfileCard.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function initializeNotifications() {
  const notificationBell = document.getElementById('notificationBell');
  const notificationDropdown = document.getElementById('notificationDropdown');
  const notificationBadge = document.getElementById('notificationBadge');
  const notificationList = document.getElementById('notificationList');
  const clearBtn = document.getElementById('clearNotifications');

  if (!notificationBell || !notificationDropdown) return;

  // Toggle dropdown on bell click
  notificationBell.addEventListener('click', (e) => {
    e.preventDefault();
    notificationDropdown.classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notification-item')) {
      notificationDropdown.classList.remove('active');
    }
  });

  // Clear notifications
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('announcements');
      notificationList.innerHTML = '<p class="no-notifications">No new announcements</p>';
      notificationBadge.style.display = 'none';
      updateNotificationBadge();
    });
  }

  // Load announcements
  loadAnnouncements();

  // Refresh announcements every 30 seconds
  setInterval(loadAnnouncements, 30000);
}

async function loadAnnouncements() {
  try {
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationList = document.getElementById('notificationList');

    if (!notificationList) return;

    // Try to fetch from backend
    const response = await fetch('/api/home-updates?type=announcement', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    let announcements = [];
    
    if (response.ok) {
      const data = await response.json();
      announcements = Array.isArray(data) ? data : [];
    } else {
      // Fallback to localStorage
      announcements = JSON.parse(localStorage.getItem('announcements')) || [];
    }

    if (announcements.length === 0) {
      notificationList.innerHTML = '<p class="no-notifications">No new announcements</p>';
      notificationBadge.style.display = 'none';
    } else {
      // Sort by date (newest first)
      announcements.sort((a, b) => new Date(b.datePosted || b.createdAt) - new Date(a.datePosted || a.createdAt));

      notificationList.innerHTML = announcements.slice(0, 10).map((ann, idx) => `
        <div class="notification-item-content ${idx === 0 ? 'unread' : ''}">
          <div class="notification-title">${escapeHtml(ann.title || 'Announcement')}</div>
          <div class="notification-description">${escapeHtml(ann.description || ann.content || 'New announcement from leaders')}</div>
          <div class="notification-time">${formatNotificationTime(ann.datePosted || ann.createdAt)}</div>
        </div>
      `).join('');

      // Update badge
      notificationBadge.textContent = Math.min(announcements.length, 99);
      notificationBadge.style.display = announcements.length > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.warn('Failed to load announcements:', err);
  }
}

function formatNotificationTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + ' min ago';
  if (diffHours < 24) return diffHours + ' h ago';
  if (diffDays < 7) return diffDays + ' d ago';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateNotificationBadge() {
  const notificationBadge = document.getElementById('notificationBadge');
  if (notificationBadge) {
    const announcements = JSON.parse(localStorage.getItem('announcements')) || [];
    notificationBadge.textContent = Math.min(announcements.length, 99);
    notificationBadge.style.display = announcements.length > 0 ? 'inline-block' : 'none';
  }
}


