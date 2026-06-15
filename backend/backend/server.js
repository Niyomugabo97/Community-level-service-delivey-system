const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ================= STATIC FRONTEND ================= */
app.use(express.static(path.join(__dirname, "..", "frontend")));

/* ================= DB CONNECTION ================= */
const mongoUrl = process.env.MONGO_URI;

if (!mongoUrl) {
  console.error("❌ MONGO_URI is not defined in environment variables");
}

/* safer mongoose options (modern mongoose ignores most old options but OK) */
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
};

/* ================= ADMIN SEED ================= */
async function seedAdminUser() {
  try {
    const { User } = require("./models");
    const bcrypt = require("bcryptjs");

    const existing = await User.findOne({ userType: "admin" });

    if (!existing) {
      const hash = await bcrypt.hash("Admin@2024", 10);

      await User.create({
        name: "System Administrator",
        email: "admin@umuturage.rw",
        userType: "admin",
        passwordHash: hash,
      });

      console.log("✅ Admin user created (admin@umuturage.rw)");
    }
  } catch (err) {
    console.error("❌ Admin seed error:", err.message);
  }
}

/* ================= CONNECT DB FIRST ================= */
async function startServer() {
  try {
    console.log("🔄 Connecting to MongoDB...");

    await mongoose.connect(mongoUrl, mongooseOptions);

    console.log("✅ MongoDB Connected");

    await seedAdminUser();

    /* ================= ROUTES ================= */
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
    const announcementRoutes = require("./routes/announcements");

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
    app.use("/api/announcements", announcementRoutes);

    /* ================= ADMIN PAGE ================= */
    app.get("/admin", (req, res) => {
      res.sendFile(path.join(__dirname, "..", "frontend", "admin.html"));
    });

    /* ================= FRONTEND FALLBACK ================= */
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
    });

    /* ================= START SERVER ================= */
    const port = process.env.PORT;

    if (!port) {
      console.error("❌ PORT is not defined by Railway");
      process.exit(1);
    }

    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

/* ================= START APP ================= */
startServer();

module.exports = app;