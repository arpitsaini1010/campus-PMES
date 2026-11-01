import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assignmentAPI } from '../api';

const AssignmentDetail = () => {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [projectLink, setProjectLink] = useState('');
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    setLoading(true);
    try {
      const res = await assignmentAPI.getById(id);
      setAssignment(res.data.assignment);
      if (res.data.assignment?.mySubmission) {
        if (res.data.assignment.mySubmission.projectLink) {
          setProjectLink(res.data.assignment.mySubmission.projectLink);
        }
        if (res.data.assignment.mySubmission.notes) {
          setNotes(res.data.assignment.mySubmission.notes);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading assignment.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setError('File size exceeds the 10 MB limit.');
        setFile(null);
        return;
      }
      const allowedExt = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.ppt', '.pptx', '.zip', '.txt'];
      const fileExt = '.' + selected.name.split('.').pop().toLowerCase();
      if (!allowedExt.includes(fileExt)) {
        setError('Allowed formats: PDF, DOCX/DOC, Excel, PPT, ZIP, TXT.');
        setFile(null);
        return;
      }
      setError('');
      setFile(selected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !projectLink.trim() && !notes.trim()) {
      setError('Please provide either a Project Link or upload a submission document.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    formData.append('projectLink', projectLink.trim());
    formData.append('notes', notes.trim());

    try {
      const res = await assignmentAPI.submitWork(id, formData);
      setSuccess(res.data.message || 'Work submitted successfully!');
      fetchAssignment();
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-secondary">Loading assignment details...</p>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <Link to="/assignments" className="btn btn-sm btn-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to Assignments
        </Link>
      </div>
    );
  }

  const mySub = assignment?.mySubmission;
  const isGraded = mySub && mySub.marks !== null && mySub.marks !== undefined;
  const isClosed = assignment?.status === 'closed';
  const isOverdue = new Date() > new Date(assignment?.dueDate);

  return (
    <div className="container py-4">
      <Link to="/assignments" className="btn btn-sm btn-outline-secondary mb-3">
        <i className="bi bi-arrow-left me-1"></i> Back to Assignments
      </Link>

      <div className="row g-4">
        {/* Left Column: Assignment Details */}
        <div className="col-12 col-lg-7">
          <div className="pmes-card p-4 shadow-sm mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="badge bg-light text-primary border" style={{ fontSize: '0.8rem' }}>
                {assignment?.subject?.code} - {assignment?.subject?.name}
              </span>
              <span className={`badge ${assignment?.status === 'open' ? 'bg-success' : 'bg-secondary'}`}>
                {assignment?.status?.toUpperCase()}
              </span>
            </div>

            <h3 className="fw-bold text-dark mb-2">{assignment?.title}</h3>

            <div className="d-flex flex-wrap gap-3 py-2 my-2 border-top border-bottom text-secondary" style={{ fontSize: '0.85rem' }}>
              <div>
                <i className="bi bi-calendar-event me-1"></i>
                Due: <strong className={isOverdue ? 'text-danger' : 'text-dark'}>
                  {new Date(assignment?.dueDate).toLocaleDateString()} {new Date(assignment?.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </div>
              <div>
                <i className="bi bi-trophy me-1"></i>
                Max Marks: <strong className="text-dark">{assignment?.maxMarks}</strong>
              </div>
              <div>
                <i className="bi bi-person me-1"></i>
                Faculty: <strong className="text-dark">{assignment?.postedBy?.name}</strong>
              </div>
            </div>

            <div className="mt-3">
              <h6 className="fw-bold text-dark">Instructions:</h6>
              <p className="text-secondary" style={{ fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                {assignment?.description}
              </p>
            </div>

            {assignment?.file?.name && (
              <div className="mt-4 p-3 bg-light rounded-3 border">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-arrow-down fs-4 text-primary"></i>
                    <div>
                      <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
                        {assignment.file.name}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {(assignment.file.size / 1024).toFixed(1)} KB | Reference Attachment
                      </div>
                    </div>
                  </div>
                  <a
                    href={assignmentAPI.downloadAttachmentUrl(assignment._id)}
                    className="btn btn-sm btn-outline-primary"
                    download
                  >
                    <i className="bi bi-download me-1"></i> Download
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Submission Area */}
        <div className="col-12 col-lg-5">
          <div className="pmes-card p-4 shadow-sm">
            <h5 className="fw-bold text-dark border-bottom pb-2 mb-3">
              <i className="bi bi-cloud-arrow-up me-2 text-primary"></i>
              Your Submission
            </h5>

            {error && (
              <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                {success}
              </div>
            )}

            {/* If Graded */}
            {isGraded ? (
              <div className="bg-success bg-opacity-10 border border-success p-3 rounded-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="badge bg-success">EVALUATED & GRADED</span>
                  <span className="fs-5 fw-bold text-success">
                    {mySub.marks} / {assignment.maxMarks}
                  </span>
                </div>
                {mySub.remarks && (
                  <div className="mt-2 text-dark" style={{ fontSize: '0.85rem' }}>
                    <strong>Faculty Remarks:</strong> "{mySub.remarks}"
                  </div>
                )}
                <div className="text-muted mt-2 pt-2 border-top" style={{ fontSize: '0.75rem' }}>
                  Graded on {new Date(mySub.gradedAt).toLocaleDateString()}
                </div>
              </div>
            ) : mySub ? (
              <div className="p-3 bg-light border rounded-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className={`badge ${mySub.isLate ? 'bg-danger' : 'bg-primary'}`}>
                    {mySub.isLate ? 'SUBMITTED (LATE)' : 'SUBMITTED (ON TIME)'}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {new Date(mySub.submittedAt).toLocaleDateString()} {new Date(mySub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {mySub.projectLink && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.72rem' }}>
                      <i className="bi bi-link-45deg text-primary"></i> SUBMITTED PROJECT LINK:
                    </div>
                    <a
                      href={mySub.projectLink.startsWith('http') ? mySub.projectLink : `https://${mySub.projectLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary fw-semibold text-decoration-none d-flex align-items-center gap-1"
                      style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}
                    >
                      <i className="bi bi-box-arrow-up-right"></i>
                      <span>{mySub.projectLink}</span>
                    </a>
                  </div>
                )}

                {mySub.file?.name && (
                  <div className="fw-semibold text-dark mt-2" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-file-earmark-check text-success me-1"></i>
                    File: {mySub.file.name}
                    <div className="mt-1">
                      <a
                        href={assignmentAPI.downloadSubmittedFileUrl(mySub._id)}
                        className="btn btn-xs btn-outline-secondary"
                        style={{ fontSize: '0.75rem' }}
                        download
                      >
                        <i className="bi bi-download me-1"></i> Download File
                      </a>
                    </div>
                  </div>
                )}

                {mySub.notes && (
                  <div className="text-secondary mt-2 pt-2 border-top" style={{ fontSize: '0.8rem' }}>
                    <strong>Student Notes:</strong> {mySub.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-clock me-1"></i> No submission recorded yet.
              </div>
            )}

            {/* Upload / Resubmission Form */}
            {!isGraded && !isClosed && (
              <form onSubmit={handleSubmit}>
                {/* 1. Project Link Field */}
                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-link-45deg text-primary me-1"></i> Project Link / Live URL
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted">
                      <i className="bi bi-globe"></i>
                    </span>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="e.g. https://github.com/my-repo or https://myproject.vercel.app"
                      value={projectLink}
                      onChange={(e) => setProjectLink(e.target.value)}
                    />
                  </div>
                  <div className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                    Paste your GitHub repo, Vercel/Netlify live site, or Google Drive link.
                  </div>
                </div>

                {/* 2. File Upload Field (Optional) */}
                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-paperclip text-primary me-1"></i> Upload Document / Code File
                    <span className="text-muted fw-normal ms-1">(Optional if link is provided)</span>
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.ppt,.pptx,.zip,.txt"
                  />
                  <div className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                    Accepted: PDF, Word (DOCX/DOC), Excel, ZIP, PPTX (Max 10 MB).
                  </div>
                </div>

                {/* 3. Notes for Faculty */}
                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                    Notes for Faculty (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Provide any additional comments, credentials, or submission notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>

                {isOverdue && (
                  <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    The deadline has passed. This submission will be marked <strong>Late</strong>.
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-pmes-primary w-100 py-2 fw-semibold shadow-sm"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Uploading...
                    </>
                  ) : mySub ? (
                    'Replace & Resubmit Work'
                  ) : (
                    'Submit Assignment'
                  )}
                </button>
              </form>
            )}

            {isClosed && !isGraded && (
              <div className="alert alert-secondary py-2 mt-3" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-lock-fill me-1"></i> This assignment is closed by faculty. No further submissions accepted.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;
