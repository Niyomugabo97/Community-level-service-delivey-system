const puppeteer = require('puppeteer-core');
const path = require('path');
const fs   = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE   = path.resolve(__dirname);
const OUT    = path.join(BASE, 'screenshots');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

// ── Auth sessions ────────────────────────────────────────────────────────────
const LEADER_SESSION  = JSON.stringify({ name:'NIYOMUGABO Claude', email:'claude@example.rw', userType:'leader',  sector:'Nyarugenge', cell:'Biryogo', village:'Nyabugogo', telephone:'0788000001' });
const CITIZEN_SESSION = JSON.stringify({ name:'UWIMANA Jean',      email:'jean@example.rw',   userType:'citizen', sector:'Nyarugenge', cell:'Biryogo', village:'Nyabugogo', telephone:'0788000002' });
const SCHOOL_SESSION  = JSON.stringify({ name:'GS Nyamirembo Admin', email:'school@example.rw', userType:'school', sector:'Nyarugenge', cell:'Biryogo', village:'Nyabugogo', telephone:'0788000003', schoolName:'GS Nyamirembo' });
const CELL_SESSION    = JSON.stringify({ name:'Cell Admin Biryogo', email:'cell@example.rw',   userType:'cell',   sector:'Nyarugenge', cell:'Biryogo', telephone:'0788000004' });
const SECTOR_SESSION  = JSON.stringify({ name:'Sector Admin Nyarugenge', email:'sector@example.rw', userType:'sector', sector:'Nyarugenge', telephone:'0788000005' });
const MOCK_TOKEN      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.bW9ja3Rva2Vu.mock';

// ── Rich mock localStorage data ──────────────────────────────────────────────
const MOCK_LOCATIONS = JSON.stringify({
  sectors: ['Nyarugenge','Ruhuha','Mayange','Gisozi','Kacyiru'],
  cells:   ['Biryogo','Rwezamenyo','Nyamirambo','Gitega','Kiyovu'],
  villages:['Nyabugogo','Kimisagara','Muhima','Amahoro','Inkingi']
});

const MOCK_MEMBERS = JSON.stringify([
  { id:'M001', name:'UWIMANA Jean',      age:34, sex:'Male',   telephone:'0788000010', sector:'Nyarugenge', cell:'Biryogo',     village:'Nyabugogo',   nin:'1199012345678900', insuranceNumber:'INS-001', insuranceStatus:'Active',   insuranceExpiryDate:'2025-12-31', role:'member' },
  { id:'M002', name:'MUKAMANA Aline',    age:28, sex:'Female', telephone:'0788000011', sector:'Nyarugenge', cell:'Biryogo',     village:'Nyabugogo',   nin:'1199012345678901', insuranceNumber:'INS-002', insuranceStatus:'Active',   insuranceExpiryDate:'2025-10-15', role:'member' },
  { id:'M003', name:'NZABONIMPA Pierre', age:45, sex:'Male',   telephone:'0788000012', sector:'Nyarugenge', cell:'Rwezamenyo',  village:'Kimisagara',  nin:'1198012345678902', insuranceNumber:'INS-003', insuranceStatus:'Inactive', insuranceExpiryDate:'2024-06-01', role:'member' },
  { id:'M004', name:'UWINEZA Rebecca',   age:22, sex:'Female', telephone:'0788000013', sector:'Nyarugenge', cell:'Nyamirambo',  village:'Muhima',      nin:'2002012345678903', insuranceNumber:'INS-004', insuranceStatus:'Active',   insuranceExpiryDate:'2026-03-20', role:'member' },
  { id:'M005', name:'HAKIZIMANA Eric',   age:38, sex:'Male',   telephone:'0788000014', sector:'Nyarugenge', cell:'Biryogo',     village:'Amahoro',     nin:'1186012345678904', insuranceNumber:'INS-005', insuranceStatus:'Active',   insuranceExpiryDate:'2025-08-10', role:'member' },
  { id:'M006', name:'NYIRANSENGIMANA B.',age:51, sex:'Female', telephone:'0788000015', sector:'Ruhuha',     cell:'Gitega',      village:'Inkingi',     nin:'1173012345678905', insuranceNumber:'INS-006', insuranceStatus:'Inactive', insuranceExpiryDate:'2023-12-31', role:'member' },
  { id:'M007', name:'HABIMANA Patrick',  age:30, sex:'Male',   telephone:'0788000016', sector:'Nyarugenge', cell:'Biryogo',     village:'Nyabugogo',   nin:'1994012345678906', insuranceNumber:'INS-007', insuranceStatus:'Active',   insuranceExpiryDate:'2026-01-01', role:'leader' },
  { id:'M008', name:'INGABIRE Claudine', age:26, sex:'Female', telephone:'0788000017', sector:'Nyarugenge', cell:'Rwezamenyo',  village:'Kimisagara',  nin:'1998012345678907', insuranceNumber:'INS-008', insuranceStatus:'Active',   insuranceExpiryDate:'2025-11-30', role:'member' },
  { id:'M009', name:'NSENGIMANA Joel',   age:19, sex:'Male',   telephone:'0788000018', sector:'Nyarugenge', cell:'Biryogo',     village:'Nyabugogo',   nin:'2005012345678908', insuranceNumber:'INS-009', insuranceStatus:'Active',   insuranceExpiryDate:'2026-06-15', role:'member' },
  { id:'M010', name:'KAYITESI Delphine', age:42, sex:'Female', telephone:'0788000019', sector:'Mayange',    cell:'Kiyovu',      village:'Inkingi',     nin:'1182012345678909', insuranceNumber:'INS-010', insuranceStatus:'Inactive', insuranceExpiryDate:'2024-03-01', role:'member' },
]);

const today = new Date().toISOString().split('T')[0];
const MOCK_ATTENDANCE = JSON.stringify([
  { id:'A001', memberTelephone:'0788000010', name:'UWIMANA Jean',      date: today, status:'present', type:'umuganda', sector:'Nyarugenge', cell:'Biryogo',    village:'Nyabugogo' },
  { id:'A002', memberTelephone:'0788000011', name:'MUKAMANA Aline',    date: today, status:'present', type:'umuganda', sector:'Nyarugenge', cell:'Biryogo',    village:'Nyabugogo' },
  { id:'A003', memberTelephone:'0788000012', name:'NZABONIMPA Pierre', date: today, status:'absent',  type:'umuganda', sector:'Nyarugenge', cell:'Rwezamenyo', village:'Kimisagara' },
  { id:'A004', memberTelephone:'0788000014', name:'HAKIZIMANA Eric',   date: today, status:'present', type:'umuganda', sector:'Nyarugenge', cell:'Biryogo',    village:'Amahoro' },
  { id:'A005', memberTelephone:'0788000016', name:'HABIMANA Patrick',  date: today, status:'present', type:'umuganda', sector:'Nyarugenge', cell:'Biryogo',    village:'Nyabugogo' },
]);

const MOCK_REPORTS = JSON.stringify([
  { id:'R001', type:'drugs',          reportedBy:'UWIMANA Jean', reportedByPhone:'0788000010', dateReported: today, data:{ incidentType:'Illegal Alcohol', location:'Near market Nyabugogo', description:'Illegal brewing of alcohol observed', suspectName:'Unknown', reporterName:'UWIMANA Jean' } },
  { id:'R002', type:'violence',       reportedBy:'MUKAMANA Aline', reportedByPhone:'0788000011', dateReported: today, data:{ incidentDate: today, location:'Kimisagara', description:'Harassment incident reported', reporterName:'MUKAMANA Aline' } },
  { id:'R003', type:'infrastructure', reportedBy:'HABIMANA Patrick', reportedByPhone:'0788000016', dateReported: today, data:{ infrastructureType:'Road', location:'Nyabugogo main road', severity:'Moderate', description:'Large pothole causing accidents' } },
  { id:'R004', type:'visitors',       reportedBy:'NZABONIMPA Pierre', reportedByPhone:'0788000012', dateReported: today, data:{ visitorName:'MUGENZI Alain', origin:'Kigali', purpose:'Family visit', hostName:'HAKIZIMANA Eric', arrivalDate: today } },
  { id:'R005', type:'case',           reportedBy:'UWINEZA Rebecca', reportedByPhone:'0788000013', dateReported: today, data:{ caseTitle:'Land boundary dispute', plaintiff:'UWINEZA Rebecca', defendant:'NSENGIMANA Joel', description:'Dispute over plot boundary in Nyabugogo', status:'Open' } },
]);

const MOCK_UPDATES = JSON.stringify([
  { id:'U001', type:'activity',  title:'Umuganda Community Work',      description:'Successful road cleaning near health centre. 87 members participated.',           place:'Nyabugogo',  date:'2026-05-31', postedBy:'NIYOMUGABO Claude', imageUrl:'' },
  { id:'U002', type:'upcoming',  title:'Inteko Meeting – June 2026',   description:'Monthly community council meeting to discuss water project and school upgrades.',  place:'Village Hall', date:'2026-06-20', postedBy:'NIYOMUGABO Claude', imageUrl:'' },
  { id:'U003', type:'trending',  title:'New Water Point Inaugurated',  description:'A new clean water point has been inaugurated serving over 200 households.',       place:'Kimisagara', date:'2026-06-05', postedBy:'NIYOMUGABO Claude', imageUrl:'' },
]);

const MOCK_CASES = JSON.stringify([
  { id:'C001', caseTitle:'Land boundary dispute', plaintiff:'UWINEZA Rebecca', plaintiffPhone:'0788000013', defendant:'NSENGIMANA Joel', defendantPhone:'0788000018', category:'Land', description:'Dispute over plot boundary line. Plaintiff claims 2m encroachment by defendant.', resolutionDeadline:'2026-07-01', status:'Open',      dateReported: today },
  { id:'C002', caseTitle:'Property damage claim',  plaintiff:'MUKAMANA Aline',  plaintiffPhone:'0788000011', defendant:'HABIMANA Patrick', defendantPhone:'0788000016', category:'Property', description:'Fence damaged during construction work.',  resolutionDeadline:'2026-06-25', status:'Escalated', dateReported: today },
]);

const MOCK_SCHOOL = JSON.stringify({ schoolName:'GS Nyamirembo', schoolLeader:'NZABONIMPA Josephine', email:'school@example.rw', phone:'0788000003', totalStudents:1204, totalDropouts:34 });

const MOCK_DROPOUTS = JSON.stringify([
  { id:'D001', studentName:'UWIMANA Dieu-Donné', sex:'Male',   age:14, recentLevel:'P6', fatherName:'UWIMANA Jean', fatherPhone:'0788000010', motherName:'KAYITESI Marie', guardianPhone:'0788000019', date:'2026-05-10' },
  { id:'D002', studentName:'MUKAMANA Diane',     sex:'Female', age:16, recentLevel:'S2', fatherName:'HABIMANA Eric', fatherPhone:'0788000014', motherName:'INGABIRE Clo',  guardianPhone:'0788000017', date:'2026-04-22' },
  { id:'D003', studentName:'NSHUTI Kevin',       sex:'Male',   age:15, recentLevel:'S1', fatherName:'NSHUTI Paul',  fatherPhone:'0788000020', motherName:'UWINEZA C.',    guardianPhone:'0788000013', date:'2026-03-15' },
]);

const MOCK_INTEKO = JSON.stringify([
  { id:'I001', meetingTitle:'June 2026 Inteko Rusange', meetingType:'Inteko rusange', meetingDate:'2026-06-15', startTime:'08:00', endTime:'11:30', location:'Village Hall Nyabugogo', attendees:54, agenda:['Review Umuganda attendance','Water project update','School dropout prevention plan'], decisions:['Increase Umuganda incentives for top attendees','Allocate 500,000 RWF for borehole maintenance'], actionItems:[{action:'Follow up on borehole repair',responsible:'NIYOMUGABO Claude',deadline:'2026-06-30'}], reportSummary:'Meeting was productive. 54 members attended.', leaderName:'NIYOMUGABO Claude' },
]);

const MOCK_LEADER_PROFILE = JSON.stringify([
  { email:'claude@example.rw', name:'NIYOMUGABO Claude', role:'Village Leader', sector:'Nyarugenge', cell:'Biryogo', village:'Nyabugogo', telephone:'0788000001', bio:'Dedicated village leader committed to community development and transparent governance.', photoUrl:'' },
]);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function injectSession(page, session, extraData = {}) {
  await page.evaluateOnNewDocument((s, t, locs, members, att, rpts, upds, cases, school, dropouts, inteko, profile) => {
    sessionStorage.setItem('currentUser', s);
    sessionStorage.setItem('token', t);
    localStorage.setItem('currentUser', s);
    localStorage.setItem('token', t);
    localStorage.setItem('systemLocations',  locs);
    localStorage.setItem('registerRecords',  members);
    localStorage.setItem('umugandaAttendance', att);
    localStorage.setItem('leaderReports',    rpts);
    localStorage.setItem('citizenReports',   rpts);
    localStorage.setItem('homeUpdates',      upds);
    localStorage.setItem('communityCases',   cases);
    localStorage.setItem('schoolProfile',    school);
    localStorage.setItem('dropoutRecords',   dropouts);
    localStorage.setItem('intekoRecords',    inteko);
    localStorage.setItem('leaderProfiles',   profile);
    localStorage.setItem('lastLeaderLocation', JSON.stringify({ sector:'Nyarugenge', cell:'Biryogo', village:'Nyabugogo' }));
  }, session, MOCK_TOKEN,
     MOCK_LOCATIONS, MOCK_MEMBERS, MOCK_ATTENDANCE, MOCK_REPORTS,
     MOCK_UPDATES, MOCK_CASES, MOCK_SCHOOL, MOCK_DROPOUTS, MOCK_INTEKO, MOCK_LEADER_PROFILE);
}

async function navigate(page, url, session) {
  if (session) await injectSession(page, session);
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 18000 }); } catch(_) {}
  await new Promise(r => setTimeout(r, 2500));
  // If auth redirected away, retry
  if (session) {
    const cur = page.url();
    const file = url.split('/').pop().split('?')[0].split('#')[0];
    if (!cur.includes(file)) {
      await injectSession(page, session);
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 18000 }); } catch(_) {}
      await new Promise(r => setTimeout(r, 2500));
    }
  }
}

async function fullShot(page, name, width = 1280) {
  try {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    const imgPath = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: imgPath, fullPage: true });
    const size = Math.round(fs.statSync(imgPath).size / 1024);
    console.log(`  ✓ ${name}  (${size} KB)`);
  } catch(e) {
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

async function tryClick(page, selectors) {
  for (const sel of selectors.split(',').map(s => s.trim())) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.evaluate(n => n.scrollIntoView({ block:'center' }));
        await el.click();
        return true;
      }
    } catch(_) {}
  }
  return false;
}

// ── Page list ─────────────────────────────────────────────────────────────────
const PAGES = [
  { file:'home.html',                name:'01_home_page',          session:null,           width:1280 },
  { file:'auth.html',                name:'02_login_page',         session:null,           width:1280 },
  { file:'auth.html?tab=signup',     name:'03_signup_page',        session:null,           width:1280 },
  { file:'news.html',                name:'04_news_page',          session:null,           width:1280 },
  { file:'about.html',               name:'05_about_page',         session:null,           width:1280 },
  { file:'contact.html',             name:'06_contact_page',       session:null,           width:1280 },
  { file:'leader-dashboard.html',    name:'07_leader_dashboard',   session:LEADER_SESSION, width:1440 },
  { file:'citizen-dashboard.html',   name:'08_citizen_dashboard',  session:CITIZEN_SESSION,width:1280 },
  { file:'school-dashboard.html',    name:'09_school_dashboard',   session:SCHOOL_SESSION, width:1280 },
  { file:'cell-dashboard.html',      name:'10_cell_dashboard',     session:CELL_SESSION,   width:1280 },
  { file:'sector-dashboard.html',    name:'11_sector_dashboard',   session:SECTOR_SESSION, width:1280 },
  { file:'analytics.html',           name:'12_analytics_page',     session:LEADER_SESSION, width:1440 },
  { file:'attendance-analytics.html',name:'13_attendance_analytics',session:LEADER_SESSION,width:1440 },
  { file:'view-analytics.html',      name:'14_view_analytics',     session:LEADER_SESSION, width:1440 },
];

// Leader dashboard sections — sidebar nav selectors + what to pre-click/inject
const LEADER_SECTIONS = [
  { selector:'a[href="#register"], [data-section="register"], a[onclick*="register"]',          name:'15_leader_register_member',     wait:2000 },
  { selector:'a[href="#umuganda"], [data-section="umuganda"], a[onclick*="umuganda"]',          name:'16_leader_umuganda_attendance',  wait:2000 },
  { selector:'a[href="#inteko-attendance"], [data-section="inteko"], a[onclick*="inteko"]',     name:'17_leader_inteko_attendance',    wait:2000 },
  { selector:'a[href="#analytics"], [data-section="analytics"], a[onclick*="analytics"]',       name:'18_leader_attendance_analytics', wait:2500 },
  { selector:'a[href="#minutes"], [data-section="minutes"], a[onclick*="minutes"]',             name:'19_leader_inteko_minutes',       wait:2000 },
  { selector:'a[href="#insurance"], [data-section="insurance"], a[onclick*="insurance"]',       name:'20_leader_insurance_tracking',   wait:2000 },
  { selector:'a[href="#drugs"], [data-section="drugs"], a[onclick*="drugs"]',                   name:'21_leader_drugs_report',         wait:2000 },
  { selector:'a[href="#violence"], [data-section="violence"], a[onclick*="violence"]',          name:'22_leader_violence_report',      wait:2000 },
  { selector:'a[href="#infrastructure"], [data-section="infrastructure"]',                      name:'23_leader_infrastructure_report',wait:2000 },
  { selector:'a[href="#cases"], [data-section="cases"], a[onclick*="cases"], a[onclick*="ikirago"]', name:'24_leader_case_management', wait:2000 },
  { selector:'a[href="#updates"], [data-section="updates"], a[onclick*="updates"]',             name:'25_leader_community_updates',    wait:2000 },
  { selector:'a[href="#chat"], [data-section="chat"], a[onclick*="chat"]',                      name:'26_leader_chat',                 wait:2000 },
  { selector:'a[href="#visitors"], [data-section="visitors"], a[onclick*="visitors"]',          name:'27_leader_visitor_report',       wait:2000 },
  { selector:'a[href="#profile"], [data-section="profile"], a[onclick*="profile"]',             name:'28_leader_profile',              wait:2000 },
];

// ── Citizen dashboard sections ────────────────────────────────────────────────
const CITIZEN_SECTIONS = [
  { section:'drugs',          name:'29_citizen_drugs_report',          label:'Report Drugs' },
  { section:'violence',       name:'30_citizen_violence_report',        label:'Report Sexual Violence' },
  { section:'infrastructure', name:'31_citizen_infrastructure_report',  label:'Damaged Infrastructure' },
  { section:'visitors',       name:'32_citizen_visitor_report',         label:'Report Visitors' },
  { section:'case',           name:'33_citizen_case_ikirago',           label:'Ikirago Case' },
  { section:'chat',           name:'34_citizen_chat',                   label:'Chat with Leaders' },
];

// ── Cell dashboard sections ───────────────────────────────────────────────────
const CELL_SECTIONS = [
  { section:'cases',       name:'35_cell_escalated_cases',    label:'Escalated Cases' },
  { section:'activities',  name:'36_cell_activities',          label:'Village Activities' },
  { section:'reports',     name:'37_cell_reports_summary',     label:'Reports Summary' },
  { section:'statistics',  name:'38_cell_statistics',          label:'Statistics' },
  { section:'homeupdates', name:'39_cell_home_updates',        label:'Activities & Home Updates' },
  { section:'chat',        name:'40_cell_chat',                label:'Chat' },
];

// ── Sector dashboard sections ─────────────────────────────────────────────────
const SECTOR_SECTIONS = [
  { section:'cases',       name:'41_sector_escalated_cases',   label:'Escalated Cases' },
  { section:'activities',  name:'42_sector_activities',         label:'Cell Activities' },
  { section:'reports',     name:'43_sector_reports',            label:'All Reports' },
  { section:'statistics',  name:'44_sector_statistics',         label:'Statistics' },
  { section:'homeupdates', name:'45_sector_home_updates',       label:'Activities & Home Updates' },
  { section:'chat',        name:'46_sector_chat',               label:'Chat' },
];

async function shotDashboardSections(browser, htmlFile, session, sections, dashWidth = 1280) {
  const baseUrl = `file:///${BASE.replace(/\\/g,'/')}/${htmlFile}`;
  for (const sec of sections) {
    const p = await browser.newPage();
    await navigate(p, baseUrl, session);
    // Click the sidebar link by data-section attribute
    const clicked = await p.evaluate((s) => {
      const el = document.querySelector(`[data-section="${s}"]`);
      if (el) { el.click(); return true; }
      return false;
    }, sec.section);
    if (!clicked) {
      // fallback: match text
      await p.evaluate((lbl) => {
        const all = [...document.querySelectorAll('a,li,button')];
        const m = all.find(el => el.textContent.toLowerCase().includes(lbl.toLowerCase()));
        if (m) m.click();
      }, sec.label);
    }
    await new Promise(r => setTimeout(r, 2000));
    await p.evaluate(() => { window.scrollTo(0, 0); });
    await new Promise(r => setTimeout(r, 300));
    await fullShot(p, sec.name, dashWidth);
    await p.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('Launching Chrome...\n');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    protocolTimeout: 90000,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu',
           '--window-size=1440,900','--font-render-hinting=none'],
  });

  // ── Public + role dashboard overviews ────────────────────────────────────
  for (const pg of PAGES) {
    const p = await browser.newPage();
    await navigate(p, `file:///${BASE.replace(/\\/g,'/')}/${pg.file}`, pg.session);
    await fullShot(p, pg.name, pg.width);
    await p.close();
  }

  // ── Leader dashboard sections (14 modules) ────────────────────────────────
  console.log('\nCapturing leader dashboard sections...');
  for (const sec of LEADER_SECTIONS) {
    const p = await browser.newPage();
    await navigate(p, `file:///${BASE.replace(/\\/g,'/')}/leader-dashboard.html`, LEADER_SESSION);
    const clicked = await tryClick(p, sec.selector);
    if (!clicked) {
      const keyword = sec.name.replace(/^\d+_leader_/, '').replace(/_/g,' ');
      await p.evaluate((kw) => {
        const m = [...document.querySelectorAll('a,li,button')].find(el => el.textContent.toLowerCase().includes(kw.split(' ')[0]));
        if (m) m.click();
      }, keyword);
    }
    await new Promise(r => setTimeout(r, sec.wait));
    await p.evaluate(() => {
      const active = document.querySelector('.dashboard-section.active, section.active');
      if (active) active.scrollIntoView({ block:'start' }); else window.scrollTo(0,0);
    });
    await new Promise(r => setTimeout(r, 300));
    await fullShot(p, sec.name, 1440);
    await p.close();
  }

  // ── Citizen dashboard sections (6 modules) ────────────────────────────────
  console.log('\nCapturing citizen dashboard sections...');
  await shotDashboardSections(browser, 'citizen-dashboard.html', CITIZEN_SESSION, CITIZEN_SECTIONS, 1280);

  // ── Cell dashboard sections (6 modules) ──────────────────────────────────
  console.log('\nCapturing cell dashboard sections...');
  await shotDashboardSections(browser, 'cell-dashboard.html', CELL_SESSION, CELL_SECTIONS, 1280);

  // ── Sector dashboard sections (6 modules) ────────────────────────────────
  console.log('\nCapturing sector dashboard sections...');
  await shotDashboardSections(browser, 'sector-dashboard.html', SECTOR_SESSION, SECTOR_SECTIONS, 1280);

  await browser.close();
  console.log('\nAll screenshots saved to: screenshots/');
  console.log('Total:', fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length, 'files');
})();
