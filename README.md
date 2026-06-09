# UMUTURAGE KU ISONGA SYSTEM

A comprehensive community management system for local leaders and citizens in Rwanda.

## Features

### Home Page
- Landing page with recent activities (images, dates, descriptions, places)
- Upcoming sessions/news section
- Trending in village/sector section
- Footer with support information

### Local Leader Dashboard
1. **Umuganda Attendance** - Record attendance with names, age, sex, sector, cell, village
2. **Inteko Minutes & Decisions** - Comprehensive meeting management with:
   - Meeting information (title, type, date, time, venue, chairperson)
   - Attendance management
   - Agenda items
   - Discussions
   - Decisions with voting
   - Action items/resolutions
   - Report section
   - Document attachments
   - Approval & signatures
   - Follow-up & archiving
3. **Notifications** - View people who haven't attended Inteko or Umuganda
4. **Register New People** - Register new members/visitors with full details
5. **Insurance Payment Tracking** - Track who paid insurance or not
6. **Report Drugs/Illegal Drinks** - Report illegal activities
7. **Report Sexual Violence** - Report sexual violence cases
8. **Shift Automate Ikirago (Case)** - Case management with automatic escalation:
   - Record cases with plaintiff, defendant, descriptions
   - Set resolution timeline
   - Auto-escalates to Cell level if not solved in time
   - Mark cases as solved

### Citizen Dashboard
1. **Report Drugs/Illegal Drinks** - Citizens can report illegal activities
2. **Report Sexual Violence** - Citizens can report sexual violence cases

## How to Use

### Getting Started
1. Open `index.html` in a web browser
2. Click "Sign Up" to create an account
3. Select account type (Local Leader or Citizen)
4. Fill in the required information
5. Login with your credentials

### For Local Leaders
- Access all 8 features from the sidebar menu
- Record Umuganda attendance
- Create detailed Inteko minutes
- View notifications for missing attendees
- Register new community members
- Track insurance payments
- Report and manage cases
- Cases automatically escalate if not resolved in time

### For Citizens
- Report drugs/illegal drinks
- Report sexual violence cases
- View your submitted reports

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: LocalStorage for data persistence
- **Authentication**: Session-based authentication
- **Responsive Design**: Mobile-friendly interface

## File Structure

```
├── index.html              # Home page
├── login.html              # Login/Signup page
├── leader-dashboard.html   # Leader dashboard
├── citizen-dashboard.html  # Citizen dashboard
├── css/
│   └── new-styles.css     # Main consolidated stylesheet
├── js/
│   ├── main.js            # Home page functionality
│   ├── auth.js            # Authentication logic
│   ├── leader-dashboard.js # Leader dashboard functionality
│   └── citizen-dashboard.js # Citizen dashboard functionality
└── README.md              # This file
```

## Notes

- All data is stored in browser's LocalStorage
- No backend server required - runs entirely in the browser
- For production use, consider implementing a proper backend with database
- Passwords are stored in plain text (should be hashed in production)
- Case auto-escalation checks every minute

## Browser Compatibility

Works best in modern browsers:
- Chrome (recommended)
- Firefox
- Edge
- Safari

## Support

For support, contact: support@umuturage.rw



