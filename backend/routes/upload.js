const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

//////////////// UPLOAD IMAGE //////////////////
router.post("/", ...upload.cloudinary("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    res.json({
      url:          req.file.path,
      publicId:     req.file.filename,
      originalName: req.file.originalname,
      size:         req.file.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
