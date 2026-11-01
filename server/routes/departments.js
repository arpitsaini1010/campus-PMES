const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const User = require('../models/User');
const Subject = require('../models/Subject');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// @route   GET /api/departments
// @desc    List all university departments (BCA, BTECH, BBA, MCA, Pharmacy)
// @access  Public / Authenticated
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    
    // Enrich with active faculty count for FR-DEP-03 warning calculations
    const enriched = await Promise.all(departments.map(async (d) => {
      const activeFacultyCount = await User.countDocuments({
        department: d._id,
        role: 'faculty',
        isActive: true
      });
      const activeStudentCount = await User.countDocuments({
        department: d._id,
        role: 'student',
        isActive: true
      });
      const subjectCount = await Subject.countDocuments({
        department: d._id,
        isActive: true
      });
      return {
        ...d.toObject(),
        activeFacultyCount,
        activeStudentCount,
        subjectCount
      };
    }));

    res.json({ departments: enriched });
  } catch (error) {
    console.error('Fetch departments error:', error);
    res.status(500).json({ message: 'Error retrieving departments.' });
  }
});

// @route   POST /api/departments
// @desc    Add new university department (FR-DEP-01)
// @access  Admin only
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, code, totalSemesters } = req.body;

    if (!name || !code || totalSemesters === undefined || totalSemesters === null) {
      return res.status(400).json({ message: 'Department name, code, and total semesters are required.' });
    }

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    const s = Number(totalSemesters);

    if (isNaN(s) || s < 1 || s > 12) {
      return res.status(400).json({ message: 'Total semesters must be between 1 and 12.' });
    }

    const existing = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } },
        { code: trimmedCode }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: `A department with name '${trimmedName}' or code '${trimmedCode}' already exists.` });
    }

    const dept = new Department({
      name: trimmedName,
      code: trimmedCode,
      totalSemesters: s
    });

    await dept.save();
    res.status(201).json({ message: 'Department created successfully.', department: dept });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: error.message || 'Error creating department.' });
  }
});

// @route   PUT /api/departments/:id
// @desc    Edit department (name, code, total semesters)
// @access  Admin only (FR-DEP-01, FR-DEP-04)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, code, totalSemesters } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    if (totalSemesters !== undefined) {
      const s = Number(totalSemesters);
      if (isNaN(s) || s < 1 || s > 12) {
        return res.status(400).json({ message: 'Total semesters must be between 1 and 12.' });
      }
      department.totalSemesters = s;
    }

    if (name) {
      const trimmedName = name.trim();
      const duplicateName = await Department.findOne({
        _id: { $ne: department._id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
      });
      if (duplicateName) {
        return res.status(400).json({ message: `Department name '${trimmedName}' is already in use.` });
      }
      department.name = trimmedName;
    }

    if (code) {
      const trimmedCode = code.trim().toUpperCase();
      const duplicateCode = await Department.findOne({
        _id: { $ne: department._id },
        code: trimmedCode
      });
      if (duplicateCode) {
        return res.status(400).json({ message: `Department code '${trimmedCode}' is already in use.` });
      }
      department.code = trimmedCode;
    }

    await department.save();
    res.json({ message: 'Department updated successfully.', department });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: error.message || 'Error updating department.' });
  }
});

// @route   DELETE /api/departments/:id
// @desc    Delete department (only if no students, faculty, or subjects attached)
// @access  Admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const facultyCount = await User.countDocuments({ department: department._id, role: 'faculty' });
    const studentCount = await User.countDocuments({ department: department._id, role: 'student' });
    const subjectCount = await Subject.countDocuments({ department: department._id });

    if (facultyCount > 0 || studentCount > 0 || subjectCount > 0) {
      return res.status(400).json({
        message: `Cannot delete department '${department.name}'. It currently has ${facultyCount} faculty, ${studentCount} students, and ${subjectCount} subjects linked to it.`
      });
    }

    await Department.findByIdAndDelete(department._id);
    res.json({ message: `Department '${department.name}' deleted successfully.` });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: error.message || 'Error deleting department.' });
  }
});

module.exports = router;
