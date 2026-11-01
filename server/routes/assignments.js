const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Subject = require('../models/Subject');
const User = require('../models/User');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const handleUpload = require('../middleware/upload');
const { uploadFile, downloadFileStream, deleteFile } = require('../services/driveService');
const { notifyUser, notifyMany } = require('../services/notify');

// @route   POST /api/assignments
// @desc    Faculty posts a project or assignment for an allocated course & semester
// @access  Faculty or Admin
router.post('/assignments', auth, authorize('faculty', 'admin'), handleUpload('file'), async (req, res) => {
  try {
    const { title, description, subjectId, departmentId, department, semester, dueDate, maxMarks, type } = req.body;

    if (!title || !description || !dueDate || !maxMarks) {
      return res.status(400).json({ message: 'Title, description, due date, and max marks are required.' });
    }

    const marksNum = Number(maxMarks);
    if (isNaN(marksNum) || marksNum <= 0) {
      return res.status(400).json({ message: 'Maximum marks must be a positive number.' });
    }

    let targetDeptId = departmentId || department;
    let targetSem = semester ? Number(semester) : null;
    let subject = null;

    if (subjectId) {
      subject = await Subject.findById(subjectId).populate('department');
      if (subject) {
        targetDeptId = subject.department?._id || subject.department;
        targetSem = subject.semester;
      }
    }

    if (!targetDeptId || !targetSem) {
      return res.status(400).json({ message: 'Course (Department) and Semester are required.' });
    }

    // AC-10: Faculty can post projects/assignments only for courses and semesters allocated to them (or admin)
    if (req.user.role === 'faculty') {
      const hasSubjectAllocation = await Subject.findOne({
        department: targetDeptId,
        semester: targetSem,
        faculty: req.user._id,
        isActive: true
      });
      const isHomeDept = req.user.department && req.user.department.toString() === targetDeptId.toString();

      if (!hasSubjectAllocation && !isHomeDept) {
        return res.status(403).json({
          message: 'You can only assign projects or assignments to courses and semesters allocated to you by the administrator.'
        });
      }
    }

    let fileMeta = { name: null, contentType: null, size: 0, driveFileId: null };
    if (req.file) {
      const uploaded = await uploadFile({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype || 'application/octet-stream'
      });
      fileMeta = {
        name: uploaded.name,
        contentType: uploaded.contentType,
        size: uploaded.size,
        driveFileId: uploaded.driveFileId,
        data: uploaded.data
      };
    }

    const itemType = (type && type.toLowerCase() === 'project') ? 'project' : 'assignment';

    const assignment = new Assignment({
      title: title.trim(),
      description: description.trim(),
      type: itemType,
      subject: subject ? subject._id : null,
      department: targetDeptId,
      semester: targetSem,
      postedBy: req.user._id,
      dueDate: new Date(dueDate),
      maxMarks: marksNum,
      file: fileMeta
    });

    await assignment.save();

    // Notify all active students of that department and semester
    const students = await User.find({
      role: 'student',
      department: targetDeptId,
      semester: targetSem,
      isActive: true
    }).select('_id');

    const studentIds = students.map(s => s._id);
    await notifyMany(studentIds, {
      type: 'assignment_posted',
      message: `New ${itemType === 'project' ? 'Project' : 'Assignment'} posted: '${assignment.title}' (Due: ${new Date(dueDate).toLocaleDateString()}).`,
      link: `/assignments/${assignment._id}`
    });

    res.status(201).json({
      message: `${itemType === 'project' ? 'Project' : 'Assignment'} assigned successfully.`,
      assignment
    });
  } catch (error) {
    console.error('Post assignment error:', error);
    res.status(500).json({ message: error.message || 'Server error posting assignment/project.' });
  }
});

// @route   GET /api/assignments
// @desc    List assignments visible to the role (FR-ASG-03, NFR-SCP-01, AC-09)
// @access  Protected
router.get('/assignments', auth, async (req, res) => {
  try {
    const { subjectId, status, semester } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (subjectId) filter.subject = subjectId;

    if (req.user.role === 'student') {
      // Scoped to student's own department and semester (up to current enrolled semester)
      if (!req.user.department) {
        return res.json({ assignments: [] });
      }
      filter.department = req.user.department;
      if (semester) {
        filter.semester = Math.min(Number(semester), req.user.semester || 1);
      } else {
        filter.semester = { $lte: req.user.semester || 1 };
      }
    } else if (req.user.role === 'faculty') {
      // Faculty see assignments they posted or query by subject
      filter.postedBy = req.user._id;
      if (req.query.department) filter.department = req.query.department;
      if (req.query.semester) filter.semester = Number(req.query.semester);
      if (req.query.type) filter.type = req.query.type;
    }

    const assignments = await Assignment.find(filter)
      .populate('subject', 'name code semester')
      .populate('department', 'name code')
      .populate('postedBy', 'name email employeeId')
      .sort({ dueDate: 1, createdAt: -1 });

    // For students, enrich with their submission state (Pending, Submitted, Late, Graded per FR-ASG-07)
    if (req.user.role === 'student') {
      const enriched = await Promise.all(assignments.map(async (asg) => {
        const sub = await AssignmentSubmission.findOne({
          assignment: asg._id,
          student: req.user._id
        });

        let studentState = 'Pending';
        if (sub) {
          if (sub.marks !== null && sub.marks !== undefined) {
            studentState = 'Graded';
          } else if (sub.isLate) {
            studentState = 'Late';
          } else {
            studentState = 'Submitted';
          }
        }

        return {
          ...asg.toObject(),
          mySubmission: sub ? {
            _id: sub._id,
            submittedAt: sub.submittedAt,
            isLate: sub.isLate,
            marks: sub.marks,
            remarks: sub.remarks,
            fileName: sub.file?.name
          } : null,
          studentState
        };
      }));

      return res.json({ assignments: enriched });
    }

    // For faculty and admin, enrich with submission counts
    const enriched = await Promise.all(assignments.map(async (asg) => {
      const submissionCount = await AssignmentSubmission.countDocuments({ assignment: asg._id });
      return {
        ...asg.toObject(),
        submissionCount
      };
    }));

    res.json({ assignments: enriched });
  } catch (error) {
    console.error('Fetch assignments error:', error);
    res.status(500).json({ message: 'Error retrieving assignments.' });
  }
});

// @route   GET /api/assignments/:id
// @desc    Assignment detail (AC-09: 404 if outside student's dept/sem)
// @access  Protected
router.get('/assignments/:id', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('subject', 'name code semester')
      .populate('department', 'name code')
      .populate('postedBy', 'name email employeeId');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    // FR-ASG-03, NFR-SCP-02, AC-09: Student outside dept/sem receives HTTP 404
    if (req.user.role === 'student') {
      const userDept = req.user.department?._id?.toString() || req.user.department?.toString();
      const asgDept = assignment.department?._id?.toString() || assignment.department?.toString();
      if (userDept !== asgDept || req.user.semester !== assignment.semester) {
        return res.status(404).json({ message: 'Assignment not found.' });
      }

      // Check student's submission
      const sub = await AssignmentSubmission.findOne({
        assignment: assignment._id,
        student: req.user._id
      });

      return res.json({
        assignment: {
          ...assignment.toObject(),
          mySubmission: sub
        }
      });
    }

    res.json({ assignment });
  } catch (error) {
    console.error('Get assignment detail error:', error);
    res.status(500).json({ message: 'Error retrieving assignment detail.' });
  }
});

// @route   PUT /api/assignments/:id
// @desc    Edit or close assignment (FR-ASG-05, FR-ASG-06)
// @access  Faculty (Owner) or Admin
router.put('/assignments/:id', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { title, description, dueDate, maxMarks, status } = req.body;
    const assignment = await Assignment.findById(req.params.id).populate('subject');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    if (req.user.role === 'faculty' && assignment.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the posting faculty can edit this assignment.' });
    }

    if (maxMarks !== undefined) {
      const newMax = Number(maxMarks);
      // FR-ASG-05: Maximum marks cannot be set below a mark already given
      const highestGiven = await AssignmentSubmission.findOne({
        assignment: assignment._id,
        marks: { $ne: null }
      }).sort({ marks: -1 });

      if (highestGiven && highestGiven.marks > newMax) {
        return res.status(400).json({
          message: `Cannot set max marks to ${newMax}; a student was already awarded ${highestGiven.marks}.`
        });
      }
      assignment.maxMarks = newMax;
    }

    if (title) assignment.title = title.trim();
    if (description) assignment.description = description.trim();
    if (dueDate) assignment.dueDate = new Date(dueDate);
    if (status && ['open', 'closed'].includes(status)) assignment.status = status;

    await assignment.save();

    // FR-ASG-05: Students are notified of every edit
    const students = await User.find({
      role: 'student',
      department: assignment.department,
      semester: assignment.semester,
      isActive: true
    }).select('_id');

    await notifyMany(students.map(s => s._id), {
      type: 'assignment_updated',
      message: `Assignment '${assignment.title}' was updated by the faculty.`,
      link: `/assignments/${assignment._id}`
    });

    res.json({ message: 'Assignment updated successfully.', assignment });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ message: error.message || 'Error updating assignment.' });
  }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment or project posted by faculty or admin
// @access  Faculty (Owner) or Admin
router.delete('/assignments/:id', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment or Project not found.' });
    }

    if (req.user.role === 'faculty' && assignment.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete items you posted.' });
    }

    await AssignmentSubmission.deleteMany({ assignment: assignment._id });
    await Assignment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Deleted successfully.' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Error deleting assignment/project.' });
  }
});

// @route   GET /api/assignments/:id/file
// @desc    Download assignment attachment (FR-ASG-01, FR-SUB-06, NFR-FIL-02)
// @access  Authorized
router.get('/assignments/:id/file', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).select('+file.data');
    if (!assignment || !assignment.file || !assignment.file.name) {
      return res.status(404).json({ message: 'No attachment found for this assignment.' });
    }

    // Role scope check
    if (req.user.role === 'student') {
      const userDept = req.user.department?._id?.toString() || req.user.department?.toString();
      const asgDept = assignment.department?.toString();
      if (userDept !== asgDept || req.user.semester !== assignment.semester) {
        return res.status(404).json({ message: 'File not found.' });
      }
    }

    res.setHeader('Content-Type', assignment.file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(assignment.file.name)}"`);

    if (assignment.file.driveFileId) {
      const driveStream = await downloadFileStream(assignment.file.driveFileId);
      if (driveStream) return driveStream.pipe(res);
    }

    if (assignment.file.data) {
      return res.send(assignment.file.data);
    }

    res.status(404).json({ message: 'File stream could not be loaded.' });
  } catch (error) {
    console.error('Download assignment file error:', error);
    res.status(500).json({ message: 'Error downloading assignment attachment.' });
  }
});

// @route   POST /api/assignments/:id/submissions
// @desc    Student submits or resubmits assignment file (FR-ASM-01, FR-ASM-02, FR-ASM-03, BR-16, BR-17)
// @access  Student
router.post('/assignments/:id/submissions', auth, authorize('student'), handleUpload('file'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    // AC-09: Verify student belongs to assignment's department and semester
    const userDept = req.user.department?._id?.toString() || req.user.department?.toString();
    const asgDept = assignment.department?.toString();
    if (userDept !== asgDept || req.user.semester !== assignment.semester) {
      return res.status(404).json({ message: 'Assignment not found for your department and semester (AC-09).' });
    }

    // BR-16: No submission accepted after the assignment is closed
    if (assignment.status === 'closed') {
      return res.status(400).json({ message: 'This assignment is closed. No further submissions are accepted.' });
    }

    const projectLink = req.body.projectLink ? req.body.projectLink.trim() : '';
    const notes = req.body.notes ? req.body.notes.trim() : '';

    if (!req.file && !projectLink && !notes) {
      return res.status(400).json({ message: 'Please provide either a Project Link or upload a submission document.' });
    }

    // Check existing submission
    let existingSub = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: req.user._id
    });

    // BR-16: No resubmission after grading
    if (existingSub && existingSub.marks !== null && existingSub.marks !== undefined) {
      return res.status(400).json({ message: 'This submission has already been graded and cannot be resubmitted.' });
    }

    // Check if late (FR-ASM-03, BR-17)
    const isLate = new Date() > new Date(assignment.dueDate);

    let fileMeta = { name: null, contentType: null, size: 0, driveFileId: null, data: null };
    if (req.file) {
      // Upload to Drive or fallback buffer
      const uploaded = await uploadFile({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype || 'application/octet-stream'
      });
      fileMeta = {
        name: uploaded.name,
        contentType: uploaded.contentType,
        size: uploaded.size,
        driveFileId: uploaded.driveFileId,
        data: uploaded.data
      };
    } else if (existingSub && existingSub.file?.name) {
      fileMeta = existingSub.file;
    }

    if (existingSub) {
      if (req.file && existingSub.file?.driveFileId) {
        await deleteFile(existingSub.file.driveFileId);
      }
      existingSub.file = fileMeta;
      if (projectLink) existingSub.projectLink = projectLink;
      existingSub.notes = notes;
      existingSub.submittedAt = new Date();
      existingSub.isLate = isLate;
      await existingSub.save();
    } else {
      existingSub = new AssignmentSubmission({
        assignment: assignment._id,
        student: req.user._id,
        file: fileMeta,
        projectLink: projectLink,
        notes: notes,
        submittedAt: new Date(),
        isLate
      });
      await existingSub.save();
    }

    // FR-NTF-02 & AC-13: Notify assignment's faculty
    await notifyUser({
      recipient: assignment.postedBy,
      type: 'submission_received',
      message: `${req.user.name} submitted work for '${assignment.title}'${isLate ? ' (Late)' : ''}.`,
      link: `/assignments/${assignment._id}/tracker`
    });

    res.status(201).json({
      message: isLate ? 'Work submitted (flagged Late).' : 'Work submitted successfully!',
      submission: {
        _id: existingSub._id,
        submittedAt: existingSub.submittedAt,
        isLate: existingSub.isLate,
        fileName: existingSub.file?.name,
        projectLink: existingSub.projectLink
      }
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ message: error.message || 'Server error submitting assignment.' });
  }
});

// @route   GET /api/assignments/:id/submissions
// @desc    Faculty tracker: submitted, late, and pending students (FR-ASM-04)
// @access  Faculty (Owner) or Admin
router.get('/assignments/:id/submissions', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('department', 'name code');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    if (req.user.role === 'faculty' && assignment.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the author of this assignment can view the tracker.' });
    }

    // Get all enrolled active students in this cohort
    const allStudents = await User.find({
      role: 'student',
      department: assignment.department._id,
      semester: assignment.semester,
      isActive: true
    }).select('name email enrollmentNo');

    // Get all submissions
    const submissions = await AssignmentSubmission.find({ assignment: assignment._id })
      .populate('student', 'name email enrollmentNo')
      .populate('gradedBy', 'name email');

    const subMap = new Map();
    submissions.forEach(s => {
      subMap.set(s.student._id.toString(), s);
    });

    const submitted = [];
    const late = [];
    const pending = [];

    allStudents.forEach(st => {
      const sub = subMap.get(st._id.toString());
      if (sub) {
        const item = {
          submissionId: sub._id,
          student: st,
          submittedAt: sub.submittedAt,
          isLate: sub.isLate,
          marks: sub.marks,
          remarks: sub.remarks,
          projectLink: sub.projectLink,
          notes: sub.notes,
          fileName: sub.file?.name,
          fileSize: sub.file?.size,
          gradedBy: sub.gradedBy,
          gradedAt: sub.gradedAt
        };
        if (sub.isLate) late.push(item);
        else submitted.push(item);
      } else {
        pending.push({ student: st });
      }
    });

    res.json({
      assignment,
      stats: {
        totalStudents: allStudents.length,
        submittedCount: submitted.length + late.length,
        onTimeCount: submitted.length,
        lateCount: late.length,
        pendingCount: pending.length
      },
      submitted,
      late,
      pending
    });
  } catch (error) {
    console.error('Tracker error:', error);
    res.status(500).json({ message: 'Error retrieving assignment tracker.' });
  }
});

// @route   GET /api/assignment-submissions/:id/file
// @desc    Download student submitted file (FR-ASM-04, NFR-FIL-02)
// @access  Authorized
router.get('/assignment-submissions/:id/file', auth, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.id)
      .populate('assignment')
      .select('+file.data');

    if (!submission || !submission.file || !submission.file.name) {
      return res.status(404).json({ message: 'Submission file not found.' });
    }

    // Security check: Only student who submitted, faculty who posted, or admin
    const isOwner = submission.student.toString() === req.user._id.toString();
    const isFaculty = submission.assignment.postedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isFaculty && !isAdmin) {
      return res.status(403).json({ message: 'Access denied to this submitted file.' });
    }

    res.setHeader('Content-Type', submission.file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(submission.file.name)}"`);

    if (submission.file.driveFileId) {
      const driveStream = await downloadFileStream(submission.file.driveFileId);
      if (driveStream) return driveStream.pipe(res);
    }

    if (submission.file.data) {
      return res.send(submission.file.data);
    }

    res.status(404).json({ message: 'File stream not available.' });
  } catch (error) {
    console.error('Download submission file error:', error);
    res.status(500).json({ message: 'Error downloading submission file.' });
  }
});

// @route   PUT /api/assignment-submissions/:id/grade
// @desc    Faculty grades a submission with marks and remarks (FR-ASM-05, BR-18, FR-NTF-03, AC-13)
// @access  Faculty (Owner) or Admin
router.put('/assignment-submissions/:id/grade', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { marks, remarks } = req.body;
    const submission = await AssignmentSubmission.findById(req.params.id).populate('assignment');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    if (req.user.role === 'faculty' && submission.assignment.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only grade submissions for assignments you created.' });
    }

    const marksNum = Number(marks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > submission.assignment.maxMarks) {
      return res.status(400).json({
        message: `Marks must be between 0 and ${submission.assignment.maxMarks} (BR-18).`
      });
    }

    submission.marks = marksNum;
    submission.remarks = remarks ? remarks.trim() : '';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    await submission.save();

    // FR-NTF-03 & AC-13 & AC-14: Faculty saves or edits marks -> student is notified
    await notifyUser({
      recipient: submission.student,
      type: 'marks_updated',
      message: `Your submission for '${submission.assignment.title}' was graded: ${marksNum}/${submission.assignment.maxMarks} marks.`,
      link: '/my-marks'
    });

    res.json({
      message: 'Submission graded successfully.',
      submission: {
        _id: submission._id,
        marks: submission.marks,
        remarks: submission.remarks,
        gradedAt: submission.gradedAt
      }
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ message: error.message || 'Error saving grade.' });
  }
});

// @route   GET /api/assignments/:id/export
// @desc    Export assignment marks as CSV (FR-ASM-08)
// @access  Faculty (Owner) or Admin
router.get('/assignments/:id/export', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('subject');
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    const submissions = await AssignmentSubmission.find({ assignment: assignment._id })
      .populate('student', 'name email enrollmentNo');

    let csv = 'Enrollment No,Student Name,Email,Status,Submission Date,Is Late,Marks Obtained,Max Marks,Remarks\n';

    submissions.forEach(sub => {
      const st = sub.student;
      const status = sub.marks !== null ? 'Graded' : 'Submitted';
      const subDate = sub.submittedAt ? new Date(sub.submittedAt).toISOString() : '';
      const marks = sub.marks !== null ? sub.marks : 'Pending';
      const remarks = `"${(sub.remarks || '').replace(/"/g, '""')}"`;
      csv += `${st?.enrollmentNo || ''},"${st?.name || ''}",${st?.email || ''},${status},${subDate},${sub.isLate},${marks},${assignment.maxMarks},${remarks}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="marks_${assignment.title.replace(/\s+/g, '_')}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Error exporting marks CSV.' });
  }
});

// @route   GET /api/my-marks
// @desc    Student gets all their marks grouped by subject with obtained vs total (FR-ASM-07, UC-14)
// @access  Student
router.get('/my-marks', auth, authorize('student'), async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({
      student: req.user._id,
      marks: { $ne: null }
    }).populate({
      path: 'assignment',
      populate: { path: 'subject', select: 'name code' }
    }).sort({ gradedAt: -1 });

    const subjectsMap = {};

    submissions.forEach(sub => {
      const asg = sub.assignment;
      if (!asg) return;
      const subj = asg.subject;
      const subjId = subj?._id?.toString() || 'other';

      if (!subjectsMap[subjId]) {
        subjectsMap[subjId] = {
          subjectName: subj?.name || 'General',
          subjectCode: subj?.code || '',
          totalObtained: 0,
          totalPossible: 0,
          assignments: []
        };
      }

      subjectsMap[subjId].totalObtained += sub.marks;
      subjectsMap[subjId].totalPossible += asg.maxMarks;
      subjectsMap[subjId].assignments.push({
        assignmentId: asg._id,
        title: asg.title,
        dueDate: asg.dueDate,
        marksObtained: sub.marks,
        maxMarks: asg.maxMarks,
        remarks: sub.remarks,
        gradedAt: sub.gradedAt
      });
    });

    res.json({
      marksBySubject: Object.values(subjectsMap)
    });
  } catch (error) {
    console.error('My marks error:', error);
    res.status(500).json({ message: 'Error retrieving marks.' });
  }
});

module.exports = router;
