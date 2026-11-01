const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const SubjectMarks = require('../models/SubjectMarks');
const User = require('../models/User');
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { notifyUser } = require('../services/notify');

/**
 * Helper to validate component marks against the university marking scheme
 */
const validateComponentMarks = (subjectType, { minorExam, majorExam, testQuiz, assignment, practical }) => {
  const errors = [];

  if (minorExam !== null && minorExam !== undefined && minorExam !== '') {
    const val = Number(minorExam);
    if (isNaN(val) || val < 0 || val > 20) errors.push('Minor Exams marks must be between 0 and 20.');
  }

  if (majorExam !== null && majorExam !== undefined && majorExam !== '') {
    const val = Number(majorExam);
    if (isNaN(val) || val < 0 || val > 60) errors.push('Major Exam marks must be between 0 and 60.');
  }

  if (testQuiz !== null && testQuiz !== undefined && testQuiz !== '') {
    const val = Number(testQuiz);
    if (isNaN(val) || val < 0 || val > 10) errors.push('Test/Quiz marks must be between 0 and 10.');
  }

  if (assignment !== null && assignment !== undefined && assignment !== '') {
    const val = Number(assignment);
    if (isNaN(val) || val < 0 || val > 10) errors.push('Assignment marks must be between 0 and 10.');
  }

  if (subjectType === 'Practical') {
    if (practical !== null && practical !== undefined && practical !== '') {
      const val = Number(practical);
      if (isNaN(val) || val < 0 || val > 50) errors.push('Practical component marks must be between 0 and 50.');
    }
  }

  return errors;
};

// @route   GET /api/marks/subject/:subjectId
// @desc    Faculty / Admin gets class grade sheet for a subject
// @access  Faculty (allocated) or Admin
router.get('/subject/:subjectId', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId)
      .populate('department', 'name code totalSemesters')
      .populate('faculty', 'name email employeeId designation');

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    // Security check: If faculty, verify allocation
    if (req.user.role === 'faculty' && (!subject.faculty || subject.faculty._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'You are not allocated to this subject.' });
    }

    // Find all active students in the subject's department & semester
    const students = await User.find({
      role: 'student',
      department: subject.department._id,
      semester: subject.semester,
      isActive: true
    }).select('name email enrollmentNo semester').sort({ enrollmentNo: 1, name: 1 });

    // Find all existing marks for this subject
    const existingMarks = await SubjectMarks.find({ subject: subject._id });
    const marksMap = {};
    existingMarks.forEach(m => {
      marksMap[m.student.toString()] = m;
    });

    const studentRows = students.map(st => {
      const m = marksMap[st._id.toString()];
      return {
        student: st,
        marksId: m ? m._id : null,
        minorExam: m ? m.minorExam : null,
        majorExam: m ? m.majorExam : null,
        testQuiz: m ? m.testQuiz : null,
        assignment: m ? m.assignment : null,
        practical: subject.type === 'Practical' ? (m ? m.practical : null) : null,
        totalMarks: m ? m.totalMarks : null,
        maxMarks: subject.maxMarks || (subject.type === 'Practical' ? 150 : 100),
        passingMarks: subject.passingMarks || (subject.type === 'Practical' ? 60 : 40),
        isPassed: m ? m.isPassed : null,
        percentage: m ? m.percentage : null,
        remarks: m ? m.remarks : '',
        gradedAt: m ? m.gradedAt : null
      };
    });

    // Compute cohort statistics
    const gradedRows = studentRows.filter(r => r.totalMarks !== null);
    const passedCount = gradedRows.filter(r => r.isPassed).length;
    const failedCount = gradedRows.filter(r => r.isPassed === false).length;
    const totalScore = gradedRows.reduce((acc, curr) => acc + curr.totalMarks, 0);
    const averageMarks = gradedRows.length > 0 ? (totalScore / gradedRows.length).toFixed(1) : 0;

    res.json({
      subject: {
        _id: subject._id,
        name: subject.name,
        code: subject.code,
        type: subject.type || 'Theory',
        maxMarks: subject.maxMarks || (subject.type === 'Practical' ? 150 : 100),
        passingMarks: subject.passingMarks || (subject.type === 'Practical' ? 60 : 40),
        department: subject.department,
        semester: subject.semester,
        faculty: subject.faculty
      },
      scheme: {
        type: subject.type || 'Theory',
        minorMax: 20,
        majorMax: 60,
        quizMax: 10,
        assignmentMax: 10,
        practicalMax: subject.type === 'Practical' ? 50 : 0,
        totalMax: subject.type === 'Practical' ? 150 : 100,
        passingThreshold: subject.type === 'Practical' ? 60 : 40
      },
      stats: {
        totalStudents: students.length,
        gradedCount: gradedRows.length,
        pendingCount: students.length - gradedRows.length,
        passedCount,
        failedCount,
        averageMarks
      },
      students: studentRows
    });
  } catch (error) {
    console.error('Error fetching subject grade sheet:', error);
    res.status(500).json({ message: 'Error retrieving subject grade sheet.' });
  }
});

// @route   PUT /api/marks/subject/:subjectId/student/:studentId
// @desc    Faculty / Admin enters or updates marks for a single student
// @access  Faculty (allocated) or Admin
router.put('/subject/:subjectId/student/:studentId', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { subjectId, studentId } = req.params;
    const { minorExam, majorExam, testQuiz, assignment, practical, remarks } = req.body;

    const subject = await Subject.findById(subjectId).populate('department');
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    if (req.user.role === 'faculty' && (!subject.faculty || subject.faculty.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'You are not authorized to grade this subject.' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Valid student not found.' });
    }

    // Validate marks bounds according to subject type
    const errors = validateComponentMarks(subject.type, { minorExam, majorExam, testQuiz, assignment, practical });
    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0], errors });
    }

    const cleanNum = (val) => (val !== null && val !== undefined && val !== '') ? Number(val) : null;

    let markRecord = await SubjectMarks.findOne({ subject: subject._id, student: student._id });

    if (!markRecord) {
      markRecord = new SubjectMarks({
        subject: subject._id,
        student: student._id,
        department: subject.department._id,
        semester: subject.semester,
        subjectType: subject.type
      });
    }

    markRecord.subjectType = subject.type;
    markRecord.minorExam = cleanNum(minorExam);
    markRecord.majorExam = cleanNum(majorExam);
    markRecord.testQuiz = cleanNum(testQuiz);
    markRecord.assignment = cleanNum(assignment);
    markRecord.practical = subject.type === 'Practical' ? cleanNum(practical) : null;
    markRecord.remarks = remarks !== undefined ? remarks.trim() : markRecord.remarks;
    markRecord.gradedBy = req.user._id;
    markRecord.gradedAt = new Date();

    await markRecord.save();

    // Notify student about updated marks
    if (markRecord.totalMarks !== null) {
      const statusText = markRecord.isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT';
      await notifyUser({
        recipient: student._id,
        type: 'assignment_graded',
        message: `Your marks for ${subject.name} (${subject.code}) have been recorded: ${markRecord.totalMarks} / ${markRecord.maxMarks} (${statusText}).`,
        link: '/my-marks'
      });
    }

    res.json({
      message: 'Student marks saved successfully.',
      marks: markRecord
    });
  } catch (error) {
    console.error('Error saving student marks:', error);
    res.status(500).json({ message: error.message || 'Error saving student marks.' });
  }
});

// @route   POST /api/marks/subject/:subjectId/bulk
// @desc    Faculty / Admin saves grade sheet in bulk for multiple students
// @access  Faculty (allocated) or Admin
router.post('/subject/:subjectId/bulk', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { studentsMarks } = req.body;

    if (!Array.isArray(studentsMarks)) {
      return res.status(400).json({ message: 'studentsMarks array is required.' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    if (req.user.role === 'faculty' && (!subject.faculty || subject.faculty.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'You are not authorized to grade this subject.' });
    }

    const cleanNum = (val) => (val !== null && val !== undefined && val !== '') ? Number(val) : null;
    let savedCount = 0;

    for (const item of studentsMarks) {
      if (!item.studentId) continue;

      const errors = validateComponentMarks(subject.type, item);
      if (errors.length > 0) continue; // Skip invalid row in bulk

      let markRecord = await SubjectMarks.findOne({ subject: subject._id, student: item.studentId });
      if (!markRecord) {
        markRecord = new SubjectMarks({
          subject: subject._id,
          student: item.studentId,
          department: subject.department,
          semester: subject.semester,
          subjectType: subject.type
        });
      }

      markRecord.subjectType = subject.type;
      markRecord.minorExam = cleanNum(item.minorExam);
      markRecord.majorExam = cleanNum(item.majorExam);
      markRecord.testQuiz = cleanNum(item.testQuiz);
      markRecord.assignment = cleanNum(item.assignment);
      markRecord.practical = subject.type === 'Practical' ? cleanNum(item.practical) : null;
      if (item.remarks !== undefined) markRecord.remarks = item.remarks.trim();
      markRecord.gradedBy = req.user._id;
      markRecord.gradedAt = new Date();

      await markRecord.save();
      savedCount++;
    }

    res.json({
      message: `Successfully updated grade records for ${savedCount} student(s).`,
      savedCount
    });
  } catch (error) {
    console.error('Bulk marks update error:', error);
    res.status(500).json({ message: 'Error processing bulk grade updates.' });
  }
});

// @route   GET /api/marks/subject/:subjectId/export-csv
// @desc    Export subject grade sheet as CSV
// @access  Faculty (allocated) or Admin
router.get('/subject/:subjectId/export-csv', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId).populate('department');
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    const students = await User.find({
      role: 'student',
      department: subject.department._id,
      semester: subject.semester,
      isActive: true
    }).select('name email enrollmentNo').sort({ enrollmentNo: 1 });

    const existingMarks = await SubjectMarks.find({ subject: subject._id });
    const marksMap = {};
    existingMarks.forEach(m => { marksMap[m.student.toString()] = m; });

    const isPractical = subject.type === 'Practical';
    let headers = 'Enrollment No,Student Name,Email,Subject Code,Subject Name,Subject Type,Minor Exam (20),Major Exam (60),Test/Quiz (10),Assignment (10)';
    if (isPractical) headers += ',Practical (50)';
    headers += ',Total Marks,Max Marks,Passing Marks,Result Status,Percentage,Remarks\n';

    let csv = headers;

    students.forEach(st => {
      const m = marksMap[st._id.toString()];
      const minor = m && m.minorExam !== null ? m.minorExam : '';
      const major = m && m.majorExam !== null ? m.majorExam : '';
      const quiz = m && m.testQuiz !== null ? m.testQuiz : '';
      const asg = m && m.assignment !== null ? m.assignment : '';
      const prac = isPractical && m && m.practical !== null ? m.practical : '';
      const total = m && m.totalMarks !== null ? m.totalMarks : '';
      const max = subject.maxMarks || (isPractical ? 150 : 100);
      const passMark = subject.passingMarks || (isPractical ? 60 : 40);
      const status = m && m.isPassed !== null ? (m.isPassed ? 'PASS' : 'FAIL') : 'PENDING';
      const pct = m && m.percentage !== null ? `${m.percentage}%` : '';
      const remarks = `"${(m?.remarks || '').replace(/"/g, '""')}"`;

      let row = `${st.enrollmentNo || ''},"${st.name}",${st.email},${subject.code},"${subject.name}",${subject.type},${minor},${major},${quiz},${asg}`;
      if (isPractical) row += `,${prac}`;
      row += `,${total},${max},${passMark},${status},${pct},${remarks}\n`;

      csv += row;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${subject.code}_GradeSheet.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export grade sheet error:', error);
    res.status(500).json({ message: 'Error exporting grade sheet CSV.' });
  }
});

// @route   GET /api/marks/my-marks
// @desc    Student gets detailed breakdown of marks across all enrolled subjects
// @access  Student
router.get('/my-marks', auth, authorize('student'), async (req, res) => {
  try {
    const student = req.user;
    if (!student.department || !student.semester) {
      return res.json({ subjects: [], summary: { totalSubjects: 0 } });
    }

    // Determine target semester: allow student to pick semester <= current semester
    let targetSemester = student.semester || 1;
    if (req.query.semester) {
      const semNum = parseInt(req.query.semester, 10);
      if (!isNaN(semNum) && semNum >= 1 && semNum <= (student.semester || 1)) {
        targetSemester = semNum;
      }
    }

    // Find all active subjects in student's department & targetSemester
    const subjects = await Subject.find({
      department: student.department,
      semester: targetSemester,
      isActive: true
    }).populate('faculty', 'name email employeeId designation').sort({ code: 1 });

    const marksRecords = await SubjectMarks.find({
      student: student._id
    });

    const marksMap = {};
    marksRecords.forEach(m => {
      marksMap[m.subject.toString()] = m;
    });

    let totalObtained = 0;
    let totalPossible = 0;
    let passedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    const subjectCards = subjects.map(subj => {
      const m = marksMap[subj._id.toString()];
      const isPractical = subj.type === 'Practical';
      const maxMarks = subj.maxMarks || (isPractical ? 150 : 100);
      const passingMarks = subj.passingMarks || (isPractical ? 60 : 40);

      const hasMarks = m && m.totalMarks !== null && m.totalMarks !== undefined;

      if (hasMarks) {
        totalObtained += m.totalMarks;
        totalPossible += maxMarks;
        if (m.isPassed) passedCount++;
        else failedCount++;
      } else {
        totalPossible += maxMarks;
        pendingCount++;
      }

      return {
        subjectId: subj._id,
        name: subj.name,
        code: subj.code,
        type: subj.type || 'Theory',
        maxMarks,
        passingMarks,
        faculty: subj.faculty ? {
          name: subj.faculty.name,
          email: subj.faculty.email,
          designation: subj.faculty.designation
        } : null,
        scheme: {
          minorMax: 20,
          majorMax: 60,
          quizMax: 10,
          assignmentMax: 10,
          practicalMax: isPractical ? 50 : 0
        },
        scores: {
          minorExam: m ? m.minorExam : null,
          majorExam: m ? m.majorExam : null,
          testQuiz: m ? m.testQuiz : null,
          assignment: m ? m.assignment : null,
          practical: isPractical ? (m ? m.practical : null) : null
        },
        totalMarks: m ? m.totalMarks : null,
        percentage: m ? m.percentage : null,
        isPassed: m ? m.isPassed : null,
        status: hasMarks ? (m.isPassed ? 'PASS' : 'FAIL') : 'PENDING',
        remarks: m ? m.remarks : '',
        gradedAt: m ? m.gradedAt : null
      };
    });

    const overallPercentage = totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(1) : 0;

    res.json({
      student: {
        name: student.name,
        enrollmentNo: student.enrollmentNo,
        departmentName: student.departmentName,
        currentSemester: student.semester,
        selectedSemester: targetSemester,
        availableSemesters: Array.from({ length: student.semester || 1 }, (_, i) => i + 1)
      },
      subjects: subjectCards,
      summary: {
        totalSubjects: subjects.length,
        totalObtained,
        totalPossible,
        overallPercentage,
        passedCount,
        failedCount,
        pendingCount
      }
    });
  } catch (error) {
    console.error('Error in student my-marks:', error);
    res.status(500).json({ message: 'Error retrieving your marks report.' });
  }
});

module.exports = router;

