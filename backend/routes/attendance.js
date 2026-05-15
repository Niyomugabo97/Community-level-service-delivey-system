const express = require("express");
const router = express.Router();
const { Attendance, Member } = require("../models");

//////////////// CREATE //////////////////
router.post("/", async (req, res) => {
  try {
    const attendance = new Attendance({
      ...req.body,
      date: new Date(req.body.date)
    });

    await attendance.save();
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET ALL //////////////////
router.get("/", async (req, res) => {
  try {
    const { date, sector, village, status } = req.query;
    let filter = {};
    
    if (date) {
      filter.date = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
      };
    }
    
    if (sector) {
      filter.sector = sector;
    }
    
    if (village) {
      filter.village = village;
    }
    
    if (status) {
      filter.status = status;
    }

    const data = await Attendance.find(filter).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET BEST PERFORMING SECTORS //////////////////
router.get("/best-sectors", async (req, res) => {
  try {
    const { limit = 10, date } = req.query;
    let dateFilter = {};
    if (date) {
      dateFilter = {
        date: {
          $gte: new Date(date),
          $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
        }
      };
    }

    // Fetch attendance records and all members in parallel
    const [attendanceRecords, allMembers] = await Promise.all([
      Attendance.find(dateFilter).lean(),
      Member.find({}).lean()
    ]);

    // Build a phone → member lookup map for fast enrichment
    const memberMap = {};
    allMembers.forEach(m => {
      if (m.telephone) memberMap[String(m.telephone).trim()] = m;
    });

    // Get all unique sectors from the Member collection
    let allKnownSectors = await Member.distinct("sector");
    
    // Add official default sectors to ensure they are always visible even if no members exist
    const defaultSectors = ['Ruhuha', 'Nyarugenge', 'Mayange'];
    defaultSectors.forEach(s => {
      if (!allKnownSectors.includes(s)) allKnownSectors.push(s);
    });
    
    // Group enriched attendance records by resolved sector
    const sectorMap = {};
    
    // Initialize map with all known sectors
    allKnownSectors.forEach(s => {
      if (s) {
        sectorMap[s] = { total: 0, present: 0, absent: 0, villages: new Set() };
      }
    });

    attendanceRecords.forEach(record => {
      // Resolve sector: use attendance field first, else look up from member
      let sector = (record.sector && record.sector.trim()) || null;
      let village = (record.village && record.village.trim()) || null;

      if (!sector || !village) {
        const member = memberMap[String(record.citizenId || "").trim()];
        if (member) {
          sector = sector || (member.sector && member.sector.trim()) || null;
          village = village || (member.village && member.village.trim()) || null;
        }
      }

      const resolvedSector = sector || "Unnamed Sector";
      const resolvedVillage = village || "Unnamed Village";

      if (!sectorMap[resolvedSector]) {
        sectorMap[resolvedSector] = { total: 0, present: 0, absent: 0, villages: new Set() };
      }
      sectorMap[resolvedSector].total++;
      sectorMap[resolvedSector].villages.add(resolvedVillage);
      if (record.status === "present") sectorMap[resolvedSector].present++;
      else sectorMap[resolvedSector].absent++;
    });

    // Convert to array, calculate rates, sort and limit
    let bestSectors = Object.entries(sectorMap).map(([sectorName, data]) => ({
      sector: sectorName,
      total: data.total,
      present: data.present,
      absent: data.absent,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      villages: Array.from(data.villages),
      villageCount: data.villages.size,
      isBest: false,
      rank: 0
    }));

    // Sort by rate desc, then by total desc
    bestSectors.sort((a, b) => (b.rate - a.rate) || (b.total - a.total));
    bestSectors = bestSectors.slice(0, parseInt(limit));
    bestSectors.forEach((s, i) => { 
      s.rank = i + 1; 
      s.isBest = i === 0 && s.total > 0; 
    });

    res.json(bestSectors);
  } catch (err) {
    console.error("Error fetching best performing sectors:", err);
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET BEST PERFORMING VILLAGES //////////////////
// NOTE: /:id routes are placed AFTER named routes to avoid swallowing them
router.get("/best-villages", async (req, res) => {
  try {
    const { limit = 100, sector, date } = req.query;
    let attendanceFilter = {};
    if (date) {
      attendanceFilter.date = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
      };
    }

    // Fetch attendance records and all members in parallel
    const [attendanceRecords, allMembers] = await Promise.all([
      Attendance.find(attendanceFilter).lean(),
      Member.find({}).lean()
    ]);

    // Build a phone → member lookup map for fast enrichment
    const memberMap = {};
    allMembers.forEach(m => {
      if (m.telephone) memberMap[String(m.telephone).trim()] = m;
    });

    // Get all unique villages from the Member collection
    let villageQuery = {};
    if (sector) villageQuery.sector = sector;
    let allKnownVillages = await Member.find(villageQuery).distinct("village");

    // Get all sectors we should consider
    const defaultSectors = ['Ruhuha', 'Nyarugenge', 'Mayange'];
    const defaultVillages = ['Cyeru', 'Kanombe'];
    
    // Group enriched attendance records by resolved sector + village
    const villageMap = {};
    
    // Initialize map with all known data from members
    const allMembersInSector = await Member.find(sector ? { sector } : {}).lean();
    allMembersInSector.forEach(m => {
      if (m.village && m.sector) {
        const key = `${m.sector}||${m.village}`;
        if (!villageMap[key]) {
          villageMap[key] = { sector: m.sector, village: m.village, total: 0, present: 0, absent: 0 };
        }
      }
    });

    // Seed default villages for all official sectors (especially if no members exist)
    const sectorsToSeed = sector ? [sector] : defaultSectors;
    sectorsToSeed.forEach(s => {
      defaultVillages.forEach(v => {
        const key = `${s}||${v}`;
        if (!villageMap[key]) {
          villageMap[key] = { sector: s, village: v, total: 0, present: 0, absent: 0 };
        }
      });
    });

    attendanceRecords.forEach(record => {
      let recSector = (record.sector && record.sector.trim()) || null;
      let recVillage = (record.village && record.village.trim()) || null;

      if (!recSector || !recVillage) {
        const member = memberMap[String(record.citizenId || "").trim()];
        if (member) {
          recSector = recSector || (member.sector && member.sector.trim()) || null;
          recVillage = recVillage || (member.village && member.village.trim()) || null;
        }
      }

      // Filter by sector query param if provided
      if (sector && recSector !== sector) return;

      const resolvedSector = recSector || "Unnamed Sector";
      const resolvedVillage = recVillage || "Unnamed Village";
      const key = `${resolvedSector}||${resolvedVillage}`;

      if (!villageMap[key]) {
        villageMap[key] = { sector: resolvedSector, village: resolvedVillage, total: 0, present: 0, absent: 0 };
      }
      villageMap[key].total++;
      if (record.status === "present") villageMap[key].present++;
      else villageMap[key].absent++;
    });

    // Convert to array, calculate rates, sort and limit
    let bestVillages = Object.values(villageMap).map(data => ({
      sector: data.sector,
      village: data.village,
      total: data.total,
      present: data.present,
      absent: data.absent,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      isBest: false,
      rank: 0
    }));

    // Sort by rate desc, then by total desc
    bestVillages.sort((a, b) => (b.rate - a.rate) || (b.total - a.total));
    bestVillages = bestVillages.slice(0, parseInt(limit));
    bestVillages.forEach((v, i) => { 
      v.rank = i + 1; 
      v.isBest = i === 0 && v.total > 0; 
    });

    res.json(bestVillages);
  } catch (err) {
    console.error("Error fetching best performing villages:", err);
    res.status(500).json({ error: err.message });
  }
});


//////////////// GET COMPREHENSIVE PERFORMANCE RANKINGS //////////////////
// NOTE: All named routes must appear BEFORE /:id
router.get("/performance-rankings", async (req, res) => {
  try {
    const { date } = req.query;
    let dateFilter = {};
    if (date) {
      dateFilter = {
        date: {
          $gte: new Date(date),
          $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
        }
      };
    }

    // Fetch records in parallel
    const [attendanceRecords, allMembers] = await Promise.all([
      Attendance.find(dateFilter).lean(),
      Member.find({}).lean()
    ]);

    const memberMap = {};
    allMembers.forEach(m => {
      if (m.telephone) memberMap[String(m.telephone).trim()] = m;
    });

    const sectorMap = {};
    const villageMap = {};

    // Initialize maps with all known data from members
    allMembers.forEach(m => {
      if (m.sector) {
        if (!sectorMap[m.sector]) {
          sectorMap[m.sector] = { total: 0, present: 0, absent: 0, villages: new Set() };
        }
        if (m.village) {
          sectorMap[m.sector].villages.add(m.village);
          const vKey = `${m.sector}||${m.village}`;
          if (!villageMap[vKey]) {
            villageMap[vKey] = { sector: m.sector, village: m.village, total: 0, present: 0, absent: 0 };
          }
        }
      }
    });

    // Add default sectors and villages to maps
    const defaultSectors = ['Ruhuha', 'Nyarugenge', 'Mayange'];
    const defaultVillages = ['Cyeru', 'Kanombe'];
    
    defaultSectors.forEach(s => {
      if (!sectorMap[s]) {
        sectorMap[s] = { total: 0, present: 0, absent: 0, villages: new Set() };
      }
      defaultVillages.forEach(v => {
        sectorMap[s].villages.add(v);
        const vKey = `${s}||${v}`;
        if (!villageMap[vKey]) {
          villageMap[vKey] = { sector: s, village: v, total: 0, present: 0, absent: 0 };
        }
      });
    });

    attendanceRecords.forEach(record => {
      let s = (record.sector && record.sector.trim()) || null;
      let v = (record.village && record.village.trim()) || null;

      if (!s || !v) {
        const member = memberMap[String(record.citizenId || "").trim()];
        if (member) {
          s = s || (member.sector && member.sector.trim()) || null;
          v = v || (member.village && member.village.trim()) || null;
        }
      }

      const resolvedSector = s || "Unnamed Sector";
      const resolvedVillage = v || "Unnamed Village";

      if (!sectorMap[resolvedSector]) {
        sectorMap[resolvedSector] = { total: 0, present: 0, absent: 0, villages: new Set() };
      }
      sectorMap[resolvedSector].total++;
      sectorMap[resolvedSector].villages.add(resolvedVillage);
      if (record.status === "present") sectorMap[resolvedSector].present++;
      else sectorMap[resolvedSector].absent++;

      const vKey = `${resolvedSector}||${resolvedVillage}`;
      if (!villageMap[vKey]) {
        villageMap[vKey] = { sector: resolvedSector, village: resolvedVillage, total: 0, present: 0, absent: 0 };
      }
      villageMap[vKey].total++;
      if (record.status === "present") villageMap[vKey].present++;
      else villageMap[vKey].absent++;
    });

    const sectors = Object.entries(sectorMap).map(([name, data]) => ({
      sector: name,
      total: data.total,
      present: data.present,
      absent: data.absent,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      villageCount: data.villages.size,
      villages: Array.from(data.villages),
      isBest: false,
      rank: 0
    })).sort((a, b) => b.rate - a.rate);
    sectors.forEach((s, i) => { s.rank = i + 1; s.isBest = i === 0; });

    const villages = Object.values(villageMap).map(data => ({
      sector: data.sector,
      village: data.village,
      total: data.total,
      present: data.present,
      absent: data.absent,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      isBest: false,
      rank: 0
    })).sort((a, b) => b.rate - a.rate);
    villages.forEach((v, i) => { v.rank = i + 1; v.isBest = i === 0; });

    res.json({
      sectors,
      villages,
      bestSector: sectors.length > 0 ? sectors[0] : null,
      bestVillage: villages.length > 0 ? villages[0] : null
    });
  } catch (err) {
    console.error("Error fetching performance rankings:", err);
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET BY ID //////////////////
router.get("/:id", async (req, res) => {
  try {
    const data = await Attendance.findById(req.params.id);
    if (!data) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// UPDATE //////////////////
router.put("/:id", async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { ...req.body, date: new Date(req.body.date) },
      { new: true }
    );

    if (!attendance) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//////////////// DELETE //////////////////
router.delete("/:id", async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    res.json({ message: "Attendance record deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
