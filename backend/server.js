const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
const path = require('path');

// Serve frontend static files from project root so relative API calls work
app.use(express.static(path.join(__dirname, '..')));

//////////////// CONNECT DB //////////////////
const mongoUrl = process.env.MongoDB_Url || process.env.MONGO_URI;
mongoose.connect(mongoUrl)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

//////////////// ROUTES //////////////////
const homeUpdateRoutes = require("./routes/homeUpdates");
const attendanceRoutes = require("./routes/attendance");
const memberRoutes = require("./routes/members");
const uploadRoutes = require("./routes/upload");
const schoolsRoutes = require("./routes/schools");
const citizenReportsRoutes = require("./routes/citizenReports");
const authRoutes = require("./routes/auth");

app.use("/api/home-updates", homeUpdateRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/schools", schoolsRoutes);
app.use("/api/citizen-reports", citizenReportsRoutes);
app.use("/api/auth", authRoutes);

// Fallback to index.html for client-side routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

//////////////// START //////////////////
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});