import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assignmentAPI } from '../api';

const AssignmentTracker = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('submitted');

  // Grading modal state
  const [gradingSub, setGradingSub] = useState(null);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeRemarks, setGradeRemarks] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeError, setGradeError] = useState('');

  useEffect(() => {
    fetchTracker();
  }, [id]);

  const fetchTracker = async () => {
    setLoading(true);
    try {
      const res = await assignmentAPI.getSubmissionsTracker(id);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading assignment tracker.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGrade = (sub) => {
    setGradingSub(sub);
    setGradeMarks(sub.marks !== null && sub.marks !== undefined ? sub.marks : '');
    setGradeRemarks(sub.remarks || '');
    setGradeError('');
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (gradeMarks === '') {
      setGradeError('Please enter marks.');
      return;
    }

    const marksNum = Number(gradeMarks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > data.assignment.maxMarks) {
      setGradeError(`Marks must be between 0 and ${data.assignment.maxMarks}.`);
      return;
    }

    setSavingGrade(true);
    setGradeError('');
    try {
      await assignmentAPI.gradeSubmission(gradingSub.submissionId, {
        marks: marksNum,
        remarks: gradeRemarks
      });
      setGradingSub(null);
      fetchTracker();
    } catch (err) {
      setGradeError(err.response?.data?.message || 'Error saving marks.');
    } finally {
      setSavingGrade(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-secondary">Loading submission tracker...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error || 'Tracker not found.'}</div>
        <Link to="/faculty/subjects" className="btn btn-sm btn-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to Subjects
        </Link>
      </div>
    );
  }

  const { assignment, stats, submitted, late, pending } = data;

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <Link to="/faculty/subjects" className="text-decoration-none text-secondary" style={{ fontSize: '0.85rem' }}>
            <i className="bi bi-arrow-left me-1"></i> Back to Subjects
          </Link>
          <h3 className="fw-bold text-dark mt-1 mb-0">{assignment.title}</h3>
          <p className="text-secondary mb-0" style={{ fontSize: '0.85rem' }}>
            <span>{assignment.subject?.code} - {assignment.subject?.name}</span>
            <span className="mx-2 text-muted opacity-50">|</span>
            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
          </p>
        </div>

        <div className="d-flex gap-2">
          <a
            href={assignmentAPI.exportCSVUrl(assignment._id)}
            className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
            download
          >
            <i className="bi bi-filetype-csv fs-6"></i> Export CSV
          </a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="pmes-card p-3 shadow-sm border text-center">
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>TOTAL ENROLLED</div>
            <div className="fw-bold fs-4 text-dark">{stats.totalStudents}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="pmes-card p-3 shadow-sm border text-center">
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>ON-TIME SUBMITTED</div>
            <div className="fw-bold fs-4 text-success">{stats.onTimeCount}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="pmes-card p-3 shadow-sm border text-center">
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>LATE SUBMITTED</div>
            <div className="fw-bold fs-4 text-danger">{stats.lateCount}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="pmes-card p-3 shadow-sm border text-center">
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>PENDING</div>
            <div className="fw-bold fs-4 text-warning text-dark">{stats.pendingCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'submitted' ? 'active fw-bold' : ''}`}
            onClick={() => setActiveTab('submitted')}
          >
            On-Time Submissions ({submitted.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'late' ? 'active fw-bold' : ''}`}
            onClick={() => setActiveTab('late')}
          >
            Late Submissions ({late.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'pending' ? 'active fw-bold' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Work ({pending.length})
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="pmes-card p-3 shadow-sm">
        {activeTab === 'submitted' || activeTab === 'late' ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Enrollment No</th>
                  <th>Student Name</th>
                  <th>Submitted At</th>
                  <th>Submission / Link</th>
                  <th className="text-center">Score</th>
                  <th>Remarks</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'submitted' ? submitted : late).length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No submissions in this category.
                    </td>
                  </tr>
                ) : (
                  (activeTab === 'submitted' ? submitted : late).map((item, idx) => (
                    <tr key={idx}>
                      <td><span className="badge bg-light text-dark border">{item.student?.enrollmentNo}</span></td>
                      <td className="fw-semibold text-dark">{item.student?.name}</td>
                      <td className="text-muted">{new Date(item.submittedAt).toLocaleString()}</td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          {item.projectLink && (
                            <a
                              href={item.projectLink.startsWith('http') ? item.projectLink : `https://${item.projectLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-xs btn-outline-info text-dark d-inline-flex align-items-center gap-1"
                              style={{ fontSize: '0.75rem', width: 'fit-content' }}
                            >
                              <i className="bi bi-box-arrow-up-right text-primary"></i>
                              <span>Project Link</span>
                            </a>
                          )}
                          {item.fileName ? (
                            <a
                              href={assignmentAPI.downloadSubmittedFileUrl(item.submissionId)}
                              className="btn btn-xs btn-outline-primary d-inline-flex align-items-center gap-1"
                              style={{ fontSize: '0.75rem', width: 'fit-content' }}
                              download
                            >
                              <i className="bi bi-download"></i>
                              <span>{item.fileName}</span>
                            </a>
                          ) : !item.projectLink && (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>No file</span>
                          )}
                          {item.notes && (
                            <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                              Note: {item.notes}
                            </small>
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        {item.marks !== null && item.marks !== undefined ? (
                          <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-1">
                            {item.marks} / {assignment.maxMarks}
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">Ungraded</span>
                        )}
                      </td>
                      <td className="text-secondary fst-italic text-truncate" style={{ maxWidth: '180px' }}>
                        {item.remarks || '—'}
                      </td>
                      <td className="text-end">
                        <button
                          onClick={() => handleOpenGrade(item)}
                          className="btn btn-sm btn-pmes-primary"
                        >
                          <i className="bi bi-check2-circle me-1"></i> {item.marks !== null ? 'Edit Grade' : 'Grade'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Enrollment No</th>
                  <th>Student Name</th>
                  <th>Email Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      All enrolled students have submitted their work!
                    </td>
                  </tr>
                ) : (
                  pending.map((item, idx) => (
                    <tr key={idx}>
                      <td><span className="badge bg-light text-dark border">{item.student?.enrollmentNo}</span></td>
                      <td className="fw-semibold text-dark">{item.student?.name}</td>
                      <td className="text-muted">{item.student?.email}</td>
                      <td><span className="badge bg-warning text-dark">Pending Submission</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grade Modal */}
      {gradingSub && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-award-fill me-2 text-primary"></i>
                  Grade Student Submission
                </h5>
                <button type="button" className="btn-close" onClick={() => setGradingSub(null)}></button>
              </div>

              <form onSubmit={handleSaveGrade}>
                <div className="modal-body p-4">
                  <div className="mb-3 p-2 bg-light rounded border text-secondary" style={{ fontSize: '0.85rem' }}>
                    Student: <strong className="text-dark">{gradingSub.student?.name}</strong> ({gradingSub.student?.enrollmentNo})
                    {gradingSub.projectLink && (
                      <div className="mt-1">
                        Project Link:{' '}
                        <a
                          href={gradingSub.projectLink.startsWith('http') ? gradingSub.projectLink : `https://${gradingSub.projectLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fw-bold text-primary text-decoration-none"
                        >
                          <i className="bi bi-box-arrow-up-right me-1"></i>
                          {gradingSub.projectLink}
                        </a>
                      </div>
                    )}
                    {gradingSub.fileName && (
                      <div className="mt-1">
                        File: <strong className="text-dark">{gradingSub.fileName}</strong>
                      </div>
                    )}
                    {gradingSub.notes && (
                      <div className="mt-1 text-muted" style={{ fontSize: '0.78rem' }}>
                        Student Note: <em>"{gradingSub.notes}"</em>
                      </div>
                    )}
                  </div>

                  {gradeError && (
                    <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                      {gradeError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Marks Obtained (0 - {assignment.maxMarks}) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      max={assignment.maxMarks}
                      value={gradeMarks}
                      onChange={(e) => setGradeMarks(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Faculty Remarks / Feedback
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Feedback visible to student upon saving..."
                      value={gradeRemarks}
                      onChange={(e) => setGradeRemarks(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setGradingSub(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3" disabled={savingGrade}>
                    {savingGrade ? 'Saving...' : 'Save & Publish Marks'}
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

export default AssignmentTracker;
