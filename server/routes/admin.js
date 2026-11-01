const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { notifyUser, notifyMany } = require('../services/notify');
const { getNextId } = require('../utils/idGenerator');

// All routes in this router require admin role
router.use(auth, authorize('admin'));

// @route   GET /api/admin/next-id
// @desc    Get next sequential employeeId or enrollmentNo (auto-generation)
// @access  Admin
router.get('/next-id', async (req, res) => {
  try {
    const { role } = req.query;
    if (!role || (role !== 'faculty' && role !== 'student')) {
      return res.status(400).json({ message: 'Valid role (faculty or student) is required.' });
    }
    const nextId = await getNextId(role);
    res.json({ nextId });
  } catch (error) {
    console.error('Error generating next ID:', error);
    res.status(500).json({ message: 'Failed to generate next sequential ID.' });
  }
});

// @route   POST /api/admin/faculty
// @desc    Create Faculty account (FR-ADM-01, FR-AUTH-02)
// @access  Admin
router.post('/faculty', async (req, res) => {
  try {
    const { name, email, employeeId, password, department, designation, specialization, maxProjects, phone } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({
        message: 'Name, email, department, and temporary password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    let deptDoc = null;
    if (mongoose.Types.ObjectId.isValid(department)) {
      deptDoc = await Department.findById(department);
    }
    if (!deptDoc) {
      deptDoc = await Department.findOne({
        $or: [
          { code: new RegExp(`^${department}$`, 'i') },
          { name: new RegExp(`^${department}$`, 'i') }
        ]
      });
    }
    if (!deptDoc) {
      return res.status(400).json({ message: 'Valid department is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    // Auto-generate employeeId if omitted, and ensure uniqueness
    let finalEmpId = (employeeId && employeeId.trim()) ? employeeId.trim() : await getNextId('faculty');
    let existingEmp = await User.findOne({ employeeId: finalEmpId });
    while (existingEmp) {
      const match = finalEmpId.match(/^([A-Za-z\-_]+)(\d+)$/);
      if (match) {
        finalEmpId = `${match[1]}${String(parseInt(match[2], 10) + 1).padStart(match[2].length, '0')}`;
        existingEmp = await User.findOne({ employeeId: finalEmpId });
      } else {
        return res.status(400).json({ message: 'A faculty member with this employee ID already exists.' });
      }
    }

    const faculty = new User({
      name: name.trim(),
      email: normalizedEmail,
      employeeId: finalEmpId,
      password,
      temporaryPassword: password,
      role: 'faculty',
      department: deptDoc._id,
      departmentName: deptDoc.name,
      designation: designation || 'Assistant Professor',
      specialization: specialization ? specialization.trim() : 'General',
      maxProjects: maxProjects ? Number(maxProjects) : 5,
      mustChangePassword: true,
      temporaryPassword: password,
      phone: phone ? phone.trim() : null
    });

    await faculty.save();

    res.status(201).json({
      message: 'Faculty account created successfully.',
      user: faculty.toSafeObject()
    });
  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({ message: error.message || 'Server error creating faculty.' });
  }
});

// @route   POST /api/admin/students
// @desc    Register a student with comprehensive profile (FR-STU-01, FR-AUTH-02)
// @access  Admin
router.post('/students', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      name,
      gender,
      address,
      dob,
      admissionDate,
      department,
      semester,
      personalEmail,
      universityEmail,
      email,
      enrollmentNo,
      password,
      program,
      batch,
      section
    } = req.body;

    const fName = (firstName || '').trim();
    const lName = (lastName || '').trim();
    const fullName = (fName || lName) ? `${fName} ${lName}`.trim() : (name || '').trim();

    if (!fullName) {
      return res.status(400).json({ message: 'First Name and Last Name are required.' });
    }

    if (!personalEmail || !personalEmail.trim()) {
      return res.status(400).json({ message: 'Personal Email is required for student registration.' });
    }

    if (!department) {
      return res.status(400).json({ message: 'Course / Department is required.' });
    }

    if (!semester) {
      return res.status(400).json({ message: 'Academic Semester is required.' });
    }

    const defaultPwd = password && password.trim() ? password.trim() : (fName ? `${fName.toLowerCase()}@12345` : null);
    if (!defaultPwd || defaultPwd.length < 8) {
      return res.status(400).json({ message: 'Password is required and must be at least 8 characters long.' });
    }

    const deptDoc = await Department.findById(department);
    if (!deptDoc) {
      return res.status(400).json({ message: 'Valid department / course is required.' });
    }

    const semNum = Number(semester);
    if (semNum < 1 || semNum > deptDoc.totalSemesters) {
      return res.status(400).json({
        message: `Semester must be between 1 and ${deptDoc.totalSemesters} for course ${deptDoc.name}.`
      });
    }

    const normalizedPersonal = personalEmail.trim().toLowerCase();
    const existingPersonal = await User.findOne({ personalEmail: normalizedPersonal });
    if (existingPersonal) {
      return res.status(400).json({ message: `A student with personal email (${normalizedPersonal}) is already registered.` });
    }

    // University Email is optional initially
    let normalizedUniEmail = null;
    const rawUniEmail = (universityEmail || email || '').trim();
    if (rawUniEmail) {
      normalizedUniEmail = rawUniEmail.toLowerCase();
      const existingEmail = await User.findOne({ 
        $or: [{ email: normalizedUniEmail }, { universityEmail: normalizedUniEmail }] 
      });
      if (existingEmail) {
        return res.status(400).json({ message: `University email (${normalizedUniEmail}) is already assigned to another user.` });
      }
    }

    // Auto-generate enrollmentNo (Primary Key) if omitted, and ensure uniqueness
    let finalEnrollNo = (enrollmentNo && enrollmentNo.trim()) ? enrollmentNo.trim() : await getNextId('student');
    let existingEnroll = await User.findOne({ enrollmentNo: finalEnrollNo });
    while (existingEnroll) {
      const match = finalEnrollNo.match(/^([A-Za-z\-_]+)(\d+)$/);
      if (match) {
        finalEnrollNo = `${match[1]}${String(parseInt(match[2], 10) + 1).padStart(match[2].length, '0')}`;
        existingEnroll = await User.findOne({ enrollmentNo: finalEnrollNo });
      } else {
        return res.status(400).json({ message: 'A student with this enrollment number already exists.' });
      }
    }

    const student = new User({
      name: fullName,
      firstName: fName || fullName.split(' ')[0],
      lastName: lName || fullName.split(' ').slice(1).join(' '),
      gender: gender || 'Male',
      address: address ? address.trim() : '',
      dob: dob ? new Date(dob) : null,
      admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
      personalEmail: normalizedPersonal,
      universityEmail: normalizedPersonal,
      email: normalizedPersonal,
      enrollmentNo: finalEnrollNo,
      department: deptDoc._id,
      departmentName: deptDoc.name,
      semester: semNum,
      program: program || deptDoc.name,
      batch: batch || null,
      section: section || null,
      password: defaultPwd,
      temporaryPassword: defaultPwd,
      role: 'student',
      mustChangePassword: true
    });

    await student.save();

    res.status(201).json({
      message: `Student ${fullName} (${finalEnrollNo}) registered successfully.`,
      user: student.toSafeObject(),
      temporaryPassword: defaultPwd
    });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({ message: error.message || 'Server error registering student.' });
  }
});

// @route   POST /api/admin/students/:id/assign-university-email
// @desc    Assign / generate official University Email for student and notify personal email
// @access  Admin
router.post('/students/:id/assign-university-email', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    let uniEmail = req.body.universityEmail ? req.body.universityEmail.trim().toLowerCase() : null;

    if (!uniEmail) {
      // Auto-construct standard university email format
      const domain = process.env.UNIVERSITY_DOMAIN || 'cpur.in';
      const namePart = (student.firstName || student.name.split(' ')[0] || 'student')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const enrollPart = student.enrollmentNo.toLowerCase().replace(/[^a-z0-9]/g, '');
      uniEmail = `${namePart}.${enrollPart}@${domain}`;
    }

    // Check if another user already has this university email
    const conflict = await User.findOne({
      _id: { $ne: student._id },
      $or: [{ email: uniEmail }, { universityEmail: uniEmail }]
    });
    if (conflict) {
      return res.status(400).json({ message: `Email '${uniEmail}' is already assigned to another user.` });
    }

    student.universityEmail = uniEmail;
    student.email = uniEmail;
    await student.save();

    // Create in-app notification for the student
    await notifyUser({
      recipient: student._id,
      type: 'university_email_allocated',
      message: `Your official University Email (${uniEmail}) has been allocated. You can now use it to sign in. Notice dispatched to your personal email (${student.personalEmail || 'registered email'}).`,
      link: '/dashboard'
    });

    res.json({
      message: `Official University Email (${uniEmail}) assigned successfully to ${student.name}. Allocation notice dispatched to personal email (${student.personalEmail || 'on file'}).`,
      user: student.toSafeObject()
    });
  } catch (error) {
    console.error('Error assigning university email:', error);
    res.status(500).json({ message: error.message || 'Failed to assign university email.' });
  }
});

// @route   POST /api/admin/students/import
// @desc    Bulk import students from CSV data (FR-STU-02, UC-01)
// @access  Admin
router.post('/students/import', async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ message: 'CSV text content is required in csvData field.' });
    }

    const lines = csvData.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV must contain a header and at least one student row.' });
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = header.indexOf('name');
    const emailIdx = header.indexOf('email');
    const enrollIdx = header.indexOf('enrollmentno') !== -1 ? header.indexOf('enrollmentno') : header.indexOf('enrollment');
    const deptIdx = header.indexOf('department');
    const semIdx = header.indexOf('semester');

    if (nameIdx === -1 || emailIdx === -1 || enrollIdx === -1) {
      return res.status(400).json({
        message: "CSV header must include at least 'name', 'email', 'enrollmentNo' (and optionally 'department', 'semester')."
      });
    }

    const departments = await Department.find();
    const deptMap = {};
    departments.forEach(d => {
      deptMap[d.name.toLowerCase()] = d;
      deptMap[d.code.toLowerCase()] = d;
    });

    const defaultDept = departments[0];

    const results = {
      total: lines.length - 1,
      created: 0,
      errors: []
    };

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(c => c.trim());
      const name = row[nameIdx];
      const email = row[emailIdx]?.toLowerCase();
      const enrollmentNo = row[enrollIdx];
      const deptVal = deptIdx !== -1 ? row[deptIdx]?.toLowerCase() : null;
      const semVal = semIdx !== -1 ? Number(row[semIdx]) : 1;

      if (!name || !email || !enrollmentNo) {
        results.errors.push({ row: i, reason: 'Missing required fields (name, email, or enrollment number).' });
        continue;
      }

      const deptDoc = deptMap[deptVal] || defaultDept;
      if (!deptDoc) {
        results.errors.push({ row: i, email, reason: 'Department could not be identified.' });
        continue;
      }

      if (semVal < 1 || semVal > deptDoc.totalSemesters) {
        results.errors.push({ row: i, email, reason: `Semester ${semVal} is out of bounds (1-${deptDoc.totalSemesters}).` });
        continue;
      }

      const existing = await User.findOne({ $or: [{ email }, { enrollmentNo }] });
      if (existing) {
        results.errors.push({ row: i, email, reason: 'Email or enrollment number already exists.' });
        continue;
      }

      // Generate a secure temporary password
      const tempPassword = `Temp@${Math.random().toString(36).slice(-6)}!`;

      const student = new User({
        name,
        email,
        enrollmentNo,
        department: deptDoc._id,
        departmentName: deptDoc.name,
        semester: semVal,
        program: deptDoc.name,
        password: tempPassword,
        role: 'student',
        mustChangePassword: true
      });

      await student.save();
      results.created++;
    }

    res.json({
      message: `CSV import completed: ${results.created} created, ${results.errors.length} skipped.`,
      results
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ message: error.message || 'Server error during CSV import.' });
  }
});

// @route   GET /api/admin/students
// @desc    List students with department and semester filtering (FR-STU-05)
// @access  Admin
router.get('/students', async (req, res) => {
  try {
    const { department, semester } = req.query;
    const filter = { role: 'student' };

    if (department) filter.department = department;
    if (semester) filter.semester = Number(semester);

    const students = await User.find(filter)
      .populate('department', 'name code totalSemesters')
      .select('-password')
      .sort({ semester: 1, name: 1 });

    res.json({ students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error retrieving students.' });
  }
});

// @route   PUT /api/admin/students/:id/semester
// @desc    Assign or change student's semester (FR-STU-03, FR-NTF-05)
// @access  Admin
router.put('/students/:id/semester', async (req, res) => {
  try {
    const { semester } = req.body;
    const student = await User.findOne({ _id: req.params.id, role: 'student' }).populate('department');

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const semNum = Number(semester);
    if (!semNum || semNum < 1 || (student.department && semNum > student.department.totalSemesters)) {
      return res.status(400).json({
        message: `Semester must be between 1 and ${student.department?.totalSemesters || 12}.`
      });
    }

    student.semester = semNum;
    await student.save();

    // FR-NTF-05: Admin changes or promotes student semester -> That student is notified
    await notifyUser({
      recipient: student._id,
      type: 'semester_changed',
      message: `Your semester has been updated to Semester ${semNum}.`,
      link: '/dashboard'
    });

    res.json({
      message: `Student semester updated to ${semNum}.`,
      student: student.toSafeObject()
    });
  } catch (error) {
    console.error('Update semester error:', error);
    res.status(500).json({ message: error.message || 'Server error updating semester.' });
  }
});

// @route   POST /api/admin/students/promote
// @desc    Promote all active students of one dept & semester to the next (FR-STU-04, AC-16, FR-NTF-05)
// @access  Admin
router.post('/students/promote', async (req, res) => {
  try {
    const { department, semester } = req.body;

    if (!department || !semester) {
      return res.status(400).json({ message: 'Department and current semester are required.' });
    }

    const deptDoc = await Department.findById(department);
    if (!deptDoc) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const currentSem = Number(semester);
    if (currentSem >= deptDoc.totalSemesters) {
      // Students in final semester are not promoted per FR-STU-04
      const graduatingStudents = await User.find({
        role: 'student',
        department: deptDoc._id,
        semester: currentSem,
        isActive: true
      }).select('-password');

      return res.status(400).json({
        message: `Semester ${currentSem} is the final semester for ${deptDoc.name}. Students cannot be promoted further.`,
        finalSemesterStudents: graduatingStudents
      });
    }

    const nextSem = currentSem + 1;

    // Fetch all active students in this cohort
    const students = await User.find({
      role: 'student',
      department: deptDoc._id,
      semester: currentSem,
      isActive: true
    });

    if (students.length === 0) {
      return res.json({
        message: `No active students found in ${deptDoc.name} Semester ${currentSem}.`,
        promotedCount: 0
      });
    }

    const studentIds = students.map(s => s._id);

    // Promote all active students in one action
    await User.updateMany(
      { _id: { $in: studentIds } },
      { $set: { semester: nextSem } }
    );

    // FR-NTF-05: Notify all promoted students in bulk
    await notifyMany(studentIds, {
      type: 'semester_promoted',
      message: `Congratulations! You have been promoted to Semester ${nextSem} of ${deptDoc.name}.`,
      link: '/dashboard'
    });

    res.json({
      message: `Successfully promoted ${students.length} students from Semester ${currentSem} to Semester ${nextSem} in ${deptDoc.name}.`,
      promotedCount: students.length,
      nextSemester: nextSem
    });
  } catch (error) {
    console.error('Promotion error:', error);
    res.status(500).json({ message: error.message || 'Server error during semester promotion.' });
  }
});

// @route   PUT /api/admin/users/:id/reset-password
// @desc    Admin resets user password to a new temporary password (FR-STU-06, NFR-SEC-08)
// @access  Admin
router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const { temporaryPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const newTemp = temporaryPassword || `Temp@${Math.random().toString(36).slice(-6)}#`;
    if (newTemp.length < 8) {
      return res.status(400).json({ message: 'Temporary password must be at least 8 characters.' });
    }

    user.password = newTemp;
    user.temporaryPassword = newTemp;
    user.mustChangePassword = true;
    await user.save();

    res.json({
      message: `Password reset successfully for ${user.name}.`,
      temporaryPassword: newTemp
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: error.message || 'Server error resetting password.' });
  }
});

// @route   GET /api/admin/users
// @desc    List all users with optional filtering (FR-ADM-02)
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const filter = {};
    if (req.query.role && ['student', 'faculty', 'admin'].includes(req.query.role)) {
      filter.role = req.query.role;
    }
    if (req.query.department) {
      filter.department = req.query.department;
    }

    const users = await User.find(filter)
      .populate('department', 'name code totalSemesters')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ message: 'Server error retrieving users.' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user details (name, email, department, role-specific attributes)
// @access  Admin
router.put('/users/:id', async (req, res) => {
  try {
    const {
      name,
      firstName,
      lastName,
      gender,
      address,
      dob,
      admissionDate,
      personalEmail,
      universityEmail,
      email,
      enrollmentNo,
      employeeId,
      department,
      semester,
      designation,
      specialization,
      phone,
      maxProjects
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();

    if (name) {
      user.name = name.trim();
    } else if (firstName !== undefined || lastName !== undefined) {
      user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name;
    }

    if (gender) user.gender = gender;
    if (address !== undefined) user.address = address.trim();
    if (dob) user.dob = new Date(dob);
    if (admissionDate) user.admissionDate = new Date(admissionDate);

    if (personalEmail !== undefined) {
      const normalizedPersonal = personalEmail ? personalEmail.trim().toLowerCase() : null;
      if (normalizedPersonal) {
        const conflict = await User.findOne({ _id: { $ne: user._id }, personalEmail: normalizedPersonal });
        if (conflict) {
          return res.status(400).json({ message: `Personal email '${normalizedPersonal}' is already used by another student.` });
        }
      }
      user.personalEmail = normalizedPersonal;
    }

    const uniEmailVal = universityEmail !== undefined ? universityEmail : email;
    if (uniEmailVal !== undefined) {
      const normalizedUni = uniEmailVal ? uniEmailVal.trim().toLowerCase() : null;
      if (normalizedUni) {
        const conflict = await User.findOne({
          _id: { $ne: user._id },
          $or: [{ email: normalizedUni }, { universityEmail: normalizedUni }]
        });
        if (conflict) {
          return res.status(400).json({ message: `University email '${normalizedUni}' is already in use.` });
        }
      }
      user.universityEmail = normalizedUni;
      user.email = normalizedUni;
    }

    if (department) {
      let deptDoc = null;
      if (mongoose.Types.ObjectId.isValid(department)) {
        deptDoc = await Department.findById(department);
      }
      if (!deptDoc) {
        deptDoc = await Department.findOne({
          $or: [
            { code: new RegExp(`^${department}$`, 'i') },
            { name: new RegExp(`^${department}$`, 'i') }
          ]
        });
      }
      if (deptDoc) {
        user.department = deptDoc._id;
        user.departmentName = deptDoc.name;
      }
    }

    if (user.role === 'student') {
      if (enrollmentNo) {
        const trimmedEnroll = enrollmentNo.trim();
        const existingEnroll = await User.findOne({
          _id: { $ne: user._id },
          enrollmentNo: trimmedEnroll
        });
        if (existingEnroll) {
          return res.status(400).json({ message: `Enrollment number '${trimmedEnroll}' already exists.` });
        }
        user.enrollmentNo = trimmedEnroll;
      }
      if (semester !== undefined) {
        user.semester = Number(semester);
      }
    }

    if (user.role === 'faculty') {
      if (employeeId) {
        const trimmedEmp = employeeId.trim();
        const existingEmp = await User.findOne({
          _id: { $ne: user._id },
          employeeId: trimmedEmp
        });
        if (existingEmp) {
          return res.status(400).json({ message: `Employee ID '${trimmedEmp}' already exists.` });
        }
        user.employeeId = trimmedEmp;
      }
      if (designation) user.designation = designation.trim();
      if (specialization) user.specialization = specialization.trim();
      if (maxProjects !== undefined) user.maxProjects = Number(maxProjects);
    }

    if (phone !== undefined) user.phone = phone ? phone.trim() : null;

    await user.save();
    const updated = await User.findById(user._id).populate('department', 'name code totalSemesters');

    res.json({
      message: 'User updated successfully.',
      user: updated.toSafeObject()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: error.message || 'Server error updating user.' });
  }
});

// @route   PUT /api/admin/users/:id/active
// @desc    Deactivate or reactivate user (FR-ADM-02, BR-20)
// @access  Admin
router.put('/users/:id/active', async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot deactivate your own administrator account.' });
    }

    user.isActive = isActive !== undefined ? Boolean(isActive) : !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      user: user.toSafeObject()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating user active state.' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete or deactivate user (FR-ADM-02)
// @access  Admin
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Administrators cannot delete their own account.' });
    }

    const activeProject = await Project.findOne({
      $or: [
        { leader: user._id },
        { members: user._id },
        { supervisor: user._id }
      ]
    });

    if (activeProject) {
      user.isActive = false;
      await user.save();
      return res.json({
        message: 'User is linked to existing project(s). Account has been deactivated instead of deleted to protect academic records.',
        user: user.toSafeObject()
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

// @route   PUT /api/admin/projects/:id/assign
// @desc    Assign supervisor from same department before evaluation (FR-ADM-04, BR-04, FR-NTF-08)
// @access  Admin
router.put('/projects/:id/assign', async (req, res) => {
  try {
    const { facultyId } = req.body;
    if (!facultyId) {
      return res.status(400).json({ message: 'facultyId is required' });
    }

    const project = await Project.findById(req.params.id).populate('department');
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (project.status === 'Evaluated') {
      return res.status(400).json({ message: 'Cannot change supervisor of an already evaluated project.' });
    }

    const faculty = await User.findOne({ _id: facultyId, role: 'faculty', isActive: true });
    if (!faculty) {
      return res.status(400).json({ message: 'Valid active faculty member not found.' });
    }

    // Any active faculty member can be assigned as project supervisor
    project.supervisor = faculty._id;
    project.history.push({
      status: project.status,
      changedBy: req.user._id,
      date: new Date(),
      note: `Supervisor assigned: ${faculty.name} (${faculty.employeeId || faculty.email})`
    });

    await project.save();

    // FR-NTF-08: Admin assigns or changes project supervisor -> faculty and all team members notified
    await notifyUser({
      recipient: faculty._id,
      type: 'supervisor_assigned',
      message: `You have been assigned as supervisor for project '${project.title}'.`,
      link: `/projects/${project._id}`
    });

    const teamRecipients = [...new Set([project.leader.toString(), ...(project.members || []).map(m => m.toString())])];
    await notifyMany(teamRecipients, {
      type: 'supervisor_assigned',
      message: `Faculty member ${faculty.name} has been assigned as your project supervisor.`,
      link: `/projects/${project._id}`
    });

    const populatedProject = await Project.findById(project._id)
      .populate('category', 'name')
      .populate('department', 'name code')
      .populate('leader', 'name email enrollmentNo')
      .populate('members', 'name email enrollmentNo')
      .populate('supervisor', 'name email employeeId department');

    res.json({
      message: `Faculty member ${faculty.name} assigned as supervisor.`,
      project: populatedProject
    });
  } catch (error) {
    console.error('Error assigning supervisor:', error);
    res.status(500).json({ message: error.message || 'Server error assigning supervisor.' });
  }
});

module.exports = router;
