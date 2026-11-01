import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { subjectAPI, assignmentAPI } from '../api';

const PostAssignment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const preselectedSubjectId = queryParams.get('subjectId');

  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState(preselectedSubjectId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState(25);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await subjectAPI.getAll();
      setSubjects(res.data.subjects || []);
      if (!subjectId && res.data.subjects?.length > 0) {
        setSubjectId(res.data.subjects[0]._id);
      }
    } catch (err) {
      setError('Error loading allocated subjects.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('Attachment size cannot exceed 5 MB.');
        setFile(null);
        return;
      }
      const allowedExt = ['.pdf', '.docx', '.zip'];
      const fileExt = '.' + selected.name.split('.').pop().toLowerCase();
      if (!allowedExt.includes(fileExt)) {
        setError('Only PDF, DOCX, and ZIP files are accepted.');
        setFile(null);
        return;
      }
      setError('');
      setFile(selected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectId || !title || !description || !dueDate || !maxMarks) {
      setError('Please fill in all required fields.');
      return;
    }

    if (new Date(dueDate) <= new Date()) {
      setError('Due date must be in the future.');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('subjectId', subjectId);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('dueDate', dueDate);
    formData.append('maxMarks', maxMarks);
    if (file) {
      formData.append('file', file);
    }

    try {
      await assignmentAPI.post(formData);
      navigate('/faculty/subjects');
    } catch (err) {
      setError(err.response?.data?.message || 'Error posting assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSubjectDoc = subjects.find(s => s._id === subjectId);

  return (
    <div className="container py-4">
      <Link to="/faculty/subjects" className="btn btn-sm btn-outline-secondary mb-3">
        <i className="bi bi-arrow-left me-1"></i> Back to Subjects
      </Link>

      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="pmes-card p-4 shadow-sm">
            <div className="d-flex align-items-center gap-3 border-bottom pb-3 mb-4">
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: '#4F46E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem'
                }}
              >
                <i className="bi bi-pencil-square"></i>
              </div>
              <div>
                <h4 className="fw-bold text-dark mb-0">Post New Assignment</h4>
                <p className="text-secondary mb-0" style={{ fontSize: '0.85rem' }}>
                  Create coursework or project milestone for your allocated student cohort.
                </p>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-exclamation-circle-fill me-1"></i> {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-4 text-muted">Loading subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="alert alert-warning">
                You have no allocated subjects. You can only post assignments for subjects allocated to you by an Administrator.
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                    Select Subject <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                  >
                    {subjects.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.code} - {s.name} (Semester {s.semester} | {s.department?.name})
                      </option>
                    ))}
                  </select>
                  {selectedSubjectDoc && (
                    <div className="form-text text-primary" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-info-circle me-1"></i>
                      Target Audience: Active students of {selectedSubjectDoc.department?.name} Semester {selectedSubjectDoc.semester}.
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                    Assignment Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Lab Exercise 3: Binary Search Tree Implementation"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                    Description & Problem Statement <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Describe task expectations, required deliverables, and evaluation criteria..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Due Date & Time <span className="text-danger">*</span>
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
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Maximum Marks <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max="100"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                    Attach Reference Document (Optional)
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.zip"
                  />
                  <div className="form-text" style={{ fontSize: '0.75rem' }}>
                    Upload lab sheets, problem descriptions, or code starter templates (PDF, DOCX, ZIP $\le$ 5 MB).
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 border-top pt-3">
                  <Link to="/faculty/subjects" className="btn btn-sm btn-secondary">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="btn btn-sm btn-pmes-primary px-4 fw-semibold"
                    disabled={submitting}
                  >
                    {submitting ? 'Publishing...' : 'Publish Assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostAssignment;
