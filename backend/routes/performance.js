const express = require("express");
const router = express.Router();
const { Performance } = require("../models");

//////////////// CREATE //////////////////
router.post("/", async (req, res) => {
  try {
    const performance = new Performance(req.body);
    await performance.save();
    res.json(performance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET ALL //////////////////
router.get("/", async (req, res) => {
  try {
    const { year, memberTelephone } = req.query;
    let filter = {};
    
    if (year) {
      filter.year = year;
    }
    
    if (memberTelephone) {
      filter.memberTelephone = memberTelephone;
    }

    const data = await Performance.find(filter).sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET BY MEMBER TELEPHONE //////////////////
router.get("/member/:memberTelephone", async (req, res) => {
  try {
    const data = await Performance.find({
      memberTelephone: req.params.memberTelephone
    }).sort({ year: -1 });
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Performance record not found" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET BY YEAR //////////////////
router.get("/year/:year", async (req, res) => {
  try {
    const data = await Performance.find({
      year: req.params.year
    }).sort({ averageAttendance: -1 });
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Performance records not found for this year" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// UPDATE //////////////////
router.put("/:id", async (req, res) => {
  try {
    const performance = await Performance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!performance) {
      return res.status(404).json({ error: "Performance record not found" });
    }
    res.json(performance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// DELETE //////////////////
router.delete("/:id", async (req, res) => {
  try {
    const performance = await Performance.findByIdAndDelete(req.params.id);
    if (!performance) {
      return res.status(404).json({ error: "Performance record not found" });
    }
    res.json({ message: "Performance record deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
