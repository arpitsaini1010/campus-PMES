const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Department = require('../models/Department');
const auth = require('../middleware/auth');

// Helper to sign JWT token (24h validity as per FR-AUTH-03)
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'campus_pmes_jwt_secret_dev_key_2026';
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    secret,
    { expiresIn: '24h' }
  );
};

// @route   POST /api/auth/register
// @desc    Simple student registration
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, enrollmentNo, program, semester, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { personalEmail: normalizedEmail }]
    });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const defaultDept = await Department.findOne();

    const student = new User({
      name: name.trim(),
      email: normalizedEmail,
      personalEmail: normalizedEmail,
      enrollmentNo: (enrollmentNo && enrollmentNo.trim()) ? enrollmentNo.trim() : `ENR-${Date.now().toString().slice(-5)}`,
      program: program || 'BCA',
      semester: semester ? Number(semester) : 1,
      department: defaultDept ? defaultDept._id : null,
      role: 'student',
      password: password
    });

    await student.save();

    const token = generateToken(student);
    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: student.toSafeObject()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration.' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get JWT token (FR-AUTH-03, FR-AUTH-04)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password, enrollmentNo, identifier } = req.body;
    const loginIdentifier = (identifier || email || enrollmentNo || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Please provide your University Email, Personal Email, or Enrollment Number along with your password.' });
    }

    const normalized = loginIdentifier.toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: normalized },
        { universityEmail: normalized },
        { personalEmail: normalized },
        { enrollmentNo: new RegExp(`^${loginIdentifier}$`, 'i') },
        { employeeId: new RegExp(`^${loginIdentifier}$`, 'i') }
      ]
    }).populate('department');

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials. User record not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is deactivated. Please contact an administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials. Password did not match.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful.',
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current authenticated user profile
// @access  Protected (Any authenticated role)
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user._id).populate('department');
  res.json({
    user: user ? user.toSafeObject() : req.user.toSafeObject()
  });
});

// @route   POST /api/auth/change-password
// @desc    Change own password (FR-STU-06, FR-AUTH-02)
// @access  Protected (Any authenticated role)
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // If user is not in forced password change mode, verify currentPassword
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required.' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.temporaryPassword = null;
    await user.save();

    res.json({
      message: 'Password changed successfully. You may now continue.',
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message || 'Server error changing password.' });
  }
});

module.exports = router;
