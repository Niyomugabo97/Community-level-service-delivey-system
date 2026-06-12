const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const path = require('path');

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

//////////////// CONNECT DB //////////////////
const mongoUrl = process.env.MongoDB_Url || process.env.MONGO_URI;

function maskUri(uri) {
  if (!uri) return uri;
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:@]+):([^@]+)@/, '$1$2:*****@');
  } catch (e) {
    return uri;
  }
}

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
};

async function seedAdminUser() {
  const { User } = require('./models');
  const bcrypt = require('bcryptjs');
  try {
    const existing = await User.findOne({ userType: 'admin' });
    if (!existing) {
      const hash = await bcrypt.hash('Admin@2024', 10);
      await User.create({
        name: 'System Administrator',
        email: 'admin@umuturage.rw',
        userType: 'admin',
        passwordHash: hash
      });
      console.log('Admin user created — email: admin@umuturage.rw  password: Admin@2024');
    }
  } catch (err) {
    console.error('Admin seed error:', err.message);
  }
}

function connectWithRetry(retries = 5, delay = 5000) {
  console.log(`Attempting MongoDB connection to ${maskUri(mongoUrl)} (retries left: ${retries})`);
  mongoose.connect(mongoUrl, mongooseOptions)
    .then(() => { console.log('MongoDB Connected'); seedAdminUser(); })
    .catch(err => {
      console.error('Error connecting to MongoDB:', err && err.message ? err.message : err);
      if (retries > 0) {
        console.log(`Retrying MongoDB connection in ${delay / 1000}s...`);
        setTimeout(() => connectWithRetry(retries - 1, Math.min(delay * 2, 60000)), delay);
      } else {
        console.error('Could not connect to MongoDB after multiple attempts.');
      }
    });
}

if (!mongoUrl) {
  console.error('No MongoDB connection string found in environment (MONGO_URI).');
} else {
  connectWithRetry();
}

//////////////// ROUTES //////////////////
const homeUpdateRoutes = require("./routes/homeUpdates");
const attendanceRoutes = require("./routes/attendance");
const attendanceTrackingRoutes = require("./routes/attendanceTracking");
const memberRoutes = require("./routes/members");
const uploadRoutes = require("./routes/upload");
const schoolsRoutes = require("./routes/schools");
const citizenReportsRoutes = require("./routes/citizenReports");
const leaderReportsRoutes = require("./routes/leaderReports");
const authRoutes = require("./routes/auth");
const intekoRoutes = require("./routes/inteko");
const intekoAttendanceRoutes = require("./routes/intekoAttendance");
const locationRoutes = require("./routes/locations");
const performanceRoutes = require("./routes/performance");
const leaderProfileRoutes = require("./routes/leaderProfiles");
const adminRoutes = require("./routes/admin");

app.use("/api/home-updates", homeUpdateRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/attendance-tracking", attendanceTrackingRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/schools", schoolsRoutes);
app.use("/api/citizen-reports", citizenReportsRoutes);
app.use("/api/leader-reports", leaderReportsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/inteko", intekoRoutes);
app.use("/api/inteko-attendance", intekoAttendanceRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/leader-profiles", leaderProfileRoutes);
app.use("/api/admin", adminRoutes);

// Admin dashboard page (must be before the wildcard)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html'));
});

// Fallback to index.html for client-side routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

//////////////// START //////////////////
module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}