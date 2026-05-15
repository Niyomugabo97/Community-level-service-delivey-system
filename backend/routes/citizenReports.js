const express = require('express');
const router = express.Router();
const { CitizenReport } = require('../models');

// Create a citizen report
router.post('/', async (req, res) => {
  try {
    console.log('Citizen report received:', req.body);
    const report = new CitizenReport(req.body);
    await report.save();
    res.json(report);
  } catch (err) {
    console.error('Error saving citizen report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get reports - filtered by type and/or email
router.get('/', async (req, res) => {
  try {
    const { type, reportedByEmail } = req.query;  // ← read query params

    const filter = {};
    if (type) filter.type = type;                               // ← filter by type
    if (reportedByEmail) filter.reportedByEmail = reportedByEmail; // ← filter by citizen

    const items = await CitizenReport.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;