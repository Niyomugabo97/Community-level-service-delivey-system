const express = require('express');
const router = express.Router();
const { Inteko } = require('../models');

// Create a new Inteko record
router.post('/', async (req, res) => {
  try {
    const inteko = new Inteko(req.body);
    await inteko.save();
    res.json(inteko);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Inteko records
router.get('/', async (req, res) => {
  try {
    const items = await Inteko.find({}).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Inteko record
router.put('/:id', async (req, res) => {
  try {
    const inteko = await Inteko.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!inteko) {
      return res.status(404).json({ error: "Inteko record not found" });
    }
    res.json(inteko);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Inteko record
router.delete('/:id', async (req, res) => {
  try {
    const inteko = await Inteko.findByIdAndDelete(req.params.id);
    if (!inteko) {
      return res.status(404).json({ error: "Inteko record not found" });
    }
    res.json({ message: "Inteko record deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
