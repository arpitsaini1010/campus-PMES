import React, { useState, useEffect } from 'react';
import { announcementAPI, departmentAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const Announcements = () => {
  const { user, role } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Post Announcement Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetDept, setTargetDept] = useState('');
  const [targetSem, setTargetSem] = useState('');
  const [posting, setPosting] = useState(false);

  // Edit Announcement Modal
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editSem, setEditSem] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [annRes, deptRes] = await Promise.all([
        announcementAPI.getAll(),
        departmentAPI.getAll()
      ]);
      const depts = deptRes.data.departments || [];
      setAnnouncements(annRes.data.announcements || []);
      setDepartments(depts);

      if (depts.length > 0 && !targetDept) {
        const userDeptId = user?.department?._id || user?.department;
        const matched = depts.find(d => d._id === userDeptId);
        setTargetDept(matched ? matched._id : depts[0]._id);
      }
    } catch (err) {
      setError('Error loading announcements.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPostModal = () => {
    const userDeptId = user?.department?._id || user?.department;
    const matched = departments.find(d => d._id === userDeptId);
    setTargetDept(matched ? matched._id : (departments[0]?._id || ''));
    setTargetSem('');
    setTitle('');
    setBody('');
    setError('');
    setShowModal(true);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!title || !body) return;

    setPosting(true);
    setError('');
    setSuccess('');

    try {
      await announcementAPI.post({
        title: title.trim(),
        body: body.trim(),
        department: targetDept || null,
        semester: targetSem ? Number(targetSem) : null
      });

      setSuccess('Announcement published and notifications sent to recipients!');
      setShowModal(false);
      setTitle('');
      setBody('');
      setTargetDept('');
      setTargetSem('');
      const res = await announcementAPI.getAll();
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error publishing announcement.');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await announcementAPI.delete(id);
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      setSuccess('Announcement removed.');
    } catch (err) {
      setError('Error deleting announcement.');
    }
  };

  const handleOpenEdit = (ann) => {
    setEditingAnnouncement(ann);
    setEditTitle(ann.title || '');
    setEditBody(ann.body || '');
    setEditDept(ann.department?._id || ann.department || '');
    setEditSem(ann.semester || '');
    setError('');
    setSuccess('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editTitle || !editBody) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await announcementAPI.update(editingAnnouncement._id, {
        title: editTitle.trim(),
        body: editBody.trim(),
        department: editDept || null,
        semester: editSem ? Number(editSem) : null
      });

      setSuccess('Announcement updated successfully!');
      setEditingAnnouncement(null);
      const res = await announcementAPI.getAll();
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating announcement.');
    } finally {
      setUpdating(false);
    }
  };

  const canPost = role === 'admin' || role === 'faculty';

  const postDeptObj = departments.find(d => d._id === targetDept);
  const postMaxSem = postDeptObj ? (postDeptObj.totalSemesters || 6) : 0;
  const postSemesterOptions = Array.from({ length: postMaxSem }, (_, i) => i + 1);

  const editDeptObj = departments.find(d => d._id === editDept);
  const editMaxSem = editDeptObj ? (editDeptObj.totalSemesters || 6) : 0;
  const editSemesterOptions = Array.from({ length: editMaxSem }, (_, i) => i + 1);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold text-dark mb-1">Campus Announcements</h2>
          <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
            Official notices, milestone deadlines, and academic updates.
          </p>
        </div>

        {canPost && (
          <button onClick={handleOpenPostModal} className="btn btn-pmes-primary">
            <i className="bi bi-megaphone me-1"></i> Post Announcement
          </button>
        )}
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

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-secondary">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="pmes-card text-center py-5">
          <i className="bi bi-bell-slash fs-1 text-secondary mb-2 d-block"></i>
          <h5 className="fw-bold text-dark">No Announcements</h5>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            There are currently no active announcements for your department or semester.
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {announcements.map((ann) => {
            const canDelete = role === 'admin' || ann.postedBy?._id === user?._id;
            return (
              <div key={ann._id} className="col-12">
                <div className="pmes-card p-4 shadow-sm" style={{ borderLeft: '5px solid #6366f1' }}>
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div className="flex-grow-1">
                      <h5 className="fw-bold text-dark mb-2" style={{ fontSize: '1.15rem' }}>
                        {ann.title}
                      </h5>

                      {/* Author and Date/Time presentation per user request */}
                      <div className="d-flex flex-column gap-1 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-fill text-primary" style={{ fontSize: '1rem' }}></i>
                          <span className="fw-bold text-dark" style={{ fontSize: '0.92rem' }}>
                            {ann.postedBy?.name || 'System Administrator'}
                          </span>
                          <span className={`role-badge ${ann.postedBy?.role || 'admin'}`} style={{ fontSize: '0.65rem' }}>
                            {ann.postedBy?.role?.toUpperCase() || 'ADMIN'}
                          </span>
                        </div>
                        <div className="text-secondary d-flex align-items-center gap-1 ps-3" style={{ fontSize: '0.82rem' }}>
                          <i className="bi bi-calendar-event me-1 text-muted"></i>
                          <span className="text-muted fw-semibold">Date & Time:</span>
                          <span className="text-dark fw-medium">
                            {new Date(ann.createdAt).toLocaleDateString()} {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-1">
                      <span className="badge rounded-pill bg-light text-primary border px-3 py-2 me-1" style={{ fontSize: '0.78rem' }}>
                        <i className="bi bi-megaphone me-1"></i>
                        {ann.department ? `${ann.department.name} ${ann.semester ? `Sem ${ann.semester}` : 'All Sems'}` : 'All University Users'}
                      </span>
                      {canDelete && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(ann)}
                            className="btn btn-sm btn-outline-primary"
                            title="Edit announcement"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(ann._id)}
                            className="btn btn-sm btn-outline-danger"
                            title="Delete announcement"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-3 bg-light border mt-2">
                    <p className="text-dark mb-0" style={{ fontSize: '0.92rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                      {ann.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Announcement Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  Publish Campus Announcement
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handlePost}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Announcement Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Mid-term Progress Review Schedule"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Message Content <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Enter announcement details for students and faculty..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-7">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        Target Course / Department <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={targetDept}
                        onChange={(e) => {
                          setTargetDept(e.target.value);
                          setTargetSem('');
                        }}
                      >
                        {role === 'admin' && <option value="">All Departments (Campus-wide)</option>}
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.code || d.name} ({d.totalSemesters || 6} Semesters)</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-5">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        Target Semester
                      </label>
                      <select
                        className="form-select"
                        value={targetSem}
                        onChange={(e) => setTargetSem(e.target.value)}
                        disabled={!targetDept && role === 'admin'}
                      >
                        <option value="">All Semesters (Entire Course)</option>
                        {postSemesterOptions.map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                      {targetDept && (
                        <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                          Course length: {postMaxSem} semesters
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-text" style={{ fontSize: '0.75rem' }}>
                    Publishing automatically dispatches notifications to targeted students.
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3" disabled={posting}>
                    {posting ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {editingAnnouncement && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header border-bottom bg-light">
                <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-pencil-square text-primary me-2"></i>Edit Announcement
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingAnnouncement(null)}></button>
              </div>

              <form onSubmit={handleUpdate}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Headline / Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                      Announcement Notice Body <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-7">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        Target Course / Department
                      </label>
                      <select
                        className="form-select"
                        value={editDept}
                        onChange={(e) => {
                          setEditDept(e.target.value);
                          setEditSem('');
                        }}
                      >
                        <option value="">All Departments (Campus-wide)</option>
                        {departments.map(d => (
                          <option key={d._id} value={d._id}>{d.code || d.name} ({d.totalSemesters || 6} Semesters)</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-5">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.85rem' }}>
                        Target Semester
                      </label>
                      <select
                        className="form-select"
                        value={editSem}
                        onChange={(e) => setEditSem(e.target.value)}
                        disabled={!editDept}
                      >
                        <option value="">All Semesters (Entire Course)</option>
                        {editSemesterOptions.map(s => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                      {editDept && (
                        <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>
                          Course length: {editMaxSem} semesters
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingAnnouncement(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary px-3" disabled={updating}>
                    {updating ? 'Saving Changes...' : 'Save Changes'}
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

export default Announcements;
