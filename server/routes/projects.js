const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const Category = require('../models/Category');
const Department = require('../models/Department');
const Submission = require('../models/Submission');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { notifyUser, notifyMany } = require('../services/notify');

// Helper to check if a student is already part of an active project (BR-03)
const isStudentInActiveProject = async (studentId, currentProjectId = null) => {
  const query = {
    $or: [{ leader: studentId }, { members: studentId }]
  };
  if (currentProjectId) {
    query._id = { $ne: currentProjectId };
  }
  const existing = await Project.findOne(query);
  return !!existing;
};

// @route   GET /api/projects/search/students
// @desc    Search registered students from same department to add to team (FR-PRJ-03, BR-02)
// @access  Protected (Student, Admin)
router.get('/search/students', auth, authorize('student', 'admin'), async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.json({ students: [] });
    }

    const trimmed = query.trim();
    const filter = {
      role: 'student',
      isActive: true,
      $or: [
        { email: { $regex: trimmed, $options: 'i' } },
        { enrollmentNo: { $regex: trimmed, $options: 'i' } },
        { name: { $regex: trimmed, $options: 'i' } }
      ]
    };

    // BR-02: Team members must belong to the leader's department
    if (req.user.role === 'student' && req.user.department) {
      filter.department = req.user.department;
    }

    const students = await User.find(filter)
      .populate('department', 'name code')
      .select('name email enrollmentNo department semester')
      .limit(10);

    // Check active project status for each student
    const results = await Promise.all(
      students.map(async (s) => {
        const inProject = await isStudentInActiveProject(s._id);
        return {
          ...s.toObject(),
          isAvailable: !inProject
        };
      })
    );

    res.json({ students: results });
  } catch (error) {
    res.status(500).json({ message: 'Error searching students.' });
  }
});

// @route   POST /api/projects
// @desc    Create a new project in Draft status (FR-PRJ-01, FR-PRJ-02, BR-02, BR-03)
// @access  Student
router.post('/', auth, authorize('student'), async (req, res) => {
  try {
    const { title, description, categoryId, techStack, githubUrl, deploymentUrl } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    // Check BR-03: Student cannot belong to more than one active project
    const inProject = await isStudentInActiveProject(req.user._id);
    if (inProject) {
      return res.status(400).json({
        message: 'You are already a member of an active project. Students cannot join multiple projects (BR-03).'
      });
    }

    let category = null;
    if (categoryId) {
      category = await Category.findById(categoryId);
    }

    // Determine student department
    let studentDept = req.user.department;
    if (!studentDept) {
      const defaultDept = await Department.findOne();
      studentDept = defaultDept ? defaultDept._id : null;
    }

    if (!studentDept) {
      return res.status(400).json({ message: 'A department must be assigned to the student before creating a project.' });
    }

    const project = new Project({
      title: title.trim(),
      description: description.trim(),
      category: category ? category._id : null,
      leader: req.user._id,
      members: [req.user._id],
      department: studentDept,
      techStack: Array.isArray(techStack) ? techStack : (techStack ? techStack.split(',').map(s => s.trim()).filter(Boolean) : []),
      githubUrl: githubUrl ? githubUrl.trim() : '',
      deploymentUrl: deploymentUrl ? deploymentUrl.trim() : '',
      status: 'Draft',
      history: [{
        status: 'Draft',
        changedBy: req.user._id,
        date: new Date(),
        note: 'Project initialized in Draft status by project leader.'
      }]
    });

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('category', 'name')
      .populate('department', 'name code')
      .populate('leader', 'name email enrollmentNo department')
      .populate('members', 'name email enrollmentNo department')
      .populate('supervisor', 'name email employeeId department designation');

    res.status(201).json({
      message: 'Project created successfully in Draft status.',
      project: populated
    });
  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({ message: error.message || 'Error creating project.' });
  }
});

// @route   GET /api/projects
// @desc    List projects filtered by user role and filters (FR-PRJ-06, FR-PRJ-07, FR-ADM-05, AC-02)
// @access  Authenticated (Student, Faculty, Admin)
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'student') {
      filter.$or = [{ leader: req.user._id }, { members: req.user._id }];
    } else if (req.user.role === 'faculty') {
      filter.supervisor = req.user._id;
    } else if (req.user.role === 'admin') {
      if (req.query.status) filter.status = req.query.status;
      if (req.query.category) filter.category = req.query.category;
      if (req.query.department) filter.department = req.query.department;
      if (req.query.unassigned === 'true') filter.supervisor = null;
    }

    let projects = await Project.find(filter)
      .populate('category', 'name')
      .populate('department', 'name code')
      .populate('leader', 'name email enrollmentNo department')
      .populate('members', 'name email enrollmentNo department')
      .populate('supervisor', 'name email employeeId department designation')
      .sort({ updatedAt: -1 });

    if (req.query.search && req.query.search.trim()) {
      const q = req.query.search.trim().toLowerCase();
      projects = projects.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.leader?.name?.toLowerCase().includes(q) ||
        p.leader?.enrollmentNo?.toLowerCase().includes(q) ||
        p.supervisor?.name?.toLowerCase().includes(q)
      );
    }

    res.json({ projects });
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ message: 'Error retrieving projects.' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get detailed project view (FR-PRJ-06, FR-PRJ-07, AC-02)
// @access  Authorized (Team members, Assigned Supervisor, Admin)
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('category', 'name')
      .populate('department', 'name code')
      .populate('leader', 'name email enrollmentNo department')
      .populate('members', 'name email enrollmentNo department')
      .populate('supervisor', 'name email employeeId department designation')
      .populate('history.changedBy', 'name role');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isMember = project.members.some(m => m._id.toString() === req.user._id.toString()) ||
      project.leader._id.toString() === req.user._id.toString();
    const isSupervisor = project.supervisor && project.supervisor._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isMember && !isSupervisor && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view this project.' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Error retrieving project.' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project details & team members (Leader only, Draft status only - FR-PRJ-05, BR-02, BR-09)
// @access  Student (Leader)
router.put('/:id', auth, authorize('student'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (project.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the project leader can update project details.' });
    }

    if (project.status !== 'Draft') {
      return res.status(400).json({
        message: `Project can only be edited when in Draft status. Current status is '${project.status}'.`
      });
    }

    const { title, description, categoryId, memberIds, techStack, githubUrl, deploymentUrl } = req.body;

    if (title) project.title = title.trim();
    if (description) project.description = description.trim();
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) return res.status(400).json({ message: 'Category not found.' });
      project.category = category._id;
    }
    if (techStack) {
      project.techStack = Array.isArray(techStack) ? techStack : techStack.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (githubUrl !== undefined) project.githubUrl = githubUrl.trim();
    if (deploymentUrl !== undefined) project.deploymentUrl = deploymentUrl.trim();

    // Team member updating (BR-02: 1 to 4 members, leader always included, all same department)
    if (memberIds && Array.isArray(memberIds)) {
      const uniqueIds = Array.from(new Set([project.leader.toString(), ...memberIds]));

      if (uniqueIds.length > 4) {
        return res.status(400).json({ message: 'A team can have a maximum of 4 members (BR-02).' });
      }

      for (const mId of uniqueIds) {
        const student = await User.findOne({ _id: mId, role: 'student', isActive: true });
        if (!student) {
          return res.status(400).json({ message: `Student ID ${mId} is invalid or inactive.` });
        }

        // BR-02: All members belong to the leader's department
        if (project.department && student.department && student.department.toString() !== project.department.toString()) {
          return res.status(400).json({
            message: `All team members must belong to the project department (BR-02). Student ${student.name} belongs to another department.`
          });
        }

        const alreadyInOther = await isStudentInActiveProject(mId, project._id);
        if (alreadyInOther) {
          return res.status(400).json({
            message: `Student ${student.name} (${student.email}) is already enrolled in another active project (BR-03).`
          });
        }
      }

      project.members = uniqueIds;
    }

    await project.save();

    const updated = await Project.findById(project._id)
      .populate('category', 'name')
      .populate('department', 'name code')
      .populate('leader', 'name email enrollmentNo')
      .populate('members', 'name email enrollmentNo')
      .populate('supervisor', 'name email employeeId department');

    res.json({
      message: 'Project updated successfully.',
      project: updated
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: error.message || 'Error updating project.' });
  }
});

// @route   PUT /api/projects/:id/status
// @desc    Change project status strictly following Section 4.2 transition rules
// @access  Authorized by transition
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { action, reason, note } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isLeader = project.leader.toString() === req.user._id.toString();
    const isMember = project.members.some(m => m.toString() === req.user._id.toString());
    const isSupervisor = project.supervisor && project.supervisor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    const currentStatus = project.status;
    let nextStatus = null;
    let transitionNote = note || '';

    // Transition Logic per Section 4.2
    switch (action) {
      case 'SUBMIT_PROPOSAL':
        // Draft -> Proposal Submitted (by student team; sent to HOD for guide allocation)
        if (currentStatus !== 'Draft') {
          return res.status(400).json({ message: `Cannot submit proposal from status '${currentStatus}'. Must be in 'Draft'.` });
        }
        if (!isMember) {
          return res.status(403).json({ message: 'Only project team members can submit the proposal.' });
        }
        const hasProposal = await Submission.findOne({ project: project._id, type: 'proposal' });
        if (!hasProposal) {
          return res.status(400).json({ message: 'Please upload a proposal file before submitting.' });
        }
        nextStatus = 'Proposal Submitted';
        transitionNote = 'Proposal submitted by student team for HOD guide allocation and approval.';

        // Notify HOD of the department
        try {
          const dept = await Department.findById(project.department);
          let hodUser = null;
          if (dept && dept.hod) {
            hodUser = await User.findById(dept.hod);
          }
          if (!hodUser) {
            hodUser = await User.findOne({ department: project.department, isHod: true, isActive: true });
          }
          if (hodUser) {
            await notifyUser({
              recipient: hodUser._id,
              type: 'proposal_submitted',
              message: `New student project proposal applied: '${project.title}' by ${req.user.name}. Please assign a faculty guide.`,
              link: `/projects/${project._id}`
            });
          }
        } catch (e) {
          console.error('Error notifying HOD:', e);
        }

        // If a supervisor was already pre-assigned, notify them as well
        if (project.supervisor) {
          await notifyUser({
            recipient: project.supervisor,
            type: 'proposal_submitted',
            message: `Project proposal submitted for '${project.title}' by ${req.user.name}.`,
            link: `/projects/${project._id}`
          });
        }
        break;

      case 'APPROVE_PROPOSAL':
        // Proposal Submitted -> In Progress (automatic move per Section 4.1 & 4.2)
        if (currentStatus !== 'Proposal Submitted') {
          return res.status(400).json({ message: `Cannot approve proposal from status '${currentStatus}'.` });
        }
        if (!isSupervisor && !isAdmin) {
          return res.status(403).json({ message: 'Only the assigned supervisor can approve the proposal (BR-05).' });
        }
        nextStatus = 'In Progress';
        transitionNote = note || 'Proposal approved by supervisor. Project moved to In Progress.';
        project.rejectionReason = '';

        // FR-NTF-07: Supervisor approves proposal -> All team members notified
        await notifyMany(project.members, {
          type: 'proposal_approved',
          message: `Congratulations! Your project proposal for '${project.title}' has been approved by supervisor.`,
          link: `/projects/${project._id}`
        });
        break;

      case 'REJECT_PROPOSAL':
        // Proposal Submitted -> Rejected (requires reason per FR-REV-02)
        if (currentStatus !== 'Proposal Submitted') {
          return res.status(400).json({ message: `Cannot reject proposal from status '${currentStatus}'.` });
        }
        if (!isSupervisor && !isAdmin) {
          return res.status(403).json({ message: 'Only the assigned supervisor can reject the proposal (BR-05).' });
        }
        if (!reason || !reason.trim()) {
          return res.status(400).json({ message: 'A rejection reason is mandatory (FR-REV-02).' });
        }
        nextStatus = 'Rejected';
        project.rejectionReason = reason.trim();
        transitionNote = `Proposal rejected. Reason: ${reason.trim()}`;

        // FR-NTF-07: Supervisor rejects proposal -> All team members notified
        await notifyMany(project.members, {
          type: 'proposal_rejected',
          message: `Project proposal for '${project.title}' was rejected. Reason: ${reason.trim()}`,
          link: `/projects/${project._id}`
        });
        break;

      case 'RETURN_TO_DRAFT':
        // Rejected -> Draft (by student leader per FR-REV-05, BR-06)
        if (currentStatus !== 'Rejected') {
          return res.status(400).json({ message: `Cannot return to Draft from status '${currentStatus}'.` });
        }
        if (!isLeader) {
          return res.status(403).json({ message: 'Only the project leader can return the project to Draft status.' });
        }
        nextStatus = 'Draft';
        transitionNote = 'Project returned to Draft by leader for revisions.';
        break;

      default:
        return res.status(400).json({
          message: `Invalid action '${action}'. Allowed actions: SUBMIT_PROPOSAL, APPROVE_PROPOSAL, REJECT_PROPOSAL, RETURN_TO_DRAFT.`
        });
    }

    project.status = nextStatus;
    project.history.push({
      status: nextStatus,
      changedBy: req.user._id,
      date: new Date(),
      note: transitionNote
    });

    await project.save();

    const updated = await Project.findById(project._id)
      .populate('category', 'name')
      .populate('department', 'name code')
      .populate('leader', 'name email enrollmentNo')
      .populate('members', 'name email enrollmentNo')
      .populate('supervisor', 'name email employeeId department');

    res.json({
      message: `Project status successfully updated to '${nextStatus}'.`,
      project: updated
    });
  } catch (error) {
    console.error('Error changing status:', error);
    res.status(500).json({ message: error.message || 'Error updating status.' });
  }
});

// @route   GET /api/projects/hod/department-projects
// @desc    Get all student project applications in HOD's department + department faculty list
// @access  HOD Faculty or Admin
router.get('/hod/department-projects', auth, async (req, res) => {
  try {
    const isHod = req.user.role === 'admin' || req.user.isHod || req.user.designation?.toLowerCase().includes('hod');
    if (!isHod) {
      return res.status(403).json({ message: 'Access denied: Only Department Heads (HOD) or Admins can access guide allocation.' });
    }

    let deptId = req.query.department || req.user.department;
    if (!deptId && req.user.role === 'admin') {
      const firstDept = await Department.findOne();
      deptId = firstDept?._id;
    }

    if (!deptId) {
      return res.status(400).json({ message: 'No department assigned or found.' });
    }

    const department = await Department.findById(deptId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const projects = await Project.find({ department: deptId })
      .populate('category', 'name')
      .populate('department', 'name code')
      .populate('leader', 'name email enrollmentNo')
      .populate('members', 'name email enrollmentNo')
      .populate('supervisor', 'name email employeeId designation')
      .sort({ updatedAt: -1 });

    const faculty = await User.find({
      department: deptId,
      role: 'faculty',
      isActive: true
    })
      .select('name email employeeId designation isHod')
      .sort({ name: 1 });

    // All departments for Admin filtering
    let allDepartments = [];
    if (req.user.role === 'admin') {
      allDepartments = await Department.find().sort({ code: 1 });
    }

    res.json({
      department,
      allDepartments,
      projects,
      faculty,
      isCurrentUserHod: true
    });
  } catch (error) {
    console.error('Error fetching HOD projects:', error);
    res.status(500).json({ message: 'Error retrieving department projects.' });
  }
});

// @route   PUT /api/projects/:id/assign-guide
// @desc    HOD (or Admin) assigns a guide (faculty or HOD themselves) to a student project
// @access  HOD Faculty or Admin
router.put('/:id/assign-guide', auth, async (req, res) => {
  try {
    const isHod = req.user.role === 'admin' || req.user.isHod || req.user.designation?.toLowerCase().includes('hod');
    if (!isHod) {
      return res.status(403).json({ message: 'Access denied: Only Department Heads (HOD) or Admins can assign project guides.' });
    }

    const { facultyId } = req.body;
    if (!facultyId) {
      return res.status(400).json({ message: 'facultyId is required' });
    }

    const project = await Project.findById(req.params.id).populate('department');
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Verify HOD department match (unless superadmin)
    if (req.user.role !== 'admin') {
      const userDeptId = req.user.department?._id || req.user.department;
      if (userDeptId && project.department && userDeptId.toString() !== project.department._id.toString()) {
        return res.status(403).json({ message: 'You can only allocate guides for projects in your own department.' });
      }
    }

    if (project.status === 'Evaluated') {
      return res.status(400).json({ message: 'Cannot change guide of an already evaluated project.' });
    }

    const faculty = await User.findOne({ _id: facultyId, role: 'faculty', isActive: true });
    if (!faculty) {
      return res.status(400).json({ message: 'Valid active faculty member not found.' });
    }

    project.supervisor = faculty._id;
    project.history.push({
      status: project.status,
      changedBy: req.user._id,
      date: new Date(),
      note: `Guide allocated: ${faculty.name} (${faculty.designation || 'Faculty'}) by HOD ${req.user.name}`
    });

    await project.save();

    // Notify assigned faculty guide
    await notifyUser({
      recipient: faculty._id,
      type: 'supervisor_assigned',
      message: `HOD ${req.user.name} has allocated you as project guide for '${project.title}'. Please review and approve the project.`,
      link: `/projects/${project._id}`
    });

    // Notify student team
    const teamRecipients = [...new Set([project.leader.toString(), ...(project.members || []).map(m => m.toString())])];
    await notifyMany(teamRecipients, {
      type: 'supervisor_assigned',
      message: `HOD ${req.user.name} has allocated ${faculty.name} as your project guide.`,
      link: `/projects/${project._id}`
    });

    const populatedProject = await Project.findById(project._id)
      .populate('category', 'name')
      .populate('department', 'name code')
      .populate('leader', 'name email enrollmentNo')
      .populate('members', 'name email enrollmentNo')
      .populate('supervisor', 'name email employeeId designation');

    res.json({
      message: `Faculty member ${faculty.name} successfully assigned as guide by HOD.`,
      project: populatedProject
    });
  } catch (error) {
    console.error('Error assigning guide by HOD:', error);
    res.status(500).json({ message: error.message || 'Server error allocating guide.' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project (Admin or project leader if Draft)
// @access  Admin, Student
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isAdmin = req.user.role === 'admin';
    const isLeader = project.leader.toString() === req.user._id.toString();

    if (!isAdmin && (!isLeader || project.status !== 'Draft')) {
      return res.status(403).json({ message: 'Only administrators or the student leader (in Draft) can delete a project.' });
    }

    // Clean up associated submissions
    await Submission.deleteMany({ project: project._id });
    await Project.findByIdAndDelete(project._id);

    res.json({ message: `Project '${project.title}' deleted successfully.` });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: error.message || 'Error deleting project.' });
  }
});

module.exports = router;
