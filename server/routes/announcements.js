const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Subject = require('../models/Subject');
const User = require('../models/User');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { notifyMany } = require('../services/notify');

// @route   GET /api/announcements
// @desc    List announcements visible to user (FR-ANN-03)
// @access  Protected
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      const userDept = req.user.department?._id || req.user.department;
      const userSem = req.user.semester;

      // Student sees announcements for all (dept=null), or matching dept (sem=null or matching sem)
      query = {
        $or: [
          { department: null },
          { department: userDept, semester: null },
          { department: userDept, semester: userSem }
        ]
      };
    }

    const announcements = await Announcement.find(query)
      .populate('postedBy', 'name email role employeeId')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.json({ announcements });
  } catch (error) {
    console.error('Fetch announcements error:', error);
    res.status(500).json({ message: 'Error retrieving announcements.' });
  }
});

// @route   POST /api/announcements
// @desc    Post announcement (Admin: all, dept, or dept+sem; Faculty: allocated dept+sem) (FR-ANN-01, FR-ANN-02)
// @access  Faculty or Admin
router.post('/', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { title, body, department, semester } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required.' });
    }

    let targetDept = department || null;
    let targetSem = semester ? Number(semester) : null;

    if (req.user.role === 'faculty') {
      if (!targetDept) {
        return res.status(400).json({
          message: 'Please select a course / department for your announcement.'
        });
      }

      // Verify faculty belongs to this course or has subjects allocated in it
      const isHomeDept = req.user.department && req.user.department.toString() === targetDept.toString();
      const hasSubjectInDept = await Subject.findOne({
        faculty: req.user._id,
        department: targetDept,
        isActive: true
      });

      if (!isHomeDept && !hasSubjectInDept) {
        return res.status(403).json({
          message: 'You can only post announcements for courses / departments allocated to you.'
        });
      }

      // If a specific semester is chosen, verify it does not exceed the course duration
      if (targetSem) {
        const deptDoc = await Department.findById(targetDept);
        if (deptDoc && targetSem > deptDoc.totalSemesters) {
          return res.status(400).json({
            message: `Selected semester ${targetSem} exceeds total semesters (${deptDoc.totalSemesters}) for ${deptDoc.name}.`
          });
        }
      }
    }

    const announcement = new Announcement({
      title: title.trim(),
      body: body.trim(),
      postedBy: req.user._id,
      department: targetDept,
      semester: targetSem
    });

    await announcement.save();

    // FR-ANN-03 & FR-NTF-09: Target users are notified
    const recipientQuery = { isActive: true, role: 'student' };
    if (targetDept) recipientQuery.department = targetDept;
    if (targetSem) recipientQuery.semester = targetSem;

    const recipients = await User.find(recipientQuery).select('_id');
    const recipientIds = recipients.map(r => r._id);

    await notifyMany(recipientIds, {
      type: 'announcement_posted',
      message: `Announcement: ${announcement.title}`,
      link: '/announcements'
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('postedBy', 'name email role employeeId')
      .populate('department', 'name code');

    res.status(201).json({
      message: 'Announcement posted successfully.',
      announcement: populated
    });
  } catch (error) {
    console.error('Post announcement error:', error);
    res.status(500).json({ message: error.message || 'Error posting announcement.' });
  }
});

// @route   PUT /api/announcements/:id
// @desc    Edit announcement
// @access  Author or Admin
router.put('/:id', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { title, body, department, semester } = req.body;
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    if (req.user.role !== 'admin' && announcement.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own announcements.' });
    }

    if (title) announcement.title = title.trim();
    if (body) announcement.body = body.trim();
    if (department !== undefined) announcement.department = department || null;
    if (semester !== undefined) announcement.semester = semester ? Number(semester) : null;

    await announcement.save();
    const populated = await Announcement.findById(announcement._id)
      .populate('postedBy', 'name email role employeeId')
      .populate('department', 'name code');

    res.json({ message: 'Announcement updated successfully.', announcement: populated });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ message: error.message || 'Error updating announcement.' });
  }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement (FR-ANN-04)
// @access  Author or Admin
router.delete('/:id', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    if (req.user.role !== 'admin' && announcement.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own announcements.' });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted successfully.' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Error deleting announcement.' });
  }
});

module.exports = router;
