const express = require("express");
const router = express.Router();
const { AttendanceTracking } = require("../models");

//////////////// CREATE //////////////////
router.post("/", async (req, res) => {
  try {
    const tracking = new AttendanceTracking(req.body);
    await tracking.save();
    res.json(tracking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET ALL //////////////////
router.get("/", async (req, res) => {
  try {
    const { memberTelephone } = req.query;
    let filter = {};
    
    if (memberTelephone) {
      filter.memberTelephone = memberTelephone;
    }

    const data = await AttendanceTracking.find(filter).sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET BY TELEPHONE //////////////////
router.get("/:memberTelephone", async (req, res) => {
  try {
    const data = await AttendanceTracking.findOne({
      memberTelephone: req.params.memberTelephone
    });
    if (!data) {
      return res.status(404).json({ error: "Attendance tracking record not found" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// UPDATE //////////////////
router.put("/:memberTelephone", async (req, res) => {
  try {
    const tracking = await AttendanceTracking.findOneAndUpdate(
      { memberTelephone: req.params.memberTelephone },
      req.body,
      { new: true }
    );
    if (!tracking) {
      return res.status(404).json({ error: "Attendance tracking record not found" });
    }
    res.json(tracking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// DELETE //////////////////
router.delete("/:memberTelephone", async (req, res) => {
  try {
    const tracking = await AttendanceTracking.findOneAndDelete({
      memberTelephone: req.params.memberTelephone
    });
    if (!tracking) {
      return res.status(404).json({ error: "Attendance tracking record not found" });
    }
    res.json({ message: "Attendance tracking record deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
