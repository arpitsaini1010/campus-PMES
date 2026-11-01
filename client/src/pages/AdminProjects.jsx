import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI, adminAPI, departmentAPI } from '../api';
import StatusBadge from '../components/StatusBadge';
import { CPU_PROGRAMS } from '../constants/academic';

const AdminProjects = () => {
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  // Assignment Modal
  const [assignModalProject, setAssignModalProject] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (programFilter) params.program = programFilter;
      if (semesterFilter) params.semester = semesterFilter;
      if (unassignedOnly) params.unassigned = 'true';

      const [projRes, facRes, deptRes] = await Promise.all([
        projectAPI.getAll(params),
        adminAPI.getUsers('faculty'),
        departmentAPI.getAll()
      ]);

      setProjects(projRes.data.projects || []);
      setFacultyList(facRes.data.users || []);
      setDepartments(deptRes.data.departments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, programFilter, semesterFilter, unassignedOnly]);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFacultyId) return;

    setAssigning(true);
    setError('');
    setSuccess('');

    try {
      const res = await adminAPI.assignSupervisor(assignModalProject._id, selectedFacultyId);
      setSuccess(res.data.message || 'Supervisor assigned successfully!');
      setAssignModalProject(null);
      setSelectedFacultyId('');
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Error assigning supervisor.');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteProject = async (p) => {
    if (!window.confirm(`Are you sure you want to permanently delete project '${p.title}'? This will remove all project workspace records.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await projectAPI.delete(p._id);
      setSuccess(res.data.message || 'Project deleted successfully.');
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting project.');
    }
  };

  // Instant client-side search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.leader?.name?.toLowerCase().includes(q) ||
        p.leader?.enrollmentNo?.toLowerCase().includes(q) ||
        p.supervisor?.name?.toLowerCase().includes(q) ||
        p.program?.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            Academic <span className="gradient-text">Projects Repository</span>
          </h2>
          <p className="text-secondary mb-0">
            Project lifecycle oversight, supervisor assignment, and evaluation tracking.
          </p>
        </div>
        <div className="badge bg-primary text-white px-3 py-2 fs-6 shadow-sm">
          <i className="bi bi-folder-check me-1"></i> Total: {projects.length} Projects
        </div>
      </div>

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

      {/* Filter and Search Toolbar */}
      <div className="pmes-card mb-4 p-3">
        <div className="row g-2 align-items-center mb-2">
          {/* Search Box */}
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search title, student, supervisor..."
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

          {/* Program Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={programFilter}
              onChange={(e) => {
                const prog = e.target.value;
                setProgramFilter(prog);
                if (prog) {
                  const dept = departments.find(d => d.code === prog || d.name === prog);
                  if (dept && semesterFilter && Number(semesterFilter) > dept.totalSemesters) {
                    setSemesterFilter('');
                  }
                }
              }}
            >
              <option value="">All Programs</option>
              {departments.length > 0 ? (
                departments.map((d) => (
                  <option key={d._id} value={d.code}>{d.code} — {d.name}</option>
                ))
              ) : (
                CPU_PROGRAMS.map((p) => (
                  <option key={p.code} value={p.code}>{p.code}</option>
                ))
              )}
            </select>
          </div>

          {/* Semester Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
            >
              <option value="">All Semesters</option>
              {(() => {
                const selectedDept = departments.find(d => d.code === programFilter || d.name === programFilter);
                const maxS = selectedDept ? (selectedDept.totalSemesters || 6) : (departments.length > 0 ? Math.max(...departments.map(d => d.totalSemesters || 6), 6) : 12);
                return Array.from({ length: maxS }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ));
              })()}
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              id="filter-project-status"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Proposal Submitted">Proposal Submitted</option>
              <option value="In Progress">In Progress</option>
              <option value="Rejected">Rejected</option>
              <option value="Final Submitted">Final Submitted</option>
              <option value="Evaluated">Evaluated</option>
            </select>
          </div>


        </div>

        <div className="d-flex align-items-center justify-content-between pt-2 border-top">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="checkUnassignedOnly"
              checked={unassignedOnly}
              onChange={(e) => setUnassignedOnly(e.target.checked)}
            />
            <label className="form-check-label text-warning fw-semibold" htmlFor="checkUnassignedOnly" style={{ fontSize: '0.85rem' }}>
              <i className="bi bi-exclamation-circle me-1"></i> Show Unassigned Projects Only
            </label>
          </div>
          {(statusFilter || programFilter || semesterFilter || searchQuery || unassignedOnly) && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setStatusFilter('');
                setProgramFilter('');
                setSemesterFilter('');
                setSearchQuery('');
                setUnassignedOnly(false);
              }}
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Projects Directory Table */}
      <div className="pmes-card">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <div className="text-muted mt-2">Loading projects directory...</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-folder-x display-4 d-block mb-2 text-muted"></i>
            No projects matched the selected filters.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="pmes-table">
              <thead>
                <tr>
                  <th>Title & Classification</th>
                  <th>Student Leader</th>
                  <th>Supervisor</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p) => (
                  <tr key={p._id}>
                    <td style={{ maxWidth: '320px' }}>
                      <div className="fw-bold text-dark">{p.title}</div>
                      <div className="d-flex flex-wrap gap-1 mt-1 align-items-center">
                        <span className="program-badge">
                          {p.program || p.leader?.program || 'BCA'}
                        </span>
                        <span className="semester-badge">
                          Sem {p.semester || p.leader?.semester || 5}
                        </span>
                        {p.academicYear && (
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {p.academicYear}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-dark fw-semibold">{p.leader?.name}</div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        {p.leader?.enrollmentNo && `#${p.leader.enrollmentNo} | `}
                        {p.members?.length} member(s)
                      </div>
                    </td>
                    <td>
                      {p.supervisor ? (
                        <div>
                          <div className="text-success fw-semibold" style={{ fontSize: '0.85rem' }}>
                            <i className="bi bi-person-badge me-1"></i>{p.supervisor.name}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {p.supervisor.designation || 'Faculty'} | {p.supervisor.department || 'Computer Applications'}
                          </div>
                        </div>
                      ) : (
                        <span className="badge bg-warning text-dark">
                          <i className="bi bi-exclamation-triangle me-1"></i> Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-2">
                        {p.status !== 'Evaluated' && (
                          <button
                            className="btn btn-sm btn-pmes-secondary"
                            onClick={() => {
                              setAssignModalProject(p);
                              setSelectedFacultyId(p.supervisor?._id || '');
                            }}
                            title="Assign or change supervisor"
                            id={`btn-manage-supervisor-${p._id}`}
                          >
                            <i className="bi bi-person-gear"></i>
                          </button>
                        )}
                        <Link to={`/projects/${p._id}`} className="btn btn-sm btn-pmes-primary">
                          View
                        </Link>
                        <button
                          onClick={() => handleDeleteProject(p)}
                          className="btn btn-sm btn-outline-danger"
                          title="Delete Project"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {assignModalProject && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content pmes-card border-0">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-person-gear me-2 text-primary"></i>Assign Project Supervisor
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAssignModalProject(null)}
                ></button>
              </div>
              <form onSubmit={handleAssignSubmit}>
                <div className="modal-body">
                  <div className="p-3 mb-3 pmes-inner-box">
                    <span className="text-muted text-uppercase" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                      Selected Project:
                    </span>
                    <div className="fw-bold text-dark mt-1">{assignModalProject.title}</div>
                    <div className="d-flex gap-2 mt-2 align-items-center">
                      <span className="program-badge">{assignModalProject.program || 'BCA'}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Select Faculty Supervisor</label>
                    <select
                      className="form-select"
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                      required
                      id="select-faculty-modal"
                    >
                      <option value="">-- Choose Faculty Supervisor --</option>
                      {facultyList
                        .filter((f) => f.isActive)
                        .map((f) => (
                          <option key={f._id} value={f._id}>
                            {f.name} ({f.designation || 'Faculty'})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-pmes-secondary"
                    onClick={() => setAssignModalProject(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-pmes-primary"
                    disabled={assigning}
                    id="btn-confirm-assign-modal"
                  >
                    {assigning ? 'Assigning...' : 'Save Supervisor'}
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

export default AdminProjects;
