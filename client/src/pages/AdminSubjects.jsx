import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subjectAPI, departmentAPI, adminAPI } from '../api';

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyUsers, setFacultyUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjDept, setNewSubjDept] = useState('');
  const [newSubjSem, setNewSubjSem] = useState(1);
  const [newSubjType, setNewSubjType] = useState('Theory');
  const [creating, setCreating] = useState(false);

  // Allocate Modal
  const [allocatingSubject, setAllocatingSubject] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [allocating, setAllocating] = useState(false);

  // Edit Subject Modal
  const [editingSubject, setEditingSubject] = useState(null);
  const [editSubjName, setEditSubjName] = useState('');
  const [editSubjCode, setEditSubjCode] = useState('');
  const [editSubjDept, setEditSubjDept] = useState('');
  const [editSubjSem, setEditSubjSem] = useState(1);
  const [editSubjType, setEditSubjType] = useState('Theory');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const [subjRes, deptRes, facRes] = await Promise.all([
        subjectAPI.getAll(),
        departmentAPI.getAll(),
        adminAPI.getUsers('faculty')
      ]);
      setSubjects(subjRes.data.subjects || []);
      setDepartments(deptRes.data.departments || []);
      setFacultyUsers(facRes.data.users || []);

      if (deptRes.data.departments?.length > 0) {
        setNewSubjDept(deptRes.data.departments[0]._id);
      }
    } catch (err) {
      setError('Error loading subjects data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      await subjectAPI.create({
        name: newSubjName.trim(),
        code: newSubjCode.trim(),
        department: newSubjDept,
        semester: Number(newSubjSem),
        type: newSubjType
      });
      setSuccess('Subject created successfully.');
      setShowCreateModal(false);
      setNewSubjName('');
      setNewSubjCode('');
      setNewSubjType('Theory');
      const res = await subjectAPI.getAll();
      setSubjects(res.data.subjects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating subject.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenAllocate = (subj) => {
    setAllocatingSubject(subj);
    setSelectedFacultyId(subj.faculty?._id || '');
    setError('');
  };

  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    setAllocating(true);
    setError('');
    setSuccess('');

    try {
      await subjectAPI.allocate(allocatingSubject._id, selectedFacultyId || null);
      setSuccess('Faculty allocated successfully.');
      setAllocatingSubject(null);
      const res = await subjectAPI.getAll();
      setSubjects(res.data.subjects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error allocating faculty.');
    } finally {
      setAllocating(false);
    }
  };

  const handleOpenEdit = (subj) => {
    setEditingSubject(subj);
    setEditSubjName(subj.name || '');
    setEditSubjCode(subj.code || '');
    setEditSubjDept(subj.department?._id || subj.department || '');
    setEditSubjSem(subj.semester || 1);
    setEditSubjType(subj.type || 'Theory');
    setError('');
    setSuccess('');
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!editSubjName.trim() || !editSubjCode.trim() || !editSubjDept) {
      setError('Please fill in all required fields.');
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await subjectAPI.update(editingSubject._id, {
        name: editSubjName.trim(),
        code: editSubjCode.trim().toUpperCase(),
        department: editSubjDept,
        semester: Number(editSubjSem),
        type: editSubjType
      });
      setSuccess(res.data?.message || 'Subject updated successfully.');
      setEditingSubject(null);
      const updated = await subjectAPI.getAll();
      setSubjects(updated.data.subjects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating subject.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSubject = async (subj) => {
    if (!window.confirm(`Are you sure you want to permanently delete subject '${subj.name}' (${subj.code})?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await subjectAPI.delete(subj._id);
      setSuccess(res.data?.message || 'Subject deleted successfully.');
      const updated = await subjectAPI.getAll();
      setSubjects(updated.data.subjects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting subject.');
    }
  };

  // Filter subjects
  const filteredSubjects = subjects.filter(s => {
    const sDeptId = s.department?._id || s.department;
    if (selectedDept && sDeptId !== selectedDept) return false;
    if (selectedSem && s.semester !== Number(selectedSem)) return false;
    return true;
  });

  // Dynamic semester options based on selected department in filter
  const selectedDeptObj = departments.find(d => d._id === selectedDept);
  const filterMaxSemesters = selectedDeptObj
    ? (selectedDeptObj.totalSemesters || 6)
    : (departments.length > 0 ? Math.max(...departments.map(d => d.totalSemesters || 6), 6) : 12);
  const filterSemesterOptions = Array.from({ length: filterMaxSemesters }, (_, i) => i + 1);

  // Dynamic semester options for Create Subject Modal
  const createDeptObj = departments.find(d => d._id === newSubjDept);
  const createMaxSemesters = createDeptObj?.totalSemesters || 6;
  const createSemesterOptions = Array.from({ length: createMaxSemesters }, (_, i) => i + 1);

  // Dynamic semester options for Edit Subject Modal
  const editDeptObj = departments.find(d => d._id === editSubjDept);
  const editMaxSemesters = editDeptObj?.totalSemesters || 6;
  const editSemesterOptions = Array.from({ length: editMaxSemesters }, (_, i) => i + 1);

  // Eligible faculty for allocation modal: Must belong to the subject's department (FR-DEP-05, BR-12)
  const eligibleFaculty = facultyUsers.filter(f => {
    if (!allocatingSubject) return false;
    const subjDeptId = allocatingSubject.department?._id || allocatingSubject.department;
    const fDeptId = f.department?._id || f.department;
    return fDeptId === subjDeptId && f.isActive;
  });

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold text-dark mb-1">Subjects & Faculty Allocation</h2>
          <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
            Manage curriculum subjects and allocate department faculty to courses.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-pmes-primary"
        >
          <i className="bi bi-plus-lg me-1"></i> Add New Subject
        </button>
      </div>

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

      {/* Filter Bar */}
      <div className="pmes-card p-3 mb-4 shadow-sm bg-light border">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <select
              className="form-select form-select-sm"
              value={selectedDept}
              onChange={(e) => {
                const deptId = e.target.value;
                setSelectedDept(deptId);
                setError('');
                if (deptId) {
                  const dept = departments.find(d => d._id === deptId);
                  if (dept && selectedSem && Number(selectedSem) > dept.totalSemesters) {
                    setSelectedSem('');
                  }
                }
              }}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <select
              className="form-select form-select-sm"
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
            >
              <option value="">All Semesters</option>
              {filterSemesterOptions.map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2 ms-auto text-end text-muted" style={{ fontSize: '0.8rem' }}>
            Showing {filteredSubjects.length} subjects
          </div>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="pmes-card p-3 shadow-sm">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-secondary">Loading subjects catalogue...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-journal-x fs-1 d-block mb-2 text-secondary"></i>
            No subjects found matching your filter criteria.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Subject Name</th>
                  <th>Marking Scheme</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Allocated Faculty</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map(s => (
                  <tr key={s._id}>
                    <td>
                      <span className="badge bg-light text-primary border fw-bold">{s.code}</span>
                    </td>
                    <td className="fw-semibold text-dark">{s.name}</td>
                    <td>
                      {s.type === 'Practical' ? (
                        <span className="badge scheme-badge-practical" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-flask me-1"></i>Practical (150M, Pass: 60)
                        </span>
                      ) : (
                        <span className="badge scheme-badge-theory" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-book me-1"></i>Theory (100M, Pass: 40)
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="dept-badge">{s.department?.name || 'Department'}</span>
                    </td>
                    <td>
                      <span className="semester-badge">Semester {s.semester}</span>
                    </td>
                    <td>
                      {s.faculty ? (
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-check-fill text-success"></i>
                          <div>
                            <div className="fw-semibold text-dark">{s.faculty.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {s.faculty.employeeId || s.faculty.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="badge bg-warning text-dark">
                          <i className="bi bi-exclamation-triangle me-1"></i> Unallocated
                        </span>
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      <div className="d-inline-flex align-items-center gap-1 justify-content-end">
                        <Link
                          to={`/faculty/subjects/${s._id}/marks`}
                          className="btn btn-sm btn-outline-info d-inline-flex align-items-center gap-1 text-nowrap"
                          style={{ fontSize: '0.78rem', padding: '0.28rem 0.6rem' }}
                          title="View Class Gradebook"
                        >
                          <i className="bi bi-award"></i> Gradebook
                        </Link>
                        <button
                          onClick={() => handleOpenAllocate(s)}
                          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 text-nowrap"
                          style={{ fontSize: '0.78rem', padding: '0.28rem 0.6rem' }}
                          title={s.faculty ? 'Reallocate Faculty' : 'Allocate Faculty'}
                        >
                          <i className="bi bi-person-plus"></i>
                          {s.faculty ? 'Reallocate' : 'Allocate'}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 text-nowrap"
                          style={{ fontSize: '0.78rem', padding: '0.28rem 0.6rem' }}
                          title="Edit Subject Details & Scheme"
                        >
                          <i className="bi bi-pencil"></i> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(s)}
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 text-nowrap"
                          style={{ fontSize: '0.78rem', padding: '0.28rem 0.6rem' }}
                          title="Delete Subject"
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

      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  Create New Subject
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>

              <form onSubmit={handleCreateSubject}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Subject Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Operating Systems"
                      value={newSubjName}
                      onChange={(e) => setNewSubjName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Subject Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      placeholder="e.g. CS-401"
                      value={newSubjCode}
                      onChange={(e) => setNewSubjCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Subject Type & Marking Scheme <span className="text-danger">*</span>
                    </label>
                    <div className="d-flex flex-column flex-sm-row gap-2">
                      <div
                        className={`p-3 rounded-3 border flex-grow-1 cursor-pointer ${newSubjType === 'Theory' ? 'border-primary bg-primary-subtle' : 'bg-light'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setNewSubjType('Theory')}
                      >
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="subjType"
                            id="typeTheory"
                            checked={newSubjType === 'Theory'}
                            onChange={() => setNewSubjType('Theory')}
                          />
                          <label className="form-check-label fw-bold text-dark" htmlFor="typeTheory">
                            Theory (100 Marks)
                          </label>
                        </div>
                        <div className="text-secondary mt-1" style={{ fontSize: '0.74rem' }}>
                          Minor: 20, Major: 60, Quiz: 10, Assignment: 10<br />
                          <strong className="text-success">Passing Mark: 40 / 100</strong>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-3 border flex-grow-1 cursor-pointer ${newSubjType === 'Practical' ? 'border-primary bg-primary-subtle' : 'bg-light'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setNewSubjType('Practical')}
                      >
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="subjType"
                            id="typePractical"
                            checked={newSubjType === 'Practical'}
                            onChange={() => setNewSubjType('Practical')}
                          />
                          <label className="form-check-label fw-bold text-dark" htmlFor="typePractical">
                            Practical (150 Marks)
                          </label>
                        </div>
                        <div className="text-secondary mt-1" style={{ fontSize: '0.74rem' }}>
                          Minor: 20, Major: 60, Quiz: 10, Assignment: 10, Practical: 50<br />
                          <strong className="text-success">Passing Mark: 60 / 150</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-7">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        Department / Course <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={newSubjDept}
                        onChange={(e) => {
                          const deptId = e.target.value;
                          setNewSubjDept(deptId);
                          const deptObj = departments.find(d => d._id === deptId);
                          const maxS = deptObj?.totalSemesters || 6;
                          if (newSubjSem > maxS) {
                            setNewSubjSem(1);
                          }
                        }}
                        required
                      >
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.name} ({d.code}) — {d.totalSemesters || 6} Sems</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-5">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        Semester <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={newSubjSem}
                        onChange={(e) => setNewSubjSem(Number(e.target.value))}
                        required
                      >
                        {createSemesterOptions.map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Faculty Modal */}
      {allocatingSubject && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  Allocate Faculty: {allocatingSubject.name} ({allocatingSubject.code})
                </h5>
                <button type="button" className="btn-close" onClick={() => setAllocatingSubject(null)}></button>
              </div>

              <form onSubmit={handleSaveAllocation}>
                <div className="modal-body p-4">
                  <div className="alert alert-info py-2 mb-3" style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-info-circle me-1"></i>
                    <strong>Policy Enforcement:</strong> Only active faculty members from the department <strong>{allocatingSubject.department?.name}</strong> are eligible.
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Select Faculty Member
                    </label>
                    <select
                      className="form-select"
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                    >
                      <option value="">-- No Faculty / Unallocated --</option>
                      {eligibleFaculty.map(f => (
                        <option key={f._id} value={f._id}>
                          {f.name} ({f.employeeId || f.email}) - {f.designation || 'Faculty'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAllocatingSubject(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3" disabled={allocating}>
                    {allocating ? 'Allocating...' : 'Confirm Allocation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-pencil-square text-primary me-2"></i>
                  Edit Subject: {editingSubject.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingSubject(null)}></button>
              </div>

              <form onSubmit={handleUpdateSubject}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Subject Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editSubjName}
                      onChange={(e) => setEditSubjName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Subject Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      value={editSubjCode}
                      onChange={(e) => setEditSubjCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  {/* Marking Scheme */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Marking Scheme & Subject Type <span className="text-danger">*</span>
                    </label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="editSubjType"
                          id="editTypeTheory"
                          value="Theory"
                          checked={editSubjType === 'Theory'}
                          onChange={() => setEditSubjType('Theory')}
                        />
                        <label className="form-check-label" htmlFor="editTypeTheory" style={{ fontSize: '0.85rem' }}>
                          <span className="badge scheme-badge-theory me-1">Theory (100M)</span>
                          <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Pass: 40 Marks (Minor 20M, Major 60M, Quiz 10M, Asg 10M)</span>
                        </label>
                      </div>

                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="editSubjType"
                          id="editTypePractical"
                          value="Practical"
                          checked={editSubjType === 'Practical'}
                          onChange={() => setEditSubjType('Practical')}
                        />
                        <label className="form-check-label" htmlFor="editTypePractical" style={{ fontSize: '0.85rem' }}>
                          <span className="badge scheme-badge-practical me-1">Practical (150M)</span>
                          <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Pass: 60 Marks (Theory 100M + Practical Exam 50M)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-7">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        Department / Course <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={editSubjDept}
                        onChange={(e) => {
                          const deptId = e.target.value;
                          setEditSubjDept(deptId);
                          const deptObj = departments.find(d => d._id === deptId);
                          const maxS = deptObj?.totalSemesters || 6;
                          if (editSubjSem > maxS) {
                            setEditSubjSem(1);
                          }
                        }}
                        required
                      >
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.name} ({d.code}) — {d.totalSemesters || 6} Sems</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-5">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        Semester <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={editSubjSem}
                        onChange={(e) => setEditSubjSem(Number(e.target.value))}
                        required
                      >
                        {editSemesterOptions.map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingSubject(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3" disabled={updating}>
                    {updating ? 'Saving Changes...' : 'Save Subject'}
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

export default AdminSubjects;
