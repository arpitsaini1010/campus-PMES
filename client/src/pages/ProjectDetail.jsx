import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectAPI, submissionAPI, evaluationAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const ProjectDetail = () => {
  const { id } = useParams();
  const { user, role } = useAuth();

  const [project, setProject] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('proposal');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [submitForReview, setSubmitForReview] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Proposal decision modal state (for Faculty)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');

  // Feedback input state
  const [feedbackTexts, setFeedbackTexts] = useState({});
  const [submittingFeedback, setSubmittingFeedback] = useState({});

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projRes, subsRes] = await Promise.all([
        projectAPI.getById(id),
        submissionAPI.getByProject(id)
      ]);

      setProject(projRes.data.project);
      setSubmissions(subsRes.data.submissions || []);

      // If evaluated, or if faculty/admin, attempt to fetch evaluation
      if (projRes.data.project.status === 'Evaluated' || role === 'faculty' || role === 'admin') {
        try {
          const evalRes = await evaluationAPI.get(id);
          setEvaluation(evalRes.data.evaluation);
        } catch {
          setEvaluation(null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const isMember = project?.members?.some(m => m._id === user?._id) || project?.leader?._id === user?._id;
  const isLeader = project?.leader?._id === user?._id;
  const isSupervisor = project?.supervisor?._id === user?._id;
  const isAdmin = role === 'admin';
  const isHod = isAdmin || user?.isHod || user?.designation?.toLowerCase().includes('hod');

  // Handle Document Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      return setError('Please select a file to upload (PDF, DOCX, ZIP $\\le$ 5MB).');
    }

    if (uploadFile.size > 5 * 1024 * 1024) {
      return setError('File size exceeds the 5 MB limit.');
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('type', uploadType);
      formData.append('notes', uploadNotes);
      if (uploadType === 'proposal') {
        formData.append('submitForReview', submitForReview);
      }

      const res = await submissionAPI.upload(project._id, formData);
      setSuccess(res.data.message || 'File uploaded successfully!');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadNotes('');
      fetchProjectData();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Proposal Approval
  const handleApproveProposal = async () => {
    if (!window.confirm('Approve this proposal? The project will automatically move to In Progress.')) return;
    setError('');
    setSuccess('');

    try {
      const res = await projectAPI.changeStatus(project._id, {
        action: 'APPROVE_PROPOSAL',
        note: approvalNote || 'Proposal approved by supervisor.'
      });
      setSuccess(res.data.message);
      fetchProjectData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error approving proposal.');
    }
  };

  // Handle Proposal Rejection
  const handleRejectProposal = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      return setError('A written rejection reason is mandatory.');
    }

    setError('');
    setSuccess('');

    try {
      const res = await projectAPI.changeStatus(project._id, {
        action: 'REJECT_PROPOSAL',
        reason: rejectionReason.trim()
      });
      setSuccess(res.data.message);
      setShowRejectModal(false);
      setRejectionReason('');
      fetchProjectData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error rejecting proposal.');
    }
  };

  // Handle Feedback Submission
  const handleAddFeedback = async (subId) => {
    const text = feedbackTexts[subId];
    if (!text || !text.trim()) return;

    setSubmittingFeedback({ ...submittingFeedback, [subId]: true });
    setError('');

    try {
      await submissionAPI.addFeedback(subId, text.trim());
      setFeedbackTexts({ ...feedbackTexts, [subId]: '' });
      fetchProjectData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding feedback.');
    } finally {
      setSubmittingFeedback({ ...submittingFeedback, [subId]: false });
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading project...</span>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header */}
      {/* Main Project Card */}
      <div className="pmes-card mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="program-badge">
                {project.program || 'BCA'}
              </span>
              <span className="semester-badge">
                Sem {project.semester || 5}
              </span>
              <StatusBadge status={project.status} />
            </div>
            <h2 className="fw-bold text-dark mb-2">{project.title}</h2>
            <p className="text-secondary mb-0" style={{ maxWidth: '800px', lineHeight: '1.6' }}>
              {project.description}
            </p>
          </div>

          {/* Action Buttons for Roles */}
          <div className="d-flex flex-wrap gap-2">
            {/* Student Upload Buttons */}
            {isMember && (
              <>
                {project.status === 'Draft' && (
                  <button
                    className="btn btn-pmes-primary"
                    onClick={() => {
                      setUploadType('proposal');
                      setShowUploadModal(true);
                    }}
                    id="btn-upload-proposal"
                  >
                    <i className="bi bi-file-earmark-arrow-up me-1"></i> Upload Proposal
                  </button>
                )}
                {project.status === 'In Progress' && (
                  <>
                    <button
                      className="btn btn-pmes-secondary"
                      onClick={() => {
                        setUploadType('progress');
                        setShowUploadModal(true);
                      }}
                      id="btn-upload-progress"
                    >
                      <i className="bi bi-arrow-up-circle me-1"></i> Progress Update
                    </button>
                    <button
                      className="btn btn-pmes-primary"
                      onClick={() => {
                        setUploadType('final');
                        setShowUploadModal(true);
                      }}
                      id="btn-upload-final"
                    >
                      <i className="bi bi-check2-circle me-1"></i> Final Submission
                    </button>
                  </>
                )}
              </>
            )}

            {/* HOD Guide Allocation Button if unassigned */}
            {isHod && !project.supervisor && (
              <Link
                to="/hod/guide-allocation"
                className="btn btn-pmes-primary"
                id="btn-hod-allocate-guide"
              >
                <i className="bi bi-person-badge-fill me-1"></i> Allocate Guide (HOD)
              </Link>
            )}

            {/* Faculty Review / Evaluate Buttons */}
            {(isSupervisor || isAdmin) && (
              <>
                {project.status === 'Proposal Submitted' && (
                  <>
                    <button
                      className="btn btn-pmes-success"
                      onClick={handleApproveProposal}
                      id="btn-approve-proposal"
                    >
                      <i className="bi bi-check-lg me-1"></i> Approve Proposal
                    </button>
                    <button
                      className="btn btn-pmes-danger"
                      onClick={() => setShowRejectModal(true)}
                      id="btn-reject-proposal"
                    >
                      <i className="bi bi-x-lg me-1"></i> Reject with Reason
                    </button>
                  </>
                )}

                {(project.status === 'Final Submitted' || project.status === 'Evaluated') && (
                  <Link
                    to={`/projects/${project._id}/evaluate`}
                    className="btn btn-pmes-primary"
                    id="btn-go-to-evaluation"
                  >
                    <i className="bi bi-calculator me-1"></i>
                    {project.status === 'Evaluated' ? 'Update Evaluation Marks' : 'Evaluate Project (Rubric)'}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 mb-3" id="project-detail-error">
            <i className="bi bi-exclamation-circle-fill me-1"></i> {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success py-2 mb-3" id="project-detail-success">
            <i className="bi bi-check-circle-fill me-1"></i> {success}
          </div>
        )}

        {/* Rejection Alert */}
        {project.status === 'Rejected' && project.rejectionReason && (
          <div className="alert alert-danger mb-3" id="detail-rejection-banner">
            <div className="fw-bold mb-1">
              <i className="bi bi-exclamation-triangle-fill me-1"></i> Proposal Rejected
            </div>
            <div>Reason: {project.rejectionReason}</div>
          </div>
        )}

        {/* Project Metadata Footer */}
        <div className="row g-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
          <div className="col-12 col-md-4">
            <div className="text-muted text-uppercase" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              Supervisor / Project Guide
            </div>
            <div className="text-dark fw-semibold">
              {project.supervisor ? (
                <>
                  <i className="bi bi-person-badge text-success me-1"></i>
                  {project.supervisor.name}
                  {project.supervisor.designation && (
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                      {project.supervisor.designation}
                    </div>
                  )}
                </>
              ) : (
                <span className="badge bg-warning text-dark">
                  <i className="bi bi-clock me-1"></i> Awaiting HOD Guide Allocation
                </span>
              )}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="text-muted text-uppercase" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              Project Leader
            </div>
            <div className="text-dark fw-semibold">
              <i className="bi bi-person-fill text-primary me-1"></i>
              {project.leader?.name} ({project.leader?.enrollmentNo || project.leader?.email})
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="text-muted text-uppercase" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              Team Size
            </div>
            <div className="text-dark fw-semibold">
              {project.members?.length} Members
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Rubric Card if Evaluated */}
      {evaluation && (
        <div className="pmes-card mb-4" style={{ border: '1px solid #10b981' }} id="project-evaluation-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold text-dark mb-0">
              <i className="bi bi-award-fill text-success me-2"></i> Criteria-Based Evaluation
            </h4>
            <span className="badge bg-success fs-6 px-3 py-2">
              Total Score: {evaluation.total} / 100
            </span>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3">
              <div className="rubric-score-box">
                <div className="score-val">{evaluation.marks?.report}</div>
                <div className="score-max">Report (/30)</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="rubric-score-box">
                <div className="score-val">{evaluation.marks?.implementation}</div>
                <div className="score-max">Implementation (/40)</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="rubric-score-box">
                <div className="score-val">{evaluation.marks?.presentation}</div>
                <div className="score-max">Presentation (/20)</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="rubric-score-box">
                <div className="score-val">{evaluation.marks?.viva}</div>
                <div className="score-max">Viva Voce (/10)</div>
              </div>
            </div>
          </div>

          {evaluation.remarks && (
            <div className="p-3 rounded-3 bg-light border">
              <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>Evaluator Remarks:</div>
              <div className="text-dark">{evaluation.remarks}</div>
            </div>
          )}
        </div>
      )}

      {/* Submissions Section */}
      <div className="pmes-card mb-4">
        <h4 className="fw-bold text-dark mb-3">
          <i className="bi bi-folder2 me-2 text-primary"></i> Submissions & Deliverables
        </h4>

        {submissions.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-cloud-upload fs-2 d-block mb-2"></i>
            No documents submitted yet.
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {submissions.map((sub) => (
              <div
                key={sub._id}
                className="p-3 rounded-3 bg-light border"
              >
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${
                      sub.type === 'proposal' ? 'bg-warning text-dark' :
                      sub.type === 'progress' ? 'bg-primary' : 'bg-purple text-white'
                    }`} style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      {sub.type}
                    </span>
                    <span className="fw-bold text-dark">{sub.file?.name}</span>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      ({(sub.file?.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {new Date(sub.createdAt).toLocaleString()} by {sub.submittedBy?.name}
                    </span>
                    <a
                      href={submissionAPI.downloadUrl(sub._id)}
                      download
                      className="btn btn-sm btn-pmes-secondary"
                      title="Download File"
                      id={`btn-download-${sub._id}`}
                    >
                      <i className="bi bi-download me-1"></i> Download
                    </a>
                  </div>
                </div>

                {sub.notes && (
                  <p className="text-secondary mb-3" style={{ fontSize: '0.88rem' }}>
                    <strong>Notes:</strong> {sub.notes}
                  </p>
                )}

                {/* Feedback Thread */}
                {sub.feedback?.length > 0 && (
                  <div className="mt-3 pt-3 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
                    <div className="form-label mb-2">Supervisor Feedback</div>
                    <div className="d-flex flex-column gap-2 mb-2">
                      {sub.feedback.map((fb, idx) => (
                        <div key={idx} className="p-2 rounded bg-white border" style={{ fontSize: '0.85rem' }}>
                          <div className="d-flex justify-content-between text-muted mb-1" style={{ fontSize: '0.75rem' }}>
                            <span><strong>{fb.by?.name}</strong> ({fb.by?.role})</span>
                            <span>{new Date(fb.date).toLocaleDateString()}</span>
                          </div>
                          <div className="text-dark">{fb.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Faculty add feedback input */}
                {(isSupervisor || isAdmin) && (
                  <div className="mt-3 d-flex gap-2">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Write feedback for this submission..."
                      value={feedbackTexts[sub._id] || ''}
                      onChange={(e) => setFeedbackTexts({ ...feedbackTexts, [sub._id]: e.target.value })}
                    />
                    <button
                      className="btn btn-sm btn-pmes-primary text-nowrap"
                      onClick={() => handleAddFeedback(sub._id)}
                      disabled={submittingFeedback[sub._id]}
                    >
                      <i className="bi bi-chat-left-text me-1"></i> Send Feedback
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Timeline */}
      <div className="pmes-card">
        <h4 className="fw-bold text-dark mb-3">
          <i className="bi bi-clock-history me-2 text-primary"></i> Project Lifecycle History
        </h4>
        <div className="d-flex flex-column gap-2">
          {project.history?.map((h, i) => (
            <div key={i} className="d-flex align-items-center gap-3 p-2 rounded bg-light border">
              <div className="text-muted" style={{ fontSize: '0.8rem', minWidth: '150px' }}>
                {new Date(h.date).toLocaleString()}
              </div>
              <div>
                <StatusBadge status={h.status} />
              </div>
              <div className="text-dark" style={{ fontSize: '0.85rem' }}>
                {h.note || `Status changed to ${h.status}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Deliverable Modal */}
      {showUploadModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content pmes-card border-0">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  Upload {uploadType === 'proposal' ? 'Proposal' : uploadType === 'progress' ? 'Progress Report' : 'Final Project Document'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUploadModal(false)}
                ></button>
              </div>
              <form onSubmit={handleUploadSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Select Document (PDF, DOCX, ZIP max 5MB)</label>
                    <input
                      type="file"
                      className="form-control"
                      accept=".pdf,.docx,.zip"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      required
                      id="input-deliverable-file"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Submission Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Add brief notes or changelog for this upload..."
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                    ></textarea>
                  </div>

                  {uploadType === 'proposal' && (
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="checkSubmitForReview"
                        checked={submitForReview}
                        onChange={(e) => setSubmitForReview(e.target.checked)}
                      />
                      <label className="form-check-label text-dark" htmlFor="checkSubmitForReview" style={{ fontSize: '0.85rem' }}>
                        Submit immediately for Supervisor Review (sets status to 'Proposal Submitted')
                      </label>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-pmes-secondary"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-pmes-primary"
                    disabled={uploading}
                    id="btn-confirm-upload"
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span> Uploading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-arrow-up-fill me-1"></i> Upload
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reject Proposal Modal */}
      {showRejectModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content pmes-card border-0">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i> Reject Proposal
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRejectModal(false)}
                ></button>
              </div>
              <form onSubmit={handleRejectProposal}>
                <div className="modal-body">
                  <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                    Rejecting the proposal requires a clear, constructive written reason so the students know what to revise.
                  </p>
                  <div className="mb-3">
                    <label className="form-label">Mandatory Rejection Reason</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Specify required corrections, scope adjustments, or missing deliverables..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                      id="input-rejection-reason"
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-pmes-secondary"
                    onClick={() => setShowRejectModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-pmes-danger"
                    id="btn-confirm-reject"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
