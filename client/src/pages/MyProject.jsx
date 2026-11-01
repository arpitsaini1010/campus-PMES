import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { CPU_PROGRAMS, getSemestersForProgram } from '../constants/academic';

const MyProject = () => {
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [program, setProgram] = useState(user?.program || 'BCA');
  const [semester, setSemester] = useState(user?.semester || 5);
  const [techStack, setTechStack] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [members, setMembers] = useState([]);

  // Search member state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const projRes = await projectAPI.getAll();

      if (projRes.data.projects && projRes.data.projects.length > 0) {
        const myProj = projRes.data.projects[0];
        setProject(myProj);
        setTitle(myProj.title || '');
        setDescription(myProj.description || '');
        setProgram(myProj.program || user?.program || 'BCA');
        setSemester(myProj.semester || user?.semester || 5);
        setTechStack(Array.isArray(myProj.techStack) ? myProj.techStack.join(', ') : '');
        setGithubUrl(myProj.githubUrl || '');
        setMembers(myProj.members || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading project.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await projectAPI.create({
        title,
        description,
        program,
        semester: Number(semester),
        techStack: techStack.split(',').map((s) => s.trim()).filter(Boolean),
        githubUrl
      });
      setSuccess('Project topic initialized in Draft status successfully!');
      setProject(res.data.project);
      setMembers(res.data.project.members || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating project.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await projectAPI.update(project._id, {
        title,
        description,
        program,
        semester: Number(semester),
        techStack: techStack.split(',').map((s) => s.trim()).filter(Boolean),
        githubUrl,
        members: members.map((m) => m._id)
      });
      setSuccess('Project details updated successfully!');
      setProject(res.data.project);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating project.');
    }
  };

  const handleSearchStudents = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const res = await projectAPI.searchStudents(q);
      setSearchResults(res.data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = (student) => {
    if (members.length >= 4) {
      return setError('Maximum team size is 4 members.');
    }
    if (members.some((m) => m._id === student._id)) {
      return setError('Student is already in your team.');
    }

    setMembers([...members, student]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveMember = (studentId) => {
    if (studentId === project?.leader?._id) {
      return setError('Cannot remove project leader.');
    }
    setMembers(members.filter((m) => m._id !== studentId));
  };

  const handleReturnToDraft = async () => {
    setError('');
    setSuccess('');

    try {
      const res = await projectAPI.changeStatus(project._id, { action: 'RETURN_TO_DRAFT' });
      setSuccess('Project returned to Draft status. You can now edit and resubmit.');
      setProject(res.data.project);
    } catch (err) {
      setError(err.response?.data?.message || 'Error changing project status.');
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const isLeader = project && (project.leader?._id === user?._id || project.leader === user?._id);
  const isDraft = project?.status === 'Draft';
  const availableSemesters = getSemestersForProgram(program);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            {project ? 'Configure' : 'Register'} <span className="gradient-text">Project & Team</span>
          </h2>
          <p className="text-secondary mb-0">
            Academic project specifications, classifications, and team roster.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {project && (
            <Link to={`/projects/${project._id}`} className="btn btn-sm btn-outline-primary">
              <i className="bi bi-box-arrow-up-right me-1"></i> Open Workspace
            </Link>
          )}
          {project && <StatusBadge status={project.status} />}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 mb-4 d-flex align-items-center justify-content-between" id="project-error-alert">
          <span><i className="bi bi-exclamation-circle-fill me-2"></i>{error}</span>
          <button className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success py-2 mb-4 d-flex align-items-center justify-content-between" id="project-success-alert">
          <span><i className="bi bi-check-circle-fill me-2"></i>{success}</span>
          <button className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Academic Workflow Guidance Card */}
      {project && (
        <div className="card border-0 shadow-sm p-3 mb-4 rounded-3" style={{ background: '#f8fafc', borderLeft: '4px solid #6366f1' }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-info-circle-fill text-primary fs-5"></i>
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                  Project Lifecycle Stage: <span className="text-primary">{project.status}</span>
                </div>
                <div className="text-secondary small">
                  {project.status === 'Draft' && (
                    <>
                      Step 1 of 3: Draft your project specifications and team roster. Once ready, upload your proposal document and submit to your <strong>Department HOD</strong> for guide allocation.
                    </>
                  )}
                  {project.status === 'Proposal Submitted' && !project.supervisor && (
                    <>
                      Step 2 of 3: <strong>Applied to Department HOD</strong>. Your proposal is currently under review by the HOD for assigning a faculty project guide.
                    </>
                  )}
                  {project.status === 'Proposal Submitted' && project.supervisor && (
                    <>
                      Step 2 of 3: <strong>Guide Allocated</strong> by HOD: <span className="text-success fw-bold">{project.supervisor.name}</span>. Awaiting guide's proposal review & approval.
                    </>
                  )}
                  {(project.status === 'In Progress' || project.status === 'Approved') && (
                    <>
                      Step 3 of 3: <strong>Approved by Guide!</strong> You are actively working under supervisor <strong>{project.supervisor?.name}</strong>.
                    </>
                  )}
                  {project.status === 'Final Submitted' && (
                    <>
                      Final project submitted. Awaiting viva voce defense and final 100-mark evaluation by supervisor.
                    </>
                  )}
                  {project.status === 'Evaluated' && (
                    <>
                      Project viva defense completed and officially evaluated.
                    </>
                  )}
                </div>
              </div>
            </div>

            <Link to={`/projects/${project._id}`} className="btn btn-sm btn-pmes-primary">
              <i className="bi bi-folder-check me-1"></i> Open Project Workspace
            </Link>
          </div>
        </div>
      )}

      {/* Rejected Notice */}
      {project?.status === 'Rejected' && (
        <div className="alert alert-warning p-4 mb-4" id="rejected-return-banner">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h5 className="fw-bold text-dark mb-1">
                <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                Proposal Requires Revision
              </h5>
              <p className="mb-0 text-dark">
                Supervisor Feedback: <strong>{project.rejectionReason}</strong>
              </p>
            </div>
            {isLeader && (
              <button
                onClick={handleReturnToDraft}
                className="btn btn-warning fw-bold text-dark px-3 py-2"
                id="btn-return-to-draft"
              >
                <i className="bi bi-arrow-repeat me-1"></i> Return to Draft & Edit
              </button>
            )}
          </div>
        </div>
      )}

      {!project ? (
        /* Create Project Form */
        <div className="row justify-content-center">
          <div className="col-12 col-lg-9">
            <div className="pmes-card p-4 p-md-5">
              <div className="mb-4 text-center">
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '14px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#4F46E5',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    marginBottom: '1rem'
                  }}
                >
                  <i className="bi bi-folder-plus"></i>
                </div>
                <h3 className="fw-bold text-dark mb-1">Initiate Project Registration</h3>
                <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                  Register your capstone topic. You will be assigned as project leader and can add up to 3 teammates.
                </p>
              </div>

              <form onSubmit={handleCreate}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="new-proj-title">Project Title</label>
                  <input
                    type="text"
                    id="new-proj-title"
                    className="form-control"
                    placeholder="e.g. AI-Powered Medical Imaging & Diagnostic Assistant"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="row mb-3">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <label className="form-label">Academic Program</label>
                    <select
                      className="form-select"
                      value={program}
                      onChange={(e) => {
                        setProgram(e.target.value);
                        setSemester(1);
                      }}
                      required
                    >
                      {CPU_PROGRAMS.map((p) => (
                        <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Semester</label>
                    <select
                      className="form-select"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      required
                    >
                      {availableSemesters.map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">GitHub Repository URL (Optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://github.com/username/project"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Key Technologies / Tech Stack</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. React, Node.js, Express, MongoDB, PyTorch (comma separated)"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="new-proj-desc">Project Abstract & Scope</label>
                  <textarea
                    id="new-proj-desc"
                    className="form-control"
                    rows="5"
                    placeholder="Describe problem statement, objectives, proposed methodology, and expected deliverables..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-pmes-primary w-100 py-2" id="btn-submit-create-project">
                  <i className="bi bi-plus-circle me-1"></i> Register Project (Draft)
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Edit or View Existing Project */
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <div className="pmes-card">
              <h4 className="fw-bold text-dark mb-3">Project Specifications</h4>

              {!isDraft && (
                <div className="alert alert-info py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-lock-fill me-1"></i> Project details cannot be modified while in status <strong>'{project.status}'</strong>.
                </div>
              )}

              <form onSubmit={handleUpdate}>
                <div className="mb-3">
                  <label className="form-label">Project Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!isDraft || !isLeader}
                    required
                  />
                </div>

                <div className="row mb-3">
                  <div className="col-md-6 mb-3 mb-md-0">
                    <label className="form-label">Academic Program</label>
                    <select
                      className="form-select"
                      value={program}
                      onChange={(e) => {
                        setProgram(e.target.value);
                        setSemester(1);
                      }}
                      disabled={!isDraft || !isLeader}
                    >
                      {CPU_PROGRAMS.map((p) => (
                        <option key={p.code} value={p.code}>{p.code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Semester</label>
                    <select
                      className="form-select"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      disabled={!isDraft || !isLeader}
                    >
                      {availableSemesters.map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">GitHub Repository Link</label>
                  <input
                    type="url"
                    className="form-control"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    disabled={!isDraft || !isLeader}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Tech Stack</label>
                  <input
                    type="text"
                    className="form-control"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    placeholder="e.g. React, Node.js, Express"
                    disabled={!isDraft || !isLeader}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Description & Abstract</label>
                  <textarea
                    className="form-control"
                    rows="5"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isDraft || !isLeader}
                    required
                  ></textarea>
                </div>

                {isDraft && isLeader && (
                  <button type="submit" className="btn btn-pmes-primary" id="btn-save-project-changes">
                    <i className="bi bi-save me-1"></i> Save Changes
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Team Members Management */}
          <div className="col-12 col-lg-5">
            <div className="pmes-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold text-dark mb-0">Team Roster</h4>
                <span className="badge bg-primary">{members.length} / 4 Members</span>
              </div>

              <div className="d-flex flex-column gap-2 mb-4">
                {members.map((m) => (
                  <div
                    key={m._id}
                    className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-light border"
                  >
                    <div>
                      <div className="fw-semibold text-dark">
                        {m.name}
                        {m._id === project.leader?._id && (
                          <span className="badge bg-primary ms-2" style={{ fontSize: '0.65rem' }}>LEADER</span>
                        )}
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        {m.email} {m.enrollmentNo && `| #${m.enrollmentNo}`}
                      </div>
                    </div>
                    {isDraft && isLeader && m._id !== project.leader?._id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m._id)}
                        className="btn btn-sm btn-outline-danger"
                        title="Remove member"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Team Member (only if Draft and leader and size < 4) */}
              {isDraft && isLeader && members.length < 4 && (
                <div className="pt-3 border-top">
                  <label className="form-label">Search & Add Team Member</label>
                  <div className="input-group mb-2">
                    <span className="input-group-text">
                      <i className="bi bi-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by student name, email, enrollment..."
                      value={searchQuery}
                      onChange={handleSearchStudents}
                      id="input-search-student"
                    />
                  </div>

                  {searching && (
                    <div className="text-muted py-2" style={{ fontSize: '0.85rem' }}>
                      <span className="spinner-border spinner-border-sm me-1"></span> Searching students...
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="list-group mt-2 shadow-sm" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {searchResults.map((s) => (
                        <div
                          key={s._id}
                          className="list-group-item d-flex justify-content-between align-items-center p-2"
                        >
                          <div>
                            <div className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>{s.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {s.email} {s.enrollmentNo && `| #${s.enrollmentNo}`}
                            </div>
                          </div>
                          {s.isAvailable ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-pmes-primary py-1 px-2"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => handleAddMember(s)}
                            >
                              <i className="bi bi-plus-lg me-1"></i> Add
                            </button>
                          ) : (
                            <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>In Project</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProject;
