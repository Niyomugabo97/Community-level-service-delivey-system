const express = require('express');
const router = express.Router();
const { LeaderReport } = require('../models');

// Create a leader report
router.post('/', async (req, res) => {
  try {
    console.log('Leader report received:', req.body);
    const report = new LeaderReport(req.body);
    await report.save();
    res.json(report);
  } catch (err) {
    console.error('Error saving leader report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get reports - filtered by type and/or email
router.get('/', async (req, res) => {
  try {
    const { type, reportedByEmail } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (reportedByEmail) filter.reportedByEmail = reportedByEmail;

    const items = await LeaderReport.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single report
router.get('/:id', async (req, res) => {
  try {
    const report = await LeaderReport.findById(req.params.id);
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
    const report = await LeaderReport.findByIdAndUpdate(
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
    const report = await LeaderReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
