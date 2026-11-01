const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const handleUpload = require('../middleware/upload');
const { uploadFile, downloadFileStream } = require('../services/driveService');
const { notifyUser, notifyMany } = require('../services/notify');

// Helper to check user access to a project
const checkProjectAccess = (project, user) => {
  const isMember = project.members.some(m => m.toString() === user._id.toString()) ||
                   project.leader.toString() === user._id.toString();
  const isSupervisor = project.supervisor && project.supervisor.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';
  return { isMember, isSupervisor, isAdmin, hasAccess: isMember || isSupervisor || isAdmin };
};

// @route   POST /api/projects/:id/submissions
// @desc    Upload proposal, progress, or final submission (FR-SUB-01, FR-SUB-02, FR-SUB-03)
// @access  Student (Team Member)
router.post('/projects/:id/submissions', auth, handleUpload('file'), async (req, res) => {
  try {
    const { type, notes, submitForReview } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const { isMember } = checkProjectAccess(project, req.user);
    if (!isMember) {
      return res.status(403).json({ message: 'Only team members of this project can upload submissions.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please attach a document file (PDF, DOCX, or ZIP).' });
    }

    if (!['proposal', 'progress', 'final'].includes(type)) {
      return res.status(400).json({ message: "Submission type must be 'proposal', 'progress', or 'final'." });
    }

    // FR-SUB-03: Validate status constraints
    if (type === 'proposal') {
      if (project.status !== 'Draft') {
        return res.status(400).json({
          message: `Proposal can only be uploaded when project is in 'Draft' status. Current status is '${project.status}'.`
        });
      }
    } else if (type === 'progress') {
      if (project.status !== 'In Progress') {
        return res.status(400).json({
          message: `Progress updates can only be uploaded when project is 'In Progress'. Current status is '${project.status}'.`
        });
      }
    } else if (type === 'final') {
      if (project.status !== 'In Progress') {
        return res.status(400).json({
          message: `Final submission can only be uploaded when project is 'In Progress'. Current status is '${project.status}'.`
        });
      }
    }

    // Upload to Drive or fallback buffer
    const uploaded = await uploadFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype || 'application/octet-stream'
    });

    const submission = new Submission({
      project: project._id,
      type,
      notes: notes ? notes.trim() : '',
      file: {
        name: uploaded.name,
        contentType: uploaded.contentType,
        size: uploaded.size,
        driveFileId: uploaded.driveFileId,
        data: uploaded.data
      },
      submittedBy: req.user._id
    });

    await submission.save();

    let statusMessage = 'Document uploaded successfully.';

    if (type === 'final') {
      // In Progress -> Final Submitted
      project.status = 'Final Submitted';
      project.history.push({
        status: 'Final Submitted',
        changedBy: req.user._id,
        date: new Date(),
        note: 'Final project deliverable submitted by student.'
      });
      await project.save();
      statusMessage = 'Final submission uploaded! Project is now ready for supervisor evaluation.';

      // FR-NTF-06: Student submits final document -> Supervisor is notified
      if (project.supervisor) {
        await notifyUser({
          recipient: project.supervisor,
          type: 'final_submitted',
          message: `Final project documentation submitted for '${project.title}'. Awaiting your evaluation.`,
          link: `/projects/${project._id}/evaluate`
        });
      }
    } else if (type === 'proposal' && (submitForReview === 'true' || submitForReview === true)) {
      if (!project.supervisor) {
        return res.status(400).json({
          message: 'File saved, but cannot submit proposal for review until a supervisor is assigned by Admin (BR-04).'
        });
      }
      project.status = 'Proposal Submitted';
      project.history.push({
        status: 'Proposal Submitted',
        changedBy: req.user._id,
        date: new Date(),
        note: 'Proposal document submitted for review.'
      });
      await project.save();
      statusMessage = 'Proposal submitted for supervisor review.';

      // FR-NTF-06: Student submits proposal -> Supervisor is notified
      await notifyUser({
        recipient: project.supervisor,
        type: 'proposal_submitted',
        message: `Project proposal submitted for '${project.title}'. Awaiting your review.`,
        link: `/projects/${project._id}`
      });
    }

    res.status(201).json({
      message: statusMessage,
      submission: {
        _id: submission._id,
        type: submission.type,
        notes: submission.notes,
        createdAt: submission.createdAt,
        file: {
          name: submission.file.name,
          contentType: submission.file.contentType,
          size: submission.file.size
        }
      },
      projectStatus: project.status
    });
  } catch (error) {
    console.error('Submission upload error:', error);
    res.status(500).json({ message: error.message || 'Error processing document upload.' });
  }
});

// @route   GET /api/projects/:id/submissions
// @desc    List project submissions without heavy binary data (FR-SUB-05, FR-SUB-06)
// @access  Authorized (Team members, Assigned Supervisor, Admin)
router.get('/projects/:id/submissions', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const { hasAccess } = checkProjectAccess(project, req.user);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view submissions for this project.' });
    }

    const submissions = await Submission.find({ project: project._id })
      .select('-file.data')
      .populate('submittedBy', 'name email enrollmentNo')
      .populate('feedback.by', 'name email employeeId designation')
      .sort({ createdAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ message: 'Error retrieving submissions.' });
  }
});

// @route   GET /api/submissions/:id/file
// @desc    Download project submission document (FR-SUB-05, FR-SUB-06, NFR-FIL-02)
// @access  Authorized (Team members, Assigned Supervisor, Admin)
router.get('/submissions/:id/file', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('project')
      .select('+file.data');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const { hasAccess } = checkProjectAccess(submission.project, req.user);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to download this file.' });
    }

    if (!submission.file || !submission.file.name) {
      return res.status(404).json({ message: 'No file attached to this submission.' });
    }

    res.setHeader('Content-Type', submission.file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(submission.file.name)}"`);

    // Stream from Google Drive if driveFileId present
    if (submission.file.driveFileId) {
      const driveStream = await downloadFileStream(submission.file.driveFileId);
      if (driveStream) return driveStream.pipe(res);
    }

    // Fallback: send database buffer
    if (submission.file.data) {
      return res.send(submission.file.data);
    }

    res.status(404).json({ message: 'Document binary content not found.' });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading file.' });
  }
});

// @route   POST /api/submissions/:id/feedback
// @desc    Add written supervisor feedback to a submission (FR-REV-03, FR-REV-04, BR-05)
// @access  Faculty (Assigned Supervisor) or Admin
router.post('/submissions/:id/feedback', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Feedback text is required.' });
    }

    const submission = await Submission.findById(req.params.id).populate('project');
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const project = submission.project;
    const isSupervisor = project.supervisor && project.supervisor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isSupervisor && !isAdmin) {
      return res.status(403).json({ message: 'Only the assigned supervisor can provide feedback on this submission (BR-05).' });
    }

    const feedbackItem = {
      by: req.user._id,
      text: text.trim(),
      date: new Date()
    };

    submission.feedback.push(feedbackItem);
    await submission.save();

    // Notify project team
    await notifyMany(project.members, {
      type: 'feedback_added',
      message: `New supervisor feedback posted on your ${submission.type} submission for '${project.title}'.`,
      link: `/projects/${project._id}`
    });

    const populated = await Submission.findById(submission._id)
      .select('-file.data')
      .populate('feedback.by', 'name email employeeId designation');

    res.status(201).json({
      message: 'Feedback added successfully.',
      submission: populated
    });
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({ message: error.message || 'Error saving feedback.' });
  }
});

module.exports = router;
