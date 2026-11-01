import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subjectAPI, assignmentAPI, departmentAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const FacultyAssignments = () => {
  const { user } = useAuth();

  // Data states
  const [subjects, setSubjects] = useState([]);
  const [allocatedCourses, setAllocatedCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states (Box 1)
  const [type, setType] = useState('project'); // 'project' | 'assignment'
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter states (Box 2)
  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterSemester, setFilterSemester] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchInitialData();
    fetchAssignments();
  }, []);

  // When type changes, adjust default max marks
  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'project') {
      setMaxMarks(100);
    } else {
      setMaxMarks(25);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const res = await subjectAPI.getAll();
      const subs = res.data.subjects || [];
      setSubjects(subs);

      // Group subjects by allocated department (course)
      const courseMap = {};
      subs.forEach(s => {
        const dept = s.department;
        if (dept && dept._id) {
          if (!courseMap[dept._id]) {
            courseMap[dept._id] = {
              _id: dept._id,
              name: dept.name,
              code: dept.code,
              semesters: new Set(),
              subjects: []
            };
          }
          if (s.semester) {
            courseMap[dept._id].semesters.add(s.semester);
          }
          courseMap[dept._id].subjects.push(s);
        }
      });

      // Fallback: If faculty user has a home department but no specific subject yet
      if (Object.keys(courseMap).length === 0 && user?.department) {
        try {
          const deptRes = await departmentAPI.getAll();
          const allDepts = deptRes.data.departments || [];
          const myDept = allDepts.find(d => d._id === user.department || d.name === user.departmentName);
          if (myDept) {
            const semSet = new Set();
            for (let i = 1; i <= (myDept.totalSemesters || 6); i++) {
              semSet.add(i);
            }
            courseMap[myDept._id] = {
              _id: myDept._id,
              name: myDept.name,
              code: myDept.code,
              semesters: semSet,
              subjects: []
            };
          }
        } catch (e) {
          console.warn('Fallback department fetch failed', e);
        }
      }

      const coursesList = Object.values(courseMap).map(c => ({
        ...c,
        semesters: Array.from(c.semesters).sort((a, b) => a - b)
      }));

      setAllocatedCourses(coursesList);

      // Pre-select first course and semester if available
      if (coursesList.length > 0) {
        setSelectedCourseId(coursesList[0]._id);
        if (coursesList[0].semesters.length > 0) {
          setSelectedSemester(coursesList[0].semesters[0]);
          // Find first subject for that course and sem
          const matchedSub = coursesList[0].subjects.find(s => s.semester === coursesList[0].semesters[0]);
          if (matchedSub) setSelectedSubjectId(matchedSub._id);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Could not load your allocated courses and subjects.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setLoadingList(true);
    try {
      const res = await assignmentAPI.getAll();
      setAssignments(res.data.assignments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  // Handlers for Course & Semester dropdowns
  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
    const crs = allocatedCourses.find(c => c._id === courseId);
    if (crs && crs.semesters.length > 0) {
      setSelectedSemester(crs.semesters[0]);
      const matchedSub = crs.subjects.find(s => s.semester === crs.semesters[0]);
      setSelectedSubjectId(matchedSub ? matchedSub._id : '');
    } else {
      setSelectedSemester('');
      setSelectedSubjectId('');
    }
  };

  const handleSemesterChange = (sem) => {
    const semNum = Number(sem);
    setSelectedSemester(semNum);
    const crs = allocatedCourses.find(c => c._id === selectedCourseId);
    if (crs) {
      const matchedSub = crs.subjects.find(s => s.semester === semNum);
      setSelectedSubjectId(matchedSub ? matchedSub._id : '');
    }
  };

  const currentCourse = allocatedCourses.find(c => c._id === selectedCourseId);
  const availableSemesters = currentCourse ? currentCourse.semesters : [];
  const availableSubjects = currentCourse ? currentCourse.subjects.filter(s => s.semester === Number(selectedSemester)) : [];

  // File selection & validation
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setFileError('File size exceeds the 10 MB limit.');
        setFile(null);
        return;
      }
      const allowed = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.ppt', '.pptx', '.zip', '.txt'];
      const ext = '.' + selected.name.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) {
        setFileError('Supported file formats: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ZIP, TXT.');
        setFile(null);
        return;
      }
      setFileError('');
      setFile(selected);
    }
  };

  // Form submission (Box 1)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedCourseId || !selectedSemester) {
      setError('Please select an allocated Course and Semester.');
      return;
    }

    if (!title.trim() || !description.trim() || !dueDate || !maxMarks) {
      setError('Please fill in Title, Description, Due Date, and Maximum Marks.');
      return;
    }

    if (new Date(dueDate) <= new Date()) {
      setError('Due date must be in the future.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('departmentId', selectedCourseId);
      formData.append('semester', selectedSemester);
      if (selectedSubjectId) {
        formData.append('subjectId', selectedSubjectId);
      }
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('dueDate', dueDate);
      formData.append('maxMarks', maxMarks);
      if (file) {
        formData.append('file', file);
      }

      await assignmentAPI.post(formData);

      setSuccess(`Successfully assigned ${type === 'project' ? 'Project' : 'Assignment'}: "${title.trim()}" to ${currentCourse?.name} Semester ${selectedSemester}!`);
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setFile(null);
      if (type === 'project') setMaxMarks(100);
      else setMaxMarks(25);

      // Refresh list
      fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || 'Error assigning to students.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment/project? All related student submissions will also be deleted.')) {
      return;
    }

    setDeletingId(id);
    try {
      await assignmentAPI.delete(id);
      setSuccess('Item deleted successfully.');
      setAssignments(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting item.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered list (Box 2)
  const selectedFilterCourseObj = allocatedCourses.find(c => c._id === filterCourse);
  const getCourseDuration = (crs) => {
    if (!crs) return 6;
    const code = (crs.code || crs.name || '').toUpperCase();
    if (code.includes('BCA') || code.includes('BACHELOR OF COMPUTER')) return 6;
    if (code.includes('MCA') || code.includes('MASTER OF COMPUTER')) return 4;
    if (code.includes('BTECH') || code.includes('TECHNOLOGY')) return 8;
    return crs.totalSemesters || 6;
  };
  const maxFilterSem = selectedFilterCourseObj
    ? getCourseDuration(selectedFilterCourseObj)
    : (allocatedCourses.length === 1 ? getCourseDuration(allocatedCourses[0]) : 6);
  const filterSemestersList = Array.from({ length: maxFilterSem }, (_, i) => i + 1);

  const filteredAssignments = assignments.filter(item => {
    if (filterType !== 'ALL' && (item.type || 'assignment') !== filterType) return false;
    if (filterCourse !== 'ALL') {
      const itemDeptId = item.department?._id || item.department;
      if (itemDeptId !== filterCourse) return false;
    }
    if (filterSemester !== 'ALL') {
      if (Number(item.semester) !== Number(filterSemester)) return false;
    }
    return true;
  });

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Page Title */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-2">
        <div>
          <h2 className="fw-bold text-dark mb-1">
            <i className="bi bi-journal-plus text-primary me-2"></i>
            Projects & Assignments
          </h2>
          <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
            Assign new term projects, coursework, and practical assignments to your allocated courses and semesters.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/faculty/projects" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
            <i className="bi bi-collection-fill"></i>
            <span>Assigned Projects</span>
          </Link>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4 shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} aria-label="Close"></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show mb-4 shadow-sm" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')} aria-label="Close"></button>
        </div>
      )}

      {/* BOX 1: ASSIGN NEW PROJECT OR ASSIGNMENT */}
      <div className="pmes-card p-4 mb-5 shadow-sm" style={{ borderRadius: '20px', background: '#ffffff', position: 'relative', zIndex: 2 }}>
        <div className="d-flex flex-wrap align-items-center justify-content-between pb-3 mb-4 border-bottom gap-3">
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#191A23',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B9FF66',
                fontSize: '1.2rem',
                border: '1.5px solid #191A23'
              }}
            >
              <i className="bi bi-pencil-square"></i>
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-dark">Assign New Task to Students</h5>
              <small className="text-muted">Fill out the details below to publish directly to students' dashboards</small>
            </div>
          </div>

          {/* Type Selector Toggle (Project vs Assignment) - Separated pills, NO OVERLAPPING */}
          <div className="d-flex align-items-center gap-2" role="group">
            <button
              type="button"
              onClick={() => handleTypeChange('project')}
              className="btn btn-sm px-3 py-1.5 fw-bold"
              style={{
                borderRadius: '10px',
                border: '1.5px solid #191A23',
                background: type === 'project' ? '#191A23' : '#FFFFFF',
                color: type === 'project' ? '#B9FF66' : '#191A23',
                boxShadow: type === 'project' ? '0 3px 0 #191A23' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <i className="bi bi-folder-fill me-1"></i> Project
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('assignment')}
              className="btn btn-sm px-3 py-1.5 fw-bold"
              style={{
                borderRadius: '10px',
                border: '1.5px solid #191A23',
                background: type === 'assignment' ? '#191A23' : '#FFFFFF',
                color: type === 'assignment' ? '#B9FF66' : '#191A23',
                boxShadow: type === 'assignment' ? '0 3px 0 #191A23' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <i className="bi bi-journal-text me-1"></i> Assignment
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Loading your allocated courses...</span>
          </div>
        ) : allocatedCourses.length === 0 ? (
          <div className="alert alert-warning mb-0" style={{ fontSize: '0.9rem' }}>
            <i className="bi bi-info-circle-fill me-2"></i>
            <strong>No Courses Allocated:</strong> You do not currently have any allocated courses or subjects assigned by the administrator. Please contact your Department Head or Admin to allocate subjects to your account.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Course Selection (Allocated only) - Just BCA, MCA, BTECH */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-mortarboard me-1 text-primary"></i> Allocated Course / Department <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  required
                >
                  {allocatedCourses.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.code || 'BCA'}
                    </option>
                  ))}
                </select>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>Only courses allocated to you by admin</small>
              </div>

              {/* Semester Selection (Allocated semesters only) */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-calendar3 me-1 text-primary"></i> Allocated Semester <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedSemester}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  required
                >
                  {availableSemesters.map(sem => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>Allocated teaching semesters</small>
              </div>

              {/* Subject (Optional if multiple) */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-book me-1 text-primary"></i> Subject (Optional)
                </label>
                <select
                  className="form-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  <option value="">General / Term Coursework</option>
                  {availableSubjects.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>Link to a specific allocated subject</small>
              </div>

              {/* Title */}
              <div className="col-12 col-md-8">
                <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                  {type === 'project' ? 'Project Title' : 'Assignment Title'} <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={
                    type === 'project'
                      ? 'e.g., Campus Management System with MERN Stack'
                      : 'e.g., Unit 3: Normalization & SQL Queries Practice'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Max Marks */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                  Maximum Marks <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  className="form-control"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  required
                />
              </div>

              {/* Description / Instructions */}
              <div className="col-12">
                <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                  {type === 'project' ? 'Project Problem Statement & Requirements' : 'Assignment Questions & Instructions'} <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder={
                    type === 'project'
                      ? 'Type the project objectives, required modules, deliverables, technology stack requirements, and evaluation guidelines...'
                      : 'Type the assignment questions, problem sets, format guidelines, and instructions for students...'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              {/* Due Date & File Attachment */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-clock-history me-1 text-primary"></i> Submission Due Date & Time <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-paperclip me-1 text-primary"></i> Supporting Document (Excel, Doc, PDF, ZIP)
                </label>
                <input
                  type="file"
                  className="form-control"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.ppt,.pptx,.zip,.txt"
                  onChange={handleFileChange}
                />
                {fileError ? (
                  <div className="text-danger mt-1" style={{ fontSize: '0.78rem' }}>{fileError}</div>
                ) : (
                  <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                    Attach sample data, rubric, dataset (Excel/CSV), or PDF guidelines (Max 10 MB).
                  </small>
                )}
                {file && (
                  <div className="mt-1 badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                    <i className="bi bi-file-earmark-check text-success"></i>
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className="btn-close btn-close-xs ms-1"
                      style={{ fontSize: '0.55rem' }}
                      onClick={() => setFile(null)}
                    ></button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="col-12 pt-2 text-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary px-4 py-2 fw-semibold shadow-sm"
                  style={{ borderRadius: '8px' }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Publishing to Students...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-fill me-2"></i>
                      Assign {type === 'project' ? 'Project' : 'Assignment'} to Students
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* BOX 2: PREVIOUSLY ASSIGNED PROJECTS & ASSIGNMENTS */}
      <div className="pmes-card p-4 shadow-sm border-0" style={{ borderRadius: '16px', background: '#ffffff' }}>
        <div className="d-flex flex-wrap align-items-center justify-content-between pb-3 mb-3 border-bottom gap-3">
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                fontSize: '1.1rem'
              }}
            >
              <i className="bi bi-clock-history"></i>
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-dark">Previously Assigned Tasks</h5>
              <small className="text-muted">Track all projects and assignments published to your students</small>
            </div>
          </div>

          {/* Filter Controls Toolbar */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Filter by Type */}
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', fontSize: '0.8rem' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="project">Projects Only</option>
              <option value="assignment">Assignments Only</option>
            </select>

            {/* Filter by Course - Just BCA / MCA / BTECH */}
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', fontSize: '0.8rem' }}
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
            >
              <option value="ALL">All Courses</option>
              {allocatedCourses.map(c => (
                <option key={c._id} value={c._id}>{c.code || c.name}</option>
              ))}
            </select>

            {/* Filter by Semester - DYNAMIC (BCA: 6, MCA: 4, BTECH: 8) */}
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', fontSize: '0.8rem' }}
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
            >
              <option value="ALL">All Semesters</option>
              {filterSemestersList.map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>

            <button
              onClick={fetchAssignments}
              className="btn btn-sm btn-outline-secondary"
              title="Refresh list"
              style={{ fontSize: '0.8rem' }}
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        {/* List of Previous Assignments */}
        {loadingList ? (
          <div className="text-center py-5">
            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
            <span className="text-secondary" style={{ fontSize: '0.88rem' }}>Loading assigned tasks...</span>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50"></i>
            <h6 className="fw-semibold">No assigned tasks found</h6>
            <p className="mb-0" style={{ fontSize: '0.82rem' }}>
              {assignments.length === 0
                ? 'You have not assigned any projects or assignments yet. Use the form above to assign your first task.'
                : 'No tasks match the selected filter criteria. Try changing the Course, Semester, or Type filters.'}
            </p>
          </div>
        ) : (
          <div className="row g-3">
            {filteredAssignments.map((item) => {
              const isProject = item.type === 'project';
              const isOverdue = new Date() > new Date(item.dueDate);
              const downloadUrl = item.file?.name ? assignmentAPI.downloadAttachmentUrl(item._id) : null;

              return (
                <div key={item._id} className="col-12 col-lg-6">
                  <div
                    className="p-3 h-100 rounded-3 border bg-light d-flex flex-column justify-content-between shadow-sm"
                    style={{ background: '#f8fafc' }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="d-flex flex-wrap align-items-center justify-content-between mb-2 gap-1">
                        <div className="d-flex align-items-center gap-1">
                          {isProject ? (
                            <span className="badge" style={{ background: '#7c3aed', color: '#fff' }}>
                              <i className="bi bi-folder-fill me-1"></i> Project
                            </span>
                          ) : (
                            <span className="badge bg-primary">
                              <i className="bi bi-journal-text me-1"></i> Assignment
                            </span>
                          )}

                          <span className="badge bg-secondary-subtle text-dark border">
                            {item.department?.code || item.department?.name || 'Dept'} &bull; Sem {item.semester}
                          </span>

                          {item.subject?.code && (
                            <span className="badge bg-light text-secondary border">
                              {item.subject.code}
                            </span>
                          )}
                        </div>

                        <span className="badge bg-light text-dark border">
                          Max: {item.maxMarks} Marks
                        </span>
                      </div>

                      {/* Title */}
                      <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '0.98rem' }}>
                        {item.title}
                      </h6>

                      {/* Description */}
                      <p
                        className="text-secondary mb-3 text-truncate-2"
                        style={{ fontSize: '0.82rem', whiteSpace: 'pre-line' }}
                      >
                        {item.description}
                      </p>
                    </div>

                    <div className="border-top pt-2">
                      {/* Meta Information */}
                      <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2" style={{ fontSize: '0.78rem' }}>
                        <span className="text-muted">
                          <i className="bi bi-calendar-event me-1"></i>
                          Due: <strong className={isOverdue ? 'text-danger' : 'text-dark'}>
                            {new Date(item.dueDate).toLocaleDateString()} {new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </strong>
                        </span>

                        {downloadUrl && (
                          <a
                            href={downloadUrl}
                            download
                            className="badge bg-white text-primary border text-decoration-none d-flex align-items-center gap-1 py-1 px-2"
                            title={`Download ${item.file.name}`}
                          >
                            <i className="bi bi-paperclip"></i>
                            <span className="text-truncate" style={{ maxWidth: '140px' }}>
                              {item.file.name}
                            </span>
                          </a>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="d-flex align-items-center justify-content-between pt-1">
                        <Link
                          to={`/assignments/${item._id}/tracker`}
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 fw-semibold"
                          style={{ fontSize: '0.78rem' }}
                        >
                          <i className="bi bi-people-fill"></i>
                          <span>View Submissions ({item.submissionCount || 0})</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          disabled={deletingId === item._id}
                          className="btn btn-sm btn-outline-danger"
                          title="Delete assignment/project"
                          style={{ fontSize: '0.78rem' }}
                        >
                          {deletingId === item._id ? (
                            <span className="spinner-border spinner-border-xs"></span>
                          ) : (
                            <i className="bi bi-trash"></i>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyAssignments;

