const express = require('express');
const router = express.Router();
const Evaluation = require('../models/Evaluation');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { notifyMany } = require('../services/notify');

// @route   POST /api/projects/:id/evaluation
// @desc    Create or update evaluation marks (FR-EVL-01 to FR-EVL-06)
// @access  Faculty / Admin
router.post('/projects/:id/evaluation', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isSupervisor = project.supervisor && project.supervisor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isSupervisor && !isAdmin) {
      return res.status(403).json({ message: 'Only the assigned project supervisor can evaluate this project (BR-05).' });
    }

    // Must be in Final Submitted status or already Evaluated (for editing existing evaluation)
    if (project.status !== 'Final Submitted' && project.status !== 'Evaluated') {
      return res.status(400).json({
        message: `Projects can only be evaluated when in 'Final Submitted' status. Current status is '${project.status}'.`
      });
    }

    const { marks, remarks } = req.body;
    if (!marks) {
      return res.status(400).json({ message: 'Marks breakdown is required.' });
    }

    const report = Number(marks.report);
    const implementation = Number(marks.implementation);
    const presentation = Number(marks.presentation);
    const viva = Number(marks.viva);

    // Validate marks against fixed rubric (FR-EVL-02, FR-EVL-03, AC-05)
    if (isNaN(report) || report < 0 || report > 30) {
      return res.status(400).json({ message: 'Report marks must be between 0 and 30.' });
    }
    if (isNaN(implementation) || implementation < 0 || implementation > 40) {
      return res.status(400).json({ message: 'Implementation marks must be between 0 and 40.' });
    }
    if (isNaN(presentation) || presentation < 0 || presentation > 20) {
      return res.status(400).json({ message: 'Presentation marks must be between 0 and 20.' });
    }
    if (isNaN(viva) || viva < 0 || viva > 10) {
      return res.status(400).json({ message: 'Viva marks must be between 0 and 10.' });
    }

    const total = report + implementation + presentation + viva;

    // Check if evaluation already exists (FR-EVL-06)
    let evaluation = await Evaluation.findOne({ project: project._id });
    const isUpdate = !!evaluation;

    if (evaluation) {
      evaluation.marks = { report, implementation, presentation, viva };
      evaluation.total = total;
      evaluation.remarks = remarks ? remarks.trim() : '';
      evaluation.evaluatedBy = req.user._id;
      evaluation.updatedAt = new Date();
      await evaluation.save();
    } else {
      evaluation = new Evaluation({
        project: project._id,
        marks: { report, implementation, presentation, viva },
        total,
        remarks: remarks ? remarks.trim() : '',
        evaluatedBy: req.user._id
      });
      await evaluation.save();
    }

    // Move project status to Evaluated (FR-EVL-05)
    if (project.status !== 'Evaluated') {
      project.status = 'Evaluated';
      project.history.push({
        status: 'Evaluated',
        changedBy: req.user._id,
        date: new Date(),
        note: `Project evaluated by supervisor. Total Score: ${total}/100.`
      });
      await project.save();
    }

    // FR-NTF-07: Supervisor saves project evaluation -> All team members notified
    await notifyMany(project.members, {
      type: 'evaluation_completed',
      message: `Final evaluation completed for '${project.title}'. Total score: ${total}/100 marks.`,
      link: `/projects/${project._id}`
    });

    const populated = await Evaluation.findById(evaluation._id)
      .populate('evaluatedBy', 'name email employeeId department');

    res.json({
      message: isUpdate ? 'Evaluation marks updated successfully.' : 'Project evaluated successfully.',
      evaluation: populated,
      projectStatus: project.status
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ message: error.message || 'Error saving evaluation.' });
  }
});

// @route   GET /api/projects/:id/evaluation
// @desc    View project evaluation (BR-08, FR-EVL-07)
// @access  Authorized (Team members only if Evaluated, Supervisor & Admin anytime)
router.get('/projects/:id/evaluation', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isMember = project.members.some(m => m.toString() === req.user._id.toString()) ||
                     project.leader.toString() === req.user._id.toString();
    const isSupervisor = project.supervisor && project.supervisor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isMember && !isSupervisor && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: You cannot view evaluations for this project.' });
    }

    // BR-08 & FR-EVL-07: Marks are visible to students ONLY after the project is Evaluated
    if (isMember && !isSupervisor && !isAdmin && project.status !== 'Evaluated') {
      return res.status(403).json({
        message: 'Evaluation marks are hidden until the final evaluation is completed and approved.'
      });
    }

    const evaluation = await Evaluation.findOne({ project: project._id })
      .populate('evaluatedBy', 'name email employeeId department');

    if (!evaluation) {
      return res.status(404).json({ message: 'No evaluation has been recorded yet.' });
    }

    res.json({ evaluation });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({ message: 'Error retrieving evaluation.' });
  }
});

module.exports = router;
