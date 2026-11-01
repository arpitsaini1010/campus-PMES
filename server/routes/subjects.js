const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { notifyUser } = require('../services/notify');

// @route   GET /api/subjects
// @desc    List subjects (filtered by role per FR-DEP-07)
// @access  Protected
router.get('/', auth, async (req, res) => {
  try {
    const { department, semester, facultyId } = req.query;
    const query = { isActive: true };

    if (req.user.role === 'student') {
      // Students see only their own department and semester subjects
      if (!req.user.department || !req.user.semester) {
        return res.json({ subjects: [] });
      }
      query.department = req.user.department;
      query.semester = req.user.semester;
    } else if (req.user.role === 'faculty') {
      // Faculty see their allocated subjects (or query by filter)
      if (facultyId === 'me' || !department) {
        query.faculty = req.user._id;
      } else {
        if (department) query.department = department;
        if (semester) query.semester = Number(semester);
      }
    } else if (req.user.role === 'admin') {
      if (department) query.department = department;
      if (semester) query.semester = Number(semester);
      if (facultyId) query.faculty = facultyId;
      // Allow viewing inactive subjects if admin specifies
      if (req.query.includeInactive === 'true') {
        delete query.isActive;
      }
    }

    const subjects = await Subject.find(query)
      .populate('department', 'name code totalSemesters')
      .populate('faculty', 'name email employeeId designation')
      .sort({ semester: 1, name: 1 });

    res.json({ subjects });
  } catch (error) {
    console.error('Fetch subjects error:', error);
    res.status(500).json({ message: 'Error retrieving subjects.' });
  }
});

// @route   POST /api/subjects
// @desc    Create a new subject (FR-DEP-04)
// @access  Admin only
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, code, department, semester, faculty } = req.body;

    if (!name || !code || !department || !semester) {
      return res.status(400).json({ message: 'Name, code, department, and semester are required.' });
    }

    const deptDoc = await Department.findById(department);
    if (!deptDoc) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const semNum = Number(semester);
    if (semNum < 1 || semNum > deptDoc.totalSemesters) {
      return res.status(400).json({
        message: `Semester must be between 1 and ${deptDoc.totalSemesters} for ${deptDoc.name}.`
      });
    }

    const existingCode = await Subject.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ message: `Subject code '${code}' already exists.` });
    }

    let allocatedFaculty = null;
    if (faculty) {
      const facUser = await User.findById(faculty);
      if (!facUser || facUser.role !== 'faculty') {
        return res.status(400).json({ message: 'Allocated faculty must be a valid faculty account.' });
      }
      if (facUser.department && facUser.department.toString() !== deptDoc._id.toString()) {
        return res.status(400).json({ message: 'Faculty must belong to the subject department (FR-DEP-05).' });
      }
      allocatedFaculty = facUser._id;
    }

    const subjectType = req.body.type === 'Practical' ? 'Practical' : 'Theory';

    const subject = new Subject({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department: deptDoc._id,
      semester: semNum,
      faculty: allocatedFaculty,
      type: subjectType,
      maxMarks: subjectType === 'Practical' ? 150 : 100,
      passingMarks: subjectType === 'Practical' ? 60 : 40
    });

    await subject.save();

    if (allocatedFaculty) {
      await notifyUser({
        recipient: allocatedFaculty,
        type: 'subject_allocated',
        message: `You have been allocated the subject ${subject.name} (${subject.code}) for Semester ${subject.semester}.`,
        link: '/faculty/subjects'
      });
    }

    const populated = await Subject.findById(subject._id)
      .populate('department', 'name code')
      .populate('faculty', 'name email employeeId');

    res.status(201).json({ message: 'Subject created successfully.', subject: populated });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ message: error.message || 'Error creating subject.' });
  }
});

// @route   PUT /api/subjects/:id
// @desc    Edit subject details, marking scheme, department, semester, or toggle active status
// @access  Admin only
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, code, department, semester, type, isActive } = req.body;
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    if (name) subject.name = name.trim();

    if (code) {
      const trimmedCode = code.trim().toUpperCase();
      const duplicateCode = await Subject.findOne({
        _id: { $ne: subject._id },
        code: trimmedCode
      });
      if (duplicateCode) {
        return res.status(400).json({ message: `Subject code '${trimmedCode}' is already in use.` });
      }
      subject.code = trimmedCode;
    }

    let deptDoc = null;
    if (department) {
      deptDoc = await Department.findById(department);
      if (!deptDoc) {
        return res.status(400).json({ message: 'Valid department is required.' });
      }
      subject.department = deptDoc._id;
    } else {
      deptDoc = await Department.findById(subject.department);
    }

    if (semester !== undefined) {
      const s = Number(semester);
      if (isNaN(s) || s < 1 || (deptDoc && s > deptDoc.totalSemesters)) {
        return res.status(400).json({
          message: `Semester must be between 1 and ${deptDoc?.totalSemesters || 12}.`
        });
      }
      subject.semester = s;
    }

    if (type) {
      const isPractical = type === 'Practical';
      subject.type = isPractical ? 'Practical' : 'Theory';
      subject.maxMarks = isPractical ? 150 : 100;
      subject.passingMarks = isPractical ? 60 : 40;
    }

    if (isActive !== undefined) {
      subject.isActive = Boolean(isActive);
    }

    await subject.save();
    const populated = await Subject.findById(subject._id)
      .populate('department', 'name code')
      .populate('faculty', 'name email employeeId');

    res.json({ message: 'Subject updated successfully.', subject: populated });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ message: error.message || 'Error updating subject.' });
  }
});

// @route   DELETE /api/subjects/:id
// @desc    Delete a subject
// @access  Admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    // Remove any assignments linked to this subject or clean references
    await Assignment.deleteMany({ subject: subject._id });
    await Subject.findByIdAndDelete(subject._id);

    res.json({ message: `Subject '${subject.name}' (${subject.code}) deleted successfully.` });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ message: error.message || 'Error deleting subject.' });
  }
});

// @route   PUT /api/subjects/:id/allocate
// @desc    Allocate faculty of the same department (FR-DEP-05, BR-12, FR-NTF-04)
// @access  Admin only
router.put('/:id/allocate', auth, authorize('admin'), async (req, res) => {
  try {
    const { facultyId } = req.body;
    const subject = await Subject.findById(req.params.id).populate('department');

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    if (!facultyId) {
      subject.faculty = null;
      await subject.save();
      return res.json({ message: 'Faculty allocation removed.', subject });
    }

    const facultyUser = await User.findById(facultyId);
    if (!facultyUser || facultyUser.role !== 'faculty') {
      return res.status(400).json({ message: 'Selected user is not a valid faculty member.' });
    }

    // Enforce FR-DEP-05 & BR-12: Faculty must belong to same department
    if (facultyUser.department && facultyUser.department.toString() !== subject.department._id.toString()) {
      return res.status(400).json({
        message: `Faculty must belong to the department '${subject.department.name}' (FR-DEP-05).`
      });
    }

    subject.faculty = facultyUser._id;
    await subject.save();

    // FR-NTF-04: Admin allocates a subject to a faculty member -> That faculty member is notified
    await notifyUser({
      recipient: facultyUser._id,
      type: 'subject_allocated',
      message: `You have been allocated to teach ${subject.name} (${subject.code}) - Semester ${subject.semester}.`,
      link: '/faculty/subjects'
    });

    const populated = await Subject.findById(subject._id)
      .populate('department', 'name code')
      .populate('faculty', 'name email employeeId designation');

    res.json({ message: 'Faculty allocated successfully.', subject: populated });
  } catch (error) {
    console.error('Allocate faculty error:', error);
    res.status(500).json({ message: error.message || 'Error allocating faculty.' });
  }
});

module.exports = router;
