const express = require('express');
const router  = express.Router();
const { requireAdmin } = require('./admin');
const { Announcement } = require('../models');

// Public: get all announcements (newest first)
router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: create announcement
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, message, priority } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    const ann = await Announcement.create({
      title,
      message,
      priority: priority || 'normal',
      postedBy: req.admin.email
    });
    res.status(201).json(ann);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: delete announcement
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndDelete(req.params.id);
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
