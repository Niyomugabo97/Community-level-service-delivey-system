const express = require("express");
const router = express.Router();
const { Location } = require("../models");

//////////////// CREATE //////////////////
router.post("/", async (req, res) => {
  try {
    const location = new Location(req.body);
    await location.save();
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET ALL //////////////////
router.get("/", async (req, res) => {
  try {
    const data = await Location.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET BY ID //////////////////
router.get("/:id", async (req, res) => {
  try {
    const data = await Location.findById(req.params.id);
    if (!data) {
      return res.status(404).json({ error: "Location record not found" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET SECTORS //////////////////
router.get("/data/sectors", async (req, res) => {
  try {
    const data = await Location.findOne();
    if (!data) {
      return res.status(404).json({ error: "Location data not found" });
    }
    res.json({ sectors: data.sectors || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET CELLS //////////////////
router.get("/data/cells", async (req, res) => {
  try {
    const data = await Location.findOne();
    if (!data) {
      return res.status(404).json({ error: "Location data not found" });
    }
    res.json({ cells: data.cells || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET VILLAGES //////////////////
router.get("/data/villages", async (req, res) => {
  try {
    const data = await Location.findOne();
    if (!data) {
      return res.status(404).json({ error: "Location data not found" });
    }
    res.json({ villages: data.villages || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// UPDATE //////////////////
router.put("/:id", async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!location) {
      return res.status(404).json({ error: "Location record not found" });
    }
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// DELETE //////////////////
router.delete("/:id", async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) {
      return res.status(404).json({ error: "Location record not found" });
    }
    res.json({ message: "Location record deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
