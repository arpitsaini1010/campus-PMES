import React, { useState, useEffect, useMemo } from 'react';
import { adminAPI, departmentAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  CPU_DEPARTMENTS,
  FACULTY_DESIGNATIONS
} from '../constants/academic';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roleFilter, setRoleFilter] = useState('faculty');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Delete Confirmation Modal State
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);

  // Reset Password Modal State
  const [resetModalData, setResetModalData] = useState(null);

  // Create Faculty state
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '',
    designation: 'Assistant Professor',
    phone: '',
    password: ''
  });
  const [creating, setCreating] = useState(false);

  // Edit User state
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '',
    designation: 'Assistant Professor',
    phone: ''
  });
  const [updatingUser, setUpdatingUser] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers(roleFilter);
      setUsers(res.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  useEffect(() => {
    departmentAPI.getAll().then(res => {
      const depts = res.data.departments || [];
      setDepartments(depts);
      if (depts.length > 0) {
        setFacultyForm(prev => ({ ...prev, department: depts[0]._id }));
      }
    }).catch(err => {
      console.warn('Could not load departments dynamically:', err.message);
    });
  }, []);

  const handleOpenCreateFaculty = async () => {
    setShowAddFacultyModal(true);
    setFacultyForm(prev => ({
      ...prev,
      name: '',
      email: '',
      employeeId: 'Fetching next ID...',
      department: departments.length > 0 ? departments[0]._id : '',
      designation: 'Assistant Professor',
      phone: '',
      password: ''
    }));

    try {
      const res = await adminAPI.getNextId('faculty');
      if (res.data?.nextId) {
        setFacultyForm(prev => ({ ...prev, employeeId: res.data.nextId }));
      }
    } catch (err) {
      console.warn('Could not auto-fetch faculty ID, will be generated upon save:', err);
      setFacultyForm(prev => ({ ...prev, employeeId: 'EMP-102' }));
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      const res = await adminAPI.createFaculty(facultyForm);
      setSuccess(res.data.message || 'Faculty account created successfully!');
      setShowAddFacultyModal(false);
      setFacultyForm({
        name: '',
        email: '',
        employeeId: '',
        department: departments.length > 0 ? departments[0]._id : '',
        designation: 'Assistant Professor',
        phone: '',
        password: ''
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating faculty account.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user._id === currentUser?._id) {
      return setError('Cannot deactivate your own administrator account.');
    }

    try {
      await adminAPI.toggleUserActive(user._id, !user.isActive);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating status.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalData) return;
    try {
      const res = await adminAPI.resetPassword(resetModalData.user._id, resetModalData.newPassword);
      setSuccess(`Password for ${resetModalData.user.name} reset to: ${resetModalData.newPassword}`);
      setResetModalData(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error resetting password.');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTargetUser) return;
    try {
      const res = await adminAPI.deleteUser(deleteTargetUser._id);
      setSuccess(res.data.message);
      setDeleteTargetUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting user.');
    }
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setEditUserForm({
      name: u.name || '',
      email: u.email || '',
      employeeId: u.employeeId || '',
      department: u.department?._id || u.department || '',
      designation: u.designation || 'Assistant Professor',
      phone: u.phone || ''
    });
    setError('');
    setSuccess('');
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setUpdatingUser(true);
    setError('');
    setSuccess('');

    try {
      await adminAPI.updateUser(editingUser._id, {
        name: editUserForm.name.trim(),
        email: editUserForm.email.trim(),
        employeeId: editUserForm.employeeId.trim(),
        department: editUserForm.department,
        designation: editUserForm.designation,
        phone: editUserForm.phone
      });
      setSuccess(`User '${editUserForm.name}' updated successfully.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating user.');
    } finally {
      setUpdatingUser(false);
    }
  };

  // Client-side instant search & department filtering
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Department filter
      const deptName = u.department?.name || u.departmentName || (typeof u.department === 'string' ? u.department : '');
      const deptCode = u.department?.code || '';
      const deptId = u.department?._id || (typeof u.department === 'string' ? u.department : '');
      if (departmentFilter && deptName !== departmentFilter && deptCode !== departmentFilter && deptId !== departmentFilter) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.enrollmentNo?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.program?.toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q) ||
        deptCode.toLowerCase().includes(q)
      );
    });
  }, [users, departmentFilter, searchQuery]);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            User <span className="gradient-text">Directory</span>
          </h2>
          <p className="text-secondary mb-0">
            Manage students, faculty credentials, and academic departments.
          </p>
        </div>
        <button
          className="btn btn-pmes-primary"
          onClick={handleOpenCreateFaculty}
          id="btn-open-create-faculty"
        >
          <i className="bi bi-person-plus-fill me-1"></i> Add Faculty Member
        </button>
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

      {/* Filter and Search Bar */}
      <div className="pmes-card mb-4 p-3">
        <div className="row g-3 align-items-center">
          {/* Search box */}
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, enrollment, ID..."
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

          {/* Department Filter */}
          <div className="col-12 col-md-4">
            <select
              className="form-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments & Schools</option>
              {departments.length > 0 ? (
                departments.map((d) => (
                  <option key={d._id} value={d.name}>{d.name} ({d.code})</option>
                ))
              ) : (
                CPU_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))
              )}
            </select>
          </div>

          {/* Role Filter Pills */}
          <div className="col-12 col-md-3">
            <div className="d-flex align-items-center gap-1 justify-content-md-end">
              <button
                className={`btn btn-sm ${roleFilter === '' ? 'btn-pmes-primary' : 'btn-pmes-secondary'}`}
                onClick={() => setRoleFilter('')}
              >
                All
              </button>
              <button
                className={`btn btn-sm ${roleFilter === 'student' ? 'btn-pmes-primary' : 'btn-pmes-secondary'}`}
                onClick={() => setRoleFilter('student')}
              >
                Students
              </button>
              <button
                className={`btn btn-sm ${roleFilter === 'faculty' ? 'btn-pmes-primary' : 'btn-pmes-secondary'}`}
                onClick={() => setRoleFilter('faculty')}
              >
                Faculty
              </button>
              <button
                className={`btn btn-sm ${roleFilter === 'admin' ? 'btn-pmes-primary' : 'btn-pmes-secondary'}`}
                onClick={() => setRoleFilter('admin')}
              >
                Admins
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="pmes-card">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <div className="text-muted mt-2">Loading user directory...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-people display-4 d-block mb-2 text-muted"></i>
            No users match the selected criteria.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="pmes-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Academic Classification</th>
                  <th>Department / School</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="fw-bold text-dark">{u.name}</div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        {u.email}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {u.role === 'student' && u.enrollmentNo && `Enrollment: #${u.enrollmentNo}`}
                        {u.role === 'faculty' && u.employeeId && `Employee ID: #${u.employeeId}`}
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.role === 'student' ? (
                        <div className="d-flex flex-wrap gap-1 align-items-center">
                          {u.program && <span className="program-badge">{u.program}</span>}
                          {u.semester && <span className="semester-badge">Sem {u.semester}</span>}
                          {u.section && (
                            <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                              Sec {u.section}
                            </span>
                          )}
                          {u.batch && (
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                              ({u.batch})
                            </span>
                          )}
                          {!u.program && <span className="text-muted">—</span>}
                        </div>
                      ) : u.role === 'faculty' ? (
                        <div>
                          <div className="fw-semibold text-dark" style={{ fontSize: '0.82rem' }}>
                            {u.designation || 'Faculty Member'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">System Administrator</span>
                      )}
                    </td>
                    <td>
                      <span className="dept-badge" title={u.department?.name || u.departmentName || 'Department'}>
                        <i className="bi bi-building"></i>
                        {u.department?.name || u.departmentName || (typeof u.department === 'string' ? u.department : '—')}
                        {u.department?.code ? ` (${u.department.code})` : ''}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.72rem' }}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="text-end">
                      {u._id !== currentUser?._id && (
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleOpenEditUser(u)}
                            title="Edit User Details"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => setResetModalData({ user: u, newPassword: '' })}
                            title="Reset user temporary password"
                          >
                            <i className="bi bi-key"></i>
                          </button>
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            onClick={() => handleToggleStatus(u)}
                            title={u.isActive ? 'Deactivate user access' : 'Activate user access'}
                          >
                            <i className={`bi ${u.isActive ? 'bi-person-slash' : 'bi-person-check'}`}></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTargetUser(u)}
                            title="Delete user"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Styled Delete Confirmation Modal */}
      {deleteTargetUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content pmes-card border-0">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>Confirm User Deletion
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteTargetUser(null)}
                ></button>
              </div>
              <div className="modal-body py-3">
                <p className="mb-2">
                  Are you sure you want to permanently delete user <strong className="text-dark">{deleteTargetUser.name}</strong> ({deleteTargetUser.email})?
                </p>
                <div className="alert alert-warning py-2 mb-0" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-info-circle me-1"></i> If this user is linked to active projects or evaluations, deletion may be restricted to preserve academic audit logs.
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-pmes-secondary"
                  onClick={() => setDeleteTargetUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-pmes-danger"
                  onClick={confirmDeleteUser}
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Faculty Modal */}
      {showAddFacultyModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content pmes-card border-0">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-person-plus-fill me-2 text-primary"></i>Create Faculty Account
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddFacultyModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateFaculty}>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-md-6 mb-3 mb-md-0">
                      <label className="form-label">Faculty Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Dr. R. K. Sharma"
                        value={facultyForm.name}
                        onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                        required
                        id="input-faculty-name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label d-flex justify-content-between align-items-center">
                        <span>Employee ID</span>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.7rem' }}>
                          <i className="bi bi-magic me-1"></i>Auto-generated
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-control bg-light font-monospace fw-semibold"
                        placeholder="Auto-generating next ID..."
                        value={facultyForm.employeeId}
                        readOnly
                        disabled
                        id="input-faculty-empid"
                      />
                      <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                        <i className="bi bi-info-circle me-1"></i>Next sequential ID automatically assigned from database.
                      </div>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6 mb-3 mb-md-0">
                      <label className="form-label">University Email</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="e.g. professor@example.com"
                        value={facultyForm.email}
                        onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                        required
                        id="input-faculty-email"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Contact / Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="+91 98765 43210"
                        value={facultyForm.phone}
                        onChange={(e) => setFacultyForm({ ...facultyForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6 mb-3 mb-md-0">
                      <label className="form-label">Department / School</label>
                      <select
                        className="form-select"
                        value={facultyForm.department}
                        onChange={(e) => setFacultyForm({ ...facultyForm, department: e.target.value })}
                        required
                      >
                        <option value="">-- Select Department --</option>
                        {departments.length > 0 ? (
                          departments.map((dept) => (
                            <option key={dept._id} value={dept._id}>
                              {dept.name} ({dept.code}) - {dept.totalSemesters} Semesters
                            </option>
                          ))
                        ) : (
                          CPU_DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Academic Designation</label>
                      <select
                        className="form-select"
                        value={facultyForm.designation}
                        onChange={(e) => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                        required
                      >
                        {FACULTY_DESIGNATIONS.map((desig) => (
                          <option key={desig} value={desig}>{desig}</option>
                        ))}
                      </select>
                    </div>
                  </div>



                  <div className="mb-3">
                    <label className="form-label">Temporary Initial Password</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={facultyForm.password}
                      onChange={(e) => setFacultyForm({ ...facultyForm, password: e.target.value })}
                      required
                      id="input-faculty-password"
                    />
                    <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                      Faculty will use this temporary password on initial login. Minimum 8 characters.
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-pmes-secondary"
                    onClick={() => setShowAddFacultyModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-pmes-primary"
                    disabled={creating}
                    id="btn-submit-create-faculty"
                  >
                    {creating ? 'Creating Faculty...' : 'Create Faculty Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalData && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content pmes-card border-0">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">
                  <i className="bi bi-key-fill text-warning me-2"></i>Reset User Password
                </h5>
                <button type="button" className="btn-close" onClick={() => setResetModalData(null)}></button>
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body py-3">
                  <p className="mb-2">
                    Reset temporary password for <strong>{resetModalData.user.name}</strong> ({resetModalData.user.email}):
                  </p>
                  <label className="form-label">New Temporary Password</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    value={resetModalData.newPassword}
                    onChange={(e) => setResetModalData({ ...resetModalData, newPassword: e.target.value })}
                    required
                    minLength="8"
                  />
                  <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                    User will be required to change this password upon their next login.
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-pmes-secondary" onClick={() => setResetModalData(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-pmes-primary">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-pencil-square text-primary me-2"></i>
                  Edit {editingUser.role === 'faculty' ? 'Faculty Member' : 'User'}: {editingUser.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingUser(null)}></button>
              </div>

              <form onSubmit={handleUpdateUser}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={editUserForm.email}
                        onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        {editingUser.role === 'faculty' ? 'Employee ID' : 'ID / Enrollment'}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editUserForm.employeeId}
                        onChange={(e) => setEditUserForm({ ...editUserForm, employeeId: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Department
                    </label>
                    <select
                      className="form-select"
                      value={editUserForm.department}
                      onChange={(e) => setEditUserForm({ ...editUserForm, department: e.target.value })}
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  {editingUser.role === 'faculty' && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Designation</label>
                      <select
                        className="form-select"
                        value={editUserForm.designation}
                        onChange={(e) => setEditUserForm({ ...editUserForm, designation: e.target.value })}
                      >
                        <option value="HOD">HOD</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Professor">Professor</option>
                        <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                        <option value="Dean">Dean</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingUser(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3" disabled={updatingUser}>
                    {updatingUser ? 'Saving...' : 'Save Changes'}
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

export default AdminUsers;
