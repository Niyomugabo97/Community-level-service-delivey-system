const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Member, CitizenReport, LeaderReport } = require('../models');

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (decoded.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Admin signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, userType: 'admin' });

    const token = jwt.sign(
      { id: user._id, email: user.email, userType: 'admin' },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '8h' }
    );
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email, userType: 'admin' });
    if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid admin credentials' });

    const token = jwt.sign(
      { id: user._id, email: user.email, userType: 'admin' },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all non-admin users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ userType: { $ne: 'admin' } })
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, telephone, userType, sector, cell, village } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const validTypes = ['citizen', 'leader', 'cell', 'sector', 'school'];
    if (userType && !validTypes.includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, telephone, passwordHash,
      userType: userType || 'citizen',
      sector, cell, village
    });
    const { passwordHash: _, ...userObj } = user.toObject();
    res.status(201).json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role
router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['citizen', 'leader', 'cell', 'sector', 'school'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: citizen, leader, cell, sector, school' });
    }

    const userTypeValue = role === 'citizen' ? 'citizen' : role;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { userType: userTypeValue },
      { new: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [totalUsers, leaders, cells, sectors, schools, members, citizenReports, leaderReports] = await Promise.all([
      User.countDocuments({ userType: { $ne: 'admin' } }),
      User.countDocuments({ userType: 'leader' }),
      User.countDocuments({ userType: 'cell' }),
      User.countDocuments({ userType: 'sector' }),
      User.countDocuments({ userType: 'school' }),
      Member.countDocuments(),
      CitizenReport.countDocuments(),
      LeaderReport.countDocuments()
    ]);

    const assignedCount = leaders + cells + sectors + schools;
    const citizens = totalUsers - assignedCount;

    res.json({
      users: { total: totalUsers, citizens: Math.max(0, citizens), leaders, cells, sectors, schools },
      members,
      reports: { citizen: citizenReports, leader: leaderReports }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.requireAdmin = requireAdmin;
