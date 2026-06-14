const express = require('express');
const router  = express.Router();
const { IntekoAttendance } = require('../models');

//////////////// SAVE / UPSERT ////////////////
router.post('/', async (req, res) => {
  try {
    const { citizenId, attendanceDate } = req.body;

    if (!citizenId || !attendanceDate) {
      return res.status(400).json({ error: 'citizenId and attendanceDate are required' });
    }

    // Upsert: update if same member + date already exists, otherwise create
    const record = await IntekoAttendance.findOneAndUpdate(
      { citizenId, attendanceDate },
      { ...req.body, date: new Date(req.body.date || attendanceDate) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET ALL (with optional filters) ////////////////
router.get('/', async (req, res) => {
  try {
    const { sector, cell, village, status, attendanceDate, month, year } = req.query;
    const filter = {};

    if (sector)         filter.sector = sector;
    if (cell)           filter.cell   = cell;
    if (village)        filter.village = village;
    if (status)         filter.status  = status;
    if (attendanceDate) filter.attendanceDate = attendanceDate;

    if (month || year) {
      const y = year  ? parseInt(year)  : new Date().getFullYear();
      const m = month ? parseInt(month) : null;

      const start = m
        ? new Date(y, m - 1, 1)
        : new Date(y, 0, 1);
      const end = m
        ? new Date(y, m, 1)
        : new Date(y + 1, 0, 1);

      filter.date = { $gte: start, $lt: end };
    }

    const records = await IntekoAttendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET SINGLE ////////////////
router.get('/:id', async (req, res) => {
  try {
    const record = await IntekoAttendance.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// UPDATE ////////////////
router.put('/:id', async (req, res) => {
  try {
    const record = await IntekoAttendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// DELETE ////////////////
router.delete('/:id', async (req, res) => {
  try {
    const record = await IntekoAttendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
