import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../api';

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deletingDept, setDeletingDept] = useState(null);

  // Form states for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    totalSemesters: 6
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentAPI.getAll();
      setDepartments(res.data.departments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading departments.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      code: '',
      totalSemesters: 6
    });
    setError('');
    setSuccess('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      totalSemesters: dept.totalSemesters || 6
    });
    setError('');
    setSuccess('');
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Please provide department name and code.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await departmentAPI.create({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        totalSemesters: Number(formData.totalSemesters)
      });
      setSuccess(res.data.message || 'Department created successfully.');
      setShowAddModal(false);
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating department.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Please provide department name and code.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await departmentAPI.update(editingDept._id, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        totalSemesters: Number(formData.totalSemesters)
      });
      setSuccess(res.data.message || 'Department updated successfully.');
      setEditingDept(null);
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete department '${dept.name}' (${dept.code})?`)) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await departmentAPI.delete(dept._id);
      setSuccess(res.data.message || 'Department deleted successfully.');
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting department.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Header with Title and Add Button */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-1">University Departments & Courses</h2>
          <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
            Academic departmental structure, course durations, and semester control.
          </p>
        </div>

        <div>
          <button
            onClick={handleOpenAdd}
            className="btn btn-pmes-primary px-3 py-2"
            id="btn-add-department"
          >
            <i className="bi bi-plus-lg me-1"></i> Add Department
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 mb-3 d-flex align-items-center justify-content-between" style={{ fontSize: '0.88rem' }}>
          <span><i className="bi bi-exclamation-circle-fill me-2"></i>{error}</span>
          <button className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success py-2 mb-3 d-flex align-items-center justify-content-between" style={{ fontSize: '0.88rem' }}>
          <span><i className="bi bi-check-circle-fill me-2"></i>{success}</span>
          <button className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-secondary">Loading academic departments...</p>
        </div>
      ) : departments.length === 0 ? (
        /* Clean Empty State */
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
              fontSize: '1.8rem',
              marginBottom: '1rem'
            }}
          >
            <i className="bi bi-building-add"></i>
          </div>
          <h4 className="fw-bold text-dark mb-2">No Departments Registered Yet</h4>
          <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: '480px', fontSize: '0.9rem' }}>
            Get started by adding your university's departments or courses (e.g. BCA, B.Tech, MCA, MBA) and defining how many semesters each program requires.
          </p>
          <button
            onClick={handleOpenAdd}
            className="btn btn-pmes-primary px-4 py-2"
          >
            <i className="bi bi-plus-circle me-1"></i> Add First Department
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {departments.map((dept) => {
            const isUnderstaffed = dept.activeFacultyCount < 5;
            return (
              <div key={dept._id} className="col-12 col-md-6 col-lg-4">
                <div className={`pmes-card h-100 p-4 shadow-sm border ${isUnderstaffed && dept.activeFacultyCount > 0 ? 'border-warning' : ''}`}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="dept-badge">
                      <i className="bi bi-buildings me-1"></i>{dept.code}
                    </span>
                    <div className="d-flex gap-1">
                      <button
                        onClick={() => handleOpenEdit(dept)}
                        className="btn btn-sm btn-outline-primary py-1 px-2"
                        style={{ fontSize: '0.78rem' }}
                        title="Edit Department & Semesters"
                      >
                        <i className="bi bi-pencil me-1"></i> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="btn btn-sm btn-outline-danger py-1 px-2"
                        style={{ fontSize: '0.78rem' }}
                        title="Delete Department"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>

                  <h4 className="fw-bold text-dark mb-1 fs-5">{dept.name}</h4>
                  <div className="text-secondary mb-3" style={{ fontSize: '0.85rem' }}>
                    Course Duration: <strong className="text-dark">{dept.totalSemesters} Semesters</strong>
                  </div>

                  {isUnderstaffed && dept.activeFacultyCount > 0 && (
                    <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '0.78rem' }}>
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      <strong>Staffing Alert:</strong> Fewer than 5 faculty ({dept.activeFacultyCount}/5).
                    </div>
                  )}

                  <div className="border-top pt-3">
                    <div className="d-flex justify-content-between align-items-center py-1 border-bottom" style={{ fontSize: '0.85rem' }}>
                      <span className="text-secondary"><i className="bi bi-person-badge text-primary me-2"></i>Active Faculty</span>
                      <strong className={isUnderstaffed && dept.activeFacultyCount > 0 ? 'text-warning text-dark' : 'text-success'}>
                        {dept.activeFacultyCount}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1 border-bottom" style={{ fontSize: '0.85rem' }}>
                      <span className="text-secondary"><i className="bi bi-mortarboard text-info me-2"></i>Enrolled Students</span>
                      <strong className="text-dark">{dept.activeStudentCount}</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1" style={{ fontSize: '0.85rem' }}>
                      <span className="text-secondary"><i className="bi bi-journal-text text-secondary me-2"></i>Curriculum Subjects</span>
                      <strong className="text-dark">{dept.subjectCount}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-building-add text-primary me-2"></i>
                  Add New Department / Course
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>

              <form onSubmit={handleCreateDepartment}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Department / Course Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bachelor of Computer Applications (BCA)"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Department Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      placeholder="e.g. BCA, BTECH, MCA, BBA, PHARM"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                    />
                    <div className="form-text" style={{ fontSize: '0.75rem' }}>
                      Short uppercase acronym used in roll numbers and course codes.
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Total Semesters in Course <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.totalSemesters}
                      onChange={(e) => setFormData({ ...formData, totalSemesters: Number(e.target.value) })}
                      required
                    >
                      <option value="1">1 Semester</option>
                      <option value="2">2 Semesters (1 Year)</option>
                      <option value="3">3 Semesters</option>
                      <option value="4">4 Semesters (2 Years - e.g. MCA, MBA, M.Tech)</option>
                      <option value="5">5 Semesters</option>
                      <option value="6">6 Semesters (3 Years - e.g. BCA, BBA, B.Sc)</option>
                      <option value="7">7 Semesters</option>
                      <option value="8">8 Semesters (4 Years - e.g. B.Tech, B.Pharm)</option>
                      <option value="9">9 Semesters</option>
                      <option value="10">10 Semesters (5 Years - e.g. Integrated M.Tech, Law)</option>
                      <option value="11">11 Semesters</option>
                      <option value="12">12 Semesters (6 Years)</option>
                    </select>
                    <div className="form-text" style={{ fontSize: '0.75rem' }}>
                      Defines the valid semester range (1 to N) for student registration, promotions, and subject allocations.
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-pmes-primary px-3" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-pencil-square text-primary me-2"></i>
                  Edit Department: {editingDept.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingDept(null)}></button>
              </div>

              <form onSubmit={handleUpdateDepartment}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Department / Course Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Department Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Total Semesters in Course <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.totalSemesters}
                      onChange={(e) => setFormData({ ...formData, totalSemesters: Number(e.target.value) })}
                      required
                    >
                      <option value="1">1 Semester</option>
                      <option value="2">2 Semesters (1 Year)</option>
                      <option value="3">3 Semesters</option>
                      <option value="4">4 Semesters (2 Years - e.g. MCA, MBA, M.Tech)</option>
                      <option value="5">5 Semesters</option>
                      <option value="6">6 Semesters (3 Years - e.g. BCA, BBA, B.Sc)</option>
                      <option value="7">7 Semesters</option>
                      <option value="8">8 Semesters (4 Years - e.g. B.Tech, B.Pharm)</option>
                      <option value="9">9 Semesters</option>
                      <option value="10">10 Semesters (5 Years - e.g. Integrated M.Tech, Law)</option>
                      <option value="11">11 Semesters</option>
                      <option value="12">12 Semesters (6 Years)</option>
                    </select>
                    <div className="form-text" style={{ fontSize: '0.75rem' }}>
                      Adjusting total semesters controls the upper bound for student promotions and curriculum allocations.
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingDept(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
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

export default AdminDepartments;
