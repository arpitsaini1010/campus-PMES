import React, { useState, useEffect } from 'react';
import { adminAPI, departmentAPI } from '../api';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // View Mode: 'directory' or 'register'
  const [viewMode, setViewMode] = useState('directory');

  // Register Student Form State
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formGender, setFormGender] = useState('Male');
  const [formAddress, setFormAddress] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formAdmissionDate, setFormAdmissionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDept, setFormDept] = useState('');
  const [formSem, setFormSem] = useState(1);
  const [formEnroll, setFormEnroll] = useState('');
  const [formPersonalEmail, setFormPersonalEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [createdStudentCredentials, setCreatedStudentCredentials] = useState(null);

  // CSV Import Modal State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Semester Promotion Modal State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteDept, setPromoteDept] = useState('');
  const [promoteSem, setPromoteSem] = useState(1);
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState(null);

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editAddress, setEditAddress] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editAdmissionDate, setEditAdmissionDate] = useState('');
  const [editPersonalEmail, setEditPersonalEmail] = useState('');
  const [editUniEmail, setEditUniEmail] = useState('');
  const [editEnroll, setEditEnroll] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editSemValue, setEditSemValue] = useState(1);
  const [savingStudent, setSavingStudent] = useState(false);

  // Delete Student State
  const [deleteTargetStudent, setDeleteTargetStudent] = useState(null);

  // Reset Password State
  const [resetModalData, setResetModalData] = useState(null);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const [stuRes, deptRes] = await Promise.all([
        adminAPI.getStudents(),
        departmentAPI.getAll()
      ]);
      setStudents(stuRes.data.students || []);
      setDepartments(deptRes.data.departments || []);
      if (deptRes.data.departments?.length > 0) {
        setFormDept(deptRes.data.departments[0]._id);
        setPromoteDept(deptRes.data.departments[0]._id);
      }
    } catch (err) {
      setError('Error loading students catalogue.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const params = {};
      if (filterDept) params.department = filterDept;
      if (filterSem) params.semester = filterSem;
      const res = await adminAPI.getStudents(params);
      setStudents(res.data.students || []);
    } catch (err) {
      setError('Error refreshing students list.');
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [filterDept, filterSem]);

  const handleOpenAddStudent = async () => {
    setViewMode('register');
    setCreatedStudentCredentials(null);
    setFormFirstName('');
    setFormLastName('');
    setFormGender('Male');
    setFormAddress('');
    setFormDob('');
    setFormAdmissionDate(new Date().toISOString().split('T')[0]);
    setFormPersonalEmail('');
    setFormPassword('');
    setShowPasswordText(false);
    setFormEnroll('Fetching next ID...');

    try {
      const res = await adminAPI.getNextId('student');
      if (res.data?.nextId) {
        setFormEnroll(res.data.nextId);
      }
    } catch (err) {
      console.warn('Could not auto-fetch student ID, will be generated upon save:', err);
      setFormEnroll('K26001');
    }
  };

  const handleFirstNameChange = (val) => {
    setFormFirstName(val);
    const clean = val.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean) {
      setFormPassword(`${clean}@12345`);
    } else {
      setFormPassword('');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSubmittingAdd(true);
    setError('');
    setSuccess('');

    try {
      const res = await adminAPI.createStudent({
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
        gender: formGender,
        address: formAddress.trim(),
        dob: formDob || null,
        admissionDate: formAdmissionDate || new Date().toISOString().split('T')[0],
        personalEmail: formPersonalEmail.trim(),
        enrollmentNo: formEnroll.startsWith('Fetching') ? '' : formEnroll.trim(),
        department: formDept,
        semester: Number(formSem),
        password: formPassword
      });

      const registeredUser = res.data.user || {};
      const deptName = departments.find(d => d._id === formDept)?.name || registeredUser.departmentName || '';

      setSuccess(res.data.message || `Student ${formFirstName} ${formLastName} registered successfully.`);
      setCreatedStudentCredentials({
        name: `${formFirstName.trim()} ${formLastName.trim()}`.trim(),
        enrollmentNo: registeredUser.enrollmentNo || formEnroll,
        personalEmail: formPersonalEmail.trim(),
        temporaryPassword: formPassword,
        department: deptName
      });
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Error registering student.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenEditStudent = (s) => {
    setEditingStudent(s);
    setEditFirstName(s.firstName || s.name?.split(' ')[0] || '');
    setEditLastName(s.lastName || s.name?.split(' ').slice(1).join(' ') || '');
    setEditGender(s.gender || 'Male');
    setEditAddress(s.address || '');
    setEditDob(s.dob ? new Date(s.dob).toISOString().split('T')[0] : '');
    setEditAdmissionDate(s.admissionDate ? new Date(s.admissionDate).toISOString().split('T')[0] : '');
    setEditPersonalEmail(s.personalEmail || s.email || '');
    setEditEnroll(s.enrollmentNo || '');
    setEditDept(s.department?._id || s.department || '');
    setEditSemValue(s.semester || 1);
  };

  const handleSaveStudentEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingStudent(true);
    setError('');
    setSuccess('');

    try {
      await adminAPI.updateUser(editingStudent._id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        name: `${editFirstName.trim()} ${editLastName.trim()}`.trim(),
        gender: editGender,
        address: editAddress.trim(),
        dob: editDob || null,
        admissionDate: editAdmissionDate || null,
        personalEmail: editPersonalEmail.trim(),
        email: editPersonalEmail.trim(),
        enrollmentNo: editEnroll.trim(),
        department: editDept,
        semester: Number(editSemValue)
      });

      setSuccess(`Student record for ${editFirstName} ${editLastName} updated successfully.`);
      setEditingStudent(null);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating student record.');
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = (s) => {
    setDeleteTargetStudent(s);
  };

  const confirmDeleteStudent = async () => {
    if (!deleteTargetStudent) return;
    try {
      await adminAPI.deleteUser(deleteTargetStudent._id);
      setSuccess(`Student ${deleteTargetStudent.name} (${deleteTargetStudent.enrollmentNo}) deleted successfully.`);
      setDeleteTargetStudent(null);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting student.');
    }
  };

  const handleToggleActive = async (s) => {
    try {
      await adminAPI.toggleUserActive(s._id, !s.isActive);
      setSuccess(`Student ${s.name} ${!s.isActive ? 'activated' : 'deactivated'} successfully.`);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating student status.');
    }
  };

  const handleResetPassword = async (s) => {
    const tempPass = `${(s.firstName || s.name.split(' ')[0] || 'student').toLowerCase()}@12345`;
    try {
      await adminAPI.resetPassword(s._id, tempPass);
      setResetModalData({ student: s, tempPass });
    } catch (err) {
      setError(err.response?.data?.message || 'Error resetting password.');
    }
  };

  const handlePromoteCohort = async (e) => {
    e.preventDefault();
    setPromoting(true);
    setPromoteResult(null);
    setError('');

    try {
      const res = await adminAPI.promoteStudents({
        department: promoteDept,
        currentSemester: Number(promoteSem)
      });
      setPromoteResult(res.data);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Error executing cohort promotion.');
    } finally {
      setPromoting(false);
    }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    setImporting(true);
    setImportResult(null);
    setError('');

    try {
      const res = await adminAPI.importStudentsCSV(csvContent);
      setImportResult(res.data.results);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Error parsing and importing CSV.');
    } finally {
      setImporting(false);
    }
  };

  // Dynamic semester options
  const filterDeptObj = departments.find(d => d._id === filterDept);
  const filterMaxSem = filterDeptObj?.totalSemesters || 12;
  const filterSemesterOptions = Array.from({ length: filterMaxSem }, (_, i) => i + 1);

  const newDeptObj = departments.find(d => d._id === formDept);
  const newMaxSem = newDeptObj?.totalSemesters || 6;
  const newSemesterOptions = Array.from({ length: newMaxSem }, (_, i) => i + 1);

  const promoteDeptObj = departments.find(d => d._id === promoteDept);
  const promoteMaxSem = Math.max(1, (promoteDeptObj?.totalSemesters || 6) - 1);
  const promoteSemesterOptions = Array.from({ length: promoteMaxSem }, (_, i) => i + 1);

  const editDeptObj = departments.find(d => d._id === editDept);
  const editMaxSem = editDeptObj?.totalSemesters || 6;
  const editSemesterOptions = Array.from({ length: editMaxSem }, (_, i) => i + 1);

  // Search filter
  const displayedStudents = students.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.enrollmentNo?.toLowerCase().includes(q) ||
      s.personalEmail?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.department?.name?.toLowerCase().includes(q) ||
      s.department?.code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container py-4">
      {viewMode === 'register' ? (
        /* REGISTER STUDENT VIEW — Matches ERP Master Design */
        <div className="mb-5">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
            <div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 mb-2"
                onClick={() => { setViewMode('directory'); setCreatedStudentCredentials(null); }}
              >
                <i className="bi bi-arrow-left"></i> Back to Student Directory
              </button>
              <h2 className="fw-bold text-dark mb-1">
                Register New <span className="gradient-text">Student</span>
              </h2>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 mb-3 d-flex justify-content-between align-items-center" style={{ fontSize: '0.85rem' }}>
              <span><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</span>
              <button className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success py-2 mb-3 d-flex justify-content-between align-items-center" style={{ fontSize: '0.85rem' }}>
              <span><i className="bi bi-check-circle-fill me-2"></i>{success}</span>
              <button className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}

          <div className="student-register-card">
            {createdStudentCredentials ? (
              <div className="text-center py-4">
                <div className="d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle mb-3" style={{ width: '64px', height: '64px' }}>
                  <i className="bi bi-check2 fs-1"></i>
                </div>
                <h4 className="fw-bold text-dark mb-1">Student Registered Successfully!</h4>
                <p className="text-secondary mb-4" style={{ fontSize: '0.9rem' }}>
                  Student profile & credentials created in institution master record.
                </p>

                <div className="p-4 bg-light rounded-4 border text-start mx-auto mb-4" style={{ maxWidth: '520px' }}>
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted" style={{ fontSize: '0.88rem' }}>Student Name</span>
                    <span className="fw-semibold text-dark">{createdStudentCredentials.name}</span>
                  </div>
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted" style={{ fontSize: '0.88rem' }}>Enrollment No</span>
                    <span className="font-monospace fw-bold text-primary">{createdStudentCredentials.enrollmentNo}</span>
                  </div>
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted" style={{ fontSize: '0.88rem' }}>Course</span>
                    <span className="fw-medium text-dark">{createdStudentCredentials.department}</span>
                  </div>
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted" style={{ fontSize: '0.88rem' }}>Email Address</span>
                    <span className="fw-medium text-dark">{createdStudentCredentials.personalEmail}</span>
                  </div>
                  <div className="d-flex justify-content-between py-2">
                    <span className="text-muted" style={{ fontSize: '0.88rem' }}>Temporary Password</span>
                    <span className="font-monospace fw-bold text-dark">{createdStudentCredentials.temporaryPassword}</span>
                  </div>
                </div>

                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <button
                    className="btn btn-outline-primary d-flex align-items-center gap-2"
                    onClick={() => {
                      const text = `Campus PMES Credentials\nStudent: ${createdStudentCredentials.name}\nEnrollment No: ${createdStudentCredentials.enrollmentNo}\nEmail: ${createdStudentCredentials.personalEmail}\nTemporary Password: ${createdStudentCredentials.temporaryPassword}`;
                      navigator.clipboard.writeText(text);
                      setSuccess('Student credentials copied to clipboard!');
                    }}
                  >
                    <i className="bi bi-copy"></i> Copy Credentials
                  </button>
                  <button
                    className="btn btn-pmes-primary"
                    onClick={() => {
                      setCreatedStudentCredentials(null);
                      handleOpenAddStudent();
                    }}
                  >
                    <i className="bi bi-person-plus-fill me-1"></i> Register Another
                  </button>
                  <button
                    className="btn btn-pmes-secondary"
                    onClick={() => {
                      setCreatedStudentCredentials(null);
                      setViewMode('directory');
                    }}
                  >
                    View in Directory
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddStudent}>
                {/* Personal Details */}
                <div className="mb-4">
                  <h5 className="student-section-title">Personal Details</h5>

                  {/* Gender */}
                  <div className="mb-4">
                    <label className="student-form-label">Gender</label>
                    <div className="d-flex align-items-center gap-4">
                      {['Male', 'Female', 'Other'].map(g => (
                        <label key={g} className="student-gender-radio">
                          <input
                            type="radio"
                            name="studentGender"
                            value={g}
                            checked={formGender === g}
                            onChange={(e) => setFormGender(e.target.value)}
                          />
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* First Name & Last Name */}
                  <div className="row g-4 mb-4">
                    <div className="col-md-6">
                      <label className="student-form-label">First Name</label>
                      <input
                        type="text"
                        className="student-form-input w-100"
                        placeholder="Amenda"
                        value={formFirstName}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="student-form-label">Last Name</label>
                      <input
                        type="text"
                        className="student-form-input w-100"
                        placeholder="Perera"
                        value={formLastName}
                        onChange={(e) => setFormLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Address & Date of Birth */}
                  <div className="row g-4">
                    <div className="col-md-6">
                      <label className="student-form-label">Address</label>
                      <input
                        type="text"
                        className="student-form-input w-100"
                        placeholder="3606 Parker Rd"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="student-form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="student-form-input w-100"
                        value={formDob}
                        onChange={(e) => setFormDob(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Details */}
                <div className="mb-4 pt-3">
                  <h5 className="student-section-title">Academic Details</h5>

                  {/* Class & Admission Date */}
                  <div className="row g-4 mb-4">
                    <div className="col-md-6">
                      <label className="student-form-label">Class</label>
                      <select
                        className="student-form-select w-100"
                        value={formDept}
                        onChange={(e) => {
                          const deptId = e.target.value;
                          setFormDept(deptId);
                          const deptObj = departments.find(d => d._id === deptId);
                          const maxS = deptObj?.totalSemesters || 6;
                          if (formSem > maxS) setFormSem(1);
                        }}
                        required
                      >
                        <option value="" disabled>Select</option>
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="student-form-label">Admission Date</label>
                      <input
                        type="date"
                        className="student-form-input w-100"
                        value={formAdmissionDate}
                        onChange={(e) => setFormAdmissionDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Semester & Student Enrollment Number (Primary Key) */}
                  <div className="row g-4">
                    <div className="col-md-6">
                      <label className="student-form-label">Semester</label>
                      <select
                        className="student-form-select w-100"
                        value={formSem}
                        onChange={(e) => setFormSem(Number(e.target.value))}
                        required
                      >
                        {newSemesterOptions.map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="student-form-label">
                        Student Enrollment Number
                      </label>
                      <div className="position-relative">
                        <input
                          type="text"
                          className="student-form-input w-100 font-monospace fw-bold text-primary pe-5"
                          value={formEnroll}
                          readOnly
                          title="Auto-generated"
                        />
                        <span className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted" style={{ fontSize: '0.8rem' }}>
                          <i className="bi bi-shield-lock"></i> Auto-assigned
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account & Login Details */}
                <div className="mb-4 pt-3">
                  <h5 className="student-section-title">Communication & Account Access</h5>

                  {/* Email Address */}
                  <div className="row g-4 mb-4">
                    <div className="col-12">
                      <label className="student-form-label">Email Address</label>
                      <input
                        type="email"
                        className="student-form-input w-100"
                        placeholder="student@example.com"
                        value={formPersonalEmail}
                        onChange={(e) => setFormPersonalEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Temporary Password */}
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="student-form-label mb-0">Temporary Password</label>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none text-muted"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => {
                            const clean = formFirstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                            setFormPassword(clean ? `${clean}@12345` : '');
                          }}
                        >
                          <i className="bi bi-arrow-repeat me-1"></i>Reset
                        </button>
                      </div>
                      <div className="position-relative">
                        <input
                          type={showPasswordText ? "text" : "password"}
                          className="student-form-input w-100 font-monospace fw-bold text-primary pe-5"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          minLength={8}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-link position-absolute end-0 top-50 translate-middle-y me-2 text-secondary p-1"
                          onClick={() => setShowPasswordText(!showPasswordText)}
                          tabIndex="-1"
                        >
                          <i className={`bi ${showPasswordText ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="d-flex justify-content-end gap-3 pt-3 border-top mt-4">
                  <button
                    type="button"
                    className="btn btn-pmes-secondary px-4 py-2"
                    onClick={() => setViewMode('directory')}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-pmes-primary px-4 py-2"
                    disabled={submittingAdd}
                  >
                    {submittingAdd ? 'Registering...' : 'Register Student'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* STUDENTS DIRECTORY VIEW */
        <>
          {/* Header & Quick Action Buttons */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
            <div>
              <h2 className="fw-bold text-dark mb-1">
                Student <span className="gradient-text">Administration</span>
              </h2>
              <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
                Register students, manage academic semesters, and allocate university emails.
              </p>
            </div>

            <div className="d-flex gap-2 flex-wrap">
              <button
                onClick={() => setShowPromoteModal(true)}
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
              >
                <i className="bi bi-arrow-up-circle"></i> Promote Cohort
              </button>
              <button
                onClick={() => { setShowCsvModal(true); setImportResult(null); }}
                className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
              >
                <i className="bi bi-file-earmark-spreadsheet"></i> Bulk Import CSV
              </button>
              <button
                onClick={handleOpenAddStudent}
                className="btn btn-sm btn-pmes-primary d-flex align-items-center gap-1"
              >
                <i className="bi bi-person-plus-fill"></i> Register Student
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 mb-3 d-flex justify-content-between align-items-center" style={{ fontSize: '0.85rem' }}>
              <span><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</span>
              <button className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success py-2 mb-3 d-flex justify-content-between align-items-center" style={{ fontSize: '0.85rem' }}>
              <span><i className="bi bi-check-circle-fill me-2"></i>{success}</span>
              <button className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}

          {/* Filter & Instant Search Toolbar */}
          <div className="pmes-card p-3 mb-4 shadow-sm bg-light border">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-4">
                <select
                  className="form-select form-select-sm"
                  value={filterDept}
                  onChange={(e) => {
                    const deptId = e.target.value;
                    setFilterDept(deptId);
                    setError('');
                    if (deptId) {
                      const dept = departments.find(d => d._id === deptId);
                      if (dept && filterSem && Number(filterSem) > dept.totalSemesters) {
                        setFilterSem('');
                      }
                    }
                  }}
                >
                  <option value="">All Departments / Courses</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={filterSem}
                  onChange={(e) => setFilterSem(e.target.value)}
                >
                  <option value="">All Semesters</option>
                  {filterSemesterOptions.map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search by name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-2 text-md-end text-muted" style={{ fontSize: '0.8rem' }}>
                Registered: <strong>{displayedStudents.length}</strong>
              </div>
            </div>
          </div>

          {/* Students Master Table */}
          <div className="pmes-card p-3 shadow-sm">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-secondary">Loading student directory...</p>
              </div>
            ) : displayedStudents.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-people fs-1 d-block mb-2 text-secondary"></i>
                No student records found matching current criteria.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                  <thead className="table-light">
                    <tr>
                      <th>Enrollment No</th>
                      <th>Student Profile</th>
                      <th>Course & Semester</th>
                      <th>Email Address</th>
                      <th>Admission Date</th>
                      <th>Temporary Password</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStudents.map(s => (
                      <tr key={s._id}>
                        <td>
                          <span className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                            {s.enrollmentNo}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">{s.name}</div>
                          <div className="text-muted d-flex gap-2 align-items-center" style={{ fontSize: '0.75rem' }}>
                            <span>{s.gender || 'Male'}</span>
                            {s.dob && <span>• DOB: {new Date(s.dob).toLocaleDateString()}</span>}
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium text-dark">{s.department?.name || s.departmentName || '—'}</div>
                          <span className="semester-badge mt-1 d-inline-block">
                            Semester {s.semester || '—'}
                          </span>
                        </td>
                        <td>
                          <a href={`mailto:${s.email || s.personalEmail}`} className="text-decoration-none text-dark">
                            <i className="bi bi-envelope me-1 text-primary"></i>{s.email || s.personalEmail || '—'}
                          </a>
                        </td>
                        <td>
                          <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                            {s.admissionDate ? new Date(s.admissionDate).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td>
                          {s.mustChangePassword ? (
                            <div className="d-flex align-items-center gap-1">
                              <code className="text-primary fw-bold px-2 py-1 bg-light border rounded font-monospace" style={{ fontSize: '0.78rem' }}>
                                {s.temporaryPassword || `${(s.firstName || s.name.split(' ')[0] || 'student').toLowerCase()}@12345`}
                              </code>
                              <button
                                type="button"
                                className="btn btn-xs btn-outline-secondary py-0 px-1"
                                style={{ fontSize: '0.7rem' }}
                                onClick={() => {
                                  const pass = s.temporaryPassword || `${(s.firstName || s.name.split(' ')[0] || 'student').toLowerCase()}@12345`;
                                  navigator.clipboard.writeText(pass);
                                  setSuccess(`Copied temporary password (${pass}) for ${s.name}`);
                                }}
                                title="Copy Temporary Password"
                              >
                                <i className="bi bi-copy"></i>
                              </button>
                            </div>
                          ) : (
                            <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-shield-check me-1"></i>Private Set
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${s.isActive ? 'bg-success' : 'bg-danger'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button
                              onClick={() => handleOpenEditStudent(s)}
                              className="btn btn-sm btn-outline-primary px-2 py-1"
                              style={{ borderRadius: '6px' }}
                              title="Edit Student Profile"
                            >
                              <i className="bi bi-pencil me-1"></i> Edit
                            </button>
                            <button
                              onClick={() => handleResetPassword(s)}
                              className="btn btn-sm btn-outline-warning text-dark px-2 py-1"
                              style={{ borderRadius: '6px' }}
                              title="Reset Password"
                            >
                              <i className="bi bi-key"></i>
                            </button>
                            <button
                              onClick={() => handleToggleActive(s)}
                              className={`btn btn-sm ${s.isActive ? 'btn-outline-secondary' : 'btn-outline-success'} px-2 py-1`}
                              style={{ borderRadius: '6px' }}
                              title={s.isActive ? 'Deactivate' : 'Activate'}
                            >
                              <i className={`bi ${s.isActive ? 'bi-person-slash' : 'bi-person-check'}`}></i>
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(s)}
                              className="btn btn-sm btn-outline-danger px-2 py-1"
                              style={{ borderRadius: '6px' }}
                              title="Delete Student"
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
        </>
      )}



      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  Bulk Import Students via CSV
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowCsvModal(false)}></button>
              </div>

              <form onSubmit={handleCsvImport}>
                <div className="modal-body p-4">
                  <div className="alert alert-light border mb-3" style={{ fontSize: '0.8rem' }}>
                    <strong>Expected CSV Header:</strong>
                    <code>name,email,enrollmentNo,department,semester</code><br />
                    <em>Example:</em><br />
                    <code>Rahul Sen,rahul@example.com,K26001,BCA,1</code><br />
                    <code>Pooja Das,pooja@example.com,K26002,BTECH,1</code>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Paste CSV Content
                    </label>
                    <textarea
                      className="form-control font-monospace"
                      rows="8"
                      placeholder="name,email,enrollmentNo,department,semester&#10;Student Name,student@example.com,K26001,BCA,1"
                      value={csvContent}
                      onChange={(e) => setCsvContent(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {importResult && (
                    <div className="p-3 bg-light rounded border" style={{ fontSize: '0.82rem' }}>
                      <div className="text-success fw-bold mb-1">
                        ✓ Successfully created {importResult.created} student account(s).
                      </div>
                      {importResult.errors.length > 0 && (
                        <div className="text-danger">
                          <strong>Skipped {importResult.errors.length} invalid row(s):</strong>
                          <ul className="mb-0 ps-3">
                            {importResult.errors.map((err, i) => (
                              <li key={i}>Row {err.row}: {err.reason} ({err.email || ''})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowCsvModal(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-sm btn-success px-3" disabled={importing}>
                    {importing ? 'Processing CSV...' : 'Process & Import Students'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Promotion Modal */}
      {showPromoteModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  Promote Semester Cohort
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowPromoteModal(false)}></button>
              </div>

              <form onSubmit={handlePromoteCohort}>
                <div className="modal-body p-4">
                  <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                    Promotes all active students of a department and current semester to the next semester in a single transaction (and bulk notifies them).
                  </p>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Department *</label>
                    <select
                      className="form-select"
                      value={promoteDept}
                      onChange={(e) => {
                        const deptId = e.target.value;
                        setPromoteDept(deptId);
                        setPromoteSem(1);
                      }}
                      required
                    >
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name} (Max {d.totalSemesters || 6} Semesters)</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>Current Semester to Promote *</label>
                    <select
                      className="form-select"
                      value={promoteSem}
                      onChange={(e) => setPromoteSem(Number(e.target.value))}
                      required
                    >
                      {promoteSemesterOptions.map(s => (
                        <option key={s} value={s}>Semester {s} → Semester {s + 1}</option>
                      ))}
                    </select>
                    <div className="form-text" style={{ fontSize: '0.75rem' }}>
                      Final semester students cannot be promoted (they graduate).
                    </div>
                  </div>

                  {promoteResult && (
                    <div className="alert alert-success py-2 mb-0" style={{ fontSize: '0.82rem' }}>
                      {promoteResult.message}
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowPromoteModal(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3" disabled={promoting}>
                    {promoting ? 'Promoting Cohort...' : 'Execute Promotion'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Profile Modal */}
      {editingStudent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light px-4 py-3">
                <h5 className="modal-title fw-bold text-dark mb-0" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-pencil-square text-primary me-2"></i>
                  Edit Student: {editingStudent.name} ({editingStudent.enrollmentNo})
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingStudent(null)}></button>
              </div>

              <form onSubmit={handleSaveStudentEdit}>
                <div className="modal-body p-4" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
                  
                  {/* Personal details */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="student-form-label">First Name *</label>
                      <input
                        type="text"
                        className="student-form-input w-100"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="student-form-label">Last Name *</label>
                      <input
                        type="text"
                        className="student-form-input w-100"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="student-form-label">Gender</label>
                      <select
                        className="student-form-select w-100"
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="student-form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="student-form-input w-100"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="student-form-label">Admission Date</label>
                      <input
                        type="date"
                        className="student-form-input w-100"
                        value={editAdmissionDate}
                        onChange={(e) => setEditAdmissionDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="student-form-label">Address</label>
                    <input
                      type="text"
                      className="student-form-input w-100"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    />
                  </div>

                  {/* Academic Details */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-5">
                      <label className="student-form-label">
                        Enrollment Number *
                      </label>
                      <input
                        type="text"
                        className="student-form-input w-100 font-monospace fw-bold text-primary"
                        value={editEnroll}
                        onChange={(e) => setEditEnroll(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="student-form-label">
                        Course *
                      </label>
                      <select
                        className="student-form-select w-100"
                        value={editDept}
                        onChange={(e) => {
                          const deptId = e.target.value;
                          setEditDept(deptId);
                          const deptObj = departments.find(d => d._id === deptId);
                          const maxS = deptObj?.totalSemesters || 6;
                          if (editSemValue > maxS) setEditSemValue(1);
                        }}
                        required
                      >
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="student-form-label">
                        Semester *
                      </label>
                      <select
                        className="student-form-select w-100"
                        value={editSemValue}
                        onChange={(e) => setEditSemValue(Number(e.target.value))}
                        required
                      >
                        {editSemesterOptions.map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Email field */}
                  <div className="mb-3">
                    <label className="student-form-label">Email Address *</label>
                    <input
                      type="email"
                      className="student-form-input w-100"
                      value={editPersonalEmail}
                      onChange={(e) => setEditPersonalEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-top bg-light px-4 py-3">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingStudent(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-pmes-primary px-4" disabled={savingStudent}>
                    {savingStudent ? 'Saving Changes...' : 'Save Student Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {deleteTargetStudent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-danger" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-trash-fill me-2"></i>Confirm Student Deletion
                </h5>
                <button type="button" className="btn-close" onClick={() => setDeleteTargetStudent(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="mb-2">Are you sure you want to delete student record:</p>
                <div className="p-3 bg-light rounded border mb-2">
                  <div><strong>Name:</strong> {deleteTargetStudent.name}</div>
                  <div><strong>Enrollment No:</strong> <span className="font-monospace text-primary fw-bold">#{deleteTargetStudent.enrollmentNo}</span></div>
                  <div><strong>Course:</strong> {deleteTargetStudent.department?.name || deleteTargetStudent.departmentName}</div>
                  <div><strong>Personal Email:</strong> {deleteTargetStudent.personalEmail || deleteTargetStudent.email}</div>
                </div>
                <small className="text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>This action permanently removes the student account from the system.
                </small>
              </div>
              <div className="modal-footer border-top bg-light">
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDeleteTargetStudent(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-sm btn-danger px-3" onClick={confirmDeleteStudent}>
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Password Display Modal */}
      {resetModalData && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  Password Reset Successful
                </h5>
                <button type="button" className="btn-close" onClick={() => setResetModalData(null)}></button>
              </div>

              <div className="modal-body p-4">
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                  Password for <strong>{resetModalData.student.name}</strong> has been reset. Provide this temporary password to the student:
                </p>
                <div className="p-3 bg-light rounded text-center border font-monospace fs-5 text-primary fw-bold">
                  {resetModalData.tempPass}
                </div>
                <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                  The student can sign in with their Enrollment Number (<strong>{resetModalData.student.enrollmentNo}</strong>) or email, and will be prompted to replace this with a private password upon login.
                </div>
              </div>

              <div className="modal-footer border-top bg-light">
                <button type="button" className="btn btn-sm btn-primary px-3" onClick={() => setResetModalData(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Student Registration Credentials Modal */}
      {createdStudentCredentials && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header bg-success text-white px-4 py-3 border-0 rounded-top-4">
                <h5 className="modal-title fw-bold mb-0">
                  <i className="bi bi-check-circle-fill me-2"></i>Student Registration Complete
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setCreatedStudentCredentials(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-secondary mb-3" style={{ fontSize: '0.88rem' }}>
                  Account for <strong>{createdStudentCredentials.name}</strong> is created in <strong>{createdStudentCredentials.department}</strong>.
                </p>

                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Enrollment No (PK / Login ID):</span>
                    <span className="font-monospace fw-bold text-dark fs-6">{createdStudentCredentials.enrollmentNo}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Email Address:</span>
                    <span className="fw-medium text-dark">{createdStudentCredentials.personalEmail}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Temporary Password:</span>
                    <span className="font-monospace fw-bold text-primary fs-5">{createdStudentCredentials.temporaryPassword}</span>
                  </div>
                </div>

                <div className="alert alert-info py-2 px-3 mb-0" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-info-circle-fill me-2"></i>
                  The student can immediately sign in using either their <strong>Enrollment Number</strong> or <strong>Personal Email</strong> along with this temporary password.
                </div>
              </div>
              <div className="modal-footer border-top bg-light px-4 py-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => {
                    const text = `Campus PMES Student Login Credentials:
Name: ${createdStudentCredentials.name}
Enrollment No (Login ID): ${createdStudentCredentials.enrollmentNo}
Personal Email: ${createdStudentCredentials.personalEmail}
Temporary Password: ${createdStudentCredentials.temporaryPassword}
Login Portal: http://localhost:5173/login`;
                    navigator.clipboard.writeText(text);
                    setSuccess('Credentials copied to clipboard!');
                  }}
                >
                  <i className="bi bi-clipboard-check me-1"></i>Copy Login Credentials
                </button>
                <button
                  type="button"
                  className="btn btn-pmes-primary btn-sm px-4"
                  onClick={() => setCreatedStudentCredentials(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
