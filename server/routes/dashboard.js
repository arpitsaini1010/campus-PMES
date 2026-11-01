const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const Category = require('../models/Category');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// @route   GET /api/dashboard
// @desc    Retrieve role-specific dashboard metrics in a single API call (FR-DSH-01 to FR-DSH-04)
// @access  Protected
router.get('/', auth, async (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'student') {
      // 1. Student Dashboard (FR-DSH-01)
      const project = await Project.findOne({
        $or: [{ leader: req.user._id }, { members: req.user._id }]
      })
        .populate('category', 'name')
        .populate('department', 'name code')
        .populate('leader', 'name email enrollmentNo')
        .populate('members', 'name email enrollmentNo')
        .populate('supervisor', 'name email employeeId designation');

      let submissions = [];
      let latestFeedback = null;
      let evaluation = null;

      if (project) {
        submissions = await Submission.find({ project: project._id })
          .select('-file.data')
          .populate('submittedBy', 'name email')
          .populate('feedback.by', 'name email employeeId')
          .sort({ createdAt: -1 });

        const allFeedback = [];
        for (const sub of submissions) {
          for (const fb of sub.feedback) {
            allFeedback.push({
              submissionType: sub.type,
              submissionDate: sub.createdAt,
              text: fb.text,
              by: fb.by,
              date: fb.date
            });
          }
        }
        allFeedback.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (allFeedback.length > 0) {
          latestFeedback = allFeedback[0];
        }

        if (project.status === 'Evaluated') {
          evaluation = await Evaluation.findOne({ project: project._id })
            .populate('evaluatedBy', 'name email employeeId');
        }
      }

      // All coursework assignments for student's department & semester (up to current enrolled semester)
      const studentSem = req.user.semester || 1;
      const allSemesterAssignments = await Assignment.find({
        department: req.user.department,
        semester: { $lte: studentSem }
      })
        .populate('subject', 'name code type semester')
        .populate('postedBy', 'name email designation')
        .sort({ dueDate: 1, createdAt: -1 });

      // Student's submissions across all assignments
      const mySubmissions = await AssignmentSubmission.find({
        student: req.user._id
      })
        .populate({
          path: 'assignment',
          populate: { path: 'subject', select: 'name code semester' }
        })
        .select('-file.data')
        .sort({ submittedAt: -1 });

      const submissionMap = {};
      mySubmissions.forEach(sub => {
        if (sub.assignment) {
          const asgId = sub.assignment._id ? sub.assignment._id.toString() : sub.assignment.toString();
          submissionMap[asgId] = sub;
        }
      });

      // Split into pendingAssignments (needs student action) and submittedAssignments
      const pendingAssignments = [];
      const submittedAssignments = [];

      allSemesterAssignments.forEach(asg => {
        const sub = submissionMap[asg._id.toString()];
        if (sub) {
          submittedAssignments.push({
            assignment: asg,
            submission: sub
          });
        } else {
          pendingAssignments.push(asg);
        }
      });

      // Also ensure any previous or other submitted assignments from mySubmissions are present in submittedAssignments
      mySubmissions.forEach(sub => {
        if (sub.assignment) {
          const asgId = sub.assignment._id ? sub.assignment._id.toString() : sub.assignment.toString();
          const alreadyAdded = submittedAssignments.some(item => (item.assignment?._id?.toString() || item.assignment?.toString()) === asgId);
          if (!alreadyAdded) {
            submittedAssignments.push({
              assignment: sub.assignment,
              submission: sub
            });
          }
        }
      });

      // Assignments due in next 48 hours
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const upcomingAssignments = pendingAssignments.filter(asg => {
        const d = new Date(asg.dueDate);
        return d >= now && d <= in48Hours;
      });

      // Latest assignment marks
      const latestMarks = mySubmissions.filter(s => s.marks !== null && s.marks !== undefined).slice(0, 5);

      // Unread notification count
      const unreadNotificationCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false
      });

      return res.json({
        role: 'student',
        project,
        allSemesterAssignments,
        pendingAssignments,
        submittedAssignments,
        upcomingAssignments,
        latestMarks,
        latestFeedback,
        evaluation,
        unreadNotificationCount
      });
    }

    if (role === 'faculty') {
      // 2. Faculty Dashboard (FR-DSH-02)
      // Allocated subjects grouped by semester
      const subjects = await Subject.find({
        faculty: req.user._id,
        isActive: true
      })
        .populate('department', 'name code')
        .sort({ semester: 1, name: 1 });

      const subjectsBySemester = {};
      subjects.forEach(sub => {
        const sem = sub.semester;
        if (!subjectsBySemester[sem]) subjectsBySemester[sem] = [];
        subjectsBySemester[sem].push(sub);
      });

      // Submissions awaiting grading
      const facultyAssignments = await Assignment.find({ postedBy: req.user._id }).select('_id');
      const assignmentIds = facultyAssignments.map(a => a._id);

      const awaitingGradingSubmissions = await AssignmentSubmission.find({
        assignment: { $in: assignmentIds },
        marks: null
      })
        .populate({
          path: 'assignment',
          populate: { path: 'subject', select: 'name code' }
        })
        .populate('student', 'name email enrollmentNo')
        .sort({ submittedAt: 1 })
        .limit(10);

      const awaitingGradingCount = await AssignmentSubmission.countDocuments({
        assignment: { $in: assignmentIds },
        marks: null
      });

      // Assigned projects count per status, pending proposals & finals
      const assignedProjects = await Project.find({ supervisor: req.user._id })
        .populate('category', 'name')
        .populate('department', 'name code')
        .populate('leader', 'name email enrollmentNo')
        .populate('members', 'name email enrollmentNo')
        .sort({ updatedAt: -1 });

      const statusCounts = {
        Draft: 0,
        'Proposal Submitted': 0,
        'In Progress': 0,
        'Final Submitted': 0,
        Evaluated: 0,
        Rejected: 0
      };

      const pendingProposals = [];
      const pendingEvaluations = [];

      for (const p of assignedProjects) {
        if (statusCounts[p.status] !== undefined) {
          statusCounts[p.status]++;
        }
        if (p.status === 'Proposal Submitted') pendingProposals.push(p);
        if (p.status === 'Final Submitted') pendingEvaluations.push(p);
      }

      return res.json({
        role: 'faculty',
        subjects,
        subjectsBySemester,
        awaitingGradingCount,
        awaitingGradingSubmissions,
        totalAssigned: assignedProjects.length,
        statusCounts,
        pendingProposals,
        pendingEvaluations,
        projects: assignedProjects
      });
    }

    if (role === 'admin') {
      // 3. Admin Dashboard (FR-DSH-03, FR-DEP-03, BR-19, AC-17)
      const departments = await Department.find().sort({ name: 1 });

      const departmentStats = await Promise.all(departments.map(async (d) => {
        const facultyCount = await User.countDocuments({
          department: d._id,
          role: 'faculty',
          isActive: true
        });
        const studentCount = await User.countDocuments({
          department: d._id,
          role: 'student',
          isActive: true
        });
        const subjectCount = await Subject.countDocuments({
          department: d._id,
          isActive: true
        });

        return {
          departmentId: d._id,
          name: d.name,
          code: d.code,
          totalSemesters: d.totalSemesters,
          facultyCount,
          studentCount,
          subjectCount,
          // Warning when department has fewer than 5 active faculty (FR-DEP-03, BR-19, AC-17)
          isFacultyUnderstaffed: facultyCount < 5
        };
      }));

      // Departments with fewer than 5 active faculty
      const understaffedDepartments = departmentStats.filter(ds => ds.isFacultyUnderstaffed);

      // Subjects without allocated faculty
      const unallocatedSubjects = await Subject.find({
        faculty: null,
        isActive: true
      })
        .populate('department', 'name code')
        .sort({ semester: 1 });

      // Projects per status
      const statuses = ['Draft', 'Proposal Submitted', 'In Progress', 'Final Submitted', 'Evaluated', 'Rejected'];
      const statusCounts = {};
      for (const st of statuses) {
        statusCounts[st] = await Project.countDocuments({ status: st });
      }

      // Projects without supervisor (FR-ADM-06)
      const unassignedProjects = await Project.find({ supervisor: null })
        .populate('category', 'name')
        .populate('department', 'name code')
        .populate('leader', 'name email enrollmentNo')
        .sort({ createdAt: -1 });

      const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
      const totalFaculty = await User.countDocuments({ role: 'faculty', isActive: true });
      const totalProjects = await Project.countDocuments();

      return res.json({
        role: 'admin',
        counts: {
          students: totalStudents,
          faculty: totalFaculty,
          projects: totalProjects,
          unassignedProjects: unassignedProjects.length,
          unallocatedSubjects: unallocatedSubjects.length
        },
        departmentStats,
        understaffedDepartments,
        unallocatedSubjects,
        unassignedProjects,
        statusCounts
      });
    }

    return res.status(400).json({ message: 'Invalid role for dashboard.' });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error retrieving dashboard metrics.' });
  }
});

module.exports = router;
