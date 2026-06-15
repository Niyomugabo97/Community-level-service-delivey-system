const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

/* ========================
   MIDDLEWARE
======================== */
app.use(cors({
  origin: "*", // you can restrict later to your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ========================
   ENV VARIABLES
======================== */
const mongoUrl = process.env.MONGO_URI;

if (!mongoUrl) {
  console.error("❌ MONGO_URI is missing in environment variables. Set it in Railway → Variables.");
  process.exit(1);
}

/* ========================
   MONGODB CONNECTION
======================== */
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
};

async function seedAdminUser() {
  const { User } = require("./models");
  const bcrypt = require("bcryptjs");

  try {
    const existing = await User.findOne({ userType: "admin" });

    if (!existing) {
      const hash = await bcrypt.hash("Admin@2024", 10);

      await User.create({
        name: "System Administrator",
        email: "admin@umuturage.rw",
        userType: "admin",
        passwordHash: hash,
      });

      console.log("✅ Admin user created (admin@umuturage.rw / Admin@2024)");
    }
  } catch (err) {
    console.error("❌ Admin seed error:", err.message);
  }
}

async function connectDB() {
  try {
    console.log("🔄 Connecting to MongoDB...");

    await mongoose.connect(mongoUrl, mongooseOptions);

    console.log("✅ MongoDB Connected");

    seedAdminUser();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);

    // retry after 5 seconds
    setTimeout(connectDB, 5000);
  }
}

connectDB();

/* ========================
   ROUTES
======================== */
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

/* ========================
   STATIC FRONTEND FILES
======================== */
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// Serve index.html for the root so the frontend is accessible locally
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

/* ========================
   GLOBAL ERROR HANDLER
   Must be after all routes — converts any unhandled error
   (including multer/middleware errors) to a JSON response
   so the frontend always gets parseable error details.
======================== */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message, err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

/* ========================
   EXPORT APP (IMPORTANT for Render)
======================== */
module.exports = app;

/* ========================
   START SERVER (LOCAL + RENDER)
======================== */
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}