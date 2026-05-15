const express = require("express");
const router = express.Router();
const { Member } = require("../models");

//////////////// GET SCHOOL DROPOUT STATISTICS //////////////////
router.get("/dropout-statistics", async (req, res) => {
  try {
    console.log("Fetching school dropout statistics...");
    
    // Get all members from database
    const members = await Member.find({});
    
    // Group members by sector/village as "schools"
    const schoolGroups = {};
    let totalStudents = 0;
    let totalDropouts = 0;
    
    members.forEach(member => {
      const schoolKey = `${member.sector || 'Unknown'}-${member.village || 'Unknown'}`;
      
      if (!schoolGroups[schoolKey]) {
        schoolGroups[schoolKey] = {
          name: schoolKey,
          sector: member.sector || 'Unknown',
          village: member.village || 'Unknown',
          totalStudents: 0,
          dropouts: 0,
          activeStudents: 0
        };
      }
      
      schoolGroups[schoolKey].totalStudents++;
      totalStudents++;
      
      // Define dropout criteria (you can modify this based on your actual requirements)
      // For example: age > 18 and no recent activity, or specific status
      const isDropout = member.age > 18 && !member.telephone; // Example criteria
      
      if (isDropout) {
        schoolGroups[schoolKey].dropouts++;
        totalDropouts++;
      } else {
        schoolGroups[schoolKey].activeStudents++;
      }
    });
    
    const schools = Object.values(schoolGroups);
    const totalSchools = schools.length;
    const averageRate = totalStudents > 0 
      ? Math.round((totalDropouts / totalStudents) * 100) 
      : 0;
    
    const statistics = {
      totalSchools,
      totalStudents,
      totalDropouts,
      averageRate,
      schools: schools.map(school => ({
        ...school,
        dropoutRate: school.totalStudents > 0 
          ? Math.round((school.dropouts / school.totalStudents) * 100) 
          : 0
      }))
    };
    
    console.log("School dropout statistics calculated:", {
      totalSchools,
      totalStudents,
      totalDropouts,
      averageRate
    });
    
    res.json(statistics);
  } catch (err) {
    console.error("Error fetching school dropout statistics:", err);
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET ALL SCHOOLS //////////////////
router.get("/", async (req, res) => {
  try {
    const { sector, village } = req.query;
    
    // Get all members and group by sector/village
    const members = await Member.find({});
    const schoolGroups = {};
    
    members.forEach(member => {
      const schoolKey = `${member.sector || 'Unknown'}-${member.village || 'Unknown'}`;
      
      if (!schoolGroups[schoolKey]) {
        schoolGroups[schoolKey] = {
          name: schoolKey,
          sector: member.sector || 'Unknown',
          village: member.village || 'Unknown',
          totalStudents: 0,
          activeStudents: 0,
          dropouts: 0
        };
      }
      
      schoolGroups[schoolKey].totalStudents++;
      
      // Apply dropout criteria
      const isDropout = member.age > 18 && !member.telephone;
      if (isDropout) {
        schoolGroups[schoolKey].dropouts++;
      } else {
        schoolGroups[schoolKey].activeStudents++;
      }
    });
    
    let schools = Object.values(schoolGroups);
    
    // Filter by sector if provided
    if (sector) {
      schools = schools.filter(school => school.sector === sector);
    }
    
    // Filter by village if provided
    if (village) {
      schools = schools.filter(school => school.village === village);
    }
    
    // Add dropout rates
    schools = schools.map(school => ({
      ...school,
      dropoutRate: school.totalStudents > 0 
        ? Math.round((school.dropouts / school.totalStudents) * 100) 
        : 0
    }));
    
    res.json(schools);
  } catch (err) {
    console.error("Error fetching schools:", err);
    res.status(500).json({ error: err.message });
  }
});

//////////////// GET SCHOOL BY ID //////////////////
router.get("/:schoolId", async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // schoolId is expected to be in format "sector-village"
    const [sector, village] = schoolId.split('-');
    
    const members = await Member.find({ 
      sector: sector, 
      village: village 
    });
    
    if (members.length === 0) {
      return res.status(404).json({ error: "School not found" });
    }
    
    const school = {
      name: schoolId,
      sector,
      village,
      totalStudents: members.length,
      activeStudents: 0,
      dropouts: 0,
      students: members.map(member => ({
        name: member.name,
        age: member.age,
        sex: member.sex,
        telephone: member.telephone,
        role: member.role,
        status: member.age > 18 && !member.telephone ? 'dropout' : 'active'
      }))
    };
    
    // Calculate active and dropout counts
    school.activeStudents = school.students.filter(s => s.status === 'active').length;
    school.dropouts = school.students.filter(s => s.status === 'dropout').length;
    school.dropoutRate = school.totalStudents > 0 
      ? Math.round((school.dropouts / school.totalStudents) * 100) 
      : 0;
    
    res.json(school);
  } catch (err) {
    console.error("Error fetching school:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
