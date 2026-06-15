const express = require('express');
const router = express.Router();
const { LeaderReport, HomeUpdate } = require('../models');

// Create a leader report
router.post('/', async (req, res) => {
  try {
    console.log('Leader report received:', req.body);
    const report = new LeaderReport(req.body);
    await report.save();

    // Mirror infrastructure reports to HomeUpdate so they appear on the home feed
    if (req.body.type === 'infrastructure') {
      const d = req.body.data || {};
      await HomeUpdate.create({
        type: 'activity',
        title: `Damaged Infrastructure – ${d.place || 'Unknown location'}`,
        description: d.description || '',
        place: d.place || '',
        date: d.date || new Date().toISOString().slice(0, 10),
        postedBy: req.body.reportedBy || 'Village Leader',
        imageUrl: d.image || '',
      });
    }

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

    // Keep the mirrored HomeUpdate in sync
    if (report.type === 'infrastructure') {
      const d = (req.body.data) || report.data || {};
      const title = `Damaged Infrastructure – ${d.place || 'Unknown location'}`;
      await HomeUpdate.findOneAndUpdate(
        { title: new RegExp(`^Damaged Infrastructure – `), postedBy: report.reportedBy },
        {
          title,
          description: d.description || '',
          place: d.place || '',
          date: d.date || '',
          ...(d.image ? { imageUrl: d.image } : {})
        }
      );
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

    // Remove the mirrored HomeUpdate
    if (report.type === 'infrastructure') {
      const d = report.data || {};
      await HomeUpdate.findOneAndDelete({
        title: `Damaged Infrastructure – ${d.place || 'Unknown location'}`,
        postedBy: report.reportedBy || 'Village Leader'
      });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
