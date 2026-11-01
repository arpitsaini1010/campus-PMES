import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, announcementAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
        setError(dashRes.reason?.response?.data?.message || 'Error loading faculty dashboard.');
      }

      if (annRes.status === 'fulfilled') {
        setAnnouncements(annRes.value.data?.announcements || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading faculty dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const {
    totalAssigned = 0,
    pendingProposals = [],
    pendingEvaluations = [],
    projects = []
  } = data || {};

  const evaluatedCount = useMemo(() => {
    return projects.filter(p => p.status === 'Evaluated').length;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.title?.toLowerCase().includes(q) ||
        p.leader?.name?.toLowerCase().includes(q) ||
        p.leader?.enrollmentNo?.toLowerCase().includes(q)
      );
    });
  }, [projects, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="text-muted mt-2">Loading supervisor workspace...</div>
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

  return (
    <div className="container py-4">
      {/* Faculty Profile Banner */}
      <div className="pmes-card mb-4 p-4 shadow-sm" style={{ borderLeft: '5px solid #10B981' }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h2 className="fw-bold mb-0 text-dark">{user?.name}</h2>
              <span className="role-badge faculty">Faculty Guide</span>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-3 text-secondary mb-2" style={{ fontSize: '0.85rem' }}>
              <span><i className="bi bi-briefcase me-1 text-primary"></i>{user?.designation || 'Faculty Member'}</span>
              <span className="text-muted opacity-50">|</span>
              <span><i className="bi bi-envelope me-1"></i>{user?.email}</span>
              {user?.employeeId && (
                <>
                  <span className="text-muted opacity-50">|</span>
                  <span><i className="bi bi-badge-ad me-1"></i>ID: <strong>#{user.employeeId}</strong></span>
                </>
              )}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="dept-badge">
                <i className="bi bi-building me-1"></i>
                {user?.department?.code || (user?.departmentName?.toLowerCase().includes('technology') ? 'BTECH' : user?.departmentName?.toLowerCase().includes('master of computer') ? 'MCA' : 'BCA')}
              </span>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            {(user?.isHod || user?.designation?.toLowerCase().includes('hod')) && (
              <Link to="/hod/guide-allocation" className="btn btn-sm btn-warning text-dark fw-bold shadow-sm">
                <i className="bi bi-shield-check me-1"></i> Guide Allocation (HOD)
              </Link>
            )}
            <Link to="/faculty/assignments" className="btn btn-sm btn-primary shadow-sm fw-semibold">
              <i className="bi bi-journal-plus me-1"></i> Projects & Assignment
            </Link>
            <Link to="/faculty/projects" className="btn btn-sm btn-outline-primary">
              <i className="bi bi-collection me-1"></i> Assigned Projects
            </Link>
          </div>
        </div>
      </div>

      {/* HOD Quick Action Banner */}
      {(user?.isHod || user?.designation?.toLowerCase().includes('hod')) && (
        <div className="alert alert-warning mb-4 d-flex flex-wrap align-items-center justify-content-between p-3 border-0 shadow-sm rounded-3" style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-check fs-4 text-warning-emphasis"></i>
            <div>
              <div className="fw-bold text-dark">Head of Department (HOD) Authority</div>
              <div className="small text-secondary">
                Students apply for major/minor group projects to you. Assign faculty guides (or yourself) to incoming proposals.
              </div>
            </div>
          </div>
          <Link to="/hod/guide-allocation" className="btn btn-sm btn-warning text-dark fw-bold mt-2 mt-sm-0">
            <i className="bi bi-person-badge-fill me-1"></i> Open Guide Allocation Desk
          </Link>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="row g-3 mb-4">
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
                <i className="bi bi-folder-check"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Assigned Projects
                </div>
                <div className="fw-bold fs-3 text-dark mt-0" style={{ lineHeight: '1.1' }}>
                  {totalAssigned || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

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
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Proposals To Review
                </div>
                <div className={`fw-bold fs-3 mt-0 ${pendingProposals.length > 0 ? 'text-primary' : 'text-dark'}`} style={{ lineHeight: '1.1' }}>
                  {pendingProposals.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="pmes-card p-3 shadow-sm h-100 border-start border-4 border-danger">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}
              >
                <i className="bi bi-award"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Finals To Evaluate
                </div>
                <div className={`fw-bold fs-3 mt-0 ${pendingEvaluations.length > 0 ? 'text-danger' : 'text-dark'}`} style={{ lineHeight: '1.1' }}>
                  {pendingEvaluations.length}
                </div>
              </div>
            </div>
          </div>
        </div>

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
                <i className="bi bi-check-circle-fill"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Evaluated Completed
                </div>
                <div className="fw-bold fs-3 text-dark mt-0" style={{ lineHeight: '1.1' }}>
                  {evaluatedCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Assigned Projects Workspace */}
        <div className="col-12 col-lg-8">
          {/* Action Alerts for Pending Items */}
          {pendingProposals.length > 0 && (
            <div className="alert alert-primary py-2 px-3 mb-3 d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-exclamation-circle-fill me-1"></i>
                <strong>{pendingProposals.length} Proposal(s)</strong> awaiting your approval or feedback.
              </span>
              <Link to={`/projects/${pendingProposals[0]._id}`} className="btn btn-xs btn-primary" style={{ fontSize: '0.75rem' }}>
                Review Proposal
              </Link>
            </div>
          )}

          {pendingEvaluations.length > 0 && (
            <div className="alert alert-danger py-2 px-3 mb-3 d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-clock-history me-1"></i>
                <strong>{pendingEvaluations.length} Project(s)</strong> submitted final work and need 100-mark viva evaluation.
              </span>
              <Link to={`/projects/${pendingEvaluations[0]._id}/evaluate`} className="btn btn-xs btn-danger" style={{ fontSize: '0.75rem' }}>
                Evaluate Now
              </Link>
            </div>
          )}

          <div className="pmes-card p-4 shadow-sm">
            <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-3 mb-3 gap-2">
              <h5 className="fw-bold text-dark mb-0">Assigned Student Projects</h5>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search project or student..."
                  style={{ width: '200px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="form-select form-select-sm"
                  style={{ width: '150px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Proposal Submitted">Proposal Submitted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Final Submitted">Final Submitted</option>
                  <option value="Evaluated">Evaluated</option>
                </select>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-inbox fs-2 text-secondary d-block mb-1"></i>
                No projects found matching the selected filter.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {filteredProjects.map((p) => (
                  <div key={p._id} className="p-3 rounded border bg-light">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="flex-grow-1">
                        <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '1.02rem' }}>{p.title}</h6>
                        <div className="text-secondary d-flex flex-wrap align-items-center gap-2" style={{ fontSize: '0.82rem' }}>
                          <span>Leader: <strong>{p.leader?.name}</strong> ({p.leader?.enrollmentNo})</span>
                          <span className="text-muted opacity-50">|</span>
                          <span>Members: <strong>{p.members?.length || 1}</strong></span>
                        </div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>

                    <div className="d-flex justify-content-between align-items-center border-top pt-2">
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Last updated: {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                      <div className="d-flex gap-2">
                        {p.status === 'Final Submitted' && (
                          <Link to={`/projects/${p._id}/evaluate`} className="btn btn-xs btn-outline-danger" style={{ fontSize: '0.75rem' }}>
                            <i className="bi bi-award me-1"></i> Grade Viva (100M)
                          </Link>
                        )}
                        <Link to={`/projects/${p._id}`} className="btn btn-xs btn-pmes-primary" style={{ fontSize: '0.75rem' }}>
                          View Workspace
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Evaluation Rubric Guide & Announcements */}
        <div className="col-12 col-lg-4">
          {/* Evaluation Rubric Reference Card */}
          <div className="pmes-card p-4 shadow-sm mb-4">
            <h6 className="fw-bold text-dark mb-3">
              <i className="bi bi-file-earmark-check me-2 text-primary"></i>
              Evaluation Rubric Scheme
            </h6>
            <div className="d-flex flex-column gap-2" style={{ fontSize: '0.82rem' }}>
              <div className="d-flex justify-content-between p-2 rounded bg-light border">
                <span>1. Project Report & Docs</span>
                <strong className="text-primary">30 Marks</strong>
              </div>
              <div className="d-flex justify-content-between p-2 rounded bg-light border">
                <span>2. Implementation & Code</span>
                <strong className="text-primary">40 Marks</strong>
              </div>
              <div className="d-flex justify-content-between p-2 rounded bg-light border">
                <span>3. Presentation & PPT</span>
                <strong className="text-primary">20 Marks</strong>
              </div>
              <div className="d-flex justify-content-between p-2 rounded bg-light border">
                <span>4. Viva Voce & Q&A</span>
                <strong className="text-primary">10 Marks</strong>
              </div>
              <div className="d-flex justify-content-between p-2 rounded bg-primary text-white mt-1">
                <strong>Total Viva Score</strong>
                <strong>100 Marks</strong>
              </div>
            </div>
          </div>

          {/* Notice Board */}
          <div className="pmes-card p-4 shadow-sm">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h6 className="fw-bold text-dark mb-0">
                <i className="bi bi-megaphone me-2 text-warning"></i>
                Announcements
              </h6>
              <Link to="/announcements" className="text-decoration-none" style={{ fontSize: '0.78rem' }}>
                View All
              </Link>
            </div>

            {announcements.length === 0 ? (
              <div className="text-muted text-center py-3" style={{ fontSize: '0.85rem' }}>
                No announcements posted.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {announcements.slice(0, 3).map(ann => (
                  <div key={ann._id} className="p-2 rounded border bg-light">
                    <strong className="text-dark d-block" style={{ fontSize: '0.82rem' }}>{ann.title}</strong>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;