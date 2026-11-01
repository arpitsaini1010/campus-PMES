import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, announcementAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, annRes] = await Promise.allSettled([
        dashboardAPI.get(),
        announcementAPI.getAll()
      ]);

      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value.data);
      } else {
        setError('Error loading dashboard data.');
      }

      if (annRes.status === 'fulfilled') {
        setAnnouncements(annRes.value.data?.announcements || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
        <div className="text-muted mt-2">Loading your project workspace...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger d-inline-block text-start mb-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
        <div>
          <button className="btn btn-pmes-primary" onClick={fetchDashboard}>
            <i className="bi bi-arrow-clockwise me-1"></i> Try Again
          </button>
        </div>
      </div>
    );
  }

  const { project, evaluation, latestFeedback } = data || {};

  const milestoneSteps = [
    { key: 'Draft', label: 'Proposal Draft', icon: 'bi-pencil-square' },
    { key: 'Proposal Submitted', label: 'Under Review', icon: 'bi-send-check' },
    { key: 'In Progress', label: 'In Progress', icon: 'bi-gear-wide-connected' },
    { key: 'Final Submitted', label: 'Final Submitted', icon: 'bi-file-earmark-arrow-up' },
    { key: 'Evaluated', label: 'Evaluated', icon: 'bi-award' }
  ];

  const getMilestoneIndex = (status) => {
    switch (status) {
      case 'Draft': return 0;
      case 'Proposal Submitted': return 1;
      case 'In Progress': return 2;
      case 'Final Submitted': return 3;
      case 'Evaluated': return 4;
      default: return -1;
    }
  };

  const currentStepIdx = project ? getMilestoneIndex(project.status) : -1;

  return (
    <div className="container py-4">
      {/* Student Profile Header */}
      <div className="pmes-card mb-4 p-4 shadow-sm" style={{ borderLeft: '5px solid #4f46e5' }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h2 className="fw-bold mb-0 text-dark">{user?.name}</h2>
              <span className="role-badge student">Student</span>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2 text-secondary mb-2" style={{ fontSize: '0.85rem' }}>
              <span><i className="bi bi-envelope me-1"></i>{user?.email}</span>
              {user?.enrollmentNo && (
                <>
                  <span className="text-muted opacity-50">|</span>
                  <span><i className="bi bi-card-text me-1"></i>Roll / Enrollment No: <strong>#{user.enrollmentNo}</strong></span>
                </>
              )}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="program-badge">
                <i className="bi bi-mortarboard me-1"></i>
                {user?.department?.code || user?.program || 'BCA'}
              </span>
              <span className="semester-badge">
                <i className="bi bi-calendar3 me-1"></i>
                Semester {user?.semester || 1}
              </span>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 text-md-end">
            <Link to="/my-project" className="btn btn-sm btn-pmes-primary">
              <i className="bi bi-folder-check me-1"></i> {project ? 'Manage My Project' : 'Register Project'}
            </Link>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Project Status */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="pmes-card p-3 shadow-sm h-100 border-start border-4 border-primary">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}
              >
                <i className="bi bi-folder-fill"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Project Status
                </div>
                <div className="mt-1">
                  {project ? (
                    <StatusBadge status={project.status} />
                  ) : (
                    <span className="badge bg-secondary">Not Submitted</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Score */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="pmes-card p-3 shadow-sm h-100 border-start border-4 border-success">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}
              >
                <i className="bi bi-award-fill"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Viva & Evaluation
                </div>
                <div className="fw-bold fs-4 text-dark mt-0">
                  {evaluation ? (
                    <span className="text-success">{evaluation.total} <span className="text-muted fs-6">/ 100</span></span>
                  ) : (
                    <span className="text-muted fs-6">Pending</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Guide / Supervisor */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="pmes-card p-3 shadow-sm h-100 border-start border-4 border-info">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(14, 165, 233, 0.1)',
                  color: '#0ea5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}
              >
                <i className="bi bi-person-badge-fill"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Faculty Guide
                </div>
                <div className="fw-bold text-dark mt-0 text-truncate" style={{ fontSize: '0.9rem', maxWidth: '140px' }}>
                  {project?.supervisor?.name || 'Awaiting Allocation'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="pmes-card p-3 shadow-sm h-100 border-start border-4 border-warning">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}
              >
                <i className="bi bi-people-fill"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Project Team
                </div>
                <div className="fw-bold fs-4 text-dark mt-0">
                  {project?.members?.length || 1} <span className="text-muted fs-6">Member(s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Project Overview & Evaluation Details */}
        <div className="col-12 col-lg-8">
          {!project ? (
            <div className="pmes-card text-center py-5 shadow-sm">
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: '#4F46E5',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  marginBottom: '1rem'
                }}
              >
                <i className="bi bi-folder-plus"></i>
              </div>
              <h4 className="fw-bold text-dark">No Project Registered Yet</h4>
              <p className="text-secondary mb-3 px-4" style={{ fontSize: '0.92rem', maxWidth: '520px', margin: '0 auto' }}>
                You have not registered your project proposal yet. Submit your project title, abstract, and repository details to begin.
              </p>
              <Link to="/my-project" className="btn btn-pmes-primary px-4 py-2 mt-2">
                <i className="bi bi-plus-circle me-1"></i> Register Project Now
              </Link>
            </div>
          ) : (
            <div className="pmes-card p-4 shadow-sm mb-4">
              <div className="d-flex flex-wrap justify-content-end align-items-center mb-3 gap-2">
                <StatusBadge status={project.status} />
              </div>

              <h4 className="fw-bold text-dark mb-2">{project.title}</h4>
              <p className="text-secondary mb-3" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                {project.description}
              </p>

              {/* Lifecycle Progress Stepper */}
              <div className="p-3 rounded bg-light border mb-3">
                <div className="text-muted fw-semibold mb-2" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Project Lifecycle Stage
                </div>
                <div className="d-flex justify-content-between align-items-center position-relative">
                  {milestoneSteps.map((step, idx) => {
                    const isDone = currentStepIdx > idx;
                    const isCurrent = currentStepIdx === idx;
                    return (
                      <div key={step.key} className="text-center" style={{ flex: 1, zIndex: 1 }}>
                        <div
                          className="mx-auto rounded-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: '28px',
                            height: '28px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            backgroundColor: isCurrent ? '#4F46E5' : isDone ? '#10B981' : '#E5E7EB',
                            color: isCurrent || isDone ? '#FFFFFF' : '#6B7280',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isDone ? <i className="bi bi-check-lg"></i> : <i className={`bi ${step.icon}`}></i>}
                        </div>
                        <div
                          className="mt-1 text-truncate px-1"
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: isCurrent ? 700 : 500,
                            color: isCurrent ? '#4F46E5' : isDone ? '#10B981' : '#6B7280'
                          }}
                        >
                          {step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Guide and Team details */}
              <div className="row g-3 py-2 border-top border-bottom my-3" style={{ fontSize: '0.85rem' }}>
                <div className="col-12 col-md-6">
                  <span className="text-muted">Faculty Guide / Supervisor:</span>
                  <div className="mt-1">
                    {project.supervisor?.name ? (
                      <strong className="text-dark">
                        <i className="bi bi-person-check text-success me-1"></i>
                        {project.supervisor.name} {project.supervisor.designation ? `(${project.supervisor.designation})` : ''}
                      </strong>
                    ) : (
                      <span className="badge bg-warning text-dark">
                        <i className="bi bi-hourglass-split me-1"></i> Pending Guide Allocation
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <span className="text-muted">Team Members:</span>
                  <div className="mt-1 text-dark">
                    <strong>Leader: {project.leader?.name || user?.name}</strong>
                    {project.members && project.members.length > 1 && (
                      <span className="text-muted ms-1">
                        (+ {project.members.length - 1} other member{project.members.length > 2 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                <div className="d-flex gap-2">
                  <Link to={`/projects/${project._id}`} className="btn btn-sm btn-pmes-primary">
                    <i className="bi bi-box-arrow-up-right me-1"></i> Open Project Workspace
                  </Link>
                  <Link to="/my-project" className="btn btn-sm btn-outline-secondary">
                    <i className="bi bi-pencil me-1"></i> Edit Details & Links
                  </Link>
                </div>
                {project.githubUrl && (
                  <a href={project.githubUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-dark">
                    <i className="bi bi-github me-1"></i> GitHub Repo
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Evaluation Result Breakdown (If Evaluated) */}
          {evaluation && (
            <div className="pmes-card p-4 shadow-sm border-start border-4 border-success mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">
                  <i className="bi bi-award text-success me-2"></i>
                  Evaluation & Viva Scorecard
                </h5>
                <span className="badge bg-success fs-6 px-3 py-2">
                  Total: {evaluation.total} / 100
                </span>
              </div>

              <div className="row g-2 mb-3 text-center">
                <div className="col-6 col-sm-3">
                  <div className="p-2 rounded bg-light border">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>REPORT (30M)</div>
                    <div className="fw-bold fs-5 text-primary">{evaluation.marks?.report || 0}</div>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-2 rounded bg-light border">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>IMPLEMENTATION (40M)</div>
                    <div className="fw-bold fs-5 text-primary">{evaluation.marks?.implementation || 0}</div>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-2 rounded bg-light border">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>PRESENTATION (20M)</div>
                    <div className="fw-bold fs-5 text-primary">{evaluation.marks?.presentation || 0}</div>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="p-2 rounded bg-light border">
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>VIVA VOCE (10M)</div>
                    <div className="fw-bold fs-5 text-primary">{evaluation.marks?.viva || 0}</div>
                  </div>
                </div>
              </div>

              {evaluation.remarks && (
                <div className="p-3 rounded bg-light border">
                  <strong className="text-dark d-block mb-1" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-chat-left-quote me-1 text-primary"></i> Examiner Feedback & Remarks:
                  </strong>
                  <p className="text-secondary mb-0 fst-italic" style={{ fontSize: '0.88rem' }}>
                    "{evaluation.remarks}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Guide Feedback */}
          {!evaluation && latestFeedback && (
            <div className="pmes-card p-4 shadow-sm border-start border-4 border-info">
              <h6 className="fw-bold text-dark mb-1">
                <i className="bi bi-chat-left-quote me-2 text-info"></i>
                Latest Guide Feedback
              </h6>
              <p className="text-secondary mb-2 fst-italic" style={{ fontSize: '0.88rem' }}>
                "{latestFeedback.text}"
              </p>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                Feedback by {latestFeedback.by?.name} on {new Date(latestFeedback.date).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Project Announcements & Guidelines */}
        <div className="col-12 col-lg-4">
          {/* Announcements Card */}
          <div className="pmes-card p-4 shadow-sm mb-4">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h6 className="fw-bold text-dark mb-0">
                <i className="bi bi-megaphone me-2 text-primary"></i>
                Notice Board & Deadlines
              </h6>
              <Link to="/announcements" className="text-decoration-none" style={{ fontSize: '0.78rem' }}>
                View All <i className="bi bi-chevron-right ms-1"></i>
              </Link>
            </div>

            {announcements.length === 0 ? (
              <div className="text-muted text-center py-4" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-bell-slash text-secondary fs-3 d-block mb-1"></i>
                No active announcements posted.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {announcements.slice(0, 4).map((ann) => (
                  <div key={ann._id} className="p-3 rounded border bg-light">
                    <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.85rem' }}>
                      {ann.title}
                    </div>
                    <p className="text-secondary mb-1 text-truncate-2" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                      {ann.content}
                    </p>
                    <div className="text-muted text-end" style={{ fontSize: '0.7rem' }}>
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Workflow Steps Checklist */}
          <div className="pmes-card p-4 shadow-sm">
            <h6 className="fw-bold text-dark mb-3">
              <i className="bi bi-check2-square me-2 text-success"></i>
              Submission Roadmap
            </h6>
            <div className="d-flex flex-column gap-3" style={{ fontSize: '0.82rem' }}>
              <div className="d-flex align-items-start gap-2">
                <i className={`bi ${project ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} mt-1`}></i>
                <div>
                  <strong className="text-dark">1. Project Proposal</strong>
                  <div className="text-muted">Register title, abstract, and team members.</div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <i className={`bi ${project?.supervisor ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} mt-1`}></i>
                <div>
                  <strong className="text-dark">2. Guide Allocation</strong>
                  <div className="text-muted">Admin assigns a faculty supervisor.</div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <i className={`bi ${project?.status === 'Final Submitted' || project?.status === 'Evaluated' ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} mt-1`}></i>
                <div>
                  <strong className="text-dark">3. Final Submission</strong>
                  <div className="text-muted">Submit report, presentation & GitHub URL.</div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <i className={`bi ${evaluation ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'} mt-1`}></i>
                <div>
                  <strong className="text-dark">4. Viva & Final Marks</strong>
                  <div className="text-muted">Evaluation by guide across 100-mark rubric.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;