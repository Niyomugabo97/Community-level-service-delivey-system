const express = require('express');
const router = express.Router();
const { LeaderProfile } = require('../models');
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/uploadLeaderPhoto');

// GET all leader profiles (public — for About Us page)
router.get('/', async (req, res) => {
  try {
    const profiles = await LeaderProfile.find().sort({ sector: 1, name: 1 });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single profile by email
router.get('/by-email/:email', async (req, res) => {
  try {
    const profile = await LeaderProfile.findOne({ email: req.params.email });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /upload-photo — upload leader profile photo to Cloudinary
// Returns { url, publicId }
router.post('/upload-photo', ...upload.cloudinary('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo file provided' });
    res.json({
      url:      req.file.path,       // full Cloudinary HTTPS URL
      publicId: req.file.filename    // Cloudinary public_id for later deletion
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — upsert leader profile by email (JSON body, photo already uploaded separately)
router.post('/', async (req, res) => {
  const { email, name, role, sector, cell, village, telephone, bio, photoUrl, photoPublicId } = req.body;

  if (!email || !name || !sector || !cell || !village || !telephone) {
    return res.status(400).json({ error: 'email, name, sector, cell, village and telephone are required' });
  }

  try {
    // If replacing photo, delete old one from Cloudinary
    const existing = await LeaderProfile.findOne({ email });
    if (existing && existing.photoPublicId && photoPublicId && existing.photoPublicId !== photoPublicId) {
      await cloudinary.uploader.destroy(existing.photoPublicId).catch(() => {});
    }

    const profile = await LeaderProfile.findOneAndUpdate(
      { email },
      { email, name, role, sector, cell, village, telephone, bio,
        photoUrl: photoUrl || '',
        photoPublicId: photoPublicId || '' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE leader profile — also removes photo from Cloudinary
router.delete('/:id', async (req, res) => {
  try {
    const profile = await LeaderProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    if (profile.photoPublicId) {
      await cloudinary.uploader.destroy(profile.photoPublicId).catch(() => {});
    }

    await LeaderProfile.findByIdAndDelete(req.params.id);
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
