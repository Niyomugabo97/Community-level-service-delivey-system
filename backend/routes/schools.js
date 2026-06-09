const express = require("express");
const router = express.Router();
const { School, SchoolDropoutRecord } = require("../models");

//////////////// DROPOUT STATISTICS (named routes first) //////////////////
router.get("/dropout-statistics", async (req, res) => {
  try {
    const schools = await School.find({}).lean();

    const totalSchools = schools.length;
    const totalStudents = schools.reduce((sum, s) => sum + (s.totalStudents || 0), 0);
    const totalDropouts = schools.reduce((sum, s) => sum + (s.totalDropouts || 0), 0);
    const averageRate = totalStudents > 0 ? Math.round((totalDropouts / totalStudents) * 100) : 0;

    res.json({
      totalSchools,
      totalStudents,
      totalDropouts,
      averageRate,
      schools: schools.map(s => ({
        name: s.schoolName,
        schoolLeader: s.schoolLeader,
        email: s.email,
        phone: s.phone,
        totalStudents: s.totalStudents || 0,
        dropouts: s.totalDropouts || 0,
        dropoutRate: (s.totalStudents || 0) > 0
          ? Math.round(((s.totalDropouts || 0) / s.totalStudents) * 100)
          : 0
      }))
    });
  } catch (err) {
    console.error("Error fetching school dropout statistics:", err);
    res.status(500).json({ error: err.message });
  }
});

//////////////// DROPOUT RECORDS //////////////////
router.get("/dropout-records", async (req, res) => {
  try {
    const filter = req.query.ownerEmail ? { ownerEmail: req.query.ownerEmail } : {};
    const records = await SchoolDropoutRecord.find(filter).sort({ date: -1 }).lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/dropout-records", async (req, res) => {
  try {
    const record = new SchoolDropoutRecord({ ...req.body, date: new Date() });
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// SCHOOL PROFILE //////////////////
router.get("/", async (req, res) => {
  try {
    const filter = req.query.ownerEmail ? { ownerEmail: req.query.ownerEmail } : {};
    const schools = await School.find(filter).lean();
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { ownerEmail } = req.body;
    if (!ownerEmail) return res.status(400).json({ error: "ownerEmail is required" });

    const school = await School.findOneAndUpdate(
      { ownerEmail },
      { ...req.body },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
