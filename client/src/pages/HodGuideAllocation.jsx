import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const HodGuideAllocation = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Guide allocation modal state
  const [assignModalProject, setAssignModalProject] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [savingGuide, setSavingGuide] = useState(false);

  const fetchDepartmentProjects = async (deptId = '') => {
    try {
      setLoading(true);
      setError('');
      const params = deptId ? { department: deptId } : {};
      const res = await projectAPI.getHodProjects(params);
      setData(res.data);
      if (res.data.department?._id && !selectedDeptId) {
        setSelectedDeptId(res.data.department._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading department projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentProjects(selectedDeptId);
  }, [selectedDeptId]);

  const { department, allDepartments = [], projects = [], faculty = [] } = data || {};

  // Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const awaitingGuide = projects.filter(p => !p.supervisor).length;
    const pendingApproval = projects.filter(p => p.status === 'Proposal Submitted' && p.supervisor).length;
    const inProgress = projects.filter(p => p.status === 'In Progress' || p.status === 'Approved').length;
    const evaluated = projects.filter(p => p.status === 'Evaluated').length;
    return { total, awaitingGuide, pendingApproval, inProgress, evaluated };
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Tab filter
      if (statusFilter === 'UNASSIGNED' && p.supervisor) return false;
      if (statusFilter === 'PROPOSAL' && p.status !== 'Proposal Submitted') return false;
      if (statusFilter === 'WORKING' && p.status !== 'In Progress' && p.status !== 'Approved') return false;
      if (statusFilter === 'EVALUATED' && p.status !== 'Evaluated') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = p.title?.toLowerCase().includes(q);
        const leaderMatch = p.leader?.name?.toLowerCase().includes(q) || p.leader?.enrollmentNo?.toLowerCase().includes(q);
        const guideMatch = p.supervisor?.name?.toLowerCase().includes(q);
        const techMatch = Array.isArray(p.techStack) && p.techStack.some(t => t.toLowerCase().includes(q));
        if (!titleMatch && !leaderMatch && !guideMatch && !techMatch) return false;
      }
      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  const handleOpenAssignModal = (project) => {
    setAssignModalProject(project);
    setSelectedFacultyId(project.supervisor?._id || '');
    setError('');
  };

  const handleCloseAssignModal = () => {
    setAssignModalProject(null);
    setSelectedFacultyId('');
  };

  const handleSaveGuide = async (e) => {
    e.preventDefault();
    if (!selectedFacultyId) {
      return setError('Please select a faculty member to allocate as guide.');
    }

    try {
      setSavingGuide(true);
      setError('');
      setSuccess('');
      const res = await projectAPI.assignGuide(assignModalProject._id, selectedFacultyId);
      setSuccess(res.data.message || 'Project guide allocated successfully.');
      handleCloseAssignModal();
      fetchDepartmentProjects(selectedDeptId);
    } catch (err) {
      setError(err.response?.data?.message || 'Error allocating guide.');
    } finally {
      setSavingGuide(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Header Banner */}
      <div className="pmes-card mb-4 p-4 shadow-sm" style={{ borderLeft: '5px solid #4f46e5' }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-primary px-3 py-1 fs-6">
                <i className="bi bi-shield-check me-1"></i> HOD Guide Allocation Desk
              </span>
              {department && (
                <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '0.85rem' }}>
                  {department.code} - {department.name}
                </span>
              )}
            </div>
            <h2 className="fw-bold text-dark mb-1">
              Student Project Applications & <span className="gradient-text">Guide Allocation</span>
            </h2>
            <p className="text-secondary mb-0">
              Review group project proposals submitted by students of your department and assign faculty guides (or yourself).
            </p>
          </div>

          {/* Admin Department Switcher if multiple departments exist */}
          {allDepartments.length > 0 && (
            <div className="d-flex align-items-center gap-2">
              <label className="text-secondary small fw-bold text-nowrap mb-0">Course / Dept:</label>
              <select
                className="form-select form-select-sm"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                style={{ minWidth: '180px' }}
              >
                {allDepartments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger py-2 mb-3 d-flex align-items-center justify-content-between">
          <span><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</span>
          <button className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success py-2 mb-3 d-flex align-items-center justify-content-between">
          <span><i className="bi bi-check-circle-fill me-2"></i>{success}</span>
          <button className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-md-3">
          <div
            className="pmes-card p-3 h-100 cursor-pointer"
            style={{ borderLeft: '4px solid #6366f1' }}
            onClick={() => setStatusFilter('ALL')}
          >
            <div className="text-secondary small fw-bold text-uppercase">Total Applied Projects</div>
            <div className="fs-3 fw-bold text-dark mt-1">{metrics.total}</div>
            <div className="small text-muted mt-1">Student Group Projects</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-3">
          <div
            className="pmes-card p-3 h-100 cursor-pointer"
            style={{ borderLeft: '4px solid #f59e0b', backgroundColor: metrics.awaitingGuide > 0 ? '#fffbeb' : undefined }}
            onClick={() => setStatusFilter('UNASSIGNED')}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-warning-emphasis small fw-bold text-uppercase">Awaiting Guide</span>
              {metrics.awaitingGuide > 0 && (
                <span className="badge bg-warning text-dark animate-pulse">Action Needed</span>
              )}
            </div>
            <div className="fs-3 fw-bold text-warning-emphasis mt-1">{metrics.awaitingGuide}</div>
            <div className="small text-muted mt-1">Pending Guide Allocation</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-3">
          <div
            className="pmes-card p-3 h-100 cursor-pointer"
            style={{ borderLeft: '4px solid #3b82f6' }}
            onClick={() => setStatusFilter('PROPOSAL')}
          >
            <div className="text-secondary small fw-bold text-uppercase">Pending Guide Approval</div>
            <div className="fs-3 fw-bold text-primary mt-1">{metrics.pendingApproval}</div>
            <div className="small text-muted mt-1">Guide Allocated, Awaiting Review</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-md-3">
          <div
            className="pmes-card p-3 h-100 cursor-pointer"
            style={{ borderLeft: '4px solid #10b981' }}
            onClick={() => setStatusFilter('WORKING')}
          >
            <div className="text-secondary small fw-bold text-uppercase">Approved & In Progress</div>
            <div className="fs-3 fw-bold text-success mt-1">{metrics.inProgress}</div>
            <div className="small text-muted mt-1">Under Development</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="pmes-card mb-4 p-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <div className="d-flex flex-wrap gap-2">
              <button
                className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-pmes-primary' : 'btn-outline-secondary'}`}
                onClick={() => setStatusFilter('ALL')}
              >
                All ({metrics.total})
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'UNASSIGNED' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'}`}
                onClick={() => setStatusFilter('UNASSIGNED')}
              >
                <i className="bi bi-exclamation-circle me-1"></i> Awaiting Guide ({metrics.awaitingGuide})
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'PROPOSAL' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setStatusFilter('PROPOSAL')}
              >
                Pending Approval ({metrics.pendingApproval})
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'WORKING' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setStatusFilter('WORKING')}
              >
                Approved / Working ({metrics.inProgress})
              </button>
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search project title, leader, guide, technology..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn btn-outline-secondary" onClick={() => setSearchQuery('')}>
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="pmes-card p-0 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <div className="text-muted mt-2">Loading department applications...</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-folder2-open display-4 text-muted mb-2 d-block"></i>
            <h5 className="text-dark fw-bold">No Projects Found</h5>
            <p className="text-secondary small mb-0">
              {statusFilter === 'UNASSIGNED'
                ? 'Great! All submitted student projects currently have a guide allocated.'
                : 'No projects match your current filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '30%' }}>Project Proposal</th>
                  <th style={{ width: '22%' }}>Student Team</th>
                  <th style={{ width: '25%' }}>Allocated Guide</th>
                  <th style={{ width: '13%' }}>Status</th>
                  <th style={{ width: '10%' }} className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => {
                  const isAwaitingGuide = !p.supervisor;
                  return (
                    <tr key={p._id} className={isAwaitingGuide ? 'table-warning-subtle' : ''}>
                      <td>
                        <div className="fw-bold text-dark">{p.title}</div>
                        <div className="text-muted small text-truncate" style={{ maxWidth: '320px' }}>
                          {p.description}
                        </div>
                        {Array.isArray(p.techStack) && p.techStack.length > 0 && (
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {p.techStack.slice(0, 3).map((tech, idx) => (
                              <span key={idx} className="badge bg-light text-dark border" style={{ fontSize: '0.68rem' }}>
                                {tech}
                              </span>
                            ))}
                            {p.techStack.length > 3 && (
                              <span className="badge bg-light text-muted border" style={{ fontSize: '0.68rem' }}>
                                +{p.techStack.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="fw-semibold text-dark">
                          <i className="bi bi-person-fill text-primary me-1"></i>
                          {p.leader?.name}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {p.leader?.enrollmentNo ? `#${p.leader.enrollmentNo}` : p.leader?.email}
                        </div>
                        <div className="text-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-people me-1"></i>
                          {p.members?.length || 1} team member(s)
                        </div>
                      </td>

                      <td>
                        {p.supervisor ? (
                          <div>
                            <div className="fw-bold text-success d-flex align-items-center gap-1">
                              <i className="bi bi-person-check-fill"></i>
                              {p.supervisor.name}
                              {p.supervisor._id === user?._id && (
                                <span className="badge bg-primary text-white" style={{ fontSize: '0.62rem' }}>YOU (HOD)</span>
                              )}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {p.supervisor.designation || 'Faculty'}
                            </div>
                          </div>
                        ) : (
                          <span className="badge bg-warning text-dark px-2 py-1">
                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                            Awaiting Guide
                          </span>
                        )}
                      </td>

                      <td>
                        <StatusBadge status={p.status} />
                      </td>

                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            className={`btn btn-sm ${isAwaitingGuide ? 'btn-primary' : 'btn-pmes-secondary'}`}
                            onClick={() => handleOpenAssignModal(p)}
                            title={isAwaitingGuide ? 'Allocate Guide' : 'Change Guide'}
                          >
                            <i className={`bi ${isAwaitingGuide ? 'bi-person-plus-fill' : 'bi-pencil-square'} me-1`}></i>
                            {isAwaitingGuide ? 'Allocate' : 'Change'}
                          </button>
                          <Link to={`/projects/${p._id}`} className="btn btn-sm btn-outline-secondary" title="View Full Project">
                            <i className="bi bi-eye"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guide Allocation Modal */}
      {assignModalProject && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content pmes-card border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-person-badge-fill text-primary me-2"></i>
                  Allocate Project Guide (HOD)
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseAssignModal}></button>
              </div>

              <form onSubmit={handleSaveGuide}>
                <div className="modal-body py-3">
                  <div className="p-3 rounded-3 bg-light border mb-3">
                    <div className="text-muted small fw-bold text-uppercase">Project</div>
                    <div className="fw-bold text-dark fs-6">{assignModalProject.title}</div>
                    <div className="small text-secondary mt-1">
                      <strong>Leader:</strong> {assignModalProject.leader?.name} ({assignModalProject.leader?.enrollmentNo || assignModalProject.leader?.email})
                    </div>
                    <div className="small text-secondary">
                      <strong>Current Guide:</strong>{' '}
                      {assignModalProject.supervisor?.name ? (
                        <span className="text-success fw-bold">{assignModalProject.supervisor.name}</span>
                      ) : (
                        <span className="text-warning fw-bold">Unassigned</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold text-dark">
                      Select Faculty Guide for this Team <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Faculty Guide --</option>
                      {faculty.map((f) => {
                        const isSelf = f._id === user?._id;
                        return (
                          <option key={f._id} value={f._id}>
                            {f.name} ({f.designation || 'Faculty'}) {isSelf ? '⭐ [HOD - Assign Yourself]' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <div className="form-text text-muted" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-info-circle me-1"></i>
                      As HOD, you can allocate any faculty member in your department, or assign yourself as the project guide.
                    </div>
                  </div>

                  <div className="alert alert-info py-2 small mb-0">
                    <i className="bi bi-bell-fill me-1"></i>
                    Once allocated, the faculty guide will receive an immediate notification to review the proposal and approve it for student development.
                  </div>
                </div>

                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-pmes-secondary" onClick={handleCloseAssignModal} disabled={savingGuide}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-pmes-primary" disabled={savingGuide}>
                    {savingGuide ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span> Allocating Guide...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-1"></i> Confirm & Allocate Guide
                      </>
                    )}
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

export default HodGuideAllocation;

