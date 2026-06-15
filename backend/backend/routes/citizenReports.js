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

// Get a single report by ID
router.get('/:id', async (req, res) => {
  try {
    const report = await CitizenReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a report
router.put('/:id', async (req, res) => {
  try {
    const report = await CitizenReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a report
router.delete('/:id', async (req, res) => {
  try {
    const report = await CitizenReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;