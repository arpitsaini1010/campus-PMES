import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, adminAPI } from '../api';
import StatusBadge from '../components/StatusBadge';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Supervisor assignment state
  const [assigningProject, setAssigningProject] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [dashRes, facRes] = await Promise.allSettled([
        dashboardAPI.get(),
        adminAPI.getUsers('faculty')
      ]);

      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value.data);
      } else {
        const msg = dashRes.reason?.response?.data?.message || dashRes.reason?.message || 'Error loading admin dashboard metrics.';
        setError(msg);
      }

      if (facRes.status === 'fulfilled') {
        setFacultyList(facRes.value.data?.users || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error loading admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAssignSupervisor = async (e) => {
    e.preventDefault();
    if (!selectedFacultyId) return;

    setAssigning(true);
    setError('');
    setSuccess('');

    try {
      await adminAPI.assignSupervisor(assigningProject._id, selectedFacultyId);
      setSuccess('Faculty guide assigned successfully!');
      setAssigningProject(null);
      setSelectedFacultyId('');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error assigning guide.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-secondary">Loading admin dashboard...</p>
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
          <button className="btn btn-pmes-primary" onClick={fetchDashboardData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    counts,
    unassignedProjects = [],
    statusCounts = {}
  } = data || {};

  const totalProjectsCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="container py-4">
      {/* Page Title & Navigation Quick Actions */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-1 text-dark">
            Admin <span className="gradient-text">Workspace</span>
          </h2>
          <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
            College project management, guide allocations, and evaluation oversight.
          </p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Link to="/admin/students" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-mortarboard me-1"></i> Students
          </Link>
          <Link to="/admin/users" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-people me-1"></i> Faculty
          </Link>
          <Link to="/admin/projects" className="btn btn-sm btn-pmes-primary">
            <i className="bi bi-kanban me-1"></i> All Projects
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>{error}</div>}
      {success && <div className="alert alert-success py-2 mb-3" style={{ fontSize: '0.85rem' }}>{success}</div>}

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Total Students */}
        <div className="col-12 col-sm-6 col-xl-3">
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
                <i className="bi bi-mortarboard-fill"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Registered Students
                </div>
                <div className="fw-bold fs-3 text-dark mt-0" style={{ lineHeight: '1.1' }}>
                  {counts?.students || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Faculty */}
        <div className="col-12 col-sm-6 col-xl-3">
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
                <i className="bi bi-people-fill"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Faculty Guides
                </div>
                <div className="fw-bold fs-3 text-dark mt-0" style={{ lineHeight: '1.1' }}>
                  {counts?.faculty || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Projects */}
        <div className="col-12 col-sm-6 col-xl-3">
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
                <i className="bi bi-kanban-fill"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Total Projects
                </div>
                <div className="fw-bold fs-3 text-dark mt-0" style={{ lineHeight: '1.1' }}>
                  {totalProjectsCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Awaiting Guide */}
        <div className="col-12 col-sm-6 col-xl-3">
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
                <i className="bi bi-person-x-fill"></i>
              </div>
              <div className="flex-grow-1">
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  Needs Guide Allocation
                </div>
                <div className={`fw-bold fs-3 mt-0 ${unassignedProjects.length > 0 ? 'text-warning' : 'text-success'}`} style={{ lineHeight: '1.1' }}>
                  {unassignedProjects.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Status Distribution */}
      <div className="pmes-card p-4 shadow-sm mb-4">
        <div className="border-bottom pb-2 mb-3">
          <h6 className="fw-bold text-dark mb-0">
            Project Lifecycle Status Breakdown
          </h6>
          <div className="text-muted" style={{ fontSize: '0.78rem' }}>Distribution of student capstone submissions across stages</div>
        </div>
        <div className="row g-2 row-cols-2 row-cols-sm-3 row-cols-lg-5">
          {['Draft', 'Proposal Submitted', 'In Progress', 'Final Submitted', 'Evaluated'].map((st) => (
            <div key={st} className="col">
              <div className="p-3 rounded-3 text-center bg-light border h-100 d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-center mb-2">
                  <StatusBadge status={st} />
                </div>
                <div className="fw-bold fs-3 text-dark">{statusCounts[st] || 0}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row g-4">
        {/* Projects Awaiting Supervisor */}
        <div className="col-12 col-lg-7">
          <div className="pmes-card p-4 shadow-sm h-100">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold text-dark mb-0">
                <i className="bi bi-person-plus text-warning me-2"></i>
                Projects Awaiting Guide Allocation
              </h5>
              <span className="badge bg-warning text-dark">{unassignedProjects.length}</span>
            </div>

            {unassignedProjects.length === 0 ? (
              <div className="text-center py-4 text-muted" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-check2-circle text-success fs-3 d-block mb-1"></i>
                All submitted student projects have been assigned a faculty guide.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {unassignedProjects.map(p => (
                  <div key={p._id} className="p-3 rounded border bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <strong className="text-dark d-block" style={{ fontSize: '0.92rem' }}>{p.title}</strong>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                        Leader: {p.leader?.name} ({p.leader?.enrollmentNo})
                      </span>
                    </div>
                    <button
                      className="btn btn-sm btn-pmes-primary"
                      onClick={() => {
                        setAssigningProject(p);
                        setSelectedFacultyId('');
                      }}
                    >
                      <i className="bi bi-person-check me-1"></i> Assign Guide
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Admin Operations */}
        <div className="col-12 col-lg-5">
          <div className="pmes-card p-4 shadow-sm h-100">
            <h5 className="fw-bold text-dark mb-3">
              <i className="bi bi-lightning-charge text-primary me-2"></i>
              Quick Actions
            </h5>

            <div className="d-flex flex-column gap-2">
              <Link to="/admin/students" className="p-3 rounded border bg-light text-decoration-none d-flex align-items-center justify-content-between hover-bg">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-mortarboard fs-5 text-primary"></i>
                  <div>
                    <strong className="text-dark d-block" style={{ fontSize: '0.88rem' }}>Manage Students</strong>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>View, add, or reset student accounts</span>
                  </div>
                </div>
                <i className="bi bi-chevron-right text-muted"></i>
              </Link>

              <Link to="/admin/users" className="p-3 rounded border bg-light text-decoration-none d-flex align-items-center justify-content-between hover-bg">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-people fs-5 text-success"></i>
                  <div>
                    <strong className="text-dark d-block" style={{ fontSize: '0.88rem' }}>Manage Faculty</strong>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Add or edit faculty project supervisors</span>
                  </div>
                </div>
                <i className="bi bi-chevron-right text-muted"></i>
              </Link>



              <Link to="/announcements" className="p-3 rounded border bg-light text-decoration-none d-flex align-items-center justify-content-between hover-bg">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-megaphone fs-5 text-warning"></i>
                  <div>
                    <strong className="text-dark d-block" style={{ fontSize: '0.88rem' }}>Post Announcement</strong>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Broadcast viva dates and project guidelines</span>
                  </div>
                </div>
                <i className="bi bi-chevron-right text-muted"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Assignment Modal */}
      {assigningProject && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">
                  Assign Faculty Guide
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAssigningProject(null)}
                  disabled={assigning}
                ></button>
              </div>
              <form onSubmit={handleAssignSupervisor}>
                <div className="modal-body py-3">
                  <div className="p-3 rounded bg-light border mb-3">
                    <strong className="text-dark d-block">{assigningProject.title}</strong>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Leader: {assigningProject.leader?.name}
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Select Faculty Guide:
                    </label>
                    <select
                      className="form-select"
                      required
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                    >
                      <option value="">-- Choose a Faculty Member --</option>
                      {facultyList.filter(f => f.isActive).map(f => (
                        <option key={f._id} value={f._id}>
                          {f.name} ({f.designation || 'Faculty'}{f.specialization ? ` - ${f.specialization}` : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setAssigningProject(null)}
                    disabled={assigning}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-pmes-primary"
                    disabled={assigning || !selectedFacultyId}
                  >
                    {assigning ? 'Assigning...' : 'Confirm Assignment'}
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

export default AdminDashboard;